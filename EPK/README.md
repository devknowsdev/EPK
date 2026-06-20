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
  admin.html        ← Content editor (not publicly linked)
  app.js
  admin.js
  styles.css
  /data
    epk.json        ← All content lives here
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
1. Open `https://your-domain/admin.html`
2. Edit blocks visually
3. Click **Export JSON**
4. Replace `public/data/epk.json` in your repo with the downloaded file
5. Push to GitHub → Cloudflare redeploys automatically

**Option B — Edit JSON directly:**
- Edit `public/data/epk.json` in your editor and push to GitHub

## URL Reference

| Page    | URL                              |
|---------|----------------------------------|
| EPK     | `https://your-domain/`           |
| Gallery | `https://your-domain/gallery`    |
| Admin   | `https://your-domain/admin.html` |
