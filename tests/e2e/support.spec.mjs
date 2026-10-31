import {test, expect} from './fixtures.mjs';

// Costs and the optional Ko-fi link come from project.json; without a Ko-fi username the link stays hidden.
const config = {sponsorsUsername: '7ucardie', kofiUsername: 'bindtopia', costs: [
  {item: 'Domeinnaam bindtopia.com', itemEn: 'Domain name bindtopia.com', perYear: 12, currency: 'EUR'},
  {item: 'Apple Developer Program', itemEn: 'Apple Developer Program', perYear: 99, currency: 'EUR'},
]};

test('the rights page lists the costs and shows Ko-fi once configured', async ({page}) => {
  await page.route('**/project.json', r => r.fulfill({json: config}));
  await page.goto('/rechten.html');
  await expect(page.locator('#costs li')).toHaveText(['Domeinnaam bindtopia.com: € 12 per jaar', 'Apple Developer Program: € 99 per jaar']);
  await expect(page.locator('.kofi-link')).toHaveAttribute('href', 'https://ko-fi.com/bindtopia');
  await page.goto('/legal-en.html#rights');
  await expect(page.locator('#costs li').first()).toHaveText('Domain name bindtopia.com: €12 per year');
  await page.goto('/?ui=en');
  await expect(page.locator('#kofiLink')).toHaveText('☕ Support on Ko-fi');
  await expect(page.locator('#kofiLink')).toHaveAttribute('href', 'https://ko-fi.com/bindtopia');
});

test('without a Ko-fi username the link stays hidden and the costs show without amounts', async ({page}) => {
  await page.goto('/rechten.html');
  await expect(page.locator('#costs li')).toHaveText(['Domeinnaam bindtopia.com']);
  await expect(page.locator('.kofi-link')).toBeHidden();
  await page.goto('/');
  await expect(page.locator('#sponsorLink')).toBeVisible();
  await expect(page.locator('#kofiLink')).toBeHidden();
});
