(function installEpkPromoCopyRefinement() {
  const DEFAULT_SPECTRA_URL = 'http://127.0.0.1:3000';
  const PROMO_INSTRUCTION = 'Refine this EPK promo copy for clarity, flow, and usefulness to presenters, venues, press, or collaborators. Preserve factual claims, names, dates, roles, and meaning. Do not invent details. Return only the revised copy.';

  function spectraBaseUrl() {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('adhd4_local_ai_url')) || '';
    const configured = window.__PRISM_SPECTRA_URL__ || window.__AI_FORGE_LOCAL_URL__ || stored || DEFAULT_SPECTRA_URL;
    return String(configured).replace(/\/$/, '');
  }

  function localToken() {
    return (typeof localStorage !== 'undefined' && localStorage.getItem('adhd4_local_ai_token'))
      || window.__PRISM_SPECTRA_TOKEN__
      || window.__AI_FORGE_LOCAL_TOKEN__
      || '';
  }

  function buildRequestPayload(text, field = 'brief-text') {
    return {
      sourceApp: 'EPK',
      intent: 'career.refine_epk_promo_copy',
      riskClass: 'read-only',
      preferredMode: 'local-first',
      input: {
        text,
        instruction: PROMO_INSTRUCTION
      },
      context: {
        appSurface: 'publisher',
        field
      }
    };
  }

  function extractSuggestion(result) {
    const structured = result?.structuredResponse;
    if (typeof structured === 'string') return structured.trim();
    if (structured && typeof structured === 'object') {
      const candidate = structured.refinedText || structured.suggestion || structured.text;
      if (typeof candidate === 'string') return candidate.trim();
    }
    return typeof result?.response === 'string' ? result.response.trim() : '';
  }

  function getUi() {
    return {
      button: document.getElementById('refine-promo-copy-btn'),
      source: document.getElementById('brief-text'),
      panel: document.getElementById('promo-refine-suggestion'),
      status: document.getElementById('promo-refine-status'),
      draft: document.getElementById('promo-refine-draft')
    };
  }

  function showPublisherStatus(type, message) {
    if (typeof window.setStatus === 'function') window.setStatus(type, message);
  }

  function clearSuggestion() {
    const { panel, status, draft } = getUi();
    if (panel) panel.hidden = true;
    if (status) status.textContent = '';
    if (draft) draft.value = '';
  }

  async function requestSuggestion() {
    const { button, source, panel, status, draft } = getUi();
    if (!button || !source || !panel || !status || !draft) return;

    const text = source.value.trim();
    if (!text) {
      panel.hidden = false;
      status.textContent = 'Generate a promo brief before asking Spectra to refine it.';
      draft.value = '';
      draft.hidden = true;
      showPublisherStatus('warn', status.textContent);
      return;
    }

    const token = localToken();
    if (!token) {
      panel.hidden = false;
      status.textContent = 'Spectra is not configured for this browser. Set the local Spectra token before requesting a promo copy suggestion.';
      draft.value = '';
      draft.hidden = true;
      showPublisherStatus('warn', status.textContent);
      return;
    }

    panel.hidden = false;
    status.textContent = 'Asking Spectra for a read-only promo copy suggestion…';
    draft.value = '';
    draft.hidden = true;
    button.disabled = true;

    try {
      const response = await fetch(`${spectraBaseUrl()}/api/v1/ai/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-local-token': token
        },
        body: JSON.stringify(buildRequestPayload(text))
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        throw new Error(result.error || result.response || `Spectra request failed (${response.status})`);
      }

      const suggestion = extractSuggestion(result);
      if (!suggestion) throw new Error('Spectra returned an empty promo copy suggestion.');

      draft.value = suggestion;
      draft.hidden = false;
      status.textContent = 'Draft suggestion only — the generated promo brief remains unchanged.';
    } catch (error) {
      status.textContent = `Could not refine promo copy: ${error.message}`;
      draft.value = '';
      draft.hidden = true;
    } finally {
      button.disabled = false;
    }
  }

  function bindPromoRefinementControls() {
    document.getElementById('refine-promo-copy-btn')?.addEventListener('click', requestSuggestion);
    document.getElementById('discard-promo-refine-btn')?.addEventListener('click', clearSuggestion);
  }

  window.EPKCareerPromoRefine = {
    buildRequestPayload,
    clearSuggestion,
    extractSuggestion,
    requestSuggestion
  };

  document.addEventListener('DOMContentLoaded', bindPromoRefinementControls);
})();
