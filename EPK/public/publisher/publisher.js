let currentData = null;
let dirty = false;
let draftSaveTimer = null;
let lastPublishedURL = localStorage.getItem('epk-publisher-last-url') || '';
let lastGeneratedBrief = null;

const els = {};
const MODE_ROUTES = {
  default: '/',
  booker: '/venue',
  acoustic: '/acoustic',
  press: '/press',
  film: '/film',
  duif: '/duif'
};
const SECTION_OPTIONS = ['bio', 'offerings', 'credits', 'videos', 'releases', 'gallery', 'contact'];
const BRIEF_OUTPUTS = ['poster copy', 'Instagram caption', 'story copy', 'Facebook event blurb', 'booking/venue blurb'];

function bindBioDelegatedInputs() {
  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!target || !target.id) return;

    if (target.id === 'bio-short') {
      updateBioField('short', target.value);
      return;
    }

    if (target.id === 'bio-acoustic') {
      updateBioField('acoustic', target.value);
      return;
    }

    if (target.id === 'bio-full') {
      currentData.bio.full = target.value
        .split('\n\n')
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
      markDirty('Full bio updated');
      renderJSON(false);
    }
  });
}

bindBioDelegatedInputs();

document.addEventListener('DOMContentLoaded', initPublisher);

async function initPublisher() {
  cacheEls();
  bindGlobalEvents();
  restorePublishSettings();
  await loadLiveData();
}

function cacheEls() {
  document.querySelectorAll('[id]').forEach(el => {
    els[el.id] = el;
  });
}

function bindGlobalEvents() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });
  document.querySelectorAll('[data-page-jump]').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.pageJump));
  });

  els['validate-top-btn'].addEventListener('click', validateData);
  els['download-top-btn'].addEventListener('click', downloadJSON);
  els['reload-live-btn'].addEventListener('click', loadLiveData);
  els['save-draft-btn'].addEventListener('click', saveDraft);
  els['restore-draft-btn'].addEventListener('click', restoreDraft);
  els['discard-draft-btn'].addEventListener('click', discardDraft);

  els['add-offering-btn'].addEventListener('click', () => addItem('offerings'));
  els['add-credit-btn'].addEventListener('click', () => addItem('credits'));
  els['add-video-btn'].addEventListener('click', () => addItem('videos'));
  els['add-release-btn'].addEventListener('click', () => addItem('releases'));
  els['add-photo-btn'].addEventListener('click', () => addItem('gallery'));

  els['format-json-btn'].addEventListener('click', formatJSON);
  els['apply-json-btn'].addEventListener('click', applyJSON);

  els['generate-brief-btn'].addEventListener('click', generateBrief);
  els['copy-brief-btn'].addEventListener('click', copyBriefText);
  els['download-brief-btn'].addEventListener('click', downloadBriefJSON);

  els['publish-live-btn'].addEventListener('click', publishLiveData);
  els['publish-snapshot-btn'].addEventListener('click', publishSnapshot);
  els['copy-last-url-btn'].addEventListener('click', copyLastURL);

  ['gh-owner', 'gh-repo', 'gh-branch', 'gh-data-path', 'gh-snapshot-path'].forEach(id => {
    els[id].addEventListener('change', () => localStorage.setItem(`epk-publisher-${id}`, els[id].value.trim()));
  });

  document.addEventListener('input', event => {
    const bind = event.target.dataset?.bind;
    if (bind) {
      setPath(currentData, bind, event.target.value);
      markDirty(`${bind} updated`);
      renderJSON(false);
      renderMetrics();
    }
  });
}

