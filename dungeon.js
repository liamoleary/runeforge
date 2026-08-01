/* ============================================================
 * RuneForge — Hero-driven monster hunting & weapon forging.
 *
 *   - Hero select (Pebble / Button / Luna)
 *   - Hub: portrait, stats, monster grid
 *   - Quick combat against chosen monsters → XP, drops, stat gain
 *   - Forge: infuse elemental essences into your starting weapon
 *   - Dungeon: passive auto-battle through escalating phases
 *
 * State lives in window.G and persists via auth.js's save plumbing.
 * ============================================================ */
(function () {
'use strict';

// ============================================================
// Static data
// ============================================================

const ELEMENTS = ['physical', 'fire', 'water', 'earth', 'ice', 'lightning', 'arcane'];
const EL_COLORS = {
  physical: '#d4d4d4', fire: '#ff6a3d', water: '#4dc3ff',
  earth: '#b07a3a', ice: '#8ed6ff', lightning: '#ffe14d', arcane: '#c688ff'
};
const EL_LABELS = {
  physical: 'Physical', fire: 'Fire', water: 'Water',
  earth: 'Earth', ice: 'Ice', lightning: 'Lightning', arcane: 'Arcane'
};

const HEROES = {
  pebble: {
    name: 'Pebble',
    portrait: '🗿',
    desc: 'A mountain-born brawler. Trades subtle spellwork for crushing blows.',
    stats: { strength: 3, intellect: 1, defence: 1, mana: 1 },
    weapon: {
      name: 'Stone Hammer', icon: '🔨', type: 'hammer', basePower: 6,
      elements: { physical: 100, fire: 0, water: 0, earth: 0, ice: 0, lightning: 0, arcane: 0 },
      tier: 0
    },
    scaling: 'strength'
  },
  button: {
    name: 'Button',
    portrait: '🐱',
    desc: 'A nimble hybrid. Equal parts blade and spell — always adaptable.',
    stats: { strength: 2, intellect: 2, defence: 1, mana: 1 },
    weapon: {
      name: 'Runeblade', icon: '⚔️', type: 'sword', basePower: 5,
      elements: { physical: 100, fire: 0, water: 0, earth: 0, ice: 0, lightning: 0, arcane: 0 },
      tier: 0
    },
    scaling: 'hybrid'
  },
  luna: {
    name: 'Luna',
    portrait: '🌙',
    desc: 'A celestial mage. Frail of frame, but her wand bends starlight.',
    stats: { strength: 1, intellect: 2, defence: 1, mana: 1 },
    weapon: {
      name: 'Crescent Wand', icon: '🪄', type: 'wand', basePower: 5,
      elements: { physical: 0, fire: 0, water: 0, earth: 0, ice: 0, lightning: 0, arcane: 100 },
      tier: 0
    },
    scaling: 'intellect'
  }
};

// Each monster: tier (level gate), HP, attack, defence, XP, gold reward,
// drops (item -> [min,max]), the stat it trains on a kill, and per-element
// damage multipliers (< 1 = resist, > 1 = weak). Missing element = neutral 1.
const MONSTERS = {
  slime:   { name: 'Slime',         icon: '🟢', tier: 1, hp: 10,  atk: 2,  def: 0, xp: 6,   gold: 1, drops: { water_essence: [1, 2] }, trains: 'defence',  resist: { water: 0.5, fire: 1.3, lightning: 1.5 } },
  rat:     { name: 'Giant Rat',     icon: '🐀', tier: 1, hp: 8,   atk: 3,  def: 0, xp: 5,   gold: 1, drops: { hide: [1, 1] },          trains: 'strength', resist: { fire: 1.3 } },
  bat:     { name: 'Cave Bat',      icon: '🦇', tier: 1, hp: 7,   atk: 4,  def: 0, xp: 6,   gold: 1, drops: { arcane_essence: [1, 1] },trains: 'intellect',resist: { arcane: 0.7, physical: 0.85, lightning: 1.3 } },
  wisp:    { name: 'Wisp',          icon: '✨', tier: 2, hp: 14,  atk: 5,  def: 0, xp: 12,  gold: 2, drops: { arcane_essence: [1, 2] },trains: 'intellect',resist: { arcane: 0.5, physical: 0.7, lightning: 1.4 } },
  goblin:  { name: 'Goblin',        icon: '👺', tier: 2, hp: 18,  atk: 6,  def: 2, xp: 14,  gold: 3, drops: { iron_scrap: [1, 2] },    trains: 'strength', resist: { physical: 0.85, fire: 1.3 } },
  wolf:    { name: 'Dire Wolf',     icon: '🐺', tier: 2, hp: 22,  atk: 7,  def: 1, xp: 16,  gold: 3, drops: { fang: [1, 2] },          trains: 'strength', resist: { ice: 0.7, fire: 1.3 } },
  turtle:  { name: 'War Turtle',    icon: '🐢', tier: 3, hp: 30,  atk: 5,  def: 6, xp: 22,  gold: 4, drops: { earth_essence: [1, 2] }, trains: 'defence', resist: { earth: 0.4, physical: 0.7, lightning: 1.5 } },
  imp:     { name: 'Imp',           icon: '👹', tier: 3, hp: 24,  atk: 9,  def: 2, xp: 24,  gold: 5, drops: { fire_essence: [1, 3] },  trains: 'mana',     resist: { fire: 0.4, water: 1.5, ice: 1.4 } },
  wraith:  { name: 'Frost Wraith',  icon: '❄️', tier: 4, hp: 32,  atk: 11, def: 3, xp: 34,  gold: 7, drops: { ice_essence: [1, 3] },   trains: 'mana',     resist: { ice: 0.4, physical: 0.75, fire: 1.5 } },
  golem:   { name: 'Stone Golem',   icon: '🗿', tier: 4, hp: 50,  atk: 8,  def: 8, xp: 38,  gold: 8, drops: { earth_essence: [2, 3], iron_scrap: [1, 2] }, trains: 'defence', resist: { earth: 0.4, physical: 0.6, water: 1.3, lightning: 1.3 } },
  fae:     { name: 'Fae Trickster', icon: '🧚', tier: 5, hp: 30,  atk: 13, def: 2, xp: 44,  gold: 9, drops: { arcane_essence: [2, 4] },trains: 'intellect',resist: { arcane: 0.5, earth: 1.3, physical: 1.2 } },
  storm:   { name: 'Storm Sprite',  icon: '⚡', tier: 5, hp: 36,  atk: 14, def: 3, xp: 48,  gold: 10,drops: { lightning_essence: [2, 3] }, trains: 'mana', resist: { lightning: 0.4, physical: 0.8, earth: 1.4 } },
  drake:   { name: 'Young Drake',   icon: '🐲', tier: 6, hp: 80,  atk: 16, def: 6, xp: 80,  gold: 16,drops: { drake_scale: [1, 2], fire_essence: [2, 4] }, trains: 'strength', resist: { fire: 0.3, physical: 0.9, ice: 1.6, water: 1.3 } },
  lich:    { name: 'Bone Lich',     icon: '💀', tier: 7, hp: 100, atk: 20, def: 8, xp: 120, gold: 22,drops: { arcane_essence: [3, 5], lich_dust: [1, 1] }, trains: 'intellect', resist: { arcane: 0.4, ice: 0.7, fire: 1.4, lightning: 1.3 } },
  // Deep-phase bestiary
  magma_wyrm:  { name: 'Magma Wyrm', icon: '🐍', tier: 8,  hp: 150, atk: 24, def: 10, xp: 180, gold: 32, drops: { fire_essence: [3, 5], drake_scale: [1, 2] }, trains: 'strength', resist: { fire: 0.2, physical: 0.75, ice: 1.7, water: 1.5 } },
  storm_wyrm:  { name: 'Storm Wyrm', icon: '🐉', tier: 9,  hp: 200, atk: 28, def: 9,  xp: 240, gold: 44, drops: { lightning_essence: [3, 5], drake_scale: [1, 2] }, trains: 'mana',     resist: { lightning: 0.2, physical: 0.8, earth: 1.7 } },
  wyrm_lord:   { name: 'Wyrm Lord',  icon: '🐲', tier: 10, hp: 320, atk: 34, def: 14, xp: 360, gold: 70, drops: { drake_scale: [2, 4], lich_dust: [1, 2], fire_essence: [3, 5] }, trains: 'strength', resist: { fire: 0.3, physical: 0.6, arcane: 0.7, ice: 1.5, water: 1.4 } }
};

// Hero level -> max monster tier unlocked.
const TIER_UNLOCK = { 1: 1, 3: 2, 5: 3, 7: 4, 10: 5, 13: 6, 17: 7, 22: 8, 28: 9, 35: 10 };

const RESOURCES = {
  fire_essence:      { name: 'Fire Essence',      icon: '🔥', element: 'fire',      desc: '+8% Fire infusion' },
  water_essence:     { name: 'Water Essence',     icon: '💧', element: 'water',     desc: '+8% Water infusion' },
  earth_essence:     { name: 'Earth Essence',     icon: '🌿', element: 'earth',     desc: '+8% Earth infusion' },
  ice_essence:       { name: 'Ice Essence',       icon: '❄️', element: 'ice',       desc: '+8% Ice infusion' },
  lightning_essence: { name: 'Storm Essence',     icon: '⚡', element: 'lightning', desc: '+8% Lightning infusion' },
  arcane_essence:    { name: 'Arcane Essence',    icon: '🌌', element: 'arcane',    desc: '+8% Arcane infusion' },
  iron_scrap:        { name: 'Iron Scrap',        icon: '⛓️', element: 'physical',  desc: '+5 Power, +6% Physical' },
  fang:              { name: 'Beast Fang',        icon: '🦷', element: 'physical',  desc: '+3 Power, +4% Physical' },
  hide:              { name: 'Tough Hide',        icon: '🟫', element: null,        desc: '+1 Defence (consumed)' },
  drake_scale:       { name: 'Drake Scale',       icon: '🛡️', element: 'fire',      desc: '+10 Power, +10% Fire' },
  lich_dust:         { name: 'Lich Dust',         icon: '🕯️', element: 'arcane',    desc: '+12 Power, +12% Arcane' }
};

// ============================================================
// Spells & loadout
// ============================================================

// kind: 'damage' | 'heal'
// power: damage spells — base coefficient (×(8 + INT*2)); heal spells — fraction of maxHp restored
const SPELLS = {
  arcane_missile: { name: 'Arcane Missile', icon: '🌟', cost: 5,  kind: 'damage', element: 'arcane',    power: 1.0, desc: 'Cheap arcane strike.' },
  fire_bolt:      { name: 'Fire Bolt',      icon: '🔥', cost: 7,  kind: 'damage', element: 'fire',      power: 1.3, desc: 'A scalding fireburst.' },
  frost_bolt:     { name: 'Frost Bolt',     icon: '❄️', cost: 6,  kind: 'damage', element: 'ice',       power: 1.1, desc: 'Slow, cold, reliable.' },
  stone_spike:    { name: 'Stone Spike',    icon: '🪨', cost: 8,  kind: 'damage', element: 'earth',     power: 1.4, desc: 'Crushing earth shard.' },
  tidal_lance:    { name: 'Tidal Lance',    icon: '🌊', cost: 9,  kind: 'damage', element: 'water',     power: 1.5, desc: 'Sweeping wave of force.' },
  thunder_clap:   { name: 'Thunder Clap',   icon: '⚡', cost: 12, kind: 'damage', element: 'lightning', power: 2.0, desc: 'Heavy lightning blast.' },
  starfall:       { name: 'Starfall',       icon: '💫', cost: 18, kind: 'damage', element: 'arcane',    power: 3.0, desc: 'Devastating arcane finisher.' },
  minor_heal:     { name: 'Minor Heal',     icon: '✨', cost: 6,  kind: 'heal',                       healPct: 0.25, desc: 'Restore 25% HP (auto <20%).' },
  greater_heal:   { name: 'Greater Heal',   icon: '💖', cost: 14, kind: 'heal',                       healPct: 0.55, desc: 'Restore 55% HP (auto <20%).' },
  divine_mend:    { name: 'Divine Mend',    icon: '🕊️', cost: 22, kind: 'heal',                       healPct: 0.95, desc: 'Full-body heal (auto <20%).' }
};

// Hero level → spells granted at that level (cumulative).
const SPELL_UNLOCKS = {
  1:  ['arcane_missile', 'minor_heal'],
  2:  ['fire_bolt'],
  3:  ['frost_bolt'],
  4:  ['stone_spike'],
  6:  ['tidal_lance', 'greater_heal'],
  8:  ['thunder_clap'],
  11: ['starfall'],
  14: ['divine_mend']
};
const LOADOUT_SIZE = 4;

// ============================================================
// State
// ============================================================

const BASE_HP = 40;

// Out-of-combat recovery. Percentages of the current maximum, per minute of
// real time — accrues while the tab is closed too, since it is derived from
// timestamps rather than ticks.
const REGEN_HP_PCT_PER_MIN = 12;
const REGEN_MP_PCT_PER_MIN = 20;

function defaultState() {
  return {
    hero: null,
    level: 1,
    xp: 0,
    hp: BASE_HP,
    mana: 25,
    gold: 0,
    stats:   { strength: 0, intellect: 0, defence: 0, mana: 0 }, // current stat level
    statXp:  { strength: 0, intellect: 0, defence: 0, mana: 0 }, // progress toward next
    resources: {},
    weapon: null,
    spellbook: {},   // { spellKey: true } — unlocked
    loadout: [],     // up to LOADOUT_SIZE spell keys
    monstersDefeated: {},
    dungeonPhase: 1,  // persistent checkpoint — only advances on phase clear
    dungeonStart: 1,  // phase the next run begins at (player-chosen, ≤ checkpoint)
    dungeonBest: 0,
    hpRegenAt: 0,     // ms timestamp the HP regen clock last paid out
    mpRegenAt: 0,
    busy: false,
    inDungeon: false
  };
}

// Returns the dominant element of the current weapon — used as the damage
// type of basic weapon attacks against monster resistances.
function weaponElementOnAttack() {
  if (!G.weapon || !G.weapon.elements) return 'physical';
  let top = 'physical', topV = 0;
  for (let i = 0; i < ELEMENTS.length; i++) {
    const e = ELEMENTS[i];
    const v = G.weapon.elements[e] || 0;
    if (v > topV) { top = e; topV = v; }
  }
  return top;
}
// Flat mitigation from the foe's armour. Applied to weapon swings only —
// spells bypass armour, which is what makes them worth casting at turtles,
// golems and other high-def foes.
function applyArmor(foe, dmg) {
  if (!foe || !foe.def) return dmg;
  return Math.max(1, Math.round(dmg - foe.def * 0.5));
}
function applyResistance(foe, element, dmg) {
  if (!foe || !foe.resist || !element) return { dmg: dmg, mult: 1 };
  const m = foe.resist[element];
  if (!m || m === 1) return { dmg: dmg, mult: 1 };
  return { dmg: Math.max(1, Math.round(dmg * m)), mult: m };
}
function resistLabel(mult) {
  if (mult < 1) return ' <span class="crit" style="color:#8ed6ff">RESIST ×' + mult.toFixed(2) + '</span>';
  if (mult > 1) return ' <span class="crit" style="color:#ff8080">WEAK ×' + mult.toFixed(2) + '</span>';
  return '';
}

function statXpThreshold(level) {
  return 30 + level * 20;
}
function statXpPerKill(monster) {
  return Math.max(2, (monster.tier || 1) * 5);
}
function awardStatXp(stat, amount) {
  if (!G.statXp) G.statXp = { strength: 0, intellect: 0, defence: 0, mana: 0 };
  G.statXp[stat] = (G.statXp[stat] || 0) + amount;
  let leveled = 0;
  while (G.statXp[stat] >= statXpThreshold(G.stats[stat])) {
    G.statXp[stat] -= statXpThreshold(G.stats[stat]);
    G.stats[stat] += 1;
    leveled += 1;
  }
  return leveled;
}

const G = window.G = defaultState();

function xpForLevel(lvl) {
  return Math.round(60 + lvl * 40 + lvl * lvl * 4);
}
function maxHp() {
  return BASE_HP + (G.level - 1) * 10 + G.stats.defence * 4;
}
function maxMana() {
  return 20 + G.stats.mana * 5;
}
function manaRegenPerTurn() {
  return 2 + Math.floor(G.stats.mana / 4);
}
function ensureSpellsForLevel() {
  if (!G.spellbook) G.spellbook = {};
  for (const lvl in SPELL_UNLOCKS) {
    if (G.level >= +lvl) {
      SPELL_UNLOCKS[lvl].forEach(function (s) { G.spellbook[s] = true; });
    }
  }
}
function isLoadoutFull() {
  return (G.loadout || []).filter(function (k) { return !!k; }).length >= LOADOUT_SIZE;
}
function loadoutHas(key) {
  return (G.loadout || []).indexOf(key) >= 0;
}
function unlockedTier() {
  let t = 1;
  for (const lvl in TIER_UNLOCK) {
    if (G.level >= +lvl) t = Math.max(t, TIER_UNLOCK[lvl]);
  }
  return t;
}
function tierUnlockLevel(tier) {
  let best = 99;
  for (const lvl in TIER_UNLOCK) {
    if (TIER_UNLOCK[lvl] >= tier) best = Math.min(best, +lvl);
  }
  return best;
}

// ============================================================
// Rest & recovery
// ============================================================

// Stop the regen clocks from paying out for time spent mid-fight (during
// combat the arena owns your HP, not G.hp).
function touchRegen() {
  const now = Date.now();
  G.hpRegenAt = now;
  G.mpRegenAt = now;
}

// Advance HP/MP by however much real time has passed. Returns true if
// anything actually changed, so callers can skip a redraw.
function regenTick() {
  if (!G.hero) return false;
  const now = Date.now();
  if (!G.hpRegenAt || G.hpRegenAt > now) G.hpRegenAt = now;
  if (!G.mpRegenAt || G.mpRegenAt > now) G.mpRegenAt = now;
  if (G.busy) { touchRegen(); return false; }

  let changed = false;
  const mh = maxHp();
  if (G.hp < mh) {
    const perMs = mh * (REGEN_HP_PCT_PER_MIN / 100) / 60000;
    const gain = Math.floor((now - G.hpRegenAt) * perMs);
    if (gain > 0) {
      G.hp = Math.min(mh, G.hp + gain);
      G.hpRegenAt += Math.ceil(gain / perMs);
      changed = true;
    }
  } else {
    G.hp = mh;
    G.hpRegenAt = now;
  }

  const mm = maxMana();
  if (G.mana < mm) {
    const perMs = mm * (REGEN_MP_PCT_PER_MIN / 100) / 60000;
    const gain = Math.floor((now - G.mpRegenAt) * perMs);
    if (gain > 0) {
      G.mana = Math.min(mm, G.mana + gain);
      G.mpRegenAt += Math.ceil(gain / perMs);
      changed = true;
    }
  } else {
    G.mana = mm;
    G.mpRegenAt = now;
  }
  return changed;
}

// Gold price to skip the wait and top everything up right now.
function campCost() {
  const missHp = Math.max(0, maxHp() - G.hp);
  const missMp = Math.max(0, maxMana() - G.mana);
  if (missHp <= 0 && missMp <= 0) return 0;
  return Math.max(1, Math.ceil(missHp / 6) + Math.ceil(missMp / 8));
}

function makeCamp() {
  if (G.busy) return;
  const cost = campCost();
  if (cost <= 0) { toast('Already at full strength.'); return; }
  if (G.gold < cost) {
    toast('Need ' + cost + ' ⚜ — or just wait it out.');
    return;
  }
  G.gold -= cost;
  G.hp = maxHp();
  G.mana = maxMana();
  touchRegen();
  save();
  render();
  toast('Rested — full HP and mana.');
  log('Made camp for <b>' + cost + ' ⚜</b> — fully restored.', 'gold');
}

// ============================================================
// Save / load (called from auth.js cloud sync and from triggers)
// ============================================================

function save() {
  try { localStorage.setItem('rforge', JSON.stringify(G)); } catch (e) {}
}
function load() {
  try {
    const raw = localStorage.getItem('rforge');
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || s === null || !s.hero) return;
    Object.assign(G, defaultState(), s);
    if (!G.stats) G.stats = { strength: 0, intellect: 0, defence: 0, mana: 0 };
    if (!G.statXp) G.statXp = { strength: 0, intellect: 0, defence: 0, mana: 0 };
    if (!G.resources) G.resources = {};
    if (!G.spellbook) G.spellbook = {};
    if (!Array.isArray(G.loadout)) G.loadout = [];
    G.loadout = G.loadout.filter(function (k) { return !!SPELLS[k]; }).slice(0, LOADOUT_SIZE);
    if (typeof G.dungeonPhase !== 'number' || G.dungeonPhase < 1) G.dungeonPhase = 1;
    if (typeof G.dungeonStart !== 'number' || G.dungeonStart < 1) G.dungeonStart = G.dungeonPhase;
    if (G.dungeonStart > G.dungeonPhase) G.dungeonStart = G.dungeonPhase;
    ensureSpellsForLevel();
    if (typeof G.hp !== 'number' || G.hp <= 0) G.hp = maxHp();
    if (typeof G.mana !== 'number' || G.mana < 0) G.mana = maxMana();
    if (G.mana > maxMana()) G.mana = maxMana();
    G.busy = false; G.inDungeon = false;
    // Saves from before timed recovery carry no clocks — start them now so
    // an old save doesn't instantly regen from the epoch.
    if (typeof G.hpRegenAt !== 'number' || !G.hpRegenAt) G.hpRegenAt = Date.now();
    if (typeof G.mpRegenAt !== 'number' || !G.mpRegenAt) G.mpRegenAt = Date.now();
    regenTick();
  } catch (e) {}
}
window.load = load;
window.save = save;

// auth.js calls this after a cloud save lands.
window.applyLoadedSave = function () {
  load();
  render();
};

// ============================================================
// DOM helpers
// ============================================================

function $(id) { return document.getElementById(id); }
function show(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const t = $(screenId);
  if (t) t.classList.add('active');
}
function log(html, cls) {
  const l = $('log');
  if (!l) return;
  const p = document.createElement('p');
  if (cls) p.className = cls;
  p.innerHTML = html;
  l.insertBefore(p, l.firstChild);
  while (l.children.length > 30) l.removeChild(l.lastChild);
}
let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}
function rng(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }

