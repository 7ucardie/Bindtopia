import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildApi, fileId, BASE} from '../../scripts/build-api.mjs';

test('fileId keeps safe IDs and encodes unsafe characters', () => {
  assert.equal(fileId('base1-4'), 'base1-4');
  assert.equal(fileId('swsh4.5sv-SV089'), 'swsh4.5sv-SV089');
  assert.equal(fileId('exu-!'), 'exu-_21');
  assert.equal(fileId('exu-%3F'), 'exu-_253F');
  assert.equal(fileId('a/b?c'), 'a_2Fb_3Fc');
});

test('buildApi produces index, lists, set and card files that link to each other', () => {
  const sets = [{id: 'base1', name: 'Base Set', releaseDate: '1999-01-09', cardCount: {total: 2, official: 2}, logo: 'https://assets.tcgdex.net/en/base/base1/logo'}, {id: 'new', name: 'Undated', cardCount: {total: 1, official: 1}}];
  const cards = [{id: 'base1-4', localId: '4', name: 'Charizard', setId: 'base1', image: 'https://assets.tcgdex.net/en/base/base1/4'}, {id: 'base1-2', localId: '2', name: 'Blastoise', setId: 'base1'}, {id: 'new-!', localId: '!', name: 'Unown', setId: 'new'}];
  const files = buildApi(cards, sets, {updated: '2026-10-25T00:00:00Z'});
  assert.equal(files.size, 3 + sets.length + cards.length);
  assert.equal(files.get('index.json').cards, 3);
  const charizard = files.get('cards/base1-4.json');
  assert.deepEqual(charizard.images, {small: 'https://assets.tcgdex.net/en/base/base1/4/low.webp', large: 'https://assets.tcgdex.net/en/base/base1/4/high.webp'});
  assert.equal(charizard.set.year, 1999);
  assert.equal(files.get('cards/base1-2.json').images, null);
  assert.equal(files.get('sets/new.json').year, null);
  assert.equal(files.get('sets/base1.json').cards.length, 2);
  for (const c of files.get('cards.json')) assert.ok(files.has(c.url.slice(BASE.length)), c.url);
  for (const s of files.get('sets.json')) assert.ok(files.has(s.url.slice(BASE.length)), s.url);
});
