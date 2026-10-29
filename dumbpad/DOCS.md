# DumbPad Compact

Use the notebook picker to change notebooks, + to create, Search to find notes, and Preview to cycle the original editing/preview modes. More contains the remaining actions. Escape or clicking outside closes More; keyboard arrows navigate its actions.

`DUMBPAD_PIN` preserves DumbPad's original PIN protection. `TZ` sets the timezone. Notes and PIN authentication use the upstream application unchanged. A fresh installation with an empty PIN has no PIN protection; configure it before starting.

The toolbar stays on one line at 320px and wider. Touch controls may use a few additional pixels for accessible hit targets. The editor uses the remaining viewport height. Original keyboard shortcuts and delete confirmation remain intact.

The app requires no Docker socket, host network or HA administrator API access. To import notes from another installation, stop both apps and copy the complete data directory into this app's configuration folder, preserve permissions for UID/GID 1000, and set the original PIN through HA options. Keep a full backup and verify file checksums before starting.

Enable HA Auto update for updates from this repository. The app's version suffix is the packaging revision; the preceding version is the upstream DumbPad version.
