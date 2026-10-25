import {test} from 'node:test';
import assert from 'node:assert/strict';
import {escape, cardTextHtml, priceBlock} from '../../dist/card-detail.mjs';

test('escape neutralises HTML from the API', () => {
  assert.equal(escape('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
});

test('cardTextHtml escapes card text and is empty without text', () => {
  assert.equal(cardTextHtml({}), '');
  const html = cardTextHtml({description: '<b>x</b>', attacks: [{name: 'Hit', damage: 10, effect: 'e', cost: ['Fire']}]});
  assert.match(html, /^<p>&lt;b&gt;x&lt;\/b&gt;<\/p>/);
  assert.match(html, /Hit 10/);
});

test('priceBlock formats Cardmarket and TCGplayer prices in the interface locale', () => {
  const html = priceBlock({
    cardmarket: {unit: 'EUR', low: 1.5, trend: 0, avg: null, updated: '2026-10-01T00:00:00Z'},
    tcgplayer: {unit: 'USD', updated: '2026-10-01', holofoil: {marketPrice: 3.2}, normal: {}},
  }, 'en-US');
  assert.match(html, /<h4>Cardmarket<\/h4>/);
  assert.match(html, /€1\.50/);
  assert.doesNotMatch(html, /Trend/, 'zero prices are hidden');
  assert.match(html, /TCGplayer · holofoil/);
  assert.match(html, /\$3\.20/);
  assert.doesNotMatch(html, /normal/, 'variants without prices are hidden');
  assert.match(html, /10\/1\/2026/);
});

test('priceBlock tolerates missing or malformed data', () => {
  for (const p of [undefined, null, 'x', {}, {cardmarket: 'x'}, {cardmarket: {low: 'NaN'}}]) assert.equal(priceBlock(p, 'nl'), '');
  assert.match(priceBlock({cardmarket: {unit: 'bad', low: 2}}, 'nl'), /€/, 'invalid unit falls back to EUR');
  assert.equal(priceBlock({tcgplayer: {a: {lowPrice: 1}, b: {lowPrice: 1}, c: {lowPrice: 1}, d: {lowPrice: 1}}}, 'en').split('<h4>').length - 1, 3);
});
