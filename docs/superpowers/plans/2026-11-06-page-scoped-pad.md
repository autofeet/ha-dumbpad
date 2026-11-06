# DumbPad page-scoped update

User requested removal of the name suffix, smaller radii, page-scoped opening, and a record of the previous page selection. The user clarified that both open state and selected notebook must be remembered. The extension records these separately for each webpage. Unknown pages stay closed; known pages recover their saved native configuration. No background open call bypasses Chrome's gesture restriction, so a fresh native instance can still require an explicit click before showing its restored notebook.

- [x] Find the installed desktop folder and back it up before updating. Preserve its user-selected location.
- [x] Add failing contextual panel and note-memory tests, then implement the changes. Use tabs metadata access to recognize returning pages without reading their content; persist opaque page identifiers, open state and note IDs locally.
- [ ] Run the full suite and fresh review, package the exact public source, then update the desktop copy.
- [ ] Reload and verify the real extension when supported by connected UI tooling; report any actual control limitation accurately.

Radius changes apply inside the extension's marked DumbPad iframe. Browser-owned window borders are outside extension control. The HA application remains the existing source of notes and authentication.

The managed-worktree request did not return and created no checkout (verified with git worktree list); its waiting request was terminated. Work proceeds on feature/page-scoped-state in the task-owned repository. The missing original extension folder was identical to the moved desktop copy, which was copied back for source maintenance; the actual installation path remains on the desktop.
