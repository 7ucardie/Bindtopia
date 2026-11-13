// Builds static, crawlable HTML pages for search engines from the catalog index, at deploy time (like the API):
// one page per card (/card/<id>/), one per set (/set/<id>/), a sets overview (/sets/) and a sitemap index.
// The app itself stays the single-page catalog; every static page links into it (?card=<id>).
import {readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {fileId} from '../dist/card-detail.mjs';

export const SITE = 'https://bindtopia.com';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const longDate = d => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}) : '');
const year = s => (s?.releaseDate ? s.releaseDate.slice(0, 4) : '');
export const cardPath = c => '/card/' + fileId(c.id) + '/';
export const setPath = s => '/set/' + fileId(s.id) + '/';
const appCard = c => '/?card=' + encodeURIComponent(c.id) + '&ui=en';
// The number as printed: "024/128" when the set has an official count, else "#024".
export const printed = (c, s) => (s?.cardCount?.official ? c.localId + '/' + String(s.cardCount.official).padStart(String(c.localId).replace(/\D/g, '').length >= 3 ? 3 : 0, '0') : '#' + c.localId);
const byNumber = (a, b) => String(a.localId).localeCompare(String(b.localId), 'en', {numeric: true});

function page({path, title, description, image, crumbs, body}) {
  const url = SITE + path;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([name, href], i) => ({'@type': 'ListItem', position: i + 1, name, ...(href ? {item: SITE + href} : {})})),
  };
  return `<!doctype html><html lang="en" data-theme="poke-island"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Bindtopia"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${esc(image || SITE + '/brand/brand-preview.png')}"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/typography.css"><link rel="stylesheet" href="/pages.css"><link rel="icon" type="image/svg+xml" href="/icon.svg?v=orb1"><link rel="alternate icon" href="/favicon.ico?v=orb1"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=orb1"><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script><script src="/pages.js" defer></script></head><body><header><a class="brand" href="/?ui=en" aria-label="Bindtopia home"><img class="brand-wordmark brand-wordmark--light" src="/brand/bindtopia-logo-light.svg" alt="Bindtopia"></a><nav class="page-nav" aria-label="Catalog"><a href="/?ui=en">Search cards</a><a href="/sets/">All sets</a></nav></header><main class="seo-page"><nav class="crumbs" aria-label="Breadcrumb">${crumbs.map(([name, href], i) => (href && i < crumbs.length - 1 ? `<a href="${href}">${esc(name)}</a>` : `<span aria-current="page">${esc(name)}</span>`)).join(' › ')}</nav>${body}</main><footer class="seo-foot"><span>◈ Bindtopia is an independent, ad-free fan project. Pokémon images © their respective rights holders; no official affiliation.</span><span>Card data: <a href="https://tcgdex.dev" rel="noopener">TCGdex</a> (<a href="/TCGDEX-LICENSE.txt">MIT</a>) · <a href="/legal-en.html">Privacy, cookies and terms</a></span></footer></body></html>`;
}

const crumbsFor = (s, last) => [['Bindtopia', '/?ui=en'], ['Sets', '/sets/'], ...(s ? [[s.name, setPath(s)]] : []), ...(last ? [[last]] : [])];
const cardImage = (c, size, attrs) => (c.image ? `<img src="${esc(c.image)}/${size}.webp" ${attrs}>` : `<div class="placeholder">Image not yet available</div>`);

