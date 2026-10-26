// Fetches the ECB euro reference rates for the price conversions; keeps the previous file when anything fails.
import {writeFile, rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const URL_ECB = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const REQUIRED = ['USD', 'GBP', 'AUD', 'CAD', 'PLN'];

export function parseEcb(xml) {
  const date = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1];
  const rates = Object.fromEntries([...xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)].map(([, c, r]) => [c, Number(r)]));
  if (!date || !REQUIRED.every(c => rates[c] > 0)) throw Error('Onvolledige ECB-koersen');
  return {source: 'European Central Bank', base: 'EUR', date, rates};
}

export async function syncRates(target = new URL('../dist/data/rates.json', import.meta.url)) {
  try {
    const response = await fetch(URL_ECB, {signal: AbortSignal.timeout(30000)});
    if (!response.ok) throw Error('HTTP ' + response.status);
    const data = parseEcb(await response.text());
    const temp = new URL(target.href + '.tmp');
    await writeFile(temp, JSON.stringify(data));
    await rename(temp, target);
    console.log('Wisselkoersen bijgewerkt:', data.date);
  } catch (e) {
    console.warn('Wisselkoersen niet bijgewerkt; vorige bestand blijft staan:', e.message);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await syncRates();
