// MODULE: FIREBASE / FIRESTORE BACKEND
//
// Firestore Collections used:
//   sessions/      – one doc per browser session (auto-logged on load)
//   calculations/  – one doc per completed calculation
//   stats/global   – aggregated counters read by the Admin dashboard
//   stats/daily/{YYYY-MM-DD} – per-day counters for chart data
//
// All writes are fire-and-forget (no UI blocking).
// Falls back to localStorage on any error.
// ═══════════════════════════════════════════════════════════════

/** Global Firestore instance — set by initFirebase() */
let db = null;

/** Global Realtime Database instance — set by initFirebase() */
let rtdb = null;

/**
 * Update the header status pill and bottom status bar.
 * @param {'online'|'offline'|'connecting'} state
 * @param {string} msg
 */
function setStatus(state, msg) {
  const dotColors = { online: 'var(--green)', offline: 'var(--teal)', connecting: 'var(--amber)' };
  const color = dotColors[state] || 'var(--teal)';
  document.getElementById('sb-dot').style.background = color;
  document.getElementById('sb-txt').textContent = msg;

  const pill = document.getElementById('db-pill');
  if (pill) {
    pill.className = 'status-pill ' + state;
    const dotEl = document.getElementById('db-dot');
    if (dotEl) {
      // Use CSS class so the blink animation applies for green/online state
      dotEl.className = 'dot';
      if (state === 'online')      { dotEl.classList.add('green'); dotEl.style.background = ''; dotEl.style.boxShadow = ''; }
      else if (state === 'connecting') { dotEl.style.background = 'var(--amber)'; dotEl.style.boxShadow = '0 0 6px var(--amber)'; dotEl.style.animation = 'blink 1s infinite'; }
      else { dotEl.style.background = 'var(--text-dim)'; dotEl.style.boxShadow = ''; dotEl.style.animation = ''; }
    }
    const stateLabels = { online:'Live', connecting:'Connecting…', offline:'Offline' };
    document.getElementById('db-pill-txt').textContent  = stateLabels[state] || 'FIRESTORE';
  }
}

/**
 * Initialise Firebase, wire up Firestore, and log the session start.
 * Called from the BOOT block.
 */
async function initFirebase() {
  setStatus('connecting', '⏳ Connecting to Firestore…');
  renderHistory();   // Load local history while connecting

  try {
    // Guard: don't double-init if already loaded (e.g. hot reload)
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.firestore();

    // NOTE: We deliberately do NOT decide here whether to show the sign-in
    // overlay. Immediately after firebase.initializeApp(), auth.currentUser
    // is still null even for a returning, already-signed-in user — Firebase
    // Auth restores the persisted session asynchronously, and that restore
    // hasn't completed yet at this point. Checking currentUser here used to
    // force the sign-in overlay open, only for checkOnboarding()'s
    // onAuthStateChanged listener to flip it shut again a moment later once
    // the real session was restored — that flash was the startup flicker.
    // checkOnboarding() (started in parallel at boot) is the single source
    // of truth for the overlay; it waits for onAuthStateChanged to fire
    // with the real, restored user before showing or hiding anything.

    // ── Realtime Database init ────────────────────────────────────
    rtdb = firebase.database();
    appState.rtdbConnected = false;

    // Monitor RTDB connection state (.info/connected)
    rtdb.ref('.info/connected').on('value', (snap) => {
      appState.rtdbConnected = snap.val() === true;
      console.log('[Oasis] RTDB connection:', appState.rtdbConnected ? 'online' : 'offline');
    });

    // Enable offline persistence so the app works on flaky ward Wi-Fi
    await db.enablePersistence({ synchronizeTabs: true }).catch(err => {
      // Persistence may fail in private browsing — that's OK
      if (err.code === 'failed-precondition') {
        console.warn('[Oasis] Multi-tab persistence disabled — only one tab open at a time.');
      } else if (err.code === 'unimplemented') {
        console.warn('[Oasis] Offline persistence not supported in this browser.');
      }
    });

    appState.dbConnected = true;
    setStatus('online', 'Firestore — Real-time sync active');

    // Log this session to Firestore
    await _logSessionStart();

    // Wire DataService to also write to Firestore
    _patchDataServiceForFirestore();

    // ── PRESENCE HEARTBEAT — "online now" tracking ──────────────
    _initPresenceHeartbeat();

    // ── RTDB PRESENCE — onDisconnect-backed reliable tracking ───
    _initRTDBPresence();

    // ── AUTH STATE — uid-keyed RTDB presence for signed-in users ─
    _initAuthPresence();

    // ── PUSH UPDATE WATCHER — Firestore + RTDB + BroadcastChannel ─
    _initUpdateWatcher();

    // ── DEVELOPER PROFILE — sync avatar + role from Firestore ─────
    _fetchDeveloperProfile();

    // ── PACKAGED FOODS — sync from Chakudya API + start polling ──
    if (typeof PackagedFoodsDB !== 'undefined') {
      PackagedFoodsDB.listen();
      PackagedFoodsDB.onSync(() => {
        if (pkgInitialized) {
          pkgRender();
          pkgUpdateStats();
        }
      });
    }



  } catch (err) {
    console.error('[Oasis] Firebase init failed:', err);
    setStatus('offline', ' Offline — data saved locally (Firebase unavailable)');
  }
}

/**
 * Write a session-start document to sessions/{SESSION_ID}.
 * Admin dashboard reads this collection for "live sessions".
 */
