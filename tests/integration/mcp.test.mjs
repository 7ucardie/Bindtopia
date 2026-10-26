import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {writeApi} from '../../scripts/build-api.mjs';
import {serve} from '../serve.mjs';

let server, client;
const call = async (name, args) => { const r = await client.callTool({name, arguments: args}); return r.isError ? {error: r.content[0].text} : JSON.parse(r.content[0].text); };

before(async () => {
  await writeApi();
  server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  // TCGdex points at the local server, which has no such route, so details degrade gracefully offline.
  client = new Client({name: 'test', version: '1.0.0'});
  await client.connect(new StdioClientTransport({command: process.execPath, args: [fileURLToPath(new URL('../../mcp/server.mjs', import.meta.url))], env: {...process.env, BINDTOPIA_API: base + 'api/v1/', BINDTOPIA_TCGDEX: base + 'tcgdex/'}}));
});
after(async () => { await client?.close(); server?.close(); });

test('exposes the four read-only tools', async () => {
  const {tools} = await client.listTools();
  assert.deepEqual(tools.map(t => t.name).sort(), ['get_card', 'get_set', 'list_sets', 'search_cards']);
  assert.ok(tools.every(t => t.annotations?.readOnlyHint));
});

test('search_cards finds by number, typo and partial name', async () => {
  assert.equal((await call('search_cards', {query: 'Charizard 4/102'})).cards[0].id, 'base1-4');
  assert.equal((await call('search_cards', {query: 'Charizad 4/102'})).cards[0].id, 'base1-4');
  const partial = await call('search_cards', {query: 'chariz', limit: 5});
  assert.ok(partial.count > 0 && partial.cards.every(c => /charizard/i.test(c.name)));
  assert.equal((await call('search_cards', {query: '4/102'})).cards[0].set.year, 1999);
});

test('get_set and list_sets return release years', async () => {
  const set = await call('get_set', {id: 'base1'});
  assert.equal(set.year, 1999);
  assert.ok(set.cards.some(c => c.id === 'base1-4'));
  assert.ok((await call('list_sets', {year: 1999})).sets.some(s => s.id === 'base1'));
  assert.match((await call('get_set', {id: 'nope'})).error, /Unknown set/);
});

test('get_card works offline and rejects unknown IDs', async () => {
  const card = await call('get_card', {id: 'base1-4', market: 'gb'});
  assert.equal(card.name, 'Charizard');
  assert.equal(card.set.year, 1999);
  assert.equal(card.details, null);
  assert.match((await call('get_card', {id: 'nope-1'})).error, /Unknown card/);
});
