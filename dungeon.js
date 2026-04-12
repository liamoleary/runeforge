(function(){
  // Inject dungeon shake CSS
  var dgStyle = document.createElement('style');
  dgStyle.textContent = '@keyframes dgShake{0%{transform:translate(0,0)}20%{transform:translate(-2px,1px)}40%{transform:translate(3px,-1px)}60%{transform:translate(-1px,2px)}80%{transform:translate(2px,-1px)}100%{transform:translate(0,0)}}'
    + '@keyframes dgFxFade{0%{opacity:1;transform:scale(0.3)}30%{opacity:1;transform:scale(1.2)}100%{opacity:0;transform:scale(1.6)}}'
    + '@keyframes dgSpark{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0.2)}}'
    + '@keyframes dgRing{0%{opacity:0.9;transform:scale(0.2)}100%{opacity:0;transform:scale(2.2)}}'
    + '@keyframes dgFlash{0%{opacity:0}30%{opacity:0.55}100%{opacity:0}}'
    + '@keyframes dgWobble{0%{transform:scale(0.6) rotate(-15deg)}50%{transform:scale(1.5) rotate(8deg)}100%{transform:scale(1) rotate(0deg)}}'
    + '@keyframes dgCritZoom{0%{transform:scale(0.2) rotate(0deg);opacity:0}25%{transform:scale(1.6) rotate(45deg);opacity:1}100%{transform:scale(2.2) rotate(90deg);opacity:0}}'
    + '@keyframes dgDeath{0%{opacity:1;transform:scale(1) rotate(0deg)}20%{opacity:1;transform:scale(1.7) rotate(-12deg)}100%{opacity:0;transform:scale(0.4) rotate(180deg) translate(0,30px)}}'
    + '@keyframes dgSpawn{0%{opacity:0;transform:scale(0.1) rotate(-180deg)}45%{opacity:1;transform:scale(1.5) rotate(20deg)}75%{opacity:1;transform:scale(1) rotate(0deg)}100%{opacity:0;transform:scale(1) rotate(0deg)}}'
    + '@keyframes dgFadeIn{0%{opacity:0}100%{opacity:1}}'
    + '@keyframes dgVictoryPop{0%{transform:scale(0.3);opacity:0}55%{transform:scale(1.12);opacity:1}80%{transform:scale(0.97)}100%{transform:scale(1);opacity:1}}'
    + '@keyframes dgRewardSpin{0%{transform:scale(0) rotate(-180deg);opacity:0}50%{transform:scale(1.5) rotate(20deg);opacity:1}100%{transform:scale(1) rotate(0deg);opacity:1}}'
    + '@keyframes dgRewardGlow{0%,100%{filter:drop-shadow(0 0 18px #ffaa00) drop-shadow(0 0 36px #ff8800)}50%{filter:drop-shadow(0 0 28px #ffd966) drop-shadow(0 0 50px #ffaa00)}}'
    + '@keyframes dgFwFlash{0%{opacity:1;transform:scale(0.5)}30%{opacity:1;transform:scale(2.6)}100%{opacity:0;transform:scale(3)}}'
    + '@keyframes dgFwSpark{0%{opacity:1;transform:translate(0,0) scale(1)}60%{opacity:1;transform:translate(calc(var(--dx) * 0.85),calc(var(--dy) * 0.85 - 6px)) scale(0.7)}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) + 26px)) scale(0.2)}}'
    + '@keyframes dgFwTrail{0%{opacity:0;transform:translateY(40px) scale(0.6)}40%{opacity:1}100%{opacity:0;transform:translateY(-10px) scale(1)}}'
    + '@keyframes dgSpellProjectile{0%{left:-60px;transform:scale(0.5) rotate(-25deg);opacity:0}18%{opacity:1}78%{transform:scale(1.5) rotate(15deg);opacity:1}100%{left:82%;transform:scale(0.9) rotate(35deg);opacity:0}}'
    + '@keyframes dgSpellMeteor{0%{top:-80px;right:82%;transform:scale(0.4) rotate(-45deg);opacity:0}25%{opacity:1}85%{top:60px;right:14%;transform:scale(1.8) rotate(30deg);opacity:1}100%{top:80px;right:12%;transform:scale(0.9) rotate(45deg);opacity:0}}'
    + '@keyframes dgSpellParticle{0%{opacity:1;transform:translate(0,0) scale(0.5) rotate(0deg)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.2) rotate(180deg)}}'
    + '@keyframes dgSpellRaindrop{0%{opacity:0;transform:translate(0,-60px) scale(0.6)}15%{opacity:1}100%{opacity:0;transform:translate(var(--dx),40px) scale(1.1)}}'
    + '@keyframes dgSpellBolt{0%{opacity:0;transform:scaleY(0.2) translateY(-40px)}20%{opacity:1}60%{opacity:1;transform:scaleY(1) translateY(0)}100%{opacity:0;transform:scaleY(1.1) translateY(4px)}}'
    + '@keyframes dgSpellSwirl{0%{opacity:0;transform:rotate(0deg) scale(0.3)}25%{opacity:1}100%{opacity:0;transform:rotate(720deg) scale(2.4)}}'
    + '@keyframes dgSpellCast{0%{transform:scale(1)}40%{transform:scale(1.25) rotate(-6deg)}70%{transform:scale(1.15) rotate(4deg)}100%{transform:scale(1) rotate(0deg)}}';
  document.head.appendChild(dgStyle);


  if(typeof ITEMS !== 'undefined'){
    if(!ITEMS.steel_axe) ITEMS.steel_axe = {name:'Steel Axe',icon:'🪓',sell:250,type:'weapon',atk:7,slot:'hand',rarity:'rare'};
    if(!ITEMS.enchanted_axe) ITEMS.enchanted_axe = {name:'Enchanted Grove Axe',icon:'🪓',sell:1200,type:'weapon',atk:12,slot:'hand',rarity:'epic',special:true};
    if(!ITEMS.steel_pickaxe) ITEMS.steel_pickaxe = {name:'Steel Pickaxe',icon:'⛏️',sell:250,type:'tool',rarity:'rare'};
    if(!ITEMS.steel_rod) ITEMS.steel_rod = {name:'Steel Fishing Rod',icon:'🎣',sell:250,type:'tool',rarity:'rare'};
    if(!ITEMS.steel_skillet) ITEMS.steel_skillet = {name:'Steel Skillet',icon:'🍳',sell:250,type:'tool',rarity:'rare'};
    if(!ITEMS.steel_smith_hammer) ITEMS.steel_smith_hammer = {name:'Steel Smith Hammer',icon:'🔨',sell:250,type:'tool',rarity:'rare'};
    if(!ITEMS.steel_fletch_knife) ITEMS.steel_fletch_knife = {name:'Steel Fletching Knife',icon:'🔪',sell:250,type:'tool',rarity:'rare'};
    if(!ITEMS.steel_needle) ITEMS.steel_needle = {name:'Steel Needle',icon:'🪡',sell:250,type:'tool',rarity:'rare'};
    if(!ITEMS.apprentice_wand) ITEMS.apprentice_wand = {name:'Apprentice Wand',icon:'🪄',sell:250,type:'tool',rarity:'rare'};
    if(!ITEMS.steel_shield) ITEMS.steel_shield = {name:'Steel Shield',icon:'🛡️',sell:250,type:'armour',def:5,hp:12,slot:'offhand',rarity:'rare'};
    // Legacy themed dungeon-boss armour (kept so old saves still know about them).
    if(!ITEMS.grove_crown)    ITEMS.grove_crown    = {name:'Grove Crown',       icon:'👑',sell:400, type:'armour',   def:3, hp:14, slot:'helmet',rarity:'epic'};
    if(!ITEMS.reef_boots)     ITEMS.reef_boots     = {name:'Reef Tidal Boots',  icon:'🥾',sell:600, type:'armour',   def:3, hp:18, slot:'boots',rarity:'epic'};
    if(!ITEMS.cave_plate)     ITEMS.cave_plate     = {name:'Stonehide Plate',   icon:'🪨',sell:900, type:'armour',   def:7, hp:30, slot:'chest',rarity:'epic'};
    if(!ITEMS.hearth_amulet)  ITEMS.hearth_amulet  = {name:'Hearth Amulet',     icon:'🔥',sell:1200,type:'accessory',        hp:28, atk:2, slot:'jewelry',rarity:'epic'};
    if(!ITEMS.forge_helm)     ITEMS.forge_helm     = {name:'Molten Warhelm',    icon:'⛑️',sell:1600,type:'armour',   def:6, hp:32, slot:'helmet',rarity:'epic'};
    if(!ITEMS.hollow_bow)     ITEMS.hollow_bow     = {name:'Hollow Longbow',    icon:'🏹',sell:2200,type:'weapon',   atk:18,         slot:'hand',rarity:'epic'};
    if(!ITEMS.spinner_cloak)  ITEMS.spinner_cloak  = {name:'Spinner Weave Cloak',icon:'🕸️',sell:2800,type:'armour',  def:9, hp:42, slot:'chest',rarity:'epic'};
    if(!ITEMS.vault_ring)     ITEMS.vault_ring     = {name:'Vault Keeper Ring', icon:'💍',sell:3400,type:'accessory',        hp:24, atk:6, slot:'jewelry',rarity:'epic'};
  }

  var dungeonState = null;

  // Dungeon progression: 12 tiers per skill. Each tier unlocks at a progressively
  // higher skill level and drops better themed gear. Skill level requirements:
  var DUNGEON_TIER_UNLOCKS = [3, 10, 18, 26, 35, 44, 54, 64, 74, 84, 92, 99];
  // Populated by generateAllDungeons(); maps a specific dungeon id -> required skill level.
  var DUNGEON_UNLOCK_LEVELS = {};
  // Legacy single-level export for any code that still reads it.
  var DUNGEON_UNLOCK_LEVEL = 3;

  // Per-skill themes: base data shared across all 12 tiers of a skill's dungeon line.
  var SKILL_THEMES = {
    woodcutting:{
      name:'Enchanted Grove',icon:'🌳',
      desc:'A grove of twisted wood, drinking deeper into darkness with every step.',
      flavour:'The trees stir with dark energy.',
      discovery:'Deep in the woods, your axe strikes uncover a hidden grove choked with twisted growth. Eyes blink in the gloom — something has been waiting.',
      monsters:[{name:'Twisted Sapling',icon:'🌱'},{name:'Thorny Sprout',icon:'🌿'},{name:'Whipping Vine',icon:'🌾'},{name:'Fungal Sapling',icon:'🍄'},{name:'Ancient Seedling',icon:'🌲'}],
      loot:[{id:'logs',name:'Logs',icon:'🪵',weight:30,min:2,max:5},{id:'oak_log',name:'Oak Logs',icon:'🪵',weight:22,min:1,max:3},{id:'willow_log',name:'Willow Logs',icon:'🪵',weight:12,min:1,max:2},{id:'arrow_shaft',name:'Arrow Shafts',icon:'↑',weight:25,min:3,max:8},{id:'feather',name:'Feathers',icon:'🪶',weight:20,min:2,max:6},{id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}],
      gear:{helmet:{name:'Grove Crown',icon:'👑'},chest:{name:'Grove Vestment',icon:'🍃'},boots:{name:'Grove Trodders',icon:'🥾'},jewelry:{name:'Grove Talisman',icon:'🌿'}}
    },
    mining:{
      name:'Crumbling Mineshaft',icon:'⛏️',
      desc:'Layer upon layer of abandoned shafts plunge into the earth.',
      flavour:'Pickaxes echo in the dark.',
      discovery:'Your pickaxe punches through the rock and a draft of cold air rushes out. Beyond the breach, a forgotten mineshaft drops into the dark — and something is moving down there.',
      monsters:[{name:'Rock Crawler',icon:'🪨'},{name:'Coal Wisp',icon:'⚫'},{name:'Cave Bat',icon:'🦇'},{name:'Iron Maw',icon:'🟠'},{name:'Stone Warden',icon:'🗿'}],
      loot:[{id:'copper_ore',name:'Copper Ore',icon:'🟫',weight:30,min:2,max:5},{id:'tin_ore',name:'Tin Ore',icon:'⬜',weight:25,min:2,max:4},{id:'iron_ore',name:'Iron Ore',icon:'🔵',weight:18,min:1,max:3},{id:'coal',name:'Coal',icon:'🖤',weight:14,min:1,max:3},{id:'gold_ore',name:'Gold Ore',icon:'💛',weight:6,min:1,max:2},{id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}],
      gear:{helmet:{name:'Stonehide Helm',icon:'⛑️'},chest:{name:'Stonehide Plate',icon:'🪨'},boots:{name:'Stonehide Treads',icon:'🥾'},jewelry:{name:'Deepstone Ring',icon:'💎'}}
    },
    fishing:{
      name:'Sunken Reef',icon:'🐟',
      desc:'A drowned reef, deeper with each expedition, hiding predators among coral spires.',
      flavour:'Bubbles rise from the deep.',
      discovery:'Your line snags on something that pulls back. Hauling it in, you find a chunk of coral from a sunken reef no fisher has charted. The water beneath you suddenly feels much deeper.',
      monsters:[{name:'Reef Piranha',icon:'🐟'},{name:'Stinging Jelly',icon:'🪼'},{name:'Snapping Crab',icon:'🦀'},{name:'Eel Spawn',icon:'🐍'},{name:'Coral Tyrant',icon:'🪸'}],
      loot:[{id:'raw_shrimp',name:'Raw Shrimp',icon:'🦐',weight:30,min:2,max:5},{id:'raw_sardine',name:'Raw Sardine',icon:'🐟',weight:24,min:2,max:4},{id:'raw_trout',name:'Raw Trout',icon:'🐠',weight:14,min:1,max:3},{id:'raw_salmon',name:'Raw Salmon',icon:'🐡',weight:8,min:1,max:2},{id:'raw_lobster',name:'Raw Lobster',icon:'🦞',weight:5,min:1,max:1},{id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}],
      gear:{helmet:{name:'Coralweave Hood',icon:'🪸'},chest:{name:'Scaled Cuirass',icon:'🐠'},boots:{name:'Tidal Boots',icon:'🥾'},jewelry:{name:'Pearl Pendant',icon:'🦪'}}
    },
    cooking:{
      name:'Cursed Pantry',icon:'🍳',
      desc:'Animated pots and ravenous rats infest a forgotten kitchen.',
      flavour:'Something is bubbling.',
      discovery:'A pungent smell drifts out from the back of an abandoned inn. Following the trail of broken crockery, you find a pantry where something is still bubbling — and watching.',
      monsters:[{name:'Pantry Rat',icon:'🐀'},{name:'Hungry Wisp',icon:'🍖'},{name:'Boiling Pot',icon:'🍲'},{name:'Spice Specter',icon:'🌶️'},{name:'Ember Cook',icon:'🔥'}],
      loot:[{id:'raw_meat',name:'Raw Meat',icon:'🥩',weight:30,min:2,max:4},{id:'c_shrimp',name:'Shrimp',icon:'🍤',weight:22,min:2,max:4},{id:'c_sardine',name:'Sardine',icon:'🐟',weight:16,min:1,max:3},{id:'c_meat',name:'Cooked Meat',icon:'🍖',weight:10,min:1,max:2},{id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}],
      gear:{helmet:{name:'Hearth Cowl',icon:'🧑‍🍳'},chest:{name:'Apron of Embers',icon:'🔥'},boots:{name:'Ember Sandals',icon:'🥾'},jewelry:{name:'Hearth Amulet',icon:'🍳'}}
    },
    smithing:{
      name:'Molten Forge',icon:'🔨',
      desc:'Slag golems shamble through an abandoned smithy.',
      flavour:'Heat shimmers off the anvils.',
      discovery:'A clanging echoes from the hills — anvils that should be silent. You trace the sound to a long-forgotten forge where the bellows still breathe with heat, and the slag is stirring.',
      monsters:[{name:'Slag Imp',icon:'🧌'},{name:'Anvil Spirit',icon:'⚒️'},{name:'Cinder Hound',icon:'🐕'},{name:'Bellows Beast',icon:'💨'},{name:'Forge Lord',icon:'🔥'}],
      loot:[{id:'copper_ore',name:'Copper Ore',icon:'🟫',weight:24,min:2,max:5},{id:'tin_ore',name:'Tin Ore',icon:'⬜',weight:22,min:2,max:4},{id:'iron_ore',name:'Iron Ore',icon:'🔵',weight:16,min:1,max:3},{id:'coal',name:'Coal',icon:'🖤',weight:14,min:1,max:3},{id:'bronze_bar',name:'Bronze Bar',icon:'🟫',weight:10,min:1,max:2},{id:'iron_bar',name:'Iron Bar',icon:'⬛',weight:5,min:1,max:1},{id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}],
      gear:{helmet:{name:'Molten Warhelm',icon:'⛑️'},chest:{name:'Forged Cuirass',icon:'🛡️'},boots:{name:'Slagwalker Boots',icon:'🥾'},jewelry:{name:'Forge Signet',icon:'💍'}}
    },
    fletching:{
      name:'Splinterwood Hollow',icon:'🏹',
      desc:'Vengeful tree spirits guard their fallen kin.',
      flavour:'Branches snap.',
      discovery:'A fletched arrow that isn\'t yours lies in the underbrush, still warm. Following its trajectory, you find a hollow tree gaping into a splintered hallow — and the wood remembers.',
      monsters:[{name:'Twig Sprite',icon:'🌿'},{name:'Bark Knight',icon:'🪵'},{name:'Quill Hawk',icon:'🦅'},{name:'Sharp Beak',icon:'🐦'},{name:'Hollow Druid',icon:'🧙'}],
      loot:[{id:'arrow_shaft',name:'Arrow Shafts',icon:'↑',weight:30,min:4,max:10},{id:'feather',name:'Feathers',icon:'🪶',weight:28,min:3,max:8},{id:'oak_log',name:'Oak Logs',icon:'🪵',weight:18,min:1,max:3},{id:'iron_arrow',name:'Iron Arrows',icon:'🪃',weight:10,min:2,max:5},{id:'gold_coins',name:'Gold',icon:'🪙',weight:30,min:5,max:20}],
      gear:{helmet:{name:'Quilled Hood',icon:'🧢'},chest:{name:'Splinter Jerkin',icon:'🏹'},boots:{name:'Huntsman Boots',icon:'🥾'},jewelry:{name:'Hawkseye Ring',icon:'🪶'}}
    },
    crafting:{
      name:"Spinner's Lair",icon:'🕸️',
      desc:'A web-choked tower hides skittering horrors.',
      flavour:'Silk drapes the walls.',
      discovery:'Threads of strange silk cling to your needle, finer than anything you\'ve woven. They lead away from your workbench, out the door, and up to a tower thick with webs.',
      monsters:[{name:'Silk Spider',icon:'🕷️'},{name:'Tangle Weaver',icon:'🕸️'},{name:'Loom Spirit',icon:'🧵'},{name:'Stitch Wraith',icon:'🪡'},{name:'Spinner Queen',icon:'👑'}],
      loot:[{id:'cowhide',name:'Cowhide',icon:'🐄',weight:26,min:2,max:5},{id:'leather',name:'Leather',icon:'📜',weight:18,min:1,max:3},{id:'feather',name:'Feathers',icon:'🪶',weight:20,min:2,max:6},{id:'arrow_shaft',name:'Arrow Shafts',icon:'↑',weight:14,min:2,max:5},{id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}],
      gear:{helmet:{name:'Silken Coif',icon:'🪡'},chest:{name:'Spinner Weave Cloak',icon:'🕸️'},boots:{name:'Woven Boots',icon:'🥾'},jewelry:{name:'Silkbinder Ring',icon:'🕷️'}}
    },
    magic:{
      name:'Whispering Vault',icon:'✨',
      desc:'Animated tomes and wisps drift through an old archive.',
      flavour:'The air hums with arcane power.',
      discovery:'Your spells stir a current you didn\'t cast. Tracing it back to its source, you find a vault sealed for centuries, its doors humming open at your touch. Voices whisper from within.',
      monsters:[{name:'Wisp',icon:'✨'},{name:'Animated Tome',icon:'📖'},{name:'Rune Spectre',icon:'🔯'},{name:'Mana Leech',icon:'💧'},{name:'Vault Keeper',icon:'🧙'}],
      loot:[{id:'feather',name:'Feathers',icon:'🪶',weight:30,min:3,max:8},{id:'bones',name:'Bones',icon:'🦴',weight:25,min:2,max:5},{id:'arrow_shaft',name:'Arrow Shafts',icon:'↑',weight:18,min:2,max:5},{id:'gold_ore',name:'Gold Ore',icon:'💛',weight:6,min:1,max:1},{id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}],
      gear:{helmet:{name:'Arcanist Circlet',icon:'🔮'},chest:{name:'Rune-Woven Robe',icon:'🧙'},boots:{name:'Whispering Slippers',icon:'🥾'},jewelry:{name:'Vault Keeper Ring',icon:'💍'}}
    }
  };

  // Roman marks for the three gear ranks (I, II, III) that a skill's themed gear
  // rotates through across its 12 dungeon tiers.
  var GEAR_MARKS = ['I','II','III'];
  var GEAR_SLOT_CYCLE = ['helmet','chest','boots','jewelry'];

  // Per-skill ability templates: one entry per room (5 monsters). Each entry can include
  // any of these flags:
  //   poison      : DoT damage applied to the player
  //   poisonChance: 0..1 chance per hit to poison
  //   heal        : amount the monster restores per heal tick
  //   healCD      : turns between heal ticks
  //   shield      : has a periodic shield ability
  //   shieldCD    : turns between activations
  //   shieldTurns : duration of each shield
  //   flying      : melee attacks miss; only ranged (bow) or magic can hit
  //   resist      : 'physical' | 'magic' (half damage from that attack type)
  //   immune      : 'physical' | 'magic' (zero damage from that attack type)
  var ABILITY_TEMPLATES = {
    woodcutting:[
      {},
      {poison:1,poisonChance:0.4},
      {},
      {heal:4,healCD:3},
      {resist:'physical',poison:2,poisonChance:0.55}
    ],
    mining:[
      {resist:'magic'},
      {flying:true},
      {flying:true},
      {resist:'physical'},
      {shield:true,shieldCD:4,shieldTurns:2,immune:'magic'}
    ],
    fishing:[
      {},
      {poison:1,poisonChance:0.5},
      {shield:true,shieldCD:4,shieldTurns:2},
      {resist:'magic'},
      {shield:true,shieldCD:5,shieldTurns:2,heal:5,healCD:4}
    ],
    cooking:[
      {},
      {resist:'magic'},
      {heal:3,healCD:3},
      {poison:2,poisonChance:0.55},
      {heal:6,healCD:3,resist:'magic'}
    ],
    smithing:[
      {},
      {shield:true,shieldCD:4,shieldTurns:2},
      {},
      {resist:'physical'},
      {shield:true,shieldCD:4,shieldTurns:2,heal:5,healCD:4}
    ],
    fletching:[
      {},
      {shield:true,shieldCD:4,shieldTurns:2},
      {flying:true},
      {flying:true},
      {heal:5,healCD:3,resist:'magic'}
    ],
    crafting:[
      {poison:1,poisonChance:0.45},
      {},
      {flying:true},
      {resist:'physical'},
      {heal:5,healCD:3,poison:2,poisonChance:0.6}
    ],
    magic:[
      {flying:true,immune:'magic'},
      {resist:'magic'},
      {immune:'physical'},
      {heal:4,healCD:3},
      {shield:true,shieldCD:4,shieldTurns:2,immune:'magic'}
    ]
  };

  // Per-skill stat profiles. Each skill biases its themed gear differently so the
  // player can choose a build by focusing the right skill: dodge, tank, attack,
  // or HP-heavy. Total power across the four stats stays roughly balanced.
  var SKILL_GEAR_PROFILES = {
    woodcutting: {def:0.8, hp:1.0, dodge:1.4, atk:0.9, theme:'Agile'},
    mining:      {def:1.4, hp:1.2, dodge:0.6, atk:0.8, theme:'Tanky'},
    fishing:     {def:0.7, hp:1.0, dodge:1.5, atk:0.9, theme:'Evasive'},
    cooking:     {def:1.0, hp:1.6, dodge:0.8, atk:0.7, theme:'Vital'},
    smithing:    {def:1.6, hp:1.3, dodge:0.5, atk:0.8, theme:'Heavy'},
    fletching:   {def:0.8, hp:1.0, dodge:1.1, atk:1.5, theme:'Precise'},
    crafting:    {def:0.9, hp:1.0, dodge:1.3, atk:0.9, theme:'Silken'},
    magic:       {def:0.7, hp:1.0, dodge:0.9, atk:1.7, theme:'Arcane'}
  };

  function computeGearStats(slot, markIdx, sk){
    var m = markIdx + 1; // 1..3
    var p = SKILL_GEAR_PROFILES[sk] || {def:1,hp:1,dodge:1,atk:1};
    var s = {};
    if (slot === 'helmet'){
      s.def = Math.max(1, Math.round((2 + m*2) * p.def));
      s.hp  = Math.max(1, Math.round((10 + m*10) * p.hp));
    } else if (slot === 'chest'){
      s.def = Math.max(1, Math.round((4 + m*4) * p.def));
      s.hp  = Math.max(1, Math.round((18 + m*18) * p.hp));
    } else if (slot === 'boots'){
      s.def   = Math.max(1, Math.round((1 + m*2) * p.def));
      s.hp    = Math.max(1, Math.round((8 + m*8) * p.hp));
      s.dodge = Math.max(1, Math.round((4 + m*2) * p.dodge));
    } else if (slot === 'jewelry'){
      s.hp    = Math.max(1, Math.round((14 + m*12) * p.hp));
      s.atk   = Math.max(1, Math.round((m*2 + 1) * p.atk));
      s.dodge = Math.max(1, Math.round((2 + m*2) * p.dodge));
    }
    return s;
  }
  function gearEffLabel(stats){
    var parts=[];
    if(stats.atk) parts.push('ATK +'+stats.atk);
    if(stats.def) parts.push('DEF +'+stats.def);
    if(stats.hp)  parts.push('HP +' +stats.hp);
    if(stats.dodge) parts.push('DODGE +'+stats.dodge+'%');
    return parts.join(' · ');
  }
  // Drop chance per tier — generous on tier 1, painful on tier 12.
  // Tier 1≈50% → tier 12≈8% (curve: 50 * 0.85^(t-1))
  function dropChanceForTier(tier){
    return Math.max(5, Math.round(50 * Math.pow(0.85, tier - 1)));
  }
  // Mark I → rare, Mark II → epic, Mark III → legendary.
  var GEAR_MARK_RARITIES = ['rare','epic','legendary'];

  // Per-skill shard themes — each skill's dungeon drops a themed crafting component
  // instead of finished gear. The shard is combined with skill materials to forge the item.
  var SHARD_THEMES = {
    woodcutting: {prefix:'grove',      icon:'🌿', name:'Grove'},
    mining:      {prefix:'deepstone',  icon:'💎', name:'Deepstone'},
    fishing:     {prefix:'reef',       icon:'🪸', name:'Reef'},
    cooking:     {prefix:'ember',      icon:'🔥', name:'Ember'},
    smithing:    {prefix:'forge',      icon:'⚒️', name:'Forge'},
    fletching:   {prefix:'hollow',     icon:'🏹', name:'Hollow'},
    crafting:    {prefix:'silkweave',  icon:'🕸️', name:'Silkweave'},
    magic:       {prefix:'arcane',     icon:'🔮', name:'Arcane'},
  };
  var SHARD_MARK_NAMES = ['Basic','Refined','Masterwork'];

  function registerGearItem(id, name, icon, slot, stats, markIdx){
    if (typeof ITEMS === 'undefined' || ITEMS[id]) return;
    var item = {
      name:name, icon:icon,
      sell:(slot==='jewelry' ? 600 : 400) + 400 * (markIdx||0),
      type:(slot==='jewelry' ? 'accessory' : 'armour'),
      slot:slot,
      rarity: GEAR_MARK_RARITIES[markIdx||0] || 'rare'
    };
    if (stats.atk) item.atk = stats.atk;
    if (stats.def) item.def = stats.def;
    if (stats.hp)  item.hp  = stats.hp;
    if (stats.dodge) item.dodge = stats.dodge;
    ITEMS[id] = item;
  }

  // Register a dungeon-dropped gear piece — ~80% of crafted stats.
  // Drops use rare/epic/legendary rarities so they feel rewarding as primary gear source.
  var DROP_GEAR_RARITIES = ['rare','epic','legendary'];
  function registerDropGearItem(id, name, icon, slot, stats, markIdx){
    if (typeof ITEMS === 'undefined' || ITEMS[id]) return;
    var item = {
      name:name, icon:icon,
      sell:Math.round(((slot==='jewelry' ? 600 : 400) + 400 * (markIdx||0)) * 0.4),
      type:(slot==='jewelry' ? 'accessory' : 'armour'),
      slot:slot,
      rarity: DROP_GEAR_RARITIES[markIdx||0] || 'uncommon',
      dropped: true
    };
    if (stats.atk) item.atk = Math.max(1, Math.round(stats.atk * 0.8));
    if (stats.def) item.def = Math.max(1, Math.round(stats.def * 0.8));
    if (stats.hp)  item.hp  = Math.max(1, Math.round(stats.hp  * 0.8));
    if (stats.dodge) item.dodge = Math.max(1, Math.round(stats.dodge * 0.8));
    ITEMS[id] = item;
  }

  function generateSkillDungeons(sk, theme){
    var out = {};
    for (var tier = 1; tier <= 12; tier++){
      var id = sk + '_t' + tier;
      var unlockLvl = DUNGEON_TIER_UNLOCKS[tier - 1];
      var scale = 1 + (tier - 1) * 0.6; // tier 1 = 1x, tier 12 = 7.6x

      var abilities = ABILITY_TEMPLATES[sk] || [];
      var rooms = theme.monsters.map(function(m, i){
        var baseHp = 5 + i * 2; // 5,7,9,11,13
        var hp = Math.max(3, Math.round(baseHp * scale));
        var dmn = Math.max(1, Math.round((1 + Math.floor(i/2)) * Math.sqrt(scale)));
        var dmx = Math.max(dmn + 1, Math.round((2 + Math.floor(i/2)) * Math.sqrt(scale)));
        var room = {
          name: m.name, icon: m.icon,
          hp: hp, maxhp: hp,
          dmg: [dmn, dmx],
          xp: Math.round((15 + i * 5) * scale),
          weak: null, resist: null
        };
        var ab = abilities[i] || {};
        // Copy ability flags onto the room. Heal/shield amounts also scale with tier.
        if (ab.poison)       room.poison = Math.max(1, Math.round(ab.poison * Math.sqrt(scale)));
        if (ab.poisonChance) room.poisonChance = ab.poisonChance;
        if (ab.heal)         room.heal = Math.max(1, Math.round(ab.heal * Math.sqrt(scale)));
        if (ab.healCD)       room.healCD = ab.healCD;
        if (ab.shield)       room.shield = true;
        if (ab.shieldCD)     room.shieldCD = ab.shieldCD;
        if (ab.shieldTurns)  room.shieldTurns = ab.shieldTurns;
        if (ab.flying)       room.flying = true;
        if (ab.resist)       room.resist = ab.resist;
        if (ab.immune)       room.immune = ab.immune;
        return room;
      });
      // Bump the boss (last monster)
      var boss = rooms[rooms.length - 1];
      boss.hp = Math.round(boss.hp * 1.6);
      boss.maxhp = boss.hp;
      boss.xp = Math.round(boss.xp * 1.8);

      // Gear drop for this tier: cycles helmet→chest→boots→jewelry and upgrades to mark II/III every 4 tiers.
      var slot = GEAR_SLOT_CYCLE[(tier - 1) % 4];
      var markIdx = Math.floor((tier - 1) / 4); // 0,1,2
      var gearBase = theme.gear[slot];
      var gearItemId = sk + '_' + slot + '_mk' + (markIdx + 1);
      var gearName = gearBase.name + ' ' + GEAR_MARKS[markIdx];
      var stats = computeGearStats(slot, markIdx, sk);
      // Keep gear item registered so crafting recipes can reference it.
      registerGearItem(gearItemId, gearName, gearBase.icon, slot, stats, markIdx);

      // Dungeons drop both a crafting shard AND (rarely) a weaker piece of gear.
      // Shards are the primary crafting ingredient — required to forge the full-strength item.
      // Gear drops are a lucky bonus: weaker stats (~60%) and lower rarity than crafted.
      var shardTheme = SHARD_THEMES[sk] || {prefix: sk, icon: '💎', name: sk};
      var shardId   = shardTheme.prefix + '_shard_mk' + (markIdx + 1);
      var shardName = SHARD_MARK_NAMES[markIdx] + ' ' + shardTheme.name + ' Shard';
      // Shard drop rate scales UP with tier: T1≈10%, T12≈70%.
      // Early tiers are rare to keep crafting as the goal; high tiers reward persistence.
      var shardChance = Math.round(10 + 60 * (tier - 1) / 11);
      // Craft hint shown in UI: what this shard forges and where.
      var skCap = sk.charAt(0).toUpperCase() + sk.slice(1);
      var craftHint = skCap + ' tab \u2192 ' + gearName;

      // Gear drop — 30% chance, ~80% of crafted stats, rewarding rarities.
      var dropGearId = gearItemId + '_drop';
      var dropGearName = gearName + ' (Rough)';
      var dropGearRarities = ['rare','epic','legendary'];
      registerDropGearItem(dropGearId, dropGearName, gearBase.icon, slot, stats, markIdx);
      var dropStats = {};
      if (stats.atk) dropStats.atk = Math.max(1, Math.round(stats.atk * 0.8));
      if (stats.def) dropStats.def = Math.max(1, Math.round(stats.def * 0.8));
      if (stats.hp)  dropStats.hp  = Math.max(1, Math.round(stats.hp  * 0.8));
      if (stats.dodge) dropStats.dodge = Math.max(1, Math.round(stats.dodge * 0.8));

      out[id] = {
        id: id,
        skill: sk,
        tier: tier,
        name: theme.name + ' \u00b7 Tier ' + tier,
        shortName: theme.name,
        icon: theme.icon,
        desc: theme.desc,
        flavour: theme.flavour,
        discovery: theme.discovery,
        rooms: rooms,
        reward: {
          id: shardId,
          icon: shardTheme.icon,
          name: shardName,
          eff: craftHint,
          chance: shardChance,
          // Craft target — the gear piece unlocked by this tier's recipe
          craftItem: gearItemId,
          craftIcon: gearBase.icon,
          craftName: gearName,
          craftEff:  gearEffLabel(stats),
          // Lucky gear drop fields (weaker than crafted)
          dropId:     dropGearId,
          dropName:   dropGearName,
          dropIcon:   gearBase.icon,
          dropChance: 30,
          dropEff:    gearEffLabel(dropStats),
          dropRarity: dropGearRarities[markIdx] || 'uncommon'
        },
        loot: theme.loot
      };
      DUNGEON_UNLOCK_LEVELS[id] = unlockLvl;
    }
    return out;
  }

  function generateAllDungeons(){
    var out = {};
    Object.keys(SKILL_THEMES).forEach(function(sk){
      var skDungeons = generateSkillDungeons(sk, SKILL_THEMES[sk]);
      Object.keys(skDungeons).forEach(function(k){ out[k] = skDungeons[k]; });
    });
    return out;
  }

  // Tier stats no longer rely on scaleDungeonMonsters() since the generator scales them.
  function scaleDungeonMonsters(d){ return d; }

  // Generate 12 tier dungeons for each of the 8 skill themes (96 dungeons total).
  var DUNGEONS = generateAllDungeons();

  // Currently active dungeon definition (defaults to first woodcutting tier for legacy entry points)
  var activeDungeon = DUNGEONS.woodcutting_t1;

  var DG = {
    minFood: 3,
    levelPotionChance: 0.02,
    goldPerRoom: [3, 8]
  };

  function getFoodCount(){
    var c=0;
    if(typeof G==='undefined') return 0;
    var inv=G.inv||{};
    for(var k in inv){if(ITEMS[k]&&ITEMS[k].type==='food'&&inv[k]>0) c+=inv[k];}
    return c;
  }

  function getFoodList(){
    var f=[];
    if(typeof G==='undefined') return f;
    var inv=G.inv||{};
    for(var k in inv){if(ITEMS[k]&&ITEMS[k].type==='food'&&inv[k]>0) f.push({id:k,name:ITEMS[k].name,icon:ITEMS[k].icon,hp:ITEMS[k].hp,qty:inv[k]});}
    return f;
  }

  var ATK_SLOTS = ['weaponR','weaponL','jewelry'];
  var DEF_SLOTS = ['weaponR','weaponL','helmet','chest','boots','jewelry'];

  function getPlayerAtk(){
    // Combat skill is gone — attack comes purely from equipped gear.
    var b=1;
    if(typeof G==='undefined'||!G.equip) return b;
    for (var i=0;i<ATK_SLOTS.length;i++){
      var id=G.equip[ATK_SLOTS[i]];
      if(id&&ITEMS[id]) b+=ITEMS[id].atk||0;
    }
    // Legacy fallback for saves that still use the old single-weapon field
    if(G.equip.weapon&&ITEMS[G.equip.weapon]) b+=ITEMS[G.equip.weapon].atk||0;
    return b;
  }

  function getPlayerDef(){
    var b=0;
    if(typeof G==='undefined'||!G.equip) return b;
    for (var i=0;i<DEF_SLOTS.length;i++){
      var id=G.equip[DEF_SLOTS[i]];
      if(id&&ITEMS[id]) b+=ITEMS[id].def||0;
    }
    if(G.equip.armour&&ITEMS[G.equip.armour]) b+=ITEMS[G.equip.armour].def||0;
    return b;
  }

  // Detect what kind of physical attack the player is making, based on what they hold.
  // Bows count as ranged (can hit flying); everything else is melee. Magic mode is its
  // own thing handled in dungeonAttack.
  function getPlayerAttackType(){
    if (typeof G==='undefined'||!G.equip) return 'melee';
    var slots = ['weaponR','weaponL'];
    for (var i=0;i<slots.length;i++){
      var id = G.equip[slots[i]];
      if (!id || !ITEMS[id]) continue;
      // Bow IDs all contain "bow"
      if (/bow/i.test(id)) return 'ranged';
    }
    return 'melee';
  }

  // Player dodge chance (percent). Base 8% + sum of equipped gear dodge bonuses, capped.
  function getPlayerDodge(){
    var d=8;
    if(typeof G==='undefined'||!G.equip) return d;
    for (var i=0;i<DEF_SLOTS.length;i++){
      var id=G.equip[DEF_SLOTS[i]];
      if(id&&ITEMS[id]&&ITEMS[id].dodge) d+=ITEMS[id].dodge;
    }
    return Math.min(70,d);
  }

  function rollDmg(mn,mx){return Math.floor(Math.random()*(mx-mn+1))+mn;}

  function rollLoot(){
    var pool=activeDungeon.loot||[];
    var drops=[],tw=0;
    pool.forEach(function(l){tw+=l.weight;});
    var nd=Math.random()<0.4?2:1;
    for(var d=0;d<nd;d++){
      var r=Math.random()*tw,cu=0;
      for(var i=0;i<pool.length;i++){
        cu+=pool[i].weight;
        if(r<=cu){
          var l=pool[i];
          drops.push({id:l.id,name:l.name,icon:l.icon,qty:rollDmg(l.min,l.max)});
          break;
        }
      }
    }
    return drops;
  }

  function canEnterDungeon(){
    if(typeof G==='undefined') return {ok:false,reason:'Game not loaded'};
    // Weapon is no longer required — players can enter unarmed and fight with fists (very weak).
    var f=getFoodCount();
    if(f<DG.minFood) return {ok:false,reason:'Bring at least '+DG.minFood+' food (you have '+f+')'};
    return {ok:true};
  }

  function startDungeon(dungeonId){
    if(dungeonId&&DUNGEONS[dungeonId])activeDungeon=DUNGEONS[dungeonId];
    var check=canEnterDungeon();
    if(!check.ok){showDungeonMessage(check.reason,'#e03030');return;}
    if(typeof stopTask==='function') stopTask();
    var srcRooms=activeDungeon.rooms||[];
    dungeonState={
      dungeonId:activeDungeon.id,
      room:0,
      playerHp:G.hp,
      playerMaxHp:G.maxhp,
      monsters:srcRooms.map(function(r){
        // Copy every ability flag along with the base stats so combat can read them.
        return {
          name:r.name,icon:r.icon,
          hp:r.hp,maxhp:r.maxhp,
          dmg:r.dmg.slice(),xp:r.xp,
          weak:r.weak,resist:r.resist,
          immune:r.immune||null,
          flying:!!r.flying,
          poison:r.poison||0,poisonChance:r.poisonChance||0,
          heal:r.heal||0,healCD:r.healCD||0,healCounter:r.healCD||0,
          shield:!!r.shield,shieldCD:r.shieldCD||0,shieldTurns:r.shieldTurns||0,
          shieldCounter:0,shieldedTurns:0
        };
      }),
      combatLog:[],
      totalXp:0,
      totalGold:0,
      lootCollected:[],
      playerPoison:0,playerPoisonTurns:0,
      victory:false,
      fled:false,
      critStacks:0,
      bgTaskSkill:null,
      bgTaskAction:null,
      bgTaskProg:0,
      bgTaskDur:0
    };
    // Allow background skilling - remember what was running
    dungeonState.combatLog.push('You enter the <b>'+activeDungeon.name+'</b>...');
    dungeonState.combatLog.push(activeDungeon.flavour||'5 creatures await.');
    renderDungeon();
  }

  // Background skilling tick for during dungeon
  function dungeonBgTick(){
    if(!dungeonState||!dungeonState.bgTaskSkill) return;
    // Not implemented as real-time yet - skills continue ticking via main loop
  }


  // === DUNGEON DAMAGE FLOATER ===
  function showDungeonDmgFloat(amount, type, targetSide) {
    // type: 'hit' (player hits), 'crit' (crit hit), 'enemy-hit' (enemy hits player), 'heal', 'miss'
    // targetSide: 'left' (player) or 'right' (monster)
    var content = document.getElementById('dg-content');
    if (!content) return;
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;font-family:Cinzel,serif;font-weight:900;pointer-events:none;z-index:100;text-shadow:0 2px 6px rgba(0,0,0,0.9);';
    
    if (type === 'crit') {
      el.textContent = '⚡' + amount + '!';
      el.style.fontSize = '26px';
      el.style.color = '#ffd966';
      el.style.right = '15%';
    } else if (type === 'hit') {
      el.textContent = '-' + amount;
      el.style.fontSize = '22px';
      el.style.color = '#5ac85a';
      el.style.right = (10 + Math.random() * 15) + '%';
    } else if (type === 'enemy-hit') {
      el.textContent = '-' + amount;
      el.style.fontSize = '18px';
      el.style.color = '#e03030';
      el.style.left = (10 + Math.random() * 15) + '%';
    } else if (type === 'heal') {
      el.textContent = '+' + amount;
      el.style.fontSize = '18px';
      el.style.color = '#5ac85a';
      el.style.left = '20%';
    } else if (type === 'miss') {
      el.textContent = 'BLOCK';
      el.style.fontSize = '14px';
      el.style.color = '#9a7e50';
      el.style.left = '25%';
    }
    el.style.top = '60px';
    
    // Animate
    var start = Date.now();
    content.style.position = 'relative';
    content.appendChild(el);
    
    var anim = function() {
      var elapsed = Date.now() - start;
      var pct = elapsed / (type === 'crit' ? 1300 : 1100);
      if (pct >= 1) { el.remove(); return; }
      var y = 60 - (pct * 45);
      var scale = type === 'crit' ? (pct < 0.15 ? 0.5 + pct * 10 : (pct < 0.3 ? 2 - pct * 3 : 1.1 - pct * 0.4)) : (pct < 0.15 ? 0.5 + pct * 5 : 1.2 - pct * 0.5);
      var opacity = pct < 0.1 ? pct * 10 : (pct > 0.6 ? 1 - (pct - 0.6) / 0.4 : 1);
      el.style.top = y + 'px';
      el.style.transform = 'scale(' + Math.max(0.5, scale) + ')';
      el.style.opacity = Math.max(0, opacity);
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
    
    // Shake the overlay content slightly
    if (type === 'hit' || type === 'crit') {
      content.style.animation = 'none';
      void content.offsetWidth;
      content.style.animation = 'dgShake 0.3s ease';
      setTimeout(function() { content.style.animation = ''; }, 300);
    }
  }

  // === DUNGEON HIT VFX (sprites overlaid on combatants) ===
  function showDungeonHitFX(targetSide, type) {
    var content = document.getElementById('dg-content');
    if (!content) return;
    content.style.position = 'relative';

    // Anchor over the character icon (player on left, monster on right of the VS row)
    var fx = document.createElement('div');
    var sideStyle = targetSide === 'left' ? 'left:18%;' : 'right:18%;';
    fx.style.cssText = 'position:absolute;top:78px;width:0;height:0;pointer-events:none;z-index:99;' + sideStyle;

    var i, ang, dist, sp;

    if (type === 'crit') {
      // Dramatic gold starburst
      var center = document.createElement('div');
      center.textContent = '✦';
      center.style.cssText = 'position:absolute;left:-22px;top:-26px;font-size:44px;color:#ffd966;text-shadow:0 0 14px #ffaa00,0 0 24px #ff8800,0 0 4px #fff;animation:dgCritZoom 0.75s ease-out forwards;font-weight:900;';
      fx.appendChild(center);

      var ring = document.createElement('div');
      ring.style.cssText = 'position:absolute;left:-30px;top:-30px;width:60px;height:60px;border:3px solid #ffd966;border-radius:50%;box-shadow:0 0 16px #ffaa00 inset,0 0 16px #ffaa00;animation:dgRing 0.75s ease-out forwards;';
      fx.appendChild(ring);

      var ring2 = document.createElement('div');
      ring2.style.cssText = 'position:absolute;left:-22px;top:-22px;width:44px;height:44px;border:2px solid #fff8cc;border-radius:50%;animation:dgRing 0.6s ease-out 0.1s forwards;opacity:0;';
      fx.appendChild(ring2);

      // 14 sparks
      for (i = 0; i < 14; i++) {
        ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.2;
        dist = 50 + Math.random() * 25;
        sp = document.createElement('div');
        sp.style.cssText = 'position:absolute;left:-4px;top:-4px;width:8px;height:8px;background:#ffd966;border-radius:50%;box-shadow:0 0 8px #ffaa00,0 0 14px #ff8800;animation:dgSpark 0.75s ease-out forwards;--dx:' + (Math.cos(ang) * dist).toFixed(1) + 'px;--dy:' + (Math.sin(ang) * dist).toFixed(1) + 'px;';
        fx.appendChild(sp);
      }

      // Brief screen flash overlay across whole dialog
      var flash = document.createElement('div');
      flash.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(circle,#ffd96666,transparent 65%);pointer-events:none;animation:dgFlash 0.55s ease-out forwards;z-index:1;border-radius:6px;';
      content.appendChild(flash);
      setTimeout(function(){ if(flash.parentNode) flash.remove(); }, 600);

    } else if (type === 'block') {
      // Silver/blue shield clang
      var shield = document.createElement('div');
      shield.textContent = '🛡';
      shield.style.cssText = 'position:absolute;left:-16px;top:-18px;font-size:32px;text-shadow:0 0 10px #88ddff,0 0 18px #4488dd;animation:dgWobble 0.5s ease-out forwards;';
      fx.appendChild(shield);

      var bring = document.createElement('div');
      bring.style.cssText = 'position:absolute;left:-22px;top:-22px;width:44px;height:44px;border:2px solid #88ddff;border-radius:50%;box-shadow:0 0 10px #88ddff;animation:dgRing 0.55s ease-out forwards;';
      fx.appendChild(bring);

      // 8 silver sparks
      for (i = 0; i < 8; i++) {
        ang = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
        dist = 28 + Math.random() * 14;
        sp = document.createElement('div');
        sp.style.cssText = 'position:absolute;left:-3px;top:-3px;width:6px;height:6px;background:#cce7ff;border-radius:50%;box-shadow:0 0 6px #88ddff;animation:dgSpark 0.55s ease-out forwards;--dx:' + (Math.cos(ang) * dist).toFixed(1) + 'px;--dy:' + (Math.sin(ang) * dist).toFixed(1) + 'px;';
        fx.appendChild(sp);
      }

    } else {
      // Normal hit: red splat + sparks
      var color = targetSide === 'left' ? '#e03030' : '#ff5533';
      var splat = document.createElement('div');
      splat.style.cssText = 'position:absolute;left:-16px;top:-16px;width:32px;height:32px;background:radial-gradient(circle,' + color + ' 0%,' + color + 'cc 35%,transparent 70%);border-radius:50%;animation:dgFxFade 0.5s ease-out forwards;';
      fx.appendChild(splat);

      // 9 sparks
      for (i = 0; i < 9; i++) {
        ang = (Math.PI * 2 * i) / 9 + Math.random() * 0.4;
        dist = 28 + Math.random() * 18;
        sp = document.createElement('div');
        sp.style.cssText = 'position:absolute;left:-3px;top:-3px;width:6px;height:6px;background:' + color + ';border-radius:50%;box-shadow:0 0 6px ' + color + ';animation:dgSpark 0.55s ease-out forwards;--dx:' + (Math.cos(ang) * dist).toFixed(1) + 'px;--dy:' + (Math.sin(ang) * dist).toFixed(1) + 'px;';
        fx.appendChild(sp);
      }
    }

    content.appendChild(fx);
    setTimeout(function(){ if(fx.parentNode) fx.remove(); }, type === 'crit' ? 850 : 650);
  }

  // === SPELL SCROLL CAST VFX ===
  // Each scroll type gets a distinct visual so the player can see what they cast.
  var SPELL_FX = {
    scroll_wind:    {color:'#88ddff', glow:'#cceeff', kind:'swirl',     shake:false, rings:1, particles:'💨', pCount:10},
    scroll_water:   {color:'#4488dd', glow:'#99c2ff', kind:'rain',      shake:false, rings:1, particles:'💧', pCount:14},
    scroll_fire:    {color:'#ff6622', glow:'#ffaa44', kind:'projectile', shake:true,  rings:1, particles:'🔥', pCount:12},
    scroll_earth:   {color:'#8B5A2B', glow:'#c08850', kind:'projectile', shake:true,  rings:2, particles:'🪨', pCount:8},
    scroll_shock:   {color:'#ffee44', glow:'#ffffaa', kind:'bolt',      shake:true,  rings:1, particles:'⚡', pCount:8},
    scroll_inferno: {color:'#ff3322', glow:'#ffaa00', kind:'projectile', shake:true,  rings:3, particles:'🔥', pCount:18},
    scroll_tempest: {color:'#bb77ee', glow:'#ddaaff', kind:'swirl',     shake:true,  rings:2, particles:'🌪️', pCount:14},
    scroll_meteor:  {color:'#ff8800', glow:'#ffdd99', kind:'meteor',    shake:true,  rings:3, particles:'☄️', pCount:20}
  };
  function showDungeonSpellFX(scrollId){
    var content = document.getElementById('dg-content');
    if(!content) return;
    content.style.position = 'relative';
    var fx = SPELL_FX[scrollId] || {color:'#bb77ee', glow:'#ddaaff', kind:'projectile', shake:false, rings:1, particles:'✨', pCount:10};
    var icon = (typeof ITEMS !== 'undefined' && ITEMS[scrollId]) ? ITEMS[scrollId].icon : '✨';

    // Full-dialog overlay layer so effects can move across the combat area.
    var layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:98;overflow:hidden;border-radius:6px;';
    content.appendChild(layer);

    // Background radial wash tinted to the spell's element.
    var wash = document.createElement('div');
    wash.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(circle at 82% 50%,'+fx.glow+'55,transparent 55%);animation:dgFlash 0.85s ease-out forwards;';
    layer.appendChild(wash);

    // Player-side "cast" flourish: tiny burst near the caster with the scroll icon.
    var caster = document.createElement('div');
    caster.textContent = icon;
    caster.style.cssText = 'position:absolute;left:12%;top:64px;font-size:24px;filter:drop-shadow(0 0 10px '+fx.glow+') drop-shadow(0 0 18px '+fx.color+');animation:dgSpellCast 0.45s ease-out forwards;';
    layer.appendChild(caster);
    setTimeout(function(){ if(caster.parentNode) caster.remove(); }, 500);

    // Primary delivery — projectile / meteor / bolt / swirl / rain
    var deliveryMs = 450;
    if (fx.kind === 'projectile'){
      var proj = document.createElement('div');
      proj.textContent = icon;
      proj.style.cssText = 'position:absolute;top:62px;left:-40px;font-size:38px;filter:drop-shadow(0 0 16px '+fx.glow+') drop-shadow(0 0 30px '+fx.color+');animation:dgSpellProjectile 0.5s cubic-bezier(0.2,0.6,0.4,1) forwards;';
      layer.appendChild(proj);
      deliveryMs = 420;
    } else if (fx.kind === 'meteor'){
      var meteor = document.createElement('div');
      meteor.textContent = icon;
      meteor.style.cssText = 'position:absolute;font-size:46px;filter:drop-shadow(0 0 20px '+fx.glow+') drop-shadow(0 0 40px '+fx.color+');animation:dgSpellMeteor 0.65s cubic-bezier(0.3,0.2,0.5,1) forwards;';
      layer.appendChild(meteor);
      deliveryMs = 580;
    } else if (fx.kind === 'bolt'){
      // A jagged lightning bar slamming down onto the enemy.
      var bolt = document.createElement('div');
      bolt.textContent = '⚡';
      bolt.style.cssText = 'position:absolute;right:12%;top:0;font-size:72px;filter:drop-shadow(0 0 16px '+fx.glow+') drop-shadow(0 0 28px '+fx.color+');animation:dgSpellBolt 0.4s ease-out forwards;transform-origin:top center;';
      layer.appendChild(bolt);
      deliveryMs = 320;
    } else if (fx.kind === 'swirl'){
      // Wind / tempest: rotating halo around the enemy.
      var swirl = document.createElement('div');
      swirl.style.cssText = 'position:absolute;right:14%;top:82px;width:70px;height:70px;margin:-35px -35px 0 0;border:3px dashed '+fx.glow+';border-radius:50%;box-shadow:0 0 18px '+fx.color+';animation:dgSpellSwirl 0.6s ease-out forwards;';
      layer.appendChild(swirl);
      var swirl2 = document.createElement('div');
      swirl2.textContent = icon;
      swirl2.style.cssText = 'position:absolute;right:14%;top:82px;font-size:30px;margin:-16px -16px 0 0;filter:drop-shadow(0 0 12px '+fx.glow+') drop-shadow(0 0 22px '+fx.color+');animation:dgSpellSwirl 0.6s ease-out forwards;';
      layer.appendChild(swirl2);
      deliveryMs = 450;
    } else if (fx.kind === 'rain'){
      // Water droplet shower above the enemy.
      for (var r = 0; r < 12; r++){
        (function(idx){
          var drop = document.createElement('div');
          drop.textContent = fx.particles;
          var offX = (Math.random()*60 - 30);
          drop.style.cssText = 'position:absolute;right:'+(12 + Math.random()*8)+'%;top:'+(30 + Math.random()*30)+'px;font-size:'+(14+Math.random()*10)+'px;filter:drop-shadow(0 0 6px '+fx.glow+');animation:dgSpellRaindrop 0.6s ease-out '+(idx*0.03)+'s forwards;--dx:'+offX.toFixed(1)+'px;';
          layer.appendChild(drop);
        })(r);
      }
      deliveryMs = 420;
    }

    // Impact burst at the enemy — rings + particle shower — fires after delivery.
    setTimeout(function(){
      var r;
      for (r = 0; r < (fx.rings||1); r++){
        (function(idx){
          var ring = document.createElement('div');
          var size = 54 + idx*22;
          ring.style.cssText = 'position:absolute;right:14%;top:82px;width:'+size+'px;height:'+size+'px;margin:'+(-size/2)+'px '+(-size/2)+'px 0 0;border:3px solid '+fx.glow+';border-radius:50%;box-shadow:0 0 22px '+fx.color+',0 0 14px '+fx.glow+' inset;animation:dgRing 0.75s ease-out '+(idx*0.1)+'s forwards;opacity:0;';
          layer.appendChild(ring);
        })(r);
      }
      // Particle shower radiating outward from the enemy.
      var n = fx.pCount || 12;
      for (var i = 0; i < n; i++){
        var ang = (Math.PI * 2 * i) / n + Math.random()*0.3;
        var dist = 50 + Math.random()*40;
        var p = document.createElement('div');
        p.textContent = fx.particles || '✨';
        p.style.cssText = 'position:absolute;right:14%;top:82px;font-size:'+(14+Math.random()*10)+'px;filter:drop-shadow(0 0 6px '+fx.glow+') drop-shadow(0 0 10px '+fx.color+');animation:dgSpellParticle 0.95s ease-out forwards;--dx:'+(Math.cos(ang)*dist).toFixed(1)+'px;--dy:'+(Math.sin(ang)*dist).toFixed(1)+'px;';
        layer.appendChild(p);
      }
      // Impact shake for heavy-hitting spells.
      if (fx.shake) {
        content.style.animation = 'dgShake 0.35s ease-out';
        setTimeout(function(){ content.style.animation = ''; }, 360);
      }
    }, deliveryMs);

    setTimeout(function(){ if(layer.parentNode) layer.remove(); }, 1500);
  }
  // Expose so the physical-hit code path can trigger spell visuals instead.
  window._dgSpellFX = showDungeonSpellFX;

  // === DUNGEON ENEMY DEATH / SPAWN VFX ===
  function showDungeonEnemyFX(type, icon) {
    var content = document.getElementById('dg-content');
    if (!content) return;
    content.style.position = 'relative';

    var fx = document.createElement('div');
    fx.style.cssText = 'position:absolute;top:78px;right:18%;width:0;height:0;pointer-events:none;z-index:100;';

    var i, ang, dist, sp;

    if (type === 'death') {
      // Big shattering monster icon
      var bigIcon = document.createElement('div');
      bigIcon.textContent = icon;
      bigIcon.style.cssText = 'position:absolute;left:-26px;top:-30px;font-size:52px;animation:dgDeath 0.85s ease-out forwards;filter:drop-shadow(0 0 12px #ff3333) drop-shadow(0 0 6px #aa0000);';
      fx.appendChild(bigIcon);

      // Red expanding ring
      var ring = document.createElement('div');
      ring.style.cssText = 'position:absolute;left:-32px;top:-32px;width:64px;height:64px;border:3px solid #ff3333;border-radius:50%;box-shadow:0 0 22px #aa0000 inset,0 0 22px #aa0000;animation:dgRing 0.85s ease-out forwards;';
      fx.appendChild(ring);

      // Skull pop
      var skull = document.createElement('div');
      skull.textContent = '💀';
      skull.style.cssText = 'position:absolute;left:-16px;top:-18px;font-size:32px;animation:dgFxFade 0.85s ease-out 0.1s forwards;opacity:0;';
      fx.appendChild(skull);

      // 16 dark red shards flying outward
      for (i = 0; i < 16; i++) {
        ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
        dist = 55 + Math.random() * 25;
        sp = document.createElement('div');
        sp.style.cssText = 'position:absolute;left:-4px;top:-4px;width:8px;height:8px;background:#cc2222;border-radius:50%;box-shadow:0 0 8px #ff0000,0 0 14px #aa0000;animation:dgSpark 0.85s ease-out forwards;--dx:' + (Math.cos(ang) * dist).toFixed(1) + 'px;--dy:' + (Math.sin(ang) * dist).toFixed(1) + 'px;';
        fx.appendChild(sp);
      }

      // Red flash across the dialog
      var flash = document.createElement('div');
      flash.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(circle,#ff222255,transparent 65%);pointer-events:none;animation:dgFlash 0.6s ease-out forwards;z-index:1;border-radius:6px;';
      content.appendChild(flash);
      setTimeout(function(){ if(flash.parentNode) flash.remove(); }, 650);

      // Screen shake
      content.style.animation = 'none';
      void content.offsetWidth;
      content.style.animation = 'dgShake 0.45s ease';
      setTimeout(function() { content.style.animation = ''; }, 450);

    } else if (type === 'spawn') {
      // New monster icon zoom-in with portal
      var bigIcon2 = document.createElement('div');
      bigIcon2.textContent = icon;
      bigIcon2.style.cssText = 'position:absolute;left:-26px;top:-30px;font-size:52px;animation:dgSpawn 0.85s ease-out forwards;filter:drop-shadow(0 0 12px #aa44ff) drop-shadow(0 0 6px #6622aa);';
      fx.appendChild(bigIcon2);

      // Purple expanding rings
      var sring = document.createElement('div');
      sring.style.cssText = 'position:absolute;left:-32px;top:-32px;width:64px;height:64px;border:3px solid #aa44ff;border-radius:50%;box-shadow:0 0 22px #aa44ff inset,0 0 22px #aa44ff;animation:dgRing 0.7s ease-out forwards;';
      fx.appendChild(sring);

      var sring2 = document.createElement('div');
      sring2.style.cssText = 'position:absolute;left:-22px;top:-22px;width:44px;height:44px;border:2px solid #ddaaff;border-radius:50%;animation:dgRing 0.55s ease-out 0.2s forwards;opacity:0;';
      fx.appendChild(sring2);

      // 14 purple sparks exploding outward
      for (i = 0; i < 14; i++) {
        ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.2;
        dist = 45 + Math.random() * 18;
        sp = document.createElement('div');
        sp.style.cssText = 'position:absolute;left:-3px;top:-3px;width:7px;height:7px;background:#cc88ff;border-radius:50%;box-shadow:0 0 8px #aa44ff,0 0 14px #6622aa;animation:dgSpark 0.7s ease-out forwards;--dx:' + (Math.cos(ang) * dist).toFixed(1) + 'px;--dy:' + (Math.sin(ang) * dist).toFixed(1) + 'px;';
        fx.appendChild(sp);
      }

      // Purple flash
      var flash2 = document.createElement('div');
      flash2.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(circle,#aa44ff44,transparent 65%);pointer-events:none;animation:dgFlash 0.5s ease-out forwards;z-index:1;border-radius:6px;';
      content.appendChild(flash2);
      setTimeout(function(){ if(flash2.parentNode) flash2.remove(); }, 550);
    }

    content.appendChild(fx);
    setTimeout(function(){ if(fx.parentNode) fx.remove(); }, 900);
  }

  // === FIRST-VICTORY REWARD POPUP ===
  function showFirstVictoryPopup(dungeon, reward){
    // Don't double-show
    if(document.getElementById('dg-victory-popup'))return;
    var ov=document.createElement('div');
    ov.id='dg-victory-popup';
    ov.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle,rgba(20,12,4,0.85) 0%,rgba(0,0,0,0.95) 100%);z-index:10000;display:flex;align-items:center;justify-content:center;animation:dgFadeIn 0.35s ease-out;overflow:hidden;padding:20px;box-sizing:border-box;';

    var modal=document.createElement('div');
    modal.style.cssText='position:relative;background:linear-gradient(135deg,#1a1308 0%,#2a1f0c 100%);border:3px solid #f0c040;border-radius:14px;padding:28px 30px 22px;max-width:340px;width:100%;text-align:center;box-shadow:0 0 50px rgba(240,192,64,0.55),0 0 100px rgba(240,192,64,0.25);animation:dgVictoryPop 0.7s cubic-bezier(0.2,1.3,0.6,1) forwards;font-family:Cinzel,serif;z-index:2;';
    var craftLinePopup = reward.craftName
      ? '<div style="margin-top:6px;font-size:12px;color:#9a7e50;font-family:Arial,sans-serif;">\u2192 forge <span style="color:#f0c040;">'+reward.craftIcon+' '+reward.craftName+'</span><br><span style="color:#5a4830;font-size:11px;">'+(reward.craftEff||'')+'</span></div>'
      : '';
    modal.innerHTML=
      '<div style="color:#f0c040;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;font-weight:700;">⚔ First Victory ⚔</div>'+
      '<div style="color:#e8d898;font-size:18px;margin-bottom:14px;">'+dungeon.name+'</div>'+
      '<div style="font-size:72px;line-height:1;margin-bottom:8px;display:inline-block;animation:dgRewardSpin 0.9s ease-out forwards,dgRewardGlow 2.2s ease-in-out 0.9s infinite;">'+reward.icon+'</div>'+
      '<div style="color:#0070dd;font-size:20px;font-weight:700;margin-bottom:2px;text-shadow:0 0 12px rgba(0,112,221,0.5);">'+reward.name+'</div>'+
      '<div style="color:#9a7e50;font-size:11px;margin-bottom:4px;font-family:Arial,sans-serif;">Crafting component obtained</div>'+
      craftLinePopup+
      '<div style="margin-top:18px;"></div>'+
      '<button id="dg-victory-claim" style="background:linear-gradient(180deg,#f0c040,#c08020);border:2px solid #f0c040;color:#0b0905;padding:11px 28px;font-family:Cinzel,serif;font-size:14px;font-weight:700;border-radius:6px;cursor:pointer;letter-spacing:1px;text-transform:uppercase;box-shadow:0 0 18px rgba(240,192,64,0.55);">Craft It!</button>';

    ov.appendChild(modal);
    document.body.appendChild(ov);

    // Spawn fireworks across the screen
    var fwColors=['#f0c040','#ffd966','#ff6644','#5ac85a','#88ddff','#cc88ff','#ff88cc','#ffaa00'];
    function fwRandom(){return fwColors[Math.floor(Math.random()*fwColors.length)];}
    // Initial burst wave
    for(var i=0;i<10;i++){
      (function(idx){
        setTimeout(function(){if(ov.parentNode)spawnFireworkBurst(ov,fwRandom());},idx*180);
      })(i);
    }
    // Continuous fireworks for ~4s
    var interval=setInterval(function(){
      if(!ov.parentNode){clearInterval(interval);return;}
      spawnFireworkBurst(ov,fwRandom());
    },380);
    setTimeout(function(){clearInterval(interval);},4200);

    function dismiss(){
      clearInterval(interval);
      if(ov.parentNode){
        ov.style.animation='dgFadeIn 0.25s ease-out reverse';
        setTimeout(function(){if(ov.parentNode)ov.remove();},250);
      }
    }
    document.getElementById('dg-victory-claim').onclick=dismiss;
    ov.addEventListener('click',function(e){if(e.target===ov)dismiss();});
  }

  function spawnFireworkBurst(parent,color){
    // Random position avoiding the dead-center where the modal sits
    var x=8+Math.random()*84;
    var y=8+Math.random()*72;
    // If too close to center (modal area), nudge to the edges
    if(Math.abs(x-50)<22&&Math.abs(y-45)<22){
      x=x<50?(x-15):(x+15);
    }
    var burst=document.createElement('div');
    burst.style.cssText='position:absolute;left:'+x+'%;top:'+y+'%;width:0;height:0;pointer-events:none;z-index:1;';

    // Center flash
    var flash=document.createElement('div');
    flash.style.cssText='position:absolute;left:-9px;top:-9px;width:18px;height:18px;background:'+color+';border-radius:50%;box-shadow:0 0 22px '+color+',0 0 44px '+color+';animation:dgFwFlash 0.6s ease-out forwards;';
    burst.appendChild(flash);

    // Sparks flying outward (with gravity-ish curve via dgFwSpark keyframes)
    var n=14;
    for(var j=0;j<n;j++){
      var ang=(Math.PI*2*j)/n+Math.random()*0.25;
      var dist=70+Math.random()*55;
      var sp=document.createElement('div');
      sp.style.cssText='position:absolute;left:-3px;top:-3px;width:6px;height:6px;background:'+color+';border-radius:50%;box-shadow:0 0 8px '+color+',0 0 14px '+color+';animation:dgFwSpark 1.25s ease-out forwards;--dx:'+(Math.cos(ang)*dist).toFixed(1)+'px;--dy:'+(Math.sin(ang)*dist).toFixed(1)+'px;';
      burst.appendChild(sp);
    }

    parent.appendChild(burst);
    setTimeout(function(){if(burst.parentNode)burst.remove();},1400);
  }

  // === DUNGEON DISCOVERY POPUP (fires once when a skill hits unlock level) ===
  function showDungeonDiscoveryPopup(sk){
    // Discovery fires for the first tier of a skill's dungeon line.
    var dungeon=DUNGEONS[sk+'_t1']||DUNGEONS[sk];
    if(!dungeon)return;
    if(document.getElementById('dg-discovery-popup'))return;
    var ov=document.createElement('div');
    ov.id='dg-discovery-popup';
    ov.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle,rgba(20,12,4,0.88) 0%,rgba(0,0,0,0.96) 100%);z-index:10000;display:flex;align-items:center;justify-content:center;animation:dgFadeIn 0.4s ease-out;overflow:hidden;padding:20px;box-sizing:border-box;';

    var modal=document.createElement('div');
    modal.style.cssText='position:relative;background:linear-gradient(135deg,#0f0a04 0%,#1a1308 60%,#2a1f0c 100%);border:3px solid #f0c040;border-radius:14px;padding:26px 30px 20px;max-width:380px;width:100%;text-align:center;box-shadow:0 0 60px rgba(240,192,64,0.55),0 0 120px rgba(240,192,64,0.25);animation:dgVictoryPop 0.7s cubic-bezier(0.2,1.3,0.6,1) forwards;font-family:Cinzel,serif;z-index:2;';
    var skName=(typeof SKILLS!=='undefined'&&SKILLS[sk])?SKILLS[sk].name:sk;
    modal.innerHTML=
      '<div style="color:#f0c040;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;font-weight:700;">🗝️ Dungeon Discovered 🗝️</div>'+
      '<div style="color:#9a7e50;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px;">Through your '+skName+' mastery</div>'+
      '<div style="font-size:64px;line-height:1;margin:6px 0 12px;display:inline-block;animation:dgRewardSpin 0.9s ease-out forwards,dgRewardGlow 2.4s ease-in-out 0.9s infinite;">'+dungeon.icon+'</div>'+
      '<div style="color:#f0c040;font-size:22px;font-weight:700;margin-bottom:16px;text-shadow:0 0 14px rgba(240,192,64,0.6);">'+dungeon.name+'</div>'+
      '<div style="color:#e8d898;font-size:13px;line-height:1.55;font-style:italic;font-family:Georgia,serif;margin-bottom:22px;padding:0 4px;">'+(dungeon.discovery||dungeon.desc||'')+'</div>'+
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">'+
      '<button id="dg-discovery-enter" style="background:linear-gradient(180deg,#f0c040,#c08020);border:2px solid #f0c040;color:#0b0905;padding:11px 22px;font-family:Cinzel,serif;font-size:13px;font-weight:700;border-radius:6px;cursor:pointer;letter-spacing:1px;text-transform:uppercase;box-shadow:0 0 18px rgba(240,192,64,0.55);">⚔ Enter Now</button>'+
      '<button id="dg-discovery-later" style="background:#1c1710;border:2px solid #3a2c18;color:#9a7e50;padding:11px 22px;font-family:Cinzel,serif;font-size:13px;font-weight:700;border-radius:6px;cursor:pointer;letter-spacing:1px;text-transform:uppercase;">Later</button>'+
      '</div>';

    ov.appendChild(modal);
    document.body.appendChild(ov);

    // Light fireworks (less than first-victory)
    var fwColors=['#f0c040','#ffd966','#ff8866','#88ddff','#cc88ff','#ffaa00'];
    function fwRandom(){return fwColors[Math.floor(Math.random()*fwColors.length)];}
    for(var i=0;i<6;i++){
      (function(idx){setTimeout(function(){if(ov.parentNode)spawnFireworkBurst(ov,fwRandom());},idx*250);})(i);
    }
    var interval=setInterval(function(){
      if(!ov.parentNode){clearInterval(interval);return;}
      spawnFireworkBurst(ov,fwRandom());
    },500);
    setTimeout(function(){clearInterval(interval);},3500);

    function dismiss(){
      clearInterval(interval);
      if(ov.parentNode){
        ov.style.animation='dgFadeIn 0.25s ease-out reverse';
        setTimeout(function(){if(ov.parentNode)ov.remove();},250);
      }
    }
    document.getElementById('dg-discovery-enter').onclick=function(){dismiss();setTimeout(function(){showDungeonEntry(sk);},260);};
    document.getElementById('dg-discovery-later').onclick=dismiss;
    ov.addEventListener('click',function(e){if(e.target===ov)dismiss();});
  }

  // Apply end-of-turn effects: tick poison, cool down monster shields, refresh heals.
  function tickStatusEffects(mon){
    // Player poison DoT
    if (dungeonState.playerPoison > 0 && dungeonState.playerPoisonTurns > 0){
      var pp = dungeonState.playerPoison;
      dungeonState.playerHp = Math.max(0, dungeonState.playerHp - pp);
      dungeonState.playerPoisonTurns--;
      showDungeonDmgFloat(pp,'enemy-hit','left');
      dungeonState.combatLog.push('<span style="color:#9b59b6;">🧪 Poison ticks for <b>'+pp+'</b> ('+dungeonState.playerPoisonTurns+' turns left)</span>');
      if(dungeonState.playerPoisonTurns<=0) dungeonState.playerPoison = 0;
    }
    if (!mon || mon.hp <= 0) return;
    // Monster shield expiry
    if (mon.shieldedTurns > 0){
      mon.shieldedTurns--;
      if (mon.shieldedTurns === 0){
        dungeonState.combatLog.push('<span style="color:#88ddff;">🛡 '+mon.icon+' '+mon.name+'\'s shield fades.</span>');
      }
    }
    // Monster heal cooldown
    if (mon.heal && mon.healCD){
      mon.healCounter = (mon.healCounter || 0) - 1;
      if (mon.healCounter <= 0 && mon.hp < mon.maxhp){
        var healAmt = Math.min(mon.heal, mon.maxhp - mon.hp);
        mon.hp += healAmt;
        mon.healCounter = mon.healCD;
        dungeonState.combatLog.push('<span style="color:#5ac85a;">💚 '+mon.icon+' '+mon.name+' heals <b>'+healAmt+'</b> HP!</span>');
      }
    }
    // Monster shield activation
    if (mon.shield && mon.shieldCD){
      mon.shieldCounter = (mon.shieldCounter || 0) - 1;
      if (mon.shieldCounter <= 0 && mon.shieldedTurns <= 0){
        mon.shieldedTurns = mon.shieldTurns || 2;
        mon.shieldCounter = mon.shieldCD;
        dungeonState.combatLog.push('<span style="color:#88ddff;">🛡 '+mon.icon+' '+mon.name+' raises a shield! ('+mon.shieldedTurns+' turns invulnerable)</span>');
      }
    }
  }

  // Common monster retaliation step. Returns true if it killed the player.
  function monsterRetaliate(mon){
    if (!mon || mon.hp <= 0) return false;
    var dodgeChance = getPlayerDodge();
    var dodged = (Math.random() * 100) < dodgeChance;
    if (dodged){
      showDungeonHitFX('left','block');
      showDungeonDmgFloat(0,'miss','left');
      dungeonState.combatLog.push('<span style="color:#ffd966;">💨 You dodge '+mon.icon+' '+mon.name+'\'s attack! ('+dodgeChance+'% dodge)</span>');
      return false;
    }
    var mDmg = rollDmg(mon.dmg[0], mon.dmg[1]);
    var def = getPlayerDef();
    var ad = Math.max(1, mDmg - Math.floor(def * 0.5));
    dungeonState.playerHp = Math.max(0, dungeonState.playerHp - ad);
    showDungeonDmgFloat(ad,'enemy-hit','left');
    showDungeonHitFX('left','hit');
    dungeonState.combatLog.push(mon.icon+' '+mon.name+' hits you for <span style="color:#e03030">'+ad+'</span> damage.');
    // Poison-on-hit chance
    if (mon.poison && mon.poisonChance && Math.random() < mon.poisonChance){
      dungeonState.playerPoison = Math.max(dungeonState.playerPoison, mon.poison);
      dungeonState.playerPoisonTurns = Math.max(dungeonState.playerPoisonTurns, 4);
      dungeonState.combatLog.push('<span style="color:#9b59b6;">🧪 Poisoned! '+mon.poison+' damage / turn for 4 turns.</span>');
    }
    if (dungeonState.playerHp <= 0){
      dungeonState.combatLog.push('<span style="color:#e03030;font-weight:bold">You have been defeated! All dungeon loot is lost.</span>');
      dungeonState.lootCollected = [];
      dungeonState.totalGold = 0;
      dungeonState.totalXp = 0;
      G.hp = Math.max(1, Math.floor(G.maxhp * 0.25));
      if(typeof save === 'function') save();
      if(typeof updateUI === 'function') updateUI();
      return true;
    }
    return false;
  }

  // Power-stack rewards scale dramatically so investing multiple turns actually
  // pays off. Each stack increases crit chance, crit multiplier, and grants a
  // flat "focused strike" bonus that lands even if the crit roll whiffs.
  //   1 stack → 40% crit, ×2.5 damage, +20% power bonus
  //   2 stacks → 75% crit, ×3.5 damage, +40% power bonus
  //   3 stacks → GUARANTEED crit, ×5.0 damage, +60% power bonus
  var MAX_POWER_STACKS = 3;
  function getPowerStackProfile(stacks){
    if (stacks >= 3) return {critChance:1.00, critMult:5.0, bonusFrac:0.60};
    if (stacks === 2) return {critChance:0.75, critMult:3.5, bonusFrac:0.40};
    if (stacks === 1) return {critChance:0.40, critMult:2.5, bonusFrac:0.20};
    return {critChance:0, critMult:1, bonusFrac:0};
  }

  function dungeonAttack(mode, explicitScrollId){
    if(!dungeonState||dungeonState.victory||dungeonState.fled) return;
    if(dungeonState.dying) return;
    var mon=dungeonState.monsters[dungeonState.room];
    if(!mon||mon.hp<=0) return;

    if(mode==='power'){
      var curStacks = dungeonState.critStacks||0;
      if (curStacks >= MAX_POWER_STACKS){
        dungeonState.combatLog.push('<span style="color:#ffd966;">⚡ Already at max focus (×'+MAX_POWER_STACKS+'). Unleash it!</span>');
      } else {
        dungeonState.critStacks = curStacks + 1;
        var _prof = getPowerStackProfile(dungeonState.critStacks);
        var guaranteedTxt = _prof.critChance >= 1 ? ' <b>GUARANTEED CRIT!</b>' : ' ('+Math.round(_prof.critChance*100)+'% crit)';
        dungeonState.combatLog.push('<span style="color:#ffd966;">⚡ Focus Power ×'+dungeonState.critStacks+' — next hit: ×'+_prof.critMult.toFixed(1)+' dmg, +'+Math.round(_prof.bonusFrac*100)+'% power bonus'+guaranteedTxt+'.</span>');
      }
      monsterRetaliate(mon);
      tickStatusEffects(mon);
      if(dungeonState&&dungeonState.playerHp>0) G.hp=dungeonState.playerHp;
      renderDungeon();
      return;
    }

    // Handle magic attack — use explicitly chosen scroll, or pick highest-damage.
    // Scroll is SELECTed up front but only CONSUMEd after the blocked-check so
    // a misclick on a shielded / magic-immune monster doesn't waste it.
    var castScrollId = null, castScrollDmg = 0;
    if(mode==='magic'){
      var bestId = null, bestDmg = 0;
      // If the player clicked a specific scroll, verify they still own one.
      if (explicitScrollId && G.inv && (G.inv[explicitScrollId]||0) > 0 && typeof ITEMS !== 'undefined' && ITEMS[explicitScrollId]){
        bestId = explicitScrollId;
        bestDmg = ITEMS[explicitScrollId].spellDmg || 0;
      } else {
        // Fall back to auto-picking the highest-damage scroll.
        if (G.inv && typeof ITEMS !== 'undefined'){
          for (var itemId in G.inv){
            var it = ITEMS[itemId];
            if (it && it.type === 'scroll' && (G.inv[itemId]||0) > 0){
              var d = it.spellDmg || 0;
              if (d > bestDmg){ bestDmg = d; bestId = itemId; }
            }
          }
        }
      }
      if (!bestId){
        showDungeonMessage('No spell scrolls! Craft some in the Magic skill.','#e03030');
        renderDungeon();
        return;
      }
      castScrollId = bestId;
      castScrollDmg = bestDmg;
    }

    // Determine player attack type for ability checks
    var atkKind = (mode === 'magic') ? 'magic' : getPlayerAttackType(); // 'magic' | 'ranged' | 'melee'

    // Ability gates: shield blocks all damage, flying blocks melee, immunity blocks the matched type
    var blockedReason = null;
    if (mon.shieldedTurns > 0){
      blockedReason = '<span style="color:#88ddff;">🛡 '+mon.icon+' '+mon.name+' is shielded — your attack does no damage!</span>';
    } else if (mon.flying && atkKind === 'melee'){
      blockedReason = '<span style="color:#ffd966;">🪽 '+mon.icon+' '+mon.name+' is flying out of reach — bring a bow or magic!</span>';
    } else if (mon.immune === 'magic' && atkKind === 'magic'){
      blockedReason = '<span style="color:#a335ee;">✨ '+mon.icon+' '+mon.name+' is immune to magic!</span>';
    } else if (mon.immune === 'physical' && (atkKind === 'melee' || atkKind === 'ranged')){
      blockedReason = '<span style="color:#88ddff;">👻 '+mon.icon+' '+mon.name+' is immune to physical attacks — try magic!</span>';
    }

    if (blockedReason){
      dungeonState.combatLog.push(blockedReason);
      // If we would have consumed a scroll, don't — the attack never landed.
      if (mode === 'magic' && castScrollId){
        dungeonState.combatLog.push('<span style="color:#9a7e50;">Your '+ITEMS[castScrollId].icon+' '+ITEMS[castScrollId].name+' stays sheathed.</span>');
      }
      showDungeonDmgFloat(0,'miss','right');
      // Player wasted their turn — monster still retaliates and ticks
      monsterRetaliate(mon);
      tickStatusEffects(mon);
      if(dungeonState&&dungeonState.playerHp>0) G.hp=dungeonState.playerHp;
      renderDungeon();
      return;
    }

    // Now that we know the cast will land, consume the scroll.
    if (mode === 'magic' && castScrollId){
      var scrItem = ITEMS[castScrollId];
      G.inv[castScrollId]--;
      if (G.inv[castScrollId] <= 0) delete G.inv[castScrollId];
      dungeonState.combatLog.push('<span style="color:#bb77ee;">✨ You unfurl a '+scrItem.icon+' '+scrItem.name+'!</span>');
    }

    var pAtk = (mode==='magic') ? castScrollDmg : getPlayerAtk();
    // Scrolls deal their listed damage with a small variance (±15%); physical attacks
    // still use the existing 1..pAtk random roll so weapon rolls feel identical.
    var pDmg;
    if (mode === 'magic'){
      var variance = 0.85 + Math.random() * 0.30;
      pDmg = Math.max(1, Math.round(castScrollDmg * variance));
    } else {
      pDmg = Math.max(1, rollDmg(1, pAtk));
    }
    var isCrit=false;
    if(dungeonState.critStacks>0){
      var _stacks = Math.min(MAX_POWER_STACKS, dungeonState.critStacks);
      var _p = getPowerStackProfile(_stacks);

      // Reroll the physical base with a high floor so the turns you invested don't
      // evaporate into a lucky 1. Higher stacks → higher minimum roll. Magic scrolls
      // already deal a tight damage band, so they skip the reroll and keep their roll.
      if (mode !== 'magic'){
        var _rollFloor = Math.max(1, Math.ceil(pAtk * (0.3 + 0.2 * _stacks)));
        var _poweredRoll = rollDmg(_rollFloor, Math.max(_rollFloor, pAtk));
        pDmg = Math.max(pDmg, _poweredRoll);
      }

      // Flat "focused strike" bonus — guaranteed extra damage even when the crit whiffs.
      // Scales with stacks so 3 turns of investment always feels meaningful.
      var _powerBonus = Math.max(1, Math.ceil(pAtk * _p.bonusFrac));
      pDmg += _powerBonus;

      if (Math.random() < _p.critChance){
        isCrit = true;
        pDmg = Math.floor(pDmg * _p.critMult);
        dungeonState.combatLog.push('<span style="color:#ffd966;font-size:13px;font-weight:bold;">⚡ CRITICAL HIT! ×'+_p.critMult.toFixed(1)+' (+'+_powerBonus+' focus)</span>');
      } else {
        dungeonState.combatLog.push('<span style="color:#ffd966;">⚡ Focused strike! +'+_powerBonus+' power damage (crit whiffed at '+Math.round(_p.critChance*100)+'%).</span>');
      }
      dungeonState.critStacks = 0;
    }
    // Apply weak/resist damage modifiers, then deal damage
    var atkType = (atkKind === 'magic') ? 'magic' : 'physical';
    var effectiveness = '';
    if(mon.weak === atkType){pDmg=Math.floor(pDmg*1.5);effectiveness='<span style="color:#5ac85a;font-size:9px;"> ✔ Super effective!</span>';}
    else if(mon.resist === atkType){pDmg=Math.max(1,Math.floor(pDmg*0.6));effectiveness='<span style="color:#e03030;font-size:9px;"> ✖ Resisted!</span>';}
    else {effectiveness='<span style="color:#9a7e50;font-size:9px;"> Normal</span>';}
    mon.hp=Math.max(0,mon.hp-pDmg);showDungeonDmgFloat(pDmg,isCrit?'crit':'hit','right');
    // Spell scrolls get their own themed FX; melee/ranged keep the generic hit.
    if(mode==='magic'&&castScrollId){ showDungeonSpellFX(castScrollId); }
    else { showDungeonHitFX('right',isCrit?'crit':'hit'); }
    var dmgColor=isCrit?'#ffd966':(mon.weak===atkType?'#5ac85a':(mon.resist===atkType?'#e03030':'#5ac85a'));
    dungeonState.combatLog.push('You hit '+mon.icon+' '+mon.name+' for <span style="color:'+dmgColor+';font-weight:bold;">'+pDmg+'</span> damage.'+effectiveness);

    if(mon.hp<=0){
      var xp=mon.xp;
      dungeonState.totalXp+=xp;
      dungeonState.combatLog.push(mon.icon+' '+mon.name+' defeated!');

      // Room gold
      var roomGold=rollDmg(DG.goldPerRoom[0],DG.goldPerRoom[1]);
      dungeonState.totalGold+=roomGold;
      dungeonState.combatLog.push('<span style="color:#f0c040;">🪙 Found '+roomGold+' gold!</span>');

      var drops=rollLoot();
      drops.forEach(function(d){
        dungeonState.lootCollected.push(d);
        dungeonState.combatLog.push('<span style="color:#8bc34a;">Dropped: '+d.icon+' '+d.name+' x'+d.qty+'</span>');
      });

      showDungeonEnemyFX('death',mon.icon);
      if(dungeonState.room+1>=dungeonState.monsters.length){
        dungeonState.room++;
        dungeonState.victory=true;
        var rwd=activeDungeon.reward||{id:'gold_coins',name:'Gold',icon:'🪙',eff:'',chance:100};
        if(typeof G!=='undefined'&&!G.dungeonRewards)G.dungeonRewards={};
        var firstClear=(typeof G!=='undefined')&&!G.dungeonRewards[activeDungeon.id];
        dungeonState.combatLog.push('<span style="color:#f0c040;font-weight:bold">The dungeon falls silent. You are victorious!</span>');

        // Roll 1: crafting shard. Chance scales UP with tier (T1≈10%, T12≈70%).
        var dropChance = (rwd.chance!=null) ? rwd.chance : 60;
        var gotDrop = (Math.random()*100) < dropChance;
        if(gotDrop){
          var craftMsg = rwd.craftName ? ' <span style="color:#9a7e50;font-size:10px;">(\u2192 forge '+rwd.craftIcon+' '+rwd.craftName+' in the skill tab)</span>' : '';
          dungeonState.combatLog.push('<span style="color:#0070dd;font-weight:bold">🎁 '+rwd.icon+' '+rwd.name+' obtained!</span>'+craftMsg);
        } else {
          dungeonState.combatLog.push('<span style="color:#9a7e50">No shard this run ('+dropChance+'% · '+rwd.icon+' '+rwd.name+'). Keep going!</span>');
        }

        // Roll 2: lucky rough gear drop. Flat 12% — weaker than crafted, stepping stone only.
        var gearDropChance = rwd.dropChance || 0;
        var gotGearDrop = gearDropChance > 0 && (Math.random()*100) < gearDropChance;
        if(gotGearDrop){
          dungeonState.combatLog.push('<span style="color:#a335ee;font-weight:bold">⚡ Lucky! '+rwd.dropIcon+' '+rwd.dropName+' dropped!</span> <span style="color:#9a7e50;font-size:10px;">(crafted version is stronger)</span>');
        }

        var gotLevelPotion=Math.random()<DG.levelPotionChance;
        if(gotLevelPotion) dungeonState.combatLog.push('<span style="color:#9b59b6;font-weight:bold">🧪 EXTREMELY RARE! Level Potion dropped!</span>');

        if(typeof G!=='undefined'){
          if(!G.inv) G.inv={};
          if(gotDrop){
            G.inv[rwd.id]=(G.inv[rwd.id]||0)+1;
          }
          if(gotGearDrop && rwd.dropId){
            G.inv[rwd.dropId]=(G.inv[rwd.dropId]||0)+1;
          }
          if(firstClear){
            G.dungeonRewards[activeDungeon.id]=true;
          }
          if(gotLevelPotion) G.inv.level_potion=(G.inv.level_potion||0)+1;
          G.gold=(G.gold||0)+dungeonState.totalGold;
          dungeonState.lootCollected.forEach(function(d){
            if(d.id==='gold_coins'){G.gold=(G.gold||0)+d.qty;}
            else{G.inv[d.id]=(G.inv[d.id]||0)+d.qty;}
          });
          if(typeof save==='function') save();
          if(typeof updateUI==='function') updateUI();
          if(typeof renderInv==='function') renderInv();
          if(typeof log==='function'){
            var msg='<b>'+activeDungeon.name+' cleared!</b> +'+dungeonState.totalGold+' gold';
            if(gotDrop) msg+=' + <span style="color:#0070dd">'+rwd.icon+' '+rwd.name+'</span>'+(rwd.craftName?' <span style="color:#9a7e50;font-size:10px;">(\u2192 '+rwd.craftName+')</span>':'');
            if(gotGearDrop) msg+=' + <span style="color:#a335ee">⚡ '+rwd.dropIcon+' '+rwd.dropName+'</span>';
            if(gotLevelPotion) msg+=' + <span style="color:#9b59b6">🧪 Level Potion!</span>';
            log(msg+' + loot!');
          }
          // First-victory popup with fireworks fires only on the very first clear
          if(firstClear){
            setTimeout(function(){showFirstVictoryPopup(activeDungeon,rwd);},700);
          }
        }
      } else {
        var nextIdx=dungeonState.room+1;
        var next=dungeonState.monsters[nextIdx];
        dungeonState.combatLog.push('A '+next.icon+' <b>'+next.name+'</b> appears! (Room '+(nextIdx+1)+'/5)');
        dungeonState.dying=true;
        setTimeout(function(){
          if(!dungeonState) return;
          dungeonState.room=nextIdx;
          dungeonState.dying=false;
          showDungeonEnemyFX('spawn',next.icon);
          renderDungeon();
        },600);
      }
    } else {
      // Monster hits back, then status effects tick (poison/heal/shield).
      monsterRetaliate(mon);
      tickStatusEffects(mon);
    }
    if(dungeonState&&!dungeonState.victory&&dungeonState.playerHp>0) G.hp=dungeonState.playerHp;
    renderDungeon();
  }

  function dungeonEat(){
    if(!dungeonState||dungeonState.victory||dungeonState.fled||dungeonState.playerHp<=0) return;
    var foods=getFoodList();
    if(foods.length===0){showDungeonMessage('No food left!','#e03030');return;}
    var f=foods[0],healed=Math.min(f.hp,dungeonState.playerMaxHp-dungeonState.playerHp);
    if(healed<=0){showDungeonMessage('Already at full HP!','#ffd966');return;}
    // Apply heal first
    dungeonState.playerHp=Math.min(dungeonState.playerMaxHp,dungeonState.playerHp+f.hp);
    showDungeonDmgFloat(healed,'heal','left');
    G.inv[f.id]--;
    if(G.inv[f.id]<=0) delete G.inv[f.id];
    dungeonState.combatLog.push('You eat '+f.icon+' '+f.name+' and heal <span style="color:#5ac85a">'+healed+'</span> HP.');
    // Eating leaves you open — the current monster takes a swing at you.
    var mon=dungeonState.monsters[dungeonState.room];
    if(mon&&mon.hp>0){
      monsterRetaliate(mon);
      tickStatusEffects(mon);
    }
    if(dungeonState&&dungeonState.playerHp>0) G.hp=dungeonState.playerHp;
    renderDungeon();
  }

  function dungeonFlee(){
    if(!dungeonState||dungeonState.victory||dungeonState.playerHp<=0) return;
    dungeonState.fled=true;
    dungeonState.combatLog.push('<span style="color:#ffd966;font-weight:bold">🏃 You flee from the dungeon! You keep your loot.</span>');
    // Apply loot on flee - keep everything collected
    if(typeof G!=='undefined'){
      if(!G.inv) G.inv={};
      G.gold=(G.gold||0)+dungeonState.totalGold;
      dungeonState.lootCollected.forEach(function(d){
        if(d.id==='gold_coins'){G.gold=(G.gold||0)+d.qty;}
        else{G.inv[d.id]=(G.inv[d.id]||0)+d.qty;}
      });
      if(typeof save==='function') save();
      if(typeof updateUI==='function') updateUI();
      if(typeof renderInv==='function') renderInv();
      if(typeof log==='function'){
        var lootMsg=dungeonState.lootCollected.length>0?' + loot':'';
        log('🏃 Fled dungeon with '+dungeonState.totalGold+' gold'+lootMsg+'.');
      }
    }
    renderDungeon();
  }

  function leaveDungeon(){
    dungeonState=null;
    var ov=document.getElementById('dungeon-overlay');
    if(ov) ov.style.display='none';
    if(typeof updateUI==='function') updateUI();
  }

  function showDungeonMessage(msg,color){
    var el=document.getElementById('dg-msg');
    if(!el) return;
    el.textContent=msg;
    el.style.color=color||'#ffd966';
    el.style.display='block';
    setTimeout(function(){el.style.display='none';},2500);
  }

  function renderDungeon(){
    var ov=document.getElementById('dungeon-overlay');
    if(!ov) createDungeonOverlay();
    ov=document.getElementById('dungeon-overlay');
    ov.style.display='flex';
    var content=document.getElementById('dg-content');
    if(!dungeonState){ov.style.display='none';return;}
    var s=dungeonState,mon=s.room<s.monsters.length?s.monsters[s.room]:null;
    var alive=s.playerHp>0,done=s.victory||!alive||s.fled;
    var pHp=Math.max(0,(s.playerHp/s.playerMaxHp)*100);
    var mHp=mon?Math.max(0,(mon.hp/mon.maxhp)*100):0;

    var h='<div onclick="window._dgLeave()" style="position:absolute;top:8px;right:12px;color:#9a7e50;font-size:22px;cursor:pointer;z-index:10;line-height:1;">&times;</div>';
    h+='<div style="text-align:center;margin-bottom:8px;"><div style="color:#f0c040;font-family:Cinzel,serif;font-size:16px;">'+activeDungeon.icon+' '+activeDungeon.name+'</div><div style="color:#9a7e50;font-size:11px;">Room '+(Math.min(s.room+1,s.monsters.length))+'/'+s.monsters.length+(s.totalGold>0?' | 🪙 '+s.totalGold+' gold':'')+'</div></div>';

    // === LIVE LOOT BAG === collected items so the player sees their haul as the run unfolds.
    var bagItems = {};
    if (s.lootCollected && s.lootCollected.length){
      s.lootCollected.forEach(function(l){
        if (!bagItems[l.id]) bagItems[l.id] = {icon:l.icon, name:l.name, qty:0};
        bagItems[l.id].qty += l.qty;
      });
    }
    var bagKeys = Object.keys(bagItems);
    h+='<div style="background:linear-gradient(180deg,#1a1308,#0f0a04);border:1px solid #3a2c18;border-radius:6px;padding:6px 8px;margin-bottom:10px;">';
    h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
    h+='<span style="font-size:14px;">🎒</span>';
    h+='<span style="color:#f0c040;font-size:10px;font-family:Cinzel,serif;letter-spacing:1px;">DUNGEON BAG</span>';
    if (s.totalGold>0) h+='<span style="color:#f0c040;font-size:10px;margin-left:auto;">🪙 '+s.totalGold+'</span>';
    h+='</div>';
    if (bagKeys.length === 0){
      h+='<div style="color:#5a4830;font-size:9px;font-style:italic;">Empty — defeat enemies to collect loot</div>';
    } else {
      h+='<div style="display:flex;flex-wrap:wrap;gap:4px;">';
      bagKeys.forEach(function(k){
        var b=bagItems[k];
        h+='<div title="'+b.name+'" style="display:inline-flex;align-items:center;gap:3px;background:#0b0604;border:1px solid #3a2c18;border-radius:4px;padding:3px 6px;"><span style="font-size:13px;">'+b.icon+'</span><span style="color:#e8d898;font-size:10px;font-weight:700;">×'+b.qty+'</span></div>';
      });
      h+='</div>';
    }
    h+='</div>';

    h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;">';
    // Player column (with poison indicator if active)
    var poisonBadge = (s.playerPoison>0 && s.playerPoisonTurns>0)
      ? '<div style="color:#9b59b6;font-size:9px;margin-top:2px;">🧪 Poisoned (-'+s.playerPoison+'/turn · '+s.playerPoisonTurns+'t)</div>'
      : '';
    h+='<div style="flex:1;text-align:center;"><div style="font-size:26px;">🧍</div><div style="color:#e8d898;font-size:12px;">You</div><div style="background:#1c1710;border:1px solid #3a2c18;border-radius:4px;height:10px;overflow:hidden;"><div style="height:100%;width:'+pHp+'%;background:'+(pHp>30?'#5ac85a':'#e03030')+';transition:width 0.3s;"></div></div><div style="color:#9a7e50;font-size:10px;">'+s.playerHp+'/'+s.playerMaxHp+' HP</div>'+poisonBadge+'</div>';
    h+='<div style="color:#f0c040;font-size:16px;font-family:Cinzel,serif;">VS</div>';
    h+='<div style="flex:1;text-align:center;">';
    if(mon&&mon.hp>0) {
      // Build status badges for the monster
      var badges = [];
      if (mon.shieldedTurns>0) badges.push('<span style="color:#88ddff">🛡 Shielded ('+mon.shieldedTurns+'t)</span>');
      if (mon.flying)          badges.push('<span style="color:#ffd966">🪽 Flying</span>');
      if (mon.immune==='magic')    badges.push('<span style="color:#a335ee">✨ Magic immune</span>');
      if (mon.immune==='physical') badges.push('<span style="color:#88ddff">👻 Phys immune</span>');
      if (mon.resist==='magic'&&mon.immune!=='magic')       badges.push('<span style="color:#a335ee">✨ Magic resist</span>');
      if (mon.resist==='physical'&&mon.immune!=='physical') badges.push('<span style="color:#88ddff">⚔ Phys resist</span>');
      if (mon.heal)            badges.push('<span style="color:#5ac85a">💚 Heals</span>');
      if (mon.poison)          badges.push('<span style="color:#9b59b6">🧪 Poison</span>');
      var badgesHtml = badges.length ? '<div style="font-size:8px;margin-top:2px;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;">'+badges.join(' ')+'</div>' : '';
      h+='<div style="font-size:26px;">'+mon.icon+'</div><div style="color:#e8d898;font-size:12px;">'+mon.name+'</div><div style="background:#1c1710;border:1px solid #3a2c18;border-radius:4px;height:10px;overflow:hidden;"><div style="height:100%;width:'+mHp+'%;background:#e03030;transition:width 0.3s;"></div></div><div style="color:#9a7e50;font-size:10px;">'+mon.hp+'/'+mon.maxhp+' HP</div>'+badgesHtml;
    }
    else if(s.victory) h+='<div style="font-size:26px;">🪓</div><div style="color:#f0c040;font-size:12px;">Victory!</div>';
    else if(s.fled) h+='<div style="font-size:26px;">🏃</div><div style="color:#ffd966;font-size:12px;">Escaped!</div>';
    else h+='<div style="font-size:26px;">💀</div><div style="color:#e03030;font-size:12px;">Defeated</div>';
    h+='</div></div>';

    // === Action buttons ===
    h+='<div style="display:flex;gap:4px;margin-bottom:6px;justify-content:center;flex-wrap:wrap;">';
    if(!done){
      var fc=getFoodCount();
      h+='<button onclick="window._dgAttack(\'slash\')" style="flex:1;max-width:80px;padding:6px;background:#8B4513;border:1px solid #f0c040;color:#f0c040;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;font-weight:bold;" title="Normal attack">⚔ Slash</button>';
      // Power button: preview the NEXT stack's stats so players know what they'll get.
      var _curStacks=s.critStacks||0;
      var _atMax=_curStacks>=MAX_POWER_STACKS;
      var _previewProf=getPowerStackProfile(Math.min(MAX_POWER_STACKS,_curStacks+1));
      var _powerTitle=_atMax
        ? 'Max focus — slash now to unleash a guaranteed ×5 crit with +60% power bonus damage.'
        : 'Focus Power: next stack → '+Math.round(_previewProf.critChance*100)+'% crit / ×'+_previewProf.critMult.toFixed(1)+' damage / +'+Math.round(_previewProf.bonusFrac*100)+'% flat bonus. Enemy still hits you this turn.';
      var _powerLabel='⚡ Power'+(_curStacks>0?' ×'+_curStacks:'');
      h+='<button onclick="window._dgAttack(\'power\')" style="flex:1;max-width:80px;padding:6px;background:'+(_curStacks>0?'#4a3010':'#251e14')+';border:1px solid '+(_curStacks>0?'#ffd966':'#3a2c18')+';color:'+(_curStacks>0?'#ffd966':'#c08020')+';border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;" title="'+_powerTitle+'">'+_powerLabel+'</button>';
      h+='<button onclick="window._dgEat()" style="flex:1;max-width:80px;padding:6px;background:#251e14;border:1px solid #3a2c18;color:'+(fc>0?'#5ac85a':'#5a4830')+';border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;" title="Eat food to heal (no damage taken)">🍖 Eat('+fc+')</button>';
      h+='<button onclick="window._dgFlee()" style="flex:1;max-width:80px;padding:6px;background:#251e14;border:1px solid #3a2c18;color:#e03030;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;" title="Flee and keep collected loot">🏃 Flee</button>';
    } else {
      h+='<button onclick="window._dgLeave()" style="padding:8px 20px;background:#f0c040;border:none;color:#0b0905;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:13px;font-weight:bold;">'+(s.victory?'🪓 Claim & Leave':s.fled?'🏃 Leave':'Leave Dungeon')+'</button>';
    }
    h+='</div>';

    // === Spell bar — always renders all canonical scroll slots in combat so the
    // player can see which scrolls they own, which are empty, and which are still
    // locked behind their current Magic level.
    if(!done){
      var SCROLL_ORDER=['scroll_wind','scroll_water','scroll_fire','scroll_earth','scroll_shock','scroll_inferno','scroll_tempest','scroll_meteor'];
      var rarClr={common:'#ffffff',uncommon:'#1eff00',rare:'#0070dd',epic:'#a335ee',legendary:'#ff8000',artifact:'#e6cc80'};
      var magicLvl=(typeof slvl==='function')?slvl('magic'):1;
      // Resolve each scroll's crafting-level requirement from ACTIONS.magic once.
      function scrollReqLevel(sid){
        if(typeof ACTIONS==='undefined'||!ACTIONS.magic) return 1;
        for(var ai=0;ai<ACTIONS.magic.length;ai++){
          var a=ACTIONS.magic[ai];
          if(a.prod){for(var pi=0;pi<a.prod.length;pi++){if(a.prod[pi].id===sid)return a.req||1;}}
        }
        return 1;
      }
      var ownedTypes=0,totalScrolls=0;
      var slotsHtml='<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;">';
      for(var si=0;si<SCROLL_ORDER.length;si++){
        var scid=SCROLL_ORDER[si];
        var sit=(typeof ITEMS!=='undefined')?ITEMS[scid]:null;
        if(!sit) continue;
        var scq=(G&&G.inv&&G.inv[scid])||0;
        var bclr=rarClr[sit.rarity||'common']||'#888';
        var dmgTip=sit.spellDmg||0;
        var reqLvl=scrollReqLevel(scid);
        if(scq>0){
          ownedTypes++;
          totalScrolls+=scq;
          slotsHtml+='<button onclick="window._dgAttack(\'magic\',\''+scid+'\')" '
           +'style="position:relative;background:#1a0e2a;border:2px solid '+bclr+';border-radius:6px;padding:5px 7px 4px;cursor:pointer;min-width:44px;text-align:center;box-shadow:0 0 8px '+bclr+'44;" '
           +'title="'+sit.name+' · '+dmgTip+' dmg · '+scq+' owned">'
           +'<div style="font-size:20px;line-height:1;filter:drop-shadow(0 0 6px '+bclr+');">'+sit.icon+'</div>'
           +'<div style="font-size:8px;color:'+bclr+';font-family:Cinzel,serif;font-weight:bold;line-height:1.1;">'+dmgTip+'</div>'
           +'<span style="position:absolute;bottom:1px;right:3px;font-size:8px;color:#f0c040;font-weight:bold;">'+(scq>=100?'99+':scq)+'</span>'
           +'</button>';
        } else {
          // Empty slot: dashed border, greyscale icon, locked badge if below req level.
          var unlocked=magicLvl>=reqLvl;
          var slotOpacity=unlocked?'0.5':'0.32';
          var titleTxt=unlocked
            ? sit.name+' · '+dmgTip+' dmg · EMPTY — craft one in Magic to fill this slot'
            : sit.name+' · Unlocks at Magic Lv.'+reqLvl;
          slotsHtml+='<div title="'+titleTxt+'" '
           +'style="position:relative;background:#110d07;border:2px dashed #2b2112;border-radius:6px;padding:5px 7px 4px;min-width:44px;text-align:center;cursor:default;opacity:'+slotOpacity+';">'
           +(unlocked?'':'<span style="position:absolute;top:1px;left:3px;font-size:8px;color:#5a4830;font-weight:bold;text-shadow:0 0 2px #000;">🔒'+reqLvl+'</span>')
           +'<div style="font-size:20px;line-height:1;filter:grayscale(1) brightness(0.55);">'+sit.icon+'</div>'
           +'<div style="font-size:8px;color:#3a2c18;font-family:Cinzel,serif;font-weight:bold;line-height:1.1;">'+dmgTip+'</div>'
           +'</div>';
        }
      }
      slotsHtml+='</div>';
      h+='<div style="margin-bottom:8px;">';
      h+='<div style="font-family:Cinzel,serif;font-size:9px;color:#5a4830;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;text-align:center;">✨ Spell Scrolls <span style="color:#3a2c18;">('+ownedTypes+'/'+SCROLL_ORDER.length+(totalScrolls>0?' · '+totalScrolls+' total':'')+')</span></div>';
      h+=slotsHtml;
      h+='</div>';
    }


    // Equipment stats
    if(!done){
      var wpnItem=(G.equip&&(G.equip.weaponR||G.equip.weaponL||G.equip.weapon))?ITEMS[G.equip.weaponR||G.equip.weaponL||G.equip.weapon]:null;
      var armItem=(G.equip&&(G.equip.chest||G.equip.armour))?ITEMS[G.equip.chest||G.equip.armour]:null;
      h+='<div style="display:flex;gap:4px;margin-bottom:6px;">';
      h+='<div style="flex:1;background:#1c1710;border:1px solid '+(wpnItem?'#8B4513':'#251e14')+';border-radius:4px;padding:4px 6px;display:flex;align-items:center;gap:4px;">';
      h+='<span style="font-size:14px;">'+(wpnItem?wpnItem.icon:'🗡️')+'</span>';
      h+='<div><div style="font-size:7px;color:#5a4830;font-family:Cinzel,serif;text-transform:uppercase;">Weapon</div>';
      h+='<div style="font-size:10px;color:#e8d898;">'+(wpnItem?wpnItem.name:'None')+'</div>';
      h+='<div style="font-size:9px;color:#f0c040;font-weight:bold;">+'+(wpnItem?wpnItem.atk:0)+' ATK</div></div></div>';
      h+='<div style="flex:1;background:#1c1710;border:1px solid '+(armItem?'#4488dd':'#251e14')+';border-radius:4px;padding:4px 6px;display:flex;align-items:center;gap:4px;">';
      h+='<span style="font-size:14px;">'+(armItem?armItem.icon:'🛡️')+'</span>';
      h+='<div><div style="font-size:7px;color:#5a4830;font-family:Cinzel,serif;text-transform:uppercase;">Armour</div>';
      h+='<div style="font-size:10px;color:#e8d898;">'+(armItem?armItem.name:'None')+'</div>';
      h+='<div style="font-size:9px;color:#4488dd;font-weight:bold;">+'+(armItem?armItem.def:0)+' DEF</div></div></div>';
      h+='<div style="background:#1c1710;border:1px solid #3a2c18;border-radius:4px;padding:4px 6px;text-align:center;min-width:50px;">';
      h+='<div style="font-size:7px;color:#5a4830;font-family:Cinzel,serif;">TOTAL</div>';
      h+='<div style="font-size:11px;color:#f0c040;font-weight:bold;">⚔'+getPlayerAtk()+'</div>';
      h+='<div style="font-size:11px;color:#4488dd;font-weight:bold;">🛡'+getPlayerDef()+'</div>';
      h+='</div></div>';
    }

    // Power charge indicator — shows exactly what the next hit will do.
    if(!done&&s.critStacks>0){
      var _cp=getPowerStackProfile(Math.min(MAX_POWER_STACKS,s.critStacks));
      var _critTxt=_cp.critChance>=1?'<b>GUARANTEED CRIT</b>':Math.round(_cp.critChance*100)+'% crit';
      var _prompt=s.critStacks>=MAX_POWER_STACKS
        ? ' <b style="color:#ffffcc;">UNLEASH IT! ⚔</b>'
        : ' Stack once more for an even bigger hit.';
      h+='<div style="text-align:center;color:#ffd966;font-size:10px;margin-bottom:6px;line-height:1.35;">⚡ Focused ×'+s.critStacks+' — '+_critTxt+' · ×'+_cp.critMult.toFixed(1)+' damage · +'+Math.round(_cp.bonusFrac*100)+'% power bonus.'+_prompt+'</div>';
    }

    // Loot display
    if(s.lootCollected.length>0||s.totalGold>0){
      var ls={};s.lootCollected.forEach(function(l){if(!ls[l.id])ls[l.id]={icon:l.icon,name:l.name,qty:0};ls[l.id].qty+=l.qty;});
      if(!done||s.fled){
        h+='<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:6px;margin-bottom:8px;"><div style="color:#8bc34a;font-size:10px;margin-bottom:4px;">LOOT'+(s.totalGold>0?' (🪙 '+s.totalGold+' gold)':'')+':</div>';
        var lh=[];
        for(var k in ls) lh.push('<span style="color:#9a7e50;font-size:10px;">'+ls[k].icon+ls[k].name+' x'+ls[k].qty+'</span>');
        h+=lh.join(' · ')+'</div>';
      }
      if(s.victory){
        h+='<div style="background:#1c1710;border:1px solid #f0c040;border-radius:4px;padding:8px;margin-bottom:8px;"><div style="color:#f0c040;font-size:11px;margin-bottom:4px;">LOOT OBTAINED (🪙 '+s.totalGold+' gold)</div>';
        for(var k2 in ls) h+='<div style="color:#8bc34a;font-size:11px;">'+ls[k2].icon+' '+ls[k2].name+' x'+ls[k2].qty+'</div>';
        h+='</div>';
      }
    }

    // Combat log
    h+='<div style="background:#0b0905;border:1px solid #251e14;border-radius:4px;padding:6px;max-height:120px;overflow-y:auto;font-size:11px;line-height:1.5;" id="dg-log">';
    var st=Math.max(0,s.combatLog.length-8);
    for(var i=st;i<s.combatLog.length;i++) h+='<div style="color:#9a7e50;">'+s.combatLog[i]+'</div>';
    h+='</div>';

    var bodyEl=document.getElementById('dg-body');
    if(!bodyEl){var nb=document.createElement('div');nb.id='dg-body';content.appendChild(nb);bodyEl=nb;}
    bodyEl.innerHTML=h;
    var logEl=document.getElementById('dg-log');
    if(logEl) logEl.scrollTop=logEl.scrollHeight;
  }

  function createDungeonOverlay(){
    if(document.getElementById('dungeon-overlay')) return;
    var ov=document.createElement('div');
    ov.id='dungeon-overlay';
    ov.style.cssText='display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9998;justify-content:center;align-items:center;padding:12px;box-sizing:border-box;';
    ov.innerHTML='<div id="dg-content" style="position:relative;background:#13100a;border:2px solid #3a2c18;border-radius:8px;padding:16px;width:360px;max-width:95vw;max-height:90vh;overflow-y:auto;font-family:Cinzel,serif;"><div id="dg-body"></div></div>';
    ov.addEventListener('click',function(e){if(e.target===ov) leaveDungeon();});
    document.body.appendChild(ov);
  }

  // === TIER PICKER (lists all 12 dungeon tiers for a given skill) ===
  function showTierPicker(sk){
    var theme = SKILL_THEMES[sk];
    if(!theme) return;
    var existing = document.getElementById('dg-tier-picker');
    if(existing) existing.remove();
    var lvl = (typeof slvl==='function') ? slvl(sk) : 0;
    var skName = (typeof SKILLS!=='undefined'&&SKILLS[sk]) ? SKILLS[sk].name : sk;
    var ov = document.createElement('div');
    ov.id = 'dg-tier-picker';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(5,3,1,0.88);z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:Cinzel,serif;';
    ov.onclick = function(e){ if(e.target===ov) ov.remove(); };
    var modal = document.createElement('div');
    modal.style.cssText = 'background:linear-gradient(135deg,#0f0a04 0%,#1a1308 100%);border:2px solid #f0c040;border-radius:12px;padding:18px 14px 14px;max-width:420px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 0 40px rgba(240,192,64,.4);';
    var header =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
        '<div style="font-size:32px;">'+theme.icon+'</div>' +
        '<div style="flex:1;">' +
          '<div style="color:#f0c040;font-size:16px;font-weight:700;">'+theme.name+'</div>' +
          '<div style="color:#9a7e50;font-size:10px;">'+skName+' Dungeons · Lvl '+lvl+'</div>' +
        '</div>' +
        '<div style="cursor:pointer;color:#9a7e50;font-size:24px;line-height:1;padding:0 4px;" onclick="document.getElementById(\'dg-tier-picker\').remove()">×</div>' +
      '</div>';
    var listWrap = document.createElement('div');
    listWrap.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px;';
    // Helper for rarity colour lookup (defined in index.html). Falls back to gold.
    var rarityClr = function(itemId){
      try {
        if (typeof window.RARITY === 'object' && typeof window.getItemRarity === 'function') {
          return window.RARITY[window.getItemRarity(itemId)].color;
        }
      } catch(e){}
      if (typeof ITEMS !== 'undefined' && ITEMS[itemId]) {
        var rar = ITEMS[itemId].rarity || 'common';
        var palette = {common:'#ffffff',uncommon:'#1eff00',rare:'#0070dd',epic:'#a335ee',legendary:'#ff8000',artifact:'#e6cc80'};
        return palette[rar] || '#f0c040';
      }
      return '#f0c040';
    };
    var profileTheme = (SKILL_GEAR_PROFILES[sk] && SKILL_GEAR_PROFILES[sk].theme) || '';
    if (profileTheme){
      var themeRow = document.createElement('div');
      themeRow.style.cssText = 'padding:6px 10px;margin-bottom:4px;border-radius:6px;background:rgba(240,192,64,.06);border:1px solid rgba(240,192,64,.25);text-align:center;color:#f0c040;font-size:10px;letter-spacing:1px;text-transform:uppercase;';
      themeRow.textContent = profileTheme + ' build · gear bias';
      listWrap.appendChild(themeRow);
    }
    for (var t = 1; t <= 12; t++){
      var id = sk + '_t' + t;
      var d = DUNGEONS[id]; if(!d) continue;
      var req = DUNGEON_UNLOCK_LEVELS[id] || 3;
      var unlocked = (lvl >= req);
      var claimed = (typeof G!=='undefined' && G.dungeonRewards && G.dungeonRewards[id]);
      var rw = d.reward || {};
      var dropPct = rw.chance != null ? rw.chance : 50;
      var owned = (typeof G!=='undefined' && G.inv && G.inv[rw.id]) ? G.inv[rw.id] : 0;
      var rwClr = rarityClr(rw.id);
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid '+(unlocked?'#3a2c18':'#1c1710')+';border-radius:7px;background:'+(unlocked?'#1a1308':'#0d0905')+';cursor:'+(unlocked?'pointer':'default')+';opacity:'+(unlocked?'1':'0.6')+';transition:all .15s;';
      var rewardLine = '<div style="color:#e8d898;font-size:10px;margin-top:3px;display:flex;align-items:center;gap:5px;flex-wrap:wrap;"><span style="font-size:14px;">'+rw.icon+'</span><span style="color:'+rwClr+';font-weight:700;">'+(rw.name||'Reward')+'</span>'+(owned>0?'<span style="color:#5ac85a;font-size:9px;">×'+owned+'</span>':'')+'</div>';
      // Craft path — show what gear piece the shard can be forged into
      var craftOwnedTP = (rw.craftItem && typeof G!=='undefined'&&G.inv&&G.inv[rw.craftItem]) ? G.inv[rw.craftItem] : 0;
      var craftLine = rw.craftName
        ? '<div style="font-size:9px;color:#9a7e50;margin-top:2px;display:flex;align-items:center;gap:3px;flex-wrap:wrap;"><span>\u2b3b</span><span style="font-size:12px;">'+rw.craftIcon+'</span><span style="color:#f0c040;">'+rw.craftName+'</span>'+(craftOwnedTP>0?'<span style="color:#5ac85a;font-size:9px;">×'+craftOwnedTP+'</span>':'')+'</div>'
        : '';
      var statsLine = rw.craftEff ? '<div style="color:#5a4830;font-size:9px;margin-top:1px;">'+rw.craftEff+'</div>' : '';
      var gearDropLine = '';
      if(rw.dropId){
        var tpDropPalette={uncommon:'#1eff00',rare:'#0070dd',epic:'#a335ee',legendary:'#ff8000'};
        var tpDropClr=tpDropPalette[rw.dropRarity||'uncommon']||'#1eff00';
        var tpDropOwned=(typeof G!=='undefined'&&G.inv&&G.inv[rw.dropId])?G.inv[rw.dropId]:0;
        var tierLabel = t<=4?'Tier 1 Gear':t<=8?'Tier 2 Gear':'Tier 3 Gear';
        gearDropLine='<div style="font-size:9px;color:'+tpDropClr+';margin-top:2px;display:flex;align-items:center;gap:3px;flex-wrap:wrap;"><span>⚡</span><span>'+tierLabel+'</span>'+(tpDropOwned>0?'<span style="color:#5ac85a;font-size:9px;">×'+tpDropOwned+'</span>':'')+'<span style="color:#ffd966;margin-left:auto;">'+(rw.dropChance||30)+'%</span></div>';
      }
      var chanceLine = '<div style="color:#9a7e50;font-size:9px;margin-top:3px;display:flex;justify-content:space-between;gap:6px;"><span style="color:#88ddff;">💎 '+dropPct+'% shard</span><span style="color:'+(unlocked?'#5ac85a':'#9a7e50')+';">'+(unlocked?'✓ Lvl '+req:'🔒 Lvl '+req)+'</span></div>';
      row.innerHTML =
        '<div style="min-width:34px;height:34px;border-radius:5px;background:#0b0604;border:1px solid #3a2c18;display:flex;align-items:center;justify-content:center;font-size:16px;color:#f0c040;font-weight:700;">'+t+'</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="color:#e8d898;font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(unlocked?'':'🔒 ')+'Tier '+t+(claimed?' <span style="color:#5ac85a;font-size:10px;">cleared</span>':'')+'</div>' +
          rewardLine +
          craftLine +
          statsLine +
          gearDropLine +
          chanceLine +
        '</div>';
      if(unlocked){
        (function(dungeonId){
          row.onclick = function(){ ov.remove(); showDungeonEntry(dungeonId); };
        })(id);
      }
      listWrap.appendChild(row);
    }
    modal.innerHTML = header;
    modal.appendChild(listWrap);
    ov.appendChild(modal);
    document.body.appendChild(ov);
  }

  window._dgAttack=dungeonAttack;
  window._dgShowEntry=showDungeonEntry;
  window._dgShowTierPicker=showTierPicker;
  window._dgEat=dungeonEat;
  window._dgFlee=dungeonFlee;
  window._dgLeave=leaveDungeon;
  window._dgStart=startDungeon;
  window._dgShowDiscovery=showDungeonDiscoveryPopup;
  // Apply the tier scaling once up front so all downstream code reads scaled HP/dmg.
  Object.keys(DUNGEONS).forEach(function(k){ DUNGEONS[k] = scaleDungeonMonsters(DUNGEONS[k]); });
  window.DUNGEONS=DUNGEONS;
  window.DUNGEON_UNLOCK_LEVEL=DUNGEON_UNLOCK_LEVEL;
  window.DUNGEON_UNLOCK_LEVELS=DUNGEON_UNLOCK_LEVELS;

  function getUnlockLevelFor(sk){
    return (DUNGEON_UNLOCK_LEVELS && DUNGEON_UNLOCK_LEVELS[sk]) || DUNGEON_UNLOCK_LEVEL;
  }

  function showDungeonEntry(dungeonId){
    // Support the legacy single-dungeon-per-skill id (e.g. 'woodcutting') by auto-mapping to tier 1.
    if(dungeonId && !DUNGEONS[dungeonId] && DUNGEONS[dungeonId+'_t1']) dungeonId = dungeonId+'_t1';
    if(dungeonId && DUNGEONS[dungeonId]) activeDungeon=DUNGEONS[dungeonId];
    createDungeonOverlay();
    var content=document.getElementById('dg-content');
    // Lock check: skill must reach the dungeon's unlock level before the dungeon opens
    var dungeonSkill = activeDungeon.skill || activeDungeon.id;
    var skLvl=(typeof slvl==='function')?slvl(dungeonSkill):0;
    var unlockLvl=getUnlockLevelFor(activeDungeon.id);
    if(skLvl<unlockLvl){
      var skName2=(typeof SKILLS!=='undefined'&&SKILLS[dungeonSkill])?SKILLS[dungeonSkill].name:dungeonSkill;
      var hLock='<div onclick="window._dgLeave()" style="position:absolute;top:8px;right:12px;color:#9a7e50;font-size:22px;cursor:pointer;z-index:10;line-height:1;">&times;</div>';
      hLock+='<div style="text-align:center;padding:20px 8px;">';
      hLock+='<div style="font-size:48px;margin-bottom:10px;filter:grayscale(1);opacity:0.5;">'+activeDungeon.icon+'</div>';
      hLock+='<div style="font-size:38px;margin-bottom:8px;">🔒</div>';
      hLock+='<div style="color:#f0c040;font-family:Cinzel,serif;font-size:16px;margin-bottom:6px;">Dungeon Locked</div>';
      hLock+='<div style="color:#9a7e50;font-size:12px;margin-bottom:14px;line-height:1.4;">Reach <b style="color:#e8d898;">Level '+unlockLvl+'</b> in <b style="color:#e8d898;">'+skName2+'</b> to discover this dungeon.</div>';
      hLock+='<div style="color:#5a4830;font-size:10px;line-height:1.4;">Current: Lvl '+skLvl+' / '+unlockLvl+'</div>';
      hLock+='</div>';
      var bodyL=document.getElementById('dg-body');
      if(!bodyL){var nbL=document.createElement('div');nbL.id='dg-body';content.appendChild(nbL);bodyL=nbL;}
      bodyL.innerHTML=hLock;
      document.getElementById('dungeon-overlay').style.display='flex';
      return;
    }
    var check=canEnterDungeon();
    // Prefer the new multi-slot layout; fall back to the legacy single-weapon/armour fields.
    var mainW=(G.equip&&(G.equip.weaponR||G.equip.weaponL||G.equip.weapon));
    var wpn=(mainW&&ITEMS[mainW])?ITEMS[mainW]:null;
    var mainA=(G.equip&&(G.equip.chest||G.equip.armour));
    var arm=(mainA&&ITEMS[mainA])?ITEMS[mainA]:null;
    var fc=getFoodCount();
    var rwd=activeDungeon.reward||{};
    var lootPool=activeDungeon.loot||[];
    var roomList=activeDungeon.rooms||[];

    var h='<div onclick="window._dgLeave()" style="position:absolute;top:8px;right:12px;color:#9a7e50;font-size:22px;cursor:pointer;z-index:10;line-height:1;">&times;</div>';
    var tierLbl = activeDungeon.tier ? ('Tier '+activeDungeon.tier+' · ') : '';
    h+='<div style="text-align:center;"><div style="font-size:32px;margin-bottom:6px;">'+activeDungeon.icon+'</div><div style="color:#f0c040;font-size:18px;font-family:Cinzel,serif;margin-bottom:2px;">'+activeDungeon.name+'</div><div style="color:#9a7e50;font-size:11px;margin-bottom:12px;">'+tierLbl+'5 Rooms · Unlock Lvl '+unlockLvl+'</div></div>';
    var craftArrow = rwd.craftName ? (' \u2192 forge <span style="color:#f0c040;">'+rwd.craftIcon+' '+rwd.craftName+'</span> in the '+activeDungeon.skill.charAt(0).toUpperCase()+activeDungeon.skill.slice(1)+' tab') : '';
    h+='<div style="color:#e8d898;font-size:12px;margin-bottom:12px;line-height:1.5;text-align:center;">'+(activeDungeon.desc||'')+' Clear all <b>5 creatures</b> to earn <span style="color:#0070dd;">'+rwd.icon+' '+rwd.name+'</span>'+craftArrow+'.<br><span style="color:#9a7e50;font-size:10px;">⚔ Slash or ⚡ Power Attack! 🍖 Eating leaves you open — dodge gear helps. 🏃 Flee to keep loot.</span></div>';

    h+='<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:10px;margin-bottom:10px;">';
    h+='<div style="color:#f0c040;font-size:11px;margin-bottom:6px;letter-spacing:1px;">REQUIREMENTS</div>';
    h+='<div style="color:'+(wpn?'#5ac85a':'#e0a040')+';font-size:11px;margin-bottom:3px;">'+(wpn?'✓ Weapon equipped ('+wpn.icon+' '+wpn.name+')':'⚠ No weapon — fighting with fists (very weak)')+'</div>';
    h+='<div style="color:'+(fc>=DG.minFood?'#5ac85a':'#e03030')+';font-size:11px;margin-bottom:3px;">'+(fc>=DG.minFood?'✓':'✗')+' '+DG.minFood+'+ food (have: '+fc+')</div>';
    h+='<div style="color:#9a7e50;font-size:10px;margin-top:6px;">'+(arm?arm.icon+' '+arm.name:'No armour')+'</div>';
    h+='</div>';

    // === TACTICAL RECOMMENDATIONS ===
    // Scan the room list for special abilities and warn the player up front so they
    // bring the right tool for the job.
    var hasFlying=false, hasMagicImmune=false, hasPhysImmune=false;
    var hasMagicResist=false, hasPhysResist=false;
    var hasShield=false, hasHeal=false, hasPoison=false;
    roomList.forEach(function(r){
      if(r.flying) hasFlying=true;
      if(r.immune==='magic') hasMagicImmune=true;
      if(r.immune==='physical') hasPhysImmune=true;
      if(r.resist==='magic') hasMagicResist=true;
      if(r.resist==='physical') hasPhysResist=true;
      if(r.shield) hasShield=true;
      if(r.heal) hasHeal=true;
      if(r.poison) hasPoison=true;
    });
    var recos=[];
    if (hasFlying)        recos.push({clr:'#ffd966',txt:'🪽 Flying enemies — bring a 🏹 bow (or ✨ magic) to hit them.'});
    if (hasPhysImmune)    recos.push({clr:'#a335ee',txt:'👻 Physical-immune enemies — only ✨ magic can damage them.'});
    if (hasMagicImmune)   recos.push({clr:'#88ddff',txt:'✨ Magic-immune enemies — bring a ⚔ physical weapon.'});
    if (hasShield)        recos.push({clr:'#88ddff',txt:'🛡 Shielded enemies will block damage for a few turns at a time. Power-stack crits to break through.'});
    if (hasHeal)          recos.push({clr:'#5ac85a',txt:'💚 Healers — burst them down before they recover.'});
    if (hasPoison)        recos.push({clr:'#9b59b6',txt:'🧪 Poisoners — bring extra food, dodge gear helps.'});
    if (hasPhysResist&&!hasPhysImmune) recos.push({clr:'#88ddff',txt:'⚔ Some enemies resist physical damage (½). Magic hits them for full.'});
    if (hasMagicResist&&!hasMagicImmune) recos.push({clr:'#a335ee',txt:'✨ Some enemies resist magic damage (½). Physical hits them for full.'});
    if (recos.length){
      h+='<div style="background:#1c1710;border:1px solid #3a2c18;border-radius:4px;padding:10px;margin-bottom:10px;">';
      h+='<div style="color:#f0c040;font-size:11px;margin-bottom:6px;letter-spacing:1px;">TACTICAL BRIEFING</div>';
      recos.forEach(function(r){
        h+='<div style="color:'+r.clr+';font-size:10px;line-height:1.4;margin-bottom:3px;">'+r.txt+'</div>';
      });
      h+='</div>';
    }

    h+='<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:10px;margin-bottom:10px;"><div style="color:#8bc34a;font-size:11px;margin-bottom:6px;letter-spacing:1px;">POSSIBLE LOOT</div>';
    lootPool.forEach(function(l){
      h+='<div style="display:flex;justify-content:space-between;color:#9a7e50;font-size:10px;margin-bottom:2px;"><span>'+l.icon+' '+l.name+'</span><span>'+l.min+'-'+l.max+'</span></div>';
    });
    h+='<div style="border-top:1px solid #251e14;margin-top:6px;padding-top:6px;">';
    var claimed=(typeof G!=='undefined'&&G.dungeonRewards&&G.dungeonRewards[activeDungeon.id]);
    var rwdChance = (rwd.chance != null) ? rwd.chance : 50;
    var rwdRarityClr = '#f0c040';
    try { if(typeof window.RARITY==='object'&&window.getItemRarity) rwdRarityClr = window.RARITY[window.getItemRarity(rwd.id)].color; } catch(e){}
    var rwdOwned = (typeof G!=='undefined'&&G.inv&&G.inv[rwd.id]) ? G.inv[rwd.id] : 0;
    h+='<div style="display:flex;justify-content:space-between;color:'+rwdRarityClr+';font-size:10px;margin-bottom:2px;font-weight:700;"><span>'+rwd.icon+' '+rwd.name+(rwdOwned>0?' <span style="color:#5ac85a;font-weight:400;">×'+rwdOwned+'</span>':'')+'</span><span style="color:#88ddff;">💎 '+rwdChance+'%</span></div>';
    if(rwd.craftName){
      var craftOwnedEntry=(typeof G!=='undefined'&&G.inv&&G.inv[rwd.craftItem])?G.inv[rwd.craftItem]:0;
      h+='<div style="font-size:9px;color:#9a7e50;margin-bottom:2px;padding-left:6px;">⬌ Combine in skill tab \u2192 <span style="color:#f0c040;">'+rwd.craftIcon+' '+rwd.craftName+'</span>'+(rwd.craftEff?' <span style="color:#5a4830;">('+rwd.craftEff+')</span>':'')+(craftOwnedEntry>0?' <span style="color:#5ac85a;">×'+craftOwnedEntry+'</span>':'')+'</div>';
    }
    if(rwd.dropId){
      var dropRarityPalette={common:'#ffffff',uncommon:'#1eff00',rare:'#0070dd',epic:'#a335ee',legendary:'#ff8000'};
      var dropClr=dropRarityPalette[rwd.dropRarity||'uncommon']||'#1eff00';
      var dropOwnedEntry=(typeof G!=='undefined'&&G.inv&&G.inv[rwd.dropId])?G.inv[rwd.dropId]:0;
      var entryTier = activeDungeon.tier || 1;
      var entryTierLabel = entryTier<=4?'Tier 1 Gear':entryTier<=8?'Tier 2 Gear':'Tier 3 Gear';
      h+='<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;"><span style="color:'+dropClr+';">⚔ '+entryTierLabel+(dropOwnedEntry>0?' <span style="color:#5ac85a;font-weight:400;">×'+dropOwnedEntry+'</span>':'')+'</span><span style="color:#ffd966;">⚡ '+(rwd.dropChance||30)+'%</span></div>';
      if(rwd.dropEff) h+='<div style="font-size:9px;color:#5a4830;margin-bottom:2px;padding-left:6px;">'+rwd.dropEff+'</div>';
    }
    h+='<div style="display:flex;justify-content:space-between;color:#9b59b6;font-size:10px;"><span>🧪 Level Potion</span><span>2%</span></div>';
    h+='</div></div>';

    h+='<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:10px;margin-bottom:10px;"><div style="color:#f0c040;font-size:11px;margin-bottom:6px;letter-spacing:1px;">ENEMIES</div>';
    roomList.forEach(function(r){
      var tags=[];
      if (r.flying) tags.push('<span style="color:#ffd966">🪽</span>');
      if (r.shield) tags.push('<span style="color:#88ddff">🛡</span>');
      if (r.heal) tags.push('<span style="color:#5ac85a">💚</span>');
      if (r.poison) tags.push('<span style="color:#9b59b6">🧪</span>');
      if (r.immune==='magic') tags.push('<span style="color:#a335ee">✨ⓘ</span>');
      if (r.immune==='physical') tags.push('<span style="color:#88ddff">⚔ⓘ</span>');
      if (r.resist==='magic'&&r.immune!=='magic') tags.push('<span style="color:#a335ee">✨½</span>');
      if (r.resist==='physical'&&r.immune!=='physical') tags.push('<span style="color:#88ddff">⚔½</span>');
      var tagHtml = tags.length ? ' '+tags.join(' ') : '';
      h+='<div style="display:flex;justify-content:space-between;color:#9a7e50;font-size:10px;margin-bottom:2px;gap:6px;"><span>'+r.icon+' '+r.name+tagHtml+'</span><span>'+r.maxhp+'HP · '+r.dmg[0]+'-'+r.dmg[1]+'</span></div>';
    });
    h+='</div><div id="dg-msg" style="display:none;text-align:center;font-size:11px;margin-bottom:6px;"></div>';

    h+='<div style="display:flex;gap:8px;justify-content:center;">';
    if(check.ok) h+='<button onclick="window._dgStart(\''+activeDungeon.id+'\')" style="padding:9px 20px;background:#8B4513;border:2px solid #f0c040;color:#f0c040;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:13px;font-weight:bold;">⚔ Enter Dungeon</button>';
    else h+='<button disabled style="padding:9px 20px;background:#251e14;border:1px solid #3a2c18;color:#5a4830;border-radius:4px;font-family:Cinzel,serif;font-size:13px;cursor:not-allowed;">⚔ Not Ready</button>';
    h+='</div>';

    var bodyEl2=document.getElementById('dg-body');
    if(!bodyEl2){var nb2=document.createElement('div');nb2.id='dg-body';content.appendChild(nb2);bodyEl2=nb2;}
    bodyEl2.innerHTML=h;
    document.getElementById('dungeon-overlay').style.display='flex';
  }

  function initDungeon(){
    // Combat skill has been removed, so there is no longer a combat tab or page to hijack.
    if(typeof log==='function') setTimeout(function(){
      log('🏰 The <b>Dungeon</b> awaits! Smith a weapon and bring food — or brave it with bare fists.');
    },2000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(initDungeon,500);});
  else setTimeout(initDungeon,500);
})();
