const EPK_TEMPLATES = [
  ['acoustic-earth', 'Acoustic Earth', 'Dave acoustic', 'template-acoustic', '#342820', '#7A9E80', '#E6D7B8'],
  ['duif-night', 'DU!F Night Drive', 'DU!F', 'template-duif', '#101112', '#24424a', '#9DC4A4'],
  ['scorehouse', 'Scorehouse', 'Film / theatre', 'template-score', '#181918', '#514735', '#D1A65A'],
  ['press-minimal', 'Press Minimal', 'Press', 'template-press', '#1E1F1C', '#4c564a', '#B8BFAD'],
  ['wedding-gold', 'Wedding Gold', 'Wedding / event', 'template-wedding', '#2b2a23', '#8e7e5f', '#F0DFA8']
];

let epkPosterLogo = null;
let epkExtensionAttempts = 0;

document.addEventListener('DOMContentLoaded', waitForEPKPublisherData);

function waitForEPKPublisherData() {
  epkExtensionAttempts += 1;
  if (typeof currentData !== 'undefined' && currentData && document.getElementById('preview-frame')) {
    installEPKExtensions();
    return;
  }
  if (epkExtensionAttempts < 80) setTimeout(waitForEPKPublisherData, 100);
}

function installEPKExtensions() {
  addExtensionNav();
  addExtensionPages();
  addDashboardTabs();
  addTemplateStrip();
  renderTemplateViews();
  renderMediaTools();
  bindPosterTools();
  drawPosterPreview();
}

