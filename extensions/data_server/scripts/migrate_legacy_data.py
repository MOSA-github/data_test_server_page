"""Inventory legacy data without guessing the absent canonical power schema."""
import argparse, csv, json
from pathlib import Path

def main():
    default_source=Path(__file__).resolve().parents[3] / "docs" / "data"
    p=argparse.ArgumentParser(); p.add_argument("--source",default=default_source); p.add_argument("--dry-run",action="store_true",required=True); a=p.parse_args()
    root=Path(a.source); rows=errors=0
    for path in root.glob("archive/**/*.csv"):
        with path.open(encoding="utf-8-sig",newline="") as f:
            for line,row in enumerate(csv.DictReader(f),2):
                if not any(row.values()): continue
                rows+=1
                required=("time","id","room","status","power[W]")
                if any(row.get(k) in (None,"") for k in required):
                    errors+=1; print(f"{path}:{line}: missing required legacy value")
    print(json.dumps({"mode":"dry-run","records":rows,"errors":errors},ensure_ascii=False))
if __name__=="__main__": main()
