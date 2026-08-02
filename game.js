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
    waves: 12,
    monsters: [
      { name: 'Giant Rat',   icon: '🐀', hp: 10,  atk: 6,  def: 1, maxHit: 5 , calls: 0.3 },
      { name: 'Cave Slime',  icon: '🟢', hp: 13,  atk: 7,  def: 1, maxHit: 5 , calls: 0.3 }
    ],
    boss: { name: 'Warren Brood-Mother', icon: '🕷️', hp: 22, atk: 10, def: 2, maxHit: 8 , calls: 0.5 },
    summonPrefix: 'Brood',
    drops: { ember_core: [1, 2], sapphire: [0, 1] },
    clearDrops: { ember_core: 3, sapphire: 2 }
  },
  {
    key: 'crypt', name: 'Frozen Crypt', icon: '❄️',
    blurb: 'A barrow sealed in black ice. The cold bites through bronze.',
    waves: 14,
    monsters: [
      { name: 'Frost Ghoul',  icon: '🧟', hp: 18, atk: 22, def: 6, maxHit: 5 , calls: 0.3 },
      { name: 'Ice Wraith',   icon: '👻', hp: 25, atk: 24, def: 7, maxHit: 5 , calls: 0.32 }
    ],
    boss: { name: 'The Hoarfrost Knight', icon: '🛡️', hp: 45, atk: 30, def: 12, maxHit: 6 , calls: 0.5 },
    summonPrefix: 'Frost',
    drops: { frost_shard: [1, 2], emerald: [0, 1] },
    clearDrops: { frost_shard: 3, emerald: 2 }
  },
  {
    key: 'spire', name: 'Storm Spire', icon: '⚡',
    blurb: 'A tower struck by lightning so often the stone has turned to glass.',
    waves: 16,
    monsters: [
      { name: 'Storm Sprite',  icon: '⚡', hp: 35,  atk: 39, def: 14, maxHit: 5 , calls: 0.32 },
      { name: 'Thunder Golem', icon: '🗿', hp: 45,  atk: 43, def: 16, maxHit: 6 , calls: 0.3 }
    ],
    boss: { name: 'Skyfather Vool', icon: '🌩️', hp: 91, atk: 52, def: 25, maxHit: 9 , calls: 0.5 },
    summonPrefix: 'Storm',
    drops: { storm_crystal: [1, 2], ruby: [0, 1] },
    clearDrops: { storm_crystal: 3, ruby: 2 }
  },
  {
    key: 'roost', name: "Dragon's Roost", icon: '🐲',
    blurb: 'The heat alone kills the unprepared. Bring the best steel you have.',
    waves: 18,
    monsters: [
      { name: 'Whelp',        icon: '🦎', hp: 50,  atk: 57, def: 24, maxHit: 6 , calls: 0.34 },
      { name: 'Ember Drake',  icon: '🐉', hp: 69,  atk: 63, def: 27, maxHit: 8 , calls: 0.3 }
    ],
    boss: { name: 'Ashmaw the Elder', icon: '🐲', hp: 140, atk: 75, def: 39, maxHit: 11 , calls: 0.55 },
    summonPrefix: 'Ash',
    drops: { dragon_ash: [1, 2], diamond: [0, 1] },
    clearDrops: { dragon_ash: 3, diamond: 2 }
  },
  {
    key: 'abyss', name: 'The Abyss', icon: '🌌',
    blurb: 'Nothing comes back from here without rune on its back.',
    waves: 20,
    monsters: [
      { name: 'Abyssal Leech',  icon: '🪱', hp: 73,  atk: 80, def: 35, maxHit: 8 , calls: 0.34 },
      { name: 'Void Stalker',   icon: '👁️', hp: 98, atk: 88, def: 39, maxHit: 9 , calls: 0.32 }
    ],
    boss: { name: 'The Hollow King', icon: '👑', hp: 211, atk: 104, def: 54, maxHit: 14 , calls: 0.6 },
    summonPrefix: 'Void',
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
  // ---- The Necromancy path ----------------------------------------
  // A root line that opens two branches, in the old Might and Magic
  // shape: one mastery ladder, then specialisations you can only reach
  // by committing to it first.
  necromancy: {
    name: 'Necromancy', icon: '💀', blurb: 'Undeath', faction: 'necromancy', root: true,
    tiers: [
      { name: 'Raise Dead',    desc: 'A slain foe has a 40% chance to rise as a Skeleton and fight for you.' },
      { name: 'Dark Mastery',  desc: 'Three quarters of the slain rise, and a boss always does.' },
      { name: 'Lord of Bones', desc: 'Everything you kill rises.' }
    ]
  },
  bonelegion: {
    name: 'Bone Legion', icon: '🦴', blurb: 'The host',
    faction: 'necromancy', req: { necromancy: 1 },
    tiers: [
      { name: 'Grave Rot',   desc: 'Your host rises as Ghouls instead — and everything already standing rots into one.' },
      { name: 'Wight Lords', desc: 'Ghouls become Wights, and their strikes drain a quarter back to you.' },
      { name: 'Bone Dragon', desc: 'The eldest of your host rises again as a Bone Dragon.' }
    ]
  },
  deathmagic: {
    name: 'Death Magic', icon: '🕯️', blurb: 'Ruin',
    faction: 'necromancy', req: { necromancy: 1 },
    tiers: [
      { name: 'Death Ripple',   desc: 'Every third round, decay washes out for 2 damage per risen unit.' },
      { name: 'Animate Dead',   desc: 'Each new wave, half of your fallen claw their way back.' },
      { name: 'Unholy Bargain', desc: 'A killing blow consumes your host instead — each unit spent restores 20% health.' }
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
// Small, stacking, repeatable. A boon comes after every exchange, but only a
// cleared wave pays out a tree node — mid-wave exchanges pay one of these, so
// the rhythm survives without the tree being spent by the midpoint.
const MINOR_BOONS = [
  { key: 'edge',   icon: '🗡️', name: 'Whetted',   desc: '+1 to your max hit, for this delve.' },
  { key: 'vigour', icon: '❤️', name: 'Vigour',    desc: '+4 to your max health, and heal that much.' },
  { key: 'mend',   icon: '💚', name: 'Second Breath', desc: 'Recover 30% of your health.' },
  { key: 'rage',   icon: '🔥', name: 'Kindled',   desc: '+20 fury, now.' },
  { key: 'keen',   icon: '🎯', name: 'Keen Eye',  desc: '+4% critical chance (up to +24%).' },
  { key: 'knit',   icon: '🦴', name: 'Knit Bones', desc: 'Mend your whole host to full.' },
  { key: 'strike', icon: '⚡', name: 'Sure Strike', desc: 'Your next blow is a guaranteed critical.' }
];
function minorById(k) {
  return MINOR_BOONS.filter(function (m) { return m.key === k; })[0] || null;
}

const BOON_KEYS = Object.keys(BOON_LINES);
const MAX_BOON_TIER = 3;

// What the risen look like. Damage and life are read off the player, so a
// host is always worth something relative to where you are.
const UNDEAD_TIERS = [
  { name: 'Skeleton',    icon: '🦴', dmg: 0.24, hp: 0.20 },
  { name: 'Ghoul',       icon: '🧟', dmg: 0.36, hp: 0.30 },
  { name: 'Wight',       icon: '👻', dmg: 0.50, hp: 0.40 },
  { name: 'Bone Dragon', icon: '🐉', dmg: 0.95, hp: 0.80 }
];
const HOST_CAP = 6;             // six stacks, laid out three to a rank

// The Rite of Binding: three of a kind fuse into one of the next kind, worth
// a quarter more than all three together. You trade bodies for quality —
// fewer units means fewer blows soaked off you, so it is never free.
const BIND_COUNT = 3;
const BIND_BONUS = 1.0;

// What the rite can make. Three of a kind fuse into one of the next kind, but
// *which* one is your call — the forms trade stats against a keyword, so the
// same three bodies can become a wall, a poisoner or a second attacker.
const KEYWORDS = {
  taunt:  { icon: '🛡', name: 'Taunt',   desc: 'Every blow aimed your way hits this instead, while it stands.' },
  ward:   { icon: '✨', name: 'Warded',  desc: 'Ignores the first hit it takes, every wave.' },
  wither: { icon: '☠', name: 'Withering', desc: 'Its strikes rot — 3 damage a round for 2 rounds.' },
  double: { icon: '⚡', name: 'Doubled', desc: 'Strikes twice each round.' },
  sweep:  { icon: '🌊', name: 'Sweeping', desc: 'Half its damage splashes onto every other enemy.' },
  drain:  { icon: '🩸', name: 'Draining', desc: 'Heals you for half of what it deals.' },
  reborn: { icon: '🔁', name: 'Undying', desc: 'The first time it falls, it gets back up at 1 health.' }
};

// Keyed by the tier the rite produces.
const BIND_FORMS = {
  1: [
    { name: 'Gravewarden', icon: '🪦', keys: ['taunt'],  hp: 1.2, dmg: 0.7,
      ability: { key: 'bulwark', name: 'Bulwark', icon: '🛡', desc: 'Your whole side takes no damage for the coming exchange.' } },
    { name: 'Plague Ghoul', icon: '🧟', keys: ['wither'], hp: 1.0, dmg: 1.0,
      ability: { key: 'miasma', name: 'Miasma', icon: '☠', desc: 'Every enemy on the board starts rotting.' } },
    { name: 'Ravener',     icon: '🩸', keys: ['drain'],  hp: 0.9, dmg: 1.1,
      ability: { key: 'feast', name: 'Feast', icon: '🩸', desc: 'Tear a chunk from the weakest enemy and drink it.' } }
  ],
  2: [
    { name: 'Barrow Knight', icon: '🛡️', keys: ['taunt', 'ward'], hp: 1.3, dmg: 0.6,
      ability: { key: 'shieldwall', name: 'Shield Wall', icon: '✨', desc: 'Every unit you have gains a ward.' } },
    { name: 'Storm Wight',   icon: '⚡', keys: ['double'],        hp: 0.8, dmg: 0.6,
      ability: { key: 'chain', name: 'Chain Strike', icon: '⚡', desc: 'Strike every enemy on the board once.' } },
    { name: 'Grave Tyrant',  icon: '👑', keys: ['sweep'],         hp: 1.0, dmg: 1.0,
      ability: { key: 'onslaught', name: 'Onslaught', icon: '👑', desc: 'The whole host strikes at once, right now.' } }
  ],
  3: [
    { name: 'Bone Dragon',  icon: '🐉', keys: ['sweep', 'ward'],   hp: 1.1, dmg: 1.0,
      ability: { key: 'dragonfire', name: 'Dragonfire', icon: '🔥', desc: 'Burn every enemy for its full damage.' } },
    { name: 'Lich Dragon',  icon: '💀', keys: ['wither', 'double'], hp: 0.9, dmg: 0.6,
      ability: { key: 'harvest', name: 'Soul Harvest', icon: '💀', desc: 'Finish every enemy already below a quarter health.' } },
    { name: 'Bulwark Wyrm', icon: '🦴', keys: ['taunt', 'reborn'],  hp: 1.4, dmg: 0.7,
      ability: { key: 'wake', name: 'Wake the Dead', icon: '🔁', desc: 'Two of the fallen claw their way back.' } }
  ]
};
function unitHasKey(u, k) { return !!(u.keys && u.keys.indexOf(k) >= 0); }

// Each dungeon draws from its own lines, so the Crypt reliably makes
// necromancers and the Spire makes stormcallers. Branch lines sit in the
// pool from the start but stay hidden until their root is taken.
// The Necromancy path is offered everywhere — it is the game's headline
// build, so no dungeon should be able to hide it. The rest of each pool is
// still local, which is what keeps the dungeons feeling different.
const NECRO_PATH = ['necromancy', 'bonelegion', 'deathmagic'];
const DUNGEON_BOONS = {
  warren: ['scavenger', 'emberbrand', 'stoneblood', 'bloodlust'].concat(NECRO_PATH),
  crypt:  ['frostbite', 'stoneblood', 'voidtouched'].concat(NECRO_PATH),
  spire:  ['stormcaller', 'voidtouched', 'bloodlust', 'frostbite'].concat(NECRO_PATH),
  roost:  ['emberbrand', 'bloodlust', 'stormcaller', 'stoneblood'].concat(NECRO_PATH),
  abyss:  ['voidtouched', 'emberbrand', 'frostbite'].concat(NECRO_PATH)
};

function boonTier(key) {
  return (runState && runState.boons && runState.boons[key]) || 0;
}
function boonName(key, tier) {
  const line = BOON_LINES[key];
  const t = line && line.tiers[tier - 1];
  return t ? t.name : key;
}
// A branch is only offerable once its root is deep enough.
function boonUnlocked(key) {
  const req = BOON_LINES[key].req;
  if (!req) return true;
  for (const k in req) if (boonTier(k) < req[k]) return false;
  return true;
}

// Offer the next tier of lines already started (so builds compound), topped up
// with fresh lines from this dungeon's pool.
function rollBoonChoices(count) {
  if (!runState) return [];
  const pool = DUNGEON_BOONS[runState.d.key] || BOON_KEYS;
  const upgrades = [], fresh = [];
  const wave = runState.wave || 1;
  const deep = Math.ceil(0.55 * runState.d.waves);
  pool.forEach(function (key) {
    const t = boonTier(key);
    if (t >= MAX_BOON_TIER) return;
    if (!boonUnlocked(key)) return;
    // A line's later tiers are earned by getting deep, not by getting lucky.
    if (t + 1 === 2 && wave < 3) return;
    if (t + 1 === 3 && wave < deep) return;
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

function rollMinors(count) {
  const pool = MINOR_BOONS.filter(function (m) {
    if (m.key === 'knit') return hostUnits().some(function (u) { return u.hp < u.max; });
    if (m.key === 'mend') return G.hp < maxHp();
    if (m.key === 'rage') return (runState.fury || 0) < FURY_MAX;
    if (m.key === 'keen') return (runState.bonusCrit || 0) < 0.24;
    if (m.key === 'strike') return !runState.sureStrike;
    return true;
  });
  shuffle(pool);
  return pool.slice(0, count).map(function (m) { return { minor: m.key }; });
}

function grantMinor(key) {
  const m = minorById(key);
  if (!m || !runState) return;
  runState.minors = runState.minors || {};
  runState.minors[key] = (runState.minors[key] || 0) + 1;
  switch (key) {
    case 'edge':   runState.bonusHit = (runState.bonusHit || 0) + 1; break;
    case 'vigour': runState.bonusHp = (runState.bonusHp || 0) + 4; G.hp += 4; break;
    case 'mend':   G.hp = Math.min(maxHp(), G.hp + Math.ceil(maxHp() * 0.30)); break;
    case 'rage':   addFury(20); break;
    case 'keen':   runState.bonusCrit = Math.min(0.24, (runState.bonusCrit || 0) + 0.04); break;
    case 'knit':   hostUnits().forEach(function (u) { u.hp = u.max; }); break;
    case 'strike': runState.sureStrike = true; break;
  }
  runLog('<span class="boon">' + m.icon + ' ' + m.name + '</span> — ' + m.desc);
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
  // Bone Legion rewrites the host you already have — the payoff should be
  // visible the instant you take it, not on the next kill.
  if (key === 'bonelegion') promoteHost();
  // And taking up Necromancy raises your first servant there and then, rather
  // than leaving you to wonder whether it did anything.
  if (key === 'necromancy' && tier === 1) raiseUnit();
}

// ============================================================
// The host — the Necromancy path's risen retinue
// ============================================================

// Skeleton / Ghoul / Wight, set by how deep Bone Legion runs.
function raiseTier() { return Math.min(2, boonTier('bonelegion')); }

function undeadStats(tier) {
  const t = UNDEAD_TIERS[tier];
  return {
    dmg: Math.max(1, Math.round(playerMaxHit() * t.dmg)),
    hp: Math.max(1, Math.round(maxHp() * t.hp))
  };
}

// What a specific unit is worth, tier times whatever binding has made of it.
function unitStats(u) {
  // A bound unit is worth what its parts were worth, not what its tier is.
  if (u.absDmg) return { dmg: u.absDmg, hp: u.absHp };
  const s = undeadStats(u.tier);
  const p = u.power || 1;
  return {
    dmg: Math.max(1, Math.round(s.dmg * p)),
    hp: Math.max(1, Math.round(s.hp * p))
  };
}
function unitLabel(u) { return u.form ? u.form.name : UNDEAD_TIERS[u.tier].name; }
function unitIcon(u) { return u.form ? u.form.icon : UNDEAD_TIERS[u.tier].icon; }

function hostUnits() { return (runState && runState.retinue) || []; }
function hostMaxHit() {
  return hostUnits().reduce(function (s, u) { return s + unitStats(u).dmg; }, 0);
}

// The deepest tier with enough of a kind standing to fuse.
function bindableTier() {
  if (!runState) return -1;
  const counts = {};
  hostUnits().forEach(function (u) {
    if (u.tier < UNDEAD_TIERS.length - 1) counts[u.tier] = (counts[u.tier] || 0) + 1;
  });
  let best = -1;
  Object.keys(counts).forEach(function (t) {
    if (counts[t] >= BIND_COUNT && +t > best) best = +t;
  });
  return best;
}

// Which units the rite would actually consume — the most spent ones first,
// so binding never throws away your healthiest.
function bindPool() {
  const t = bindableTier();
  if (t < 0) return [];
  return hostUnits()
    .filter(function (u) { return u.tier === t; })
    .sort(function (a, b) { return (a.hp / a.max) - (b.hp / b.max); })
    .slice(0, BIND_COUNT);
}

function bindOffers() {
  const t = bindableTier();
  if (t < 0) return [];
  return BIND_FORMS[t + 1] || [];
}

// Step one: ask what they should become.
function performBind() {
  if (!runState || runState.over || runState.phase === 'binding') return;
  if (bindPool().length < BIND_COUNT) return;
  const forms = bindOffers();
  if (!forms.length) return;
  runState.bindPending = forms;
  if (autoBindPick || runState.auto) {
    const i = autoBindPick ? autoBindPick(forms, runState) : 0;
    completeBind(i >= 0 ? i : 0);
    return;
  }
  renderBindPick();
  document.body.classList.add('picking-bind');
}

// Step two: make it.
function completeBind(index) {
  if (!runState || !runState.bindPending) return;
  const form = runState.bindPending[index];
  runState.bindPending = null;
  document.body.classList.remove('picking-bind');
  if (!form) return;
  const pool = bindPool();
  if (pool.length < BIND_COUNT) { renderDungeonRun(); return; }

  const from = pool[0].tier, to = from + 1;
  const sumDmg = pool.reduce(function (s, u) { return s + unitStats(u).dmg; }, 0);
  const sumHp = pool.reduce(function (s, u) { return s + u.max; }, 0);
  runState.retinue = hostUnits().filter(function (u) { return pool.indexOf(u) < 0; });

  const u = {
    id: nextId(), tier: to, bound: true, fresh: true,
    form: form, keys: form.keys.slice(),
    absDmg: Math.max(1, Math.round(BIND_BONUS * sumDmg * form.dmg)),
    absHp: Math.max(1, Math.round(BIND_BONUS * sumHp * form.hp))
  };
  u.hp = u.absHp; u.max = u.absHp;
  if (unitHasKey(u, 'ward')) u.warded = true;
  runState.retinue.push(u);
  runState.bindings = (runState.bindings || 0) + 1;

  runLog('<span class="boon">🔗 Rite of Binding</span> — three ' +
    UNDEAD_TIERS[from].name + 's rise again as a ' + form.name + '.');
  hostBanner(form.name.toUpperCase());
  riseFx(to);
  addFury(12);
  renderDungeonRun();
}

function renderBindPick() {
  if (!runState || !runState.bindPending) return;
  const from = bindPool()[0];
  $('bd-sub').textContent = 'Three ' + UNDEAD_TIERS[from.tier].name +
    's give up their shape. Choose what stands back up.';
  const wrap = $('bd-choices');
  wrap.innerHTML = '';
  runState.bindPending.forEach(function (f, i) {
    const probe = { tier: from.tier + 1, form: f, power: 1 };
    const card = el('button', 'bind-card fac-necromancy');
    card.innerHTML =
      '<div class="bc-head">' +
        '<span class="bc-ico">' + f.icon + '</span>' +
        '<span class="bc-line">' + esc(f.name) + '</span>' +
        '<span class="bc-tier">' + (f.hp >= 1.5 ? 'TOUGH' : (f.dmg >= 1 ? 'SHARP' : 'ODD')) + '</span>' +
      '</div>' +
      '<div class="bc-keys">' + f.keys.map(function (k) {
        return '<span class="kw">' + KEYWORDS[k].icon + ' ' + KEYWORDS[k].name + '</span>';
      }).join('') + '</div>' +
      '<div class="bc-desc">' + f.keys.map(function (k) {
        return KEYWORDS[k].desc;
      }).join(' ') + '</div>';
    card.onclick = function () { completeBind(i); };
    wrap.appendChild(card);
  });
}

function raiseUnit(quiet) {
  if (!runState) return null;
  const host = runState.retinue;
  let tier = raiseTier();
  // Bone Dragon: exactly one, at the head of the host.
  if (boonTier('bonelegion') >= 3 &&
      !host.some(function (u) { return u.tier === 3; })) tier = 3;

  if (host.length >= HOST_CAP) {
    // Nowhere to put it — the strength goes into mending the weakest instead.
    const weakest = host.slice().sort(function (a, b) {
      return (a.hp / a.max) - (b.hp / b.max);
    })[0];
    if (weakest && weakest.hp < weakest.max) {
      weakest.hp = weakest.max;
      if (!quiet) runLog('<span class="boon">The host is full</span> — the dead knit back together instead.');
    }
    return null;
  }

  const u = { id: nextId(), tier: tier, power: 1, fresh: true };
  const s = unitStats(u);
  u.hp = s.hp; u.max = s.hp;
  host.push(u);
  if (!quiet) {
    runLog('<span class="boon">' + UNDEAD_TIERS[tier].icon + ' A ' +
      UNDEAD_TIERS[tier].name + ' rises</span> to serve you.');
    riseFx(tier);
  }
  return u;
}

// Everything already standing is remade when Bone Legion deepens.
function promoteHost() {
  const host = hostUnits();
  if (!host.length) return;
  const target = raiseTier();
  let changed = false;
  host.forEach(function (u) {
    if (u.form) return;                   // already been through the rite
    if (u.tier === 3) return;             // the dragon is already the top
    if (u.tier < target) {
      const ratio = u.hp / u.max;
      u.tier = target;
      const s = unitStats(u);
      u.max = s.hp;
      u.hp = Math.max(1, Math.round(s.hp * ratio));
      u.promoted = true;
      changed = true;
    }
  });
  if (boonTier('bonelegion') >= 3 && !host.some(function (u) { return u.tier === 3; })) {
    const eldest = host[0];
    eldest.tier = 3;
    const s = unitStats(eldest);
    eldest.max = s.hp; eldest.hp = s.hp; eldest.promoted = true;
    changed = true;
  }
  if (changed) {
    runLog('<span class="boon">Your host convulses and reforms.</span>');
    hostBanner('THE HOST REFORMS');
  }
}

// Death Ripple: decay washing off the whole host onto everything standing.
function deathRipple() {
  if (boonTier('deathmagic') < 1) return 0;
  const units = hostUnits().length;
  if (!units) return 0;
  if (runState.round % 3 !== 0) return 0;
  const dmg = units * 2;
  let total = 0;
  aliveFoes().forEach(function (f) {
    f.hp -= dmg;
    total += dmg;
    floatOn('foe-' + f.id, dmg, 'necro');
  });
  if (!total) return 0;
  awardCombatXp(total);
  runLog('<span class="boon">🕯️ Death Ripple</span> washes out for ' + total + '.');
  return total;
}

// The foe swings at the host instead of you — more often, the bigger it is.
function hostTakesHit(foe, incoming) {
  const host = hostUnits();
  if (!host.length) return false;
  // A taunt unit stands in front of everything, always.
  const guards = host.filter(function (u) { return unitHasKey(u, 'taunt'); });
  let u;
  if (guards.length) {
    u = guards[rng(0, guards.length - 1)];
  } else {
    if (Math.random() >= Math.min(0.55, 0.12 * host.length)) return false;
    u = host[rng(0, host.length - 1)];
  }
  const name = unitLabel(u);

  // Warded shrugs off the first blow of the wave.
  if (u.warded) {
    u.warded = false;
    runLog('<span class="boon">✨ ' + name + '\'s ward shatters</span> — no damage.');
    floatOn('ally-' + u.id, 0);
    return true;
  }

  u.hp -= incoming;
  if (u.hp <= 0) {
    if (unitHasKey(u, 'reborn') && !u.rebornUsed) {
      u.rebornUsed = true;
      u.hp = 1;
      runLog('<span class="boon">🔁 ' + name + ' will not stay down</span> — back at 1.');
      return true;
    }
    runState.retinue = host.filter(function (x) { return x !== u; });
    runState.fallen = (runState.fallen || 0) + 1;
    runLog('<span class="hurt">' + foe.name + ' shatters your ' + name + '.</span>');
    fallFx();
  } else {
    floatOn('ally-' + u.id, incoming);
  }
  return true;
}

// Unholy Bargain: spend the host to refuse a killing blow.
function unholyBargain() {
  if (boonTier('deathmagic') < 3) return false;
  const host = hostUnits();
  if (!host.length) return false;
  const needed = Math.ceil((1 - G.hp / maxHp()) * 5);      // each unit is 20%
  const spent = Math.min(host.length, Math.max(1, needed));
  runState.retinue = host.slice(spent);
  runState.fallen = (runState.fallen || 0) + spent;
  G.hp = Math.min(maxHp(), Math.max(1, Math.round(maxHp() * spent * 0.20)));
  runLog('<span class="boon">🕯️ Unholy Bargain</span> — ' + spent +
    ' of your host crumble so you do not. You stand at ' + G.hp + ' hp.');
  hostBanner('UNHOLY BARGAIN');
  return true;
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
  // Frozen for the duration of a delve — see runSnapshot().
  const base = (runState && runState.snap)
    ? runState.snap.maxHp + (runState.bonusHp || 0)
    : lifeAtLevel(lvl('hitpoints'));
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
function baseMaxHit() {
  const str = lvl('strength');
  const bonus = gearBonus('str');
  return Math.max(1, Math.floor(2 + str / 7 + bonus / 45 + (str * bonus) / 420));
}

// What you walked in with. A delve reads these and nothing else, so the xp you
// earn inside one pays off on the NEXT one rather than inflating this one.
// Without it the host — priced as a fraction of your max hit — multiplies a
// number it is itself driving up, and the curve runs away.
function runSnapshot() {
  return {
    maxHit: baseMaxHit(),
    atkRoll: (lvl('attack') + 8) * (gearBonus('atk') + 64),
    defRoll: (lvl('defence') + 8) * (gearBonus('def') + 64),
    maxHp: lifeAtLevel(lvl('hitpoints'))
  };
}

function playerMaxHit() {
  let hit = (runState && runState.snap) ? runState.snap.maxHit : baseMaxHit();
  if (runState) {                       // run-only, from boons
    if (boonTier('bloodlust') >= 1) hit += 3;
    hit += Math.min(RAMPAGE_CAP, runState.rampage || 0);
    hit += runState.bonusHit || 0;
  }
  return Math.max(1, hit);
}
function playerAttackRoll() {
  if (runState && runState.snap) return runState.snap.atkRoll;
  return (lvl('attack') + 8) * (gearBonus('atk') + 64);
}
function playerDefenceRoll() {
  if (runState && runState.snap) return runState.snap.defRoll;
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
// Only what you land yourself trains you. Paying full xp for host damage let a
// necromancer level several times faster than any other build and walk into
// the next dungeon overlevelled.
function awardHostXp() {}
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
  // Mid-delve the fanfare is just another thing covering the board. Bank it
  // and report the lot on the results screen instead.
  if (runState && !runState.over) {
    if (!runState.levels) runState.levels = {};
    runState.levels[key] = level;
    return;
  }
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
let autoFightDefault = false;
let autoBindPick = null;

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
  const snap = runSnapshot();
  runState = {
    snap: snap,
    index: index, d: d,
    wave: 1,
    foe: null,
    loot: {},
    xpStart: SKILL_KEYS.reduce(function (o, k) { o[k] = skillXp(k); return o; }, {}),
    over: false,
    // Everything below is the in-run build — discarded when the run ends.
    boons: {}, runLevel: 0, pending: null,
    retinue: [], fallen: 0, peakHost: 0,
    foes: [], orders: {}, focus: null, phase: 'orders', auto: autoFightDefault,
    idSeq: 0, bossWave: false, summoned: 0,
    fury: 0, powerArmed: false, bindPending: null, rot: null,
    afterBoon: 'wave', bulwark: false, levels: {},
    minors: {}, bonusHit: 0, bonusHp: 0, bonusCrit: 0, sureStrike: false,
    pendingMinor: false,
    rampage: 0, hitCount: 0, round: 0,
    hpPenalty: 0, lastStandUsed: false,
    carryDetonate: 0, carryFreeze: false
  };
  if (index > G.deepestAttempt) G.deepestAttempt = index;
  $('run-name').textContent = d.name;
  const co = $('callout'); if (co) co.innerHTML = '';
  document.body.classList.add('in-run');
  startWave();
  render();
}

// ============================================================
// The board
// ============================================================
// A wave is a board, not a duel: one or more enemies at the top, you and
// your risen at the bottom. Each round you assign a target to every
// attacker you control, then FIGHT plays those orders out.

// Every summon is a whole extra attack per round, so they have to be rare
// and bounded — a caller that replenishes faster than you clear is an
// unwinnable wave, not a hard one.
const FOE_MINION_CAP = 4;

// What the other side can put on the board. Stats come off the caller, so a
// Void Warden is as far above a Brood Warden as its master is.
const FOE_MINION_KINDS = [
  { name: 'Warden',  icon: '🛡️', keys: ['taunt'],  hp: 1.35, dmg: 0.7 },
  { name: 'Shade',   icon: '🌫️', keys: ['ward'],   hp: 1.00, dmg: 1.0 },
  { name: 'Reaver',  icon: '⚔️', keys: ['double'], hp: 0.80, dmg: 0.6 },
  { name: 'Rotling', icon: '☠️', keys: ['wither'], hp: 1.00, dmg: 0.9 },
  { name: 'Leech',   icon: '🩸', keys: ['drain'],  hp: 1.00, dmg: 1.0 }
];
// You gain a boon every exchange, so the far end of a delve has to be a
// different proposition from the near end or the back half is a mop-up.
const WAVE_RAMP = 0.07;
function waveScale() {
  return 1 + WAVE_RAMP * ((runState ? runState.wave : 1) - 1);
}

const MINION_HP_SHARE = 0.60;      // of whatever called it
const MINION_HIT_SHARE = 0.70;

// Fury builds as you trade blows and buys one enormous swing. It is the
// decision AUTO cannot take away from you.
// A turn is: plan, then one exchange — you and your host swing, then they and
// theirs — then a boon, then plan again. One decision point per exchange.
const FURY_MAX = 100;
const FURY_PER_HIT = 9;
const FURY_PER_TAKEN = 6;
const POWER_MULT = 2.5;
const CRIT_CHANCE = 0.08;
const RAMPAGE_CAP = 10;      // Bloodlust III, bounded
function critChance() { return CRIT_CHANCE + ((runState && runState.bonusCrit) || 0); }
const CRIT_MULT = 1.5;
const SUMMON_BUDGET_BOSS = 4;
const SUMMON_BUDGET_MOB = 2;

function nextId() {
  runState.idSeq = (runState.idSeq || 0) + 1;
  return 'c' + runState.idSeq;
}

// A minion of whatever called it, in one of the five shapes.
function makeMinion(parent) {
  const kind = FOE_MINION_KINDS[rng(0, FOE_MINION_KINDS.length - 1)];
  const prefix = runState.d.summonPrefix || 'Lesser';
  const hp = Math.max(1, Math.round(parent.max * MINION_HP_SHARE * kind.hp));
  const f = {
    id: nextId(),
    name: prefix + ' ' + kind.name, icon: kind.icon,
    hp: hp, max: hp,
    atk: parent.atk, def: Math.round(parent.def * 0.8),
    maxHit: Math.max(1, Math.round(parent.maxHit * MINION_HIT_SHARE * kind.dmg)),
    boss: false, minion: true,
    keys: kind.keys.slice(), warded: kind.keys.indexOf('ward') >= 0,
    calls: 0, summonCd: 99, summonsLeft: 0,
    burn: null, chill: 0, frozen: 0, wither: null,
    intent: null
  };
  if (boonTier('voidtouched') >= 1) f.def = Math.round(f.def * 0.7);
  f.intent = { kind: 'attack', icon: '⚔', label: String(f.maxHit) };
  return f;
}

function foeHasKey(f, k) { return !!(f.keys && f.keys.indexOf(k) >= 0); }
function tauntingFoe() {
  return aliveFoes().filter(function (f) { return foeHasKey(f, 'taunt'); })[0] || null;
}

function makeFoe(base, opts) {
  const ds = difficultyScale * waveScale();
  const hp = Math.max(1, Math.round(base.hp * ds));
  const f = {
    id: nextId(),
    name: base.name, icon: base.icon,
    hp: hp, max: hp,
    atk: base.atk, def: base.def,
    maxHit: Math.max(1, Math.round(base.maxHit * ds)),
    boss: !!(opts && opts.boss),
    minion: !!(opts && opts.minion),
    calls: base.calls || 0, summonCd: 2,
    summonsLeft: (opts && opts.boss) ? SUMMON_BUDGET_BOSS : SUMMON_BUDGET_MOB,
    burn: null, chill: 0, frozen: 0, wither: null,
    intent: null
  };
  // Voidtouched sunders armour for the whole fight.
  if (boonTier('voidtouched') >= 1) f.def = Math.round(f.def * 0.7);
  // Born telegraphing a plain attack; planIntents refines it each round.
  f.intent = { kind: 'attack', icon: '⚔', label: String(f.maxHit) };
  return f;
}

function aliveFoes() {
  return runState ? runState.foes.filter(function (f) { return f.hp > 0; }) : [];
}
function mainFoe() { return (runState && runState.foes[0]) || null; }
function foeById(id) {
  return aliveFoes().filter(function (f) { return f.id === id; })[0] || null;
}

// Everything you command this round: you, then every risen unit.
function attackerList() {
  const list = [{ id: 'you', kind: 'you' }];
  hostUnits().forEach(function (u) { list.push({ id: u.id, kind: 'unit', unit: u }); });
  return list;
}

function startWave() {
  if (!runState) return;
  const d = runState.d;
  const isBoss = runState.wave > d.waves;
  const base = isBoss ? d.boss : d.monsters[rng(0, d.monsters.length - 1)];
  runState.bossWave = isBoss;
  runState.foes = [makeFoe(base, { boss: isBoss })];
  runState.orders = {};
  const foe = runState.foes[0];
  // Neither side walks in alone.
  runState.foes.push(makeMinion(foe));
  if (!hostUnits().length) raiseUnit(true);

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
    runState.foes = [];
    renderDungeonRun();
    waveCleared();
    return;
  }
  renderDungeonRun();
  enterOrders();
}

// ---- Giving orders --------------------------------------------------

let orderSel = 'you';     // whichever attacker the next tap assigns

function enterOrders() {
  if (!runState || runState.over) return;
  if (!aliveFoes().length) { waveCleared(); return; }
  runState.phase = 'orders';
  planIntents();
  defaultOrders();
  const list = attackerList();
  if (!list.some(function (a) { return a.id === orderSel; })) orderSel = list[0].id;
  renderDungeonRun();
  // Headless runs drive themselves; there is no auto button in the game.
  if (runState.auto) {
    if ((runState.fury || 0) >= FURY_MAX && !runState.powerArmed) unleashFury();
    hostUnits().forEach(function (u) {
      if (u.form && u.form.ability && !u.abilityUsed) useAbility(u.id);
    });
    runTimer = setTimeout(resolveTurn, pace(300));
  }
}

// Anything without a live target falls back to the wave's main enemy, so
// FIGHT alone is always a legal move.
function defaultOrders() {
  const alive = aliveFoes();
  if (!alive.length) return;
  if (runState.focus && !foeById(runState.focus)) runState.focus = null;
  const main = mainFoe();
  const fallback = runState.focus ||
    (main && main.hp > 0 ? main : alive[0]).id;
  attackerList().forEach(function (a) {
    if (!foeById(runState.orders[a.id])) runState.orders[a.id] = fallback;
  });
}

function selectAttacker(id) {
  if (!runState) return;
  orderSel = id;
  renderDungeonRun();
}

// Tapping an enemy assigns the selected attacker and moves on to the next,
// so a run of taps sets the whole board.
function assignTarget(foeId) {
  if (!runState) return;
  if (!foeById(foeId)) return;
  // While it plays itself, a tap means "everything on that one" — focus fire
  // you can redirect mid-fight without stopping to give orders.
  if (runState.auto) return targetAll(foeId);
  const list = attackerList();
  let i = list.map(function (a) { return a.id; }).indexOf(orderSel);
  if (i < 0) i = 0;
  runState.orders[list[i].id] = foeId;
  orderSel = list[(i + 1) % list.length].id;
  renderDungeonRun();
}

function targetAll(foeId) {
  if (!runState || !foeById(foeId)) return;
  runState.focus = foeId;
  attackerList().forEach(function (a) { runState.orders[a.id] = foeId; });
  renderDungeonRun();
}

// ---- Playing the orders out ----------------------------------------

function resolveTurn() {
  if (!runState || runState.over || runState.phase === 'resolving') return;
  if (!aliveFoes().length) return;
  runState.phase = 'resolving';
  runState.round = (runState.round || 0) + 1;
  renderDungeonRun();
  stepAttack(attackerList(), 0);
}

function stepAttack(queue, i) {
  if (!runState || runState.over) return;
  if (i >= queue.length) return afterPlayerPhase();
  const a = queue[i];
  // A unit can be gone by the time its turn comes round.
  if (a.kind === 'unit' && hostUnits().indexOf(a.unit) < 0) return stepAttack(queue, i + 1);
  const target = foeById(runState.orders[a.id]) || aliveFoes()[0];
  if (!target) return afterPlayerPhase();

  lunge(a.kind === 'you' ? 'you-card' : 'ally-' + a.id, 'foe-' + target.id);
  runTimer = setTimeout(function () {
    if (!runState || runState.over) return;
    if (a.kind === 'you') playerSwing(target); else unitSwing(a.unit, target);
    renderDungeonRun();
    renderTopBar();
    runTimer = setTimeout(function () { stepAttack(queue, i + 1); }, pace(70));
  }, pace(150));
}

// A guarded enemy line: single blows land on the wall, splash goes past it.
function throughTaunt(target) {
  const guard = tauntingFoe();
  return (guard && guard !== target && !foeHasKey(target, 'taunt')) ? guard : target;
}

function playerSwing(aimed) {
  const target = throughTaunt(aimed);
  if (target !== aimed) {
    runLog('<span class="boss">' + target.name + ' steps in front of the ' +
      aimed.name + '.</span>');
  }
  const power = !!runState.powerArmed;
  let raw = rollDamage(playerMaxHit(), playerAttackRoll(), monsterDefenceRoll(target));
  let crit = false;
  if (power) {
    // A power strike never whiffs.
    raw = Math.max(raw, Math.round(playerMaxHit() * 0.6));
    raw = Math.round(raw * POWER_MULT);
    runState.powerArmed = false;
  } else if (raw > 0 && (runState.sureStrike || Math.random() < critChance())) {
    raw = Math.round(raw * CRIT_MULT);
    crit = true;
    runState.sureStrike = false;
  }
  const off = boonOffence(raw, target);
  if (off.dmg > 0 && target.warded) {
    target.warded = false;
    runLog('<span class="boss">✨ ' + target.name + '\'s ward holds.</span>');
    floatOn('foe-' + target.id, 0);
    addFury(FURY_PER_HIT);
    return;
  }
  target.hp -= off.dmg;
  awardCombatXp(off.dmg);
  if (raw > 0) addFury(FURY_PER_HIT);
  flashCard('foe-' + target.id);
  floatOn('foe-' + target.id, off.dmg, (power || crit) ? 'crit' : '');
  if (power || crit) quake();
  runLog(power
    ? '<span class="fury">⚡ POWER STRIKE</span> — <b>' + off.dmg + '</b> into the ' + target.name + '.'
    : (raw > 0
      ? (crit ? '<span class="win">Critical!</span> ' : '') + 'You hit <b>' + off.dmg + '</b> on the ' + target.name +
        (off.notes.length ? ' <span class="boon">(' + off.notes.join(', ') + ')</span>' : '') + '.'
      : '<span class="miss">You miss the ' + target.name + '.</span>'));

  // A power strike cleaves into everything else on the board.
  if (power) {
    const splash = Math.max(1, Math.round(off.dmg * 0.5));
    aliveFoes().filter(function (f) { return f !== target; }).forEach(function (f) {
      f.hp -= splash;
      awardCombatXp(splash);
      floatOn('foe-' + f.id, splash);
    });
  }

  // Stormcaller arcs spill onto whatever else is standing.
  off.extraHits.forEach(function (h) {
    const others = aliveFoes().filter(function (f) { return f !== target; });
    const hit = others.length ? others[rng(0, others.length - 1)] : target;
    hit.hp -= h;
    awardCombatXp(h);
    floatOn('foe-' + hit.id, h);
    runLog('<span class="boon">⚡ Arc</span> — ' + h + ' on the ' + hit.name + '.');
  });
}

function unitSwing(u, target) {
  const swings = unitHasKey(u, 'double') ? 2 : 1;
  for (let i = 0; i < swings; i++) {
    if (!aliveFoes().length) return;
    unitStrike(u, target.hp > 0 ? target : aliveFoes()[0]);
  }
}

function unitStrike(u, aimed) {
  const target = throughTaunt(aimed);
  const name = unitLabel(u);
  let dealt = rollDamage(unitStats(u).dmg, playerAttackRoll(), monsterDefenceRoll(target));
  let crit = false;
  if (dealt > 0 && Math.random() < critChance()) { dealt = Math.round(dealt * CRIT_MULT); crit = true; }
  if (dealt <= 0) {
    runLog('<span class="miss">Your ' + name + ' claws at nothing.</span>');
    return;
  }
  if (target.warded) {
    target.warded = false;
    runLog('<span class="boss">✨ ' + target.name + '\'s ward holds.</span>');
    floatOn('foe-' + target.id, 0);
    return;
  }
  target.hp -= dealt;
  awardHostXp(dealt);
  flashCard('foe-' + target.id);
  floatOn('foe-' + target.id, dealt, crit ? 'crit' : 'necro');

  const notes = [];
  // Wight Lords drain a quarter; a Draining form takes half.
  let drainPct = boonTier('bonelegion') >= 2 ? 0.25 : 0;
  if (unitHasKey(u, 'drain')) drainPct = Math.max(drainPct, 0.5);
  if (drainPct > 0) {
    const heal = Math.min(maxHp() - G.hp, Math.max(1, Math.round(dealt * drainPct)));
    if (heal > 0) { G.hp += heal; notes.push('drains ' + heal); }
  }
  // Withering rots whatever it touches.
  if (unitHasKey(u, 'wither')) {
    target.wither = { dmg: 3, rounds: 2 };
    notes.push('☠ rotting');
  }
  // Sweeping spills onto the rest of the board.
  if (unitHasKey(u, 'sweep')) {
    const splash = Math.max(1, Math.round(dealt * 0.5));
    aliveFoes().filter(function (f) { return f !== target; }).forEach(function (f) {
      f.hp -= splash;
      awardHostXp(splash);
      floatOn('foe-' + f.id, splash, 'necro');
    });
    notes.push('🌊 sweeps');
  }
  runLog('<span class="boon">Your ' + name + ' hits ' + target.name +
    ' for <b>' + dealt + '</b></span>' +
    (notes.length ? ' <span class="boon">(' + notes.join(', ') + ')</span>' : '') + '.');
}

function addFury(n) {
  if (!runState) return;
  runState.fury = Math.min(FURY_MAX, (runState.fury || 0) + n);
}

// Spend a full meter to arm the next swing.
function unleashFury() {
  if (!runState || runState.over) return;
  if ((runState.fury || 0) < FURY_MAX || runState.powerArmed) return;
  runState.fury = 0;
  runState.powerArmed = true;
  runLog('<span class="fury">⚡ Fury unleashed</span> — your next blow lands like a hammer.');
  hostBanner('POWER STRIKE');
  renderDungeonRun();
}

function quake() {
  const b = $('run-board');
  if (!b || paceScale === 0) return;
  b.classList.remove('quake');
  void b.offsetWidth;
  b.classList.add('quake');
}

// ---- What your army can do while you are still deciding ----

function useAbility(unitId) {
  if (!runState || runState.over || runState.phase === 'resolving') return false;
  const u = hostUnits().filter(function (x) { return x.id === unitId; })[0];
  if (!u || !u.form || !u.form.ability || u.abilityUsed) return false;
  const a = u.form.ability;
  const foes = aliveFoes();
  const st = unitStats(u);
  let done = true;

  switch (a.key) {
    case 'bulwark':
      runState.bulwark = true;
      break;
    case 'miasma':
      if (!foes.length) { done = false; break; }
      foes.forEach(function (f) { f.wither = { dmg: 3, rounds: 2 }; });
      break;
    case 'feast': {
      if (!foes.length) { done = false; break; }
      const prey = foes.slice().sort(function (x, y) { return x.hp - y.hp; })[0];
      const dmg = st.dmg * 2;
      prey.hp -= dmg;
      awardHostXp(dmg);
      floatOn('foe-' + prey.id, dmg, 'necro');
      const heal = Math.min(maxHp() - G.hp, dmg);
      if (heal > 0) G.hp += heal;
      break;
    }
    case 'shieldwall':
      hostUnits().forEach(function (x) { x.warded = true; });
      break;
    case 'chain':
      if (!foes.length) { done = false; break; }
      foes.forEach(function (f) {
        f.hp -= st.dmg;
        awardHostXp(st.dmg);
        floatOn('foe-' + f.id, st.dmg, 'necro');
      });
      break;
    case 'onslaught':
      if (!foes.length) { done = false; break; }
      hostUnits().forEach(function (x) {
        const t = foeById(runState.orders[x.id]) || aliveFoes()[0];
        if (t) unitSwing(x, t);
      });
      break;
    case 'dragonfire':
      if (!foes.length) { done = false; break; }
      foes.forEach(function (f) {
        f.hp -= st.dmg;
        awardHostXp(st.dmg);
        floatOn('foe-' + f.id, st.dmg, 'crit');
      });
      quake();
      break;
    case 'harvest': {
      const doomed = foes.filter(function (f) { return f.hp <= f.max * 0.25; });
      if (!doomed.length) { done = false; break; }
      doomed.forEach(function (f) {
        awardHostXp(f.hp);
        floatOn('foe-' + f.id, f.hp, 'crit');
        f.hp = 0;
      });
      break;
    }
    case 'wake':
      if (!(runState.fallen > 0)) { done = false; break; }
      for (let i = 0; i < 2 && runState.fallen > 0; i++) {
        if (raiseUnit(true)) runState.fallen -= 1;
      }
      break;
    default:
      done = false;
  }

  if (!done) { toast('Nothing for ' + a.name + ' to do yet.'); return false; }
  u.abilityUsed = true;
  runLog('<span class="fury">' + a.icon + ' ' + a.name + '</span> — ' +
    unitLabel(u) + ' acts.');
  hostBanner(a.name.toUpperCase());
  reapFoes();
  renderDungeonRun();
  renderTopBar();
  if (!aliveFoes().length) {
    waveCleared();
  }
  return true;
}

function afterPlayerPhase() {
  if (!runState || runState.over) return;
  deathRipple();
  reapFoes();
  renderDungeonRun();
  renderTopBar();
  if (!aliveFoes().length) { waveCleared(); return; }
  runTimer = setTimeout(function () { stepFoe(aliveFoes().slice(), 0); }, pace(170));
}

// ---- The enemy's turn ----------------------------------------------

function stepFoe(queue, i) {
  if (!runState || runState.over) return;
  if (i >= queue.length) return endOfRound();
  const f = queue[i];
  const next = function () {
    runTimer = setTimeout(function () { stepFoe(queue, i + 1); }, pace(90));
  };
  if (f.hp <= 0) return stepFoe(queue, i + 1);

  // Frozen things lose the turn entirely.
  if (f.frozen > 0) {
    f.frozen -= 1;
    runLog('<span class="boon">❄️ ' + f.name + ' is frozen solid</span> and loses its turn.');
    renderDungeonRun();
    return next();
  }
  // Calling for help, or finding a second wind, costs the turn — the trade
  // that makes both fair, and what the telegraph promised.
  const intent = f.intent || decideIntent(f);
  if (intent.kind === 'summon') { doSummon(f); renderDungeonRun(); return next(); }
  if (intent.kind === 'enrage') { doEnrage(f); renderDungeonRun(); return next(); }

  const swings = foeHasKey(f, 'double') ? 2 : 1;
  for (let s = 0; s < swings; s++) foeStrike(f);
  renderDungeonRun();
  renderTopBar();
  if (G.hp <= 0) {
    G.hp = 0;
    runTimer = setTimeout(function () { endRun(false); }, pace(700));
    return;
  }
  next();
}

function foeStrike(f) {
  if (!runState || runState.over || f.hp <= 0 || G.hp <= 0) return;
  if (runState.bulwark) {
    runLog('<span class="boon">🛡 The bulwark holds</span> — ' + f.name + ' does nothing.');
    return;
  }
  const incoming = rollDamage(f.maxHit, monsterAttackRoll(f), playerDefenceRoll());
  const def = boonDefence(incoming, f);

  // The host is a wall as well as a weapon.
  const blocked = def.dmg > 0 && hostTakesHit(f, def.dmg);
  if (blocked) {
    def.reflect = 0;                       // you never took it, so nothing bounces
  } else {
    lunge('foe-' + f.id, 'you-card');
    G.hp -= def.dmg;
    if (G.hp <= 0 && unholyBargain()) {
      // the host paid for it
    } else if (G.hp <= 0 && boonTier('stoneblood') >= 3 && !runState.lastStandUsed) {
      runState.lastStandUsed = true;
      G.hp = Math.max(1, Math.round(maxHp() * 0.25));
      runLog('<span class="boon">🪨 Last Stand</span> — you refuse to fall, at ' + G.hp + ' hp.');
    }
    if (def.dmg > 0) addFury(FURY_PER_TAKEN);
    flashCard('you-card');
    floatOn('you-card', def.dmg);
    runLog(def.dmg > 0
      ? '<span class="hurt">' + f.name + ' hits you for <b>' + def.dmg + '</b>' +
        (def.notes.length ? ' (' + def.notes.join(', ') + ')' : '') + '.</span>'
      : '<span class="miss">' + f.name + ' misses.</span>');
  }

  // Rotling strikes leave you bleeding; a Leech takes what it deals.
  if (def.dmg > 0 && !blocked) {
    if (foeHasKey(f, 'wither')) {
      runState.rot = { dmg: Math.max(2, Math.round(f.maxHit * 0.4)), rounds: 2 };
      runLog('<span class="hurt">☠ ' + f.name + ' leaves you rotting.</span>');
    }
    if (foeHasKey(f, 'drain')) {
      const back = Math.min(f.max - f.hp, Math.max(1, Math.round(def.dmg * 0.5)));
      if (back > 0) {
        f.hp += back;
        runLog('<span class="hurt">🩸 ' + f.name + ' drinks ' + back + ' back.</span>');
      }
    }
  }

  if (def.reflect > 0) {
    f.hp -= def.reflect;
    awardCombatXp(def.reflect);
    floatOn('foe-' + f.id, def.reflect);
    runLog('<span class="boon">🪨 Retort</span> — ' + def.reflect + ' back at it.');
  }
}

// A foe calls up a minion of its dungeon's kind, on a cooldown and under a cap.
// Everything an enemy might do next, decided before you give orders so the
// board can telegraph it. A read you can act on is the whole point.
function planIntents() {
  aliveFoes().forEach(function (f) { f.intent = decideIntent(f); });
}

function decideIntent(f) {
  if (f.frozen > 0) return { kind: 'frozen', icon: '🧊', label: 'frozen' };
  // A boss finds a second wind at half health, once.
  if (f.boss && !f.enraged && f.hp <= f.max * 0.5) {
    return { kind: 'enrage', icon: '😤', label: 'ENRAGE' };
  }
  if (willSummon(f)) return { kind: 'summon', icon: '💀', label: 'calling' };
  return { kind: 'attack', icon: '⚔', label: String(f.maxHit) };
}

function willSummon(f) {
  if (!f.calls || f.summonsLeft <= 0) return false;
  if (f.summonCd > 0) { f.summonCd -= 1; return false; }
  if (runState.foes.filter(function (x) { return x.minion && x.hp > 0; }).length >= FOE_MINION_CAP) return false;
  return Math.random() < f.calls;
}

function doSummon(f) {
  f.summonCd = 3;
  f.summonsLeft -= 1;
  const m = makeMinion(f);
  runState.foes.push(m);
  runState.summoned = (runState.summoned || 0) + 1;
  runLog('<span class="boss">' + f.name + ' calls up a ' + m.name + '.</span>');
}

function doEnrage(f) {
  f.enraged = true;
  f.maxHit = Math.max(f.maxHit + 1, Math.round(f.maxHit * 1.5));
  runLog('<span class="boss">' + f.name + ' is enraged</span> — it hits far harder now.');
  hostBanner('ENRAGED');
}

function endOfRound() {
  if (!runState || runState.over) return;
  // Burn ticks and chill decays across the whole board.
  aliveFoes().forEach(function (f) {
    if (f.wither && f.wither.rounds > 0) {
      f.hp -= f.wither.dmg;
      f.wither.rounds -= 1;
      awardHostXp(f.wither.dmg);
      floatOn('foe-' + f.id, f.wither.dmg, 'necro');
      runLog('<span class="boon">☠ ' + f.name + ' rots</span> for ' + f.wither.dmg + '.');
    }
    if (f.burn && f.burn.rounds > 0) {
      f.hp -= f.burn.dmg;
      f.burn.rounds -= 1;
      awardCombatXp(f.burn.dmg);
      floatOn('foe-' + f.id, f.burn.dmg);
      runLog('<span class="boon">🔥 ' + f.name + ' burns</span> for ' + f.burn.dmg + '.');
    }
    if (f.chill > 0) f.chill -= 1;
  });
  if (runState.rot && runState.rot.rounds > 0) {
    G.hp -= runState.rot.dmg;
    runState.rot.rounds -= 1;
    floatOn('you-card', runState.rot.dmg);
    runLog('<span class="hurt">☠ The rot takes ' + runState.rot.dmg + '.</span>');
  }
  reapFoes();
  renderDungeonRun();
  renderTopBar();
  if (G.hp <= 0) {
    G.hp = 0;
    runTimer = setTimeout(function () { endRun(false); }, pace(700));
    return;
  }
  // Every exchange is paid for; clearing the wave pays a tree node instead.
  runState.bulwark = false;
  if (!aliveFoes().length) return waveCleared();
  runTimer = setTimeout(function () { offerBoons('orders'); }, pace(200));
}

// Clear out the dead, paying out for each. Summoned minions give combat xp
// through the damage you dealt them, but no drops — otherwise a boss that
// keeps calling is a loot fountain.
function reapFoes() {
  if (!runState) return;
  const dead = runState.foes.filter(function (f) { return f.hp <= 0; });
  if (!dead.length) return;
  dead.forEach(function (f) {
    runLog('<span class="win">' + f.name + ' is defeated.</span>');
    boonOnKill(f);
    if (!f.minion) rollLoot(f);
  });
  runState.foes = runState.foes.filter(function (f) { return f.hp > 0; });
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
  // Necromancy: the slain get back up on your side.
  const n = boonTier('necromancy');
  if (n >= 1) {
    const chance = n >= 3 ? 1 : (n >= 2 ? 0.75 : 0.40);
    if ((n >= 2 && foe.boss) || Math.random() < chance) {
      raiseUnit();
    }
    const size = hostUnits().length;
    if (size > (runState.peakHost || 0)) {
      runState.peakHost = size;
      if (size === 3) hostBanner('THE HOST GROWS');
      else if (size === 5) hostBanner('THE HOST SWARMS');
      else if (size === HOST_CAP) hostBanner('THE HOST IS LEGION');
    }
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
const WAVE_HEAL_PCT = 30;

function advanceWave() {
  if (!runState || runState.over) return;
  if (runState.bossWave) return endRun(true);
  runState.wave += 1;
  runState.lastStandUsed = false;
  // Wards reform between waves.
  hostUnits().forEach(function (u) {
    if (unitHasKey(u, 'ward')) u.warded = true;
    u.abilityUsed = false;
  });
  runState.rot = null;
  runState.bulwark = false;

  let pct = WAVE_HEAL_PCT + (boonTier('scavenger') >= 2 ? 15 : 0);
  const heal = Math.min(maxHp() - G.hp, Math.ceil(maxHp() * pct / 100));
  if (heal > 0) {
    G.hp += heal;
    runLog('<span class="win">You catch your breath. +' + heal + ' hp.</span>');
    renderTopBar();
  }

  // Animate Dead: half of what you lost gets back up between waves.
  if (boonTier('deathmagic') >= 2 && runState.fallen > 0) {
    const back = Math.floor(runState.fallen / 2);
    let raised = 0;
    for (let i = 0; i < back; i++) if (raiseUnit(true)) raised++;
    if (raised > 0) {
      runState.fallen -= raised;
      runLog('<span class="boon">🕯️ Animate Dead</span> — ' + raised +
        ' of your fallen claw their way back.');
      riseFx(raiseTier());
    }
  }

  // Opportunist hands out a free first tier on top of the exchange's own.
  if (boonTier('scavenger') >= 3) {
    const free = rollBoonChoices(1).filter(function (c) { return c.tier === 1; })[0];
    if (free) {
      runLog('<span class="boon">🐀 Opportunist</span> — a boon for nothing.');
      grantBoon(free.key, free.tier);
    }
  }

  startWave();
}

// ---- The between-wave level up ----

function offerBoons(next) {
  if (!runState || runState.over) return;
  runState.afterBoon = next || 'wave';
  // Clearing a wave earns a tree node; surviving an exchange earns spoils.
  const major = runState.afterBoon === 'wave';
  const choices = major ? rollBoonChoices(3) : rollMinors(3);
  runState.pendingMinor = !major;
  if (!choices.length) return afterBoonPick();   // every line maxed out
  runState.runLevel = (runState.runLevel || 0) + 1;
  runState.pending = choices;
  if (autoBoonPick) {                       // headless balance runs
    const idx = autoBoonPick(choices, runState);
    if (typeof idx === 'number' && idx >= 0) {
      chooseBoon(idx);
    } else {                                // negative index = decline
      runState.pending = null;
      afterBoonPick();
    }
    return;
  }
  renderBoonPick();
  document.body.classList.add('picking-boon');
}

// What happens once the pick is made: either the next wave walks in, or you
// go back to planning against what is still standing.
// One door out of a cleared wave, so the major boon can never be skipped.
function waveCleared() {
  if (!runState || runState.over) return;
  runTimer = setTimeout(function () { offerBoons('wave'); }, pace(400));
}

function afterBoonPick() {
  if (!runState || runState.over) return;
  if (runState.afterBoon === 'wave') {
    runTimer = setTimeout(advanceWave, pace(400));
  } else {
    enterOrders();
  }
}

function chooseBoon(index) {
  if (!runState || !runState.pending) return;
  const pick = runState.pending[index];
  if (!pick) return;
  runState.pending = null;
  document.body.classList.remove('picking-boon');
  if (pick.minor) grantMinor(pick.minor);
  else grantBoon(pick.key, pick.tier);
  renderDungeonRun();
  renderTopBar();
  afterBoonPick();
}

function renderBoonPick() {
  if (!runState || !runState.pending) return;
  const minor = !!runState.pendingMinor;
  $('bp-level').textContent = minor ? 'Spoils' : 'Delve Level ' + runState.runLevel;
  $('bp-sub').textContent = runState.d.name + ' — wave ' + runState.wave +
    ' of ' + runState.d.waves + (minor ? '' : ' · a wave cleared');
  const wrap = $('bp-choices');
  wrap.innerHTML = '';
  if (minor) {
    runState.pending.forEach(function (c, i) {
      const m = minorById(c.minor);
      const card = el('button', 'boon-card minor');
      card.innerHTML =
        '<div class="bc-head">' +
          '<span class="bc-ico">' + m.icon + '</span>' +
          '<span class="bc-line">Spoils</span>' +
          '<span class="bc-tier">' +
            ((runState.minors && runState.minors[m.key])
              ? '×' + runState.minors[m.key] : 'NEW') + '</span>' +
        '</div>' +
        '<div class="bc-name">' + m.name + '</div>' +
        '<div class="bc-desc">' + m.desc + '</div>';
      card.onclick = function () { chooseBoon(i); };
      wrap.appendChild(card);
    });
    return;
  }
  runState.pending.forEach(function (c, i) {
    const line = BOON_LINES[c.key];
    const t = line.tiers[c.tier - 1];
    const card = el('button', 'boon-card' + (c.tier > 1 ? ' upgrade' : '') +
      (line.faction ? ' fac-' + line.faction : ''));
    // Branch lines show where they sit in their path.
    const path = line.req
      ? Object.keys(line.req).map(function (k) { return BOON_LINES[k].name; }).join(' ') +
        ' <span class="bc-arrow">▸</span> ' + line.name
      : line.name;
    card.innerHTML =
      '<div class="bc-head">' +
        '<span class="bc-ico">' + line.icon + '</span>' +
        '<span class="bc-line">' + path + '</span>' +
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
  const keys = Object.keys(runState.boons || {})
    .filter(function (k) { return runState.boons[k] >= 1 && BOON_LINES[k]; });
  const anyMinor = Object.keys(runState.minors || {}).length;
  if (!keys.length && !anyMinor) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
  bar.style.display = '';
  const minors = Object.keys(runState.minors || {}).map(function (k) {
    const m = minorById(k);
    return m ? '<span class="boon-chip minor" title="' + esc(m.name) + '">' +
      m.icon + '<i>×' + runState.minors[k] + '</i></span>' : '';
  }).join('');
  bar.innerHTML = keys.map(function (k) {
    const t = runState.boons[k];
    return '<span class="boon-chip" title="' + esc(boonName(k, t)) + '">' +
      BOON_LINES[k].icon + '<i>' + 'I'.repeat(t) + '</i></span>';
  }).join('') + minors;
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
  const gained = rs.levels || {};
  const gainedKeys = Object.keys(gained);
  if (gainedKeys.length) {
    row('Levels gained', gainedKeys.map(function (k) {
      return SKILLS[k].icon + ' ' + SKILLS[k].name + ' <b>' + gained[k] + '</b>';
    }).join('<br>'));
  }

  // The host you ended with, if you walked a necromancer's run.
  if ((rs.retinue && rs.retinue.length) || rs.peakHost) {
    const tally = {};
    (rs.retinue || []).forEach(function (u) {
      tally[u.tier] = (tally[u.tier] || 0) + 1;
    });
    const standing = Object.keys(tally).sort().reverse().map(function (t) {
      return UNDEAD_TIERS[t].icon + ' ' + tally[t] + '× ' + UNDEAD_TIERS[t].name;
    }).join('<br>') || 'none left standing';
    row('Host', standing + '<br><span class="rr-tier">peaked at ' +
      (rs.peakHost || 0) + ', lost ' + (rs.fallen || 0) + '</span>');
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
  const d = runState.d;
  $('run-wave').textContent = runState.bossWave ? 'BOSS' : 'Wave ' + runState.wave + ' / ' + d.waves;

  // Anything raised mid-phase still needs somewhere to point.
  if (runState.phase === 'orders') defaultOrders();
  const ordering = runState.phase === 'orders' && !runState.auto;
  document.body.classList.toggle('ordering', ordering);

  // --- enemies, at the top. Summons stand in front of whatever called them.
  const mainWrap = $('foe-main'), minWrap = $('foe-minions');
  mainWrap.innerHTML = ''; minWrap.innerHTML = '';
  runState.foes.forEach(function (f) {
    (f.minion ? minWrap : mainWrap).appendChild(foeCard(f));
  });

  // --- your risen, in front of you; you at the bottom.
  const allies = $('ally-minions');
  allies.innerHTML = '';
  const doomed = bindPool();
  hostUnits().forEach(function (u) {
    allies.appendChild(allyCard(u, doomed.indexOf(u) >= 0));
  });
  renderYouCard();

  renderOrderBar();
  renderHost();
  renderBoonBar();
}

function foeCard(f) {
  const card = el('div', 'combatant foe' + (f.minion ? ' minion' : '') +
    (f.boss ? ' boss' : '') + (runState.focus === f.id ? ' focused' : '') +
    (foeHasKey(f, 'taunt') ? ' guard' : ''));
  card.id = 'foe-' + f.id;
  const st = [];
  if (f.burn && f.burn.rounds > 0) st.push('🔥');
  if (f.wither && f.wither.rounds > 0) st.push('☠');
  if (f.chill > 0) st.push('❄️');
  if (f.frozen > 0) st.push('🧊');
  // How many of your attackers are pointed at this one.
  const aimed = attackerList().filter(function (a) {
    return runState.orders[a.id] === f.id;
  }).length;
  const it = f.intent;
  const fkw = (f.keys || []).map(function (k) {
    return '<span class="f-kw' + (k === 'ward' && !f.warded ? ' spent' : '') +
      '" title="' + esc(KEYWORDS[k].name) + '">' + KEYWORDS[k].icon + '</span>';
  }).join('');
  card.innerHTML =
    (it ? '<div class="intent ' + it.kind + '">' + it.icon + ' ' + it.label + '</div>' : '') +
    (fkw ? '<div class="f-keys">' + fkw + '</div>' : '') +
    '<div class="ico">' + f.icon + '</div>' +
    '<div class="status">' + st.join(' ') + '</div>' +
    '<div class="nm">' + esc(f.name) + '</div>' +
    '<div class="track"><div class="fill" style="width:' +
      Math.max(0, (f.hp / f.max) * 100) + '%"></div></div>' +
    '<div class="hpv">' + Math.max(0, f.hp) + ' / ' + f.max + '</div>' +
    (aimed ? '<div class="aimed">🎯' + aimed + '</div>' : '');
  card.onclick = function () { assignTarget(f.id); };
  card.ondblclick = function () { targetAll(f.id); };
  return card;
}

function allyCard(u, doomed) {
  const st = unitStats(u);
  const card = el('div', 'unit t' + u.tier +
    (u.fresh ? ' rising' : '') + (u.promoted ? ' promoted' : '') +
    (u.bound ? ' bound' : '') + (doomed ? ' binding' : '') +
    (unitHasKey(u, 'taunt') ? ' taunt' : '') + (u.warded ? ' warded' : '') +
    (orderSel === u.id ? ' picking' : ''));
  card.id = 'ally-' + u.id;
  const kw = (u.keys || []).map(function (k) {
    return '<span class="u-kw' + (k === 'ward' && !u.warded ? ' spent' : '') +
      '" title="' + esc(KEYWORDS[k].name) + '">' + KEYWORDS[k].icon + '</span>';
  }).join('');
  card.innerHTML =
    '<span class="u-ico">' + unitIcon(u) + '</span>' +
    (kw ? '<span class="u-keys">' + kw + '</span>' : '') +
    '<span class="u-nm">' + esc(unitLabel(u)) + '</span>' +
    '<span class="u-bar"><i style="width:' + Math.max(0, (u.hp / u.max) * 100) + '%"></i></span>' +
    '<span class="u-hp">' + Math.max(0, u.hp) + ' / ' + u.max + '</span>' +
    '<span class="u-dmg">⚔ ' + st.dmg + '</span>' +
    orderBadge(u.id) +
    (u.form && u.form.ability
      ? '<button class="u-act' + (u.abilityUsed ? ' spent' : '') + '"' +
        (u.abilityUsed ? ' disabled' : '') + ' title="' +
        esc(u.form.ability.name + ' — ' + u.form.ability.desc) + '">' +
        u.form.ability.icon + '</button>'
      : '');
  card.title = unitLabel(u) + ' — ' + Math.max(0, u.hp) + '/' + u.max + ', hits for ' + st.dmg +
    ((u.keys || []).length ? ' · ' + u.keys.map(function (k) { return KEYWORDS[k].name; }).join(', ') : '');
  card.onclick = function () { selectAttacker(u.id); };
  const act = card.querySelector('.u-act');
  if (act) act.onclick = function (e) { e.stopPropagation(); useAbility(u.id); };
  u.fresh = false; u.promoted = false;
  return card;
}

function renderYouCard() {
  const card = $('you-card');
  if (!card) return;
  card.classList.toggle('picking', orderSel === 'you');
  const w = G.equipped.weapon;
  card.innerHTML =
    '<div class="ico">' + (w && GEAR[w] ? GEAR[w].icon : '🧍') + '</div>' +
    '<div class="nm">You</div>' +
    '<div class="track"><div class="fill" style="width:' +
      Math.max(0, (G.hp / maxHp()) * 100) + '%"></div></div>' +
    '<div class="hpv">' + Math.max(0, Math.floor(G.hp)) + ' / ' + maxHp() + '</div>' +
    orderBadge('you');
  card.onclick = function () { selectAttacker('you'); };
}

// Which enemy this attacker is pointed at. Hidden when there is only one
// thing to hit — no decision, no clutter.
function orderBadge(id) {
  if (aliveFoes().length < 2) return '';
  const t = foeById(runState.orders[id]);
  if (!t) return '';
  return '<span class="ord">→ ' + t.icon + '</span>';
}

function renderOrderBar() {
  const fight = $('run-fight'), hint = $('order-hint');
  if (!fight) return;
  const ordering = runState.phase === 'orders' && !runState.auto;
  fight.disabled = !ordering;
  fight.textContent = ordering ? 'FIGHT' : 'FIGHTING…';
  const board = $('run-board');
  if (board) board.classList.toggle('planning', ordering);

  // The rite, offered only when three of a kind are standing.
  const bind = $('bind-bar');
  if (bind) {
    const t = bindableTier();
    if (t < 0) {
      bind.style.display = 'none';
    } else {
      bind.style.display = '';
      bind.textContent = '🔗 BIND 3 ' + UNDEAD_TIERS[t].name.toUpperCase() +
        'S → ' + UNDEAD_TIERS[t + 1].name.toUpperCase();
    }
  }

  // Fury.
  const bar = $('fury-bar'), fill = $('fury-fill'), label = $('fury-label');
  if (bar) {
    const f = runState.fury || 0;
    const ready = f >= FURY_MAX && !runState.powerArmed;
    fill.style.width = (f / FURY_MAX * 100) + '%';
    bar.classList.toggle('ready', ready);
    bar.classList.toggle('armed', !!runState.powerArmed);
    bar.disabled = !ready;
    label.textContent = runState.powerArmed ? '⚡ POWER STRIKE READY'
      : (ready ? '⚡ UNLEASH FURY' : 'FURY ' + Math.round(f) + '%');
  }

  if (!hint) return;
  const many = aliveFoes().length > 1;
  if (runState.auto) {
    hint.textContent = many
      ? 'Tap an enemy to focus everything on it.'
      : 'Playing itself — tap AUTO to take the reins back.';
    return;
  }
  if (!ordering) { hint.textContent = 'The exchange plays out…'; return; }
  const ready = hostUnits().filter(function (u) {
    return u.form && u.form.ability && !u.abilityUsed;
  }).length;
  if (ready) {
    hint.innerHTML = 'Planning — <b>' + ready + '</b> ' +
      (ready === 1 ? 'ability' : 'abilities') + ' ready to fire.';
    return;
  }
  const sel = orderSel === 'you' ? 'You' : 'Your risen';
  hint.innerHTML = many
    ? 'Planning — ' + sel + ': tap an enemy to aim, double-tap for all.'
    : 'Planning — FIGHT to trade blows.';
}

// The host, its condition, and how hard it hits — the escalation made visible.
function renderHost() {
  const wrap = $('run-host');
  if (!wrap) return;
  const host = hostUnits();
  if (!host.length) {
    wrap.style.display = 'none';
    wrap.classList.remove('legion');
    $('run-board').style.setProperty('--necro', 0);
    return;
  }
  wrap.style.display = '';
  wrap.classList.toggle('legion', host.length >= HOST_CAP);

  $('host-count').textContent = host.length + ' / ' + HOST_CAP + ' · ' +
    hostMaxHit() + ' max hit';
  // The meter reads host damage against your own, so a full legion fills it.
  const share = hostMaxHit() / Math.max(1, playerMaxHit() + hostMaxHit());
  $('host-power').style.width = Math.min(100, share * 200) + '%';
  // Tint the stage as the host grows — subtle, but you feel it building.
  $('run-board').style.setProperty('--necro', Math.min(1, host.length / HOST_CAP));
}

// A unit clawing its way up out of the floor on your side of the stage.
function riseFx(tier) {
  const stage = $('run-board');
  if (!stage) return;
  const g = el('div', 'rise-ghost', UNDEAD_TIERS[tier].icon);
  g.style.left = (14 + rng(0, 22)) + '%';
  stage.appendChild(g);
  setTimeout(function () { try { stage.removeChild(g); } catch (e) {} }, 1100);
}

function fallFx() {
  const wrap = $('run-host');
  if (!wrap) return;
  wrap.classList.remove('shudder');
  void wrap.offsetWidth;
  wrap.classList.add('shudder');
}

// A one-line proclamation across the stage for the big moments.
function hostBanner(text) {
  const stage = $('run-board');
  if (!stage) return;
  const prev = stage.querySelector('.host-banner');
  if (prev) stage.removeChild(prev);
  const b = el('div', 'host-banner', text);
  stage.appendChild(b);
  setTimeout(function () { try { stage.removeChild(b); } catch (e) {} }, 1600);
}

// Ordinary hits are told by the floating numbers. Only the lines that carry
// a decision or a moment reach the callout — everything else is dropped.
const NOTABLE = /class="(boon|win|boss|lose|fury)"/;

function runLog(html) {
  if (!NOTABLE.test(html)) return;
  const c = $('callout');
  if (!c) return;
  const p = el('p', '', html);
  c.appendChild(p);
  setTimeout(function () { try { c.removeChild(p); } catch (e) {} }, 2800);
  while (c.children.length > 2) c.removeChild(c.firstChild);
}

function flashCard(id) {
  const n = $(id);
  if (!n) return;
  const ico = n.querySelector('.ico') || n;
  ico.classList.remove('hit');
  void ico.offsetWidth;
  ico.classList.add('hit');
}

// The attacker leans into its target and springs back — the swing you can see.
function lunge(fromId, toId) {
  if (paceScale === 0) return;
  const a = $(fromId), b = $(toId);
  if (!a || !b) return;
  const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
  a.style.setProperty('--dx', ((rb.left + rb.width / 2) - (ra.left + ra.width / 2)) * 0.5 + 'px');
  a.style.setProperty('--dy', ((rb.top + rb.height / 2) - (ra.top + ra.height / 2)) * 0.5 + 'px');
  a.classList.remove('lunge');
  void a.offsetWidth;
  a.classList.add('lunge');
  setTimeout(function () {
    const n = $(fromId);
    if (n) n.classList.remove('lunge');
  }, 460);
}

// A damage number over whichever card took it.
function floatOn(id, dmg, kind) {
  const board = $('run-board'), t = $(id);
  if (!board || !t) return;
  const rb = board.getBoundingClientRect(), rt = t.getBoundingClientRect();
  const d = el('div', 'float' + (dmg > 0 ? '' : ' zero') + (kind ? ' ' + kind : ''),
    dmg > 0 ? String(dmg) : '0');
  d.style.left = (rt.left - rb.left + rt.width / 2) + 'px';
  d.style.top = (rt.top - rb.top + rt.height * 0.25) + 'px';
  board.appendChild(d);
  setTimeout(function () { try { board.removeChild(d); } catch (e) {} }, 900);
}

// ============================================================
// Boot
// ============================================================

function wire() {
  const flee = $('run-flee');
  if (flee) flee.onclick = fleeRun;
  const fight = $('run-fight');
  if (fight) fight.onclick = function () { resolveTurn(); };
  const fury = $('fury-bar');
  if (fury) fury.onclick = unleashFury;
  const bind = $('bind-bar');
  if (bind) bind.onclick = performBind;
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

const BUILD = (typeof window !== 'undefined' && window.RF_BUILD) || 'dev';

function init() {
  wire();
  const tag = $('build-tag');
  if (tag) tag.textContent = 'build ' + BUILD;
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
  BUILD: BUILD,
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
  UNDEAD_TIERS: UNDEAD_TIERS, HOST_CAP: HOST_CAP,
  boonTier: boonTier, boonName: boonName, boonUnlocked: boonUnlocked,
  hostMaxHit: hostMaxHit, raiseUnit: raiseUnit, rollBoonChoices: rollBoonChoices,
  unleashFury: unleashFury, FURY_MAX: FURY_MAX,
  performBind: performBind, bindableTier: bindableTier, BIND_COUNT: BIND_COUNT,
  useAbility: useAbility,
  completeBind: completeBind, bindOffers: bindOffers, BIND_FORMS: BIND_FORMS,
  KEYWORDS: KEYWORDS, FOE_MINION_KINDS: FOE_MINION_KINDS,
  MINOR_BOONS: MINOR_BOONS,
  setAutoBind: function (fn) { autoBindPick = fn; },
  // Headless runs need the board to play itself.
  setAutoFight: function (on) {
    autoFightDefault = !!on;
    if (!runState) return;
    runState.auto = !!on;
    // Never barge in on an open pick — that would resolve the board out from
    // under a panel that is still waiting for an answer.
    if (on && runState.phase === 'orders' && !runState.pending) enterOrders();
  },
  fight: function () { resolveTurn(); },
  assignTarget: assignTarget, selectAttacker: selectAttacker, targetAll: targetAll,
  summonForTest: function () {
    if (!runState) return null;
    const parent = aliveFoes()[0];
    if (!parent) return null;
    const m = makeMinion(parent);
    runState.foes.push(m);
    renderDungeonRun();
    return m.id;
  },
  killFoeForTest: function (id) {
    if (!runState) return;
    runState.foes.forEach(function (f) { if (f.id === id) f.hp = 0; });
  },
  board: function () {
    if (!runState) return null;
    return {
      phase: runState.phase, auto: !!runState.auto, round: runState.round || 0,
      foes: runState.foes.map(function (f) {
        return { id: f.id, name: f.name, hp: f.hp, max: f.max,
                 minion: !!f.minion, boss: !!f.boss,
                 keys: (f.keys || []).slice(), warded: !!f.warded };
      }),
      rot: runState.rot ? runState.rot.rounds : 0,
      bulwark: !!runState.bulwark, waveScale: +waveScale().toFixed(2),
      allies: hostUnits().map(function (u) {
        return { id: u.id, tier: u.tier, hp: u.hp, max: u.max,
                 bound: !!u.bound, dmg: unitStats(u).dmg,
                 form: u.form ? u.form.name : null, keys: (u.keys || []).slice(),
                 warded: !!u.warded,
                 ability: (u.form && u.form.ability) ? u.form.ability.key : null,
                 abilityUsed: !!u.abilityUsed };
      }),
      bindable: bindableTier(), bindings: runState.bindings || 0,
      bindPending: (runState.bindPending || []).map(function (f) { return f.name; }),
      orders: Object.assign({}, runState.orders),
      focus: runState.focus || null,
      fury: runState.fury || 0, powerArmed: !!runState.powerArmed,
      intents: runState.foes.map(function (f) { return f.intent ? f.intent.kind : null; }),
      sel: orderSel, summoned: runState.summoned || 0
    };
  },
  runInfo: function () {
    if (!runState) return null;
    return {
      wave: runState.wave, runLevel: runState.runLevel,
      boons: Object.assign({}, runState.boons),
      pending: (runState.pending || []).map(function (p) {
        return p.minor ? 'minor:' + p.minor : p.key + ':' + p.tier;
      }),
      pendingMinor: !!runState.pendingMinor,
      minors: Object.assign({}, runState.minors || {}),
      host: (runState.retinue || []).map(function (u) { return u.tier; }),
      fallen: runState.fallen || 0, peakHost: runState.peakHost || 0,
      rampage: runState.rampage || 0
    };
  },
  takeBoon: grantBoon,          // the real grant path, side effects and all
  forceBoon: function (key, tier) {
    if (!runState) return;
    runState.boons[key] = tier;
    if (key === 'bonelegion') promoteHost();
  },
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
