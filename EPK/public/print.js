const app = document.getElementById('print-app');
const params = new URLSearchParams(location.search);

const modeKey = params.get('for') || 'default';
const shouldPrint = params.get('print') === '1';
const fromSnapshot = params.get('snapshot') === '1';

const publication = {
  purpose: params.get('purpose') || '',
  recipient: params.get('recipient') || '',
  id: params.get('id') || '',
  notes: params.get('notes') || ''
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char]));
}

function assetURL(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return new URL(String(path).replace(/^\/+/, ''), location.href).href;
}

async function loadData() {
  if (fromSnapshot) {
    const raw = sessionStorage.getItem('epk-print-snapshot');
    if (raw) return JSON.parse(raw);
  }

  const res = await fetch('data/epk.json');
  if (!res.ok) throw new Error(`Failed to load data/epk.json`);
  return await res.json();
}

function selectedMode(epk) {
  return epk.modes?.[modeKey] || epk.modes?.default || {};
}

function bioHTML(epk, mode) {
  const style = mode.bioStyle || 'short';
  const bio = epk.bio || {};

  if (style === 'full' && Array.isArray(bio.full)) {
    return bio.full.map(p => `<p>${esc(p)}</p>`).join('');
  }

  return `<p>${esc(bio[style] || bio.short || '')}</p>`;
}

function hasAny(values) {
  return values.some(Boolean);
}

function renderContact(meta) {
  const social = meta.social || {};
  const links = [
    meta.email ? `<a href="mailto:${esc(meta.email)}">${esc(meta.email)}</a>` : '',
    meta.phone ? `<a href="tel:${esc(meta.phone)}">${esc(meta.phone)}</a>` : '',
    meta.website ? `<a href="${esc(meta.website)}">${esc(meta.website)}</a>` : '',
    ...Object.entries(social).filter(([, url]) => url).map(([name, url]) => `<a href="${esc(url)}">${esc(name)}</a>`)
  ].filter(Boolean);

  if (!links.length) return '';

  return `<section class="print-section print-links"><h2>Contact & links</h2>${links.map(link => `<p>${link}</p>`).join('')}</section>`;
}

function renderCards(title, items, linkKey = 'url') {
  if (!items.length) return '';
  return `<section class="print-section"><h2>${esc(title)}</h2><div class="print-grid">${items.map(item => {
    const label = item.title || item.role || 'Untitled';
    const desc = item.description || '';
    const href = item[linkKey] || item.link || item.url || '';
    return `<article class="print-card"><h3>${esc(label)}</h3>${desc ? `<p>${esc(desc)}</p>` : ''}${href ? `<p><a href="${esc(href)}">${esc(href)}</a></p>` : ''}</article>`;
  }).join('')}</div></section>`;
}

function renderGallery(epk, mode) {
  const srcs = mode.galleryPhotos || [];
  if (!srcs.length) return '';
  const lookup = Object.fromEntries((epk.gallery || []).map(photo => [photo.src, photo]));
  const photos = srcs.map(src => lookup[src] || { src, caption: '' }).slice(0, 9);

  return `<section class="print-section"><h2>Selected images</h2><div class="print-gallery">${photos.map(photo => `<img src="${assetURL(photo.src)}" alt="${esc(photo.caption || epk.meta?.name || 'EPK image')}">`).join('')}</div></section>`;
}

function renderPublicationNotes() {
  if (!hasAny([publication.purpose, publication.recipient, publication.id, publication.notes])) return '';

  return `<section class="print-section"><h2>Publication info</h2><div class="print-notes">${publication.purpose ? `<p><strong>Purpose:</strong> ${esc(publication.purpose)}</p>` : ''}${publication.recipient ? `<p><strong>Recipient:</strong> ${esc(publication.recipient)}</p>` : ''}${publication.id ? `<p><strong>ID:</strong> ${esc(publication.id)}</p>` : ''}${publication.notes ? `<p><strong>Notes:</strong> ${esc(publication.notes)}</p>` : ''}</div></section>`;
}

function render(epk) {
  const mode = selectedMode(epk);
  const meta = epk.meta || {};

  const offerings = (epk.offerings || []).filter(item =>
    !mode.offeringTags?.length || (item.tags || []).some(tag => mode.offeringTags.includes(tag))
  );

  const videos = (epk.videos || []).filter(item =>
    !mode.videoTags?.length || (item.tags || []).some(tag => mode.videoTags.includes(tag))
  );

  const credits = (epk.credits || []).filter(item =>
    (item.tags || []).some(tag => ['film', 'press', modeKey].includes(tag))
  );

  app.innerHTML = `
    <header class="print-cover">
      <div>
        <div class="print-kicker">${esc(mode.label || modeKey)} EPK</div>
        <h1 class="print-title">${esc(meta.name || 'EPK')}</h1>
        <p class="print-tagline">${esc(meta.tagline || '')}</p>
        <div class="print-meta">
          ${meta.location ? `<span class="print-chip">${esc(meta.location)}</span>` : ''}
          ${publication.purpose ? `<span class="print-chip">${esc(publication.purpose)}</span>` : ''}
          ${publication.recipient ? `<span class="print-chip">${esc(publication.recipient)}</span>` : ''}
        </div>
      </div>
      ${mode.hero ? `<img class="print-hero" src="${assetURL(mode.hero)}" alt="${esc(meta.name || 'EPK hero')}">` : ''}
    </header>
    ${renderPublicationNotes()}
    <section class="print-section"><h2>Biography</h2>${bioHTML(epk, mode)}</section>
    ${renderCards('Offerings', offerings)}
    ${renderCards('Videos', videos)}
    ${renderCards('Selected credits', credits, 'link')}
    ${renderCards('Releases', epk.releases || [])}
    ${renderGallery(epk, mode)}
    ${renderContact(meta)}
  `;
}

loadData()
  .then(data => {
    render(data);
    if (shouldPrint) {
      setTimeout(() => window.print(), 450);
    }
  })
  .catch(error => {
    console.error(error);
    app.innerHTML = `<p>Failed to load printable EPK: ${esc(error.message)}</p>`;
  });
