"""Package only the extension's explicit public files, never workspace data."""
import json
import argparse
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = ('manifest.json', 'background-loader.js', 'background.js', 'firefox-background.js', 'panel.html', 'closed.html', 'panel.css', 'panel.js', 'frame.js', 'frame.css', 'icon.png', 'README.md')


def manifest_for(target, original):
    result = json.loads(json.dumps(original))
    if target in ('firefox', 'opera'):
        result.pop('side_panel', None)
        result.pop('minimum_chrome_version', None)
        result['permissions'] = [p for p in result['permissions'] if p != 'sidePanel']
        if target == 'firefox':
            result['sidebar_action'] = {'default_panel': 'closed.html', 'default_title': 'DumbPad', 'default_icon': 'icon.png'}
            result['background'] = {'scripts': ['firefox-background.js']}
            result['browser_specific_settings'] = {'gecko': {'id': 'dumbpad@ha-dumbpad.autofeet', 'strict_min_version': '128.0', 'data_collection_permissions': {'required': ['none']}}}
        else:
            # Opera's documented opr.sidebarAction lacks the open/close methods
            # required for page-scoped visibility. Offer an explicit tab fallback.
            result['background'] = {'service_worker': 'firefox-background.js'}
    return result


def package(target='chromium'):
    source = ROOT / 'browser-extension'
    version = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))['version']
    suffix = '' if target == 'chromium' else f'-{target}'
    output = ROOT / 'dist' / f'dumbpad-sidepanel-{version}{suffix}.zip'
    output.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for filename in FILES:
            data = (source / filename).read_bytes()
            if filename == 'manifest.json':
                data = json.dumps(manifest_for(target, json.loads(data)), ensure_ascii=False, indent=2).encode('utf-8')
            archive.writestr(filename, data)
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        assert sorted(archive.namelist()) == sorted(FILES)
    print(output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', choices=['chromium', 'firefox', 'opera', 'all'], default='all')
    args = parser.parse_args()
    for target in (['chromium', 'firefox', 'opera'] if args.target == 'all' else [args.target]):
        package(target)
