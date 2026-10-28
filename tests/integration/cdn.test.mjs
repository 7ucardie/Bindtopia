import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const ocr = readFileSync(new URL('../../dist/ocr.mjs', import.meta.url), 'utf8');
const url = ocr.match(/TESSERACT_URL = '([^']+tesseract\.min\.js)'/)[1];
const sri = ocr.match(/TESSERACT_SRI = '([^']+)'/)[1];

// Needs internet; CI always runs it, local runs may opt in with CI=1.
test('pinned Tesseract CDN script matches its integrity hash', {skip: !process.env.CI && 'set CI=1 to fetch from the CDN'}, async () => {
  const body = Buffer.from(await (await fetch(url)).arrayBuffer());
  assert.equal('sha384-' + createHash('sha384').update(body).digest('base64'), sri);
});
