import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseLocale, createTranslator} from '../../dist/i18n.mjs';

test('chooseLocale falls back regionally and then to English', () => {
  assert.equal(chooseLocale(['pt-BR']), 'pt');
  assert.equal(chooseLocale(['ja-JP', 'nl-BE']), 'nl');
  assert.equal(chooseLocale([undefined, 'zh']), 'en');
});

test('translator replaces whole phrases only, longest first', () => {
  const t = createTranslator({'Laag': 'Low', 'Laagste': 'Lowest', 'kaarten': 'cards'});
  assert.equal(t('Laagste'), 'Lowest');
  assert.equal(t('Laag'), 'Low');
  assert.equal(t('12 kaarten'), '12 cards');
  assert.equal(t('Laagland'), 'Laagland');
});
