"""Fail closed when the public repository contains non-allowlisted content."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
MANIFEST = DOCS / "public_manifest.json"

ALLOWED_TRACKED = {
    ".github/workflows/deploy-pages.yml",
    "README.md",
    "scripts/validate_public_repository.py",
    "docs/index.html",
    "docs/data-guide.html",
    "docs/svgmap-guide.html",
    "docs/assets/site.css",
    "docs/assets/site.js",
    "docs/public-data/catalog.json",
    "docs/public_manifest.json",
}

BLOCKED_PARTS = {
    "admin",
    "archive",
    "backend",
    "extensions",
    "private_data",
    "server",
}

SECRET_PATTERNS = (
    re.compile(rb"-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----"),
    re.compile(rb"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    re.compile(rb"\bgithub_pat_[A-Za-z0-9_]{20,}\b"),
    re.compile(rb"[?&](?:token|key|secret|password)=[^\s\"'&]{8,}", re.I),
)


def tracked_files() -> set[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    return {item.decode("utf-8").replace("\\", "/") for item in result.stdout.split(b"\0") if item}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate() -> None:
    tracked = tracked_files()
    unexpected = sorted(tracked - ALLOWED_TRACKED)
    missing = sorted(ALLOWED_TRACKED - tracked)
    if unexpected or missing:
        raise SystemExit(f"Public allowlist mismatch; unexpected={unexpected}, missing={missing}")

    for relative in sorted(tracked):
        lower_parts = {part.lower() for part in Path(relative).parts}
        if lower_parts & BLOCKED_PARTS:
            raise SystemExit(f"Blocked path in public repository: {relative}")
        data = (ROOT / relative).read_bytes()
        for pattern in SECRET_PATTERNS:
            if pattern.search(data):
                raise SystemExit(f"Secret-like content detected in: {relative}")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    declared = set()
    for entry in manifest.get("files", []):
        relative = entry["path"]
        declared.add(relative)
        target = (DOCS / relative).resolve(strict=True)
        if DOCS.resolve() not in target.parents:
            raise SystemExit(f"Manifest path escapes docs: {relative}")
        if target.stat().st_size != entry["bytes"] or sha256(target) != entry["sha256"]:
            raise SystemExit(f"Manifest mismatch: {relative}")

    actual = {
        path.relative_to(DOCS).as_posix()
        for path in DOCS.rglob("*")
        if path.is_file() and path != MANIFEST
    }
    if actual != declared:
        raise SystemExit(f"Manifest file set mismatch; actual={sorted(actual)}, declared={sorted(declared)}")

    catalog = json.loads((DOCS / "public-data/catalog.json").read_text(encoding="utf-8"))
    if catalog.get("schema_version") != 1 or not isinstance(catalog.get("datasets"), list):
        raise SystemExit("Invalid public-data catalog schema")


if __name__ == "__main__":
    validate()
    print("Public repository validation: PASS")