async function _logSessionStart() {
  if (!db) return;
  try {
    const _inst = localStorage.getItem('nc_institution') || DataService.get('settings')?.institution || '';
    const _instCat = _getInstitutionCategory(_inst);
    const _up = getUserProfile ? getUserProfile() : null;
    await db.collection('sessions').doc(SESSION_ID).set({
      sessionId:        SESSION_ID,
      startedAt:        firebase.firestore.FieldValue.serverTimestamp(),
      lastSeen:         firebase.firestore.FieldValue.serverTimestamp(),
      date:             TODAY,
      status:           'active',
      userAgent:        navigator.userAgent,
      platform:         navigator.platform,
      calcCount:        0,
      institution:      _inst,
      institutionCat:   _instCat,
      // User identity from onboarding
      userName:         _up?.name    || '',
      userId:           _up?.uid     || '',
      userRole:         _up?.role    || '',
      // Device / app meta
      appVersion:       APP_VERSION,
      screenW:          screen.width,
      screenH:          screen.height,
    });

    // Update lastSeen every 60 s so admin can detect live users
    const _keepAlive = setInterval(async () => {
      try {
        const _activeTab = document.querySelector('.tab.active')?.getAttribute('onclick')?.match(/switchTab\('(\w+)'\)/)?.[1] || 'unknown';
        await db.collection('sessions').doc(SESSION_ID).update({
          lastSeen:    firebase.firestore.FieldValue.serverTimestamp(),
          calcCount:   calcCount,
          status:      'active',
          activeTab:   _activeTab,
        });
      } catch(e) { /* silently ignore keep-alive failures */ }
    }, 60_000);

    // Mark session as 'ended' when tab closes
    window.addEventListener('beforeunload', async () => {
      clearInterval(_keepAlive);
      try {
        navigator.sendBeacon && db.collection('sessions').doc(SESSION_ID).update({
          status:   'ended',
          endedAt:  firebase.firestore.FieldValue.serverTimestamp(),
          calcCount: calcCount,
        });
      } catch(e) {}
    });

  } catch (err) {
    console.warn('[Oasis] Session log failed:', err);
  }
}

/**
 * Patch DataService so saves also mirror to Firestore (fire-and-forget).
 * localStorage remains the source of truth — Firestore is the admin view.
 */
function _patchDataServiceForFirestore() {
  if (!db) return;
  const _origSave = DataService.save.bind(DataService);
  DataService.save = function(key, data) {
    _origSave(key, data);  // keep localStorage working
    // Mirror patient history records to Firestore
    if (key === 'history' || key.startsWith('hist')) {
      db.collection('saved_records').doc(SESSION_ID + '_' + key)
        .set({ sessionId: SESSION_ID, key, data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(e => console.warn('[DataService] Firestore mirror failed:', e));
    }
  };
}

// ── Institution category helper ────────────────────────────────
function _getInstitutionCategory(inst) {
  if (!inst) return 'Unknown';
  const i = inst.toLowerCase();
  if (i.includes('kuhe') || i.includes('university') || i.includes('college') || i.includes('luanar') || i.includes('mzuzu univ') || i.includes('mau') || i.includes('dmi')) return 'University/Training';
  if (i.includes('qech') || i.includes('queen elizabeth') || i.includes('kamuzu central') || i.includes('zomba central') || i.includes('mzuzu central')) return 'Central Hospital';
  if (i.includes('mission') || i.includes('adventist') || i.includes('malamulo') || i.includes('nkhoma') || i.includes('ekwendeni') || i.includes('livingstonia') || i.includes('gabriel') || i.includes('luke') || i.includes('embangweni') || i.includes('ccap') || i.includes('john of god')) return 'Mission Hospital';
  if (i.includes('private') || i.includes('mwaiwathu') || i.includes('amita') || i.includes('medicentre') || i.includes('beit cure') || i.includes('lighthouse') || i.includes('partners in hope')) return 'Private Hospital';
  if (i.includes('district')) return 'District Hospital';
  if (i.includes('msf') || i.includes('unicef') || i.includes('who ') || i.includes('usaid') || i.includes('pepfar') || i.includes('save the children') || i.includes('pih') || i.includes('partners in health') || i.includes('ngo')) return 'NGO/International';
  if (i.includes('community') || i.includes('field')) return 'Community/Field';
  return 'Other';
}

/**
 * Log a completed calculation to Firestore.
 * Also increments the global + daily stats counters (used by Admin charts).
 *
 * @param {Object} data  – calculation payload built by calculate()
 */
async function logCalcToFirebase(data) {
  calcCount++;   // always increment local counter

  if (!db) return;   // offline mode — skip Firestore

  const now = new Date();
  const _inst    = localStorage.getItem('nc_institution') || DataService.get('settings')?.institution || '';
  const _instCat = _getInstitutionCategory(_inst);

  const payload = {
    sessionId:      SESSION_ID,
    timestamp:      firebase.firestore.FieldValue.serverTimestamp(),
    date:           TODAY,
    hour:           now.getHours(),
    module:         data.calcType || data.module || 'adult',
    calcType:       data.calcType || data.module || 'adult',
    diagnosis:      data.diagnosis || data.diag || '',
    energy_kcal:    data.energy    || data.kcal  || 0,
    protein_g:      data.protein   || data.prot  || 0,
    weight_kg:      data.weight    || 0,
    formula:        data.formula   || '',
    route:          data.route     || '',
    hasAlert:       !!(data.refeedingRisk || data.alerts?.length),
    age_years:      data.age || 0,
    sex:            data.sex || '',
    institution:    _inst,
    institutionCat: _instCat,
    // User identity from onboarding
    userName:       (getUserProfile ? getUserProfile()?.name : '') || '',
    userRole:       (getUserProfile ? getUserProfile()?.role : '') || '',
    userId:         (getUserProfile ? getUserProfile()?.uid  : '') || '',
  };

  // Fire all three writes in parallel — no awaiting, no UI blocking
  Promise.all([
    // 1. Individual calculation document
    db.collection('calculations').add(payload),

    // 2. Increment global totals (Admin stat cards)
    db.collection('stats').doc('global').set({
      totalCalcs:   firebase.firestore.FieldValue.increment(1),
      [`module_${payload.module}`]: firebase.firestore.FieldValue.increment(1),
      lastCalcAt:   firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }),

    // 3. Increment daily counter (Admin activity chart)
    db.collection('stats').doc('daily_' + TODAY).set({
      date:   TODAY,
      count:  firebase.firestore.FieldValue.increment(1),
      [`module_${payload.module}`]: firebase.firestore.FieldValue.increment(1),
    }, { merge: true }),

    // 4. Update session calc count
    db.collection('sessions').doc(SESSION_ID).update({
      calcCount:  firebase.firestore.FieldValue.increment(1),
      lastModule: payload.module,
      lastSeen:   firebase.firestore.FieldValue.serverTimestamp(),
    }),
  ]).catch(err => console.warn('[Oasis] Firestore write failed:', err));

  // 5. Mirror to RTDB — real-time calc summary + daily log entry
  updateRTDBCalculation(SESSION_ID, payload.energy_kcal, payload.module, payload.protein_g);
  _pushRTDBDailyLog(payload);
}

// ── PRESENCE HEARTBEAT ────────────────────────────────────────
function _initPresenceHeartbeat() {
  if (!db) return;

  let _pid = sessionStorage.getItem('_ntpPid');
  if (!_pid) { _pid = 'u-' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('_ntpPid', _pid); }

  function _heartbeat() {
    // Always re-read institution so settings changes take effect immediately
    const _inst    = localStorage.getItem('nc_institution') || DataService.get('settings')?.institution || '';
    const _instCat = _getInstitutionCategory(_inst);
    const _hp = getUserProfile ? getUserProfile() : null;
    db.collection('presence').doc(_pid).set({
      lastSeen:       firebase.firestore.FieldValue.serverTimestamp(),
      userId:         _pid,
      sessionId:      SESSION_ID,
      institution:    _inst,
      institutionCat: _instCat,
      hospital:       _inst,
      ward:           appState.lastCalc?.ward || '',
      deviceInfo:     navigator.userAgent.slice(0, 120),
      page:           'main-app',
      // User identity
      userName:       _hp?.name || '',
      userRole:       _hp?.role || '',
      userUid:        _hp?.uid  || '',
      // Active module (updated by switchTab)
      activeModule:   window._activeModule || 'home',
      calcCount:      calcCount,
    }).catch(() => {});
  }

  _heartbeat();
  const _hbInterval = setInterval(_heartbeat, 30000);

  window.addEventListener('pagehide', () => {
    clearInterval(_hbInterval);
    db.collection('presence').doc(_pid).delete().catch(() => {});
  });
}

// ── RTDB PRESENCE — onDisconnect-backed reliable tracking ────────
/**
 * Session-keyed RTDB presence node at /presence/{_pid}.
 * Uses onDisconnect() so Firebase server marks the user offline
 * even if the browser closes without firing pagehide / beforeunload.
 * Runs in parallel with Firestore heartbeat — they complement each other.
 */
function _initRTDBPresence() {
  if (!rtdb) return;

  let _pid = sessionStorage.getItem('_ntpPid');
  if (!_pid) { _pid = 'u-' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('_ntpPid', _pid); }

  const presenceRef = rtdb.ref('/presence/' + _pid);

  const _buildPayload = (state) => {
    const _inst = localStorage.getItem('nc_institution') || DataService.get('settings')?.institution || '';
    const _hp   = getUserProfile ? getUserProfile() : null;
    return {
      state,
      sessionId:      SESSION_ID,
      institution:    _inst,
      institutionCat: _getInstitutionCategory(_inst),
      activeModule:   window._activeModule || 'home',
      calcCount,
      userName:       _hp?.name || '',
      userRole:       _hp?.role || '',
      userUid:        _hp?.uid  || '',
      last_changed:   firebase.database.ServerValue.TIMESTAMP,
    };
  };

  // Monitor RTDB connection state
  rtdb.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === false) {
      // Already disconnected — onDisconnect handler will fire on the server
      return;
    }
    // Connected: register the offline payload to run on server when we disconnect
    presenceRef.onDisconnect().set(_buildPayload('offline')).then(() => {
      // Now mark ourselves online
      presenceRef.set(_buildPayload('online'));
    });
  });

  // Clean up the onDisconnect when the page explicitly unloads
  window.addEventListener('pagehide', () => {
    presenceRef.onDisconnect().cancel();
    presenceRef.set(_buildPayload('offline'));
  });
}

