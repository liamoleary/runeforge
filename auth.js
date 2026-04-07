(function(){
    var currentUser = null;
    var cloudSaveInterval = null;
    var authMode = 'login';

   function injectAuthUI(){
         var hdr = document.getElementById('hdr');
         if(!hdr) return;
         var d = document.createElement('div');
         d.id = 'auth-ui';
         d.style.cssText = 'display:flex;align-items:center;gap:8px;position:absolute;right:160px;top:50%;transform:translateY(-50%);';
         d.innerHTML = '<span id="auth-status" style="color:#ffd966;font-size:13px;font-family:Cinzel,serif;"></span>'
           + '<button id="auth-btn" style="background:#251e14;border:1px solid #3a2c18;color:#f0c040;padding:4px 12px;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Login</button>'
           + '<button id="cloud-save-btn" style="display:none;background:#251e14;border:1px solid #3a2c18;color:#f0c040;padding:4px 12px;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Cloud Save</button>'
           + '<button id="logout-btn" style="display:none;background:#251e14;border:1px solid #3a2c18;color:#5a4830;padding:4px 12px;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Logout</button>';
         hdr.style.position = 'relative';
         hdr.appendChild(d);
         document.getElementById('auth-btn').onclick = showAuthModal;
         document.getElementById('cloud-save-btn').onclick = cloudSaveNow;
         document.getElementById('logout-btn').onclick = doLogout;
   }

   function createAuthModal(){
         if(document.getElementById('auth-modal')) return;
         var m = document.createElement('div');
         m.id = 'auth-modal';
         m.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;justify-content:center;align-items:center;';
         m.innerHTML = '<div style="background:#13100a;border:2px solid #3a2c18;border-radius:8px;padding:24px;width:320px;max-width:90vw;font-family:Cinzel,serif;">'
           + '<h2 style="color:#f0c040;text-align:center;margin:0 0 16px;font-size:18px;">RuneForge Account</h2>'
           + '<div id="auth-tabs" style="display:flex;gap:0;margin-bottom:16px;">'
           + '<button id="tab-login" style="flex:1;padding:8px;background:#251e14;border:1px solid #3a2c18;color:#f0c040;cursor:pointer;font-family:Cinzel,serif;border-radius:4px 0 0 4px;">Login</button>'
           + '<button id="tab-register" style="flex:1;padding:8px;background:#1c1710;border:1px solid #3a2c18;color:#5a4830;cursor:pointer;font-family:Cinzel,serif;border-radius:0 4px 4px 0;">Register</button>'
           + '</div>'
           + '<div id="auth-error" style="color:#e03030;font-size:12px;margin-bottom:8px;display:none;text-align:center;"></div>'
           + '<input id="auth-user" type="text" placeholder="Username" maxlength="20" style="width:100%;padding:8px;margin-bottom:8px;background:#0b0905;border:1px solid #3a2c18;color:#e8d898;border-radius:4px;font-size:14px;box-sizing:border-box;">'
           + '<input id="auth-pass" type="password" placeholder="Password" style="width:100%;padding:8px;margin-bottom:16px;background:#0b0905;border:1px solid #3a2c18;color:#e8d898;border-radius:4px;font-size:14px;box-sizing:border-box;">'
           + '<div style="display:flex;gap:8px;">'
           + '<button id="auth-submit" style="flex:1;padding:10px;background:#f0c040;color:#0b0905;border:none;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:14px;font-weight:bold;">Login</button>'
           + '<button id="auth-cancel" style="padding:10px 16px;background:#251e14;border:1px solid #3a2c18;color:#5a4830;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:14px;">Cancel</button>'
           + '</div></div>';
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
         }).then(function(res){ return res.json().then(function(data){ return {ok:res.ok,data:data}; }); })
         .then(function(r){
                 if(!r.ok){ errEl.textContent=r.data.error||'Something went wrong';errEl.style.display='block';return; }
                 currentUser = r.data.username;
                 hideAuthModal();
                 updateAuthUI();
                 loadCloudSave().then(function(){ startAutoCloudSave(); });
                 if(typeof log==='function') log('Cloud save connected as <b>'+currentUser+'</b>');
         }).catch(function(){ errEl.textContent='Connection error';errEl.style.display='block'; });
   }

   function doLogout(){
         fetch('/api/logout',{method:'POST'}).catch(function(){});
         currentUser = null;
         if(cloudSaveInterval){ clearInterval(cloudSaveInterval); cloudSaveInterval=null; }
         updateAuthUI();
         if(typeof log==='function') log('Logged out. Saves are local only.');
   }

   function updateAuthUI(){
         var s = document.getElementById('auth-status');
         var b = document.getElementById('auth-btn');
         var c = document.getElementById('cloud-save-btn');
         var l = document.getElementById('logout-btn');
         if(!s) return;
         if(currentUser){
                 s.textContent = currentUser;
                 b.style.display = 'none';
                 c.style.display = 'inline-block';
                 l.style.display = 'inline-block';
         } else {
                 s.textContent = '';
                 b.style.display = 'inline-block';
                 c.style.display = 'none';
                 l.style.display = 'none';
         }
   }

   function cloudSaveNow(){
         if(!currentUser) return Promise.resolve();
         var saveData = JSON.parse(localStorage.getItem('rforge')||'{}');
         return fetch('/api/save',{
                 method:'POST',
                 headers:{'Content-Type':'application/json'},
                 body: JSON.stringify({saveData:saveData})
         }).then(function(res){
                 if(res.ok && typeof log==='function') log('Cloud save successful');
         }).catch(function(){
                 if(typeof log==='function') log('Cloud save failed - will retry');
         });
   }

   function loadCloudSave(){
         if(!currentUser) return Promise.resolve();
         return fetch('/api/save').then(function(res){ return res.json(); })
         .then(function(data){
                 if(data.hasSave && data.saveData){
                           localStorage.setItem('rforge', JSON.stringify(data.saveData));
                           if(typeof G!=='undefined'){
                                       Object.assign(G, data.saveData);
                                       if(typeof updateUI==='function') updateUI();
                                       if(typeof buildSkills==='function') buildSkills();
                           }
                           if(typeof log==='function') log('Cloud save loaded');
                 }
         }).catch(function(){
                 if(typeof log==='function') log('Could not load cloud save');
         });
   }

   function startAutoCloudSave(){
         if(cloudSaveInterval) clearInterval(cloudSaveInterval);
         cloudSaveInterval = setInterval(function(){ if(currentUser) cloudSaveNow(); }, 60000);
   }

   // Hook into existing save
   var origSave = typeof save==='function' ? save : null;
    if(origSave){
          window.save = function(){
                  origSave.apply(this, arguments);
                  if(currentUser) cloudSaveNow();
          };
    }

   function checkSession(){
         fetch('/api/me').then(function(res){ return res.json(); })
         .then(function(data){
                 if(data.loggedIn){
                           currentUser = data.username;
                           updateAuthUI();
                           loadCloudSave().then(function(){ startAutoCloudSave(); });
                           if(typeof log==='function') log('Welcome back, <b>'+currentUser+'</b>! Cloud save active.');
                 }
         }).catch(function(){});
   }

   if(document.readyState==='loading'){
         document.addEventListener('DOMContentLoaded', function(){ injectAuthUI(); setTimeout(checkSession,1000); });
   } else {
         setTimeout(function(){ injectAuthUI(); setTimeout(checkSession,1000); }, 100);
   }
})();
