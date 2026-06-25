import { createServer } from 'http';
import { readFileSync, readdirSync, statSync, existsSync, createReadStream } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 40102;
const DIST = join(__dirname, 'dist');
const LIBRARY = process.env.LIBRARY_DIR || join(__dirname, 'public', 'library');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.epub': 'application/epub+zip',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const ALLOWED = new Set(['.pdf', '.epub']);

// Block private/loopback IPs to prevent SSRF
function isPrivateHost(hostname) {
  if (!hostname) return true;
  // IPv6 loopback
  if (hostname === '::1' || hostname === '[::1]' || hostname === '0:0:0:0:0:0:0:1') return true;
  // IPv4 loopback / private ranges
  const parts = hostname.split('.').map(Number);
  if (parts.length === 4 && parts.every(n => !isNaN(n))) {
    if (parts[0] === 127 || parts[0] === 0) return true;                // loopback
    if (parts[0] === 10) return true;                                     // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true;                // 192.168.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true;               // link-local
  }
  // Block common local names
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === 'metadata.google.internal') return true;
  return false;
}

// Proxy fetch: bypass browser CORS restrictions
async function proxyFetch(targetUrl, clientRes) {
  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      clientRes.writeHead(upstream.status, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ error: `Upstream HTTP ${upstream.status}` }));
      return;
    }

    const headers = {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    };
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers['Content-Length'] = contentLength;

    clientRes.writeHead(200, headers);

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        clientRes.write(value);
      }
      clientRes.end();
    };
    await pump();
  } catch (err) {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
    }
    clientRes.end(JSON.stringify({ error: err.message }));
  }
}

function scanFiles(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...scanFiles(full).map(f => ({ ...f, name: `${name}/${f.name}` })));
    } else if (ALLOWED.has(extname(name).toLowerCase())) {
      files.push({ name, size: stat.size });
    }
  }
  return files;
}

const handler = (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // API: file list
  if (pathname === '/api/files') {
    const files = scanFiles(LIBRARY);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...SECURITY_HEADERS });
    res.end(JSON.stringify(files));
    return;
  }

  // API: proxy fetch to bypass CORS
  if (pathname === '/api/proxy') {
    const target = url.searchParams.get('url');
    if (!target) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
      res.end(JSON.stringify({ error: 'Missing url parameter' }));
      return;
    }
    // Validate URL protocol and block SSRF
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
      res.end(JSON.stringify({ error: 'Invalid URL' }));
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      res.writeHead(403, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
      res.end(JSON.stringify({ error: 'Only http/https URLs allowed' }));
      return;
    }
    if (isPrivateHost(parsed.hostname)) {
      res.writeHead(403, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
      res.end(JSON.stringify({ error: 'Access to private/internal addresses is blocked' }));
      return;
    }
    return proxyFetch(target, res);
  }

  // Serve library files
  if (pathname.startsWith('/library/')) {
    const filePath = join(LIBRARY, pathname.slice(9));
    // Prevent path traversal: resolved path must stay within LIBRARY
    if (!filePath.startsWith(LIBRARY)) {
      res.writeHead(403, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = extname(filePath).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, ...SECURITY_HEADERS });
      createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Serve static files from dist
  let filePath = join(DIST, pathname === '/' ? 'index.html' : pathname);
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(DIST, 'index.html');
  }

  const ext = extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, ...SECURITY_HEADERS });
  createReadStream(filePath).pipe(res);
};

// Dual-stack: listen on :: handles both IPv4 and IPv6
createServer(handler).listen(PORT, '::', () => {
  console.log(`Reader server running at http://[::]:${PORT} (dual-stack)`);
  console.log(`Library directory: ${LIBRARY}`);
});
