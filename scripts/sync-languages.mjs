// Measures which TCGdex card languages have a usable catalog and writes dist/data/languages.json for the language picker.
// Keeps a language's previous entry when its request fails, so a hiccup never removes a working language.
import {readFile, writeFile, rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

// Codes TCGdex accepts (tcgdex.dev/errors/language-invalid), with the native name and the Tesseract model for photo recognition.
export const CANDIDATES = [
  ['en', 'English', 'eng'], ['ja', '日本語', 'jpn'], ['fr', 'Français', 'fra'], ['de', 'Deutsch', 'deu'], ['it', 'Italiano', 'ita'],
  ['es', 'Español', 'spa'], ['pt', 'Português', 'por'], ['nl', 'Nederlands', 'nld'], ['pl', 'Polski', 'pol'], ['ru', 'Русский', 'rus'],
  ['ko', '한국어', 'kor'], ['zh-tw', '繁體中文', 'chi_tra'], ['zh-cn', '简体中文', 'chi_sim'], ['id', 'Bahasa Indonesia', 'ind'], ['th', 'ไทย', 'tha'],
];
export const MIN_CARDS = 300;

export function pickLanguages(measured, previous = []) {
  const old = new Map(previous.map(l => [l.code, l]));
  const out = [];
  for (const [code, name, ocr] of CANDIDATES) {
    const m = measured[code];
    const entry = m && !m.error ? {code, name, ocr, cards: m.cards, sets: m.sets} : old.get(code);
    // An entry without a count (the hand-written seed) is kept until a measurement replaces it.
    if (entry && (code === 'en' || entry.cards === undefined || entry.cards >= MIN_CARDS)) out.push({...entry, name, ocr});
  }
  if (!out.some(l => l.code === 'en')) throw Error('English catalog missing; languages unchanged');
  return out;
}

async function count(code) {
  const get = async path => { const r = await fetch(`https://api.tcgdex.net/v2/${code}/${path}`, {signal: AbortSignal.timeout(60000)}); if (!r.ok) throw Error(`${code}/${path}: HTTP ${r.status}`); return r.json(); };
  try { const [cards, sets] = await Promise.all([get('cards'), get('sets')]); return {cards: Array.isArray(cards) ? cards.length : 0, sets: Array.isArray(sets) ? sets.length : 0}; }
  catch (e) { return {error: e.message}; }
}

export async function syncLanguages(target = new URL('../dist/data/languages.json', import.meta.url)) {
  const previous = JSON.parse(await readFile(target, 'utf8').catch(() => '[]'));
  const measured = {};
  for (const [code] of CANDIDATES) measured[code] = await count(code);
  for (const [code, m] of Object.entries(measured)) console.log(code.padEnd(6), m.error ? 'error: ' + m.error : `${m.cards} cards, ${m.sets} sets`);
  const languages = pickLanguages(measured, previous);
  const temp = new URL(target.href + '.tmp');
  await writeFile(temp, JSON.stringify(languages));
  await rename(temp, target);
  console.log('Kaarttalen:', languages.map(l => l.code).join(', '));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await syncLanguages();
