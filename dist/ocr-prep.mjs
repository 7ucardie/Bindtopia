// Image preparation for text recognition. Card photos have coloured, glossy backgrounds and uneven light,
// so each pixel is compared with the mean of its own neighbourhood (adaptive threshold) to get crisp black text on white.
export function binarize({ data, width: w, height: h }, { radius = Math.max(6, Math.round(Math.min(w, h) / 100)), offset = 10 } = {}) {
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = (data[4 * i] * 77 + data[4 * i + 1] * 150 + data[4 * i + 2] * 29) >> 8;
  const W = w + 1,
    sums = new Uint32Array(W * (h + 1)); // integral image; 255 * 2000 * 2000 still fits in 32 bits
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += gray[y * w + x];
      sums[(y + 1) * W + x + 1] = sums[y * W + x + 1] + row;
    }
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius),
      y1 = Math.min(h, y + radius + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius),
        x1 = Math.min(w, x + radius + 1),
        n = (y1 - y0) * (x1 - x0);
      const sum = sums[y1 * W + x1] - sums[y0 * W + x1] - sums[y1 * W + x0] + sums[y0 * W + x0];
      const v = gray[y * w + x] * n < sum - offset * n ? 0 : 255,
        i = 4 * (y * w + x);
      out[i] = out[i + 1] = out[i + 2] = v;
      out[i + 3] = 255;
    }
  }
  return { data: out, width: w, height: h };
}

// Sizes for the two steps: threshold at up to 2000 px (detail without heavy memory), then scale to a target long side.
// Real photos read best around 2200 px; results shift a little per size, so callers vary the target between attempts.
export const OCR_PASSES = [
  ['bw', 2200],
  ['bw', 2800],
  ['gray', 1800],
];
export function ocrSizes(sourceWidth, sourceHeight, target = 2200) {
  const s = Math.min(1, 2000 / Math.max(sourceWidth, sourceHeight));
  const w = Math.max(1, Math.round(sourceWidth * s)),
    h = Math.max(1, Math.round(sourceHeight * s));
  const f = Math.max(1, Math.min(3, target / Math.max(w, h)));
  return { work: [w, h], output: [Math.round(w * f), Math.round(h * f)] };
}

// Maps the on-screen card guide (inside a video shown with object-fit: cover) to a rectangle of the camera frame, plus a margin.
export function guideToSource({ videoWidth: vw, videoHeight: vh }, box, guide, margin = 0.06) {
  const s = Math.max(box.width / vw, box.height / vh),
    ox = (box.width - vw * s) / 2,
    oy = (box.height - vh * s) / 2;
  let w = guide.width / s,
    h = guide.height / s,
    x = (guide.left - box.left - ox) / s - w * margin,
    y = (guide.top - box.top - oy) / s - h * margin;
  w *= 1 + 2 * margin;
  h *= 1 + 2 * margin;
  const x0 = Math.max(0, Math.round(x)),
    y0 = Math.max(0, Math.round(y));
  return {
    x: x0,
    y: y0,
    width: Math.max(1, Math.min(vw, Math.round(x + w)) - x0),
    height: Math.max(1, Math.min(vh, Math.round(y + h)) - y0),
  };
}

// Distance advice from the size of the words that were read: on a card that fills the guide, ordinary text is about 4% of the image height.
export function distanceHint(words, imageHeight) {
  const heights = (words || [])
    .filter(w => w.confidence > 60 && /\p{L}{3,}/u.test(w.text))
    .map(w => (w.bbox.y1 - w.bbox.y0) / imageHeight)
    .sort((a, b) => a - b);
  if (heights.length < 3) return 'none';
  const median = heights[heights.length >> 1];
  return median < 0.022 ? 'closer' : median > 0.08 ? 'further' : 'ok';
}

export const wordsOf = data => (data?.blocks || []).flatMap(b => b.paragraphs.flatMap(p => p.lines.flatMap(l => l.words)));

// The type of a Basic Energy card from its colour: the symbol in the middle is a picture, not text.
// Samples the centre of the image (the energy orb and its glow) and averages the hue of the coloured pixels.
export function energyTypeFromPixels({ data, width: w, height: h }) {
  const x0 = Math.round(w * 0.3),
    x1 = Math.round(w * 0.7),
    y0 = Math.round(h * 0.35),
    y1 = Math.round(h * 0.65);
  let sx = 0,
    sy = 0,
    coloured = 0,
    total = 0,
    value = 0;
  for (let y = y0; y < y1; y += 2)
    for (let x = x0; x < x1; x += 2) {
      const i = 4 * (y * w + x),
        r = data[i] / 255,
        g = data[i + 1] / 255,
        b = data[i + 2] / 255;
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        d = max - min;
      total++;
      value += max;
      if (max < 0.2 || d / max < 0.35) continue;
      const hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      const a = (hue / 6) * 2 * Math.PI;
      sx += Math.cos(a);
      sy += Math.sin(a);
      coloured++;
    }
  if (!total) return '';
  if (value / total < 0.3) return 'darkness';
  if (coloured / total < 0.25) return 'metal';
  const hue = ((Math.atan2(sy, sx) * 180) / Math.PI + 360) % 360;
  if (hue < 12 || hue >= 335) return 'fire';
  if (hue < 32) return 'fighting';
  if (hue < 70) return 'lightning';
  if (hue < 170) return 'grass';
  if (hue < 250) return 'water';
  if (hue < 310) return 'psychic';
  return 'fairy';
}
