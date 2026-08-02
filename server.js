const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const dbDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || (process.env.RAILWAY_ENVIRONMENT ? '/tmp' : __dirname);
const db = new Database(path.join(dbDir, 'runeforge.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS saves (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, save_data TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id));
    `);

app.use(express.json({ limit: '1mb' }));
app.set('trust proxy', 1);

// Railway (and any other managed host) terminates TLS in front of us, so the
// cookie can be Secure there. Locally we serve plain HTTP, where a Secure
// cookie would simply never come back. SECURE_COOKIES forces the issue either way.
const secureCookies = process.env.SECURE_COOKIES
  ? process.env.SECURE_COOKIES === 'true'
  : !!(process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production');
if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is unset — sessions will not survive a restart.');
}
app.use(session({ store: new SQLiteStore({ db: 'sessions.db', dir: dbDir }), secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'), resave: false, saveUninitialized: false, cookie: { secure: secureCookies, httpOnly: true, maxAge: 30*24*60*60*1000, sameSite: 'lax' }, proxy: true }));
function requireAuth(req, res, next) { if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' }); next(); }

// Password hashing is deliberately slow, so unlimited attempts are both a
// credential-stuffing hole and a way to pin the event loop. Fixed window per IP.
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 12;
const authAttempts = new Map();
function rateLimitAuth(req, res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const entry = authAttempts.get(key);
  if (!entry || now - entry.start > AUTH_WINDOW_MS) {
    authAttempts.set(key, { start: now, count: 1 });
    return next();
  }
  entry.count += 1;
  if (entry.count > AUTH_MAX_ATTEMPTS) {
    const retryIn = Math.ceil((AUTH_WINDOW_MS - (now - entry.start)) / 1000);
    res.setHeader('Retry-After', String(retryIn));
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  }
  next();
}
// Drop expired buckets so the map can't grow without bound.
setInterval(() => {
  const cutoff = Date.now() - AUTH_WINDOW_MS;
  for (const [key, entry] of authAttempts) {
    if (entry.start < cutoff) authAttempts.delete(key);
  }
}, AUTH_WINDOW_MS).unref();

app.post('/api/register', rateLimitAuth, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username must be 3-20 characters' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (password.length > 200) return res.status(400).json({ error: 'Password too long' });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username: letters, numbers, underscores only' });

  const name = username.toLowerCase();
  // Async hashing — bcryptjs is pure JS, so the sync variant blocks every
  // other request for the duration.
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    try {
      const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(name, hash);
      req.session.userId = result.lastInsertRowid;
      req.session.username = name;
      res.json({ success: true, username: name });
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already taken' });
      res.status(500).json({ error: 'Server error' });
    }
  });
});

app.post('/api/login', rateLimitAuth, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  bcrypt.compare(password, user.password, (err, ok) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ success: true, username: user.username });
  });
});
app.post('/api/logout', (req, res) => { req.session.destroy(() => { res.json({ success: true }); }); });
app.get('/api/me', (req, res) => { if (!req.session.userId) return res.json({ loggedIn: false }); res.json({ loggedIn: true, username: req.session.username }); });
app.post('/api/save', requireAuth, (req, res) => { const { saveData } = req.body; if (!saveData) return res.status(400).json({ error: 'No save data' }); const existing = db.prepare('SELECT id FROM saves WHERE user_id = ?').get(req.session.userId); if (existing) { db.prepare('UPDATE saves SET save_data = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(JSON.stringify(saveData), req.session.userId); } else { db.prepare('INSERT INTO saves (user_id, save_data) VALUES (?, ?)').run(req.session.userId, JSON.stringify(saveData)); } res.json({ success: true }); });
app.get('/api/save', requireAuth, (req, res) => { const save = db.prepare('SELECT save_data, updated_at FROM saves WHERE user_id = ?').get(req.session.userId); if (!save) return res.json({ hasSave: false }); res.json({ hasSave: true, saveData: JSON.parse(save.save_data), updatedAt: save.updated_at }); });

app.post('/api/admin-reset', (req, res) => {
  const expected = process.env.ADMIN_RESET_SECRET;
  if (!expected) return res.status(503).json({ error: 'Admin reset disabled. Set ADMIN_RESET_SECRET to enable.' });
  const { username, secret } = req.body;
  if (!secret || secret !== expected) return res.status(403).json({ error: 'Forbidden' });
  if (!username) return res.status(400).json({ error: 'Username required' });
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM saves WHERE user_id = ?').run(user.id);
  res.json({ success: true, message: 'Progress reset for ' + username });
});

app.get('/auth.js', (req, res) => { res.sendFile(path.join(__dirname, 'auth.js')); });
app.get('/game.js', (req, res) => { res.sendFile(path.join(__dirname, 'game.js')); });
app.get('/manifest.json', (req, res) => { res.sendFile(path.join(__dirname, 'manifest.json')); });
app.get('/sw.js', (req, res) => { res.setHeader('Content-Type', 'application/javascript'); res.sendFile(path.join(__dirname, 'sw.js')); });
function generateIconSVG(size) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size*0.15}" fill="#13100a"/><rect x="${size*0.05}" y="${size*0.05}" width="${size*0.9}" height="${size*0.9}" rx="${size*0.1}" fill="#1a1510" stroke="#f0c040" stroke-width="${size*0.02}"/><text x="${size*0.5}" y="${size*0.42}" font-family="serif" font-weight="bold" font-size="${size*0.22}" fill="#f0c040" text-anchor="middle">RUNE</text><text x="${size*0.5}" y="${size*0.68}" font-family="serif" font-weight="bold" font-size="${size*0.22}" fill="#c0392b" text-anchor="middle">FORGE</text></svg>`; }
app.get('/icon-192.png', (req, res) => { res.setHeader('Content-Type', 'image/svg+xml'); res.send(generateIconSVG(192)); });
app.get('/icon-512.png', (req, res) => { res.setHeader('Content-Type', 'image/svg+xml'); res.send(generateIconSVG(512)); });
// A content hash per asset, so a deploy can never be answered from a stale
// browser cache — the URL itself changes when the file does.
function assetVersion(file) {
  try {
    return crypto.createHash('sha1')
      .update(fs.readFileSync(path.join(__dirname, file)))
      .digest('hex').slice(0, 8);
  } catch (e) { return 'dev'; }
}

function buildPage() {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const gv = assetVersion('game.js'), av = assetVersion('auth.js');
    const pwaHead = '<link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#13100a"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><link rel="apple-touch-icon" href="/icon-192.png">';
    html = html.replace('</head>', pwaHead + '</head>');
    const scripts = `<script>window.RF_BUILD=${JSON.stringify(gv)};<\/script>` +
      `<script src="/game.js?v=${gv}"><\/script><script src="/auth.js?v=${av}"><\/script>` +
      `<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js');}<\/script>`;
    return html.replace('</body>', scripts + '</body>');
}
// Assemble once in production; re-read every request in dev so edits show up
// without a restart.
const cachePage = !!(process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production');
let pageCache = null;
app.get('/', (req, res) => {
    if (!cachePage || !pageCache) pageCache = buildPage();
    res.type('html').send(pageCache);
});
app.listen(PORT, '0.0.0.0', () => { console.log(`RuneForge server running on port ${PORT}`); });
