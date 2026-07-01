#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync('EPK/public/publisher/publisher-ai-consistency.js', 'utf8');
const listeners = {};
const elements = {
  'copy-consistency-check-btn': { disabled: false, addEventListener() {} },
  'copy-consistency-clear-btn': { addEventListener() {} },
  'copy-consistency-findings': { hidden: true },
  'copy-consistency-status': { textContent: '' },
  'copy-consistency-output': { hidden: true, textContent: '' }
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

const source = {
  bio: {
    short: ' Short bio ',
    acoustic: 'Acoustic bio',
    full: [' First paragraph ', '', 'Second paragraph']
  },
  offerings: [{
    title: ' House concert ',
    description: ' Intimate performance ',
    tags: [' booker ', '', 'acoustic'],
    privateNotes: 'exclude this'
  }],
  credits: [{
    title: 'Screen score',
    role: 'Composer',
    year: 2024,
    description: 'Original score',
    tags: ['film'],
    link: 'https://private.example',
    githubToken: 'exclude this'
  }],
  publisher: { token: 'exclude this' },
  githubToken: 'exclude this'
};

const payload = window.EPKCareerCopyConsistency.buildRequestPayload(source);
const plainPayload = JSON.parse(JSON.stringify(payload));

assert.equal(plainPayload.sourceApp, 'EPK');
assert.equal(plainPayload.intent, 'career.check_epk_copy_consistency');
assert.equal(plainPayload.riskClass, 'read-only');
assert.equal(plainPayload.preferredMode, 'local-first');
assert.equal(plainPayload.context.appSurface, 'publisher');
assert.equal(plainPayload.context.reviewType, 'copy-consistency');
assert.match(plainPayload.input.instruction, /findings only/i);
assert.match(plainPayload.input.instruction, /do not rewrite/i);
assert.match(plainPayload.input.instruction, /do not invent facts/i);
assert.deepEqual(plainPayload.input.copy.bio, {
  short: 'Short bio',
  acoustic: 'Acoustic bio',
  full: ['First paragraph', 'Second paragraph']
});
assert.deepEqual(plainPayload.input.copy.offerings, [{
  title: 'House concert',
  description: 'Intimate performance',
  tags: ['booker', 'acoustic']
}]);
assert.deepEqual(plainPayload.input.copy.credits, [{
  title: 'Screen score',
  role: 'Composer',
  year: '2024',
  description: 'Original score',
  tags: ['film']
}]);

const serialized = JSON.stringify(plainPayload);
assert.deepEqual(Object.keys(plainPayload.input.copy).sort(), ['bio', 'credits', 'offerings']);
assert.equal(Object.hasOwn(plainPayload.input.copy, 'publisher'), false);
assert.equal(serialized.includes('githubToken'), false);
assert.equal(serialized.includes('privateNotes'), false);
assert.equal(serialized.includes('"token"'), false);
assert.equal(serialized.includes('https://private.example'), false);

assert.equal(
  window.EPKCareerCopyConsistency.extractFindings({
    structuredResponse: {
      findings: [
        { category: 'possible contradiction', field: 'bio.short', message: 'Dates differ.' },
        'No issue found in credits.'
      ]
    }
  }),
  '- [possible contradiction] bio.short: Dates differ.\n- No issue found in credits.'
);
assert.equal(
  window.EPKCareerCopyConsistency.extractFindings({
    structuredResponse: { text: 'Plain structured findings' },
    response: 'Fallback'
  }),
  'Plain structured findings'
);
assert.equal(
  window.EPKCareerCopyConsistency.extractFindings({ response: '  Plain response findings  ' }),
  'Plain response findings'
);

await window.EPKCareerCopyConsistency.requestConsistency(source);
assert.equal(fetchCalls, 0);
assert.equal(elements['copy-consistency-findings'].hidden, false);
assert.match(elements['copy-consistency-status'].textContent, /Spectra is not configured/i);
assert.equal(elements['copy-consistency-output'].hidden, true);

assert.equal(typeof listeners.DOMContentLoaded, 'function');
assert.equal(script.includes('DEFAULT_LOCAL_TOKEN'), false);
assert.equal(script.includes(['dev', 'local', 'token'].join('-')), false);
assert.equal(script.includes('publishLiveData'), false);
assert.equal(script.includes('publishSnapshot'), false);
assert.equal(script.includes('commitFile'), false);
assert.equal(script.includes('dispatchEvent'), false);
assert.equal(script.includes('localStorage.setItem'), false);
assert.equal(script.includes("riskClass: 'read-only'"), true);
assert.equal(/riskClass:\s*['"](?!read-only)/.test(script), false);

console.log('career.check_epk_copy_consistency request tests passed.');
