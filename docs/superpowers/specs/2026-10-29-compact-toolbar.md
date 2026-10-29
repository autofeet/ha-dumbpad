# Approved DumbPad compact toolbar

The user selected the single-row demo, removed its application-name and height-label row, and authorized implementation and publication to GitHub with automatic HA updates.

- Keep notebook selection, new notebook, search, preview, and a More button in one approximately 52px row.
- Put link, rename, download, print, theme, settings and delete in More, retaining their original DOM nodes, IDs, listeners, confirmation dialogs and keyboard shortcuts.
- Retain upstream editing, synchronization, authentication and storage behavior; never publish data or credentials.
- Fit 320px and wider windows without horizontal overflow. Use the remaining viewport height for notes.
- Support Escape, outside click and keyboard navigation in the More menu. Restore focus appropriately.
- Install through a dedicated GitHub HA repository, preserving current app data and icons. Enable HA automatic updates and test-before-publish upstream checks on GitHub.
- Preserve a recoverable backup of the current local app and data before changing the running service.

The alternative two-row demo retained all buttons but consumed more vertical space; the user chose single-row collection instead. The implementation layers small frontend assets onto the pinned upstream image, avoiding a full upstream fork.
