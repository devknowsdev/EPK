const PUBLIC_ENHANCEMENT_RETRIES = 80;
let publicEnhancementAttempts = 0;

document.addEventListener('DOMContentLoaded', waitForPublicEPK);

function waitForPublicEPK() {
  publicEnhancementAttempts += 1;
  if (window.EPKAdapter && document.querySelector('[data-epk-section]')) {
    applyPublicSiteTemplate();
    enhancePublicMedia();
    installContactModal();
    return;
  }
  if (publicEnhancementAttempts < PUBLIC_ENHANCEMENT_RETRIES) {
    window.setTimeout(waitForPublicEPK, 100);
  }
}

function applyPublicSiteTemplate() {
  const data = safeData();
  const modeKey = window.EPK_SITE?.mode || document.body.dataset.epkMode || 'default';
  const modeTemplate = data?.modes?.[modeKey]?.siteTemplate;
  const globalTemplate = data?.design?.siteTemplate;
  const template = modeTemplate || globalTemplate || 'forest-editorial';
  document.body.dataset.siteTemplate = template;
}

function enhancePublicMedia() {
  document.querySelectorAll('a.video-link[href]').forEach(link => {
    const href = link.getAttribute('href') || '';
    const video = parseVideoURL(href);
    if (!video || link.dataset.mediaEnhanced) return;

    link.dataset.mediaEnhanced = 'true';
    link.classList.add('media-card');
    const label = link.textContent.trim();
    const thumb = video.thumbnail
      ? `<span class="media-thumb"><img src="${escapeAttr(video.thumbnail)}" alt="${escapeAttr(label)} thumbnail"></span>`
      : `<span class="media-thumb"></span>`;
    link.innerHTML = `${thumb}<span class="media-label"><strong>${escapeHTML(label)}</strong><span class="media-platform">${escapeHTML(video.platform)}</span></span>`;
  });

  enhanceReleaseAudio();
}

function enhanceReleaseAudio() {
  const data = safeData();
  const releases = data?.releases || [];
  if (!releases.length) return;

  document.querySelectorAll('[data-epk-section="releases"] a.video-link').forEach(link => {
    if (link.dataset.audioEnhanced) return;
    const text = link.textContent.toLowerCase();
    const release = releases.find(item => text.includes(String(item.title || '').toLowerCase()));
    const audio = release?.audio || release?.audioSrc || release?.previewAudio;
    if (!audio) return;

    link.dataset.audioEnhanced = 'true';
    const wrapper = document.createElement('div');
    wrapper.className = 'release-audio';
    wrapper.innerHTML = `<span>${escapeHTML(release.title || 'Audio preview')}</span><audio controls preload="metadata" src="${escapeAttr(assetURL(audio))}"></audio>`;
    link.insertAdjacentElement('afterend', wrapper);
  });
}

function installContactModal() {
  if (document.getElementById('contact-launcher')) return;
  const data = safeData();
  const meta = data?.meta || {};
  const email = meta.email || 'dave.knowles.music@gmail.com';

  const button = document.createElement('button');
  button.id = 'contact-launcher';
  button.className = 'contact-launcher';
  button.type = 'button';
  button.textContent = 'Contact';

  const modal = document.createElement('div');
  modal.id = 'contact-modal';
  modal.className = 'contact-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="contact-card" role="dialog" aria-modal="true" aria-labelledby="contact-title">
      <div class="contact-card__head">
        <div>
          <h2 id="contact-title">Contact ${escapeHTML(meta.name || 'Dave Knowles')}</h2>
          <p>Fill in the fields and send an email enquiry. This static site opens your email app addressed to ${escapeHTML(email)}.</p>
        </div>
        <button class="contact-close" type="button" aria-label="Close contact form">Close</button>
      </div>
      <form class="contact-form" id="epk-contact-form">
        <label>Name<input id="contact-name" autocomplete="name" required></label>
        <label>Email<input id="contact-email" type="email" autocomplete="email" required></label>
        <label>Phone<input id="contact-phone" autocomplete="tel"></label>
        <label>Enquiry type<select id="contact-type"><option>Booking enquiry</option><option>Press enquiry</option><option>Film / theatre scoring</option><option>Wedding / private event</option><option>General message</option></select></label>
        <label>Date<input id="contact-date" placeholder="Event date, if relevant"></label>
        <label>Venue / City<input id="contact-venue" placeholder="Venue, city, or area"></label>
        <label class="wide">Message<textarea id="contact-message" rows="7" required placeholder="Tell Dave what you are planning, the event size, budget range if useful, and what you need."></textarea></label>
        <div class="contact-actions">
          <button class="primary" type="submit">Open email to Dave</button>
          <button type="button" id="copy-contact-message">Copy message</button>
          <a href="mailto:${escapeAttr(email)}">Email directly</a>
        </div>
        <p class="contact-note">No message is sent silently from the browser. The email opens in your mail app so you can review it before sending.</p>
      </form>
    </div>`;

  document.body.appendChild(button);
  document.body.appendChild(modal);

  button.addEventListener('click', () => {
    modal.hidden = false;
    modal.querySelector('input')?.focus();
  });
  modal.querySelector('.contact-close').addEventListener('click', () => modal.hidden = true);
  modal.addEventListener('click', event => {
    if (event.target === modal) modal.hidden = true;
  });
  modal.querySelector('#copy-contact-message').addEventListener('click', () => copyContactMessage(email));
  modal.querySelector('#epk-contact-form').addEventListener('submit', event => {
    event.preventDefault();
    const subject = encodeURIComponent(`${fieldValue('contact-type')} — ${fieldValue('contact-name') || 'EPK enquiry'}`);
    const body = encodeURIComponent(contactMessage(email));
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  });
}

async function copyContactMessage(email) {
  const message = contactMessage(email);
  try {
    await navigator.clipboard.writeText(message);
    alert('Copied contact message.');
  } catch (_) {
    alert(message);
  }
}

function contactMessage(email) {
  return [
    `To: ${email}`,
    '',
    `Name: ${fieldValue('contact-name')}`,
    `Email: ${fieldValue('contact-email')}`,
    `Phone: ${fieldValue('contact-phone')}`,
    `Type: ${fieldValue('contact-type')}`,
    `Date: ${fieldValue('contact-date')}`,
    `Venue / City: ${fieldValue('contact-venue')}`,
    '',
    fieldValue('contact-message')
  ].join('\n');
}

function fieldValue(id) {
  return document.getElementById(id)?.value.trim() || '';
}

function safeData() {
  try {
    return window.EPKAdapter?.getData?.() || null;
  } catch (_) {
    return null;
  }
}

function parseVideoURL(url) {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (youtube) {
    return {
      platform: 'YouTube',
      id: youtube[1],
      thumbnail: `https://img.youtube.com/vi/${youtube[1]}/hqdefault.jpg`
    };
  }
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) {
    return { platform: 'Vimeo', id: vimeo[1], thumbnail: '' };
  }
  return null;
}

function assetURL(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `/${String(path).replace(/^\/+/, '')}`;
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return escapeHTML(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}