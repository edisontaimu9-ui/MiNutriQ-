
// ── calculateBMI guard — defined in pediNutrition.js; redefined here
// so main.js is self-contained if load order ever changes.
if (typeof calculateBMI !== 'function') {
  function calculateBMI(weightKg, heightCm) {
    const h = heightCm / 100;
    return +(weightKg / (h * h)).toFixed(1);
  }
}

// ═══════════════════════════════════════════════════════════════
// MODULE: GLOBAL ERROR HANDLING
// Catches unhandled JS errors and promise rejections.
// Shows a recovery overlay instead of silent failure.
// Module-level errors are isolated so one broken tab can't
// crash the entire app — other calculators keep working.
// ═══════════════════════════════════════════════════════════════
(function _installErrorHandlers() {
  'use strict';

  // ── Internal error log (ring buffer, max 30) ────────────────
  const _errLog = [];
  const _MAX_ERR = 30;

  function _record(type, msg, src, line, col, err) {
    const entry = {
      t:    Date.now(),
      type: type,
      msg:  String(msg).slice(0, 400),
      src:  String(src || '').replace(/blob:[^?]+/, 'blob:<sw>'),
      line: line || 0,
      col:  col  || 0,
      stack: err && err.stack ? String(err.stack).slice(0, 600) : '',
    };
    _errLog.unshift(entry);
    if (_errLog.length > _MAX_ERR) _errLog.length = _MAX_ERR;
    return entry;
  }

  // ── Decide if an error is "fatal" enough to surface ────────
  // We suppress noisy 3rd-party / network / extension errors.
  function _isSuppressed(msg, src) {
    const noise = [
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'Cannot redefine property: googletag',
      'Script error.',
      'NetworkError',
    ];
    return noise.some(n => String(msg).includes(n) || String(src).includes(n));
  }

  // ── Overlay ─────────────────────────────────────────────────
  let _overlay = null;

  function _createOverlay(entry) {
    if (_overlay) _overlay.remove();

    const o = document.createElement('div');
    o.id = 'nt-error-overlay';
    o.setAttribute('role', 'alertdialog');
    o.setAttribute('aria-modal', 'true');
    o.setAttribute('aria-label', 'Application error');
    o.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2000000',
      'background:rgba(2,6,23,0.92)',
      'backdrop-filter:blur(6px)',
      '-webkit-backdrop-filter:blur(6px)',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'padding:24px', 'font-family:-apple-system,"Segoe UI",system-ui,sans-serif',
      'animation:nt-err-in .22s ease',
    ].join(';');

    o.innerHTML = [
      '<style>',
      '@keyframes nt-err-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}',
      '#nt-error-overlay .nt-ec{background:#0f172a;border:1px solid rgba(239,68,68,.35);',
      'border-radius:16px;max-width:440px;width:100%;padding:28px 24px;',
      'box-shadow:0 8px 48px rgba(0,0,0,.7)}',
      '#nt-error-overlay .nt-eh{display:flex;align-items:center;gap:12px;margin-bottom:16px}',
      '#nt-error-overlay .nt-ei{font-size:26px;flex-shrink:0}',
      '#nt-error-overlay .nt-et{font-family:ui-monospace,"SF Mono",monospace;font-size:11px;',
      'font-weight:700;letter-spacing:2px;color:rgba(239,68,68,.9);text-transform:uppercase}',
      '#nt-error-overlay .nt-em{font-size:13px;color:#e2e8f0;line-height:1.6;margin-bottom:4px}',
      '#nt-error-overlay .nt-es{font-family:ui-monospace,"SF Mono",monospace;font-size:11px;',
      'color:rgba(148,163,184,.7);line-height:1.5;word-break:break-all}',
      '#nt-error-overlay .nt-ed{background:rgba(0,0,0,.4);border:1px solid rgba(56,100,168,.3);',
      'border-radius:8px;padding:10px 12px;margin:14px 0 0;',
      'font-family:ui-monospace,"SF Mono",monospace;font-size:11px;',
      'color:rgba(100,130,165,.8);line-height:1.6;max-height:100px;overflow:auto;',
      'white-space:pre-wrap;word-break:break-all}',
      '#nt-error-overlay .nt-ebtns{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}',
      '#nt-error-overlay .nt-btn{font-family:ui-monospace,"SF Mono",monospace;font-size:11px;',
      'font-weight:700;letter-spacing:1.2px;padding:9px 18px;border-radius:8px;',
      'cursor:pointer;border:none;transition:opacity .15s;text-transform:uppercase}',
      '#nt-error-overlay .nt-btn-p{background:#1de9d4;color:#020617}',
      '#nt-error-overlay .nt-btn-s{background:transparent;border:1px solid rgba(148,163,184,.3)!important;color:rgba(148,163,184,.8)}',
      '#nt-error-overlay .nt-btn:hover{opacity:.8}',
      '</style>',
      '<div class="nt-ec">',
      '  <div class="nt-eh">',
      '    <span class="nt-ei"></span>',
      '    <div>',
      '      <div class="nt-et">Unexpected Error</div>',
      '      <div class="nt-em">' + _esc(entry.msg || 'An unexpected error occurred.') + '</div>',
      '    </div>',
      '  </div>',
      entry.src ? '<div class="nt-es"> ' + _esc(entry.src) + (entry.line ? ' : ' + entry.line : '') + '</div>' : '',
      entry.stack ? '<details><summary style="font-family:ui-monospace,monospace;font-size:11px;color:rgba(100,130,165,.6);cursor:pointer;margin-top:8px">Show stack trace</summary><div class="nt-ed">' + _esc(entry.stack) + '</div></details>' : '',
      '  <div class="nt-ebtns">',
      '    <button class="nt-btn nt-btn-p" onclick="location.reload()">↺ Reload App</button>',
      '    <button class="nt-btn nt-btn-s" onclick="document.getElementById(\'nt-error-overlay\').remove()">Dismiss</button>',
      '  </div>',
      '  <div style="margin-top:14px;font-family:ui-monospace,monospace;font-size:11px;color:rgba(100,130,165,.45);letter-spacing:1px">',
      '    OASIS · ERROR · ' + new Date().toISOString(),
      '  </div>',
      '</div>',
    ].join('');

    document.body.appendChild(o);
    _overlay = o;
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── window.onerror ──────────────────────────────────────────
  window.onerror = function(msg, src, line, col, err) {
    if (_isSuppressed(msg, src)) return false;
    const entry = _record('onerror', msg, src, line, col, err);
    console.error('[Oasis] Uncaught error:', msg, src + ':' + line);
    // Defer so the DOM is ready
    if (document.body) {
      _createOverlay(entry);
    } else {
      document.addEventListener('DOMContentLoaded', function() { _createOverlay(entry); }, { once: true });
    }
    return true; // prevent default browser error UI
  };

  // ── unhandledrejection ──────────────────────────────────────
  window.addEventListener('unhandledrejection', function(ev) {
    const reason = ev.reason;
    const msg    = reason instanceof Error ? reason.message : String(reason);
    const src    = reason instanceof Error && reason.stack
                 ? reason.stack.split('\n')[1] || '' : '';
    if (_isSuppressed(msg, src)) return;
    // Ignore benign Firebase / network aborted rejections
    if (/permission-denied|unavailable|Failed to fetch|Load failed/i.test(msg)) return;
    _record('unhandledrejection', msg, src, 0, 0, reason instanceof Error ? reason : null);
    console.warn('[Oasis] Unhandled promise rejection:', msg);
    // Don't overlay for promise rejections — too noisy; log only.
    ev.preventDefault();
  });

  // ── Module-level error isolator ─────────────────────────────
  // Wrap a function so its errors are caught + toasted, not
  // propagated. Keeps other tabs alive if one module crashes.
  window.ntSafe = function(fn, moduleName) {
    return function() {
      try {
        return fn.apply(this, arguments);
      } catch (err) {
        console.error('[Oasis][' + (moduleName || 'module') + '] Error:', err);
        if (typeof showToast === 'function') {
          showToast(' ' + (moduleName || 'Module') + ' error — see console', 'error', 4000);
        }
        _record('module', err.message, moduleName, 0, 0, err);
      }
    };
  };

  // ── Public API ───────────────────────────────────────────────
  window.ntErrorLog = function() { return _errLog.slice(); };
  window.ntClearErrors = function() { _errLog.length = 0; if (_overlay) _overlay.remove(); };
})();

