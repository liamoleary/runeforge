// Measures what the in-run boon system does to dungeon difficulty.
//
// Unlike tune.js/journey.js, this drives the REAL combat path — the same
// combatRound() the player runs — with pacing scaled to zero. That keeps the
// measurement honest as boon logic changes, instead of re-implementing it.
const { chromium } = require('playwright');
const BASE = process.env.RF_URL || 'http://localhost:3111/';

// The player state each dungeon expects at its door (mirrors tools/tune.js).
const TARGETS = [
  { dungeon: 0, key: 'warren', combat: 5,  hp: 10, metal: 'bronze' },
  { dungeon: 1, key: 'crypt',  combat: 14, hp: 12, metal: 'steel' },
  { dungeon: 2, key: 'spire',  combat: 24, hp: 18, metal: 'mithril' },
  { dungeon: 3, key: 'roost',  combat: 34, hp: 25, metal: 'adamant' },
  { dungeon: 4, key: 'abyss',  combat: 44, hp: 33, metal: 'rune' }
];

const STRATEGIES = (process.env.STRATS || 'none,random,greedy').split(',');
const TRIALS = +(process.env.TRIALS || 60);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGE ERROR:', String(e)));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('rforge'));
  await page.reload({ waitUntil: 'networkidle' });

  const results = await page.evaluate(async ({ TARGETS, STRATEGIES, TRIALS }) => {
    const R = window.__rf;
    const G = window.G;
    R.setPace(0);
    R.setAutoFight(true);   // the board plays its own orders
    R.setAutoBind((forms) => Math.floor(Math.random() * forms.length));

    function setup(t) {
      R.setLevels({ attack: t.combat, strength: t.combat, defence: t.combat, hitpoints: t.hp });
      R.setGear(['sword', 'platebody', 'shield'].map(k => t.metal + '_' + k));
      G.dungeonsCleared = 4;
      G.busy = false;
      G.hp = R.maxHp();
    }

    // Strategy: which offered boon to take.
    function strategyFn(name) {
      if (name === 'none') return () => -1;   // decline every level
      if (name === 'random') return (choices) => Math.floor(Math.random() * choices.length);
      // A spoils offer has no tree line to reason about — take the first.
      const isMinor = (c) => !!c.minor;
      // necro: commit to the Necromancy path wherever it is on offer.
      if (name === 'necro') return (choices) => {
        if (choices.every(isMinor)) return 0;
        let best = -1, bestScore = -1;
        choices.forEach((c, i) => {
          if (isMinor(c)) return;
          const line = window.__rf.BOON_LINES[c.key];
          // Root first, then branches, then anything else.
          const score = line.faction === 'necromancy'
            ? (line.root ? 100 - c.tier : 50 + c.tier)
            : c.tier;
          if (score > bestScore) { bestScore = score; best = i; }
        });
        return best < 0 ? 0 : best;
      };
      // greedy: always deepen the line you're furthest along in
      return (choices) => {
        if (choices.every(isMinor)) return 0;
        let best = 0, bestTier = -1;
        choices.forEach((c, i) => {
          if (isMinor(c)) return;
          if (c.tier > bestTier) { bestTier = c.tier; best = i; }
        });
        return best;
      };
    }

    // Run one dungeon to completion and report the outcome.
    function runOnce(index) {
      return new Promise((resolve) => {
        const started = Date.now();
        R.enterDungeon(index);
        if (!R.isInRun()) return resolve({ win: false, blocked: true });
        const poll = setInterval(() => {
          if (!R.isInRun()) {
            clearInterval(poll);
            const title = document.getElementById('result-title');
            resolve({ win: /CLEARED/.test(title.textContent) });
          } else if (Date.now() - started > 25000) {
            clearInterval(poll);
            resolve({ win: false, stalled: true });
          }
        }, 0);
      });
    }

    const out = [];
    for (const t of TARGETS) {
      const row = { key: t.key, byStrategy: {} };
      for (const strat of STRATEGIES) {
        R.setAutoBoon(strategyFn(strat));
        let wins = 0, stalls = 0;
        const builds = {};
        for (let i = 0; i < TRIALS; i++) {
          setup(t);
          const r = await runOnce(t.dungeon);
          if (r.win) wins++;
          if (r.stalled) stalls++;
          // Record what the run built, from the results screen state.
          const rows = Array.from(document.querySelectorAll('.res-row'))
            .map(e => e.textContent);
          const b = rows.find(x => x.startsWith('Delve build'));
          if (b) {
            const m = b.replace('Delve build', '').trim();
            builds[m] = (builds[m] || 0) + 1;
          }
          document.getElementById('result-continue').click();
        }
        row.byStrategy[strat] = {
          rate: +(wins / TRIALS * 100).toFixed(1),
          stalls: stalls,
          topBuild: Object.entries(builds).sort((a, b) => b[1] - a[1])[0] || null
        };
      }
      out.push(row);
    }
    R.setAutoBoon(null);
    R.setPace(1);
    return out;
  }, { TARGETS, STRATEGIES, TRIALS });

  console.log(`\n══════ BOON IMPACT (${TRIALS} runs each) ══════\n`);
  const head = 'dungeon'.padEnd(11) + STRATEGIES.map(x => x.padEnd(10)).join('');
  console.log(head + (STRATEGIES.length > 1 ? 'swing' : ''));
  console.log('─'.repeat(head.length + 8));
  results.forEach(r => {
    const cells = STRATEGIES.map(st => String(r.byStrategy[st].rate + '%').padEnd(10)).join('');
    const first = r.byStrategy[STRATEGIES[0]].rate;
    const last = r.byStrategy[STRATEGIES[STRATEGIES.length - 1]].rate;
    const swing = (last - first).toFixed(1);
    console.log(r.key.padEnd(11) + cells +
      (STRATEGIES.length > 1 ? `${swing > 0 ? '+' : ''}${swing}pt` : ''));
    const stalls = Object.values(r.byStrategy).reduce((s, v) => s + v.stalls, 0);
    if (stalls) console.log(`           ⚠ ${stalls} stalled runs`);
  });
  const deep = STRATEGIES[STRATEGIES.length - 1];
  console.log(`\nMost common ${deep} build:`);
  results.forEach(r => {
    const t = r.byStrategy[deep].topBuild;
    if (t) console.log(`  ${r.key.padEnd(10)} ${t[0].replace(/\s+/g, ' ').slice(0, 62)}  (${t[1]}×)`);
  });
  console.log('');
  await browser.close();
})().catch(e => { console.error('SIM ERROR:', e); process.exit(2); });