export function cardPage(c, s, {inSet, prints}) {
  const num = printed(c, s),
    where = s ? s.name + (year(s) ? ' (' + year(s) + ')' : '') : c.setId;
  const i = inSet.indexOf(c),
    prev = inSet[i - 1],
    next = inSet[i + 1];
  const others = prints.filter(o => o !== c);
  // One print per other set first (newest first), then more from this set: a spread of sets is more useful.
  const seen = new Set([c.setId]),
    spread = others.filter(o => o.setId !== c.setId && !seen.has(o.setId) && seen.add(o.setId));
  const shown = [...spread, ...others.filter(o => !spread.includes(o))].slice(0, 12);
  const step = (o, rel, label) => (o ? `<a rel="${rel}" href="${cardPath(o)}" data-card="${esc(o.id)}">${label}</a>` : '<span></span>');
  const body = `<div class="card-page"><div class="card-page-art">${cardImage(c, 'high', `alt="${esc(c.name + ' – ' + (s?.name || '') + ' ' + num)}" width="600" height="825" fetchpriority="high"`)}</div><div class="card-page-info"><h1>${esc(c.name)}</h1><p class="card-page-meta"><span class="tag">${esc(num)}</span> <a href="${s ? setPath(s) : '/sets/'}">${esc(s?.name || c.setId)}</a>${s?.releaseDate ? ' · ' + esc(longDate(s.releaseDate)) : ''}</p><p>${esc(c.name)} is card ${esc(c.localId)}${s?.cardCount?.official ? ' of ' + s.cardCount.official : ''} in the Pokémon Trading Card Game set ${esc(s?.name || c.setId)}${s?.cardCount?.total && s.cardCount.total !== s.cardCount.official ? ' (' + s.cardCount.total + ' cards including secret rares)' : ''}${s?.releaseDate ? ', released on ' + esc(longDate(s.releaseDate)) : ''}.</p><p class="card-page-actions"><a class="primary" href="${appCard(c)}">Open in Bindtopia</a><a class="outline" href="${s ? setPath(s) : '/sets/'}">All ${inSet.length} cards in ${esc(s?.name || c.setId)}</a></p><p class="notice">In Bindtopia you see the card text and price indications, save the card to your collection on your own device, or scan your own card with your camera.</p><nav class="card-steps" aria-label="In this set">${step(prev, 'prev', prev ? '← ' + esc(prev.localId + ' ' + prev.name) : '')}${step(next, 'next', next ? esc(next.localId + ' ' + next.name) + ' →' : '')}</nav></div></div>${
    others.length
      ? `<section class="prints"><h2>Other ${esc(c.name)} cards</h2><p>${esc(c.name)} appears on ${prints.length} cards in Bindtopia${others.length > shown.length ? '; ' + shown.length + ' of the others, newest first:' : ':'}</p><ul>${shown.map(o => `<li><a href="${cardPath(o)}" data-card="${esc(o.id)}">${esc(o.name)} · ${esc(o.set?.name || o.setId)} ${esc(printed(o, o.set))}${year(o.set) ? ' (' + year(o.set) + ')' : ''}</a></li>`).join('')}</ul></section>`
      : ''
  }`;
  return page({
    path: cardPath(c),
    title: `${c.name} ${num} – ${where} | Bindtopia`,
    description: `${c.name}, card ${num} from the Pokémon TCG set ${s?.name || c.setId}${s?.releaseDate ? ' (' + longDate(s.releaseDate) + ')' : ''}. See the card and its other prints, then open it in Bindtopia for card text, price indications, or to scan and save it.`,
    image: c.image ? c.image + '/high.webp' : '',
    crumbs: crumbsFor(s, c.name + ' ' + num),
    body,
  });
}

export function setPage(s, cards, {prev, next}) {
  const body = `<h1>${esc(s.name)}</h1><p class="card-page-meta">${s.releaseDate ? 'Released ' + esc(longDate(s.releaseDate)) + ' · ' : ''}${cards.length} cards${s.cardCount?.official && s.cardCount.official !== cards.length ? ' (' + s.cardCount.official + ' in the official count)' : ''}</p><ul class="set-grid">${cards.map(c => `<li><a href="${cardPath(c)}" data-card="${esc(c.id)}">${cardImage(c, 'low', `alt="" width="245" height="342" loading="lazy" decoding="async"`)}<span>${esc(c.name)}</span><span class="tag">${esc(printed(c, s))}</span></a></li>`).join('')}</ul><nav class="card-steps" aria-label="Other sets">${prev ? `<a rel="prev" href="${setPath(prev)}">← ${esc(prev.name)}</a>` : '<span></span>'}${next ? `<a rel="next" href="${setPath(next)}">${esc(next.name)} →</a>` : '<span></span>'}</nav>`;
  return page({
    path: setPath(s),
    title: `${s.name}${year(s) ? ' (' + year(s) + ')' : ''} – all ${cards.length} cards | Bindtopia`,
    description: `All ${cards.length} cards of the Pokémon TCG set ${s.name}${s.releaseDate ? ', released ' + longDate(s.releaseDate) : ''}, with card numbers and images. Free, ad-free fan catalog.`,
    image: cards.find(c => c.image)?.image ? cards.find(c => c.image).image + '/high.webp' : '',
    crumbs: crumbsFor(null, s.name),
    body,
  });
}

