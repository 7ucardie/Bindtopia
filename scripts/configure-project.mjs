import { readFile, writeFile, unlink } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('project.config.json', root), 'utf8'));
// GitHub Sponsors is optional until the account is active; empty hides every Sponsors link.
const sponsors = (config.sponsorsUsername || '').trim();
if (sponsors && !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(sponsors)) throw Error('Invalid Sponsors username');
const analytics = (config.cloudflareAnalyticsToken || '').trim();
if (analytics && !/^[a-f0-9]{32}$/.test(analytics)) throw Error('Cloudflare Web Analytics token must be 32 hex characters');
const domain = config.customDomain?.trim().toLowerCase() || '';
if (domain && !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) throw Error('Use a domain name without protocol, port or path');
// Optional second, voluntary donation channel; empty keeps the Ko-fi link hidden.
const kofi = (config.kofiUsername || '').trim();
if (kofi && !/^[A-Za-z0-9_]{1,40}$/.test(kofi)) throw Error('Ko-fi username may contain letters, digits and underscores only');
// Running costs shown on the rights page: what the operator pays for, per year or per month (null while unknown).
const amount = v => v === undefined || v === null || (typeof v === 'number' && v >= 0);
const costs = (config.costs || []).map(c => {
  if (typeof c.item !== 'string' || !c.item.trim() || typeof c.itemEn !== 'string' || !c.itemEn.trim()) throw Error('Each cost needs item and itemEn');
  if (!amount(c.perYear) || !amount(c.perMonth) || (c.perYear != null && c.perMonth != null)) throw Error('Give perYear or perMonth as a number, or neither');
  if (!/^[A-Z]{3}$/.test(c.currency || '')) throw Error('currency must be a 3-letter code');
  return { item: c.item.trim(), itemEn: c.itemEn.trim(), perYear: c.perYear ?? null, perMonth: c.perMonth ?? null, currency: c.currency };
});
await writeFile(new URL('.github/FUNDING.yml', root), (sponsors ? 'github: [' + sponsors + ']\n' : '') + (kofi ? 'ko_fi: ' + kofi + '\n' : ''));
await writeFile(
  new URL('dist/project.json', root),
  JSON.stringify({
    sponsorsUsername: sponsors,
    kofiUsername: kofi,
    githubOwner: config.githubOwner,
    repository: config.repository,
    customDomain: domain,
    publicationStatus: config.publicationStatus,
    cloudflareAnalyticsToken: analytics,
    costs,
  }),
);
if (domain) await writeFile(new URL('dist/CNAME', root), domain + '\n');
else
  await unlink(new URL('dist/CNAME', root)).catch(e => {
    if (e.code !== 'ENOENT') throw e;
  });
console.log('Projectconfiguratie bijgewerkt; DNS en GitHub-instellingen zijn niet gewijzigd.');