// ============================================================
// Hero selection
// ============================================================

function renderHeroSelect() {
  const container = $('hero-cards-list');
  container.innerHTML = '';
  Object.entries(HEROES).forEach(([key, h]) => {
    const card = document.createElement('div');
    card.className = 'hero-card';
    const strStars = '★'.repeat(h.stats.strength) + '☆'.repeat(Math.max(0, 3 - h.stats.strength));
    const intStars = '★'.repeat(h.stats.intellect) + '☆'.repeat(Math.max(0, 3 - h.stats.intellect));
    card.innerHTML =
      '<div class="hc-portrait">' + h.portrait + '</div>' +
      '<div class="hc-info">' +
        '<div class="hc-name">' + h.name + '</div>' +
        '<div class="hc-desc">' + h.desc + '</div>' +
        '<div class="hc-stats">' +
          '<div class="hc-stat"><span class="label">STR</span><span class="star">' + strStars + '</span></div>' +
          '<div class="hc-stat"><span class="label">INT</span><span class="star">' + intStars + '</span></div>' +
        '</div>' +
      '</div>';
    card.onclick = function () { chooseHero(key); };
    container.appendChild(card);
  });
}

function chooseHero(key) {
  const h = HEROES[key];
  if (!h) return;
  G.hero = key;
  G.level = 1; G.xp = 0; G.gold = 0;
  G.stats = Object.assign({}, h.stats);
  G.weapon = JSON.parse(JSON.stringify(h.weapon));
  G.hp = maxHp();
  G.mana = maxMana();
  G.resources = {};
  G.spellbook = {};
  G.loadout = [];
  ensureSpellsForLevel();
  // Auto-equip the starter spells so new heroes don't fight bare.
  Object.keys(G.spellbook).forEach(function (k) {
    if (G.loadout.length < LOADOUT_SIZE) G.loadout.push(k);
  });
  G.monstersDefeated = {};
  G.statXp = { strength: 0, intellect: 0, defence: 0, mana: 0 };
  G.dungeonBest = 0;
  G.dungeonPhase = 1;
  G.dungeonStart = 1;
  touchRegen();
  save();
  render();
  toast(h.name + ' chosen — welcome.');
  log('You take up the mantle of <b>' + h.name + '</b>. The forge waits.', 'gold');
}

