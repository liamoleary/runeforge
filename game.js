/* ============================================================
 * RuneForge — an Old School RuneScape-flavoured skilling RPG.
 *
 * The loop:
 *   chop & mine  ->  smelt & smith gear  ->  clear a dungeon
 *   dungeon drops the reagent + gems the NEXT gear tier needs
 *   better gear -> deeper dungeon -> better reagents -> repeat
 *
 * One character. Eight skills on the real OSRS experience curve.
 * State lives in window.G and persists via auth.js's save plumbing.
 * ============================================================ */
(function () {
'use strict';

// ============================================================
// Experience — the genuine OSRS table
// ============================================================

const MAX_LEVEL = 99;

// xp(L) = floor( (1/4) * sum(l=1..L-1) floor(l + 300 * 2^(l/7)) )
// Gives the familiar 83 / 174 / 276 ... 13,034,431 progression.
const XP_TABLE = (function () {
  const table = [0, 0];
  let points = 0;
  for (let l = 1; l < MAX_LEVEL; l++) {
    points += Math.floor(l + 300 * Math.pow(2, l / 7));
    table[l + 1] = Math.floor(points / 4);
  }
  return table;
})();

function xpAtLevel(level) {
  return XP_TABLE[Math.min(MAX_LEVEL, Math.max(1, level))] || 0;
}
function levelFromXp(xp) {
  let l = 1;
  while (l < MAX_LEVEL && xp >= XP_TABLE[l + 1]) l++;
  return l;
}

// ============================================================
// Skills
// ============================================================

const SKILLS = {
  attack:      { name: 'Attack',      icon: '⚔️', group: 'combat', blurb: 'Wield better weapons, land more hits.' },
  strength:    { name: 'Strength',    icon: '💪', group: 'combat', blurb: 'Raises your maximum hit.' },
  defence:     { name: 'Defence',     icon: '🛡️', group: 'combat', blurb: 'Wear better armour, take fewer hits.' },
  hitpoints:   { name: 'Hitpoints',   icon: '❤️', group: 'combat', blurb: 'Your life total. Starts at 10.' },
  woodcutting: { name: 'Woodcutting', icon: '🪓', group: 'gather', blurb: 'Fell better trees for better logs.' },
  mining:      { name: 'Mining',      icon: '⛏️', group: 'gather', blurb: 'Break richer rocks for better ore.' },
  smithing:    { name: 'Smithing',    icon: '🔨', group: 'craft',  blurb: 'Smelt bars and forge weapons & armour.' },
  crafting:    { name: 'Crafting',    icon: '💍', group: 'craft',  blurb: 'Cut dungeon gems into amulets.' }
};
const SKILL_KEYS = Object.keys(SKILLS);
const STARTING_LEVELS = { hitpoints: 10 };   // as in OSRS

// ============================================================
// Items
// ============================================================

const ITEMS = {
  // Logs
  logs:            { name: 'Logs',            icon: '🪵' },
  oak_logs:        { name: 'Oak Logs',        icon: '🪵' },
  willow_logs:     { name: 'Willow Logs',     icon: '🪵' },
  maple_logs:      { name: 'Maple Logs',      icon: '🍁' },
  yew_logs:        { name: 'Yew Logs',        icon: '🌲' },
  magic_logs:      { name: 'Magic Logs',      icon: '✨' },
  // Ores
  copper_ore:      { name: 'Copper Ore',      icon: '🟤' },
  iron_ore:        { name: 'Iron Ore',        icon: '🔩' },
  coal:            { name: 'Coal',            icon: '⚫' },
  mithril_ore:     { name: 'Mithril Ore',     icon: '🔵' },
  adamantite_ore:  { name: 'Adamantite Ore',  icon: '🟢' },
  runite_ore:      { name: 'Runite Ore',      icon: '🔷' },
  // Bars
  bronze_bar:      { name: 'Bronze Bar',      icon: '🟫' },
  iron_bar:        { name: 'Iron Bar',        icon: '⬜' },
  steel_bar:       { name: 'Steel Bar',       icon: '⬛' },
  mithril_bar:     { name: 'Mithril Bar',     icon: '🟦' },
  adamant_bar:     { name: 'Adamant Bar',     icon: '🟩' },
  rune_bar:        { name: 'Rune Bar',        icon: '🟪' },
  // Dungeon reagents — gate the upper gear tiers
  ember_core:      { name: 'Ember Core',      icon: '🔥' },
  frost_shard:     { name: 'Frost Shard',     icon: '❄️' },
  storm_crystal:   { name: 'Storm Crystal',   icon: '⚡' },
  dragon_ash:      { name: 'Dragon Ash',      icon: '🐲' },
  // Gems — Crafting feedstock
  sapphire:        { name: 'Sapphire',        icon: '💎' },
  emerald:         { name: 'Emerald',         icon: '💚' },
  ruby:            { name: 'Ruby',            icon: '❤️' },
  diamond:         { name: 'Diamond',         icon: '💠' },
  dragonstone:     { name: 'Dragonstone',     icon: '🟣' }
};

function itemName(key) { return (ITEMS[key] || GEAR[key] || { name: key }).name; }
function itemIcon(key) { return (ITEMS[key] || GEAR[key] || { icon: '❔' }).icon; }

// ============================================================
// Gathering nodes
// ============================================================

// ms is the base time per swing; higher level nodes are slower but richer.
const TREES = [
  { key: 'tree',   name: 'Tree',        icon: '🌳', req: 1,  xp: 25,  ms: 2600, drop: 'logs' },
  { key: 'oak',    name: 'Oak',         icon: '🌳', req: 10, xp: 60,  ms: 3000, drop: 'oak_logs' },
  { key: 'willow', name: 'Willow',      icon: '🌾', req: 20, xp: 130, ms: 3400, drop: 'willow_logs' },
  { key: 'maple',  name: 'Maple',       icon: '🍁', req: 30, xp: 250, ms: 3800, drop: 'maple_logs' },
  { key: 'yew',    name: 'Yew',         icon: '🌲', req: 40, xp: 450, ms: 4400, drop: 'yew_logs' },
  { key: 'magic',  name: 'Magic Tree',  icon: '✨', req: 50, xp: 800, ms: 5000, drop: 'magic_logs' }
];

const ROCKS = [
  { key: 'copper',     name: 'Copper Rock',     icon: '🟤', req: 1,  xp: 25,  ms: 2600, drop: 'copper_ore' },
  { key: 'iron',       name: 'Iron Rock',       icon: '🔩', req: 10, xp: 60,  ms: 3000, drop: 'iron_ore' },
  { key: 'coal',       name: 'Coal Rock',       icon: '⚫', req: 20, xp: 130, ms: 3400, drop: 'coal' },
  { key: 'mithril',    name: 'Mithril Rock',    icon: '🔵', req: 30, xp: 250, ms: 3800, drop: 'mithril_ore' },
  { key: 'adamantite', name: 'Adamantite Rock', icon: '🟢', req: 40, xp: 450, ms: 4400, drop: 'adamantite_ore' },
  { key: 'runite',     name: 'Runite Rock',     icon: '🔷', req: 50, xp: 800, ms: 5000, drop: 'runite_ore' }
];

// ============================================================
// Metals, gear and recipes
// ============================================================

// One row per metal tier. `reagent` is the dungeon drop that tier needs —
// this is what forces a dungeon clear between gear upgrades. `logs` is the
// plank grade a handle/backing needs, which is what keeps Woodcutting relevant.
const METALS = [
  { key: 'bronze',  name: 'Bronze',  tier: 1, smith: 1,  wield: 1,  bar: 'bronze_bar',  barXp: 40,   logs: 'logs',        reagent: null,
    smelt: { copper_ore: 2 } },
  { key: 'iron',    name: 'Iron',    tier: 2, smith: 10, wield: 5,  bar: 'iron_bar',    barXp: 90,   logs: 'oak_logs',    reagent: null,
    smelt: { iron_ore: 2 } },
  { key: 'steel',   name: 'Steel',   tier: 3, smith: 20, wield: 10, bar: 'steel_bar',   barXp: 200,  logs: 'willow_logs', reagent: 'ember_core',
    smelt: { iron_ore: 1, coal: 2 } },
  { key: 'mithril', name: 'Mithril', tier: 4, smith: 30, wield: 20, bar: 'mithril_bar', barXp: 400,  logs: 'maple_logs',  reagent: 'frost_shard',
    smelt: { mithril_ore: 1, coal: 3 } },
  { key: 'adamant', name: 'Adamant', tier: 5, smith: 40, wield: 30, bar: 'adamant_bar', barXp: 700,  logs: 'yew_logs',    reagent: 'storm_crystal',
    smelt: { adamantite_ore: 1, coal: 4 } },
  { key: 'rune',    name: 'Rune',    tier: 6, smith: 50, wield: 40, bar: 'rune_bar',    barXp: 1200, logs: 'magic_logs',  reagent: 'dragon_ash',
    smelt: { runite_ore: 1, coal: 6 } }
];
function metal(key) { return METALS.filter(function (m) { return m.key === key; })[0]; }

const SLOTS = ['weapon', 'body', 'shield', 'amulet'];
const SLOT_NAMES = { weapon: 'Weapon', body: 'Body', shield: 'Shield', amulet: 'Amulet' };

// Bonuses are deliberately on the OSRS scale so the combat formulas below
// behave the way a RuneScape player expects.
// `craftMs` is the bench time for the piece at exactly its requirement level.
// Heavier, more valuable pieces take noticeably longer to hammer out.
const GEAR_KINDS = [
  { key: 'sword',     name: 'Sword',     slot: 'weapon', icon: '🗡️', bars: 2, logs: 1, craftMs: 3400,
    atk: function (t) { return 2 + t * 9; },  str: function (t) { return 2 + t * 8; },  def: function () { return 0; } },
  { key: 'platebody', name: 'Platebody', slot: 'body',   icon: '🦺', bars: 5, logs: 0, craftMs: 7000,
    atk: function () { return 0; },           str: function () { return 0; },           def: function (t) { return 4 + t * 11; } },
  { key: 'shield',    name: 'Shield',    slot: 'shield', icon: '🛡️', bars: 3, logs: 1, craftMs: 4600,
    atk: function () { return 0; },           str: function () { return 0; },           def: function (t) { return 3 + t * 8; } }
];

// Crafting: dungeon gems become amulets. Pure stat sticks, one per dungeon tier.
const AMULETS = [
  { key: 'sapphire_amulet',    name: 'Sapphire Amulet',    icon: '💎', gem: 'sapphire',    craft: 1,  xp: 260,   craftMs: 4000,  atk: 4,  str: 3,  def: 3 },
  { key: 'emerald_amulet',     name: 'Emerald Amulet',     icon: '💚', gem: 'emerald',     craft: 12, xp: 700,   craftMs: 5000,  atk: 8,  str: 6,  def: 6 },
  { key: 'ruby_amulet',        name: 'Ruby Amulet',        icon: '❤️', gem: 'ruby',        craft: 22, xp: 1700,  craftMs: 6200,  atk: 14, str: 11, def: 10 },
  { key: 'diamond_amulet',     name: 'Diamond Amulet',     icon: '💠', gem: 'diamond',     craft: 32, xp: 3800,  craftMs: 7600,  atk: 21, str: 17, def: 15 },
  { key: 'dragonstone_amulet', name: 'Dragonstone Amulet', icon: '🟣', gem: 'dragonstone', craft: 43, xp: 8200,  craftMs: 9200,  atk: 30, str: 25, def: 22 }
];

// Cross metals with gear kinds to build the smithable catalogue, then fold in
// the amulets. Everything downstream just reads GEAR.
const GEAR = {};
METALS.forEach(function (m) {
  GEAR_KINDS.forEach(function (k) {
    const cost = {};
    cost[m.bar] = k.bars;
    if (k.logs) cost[m.logs] = k.logs;
    if (m.reagent) cost[m.reagent] = 1;
    GEAR[m.key + '_' + k.key] = {
      name: m.name + ' ' + k.name,
      icon: k.icon,
      slot: k.slot,
      tier: m.tier,
      metal: m.key,
      atk: k.atk(m.tier), str: k.str(m.tier), def: k.def(m.tier),
      // Requirement to make it vs. requirement to wear it.
      makeReq: { smithing: m.smith },
      wearReq: k.slot === 'weapon' ? { attack: m.wield } : { defence: m.wield },
      cost: cost,
      xp: Math.round(m.barXp * k.bars * 1.8),
      // Better metal is harder to work: the same piece takes longer each tier.
      baseMs: Math.round(k.craftMs * (1 + m.tier * 0.22)),
      skill: 'smithing'
    };
  });
});
AMULETS.forEach(function (a) {
  const cost = {};
  cost[a.gem] = 1;
  GEAR[a.key] = {
    name: a.name, icon: a.icon, slot: 'amulet', tier: 0,
    atk: a.atk, str: a.str, def: a.def,
    makeReq: { crafting: a.craft },
    wearReq: {},
    cost: cost,
    xp: a.xp,
    baseMs: a.craftMs,
    skill: 'crafting'
  };
});

// ============================================================
// Recipes — one shape for smelting, smithing and crafting
// ============================================================

// Every level above a recipe's requirement shaves time off, down to a floor.
// Coming back to an old recipe at high level feels dramatically quicker.
const CRAFT_SPEED_PER_LEVEL = 0.022;
const CRAFT_SPEED_FLOOR = 0.35;

function craftSpeedFactor(skill, req) {
  const over = Math.max(0, lvl(skill) - req);
  return Math.max(CRAFT_SPEED_FLOOR, 1 - over * CRAFT_SPEED_PER_LEVEL);
}
function craftMs(recipe) {
  return Math.max(400, Math.round(recipe.baseMs * craftSpeedFactor(recipe.skill, recipe.req)));
}

// Smelting recipes, one per metal.
const SMELT_RECIPES = METALS.map(function (m) {
  return {
    id: 'smelt_' + m.key,
    kind: 'smelt',
    name: m.name + ' Bar',
    icon: ITEMS[m.bar].icon,
    skill: 'smithing',
    req: m.smith,
    cost: m.smelt,
    xp: m.barXp,
    out: m.bar,
    baseMs: Math.round(1200 * (1 + m.tier * 0.18))
  };
});

// Smithing / crafting recipes, one per wearable.
const MAKE_RECIPES = Object.keys(GEAR).map(function (key) {
  const g = GEAR[key];
  return {
    id: 'make_' + key,
    kind: 'make',
    name: g.name,
    icon: g.icon,
    skill: g.skill,
    req: g.makeReq[g.skill],
    cost: g.cost,
    xp: g.xp,
    out: key,
    baseMs: g.baseMs,
    gear: g
  };
});
const ALL_RECIPES = SMELT_RECIPES.concat(MAKE_RECIPES);
function recipeById(id) {
  return ALL_RECIPES.filter(function (r) { return r.id === id; })[0];
}

// ============================================================
// Dungeons
// ============================================================

// Each dungeon is a fixed run of waves ending in a boss. Clearing it unlocks
// the next one and is the only source of that tier's reagent + gem.
const DUNGEONS = [
  {
    key: 'warren', name: 'Rat Warren', icon: '🐀',
    blurb: 'Damp tunnels under the village. Something has been breeding down here.',
    waves: 5,
    monsters: [
      { name: 'Giant Rat',   icon: '🐀', hp: 11,  atk: 6,  def: 1, maxHit: 5 },
      { name: 'Cave Slime',  icon: '🟢', hp: 15,  atk: 7,  def: 1, maxHit: 6 }
    ],
    boss: { name: 'Warren Brood-Mother', icon: '🕷️', hp: 26, atk: 10, def: 2, maxHit: 10 },
    drops: { ember_core: [1, 2], sapphire: [0, 1] },
    clearDrops: { ember_core: 3, sapphire: 2 }
  },
  {
    key: 'crypt', name: 'Frozen Crypt', icon: '❄️',
    blurb: 'A barrow sealed in black ice. The cold bites through bronze.',
    waves: 6,
    monsters: [
      { name: 'Frost Ghoul',  icon: '🧟', hp: 22, atk: 22, def: 6, maxHit: 5 },
      { name: 'Ice Wraith',   icon: '👻', hp: 30, atk: 24, def: 7, maxHit: 6 }
    ],
    boss: { name: 'The Hoarfrost Knight', icon: '🛡️', hp: 54, atk: 30, def: 12, maxHit: 7 },
    drops: { frost_shard: [1, 2], emerald: [0, 1] },
    clearDrops: { frost_shard: 3, emerald: 2 }
  },
  {
    key: 'spire', name: 'Storm Spire', icon: '⚡',
    blurb: 'A tower struck by lightning so often the stone has turned to glass.',
    waves: 7,
    monsters: [
      { name: 'Storm Sprite',  icon: '⚡', hp: 41,  atk: 39, def: 14, maxHit: 6 },
      { name: 'Thunder Golem', icon: '🗿', hp: 54,  atk: 43, def: 16, maxHit: 8 }
    ],
    boss: { name: 'Skyfather Vool', icon: '🌩️', hp: 108, atk: 52, def: 25, maxHit: 11 },
    drops: { storm_crystal: [1, 2], ruby: [0, 1] },
    clearDrops: { storm_crystal: 3, ruby: 2 }
  },
  {
    key: 'roost', name: "Dragon's Roost", icon: '🐲',
    blurb: 'The heat alone kills the unprepared. Bring the best steel you have.',
    waves: 8,
    monsters: [
      { name: 'Whelp',        icon: '🦎', hp: 60,  atk: 57, def: 24, maxHit: 7 },
      { name: 'Ember Drake',  icon: '🐉', hp: 81,  atk: 63, def: 27, maxHit: 9 }
    ],
    boss: { name: 'Ashmaw the Elder', icon: '🐲', hp: 167, atk: 75, def: 39, maxHit: 13 },
    drops: { dragon_ash: [1, 2], diamond: [0, 1] },
    clearDrops: { dragon_ash: 3, diamond: 2 }
  },
  {
    key: 'abyss', name: 'The Abyss', icon: '🌌',
    blurb: 'Nothing comes back from here without rune on its back.',
    waves: 9,
    monsters: [
      { name: 'Abyssal Leech',  icon: '🪱', hp: 86,  atk: 80, def: 35, maxHit: 10 },
      { name: 'Void Stalker',   icon: '👁️', hp: 116, atk: 88, def: 39, maxHit: 11 }
    ],
    boss: { name: 'The Hollow King', icon: '👑', hp: 251, atk: 104, def: 54, maxHit: 17 },
    drops: { dragonstone: [0, 1], dragon_ash: [1, 2] },
    clearDrops: { dragonstone: 3, dragon_ash: 4 }
  }
];
function dungeonAt(i) { return DUNGEONS[i] || null; }

// ============================================================
// Boons — the in-run build
// ============================================================
//
// Clearing a wave grants a run level; each run level offers a choice of three
// boons. Lines escalate — take the first tier and the next becomes offerable —
// so a run grows into an identity (necromancer, stormcaller, berserker).
// NONE OF THIS PERSISTS. Boons live and die with the dungeon run; the eight
// skills stay purely about gear.

const BOON_LINES = {
  emberbrand: {
    name: 'Emberbrand', icon: '🔥', blurb: 'Fire',
    tiers: [
      { name: 'Kindling',   desc: '30% chance your strike carries +25% fire damage.' },
      { name: 'Wildfire',   desc: 'Fire strikes set the foe alight — 3 damage a round for 2 rounds.' },
      { name: 'Immolation', desc: 'A burning foe that dies detonates onto the next for 30% of its health.' }
    ]
  },
  frostbite: {
    name: 'Frostbite', icon: '❄️', blurb: 'Ice',
    tiers: [
      { name: 'Chill',     desc: '30% chance to chill — the foe\'s next blow lands for half.' },
      { name: 'Deep Cold', desc: 'Chilled foes also lose a quarter of their armour.' },
      { name: 'Cold Snap', desc: 'Kill a chilled foe and the next one arrives frozen, losing a turn.' }
    ]
  },
  stormcaller: {
    name: 'Stormcaller', icon: '⚡', blurb: 'Lightning',
    tiers: [
      { name: 'Arc',        desc: '25% chance your hit arcs, striking again for half.' },
      { name: 'Chain',      desc: 'Arcs can arc again — lightning chains.' },
      { name: 'Thunderhead',desc: 'Every fifth strike arcs twice, guaranteed.' }
    ]
  },
  necromancy: {
    name: 'Necromancy', icon: '💀', blurb: 'Undeath',
    tiers: [
      { name: 'Siphon',   desc: 'Killing a foe restores 12% of your health.' },
      { name: 'Shade',    desc: 'Each kill raises a shade — every shade adds 30% of your max hit. Fades after 3 rounds.' },
      { name: 'Undying',  desc: 'Shades no longer fade.' }
    ]
  },
  stoneblood: {
    name: 'Stoneblood', icon: '🪨', blurb: 'Endurance',
    tiers: [
      { name: 'Hardened',  desc: 'You take 15% less damage.' },
      { name: 'Retort',    desc: 'Reflect a quarter of the damage you take.' },
      { name: 'Last Stand',desc: 'Once a wave, survive a killing blow at 1 hp and heal a quarter.' }
    ]
  },
  bloodlust: {
    name: 'Bloodlust', icon: '🩸', blurb: 'Fury',
    tiers: [
      { name: 'Reckless', desc: '+3 to your max hit, but 10% off your health.' },
      { name: 'Cornered', desc: 'Below half health you deal 50% more damage.' },
      { name: 'Rampage',  desc: 'Every kill permanently adds +1 max hit for the rest of the run.' }
    ]
  },
  voidtouched: {
    name: 'Voidtouched', icon: '🌌', blurb: 'Arcane',
    tiers: [
      { name: 'Sunder',    desc: 'Your strikes ignore 30% of the foe\'s armour.' },
      { name: 'Rupture',   desc: '20% chance a strike lands doubled.' },
      { name: 'Devour',    desc: 'Doubled strikes heal you for half the damage dealt.' }
    ]
  },
  scavenger: {
    name: 'Scavenger', icon: '🐀', blurb: 'Cunning',
    tiers: [
      { name: 'Pickings',  desc: 'This run yields 50% more loot.' },
      { name: 'Second Wind', desc: 'Recover an extra 15% health between waves.' },
      { name: 'Opportunist', desc: 'Every wave cleared grants a free first-tier boon.' }
    ]
  }
};
const BOON_KEYS = Object.keys(BOON_LINES);
const MAX_BOON_TIER = 3;

// Each dungeon draws from its own lines, so the Crypt reliably makes
// necromancers and the Spire makes stormcallers.
const DUNGEON_BOONS = {
  warren: ['scavenger', 'emberbrand', 'stoneblood', 'bloodlust'],
  crypt:  ['frostbite', 'necromancy', 'stoneblood', 'voidtouched'],
  spire:  ['stormcaller', 'voidtouched', 'bloodlust', 'frostbite'],
  roost:  ['emberbrand', 'bloodlust', 'stormcaller', 'stoneblood'],
  abyss:  ['voidtouched', 'necromancy', 'emberbrand', 'frostbite']
};

function boonTier(key) {
  return (runState && runState.boons && runState.boons[key]) || 0;
}
function boonName(key, tier) {
  const line = BOON_LINES[key];
  return line ? line.tiers[tier - 1].name : key;
}

// Offer the next tier of lines already started (so builds compound), topped up
// with fresh lines from this dungeon's pool.
function rollBoonChoices(count) {
  if (!runState) return [];
  const pool = DUNGEON_BOONS[runState.d.key] || BOON_KEYS;
  const upgrades = [], fresh = [];
  pool.forEach(function (key) {
    const t = boonTier(key);
    if (t >= MAX_BOON_TIER) return;
    (t > 0 ? upgrades : fresh).push({ key: key, tier: t + 1 });
  });
  shuffle(upgrades);
  shuffle(fresh);
  // Weight toward escalation, but always leave room to branch.
  const picks = [];
  while (picks.length < count && (upgrades.length || fresh.length)) {
    const takeUpgrade = upgrades.length && (picks.length < count - 1 || !fresh.length);
    picks.push(takeUpgrade ? upgrades.shift() : (fresh.shift() || upgrades.shift()));
  }
  return picks;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function grantBoon(key, tier) {
  if (!runState) return;
  runState.boons[key] = tier;
  runLog('<span class="boon">' + BOON_LINES[key].icon + ' ' +
    boonName(key, tier) + '</span> — ' + BOON_LINES[key].tiers[tier - 1].desc);
  // Reckless trades health for damage the moment it's taken.
  if (key === 'bloodlust' && tier === 1) {
    runState.hpPenalty = 0.10;
    G.hp = Math.min(G.hp, maxHp());
  }
}

// ============================================================
// State
// ============================================================

const SAVE_KEY = 'rforge';
const SAVE_VERSION = 2;

function freshSkills() {
  const s = {};
  SKILL_KEYS.forEach(function (k) {
    const lvl = STARTING_LEVELS[k] || 1;
    s[k] = { xp: xpAtLevel(lvl) };
  });
  return s;
}

function defaultState() {
  return {
    version: SAVE_VERSION,
    skills: freshSkills(),
    hp: lifeAtLevel(STARTING_LEVELS.hitpoints || 1),   // start at full health
    hpRegenAt: 0,
    inventory: {},
    equipped: { weapon: null, body: null, shield: null, amulet: null },
    dungeonsCleared: 0,     // index of the deepest dungeon beaten
    deepestAttempt: 0,
    busy: false,
    tab: 'skills'
  };
}

const G = window.G = defaultState();

// ---- skill helpers ----

function skillXp(key) { return (G.skills[key] && G.skills[key].xp) || 0; }
function lvl(key) { return levelFromXp(skillXp(key)); }
function totalLevel() {
  return SKILL_KEYS.reduce(function (sum, k) { return sum + lvl(k); }, 0);
}
function combatLevel() {
  // A pared-down version of the OSRS melee formula.
  const base = (lvl('defence') + lvl('hitpoints')) / 4;
  const melee = 0.325 * (lvl('attack') + lvl('strength'));
  return Math.floor(base + melee);
}
// RuneScape ties life directly to the Hitpoints level; we give it a wider
// spread so a big hit is dangerous rather than instantly lethal.
function lifeAtLevel(hpLevel) { return 10 + hpLevel * 2; }
function maxHp() {
  const base = lifeAtLevel(lvl('hitpoints'));
  // Bloodlust trades health for damage, but only for the duration of a run.
  const penalty = (runState && runState.hpPenalty) || 0;
  return Math.max(1, Math.round(base * (1 - penalty)));
}

// Grants xp and returns how many levels it caused, so callers can celebrate.
function addXp(key, amount) {
  if (!amount || !G.skills[key]) return 0;
  const before = lvl(key);
  G.skills[key].xp = Math.min(xpAtLevel(MAX_LEVEL), skillXp(key) + Math.round(amount));
  const after = lvl(key);
  if (after > before) {
    // Levelling Hitpoints heals you by the difference, as in RuneScape.
    if (key === 'hitpoints') G.hp += (after - before);
    onLevelUp(key, after);
  }
  return after - before;
}

// ---- inventory helpers ----

function have(key) { return G.inventory[key] || 0; }
function addItem(key, qty) {
  if (qty <= 0) return;
  G.inventory[key] = have(key) + qty;
}
function takeItem(key, qty) {
  const n = have(key);
  if (n < qty) return false;
  if (n === qty) delete G.inventory[key];
  else G.inventory[key] = n - qty;
  return true;
}
function canAfford(cost) {
  for (const k in cost) if (have(k) < cost[k]) return false;
  return true;
}
function payCost(cost) {
  if (!canAfford(cost)) return false;
  for (const k in cost) takeItem(k, cost[k]);
  return true;
}
function meetsReq(req) {
  for (const k in req) if (lvl(k) < req[k]) return false;
  return true;
}
function reqText(req) {
  const parts = [];
  for (const k in req) parts.push(SKILLS[k].name + ' ' + req[k]);
  return parts.join(', ');
}

// ---- equipment ----

function equippedList() {
  return SLOTS.map(function (s) { return G.equipped[s]; }).filter(Boolean);
}
function gearBonus(stat) {
  return equippedList().reduce(function (sum, key) {
    const g = GEAR[key];
    return sum + (g ? (g[stat] || 0) : 0);
  }, 0);
}

// A single number for "how good is this piece". Within a slot every stat
// pulls in the same direction, so a plain sum ranks them sensibly.
function gearScore(g) {
  if (!g) return 0;
  return (g.atk || 0) + (g.str || 0) + (g.def || 0);
}

// How this piece compares with whatever occupies its slot right now.
function upgradeDelta(key) {
  const g = GEAR[key];
  if (!g) return null;
  const worn = G.equipped[g.slot];
  return gearScore(g) - gearScore(worn ? GEAR[worn] : null);
}

// The best piece you own for each slot, counting what's already worn.
// Only pieces you actually meet the requirements for can be "best".
function bestOwnedPerSlot() {
  const best = {};
  SLOTS.forEach(function (s) { best[s] = null; });
  function consider(key) {
    const g = GEAR[key];
    if (!g || !meetsReq(g.wearReq)) return;
    const cur = best[g.slot];
    if (!cur || gearScore(g) > gearScore(GEAR[cur])) best[g.slot] = key;
  }
  Object.keys(G.inventory).forEach(function (k) { if (have(k) > 0) consider(k); });
  SLOTS.forEach(function (s) { if (G.equipped[s]) consider(G.equipped[s]); });
  return best;
}

// True if something strictly better than the worn piece is sitting in the pack.
function hasUpgradeInPack(slot) {
  const worn = G.equipped[slot];
  const wornScore = gearScore(worn ? GEAR[worn] : null);
  return Object.keys(G.inventory).some(function (k) {
    const g = GEAR[k];
    return g && have(k) > 0 && g.slot === slot && meetsReq(g.wearReq) && gearScore(g) > wornScore;
  });
}

function equip(key) {
  const g = GEAR[key];
  if (!g || have(key) <= 0) return;
  if (!meetsReq(g.wearReq)) {
    toast('Requires ' + reqText(g.wearReq));
    return;
  }
  const slot = g.slot;
  const current = G.equipped[slot];
  takeItem(key, 1);
  if (current) addItem(current, 1);
  G.equipped[slot] = key;
  save();
  render();
  toast('Equipped ' + g.name);
}

function unequip(slot) {
  const key = G.equipped[slot];
  if (!key) return;
  G.equipped[slot] = null;
  addItem(key, 1);
  save();
  render();
}

// ---- Disenchanting ----

// Each unit of the original recipe gets an independent roll to come back.
// Deliberately below half, so breaking gear down is a way to recover from a
// mistake, never a cheaper route to materials than mining them.
const SALVAGE_CHANCE = 0.4;

function salvageYield(key) {
  const g = GEAR[key];
  const out = {};
  if (!g || !g.cost) return out;
  for (const mat in g.cost) {
    let got = 0;
    for (let i = 0; i < g.cost[mat]; i++) if (Math.random() < SALVAGE_CHANCE) got++;
    if (got > 0) out[mat] = got;
  }
  return out;
}

function disenchant(key) {
  const g = GEAR[key];
  if (!g || have(key) <= 0) return;
  takeItem(key, 1);
  const got = salvageYield(key);
  const parts = [];
  for (const mat in got) {
    addItem(mat, got[mat]);
    parts.push(got[mat] + '× ' + itemName(mat));
  }
  if (parts.length) {
    feed('Disenchanted <b>' + g.name + '</b> — recovered ' + parts.join(', ') + '.', 'make');
    toast('Recovered ' + parts.join(', '));
  } else {
    feed('Disenchanted <b>' + g.name + '</b> — nothing salvageable.', 'lose');
    toast('Nothing recovered.');
  }
  save();
  render();
}

// Breaking gear is destructive and irreversible, so it always asks first.
function confirmDisenchant(key) {
  const g = GEAR[key];
  if (!g) return;
  const expected = [];
  for (const mat in g.cost) {
    expected.push(itemIcon(mat) + ' up to ' + g.cost[mat] + '× ' + itemName(mat));
  }
  askConfirm(
    'Disenchant ' + g.name + '?',
    'This destroys the item. Each material has a ' + Math.round(SALVAGE_CHANCE * 100) +
      '% chance to come back:<br><span class="cf-mats">' + expected.join('<br>') + '</span>',
    'DISENCHANT',
    function () { disenchant(key); }
  );
}

let confirmAction = null;
function askConfirm(title, body, okLabel, onOk) {
  const m = $('confirm');
  if (!m) { if (onOk) onOk(); return; }
  $('cf-title').textContent = title;
  $('cf-body').innerHTML = body;
  $('cf-ok').textContent = okLabel || 'CONFIRM';
  confirmAction = onOk;
  m.classList.add('show');
}
function closeConfirm(run) {
  const m = $('confirm');
  if (m) m.classList.remove('show');
  const fn = confirmAction;
  confirmAction = null;
  if (run && fn) fn();
}

// ============================================================
// Persistence
// ============================================================

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {}
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || s === null) return;
    // v1 was a different game entirely — nothing in it maps onto skills.
    if (s.version !== SAVE_VERSION) return;

    Object.assign(G, defaultState(), s);

    // Repair anything a hand-edited or partial save might be missing.
    if (typeof G.skills !== 'object' || !G.skills) G.skills = freshSkills();
    SKILL_KEYS.forEach(function (k) {
      if (!G.skills[k] || typeof G.skills[k].xp !== 'number' || G.skills[k].xp < 0) {
        G.skills[k] = { xp: xpAtLevel(STARTING_LEVELS[k] || 1) };
      }
    });
    if (typeof G.inventory !== 'object' || !G.inventory) G.inventory = {};
    for (const k in G.inventory) {
      if (!ITEMS[k] && !GEAR[k]) delete G.inventory[k];
      else if (typeof G.inventory[k] !== 'number' || G.inventory[k] <= 0) delete G.inventory[k];
    }
    if (typeof G.equipped !== 'object' || !G.equipped) G.equipped = {};
    SLOTS.forEach(function (s) {
      const key = G.equipped[s];
      if (!key || !GEAR[key] || GEAR[key].slot !== s) G.equipped[s] = null;
    });
    if (typeof G.dungeonsCleared !== 'number' || G.dungeonsCleared < 0) G.dungeonsCleared = 0;
    G.dungeonsCleared = Math.min(DUNGEONS.length, G.dungeonsCleared);
    if (typeof G.hp !== 'number' || G.hp <= 0) G.hp = maxHp();
    if (G.hp > maxHp()) G.hp = maxHp();
    if (typeof G.hpRegenAt !== 'number' || !G.hpRegenAt) G.hpRegenAt = Date.now();
    G.busy = false;
    regenTick();
  } catch (e) {}
}

