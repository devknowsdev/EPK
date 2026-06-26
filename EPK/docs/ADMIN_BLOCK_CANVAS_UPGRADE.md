# EPK Admin Block Canvas Upgrade

Last updated: 2026-06-26

## Status

This document describes the current canonical repository state after PR #14, `feat: add EPK block canvas admin`, was merged into `main`.

`main` is now the source of truth. Earlier chat-generated ZIP files and pasted handover notes are historical artifacts only.

## Files owned by this upgrade

- `EPK/admin/admin.html`
  - Self-contained admin surface for editing EPK modes and blocks.
  - Loads `../public/data/epk.json` in the browser.
  - Keeps edits in browser state until the user explicitly downloads JSON or publishes.
  - Migrates legacy per-mode `galleryCount` fields to explicit `galleryPhotos` arrays on load.

- `EPK/public/app.js`
  - Public renderer for the EPK site.
  - Gallery sections now read from `mode.galleryPhotos` instead of `mode.galleryCount`.
  - Gallery rendering builds a lookup from `epk.gallery` and falls back safely if a selected path is not present in the gallery registry.

## Files intentionally not changed

- `EPK/public/data/epk.json`
  - This file was not edited by the upgrade PR.
  - Existing live content remains stable until a human explicitly publishes updated JSON from the admin.

- `EPK/public/styles.css`
  - Public styling was not changed by the upgrade PR.

## Data migration rule

The old model allowed each mode to choose a gallery by number:

```json
{
  "galleryCount": 6
}
```

The new model stores an explicit ordered list of photo paths:

```json
{
  "galleryPhotos": [
    "assets/photos/example-1.webp",
    "assets/photos/example-2.webp"
  ]
}
```

The admin performs this migration in memory on load:

1. If a mode has `galleryPhotos`, it is left alone.
2. If a mode lacks `galleryPhotos` and has `galleryCount`, the admin copies the first `galleryCount` entries from `epk.gallery` into `galleryPhotos`.
3. The legacy `galleryCount` field is removed from browser state.
4. `epk.json` is only changed if the user explicitly publishes or downloads/replaces JSON.

## Approval and publishing boundary

Publishing remains an explicit external-write action.

The admin may prepare JSON locally, preview it, and download a backup. It must not silently update GitHub, deploy Cloudflare Pages, email anyone, or mutate public data without a deliberate user action.

This keeps EPK aligned with the Prism suite boundary:

- EPK owns public/promotional truth.
- Beam owns AI-facing reference and handover memory.
- Spectra should own suite-level orchestration and AI routing.
- Public content edits remain reviewable before publishing.

## Validation

Run this from the repository root:

```bash
node EPK/scripts/validate-epk-admin-upgrade.mjs
```

The validator checks that:

- `EPK/admin/admin.html` exists.
- `EPK/public/app.js` exists.
- `EPK/public/data/epk.json` parses as JSON.
- `EPK/admin/admin.html` contains `migrateGalleryCount`.
- `EPK/admin/admin.html` references `galleryPhotos`.
- `EPK/public/app.js` renders gallery sections from `mode.galleryPhotos`.
- `EPK/public/app.js` no longer references `galleryCount`.

## Known follow-up

A browser/live deployment check is still recommended after Cloudflare Pages redeploys. The validator is a static safety check, not a full browser test.
