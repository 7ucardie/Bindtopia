// Cards the visitor enters by hand because TCGdex does not have them. They live only in the visitor's own
// collection or trade list, are always marked as their own entry, and are never shown as TCGdex data.
const LANG = /^[a-z]{2}(-[a-z]{2})?$/;
const clean = (value, max) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
const fits = (value, max) => value === undefined || (typeof value === 'string' && value.length <= max);

// An optional price the visitor sets themselves (e.g. agreed at the table); "12,50" and "12.50" both work.
export function ownPrice(amount, currency) {
  if (amount === undefined || amount === null || String(amount).trim() === '') return null;
  const a = Number(String(amount).trim().replace(',', '.'));
  return isFinite(a) && a > 0 && a < 1e7 && /^[A-Z]{3}$/.test(currency)
    ? { amount: Math.round(a * 100) / 100, currency, source: 'Eigen prijs' }
    : null;
}

export function customCard({ name, setName, localId, lang = 'en', note, amount, currency } = {}, id = newId()) {
  const card = { id, custom: true, name: clean(name, 80), localId: clean(localId, 20), setId: 'custom', setName: clean(setName, 80), lang };
  if (!card.name) throw Error('Een naam is nodig');
  if (!LANG.test(lang)) card.lang = 'en';
  const n = clean(note, 200);
  if (n) card.note = n;
  const price = ownPrice(amount, currency);
  if (price) card.price = price;
  return card;
}

const newId = () => 'custom-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);

export function isCustomCard(c) {
  return (
    !!c &&
    c.custom === true &&
    /^custom-[a-z0-9]{6,32}$/.test(c.id) &&
    c.setId === 'custom' &&
    typeof c.name === 'string' &&
    c.name.trim() !== '' &&
    c.name.length <= 80 &&
    fits(c.setName, 80) &&
    typeof c.localId === 'string' &&
    c.localId.length <= 20 &&
    fits(c.note, 200) &&
    LANG.test(c.lang) &&
    !c.image &&
    (c.price === undefined || !!ownPrice(c.price?.amount, c.price?.currency))
  );
}

// One entry of a version-2 backup: a catalog card (TCGdex image or none) or a card the visitor entered by hand.
export function validBackupCard(c) {
  if (c?.custom !== undefined) return isCustomCard(c);
  return (
    typeof c?.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.localId === 'string' &&
    typeof c.setId === 'string' &&
    LANG.test(c.lang) &&
    (!c.image || /^https:\/\/assets\.tcgdex\.net\//.test(c.image))
  );
}

// A prefilled issue at the open TCGdex card database, so a missing card can be added there for everyone.
// Only the card's name, set, number and language are included; never the visitor's note or price.
export function reportUrl(card) {
  const title = 'Missing card: ' + card.name + (card.localId ? ' ' + card.localId : '') + (card.setName ? ' (' + card.setName + ')' : '');
  const body =
    'This card is not in the TCGdex database (reported through Bindtopia).\n\n' +
    '- Name: ' +
    card.name +
    '\n- Set: ' +
    (card.setName || '?') +
    '\n- Card number: ' +
    (card.localId || '?') +
    '\n- Language: ' +
    (card.lang || '?') +
    '\n';
  return 'https://github.com/tcgdex/cards-database/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
}
