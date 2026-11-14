const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Static AST triggers for @vercel/nft to bundle all files and directories into the serverless deployment
if (false) {
  fs.readFileSync(path.join(__dirname, 'Logo.svg'));
  fs.readFileSync(path.join(__dirname, 'Fav.svg'));
  fs.readFileSync(path.join(__dirname, 'Fav.png'));
  fs.readFileSync(path.join(__dirname, 'OG.png'));
  fs.readFileSync(path.join(__dirname, 'accept-phone.webp'));
  fs.readFileSync(path.join(__dirname, 'arrow.svg'));
  fs.readFileSync(path.join(__dirname, 'guild-crest.svg'));
  fs.readFileSync(path.join(__dirname, 'grail-mark.svg'));
  fs.readFileSync(path.join(__dirname, 'loader-mark.svg'));
  fs.readFileSync(path.join(__dirname, 'handshake.jpg'));
  fs.readFileSync(path.join(__dirname, 'icons.svg'));
  fs.readFileSync(path.join(__dirname, 'favicon.svg'));
  fs.readFileSync(path.join(__dirname, 'robots.txt'));
  fs.readFileSync(path.join(__dirname, 'sitemap.xml'));
  fs.readFileSync(path.join(__dirname, 'index.html'));
  fs.readFileSync(path.join(__dirname, 'about.html'));
  fs.readFileSync(path.join(__dirname, 'enquiry.html'));
  fs.readFileSync(path.join(__dirname, 'join-professional.html'));
  fs.readFileSync(path.join(__dirname, 'client-login.html'));
  fs.readFileSync(path.join(__dirname, 'professional-login.html'));
  fs.readFileSync(path.join(__dirname, 'privacy.html'));
  fs.readFileSync(path.join(__dirname, 'terms.html'));
  fs.readFileSync(path.join(__dirname, 'support.html'));
  fs.readFileSync(path.join(__dirname, 'work.html'));
  fs.readFileSync(path.join(__dirname, 'insights.html'));

  // Directory triggers for NFT tracer
  path.join(__dirname, 'assets');
  path.join(__dirname, '3d');
  path.join(__dirname, 'fonts');
  path.join(__dirname, 'patterns');
  path.join(__dirname, 'avatars');
  path.join(__dirname, 'images');
  path.join(__dirname, 'services');
  path.join(__dirname, 'story');
  path.join(__dirname, 'mobile');
}

function getPublicDir() {
  const candidates = [
    process.cwd(),
    __dirname,
    process.env.LAMBDA_TASK_ROOT,
    path.join(__dirname, '..')
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(path.join(c, 'index.html'))) {
      return c;
    }
  }
  return process.cwd();
}

const PUBLIC_DIR = getPublicDir();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

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

function resolveFile(targetRelative) {
  const searchRoots = [PUBLIC_DIR, process.cwd(), __dirname, process.env.LAMBDA_TASK_ROOT].filter(Boolean);
  for (const root of searchRoots) {
    const candidate = path.join(root, targetRelative);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function requestHandler(req, res) {
  // Parse URL and strip query parameters
  const rawPath = req.url.split('?')[0];
  const cleanUrl = decodeURIComponent(rawPath).replace(/\/$/, '') || '/';

  let targetRelative = routeMap[cleanUrl];
  if (!targetRelative) {
    targetRelative = cleanUrl.replace(/^\//, '');
  }

  // 1. Direct file match or html alias
  const directMatch = resolveFile(targetRelative) || resolveFile(targetRelative + '.html');
  if (directMatch) {
    return serveFile(directMatch, res);
  }

  // 2. Directory with index.html
  const indexInDir = resolveFile(path.join(targetRelative, 'index.html'));
  if (indexInDir) {
    return serveFile(indexInDir, res);
  }

  // 3. SPA Fallback: serve index.html
  const fallbackIndex = resolveFile('index.html');
  if (fallbackIndex) {
    return serveFile(fallbackIndex, res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      return res.end('Server Error');
    }

    const relPath = filePath.replace(/\\/g, '/');
    const isImmutable = /\/(assets|3d|fonts)\//i.test(relPath);
    const cacheControl = isImmutable
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, no-store, must-revalidate';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(content);
  });
}

// Start standalone server if executed directly
if (require.main === module) {
  const localServer = http.createServer(requestHandler);
  localServer.listen(PORT, () => {
    console.log(`Cue House platform running at http://localhost:${PORT}`);
  });
}

// Export handler for Vercel Serverless Function
module.exports = requestHandler;
