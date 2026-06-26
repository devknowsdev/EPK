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

let contactContext = null;

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
  if (/^tel:/i.test(raw)) return raw;
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

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function whatsappPhone(value) {
  let digits = digitsOnly(value);
  if (!digits) return '';
  if (digits.startsWith('0')) digits = `27${digits.slice(1)}`;
  return digits;
}

function defaultContactMessage() {
  const name = contactContext?.name || 'Dave';
  const modeLabel = contactContext?.modeLabel || modeKey;
  const online = contactContext?.onlineUrl || location.href.split('?')[0];

  return `Hi ${name},

I saw your ${modeLabel} EPK and would like to enquire about availability / booking / collaboration.

EPK link: ${online}

Thanks`;
}

function whatsappURL(message) {
  const phone = whatsappPhone(contactContext?.phone || '');
  if (!phone) return '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(message || defaultContactMessage())}`;
}

function linkHTML(url, label = 'Open link') {
  const resolved = href(url);
  return resolved
    ? `<a class="client-link" href="${esc(resolved)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`
    : '';
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
    return bio.full.map(String).join('');
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
  const whats = whatsappURL(defaultContactMessage());

  const rows = [
    `<a href="${esc(onlineEPK)}" target="_blank" rel="noopener">Full online EPK</a>`,
    meta.email ? `<button class="client-contact-link" type="button" onclick="openContactBox()">Email enquiry</button>` : '',
    whats ? `<a href="${esc(whats)}" target="_blank" rel="noopener">WhatsApp enquiry</a>` : '',
    meta.email ? `<button class="client-contact-link" type="button" onclick="copyContactEmail()">${esc(meta.email)}</button>` : '',
    meta.phone ? `<a href="tel:${esc(digitsOnly(meta.phone))}">${esc(meta.phone)}</a>` : '',
    meta.website ? `<a href="${esc(href(meta.website))}" target="_blank" rel="noopener">Website</a>` : '',
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

function renderContactBox() {
  const message = esc(defaultContactMessage());

  return `
    <div id="client-contact-box" class="client-contact-box hidden" aria-hidden="true">
      <div class="client-contact-box__panel" role="dialog" aria-label="Contact Dave Knowles">
        <button class="client-contact-box__close" type="button" onclick="closeContactBox()">×</button>
        <span class="client-label">Contact</span>
        <h2>Send an enquiry</h2>
        <p>Edit the message, then send it directly from this page. WhatsApp remains available as a fallback.</p>

        <label class="client-contact-field">Your name
          <input id="client-contact-name" autocomplete="name" placeholder="Optional">
        </label>

        <label class="client-contact-field">Your email
          <input id="client-contact-email" autocomplete="email" inputmode="email" placeholder="Optional, for replies">
        </label>

        <label class="client-contact-field client-honeypot">Company
          <input id="client-contact-company" tabindex="-1" autocomplete="off">
        </label>

        <textarea id="client-contact-message" rows="8">${message}</textarea>

        <div class="client-contact-box__actions">
          <button class="client-button" type="button" onclick="sendEmail()" id="client-send-message">Send message</button>
          <button class="client-button" type="button" onclick="sendWhatsApp()">Open WhatsApp</button>
        </div>

        <div id="client-contact-status" class="client-contact-status" aria-live="polite"></div>
      </div>
    </div>
  `;
}

function openContactBox() {
  const box = document.getElementById('client-contact-box');
  if (!box) return;
  box.classList.remove('hidden');
  box.setAttribute('aria-hidden', 'false');
  document.getElementById('client-contact-message')?.focus();
}

function closeContactBox() {
  const box = document.getElementById('client-contact-box');
  if (!box) return;
  box.classList.add('hidden');
  box.setAttribute('aria-hidden', 'true');
}

function contactStatus(message, type = '') {
  const el = document.getElementById('client-contact-status');
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
}

async function sendEmail() {
  const message = document.getElementById('client-contact-message')?.value || defaultContactMessage();
  const name = document.getElementById('client-contact-name')?.value || '';
  const email = document.getElementById('client-contact-email')?.value || '';
  const company = document.getElementById('client-contact-company')?.value || '';
  const button = document.getElementById('client-send-message');

  if (button) {
    button.disabled = true;
    button.textContent = 'Sending…';
  }

  contactStatus('Sending message…', 'loading');

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        company,
        message,
        page: contactContext?.onlineUrl || location.href,
        mode: contactContext?.modeLabel || modeKey
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Message could not be sent.');
    }

    contactStatus('Message sent. Thank you — Dave will receive this by email.', 'success');
  } catch (error) {
    contactStatus(`${error.message} WhatsApp is still available as a fallback.`, 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Send message';
    }
  }
}

