# EPK OS Pro — Dave Knowles

## Ecosystem Role

This repository is responsible for the public-facing EPK surface: the site, publisher/admin tooling, the published snapshots, and the structured press-kit payload in `public/data/epk.json`.
It is not responsible for the full music management layer or Prism Core orchestration.
For ecosystem-wide architecture, see [prism-beam/docs/ECOSYSTEM_OVERVIEW.md](https://github.com/devknowsdev/prism-beam/blob/main/docs/ECOSYSTEM_OVERVIEW.md) and [prism-beam/docs/REPO_BOUNDARIES.md](https://github.com/devknowsdev/prism-beam/blob/main/docs/REPO_BOUNDARIES.md).

## Deploy to Cloudflare Pages

Use one of these equivalent Cloudflare Pages setups:

**Recommended:**
1. Set the Cloudflare Pages project root directory to `EPK`
2. Leave the build command blank
3. Set the output directory to `public`

**Alternative:**
1. Leave the project root at the repository root
2. Leave the build command blank
3. Set the output directory to `EPK/public`

Everything in the deploy root is publicly servable unless Cloudflare Access or equivalent platform auth protects it.

## Repo Structure

```
/public             ← Cloudflare serves everything from here
  index.html        ← Main EPK page
  gallery.html      ← Full gallery page
  _redirects        ← Cloudflare Pages route rewrites
  app.js            ← Public EPK renderer and Spectra bridge
  public-clean.js   ← Removes public utility/mode toolbar from audience pages
  styles.css
  /data
    epk.json        ← All public content lives here
  /published        ← Immutable snapshot route + per-version JSON files
  /publisher        ← Hosted publisher portal; protect with Cloudflare Access if deployed
  /photos           ← Drop your image files here
/admin              ← Local/admin tooling; do not deploy publicly as a public route
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

Public audience pages do not show the mode-switching toolbar. Audience selection happens by URL only.

## Publisher / Admin Access

There are two admin surfaces:

**Hosted publisher portal:**

- URL: `https://your-domain/publisher/`
- Location: `public/publisher/`
- Purpose: load `public/data/epk.json`, validate/export edits, and publish immutable snapshots to `/published/<id>/`
- Not linked from public EPK pages
- Must be protected with Cloudflare Access or equivalent platform authentication before being treated as private
- Does not implement frontend-only password protection
- Does not send email, modify calendars, scan user folders, run media analysis, or call paid APIs

**Local/admin UI:**

1. From the repo root, run a local static server such as `python3 -m http.server 8000`
2. Open `http://localhost:8000/EPK/admin/admin.html`
3. Edit blocks visually
4. Click **Export JSON**
5. Replace `public/data/epk.json` in your repo with the downloaded file
6. Push to GitHub → Cloudflare redeploys automatically

You can also edit `public/data/epk.json` directly in your editor and push to GitHub.

## Admin Policy

- Public deploy root remains `public`; files in this folder are served by Cloudflare Pages.
- `public/publisher/` is a hosted publisher surface and must be protected with Cloudflare Access or equivalent if the URL is deployed.
- `admin/admin.html` and `admin/admin.js` remain local/admin tooling, not public EPK UX.
- Do not add frontend-only password gates; they do not secure static admin tooling.
- Public EPK pages must not link to admin/editor controls or expose the mode-switching toolbar.

## Published Versions

Published EPK pages live under immutable versioned URLs:

- `https://your-domain/published/<version>/`
- Each version reads its own JSON snapshot from `public/published/<version>/epk.json`
- The published shell has no editor links or navigation back into the admin/publisher surface
- The publish flow auto-generates a unique version id each time, so repeated publishes never overwrite older snapshots

To publish a new version, set the publish path to the base folder, for example:

- `EPK/public/published`

The publisher flow will create a unique snapshot folder automatically, for example:

- `EPK/public/published/20260624-epk-001/epk.json`

Then share the matching page URL:

- `https://your-domain/published/20260624-epk-001/`

## Spectra Bridge

The public site exposes a machine-readable bridge for Spectra and related automation:

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

| Page | URL |
|------|-----|
| EPK | `https://your-domain/` |
| Venue / Booker | `https://your-domain/venue` |
| Acoustic | `https://your-domain/acoustic` |
| Press | `https://your-domain/press` |
| Gallery | `https://your-domain/gallery` |
| Publisher | `https://your-domain/publisher/` |
| Published | `https://your-domain/published/<id>/` |
