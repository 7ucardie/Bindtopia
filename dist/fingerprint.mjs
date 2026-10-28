// Perceptual fingerprints of card images, identical in the browser (camera) and in Node (catalog build).
// Pure JS on RGBA pixels so both sides compute exactly the same thing; no canvas or image-library resampling involved.

// Area-average a rectangle of an RGBA image down to an N x N luminance grid.
export function grayGrid({ data, width }, rect, n) {
  const out = new Float64Array(n * n),
    cw = rect.width / n,
    ch = rect.height / n;
  for (let gy = 0; gy < n; gy++)
    for (let gx = 0; gx < n; gx++) {
      const x0 = Math.floor(rect.x + gx * cw),
        x1 = Math.max(x0 + 1, Math.floor(rect.x + (gx + 1) * cw));
      const y0 = Math.floor(rect.y + gy * ch),
        y1 = Math.max(y0 + 1, Math.floor(rect.y + (gy + 1) * ch));
      let sum = 0;
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = 4 * (y * width + x);
          sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }
      out[gy * n + gx] = sum / ((x1 - x0) * (y1 - y0));
    }
  return out;
}

const N = 32,
  K = 8,
  COS = Array.from({ length: K }, (_, u) => Array.from({ length: N }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N))));
// pHash: 2D DCT of a 32x32 grid, the 8x8 lowest frequencies compared with their median -> 64 bits as two uint32.
export function phash(image, rect) {
  const g = grayGrid(image, rect, N),
    rows = new Float64Array(K * N),
    coef = new Float64Array(K * K);
  for (let u = 0; u < K; u++)
    for (let y = 0; y < N; y++) {
      let s = 0;
      for (let x = 0; x < N; x++) s += g[y * N + x] * COS[u][x];
      rows[u * N + y] = s;
    }
  for (let v = 0; v < K; v++)
    for (let u = 0; u < K; u++) {
      let s = 0;
      for (let y = 0; y < N; y++) s += rows[u * N + y] * COS[v][y];
      coef[v * K + u] = s;
    }
  const median = Array.from(coef)
    .slice(1)
    .sort((a, b) => a - b)[31];
  let hi = 0,
    lo = 0;
  for (let i = 0; i < 64; i++) if (coef[i] > median) i < 32 ? (hi |= 1 << (31 - i)) : (lo |= 1 << (63 - i));
  return [hi >>> 0, lo >>> 0];
}

// The artwork window of a standard card; good enough across eras because the low frequencies dominate.
export const ART = { x: 0.08, y: 0.1, width: 0.84, height: 0.42 };
export function cardFingerprint(image, rect = { x: 0, y: 0, width: image.width, height: image.height }) {
  const art = {
    x: rect.x + rect.width * ART.x,
    y: rect.y + rect.height * ART.y,
    width: rect.width * ART.width,
    height: rect.height * ART.height,
  };
  return [...phash(image, rect), ...phash(image, art)];
}

const pop = v => {
  v -= (v >>> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};
export const distance = (a, b, i = 0) => pop(a[0] ^ b[i]) + pop(a[1] ^ b[i + 1]) + pop(a[2] ^ b[i + 2]) + pop(a[3] ^ b[i + 3]);

// Fingerprint files store ids plus base64 of 16 bytes per card (whole card + artwork).
export function encode(prints) {
  const bytes = new Uint8Array(prints.length * 16),
    v = new DataView(bytes.buffer);
  prints.forEach((p, i) => p.forEach((w, j) => v.setUint32(i * 16 + j * 4, w)));
  return bytes;
}
export function decode(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    out = new Uint32Array(bytes.byteLength / 4);
  for (let i = 0; i < out.length; i++) out[i] = v.getUint32(i * 4);
  return out;
}

// Nearest cards by fingerprint distance (0-128). `table` is the flat Uint32Array from decode().
export function nearest(print, table, ids, limit = 5) {
  const best = [];
  for (let i = 0, c = 0; i < table.length; i += 4, c++) {
    if (!(table[i] | table[i + 1] | table[i + 2] | table[i + 3])) continue; // card without an image
    const d = distance(print, table, i);
    if (best.length < limit || d < best[best.length - 1].distance) {
      best.push({ id: ids[c], distance: d });
      best.sort((a, b) => a.distance - b.distance);
      if (best.length > limit) best.pop();
    }
  }
  return best;
}
