import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// What search engines read from the homepage before any script runs: one language (English, the default interface), a canonical address and truthful structured data.
const html = readFileSync(new URL('../../dist/index.html', import.meta.url), 'utf8');
const en = JSON.parse(readFileSync(new URL('../../dist/locales/en.json', import.meta.url), 'utf8'));
const attr = (selector, name) => html.match(new RegExp(`<meta ${selector}="${name}" content="([^"]+)">`))?.[1];

test('the static title matches the English runtime title and og:title', () => {
  const title = html.match(/<title>([^<]+)<\/title>/)[1];
  assert.equal(title, en['Bindtopia — zoek, scan en verzamel']);
  assert.equal(attr('property', 'og:title'), title);
  assert.match(html, /<html lang="en">/);
  assert.equal(attr('property', 'og:description'), attr('name', 'description'));
});

test('the homepage names its canonical address', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/bindtopia\.com\/">/);
  assert.equal(attr('property', 'og:url'), 'https://bindtopia.com/');
});

test('the JSON-LD parses and describes a free website and web application', () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map(m => JSON.parse(m[1]));
  assert.equal(blocks.length, 1);
  const graph = blocks[0]['@graph'];
  const site = graph.find(x => x['@type'] === 'WebSite');
  const app = graph.find(x => x['@type'] === 'WebApplication');
  assert.equal(site.url, 'https://bindtopia.com/');
  // No SearchAction: the app keeps search state out of the URL, so a ?q= target would be untrue.
  assert.equal(site.potentialAction, undefined);
  assert.equal(app.url, 'https://bindtopia.com/');
  assert.equal(app.operatingSystem, 'Any');
  assert.equal(app.isAccessibleForFree, true);
  assert.equal(app.offers.price, '0');
  assert.equal(app.description, attr('name', 'description'));
});
