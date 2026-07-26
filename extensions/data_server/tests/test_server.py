import json, os, tempfile, threading, unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import urlopen

from server.database import connect, migrate
from server.security import hash_password, verify_password
from server.app import Handler
from server.sensor_format import SensorFormatError, sensors_from_db, upsert_sensors, validate_sensor_array

class ServerTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.env=patch.dict(os.environ,{"MOSA_DATABASE_PATH":str(Path(self.tmp.name)/"test.sqlite3")})
        self.env.start(); migrate()
    def tearDown(self): self.env.stop(); self.tmp.cleanup()
    def test_password_roundtrip(self):
        encoded=hash_password("a secure password")
        self.assertTrue(verify_password("a secure password",encoded))
        self.assertFalse(verify_password("wrong password",encoded))
    def test_schema_is_idempotent(self):
        migrate(); migrate()
        with connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM schema_migrations").fetchone()[0],2)
    def test_no_default_admin(self):
        with connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM users").fetchone()[0],0)
    def test_nonce_is_unique(self):
        with connect() as db:
            db.execute("INSERT INTO request_nonces VALUES('app','nonce','2099-01-01T00:00:00Z')")
            with self.assertRaises(Exception): db.execute("INSERT INTO request_nonces VALUES('app','nonce','2099-01-01T00:00:00Z')")
    def test_http_health_public_and_private_boundary(self):
        server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
        base=f"http://127.0.0.1:{server.server_address[1]}"
        try:
            self.assertEqual(json.load(urlopen(base+"/health"))["status"],"ok")
            self.assertGreater(len(json.load(urlopen(base+"/api/v1/public/sensors/current"))),0)
            with self.assertRaises(HTTPError) as error:
                urlopen(base+"/api/v1/me")
            self.assertEqual(error.exception.code,401)
        finally:
            server.shutdown(); server.server_close(); thread.join()
    def test_svgmap_power_sensor_format_and_default_unit(self):
        payload=[{"id":"sensor_001","name":"岡山拠点 受電電力","type":"power","status":"normal",
                  "value":12.5,"lat":34.6618,"lng":133.9344,
                  "updated_at":"2026-07-22T10:30:00+09:00"}]
        normalized=validate_sensor_array(payload)
        self.assertEqual(normalized[0]["unit"],"W")
        with connect() as db:
            upsert_sensors(db,normalized,"2026-07-22T01:30:01Z")
            self.assertEqual(sensors_from_db(db)[0]["type"],"power")
    def test_svgmap_format_rejects_duplicate_and_invalid_coordinates(self):
        base={"id":"same","type":"power","status":"normal","lat":91,"lng":133,
              "updated_at":"2026-07-22T10:30:00+09:00"}
        with self.assertRaises(SensorFormatError):
            validate_sensor_array([base])
        base["lat"]=34
        with self.assertRaises(SensorFormatError):
            validate_sensor_array([base,dict(base)])

if __name__=="__main__": unittest.main()
