// Regional market settings: local currency, marketplace sites and which price source fits best.
// Detection uses only the browser's time zone and language region; nothing is sent anywhere.
export const markets = {
  intl: {name: 'International', currency: null, ebay: 'www.ebay.com', cardmarket: 'en', tcgplayer: true, prefer: 'cardmarket'},
  us: {name: 'United States', currency: 'USD', ebay: 'www.ebay.com', cardmarket: null, tcgplayer: true, prefer: 'tcgplayer'},
  ca: {name: 'Canada', currency: 'CAD', ebay: 'www.ebay.ca', cardmarket: null, tcgplayer: true, prefer: 'tcgplayer'},
  gb: {name: 'United Kingdom', currency: 'GBP', ebay: 'www.ebay.co.uk', cardmarket: 'en', tcgplayer: false, prefer: 'cardmarket'},
  au: {name: 'Australia', currency: 'AUD', ebay: 'www.ebay.com.au', cardmarket: null, tcgplayer: true, prefer: 'tcgplayer'},
  nl: {name: 'Nederland', currency: 'EUR', ebay: 'www.ebay.nl', cardmarket: 'en', tcgplayer: false, prefer: 'cardmarket'},
  be: {name: 'België', currency: 'EUR', ebay: 'www.ebay.nl', cardmarket: 'en', tcgplayer: false, prefer: 'cardmarket'},
  de: {name: 'Deutschland', currency: 'EUR', ebay: 'www.ebay.de', cardmarket: 'de', tcgplayer: false, prefer: 'cardmarket'},
  at: {name: 'Österreich', currency: 'EUR', ebay: 'www.ebay.at', cardmarket: 'de', tcgplayer: false, prefer: 'cardmarket'},
  fr: {name: 'France', currency: 'EUR', ebay: 'www.ebay.fr', cardmarket: 'fr', tcgplayer: false, prefer: 'cardmarket'},
  it: {name: 'Italia', currency: 'EUR', ebay: 'www.ebay.it', cardmarket: 'it', tcgplayer: false, prefer: 'cardmarket'},
  es: {name: 'España', currency: 'EUR', ebay: 'www.ebay.es', cardmarket: 'es', tcgplayer: false, prefer: 'cardmarket'},
  pl: {name: 'Polska', currency: 'PLN', ebay: 'www.ebay.pl', cardmarket: 'en', tcgplayer: false, prefer: 'cardmarket'},
};

const zones = [
  [/^Australia\//, 'au'], [/^Europe\/(London|Belfast|Guernsey|Jersey|Isle_of_Man)$/, 'gb'],
  [/^Europe\/Amsterdam$/, 'nl'], [/^Europe\/Brussels$/, 'be'], [/^Europe\/(Berlin|Busingen)$/, 'de'], [/^Europe\/Vienna$/, 'at'],
  [/^Europe\/Paris$/, 'fr'], [/^Europe\/Rome$/, 'it'], [/^(Europe\/Madrid|Atlantic\/Canary|Africa\/Ceuta)$/, 'es'], [/^Europe\/Warsaw$/, 'pl'],
  [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Whitehorse|Yellowknife|Iqaluit)$/, 'ca'],
  [/^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Juneau|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+)|Pacific\/Honolulu)$/, 'us'],
];

// Time zone first (where the device is), then the language region (en-GB, en-AU), else International.
export function detectMarket({timeZone = '', languages = []} = {}) {
  for (const [pattern, market] of zones) if (pattern.test(timeZone)) return market;
  for (const language of languages) {
    const region = String(language || '').split('-')[1]?.toLowerCase();
    const code = region === 'uk' ? 'gb' : region;
    if (code && code in markets && code !== 'intl') return code;
  }
  return 'intl';
}

// ECB reference rates are quoted per euro.
export function convert(amount, from, to, rates) {
  if (typeof amount !== 'number' || !isFinite(amount) || !from || !to || from === to) return null;
  const perEuro = c => c === 'EUR' ? 1 : rates?.rates?.[c];
  const a = perEuro(from), b = perEuro(to);
  return a > 0 && b > 0 ? amount / a * b : null;
}

export function marketLinks(market, query) {
  const m = markets[market] || markets.intl, q = encodeURIComponent(query), links = [];
  if (m.cardmarket) links.push(['Cardmarket', `https://www.cardmarket.com/${m.cardmarket}/Pokemon/Products/Search?searchString=${q}`]);
  if (m.tcgplayer) links.push(['TCGplayer', `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${q}&view=grid`]);
  links.push(['eBay', `https://${m.ebay}/sch/i.html?_nkw=${q}`]);
  return links;
}
