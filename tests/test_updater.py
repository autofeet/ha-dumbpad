import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "check_upstream.py"


class UpdaterTests(unittest.TestCase):
    def module(self):
        self.assertTrue(SCRIPT.exists(), "upstream checker has not been implemented")
        spec = importlib.util.spec_from_file_location("updater", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_stable_versions_only_and_no_automatic_major_upgrade(self):
        module = self.module()
        tags = [{"name": name, "digest": "sha256:" + "a" * 64} for name in ["latest", "1.0.5", "1.1.0", "1.2.0-beta", "2.0.0", "0.9.0"]]
        self.assertEqual(module.select_candidate(tags, "1.0.5")[0], "1.1.0")

    def test_digest_required_and_malformed_values_rejected(self):
        module = self.module()
        tags = [{"name": "1.0.6", "digest": "malformed"}, {"name": "1.0.5", "digest": "sha256:" + "b" * 64}]
        self.assertEqual(module.select_candidate(tags, "1.0.5")[0], "1.0.5")

    def test_packaging_revision_changes_for_same_version_rebuild(self):
        module = self.module()
        self.assertEqual(module.packaged_version("1.0.5-2", "1.0.5"), "1.0.5-3")
        self.assertEqual(module.packaged_version("1.0.5-2", "1.1.0"), "1.1.0-1")


if __name__ == "__main__":
    unittest.main()
