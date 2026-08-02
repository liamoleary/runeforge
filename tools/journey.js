// Full-journey simulator: a bot plays RuneForge from level 1 to the last
// dungeon using the game's own combat, xp and recipe functions, and reports
// how long each stage actually takes.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3111/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('rforge'));
  await page.reload({ waitUntil: 'networkidle' });

  const result = await page.evaluate(() => {
    const R = window.__rf;
    const G = window.G;
    const ROUND_MS = 750;

    // Fresh character.
    Object.assign(G, R.defaultState());
    const bag = {};
    function add(k, n) { bag[k] = (bag[k] || 0) + n; }
    function take(k, n) { if ((bag[k] || 0) < n) return false; bag[k] -= n; return true; }
    function has(cost, mult) {
      for (const k in cost) if ((bag[k] || 0) < cost[k] * (mult || 1)) return false;
      return true;
    }

    let seconds = 0;
    const stages = [];
    const trace = [];

    // ---- gathering -------------------------------------------------
    function bestNode(nodes, skill) {
      let best = null;
      nodes.forEach(n => { if (R.lvl(skill) >= n.req) best = n; });
      return best;
    }
    // Work a specific node until we hold `qty` of its drop.
    function gatherItem(nodes, skill, itemKey, qty) {
      const node = nodes.filter(n => n.drop === itemKey)[0];
      if (!node) return;
      let guard = 0;
      while ((bag[itemKey] || 0) < qty && guard++ < 200000) {
        if (R.lvl(skill) < node.req) { levelSkill(nodes, skill, node.req); continue; }
        R.addXp(skill, node.xp);
        add(itemKey, 1);
        seconds += node.ms / 1000;
      }
    }
    // Grind the best available node until the skill hits `target`.
    function levelSkill(nodes, skill, target) {
      let guard = 0;
      while (R.lvl(skill) < target && guard++ < 200000) {
        const n = bestNode(nodes, skill);
        R.addXp(skill, n.xp);
        add(n.drop, 1);
        seconds += n.ms / 1000;
      }
    }

    // ---- smithing --------------------------------------------------
    function bestSmeltable() {
      let best = null;
      R.METALS.forEach(m => { if (R.lvl('smithing') >= m.smith) best = m; });
      return best;
    }
    function smeltOne(m) {
      for (const k in m.smelt) {
        const need = m.smelt[k];
        if ((bag[k] || 0) < need) {
          gatherItem(R.ROCKS, 'mining', k, need);
          if ((bag[k] || 0) < need) return false;
        }
      }
      for (const k in m.smelt) take(k, m.smelt[k]);
      const rec = R.SMELT_RECIPES.filter(r => r.out === m.bar)[0];
      seconds += R.craftMs(rec) / 1000;      // bench time, scaled by skill
      add(m.bar, 1);
      R.addXp('smithing', m.barXp);
      return true;
    }
    function levelSmithing(target) {
      let guard = 0;
      while (R.lvl('smithing') < target && guard++ < 100000) {
        const m = bestSmeltable();
        if (!smeltOne(m)) break;
      }
    }

    // ---- combat ----------------------------------------------------
    // STALE: this is a one-on-one exchange from before the board existed. It
    // models no host, no enemy minions, no keywords, no boons and no wave
    // ramp, so its win rates and round counts no longer describe the game.
    // Use tools/boon-balance.js for anything combat-related; what is still
    // trustworthy here is the gathering and smithing time either side of it.
    function runDungeon(d) {
      let hp = R.maxHp();
      let rounds = 0;
      for (let wave = 1; wave <= d.waves + 1; wave++) {
        if (wave > 1) hp = Math.min(R.maxHp(), hp + Math.ceil(R.maxHp() * 0.20));
        const base = wave > d.waves ? d.boss : d.monsters[Math.floor(Math.random() * d.monsters.length)];
        let fhp = base.hp;
        while (fhp > 0) {
          rounds++;
          if (rounds > 6000) return { win: false, rounds: rounds, stall: true };
          const dmg = R.rollDamage(R.playerMaxHit(), R.playerAttackRoll(), R.monsterDefenceRoll(base));
          fhp -= dmg;
          R.awardCombatXp(dmg);
          if (fhp <= 0) break;
          hp -= R.rollDamage(base.maxHit, R.monsterAttackRoll(base), R.playerDefenceRoll());
          if (hp <= 0) { seconds += rounds * ROUND_MS / 1000; return { win: false, rounds: rounds }; }
        }
      }
      seconds += rounds * ROUND_MS / 1000;
      return { win: true, rounds: rounds };
    }

    // Non-mutating probe so the bot can decide whether it's ready.
    function probeWinRate(d, trials) {
      const snapshot = JSON.stringify(G.skills);
      let wins = 0, totalSec = 0;
      for (let i = 0; i < trials; i++) {
        const before = seconds;
        const r = runDungeon(d);
        totalSec += seconds - before;
        seconds = before;                       // rewind the clock
        G.skills = JSON.parse(snapshot);        // and the xp, EVERY trial —
        if (r.win) wins++;                      // else the probe trains itself
      }
      return { rate: wins / trials, avgSec: totalSec / trials };
    }

    function equipSet(m) {
      const keys = ['sword', 'platebody', 'shield'].map(k => m.key + '_' + k);
      keys.forEach(key => {
        const g = R.GEAR[key];
        if (!has(g.cost)) return;
        for (const c in g.cost) take(c, g.cost[c]);
        const rec = R.MAKE_RECIPES.filter(r => r.out === key)[0];
        seconds += R.craftMs(rec) / 1000;
        R.addXp('smithing', g.xp);
        G.equipped[g.slot] = key;
      });
      return keys.every(k => G.equipped[R.GEAR[k].slot] === k);
    }

    // Make sure a full set of metal `m` is worn, gathering whatever it takes.
    function forgeSet(m) {
      const t0 = seconds;
      levelSmithing(m.smith);
      const treeReq = R.TREES.filter(t => t.drop === m.logs)[0];
      levelSkill(R.TREES, 'woodcutting', treeReq.req);
      gatherItem(R.TREES, 'woodcutting', m.logs, 2);
      // 10 bars for the three pieces.
      let guard = 0;
      while ((bag[m.bar] || 0) < 10 && guard++ < 100000) { if (!smeltOne(m)) break; }
      const ok = equipSet(m);
      return { ok: ok, sec: seconds - t0 };
    }

    // ---- the journey ------------------------------------------------
    // Bronze starter kit, then each dungeon in turn.
    const starter = forgeSet(R.METALS[0]);
    stages.push({ label: 'Bronze starter kit', sec: starter.sec, ok: starter.ok });

    for (let i = 0; i < R.DUNGEONS.length; i++) {
      const d = R.DUNGEONS[i];
      const t0 = seconds;
      const detail = { label: d.name, gearSec: 0, grindSec: 0, farmRuns: 0 };

      // Gear up to the tier this dungeon expects (bronze is already on).
      if (i > 0) {
        const m = R.METALS[Math.min(i + 1, R.METALS.length - 1)];
        // Reagents come from the dungeon we just cleared.
        const g = forgeSet(m);
        detail.gearSec = g.sec;
        detail.gearTier = m.name;
        if (!g.ok) detail.gearBlocked = true;
      } else {
        detail.gearTier = 'Bronze/Iron';
      }

      // Farm the deepest cleared dungeon until this one looks winnable.
      let probe = probeWinRate(d, 60);
      let guard = 0;
      while (probe.rate < 0.55 && guard++ < 400) {
        const farm = R.DUNGEONS[Math.max(0, i - 1)];
        const before = seconds;
        const r = runDungeon(farm);
        detail.farmRuns++;
        detail.grindSec += seconds - before;
        if (!r.win && i === 0) break;           // nothing weaker to farm
        probe = probeWinRate(d, 60);
      }
      detail.winRate = +(probe.rate * 100).toFixed(0);

      // Real players just walk back in after a wipe.
      let clear = { win: false };
      let attempts = 0;
      while (!clear.win && attempts++ < 30) clear = runDungeon(d);
      detail.cleared = clear.win;
      detail.attempts = attempts;
      // Bank the clear rewards.
      for (const k in d.drops) add(k, d.drops[k][1] * d.waves);
      for (const k in d.clearDrops) add(k, d.clearDrops[k]);

      detail.sec = seconds - t0;
      detail.combat = {
        atk: R.lvl('attack'), str: R.lvl('strength'),
        def: R.lvl('defence'), hp: R.lvl('hitpoints'),
        cb: R.combatLevel(), maxHit: R.playerMaxHit(), life: R.maxHp()
      };
      detail.skills = {
        wc: R.lvl('woodcutting'), mine: R.lvl('mining'), smith: R.lvl('smithing')
      };
      detail.total = R.totalLevel();
      stages.push(detail);
      if (!clear.win) { detail.FAILED = true; break; }
    }

    return { stages: stages, totalMin: +(seconds / 60).toFixed(1), finalTotalLevel: R.totalLevel(), trace: trace };
  });

  console.log('\n═════════ FULL JOURNEY ═════════');
  result.stages.forEach(s => {
    if (s.label === 'Bronze starter kit') {
      console.log(`\n▸ ${s.label}: ${(s.sec / 60).toFixed(1)} min  ${s.ok ? '' : '(INCOMPLETE)'}`);
      return;
    }
    console.log(`\n▸ ${s.label}  [${s.gearTier} gear]${s.FAILED ? '   ***FAILED***' : ''}`);
    console.log(`    gearing up : ${(s.gearSec / 60).toFixed(1)} min${s.gearBlocked ? '  (BLOCKED — missing mats)' : ''}`);
    console.log(`    combat grind: ${(s.grindSec / 60).toFixed(1)} min over ${s.farmRuns} farm runs`);
    console.log(`    stage total : ${(s.sec / 60).toFixed(1)} min`);
    console.log(`    win rate    : ${s.winRate}%   cleared: ${s.cleared} (${s.attempts} attempts)`);
    console.log(`    combat      : cb${s.combat.cb}  atk ${s.combat.atk} str ${s.combat.str} def ${s.combat.def} hp ${s.combat.hp} (${s.combat.life} life, max hit ${s.combat.maxHit})`);
    console.log(`    skills      : wc ${s.skills.wc}  mining ${s.skills.mine}  smithing ${s.skills.smith}   TOTAL ${s.total}`);
  });
  console.log(`\n═════════ TOTAL PLAYTIME: ${result.totalMin} min  ·  final total level ${result.finalTotalLevel} ═════════\n`);
  await browser.close();
})().catch(e => { console.error('SIM ERROR:', e); process.exit(2); });
