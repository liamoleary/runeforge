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
app.use(session({ store: new SQLiteStore({ db: 'sessions.db', dir: dbDir }), secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'), resave: false, saveUninitialized: false, cookie: { secure: false, httpOnly: true, maxAge: 30*24*60*60*1000, sameSite: 'lax' }, proxy: true }));
function requireAuth(req, res, next) { if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' }); next(); }
app.post('/api/register', (req, res) => { const { username, password } = req.body; if (!username || !password) return res.status(400).json({ error: 'Username and password required' }); if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username must be 3-20 characters' }); if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' }); if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username: letters, numbers, underscores only' }); try { const hash = bcrypt.hashSync(password, 10); const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)'); const result = stmt.run(username.toLowerCase(), hash); req.session.userId = result.lastInsertRowid; req.session.username = username.toLowerCase(); res.json({ success: true, username: username.toLowerCase() }); } catch (e) { if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already taken' }); res.status(500).json({ error: 'Server error' }); } });
app.post('/api/login', (req, res) => { const { username, password } = req.body; if (!username || !password) return res.status(400).json({ error: 'Username and password required' }); const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase()); if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid username or password' }); req.session.userId = user.id; req.session.username = user.username; res.json({ success: true, username: user.username }); });
app.post('/api/logout', (req, res) => { req.session.destroy(() => { res.json({ success: true }); }); });
app.get('/api/me', (req, res) => { if (!req.session.userId) return res.json({ loggedIn: false }); res.json({ loggedIn: true, username: req.session.username }); });
app.post('/api/save', requireAuth, (req, res) => { const { saveData } = req.body; if (!saveData) return res.status(400).json({ error: 'No save data' }); const existing = db.prepare('SELECT id FROM saves WHERE user_id = ?').get(req.session.userId); if (existing) { db.prepare('UPDATE saves SET save_data = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(JSON.stringify(saveData), req.session.userId); } else { db.prepare('INSERT INTO saves (user_id, save_data) VALUES (?, ?)').run(req.session.userId, JSON.stringify(saveData)); } res.json({ success: true }); });
app.get('/api/save', requireAuth, (req, res) => { const save = db.prepare('SELECT save_data, updated_at FROM saves WHERE user_id = ?').get(req.session.userId); if (!save) return res.json({ hasSave: false }); res.json({ hasSave: true, saveData: JSON.parse(save.save_data), updatedAt: save.updated_at }); });

app.post('/api/reset', requireAuth, (req, res) => {
  db.prepare('DELETE FROM saves WHERE user_id = ?').run(req.session.userId);
  res.json({ success: true, message: 'Progress reset' });
});

app.get('/auth.js', (req, res) => { res.sendFile(path.join(__dirname, 'auth.js')); });
app.get('/dungeon.js', (req, res) => { res.sendFile(path.join(__dirname, 'dungeon.js')); });
app.get('/manifest.json', (req, res) => { res.sendFile(path.join(__dirname, 'manifest.json')); });
app.get('/sw.js', (req, res) => { res.setHeader('Content-Type', 'application/javascript'); res.sendFile(path.join(__dirname, 'sw.js')); });
function generateIconSVG(size) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size*0.15}" fill="#13100a"/><rect x="${size*0.05}" y="${size*0.05}" width="${size*0.9}" height="${size*0.9}" rx="${size*0.1}" fill="#1a1510" stroke="#f0c040" stroke-width="${size*0.02}"/><text x="${size*0.5}" y="${size*0.42}" font-family="serif" font-weight="bold" font-size="${size*0.22}" fill="#f0c040" text-anchor="middle">RUNE</text><text x="${size*0.5}" y="${size*0.68}" font-family="serif" font-weight="bold" font-size="${size*0.22}" fill="#c0392b" text-anchor="middle">FORGE</text></svg>`; }
app.get('/icon-192.png', (req, res) => { res.setHeader('Content-Type', 'image/svg+xml'); res.send(generateIconSVG(192)); });
app.get('/icon-512.png', (req, res) => { res.setHeader('Content-Type', 'image/svg+xml'); res.send(generateIconSVG(512)); });
app.get('/', (req, res) => {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const mobileCss = `<style>#hdr{display:flex;align-items:center;gap:8px;padding:6px 10px !important;flex-wrap:nowrap}#logo{display:none !important}#auth-ui{display:flex;align-items:center;gap:6px;flex-shrink:0}#auth-ui button{font-size:11px !important;padding:3px 8px !important}#hdr-right{margin-left:auto;flex-shrink:0}#tabs .tab-icon{display:none !important}#tabs{overflow-x:auto !important;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-wrap:nowrap !important}#tabs::-webkit-scrollbar{display:none}#tabs>div,#tabs>button{flex-shrink:0 !important;min-width:48px;font-size:11px !important;padding:5px 6px !important}@media(max-width:600px){body{font-size:13px}.panel{padding:8px !important;margin:4px !important}#skills-grid{gap:4px !important}#skills-grid>div{padding:6px !important;font-size:11px !important}.action-card{padding:8px !important;font-size:12px !important}#char,#inv,#shop{padding:8px !important}}</style>`;
    const fixScript = `<script>(function(){if(typeof buildSkills==='function'){var _orig=buildSkills;buildSkills=function(){var g=document.getElementById('skills-grid');if(g)g.innerHTML='';return _orig.apply(this,arguments);};}})();<\/script>`;
    const pwaHead = '<link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#13100a"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><link rel="apple-touch-icon" href="/icon-192.png"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">';
    html = html.replace('</head>', mobileCss + pwaHead + '</head>');
    const scripts = fixScript + `<script src="/auth.js"><\/script><script src="/dungeon.js"><\/script><script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js');}<\/script>`;
    html = html.replace('</body>', scripts + '</body>');
    res.type('html').send(html);
});
app.listen(PORT, '0.0.0.0', () => { console.log(`RuneForge server running on port ${PORT}`); });