// ============================================================
// Hub rendering
// ============================================================

function render() {
  if (!G.hero) {
    show('screen-hero-select');
    renderHeroSelect();
    return;
  }
  show('screen-hub');
  // Settle any recovery owed since the last look before drawing the bars —
  // otherwise the hub shows stale HP until the regen timer next fires.
  regenTick();
  const h = HEROES[G.hero];

  $('hp-portrait').textContent = h.portrait;
  $('hp-name-txt').textContent = h.name;
  $('hp-lvl').textContent = 'Lv ' + G.level;

  $('stat-strength').textContent = G.stats.strength;
  $('stat-intellect').textContent = G.stats.intellect;
  $('stat-defence').textContent = G.stats.defence;
  $('stat-mana').textContent = G.stats.mana;
  renderStatXpBars();
  renderVitals();
  renderMonsters();
}

// The parts of the hub that drift on their own (HP/MP regen, gold, camp
// price). Cheap enough to run on a timer without rebuilding the monster grid.
function renderVitals() {
  if (!G.hero) return;

  const need = xpForLevel(G.level);
  $('hp-xp-fill').style.width = Math.min(100, (G.xp / need) * 100) + '%';
  $('hp-xp-val').textContent = G.xp + ' / ' + need;

  if (G.hp > maxHp()) G.hp = maxHp();
  $('hp-hp-fill').style.width = Math.max(0, (G.hp / maxHp()) * 100) + '%';
  $('hp-hp-val').textContent = G.hp + ' / ' + maxHp();

  if (typeof G.mana !== 'number') G.mana = maxMana();
  if (G.mana > maxMana()) G.mana = maxMana();
  const mp = $('hp-mp-fill');
  if (mp) mp.style.width = Math.max(0, (G.mana / maxMana()) * 100) + '%';
  const mpVal = $('hp-mp-val');
  if (mpVal) mpVal.textContent = G.mana + ' / ' + maxMana();

  $('gold-val').textContent = G.gold;

  // Camp button — price tracks how hurt you are.
  const campBtn = $('btn-camp');
  if (campBtn) {
    const cost = campCost();
    const label = campBtn.querySelector('.ab-label');
    if (cost <= 0) {
      campBtn.classList.add('rested');
      if (label) label.textContent = 'Rested';
    } else {
      campBtn.classList.remove('rested');
      campBtn.classList.toggle('afford', G.gold >= cost);
      if (label) label.textContent = 'Camp · ' + cost + ' ⚜';
    }
  }

  renderDungeonPicker();
}

