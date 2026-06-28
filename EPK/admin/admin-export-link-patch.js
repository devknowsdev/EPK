/*
MODULE: admin-export-link-patch.js
PURPOSE: Make old Admin Print / Export use clean client links for public HTML.
NOTE: Draft print/PDF preview still uses the temporary snapshotKey route because it can show unpublished browser edits.
*/
(function(){
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

  function relabelExportModal(){
    const modal = document.getElementById('export-modal');
    if (!modal || modal.dataset.publicLinkPatched === '1') return;
    modal.dataset.publicLinkPatched = '1';

    const help = modal.querySelector('.help-box');
    if (help) {
      help.innerHTML = '<strong>Client links are public-facing.</strong><br>Open live client EPK uses the clean <code>/EPK/</code> route. Draft print/PDF preview may still use a temporary browser-only draft URL so unpublished edits can be previewed.';
    }

    const row = modal.querySelector('.button-row');
    if (row) {
      row.innerHTML = '<button onclick="openLiveClientEPK()">Open live client EPK</button><button onclick="copyLiveClientEPK()">Copy live EPK URL</button><button onclick="openPrintView(true)">Draft print / Save PDF</button><button onclick="downloadJSON()">Backup JSON</button>';
    }

    const note = modal.querySelector('p.field-help');
    if (note) {
      note.innerHTML = 'Send clients <code>' + liveEPKUrl() + '</code> for the live EPK. Use dated freezes from Publisher for stable meeting links. The draft print/PDF route is temporary and should not be sent as a client URL.';
    }
  }

  window.openLiveClientEPK = function openLiveClientEPK(){
    window.open(liveModeUrl(), '_blank');
  };

  window.copyLiveClientEPK = async function copyLiveClientEPK(){
    const url = liveModeUrl();
    try {
      await navigator.clipboard.writeText(url);
      if (typeof toast === 'function') toast('Copied live EPK URL');
      else console.log('Copied live EPK URL:', url);
    } catch {
      window.prompt('Copy live EPK URL:', url);
    }
  };

  const originalOpenExport = window.openExport;
  if (typeof originalOpenExport === 'function' && originalOpenExport.__publicLinkPatched !== true) {
    window.openExport = function patchedOpenExport(){
      originalOpenExport.apply(this, arguments);
      setTimeout(relabelExportModal, 0);
    };
    window.openExport.__publicLinkPatched = true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    relabelExportModal();
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.title = 'Open/copy clean client EPK URL or preview draft PDF.';
  });
})();
