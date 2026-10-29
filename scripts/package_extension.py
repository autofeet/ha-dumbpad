"""Package only the extension's explicit public files, never workspace data."""
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = ('manifest.json', 'background.js', 'panel.html', 'panel.css', 'icon.png', 'README.md')


def package():
    source = ROOT / 'browser-extension'
    version = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))['version']
    output = ROOT / 'dist' / f'dumbpad-sidepanel-{version}.zip'
    output.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for filename in FILES:
            archive.writestr(filename, (source / filename).read_bytes())
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        assert sorted(archive.namelist()) == sorted(FILES)
    print(output)


if __name__ == '__main__':
    package()