// ── AUTH PRESENCE — uid-keyed node for authenticated users ───────
/**
 * If the app has an authenticated Firebase user, this writes a
 * /presence/{uid} node (in addition to the session-keyed node above).
 * This lets the admin dashboard query presence by user identity.
 * onDisconnect() makes offline detection instant and server-guaranteed.
 */
function _initAuthPresence() {
  if (!rtdb || typeof firebase.auth !== 'function') return;

  const auth = firebase.auth();

  auth.onAuthStateChanged((user) => {
    if (!user) return;   // Anonymous / not signed in — session-keyed presence is enough

    const uid              = user.uid;
    const userPresenceRef  = rtdb.ref('/presence/' + uid);

    const _offline = {
      state:        'offline',
      last_changed: firebase.database.ServerValue.TIMESTAMP,
    };
    const _online = () => {
      const _inst = localStorage.getItem('nc_institution') || DataService.get('settings')?.institution || '';
      const _hp   = getUserProfile ? getUserProfile() : null;
      return {
        state:          'online',
        last_changed:   firebase.database.ServerValue.TIMESTAMP,
        sessionId:      SESSION_ID,
        institution:    _inst,
        institutionCat: _getInstitutionCategory(_inst),
        activeModule:   window._activeModule || 'home',
        calcCount,
        userName:       _hp?.name || user.displayName || '',
        userRole:       _hp?.role || '',
        email:          user.email || '',
      };
    };

    rtdb.ref('.info/connected').on('value', (snap) => {
      if (snap.val() === false) return;
      userPresenceRef.onDisconnect().set(_offline).then(() => {
        userPresenceRef.set(_online());
      });
    });

    // Explicit sign-out or page unload
    window.addEventListener('pagehide', () => {
      userPresenceRef.onDisconnect().cancel();
      userPresenceRef.set(_offline);
    });
  });
}

// ── RTDB CALCULATIONS — real-time mirror of calc results ──────────
/**
 * Write a compact calculation summary to /calculations/{sessionId}.
 * Structured to match the RTDB JSON schema from the integration spec:
 *   /calculations/{sessionId}/{ totalCalories, progressPercentage, lastUpdated }
 * Called automatically from logCalcToFirebase().
 *
 * @param {string} sessionId  - RTDB path key (defaults to SESSION_ID)
 * @param {number} kcal       - energy result in kcal
 * @param {string} module     - calculator module name
 * @param {number} protein    - protein result in grams
 */
function updateRTDBCalculation(sessionId, kcal, module, protein) {
  if (!rtdb) return;
  const calcRef = rtdb.ref('/calculations/' + sessionId);
  calcRef.set({
    totalCalories:      kcal       || 0,
    protein_g:          protein    || 0,
    module:             module     || 'adult',
    sessionId:          SESSION_ID,
    progressPercentage: _calcProgressPct(kcal),
    lastUpdated:        firebase.database.ServerValue.TIMESTAMP,
  }).catch(e => console.warn('[RTDB] Calculation sync failed:', e));
}

/**
 * Add a timestamped daily calculation log entry to
 * /calculations/{sessionId}/dailyLogs/{pushId}.
 * Mirrors addDailyCalculation() from the integration spec.
 *
 * @param {Object} payload  - flat calculation data from logCalcToFirebase
 */
