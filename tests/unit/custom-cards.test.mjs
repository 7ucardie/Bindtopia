import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customCard, ownPrice, isCustomCard, validBackupCard, reportUrl} from '../../dist/custom-cards.mjs';

test('a card entered by hand is marked as such and cleaned up', () => {
  const c = customCard({name: '  Ancient   Mew ', setName: 'Movie promo', localId: '', lang: 'en', note: 'Mint', amount: '12,5', currency: 'EUR'});
  assert.match(c.id, /^custom-[a-z0-9]{12}$/);
  assert.equal(c.custom, true);
  assert.equal(c.setId, 'custom');
  assert.equal(c.name, 'Ancient Mew');
  assert.deepEqual(c.price, {amount: 12.5, currency: 'EUR', source: 'Eigen prijs'});
  assert.equal(c.note, 'Mint');
  assert.ok(isCustomCard(c));
  assert.throws(() => customCard({name: '   '}));
  assert.equal(customCard({name: 'X', lang: 'xx-bad!'}).lang, 'en');
  assert.equal(customCard({name: 'X', note: '', amount: ''}).price, undefined);
});

test('own prices accept comma or dot and reject nonsense', () => {
  assert.equal(ownPrice('12.50', 'USD').amount, 12.5);
  assert.equal(ownPrice('0', 'EUR'), null);
  assert.equal(ownPrice('-3', 'EUR'), null);
  assert.equal(ownPrice('abc', 'EUR'), null);
  assert.equal(ownPrice('5', 'euro'), null);
  assert.equal(ownPrice('', 'EUR'), null);
});

test('backups accept catalog cards and valid own entries only', () => {
  const catalog = {id: 'base1-4', name: 'Charizard', localId: '4', setId: 'base1', lang: 'en', image: 'https://assets.tcgdex.net/en/base/base1/4'};
  const own = customCard({name: 'Ancient Mew', amount: '20', currency: 'EUR'});
  assert.ok(validBackupCard(catalog));
  assert.ok(validBackupCard(own));
  assert.ok(!validBackupCard({...catalog, image: 'https://evil.example/x'}));
  assert.ok(!validBackupCard({...own, image: 'https://assets.tcgdex.net/x'}), 'own entries carry no image');
  assert.ok(!validBackupCard({...own, id: 'base1-4'}), 'own entries cannot take a catalog id');
  assert.ok(!validBackupCard({...own, name: 'x'.repeat(81)}));
  assert.ok(!validBackupCard({...own, price: {amount: -1, currency: 'EUR'}}));
  assert.ok(!validBackupCard({...own, custom: 'yes'}));
});

test('the TCGdex report link carries the card but never the note or price', () => {
  const url = reportUrl(customCard({name: 'Ancient Mew', setName: 'Movie promo', localId: '1', note: 'secret note', amount: '99', currency: 'EUR'}));
  assert.match(url, /^https:\/\/github\.com\/tcgdex\/cards-database\/issues\/new\?title=/);
  const q = new URL(url).searchParams;
  assert.equal(q.get('title'), 'Missing card: Ancient Mew 1 (Movie promo)');
  assert.match(q.get('body'), /Name: Ancient Mew/);
  assert.doesNotMatch(url, /secret|99/);
});
