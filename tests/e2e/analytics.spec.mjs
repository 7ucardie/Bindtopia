import {test, expect, openHome} from './fixtures.mjs';
const token = 'ab'.repeat(16); // fake 32-hex beacon token for tests
const beacon = r => r.url().startsWith('https://static.cloudflareinsights.com/');

async function withToken(page, value) {
  await page.route('**/project.json', async route => {
    const json = await (await route.fetch()).json();
    await route.fulfill({json: {...json, cloudflareAnalyticsToken: value}});
  });
}

test('no analytics without a token', async ({page}) => {
  const requests = [];
  page.on('request', r => beacon(r) && requests.push(r.url()));
  await openHome(page);
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([]);
});

test('cookieless beacon loads with a token', async ({page, context}) => {
  await withToken(page, token);
  const request = page.waitForRequest(beacon);
  await openHome(page);
  await request;
  expect(JSON.parse(await page.locator('script[data-cf-beacon]').getAttribute('data-cf-beacon')).token).toBe(token);
  expect(await context.cookies()).toEqual([]);
});

test('Do Not Track and Global Privacy Control switch analytics off', async ({page}) => {
  await withToken(page, token);
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', {get: () => true}));
  const requests = [];
  page.on('request', r => beacon(r) && requests.push(r.url()));
  await openHome(page);
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([]);
  await expect(page.locator('script[data-cf-beacon]')).toHaveCount(0);
});