window.save = save;
window.load = load;
// auth.js calls this once a cloud save has landed in localStorage.
window.applyLoadedSave = function () { load(); render(); };

// ============================================================
// Recovery — hitpoints tick back in real time, even while closed
// ============================================================

const REGEN_PCT_PER_MIN = 25;   // a quarter of your life bar per minute

function touchRegen() { G.hpRegenAt = Date.now(); }

function regenTick() {
  const now = Date.now();
  if (!G.hpRegenAt || G.hpRegenAt > now) G.hpRegenAt = now;
  if (G.busy) { G.hpRegenAt = now; return false; }
  const mh = maxHp();
  if (G.hp >= mh) { G.hp = mh; G.hpRegenAt = now; return false; }
  const perMs = mh * (REGEN_PCT_PER_MIN / 100) / 60000;
  const gain = Math.floor((now - G.hpRegenAt) * perMs);
  if (gain <= 0) return false;
  G.hp = Math.min(mh, G.hp + gain);
  G.hpRegenAt += Math.ceil(gain / perMs);
  return true;
}

// ============================================================
// Combat maths — OSRS accuracy & max hit, simplified
// ============================================================

// Shaped like the OSRS max-hit formula, scaled up a little so early fights
// aren't decided one point of damage at a time.
function playerMaxHit() {
  const str = lvl('strength');
  const bonus = gearBonus('str');
  let hit = Math.max(1, Math.floor(2 + str / 7 + bonus / 45 + (str * bonus) / 420));
  if (runState) {                       // run-only, from boons
    if (boonTier('bloodlust') >= 1) hit += 3;
    hit += runState.rampage || 0;
  }
  return hit;
}
function playerAttackRoll() {
  return (lvl('attack') + 8) * (gearBonus('atk') + 64);
}
function playerDefenceRoll() {
  return (lvl('defence') + 8) * (gearBonus('def') + 64);
}
function monsterAttackRoll(m) { return (m.atk + 8) * 64; }
function monsterDefenceRoll(m) { return (m.def + 8) * 64; }

