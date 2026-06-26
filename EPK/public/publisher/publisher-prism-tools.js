/*
Prism suite launcher for EPK Publisher.
Keeps EPK bounded while providing top-level access to Focus, Spectra, and Beam.
*/
(function(){
  const FOCUS_URL_KEY = 'prism-tools-focus-url';
  const DEFAULT_FOCUS_URL = 'http://localhost:8080/';
  let prismToolsOpen = false;

  function safe(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function focusURL() {
    return localStorage.getItem(FOCUS_URL_KEY) || DEFAULT_FOCUS_URL;
  }

  function setFocusURL(value) {
    const next = String(value || '').trim();
    if (next) localStorage.setItem(FOCUS_URL_KEY, next);
    else localStorage.removeItem(FOCUS_URL_KEY);
  }

  function openURL(url) {
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  function card({ icon, title, status, description, primaryLabel, primaryUrl, secondaryLabel, secondaryUrl, soon }) {
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
          ${primaryUrl ? `<button class="btn btn-primary" type="button" data-prism-url="${safe(primaryUrl)}">${safe(primaryLabel || 'Open')}</button>` : ''}
          ${secondaryUrl ? `<button class="btn btn-secondary" type="button" data-prism-url="${safe(secondaryUrl)}">${safe(secondaryLabel || 'Repo')}</button>` : ''}
        </div>
      </article>`;
  }

  function renderModal() {
    const focus = focusURL();
    const publisherURL = window.location.href.split('#')[0];
    const publicEPK = new URL('../', publisherURL).href;
    const cards = [
      {
        icon: 'ti-id-badge-2',
        title: 'EPK Publisher',
        status: 'Current workspace',
        description: 'You are here: music profile content, media, promo kit, audience pages, and publishing.',
        primaryLabel: 'Open public EPK',
        primaryUrl: publicEPK,
        secondaryLabel: 'Open EPK repo',
        secondaryUrl: 'https://github.com/devknowsdev/EPK'
      },
      {
        icon: 'ti-target-arrow',
        title: 'Focus',
        status: 'Planning / daily OS',
        description: 'Tasks, timers, routines, journaling, AI task support, and the personal working-memory dashboard.',
        primaryLabel: 'Open Focus',
        primaryUrl: focus,
        secondaryLabel: 'Open Focus repo',
        secondaryUrl: 'https://github.com/devknowsdev/prism-focus'
      },
      {
        icon: 'ti-brain',
        title: 'Spectra',
        status: 'AI cockpit',
        description: 'Future local-first AI orchestration, approvals, project memory, and capability control.',
        primaryLabel: 'Open repo',
        primaryUrl: 'https://github.com/devknowsdev/prism-spectra',
        soon: true
      },
      {
        icon: 'ti-books',
        title: 'Beam',
        status: 'AI reference layer',
        description: 'Context packs, handovers, architecture logs, research memory, schemas, and anti-drift guidance.',
        primaryLabel: 'Open repo',
        primaryUrl: 'https://github.com/devknowsdev/prism-beam',
        soon: true
      }
    ];

    return `
      <div id="publisher-prism-tools-modal" style="position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.46);display:flex;align-items:flex-start;justify-content:center;padding:5vh 16px;overflow:auto;">
        <section role="dialog" aria-modal="true" aria-label="Prism Tools" style="width:min(980px,100%);background:var(--bg);border:1px solid var(--rule-strong);box-shadow:0 24px 80px rgba(0,0,0,.38);">
          <header style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:20px;border-bottom:1px solid var(--rule);background:var(--surface);">
            <div>
              <p class="kicker">Prism Tools</p>
              <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.7rem,3vw,2.4rem);line-height:1;color:var(--text);">One Prism workspace, bounded apps.</h2>
              <p class="help" style="max-width:720px;margin:9px 0 0;">Top-level access across the Prism suite without merging the codebases too early.</p>
            </div>
            <button class="btn btn-secondary" type="button" id="publisher-prism-tools-close" title="Close Prism Tools"><i class="ti ti-x"></i></button>
          </header>

          <section style="padding:16px 20px;border-bottom:1px solid var(--rule);background:rgba(255,255,255,.02);">
            <label>Focus local URL
              <input id="publisher-prism-focus-url" value="${safe(focus)}" placeholder="http://localhost:8080/">
            </label>
            <p class="help" style="margin:7px 0 0;">Change this if Focus is running on a different local port.</p>
          </section>

          <section style="padding:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            ${cards.map(card).join('')}
          </section>

          <footer style="padding:13px 20px;border-top:1px solid var(--rule);background:var(--surface);color:var(--muted);font-size:.82rem;display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;">
            <span>Centralised navigation, not a collapsed monolith.</span>
            <span>Later: replace with Prism Hub / Spectra cockpit.</span>
          </footer>
        </section>
      </div>`;
  }

  function showModal() {
    prismToolsOpen = true;
    document.getElementById('publisher-prism-tools-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', renderModal());
    document.getElementById('publisher-prism-tools-close')?.addEventListener('click', closeModal);
    document.getElementById('publisher-prism-focus-url')?.addEventListener('input', (event) => setFocusURL(event.target.value));
    document.querySelectorAll('[data-prism-url]').forEach((button) => {
      button.addEventListener('click', () => openURL(button.dataset.prismUrl));
    });
  }

  function closeModal() {
    prismToolsOpen = false;
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
