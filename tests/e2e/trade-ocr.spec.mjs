import {copyFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test, expect, openHome} from './fixtures.mjs';
import {serveOcr} from './ocr-serve.mjs';

// A real phone photo as the camera feed (Chromium reads a .mjpeg file, which may be a single JPEG) and the real OCR engine.
const feed = join(mkdtempSync(join(tmpdir(), 'bindtopia-')), 'card.mjpeg');
// A 1920x1080 frame with the card held so that it fills the on-screen guide, as a person would.
copyFileSync('tests/fixtures/camera-frame-nymble.jpg', feed);
test.use({locale: 'en', timezoneId: 'Europe/Amsterdam', launchOptions: {executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + feed]}});

test('trade mode recognises a real card from the live camera', async ({page, context}) => {
  test.skip(test.info().project.name !== 'desktop', 'one browser is enough for the slow real-OCR run');
  test.setTimeout(180000);
  await serveOcr(page, context);
  await context.grantPermissions(['camera']);
  await openHome(page);
  await page.click('#openTrade');
  await expect(page.locator('#tradeResult .trade-meta strong')).toHaveText('Nymble', {timeout: 150000});
  await expect(page.locator('#tradeResult')).toContainText('Phantasmal Flames');
  await expect(page.locator('#tradeResult')).toContainText('#009');
});
