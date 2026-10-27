// Builds the public read-only JSON API (dist/api/v1) from the catalog index.
import {readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {fileId} from '../dist/card-detail.mjs';

export const BASE = '/api/v1/';
// Card IDs may contain characters that are unsafe in a URL path (e.g. "exu-!"); encode those as _HEX.
export {fileId};
const year = s => s.releaseDate ? Number(s.releaseDate.slice(0, 4)) : null;
const images = c => c.image ? {small: c.image + '/low.webp', large: c.image + '/high.webp'} : null;

export function buildApi(cards, sets, meta) {
  const files = new Map();
  const setInfo = s => ({id: s.id, name: s.name, releaseDate: s.releaseDate || null, year: year(s), cardCount: s.cardCount, logo: s.logo ? s.logo + '.webp' : null, symbol: s.symbol ? s.symbol + '.webp' : null, url: BASE + 'sets/' + fileId(s.id) + '.json'});
  const bySet = new Map(sets.map(s => [s.id, []]));
  const cardBrief = c => ({id: c.id, localId: c.localId, name: c.name, setId: c.setId, images: images(c), url: BASE + 'cards/' + fileId(c.id) + '.json'});
  for (const c of cards) bySet.get(c.setId)?.push(c);
  const setMap = new Map(sets.map(s => [s.id, s]));
  files.set('index.json', {
    name: 'Bindtopia API', version: 1, language: 'en', updated: meta.updated, cards: cards.length, sets: sets.length,
    endpoints: {sets: BASE + 'sets.json', set: BASE + 'sets/{setId}.json', cards: BASE + 'cards.json', card: BASE + 'cards/{cardFileId}.json', openapi: BASE + 'openapi.json'},
    source: 'Card data from TCGdex (https://tcgdex.dev, MIT). Card images belong to their rights holders and are not licensed by Bindtopia.',
    terms: 'https://bindtopia.com/voorwaarden.html',
  });
  files.set('sets.json', sets.map(setInfo));
  files.set('cards.json', cards.map(cardBrief));
  for (const s of sets) files.set('sets/' + fileId(s.id) + '.json', {...setInfo(s), cards: bySet.get(s.id).map(cardBrief)});
  for (const c of cards) { const s = setMap.get(c.setId); files.set('cards/' + fileId(c.id) + '.json', {...cardBrief(c), set: s ? setInfo(s) : null}); }
  return files;
}

export async function writeApi(root = new URL('../', import.meta.url)) {
  const data = new URL('dist/data/', root), out = new URL('dist/api/v1/', root);
  const [cards, sets, meta] = await Promise.all(['cards-en.json', 'sets-en.json', 'meta.json'].map(async f => JSON.parse(await readFile(new URL(f, data), 'utf8'))));
  const files = buildApi(cards, sets, meta);
  files.set('openapi.json', JSON.parse(await readFile(new URL('scripts/openapi.json', root), 'utf8')));
  // A landing page so the bare base URL answers 200 for people and API-directory health checks.
  const index = files.get('index.json');
  files.set('index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Free, read-only JSON API for the English Pokémon card catalog of Bindtopia."><title>Bindtopia API v1</title></head><body><h1>Bindtopia API v1</h1><p>Free, read-only JSON API: ${index.cards} cards and ${index.sets} sets, no key required. Updated ${index.updated}.</p><ul>${Object.entries(index.endpoints).map(([k, v]) => `<li>${k}: ${v.includes('{') ? `<code>${v}</code>` : `<a href="${v}">${v}</a>`}</li>`).join('')}</ul><p><a href="https://github.com/7ucardie/Bindtopia/blob/main/docs/reference/api.md">Documentation and usage policy</a> · Data: <a href="https://tcgdex.dev">TCGdex</a></p></body></html>`);
  await rm(out, {recursive: true, force: true});
  await mkdir(new URL('sets/', out), {recursive: true});
  await mkdir(new URL('cards/', out), {recursive: true});
  const entries = [...files];
  for (let i = 0; i < entries.length; i += 256) await Promise.all(entries.slice(i, i + 256).map(([path, body]) => writeFile(new URL(path, out), typeof body === 'string' ? body : JSON.stringify(body))));
  return files.size;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log('API geschreven:', await writeApi(), 'bestanden in dist/api/v1');
