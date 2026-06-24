const EPK_SITE_TEMPLATES = [
  ['forest-editorial', 'Forest Editorial', 'General EPK', 'site-template-forest', 'Original premium green editorial site style.'],
  ['press-minimal', 'Press Minimal', 'Press', 'site-template-press', 'Cleaner, tighter press layout with neutral contrast.'],
  ['acoustic-warm', 'Acoustic Warm', 'Acoustic', 'site-template-acoustic', 'Warmer folk/event palette for acoustic bookings.'],
  ['duif-electric', 'DU!F Electric', 'DU!F', 'site-template-duif', 'Cooler high-contrast electronic/live-loop feel.'],
  ['cinema-score', 'Cinema Score', 'Film & theatre', 'site-template-score', 'Cinematic composer-led palette for screen and stage work.']
];

const EPK_POSTER_TEMPLATES = [
  ['acoustic-earth', 'Acoustic Earth', 'Dave acoustic', 'template-acoustic', '#342820', '#7A9E80', '#E6D7B8'],
  ['duif-night', 'DU!F Night Drive', 'DU!F', 'template-duif', '#101112', '#24424a', '#9DC4A4'],
  ['scorehouse', 'Scorehouse', 'Film / theatre', 'template-score', '#181918', '#514735', '#D1A65A'],
  ['press-minimal-poster', 'Press Minimal Poster', 'Press', 'template-press', '#1E1F1C', '#4c564a', '#B8BFAD'],
  ['wedding-gold', 'Wedding Gold', 'Wedding / event', 'template-wedding', '#2b2a23', '#8e7e5f', '#F0DFA8']
];

const EPK_TEMPLATES = EPK_POSTER_TEMPLATES;
let epkPosterLogo = null;
let epkExtensionAttempts = 0;
let epkPosterToolsLoaded = false;
let epkBaseShowPage = null;
let epkBaseRenderArrayList = null;
let epkBaseRenderModes = null;

loadPosterTools();
document.addEventListener('DOMContentLoaded', waitForEPKPublisherData);

function loadPosterTools() {
  if (document.querySelector('script[data-publisher-poster-tools]')) return;
  const script = document.createElement('script');
  script.src = 'publisher-poster-tools.js';
  script.dataset.publisherPosterTools = 'true';
  script.onload = () => {
    epkPosterToolsLoaded = true;
  };
  document.head.appendChild(script);
}

function waitForEPKPublisherData() {
  epkExtensionAttempts += 1;
  if (typeof currentData !== 'undefined' && currentData && epkPosterToolsLoaded && typeof renderMediaTools === 'function' && document.getElementById('preview-frame')) {
    installEPKExtensions();
    return;
  }
  if (epkExtensionAttempts < 80) setTimeout(waitForEPKPublisherData, 100);
}

function installEPKExtensions() {
  removeDetachedRouteControls();
  addExtensionNav();
  addExtensionPages();
  addSiteTemplatePanel();
  patchPublisherRenderHooks();
  renderSiteTemplateViews();
  renderPosterTemplateViews();
  renderMediaTools();
  enhanceModeCards();
  bindPosterTools();
  drawPosterPreview();
}

function removeDetachedRouteControls() {
  document.querySelector('.sidebar-routes-block')?.remove();
  document.getElementById('epk-route-tabs')?.remove();
  document.querySelector('.preview-focus-note')?.remove();
}

