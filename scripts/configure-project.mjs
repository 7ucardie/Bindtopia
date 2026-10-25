import {readFile,writeFile,unlink} from 'node:fs/promises';
const root=new URL('../',import.meta.url);const config=JSON.parse(await readFile(new URL('project.config.json',root),'utf8'));
if(!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(config.sponsorsUsername))throw Error('Invalid Sponsors username');
const domain=config.customDomain?.trim().toLowerCase()||'';if(domain&&!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))throw Error('Use a domain name without protocol, port or path');
await writeFile(new URL('.github/FUNDING.yml',root),'github: ['+config.sponsorsUsername+']\n');
await writeFile(new URL('dist/project.json',root),JSON.stringify({sponsorsUsername:config.sponsorsUsername,githubOwner:config.githubOwner,repository:config.repository,customDomain:domain,publicationStatus:config.publicationStatus}));
if(domain)await writeFile(new URL('dist/CNAME',root),domain+'\n');else await unlink(new URL('dist/CNAME',root)).catch(e=>{if(e.code!=='ENOENT')throw e});
console.log('Projectconfiguratie bijgewerkt; DNS en GitHub-instellingen zijn niet gewijzigd.');
