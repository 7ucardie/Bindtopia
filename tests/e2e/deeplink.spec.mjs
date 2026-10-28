import {test, expect, openHome, search} from './fixtures.mjs';

// Every card detail has a shareable address (?card=<id>); the back button still closes the detail.
test.use({locale: 'en-US'});

async function openCharizard(page) {
  await search(page, '4/102');
  await page.locator('#grid .card', {hasText: 'base1-4'}).locator('.art').click();
  await expect(page.locator('#detail h1')).toHaveText('Charizard');
}

test('opening a card puts it in the address, other parameters stay, back closes it', async ({page}) => {
  await openHome(page, '/?ui=en');
  await openCharizard(page);
  expect(new URL(page.url()).searchParams.get('card')).toBe('base1-4');
  expect(new URL(page.url()).searchParams.get('ui')).toBe('en');
  await page.goBack();
  await expect(page.locator('#modal')).toBeHidden();
  expect(new URL(page.url()).searchParams.get('card')).toBeNull();
  expect(new URL(page.url()).searchParams.get('ui')).toBe('en');
});

test('a shared card link opens that card, and closing it stays on the site', async ({page}) => {
  await page.goto('/?card=base1-4');
  await expect(page.locator('#modal')).toBeVisible({timeout: 20000});
  await expect(page.locator('#detail h1')).toHaveText('Charizard');
  expect(new URL(page.url()).searchParams.get('card')).toBe('base1-4');
  await page.goBack();
  await expect(page.locator('#modal')).toBeHidden();
  expect(new URL(page.url()).pathname).toBe('/');
  expect(new URL(page.url()).searchParams.get('card')).toBeNull();
  await expect(page.locator('#grid .card').first()).toBeVisible();
});

test('an unknown card in the link is ignored', async ({page}) => {
  await openHome(page, '/?card=does-not-exist');
  await expect(page.locator('#modal')).toBeHidden();
});

test('share uses the system share sheet when the browser has one', async ({page}) => {
  await page.addInitScript(() => { navigator.share = async data => { window.__shared = data; }; });
  await openHome(page);
  await openCharizard(page);
  await page.click('#shareCard');
  const shared = await page.evaluate(() => window.__shared);
  expect(shared.title).toBe('Charizard · Bindtopia');
  expect(new URL(shared.url).searchParams.get('card')).toBe('base1-4');
});

test('without a share sheet the card link is copied', async ({page}) => {
  await page.addInitScript(() => {
    delete Navigator.prototype.share;
    Object.defineProperty(navigator, 'clipboard', {value: {writeText: async t => { window.__copied = t; }}});
  });
  await openHome(page);
  await openCharizard(page);
  await expect(page.locator('#shareCard')).toHaveText('↗ Share card');
  await page.click('#shareCard');
  await expect(page.locator('#toast')).toHaveText('Link to this card copied');
  expect(new URL(await page.evaluate(() => window.__copied)).searchParams.get('card')).toBe('base1-4');
});
