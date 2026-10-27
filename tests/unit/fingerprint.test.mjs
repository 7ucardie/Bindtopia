import {test} from 'node:test';
import assert from 'node:assert/strict';
import {phash, cardFingerprint, distance, encode, decode, nearest, grayGrid} from '../../dist/fingerprint.mjs';

// Synthetic "cards": smooth shapes so we can shift, brighten and blur them like a camera would.
function card(seed, w = 245, h = 342, {dx = 0, dy = 0, gain = 1, bias = 0, blur = 0, scale = 1} = {}) {
  const data = new Uint8ClampedArray(w * h * 4);
  const f = (x, y) => 128 + 60 * Math.sin((x + dx) * (0.02 + seed * 0.013) + seed) * Math.cos((y + dy) * (0.025 + seed * 0.007)) + 40 * Math.sin((x + y + dx + dy) * 0.01 * (seed % 5 + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0, n = 0; for (let b = -blur; b <= blur; b++) { v += f((x + b) / scale, y / scale); n++; }
    v = (v / n) * gain + bias; const i = 4 * (y * w + x); data[i] = v; data[i + 1] = v * 0.9; data[i + 2] = v * 0.8; data[i + 3] = 255;
  }
  return {data, width: w, height: h};
}

test('grayGrid averages areas', () => {
  const img = {data: new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255]), width: 2, height: 2};
  const g = grayGrid(img, {x: 0, y: 0, width: 2, height: 2}, 1);
  assert.ok(Math.abs(g[0] - 127.5) < 0.01);
});

test('the same card survives camera-like changes; different cards stay far apart', () => {
  const base = cardFingerprint(card(3));
  for (const change of [{gain: 0.7, bias: 30}, {blur: 3}, {dx: 4, dy: 3}, {gain: 1.2, bias: -20, blur: 2, dx: 2}]) {
    assert.ok(distance(base, cardFingerprint(card(3, 245, 342, change))) <= 16, JSON.stringify(change));
  }
  const bigger = card(3, 490, 684, {scale: 2});
  assert.ok(distance(base, cardFingerprint(bigger)) <= 12, 'resolution does not matter');
  for (const other of [1, 2, 4, 5, 6, 7]) // seeds sharing (seed % 5) with 3 have the same diagonal pattern by construction
    assert.ok(distance(base, cardFingerprint(card(other))) >= 30, 'card ' + other);
});

test('encode/decode round-trips and nearest ranks the right card first, skipping cards without images', () => {
  const prints = [1, 2, 3, 4, 5].map(s => cardFingerprint(card(s)));
  prints.splice(2, 0, [0, 0, 0, 0]);
  const ids = ['a', 'b', 'none', 'c', 'd', 'e'];
  const table = decode(encode(prints));
  assert.equal(table.length, 24);
  const hits = nearest(cardFingerprint(card(4, 245, 342, {gain: 0.8, blur: 2})), table, ids, 3);
  assert.equal(hits[0].id, 'd');
  assert.ok(hits.every(h => h.id !== 'none'));
  assert.ok(hits[0].distance < hits[1].distance);
});

test('phash is stable: a fixed input gives a fixed output', () => {
  assert.deepEqual(phash(card(9), {x: 0, y: 0, width: 245, height: 342}), phash(card(9), {x: 0, y: 0, width: 245, height: 342}));
});
