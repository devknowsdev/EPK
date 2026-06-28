/*
MODULE: admin-export-link-patch.js
PURPOSE: Make old Admin Print / Export use clean client links and show a visible print/client-link log.
NOTE: Draft print/PDF preview still uses the temporary snapshotKey route because it can show unpublished browser edits.
*/
(function(){
  const LOG_KEY = 'epk-admin-print-link-log-v1';

  function currentMode(){
    return window.activeMode || 'default';
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
    if (kind === 'draft-print') return 'Draft print/PDF preview';
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
      help.innerHTML = '<strong>Client links are public-facing.</strong><br><code>/EPK/</code> is the live client link. A dated <code>/EPK/YYYY-MM-DD/</code> page is the frozen client version. Draft print/PDF preview may still use a temporary browser-only draft URL so unpublished edits can be previewed.';
    }

    const row = modal.querySelector('.button-row');
    if (row && row.dataset.publicLinkPatched !== '1') {
      row.dataset.publicLinkPatched = '1';
      row.innerHTML = '<button onclick="openLiveClientEPK()">Open live client EPK</button><button onclick="copyLiveClientEPK()">Copy live EPK URL</button><button onclick="openPrintView(true)">Draft print / Save PDF</button><button onclick="downloadJSON()">Backup JSON</button>';
    }

    const note = modal.querySelector('p.field-help');
    if (note) {
      note.innerHTML = 'Send clients <code>' + liveEPKUrl() + '</code> for the live EPK. Use dated freezes from Publisher for stable meeting links. The draft print/PDF route is temporary and should not be sent as a client URL.';
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
      if (shouldPrint) {
        const before = Date.now();
        originalOpenPrintView.apply(this, arguments);
        recordPrintLog({
          kind: 'draft-print',
          frozen: false,
          note: 'Temporary draft print/PDF preview. Not a frozen client page.',
          url: new URL('/print?for=' + encodeURIComponent(currentMode()) + '&print=1&snapshotKey=draft-' + before, location.origin).href
        });
        return;
      }
      window.openLiveClientEPK();
    };
    window.openPrintView.__printLogPatched = true;
  }

  window.openLiveClientEPK = function openLiveClientEPK(){
    const url = liveModeUrl();
    recordPrintLog({ kind: 'live', frozen: false, url, note: 'Live/latest EPK; changes when the site is updated.' });
    window.open(url, '_blank');
  };

  window.copyLiveClientEPK = async function copyLiveClientEPK(){
    const url = liveModeUrl();
    recordPrintLog({ kind: 'copy', frozen: false, url, note: 'Copied live/latest EPK URL.' });
    try {
      await navigator.clipboard.writeText(url);
      if (typeof toast === 'function') toast('Copied live EPK URL');
      else console.log('Copied live EPK URL:', url);
    } catch {
      window.prompt('Copy live EPK URL:', url);
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
