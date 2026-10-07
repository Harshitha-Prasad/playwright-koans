// Serves the built site from dist/ for local preview and for the site tests.
// Run with: npm run site  (builds first, then serves on http://localhost:4174)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 4174);
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const filePath = normalize(join(DIST, decodeURIComponent(relative)));
  if (!filePath.startsWith(DIST.endsWith(sep) ? DIST : DIST + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    const notFound = await readFile(join(DIST, '404.html')).catch(() => 'Not found');
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(notFound);
  }
}).listen(PORT, () => console.log(`Site preview at http://localhost:${PORT}`));
