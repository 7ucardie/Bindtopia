import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize, extractNumbers, extractSetNumbers, basicEnergy, matchCards} from '../../dist/matcher.mjs';

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

const energyCards = [
  {id: 'mee-004', localId: '004', name: 'Lightning Energy', setId: 'mee'},
  {id: 'sve-004', localId: '004', name: 'Lightning Energy', setId: 'sve'},
  {id: 'mee-002', localId: '002', name: 'Fire Energy', setId: 'mee'},
  {id: 'sv01-257', localId: '257', name: 'Basic Lightning Energy', setId: 'sv01'},
];
const energySets = {mee: {releaseDate: '2025-09-26'}, sve: {releaseDate: '2023-03-31'}, sv01: {releaseDate: '2023-03-31'}};

test('basicEnergy reads the card even when the type symbol is garbled', () => {
  assert.deepEqual(basicEnergy('Basic 4 Energy'), {type: ''});
  assert.deepEqual(basicEnergy('Basic Lightning Energy'), {type: 'lightning'});
  assert.equal(basicEnergy('Pikachu 024/128'), null);
});

test('Basic Energy is matched by the colour type, newest set first', () => {
  const hits = matchCards('Basic Energy\nBasic 4 Energy', energyCards, energySets, {energyType: 'lightning'});
  assert.deepEqual(hits.map(h => h.card.id), ['mee-004', 'sv01-257', 'sve-004']);
  assert.deepEqual(matchCards('Basic 4 Energy', energyCards, energySets), []);
});

test('set code and number settle a print without a set total', () => {
  assert.deepEqual(extractSetNumbers('MEE 004'), [{code: 'mee', localId: '004'}]);
  const [best, second] = matchCards('Basic 4 Energy\nMEE 004', energyCards, energySets, {energyType: 'lightning'});
  assert.equal(best.card.id, 'mee-004');
  assert.ok(best.score >= 112 && best.score > second.score);
});
