/*
MODULE: EPK/functions/_middleware.js
PURPOSE: Cloudflare Pages access gate for EPK data, publisher, and downloadable/private surfaces while allowing a redacted public shell.
SECURITY: Does not hard-code passwords. Set EPK_ACCESS_PASSWORD as a Cloudflare Pages environment variable.
INVARIANTS: Anonymous users can open the site shell only; content/social/file/data links remain protected or redacted.
LAST_STABILIZED: 2026-06-26
*/

const COOKIE_NAME = 'epk_access';
const MAX_AGE_SECONDS = 60 * 60 * 12;

const PUBLIC_SHELL_PATHS = new Set([
  '/',
  '/index.html',
  '/venue',
  '/booker',
  '/acoustic',
  '/press',
  '/film',
  '/duif'
]);

const PUBLIC_ASSET_EXTENSIONS = new Set([
  '.css',
  '.js',
  '.ico',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.woff',
  '.woff2'
]);

function extensionOf(pathname) {
  const last = pathname.split('/').pop() || '';
  const dot = last.lastIndexOf('.');
  return dot === -1 ? '' : last.slice(dot).toLowerCase();
}

function isPublicShellRequest(url) {
  if (PUBLIC_SHELL_PATHS.has(url.pathname)) return true;
  return PUBLIC_ASSET_EXTENSIONS.has(extensionOf(url.pathname)) &&
    !url.pathname.startsWith('/admin/') &&
    !url.pathname.startsWith('/data/') &&
    !url.pathname.startsWith('/published/') &&
    !url.pathname.startsWith('/publisher/');
}

function isProtectedPath(pathname) {
  return pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/publisher' ||
    pathname.startsWith('/publisher/') ||
    pathname.startsWith('/data/') ||
    pathname.startsWith('/published/') ||
    pathname.startsWith('/downloads/') ||
    pathname.startsWith('/files/') ||
    pathname.endsWith('.json');
}

function redactedEpkData() {
  return {
    meta: {
      name: 'Dave Knowles',
      tagline: 'Electronic Press Kit',
      location: '',
      email: '',
      phone: '',
      website: '',
      social: {}
    },
    bio: {
      short: '',
      acoustic: '',
      full: []
    },
    modes: {
      default: {
        label: 'Public',
        hero: '',
        heroCaption: '',
        sections: [],
        offeringTags: [],
        videoTags: [],
        galleryPhotos: []
      },
      booker: {
        label: 'Venue',
        hero: '',
        heroCaption: '',
        sections: [],
        offeringTags: [],
        videoTags: [],
        galleryPhotos: []
      },
      acoustic: {
        label: 'Acoustic',
        hero: '',
        heroCaption: '',
        sections: [],
        offeringTags: [],
        videoTags: [],
        galleryPhotos: []
      },
      press: {
        label: 'Press',
        hero: '',
        heroCaption: '',
        sections: [],
        offeringTags: [],
        videoTags: [],
        galleryPhotos: []
      },
      film: {
        label: 'Film',
        hero: '',
        heroCaption: '',
        sections: [],
        offeringTags: [],
        videoTags: [],
        galleryPhotos: []
      },
      duif: {
        label: 'DUiF',
        hero: '',
        heroCaption: '',
        sections: [],
        offeringTags: [],
        videoTags: [],
        galleryPhotos: []
      }
    },
    offerings: [],
    credits: [],
    videos: [],
    releases: [],
    gallery: [],
    redacted: true,
    notice: 'Content, social links, media links, files, and publisher tools are password protected.'
  };
}

