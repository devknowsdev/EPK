# EPK OS Pro — Dave Knowles

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
  admin.html        ← Content editor
  _redirects        ← Cloudflare Pages route rewrites
  app.js
  admin.js
  styles.css
  /data
    epk.json        ← All content lives here
  /published       ← Immutable snapshot route + per-version JSON files
  /photos           ← Drop your image files here
    Dave Session Violin.jpg
    Dave Cello.jpg
    Dave DUIF.jpg
```

## Adding / Editing Photos

1. Drop image files into `/public/photos/`
2. Reference them in `epk.json` as `"photos/your-file.jpg"`

## Editing Content

**Option A — Admin UI (recommended):**
1. Open `https://your-domain/admin` or `https://your-domain/admin.html`
2. Edit blocks visually
3. Click **Export JSON**
4. Replace `public/data/epk.json` in your repo with the downloaded file
5. Push to GitHub → Cloudflare redeploys automatically

**Option B — Edit JSON directly:**
- Edit `public/data/epk.json` in your editor and push to GitHub

## Published Versions

Published EPK pages now live under immutable versioned URLs:

- `https://your-domain/published/<version>/`
- Each version reads its own JSON snapshot from `public/published/<version>/epk.json`
- The published shell has no editor links or navigation back into the admin surface

To publish a new version, set the admin publish path to a unique folder, for example:

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
| Gallery | `https://your-domain/gallery`       |
| Admin   | `https://your-domain/admin`         |
| Fallback | `https://your-domain/admin.html`    |
| Published | `https://your-domain/published/<id>/` |
