/*
Phase 1 publisher fixes loaded before DOMContentLoaded initPublisher runs.
*/
(function(){
  let draftSaveTimer = null;

  // EPK-QF1: debounce the expensive browser-draft write while keeping dirty/status immediate.
  try {
    markDirty = function(message) {
      dirty = true;
      setStatus('warn', `${message}. Unsaved changes are held in this browser until you publish or download.`);
      clearTimeout(draftSaveTimer);
      draftSaveTimer = setTimeout(() => {
        localStorage.setItem('epk-publisher-draft', JSON.stringify(currentData));
      }, 500);
    };
  } catch (e) {
    console.warn('publisher phase1 fixes: failed to patch markDirty', e);
  }

  // EPK-QF2: keep renderBio pure-ish; persistent handlers are delegated once here.
  try {
    renderBio = function() {
      els['bio-short'].value = currentData.bio?.short || '';
      els['bio-acoustic'].value = currentData.bio?.acoustic || '';
      els['bio-full'].value = Array.isArray(currentData.bio?.full)
        ? currentData.bio.full.join('\n\n')
        : (currentData.bio?.full || '');
    };

    document.addEventListener('input', event => {
      if (event.target.id === 'bio-short') {
        updateBioField('short', event.target.value);
        return;
      }
      if (event.target.id === 'bio-acoustic') {
        updateBioField('acoustic', event.target.value);
        return;
      }
      if (event.target.id === 'bio-full') {
        currentData.bio.full = event.target.value.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
        markDirty('Full bio updated');
        renderJSON(false);
      }
    });
  } catch (e) {
    console.warn('publisher phase1 fixes: failed to patch bio handlers', e);
  }
})();