// Probability an attack roll beats a defence roll.
function hitChance(attRoll, defRoll) {
  if (attRoll > defRoll) return 1 - (defRoll + 2) / (2 * (attRoll + 1));
  return attRoll / (2 * (defRoll + 1));
}

function rollDamage(maxHit, attRoll, defRoll) {
  if (Math.random() >= hitChance(attRoll, defRoll)) return 0;   // a splash
  return Math.floor(Math.random() * (maxHit + 1));
}

// Damage dealt feeds the combat skills, RuneScape style. OSRS pays 4xp per
// point of damage to the style you're using plus 1.33 Hitpoints; with no
// style switching to manage, every combat skill takes a share each hit.
const COMBAT_XP_PER_DAMAGE = 8;
function awardCombatXp(damage) {
  if (damage <= 0) return;
  addXp('attack', damage * COMBAT_XP_PER_DAMAGE);
  addXp('strength', damage * COMBAT_XP_PER_DAMAGE);
  addXp('defence', damage * COMBAT_XP_PER_DAMAGE);
  addXp('hitpoints', damage * (COMBAT_XP_PER_DAMAGE / 3));
}

// ============================================================
// DOM helpers
// ============================================================

function $(id) { return document.getElementById(id); }
function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
function rng(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }

// Drive a bar from 0 to 100% over `ms`, restarting the transition cleanly.
function runProgressBar(fill, ms) {
  if (!fill) return;
  fill.style.transition = 'none';
  fill.style.width = '0%';
  void fill.offsetWidth;
  fill.style.transition = 'width ' + ms + 'ms linear';
  fill.style.width = '100%';
}

