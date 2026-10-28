import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {serve} from '../serve.mjs';

let server, base;
before(async () => { server = await serve(); base = 'http://127.0.0.1:' + server.address().port + '/'; });
after(() => server.close());

const dist = new URL('../../dist/', import.meta.url);
const pages = readdirSync(dist).filter(f => f.endsWith('.html'));

test('every page and its local assets and links are served', async () => {
  const seen = new Set();
  for (const page of pages) {
    const html = readFileSync(new URL(page, dist), 'utf8');
    for (const [, ref] of html.matchAll(/(?:src|href)="([^"#]+)/g)) {
      if (/^(https?:|mailto:|data:|javascript:)/.test(ref)) continue;
      const path = ref.replace(/&amp;/g, '&').split('?')[0].replace(/^\//, '');
      if (!path || seen.has(path)) continue;
      seen.add(path);
      assert.equal((await fetch(base + path)).status, 200, `${page} -> ${ref}`);
    }
  }
  assert.ok(seen.size > 10);
});

test('module imports from app.mjs resolve, through every imported module', async () => {
  const seen = new Set(), queue = ['app.mjs'];
  while (queue.length) {
    const mod = queue.pop();
    if (seen.has(mod)) continue;
    seen.add(mod);
    const r = await fetch(base + mod);
    assert.equal(r.status, 200, mod);
    for (const [, next] of (await r.text()).matchAll(/from '\.\/([^']+)'/g)) queue.push(next);
  }
  assert.ok(seen.size > 10, 'app.mjs is split into modules');
});

test('catalog data is consistent and served as JSON', async () => {
  const cards = await (await fetch(base + 'data/cards-en.json')).json();
  const sets = await (await fetch(base + 'data/sets-en.json')).json();
  const setIds = new Set(sets.map(s => s.id));
  assert.ok(cards.length > 20000);
  assert.ok(cards.every(c => setIds.has(c.setId)), 'every card belongs to a known set');
  const meta = await (await fetch(base + 'data/meta.json')).json();
  assert.ok(meta && typeof meta === 'object');
});

test('locale dictionaries are loadable and complete', async () => {
  const nl = await (await fetch(base + 'locales/nl.json')).json();
  for (const lang of ['en', 'de', 'fr', 'es', 'it', 'pt', 'pl']) {
    const dict = await (await fetch(base + `locales/${lang}.json`)).json();
    assert.deepEqual(Object.keys(dict).sort(), Object.keys(nl).sort(), lang);
    assert.ok(Object.values(dict).every(v => typeof v === 'string' && v.trim()), lang + ' has empty values');
  }
});

test('server refuses path traversal', async () => {
  const res = await fetch(base + '..%2f..%2fpackage.json');
  assert.notEqual(res.status, 200);
});

test('published config holds no secrets', () => {
  const config = JSON.parse(readFileSync(new URL('project.json', dist), 'utf8'));
  const publicKeys = new Set(['cloudflareAnalyticsToken']); // the Web Analytics beacon token is public by design
  assert.ok(!Object.keys(config).some(k => !publicKeys.has(k) && /token|secret|key|password/i.test(k)));
});

test('no download archives are published; the source lives on GitHub', () => {
  assert.ok(!readdirSync(dist).some(f => f.endsWith('.zip')));
  const index = readFileSync(new URL('index.html', dist), 'utf8');
  assert.doesNotMatch(index, /href="[^"]+\.zip"/);
  assert.match(index, /href="https:\/\/github\.com\/7ucardie\/Bindtopia"/);
});

test('every page has a title and a meta description', () => {
  for (const page of pages) {
    const html = readFileSync(new URL(page, dist), 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/, page);
    assert.match(html, /<meta name="description" content="[^"]{40,}">/, page);
  }
});