function _pushRTDBDailyLog(payload) {
  if (!rtdb) return;
  const logsRef = rtdb.ref('/calculations/' + SESSION_ID + '/dailyLogs');
  logsRef.push({
    module:      payload.module     || 'adult',
    energy_kcal: payload.energy_kcal || 0,
    protein_g:   payload.protein_g   || 0,
    calcType:    payload.calcType    || '',
    diagnosis:   payload.diagnosis   || '',
    timestamp:   firebase.database.ServerValue.TIMESTAMP,
  }).catch(e => console.warn('[RTDB] Daily log push failed:', e));
}

/**
 * Estimate a "progress percentage" for the RTDB calculations node.
 * Uses 2000 kcal as the 100% reference (adult typical target).
 * Capped at 100.
 * @param {number} kcal
 * @returns {number} 0–100
 */
function _calcProgressPct(kcal) {
  if (!kcal || kcal <= 0) return 0;
  return Math.min(100, Math.round((kcal / 2000) * 100));
}

// ── PUSH UPDATE WATCHER ───────────────────────────────────────────
/**
 * Listens on THREE channels for admin-pushed version signals:
 *
 *   Channel A — Firestore onSnapshot  : system/app_version
 *     Persists for clients that open the app after the push.
 *
 *   Channel B — RTDB onValue          : /system/app_version
 *     Fires instantly (sub-second) for currently-open tabs.
 *     Preferred channel — fastest delivery.
 *
 *   Channel C — BroadcastChannel      : 'ntp-pwa-update'
 *     Same-browser, same-origin fallback for tabs already open.
 *
 * When any channel delivers a version string newer than APP_VERSION,
 * a dismissable update banner is shown at the top of the screen.
 * The user can reload immediately or dismiss to reload later.
 */
function _initUpdateWatcher() {
  // Debounce: only show the banner once per push, even if all 3 channels fire
  let _bannerShown = false;
  const _DISMISSED_KEY = 'nt-update-dismissed-ver';

  function _handle(payload) {
    if (_bannerShown) return;
    if (!payload?.version) return;
    if (payload.version === APP_VERSION) return;
    // If the user already dismissed THIS exact version, don't re-show on reload.
    // Only show again when admin pushes a NEWER version.
    try {
      if (localStorage.getItem(_DISMISSED_KEY) === String(payload.version)) return;
    } catch(e) {}
    _bannerShown = true;
    console.log('[Oasis] Update signal received:', payload.version, 'via', payload._channel || '?');

    // Route into the in-app notification system (bell icon) instead of
    // the intrusive top banner.  Mirror the same ready-check pattern used
    // by the SW update path so this works whether the DOM is ready or not.
    const _pushUpdateNotif = function() {
      if (window.notifPush) {
        const notes = payload.notes && payload.notes !== '—'
          ? payload.notes.slice(0, 120)
          : 'A new version is available. Reload to apply the latest update.';
        window.notifPush({
          id:      'app-update-' + payload.version,
          type:    'update',
          title:   'Oasis v' + payload.version + ' available',
          message: notes,
          time:    Date.now(),
          read:    false,
        });
      } else if (window._notifPushUpdate) {
        // Fallback to SW-style helper if notifPush isn't ready yet
        window._notifPushUpdate(payload.version);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _pushUpdateNotif, { once: true });
    } else {
      _pushUpdateNotif();
    }
  }

  // ── Channel A: Firestore onSnapshot ────────────────────────────────
  if (db) {
    try {
      const _verFSUnsub = db.collection('system').doc('app_version').onSnapshot((snap) => {
        if (snap.exists) {
          _handle({ ...snap.data(), _channel: 'Firestore' });
        }
      }, (err) => {
        console.warn('[Oasis] app_version Firestore listener error:', err);
      });
      if (!window._ntUnsubs) window._ntUnsubs = [];
      window._ntUnsubs.push(_verFSUnsub);
    } catch (e) { /* silently ignore if Firestore not ready */ }
  }

  // ── Channel B: RTDB onValue ────────────────────────────────────────
  if (rtdb) {
    try {
      const _appVerRef = rtdb.ref('/system/app_version');
      _appVerRef.on('value', (snap) => {
        const val = snap.val();
        if (val) _handle({ ...val, _channel: 'RTDB' });
      }, (err) => {
        console.warn('[Oasis] app_version RTDB listener error:', err);
      });
      if (!window._ntUnsubs) window._ntUnsubs = [];
      window._ntUnsubs.push(() => { try { _appVerRef.off('value'); } catch(e) {} });
    } catch (e) { /* silently ignore if RTDB not ready */ }
  }

  // ── Channel C: BroadcastChannel ────────────────────────────────────
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('ntp-pwa-update');
      bc.onmessage = (event) => {
        if (event.data?.type === 'UPDATE_AVAILABLE') {
          _handle({ ...event.data, _channel: 'BroadcastChannel' });
        }
      };
      // Keep reference so we can close it on pagehide
      window.addEventListener('pagehide', () => bc.close());
    } catch (e) { /* silently ignore if BroadcastChannel not supported */ }
  }
}

/**
 * Fetch developer profile (photo + role) from Firestore system/developer_profile
 * and update the About Oasis card.
 *
 * Firestore document path: system/developer_profile
 * Expected fields:
 *   photoURL  {string}  — publicly accessible image URL
 *   role      {string}  — role/title line
 */
var _devProfileCache = null;   // last known good data

function _applyDevProfile(data) {
  if (!data) return;
  _devProfileCache = data;

  // ── Role / title ─────────────────────────────────────────────────
  var roleEl = document.getElementById('adr-dev-role');
  if (roleEl) {
    var roleVal = data.role || data.Role || data.title || data.Title || '';
    if (roleVal) roleEl.textContent = roleVal.trim();
  }

  // ── Avatar ───────────────────────────────────────────────────────
  var avatarEl = document.getElementById('adr-dev-avatar');
  if (avatarEl) {
    var photoVal = data.photoURL || data.photo_url || data.photoUrl || data.image || '';
    if (photoVal && photoVal.trim()) {
      // Write directly — let the browser handle load/error naturally
      avatarEl.innerHTML =
        '<img src="' + photoVal.trim() + '" alt="Edison Taimu" ' +
        'style="width:100%;height:100%;object-fit:cover;border-radius:10px" ' +
        'onerror="this.parentElement.innerHTML=\'&#129489;\'">';
      avatarEl.style.padding = '0';
      avatarEl.style.fontSize = '0';
    }
  }

  console.log('[Oasis] Developer profile applied:', data);
}

