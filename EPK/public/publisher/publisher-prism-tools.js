/*
Prism suite launcher for EPK Publisher.
Keeps EPK bounded while providing top-level online/local access to Focus, Spectra, and Beam.
*/
(function(){
  const STORAGE_PREFIX = 'prism-tools-url:';
  const STORAGE_MODE = 'prism-tools-preferred-mode';

  const DEFAULTS = {
    epkPublisherLocal: 'http://localhost:8095/publisher/index.html',
    epkPublisherOnline: '',
    epkPublicLocal: 'http://localhost:8095/',
    epkPublicOnline: '',
    focusLocal: 'http://localhost:8080/',
    focusOnline: '',
    spectraLocal: '',
    spectraOnline: '',
    beamOnline: ''
  };

  const REPOS = {
    epk: 'https://github.com/devknowsdev/EPK',
    focus: 'https://github.com/devknowsdev/prism-focus',
    spectra: 'https://github.com/devknowsdev/prism-spectra',
    beam: 'https://github.com/devknowsdev/prism-beam'
  };

  function safe(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function urlKey(key) { return `${STORAGE_PREFIX}${key}`; }
  function getUrl(key) { return localStorage.getItem(urlKey(key)) ?? DEFAULTS[key] ?? ''; }
  function setUrl(key, value) {
    const next = String(value || '').trim();
    if (next) localStorage.setItem(urlKey(key), next);
    else localStorage.removeItem(urlKey(key));
  }
  function getPreferredMode() { return localStorage.getItem(STORAGE_MODE) || 'online'; }
  function setPreferredMode(value) { localStorage.setItem(STORAGE_MODE, value === 'local' ? 'local' : 'online'); }
  function openURL(url) { if (url) window.open(url, '_blank', 'noopener'); }

  function actionButton(label, url, primary) {
    if (!url) return `<span style="color:var(--dim);font-size:.78rem;padding:8px 0;">${safe(label)} not set</span>`;
    return `<button class="btn ${primary ? 'btn-primary' : 'btn-secondary'}" type="button" data-prism-url="${safe(url)}">${safe(label)}</button>`;
  }

  function card({ icon, title, status, description, onlineUrl, localUrl, repoUrl, soon }) {
    const preferred = getPreferredMode();
    const preferredUrl = preferred === 'local' ? (localUrl || onlineUrl) : (onlineUrl || localUrl);
    return `
      <article style="border:1px solid var(--rule);background:var(--surface);padding:15px;display:grid;gap:10px;box-shadow:var(--shadow);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
          <div style="display:flex;gap:10px;align-items:center;min-width:0;">
            <span style="width:36px;height:36px;border-radius:12px;border:1px solid var(--rule);background:rgba(122,158,128,.12);color:var(--accent-2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;"><i class="ti ${safe(icon)}"></i></span>
            <div style="min-width:0;">
              <h3 style="margin:0;color:var(--text);font-size:1rem;letter-spacing:0;text-transform:none;">${safe(title)}</h3>
              <p style="margin:3px 0 0;color:var(--accent);font-size:.66rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">${safe(status)}</p>
            </div>
          </div>
          ${soon ? '<span style="color:var(--warning);font-size:.64rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">soon</span>' : ''}
        </div>
        <p class="help" style="margin:0;">${safe(description)}</p>
        <div class="action-list">
          ${actionButton(`Open ${preferred}`, preferredUrl, true)}
          ${actionButton('Online', onlineUrl, false)}
          ${actionButton('Local', localUrl, false)}
          ${repoUrl ? actionButton('Repo', repoUrl, false) : ''}
        </div>
        <p class="help" style="margin:0;font-size:.76rem;">Preferred mode: ${safe(preferred)}. Missing URLs can be set below once and reused.</p>
      </article>`;
  }

  function settingField(key, label, placeholder) {
    return `<label>${safe(label)}
      <input data-prism-url-key="${safe(key)}" value="${safe(getUrl(key))}" placeholder="${safe(placeholder || '')}">
    </label>`;
  }

  function renderSettings() {
    const preferred = getPreferredMode();
    return `
      <section style="padding:16px 20px;border-bottom:1px solid var(--rule);background:rgba(255,255,255,.02);display:grid;gap:14px;">
        <div style="display:flex;flex-wrap:wrap;align-items:end;gap:12px;">
          <label>Preferred opening mode
            <select id="publisher-prism-preferred-mode">
              <option value="online"${preferred === 'online' ? ' selected' : ''}>Online first</option>
              <option value="local"${preferred === 'local' ? ' selected' : ''}>Local first</option>
            </select>
          </label>
          <p class="help" style="margin:0;max-width:680px;">Set Cloudflare URLs once. Local URLs remain as fallback for branch testing or offline development.</p>
        </div>
        <div class="form-grid">
          ${settingField('epkPublisherOnline', 'EPK Publisher online URL', 'https://<protected-publisher-url>/publisher/index.html')}
          ${settingField('epkPublisherLocal', 'EPK Publisher local URL', 'http://localhost:8095/publisher/index.html')}
          ${settingField('epkPublicOnline', 'EPK public online URL', 'https://<your-epk-domain>/')}
          ${settingField('epkPublicLocal', 'EPK public local URL', 'http://localhost:8095/')}
          ${settingField('focusOnline', 'Focus online URL', 'https://<protected-focus-url>/')}
          ${settingField('focusLocal', 'Focus local URL', 'http://localhost:8080/')}
          ${settingField('spectraOnline', 'Spectra online/local UI URL', '')}
          ${settingField('beamOnline', 'Beam docs/reference URL', '')}
        </div>
      </section>`;
  }

  function renderModal() {
    const publisherURL = window.location.href.split('#')[0];
    const currentPublicEPK = new URL('../', publisherURL).href;
    const currentPublisher = publisherURL;
    const cards = [
      {
        icon: 'ti-id-badge-2',
        title: 'EPK Publisher',
        status: 'Current workspace',
        description: 'Music profile content, media, promo kit, audience pages, and publishing controls.',
        onlineUrl: getUrl('epkPublisherOnline') || currentPublisher,
        localUrl: getUrl('epkPublisherLocal'),
        repoUrl: REPOS.epk
      },
      {
        icon: 'ti-world-www',
        title: 'Public EPK',
        status: 'Audience-facing site',
        description: 'Open the public music/press site separately from the private publisher tools.',
        onlineUrl: getUrl('epkPublicOnline') || currentPublicEPK,
        localUrl: getUrl('epkPublicLocal'),
        repoUrl: REPOS.epk
      },
      {
        icon: 'ti-target-arrow',
        title: 'Focus',
        status: 'Planning / daily OS',
        description: 'Tasks, timers, routines, journaling, AI task support, and the personal working-memory dashboard.',
        onlineUrl: getUrl('focusOnline'),
        localUrl: getUrl('focusLocal'),
        repoUrl: REPOS.focus
      },
      {
        icon: 'ti-brain',
        title: 'Spectra',
        status: 'AI cockpit',
        description: 'Future local-first AI orchestration, approvals, project memory, and capability control.',
        onlineUrl: getUrl('spectraOnline'),
        localUrl: getUrl('spectraLocal'),
        repoUrl: REPOS.spectra,
        soon: true
      },
      {
        icon: 'ti-books',
        title: 'Beam',
        status: 'AI reference layer',
        description: 'Context packs, handovers, architecture logs, research memory, schemas, and anti-drift guidance.',
        onlineUrl: getUrl('beamOnline'),
        localUrl: '',
        repoUrl: REPOS.beam,
        soon: true
      }
    ];

    return `
      <div id="publisher-prism-tools-modal" style="position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.46);display:flex;align-items:flex-start;justify-content:center;padding:5vh 16px;overflow:auto;">
        <section role="dialog" aria-modal="true" aria-label="Prism Tools" style="width:min(1080px,100%);background:var(--bg);border:1px solid var(--rule-strong);box-shadow:0 24px 80px rgba(0,0,0,.38);">
          <header style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:20px;border-bottom:1px solid var(--rule);background:var(--surface);">
            <div>
              <p class="kicker">Prism Tools</p>
              <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.7rem,3vw,2.4rem);line-height:1;color:var(--text);">One Prism workspace, online/local aware.</h2>
              <p class="help" style="max-width:760px;margin:9px 0 0;">Use Cloudflare URLs for normal work and local URLs only for testing branches or offline development.</p>
            </div>
            <button class="btn btn-secondary" type="button" id="publisher-prism-tools-close" title="Close Prism Tools"><i class="ti ti-x"></i></button>
          </header>

          ${renderSettings()}

          <section style="padding:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
            ${cards.map(card).join('')}
          </section>

          <footer style="padding:13px 20px;border-top:1px solid var(--rule);background:var(--surface);color:var(--muted);font-size:.82rem;display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;">
            <span>Centralised navigation, not a collapsed monolith.</span>
            <span>Later: replace with Prism Hub / Spectra cockpit.</span>
          </footer>
        </section>
      </div>`;
  }

  function bindModalEvents() {
    document.getElementById('publisher-prism-tools-close')?.addEventListener('click', closeModal);
    document.querySelectorAll('[data-prism-url]').forEach((button) => {
      button.addEventListener('click', () => openURL(button.dataset.prismUrl));
    });
    document.querySelectorAll('[data-prism-url-key]').forEach((input) => {
      input.addEventListener('change', () => setUrl(input.dataset.prismUrlKey, input.value));
      input.addEventListener('blur', () => setUrl(input.dataset.prismUrlKey, input.value));
    });
    document.getElementById('publisher-prism-preferred-mode')?.addEventListener('change', (event) => {
      setPreferredMode(event.target.value);
      showModal();
    });
  }

  function showModal() {
    document.getElementById('publisher-prism-tools-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', renderModal());
    bindModalEvents();
  }

  function closeModal() {
    document.getElementById('publisher-prism-tools-modal')?.remove();
  }

  function installLauncher() {
    if (document.getElementById('publisher-prism-tools-btn')) return;
    const topActions = document.querySelector('.top-actions');
    if (!topActions) return;
    const button = document.createElement('button');
    button.id = 'publisher-prism-tools-btn';
    button.className = 'btn btn-primary';
    button.type = 'button';
    button.innerHTML = '<i class="ti ti-apps"></i> Prism Tools';
    button.addEventListener('click', showModal);
    topActions.insertAdjacentElement('afterbegin', button);
  }

  window.openPublisherPrismTools = showModal;
  window.closePublisherPrismTools = closeModal;

  document.addEventListener('DOMContentLoaded', () => setTimeout(installLauncher, 0));
  setTimeout(installLauncher, 250);
})();
