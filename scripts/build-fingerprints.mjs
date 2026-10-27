// Builds dist/data/fingerprints-en.json: an image fingerprint per English catalog card, for camera recognition by artwork.
// Incremental: cards already fingerprinted are kept, only new ones are downloaded. Stops cleanly at a time budget.
// `--evaluate` measures how often distorted catalog images and the real photo fixtures are matched back to the right card.
import {readFile, writeFile, rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {cardFingerprint, encode, decode, nearest, distance} from '../dist/fingerprint.mjs';

const root = new URL('../', import.meta.url);
const OUT = new URL('dist/data/fingerprints-en.json', root);
const minutes = Number(process.env.MAX_MINUTES || 45), started = Date.now();

export async function decodeImage(buffer) {
  const {data, info} = await sharp(buffer).flatten({background: '#ffffff'}).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  return {data, width: info.width, height: info.height};
}
async function download(url) {
  for (let n = 0; ; n++) {
    try { const r = await fetch(url, {signal: AbortSignal.timeout(30000)}); if (r.status === 404) return null; if (!r.ok) throw Error('HTTP ' + r.status); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (n >= 2) throw e; await new Promise(r => setTimeout(r, 1000 * (n + 1))); }
  }
}

export async function loadPrints() {
  const file = JSON.parse(await readFile(OUT, 'utf8').catch(() => 'null'));
  const map = new Map();
  if (file?.version === 1) { const t = decode(Buffer.from(file.data, 'base64')); file.ids.forEach((id, i) => { if (t[i * 4] | t[i * 4 + 1] | t[i * 4 + 2] | t[i * 4 + 3]) map.set(id, Array.from(t.subarray(i * 4, i * 4 + 4))); }); }
  return map;
}

async function build() {
  const cards = JSON.parse(await readFile(new URL('dist/data/cards-en.json', root), 'utf8'));
  const prints = await loadPrints();
  const todo = cards.filter(c => c.image && !prints.has(c.id));
  console.log(`${prints.size} fingerprints kept, ${todo.length} to compute`);
  let done = 0, failed = 0, i = 0;
  const worker = async () => {
    while (i < todo.length && Date.now() - started < minutes * 60000) {
      const c = todo[i++];
      try { const buf = await download(c.image + '/low.webp'); if (buf) prints.set(c.id, cardFingerprint(await decodeImage(buf))); else failed++; }
      catch { failed++; }
      if (++done % 1000 === 0) console.log(`${done}/${todo.length}`);
    }
  };
  await Promise.all(Array.from({length: 24}, worker));
  const ids = cards.map(c => c.id);
  const data = encode(ids.map(id => prints.get(id) || [0, 0, 0, 0]));
  const file = {version: 1, algo: 'phash32-dct8 whole+art', updated: new Date().toISOString(), cards: prints.size, ids, data: Buffer.from(data).toString('base64')};
  const temp = new URL(OUT.href + '.tmp');
  await writeFile(temp, JSON.stringify(file));
  await rename(temp, OUT);
  console.log(`Fingerprints: ${prints.size} cards (${failed} failed, ${todo.length - done} left for the next run)`);
}

// Camera-like distortions with sharp: crop offset, slight rotation, blur, brightness/contrast, JPEG.
const distortions = {
  shift: (img, m) => img.extract({left: Math.round(m.width * 0.03), top: Math.round(m.height * 0.02), width: Math.round(m.width * 0.95), height: Math.round(m.height * 0.96)}),
  rotate: img => img.rotate(3, {background: '#808080'}),
  blur: img => img.blur(1.5),
  light: img => img.linear(0.75, 30),
  jpeg: img => img.jpeg({quality: 40}),
  combined: (img, m) => img.extract({left: Math.round(m.width * 0.02), top: Math.round(m.height * 0.02), width: Math.round(m.width * 0.96), height: Math.round(m.height * 0.96)}).rotate(2, {background: '#808080'}).blur(1).linear(0.85, 20).jpeg({quality: 60}),
};

async function evaluate(sample = Number(process.env.EVAL_SAMPLE || 300)) {
  const cards = JSON.parse(await readFile(new URL('dist/data/cards-en.json', root), 'utf8'));
  const file = JSON.parse(await readFile(OUT, 'utf8'));
  const table = decode(Buffer.from(file.data, 'base64')), ids = file.ids;
  const pool = cards.filter(c => c.image && ids.includes(c.id));
  const picked = Array.from({length: Math.min(sample, pool.length)}, (_, k) => pool[Math.floor((k * 7919) % pool.length)]);
  const stats = Object.fromEntries(Object.keys(distortions).map(k => [k, {top1: 0, top5: 0, n: 0, dRight: [], dWrong: []}]));
  for (const c of picked) {
    const buf = await download(c.image + '/low.webp').catch(() => null); if (!buf) continue;
    const meta = await sharp(buf).metadata();
    for (const [name, fn] of Object.entries(distortions)) {
      const out = await fn(sharp(buf), meta).toBuffer();
      const hits = nearest(cardFingerprint(await decodeImage(out)), table, ids, 5), s = stats[name];
      s.n++; if (hits[0]?.id === c.id) s.top1++; if (hits.some(h => h.id === c.id)) s.top5++;
      s.dRight.push(hits.find(h => h.id === c.id)?.distance ?? 99); s.dWrong.push(hits.find(h => h.id !== c.id)?.distance ?? 99);
    }
  }
  const med = a => a.sort((x, y) => x - y)[a.length >> 1];
  const lines = ['| Distortion | Top-1 | Top-5 | Median distance right | Median distance nearest wrong |', '| --- | --- | --- | --- | --- |'];
  for (const [name, s] of Object.entries(stats)) lines.push(`| ${name} | ${(100 * s.top1 / s.n).toFixed(1)}% | ${(100 * s.top5 / s.n).toFixed(1)}% | ${med(s.dRight)} | ${med(s.dWrong)} |`);
  // Real phone photos: the card region of each fixture against the whole catalog.
  for (const [file, id, rect] of [['tests/fixtures/card-nymble-me02-009.jpg', 'me02-009', {left: 62, top: 66, width: 803, height: 1098}]]) {
    const img = await decodeImage(await sharp(new URL(file, root).pathname).extract(rect).toBuffer());
    const hits = nearest(cardFingerprint(img), table, ids, 10);
    const rank = hits.findIndex(h => h.id === id);
    lines.push('', `Photo ${file}: expected ${id}, rank ${rank < 0 ? '>10' : rank + 1}, top: ${hits.slice(0, 5).map(h => `${h.id} (${h.distance})`).join(', ')}`);
  }
  const report = lines.join('\n');
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, '## Fingerprint accuracy\n\n' + report + '\n', {flag: 'a'});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await (process.argv.includes('--evaluate') ? evaluate() : build());
