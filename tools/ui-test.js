// End-to-end UI test: drives the real game through the whole loop.
const { chromium } = require('playwright');
const BASE = 'http://localhost:3111/';
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
  check('total level 17', (await page.textContent('#total-level-big')).trim() === '17',
    await page.textContent('#total-level-big'));
  check('hitpoints starts at 10', await page.evaluate(() => __rf.lvl('hitpoints')) === 10);
  check('life is 30', await page.evaluate(() => __rf.maxHp()) === 30);
  check('5 nav tabs', (await page.locator('.nav-btn').count()) === 5);

  console.log('\n== OSRS xp table ==');
  const xp = await page.evaluate(() => [2, 10, 20, 50, 92, 99].map(l => __rf.xpAtLevel(l)));
  check('level 2 = 83 xp', xp[0] === 83, xp[0]);
  check('level 10 = 1,154 xp', xp[1] === 1154, xp[1]);
  check('level 20 = 4,470 xp', xp[2] === 4470, xp[2]);
  check('level 50 = 101,333 xp', xp[3] === 101333, xp[3]);
  check('level 92 = 6,517,253 xp (half of 99)', xp[4] === 6517253, xp[4]);
  check('level 99 = 13,034,431 xp', xp[5] === 13034431, xp[5]);

  console.log('\n== Woodcutting auto-repeat ==');
  await page.click('.nav-btn[data-tab="gather"]');
  check('gather tab shown', await page.isVisible('#screen-gather'));
  check('6 trees listed', (await page.locator('#tree-list .node-btn').count()) === 6);
  check('only Tree unlocked at wc 1',
    (await page.locator('#tree-list .node-btn:not(:disabled)').count()) === 1);
  await page.locator('#tree-list .node-btn').first().click();
  check('active strip appears', await page.isVisible('#gather-active'));
  await page.waitForFunction(() => __rf.have('logs') >= 2, { timeout: 20000 });
  const wc = await page.evaluate(() => ({ logs: __rf.have('logs'), xp: window.G.skills.woodcutting.xp }));
  check('logs accumulating without further taps', wc.logs >= 2, `${wc.logs} logs`);
  check('woodcutting xp granted', wc.xp >= 50, `${wc.xp} xp`);
  await page.click('#ga-stop');
  check('stop halts gathering', !(await page.isVisible('#gather-active')));
  const frozen = await page.evaluate(() => __rf.have('logs'));
  await page.waitForTimeout(3500);
  check('nothing accrues after stopping', (await page.evaluate(() => __rf.have('logs'))) === frozen);

  console.log('\n== Mining + level unlock ==');
  await page.evaluate(() => { __rf.addXp('mining', __rf.xpAtLevel(10)); window.render(); });
  const unlocked = await page.locator('#rock-list .node-btn:not(:disabled)').count();
  check('iron rock unlocks at mining 10', unlocked === 2, `${unlocked} rocks available`);

  console.log('\n== Smelting & smithing ==');
  await page.evaluate(() => { __rf.addItem('copper_ore', 40); __rf.addItem('logs', 10); window.render(); });
  await page.click('.nav-btn[data-tab="forge"]');
  check('forge tab shown', await page.isVisible('#screen-forge'));
  const smeltBtn = page.locator('#smelt-list .recipe').first();
  check('bronze bar recipe enabled with ore', !(await smeltBtn.isDisabled()));
  await smeltBtn.click();
  check('bar produced', (await page.evaluate(() => __rf.have('bronze_bar'))) === 1);
  check('ore consumed', (await page.evaluate(() => __rf.have('copper_ore'))) === 38);
  check('smithing xp granted', (await page.evaluate(() => window.G.skills.smithing.xp)) === 40);

  // Smith a full bronze set.
  await page.evaluate(async () => {
    for (let i = 0; i < 12; i++) {
      const b = document.querySelectorAll('#smelt-list .recipe')[0];
      if (!b.disabled) b.click();
    }
  });
  check('12 bars smelted', (await page.evaluate(() => __rf.have('bronze_bar'))) >= 10,
    await page.evaluate(() => __rf.have('bronze_bar')));

  const madeSword = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('#make-list .recipe'));
    const sword = btns.find(b => b.textContent.includes('Bronze Sword'));
    if (!sword || sword.disabled) return 'not available';
    sword.click();
    return __rf.have('bronze_sword');
  });
  check('bronze sword forged', madeSword === 1, madeSword);

  console.log('\n== Equipping ==');
  await page.click('.nav-btn[data-tab="gear"]');
  check('4 equipment slots', (await page.locator('.eq-slot').count()) === 4);
  await page.locator('#inv-list .inv-item.wearable').first().click();
  const eq = await page.evaluate(() => ({ w: window.G.equipped.weapon, atk: __rf.gearBonus('atk'), hit: __rf.playerMaxHit() }));
  check('weapon equipped', eq.w === 'bronze_sword', eq.w);
  check('attack bonus applied', eq.atk === 11, eq.atk);
  check('max hit reflects gear', eq.hit >= 2, eq.hit);
  check('bonus row updated', (await page.textContent('#bonus-atk')) === '+11', await page.textContent('#bonus-atk'));

  console.log('\n== Wear requirements are enforced ==');
  const blocked = await page.evaluate(() => {
    __rf.addItem('rune_sword', 1);
    window.render();
    const before = window.G.equipped.weapon;
    const btns = Array.from(document.querySelectorAll('#inv-list .inv-item'));
    const rune = btns.find(b => b.textContent.includes('Rune Sword'));
    if (rune) rune.click();
    return { before: before, after: window.G.equipped.weapon };
  });
  check('cannot wield rune at attack 1', blocked.after === blocked.before, JSON.stringify(blocked));

  console.log('\n== Dungeon run ==');
  await page.click('.nav-btn[data-tab="dungeon"]');
  check('5 dungeons listed', (await page.locator('.dun-card').count()) === 5);
  check('only the first is open', (await page.locator('.dun-card .dc-go').count()) === 1);
  // Give the character a fair shot so the test isn't a coin flip.
  await page.evaluate(() => {
    __rf.setLevels({ attack: 12, strength: 12, defence: 12, hitpoints: 14 });
    window.render();
  });
  await page.locator('.dun-card .dc-go').first().click();
  check('run overlay opens', await page.isVisible('#run-overlay'));
  check('nav hidden during a run', !(await page.isVisible('#nav')));
  await page.waitForSelector('#screen-results.active', { timeout: 90000 });
  const res = await page.evaluate(() => ({
    title: document.getElementById('result-title').textContent,
    rows: Array.from(document.querySelectorAll('.res-row')).map(r => r.textContent),
    cleared: window.G.dungeonsCleared,
    busy: window.G.busy
  }));
  check('results screen shown', res.rows.length > 0, res.title);
  check('busy flag cleared', res.busy === false);
  check('combat xp awarded', res.rows.some(r => /Attack|Strength/.test(r)), res.rows[0]);
  check('no NaN/undefined in results', !res.rows.some(r => /NaN|undefined/.test(r)), res.rows.join(' | '));
  if (res.title.includes('CLEARED')) {
    check('clearing unlocks the next dungeon', res.cleared === 1, res.cleared);
    check('reagent for steel dropped', (await page.evaluate(() => __rf.have('ember_core'))) > 0,
      await page.evaluate(() => __rf.have('ember_core')));
  } else {
    console.log('  (note: run was lost — rerolling not needed, death path exercised)');
    check('death leaves progress intact', res.cleared === 0);
  }
  await page.click('#result-continue');
  check('continue returns to dungeon list', await page.isVisible('#screen-dungeon'));
  check('run overlay closed', !(await page.isVisible('#run-overlay')));

  console.log('\n== Persistence ==');
  await page.evaluate(() => window.save());
  const before = await page.evaluate(() => ({
    total: __rf.totalLevel(), weapon: window.G.equipped.weapon,
    logs: __rf.have('logs'), cleared: window.G.dungeonsCleared
  }));
  await page.reload({ waitUntil: 'networkidle' });
  const after = await page.evaluate(() => ({
    total: __rf.totalLevel(), weapon: window.G.equipped.weapon,
    logs: __rf.have('logs'), cleared: window.G.dungeonsCleared
  }));
  check('levels survive reload', after.total === before.total, `${before.total} → ${after.total}`);
  check('equipment survives reload', after.weapon === before.weapon, after.weapon);
  check('inventory survives reload', after.logs === before.logs, `${before.logs} → ${after.logs}`);
  check('dungeon progress survives reload', after.cleared === before.cleared);

  console.log('\n== v1 saves are not resurrected ==');
  const v1 = await page.evaluate(() => {
    localStorage.setItem('rforge', JSON.stringify({ hero: 'pebble', level: 40, gold: 999, weapon: {} }));
    return true;
  });
  await page.reload({ waitUntil: 'networkidle' });
  const afterV1 = await page.evaluate(() => ({ total: __rf.totalLevel(), hasHero: 'hero' in window.G }));
  check('old-format save ignored, fresh start', afterV1.total === 17, `total ${afterV1.total}`);

  console.log('\n== Errors ==');
  check('no uncaught JS errors', errors.length === 0, errors.slice(0, 4).join(' | '));

  await page.screenshot({ path: __dirname + '/rf-skills.png' });
  await page.click('.nav-btn[data-tab="gather"]');
  await page.screenshot({ path: __dirname + '/rf-gather.png' });

  await browser.close();
  console.log(`\n${fails === 0 ? 'ALL CHECKS PASSED' : fails + ' CHECK(S) FAILED'}`);
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
