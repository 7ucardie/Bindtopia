import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url);
export function validateCatalog(cards,sets,previous=[]){
 if(!Array.isArray(cards)||cards.length<20000||!Array.isArray(sets)||sets.length<150)throw Error('Onvolledige catalogus; bestaande index blijft behouden');
 const ids=new Set(),setIds=new Set();for(const s of sets){if(!s||typeof s.id!=='string'||typeof s.name!=='string'||!Number.isInteger(s.cardCount?.official)||!Number.isInteger(s.cardCount?.total)||setIds.has(s.id))throw Error('Ongeldige of dubbele set');setIds.add(s.id)}
 for(const c of cards){if(!c||typeof c.id!=='string'||typeof c.name!=='string'||typeof c.localId!=='string'||ids.has(c.id)||!setIds.has(c.id.slice(0,c.id.lastIndexOf('-')))||(c.image&&!/^https:\/\/assets\.tcgdex\.net\//.test(c.image)))throw Error('Ongeldige kaart, set of afbeelding');ids.add(c.id)}
 // Never silently remove cards during an automatic update: source corrections require review.
 const removed=previous.filter(c=>!ids.has(c.id));if(removed.length)throw Error(`${removed.length} bestaande kaart-ID's ontbreken; handmatige controle vereist`);
 return cards.map(c=>({...c,setId:c.id.slice(0,c.id.lastIndexOf('-'))})).sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}));
}
async function fetchList(path){let last;for(let n=0;n<3;n++){try{const response=await fetch('https://api.tcgdex.net/v2/en/'+path,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error(path+': HTTP '+response.status);return await response.json()}catch(e){last=e;if(n<2)await new Promise(r=>setTimeout(r,(n+1)*1500))}}throw last}
const stable=v=>JSON.stringify(v);const canonicalCards=cs=>cs.map(c=>({...c,setId:c.id.slice(0,c.id.lastIndexOf('-'))})).sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}));const canonicalSets=ss=>ss.slice().sort((a,b)=>a.id.localeCompare(b.id,'en'));
async function atomic(url,value){const temp=new URL(url.href+'.tmp');await writeFile(temp,stable(value));await rename(temp,url)}
export async function sync(){const data=new URL('dist/data/',root);const oldCards=JSON.parse(await readFile(new URL('cards-en.json',data),'utf8'));const oldSets=JSON.parse(await readFile(new URL('sets-en.json',data),'utf8'));const [incoming,sets]=await Promise.all([fetchList('cards'),fetchList('sets')]);const cards=validateCatalog(incoming,sets,oldCards),sortedSets=canonicalSets(sets);if(stable(cards)===stable(canonicalCards(oldCards))&&stable(sortedSets)===stable(canonicalSets(oldSets))){console.log('Geen cataloguswijzigingen.');return false}
 const known=new Set(oldCards.map(c=>c.id)),added=cards.filter(c=>!known.has(c.id));const meta={source:'TCGdex',language:'en',updated:new Date().toISOString(),count:cards.length,sets:sets.length,added:added.length};
 // Validate everything before any writes; files are each atomically replaced.
 await mkdir(data,{recursive:true});await atomic(new URL('cards-en.json',data),cards);await atomic(new URL('sets-en.json',data),sortedSets);await atomic(new URL('meta.json',data),meta);
 const ios=new URL('ios/Bindtopia/Resources/',root);await atomic(new URL('cards-en.json',ios),cards);await atomic(new URL('sets-en.json',ios),sortedSets);await atomic(new URL('meta.json',ios),meta);console.log(`Catalogus bijgewerkt: ${cards.length} kaarten, ${sets.length} sets, ${added.length} nieuwe kaarten.`);return true}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await sync();