function _fetchDeveloperProfile() {
  if (!db) {
    console.warn('[Oasis] _fetchDeveloperProfile: db not ready');
    return;
  }

  try {
    const _devUnsub = db.collection('system').doc('developer_profile')
      .onSnapshot(function (snap) {
        if (snap && snap.exists) {
          console.log('[Oasis] developer_profile snapshot received:', snap.data());
          _applyDevProfile(snap.data());
        } else {
          console.warn('[Oasis] developer_profile document does not exist or is empty');
        }
      }, function (err) {
        console.warn('[Oasis] developer_profile listener error:', err);
      });
    if (!window._ntUnsubs) window._ntUnsubs = [];
    window._ntUnsubs.push(_devUnsub);
  } catch (e) {
    console.warn('[Oasis] _fetchDeveloperProfile init error:', e);
  }
}



// Alias so the old call-site works regardless of mode
function initOfflineMode() {
  setStatus('offline', ' Local Storage — All data saved on this device');
  renderHistory();
}

// MODULE: UI CONTROLS

// ── TABS ─────────────────────────────────────────────────────
const TAB_META = {"calculator": {"label": "Adult Calculator", "accent": "var(--teal)"}, "pedi": {"label": "Pediatric", "accent": "var(--blue)"}, "enteral": {"label": "Enteral Feeding", "accent": "var(--amber)"}, "recall": {"label": "24-Hour Recall", "accent": "var(--blue)"}, "mealplan": {"label": "Meal Planner", "accent": "var(--green)"}, "database": {"label": "Food Database", "accent": "var(--teal)"}, "history": {"label": "History", "accent": "var(--text-dim)"}, "reference": {"label": "Reference", "accent": "var(--text-dim)"}, "parenteral": {"label": "Parenteral Nutrition", "accent": "#a78bfa"}, "anthro": {"label": "Anthropometry", "accent": "var(--teal)"}, "nfpe": {"label": "NFPE", "accent": "#f472b6"}, "news": {"label": "Nutrition News", "accent": "var(--teal)"}};

// ── Tab history for Back button ─────────────────────────────────
let _tabHistory = ['home'];

function _updateTabTopbar(tab) {
  // Remove existing topbar from ALL tabs (clean slate)
  document.querySelectorAll('.tab-topbar').forEach(el => el.remove());

  // Home has no topbar
  if (tab === 'home') return;

  const tabEl = document.getElementById('tab-' + tab);
  if (!tabEl) return;

  const meta  = TAB_META[tab] || { label: tab.toUpperCase(), accent: 'var(--teal)' };
  const prev  = _tabHistory.length > 1 ? _tabHistory[_tabHistory.length - 2] : 'home';
  const prevLabel = prev === 'home' ? 'Home' : (TAB_META[prev]?.label || 'Back');

  const bar = document.createElement('div');
  bar.className = 'tab-topbar';
  bar.innerHTML = `
    <button class="tab-topbar-back" onclick="switchTab('${prev}')" title="Back to ${prevLabel}">
      ← ${prevLabel}
    </button>
    <span class="tab-topbar-label" style="color:${meta.accent}">${meta.label}</span>
    <button class="tab-topbar-close" onclick="switchTab('home')" title="Close — go to Home">✕</button>
  `;

  // Insert as first child of the tab div
  tabEl.insertBefore(bar, tabEl.firstChild);
}

function switchTab(tab) {
  // Track active module for Firestore presence
  window._activeModule = tab;
  // Track tab navigation history for Back button
  if (typeof _tabHistory !== 'undefined' && _tabHistory[_tabHistory.length-1] !== tab) {
    _tabHistory.push(tab);
    if (_tabHistory.length > 10) _tabHistory.shift(); // cap history
  }
  // Deactivate all tabs (top nav + bottom nav)
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.main').forEach(m => m.classList.remove('active'));

  // Activate matching top-nav tab
  document.querySelectorAll('.tabs .tab').forEach(t => {
    if (t.getAttribute('onclick') === `switchTab('${tab}')`) t.classList.add('active');
  });
  // Activate matching bottom-nav tab + scroll it into view (mobile only)
  const _isDesktop = window.matchMedia('(min-width: 62em)').matches;
  document.querySelectorAll('.bottom-nav .tab').forEach(t => {
    if (t.getAttribute('onclick') === `switchTab('${tab}')`) {
      t.classList.add('active');
      // Horizontal scroll only needed on mobile — sidebar layout handles desktop
      if (!_isDesktop) {
        try {
          const nav = document.getElementById('bottom-nav-scroll');
          if (nav) {
            const tabLeft = t.offsetLeft;
            const tabWidth = t.offsetWidth;
            const navWidth = nav.offsetWidth;
            const scrollTarget = tabLeft - (navWidth / 2) + (tabWidth / 2);
            nav.scrollTo({ left: scrollTarget, behavior: 'smooth' });
          }
        } catch(e) {}
      }
    }
  });
  // Update fade indicators after scroll settles (mobile only)
  if (!_isDesktop) { try { _bnavUpdateFades(); } catch(e) {} }

  const el = document.getElementById('tab-' + tab);
  if (el) el.classList.add('active');
  if (tab === 'history')  renderHistory();
  if (tab === 'recall')   { try { recallSetMode(_recallTabMode); } catch(e){ renderRecallMeals(); } }
  if (tab === 'mealplan') { try { mpSetPlanMode(_mpPlanMode); } catch(e){} renderMpMeals(); setTimeout(() => { try { _ampAutoSync(); } catch(e){} }, 200); }
  if (tab === 'database') dbInit();
  if (tab === 'enteral')  { try { syncEnteralFromCalc(); } catch(e){} }
  if (tab === 'home')     renderHomePage();
  // Render back button topbar for this tab
  try { _updateTabTopbar(tab); } catch(e) {}
}