function redactedJsonResponse() {
  return new Response(JSON.stringify(redactedEpkData(), null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

function protectedResponse(request) {
  const url = new URL(request.url);
  if (url.pathname === '/data/epk.json') return redactedJsonResponse();
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/') || url.pathname === '/publisher' || url.pathname.startsWith('/publisher/') || extensionOf(url.pathname) === '.html') {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('next', url.pathname + url.search);
    return loginPage(new Request(loginUrl, request));
  }
  return new Response('This EPK content is password protected.', {
    status: 401,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function safeDecodeCookie(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.get('Cookie') || '')
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const index = part.indexOf('=');
      if (index === -1) return [part, ''];
      return [part.slice(0, index), safeDecodeCookie(part.slice(index + 1))];
    }));
}

function loginPage(request, message = '') {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/';
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>EPK Access</title>
  <style>
    :root{--bg:#f7f4ef;--card:#fffaf3;--ink:#1f2933;--muted:#68717c;--line:#dfd4c4;--accent:#4f8f73;--danger:#a33;}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top left,rgba(79,143,115,.18),transparent 34%),var(--bg);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);display:grid;place-items:center;padding:22px}.card{width:min(420px,100%);background:var(--card);border:1px solid var(--line);border-radius:22px;box-shadow:0 20px 70px rgba(31,41,51,.1);padding:24px}.kicker{margin:0 0 7px;color:var(--accent);font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}h1{margin:0 0 8px;font-size:34px;letter-spacing:-.04em}p{color:var(--muted);line-height:1.5}.error{color:var(--danger);font-weight:800}label{display:grid;gap:7px;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:16px}input{width:100%;border:1px solid var(--line);border-radius:12px;padding:12px 13px;font:inherit;background:white;color:var(--ink)}button{margin-top:14px;width:100%;border:0;border-radius:12px;background:var(--accent);color:white;font:inherit;font-weight:900;padding:12px;cursor:pointer}button:focus-visible,input:focus-visible{outline:3px solid rgba(79,143,115,.28);outline-offset:2px}.small{font-size:12px;color:var(--muted);margin-top:14px}
  </style>
</head>
<body>
  <main class="card">
    <p class="kicker">Protected EPK</p>
    <h1>Access required</h1>
    <p>Enter the EPK password to view protected content, social links, media links, files, and publisher tools.</p>
    ${message ? `<p class="error">${escapeHtml(message)}</p>` : ''}
    <form method="post" action="/__epk-login">
      <input type="hidden" name="next" value="${escapeHtml(next)}">
      <label>Password<input name="password" type="password" autocomplete="current-password" required autofocus></label>
      <button type="submit">Unlock EPK</button>
    </form>
    <p class="small">Access is stored only as a temporary browser session cookie.</p>
  </main>
</body>
</html>`, {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

async function expectedToken(env) {
  const salt = env.EPK_AUTH_SALT || 'epk-pages-gate-v1';
  return sha256Hex(`${salt}:${env.EPK_ACCESS_PASSWORD}`);
}

async function isAuthed(request, env) {
  const cookies = parseCookies(request);
  if (!cookies[COOKIE_NAME]) return false;
  return cookies[COOKIE_NAME] === await expectedToken(env);
}

async function handleLogin(request, env) {
  if (!env.EPK_ACCESS_PASSWORD) {
    return new Response('EPK password gate is not configured. Set EPK_ACCESS_PASSWORD in Cloudflare Pages environment variables.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow'
      }
    });
  }
  const form = await request.formData();
  const password = String(form.get('password') || '');
  const next = String(form.get('next') || '/');
  if (password !== env.EPK_ACCESS_PASSWORD) {
    const retry = new Request(new URL('/?next=' + encodeURIComponent(next), request.url), request);
    return loginPage(retry, 'Incorrect password.');
  }
  const token = await expectedToken(env);
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return new Response(null, {
    status: 302,
    headers: {
      'Location': safeNext,
      'Set-Cookie': `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (url.pathname === '/__epk-login') {
    if (request.method !== 'POST') return Response.redirect(new URL('/', request.url), 302);
    return handleLogin(request, env);
  }

  if (!env.EPK_ACCESS_PASSWORD) {
    return new Response('EPK password gate is not configured. Set EPK_ACCESS_PASSWORD in Cloudflare Pages environment variables.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow'
      }
    });
  }

  const authed = await isAuthed(request, env);
  if (authed) {
    const response = await next();
    const protectedResponse = new Response(response.body, response);
    protectedResponse.headers.set('Cache-Control', 'no-store');
    protectedResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return protectedResponse;
  }

  if (isPublicShellRequest(url)) {
    const response = await next();
    const publicResponse = new Response(response.body, response);
    publicResponse.headers.set('Cache-Control', 'no-store');
    publicResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return publicResponse;
  }

  if (isProtectedPath(url.pathname)) {
    return protectedResponse(request);
  }

  return protectedResponse(request);
}