// Phase stepper — lets you re-run any phase you've already reached instead of
// being locked to the furthest checkpoint.
function renderDungeonPicker() {
  const wrap = $('dun-select');
  const max = Math.max(1, G.dungeonPhase || 1);
  if (typeof G.dungeonStart !== 'number' || G.dungeonStart < 1) G.dungeonStart = max;
  if (G.dungeonStart > max) G.dungeonStart = max;

  if (wrap) {
    // Nothing to pick from until you've cleared at least one phase.
    wrap.style.display = max > 1 ? '' : 'none';
    const lbl = $('dun-phase-label');
    if (lbl) lbl.textContent = 'Start at Phase ' + G.dungeonStart + ' / ' + max;
    const down = $('dun-phase-down');
    const up = $('dun-phase-up');
    if (down) down.disabled = G.dungeonStart <= 1;
    if (up) up.disabled = G.dungeonStart >= max;
  }

  const dunBtn = $('btn-dungeon');
  if (dunBtn) {
    const txt = dunBtn.querySelector('.ab-label');
    if (txt) txt.textContent = 'Enter Dungeon · Phase ' + G.dungeonStart;
  }
}

function stepDungeonPhase(delta) {
  const max = Math.max(1, G.dungeonPhase || 1);
  const next = Math.min(max, Math.max(1, (G.dungeonStart || 1) + delta));
  if (next === G.dungeonStart) return;
  G.dungeonStart = next;
  save();
  renderDungeonPicker();
}

function renderStatXpBars() {
  ['strength', 'intellect', 'defence', 'mana'].forEach(function (s) {
    const tile = document.querySelector('.stat-tile[data-stat="' + s + '"]');
    if (!tile) return;
    let mini = tile.querySelector('.xp-mini');
    let label = tile.querySelector('.xp-mini-val');
    if (!mini) {
      mini = document.createElement('div');
      mini.className = 'xp-mini';
      mini.innerHTML = '<div class="xp-mini-fill"></div>';
      tile.appendChild(mini);
      label = document.createElement('div');
      label.className = 'xp-mini-val';
      tile.appendChild(label);
    }
    const have = (G.statXp && G.statXp[s]) || 0;
    const need = statXpThreshold(G.stats[s]);
    const fill = mini.querySelector('.xp-mini-fill');
    fill.style.width = Math.min(100, (have / need) * 100) + '%';
    label.textContent = have + ' / ' + need;
  });
}

function renderMonsters() {
  const grid = $('monster-grid');
  grid.innerHTML = '';
  const maxTier = unlockedTier();
  Object.entries(MONSTERS).forEach(([key, m]) => {
    if (m.tier > maxTier + 1) return;
    const locked = m.tier > maxTier;
    const card = document.createElement('div');
    card.className = 'mon-card' + (locked ? ' locked' : '');
    const dropList = Object.keys(m.drops).map(function (k) {
      return RESOURCES[k] ? RESOURCES[k].icon : '?';
    }).join(' ');
    const sxp = statXpPerKill(m);
    card.innerHTML =
      '<div class="mc-icon">' + m.icon + '</div>' +
      '<div class="mc-name">' + m.name + '</div>' +
      '<div class="mc-tier">Tier ' + m.tier + '</div>' +
      '<div class="mc-meta">' +
        '<span>+XP ' + m.xp + '</span>' +
        '<span class="mm-stat">+' + sxp + ' ' + m.trains.slice(0, 3).toUpperCase() + '</span>' +
      '</div>' +
      '<div class="mc-meta"><span>' + dropList + '</span></div>' +
      (locked ? '<div class="mc-lock">Lv ' + tierUnlockLevel(m.tier) + '+</div>' : '');
    if (!locked) card.onclick = function () { startCombat(key); };
    grid.appendChild(card);
  });
}

// ============================================================
// Combat (hub-style, vs a single chosen monster)
// ============================================================

let combatState = null;
let combatTimer = null;

function weaponStats() {
  const w = G.weapon;
  const h = HEROES[G.hero];
  let total = w.basePower;
  for (let i = 0; i < ELEMENTS.length; i++) {
    total += Math.floor((w.elements[ELEMENTS[i]] || 0) / 10);
  }
  let strDmg, magDmg;
  if (h.scaling === 'strength')      { strDmg = total * 0.85; magDmg = total * 0.15; }
  else if (h.scaling === 'intellect'){ strDmg = total * 0.15; magDmg = total * 0.85; }
  else                                { strDmg = total * 0.50; magDmg = total * 0.50; }
  return { total: total, strDmg: strDmg, magDmg: magDmg };
}

function playerAttack() {
  const w = weaponStats();
  const raw = w.strDmg * (1 + G.stats.strength * 0.18) + w.magDmg * (1 + G.stats.intellect * 0.18);
  const crit = Math.random() < 0.12;
  const dmg = Math.max(1, Math.round(raw * (0.85 + Math.random() * 0.3) * (crit ? 2 : 1)));
  return { dmg: dmg, crit: crit };
}

// Element synergy: spells of element X gain ×(1 + weapon.X% / 200).
// A 100%-fire weapon gives fire spells ×1.5; 50% gives ×1.25.
function spellElementBonus(elKey) {
  if (!elKey || !G.weapon) return 1;
  const pct = G.weapon.elements[elKey] || 0;
  return 1 + (pct / 200);
}
function spellDamage(spell) {
  const elBonus = spellElementBonus(spell.element);
  const raw = spell.power * (8 + G.stats.intellect * 2 + G.stats.mana * 0.5) * elBonus;
  const crit = Math.random() < 0.10;
  const dmg = Math.max(1, Math.round(raw * (0.9 + Math.random() * 0.25) * (crit ? 1.8 : 1)));
  return { dmg: dmg, crit: crit, bonus: elBonus };
}

// Pick best (highest power) affordable damage spell from loadout.
function pickDamageSpell() {
  let best = null, bestPower = -1;
  (G.loadout || []).forEach(function (k) {
    const s = SPELLS[k];
    if (!s || s.kind !== 'damage') return;
    if (G.mana < s.cost) return;
    if (s.power > bestPower) { best = k; bestPower = s.power; }
  });
  return best;
}

// Pick strongest affordable heal from loadout.
function pickHealSpell() {
  let best = null, bestPct = -1;
  (G.loadout || []).forEach(function (k) {
    const s = SPELLS[k];
    if (!s || s.kind !== 'heal') return;
    if (G.mana < s.cost) return;
    if (s.healPct > bestPct) { best = k; bestPct = s.healPct; }
  });
  return best;
}
function monsterAttack(m) {
  const raw = m.atk * (1 + (m.tier ? (m.tier - 1) : 0) * 0.05);
  const dmg = Math.max(1, Math.round(raw * (0.85 + Math.random() * 0.3) - G.stats.defence * 0.45));
  return { dmg: dmg };
}

function startCombat(monKey) {
  if (G.busy) return;
  regenTick();
  if (G.hp <= 5) {
    toast('You are too weak — rest a moment.');
    return;
  }
  const m = MONSTERS[monKey];
  const h = HEROES[G.hero];
  combatState = {
    monKey: monKey, mon: m,
    monHp: m.hp, monMax: m.hp,
    youHp: G.hp
  };
  $('hunt-you-sprite').textContent = h.portrait;
  $('hunt-you-name').textContent = h.name;
  $('hunt-foe-sprite').textContent = m.icon;
  $('hunt-foe-sprite').className = 'sprite entering';
  setTimeout(function () { $('hunt-foe-sprite').className = 'sprite'; }, 460);
  $('hunt-foe-name').textContent = m.name;
  $('hunt-foe-resist').innerHTML = formatResistance(m);
  $('hunt-log').innerHTML = '';
  $('hunt-flee').style.display = '';
  $('hunt-flee').disabled = false;
  $('hunt-continue').style.display = 'none';
  $('hunt-panel').classList.add('combat-mode');
  $('hunt-title').textContent = 'Battle';
  $('hunt-hint').textContent = m.name + ' · Tier ' + m.tier;
  updateCombatBars();
  G.busy = true;
  cmbLog('<span class="you">A wild ' + m.name + ' appears!</span>');
  scheduleCombatTick(550);
}

function updateCombatBars() {
  if (!combatState) return;
  $('hunt-you-hp-fill').style.width = Math.max(0, (combatState.youHp / maxHp()) * 100) + '%';
  $('hunt-you-mp-fill').style.width = Math.max(0, (G.mana / maxMana()) * 100) + '%';
  $('hunt-foe-hp-fill').style.width = Math.max(0, (combatState.monHp / combatState.monMax) * 100) + '%';
  $('hunt-foe-hpval').textContent = Math.max(0, combatState.monHp) + ' / ' + combatState.monMax;
}

function cmbLog(html) {
  const el = $('hunt-log');
  if (!el) return;
  const p = document.createElement('p');
  p.innerHTML = html;
  el.appendChild(p);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 30) el.removeChild(el.firstChild);
}

// ---- Sprite & FX helpers (work for any arena) ----

function _animSprite(spriteEl, cls, ms) {
  if (!spriteEl) return;
  spriteEl.classList.remove(cls);
  void spriteEl.offsetWidth;
  spriteEl.classList.add(cls);
  setTimeout(function () { spriteEl.classList.remove(cls); }, ms || 600);
}

