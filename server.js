const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const BLOCKED_PREFIXES = [
  '/server.js',
  '/package.json',
  '/package-lock.json',
  '/vercel.json',
  '/node_modules',
  '/supabase',
  '/scratch',
  '/.git',
  '/.env'
];

app.use((req, res, next) => {
  const reqPath = req.path.toLowerCase();
  if (BLOCKED_PREFIXES.some((prefix) => reqPath === prefix || reqPath.startsWith(prefix + '/'))) {
    return res.status(404).send('Not Found');
  }
  next();
});

app.use(
  express.static(__dirname, {
    index: 'Index.html',
    extensions: ['html']
  })
);

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(__dirname, 'Index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`LumenGrove server listening on http://${HOST}:${PORT}`);
});
