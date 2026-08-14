import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid PORT: ${process.env.PORT}`);

const html = await readFile(join(root, 'index.html'));
const securityHeaders = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'",
};

const server = createServer((request, response) => {
  const method = request.method || 'GET';
  if (!['GET', 'HEAD'].includes(method)) {
    response.writeHead(405, { ...securityHeaders, allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' });
    response.end('Method not allowed');
    return;
  }

  const path = (request.url || '/').split('?', 1)[0];
  if (!['/', '/index.html'].includes(path)) {
    response.writeHead(404, { ...securityHeaders, 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    ...securityHeaders,
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': html.length,
  });
  response.end(method === 'HEAD' ? undefined : html);
});

server.headersTimeout = 10_000;
server.requestTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.listen(port, '0.0.0.0', () => console.log(`QR Code Studio: http://localhost:${port}`));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
