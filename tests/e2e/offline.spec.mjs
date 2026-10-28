import {test, expect, openHome, search, cards} from './fixtures.mjs';

// The service worker's own requests bypass page.route(), so this spec serves TCGdex at context level and
// can cut the whole connection (site included) to check what keeps working on a card-show floor.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const cors = {'access-control-allow-origin': '*', 'access-control-expose-headers': '*'};

test.use({serviceWorkers: 'allow', locale: 'en-US', timezoneId: 'America/New_York'});

test('search, card details, trade mode and the trade list keep working offline', async ({page, context}) => {
  let offline = false;
  await context.route(/.*/, route => {
    if (offline) return route.abort('internetdisconnected');
    const url = new URL(route.request().url());
    if (url.host === '127.0.0.1:4173') return route.continue();
    if (url.host === 'assets.tcgdex.net') return route.fulfill({body: png, contentType: 'image/png', headers: cors});
    const m = url.host === 'api.tcgdex.net' && url.pathname.match(/^\/v2\/([a-z-]+)\/cards\/(.+)$/);
    const card = m && cards[m[1] + '/' + decodeURIComponent(m[2])];
    if (card) return route.fulfill({json: card, headers: cors});
    if (url.host === 'api.tcgdex.net' && /\/sets\/base1$/.test(url.pathname)) return route.fulfill({json: {id: 'base1', name: 'Base Set', releaseDate: '1999-01-09'}, headers: cors});
    return route.abort('blockedbyclient');
  });
  await context.grantPermissions(['camera']);
  await page.addInitScript(() => {
    window.Tesseract = {createWorker: async () => ({setParameters: async () => {}, recognize: async () => ({data: {text: 'Charizard 4/102', blocks: []}}), terminate: async () => {}})};
  });

  // First visit, online: the worker installs and keeps the site; viewing a card keeps its details and price.
  await openHome(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    while (!navigator.serviceWorker.controller) await new Promise(r => setTimeout(r, 50));
  });
  await search(page, '4/102');
  await page.locator('#grid .card', {hasText: 'base1-4'}).locator('.art').click();
  await expect(page.locator('#detail .price-date')).toHaveText('Price date: 10/20/2026');
  await expect(page.locator('#detail .offline-note')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.click('#openTrade');
  await expect(page.locator('#tradePrice')).toHaveText('$410.25');
  await expect(page.locator('#tradeSource')).toHaveText('TCGplayer · holofoil · 10/20/2026');
  await page.click('#tradeResult [data-side=get]');
  await expect(page.locator('#tradeGet li')).toHaveCount(1);
  await page.click('#tradeClose');
  // Closing a dialog steps back in history; let that finish before reloading.
  await page.waitForFunction(() => !history.state?.dialog);

  // No connection at all: the site, catalogue and last known prices come from this device.
  offline = true;
  await context.setOffline(true);
  await openHome(page);
  await search(page, '4/102');
  await page.locator('#grid .card', {hasText: 'base1-4'}).locator('.art').click();
  await expect(page.locator('#detail h1')).toHaveText('Charizard');
  await expect(page.locator('#detail .offline-note')).toHaveText('Offline: this is the last known information saved on this device.');
  await expect(page.locator('#detail .price-date')).toHaveText('Price date: 10/20/2026');
  await page.keyboard.press('Escape');

  await page.click('#openTrade');
  await expect(page.locator('#tradeGet li'), 'the trade list survives the reload').toHaveCount(1);
  await expect(page.locator('#tradeGetTotal')).toHaveText('$410.25');
  await expect(page.locator('#tradePrice')).toHaveText('$410.25');
  await expect(page.locator('#tradeSource')).toHaveText('TCGplayer · holofoil · 10/20/2026 · offline, last known price');
  await page.click('#tradeClear');
  await expect(page.locator('#tradeGet li')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('bindtopia-trade'))).toBeNull();
});

test('clearing offline data removes the copy, the trade list and the worker', async ({page}) => {
  await openHome(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    localStorage.setItem('bindtopia-trade', '[]');
  });
  await page.goto('/cookies.html');
  await page.click('#eraseOffline');
  await expect(page.locator('#eraseStatus')).toContainText('offline kopie');
  expect(await page.evaluate(async () => ({
    caches: (await caches.keys()).filter(k => k.startsWith('bindtopia-')),
    workers: (await navigator.serviceWorker.getRegistrations()).length,
    trade: localStorage.getItem('bindtopia-trade'),
  }))).toEqual({caches: [], workers: 0, trade: null});
});

test('real text recognition works offline after one use online', async ({page, context}) => {
  test.skip(test.info().project.name !== 'desktop', 'one browser is enough for the slow real-OCR run');
  test.setTimeout(300000);
  const {serveOcr} = await import('./ocr-serve.mjs');
  await serveOcr(page, context);
  let offline = false;
  // Registered after serveOcr, so these win: offline, nothing is served from the npm packages any more.
  const cut = route => offline ? route.abort('internetdisconnected') : route.fallback();
  await context.route(/.*/, cut);
  await page.route(/.*/, cut);
  const scan = async () => {
    await page.click('#openScan');
    await page.setInputFiles('#uploadInput', 'tests/fixtures/card-nymble-me02-009.jpg');
    await expect(page.locator('#matches .match').first()).toContainText('Phantasmal Flames · #009', {timeout: 150000});
  };
  await openHome(page, '/?ui=en');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    while (!navigator.serviceWorker.controller) await new Promise(r => setTimeout(r, 50));
  });
  await scan();
  offline = true;
  await context.setOffline(true);
  await openHome(page, '/?ui=en');
  await scan();
});
