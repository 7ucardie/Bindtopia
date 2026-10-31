import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';

// The offline copy must hold everything the start page and trade mode load, or they break without internet.
const dist = new URL('../../dist/', import.meta.url);
const read = f => readFileSync(new URL(f, dist), 'utf8');
const sw = read('sw.js');
const shell = new Function('return ' + sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1])();
const local = new Set(shell.map(f => f.split('?')[0]));

test('every file in the offline list exists', () => {
  for (const f of local) if (f !== './') assert.ok(existsSync(new URL(f, dist)), f);
});

test('the offline list covers the modules, styles, data and locales the start page loads', () => {
  const index = read('index.html');
  const app = readdirSync(dist).filter(f => f.endsWith('.mjs')).map(read).join('\n');
  const used = [
    ...readdirSync(dist).filter(f => f.endsWith('.mjs') && !['privacy-controls.mjs', 'support.mjs'].includes(f)),
    ...[...index.matchAll(/<(?:script|link rel="stylesheet")[^>]*(?:src|href)="([^"#:?]+)"/g)].map(m => m[1]),
    ...[...app.matchAll(/'\.\/(data\/[^']+)'/g)].map(m => m[1]),
    ...readdirSync(new URL('locales/', dist)).map(f => 'locales/' + f),
    'fonts/Roboto-Variable.woff2', 'project.json',
  ];
  for (const f of used) assert.ok(local.has(f), f + ' is missing from SHELL in dist/sw.js');
});

test('the worker only touches GET requests and the hosts the privacy statement names for offline use', () => {
  assert.match(sw, /request\.method !== 'GET'\) return/);
  for (const host of ['api.tcgdex.net', 'assets.tcgdex.net', 'cdn', 'tessdata']) assert.ok(sw.includes(host), host);
  assert.doesNotMatch(sw, /cloudflareinsights|postMessage|addEventListener\('(?:sync|periodicsync|push|message)'/, 'no analytics, messaging or background sync');
});
