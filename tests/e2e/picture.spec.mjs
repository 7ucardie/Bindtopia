import {copyFileSync, mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import sharp from 'sharp';
import {test, expect, openHome} from './fixtures.mjs';
import {cardFingerprint, encode, distance} from '../../dist/fingerprint.mjs';
import {decodeImage} from '../../scripts/build-fingerprints.mjs';

// The real phone photo as camera feed; the fingerprint of the same card computed in Node, as the workflow does.
const feed = join(mkdtempSync(join(tmpdir(), 'bindtopia-')), 'card.mjpeg');
copyFileSync('tests/fixtures/camera-frame-nymble.jpg', feed);
test.use({locale: 'en', timezoneId: 'America/New_York', launchOptions: {executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + feed]}});

const nymble = cardFingerprint(await decodeImage(await sharp('tests/fixtures/card-nymble-me02-009.jpg').extract({left: 62, top: 66, width: 803, height: 1098}).toBuffer()));
const flip = p => p.map(w => (w ^ 0xA5A5F00F) >>> 0); // a clearly different card
function printsFile(entries) {
  const ids = entries.map(e => e[0]);
  return {version: 1, algo: 'test', ids, data: Buffer.from(encode(entries.map(e => e[1]))).toString('base64')};
}
async function setup(page, context, prints, ocrText = '') {
  await context.grantPermissions(['camera']);
  await page.route('**/data/fingerprints-en.json', route => route.fulfill({json: prints}));
  await page.addInitScript(t => { window.Tesseract = {createWorker: async () => ({setParameters: async () => {}, recognize: async () => ({data: {text: t}}), terminate: async () => {}})}; }, ocrText);
}

test('trade mode recognises a card by its picture alone', async ({page, context}) => {
  test.skip(test.info().project.name !== 'desktop', 'one browser is enough');
  expect(distance(nymble, flip(nymble))).toBeGreaterThan(40);
  await setup(page, context, printsFile([['sv01-1', flip(nymble)], ['me02-009', nymble], ['base1-4', flip(flip(flip(nymble)))]]));
  await openHome(page);
  await page.click('#openTrade');
  await expect(page.locator('#tradeResult .trade-meta strong')).toHaveText('Nymble', {timeout: 20000});
  await expect(page.locator('#tradeResult')).toContainText('Phantasmal Flames');
  await expect(page.locator('#tradeResult .trade-how')).toHaveText('Recognised by the picture');
});

test('no picture match when the catalog has nothing alike', async ({page, context}) => {
  test.skip(test.info().project.name !== 'desktop', 'one browser is enough');
  await setup(page, context, printsFile([['sv01-1', flip(nymble)], ['base1-4', nymble.map(w => (~w) >>> 0)]]));
  await openHome(page);
  await page.click('#openTrade');
  await expect(page.locator('#tradeAttempt')).toHaveText(/Attempt ([3-9]|\d{2,})$/, {timeout: 20000});
  await expect(page.locator('#tradeResult [data-side]')).toHaveCount(0);
});

test('with a Chinese catalog, the picture finds the English print and says so', async ({page, context}) => {
  test.skip(test.info().project.name !== 'desktop', 'one browser is enough');
  await setup(page, context, printsFile([['sv01-1', flip(nymble)], ['me02-009', nymble]]));
  await page.route('**/data/languages.json', route => route.fulfill({json: [{code: 'en', name: 'English', ocr: 'eng'}, {code: 'zh-tw', name: '繁體中文', ocr: 'chi_tra'}]}));
  await page.route(/api\.tcgdex\.net\/v2\/zh-tw\/(cards|sets)$/, route => route.fulfill({json: route.request().url().endsWith('/cards') ? [{id: 'SV7a-001', localId: '001', name: '噴火龍'}] : [{id: 'SV7a', name: '樂園騰龍', cardCount: {official: 64, total: 70}}]}));
  await page.route('**/api/v1/cards/me02-009.json', route => route.fulfill({json: {id: 'me02-009', localId: '009', name: 'Nymble', setId: 'me02', images: null, set: {id: 'me02', name: 'Phantasmal Flames', year: 2025}}}));
  await openHome(page);
  await page.selectOption('#language', 'zh-tw');
  await expect(page.locator('#grid .card h3').first()).toHaveText('噴火龍');
  await page.click('#openTrade');
  await expect(page.locator('#tradeResult .trade-meta strong')).toHaveText('Nymble', {timeout: 20000});
  await expect(page.locator('#tradeResult .trade-how')).toContainText('English print with the same artwork');
});

test('a photo from the in-site camera is recognised by its picture', async ({page, context}) => {
  test.skip(test.info().project.name !== 'desktop', 'one browser is enough');
  await setup(page, context, printsFile([['sv01-1', flip(nymble)], ['me02-009', nymble]]));
  await openHome(page);
  await page.click('#openScan');
  await page.click('#cameraButton');
  await expect.poll(() => page.locator('#webcamVideo').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
  await page.click('#webcamCapture');
  await expect(page.locator('#scanStatus')).toContainText('Recognised by the picture', {timeout: 20000});
  await expect(page.locator('#scanText')).toHaveValue('Nymble 009/94');
  await expect(page.locator('#matches .match').first()).toContainText('Phantasmal Flames · #009');
});
