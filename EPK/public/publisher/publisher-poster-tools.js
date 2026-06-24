let epkPosterGalleryImage = null;
let epkPosterGalleryImagePath = '';

function renderMediaTools() {
  enhanceVideoSectionPreviews();
  enhanceReleaseSectionAudio();
}

function enhanceVideoSectionPreviews() {
  const cards = document.querySelectorAll('#videos-list .item-card');
  cards.forEach((card, index) => {
    const video = currentData?.videos?.[index];
    if (!video) return;
    card.querySelector('.inline-media-preview')?.remove();
    const parsed = parseVideoURL(video.url || '');
    const thumb = parsed?.thumbnail ? `<img src="${safeAttr(parsed.thumbnail)}" alt="${safeAttr(video.title || 'Video')} thumbnail">` : '';
    const preview = document.createElement('details');
    preview.className = 'inline-media-preview';
    preview.innerHTML = `
      <summary>Preview linked video</summary>
      <div class="media-preview-card compact">
        <div class="media-preview-thumb">${thumb}</div>
        <div>
          <h4>${safe(video.title || 'Untitled video')}</h4>
          <p class="help">${safe(parsed?.platform || 'Media link')} · ${(video.tags || []).map(safe).join(', ')}</p>
          <a class="btn btn-sm" href="${safeAttr(video.url || '#')}" target="_blank" rel="noopener">Open video</a>
        </div>
      </div>`;
    const fields = card.querySelector('.form-grid') || card;
    fields.insertAdjacentElement('afterend', preview);
  });
}

function enhanceReleaseSectionAudio() {
  const cards = document.querySelectorAll('#releases-list .item-card');
  cards.forEach((card, index) => {
    const release = currentData?.releases?.[index];
    if (!release) return;
    card.querySelector('.inline-audio-preview')?.remove();
    const audio = release.audio || release.audioSrc || release.previewAudio || '';
    const preview = document.createElement('details');
    preview.className = 'inline-audio-preview';
    preview.innerHTML = `
      <summary>Preview / attach audio scrubber</summary>
      <div class="section-audio-tool">
        <label>Audio preview path<input value="${safeAttr(audio)}" placeholder="audio/track.mp3" data-section-audio-index="${index}"></label>
        ${audio ? `<audio controls preload="metadata" src="${safeAttr(localAssetURL(audio))}"></audio>` : '<p class="help">Add a same-origin audio path to show a public scrubber for this release.</p>'}
      </div>`;
    const fields = card.querySelector('.form-grid') || card;
    fields.insertAdjacentElement('afterend', preview);
  });

  document.querySelectorAll('[data-section-audio-index]').forEach(input => {
    input.onchange = () => {
      const release = currentData.releases[Number(input.dataset.sectionAudioIndex)];
      release.audioSrc = input.value.trim();
      if (typeof markDirty === 'function') markDirty('Release audio preview updated');
      if (typeof renderJSON === 'function') renderJSON(false);
      enhanceReleaseSectionAudio();
    };
  });
}

function bindPosterTools() {
  const templateSelect = document.getElementById('epk-poster-template');
  if (templateSelect) {
    templateSelect.onchange = () => {
      if (typeof applyEPKTemplate === 'function') applyEPKTemplate(templateSelect.value);
      else drawPosterPreview();
    };
  }

  ['epk-poster-mode', 'epk-poster-gallery-image', 'epk-poster-title', 'epk-poster-date', 'epk-poster-venue', 'epk-poster-doors', 'epk-poster-other', 'epk-poster-cta', 'epk-poster-extra'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.oninput = drawPosterPreview;
      el.onchange = drawPosterPreview;
    }
  });
  const logo = document.getElementById('epk-poster-logo');
  if (logo) logo.onchange = loadPosterLogo;
  const refresh = document.getElementById('epk-poster-refresh');
  if (refresh) refresh.onclick = drawPosterPreview;
  const download = document.getElementById('epk-poster-download');
  if (download) download.onclick = downloadPosterPNG;
  const copy = document.getElementById('epk-poster-copy');
  if (copy) copy.onclick = copyPosterBrief;
  ['epk-contact-name', 'epk-contact-email', 'epk-contact-date', 'epk-contact-venue', 'epk-contact-message'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = updateContactPreview;
  });
  const contactCopy = document.getElementById('epk-contact-copy');
  if (contactCopy) contactCopy.onclick = copyContactPreview;
}

