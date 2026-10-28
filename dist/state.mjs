// Shared state of the page and the one way it talks to data sources.
import { markets, detectMarket } from './markets.mjs';

// Card languages come from dist/data/languages.json (see loadCardLanguages); this list is the fallback.
const fallbackLanguages = [
  { code: 'en', name: 'English', ocr: 'eng' },
  { code: 'ja', name: '日本語', ocr: 'jpn' },
  { code: 'fr', name: 'Français', ocr: 'fra' },
  { code: 'de', name: 'Deutsch', ocr: 'deu' },
  { code: 'it', name: 'Italiano', ocr: 'ita' },
  { code: 'es', name: 'Español', ocr: 'spa' },
  { code: 'pt', name: 'Português', ocr: 'por' },
];

export const state = {
  // The loaded catalog: cards of the current card language and its sets by id.
  cards: [],
  sets: {},
  language: 'en',
  ready: false,
  cardLanguages: fallbackLanguages,
  // Market (country/region) for prices and currency, and ECB exchange rates once loaded.
  market: initialMarket(),
  rates: null,
  // True while the shared OCR worker is reading, so the scanner and trade mode never use it at once.
  busy: false,
};

// The market chosen by the visitor, otherwise estimated locally from time zone and language (never from IP).
function initialMarket() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const saved = localStorage.getItem('bindtopia-market');
    return saved in markets ? saved : detectMarket({ timeZone, languages: navigator.languages || [navigator.language] });
  } catch {
    return detectMarket({ timeZone, languages: navigator.languages || [] });
  }
}

export function setMarket(market) {
  state.market = market;
  try {
    localStorage.setItem('bindtopia-market', market);
  } catch {}
}

export const year = setId => state.sets[setId]?.releaseDate?.slice(0, 4) || '';

// A copy served by the offline service worker (dist/sw.js) carries X-Bindtopia-Offline; it is exposed as data.offline.
export async function getJSON(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000), credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!r.ok) throw Error('Bron niet beschikbaar (' + r.status + ')');
  const data = await r.json(),
    offline = r.headers.get('X-Bindtopia-Offline');
  if (offline && data && typeof data === 'object') Object.defineProperty(data, 'offline', { value: offline });
  return data;
}

export function loadRates() {
  getJSON('./data/rates.json')
    .then(r => {
      if (r && r.rates) state.rates = r;
    })
    .catch(() => {});
}