// The active-job strips stick below the header; the header's height varies
// with the viewport, so publish it as a custom property.
function syncHeaderHeight() {
  const top = $('top');
  if (!top) return;
  document.documentElement.style.setProperty('--topbar-h', top.offsetHeight + 'px');
}

let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1700);
}

function feed(html, cls) {
  const f = $('feed');
  if (!f) return;
  const p = el('p', cls || '', html);
  f.insertBefore(p, f.firstChild);
  while (f.children.length > 40) f.removeChild(f.lastChild);
}

// ---- Level-up fanfare ----

const levelQueue = [];
let levelFxBusy = false;

function onLevelUp(key, level) {
  const s = SKILLS[key];
  feed('<b>' + s.icon + ' ' + s.name + '</b> advanced to level <b>' + level + '</b>.', 'lvl');
  levelQueue.push({ key: key, level: level });
  drainLevelQueue();
  pulseSkillTile(key);
}

function drainLevelQueue() {
  if (levelFxBusy || !levelQueue.length) return;
  const next = levelQueue.shift();
  levelFxBusy = true;
  playLevelFx(next.key, next.level, function () {
    levelFxBusy = false;
    drainLevelQueue();
  });
}

function playLevelFx(key, level, done) {
  const host = $('levelfx');
  if (!host) { if (done) done(); return; }
  const s = SKILLS[key];
  host.innerHTML =
    '<div class="lf-card">' +
      '<div class="lf-rays"></div>' +
      '<div class="lf-burst"></div>' +
      '<div class="lf-ico">' + s.icon + '</div>' +
      '<div class="lf-title">LEVEL UP</div>' +
      '<div class="lf-skill">' + s.name + '</div>' +
      '<div class="lf-lvl">' + level + '</div>' +
    '</div>';
  host.classList.add('show');

  // A few sparks flung outward from the middle.
  const card = host.querySelector('.lf-card');
  for (let i = 0; i < 14; i++) {
    const spark = el('div', 'lf-spark');
    const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
    const dist = 70 + Math.random() * 70;
    spark.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    spark.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    spark.style.animationDelay = (Math.random() * 0.12) + 's';
    card.appendChild(spark);
  }

  setTimeout(function () {
    host.classList.remove('show');
    setTimeout(function () {
      host.innerHTML = '';
      if (done) done();
    }, 320);
  }, 1650);
}

function pulseSkillTile(key) {
  const tile = document.querySelector('.skill-tile[data-skill="' + key + '"]');
  if (!tile) return;
  tile.classList.remove('levelled');
  void tile.offsetWidth;
  tile.classList.add('levelled');
}

// ============================================================
// Navigation
// ============================================================

const TABS = [
  { key: 'skills',  name: 'Skills',  icon: '📊' },
  { key: 'gather',  name: 'Gather',  icon: '🪓' },
  { key: 'forge',   name: 'Forge',   icon: '🔨' },
  { key: 'dungeon', name: 'Dungeon', icon: '🏰' },
  { key: 'gear',    name: 'Gear',    icon: '🎒' }
];

let resultsOpen = false;

function showTab(key) {
  if (runState) { toast('Finish the dungeon first.'); return; }
  // Wandering off mid-action cancels it, so nothing ticks unseen.
  if (gatherState && key !== 'gather') stopGathering(true);
  if (craftState && key !== 'forge') stopCrafting(true);
  resultsOpen = false;
  G.tab = key;
  render();
}

// ============================================================
// Rendering
// ============================================================

function render() {
  if (runState) { renderTopBar(); renderDungeonRun(); renderNav(); return; }
  regenTick();
  renderTopBar();
  renderNav();

  TABS.forEach(function (t) {
    const scr = $('screen-' + t.key);
    if (scr) scr.classList.toggle('active', !resultsOpen && t.key === G.tab);
  });
  $('screen-results').classList.toggle('active', resultsOpen);
  if (resultsOpen) return;

  if (G.tab === 'skills')  renderSkills();
  if (G.tab === 'gather')  renderGather();
  if (G.tab === 'forge')   renderForge();
  if (G.tab === 'dungeon') renderDungeonList();
  if (G.tab === 'gear')    renderGear();
}

// While you're working at something the bar slot belongs to that skill —
// progress toward the next level, and how long the wait actually is.
function activeJob() {
  if (runState) return null;
  if (gatherState) {
    return { skill: gatherState.skill, xpPer: gatherState.node.xp, ms: gatherState.node.ms };
  }
  if (craftState) {
    return { skill: craftState.recipe.skill, xpPer: craftState.recipe.xp, ms: craftState.ms };
  }
  return null;
}

function formatEta(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + (s % 60) + 's';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}

