// Image preparation for text recognition. Card photos have coloured, glossy backgrounds and uneven light,
// so each pixel is compared with the mean of its own neighbourhood (adaptive threshold) to get crisp black text on white.
export function binarize({data, width: w, height: h}, {radius = Math.max(6, Math.round(Math.min(w, h) / 100)), offset = 10} = {}) {
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = (data[4 * i] * 77 + data[4 * i + 1] * 150 + data[4 * i + 2] * 29) >> 8;
  const W = w + 1, sums = new Uint32Array(W * (h + 1)); // integral image; 255 * 2000 * 2000 still fits in 32 bits
  for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += gray[y * w + x]; sums[(y + 1) * W + x + 1] = sums[y * W + x + 1] + row; } }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(h, y + radius + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(w, x + radius + 1), n = (y1 - y0) * (x1 - x0);
      const sum = sums[y1 * W + x1] - sums[y0 * W + x1] - sums[y1 * W + x0] + sums[y0 * W + x0];
      const v = gray[y * w + x] * n < sum - offset * n ? 0 : 255, i = 4 * (y * w + x);
      out[i] = out[i + 1] = out[i + 2] = v; out[i + 3] = 255;
    }
  }
  return {data: out, width: w, height: h};
}

// Sizes for the two steps: threshold at up to 2000 px (detail without heavy memory), then enlarge so small print such as "009/094" is big enough.
export function ocrSizes(sourceWidth, sourceHeight) {
  const s = Math.min(1, 2000 / Math.max(sourceWidth, sourceHeight));
  const w = Math.max(1, Math.round(sourceWidth * s)), h = Math.max(1, Math.round(sourceHeight * s));
  const f = Math.max(1, Math.min(2, 4000 / Math.max(w, h)));
  return {work: [w, h], output: [Math.round(w * f), Math.round(h * f)]};
}

// Sparse-text recognition returns lots of fragments from artwork; keep the lines a person would want to read and correct.
export const readableText = text => String(text || '').split('\n').map(l => l.trim()).filter(l => /[\p{L}]{3,}/u.test(l) || /\d{1,3}\s*\/\s*\d{2,3}/.test(l)).join('\n');
