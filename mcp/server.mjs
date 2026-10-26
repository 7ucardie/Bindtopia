#!/usr/bin/env node
// Bindtopia MCP server (stdio): lets AI assistants search the Pokémon card catalog through the public Bindtopia API.
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {normalize, matchCards} from '../dist/matcher.mjs';
import {markets, convert} from '../dist/markets.mjs';

const API = new URL(process.env.BINDTOPIA_API || 'https://bindtopia.com/api/v1/');
const SITE = new URL('../../', API);
const TCGDEX = process.env.BINDTOPIA_TCGDEX || 'https://api.tcgdex.net/v2/';
const {version} = JSON.parse(await import('node:fs').then(fs => fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')));

async function getJSON(url) {
  const r = await fetch(url, {signal: AbortSignal.timeout(30000), headers: {'user-agent': 'bindtopia-mcp/' + version}});
  if (!r.ok) throw Error(`${url}: HTTP ${r.status}`);
  return r.json();
}
let catalog;
// shortcut: the full card list (about 6 MB) is cached for the life of the process; restart to refresh.
const load = () => catalog ??= Promise.all([getJSON(new URL('cards.json', API)), getJSON(new URL('sets.json', API))]).then(([cards, sets]) => ({cards, sets: new Map(sets.map(s => [s.id, s]))})).catch(e => { catalog = undefined; throw e; });
const abs = path => new URL(path, SITE).href;
const brief = (c, sets) => { const s = sets.get(c.setId); return {id: c.id, name: c.name, number: c.localId, set: s ? {id: s.id, name: s.name, year: s.year} : {id: c.setId}, images: c.images, api: abs(c.url)}; };
const ok = data => ({content: [{type: 'text', text: JSON.stringify(data, null, 2)}]});
const fail = message => ({isError: true, content: [{type: 'text', text: message}]});
const tool = fn => async args => { try { return ok(await fn(args)); } catch (e) { return fail(e.message); } };

const server = new McpServer({name: 'bindtopia', version});

server.registerTool('search_cards', {
  title: 'Search Pokémon cards',
  description: 'Find cards by name, collector number ("4/102") or card ID ("base1-4"), with typo tolerance. Returns set and release year.',
  inputSchema: {query: z.string().min(1).describe('Card name, number like 4/102, or card ID'), setId: z.string().optional().describe('Only this set, e.g. base1'), limit: z.number().int().min(1).max(50).default(10)},
  annotations: {readOnlyHint: true, openWorldHint: true},
}, tool(async ({query, setId, limit}) => {
  const {cards, sets} = await load();
  const setTotals = Object.fromEntries([...sets].map(([id, s]) => [id, {cardCount: s.cardCount}]));
  let hits = matchCards(query, cards, setTotals, {setId, limit}).map(h => h.card);
  if (!hits.length) { const q = normalize(query); hits = cards.filter(c => (!setId || c.setId === setId) && (normalize(c.name).includes(q) || normalize(c.id) === q)).slice(0, limit); }
  return {query, count: hits.length, cards: hits.map(c => brief(c, sets))};
}));

server.registerTool('get_card', {
  title: 'Get card details',
  description: 'Full details for one card: set, release year, images, and (from TCGdex) HP, types, rarity, attacks, abilities and indicative Cardmarket/TCGplayer prices. Optionally converts prices to a market currency.',
  inputSchema: {id: z.string().min(1).describe('Card ID, e.g. base1-4'), language: z.string().regex(/^[a-z]{2}(-[a-z]{2})?$/).default('en').describe('Card language for the TCGdex details'), market: z.enum(Object.keys(markets)).optional().describe('Convert prices to this market currency (us, gb, au, ca, de, ...)')},
  annotations: {readOnlyHint: true, openWorldHint: true},
}, tool(async ({id, language, market}) => {
  const {cards, sets} = await load();
  const card = cards.find(c => c.id === id);
  if (!card) throw Error(`Unknown card ID "${id}". Use search_cards first.`);
  const result = brief(card, sets);
  let d = null;
  try { d = await getJSON(`${TCGDEX}${language}/cards/${encodeURIComponent(id)}`); } catch { result.details = null; result.note = 'TCGdex details are unavailable right now.'; }
  if (d) {
    result.details = {name: d.name, category: d.category, hp: d.hp, types: d.types, stage: d.stage, evolveFrom: d.evolveFrom, rarity: d.rarity, illustrator: d.illustrator, description: d.description, abilities: d.abilities, attacks: d.attacks};
    result.pricing = d.pricing ?? null;
    const currency = markets[market]?.currency;
    if (currency && d.pricing) {
      const rates = await getJSON(new URL('data/rates.json', SITE)).catch(() => null);
      const cm = d.pricing.cardmarket, tp = Object.entries(d.pricing.tcgplayer || {}).find(([, v]) => v && typeof v === 'object');
      result.local = {market, currency, ratesDate: rates?.date ?? null, note: 'Approximate conversion with ECB rates; not a local market price.',
        cardmarketTrend: convert(cm?.trend, cm?.unit || 'EUR', currency, rates) ?? (cm?.unit === currency ? cm?.trend : null),
        tcgplayerMarket: tp ? convert(tp[1].marketPrice, d.pricing.tcgplayer.unit || 'USD', currency, rates) ?? ((d.pricing.tcgplayer.unit || 'USD') === currency ? tp[1].marketPrice : null) : null};
    }
  }
  return result;
}));

server.registerTool('list_sets', {
  title: 'List sets',
  description: 'All Pokémon TCG sets with release date and year; filter by name or year.',
  inputSchema: {query: z.string().optional().describe('Part of the set name or ID'), year: z.number().int().optional().describe('Release year, e.g. 1999')},
  annotations: {readOnlyHint: true, openWorldHint: true},
}, tool(async ({query, year}) => {
  const {sets} = await load();
  const q = normalize(query || '');
  const list = [...sets.values()].filter(s => (!q || normalize(s.name + ' ' + s.id).includes(q)) && (!year || s.year === year)).sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''));
  return {count: list.length, sets: list.map(s => ({id: s.id, name: s.name, releaseDate: s.releaseDate, year: s.year, cards: s.cardCount?.total, api: abs(s.url)}))};
}));

server.registerTool('get_set', {
  title: 'Get a set',
  description: 'One set with its release date and every card in it.',
  inputSchema: {id: z.string().min(1).describe('Set ID, e.g. base1')},
  annotations: {readOnlyHint: true, openWorldHint: true},
}, tool(async ({id}) => {
  const {sets} = await load();
  const s = sets.get(id);
  if (!s) throw Error(`Unknown set ID "${id}". Use list_sets first.`);
  const full = await getJSON(abs(s.url));
  return {...full, api: abs(s.url), cards: full.cards.map(c => ({id: c.id, name: c.name, number: c.localId, images: c.images}))};
}));

await server.connect(new StdioServerTransport());
