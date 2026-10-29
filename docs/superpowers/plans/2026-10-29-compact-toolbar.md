# DumbPad Compact Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved compact toolbar through GitHub and enable HA automatic updates.

**Architecture:** A thin image derived from pinned DumbPad adds CSS and JS assets to the upstream HTML. Existing action elements are moved rather than replaced. A new HA repository supplies versioned definitions; scheduled GitHub checks build and test candidate images before publishing a version bump.

**Tech Stack:** Vanilla JavaScript, CSS, Node test runner with jsdom, Python, Docker, HA Supervisor, GitHub Actions.

**Spec:** ../specs/2026-10-29-compact-toolbar.md

## Global Constraints

- Preserve original note data, PIN, API, action listeners, shortcuts and delete confirmation.
- No application-name or height-label row.
- Keep the upstream image fixed by digest until an update passes checks.
- Publish source code only; no credentials, note contents or private exports.

## Review Focus

- DOM load order: controls must exist before mounting and upstream listeners must remain attached.
- Focus, Escape and outside clicks must close the menu without firing an action.
- Repeated initialization must not duplicate controls or listeners.
- A 320px window must fit the toolbar and menu; desktop must retain an adequate editor height.
- Updating the repository must preserve the mapped app_config directory and all data.

## Tasks

### 1. Frontend overlay and regression tests
- [ ] Add failing jsdom tests for retained action identity/listeners, compact action order, idempotence, Escape/outside-click focus, and keyboard navigation.
- [ ] Run tests and confirm failure before adding the overlay.
- [ ] Add compact-toolbar.js and compact-toolbar.css; inject assets during image build without replacing upstream application code.
- [ ] Run tests; inspect a local fixture at 320, 520 and desktop widths through the browser.

### 2. GitHub delivery and update checks
- [ ] Add HA config with preserved PIN/TZ schema and app_config mapping, icon, repository metadata, documentation and Dockerfile.
- [ ] Add daily stable-image checks with protected semantic-version/digest handling and build/smoke/UI tests before committing an update.
- [ ] Publish to autofeet/ha-dumbpad and verify the CI run succeeds before live installation.

### 3. Deployment
- [ ] Back up the running local app, its options/data, and local definitions.
- [ ] Register the GitHub repository, build/install the new app and stop the old app for final data transfer.
- [ ] Compare all data-file hashes, preserve PIN/options, start the new app, and validate original HTTPS domain, controls, data reads and restart persistence.
- [ ] Enable auto-update and watchdog; disable old local app boot while retaining its data for rollback.
- [ ] Record versions, verification and backups; commit source and leave the tested deployed result.
