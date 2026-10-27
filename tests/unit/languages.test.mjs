import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pickLanguages, CANDIDATES, MIN_CARDS} from '../../scripts/sync-languages.mjs';

test('pickLanguages keeps measured languages with a usable catalog, in a fixed order', () => {
  const measured = {en: {cards: 23000, sets: 220}, 'zh-tw': {cards: 9000, sets: 120}, th: {cards: 40, sets: 3}, ko: {error: 'HTTP 404'}};
  const out = pickLanguages(measured, []);
  assert.deepEqual(out.map(l => l.code), ['en', 'zh-tw']);
  assert.deepEqual(out[1], {code: 'zh-tw', name: '繁體中文', ocr: 'chi_tra', cards: 9000, sets: 120});
  assert.ok(MIN_CARDS > 40, 'a nearly empty catalog is left out');
});

test('a failed request keeps the previous entry; the seed without counts survives until measured', () => {
  const previous = [{code: 'en', name: 'English', ocr: 'eng'}, {code: 'ja', name: '日本語', ocr: 'jpn', cards: 15000, sets: 160}, {code: 'fr', name: 'Français', ocr: 'fra'}];
  const out = pickLanguages({en: {error: 'timeout'}, ja: {error: 'timeout'}, fr: {cards: 12000, sets: 150}}, previous);
  assert.deepEqual(out.map(l => [l.code, l.cards]), [['en', undefined], ['ja', 15000], ['fr', 12000]]);
});

test('English must be present', () => {
  assert.throws(() => pickLanguages({en: {error: 'down'}}, []), /English catalog missing/);
});

test('every candidate has a Tesseract model name and a valid code', () => {
  for (const [code, name, ocr] of CANDIDATES) {
    assert.match(code, /^[a-z]{2}(-[a-z]{2})?$/);
    assert.ok(name.length > 1);
    assert.match(ocr, /^[a-z_]+$/);
  }
});