export function setsPage(sets, counts) {
  const years = new Map();
  for (const s of sets) (years.get(year(s) || 'Unknown') || years.set(year(s) || 'Unknown', []).get(year(s) || 'Unknown')).push(s);
  const body = `<h1>All Pokémon TCG sets</h1><p>${sets.length} sets with ${[...counts.values()].reduce((a, b) => a + b, 0).toLocaleString('en')} cards, newest first.</p>${[...years]
    .map(([y, list]) => `<section><h2>${esc(y)}</h2><ul class="set-list">${list.map(s => `<li><a href="${setPath(s)}">${esc(s.name)}</a> <span class="muted">${counts.get(s.id) || 0} cards${s.releaseDate ? ' · ' + esc(longDate(s.releaseDate)) : ''}</span></li>`).join('')}</ul></section>`)
    .join('')}`;
  return page({path: '/sets/', title: 'All Pokémon TCG sets – card lists by year | Bindtopia', description: `Every Pokémon Trading Card Game set in Bindtopia's free catalog, ${sets.length} sets from newest to oldest, each with its full card list.`, crumbs: [['Bindtopia', '/?ui=en'], ['Sets']], body});
}

const urlset = urls => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(SITE + u)}</loc></url>`).join('\n')}\n</urlset>\n`;

// Returns Map(path below dist/ → file text). The hand-kept pages stay in the committed sitemap-site.xml; this adds
// sitemap-sets.xml (the overview and every set) and sitemap-cards-N.xml, and rewrites the sitemap.xml index to list all.
export function buildPages(cards, sets) {
  const setMap = new Map(sets.map(s => [s.id, s]));
  const ordered = [...sets].sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')) || a.name.localeCompare(b.name));
  const bySet = new Map(sets.map(s => [s.id, []]));
  const byName = new Map();
  for (const c of cards) {
    bySet.get(c.setId)?.push(c);
    (byName.get(c.name) || byName.set(c.name, []).get(c.name)).push(c);
  }
  for (const list of bySet.values()) list.sort(byNumber);
  const released = c => setMap.get(c.setId)?.releaseDate || '';
  for (const list of byName.values()) list.sort((a, b) => released(b).localeCompare(released(a)) || byNumber(a, b));
  const withSet = c => ({...c, set: setMap.get(c.setId)});
  const files = new Map();
  for (const c of cards) files.set(cardPath(c).slice(1) + 'index.html', cardPage(c, setMap.get(c.setId), {inSet: bySet.get(c.setId) || [c], prints: (byName.get(c.name) || [c]).map(o => (o === c ? c : withSet(o)))}));
  // inSet holds the same objects as cards, so the index lookup for prev/next works; prints only needs names and sets.
  ordered.forEach((s, i) => files.set(setPath(s).slice(1) + 'index.html', setPage(s, bySet.get(s.id), {prev: ordered[i + 1], next: ordered[i - 1]})));
  files.set('sets/index.html', setsPage(ordered, new Map([...bySet].map(([id, l]) => [id, l.length]))));
  const sitemaps = [['sitemap-sets.xml', ['/sets/', ...ordered.map(setPath)]]];
  const cardUrls = cards.map(cardPath);
  for (let i = 0; i < cardUrls.length; i += 40000) sitemaps.push([`sitemap-cards-${i / 40000 + 1}.xml`, cardUrls.slice(i, i + 40000)]);
  for (const [name, urls] of sitemaps) files.set(name, urlset(urls));
  files.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[['sitemap-site.xml'], ...sitemaps].map(([name]) => `  <sitemap><loc>${SITE}/${name}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`);
  return files;
}

export async function writePages(root = new URL('../', import.meta.url)) {
  const dist = new URL('dist/', root),
    data = new URL('data/', dist);
  const [cards, sets] = await Promise.all(['cards-en.json', 'sets-en.json'].map(async f => JSON.parse(await readFile(new URL(f, data), 'utf8'))));
  const files = buildPages(cards, sets);
  await Promise.all(['card/', 'set/', 'sets/'].map(d => rm(new URL(d, dist), {recursive: true, force: true})));
  const dirs = new Set([...files.keys()].map(p => p.slice(0, p.lastIndexOf('/') + 1)).filter(Boolean));
  for (const d of dirs) await mkdir(new URL(d, dist), {recursive: true});
  const entries = [...files];
  for (let i = 0; i < entries.length; i += 256) await Promise.all(entries.slice(i, i + 256).map(([path, text]) => writeFile(new URL(path, dist), text)));
  return files.size;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log('Pages written:', await writePages(), 'files in dist/');