// MODULE: GLOBALS & STATE
const SESSION_ID = 'S_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substr(2,5).toUpperCase();
const TODAY = new Date().toISOString().split('T')[0];
let calcCount = 0, lastCalcData = null, currentUnits = 'metric';

// ── Universal cross-calculator sync registry ─────────────────
// All calculators write their results here so any module can sync from any source.
let lastPediCalcData = null;   // stores last pediatric result

const CALC_SOURCES = {
  adult:   { label: 'Adult Calculator',      get: () => lastCalcData },
  pedi:    { label: 'Pediatric Calculator',  get: () => lastPediCalcData },
};

/**
 * Returns a unified requirements object {energy, protein, weight, fluid, label, source}
 * from whichever source has the most recent data.
 */
function getUniversalCalcData() {
  // Prefer whichever has data; adult takes priority if both have data
  const adult = CALC_SOURCES.adult.get();
  const pedi  = CALC_SOURCES.pedi.get();
  if (adult && adult.energy) return { ...adult, source: 'adult', label: CALC_SOURCES.adult.label };
  if (pedi  && pedi.energy)  return { ...pedi,  source: 'pedi',  label: CALC_SOURCES.pedi.label  };
  return null;
}
let currentSettings = {};
document.getElementById('sb-session').textContent = SESSION_ID;

