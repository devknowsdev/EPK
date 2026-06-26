import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceAdmin = path.join(root, 'EPK/admin/admin.html');
const publicAdminDir = path.join(root, 'EPK/public/admin');
const publicAdmin = path.join(publicAdminDir, 'admin.html');

let html = await readFile(sourceAdmin, 'utf8');

if (!html.includes('name="epk-public-root"')) {
  html = html.replace(
    '<title>EPK OS — Admin</title>',
    '<title>EPK OS — Admin</title>\n<meta name="epk-public-root" content="same">'
  );
}

await mkdir(publicAdminDir, { recursive: true });
await writeFile(publicAdmin, html);

console.log('Prepared Cloudflare Pages output:');
console.log(`- copied ${sourceAdmin} -> ${publicAdmin}`);
console.log('- build output directory should be EPK/public');
