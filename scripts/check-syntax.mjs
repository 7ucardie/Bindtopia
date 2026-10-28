// Syntax check of every browser module and the service worker (node --check per file).
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const files = readdirSync(dist).filter(f => f.endsWith('.mjs') || f === 'sw.js');
for (const f of files) execFileSync(process.execPath, ['--check', new URL(f, dist).pathname], { stdio: 'inherit' });
console.log(`Syntax checked: ${files.length} files in dist/.`);
