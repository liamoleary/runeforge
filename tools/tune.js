// Solves for dungeon monster stats.
//
// For each dungeon we fix the player state we WANT them to arrive with, then:
//   1. pick monster defence so the player's hit chance lands on target
//   2. pick monster hp so a kill takes the target number of rounds
//   3. binary-search monster attack/max-hit so the run wins ~65% of the time
// Output is a ready-to-paste monster table.
const { chromium } = require('playwright');

// The player we expect at each dungeon door.
const TARGETS = [
  { dungeon: 'warren', combat: 5,  hp: 10, metal: 'bronze',  trashRounds: 7,  bossRounds: 16, winRate: 0.72 },
  { dungeon: 'crypt',  combat: 14, hp: 12, metal: 'steel',   trashRounds: 9,  bossRounds: 22, winRate: 0.68 },
  { dungeon: 'spire',  combat: 24, hp: 18, metal: 'mithril', trashRounds: 10, bossRounds: 26, winRate: 0.65 },
  { dungeon: 'roost',  combat: 34, hp: 25, metal: 'adamant', trashRounds: 11, bossRounds: 30, winRate: 0.62 },
  { dungeon: 'abyss',  combat: 44, hp: 33, metal: 'rune',    trashRounds: 12, bossRounds: 34, winRate: 0.58 }
];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3111/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('rforge'));
  await page.reload({ waitUntil: 'networkidle' });

  const out = await page.evaluate((TARGETS) => {
    const R = window.__rf;
    const G = window.G;
    const results = [];

    function setPlayer(t) {
      R.setLevels({ attack: t.combat, strength: t.combat, defence: t.combat, hitpoints: t.hp });
      R.setGear(['sword', 'platebody', 'shield'].map(k => t.metal + '_' + k));
    }

    // Monster defence that yields a given player hit chance.
    function defForHitChance(target) {
      const att = R.playerAttackRoll();
      // hit = 1 - (defRoll+2)/(2*(att+1))  →  defRoll = (1-hit)*2*(att+1) - 2
      const defRoll = (1 - target) * 2 * (att + 1) - 2;
      return Math.max(1, Math.round(defRoll / 64 - 8));
    }
    // Monster attack level that yields a given chance to hit the player.
    function atkForHitChance(target) {
      const pdef = R.playerDefenceRoll();
      const attRoll = target * 2 * (pdef + 1);
      return Math.max(1, Math.round(attRoll / 64 - 8));
    }

    function simulate(d, trials) {
      let wins = 0, roundsTotal = 0;
      for (let i = 0; i < trials; i++) {
        let hp = R.maxHp(), rounds = 0, dead = false;
        for (let wave = 1; wave <= d.waves + 1 && !dead; wave++) {
          if (wave > 1) hp = Math.min(R.maxHp(), hp + Math.ceil(R.maxHp() * 0.20));
          const base = wave > d.waves ? d.boss : d.monsters[Math.floor(Math.random() * d.monsters.length)];
          let fhp = base.hp;
          while (fhp > 0) {
            rounds++;
            if (rounds > 4000) { dead = true; break; }
            fhp -= R.rollDamage(R.playerMaxHit(), R.playerAttackRoll(), R.monsterDefenceRoll(base));
            if (fhp <= 0) break;
            hp -= R.rollDamage(base.maxHit, R.monsterAttackRoll(base), R.playerDefenceRoll());
            if (hp <= 0) { dead = true; break; }
          }
        }
        if (!dead) wins++;
        roundsTotal += rounds;
      }
      return { rate: wins / trials, rounds: Math.round(roundsTotal / trials) };
    }

    TARGETS.forEach(t => {
      const d = R.DUNGEONS.filter(x => x.key === t.dungeon)[0];
      setPlayer(t);

      // 1. Defence → hit chance. Trash is easier to hit than the boss.
      const trashDef = defForHitChance(0.78);
      const bossDef = defForHitChance(0.68);

      // 2. HP → rounds to kill. Expected damage per round at that hit chance.
      const maxHit = R.playerMaxHit();
      const trashDps = 0.78 * (maxHit / 2);
      const bossDps = 0.68 * (maxHit / 2);
      // Two trash types: one lighter, one heavier around the average.
      const trashHp = trashDps * t.trashRounds;
      const bossHp = bossDps * t.bossRounds;

      const proto = {
        waves: d.waves,
        monsters: [
          { name: d.monsters[0].name, icon: d.monsters[0].icon, hp: Math.round(trashHp * 0.85), def: trashDef, atk: 1, maxHit: 1 },
          { name: d.monsters[1].name, icon: d.monsters[1].icon, hp: Math.round(trashHp * 1.15), def: Math.round(trashDef * 1.12), atk: 1, maxHit: 1 }
        ],
        boss: { name: d.boss.name, icon: d.boss.icon, hp: Math.round(bossHp), def: bossDef, atk: 1, maxHit: 1 }
      };

      // 3. Binary search a threat scalar until the win rate matches target.
      // The scalar drives both accuracy (atk) and damage (maxHit).
      let lo = 0.02, hi = 1.2, best = null;
      for (let iter = 0; iter < 22; iter++) {
        const mid = (lo + hi) / 2;
        const trashAtk = atkForHitChance(Math.min(0.85, mid * 0.55));
        const bossAtk = atkForHitChance(Math.min(0.9, mid * 0.7));
        // Max hit scaled off the player's life so it stays proportionate.
        const trashHit = Math.max(1, Math.round(R.maxHp() * mid * 0.16));
        const bossHit = Math.max(2, Math.round(R.maxHp() * mid * 0.26));
        proto.monsters[0].atk = trashAtk; proto.monsters[0].maxHit = trashHit;
        proto.monsters[1].atk = Math.round(trashAtk * 1.1); proto.monsters[1].maxHit = Math.round(trashHit * 1.2);
        proto.boss.atk = bossAtk; proto.boss.maxHit = bossHit;

        const sim = simulate(proto, 260);
        best = { scalar: mid, rate: sim.rate, rounds: sim.rounds, proto: JSON.parse(JSON.stringify(proto)) };
        if (sim.rate > t.winRate) lo = mid; else hi = mid;
      }

      const verify = simulate(best.proto, 900);
      results.push({
        key: t.dungeon,
        target: t,
        player: { maxHit: R.playerMaxHit(), life: R.maxHp(), cb: R.combatLevel(),
                  atkB: R.gearBonus('atk'), strB: R.gearBonus('str'), defB: R.gearBonus('def') },
        proto: best.proto,
        rate: +(verify.rate * 100).toFixed(1),
        rounds: verify.rounds,
        minutes: +((verify.rounds * 0.75) / 60).toFixed(1)
      });
    });
    return results;
  }, TARGETS);

  console.log('\n════════ TUNED MONSTER TABLE ════════');
  out.forEach(r => {
    console.log(`\n── ${r.key}  (player cb${r.player.cb}, ${r.player.life} life, max hit ${r.player.maxHit}, gear +${r.player.atkB}/${r.player.strB}/${r.player.defB})`);
    console.log(`   win rate ${r.rate}%  ·  ${r.rounds} rounds  ·  ~${r.minutes} min per run`);
    r.proto.monsters.forEach(m => {
      console.log(`      { name: '${m.name}', icon: '${m.icon}', hp: ${m.hp}, atk: ${m.atk}, def: ${m.def}, maxHit: ${m.maxHit} },`);
    });
    const b = r.proto.boss;
    console.log(`      boss: { name: '${b.name}', icon: '${b.icon}', hp: ${b.hp}, atk: ${b.atk}, def: ${b.def}, maxHit: ${b.maxHit} },`);
  });
  console.log('');
  await browser.close();
})().catch(e => { console.error('TUNER ERROR:', e); process.exit(2); });
