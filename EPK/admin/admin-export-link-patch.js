/*
MODULE: admin-export-link-patch.js
PURPOSE: Keep draft previews distinct from clean client links and show a visible print/client-link log.
NOTE: Draft HTML and print/PDF previews use temporary snapshotKey routes because they can show unpublished browser edits.
*/
(function(){
  const LOG_KEY = 'epk-admin-print-link-log-v1';

  function currentMode(){
    return window.getActiveAdminMode?.() || 'default';
  }

  function liveEPKUrl(){
    return new URL('/EPK/', window.location.origin).href;
  }

  function liveModeUrl(){
    const mode = currentMode();
    const url = new URL('/EPK/', window.location.origin);
    if (mode && mode !== 'default') url.searchParams.set('for', mode);
    return url.href;
  }

  function readLog(){
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }
    catch { return []; }
  }

  function writeLog(items){
    localStorage.setItem(LOG_KEY, JSON.stringify(items.slice(0, 40)));
  }

  function recordPrintLog(entry){
    const item = {
      at: new Date().toISOString(),
      mode: currentMode(),
      ...entry
    };
    writeLog([item, ...readLog()]);
    renderPrintLog();
  }

  function labelForKind(kind){
    if (kind === 'frozen') return 'Frozen client version';
    if (kind === 'live') return 'Live client link';
    if (kind === 'copy') return 'Copied live link';
    if (kind === 'draft-html') return 'Current draft HTML preview';
    if (kind === 'draft-print') return 'Current draft print/PDF preview';
    return 'Output';
  }

  function renderPrintLog(){
    const list = document.getElementById('admin-print-link-log-list');
    if (!list) return;
    const items = readLog();
    if (!items.length) {
      list.innerHTML = '<p class="field-help">No client links or print previews recorded in this browser yet.</p>';
      return;
    }
    list.innerHTML = items.slice(0, 12).map(item => {
      const date = new Date(item.at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
      const url = item.url || '';
      const frozen = item.kind === 'frozen' ? 'Yes' : 'No';
      return `<div class="status ${item.kind === 'frozen' ? 'success' : item.kind === 'draft-print' ? 'loading' : ''}" style="white-space:normal;margin:6px 0;">
        <strong>${labelForKind(item.kind)}</strong><br>
        <span class="field-help">${date} · mode: ${escAttr(item.mode || 'default')} · frozen: ${frozen}</span><br>
        ${url ? `<code style="word-break:break-all;">${escAttr(url)}</code>` : ''}
      </div>`;
    }).join('');
  }

  function clearPrintLog(){
    if (!confirm('Clear the print/client link log for this browser?')) return;
    localStorage.removeItem(LOG_KEY);
    renderPrintLog();
  }

  function relabelExportModal(){
    const modal = document.getElementById('export-modal');
    if (!modal) return;

    const help = modal.querySelector('.help-box');
    if (help) {
      help.innerHTML = '<strong>Draft previews and client links are different.</strong><br>Preview current draft HTML or PDF to review unpublished edits. Open or copy the live EPK only when you need a public client link. Dated <code>/EPK/YYYY-MM-DD/</code> pages are frozen client versions.';
    }

    const row = modal.querySelector('.button-row');
    if (row && row.dataset.publicLinkPatched !== '1') {
      row.dataset.publicLinkPatched = '1';
      row.innerHTML = '<button type="button" onclick="openPrintView(false)">Preview current draft HTML</button><button type="button" onclick="openPrintView(true)">Print draft / Save PDF</button><button type="button" onclick="openLiveClientEPK()">Open live client EPK</button><button type="button" onclick="copyLiveClientEPK(this)">Copy live EPK URL</button><button type="button" onclick="downloadJSON()">Backup JSON</button>';
    }

    const note = modal.querySelector('p.field-help');
    if (note) {
      note.innerHTML = 'Draft preview URLs are browser-only and must not be sent to clients. Send <code>' + liveEPKUrl() + '</code> for the live EPK, or use a dated freeze from Publisher for a stable client version.';
    }

    if (!document.getElementById('admin-print-link-log')) {
      const body = modal.querySelector('.panel-body');
      if (body) {
        body.insertAdjacentHTML('beforeend', `
          <section id="admin-print-link-log" class="status" style="white-space:normal;">
            <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;">
              <div>
                <strong>Print / client link log</strong>
                <div class="field-help">Stored in this browser. Use it to see whether an output was live, draft, or frozen.</div>
              </div>
              <button type="button" onclick="clearAdminPrintLog()">Clear log</button>
            </div>
            <div id="admin-print-link-log-list"></div>
          </section>`);
      }
    }
    renderPrintLog();
  }

  const originalOpenPrintView = window.openPrintView;
  if (typeof originalOpenPrintView === 'function' && originalOpenPrintView.__printLogPatched !== true) {
    window.openPrintView = function patchedOpenPrintView(shouldPrint){
      const url = originalOpenPrintView.apply(this, arguments);
      recordPrintLog({
        kind: shouldPrint ? 'draft-print' : 'draft-html',
        frozen: false,
        note: 'Temporary browser-only draft preview. Not a public client link.',
        url
      });
      return url;
    };
    window.openPrintView.__printLogPatched = true;
  }

  window.openLiveClientEPK = function openLiveClientEPK(){
    const url = liveModeUrl();
    recordPrintLog({ kind: 'live', frozen: false, url, note: 'Live/latest EPK; changes when the site is updated.' });
    window.open(url, '_blank', 'noopener');
  };

  window.copyLiveClientEPK = async function copyLiveClientEPK(button){
    const url = liveModeUrl();
    recordPrintLog({ kind: 'copy', frozen: false, url, note: 'Copied live/latest EPK URL.' });
    try {
      const copied = typeof window.copyAdminText === 'function'
        ? await window.copyAdminText(url)
        : (await navigator.clipboard.writeText(url), true);
      if (!copied) throw new Error('Clipboard unavailable');
      if (button) {
        const label = button.textContent;
        button.textContent = 'Copied ✓';
        button.disabled = true;
        setTimeout(() => {
          button.textContent = label;
          button.disabled = false;
        }, 1400);
      }
      if (typeof toast === 'function') toast('Copied live EPK URL');
      else console.log('Copied live EPK URL:', url);
    } catch {
      if (typeof toast === 'function') toast('Could not copy live EPK URL');
    }
  };

  window.recordAdminFrozenEPK = function recordAdminFrozenEPK(url, mode){
    recordPrintLog({ kind: 'frozen', frozen: true, mode: mode || currentMode(), url, note: 'Dated frozen client package.' });
  };

  window.clearAdminPrintLog = clearPrintLog;

  const originalOpenExport = window.openExport;
  if (typeof originalOpenExport === 'function' && originalOpenExport.__publicLinkPatched !== true) {
    window.openExport = function patchedOpenExport(){
      originalOpenExport.apply(this, arguments);
      setTimeout(relabelExportModal, 0);
    };
    window.openExport.__publicLinkPatched = true;
  }

  function escAttr(value){
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  document.addEventListener('DOMContentLoaded', () => {
    relabelExportModal();
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.title = 'Open/copy clean client EPK URL or preview draft PDF.';
  });
})();
