import {test, expect, openHome, search} from './fixtures.mjs';

// Cards TCGdex lacks can be added by hand: to the collection (with set, number, own price and note) and in trade mode.
test.use({locale: 'en-US', timezoneId: 'America/New_York'});

const readDownload = async download => JSON.parse(Buffer.concat(await (await download.createReadStream()).toArray()).toString());

test('a card added by hand is saved, marked, reportable, exported, deleted and imported again', async ({page}) => {
  await openHome(page);
  await page.click('[data-view=saved]');
  await page.click('#addCardOpen');
  const form = page.locator('#addCardForm');
  await expect(page.locator('#addCardCurrency')).toHaveText('USD');
  await form.locator('[name=name]').fill('Ancient Mew Prototype');
  await form.locator('[name=setName]').fill('Movie promo');
  await form.locator('[name=localId]').fill('1');
  await form.locator('[name=amount]').fill('abc');
  await form.locator('button.primary').click();
  await expect(page.locator('#toast')).toHaveText('Enter a valid price, for example 12.50, or leave the field empty.');
  await form.locator('[name=amount]').fill('20');
  await form.locator('[name=note]').fill('Mint, private note');
  await form.locator('button.primary').click();
  await expect(page.locator('#addCard')).toBeHidden();
  await expect(page.locator('#savedCount')).toHaveText('1');

  const card = page.locator('#grid .card', {hasText: 'Ancient Mew Prototype'});
  await expect(card.locator('.tag')).toHaveText('EN · Own entry');
  await expect(card).toContainText('Movie promo');
  await card.locator('.art').click();
  const detail = page.locator('#detail');
  await expect(detail.locator('h1')).toHaveText('Ancient Mew Prototype');
  await expect(detail).toContainText('You added this card yourself. The details do not come from TCGdex and have not been checked.');
  await expect(detail.locator('tr', {hasText: 'Own price'})).toContainText('$20.00');
  await expect(detail.locator('tr', {hasText: 'Note'})).toContainText('Mint, private note');
  await expect(detail.locator('#shareCard')).toHaveCount(0);
  const report = detail.locator('#reportCard');
  await expect(report).toHaveText('Report this card to TCGdex ↗');
  const href = await report.getAttribute('href');
  expect(href).toMatch(/^https:\/\/github\.com\/tcgdex\/cards-database\/issues\/new\?/);
  expect(new URL(href).searchParams.get('title')).toBe('Missing card: Ancient Mew Prototype 1 (Movie promo)');
  expect(href).not.toContain('private');
  await page.keyboard.press('Escape');

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#exportSaved')]);
  const exported = await readDownload(download);
  expect(exported.version).toBe(2);
  expect(exported.cards[0]).toMatchObject({custom: true, setId: 'custom', name: 'Ancient Mew Prototype', price: {amount: 20, currency: 'USD'}});

  // Removing an own entry deletes it, so it asks first.
  await card.locator('.art').click();
  page.once('dialog', d => d.accept());
  await detail.locator('#detailSave').click();
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('#savedCount')).toHaveText('0');

  await page.setInputFiles('#importFile', {name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported))});
  await expect(page.locator('#toast')).toHaveText('Backup imported');
  await expect(page.locator('#grid .card', {hasText: 'Ancient Mew Prototype'})).toBeVisible();

  // A tampered own entry with an image is not a valid backup.
  const bad = {...exported, cards: [{...exported.cards[0], image: 'https://evil.example/x'}]};
  await page.setInputFiles('#importFile', {name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad))});
  await expect(page.locator('#toast')).toHaveText('This file is not a valid Bindtopia backup.');
});

test('a search without results offers to add the card yourself', async ({page}) => {
  await openHome(page);
  await search(page, 'Zzyzx Promo');
  const add = page.locator('#grid .empty button');
  await expect(add).toHaveText('Card not listed? Add it yourself');
  await add.click();
  await expect(page.locator('#addCard')).toBeVisible();
  await expect(page.locator('#addCardForm [name=name]')).toHaveValue('Zzyzx Promo');
});

test('trade mode adds a card by hand with an agreed price that counts in the totals', async ({page}) => {
  await openHome(page);
  await page.click('#openTrade');
  await page.fill('#tradeQuery', 'Zzyzx Promo');
  await page.click('#tradeManual');
  const form = page.locator('#tradeManualForm');
  await expect(form.locator('[name=name]')).toHaveValue('Zzyzx Promo');
  await form.locator('[name=amount]').fill('15');
  await form.locator('[data-side=give]').click();
  await expect(page.locator('#tradeGive li')).toHaveCount(1);
  await expect(page.locator('#tradeGive li')).toContainText('Zzyzx Promo · own entry');
  await expect(page.locator('#tradeGiveTotal')).toHaveText('$15.00');
  await expect(page.locator('#tradeBalance')).toHaveText('You give more value: $15.00');
  await expect(page.locator('#tradeResult')).toBeHidden();

  // Without a price it is listed but not counted.
  await page.click('#tradeManual');
  await form.locator('[name=name]').fill('Mystery card');
  await form.locator('[data-side=get]').click();
  await expect(page.locator('#tradeGet li')).toContainText('Mystery card');
  await expect(page.locator('#tradeBalance')).toContainText('1 not counted');
});
