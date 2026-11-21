// build.js - Prepares public directory for Vercel deployment
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy asset directories
['css', 'js', 'vendor'].forEach(dir => {
  const src = path.join(rootDir, dir);
  const dest = path.join(publicDir, dir);
  if (fs.existsSync(src)) copyDirSync(src, dest);
});

// Copy asset files
['rvce_map.jpg'].forEach(file => {
  const src = path.join(rootDir, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, dest);
});

// Copy HTML (both Index.html and index.html for Linux case-sensitivity)
const indexSrc = path.join(rootDir, 'Index.html');
if (fs.existsSync(indexSrc)) {
  fs.copyFileSync(indexSrc, path.join(publicDir, 'Index.html'));
  fs.copyFileSync(indexSrc, path.join(publicDir, 'index.html'));
}

console.log('✓ Successfully synced static assets into public/ directory for Vercel');
