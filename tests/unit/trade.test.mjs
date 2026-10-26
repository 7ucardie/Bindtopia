import {test} from 'node:test';
import assert from 'node:assert/strict';
import {confident, headlinePrice, tradeTotals} from '../../dist/trade.mjs';

test('confident accepts a clear name+number or number+total match only', () => {
  const card = {id: 'base1-4'};
  assert.equal(confident([{card, score: 145}, {card: {id: 'x'}, score: 50}]).card, card);
  assert.equal(confident([{card, score: 80}]).card, card);
  assert.equal(confident([{card, score: 65}]), null, 'a name alone is ambiguous');
  assert.equal(confident([{card, score: 115}, {card: {id: 'y'}, score: 115}]), null, 'a tie needs the user');
  assert.equal(confident([]), null);
});

test('headlinePrice follows the market preference and falls back', () => {
  const pricing = {cardmarket: {unit: 'EUR', trend: 0, avg: 290, low: 120}, tcgplayer: {unit: 'USD', normal: {}, holofoil: {marketPrice: 410.25}}};
  assert.deepEqual(headlinePrice(pricing, 'cardmarket'), {amount: 290, currency: 'EUR', source: 'Cardmarket'});
  assert.deepEqual(headlinePrice(pricing, 'tcgplayer'), {amount: 410.25, currency: 'USD', source: 'TCGplayer', variant: 'holofoil'});
  assert.equal(headlinePrice({cardmarket: {trend: 0}}, 'tcgplayer'), null);
  assert.deepEqual(headlinePrice({tcgplayer: {holofoil: {midPrice: 5}}}, 'cardmarket').source, 'TCGplayer');
  assert.equal(headlinePrice(null), null);
});

test('tradeTotals converts to one currency and reports what it could not count', () => {
  const rates = {rates: {USD: 1.1, GBP: 0.85}};
  const items = [
    {side: 'give', price: {amount: 11, currency: 'USD'}},
    {side: 'get', price: {amount: 20, currency: 'EUR'}},
    {side: 'get', price: {amount: 5, currency: 'JPY'}},
    {side: 'give', price: null},
  ];
  assert.deepEqual(tradeTotals(items, 'EUR', rates), {give: 10, get: 20, skipped: 2, diff: 10});
  assert.deepEqual(tradeTotals([], 'USD', null), {give: 0, get: 0, skipped: 0, diff: 0});
});
