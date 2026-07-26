import argparse
import base64
import hashlib
import json
import os
import secrets
import sqlite3
import sys
import uuid
from datetime import timedelta
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from .database import connect, migrate
from .security import hash_password, secure_cookie, utcnow, verify_password
from .sensor_format import SensorFormatError, sensors_from_db, upsert_sensors, validate_sensor_array

ROOT = Path(__file__).resolve().parents[1]
HOST_DATA = Path(os.environ.get("MOSA_PUBLIC_DATA_PATH", ROOT.parents[1] / "docs" / "data"))
SESSION_HOURS = int(os.environ.get("MOSA_SESSION_HOURS", "8"))
SIGNATURE_SKEW_SECONDS = int(os.environ.get("MOSA_SIGNATURE_SKEW_SECONDS", "300"))
MAX_BODY = int(os.environ.get("MOSA_MAX_BODY_BYTES", "1048576"))

def iso(dt=None):
    return (dt or utcnow()).isoformat().replace("+00:00", "Z")

def audit(db, actor_type, actor_id, action, result, request_id, handler, resource_type=None, resource_id=None, metadata=None):
    db.execute("""INSERT INTO audit_logs(actor_type,actor_id,action,resource_type,resource_id,result,
      request_id,source_ip,user_agent,metadata) VALUES(?,?,?,?,?,?,?,?,?,?)""",
      (actor_type, actor_id, action, resource_type, resource_id, result, request_id,
       handler.client_address[0], handler.headers.get("User-Agent", "")[:500],
       json.dumps(metadata or {}, ensure_ascii=False)))

