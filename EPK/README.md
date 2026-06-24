# EPK OS Pro — Dave Knowles

## Ecosystem Role

This repository is responsible for the public-facing EPK surface: the site, publisher/admin tooling, the published snapshots, and the structured press-kit payload in `public/data/epk.json`.
It is not responsible for the full music management layer or Prism Core orchestration.
For ecosystem-wide architecture, see [prism-beam/docs/ECOSYSTEM_OVERVIEW.md](https://github.com/devknowsdev/prism-beam/blob/main/docs/ECOSYSTEM_OVERVIEW.md) and [prism-beam/docs/REPO_BOUNDARIES.md](https://github.com/devknowsdev/prism-beam/blob/main/docs/REPO_BOUNDARIES.md).

## First-run setup

Start with [docs/EPK_SETUP.md](docs/EPK_SETUP.md) before using the publisher or deploying the site.

Local preview from the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/EPK/public/
http://localhost:8000/EPK/public/publisher/
http://localhost:8000/EPK/admin/admin.html
```

Important boundary:

- The public EPK and snapshots are public by design.
- The hosted publisher route must be protected with Cloudflare Access or equivalent before being treated as private.
- The publisher does not save GitHub tokens; paste a token only for a publishing session.
- The static contact form opens the visitor's email app; it does not silently send email.

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
  public-media-contact.js/css ← Site-template, video thumbnail, audio scrubber, and contact-button enhancements
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

## Adding / Editing Photos and Audio

1. Drop image files into `/public/photos/`
2. Reference them in `epk.json` as `"photos/your-file.jpg"`
3. Optional audio previews can be added to release objects as `audioSrc`, for example `"audio/track.mp3"`; the public page shows an audio scrubber when that field exists.

## Public Routes

The public EPK exposes clean audience routes:

| Audience | URL |
|----------|-----|
| General | `https://your-domain/` |
| Venue / Booker | `https://your-domain/venue` |
| Acoustic | `https://your-domain/acoustic` |
| Press | `https://your-domain/press` |

Legacy query-param mode URLs such as `/?for=press`, `/?for=acoustic`, and `/?for=booker` are still parsed for compatibility, but public navigation should use the clean routes above.

Public audience pages do not show the mode-switching toolbar. Audience selection happens by URL only. Publisher-side route/open/copy/preview controls belong inside the **Page builder** card for each page recipe, not as a detached dashboard route strip.

## Public Media, Site Templates, and Contact Enhancements

The public EPK includes lightweight browser-only enhancements:

- YouTube links render with thumbnails where a video id can be detected.
- Vimeo and non-thumbnail media links remain safe text/card links.
- Release audio scrubbers appear when a release has `audio`, `audioSrc`, or `previewAudio` set.
- Site templates are read from `design.siteTemplate` globally and `modes.<key>.siteTemplate` per audience page.
- A small public **Contact** button opens a form with name, email, phone, enquiry type, date, venue/city, and message fields.
- Contact submit opens the visitor's email app addressed to the `meta.email` address from `epk.json`.
- The static site does not silently send email; true server-side sending must be implemented separately with a protected backend/form service.

## Publisher / Admin Access

There are two admin surfaces:

**Hosted publisher portal:**

- URL: `https://your-domain/publisher/`
- Location: `public/publisher/`
- Purpose: edit the EPK data, preview clean public audience pages, generate promo briefs, validate/export JSON, publish live `EPK/public/data/epk.json`, and publish immutable snapshots to `/published/<id>/`
- Left navigation is organized by work area: Dashboard, Identity, Biography, Offerings, Credits, Videos, Releases, Gallery, Page builder, Promo brief, Site templates, Poster studio, Contact UX, JSON, Publish
- Draft/local reload controls live under **Drafts & data safety** on the dashboard, not under a vague Workflow section
- Page route/open/copy/preview controls live on each **Page builder** card
- Site templates and poster templates are separate concepts
- Site templates affect public EPK pages globally or per page
- Poster templates affect only the poster canvas
- Media previews are attached inside the Videos and Releases sections so they stay with their source records
- Release audio paths are edited inside the Releases section, next to the linked release
- Poster generator can use images from the Gallery as the poster image source
- Poster generator inputs: poster template, act/mode, gallery image, event title, date, venue, doors, other act, CTA, extra text, and optional venue/promoter logo upload
- Not linked from public EPK pages
- Must be protected with Cloudflare Access or equivalent platform authentication before being treated as private
- Does not implement frontend-only password protection
- Does not silently send email, modify calendars, scan user folders, run media analysis, or call paid APIs
- Does not save GitHub tokens; paste a token only for a publishing session

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

## Site Templates and Poster Templates

Site templates:

- Forest Editorial
- Press Minimal
- Acoustic Warm
- DU!F Electric
- Cinema Score

Poster templates:

- Acoustic Earth
- DU!F Night Drive
- Scorehouse
- Press Minimal Poster
- Wedding Gold

Site templates are selected globally from **Site templates** and per audience page from **Page builder**. Poster templates are selected inside **Poster studio**. Applying a site template should not silently change the poster canvas; applying a poster template should not silently change public page styling.

The browser-only poster generator exports a PNG poster from manual event inputs and optional gallery/logo images. It does not call image APIs, upload files, or publish posters automatically.

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

1. Protect `/publisher/*` with Cloudflare Access before relying on hosted publisher privacy.
2. Add a true server-side contact/send path only after choosing a protected backend/form service.
3. Add a dedicated music-career data block to `epk.json` for gigs, releases, and promo assets.
4. Teach Spectra to read `window.EPKAdapter` before it falls back to DOM scraping.
5. Bring the gallery and admin pages onto the same bridge metadata pattern if full parity is needed.

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
