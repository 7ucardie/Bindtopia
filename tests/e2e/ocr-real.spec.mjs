import {test, expect, openHome} from './fixtures.mjs';
import {serveOcr} from './ocr-serve.mjs';

test.describe('real OCR on a phone photo', () => {
  test.use({locale: 'en'});

  test('reads name and collector number from a photo of Nymble 009/094', async ({page, context}) => {
    test.skip(test.info().project.name !== 'desktop', 'one browser is enough for the slow real-OCR run');
    test.setTimeout(180000);
    await serveOcr(page, context);
    await openHome(page);
    await page.click('#openScan');
    await page.setInputFiles('#uploadInput', 'tests/fixtures/card-nymble-me02-009.jpg');
    await expect(page.locator('#matches')).toContainText('Nymble', {timeout: 150000});
    const text = await page.locator('#scanText').inputValue();
    expect(text).toMatch(/Nymble/i);
    expect(text).toMatch(/009\s*\/\s*094/);
    await expect(page.locator('#matches .match').first()).toContainText('Phantasmal Flames · #009');
    await expect(page.locator('#matches .match').first()).toContainText('Card number matches');
  });
});

