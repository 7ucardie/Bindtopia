import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize, extractNumbers, matchCards} from '../../dist/matcher.mjs';

const cards = [
  {id: 'base1-4', localId: '4', name: 'Charizard', setId: 'base1'},
  {id: 'base1-2', localId: '2', name: 'Blastoise', setId: 'base1'},
  {id: 'jungle-4', localId: '4', name: 'Flareon', setId: 'jungle'},
];
const sets = {base1: {cardCount: {official: 102}}, jungle: {cardCount: {official: 64}}};

test('normalize strips accents, case and punctuation', () => {
  assert.equal(normalize('Pokémon-EX!'), 'pokemonex');
  assert.equal(normalize(null), '');
});

test('extractNumbers reads collector numbers with full-width slash and prefixes', () => {
  assert.deepEqual(extractNumbers('Charizard 004 / 102'), [{localId: '004', total: '102'}]);
  assert.deepEqual(extractNumbers('TG05／TG30'), [{localId: 'TG05', total: 'TG30'}]);
  assert.deepEqual(extractNumbers('no number here'), []);
});

test('number plus set total beats a number alone', () => {
  const [best, second] = matchCards('4/102', cards, sets);
  assert.equal(best.card.id, 'base1-4');
  assert.equal(second.card.id, 'jungle-4');
  assert.ok(best.score > second.score);
});

test('typo-tolerant name match and set filter', () => {
  assert.equal(matchCards('Charizad', cards, sets)[0].card.id, 'base1-4');
  assert.deepEqual(matchCards('4', cards, sets, {setId: 'jungle'}).map(m => m.card.id), ['jungle-4']);
});

test('limit and empty input', () => {
  assert.equal(matchCards('4/102', cards, sets, {limit: 1}).length, 1);
  assert.deepEqual(matchCards('', cards, sets), []);
});
