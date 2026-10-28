import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';

// Privacy guard: everything the site contacts must be disclosed, and nothing may track.
const dist = new URL('../../dist/', import.meta.url);
const read = f => readFileSync(new URL(f, dist), 'utf8');
const code = readdirSync(dist).filter(f => /\.(mjs|js)$/.test(f)).map(read).join('\n') + read('index.html');
const legalNl = ['privacy.html', 'cookies.html', 'voorwaarden.html', 'rechten.html'].map(read).join('\n');
const legalEn = read('legal-en.html');
const ownLinks = new Set(['tcgdex.dev']);
const hosts = [...new Set([...code.matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/g)].map(m => m[1].replace(/^www\./, '')))].filter(h => !ownLinks.has(h));

test('every external host contacted by the site is named in both privacy statements', () => {
  assert.ok(hosts.includes('api.tcgdex.net'));
  const name = h => /(^|\.)ebay\./.test(h) ? 'eBay' : ({'cardmarket.com': 'Cardmarket', 'tcgplayer.com': 'TCGplayer', 'ebay.nl': 'eBay', 'google.com': 'Google'})[h] || h;
  for (const h of hosts) {
    assert.ok(legalNl.includes(name(h)), `privacy.html mist ${h}`);
    assert.ok(legalEn.includes(name(h)), `legal-en.html misses ${h}`);
  }
});

test('no cookies, ads, third-party fonts or analytics other than cookieless Cloudflare', () => {
  assert.doesNotMatch(code, /google-analytics|googletagmanager|gtag\(|fbq\(|hotjar|plausible|matomo|doubleclick|fonts\.googleapis|document\.cookie/i);
});

test('analytics only loads with a valid token and respects Do Not Track and Global Privacy Control', () => {
  const fn = read('app.mjs').match(/function loadAnalytics\(token\)\{(.*?)\}\n/)[1];
  assert.match(fn, /\^\[a-f0-9\]\{32\}\$/);
  assert.match(fn, /doNotTrack==='1'/);
  assert.match(fn, /globalPrivacyControl/);
});

test('every localStorage key is disclosed in the cookie information', () => {
  const keys = [...code.matchAll(/localStorage\.(?:get|set|remove)Item\('([^']+)'/g)].map(m => m[1]);
  assert.ok(keys.length);
  for (const k of new Set(keys)) { assert.ok(read('cookies.html').includes(k), k); assert.ok(legalEn.includes(k), k); }
});

test('legal pages are final and complete', () => {
  for (const [text, label] of [[legalNl, 'nl'], [legalEn, 'en']]) {
    assert.doesNotMatch(text, /nog aan te vullen|not yet (been )?supplied|concept|draft|privé-test|private test/i, label);
    assert.match(text, /github\.com\/7ucardie\/Bindtopia\/issues/, label + ': contact');
    assert.match(text, /autoriteitpersoonsgegevens\.nl/, label + ': supervisory authority');
  }
  assert.match(legalNl, /geen rechten worden ontleend/);
  assert.match(legalEn, /No rights can be derived/);
  assert.match(legalNl, /zonder verdienmodel/);
  assert.match(legalEn, /no revenue model/);
  assert.match(legalNl, /niet gelieerd aan/);
  for (const t of [legalNl, legalEn]) { assert.match(t, /GitHub Sponsors/); assert.match(t, /Cloudflare Web Analytics/); assert.match(t, /cloudflareinsights\.com/); }
});

test('fetches send no credentials or referrer', () => {
  // The service worker may pass the browser's own request on unchanged (fetch(request)); every request it makes itself must be safe.
  const calls = [...code.matchAll(/fetch\((?!request\))/g)].length;
  const safe = [...code.matchAll(/credentials:\s*["']omit["'],\s*referrerPolicy:\s*["']no-referrer["']/g)].length;
  assert.equal(safe, calls, 'every fetch() sets credentials omit and no-referrer');
});
