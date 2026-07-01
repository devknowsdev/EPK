(function installEpkRouteTagHelper() {
  const DEFAULT_SPECTRA_URL = 'http://127.0.0.1:3000';
  const ROUTE_INSTRUCTION = 'Review this EPK route/page context and existing EPK content. Suggest which existing tags, offerings, credits, or biography angles best fit this audience route. Do not invent facts. Do not rewrite copy. Do not apply tags. Return recommendations only, grouped by content area.';

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

  function buildContentSnapshot(data = {}) {
    const bio = data.bio || {};
    return {
      bio: {
        short: cleanText(bio.short),
        acoustic: cleanText(bio.acoustic),
        full: Array.isArray(bio.full)
          ? bio.full.map(cleanText).filter(Boolean)
          : cleanText(bio.full)
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

  function buildRouteSnapshot(data = {}, routeId) {
    const route = data.modes?.[routeId] || {};
    return {
      id: cleanText(routeId),
      label: cleanText(route.label || routeId),
      audience: cleanText(route.heroCaption),
      bioStyle: cleanText(route.bioStyle),
      sections: cleanTags(route.sections),
      offeringTags: cleanTags(route.offeringTags),
      videoTags: cleanTags(route.videoTags)
    };
  }

  function buildRequestPayload(data, routeId) {
    return {
      sourceApp: 'EPK',
      intent: 'career.suggest_epk_route_tags',
      riskClass: 'read-only',
      preferredMode: 'local-first',
      input: {
        route: buildRouteSnapshot(data, routeId),
        content: buildContentSnapshot(data),
        instruction: ROUTE_INSTRUCTION
      },
      context: {
        appSurface: 'publisher',
        reviewType: 'route-tag-recommendations'
      }
    };
  }

  function formatRecommendation(item) {
    if (typeof item === 'string') return item.trim();
    if (!item || typeof item !== 'object') return '';

    const area = cleanText(item.area || item.category || item.type);
    const target = cleanText(item.field || item.item || item.title || item.tag);
    const message = cleanText(item.recommendation || item.message || item.finding || item.text || item.detail);
    const prefix = [area && `[${area}]`, target].filter(Boolean).join(' ');
    if (message) return [prefix, message].filter(Boolean).join(': ');
    return JSON.stringify(item, null, 2);
  }

  function formatRecommendations(value) {
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) {
      return value.map(formatRecommendation).filter(Boolean).map(line => `- ${line}`).join('\n');
    }
    if (value && typeof value === 'object') return JSON.stringify(value, null, 2);
    return '';
  }

  function extractRecommendations(result) {
    const structured = result?.structuredResponse;
    if (structured && typeof structured === 'object' && !Array.isArray(structured)) {
      const candidate = structured.recommendations
        ?? structured.findings
        ?? structured.suggestion
        ?? structured.text;
      const formatted = formatRecommendations(candidate);
      if (formatted) return formatted;
    }

    const structuredText = formatRecommendations(structured);
    if (structuredText) return structuredText;
    return formatRecommendations(result?.response);
  }

  function publisherData() {
    return typeof currentData === 'undefined' || !currentData ? {} : currentData;
  }

  function panelFor(routeId) {
    return document.querySelector(`[data-route-tag-panel="${routeId}"]`);
  }

  function panelUi(routeId) {
    const panel = panelFor(routeId);
    return {
      panel,
      status: panel?.querySelector('.copy-consistency-status'),
      output: panel?.querySelector('.copy-consistency-output')
    };
  }

  function showPublisherStatus(type, message) {
    if (typeof window.setStatus === 'function') window.setStatus(type, message);
  }

  function clearRecommendations(routeId) {
    const { panel, status, output } = panelUi(routeId);
    if (panel) panel.hidden = true;
    if (status) status.textContent = '';
    if (output) {
      output.textContent = '';
      output.hidden = true;
    }
  }

  async function requestRecommendations(routeId, button) {
    const data = publisherData();
    const route = data.modes?.[routeId];
    const { panel, status, output } = panelUi(routeId);
    if (!route || !button || !panel || !status || !output) return;

    const token = localToken();
    if (!token) {
      panel.hidden = false;
      status.textContent = 'Spectra is not configured for this browser. Set the local Spectra token before requesting route tag recommendations.';
      output.textContent = '';
      output.hidden = true;
      showPublisherStatus('warn', status.textContent);
      return;
    }

    panel.hidden = false;
    status.textContent = 'Asking Spectra for read-only route tag recommendations…';
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
        body: JSON.stringify(buildRequestPayload(data, routeId))
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        throw new Error(result.error || result.response || `Spectra request failed (${response.status})`);
      }

      const recommendations = extractRecommendations(result);
      if (!recommendations) throw new Error('Spectra returned no route tag recommendations.');

      status.textContent = 'Recommendations only — no route or tags have been changed.';
      output.textContent = recommendations;
      output.hidden = false;
    } catch (error) {
      status.textContent = `Could not suggest route tags: ${error.message}`;
      output.textContent = '';
      output.hidden = true;
    } finally {
      button.disabled = false;
    }
  }

  function buildRoutePanel(routeId, label) {
    const panel = document.createElement('div');
    panel.className = 'copy-consistency-findings';
    panel.dataset.routeTagPanel = routeId;
    panel.hidden = true;
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <h4>Route tag recommendations</h4>
      <p class="copy-consistency-status"></p>
      <pre class="copy-consistency-output" hidden></pre>
      <div class="action-list copy-consistency-actions">
        <button class="btn btn-secondary btn-sm" type="button">Clear</button>
      </div>`;
    const clearButton = panel.querySelector('button');
    clearButton.dataset.clearRouteTags = routeId;
    clearButton.setAttribute('aria-label', `Clear route tag recommendations for ${label}`);
    return panel;
  }

  function decorateRouteCards() {
    const container = document.getElementById('modes-list');
    if (!container) return;

    const data = publisherData();
    const routeIds = Object.keys(data.modes || {});
    [...container.querySelectorAll('.item-card')].forEach((card, index) => {
      const routeId = routeIds[index];
      if (!routeId || card.dataset.routeTagReady === 'true') return;

      const label = cleanText(data.modes[routeId]?.label || routeId);
      const actions = card.querySelector('.item-actions');
      if (!actions) return;

      const button = document.createElement('button');
      button.className = 'btn btn-sm';
      button.type = 'button';
      button.dataset.suggestRouteTags = routeId;
      button.textContent = 'Suggest route tags';
      button.setAttribute('aria-label', `Suggest route tags for ${label}`);
      actions.appendChild(button);
      card.appendChild(buildRoutePanel(routeId, label));
      card.dataset.routeTagReady = 'true';
    });
  }

  function bindRouteHelperControls() {
    document.addEventListener('click', event => {
      const suggestButton = event.target.closest('[data-suggest-route-tags]');
      if (suggestButton) {
        requestRecommendations(suggestButton.dataset.suggestRouteTags, suggestButton);
        return;
      }

      const clearButton = event.target.closest('[data-clear-route-tags]');
      if (clearButton) clearRecommendations(clearButton.dataset.clearRouteTags);
    });
  }

  function observeRouteCards() {
    const container = document.getElementById('modes-list');
    if (!container || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(decorateRouteCards);
    observer.observe(container, { childList: true, subtree: true });
  }

  window.EPKCareerRouteTags = {
    buildContentSnapshot,
    buildRequestPayload,
    buildRouteSnapshot,
    clearRecommendations,
    extractRecommendations,
    requestRecommendations
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindRouteHelperControls();
    decorateRouteCards();
    observeRouteCards();
  });
})();
