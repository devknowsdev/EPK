# EPK Continuation Handover

## What Changed

- Added `window.EPKAdapter` to the public EPK page.
- Added `window.EPK_SITE` and JSON-LD structured data for machine-readable inspection.
- Added clean public route handling for `/`, `/venue`, `/acoustic`, and `/press`.
- Removed visible public mode switching from audience pages; public audience selection is by URL only.
- Added `public-clean.js` so the public utility/mode toolbar is removed from public pages without disturbing route-mode resolution.
- Added public media/contact/site-template enhancements:
  - YouTube thumbnail cards where a video id can be detected.
  - Optional release audio scrubbers when a release has `audio`, `audioSrc`, or `previewAudio`.
  - Site templates read from `design.siteTemplate` globally and `modes.<key>.siteTemplate` per page.
  - A small public contact button with fields for name, email, phone, enquiry type, date, venue/city, and message.
  - Contact submit opens a reviewable email addressed to `meta.email`; no silent static-site email sending is claimed.
- Added a hosted publisher portal at `/publisher/`.
- Reworked `/publisher/` information architecture:
  - Left nav now uses work areas: Dashboard, Identity, Biography, Offerings, Credits, Videos, Releases, Gallery, Page builder, Promo brief, Site templates, Poster studio, Contact UX, JSON, Publish.
  - Draft/reload controls are labeled **Drafts & data safety**, not Workflow.
  - Page route copy/open/preview controls live inside each Page builder card.
  - Site templates and poster templates are separate.
  - Site templates affect public pages; poster templates only affect the poster canvas.
  - Poster generator can use images from the Gallery as its poster image source.
  - Media previews stay attached to the Videos section cards.
  - Audio scrubber path controls stay attached to the Releases section cards.
  - Gallery edit cards show their images.
  - Public-contact behavior preview remains in Contact UX.
  - Live preview selector remains on the dashboard.
  - Profile/contact/social editing, biographies, offerings, credits, videos, releases, gallery, page recipes, JSON, drafts, promo brief, and publishing remain available.
- Kept local/admin tooling outside the public EPK UX under `admin/`.
- Documented the Spectra bridge, public route contract, publisher/admin policy, media/contact behavior, separate site/poster templates, and poster generator in `README.md`.

## Why

The EPK site already had a strong content model. These passes make the model easier for Spectra to consume while keeping public audience pages clean and separating publisher access from visitor-facing page chrome.

The latest correction fixes the publisher hierarchy: controls now live where the user expects them, templates have separate meanings, and poster generation can draw from the actual Gallery instead of requiring only uploaded logos.

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
- Detached dashboard route tabs should not be reintroduced; route controls belong on each Page builder card.
- Media previews should stay attached to their source records in Videos/Releases, not live in a separate media page.
- Site templates are separate from poster templates.
- Site template set: Forest Editorial, Press Minimal, Acoustic Warm, DU!F Electric, Cinema Score.
- Poster template set: Acoustic Earth, DU!F Night Drive, Scorehouse, Press Minimal Poster, Wedding Gold.
- Poster generator is browser-only, can use Gallery images, and exports PNGs without uploading assets or calling generation APIs.
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
