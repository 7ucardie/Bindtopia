// Minimal static server for dist/ used by integration and e2e tests.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.txt':'text/plain'};
export function serve(port = 0) {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    if (path.startsWith('..')) { res.writeHead(403).end(); return; }
    const file = join(root, path.endsWith('/') || path === '' ? join(path, 'index.html') : path);
    try { const body = await readFile(file); res.writeHead(200, {'content-type': types[extname(file)] || 'application/octet-stream'}).end(body); }
    catch { res.writeHead(404).end('not found'); }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) serve(Number(process.env.PORT || 4173)).then(s => console.log('http://127.0.0.1:' + s.address().port));