async function loadLiveData() {
  try {
    setStatus('', 'Loading /data/epk.json…');
    const res = await fetch('/data/epk.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load /data/epk.json (${res.status})`);
    currentData = await res.json();
    ensureDataShape();
    dirty = false;
    renderAll();
    const draft = localStorage.getItem('epk-publisher-draft');
    setStatus('success', `Loaded live EPK data.${draft ? '\nA browser draft is available if you need to restore unfinished edits.' : ''}`);
  } catch (error) {
    setStatus('error', error.message);
  }
}

function ensureDataShape() {
  currentData ||= {};
  currentData.meta ||= { social: {} };
  currentData.meta.social ||= {};
  currentData.bio ||= { short: '', acoustic: '', full: [] };
  currentData.offerings ||= [];
  currentData.credits ||= [];
  currentData.videos ||= [];
  currentData.releases ||= [];
  currentData.gallery ||= [];
  currentData.modes ||= { default: { label: 'General', sections: ['bio', 'offerings', 'videos', 'gallery', 'contact'] } };
}

function renderAll() {
  renderModeLinks();
  renderMetrics();
  renderProfile();
  renderBio();
  renderArrayList('offerings');
  renderArrayList('credits');
  renderArrayList('videos');
  renderArrayList('releases');
  renderGallery();
  renderModes();
  renderPreviewControls();
  renderBriefControls();
  renderJSON(true);
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page.id === `page-${id}`));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === id));
  const titles = {
    dashboard: ['Dashboard', 'Edit the EPK data, preview clean public pages, export JSON, or publish updates.'],
    profile: ['Profile', 'Name, contact details, location, and social links.'],
    bio: ['Biography', 'Different bio lengths for different public routes and press contexts.'],
    offerings: ['Offerings', 'Performance and service cards, tagged by audience.'],
    credits: ['Credits', 'Film, theatre, TV, festival, and score credits.'],
    videos: ['Videos', 'Media links tagged by audience.'],
    releases: ['Releases', 'Spotify, SoundCloud, Bandcamp, and release links.'],
    gallery: ['Gallery', 'Photo paths and captions used by public pages.'],
    modes: ['Audience pages', 'Control the content recipe for each public route.'],
    brief: ['Promo brief', 'Generate copy-ready handoff briefs for Spectra, Codex, or manual use.'],
    json: ['Advanced JSON', 'Direct JSON editor for precise edits.'],
    publish: ['Publish', 'Commit live data or immutable snapshots to GitHub.']
  };
  const [title, subtitle] = titles[id] || titles.dashboard;
  els['page-title'].textContent = title;
  els['page-subtitle'].textContent = subtitle;
  if (id === 'json') renderJSON(true);
  if (id === 'dashboard') updatePreview();
}

function renderModeLinks() {
  const modes = currentData.modes || {};
  els['mode-links'].innerHTML = Object.entries(modes).map(([key, mode]) => {
    const url = publicURLForMode(key);
    return `
      <div class="mode-link">
        <span>${escapeHTML(mode.label || key)}</span>
        <button class="btn btn-sm" type="button" onclick="copyText('${escapeAttr(url)}', 'Copied ${escapeAttr(mode.label || key)} route')">Copy</button>
        <a class="btn btn-sm" href="${escapeAttr(url)}" target="_blank" rel="noopener">Open</a>
      </div>`;
  }).join('');
}

