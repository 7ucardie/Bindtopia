import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {writeApi} from '../../scripts/build-api.mjs';
import {serve} from '../serve.mjs';

let server, base;
before(async () => { await writeApi(); server = await serve(); base = 'http://127.0.0.1:' + server.address().port; });
after(() => server.close());
const get = async path => { const r = await fetch(base + path); assert.equal(r.status, 200, path); return r.json(); };
const catalog = JSON.parse(readFileSync(new URL('../../dist/data/cards-en.json', import.meta.url)));

test('index lists the endpoints and matches the catalog size', async () => {
  const index = await get('/api/v1/index.json');
  assert.equal(index.cards, catalog.length);
  for (const path of Object.values(index.endpoints)) if (!path.includes('{')) await get(path);
});

test('every set file exists and lists its cards', async () => {
  const sets = await get('/api/v1/sets.json');
  let total = 0;
  for (const s of sets) total += (await get(s.url)).cards.length;
  assert.equal(total, catalog.length);
  assert.equal(sets.find(s => s.id === 'base1').year, 1999);
});

test('card files resolve, including IDs with unsafe characters', async () => {
  const cards = await get('/api/v1/cards.json');
  assert.equal(cards.length, catalog.length);
  for (const id of ['base1-4', 'exu-!', 'exu-%3F']) {
    const card = await get(cards.find(c => c.id === id).url);
    assert.equal(card.id, id);
    assert.equal(card.set.id, card.setId);
  }
  assert.equal((await fetch(base + '/api/v1/cards/does-not-exist.json')).status, 404);
});

test('the OpenAPI document is valid JSON for version 3.1 and covers all routes', async () => {
  const spec = await get('/api/v1/openapi.json');
  assert.equal(spec.openapi, '3.1.0');
  assert.deepEqual(Object.keys(spec.paths).sort(), ['/cards.json', '/cards/{cardFileId}.json', '/index.json', '/sets.json', '/sets/{setId}.json']);
});
