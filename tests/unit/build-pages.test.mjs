import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildPages, printed, cardPath} from '../../scripts/build-pages.mjs';

const sets = [
  {id: 'old', name: 'Old Set', releaseDate: '1999-01-09', cardCount: {total: 3, official: 3}},
  {id: 'new', name: 'New <Set>', releaseDate: '2026-09-16', cardCount: {total: 4, official: 3}},
];
const cards = [
  {id: 'new-002', localId: '002', name: 'Pikachu', setId: 'new', image: 'https://assets.tcgdex.net/en/x/new/002'},
  {id: 'new-001', localId: '001', name: 'Bulbasaur', setId: 'new', image: 'https://assets.tcgdex.net/en/x/new/001'},
  {id: 'new-004', localId: '004', name: 'Pikachu', setId: 'new'},
  {id: 'old-58', localId: '58', name: 'Pikachu', setId: 'old', image: 'https://assets.tcgdex.net/en/x/old/58'},
  {id: 'exu-!', localId: '!', name: 'Unown "!"', setId: 'old'},
];
const files = buildPages(cards, sets);
const page = id => files.get(cardPath(cards.find(c => c.id === id)).slice(1) + 'index.html');

test('printed numbers follow the card: 024/128 style with an official count', () => {
  assert.equal(printed({localId: '024'}, {cardCount: {official: 128}}), '024/128');
  assert.equal(printed({localId: '2'}, {cardCount: {official: 15}}), '2/15');
  assert.equal(printed({localId: '9'}, {cardCount: {}}), '#9');
});

test('every card gets its own page with a unique title, canonical address, image and link into the app', () => {
  const html = page('new-002');
  assert.match(html, /<title>Pikachu 002\/003 – New &lt;Set&gt; \(2026\) \| Bindtopia<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/bindtopia\.com\/card\/new-002\/">/);
  assert.match(html, /src="https:\/\/assets\.tcgdex\.net\/en\/x\/new\/002\/high\.webp"/);
  assert.match(html, /href="\/\?card=new-002&ui=en"/);
  assert.match(html, /rel="prev" href="\/card\/new-001\/"/);
  assert.match(html, /rel="next" href="\/card\/new-004\/" data-card="new-004"/);
  assert.match(html, /<script src="\/pages\.js" defer><\/script>/);
  assert.match(page('new-004'), /Image not yet available/);
  assert.equal([...files.keys()].filter(k => k.startsWith('card/')).length, cards.length);
});

test('other prints list one card per other set first, and names and ids are escaped', () => {
  const prints = page('new-002').match(/<section class="prints">.*?<\/section>/)[0];
  assert.ok(prints.indexOf('/card/old-58/') < prints.indexOf('/card/new-004/'));
  assert.match(page('exu-!'), /Unown &quot;!&quot;/);
  assert.ok(files.has('card/exu-_21/index.html'));
  for (const html of files.values()) assert.doesNotMatch(html, /<Set>/);
});

test('breadcrumb structured data parses and set pages list their cards in number order', () => {
  const ld = JSON.parse(page('new-002').match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  assert.equal(ld['@type'], 'BreadcrumbList');
  assert.deepEqual(ld.itemListElement.map(i => i.name), ['Bindtopia', 'Sets', 'New <Set>', 'Pikachu 002/003']);
  const set = files.get('set/new/index.html');
  assert.ok(set.indexOf('/card/new-001/') < set.indexOf('/card/new-002/') && set.indexOf('/card/new-002/') < set.indexOf('/card/new-004/'));
  assert.ok(files.get('sets/index.html').indexOf('/set/new/') < files.get('sets/index.html').indexOf('/set/old/'));
});

test('the sitemap index lists the committed site sitemap, the sets and every card page', () => {
  const index = files.get('sitemap.xml');
  for (const name of ['sitemap-site.xml', 'sitemap-sets.xml', 'sitemap-cards-1.xml']) assert.match(index, new RegExp(`<loc>https://bindtopia.com/${name}</loc>`));
  assert.match(files.get('sitemap-sets.xml'), /<loc>https:\/\/bindtopia\.com\/sets\/<\/loc>/);
  const urls = [...files.get('sitemap-cards-1.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(urls.length, cards.length);
  assert.ok(urls.includes('https://bindtopia.com/card/exu-_21/'));
});
