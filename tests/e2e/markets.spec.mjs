import {test, expect, openHome, search} from './fixtures.mjs';

const rates = {source: 'European Central Bank', base: 'EUR', date: '2026-10-23', rates: {USD: 1.1, GBP: 0.85, AUD: 1.65, CAD: 1.5, PLN: 4.3}};
async function openCharizard(page) {
  await page.route('**/data/rates.json', route => route.fulfill({json: rates}));
  await openHome(page);
  await search(page, '4/102');
  await page.locator('#grid .card', {hasText: 'base1-4'}).locator('.art').click();
  await expect(page.locator('#detail h1')).toHaveText('Charizard');
  return page.locator('#detail');
}
const sources = detail => detail.locator('h4').allTextContents();
const links = detail => detail.locator('.links a').evaluateAll(as => as.map(a => a.href));

test.describe('United Kingdom', () => {
  test.use({locale: 'en-GB', timezoneId: 'Europe/London'});
  test('Cardmarket first, pounds, UK marketplaces', async ({page}) => {
    const detail = await openCharizard(page);
    await expect(page.locator('#marketSelect')).toHaveValue('gb');
    expect((await sources(detail))[0]).toBe('Cardmarket');
    await expect(detail).toContainText('€310.50 (≈ £263.93)');
    await expect(detail).toContainText('European Central Bank');
    const hrefs = await links(detail);
    expect(hrefs.some(h => h.startsWith('https://www.ebay.co.uk/'))).toBe(true);
    expect(hrefs.some(h => h.includes('tcgplayer'))).toBe(false);
  });
});

test.describe('Australia', () => {
  test.use({locale: 'en-AU', timezoneId: 'Australia/Sydney'});
  test('TCGplayer first, Australian dollars, eBay Australia', async ({page}) => {
    const detail = await openCharizard(page);
    await expect(page.locator('#marketSelect')).toHaveValue('au');
    expect((await sources(detail))[0]).toMatch(/^TCGplayer/);
    await expect(detail).toContainText('(≈ A$615.37)');
    expect((await links(detail)).some(h => h.startsWith('https://www.ebay.com.au/'))).toBe(true);
  });
});

test.describe('United States', () => {
  test.use({locale: 'en-US', timezoneId: 'America/New_York'});
  test('TCGplayer in dollars is not converted, Cardmarket is', async ({page}) => {
    const detail = await openCharizard(page);
    await expect(page.locator('#marketSelect')).toHaveValue('us');
    await expect(detail.locator('td', {hasText: '$410.25'})).not.toContainText('≈');
    await expect(detail).toContainText('€310.50 (≈ $341.55)');
  });

  test('a chosen market is remembered', async ({page}) => {
    await openCharizard(page);
    await page.selectOption('#marketSelect', 'de');
    await expect(page.locator('#detail .links a', {hasText: 'eBay'})).toHaveAttribute('href', /^https:\/\/www\.ebay\.de\//);
    const detail = await openCharizard(page);
    await expect(page.locator('#marketSelect')).toHaveValue('de');
    await expect(detail.locator('.links a', {hasText: 'Cardmarket'})).toHaveAttribute('href', /cardmarket\.com\/de\//);
  });
});

test.describe('without exchange rates', () => {
  test.use({locale: 'en-GB', timezoneId: 'Europe/London'});
  test('prices stay in their own currency and no conversion note is shown', async ({page}) => {
    await page.route('**/data/rates.json', route => route.fulfill({status: 404, body: ''}));
    await openHome(page);
    await search(page, '4/102');
    await page.locator('#grid .card', {hasText: 'base1-4'}).locator('.art').click();
    await expect(page.locator('#detail')).toContainText('€310.50');
    await expect(page.locator('#detail')).not.toContainText('≈');
  });
});
