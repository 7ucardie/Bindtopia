import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';

// Real text recognition, offline: the CDN files the site loads are served from the npm packages pinned in package.json.
const require = createRequire(import.meta.url);
const pkg = name => dirname(require.resolve(name + '/package.json'));
const files = {
  'cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/': join(pkg('tesseract.js'), 'dist'),
  'cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/': pkg('tesseract.js-core'),
  'tessdata.projectnaptha.com/4.0.0/': join(pkg('@tesseract.js-data/eng'), '4.0.0'),
};
const types = {js: 'text/javascript', wasm: 'application/wasm', gz: 'application/gzip'};
export async function serveOcr(page, context) {
  const handler = route => {
    const url = route.request().url().replace(/^https:\/\//, '').split('?')[0];
    const prefix = Object.keys(files).find(p => url.startsWith(p));
    if (!prefix) return route.fallback();
    const file = join(files[prefix], url.slice(prefix.length));
    return route.fulfill({body: readFileSync(file), contentType: types[file.split('.').pop()] || 'application/octet-stream', headers: {'access-control-allow-origin': '*'}});
  };
  await context.route(/cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com/, handler);
  await page.route(/cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com/, handler);
}

