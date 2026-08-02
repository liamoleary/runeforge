// Diagnoses a delve that never resolves: runs one dungeon with the board on
// auto and samples wave, round and board size as it goes, so a stall shows up
// as a shape (which wave, how many bodies, whose health is not moving) rather
// than a timeout.
const { chromium } = require('playwright');
const BASE = process.env.RF_URL || 'http://localhost:3111/';
const KEY = process.env.DUNGEON || 'abyss';
const SECONDS = +(process.env.SECONDS || 30);
const STRAT = process.env.STRAT || 'random';
const DIFF = +(process.env.DIFF || 1);

const TARGETS = {
  warren: { dungeon: 0, combat: 5,  hp: 10, metal: 'bronze' },
  crypt:  { dungeon: 1, combat: 14, hp: 12, metal: 'steel' },
  spire:  { dungeon: 2, combat: 24, hp: 18, metal: 'mithril' },
  roost:  { dungeon: 3, combat: 34, hp: 25, metal: 'adamant' },
  abyss:  { dungeon: 4, combat: 44, hp: 33, metal: 'rune' }
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGE ERROR:', String(e)));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('rforge'));
  await page.reload({ waitUntil: 'networkidle' });

  const out = await page.evaluate(async ({ t, SECONDS, STRAT, DIFF }) => {
    const R = window.__rf, G = window.G;
    R.setPace(0);
    R.setDifficulty(DIFF);
    R.setAutoFight(true);
    R.setAutoBind((forms) => Math.floor(Math.random() * forms.length));
    R.setAutoBoon(STRAT === 'none' ? () => -1
      : (choices) => Math.floor(Math.random() * choices.length));

    R.setLevels({ attack: t.combat, strength: t.combat, defence: t.combat, hitpoints: t.hp });
    R.setGear(['sword', 'platebody', 'shield'].map(k => t.metal + '_' + k));
    G.dungeonsCleared = 4;
    G.busy = false;
    G.hp = R.maxHp();

    const started = Date.now();
    R.enterDungeon(t.dungeon);
    const samples = [];
    return await new Promise((resolve) => {
      const poll = setInterval(() => {
        if (!R.isInRun()) {
          clearInterval(poll);
          const title = document.getElementById('result-title');
          return resolve({ ended: true, win: /CLEARED/.test(title.textContent),
                           ms: Date.now() - started, samples });
        }
        const b = R.board(), i = R.runInfo();
        samples.push({
          ms: Date.now() - started,
          wave: i.wave, runLevel: i.runLevel,
          hp: G.hp, maxHp: R.maxHp(),
          phase: b.phase, round: b.round,
          waveScale: b.waveScale,
          foes: b.foes.filter(f => f.hp > 0).length,
          foeHp: b.foes.filter(f => f.hp > 0).reduce((s, f) => s + f.hp, 0),
          foeMax: b.foes.filter(f => f.hp > 0).reduce((s, f) => s + f.max, 0),
          minions: b.foes.filter(f => f.hp > 0 && f.minion).length,
          summoned: b.summoned,
          host: b.allies.length,
          hostDmg: b.allies.reduce((s, u) => s + u.dmg, 0),
          boons: Object.keys(i.boons).map(k => k + i.boons[k]).join(' ')
        });
        if (Date.now() - started > SECONDS * 1000) {
          clearInterval(poll);
          resolve({ ended: false, stalled: true, ms: Date.now() - started, samples,
                    finalBoard: R.board(), finalInfo: R.runInfo() });
        }
      }, 100);
    });
  }, { t: TARGETS[KEY], SECONDS, STRAT, DIFF });

  console.log(`\n${KEY} — ${out.ended ? (out.win ? 'CLEARED' : 'DIED') : 'STALLED'} after ${out.ms}ms, ${out.samples.length} samples\n`);
  const s = out.samples;
  const every = Math.max(1, Math.floor(s.length / 25));
  console.log('  ms   wave lvl  phase     rnd  hp/max   foes(min) foeHp/max  host hostDmg  scale');
  s.filter((_, i) => i % every === 0).forEach(x => {
    console.log(
      String(x.ms).padStart(6) + '  ' +
      String(x.wave).padStart(3) + ' ' + String(x.runLevel).padStart(3) + '  ' +
      String(x.phase).padEnd(9) + ' ' + String(x.round).padStart(3) + '  ' +
      (x.hp + '/' + x.maxHp).padStart(8) + '  ' +
      (x.foes + '(' + x.minions + ')').padStart(8) + ' ' +
      (x.foeHp + '/' + x.foeMax).padStart(11) + '  ' +
      String(x.host).padStart(4) + String(x.hostDmg).padStart(8) + '  ' +
      String(x.waveScale).padStart(6));
  });
  if (out.stalled) {
    console.log('\nFINAL BOARD');
    console.log('  boons:', JSON.stringify(out.finalInfo.boons));
    console.log('  phase:', out.finalBoard.phase, 'round:', out.finalBoard.round,
                'auto:', out.finalBoard.auto);
    console.log('  foes:');
    out.finalBoard.foes.forEach(f => console.log('   ', f.name, f.hp + '/' + f.max,
      (f.keys || []).join(',') , f.minion ? '(minion)' : '', f.boss ? '(BOSS)' : ''));
    console.log('  allies:');
    out.finalBoard.allies.forEach(u => console.log('   ', u.form || u.tier,
      u.hp + '/' + u.max, 'dmg ' + u.dmg, (u.keys || []).join(',')));
    const last = s[s.length - 1], mid = s[Math.floor(s.length / 2)];
    console.log(`\n  wave over second half: ${mid.wave} -> ${last.wave}`);
    console.log(`  foe hp over second half: ${mid.foeHp} -> ${last.foeHp}`);
    console.log(`  player hp over second half: ${mid.hp} -> ${last.hp}`);
  }
  await browser.close();
})();
