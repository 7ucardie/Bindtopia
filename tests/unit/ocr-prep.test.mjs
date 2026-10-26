import {test} from 'node:test';
import assert from 'node:assert/strict';
import {binarize, ocrSizes, readableText, guideToSource, distanceHint, wordsOf} from '../../dist/ocr-prep.mjs';

function image(w, h, pixel) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = pixel(x, y); data.set([r, g, b, 255], 4 * (y * w + x)); }
  return {data, width: w, height: h};
}
const at = (img, x, y) => img.data[4 * (y * img.width + x)];

test('binarize keeps dark strokes black on a coloured, unevenly lit background', () => {
  // Green background that brightens left to right, with a dark vertical stroke at x=30 and x=170.
  const img = image(200, 60, (x) => (x >= 28 && x <= 32) || (x >= 168 && x <= 172) ? [20, 40, 20] : [60 + x / 2, 140 + x / 3, 40]);
  const out = binarize(img, {radius: 8, offset: 10});
  assert.equal(at(out, 30, 30), 0, 'stroke in the dark area');
  assert.equal(at(out, 170, 30), 0, 'stroke in the bright area');
  assert.equal(at(out, 100, 30), 255, 'plain background becomes white');
  assert.ok([...out.data].every((v, i) => i % 4 === 3 ? v === 255 : v === 0 || v === 255), 'pure black and white, opaque');
});

test('ocrSizes caps the working size and enlarges small images', () => {
  assert.deepEqual(ocrSizes(1512, 2016), {work: [1500, 2000], output: [1650, 2200]});
  assert.deepEqual(ocrSizes(940, 1220), {work: [940, 1220], output: [1695, 2200]});
  assert.deepEqual(ocrSizes(4032, 3024, 2800), {work: [2000, 1500], output: [2800, 2100]});
  assert.deepEqual(ocrSizes(300, 400), {work: [300, 400], output: [900, 1200]}, 'never more than 3x');
  assert.deepEqual(ocrSizes(3000, 4000, 1000), {work: [1500, 2000], output: [1500, 2000]}, 'never shrunk below the working size');
});

test('readableText drops artwork noise but keeps names and collector numbers', () => {
  assert.equal(readableText('Is\nNymble\nLd 50 (7)\n& | o 8\n009/094 ®\nFlail Around'), 'Nymble\n009/094 ®\nFlail Around');
  assert.equal(readableText(''), '');
});

test('guideToSource maps the on-screen guide through object-fit: cover', () => {
  // 1080x1920 portrait video shown in a 360x300 box: scale 1/3, shown 640 px tall so 170 screen px are cut off top and bottom.
  const r = guideToSource({videoWidth: 1080, videoHeight: 1920}, {left: 0, top: 0, width: 360, height: 300}, {left: 120, top: 30, width: 120, height: 240}, 0);
  assert.deepEqual(r, {x: 360, y: 600, width: 360, height: 720});
  const m = guideToSource({videoWidth: 1080, videoHeight: 1920}, {left: 0, top: 0, width: 360, height: 300}, {left: 120, top: 30, width: 120, height: 240}, 0.1);
  assert.deepEqual(m, {x: 324, y: 528, width: 432, height: 864});
  const edge = guideToSource({videoWidth: 640, videoHeight: 480}, {left: 0, top: 0, width: 640, height: 480}, {left: 0, top: 0, width: 640, height: 480});
  assert.deepEqual(edge, {x: 0, y: 0, width: 640, height: 480}, 'clamped to the frame');
});

test('distanceHint judges distance from the size of confident words', () => {
  const words = (h, n = 5, confidence = 90) => Array.from({length: n}, (_, i) => ({text: 'word' + i, confidence, bbox: {y0: 0, y1: h}}));
  assert.equal(distanceHint(words(40), 1000), 'ok');
  assert.equal(distanceHint(words(15), 1000), 'closer');
  assert.equal(distanceHint(words(120), 1000), 'further');
  assert.equal(distanceHint(words(40, 2), 1000), 'none', 'too few words');
  assert.equal(distanceHint(words(40, 5, 30), 1000), 'none', 'low-confidence noise is ignored');
  assert.equal(distanceHint(undefined, 1000), 'none');
});

test('wordsOf flattens Tesseract blocks', () => {
  assert.deepEqual(wordsOf({blocks: [{paragraphs: [{lines: [{words: [{text: 'a'}, {text: 'b'}]}]}]}]}).map(w => w.text), ['a', 'b']);
  assert.deepEqual(wordsOf({}), []);
});
