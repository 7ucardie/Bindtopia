import {test, expect, openHome} from './fixtures.mjs';

// The real OCR engine loads from a CDN that tests cannot reach; this stand-in "reads" window.__ocrText.
// window.__wordSize (fraction of the image height) adds word boxes so the distance advice can be checked.
const fakeOcr = text => {
  window.__ocrText = text;
  const words = canvas => window.__wordSize ? [{paragraphs: [{lines: [{words: ['alpha', 'bravo', 'charlie'].map(t => ({text: t, confidence: 90, bbox: {y0: 0, y1: canvas.height * window.__wordSize}}))}]}]}] : [];
  window.Tesseract = {createWorker: async () => ({setParameters: async () => {}, recognize: async canvas => { await new Promise(r => setTimeout(r, 50)); return {data: {text: window.__ocrText, blocks: words(canvas)}}; }, terminate: async () => {}})};
};
async function openTrade(page, context, text) {
  await context.grantPermissions(['camera']);
  await page.addInitScript(fakeOcr, text);
  await openHome(page);
  await page.click('#openTrade');
  await expect(page.locator('#trade')).toBeVisible();
}

test.describe('trade mode', () => {
  test.use({locale: 'en-US', timezoneId: 'America/New_York'});

  test('scans a card, shows its price and keeps a running balance', async ({page, context}) => {
    await openTrade(page, context, 'Charizard HP 120\n4/102');
    await expect(page.locator('#tradeResult')).toContainText('Charizard');
    await expect(page.locator('#tradeResult')).toContainText('Base Set · 1999 · #4');
    await expect(page.locator('#tradePrice')).toHaveText('$410.25');
    await expect(page.locator('#tradeStatus')).toContainText('Found: Charizard');
    await expect(page.locator('#tradeAttempt')).toContainText('Attempt');
    await page.evaluate(() => { window.__ocrText = 'Blastoise 2/102'; });
    await page.click('#tradeResult [data-side=get]');
    await expect(page.locator('#tradeGet li')).toHaveCount(1);
    await expect(page.locator('#tradeGetTotal')).toHaveText('$410.25');
    await expect(page.locator('#tradeBalance')).toHaveText('You get more value: $410.25');

    await expect(page.locator('#tradeResult')).toContainText('Blastoise');
    await expect(page.locator('#tradePrice')).toHaveText('No price known');
    await page.click('#tradeResult [data-side=give]');
    await expect(page.locator('#tradeBalance')).toContainText('1 not counted (no price or rate)');

    await page.locator('#tradeGet li button').click();
    await expect(page.locator('#tradeGet li')).toHaveCount(0);
    await page.click('#tradeClear');
    await expect(page.locator('#tradeBalance')).toHaveText('');
  });

  test('says when it cannot find the card yet, and manual entry still works', async ({page, context}) => {
    await openTrade(page, context, 'blurry glare');
    await expect(page.locator('#tradeHint')).toBeVisible({timeout: 15000});
    await expect(page.locator('#tradeHint')).toContainText('Not found yet. This can take a moment');
    await expect(page.locator('#tradeStatus')).toHaveText('Not found yet, still looking…');
    await expect(page.locator('#tradeDot')).toHaveClass(/busy/);
    await page.fill('#tradeQuery', 'Charizard 4/102');
    await page.press('#tradeQuery', 'Enter');
    await expect(page.locator('#tradePrice')).toHaveText('$410.25');
    await expect(page.locator('#tradeDot')).toHaveClass(/found/);
  });

  test('gives distance advice from the size of the text it reads', async ({page, context}) => {
    await openTrade(page, context, 'blurry');
    await expect(page.locator('#tradeGuide')).toHaveText(/can’t see any text yet/);
    await page.evaluate(() => { window.__wordSize = 0.01; });
    await expect(page.locator('#tradeGuide')).toHaveText('Come a bit closer: let the card fill the frame.');
    await page.evaluate(() => { window.__wordSize = 0.12; });
    await expect(page.locator('#tradeGuide')).toHaveText('A bit further away: the whole card must fit inside the frame.');
    await page.evaluate(() => { window.__wordSize = 0.04; });
    await expect(page.locator('#tradeGuide')).toHaveText('Distance is good.');
    await expect(page.locator('#tradeCamera .card-guide .zone-name')).toHaveAttribute('data-label', 'Name');
  });

  test('a name alone offers choices instead of guessing', async ({page, context}) => {
    await openTrade(page, context, 'nothing');
    await page.fill('#tradeQuery', 'Charizard');
    await page.press('#tradeQuery', 'Enter');
    await expect(page.locator('#tradeResult')).toContainText('Did you mean:');
    const choices = page.locator('#tradeResult .trade-alts button.outline');
    expect(await choices.count()).toBeGreaterThan(1);
    await choices.first().click();
    await expect(page.locator('#tradeResult .trade-meta strong')).toHaveText(/Charizard/);
    await expect(page.locator('#tradeResult [data-side=get]')).toBeVisible();
  });

  test('the card just added is not offered again while it is still in view', async ({page, context}) => {
    await openTrade(page, context, 'Charizard 4/102');
    await expect(page.locator('#tradePrice')).toHaveText('$410.25');
    await page.click('#tradeResult [data-side=get]');
    await page.waitForTimeout(1500);
    await expect(page.locator('#tradeResult')).toBeHidden();
    await expect(page.locator('#tradeGet li')).toHaveCount(1);
  });

  test('a number read from noise is not taken as a find', async ({page, context}) => {
    // e.g. a card in another language: no name the catalog knows, but something that looks like "18/91".
    await openTrade(page, context, '燃烧 火焰 18/91 ~~');
    await expect(page.locator('#tradeAttempt')).toHaveText(/Attempt ([3-9]|\d{2,})$/, {timeout: 15000});
    await expect(page.locator('#tradeStatus')).not.toContainText('Found');
    await expect(page.locator('#tradeResult [data-side]')).toHaveCount(0);
  });

  test('the header with the close button stays visible and the back button closes trade mode', async ({page, context}) => {
    await openTrade(page, context, 'nothing');
    await page.locator('#trade').evaluate(d => d.scrollTo(0, d.scrollHeight));
    await expect(page.locator('#tradeClose')).toBeInViewport();
    const url = page.url();
    await page.goBack();
    await expect(page.locator('#trade')).toBeHidden();
    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => document.querySelector('#tradeVideo').srcObject)).toBeNull();
  });

  test('closing trade mode turns the camera off', async ({page, context}) => {
    await openTrade(page, context, 'nothing');
    await expect.poll(() => page.locator('#tradeVideo').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.click('#tradeClose');
    await expect(page.locator('#trade')).toBeHidden();
    expect(await page.evaluate(() => document.querySelector('#tradeVideo').srcObject)).toBeNull();
  });

  test('without a camera it falls back to typing', async ({page}) => {
    await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError')); });
    await openHome(page);
    await page.click('#openTrade');
    await expect(page.locator('#tradeStatus')).toContainText('Type the name and number below');
    await expect(page.locator('#tradeCamera')).toBeHidden();
    await page.fill('#tradeQuery', '4/102');
    await page.press('#tradeQuery', 'Enter');
    await expect(page.locator('#tradeResult')).toContainText('Charizard');
  });
});

test.describe('trade mode in the UK', () => {
  test.use({locale: 'en-GB', timezoneId: 'Europe/London'});
  test('uses Cardmarket and pounds for the headline and totals', async ({page, context}) => {
    await page.route('**/data/rates.json', route => route.fulfill({json: {date: '2026-10-23', rates: {USD: 1.1, GBP: 0.85, AUD: 1.65, CAD: 1.5, PLN: 4.3}}}));
    await openTrade(page, context, 'Charizard 4/102');
    await expect(page.locator('#tradePrice')).toHaveText('€310.50 (≈ £263.93)');
    await expect(page.locator('#tradeSource')).toHaveText('Cardmarket');
    await page.click('#tradeResult [data-side=give]');
    await expect(page.locator('#tradeGiveTotal')).toHaveText('£263.93');
  });
});