function sendWhatsApp() {
  const message = document.getElementById('client-contact-message')?.value || defaultContactMessage();
  const url = whatsappURL(message);
  if (url) window.open(url, '_blank', 'noopener');
}

function copyContactEmail() {
  const email = contactContext?.email || '';
  if (!email) return;

  navigator.clipboard?.writeText(email);
  contactStatus('Email address copied.', 'success');
}

window.openContactBox = openContactBox;
window.closeContactBox = closeContactBox;
window.sendEmail = sendEmail;
window.sendWhatsApp = sendWhatsApp;
window.copyContactEmail = copyContactEmail;

function render(epk) {
  const mode = activeMode(epk);
  const meta = epk.meta || {};
  const onlineUrl = routeURL(modeKey);

  contactContext = {
    name: meta.name || 'Dave',
    modeLabel: mode.label || modeKey,
    email: meta.email || '',
    phone: meta.phone || '',
    onlineUrl
  };

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
          <a class="client-button" href="${esc(onlineUrl)}" target="_blank" rel="noopener">Open online EPK ↗</a>
          <button class="client-button" type="button" onclick="openContactBox()">Contact</button>
        </div>
      </div>
      ${mode.hero ? `<img class="client-hero-img" src="${esc(assetURL(mode.hero))}" alt="${esc(meta.name || 'EPK hero')}">` : ''}
    </header>
    <main class="client-content">${sectionHTML}</main>
    <footer class="client-footer">${esc(meta.name || 'Dave Knowles')} · ${esc(meta.location || '')}</footer>
    ${renderContactBox()}
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
EOFcat > EPK/public/print.js <<'EOF'
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

let contactContext = null;

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
  if (/^tel:/i.test(raw)) return raw;
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

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function whatsappPhone(value) {
  let digits = digitsOnly(value);
  if (!digits) return '';
  if (digits.startsWith('0')) digits = `27${digits.slice(1)}`;
  return digits;
}

function defaultContactMessage() {
  const name = contactContext?.name || 'Dave';
  const modeLabel = contactContext?.modeLabel || modeKey;
  const online = contactContext?.onlineUrl || location.href.split('?')[0];

  return `Hi ${name},

I saw your ${modeLabel} EPK and would like to enquire about availability / booking / collaboration.

EPK link: ${online}

Thanks`;
}

function whatsappURL(message) {
  const phone = whatsappPhone(contactContext?.phone || '');
  if (!phone) return '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(message || defaultContactMessage())}`;
}

function linkHTML(url, label = 'Open link') {
  const resolved = href(url);
  return resolved
    ? `<a class="client-link" href="${esc(resolved)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`
    : '';
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
    return bio.full.map(String).join('');
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
  const whats = whatsappURL(defaultContactMessage());

  const rows = [
    `<a href="${esc(onlineEPK)}" target="_blank" rel="noopener">Full online EPK</a>`,
    meta.email ? `<button class="client-contact-link" type="button" onclick="openContactBox()">Email enquiry</button>` : '',
    whats ? `<a href="${esc(whats)}" target="_blank" rel="noopener">WhatsApp enquiry</a>` : '',
    meta.email ? `<button class="client-contact-link" type="button" onclick="copyContactEmail()">${esc(meta.email)}</button>` : '',
    meta.phone ? `<a href="tel:${esc(digitsOnly(meta.phone))}">${esc(meta.phone)}</a>` : '',
    meta.website ? `<a href="${esc(href(meta.website))}" target="_blank" rel="noopener">Website</a>` : '',
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

function renderContactBox() {
  const message = esc(defaultContactMessage());

  return `
    <div id="client-contact-box" class="client-contact-box hidden" aria-hidden="true">
      <div class="client-contact-box__panel" role="dialog" aria-label="Contact Dave Knowles">
        <button class="client-contact-box__close" type="button" onclick="closeContactBox()">×</button>
        <span class="client-label">Contact</span>
        <h2>Send an enquiry</h2>
        <p>Edit the message, then send it directly from this page. WhatsApp remains available as a fallback.</p>

        <label class="client-contact-field">Your name
          <input id="client-contact-name" autocomplete="name" placeholder="Optional">
        </label>

        <label class="client-contact-field">Your email
          <input id="client-contact-email" autocomplete="email" inputmode="email" placeholder="Optional, for replies">
        </label>

        <label class="client-contact-field client-honeypot">Company
          <input id="client-contact-company" tabindex="-1" autocomplete="off">
        </label>

        <textarea id="client-contact-message" rows="8">${message}</textarea>

        <div class="client-contact-box__actions">
          <button class="client-button" type="button" onclick="sendEmail()" id="client-send-message">Send message</button>
          <button class="client-button" type="button" onclick="sendWhatsApp()">Open WhatsApp</button>
        </div>

        <div id="client-contact-status" class="client-contact-status" aria-live="polite"></div>
      </div>
    </div>
  `;
}

function openContactBox() {
  const box = document.getElementById('client-contact-box');
  if (!box) return;
  box.classList.remove('hidden');
  box.setAttribute('aria-hidden', 'false');
  document.getElementById('client-contact-message')?.focus();
}

function closeContactBox() {
  const box = document.getElementById('client-contact-box');
  if (!box) return;
  box.classList.add('hidden');
  box.setAttribute('aria-hidden', 'true');
}

function contactStatus(message, type = '') {
  const el = document.getElementById('client-contact-status');
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
}

async function sendEmail() {
  const message = document.getElementById('client-contact-message')?.value || defaultContactMessage();
  const name = document.getElementById('client-contact-name')?.value || '';
  const email = document.getElementById('client-contact-email')?.value || '';
  const company = document.getElementById('client-contact-company')?.value || '';
  const button = document.getElementById('client-send-message');

  if (button) {
    button.disabled = true;
    button.textContent = 'Sending…';
  }

  contactStatus('Sending message…', 'loading');

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        company,
        message,
        page: contactContext?.onlineUrl || location.href,
        mode: contactContext?.modeLabel || modeKey
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Message could not be sent.');
    }

    contactStatus('Message sent. Thank you — Dave will receive this by email.', 'success');
  } catch (error) {
    contactStatus(`${error.message} WhatsApp is still available as a fallback.`, 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Send message';
    }
  }
}

function sendWhatsApp() {
  const message = document.getElementById('client-contact-message')?.value || defaultContactMessage();
  const url = whatsappURL(message);
  if (url) window.open(url, '_blank', 'noopener');
}

function copyContactEmail() {
  const email = contactContext?.email || '';
  if (!email) return;

  navigator.clipboard?.writeText(email);
  contactStatus('Email address copied.', 'success');
}

window.openContactBox = openContactBox;
window.closeContactBox = closeContactBox;
window.sendEmail = sendEmail;
window.sendWhatsApp = sendWhatsApp;
window.copyContactEmail = copyContactEmail;

function render(epk) {
  const mode = activeMode(epk);
  const meta = epk.meta || {};
  const onlineUrl = routeURL(modeKey);

  contactContext = {
    name: meta.name || 'Dave',
    modeLabel: mode.label || modeKey,
    email: meta.email || '',
    phone: meta.phone || '',
    onlineUrl
  };

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
          <a class="client-button" href="${esc(onlineUrl)}" target="_blank" rel="noopener">Open online EPK ↗</a>
          <button class="client-button" type="button" onclick="openContactBox()">Contact</button>
        </div>
      </div>
      ${mode.hero ? `<img class="client-hero-img" src="${esc(assetURL(mode.hero))}" alt="${esc(meta.name || 'EPK hero')}">` : ''}
    </header>
    <main class="client-content">${sectionHTML}</main>
    <footer class="client-footer">${esc(meta.name || 'Dave Knowles')} · ${esc(meta.location || '')}</footer>
    ${renderContactBox()}
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
