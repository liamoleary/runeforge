// Re-tunes dungeon difficulty now that in-run boons exist.
//
// Boons are the expected baseline in a roguelite, so the content has to assume
// you build. For each dungeon this binary-searches a monster scalar until a
// MIDDLING build (random picks) wins about as often as we want, then reports
// what a no-build run and a deepen-one-line run do at that same difficulty.
//
// `deepen` is a heuristic, not optimal play — in dungeons where breadth beats
// depth it loses to random, and that's the design working. The number that
// matters is no-build vs any-build: that gap is what the choices are worth.
//
// It drives the real combatRound() with pacing at zero, so the numbers can't
// drift from the shipped logic.
const { chromium } = require('playwright');
const BASE = process.env.RF_URL || 'http://localhost:3111/';

const TARGET_RANDOM_WINRATE = +(process.env.TARGET || 0.60);
const TRIALS = +(process.env.TRIALS || 40);
const SEARCH_TRIALS = +(process.env.SEARCH_TRIALS || 24);

const TARGETS = [
  { dungeon: 0, key: 'warren', combat: 5,  hp: 10, metal: 'bronze' },
  { dungeon: 1, key: 'crypt',  combat: 14, hp: 12, metal: 'steel' },
  { dungeon: 2, key: 'spire',  combat: 24, hp: 18, metal: 'mithril' },
  { dungeon: 3, key: 'roost',  combat: 34, hp: 25, metal: 'adamant' },
  { dungeon: 4, key: 'abyss',  combat: 44, hp: 33, metal: 'rune' }
];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGE ERROR:', String(e)));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('rforge'));
  await page.reload({ waitUntil: 'networkidle' });

  const results = await page.evaluate(async (cfg) => {
    const R = window.__rf, G = window.G;
    R.setPace(0);
    R.setAutoFight(true);   // the board plays its own orders

    const strat = {
      none:   () => -1,
      random: (c) => Math.floor(Math.random() * c.length),
      greedy: (c) => { let b = 0, t = -1; c.forEach((x, i) => { if (x.tier > t) { t = x.tier; b = i; } }); return b; }
    };

    function setup(t) {
      R.setLevels({ attack: t.combat, strength: t.combat, defence: t.combat, hitpoints: t.hp });
      R.setGear(['sword', 'platebody', 'shield'].map(k => t.metal + '_' + k));
      G.dungeonsCleared = 4; G.busy = false; G.hp = R.maxHp();
    }

    function runOnce(index) {
      return new Promise((resolve) => {
        const t0 = Date.now();
        R.enterDungeon(index);
        if (!R.isInRun()) return resolve(false);
        const poll = setInterval(() => {
          if (!R.isInRun()) {
            clearInterval(poll);
            const won = /CLEARED/.test(document.getElementById('result-title').textContent);
            document.getElementById('result-continue').click();
            resolve(won);
          } else if (Date.now() - t0 > 8000) {
            clearInterval(poll); resolve(false);
          }
        }, 0);
      });
    }

    async function winRate(t, stratName, n) {
      R.setAutoBoon(strat[stratName]);
      let wins = 0;
      for (let i = 0; i < n; i++) { setup(t); if (await runOnce(t.dungeon)) wins++; }
      return wins / n;
    }

    const out = [];
    for (const t of cfg.TARGETS) {
      // Binary search the scalar that puts a random build on target.
      let lo = 1.0, hi = 3.0, best = 1.0;
      for (let iter = 0; iter < 7; iter++) {
        const mid = (lo + hi) / 2;
        R.setDifficulty(mid);
        const rate = await winRate(t, 'random', cfg.SEARCH_TRIALS);
        best = mid;
        if (rate > cfg.TARGET_RANDOM_WINRATE) lo = mid; else hi = mid;
      }
      const scale = (lo + hi) / 2;
      R.setDifficulty(scale);
      const none = await winRate(t, 'none', cfg.TRIALS);
      const random = await winRate(t, 'random', cfg.TRIALS);
      const greedy = await winRate(t, 'greedy', cfg.TRIALS);
      out.push({ key: t.key, scale: +scale.toFixed(3), none, random, greedy });
    }
    R.setAutoBoon(null); R.setDifficulty(1); R.setPace(1);
    return out;
  }, { TARGET_RANDOM_WINRATE, TRIALS, SEARCH_TRIALS, TARGETS });

  console.log(`\n══════ CALIBRATION (target: random build wins ${(TARGET_RANDOM_WINRATE * 100).toFixed(0)}%) ══════\n`);
  console.log('dungeon     scalar   no build   random   deepen       build spread');
  console.log('──────────────────────────────────────────────────────────────────');
  results.forEach(r => {
    const pct = (x) => (x * 100).toFixed(0) + '%';
    const spread = ((r.greedy - r.none) * 100).toFixed(0);
    console.log(
      r.key.padEnd(12) + String(r.scale).padEnd(9) +
      pct(r.none).padEnd(11) + pct(r.random).padEnd(9) +
      pct(r.greedy).padEnd(13) + '+' + spread + 'pt'
    );
  });
  console.log('\nApply with:  node tools/apply-scalars.js ' +
    results.map(r => `${r.key}=${r.scale}`).join(' '));
  console.log('');
  await browser.close();
})().catch(e => { console.error('CALIBRATE ERROR:', e); process.exit(2); });
