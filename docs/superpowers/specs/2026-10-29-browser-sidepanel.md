# DumbPad lightweight browser side panel

The user selected the lightweight version after the proposal to reuse the current HA-hosted DumbPad, notes and PIN in Chrome/Edge's native side panel.

- Manifest V3 extension, clicking its toolbar icon opens a persistent global side panel.
- Show the existing HTTPS DumbPad in a full-height cross-origin iframe, retaining the compact toolbar and existing authentication. No extra application-name header.
- Host permission limited to the DumbPad hostname; no all-sites access, content scripts, cookies API, telemetry, stored PIN, or separate copy of notes.
- Keep Chrome and Edge source identical, using their shared chrome.sidePanel API.
- Package an unpacked folder and a ZIP with source and installation instructions; do not publish to either browser store.
- HA updates continue to update the embedded page; an unpacked extension's own files require a reload after changes.
- Validate the actual extension login and side panel after the user confirms the new installation/site permission. Do not weaken authentication or global cookie settings to make it work.

Implementation choice: use the current DumbPad HTTPS endpoint and existing blue square icon. The remote page runs in its own origin, without access to extension APIs. A first release does not add offline storage, selection capture or website access beyond DumbPad.
