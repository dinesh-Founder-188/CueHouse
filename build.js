const fs = require('fs');
const path = require('path');

console.log('--- Cue House Vercel Build Starting ---');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy directories
const dirsToCopy = ['3d', 'assets', 'avatars', 'fonts', 'images', 'mobile', 'patterns', 'services', 'story'];
dirsToCopy.forEach(dir => {
  const src = path.join(__dirname, dir);
  const dest = path.join(distDir, dir);
  if (fs.existsSync(src)) {
    copyRecursiveSync(src, dest);
    console.log(`Copied directory: ${dir}`);
  }
});

// Copy root files
const files = fs.readdirSync(__dirname);
files.forEach(file => {
  if (file === 'dist' || file === 'node_modules' || file === '.git' || file === 'pinterest_raw') return;
  const src = path.join(__dirname, file);
  if (fs.statSync(src).isFile()) {
    fs.copyFileSync(src, path.join(distDir, file));
  }
});

console.log('--- Cue House Vercel Build Complete: dist/ populated successfully ---');
