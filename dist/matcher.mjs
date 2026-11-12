export const normalize = s =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
const numberKey = s =>
  String(s)
    .toLowerCase()
    .replace(/^0+(?=\d)/, '');
export function extractNumbers(text) {
  return [...text.matchAll(/\b([a-z]{0,4}\d{1,4}[a-z]?)\s*[\/／]\s*([a-z]{0,4}\d{1,4})\b/gi)].map(m => ({ localId: m[1], total: m[2] }));
}
function distance(a, b) {
  let r = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, r[j] + 1, r[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    r = next;
  }
  return r[b.length];
}
// Basic Energy cards print their type as a symbol ("Basic ⚡ Energy"), which OCR cannot read; the catalog calls them "Lightning Energy".
export const ENERGY_TYPES = ['grass', 'fire', 'water', 'lightning', 'psychic', 'fighting', 'darkness', 'metal', 'fairy'];
const energyName = new RegExp('^(?:basic)?(' + ENERGY_TYPES.join('|') + ')energy$');
// Returns {type} when the text reads as a Basic Energy card; type is '' when only the symbol was printed.
export function basicEnergy(text) {
  const words = String(text || '')
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);
  const near = (w, t) => w === t || (w.length >= t.length - 1 && w.length <= t.length + 1 && distance(w, t) <= 1);
  if (!words.some(w => near(w, 'basic')) || !words.some(w => near(w, 'energy'))) return null;
  return { type: ENERGY_TYPES.find(t => words.some(w => w === t || w === t + 'energy')) || '' };
}
// Newer prints carry no set total, only a set code and number at the bottom: "MEE 004", "SVE 012".
export function extractSetNumbers(text) {
  return [...String(text || '').matchAll(/\b([a-z]{2,5})\s*(?:en\s+)?(\d{1,3})\b/gi)].map(m => ({
    code: m[1].toLowerCase(),
    localId: m[2],
  }));
}
// Words that appear on cards: every word of a card name, plus the fixed print on a card. Built once per catalog.
const CARD_WORDS = [
  'Basic',
  'Stage',
  'Energy',
  'Trainer',
  'Item',
  'Supporter',
  'Stadium',
  'Tool',
  'Pokémon',
  'Ability',
  'Weakness',
  'Resistance',
  'Retreat',
  'Evolves',
  'from',
  'Special',
  'HP',
];
const SHORT_WORDS = new Set(['ex', 'gx', 'v', 'vmax', 'vstar', 'mr', 'jr', 'hp']);
const vocabularies = new WeakMap();
function vocabulary(cards) {
  let v = vocabularies.get(cards);
  if (v) return v;
  const words = new Map();
  for (const w of [...CARD_WORDS, ...cards.flatMap(c => String(c.name || '').split(/[\s\-–]+/))]) {
    const key = normalize(w);
    if (key && (key.length >= 4 || SHORT_WORDS.has(key)) && !words.has(key))
      words.set(key, w.replace(/[(),:!?]+$/g, '').replace(/^[(]+/, ''));
  }
  const byLength = new Map();
  for (const key of words.keys()) (byLength.get(key.length) || byLength.set(key.length, []).get(key.length)).push(key);
  v = { words, byLength };
  vocabularies.set(cards, v);
  return v;
}
// Edit distance that also counts two swapped letters as one edit ("nymbel" → "nymble").
function swapDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}
// A read word as the card spells it, or null. Exact words need some OCR confidence; a one-letter correction
// (for words of five letters or more) needs a confident reading, so letters read into artwork are not "corrected" into names.
const SURE = 50,
  FIX = 75;