function fxFloat(arenaEl, side, text, kind) {
  if (!arenaEl) return;
  const d = document.createElement('div');
  d.className = 'fx-dmg ' + side + (kind ? ' ' + kind : '');
  d.textContent = text;
  arenaEl.appendChild(d);
  setTimeout(function () { try { arenaEl.removeChild(d); } catch(e) {} }, 950);
}
function fxProjectile(arenaEl, dir, glyph, color) {
  if (!arenaEl) return;
  const d = document.createElement('div');
  d.className = 'fx-proj ' + (dir === 'right' ? 'toFoe' : 'toYou');
  d.textContent = glyph;
  if (color) d.style.color = color;
  arenaEl.appendChild(d);
  setTimeout(function () { try { arenaEl.removeChild(d); } catch(e) {} }, 560);
}

const ELEMENT_GLYPH = {
  fire: '🔥', water: '💧', earth: '🪨', ice: '❄️',
  lightning: '⚡', arcane: '✨', physical: '✦'
};

function spellGlyph(spell) {
  return spell.icon || ELEMENT_GLYPH[spell.element] || '✨';
}

// Render the resistance badge HTML for a foe (top 3 strongest deviations).
function formatResistance(foe) {
  if (!foe || !foe.resist) return '';
  const items = [];
  for (const e in foe.resist) {
    const m = foe.resist[e];
    if (m === 1) continue;
    items.push({ e: e, m: m });
  }
  if (!items.length) return '';
  items.sort(function (a, b) { return Math.abs(b.m - 1) - Math.abs(a.m - 1); });
  return items.slice(0, 3).map(function (it) {
    const g = ELEMENT_GLYPH[it.e] || it.e;
    const cls = it.m < 1 ? 'r-resist' : 'r-weak';
    return '<span class="' + cls + '">' + g + '×' + it.m.toFixed(1) + '</span>';
  }).join(' ');
}

function scheduleCombatTick(delay) {
  if (combatTimer) clearTimeout(combatTimer);
  combatTimer = setTimeout(combatTick, delay);
}

function combatTick() {
  if (!combatState) return;
  const arena = $('hunt-arena');
  const youSprite = $('hunt-you-sprite');
  const foeSprite = $('hunt-foe-sprite');

  // 1. Emergency heal at <20% HP.
  const hpPct = combatState.youHp / maxHp();
  if (hpPct < 0.20) {
    const healKey = pickHealSpell();
    if (healKey) {
      const s = SPELLS[healKey];
      G.mana -= s.cost;
      const heal = Math.round(maxHp() * s.healPct);
      combatState.youHp = Math.min(maxHp(), combatState.youHp + heal);
      _animSprite(youSprite, 'cast', 500);
      fxFloat(arena, 'you', '+' + heal, 'heal');
      cmbLog('<span class="heal">You cast ' + s.icon + ' ' + s.name + '</span> — restored ' + heal + ' HP');
      updateCombatBars();
      setTimeout(huntFoeSwing, 520);
      return;
    }
  }

  // 2. Weapon attack — melee animation.
  const p = playerAttack();
  const wElem = weaponElementOnAttack();
  const wRes = applyResistance(combatState.mon, wElem, applyArmor(combatState.mon, p.dmg));
  combatState.monHp -= wRes.dmg;
  _animSprite(youSprite, 'melee-right', 550);
  setTimeout(function () {
    _animSprite(foeSprite, 'hit', 400);
    fxFloat(arena, 'foe', String(wRes.dmg) + (p.crit ? '!' : ''), p.crit ? 'crit' : '');
  }, 230);
  cmbLog('<span class="you">You strike</span> for ' + wRes.dmg + ' ' + wElem + (p.crit ? ' <span class="crit">CRIT!</span>' : '') + resistLabel(wRes.mult));
  updateCombatBars();
  if (combatState.monHp <= 0) return setTimeout(function () { finishCombat(true); }, 500);

  // 3. Damage spell — projectile FX.
  const dmgKey = pickDamageSpell();
  if (dmgKey) {
    const s = SPELLS[dmgKey];
    G.mana -= s.cost;
    const sd = spellDamage(s);
    const sRes = applyResistance(combatState.mon, s.element, sd.dmg);
    combatState.monHp -= sRes.dmg;
    setTimeout(function () {
      _animSprite(youSprite, 'cast', 500);
      fxProjectile(arena, 'right', spellGlyph(s), EL_COLORS[s.element]);
    }, 560);
    setTimeout(function () {
      _animSprite(foeSprite, 'hit', 400);
      fxFloat(arena, 'foe', String(sRes.dmg) + (sd.crit ? '!' : ''), sd.crit ? 'crit' : '');
    }, 1000);
    cmbLog('<span class="spell">You cast ' + s.icon + ' ' + s.name + '</span> — ' + sRes.dmg + ' ' + s.element + (sd.bonus > 1.001 ? ' (×' + sd.bonus.toFixed(2) + ')' : '') + (sd.crit ? ' <span class="crit">CRIT!</span>' : '') + resistLabel(sRes.mult));
    setTimeout(updateCombatBars, 1050);
    if (combatState.monHp <= 0) return setTimeout(function () { finishCombat(true); }, 1200);
    setTimeout(huntFoeSwing, 1200);
    return;
  }

  setTimeout(huntFoeSwing, 700);
}

function huntFoeSwing() {
  if (!combatState) return;
  const arena = $('hunt-arena');
  const youSprite = $('hunt-you-sprite');
  const foeSprite = $('hunt-foe-sprite');
  const m = combatState.mon;
  const mh = monsterAttack(m);
  combatState.youHp -= mh.dmg;

  _animSprite(foeSprite, 'melee-left', 550);
  setTimeout(function () {
    _animSprite(youSprite, 'hit', 400);
    fxFloat(arena, 'you', String(mh.dmg), '');
  }, 230);
  cmbLog('<span class="mon">' + m.name + ' hits</span> for ' + mh.dmg);

  G.mana = Math.min(maxMana(), G.mana + manaRegenPerTurn());
  updateCombatBars();

  if (combatState.youHp <= 0) return setTimeout(function () { finishCombat(false); }, 500);
  scheduleCombatTick(640);
}

function finishCombat(won) {
  if (!combatState) return;
  if (combatTimer) { clearTimeout(combatTimer); combatTimer = null; }
  const m = combatState.mon;
  const monKey = combatState.monKey;
  G.hp = Math.max(0, combatState.youHp);

  if (won) {
    cmbLog('<span class="win">' + m.name + ' defeated!</span>');
    _animSprite($('hunt-foe-sprite'), 'dying', 900);
    G.gold += m.gold;
    G.xp += m.xp;
    const sxp = statXpPerKill(m);
    const leveled = awardStatXp(m.trains, sxp);
    if (leveled > 0) bumpStat(m.trains);
    G.monstersDefeated[monKey] = (G.monstersDefeated[monKey] || 0) + 1;
    const drops = [];
    for (const k in m.drops) {
      const lo = m.drops[k][0], hi = m.drops[k][1];
      const q = rng(lo, hi);
      if (q > 0) {
        G.resources[k] = (G.resources[k] || 0) + q;
        drops.push(q + '× ' + (RESOURCES[k] ? RESOURCES[k].name : k));
      }
    }
    cmbLog('<span class="you">+' + m.xp + ' XP, +' + m.gold + ' gold, +' + sxp + ' ' + m.trains + '-training' + (leveled > 0 ? '  <span class="crit">(+' + leveled + ' ' + m.trains.toUpperCase() + '!)</span>' : '') + '</span>');
    if (drops.length) cmbLog('<span class="you">Found: ' + drops.join(', ') + '</span>');
    log('Defeated <b>' + m.name + '</b> — +' + m.xp + ' XP, +' + m.gold + ' ⚜, +' + sxp + ' ' + m.trains + '-training' + (leveled ? ' <span class="stat">(+' + leveled + ' ' + m.trains + ')</span>' : '') + (drops.length ? ', ' + drops.join(', ') : ''), 'gold');
    checkLevelUp();
  } else {
    cmbLog('<span class="lose">You were defeated by ' + m.name + '.</span>');
    _animSprite($('hunt-you-sprite'), 'dying', 900);
    G.hp = Math.max(1, Math.floor(maxHp() * 0.25));
    G.gold = Math.max(0, G.gold - Math.floor(m.gold * 0.5));
    log('Defeated by <b>' + m.name + '</b> — limped home with ' + G.hp + ' HP.', 'red');
  }

  $('hunt-flee').style.display = 'none';
  $('hunt-continue').style.display = '';
  touchRegen();
  save();
}

function closeCombat() {
  combatState = null;
  G.busy = false;
  $('hunt-panel').classList.remove('combat-mode');
  $('hunt-title').textContent = 'Hunting Grounds';
  $('hunt-hint').textContent = 'Tap to engage';
  render();
}

function fleeCombat() {
  if (!combatState) return;
  if (combatTimer) { clearTimeout(combatTimer); combatTimer = null; }
  G.hp = Math.max(1, combatState.youHp - 3);
  cmbLog('<span class="lose">You fled.</span>');
  touchRegen();
  combatState = null;
  $('hunt-flee').style.display = 'none';
  $('hunt-continue').style.display = '';
  log('Fled the fight.', 'red');
  save();
}

