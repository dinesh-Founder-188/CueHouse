const https = require('https');
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
  fs.readFileSync(path.join(__dirname, 'home', 'index.html'));
  fs.readFileSync(path.join(__dirname, 'work', 'index.html'));
  fs.readFileSync(path.join(__dirname, 'about', 'index.html'));
  fs.readFileSync(path.join(__dirname, 'services', 'index.html'));
  fs.readFileSync(path.join(__dirname, 'enquiry.html'));
  fs.readFileSync(path.join(__dirname, 'join-professional.html'));
  fs.readFileSync(path.join(__dirname, 'client-login.html'));
  fs.readFileSync(path.join(__dirname, 'professional-login.html'));
  fs.readFileSync(path.join(__dirname, 'privacy.html'));
  fs.readFileSync(path.join(__dirname, 'terms.html'));
  fs.readFileSync(path.join(__dirname, 'support.html'));
  fs.readFileSync(path.join(__dirname, 'insights.html'));

  // Directory triggers for NFT tracer
  path.join(__dirname, 'home');
  path.join(__dirname, 'work');
  path.join(__dirname, 'about');
  path.join(__dirname, 'services');
  path.join(__dirname, 'build');
  path.join(__dirname, 'build', 'assets');
  path.join(__dirname, 'assets');
  path.join(__dirname, '3d');
  path.join(__dirname, 'fonts');
  path.join(__dirname, 'patterns');
  path.join(__dirname, 'avatars');
  path.join(__dirname, 'images');
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
  '/': 'home/index.html',
  '/home': 'home/index.html',
  '/services': 'services/index.html',
  '/service': 'services/index.html',
  '/services/marketing-growth': 'services/marketing-growth.html',
  '/services/technology-development': 'services/technology-development.html',
  '/services/creative-production': 'services/creative-production.html',
  '/services/sales-business-development': 'services/sales-business-development.html',
  '/services/influencer-creator-marketing': 'services/influencer-creator-marketing.html',
  '/services/business-support': 'services/business-support.html',
  '/about': 'about/index.html',
  '/about-us': 'about/index.html',
  '/work': 'work/index.html',
  '/insights': 'insights.html',
  '/enquiry': 'enquiry.html',
  '/discuss-project': 'enquiry.html',
  '/join': 'join-professional.html',
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
  console.log("REQ:", req.method, req.url);

  // Parse URL and strip query parameters
  const rawPath = req.url.split('?')[0];
  const cleanUrl = decodeURIComponent(rawPath).replace(/\/$/, '') || '/';

  let targetRelative = routeMap[cleanUrl];
  if (!targetRelative) {
    targetRelative = cleanUrl.replace(/^\//, '');
  }

  // 1. Direct file match or html alias (check local disk first)
  const directMatch = resolveFile(targetRelative) || resolveFile(targetRelative + '.html');
  if (directMatch) {
    return serveFile(directMatch, res);
  }

  // Proxy Red Dot Tours assets if not on local disk
  if (req.url.startsWith('/build/') || req.url.startsWith('/js/deferred-videos') || req.url.startsWith('/js/site-footer') || req.url.startsWith('/js/chat-typing') || req.url.startsWith('/js/red-dot-chat') || req.url.startsWith('/css/red-dot-chat')) {
    const targetHost = 'www.reddottours.com';
    const proxyReq = https.request({
      hostname: targetHost,
      port: 443,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetHost,
        referer: 'https://www.reddottours.com/'
      }
    }, (proxyRes) => {
      const headers = { ...proxyRes.headers, 'access-control-allow-origin': '*' };
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      res.writeHead(502);
      res.end('Proxy Error');
    });
    req.pipe(proxyReq);
    return;
  }
  // Proxy Next.js chunks, media files, and SweetTape assets
  if (req.url.startsWith('/_next/') || req.url.startsWith('/api/media/') || req.url.startsWith('/assets/mask-') || req.url.startsWith('/assets/tape-') || req.url.startsWith('/assets/opp-') || req.url.startsWith('/assets/preloader-') || req.url.startsWith('/assets/doodle-') || req.url.startsWith('/assets/box-') || req.url.startsWith('/assets/hand-') || req.url.startsWith('/assets/cta-') || req.url.startsWith('/assets/footer-') || req.url.startsWith('/assets/about/') || req.url.startsWith('/assets/low-noise') || req.url.startsWith('/assets/uncrumpled') || req.url.startsWith('/assets/double-') || req.url.startsWith('/assets/full-of-heart') || req.url.startsWith('/assets/front-cta') || req.url.startsWith('/assets/cta-bg')) {
    const targetHost = 'sweet-tape.com';
    const proxyReq = https.request({
      hostname: targetHost,
      port: 443,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetHost,
        referer: 'https://sweet-tape.com/'
      }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      res.writeHead(502);
      res.end('Proxy Error');
    });
    req.pipe(proxyReq);
    return;
  }

  // 2. Directory with index.html
  const indexInDir = resolveFile(path.join(targetRelative, 'index.html'));
  if (indexInDir) {
    return serveFile(indexInDir, res);
  }

  // 3. SPA Fallback: serve home/index.html or index.html
  const fallbackIndex = resolveFile('home/index.html') || resolveFile('index.html');
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
    const cacheControl = 'no-cache, no-store, must-revalidate';

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
