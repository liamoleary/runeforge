// End-to-end UI test: drives the real game through the whole loop.
// Needs a local server (default port 3111) and Playwright.
const { chromium } = require('playwright');
const BASE = process.env.RF_URL || 'http://localhost:3111/';
let fails = 0;
function check(name, cond, extra) {
  if (!cond) fails++;
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${extra !== undefined ? '  → ' + extra : ''}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !/Failed to load resource/.test(t)) errors.push('console: ' + t);
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('rforge'));
  await page.reload({ waitUntil: 'networkidle' });

  console.log('\n== Fresh character ==');
  check('skills tab active by default', await page.isVisible('#screen-skills'));
  check('8 skill tiles', (await page.locator('.skill-tile').count()) === 8);
  check('total level 17', (await page.textContent('#total-level-big')).trim() === '17');
  check('hitpoints starts at 10', await page.evaluate(() => __rf.lvl('hitpoints')) === 10);
  check('starts at full health', await page.evaluate(() => window.G.hp === __rf.maxHp()),
    await page.evaluate(() => `${window.G.hp}/${__rf.maxHp()}`));
  check('5 nav tabs', (await page.locator('.nav-btn').count()) === 5);

  console.log('\n== OSRS xp table ==');
  const xp = await page.evaluate(() => [2, 10, 20, 50, 92, 99].map(l => __rf.xpAtLevel(l)));
  check('level 2 = 83', xp[0] === 83, xp[0]);
  check('level 10 = 1,154', xp[1] === 1154, xp[1]);
  check('level 20 = 4,470', xp[2] === 4470, xp[2]);
  check('level 50 = 101,333', xp[3] === 101333, xp[3]);
  check('level 92 = 6,517,253 (halfway)', xp[4] === 6517253, xp[4]);
  check('level 99 = 13,034,431', xp[5] === 13034431, xp[5]);

  console.log('\n== Top bar shows HP when idle ==');
  check('HP mode by default', !(await page.evaluate(() => document.getElementById('hp-bar').classList.contains('xp-mode'))));
  check('HP label reads HP', (await page.textContent('#hp-label')) === 'HP');
  check('ETA line hidden when idle', !(await page.isVisible('#hp-eta')));

  console.log('\n== Woodcutting: auto-repeat + contextual XP bar ==');
  await page.click('.nav-btn[data-tab="gather"]');
  check('6 trees listed', (await page.locator('#tree-list .node-btn').count()) === 6);
  check('only Tree unlocked at wc 1', (await page.locator('#tree-list .node-btn:not(:disabled)').count()) === 1);
  await page.locator('#tree-list .node-btn').first().click();
  check('active strip appears', await page.isVisible('#gather-active'));

  // The headline feature: the bar slot becomes woodcutting progress.
  check('top bar switched to xp mode',
    await page.evaluate(() => document.getElementById('hp-bar').classList.contains('xp-mode')));
  check('label became the skill icon', (await page.textContent('#hp-label')) === '🪓',
    await page.textContent('#hp-label'));
  const xpText = await page.textContent('#hp-text');
  check('shows xp remaining to next level', /xp → 2$/.test(xpText.trim()), xpText);
  check('ETA line visible', await page.isVisible('#hp-eta'));
  const eta = await page.textContent('#hp-eta');
  check('ETA names the next level and a duration', /to level 2/.test(eta) && /\d+[sm]/.test(eta), eta);

  await page.waitForFunction(() => __rf.have('logs') >= 2, { timeout: 20000 });
  const wc = await page.evaluate(() => ({ logs: __rf.have('logs'), xp: window.G.skills.woodcutting.xp }));
  check('logs accumulate without further taps', wc.logs >= 2, `${wc.logs} logs`);
  check('woodcutting xp granted', wc.xp >= 50, `${wc.xp} xp`);
  const etaShrunk = await page.textContent('#hp-eta');
  check('ETA counts down as xp accrues', etaShrunk !== eta, `${eta} → ${etaShrunk}`);

  await page.click('#ga-stop');
  check('stop halts gathering', !(await page.isVisible('#gather-active')));
  check('top bar returns to HP',
    !(await page.evaluate(() => document.getElementById('hp-bar').classList.contains('xp-mode'))));

  console.log('\n== Level-up FX ==');
  // One xp short of level 5, then earn the last point from a real gather tick.
  await page.evaluate(() => {
    window.G.skills.woodcutting.xp = __rf.xpAtLevel(5) - 1;
    window.render();
  });
  await page.locator('#tree-list .node-btn').first().click();
  await page.waitForSelector('#levelfx.show', { timeout: 20000 });
  const fx = await page.evaluate(() => {
    const h = document.getElementById('levelfx');
    return {
      shown: h.classList.contains('show'),
      title: (h.querySelector('.lf-title') || {}).textContent,
      skill: (h.querySelector('.lf-skill') || {}).textContent,
      level: (h.querySelector('.lf-lvl') || {}).textContent,
      sparks: h.querySelectorAll('.lf-spark').length,
      rays: !!h.querySelector('.lf-rays'),
      burst: !!h.querySelector('.lf-burst')
    };
  });
  check('fanfare overlay shown', fx.shown);
  check('says LEVEL UP', fx.title === 'LEVEL UP', fx.title);
  check('names the skill', fx.skill === 'Woodcutting', fx.skill);
  check('shows the new level', fx.level === '5', fx.level);
  check('sparks emitted', fx.sparks === 14, fx.sparks);
  check('rays and burst present', fx.rays && fx.burst);
  await page.waitForSelector('#levelfx:not(.show)', { timeout: 8000 });
  check('fanfare auto-dismisses', true);
  await page.click('#ga-stop');

  console.log('\n== Timed crafting ==');
  await page.evaluate(() => { __rf.addItem('copper_ore', 60); __rf.addItem('logs', 10); window.render(); });
  await page.click('.nav-btn[data-tab="forge"]');
  const shownMs = await page.evaluate(() => __rf.craftMs(__rf.SMELT_RECIPES[0]));
  check('bronze bar has a bench time', shownMs > 500, `${shownMs}ms`);
  check('recipe row advertises the duration',
    /\d\.\ds/.test(await page.textContent('#smelt-list .recipe')),
    (await page.textContent('#smelt-list .recipe')).replace(/\s+/g, ' ').slice(0, 80));

  const barsBefore = await page.evaluate(() => __rf.have('bronze_bar'));
  await page.locator('#smelt-list .recipe').first().click();
  check('craft strip appears', await page.isVisible('#craft-active'));
  check('nothing produced instantly', (await page.evaluate(() => __rf.have('bronze_bar'))) === barsBefore);
  check('top bar shows smithing progress',
    (await page.textContent('#hp-label')) === '🔨', await page.textContent('#hp-label'));
  await page.waitForFunction(() => __rf.have('bronze_bar') >= 3, { timeout: 30000 });
  check('bars produced over time', (await page.evaluate(() => __rf.have('bronze_bar'))) >= 3);
  check('smelting auto-repeats without extra taps',
    (await page.evaluate(() => __rf.have('copper_ore'))) <= 54);
  check('smithing xp granted', (await page.evaluate(() => window.G.skills.smithing.xp)) >= 120);
  const oreBeforeStop = await page.evaluate(() => __rf.have('copper_ore'));
  await page.click('#ca-stop');
  check('stop halts crafting', !(await page.isVisible('#craft-active')));
  check('materials for the unfinished piece are refunded',
    (await page.evaluate(() => __rf.have('copper_ore'))) === oreBeforeStop + 2,
    `${oreBeforeStop} → ${await page.evaluate(() => __rf.have('copper_ore'))}`);
  const frozenBars = await page.evaluate(() => __rf.have('bronze_bar'));
  await page.waitForTimeout(2500);
  check('nothing accrues after stopping', (await page.evaluate(() => __rf.have('bronze_bar'))) === frozenBars);

  console.log('\n== Higher skill forges faster ==');
  const speed = await page.evaluate(() => {
    const plate = __rf.MAKE_RECIPES.find(r => r.out === 'rune_platebody');
    const sword = __rf.MAKE_RECIPES.find(r => r.out === 'rune_sword');
    __rf.setLevels({ smithing: plate.req });
    const atReq = __rf.craftMs(plate);
    const swordAtReq = __rf.craftMs(sword);
    __rf.setLevels({ smithing: plate.req + 20 });
    const skilled = __rf.craftMs(plate);
    __rf.setLevels({ smithing: 99 });
    const mastered = __rf.craftMs(plate);
    return { atReq, skilled, mastered, swordAtReq };
  });
  check('20 levels above requirement is faster', speed.skilled < speed.atReq,
    `${speed.atReq}ms → ${speed.skilled}ms`);
  check('mastery is faster still', speed.mastered < speed.skilled, `${speed.mastered}ms`);
  check('speed-up is capped, not unbounded', speed.mastered >= speed.atReq * 0.34,
    `${(speed.mastered / speed.atReq).toFixed(2)}× of base`);
  check('platebody takes longer than a sword', speed.atReq > speed.swordAtReq,
    `plate ${speed.atReq}ms vs sword ${speed.swordAtReq}ms`);
  const tiers = await page.evaluate(() => {
    __rf.setLevels({ smithing: 60 });
    return {
      bronze: __rf.craftMs(__rf.MAKE_RECIPES.find(r => r.out === 'bronze_platebody')),
      rune: __rf.craftMs(__rf.MAKE_RECIPES.find(r => r.out === 'rune_platebody'))
    };
  });
  check('better metal takes longer at the same level', tiers.rune > tiers.bronze,
    `bronze ${tiers.bronze}ms vs rune ${tiers.rune}ms`);

  console.log('\n== Forging a real item ==');
  await page.evaluate(() => {
    __rf.setLevels({ smithing: 1, attack: 1, defence: 1, hitpoints: 10 });
    __rf.addItem('bronze_bar', 12); __rf.addItem('logs', 10);
    window.render();
  });
  const clicked = await page.evaluate(() => {
    const sword = Array.from(document.querySelectorAll('#make-list .recipe'))
      .find(b => b.textContent.includes('Bronze Sword'));
    if (!sword || sword.disabled) return false;
    sword.click();
    return true;
  });
  check('bronze sword recipe available', clicked);
  await page.waitForFunction(() => __rf.have('bronze_sword') >= 1, { timeout: 30000 });
  check('sword forged after its bench time', (await page.evaluate(() => __rf.have('bronze_sword'))) >= 1);
  await page.click('#ca-stop').catch(() => {});

  console.log('\n== Equipping ==');
  await page.click('.nav-btn[data-tab="gear"]');
  check('4 equipment slots', (await page.locator('.eq-slot').count()) === 4);
  await page.locator('#inv-list .inv-item.wearable').first().click();
  const eq = await page.evaluate(() => ({ w: window.G.equipped.weapon, atk: __rf.gearBonus('atk') }));
  check('weapon equipped', eq.w === 'bronze_sword', eq.w);
  check('attack bonus applied', eq.atk === 11, eq.atk);

  const blocked = await page.evaluate(() => {
    __rf.addItem('rune_sword', 1);
    window.render();
    const before = window.G.equipped.weapon;
    const rune = Array.from(document.querySelectorAll('#inv-list .inv-item'))
      .find(b => b.textContent.includes('Rune Sword'));
    if (rune) rune.click();
    return { before, after: window.G.equipped.weapon };
  });
  check('cannot wield rune at attack 1', blocked.after === blocked.before);

  console.log('\n== Dungeon run ==');
  await page.click('.nav-btn[data-tab="dungeon"]');
  check('5 dungeons listed', (await page.locator('.dun-card').count()) === 5);
  check('only the first is open', (await page.locator('.dun-card .dc-go').count()) === 1);
  await page.evaluate(() => {
    __rf.setLevels({ attack: 12, strength: 12, defence: 12, hitpoints: 14 });
    window.render();
  });
  await page.locator('.dun-card .dc-go').first().click();
  check('run overlay opens', await page.isVisible('#run-overlay'));
  check('HP bar shown during a run, not xp',
    !(await page.evaluate(() => document.getElementById('hp-bar').classList.contains('xp-mode'))));
  await page.waitForSelector('#screen-results.active', { timeout: 90000 });
  const res = await page.evaluate(() => ({
    title: document.getElementById('result-title').textContent,
    rows: Array.from(document.querySelectorAll('.res-row')).map(r => r.textContent),
    busy: window.G.busy
  }));
  check('results screen shown', res.rows.length > 0, res.title);
  check('busy flag cleared', res.busy === false);
  check('no NaN/undefined in results', !res.rows.some(r => /NaN|undefined/.test(r)), res.rows.join(' | '));
  await page.click('#result-continue');
  check('run overlay closed', !(await page.isVisible('#run-overlay')));

  console.log('\n== Persistence ==');
  await page.evaluate(() => window.save());
  const before = await page.evaluate(() => ({
    total: __rf.totalLevel(), weapon: window.G.equipped.weapon, cleared: window.G.dungeonsCleared
  }));
  await page.reload({ waitUntil: 'networkidle' });
  const after = await page.evaluate(() => ({
    total: __rf.totalLevel(), weapon: window.G.equipped.weapon, cleared: window.G.dungeonsCleared
  }));
  check('levels survive reload', after.total === before.total, `${before.total} → ${after.total}`);
  check('equipment survives reload', after.weapon === before.weapon);
  check('dungeon progress survives reload', after.cleared === before.cleared);

  console.log('\n== v1 saves are not resurrected ==');
  await page.evaluate(() => localStorage.setItem('rforge',
    JSON.stringify({ hero: 'pebble', level: 40, gold: 999 })));
  await page.reload({ waitUntil: 'networkidle' });
  check('old-format save ignored', (await page.evaluate(() => __rf.totalLevel())) === 17);

  console.log('\n== Errors ==');
  check('no uncaught JS errors', errors.length === 0, errors.slice(0, 4).join(' | '));

  await browser.close();
  console.log(`\n${fails === 0 ? 'ALL CHECKS PASSED' : fails + ' CHECK(S) FAILED'}`);
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
