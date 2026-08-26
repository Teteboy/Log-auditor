import { createServer } from 'node:http';
import { stat, readdir, readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, basename, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 3000;
const LOG_ROOT = process.env.LOG_ROOT ? resolve(process.env.LOG_ROOT) : '/';
const PUBLIC_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist', 'public');

const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const sendJson = (res, status, data) => {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const allowed = (target) => {
  const normalized = resolve(target);
  const rel = relative(LOG_ROOT, normalized);
  return !rel.startsWith('..') && !isAbsolute(rel);
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204).end();
    return;
  }

  if (pathname === '/api/list') {
    const requested = url.searchParams.get('path') || '';
    if (!requested) return sendJson(res, 400, { error: 'Path is required' });
    const target = resolve(LOG_ROOT, requested);
    if (!allowed(target)) return sendJson(res, 403, { error: 'Outside allowed root' });
    try {
      const s = await stat(target);
      const files = [];
      if (s.isDirectory()) {
        const entries = await readdir(target, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          const p = `${target}/${entry.name}`.replace(/\\/g, '/');
          const st = await stat(p);
          files.push({ name: entry.name, path: p, size: st.size, mtime: st.mtimeMs });
        }
      } else if (s.isFile()) {
        files.push({ name: basename(target), path: target.replace(/\\/g, '/'), size: s.size, mtime: s.mtimeMs });
      } else {
        return sendJson(res, 404, { error: 'Not a file or directory' });
      }
      sendJson(res, 200, files);
      return;
    } catch (err) {
      if (err.code === 'ENOENT') return sendJson(res, 404, { error: 'Path not found' });
      if (err.code === 'EACCES' || err.code === 'EPERM') return sendJson(res, 403, { error: 'Permission denied' });
      console.error(err);
      return sendJson(res, 500, { error: 'Server error' });
    }
  }

  if (pathname === '/api/file') {
    const requested = url.searchParams.get('path') || '';
    if (!requested) return sendJson(res, 400, { error: 'Path is required' });
    const target = resolve(LOG_ROOT, requested);
    if (!allowed(target)) return sendJson(res, 403, { error: 'Outside allowed root' });
    try {
      const s = await stat(target);
      if (!s.isFile()) return sendJson(res, 404, { error: 'Not a file' });
      setCors(res);
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': String(s.size),
        'X-Last-Modified': String(s.mtimeMs),
      });
      const stream = createReadStream(target);
      stream.on('error', (err) => {
        console.error(err);
        if (!res.writableEnded) res.end();
      });
      stream.pipe(res);
      return;
    } catch (err) {
      if (err.code === 'ENOENT') return sendJson(res, 404, { error: 'File not found' });
      if (err.code === 'EACCES' || err.code === 'EPERM') return sendJson(res, 403, { error: 'Permission denied' });
      console.error(err);
      return sendJson(res, 500, { error: 'Server error' });
    }
  }

  if (pathname.startsWith('/api/')) {
    res.writeHead(404).end('Not found');
    return;
  }

  try {
    const filePath = resolve(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname.slice(1));
    const s = await stat(filePath);
    if (s.isFile()) {
      res.writeHead(200);
      createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404).end('Not found');
    }
    return;
  } catch {
    try {
      const html = await readFile(resolve(PUBLIC_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch {
      res.writeHead(404).end('No build found. Run pnpm build first.');
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Log server listening on http://0.0.0.0:${PORT} (LOG_ROOT=${LOG_ROOT})`);
});
