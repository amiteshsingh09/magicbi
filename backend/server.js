const http = require('http');
const fs = require('fs');
const path = require('path');
const { aggregate } = require('./data');

const root = path.resolve(__dirname, '../frontend');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/aggregate') {
    const measure = url.searchParams.get('measure') || 'revenue';
    const groupBy = url.searchParams.get('groupBy') || 'region';
    if (!['revenue', 'orders'].includes(measure) || !['region', 'category'].includes(groupBy)) {
      res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Unsupported measure or groupBy' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify(aggregate(measure, groupBy)));
  }
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.join(root, requested);
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(fs.readFileSync(file));
});

const port = process.env.PORT || 3000;
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing process or run with a different port, for example: $env:PORT=3001; npm start`);
    process.exitCode = 1;
    return;
  }
  throw error;
});
server.listen(port, () => console.log(`MagicBI Explorer running on http://localhost:${port}`));
