import {test} from 'node:test';
import assert from 'node:assert/strict';
import {markets, detectMarket, convert, marketLinks} from '../../dist/markets.mjs';
import {parseEcb} from '../../scripts/sync-rates.mjs';

test('detectMarket prefers the time zone, then the language region, else International', () => {
  assert.equal(detectMarket({timeZone: 'Australia/Melbourne', languages: ['en-US']}), 'au');
  assert.equal(detectMarket({timeZone: 'Europe/London'}), 'gb');
  assert.equal(detectMarket({timeZone: 'America/Indiana/Indianapolis'}), 'us');
  assert.equal(detectMarket({timeZone: 'America/Toronto'}), 'ca');
  assert.equal(detectMarket({timeZone: 'Europe/Amsterdam', languages: ['en-US']}), 'nl');
  assert.equal(detectMarket({timeZone: 'UTC', languages: ['en-AU']}), 'au');
  assert.equal(detectMarket({timeZone: 'UTC', languages: ['en-UK']}), 'gb');
  assert.equal(detectMarket({timeZone: 'Asia/Tokyo', languages: ['ja-JP']}), 'intl');
  assert.equal(detectMarket(), 'intl');
});

test('convert uses euro-based rates and refuses unknown currencies', () => {
  const rates = {rates: {USD: 1.1, GBP: 0.85, AUD: 1.65}};
  assert.equal(convert(10, 'EUR', 'GBP', rates), 8.5);
  assert.equal(convert(11, 'USD', 'EUR', rates), 10);
  assert.ok(Math.abs(convert(11, 'USD', 'AUD', rates) - 16.5) < 1e-9);
  assert.equal(convert(10, 'EUR', 'EUR', rates), null);
  assert.equal(convert(10, 'EUR', 'JPY', rates), null);
  assert.equal(convert(10, 'EUR', 'GBP', null), null);
  assert.equal(convert(NaN, 'EUR', 'GBP', rates), null);
});

test('marketLinks pick regional marketplaces', () => {
  const names = m => marketLinks(m, 'Charizard 4').map(([n]) => n);
  assert.deepEqual(names('us'), ['TCGplayer', 'eBay']);
  assert.deepEqual(names('gb'), ['Cardmarket', 'eBay']);
  assert.deepEqual(names('intl'), ['Cardmarket', 'TCGplayer', 'eBay']);
  assert.match(marketLinks('au', 'x').at(-1)[1], /^https:\/\/www\.ebay\.com\.au\//);
  assert.match(marketLinks('de', 'x')[0][1], /cardmarket\.com\/de\//);
  assert.deepEqual(marketLinks('nope', 'x'), marketLinks('intl', 'x'));
  for (const [k, m] of Object.entries(markets)) assert.ok(k === 'intl' || /^[A-Z]{3}$/.test(m.currency), k);
});

test('parseEcb reads the daily ECB file and rejects incomplete data', () => {
  const xml = `<gesmes:Envelope><Cube><Cube time='2026-10-23'><Cube currency='USD' rate='1.0812'/><Cube currency='GBP' rate='0.8411'/><Cube currency='AUD' rate='1.6402'/><Cube currency='CAD' rate='1.4930'/><Cube currency='PLN' rate='4.3120'/></Cube></Cube></gesmes:Envelope>`;
  const r = parseEcb(xml);
  assert.equal(r.date, '2026-10-23');
  assert.equal(r.rates.GBP, 0.8411);
  assert.throws(() => parseEcb(xml.replace(/<Cube currency='GBP'[^>]+>/, '')), /Onvolledige/);
});
