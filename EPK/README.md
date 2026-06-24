# EPK OS Pro — Dave Knowles

## Ecosystem Role

This repository is responsible for the public-facing EPK surface: the site, local/admin editor tooling, the published snapshots, and the structured press-kit payload in `public/data/epk.json`.
It is not responsible for the full music management layer or Prism Core orchestration.
For ecosystem-wide architecture, see [prism-beam/docs/ECOSYSTEM_OVERVIEW.md](https://github.com/devknowsdev/prism-beam/blob/main/docs/ECOSYSTEM_OVERVIEW.md) and [prism-beam/docs/REPO_BOUNDARIES.md](https://github.com/devknowsdev/prism-beam/blob/main/docs/REPO_BOUNDARIES.md).

## Deploy to Cloudflare Pages

1. Push this repo to GitHub
2. In Cloudflare Pages → Connect to Git → select the repo
3. Set build settings:
   - **Build command:** _(leave blank)_
   - **Output directory:** `public`
4. Deploy — done.

## Repo Structure

```
/public             ← Cloudflare serves everything from here
  index.html        ← Main EPK page
  gallery.html      ← Full gallery page
  _redirects        ← Cloudflare Pages route rewrites
  app.js
  styles.css
  /data
    epk.json        ← All content lives here
  /published       ← Immutable snapshot route + per-version JSON files
  /photos           ← Drop your image files here
    Dave Session Violin.jpg
    Dave Cello.jpg
    Dave DUIF.jpg
/admin              ← Local/admin tooling; do not deploy publicly
  admin.html
  admin.js
```

## Adding / Editing Photos

1. Drop image files into `/public/photos/`
2. Reference them in `epk.json` as `"photos/your-file.jpg"`

## Public Routes

The public EPK exposes clean audience routes:

| Audience | URL |
|----------|-----|
| General | `https://your-domain/` |
| Venue / Booker | `https://your-domain/venue` |
| Acoustic | `https://your-domain/acoustic` |
| Press | `https://your-domain/press` |

Legacy query-param mode URLs such as `/?for=press`, `/?for=acoustic`, and `/?for=booker` are still parsed for compatibility, but public navigation should use the clean routes above.

## Editing Content

**Option A — Local/admin UI:**
1. From the repo root, run a local static server such as `python3 -m http.server 8000`
2. Open `http://localhost:8000/EPK/admin/admin.html`
3. Edit blocks visually
4. Click **Export JSON**
5. Replace `public/data/epk.json` in your repo with the downloaded file
6. Push to GitHub → Cloudflare redeploys automatically

**Option B — Edit JSON directly:**
- Edit `public/data/epk.json` in your editor and push to GitHub

## Admin Policy

- Public deploy root remains `public`; files in this folder are served by Cloudflare Pages.
- `admin/admin.html` and `admin/admin.js` are local/admin tooling, not public UX.
- Do not copy, route, or deploy admin files publicly unless Cloudflare Access or equivalent hosting/platform authentication protects them.
- Do not add frontend-only password gates; they do not secure static admin tooling.
- The public site must not link to admin/editor controls.

## Published Versions

Published EPK pages now live under immutable versioned URLs:

- `https://your-domain/published/<version>/`
- Each version reads its own JSON snapshot from `public/published/<version>/epk.json`
- The published shell has no editor links or navigation back into the admin surface
- The publish button auto-generates a unique version id each time, so repeated publishes never overwrite older snapshots

To publish a new version, set the admin publish path to the base folder, for example:

- `EPK/public/published`

The admin flow will create a unique snapshot folder automatically, for example:

- `EPK/public/published/20260623-epk-001/epk.json`

Then share the matching page URL:

- `https://your-domain/published/20260623-epk-001/`

## Spectra Bridge

The public site now exposes a machine-readable bridge for Spectra and related automation:

- `window.EPKAdapter.getData()` returns the full EPK payload.
- `window.EPKAdapter.getModes()` and `getActiveMode()` expose the audience-specific views.
- `window.EPKAdapter.getCreativeBrief()` returns a mode-aware creative brief.
- `window.EPKAdapter.buildGigPromoBrief({ eventName, date, venue, city, cta })` is the starting point for posters and socials.
- `public/index.html` includes bridge metadata via `meta` tags so the page is easy to detect.

The current source of truth is still `public/data/epk.json`; the adapter just gives Spectra a stable entrypoint.

## Continuation Notes

If we continue this integration, the next useful steps are:

1. Add a dedicated music-career data block to `epk.json` for gigs, releases, and promo assets.
2. Teach Spectra to read `window.EPKAdapter` before it falls back to DOM scraping.
3. Add a small UI on the EPK side for quick promo-brief generation.
4. Bring the gallery and admin pages onto the same bridge metadata pattern.

## URL Reference

| Page    | URL                                 |
|---------|-------------------------------------|
| EPK     | `https://your-domain/`              |
| Venue / Booker | `https://your-domain/venue` |
| Acoustic | `https://your-domain/acoustic`     |
| Press | `https://your-domain/press`          |
| Gallery | `https://your-domain/gallery`       |
| Published | `https://your-domain/published/<id>/` |