function renderMetrics() {
  const metrics = [
    ['Modes', Object.keys(currentData.modes || {}).length],
    ['Photos', currentData.gallery?.length || 0],
    ['Videos', currentData.videos?.length || 0],
    ['Credits', currentData.credits?.length || 0]
  ];
  els.metrics.innerHTML = metrics.map(([label, value]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`).join('');
}

function renderProfile() {
  bindValue('meta-name', currentData.meta?.name);
  bindValue('meta-tagline', currentData.meta?.tagline);
  bindValue('meta-location', currentData.meta?.location);
  bindValue('meta-email', currentData.meta?.email);
  bindValue('meta-phone', currentData.meta?.phone);
  bindValue('meta-website', currentData.meta?.website);
  bindValue('meta-instagram', currentData.meta?.social?.instagram);
  bindValue('meta-youtube', currentData.meta?.social?.youtube);
  bindValue('meta-soundcloud', currentData.meta?.social?.soundcloud);
  bindValue('meta-facebook', currentData.meta?.social?.facebook);
}

function renderBio() {
  els['bio-short'].value = currentData.bio?.short || '';
  els['bio-acoustic'].value = currentData.bio?.acoustic || '';
  els['bio-full'].value = Array.isArray(currentData.bio?.full) ? currentData.bio.full.join('\n\n') : (currentData.bio?.full || '');

  els['bio-short'].oninput = () => updateBioField('short', els['bio-short'].value);
  els['bio-acoustic'].oninput = () => updateBioField('acoustic', els['bio-acoustic'].value);
  els['bio-full'].oninput = () => {
    currentData.bio.full = els['bio-full'].value.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    markDirty('Full bio updated');
    renderJSON(false);
  };
}

function updateBioField(key, value) {
  currentData.bio[key] = value;
  markDirty(`${key} bio updated`);
  renderJSON(false);
}

function renderArrayList(kind) {
  const target = els[`${kind}-list`];
  const items = currentData[kind] || [];
  if (!items.length) {
    target.innerHTML = `<section class="panel"><p class="help">No ${kind} yet.</p></section>`;
    return;
  }

  target.innerHTML = items.map((item, index) => renderItemCard(kind, item, index)).join('');
}

function renderItemCard(kind, item, index) {
  const title = item.title || item.name || `${singular(kind)} ${index + 1}`;
  return `
    <article class="item-card">
      <div class="item-head">
        <h4>${escapeHTML(title)}</h4>
        <div class="item-actions">
          <button class="btn btn-sm" type="button" onclick="moveItem('${kind}', ${index}, -1)">Up</button>
          <button class="btn btn-sm" type="button" onclick="moveItem('${kind}', ${index}, 1)">Down</button>
          <button class="btn btn-sm" type="button" onclick="duplicateItem('${kind}', ${index})">Duplicate</button>
          <button class="btn btn-sm btn-danger" type="button" onclick="removeItem('${kind}', ${index})">Delete</button>
        </div>
      </div>
      ${renderFieldsForKind(kind, item, index)}
      ${renderTags(kind, index, item.tags || [])}
    </article>`;
}

function renderFieldsForKind(kind, item, index) {
  if (kind === 'offerings') {
    return `
      <div class="form-grid">
        ${field(kind, index, 'title', item.title || '', 'Title')}
        ${textareaField(kind, index, 'description', item.description || '', 'Description', true)}
      </div>`;
  }
  if (kind === 'credits') {
    return `
      <div class="form-grid">
        ${field(kind, index, 'title', item.title || '', 'Title')}
        ${field(kind, index, 'role', item.role || '', 'Role')}
        ${field(kind, index, 'year', item.year || '', 'Year')}
        ${field(kind, index, 'link', item.link || '', 'Link')}
        ${textareaField(kind, index, 'description', item.description || '', 'Description', true)}
      </div>`;
  }
  if (kind === 'videos') {
    return `
      <div class="form-grid">
        ${field(kind, index, 'title', item.title || '', 'Title')}
        ${field(kind, index, 'url', item.url || '', 'URL')}
      </div>`;
  }
  if (kind === 'releases') {
    return `
      <div class="form-grid">
        ${field(kind, index, 'title', item.title || '', 'Title')}
        ${field(kind, index, 'alias', item.alias || '', 'Alias')}
        ${field(kind, index, 'url', item.url || '', 'URL', true)}
      </div>`;
  }
  return '';
}

function renderGallery() {
  els['photo-grid'].innerHTML = (currentData.gallery || []).map(photo => {
    const src = assetURL(photo.src);
    return `<div class="photo-thumb"><img src="${escapeAttr(src)}" alt="${escapeAttr(photo.caption || 'Dave Knowles')}"><span>${escapeHTML(photo.caption || photo.src || '')}</span></div>`;
  }).join('');

  const target = els['gallery-list'];
  const items = currentData.gallery || [];
  target.innerHTML = items.length ? items.map((item, index) => `
    <article class="item-card">
      <div class="item-head">
        <h4>${escapeHTML(item.caption || item.src || `Photo ${index + 1}`)}</h4>
        <div class="item-actions">
          <button class="btn btn-sm" type="button" onclick="moveItem('gallery', ${index}, -1)">Up</button>
          <button class="btn btn-sm" type="button" onclick="moveItem('gallery', ${index}, 1)">Down</button>
          <button class="btn btn-sm" type="button" onclick="duplicateItem('gallery', ${index})">Duplicate</button>
          <button class="btn btn-sm btn-danger" type="button" onclick="removeItem('gallery', ${index})">Delete</button>
        </div>
      </div>
      <div class="form-grid">
        ${field('gallery', index, 'src', item.src || '', 'Image path')}
        ${field('gallery', index, 'caption', item.caption || '', 'Caption')}
      </div>
    </article>`).join('') : `<section class="panel"><p class="help">No gallery images yet.</p></section>`;
}

function renderModes() {
  const modes = currentData.modes || {};
  els['modes-list'].innerHTML = Object.entries(modes).map(([key, mode]) => `
    <article class="item-card">
      <div class="item-head">
        <h4>${escapeHTML(mode.label || key)} <span class="hint">/${key === 'booker' ? 'venue' : key === 'default' ? '' : key}</span></h4>
        <div class="item-actions">
          <a class="btn btn-sm" href="${escapeAttr(publicURLForMode(key))}" target="_blank" rel="noopener">Open clean route</a>
        </div>
      </div>
      <div class="form-grid">
        ${modeField(key, 'label', mode.label || '', 'Label')}
        ${modeField(key, 'hero', mode.hero || '', 'Hero image')}
        ${modeField(key, 'heroCaption', mode.heroCaption || '', 'Hero caption')}
        ${modeSelect(key, 'bioStyle', mode.bioStyle || 'short', 'Bio style', ['short', 'acoustic', 'full'])}
        ${modeField(key, 'galleryCount', mode.galleryCount ?? 0, 'Gallery count')}
      </div>
      <p class="help">Sections</p>
      ${renderModeChecks(key, 'sections', mode.sections || [], SECTION_OPTIONS)}
      <p class="help">Offering tags</p>
      ${renderModeChecks(key, 'offeringTags', mode.offeringTags || [], getModeKeys())}
      <p class="help">Video tags</p>
      ${renderModeChecks(key, 'videoTags', mode.videoTags || [], getModeKeys())}
    </article>`).join('');
}

function renderPreviewControls() {
  const select = els['preview-mode'];
  select.innerHTML = Object.entries(currentData.modes || {}).map(([key, mode]) => `<option value="${escapeAttr(key)}">${escapeHTML(mode.label || key)}</option>`).join('');
  select.onchange = updatePreview;
  updatePreview();
}

function updatePreview() {
  const key = els['preview-mode'].value || 'default';
  els['preview-frame'].src = publicURLForMode(key);
}

function renderBriefControls() {
  els['brief-mode'].innerHTML = Object.entries(currentData.modes || {}).map(([key, mode]) => `<option value="${escapeAttr(key)}">${escapeHTML(mode.label || key)}</option>`).join('');
  els['brief-output-options'].innerHTML = BRIEF_OUTPUTS.map(output => `
    <label class="tag-pill"><input type="checkbox" value="${escapeAttr(output)}" checked> ${escapeHTML(output)}</label>`).join('');
}

function renderJSON(force) {
  if (force || document.activeElement !== els['json-box']) {
    els['json-box'].value = JSON.stringify(currentData, null, 2);
  }
}

function field(kind, index, prop, value, label, wide = false) {
  return `<label class="${wide ? 'wide' : ''}">${label}<input value="${escapeAttr(value)}" oninput="updateItemField('${kind}', ${index}, '${prop}', this.value)"></label>`;
}

function textareaField(kind, index, prop, value, label, wide = false) {
  return `<label class="${wide ? 'wide' : ''}">${label}<textarea rows="4" oninput="updateItemField('${kind}', ${index}, '${prop}', this.value)">${escapeHTML(value)}</textarea></label>`;
}

function modeField(key, prop, value, label) {
  return `<label>${label}<input value="${escapeAttr(value)}" oninput="updateModeField('${key}', '${prop}', this.value)"></label>`;
}

function modeSelect(key, prop, value, label, options) {
  return `<label>${label}<select onchange="updateModeField('${key}', '${prop}', this.value)">
    ${options.map(option => `<option value="${escapeAttr(option)}"${option === value ? ' selected' : ''}>${escapeHTML(option)}</option>`).join('')}
  </select></label>`;
}

function renderTags(kind, index, selected) {
  return `
    <p class="help">Audience tags</p>
    <div class="tag-grid">
      ${getModeKeys().map(tag => `
        <label class="tag-pill"><input type="checkbox"${selected.includes(tag) ? ' checked' : ''} onchange="toggleItemTag('${kind}', ${index}, '${tag}', this.checked)"> ${escapeHTML(tag)}</label>`).join('')}
    </div>`;
}

function renderModeChecks(modeKey, prop, selected, options) {
  return `
    <div class="tag-grid">
      ${options.map(option => `
        <label class="tag-pill"><input type="checkbox"${selected.includes(option) ? ' checked' : ''} onchange="toggleModeArrayValue('${modeKey}', '${prop}', '${option}', this.checked)"> ${escapeHTML(option)}</label>`).join('')}
    </div>`;
}

function updateItemField(kind, index, prop, value) {
  currentData[kind][index][prop] = value;
  markDirty(`${kind} updated`);
  renderJSON(false);
  if (kind === 'gallery') renderGalleryPreviewOnly();
}

function renderGalleryPreviewOnly() {
  els['photo-grid'].innerHTML = (currentData.gallery || []).map(photo => {
    const src = assetURL(photo.src);
    return `<div class="photo-thumb"><img src="${escapeAttr(src)}" alt="${escapeAttr(photo.caption || 'Dave Knowles')}"><span>${escapeHTML(photo.caption || photo.src || '')}</span></div>`;
  }).join('');
}

function toggleItemTag(kind, index, tag, checked) {
  const item = currentData[kind][index];
  item.tags ||= [];
  item.tags = checked ? unique([...item.tags, tag]) : item.tags.filter(t => t !== tag);
  markDirty(`${kind} tags updated`);
  renderJSON(false);
}

function updateModeField(key, prop, value) {
  if (prop === 'galleryCount') value = Number(value) || 0;
  currentData.modes[key][prop] = value;
  markDirty(`${key} mode updated`);
  renderModeLinks();
  renderPreviewControls();
  renderBriefControls();
  renderJSON(false);
}

function toggleModeArrayValue(key, prop, value, checked) {
  const mode = currentData.modes[key];
  mode[prop] ||= [];
  mode[prop] = checked ? unique([...mode[prop], value]) : mode[prop].filter(item => item !== value);
  markDirty(`${key} ${prop} updated`);
  renderJSON(false);
}

function addItem(kind) {
  const defaults = {
    offerings: { title: 'New offering', description: '', tags: ['booker'] },
    credits: { title: 'New credit', role: '', year: '', description: '', link: '', tags: ['press'] },
    videos: { title: 'New video', url: '', tags: ['default'] },
    releases: { title: 'New release', alias: '', url: '', tags: ['press'] },
    gallery: { src: 'photos/', caption: '' }
  };
  currentData[kind] ||= [];
  currentData[kind].push(structuredClone(defaults[kind]));
  markDirty(`${singular(kind)} added`);
  if (kind === 'gallery') renderGallery();
  else renderArrayList(kind);
  renderMetrics();
  renderJSON(false);
}

function duplicateItem(kind, index) {
  currentData[kind].splice(index + 1, 0, structuredClone(currentData[kind][index]));
  markDirty(`${singular(kind)} duplicated`);
  kind === 'gallery' ? renderGallery() : renderArrayList(kind);
  renderMetrics();
  renderJSON(false);
}

function removeItem(kind, index) {
  if (!confirm(`Delete this ${singular(kind)}?`)) return;
  currentData[kind].splice(index, 1);
  markDirty(`${singular(kind)} deleted`);
  kind === 'gallery' ? renderGallery() : renderArrayList(kind);
  renderMetrics();
  renderJSON(false);
}

function moveItem(kind, index, direction) {
  const next = index + direction;
  if (next < 0 || next >= currentData[kind].length) return;
  const [item] = currentData[kind].splice(index, 1);
  currentData[kind].splice(next, 0, item);
  markDirty(`${singular(kind)} reordered`);
  kind === 'gallery' ? renderGallery() : renderArrayList(kind);
  renderJSON(false);
}

function formatJSON() {
  try {
    const data = JSON.parse(els['json-box'].value);
    currentData = data;
    ensureDataShape();
    renderAll();
    markDirty('JSON formatted');
    setStatus('success', 'JSON formatted and applied.');
  } catch (error) {
    setStatus('error', `Invalid JSON: ${error.message}`);
  }
}

function applyJSON() {
  try {
    currentData = JSON.parse(els['json-box'].value);
    ensureDataShape();
    renderAll();
    markDirty('JSON applied');
    setStatus('success', 'JSON applied to the visual editor.');
  } catch (error) {
    setStatus('error', `Invalid JSON: ${error.message}`);
  }
}

function validateData() {
  const issues = collectIssues(currentData);
  setStatus(issues.length ? 'warn' : 'success', issues.length ? `Validation warnings:\n${issues.join('\n')}` : 'EPK data looks ready.');
  return issues;
}

function collectIssues(data) {
  const issues = [];
  if (!data.meta?.name) issues.push('Missing meta.name');
  if (!data.meta?.email) issues.push('Missing meta.email');
  if (!data.meta?.website) issues.push('Missing meta.website');
  if (!data.bio?.short) issues.push('Missing bio.short');
  if (!data.modes?.default) issues.push('Missing modes.default');
  ['offerings', 'credits', 'videos', 'releases', 'gallery'].forEach(key => {
    if (!Array.isArray(data[key])) issues.push(`${key} must be an array`);
  });
  (data.videos || []).forEach((video, index) => {
    if (!video.title || !video.url) issues.push(`Video ${index + 1} needs title and URL`);
  });
  (data.gallery || []).forEach((photo, index) => {
    if (!photo.src) issues.push(`Gallery photo ${index + 1} needs src`);
  });
  return issues;
}

function downloadJSON() {
  downloadTextFile('epk.json', JSON.stringify(currentData, null, 2), 'application/json');
  setStatus('success', 'Downloaded epk.json.');
}

function saveDraft() {
  localStorage.setItem('epk-publisher-draft', JSON.stringify(currentData));
  setStatus('success', 'Saved browser draft on this device.');
}

function restoreDraft() {
  const raw = localStorage.getItem('epk-publisher-draft');
  if (!raw) return setStatus('warn', 'No browser draft saved.');
  try {
    currentData = JSON.parse(raw);
    ensureDataShape();
    dirty = true;
    renderAll();
    setStatus('success', 'Restored browser draft.');
  } catch (error) {
    setStatus('error', `Could not restore draft: ${error.message}`);
  }
}

function discardDraft() {
  localStorage.removeItem('epk-publisher-draft');
  setStatus('success', 'Discarded browser draft.');
}

function generateBrief() {
  const modeKey = els['brief-mode'].value || 'default';
  const mode = currentData.modes?.[modeKey] || currentData.modes?.default || {};
  const outputs = [...document.querySelectorAll('#brief-output-options input:checked')].map(input => input.value);
  const event = {
    name: els['brief-event'].value.trim(),
    date: els['brief-date'].value.trim(),
    venue: els['brief-venue'].value.trim(),
    city: els['brief-city'].value.trim(),
    cta: els['brief-cta'].value.trim()
  };
  const selectedTags = unique([modeKey, ...(mode.videoTags || []), ...(mode.offeringTags || [])]);
  const videos = (currentData.videos || []).filter(item => intersects(item.tags || [], selectedTags)).slice(0, 5);
  const releases = (currentData.releases || []).filter(item => intersects(item.tags || [], selectedTags)).slice(0, 5);
  const gallery = (currentData.gallery || []).slice(0, Math.max(Number(mode.galleryCount) || 4, 4));

  lastGeneratedBrief = {
    artist: currentData.meta?.name || 'Dave Knowles',
    project: currentData.meta?.tagline || '',
    mode: { key: modeKey, label: mode.label || modeKey },
    event,
    tone: els['brief-tone'].value.trim() || 'editorial and concise',
    outputs,
    assets: {
      heroImage: mode.hero ? assetURL(mode.hero) : '',
      heroCaption: mode.heroCaption || '',
      gallery,
      videos,
      releases
    },
    contact: {
      email: currentData.meta?.email || '',
      phone: currentData.meta?.phone || '',
      website: currentData.meta?.website || '',
      social: currentData.meta?.social || {}
    },
    source: {
      repo: 'devknowsdev/EPK',
      data: 'EPK/public/data/epk.json',
      route: publicURLForMode(modeKey)
    },
    notes: [
      'Use public/data/epk.json as the source of truth.',
      'Do not invent credits, dates, venues, media links, or claims.',
      'Use the selected audience mode before falling back to general EPK copy.'
    ]
  };

  els['brief-json'].value = JSON.stringify(lastGeneratedBrief, null, 2);
  els['brief-text'].value = briefToMarkdown(lastGeneratedBrief);
  setStatus('success', 'Generated promo brief.');
}

function briefToMarkdown(brief) {
  const eventLines = Object.entries(brief.event).filter(([, value]) => value).map(([key, value]) => `- ${capitalize(key)}: ${value}`).join('\n') || '- Event details: TBD';
  const outputLines = brief.outputs.map(output => `- ${output}`).join('\n');
  const videoLines = brief.assets.videos.map(item => `- ${item.title}: ${item.url}`).join('\n') || '- No selected videos';
  const releaseLines = brief.assets.releases.map(item => `- ${item.title}${item.alias ? ` (${item.alias})` : ''}: ${item.url}`).join('\n') || '- No selected releases';
  const galleryLines = brief.assets.gallery.map(item => `- ${item.caption || item.src}: ${assetURL(item.src)}`).join('\n') || '- No selected photos';
  return `# Promo brief — ${brief.artist}

## Audience
- Mode: ${brief.mode.label} (${brief.mode.key})
- Route: ${brief.source.route}
- Tone: ${brief.tone}

## Event
${eventLines}

## Requested outputs
${outputLines}

## Core source
- Artist: ${brief.artist}
- Project: ${brief.project}
- Hero image: ${brief.assets.heroImage}
- Hero caption: ${brief.assets.heroCaption || 'None'}

## Suggested videos
${videoLines}

## Suggested releases
${releaseLines}

## Suggested photos
${galleryLines}

## Contact
- Email: ${brief.contact.email}
- Phone: ${brief.contact.phone}
- Website: ${brief.contact.website}

## Guardrails
${brief.notes.map(note => `- ${note}`).join('\n')}
`;
}

async function copyBriefText() {
  if (!els['brief-text'].value) generateBrief();
  await copyText(els['brief-text'].value, 'Copied promo brief text.');
}

function downloadBriefJSON() {
  if (!lastGeneratedBrief) generateBrief();
  downloadTextFile('dave-knowles-promo-brief.json', JSON.stringify(lastGeneratedBrief, null, 2), 'application/json');
  setStatus('success', 'Downloaded promo brief JSON.');
}

async function publishLiveData() {
  const config = readPublishConfig();
  if (!config) return;
  const issues = collectIssues(currentData);
  if (issues.length && !confirm(`Validation has warnings:\n${issues.join('\n')}\n\nPublish anyway?`)) return;

  const token = els['gh-token'].value.trim();
  const path = config.dataPath;
  const apiURL = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
  const payload = JSON.stringify(currentData, null, 2);

  setPublishButtons(false);
  setStatus('', `Publishing live data to ${path}…`);
  try {
    const existing = await fetchGitHubContent(apiURL, token, config.branch);
    const body = {
      message: `EPK data update — ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`,
      content: encodeBase64UTF8(payload),
      branch: config.branch
    };
    if (existing?.sha) body.sha = existing.sha;
    await putGitHubContent(apiURL, token, body);
    dirty = false;
    localStorage.removeItem('epk-publisher-draft');
    setStatus('success', `Published live EPK data.\nCloudflare should redeploy shortly.`);
  } catch (error) {
    setStatus('error', `Live publish failed: ${error.message}`);
  } finally {
    setPublishButtons(true);
  }
}

async function publishSnapshot() {
  const config = readPublishConfig();
  if (!config) return;
  const publishId = makePublishId();
  const basePath = normalizeFolder(config.snapshotPath);
  const path = `${basePath}/${publishId}/epk.json`;
  const apiURL = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
  const pageURL = `${location.origin}/published/${publishId}/`;

  setPublishButtons(false);
  setStatus('', `Publishing snapshot ${publishId}…`);
  try {
    const body = {
      message: `EPK snapshot ${publishId}`,
      content: encodeBase64UTF8(JSON.stringify(currentData, null, 2)),
      branch: config.branch
    };
    await putGitHubContent(apiURL, config.token, body);
    lastPublishedURL = pageURL;
    localStorage.setItem('epk-publisher-last-url', pageURL);
    localStorage.setItem('epk-publisher-gh-snapshot-path', basePath);
    els['gh-snapshot-path'].value = basePath;
    setStatus('success', `Published immutable snapshot.\n${pageURL}`);
  } catch (error) {
    setStatus('error', `Snapshot publish failed: ${error.message}`);
  } finally {
    setPublishButtons(true);
  }
}

function readPublishConfig() {
  const config = {
    owner: els['gh-owner'].value.trim(),
    repo: els['gh-repo'].value.trim(),
    branch: els['gh-branch'].value.trim() || 'main',
    dataPath: els['gh-data-path'].value.trim() || 'EPK/public/data/epk.json',
    snapshotPath: els['gh-snapshot-path'].value.trim() || 'EPK/public/published',
    token: els['gh-token'].value.trim()
  };
  if (!config.token) {
    setStatus('error', 'Paste a GitHub token for this publishing session. It is not saved.');
    return null;
  }
  if (!config.owner || !config.repo) {
    setStatus('error', 'Fill in GitHub owner and repository.');
    return null;
  }
  savePublishSettings();
  return config;
}

async function fetchGitHubContent(apiURL, token, branch) {
  const res = await fetch(`${apiURL}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json'
    }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await githubError(res));
  return await res.json();
}

