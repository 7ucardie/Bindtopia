import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

// Search engines and lost visitors: robots.txt, a sitemap of real pages and a self-contained 404 page.
const dist = new URL('../../dist/', import.meta.url);
const read = f => readFileSync(new URL(f, dist), 'utf8');

test('robots.txt allows crawling and names the sitemap', () => {
  const robots = read('robots.txt');
  assert.match(robots, /^User-agent: \*$/m);
  assert.doesNotMatch(robots, /^Disallow: \/\s*$/m);
  assert.match(robots, /^Sitemap: https:\/\/bindtopia\.com\/sitemap\.xml$/m);
});

test('every sitemap URL is an absolute bindtopia.com address of an existing page', () => {
  const urls = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(urls.includes('https://bindtopia.com/'));
  for (const url of urls) {
    assert.match(url, /^https:\/\/bindtopia\.com\//, url);
    const file = url.replace('https://bindtopia.com/', '') || 'index.html';
    assert.ok(existsSync(new URL(file, dist)), url);
  }
});

test('the 404 page links home, uses root-relative local files and loads nothing external', () => {
  const page = read('404.html');
  assert.match(page, /href="\/"/);
  assert.match(page, /noindex/);
  for (const [, ref] of page.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.ok(ref.startsWith('/'), ref + ' must start at the site root, the page is served at any depth');
    assert.ok(ref === '/' || existsSync(new URL(ref.slice(1).split('?')[0], dist)), ref);
  }
});

test('the install name is English, like the default interface', () => {
  assert.match(JSON.parse(read('manifest.webmanifest')).name, /^Bindtopia — Pokémon card catalog$/);
});