function renderHomePage() {
  // Stats counters
  const history = DataService.get('history') || [];
  const calcCountEl = document.getElementById('hp-calc-count');
  if (calcCountEl) calcCountEl.textContent = history.length;
  const savedCountEl = document.getElementById('hp-saved-count');
  if (savedCountEl) savedCountEl.textContent = history.length;

  // Recent activity list
  const list = document.getElementById('hp-recent-list');
  if (list) {
    const recent = history.slice().reverse().slice(0, 5);
    if (recent.length === 0) {
      list.innerHTML = '<div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:8px 0">No calculations yet.</div>';
    } else {
      list.innerHTML = recent.map(entry => {
        const diag = (entry.diagnosis || 'General').replace(/_/g, ' ');
        const meta = [
          entry.age    ? entry.age + 'y'      : '',
          entry.weight ? entry.weight + 'kg'  : '',
          entry.energy ? entry.energy + 'kcal': ''
        ].filter(Boolean).join(' · ');
        const ts = entry.savedAt ? (entry.savedAt.split(',')[0] || entry.savedAt) : '';
        return `<div style="background:var(--surface2);border-radius:6px;padding:8px 10px;font-family:var(--mono);font-size:11px;display:flex;justify-content:space-between;align-items:center">
          <span><span style="color:var(--teal);font-weight:700">${diag}</span>${meta ? ' <span style="color:var(--text-dim)">· ' + meta + '</span>' : ''}</span>
          ${ts ? '<span style="color:var(--text-dim);font-size:11px">' + ts + '</span>' : ''}
        </div>`;
      }).join('');
    }
  }

  // Profile card
  try { renderProfileCard(); } catch(e) {}
}

// ── #13 ICU QUICK PRESETS ────────────────────────────────────
const ICU_PRESETS = {
  icu:         { diagnosis:'general',  renal:'normal',  icu_phase:'early',    stress_factor:'1.2', feeding_route:'enteral' },
  ward:        { diagnosis:'general',  renal:'normal',  icu_phase:'recovery', stress_factor:'1.2', feeding_route:'oral'    },
  sepsis:      { diagnosis:'sepsis',   renal:'normal',  icu_phase:'early',    stress_factor:'1.4', feeding_route:'enteral' },
  ards:        { diagnosis:'ards',     renal:'normal',  icu_phase:'early',    stress_factor:'1.2', feeding_route:'enteral' },
  burns:       { diagnosis:'burns',    renal:'normal',  icu_phase:'late',     stress_factor:'1.6', feeding_route:'enteral' },
  pancreatitis:{ diagnosis:'pancreatitis',renal:'normal',icu_phase:'late',    stress_factor:'1.2', feeding_route:'enteral' },
  trauma:      { diagnosis:'trauma',   renal:'normal',  icu_phase:'early',    stress_factor:'1.4', feeding_route:'enteral' },
  renal:       { diagnosis:'general',  renal:'aki_rrt', icu_phase:'early',    stress_factor:'1.2', feeding_route:'enteral' },
};
function applyPreset(name) {
  const p = ICU_PRESETS[name]; if (!p) return;

  // 1. Switch to the Adult (calculator) tab — same behaviour as clicking it in the tab bar
  switchTab('calculator');

  // 2. Fill all preset fields
  Object.entries(p).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = val;
      // Fire change/input so dependent logic (toggleIC, etc.) responds
      el.dispatchEvent(new Event('change'));
      el.dispatchEvent(new Event('input'));
    }
  });

  // 3. Mark active preset button
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('preset-' + name);
  if (btn) btn.classList.add('active');

  // 4. Show burns card when relevant
  const burnsCard = document.getElementById('burns-card');
  if (burnsCard) burnsCard.style.display = name === 'burns' ? '' : 'none';

  // 5. Update any dependent UI (indirect calorimetry toggle etc.)
  toggleIC();

  // 6. Scroll the patient input section into view smoothly
  setTimeout(() => {
    const inputSection = document.getElementById('tab-calculator');
    if (inputSection) inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);

  // 7. Toast confirmation
  const labels = {
    icu:'ICU', ward:'General Ward', sepsis:'Sepsis', ards:'ARDS',
    burns:'Burns', pancreatitis:'Pancreatitis', trauma:'Trauma', renal:'Renal (CRRT)'
  };
  showToast(`✓ Preset loaded: ${labels[name] || name} — fill patient details & calculate`, 'info');
}


// ════════════════════════════════════════════════════════════════
// ACTIVITY STRIP — shows recent calculations + quick preset fallback
// Replaces the static Quick Preset row in the Adult calculator tab.
// Displays up to 5 recent sessions. Falls back to ICU presets when
// no history exists.
// ════════════════════════════════════════════════════════════════

const PRESET_PILLS = [
  { id:'icu',          label:'ICU' },
  { id:'ward',         label:'General Ward' },
  { id:'sepsis',       label:'Sepsis' },
  { id:'ards',         label:' ARDS' },
  { id:'burns',        label:'Burns' },
  { id:'pancreatitis', label:'Pancreatitis' },
  { id:'trauma',       label:' Trauma' },
  { id:'renal',        label:'Renal (CRRT)' },
];

function renderActivityStrip() {
  const strip = document.getElementById('activity-strip');
  if (!strip) return;

  const hist = (DataService.get('history') || []).slice().reverse().slice(0, 5);

  strip.innerHTML = '';

  if (hist.length > 0) {
    // ── RECENT ACTIVITY ──
    const label = document.createElement('span');
    label.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:1px;align-self:center;flex-shrink:0;white-space:nowrap';
    label.textContent = 'RECENT:';
    strip.appendChild(label);

    hist.forEach((entry, i) => {
      const diagLabel = (entry.diagnosis || 'General').replace(/_/g,' ');
      const age   = entry.age    ? `${entry.age}y`   : '';
      const wt    = entry.weight ? `${entry.weight}kg` : '';
      const kcal  = entry.energy ? `${entry.energy}kcal` : '';
      const meta  = [age, wt, kcal].filter(Boolean).join(' · ');

      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.title = `Reload: ${diagLabel} — ${meta}`;
      btn.innerHTML = `
        <span style="color:var(--teal);margin-right:3px">↺</span>
        <span style="font-weight:700">${diagLabel}</span>
        ${meta ? `<span style="opacity:0.55;font-size:11px;margin-left:4px">${meta}</span>` : ''}`;
      btn.onclick = () => loadHistoryItem(hist.length - 1 - i + (DataService.get('history')||[]).length - hist.length);

      // Smarter: load by ID
      btn.onclick = () => {
        const fullHist = (DataService.get('history') || []).slice().reverse();
        const match = fullHist.findIndex(h => h.id === entry.id);
        if (match !== -1) {
          const origIdx = (DataService.get('history') || []).length - 1 - match;
          loadHistoryItem(origIdx);
        }
      };
      strip.appendChild(btn);
    });

    // Separator
    const sep = document.createElement('span');
    sep.style.cssText = 'color:rgba(56,100,168,0.3);align-self:center;margin:0 6px;font-size:13px;flex-shrink:0';
    sep.textContent = '│';
    strip.appendChild(sep);

    // Presets label
    const pLabel = document.createElement('span');
    pLabel.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:1px;align-self:center;flex-shrink:0;white-space:nowrap';
    pLabel.textContent = 'PRESETS:';
    strip.appendChild(pLabel);

  } else {
    // ── NO HISTORY — show presets only ──
    const label = document.createElement('span');
    label.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:1px;align-self:center;flex-shrink:0;white-space:nowrap';
    label.textContent = 'QUICK PRESET:';
    strip.appendChild(label);
  }

  // Always append preset pills
  PRESET_PILLS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.id = 'preset-' + p.id;
    btn.textContent = p.label;
    btn.onclick = () => applyPreset(p.id);
    strip.appendChild(btn);
  });
}