function bumpStat(stat) {
  const tile = document.querySelector('.stat-tile[data-stat="' + stat + '"]');
  if (!tile) return;
  tile.classList.remove('bumped');
  void tile.offsetWidth;
  tile.classList.add('bumped');
}

function checkLevelUp() {
  let leveled = false;
  const before = Object.assign({}, G.spellbook);
  while (G.xp >= xpForLevel(G.level)) {
    G.xp -= xpForLevel(G.level);
    G.level += 1;
    leveled = true;
    G.hp = maxHp();
    G.mana = maxMana();
  }
  if (leveled) {
    ensureSpellsForLevel();
    log('<span class="gold">Level up! You are now level ' + G.level + '.</span>', 'gold');
    toast('Level up! Lv ' + G.level);
    const newSpells = Object.keys(G.spellbook).filter(function (k) { return !before[k]; });
    newSpells.forEach(function (k) {
      log('<span class="gold">New spell learned: ' + SPELLS[k].icon + ' ' + SPELLS[k].name + '</span>', 'gold');
    });
  }
}

// ============================================================
// Forge — weapon enhancement
// ============================================================

function openForge() {
  if (G.busy) return;
  show('screen-forge');
  renderForge();
}

function renderForge() {
  const w = G.weapon;
  if (!w) return;
  $('fw-icon').textContent = w.icon;
  $('fw-name').textContent = w.name;
  const ws = weaponStats();
  $('fw-power-val').textContent = ws.total;
  $('fw-tier').textContent = w.tier || 0;

  const total = ELEMENTS.reduce(function (s, e) { return s + (w.elements[e] || 0); }, 0) || 1;
  const bar = $('fw-bar');
  bar.innerHTML = '';
  const chips = $('fw-elements');
  chips.innerHTML = '';
  ELEMENTS.forEach(function (e) {
    const v = w.elements[e] || 0;
    if (v <= 0) return;
    const pct = Math.round((v / total) * 100);
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.style.width = pct + '%';
    seg.style.background = EL_COLORS[e];
    seg.title = EL_LABELS[e] + ' ' + pct + '%';
    bar.appendChild(seg);

    const chip = document.createElement('div');
    chip.className = 'el-chip';
    chip.innerHTML = '<span class="el-dot" style="background:' + EL_COLORS[e] + '"></span>' + EL_LABELS[e] + ' ' + pct + '%';
    chips.appendChild(chip);
  });

  const list = $('forge-resources');
  list.innerHTML = '';
  let any = false;
  Object.keys(RESOURCES).forEach(function (k) {
    const have = G.resources[k] || 0;
    const r = RESOURCES[k];
    const btn = document.createElement('button');
    btn.className = 'res-btn';
    btn.disabled = have <= 0;
    if (have > 0) any = true;
    btn.innerHTML =
      '<div class="ri">' + r.icon + '</div>' +
      '<div class="rd">' +
        '<div class="rn">' + r.name + '</div>' +
        '<div class="rq">×' + have + '</div>' +
        '<div class="re">' + r.desc + '</div>' +
      '</div>';
    btn.onclick = function () { infuse(k); };
    list.appendChild(btn);
  });
  if (!any) {
    const empty = document.createElement('div');
    empty.style.cssText = 'grid-column:1/-1;text-align:center;color:var(--text3);font-style:italic;padding:14px;font-size:12px;';
    empty.textContent = 'Hunt monsters to gather essences.';
    list.appendChild(empty);
  }
}

function infuse(resKey) {
  const have = G.resources[resKey] || 0;
  if (have <= 0) return;
  const r = RESOURCES[resKey];
  if (!r) return;

  G.resources[resKey] = have - 1;
  const w = G.weapon;

  if (resKey === 'hide') {
    G.stats.defence += 1;
    bumpStat('defence');
    toast('+1 Defence');
  } else if (resKey === 'iron_scrap') {
    w.basePower += 5;
    w.elements.physical = (w.elements.physical || 0) + 6;
    w.tier += 1;
    toast('+5 Power · +Physical');
  } else if (resKey === 'fang') {
    w.basePower += 3;
    w.elements.physical = (w.elements.physical || 0) + 4;
    toast('+3 Power · +Physical');
  } else if (resKey === 'drake_scale') {
    w.basePower += 10;
    w.elements.fire = (w.elements.fire || 0) + 10;
    w.tier += 2;
    toast('+10 Power · +Fire');
  } else if (resKey === 'lich_dust') {
    w.basePower += 12;
    w.elements.arcane = (w.elements.arcane || 0) + 12;
    w.tier += 2;
    toast('+12 Power · +Arcane');
  } else if (r.element) {
    w.elements[r.element] = (w.elements[r.element] || 0) + 8;
    w.tier += 1;
    toast('+8% ' + EL_LABELS[r.element]);
  }

  reforgeName();
  save();
  renderForge();
}

function reforgeName() {
  const w = G.weapon;
  const total = ELEMENTS.reduce(function (s, e) { return s + (w.elements[e] || 0); }, 0);
  if (total <= 0) return;
  let topEl = 'physical', topV = 0;
  ELEMENTS.forEach(function (e) {
    if ((w.elements[e] || 0) > topV) { topV = w.elements[e]; topEl = e; }
  });
  const purity = topV / total;
  const typeWords = { hammer: 'Hammer', sword: 'Blade', wand: 'Wand', staff: 'Staff' };
  const base = typeWords[w.type] || 'Weapon';
  const elWord = {
    physical: 'Iron', fire: 'Flame', water: 'Tidal', earth: 'Verdant',
    ice: 'Frost', lightning: 'Storm', arcane: 'Astral'
  }[topEl];
  if (purity >= 0.9)       w.name = elWord + ' ' + base;
  else if (purity >= 0.5)  w.name = elWord + 'bound ' + base;
  else                      w.name = 'Hybrid ' + base;
}

// ============================================================
// Dungeon — auto-battle through escalating phases
// ============================================================

let dungeonState = null;
let dungeonTimer = null;

function openDungeon() {
  if (G.busy) return;
  regenTick();
  if (G.hp < Math.floor(maxHp() * 0.4)) {
    toast('Rest first — HP too low.');
    return;
  }
  G.busy = true;
  G.inDungeon = true;
  // Start where the player asked, capped at the furthest checkpoint reached.
  const startPhase = Math.min(Math.max(1, G.dungeonPhase || 1), Math.max(1, G.dungeonStart || 1));
  dungeonState = {
    phase: startPhase,
    startPhase: startPhase,
    kills: 0,
    totalKills: 0,
    xpGained: 0,
    goldGained: 0,
    drops: {},
    statXpGains: { strength: 0, intellect: 0, defence: 0, mana: 0 },
    statLevelGains: { strength: 0, intellect: 0, defence: 0, mana: 0 },
    youHp: G.hp,
    foe: null,
    fled: false
  };
  const h = HEROES[G.hero];
  $('dun-you-sprite').textContent = h.portrait;
  $('dun-you-name').textContent = h.name;
  $('dun-log').innerHTML = '';
  show('screen-dungeon');
  spawnDungeonFoe();
}