// ═══════════════════════════════════════════════════════════════
// HSCROLL — Horizontal Scroll Utility System
// ───────────────────────────────────────────────────────────────
// attachHScroll(wrapEl)
//   Wires up a .hscroll-wrap element:
//   • Creates left/right arrow buttons
//   • Adds scroll-state classes (can-scroll-left/right) for fade edges
//   • Handles keyboard left/right arrow navigation
//   • Handles touch-momentum (CSS handles the rest)
//
// buildHScrollWrap(trackEl, opts)
//   Convenience: wraps an existing element in .hscroll-wrap markup,
//   calls attachHScroll, and returns the wrapper.
//
// hscrollReinit()
//   Re-scans DOM for any .hscroll-wrap that hasn't been initialised
//   yet — call after dynamic content renders.
// ═══════════════════════════════════════════════════════════════

const _hscrollInitSet = new WeakSet();

function attachHScroll(wrapEl) {
  if (!wrapEl || _hscrollInitSet.has(wrapEl)) return;
  _hscrollInitSet.add(wrapEl);

  const track = wrapEl.querySelector('.hscroll');
  if (!track) return;

  // ── Create arrow buttons ──────────────────────────────────────
  const btnL = document.createElement('button');
  const btnR = document.createElement('button');
  btnL.className = 'hscroll-btn hscroll-btn-l';
  btnR.className = 'hscroll-btn hscroll-btn-r';
  btnL.setAttribute('aria-label', 'Scroll left');
  btnR.setAttribute('aria-label', 'Scroll right');
  btnL.innerHTML = '&#8249;';   // ‹
  btnR.innerHTML = '&#8250;';   // ›
  wrapEl.appendChild(btnL);
  wrapEl.appendChild(btnR);

  // ── Scroll distance = 80 % of track width ────────────────────
  const scrollStep = () => Math.max(180, track.clientWidth * 0.78);

  btnL.addEventListener('click', () => {
    track.scrollBy({ left: -scrollStep(), behavior: 'smooth' });
  });
  btnR.addEventListener('click', () => {
    track.scrollBy({ left:  scrollStep(), behavior: 'smooth' });
  });

  // ── Update edge classes + button disabled state ───────────────
  function updateState() {
    const sl   = track.scrollLeft;
    const max  = track.scrollWidth - track.clientWidth;
    const atL  = sl <= 2;
    const atR  = sl >= max - 2;
    wrapEl.classList.toggle('can-scroll-left',  !atL);
    wrapEl.classList.toggle('can-scroll-right', !atR && max > 4);
    btnL.disabled = atL;
    btnR.disabled = atR || max <= 4;
  }

  track.addEventListener('scroll', updateState, { passive: true });

  // ResizeObserver keeps buttons in sync when layout changes
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(updateState).observe(track);
  }

  updateState();   // initial state

  // ── Keyboard navigation ───────────────────────────────────────
  track.setAttribute('tabindex', '0');
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { track.scrollBy({ left: -scrollStep(), behavior: 'smooth' }); e.preventDefault(); }
    if (e.key === 'ArrowRight') { track.scrollBy({ left:  scrollStep(), behavior: 'smooth' }); e.preventDefault(); }
    if (e.key === 'Home')       { track.scrollTo({ left: 0,                     behavior: 'smooth' }); e.preventDefault(); }
    if (e.key === 'End')        { track.scrollTo({ left: track.scrollWidth,     behavior: 'smooth' }); e.preventDefault(); }
  });
}

