const app = document.getElementById('print-app');
const params = new URLSearchParams(location.search);

const modeKey = params.get('for') || 'default';
const shouldPrint = params.get('print') === '1';
const snapshotKey = params.get('snapshotKey') || '';

const ROUTES = {
  default: './',
  booker: 'venue',
  acoustic: 'acoustic',
  press: 'press',
  film: 'film',
  duif: 'duif'
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char]));
}

function href(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^(mailto:|tel:)/i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return new URL(raw.replace(/^\/+/, ''), location.href).href;
}

function assetURL(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(String(path).replace(/^\/+/, ''), location.href).href;
}

function routeURL(key) {
  return new URL(ROUTES[key] || './', location.href).href;
}

function linkHTML(url, label = 'Open link') {
  const resolved = href(url);
  return resolved ? `<a class="client-link" href="${esc(resolved)}" target="_blank" rel="noopener">${esc(label)} ↗</a>` : '';
}

function youtubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.split('/').filter(Boolean)[0] || '';
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') || (u.pathname.match(/\/(?:embed|shorts)\/([^/?#]+)/) || [])[1] || '';
    }
  } catch {}
  const match = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?#/]+)/);
  return match ? match[1] : '';
}

function videoThumb(video) {
  const manual = video.thumbnail || video.thumb || video.image || video.poster || '';
  if (manual) return assetURL(manual);
  const id = youtubeId(video.url || video.link || '');
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

async function loadData() {
  if (snapshotKey) {
    const raw = localStorage.getItem(`epk-print-snapshot:${snapshotKey}`);
    if (raw) return JSON.parse(raw);
  }

  const res = await fetch('data/epk.json');
  if (!res.ok) throw new Error('Failed to load data/epk.json');
  return await res.json();
}

function activeMode(epk) {
  return epk.modes?.[modeKey] || epk.modes?.default || {};
}

function selectedByTags(items, tags = []) {
  if (!tags.length) return items || [];
  return (items || []).filter(item => (item.tags || []).some(tag => tags.includes(tag)));
}

function bioHTML(epk, mode) {
  const style = mode.bioStyle || 'short';
  const bio = epk.bio || {};

  if (style === 'full' && Array.isArray(bio.full)) {
    return bio.full.map(p => `<p>${esc(p)}</p>`).join('');
  }

  return `<p>${esc(bio[style] || bio.short || '')}</p>`;
}

function renderCards(title, items, linkKey = 'url') {
  if (!items?.length) return '';

  return `
    <section class="client-section">
      <span class="client-label">${esc(title)}</span>
      <div class="client-grid">
        ${items.map(item => {
          const label = item.title || item.role || 'Untitled';
          const desc = item.description || '';
          const url = item[linkKey] || item.link || item.url || '';
          return `
            <article class="client-card">
              <h3>${esc(label)}</h3>
              ${desc ? `<p>${esc(desc)}</p>` : ''}
              <div class="client-link-row">${linkHTML(url)}</div>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderVideos(items) {
  if (!items?.length) return '';

  return `
    <section class="client-section">
      <span class="client-label">Videos</span>
      <div class="client-grid">
        ${items.map(video => {
          const thumb = videoThumb(video);
          const url = video.url || video.link || '';
          return `
            <article class="client-card client-video-card">
              ${thumb ? `<img class="client-video-thumb" src="${esc(thumb)}" alt="">` : `<div class="client-video-fallback">▶</div>`}
              <div>
                <h3>${esc(video.title || 'Video')}</h3>
                ${video.description ? `<p>${esc(video.description)}</p>` : ''}
                <div class="client-link-row">${linkHTML(url, 'Watch online')}</div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderCredits(items) {
  if (!items?.length) return '';

  return `
    <section class="client-section">
      <span class="client-label">Selected credits</span>
      ${items.map(item => `
        <article class="client-credit">
          <div>
            <div class="client-credit-meta">${esc(item.year || '')}</div>
            <div class="client-credit-role">${esc(item.role || '')}</div>
          </div>
          <div>
            <h3>${item.link ? `<a class="client-link" href="${esc(href(item.link))}" target="_blank" rel="noopener">${esc(item.title || 'Credit')} ↗</a>` : esc(item.title || 'Credit')}</h3>
            ${item.description ? `<p>${esc(item.description)}</p>` : ''}
          </div>
        </article>
      `).join('')}
    </section>
  `;
}

function renderGallery(epk, mode) {
  const srcs = mode.galleryPhotos || [];
  if (!srcs.length) return '';

  const lookup = Object.fromEntries((epk.gallery || []).map(photo => [photo.src, photo]));
  const photos = srcs.map(src => lookup[src] || { src, caption: '' }).slice(0, 9);

  return `
    <section class="client-section">
      <span class="client-label">Selected images</span>
      <div class="client-gallery">
        ${photos.map(photo => {
          const src = assetURL(photo.src);
          return `<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="${esc(photo.caption || epk.meta?.name || 'EPK image')}"></a>`;
        }).join('')}
      </div>
    </section>
  `;
}

function renderContact(meta) {
  const social = meta.social || {};
  const onlineEPK = routeURL(modeKey);
  const rows = [
    `<a href="${esc(onlineEPK)}" target="_blank" rel="noopener">Full online EPK</a>`,
    meta.email ? `<button class="client-contact-link" type="button" onclick="copyContactEmail()">${esc(meta.email)}</button>` : '',
    meta.phone ? `<a href="tel:${esc(meta.phone)}">${esc(meta.phone)}</a>` : '',
    meta.website ? `<a href="${esc(href(meta.website))}" target="_blank" rel="noopener">${esc(meta.website)}</a>` : '',
    ...Object.entries(social)
      .filter(([, url]) => url)
      .map(([name, url]) => `<a href="${esc(href(url))}" target="_blank" rel="noopener">${esc(name)}</a>`)
  ].filter(Boolean);

  if (!rows.length) return '';

  return `
    <section class="client-section">
      <span class="client-label">Contact & links</span>
      <div class="client-contact">${rows.map(row => `<p>${row}</p>`).join('')}</div>
    </section>
  `;
}

function render(epk) {
  const mode = activeMode(epk);
  const meta = epk.meta || {};
  const sections = mode.sections || ['bio', 'offerings', 'videos', 'releases', 'credits', 'gallery', 'contact'];

  const sectionHTML = sections.map(section => {
    if (section === 'bio') {
      return `<section class="client-section"><span class="client-label">Biography</span><div class="client-bio">${bioHTML(epk, mode)}</div></section>`;
    }

    if (section === 'offerings') {
      return renderCards('Offerings', selectedByTags(epk.offerings || [], mode.offeringTags || []));
    }

    if (section === 'videos') {
      return renderVideos(selectedByTags(epk.videos || [], mode.videoTags || []));
    }

    if (section === 'releases') {
      return renderCards('Releases', epk.releases || []);
    }

    if (section === 'credits') {
      const credits = (epk.credits || []).filter(item => (item.tags || []).some(tag => ['film', 'press', modeKey].includes(tag)));
      return renderCredits(credits);
    }

    if (section === 'gallery') {
      return renderGallery(epk, mode);
    }

    if (section === 'contact') {
      return renderContact(meta);
    }

    return '';
  }).join('');

  app.className = 'client-shell';
  app.innerHTML = `
    <header class="client-hero">
      <div>
        <span class="client-kicker">${esc(mode.label || modeKey)} EPK</span>
        <h1 class="client-title">${esc(meta.name || 'Dave Knowles')}</h1>
        <p class="client-tagline">${esc(meta.tagline || '')}</p>
        <div class="client-actions">
          <a class="client-button" href="${esc(routeURL(modeKey))}" target="_blank" rel="noopener">Open live page ↗</a>
          ${meta.email ? `<button class="client-button" type="button" onclick="openContactBox()">Contact</button>` : ''}
        </div>
      </div>
      ${mode.hero ? `<img class="client-hero-img" src="${esc(assetURL(mode.hero))}" alt="${esc(meta.name || 'EPK hero')}">` : ''}
    </header>
    <main class="client-content">${sectionHTML}</main>
    <footer class="client-footer">${esc(meta.name || 'Dave Knowles')} · ${esc(meta.location || '')}</footer>
  `;
}

loadData()
  .then(data => {
    render(data);
    if (shouldPrint) setTimeout(() => window.print(), 500);
  })
  .catch(error => {
    console.error(error);
    app.innerHTML = `<p style="padding:32px">Failed to load printable EPK: ${esc(error.message)}</p>`;
  });


function copyContactEmail() {
  const email = contactContext?.email || '';
  if (!email) return;
  navigator.clipboard?.writeText(email);
  const status = document.getElementById('client-contact-status');
  if (status) {
    status.textContent = 'Email address copied.';
    status.dataset.type = 'success';
  }
}


function openContactBox() {
  const box = document.getElementById('client-contact-box');
  if (!box) return;
  box.classList.remove('hidden');
  box.setAttribute('aria-hidden', 'false');
  document.getElementById('client-contact-message')?.focus();
}
