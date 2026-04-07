(function(){
  // === DUNGEON SYSTEM ===
 // Adds a dungeon button + full dungeon crawl UI

 // Register the Steel Axe reward item
 if(typeof ITEMS !== 'undefined' && !ITEMS.steel_axe){
     ITEMS.steel_axe = {name:'Steel Axe',icon:'\u{1FA93}',sell:250,type:'weapon',atk:7};
 }

 var dungeonState = null; // null = not in dungeon
 var DG = {
     rooms: [
       {name:'Twisted Sapling',icon:'\uD83C\uDF31',hp:5,maxhp:5,dmg:[1,2],xp:15},
       {name:'Thorny Sprout',icon:'\uD83C\uDF3F',hp:6,maxhp:6,dmg:[1,3],xp:18},
       {name:'Whipping Vine',icon:'\uD83C\uDF3E',hp:7,maxhp:7,dmg:[1,3],xp:20},
       {name:'Fungal Sapling',icon:'\uD83C\uDF44',hp:8,maxhp:8,dmg:[2,3],xp:25},
       {name:'Ancient Seedling',icon:'\uD83C\uDF32',hp:12,maxhp:12,dmg:[2,4],xp:40}
         ],
     minCombatLvl: 5,
     minFood: 3,
     rewardGiven: false
 };

 function getFoodCount(){
     var count = 0;
     if(typeof G === 'undefined') return 0;
     var inv = G.inv || {};
     for(var k in inv){
           if(ITEMS[k] && ITEMS[k].type === 'food' && inv[k] > 0) count += inv[k];
     }
     return count;
 }

 function getFoodList(){
     var foods = [];
     if(typeof G === 'undefined') return foods;
     var inv = G.inv || {};
     for(var k in inv){
           if(ITEMS[k] && ITEMS[k].type === 'food' && inv[k] > 0){
                   foods.push({id:k, name:ITEMS[k].name, icon:ITEMS[k].icon, hp:ITEMS[k].hp, qty:inv[k]});
           }
     }
     return foods;
 }

 function getPlayerAtk(){
     var base = 1;
     if(typeof G !== 'undefined' && typeof lvlOf === 'function'){
           base = Math.floor(lvlOf('combat') * 0.4) + 1;
     }
     if(typeof G !== 'undefined' && G.equip && G.equip.weapon && ITEMS[G.equip.weapon]){
           base += ITEMS[G.equip.weapon].atk || 0;
     }
     if(typeof G !== 'undefined' && G.upgrades && G.upgrades.pot_atk) base += 2;
     return base;
 }

 function getPlayerDef(){
     var base = 0;
     if(typeof G !== 'undefined' && G.equip && G.equip.armour && ITEMS[G.equip.armour]){
           base += ITEMS[G.equip.armour].def || 0;
     }
     return base;
 }

 function rollDmg(min, max){
     return Math.floor(Math.random() * (max - min + 1)) + min;
 }

 function canEnterDungeon(){
     if(typeof G === 'undefined') return {ok:false,reason:'Game not loaded'};
     if(typeof lvlOf !== 'function') return {ok:false,reason:'Game not loaded'};
     var combatLvl = lvlOf('combat');
     if(combatLvl < DG.minCombatLvl) return {ok:false,reason:'Need Combat level '+DG.minCombatLvl+' (you are '+combatLvl+')'};
     if(!G.equip || !G.equip.weapon) return {ok:false,reason:'Equip a weapon first!'};
     var food = getFoodCount();
     if(food < DG.minFood) return {ok:false,reason:'Bring at least '+DG.minFood+' food (you have '+food+')'};
     return {ok:true};
 }

 function startDungeon(){
     var check = canEnterDungeon();
     if(!check.ok){
           showDungeonMessage(check.reason, '#e03030');
           return;
     }
     // Stop any active task
    if(typeof stopTask === 'function') stopTask();

    dungeonState = {
          room: 0,
          playerHp: G.hp,
          playerMaxHp: G.maxhp,
          monsters: DG.rooms.map(function(r){return {name:r.name,icon:r.icon,hp:r.hp,maxhp:r.maxhp,dmg:r.dmg.slice(),xp:r.xp};}),
          combatLog: [],
          totalXp: 0,
          victory: false
    };
     dungeonState.combatLog.push('You enter the <b>Enchanted Grove</b>...');
     dungeonState.combatLog.push('The trees stir with dark energy. 5 creatures await.');
     renderDungeon();
 }

 function dungeonAttack(){
     if(!dungeonState || dungeonState.victory) return;
     var mon = dungeonState.monsters[dungeonState.room];
     if(!mon || mon.hp <= 0) return;

    // Player attacks monster
    var pAtk = getPlayerAtk();
     var pDmg = Math.max(1, rollDmg(1, pAtk));
     mon.hp = Math.max(0, mon.hp - pDmg);
     dungeonState.combatLog.push('You hit '+mon.icon+' '+mon.name+' for <span style="color:#5ac85a">'+pDmg+'</span> damage.');

    if(mon.hp <= 0){
          // Monster killed
       var xp = mon.xp;
          dungeonState.totalXp += xp;
          dungeonState.combatLog.push(mon.icon+' '+mon.name+' is defeated! (+'+xp+' combat XP)');
          if(typeof addXP === 'function') addXP('combat', xp);

       // Next room
       dungeonState.room++;
          if(dungeonState.room >= dungeonState.monsters.length){
                  // Victory!
            dungeonState.victory = true;
                  dungeonState.combatLog.push('<span style="color:#f0c040;font-weight:bold">The grove falls silent. You are victorious!</span>');
                  dungeonState.combatLog.push('<span style="color:#f0c040">Reward: \u{1FA93} Steel Axe (ATK +7)</span>');
                  // Give reward
            if(typeof ITEMS !== 'undefined' && typeof G !== 'undefined'){
                      if(!G.inv) G.inv = {};
                      G.inv.steel_axe = (G.inv.steel_axe || 0) + 1;
                      DG.rewardGiven = true;
                      if(typeof save === 'function') save();
                      if(typeof updateUI === 'function') updateUI();
                      if(typeof renderInv === 'function') renderInv();
                      if(typeof log === 'function') log('\u{1FA93} <b>Dungeon cleared!</b> You received a Steel Axe!');
            }
          } else {
                  var next = dungeonState.monsters[dungeonState.room];
                  dungeonState.combatLog.push('A '+next.icon+' <b>'+next.name+'</b> appears! (Room '+(dungeonState.room+1)+'/5)');
          }
    } else {
          // Monster attacks player
       var mDmg = rollDmg(mon.dmg[0], mon.dmg[1]);
          var def = getPlayerDef();
          var actualDmg = Math.max(1, mDmg - Math.floor(def * 0.5));
          dungeonState.playerHp = Math.max(0, dungeonState.playerHp - actualDmg);
          dungeonState.combatLog.push(mon.icon+' '+mon.name+' hits you for <span style="color:#e03030">'+actualDmg+'</span> damage.');

       if(dungeonState.playerHp <= 0){
               // Player died
            dungeonState.combatLog.push('<span style="color:#e03030;font-weight:bold">You have been defeated! The grove consumes you...</span>');
               dungeonState.combatLog.push('You stumble out wounded. Your food spoils in the magical air.');
               G.hp = Math.max(1, Math.floor(G.maxhp * 0.25));
               if(typeof save === 'function') save();
               if(typeof updateUI === 'function') updateUI();
       }
    }

    // Sync HP back to game
    if(dungeonState && !dungeonState.victory && dungeonState.playerHp > 0){
          G.hp = dungeonState.playerHp;
    }

    renderDungeon();
 }

 function dungeonEat(){
     if(!dungeonState || dungeonState.victory || dungeonState.playerHp <= 0) return;
     var foods = getFoodList();
     if(foods.length === 0){
           showDungeonMessage('No food left!', '#e03030');
           return;
     }
     // Eat the first available food
    var f = foods[0];
     var healed = Math.min(f.hp, dungeonState.playerMaxHp - dungeonState.playerHp);
     if(healed <= 0){
           showDungeonMessage('Already at full HP!', '#ffd966');
           return;
     }
     dungeonState.playerHp = Math.min(dungeonState.playerMaxHp, dungeonState.playerHp + f.hp);
     G.hp = dungeonState.playerHp;
     // Remove from inventory
    G.inv[f.id]--;
     if(G.inv[f.id] <= 0) delete G.inv[f.id];
     dungeonState.combatLog.push('You eat '+f.icon+' '+f.name+' and heal <span style="color:#5ac85a">'+healed+'</span> HP.');

    // Monster still attacks after eating
    var mon = dungeonState.monsters[dungeonState.room];
     if(mon && mon.hp > 0){
           var mDmg = rollDmg(mon.dmg[0], mon.dmg[1]);
           var def = getPlayerDef();
           var actualDmg = Math.max(1, mDmg - Math.floor(def * 0.5));
           dungeonState.playerHp = Math.max(0, dungeonState.playerHp - actualDmg);
           G.hp = dungeonState.playerHp;
           dungeonState.combatLog.push(mon.icon+' '+mon.name+' hits you for <span style="color:#e03030">'+actualDmg+'</span> damage.');
           if(dungeonState.playerHp <= 0){
                   dungeonState.combatLog.push('<span style="color:#e03030;font-weight:bold">You have been defeated!</span>');
                   G.hp = Math.max(1, Math.floor(G.maxhp * 0.25));
                   if(typeof save === 'function') save();
                   if(typeof updateUI === 'function') updateUI();
           }
     }
     renderDungeon();
 }

 function leaveDungeon(){
     dungeonState = null;
     var overlay = document.getElementById('dungeon-overlay');
     if(overlay) overlay.style.display = 'none';
     if(typeof updateUI === 'function') updateUI();
 }

 function showDungeonMessage(msg, color){
     var el = document.getElementById('dg-msg');
     if(!el) return;
     el.textContent = msg;
     el.style.color = color || '#ffd966';
     el.style.display = 'block';
     setTimeout(function(){ el.style.display = 'none'; }, 2500);
 }

 function renderDungeon(){
     var overlay = document.getElementById('dungeon-overlay');
     if(!overlay) createDungeonOverlay();
     overlay = document.getElementById('dungeon-overlay');
     overlay.style.display = 'flex';

    var content = document.getElementById('dg-content');
     if(!dungeonState){ overlay.style.display = 'none'; return; }

    var s = dungeonState;
     var mon = s.room < s.monsters.length ? s.monsters[s.room] : null;
     var alive = s.playerHp > 0;
     var done = s.victory || !alive;

    // Build HP bars
    var pHpPct = Math.max(0, (s.playerHp / s.playerMaxHp) * 100);
     var mHpPct = mon ? Math.max(0, (mon.hp / mon.maxhp) * 100) : 0;

    var html = '<div style="text-align:center;margin-bottom:12px;">';
     html += '<div style="color:#f0c040;font-family:Cinzel,serif;font-size:16px;margin-bottom:4px;">Enchanted Grove</div>';
     html += '<div style="color:#9a7e50;font-size:12px;">Room '+(Math.min(s.room+1, s.monsters.length))+' / '+s.monsters.length+'</div>';
     html += '</div>';

    // Combat area
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;">';

    // Player side
    html += '<div style="flex:1;text-align:center;">';
     html += '<div style="font-size:28px;">\uD83E\uDDCD</div>';
     html += '<div style="color:#e8d898;font-size:13px;margin:4px 0;">You</div>';
     html += '<div style="background:#1c1710;border:1px solid #3a2c18;border-radius:4px;height:12px;overflow:hidden;">';
     html += '<div style="height:100%;width:'+pHpPct+'%;background:'+(pHpPct > 30 ? '#5ac85a' : '#e03030')+';transition:width 0.3s;"></div>';
     html += '</div>';
     html += '<div style="color:#9a7e50;font-size:11px;">'+s.playerHp+' / '+s.playerMaxHp+' HP</div>';
     html += '<div style="color:#9a7e50;font-size:10px;">ATK: '+getPlayerAtk()+' | DEF: '+getPlayerDef()+'</div>';
     html += '</div>';

    // VS
    html += '<div style="color:#f0c040;font-size:18px;font-family:Cinzel,serif;">VS</div>';

    // Monster side
    html += '<div style="flex:1;text-align:center;">';
     if(mon && mon.hp > 0){
           html += '<div style="font-size:28px;">'+mon.icon+'</div>';
           html += '<div style="color:#e8d898;font-size:13px;margin:4px 0;">'+mon.name+'</div>';
           html += '<div style="background:#1c1710;border:1px solid #3a2c18;border-radius:4px;height:12px;overflow:hidden;">';
           html += '<div style="height:100%;width:'+mHpPct+'%;background:#e03030;transition:width 0.3s;"></div>';
           html += '</div>';
           html += '<div style="color:#9a7e50;font-size:11px;">'+mon.hp+' / '+mon.maxhp+' HP</div>';
           html += '<div style="color:#9a7e50;font-size:10px;">DMG: '+mon.dmg[0]+'-'+mon.dmg[1]+'</div>';
     } else if(s.victory){
           html += '<div style="font-size:28px;">\u{1FA93}</div>';
           html += '<div style="color:#f0c040;font-size:13px;">Victory!</div>';
     } else {
           html += '<div style="font-size:28px;">\uD83D\uDC80</div>';
           html += '<div style="color:#e03030;font-size:13px;">Defeated</div>';
     }
     html += '</div>';
     html += '</div>';

    // Action buttons
    html += '<div style="display:flex;gap:8px;margin-bottom:12px;justify-content:center;">';
     if(!done){
           html += '<button onclick="window._dgAttack()" style="flex:1;max-width:120px;padding:8px;background:#8B4513;border:1px solid #f0c040;color:#f0c040;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:13px;font-weight:bold;">\u2694 Attack</button>';
           var foodCount = getFoodCount();
           html += '<button onclick="window._dgEat()" style="flex:1;max-width:120px;padding:8px;background:#251e14;border:1px solid #3a2c18;color:'+(foodCount > 0 ? '#5ac85a' : '#5a4830')+';border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:13px;">\uD83C\uDF56 Eat ('+foodCount+')</button>';
           html += '<button onclick="window._dgFlee()" style="flex:1;max-width:120px;padding:8px;background:#251e14;border:1px solid #3a2c18;color:#e03030;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:13px;">\uD83C\uDFC3 Flee</button>';
     } else {
           html += '<button onclick="window._dgLeave()" style="padding:10px 24px;background:#f0c040;border:none;color:#0b0905;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:14px;font-weight:bold;">'+(s.victory ? '\u{1FA93} Claim & Leave' : 'Leave Dungeon')+'</button>';
     }
     html += '</div>';

    // Combat log
    html += '<div style="background:#0b0905;border:1px solid #251e14;border-radius:4px;padding:8px;max-height:140px;overflow-y:auto;font-size:12px;line-height:1.6;" id="dg-log">';
     var logStart = Math.max(0, s.combatLog.length - 8);
     for(var i = logStart; i < s.combatLog.length; i++){
           html += '<div style="color:#9a7e50;">'+s.combatLog[i]+'</div>';
     }
     html += '</div>';

    content.innerHTML = html;
     // Scroll log to bottom
    var logEl = document.getElementById('dg-log');
     if(logEl) logEl.scrollTop = logEl.scrollHeight;
 }

 function createDungeonOverlay(){
     if(document.getElementById('dungeon-overlay')) return;
     var ov = document.createElement('div');
     ov.id = 'dungeon-overlay';
     ov.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9998;justify-content:center;align-items:center;padding:16px;box-sizing:border-box;';
     ov.innerHTML = '<div id="dg-content" style="background:#13100a;border:2px solid #3a2c18;border-radius:8px;padding:20px;width:380px;max-width:95vw;max-height:90vh;overflow-y:auto;font-family:Cinzel,serif;"></div>';
     document.body.appendChild(ov);
 }

 // Expose functions
 window._dgAttack = dungeonAttack;
  window._dgEat = dungeonEat;
  window._dgFlee = leaveDungeon;
  window._dgLeave = leaveDungeon;

 // Inject the dungeon button into the tabs area
 function injectDungeonUI(){
     var tabs = document.getElementById('tabs');
     if(!tabs) return;

    // Add dungeon tab
    var btn = document.createElement('div');
     btn.className = 'tab';
     btn.id = 'tab-dungeon';
     btn.style.cssText = 'cursor:pointer;text-align:center;padding:6px 4px;min-width:50px;';
     btn.innerHTML = '<div style="font-size:18px;">\uD83C\uDFF0</div><div style="font-size:9px;letter-spacing:1px;color:#9a7e50;">DUNG</div>';
     btn.onclick = function(){ showDungeonEntry(); };
     tabs.appendChild(btn);
 }

 function showDungeonEntry(){
     createDungeonOverlay();
     var content = document.getElementById('dg-content');
     var check = canEnterDungeon();
     var combatLvl = typeof lvlOf === 'function' ? lvlOf('combat') : 1;
     var weapon = (G.equip && G.equip.weapon) ? ITEMS[G.equip.weapon] : null;
     var armour = (G.equip && G.equip.armour) ? ITEMS[G.equip.armour] : null;
     var foodCount = getFoodCount();

    var html = '<div style="text-align:center;">';
     html += '<div style="font-size:36px;margin-bottom:8px;">\uD83C\uDFF0</div>';
     html += '<div style="color:#f0c040;font-size:20px;font-family:Cinzel,serif;margin-bottom:4px;">Enchanted Grove</div>';
     html += '<div style="color:#9a7e50;font-size:12px;margin-bottom:16px;">Level 1 Dungeon</div>';
     html += '</div>';

    html += '<div style="color:#e8d898;font-size:13px;margin-bottom:16px;line-height:1.6;text-align:center;">';
     html += 'Deep in the forest, corrupted saplings have taken root. ';
     html += 'Clear all <b>5 creatures</b> to claim the legendary <span style="color:#f0c040;">\u{1FA93} Steel Axe</span>.';
     html += '</div>';

    // Requirements
    html += '<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:12px;margin-bottom:16px;">';
     html += '<div style="color:#f0c040;font-size:12px;margin-bottom:8px;letter-spacing:1px;">REQUIREMENTS</div>';

    var reqColor1 = combatLvl >= DG.minCombatLvl ? '#5ac85a' : '#e03030';
     html += '<div style="color:'+reqColor1+';font-size:12px;margin-bottom:4px;">'+(combatLvl >= DG.minCombatLvl ? '\u2713' : '\u2717')+' Combat Level '+DG.minCombatLvl+' (yours: '+combatLvl+')</div>';

    var reqColor2 = weapon ? '#5ac85a' : '#e03030';
     html += '<div style="color:'+reqColor2+';font-size:12px;margin-bottom:4px;">'+(weapon ? '\u2713' : '\u2717')+' Weapon equipped'+(weapon ? ' ('+weapon.icon+' '+weapon.name+')' : '')+'</div>';

    var reqColor3 = foodCount >= DG.minFood ? '#5ac85a' : '#e03030';
     html += '<div style="color:'+reqColor3+';font-size:12px;margin-bottom:4px;">'+(foodCount >= DG.minFood ? '\u2713' : '\u2717')+' '+DG.minFood+'+ food in inventory (have: '+foodCount+')</div>';

    html += '<div style="color:#9a7e50;font-size:11px;margin-top:8px;">';
     html += 'Tip: Armour recommended! '+(armour ? armour.icon+' '+armour.name+' equipped' : 'No armour equipped')+'</div>';
     html += '</div>';

    // Enemies preview
    html += '<div style="background:#1c1710;border:1px solid #251e14;border-radius:4px;padding:12px;margin-bottom:16px;">';
     html += '<div style="color:#f0c040;font-size:12px;margin-bottom:8px;letter-spacing:1px;">ENEMIES</div>';
     DG.rooms.forEach(function(r, i){
           html += '<div style="display:flex;justify-content:space-between;color:#9a7e50;font-size:11px;margin-bottom:2px;">';
           html += '<span>'+r.icon+' '+r.name+'</span>';
           html += '<span>'+r.maxhp+' HP | '+r.dmg[0]+'-'+r.dmg[1]+' DMG</span>';
           html += '</div>';
     });
     html += '</div>';

    // Message area
    html += '<div id="dg-msg" style="display:none;text-align:center;font-size:12px;margin-bottom:8px;"></div>';

    // Buttons
    html += '<div style="display:flex;gap:8px;justify-content:center;">';
     if(check.ok){
           html += '<button onclick="window._dgStart()" style="padding:10px 24px;background:#8B4513;border:2px solid #f0c040;color:#f0c040;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:14px;font-weight:bold;">\u2694 Enter Dungeon</button>';
     } else {
           html += '<button disabled style="padding:10px 24px;background:#251e14;border:1px solid #3a2c18;color:#5a4830;border-radius:4px;font-family:Cinzel,serif;font-size:14px;cursor:not-allowed;">\u2694 Not Ready</button>';
     }
     html += '<button onclick="window._dgLeave()" style="padding:10px 16px;background:#251e14;border:1px solid #3a2c18;color:#5a4830;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:14px;">Close</button>';
     html += '</div>';

    content.innerHTML = html;
     document.getElementById('dungeon-overlay').style.display = 'flex';
 }

 window._dgStart = startDungeon;

 // Init
 function initDungeon(){
     injectDungeonUI();
     if(typeof log === 'function'){
           setTimeout(function(){
                   log('\uD83C\uDFF0 A mysterious dungeon has appeared... check the <b>DUNG</b> tab!');
           }, 2000);
     }
 }

 if(document.readyState === 'loading'){
     document.addEventListener('DOMContentLoaded', function(){ setTimeout(initDungeon, 500); });
 } else {
     setTimeout(initDungeon, 500);
 }
})();