/** Re-scan DOM and attach scroll logic to any uninitialised wrappers. */
function hscrollReinit() {
  document.querySelectorAll('.hscroll-wrap').forEach(attachHScroll);
}

// Auto-init on DOMContentLoaded + after each dynamic render cycle
document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(hscrollReinit));
// Also reinit 400 ms later to catch lazy-rendered panels
document.addEventListener('DOMContentLoaded', () => setTimeout(hscrollReinit, 400));

// ─────────────────────────────────────────────────────────────
// DATA SERVICE — All storage operations go through this object.
//
// Offline engine: localStorage.
// To reconnect Firebase later:
//   1. Set USE_FIREBASE = true
//   2. Restore Firebase SDK script tags
//   3. Replace the localStorage calls below with Firestore equivalents
// ─────────────────────────────────────────────────────────────
const DataService = {
  save(key, data) {
    try {
      localStorage.setItem('nc_' + key, JSON.stringify(data));
    } catch (e) {
      console.warn('[DataService] save failed:', e);
    }
  },

  get(key) {
    try {
      const raw = localStorage.getItem('nc_' + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[DataService] get failed:', e);
      return null;
    }
  },

  addToList(key, item, limit = 50) {
    try {
      const list = this.get(key) || [];
      list.unshift(item);
      if (list.length > limit) list.length = limit;
      this.save(key, list);
    } catch (e) {
      console.warn('[DataService] addToList failed:', e);
    }
  },

  clear(key) {
    try {
      localStorage.removeItem('nc_' + key);
    } catch (e) {
      console.warn('[DataService] clear failed:', e);
    }
  },
};

// ── #12 PWA — INLINE SERVICE WORKER & MANIFEST ────────────────

/**
 * Global application state — single source of truth for current calc data.
 * UI reads from appState instead of re-reading DOM elements.
 * Updated by calculate() and cleared by clearAll().
 */
const appState = {
  /** @type {Object|null} Latest calculation payload */
  lastCalc: null,
  /** @type {string} Current active tab */
  activeTab: 'calculator',
  /** @type {number} Session calculation count */
  calcCount: 0,
  /** @type {boolean} Backend connected (always false in offline mode) */
  dbConnected: false,
};

(function initPWA() {
  // ── Manifest ────────────────────────────────────────────────
  // PNG icons now live as static assets in /icons — no more inline
  // base64 blobs. Referencing them directly means the browser can
  // cache them like any other image and main.js stays lean.
  (function assignIconURLs() {
    var ICON_BASE = '/icons/';
    window.iconPNG48URL  = ICON_BASE + 'icon-48.png';
    window.iconPNG72URL  = ICON_BASE + 'icon-72.png';
    window.iconPNG96URL  = ICON_BASE + 'icon-96.png';
    window.iconPNG128URL = ICON_BASE + 'icon-128.png';
    window.iconPNG144URL = ICON_BASE + 'icon-144.png';
    window.iconPNG152URL = ICON_BASE + 'icon-152.png';
    window.iconPNG192URL = ICON_BASE + 'icon-192.png';
    window.iconPNG384URL = ICON_BASE + 'icon-384.png';
    window.iconPNG512URL = ICON_BASE + 'icon-512.png';
  })();

  // ── Service Worker — Network-first with offline fallback ────
  // ── Service Worker — /sw.js (extracted from inline blob pattern) ──────
  if ('serviceWorker' in navigator) {

    // ── Version tracking ─────────────────────────────────────────────────
    // sw.js is registered with ?v=APP_VERSION so the browser detects real
    // updates via URL change (no more ephemeral blob: URL churn).
    const _SW_VER_KEY       = 'nt-sw-ver';
    const _SW_DISMISSED_KEY = 'nt-sw-update-dismissed';
    const _lastSwVer        = localStorage.getItem(_SW_VER_KEY);
    const _isRealUpdate     = !!_lastSwVer && _lastSwVer !== APP_VERSION;
    let _reloadOnController = false;

    // ── Update notification helpers (replaces old update banner) ──────
    function _showUpdateBar(waitingWorker) {
      // Push into the in-app notification system instead of a top banner
      if (window._notifPushUpdate) {
        window._notifPushUpdate('v' + APP_VERSION);
      } else {
        // Fallback: queue until notification system is ready
        document.addEventListener('DOMContentLoaded', function() {
          if (window._notifPushUpdate) window._notifPushUpdate('v' + APP_VERSION);
        });
      }
      // Auto-apply new SW (no disruptive banner)
      waitingWorker.postMessage('skipWaiting');
    }

    // ── Register /sw.js with version query param ────────────────────────
    navigator.serviceWorker.register('/sw.js?v=' + APP_VERSION, { scope: '/' }).then(reg => {

      localStorage.setItem(_SW_VER_KEY, APP_VERSION);

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state !== 'installed') return;
          if (!navigator.serviceWorker.controller) return; // first install
          if (_isRealUpdate) {
            _showUpdateBar(nw);
          } else {
            nw.postMessage('skipWaiting');
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (_reloadOnController) {
          _reloadOnController = false;
          window.location.reload();
        }
      });

      navigator.serviceWorker.ready.then(() => {
        _initPushNotifications(reg);
        _initPeriodicSync(reg);
      });

    }).catch(() => {});
  }

  // ── Install prompt — full modal ───────────────────────────

  // Detect if already running as installed PWA (all platforms)
  const _isStandalone = window.matchMedia('(display-mode: standalone)').matches
                     || window.navigator.standalone === true;

  // If already installed as PWA, expose no-ops and bail out early
  if (_isStandalone) {
    window.pwaInstall   = function() {};
    window.pwaHideBanner = function() {};
  } else {

  let _deferredPrompt = null;

  // Android / Desktop Chrome: capture the native install prompt
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredPrompt = e;
    _showInstallChip();
    _showInstallBanner();
  });

  // Fires after successful installation on any platform
  window.addEventListener('appinstalled', () => {
    _hideInstallChip();
    _hideInstallBanner(true);
    _deferredPrompt = null;
    if (typeof showToast === 'function') showToast(' Oasis installed!', 'success');
  });

  // ── Header chip ────────────────────────────────────────────
  function _showInstallChip() {
    if (document.getElementById('pwa-install-chip')) return;
    const chip = document.createElement('button');
    chip.id = 'pwa-install-chip';
    chip.innerHTML = '⬇&nbsp;Install';
    chip.setAttribute('aria-label', 'Install Oasis');
    chip.style.cssText = [
      'font-family:var(--mono)', 'font-size:11px', 'font-weight:700', 'letter-spacing:.8px',
      'color:var(--teal)', 'background:rgba(29,233,212,0.08)',
      'border:1px solid rgba(29,233,212,0.35)', 'border-radius:20px',
      'padding:5px 13px', 'cursor:pointer', 'white-space:nowrap', 'flex-shrink:0',
      'transition:background .2s,border-color .2s',
    ].join(';');
    chip.onmouseenter = () => { chip.style.background = 'rgba(29,233,212,0.18)'; chip.style.borderColor = 'var(--teal)'; };
    chip.onmouseleave = () => { chip.style.background = 'rgba(29,233,212,0.08)'; chip.style.borderColor = 'rgba(29,233,212,0.35)'; };
    chip.addEventListener('click', () => window.pwaInstall());
    const hdr = document.querySelector('.header-right');
    if (hdr) hdr.insertBefore(chip, hdr.firstChild);
  }

  function _hideInstallChip() {
    document.getElementById('pwa-install-chip')?.remove();
  }

  // ── Home-page banner ───────────────────────────────────────
  function _showInstallBanner() {
    try { if (localStorage.getItem('pwa-banner-dismissed')) return; } catch(e) {}
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.add('visible');
  }

  function _hideInstallBanner(persist) {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.remove('visible');
    if (persist) {
      try { localStorage.setItem('pwa-banner-dismissed', '1'); } catch(e) {}
    }
  }

  // Expose dismiss for the banner's ✕ button
  window.pwaHideBanner = function(persist) { _hideInstallBanner(persist); };

  // ── Native install trigger ─────────────────────────────────
  window.pwaInstall = async function() {
    if (_deferredPrompt) {
      // Capture prompt reference before nulling (fix: prompt is checked inside modal
      // template literals which evaluate after we null the outer reference)
      const prompt = _deferredPrompt;
      _deferredPrompt = null;
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        _hideInstallChip();
        _hideInstallBanner(true);
      } else {
        // User dismissed — restore so they can try again later
        _deferredPrompt = prompt;
      }
    } else {
      // iOS or prompt already consumed — show manual guide modal
      _showInstallModal();
    }
  };

  // ── Manual guide modal (iOS + fallback) ────────────────────
  function _showInstallModal() {
    if (document.getElementById('pwa-install-modal')) return;
    const isIOS     = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari  = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    // Can we offer a direct install button? Only if the deferred prompt is still available.
    const canPrompt = !isIOS && !!_deferredPrompt;

    const modal = document.createElement('div');
    modal.id = 'pwa-install-modal';
    modal.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'background:rgba(2,6,23,0.88)', 'backdrop-filter:blur(8px)',
      'display:flex', 'align-items:flex-end', 'justify-content:center', 'padding:16px',
    ].join(';');

    const stepRow = (n, html) => `
      <div style="display:flex;align-items:center;gap:12px;background:rgba(8,18,36,0.6);border:1px solid var(--border);border-radius:10px;padding:12px 14px">
        <div style="width:32px;height:32px;background:rgba(29,233,212,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;font-family:var(--mono);font-weight:700;color:var(--teal);flex-shrink:0">${n}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--text);line-height:1.6">${html}</div>
      </div>`;

    let stepsHtml;
    if (isIOS && isSafari) {
      stepsHtml = `
        <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);line-height:2;margin-bottom:14px">To install on iPhone / iPad:</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${stepRow(1, `Tap the <strong style="color:var(--teal)">Share</strong> button <span style="font-size:14px">⎙</span> in Safari's toolbar`)}
          ${stepRow(2, `Scroll down and tap <strong style="color:var(--teal)">Add to Home Screen</strong> <span style="font-size:14px">＋</span>`)}
          ${stepRow(3, `Tap <strong style="color:var(--teal)">Add</strong> — Oasis appears on your home screen`)}
        </div>`;
    } else if (isIOS) {
      stepsHtml = `
        <div style="font-family:var(--mono);font-size:11px;color:var(--amber);line-height:1.7;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:10px;padding:14px">
           Open this page in <strong>Safari</strong> to install on iPhone/iPad.<br>
          Chrome on iOS does not support web app installation.
        </div>`;
    } else {
      stepsHtml = `
        <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);line-height:2;margin-bottom:14px">Install on your device:</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${stepRow(1, `Click the <strong style="color:var(--teal)">Install</strong> icon in your browser's address bar`)}
          ${stepRow(2, `Confirm by clicking <strong style="color:var(--teal)">Install</strong> in the popup`)}
        </div>`;
    }

    modal.innerHTML = `
      <div style="width:100%;max-width:440px;background:#0f172a;border:1px solid rgba(29,233,212,0.25);border-radius:16px;overflow:hidden;box-shadow:0 -8px 48px rgba(0,0,0,0.6);animation:pwa-slide-up .3s cubic-bezier(.22,1,.36,1)">
        <div style="padding:18px 20px 14px;background:rgba(29,233,212,0.06);border-bottom:1px solid rgba(29,233,212,0.12);display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:12px;background:rgba(29,233,212,0.1);border:1px solid rgba(29,233,212,0.2);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0"></div>
          <div>
            <div style="font-family:var(--cond);font-size:15px;font-weight:800;color:var(--text-bright);letter-spacing:1px">Oasis</div>
            <div style="font-family:var(--mono);font-size:11px;color:var(--text-muted);letter-spacing:1px;margin-top:2px">INSTALL AS APP</div>
          </div>
          <button onclick="document.getElementById('pwa-install-modal').remove()" aria-label="Close" style="margin-left:auto;background:none;border:none;color:var(--text-dim);font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:color .15s">✕</button>
        </div>
        <div style="padding:20px">
          ${stepsHtml}
          <div style="display:flex;gap:8px;margin-top:18px">
            ${canPrompt ? `<button id="_pwa-modal-install-btn" style="flex:1;padding:12px;background:linear-gradient(135deg,rgba(29,233,212,0.2),rgba(96,165,250,0.15));border:1.5px solid rgba(29,233,212,0.5);border-radius:var(--r-md);color:var(--teal);font-family:var(--cond);font-size:13px;font-weight:700;letter-spacing:2px;cursor:pointer">⬇ INSTALL NOW</button>` : ''}
            <button onclick="document.getElementById('pwa-install-modal').remove()" style="flex:1;padding:12px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-md);color:var(--text-dim);font-family:var(--mono);font-size:11px;cursor:pointer;letter-spacing:1px">CLOSE</button>
          </div>
        </div>
      </div>
      <style>@keyframes pwa-slide-up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}</style>
    `;

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    // Wire INSTALL NOW button after DOM insertion (avoids closure capturing stale prompt)
    if (canPrompt) {
      document.getElementById('_pwa-modal-install-btn')?.addEventListener('click', async () => {
        modal.remove();
        await window.pwaInstall();
      });
    }
  }

  // ── iOS: trigger banner + chip (beforeinstallprompt never fires on iOS) ──
  const _isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (_isIOS) {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        _showInstallChip();
        _showInstallBanner();
      }, 2000);
    });
  }

  } // end !_isStandalone
})();



// ═══════════════════════════════════════════════════════════════
