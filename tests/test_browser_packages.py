import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('package_extension', Path(__file__).parents[1] / 'scripts/package_extension.py')
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)

class BrowserPackageTests(unittest.TestCase):
    def test_each_browser_gets_its_native_manifest_and_only_public_files(self):
        original = packager.ROOT / 'browser-extension'
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / 'browser-extension'
            source.mkdir()
            for name in packager.FILES:
                (source / name).write_bytes((original / name).read_bytes())
            (source / 'private-note.txt').write_text('must not be packaged', encoding='utf-8')
            with patch.object(packager, 'ROOT', root):
                for target in ('chromium', 'firefox', 'opera'):
                    packager.package(target)
            self.assertEqual(len(list((root / 'dist').glob('*.zip'))), 3)
            for archive_path in (root / 'dist').glob('*.zip'):
                with zipfile.ZipFile(archive_path) as archive:
                    self.assertIsNone(archive.testzip())
                    self.assertNotIn('private-note.txt', archive.namelist())
                    manifest = json.loads(archive.read('manifest.json'))
                    if '-firefox' in archive_path.name:
                        self.assertNotIn('sidePanel', manifest['permissions'])
                        self.assertNotIn('side_panel', manifest)
                        self.assertEqual(manifest['background']['scripts'], ['firefox-background.js'])
                        self.assertEqual(manifest['sidebar_action']['default_title'], 'DumbPad')
                    elif '-opera' in archive_path.name:
                        self.assertNotIn('sidePanel', manifest['permissions'])
                        self.assertNotIn('sidebar_action', manifest)
                        self.assertEqual(manifest['background']['service_worker'], 'firefox-background.js')
                    else:
                        self.assertEqual(manifest['background']['service_worker'], 'background-loader.js')
                        self.assertIn('sidePanel', manifest['permissions'])
