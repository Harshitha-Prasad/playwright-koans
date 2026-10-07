// Koans Café — the tiny demo app every koan runs against.
// Zero dependencies on purpose: `node app/server.mjs` is all it takes.
// Reading this file is allowed (and encouraged) when a koan asks what the API returns.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 4173);
const PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));
const TOKEN = 'koans-token';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

// ---------- in-memory data ----------

const specials = [
  { id: 1, name: 'Pumpkin Spice Latte', price: 4.5 },
  { id: 2, name: 'Cinnamon Bun', price: 3.2 },
  { id: 3, name: 'Iced Matcha', price: 4.8 },
];

const orders = new Map(); // id -> order
let nextOrderId = 1000;

const jobs = new Map(); // id -> createdAt (ms)
let nextJobId = 1;

const unstableCalls = new Map(); // token -> number of calls so far

// ---------- helpers ----------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ---------- API ----------

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  const method = req.method ?? 'GET';

  if (pathname === '/api/health') return sendJson(res, 200, { ok: true });

  // Read-only list used by the UI pages. `?delay=ms` simulates a slow backend.
  if (pathname === '/api/specials' && method === 'GET') {
    const delay = Math.min(Number(searchParams.get('delay') ?? 0) || 0, 5000);
    if (delay) await sleep(delay);
    return sendJson(res, 200, specials);
  }

  // CRUD resource used by the API-testing koans.
  if (pathname === '/api/orders' && method === 'GET') return sendJson(res, 200, [...orders.values()]);

  if (pathname === '/api/orders' && method === 'POST') {
    const { customer, item } = await readJson(req);
    if (!customer || !item) return sendJson(res, 400, { error: 'customer and item are required' });
    const order = { id: nextOrderId++, customer, item, status: 'queued' };
    orders.set(order.id, order);
    return sendJson(res, 201, order);
  }

  const orderMatch = pathname.match(/^\/api\/orders\/(\d+)$/);
  if (orderMatch) {
    const id = Number(orderMatch[1]);
    if (!orders.has(id)) return sendJson(res, 404, { error: `order ${id} not found` });
    if (method === 'GET') return sendJson(res, 200, orders.get(id));
    if (method === 'DELETE') {
      orders.delete(id);
      res.writeHead(204);
      return res.end();
    }
  }

  // Auth: POST /api/login -> token, GET /api/profile needs "Authorization: Bearer <token>".
  if (pathname === '/api/login' && method === 'POST') {
    const { username, password } = await readJson(req);
    if (username && password === 'playwright') return sendJson(res, 200, { token: TOKEN });
    return sendJson(res, 401, { error: 'Invalid credentials' });
  }

  if (pathname === '/api/profile' && method === 'GET') {
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return sendJson(res, 401, { error: 'Unauthorised' });
    return sendJson(res, 200, { name: 'Ada', loyaltyPoints: 42 });
  }

  // Fails with 503 on the first two calls for a given token, then recovers.
  const unstableMatch = pathname.match(/^\/api\/unstable\/([\w-]+)$/);
  if (unstableMatch && method === 'GET') {
    const calls = (unstableCalls.get(unstableMatch[1]) ?? 0) + 1;
    unstableCalls.set(unstableMatch[1], calls);
    if (calls < 3) return sendJson(res, 503, { error: 'Coffee machine is warming up', calls });
    return sendJson(res, 200, { ok: true, calls });
  }

  // Fails until the caller reports it is on its third attempt (attempt=2, zero-based).
  if (pathname === '/api/flaky-by-attempt' && method === 'GET') {
    const attempt = Number(searchParams.get('attempt') ?? 0);
    if (attempt < 2) return sendJson(res, 503, { error: 'Still flaky', attempt });
    return sendJson(res, 200, { ok: true, attempt });
  }

  // A background job: queued -> brewing (after 0.5s) -> done (after 1.2s).
  if (pathname === '/api/jobs' && method === 'POST') {
    const id = nextJobId++;
    jobs.set(id, Date.now());
    return sendJson(res, 202, { id, status: 'queued' });
  }

  const jobMatch = pathname.match(/^\/api\/jobs\/(\d+)$/);
  if (jobMatch && method === 'GET') {
    const id = Number(jobMatch[1]);
    if (!jobs.has(id)) return sendJson(res, 404, { error: `job ${id} not found` });
    const age = Date.now() - jobs.get(id);
    const status = age < 500 ? 'queued' : age < 1200 ? 'brewing' : 'done';
    return sendJson(res, 200, { id, status });
  }

  return sendJson(res, 404, { error: `No route for ${method} ${pathname}` });
}

// ---------- static files ----------

async function handleStatic(res, pathname) {
  if (pathname === '/download/report.csv') {
    res.writeHead(200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="report.csv"',
    });
    return res.end('drink,sold\nEspresso,41\nFlat White,37\nCold Brew,12\n');
  }

  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const filePath = normalize(join(PUBLIC_DIR, relative));
  if (!filePath.startsWith(PUBLIC_DIR.endsWith(sep) ? PUBLIC_DIR : PUBLIC_DIR + sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

// ---------- server ----------

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return await handleStatic(res, url.pathname);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(`Koans Café is open at http://localhost:${PORT}`);
});
