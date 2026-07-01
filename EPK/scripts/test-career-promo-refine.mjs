#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync('EPK/public/publisher/publisher-ai-promo-refine.js', 'utf8');
const listeners = {};
const elements = {
  'refine-promo-copy-btn': { disabled: false, addEventListener() {} },
  'brief-text': { value: '# Promo brief\nCurrent generated promo copy.' },
  'promo-refine-suggestion': { hidden: true },
  'promo-refine-status': { textContent: '' },
  'promo-refine-draft': { hidden: true, value: '' },
  'discard-promo-refine-btn': { addEventListener() {} }
};
let fetchCalls = 0;
const window = {};
const context = {
  window,
  document: {
    addEventListener(name, listener) {
      listeners[name] = listener;
    },
    getElementById(id) {
      return elements[id] || null;
    }
  },
  localStorage: {
    getItem() {
      return null;
    }
  },
  fetch() {
    fetchCalls += 1;
    throw new Error('fetch must not run without a token');
  }
};

vm.runInNewContext(script, context);

const payload = window.EPKCareerPromoRefine.buildRequestPayload(
  '# Promo brief\nCurrent generated promo copy.',
  'brief-text'
);
const plainPayload = JSON.parse(JSON.stringify(payload));

assert.deepEqual(plainPayload, {
  sourceApp: 'EPK',
  intent: 'career.refine_epk_promo_copy',
  riskClass: 'read-only',
  preferredMode: 'local-first',
  input: {
    text: '# Promo brief\nCurrent generated promo copy.',
    instruction: 'Refine this EPK promo copy for clarity, flow, and usefulness to presenters, venues, press, or collaborators. Preserve factual claims, names, dates, roles, and meaning. Do not invent details. Return only the revised copy.'
  },
  context: {
    appSurface: 'publisher',
    field: 'brief-text'
  }
});
assert.match(plainPayload.input.instruction, /preserve factual claims/i);
assert.match(plainPayload.input.instruction, /do not invent details/i);

assert.equal(
  window.EPKCareerPromoRefine.extractSuggestion({
    structuredResponse: { refinedText: 'Refined promo copy' },
    response: 'Fallback'
  }),
  'Refined promo copy'
);
assert.equal(
  window.EPKCareerPromoRefine.extractSuggestion({
    structuredResponse: { suggestion: 'Suggested promo copy' }
  }),
  'Suggested promo copy'
);
assert.equal(
  window.EPKCareerPromoRefine.extractSuggestion({
    structuredResponse: { text: 'Structured promo copy' }
  }),
  'Structured promo copy'
);
assert.equal(
  window.EPKCareerPromoRefine.extractSuggestion({ response: '  Plain promo response  ' }),
  'Plain promo response'
);

await window.EPKCareerPromoRefine.requestSuggestion();
assert.equal(fetchCalls, 0);
assert.equal(elements['promo-refine-suggestion'].hidden, false);
assert.match(elements['promo-refine-status'].textContent, /Spectra is not configured/i);
assert.equal(elements['promo-refine-draft'].hidden, true);
assert.equal(elements['brief-text'].value, '# Promo brief\nCurrent generated promo copy.');

const successElements = {
  'refine-promo-copy-btn': { disabled: false, addEventListener() {} },
  'brief-text': { value: '# Promo brief\nOriginal generated promo copy.' },
  'promo-refine-suggestion': { hidden: true },
  'promo-refine-status': { textContent: '' },
  'promo-refine-draft': { hidden: true, value: '' },
  'discard-promo-refine-btn': { addEventListener() {} }
};
let capturedRequest = null;
const successWindow = { __PRISM_SPECTRA_TOKEN__: 'test-token' };
const successContext = {
  window: successWindow,
  document: {
    addEventListener() {},
    getElementById(id) {
      return successElements[id] || null;
    }
  },
  localStorage: {
    getItem() {
      return null;
    }
  },
  async fetch(url, options) {
    capturedRequest = { url, options };
    return {
      ok: true,
      async json() {
        return { structuredResponse: { refinedText: 'Refined promo suggestion.' } };
      }
    };
  }
};

vm.runInNewContext(script, successContext);
await successWindow.EPKCareerPromoRefine.requestSuggestion();
assert.equal(capturedRequest.url, 'http://127.0.0.1:3000/api/v1/ai/request');
assert.equal(capturedRequest.options.method, 'POST');
assert.equal(capturedRequest.options.headers['x-local-token'], 'test-token');
assert.equal(JSON.parse(capturedRequest.options.body).intent, 'career.refine_epk_promo_copy');
assert.equal(successElements['brief-text'].value, '# Promo brief\nOriginal generated promo copy.');
assert.equal(successElements['promo-refine-draft'].value, 'Refined promo suggestion.');
assert.equal(successElements['promo-refine-draft'].hidden, false);
assert.match(successElements['promo-refine-status'].textContent, /generated promo brief remains unchanged/i);

successWindow.EPKCareerPromoRefine.clearSuggestion();
assert.equal(successElements['promo-refine-suggestion'].hidden, true);
assert.equal(successElements['promo-refine-draft'].value, '');

assert.equal(typeof listeners.DOMContentLoaded, 'function');
assert.equal(script.includes('DEFAULT_LOCAL_TOKEN'), false);
assert.equal(script.includes(['dev', 'local', 'token'].join('-')), false);
assert.equal(script.includes('publishLiveData'), false);
assert.equal(script.includes('publishSnapshot'), false);
assert.equal(script.includes('commitFile'), false);
assert.equal(script.includes('download'), false);
assert.equal(script.includes('dispatchEvent'), false);
assert.equal(script.includes('localStorage.setItem'), false);
assert.equal(script.includes("riskClass: 'read-only'"), true);
assert.equal(/riskClass:\s*['"](?!read-only)/.test(script), false);

console.log('career.refine_epk_promo_copy request tests passed.');
