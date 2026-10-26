import {test, expect, openHome, search} from './fixtures.mjs';

test.describe('in English', () => {
  // No region in the language and an unmapped time zone: the International market.
  test.use({locale: 'en', timezoneId: 'Asia/Tokyo'});

  test('home loads the catalog', async ({page}) => {
    await openHome(page);
    await expect(page).toHaveTitle(/Bindtopia/);
    await expect(page.locator('#status')).toContainText('cards');
    expect(await page.locator('#grid .card').count()).toBeGreaterThan(10);
  });

  test('search by name and by collector number', async ({page}) => {
    await openHome(page);
    await search(page, 'Charizard');
    await expect(page.locator('#grid .card h3').first()).toContainText('Charizard');
    await search(page, '4/102');
    await expect(page.locator('#grid .card .tag', {hasText: 'base1-4'})).toBeVisible();
  });

  test('card detail shows prices and marketplace links', async ({page}) => {
    await openHome(page);
    await search(page, '4/102');
    await page.locator('#grid .card', {hasText: 'base1-4'}).locator('.art').click();
    const detail = page.locator('#detail');
    await expect(detail.locator('h1')).toHaveText('Charizard');
    await expect(detail.locator('tr', {hasText: 'Year of release'})).toContainText('1999');
    await expect(detail).toContainText('Indicative prices');
    await expect(detail).toContainText('€310.50');
    await expect(detail).toContainText('$410.25');
    await expect(detail.locator('.links a')).toHaveCount(3);
    await expect(detail.locator('#translateText')).toHaveCount(0);
  });

  test('cards and sets show the release year when the catalog has it', async ({page}) => {
    await page.route('**/data/sets-en.json', async route => {
      const sets = await (await route.fetch()).json();
      await route.fulfill({json: sets.map(s => s.id === 'base1' ? {...s, releaseDate: '1999-01-09'} : s)});
    });
    await openHome(page);
    await search(page, '4/102');
    await expect(page.locator('#grid .card', {hasText: 'base1-4'}).locator('.meta')).toContainText('Base Set · 1999');
    await search(page, 'Base Set');
    await page.locator('[data-view=sets]').first().click();
    await expect(page.locator('#grid .set', {hasText: 'Base Set'}).first()).toContainText('1999 ·');
  });

  test('card detail without pricing keeps the no-prices notice', async ({page}) => {
    await openHome(page);
    await search(page, '2/102');
    await page.locator('#grid .card', {hasText: 'base1-2'}).locator('.art').click();
    await expect(page.locator('#detail h1')).toHaveText('Blastoise');
    await expect(page.locator('#detail')).not.toContainText('Indicative prices');
  });

  test('a card without an image offers an online image search', async ({page}) => {
    await openHome(page);
    await search(page, 'Ancient Mew');
    await page.locator('#grid .card', {hasText: 'miscp-001'}).locator('.art').click();
    const link = page.locator('#detail .links a', {hasText: 'Google'});
    await expect(link).toHaveAttribute('href', /google\.com\/search\?tbm=isch&q=Ancient%20Mew/);
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('save, reload, export and import a card', async ({page}) => {
    await openHome(page);
    await search(page, '4/102');
    await page.locator('#grid .card', {hasText: 'base1-4'}).locator('.heart').click();
    await expect(page.locator('#savedCount')).toHaveText('1');
    await page.reload();
    await expect(page.locator('#savedCount')).toHaveText('1');
    await page.locator('[data-view=saved]').first().click();
    await expect(page.locator('#grid .card')).toHaveCount(1);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#exportSaved')]);
    const exported = JSON.parse(await (await download.createReadStream()).toArray().then(b => Buffer.concat(b).toString()));
    expect(exported.version).toBe(2);
    expect(exported.cards.map(c => c.id)).toEqual(['base1-4']);
    page.once('dialog', d => d.accept());
    await page.click('#clearSaved');
    await expect(page.locator('#savedCount')).toHaveText('0');
    await page.setInputFiles('#importFile', {name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported))});
    await expect(page.locator('#savedCount')).toHaveText('1');
  });

  test('rejects an invalid import file', async ({page}) => {
    await openHome(page);
    await page.locator('[data-view=saved]').first().click();
    await page.setInputFiles('#importFile', {name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1}')});
    await expect(page.locator('#toast')).toBeVisible();
    await expect(page.locator('#savedCount')).toHaveText('0');
  });

  test('only the island theme exists; theme URLs fall back to it', async ({page}) => {
    await openHome(page, '/?theme=armory');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'poke-island');
    await expect(page.locator('#themeToggle')).toHaveCount(0);
  });

  test('sets view lists sets', async ({page}) => {
    await openHome(page);
    await page.locator('[data-view=sets]').first().click();
    await expect(page.locator('#grid.sets .set').first()).toBeVisible();
  });

  test('manual match finds a card from typed text', async ({page}) => {
    await openHome(page);
    await page.click('#openScan');
    await page.fill('#scanText', 'Charizard 4/102');
    await page.click('#matchButton');
    await expect(page.locator('#matches')).toContainText('Charizard');
  });
});

test.describe('in Dutch', () => {
  test.use({locale: 'nl-NL'});

  test('translate button shows official Dutch text and switches back', async ({page}) => {
    await openHome(page, '/?ui=nl');
    await search(page, '4/102');
    await page.locator('#grid .card', {hasText: 'base1-4'}).locator('.art').click();
    const button = page.locator('#translateText');
    await expect(button).toHaveText('Vertaal kaarttekst');
    await expect(page.locator('#cardText')).toContainText('Fire Spin');
    await button.click();
    await expect(page.locator('#cardText')).toContainText('Vuurspiraal');
    await expect(page.locator('#cardText')).toHaveAttribute('lang', 'nl');
    await expect(button).toHaveText('Toon origineel');
    await button.click();
    await expect(page.locator('#cardText')).toContainText('Fire Spin');
  });

  test('translate button reports a missing translation', async ({page}) => {
    await openHome(page, '/?ui=nl');
    await search(page, '2/102');
    await page.locator('#grid .card', {hasText: 'base1-2'}).locator('.art').click();
    await page.click('#translateText');
    await expect(page.locator('#toast')).toContainText('Geen officiële vertaling');
    await expect(page.locator('#cardText')).toContainText('Hydro Pump');
  });

  test('English is the default even for a Dutch browser', async ({page}) => {
    await openHome(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#interfaceLanguage')).toHaveValue('en');
  });

  test('a chosen interface language is remembered on the next visit', async ({page}) => {
    await openHome(page);
    await page.selectOption('#interfaceLanguage', 'de');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await openHome(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await openHome(page, '/?ui=nl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  });
});
