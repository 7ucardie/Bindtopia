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
  return [...String(text || '').matchAll(/\b([a-z]{2,5})\s*(?:en\s+)?(\d{1,3})\b/gi)].map(m => ({ code: m[1].toLowerCase(), localId: m[2] }));
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
