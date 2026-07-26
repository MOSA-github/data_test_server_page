import argparse, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server.database import connect, migrate
from server.sensor_format import upsert_sensors, validate_sensor_array
from server.security import utcnow

def main():
    p=argparse.ArgumentParser()
    p.add_argument("source")
    p.add_argument("--dry-run",action="store_true")
    args=p.parse_args()
    payload=json.loads(Path(args.source).read_text(encoding="utf-8-sig"))
    sensors=validate_sensor_array(payload)
    if not args.dry_run:
        migrate()
        with connect() as db:
            upsert_sensors(db,sensors,utcnow().isoformat().replace("+00:00","Z"))
    print(json.dumps({"mode":"dry-run" if args.dry_run else "import","accepted":len(sensors),"errors":0}))
if __name__=="__main__": main()