function dungeonPickFoe(phase, boss) {
  // Tier scales with phase. Boss phases bias toward the top of the range.
  const tierBase = Math.min(10, Math.max(1, Math.ceil(phase / 3)));
  const tierMin = boss ? tierBase : tierBase;
  const tierMax = boss ? Math.min(10, tierBase + 2) : Math.min(10, tierBase + 1);
  const pool = Object.entries(MONSTERS).filter(function (kv) {
    return kv[1].tier >= tierMin && kv[1].tier <= tierMax;
  });
  if (!pool.length) return ['slime', MONSTERS.slime];
  if (boss) {
    // Pick highest tier in the pool for boss flavour.
    pool.sort(function (a, b) { return b[1].tier - a[1].tier; });
    return pool[0];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function isBossPhase(phase) {
  return phase >= 5 && phase % 5 === 0;
}

function spawnDungeonFoe() {
  if (!dungeonState) return;
  const phase = dungeonState.phase;
  const boss = isBossPhase(phase);
  const picked = dungeonPickFoe(phase, boss);
  const key = picked[0], base = picked[1];

  // Steeper scaling: hp = base × (1 + (p-1)·0.20), atk × (1 + (p-1)·0.16).
  let hpScale  = 1 + (phase - 1) * 0.20;
  let atkScale = 1 + (phase - 1) * 0.16;
  let xpScale  = 1 + (phase - 1) * 0.14;
  let goldScale= 1 + (phase - 1) * 0.10;
  let name = base.name;
  let resist = Object.assign({}, base.resist || {});

  if (boss) {
    hpScale  *= 2.5;
    atkScale *= 1.4;
    xpScale  *= 3.0;
    goldScale*= 2.5;
    name = 'Elder ' + base.name;
    // Sharpen its primary resistance and add a second one if missing.
    let strongest = null, strongV = 1;
    for (const e in resist) {
      if (resist[e] < strongV) { strongV = resist[e]; strongest = e; }
    }
    if (strongest) resist[strongest] = Math.max(0.15, resist[strongest] - 0.15);
    // Add physical resistance for bosses without one.
    if (!resist.physical) resist.physical = 0.75;
  }

  const foe = {
    key: key, name: name, icon: base.icon,
    hp: Math.round(base.hp * hpScale), max: Math.round(base.hp * hpScale),
    atk: Math.round(base.atk * atkScale), def: base.def,
    tier: base.tier,
    xp: Math.round(base.xp * xpScale), gold: Math.round(base.gold * goldScale),
    drops: base.drops, trains: base.trains,
    resist: resist,
    boss: boss
  };
  dungeonState.foe = foe;
  $('dun-phase').textContent = (boss ? '⚔ BOSS · Phase ' : 'Phase ') + phase;
  const ico = $('dun-foe-sprite');
  ico.textContent = foe.icon;
  _animSprite(ico, 'entering', 460);
  $('dun-foe-name').textContent = foe.name;
  $('dun-foe-resist').innerHTML = formatResistance(foe);
  refreshDungeonBars();
  $('dun-kills').textContent = dungeonState.totalKills;
  $('dun-gold').textContent = dungeonState.goldGained;
  $('dun-xp').textContent = dungeonState.xpGained;
  if (boss) {
    dungeonLog('<span class="crit">⚔ ELDER ' + base.name.toUpperCase() + '</span> — one kill ends the phase.');
  } else {
    dungeonLog('<span class="you">Phase ' + phase + '</span> — a ' + foe.name + ' blocks your path.');
  }
  scheduleDungeonTick(620);
}

function refreshDungeonBars() {
  if (!dungeonState) return;
  const f = dungeonState.foe;
  $('dun-you-hp-fill').style.width = Math.max(0, (dungeonState.youHp / maxHp()) * 100) + '%';
  $('dun-you-mp-fill').style.width = Math.max(0, (G.mana / maxMana()) * 100) + '%';
  $('dun-foe-hp-fill').style.width = Math.max(0, (f.hp / f.max) * 100) + '%';
  $('dun-foe-hpval').textContent = Math.max(0, f.hp) + ' / ' + f.max;
}

function dungeonLog(html) {
  const el = $('dun-log');
  if (!el) return;
  const p = document.createElement('p');
  p.innerHTML = html;
  el.appendChild(p);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 30) el.removeChild(el.firstChild);
}

function scheduleDungeonTick(delay) {
  if (dungeonTimer) clearTimeout(dungeonTimer);
  dungeonTimer = setTimeout(dungeonTick, delay);
}

function dungeonTick() {
  if (!dungeonState || dungeonState.fled) return;
  const arena = $('dun-arena');
  const youSprite = $('dun-you-sprite');
  const foeSprite = $('dun-foe-sprite');
  const foe = dungeonState.foe;

  // 1. Emergency heal.
  const hpPct = dungeonState.youHp / maxHp();
  if (hpPct < 0.20) {
    const healKey = pickHealSpell();
    if (healKey) {
      const s = SPELLS[healKey];
      G.mana -= s.cost;
      const heal = Math.round(maxHp() * s.healPct);
      dungeonState.youHp = Math.min(maxHp(), dungeonState.youHp + heal);
      _animSprite(youSprite, 'cast', 500);
      fxFloat(arena, 'you', '+' + heal, 'heal');
      dungeonLog('<span class="heal">You cast ' + s.icon + ' ' + s.name + '</span> — +' + heal + ' HP');
      refreshDungeonBars();
      setTimeout(dungeonFoeSwing, 520);
      return;
    }
  }

  // 2. Weapon swing.
  const p = playerAttack();
  const wElem = weaponElementOnAttack();
  const wRes = applyResistance(foe, wElem, applyArmor(foe, p.dmg));
  foe.hp -= wRes.dmg;
  _animSprite(youSprite, 'melee-right', 550);
  setTimeout(function () {
    _animSprite(foeSprite, 'hit', 400);
    fxFloat(arena, 'foe', String(wRes.dmg) + (p.crit ? '!' : ''), p.crit ? 'crit' : '');
  }, 230);
  dungeonLog('<span class="you">You hit</span> ' + foe.name + ' for ' + wRes.dmg + ' ' + wElem + (p.crit ? ' <span class="crit">CRIT!</span>' : '') + resistLabel(wRes.mult));
  refreshDungeonBars();
  if (foe.hp <= 0) return setTimeout(function () { dungeonFoeDown(foe); }, 480);

  // 3. Damage spell.
  const dmgKey = pickDamageSpell();
  if (dmgKey) {
    const s = SPELLS[dmgKey];
    G.mana -= s.cost;
    const sd = spellDamage(s);
    const sRes = applyResistance(foe, s.element, sd.dmg);
    foe.hp -= sRes.dmg;
    setTimeout(function () {
      _animSprite(youSprite, 'cast', 500);
      fxProjectile(arena, 'right', spellGlyph(s), EL_COLORS[s.element]);
    }, 560);
    setTimeout(function () {
      _animSprite(foeSprite, 'hit', 400);
      fxFloat(arena, 'foe', String(sRes.dmg) + (sd.crit ? '!' : ''), sd.crit ? 'crit' : '');
    }, 1000);
    dungeonLog('<span class="spell">You cast ' + s.icon + ' ' + s.name + '</span> — ' + sRes.dmg + ' ' + s.element + (sd.bonus > 1.001 ? ' (×' + sd.bonus.toFixed(2) + ')' : '') + (sd.crit ? ' <span class="crit">CRIT!</span>' : '') + resistLabel(sRes.mult));
    setTimeout(refreshDungeonBars, 1050);
    if (foe.hp <= 0) return setTimeout(function () { dungeonFoeDown(foe); }, 1200);
    setTimeout(dungeonFoeSwing, 1200);
    return;
  }

  setTimeout(dungeonFoeSwing, 700);
}

function dungeonFoeSwing() {
  if (!dungeonState || dungeonState.fled) return;
  const arena = $('dun-arena');
  const youSprite = $('dun-you-sprite');
  const foeSprite = $('dun-foe-sprite');
  const foe = dungeonState.foe;
  const mh = monsterAttack(foe);
  dungeonState.youHp -= mh.dmg;

  _animSprite(foeSprite, 'melee-left', 550);
  setTimeout(function () {
    _animSprite(youSprite, 'hit', 400);
    fxFloat(arena, 'you', String(mh.dmg), '');
  }, 230);
  dungeonLog('<span class="mon">' + foe.name + ' hits</span> you for ' + mh.dmg);
  G.mana = Math.min(maxMana(), G.mana + manaRegenPerTurn());
  refreshDungeonBars();
  if (dungeonState.youHp <= 0) return setTimeout(function () { endDungeon(false); }, 500);
  scheduleDungeonTick(640);
}

function dungeonFoeDown(foe) {
  dungeonLog('<span class="win">' + foe.name + ' falls.</span>');
  _animSprite($('dun-foe-sprite'), 'dying', 900);
  dungeonState.kills += 1;         // kills within the current phase
  dungeonState.totalKills += 1;    // kills across the whole run
  dungeonState.xpGained += foe.xp;
  dungeonState.goldGained += foe.gold;
  const sxp = statXpPerKill(foe);
  dungeonState.statXpGains[foe.trains] = (dungeonState.statXpGains[foe.trains] || 0) + sxp;
  const leveled = awardStatXp(foe.trains, sxp);
  if (leveled > 0) dungeonState.statLevelGains[foe.trains] += leveled;
  for (const k in foe.drops) {
    const lo = foe.drops[k][0], hi = foe.drops[k][1];
    const q = rng(lo, hi);
    if (q > 0) dungeonState.drops[k] = (dungeonState.drops[k] || 0) + q;
  }

  // Phase clear: boss = 1 kill, normal = 3 kills.
  const phaseClear = foe.boss ? true : (dungeonState.kills % 3 === 0);
  if (phaseClear) {
    const newPhase = dungeonState.phase + 1;
    dungeonState.phase = newPhase;
    // Persistent checkpoint — only ever moves forward. If the player was
    // already starting from the checkpoint, carry their choice along with it.
    const atCheckpoint = (G.dungeonStart || 1) >= (G.dungeonPhase || 1);
    if (newPhase > (G.dungeonPhase || 1)) {
      G.dungeonPhase = newPhase;
      if (atCheckpoint) G.dungeonStart = newPhase;
    }
    if (newPhase > G.dungeonBest) G.dungeonBest = newPhase;
    // Reset in-phase kill counter so the next phase needs its own 3 kills.
    dungeonState.kills = 0;
    dungeonState.youHp = Math.min(maxHp(), dungeonState.youHp + Math.floor(maxHp() * 0.15));
    G.mana = Math.min(maxMana(), G.mana + Math.floor(maxMana() * 0.30));
    dungeonLog('<span class="you">Checkpoint! Phase ' + newPhase + ' begins.</span>');
    save();
  }
  setTimeout(spawnDungeonFoe, 800);
}

function fleeDungeon() {
  if (!dungeonState) return;
  dungeonState.fled = true;
  if (dungeonTimer) { clearTimeout(dungeonTimer); dungeonTimer = null; }
  endDungeon(true);
}

function endDungeon(survived) {
  if (!dungeonState) return;
  if (dungeonTimer) { clearTimeout(dungeonTimer); dungeonTimer = null; }
  const ds = dungeonState;
  G.hp = Math.max(1, ds.youHp);
  G.xp += ds.xpGained;
  G.gold += ds.goldGained;
  // Stat XP/levels already awarded incrementally in dungeonFoeDown.
  for (const k in ds.drops) G.resources[k] = (G.resources[k] || 0) + ds.drops[k];
  const newBest = ds.phase > G.dungeonBest;
  if (newBest) G.dungeonBest = ds.phase;
  G.busy = false;
  G.inDungeon = false;
  touchRegen();

  showResults(survived, ds, newBest);
  checkLevelUp();
  save();
  dungeonState = null;
}

function showResults(survived, ds, newBest) {
  show('screen-results');
  const t = $('result-title');
  t.textContent = survived ? 'YOU LIVE TO TELL THE TALE' : 'DEFEATED';
  t.className = survived ? 'win' : 'lose';
  const list = $('result-list');
  list.innerHTML = '';
  const lines = [];
  lines.push(['Run started at', 'Phase ' + (ds.startPhase || 1)]);
  lines.push(['Reached', 'Phase ' + ds.phase + (survived ? '' : ' (died)')]);
  lines.push(['Checkpoint', 'Phase ' + (G.dungeonPhase || 1) + ' (furthest reached)']);
  lines.push(['Foes felled', ds.totalKills || 0]);
  lines.push(['XP gained', '+' + ds.xpGained]);
  lines.push(['Gold gained', '+' + ds.goldGained + ' ⚜']);
  const sxpGains = Object.entries(ds.statXpGains)
    .filter(function (kv) { return kv[1] > 0; })
    .map(function (kv) { return '+' + kv[1] + ' ' + kv[0]; });
  if (sxpGains.length) lines.push(['Stat training', sxpGains.join(', ')]);
  const slvls = Object.entries(ds.statLevelGains || {})
    .filter(function (kv) { return kv[1] > 0; })
    .map(function (kv) { return '+' + kv[1] + ' ' + kv[0]; });
  if (slvls.length) lines.push(['Stat level-ups', slvls.join(', ')]);
  const dropsTxt = Object.entries(ds.drops).map(function (kv) {
    return kv[1] + '× ' + (RESOURCES[kv[0]] ? RESOURCES[kv[0]].name : kv[0]);
  });
  if (dropsTxt.length) lines.push(['Resources', dropsTxt.join(', ')]);
  if (newBest) lines.push(['New best phase', ds.phase]);
  if (!survived) {
    lines.push(['Tip', 'Power up your stats, forge, and loadout — then return.']);
  }
  lines.forEach(function (pair) {
    const row = document.createElement('div');
    row.className = 'result-line';
    row.innerHTML = '<span class="lbl">' + pair[0] + '</span><span class="val">' + pair[1] + '</span>';
    list.appendChild(row);
  });
  log('Dungeon run — phase ' + ds.phase + ', ' + (ds.totalKills || 0) + ' kills, +' + ds.xpGained + ' XP, +' + ds.goldGained + ' ⚜.', survived ? 'gold' : 'red');
}

// ============================================================
// Spellbook screen
// ============================================================

function openSpellbook() {
  if (G.busy) return;
  show('screen-spellbook');
  renderSpellbook();
}

function renderSpellbook() {
  ensureSpellsForLevel();

  $('sb-mp-fill').style.width = Math.max(0, (G.mana / maxMana()) * 100) + '%';
  $('sb-mp-val').textContent = G.mana + ' / ' + maxMana();

  // Loadout slots
  const slots = $('sb-loadout');
  slots.innerHTML = '';
  for (let i = 0; i < LOADOUT_SIZE; i++) {
    const key = G.loadout[i];
    const slot = document.createElement('div');
    if (key && SPELLS[key]) {
      const s = SPELLS[key];
      slot.className = 'sb-slot filled' + (s.kind === 'heal' ? ' heal' : '');
      slot.innerHTML =
        '<div class="ico">' + s.icon + '</div>' +
        '<div class="nm">' + s.name + '</div>' +
        '<div class="ct">' + s.cost + ' MP</div>';
      (function (k) { slot.onclick = function () { unequipSpell(k); }; })(key);
    } else {
      slot.className = 'sb-slot empty';
      slot.innerHTML = '<div class="ico">＋</div><div class="nm">empty</div>';
    }
    slots.appendChild(slot);
  }

  // Known + locked.
  const known = $('sb-known');
  const locked = $('sb-locked');
  const lockedTitle = $('sb-locked-title');
  known.innerHTML = '';
  locked.innerHTML = '';

  const sortedKeys = Object.keys(SPELLS);
  const knownKeys = sortedKeys.filter(function (k) { return G.spellbook[k]; });
  const lockedKeys = sortedKeys.filter(function (k) { return !G.spellbook[k]; });

  if (knownKeys.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'grid-column:1/-1;text-align:center;color:var(--text3);font-style:italic;padding:14px;font-size:12px;';
    empty.textContent = 'No spells yet — level up.';
    known.appendChild(empty);
  } else {
    knownKeys.forEach(function (k) {
      const s = SPELLS[k];
      const equipped = loadoutHas(k);
      let synergy = '';
      if (s.kind === 'damage') {
        const bonus = spellElementBonus(s.element);
        if (bonus > 1.001) {
          synergy = ' <span style="color:#ffd966;font-weight:700;">×' + bonus.toFixed(2) + '</span>';
        }
      }
      const btn = document.createElement('button');
      btn.className = 'spell-btn' + (s.kind === 'heal' ? ' heal' : '') + (equipped ? ' equipped' : '');
      btn.innerHTML =
        '<div class="si">' + s.icon + '</div>' +
        '<div class="sd">' +
          '<div class="sn">' + s.name + (equipped ? '  ✓' : '') + '</div>' +
          '<div class="sm">' + s.cost + ' MP · ' + (s.kind === 'heal' ? '+' + Math.round(s.healPct * 100) + '% HP' : (s.element + ' dmg' + synergy)) + '</div>' +
          '<div class="se">' + s.desc + '</div>' +
        '</div>';
      btn.onclick = function () {
        if (equipped) unequipSpell(k);
        else equipSpell(k);
      };
      known.appendChild(btn);
    });
  }

  // Locked previews — what unlocks next.
  if (lockedKeys.length === 0) {
    lockedTitle.style.display = 'none';
  } else {
    lockedTitle.style.display = '';
    // For each locked spell, find its unlock level.
    const lvlForSpell = {};
    Object.keys(SPELL_UNLOCKS).forEach(function (lvl) {
      SPELL_UNLOCKS[lvl].forEach(function (s) { if (lvlForSpell[s] === undefined) lvlForSpell[s] = +lvl; });
    });
    lockedKeys.forEach(function (k) {
      const s = SPELLS[k];
      const lvl = lvlForSpell[k] || '?';
      const btn = document.createElement('button');
      btn.className = 'spell-btn';
      btn.disabled = true;
      btn.innerHTML =
        '<div class="si">🔒</div>' +
        '<div class="sd">' +
          '<div class="sn">' + s.name + '</div>' +
          '<div class="sm">' + s.cost + ' MP</div>' +
          '<div class="se">Unlocks at Lv ' + lvl + '</div>' +
        '</div>';
      locked.appendChild(btn);
    });
  }
}

function equipSpell(key) {
  if (!G.spellbook[key]) return;
  if (loadoutHas(key)) return;
  if (isLoadoutFull()) {
    toast('Loadout full — remove one first.');
    return;
  }
  G.loadout.push(key);
  save();
  renderSpellbook();
  toast('Equipped ' + SPELLS[key].name);
}

function unequipSpell(key) {
  const i = G.loadout.indexOf(key);
  if (i < 0) return;
  G.loadout.splice(i, 1);
  save();
  renderSpellbook();
}

// ============================================================
// Wire-up
// ============================================================

// Bind by id, tolerating a missing element — the service worker can serve a
// cached index.html that predates a control added here.
function on(id, fn) {
  const el = $(id);
  if (el) el.onclick = fn;
}

function wire() {
  on('btn-forge', openForge);
  on('btn-spellbook', openSpellbook);
  on('btn-dungeon', openDungeon);
  on('btn-camp', makeCamp);
  on('dun-phase-down', function () { stepDungeonPhase(-1); });
  on('dun-phase-up', function () { stepDungeonPhase(1); });
  on('forge-back', function () { show('screen-hub'); render(); });
  on('spellbook-back', function () { show('screen-hub'); render(); });
  on('hunt-flee', fleeCombat);
  on('hunt-continue', closeCombat);
  on('dun-flee', fleeDungeon);
  on('result-continue', function () { show('screen-hub'); render(); });
}

// Recovery ticks on a timer while you're idle in the hub. Nothing is written
// to storage here — the regen clocks are timestamps, so the next real save
// (or reload) reconstructs exactly the same result.
const REGEN_TICK_MS = 4000;
function startRegenLoop() {
  setInterval(function () {
    if (!G.hero || G.busy) return;
    const hub = $('screen-hub');
    if (!hub || !hub.classList.contains('active')) return;
    if (regenTick()) renderVitals();
  }, REGEN_TICK_MS);
}

function init() {
  wire();
  load();
  render();
  startRegenLoop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for auth.js
window.render = render;
window.G = G;

})();
