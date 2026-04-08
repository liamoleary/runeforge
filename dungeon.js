(function(){
  if(typeof ITEMS !== 'undefined'){
    if(!ITEMS.steel_axe) ITEMS.steel_axe = {name:'Steel Axe',icon:'🪓',sell:250,type:'weapon',atk:7};
    if(!ITEMS.enchanted_axe) ITEMS.enchanted_axe = {name:'Enchanted Grove Axe',icon:'🪓',sell:1200,type:'weapon',atk:12,special:true};
  }

  var dungeonState = null;

  var GROVE_LOOT = [
    {id:'logs',name:'Logs',icon:'🪵',weight:30,min:2,max:5},
    {id:'oak_log',name:'Oak Logs',icon:'🪵',weight:22,min:1,max:3},
    {id:'willow_log',name:'Willow Logs',icon:'🪵',weight:12,min:1,max:2},
    {id:'arrow_shaft',name:'Arrow Shafts',icon:'↑',weight:25,min:3,max:8},
    {id:'feather',name:'Feathers',icon:'🪶',weight:20,min:2,max:6},
    {id:'gold_coins',name:'Gold',icon:'🪙',weight:35,min:5,max:20}
  ];

  var GROVE_TRINKETS = [
    {id:'grove_wc_trinket',weight:1}
  ];

  var DG = {
    rooms: [
      {name:'Twisted Sapling',icon:'🌱',hp:5,maxhp:5,dmg:[1,2],xp:15,weak:'magic',resist:'physical'},
      {name:'Thorny Sprout',icon:'🌿',hp:6,maxhp:6,dmg:[1,3],xp:18,weak:'physical',resist:null},
      {name:'Whipping Vine',icon:'🌾',hp:7,maxhp:7,dmg:[1,3],xp:20,weak:'magic',resist:'physical'},
      {name:'Fungal Sapling',icon:'🍄',hp:8,maxhp:8,dmg:[2,3],xp:25,weak:'physical',resist:'magic'},
      {name:'Ancient Seedling',icon:'🌲',hp:12,maxhp:12,dmg:[2,4],xp:40,weak:null,resist:null}
    ],
    minFood: 3,
    specialAxeChance: 0.05,
    levelPotionChance: 0.02,
    trinketChance: 0.08,
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
    var b=1;
    if(typeof G!=='undefined'&&typeof slvl==='function') b=Math.floor(slvl('combat')*0.4)+1;
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
    var drops=[],tw=0;
    GROVE_LOOT.forEach(function(l){tw+=l.weight;});
    var nd=Math.random()<0.4?2:1;
    for(var d=0;d<nd;d++){
      var r=Math.random()*tw,cu=0;
      for(var i=0;i<GROVE_LOOT.length;i++){
        cu+=GROVE_LOOT[i].weight;
        if(r<=cu){
          var l=GROVE_LOOT[i];
          drops.push({id:l.id,name:l.name,icon:l.icon,qty:rollDmg(l.min,l.max)});
          break;
        }
      }
    }
    return drops;
  }

  function canEnterDungeon(){
    if(typeof G==='undefined') return {ok:false,reason:'Game not loaded'};
    if(!G.equip||!G.equip.weapon) return {ok:false,reason:'Equip a weapon first!'};
    var f=getFoodCount();
    if(f<DG.minFood) return {ok:false,reason:'Bring at least '+DG.minFood+' food (you have '+f+')'};
    return {ok:true};
  }

  function startDungeon(){
    var check=canEnterDungeon();
    if(!check.ok){showDungeonMessage(check.reason,'#e03030');return;}
    if(typeof stopTask==='function') stopTask();
    dungeonState={
      room:0,
      playerHp:G.hp,
      playerMaxHp:G.maxhp,
      monsters:DG.rooms.map(function(r){return {name:r.name,icon:r.icon,hp:r.hp,maxhp:r.maxhp,dmg:r.dmg.slice(),xp:r.xp};}),
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
    dungeonState.combatLog.push('You enter the <b>Enchanted Grove</b>...');
    dungeonState.combatLog.push('The trees stir with dark energy. 5 creatures await.');
    renderDungeon();
  }

  // Background skilling tick for during dungeon
  function dungeonBgTick(){
    if(!dungeonState||!dungeonState.bgTaskSkill) return;
    // Not implemented as real-time yet - skills continue ticking via main loop
  }

  function dungeonAttack(mode){
    if(!dungeonState||dungeonState.victory||dungeonState.fled) return;
    var mon=dungeonState.monsters[dungeonState.room];
    if(!mon||mon.hp<=0) return;

    if(mode==='power'){
      dungeonState.critStacks=(dungeonState.critStacks||0)+1;
      var cChance=Math.min(90,dungeonState.critStacks*30);
      dungeonState.combatLog.push('<span style="color:#ffd966;">⚡ You focus energy! Crit chance: '+cChance+'% (stack: '+dungeonState.critStacks+')</span>');
      // Monster still attacks
      var mDmg2=rollDmg(mon.dmg[0],mon.dmg[1]),def2=getPlayerDef(),ad2=Math.max(1,mDmg2-Math.floor(def2*0.5));
      dungeonState.playerHp=Math.max(0,dungeonState.playerHp-ad2);
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
    mon.hp=Math.max(0,mon.hp-pDmg);
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
      dungeonState.combatLog.push(mon.icon+' '+mon.name+' defeated! (+'+xp+' XP)');
      if(typeof addXP==='function') addXP('combat',xp);

      // Room gold
      var roomGold=rollDmg(DG.goldPerRoom[0],DG.goldPerRoom[1]);
      dungeonState.totalGold+=roomGold;
      dungeonState.combatLog.push('<span style="color:#f0c040;">🪙 Found '+roomGold+' gold!</span>');

      var drops=rollLoot();
      drops.forEach(function(d){
        dungeonState.lootCollected.push(d);
        dungeonState.combatLog.push('<span style="color:#8bc34a;">Dropped: '+d.icon+' '+d.name+' x'+d.qty+'</span>');
      });

      dungeonState.room++;
      if(dungeonState.room>=dungeonState.monsters.length){
        dungeonState.victory=true;
        dungeonState.combatLog.push('<span style="color:#f0c040;font-weight:bold">The grove falls silent. You are victorious!</span>');
        dungeonState.combatLog.push('<span style="color:#f0c040">Reward: 🪓 Steel Axe (ATK +7)</span>');

        var gotSpecial=Math.random()<DG.specialAxeChance;
        if(gotSpecial) dungeonState.combatLog.push('<span style="color:#ff69b4;font-weight:bold">✨ RARE DROP! 🪓 Enchanted Grove Axe (ATK +12) ✨</span>');

        var gotLevelPotion=Math.random()<DG.levelPotionChance;
        if(gotLevelPotion) dungeonState.combatLog.push('<span style="color:#9b59b6;font-weight:bold">🧪 EXTREMELY RARE! Level Potion dropped!</span>');

        // Trinket drop
        var gotTrinket=Math.random()<DG.trinketChance;
        var trinketDrop=null;
        if(gotTrinket){
          var ti=Math.floor(Math.random()*GROVE_TRINKETS.length);
          trinketDrop=GROVE_TRINKETS[ti].id;
          var tInfo=typeof TRINKETS!=='undefined'?TRINKETS[trinketDrop]:null;
          if(tInfo) dungeonState.combatLog.push('<span style="color:#e67e22;font-weight:bold">💎 TRINKET DROP! '+tInfo.icon+' '+tInfo.name+' - '+tInfo.desc+'</span>');
        }

        if(typeof G!=='undefined'){
          if(!G.inv) G.inv={};
          G.inv.steel_axe=(G.inv.steel_axe||0)+1;
          if(gotSpecial) G.inv.enchanted_axe=(G.inv.enchanted_axe||0)+1;
          if(gotLevelPotion) G.inv.level_potion=(G.inv.level_potion||0)+1;
          if(trinketDrop) G.inv[trinketDrop]=(G.inv[trinketDrop]||0)+1;
          G.gold=(G.gold||0)+dungeonState.totalGold;
          dungeonState.lootCollected.forEach(function(d){
            if(d.id==='gold_coins'){G.gold=(G.gold||0)+d.qty;}
            else{G.inv[d.id]=(G.inv[d.id]||0)+d.qty;}
          });
          if(typeof save==='function') save();
          if(typeof updateUI==='function') updateUI();
          if(typeof renderInv==='function') renderInv();
          if(typeof log==='function'){
            var msg='🪓 <b>Dungeon cleared!</b> Steel Axe + '+dungeonState.totalGold+' gold';
            if(gotSpecial) msg+=' + <span style="color:#ff69b4">✨ Enchanted Grove Axe!</span>';
            if(gotLevelPotion) msg+=' + <span style="color:#9b59b6">🧪 Level Potion!</span>';
            if(trinketDrop) msg+=' + Trinket!';
            log(msg+' + loot!');
          }
        }
      } else {
        var next=dungeonState.monsters[dungeonState.room];
        dungeonState.combatLog.push('A '+next.icon+' <b>'+next.name+'</b> appears! (Room '+(dungeonState.room+1)+'/5)');
      }
    } else {
      // Monster hits back on normal attack
      var mDmg=rollDmg(mon.dmg[0],mon.dmg[1]),def=getPlayerDef(),ad=Math.max(1,mDmg-Math.floor(def*0.5));
      dungeonState.playerHp=Math.max(0,dungeonState.playerHp-ad);
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
    if(dungeonState&&!dungeonState.victory&&dungeonState.playerHp>0) G.hp=dungeonState.playerHp;
    renderDungeon();
  }

  function dungeonEat(){
    if(!dungeonState||dungeonState.victory||dungeonState.fled||dungeonState.playerHp<=0) return;
    var foods=getFoodList();
    if(foods.length===0){showDungeonMessage('No food left!','#e03030');return;}
    var f=foods[0],healed=Math.min(f.hp,dungeonState.playerMaxHp-dungeonState.playerHp);
    if(healed<=0){showDungeonMessage('Already at full HP!','#ffd966');return;}
    dungeonState.playerHp=Math.min(dungeonState.playerMaxHp,dungeonState.playerHp+f.hp);
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
    h+='<div style="text-align:center;margin-bottom:10px;"><div style="color:#f0c040;font-family:Cinzel,serif;font-size:16px;">Enchanted Grove</div><div style="color:#9a7e50;font-size:11px;">Room '+(Math.min(s.room+1,s.monsters.length))+'/'+s.monsters.length+(s.totalGold>0?' | 🪙 '+s.totalGold+' gold':'')+'</div></div>';

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

    content.innerHTML=h;
    var logEl=document.getElementById('dg-log');
    if(logEl) logEl.scrollTop=logEl.scrollHeight;
  }

  function createDungeonOverlay(){
    if(document.getElementById('dungeon-overlay')) return;
    var ov=document.createElement('div');
    ov.id='dungeon-overlay';
    ov.style.cssText='display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9998;justify-content:center;align-items:center;padding:12px;box-sizing:border-box;';
    ov.innerHTML='<div id="dg-content" style="position:relative;background:#13100a;border:2px solid #3a2c18;border-radius:8px;padding:16px;width:360px;max-width:95vw;max-height:90vh;overflow-y:auto;font-family:Cinzel,serif;"></div>';
    ov.addEventListener('click',function(e){if(e.target===ov) leaveDungeon();});
    document.body.appendChild(ov);
  }

  window._dgAttack=dungeonAttack;
  window._dgShowEntry=showDungeonEntry;
  window._dgEat=dungeonEat;
  window._dgFlee=dungeonFlee;
  window._dgLeave=leaveDungeon;
  window._dgStart=startDungeon;

  function showDungeonEntry(){
    createDungeonOverlay();
    var content=document.getElementById('dg-content');
    var check=canEnterDungeon();
    var cLvl=typeof slvl==='function'?slvl('combat'):0;
    var wpn=(G.equip&&G.equip.weapon)?ITEMS[G.equip.weapon]:null;
    var arm=(G.equip&&G.equip.armour)?ITEMS[G.equip.armour]:null;
    var fc=getFoodCount();

    var h='<div onclick="window._dgLeave()" style="position:absolute;top:8px;right:12px;color:#9a7e50;font-size:22px;cursor:pointer;z-index:10;line-height:1;">&times;</div>';
    h+='<div style="text-align:center;"><div style="font-size:32px;margin-bottom:6px;">🏰</div><div style="color:#f0c040;font-size:18px;font-family:Cinzel,serif;margin-bottom:2px;">Enchanted Grove</div><div style="color:#9a7e50;font-size:11px;margin-bottom:12px;">Level 1 Dungeon • 5 Rooms</div></div>';
    h+='<div style="color:#e8d898;font-size:12px;margin-bottom:12px;line-height:1.5;text-align:center;">Corrupted saplings have taken root deep in the forest. Clear all <b>5 creatures</b> to claim the <span style="color:#f0c040;">🪓 Steel Axe</span>.<br><span style="color:#9a7e50;font-size:10px;">⚔ Slash or ⚡ Power Attack! 🍖 Eating heals without taking damage. 🏃 Flee to keep loot.</span></div>';

    h+='<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:10px;margin-bottom:10px;">';
    h+='<div style="color:#f0c040;font-size:11px;margin-bottom:6px;letter-spacing:1px;">REQUIREMENTS</div>';
    h+='<div style="color:'+(wpn?'#5ac85a':'#e03030')+';font-size:11px;margin-bottom:3px;">'+(wpn?'✓':'✗')+' Weapon equipped'+(wpn?' ('+wpn.icon+' '+wpn.name+')':'')+'</div>';
    h+='<div style="color:'+(fc>=DG.minFood?'#5ac85a':'#e03030')+';font-size:11px;margin-bottom:3px;">'+(fc>=DG.minFood?'✓':'✗')+' '+DG.minFood+'+ food (have: '+fc+')</div>';
    if(cLvl>0) h+='<div style="color:#9a7e50;font-size:10px;margin-top:6px;">Combat Level: '+cLvl+' '+(arm?'| '+arm.icon+' '+arm.name:'| No armour')+'</div>';
    h+='</div>';

    h+='<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:10px;margin-bottom:10px;"><div style="color:#8bc34a;font-size:11px;margin-bottom:6px;letter-spacing:1px;">POSSIBLE LOOT</div>';
    GROVE_LOOT.forEach(function(l){
      h+='<div style="display:flex;justify-content:space-between;color:#9a7e50;font-size:10px;margin-bottom:2px;"><span>'+l.icon+' '+l.name+'</span><span>'+l.min+'-'+l.max+'</span></div>';
    });
    h+='<div style="border-top:1px solid #251e14;margin-top:6px;padding-top:6px;">';
    h+='<div style="display:flex;justify-content:space-between;color:#f0c040;font-size:10px;margin-bottom:2px;"><span>🪓 Steel Axe (ATK +7)</span><span>Guaranteed</span></div>';
    h+='<div style="display:flex;justify-content:space-between;color:#ff69b4;font-size:10px;margin-bottom:2px;"><span>✨ Enchanted Grove Axe (ATK +12)</span><span>5%</span></div>';
    h+='<div style="display:flex;justify-content:space-between;color:#9b59b6;font-size:10px;margin-bottom:2px;"><span>🧪 Level Potion</span><span>2%</span></div>';
    h+='<div style="display:flex;justify-content:space-between;color:#e67e22;font-size:10px;"><span>💎 Skill Trinket</span><span>8%</span></div>';
    h+='</div></div>';

    h+='<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:10px;margin-bottom:10px;"><div style="color:#f0c040;font-size:11px;margin-bottom:6px;letter-spacing:1px;">ENEMIES</div>';
    DG.rooms.forEach(function(r){
      var weakStr=r.weak?(' | Weak: '+(r.weak==='magic'?'✨':'⚔')):'';var resistStr=r.resist?(' | Resist: '+(r.resist==='magic'?'✨':'⚔')):'';h+='<div style="display:flex;justify-content:space-between;color:#9a7e50;font-size:10px;margin-bottom:2px;"><span>'+r.icon+' '+r.name+'</span><span>'+r.maxhp+'HP | '+r.dmg[0]+'-'+r.dmg[1]+weakStr+resistStr+'</span></div>';
    });
    h+='</div><div id="dg-msg" style="display:none;text-align:center;font-size:11px;margin-bottom:6px;"></div>';

    h+='<div style="display:flex;gap:8px;justify-content:center;">';
    if(check.ok) h+='<button onclick="window._dgStart()" style="padding:9px 20px;background:#8B4513;border:2px solid #f0c040;color:#f0c040;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:13px;font-weight:bold;">⚔ Enter Dungeon</button>';
    else h+='<button disabled style="padding:9px 20px;background:#251e14;border:1px solid #3a2c18;color:#5a4830;border-radius:4px;font-family:Cinzel,serif;font-size:13px;cursor:not-allowed;">⚔ Not Ready</button>';
    h+='</div>';

    content.innerHTML=h;
    document.getElementById('dungeon-overlay').style.display='flex';
  }

  function replaceCombatTab(){
    var ct=document.getElementById('tab-combat');
    if(ct){
      ct.id='tab-dungeon';
      ct.innerHTML='<div style="font-size:14px;color:#f0c040;font-weight:bold;">🏰 DUNGEON</div>';
      ct.style.cssText='cursor:pointer;text-align:center;padding:8px 12px;min-width:80px;background:linear-gradient(180deg,#2a1f0f,#1a1308);border:1px solid #f0c040;border-radius:4px;margin:0 2px;';
      ct.onclick=function(e){e.stopPropagation();showDungeonEntry();};
      ct.removeAttribute('data-tab');
    }
    var cp=document.getElementById('page-combat');
    if(cp){cp.style.display='none';cp.innerHTML='';}
    var dupes=document.querySelectorAll('#tab-dungeon');
    if(dupes.length>1) for(var i=1;i<dupes.length;i++) dupes[i].parentNode.removeChild(dupes[i]);
  }

  function initDungeon(){
    replaceCombatTab();
    if(typeof log==='function') setTimeout(function(){
      log('🏰 The <b>Dungeon</b> awaits! Equip your Bronze Sword and bring food!');
    },2000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(initDungeon,500);});
  else setTimeout(initDungeon,500);
})();