function drawPosterPreview() {
  const templateSelect = document.getElementById('epk-poster-template');
  const modeSelect = document.getElementById('epk-poster-mode');
  const gallerySelect = document.getElementById('epk-poster-gallery-image');
  if (!templateSelect || !modeSelect || typeof currentData === 'undefined' || !currentData) return;

  if (!templateSelect.options.length) {
    templateSelect.innerHTML = (window.EPK_POSTER_TEMPLATES || EPK_TEMPLATES).map(t => `<option value="${safeAttr(t[0])}">${safe(t[1])}</option>`).join('');
  }
  if (!modeSelect.options.length) {
    modeSelect.innerHTML = Object.entries(currentData.modes || {}).map(([key, mode]) => `<option value="${safeAttr(key)}">${safe(mode.label || key)}</option>`).join('');
  }
  if (gallerySelect) renderPosterGalleryOptions(gallerySelect);

  const selectedTemplate = currentData.design?.posterTemplate || templateSelect.value || 'acoustic-earth';
  templateSelect.value = selectedTemplate;
  modeSelect.value ||= 'booker';

  const selectedGallery = gallerySelect?.value || '';
  if (selectedGallery && selectedGallery !== epkPosterGalleryImagePath) loadPosterGalleryImage(selectedGallery);
  if (!selectedGallery) {
    epkPosterGalleryImagePath = '';
    epkPosterGalleryImage = null;
  }

  const canvas = document.getElementById('epk-poster-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const templates = window.EPK_POSTER_TEMPLATES || EPK_TEMPLATES;
  const template = templates.find(t => t[0] === templateSelect.value) || templates[0];
  const mode = currentData.modes?.[modeSelect.value] || currentData.modes?.default || {};
  const title = readField('epk-poster-title') || `${currentData.meta?.name || 'Dave Knowles'} Live`;
  const date = readField('epk-poster-date') || 'Date TBC';
  const venue = readField('epk-poster-venue') || 'Venue TBC';
  const doors = readField('epk-poster-doors') || 'Doors TBC';
  const other = readField('epk-poster-other');
  const cta = readField('epk-poster-cta') || currentData.meta?.website || '';
  const extra = readField('epk-poster-extra') || mode.heroCaption || currentData.meta?.tagline || '';

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, template[4]);
  gradient.addColorStop(1, template[5]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (epkPosterGalleryImage) {
    drawImageCover(ctx, epkPosterGalleryImage, 70, 70, canvas.width - 140, 720);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(70, 70, canvas.width - 140, 720);
  }

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = template[6];
  ctx.beginPath();
  ctx.arc(230, 220, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(980, 1320, 360, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = template[6];
  ctx.lineWidth = 6;
  ctx.strokeRect(70, 70, canvas.width - 140, canvas.height - 140);

  ctx.fillStyle = template[6];
  ctx.font = '36px Helvetica, Arial, sans-serif';
  ctx.fillText(String(template[2]).toUpperCase(), 95, 140);

  ctx.fillStyle = '#F4F0E7';
  ctx.font = '112px Georgia, Times New Roman, serif';
  wrapPosterText(ctx, title, 95, 305, 940, 112, 4);

  ctx.fillStyle = template[6];
  ctx.font = '42px Helvetica, Arial, sans-serif';
  ctx.fillText(date.toUpperCase(), 95, 760);

  ctx.fillStyle = '#F4F0E7';
  ctx.font = '58px Georgia, Times New Roman, serif';
  wrapPosterText(ctx, venue, 95, 840, 900, 64, 2);

  ctx.fillStyle = template[6];
  ctx.font = '34px Helvetica, Arial, sans-serif';
  ctx.fillText(doors.toUpperCase(), 95, 1010);

  ctx.fillStyle = '#F4F0E7';
  ctx.font = '34px Helvetica, Arial, sans-serif';
  if (other) ctx.fillText(`WITH ${other.toUpperCase()}`, 95, 1070);
  ctx.font = '32px Helvetica, Arial, sans-serif';
  wrapPosterText(ctx, extra, 95, 1160, 900, 42, 4);

  ctx.fillStyle = template[6];
  ctx.font = '30px Helvetica, Arial, sans-serif';
  wrapPosterText(ctx, cta, 95, 1450, 880, 36, 2);

  ctx.fillStyle = '#F4F0E7';
  ctx.font = '28px Helvetica, Arial, sans-serif';
  ctx.fillText(currentData.meta?.name || 'Dave Knowles', 95, 1535);

  if (epkPosterLogo) ctx.drawImage(epkPosterLogo, canvas.width - 270, canvas.height - 275, 180, 180);
  updateContactPreview();
}

function renderPosterGalleryOptions(select) {
  const existing = select.value;
  const options = ['<option value="">No gallery image / graphic poster</option>'].concat((currentData.gallery || []).map(photo => `<option value="${safeAttr(photo.src || '')}">${safe(photo.caption || photo.src || 'Gallery image')}</option>`));
  select.innerHTML = options.join('');
  if ([...select.options].some(option => option.value === existing)) select.value = existing;
}

function loadPosterGalleryImage(path) {
  epkPosterGalleryImagePath = path;
  epkPosterGalleryImage = null;
  const image = new Image();
  image.onload = () => {
    epkPosterGalleryImage = image;
    drawPosterPreview();
  };
  image.onerror = () => {
    epkPosterGalleryImage = null;
  };
  image.src = localAssetURL(path);
}

function drawImageCover(ctx, image, x, y, width, height) {
  const ratio = Math.max(width / image.width, height / image.height);
  const scaledWidth = image.width * ratio;
  const scaledHeight = image.height * ratio;
  const offsetX = x + (width - scaledWidth) / 2;
  const offsetY = y + (height - scaledHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);
}

function wrapPosterText(ctx, text, x, y, width, lineHeight, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let line = '';
  let lines = 0;
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > width && line) {
      if (lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
      line = word;
      lines += 1;
    } else {
      line = test;
    }
  });
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
}

function loadPosterLogo(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      epkPosterLogo = image;
      drawPosterPreview();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function downloadPosterPNG() {
  const canvas = document.getElementById('epk-poster-canvas');
  if (!canvas) return;
  canvas.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dave-knowles-poster.png';
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}

async function copyPosterBrief() {
  const templates = window.EPK_POSTER_TEMPLATES || EPK_TEMPLATES;
  const template = templates.find(t => t[0] === document.getElementById('epk-poster-template')?.value) || templates[0];
  const brief = ['# Poster Brief', `Poster template: ${template[1]}`, `Act: ${template[2]}`, `Gallery image: ${readField('epk-poster-gallery-image')}`, `Title: ${readField('epk-poster-title')}`, `Date: ${readField('epk-poster-date')}`, `Venue: ${readField('epk-poster-venue')}`, `Doors: ${readField('epk-poster-doors')}`, `Other act: ${readField('epk-poster-other')}`, `CTA: ${readField('epk-poster-cta')}`, `Extra: ${readField('epk-poster-extra')}`, '', 'Do not invent dates, venues, other acts, or ticket links.'].join('\n');
  if (typeof copyText === 'function') await copyText(brief, 'Copied poster brief.');
}

function updateContactPreview() {
  const link = document.getElementById('epk-contact-mailto');
  if (!link || typeof currentData === 'undefined' || !currentData) return;
  const email = currentData.meta?.email || 'dave.knowles.music@gmail.com';
  link.href = `mailto:${email}?subject=${encodeURIComponent('EPK enquiry — ' + readField('epk-contact-name'))}&body=${encodeURIComponent(contactPreviewText(email))}`;
}

async function copyContactPreview() {
  const email = currentData?.meta?.email || 'dave.knowles.music@gmail.com';
  if (typeof copyText === 'function') await copyText(contactPreviewText(email), 'Copied contact email preview.');
}

function contactPreviewText(email) {
  return [`To: ${email}`, '', `Name: ${readField('epk-contact-name')}`, `Email: ${readField('epk-contact-email')}`, `Date: ${readField('epk-contact-date')}`, `Venue / City: ${readField('epk-contact-venue')}`, '', readField('epk-contact-message')].join('\n');
}

function parseVideoURL(url) {
  const youtube = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (youtube) return { platform: 'YouTube', thumbnail: `https://img.youtube.com/vi/${youtube[1]}/hqdefault.jpg` };
  const vimeo = String(url).match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { platform: 'Vimeo', thumbnail: '' };
  return null;
}

function localAssetURL(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `/${String(path).replace(/^\/+/, '')}`;
}

function readField(id) {
  return document.getElementById(id)?.value.trim() || '';
}

function safe(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function safeAttr(value) {
  return safe(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

window.EPK_POSTER_TEMPLATES = window.EPK_POSTER_TEMPLATES || EPK_TEMPLATES;