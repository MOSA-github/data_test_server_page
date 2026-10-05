#!/usr/bin/env python3
"""Pull the public fuel-monitor result into this repository.

This script deliberately consumes only the public reading endpoint. Camera URLs,
access tokens and calibration data remain in fuel_level_monitoring_system.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
INTEGRATIONS = ROOT / "docs/data/integrations.json"
OUTPUT = ROOT / "docs/data/fuel_latest.json"


def main() -> None:
    cfg = json.loads(INTEGRATIONS.read_text(encoding="utf-8"))
    url = os.getenv("FUEL_MONITOR_URL") or cfg.get("fuel_monitor_url")
    if not isinstance(url, str) or not url.startswith("https://"):
        raise SystemExit("fuel_monitor_url must be https://")
    req = Request(url, headers={"User-Agent": "MOSA-DataHub/1.0"})
    with urlopen(req, timeout=30) as r:
        raw = r.read(2 * 1024 * 1024 + 1)
    if len(raw) > 2 * 1024 * 1024:
        raise SystemExit("fuel payload too large")
    payload = json.loads(raw)
    readings = payload.get("readings") if isinstance(payload, dict) else None
    if not isinstance(readings, list):
        raise SystemExit("fuel endpoint schema error")
    public = {
        "schema_version": payload.get("schema_version", 1),
        "generated_at": payload.get("generated_at"),
        "readings": [r for r in readings if isinstance(r, dict) and isinstance(r.get("facility_id"), str) and isinstance(r.get("device_id"), str)],
    }
    OUTPUT.write_text(json.dumps(public, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"synced {len(public['readings'])} fuel readings")

if __name__ == "__main__":
    main()
