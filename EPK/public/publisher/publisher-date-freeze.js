/*
MODULE: publisher-date-freeze.js
PURPOSE: Publish frozen client EPK packages at /EPK/YYYY-MM-DD/ so sent links remain stable.
SAFETY: No token is stored; uses the existing publisher GitHub token field for this session only.
*/
(function(){
  const DATE_ROUTE_ROOT = 'EPK';
  const DEFAULT_FREEZE_MODE = 'default';

  installVisibleLabelsWhenReady();
  installFunctionalBinderWhenReady();

  function installVisibleLabelsWhenReady(attempt=0){
    const snapshotBtn = document.getElementById('publish-snapshot-btn');
    if (snapshotBtn) {
      applyVisibleFreezeLabels();
      return;
    }
    if (attempt < 80) setTimeout(() => installVisibleLabelsWhenReady(attempt + 1), 100);
  }

  function installFunctionalBinderWhenReady(attempt=0){
    const ready = typeof currentData !== 'undefined' && currentData && typeof readPublishConfig === 'function' && typeof commitFile === 'function';
    if (ready) return installDateFreezePublisher();
    if (attempt < 80) setTimeout(() => installFunctionalBinderWhenReady(attempt + 1), 100);
  }

  function installDateFreezePublisher(){
    applyVisibleFreezeLabels();
    const snapshotBtn = document.getElementById('publish-snapshot-btn');
    if (snapshotBtn && snapshotBtn.dataset.dateFreezeReady !== '1') {
      snapshotBtn.dataset.dateFreezeReady = '1';
      snapshotBtn.onclick = publishDatedClientEPK;
    }
  }

  function applyVisibleFreezeLabels(){
    updatePublisherCopy();
    const snapshotBtn = document.getElementById('publish-snapshot-btn');
    if (snapshotBtn && snapshotBtn.dataset.dateFreezeLabelled !== '1') {
      snapshotBtn.dataset.dateFreezeLabelled = '1';
      snapshotBtn.textContent = 'Freeze dated client EPK';
      snapshotBtn.classList.remove('btn-secondary');
      snapshotBtn.classList.add('btn-primary');
      snapshotBtn.title = 'Create a stable /EPK/YYYY-MM-DD/ client link.';
    }

    const copyBtn = document.getElementById('copy-last-url-btn');
    if (copyBtn) copyBtn.textContent = 'Copy last client URL';
  }

  function updatePublisherCopy(){
    const snapshotInput = document.getElementById('gh-snapshot-path');
    if (snapshotInput) {
      snapshotInput.value = 'EPK/public/EPK';
      const label = snapshotInput.closest('label');
      if (label && label.firstChild) label.firstChild.textContent = 'Dated client folder';
      snapshotInput.title = 'Frozen client EPK packages are written under EPK/public/EPK/YYYY-MM-DD/';
    }

    const publishPanel = document.querySelector('#page-publish .grid.two .panel');
    if (publishPanel && !document.getElementById('client-freeze-note')) {
      publishPanel.insertAdjacentHTML('beforeend', `
        <div id="client-freeze-note" class="status success" style="margin-top:12px;white-space:normal;">
          <strong>Dated client freeze:</strong> creates a stable package at <code>/EPK/YYYY-MM-DD/</code>. Use this for client/business links you do not want changing after later edits.
        </div>`);
    }

    document.querySelectorAll('#page-publish .rules li').forEach(li => {
      if (li.textContent.includes('/published/<id>/') || li.textContent.includes('Snapshots are immutable')) {
        li.innerHTML = 'Dated client packages are frozen at <code>/EPK/YYYY-MM-DD/</code>.';
      }
    });
  }

  async function publishDatedClientEPK(){
    if (typeof validateData === 'function' && !validateData()) return;
    const config = readPublishConfig();
    if (!config.token) return setStatus('error', 'Paste a GitHub token before freezing a dated client EPK.');

    const date = new Date().toISOString().slice(0, 10);
    const modeKey = document.getElementById('preview-mode')?.value || DEFAULT_FREEZE_MODE;
    const folder = datedFolderPath(config, date);
    const url = `/${DATE_ROUTE_ROOT}/${date}/`;

    if (!confirm(`Freeze the current EPK as ${url}?\n\nUse this for client/business links that should remain stable.`)) return;

    try {
      const html = buildFrozenClientHTML(currentData, { date, modeKey, url });
      const data = JSON.stringify(currentData, null, 2) + '\n';
      const manifest = JSON.stringify({
        type: 'epk-client-freeze',
        date,
        modeKey,
        url,
        createdAt: new Date().toISOString(),
        source: 'EPK Publisher',
        note: 'Frozen client-facing EPK package. Do not edit in place except emergency typo/contact fixes.'
      }, null, 2) + '\n';

      await commitFile(config, `${folder}/index.html`, html, `Freeze EPK client package ${date}`);
      await commitFile(config, `${folder}/epk.json`, data, `Freeze EPK data ${date}`);
      await commitFile(config, `${folder}/manifest.json`, manifest, `Add EPK freeze manifest ${date}`);

      lastPublishedURL = url;
      localStorage.setItem('epk-publisher-last-url', lastPublishedURL);
      setStatus('success', `Frozen client EPK published: ${url}\nThis dated link is intended to stay stable after future live EPK edits.`);
    } catch (error) {
      setStatus('error', `Could not freeze client EPK: ${error.message}`);
    }
  }

  function datedFolderPath(config, date){
    const dataPath = config.dataPath || 'EPK/public/data/epk.json';
    const publicRoot = dataPath.replace(/\/data\/epk\.json$/i, '') || 'EPK/public';
    return `${publicRoot}/${DATE_ROUTE_ROOT}/${date}`;
  }

  function buildFrozenClientHTML(data, options){
    const safeData = clone(data || {});
    const modeKey = options.modeKey || DEFAULT_FREEZE_MODE;
    const mode = safeData.modes?.[modeKey] || safeData.modes?.default || {};
    const name = safeData.meta?.name || 'Dave Knowles';
    const sections = Array.isArray(mode.sections) && mode.sections.length ? mode.sections : ['bio','offerings','credits','videos','releases','gallery','contact'];
    const content = sections.map(section => renderFrozenSection(section, safeData, mode)).filter(Boolean).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} — EPK ${esc(options.date)}</title>
<meta name="description" content="Frozen client EPK for ${esc(name)}.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(options.url)}">
<style>${frozenCSS()}</style>
<script type="application/json" id="epk-frozen-data">${esc(JSON.stringify(safeData))}</script>
</head>
<body>
<header class="freeze-banner">
  <span>Dave Knowles EPK</span>
  <strong>Frozen client version · ${esc(options.date)}</strong>
</header>
<main>
  <section class="hero">
    ${mode.hero ? `<img src="${esc(frozenAssetURL(mode.hero))}" alt="${esc(name)}">` : ''}
    <div class="hero-copy">
      <p>${esc(mode.label || 'Electronic Press Kit')}</p>
      <h1>${esc(name)}</h1>
      <h2>${esc(safeData.meta?.tagline || '')}</h2>
      ${mode.heroCaption ? `<p class="caption">${esc(mode.heroCaption)}</p>` : ''}
    </div>
  </section>
  <div class="content">
    ${content}
  </div>
</main>
<footer>
  <p>This dated EPK is a frozen client version. Latest public EPK: <a href="/EPK/">/EPK</a></p>
</footer>
</body>
</html>`;
  }

  function renderFrozenSection(section, data, mode){
    if (section === 'bio') return renderBio(data, mode);
    if (section === 'offerings') return renderCards('Offerings', selectedByTags(data.offerings, mode.offeringTags || []));
    if (section === 'credits') return renderCredits(selectedByTags(data.credits, mode.creditTags || ['film','press','theatre','tv','festival']));
    if (section === 'videos') return renderLinks('Videos', selectedByTags(data.videos, mode.videoTags || []), 'Watch');
    if (section === 'releases') return renderLinks('Releases', data.releases || [], 'Listen');
    if (section === 'gallery') return renderGallery(data, mode);
    if (section === 'contact') return renderContact(data.meta || {});
    return '';
  }

  function renderBio(data, mode){
    const bio = data.bio || {};
    const style = mode.bioStyle || 'short';
    const paragraphs = style === 'full' && Array.isArray(bio.full)
      ? bio.full
      : [bio[style] || bio.short || ''].filter(Boolean);
    if (!paragraphs.length) return '';
    return `<section><p class="label">Biography</p>${paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</section>`;
  }

  function renderCards(title, items){
    if (!items?.length) return '';
    return `<section><p class="label">${esc(title)}</p><div class="grid">${items.map(item => `<article class="card"><h3>${esc(item.title || item.name || 'Untitled')}</h3>${item.description ? `<p>${esc(item.description)}</p>` : ''}</article>`).join('')}</div></section>`;
  }

  function renderCredits(items){
    if (!items?.length) return '';
    return `<section><p class="label">Selected credits</p>${items.map(item => `<article class="credit"><span>${esc(item.year || '')}</span><div><h3>${linkTitle(item.title || 'Credit', item.link)}</h3>${item.role ? `<strong>${esc(item.role)}</strong>` : ''}${item.description ? `<p>${esc(item.description)}</p>` : ''}</div></article>`).join('')}</section>`;
  }

  function renderLinks(title, items, action){
    if (!items?.length) return '';
    return `<section><p class="label">${esc(title)}</p><div class="grid">${items.map(item => `<article class="card"><h3>${esc(item.title || item.name || title)}</h3>${item.description ? `<p>${esc(item.description)}</p>` : ''}${item.url || item.link ? `<a href="${esc(item.url || item.link)}" target="_blank" rel="noopener">${esc(action)} ↗</a>` : ''}</article>`).join('')}</div></section>`;
  }

  function renderGallery(data, mode){
    const srcs = mode.galleryPhotos || [];
    if (!srcs.length) return '';
    const lookup = Object.fromEntries((data.gallery || []).map(photo => [photo.src, photo]));
    const photos = srcs.map(src => lookup[src] || { src, caption: '' }).slice(0, 9);
    return `<section><p class="label">Selected images</p><div class="gallery">${photos.map(photo => `<img src="${esc(frozenAssetURL(photo.src))}" alt="${esc(photo.caption || data.meta?.name || 'EPK image')}">`).join('')}</div></section>`;
  }

  function renderContact(meta){
    const social = meta.social || {};
    const rows = [
      meta.email ? `<a href="mailto:${esc(meta.email)}">${esc(meta.email)}</a>` : '',
      meta.phone ? `<a href="tel:${esc(String(meta.phone).replace(/\D/g,''))}">${esc(meta.phone)}</a>` : '',
      meta.website ? `<a href="${esc(meta.website)}" target="_blank" rel="noopener">Website</a>` : '',
      ...Object.entries(social).filter(([,url]) => url).map(([name,url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>`)
    ].filter(Boolean);
    if (!rows.length) return '';
    return `<section><p class="label">Contact & links</p><div class="contact">${rows.map(row => `<p>${row}</p>`).join('')}</div></section>`;
  }

  function selectedByTags(items, tags){
    if (!items?.length) return [];
    if (!tags?.length) return items;
    return items.filter(item => (item.tags || []).some(tag => tags.includes(tag)));
  }

  function linkTitle(title, url){
    return url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(title)} ↗</a>` : esc(title);
  }

  function frozenAssetURL(src){
    if (!src) return '';
    if (/^https?:\/\//i.test(src)) return src;
    if (String(src).startsWith('/')) return `..${src}`;
    return `../${String(src).replace(/^\.\//,'')}`;
  }

  function clone(value){
    try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
  }

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function frozenCSS(){
    return `:root{color-scheme:dark;--bg:#171913;--surface:#20241c;--ink:#f4ead7;--muted:#b8ad98;--accent:#d1a65a;--rule:rgba(244,234,215,.18)}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Georgia,'Times New Roman',serif;line-height:1.6}.freeze-banner{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:12px 22px;border-bottom:1px solid var(--rule);background:#11130f;color:var(--muted);font:700 12px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}.freeze-banner strong{color:var(--accent)}.hero{position:relative;min-height:70vh;display:grid;place-items:center;text-align:center;overflow:hidden}.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.52) saturate(.9)}.hero:after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.15),rgba(23,25,19,.85))}.hero-copy{position:relative;z-index:1;max-width:850px;padding:80px 24px}.hero-copy p:first-child,.label{color:var(--accent);font:800 12px system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase}.hero-copy h1{font-size:clamp(46px,9vw,108px);line-height:.95;margin:14px 0}.hero-copy h2{font-size:clamp(18px,3vw,32px);font-weight:400;color:var(--muted)}.caption{max-width:680px;margin:22px auto 0;color:var(--muted)}.content{max-width:1080px;margin:0 auto;padding:40px 22px 80px}section{border-top:1px solid var(--rule);padding:34px 0}section p{max-width:780px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}.card,.credit{background:var(--surface);border:1px solid var(--rule);padding:18px}.card h3,.credit h3{margin-top:0}.credit{display:grid;grid-template-columns:88px 1fr;gap:18px;margin-bottom:12px}.credit span{color:var(--accent);font:800 12px system-ui,sans-serif}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;border:1px solid var(--rule)}a{color:var(--accent)}footer{border-top:1px solid var(--rule);padding:26px 22px;text-align:center;color:var(--muted);font:13px system-ui,sans-serif}@media print{.freeze-banner,footer{display:none}.hero{min-height:48vh}body{background:#fff;color:#111}.card,.credit{background:#fff}}`;
  }
})();
