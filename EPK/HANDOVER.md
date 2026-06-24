# EPK Continuation Handover

## What Changed

- Added `window.EPKAdapter` to the public EPK page.
- Added `window.EPK_SITE` and JSON-LD structured data for machine-readable inspection.
- Added clean public route handling for `/`, `/venue`, `/acoustic`, and `/press`.
- Removed visible public mode switching from audience pages; public audience selection is by URL only.
- Added `public-clean.js` so the public utility/mode toolbar is removed from public pages without disturbing route-mode resolution.
- Added a hosted publisher portal at `/publisher/` for validating/exporting `epk.json` and publishing immutable snapshots.
- Kept local/admin tooling outside the public EPK UX under `admin/`.
- Documented the Spectra bridge, public route contract, and publisher/admin policy in `README.md`.

## Why

The EPK site already had a strong content model. These passes make the model easier for Spectra to consume while keeping public audience pages clean and separating publisher access from visitor-facing page chrome.

## Current Contract

Use the EPK page in this order:

1. Read `window.EPKAdapter.getData()` for canonical content.
2. Read `window.EPKAdapter.getActiveMode()` for the current audience view.
3. Use `window.EPKAdapter.getCreativeBrief()` for a mode-aware summary.
4. Use `window.EPKAdapter.buildGigPromoBrief({ eventName, date, venue, city, cta })` when the task is promo generation.

Public routes:

- `/` → general/default EPK
- `/venue` → booker/venue EPK
- `/acoustic` → acoustic EPK
- `/press` → press EPK
- `/published/<id>/` → immutable snapshot EPK

Publisher/admin:

- `/publisher/` is the hosted publisher portal and must be protected with Cloudflare Access or equivalent if deployed.
- `admin/admin.html` is local/admin tooling.
- Public EPK pages must not link to admin/editor controls or show the mode-switching toolbar.
- Do not add fake frontend password protection.

## Next Best Steps

- Protect `/publisher/*` in Cloudflare Access before relying on it as private hosted publisher access.
- Add a small promo brief composer in the publisher/admin flow.
- Add a dedicated music-career object to `epk.json` for gigs, socials, and publication tasks.
- Teach Spectra to prefer the adapter before DOM scraping.
- Mirror the same bridge metadata in `gallery.html` if full parity is needed.
