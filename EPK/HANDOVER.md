# EPK Continuation Handover

## What Changed

- Added `window.EPKAdapter` to the public EPK page.
- Added `window.EPK_SITE` and JSON-LD structured data for machine-readable inspection.
- Added a utility header with mode chips, gallery/admin links, and `data-ai-surface="spectra"`.
- Added bridge metadata to `public/index.html` so the page is easy to identify.
- Documented the Spectra bridge in `README.md`.

## Why

The EPK site already had a strong content model. This pass makes that model easier for Spectra to consume without changing the press-kit structure itself.

## Current Contract

Use the EPK page in this order:

1. Read `window.EPKAdapter.getData()` for canonical content.
2. Read `window.EPKAdapter.getActiveMode()` for the current audience view.
3. Use `window.EPKAdapter.getCreativeBrief()` for a mode-aware summary.
4. Use `window.EPKAdapter.buildGigPromoBrief({ eventName, date, venue, city, cta })` when the task is promo generation.

## Next Best Steps

- Add a small promo brief composer in the admin flow.
- Add a dedicated music-career object to `epk.json` for gigs, socials, and publication tasks.
- Teach Spectra to prefer the adapter before DOM scraping.
- Mirror the same bridge metadata in `gallery.html` and `admin.html` if we want full parity.