// MODULE: HISTORY & EXPORT

// ── #15 PATIENT DATA PROTECTION ──────────────────────────────
// History stores only: patientId, age, diagnosis, results — NO full names.
// All reads/writes go through DataService — do NOT call localStorage directly.

/**
 * Save the current calculation result to local history.
 * Patient name is anonymised before storage for privacy.
 */
function saveToHistory() {
  if (!lastCalcData) { showToast('Run a calculation first', 'warning'); return; }

  const safeEntry = {
    patientId:    lastCalcData.patientName || '',
    patientName:  lastCalcData.patientName || '',
    age:          lastCalcData.age,
    sex:          lastCalcData.sex,
    diagnosis:    lastCalcData.diagnosis,
    weight:       lastCalcData.weight,
    heightCm:     lastCalcData.heightCm,
    bmi:          lastCalcData.bmi,
    energy:       lastCalcData.energy,
    protein:      lastCalcData.protein,
    netEnergy:    lastCalcData.netEnergy,
    proteinPerKg: lastCalcData.proteinPerKg,
    route:        lastCalcData.route,
    rfRisk:       lastCalcData.rfRisk,
    renal:        lastCalcData.renal,
    hepatic:      lastCalcData.hepatic,
    icuPhase:     lastCalcData.icuPhase,
    energyMethod: lastCalcData.energyMethod,
    id:           Date.now(),
    savedAt:      new Date().toLocaleString(),
  };

  // Persist via DataService (localStorage engine)
  DataService.addToList('history', safeEntry, 50);
  showToast('✓ Saved to history', 'success');
  try { renderActivityStrip(); } catch(e) {}

  // Refresh the history panel if it is currently visible
  if (document.getElementById('tab-history')?.classList.contains('active')) {
    renderHistory();
  }
}

/**
 * Render all saved history entries into the #history-panel element.
 * Newest entries appear first (DataService.addToList prepends).
 * Called on page load and whenever the History tab is opened.
 */
