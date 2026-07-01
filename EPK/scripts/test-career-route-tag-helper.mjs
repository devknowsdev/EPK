#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync('EPK/public/publisher/publisher-ai-route-helper.js', 'utf8');
const source = {
  bio: {
    short: ' Short bio ',
    acoustic: 'Acoustic bio',
    full: [' Full paragraph ', '']
  },
  offerings: [{
    title: ' House concert ',
    description: ' Intimate performance ',
    tags: [' booker ', 'acoustic'],
    privateNotes: 'exclude this'
  }],
  credits: [{
    title: 'Screen score',
    role: 'Composer',
    year: 2024,
    description: 'Original score',
    tags: ['film'],
    link: 'https://private.example'
  }],
  modes: {
    booker: {
      label: 'Booker',
      heroCaption: 'For venues and presenters',
      bioStyle: 'short',
      sections: ['bio', 'offerings', 'contact'],
      offeringTags: ['booker'],
      videoTags: ['booker'],
      privateConfig: 'exclude this'
    }
  },
  githubToken: 'exclude this',
  contactConfig: { secret: 'exclude this' },
  publisher: { settings: 'exclude this' }
};
const sourceBefore = JSON.stringify(source);

function makePanel() {
  const status = { textContent: '' };
  const output = { hidden: true, textContent: '' };
  return {
    hidden: true,
    querySelector(selector) {
      if (selector === '.copy-consistency-status') return status;
      if (selector === '.copy-consistency-output') return output;
      return null;
    },
    status,
    output
  };
}

function makeContext({ token = '', response = null } = {}) {
  const panel = makePanel();
  const listeners = {};
  let fetchCalls = 0;
  let capturedRequest = null;
  const window = { currentData: source };
  if (token) window.__PRISM_SPECTRA_TOKEN__ = token;
  const context = {
    window,
    currentData: source,
    document: {
      addEventListener(name, listener) {
        listeners[name] = listener;
      },
      getElementById() {
        return null;
      },
      querySelector(selector) {
        return selector === '[data-route-tag-panel="booker"]' ? panel : null;
      }
    },
    localStorage: {
      getItem() {
        return null;
      }
    },
    MutationObserver: class {
      observe() {}
    },
    async fetch(url, options) {
      fetchCalls += 1;
      capturedRequest = { url, options };
      return {
        ok: true,
        async json() {
          return response || {
            structuredResponse: {
              recommendations: [
                { area: 'offerings', item: 'House concert', recommendation: 'Use the booker tag.' }
              ]
            }
          };
        }
      };
    }
  };
  vm.runInNewContext(script, context);
  return {
    capturedRequest: () => capturedRequest,
    fetchCalls: () => fetchCalls,
    listeners,
    panel,
    window
  };
}

const tokenless = makeContext();
const payload = tokenless.window.EPKCareerRouteTags.buildRequestPayload(source, 'booker');
const plainPayload = JSON.parse(JSON.stringify(payload));

assert.equal(plainPayload.sourceApp, 'EPK');
assert.equal(plainPayload.intent, 'career.suggest_epk_route_tags');
assert.equal(plainPayload.riskClass, 'read-only');
assert.equal(plainPayload.preferredMode, 'local-first');
assert.equal(plainPayload.context.appSurface, 'publisher');
assert.equal(plainPayload.context.reviewType, 'route-tag-recommendations');
assert.match(plainPayload.input.instruction, /recommendations only/i);
assert.match(plainPayload.input.instruction, /do not invent facts/i);
assert.match(plainPayload.input.instruction, /do not apply tags/i);
assert.deepEqual(plainPayload.input.route, {
  id: 'booker',
  label: 'Booker',
  audience: 'For venues and presenters',
  bioStyle: 'short',
  sections: ['bio', 'offerings', 'contact'],
  offeringTags: ['booker'],
  videoTags: ['booker']
});
assert.deepEqual(plainPayload.input.content.bio, {
  short: 'Short bio',
  acoustic: 'Acoustic bio',
  full: ['Full paragraph']
});
assert.deepEqual(plainPayload.input.content.offerings, [{
  title: 'House concert',
  description: 'Intimate performance',
  tags: ['booker', 'acoustic']
}]);
assert.deepEqual(plainPayload.input.content.credits, [{
  title: 'Screen score',
  role: 'Composer',
  year: '2024',
  description: 'Original score',
  tags: ['film']
}]);

const serialized = JSON.stringify(plainPayload);
assert.equal(serialized.includes('githubToken'), false);
assert.equal(serialized.includes('contactConfig'), false);
assert.equal(serialized.includes('privateNotes'), false);
assert.equal(serialized.includes('privateConfig'), false);
assert.equal(serialized.includes('https://private.example'), false);
assert.equal(Object.hasOwn(plainPayload.input.content, 'publisher'), false);

const button = { disabled: false };
await tokenless.window.EPKCareerRouteTags.requestRecommendations('booker', button);
assert.equal(tokenless.fetchCalls(), 0);
assert.equal(tokenless.panel.hidden, false);
assert.match(tokenless.panel.status.textContent, /Spectra is not configured/i);
assert.equal(tokenless.panel.output.hidden, true);

const configured = makeContext({ token: 'test-token' });
await configured.window.EPKCareerRouteTags.requestRecommendations('booker', button);
const request = configured.capturedRequest();
assert.equal(request.url, 'http://127.0.0.1:3000/api/v1/ai/request');
assert.equal(request.options.method, 'POST');
assert.equal(request.options.headers['x-local-token'], 'test-token');
assert.equal(JSON.parse(request.options.body).intent, 'career.suggest_epk_route_tags');
assert.equal(configured.panel.hidden, false);
assert.equal(configured.panel.output.hidden, false);
assert.equal(configured.panel.output.textContent, '- [offerings] House concert: Use the booker tag.');
assert.match(configured.panel.status.textContent, /no route or tags have been changed/i);
assert.equal(JSON.stringify(source), sourceBefore);

configured.window.EPKCareerRouteTags.clearRecommendations('booker');
assert.equal(configured.panel.hidden, true);
assert.equal(configured.panel.output.textContent, '');

assert.equal(
  configured.window.EPKCareerRouteTags.extractRecommendations({
    structuredResponse: { findings: ['Use the film tag.'] }
  }),
  '- Use the film tag.'
);
assert.equal(
  configured.window.EPKCareerRouteTags.extractRecommendations({
    structuredResponse: { suggestion: 'Use the press route.' }
  }),
  'Use the press route.'
);
assert.equal(
  configured.window.EPKCareerRouteTags.extractRecommendations({
    response: ' Plain route recommendation '
  }),
  'Plain route recommendation'
);

assert.equal(typeof tokenless.listeners.DOMContentLoaded, 'function');
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

console.log('career.suggest_epk_route_tags request tests passed.');
