(function installEpkCopyRefinement() {
  const DEFAULT_SPECTRA_URL = 'http://127.0.0.1:3000';
  const DYNAMIC_DESCRIPTION_KINDS = ['offerings', 'credits'];
  const suggestions = new Map();

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

  function buildRequestPayload(text, field) {
    return {
      sourceApp: 'EPK',
      intent: 'career.refine_epk_copy',
      riskClass: 'read-only',
      preferredMode: 'local-first',
      input: {
        text,
        instruction: 'Refine this EPK copy for clarity and flow. Preserve factual claims, names, and meaning. Do not invent details. Return only the revised copy.'
      },
      context: {
        appSurface: 'publisher',
        field
      }
    };
  }

  function dynamicDescriptionTargetId(kind, index) {
    return `copy-${kind}-${index}-description`;
  }

  function dynamicDescriptionField(kind, index) {
    return `${kind}[${index}].description`;
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

  async function requestSuggestion(targetId, button) {
    const source = document.getElementById(targetId);
    const panel = document.querySelector(`[data-refine-suggestion="${targetId}"]`);
    const status = panel?.querySelector('.refine-copy-status');
    const draft = panel?.querySelector('.refine-copy-draft');
    const field = source?.closest('[data-refine-field]')?.dataset.refineField || targetId;
    const text = source?.value.trim() || '';
    const token = localToken();

    if (!source || !panel || !status || !draft) return;
    if (!text) {
      showPublisherStatus('warn', 'Add some copy before asking Spectra to refine it.');
      source.focus();
      return;
    }
    if (!token) {
      showPublisherStatus('warn', 'Spectra is not configured for this browser. Set the local Spectra token before requesting a draft suggestion.');
      return;
    }

    panel.hidden = false;
    status.textContent = 'Asking Spectra for a read-only draft suggestion…';
    draft.value = '';
    draft.hidden = true;
    toggleSuggestionActions(panel, true);
    button.disabled = true;

    try {
      const response = await fetch(`${spectraBaseUrl()}/api/v1/ai/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-local-token': token
        },
        body: JSON.stringify(buildRequestPayload(text, field))
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        throw new Error(result.error || result.response || `Spectra request failed (${response.status})`);
      }

      const suggestion = extractSuggestion(result);
      if (!suggestion) throw new Error('Spectra returned an empty suggestion.');

      suggestions.set(targetId, suggestion);
      draft.value = suggestion;
      draft.hidden = false;
      status.textContent = 'Draft suggestion only — review it, then apply or discard it.';
      toggleSuggestionActions(panel, false);
    } catch (error) {
      suggestions.delete(targetId);
      status.textContent = `Could not get a suggestion: ${error.message}`;
      draft.value = '';
      draft.hidden = true;
      toggleSuggestionActions(panel, true);
    } finally {
      button.disabled = false;
    }
  }

  function applySuggestion(targetId) {
    const source = document.getElementById(targetId);
    const suggestion = suggestions.get(targetId);
    if (!source || !suggestion) return;

    source.value = suggestion;
    source.dispatchEvent(new Event('input', { bubbles: true }));
    clearSuggestion(targetId);
    showPublisherStatus('warn', 'Suggestion applied to the local editor. Review it and save the browser draft when ready.');
    source.focus();
  }

  function clearSuggestion(targetId) {
    const panel = document.querySelector(`[data-refine-suggestion="${targetId}"]`);
    suggestions.delete(targetId);
    if (!panel) return;
    panel.hidden = true;
    const draft = panel.querySelector('.refine-copy-draft');
    if (draft) draft.value = '';
  }

  function toggleSuggestionActions(panel, disabled) {
    panel.querySelectorAll('[data-apply-refine], [data-discard-refine]').forEach(button => {
      button.disabled = disabled;
    });
  }

  function showPublisherStatus(type, message) {
    if (typeof window.setStatus === 'function') {
      window.setStatus(type, message);
    }
  }

  function bindRefinementControls() {
    document.addEventListener('click', (event) => {
      const refineButton = event.target.closest('[data-refine-copy]');
      if (refineButton) {
        requestSuggestion(refineButton.dataset.refineCopy, refineButton);
        return;
      }

      const applyButton = event.target.closest('[data-apply-refine]');
      if (applyButton) {
        applySuggestion(applyButton.dataset.applyRefine);
        return;
      }

      const discardButton = event.target.closest('[data-discard-refine]');
      if (discardButton) {
        clearSuggestion(discardButton.dataset.discardRefine);
      }
    });
  }

  function decorateDynamicDescriptionFields() {
    DYNAMIC_DESCRIPTION_KINDS.forEach(kind => {
      const container = document.getElementById(`${kind}-list`);
      if (!container) return;

      [...container.querySelectorAll('.item-card')].forEach((card, index) => {
        const textarea = card.querySelector('label.wide textarea');
        if (!textarea || textarea.dataset.refineCopyReady === 'true') return;

        const targetId = dynamicDescriptionTargetId(kind, index);
        const label = textarea.closest('label');
        if (!label) return;

        textarea.id = targetId;
        textarea.dataset.refineCopyReady = 'true';
        label.classList.add('refine-copy-field');
        label.dataset.refineField = dynamicDescriptionField(kind, index);
        replaceLeadingLabelText(label);
        label.insertBefore(buildDynamicRefineHead(targetId, 'Description'), textarea);
        label.after(buildSuggestionPanel(targetId, `Suggested ${singular(kind)} description edit`));
      });
    });
  }

  function replaceLeadingLabelText(label) {
    const textNode = [...label.childNodes].find(node => node.nodeType === 3 && node.textContent.trim());
    if (textNode) {
      textNode.textContent = '';
      return;
    }
    label.insertBefore(document.createTextNode(''), label.firstChild);
  }

  function buildDynamicRefineHead(targetId, label) {
    const head = document.createElement('div');
    head.className = 'refine-copy-head';

    const text = document.createElement('span');
    text.textContent = label;

    const button = document.createElement('button');
    button.className = 'btn btn-secondary btn-sm';
    button.type = 'button';
    button.dataset.refineCopy = targetId;
    button.textContent = 'Refine copy';
    button.setAttribute('aria-label', `Refine ${label.toLowerCase()} copy`);

    head.append(text, button);
    return head;
  }

  function buildSuggestionPanel(targetId, label) {
    const panel = document.createElement('div');
    panel.className = 'refine-copy-suggestion wide';
    panel.dataset.refineSuggestion = targetId;
    panel.hidden = true;
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <p class="refine-copy-status"></p>
      <textarea class="refine-copy-draft" rows="4" readonly aria-label="${label}"></textarea>
      <div class="action-list refine-copy-actions">
        <button class="btn btn-primary btn-sm" type="button" data-apply-refine="${targetId}">Apply suggestion</button>
        <button class="btn btn-secondary btn-sm" type="button" data-discard-refine="${targetId}">Discard</button>
      </div>`;
    return panel;
  }

  function observeDynamicDescriptionFields() {
    DYNAMIC_DESCRIPTION_KINDS.forEach(kind => {
      const container = document.getElementById(`${kind}-list`);
      if (!container || typeof MutationObserver === 'undefined') return;
      const observer = new MutationObserver(() => decorateDynamicDescriptionFields());
      observer.observe(container, { childList: true, subtree: true });
    });
  }

  function singular(kind) {
    return ({ offerings: 'offering', credits: 'credit' })[kind] || kind;
  }

  window.EPKCareerRefineCopy = {
    buildRequestPayload,
    dynamicDescriptionField,
    dynamicDescriptionTargetId,
    extractSuggestion
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindRefinementControls();
    decorateDynamicDescriptionFields();
    observeDynamicDescriptionFields();
  });
})();
