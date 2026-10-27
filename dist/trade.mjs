// Trade mode helpers: confident scan matches, the headline price per card and the trade totals.
import {convert} from './markets.mjs';

// From the camera only name + number is certain enough: OCR noise from artwork, sleeves or a card in another
// language can produce a believable "18/91" on its own. Typed input may also be accepted on number + set total.
export const confident = (hits, {typed = false} = {}) => hits[0] && hits[0].score >= (typed ? 80 : 112) && (!hits[1] || hits[0].score > hits[1].score) ? hits[0] : null;

const positive = (...values) => values.find(v => typeof v === 'number' && isFinite(v) && v > 0);
// One price per card: the market's preferred source first (TCGplayer market price or Cardmarket trend).
export function headlinePrice(pricing, prefer = 'cardmarket') {
  if (!pricing || typeof pricing !== 'object') return null;
  const cm = pricing.cardmarket, tp = pricing.tcgplayer;
  const fromCm = () => { const a = cm && positive(cm.trend, cm.avg, cm.low); return a ? {amount: a, currency: /^[A-Z]{3}$/.test(cm.unit) ? cm.unit : 'EUR', source: 'Cardmarket'} : null; };
  const fromTp = () => {
    if (!tp || typeof tp !== 'object') return null;
    for (const [variant, v] of Object.entries(tp)) {
      const a = v && typeof v === 'object' && positive(v.marketPrice, v.midPrice, v.lowPrice);
      if (a) return {amount: a, currency: /^[A-Z]{3}$/.test(tp.unit) ? tp.unit : 'USD', source: 'TCGplayer', variant};
    }
    return null;
  };
  return prefer === 'tcgplayer' ? fromTp() || fromCm() : fromCm() || fromTp();
}

// Sums both sides in the trade currency; items whose price cannot be converted are counted as skipped.
export function tradeTotals(items, currency, rates) {
  const totals = {give: 0, get: 0, skipped: 0};
  for (const item of items) {
    const p = item.price;
    const value = !p ? null : p.currency === currency ? p.amount : convert(p.amount, p.currency, currency, rates);
    if (value == null) totals.skipped++;
    else totals[item.side] += value;
  }
  totals.give = Math.round(totals.give * 100) / 100;
  totals.get = Math.round(totals.get * 100) / 100;
  totals.diff = Math.round((totals.get - totals.give) * 100) / 100;
  return totals;
}

// Picture thresholds (fingerprint distance 0-128), tuned on the catalog evaluation in the fingerprint workflow.
export const IMAGE = {accept: 22, gap: 8, loose: 28}; // first run: right card median 14 (22 when rotated 3°), nearest wrong ~30-32; real photo 18 vs 36
// Combines text and picture: a sure text match wins; a name with several prints is settled by the picture;
// otherwise the picture alone must be close and clearly better than the runner-up. Returns {id, card?, by} or null.
export function decide(textHits, imageHits = [], t = IMAGE) {
  const sure = confident(textHits);
  if (sure) return {id: sure.card.id, card: sure.card, by: 'text'};
  if (textHits.length && imageHits.length) {
    const d = new Map(imageHits.map(h => [h.id, h.distance]));
    const best = textHits.filter(h => d.has(h.card.id)).sort((x, y) => d.get(x.card.id) - d.get(y.card.id))[0];
    if (best && d.get(best.card.id) <= t.loose) return {id: best.card.id, card: best.card, by: 'text+image'};
  }
  const [a, b] = imageHits;
  if (a && a.distance <= t.accept && (!b || b.distance - a.distance >= t.gap)) return {id: a.id, by: 'image'};
  return null;
}