async function putGitHubContent(apiURL, token, body) {
  const res = await fetch(apiURL, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await githubError(res));
  return await res.json();
}

async function githubError(res) {
  try {
    const err = await res.json();
    return err?.message || `GitHub error ${res.status}`;
  } catch (_) {
    return `GitHub error ${res.status}`;
  }
}

function setPublishButtons(enabled) {
  els['publish-live-btn'].disabled = !enabled;
  els['publish-snapshot-btn'].disabled = !enabled;
}

async function copyLastURL() {
  if (!lastPublishedURL) return setStatus('warn', 'No snapshot URL has been published from this browser yet.');
  await copyText(lastPublishedURL, `Copied ${lastPublishedURL}`);
}

function savePublishSettings() {
  ['gh-owner', 'gh-repo', 'gh-branch', 'gh-data-path', 'gh-snapshot-path'].forEach(id => {
    localStorage.setItem(`epk-publisher-${id}`, els[id].value.trim());
  });
}

function restorePublishSettings() {
  ['gh-owner', 'gh-repo', 'gh-branch', 'gh-data-path', 'gh-snapshot-path'].forEach(id => {
    const saved = localStorage.getItem(`epk-publisher-${id}`);
    if (saved) els[id].value = saved;
  });
}

function markDirty(message = 'Unsaved changes') {
  dirty = true;
  setStatus('warn', message || 'Unsaved changes');
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
  }
  draftSaveTimer = setTimeout(() => {
    localStorage.setItem('epk-publisher-draft', JSON.stringify(currentData));
  }, 500);
}

