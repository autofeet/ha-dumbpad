# DumbPad Compact for Home Assistant

DumbPad with a compact single-row toolbar: notebook picker, New, Search, Preview and More. No application-name row. Link, Rename, Download, Print, Theme, Settings and Delete remain available in More with their original handlers and shortcuts.

Add `https://github.com/autofeet/ha-dumbpad` to the Home Assistant app store repositories, then install **DumbPad**. The default HTTP port is 3926. Set your PIN before starting a fresh installation. Use HTTPS through your existing reverse proxy for remote access.

Notes live in the app's public configuration folder, mounted as `/app/data`. The app participates in HA backups using cold backup. Uninstalling with data removal deletes that app's data: back up first.

## Updates

Enable **Auto update** in HA to receive tested versions from this repository. GitHub checks the official `dumbwareio/dumbpad` stable tags daily at 03:23 UTC (11:23 Asia/Shanghai). New stable minor/patch versions within the current major version, or a changed digest for the same version, are built and smoke-tested before the version bump is committed. Major upgrades require manual review. Failed tests publish no update.

HA discovers repository changes through its normal store refresh cycle; updates are not instantaneous. No credentials, note contents or user backups belong in this repository.

## Development

Node 22+ and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
python3 -m unittest discover -s tests -v
docker build -t ha-dumbpad:test dumbpad
python3 scripts/smoke_test.py ha-dumbpad:test
DUMBPAD_HTML_FIXTURE=test-results/current.html pnpm test
```

The frontend fixture comes from [DumbWareio/DumbPad](https://github.com/DumbWareio/DumbPad), licensed under GPLv3; see LICENSE.upstream. The HA image adds the toolbar and uses its packaged version for the original PWA cache refresh.
