import {readdirSync} from 'node:fs';
import {test, expect} from './fixtures.mjs';
const pages = readdirSync(new URL('../../dist/', import.meta.url)).filter(f => f.endsWith('.html'));

for (const name of pages) {
  test(`${name} loads without broken local resources or links`, async ({page, request}) => {
    const failed = [];
    page.on('response', r => { if (r.url().startsWith('http://127.0.0.1') && r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
    await page.goto('/' + name);
    await page.waitForLoadState('load');
    expect(failed).toEqual([]);
    const links = await page.locator('a[href]').evaluateAll(as => as.map(a => a.href).filter(h => h.startsWith(location.origin)));
    for (const href of new Set(links.map(h => h.split('#')[0]))) expect((await request.get(href)).status(), href).toBe(200);
  });
}