function renderTopBar() {
  $('tl-val').textContent = totalLevel();
  $('cb-val').textContent = combatLevel();

  const job = activeJob();
  const bar = $('hp-bar');

  if (job) {
    const level = lvl(job.skill);
    const xp = skillXp(job.skill);
    const cur = xpAtLevel(level);
    const next = level >= MAX_LEVEL ? cur : xpAtLevel(level + 1);
    const span = Math.max(1, next - cur);
    const into = Math.max(0, xp - cur);
    const pct = level >= MAX_LEVEL ? 100 : Math.min(100, (into / span) * 100);
    const remaining = Math.max(0, next - xp);
    const actions = job.xpPer > 0 ? Math.ceil(remaining / job.xpPer) : 0;

    bar.classList.add('xp-mode');
    bar.classList.remove('low');
    $('hp-label').textContent = SKILLS[job.skill].icon;
    $('hp-fill').style.width = pct + '%';
    $('hp-text').textContent = level >= MAX_LEVEL
      ? 'MAX'
      : Math.round(remaining).toLocaleString() + ' xp → ' + (level + 1);
    $('hp-eta').textContent = level >= MAX_LEVEL
      ? ''
      : '~' + formatEta(actions * job.ms) + ' to level ' + (level + 1);
    $('hp-eta').style.display = '';
    return;
  }

  bar.classList.remove('xp-mode');
  const mh = maxHp();
  const pct = Math.max(0, Math.min(100, (G.hp / mh) * 100));
  $('hp-label').textContent = 'HP';
  $('hp-fill').style.width = pct + '%';
  $('hp-text').textContent = Math.floor(G.hp) + ' / ' + mh;
  $('hp-eta').style.display = 'none';
  bar.classList.toggle('low', G.hp / mh < 0.35);
}

function renderNav() {
  const nav = $('nav');
  if (nav.childElementCount) {
    Array.prototype.forEach.call(nav.children, function (b) {
      b.classList.toggle('active', b.dataset.tab === G.tab);
    });
    return;
  }
  TABS.forEach(function (t) {
    const b = el('button', 'nav-btn' + (t.key === G.tab ? ' active' : ''),
      '<span class="ni">' + t.icon + '</span><span class="nl">' + t.name + '</span>');
    b.dataset.tab = t.key;
    b.onclick = function () { showTab(t.key); };
    nav.appendChild(b);
  });
}

// ---- Skills ----

function renderSkills() {
  const wrap = $('skill-grid');
  wrap.innerHTML = '';
  SKILL_KEYS.forEach(function (k) {
    const s = SKILLS[k];
    const level = lvl(k);
    const xp = skillXp(k);
    const cur = xpAtLevel(level);
    const next = level >= MAX_LEVEL ? cur : xpAtLevel(level + 1);
    const pct = level >= MAX_LEVEL ? 100 : ((xp - cur) / (next - cur)) * 100;
    const tile = el('div', 'skill-tile ' + s.group);
    tile.dataset.skill = k;
    tile.innerHTML =
      '<div class="st-top"><span class="st-ico">' + s.icon + '</span>' +
      '<span class="st-name">' + s.name + '</span>' +
      '<span class="st-lvl">' + level + '</span></div>' +
      '<div class="st-track"><div class="st-fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
      '<div class="st-xp">' + Math.floor(xp).toLocaleString() + ' xp' +
      (level >= MAX_LEVEL ? '' : ' · ' + Math.ceil(next - xp).toLocaleString() + ' to ' + (level + 1)) + '</div>';
    tile.title = s.blurb;
    wrap.appendChild(tile);
  });
  $('total-level-big').textContent = totalLevel();
}

// ---- Gather ----

function renderGather() {
  renderNodeList($('tree-list'), TREES, 'woodcutting');
  renderNodeList($('rock-list'), ROCKS, 'mining');
  const g = $('gather-active');
  if (gatherState) {
    g.style.display = '';
    $('ga-name').textContent = gatherState.verb + ' ' + gatherState.node.name;
    $('ga-icon').textContent = gatherState.node.icon;
    $('ga-count').textContent = gatherState.gained + ' × ' + itemName(gatherState.node.drop) +
      ' · ' + Math.round(gatherState.xp).toLocaleString() + ' xp';
  } else {
    g.style.display = 'none';
  }
}

function renderNodeList(wrap, nodes, skill) {
  wrap.innerHTML = '';
  const level = lvl(skill);
  nodes.forEach(function (n) {
    const locked = level < n.req;
    const active = gatherState && gatherState.node.key === n.key;
    const b = el('button', 'node-btn' + (locked ? ' locked' : '') + (active ? ' active' : ''));
    b.innerHTML =
      '<span class="nd-ico">' + n.icon + '</span>' +
      '<span class="nd-body">' +
        '<span class="nd-name">' + n.name + '</span>' +
        '<span class="nd-meta">' + (locked ? SKILLS[skill].name + ' ' + n.req + ' required'
                                           : n.xp + ' xp · ' + (n.ms / 1000).toFixed(1) + 's') + '</span>' +
      '</span>' +
      '<span class="nd-have">' + (have(n.drop) || '') + '</span>';
    if (active) {
      b.appendChild(el('span', 'rc-badge', skill === 'woodcutting' ? 'CHOPPING' : 'MINING'));
      const prog = el('span', 'rc-prog');
      prog.appendChild(el('span', 'rc-prog-fill'));
      b.appendChild(prog);
    }
    b.disabled = locked;
    if (!locked) {
      b.onclick = function () {
        if (active) { toast('Already working — tap STOP to cancel.'); return; }
        startGathering(n, skill);
      };
    }
    wrap.appendChild(b);
  });
}

// ---- Forge ----

function renderForge() {
  renderRecipeList($('smelt-list'), SMELT_RECIPES, false);
  renderRecipeList($('make-list'), MAKE_RECIPES, true);

  const strip = $('craft-active');
  if (craftState) {
    strip.style.display = '';
    $('ca-icon').textContent = craftState.recipe.icon;
    $('ca-name').textContent = 'Forging ' + craftState.recipe.name;
    $('ca-count').textContent = craftState.made + ' made · ' +
      Math.round(craftState.xp).toLocaleString() + ' xp · ' +
      (craftState.ms / 1000).toFixed(1) + 's each';
  } else {
    strip.style.display = 'none';
  }
}

function renderRecipeList(wrap, recipes, hideFarOff) {
  wrap.innerHTML = '';
  let shown = 0;
  recipes.forEach(function (r) {
    const skillLvl = lvl(r.skill);
    // Keep the gear list readable by hiding tiers far out of reach.
    if (hideFarOff && r.req > skillLvl + 22) return;
    shown++;
    const ok = skillLvl >= r.req;
    const afford = canAfford(r.cost);
    const active = craftState && craftState.recipe.id === r.id;
    const speed = craftSpeedFactor(r.skill, r.req);
    const b = el('button', 'recipe' + (ok ? '' : ' locked') + (active ? ' active' : ''));
    b.innerHTML =
      '<span class="rc-ico">' + r.icon + '</span>' +
      '<span class="rc-body">' +
        '<span class="rc-name">' + r.name + (r.gear ? statLine(r.gear) : '') + '</span>' +
        '<span class="rc-cost">' + costText(r.cost) + '</span>' +
        '<span class="rc-meta">' + (ok
          ? r.xp.toLocaleString() + ' ' + SKILLS[r.skill].name + ' xp · ' +
            (craftMs(r) / 1000).toFixed(1) + 's' +
            (speed < 0.995 ? ' <span class="rc-fast">' + Math.round((1 - speed) * 100) + '% faster</span>' : '')
          : SKILLS[r.skill].name + ' ' + r.req + ' required') + '</span>' +
      '</span>' +
      '<span class="rc-have">' + (have(r.out) || '') + '</span>';
    if (active) {
      // Progress runs along the row you actually tapped, so it's obvious the
      // job started even when the strip at the top is scrolled out of view.
      b.appendChild(el('span', 'rc-badge', 'FORGING'));
      const prog = el('span', 'rc-prog');
      prog.appendChild(el('span', 'rc-prog-fill'));
      b.appendChild(prog);
    }
    b.disabled = !ok || (!afford && !active);
    if (ok && (afford || active)) {
      b.onclick = function () {
        // Tapping the row that's already working must not silently cancel it —
        // that was the trap when the strip was off-screen. Stop is explicit.
        if (active) { toast('Already forging — tap STOP to cancel.'); return; }
        startCrafting(r);
      };
    }
    wrap.appendChild(b);
  });
  if (!shown) wrap.appendChild(el('div', 'empty', 'Nothing you can forge yet.'));
}

function statLine(g) {
  const bits = [];
  if (g.atk) bits.push('+' + g.atk + ' atk');
  if (g.str) bits.push('+' + g.str + ' str');
  if (g.def) bits.push('+' + g.def + ' def');
  return bits.length ? ' <span class="rc-stats">' + bits.join(' ') + '</span>' : '';
}

function costText(cost) {
  const parts = [];
  for (const k in cost) {
    const short = have(k) < cost[k];
    parts.push('<span class="' + (short ? 'short' : 'ok') + '">' +
      itemIcon(k) + ' ' + cost[k] + '&nbsp;' + itemName(k) + '</span>');
  }
  return parts.join(' ');
}

// ---- Crafting: takes real time, repeats while materials last ----

let craftState = null;
let craftTimer = null;

function startCrafting(recipe) {
  if (G.busy || runState) return;
  stopGathering(true);
  stopCrafting(true);
  if (lvl(recipe.skill) < recipe.req) { toast(SKILLS[recipe.skill].name + ' ' + recipe.req + ' required'); return; }
  if (!canAfford(recipe.cost)) { toast('Not enough materials.'); return; }
  craftState = { recipe: recipe, made: 0, xp: 0, ms: craftMs(recipe) };
  renderForge();
  renderTopBar();
  craftSwing();
}

function craftSwing() {
  if (!craftState) return;
  const r = craftState.recipe;
  // Materials are consumed up front so you can't queue what you can't pay for.
  // They're held as `pending` until the piece finishes, and refunded if you
  // stop partway — nobody should lose a rune bar to a mistimed tap.
  if (!payCost(r.cost)) { stopCrafting(); toast('Out of materials.'); return; }
  craftState.pending = r.cost;

  craftState.ms = craftMs(r);
  renderForge();
  // renderForge rebuilds the rows, so the bars have to be driven afterwards.
  runProgressBar($('ca-fill'), craftState.ms);
  runProgressBar(document.querySelector('.recipe.active .rc-prog-fill'), craftState.ms);

  craftTimer = setTimeout(function () {
    if (!craftState) return;
    craftState.pending = null;      // paid for and delivered
    addItem(r.out, 1);
    addXp(r.skill, r.xp);
    craftState.made += 1;
    craftState.xp += r.xp;
    flashCraftDone(r);
    feed((r.kind === 'smelt' ? 'Smelted a ' : 'Forged a ') + '<b>' + r.name + '</b>. ' +
      '<span class="xp">+' + r.xp.toLocaleString() + ' ' + SKILLS[r.skill].name + ' xp</span>', 'make');
    save();
    renderTopBar();
    if (!canAfford(r.cost)) { stopCrafting(); return; }
    craftSwing();
  }, craftState.ms);
}

function stopCrafting(quiet) {
  if (craftTimer) { clearTimeout(craftTimer); craftTimer = null; }
  const had = craftState;
  craftState = null;
  if (!had) return;
  // Hand back the materials for the piece that never got finished.
  if (had.pending) {
    for (const k in had.pending) addItem(k, had.pending[k]);
    had.pending = null;
  }
  save();
  if (!quiet) {
    if (had.made > 0) toast('Made ' + had.made + ' × ' + had.recipe.name);
    render();
  }
}

