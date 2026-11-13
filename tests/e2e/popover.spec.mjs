import {test, expect, openHome, search} from './fixtures.mjs';

// A card opens as a popover over the catalog, never as a separate page; the static pages for search engines
// send a visitor into the app with that popover.
test.use({locale: 'en-US'});

test('a card in the catalog opens as a popover without leaving the page', async ({page}) => {
  await openHome(page, '/?ui=en');
  await page.evaluate(() => (window.__samePage = true));
  await search(page, '4/102');
  await page.locator('#grid .card', {hasText: 'base1-4'}).locator('.art').click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#detail h1')).toHaveText('Charizard');
  expect(new URL(page.url()).pathname).toBe('/');
  expect(await page.evaluate(() => window.__samePage)).toBe(true);
});

test('"All sets" in the footer opens the sets view in place', async ({page}) => {
  await openHome(page, '/?ui=en');
  await page.evaluate(() => (window.__samePage = true));
  await page.locator('footer a[href="sets/"]').click();
  await expect(page.locator('nav button[data-view="sets"]')).toHaveClass(/active/);
  expect(new URL(page.url()).pathname).toBe('/');
  expect(await page.evaluate(() => window.__samePage)).toBe(true);
});

test('a card on a static set page opens in the app as a popover', async ({page}) => {
  await page.goto('/set/base1/');
  const link = page.locator('.set-grid a[data-card="base1-4"]');
  await expect(link).toHaveAttribute('href', '/card/base1-4/');
  await link.click();
  await expect(page.locator('#modal')).toBeVisible({timeout: 20000});
  await expect(page.locator('#detail h1')).toHaveText('Charizard');
  expect(new URL(page.url()).pathname).toBe('/');
});

test('a static card page links its next card into the app as well', async ({page}) => {
  await page.goto('/card/base1-3/');
  await expect(page.locator('h1')).toHaveText('Chansey');
  await page.locator('a[rel="next"]').click();
  await expect(page.locator('#detail h1')).toHaveText('Charizard', {timeout: 20000});
});
