import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceAdmin = path.join(root, 'EPK/admin/admin.html');
const sourceAdminExportPatch = path.join(root, 'EPK/admin/admin-export-link-patch.js');
const publicAdminDir = path.join(root, 'EPK/public/admin');
const publicAdmin = path.join(publicAdminDir, 'admin.html');
const publicAdminExportPatch = path.join(publicAdminDir, 'admin-export-link-patch.js');

let html = await readFile(sourceAdmin, 'utf8');

if (!/<meta\s+name=["']epk-public-root["']/i.test(html)) {
  html = html.replace(
    '<title>EPK OS — Admin</title>',
    '<title>EPK OS — Admin</title>\n<meta name="epk-public-root" content="same">'
  );
}

if (!html.includes('admin-export-link-patch.js')) {
  html = html.replace(
    '</body>',
    '<script src="admin-export-link-patch.js"></script>\n</body>'
  );
}

await mkdir(publicAdminDir, { recursive: true });
await writeFile(publicAdmin, html);
await copyFile(sourceAdminExportPatch, publicAdminExportPatch);

console.log('Prepared Cloudflare Pages output:');
console.log(`- copied ${sourceAdmin} -> ${publicAdmin}`);
console.log(`- copied ${sourceAdminExportPatch} -> ${publicAdminExportPatch}`);
console.log('- build output directory should be EPK/public');