// A quick pop on the finished item so completion registers.
function flashCraftDone(recipe) {
  const strip = $('craft-active');
  if (!strip) return;
  const pop = el('div', 'craft-pop', recipe.icon);
  strip.appendChild(pop);
  setTimeout(function () { try { strip.removeChild(pop); } catch (e) {} }, 850);
}

// ---- Gear ----

function renderGear() {
  const slots = $('equip-slots');
  slots.innerHTML = '';
  SLOTS.forEach(function (s) {
    const key = G.equipped[s];
    const g = key ? GEAR[key] : null;
    const upgrade = hasUpgradeInPack(s);
    const d = el('div', 'eq-slot' + (g ? ' filled' : '') + (upgrade ? ' has-upgrade' : ''));
    d.innerHTML =
      '<div class="eq-label">' + SLOT_NAMES[s] + '</div>' +
      '<div class="eq-ico">' + (g ? g.icon : '＋') + '</div>' +
      '<div class="eq-name">' + (g ? g.name : 'empty') + '</div>' +
      (upgrade ? '<div class="eq-up">▲ upgrade</div>' : '');
    if (g) d.onclick = function () { unequip(s); };
    slots.appendChild(d);
  });

  $('bonus-atk').textContent = '+' + gearBonus('atk');
  $('bonus-str').textContent = '+' + gearBonus('str');
  $('bonus-def').textContent = '+' + gearBonus('def');
  $('bonus-hit').textContent = playerMaxHit();

  const inv = $('inv-list');
  inv.innerHTML = '';
  const keys = Object.keys(G.inventory).filter(function (k) { return have(k) > 0; });
  if (!keys.length) {
    inv.appendChild(el('div', 'empty', 'Your pack is empty. Go chop or mine something.'));
    return;
  }

  const best = bestOwnedPerSlot();
  // Upgrades float to the top, then other wearables, then raw materials.
  function rank(k) {
    const g = GEAR[k];
    if (!g) return 3;
    if (!meetsReq(g.wearReq)) return 2;
    return upgradeDelta(k) > 0 ? 0 : 1;
  }
  keys.sort(function (a, b) {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0) return upgradeDelta(b) - upgradeDelta(a);
    if (GEAR[a] && GEAR[b]) return gearScore(GEAR[b]) - gearScore(GEAR[a]);
    return itemName(a).localeCompare(itemName(b));
  });

  keys.forEach(function (k) {
    const g = GEAR[k];
    if (!g) {
      const row = el('div', 'inv-item');
      row.innerHTML =
        '<span class="iv-ico">' + itemIcon(k) + '</span>' +
        '<span class="iv-body"><span class="iv-name">' + itemName(k) + '</span></span>' +
        '<span class="iv-qty">×' + have(k) + '</span>';
      inv.appendChild(row);
      return;
    }

    const wearable = meetsReq(g.wearReq);
    const delta = upgradeDelta(k);
    const isBest = best[g.slot] === k;

    let tag = '';
    if (!wearable) {
      tag = '<span class="iv-tag locked">🔒 ' + reqText(g.wearReq) + '</span>';
    } else if (delta > 0) {
      tag = '<span class="iv-tag up">▲ UPGRADE +' + delta + '</span>';
    } else if (delta === 0) {
      tag = '<span class="iv-tag same">same as worn</span>';
    } else {
      tag = '<span class="iv-tag down">▼ ' + delta + '</span>';
    }
    if (isBest) tag = '<span class="iv-tag best">★ BEST</span>' + tag;

    const row = el('div', 'inv-item wearable' +
      (delta > 0 && wearable ? ' is-upgrade' : '') + (wearable ? '' : ' unwearable'));
    row.innerHTML =
      '<span class="iv-ico">' + g.icon + '</span>' +
      '<span class="iv-body">' +
        '<span class="iv-name">' + g.name + '</span>' +
        '<span class="iv-stats">' + statLine(g).replace(/<\/?span[^>]*>/g, '') + '</span>' +
        '<span class="iv-tags">' + tag + '</span>' +
      '</span>' +
      '<span class="iv-qty">×' + have(k) + '</span>';

    // Tapping the row equips; the salvage button is its own target.
    if (wearable) row.onclick = function () { equip(k); };
    const salv = el('button', 'iv-salvage', '♻');
    salv.title = 'Disenchant for materials';
    salv.setAttribute('aria-label', 'Disenchant ' + g.name);
    salv.onclick = function (e) { e.stopPropagation(); confirmDisenchant(k); };
    row.appendChild(salv);

    inv.appendChild(row);
  });
}

// ---- Dungeon list ----

function renderDungeonList() {
  const list = $('dungeon-list');
  list.innerHTML = '';
  DUNGEONS.forEach(function (d, i) {
    const unlocked = i <= G.dungeonsCleared;
    const cleared = i < G.dungeonsCleared;
    const card = el('div', 'dun-card' + (unlocked ? '' : ' locked') + (cleared ? ' cleared' : ''));
    card.innerHTML =
      '<div class="dc-head"><span class="dc-ico">' + d.icon + '</span>' +
        '<span class="dc-name">' + d.name + '</span>' +
        '<span class="dc-tag">' + (cleared ? 'CLEARED' : unlocked ? 'OPEN' : 'LOCKED') + '</span></div>' +
      '<div class="dc-blurb">' + d.blurb + '</div>' +
      '<div class="dc-meta">' + d.waves + ' waves · boss ' + d.boss.name +
        ' · max hit ' + d.boss.maxHit + '</div>' +
      '<div class="dc-drops">Drops: ' + Object.keys(d.clearDrops).map(function (k) {
        return itemIcon(k) + ' ' + itemName(k);
      }).join(' · ') + '</div>' +
      (unlocked ? '<button class="dc-go">ENTER</button>'
                : '<div class="dc-need">Clear ' + DUNGEONS[i - 1].name + ' first</div>');
    if (unlocked) card.querySelector('.dc-go').onclick = function () { enterDungeon(i); };
    list.appendChild(card);
  });
}

// ============================================================
// Gathering — tap once, keep swinging
// ============================================================

let gatherState = null;
let gatherTimer = null;

function startGathering(node, skill) {
  if (G.busy) return;
  stopGathering(true);
  stopCrafting(true);
  gatherState = {
    node: node, skill: skill, gained: 0, xp: 0,
    verb: skill === 'woodcutting' ? 'Chopping' : 'Mining'
  };
  renderGather();
  renderTopBar();
  gatherSwing();
}

// Same treatment as the forge: show progress on the node you tapped.
function renderNodeProgress(ms) {
  runProgressBar($('ga-fill'), ms);
  runProgressBar(document.querySelector('.node-btn.active .rc-prog-fill'), ms);
}

function gatherSwing() {
  if (!gatherState) return;
  const node = gatherState.node;
  renderNodeProgress(node.ms);

  gatherTimer = setTimeout(function () {
    if (!gatherState) return;
    addItem(node.drop, 1);
    addXp(gatherState.skill, node.xp);
    gatherState.gained += 1;
    gatherState.xp += node.xp;
    renderGather();   // refreshes both node lists, so unlocks appear as they happen
    renderTopBar();
    save();
    gatherSwing();     // re-arms the bars via renderNodeProgress
  }, node.ms);
}

function stopGathering(quiet) {
  if (gatherTimer) { clearTimeout(gatherTimer); gatherTimer = null; }
  if (gatherState && !quiet) {
    feed('Gathered <b>' + gatherState.gained + ' × ' + itemName(gatherState.node.drop) + '</b>' +
      ' <span class="xp">+' + Math.round(gatherState.xp).toLocaleString() + ' ' +
      SKILLS[gatherState.skill].name + ' xp</span>', 'gather');
  }
  gatherState = null;
  save();
  if (!quiet) render();
}

// ============================================================
// Dungeon run — auto battle through the waves
// ============================================================

let runState = null;
let runTimer = null;

// Combat pacing. Tests scale this to zero to run whole dungeons headlessly,
// so balance is measured against the real combat path rather than a copy of it.
let paceScale = 1;
function pace(ms) { return Math.max(0, Math.round(ms * paceScale)); }
// Global monster scalar. Lives at 1 in the shipped game; the calibration tool
// sweeps it to find the numbers that get baked into the monster table.
let difficultyScale = 1;
// Optional test strategy: given the offered choices, return an index to take.
let autoBoonPick = null;

function enterDungeon(index) {
  if (G.busy || runState) return;
  const d = dungeonAt(index);
  if (!d || index > G.dungeonsCleared) return;
  stopGathering(true);
  stopCrafting(true);
  regenTick();
  if (G.hp < maxHp() * 0.5) {
    toast('Too hurt — rest until you are at least half health.');
    return;
  }
  if (!G.equipped.weapon) {
    toast('Forge and equip a weapon first.');
    return;
  }

  G.busy = true;
  runState = {
    index: index, d: d,
    wave: 1,
    foe: null,
    loot: {},
    xpStart: SKILL_KEYS.reduce(function (o, k) { o[k] = skillXp(k); return o; }, {}),
    over: false,
    // Everything below is the in-run build — discarded when the run ends.
    boons: {}, runLevel: 0, pending: null,
    shades: [], rampage: 0, hitCount: 0,
    hpPenalty: 0, lastStandUsed: false,
    carryDetonate: 0, carryFreeze: false
  };
  if (index > G.deepestAttempt) G.deepestAttempt = index;
  $('run-name').textContent = d.name;
  $('run-log').innerHTML = '';
  document.body.classList.add('in-run');
  spawnFoe();
  render();
}

function spawnFoe() {
  if (!runState) return;
  const d = runState.d;
  const isBoss = runState.wave > d.waves;
  const base = isBoss ? d.boss : d.monsters[rng(0, d.monsters.length - 1)];
  const ds = difficultyScale;
  const scaledHp = Math.max(1, Math.round(base.hp * ds));
  runState.foe = {
    name: base.name, icon: base.icon,
    hp: scaledHp, max: scaledHp,
    atk: base.atk, def: base.def,
    maxHit: Math.max(1, Math.round(base.maxHit * ds)),
    boss: isBoss,
    burn: null, chill: 0, frozen: 0
  };
  const foe = runState.foe;
  // Voidtouched sunders armour for the whole fight.
  if (boonTier('voidtouched') >= 1) foe.def = Math.round(foe.def * 0.7);

  runLog(isBoss
    ? '<span class="boss">' + base.name + ' blocks the way.</span>'
    : 'Wave ' + runState.wave + ' of ' + d.waves + ' — a ' + base.name + ' attacks.');

  // Capstones that carry from the previous kill onto this foe.
  if (runState.carryDetonate) {
    foe.hp -= runState.carryDetonate;
    runLog('<span class="boon">🔥 Immolation</span> — the corpse detonates for ' +
      runState.carryDetonate + '.');
    runState.carryDetonate = 0;
  }
  if (runState.carryFreeze) {
    foe.frozen = 1;
    runLog('<span class="boon">❄️ Cold Snap</span> — it arrives frozen.');
    runState.carryFreeze = false;
  }
  if (foe.hp <= 0) {
    runLog('<span class="win">' + foe.name + ' is destroyed on arrival.</span>');
    boonOnKill(foe);
    rollLoot(foe);
    renderDungeonRun();
    runTimer = setTimeout(advanceWave, pace(800));
    return;
  }
  renderDungeonRun();
  runTimer = setTimeout(combatRound, pace(700));
}

