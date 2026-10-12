import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("public_validator", ROOT / "scripts/validate_public_repository.py")
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class PublicBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.tracked = set(validator.ALLOWED_TRACKED)
        for relative in self.tracked:
            self.write(relative, b"safe")
        self.write("docs/public-data/catalog.json", b'{"schema_version":1,"datasets":[]}')

    def write(self, relative, data):
        file = self.root / relative
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)

    def validate(self, corrupt_hash=False):
        entries = []
        for relative in self.tracked:
            if relative.startswith("docs/") and relative != "docs/public_manifest.json":
                file = self.root / relative
                entries.append({"path": relative[5:], "bytes": file.stat().st_size,
                                "sha256": "invalid" if corrupt_hash else validator.sha256(file)})
        self.write("docs/public_manifest.json", json.dumps({"schema_version":1,"files":entries}).encode())
        with patch.object(validator, "ROOT", self.root), patch.object(validator, "DOCS", self.root / "docs"), \
             patch.object(validator, "MANIFEST", self.root / "docs/public_manifest.json"), \
             patch.object(validator, "tracked_files", return_value=self.tracked):
            validator.validate()

    def test_permits_only_known_generated_data_and_hashed_images(self):
        for relative in validator.GENERATED_TRACKED | {"docs/public-data/images/0123456789abcdef0123456789abcdef.png"}:
            self.tracked.add(relative)
            self.write(relative, b"[]")
        self.validate()

    def test_rejects_non_allowlisted_and_private_paths(self):
        for relative in ("docs/public-data/extra.json", "docs/public-data/images/camera.jpg",
                         "docs/public-data/images/../private.json", "docs/private/database.db", "docs/admin.html"):
            with self.subTest(path=relative):
                self.tracked.add(relative)
                self.write(relative, b"safe")
                try:
                    with self.assertRaisesRegex(SystemExit, "allowlist mismatch"):
                        self.validate()
                finally:
                    self.tracked.remove(relative)

    def test_manifest_hash_validation_is_preserved(self):
        with self.assertRaisesRegex(SystemExit, "Manifest mismatch"):
            self.validate(corrupt_hash=True)

    def test_generated_json_still_blocks_secrets(self):
        relative = "docs/public-data/latest.json"
        self.tracked.add(relative)
        self.write(relative, b'https://example.invalid/?' + b'token=' + b'synthetic-test-only')
        with self.assertRaisesRegex(SystemExit, "Secret-like content"):
            self.validate()


if __name__ == "__main__":
    unittest.main()
