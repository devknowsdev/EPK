# EPK Cleanup Package Manifest

Generated for the EPK admin block-canvas cleanup pass.

## Canonical branch

`main`

## Canonical PRs

- PR #14 — `feat: add EPK block canvas admin`
  - Replaced `EPK/admin/admin.html`.
  - Updated `EPK/public/app.js` gallery rendering.
  - Left `EPK/public/data/epk.json` untouched.

## Cleanup additions

- `EPK/docs/ADMIN_BLOCK_CANVAS_UPGRADE.md`
  - Explains the upgrade, data migration, publishing boundary, and validation process.

- `EPK/scripts/validate-epk-admin-upgrade.mjs`
  - Static validation script for the admin/app upgrade contract.

## Files to include in a clean handoff ZIP

```text
EPK/
  admin/admin.html
  public/app.js
  public/data/epk.json
  public/styles.css
  docs/ADMIN_BLOCK_CANVAS_UPGRADE.md
  scripts/validate-epk-admin-upgrade.mjs
  PACKAGE_MANIFEST.md
```

## Packaging command

From the repository root after pulling latest `main`:

```bash
node EPK/scripts/validate-epk-admin-upgrade.mjs
zip -r EPK_admin_block_canvas_clean_from_main.zip \
  EPK/admin/admin.html \
  EPK/public/app.js \
  EPK/public/data/epk.json \
  EPK/public/styles.css \
  EPK/docs/ADMIN_BLOCK_CANVAS_UPGRADE.md \
  EPK/scripts/validate-epk-admin-upgrade.mjs \
  EPK/PACKAGE_MANIFEST.md
```

## Notes

The ZIP is an export artifact. The repository remains the source of truth.