class Handler(BaseHTTPRequestHandler):
    server_version = "MOSAdemy/1.0"

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def request_id(self):
        return getattr(self, "_request_id", None) or self.headers.get("X-Request-Id", str(uuid.uuid4()))

    def json_response(self, status, payload, extra_headers=None):
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Request-Id", self.request_id())
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def error_json(self, status, code, message):
        self.json_response(status, {"error": {"code": code, "message": message, "request_id": self.request_id()}})

    def body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length > MAX_BODY:
            raise ValueError("request body too large")
        return self.rfile.read(length)

    def json_body(self):
        raw = self.body()
        try:
            return json.loads(raw or b"{}"), raw
        except json.JSONDecodeError:
            raise ValueError("invalid JSON")

    def session(self, db):
        cookie = SimpleCookie(self.headers.get("Cookie"))
        token = cookie.get("mosa_session")
        if not token:
            return None
        return db.execute("""SELECT s.*,u.username,u.role,u.active FROM user_sessions s JOIN users u ON u.id=s.user_id
          WHERE s.id=? AND s.expires_at>? AND u.active=1""", (hashlib.sha256(token.value.encode()).hexdigest(), iso())).fetchone()

    def require_user(self, db, roles=None, csrf=False):
        session = self.session(db)
        if not session:
            self.error_json(401, "authentication_required", "ログインが必要です")
            return None
        if roles and session["role"] not in roles:
            self.error_json(403, "forbidden", "権限がありません")
            return None
        if csrf and not secrets.compare_digest(self.headers.get("X-CSRF-Token", ""), session["csrf_token"]):
            self.error_json(403, "csrf_failed", "CSRF検証に失敗しました")
            return None
        return session

    def require_application(self, db, raw_body, scope):
        required = ["X-App-Id","X-Key-Id","X-Timestamp","X-Nonce","X-Content-SHA256","X-Signature"]
        if any(not self.headers.get(x) for x in required):
            self.error_json(401, "signature_required", "署名ヘッダーが不足しています")
            return None
        app_id, key_id = self.headers["X-App-Id"], self.headers["X-Key-Id"]
        digest = hashlib.sha256(raw_body).hexdigest()
        if not secrets.compare_digest(digest, self.headers["X-Content-SHA256"].lower()):
            self.error_json(401, "body_hash_mismatch", "本文ハッシュが一致しません")
            return None
        try:
            timestamp = __import__("datetime").datetime.fromisoformat(self.headers["X-Timestamp"].replace("Z","+00:00"))
            if abs((utcnow() - timestamp).total_seconds()) > SIGNATURE_SKEW_SECONDS:
                raise ValueError()
        except ValueError:
            self.error_json(401, "timestamp_invalid", "timestampが許容範囲外です")
            return None
        row = db.execute("""SELECT a.*,k.public_key,k.revoked_at FROM applications a JOIN application_keys k
          ON k.application_id=a.id WHERE a.id=? AND k.key_id=?""", (app_id,key_id)).fetchone()
        if not row or not row["active"] or row["revoked_at"] or (row["expires_at"] and row["expires_at"] <= iso()):
            self.error_json(401, "application_invalid", "アプリケーションまたは鍵が無効です")
            return None
        if not db.execute("SELECT 1 FROM application_scopes WHERE application_id=? AND scope=?", (app_id,scope)).fetchone():
            self.error_json(403, "scope_required", f"{scope} scopeが必要です")
            return None
        query = urlsplit(self.path).query
        canonical = "\n".join([self.command, urlsplit(self.path).path, query, self.headers["X-Timestamp"],
                                self.headers["X-Nonce"], digest]).encode()
        try:
            key = Ed25519PublicKey.from_public_bytes(base64.b64decode(row["public_key"]))
            key.verify(base64.b64decode(self.headers["X-Signature"]), canonical)
            db.execute("DELETE FROM request_nonces WHERE expires_at<=?", (iso(),))
            db.execute("INSERT INTO request_nonces VALUES(?,?,?)",
                       (app_id,self.headers["X-Nonce"],iso(utcnow()+timedelta(seconds=SIGNATURE_SKEW_SECONDS*2))))
        except (ValueError, sqlite3.IntegrityError, Exception) as exc:
            code = "replay_detected" if isinstance(exc, sqlite3.IntegrityError) else "signature_invalid"
            self.error_json(401, code, "署名またはnonceが無効です")
            return None
        db.execute("UPDATE applications SET last_used_at=? WHERE id=?", (iso(),app_id))
        return row

    def do_GET(self):
        self._request_id = self.headers.get("X-Request-Id", str(uuid.uuid4()))
        path = urlsplit(self.path).path
        if path in ("/", "/login", "/dashboard", "/admin", "/account"):
            name = "login.html" if path == "/login" else ("admin.html" if path == "/admin" else "dashboard.html")
            return self.static(ROOT / "web" / name, "text/html; charset=utf-8")
        if path.startswith("/assets/"):
            target = (ROOT / "web" / path.lstrip("/")).resolve()
            if ROOT / "web" not in target.parents:
                return self.error_json(404, "not_found", "Not found")
            return self.static(target, "text/css; charset=utf-8" if target.suffix==".css" else "text/javascript; charset=utf-8")
        if path == "/health":
            return self.json_response(200, {"status":"ok"})
        if path == "/api/v1/public/sensors/current":
            return self.static(HOST_DATA / "latest.json", "application/json; charset=utf-8")
        with connect() as db:
            if path == "/api/v1/me":
                user = self.require_user(db)
                if user: self.json_response(200, {"username":user["username"],"role":user["role"],"csrf_token":user["csrf_token"]})
                return
            if path == "/api/v1/sensors/current":
                raw = b""
                actor = self.session(db) or self.require_application(db, raw, "sensors:read")
                if not actor: return
                sensors = sensors_from_db(db)
                if sensors:
                    return self.json_response(200, sensors)
                return self.json_response(200, [])
            if path == "/api/v1/admin/overview":
                user = self.require_user(db, {"super_admin","admin"})
                if not user: return
                counts = {name: db.execute(sql).fetchone()[0] for name,sql in {
                    "users":"SELECT count(*) FROM users","applications":"SELECT count(*) FROM applications WHERE active=1",
                    "keys":"SELECT count(*) FROM application_keys WHERE revoked_at IS NULL",
                    "audit_events":"SELECT count(*) FROM audit_logs"}.items()}
                return self.json_response(200, counts)
            if path == "/api/v1/admin/audit-logs":
                user = self.require_user(db, {"super_admin","admin"})
                if not user: return
                rows = [dict(x) for x in db.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100")]
                return self.json_response(200, {"items":rows})
        self.error_json(404, "not_found", "Not found")

    def do_POST(self):
        self._request_id = self.headers.get("X-Request-Id", str(uuid.uuid4()))
        path = urlsplit(self.path).path
        try:
            payload, raw = self.json_body()
        except ValueError as exc:
            return self.error_json(400, "invalid_request", str(exc))
        with connect() as db:
            if path == "/api/v1/sensors/current":
                app = self.require_application(db, raw, "sensors:write")
                if not app: return
                try:
                    sensors = validate_sensor_array(payload)
                except SensorFormatError as exc:
                    audit(db,"application",app["id"],"sensors.upsert","failure",self.request_id(),self,
                          "sensor",metadata={"reason":str(exc)})
                    return self.error_json(422,"validation_failed",str(exc))
                upsert_sensors(db,sensors,iso())
                audit(db,"application",app["id"],"sensors.upsert","success",self.request_id(),self,
                      "sensor",metadata={"count":len(sensors)})
                return self.json_response(200,{"accepted":len(sensors)})
            if path == "/api/v1/auth/login":
                username = str(payload.get("username",""))[:254]
                password = str(payload.get("password",""))
                user = db.execute("SELECT * FROM users WHERE username=? COLLATE NOCASE", (username,)).fetchone()
                if not user or not user["active"] or user["failed_logins"] >= 10 or not verify_password(password,user["password_hash"]):
                    if user: db.execute("UPDATE users SET failed_logins=failed_logins+1 WHERE id=?", (user["id"],))
                    audit(db,"user",str(user["id"]) if user else None,"login","failure",self.request_id(),self)
                    return self.error_json(401,"invalid_credentials","認証情報が正しくありません")
                token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
                db.execute("DELETE FROM user_sessions WHERE user_id=?", (user["id"],))
                db.execute("INSERT INTO user_sessions(id,user_id,csrf_token,expires_at) VALUES(?,?,?,?)",
                           (hashlib.sha256(token.encode()).hexdigest(),user["id"],csrf,iso(utcnow()+timedelta(hours=SESSION_HOURS))))
                db.execute("UPDATE users SET failed_logins=0,last_login_at=? WHERE id=?", (iso(),user["id"]))
                audit(db,"user",str(user["id"]),"login","success",self.request_id(),self)
                attrs = f"mosa_session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={SESSION_HOURS*3600}"
                if secure_cookie(): attrs += "; Secure"
                return self.json_response(200,{"username":user["username"],"role":user["role"],"csrf_token":csrf},
                                          {"Set-Cookie":attrs})
            if path == "/api/v1/auth/logout":
                user = self.require_user(db, csrf=True)
                if not user: return
                db.execute("DELETE FROM user_sessions WHERE id=?", (user["id"],))
                audit(db,"user",str(user["user_id"]),"logout","success",self.request_id(),self)
                return self.json_response(204,{},{"Set-Cookie":"mosa_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"})
        self.error_json(404, "not_found", "Not found")

    def static(self, path, content_type):
        try:
            body = path.read_bytes()
        except FileNotFoundError:
            return self.error_json(404, "not_found", "Not found")
        self.send_response(200)
        self.send_header("Content-Type",content_type)
        self.send_header("Content-Length",str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def bootstrap_admin(username):
    password = os.environ.get("MOSA_BOOTSTRAP_PASSWORD")
    if not password:
        raise SystemExit("MOSA_BOOTSTRAP_PASSWORD environment variable is required")
    migrate()
    with connect() as db:
        if db.execute("SELECT 1 FROM users").fetchone():
            raise SystemExit("bootstrap refused: a user already exists")
        db.execute("INSERT INTO users(username,password_hash,role) VALUES(?,?,'super_admin')",
                   (username,hash_password(password)))
    print(f"Created super_admin: {username}. Remove MOSA_BOOTSTRAP_PASSWORD from the environment.")

def main(argv=None):
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command",required=True)
    serve = sub.add_parser("serve"); serve.add_argument("--host",default="127.0.0.1"); serve.add_argument("--port",type=int,default=8000)
    boot = sub.add_parser("bootstrap-admin"); boot.add_argument("--username",required=True)
    sub.add_parser("migrate")
    args = parser.parse_args(argv)
    if args.command == "bootstrap-admin": return bootstrap_admin(args.username)
    if args.command == "migrate": migrate(); print("Database schema is up to date."); return
    migrate()
    print(f"MOSAdemy listening on http://{args.host}:{args.port}")
    ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()

if __name__ == "__main__":
    main()