// ---- Boon hooks ----

// Everything the player's build adds to a swing, resolved in one place.
function boonOffence(baseDmg, foe) {
  const out = { dmg: baseDmg, notes: [], extraHits: [] };
  if (baseDmg <= 0) return out;   // a miss triggers nothing

  // Bloodlust: fury when cornered.
  if (boonTier('bloodlust') >= 2 && G.hp < maxHp() * 0.5) {
    out.dmg = Math.round(out.dmg * 1.5);
    out.notes.push('cornered');
  }
  // Voidtouched: rupture doubles the blow.
  let ruptured = false;
  if (boonTier('voidtouched') >= 2 && Math.random() < 0.20) {
    out.dmg *= 2;
    ruptured = true;
    out.notes.push('rupture');
  }
  if (ruptured && boonTier('voidtouched') >= 3) {
    const heal = Math.min(maxHp() - G.hp, Math.round(out.dmg * 0.5));
    if (heal > 0) { G.hp += heal; out.notes.push('devoured +' + heal); }
  }
  // Emberbrand: fire rider, and the burn that follows it.
  if (boonTier('emberbrand') >= 1 && Math.random() < 0.30) {
    const fire = Math.max(1, Math.round(out.dmg * 0.25));
    out.dmg += fire;
    out.notes.push('🔥' + fire);
    if (boonTier('emberbrand') >= 2) foe.burn = { dmg: 3, rounds: 2 };
  }
  // Frostbite: chill blunts their next swing and their guard.
  if (boonTier('frostbite') >= 1 && Math.random() < 0.30) {
    foe.chill = 2;
    out.notes.push('❄️chilled');
  }
  // Necromancy: shades pile on.
  const shades = (runState.shades || []).length;
  if (shades > 0) {
    const add = Math.round(playerMaxHit() * 0.3 * shades);
    out.dmg += add;
    out.notes.push(shades + '× shade +' + add);
  }
  // Stormcaller: arcs strike again.
  runState.hitCount = (runState.hitCount || 0) + 1;
  const guaranteed = boonTier('stormcaller') >= 3 && runState.hitCount % 5 === 0;
  if (boonTier('stormcaller') >= 1) {
    let arcs = 0;
    if (guaranteed) arcs = 2;
    else if (Math.random() < 0.25) {
      arcs = 1;
      // Chain: each arc can beget another.
      while (boonTier('stormcaller') >= 2 && arcs < 3 && Math.random() < 0.25) arcs++;
    }
    for (let i = 0; i < arcs; i++) {
      out.extraHits.push(Math.max(1, Math.round(out.dmg * 0.5)));
    }
    if (arcs) out.notes.push('⚡×' + arcs);
  }
  return out;
}

// Damage reduction, reflection, and the death-save.
function boonDefence(incoming, foe) {
  const out = { dmg: incoming, reflect: 0, notes: [] };
  if (boonTier('stoneblood') >= 1) {
    out.dmg = Math.round(out.dmg * 0.85);
  }
  if (foe.chill > 0) {
    out.dmg = Math.round(out.dmg * 0.5);
    out.notes.push('chilled');
  }
  if (boonTier('stoneblood') >= 2 && out.dmg > 0) {
    out.reflect = Math.max(1, Math.round(out.dmg * 0.25));
  }
  return out;
}

function boonOnKill(foe) {
  if (boonTier('necromancy') >= 1) {
    const heal = Math.min(maxHp() - G.hp, Math.round(maxHp() * 0.12));
    if (heal > 0) { G.hp += heal; runLog('<span class="boon">Siphon</span> — you drain ' + heal + ' hp.'); }
  }
  if (boonTier('necromancy') >= 2) {
    if (!runState.shades) runState.shades = [];
    runState.shades.push({ rounds: boonTier('necromancy') >= 3 ? Infinity : 3 });
    runLog('<span class="boon">A shade rises</span> (' + runState.shades.length + ').');
  }
  if (boonTier('bloodlust') >= 3) {
    runState.rampage = (runState.rampage || 0) + 1;
  }
  // Immolation and Cold Snap carry over onto whatever comes next.
  if (boonTier('emberbrand') >= 3 && foe.burn) {
    runState.carryDetonate = Math.round(foe.max * 0.30);
  }
  if (boonTier('frostbite') >= 3 && foe.chill > 0) {
    runState.carryFreeze = true;
  }
}

function combatRound() {
  if (!runState || runState.over) return;
  const foe = runState.foe;

  // Frozen foes lose their turn entirely.
  const wasFrozen = foe.frozen > 0;
  if (wasFrozen) foe.frozen -= 1;

  // Your swing.
  const raw = rollDamage(playerMaxHit(), playerAttackRoll(), monsterDefenceRoll(foe));
  const off = boonOffence(raw, foe);
  foe.hp -= off.dmg;
  off.extraHits.forEach(function (h) { foe.hp -= h; });
  const totalDealt = off.dmg + off.extraHits.reduce(function (s, h) { return s + h; }, 0);
  awardCombatXp(totalDealt);
  flash('foe');
  floatNum('foe', totalDealt);
  runLog(raw > 0
    ? 'You hit <b>' + totalDealt + '</b> on the ' + foe.name +
      (off.notes.length ? ' <span class="boon">(' + off.notes.join(', ') + ')</span>' : '') + '.'
    : '<span class="miss">You miss the ' + foe.name + '.</span>');

  // Burn ticks after your swing.
  if (foe.burn && foe.burn.rounds > 0 && foe.hp > 0) {
    foe.hp -= foe.burn.dmg;
    foe.burn.rounds -= 1;
    awardCombatXp(foe.burn.dmg);
    runLog('<span class="boon">🔥 Burning</span> for ' + foe.burn.dmg + '.');
  }

  if (foe.hp <= 0) {
    runLog('<span class="win">' + foe.name + ' is defeated.</span>');
    boonOnKill(foe);
    rollLoot(foe);
    renderDungeonRun();
    renderTopBar();
    runTimer = setTimeout(advanceWave, pace(800));
    return;
  }

  // Its swing — skipped entirely if frozen.
  if (wasFrozen) {
    runLog('<span class="boon">❄️ ' + foe.name + ' is frozen solid</span> and loses its turn.');
  } else {
    const incoming = rollDamage(foe.maxHit, monsterAttackRoll(foe), playerDefenceRoll());
    const def = boonDefence(incoming, foe);
    G.hp -= def.dmg;

    // Last Stand: one death-save a wave.
    if (G.hp <= 0 && boonTier('stoneblood') >= 3 && !runState.lastStandUsed) {
      runState.lastStandUsed = true;
      G.hp = Math.max(1, Math.round(maxHp() * 0.25));
      runLog('<span class="boon">🪨 Last Stand</span> — you refuse to fall, at ' + G.hp + ' hp.');
    }
    flash('you');
    floatNum('you', def.dmg);
    runLog(def.dmg > 0
      ? '<span class="hurt">' + foe.name + ' hits you for <b>' + def.dmg + '</b>' +
        (def.notes.length ? ' (' + def.notes.join(', ') + ')' : '') + '.</span>'
      : '<span class="miss">' + foe.name + ' misses.</span>');

    if (def.reflect > 0) {
      foe.hp -= def.reflect;
      awardCombatXp(def.reflect);
      runLog('<span class="boon">🪨 Retort</span> — ' + def.reflect + ' back at it.');
      if (foe.hp <= 0) {
        runLog('<span class="win">' + foe.name + ' is defeated.</span>');
        boonOnKill(foe);
        rollLoot(foe);
        renderDungeonRun();
        runTimer = setTimeout(advanceWave, pace(800));
        return;
      }
    }
  }

  // Statuses decay at the end of the round.
  if (foe.chill > 0) foe.chill -= 1;
  if (runState.shades) {
    runState.shades.forEach(function (s) { s.rounds -= 1; });
    runState.shades = runState.shades.filter(function (s) { return s.rounds > 0; });
  }

  renderDungeonRun();
  renderTopBar();

  if (G.hp <= 0) {
    G.hp = 0;
    runTimer = setTimeout(function () { endRun(false); }, pace(700));
    return;
  }
  runTimer = setTimeout(combatRound, pace(750));
}

function rollLoot(foe) {
  const drops = runState.d.drops;
  const mult = boonTier('scavenger') >= 1 ? 1.5 : 1;
  for (const k in drops) {
    const q = Math.round(rng(drops[k][0], drops[k][1]) * mult);
    if (q > 0) runState.loot[k] = (runState.loot[k] || 0) + q;
  }
  if (foe.boss) {
    const bonus = runState.d.clearDrops;
    for (const k in bonus) {
      runState.loot[k] = (runState.loot[k] || 0) + Math.round(bonus[k] * mult);
    }
  }
}

// A breather between waves. Without this a long dungeon is unwinnable at any
// level — chip damage across 8 waves plus a boss always outruns your life bar.
const WAVE_HEAL_PCT = 20;

function advanceWave() {
  if (!runState || runState.over) return;
  if (runState.foe && runState.foe.boss) return endRun(true);
  runState.wave += 1;
  runState.lastStandUsed = false;

  let pct = WAVE_HEAL_PCT + (boonTier('scavenger') >= 2 ? 15 : 0);
  const heal = Math.min(maxHp() - G.hp, Math.ceil(maxHp() * pct / 100));
  if (heal > 0) {
    G.hp += heal;
    runLog('<span class="win">You catch your breath. +' + heal + ' hp.</span>');
    renderTopBar();
  }

  // Opportunist hands out a free first tier before the offered choice.
  if (boonTier('scavenger') >= 3) {
    const free = rollBoonChoices(1).filter(function (c) { return c.tier === 1; })[0];
    if (free) {
      runLog('<span class="boon">🐀 Opportunist</span> — a boon for nothing.');
      grantBoon(free.key, free.tier);
    }
  }

  offerBoons();
}

// ---- The between-wave level up ----

function offerBoons() {
  if (!runState) return;
  const choices = rollBoonChoices(3);
  if (!choices.length) { spawnFoe(); return; }   // every line maxed out
  runState.runLevel = (runState.runLevel || 0) + 1;
  runState.pending = choices;
  if (autoBoonPick) {                       // headless balance runs
    const idx = autoBoonPick(choices, runState);
    if (typeof idx === 'number' && idx >= 0) {
      chooseBoon(idx);
    } else {                                // negative index = decline the level
      runState.pending = null;
      spawnFoe();
    }
    return;
  }
  renderBoonPick();
  document.body.classList.add('picking-boon');
}

function chooseBoon(index) {
  if (!runState || !runState.pending) return;
  const pick = runState.pending[index];
  if (!pick) return;
  runState.pending = null;
  document.body.classList.remove('picking-boon');
  grantBoon(pick.key, pick.tier);
  renderDungeonRun();
  renderTopBar();
  spawnFoe();
}

