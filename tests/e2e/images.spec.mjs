import {test, expect, openHome, search} from './fixtures.mjs';

// TCGdex sometimes has a new card only as PNG at first: a failed WebP is tried once as PNG, then a placeholder.
test('a card image missing as WebP falls back to PNG, and to a placeholder when both are missing', async ({page}) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  const asked = [];
  await page.route('https://assets.tcgdex.net/**', route => {
    const url = route.request().url();
    asked.push(url);
    if (url.endsWith('/base/base1/4/low.png')) return route.fulfill({body: png, contentType: 'image/png'});
    return route.fulfill({status: 404, body: ''});
  });
  await openHome(page);
  await search(page, '4/102');
  const charizard = page.locator('#grid .card', {has: page.locator('.tag', {hasText: 'base1-4'})}).first();
  await expect(charizard.locator('img[src$="/base/base1/4/low.png"]')).toBeVisible();
  expect(asked).toContain('https://assets.tcgdex.net/en/base/base1/4/low.webp');
  await search(page, 'Blastoise');
  const blastoise = page.locator('#grid .card', {has: page.locator('.tag', {hasText: 'base1-2'})}).first();
  await expect(blastoise.locator('.placeholder')).toBeVisible();
  expect(asked).toContain('https://assets.tcgdex.net/en/base/base1/2/low.png');
});