function addExtensionNav() {
  const nav = document.querySelector('.nav');
  if (!nav || document.querySelector('[data-extension-nav]')) return;
  const json = nav.querySelector('[data-page="json"]');
  [['media', 'Media previews'], ['templates', 'Templates'], ['poster', 'Poster generator'], ['contact', 'Contact form']].forEach(([id, label]) => {
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
    <section class="page" id="page-media"><div class="panel-head standalone"><div><h3>Media previews</h3><p class="help">Video thumbnails and optional release audio scrubbers.</p></div></div><section class="panel"><h3>Video thumbnail cards</h3><div class="media-preview-grid" id="epk-video-preview-grid"></div></section><section class="panel"><h3>Release audio scrubbers</h3><p class="help">Set an optional audio preview path, for example <code>audio/track.mp3</code>. Public pages show scrubbers when this field exists.</p><div id="epk-audio-preview-list"></div></section></section>
    <section class="page" id="page-templates"><div class="panel-head standalone"><div><h3>Templates</h3><p class="help">Template ideas are now visible and swappable here.</p></div></div><section class="panel"><div class="poster-template-grid" id="epk-template-grid"></div></section></section>
    <section class="page" id="page-poster"><div class="panel-head standalone"><div><h3>Poster generator</h3><p class="help">Browser-only poster composer. Download a PNG when ready.</p></div><button class="btn btn-primary" type="button" id="epk-poster-download">Download PNG</button></div><div class="poster-workbench"><section class="panel"><div class="form-grid"><label>Template<select id="epk-poster-template"></select></label><label>Act / mode<select id="epk-poster-mode"></select></label><label class="wide">Event title<input id="epk-poster-title" placeholder="Dave Knowles live"></label><label>Date<input id="epk-poster-date" placeholder="Fri 12 July"></label><label>Venue<input id="epk-poster-venue" placeholder="Venue name"></label><label>Doors<input id="epk-poster-doors" placeholder="Doors 19:00"></label><label>Other act<input id="epk-poster-other" placeholder="with ..."></label><label>CTA / tickets<input id="epk-poster-cta" placeholder="Tickets / bookings"></label><label class="wide">Extra text<textarea id="epk-poster-extra" rows="4"></textarea></label><label class="wide">Optional venue/promoter logo<input id="epk-poster-logo" type="file" accept="image/*"></label></div><div class="action-list"><button class="btn btn-secondary" type="button" id="epk-poster-refresh">Refresh preview</button><button class="btn btn-secondary" type="button" id="epk-poster-copy">Copy poster brief</button></div></section><section class="poster-canvas-wrap"><canvas id="epk-poster-canvas" width="1200" height="1600"></canvas></section></div></section>
    <section class="page" id="page-contact"><div class="panel-head standalone"><div><h3>Contact form</h3><p class="help">Public pages now show a contact button with fields. Static submit opens an email to Dave.</p></div></div><section class="panel"><h3>Public contact behavior</h3><ul class="rules"><li>Fields: name, email, phone, enquiry type, date, venue/city, message.</li><li>Uses <code>meta.email</code> from the EPK data.</li><li>No silent server-side sending is added in this static pass.</li></ul><div class="contact-preview-form"><label>Name<input id="epk-contact-name" value="Promoter Name"></label><label>Email<input id="epk-contact-email" value="promoter@example.com"></label><label>Date<input id="epk-contact-date" value="Fri 12 July"></label><label>Venue / City<input id="epk-contact-venue" value="Venue, City"></label><label class="wide">Message<textarea id="epk-contact-message" rows="5">Hi Dave, I would like to enquire about a performance.</textarea></label></div><div class="action-list"><button class="btn btn-secondary" type="button" id="epk-contact-copy">Copy example email</button><a class="btn btn-primary" id="epk-contact-mailto" href="#">Open email preview</a></div></section></section>
  `);
}

function showExtensionPage(id) {
  document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page.id === `page-${id}`));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-extension-nav="${id}"]`)?.classList.add('active');
  const titles = { media: 'Media previews', templates: 'Templates', poster: 'Poster generator', contact: 'Contact form' };
  document.getElementById('page-title').textContent = titles[id] || 'Publisher';
  document.getElementById('page-subtitle').textContent = 'EPK publisher extension tools.';
  renderMediaTools();
  renderTemplateViews();
  drawPosterPreview();
}

function addDashboardTabs() {
  const panel = document.querySelector('.dashboard-preview-panel');
  if (!panel || document.getElementById('epk-route-tabs')) return;
  panel.querySelector('.panel-head').insertAdjacentHTML('afterend', '<p class="preview-focus-note">Dashboard tabs open the matching public route inside the preview. The live public page stays toolbar-free.</p><div class="route-tabs" id="epk-route-tabs"></div>');
  renderRouteTabs();
}

function renderRouteTabs() {
  const target = document.getElementById('epk-route-tabs');
  if (!target || !currentData) return;
  const selected = document.getElementById('preview-mode')?.value || 'default';
  target.innerHTML = Object.entries(currentData.modes || {}).map(([key, mode]) => `<button class="route-tab${key === selected ? ' active' : ''}" type="button" data-route-tab="${safeAttr(key)}">${safe(mode.label || key)}</button>`).join('');
  target.querySelectorAll('[data-route-tab]').forEach(button => button.onclick = () => {
    const select = document.getElementById('preview-mode');
    select.value = button.dataset.routeTab;
    select.dispatchEvent(new Event('change'));
    renderRouteTabs();
  });
}

function addTemplateStrip() {
  const dashboard = document.getElementById('page-dashboard');
  if (!dashboard || document.getElementById('epk-dashboard-template-strip')) return;
  dashboard.insertAdjacentHTML('beforeend', '<section class="panel"><div class="panel-head"><h3>Template previews</h3><button class="btn btn-secondary" type="button" id="epk-open-template-studio">Open template studio</button></div><div class="template-strip" id="epk-dashboard-template-strip"></div></section>');
  document.getElementById('epk-open-template-studio').onclick = () => showExtensionPage('templates');
}

function renderTemplateViews() {
  const selected = currentData?.design?.template || 'acoustic-earth';
  const html = EPK_TEMPLATES.map(t => `<article class="template-card"><div class="template-swatch ${t[3]}"><span>${safe(t[2])}</span><strong>${safe(t[1])}</strong><span>${safe(t[6])}</span></div><h4>${safe(t[1])}</h4><button class="btn ${selected === t[0] ? 'btn-primary' : 'btn-secondary'}" type="button" data-template="${safeAttr(t[0])}">${selected === t[0] ? 'Selected' : 'Use template'}</button></article>`).join('');
  const grid = document.getElementById('epk-template-grid');
  const strip = document.getElementById('epk-dashboard-template-strip');
  if (grid) grid.innerHTML = html;
  if (strip) strip.innerHTML = EPK_TEMPLATES.map(t => `<button class="template-chip${selected === t[0] ? ' active' : ''}" type="button" data-template="${safeAttr(t[0])}">${safe(t[1])}</button>`).join('');
  document.querySelectorAll('[data-template]').forEach(button => button.onclick = () => applyEPKTemplate(button.dataset.template));
}

function applyEPKTemplate(id) {
  const template = EPK_TEMPLATES.find(t => t[0] === id) || EPK_TEMPLATES[0];
  currentData.design ||= {};
  currentData.design.template = template[0];
  currentData.design.templateLabel = template[1];
  if (typeof markDirty === 'function') markDirty(`Template ${template[1]} selected`);
  if (typeof renderJSON === 'function') renderJSON(false);
  renderTemplateViews();
  drawPosterPreview();
}