function addExtensionNav() {
  const nav = document.querySelector('.nav');
  if (!nav || document.querySelector('[data-extension-nav]')) return;
  const json = nav.querySelector('[data-page="json"]');
  [['site-templates', 'Site templates'], ['poster', 'Poster studio'], ['contact', 'Contact UX']].forEach(([id, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-item';
    button.dataset.extensionNav = id;
    button.textContent = label;
    button.addEventListener('click', () => showExtensionPage(id));
    nav.insertBefore(button, json);
  });
}

function addExtensionPages() {
  const json = document.getElementById('page-json');
  if (!json || document.getElementById('page-poster')) return;
  json.insertAdjacentHTML('beforebegin', `
    <section class="page" id="page-site-templates"><div class="panel-head standalone"><div><h3>Site templates</h3><p class="help">Site templates affect public EPK pages. Choose a global default here, then override individual pages in Page builder.</p></div></div><section class="panel"><div class="site-template-grid" id="epk-site-template-grid"></div></section></section>
    <section class="page" id="page-poster"><div class="panel-head standalone"><div><h3>Poster studio</h3><p class="help">Poster templates are separate from site templates. They only affect the downloadable poster canvas.</p></div><button class="btn btn-primary" type="button" id="epk-poster-download">Download PNG</button></div><div class="poster-workbench"><section class="panel"><div class="form-grid"><label>Poster template<select id="epk-poster-template"></select></label><label>Act / mode<select id="epk-poster-mode"></select></label><label class="wide">Gallery image<select id="epk-poster-gallery-image"></select></label><label class="wide">Event title<input id="epk-poster-title" placeholder="Dave Knowles live"></label><label>Date<input id="epk-poster-date" placeholder="Fri 12 July"></label><label>Venue<input id="epk-poster-venue" placeholder="Venue name"></label><label>Doors<input id="epk-poster-doors" placeholder="Doors 19:00"></label><label>Other act<input id="epk-poster-other" placeholder="with ..."></label><label>CTA / tickets<input id="epk-poster-cta" placeholder="Tickets / bookings"></label><label class="wide">Extra text<textarea id="epk-poster-extra" rows="4"></textarea></label><label class="wide">Optional venue/promoter logo<input id="epk-poster-logo" type="file" accept="image/*"></label></div><div class="action-list"><button class="btn btn-secondary" type="button" id="epk-poster-refresh">Refresh preview</button><button class="btn btn-secondary" type="button" id="epk-poster-copy">Copy poster brief</button></div></section><section class="poster-canvas-wrap"><canvas id="epk-poster-canvas" width="1200" height="1600"></canvas></section></div></section>
    <section class="page" id="page-contact"><div class="panel-head standalone"><div><h3>Contact UX</h3><p class="help">Public pages show a small contact button. Static submit opens an email to Dave.</p></div></div><section class="panel"><h3>Public contact behavior</h3><ul class="rules"><li>Fields: name, email, phone, enquiry type, date, venue/city, message.</li><li>Uses <code>meta.email</code> from the EPK data.</li><li>No silent server-side sending is added in this static pass.</li></ul><div class="contact-preview-form"><label>Name<input id="epk-contact-name" value="Promoter Name"></label><label>Email<input id="epk-contact-email" value="promoter@example.com"></label><label>Date<input id="epk-contact-date" value="Fri 12 July"></label><label>Venue / City<input id="epk-contact-venue" value="Venue, City"></label><label class="wide">Message<textarea id="epk-contact-message" rows="5">Hi Dave, I would like to enquire about a performance.</textarea></label></div><div class="action-list"><button class="btn btn-secondary" type="button" id="epk-contact-copy">Copy example email</button><a class="btn btn-primary" id="epk-contact-mailto" href="#">Open email preview</a></div></section></section>
  `);
}

function patchPublisherRenderHooks() {
  if (!epkBaseShowPage && typeof showPage === 'function') {
    epkBaseShowPage = showPage;
    window.showPage = function patchedShowPage(id) {
      epkBaseShowPage(id);
      setTimeout(() => {
        removeDetachedRouteControls();
        renderMediaTools();
        enhanceModeCards();
      }, 0);
    };
  }
  if (!epkBaseRenderArrayList && typeof renderArrayList === 'function') {
    epkBaseRenderArrayList = renderArrayList;
    window.renderArrayList = function patchedRenderArrayList(kind) {
      epkBaseRenderArrayList(kind);
      setTimeout(renderMediaTools, 0);
    };
  }
  if (!epkBaseRenderModes && typeof renderModes === 'function') {
    epkBaseRenderModes = renderModes;
    window.renderModes = function patchedRenderModes() {
      epkBaseRenderModes();
      setTimeout(enhanceModeCards, 0);
    };
  }
}

function showExtensionPage(id) {
  document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page.id === `page-${id}`));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-extension-nav="${id}"]`)?.classList.add('active');
  const titles = {
    'site-templates': ['Site templates', 'Global and page-specific public site styling.'],
    poster: ['Poster studio', 'Create downloadable event posters from EPK data, gallery images, and manual event details.'],
    contact: ['Contact UX', 'Public contact button behavior and email handoff preview.']
  };
  const [title, subtitle] = titles[id] || titles['site-templates'];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;
  renderSiteTemplateViews();
  renderPosterTemplateViews();
  drawPosterPreview();
}

function addSiteTemplatePanel() {
  const dashboard = document.getElementById('page-dashboard');
  if (!dashboard || document.getElementById('epk-dashboard-site-template-strip')) return;
  dashboard.insertAdjacentHTML('beforeend', '<section class="panel"><div class="panel-head"><div><h3>Site template default</h3><p class="help">This affects the public pages. Per-page overrides live in Page builder.</p></div><button class="btn btn-secondary" type="button" id="epk-open-site-template-studio">Open site templates</button></div><div class="template-strip" id="epk-dashboard-site-template-strip"></div></section>');
  document.getElementById('epk-open-site-template-studio').onclick = () => showExtensionPage('site-templates');
}

function renderSiteTemplateViews() {
  currentData.design ||= {};
  const selected = currentData.design.siteTemplate || 'forest-editorial';
  const cardHtml = EPK_SITE_TEMPLATES.map(t => `<article class="template-card"><div class="template-swatch ${t[3]}"><span>${safe(t[2])}</span><strong>${safe(t[1])}</strong><span>${safe(t[4])}</span></div><h4>${safe(t[1])}</h4><p class="help">${safe(t[4])}</p><button class="btn ${selected === t[0] ? 'btn-primary' : 'btn-secondary'}" type="button" data-site-template="${safeAttr(t[0])}">${selected === t[0] ? 'Global default' : 'Use as global default'}</button></article>`).join('');
  const grid = document.getElementById('epk-site-template-grid');
  const strip = document.getElementById('epk-dashboard-site-template-strip');
  if (grid) grid.innerHTML = cardHtml;
  if (strip) strip.innerHTML = EPK_SITE_TEMPLATES.map(t => `<button class="template-chip${selected === t[0] ? ' active' : ''}" type="button" data-site-template="${safeAttr(t[0])}">${safe(t[1])}</button>`).join('');
  document.querySelectorAll('[data-site-template]').forEach(button => button.onclick = () => applySiteTemplate(button.dataset.siteTemplate));
}

function renderPosterTemplateViews() {
  const selected = currentData?.design?.posterTemplate || 'acoustic-earth';
  const select = document.getElementById('epk-poster-template');
  if (select) {
    select.innerHTML = EPK_POSTER_TEMPLATES.map(t => `<option value="${safeAttr(t[0])}">${safe(t[1])}</option>`).join('');
    select.value = selected;
  }
}

function applySiteTemplate(id) {
  const template = EPK_SITE_TEMPLATES.find(t => t[0] === id) || EPK_SITE_TEMPLATES[0];
  currentData.design ||= {};
  currentData.design.siteTemplate = template[0];
  currentData.design.siteTemplateLabel = template[1];
  if (typeof markDirty === 'function') markDirty(`Site template ${template[1]} selected`);
  if (typeof renderJSON === 'function') renderJSON(false);
  renderSiteTemplateViews();
  enhanceModeCards();
}

function applyEPKTemplate(id) {
  const template = EPK_POSTER_TEMPLATES.find(t => t[0] === id) || EPK_POSTER_TEMPLATES[0];
  currentData.design ||= {};
  currentData.design.posterTemplate = template[0];
  currentData.design.posterTemplateLabel = template[1];
  const select = document.getElementById('epk-poster-template');
  if (select) select.value = template[0];
  if (typeof markDirty === 'function') markDirty(`Poster template ${template[1]} selected`);
  if (typeof renderJSON === 'function') renderJSON(false);
  renderPosterTemplateViews();
  drawPosterPreview();
}

function enhanceModeCards() {
  const cards = document.querySelectorAll('#modes-list .item-card');
  cards.forEach((card, index) => {
    const key = Object.keys(currentData.modes || {})[index];
    if (!key || card.querySelector('.page-card-tools')) return;
    const mode = currentData.modes[key];
    const route = publicURLForMode ? publicURLForMode(key) : `${location.origin}/${key === 'default' ? '' : key}`;
    const tools = document.createElement('div');
    tools.className = 'page-card-tools';
    tools.innerHTML = `<div class="page-card-tools__row"><a class="btn btn-sm" href="${safeAttr(route)}" target="_blank" rel="noopener">Open route</a><button class="btn btn-sm" type="button" data-copy-route="${safeAttr(route)}">Copy route</button><button class="btn btn-sm" type="button" data-preview-route="${safeAttr(key)}">Preview here</button></div><label>Page site template<select data-mode-site-template="${safeAttr(key)}"><option value="">Use global default</option>${EPK_SITE_TEMPLATES.map(t => `<option value="${safeAttr(t[0])}"${mode.siteTemplate === t[0] ? ' selected' : ''}>${safe(t[1])}</option>`).join('')}</select></label>`;
    const head = card.querySelector('.item-head') || card.firstElementChild || card;
    head.insertAdjacentElement('afterend', tools);
  });

  document.querySelectorAll('[data-copy-route]').forEach(button => button.onclick = () => {
    if (typeof copyText === 'function') copyText(button.dataset.copyRoute, 'Copied page route.');
  });
  document.querySelectorAll('[data-preview-route]').forEach(button => button.onclick = () => {
    const select = document.getElementById('preview-mode');
    if (select) {
      select.value = button.dataset.previewRoute;
      select.dispatchEvent(new Event('change'));
      if (typeof showPage === 'function') showPage('dashboard');
    }
  });
  document.querySelectorAll('[data-mode-site-template]').forEach(select => select.onchange = () => {
    const key = select.dataset.modeSiteTemplate;
    currentData.modes[key].siteTemplate = select.value;
    if (!select.value) delete currentData.modes[key].siteTemplate;
    if (typeof markDirty === 'function') markDirty(`${key} page template updated`);
    if (typeof renderJSON === 'function') renderJSON(false);
  });
}