# EPK Continuation Handover

## What Changed

- Added `window.EPKAdapter` to the public EPK page.
- Added `window.EPK_SITE` and JSON-LD structured data for machine-readable inspection.
- Added clean public route handling for `/`, `/venue`, `/acoustic`, and `/press`.
- Removed visible public mode switching from audience pages; public audience selection is by URL only.
- Added `public-clean.js` so the public utility/mode toolbar is removed from public pages without disturbing route-mode resolution.
- Added public media/contact enhancements:
  - YouTube thumbnail cards where a video id can be detected.
  - Optional release audio scrubbers when a release has `audio`, `audioSrc`, or `previewAudio`.
  - A public contact button with fields for name, email, phone, enquiry type, date, venue/city, and message.
  - Contact submit opens a reviewable email addressed to `meta.email`; no silent static-site email sending is claimed.
- Added a hosted publisher portal at `/publisher/`.
- Upgraded `/publisher/` into a full EPK control centre with:
  - clean route copy/open links
  - dashboard route tabs that open the selected public page in the preview
  - visible template previews and a template studio
  - media preview tools for video thumbnails and release audio paths
  - browser-only poster generator with template, act/mode, date, venue, doors, other act, CTA, extra text, and optional logo upload
  - public-contact behavior preview
  - live preview selector
  - profile/contact/social editing
  - short/acoustic/full biography editing
  - offerings, credits, videos, releases, and gallery editing
  - audience page recipe controls for modes, sections, hero images, tags, and gallery counts
  - advanced JSON format/apply/download controls
  - browser draft save/restore/discard
  - local promo brief composer with copy/download output
  - live `EPK/public/data/epk.json` publishing and immutable snapshot publishing
- Kept local/admin tooling outside the public EPK UX under `admin/`.
- Documented the Spectra bridge, public route contract, publisher/admin policy, media/contact behavior, templates, and poster generator in `README.md`.

## Why

The EPK site already had a strong content model. These passes make the model easier for Spectra to consume while keeping public audience pages clean and separating publisher access from visitor-facing page chrome.

The latest publisher pass restores the practical control-centre feel: Dave can preview audience pages as dashboard tabs, inspect media, choose a visual template, build a poster, and publish EPK data without bringing back the public top toolbar.

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
- `/publisher/` is not linked from public EPK pages.
- Dashboard route tabs are publisher-only preview controls; they must not be exposed on public EPK pages.
- The template set now encoded in the publisher is: Acoustic Earth, DU!F Night Drive, Scorehouse, Press Minimal, and Wedding Gold.
- The poster generator is browser-only. It exports PNGs and does not upload assets or call generation APIs.
- The public contact form is a static mailto handoff. It opens the visitor's email app; a true server-side sender needs a separate backend/form-service sprint.
- `admin/admin.html` is local/admin tooling.
- Public EPK pages must not link to admin/editor controls or show the mode-switching toolbar.
- Do not add fake frontend password protection.
- Do not store GitHub tokens in the repo. The publisher asks for a token only when publishing.

## Next Best Steps

- Protect `/publisher/*` in Cloudflare Access before relying on it as private hosted publisher access.
- Choose whether contact should remain a reviewable mailto handoff or become a real server-side form submission.
- Add a dedicated music-career object to `epk.json` for gigs, socials, and publication tasks.
- Add real audio files under `public/audio/` if release scrubbers should appear immediately.
- Teach Spectra to prefer the adapter before DOM scraping.
- Mirror the same bridge metadata in `gallery.html` if full parity is needed.
