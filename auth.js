// Ensure all fetch calls include credentials (session cookies)
(function(){var _f=window.fetch;window.fetch=function(url,opts){opts=opts||{};if(!opts.credentials)opts.credentials='same-origin';return _f.call(this,url,opts);}})();

(function(){
      var currentUser = null;
      var autoSaveInterval = null;
      var authMode = 'login';
      var saveThrottle = null;

   function injectAuthUI(){
           var hdr = document.getElementById('hdr');
           if(!hdr) return;

        // Remove the logo - replace with just username display
        var logo = document.getElementById('logo');
           if(logo) logo.style.display = 'none';

        var d = document.createElement('div');
           d.id = 'auth-ui';
           d.style.cssText = 'display:flex;align-items:center;gap:8px;';
           d.innerHTML = '<span id="auth-status" style="color:#f0c040;font-size:14px;font-family:Cinzel,serif;font-weight:bold;"></span>' +
                     '<button id="auth-btn" style="background:#251e14;border:1px solid #3a2c18;color:#f0c040;padding:4px 12px;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Login</button>' +
                     '<button id="logout-btn" style="display:none;background:#251e14;border:1px solid #3a2c18;color:#5a4830;padding:4px 12px;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Logout</button>';
           hdr.insertBefore(d, hdr.firstChild);

        document.getElementById('auth-btn').onclick = showAuthModal;
           document.getElementById('logout-btn').onclick = doLogout;
    }
    function doLogout(){
      fetch('/api/logout',{method:'POST'}).then(function(){
        localStorage.removeItem('rforge');
        window.location.reload();
      }).catch(function(){
        localStorage.removeItem('rforge');
        window.location.reload();
      });
    }
    function createAuthModal(){
           if(document.getElementById('auth-modal')) return;
           var m = document.createElement('div');
           m.id = 'auth-modal';
           m.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;justify-content:center;align-items:center;';
           m.innerHTML = '<div style="background:#13100a;border:2px solid #3a2c18;border-radius:8px;padding:24px;width:320px;max-width:90vw;font-family:Cinzel,serif;">' +
                     '<h2 style="color:#f0c040;text-align:center;margin:0 0 16px;font-size:18px;">RuneForge Account</h2>' +
                     '<div id="auth-tabs" style="display:flex;gap:0;margin-bottom:16px;">' +
                     '<button id="tab-login" style="flex:1;padding:8px;background:#251e14;border:1px solid #3a2c18;color:#f0c040;cursor:pointer;font-family:Cinzel,serif;border-radius:4px 0 0 4px;">Login</button>' +
                     '<button id="tab-register" style="flex:1;padding:8px;background:#1c1710;border:1px solid #3a2c18;color:#5a4830;cursor:pointer;font-family:Cinzel,serif;border-radius:0 4px 4px 0;">Register</button>' +
                     '</div>' +
                     '<div id="auth-error" style="color:#e03030;font-size:12px;margin-bottom:8px;display:none;text-align:center;"></div>' +
                     '<input id="auth-user" type="text" placeholder="Username" maxlength="20" style="width:100%;padding:8px;margin-bottom:8px;background:#0b0905;border:1px solid #3a2c18;color:#e8d898;border-radius:4px;font-size:14px;box-sizing:border-box;">' +
                     '<input id="auth-pass" type="password" placeholder="Password" style="width:100%;padding:8px;margin-bottom:16px;background:#0b0905;border:1px solid #3a2c18;color:#e8d898;border-radius:4px;font-size:14px;box-sizing:border-box;">' +
                     '<div style="display:flex;gap:8px;">' +
                     '<button id="auth-submit" style="flex:1;padding:10px;background:#f0c040;color:#0b0905;border:none;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:14px;font-weight:bold;">Login</button>' +
                     '<button id="auth-cancel" style="padding:10px 16px;background:#251e14;border:1px solid #3a2c18;color:#5a4830;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:14px;">Cancel</button>' +
                     '</div></div>';
           document.body.appendChild(m);
           document.getElementById('tab-login').onclick = function(){ switchAuthTab('login'); };
           document.getElementById('tab-register').onclick = function(){ switchAuthTab('register'); };
           document.getElementById('auth-submit').onclick = doAuth;
           document.getElementById('auth-cancel').onclick = hideAuthModal;
           m.addEventListener('keydown', function(e){ if(e.key==='Enter') doAuth(); });
   }

   function switchAuthTab(mode){
           authMode = mode;
           document.getElementById('tab-login').style.background = mode==='login' ? '#251e14' : '#1c1710';
           document.getElementById('tab-login').style.color = mode==='login' ? '#f0c040' : '#5a4830';
           document.getElementById('tab-register').style.background = mode==='register' ? '#251e14' : '#1c1710';
           document.getElementById('tab-register').style.color = mode==='register' ? '#f0c040' : '#5a4830';
           document.getElementById('auth-submit').textContent = mode==='login' ? 'Login' : 'Register';
           document.getElementById('auth-error').style.display = 'none';
   }

   function showAuthModal(){
           createAuthModal();
           document.getElementById('auth-modal').style.display = 'flex';
           document.getElementById('auth-user').value = '';
           document.getElementById('auth-pass').value = '';
           document.getElementById('auth-error').style.display = 'none';
           document.getElementById('auth-user').focus();
   }

   function hideAuthModal(){
           document.getElementById('auth-modal').style.display = 'none';
   }

   function doAuth(){
           var user = document.getElementById('auth-user').value.trim();
           var pass = document.getElementById('auth-pass').value;
           var errEl = document.getElementById('auth-error');
           if(!user||!pass){ errEl.textContent='Please fill in both fields';errEl.style.display='block';return; }
           var endpoint = authMode==='login' ? '/api/login' : '/api/register';
           fetch(endpoint, {
                     method:'POST',
                     headers:{'Content-Type':'application/json'},
                     body: JSON.stringify({username:user,password:pass})
           }).then(function(res){
                     return res.json().then(function(data){ return {ok:res.ok,data:data}; });
           }).then(function(r){
                     if(!r.ok){ errEl.textContent=r.data.error||'Something went wrong';errEl.style.display='block';return; }
                     currentUser = r.data.username;
                     hideAuthModal();
                     updateAuthUI();
                     loadCloudSave().then(function(){ startAutoSave(); });
                     if(typeof log==='function') log('Logged in as <b>'+currentUser+'</b>. Progress saves automatically.');
           }).catch(function(){ errEl.textContent='Connection error';errEl.style.display='block'; });
   }

   function doLogout(){ fetch('/api/logout',{method:'POST'}).then(function(){ localStorage.removeItem('rforge'); window.location.reload(); }).catch(function(){ localStorage.removeItem('rforge'); window.location.reload(); }); } function updateAuthUI(){
           var s = document.getElementById('auth-status');
           var b = document.getElementById('auth-btn');
           var l = document.getElementById('logout-btn');
           if(!s) return;
           if(currentUser){
                     s.textContent = currentUser;
                     b.style.display = 'none';
                     l.style.display = 'inline-block';
           } else {
                     s.textContent = '';
                     b.style.display = 'inline-block';
                     l.style.display = 'none';
           }
   }

   // Auto-save: throttled to prevent too many requests
   function autoSaveNow(){
           if(!currentUser) return Promise.resolve();
           var saveData = JSON.parse(localStorage.getItem('rforge')||'{}');
           return fetch('/api/save',{
                     method:'POST',
                     headers:{'Content-Type':'application/json'},
                     body: JSON.stringify({saveData:saveData})
           }).then(function(res){
                     // Silent save - no log spam
           }).catch(function(){
                     // Will retry on next interval
           });
   }

   // Throttled save - called whenever game state changes
   function triggerSave(){
           if(!currentUser) return;
           if(saveThrottle) clearTimeout(saveThrottle);
           saveThrottle = setTimeout(function(){
                     autoSaveNow();
           }, 2000);
   }

   function loadCloudSave(){
      if(!currentUser) return Promise.resolve();
      return fetch('/api/save').then(function(res){
        return res.json();
      }).then(function(data){
        if(data.hasSave && data.saveData){
          localStorage.setItem('rforge', JSON.stringify(data.saveData));
          if(typeof G!=='undefined'){
            Object.assign(G, data.saveData);
            if(typeof updateUI==='function') updateUI();
            if(typeof giveStarterSword==='function') giveStarterSword();
            if(typeof buildSkills==='function') buildSkills();
            if(typeof initXpTracking==='function') initXpTracking();
          }
        } else {
          localStorage.removeItem('rforge');
          if(typeof G!=='undefined'){
            G.skills={};G.inv={};G.equip={weapon:null,armour:null};
            G.gold=0;G.hp=10;G.maxhp=10;G.upgrades={};G.trinkets={};
            G.tab='woodcutting';G.task=null;G.prog=0;G.dur=0;
            G.critStacks=0;G.xpEarned={};G.startedWithSword=false;
            G.hasSeenIntro=false;
            if(typeof initSkills==='function') initSkills();
            if(typeof initXpTracking==='function') initXpTracking();
            if(typeof giveStarterSword==='function') giveStarterSword();
            if(typeof buildSkills==='function') buildSkills();
            if(typeof updateUI==='function') updateUI();
            if(typeof showIntro==='function') showIntro();
          }
        }
      }).catch(function(){});
    }
    function startAutoSave(){
           if(autoSaveInterval) clearInterval(autoSaveInterval);
           // Auto-save every 30 seconds
        autoSaveInterval = setInterval(function(){
                  if(currentUser) autoSaveNow();
        }, 30000);
   }

   // Hook into existing save function for real-time auto-save
   var origSave = typeof save==='function' ? save : null;
      if(origSave){
              window.save = function(){
                        origSave.apply(this, arguments);
                        triggerSave();
              };
      }

   function checkSession(){
           fetch('/api/me').then(function(res){
                     return res.json();
           }).then(function(data){
                     if(data.loggedIn){
                                 currentUser = data.username;
                                 updateAuthUI();
                                 loadCloudSave().then(function(){ startAutoSave(); });
                                 if(typeof log==='function') log('Welcome back, <b>'+currentUser+'</b>!');
                     }
           }).catch(function(){});
   }

   if(document.readyState==='loading'){
           document.addEventListener('DOMContentLoaded', function(){
                     injectAuthUI();
                     setTimeout(checkSession,1000);
           });
   } else {
           setTimeout(function(){
                     injectAuthUI();
                     setTimeout(checkSession,1000);
           }, 100);
   }
})();
