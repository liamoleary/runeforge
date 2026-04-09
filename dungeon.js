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
    + '@keyframes dgFwTrail{0%{opacity:0;transform:translateY(40px) scale(0.6)}40%{opacity:1}100%{opacity:0;transform:translateY(-10px) scale(1)}}';
  document.head.appendChild(dgStyle);


  if(typeof ITEMS !== 'undefined'){
    if(!ITEMS.steel_axe) ITEMS.steel_axe = {name:'Steel Axe',icon:'🪓',sell:250,type:'weapon',atk:7};
    if(!ITEMS.enchanted_axe) ITEMS.enchanted_axe = {name:'Enchanted Grove Axe',icon:'🪓',sell:1200,type:'weapon',atk:12,special:true};
    if(!ITEMS.steel_pickaxe) ITEMS.steel_pickaxe = {name:'Steel Pickaxe',icon:'⛏️',sell:250,type:'tool'};
    if(!ITEMS.steel_rod) ITEMS.steel_rod = {name:'Steel Fishing Rod',icon:'🎣',sell:250,type:'tool'};
    if(!ITEMS.steel_skillet) ITEMS.steel_skillet = {name:'Steel Skillet',icon:'🍳',sell:250,type:'tool'};
    if(!ITEMS.steel_smith_hammer) ITEMS.steel_smith_hammer = {name:'Steel Smith Hammer',icon:'🔨',sell:250,type:'tool'};
    if(!ITEMS.steel_fletch_knife) ITEMS.steel_fletch_knife = {name:'Steel Fletching Knife',icon:'🔪',sell:250,type:'tool'};
    if(!ITEMS.steel_needle) ITEMS.steel_needle = {name:'Steel Needle',icon:'🪡',sell:250,type:'tool'};
    if(!ITEMS.apprentice_wand) ITEMS.apprentice_wand = {name:'Apprentice Wand',icon:'🪄',sell:250,type:'tool'};
    if(!ITEMS.steel_shield) ITEMS.steel_shield = {name:'Steel Shield',icon:'🛡️',sell:250,type:'armour',def:5};
  }

  var dungeonState = null;

  // Skill level required to unlock all dungeons.
  var DUNGEON_UNLOCK_LEVEL = 3;

  // Themed level-1 dungeon definitions, one per skill.
  var DUNGEONS = {
    woodcutting: {
      id:'woodcutting', name:'Enchanted Grove', icon:'🌳',
      desc:'Corrupted saplings have taken root deep in the forest.',
      flavour:'The trees stir with dark energy. 5 creatures await.',
      discovery:'Deep in the woods, your axe strikes uncover a hidden grove choked with twisted growth. Eyes blink in the gloom — something has been waiting.',
      rooms:[
        {name:'Twisted Sapling',icon:'🌱',hp:5,maxhp:5,dmg:[1,2],xp:15,weak:'magic',resist:'physical'},
        {name:'Thorny Sprout',icon:'🌿',hp:6,maxhp:6,dmg:[1,3],xp:18,weak:'physical',resist:null},
        {name:'Whipping Vine',icon:'🌾',hp:7,maxhp:7,dmg:[1,3],xp:20,weak:'magic',resist:'physical'},
        {name:'Fungal Sapling',icon:'🍄',hp:8,maxhp:8,dmg:[2,3],xp:25,weak:'physical',resist:'magic'},
        {name:'Ancient Seedling',icon:'🌲',hp:12,maxhp:12,dmg:[2,4],xp:40,weak:null,resist:null}
      ],
      reward:{id:'steel_axe',icon:'🪓',name:'Steel Axe',eff:'ATK +7'},
      rareReward:{id:'enchanted_axe',icon:'🪓',name:'Enchanted Grove Axe',eff:'ATK +12',chance:0.05},
      loot:[
        {id:'logs',name:'Logs',icon:'🪵',weight:30,min:2,max:5},
        {id:'oak_log',name:'Oak Logs',icon:'🪵',weight:22,min:1,max:3},
        {id:'willow_log',name:'Willow Logs',icon:'🪵',weight:12,min:1,max:2},
        {id:'arrow_shaft',name:'Arrow Shafts',icon:'↑',weight:25,min:3,max:8},
        {id:'feather',name:'Feathers',icon:'🪶',weight:20,min:2,max:6},
        {id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}
      ]
    },
    mining: {
      id:'mining', name:'Crumbling Mineshaft', icon:'⛏️',
      desc:'An old mineshaft has collapsed and stirred something within.',
      flavour:'Pickaxes echo in the dark. 5 creatures await.',
      discovery:'Your pickaxe punches through the rock and a draft of cold air rushes out. Beyond the breach, a forgotten mineshaft drops into the dark — and something is moving down there.',
      rooms:[
        {name:'Rock Crawler',icon:'🪨',hp:5,maxhp:5,dmg:[1,2],xp:15,weak:'magic',resist:'physical'},
        {name:'Coal Wisp',icon:'⚫',hp:6,maxhp:6,dmg:[1,3],xp:18,weak:'magic',resist:null},
        {name:'Cave Bat',icon:'🦇',hp:7,maxhp:7,dmg:[1,3],xp:20,weak:'physical',resist:null},
        {name:'Iron Maw',icon:'🟠',hp:8,maxhp:8,dmg:[2,3],xp:25,weak:'magic',resist:'physical'},
        {name:'Stone Warden',icon:'🗿',hp:12,maxhp:12,dmg:[2,4],xp:40,weak:null,resist:null}
      ],
      reward:{id:'steel_pickaxe',icon:'⛏️',name:'Steel Pickaxe',eff:'+20% Mining speed'},
      loot:[
        {id:'copper_ore',name:'Copper Ore',icon:'🟫',weight:30,min:2,max:5},
        {id:'tin_ore',name:'Tin Ore',icon:'⬜',weight:25,min:2,max:4},
        {id:'iron_ore',name:'Iron Ore',icon:'🔵',weight:18,min:1,max:3},
        {id:'coal',name:'Coal',icon:'🖤',weight:14,min:1,max:3},
        {id:'gold_ore',name:'Gold Ore',icon:'💛',weight:6,min:1,max:2},
        {id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}
      ]
    },
    fishing: {
      id:'fishing', name:'Sunken Reef', icon:'🐟',
      desc:'A drowned reef hides predators among its coral spires.',
      flavour:'Bubbles rise from the deep. 5 creatures await.',
      discovery:'Your line snags on something that pulls back. Hauling it in, you find a chunk of coral from a sunken reef no fisher has charted. The water beneath you suddenly feels much deeper.',
      rooms:[
        {name:'Reef Piranha',icon:'🐟',hp:5,maxhp:5,dmg:[1,2],xp:15,weak:'magic',resist:null},
        {name:'Stinging Jelly',icon:'🪼',hp:6,maxhp:6,dmg:[1,3],xp:18,weak:'physical',resist:'magic'},
        {name:'Snapping Crab',icon:'🦀',hp:7,maxhp:7,dmg:[1,3],xp:20,weak:'magic',resist:'physical'},
        {name:'Eel Spawn',icon:'🐍',hp:8,maxhp:8,dmg:[2,3],xp:25,weak:'physical',resist:null},
        {name:'Coral Tyrant',icon:'🪸',hp:12,maxhp:12,dmg:[2,4],xp:40,weak:null,resist:null}
      ],
      reward:{id:'steel_rod',icon:'🎣',name:'Steel Fishing Rod',eff:'+20% Fishing speed'},
      loot:[
        {id:'raw_shrimp',name:'Raw Shrimp',icon:'🦐',weight:30,min:2,max:5},
        {id:'raw_sardine',name:'Raw Sardine',icon:'🐟',weight:24,min:2,max:4},
        {id:'raw_trout',name:'Raw Trout',icon:'🐠',weight:14,min:1,max:3},
        {id:'raw_salmon',name:'Raw Salmon',icon:'🐡',weight:8,min:1,max:2},
        {id:'raw_lobster',name:'Raw Lobster',icon:'🦞',weight:5,min:1,max:1},
        {id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}
      ]
    },
    cooking: {
      id:'cooking', name:'Cursed Pantry', icon:'🍳',
      desc:'Animated pots and ravenous rats infest a forgotten kitchen.',
      flavour:'Something is bubbling. 5 creatures await.',
      discovery:'A pungent smell drifts out from the back of an abandoned inn. Following the trail of broken crockery, you find a pantry where something is still bubbling — and watching.',
      rooms:[
        {name:'Pantry Rat',icon:'🐀',hp:5,maxhp:5,dmg:[1,2],xp:15,weak:'physical',resist:null},
        {name:'Hungry Wisp',icon:'🍖',hp:6,maxhp:6,dmg:[1,3],xp:18,weak:'magic',resist:'physical'},
        {name:'Boiling Pot',icon:'🍲',hp:7,maxhp:7,dmg:[1,3],xp:20,weak:'physical',resist:'magic'},
        {name:'Spice Specter',icon:'🌶️',hp:8,maxhp:8,dmg:[2,3],xp:25,weak:'magic',resist:null},
        {name:'Ember Cook',icon:'🔥',hp:12,maxhp:12,dmg:[2,4],xp:40,weak:null,resist:null}
      ],
      reward:{id:'steel_skillet',icon:'🍳',name:'Steel Skillet',eff:'+20% Cooking speed'},
      loot:[
        {id:'raw_meat',name:'Raw Meat',icon:'🥩',weight:30,min:2,max:4},
        {id:'c_shrimp',name:'Shrimp',icon:'🍤',weight:22,min:2,max:4},
        {id:'c_sardine',name:'Sardine',icon:'🐟',weight:16,min:1,max:3},
        {id:'c_meat',name:'Cooked Meat',icon:'🍖',weight:10,min:1,max:2},
        {id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}
      ]
    },
    smithing: {
      id:'smithing', name:'Molten Forge', icon:'🔨',
      desc:'Slag golems shamble through an abandoned smithy.',
      flavour:'Heat shimmers off the anvils. 5 creatures await.',
      discovery:'A clanging echoes from the hills — anvils that should be silent. You trace the sound to a long-forgotten forge where the bellows still breathe with heat, and the slag is stirring.',
      rooms:[
        {name:'Slag Imp',icon:'🧌',hp:5,maxhp:5,dmg:[1,2],xp:15,weak:'magic',resist:'physical'},
        {name:'Anvil Spirit',icon:'⚒️',hp:6,maxhp:6,dmg:[1,3],xp:18,weak:'magic',resist:null},
        {name:'Cinder Hound',icon:'🐕',hp:7,maxhp:7,dmg:[1,3],xp:20,weak:'physical',resist:null},
        {name:'Bellows Beast',icon:'💨',hp:8,maxhp:8,dmg:[2,3],xp:25,weak:'physical',resist:'magic'},
        {name:'Forge Lord',icon:'🔥',hp:12,maxhp:12,dmg:[2,4],xp:40,weak:null,resist:null}
      ],
      reward:{id:'steel_smith_hammer',icon:'🔨',name:'Steel Smith Hammer',eff:'+20% Smithing speed'},
      loot:[
        {id:'copper_ore',name:'Copper Ore',icon:'🟫',weight:24,min:2,max:5},
        {id:'tin_ore',name:'Tin Ore',icon:'⬜',weight:22,min:2,max:4},
        {id:'iron_ore',name:'Iron Ore',icon:'🔵',weight:16,min:1,max:3},
        {id:'coal',name:'Coal',icon:'🖤',weight:14,min:1,max:3},
        {id:'bronze_bar',name:'Bronze Bar',icon:'🟫',weight:10,min:1,max:2},
        {id:'iron_bar',name:'Iron Bar',icon:'⬛',weight:5,min:1,max:1},
        {id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}
      ]
    },
    fletching: {
      id:'fletching', name:'Splinterwood Hollow', icon:'🏹',
      desc:'Vengeful tree spirits guard their fallen kin.',
      flavour:'Branches snap. 5 creatures await.',
      discovery:'A fletched arrow that isn\'t yours lies in the underbrush, still warm. Following its trajectory, you find a hollow tree gaping into a splintered hallow — and the wood remembers.',
      rooms:[
        {name:'Twig Sprite',icon:'🌿',hp:5,maxhp:5,dmg:[1,2],xp:15,weak:'physical',resist:null},
        {name:'Bark Knight',icon:'🪵',hp:6,maxhp:6,dmg:[1,3],xp:18,weak:'magic',resist:'physical'},
        {name:'Quill Hawk',icon:'🦅',hp:7,maxhp:7,dmg:[1,3],xp:20,weak:'physical',resist:null},
        {name:'Sharp Beak',icon:'🐦',hp:8,maxhp:8,dmg:[2,3],xp:25,weak:'magic',resist:null},
        {name:'Hollow Druid',icon:'🧙',hp:12,maxhp:12,dmg:[2,4],xp:40,weak:null,resist:null}
      ],
      reward:{id:'steel_fletch_knife',icon:'🔪',name:'Steel Fletching Knife',eff:'+20% Fletching speed'},
      loot:[
        {id:'arrow_shaft',name:'Arrow Shafts',icon:'↑',weight:30,min:4,max:10},
        {id:'feather',name:'Feathers',icon:'🪶',weight:28,min:3,max:8},
        {id:'oak_log',name:'Oak Logs',icon:'🪵',weight:18,min:1,max:3},
        {id:'iron_arrow',name:'Iron Arrows',icon:'🪃',weight:10,min:2,max:5},
        {id:'gold_coins',name:'Gold',icon:'🪙',weight:30,min:5,max:20}
      ]
    },
    crafting: {
      id:'crafting', name:"Spinner's Lair", icon:'🕸️',
      desc:'A web-choked tower hides skittering horrors.',
      flavour:'Silk drapes the walls. 5 creatures await.',
      discovery:'Threads of strange silk cling to your needle, finer than anything you\'ve woven. They lead away from your workbench, out the door, and up to a tower thick with webs.',
      rooms:[
        {name:'Silk Spider',icon:'🕷️',hp:5,maxhp:5,dmg:[1,2],xp:15,weak:'physical',resist:null},
        {name:'Tangle Weaver',icon:'🕸️',hp:6,maxhp:6,dmg:[1,3],xp:18,weak:'magic',resist:'physical'},
        {name:'Loom Spirit',icon:'🧵',hp:7,maxhp:7,dmg:[1,3],xp:20,weak:'magic',resist:null},
        {name:'Stitch Wraith',icon:'🪡',hp:8,maxhp:8,dmg:[2,3],xp:25,weak:'physical',resist:'magic'},
        {name:'Spinner Queen',icon:'👑',hp:12,maxhp:12,dmg:[2,4],xp:40,weak:null,resist:null}
      ],
      reward:{id:'steel_needle',icon:'🪡',name:'Steel Needle',eff:'+20% Crafting speed'},
      loot:[
        {id:'cowhide',name:'Cowhide',icon:'🐄',weight:26,min:2,max:5},
        {id:'leather',name:'Leather',icon:'📜',weight:18,min:1,max:3},
        {id:'feather',name:'Feathers',icon:'🪶',weight:20,min:2,max:6},
        {id:'arrow_shaft',name:'Arrow Shafts',icon:'↑',weight:14,min:2,max:5},
        {id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}
      ]
    },
    magic: {
      id:'magic', name:'Whispering Vault', icon:'✨',
      desc:'Animated tomes and wisps drift through an old archive.',
      flavour:'The air hums with arcane power. 5 creatures await.',
      discovery:'Your spells stir a current you didn\'t cast. Tracing it back to its source, you find a vault sealed for centuries, its doors humming open at your touch. Voices whisper from within.',
      rooms:[
        {name:'Wisp',icon:'✨',hp:5,maxhp:5,dmg:[1,2],xp:15,weak:'physical',resist:'magic'},
        {name:'Animated Tome',icon:'📖',hp:6,maxhp:6,dmg:[1,3],xp:18,weak:'physical',resist:null},
        {name:'Rune Spectre',icon:'🔯',hp:7,maxhp:7,dmg:[1,3],xp:20,weak:'physical',resist:'magic'},
        {name:'Mana Leech',icon:'💧',hp:8,maxhp:8,dmg:[2,3],xp:25,weak:'physical',resist:'magic'},
        {name:'Vault Keeper',icon:'🧙',hp:12,maxhp:12,dmg:[2,4],xp:40,weak:null,resist:null}
      ],
      reward:{id:'apprentice_wand',icon:'🪄',name:'Apprentice Wand',eff:'+20% Magic speed'},
      loot:[
        {id:'feather',name:'Feathers',icon:'🪶',weight:30,min:3,max:8},
        {id:'bones',name:'Bones',icon:'🦴',weight:25,min:2,max:5},
        {id:'arrow_shaft',name:'Arrow Shafts',icon:'↑',weight:18,min:2,max:5},
        {id:'gold_ore',name:'Gold Ore',icon:'💛',weight:6,min:1,max:1},
        {id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}
      ]
    },
  };

  // Currently active dungeon definition (defaults to woodcutting for legacy entry points)
  var activeDungeon = DUNGEONS.woodcutting;

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

  function getPlayerAtk(){
    // Combat skill is gone — attack comes purely from the equipped weapon.
    var b=1;
    if(typeof G!=='undefined'&&G.equip&&G.equip.weapon&&ITEMS[G.equip.weapon]) b+=ITEMS[G.equip.weapon].atk||0;
    return b;
  }

  function getPlayerDef(){
    var b=0;
    if(typeof G!=='undefined'&&G.equip&&G.equip.armour&&ITEMS[G.equip.armour]) b+=ITEMS[G.equip.armour].def||0;
    return b;
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
      monsters:srcRooms.map(function(r){return {name:r.name,icon:r.icon,hp:r.hp,maxhp:r.maxhp,dmg:r.dmg.slice(),xp:r.xp,weak:r.weak,resist:r.resist};}),
      combatLog:[],
      totalXp:0,
      totalGold:0,
      lootCollected:[],
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
    modal.innerHTML=
      '<div style="color:#f0c040;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;font-weight:700;">⚔ First Victory ⚔</div>'+
      '<div style="color:#e8d898;font-size:18px;margin-bottom:18px;">'+dungeon.name+'</div>'+
      '<div style="font-size:78px;line-height:1;margin-bottom:12px;display:inline-block;animation:dgRewardSpin 0.9s ease-out forwards,dgRewardGlow 2.2s ease-in-out 0.9s infinite;">'+reward.icon+'</div>'+
      '<div style="color:#f0c040;font-size:22px;font-weight:700;margin-bottom:4px;text-shadow:0 0 12px rgba(240,192,64,0.6);">'+reward.name+'</div>'+
      '<div style="color:#9a7e50;font-size:13px;margin-bottom:22px;font-family:Arial,sans-serif;">'+(reward.eff||'')+'</div>'+
      '<button id="dg-victory-claim" style="background:linear-gradient(180deg,#f0c040,#c08020);border:2px solid #f0c040;color:#0b0905;padding:11px 28px;font-family:Cinzel,serif;font-size:14px;font-weight:700;border-radius:6px;cursor:pointer;letter-spacing:1px;text-transform:uppercase;box-shadow:0 0 18px rgba(240,192,64,0.55);">Claim</button>';

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
    var dungeon=DUNGEONS[sk];
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

  function dungeonAttack(mode){
    if(!dungeonState||dungeonState.victory||dungeonState.fled) return;
    if(dungeonState.dying) return;
    var mon=dungeonState.monsters[dungeonState.room];
    if(!mon||mon.hp<=0) return;

    if(mode==='power'){
      dungeonState.critStacks=(dungeonState.critStacks||0)+1;
      var cChance=Math.min(90,dungeonState.critStacks*30);
      dungeonState.combatLog.push('<span style="color:#ffd966;">⚡ You focus energy! Crit chance: '+cChance+'% (stack: '+dungeonState.critStacks+')</span>');
      // Monster still attacks
      var hasArm2=G.equip&&G.equip.armour&&ITEMS[G.equip.armour];
      var blocked2=hasArm2&&Math.random()<0.18;
      if(blocked2){
        showDungeonHitFX('left','block');
        showDungeonDmgFloat(0,'miss','left');
        dungeonState.combatLog.push('<span style="color:#88ddff;">🛡 You block '+mon.icon+' '+mon.name+'\'s attack!</span>');
      } else {
      var mDmg2=rollDmg(mon.dmg[0],mon.dmg[1]),def2=getPlayerDef(),ad2=Math.max(1,mDmg2-Math.floor(def2*0.5));
      dungeonState.playerHp=Math.max(0,dungeonState.playerHp-ad2);showDungeonDmgFloat(ad2,'enemy-hit','left');showDungeonHitFX('left','hit');
      dungeonState.combatLog.push(mon.icon+' '+mon.name+' hits you for <span style="color:#e03030">'+ad2+'</span> damage.');
      if(dungeonState.playerHp<=0){
        dungeonState.combatLog.push('<span style="color:#e03030;font-weight:bold">You have been defeated! All dungeon loot is lost.</span>');
        dungeonState.lootCollected=[];
        dungeonState.totalGold=0;
        dungeonState.totalXp=0;
        G.hp=Math.max(1,Math.floor(G.maxhp*0.25));
        if(typeof save==='function') save();
        if(typeof updateUI==='function') updateUI();
      }
      }
      if(dungeonState&&dungeonState.playerHp>0) G.hp=dungeonState.playerHp;
      renderDungeon();
      return;
    }

    // Handle magic attack
    if(mode==='magic'){
      if(!G.inv||!G.inv.feather||(G.inv.feather||0)<1){showDungeonMessage('No feathers for magic!','#e03030');renderDungeon();return;}
      G.inv.feather--;if(G.inv.feather<=0)delete G.inv.feather;
      if(typeof addXP==='function')addXP('magic',5);
    }
    var pAtk=mode==='magic'?(typeof slvl==='function'?Math.floor(slvl('magic')*0.6)+2:3):getPlayerAtk();
    var pDmg=Math.max(1,rollDmg(1,pAtk));
    var isCrit=false;
    if(dungeonState.critStacks>0){
      var critChance=Math.min(0.9,dungeonState.critStacks*0.3);
      if(Math.random()<critChance){isCrit=true;pDmg=Math.floor(pDmg*2.5);dungeonState.combatLog.push('<span style="color:#ffd966;font-size:13px;">⚡ CRITICAL HIT!</span>');}
      else{dungeonState.combatLog.push('<span style="color:#9a7e50;">No crit ('+Math.round(critChance*100)+'% chance)</span>');}
      dungeonState.critStacks=0;
    }
    mon.hp=Math.max(0,mon.hp-pDmg);showDungeonDmgFloat(pDmg,isCrit?'crit':'hit','right');showDungeonHitFX('right',isCrit?'crit':'hit');
    var atkType=mode==='magic'?'magic':'physical';
    var effectiveness='';
    if(mon.weak===atkType){pDmg=Math.floor(pDmg*1.5);effectiveness='<span style="color:#5ac85a;font-size:9px;"> ✔ Super effective!</span>';}
    else if(mon.resist===atkType){pDmg=Math.max(1,Math.floor(pDmg*0.6));effectiveness='<span style="color:#e03030;font-size:9px;"> ✖ Resisted!</span>';}
    else{effectiveness='<span style="color:#9a7e50;font-size:9px;"> Normal</span>';}
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
        var rwd=activeDungeon.reward||{id:'gold_coins',name:'Gold',icon:'🪙',eff:''};
        var rare=activeDungeon.rareReward;
        if(typeof G!=='undefined'&&!G.dungeonRewards)G.dungeonRewards={};
        var firstClear=(typeof G!=='undefined')&&!G.dungeonRewards[activeDungeon.id];
        dungeonState.combatLog.push('<span style="color:#f0c040;font-weight:bold">The dungeon falls silent. You are victorious!</span>');
        if(firstClear){
          dungeonState.combatLog.push('<span style="color:#f0c040">First Victory! Reward: '+rwd.icon+' '+rwd.name+(rwd.eff?' ('+rwd.eff+')':'')+'</span>');
        } else {
          dungeonState.combatLog.push('<span style="color:#9a7e50">'+rwd.icon+' '+rwd.name+' already claimed.</span>');
        }

        var gotSpecial=rare?(Math.random()<(rare.chance||0.05)):false;
        if(gotSpecial) dungeonState.combatLog.push('<span style="color:#ff69b4;font-weight:bold">✨ RARE DROP! '+rare.icon+' '+rare.name+(rare.eff?' ('+rare.eff+')':'')+' ✨</span>');

        var gotLevelPotion=Math.random()<DG.levelPotionChance;
        if(gotLevelPotion) dungeonState.combatLog.push('<span style="color:#9b59b6;font-weight:bold">🧪 EXTREMELY RARE! Level Potion dropped!</span>');

        if(typeof G!=='undefined'){
          if(!G.inv) G.inv={};
          if(firstClear){
            G.inv[rwd.id]=(G.inv[rwd.id]||0)+1;
            G.dungeonRewards[activeDungeon.id]=true;
          }
          if(gotSpecial&&rare) G.inv[rare.id]=(G.inv[rare.id]||0)+1;
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
            var msg=rwd.icon+' <b>'+activeDungeon.name+' cleared!</b> '+(firstClear?rwd.name:'(reward already claimed)')+' + '+dungeonState.totalGold+' gold';
            if(gotSpecial&&rare) msg+=' + <span style="color:#ff69b4">✨ '+rare.name+'!</span>';
            if(gotLevelPotion) msg+=' + <span style="color:#9b59b6">🧪 Level Potion!</span>';
            log(msg+' + loot!');
          }
          // First-victory popup with fireworks
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
      // Monster hits back on normal attack
      var hasArm=G.equip&&G.equip.armour&&ITEMS[G.equip.armour];
      var blocked=hasArm&&Math.random()<0.18;
      if(blocked){
        showDungeonHitFX('left','block');
        showDungeonDmgFloat(0,'miss','left');
        dungeonState.combatLog.push('<span style="color:#88ddff;">🛡 You block '+mon.icon+' '+mon.name+'\'s attack!</span>');
      } else {
      var mDmg=rollDmg(mon.dmg[0],mon.dmg[1]),def=getPlayerDef(),ad=Math.max(1,mDmg-Math.floor(def*0.5));
      dungeonState.playerHp=Math.max(0,dungeonState.playerHp-ad);showDungeonDmgFloat(ad,'enemy-hit','left');showDungeonHitFX('left','hit');
      dungeonState.combatLog.push(mon.icon+' '+mon.name+' hits you for <span style="color:#e03030">'+ad+'</span> damage.');
      if(dungeonState.playerHp<=0){
        dungeonState.combatLog.push('<span style="color:#e03030;font-weight:bold">You have been defeated! All dungeon loot is lost.</span>');
        dungeonState.lootCollected=[];
        dungeonState.totalGold=0;
        dungeonState.totalXp=0;
        G.hp=Math.max(1,Math.floor(G.maxhp*0.25));
        if(typeof save==='function') save();
        if(typeof updateUI==='function') updateUI();
      }
      }
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
    dungeonState.playerHp=Math.min(dungeonState.playerMaxHp,dungeonState.playerHp+f.hp);showDungeonDmgFloat(healed,'heal','left');
    G.hp=dungeonState.playerHp;
    G.inv[f.id]--;
    if(G.inv[f.id]<=0) delete G.inv[f.id];
    dungeonState.combatLog.push('You eat '+f.icon+' '+f.name+' and heal <span style="color:#5ac85a">'+healed+'</span> HP. (No damage taken while eating)');
    // Eating does NOT trigger monster attack - just heals
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
    h+='<div style="text-align:center;margin-bottom:10px;"><div style="color:#f0c040;font-family:Cinzel,serif;font-size:16px;">'+activeDungeon.icon+' '+activeDungeon.name+'</div><div style="color:#9a7e50;font-size:11px;">Room '+(Math.min(s.room+1,s.monsters.length))+'/'+s.monsters.length+(s.totalGold>0?' | 🪙 '+s.totalGold+' gold':'')+'</div></div>';

    h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;">';
    h+='<div style="flex:1;text-align:center;"><div style="font-size:26px;">🧍</div><div style="color:#e8d898;font-size:12px;">You</div><div style="background:#1c1710;border:1px solid #3a2c18;border-radius:4px;height:10px;overflow:hidden;"><div style="height:100%;width:'+pHp+'%;background:'+(pHp>30?'#5ac85a':'#e03030')+';transition:width 0.3s;"></div></div><div style="color:#9a7e50;font-size:10px;">'+s.playerHp+'/'+s.playerMaxHp+' HP</div></div>';
    h+='<div style="color:#f0c040;font-size:16px;font-family:Cinzel,serif;">VS</div>';
    h+='<div style="flex:1;text-align:center;">';
    if(mon&&mon.hp>0) h+='<div style="font-size:26px;">'+mon.icon+'</div><div style="color:#e8d898;font-size:12px;">'+mon.name+'</div><div style="background:#1c1710;border:1px solid #3a2c18;border-radius:4px;height:10px;overflow:hidden;"><div style="height:100%;width:'+mHp+'%;background:#e03030;transition:width 0.3s;"></div></div><div style="color:#9a7e50;font-size:10px;">'+mon.hp+'/'+mon.maxhp+' HP</div>';
    else if(s.victory) h+='<div style="font-size:26px;">🪓</div><div style="color:#f0c040;font-size:12px;">Victory!</div>';
    else if(s.fled) h+='<div style="font-size:26px;">🏃</div><div style="color:#ffd966;font-size:12px;">Escaped!</div>';
    else h+='<div style="font-size:26px;">💀</div><div style="color:#e03030;font-size:12px;">Defeated</div>';
    h+='</div></div>';

    // Action buttons
    h+='<div style="display:flex;gap:4px;margin-bottom:10px;justify-content:center;flex-wrap:wrap;">';
    if(!done){
      var fc=getFoodCount();
      h+='<button onclick="window._dgAttack(\'slash\')" style="flex:1;max-width:80px;padding:6px;background:#8B4513;border:1px solid #f0c040;color:#f0c040;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;font-weight:bold;" title="Normal attack">⚔ Slash</button>';
      h+='<button onclick="window._dgAttack(\'power\')" style="flex:1;max-width:80px;padding:6px;background:'+(s.critStacks>0?'#4a3010':'#251e14')+';border:1px solid '+(s.critStacks>0?'#ffd966':'#3a2c18')+';color:'+(s.critStacks>0?'#ffd966':'#c08020')+';border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;" title="Stack crit chance (+30% per stack). You still take damage!">⚡ Power'+(s.critStacks>0?' ('+s.critStacks+')':'')+'</button>';
      h+='<button onclick="window._dgEat()" style="flex:1;max-width:80px;padding:6px;background:#251e14;border:1px solid #3a2c18;color:'+(fc>0?'#5ac85a':'#5a4830')+';border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;" title="Eat food to heal (no damage taken)">🍖 Eat('+fc+')</button>';
      var hasMagic=typeof G!=='undefined'&&typeof slvl==='function'&&slvl('magic')>=1&&G.inv&&(G.inv.feather||0)>0;
      if(hasMagic) h+='<button onclick="window._dgAttack(\'magic\')" style="flex:1;max-width:80px;padding:6px;background:#2a1540;border:1px solid #9b59b6;color:#bb77ee;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;" title="Cast spell (uses feathers)">✨ Magic</button>';
      h+='<button onclick="window._dgFlee()" style="flex:1;max-width:80px;padding:6px;background:#251e14;border:1px solid #3a2c18;color:#e03030;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;" title="Flee and keep collected loot">🏃 Flee</button>';
    } else {
      h+='<button onclick="window._dgLeave()" style="padding:8px 20px;background:#f0c040;border:none;color:#0b0905;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:13px;font-weight:bold;">'+(s.victory?'🪓 Claim & Leave':s.fled?'🏃 Leave':'Leave Dungeon')+'</button>';
    }
    h+='</div>';


    // Equipment stats
    if(!done){
      var wpnItem=(G.equip&&G.equip.weapon)?ITEMS[G.equip.weapon]:null;
      var armItem=(G.equip&&G.equip.armour)?ITEMS[G.equip.armour]:null;
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

    // Power charge indicator
    if(!done&&s.critStacks>0){
      var cc=Math.min(90,s.critStacks*30);
      h+='<div style="text-align:center;color:#ffd966;font-size:10px;margin-bottom:6px;">⚡ Crit stacks: '+s.critStacks+' ('+cc+'% crit chance). Stack more or slash!</div>';
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

  window._dgAttack=dungeonAttack;
  window._dgShowEntry=showDungeonEntry;
  window._dgEat=dungeonEat;
  window._dgFlee=dungeonFlee;
  window._dgLeave=leaveDungeon;
  window._dgStart=startDungeon;
  window._dgShowDiscovery=showDungeonDiscoveryPopup;
  window.DUNGEONS=DUNGEONS;
  window.DUNGEON_UNLOCK_LEVEL=DUNGEON_UNLOCK_LEVEL;

  function showDungeonEntry(dungeonId){
    if(dungeonId&&DUNGEONS[dungeonId])activeDungeon=DUNGEONS[dungeonId];
    createDungeonOverlay();
    var content=document.getElementById('dg-content');
    // Lock check: skill must reach DUNGEON_UNLOCK_LEVEL before the dungeon opens
    var skLvl=(typeof slvl==='function')?slvl(activeDungeon.id):0;
    if(skLvl<DUNGEON_UNLOCK_LEVEL){
      var skName2=(typeof SKILLS!=='undefined'&&SKILLS[activeDungeon.id])?SKILLS[activeDungeon.id].name:activeDungeon.id;
      var hLock='<div onclick="window._dgLeave()" style="position:absolute;top:8px;right:12px;color:#9a7e50;font-size:22px;cursor:pointer;z-index:10;line-height:1;">&times;</div>';
      hLock+='<div style="text-align:center;padding:20px 8px;">';
      hLock+='<div style="font-size:48px;margin-bottom:10px;filter:grayscale(1);opacity:0.5;">'+activeDungeon.icon+'</div>';
      hLock+='<div style="font-size:38px;margin-bottom:8px;">🔒</div>';
      hLock+='<div style="color:#f0c040;font-family:Cinzel,serif;font-size:16px;margin-bottom:6px;">Dungeon Locked</div>';
      hLock+='<div style="color:#9a7e50;font-size:12px;margin-bottom:14px;line-height:1.4;">Reach <b style="color:#e8d898;">Level '+DUNGEON_UNLOCK_LEVEL+'</b> in <b style="color:#e8d898;">'+skName2+'</b> to discover this dungeon.</div>';
      hLock+='<div style="color:#5a4830;font-size:10px;line-height:1.4;">Current: Lvl '+skLvl+' / '+DUNGEON_UNLOCK_LEVEL+'</div>';
      hLock+='</div>';
      var bodyL=document.getElementById('dg-body');
      if(!bodyL){var nbL=document.createElement('div');nbL.id='dg-body';content.appendChild(nbL);bodyL=nbL;}
      bodyL.innerHTML=hLock;
      document.getElementById('dungeon-overlay').style.display='flex';
      return;
    }
    var check=canEnterDungeon();
    var wpn=(G.equip&&G.equip.weapon)?ITEMS[G.equip.weapon]:null;
    var arm=(G.equip&&G.equip.armour)?ITEMS[G.equip.armour]:null;
    var fc=getFoodCount();
    var rwd=activeDungeon.reward||{};
    var rare=activeDungeon.rareReward;
    var lootPool=activeDungeon.loot||[];
    var roomList=activeDungeon.rooms||[];

    var h='<div onclick="window._dgLeave()" style="position:absolute;top:8px;right:12px;color:#9a7e50;font-size:22px;cursor:pointer;z-index:10;line-height:1;">&times;</div>';
    h+='<div style="text-align:center;"><div style="font-size:32px;margin-bottom:6px;">'+activeDungeon.icon+'</div><div style="color:#f0c040;font-size:18px;font-family:Cinzel,serif;margin-bottom:2px;">'+activeDungeon.name+'</div><div style="color:#9a7e50;font-size:11px;margin-bottom:12px;">Level 1 Dungeon • 5 Rooms</div></div>';
    h+='<div style="color:#e8d898;font-size:12px;margin-bottom:12px;line-height:1.5;text-align:center;">'+(activeDungeon.desc||'')+' Clear all <b>5 creatures</b> to claim the <span style="color:#f0c040;">'+rwd.icon+' '+rwd.name+'</span>.<br><span style="color:#9a7e50;font-size:10px;">⚔ Slash or ⚡ Power Attack! 🍖 Eating heals without taking damage. 🏃 Flee to keep loot.</span></div>';

    h+='<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:10px;margin-bottom:10px;">';
    h+='<div style="color:#f0c040;font-size:11px;margin-bottom:6px;letter-spacing:1px;">REQUIREMENTS</div>';
    h+='<div style="color:'+(wpn?'#5ac85a':'#e0a040')+';font-size:11px;margin-bottom:3px;">'+(wpn?'✓ Weapon equipped ('+wpn.icon+' '+wpn.name+')':'⚠ No weapon — fighting with fists (very weak)')+'</div>';
    h+='<div style="color:'+(fc>=DG.minFood?'#5ac85a':'#e03030')+';font-size:11px;margin-bottom:3px;">'+(fc>=DG.minFood?'✓':'✗')+' '+DG.minFood+'+ food (have: '+fc+')</div>';
    h+='<div style="color:#9a7e50;font-size:10px;margin-top:6px;">'+(arm?arm.icon+' '+arm.name:'No armour')+'</div>';
    h+='</div>';

    h+='<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:10px;margin-bottom:10px;"><div style="color:#8bc34a;font-size:11px;margin-bottom:6px;letter-spacing:1px;">POSSIBLE LOOT</div>';
    lootPool.forEach(function(l){
      h+='<div style="display:flex;justify-content:space-between;color:#9a7e50;font-size:10px;margin-bottom:2px;"><span>'+l.icon+' '+l.name+'</span><span>'+l.min+'-'+l.max+'</span></div>';
    });
    h+='<div style="border-top:1px solid #251e14;margin-top:6px;padding-top:6px;">';
    var claimed=(typeof G!=='undefined'&&G.dungeonRewards&&G.dungeonRewards[activeDungeon.id]);
    h+='<div style="display:flex;justify-content:space-between;color:'+(claimed?'#5a4830':'#f0c040')+';font-size:10px;margin-bottom:2px;"><span>'+rwd.icon+' '+rwd.name+(rwd.eff?' ('+rwd.eff+')':'')+'</span><span>'+(claimed?'✓ Claimed':'Guaranteed')+'</span></div>';
    if(rare) h+='<div style="display:flex;justify-content:space-between;color:#ff69b4;font-size:10px;margin-bottom:2px;"><span>✨ '+rare.name+(rare.eff?' ('+rare.eff+')':'')+'</span><span>'+Math.round((rare.chance||0.05)*100)+'%</span></div>';
    h+='<div style="display:flex;justify-content:space-between;color:#9b59b6;font-size:10px;"><span>🧪 Level Potion</span><span>2%</span></div>';
    h+='</div></div>';

    h+='<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:10px;margin-bottom:10px;"><div style="color:#f0c040;font-size:11px;margin-bottom:6px;letter-spacing:1px;">ENEMIES</div>';
    roomList.forEach(function(r){
      var weakStr=r.weak?(' | Weak: '+(r.weak==='magic'?'✨':'⚔')):'';var resistStr=r.resist?(' | Resist: '+(r.resist==='magic'?'✨':'⚔')):'';h+='<div style="display:flex;justify-content:space-between;color:#9a7e50;font-size:10px;margin-bottom:2px;"><span>'+r.icon+' '+r.name+'</span><span>'+r.maxhp+'HP | '+r.dmg[0]+'-'+r.dmg[1]+weakStr+resistStr+'</span></div>';
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
