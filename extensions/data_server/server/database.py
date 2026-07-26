import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

SCHEMA_VERSION = 2

SCHEMA = """
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('super_admin','admin','operator','viewer')),
  active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
  csrf_token TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1, expires_at TEXT, rate_limit INTEGER NOT NULL DEFAULT 60,
  allowed_cidr TEXT, last_used_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS application_keys (
  application_id TEXT NOT NULL REFERENCES applications(id), key_id TEXT NOT NULL,
  public_key TEXT NOT NULL, fingerprint TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT, PRIMARY KEY(application_id,key_id)
);
CREATE TABLE IF NOT EXISTS application_scopes (
  application_id TEXT NOT NULL REFERENCES applications(id), scope TEXT NOT NULL,
  PRIMARY KEY(application_id,scope)
);
CREATE TABLE IF NOT EXISTS request_nonces (
  application_id TEXT NOT NULL, nonce TEXT NOT NULL, expires_at TEXT NOT NULL,
  PRIMARY KEY(application_id,nonce)
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_type TEXT NOT NULL, actor_id TEXT, action TEXT NOT NULL, resource_type TEXT,
  resource_id TEXT, result TEXT NOT NULL, request_id TEXT NOT NULL, source_ip TEXT,
  user_agent TEXT, metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE TABLE IF NOT EXISTS sensors (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL CHECK(type IN ('water','power','generator','camera')),
  status TEXT NOT NULL CHECK(status IN ('normal','offline','warning','error')),
  value_json TEXT,
  unit TEXT,
  lat TEXT NOT NULL,
  lng TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  facility_json TEXT,
  tags_json TEXT,
  cameras_json TEXT,
  raw_payload TEXT NOT NULL,
  received_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sensors_type_status ON sensors(type,status);
"""

def database_path():
    return Path(os.environ.get("MOSA_DATABASE_PATH", "var/mosademy.sqlite3"))

@contextmanager
def connect():
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def migrate():
    with connect() as db:
        db.executescript(SCHEMA)
        for version in range(1, SCHEMA_VERSION + 1):
            db.execute("INSERT OR IGNORE INTO schema_migrations(version) VALUES (?)", (version,))
