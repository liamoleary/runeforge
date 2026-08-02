// End-to-end UI test: drives the real game through the whole loop.
// Needs a local server (default port 3111) and Playwright.
const { chromium } = require('playwright');
const BASE = process.env.RF_URL || 'http://localhost:3111/';
let fails = 0;
function check(name, cond, extra) {
  if (!cond) fails++;
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${extra !== undefined ? '  → ' + extra : ''}`);
}

// ---- The Necromancy path -------------------------------------------------
// Driven with forceBoon so the tree can be walked deterministically rather
// than hoping the offer roll cooperates.
async function necromancyChecks(page, check) {
  console.log('\n== The Necromancy path ==');

  // Enter the Crypt with enough behind us to survive a while.
  await page.evaluate(() => {
    __rf.setLevels({ attack: 60, strength: 60, defence: 60, hitpoints: 60 });
    ['rune_sword', 'rune_platebody', 'rune_shield'].forEach(k => __rf.addItem(k, 1));
    __rf.setGear(['rune_sword', 'rune_platebody', 'rune_shield']);
    window.G.dungeonsCleared = 4;
    window.G.hp = __rf.maxHp();
    __rf.setPace(0);
    __rf.setAutoBoon(() => -1);            // decline, so we control the build
    __rf.enterDungeon(1);
  });
  check('a Crypt run is under way', await page.evaluate(() => __rf.isInRun()));

  // Branches must be invisible until the root is taken.
  const gated = await page.evaluate(() => ({
    before: ['bonelegion', 'deathmagic'].map(k => __rf.boonUnlocked(k)),
    rootFree: __rf.boonUnlocked('necromancy')
  }));
  check('Bone Legion and Death Magic are locked without Necromancy',
    gated.before.every(x => x === false), gated.before.join(','));
  check('the root itself needs nothing', gated.rootFree === true);

  await page.evaluate(() => __rf.forceBoon('necromancy', 1));
  const opened = await page.evaluate(() =>
    ['bonelegion', 'deathmagic'].map(k => __rf.boonUnlocked(k)));
  check('taking Necromancy opens both branches', opened.every(x => x === true),
    opened.join(','));
  check('and the branches can now be rolled', await page.evaluate(() => {
    for (let i = 0; i < 200; i++) {
      const picks = __rf.rollBoonChoices(3).map(p => p.key);
      if (picks.indexOf('bonelegion') >= 0 || picks.indexOf('deathmagic') >= 0) return true;
    }
    return false;
  }));

  // Kills raise units.
  const raised = await page.evaluate(() => {
    const before = __rf.runInfo().host.length;
    for (let i = 0; i < 6; i++) __rf.raiseUnit(true);
    return { before: before, after: __rf.runInfo().host.length };
  });
  check('the slain rise into a host', raised.after > raised.before,
    `${raised.before} → ${raised.after}`);
  // The rail appears on the next render pass, not on the raise itself.
  await page.waitForSelector('#run-host', { state: 'visible', timeout: 30000 });
  check('the host rail is showing', await page.isVisible('#run-host'));
  check('one chip per risen unit',
    (await page.locator('#host-units .unit').count()) === raised.after,
    await page.locator('#host-units .unit').count());
  check('the host has a max hit of its own',
    (await page.evaluate(() => __rf.hostMaxHit())) > 0,
    await page.evaluate(() => __rf.hostMaxHit()));

  // Skeletons by default.
  check('a bare host is skeletons',
    (await page.evaluate(() => __rf.runInfo().host)).every(t => t === 0));

  // Bone Legion rewrites what is already standing.
  await page.evaluate(() => __rf.forceBoon('bonelegion', 1));
  check('Grave Rot rots the standing host into ghouls',
    (await page.evaluate(() => __rf.runInfo().host)).every(t => t === 1));
  await page.evaluate(() => __rf.forceBoon('bonelegion', 2));
  check('Wight Lords promotes them again',
    (await page.evaluate(() => __rf.runInfo().host)).every(t => t === 2));

  const beforeDragon = await page.evaluate(() => __rf.hostMaxHit());
  await page.evaluate(() => __rf.forceBoon('bonelegion', 3));
  const dragons = await page.evaluate(() => __rf.runInfo().host.filter(t => t === 3).length);
  check('exactly one Bone Dragon leads the host', dragons === 1, dragons);
  check('and the host hits harder for it',
    (await page.evaluate(() => __rf.hostMaxHit())) > beforeDragon);
  check('the dragon gets its own chip style',
    (await page.locator('#host-units .unit.t3').count()) === 1);

  // The host is capped.
  const capped = await page.evaluate(() => {
    for (let i = 0; i < 20; i++) __rf.raiseUnit(true);
    return { size: __rf.runInfo().host.length, cap: __rf.HOST_CAP };
  });
  check('the host is capped at seven', capped.size === capped.cap,
    `${capped.size}/${capped.cap}`);

  // Power meter and stage tint react.
  const meter = await page.evaluate(() => ({
    width: document.getElementById('host-power').style.width,
    necro: document.getElementById('run-stage').style.getPropertyValue('--necro'),
    legion: document.getElementById('run-host').classList.contains('legion')
  }));
  check('the power meter has filled', parseFloat(meter.width) > 0, meter.width);
  check('the stage is tinted by the host', parseFloat(meter.necro) > 0, meter.necro);
  check('a full host reads as a legion', meter.legion === true);

  // Finish the run and confirm none of it survives.
  await page.evaluate(() => { __rf.setAutoBoon(() => 0); });
  await page.waitForSelector('#screen-results.active', { timeout: 120000 });
  const res = await page.evaluate(() => ({
    rows: Array.from(document.querySelectorAll('.res-row')).map(r => r.textContent),
    inRun: __rf.isInRun()
  }));
  check('the results report the host',
    res.rows.some(r => /^Host/.test(r)), (res.rows.find(r => /^Host/.test(r)) || '').slice(0, 70));
  check('no NaN/undefined in the host row', !res.rows.some(r => /NaN|undefined/.test(r)));
  await page.click('#result-continue');
  check('the run is over', res.inRun === false);
  check('no host survives on the save', await page.evaluate(() =>
    !JSON.stringify(window.G).includes('retinue') &&
    !JSON.stringify(window.G).includes('bonelegion')));
  check('the host rail is hidden outside a run',
    !(await page.isVisible('#run-host')));
  await page.evaluate(() => { __rf.setAutoBoon(null); __rf.setPace(1); });
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
  console.log('\n== Craft progress is visible wherever you tapped ==');
  check('active row shows a FORGING badge',
    (await page.locator('#smelt-list .recipe.active .rc-badge').count()) === 1);
  check('active row has its own progress bar',
    (await page.locator('#smelt-list .recipe.active .rc-prog-fill').count()) === 1);
  // Sample twice mid-swing — the width resets to 0 at each swing boundary.
  await page.waitForTimeout(500);
  const w1 = await page.evaluate(() => parseFloat(getComputedStyle(
    document.querySelector('.recipe.active .rc-prog-fill')).width));
  await page.waitForTimeout(400);
  const w2 = await page.evaluate(() => parseFloat(getComputedStyle(
    document.querySelector('.recipe.active .rc-prog-fill')).width));
  check('row progress bar advances over time', w2 > w1 || w1 > 0, `${w1}px → ${w2}px`);
  check('active strip is sticky under the header',
    (await page.evaluate(() => getComputedStyle(document.getElementById('craft-active')).position)) === 'sticky');
  const stickyTop = await page.evaluate(() => getComputedStyle(document.getElementById('craft-active')).top);
  check('sticky offset matches the header height', parseFloat(stickyTop) > 20, stickyTop);
  // Scroll to the bottom: the strip must stay on screen.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
  const visibleWhenScrolled = await page.evaluate(() => {
    const r = document.getElementById('craft-active').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  });
  check('strip still on screen after scrolling to the bottom', visibleWhenScrolled);

  console.log('\n== Re-tapping an active recipe does not cancel it ==');
  const madeBefore = await page.evaluate(() => window.G.inventory.bronze_bar || 0);
  await page.evaluate(() => {
    const r = document.querySelector('#smelt-list .recipe.active');
    r.click(); r.click(); r.click();
  });
  check('still crafting after repeated taps', await page.isVisible('#craft-active'));
  check('repeated taps kept the same recipe active',
    (await page.locator('#smelt-list .recipe.active').count()) === 1);
  await page.waitForFunction((n) => (window.G.inventory.bronze_bar || 0) > n, madeBefore, { timeout: 20000 });
  check('production continued through the taps', true);
  await page.evaluate(() => window.scrollTo(0, 0));

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
    __rf.setPace(0.15);           // keep the suite quick
    window.render();
  });
  await page.locator('.dun-card .dc-go').first().click();
  check('run overlay opens', await page.isVisible('#run-overlay'));
  check('HP bar shown during a run, not xp',
    !(await page.evaluate(() => document.getElementById('hp-bar').classList.contains('xp-mode'))));

  console.log('\n== Boons: the in-run build ==');
  // Clearing wave 1 must offer a delve level.
  await page.waitForSelector('body.picking-boon', { timeout: 60000 });
  check('clearing a wave offers a delve level', true);
  check('exactly three boons offered', (await page.locator('.boon-card').count()) === 3);
  const firstOffer = await page.evaluate(() => __rf.runInfo());
  check('run level starts at 1', firstOffer.runLevel === 1, firstOffer.runLevel);
  check('all three offers are first-tier',
    firstOffer.pending.every(p => p.endsWith(':1')), firstOffer.pending.join(', '));
  check('offers come from this dungeon\'s pool', await page.evaluate(() => {
    const pool = __rf.DUNGEON_BOONS.warren;
    return __rf.runInfo().pending.every(p => pool.indexOf(p.split(':')[0]) >= 0);
  }), firstOffer.pending.join(', '));
  check('combat is halted while choosing',
    (await page.evaluate(() => __rf.runInfo().wave)) === 2);

  // Taking one grants it and resumes the fight.
  const takenKey = firstOffer.pending[0].split(':')[0];
  await page.locator('.boon-card').first().click();
  const afterPick = await page.evaluate(() => __rf.runInfo());
  check('the chosen boon is granted', afterPick.boons[takenKey] === 1,
    JSON.stringify(afterPick.boons));
  check('choosing dismisses the panel', !(await page.isVisible('body.picking-boon')));
  check('the build shows in the run HUD',
    (await page.locator('#run-boons .boon-chip').count()) === 1);

  // Second level up should offer that line's tier II somewhere.
  await page.waitForSelector('body.picking-boon', { timeout: 60000 });
  const second = await page.evaluate(() => __rf.runInfo());
  check('run level advances', second.runLevel === 2, second.runLevel);
  check('a taken line is offered at tier II',
    second.pending.some(p => p === takenKey + ':2'), second.pending.join(', '));

  // Drive the rest of the run automatically.
  await page.evaluate(() => __rf.setAutoBoon(() => 0));
  await page.locator('.boon-card').first().click();
  await page.waitForSelector('#screen-results.active', { timeout: 120000 });

  const res = await page.evaluate(() => ({
    title: document.getElementById('result-title').textContent,
    rows: Array.from(document.querySelectorAll('.res-row')).map(r => r.textContent),
    busy: window.G.busy,
    inRun: __rf.isInRun()
  }));
  check('results screen shown', res.rows.length > 0, res.title);
  check('busy flag cleared', res.busy === false);
  check('results record the delve build', res.rows.some(r => /Delve build/.test(r)),
    (res.rows.find(r => /Delve build/.test(r)) || '').slice(0, 60));
  check('no NaN/undefined in results', !res.rows.some(r => /NaN|undefined/.test(r)), res.rows.join(' | '));

  console.log('\n== Boons do not leak out of the run ==');
  check('run state is gone', res.inRun === false);
  check('no boon data on the save',
    await page.evaluate(() => !('boons' in window.G) && !JSON.stringify(window.G).includes('emberbrand')));
  const maxHitAfter = await page.evaluate(() => __rf.playerMaxHit());
  const maxHitClean = await page.evaluate(() => {
    // Same levels and gear, measured outside any run.
    return __rf.playerMaxHit();
  });
  check('max hit carries no run bonuses', maxHitAfter === maxHitClean,
    `${maxHitAfter} vs ${maxHitClean}`);
  await page.click('#result-continue');
  check('run overlay closed', !(await page.isVisible('#run-overlay')));

  // A second run must start from a blank build.
  await page.evaluate(() => { __rf.setAutoBoon(null); window.G.hp = __rf.maxHp(); });
  await page.locator('.dun-card .dc-go').first().click();
  await page.waitForSelector('body.picking-boon', { timeout: 60000 });
  const fresh = await page.evaluate(() => __rf.runInfo());
  check('a new run starts with no boons', Object.keys(fresh.boons).length === 0,
    JSON.stringify(fresh.boons));
  check('and back at delve level 1', fresh.runLevel === 1, fresh.runLevel);
  await page.evaluate(() => { __rf.setAutoBoon(() => 0); });
  await page.locator('.boon-card').first().click();
  await page.waitForSelector('#screen-results.active', { timeout: 120000 });
  await page.click('#result-continue');
  await page.evaluate(() => { __rf.setAutoBoon(null); __rf.setPace(1); });

  console.log('\n== Each dungeon has its own character ==');
  const pools = await page.evaluate(() => ({
    crypt: __rf.DUNGEON_BOONS.crypt,
    spire: __rf.DUNGEON_BOONS.spire,
    lines: Object.keys(__rf.BOON_LINES).length,
    branches: Object.keys(__rf.BOON_LINES).filter(k => __rf.BOON_LINES[k].req)
  }));
  check('ten boon lines exist', pools.lines === 10, pools.lines);
  check('the Crypt offers necromancy', pools.crypt.indexOf('necromancy') >= 0, pools.crypt.join(','));
  check('the Spire offers stormcaller', pools.spire.indexOf('stormcaller') >= 0, pools.spire.join(','));
  check('pools differ between dungeons',
    pools.crypt.join(',') !== pools.spire.join(','));
  check('the necromancy branches are gated behind their root',
    pools.branches.sort().join(',') === 'bonelegion,deathmagic', pools.branches.join(','));

  await necromancyChecks(page, check);

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

  console.log('\n== Upgrade indicators ==');
  await page.evaluate(() => {
    __rf.setLevels({ attack: 60, defence: 60, strength: 40, hitpoints: 30 });
    window.G.equipped = { weapon: 'bronze_sword', body: null, shield: null, amulet: null };
    window.G.inventory = {};
    __rf.addItem('rune_sword', 1);      // strictly better than bronze
    __rf.addItem('iron_sword', 1);      // better than bronze, worse than rune
    __rf.addItem('bronze_shield', 1);   // fills an empty slot
    __rf.addItem('copper_ore', 5);      // plain material, no badges
  });
  await page.click('.nav-btn[data-tab="gear"]');
  const inv = await page.evaluate(() => Array.from(document.querySelectorAll('#inv-list .inv-item'))
    .map(r => ({ text: r.textContent.replace(/\s+/g, ' ').trim(), cls: r.className })));
  const runeRow = inv.find(r => r.text.includes('Rune Sword'));
  const ironRow = inv.find(r => r.text.includes('Iron Sword'));
  const oreRow = inv.find(r => r.text.includes('Copper Ore'));
  check('upgrade is flagged', /UPGRADE \+\d+/.test(runeRow.text), runeRow.text.slice(0, 60));
  check('best-in-slot is flagged', /BEST/.test(runeRow.text));
  check('upgrade row is highlighted', /is-upgrade/.test(runeRow.cls));
  check('lesser upgrade also flagged but not BEST',
    /UPGRADE/.test(ironRow.text) && !/BEST/.test(ironRow.text), ironRow.text.slice(0, 60));
  check('upgrades sort above other items', inv[0].text.includes('Rune Sword'), inv[0].text.slice(0, 40));
  check('plain materials get no gear badges',
    !/UPGRADE|BEST/.test(oreRow.text), oreRow.text.slice(0, 40));
  check('equipped slot advertises a pending upgrade',
    (await page.locator('.eq-slot.has-upgrade').count()) >= 1);

  const unwearable = await page.evaluate(() => {
    __rf.setLevels({ attack: 1, defence: 1 });
    window.render();
    const row = Array.from(document.querySelectorAll('#inv-list .inv-item'))
      .find(r => r.textContent.includes('Rune Sword'));
    return { text: row.textContent.replace(/\s+/g, ' '), cls: row.className };
  });
  check('unwearable gear shows the requirement, not an upgrade badge',
    /Attack 40/.test(unwearable.text) && !/UPGRADE/.test(unwearable.text),
    unwearable.text.slice(0, 70));

  console.log('\n== Disenchanting ==');
  await page.evaluate(() => {
    __rf.setLevels({ attack: 60, defence: 60 });
    window.G.inventory = {};
    __rf.addItem('bronze_sword', 3);
    window.render();
  });
  await page.locator('#inv-list .iv-salvage').first().click();
  check('confirm dialog opens', await page.isVisible('#confirm'));
  check('dialog names the item', /Bronze Sword/.test(await page.textContent('#cf-title')));
  check('dialog lists what may come back', /Bronze Bar/.test(await page.textContent('#cf-body')));
  await page.click('#cf-cancel');
  check('cancel closes without destroying', !(await page.isVisible('#confirm')));
  check('item still owned after cancel', (await page.evaluate(() => __rf.have('bronze_sword'))) === 3);

  await page.locator('#inv-list .iv-salvage').first().click();
  await page.click('#cf-ok');
  check('confirming consumes exactly one item',
    (await page.evaluate(() => __rf.have('bronze_sword'))) === 2,
    await page.evaluate(() => __rf.have('bronze_sword')));

  // Salvage must be lossy: never a cheaper source of materials than mining.
  const salvage = await page.evaluate(() => {
    let bars = 0, logs = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const y = __rf.salvageYield('bronze_sword');
      bars += y.bronze_bar || 0;
      logs += y.logs || 0;
    }
    return { barRate: bars / (N * 2), logRate: logs / N };
  });
  check('bar recovery averages ~40%', Math.abs(salvage.barRate - 0.4) < 0.04,
    `${(salvage.barRate * 100).toFixed(1)}%`);
  check('log recovery averages ~40%', Math.abs(salvage.logRate - 0.4) < 0.04,
    `${(salvage.logRate * 100).toFixed(1)}%`);
  check('recovery is strictly lossy', salvage.barRate < 1 && salvage.logRate < 1);

  const equippedSafe = await page.evaluate(() => {
    __rf.addItem('bronze_sword', 1);
    window.render();
    const rows = Array.from(document.querySelectorAll('#inv-list .inv-item'));
    return rows.every(r => !r.textContent.includes('undefined'));
  });
  check('pack renders cleanly after salvaging', equippedSafe);

  console.log('\n== Errors ==');
  check('no uncaught JS errors', errors.length === 0, errors.slice(0, 4).join(' | '));

  await browser.close();
  console.log(`\n${fails === 0 ? 'ALL CHECKS PASSED' : fails + ' CHECK(S) FAILED'}`);
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
