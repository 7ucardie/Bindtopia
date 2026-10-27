import {test, expect, openHome} from './fixtures.mjs';

// A measured language list with Traditional Chinese, and a tiny zh-tw catalog from "TCGdex".
const languages = [{code: 'en', name: 'English', ocr: 'eng', cards: 23736}, {code: 'ja', name: '日本語', ocr: 'jpn', cards: 15000}, {code: 'zh-tw', name: '繁體中文', ocr: 'chi_tra', cards: 9000}];
const cards = [{id: 'SV7a-001', localId: '001', name: '噴火龍'}, {id: 'SV7a-025', localId: '025', name: '皮卡丘'}];
const sets = [{id: 'SV7a', name: '樂園騰龍', cardCount: {official: 64, total: 70}}];

async function withChinese(page) {
  await page.route('**/data/languages.json', route => route.fulfill({json: languages}));
  await page.route(/api\.tcgdex\.net\/v2\/zh-tw\/(cards|sets)$/, route => route.fulfill({json: route.request().url().endsWith('/cards') ? cards : sets}));
}

test.use({locale: 'en'});

test('the card-language picker lists the measured languages, including Chinese', async ({page}) => {
  await withChinese(page);
  await openHome(page);
  await expect(page.locator('#language option')).toHaveText(['English', '日本語', '繁體中文']);
  await page.selectOption('#language', 'zh-tw');
  await expect(page.locator('#grid .card h3').first()).toHaveText('噴火龍');
  await page.fill('#query', '皮卡丘');
  await page.press('#query', 'Enter');
  await expect(page.locator('#grid .card h3')).toHaveText(['皮卡丘']);
});

test('photo recognition uses the Chinese model for a Chinese catalog and matches Chinese text', async ({page, context}) => {
  await withChinese(page);
  await context.grantPermissions(['camera']);
  await page.addInitScript(() => {
    window.__langs = [];
    window.Tesseract = {createWorker: async lang => { window.__langs.push(lang); return {setParameters: async () => {}, recognize: async () => ({data: {text: '噴火龍 HP 330\n001/064'}}), terminate: async () => {}}; }};
  });
  await openHome(page);
  await page.selectOption('#language', 'zh-tw');
  await expect(page.locator('#grid .card h3').first()).toHaveText('噴火龍');
  await page.click('#openTrade');
  await expect(page.locator('#tradeResult .trade-meta strong')).toHaveText('噴火龍');
  expect(await page.evaluate(() => window.__langs)).toEqual(['chi_tra']);
});

test('a broken language list keeps the built-in languages', async ({page}) => {
  await page.route('**/data/languages.json', route => route.fulfill({json: [{code: 'xx<script>', name: 'bad', ocr: 'x'}]}));
  await openHome(page);
  await expect(page.locator('#language option')).toHaveCount(7);
});
