# DumbPad Browser Side Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline; the user chose the proposed lightweight version.

**Goal:** Deliver and verify a minimal Chrome/Edge side-panel extension connected to existing HA notes.

**Architecture:** A local Manifest V3 wrapper frames the existing HTTPS app and uses setPanelBehavior for action clicks. No backend or HA image changes.

**Tech Stack:** Browser extension APIs, HTML/CSS, Node tests with existing jsdom, Python ZIP packaging.

**Spec:** ../specs/2026-10-29-browser-sidepanel.md

## Global Constraints
- Preserve existing notes and PIN; do not publish credentials or note contents.
- Only sidePanel and the DumbPad hostname permission; no third-party scripts in the extension context.
- No added toolbar or independent note storage. No browser-store publication.

## Review Focus
- Action icon opens the persistent panel without a popup.
- Remote iframe login works with existing SameSite cookies and host permission.
- CSP permits exactly the intended framed origin; local assets packaged with no private files.
- Narrow side-panel widths retain the deployed toolbar and editor.
- Distinguish live page updates from manual unpacked-extension reloads.

## Tasks
- [ ] Add failing manifest, action behavior and iframe tests; implement the small extension.
- [ ] Run all tests, package an allowlisted ZIP, and obtain a fresh final review.
- [ ] Ask for installation/site-access approval only after files are concrete and reviewable; install and test the real native side panel if approved.
- [ ] Document verified browser support and remaining limits; deliver the ZIP and source.
