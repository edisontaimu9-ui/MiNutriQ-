// MODULE: PUSH NOTIFICATIONS
// Self-contained; no VAPID server required for local/browser
// notifications.  A VAPID key can be injected later by setting
//   window.NT_VAPID_PUBLIC_KEY = '<base64url key>';
// before this module runs to enable true Web Push.
// ═══════════════════════════════════════════════════════════════

// VAPID public key — generated for this deployment
window.NT_VAPID_PUBLIC_KEY = 'BAKpV7-Tpqvvoxt934v69Dy5ahqZUilbrC3yOEr68hTzqDQ6y9pa1mRz7vqa5xRKja49riUXQqOH9a5pLKfVqzo';



/** Initialise push support once the SW registration is available */
async function _initPushNotifications(reg) {
  if (!('Notification' in window) || !('PushManager' in window)) return;

  // Restore saved preference
  const pref = _ntPushPref();
  _updateNotifSettingsUI(pref.enabled ? 'granted' : Notification.permission);

  // If user previously enabled AND browser permission is granted, re-subscribe
  if (pref.enabled && Notification.permission === 'granted') {
    await _ensurePushSubscription(reg).catch(() => {});
  }
}

/**
 * Periodic Background Sync — Chromium-only, and only fires once the app
 * is installed as a PWA (browser tabs never get periodic sync). Silently
 * no-ops everywhere else, including iOS Safari.
 * Registers a 'news-refresh' tag so js/oasis-news.js has a warm cache
 * by the time the user opens the News tab.
 */
async function _initPeriodicSync(reg) {
  if (!('periodicSync' in reg)) return;
  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state !== 'granted') return;
    await reg.periodicSync.register('news-refresh', {
      minInterval: 12 * 60 * 60 * 1000, // 12h — browser treats this as a floor, not a guarantee
    });
  } catch (_) { /* unsupported or denied — safe to ignore */ }
}

/**
 * One-off Background Sync helper — call this from a failed fetch's
 * .catch() to have the browser retry automatically once connectivity
 * returns, instead of just showing an error. No-ops if unsupported.
 * Usage: _registerBackgroundSync('news-crawl-retry')
 */
window._registerBackgroundSync = async function(tag) {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!('sync' in reg)) return false;
    await reg.sync.register(tag);
    return true;
  } catch (_) { return false; }
};

/** Read / write the persisted notification preference */
function _ntPushPref(update) {
  const KEY = 'nt_push_pref';
  if (update !== undefined) {
    try { localStorage.setItem(KEY, JSON.stringify(update)); } catch(_) {}
    return update;
  }
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(_) { return {}; }
}

/**
 * PUBLIC API – request permission and subscribe.
 * Called from the Settings drawer "Enable" button.
 */
window.ntRequestNotifications = async function() {
  if (!('Notification' in window)) {
    showToast && showToast('Your browser does not support notifications', 'info');
    return;
  }
  const permission = await Notification.requestPermission();
  _updateNotifSettingsUI(permission);

  if (permission === 'granted') {
    _ntPushPref({ enabled: true });
    const reg = await navigator.serviceWorker.ready;
    await _ensurePushSubscription(reg).catch(() => {});
    showToast && showToast(' Notifications enabled!', 'success');
  } else if (permission === 'denied') {
    showToast && showToast('Notifications blocked — enable in browser settings', 'info');
  }
};

/** Disable / unsubscribe */
window.ntDisableNotifications = async function() {
  _ntPushPref({ enabled: false });
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch(_) {}
  _updateNotifSettingsUI(Notification.permission);
  showToast && showToast(' Notifications disabled', 'info');
};

/** Send a test notification to confirm everything is working */
window.ntTestNotification = async function() {
  if (Notification.permission !== 'granted') {
    showToast && showToast('Enable notifications first', 'info');
    return;
  }
  await ntShowNotification(' Oasis', 'Push notifications are working correctly!', {
    tag:  'nt-test',
    data: { url: location.href },
  });
  showToast && showToast('Test notification sent!', 'success');
};

/**
 * Show a notification via the SW (preferred) or the Notification API.
 * @param {string} title
 * @param {string} body
 * @param {object} [opts]
 */
