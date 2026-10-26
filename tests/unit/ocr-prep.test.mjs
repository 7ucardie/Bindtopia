import {test} from 'node:test';
import assert from 'node:assert/strict';
import {binarize, ocrSizes, readableText} from '../../dist/ocr-prep.mjs';

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
  assert.deepEqual(ocrSizes(1512, 2016), {work: [1500, 2000], output: [3000, 4000]});
  assert.deepEqual(ocrSizes(1080, 1920), {work: [1080, 1920], output: [2160, 3840]});
  assert.deepEqual(ocrSizes(4032, 3024), {work: [2000, 1500], output: [4000, 3000]});
  assert.deepEqual(ocrSizes(640, 480), {work: [640, 480], output: [1280, 960]});
});

test('readableText drops artwork noise but keeps names and collector numbers', () => {
  assert.equal(readableText('Is\nNymble\nLd 50 (7)\n& | o 8\n009/094 ®\nFlail Around'), 'Nymble\n009/094 ®\nFlail Around');
  assert.equal(readableText(''), '');
});