function setStatus(type, message) {
  els.status.className = `status ${type || ''}`.trim();
  els.status.textContent = message;
}

function bindValue(id, value) {
  els[id].value = value || '';
}

function val(id) {
  return els[id]?.value || '';
}

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  let cursor = obj;
  parts.forEach(part => {
    cursor[part] ||= {};
    cursor = cursor[part];
  });
  cursor[last] = value;
}

function getModeKeys() {
  return Object.keys(currentData.modes || { default: true, booker: true, press: true, film: true, acoustic: true, duif: true });
}

function publicURLForMode(key) {
  return `${location.origin}${MODE_ROUTES[key] || `/${key}`}`;
}

function assetURL(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `/${String(path).replace(/^\/+/, '')}`;
}

function normalizeFolder(path) {
  const trimmed = (path || '').trim().replace(/\/+$/, '');
  return trimmed || 'EPK/public/published';
}

function makePublishId() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '').replace('T', '-');
  const rand = Math.random().toString(36).slice(2, 6);
  return `${stamp}-${rand}`;
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus('success', successMessage);
  } catch (error) {
    setStatus('warn', `Copy failed. Select and copy manually.\n${text}`);
  }
}

function encodeBase64UTF8(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function intersects(a, b) {
  return a.some(item => b.includes(item));
}

function singular(kind) {
  return {
    offerings: 'offering',
    credits: 'credit',
    videos: 'video',
    releases: 'release',
    gallery: 'photo'
  }[kind] || 'item';
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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

window.updateItemField = updateItemField;
window.toggleItemTag = toggleItemTag;
window.updateModeField = updateModeField;
window.toggleModeArrayValue = toggleModeArrayValue;
window.moveItem = moveItem;
window.duplicateItem = duplicateItem;
window.removeItem = removeItem;
window.copyText = copyText;
