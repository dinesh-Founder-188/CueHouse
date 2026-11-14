const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // Parse URL and strip query parameters
  const cleanUrl = decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '') || '/';
  
  // Specific route aliases
  const routeMap = {
    '/': 'index.html',
    '/services': 'services/index.html',
    '/services/marketing-growth': 'services/marketing-growth.html',
    '/services/technology-development': 'services/technology-development.html',
    '/services/creative-production': 'services/creative-production.html',
    '/services/sales-business-development': 'services/sales-business-development.html',
    '/services/influencer-creator-marketing': 'services/influencer-creator-marketing.html',
    '/services/business-support': 'services/business-support.html',
    '/about': 'about.html',
    '/work': 'work.html',
    '/insights': 'insights.html',
    '/enquiry': 'enquiry.html',
    '/discuss-project': 'enquiry.html',
    '/join-professional': 'join-professional.html',
    '/join-creator': 'join-professional.html',
    '/client/login': 'client-login.html',
    '/client-login': 'client-login.html',
    '/professional/login': 'professional-login.html',
    '/professional-login': 'professional-login.html',
    '/privacy': 'privacy.html',
    '/terms': 'terms.html',
    '/support': 'support.html'
  };

  let targetRelative = routeMap[cleanUrl];
  if (!targetRelative) {
    targetRelative = cleanUrl.replace(/^\//, '');
  }

  let filePath = path.join(PUBLIC_DIR, targetRelative);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // 1. Direct file match
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveFile(filePath, res);
  }

  // 2. Direct file match with .html
  if (fs.existsSync(filePath + '.html') && fs.statSync(filePath + '.html').isFile()) {
    return serveFile(filePath + '.html', res);
  }

  // 3. Directory with index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
      return serveFile(indexPath, res);
    }
  }

  // 4. SPA Fallback: serve index.html
  const fallbackIndex = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(fallbackIndex)) {
    return serveFile(fallbackIndex, res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      return res.end('Server Error');
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(content);
  });
}

server.listen(PORT, () => {
  console.log(`Cue House platform running at http://localhost:${PORT}`);
});
