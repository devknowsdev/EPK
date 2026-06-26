#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const paths = {
  admin: path.join(root, 'EPK/admin/admin.html'),
  app: path.join(root, 'EPK/public/app.js'),
  data: path.join(root, 'EPK/public/data/epk.json'),
  styles: path.join(root, 'EPK/public/styles.css')
};

const checks = [];

function pass(name) {
  checks.push({ name, ok: true });
}

function fail(name, detail = '') {
  checks.push({ name, ok: false, detail });
}

function readRequired(label, filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} exists`, filePath);
    return '';
  }
  pass(`${label} exists`);
  return fs.readFileSync(filePath, 'utf8');
}

const admin = readRequired('admin.html', paths.admin);
const app = readRequired('app.js', paths.app);
const dataText = readRequired('epk.json', paths.data);
readRequired('styles.css', paths.styles);

if (dataText) {
  try {
    JSON.parse(dataText);
    pass('epk.json parses');
  } catch (error) {
    fail('epk.json parses', error.message);
  }
}

if (admin) {
  admin.includes('migrateGalleryCount')
    ? pass('admin includes galleryCount migration')
    : fail('admin includes galleryCount migration');

  admin.includes('galleryPhotos')
    ? pass('admin references galleryPhotos')
    : fail('admin references galleryPhotos');

  admin.includes('EPK/public/data/epk.json') || admin.includes('../public/data/epk.json')
    ? pass('admin points at EPK data file')
    : fail('admin points at EPK data file');
}

if (app) {
  app.includes('const srcs = mode.galleryPhotos || []')
    ? pass('app renders galleries from mode.galleryPhotos')
    : fail('app renders galleries from mode.galleryPhotos');

  !app.includes('galleryCount')
    ? pass('app does not reference galleryCount')
    : fail('app does not reference galleryCount');
}

const failed = checks.filter(check => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
}

if (failed.length) {
  console.error(`\n${failed.length} validation check(s) failed.`);
  process.exit(1);
}

console.log('\nEPK admin upgrade static validation passed.');
