import json
import math
from datetime import datetime
from decimal import Decimal, InvalidOperation

TYPES = {"water", "power", "generator", "camera"}
STATUSES = {"normal", "offline", "warning", "error"}
DEFAULT_UNITS = {"power": "W", "water": "%", "generator": "%", "camera": ""}

class SensorFormatError(ValueError):
    pass

def _date_time(value, field):
    if not isinstance(value, str):
        raise SensorFormatError(f"{field} must be an ISO 8601 string")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise SensorFormatError(f"{field} must be ISO 8601 date-time") from exc
    if parsed.tzinfo is None:
        raise SensorFormatError(f"{field} must include timezone")

def validate_sensor_array(payload):
    if not isinstance(payload, list):
        raise SensorFormatError("top level must be an array")
    seen = set()
    normalized = []
    for index, item in enumerate(payload):
        prefix = f"items[{index}]"
        if not isinstance(item, dict):
            raise SensorFormatError(f"{prefix} must be an object")
        missing = [x for x in ("id","type","status","lat","lng","updated_at") if x not in item]
        if missing:
            raise SensorFormatError(f"{prefix} missing: {', '.join(missing)}")
        sensor_id = item["id"]
        if not isinstance(sensor_id, str) or not sensor_id:
            raise SensorFormatError(f"{prefix}.id must be a non-empty string")
        if sensor_id in seen:
            raise SensorFormatError(f"{prefix}.id must be unique")
        seen.add(sensor_id)
        if item["type"] not in TYPES:
            raise SensorFormatError(f"{prefix}.type is invalid")
        if item["status"] not in STATUSES:
            raise SensorFormatError(f"{prefix}.status is invalid")
        for field, minimum, maximum in (("lat",-90,90),("lng",-180,180)):
            value = item[field]
            if isinstance(value, bool) or not isinstance(value, (int,float)) or not math.isfinite(value) or not minimum <= value <= maximum:
                raise SensorFormatError(f"{prefix}.{field} is out of range")
        _date_time(item["updated_at"], f"{prefix}.updated_at")
        value = item.get("value")
        if isinstance(value, bool) or value is not None and not isinstance(value, (int,float,str)):
            raise SensorFormatError(f"{prefix}.value has invalid type")
        if isinstance(value,float) and not math.isfinite(value):
            raise SensorFormatError(f"{prefix}.value must be finite")
        result = dict(item)
        result.setdefault("unit", DEFAULT_UNITS[item["type"]])
        if not isinstance(result["unit"], str):
            raise SensorFormatError(f"{prefix}.unit must be a string")
        facility = result.get("facility")
        if facility is not None and not isinstance(facility, dict):
            raise SensorFormatError(f"{prefix}.facility must be an object")
        tags = result.get("tags")
        if tags is not None and (not isinstance(tags,list) or any(not isinstance(x,str) for x in tags)):
            raise SensorFormatError(f"{prefix}.tags must be a string array")
        cameras = result.get("cameras")
        if cameras is not None:
            if not isinstance(cameras,list):
                raise SensorFormatError(f"{prefix}.cameras must be an array")
            camera_ids = set()
            for camera_index,camera in enumerate(cameras):
                cp=f"{prefix}.cameras[{camera_index}]"
                if not isinstance(camera,dict):
                    raise SensorFormatError(f"{cp} must be an object")
                required=("id","name","status","image_url","updated_at")
                if any(x not in camera for x in required):
                    raise SensorFormatError(f"{cp} missing required field")
                if not isinstance(camera["id"],str) or not camera["id"] or camera["id"] in camera_ids:
                    raise SensorFormatError(f"{cp}.id must be non-empty and unique")
                camera_ids.add(camera["id"])
                if camera["status"] not in STATUSES:
                    raise SensorFormatError(f"{cp}.status is invalid")
                if not isinstance(camera["name"],str) or not camera["name"]:
                    raise SensorFormatError(f"{cp}.name must be non-empty")
                if not isinstance(camera["image_url"],str) or not camera["image_url"]:
                    raise SensorFormatError(f"{cp}.image_url must be non-empty")
                _date_time(camera["updated_at"],f"{cp}.updated_at")
        normalized.append(result)
    return normalized

def upsert_sensors(db, sensors, received_at):
    for item in sensors:
        db.execute("""INSERT INTO sensors(id,name,type,status,value_json,unit,lat,lng,updated_at,
          facility_json,tags_json,cameras_json,raw_payload,received_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,status=excluded.status,
          value_json=excluded.value_json,unit=excluded.unit,lat=excluded.lat,lng=excluded.lng,
          updated_at=excluded.updated_at,facility_json=excluded.facility_json,tags_json=excluded.tags_json,
          cameras_json=excluded.cameras_json,raw_payload=excluded.raw_payload,
          received_at=excluded.received_at,modified_at=CURRENT_TIMESTAMP""",
          (item["id"],item.get("name"),item["type"],item["status"],
           json.dumps(item.get("value"),ensure_ascii=False),item["unit"],str(item["lat"]),str(item["lng"]),
           item["updated_at"],json.dumps(item.get("facility"),ensure_ascii=False),
           json.dumps(item.get("tags"),ensure_ascii=False),json.dumps(item.get("cameras"),ensure_ascii=False),
           json.dumps(item,ensure_ascii=False,separators=(",",":")),received_at))

def sensors_from_db(db):
    return [json.loads(row["raw_payload"]) for row in db.execute("SELECT raw_payload FROM sensors ORDER BY id")]