window.ntShowNotification = async function(title, body, opts = {}) {
  if (Notification.permission !== 'granted') return;
  const defaults = { icon: '', badge: '', vibrate: [150, 60, 150], tag: 'nt-app' };
  const options  = { ...defaults, ...opts, body };
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, options);
  } catch(_) {
    // Fallback: direct Notification API (no SW required)
    try { new Notification(title, options); } catch(__) {}
  }
};

/**
 * Obtain / renew a PushSubscription.
 * If NT_VAPID_PUBLIC_KEY is set it performs a real Web Push subscription;
 * otherwise it just verifies the SW push manager is available.
 */
async function _ensurePushSubscription(reg) {
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  const subOpts = { userVisibleOnly: true };
  if (window.NT_VAPID_PUBLIC_KEY) {
    subOpts.applicationServerKey = _urlBase64ToUint8Array(window.NT_VAPID_PUBLIC_KEY);
  }
  const sub = await reg.pushManager.subscribe(subOpts);
  // Persist subscription JSON for potential server-side use
  try { localStorage.setItem('nt_push_sub', JSON.stringify(sub.toJSON())); } catch(_) {}
  return sub;
}

/** Update the notification settings UI to reflect current state */
function _updateNotifSettingsUI(permission) {
  const pref = _ntPushPref();
  const enabled = permission === 'granted' && pref.enabled;

  const statusEl  = document.getElementById('nt-notif-status');
  const enableBtn = document.getElementById('nt-notif-enable-btn');
  const disableBtn= document.getElementById('nt-notif-disable-btn');
  const testBtn   = document.getElementById('nt-notif-test-btn');

  if (!statusEl) return;   // UI not rendered yet

  if (permission === 'denied') {
    statusEl.textContent  = ' Blocked by browser';
    statusEl.style.color  = 'var(--red,#fb7185)';
  } else if (enabled) {
    statusEl.textContent  = ' Enabled';
    statusEl.style.color  = 'var(--green,#4ade80)';
  } else {
    statusEl.textContent  = '○ Off';
    statusEl.style.color  = 'var(--text-dim)';
  }

  if (enableBtn)  enableBtn.style.display  = enabled ? 'none' : 'inline-flex';
  if (disableBtn) disableBtn.style.display = enabled ? 'inline-flex' : 'none';
  if (testBtn)    testBtn.style.display    = enabled ? 'inline-flex' : 'none';
}

/** VAPID base64url → Uint8Array helper */
function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Run UI refresh once DOM is ready (handles page reload with existing pref)
document.addEventListener('DOMContentLoaded', () => {
  if (!('Notification' in window) || !('PushManager' in window)) {
    const unsupEl = document.getElementById('nt-notif-unsupported');
    if (unsupEl) unsupEl.style.display = 'block';
    const enableBtn = document.getElementById('nt-notif-enable-btn');
    if (enableBtn) enableBtn.style.display = 'none';
    _updateNotifSettingsUI('unsupported');
    return;
  }
  _updateNotifSettingsUI(Notification.permission);
});

// ── BOTTOM NAV SCROLL FADE INDICATORS ────────────────────────
window._bnavUpdateFades = function() {
  // Fade indicators only needed on mobile (horizontal scroll nav)
  if (window.matchMedia('(min-width: 62em)').matches) return;
  const nav = document.getElementById('bottom-nav-scroll');
  const fadeL = document.getElementById('bnav-fade-left');
  const fadeR = document.getElementById('bnav-fade-right');
  if (!nav || !fadeL || !fadeR) return;
  const atLeft  = nav.scrollLeft <= 2;
  const atRight = nav.scrollLeft >= (nav.scrollWidth - nav.clientWidth - 2);
  fadeL.classList.toggle('visible', !atLeft);
  fadeR.classList.toggle('visible', !atRight);
};

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('bottom-nav-scroll');
  if (!nav) return;
  nav.addEventListener('scroll', window._bnavUpdateFades, { passive: true });
  // Initial check after modules have injected their tabs
  setTimeout(window._bnavUpdateFades, 600);
});



// ═══════════════════════════════════════════════════════════════
