/* RuneForge — auth & cloud-save bridge.
 * Persists window.G via localStorage and the /api/save endpoint.
 * Calls window.applyLoadedSave() after a cloud sync so the game re-renders.
 */

// Make every fetch include session cookies by default.
(function () {
  const _f = window.fetch;
  window.fetch = function (url, opts) {
    opts = opts || {};
    if (!opts.credentials) opts.credentials = 'same-origin';
    return _f.call(this, url, opts);
  };
})();

(function () {
  let currentUser = null;
  let authMode = 'login';
  let autoSaveInterval = null;
  let saveThrottle = null;

  function $(id) { return document.getElementById(id); }

  // ---------- UI ----------

  function injectAuthUI() {
    const hdr = $('hdr');
    if (!hdr) return;
    const d = document.createElement('div');
    d.id = 'auth-ui';
    d.innerHTML =
      '<span id="auth-status"></span>' +
      '<button id="auth-btn">Login</button>' +
      '<button id="logout-btn" style="display:none;">Logout</button>';
    hdr.appendChild(d);
    $('auth-btn').onclick = showAuthModal;
    $('logout-btn').onclick = doLogout;
  }

  function createAuthModal() {
    if ($('auth-modal')) return;
    const m = document.createElement('div');
    m.id = 'auth-modal';
    m.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;justify-content:center;align-items:center;';
    m.innerHTML =
      '<div style="background:#13100a;border:2px solid #3a2c18;border-radius:8px;padding:24px;width:320px;max-width:90vw;font-family:Cinzel,serif;">' +
        '<h2 style="color:#f0c040;text-align:center;margin:0 0 16px;font-size:18px;">RuneForge Account</h2>' +
        '<div style="display:flex;gap:0;margin-bottom:16px;">' +
          '<button id="tab-login" style="flex:1;padding:8px;background:#251e14;border:1px solid #3a2c18;color:#f0c040;cursor:pointer;font-family:Cinzel,serif;border-radius:4px 0 0 4px;">Login</button>' +
          '<button id="tab-register" style="flex:1;padding:8px;background:#1c1710;border:1px solid #3a2c18;color:#5a4830;cursor:pointer;font-family:Cinzel,serif;border-radius:0 4px 4px 0;">Register</button>' +
        '</div>' +
        '<div id="auth-error" style="color:#e03030;font-size:12px;margin-bottom:8px;display:none;text-align:center;"></div>' +
        '<input id="auth-user" type="text" placeholder="Username" maxlength="20" autocomplete="username" style="width:100%;padding:8px;margin-bottom:8px;background:#0b0905;border:1px solid #3a2c18;color:#e8d898;border-radius:4px;font-size:14px;box-sizing:border-box;">' +
        '<input id="auth-pass" type="password" placeholder="Password" autocomplete="current-password" style="width:100%;padding:8px;margin-bottom:16px;background:#0b0905;border:1px solid #3a2c18;color:#e8d898;border-radius:4px;font-size:14px;box-sizing:border-box;">' +
        '<div style="display:flex;gap:8px;">' +
          '<button id="auth-submit" style="flex:1;padding:10px;background:#f0c040;color:#0b0905;border:none;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:14px;font-weight:bold;">Login</button>' +
          '<button id="auth-cancel" style="padding:10px 16px;background:#251e14;border:1px solid #3a2c18;color:#5a4830;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:14px;">Cancel</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    $('tab-login').onclick = function () { switchAuthTab('login'); };
    $('tab-register').onclick = function () { switchAuthTab('register'); };
    $('auth-submit').onclick = doAuth;
    $('auth-cancel').onclick = hideAuthModal;
    m.addEventListener('keydown', function (e) { if (e.key === 'Enter') doAuth(); });
  }

  function switchAuthTab(mode) {
    authMode = mode;
    $('tab-login').style.background = mode === 'login' ? '#251e14' : '#1c1710';
    $('tab-login').style.color = mode === 'login' ? '#f0c040' : '#5a4830';
    $('tab-register').style.background = mode === 'register' ? '#251e14' : '#1c1710';
    $('tab-register').style.color = mode === 'register' ? '#f0c040' : '#5a4830';
    $('auth-submit').textContent = mode === 'login' ? 'Login' : 'Register';
    $('auth-error').style.display = 'none';
  }

  function showAuthModal() {
    createAuthModal();
    $('auth-modal').style.display = 'flex';
    $('auth-user').value = '';
    $('auth-pass').value = '';
    $('auth-error').style.display = 'none';
    $('auth-user').focus();
  }
  function hideAuthModal() { $('auth-modal').style.display = 'none'; }

  function doAuth() {
    const user = $('auth-user').value.trim();
    const pass = $('auth-pass').value;
    const errEl = $('auth-error');
    if (!user || !pass) {
      errEl.textContent = 'Please fill in both fields';
      errEl.style.display = 'block';
      return;
    }
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, data: data }; });
    }).then(function (r) {
      if (!r.ok) {
        errEl.textContent = r.data.error || 'Something went wrong';
        errEl.style.display = 'block';
        return;
      }
      currentUser = r.data.username;
      hideAuthModal();
      updateAuthUI();
      loadCloudSave().then(function () { startAutoSave(); });
    }).catch(function () {
      errEl.textContent = 'Connection error';
      errEl.style.display = 'block';
    });
  }

  function doLogout() {
    fetch('/api/logout', { method: 'POST' }).then(function () {
      localStorage.removeItem('rforge');
      window.location.reload();
    }).catch(function () {
      localStorage.removeItem('rforge');
      window.location.reload();
    });
  }

  function updateAuthUI() {
    const s = $('auth-status');
    const b = $('auth-btn');
    const l = $('logout-btn');
    if (!s) return;
    if (currentUser) {
      s.textContent = currentUser;
      b.style.display = 'none';
      l.style.display = 'inline-block';
    } else {
      s.textContent = '';
      b.style.display = 'inline-block';
      l.style.display = 'none';
    }
  }

  // ---------- Save sync ----------

  function autoSaveNow() {
    if (!currentUser) return Promise.resolve();
    const saveData = JSON.parse(localStorage.getItem('rforge') || '{}');
    return fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveData: saveData })
    }).catch(function () { /* retried next interval */ });
  }

  function triggerSave() {
    if (!currentUser) return;
    if (saveThrottle) clearTimeout(saveThrottle);
    saveThrottle = setTimeout(autoSaveNow, 2000);
  }

  function loadCloudSave() {
    if (!currentUser) return Promise.resolve();
    return fetch('/api/save').then(function (res) { return res.json(); }).then(function (data) {
      if (data.hasSave && data.saveData) {
        localStorage.setItem('rforge', JSON.stringify(data.saveData));
      } else {
        localStorage.removeItem('rforge');
      }
      if (typeof window.applyLoadedSave === 'function') {
        window.applyLoadedSave();
      }
    }).catch(function () {});
  }

  function startAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(function () {
      if (currentUser) autoSaveNow();
    }, 30000);
  }

  // Hook the game's save() so cloud sync triggers on every state change.
  function hookGameSave() {
    const origSave = typeof window.save === 'function' ? window.save : null;
    if (origSave && !window.__rfSaveHooked) {
      window.__rfSaveHooked = true;
      window.save = function () {
        origSave.apply(this, arguments);
        triggerSave();
      };
    }
  }

  function checkSession() {
    fetch('/api/me').then(function (res) { return res.json(); }).then(function (data) {
      if (data.loggedIn) {
        currentUser = data.username;
        updateAuthUI();
        loadCloudSave().then(function () { startAutoSave(); });
      }
    }).catch(function () {});
  }

  function boot() {
    injectAuthUI();
    // Wait for the game to define save() before hooking.
    let tries = 0;
    const wait = setInterval(function () {
      tries++;
      if (typeof window.save === 'function' || tries > 50) {
        clearInterval(wait);
        hookGameSave();
        checkSession();
      }
    }, 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }
})();
