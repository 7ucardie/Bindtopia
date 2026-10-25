import {test as base, expect} from '@playwright/test';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
export const cards = {
  'en/base1-4': {id: 'base1-4', localId: '4', name: 'Charizard', category: 'Pokemon', hp: 120, types: ['Fire'], rarity: 'Rare', image: 'https://assets.tcgdex.net/en/base/base1/4', set: {id: 'base1', name: 'Base Set', cardCount: {official: 102}},
    abilities: [{name: 'Energy Burn', effect: 'As often as you like during your turn, you may turn all Energy attached to Charizard into Fire Energy.'}],
    attacks: [{name: 'Fire Spin', damage: 100, effect: 'Discard 2 Energy cards attached to Charizard in order to use this attack.', cost: ['Fire', 'Fire', 'Fire', 'Fire']}],
    pricing: {cardmarket: {updated: '2026-10-20T00:00:00Z', unit: 'EUR', low: 120, trend: 310.5, avg: 290}, tcgplayer: {updated: '2026-10-20T00:00:00Z', unit: 'USD', holofoil: {lowPrice: 250, marketPrice: 410.25, highPrice: 900}}}},
  'nl/base1-4': {id: 'base1-4', localId: '4', name: 'Glurak', set: {id: 'base1', name: 'Basisset'},
    abilities: [{name: 'Energieverbranding', effect: 'NL-vaardigheidstekst'}], attacks: [{name: 'Vuurspiraal', damage: 100, effect: 'NL-aanvalstekst', cost: ['Fire']}]},
  'en/base1-2': {id: 'base1-2', localId: '2', name: 'Blastoise', category: 'Pokemon', image: 'https://assets.tcgdex.net/en/base/base1/2', set: {id: 'base1', name: 'Base Set', cardCount: {official: 102}},
    attacks: [{name: 'Hydro Pump', damage: '40+', effect: 'Extra damage.'}]},
};
// Every test runs offline: TCGdex is served from fixtures and other hosts are refused.
export const test = base.extend({
  page: async ({page}, use) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => {
      const url = new URL(route.request().url());
      if (url.host === 'assets.tcgdex.net') return route.fulfill({body: png, contentType: 'image/png'});
      const m = url.host === 'api.tcgdex.net' && url.pathname.match(/^\/v2\/([a-z-]+)\/cards\/(.+)$/);
      if (m) { const card = cards[m[1] + '/' + decodeURIComponent(m[2])]; return card ? route.fulfill({json: card}) : route.fulfill({status: 404, json: {error: 'not found'}}); }
      return route.abort('blockedbyclient');
    });
    await use(page);
    expect(errors, 'page errors').toEqual([]);
  },
});
export {expect};
export async function openHome(page, path = '/') {
  await page.goto(path);
  await expect(page.locator('#grid .card').first()).toBeVisible({timeout: 20000});
}
export async function search(page, q) {
  await page.fill('#query', q);
  await page.press('#query', 'Enter');
}
