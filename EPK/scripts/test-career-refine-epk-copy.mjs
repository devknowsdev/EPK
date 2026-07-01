#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync('EPK/public/publisher/publisher-ai-refine.js', 'utf8');
const listeners = {};
const window = {};
const context = {
  window,
  document: {
    addEventListener(name, listener) {
      listeners[name] = listener;
    }
  },
  localStorage: {
    getItem() {
      return null;
    }
  },
  Map
};

vm.runInNewContext(script, context);

const payload = window.EPKCareerRefineCopy.buildRequestPayload(
  'Current EPK copy',
  'bio.short'
);

assert.deepEqual(
  JSON.parse(JSON.stringify(payload)),
  {
    sourceApp: 'EPK',
    intent: 'career.refine_epk_copy',
    riskClass: 'read-only',
    preferredMode: 'local-first',
    input: {
      text: 'Current EPK copy',
      instruction: 'Refine this EPK copy for clarity and flow. Preserve factual claims, names, and meaning. Do not invent details. Return only the revised copy.'
    },
    context: {
      appSurface: 'publisher',
      field: 'bio.short'
    }
  }
);

assert.equal(
  window.EPKCareerRefineCopy.extractSuggestion({
    structuredResponse: { refinedText: 'Refined copy' },
    response: 'Fallback'
  }),
  'Refined copy'
);
assert.equal(
  window.EPKCareerRefineCopy.extractSuggestion({ response: '  Plain response  ' }),
  'Plain response'
);
assert.equal(typeof listeners.DOMContentLoaded, 'function');
assert.equal(script.includes('DEFAULT_LOCAL_TOKEN'), false);
assert.equal(script.includes('dev-local-token'), false);
assert.equal(script.includes("riskClass: 'read-only'"), true);
assert.equal(/riskClass:\s*['"](?!read-only)/.test(script), false);

console.log('career.refine_epk_copy static request tests passed.');
