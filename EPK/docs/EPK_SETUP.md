# EPK First-Run Setup Guide

Last-Updated: 2026-06-24

This guide helps Dave safely open, edit, preview, and publish the EPK without confusing public pages, publisher tools, local admin tooling, or immutable snapshots.

## Safety boundary

The EPK is a static public site with publisher/admin tooling around a structured JSON payload.

The setup path does not:

- add frontend-only password gates
- silently send email
- scan local folders
- run media analysis
- call paid APIs
- save GitHub tokens
- modify calendars
- publish without a deliberate click

The current public source of truth is:

```text
EPK/public/data/epk.json
```

## Public vs private surfaces

| Surface | Path | Purpose | Safety note |
|---|---|---|---|
| Public EPK | `EPK/public/index.html` | Audience-facing press kit | Public by design |
| Public gallery | `EPK/public/gallery.html` | Audience-facing image gallery | Public by design |
| Published snapshots | `EPK/public/published/<id>/` | Immutable shareable EPK versions | Public by design |
| Hosted publisher | `EPK/public/publisher/` | Hosted editing/publishing portal | Protect with Cloudflare Access before treating as private |
| Local admin | `EPK/admin/admin.html` | Local visual JSON editing | Use locally; do not treat as public UX |

Everything inside the deployed `public` root is publicly servable unless Cloudflare Access or equivalent platform protection is configured.

## Local first run

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/EPK/public/
http://localhost:8000/EPK/public/publisher/
http://localhost:8000/EPK/admin/admin.html
```

Recommended first check:

1. Open the public EPK.
2. Open `/venue`, `/acoustic`, and `/press` if route rewrites are available in the deployment environment.
3. Open the publisher portal locally.
4. Confirm the setup checklist is visible on the dashboard.
5. Download/export JSON before publishing changes.

## Cloudflare Pages setup

Recommended Cloudflare Pages configuration:

```text
Project root directory: EPK
Build command: blank
Output directory: public
```

Alternative:

```text
Project root directory: repository root
Build command: blank
Output directory: EPK/public
```

## Protecting the publisher

The hosted publisher lives at:

```text
/publisher/
```

Before treating it as private, protect this route with Cloudflare Access or equivalent platform authentication.

Do not rely on frontend-only passwords for static admin security.

## Publishing safely

The publisher can publish the live EPK JSON to:

```text
EPK/public/data/epk.json
```

It can also publish immutable snapshots under:

```text
EPK/public/published/<version>/epk.json
```

Safe publishing checklist:

1. Validate the current JSON.
2. Download JSON as a backup.
3. Preview the audience pages.
4. Paste a GitHub token only for the current publishing session.
5. Publish live data only when ready.
6. Publish a snapshot for shareable fixed versions.
7. Copy the snapshot URL from the publisher.

## Tokens and credentials

The publisher does not save GitHub tokens. Paste a token only when publishing, then close the tab/session when finished.

Do not commit tokens, API keys, or private credentials into:

```text
EPK/public/data/epk.json
EPK/public/published/**/epk.json
```

## Contact form behavior

The public Contact button opens the visitor's email app using the email address in `meta.email`.

The static site does not silently send email. True server-side contact form sending needs a protected backend or form service.

## Photos and audio

Images should live under:

```text
EPK/public/photos/
```

Reference them in JSON as:

```text
photos/example.jpg
```

Optional release audio can be referenced from release objects as `audio`, `audioSrc`, or `previewAudio`.

Avoid placing private media in the public deploy root.

## Public routes

Audience routes:

```text
/
/venue
/acoustic
/press
/gallery.html
/published/<version>/
```

Legacy mode URLs such as `/?for=press` may still work, but clean public routes should be preferred.

## Spectra bridge

The public EPK exposes a browser bridge for Spectra-style orchestration:

```text
window.EPKAdapter.getData()
window.EPKAdapter.getModes()
window.EPKAdapter.getActiveMode()
window.EPKAdapter.getCreativeBrief()
window.EPKAdapter.buildGigPromoBrief(...)
```

This is read-oriented bridge metadata. It does not make Spectra responsible for public EPK truth.

## Future work

Recommended next PR:

```text
EPK-Setup-002 — deployment and publisher protection checklist
```

Possible scope:

- add an explicit Cloudflare Access checklist to publisher docs
- add a manual deployment verification checklist
- add a published snapshot smoke-test checklist
- add a no-private-media-in-public-root reminder to the gallery tools
