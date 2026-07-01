(function installEpkCopyConsistencyChecker() {
  const DEFAULT_SPECTRA_URL = 'http://127.0.0.1:3000';
  const REVIEW_INSTRUCTION = 'Review this EPK copy for internal consistency, duplicated ideas, unclear claims, tone mismatch, and factual drift. Do not rewrite the copy. Do not invent facts. Return findings only, grouped by field or item.';

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

  function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function cleanTags(tags) {
    return Array.isArray(tags) ? tags.map(cleanText).filter(Boolean) : [];
  }

  function buildCopySnapshot(data = {}) {
    const bio = data.bio || {};
    const fullBio = Array.isArray(bio.full)
      ? bio.full.map(cleanText).filter(Boolean)
      : cleanText(bio.full);

    return {
      bio: {
        short: cleanText(bio.short),
        acoustic: cleanText(bio.acoustic),
        full: fullBio
      },
      offerings: (Array.isArray(data.offerings) ? data.offerings : []).map(item => ({
        title: cleanText(item?.title),
        description: cleanText(item?.description),
        tags: cleanTags(item?.tags)
      })),
      credits: (Array.isArray(data.credits) ? data.credits : []).map(item => ({
        title: cleanText(item?.title),
        role: cleanText(item?.role),
        year: cleanText(String(item?.year ?? '')),
        description: cleanText(item?.description),
        tags: cleanTags(item?.tags)
      }))
    };
  }

  function buildRequestPayload(data) {
    return {
      sourceApp: 'EPK',
      intent: 'career.check_epk_copy_consistency',
      riskClass: 'read-only',
      preferredMode: 'local-first',
      input: {
        copy: buildCopySnapshot(data),
        instruction: REVIEW_INSTRUCTION
      },
      context: {
        appSurface: 'publisher',
        reviewType: 'copy-consistency'
      }
    };
  }

  function formatFinding(finding) {
    if (typeof finding === 'string') return finding.trim();
    if (!finding || typeof finding !== 'object') return '';

    const category = cleanText(finding.category || finding.type);
    const field = cleanText(finding.field || finding.path || finding.item);
    const message = cleanText(finding.message || finding.finding || finding.text || finding.detail);
    const prefix = [category && `[${category}]`, field].filter(Boolean).join(' ');
    if (message) return [prefix, message].filter(Boolean).join(': ');
    return JSON.stringify(finding, null, 2);
  }

  function formatFindings(value) {
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) {
      return value.map(formatFinding).filter(Boolean).map(line => `- ${line}`).join('\n');
    }
    if (value && typeof value === 'object') {
      const single = formatFinding(value);
      if (single && single !== JSON.stringify(value, null, 2)) return single;
      return JSON.stringify(value, null, 2);
    }
    return '';
  }

  function extractFindings(result) {
    const structured = result?.structuredResponse;
    if (structured && typeof structured === 'object' && !Array.isArray(structured)) {
      const candidate = structured.findings ?? structured.text ?? structured.suggestion;
      const formatted = formatFindings(candidate);
      if (formatted) return formatted;
    }

    const structuredText = formatFindings(structured);
    if (structuredText) return structuredText;
    return formatFindings(result?.response);
  }

  function getUi() {
    return {
      button: document.getElementById('copy-consistency-check-btn'),
      panel: document.getElementById('copy-consistency-findings'),
      status: document.getElementById('copy-consistency-status'),
      output: document.getElementById('copy-consistency-output')
    };
  }

  function showPublisherStatus(type, message) {
    if (typeof window.setStatus === 'function') window.setStatus(type, message);
  }

  function clearFindings() {
    const { panel, status, output } = getUi();
    if (panel) panel.hidden = true;
    if (status) status.textContent = '';
    if (output) {
      output.textContent = '';
      output.hidden = true;
    }
  }

  async function requestConsistency(data) {
    const { button, panel, status, output } = getUi();
    if (!button || !panel || !status || !output) return;

    const token = localToken();
    if (!token) {
      panel.hidden = false;
      status.textContent = 'Spectra is not configured for this browser. Set the local Spectra token before checking copy consistency.';
      output.textContent = '';
      output.hidden = true;
      showPublisherStatus('warn', status.textContent);
      return;
    }

    panel.hidden = false;
    status.textContent = 'Asking Spectra to review copy consistency…';
    output.textContent = '';
    output.hidden = true;
    button.disabled = true;

    try {
      const response = await fetch(`${spectraBaseUrl()}/api/v1/ai/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-local-token': token
        },
        body: JSON.stringify(buildRequestPayload(data))
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        throw new Error(result.error || result.response || `Spectra request failed (${response.status})`);
      }

      const findings = extractFindings(result);
      if (!findings) throw new Error('Spectra returned no consistency findings.');

      status.textContent = 'Read-only findings — review them against the source fields below.';
      output.textContent = findings;
      output.hidden = false;
    } catch (error) {
      status.textContent = `Could not check copy consistency: ${error.message}`;
      output.textContent = '';
      output.hidden = true;
    } finally {
      button.disabled = false;
    }
  }

  function publisherData() {
    return typeof currentData === 'undefined' || !currentData ? {} : currentData;
  }

  function bindConsistencyControls() {
    const { button } = getUi();
    const clearButton = document.getElementById('copy-consistency-clear-btn');
    button?.addEventListener('click', () => requestConsistency(publisherData()));
    clearButton?.addEventListener('click', clearFindings);
  }

  window.EPKCareerCopyConsistency = {
    buildCopySnapshot,
    buildRequestPayload,
    clearFindings,
    extractFindings,
    requestConsistency
  };

  document.addEventListener('DOMContentLoaded', bindConsistencyControls);
})();