function renderHistory() {
  // Read history from DataService — single source of truth
  const hist = DataService.get('history') || [];
  const el   = document.getElementById('history-panel');
  if (!el) return;

  if (!hist.length) {
    el.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text-dim);font-family:var(--mono);font-size:12px">
      No saved calculations yet.<br>Run a calculation and press Save.
    </div>`;
    return;
  }

  // Build history cards — newest first
  el.innerHTML = hist.map((h, i) => `
    <div class="hist-item" onclick="loadHistoryItem(${i})">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap">
          <span style="font-family:var(--cond);font-size:14px;font-weight:700;color:var(--text-bright)">
            ${h.patientName || h.patientId || 'No name'}
          </span>
          <span class="hist-badge">${h.diagnosis || 'ICU'}</span>
        </div>
        <div class="hist-meta">
          ${h.savedAt} &nbsp;·&nbsp; Age ${h.age != null ? h.age : '—'}y &nbsp;·&nbsp; ${h.weight != null ? h.weight : '—'} kg &nbsp;·&nbsp; BMI ${h.bmi != null ? h.bmi : '—'}
        </div>
      </div>
      <div class="hist-vals">
        <div style="color:var(--teal);font-weight:700">${h.energy != null ? h.energy : '—'} kcal/day</div>
        <div style="color:var(--blue)">${h.protein != null ? h.protein : '—'} g protein</div>
        <div style="color:var(--text-dim);font-size:11px;margin-top:3px">${h.route || ''} · ${h.icuPhase || ''}</div>
      </div>
      <button class="hist-del" onclick="event.stopPropagation();deleteHistoryItem(${i})" title="Delete entry">✕</button>
    </div>`).join('');
}

// ── #11 EXPORT RESULTS CSV ─────────────────────────────────────
function exportResultsCSV() {
  if (!lastCalcData) { showToast('No results to export — run calculation first', 'warning'); return; }
  const d = lastCalcData;
  const fluidLow  = Math.round(25 * parseFloat(d.weight));
  const fluidHigh = Math.round(30 * parseFloat(d.weight));
  const headers = ['Field','Value'];
  const rows = [
    ['Export Date', new Date().toLocaleString()],
    ['Patient ID', d.patientName ? '[ANONYMISED]' : 'Anonymous'],
    ['Age (years)', d.age],
    ['Sex', d.sex],
    ['Weight (kg)', d.weight],
    ['Height (cm)', d.heightCm || '—'],
    ['BMI', d.bmi],
    ['Diagnosis', d.diagnosis],
    ['Renal Status', d.renal],
    ['Hepatic Status', d.hepatic],
    ['ICU Phase', d.icuPhase],
    ['Feeding Route', d.route],
    ['Energy Method', d.energyMethod],
    ['Total Energy Target (kcal/day)', d.energy],
    ['Net Feeding Energy (kcal/day)', d.netEnergy || '—'],
    ['Protein Target (g/day)', d.protein],
    ['Protein per kg (g/kg/day)', d.proteinPerKg || '—'],
    ['Fluid Requirement Low (mL/day)', fluidLow],
    ['Fluid Requirement High (mL/day)', fluidHigh],
    ['Refeeding Risk', d.rfRisk >= 2 ? 'HIGH' : d.rfRisk === 1 ? 'MODERATE' : 'LOW'],
  ];
  downloadCSV('nutrical_results_' + TODAY + '.csv', headers, rows);
}


// ── #11 PRINT WARD REPORT ─────────────────────────────────────
function exportDetailedReport() {
  if (!lastCalcData) { showToast('Run calculation first', 'warning'); return; }
  const d = lastCalcData;
  const fluidLow  = Math.round(25 * parseFloat(d.weight));
  const fluidHigh = Math.round(30 * parseFloat(d.weight));
  const win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(`<!DOCTYPE html><html><head><title>Oasis Report — ${new Date().toLocaleDateString()}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:28px;max-width:720px;margin:0 auto}
  h1{font-size:18px;color:#005e52;border-bottom:2px solid #005e52;padding-bottom:8px;margin-bottom:18px}
  h2{font-size:13px;color:#005e52;margin:18px 0 8px;text-transform:uppercase;letter-spacing:1px}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  td,th{padding:7px 10px;border:1px solid #ccd;text-align:left;font-size:11px}
  th{background:#e8f0f8;font-weight:700}
  .warning{background:#fff8e1;border:1px solid #f9a825;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:11px}
  .disclaimer{background:#fce4ec;border:1px solid #e91e63;border-radius:6px;padding:10px 14px;font-size:11px;margin-top:24px;color:#555}
  .val{font-weight:700;color:#005e52;font-size:14px}
  @media print{body{padding:12px}}
</style></head><body>
<h1> Oasis — Nutrition Report</h1>
<p style="color:#666;font-size:11px">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Session: ${SESSION_ID}</p>
<h2>Patient Summary</h2>
<table><tr><th>Field</th><th>Value</th></tr>
  <tr><td>Patient ID</td><td>${d.patientName ? '[ANONYMISED]' : 'Anonymous'}</td></tr>
  <tr><td>Age</td><td>${d.age} years</td></tr>
  <tr><td>Sex</td><td>${d.sex}</td></tr>
  <tr><td>Weight</td><td>${d.weight} kg</td></tr>
  <tr><td>BMI</td><td>${d.bmi} kg/m²</td></tr>
  <tr><td>Diagnosis</td><td>${d.diagnosis}</td></tr>
  <tr><td>Renal Status</td><td>${d.renal}</td></tr>
</table>
<h2>Nutrition Targets</h2>
<table><tr><th>Parameter</th><th>Value</th><th>Notes</th></tr>
  <tr><td>Total Energy</td><td class="val">${d.energy} kcal/day</td><td>Method: ${d.energyMethod}, Phase: ${d.icuPhase}</td></tr>
  <tr><td>Net Feeding Energy</td><td class="val">${d.netEnergy || d.energy} kcal/day</td><td>After propofol/IV calories subtracted</td></tr>
  <tr><td>Protein Target</td><td class="val">${d.protein} g/day</td><td>${d.proteinPerKg || '—'} g/kg/day (${d.renal || 'general'})</td></tr>
  <tr><td>Estimated Fluid Need</td><td class="val">${fluidLow}–${fluidHigh} mL/day</td><td>25–30 mL/kg/day (${d.weight} kg)</td></tr>
  <tr><td>Feeding Route</td><td>${d.route}</td><td></td></tr>
</table>
${d.rfRisk >= 2 ? `<div class="warning"> <strong>REFEEDING SYNDROME RISK (${d.rfRisk >= 2 ? 'HIGH' : 'MODERATE'}):</strong> Start at ${d.rfRisk >= 2 ? '5' : '10'} kcal/kg/day. IV Thiamine 200–300 mg BEFORE feeds. Monitor K⁺, PO₄, Mg²⁺ 2–3× daily.</div>` : ''}
<div class="disclaimer"> <strong>Clinical Decision Support Only.</strong> This report is generated by Oasis as a clinical decision support aid. All prescriptions and dietary interventions must be reviewed and authorised by a qualified dietitian or clinician before implementation. This document does not constitute a medical prescription.</div>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}
/**
 * Re-populate the calculator form with a previously saved entry and switch
 * back to the Calculator tab so the user can review / recalculate.
 * @param {number} idx  — index in the history list (0 = most recent)
 */
function loadHistoryItem(idx) {
  const hist = DataService.get('history') || [];
  const h = hist[idx];
  if (!h) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  set('age',          h.age);
  set('height',       h.heightCm);
  set('weight',       h.weight);
  set('diagnosis',    h.diagnosis);
  set('renal',        h.renal);
  set('hepatic',      h.hepatic);
  set('energy_method',h.energyMethod);
  set('icu_phase',    h.icuPhase);
  set('patient-name', h.patientName || '');
  if (h.sex) {
    const el = document.querySelector(`input[name="sex"][value="${h.sex}"]`);
    if (el) el.checked = true;
  }
  switchTab('calculator');
  showToast('Loaded: ' + (h.patientId || h.patientName || 'Previous calculation'));
}

/**
 * Delete a single history entry by index and refresh the panel.
 * @param {number} idx
 */
function deleteHistoryItem(idx) {
  const hist = DataService.get('history') || [];
  hist.splice(idx, 1);
  DataService.save('history', hist);
  renderHistory();
}

/** Delete all saved history after confirmation. */
function clearHistory() {
  if (!confirm('Delete all saved calculations?')) return;
  DataService.clear('history');
  renderHistory();
  try { renderActivityStrip(); } catch(e) {}
  showToast('History cleared');
}

/** Export all history entries as a JSON download. */
function exportHistory() {
  const hist = DataService.get('history') || [];
  if (!hist.length) { showToast('No history to export', 'warning'); return; }
  const blob = new Blob([JSON.stringify(hist, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'nutri_history.json' });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('History exported as JSON', 'success');
}

/** Export all history entries as a CSV download. */
function exportHistoryCSV() {
  const hist = DataService.get('history') || [];
  if (!hist.length) { showToast('No history to export', 'warning'); return; }
  const headers = ['Saved At','Patient','Age','Weight(kg)','Height(cm)','BMI','Diagnosis','Energy(kcal)','Protein(g)','Route','RF Risk'];
  const rows    = hist.map(h => [h.savedAt, h.patientId || '', h.age, h.weight, h.heightCm || '', h.bmi, h.diagnosis, h.energy, h.protein, h.route, h.rfRisk]);
  downloadCSV('nutri_history.csv', headers, rows);
}
// ════════════════════════════════════════════════════════════════

// ── Keyboard activation for the tab bars ───────────────────────
// The top tab bar (.tabs) and bottom nav (.bottom-nav) use
// <div role="button" tabindex="0" onclick="..."> for their tab
// items — a real <button> couldn't be used because of the custom
// flex/underline layout, but that means Enter/Space do nothing by
// default the way they would on a native button. This delegates
// keydown on the two nav containers and simulates a click, so the
// tabs are actually operable from a keyboard or switch device, not
// just decorated with role="button" for show.
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const target = e.target.closest('.tabs [role="button"], .bottom-nav [role="button"]');
  if (!target) return;
  e.preventDefault();
  target.click();
});
