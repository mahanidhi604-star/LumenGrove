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

app.use(express.json());

const _paySessions = new Map();

app.post('/api/pay/approve', (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  _paySessions.set(sessionId, { status: 'APPROVED', time: Date.now() });
  console.log(`[API] Payment approved for session ${sessionId}`);
  return res.json({ success: true, sessionId, status: 'APPROVED' });
});

app.get('/api/pay/status/:id', (req, res) => {
  const session = _paySessions.get(req.params.id);
  if (session) return res.json(session);
  return res.json({ status: 'PENDING' });
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
