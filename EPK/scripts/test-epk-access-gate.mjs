#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const middlewarePath = new URL('../functions/_middleware.js', import.meta.url);
const redirectsPath = new URL('../public/_redirects', import.meta.url);
const middlewareSource = await readFile(middlewarePath, 'utf8');
const middlewareModule = await import(
  `data:text/javascript;base64,${Buffer.from(middlewareSource).toString('base64')}`
);
const { onRequest } = middlewareModule;

const testEnv = {
  EPK_ACCESS_PASSWORD: 'test-only-password',
  EPK_AUTH_SALT: 'test-only-salt'
};

function loginRequest(password, next = '/admin/') {
  return new Request('https://epk.test/__epk-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ password, next })
  });
}

async function run(name, test) {
  await test();
  console.log(`PASS ${name}`);
}

await run('incorrect password redisplays the login form instead of returning 500', async () => {
  const response = await onRequest({
    request: loginRequest('incorrect'),
    env: testEnv,
    next: () => new Response('unused')
  });

  assert.equal(response.status, 401);
  assert.match(await response.text(), /Incorrect password\./);
});

let accessCookie = '';

await run('correct password redirects safely and sets the access cookie', async () => {
  const response = await onRequest({
    request: loginRequest(testEnv.EPK_ACCESS_PASSWORD),
    env: testEnv,
    next: () => new Response('unused')
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), '/admin/');
  assert.match(response.headers.get('Set-Cookie') || '', /^epk_access=.+HttpOnly; Secure; SameSite=Lax/);
  accessCookie = (response.headers.get('Set-Cookie') || '').split(';', 1)[0];
});

await run('session cookie grants access to the trailing-slash admin route', async () => {
  const response = await onRequest({
    request: new Request('https://epk.test/admin/', {
      headers: { Cookie: accessCookie }
    }),
    env: testEnv,
    next: () => new Response('admin ok')
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'admin ok');
});

await run('malformed cookies do not crash protected requests', async () => {
  const response = await onRequest({
    request: new Request('https://epk.test/admin/', {
      headers: { Cookie: 'epk_access=%E0%A4%A' }
    }),
    env: testEnv,
    next: () => new Response('unused')
  });

  assert.equal(response.status, 401);
  assert.match(await response.text(), /Access required/);
});

await run('public shell bypasses authentication bindings', async () => {
  const response = await onRequest({
    request: new Request('https://epk.test/'),
    env: new Proxy({}, {
      get() {
        throw new Error('public request unexpectedly accessed authentication bindings');
      }
    }),
    next: () => new Response('public ok')
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'public ok');
});

await run('missing production password fails closed on protected routes', async () => {
  const response = await onRequest({
    request: new Request('https://epk.test/admin/'),
    env: {},
    next: () => new Response('unused')
  });

  assert.equal(response.status, 503);
  assert.match(await response.text(), /EPK password gate is not configured/);
});

await run('/admin and /admin/ resolve to the same admin document', async () => {
  const redirects = await readFile(redirectsPath, 'utf8');
  const rules = new Map(
    redirects
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        const [from, to, status] = line.split(/\s+/);
        return [from, { to, status }];
      })
  );

  assert.deepEqual(rules.get('/admin'), {
    to: '/admin/admin.html',
    status: '200'
  });
  assert.deepEqual(rules.get('/admin/'), rules.get('/admin'));
});

console.log('\nEPK access-gate regression checks passed.');