function cardWord(token, confidence, { words, byLength }) {
  const key = normalize(token);
  if (!key || /\d/.test(key) || confidence < SURE) return null;
  if (words.has(key)) return words.get(key);
  if (key.length < 5 || confidence < FIX) return null;
  for (const len of [key.length - 1, key.length, key.length + 1])
    for (const w of byLength.get(len) || []) if (swapDistance(key, w) <= 1) return words.get(w);
  return null;
}
// Fine print that is never part of a name: the copyright line and everything after "Illus." (the artist).
const FINE_PRINT = /©|nintendo|creatures|game\s*freak|pok[eé]mon\s*\//i;
// OCR of a whole card also reads letters into the artwork and the fine print. Keeps only what is on cards:
// words from card names and card print (spelled as on the card), full collector numbers (024/128, TG05/TG30)
// and a set code with its number (MEE 004). One line per printed line, without repeats from several readings.
// `reading` is OCR lines of words ({text, confidence}), or plain text (read as fully confident).
export function cleanReading(reading, cards, sets = {}) {
  const lines =
      typeof reading === 'string'
        ? reading.split('\n').map(l =>
            l
              .split(/\s+/)
              .filter(Boolean)
              .map(text => ({ text, confidence: 100 })),
          )
        : reading || [],
    vocab = vocabulary(cards),
    out = [],
    seen = new Set();
  for (const line of lines) {
    const raw = line.map(w => w.text).join(' '),
      kept = [];
    for (const m of raw.matchAll(/\b([a-z]{0,4}\d{1,4}[a-z]?)\s*[\/／]\s*([a-z]{0,4}\d{1,4})\b/gi))
      kept.push((m[1] + '/' + m[2]).toUpperCase());
    for (const m of raw.matchAll(/\b([a-z]{2,5})\s+(\d{3})\b/gi)) if (sets[m[1].toLowerCase()]) kept.push(m[1].toUpperCase() + ' ' + m[2]);
    const words = [];
    if (!FINE_PRINT.test(raw))
      for (const w of line) {
        if (/^illus/i.test(w.text)) break;
        if (/\d/.test(w.text)) continue;
        for (const part of w.text.split(/[^\p{L}'’.\-]+/u)) {
          const word = cardWord(part.replace(/^[.'’\-]+|[.'’\-]+$/g, ''), w.confidence, vocab);
          if (word) words.push(word);
        }
      }
    const all = [...words, ...kept].join(' ');
    if (all && !seen.has(all.toLowerCase())) {
      seen.add(all.toLowerCase());
      out.push(all);
    }
  }
  return out.join('\n');
}
export function matchCards(text, cards, sets, { setId = '', limit = 20, energyType = '' } = {}) {
  const energy = basicEnergy(text),
    wantedEnergy = energy && (energy.type || energyType),
    setNumbers = extractSetNumbers(text),
    numbers = extractNumbers(text),
    n = normalize(text),
    words = text
      .split(/\s+/)
      .map(normalize)
      .filter(x => x.length >= 4);
  let scored = [];
  const nameCache = new Map();
  for (const c of cards) {
    if (setId && c.setId !== setId) continue;
    const name = normalize(c.name);
    let score = 0,
      reasons = [];
    let ns = nameCache.get(name);
    if (ns === undefined) {
      ns =
        name.length > 2 && n.includes(name)
          ? 65
          : name.length >= 4 && words.some(w => Math.abs(w.length - name.length) <= 1 && distance(w, name) <= 1)
            ? 32
            : 0;
      nameCache.set(name, ns);
    }
    if (!ns && wantedEnergy && energyName.exec(name)?.[1] === wantedEnergy) {
      ns = 65;
      reasons.push(energy.type ? 'Basisenergie herkend' : 'Basisenergie herkend aan de kleur');
      score += ns;
    } else if (ns) {
      score += ns;
      reasons.push(ns === 65 ? 'Naam herkend' : 'Naam lijkt erop');
    }
    if (!numbers.length && setNumbers.some(p => p.code === c.setId && numberKey(p.localId) === numberKey(c.localId))) {
      score += 80;
      reasons.push('Setcode en kaartnummer gelijk');
    }
    let hit = numbers.find(p => numberKey(p.localId) === numberKey(c.localId));
    if (hit) {
      score += 50;
      reasons.push('Kaartnummer gelijk');
      if (Number(hit.total) === sets[c.setId]?.cardCount?.official) {
        score += 30;
        reasons.push('Settotaal gelijk');
      }
    }
    if (!numbers.length && /^\s*[a-z]{0,4}\d{1,4}\s*$/i.test(text) && numberKey(text.trim()) === numberKey(c.localId)) {
      score += 40;
      reasons.push('Kaartnummer gelijk');
    }
    if (score >= 32) scored.push({ card: c, score, reasons });
  }
  // Equal scores for a Basic Energy (reprinted in many sets) list the newest set first.
  const released = c => (wantedEnergy && sets[c.setId]?.releaseDate) || '';
  return scored
    .sort((a, b) => b.score - a.score || released(b.card).localeCompare(released(a.card)) || a.card.name.localeCompare(b.card.name))
    .slice(0, limit);
}