function renderBoonPick() {
  if (!runState || !runState.pending) return;
  $('bp-level').textContent = 'Delve Level ' + runState.runLevel;
  $('bp-sub').textContent = runState.d.name + ' — wave ' + runState.wave +
    ' of ' + runState.d.waves;
  const wrap = $('bp-choices');
  wrap.innerHTML = '';
  runState.pending.forEach(function (c, i) {
    const line = BOON_LINES[c.key];
    const t = line.tiers[c.tier - 1];
    const card = el('button', 'boon-card' + (c.tier > 1 ? ' upgrade' : ''));
    card.innerHTML =
      '<div class="bc-head">' +
        '<span class="bc-ico">' + line.icon + '</span>' +
        '<span class="bc-line">' + line.name + '</span>' +
        '<span class="bc-tier">' + (c.tier > 1 ? 'UPGRADE ' : '') +
          'I'.repeat(c.tier) + '</span>' +
      '</div>' +
      '<div class="bc-name">' + t.name + '</div>' +
      '<div class="bc-desc">' + t.desc + '</div>';
    card.onclick = function () { chooseBoon(i); };
    wrap.appendChild(card);
  });
}

// The build so far, shown above the fight.
function renderBoonBar() {
  const bar = $('run-boons');
  if (!bar || !runState) return;
  const keys = Object.keys(runState.boons || {});
  if (!keys.length) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
  bar.style.display = '';
  bar.innerHTML = keys.map(function (k) {
    const t = runState.boons[k];
    return '<span class="boon-chip" title="' + esc(boonName(k, t)) + '">' +
      BOON_LINES[k].icon + '<i>' + 'I'.repeat(t) + '</i></span>';
  }).join('');
}

function endRun(cleared) {
  if (!runState || runState.over) return;
  runState.over = true;
  if (runTimer) { clearTimeout(runTimer); runTimer = null; }

  const rs = runState;
  for (const k in rs.loot) addItem(k, rs.loot[k]);
  if (cleared && rs.index >= G.dungeonsCleared) {
    G.dungeonsCleared = Math.min(DUNGEONS.length, rs.index + 1);
  }
  G.busy = false;
  touchRegen();
  save();

  // Results
  const xpGains = SKILL_KEYS.map(function (k) {
    return { key: k, gain: skillXp(k) - rs.xpStart[k] };
  }).filter(function (r) { return r.gain > 0.5; });

  const list = $('result-list');
  list.innerHTML = '';
  $('result-title').textContent = cleared ? 'DUNGEON CLEARED' : 'YOU DIED';
  $('result-title').className = cleared ? 'win' : 'lose';
  $('result-sub').textContent = cleared
    ? rs.d.name + ' has been cleared.'
    : 'You fell on wave ' + Math.min(rs.wave, rs.d.waves) + ' of ' + rs.d.name + '.';

  function row(label, value) {
    list.appendChild(el('div', 'res-row',
      '<span class="rr-l">' + label + '</span><span class="rr-v">' + value + '</span>'));
  }
  xpGains.forEach(function (r) {
    row(SKILLS[r.key].icon + ' ' + SKILLS[r.key].name, '+' + Math.round(r.gain).toLocaleString() + ' xp');
  });
  // The build you finished with — a record of the run, not a reward.
  const boonKeys = Object.keys(rs.boons || {});
  if (boonKeys.length) {
    row('Delve build', boonKeys.map(function (k) {
      return BOON_LINES[k].icon + ' ' + boonName(k, rs.boons[k]) +
        ' <span class="rr-tier">' + 'I'.repeat(rs.boons[k]) + '</span>';
    }).join('<br>'));
  }
  const lootKeys = Object.keys(rs.loot);
  if (lootKeys.length) {
    row('Loot', lootKeys.map(function (k) { return itemIcon(k) + ' ' + rs.loot[k] + '× ' + itemName(k); }).join('<br>'));
  } else {
    row('Loot', 'nothing');
  }
  if (cleared && rs.index + 1 < DUNGEONS.length && G.dungeonsCleared === rs.index + 1) {
    row('Unlocked', DUNGEONS[rs.index + 1].name);
  }
  if (!cleared) {
    row('Advice', 'Better gear, or higher combat levels. Both help.');
  }

  feed(cleared
    ? 'Cleared <b>' + rs.d.name + '</b>.'
    : 'Died in <b>' + rs.d.name + '</b> on wave ' + Math.min(rs.wave, rs.d.waves) + '.',
    cleared ? 'win' : 'lose');

  runState = null;
  document.body.classList.remove('in-run');
  document.body.classList.remove('picking-boon');
  resultsOpen = true;
  render();
}

function fleeRun() {
  if (!runState) return;
  runLog('<span class="lose">You retreat.</span>');
  endRun(false);
}

// ---- run rendering ----

function renderDungeonRun() {
  if (!runState) return;
  const foe = runState.foe;
  const d = runState.d;
  $('run-wave').textContent = runState.wave > d.waves ? 'BOSS' : 'Wave ' + runState.wave + ' / ' + d.waves;
  $('foe-ico').textContent = foe.icon;
  $('foe-name').textContent = foe.name;
  $('foe-fill').style.width = Math.max(0, (foe.hp / foe.max) * 100) + '%';
  $('foe-hp').textContent = Math.max(0, foe.hp) + ' / ' + foe.max;
  $('you-fill').style.width = Math.max(0, (G.hp / maxHp()) * 100) + '%';
  $('you-hp').textContent = Math.max(0, Math.floor(G.hp)) + ' / ' + maxHp();
  const w = G.equipped.weapon;
  $('you-ico').textContent = w && GEAR[w] ? GEAR[w].icon : '🧍';
  // Status pips so the build's effects are legible mid-fight.
  const st = [];
  if (foe.burn && foe.burn.rounds > 0) st.push('🔥');
  if (foe.chill > 0) st.push('❄️');
  if (foe.frozen > 0) st.push('🧊');
  $('foe-status').textContent = st.join(' ');
  $('you-status').textContent = (runState.shades && runState.shades.length)
    ? '💀×' + runState.shades.length : '';
  renderBoonBar();
}

function runLog(html) {
  const l = $('run-log');
  if (!l) return;
  l.appendChild(el('p', '', html));
  l.scrollTop = l.scrollHeight;
  while (l.children.length > 40) l.removeChild(l.firstChild);
}

function flash(who) {
  const n = $(who === 'foe' ? 'foe-ico' : 'you-ico');
  if (!n) return;
  n.classList.remove('hit');
  void n.offsetWidth;
  n.classList.add('hit');
}

function floatNum(who, dmg) {
  const stage = $('run-stage');
  if (!stage) return;
  const d = el('div', 'float ' + who + (dmg > 0 ? '' : ' zero'), dmg > 0 ? String(dmg) : '0');
  stage.appendChild(d);
  setTimeout(function () { try { stage.removeChild(d); } catch (e) {} }, 900);
}

// ============================================================
// Boot
// ============================================================

function wire() {
  const flee = $('run-flee');
  if (flee) flee.onclick = fleeRun;
  const cont = $('result-continue');
  if (cont) cont.onclick = function () { showTab('dungeon'); };
  const stop = $('ga-stop');
  if (stop) stop.onclick = function () { stopGathering(); };
  const cstop = $('ca-stop');
  if (cstop) cstop.onclick = function () { stopCrafting(); };
  const cfOk = $('cf-ok');
  if (cfOk) cfOk.onclick = function () { closeConfirm(true); };
  const cfCancel = $('cf-cancel');
  if (cfCancel) cfCancel.onclick = function () { closeConfirm(false); };
  const cf = $('confirm');
  if (cf) cf.onclick = function (e) { if (e.target === cf) closeConfirm(false); };
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);
}

function startClocks() {
  setInterval(function () {
    if (runState || gatherState || craftState || G.busy) return;
    if (regenTick()) renderTopBar();
  }, 3000);
}

function init() {
  wire();
  load();
  render();
  startClocks();
  if (!Object.keys(G.inventory).length && totalLevel() === SKILL_KEYS.length + 9) {
    feed('You arrive with nothing but a rusty axe and a pick. ' +
         '<b>Chop a tree</b> and <b>mine some copper</b> — that is a bronze sword waiting to happen.', 'lvl');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.render = render;

// Exposed for the test harness and the balance simulator.
window.__rf = {
  SKILLS: SKILLS, SKILL_KEYS: SKILL_KEYS, ITEMS: ITEMS, GEAR: GEAR,
  METALS: METALS, DUNGEONS: DUNGEONS, TREES: TREES, ROCKS: ROCKS,
  AMULETS: AMULETS, GEAR_KINDS: GEAR_KINDS, SLOTS: SLOTS,
  SMELT_RECIPES: SMELT_RECIPES, MAKE_RECIPES: MAKE_RECIPES, ALL_RECIPES: ALL_RECIPES,
  craftMs: craftMs, craftSpeedFactor: craftSpeedFactor, recipeById: recipeById,
  xpAtLevel: xpAtLevel, levelFromXp: levelFromXp,
  lvl: lvl, totalLevel: totalLevel, combatLevel: combatLevel, maxHp: maxHp,
  playerMaxHit: playerMaxHit, playerAttackRoll: playerAttackRoll,
  playerDefenceRoll: playerDefenceRoll, hitChance: hitChance,
  monsterAttackRoll: monsterAttackRoll, monsterDefenceRoll: monsterDefenceRoll,
  rollDamage: rollDamage, awardCombatXp: awardCombatXp,
  addXp: addXp, addItem: addItem, have: have, gearBonus: gearBonus,
  gearScore: gearScore, upgradeDelta: upgradeDelta, bestOwnedPerSlot: bestOwnedPerSlot,
  BOON_LINES: BOON_LINES, BOON_KEYS: BOON_KEYS, DUNGEON_BOONS: DUNGEON_BOONS,
  boonTier: boonTier, boonName: boonName,
  runInfo: function () {
    if (!runState) return null;
    return {
      wave: runState.wave, runLevel: runState.runLevel,
      boons: Object.assign({}, runState.boons),
      pending: (runState.pending || []).map(function (p) { return p.key + ':' + p.tier; }),
      shades: (runState.shades || []).length, rampage: runState.rampage || 0
    };
  },
  forceBoon: function (key, tier) { if (runState) runState.boons[key] = tier; },
  setPace: function (scale) { paceScale = scale; },
  setDifficulty: function (scale) { difficultyScale = scale; },
  setAutoBoon: function (fn) { autoBoonPick = fn; },
  enterDungeon: function (i) { enterDungeon(i); },
  isInRun: function () { return !!runState; },
  salvageYield: salvageYield, SALVAGE_CHANCE: SALVAGE_CHANCE,
  defaultState: defaultState,
  setLevels: function (levels) {
    for (const k in levels) if (G.skills[k]) G.skills[k] = { xp: xpAtLevel(levels[k]) };
    G.hp = maxHp();
  },
  setGear: function (keys) {
    SLOTS.forEach(function (s) { G.equipped[s] = null; });
    (keys || []).forEach(function (k) { if (GEAR[k]) G.equipped[GEAR[k].slot] = k; });
  }
};

})();
