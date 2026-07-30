
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
      '#nt-error-overlay .nt-et{font-family:ui-monospace,"SF Mono",monospace;font-size:10px;',
      'font-weight:700;letter-spacing:2px;color:rgba(239,68,68,.9);text-transform:uppercase}',
      '#nt-error-overlay .nt-em{font-size:13px;color:#e2e8f0;line-height:1.6;margin-bottom:4px}',
      '#nt-error-overlay .nt-es{font-family:ui-monospace,"SF Mono",monospace;font-size:9.5px;',
      'color:rgba(148,163,184,.7);line-height:1.5;word-break:break-all}',
      '#nt-error-overlay .nt-ed{background:rgba(0,0,0,.4);border:1px solid rgba(56,100,168,.3);',
      'border-radius:8px;padding:10px 12px;margin:14px 0 0;',
      'font-family:ui-monospace,"SF Mono",monospace;font-size:8.5px;',
      'color:rgba(100,130,165,.8);line-height:1.6;max-height:100px;overflow:auto;',
      'white-space:pre-wrap;word-break:break-all}',
      '#nt-error-overlay .nt-ebtns{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}',
      '#nt-error-overlay .nt-btn{font-family:ui-monospace,"SF Mono",monospace;font-size:10px;',
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
      entry.stack ? '<details><summary style="font-family:ui-monospace,monospace;font-size:9px;color:rgba(100,130,165,.6);cursor:pointer;margin-top:8px">Show stack trace</summary><div class="nt-ed">' + _esc(entry.stack) + '</div></details>' : '',
      '  <div class="nt-ebtns">',
      '    <button class="nt-btn nt-btn-p" onclick="location.reload()">↺ Reload App</button>',
      '    <button class="nt-btn nt-btn-s" onclick="document.getElementById(\'nt-error-overlay\').remove()">Dismiss</button>',
      '  </div>',
      '  <div style="margin-top:14px;font-family:ui-monospace,monospace;font-size:8px;color:rgba(100,130,165,.45);letter-spacing:1px">',
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
      'font-family:var(--mono)', 'font-size:10px', 'font-weight:700', 'letter-spacing:.8px',
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
        <div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.6">${html}</div>
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
            <div style="font-family:var(--mono);font-size:9px;color:var(--text-muted);letter-spacing:1px;margin-top:2px">INSTALL AS APP</div>
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

    // ── Google Sign-In redirect result (mobile flow) ────────────────
    // Mobile devices sign in via signInWithRedirect() (see obGoogleSignIn),
    // which navigates away and back rather than using a popup. This must
    // run on every load to pick up the result of a redirect in progress.
    // Resolves to { user: null } when there's no pending redirect, so this
    // is a no-op on every normal page load.
    if (typeof firebase.auth === 'function') {
      _obRedirectPending = true;
      firebase.auth().getRedirectResult().then(result => {
        if (result && result.user && typeof _obHandleGoogleUser === 'function') {
          const googleBtn = document.getElementById('ob-google-btn');
          if (googleBtn) { googleBtn.disabled = true; googleBtn.style.opacity = '0.6'; }
          _obHandleGoogleUser(result.user).catch(err => {
            console.error('[Google Redirect]', err && err.code, err && err.message);
            if (typeof _obSetAuthError === 'function') {
              const codeStr = (err && err.code) ? ` (${err.code})` : '';
              _obSetAuthError('Google sign-in failed. Please try again.' + codeStr);
            }
          }).finally(() => {
            if (googleBtn) { googleBtn.disabled = false; googleBtn.style.opacity = ''; }
          });
        } else if (!(_getAuth() && _getAuth().currentUser)) {
          // No pending redirect and no active session — this is just a
          // normal, already-signed-out page load. checkOnboarding() held
          // off showing the overlay while this was unresolved; do it now.
          if (typeof _showOnboardingOverlay === 'function') _showOnboardingOverlay();
        }
      }).catch(err => {
        console.error('[Google Redirect]', err && err.code, err && err.message);
        if (err && err.code === 'auth/account-exists-with-different-credential' && typeof _obSetAuthError === 'function') {
          _obSetAuthError('An account with this email already exists using a different sign-in method.');
        }
        if (typeof _showOnboardingOverlay === 'function') _showOnboardingOverlay();
      }).finally(() => {
        _obRedirectPending = false;
      });
    }

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
      list.innerHTML = '<div style="color:var(--text-dim);font-family:var(--mono);font-size:10px;padding:8px 0">No calculations yet.</div>';
    } else {
      list.innerHTML = recent.map(entry => {
        const diag = (entry.diagnosis || 'General').replace(/_/g, ' ');
        const meta = [
          entry.age    ? entry.age + 'y'      : '',
          entry.weight ? entry.weight + 'kg'  : '',
          entry.energy ? entry.energy + 'kcal': ''
        ].filter(Boolean).join(' · ');
        const ts = entry.savedAt ? (entry.savedAt.split(',')[0] || entry.savedAt) : '';
        return `<div style="background:var(--surface2);border-radius:6px;padding:8px 10px;font-family:var(--mono);font-size:10px;display:flex;justify-content:space-between;align-items:center">
          <span><span style="color:var(--teal);font-weight:700">${diag}</span>${meta ? ' <span style="color:var(--text-dim)">· ' + meta + '</span>' : ''}</span>
          ${ts ? '<span style="color:var(--text-dim);font-size:9px">' + ts + '</span>' : ''}
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
    label.style.cssText = 'font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;align-self:center;flex-shrink:0;white-space:nowrap';
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
        ${meta ? `<span style="opacity:0.55;font-size:8.5px;margin-left:4px">${meta}</span>` : ''}`;
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
    pLabel.style.cssText = 'font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;align-self:center;flex-shrink:0;white-space:nowrap';
    pLabel.textContent = 'PRESETS:';
    strip.appendChild(pLabel);

  } else {
    // ── NO HISTORY — show presets only ──
    const label = document.createElement('span');
    label.style.cssText = 'font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;align-self:center;flex-shrink:0;white-space:nowrap';
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
        <div style="color:var(--text-dim);font-size:9px;margin-top:3px">${h.route || ''} · ${h.icuPhase || ''}</div>
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
  .disclaimer{background:#fce4ec;border:1px solid #e91e63;border-radius:6px;padding:10px 14px;font-size:10px;margin-top:24px;color:#555}
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
// SAVE TO PDF — Universal print-to-PDF for all results sections
// Uses browser print dialog with PDF print destination.
// sectionId: optional — if supplied, only that element is printed.
// title: optional — window title for the PDF.
// ════════════════════════════════════════════════════════════════
function saveToPDF(sectionId, title) {
  const section = sectionId ? document.getElementById(sectionId) : null;
  const pdfTitle = title || 'Oasis — Report';
  const timestamp = new Date().toLocaleString();

  // Build print content
  const html = section ? section.innerHTML : document.getElementById('results-section')?.innerHTML || document.body.innerHTML;

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) { showToast('Allow pop-ups to save PDF', 'warning'); return; }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${pdfTitle}</title>
  <meta charset="UTF-8">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;padding:20px 28px;max-width:780px;margin:0 auto;line-height:1.5}
    h1{font-size:17px;color:#005e52;border-bottom:2px solid #005e52;padding-bottom:7px;margin-bottom:16px}
    h2,h3{font-size:12px;color:#005e52;margin:14px 0 6px;text-transform:uppercase;letter-spacing:1px}
    table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10px}
    td,th{padding:6px 9px;border:1px solid #c8d4e0;text-align:left}
    th{background:#e4eef8;font-weight:700;color:#1a3a5c}
    .card,.card-body,.mc,.plan-block,.alert,.info-note{background:#f8fbff;border:1px solid #c8d4e0;border-radius:5px;padding:10px 12px;margin-bottom:10px}
    .card-header{background:#e4eef8;padding:7px 12px;margin:-10px -12px 10px;border-bottom:1px solid #c8d4e0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1a3a5c}
    .metrics-grid,.who-tile-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
    .mc,.who-tile{padding:8px 10px;background:#f0f6ff;border:1px solid #b8d0e8;border-radius:4px}
    .m-val,.fenton-big,.who-tile-z{font-size:18px;font-weight:700;color:#005e52}
    .m-lbl,.m-unit,.m-range,.who-tile-label,.who-tile-sub{font-size:9px;color:#4a6a8a}
    .alert.danger{background:#fff0f0;border-color:#f5b8b8;color:#7f1d1d}
    .alert.warning{background:#fffbe6;border-color:#f5d87a;color:#78350f}
    .alert.info{background:#eff8ff;border-color:#93c5fd;color:#1e3a5f}
    .alert.success{background:#f0fdf4;border-color:#86efac;color:#14532d}
    .plan-block-title{font-weight:700;font-size:10px;color:#1a3a5c;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #c8d4e0}
    .pi{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #dde8f0;font-size:10px}
    .pi .k{color:#4a6a8a}.pi .v{font-weight:700;color:#005e52}
    .dtbl{width:100%;border-collapse:collapse;font-size:10px}
    .dtbl th{background:#e4eef8;color:#1a3a5c;padding:6px 8px;font-size:9px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #b8d0e8}
    .dtbl td{padding:6px 8px;border-bottom:1px solid #dde8f0;color:#222;vertical-align:top}
    .cmam-banner,.muac-indicator{padding:9px 12px;border-radius:4px;border:1px solid #c8d4e0;margin-bottom:10px;font-size:10px}
    .pctl-bar-wrap,.who-z-bar-wrap,.adequacy-bar{display:none} /* hide SVG bars in PDF */
    #r-patient-bar{background:#e4eef8;border:1px solid #b8cce0;border-radius:4px;padding:8px 12px;margin-bottom:12px;font-size:10px;color:#1a3a5c}
    .results-title{font-size:15px;font-weight:800;color:#005e52;margin-bottom:12px}
    .divider-lbl{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#4a6a8a;padding:10px 0 6px;border-top:1px solid #c8d4e0;margin-top:12px}
    .info-note{background:#eff8ff;border-color:#93c5fd;color:#1a3a5c;padding:8px 12px;font-size:10px}
    button,.calc-btn,.print-btn,.preset-btn,.preset-strip,
    .support-header-btn,.hscroll-btn{display:none!important}
    .c-t{color:#007a68}.c-a{color:#92400e}.c-b{color:#1e40af}.c-g{color:#065f46}.c-r{color:#b91c1c}
    .pdf-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #005e52}
    .pdf-header h1{border:none;padding:0;margin:0}
    .pdf-meta{font-size:9px;color:#4a6a8a;text-align:right;line-height:1.8}
    .pdf-footer{margin-top:20px;padding-top:10px;border-top:1px solid #c8d4e0;font-size:9px;color:#666;text-align:center;line-height:1.8}
    .pdf-disclaimer{background:#fff8e1;border:1px solid #f9c942;border-radius:4px;padding:8px 12px;font-size:9px;color:#5c4200;margin-top:14px}
    @media print{
      body{padding:10px 14px}
      @page{margin:14mm 10mm}
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <h1> Oasis</h1>
    <div class="pdf-meta">
      ${pdfTitle}<br>
      Generated: ${timestamp}
    </div>
  </div>
  ${html}
  <div class="pdf-disclaimer">
     <strong>Clinical Decision Support Only.</strong> This report is generated by Oasis as a clinical decision support aid. All prescriptions and dietary interventions must be reviewed and authorised by a qualified dietitian or clinician before implementation.
  </div>
  <div class="pdf-footer">
    Oasis · ASPEN 2016 / ASPEN 2022 · ESPEN 2019 · NICE CG32 · KDIGO · EASL · WHO<br>
    Developed by Edison Taimu · Kamuzu University of Health Sciences · Malawi
  </div>
</body>
</html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 500);
}

function copyPESStatement() {
  const gen  = window._pesGenerated || {};
  const notes = document.getElementById('pes-notes')?.value?.trim() || '';
  let txt = '';
  if (gen.statement) txt += 'NUTRITION DIAGNOSIS — PES STATEMENTS (' + (gen.count||1) + ' diagnosis' + (gen.count > 1 ? 'es' : '') + '):\n' + gen.statement + '\n\n';
  if (gen.insights)  txt += 'CLINICAL NUTRITION INSIGHTS:\n' + gen.insights;
  if (notes)         txt += '\n\nCLINICIAN NOTES:\n' + notes;
  if (!txt.trim()) { showToast('Nothing to copy'); return; }
  navigator.clipboard?.writeText(txt.trim()).then(() => showToast('✓ PES & Insights copied')).catch(() => showToast('Copy failed'));
}

function downloadCSV(filename,headers,rows) {
  const csv=[headers,...rows].map(row=>row.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=filename; a.click(); showToast('✓ CSV downloaded');
}


// MODULE: SETTINGS & THEMES
const THEMES={ocean:{bg:'#07111c',surface:'#0d1e30',surface2:'#112437',surface3:'#162c42',border:'#224060',teal:'#00d4b8',tealDim:'#00b8a0'},slate:{bg:'#0e0e14',surface:'#16162a',surface2:'#1c1c36',surface3:'#222240',border:'#2e2e50',teal:'#a78bfa',tealDim:'#8b6df5'},forest:{bg:'#071410',surface:'#0d2018',surface2:'#122a20',surface3:'#173428',border:'#1a3a28',teal:'#4ade80',tealDim:'#22c55e'},amber:{bg:'#130e05',surface:'#1c1508',surface2:'#261c0a',surface3:'#30230d',border:'#3a2a10',teal:'#fbbf24',tealDim:'#f59e0b'},clinical:{bg:'#040d18',surface:'#081624',surface2:'#0c1e30',surface3:'#10263c',border:'#1a3a58',teal:'#4db8e8',tealDim:'#2a9fd4'},midnight:{bg:'#000000',surface:'#080810',surface2:'#0e0e1a',surface3:'#141422',border:'#1e1e32',teal:'#00e5ff',tealDim:'#00b8cc'}};
function applyTheme(name){const t=THEMES[name];if(!t)return;const r=document.documentElement.style;r.setProperty('--bg',t.bg);r.setProperty('--surface',t.surface);r.setProperty('--surface2',t.surface2);r.setProperty('--surface3',t.surface3);r.setProperty('--border',t.border);r.setProperty('--teal',t.teal);r.setProperty('--teal-dim',t.tealDim);r.setProperty('--teal-glow',`rgba(0,0,0,.15)`);if(name==='clinical'){r.setProperty('--text','#c8dff0');r.setProperty('--text-dim','#6899bb');r.setProperty('--text-bright','#e8f4ff');}else{r.setProperty('--text','#cce0f5');r.setProperty('--text-dim','#6890b8');r.setProperty('--text-bright','#eaf4ff');}document.querySelectorAll('.theme-swatch').forEach(s=>s.classList.remove('active'));const el=document.getElementById('th-'+name);if(el)el.classList.add('active');currentSettings.theme=name;try{const _s=DataService.get('settings')||{};_s.theme=name;DataService.save('settings',_s);}catch(e){}}
function applyFontSize(sz){
  const map={sm:'12px',md:'14px',lg:'16px',xl:'19px'};
  const size = map[sz] || '14px';
  const scale = {sm:0.857,md:1,lg:1.143,xl:1.357}[sz] || 1; // relative to 14px base

  // Set root font size so rem units cascade
  document.documentElement.style.fontSize = size;
  document.body.style.fontSize = size;

  // Inject/update a comprehensive override that covers explicit px values
  // by scaling every text element relative to a CSS custom property.
  const FSID = 'nt-fontsize-override';
  let fsEl = document.getElementById(FSID);
  if (!fsEl) { fsEl = document.createElement('style'); fsEl.id = FSID; document.head.appendChild(fsEl); }

  // We set --fs-scale on :root and use it to override common explicit sizes
  fsEl.textContent = `
    :root {
      --fs-scale: ${scale};
      --fs-base:  ${size};
      --fs-xs:    calc(9px  * ${scale});
      --fs-sm:    calc(10px * ${scale});
      --fs-body:  calc(12px * ${scale});
      --fs-md:    calc(13px * ${scale});
      --fs-lg:    calc(14px * ${scale});
      --fs-xl:    calc(16px * ${scale});
      --fs-2xl:   calc(18px * ${scale});
      --fs-3xl:   calc(22px * ${scale});
    }
    html, body { font-size: ${size} !important; }
    /* Cards, labels, rows */
    .card-title, .card-badge, .sdr-lbl, .sdr-item-lbl, .sdr-group-label,
    .lbl, .sdr-sub, .sdr-item-sub, .alert div, .plan-block-title,
    .m-lbl, .m-unit, .m-range, .pedi-mc-label, .pedi-mc-sub,
    .pedi-row-label, .pedi-row-value, .pedi-row-note,
    .pedi-z-title, .pedi-z-detail-label, .pedi-z-detail-val, .pedi-note,
    .tab-label, .sdr-chip { font-size: calc(var(--fs-body) * 1) !important; }
    /* Primary values */
    .m-val, .pedi-mc-value { font-size: calc(var(--fs-3xl)) !important; }
    .pedi-z-score { font-size: calc(24px * ${scale}) !important; }
    /* Body text, descriptions */
    p, li, td, th, label, span:not(.logo-name-nutri):not(.logo-name-track):not(.logo-name-pro),
    div.sdr-lbl, div.sdr-sub, div.sdr-item-sub { font-size: calc(var(--fs-md)) !important; }
    /* Buttons */
    .calc-btn, .print-btn, .preset-btn, button.sdr-chip,
    button.sdr-reset, button.sdr-save { font-size: calc(var(--fs-body)) !important; }
    /* Section titles, headings */
    h1,h2,h3,h4 { font-size: calc(var(--fs-xl)) !important; }
    .results-title, .card-title { font-size: calc(var(--fs-lg)) !important; }
    /* Keep mono data readability — scale but don't stretch too much */
    .mono-data, .fenton-big { font-size: calc(var(--fs-2xl)) !important; }
  `;

  // Clear active chips
  ['sz-sm','sz-md','sz-lg','sz-xl'].forEach(id => document.getElementById(id)?.classList.remove('active'));
  document.getElementById('sz-' + sz)?.classList.add('active');
  currentSettings.fontSize = sz;
}
function applyCompact(on){document.querySelectorAll('.card-body').forEach(el=>el.style.padding=on?'12px':'');document.querySelectorAll('.form-row').forEach(el=>el.style.marginBottom=on?'8px':'');currentSettings.compact=on;}
function applyStatusBar(on){document.getElementById('status-bar').style.display=on?'':'none';}

// ── APPEARANCE MODE ────────────────────────────────────────────────
/**
 * applyAppearanceMode('dark'|'amoled'|'hc')
 * Applies the chosen appearance mode, updates buttons, persists choice.
 */

// ══════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — Accent, Intensity, Enhanced Theme
// ══════════════════════════════════════════════════════════════════

const DS_ACCENT_COLORS = {
  cyan:   { hex:'#1de9d4', dim:'#0ec4b0', glow:'rgba(29,233,212,0.12)'  },
  green:  { hex:'#34d399', dim:'#10b981', glow:'rgba(52,211,153,0.12)'  },
  blue:   { hex:'#60a5fa', dim:'#3b82f6', glow:'rgba(96,165,250,0.12)'  },
  purple: { hex:'#a78bfa', dim:'#7c3aed', glow:'rgba(167,139,250,0.12)' },
  rose:   { hex:'#fb7185', dim:'#e11d48', glow:'rgba(251,113,133,0.12)' },
  orange: { hex:'#fb923c', dim:'#ea580c', glow:'rgba(251,146,60,0.12)'  },
  gold:   { hex:'#f0b429', dim:'#b45309', glow:'rgba(240,180,41,0.12)'  },
};

function applyAccent(name) {
  const a = DS_ACCENT_COLORS[name];
  if (!a) return;
  // Remove all accent classes
  document.body.classList.remove('accent-cyan','accent-green','accent-blue','accent-purple','accent-rose','accent-orange','accent-gold');
  if (name !== 'cyan') document.body.classList.add('accent-' + name);
  // Also set CSS variables directly for instant update
  const r = document.documentElement.style;
  r.setProperty('--teal',        a.hex);
  r.setProperty('--teal-dim',    a.dim);
  r.setProperty('--teal-glow',   a.glow);
  r.setProperty('--accent',      a.hex);
  r.setProperty('--accent-dim',  a.dim);
  r.setProperty('--accent-glow', a.glow);
  r.setProperty('--tab-active',  a.hex);
  // Highlight active swatch
  document.querySelectorAll('.ds-accent-swatch').forEach(s => s.classList.remove('active'));
  document.getElementById('accent-' + name)?.classList.add('active');
  currentSettings.accent = name;
  try { const s=DataService.get('settings')||{}; s.accent=name; DataService.save('settings',s); } catch(e) {}
  // Re-apply font override so accent colour bleeds into the injected style
  if (typeof applyFont === 'function') {
    const font = currentSettings.font || 'system';
    applyFont(font);
  }
}

function applyIntensity(level) {
  document.body.classList.remove('intensity-soft','intensity-normal','intensity-strong');
  if (level !== 'normal') document.body.classList.add('intensity-' + level);
  // Highlight active button
  ['soft','normal','strong'].forEach(l => {
    document.getElementById('intensity-' + l)?.classList.toggle('active', l === level);
  });
  currentSettings.intensity = level;
  try { const s=DataService.get('settings')||{}; s.intensity=level; DataService.save('settings',s); } catch(e) {}
}

function applyAppearanceMode(mode) {
  // Remove all theme classes first
  document.body.classList.remove('theme-amoled','theme-hc');

  if (mode === 'amoled') {
    document.body.classList.add('theme-amoled');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = '#000000';
  } else if (mode === 'hc') {
    document.body.classList.add('theme-hc');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = '#000000';
  } else {
    // dark (default)
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = '#07111c';
  }

  // Update toggle button active states
  ['dark','amoled','hc'].forEach(m => {
    document.getElementById('mode-' + m)?.classList.toggle('active', m === mode);
  });

  // Re-apply wallpaper with correct palette
  const currentWp = currentSettings.wallpaper || 'none';
  applyWallpaper(currentWp);

  currentSettings.appearanceMode = mode;
}

// ── WALLPAPER ────────────────────────────────────────────────────
// Dark palette: neon teal on navy
// ── WALLPAPER CATALOGUE ──────────────────────────────────────────
// All patterns use very low opacity to remain legible with any font.
// Dark mode: teal/blue tones. Light mode: slate/indigo tones.
// Font-friendly: patterns stay behind text without competing.
const WALLPAPERS = {
  none:      { dark:'', light:'' },

  // ── GEOMETRIC — boosted opacity for visibility ──
  grid: {
    dark:  'linear-gradient(rgba(0,212,184,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,184,.18) 1px,transparent 1px)',
    light: 'linear-gradient(rgba(0,112,192,.20) 1px,transparent 1px),linear-gradient(90deg,rgba(0,112,192,.20) 1px,transparent 1px)',
  },
  dots: {
    dark:  'radial-gradient(circle,rgba(0,212,184,.45) 1px,transparent 1px)',
    light: 'radial-gradient(circle,rgba(0,112,192,.40) 1px,transparent 1px)',
  },
  cross: {
    dark:  'linear-gradient(rgba(0,212,184,.20) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,184,.20) 1px,transparent 1px)',
    light: 'linear-gradient(rgba(0,112,192,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(0,112,192,.22) 1px,transparent 1px)',
  },
  diagonal: {
    dark:  'repeating-linear-gradient(45deg,rgba(0,212,184,.22) 0px,rgba(0,212,184,.22) 1px,transparent 1px,transparent 14px)',
    light: 'repeating-linear-gradient(45deg,rgba(0,112,192,.22) 0px,rgba(0,112,192,.22) 1px,transparent 1px,transparent 14px)',
  },
  circuit: {
    dark:  'linear-gradient(rgba(0,212,184,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,184,.22) 1px,transparent 1px),linear-gradient(rgba(77,159,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(77,159,255,.12) 1px,transparent 1px)',
    light: 'linear-gradient(rgba(0,112,192,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(0,112,192,.22) 1px,transparent 1px),linear-gradient(rgba(29,78,216,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(29,78,216,.12) 1px,transparent 1px)',
  },
  wave: {
    dark:  'repeating-radial-gradient(circle at 50% 50%,transparent 0,transparent 12px,rgba(0,212,184,.18) 13px,transparent 14px)',
    light: 'repeating-radial-gradient(circle at 50% 50%,transparent 0,transparent 12px,rgba(0,112,192,.18) 13px,transparent 14px)',
  },
  hex: {
    dark:  'linear-gradient(60deg,rgba(0,212,184,.18) 25%,transparent 25%,transparent 75%,rgba(0,212,184,.18) 75%),linear-gradient(120deg,rgba(0,212,184,.18) 25%,transparent 25%,transparent 75%,rgba(0,212,184,.18) 75%)',
    light: 'linear-gradient(60deg,rgba(0,112,192,.18) 25%,transparent 25%,transparent 75%,rgba(0,112,192,.18) 75%),linear-gradient(120deg,rgba(0,112,192,.18) 25%,transparent 25%,transparent 75%,rgba(0,112,192,.18) 75%)',
  },
  topography: {
    dark:  'radial-gradient(ellipse at 20% 50%,rgba(0,212,184,.22) 0%,transparent 50%),radial-gradient(ellipse at 80% 20%,rgba(77,159,255,.18) 0%,transparent 50%),radial-gradient(ellipse at 60% 80%,rgba(180,124,255,.16) 0%,transparent 40%)',
    light: 'radial-gradient(ellipse at 20% 50%,rgba(0,112,192,.18) 0%,transparent 50%),radial-gradient(ellipse at 80% 20%,rgba(29,78,216,.15) 0%,transparent 50%),radial-gradient(ellipse at 60% 80%,rgba(109,40,217,.14) 0%,transparent 40%)',
  },

  // ── CLINICAL / SERIF-FRIENDLY ──
  linen: {
    dark:  'repeating-linear-gradient(0deg,rgba(240,180,41,.18) 0px,rgba(240,180,41,.18) 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,rgba(240,180,41,.08) 0px,rgba(240,180,41,.08) 1px,transparent 1px,transparent 28px)',
    light: 'repeating-linear-gradient(0deg,rgba(146,64,14,.18) 0px,rgba(146,64,14,.18) 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,rgba(146,64,14,.10) 0px,rgba(146,64,14,.10) 1px,transparent 1px,transparent 28px)',
  },
  parchment: {
    dark:  'radial-gradient(ellipse at 0% 0%,rgba(240,180,41,.22) 0%,transparent 60%),radial-gradient(ellipse at 100% 100%,rgba(96,165,250,.18) 0%,transparent 60%)',
    light: 'radial-gradient(ellipse at 0% 0%,rgba(217,119,6,.22) 0%,transparent 60%),radial-gradient(ellipse at 100% 100%,rgba(37,99,235,.16) 0%,transparent 60%)',
  },
  manuscript: {
    dark:  'repeating-linear-gradient(180deg,rgba(96,165,250,.20) 0px,rgba(96,165,250,.20) 1px,transparent 1px,transparent 28px)',
    light: 'repeating-linear-gradient(180deg,rgba(37,99,235,.22) 0px,rgba(37,99,235,.22) 1px,transparent 1px,transparent 28px)',
  },

  // ── MONOSPACE-FRIENDLY ──
  scanline: {
    dark:  'repeating-linear-gradient(180deg,rgba(0,212,184,.14) 0px,rgba(0,212,184,.14) 1px,transparent 1px,transparent 6px)',
    light: 'repeating-linear-gradient(180deg,rgba(0,112,192,.16) 0px,rgba(0,112,192,.16) 1px,transparent 1px,transparent 6px)',
  },
  carbon: {
    dark:  'repeating-linear-gradient(135deg,rgba(60,80,110,.9) 0px,rgba(60,80,110,.9) 1px,transparent 1px,transparent 4px),repeating-linear-gradient(45deg,rgba(40,60,90,.7) 0px,rgba(40,60,90,.7) 1px,transparent 1px,transparent 4px)',
    light: 'repeating-linear-gradient(135deg,rgba(160,175,200,.7) 0px,rgba(160,175,200,.7) 1px,transparent 1px,transparent 4px),repeating-linear-gradient(45deg,rgba(140,155,185,.5) 0px,rgba(140,155,185,.5) 1px,transparent 1px,transparent 4px)',
  },
  blueprint: {
    dark:  'linear-gradient(rgba(96,165,250,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(96,165,250,.22) 1px,transparent 1px),linear-gradient(rgba(96,165,250,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(96,165,250,.10) 1px,transparent 1px)',
    light: 'linear-gradient(rgba(37,99,235,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.22) 1px,transparent 1px),linear-gradient(rgba(37,99,235,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.10) 1px,transparent 1px)',
  },

  // ── GRADIENT WASH ──
};

const WALLPAPER_SIZES = {
  grid:       '24px 24px',
  dots:       '20px 20px',
  cross:      '32px 32px',
  diagonal:   '20px 20px',
  circuit:    '48px 48px,48px 48px,12px 12px,12px 12px',
  wave:       '28px 28px',
  hex:        '24px 42px',
  topography: '',
  linen:      '28px 28px',
  parchment:  '',
  manuscript: '32px 32px',
  scanline:   '6px 6px',
  carbon:     '4px 4px',
  blueprint:  '80px 80px,80px 80px,20px 20px,20px 20px',
};
const WALLPAPER_META = {
  none:       { label:'None',       group:'basic',    tip:'Clean — no pattern' },
  grid:       { label:'Grid',       group:'geometric',tip:'Fine teal grid' },
  dots:       { label:'Dots',       group:'geometric',tip:'Dot matrix' },
  cross:      { label:'Cross',      group:'geometric',tip:'Crosshatch' },
  diagonal:   { label:'Diagonal',   group:'geometric',tip:'Diagonal lines' },
  circuit:    { label:'Circuit',    group:'geometric',tip:'Double-grid circuit' },
  wave:       { label:'Wave',       group:'geometric',tip:'Concentric radial' },
  hex:        { label:'Hex',        group:'geometric',tip:'Hexagonal tile' },
  topography: { label:'Topo',       group:'geometric',tip:'Topographic contour' },
};
function applyWallpaper(name) {
  const isLight = document.body.classList.contains('theme-hc');
  const entry   = WALLPAPERS[name];
  if (!entry) {
    // Unknown key — clear background
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize  = '';
    currentSettings.wallpaper = name;
    return;
  }
  const bg = isLight ? (entry.light || '') : (entry.dark || '');
  const sz = (name in WALLPAPER_SIZES) ? (WALLPAPER_SIZES[name] || '') : '';
  document.body.style.backgroundImage = bg;
  // Only set backgroundSize for tiled patterns — not for gradient washes
  const tiled = ['grid','dots','cross','diagonal','circuit','wave','hex',
                  'scanline','carbon','blueprint'];
  if (tiled.includes(name) && sz) {
    document.body.style.backgroundSize = sz;
  } else {
    document.body.style.backgroundSize = '';
  }
  document.body.style.backgroundAttachment = 'fixed';
  // Mark active swatch
  document.querySelectorAll('.wp-swatch').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('wp-' + name);
  if (el) el.classList.add('active');
  currentSettings.wallpaper = name;
  // Persist immediately so it survives without hitting Save
  try {
    const s = DataService.get('settings') || {};
    s.wallpaper = name;
    DataService.save('settings', s);
  } catch(e) {}
}

// ── FONT STYLE ───────────────────────────────────────────────────
const FONTS = {
  system:    "'Barlow',sans-serif",
  calibri:   "'Calibri','Carlito',sans-serif",
  times:     "'Times New Roman','Times',serif",
  georgia:   "'Georgia',serif",
  arial:     "'Arial','Helvetica',sans-serif",
  trebuchet: "'Trebuchet MS','Helvetica',sans-serif",
  verdana:   "'Verdana',sans-serif",
  garamond:  "'Garamond','EB Garamond',serif",
  mono:      "'Courier New',monospace",
  optima:    "'Optima','Candara','Segoe UI',sans-serif",
};
function applyFont(name) {
  const fontStack = FONTS[name] || FONTS.system;

  // 1. Update the CSS custom property so var(--sans) resolves everywhere
  document.documentElement.style.setProperty('--sans', fontStack);
  document.body.style.setProperty('--sans', fontStack);

  // 2. Inject/update a <style> tag that forces the font on the whole document
  //    Excludes elements that should stay monospaced (data values, code).
  const STYLE_ID = 'nt-font-override';
  let styleEl = document.getElementById(STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    body, body *:not(.font-mono):not([style*="font-family:var(--mono)"]):not([style*="font-family: var(--mono)"]):not(.pedi-mc-value):not(.pedi-z-score):not(code):not(pre) {
      font-family: ${fontStack} !important;
    }
    /* Always preserve monospace for numeric/clinical data fields */
    .font-mono, [class*="mono"], [style*="font-family:var(--mono)"], [style*="font-family: var(--mono)"],
    .pedi-mc-value, .pedi-z-score, .pedi-z-detail-val, .m-val,
    input.inp, select.sel, .sdr-sel, code, pre, .logo-name { font-family: var(--mono) !important; }
  `;

  // 3. swatch highlight (legacy font-swatch class)
  document.querySelectorAll('.font-swatch').forEach(s => s.style.border = '2px solid transparent');
  const sw = document.getElementById('font-' + name);
  if (sw) sw.style.border = '2px solid var(--teal)';

  currentSettings.font = name;
}
function openSettings(){
  document.getElementById('settings-drawer').classList.add('open');
  document.getElementById('settings-overlay').classList.add('open');
  loadSettingsUI();
  if(typeof loadProfileIntoSettings==='function') loadProfileIntoSettings();
  checkEmailVerification();
}
function closeSettings(){
  document.getElementById('settings-drawer').classList.remove('open');
  document.getElementById('settings-overlay').classList.remove('open');
}

/* ── KEBAB (THREE-DOT) MENU ── */
function toggleKebabMenu(e){
  e.stopPropagation();
  var menu=document.getElementById('kebab-menu');
  var btn=document.getElementById('kebab-btn');
  var bd=document.getElementById('kebab-backdrop');
  if(!menu)return;
  if(menu.classList.contains('open')){closeKebabMenu();return;}
  _kebabUpdateLabels();_kebabShowSignOut();
  menu.classList.add('open');btn.classList.add('open');
  btn.setAttribute('aria-expanded','true');
  if(bd)bd.classList.add('visible');
}
function closeKebabMenu(){
  var menu=document.getElementById('kebab-menu');
  var btn=document.getElementById('kebab-btn');
  var bd=document.getElementById('kebab-backdrop');
  if(!menu)return;
  menu.classList.remove('open');
  if(btn){btn.classList.remove('open');btn.setAttribute('aria-expanded','false');}
  if(bd)bd.classList.remove('visible');
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    closeKebabMenu();
    if(document.getElementById('profile-drawer')?.classList.contains('open'))closeProfile();
    if(document.getElementById('about-drawer')?.classList.contains('open'))closeAbout();
  }
});
function _kebabUpdateLabels(){
  var el=document.getElementById('kebab-theme-label');
  if(!el)return;
  var t=(typeof currentSettings!=='undefined'&&currentSettings.theme)||'ocean';
  if(!(t in THEMES)) t='ocean';
  el.textContent=t.charAt(0).toUpperCase()+t.slice(1);
}
function _kebabShowSignOut(){
  var btn=document.getElementById('kebab-signout-btn');
  if(!btn)return;
  var name=(typeof currentSettings!=='undefined'&&currentSettings.userName)||'';
  btn.style.display=name?'flex':'none';
}
function kebabOpenProfile(){
  closeKebabMenu();openProfile();
}
function kebabOpenSettings(){closeKebabMenu();openSettings();}
function kebabOpenAbout(){closeKebabMenu();openAbout();}

/* ── PROFILE DRAWER ── */
function openProfile(){
  _populateProfileDrawer();
  document.getElementById('profile-drawer').classList.add('open');
  document.getElementById('profile-overlay').classList.add('open');
  checkEmailVerification();
}
function closeProfile(){
  document.getElementById('profile-drawer').classList.remove('open');
  document.getElementById('profile-overlay').classList.remove('open');
}
function _populateProfileDrawer(){
  var p = (typeof getUserProfile === 'function') ? getUserProfile() : null;
  var name = (p && p.name) ? p.name : 'No name set';
  var uid  = (p && p.uid)  ? p.uid  : '—';
  var role = (p && p.role) ? p.role : '—';
  var inst = (p && p.institution) ? p.institution : '—';
  var email = (p && p.email) ? p.email : '—';

  var nameEl  = document.getElementById('pdr-name');
  var roleEl  = document.getElementById('pdr-role-label');
  var uidEl   = document.getElementById('pdr-uid');
  var instEl  = document.getElementById('pdr-institution');
  var emailEl = document.getElementById('pdr-email');
  var avatarEl= document.getElementById('pdr-avatar');
  var signOutRow = document.getElementById('pdr-signout-row');

  if(nameEl)  nameEl.textContent  = name;
  if(roleEl)  roleEl.textContent  = role.charAt(0).toUpperCase() + role.slice(1);
  if(uidEl)   uidEl.textContent   = uid;
  if(instEl)  instEl.textContent  = inst;
  if(emailEl) emailEl.textContent = email;
  if(signOutRow) signOutRow.style.display = p ? 'block' : 'none';

  // Email verification badge
  var badgeEl = document.getElementById('pdr-email-verify-badge');
  if (badgeEl) {
    var authInst = (typeof _getAuth === 'function') ? _getAuth() : null;
    var fbUser   = authInst ? authInst.currentUser : null;
    if (fbUser && email !== '—') {
      _ntUpdateVerifyStatusUI(fbUser.emailVerified);
    } else {
      badgeEl.innerHTML = '';
    }
  }

  // Avatar: photo → initials → role icon
  if(avatarEl){
    var photoURL = (p && p.photoURL) ? p.photoURL : null;
    if (photoURL) {
      avatarEl.innerHTML = '<img src="' + photoURL + '" alt="Profile photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    } else {
      var initials = name !== 'No name set'
        ? name.trim().split(/\s+/).map(function(w){return w[0];}).join('').toUpperCase().slice(0,2)
        : '?';
      var svgIcons = {
        student:   '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
        dietitian: '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z"/></svg>',
        clinician: '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><circle cx="20" cy="10" r="2"/></svg>',
        nurse:     '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>',
      };
      if(svgIcons[role]){
        avatarEl.innerHTML = svgIcons[role];
      } else {
        avatarEl.innerHTML = '<span style="font-family:var(--sans);font-size:22px;font-weight:800;color:var(--teal)">' + initials + '</span>';
      }
    }
  }

  // ── Profile completion bar + photo reminder ───────────────────────
  if (p) {
    var comp      = (typeof getProfileCompletion === 'function') ? getProfileCompletion() : null;
    var pct       = comp ? comp.pct       : 100;
    var missing   = comp ? comp.missing   : [];
    var noPhoto   = missing.some(function(m){ return m.key === 'photo'; });
    var barColor  = pct === 100 ? 'var(--green)' : pct >= 67 ? 'var(--teal)' : 'var(--amber,#f59e0b)';

    // Completion bar element (inject once, update on re-call)
    var compEl = document.getElementById('pdr-completion-wrap');
    if (!compEl) {
      compEl = document.createElement('div');
      compEl.id = 'pdr-completion-wrap';
      compEl.style.cssText = 'padding:0 0 16px;';
      var afterAvatar = document.querySelector('#profile-drawer-body > div:first-child');
      if (afterAvatar && afterAvatar.parentNode) {
        afterAvatar.parentNode.insertBefore(compEl, afterAvatar.nextSibling);
      }
    }
    compEl.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">' +
        '<span style="font-family:var(--mono);font-size:9px;letter-spacing:0.8px;color:var(--text-dim);text-transform:uppercase">Profile Completion</span>' +
        '<span style="font-family:var(--mono);font-size:10px;font-weight:700;color:' + barColor + '">' + pct + '%</span>' +
      '</div>' +
      '<div style="height:4px;background:var(--surface2);border-radius:2px;overflow:hidden">' +
        '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:2px;transition:width .4s"></div>' +
      '</div>' +
      (noPhoto
        ? '<div style="margin-top:10px;padding:9px 11px;background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.18);border-radius:7px;display:flex;align-items:center;gap:9px">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(29,233,212,0.7)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
            '<span style="font-family:var(--mono);font-size:9px;color:var(--text-dim);flex:1">Add a profile photo to complete your profile</span>' +
            '<button onclick="closeProfile();openProfileEdit()" style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:0.5px;background:var(--teal);color:#020617;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;white-space:nowrap">ADD PHOTO</button>' +
          '</div>'
        : '');
  } else {
    var compElOld = document.getElementById('pdr-completion-wrap');
    if (compElOld) compElOld.remove();
  }
}

/* ── ABOUT DRAWER ── */
function openAbout(){
  // Sync version text
  var verEl = document.getElementById('adr-version-text');
  if(verEl && typeof APP_VERSION !== 'undefined') verEl.textContent = 'v' + APP_VERSION;
  document.getElementById('about-drawer').classList.add('open');
  document.getElementById('about-overlay').classList.add('open');
  // Re-apply cached developer profile (in case snapshot fired before drawer opened)
  if(typeof _devProfileCache !== 'undefined' && _devProfileCache) {
    _applyDevProfile(_devProfileCache);
  } else if(typeof _fetchDeveloperProfile === 'function') {
    _fetchDeveloperProfile();
  }
  _initMyFeedbackListener();
}
function closeAbout(){
  document.getElementById('about-drawer').classList.remove('open');
  document.getElementById('about-overlay').classList.remove('open');
}

/* ════════════════════════════════════════════════════════════
   MY SUBMISSIONS — About Drawer inbox
   Listens to the user's own feedback docs in real-time and
   renders them with any admin replies.
   ════════════════════════════════════════════════════════════ */

/** Firestore Timestamp → readable string */
function _fmtSubmissionTs(ts) {
  if (!ts) return '';
  var d;
  if (typeof ts.toDate === 'function') d = ts.toDate();
  else if (ts instanceof Date)         d = ts;
  else if (typeof ts === 'string')     d = new Date(ts);
  else return '';
  if (isNaN(d.getTime())) return '';
  var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var h = d.getHours(), m = d.getMinutes();
  var ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return mo[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() +
         ' · ' + h + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
}

/** Escape HTML entities to prevent XSS when building innerHTML strings */
function _escHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sets up a real-time Firestore listener for the current user's feedback.
 * Idempotent — safe to call on every openAbout().
 */
function _initMyFeedbackListener() {
  var uid = _getAuth()?.currentUser?.uid;
  if (!uid || typeof db === 'undefined') return;
  if (window._myFbListenerActive) return;
  window._myFbListenerActive = true;

  db.collection('feedback')
    .where('userId', '==', uid)
    .orderBy('sentAt', 'desc')
    .limit(20)
    .onSnapshot(function(snap) {
      var docs = snap.docs.map(function(d) {
        return Object.assign({ id: d.id }, d.data());
      });
      _renderMyFeedback(docs);
    }, function(err) {
      console.warn('[Oasis] myFeedback listener:', err);
    });
}

/**
 * Renders each submission as a compact card inside #my-fb-list.
 * Handles empty state, admin replies, and unread badge.
 */
function _renderMyFeedback(docs) {
  var list  = document.getElementById('my-fb-list');
  var badge = document.getElementById('my-fb-unread-badge');
  if (!list) return;

  /* ── Empty state ── */
  if (!docs || docs.length === 0) {
    list.innerHTML = '<span style="font-family:var(--sans);font-size:12px;color:var(--text-muted)">No feedback submitted yet.</span>';
    if (badge) badge.style.display = 'none';
    return;
  }

  var unreadCount = 0;
  var toMark      = [];
  var html        = '';

  docs.forEach(function(doc) {
    var hasReply = !!(doc.adminReply && doc.adminReply.message);
    var isUnread = hasReply && doc.replyRead === false;
    if (isUnread) { unreadCount++; toMark.push(doc.id); }

    var msg      = doc.message || '';
    var preview  = msg.length > 80 ? msg.slice(0, 80) + '…' : msg;
    var emoji    = doc.emoji        || '💬';
    var typeLabel= doc.feedbackType || 'General';
    var subject  = doc.subject      || '';
    var sentStr  = _fmtSubmissionTs(doc.sentAt);

    /* ── Card wrapper ── */
    html += '<div style="' +
      'padding:12px 14px;' +
      'background:var(--surface1,#0d1628);' +
      'border:1px solid ' + (isUnread ? 'rgba(29,233,212,0.35)' : 'rgba(96,165,250,0.18)') + ';' +
      'border-left:2px solid ' + (isUnread ? 'var(--teal,#1de9d4)' : 'rgba(96,165,250,0.28)') + ';' +
      'border-radius:var(--r-md,10px);' +
      'display:flex;flex-direction:column;gap:6px;' +
    '">';

    /* ── Top row: emoji + type badge + date ── */
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">';
    html +=   '<div style="display:flex;align-items:center;gap:6px">';
    html +=     '<span style="font-size:14px;line-height:1">' + emoji + '</span>';
    html +=     '<span style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:0.8px;' +
                  'color:var(--blue,#60a5fa);background:rgba(96,165,250,0.08);' +
                  'border:1px solid rgba(96,165,250,0.22);border-radius:4px;padding:2px 7px">' +
                  _escHtml(typeLabel) + '</span>';
    html +=   '</div>';
    if (sentStr) {
      html += '<span style="font-family:var(--mono);font-size:8px;color:var(--text-muted);flex-shrink:0">' +
                _escHtml(sentStr) + '</span>';
    }
    html += '</div>';

    /* ── Subject ── */
    if (subject) {
      html += '<div style="font-family:var(--sans);font-size:12px;font-weight:600;color:var(--text-bright)">' +
                _escHtml(subject) + '</div>';
    }

    /* ── Message preview ── */
    html += '<div style="font-family:var(--sans);font-size:11.5px;color:var(--text);line-height:1.6">' +
              _escHtml(preview) + '</div>';

    /* ── Admin reply block ── */
    if (hasReply) {
      var replyTs = _fmtSubmissionTs(doc.adminReply.repliedAt);
      html += '<div style="' +
        'margin-top:4px;padding:10px 12px;' +
        'background:rgba(29,233,212,0.05);' +
        'border:1px solid rgba(29,233,212,0.22);' +
        'border-left:2px solid var(--teal,#1de9d4);' +
        'border-radius:0 var(--r-sm,7px) var(--r-sm,7px) 0;' +
        'display:flex;flex-direction:column;gap:5px' +
      '">';

      /* reply label row */
      html += '<div style="display:flex;align-items:center;gap:6px">';
      html +=   '<span style="font-family:var(--mono);font-size:9px;font-weight:700;' +
                  'letter-spacing:0.8px;color:var(--teal,#1de9d4)">↩ Reply from Admin</span>';
      if (isUnread) {
        html += '<span style="font-family:var(--mono);font-size:7.5px;font-weight:700;' +
                  'color:var(--teal,#1de9d4);background:rgba(29,233,212,0.12);' +
                  'border:1px solid rgba(29,233,212,0.3);border-radius:10px;padding:1px 6px">NEW</span>';
      }
      html += '</div>';

      /* reply body */
      html += '<div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.75">' +
                _escHtml(doc.adminReply.message) + '</div>';

      /* reply meta: admin name + timestamp */
      html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:1px">';
      if (doc.adminReply.adminName) {
        html += '<span style="font-family:var(--mono);font-size:8px;color:var(--text-muted)">— ' +
                  _escHtml(doc.adminReply.adminName) + '</span>';
      }
      if (replyTs) {
        html += '<span style="font-family:var(--mono);font-size:8px;color:var(--text-muted)">' +
                  _escHtml(replyTs) + '</span>';
      }
      html += '</div>';

      html += '</div>'; /* /reply block */
    }

    html += '</div>'; /* /card */
  });

  list.innerHTML = html;

  /* ── Unread badge ── */
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount === 1 ? '● NEW REPLY' : '● ' + unreadCount + ' NEW REPLIES';
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  /* ── Mark unread replies as read after 2 s ── */
  if (toMark.length > 0) {
    setTimeout(function() {
      toMark.forEach(function(id) { _markReplyRead(id); });
    }, 2000);
  }
}

/** Writes replyRead: true to a feedback doc (non-critical — silent on error). */
async function _markReplyRead(docId) {
  try {
    await db.collection('feedback').doc(docId).update({ replyRead: true });
  } catch(e) { /* silent — non-critical */ }
}
function kebabCycleTheme(){
  var order = Object.keys(THEMES); // ['ocean','slate','forest','amber','clinical','midnight']
  var cur = (typeof currentSettings !== 'undefined' && currentSettings.theme) || 'ocean';
  // If saved theme isn't in THEMES (e.g. old 'dark'/'amoled' value), reset to first
  if (order.indexOf(cur) === -1) cur = order[0];
  var next = order[(order.indexOf(cur) + 1) % order.length];
  if(typeof applyTheme === 'function'){
    applyTheme(next);
    // Persist immediately so the choice survives reload
    try {
      const s = DataService.get('settings') || {};
      s.theme = next;
      DataService.save('settings', s);
      currentSettings.theme = next;
    } catch(e) {}
    if(typeof showToast === 'function') showToast('Theme: ' + next.charAt(0).toUpperCase() + next.slice(1), 'info', 1800);
  }
  _kebabUpdateLabels();
}
function kebabPrint(){closeKebabMenu();if(typeof printReport==='function')printReport();else window.print();}
function kebabShare(){
  closeKebabMenu();
  if(typeof window.pwaShare==='function'){window.pwaShare();}
  else if(navigator.share){navigator.share({title:'Oasis CNST',text:'Clinical Nutrition Decision Support Tool',url:window.location.href}).catch(function(){});}
  else{navigator.clipboard.writeText(window.location.href).then(function(){if(typeof showToast==='function')showToast('Link copied to clipboard','success');});}
}
function kebabSignOut(){closeKebabMenu();if(typeof obSignOut==='function')obSignOut();}
/* ── END KEBAB MENU ── */

function loadSettingsUI(){
  const s=DataService.get('settings')||{};
  currentSettings=s;
  // Restore appearance mode toggle
  const mode = s.appearanceMode || 'dark';
  document.getElementById('mode-dark')  ?.classList.toggle('active', mode === 'dark');
  // Sync font-select dropdown
  const fontSel = document.getElementById('font-select');
  if (fontSel && s.font) fontSel.value = s.font;
  if(s.theme){document.querySelectorAll('.theme-swatch').forEach(x=>x.classList.remove('active'));const el=document.getElementById('th-'+(s.theme||'ocean'));if(el)el.classList.add('active');}
  const szId='sz-'+(s.fontSize||'md');
  ['sz-sm','sz-md','sz-lg','sz-xl'].forEach(id=>{document.getElementById(id)?.classList.remove('active');});
  const szEl=document.getElementById(szId);if(szEl)szEl.classList.add('active');
  const bools={'tog-compact':false,'tog-statusbar':true,'tog-scroll':true,'tog-analytics':true};
  Object.entries(bools).forEach(([id,def])=>{const el=document.getElementById(id);if(el)el.checked=s[id]!==undefined?s[id]:def;});
  const deEl=document.getElementById('def-energy'); if(deEl&&s.defEnergy)deEl.value=s.defEnergy;
  const dpEl=document.getElementById('def-phase');  if(dpEl&&s.defPhase)dpEl.value=s.defPhase;
  // Restore institution
  const savedInst = s.institution || localStorage.getItem('nc_institution') || '';
  const instSel   = document.getElementById('def-institution');
  if (instSel && savedInst) {
    const knownOptions = Array.from(instSel.options).map(o => o.value);
    if (knownOptions.includes(savedInst)) {
      instSel.value = savedInst;
    } else if (savedInst) {
      instSel.value = 'Other';
      const otherInput = document.getElementById('def-institution-other');
      if (otherInput) otherInput.value = savedInst;
      const otherRow = document.getElementById('institution-other-row');
      if (otherRow) otherRow.style.display = 'block';
    }
  }
  // Restore wallpaper swatch highlight
  document.querySelectorAll('.wp-swatch').forEach(sw=>sw.classList.remove('active'));
  const wpEl=document.getElementById('wp-'+(s.wallpaper||'none'));
  if(wpEl) wpEl.classList.add('active');
  // Restore accent swatch
  document.querySelectorAll('.ds-accent-swatch').forEach(s2=>s2.classList.remove('active'));
  document.getElementById('accent-'+(s.accent||'cyan'))?.classList.add('active');
  // Restore intensity
  ['soft','normal','strong'].forEach(l=>document.getElementById('intensity-'+l)?.classList.toggle('active',l===(s.intensity||'normal')));
  // Restore amoled/hc mode buttons
  ['dark','amoled','hc'].forEach(m=>document.getElementById('mode-'+m)?.classList.toggle('active',m===(s.appearanceMode||'dark')));
  // Restore font swatch highlight
  document.querySelectorAll('.font-swatch').forEach(sw=>sw.style.border='2px solid transparent');
  const ftEl=document.getElementById('font-'+(s.font||'system'));
  if(ftEl) ftEl.style.border='2px solid var(--teal)';
  // Restore unit preference chips
  const savedWt = s.defWtUnit || 'kg';
  const savedHt = s.defHtUnit || 'cm';
  const wtEl = document.getElementById('def-wt-unit');
  const htEl = document.getElementById('def-ht-unit');
  if (wtEl) wtEl.value = savedWt;
  if (htEl) htEl.value = savedHt;
  document.getElementById('wt-chip-kg')?.classList.toggle('active', savedWt === 'kg');
  document.getElementById('wt-chip-lb')?.classList.toggle('active', savedWt === 'lb');
  document.getElementById('ht-chip-cm')?.classList.toggle('active', savedHt === 'cm');
  document.getElementById('ht-chip-in')?.classList.toggle('active', savedHt === 'in');
}

// ── Auto-save settings (debounced, silent) ───────────────────────
let _autoSaveTimer = null;
function autoSaveSettings() {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    try {
      // Collect all settings values
      const s = { ...currentSettings };
      ['tog-compact','tog-statusbar','tog-scroll',
       'tog-analytics','tog-advanced'].forEach(id => {
        const el = document.getElementById(id);
        if (el) s[id] = el.checked;
      });
      const deEl = document.getElementById('def-energy');
      if (deEl) s.defEnergy = deEl.value;
      const pgEl = document.getElementById('def-protein-guide');
      if (pgEl) s.defProteinGuide = pgEl.value;
      const fontSel = document.getElementById('font-select');
      if (fontSel && fontSel.value) s.font = fontSel.value;
      // Unit preferences
      const wtUnitEl = document.getElementById('def-wt-unit');
      if (wtUnitEl) s.defWtUnit = wtUnitEl.value;
      const htUnitEl = document.getElementById('def-ht-unit');
      if (htUnitEl) s.defHtUnit = htUnitEl.value;
      s.wallpaper = s.wallpaper || 'none';
      s.font      = s.font      || 'system';
      s.accent    = s.accent    || 'cyan';
      s.intensity = s.intensity || 'normal';
      // Institution
      const instSel = document.getElementById('def-institution');
      if (instSel && instSel.value) {
        const instVal = instSel.value === 'Other'
          ? (document.getElementById('def-institution-other')?.value.trim() || 'Other')
          : instSel.value;
        if (instVal) { s.institution = instVal; localStorage.setItem('nc_institution', instVal); }
      }
      DataService.save('settings', s);
      currentSettings = s;
      // Apply behaviour settings immediately
      if (typeof applyCompact !== 'undefined') applyCompact(!!s['tog-compact']);
      // Save profile fields too
      if (typeof saveProfileFromSettings !== 'undefined') {
        saveProfileFromSettings();
        if (typeof renderProfileCard !== 'undefined') renderProfileCard();
      }
      // Show subtle autosaved indicator
      const ind = document.getElementById('sdr-autosave-ind');
      if (ind) { ind.style.opacity = '1'; clearTimeout(ind._t); ind._t = setTimeout(() => { ind.style.opacity = '0'; }, 1800); }
      // Re-push presence update so admin sees institution change immediately
      if (typeof db !== 'undefined' && db) {
        const _pid2 = sessionStorage.getItem('_ntpPid');
        const _instNow = s.institution || localStorage.getItem('nc_institution') || '';
        if (_pid2 && _instNow) {
          const _upA = (() => { try { return JSON.parse(localStorage.getItem('nt_user_profile')) || {}; } catch(e) { return {}; } })();
          db.collection('presence').doc(_pid2).update({
            institution: _instNow,
            hospital:    _instNow,
            userName:    _upA.name || '',
            userRole:    _upA.role || '',
            lastSeen:    firebase.firestore.FieldValue.serverTimestamp(),
          }).catch(() => {});
        }
      }
    } catch(e) {}
  }, 600); // 600ms debounce
}

// ── Unit Preference (Weight & Height chips in Settings drawer) ───
// Called by the kg/lb and cm/in chip buttons. Updates chip active
// states and immediately persists via DataService — no debounce
// needed since the user made a deliberate discrete choice.
function applyUnitPref() {
  try {
    const wt = document.getElementById('def-wt-unit')?.value || 'kg';
    const ht = document.getElementById('def-ht-unit')?.value || 'cm';

    // Chip active states
    document.getElementById('wt-chip-kg')?.classList.toggle('active', wt === 'kg');
    document.getElementById('wt-chip-lb')?.classList.toggle('active', wt === 'lb');
    document.getElementById('ht-chip-cm')?.classList.toggle('active', ht === 'cm');
    document.getElementById('ht-chip-in')?.classList.toggle('active', ht === 'in');

    // Persist — merge into currentSettings and save
    currentSettings = currentSettings || {};
    currentSettings.defWtUnit = wt;
    currentSettings.defHtUnit = ht;
    DataService.save('settings', currentSettings);

    // Autosave indicator feedback
    const ind = document.getElementById('sdr-autosave-ind');
    if (ind) {
      ind.style.opacity = '1';
      clearTimeout(ind._t);
      ind._t = setTimeout(() => { ind.style.opacity = '0'; }, 1800);
    }
  } catch (e) {
    console.warn('[Settings] applyUnitPref:', e);
  }
}

function saveSettings(){
  const s={...currentSettings};
  ['tog-compact','tog-statusbar','tog-scroll','tog-analytics'].forEach(id=>{const el=document.getElementById(id);if(el)s[id]=el.checked;});
  s.defEnergy=document.getElementById('def-energy')?.value || s.defEnergy || 'weightbased';
  // def-phase may not exist in drawer — guard it
  const phaseEl=document.getElementById('def-phase'); if(phaseEl) s.defPhase=phaseEl.value;
  // Persist font and wallpaper from currentSettings (set by applyFont/applyWallpaper)
  // Also sync from the font-select dropdown if it was changed without clicking a swatch
  const fontSel=document.getElementById('font-select'); if(fontSel && fontSel.value) s.font=fontSel.value;
  // Unit preferences
  const wtUnitEl = document.getElementById('def-wt-unit');
  if (wtUnitEl) s.defWtUnit = wtUnitEl.value;
  const htUnitEl = document.getElementById('def-ht-unit');
  if (htUnitEl) s.defHtUnit = htUnitEl.value;
  s.wallpaper = s.wallpaper || 'none';
  s.font      = s.font      || 'system';
  s.accent    = s.accent    || 'cyan';
  s.intensity = s.intensity || 'normal';
  // Save institution
  const instSel = document.getElementById('def-institution');
  if (instSel) {
    const instVal = instSel.value === 'Other'
      ? (document.getElementById('def-institution-other')?.value.trim() || 'Other')
      : instSel.value;
    s.institution = instVal;
    localStorage.setItem('nc_institution', instVal);
  }
  DataService.save('settings',s);  // All settings go through DataService
  if(s.defEnergy){const el=document.getElementById('energy_method');if(el){el.value=s.defEnergy;toggleIC();}}
  if(s.defPhase){const el=document.getElementById('icu_phase');if(el)el.value=s.defPhase;}
  applyStatusBar(s['tog-statusbar']!==false);
  applyCompact(!!s['tog-compact']);

  // ── Update Firestore immediately when institution changes ─────
  if (db && instSel) {
    const newInst = s.institution || '';
    // Update the running session doc
    db.collection('sessions').doc(SESSION_ID).update({
      institution: newInst,
    }).catch(() => {});
    // Update presence heartbeat doc so admin sees new affiliation instantly
    const _pid = sessionStorage.getItem('_ntpPid');
    if (_pid) {
      db.collection('presence').doc(_pid).update({
        hospital: newInst,
        institution: newInst,
      }).catch(() => {});
    }
    // Update the users doc for persistent affiliation tracking
    db.collection('users').doc(SESSION_ID).set({
      sessionId:   SESSION_ID,
      institution: newInst,
      updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      deviceInfo:  navigator.userAgent.slice(0, 120),
    }, { merge: true }).catch(() => {});
  }

  try { saveProfileFromSettings(); renderProfileCard(); } catch(e) {}
  showToast('✓ Settings saved', 'success');
  // Drawer stays open — autosave handles ongoing changes
}
function resetSettings(){
  if(!confirm('Reset all settings to default?'))return;
  DataService.clear('settings');
  currentSettings={};
  ['--bg','--surface','--surface2','--surface3','--border','--teal','--teal-dim','--teal-glow','--text','--text-dim','--text-bright'].forEach(v=>document.documentElement.style.removeProperty(v));
  applyAppearanceMode('dark');  // reset to dark
  applyWallpaper('none');
  applyFont('system');
  loadSettingsUI();
  showToast('Settings reset');
}
function toggleIC() {
  const method = document.getElementById('energy_method')?.value;
  const row = document.getElementById('ic-row');
  if (row) row.style.display = (method === 'indirect') ? '' : 'none';
}
function applyInitialSettings(){
  const s=DataService.get('settings')||{};
  currentSettings=s;
  // Restore appearance mode first (affects everything else)
  if(s.appearanceMode) applyAppearanceMode(s.appearanceMode);
  // Apply saved theme, default to 'ocean' if none/invalid saved
  const savedTheme = (s.theme && THEMES[s.theme]) ? s.theme : 'ocean';
  applyTheme(savedTheme);
  _kebabUpdateLabels();
  if(s.fontSize)applyFontSize(s.fontSize);
  if(s['tog-compact'])applyCompact(true);
  if(s['tog-statusbar']===false)applyStatusBar(false);
  if(s.defEnergy){const el=document.getElementById('energy_method');if(el){el.value=s.defEnergy;toggleIC();}}
  if(s.defPhase){const el=document.getElementById('icu_phase');if(el)el.value=s.defPhase;}
  if(s.wallpaper)applyWallpaper(s.wallpaper);
  if(s.font)applyFont(s.font); else applyFont('system');
  if(s.fontSize)applyFontSize(s.fontSize); else applyFontSize('md');
  // Fix: dynamically set theme-color after load to avoid duplicate-tag browser confusion
  (function(){
    const mt = document.getElementById('meta-theme-color');
    if (!mt) return;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isStandalone && isDark) mt.content = '#1de9d4';
    else mt.content = '#020617';
  })();
  if(s.accent)applyAccent(s.accent); else applyAccent('cyan');
  if(s.intensity)applyIntensity(s.intensity); else applyIntensity('normal');
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type='info', duration=2800) {const ex=document.getElementById('toast-el');if(ex)ex.remove();const colors={success:'var(--teal)',info:'var(--teal)',warning:'var(--amber)',error:'var(--red)'};const el=document.createElement('div');el.id='toast-el';el.style.cssText=`position:fixed;bottom:50px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid ${colors[type]};color:${colors[type]};font-family:var(--mono);font-size:11px;padding:10px 22px;border-radius:6px;z-index:900;letter-spacing:1px;box-shadow:0 4px 20px rgba(0,0,0,.5);transition:opacity .4s`;el.textContent=msg;document.body.appendChild(el);setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),400);},2500);}


// MODULE: REFEEDING RISK ASSESSMENT
function rfAutoAssess() {
  const highAny = ['rf-h1','rf-h2','rf-h3','rf-h4'].filter(id => document.getElementById(id)?.checked).length;
  const medCount = ['rf-m1','rf-m2','rf-m3','rf-m4','rf-m5','rf-m6'].filter(id => document.getElementById(id)?.checked).length;
  const addCount = ['rf-a1','rf-a2','rf-a3','rf-a4','rf-a5','rf-a6'].filter(id => document.getElementById(id)?.checked).length;

  const lk = parseFloat(document.getElementById('lk')?.value) || null;
  const lp = parseFloat(document.getElementById('lp')?.value) || null;
  const lm = parseFloat(document.getElementById('lm')?.value) || null;
  const labLow = (lk && lk < 3.5) || (lp && lp < 0.8) || (lm && lm < 0.7);

  // Auto-tick lab-related RF box if lab values are low
  const labBox = document.getElementById('rf-h4');
  if (labLow && labBox && !labBox.checked) { labBox.checked = true; }

  let riskLevel, riskColor, riskBg, riskText;
  if (highAny > 0 || medCount >= 2) {
    riskLevel = 'HIGH RISK'; riskColor = 'var(--red)';
    riskBg = 'rgba(255,64,96,.12)';
    riskText = ' REFEEDING SYNDROME HIGH RISK';
  } else if (medCount === 1 || (medCount >= 1 && addCount >= 1) || addCount >= 2) {
    riskLevel = 'MODERATE RISK'; riskColor = 'var(--amber)';
    riskBg = 'rgba(255,184,48,.10)';
    riskText = ' MODERATE REFEEDING RISK';
  } else if (addCount === 1) {
    riskLevel = 'LOW–MODERATE'; riskColor = '#7aA0c8';
    riskBg = 'rgba(77,159,255,.08)';
    riskText = 'ℹ LOW–MODERATE RISK';
  } else if (highAny + medCount + addCount === 0) {
    const badge = document.getElementById('rf-live-badge');
    if (badge) { badge.textContent = 'NOT ASSESSED'; badge.style.color = 'var(--text-dim)'; badge.style.borderColor = 'rgba(100,100,100,.3)'; badge.style.background = 'var(--surface3)'; }
    document.getElementById('rf-live-result').style.display = 'none';
    return;
  } else {
    riskLevel = 'LOW RISK'; riskColor = 'var(--green)';
    riskBg = 'rgba(0,230,118,.08)';
    riskText = ' LOW REFEEDING RISK';
  }

  const badge = document.getElementById('rf-live-badge');
  if (badge) { badge.textContent = riskLevel; badge.style.color = riskColor; badge.style.borderColor = riskColor; badge.style.background = riskBg; }

  const resultEl = document.getElementById('rf-live-result');
  if (!resultEl) return;
  resultEl.style.display = '';
  resultEl.style.borderColor = riskColor;
  resultEl.style.background = riskBg;

  const protocolMap = {
    'HIGH RISK': `<div style="color:var(--red);font-weight:700;margin-bottom:8px">${riskText}</div>
      <div>⟶ <strong>Start at 5 kcal/kg/day</strong> (≈${Math.round(5*(parseFloat(document.getElementById('weight')?.value)||70))} kcal/day)</div>
      <div>⟶ IV Thiamine <strong>200–300 mg BEFORE</strong> commencing any nutrition</div>
      <div>⟶ Replace K⁺, PO₄, Mg²⁺ BEFORE feeding; monitor 2–3× daily</div>
      <div>⟶ Fluid restrict to <strong>≤1 L/day</strong> above maintenance</div>
      <div>⟶ Increase calories by <strong>max 33% every 2 days</strong> toward target</div>
      <div>⟶ Cardiac monitoring; watch for arrhythmia, oedema, encephalopathy</div>
      <div style="color:var(--text-dim);margin-top:6px;font-size:10px">Reference: NICE CG32 (2006), ASPEN 2020 Refeeding Consensus</div>`,
    'MODERATE RISK': `<div style="color:var(--amber);font-weight:700;margin-bottom:8px">${riskText}</div>
      <div>⟶ <strong>Start at 10 kcal/kg/day</strong>, advance cautiously over 3–5 days</div>
      <div>⟶ Oral/IV Thiamine <strong>100–200 mg/day</strong> for minimum 10 days</div>
      <div>⟶ Monitor electrolytes <strong>daily × 5 days</strong></div>
      <div>⟶ Supplement K⁺, PO₄, Mg²⁺ prophylactically if borderline</div>
      <div>⟶ Reassess nutritional intake and electrolytes every 48h</div>
      <div style="color:var(--text-dim);margin-top:6px;font-size:10px">Reference: NICE CG32 (2006)</div>`,
    'LOW–MODERATE': `<div style="color:#7aA0c8;font-weight:700;margin-bottom:8px">${riskText}</div>
      <div>⟶ Initiate feeding cautiously; consider slower advancement</div>
      <div>⟶ Oral thiamine supplement recommended</div>
      <div>⟶ Monitor electrolytes at <strong>baseline + day 3</strong></div>
      <div>⟶ Clinical vigilance — reassess if intake was poor for &gt;3 days</div>`,
    'LOW RISK': `<div style="color:var(--green);font-weight:700;margin-bottom:8px">${riskText}</div>
      <div>⟶ Standard feeding protocol; no refeeding precautions required</div>
      <div>⟶ Routine electrolyte monitoring applies</div>`
  };
  resultEl.innerHTML = protocolMap[riskLevel] || protocolMap['LOW RISK'];
}

// ═══════════════════════════════════════════════════════════════════════════
//  UnifiedNutritionGuidelineEngine  — Single Authoritative Reference Layer
//  Resolves all energy + protein conflicts between NutriCDE and
//  NTGuidelineEngine. Both systems must consume ONLY this data source.
//  Guidelines: ASPEN 2022 · ESPEN 2023 · KDOQI 2020 · KDIGO 2024 · NICE CG32
//  Author: Edison Taimu — Oasis v28 · KUHES / QECH Blantyre, Malawi
// ═══════════════════════════════════════════════════════════════════════════
window.UnifiedNutritionGuidelineEngine = (function () {
  'use strict';

  // ── Single source of truth: all energy + protein ranges ──────────────────
  // CONFLICT RESOLUTIONS vs previous dual-engine:
  //  • general energy:    25–30 kcal/kg  (was 20–30 in _GL; 25–30 in CDE → CDE wins — ESPEN 2023)
  //  • icu_acute energy:  15–20 kcal/kg  (was 12–25 in _GL [too wide]; 15–20 in CDE → CDE wins — SCCM/ASPEN 2022 preferred range)
  //  • icu_recovery:      20–25 kcal/kg  (advance phase, not full target — bridging range)
  //  • burns routing fix: burns now resolves to burns_major, NOT icu_acute
  //  • elderly energy:    27–32 kcal/kg  (new entry — ESPEN Geriatrics 2018)
  //  • underweight:       30–35 kcal/kg  (new entry — ESPEN 2023)
  //  • protein:           unchanged from _GL (no conflict existed)
  var _data = {

    /* Energy: kcal/kg actual BW/day unless noted */
    energy: {
      general:         { min:25, max:30, mid:27, caution:'NONE',     src:'ESPEN 2023 · ASPEN General',
                         strategy:'Stable/general ward: maintenance 25–30 kcal/kg' },
      icu_acute:       { min:15, max:20, mid:15, caution:'MODERATE', src:'SCCM/ASPEN 2022 · ESPEN ICU 2023',
                         strategy:'ICU acute phase (0–3d): permissive underfeeding acceptable; prioritise protein',
                         note:'First 48–72h: 15–20 kcal/kg; do NOT advance to full target early (suppresses autophagy, worsens infectious outcomes)' },
      icu_recovery:    { min:20, max:25, mid:22, caution:'LOW',      src:'SCCM/ASPEN 2022 · ESPEN ICU 2023',
                         strategy:'ICU late phase (4–7d): advance toward full target 20–25 kcal/kg',
                         note:'Beyond acute/ebb phase; advance gradually — full target 25–30 kcal/kg only after haemodynamic stability' },
      ckd_nodial:      { min:25, max:35, mid:30, caution:'LOW',      src:'KDOQI 2020 Guideline 3.1.1 · ESPEN Renal 2021',
                         strategy:'CKD: 25–35 kcal/kg to prevent protein catabolism for gluconeogenesis' },
      ckd_hd:          { min:25, max:35, mid:30, caution:'LOW',      src:'KDOQI 2020 Guideline 3.1.1 · ESPEN Renal 2021',
                         strategy:'Dialysis: 25–35 kcal/kg (subtract dialysate glucose absorption for PD)' },
      aki:             { min:20, max:30, mid:25, caution:'MODERATE', src:'KDIGO AKI 2012 · ESPEN Renal 2021',
                         strategy:'AKI: 20–30 kcal/kg; use dry weight; adjust per phase and RRT status' },
      cirrhosis:       { min:30, max:35, mid:32, caution:'LOW',      src:'ESPEN Liver 2019 Rec 57 · EASL 2019',
                         strategy:'Cirrhosis: 30–35 kcal/kg dry weight; 3 meals + late-evening snack mandatory',
                         note:'EASL 2019: ≥35 kcal/kg/day. Critically ill cirrhosis: 35–40 kcal/kg/day. Use dry weight — ascites/oedema overestimates.' },
      burns_major:     { min:35, max:55, mid:42, caution:'MODERATE', src:'ESPEN Burns 2013 (Rousseau et al.) · Toronto equation',
                         strategy:'Burns >20% TBSA: 35–55 kcal/kg; use burns-specific equation or indirect calorimetry',
                         note:'>20% TBSA: strongly consider indirect calorimetry; high catabolism; re-estimate weekly as wound evolves' },
      cancer:          { min:25, max:30, mid:27, caution:'LOW',      src:'ESPEN Cancer 2021',
                         strategy:'Cancer: 25–30 kcal/kg; adjust for degree of cachexia and performance status' },
      obesity_sev:     { min:11, max:14, mid:12, caution:'LOW',      src:'ASPEN/SCCM Obesity 2013 (BMI ≥40: 11–14 kcal/kg ABW)',
                         strategy:'Severe obesity (BMI ≥40): hypocaloric high-protein; 11–14 kcal/kg ABW' },
      obesity_mod:     { min:14, max:21, mid:18, caution:'LOW',      src:'ASPEN/SCCM Obesity 2013 (BMI 30–40: 14–21 kcal/kg IBW)',
                         strategy:'Obesity (BMI 30–40): hypocaloric 14–21 kcal/kg IBW or 70% estimated needs' },
      malnutrition_sev:{ min:10, max:20, mid:10, caution:'HIGH',     src:'NICE CG32 2006 · ASPEN 2020',
                         strategy:'Severely underweight (BMI <16): refeeding risk — START LOW, advance cautiously',
                         note:'Start ≤10 kcal/kg/day; advance by 5 kcal/kg/day every 2 days maximum' },
      underweight:     { min:30, max:35, mid:32, caution:'MODERATE', src:'ESPEN 2023 · WHO',
                         strategy:'Underweight (BMI 16–18.5): hypercaloric repletion feeding 30–35 kcal/kg' },
      elderly:         { min:27, max:32, mid:30, caution:'LOW',      src:'ESPEN Geriatrics 2018 · PROT-AGE',
                         strategy:'Elderly ≥70y: 27–32 kcal/kg to counter sarcopenic anorexia and reduced absorption efficiency' },
      refeeding_high:  { min:5,  max:10, mid:5,  caution:'CRITICAL', src:'NICE CG32 2006 · ASPEN Refeeding 2020',
                         strategy:'Refeeding HIGH RISK: start 5 kcal/kg/day; advance ≤5 kcal/kg every 2 days' },
      refeeding_mod:   { min:10, max:15, mid:10, caution:'HIGH',     src:'NICE CG32 2006',
                         strategy:'Refeeding MODERATE: start 10 kcal/kg/day; monitor K, P, Mg every 12h' },
      ventilated:      { min:20, max:25, mid:22, caution:'MODERATE', src:'ESPEN 2023 · SCCM/ASPEN 2022',
                         strategy:'Ventilated: avoid overfeeding to limit CO₂ production; target 20–25 kcal/kg' },
      pancreatitis:    { min:25, max:35, mid:30, caution:'LOW',      src:'ESPEN Pancreatitis 2020 · ACG' },
      cardiac_decomp:  { min:20, max:28, mid:24, caution:'MODERATE', src:'ESPEN Cardiac 2022',
                         note:'Fluid restriction often required; energy-dense feeds (≥1.5 kcal/mL)' },
      hiv_tb:          { min:30, max:35, mid:32, caution:'LOW',      src:'WHO Nutrition in HIV/TB 2003' },
      hypothyroid:     { min:20, max:25, mid:22, caution:'LOW',      src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · AACE',
                         note:'Hypothyroidism reduces BMR 10–30%; avoid overfeeding — prone to weight gain. Optimise Se, I, Zn, Vit D.' },
      hyperthyroid:    { min:35, max:50, mid:42, caution:'MODERATE', src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · ATA',
                         note:'Thyrotoxicosis increases REE 30–60%; high energy/protein to offset hypermetabolism and muscle catabolism.' },
      pcos:            { min:20, max:25, mid:22, caution:'LOW',      src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · ADA',
                         note:'Low-glycaemic-load diet reduces insulin resistance independent of weight loss.' },
      cushing:         { min:20, max:25, mid:22, caution:'LOW',      src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022',
                         note:'Cortisol-driven catabolism — restrict Na, support bone with Ca + Vit D; avoid simple sugars.' },
      addison:         { min:25, max:30, mid:27, caution:'LOW',      src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · AACE',
                         note:'Regular balanced meals (low-GI CHO + protein); increased Na and fluid needs.' },
    },

    /* Protein: g/kg actual BW/day unless noted */
    protein: {
      general:         { min:0.8,  max:1.5,  src:'WHO · ASPEN/ESPEN 2022' },
      icu:             { min:1.2,  max:2.0,  src:'ASPEN 2022 · ESPEN ICU 2023',
                         note:'Progressive delivery: 0.8–1.2 g/kg first 48–72h; advance to 1.3–2.0 g/kg by Day 3–5' },
      ckd_nodial:      { min:0.55, max:0.60, src:'KDOQI 2020 Guideline 3.0.1',
                         note:'Non-diabetic CKD G3–5: LPD 0.55–0.60 g/kg IBW. Diabetic (G3.0.2): 0.6–0.8 g/kg IBW. VLPD 0.28–0.43 + keto-analogues alternative. Reassess at dialysis initiation.' },
      ckd_hd:          { min:1.0,  max:1.2,  src:'KDOQI 2020 Guideline 3.0.3',
                         note:'MHD and PD: 1.0–1.2 g/kg dry weight/day. ISPD/ESPEN Renal 2021: 1.2–1.5 g/kg for PD to cover peritoneal losses 5–15 g/day.' },
      aki_crrt:        { min:1.5,  max:1.7,  src:'KDIGO AKI 2012 Ch.5.3.3 · ESPEN Renal 2021',
                         note:'CRRT: max 1.7 g/kg/day in hypercatabolic patients. Filter causes 10–15 g/day amino acid losses — supplement accordingly.' },
      aki_norrt:       { min:0.8,  max:1.0,  src:'KDIGO AKI 2012 Ch.5.3.1' },
      cirrhosis:       { min:1.2,  max:1.5,  src:'EASL 2019 · ESPEN Liver 2019',
                         note:'DO NOT RESTRICT protein in cirrhosis — worsens sarcopenia and outcomes. HE is NOT an indication for protein restriction.' },
      burns_major:     { min:1.5,  max:2.0,  src:'ESPEN Burns 2013 (Rousseau et al.)',
                         note:'Protein critical for wound healing; catabolism extreme in burns >60% TBSA.' },
      cancer:          { min:1.0,  max:1.5,  src:'ESPEN Cancer 2021' },
      obesity_icu:     { min:2.0,  max:2.5,  unit:'g/kg IBW/day', src:'ASPEN 2022 Obesity in Critical Illness',
                         note:'Use IDEAL body weight for protein dosing in class I–III obesity (BMI >30).' },
      malnutrition_sev:{ min:1.2,  max:1.5,  src:'ESPEN 2023',
                         note:'Start at lower end; advance carefully; monitor electrolytes for refeeding syndrome.' },
      pancreatitis:    { min:1.2,  max:1.5,  src:'ESPEN Pancreatitis 2020' },
      elderly:         { min:1.0,  max:1.5,  src:'ESPEN Geriatrics 2018 · PROT-AGE',
                         note:'PROT-AGE: minimum 1.0–1.2 g/kg/day healthy elderly; 1.2–1.5 g/kg in illness/stress.' },
      hypothyroid:     { min:0.8,  max:1.0,  src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 Box 31.3',
                         note:'Adequate tyrosine intake for thyroid hormone synthesis; avoid VLPD — impairs T4→T3 conversion.' },
      hyperthyroid:    { min:1.5,  max:2.0,  src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · ATA',
                         note:'Thyrotoxicosis causes severe protein catabolism; reduce to standard once euthyroid.' },
      pcos:            { min:1.0,  max:1.2,  src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022' },
      cushing:         { min:1.0,  max:1.2,  src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022' },
      addison:         { min:0.8,  max:1.2,  src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · AACE' },
    },


    /* Lab cross-check thresholds */
    labs: {
      phosphate_critical: 0.30,
      phosphate_low:      0.75,
      potassium_critical: 2.5,
      albumin_severe:     25,
      bilirubin_severe:   100,
      bilirubin_moderate: 50,
      trig_hold:          4.5,
      glucose_hyper:      12,
      egfr_severe:        30,
    }
  };

  // ── Condition code resolver: maps clinical params → {eCode, pCode} ────────
  function resolveConditionCodes(params) {
    var dx      = ((params.dx      || 'general') + '').toLowerCase();
    var renal   = ((params.renal   || 'normal')  + '').toLowerCase();
    var hepatic = ((params.hepatic || 'normal')  + '').toLowerCase();
    var bmi     = parseFloat(params.bmi)  || 0;
    var age     = parseInt(params.age)    || 0;
    var phase   = ((params.phase   || '')        + '').toLowerCase();
    var isICU       = !!params.isICU;
    var isVentilated= !!params.isVentilated;
    var isRefeeding = !!params.isRefeeding;
    var rfRiskLevel = ((params.rfRiskLevel || 'LOW') + '').toUpperCase();

    // Refeeding overrides all other conditions
    if (isRefeeding) {
      return {
        eCode: rfRiskLevel === 'HIGH' ? 'refeeding_high' : 'refeeding_mod',
        pCode: 'malnutrition_sev'
      };
    }

    var eCode = 'general', pCode = 'general';

    // Renal hierarchy (most specific wins)
    if      (renal === 'aki_rrt')   { eCode = 'aki';        pCode = 'aki_crrt';   }
    else if (renal === 'aki_no_rrt'){ eCode = 'aki';        pCode = 'aki_norrt';  }
    else if (['ckd','ckd_g1g2','ckd_g3a','ckd_g3b','ckd_g4','ckd_g5'].indexOf(renal) !== -1) {
                                      eCode = 'ckd_nodial'; pCode = 'ckd_nodial'; }
    else if (renal === 'hd')        { eCode = 'ckd_hd';     pCode = 'ckd_hd';    }
    else if (renal === 'pd')        { eCode = 'ckd_hd';     pCode = 'ckd_hd';    }

    // Hepatic
    else if (hepatic === 'severe' || hepatic === 'mild') { eCode = 'cirrhosis'; pCode = 'cirrhosis'; }

    // Burns — MUST be checked before generic ICU routing to prevent wrong mapping
    else if (dx === 'burns')        { eCode = 'burns_major'; pCode = 'burns_major'; }

    // ICU / critical illness (phase-driven)
    else if (isICU && (phase === 'early'))               { eCode = 'icu_acute';    pCode = 'icu'; }
    else if (isICU && (phase === 'late' || phase === 'recovery')) { eCode = 'icu_recovery'; pCode = 'icu'; }
    else if (isICU)                                      { eCode = 'icu_acute';    pCode = 'icu'; }
    else if (['icu_critical','sepsis','septic_shock','trauma','ards','multiorgan_failure','post_cardiac_arrest'].indexOf(dx) !== -1) {
                                                           eCode = 'icu_acute';    pCode = 'icu'; }

    // Ventilated — respiratory-driven formula
    else if (isVentilated && ['ards','copd','respiratory_failure'].indexOf(dx) !== -1) { eCode = 'ventilated'; pCode = 'icu'; }

    // Obesity (energy per ABW or IBW; protein always per IBW)
    else if (bmi >= 40)             { eCode = 'obesity_sev'; pCode = 'obesity_icu'; }
    else if (bmi >= 30)             { eCode = 'obesity_mod'; pCode = 'obesity_icu'; }

    // Specific diagnoses
    else if (dx.indexOf('pancreat') !== -1)                           { eCode = 'pancreatitis'; pCode = 'pancreatitis'; }
    else if (dx.indexOf('cancer') !== -1 || dx.indexOf('oncol') !== -1 ||
             dx.indexOf('lymphoma') !== -1 || dx.indexOf('leuk') !== -1) { eCode = 'cancer'; pCode = 'cancer'; }
    else if (dx.indexOf('hiv') !== -1 || dx.indexOf('tb') !== -1 ||
             dx.indexOf('tuberculosis') !== -1)                        { eCode = 'hiv_tb';  pCode = 'general'; }
    else if (dx.indexOf('hypothyroid') !== -1 || dx.indexOf('hashimoto') !== -1) { eCode = 'hypothyroid'; pCode = 'hypothyroid'; }
    else if (dx.indexOf('hyperthyroid') !== -1 || dx.indexOf('graves') !== -1)   { eCode = 'hyperthyroid'; pCode = 'hyperthyroid'; }
    else if (dx.indexOf('pcos')    !== -1)  { eCode = 'pcos';    pCode = 'pcos';    }
    else if (dx.indexOf('cushing') !== -1)  { eCode = 'cushing'; pCode = 'cushing'; }
    else if (dx.indexOf('addison') !== -1)  { eCode = 'addison'; pCode = 'addison'; }
    else if (dx === 'heart_failure' || dx === 'cardiac') { eCode = 'cardiac_decomp'; pCode = 'general'; }

    // Nutritional status (BMI-driven — after diagnosis-specific checks)
    else if (bmi > 0 && bmi < 16)   { eCode = 'malnutrition_sev'; pCode = 'malnutrition_sev'; }
    else if (bmi >= 16 && bmi < 18.5){ eCode = 'underweight';     pCode = 'malnutrition_sev'; }

    // Elderly
    else if (age >= 70)             { eCode = 'elderly'; pCode = 'elderly'; }

    return { eCode: eCode, pCode: pCode };
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    _data: _data,

    getEnergyRange:   function(code) { return _data.energy[code]  || _data.energy.general;  },
    getProteinRange:  function(code) { return _data.protein[code] || _data.protein.general; },
    getLabThresholds: function()     { return _data.labs; },
    getAllGuidelines:  function()     { return _data; },

    checkRange: function(value, range) {
      if (value < range.min) return 'low';
      if (value > range.max) return 'high';
      return 'normal';
    },

    resolveConditionCodes: resolveConditionCodes,

    /**
     * getEnergyTarget(params) — replaces NutriCDE.EnergyEngine.getTarget()
     * params: { dx, phase, bmi, age, isVentilated, isRefeeding, rfRiskLevel, renal, hepatic, isICU }
     * Returns: { kcalKgLo, kcalKgHi, kcalKgMid, strategy, caution, guideline, note, eCode, pCode }
     */
    getEnergyTarget: function(params) {
      var codes  = resolveConditionCodes(params);
      var eRange = _data.energy[codes.eCode] || _data.energy.general;
      return {
        kcalKgLo:  eRange.min,
        kcalKgHi:  eRange.max,
        kcalKgMid: eRange.mid != null ? eRange.mid : Math.round((eRange.min + eRange.max) / 2),
        strategy:  eRange.strategy  || (eRange.min + '–' + eRange.max + ' kcal/kg/day'),
        caution:   eRange.caution   || 'NONE',
        guideline: eRange.src       || 'ESPEN 2023 · ASPEN General',
        note:      eRange.note      || '',
        eCode:     codes.eCode,
        pCode:     codes.pCode,
      };
    },

    /**
     * getProteinTarget(params)
     * Returns: { gKgLo, gKgHi, gKgMid, unit, guideline, note, pCode }
     */
    getProteinTarget: function(params) {
      var codes  = resolveConditionCodes(params);
      var pRange = _data.protein[codes.pCode] || _data.protein.general;
      return {
        gKgLo:    pRange.min,
        gKgHi:    pRange.max,
        gKgMid:   Math.round(((pRange.min + pRange.max) / 2) * 10) / 10,
        unit:     pRange.unit     || 'g/kg actual BW/day',
        guideline:pRange.src      || 'ASPEN/ESPEN 2022',
        note:     pRange.note     || '',
        pCode:    codes.pCode,
      };
    },
  };
})();

// ═══════════════════════════════════════════════════════════════════════════
//  NutriCDE — Clinical Decision Engine  (Modular · Guideline-Based)
//  Architecture: 9 independent modules, each callable standalone or combined
//  Guidelines: consumed via UnifiedNutritionGuidelineEngine (single source)
//  Author: Edison Taimu — Oasis · KUHES / QECH Blantyre, Malawi
// ═══════════════════════════════════════════════════════════════════════════
const NutriCDE = (() => {
  'use strict';

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 1 ▸ ENERGY ENGINE
  // Adaptive energy targeting: condition → phase → nutritional status → kcal
  // Prevents both overfeeding and underfeeding algorithmically
  // ──────────────────────────────────────────────────────────────────────────
  const EnergyEngine = {
    /**
     * getTarget(params) — delegates to UnifiedNutritionGuidelineEngine (single source of truth)
     * params: { dx, phase, bmi, age, isVentilated, isRefeeding, rfRiskLevel, renal, hepatic, isICU }
     * Returns: { kcalKgLo, kcalKgHi, kcalKgMid, strategy, caution, guideline, note }
     *
     * All hardcoded per-condition values have been removed. Ranges, strategies, and
     * guidelines are now maintained exclusively in UnifiedNutritionGuidelineEngine._data.energy.
     */
    getTarget(params) {
      if (window.UnifiedNutritionGuidelineEngine) {
        return window.UnifiedNutritionGuidelineEngine.getEnergyTarget(params);
      }
      // Fallback (should never be reached — UnifiedNutritionGuidelineEngine loads first)
      return { kcalKgLo:25, kcalKgHi:30, kcalKgMid:27, strategy:'Stable/general ward: maintenance 25–30 kcal/kg', caution:'NONE', guideline:'ESPEN 2023 · ASPEN General', note:'' };
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 2 ▸ PROTEIN ENGINE + ENERGY-PROTEIN COUPLING
  // Core logic: protein prescriptions must be supported by sufficient non-protein energy
  // Trigger: if protein ≥ 1.5 g/kg AND (protein kcal > 25% total kcal) → warn
  // ──────────────────────────────────────────────────────────────────────────
  const ProteinEngine = {
    /**
     * checkCoupling({ totalKcal, proteinG, weightKg })
     * Returns coupling analysis object
     */
    checkCoupling({ totalKcal, proteinG, weightKg }) {
      const protKcal       = proteinG * 4;
      const nonProtKcal    = totalKcal - protKcal;
      const protGperKg     = proteinG / weightKg;
      const nonProtPerGPro = proteinG > 0 ? nonProtKcal / proteinG : 0;
      // ESPEN: ideal non-protein kcal:nitrogen ratio = 100–150 kcal/g N
      // Nitrogen (g) = protein (g) / 6.25
      const nitrogenG      = proteinG / 6.25;
      const npCalNRatio    = nitrogenG > 0 ? nonProtKcal / nitrogenG : 0;
      // Adequacy flag: non-protein kcal should be ≥75% of total
      const nonProtPct     = totalKcal > 0 ? (nonProtKcal / totalKcal) * 100 : 0;
      let status = 'OK', severity = 'none', message = '', recommendation = '';
      if (protGperKg >= 1.5 && nonProtPct < 60) {
        status = 'MISMATCH';
        severity = nonProtPct < 45 ? 'CRITICAL' : 'WARNING';
        message  = `Protein-energy mismatch: protein ${proteinG.toFixed(0)} g/day (${protGperKg.toFixed(2)} g/kg) but only ${nonProtKcal.toFixed(0)} kcal non-protein energy (${nonProtPct.toFixed(0)}% of total). Protein may be oxidised for energy (gluconeogenesis), defeating its anabolic purpose.`;
        const requiredNonProtKcal = Math.round(proteinG * 25); // min 25 kcal/g protein
        const deficit = Math.max(0, requiredNonProtKcal - nonProtKcal);
        recommendation = `Increase total energy by ≥${deficit} kcal/day to achieve non-protein:protein ratio of ≥25 kcal/g protein. Target NPC:N ratio 100–150 kcal/g nitrogen (currently ${npCalNRatio.toFixed(0)} kcal/g N). Consider: ↑ CHO (dextrose/maltodextrin) or ↑ formula volume if enteral.`;
      } else if (protGperKg >= 1.5 && nonProtPct >= 60) {
        message = `Protein-energy balance adequate: NPC:N = ${npCalNRatio.toFixed(0)} kcal/g N (target 100–150). Non-protein energy = ${nonProtKcal.toFixed(0)} kcal (${nonProtPct.toFixed(0)}% of total).`;
      }
      return { status, severity, message, recommendation, npCalNRatio: npCalNRatio.toFixed(0), nonProtKcal: Math.round(nonProtKcal), nonProtPct: nonProtPct.toFixed(0), protGperKg: protGperKg.toFixed(2) };
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 3 ▸ MACRONUTRIENT ENGINE (Condition-driven ranges)
  // Each condition returns {cho, fat, protein} with clinical rationale
  // ──────────────────────────────────────────────────────────────────────────
  const MacroEngine = {
    getContextualNote({ dx, renal, hepatic, bmi, isVentilated, glucose }) {
      const notes = [];
      if (isVentilated && (dx === 'ards' || dx === 'copd' || dx === 'respiratory_failure'))
        notes.push('↓ CHO reduces respiratory quotient (RQ) → less CO₂ produced → reduces ventilatory load. Target RQ 0.85 with high-fat/lower-CHO formula (e.g. Pulmocare/Nutrison Energy).');
      if (dx === 'sepsis' || dx === 'icu_critical')
        notes.push('Insulin resistance is expected in sepsis/critical illness. Target BGL 6.1–10 mmol/L. Avoid CHO overload (max glucose oxidation rate ≤5 mg/kg/min = CHO ≤7.2 g/kg/day).');
      if (dx === 'dm1' || dx === 'dm2' || dx === 'diabetes_t2' || dx === 'diabetes_t1' || dx === 'pregnancy_gest_dm')
        notes.push(dx === 'pregnancy_gest_dm'
          ? 'GDM: CHO-controlled plan — min 175 g CHO/day distributed across 3 meals + 2–4 snacks. Limit CHO at breakfast (~30 g) — AM cortisol worsens glucose tolerance. Late evening snack required. Target FBG <5.3, 1-hr PP <7.8, 2-hr PP <6.7 mmol/L. Monitor ketones. Source: Jones J, Krause & Mahan 16th ed. Ch. 30.'
          : 'Distribute CHO evenly across 3–5 meals/day. Prioritise low-GI sources (GI <55). Monitor BGL pre/post meals. Target BGL 6.1–10 mmol/L (hospital inpatient). ADA 2024: no universal CHO% — individualise by glycaemic response. Fibre ≥25–38 g/day. Eliminate SSBs. Source: Jones J, Krause & Mahan 16th ed. Ch. 30.');
      if (['ckd_g3a','ckd_g3b','ckd_g4','ckd_g5','ckd','hd','pd'].includes(renal))
        notes.push('Higher CHO % helps spare protein for tissue maintenance (protein-sparing effect). Avoid simple sugars — glucose load worsens CKD-related insulin resistance. Restrict K⁺ in CHO food choices.');
      if (glucose && glucose > 10)
        notes.push(` BGL ${glucose} mmol/L — Hyperglycaemia active. Reduce CHO density. Initiate insulin protocol. NICE-SUGAR target: 6.1–10 mmol/L.`);
      if (hepatic === 'severe')
        notes.push('Late Evening Snack (LES) mandatory — prevents overnight protein catabolism (EASL 2019). Complex CHO preferred; avoid prolonged fasting >4h. BCAA supplement if encephalopathy persists despite adequate protein.');
      if (bmi >= 30)
        notes.push('Hypocaloric feeding in obesity: reduce CHO (greatest driver of lipogenesis) while maintaining protein. Mediterranean-pattern fat distribution (MUFA > SFA). Aim 500–750 kcal/day deficit from estimated needs.');
      return notes;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 4 ▸ MICRONUTRIENT ENGINE (Condition-Specific)
  // Returns priority micronutrients per condition + feeding route
  // ──────────────────────────────────────────────────────────────────────────
  const MicroEngine = {
    /**
     * getPriorities({ dx, renal, hepatic, route, isRefeeding, rfRiskLevel, isICU })
     * Returns [{ name, dose, rationale, urgency }]
     */
    getPriorities({ dx, renal, hepatic, route, isRefeeding, rfRiskLevel, isICU, isObesity, bmi, age }) {
      const mx = [];
      // 1. REFEEDING — always first
      if (isRefeeding) {
        const urg = rfRiskLevel === 'HIGH' ? 'CRITICAL' : 'HIGH';
        mx.push({ name:'Thiamine (B1)', dose: rfRiskLevel==='HIGH' ? 'IV 200–300 mg BEFORE feeds commence' : 'Oral/IV 100–200 mg/day × 10 days', rationale:'Prevent Wernicke encephalopathy during refeeding', urgency: urg });
        mx.push({ name:'Potassium (K⁺)', dose:'Correct to ≥3.5 mmol/L before feeding · Monitor 2–3×/day', rationale:'Refeeding hypokalaemia — life-threatening arrhythmia risk from intracellular K⁺ shift', urgency: urg });
        mx.push({ name:'Phosphate (PO₄)', dose:'Monitor daily and replace as needed · Target ≥0.8 mmol/L · HOLD feeds if PO₄ < 0.6 mmol/L', rationale:'Refeeding hypophosphataemia — hallmark of refeeding syndrome; drives ATP depletion, cardiac arrhythmia, respiratory failure', urgency: urg });
        mx.push({ name:'Magnesium (Mg²⁺)', dose:'Monitor daily and replace as needed · Target ≥0.75 mmol/L', rationale:'Refeeding hypomagnesaemia — neuromuscular instability and cardiac risk', urgency: urg });
      }
      // 2. ICU / Critical illness (ESPEN ICU 2023)
      if (isICU || dx === 'sepsis' || dx === 'ards' || dx === 'burns' || dx === 'trauma') {
        mx.push({ name:'Selenium', dose:'100–400 µg/day. Higher doses only if part of specialised antioxidant protocols.', rationale:'Antioxidant — depleted in critical illness, sepsis, and burns. Reduces oxidative stress and infection risk (ESPEN ICU 2023)', urgency:'HIGH' });
        mx.push({ name:'Zinc', dose: dx==='burns' ? '220 mg/day (burns protocol)' : '10–20 mg/day (IV or enteral)', rationale:'Wound healing, immune function, critically depleted in illness and burns', urgency: dx==='burns'?'HIGH':'MODERATE' });
        mx.push({ name:'Vitamin C', dose: dx==='burns' ? '500–1000 mg/day' : '200–500 mg/day', rationale:'Antioxidant, collagen synthesis, immune support; plasma levels plummet in critical illness', urgency:'MODERATE' });
        mx.push({ name:'Vitamin D', dose:'Check 25-OH Vit D · Supplement 50,000 IU loading if deficient · Maintenance 1000–2000 IU/day', rationale:'Deficiency common in ICU/hospitalised patients — impairs immune response and muscle function', urgency:'MODERATE' });
        if (dx === 'ards' || dx === 'sepsis')
          mx.push({ name:'Omega-3 (EPA+DHA)', dose:'1–2 g EPA+DHA/day via enteral route', rationale:'Anti-inflammatory modulation; may reduce ventilator days and ICU LOS (ESPEN 2023 — consider use)', urgency:'MODERATE' });
      }
      // 3. Burns-specific
      if (dx === 'burns') {
        mx.push({ name:'Glutamine', dose:'0.3–0.5 g/kg/day (enteral · 10–20 days)', rationale:'Burns: accelerates wound healing, reduces infection, preserves gut integrity (ESPEN Burns 2013)', urgency:'HIGH' });
        mx.push({ name:'Copper', dose:'Monitor · 4–5 mg/day in large burns', rationale:'Depleted in exudate — essential for collagen cross-linking and wound healing', urgency:'MODERATE' });
      }
      // 4. CKD / Dialysis
      if (['ckd_g3a','ckd_g3b','ckd_g4','ckd_g5','ckd','hd','pd','aki_rrt','aki_no_rrt'].includes(renal)) {
        mx.push({ name:'Phosphate', dose:'Restrict dietary PO₄ <800 mg/day · Phosphate binders with meals if on dialysis', rationale:'Hyperphosphataemia in CKD → calcification, cardiovascular events, secondary hyperparathyroidism (KDIGO 2024)', urgency:'HIGH' });
        mx.push({ name:'Potassium', dose:'Restrict K⁺ <2000 mg/day if hyperkalemia · Monitor with eGFR', rationale:'Impaired renal K⁺ excretion → hyperkalaemia → life-threatening arrhythmia (KDIGO 2024)', urgency:'HIGH' });
        mx.push({ name:'Water-Soluble Vitamins (B-complex + C)', dose:'Daily B-vitamin complex + Vitamin C 60–100 mg/day (not >200 mg — oxalate risk in CKD)', rationale:'Dialysis removes water-soluble vitamins; risk of deficiency increases with restricted diet (KDOQI 2020)', urgency:'MODERATE' });
        mx.push({ name:'Vitamin D (active)', dose:'Calcitriol or alfacalcidol per nephrology protocol', rationale:'CKD impairs 1-α-hydroxylation → active Vit D deficiency → secondary hyperparathyroidism (KDIGO 2024)', urgency:'MODERATE' });
        if (['ckd_g4','ckd_g5','hd','pd'].includes(renal))
          mx.push({ name:'Iron (if on EPO / ESA therapy)', dose:'IV iron preferred in HD patients · Check TSAT and ferritin (target TSAT >20%, ferritin >200 µg/L)', rationale:'Iron deficiency anaemia in CKD often requires IV iron (oral poorly absorbed and elevates phosphate) (KDIGO 2024 Anaemia)', urgency:'MODERATE' });
      }
      // 5. Hepatic failure
      if (hepatic === 'severe' || hepatic === 'mild') {
        mx.push({ name:'Zinc', dose:'30–45 mg elemental zinc/day', rationale:'Hepatic zinc depletion is universal in cirrhosis — deficiency worsens encephalopathy and immune function (EASL 2019)', urgency: hepatic==='severe'?'HIGH':'MODERATE' });
        mx.push({ name:'Vitamin K', dose:'10 mg IV/IM 3× per week if coagulopathic; rule out VKA effect first', rationale:'Impaired hepatic synthesis of Vit K-dependent clotting factors (II, VII, IX, X) (EASL 2019)', urgency: hepatic==='severe'?'HIGH':'MODERATE' });
        mx.push({ name:'B Vitamins (thiamine, folate, B12)', dose:'Daily supplement · IV thiamine 100 mg if alcohol-related', rationale:'Alcohol-related liver disease: profound B vitamin depletion. Cirrhosis impairs storage and activation (EASL 2019)', urgency:'MODERATE' });
        mx.push({ name:'Fat-Soluble Vitamins (A, D, E, K)', dose:'Monitor levels · Supplement if steatorrhoea present · Avoid Vit A excess (hepatotoxic)', rationale:'Cholestasis and fat malabsorption impair fat-soluble vitamin absorption in liver disease (ESPEN Liver 2019)', urgency:'MODERATE' });
      }
      // 6. Diabetes (Krause & Mahan 16th ed., Ch. 30 · ADA 2024)
      if (dx === 'dm1' || dx === 'dm2' || dx === 'diabetes_t2' || dx === 'diabetes_t1' || dx === 'prediabetes' || dx === 'pregnancy_gest_dm') {
        mx.push({ name:'Magnesium', dose:'320–420 mg/day dietary + supplement if deficient (serum Mg <0.75 mmol/L)', rationale:'Hypomagnesaemia impairs insulin signalling and glucose transport; worsened by glycosuria in DM (Krause Ch. 30 / ADA 2024)', urgency:'LOW' });
        mx.push({ name:'Vitamin D', dose:'Monitor 25-OH Vit D · Supplement 1000–2000 IU/day if deficient (<50 nmol/L)', rationale:'Vit D deficiency associated with impaired β-cell function and peripheral insulin resistance (Krause Ch. 30 / ADA 2024)', urgency:'LOW' });
        mx.push({ name:'Chromium', dose:'Dietary sources preferred; supplement evidence weak — ADA does not endorse routine use', rationale:'Chromium may modestly reduce FPG and A1C at pharmacologic doses but evidence inconsistent (Krause Ch. 30 / ADA 2024)', urgency:'NONE' });
        if (dx === 'dm2' || dx === 'diabetes_t2' || dx === 'prediabetes') {
          mx.push({ name:'Vitamin B12 (if on Metformin)', dose:'Monitor B12 annually. Oral cyanocobalamin 1000 mcg/day if deficient', rationale:'Metformin impairs B12 absorption in 10–30% of users; risk of peripheral neuropathy if deficient (Krause Ch. 30 / ADA 2024)', urgency:'MODERATE' });
          mx.push({ name:'Folate', dose:'400–600 mcg/day from dietary sources (dark leafy greens, legumes, fortified grains)', rationale:'Metformin may reduce folate levels; folate supports RBC production and reduces homocysteine (cardiovascular risk factor) (Krause Ch. 30)', urgency:'LOW' });
        }
        if (dx === 'pregnancy_gest_dm') {
          mx.push({ name:'Folate (GDM)', dose:'600 mcg/day from dietary sources + supplement · Folic acid 400–800 mcg/day pre-conception', rationale:'All pregnant women require folate ≥600 mcg/day for neural tube protection; GDM does not alter this requirement (IOM DRI)', urgency:'HIGH' });
          mx.push({ name:'Iron (GDM)', dose:'27 mg/day (DRI pregnancy) · Check FBC — supplement if IDA confirmed', rationale:'Iron requirements double in pregnancy; IDA worsens GDM maternal–fetal outcomes (IOM DRI / Krause Ch. 30)', urgency:'MODERATE' });
          mx.push({ name:'Calcium (GDM)', dose:'1000 mg/day from dietary sources (dairy, leafy greens, fortified foods)', rationale:'Calcium requirement unchanged in pregnancy (1000 mg/day); adequate intake supports fetal bone mineralisation (IOM DRI)', urgency:'LOW' });
        }
      }
      // 7. Malnutrition / SAM-like states
      if (bmi < 16 || dx === 'malnutrition_severe' || dx === 'malnutrition_moderate') {
        mx.push({ name:'Thiamine (B1)', dose:'100–200 mg/day oral or IV during refeeding', rationale:'Prevents Wernicke encephalopathy — essential before initiating carbohydrate feeds in malnourished patients', urgency:'HIGH' });
        mx.push({ name:'Multi-Micronutrient Supplement', dose:'WHO multi-micronutrient powder or equivalent 1× daily', rationale:'Broad deficiency expected in severe malnutrition — zinc, iron, vitamin A, vitamin C, selenium, folate all depleted', urgency:'HIGH' });
        mx.push({ name:'Zinc', dose:'20 mg elemental/day × 14 days', rationale:'Critical for growth, immune recovery, and gut mucosal repair in malnutrition (WHO CMAM protocol)', urgency:'HIGH' });
        mx.push({ name:'Vitamin A', dose:'200,000 IU on Day 1, Day 2, Day 15 (if no measles vaccination)', rationale:'Deficiency common in severe malnutrition — impairs immune defence against infection (WHO SAM protocol 2023)', urgency:'HIGH' });
      }
      // 8. General ward / post-operative
      if (!isICU && !isRefeeding && bmi >= 18.5 && bmi < 30) {
        mx.push({ name:'Vitamin D + Calcium', dose:'Vit D 1000–2000 IU/day · Ca 1000–1200 mg/day (from diet ± supplement)', rationale:'Hospitalised patients frequently deficient — impairs muscle function, immunity, and bone health (ESPEN 2023)', urgency:'LOW' });
        mx.push({ name:'Iron', dose:'Check ferritin/CBC pre-supplement; oral ferrous 150–200 mg elemental/day if IDA confirmed', rationale:'IDA: most common nutritional deficiency globally — often undetected in hospitalised patients', urgency:'LOW' });
      }
      return mx;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 5 ▸ ADVANCED PES GENERATOR
  // Evidence-based: uses actual vs required intake, labs, weight data
  // Returns structured PES with objective evidence — no generic diagnoses
  // ──────────────────────────────────────────────────────────────────────────
  const PESGenerator = {
    /**
     * generate({ P_code, P_label, etiology, evidence[] })
     * Returns { statement, code, label, etiology, evidenceList }
     */
    generate({ dx, bmi, bmiCat, weight, ibw, energy, protein, protGperKg, route,
               isRefeeding, rfRiskLevel, isICU, isCritical, isRenal, isHepatic,
               isCancer, isSurgical, isObesity, tbsa, icuPhase, labs, diagText,
               pctIntakeVsReq }) {
      // ── P: Precision NCP Problem Selection ─────────────────────────────
      let P_code = 'NI-1.4', P_label = 'Inadequate energy intake relative to estimated requirements';
      if (isRefeeding && (rfRiskLevel==='HIGH'||rfRiskLevel==='MODERATE')) {
        P_code = 'NI-1.4'; P_label = 'Inadequate energy intake with high refeeding syndrome risk';
      } else if (dx==='burns' && tbsa>0) {
        P_code = 'NI-5.1'; P_label = `Increased energy and protein needs — thermal injury (${tbsa}% TBSA)`;
      } else if (bmi < 16) {
        P_code = 'NI-5.2'; P_label = 'Severe protein-energy malnutrition (BMI < 16 kg/m²)';
      } else if (isCritical) {
        P_code = 'NI-5.1'; P_label = 'Increased energy and protein needs secondary to critical illness hypermetabolism';
      } else if (isRenal) {
        P_code = 'NC-2.2'; P_label = 'Altered nutrition-related laboratory values secondary to renal dysfunction';
      } else if (isHepatic) {
        P_code = 'NC-2.1'; P_label = 'Impaired nutrient utilisation related to hepatic synthetic failure';
      } else if (isCancer) {
        P_code = 'NI-5.2'; P_label = 'Malnutrition / cancer cachexia — inadequate energy and protein intake relative to demands';
      } else if (dx==='malnutrition_severe') {
        P_code = 'NI-5.2'; P_label = 'Severe malnutrition — critically inadequate energy and protein intake';
      } else if (dx==='malnutrition_moderate') {
        P_code = 'NI-5.2'; P_label = 'Moderate malnutrition — inadequate energy and protein intake';
      } else if (bmi < 18.5) {
        P_code = 'NC-3.1'; P_label = 'Underweight — inadequate energy intake relative to estimated needs';
      } else if (dx==='dm1'||dx==='dm2'||dx==='diabetes_t2'||dx==='diabetes_t1'||dx==='pregnancy_gest_dm') {
        P_code = dx==='pregnancy_gest_dm' ? 'NC-2.2' : 'NI-5.8.6';
        P_label = dx==='pregnancy_gest_dm'
          ? 'Altered blood glucose values related to gestational diabetes mellitus'
          : 'Inconsistent carbohydrate intake related to diabetes mellitus';
      } else if (dx==='heart_failure'||dx==='cardiac') {
        P_code = 'NI-1.4'; P_label = 'Inadequate energy intake related to cardiac cachexia and reduced appetite';
      } else if (dx==='copd'||dx==='respiratory_failure') {
        P_code = 'NI-5.1'; P_label = 'Increased energy needs related to elevated work of breathing';
      } else if (isSurgical) {
        P_code = 'NI-1.4'; P_label = 'Inadequate energy intake related to post-surgical catabolism and nil-by-mouth period';
      } else if (isObesity) {
        P_code = 'NC-3.3'; P_label = 'Overweight/obesity — excessive energy and/or macronutrient intake relative to needs';
      }

      // ── E: Disease-Specific Etiology ──────────────────────────────────
      let E = 'disease-related physiological demands and/or inadequate dietary intake';
      if (isRefeeding)             E = 'prolonged inadequate nutrition prior to admission causing severe macro- and micro-nutrient depletion';
      else if (dx==='burns')       E = `thermal injury (${tbsa}% TBSA) causing hypermetabolism, obligatory protein catabolism, and major evaporative fluid and nitrogen losses`;
      else if (dx==='sepsis'||dx==='septic_shock') E = 'systemic inflammatory response syndrome (SIRS) altering substrate metabolism, causing insulin resistance and obligate catabolism';
      else if (dx==='ards')        E = 'acute respiratory distress syndrome with impaired ventilation, elevated metabolic demand, and systemic inflammation';
      else if (dx==='trauma')      E = 'post-traumatic neuroendocrine stress response (cortisol, catecholamines) driving protein catabolism and gluconeogenesis';
      else if (isRenal)            E = 'impaired renal clearance of nitrogenous waste, protein-energy wasting syndrome, and uraemia-induced anorexia';
      else if (isHepatic)          E = 'hepatic synthetic failure, impaired glycogenolysis and gluconeogenesis, and altered amino acid metabolism';
      else if (isCancer)           E = 'tumour-driven cytokine cascade (IL-1β, IL-6, TNF-α) causing anorexia-cachexia syndrome and altered substrate oxidation';
      else if (dx==='heart_failure') E = 'cardiac cachexia (intestinal oedema causing malabsorption, reduced intake from dyspnoea, and elevated resting energy expenditure)';
      else if (dx==='copd')        E = 'chronically elevated work of breathing, systemic inflammation, and corticosteroid-induced catabolism';
      else if (isSurgical)         E = 'surgical stress response, perioperative nil-by-mouth period, and post-operative ileus reducing intake';
      else if (isObesity)          E = 'excess energy intake relative to energy expenditure, compounded by sedentary behaviour and adipose-driven insulin resistance';
      else if (bmi < 18.5)         E = 'chronically inadequate dietary intake relative to physiological requirements, with depleted energy and protein reserves';

      // ── S: Objective Evidence — ABNORMAL FINDINGS ONLY ──────────────────
      const sArr = [];
      const pctIBW = ibw > 0 ? Math.round((weight/ibw)*100) : null;

      // Anthropometric — only flag deviations from normal
      if (bmi < 18.5) {
        const sev = bmi < 16 ? 'severely underweight' : bmi < 17 ? 'moderately underweight' : 'underweight';
        sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (${sev} — normal 18.5–24.9 kg/m²)`);
      } else if (bmi >= 25 && bmi < 30) {
        sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (overweight — normal 18.5–24.9 kg/m²)`);
      } else if (bmi >= 30) {
        const obClass = bmi >= 40 ? 'Class III obesity' : bmi >= 35 ? 'Class II obesity' : 'Class I obesity';
        sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (${obClass} — normal 18.5–24.9 kg/m²)`);
      }
      if (pctIBW !== null && pctIBW < 90)
        sArr.push(`body weight ${weight.toFixed(1)} kg = ${pctIBW}% IBW — below expected (IBW ${ibw.toFixed(1)} kg)`);
      else if (pctIBW !== null && pctIBW > 120)
        sArr.push(`body weight ${weight.toFixed(1)} kg = ${pctIBW}% IBW — above expected (IBW ${ibw.toFixed(1)} kg)`);

      // Dietary intake — only if below target
      if (pctIntakeVsReq && pctIntakeVsReq > 0 && pctIntakeVsReq < 75) {
        const defSev = pctIntakeVsReq < 25 ? 'severely deficient' : pctIntakeVsReq < 50 ? 'markedly deficient' : 'deficient';
        sArr.push(`estimated energy intake ≈${pctIntakeVsReq}% of requirements (${defSev} — target: ${Math.round(energy)} kcal/day, ${protein.toFixed(0)} g protein/day)`);
      } else if (pctIntakeVsReq && pctIntakeVsReq >= 75 && pctIntakeVsReq < 100) {
        sArr.push(`estimated energy intake ≈${pctIntakeVsReq}% of requirements — below target (${Math.round(energy)} kcal/day)`);
      }

      // Biochemical — only abnormal values with reference ranges
      if (labs) {
        if (labs.albumin && labs.albumin < 35)
          sArr.push(`serum albumin ${labs.albumin} g/L (low — normal 35–50 g/L; inflammatory marker, not sole malnutrition indicator)`);
        if (labs.prealbumin && labs.prealbumin < 0.15)
          sArr.push(`pre-albumin ${(labs.prealbumin * 1000).toFixed(0)} mg/L (low — normal 150–400 mg/L; short-term nutrition marker, t½ 2 days)`);
        if (labs.crp && labs.crp > 5)
          sArr.push(`CRP ${labs.crp} mg/L (elevated — normal < 5 mg/L; active systemic inflammation)`);
        if (labs.glucose && labs.glucose > 10)
          sArr.push(`blood glucose ${labs.glucose} mmol/L (hyperglycaemia — target 6.1–10 mmol/L)`);
        if (labs.phosphate && labs.phosphate < 0.8)
          sArr.push(`serum phosphate ${labs.phosphate} mmol/L (hypophosphataemia — normal 0.8–1.5 mmol/L; refeeding risk)`);
        if (labs.potassium && labs.potassium < 3.5)
          sArr.push(`serum potassium ${labs.potassium} mmol/L (hypokalaemia — normal 3.5–5.0 mmol/L)`);
        if (labs.magnesium && labs.magnesium < 0.7)
          sArr.push(`serum magnesium ${labs.magnesium} mmol/L (low — normal 0.7–1.0 mmol/L)`);
        if (labs.sodium && labs.sodium < 135)
          sArr.push(`serum sodium ${labs.sodium} mmol/L (hyponatraemia — normal 135–145 mmol/L)`);
        if (labs.haemoglobin && labs.haemoglobin < 120)
          sArr.push(`haemoglobin ${labs.haemoglobin} g/L (anaemia — normal ≥ 120 g/L [female] / ≥ 130 g/L [male])`);
        if (labs.egfr && labs.egfr < 60)
          sArr.push(`eGFR ${labs.egfr} mL/min/1.73m² (reduced — normal ≥ 60; renal nutrition adjustment required)`);
      }

      // Clinical signs
      if (tbsa > 0)       sArr.push(`burns ${tbsa}% TBSA — hypermetabolism and protein catabolism`);
      if (isRefeeding)    sArr.push(`refeeding syndrome risk: ${rfRiskLevel} — electrolyte shifts anticipated on refeeding`);
      if (icuPhase && icuPhase !== 'stable') sArr.push(`ICU phase: ${icuPhase} — altered metabolic demands`);

      // ── NFPE Physical Exam Findings (live sync from NFPE tab) ───────────
      (function _injectNFPEModule() {
        const nfpe = window._nfpeFindings;
        if (!nfpe || !nfpe.hasFindings) return;
        if (nfpe.evidenceArr && nfpe.evidenceArr.length)
          nfpe.evidenceArr.forEach(function(s) { sArr.push(s); });
        if (nfpe.dxText) sArr.push(nfpe.dxText);
        const edema = nfpe.abnormal && nfpe.abnormal.find(function(a){ return a.label === 'Edema'; });
        if (edema && edema.score > 0)
          sArr.push(`pitting oedema grade ${edema.score} — use dry/estimated weight for nutrition prescription`);
      })();

      // Fallback
      if (sArr.length === 0)
        sArr.push(`estimated requirements: ${Math.round(energy)} kcal/day, ${protein.toFixed(0)} g protein/day — intake not yet quantified`);
      return { code: P_code, label: P_label, etiology: E, evidenceList: sArr };
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 6 ▸ DEFICIT TRACKER (ICU Feeding Progression)
  // Tracks prescribed vs delivered kcal · Cumulative deficit · Catch-up plan
  // ──────────────────────────────────────────────────────────────────────────
  const DeficitTracker = {
    /**
     * calculateProgression({ targetKcal, currentDay, phase, rfRiskLevel, weight })
     * Returns daily feeding schedule and cumulative deficit projection
     */
    calculateProgression({ targetKcal, currentDay, phase, rfRiskLevel, weight }) {
      const days = [];
      let cumDef = 0;
      const maxDays = 7;
      // Day-by-day schedule
      for (let d = 1; d <= maxDays; d++) {
        let prescribed = targetKcal, rationale = '';
        if (rfRiskLevel === 'HIGH') {
          // NICE CG32 — start 5 kcal/kg, +33% every 2 days
          const base = 5 * weight;
          if (d <= 2)      { prescribed = base; rationale = '5 kcal/kg — HIGH refeeding risk'; }
          else if (d <= 4) { prescribed = base * 1.33; rationale = '+33% advance per NICE CG32'; }
          else if (d <= 6) { prescribed = base * 1.66; rationale = '+33% second advance'; }
          else             { prescribed = Math.min(base * 2.0, targetKcal); rationale = 'Approaching full target'; }
          prescribed = Math.min(prescribed, targetKcal);
        } else if (rfRiskLevel === 'MODERATE') {
          if (d <= 3)      { prescribed = targetKcal * 0.5; rationale = '50% target — moderate refeeding'; }
          else if (d <= 5) { prescribed = targetKcal * 0.75; rationale = '75% target advance'; }
          else             { prescribed = targetKcal; rationale = 'Full target'; }
        } else if (phase === 'early') {
          // ICU early — permissive underfeeding
          if (d <= 2)      { prescribed = targetKcal * 0.6; rationale = 'Permissive underfeeding (60%)'; }
          else if (d <= 4) { prescribed = targetKcal * 0.8; rationale = '80% target (advance cautiously)'; }
          else             { prescribed = targetKcal; rationale = 'Full target'; }
        } else {
          prescribed = targetKcal; rationale = 'Full target from Day 1';
        }
        prescribed = Math.round(prescribed);
        const deficit = Math.max(0, targetKcal - prescribed);
        cumDef += deficit;
        days.push({ day: d, prescribed, deficit, cumDef: Math.round(cumDef), rationale, active: d === currentDay });
      }
      // Catch-up strategy
      let catchUp = '';
      if (cumDef > 0) {
        const recoveryKcal = Math.round(targetKcal * 1.15); // 15% above target
        catchUp = `Cumulative deficit after Day ${maxDays}: ~${Math.round(cumDef)} kcal. Recovery strategy: 110–120% of target for 3–5 days post-acute phase to replete deficits. Target: ${recoveryKcal} kcal/day in recovery phase (ESPEN ICU 2023 — avoid aggressive catch-up in ICU acute phase; defer to post-ICU rehabilitation).`;
      }
      return { days, catchUp, finalCumDef: Math.round(cumDef) };
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 7 ▸ MONITORING & EVALUATION ENGINE
  // Returns five clinical monitoring domains — condition-specific parameters
  // and frequency per domain driven by risk level, diagnosis, and route
  // ──────────────────────────────────────────────────────────────────────────
  const MonitoringEngine = {
    getSchedule({ rfRiskLevel, isICU, isRenal, isHepatic, route, bmi, isRefeeding, dx, phase }) {
      // ── Frequency tiers ──────────────────────────────────────────────────
      const F = {
        STAT:      'Immediately / before feeds',
        Q6H:       'Every 6 hours',
        Q8H:       'Every 8 hours',
        Q12H:      'Every 12 hours',
        DAILY:     'Daily',
        ALT:       'Alternate days',
        BIWEEKLY:  'Twice weekly',
        WEEKLY:    'Weekly',
        FORTNIGHTLY:'Fortnightly',
        MONTHLY:   'Monthly',
        PERREVIEW: 'Per clinical review',
      };
      // Derive setting
      const inICU = isICU || phase === 'early' || phase === 'late';
      // Master frequency headline
      let frequency, setting;
      if (isRefeeding && rfRiskLevel === 'HIGH')       { frequency = F.Q6H;      setting = 'High-dependency / ICU'; }
      else if (isRefeeding && rfRiskLevel === 'MODERATE'){ frequency = F.DAILY;  setting = 'Acute ward'; }
      else if (inICU)                                   { frequency = F.DAILY;    setting = 'ICU'; }
      else if (isRenal || isHepatic)                    { frequency = F.BIWEEKLY; setting = 'Specialty ward'; }
      else if (bmi < 18.5 || dx === 'malnutrition_severe'){ frequency = F.ALT;   setting = 'Acute ward'; }
      else                                              { frequency = F.WEEKLY;   setting = 'General ward'; }

      // ── Domain builder ───────────────────────────────────────────────────
      // Each entry: { param, freq, note? }
      const d = { anthropometric: [], biochemical: [], clinical: [], dietary: [], others: [] };

      // ── ANTHROPOMETRIC ───────────────────────────────────────────────────
      d.anthropometric.push({ param:'Body weight', freq: inICU ? F.DAILY : F.WEEKLY, note:'Same scale, same time of day. Use dry weight in oedema/renal patients.' });
      d.anthropometric.push({ param:'BMI', freq: F.WEEKLY, note:'Calculated from measured weight and height — do not use estimated values.' });
      d.anthropometric.push({ param:'MUAC', freq: F.WEEKLY, note:'Mid-upper arm circumference — use when weight is unreliable (ascites, oedema, amputee).' });
      d.anthropometric.push({ param:'Fluid balance (ins/outs)', freq: inICU || isRefeeding ? F.DAILY : F.BIWEEKLY, note:'Cumulative balance guides fluid prescription — document urine output, drains, and feed volumes.' });
      if (dx === 'burns') d.anthropometric.push({ param:'Wound surface area / TBSA reassessment', freq: F.PERREVIEW, note:'Burns TBSA estimate changes as wound evolves — re-estimate energy needs weekly.' });
      if (bmi < 18.5 || dx === 'malnutrition_severe') d.anthropometric.push({ param:'Weight gain trajectory', freq: F.WEEKLY, note:'Target 0.5–1 kg/week in nutritional rehabilitation. Faster gain suggests fluid accumulation.' });
      if (bmi >= 30) d.anthropometric.push({ param:'Waist circumference', freq: F.MONTHLY, note:'Metabolic risk marker — target reduction alongside weight. Tape measure at umbilicus.' });

      // ── BIOCHEMICAL ──────────────────────────────────────────────────────
      if (isRefeeding) {
        const rfFreq = rfRiskLevel === 'HIGH' ? F.Q6H : F.Q12H;
        d.biochemical.push({ param:'Serum phosphate', freq: rfFreq, note:' Priority — hypophosphataemia is the hallmark of refeeding syndrome. HOLD feeds if PO₄ < 0.6 mmol/L. Target ≥ 0.8 mmol/L before advancing calories.' });
        d.biochemical.push({ param:'Serum potassium', freq: rfFreq, note:'Intracellular shift during refeeding → hypokalaemia → life-threatening arrhythmia. Target 3.5–5.0 mmol/L.' });
        d.biochemical.push({ param:'Serum magnesium', freq: rfFreq, note:'Hypomagnesaemia renders hypokalaemia refractory to replacement. Correct before advancing feeds. Target ≥ 0.75 mmol/L.' });
        d.biochemical.push({ param:'Thiamine status / clinical assessment', freq: F.STAT, note:'Administer IV thiamine 200–300 mg BEFORE any feed is commenced in HIGH risk. Do not wait for lab result.' });
      }
      d.biochemical.push({ param:'Blood glucose (BGL)', freq: inICU || isRefeeding ? F.Q6H : F.DAILY, note:'Target 6.1–10.0 mmol/L (NICE-SUGAR 2009). Hyperglycaemia in ICU/PN increases infection risk. Initiate insulin protocol if BGL > 10 mmol/L.' });
      d.biochemical.push({ param:'Serum albumin', freq: F.WEEKLY, note:'Negative acute-phase protein (t½ 20 days). Reflects inflammatory burden, not nutritional status acutely. Interpret alongside CRP.' });
      d.biochemical.push({ param:'Pre-albumin (transthyretin)', freq: inICU ? F.BIWEEKLY : F.WEEKLY, note:'Short t½ (2 days) — most responsive visceral protein marker. Falls with inflammation; rises within 3–5 days of improved nutrition intake.' });
      d.biochemical.push({ param:'C-reactive protein (CRP)', freq: inICU ? F.BIWEEKLY : F.WEEKLY, note:'Contextualises low albumin and pre-albumin. If CRP > 10 mg/L, low albumin reflects SIRS not malnutrition.' });
      if (isRenal) {
        d.biochemical.push({ param:'Serum potassium', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Impaired renal K⁺ excretion → hyperkalaemia. Restrict dietary potassium if K⁺ > 5.5 mmol/L.' });
        d.biochemical.push({ param:'Serum phosphate', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Hyperphosphataemia in CKD → vascular calcification. Restrict dietary PO₄ < 800 mg/day. Phosphate binders with meals.' });
        d.biochemical.push({ param:'BUN / urea and creatinine', freq: F.BIWEEKLY, note:'Rising BUN without increased creatinine may indicate excessive protein intake — review protein prescription.' });
        d.biochemical.push({ param:'eGFR trend', freq: F.WEEKLY, note:'Declining eGFR in CKD: escalate protein restriction per KDOQI 2020 stage-specific targets.' });
      }
      if (isHepatic) {
        d.biochemical.push({ param:'Serum ammonia', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Monitor in encephalopathy. NOT a sole indicator for protein restriction — do not restrict protein based on ammonia alone (EASL 2019).' });
        d.biochemical.push({ param:'INR / prothrombin time', freq: F.BIWEEKLY, note:'Hepatic synthetic failure → coagulopathy. Vitamin K supplementation if INR elevated without anticoagulation.' });
        d.biochemical.push({ param:'Liver function tests (ALT, AST, ALP, bilirubin)', freq: F.WEEKLY, note:'Trend LFTs — worsening may indicate hepatic decompensation or PN-related cholestasis.' });
      }
      if (dx === 'diabetes_t2' || dx === 'diabetes_t1') d.biochemical.push({ param:'HbA1c', freq: F.MONTHLY, note:'3-monthly target. Guides long-term CHO modification. Hospital target: BGL 6.1–10 mmol/L (ADA 2024 inpatient).' });
      if (!isRenal && !isHepatic && !isRefeeding) d.biochemical.push({ param:'Serum electrolytes (Na⁺, K⁺, Cl⁻)', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Baseline and trend monitoring — electrolyte disturbances common in patients receiving EN/PN or diuretics.' });

      // ── CLINICAL ─────────────────────────────────────────────────────────
      d.clinical.push({ param:'Nutrition therapy goal attainment', freq: inICU ? F.DAILY : F.WEEKLY, note:'Document % of energy and protein target delivered. Flag if < 80% of target for 2 consecutive days.' });
      d.clinical.push({ param:'Functional status / muscle strength', freq: F.WEEKLY, note:'Handgrip dynamometry (if available) or timed sit-to-stand test. Decline indicates muscle wasting despite adequate intake.' });
      d.clinical.push({ param:'Wound healing / skin integrity', freq: F.PERREVIEW, note:'Assess wound margins, granulation tissue, and epithelialisation. Poor healing suggests inadequate protein, zinc, or Vitamin C.' });
      d.clinical.push({ param:'Oedema assessment', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Graded 1+ to 4+. Peripheral oedema may mask weight loss. Adjust weight basis for calculations (use dry/estimated weight).' });
      if (dx === 'burns') d.clinical.push({ param:'Infection signs (wound / systemic)', freq: F.DAILY, note:'Sepsis dramatically increases energy and protein requirements — recalculate at each reassessment.' });
      if (inICU) {
        d.clinical.push({ param:'SOFA score trend', freq: F.DAILY, note:'Worsening SOFA (organ dysfunction score) warrants conservative energy targets — avoid overfeeding in acute decompensation.' });
        d.clinical.push({ param:'Ventilator settings (if mechanically ventilated)', freq: F.DAILY, note:'High RR/PEEP requirements: use high-fat, lower-CHO formula (lower RQ) to reduce CO₂ production.' });
      }
      if (isHepatic) d.clinical.push({ param:'Hepatic encephalopathy grade (West Haven)', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Grade ≥ 2: initiate BCAA-enriched formula. Never restrict protein — worsens sarcopenia and encephalopathy (EASL 2019).' });
      if (isRenal) d.clinical.push({ param:'Dialysis adequacy (Kt/V)', freq: F.WEEKLY, note:'Adequate dialysis ensures removal of uraemic toxins. Under-dialysed patients exhibit anorexia and worsened nitrogen balance.' });

      // ── DIETARY ──────────────────────────────────────────────────────────
      d.dietary.push({ param:'Energy intake vs prescription (kcal/day)', freq: inICU ? F.DAILY : F.ALT, note:'Target ≥ 80% of prescribed energy. Calculate delivered volume × formula density for EN; check PN bag volumes.' });
      d.dietary.push({ param:'Protein intake vs prescription (g/day)', freq: inICU ? F.DAILY : F.ALT, note:'Protein delivery is priority — do not compromise protein target even when calorie delivery is restricted.' });
      d.dietary.push({ param:'GI tolerance', freq: route === 'enteral' ? F.DAILY : F.PERREVIEW, note:'Assess: nausea, vomiting, abdominal distension, diarrhoea, constipation. EN interruptions account for > 30% of caloric deficits in ICU.' });
      if (route === 'enteral') d.dietary.push({ param:'Enteral feed delivery rate and downtime', freq: F.DAILY, note:'Document hours on vs off feed. Calculate actual kcal delivered. Identify and address avoidable interruptions (procedural, positional).' });
      d.dietary.push({ param:'Oral intake adequacy (if applicable)', freq: route === 'oral' ? F.DAILY : F.PERREVIEW, note:'24-hour dietary recall or 3-day food record. Estimate % of energy and protein targets met from oral sources.' });
      d.dietary.push({ param:'Micronutrient and supplement compliance', freq: F.WEEKLY, note:'Confirm prescribed micronutrients are being administered. Check for interactions with medications (e.g. zinc-copper competition, Ca-iron absorption conflict).' });
      if (isRefeeding) d.dietary.push({ param:'Caloric advancement rate', freq: F.DAILY, note:'HIGH risk: advance by ≤ 33% every 2 days. MODERATE risk: 50% → 75% → 100% over 3–5 days. Do not rush — prioritise electrolyte stability.' });

      // ── OTHERS ───────────────────────────────────────────────────────────
      d.others.push({ param:'Nutrition diagnosis resolution', freq: F.WEEKLY, note:'Reassess PES statement at each review. Update nutrition diagnosis as clinical status evolves.' });
      d.others.push({ param:'Feeding route reassessment', freq: inICU ? F.DAILY : F.WEEKLY, note:'Escalate to supplemental EN if oral/enteral intake remains < 60% of target for > 3 days.' });
      d.others.push({ param:'Medication–nutrition interactions', freq: F.PERREVIEW, note:'Review: steroids (↑ catabolism, hyperglycaemia), diuretics (electrolyte losses), antibiotics (gut microbiome), metformin (B12 absorption), PPIs (iron, B12).' });
      if (bmi >= 30) d.others.push({ param:'Weight loss rate vs lean mass preservation', freq: F.WEEKLY, note:'Target 0.5–1 kg/week loss. High-protein prescription (≥ 2 g/kg IBW) is mandatory to preserve lean mass during hypocaloric feeding.' });
      d.others.push({ param:'Patient / carer nutrition education', freq: F.PERREVIEW, note:'Assess understanding of prescribed diet, feeding regimen, and food safety. Involve family/carer in counselling sessions.' });
      d.others.push({ param:'Dietitian reassessment and plan update', freq: inICU ? F.DAILY : F.WEEKLY, note:'Formal reassessment at each frequency milestone. Update care plan, nutrition prescription, and PES statement. Document in patient record.' });

      // ── Goals ────────────────────────────────────────────────────────────
      const goals = [];
      goals.push(`Achieve ≥ 80% of prescribed energy within ${inICU ? '48–72 hours' : '5–7 days'}`);
      goals.push('Achieve 100% of protein target within 48 hours of stable feeding');
      goals.push('Maintain blood glucose 6.1–10.0 mmol/L throughout nutrition therapy');
      goals.push('No clinically significant refeeding electrolyte complications');
      if (bmi < 18.5)  goals.push('Weight gain 0.5–1 kg/week with preserved lean mass (nutritional rehabilitation)');
      if (bmi >= 30)   goals.push('Weight reduction 0.5–1 kg/week with high-protein prescription to preserve lean mass');
      if (isRenal)     goals.push('Serum phosphate < 1.5 mmol/L · Potassium 3.5–5.0 mmol/L · BUN within acceptable range');
      if (isHepatic)   goals.push('Encephalopathy grade ≤ 1 · Maintain dry weight · Late evening snack in place');
      if (isRefeeding) goals.push('Electrolytes stable (PO₄ ≥ 0.8, K⁺ ≥ 3.5, Mg²⁺ ≥ 0.75 mmol/L) before advancing feeds');
      goals.push('Nutrition diagnosis resolved or updated at each formal reassessment');

      return { frequency, setting, domains: d, goals };
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 8 ▸ SAFETY VALIDATOR (Automated Clinical Safety Layer)
  // Detects: overfeeding, underfeeding, protein-energy mismatch, electrolyte risk,
  //          fluid overload risk, unsafe rate of advance
  // ──────────────────────────────────────────────────────────────────────────
  const SafetyValidator = {
    /**
     * validate({ energy, protein, weight, ibw, bmi, route, renal, hepatic,
     *            isRefeeding, rfRiskLevel, labs, fluidMl, phase, isICU, dx })
     * Returns [{ severity, code, message, action }]
     */
    validate({ energy, protein, weight, ibw, bmi, route, renal, hepatic,
               isRefeeding, rfRiskLevel, labs, fluidMl, phase, isICU, dx, netEnergy }) {
      const flags = [];
      const kcalKg = energy / weight;
      const protGkg = protein / weight;

      // ① OVERFEEDING RISK
      if (!isRefeeding) {
        if (kcalKg > 35 && !['burns'].includes(dx))
          flags.push({ severity:'WARNING', code:'OVERFEED-01', message:`Energy ${energy.toFixed(0)} kcal/day = ${kcalKg.toFixed(1)} kcal/kg — exceeds 35 kcal/kg threshold. Overfeeding risk: hyperglycaemia, hepatic steatosis (PN), hypertriglyceridaemia, CO₂ retention (ventilated).`, action:`Reduce to 25–30 kcal/kg (${Math.round(26*weight)}–${Math.round(30*weight)} kcal/day). Recheck energy method. Subtract non-nutritional calories (propofol, dextrose drips).` });
        if (isICU && phase === 'early' && kcalKg > 20 && !isRefeeding)
          flags.push({ severity:'WARNING', code:'OVERFEED-02', message:`ICU Acute Phase (0–72h): energy ${energy.toFixed(0)} kcal/day exceeds recommended 15–20 kcal/kg. Early overfeeding worsens outcomes (SCCM/ASPEN 2022).`, action:'Reduce to 15–20 kcal/kg for first 48–72h. Escalate to full target from Day 4 as tolerated.' });
      }

      // ② UNDERFEEDING RISK
      if (kcalKg < 15 && !isRefeeding && !isICU)
        flags.push({ severity:'WARNING', code:'UNDERFEED-01', message:`Energy ${energy.toFixed(0)} kcal/day = ${kcalKg.toFixed(1)} kcal/kg — below 15 kcal/kg minimum for a non-ICU patient. Prolonged underfeeding drives protein catabolism, immune dysfunction, and delayed wound healing.`, action:'Increase energy delivery. Reassess energy method. If EN intolerance → consider supplemental PN. Target ≥25 kcal/kg for ward patients.' });

      // ③ PROTEIN-ENERGY MISMATCH — skip during HIGH refeeding (permissive underfeeding is intentional)
      if (!isRefeeding || rfRiskLevel !== 'HIGH') {
        const coupling = ProteinEngine.checkCoupling({ totalKcal: energy, proteinG: protein, weightKg: weight });
        if (coupling.status === 'MISMATCH') {
          flags.push({ severity: coupling.severity === 'CRITICAL' ? 'DANGER' : 'WARNING', code:'PE-MISMATCH-01', message: coupling.message, action: coupling.recommendation });
        }
      }

      // ④ PROTEIN SAFETY
      if (protGkg > 2.5 && !['burns','trauma'].includes(dx))
        flags.push({ severity:'WARNING', code:'PROT-HIGH-01', message:`Protein ${protein.toFixed(0)} g/day (${protGkg.toFixed(2)} g/kg) exceeds 2.5 g/kg. At this level, excess amino acids are catabolised for energy rather than used for anabolism, and nitrogen load increases BUN.`, action:'Reduce protein target to ≤2.5 g/kg unless active burns/trauma with confirmed losses. Monitor BUN/urea trend.' });
      if (['ckd_g3a','ckd_g3b','ckd_g4','ckd_g5','ckd'].includes(renal) && protGkg > 0.9)
        flags.push({ severity:'WARNING', code:'PROT-CKD-01', message:`CKD non-dialysis: protein ${protGkg.toFixed(2)} g/kg exceeds recommended 0.55–0.8 g/kg (KDOQI 2020). Excess protein accelerates GFR decline.`, action:'Reduce to 0.55–0.8 g/kg IBW per KDOQI 2020 Guideline 3.0.1. Consider very low-protein diet + ketoanalogues if available.' });
      if (hepatic === 'severe' && protGkg > 1.8)
        flags.push({ severity:'WARNING', code:'PROT-HEP-01', message:`Hepatic failure: protein ${protGkg.toFixed(2)} g/kg may exceed tolerance threshold and risk ammonia accumulation / worsening encephalopathy.`, action:'Target 1.0–1.5 g/kg DW. NEVER restrict to <0.5 g/kg — paradoxically worsens encephalopathy. BCAA-enriched formula if conventional protein not tolerated (EASL 2019).' });

      // ⑤ REFEEDING ELECTROLYTE RISK
      if (isRefeeding) {
        if (rfRiskLevel === 'HIGH' && !(labs && labs.phosphate < 0.8)) {
          flags.push({ severity:'DANGER', code:'RF-ELECTRO-01', message:'HIGH refeeding syndrome risk: phosphate, potassium and magnesium shifts expected within 24–72h of starting feeding.', action:'Check and correct K⁺, PO₄, Mg²⁺ BEFORE any nutrition commenced. Start at 5 kcal/kg/day. IV Thiamine 200–300 mg STAT before feeds. Cardiac monitor. Electrolytes 2–3× daily.' });
        }
        if (labs && labs.phosphate && labs.phosphate < 0.6)
          flags.push({ severity:'DANGER', code:'RF-HYPOPHOS-01', message:`Severe hypophosphataemia: PO₄ ${labs.phosphate} mmol/L (critical <0.6). Active refeeding syndrome. Immediate electrolyte replacement mandatory.`, action:'HOLD or slow feeds. Replace PO₄ IV (medical emergency). Continue thiamine. Recheck PO₄ in 4–6h. Resume feeding only when PO₄ ≥0.8 mmol/L (NICE CG32 2006).' });
      }

      // ⑥ FLUID OVERLOAD RISK
      if (fluidMl > 0) {
        const fluidPerKg = fluidMl / weight;
        if (fluidPerKg > 40)
          flags.push({ severity:'WARNING', code:'FLUID-OVER-01', message:`Fluid target ${fluidMl} mL/day = ${fluidPerKg.toFixed(0)} mL/kg — exceeds 40 mL/kg. Risk of fluid overload, pulmonary oedema, and poor wound healing.`, action:'Assess fluid status clinically. Switch to energy-dense/concentrated formula (1.5–2 kcal/mL) to reduce volume. Fluid restrict in heart failure/renal failure per guideline.' });
        if (dx === 'heart_failure' || dx === 'cardiac') {
          flags.push({ severity:'WARNING', code:'FLUID-HF-01', message:`Heart failure: fluid target must be restricted. Current ${fluidMl} mL/day — verify this does not exceed clinician-prescribed limit.`, action:'Fluid restriction 1000–1500 mL/day in acute decompensated HF (ESC 2021). Use 1.5–2 kcal/mL concentrated formula. Coordinate with cardiology fluid orders.' });
        }
      }

      // ⑦ GLYCAEMIC SAFETY
      if (labs && labs.glucose > 10 && isICU)
        flags.push({ severity:'WARNING', code:'GLYC-HIGH-01', message:`Hyperglycaemia ${labs.glucose} mmol/L in ICU. Uncontrolled hyperglycaemia increases infection risk, impairs wound healing, and worsens outcomes.`, action:'Initiate insulin sliding scale or insulin infusion protocol. Target BGL 6.1–10.0 mmol/L (NICE-SUGAR 2009). Reduce CHO density. Recheck BGL 2–4 hourly.' });

      return flags;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 9 ▸ RENDER ENGINE
  // Generates HTML panels for the CDE output
  // ──────────────────────────────────────────────────────────────────────────
  const RenderEngine = {
    // Safety flags panel
    renderSafetyFlags(flags) {
      if (!flags || !flags.length) return '';
      const sevMap = {
        DANGER:  { bg:'rgba(255,64,96,.1)',  border:'rgba(255,64,96,.45)',  col:'#ff4060', icon:'' },
        WARNING: { bg:'rgba(255,184,48,.08)',border:'rgba(255,184,48,.4)',  col:'#ffb830', icon:''  },
        INFO:    { bg:'rgba(29,233,212,.07)',border:'rgba(29,233,212,.3)', col:'#1de9d4', icon:'' }
      };
      return `
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
        <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:#ff4060;text-transform:uppercase;margin-bottom:4px"> CLINICAL SAFETY — ${flags.length} ALERT${flags.length>1?'S':''}</div>
        ${flags.map(f => {
          const s = sevMap[f.severity] || sevMap.INFO;
          return `<div style="background:${s.bg};border:1px solid ${s.border};border-left:4px solid ${s.col};border-radius:8px;padding:12px 14px;font-family:var(--mono);font-size:10px;line-height:1.7">
            <div style="color:${s.col};font-weight:700;margin-bottom:5px">${s.icon} [${f.code}] ${f.severity} — ${f.message}</div>
            <div style="color:var(--text-dim)">⟶ ${f.action}</div>
          </div>`;
        }).join('')}
      </div>`;
    },

    // Energy-protein coupling badge
    renderCouplingBadge(coupling) {
      if (coupling.status === 'OK')
        return `<div style="display:inline-flex;gap:6px;align-items:center;font-family:var(--mono);font-size:9px;color:var(--green);background:rgba(52,211,153,.09);border:1px solid rgba(52,211,153,.3);border-radius:5px;padding:4px 10px"> NPC:N ${coupling.npCalNRatio} kcal/g N — Adequate energy-protein coupling</div>`;
      const col = coupling.severity === 'CRITICAL' ? '#ff4060' : '#ffb830';
      return `<div style="display:inline-flex;gap:6px;align-items:center;font-family:var(--mono);font-size:9px;color:${col};background:rgba(255,184,48,.09);border:1px solid rgba(255,184,48,.35);border-radius:5px;padding:5px 10px"> NPC:N ${coupling.npCalNRatio} kcal/g N — ${coupling.severity}: protein may be oxidised for energy</div>`;
    },

    // Macro contextual notes
    renderMacroNotes(notes) {
      if (!notes || !notes.length) return '';
      return `<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
        ${notes.map(n => `<div style="font-family:var(--mono);font-size:10px;color:var(--text);background:rgba(29,233,212,.05);border:1px solid rgba(29,233,212,.15);border-radius:5px;padding:8px 12px;line-height:1.6"> ${n}</div>`).join('')}
      </div>`;
    },

    // ── Monitoring & Evaluation — five-domain card ───────────────────────
    renderMonitoringPanel(schedule) {
      if (!schedule || !schedule.domains) return '';
      const { frequency, setting, domains, goals } = schedule;

      // Domain config: id, label, colour accent, icon
      const domainDefs = [
        { key:'anthropometric', label:'Anthropometric',  col:'#1de9d4', icon:'' },
        { key:'biochemical',    label:'Biochemical',     col:'#60a5fa', icon:'' },
        { key:'clinical',       label:'Clinical',        col:'#fb923c', icon:'' },
        { key:'dietary',        label:'Dietary Intake',  col:'#a78bfa', icon:'' },
        { key:'others',         label:'Other',           col:'#34d399', icon:'' },
      ];

      // Frequency tag renderer
      const freqTag = (f) =>
        `<span style="font-family:var(--mono);font-size:8px;font-weight:700;color:#ffffff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:3px;padding:2px 7px;white-space:nowrap;flex-shrink:0">${f}</span>`;

      // Build each domain section
      const domainHtml = domainDefs.map(({ key, label, col, icon }) => {
        const rows = domains[key] || [];
        if (!rows.length) return '';
        return `
        <div style="background:var(--surface2);border:1px solid var(--border);border-top:3px solid ${col};border-radius:10px;overflow:hidden">
          <div style="padding:10px 14px;background:rgba(0,0,0,.15);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
            <span style="font-size:13px">${icon}</span>
            <span style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:${col};text-transform:uppercase">${label}</span>
            <span style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-left:auto">${rows.length} parameter${rows.length>1?'s':''}</span>
          </div>
          <div style="display:flex;flex-direction:column;divide-y:var(--border)">
            ${rows.map((r, i) => `
            <div style="padding:10px 14px;${i < rows.length-1 ? 'border-bottom:1px solid rgba(255,255,255,.04)' : ''}">
              <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:${r.note ? '5px' : '0'}">
                <span style="font-family:var(--mono);font-size:11px;font-weight:600;color:var(--text-bright);flex:1;line-height:1.4">${r.param}</span>
                ${freqTag(r.freq)}
              </div>
              ${r.note ? `<div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);line-height:1.6">${r.note}</div>` : ''}
            </div>`).join('')}
          </div>
        </div>`;
      }).join('');

      return `
      <div style="display:flex;flex-direction:column;gap:14px">

        <!-- Frequency + Setting header -->
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;background:rgba(251,113,133,.06);border:1px solid rgba(251,113,133,.2);border-radius:8px">
          <div>
            <div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:#fb7185;text-transform:uppercase;margin-bottom:3px">Reassessment Frequency</div>
            <div style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--text-bright)">${frequency}</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:#fb7185;text-transform:uppercase;margin-bottom:3px">Clinical Setting</div>
            <div style="font-family:var(--mono);font-size:11px;font-weight:600;color:#ddeeff">${setting}</div>
          </div>
        </div>

        <!-- Five domain cards grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${domainHtml}
        </div>

        <!-- Nutrition Therapy Goals -->
        <div style="background:rgba(52,211,153,.05);border:1px solid rgba(52,211,153,.2);border-radius:8px;padding:14px 16px">
          <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:#34d399;text-transform:uppercase;margin-bottom:10px">Nutrition Therapy Goals</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${goals.map(g => `
            <div style="display:flex;gap:8px;align-items:flex-start;font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.55">
              <span style="color:#34d399;flex-shrink:0;margin-top:1px">✓</span>
              <span>${g}</span>
            </div>`).join('')}
          </div>
        </div>

      </div>`;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC API — runAll() orchestrates all modules + renders into DOM
  // ──────────────────────────────────────────────────────────────────────────
  function runAll(params) {
    if (!params || !params.weight) return {};
    const {
      energy, protein, weight, ibw, bmi, bmiCat, route, renal, hepatic,
      isRefeeding, rfRiskLevel, labs, fluidMl, phase, isICU, dx, netEnergy,
      tbsa, icuPhase, diagText, age, sex
    } = params;
    const isCritical  = ['icu_critical','sepsis','septic_shock','trauma','ards','burns','multiorgan_failure','post_cardiac_arrest'].includes(dx);
    const isRenal     = ['ckd_g1g2','ckd_g3a','ckd_g3b','ckd_g4','ckd_g5','ckd','aki_no_rrt','aki_rrt','hd','pd'].includes(renal);
    const isHepatic   = hepatic === 'severe' || hepatic === 'mild';
    const isVentilated = document.getElementById('ventilation')?.value === 'mechanical';

    // ① Safety validation
    const safetyFlags = SafetyValidator.validate({ energy, protein, weight, ibw, bmi, route, renal, hepatic, isRefeeding, rfRiskLevel, labs, fluidMl, phase, isICU: isICU||isCritical, dx, netEnergy });

    // ② Energy-Protein coupling
    const coupling = ProteinEngine.checkCoupling({ totalKcal: energy, proteinG: protein, weightKg: weight });

    // ③ Contextual macro notes
    const macroNotes = MacroEngine.getContextualNote({ dx, renal, hepatic, bmi, isVentilated, glucose: labs?.glucose });

    // ④ Monitoring schedule
    const monSchedule = MonitoringEngine.getSchedule({ rfRiskLevel, isICU: isICU||isCritical, isRenal, isHepatic, route, bmi, isRefeeding, dx, phase });

    // ── Render into DOM ──────────────────────────────────────────────────
    const couplingEl  = document.getElementById('r-pe-coupling');
    if (couplingEl)   couplingEl.innerHTML  = RenderEngine.renderCouplingBadge(coupling);

    const safetyEl    = document.getElementById('cde-safety-inject');
    if (safetyEl)     safetyEl.innerHTML    = RenderEngine.renderSafetyFlags(safetyFlags);

    const macroNotesEl = document.getElementById('cde-macro-notes');
    if (macroNotesEl) macroNotesEl.innerHTML = RenderEngine.renderMacroNotes(macroNotes);

    // Monitoring & Evaluation panel suppressed (ADI format — no M/E display)
    return { safetyFlags, coupling, macroNotes, monSchedule };
  }

  // Expose public API
  return { EnergyEngine, ProteinEngine, MacroEngine, MicroEngine, PESGenerator, MonitoringEngine, SafetyValidator, DeficitTracker, RenderEngine, runAll };
})();

// ─────────────────────────────────────────────────────────────────────────────

// MODULE: PROTEIN CALCULATIONS  (condition-specific, guideline-based)

// MODULE: MAIN CALCULATE — orchestrates all modules
function calculate() {
  // ── #2 INPUT VALIDATION ────────────────────────────────────
  const age  = parseFloat(document.getElementById('age').value);
  const hRaw = parseFloat(document.getElementById('height').value);
  const wRaw = parseFloat(document.getElementById('weight').value);
  const tbsaRaw = parseFloat(document.getElementById('tbsa').value) || 0;

  // Clear previous invalid states
  ['age','height','weight'].forEach(id => document.getElementById(id)?.classList.remove('invalid'));

  const validationErrors = [];
  if (!age || age < 0 || age > 120) { validationErrors.push('Age must be between 0 and 120 years'); document.getElementById('age').classList.add('invalid'); }
  if (!hRaw || hRaw < 30 || hRaw > 250) { validationErrors.push('Height must be between 30 and 250 cm'); document.getElementById('height').classList.add('invalid'); }
  if (!wRaw || wRaw < 1 || wRaw > 400) { validationErrors.push('Weight must be between 1 and 400 kg'); document.getElementById('weight').classList.add('invalid'); }
  if (tbsaRaw < 0 || tbsaRaw > 100) { validationErrors.push('Burns TBSA must be between 0 and 100 %'); }
  // Validate "Other (Specify)" custom diagnosis
  const _actDiag = (typeof getActiveDiagnoses === 'function') ? getActiveDiagnoses() : [];
  if (_actDiag.includes('other_specify')) {
    const _specVal = (document.getElementById('other-specify-input')?.value || '').trim();
    if (!_specVal) {
      validationErrors.push('Please specify the medical diagnosis in the "Specify Medical Diagnosis" field');
      document.getElementById('other-specify-input')?.classList.add('invalid');
    } else {
      document.getElementById('other-specify-input')?.classList.remove('invalid');
    }
  }

  if (validationErrors.length > 0) {
    const alertsBox = document.getElementById('alerts-box');
    if (alertsBox) {
      alertsBox.innerHTML = `<div class="alert danger"><span class="ai"></span><div>
        <strong>Invalid input detected. Please check patient measurements.</strong><br>
        ${validationErrors.map(e => `• ${e}`).join('<br>')}
      </div></div>`;
      document.getElementById('results-section').style.display = 'block';
      alertsBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const height = hRaw;
  const weight = wRaw;
  const patientName=(document.getElementById('patient-name').value||'').trim();
  const sex=document.querySelector('input[name="sex"]:checked').value;
  // Multi-condition: get all active diagnoses, primary is first
  const _activeDiagnoses = (typeof getActiveDiagnoses === 'function') ? getActiveDiagnoses() : ['general'];
  const diagnosis = _activeDiagnoses[0] || document.getElementById('diagnosis').value || 'general';
  const renal=document.getElementById('renal').value;
  const hepatic=document.getElementById('hepatic').value;
  const energyMeth=document.getElementById('energy_method').value;
  const icuPhase=document.getElementById('icu_phase').value;
  const sf=parseFloat(document.getElementById('stress_factor').value);
  const route=document.getElementById('feeding_route').value;
  const fluidSt=document.getElementById('fluid_status').value;
  const ivGluc=parseFloat(document.getElementById('iv_glucose').value)||0;
  const propofol=parseFloat(document.getElementById('propofol').value)||0;
  const tbsa=parseFloat(document.getElementById('tbsa').value)||0;
  const icRee=parseFloat(document.getElementById('ic_ree').value)||0;
  const lk=parseFloat(document.getElementById('lk').value)||null;
  const lp=parseFloat(document.getElementById('lp').value)||null;
  const lm=parseFloat(document.getElementById('lm').value)||null;
  const la=parseFloat(document.getElementById('la').value)||null;
  const lc=parseFloat(document.getElementById('lc').value)||null;
  const lg=parseFloat(document.getElementById('lg').value)||null;

  // NEW: NICE 2006 comprehensive RF assessment
  const rfHighAny = ['rf-h1','rf-h2','rf-h3','rf-h4'].filter(id=>document.getElementById(id)?.checked).length;
  const rfMedCount = ['rf-m1','rf-m2','rf-m3','rf-m4','rf-m5','rf-m6'].filter(id=>document.getElementById(id)?.checked).length;
  const rfAddCount = ['rf-a1','rf-a2','rf-a3','rf-a4','rf-a5','rf-a6'].filter(id=>document.getElementById(id)?.checked).length;
  // Also auto-assess from labs
  const rfLabLow = (lk&&lk<3.5)||(lp&&lp<0.8)||(lm&&lm<0.7);
  const rfCount = rfHighAny + (rfMedCount>=2?1:0); // legacy compat
  const isRefeeding = rfHighAny > 0 || rfMedCount >= 2 || (rfLabLow && rfMedCount >= 1);
  const rfRiskLevel = rfHighAny>0 ? 'HIGH' : (rfMedCount>=2 ? 'HIGH' : rfMedCount===1&&rfAddCount>0 ? 'MODERATE' : rfMedCount===1||rfAddCount>=2 ? 'MODERATE' : rfAddCount>=1||rfLabLow ? 'LOW–MODERATE' : 'LOW');

  const bmi = calculateBMI(weight, height);
  const hIn=height/2.54;
  const ibw=Math.max(sex==='male'?50+2.3*(hIn-60):45.5+2.3*(hIn-60),30);
  const adjbw=bmi>30?ibw+0.25*(weight-ibw):null;
  let wCalc=weight,wBasis='Actual';
  if(bmi>40){wCalc=adjbw;wBasis='AdjBW (BMI>40)';}
  else if(bmi>30){wCalc=ibw;wBasis='IBW (BMI>30)';}
  const propofolKcal=propofol>0?propofol*weight*24*1.1:0;

  let energy=0,energyLabel='';
  const phaseKcal=icuPhase==='early'?15:icuPhase==='late'?22.5:27.5;
  const phaseRange=icuPhase==='early'?'10–20':icuPhase==='late'?'20–25':'25–30';
  if(diagnosis==='burns'&&tbsa>0){
    const burnEq = document.querySelector('input[name="burn_eq"]:checked')?.value || 'curreri';
    const burnDays = parseFloat(document.getElementById('burn_days')?.value) || 1;
    const temp = parseFloat(document.getElementById('core_temp')?.value) || 37;
    const bsaTotal = parseFloat(document.getElementById('burn_bsa')?.value) || Math.sqrt((height*weight)/3600);
    const bsaBurned = parseFloat(document.getElementById('burn_bsa_burned')?.value) || (bsaTotal * tbsa / 100);
    const isMV = document.getElementById('ventilation')?.value === 'mechanical';

    if(burnEq === 'curreri'){
      energy = 25*wCalc + 40*tbsa;
      energyLabel = `Curreri: 25×${wCalc.toFixed(1)}kg + 40×${tbsa}%TBSA`;
    } else if(burnEq === 'toronto'){
      // Toronto (1992): -4343 + 10.5×TBSA + 0.23×caloric intake + 0.84×HB + 114×temp - 4.5×day
      const hbTorontoBase = sex==='male'? 66.5+13.75*weight+5.003*height-6.775*age : 655.1+9.563*weight+1.85*height-4.676*age;
      const caloricIntakePrev = Math.round(energy||0) || Math.round(25*wCalc);
      energy = -4343 + (10.5*tbsa) + (0.23*caloricIntakePrev) + (0.84*hbTorontoBase) + (114*temp) - (4.5*burnDays);
      energy = Math.max(energy, 20*wCalc); // floor at 20 kcal/kg
      energyLabel = `Toronto: −4343 + 10.5×${tbsa}%TBSA + 114×${temp}°C − 4.5×Day${burnDays}`;
    } else if(burnEq === 'galveston'){
      // Galveston — age-stratified paediatric (Herndon Total Burn Care 5e / Mrazek et al. Semin Plast Surg 2024)
      // 0–1 yr: 2100 kcal/m²BSA + 1000 kcal/m²burn
      // 1–11 yr: 1800 kcal/m²BSA + 1300 kcal/m²burn
      // ≥12 yr: 1500 kcal/m²BSA + 1500 kcal/m²burn
      let galvK1, galvK2, galvLabel;
      if(age < 1){ galvK1=2100; galvK2=1000; galvLabel='(0–1 yr)'; }
      else if(age < 12){ galvK1=1800; galvK2=1300; galvLabel='(1–11 yr)'; }
      else { galvK1=1500; galvK2=1500; galvLabel='(≥12 yr)'; }
      energy = galvK1*bsaTotal + galvK2*bsaBurned;
      energyLabel = `Galveston ${galvLabel}: ${galvK1}×${bsaTotal.toFixed(2)}m²BSA + ${galvK2}×${bsaBurned.toFixed(2)}m²burned`;
    } else if(burnEq === 'davies'){
      // Davies & Liljedahl (1971): 20 kcal/kg + 70 kcal/%TBSA
      energy = 20*wCalc + 70*tbsa;
      energyLabel = `Davies & Liljedahl: 20×${wCalc.toFixed(1)}kg + 70×${tbsa}%TBSA`;
    } else if(burnEq === 'iretojones'){
      // Ireton-Jones (1992) ventilated burns: 1925 - 10×age + 5×weight + 281×sex(M=1) + 292×burns + 851
      const sexFactor = sex==='male'?1:0;
      energy = 1925 - (10*age) + (5*weight) + (281*sexFactor) + 292 + 851;
      energyLabel = `Ireton-Jones (ventilated burns): 1925 − 10×${age}y + 5×${weight.toFixed(0)}kg`;
    } else if(burnEq === 'espen'){
      // ESPEN Burns 2013 (Rousseau et al., Clin Nutr 2013;32:497–502) weight-based: 25–30 kcal/kg for <20%TBSA; 30–35 for 20–40%; 35–40 for >40%
      const espenKcal = tbsa<20?27.5 : tbsa<=40?32.5 : 37.5;
      energy = espenKcal * wCalc;
      energyLabel = `ESPEN Burns 2013 ${tbsa<20?'25–30':tbsa<=40?'30–35':'35–40'} kcal/kg: ${espenKcal}×${wCalc.toFixed(1)}kg`;
    }
  }
  else if(energyMeth==='weightbased'){energy=phaseKcal*wCalc;energyLabel=`${phaseKcal} kcal/kg × ${wCalc.toFixed(1)} kg`;}
  else if(energyMeth==='mifflin'){const mff=sex==='male'?10*wCalc+6.25*height-5*age+5:10*wCalc+6.25*height-5*age-161;energy=mff*sf;energyLabel=`Mifflin (${mff.toFixed(0)} kcal) × ${sf}`;}
  else if(energyMeth==='hb'){const hb=sex==='male'?66.5+13.75*wCalc+5.003*height-6.775*age:655.1+9.563*wCalc+1.85*height-4.676*age;energy=hb*sf;energyLabel=`Harris-Benedict (${hb.toFixed(0)} kcal) × ${sf}`;}
  else if(energyMeth==='indirect'&&icRee>0){energy=icRee*sf;energyLabel=`IC REE (${icRee} kcal) × ${sf}`;}
  if(isRefeeding){
    energy=Math.min(energy,(rfRiskLevel==='HIGH'?5:10)*wCalc);
    if(rfRiskLevel==='HIGH'){
      energyLabel='Energy restricted due to high refeeding risk (≤5 kcal/kg/day). Gradual advancement required.';
    } else {
      energyLabel+='  Refeeding cap (10 kcal/kg — MODERATE risk)';
    }
  }
  const netEnergy=Math.max(0,energy-ivGluc-propofolKcal);


  // EXPANDED PROTEIN REQUIREMENTS — driven by DIAGNOSIS_PROTEIN_MAP for all 60+ conditions
  let pfactor=1.5, pBasis='IBW', pRange='1.2–2.0 g/kg/day', pGuideline='ESPEN 2019 General Ward', pNotes='';

  // Priority 1: Renal function (overrides diagnosis protein)
  if (renal==='aki_no_rrt') {
    pfactor=1.0; pRange='0.8–1.2 g/kg/day'; pBasis='ABW'; pGuideline='KDIGO 2012 / ESPEN 2023 AKI';
    pNotes='AKI without RRT: 0.8–1.2 g/kg ABW. Do NOT restrict protein to delay RRT. Monitor BUN trend.';
  } else if (renal==='ckd_g1g2') {
    pfactor=0.8; pRange='≥0.8 g/kg/day (no restriction)'; pBasis='IBW'; pGuideline='KDOQI 2020 — no protein restriction recommendation for CKD G1–G2';
    pNotes='CKD G1–G2 (eGFR ≥60): KDOQI 2020 does not recommend protein restriction at this stage. Prescribe at least the RDA (0.8 g/kg IBW). Ensure adequate energy (25–35 kcal/kg). Monitor eGFR progression; if stage advances to G3, reassess with KDOQI 3.0.1 targets.';
  } else if (renal==='ckd_g3a') {
    pfactor=0.58; pRange='0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (with diabetes)'; pBasis='IBW'; pGuideline='KDOQI 2020 Guideline 3.0.1 / 3.0.2 · CKD G3a (eGFR 45–59)';
    pNotes='CKD G3a (KDOQI 2020 Guideline 3.0.1): Non-diabetic — LPD 0.55–0.60 g/kg IBW under close clinical supervision, or VLPD 0.28–0.43 g/kg + keto/amino acid analogues. Diabetic (Guideline 3.0.2): 0.6–0.8 g/kg IBW. Energy 25–35 kcal/kg (Guideline 3.1.1). Begin monitoring K⁺ & PO₄. Na⁺ <2.3 g/day if hypertensive.';
  } else if (renal==='ckd_g3b') {
    pfactor=0.58; pRange='0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (with diabetes)'; pBasis='IBW'; pGuideline='KDOQI 2020 Guideline 3.0.1 / 3.0.2 · CKD G3b (eGFR 30–44)';
    pNotes='CKD G3b (KDOQI 2020 Guideline 3.0.1): Non-diabetic — LPD 0.55–0.60 g/kg IBW, or VLPD 0.28–0.43 g/kg + keto/amino acid analogues under supervision. Diabetic (Guideline 3.0.2): 0.6–0.8 g/kg IBW. Energy 25–35 kcal/kg (Guideline 3.1.1). K⁺ & PO₄ monitoring essential. Refer to renal dietitian.';
  } else if (renal==='ckd_g4') {
    pfactor=0.58; pRange='0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (with diabetes) · VLPD: 0.28–0.43 g/kg + keto/AA analogues'; pBasis='IBW'; pGuideline='KDOQI 2020 Guideline 3.0.1 / 3.0.2 · CKD G4 (eGFR 15–29)';
    pNotes='CKD G4 (KDOQI 2020 Guideline 3.0.1): Non-diabetic — LPD 0.55–0.60 g/kg IBW, or VLPD 0.28–0.43 g/kg + keto/amino acid analogues under close dietitian supervision in motivated patients. Diabetic (Guideline 3.0.2): 0.6–0.8 g/kg IBW. Energy 25–35 kcal/kg (Guideline 3.1.1). Restrict K⁺, PO₄, Na⁺. Prepare for RRT — reassess immediately upon dialysis initiation.';
  } else if (renal==='ckd_g5') {
    pfactor=0.58; pRange='0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (with diabetes) · VLPD: 0.28–0.43 g/kg + keto/AA analogues'; pBasis='IBW'; pGuideline='KDOQI 2020 Guideline 3.0.1 / 3.0.2 · CKD G5 pre-dialysis (eGFR <15)';
    pNotes='CKD G5 pre-dialysis (KDOQI 2020 Guideline 3.0.1): Non-diabetic — LPD 0.55–0.60 g/kg IBW, or VLPD 0.28–0.43 g/kg + keto/amino acid analogues under strict dietitian supervision. Diabetic (Guideline 3.0.2): 0.6–0.8 g/kg IBW. Energy 25–35 kcal/kg (Guideline 3.1.1). Strict K⁺, PO₄, Na⁺ & fluid restriction. Imminent RRT planning — upon dialysis initiation increase protein to 1.0–1.2 g/kg DW (Guideline 3.0.3).';
  } else if (renal==='ckd') {
    pfactor=0.58; pRange='0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (with diabetes)'; pBasis='IBW'; pGuideline='KDOQI 2020 Guideline 3.0.1 / 3.0.2 · CKD G3–G5 pre-dialysis (stage unspecified)';
    pNotes='CKD pre-dialysis stage unspecified (KDOQI 2020): Non-diabetic — LPD 0.55–0.60 g/kg IBW (Guideline 3.0.1). Diabetic — 0.6–0.8 g/kg IBW (Guideline 3.0.2). Energy 25–35 kcal/kg (Guideline 3.1.1). Stage patient with eGFR for precise KDOQI targets. KDOQI 2020 protein recommendations apply to CKD G3–G5 only; G1–G2 have no restriction target.';
  } else if (renal==='aki_rrt') {
    pfactor=1.6; pRange='1.5–1.7 g/kg/day (max 1.7 g/kg on CRRT)'; pBasis='IBW'; pGuideline='KDIGO AKI 2012 Ch.5.3.2–5.3.3 / ESPEN Renal 2021';
    pNotes='AKI on RRT/CRRT (KDIGO AKI 2012): On intermittent RRT (HD/PD): 1.0–1.5 g/kg/day. On CRRT or hypercatabolic: maximum 1.7 g/kg/day — KDIGO Chapter 5.3.3. ESPEN Renal 2021 (Fiaccadori) concurs: 1.5–1.7 g/kg on CRRT. CRRT losses add ~10–15 g amino acids/day — factor into prescription.';
  } else if (renal==='hd') {
    pfactor=1.1; pRange='1.0–1.2 g/kg/day'; pBasis='DW'; pGuideline='KDOQI 2020 Guideline 3.0.3 · CKD G5D Haemodialysis';
    pNotes='HD (KDOQI 2020 Guideline 3.0.3): Prescribe 1.0–1.2 g/kg dry weight/day for metabolically stable MHD patients. Energy 25–35 kcal/kg (Guideline 3.1.1). Dialytic losses demand adequate protein — ~10 g amino acids lost per session. Fluid ~500–750 mL/day + urine output. K⁺ & PO₄ restriction.';
  } else if (renal==='pd') {
    pfactor=1.1; pRange='1.0–1.2 g/kg/day (KDOQI 2020) · 1.2–1.5 g/kg/day (ISPD / ESPEN Renal 2021)'; pBasis='DW'; pGuideline='KDOQI 2020 Guideline 3.0.3 · ISPD / ESPEN Renal 2021 · CKD G5D Peritoneal Dialysis';
    pNotes='PD: KDOQI 2020 Guideline 3.0.3 recommends 1.0–1.2 g/kg dry weight (same as HD). ISPD and ESPEN Renal 2021 (Fiaccadori) allow 1.2–1.5 g/kg to compensate peritoneal protein losses of 5–15 g/day (higher during peritonitis). Subtract dialysate dextrose calories (300–800 kcal/day) from energy target. Fluid, K⁺, Na⁺ & PO₄ restriction.';

  // Priority 2: Diagnosis-specific via DIAGNOSIS_PROTEIN_MAP
  } else if (typeof DIAGNOSIS_PROTEIN_MAP !== 'undefined') {
    // Multi-condition: pick the highest protein factor across all active diagnoses
    const _combDM = (typeof getCombinedProteinFactor === 'function')
      ? getCombinedProteinFactor(_activeDiagnoses)
      : DIAGNOSIS_PROTEIN_MAP[diagnosis];
    if (_combDM) {
      const dm   = _combDM;
      pfactor    = dm.pf;
      pRange     = dm.range;
      pBasis     = dm.basis === 'DW' ? 'Dry weight' : dm.basis === 'ABW' ? 'Actual' : dm.basis;
      pGuideline = dm.gl + (_activeDiagnoses.length > 1 ? ` (+${_activeDiagnoses.length-1} condition${_activeDiagnoses.length>2?'s':''})` : '');
      // Combine notes from all active conditions
      pNotes = _activeDiagnoses
        .map(dv => DIAGNOSIS_PROTEIN_MAP[dv]?.note)
        .filter(Boolean)
        .map((n, i) => i === 0 ? n : `[${ALL_DIAGNOSES?.find(x=>x.value===_activeDiagnoses[i])?.label||_activeDiagnoses[i]}] ${n}`)
        .join(' | ');
    }

  // Priority 3: Hepatic function
  } else if (hepatic==='severe') {
    pfactor=1.2; pRange='1.0–1.5 g/kg/day'; pBasis='Dry weight'; pGuideline='ESPEN Liver Disease 2019 / EASL';
    pNotes='Acute liver failure: 1.0–1.5 g/kg DW. NEVER restrict protein. BCAA if refractory encephalopathy.';
  } else if (hepatic==='mild') {
    pfactor=1.3; pRange='1.2–1.5 g/kg/day'; pGuideline='EASL / ESPEN';
    pNotes='Compensated cirrhosis: 1.2–1.5 g/kg. Late evening snack (LES). BCAA if intolerant.';

  // Priority 4: BMI-based adjustments
  } else if (bmi>40) {
    pfactor=2.2; pBasis='IBW'; pRange='≥2.5 g/kg IBW/day'; pGuideline='ASPEN Obesity (Class III)';
    pNotes='Severe obesity BMI>40: ≥2.5 g/kg IBW. 50–60% of energy target (hypocaloric). High protein.';
  } else if (bmi>30) {
    pfactor=2.0; pBasis='IBW'; pRange='≥2.0 g/kg IBW/day'; pGuideline='SCCM/ASPEN Obesity';
    pNotes='Obesity in ICU: ≥2.0 g/kg IBW (Class I–II). Hypocaloric high-protein feeding recommended.';

  // Priority 5: Age + phase
  } else if (age>=65) {
    pfactor=1.3; pRange='1.0–1.5 g/kg/day'; pGuideline='ESPEN Geriatrics 2018 / PROT-AGE';
    pNotes='Elderly ≥65y: ≥1.2 g/kg in illness/stress. PROT-AGE up to 2.0 g/kg in acute illness.';
  } else if (icuPhase==='early') {
    pfactor=1.3; pRange='1.2–1.5 g/kg/day'; pGuideline='SCCM/ASPEN 2016 / ASPEN 2022 / ESPEN 2019';
    pNotes='Acute early ICU (0–3d): 1.2–1.5 g/kg IBW. Protein as important as calories. Full target by Day 3–5.';
  } else if (icuPhase==='late') {
    pfactor=1.7; pRange='1.5–2.0 g/kg/day'; pGuideline='SCCM/ASPEN 2016 / ASPEN 2022 / ESPEN 2019';
    pNotes='Acute late ICU (4–7d): 1.5–2.0 g/kg IBW. Ramp up protein to counter catabolism.';
  } else {
    pfactor=1.5; pRange='1.2–1.7 g/kg/day'; pGuideline='ESPEN 2019 / ASPEN General';
    pNotes='General ward/recovery: 1.2–1.7 g/kg/day. Increase toward 2.0 g/kg in high catabolic states.';
  }

  // ── HIGH REFEEDING RISK: conservative protein override ─────────────────
  // NICE CG32 2006 / ASPEN Refeeding 2020: initiate protein conservatively;
  // advance toward 1.5–2.0 g/kg as energy increases over 5–7 days.
  if (isRefeeding && rfRiskLevel === 'HIGH') {
    pfactor    = 1.1;   // mid-point of 1.0–1.2 g/kg IBW
    pRange     = '1.0–1.2 g/kg/day';
    pBasis     = 'IBW';
    pGuideline = 'NICE CG32 2006 / ASPEN Refeeding 2020';
    pNotes     = 'Protein initiated conservatively due to refeeding risk; advance toward 1.5–2.0 g/kg as energy increases. Permissive underfeeding: protein prioritised over total energy in early refeeding phase.';
  }

  const edw = parseFloat(document.getElementById('a-edw')?.value) || null;
  const pWt = pBasis==='Actual'     ? weight
             : pBasis==='Dry weight' ? (edw || ibw)
             : pBasis==='DW'         ? (edw || ibw)
             : pBasis==='ABW'        ? weight
             : ibw;  // IBW default
  const protein = pfactor * pWt;

  // ════════════════════════════════════════════════════════════════
  // DISEASE-SPECIFIC MACRONUTRIENT RANGES  (protein-first engine)
  // Percentages below are AMDR / condition targets relative to
  // TOTAL energy — used only to derive the CHO:fat split ratio.
  // Actual gram targets are computed after protein is subtracted.
  // ════════════════════════════════════════════════════════════════
  const macroRanges = (() => {
    const base = { cho:{lo:45,hi:60,note:'Standard AMDR'},   fat:{lo:20,hi:35,note:'Standard AMDR'},  limitNote:'' };
    if (diagnosis==='ards')        return { cho:{lo:30,hi:50,note:'Reduced CHO — high CHO worsens CO₂ production/hypercapnia'}, fat:{lo:30,hi:45,note:'Higher fat — better ventilatory quotient in ARDS/MV'}, limitNote:'Omega-3 fatty acids may reduce lung inflammation (ESPEN 2019)' };
    if (diagnosis==='burns')       return { cho:{lo:50,hi:65,note:'High CHO to meet caloric demands; max 5 mg/kg/min glucose'},  fat:{lo:15,hi:30,note:'Moderate fat; MCT/LCT mix; avoid excess (immunosuppressive)'}, limitNote:'Omega-3 supplementation recommended in burns. Max glucose oxidation rate ≤5 mg/kg/min.' };
    if (diagnosis==='sepsis')      return { cho:{lo:40,hi:55,note:'Moderate CHO — avoid overfeeding; insulin resistance common'},    fat:{lo:25,hi:40,note:'Moderate fat; omega-3 may benefit immune modulation'},     limitNote:'Avoid hyperglycaemia (>10 mmol/L). Insulin resistance is expected.' };
    if (diagnosis==='neuro')       return { cho:{lo:50,hi:60,note:'Standard CHO; glucose preferred substrate for injured brain'},   fat:{lo:20,hi:35,note:'Standard fat'},                                              limitNote:'Ketogenic diets being studied in TBI; not routine. Maintain normoglycaemia.' };
    if (diagnosis==='pancreatitis')return { cho:{lo:50,hi:60,note:'Standard or jejunal EN; limit if hypertriglyceridaemia'},        fat:{lo:15,hi:25,note:' Restrict fat if serum TG >5.6 mmol/L; prefer MCT'},       limitNote:'If TG >5.6 mmol/L: strict fat restriction, MCT oil only. Jejunal EN preferred over PN.' };
    if (renal==='ckd'||renal==='aki_no_rrt') return { cho:{lo:50,hi:65,note:'Higher CHO to spare protein; avoid simple sugars in DM'},fat:{lo:20,hi:30,note:'Standard fat; restrict P-containing lipids'},              limitNote:'Restrict K⁺, PO₄, Na⁺. Avoid high-K and high-P foods. Energy dense formula preferred.' };
    if (renal==='aki_rrt'||renal==='hd')  return { cho:{lo:45,hi:55,note:'Moderate CHO; glycaemic control critical on HD'},         fat:{lo:25,hi:35,note:'Standard fat'},                                              limitNote:'Higher protein needed (1.5–2.5 g/kg). Supplement water-soluble vitamins lost in dialysate.' };
    if (hepatic==='severe')        return { cho:{lo:45,hi:60,note:'Standard CHO; complex carbs preferred; avoid prolonged fasting'},fat:{lo:25,hi:35,note:'MCT-enriched if steatorrhoea; standard otherwise'},          limitNote:'Late evening snack (LES) recommended. Complex CHO preferred. BCAA supplement if encephalopathy.' };
    if (diagnosis==='copd')        return { cho:{lo:35,hi:50,note:' Reduced CHO — high CHO raises RQ, worsens CO₂ retention'},   fat:{lo:30,hi:45,note:'Higher fat — reduces CO₂ production vs CHO'},               limitNote:'Calorie-dense, low-volume formula. High-fat/low-CHO enteral formula (e.g. Pulmocare).' };
    if (diagnosis==='cardiac')     return { cho:{lo:45,hi:55,note:'Standard CHO; complex carbs, low refined sugar'},               fat:{lo:20,hi:30,note:'Restrict saturated fat <7%; prefer MUFA/PUFA'},             limitNote:'Na restriction 1.5–2g/day. Fluid restriction if heart failure. Omega-3 supplementation.' };
    if (['ascvd','coronary_hd','cvd_high_risk'].includes(diagnosis))
      return { cho:{lo:45,hi:55,note:'Complex CHO, low GI; avoid refined sugars + white starch'},
               fat:{lo:25,hi:35,note:'SFA <5–6%E — replace with MUFA/PUFA (olive oil, nuts, fatty fish)'},
               limitNote:'Saturated fat <5–6% total kcal · Trans fat: eliminate · Soluble fiber 25–30 g/day · Omega-3 ≥2 fish servings/week · Plant sterols 2 g/day · DASH or Mediterranean pattern · Na ≤2400 mg/day · Physical activity ≥150 min/week. Source: Krause 16th ed. Ch. 33.' };
    if (diagnosis==='hypertension')
      return { cho:{lo:50,hi:60,note:'DASH diet CHO: fruits, vegetables, whole grains — low refined sugar'},
               fat:{lo:20,hi:27,note:'Low SFA; low-fat dairy; MUFA preferred — per DASH trial'},
               limitNote:'Na ≤1500 mg/day (optimal) — ≤2400 mg/day (minimum). Potassium-rich foods: banana, potato, legumes (target 4700 mg/day). DASH diet reduces SBP up to 11 mmHg. Weight loss: ~1 mmHg per 1 kg lost. Alcohol ≤1–2 drinks/day. Source: Krause 16th ed. Ch. 33 / DASH Trial.' };
    if (['hypercholesterol','familial_hc'].includes(diagnosis))
      return { cho:{lo:50,hi:60,note:'Complex CHO preferred; soluble fiber 10–25 g/day (oats, barley, psyllium, legumes)'},
               fat:{lo:25,hi:35,note:'SFA <5–6%E strictly · Trans fat: eliminate · Replace with MUFA/PUFA'},
               limitNote:'SFA <5–6%E is primary LDL target. Plant sterols/stanols 2–3 g/day add 5–15% LDL reduction. Soluble fiber specifically binds bile acids → ↓ LDL. Dietary cholesterol: no strict limit (guidelines 2020) — but limit high-SFA cholesterol foods contextually. Source: Krause 16th ed. Ch. 33 / AHA 2019.' };
    if (diagnosis==='hypertriglyc')
      return { cho:{lo:40,hi:50,note:' Reduced CHO — refined sugars + refined starch worsen TG; choose low GI whole foods'},
               fat:{lo:25,hi:35,note:'Emphasise omega-3 (EPA+DHA) ≥2 g/day · Avoid SFA excess'},
               limitNote:'Omega-3 (EPA+DHA) ↓ TG 20–50%. Eliminate alcohol — major TG driver. Weight loss 5–10% significantly reduces TG. Avoid sugar-sweetened beverages completely. If TG >5.6 mmol/L (>500 mg/dL): fat restriction ≤15%E, MCT oil substitution, monitor for pancreatitis risk. Source: Krause 16th ed. Ch. 33 / AHA 2019.' };
    if (diagnosis==='low_hdl')
      return { cho:{lo:45,hi:55,note:'Moderate CHO — avoid very-high-CHO / very-low-fat diets (paradoxically lower HDL)'},
               fat:{lo:30,hi:40,note:'Increase MUFA (olive oil, avocado, nuts) — maintains/raises HDL · Eliminate trans fat'},
               limitNote:'Trans fat: eliminate — lowers HDL + raises LDL simultaneously. Aerobic exercise ≥150 min/week is the most effective non-pharmacologic HDL intervention. Replace SFA with MUFA (not with CHO — that lowers HDL). Moderate alcohol raises HDL but not recommended therapeutically. Source: Krause 16th ed. Ch. 33.' };
    if (['dyslipidemia','familial_chl','cvd_mod_risk'].includes(diagnosis))
      return { cho:{lo:45,hi:55,note:'Complex CHO, low GI; ↓ refined CHO + sugars to improve TG'},
               fat:{lo:25,hi:35,note:'SFA <5–6%E · Trans fat eliminated · Increase MUFA + PUFA · Omega-3 from fish'},
               limitNote:'Mixed lipid target: ↓ LDL + ↓ TG + ↑ HDL. Soluble fiber 25–30 g/day. Plant sterols 2 g/day. Omega-3 ≥2 fish meals/week. Mediterranean diet addresses all fractions simultaneously. Physical activity ≥150 min/week. Weight management central. Source: Krause 16th ed. Ch. 33.' };
    if (['metabolic_synd_cvd','metabolic_synd'].includes(diagnosis))
      return { cho:{lo:40,hi:50,note:'Low GI CHO; ↓ refined sugar + processed starch; adequate fibre'},
               fat:{lo:28,hi:35,note:'Mediterranean-type fat: MUFA-dominant · SFA <7%E · Omega-3'},
               limitNote:'Weight loss 5–10% improves all MetS components simultaneously. DASH or Mediterranean pattern first-line. Na ≤2400 mg/day. Physical activity ≥150 min/week. Address insulin resistance with low GI foods. hs-CRP often elevated — omega-3 + fiber + antioxidants reduce inflammation. Source: Krause 16th ed. Ch. 33 / IDF 2009.' };
    if (diagnosis==='iron_def_anemia') return {
      cho:{lo:50,hi:60,note:'Standard CHO — energy adequate to spare protein for RBC synthesis'},
      fat:{lo:20,hi:35,note:'Standard fat — no specific restriction; omega-3 may reduce inflammation'},
      limitNote:'Include vitamin C (50–200 mg) with each meal to enhance nonheme iron absorption. Separate tea, coffee, milk, high-fibre foods from iron-rich foods by ≥1 hour. Heme iron (MFP): ~15% absorbable. Nonheme iron (legumes, veg): 3–8% absorbable. Ferrous bisglycinate preferred supplement (less GI distress, better absorbed).' };
    if (diagnosis==='megaloblastic_folate') return {
      cho:{lo:50,hi:60,note:'Standard CHO — no specific restriction'},
      fat:{lo:20,hi:35,note:'Standard fat'},
      limitNote:'Folate-rich foods: dark green leafy vegetables, fresh uncooked fruit, fruit juice, fortified grains. Heat destroys folate — prefer raw or minimally cooked. Folate RDA: 400 mcg/day adults; 600 mcg/day pregnancy. MUST rule out B12 deficiency before treating with folate alone.' };
    if (diagnosis==='pernicious_anemia') return {
      cho:{lo:45,hi:60,note:'Standard CHO — no specific restriction'},
      fat:{lo:20,hi:35,note:'Standard fat — no specific restriction'},
      limitNote:'Rich B12 sources: beef, pork, dark poultry, eggs, dairy. B12 RDA: 2.4 mcg/day. Supplement with crystalline B12 if >50 years (atrophic gastritis). Folate from green leafy veg is a bonus. Metformin users: B12 malabsorption in 10–30% — supplement and consider calcium intake.' };
    if (diagnosis==='sickle_cell') return {
      cho:{lo:50,hi:60,note:'Adequate CHO for energy — folate-rich complex CHO preferred (beans, leafy veg)'},
      fat:{lo:20,hi:30,note:'Moderate fat — omega-3 may reduce inflammation; avoid excessive saturated fat'},
      limitNote:'High folate diet (400–600 mcg/day) — critical for erythropoiesis. Zinc-rich foods (animal protein) + at least RDA copper. Fluid 2–3 L/day. Low sodium. Exclude iron-fortified foods and avoid vitamin C and alcohol supplements if iron restriction is needed. Monitor vitamins A, C, D, E, calcium, and fibre — commonly deficient.' };
    if (diagnosis==='thalassemia') return {
      cho:{lo:50,hi:60,note:'Adequate CHO — folate-rich carbohydrate sources preferred'},
      fat:{lo:20,hi:30,note:'Standard fat — no excess; saturated fat restriction general good practice'},
      limitNote:'Non-transfused: moderately low-iron diet — limit red meat, iron-fortified foods; avoid vitamin C and multivitamins with iron above RDA. Transfused + chelation: no iron restriction needed. High folate, vitamins A and C, zinc, copper, selenium. Calcium + vitamin D for bone health.' };
    if (diagnosis==='iron_overload') return {
      cho:{lo:50,hi:65,note:'Higher plant-based CHO — whole grains, legumes reduce heme iron load'},
      fat:{lo:20,hi:30,note:'Reduce meat fat — shift to plant oils; avoid excessive saturated fat (liver disease risk)'},
      limitNote:' RESTRICT: meat, fish, poultry (heme iron). Avoid: vitamin C supplements, iron-fortified foods, iron-containing supplements, alcohol. Plant-based diet preferred. Phytates (whole grains, legumes) naturally inhibit iron absorption — beneficial. Medical treatment: phlebotomy or chelation (deferoxamine/deferasirox).' };
    if (diagnosis==='anemia_chronic_dis') return {
      cho:{lo:45,hi:60,note:'Standard CHO — adjust for underlying disease (CKD, DM, liver disease)'},
      fat:{lo:20,hi:35,note:'Standard fat — adjust per underlying condition'},
      limitNote:' Do NOT supplement iron — ferritin is normal or elevated. ACD is driven by hepcidin-mediated iron sequestration (inflammatory state), not iron deficiency. Treat underlying disease. ESAs or transfusion only in severe refractory cases. Differentiate from IDA using soluble transferrin receptors (STFR): elevated in IDA, normal in ACD.' };
    if (diagnosis==='sports_anemia') return {
      cho:{lo:50,hi:60,note:'Adequate CHO — carbohydrate timing important for performance; refuel post-exercise'},
      fat:{lo:20,hi:35,note:'Standard fat — omega-3 may support anti-inflammatory recovery'},
      limitNote:'Physiologic hemodilution — advantageous adaptation, does NOT impair performance. Do NOT supplement iron unless true IDA confirmed (CBC, ferritin, serum iron, TIBC, % saturation). Iron-rich foods: meat, fish, dark leafy vegetables. Separate iron inhibitors (tea, coffee, antacids) from iron-rich meals.' };
    if (bmi>30)                    return { cho:{lo:35,hi:50,note:'Reduced CHO — hypocaloric high-protein approach in obese ICU'},  fat:{lo:20,hi:35,note:'Moderate fat'},                                              limitNote:'Hypocaloric (≤70% target) high-protein (≥2.0 g/kg IBW) feeding. Avoid simple sugars.' };
    return base;
  })();

  // ════════════════════════════════════════════════════════════════
  // PROTEIN-FIRST MACRONUTRIENT ALLOCATION ENGINE
  // Step 1 → Protein kcal from evidence-based g/kg target
  // Step 2 → Remaining kcal distributed to CHO + fat
  // Step 3 → CHO:fat ratio from macroRanges (AMDR/disease-specific)
  // Step 4 → Convert back to % of total energy for display
  // Basis: ASPEN/SCCM 2022, ESPEN 2019, ASPEN Refeeding 2020
  // ════════════════════════════════════════════════════════════════
  const _protKcal       = Math.round(protein * 4);
  const _nonProtKcal    = Math.max(0, netEnergy - _protKcal);

  // CHO:fat ratio from macroRanges (preserves clinical CHO:fat balance)
  const _choSumLo       = macroRanges.cho.lo + macroRanges.fat.lo;
  const _choSumHi       = macroRanges.cho.hi + macroRanges.fat.hi;
  const _choRatioLo     = _choSumLo > 0 ? macroRanges.cho.lo / _choSumLo : 0.60;
  const _fatRatioLo     = _choSumLo > 0 ? macroRanges.fat.lo / _choSumLo : 0.40;
  const _choRatioHi     = _choSumHi > 0 ? macroRanges.cho.hi / _choSumHi : 0.65;
  const _fatRatioHi     = _choSumHi > 0 ? macroRanges.fat.hi / _choSumHi : 0.35;

  // Allocate residual kcal
  const _choKcalLo      = Math.round(_nonProtKcal * _choRatioLo);
  const _choKcalHi      = Math.round(_nonProtKcal * _choRatioHi);
  const _fatKcalLo      = Math.round(_nonProtKcal * _fatRatioLo);
  const _fatKcalHi      = Math.round(_nonProtKcal * _fatRatioHi);

  // Grams/day
  const _choGLo         = Math.round(_choKcalLo / 4);
  const _choGHi         = Math.round(_choKcalHi / 4);
  const _fatGLo         = Math.round(_fatKcalLo / 9);
  const _fatGHi         = Math.round(_fatKcalHi / 9);

  // % of total energy (for display bars)
  const _safeNet        = netEnergy || 1;
  const _protPctDisplay = Math.round(_protKcal / _safeNet * 100);
  const _choPctLoDisp   = Math.round(_choKcalLo / _safeNet * 100);
  const _choPctHiDisp   = Math.round(_choKcalHi / _safeNet * 100);
  const _fatPctLoDisp   = Math.round(_fatKcalLo / _safeNet * 100);
  const _fatPctHiDisp   = Math.round(_fatKcalHi / _safeNet * 100);

  // Safety clamp: cho + fat + prot ≤ 100 (rounding edge cases)
  const _macroSum       = _protPctDisplay + _choPctLoDisp + _fatPctLoDisp;
  const _macroOverflow  = _macroSum > 100 ? _macroSum - 100 : 0;

  const _choMaxRate     = Math.round(weight * 5 * 0.001 * 180 / 4); // 5 mg/kg/min → g/day
  const _lipidMax       = Math.round(weight * 1.5);

  const kcalPerMl=fluidSt==='restricted'?1.5:1.0;
  const enVol=route==='enteral'?Math.round(netEnergy/kcalPerMl):0;
  const enRate=enVol?Math.round(enVol/24):0;
  const bmiCat = classifyAdultBMI(bmi);

  // Enrich payload with Firestore-tracked fields
  const _burnEqSelected = document.querySelector('input[name="burn_eq"]:checked')?.value || '';
  const _ward = document.getElementById('ward')?.value?.trim() ||
                document.getElementById('def-ward')?.value?.trim() || '';
  const _instNow = localStorage.getItem('nc_institution') || DataService.get('settings')?.institution || '';

  const RENAL_LABELS = {
    normal:'Normal / No AKI', aki_no_rrt:'AKI — No RRT', aki_rrt:'AKI — On RRT/CRRT',
    ckd_g1g2:'CKD G1–G2 (eGFR ≥60)', ckd_g3a:'CKD G3a (eGFR 45–59)', ckd_g3b:'CKD G3b (eGFR 30–44)',
    ckd_g4:'CKD G4 (eGFR 15–29)', ckd_g5:'CKD G5 pre-dialysis', ckd:'CKD (non-dialysis)',
    hd:'CKD G5D — Haemodialysis', pd:'CKD G5D — Peritoneal Dialysis'
  };
  const calcPayload = {
    age, weight: weight.toFixed(1), heightCm: height.toFixed(1),
    bmi: bmi.toFixed(1), diagnosis, sex, patientName,
    energy: Math.round(energy), netEnergy: Math.round(netEnergy),
    protein: Math.round(protein), proteinPerKg: pfactor,
    route, rfRisk: rfCount, icuPhase, energyMethod: energyMeth,
    renal: RENAL_LABELS[renal] || renal, renalRaw: renal, hepatic,
    // Fields matched to Firestore schema
    calcType:      _activeDiagnoses.includes('burns') ? ('burns-' + _burnEqSelected) : diagnosis || energyMeth || 'adult',
    diagnoses:     _activeDiagnoses,  // all active conditions
    module:        'adult',
    ward:          _ward,
    institution:   _instNow,
    institutionCat: _getInstitutionCategory(_instNow),
    patientId:     (patientName || '').replace(/\s+/g,'_').slice(0, 20) || ('PT-' + Math.floor(Math.random()*9000+1000)),
    burnEquation:  diagnosis === 'burns' ? _burnEqSelected : null,
    tbsa:          diagnosis === 'burns' ? (parseFloat(document.getElementById('tbsa')?.value)||0) : null,
    deviceInfo:    navigator.userAgent.slice(0, 100),
  };
  logCalcToFirebase(calcPayload);
  lastCalcData = calcPayload;
  appState.lastCalc = calcPayload;  // Update global state
  try { syncAllModulesFromSource('adult'); } catch(e){}
  // Sync targets to recall + meal planner automatically
  try {
    // Protein-first: CHO and fat from residual non-protein kcal
    const _cho = _choGLo;
    const _fat = _fatGLo;
    const _fld = Math.round((parseFloat(weight)||70) * 35);
    document.getElementById('recall-target-kcal').value  = Math.round(energy);
    document.getElementById('recall-target-cho').value   = _cho;
    document.getElementById('recall-target-pro').value   = Math.round(protein);
    document.getElementById('recall-target-fat').value   = _fat;
    document.getElementById('recall-target-fluid').value = _fld;
    if(document.getElementById('recall-wt')) document.getElementById('recall-wt').value = parseFloat(weight).toFixed(1);
    const rss = document.getElementById('recall-sync-status');
    if(rss) rss.innerHTML='<span style="color:var(--green)"> Auto-synced from Calculator</span>';
    updateRecallTotals();
  } catch(e){}
  try { syncMealPlanFromCalc(); } catch(e){}
  try { syncEnteralFromCalc(); } catch(e){}

  document.getElementById('r-abw').textContent=weight.toFixed(1);
  document.getElementById('r-ibw').textContent=ibw.toFixed(1);
  document.getElementById('r-adjbw').textContent=adjbw?adjbw.toFixed(1):'N/A';
  document.getElementById('r-bmi').textContent=bmi.toFixed(1);
  document.getElementById('r-bmi-cat').textContent=bmiCat;
  document.getElementById('r-wused').textContent=wCalc.toFixed(1)+' kg';
  document.getElementById('r-wused-type').textContent=wBasis;
  document.getElementById('r-energy').textContent=Math.round(energy);
  document.getElementById('r-energy-rng').textContent = (isRefeeding && rfRiskLevel==='HIGH')
    ? 'RESTRICTED — HIGH refeeding risk (see advancement protocol below)'
    : (isRefeeding && rfRiskLevel==='MODERATE')
    ? `Range: 10 kcal/kg/day — MODERATE refeeding risk`
    : `Range: ${phaseRange} kcal/kg/day`;
  document.getElementById('r-net').textContent=Math.round(netEnergy);
  document.getElementById('r-protein').textContent=Math.round(protein);
  document.getElementById('r-protein-rng').textContent=pRange;
  document.getElementById('r-prot-kg').textContent=pfactor.toFixed(1);
  document.getElementById('r-prot-basis').textContent='Based on '+pBasis;

  // ── #6 FLUID REQUIREMENT ──────────────────────────────────
  const fluidLow  = Math.round(25 * weight);
  const fluidHigh = Math.round(30 * weight);
  const fluidMid  = Math.round((fluidLow + fluidHigh) / 2);
  const fluidEl = document.getElementById('r-fluid');
  const fluidRngEl = document.getElementById('r-fluid-rng');
  if (fluidEl) fluidEl.textContent = `${fluidLow}–${fluidHigh}`;
  if (fluidRngEl) fluidRngEl.textContent = `${fluidLow}–${fluidHigh} mL/day (25–30 mL/kg)`;

  // ── #5 PROPOFOL DISPLAY ───────────────────────────────────
  const propofolEl    = document.getElementById('r-propofol-kcal');
  const propofolSubEl = document.getElementById('r-propofol-sub');
  if (propofolEl) {
    propofolEl.textContent = propofolKcal > 0 ? Math.round(propofolKcal) : '0';
    propofolEl.style.color = propofolKcal > 0 ? 'var(--amber)' : 'var(--text-dim)';
  }
  if (propofolSubEl) {
    propofolSubEl.textContent = propofolKcal > 0
      ? `Adj. target: ${Math.round(netEnergy)} kcal/day`
      : 'No propofol entered';
  }

  // ── #4 PROTEIN RANGE DISPLAY ─────────────────────────────
  // Parse low/high from pRange string like "1.5–2.0 g/kg/day"
  const pRangeMatch = pRange.match(/([\d.]+)[–\-]([\d.]+)/);
  const proMin = pRangeMatch ? Math.round(parseFloat(pRangeMatch[1]) * pWt) : Math.round(protein * 0.85);
  const proMax = pRangeMatch ? Math.round(parseFloat(pRangeMatch[2]) * pWt) : Math.round(protein * 1.15);
  const proRngEl = document.getElementById('r-protein-rng');
  if (proRngEl) proRngEl.textContent = `${proMin}–${proMax} g/day | ${pRange}`;

  // r-breakdown removed — data is shown in metric cards above

  document.querySelector('#r-recs').innerHTML=`
    <tr><td>Route</td><td class="c-t">${route.toUpperCase()}</td></tr>
    ${route==='enteral'?`<tr><td>Formula density</td><td>${kcalPerMl} kcal/mL</td></tr>
    <tr><td>Total EN volume</td><td class="c-t">${enVol} mL/day</td></tr>
    <tr><td>Continuous rate</td><td class="c-t">${enRate} mL/hr</td></tr>
    <tr><td>Starter rate (Day 1)</td><td class="c-a">${Math.round(enRate*0.5)} mL/hr</td></tr>
    <tr><td>Target rate</td><td>${isRefeeding && rfRiskLevel==='HIGH' ? `${enRate} mL/hr — advance slowly over 4–7 days due to high refeeding risk` : `${enRate} mL/hr (Day 2–3)`}</td></tr>`:''}
    <tr><td>Initiation</td><td class="c-a">${isRefeeding?' Slow — refeeding precautions':'Standard protocol'}</td></tr>
    ${route==='enteral'?`<tr><td>EN tolerance</td><td>Routine gastric residual volume (GRV) monitoring is not recommended. Assess only if clinical signs of intolerance are present (vomiting, distension, aspiration risk) (ASPEN/SCCM 2016).</td></tr>`:''}
    <tr><td>BGL target</td><td>6.1–10.0 mmol/L</td></tr>
    <tr><td>Reassess</td><td>Every 24–48h</td></tr>`;

  document.getElementById('r-macro-badge').textContent =
    (diagnosis.toUpperCase()) + ' / ' + (renal !== 'normal' ? renal.toUpperCase() : icuPhase.toUpperCase());

  // ── MACRO RANGE VISUAL BARS — PROTEIN-FIRST ENGINE ───────────
  // Order: Protein (allocated first) → Carbohydrate → Fat
  // CHO and fat derive from residual non-protein energy pool.
  // Source: ASPEN/SCCM 2022, ESPEN 2019, KDOQI 2020
  const macroBarsEl = document.getElementById('r-macro-bars');
  if (macroBarsEl) {
    if (isRefeeding && rfRiskLevel === 'HIGH') {
      macroBarsEl.innerHTML = `<div style="grid-column:1/-1;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px 14px;font-family:var(--mono);font-size:10px;color:var(--red);line-height:1.6">
         Macronutrient percentage targets are not displayed during high-refeeding-risk phase. Energy delivery is intentionally restricted (≤5 kcal/kg/day). Protein is prioritised over total energy. Macro distribution becomes clinically relevant once energy is advanced to ≥15 kcal/kg/day (Day 5–7 onwards).
      </div>`;
    } else {
    // Protein-first: show residual-based CHO and fat percentages
    const macroItems = [
      {
        label:'Protein',
        lo: _protPctDisplay, hi: _protPctDisplay, actual: _protPctDisplay,
        color:'var(--blue)', unit:'% energy',
        note:`${Math.round(protein)} g/day · ${pRange} · <strong>Allocated first</strong> · ${Math.round(_nonProtKcal)} kcal non-protein energy remaining`,
        gLo: Math.round(protein), gHi: Math.round(protein),
        badge:'FIRST'
      },
      {
        label:'Carbohydrate',
        lo: _choPctLoDisp, hi: _choPctHiDisp, actual: _choPctLoDisp,
        color:'var(--amber)', unit:'% energy',
        note:`From residual non-protein pool · ${macroRanges.cho.note}`,
        gLo: _choGLo, gHi: _choGHi,
        badge:''
      },
      {
        label:'Fat',
        lo: _fatPctLoDisp, hi: _fatPctHiDisp, actual: _fatPctLoDisp,
        color:'var(--green)', unit:'% energy',
        note:`From residual non-protein pool · ${macroRanges.fat.note}`,
        gLo: _fatGLo, gHi: _fatGHi,
        badge:''
      },
    ];
    macroBarsEl.innerHTML =
      // Protein-first banner
      `<div style="grid-column:1/-1;background:rgba(96,165,250,0.07);border:1px solid rgba(96,165,250,0.25);border-radius:8px;padding:8px 14px;font-family:var(--mono);font-size:9px;color:#93c5fd;line-height:1.7">
        <strong style="color:var(--blue)">⬡ Protein-First Allocation</strong> &nbsp;·&nbsp;
        Protein target (<strong>${Math.round(protein)} g</strong> · <strong>${_protPctDisplay}%</strong> energy) is determined by clinical condition and allocated first.
        Remaining <strong>${Math.round(_nonProtKcal)} kcal</strong> (${100-_protPctDisplay}%) distributed between CHO and fat using ${diagnosis.toUpperCase()} condition-specific AMDR ratios.
        Source: ASPEN/SCCM 2022 · ESPEN 2019 · ${pGuideline.split('·')[0].trim()}.
      </div>` +
      macroItems.map(m => `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;min-width:0;overflow:hidden">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:2px 6px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:5px;min-width:0">
            <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:1px;color:${m.color};text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.label}</div>
            ${m.badge ? `<span style="font-family:var(--mono);font-size:7px;font-weight:700;color:var(--blue);background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);border-radius:3px;padding:1px 5px;letter-spacing:.5px">${m.badge}</span>` : ''}
          </div>
          <div style="font-family:var(--mono);font-size:12px;font-weight:700;color:${m.color};white-space:nowrap;flex-shrink:0">${m.lo}${m.lo !== m.hi ? '–'+m.hi : ''}%</div>
        </div>
        <div style="position:relative;height:10px;background:var(--surface3);border-radius:5px;margin-bottom:6px;overflow:hidden">
          <div style="position:absolute;left:${Math.min(m.lo,97)}%;width:${Math.max(m.hi-m.lo,2)}%;height:100%;background:${m.color};opacity:0.7;border-radius:5px;transition:all .6s ease"></div>
          <div style="position:absolute;left:${Math.min(m.lo + (m.hi-m.lo)*0.5, 96)}%;transform:translateX(-50%);top:0;width:3px;height:100%;background:${m.color};border-radius:1px"></div>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr auto;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-bottom:6px;gap:2px;align-items:center">
          <span>0%</span>
          <span style="color:${m.color};font-weight:700;text-align:center;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.lo}${m.lo !== m.hi ? '–'+m.hi : ''}% total kcal</span>
          <span style="text-align:right">100%</span>
        </div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-bright);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.gLo}${m.gLo !== m.gHi ? '–'+m.gHi : ''} g/day</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.5;word-break:break-word">${m.note}</div>
      </div>`).join('') +
      (macroRanges.limitNote ? `<div style="grid-column:1/-1;background:rgba(255,184,48,.07);border:1px solid rgba(255,184,48,.3);border-radius:8px;padding:10px 14px;font-family:var(--mono);font-size:10px;color:var(--amber);line-height:1.6"> ${macroRanges.limitNote}</div>` : '');
    } // end else (not HIGH refeeding)
  }

  // Micronutrients only — macros are shown in visual bars above
  const _isHaem = ['iron_def_anemia','megaloblastic_folate','pernicious_anemia','anemia_chronic_dis','sickle_cell','thalassemia','iron_overload','sports_anemia'].includes(diagnosis);
  const _isCVD  = ['ascvd','coronary_hd','hypertension','dyslipidemia','hypercholesterol','hypertriglyc','low_hdl','familial_hc','familial_chl','metabolic_synd_cvd','cvd_high_risk','cvd_mod_risk'].includes(diagnosis);
  const rMicros = document.getElementById('r-micros');

  if (_isCVD) {
    // ── CVD-SPECIFIC OUTPUT ENGINE ────────────────────────────────
    const _labTG  = parseFloat(document.getElementById('lab-tg')?.value)  || 0;
    const _labHDL = parseFloat(document.getElementById('lab-hdl')?.value) || 0;
    const _labLDL = parseFloat(document.getElementById('lab-ldl')?.value) || 0;
    const _labCRP = parseFloat(document.getElementById('lab-crp')?.value) || 0;
    const _labBP  = parseFloat(document.getElementById('lab-sbp')?.value) || 0;
    const _cvdBMI = bmi;

    // ── CVD Lab flags ──────────────────────────────────────────────
    const _tgHigh    = _labTG > 0  && _labTG  >= 150;
    const _tgVeryHigh= _labTG > 0  && _labTG  >= 500;
    const _ldlHigh   = _labLDL > 0 && _labLDL >= 130;
    const _hdlLow    = _labHDL > 0 && (_labHDL < 40 || (_labHDL < 50 && sex === 'female'));
    const _crpHigh   = _labCRP > 0 && _labCRP >= 2;
    const _bpHigh    = _labBP  > 0 && _labBP  >= 130;
    const _obese     = _cvdBMI >= 30;
    const _overweight= _cvdBMI >= 25;

    // ── Auto-generate CVD Nutrition Prescription rows ──────────────
    const _cvdRows = [
      ['Saturated Fat Target',    'c-r', '<5–6% total kcal (' + Math.round(energy * 0.055 / 9) + '–' + Math.round(energy * 0.06 / 9) + ' g/day)'],
      ['Trans Fat',               'c-r', 'Eliminate completely — no safe level (raises LDL, lowers HDL)'],
      ['Total Fat Type',          '',    'Replace SFA with MUFA (olive oil, avocado, nuts) + PUFA (omega-3, sunflower)'],
      ['Soluble Fibre Target',    'c-t', '25–30 g/day total · 10–25 g soluble (oats, psyllium, barley, legumes)'],
      ['Sodium Limit',            _bpHigh?'c-r':'', _bpHigh ? ' ≤1500 mg/day — BP elevated · DASH diet recommended' : '≤2400 mg/day (optimal: 1500 mg/day with hypertension)'],
      ['Omega-3 (EPA+DHA)',       'c-t', '≥2 servings fatty fish/week · Oily fish: salmon, sardines, mackerel, herring' + (_tgHigh ? ' · If TG elevated: 2–4 g/day supplement may be indicated' : '')],
      ['Plant Sterols/Stanols',   '',    '2 g/day (margarine, supplements) — reduces LDL by 5–15% additionally'],
      ['Dietary Pattern',         'c-t', ['ascvd','coronary_hd','cvd_high_risk','familial_hc'].includes(diagnosis) ? 'Mediterranean diet (primary recommendation) or DASH diet' : diagnosis==='hypertension' ? 'DASH diet (primary) — high fruit, veg, whole grain, low-fat dairy · Low sodium' : 'Mediterranean or DASH dietary pattern as framework'],
      ['Physical Activity',       'c-t', '≥150 min/week moderate-intensity OR ≥75 min/week vigorous aerobic activity'],
      ['Weight Goal',             _obese?'c-r':_overweight?'':'' , _obese ? ' Weight reduction priority — improves LDL, HDL, TG, BP, hs-CRP simultaneously' : _overweight ? 'Weight management recommended — target BMI <25 kg/m²' : 'Maintain healthy weight · BMI ' + bmi.toFixed(1) + ' kg/m²'],
    ];

    // ── Conditional triggers ───────────────────────────────────────
    const _cvdTriggers = [];
    if (_ldlHigh)  _cvdTriggers.push({ label:'↑ LDL → CVD Nutrition Intervention', cls:'c-r',
      action:'Aggressive SFA restriction (<5–6%E) · Soluble fiber ≥25 g/day · Plant sterols 2 g/day · Statin discussion indicated' });
    if (_tgVeryHigh) _cvdTriggers.push({ label:' TG ≥500 mg/dL — Pancreatitis Risk', cls:'c-r',
      action:'Fat restriction ≤15–20%E total · MCT oil substitution · Eliminate alcohol · Monitor for acute pancreatitis' });
    else if (_tgHigh) _cvdTriggers.push({ label:'↑ TG → Anti-TG Intervention', cls:'c-r',
      action:'Eliminate sugar-sweetened beverages + refined CHO · Omega-3 ≥2 g/day · Restrict alcohol · Weight loss' });
    if (_hdlLow)   _cvdTriggers.push({ label:'↓ HDL → HDL-Raising Strategies', cls:'c-r',
      action:'Aerobic exercise ≥150 min/week · Eliminate trans fat · Replace SFA with MUFA · Avoid very-low-fat diets' });
    if (_bpHigh)   _cvdTriggers.push({ label:'↑ BP → Add Sodium Restriction', cls:'c-r',
      action:'Na ≤1500 mg/day · DASH diet · Potassium-rich foods · Weight reduction · Limit alcohol' });
    if (_crpHigh)  _cvdTriggers.push({ label:'↑ hs-CRP → Anti-Inflammatory Diet', cls:'c-r',
      action:'Omega-3 (EPA+DHA) ≥2 g/day · Fiber ≥30 g/day · Mediterranean pattern · Reduce ultra-processed foods · Antioxidant-rich vegetables/fruits' });
    if (_obese)    _cvdTriggers.push({ label:'↑ BMI → Weight Reduction Plan', cls:'c-r',
      action:'Hypocaloric 500–750 kcal/day deficit · High-protein (≥1.2 g/kg IBW) to preserve lean mass · Mediterranean or DASH pattern · Exercise prescription' });

    // ── Auto-PES Statements ────────────────────────────────────────
    const _pesRows = [];
    if (_ldlHigh)  _pesRows.push('Excessive saturated fat intake (P) r/t dietary pattern AEB ↑ LDL (E→S)');
    if (_tgHigh)   _pesRows.push('Excessive simple carbohydrate / refined CHO intake (P) r/t dietary habits AEB ↑ TG (E→S)');
    if (_hdlLow)   _pesRows.push('Inadequate physical activity + unfavourable fat quality (P) AEB low HDL (E→S)');
    if (_bpHigh)   _pesRows.push('Excessive sodium intake (P) r/t diet AEB elevated BP (E→S)');
    if (_crpHigh)  _pesRows.push('Inadequate omega-3 / fibre intake (P) r/t dietary pattern AEB elevated hs-CRP (E→S)');
    if (_obese)    _pesRows.push('Overweight / obesity (P) r/t excess energy intake + inadequate activity AEB BMI ' + _cvdBMI.toFixed(1) + ' (E→S)');
    if (!_pesRows.length) _pesRows.push('No specific lab-triggered PES — apply standard CVD dietary modification per Krause 16th ed. Ch. 33');

    rMicros.innerHTML = `
      <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:#f97316;text-transform:uppercase;margin-bottom:10px">CVD Nutrition Prescription</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:var(--mono);font-size:11px;margin-bottom:14px">
        ${_cvdRows.map(([k,cls,v])=>`<div class="pi"><span class="k">${k}</span><span class="v ${cls}">${v}</span></div>`).join('')}
      </div>
      ${_cvdTriggers.length ? `
        <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--red);text-transform:uppercase;margin-bottom:8px">Lab-Triggered Interventions</div>
        <div style="display:grid;gap:6px;margin-bottom:14px">
          ${_cvdTriggers.map(t=>`
            <div style="background:rgba(255,64,96,.06);border:1px solid rgba(255,64,96,.25);border-radius:8px;padding:9px 12px">
              <div style="font-family:var(--cond);font-size:10px;font-weight:700;color:var(--red);margin-bottom:3px">${t.label}</div>
              <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.5">${t.action}</div>
            </div>`).join('')}
        </div>` : ''}
      <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:#ddeeff;text-transform:uppercase;margin-bottom:8px">Auto PES Statements</div>
      <div style="background:rgba(56,100,168,.08);border:1px solid rgba(56,100,168,.2);border-radius:8px;padding:10px 12px;margin-bottom:14px">
        ${_pesRows.map(p=>`<div style="font-family:var(--mono);font-size:9.5px;color:var(--text);line-height:1.7;border-bottom:1px solid rgba(56,100,168,.1);padding-bottom:4px;margin-bottom:4px">${p}</div>`).join('')}
      </div>
      <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:#ddeeff;text-transform:uppercase;margin-bottom:8px">Lifestyle Intervention Plan</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:var(--mono);font-size:11px">
        <div class="pi"><span class="k">Omega-3 Fatty Acids</span><span class="v c-t">${_tgHigh ? ' 2–4 g/day EPA+DHA (supplement) + oily fish ≥2×/week' : 'Oily fish ≥2 servings/week (salmon, sardines, mackerel)'}</span></div>
        <div class="pi"><span class="k">Dietary Fibre</span><span class="v c-t">${_ldlHigh ? '≥30 g/day — prioritise soluble fibre (psyllium, oats, legumes)' : '25–30 g/day total'}</span></div>
        <div class="pi"><span class="k">Plant Sterols</span><span class="v">${_ldlHigh ? '2–3 g/day (fortified margarine, supplements) — ↓ LDL 5–15%' : '2 g/day if LDL-lowering needed'}</span></div>
        <div class="pi"><span class="k">Potassium-rich Foods</span><span class="v ${_bpHigh?'c-t':''}">${_bpHigh ? ' Prioritise: banana, sweet potato, legumes, spinach, yoghurt (target 4700 mg/day)' : 'Encourage: fruits, vegetables, legumes, dairy'}</span></div>
        <div class="pi"><span class="k">Antioxidants</span><span class="v">${_crpHigh ? ' Increase: berries, dark vegetables, green tea, extra virgin olive oil (anti-inflammatory)' : 'Fruits, vegetables, EVOO, green tea — dietary sources'}</span></div>
        <div class="pi"><span class="k">Alcohol</span><span class="v ${_tgHigh?'c-r':''}">${_tgHigh ? ' AVOID — major TG-raising agent' : diagnosis==='hypertension' ? '≤1 drink/day (women) / ≤2/day (men)' : 'Limit to ≤1–2 drinks/day if at all'}</span></div>
        <div class="pi"><span class="k">Added Sugars / SSBs</span><span class="v c-r">${_tgHigh ? ' Eliminate — primary dietary driver of TG elevation' : 'Restrict: <10%E · No sugar-sweetened beverages'}</span></div>
        <div class="pi"><span class="k">Ultra-Processed Foods</span><span class="v c-r">Avoid — high SFA, trans fat, Na, added sugar simultaneously</span></div>
        <div class="pi"><span class="k">Exercise Rx</span><span class="v c-t">≥150 min/week moderate (brisk walk, swimming) or ≥75 min/week vigorous — ↑ HDL + ↓ TG + ↓ BP + weight management</span></div>
        <div class="pi"><span class="k">Source</span><span class="v" style="color:var(--text-dim)">Krause &amp; Mahan 16th ed. Ch. 33 (Kris-Etherton et al.) · AHA/ACC 2019 · JNC8 · IOM DRI</span></div>
      </div>`;
  } else {
    if (rMicros) rMicros.innerHTML = `
    <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:#ddeeff;text-transform:uppercase;margin-bottom:10px">Micronutrient Considerations</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:var(--mono);font-size:11px">
      <div class="pi"><span class="k">Thiamine (B1)</span><span class="v c-t">${isRefeeding?' IV 200–300 mg BEFORE feeds':diagnosis==='pernicious_anemia'?'Adequate — B12 & folate priority':'1–2 mg/day'}</span></div>
      <div class="pi"><span class="k">Iron</span><span class="v ${diagnosis==='iron_overload'?'c-r':diagnosis==='anemia_chronic_dis'?'c-r':diagnosis==='sickle_cell'?'c-r':diagnosis==='iron_def_anemia'?'c-t':''}">${
        diagnosis==='iron_def_anemia'?'120 mg elemental/day × 3–6 months (oral ferrous)':
        diagnosis==='iron_overload'?' AVOID iron supplements':
        diagnosis==='anemia_chronic_dis'?' Do NOT supplement iron (ACD)':
        diagnosis==='sickle_cell'?' No iron supplement (unless IDA confirmed)':
        diagnosis==='thalassemia'?'Non-transfused: low-iron diet; transfused: chelation':
        diagnosis==='sports_anemia'?'Supplement only if true IDA confirmed by labs':
        'Routine monitoring'}</span></div>
      <div class="pi"><span class="k">Folate / Folic acid</span><span class="v c-t">${
        diagnosis==='megaloblastic_folate'?'400–1000 mcg/day (+ rule out B12 deficiency)':
        diagnosis==='sickle_cell'?' 400–600 mcg/day (elevated RBC turnover)':
        diagnosis==='thalassemia'?'High folate diet essential (high RBC turnover)':
        diagnosis==='pernicious_anemia'?'400 mcg/day diet — Do NOT give folate alone without B12':
        diagnosis==='iron_def_anemia'?'400 mcg/day (RDA)':
        isRefeeding?'400 mcg/day':'400 mcg/day (RDA)'}</span></div>
      <div class="pi"><span class="k">Vitamin B12</span><span class="v">${
        diagnosis==='pernicious_anemia'?' IM/SC 100 mcg/week → monthly; or oral 1000 mcg/day':
        diagnosis==='megaloblastic_folate'?'Check serum B12 before treating folate deficiency':
        diagnosis==='sickle_cell'?'Monitor — homocysteine often elevated (low B6)':
        '2.4 mcg/day (RDA); check if vegan/elderly/metformin'}</span></div>
      <div class="pi"><span class="k">Vitamin C</span><span class="v ${diagnosis==='iron_overload'?'c-r':''}">${
        diagnosis==='burns'?'500–1000 mg/day':
        diagnosis==='iron_def_anemia'?'50–200 mg with each meal (enhances Fe absorption)':
        diagnosis==='iron_overload'?' AVOID — increases iron absorption':
        diagnosis==='sickle_cell'?'Dietary only; avoid supplements (increase iron absorption)':
        diagnosis==='thalassemia'?'From food only; avoid supplements above RDA':
        diagnosis==='anemia_chronic_dis'?'Dietary sources only; avoid high-dose supplements':
        '75–90 mg/day'}</span></div>
      <div class="pi"><span class="k">Zinc</span><span class="v">${
        diagnosis==='burns'?'220 mg/day (burns)':
        diagnosis==='sickle_cell'?' Supplement — plus RDA copper (zinc–copper competition)':
        diagnosis==='thalassemia'?'Supplement (growth support, immune function)':
        '2.5–5 mg/day'}</span></div>
      <div class="pi"><span class="k">Copper</span><span class="v">${
        diagnosis==='sickle_cell'?'At least RDA (zinc competes for Cu absorption sites)':
        '0.9 mg/day (RDA)'}</span></div>
      <div class="pi"><span class="k">Selenium</span><span class="v">${diagnosis==='sepsis'||diagnosis==='burns'?'500–1000 mcg/day':diagnosis==='thalassemia'?'Supplement (oxidative stress)':'20–70 mcg/day'}</span></div>
      <div class="pi"><span class="k">Vitamin D + Calcium</span><span class="v">${diagnosis==='thalassemia'||diagnosis==='sickle_cell'?' Supplement — bone health (marrow expansion / deficiency risk)':'Routine monitoring'}</span></div>
      <div class="pi"><span class="k">Pyridoxine (B6)</span><span class="v">${diagnosis==='sickle_cell'?'Monitor — low B6 associated with elevated homocysteine in SCD':'Routine monitoring'}</span></div>
      <div class="pi"><span class="k">Omega-3 / Fish oil</span><span class="v">${diagnosis==='ards'||diagnosis==='sepsis'?'1–2 g EPA/DHA/day — consider':diagnosis==='burns'||diagnosis==='cardiac'?'Recommended':diagnosis==='sickle_cell'?'Consider — anti-inflammatory (note: may enhance iron absorption in fish-based sources)':'Not routinely rec.'}</span></div>
      <div class="pi"><span class="k">Phosphate</span><span class="v">${isRefeeding?' Monitor closely + replace PRN':'Routine monitoring'}</span></div>
    </div>`;
  }

  // ── PROTEIN GUIDELINE + CLINICAL RELEVANCE PANEL ──────────────
  const proBreakdown = document.getElementById('r-protein-breakdown');
  const proNotes     = document.getElementById('r-protein-notes');
  if (proBreakdown) {
    // Show only the primary guideline authority (first segment before · or /)
    const primaryGuideline = pGuideline.split(/[·\/]/)[0].trim();
    const protPerKg = wCalc > 0 ? protein / wCalc : 0;
    const showProteinEnergyGuidance = protPerKg >= 1.5;
    const nonProtKcalCalc = energy > 0 && protein > 0 ? energy - (protein * 4) : null;
    proBreakdown.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;margin-bottom:10px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase">Applied Guideline</div>
        <div style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--teal)">${primaryGuideline}</div>
        <div style="font-family:var(--mono);font-size:10px;color:#ddeeff;margin-left:auto">Range: ${pRange}</div>
      </div>
      <div style="font-family:var(--mono);font-size:10px;color:#ddeeff;margin-bottom:${showProteinEnergyGuidance?'8px':'0'}">Basis: ${pBasis} (${pWt.toFixed(1)} kg)</div>
      ${showProteinEnergyGuidance ? `
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);border-left:2px solid rgba(96,165,250,0.4);padding-left:10px;line-height:1.7">
          <div>Ensure total energy intake is sufficient to support protein utilization and prevent use of protein for energy. Adjust total kcal to meet estimated energy requirements.</div>
          ${nonProtKcalCalc !== null && nonProtKcalCalc > 0 ? `<div style="margin-top:4px">Maintain adequate non-protein energy (from carbohydrates and fats) to support protein-sparing.</div>` : ''}
        </div>` : ''}`;
  }
  if (proNotes && pNotes) {
    proNotes.innerHTML = `<strong style="color:var(--blue);letter-spacing:1px">CLINICAL RELEVANCE:</strong> ${pNotes}`;
  }

  // ── ALERTS ─────────────────────────────────────────────────────
  let alerts='';
  if(rfRiskLevel==='HIGH')alerts+=`<div class="alert danger"><span class="ai"></span><div><strong>REFEEDING SYNDROME — HIGH RISK:</strong> Start ≤5 kcal/kg/day (${Math.round(5*wCalc)} kcal). IV Thiamine 200–300 mg BEFORE feeds. Electrolytes 2–3× daily. See Refeeding Panel below.</div></div>`;
  if(rfRiskLevel==='HIGH')alerts+=`<div class="alert danger" style="border-color:rgba(251,113,133,.5)"><span class="ai"></span><div><strong>REFEEDING ADVANCEMENT PROTOCOL (NICE CG32 2006):</strong><br>
    ▸ Day 1: ${Math.round(5*wCalc)} kcal/day (5 kcal/kg) — correct K⁺, PO₄, Mg²⁺ BEFORE starting<br>
    ▸ Day 2–3: ${Math.round(10*wCalc)} kcal/day (10 kcal/kg) — monitor electrolytes every 6–12h<br>
    ▸ Day 4–5: ${Math.round(15*wCalc)} kcal/day (15 kcal/kg) — continue daily electrolyte checks<br>
    ▸ Day 5–7: ${Math.round(Math.min(20*wCalc, energy))} kcal/day (full requirement) — only if electrolytes remain stable<br>
    IV Thiamine 200–300 mg must be given BEFORE any carbohydrate-containing feed is commenced.
  </div></div>`;
  else if(rfRiskLevel==='MODERATE')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>REFEEDING RISK — MODERATE:</strong> Start at 10 kcal/kg/day (${Math.round(10*wCalc)} kcal). Thiamine 100–200 mg/day × 10 days. Daily electrolytes × 5 days.</div></div>`;
  if(propofol>0)alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>Propofol Calories: ${Math.round(propofolKcal)} kcal/day</strong> (${propofol} mg/kg/hr × ${weight.toFixed(1)} kg × 24h × 1.1 kcal/mL). <strong>Adjusted Energy Target: ${Math.round(netEnergy)} kcal/day</strong> after subtracting propofol calories.</div></div>`;
  alerts+=`<div class="alert info"><span class="ai"></span><div><strong>Estimated Daily Fluid Need: ${fluidLow}–${fluidHigh} mL/day</strong> (25–30 mL/kg × ${weight.toFixed(1)} kg). Adjust for fluid status: ${fluidSt}.</div></div>`;
  if(icuPhase==='early')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>ICU Acute Phase (0–72 hours): Hypocaloric feeding with early protein delivery recommended.</strong> Initiate at 15–20 kcal/kg; advance to full target from Day 4 as tolerated (ASPEN/SCCM 2022 · ESPEN ICU 2019).</div></div>`;
  if(diagnosis==='burns'&&tbsa>0){
    const _burnEqName = {
      curreri:    'Curreri (1974)',
      toronto:    'Toronto (1992)',
      galveston:  'Galveston (1978)',
      davies:     'Davies & Liljedahl (1971)',
      iretojones: 'Ireton-Jones (1992)',
      espen:      'ESPEN Burns 2013 (Rousseau et al.)',
    };
    const _appliedEq = document.querySelector('input[name="burn_eq"]:checked')?.value || 'curreri';
    const _eqLabel   = _burnEqName[_appliedEq] || _appliedEq;
    alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>BURNS NUTRITION — ${_eqLabel} applied.</strong> Start EN within 6h. High-protein formula. Glutamine 0.3–0.5 g/kg/day. Vit C 500–1000 mg/day, Zinc 220 mg/day. Reassess energy needs every 24–48h.</div></div>`;
  }
  if(renal==='aki_no_rrt')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>AKI WITHOUT RRT (KDIGO):</strong> Protein 0.8–1.2 g/kg/day. Do NOT restrict protein to delay RRT. Renal formula. Monitor BUN, Cr, electrolytes closely.</div></div>`;
  if(renal==='aki_rrt')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>AKI ON CRRT/RRT (KDIGO):</strong> Target 1.5–2.5 g/kg/day. CRRT losses add ~10–15 g amino acids/day — factor into prescription.</div></div>`;
  if(lg&&lg>10)alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>HYPERGLYCAEMIA (${lg} mmol/L):</strong> Target 6.1–10.0 mmol/L (NICE-SUGAR). Insulin protocol + reassess CHO delivery.</div></div>`;
  if(hepatic==='severe')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>HEPATIC FAILURE (EASL/ESPEN):</strong> Do NOT restrict protein — worsens sarcopenia & encephalopathy. BCAA-enriched formula. Dry weight for calculations. Monitor ammonia.</div></div>`;
  // ── Diabetes MNT alerts (Krause & Mahan 16th ed., Ch. 30 · ADA 2024) ──
  if(diagnosis==='dm1'){alerts+=`<div class="alert info"><span class="ai"></span><div><strong>TYPE 1 DIABETES MELLITUS — MNT (Krause Ch. 30 · ADA 2024):</strong> Absolute insulin deficiency from autoimmune β-cell destruction. <strong>Insulin-to-CHO ratio:</strong> I:CR = 500 ÷ TDD (e.g., TDD 50 units → 1 unit covers 10 g CHO). Integrate insulin regimen with preferred eating schedule — do NOT restrict food to control glucose; adjust insulin instead. <strong>CHO counting:</strong> 1 serving = 15 g CHO; target 3–5 consistent meals/day. Low-GI foods preferred (GI <55); eliminate SSBs. <strong>Glycaemic targets:</strong> HbA1c <7% (<53 mmol/mol); pre-meal 4.4–7.2 mmol/L; peak post-meal <10 mmol/L. <strong>Protein:</strong> 1.0–1.5 g/kg/day (no restriction unless DKD confirmed by albuminuria). <strong>Hypoglycaemia (BG <3.9 mmol/L):</strong> treat with 15 g glucose tablets; recheck 10–15 min; repeat if still low. <strong>Sick-day:</strong> Do NOT stop insulin — need may increase. Target 150–200 g CHO/day (45–50 g q3–4h). Test ketones if BG >13.9 mmol/L. <strong>Exercise:</strong> +15 g CHO per 30–60 min moderate activity; reduce rapid-acting insulin 1–2 units if activity >45 min. Risk of late-onset hypoglycaemia 24–30h post-exercise. <strong>Screen for:</strong> Celiac disease (gluten-free diet if biopsy-confirmed), Hashimoto thyroiditis, Addison disease. <strong>Cardioprotective:</strong> ↓ SFA/TFA; ↑ MUFA/PUFA; fatty fish ≥2×/week; Na ≤2300 mg/day. Alcohol with food only — delayed nocturnal hypoglycaemia risk (Krause Ch. 30 / ADA 2021).</div></div>`;}
  if(diagnosis==='dm2'){alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>TYPE 2 DIABETES MELLITUS — MNT (Krause Ch. 30 · ADA 2024):</strong> Progressive insulin resistance + β-cell failure. MNT by RDN reduces HbA1c 0.3–2.0%. <strong>Weight:</strong> 5–10% weight loss (if BMI >25) → consistent A1C improvement; Mediterranean-style diet achieved −6.2 kg with A1C benefit. <strong>Eating patterns:</strong> Mediterranean, DASH, low-CHO, plant-based — all acceptable; individualise to metabolic goals, culture, and food security. <strong>CHO:</strong> Consistent daily total grams; low-GI sources; ≥25 g fibre/day (women) / ≥38 g/day (men) — soluble fibre ↓ LDL and FBG. Eliminate SSBs. No sucrose restriction required if total CHO budget respected. <strong>Protein:</strong> 1.0–1.5 g/kg/day; 20–30% kcal may increase satiety. Protein does not acutely raise BG in well-controlled T2DM. <strong>Fat:</strong> ↓ SFA/TFA; ↑ MUFA (Mediterranean pattern — olive oil, avocado, nuts); fatty fish ≥2×/week. No supplemental omega-3 for CVD prevention. <strong>Sodium:</strong> ≤2300 mg/day; further individualised reduction if hypertension. <strong>Dyslipidaemia:</strong> ↓ SFA/TFA; viscous fibre 25–30 g/day; plant sterols/stanols 2 g/day; omega-3 foods. <strong>Metformin monitoring:</strong> Check B12 annually (10–30% develop deficiency → peripheral neuropathy risk); supplement 1000 mcg/day if deficient. <strong>Hypoglycaemia (insulin/secretagogue):</strong> 15 g glucose; recheck 10–15 min. <strong>Gastroparesis (if present):</strong> Small frequent meals; low fat/fibre; semi-liquid or liquid if solids not tolerated; post-meal insulin timing adjustment. <strong>Exercise:</strong> ≥150 min/week moderate aerobic; resistance ×2/week; no >2 consecutive rest days. Source: Jones J, Krause & Mahan 16th ed. Ch. 30 · ADA 2024.</div></div>`;}
  if(diagnosis==='pregnancy_gest_dm'){alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>GESTATIONAL DIABETES MELLITUS — MNT (Krause Ch. 30 · ADA 2021):</strong> Diagnosis at 24–28 weeks gestation (1-step 75-g OGTT or 2-step 50-g screen + 100-g OGTT). <strong>CHO-controlled meal plan:</strong> Minimum 175 g CHO/day distributed across 3 small-moderate meals + 2–4 snacks. Avoid prolonged fasting (>10 h between bedtime snack and breakfast). <strong>Breakfast:</strong> Limit to ~30 g CHO — morning cortisol and growth hormone elevate AM insulin resistance most; add protein to breakfast for satiety without glucose spike. <strong>Late evening snack mandatory</strong> — prevents accelerated overnight ketosis. Monitor urine/blood ketones (ketonaemia associated with fetal brain injury). <strong>Blood glucose targets:</strong> Fasting <5.3 mmol/L (95 mg/dL) · 1-h post-meal <7.8 mmol/L (140 mg/dL) · 2-h post-meal <6.7 mmol/L (120 mg/dL) · HbA1c 6–6.5% (42–48 mmol/mol). <strong>Pharmacotherapy:</strong> Add insulin, metformin, or glyburide if BG exceeds targets on ≥2 occasions in 1–2 weeks without explanation. Insulin preferred — does not cross placenta. <strong>Exercise:</strong> Brisk 15–30 min walk after meals improves postprandial glucose; safe in uncomplicated pregnancy. <strong>Gestational weight gain:</strong> Same targets as non-diabetic pregnancy (IOM 2009); no intentional weight loss during pregnancy. <strong>Nutrients:</strong> Folate ≥600 mcg/day; Iron 27 mg/day; Calcium 1000 mg/day (DRI pregnancy). <strong>Postpartum:</strong> Screen at 4–12 weeks with 75-g OGTT; thereafter every 1–3 years for T2DM. Encourage breastfeeding — reduces future T2DM risk. Women with GDM history have 35–70% risk of T2DM within 10–15 years. Source: Jones J, Krause & Mahan 16th ed. Ch. 30 / ADA 2021 / IOM DRI.</div></div>`;}
  // ── Haematological alerts (Krause & Mahan 16th ed., Ch. 32) ──
  if(diagnosis==='iron_def_anemia')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>IRON DEFICIENCY ANEMIA (Krause Ch. 32):</strong> Priority — dietary iron enhancement. Heme iron (meat, fish, poultry, liver) ~15% absorbable; nonheme iron (legumes, veg) 3–8%. Include vitamin C at every meal. Separate tea, coffee, milk, high-fibre foods from iron-rich meals by ≥1 hour. Oral ferrous iron × 3–6 months (120 mg elemental/day adults). Continue 4–6 months after Hb normalises to replete stores. Coordinate with physician.</div></div>`;
  if(diagnosis==='megaloblastic_folate')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>FOLATE-DEFICIENCY ANEMIA (Krause Ch. 32):</strong>  Rule out B12 deficiency BEFORE treating — folate corrects the anemia but MASKS irreversible B12 neurologic damage. Folate RDA: 400 mcg/day (adults), 600 mcg/day (pregnancy). Fresh/raw fruits and dark green vegetables daily — heat destroys folate. Symptomatic improvement within 24–48h; full haematologic recovery ~1 month.</div></div>`;
  if(diagnosis==='pernicious_anemia')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>PERNICIOUS ANEMIA / B12 DEFICIENCY (Krause Ch. 32):</strong> B12 IM/SC 100 mcg weekly → monthly maintenance. Large oral B12 (1000 mcg/day) effective even without intrinsic factor (passive diffusion). High-protein diet (1.5 g/kg) for RBC regeneration. Check IF antibody (IFAB) + parietal cell antibodies (PCA). Metformin use: 10–30% have reduced B12 absorption — supplement. Age >50: crystalline B12 (fortified cereals or supplements) to bypass atrophic gastritis. RDA: 2.4 mcg/day.</div></div>`;
  if(diagnosis==='anemia_chronic_dis')alerts+=`<div class="alert danger"><span class="ai"></span><div><strong>ANEMIA OF CHRONIC DISEASE — DO NOT SUPPLEMENT IRON (Krause Ch. 32):</strong> Ferritin is normal or elevated; hepcidin traps iron in macrophages. Iron supplementation is inappropriate. Treat the underlying inflammatory/infectious disorder. Differentiate from IDA using soluble transferrin receptors (STFR): elevated in IDA, normal in ACD. ESAs or transfusion only in severe refractory cases.</div></div>`;
  if(diagnosis==='sickle_cell')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>SICKLE CELL DISEASE (Krause Ch. 32 / CDC 2020):</strong> High calorie + protein for hypermetabolism from haemolysis. Folate 400–600 mcg/day (elevated RBC turnover). Zinc supplement + copper (co-supplement — zinc competes for Cu absorption). Fluid 2–3 L/day + low-sodium diet. Multivitamin/mineral 50–150% RDA — NOT iron. Avoid iron-fortified foods, vitamin C supplements, and alcohol (all increase iron absorption). SCD ≠ IDA — do NOT supplement iron unless lab-confirmed.</div></div>`;
  if(diagnosis==='thalassemia')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>THALASSEMIA (Krause Ch. 32):</strong> NON-TRANSFUSED: moderately low-iron diet — limit red meat, iron-fortified foods; avoid multivitamins with iron or vitamin C above RDA. TRANSFUSED: chelation therapy (deferoxamine/deferasirox) required — no iron restriction needed. High folate, vitamins A, C, zinc, copper, selenium. Ca + Vit D for bone health. Increase calories to address growth impairment.</div></div>`;
  if(diagnosis==='iron_overload')alerts+=`<div class="alert danger"><span class="ai"></span><div><strong>IRON OVERLOAD / HEMOCHROMATOSIS (Krause Ch. 32 / NIDDK 2020):</strong>  AVOID: iron supplements, vitamin C supplements, iron-fortified foods, alcohol. Reduce meat, fish, poultry — plant-based diet preferred. Phytates (whole grains, legumes) inhibit iron absorption — beneficial. Medical treatment: weekly phlebotomy × 2–3 years; chelation if non-hereditary. Risk: hepatomegaly, diabetes, cardiac disease, colorectal cancer if untreated.</div></div>`;
  if(diagnosis==='sports_anemia')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>SPORTS ANEMIA — PHYSIOLOGIC (Krause Ch. 32):</strong> Hemodilution from aerobic training — ADVANTAGEOUS adaptation, does not impair performance. Do NOT supplement iron without confirmed IDA (CBC + ferritin + serum iron + TIBC + % saturation). Iron-rich diet + adequate protein. Separate inhibitors (tea, coffee, antacids, H2-blockers) from iron-rich meals. High-risk groups: females, vegetarians, endurance athletes — periodic monitoring.</div></div>`;

  // ── Lower GI / IBD alerts (Krause 16th Ch. 28 / ECCO-ESPEN IBD 2023) ──
  if(diagnosis==='constipation')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>CONSTIPATION — MNT (Krause 16th Ch. 28):</strong><br>
  • <strong>Fibre:</strong> Increase to 25–38 g/day gradually (to minimise bloating). Soluble fibre (oats, psyllium, legumes, fruit) softens stool; insoluble fibre (wholegrains, bran, vegetables) accelerates transit.<br>
  • <strong>Fluid:</strong> Minimum 2 L/day — fibre requires water to function; inadequate fluid worsens constipation.<br>
  • <strong>Physical activity:</strong> Regular aerobic activity stimulates colonic motility.<br>
  • <strong>Avoid:</strong> Excessive laxative dependence (impairs natural motility); very low calorie diets; highly refined low-fibre foods.<br>
  • <strong>Probiotics:</strong> Bifidobacterium lactis may modestly improve frequency (limited evidence).<br>
  • <em>Source: Krause & Mahan 16th ed., Ch. 28 (Mahan & Raymond, 2022)</em></div></div>`;

  if(diagnosis==='diarrhoea_acute')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>DIARRHOEA — MNT (WHO / Krause 16th Ch. 28):</strong><br>
  • <strong>ORS:</strong> Oral rehydration solution (Na 75 mmol/L, K 20 mmol/L, glucose 75 mmol/L, osmolarity 245 mOsm/L per WHO formula) — cornerstone of management.<br>
  • <strong>Fibre:</strong> Moderate soluble fibre (pectin, psyllium, banana, oats) absorbs water and bulks stool. Avoid insoluble fibre during acute phase.<br>
  • <strong>Avoid:</strong> Excess sugar alcohols (sorbitol, mannitol), fructose, lactose if intolerant — osmotic diarrhoea triggers.<br>
  • <strong>Probiotics:</strong> Lactobacillus rhamnosus GG and Saccharomyces boulardii reduce duration by ~1 day (evidence-based).<br>
  • <strong>Refeeding:</strong> Early refeeding preferred over prolonged gut rest — BRAT-plus (bananas, rice, applesauce, toast + lean protein, cooked vegetables).<br>
  • <strong>Electrolytes:</strong> Monitor Na, K, Mg, Zn — supplement as indicated.<br>
  • <em>Source: WHO ORS 2006; Krause & Mahan 16th ed., Ch. 28</em></div></div>`;

  if(diagnosis==='aad_cdiff')alerts+=`<div class="alert danger"><span class="ai"></span><div><strong>ANTIBIOTIC-ASSOCIATED DIARRHOEA / C. DIFFICILE — MNT (IDSA/SHEA CDI 2021):</strong><br>
  • <strong>Rehydration:</strong> Aggressive fluid + electrolyte replacement (ORS or IV). Monitor Na, K, Mg, Cl.<br>
  • <strong>Probiotics:</strong> Saccharomyces boulardii most evidence for AAD prevention; Lactobacillus cautiously in immunocompetent patients. Do NOT use probiotics in severely immunocompromised.<br>
  • <strong>FMT (Faecal Microbiota Transplant):</strong> Recommended for ≥2 CDI recurrences — highly effective (~90% cure rate). Route: colonoscopy, nasojejunal, or capsule.<br>
  • <strong>Nutrition support:</strong> EN/PN if severe prolonged NPO, weight loss >10%, or surgical intervention required. High protein (1.2–1.5 g/kg) for tissue repair.<br>
  • <strong>Avoid:</strong> High-sugar diet (feeds C. difficile), prolonged gut rest, unnecessary antibiotics.<br>
  • <em>Source: IDSA/SHEA CDI Guidelines 2021; McDonald et al. Clin Infect Dis 2018;66(7):e1–e48</em></div></div>`;

  if(diagnosis==='coeliac')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>COELIAC DISEASE — MNT (ESPGHAN 2020 / BSG 2014):</strong><br>
  • <strong>Gluten-free diet (GFD):</strong> Strict lifelong elimination of wheat, rye, barley, and contaminated oats. No safe threshold — even trace amounts cause mucosal damage.<br>
  • <strong>Cross-contamination:</strong> Separate utensils, toasters, cutting boards. Dedicated GF cooking surfaces. Scrutinise food labels — hidden gluten in sauces, medications, supplements.<br>
  • <strong>Micronutrient supplementation:</strong> Iron (IDA very common — screen ferritin), Calcium 1000–1200 mg/day, Vitamin D 1000–2000 IU/day, folate, B12, zinc, magnesium.<br>
  • <strong>Temporary:</strong> Low-lactose and/or low-FODMAP diet during initial GFD if symptomatic (secondary lactase deficiency and FODMAP sensitivity common at diagnosis).<br>
  • <strong>Monitoring:</strong> TTG-IgA annually for GFD adherence. DXA bone density if prolonged symptoms. Dietitian review every 6–12 months.<br>
  • <strong>Refractory CD:</strong> If no mucosal recovery on strict GFD × 12 months → investigate RCD type I/II (specialist gastroenterology).<br>
  • <em>Source: ESPGHAN/NASPGHAN Coeliac Guidelines 2020; BSG Adult Coeliac 2014; Husby et al., J Pediatr Gastroenterol Nutr 2020</em></div></div>`;

  if(diagnosis==='lactose_intolerance')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>LACTOSE INTOLERANCE — MNT (Krause 16th Ch. 28 / NIH Consensus):</strong><br>
  • <strong>Threshold:</strong> Most individuals tolerate 12 g lactose/day (≈240 mL cow's milk) without symptoms. Restrict according to individual tolerance — not universal elimination.<br>
  • <strong>Lactose-free dairy:</strong> Equivalent nutritional value (calcium, protein, Vit D). Preferred over complete dairy elimination.<br>
  • <strong>Better-tolerated options:</strong> Hard aged cheeses (cheddar, parmesan — <1 g lactose/serving), yoghurt with live cultures (lactase from bacteria).<br>
  • <strong>Lactase enzyme:</strong> Lactase drops/tablets at point of consumption effective for most patients.<br>
  • <strong>Calcium + Vitamin D:</strong> Ensure 1000–1200 mg Ca/day + 600–800 IU Vit D/day from fortified plant milks, leafy greens, tinned fish with bones, supplements.<br>
  • <strong>Do not:</strong> Routinely eliminate ALL dairy — increases osteoporosis risk unnecessarily.<br>
  • <em>Source: Krause & Mahan 16th ed., Ch. 28; NIH Consensus Development Conference 2010</em></div></div>`;

  if(diagnosis==='ibs')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>IRRITABLE BOWEL SYNDROME — MNT (NICE IBS 2017 / Monash FODMAP):</strong><br>
  • <strong>Low-FODMAP diet:</strong> Phase 1 — Eliminate fermentable oligosaccharides (fructans, GOS), disaccharides (lactose), monosaccharides (excess fructose), polyols (sorbitol, mannitol, xylitol) × 4–8 weeks. Phase 2 — Systematic reintroduction of each FODMAP subgroup to identify individual triggers. Phase 3 — Long-term personalised diet.<br>
  • <strong>Probiotics:</strong> Bifidobacterium infantis 35624 and Lactobacillus rhamnosus GG show benefit for IBS-D. Symptom-specific selection. Trial for ≥4 weeks.<br>
  • <strong>Fibre:</strong> Soluble fibre (psyllium, oats) preferred over insoluble (bran) — bran may worsen bloating/pain. Adequate fluid with fibre essential.<br>
  • <strong>Eating pattern:</strong> Small regular meals, avoid large meals, chew thoroughly, sit upright. Reduce carbonated drinks, alcohol, caffeine, high-fat foods.<br>
  • <strong>Psychological:</strong> Stress reduction, gut-directed hypnotherapy, CBT — comparable efficacy to low-FODMAP in some trials.<br>
  • <strong>IBS-C:</strong> Psyllium, lactulose, PEG laxatives. <strong>IBS-D:</strong> Loperamide, peppermint oil capsules.<br>
  • <em>Source: NICE CG61 IBS 2017; Monash University FODMAP; Gibson PR & Shepherd SJ, Gastroenterology 2010</em></div></div>`;

  if(diagnosis==='sibo')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>SMALL INTESTINAL BACTERIAL OVERGROWTH — MNT (ACG SIBO 2020):</strong><br>
  • <strong>Low-FODMAP diet:</strong> Reduces fermentable substrate for bacteria — relieves bloating, distension, diarrhoea during active SIBO and post-treatment maintenance.<br>
  • <strong>Antibiotic therapy:</strong> Rifaximin 550 mg TID × 14 days — evidence-based, minimal systemic absorption, low resistance risk. Alternatives: metronidazole, tetracycline, co-amoxiclav.<br>
  • <strong>Elemental diet:</strong> 2–3 weeks of elemental/semi-elemental formula (Vivonex, Tolerex) in severe/refractory cases — reduces bacterial load via substrate deprivation. Equivalent efficacy to antibiotics in some studies.<br>
  • <strong>Micronutrient supplementation:</strong> B12 (bacteria consume cobalamin — monitor serum B12), fat-soluble vitamins A, D, E, K if fat malabsorption, iron (avoid if bacterial overgrowth worsens with iron).<br>
  • <strong>Digestive enzymes:</strong> If concurrent exocrine pancreatic insufficiency (EPI) — PERT (pancreatic enzyme replacement therapy).<br>
  • <strong>Address underlying cause:</strong> Motility disorders (prokinetics — erythromycin, prucalopride), anatomical abnormality (surgical review), hypochlorhydria (review PPIs).<br>
  • <em>Source: ACG SIBO Clinical Guideline 2020; Pimentel M et al., Am J Gastroenterol 2020;115(2):165–178</em></div></div>`;

  if(diagnosis==='ibd')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>IBD (GENERAL) — MNT (ECCO/ESPEN IBD 2023):</strong><br>
  • Individualised dietary approach — no universal IBD diet. Screen with MUST/NRS-2002 at every visit.<br>
  • Supplement: Iron (IV preferred if Hb <100 g/L or oral intolerance), Folate, B12, Vit D 1000–2000 IU/day, Calcium, Zinc, Magnesium.<br>
  • EN preferred over PN. PN only if gut failure, obstruction, or EN contraindicated.<br>
  • Omega-3 supplementation: anti-inflammatory potential — not definitive for remission maintenance but generally safe.<br>
  • <em>Source: ECCO/ESPEN IBD Clinical Guidelines 2023 (Bischoff et al., Clin Nutr 2023;42:1705–1784)</em></div></div>`;

  if(diagnosis==='crohns')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>CROHN'S DISEASE — MNT (ECCO/ESPEN IBD 2023):</strong><br>
  • <strong>Fibre:</strong> Low-residue / low-fibre (<10 g/day) during active flares or with strictures. Liberalise in remission. Avoid high-fibre foods if small bowel stricture present.<br>
  • <strong>Enteral Nutrition:</strong> EN preferred over PN wherever bowel is functional. Exclusive enteral nutrition (EEN) induces remission in paediatric CD (~80% remission rate) — consider in adults where steroid avoidance desired. Semi-elemental or polymeric formula — comparable efficacy.<br>
  • <strong>PN indications:</strong> Complete bowel obstruction, high-output fistula, short bowel, severe active CD where EN is not feasible.<br>
  • <strong>Micronutrients — monitor and supplement:</strong><br>
  &nbsp;&nbsp;— B12: supplement if terminal ileum disease or resection (Schilling test or serum B12)<br>
  &nbsp;&nbsp;— Fat-soluble vitamins A, D, E, K: supplement if steatorrhoea<br>
  &nbsp;&nbsp;— Iron: IV preferred (IDA common from bleeding + malabsorption)<br>
  &nbsp;&nbsp;— Folate: supplement if on methotrexate (5 mg/week)<br>
  &nbsp;&nbsp;— Zinc 25 mg/day (stool losses), Magnesium (ileal disease)<br>
  &nbsp;&nbsp;— Vit D 1000–2000 IU/day (disease activity ↑ requirements)<br>
  • <strong>Osteoporosis risk:</strong> Steroids + malabsorption — Ca 1200 mg + Vit D 1000–2000 IU/day + DXA monitoring.<br>
  • <em>Source: ECCO/ESPEN IBD 2023; Bischoff et al., Clin Nutr 2023;42:1705–1784</em></div></div>`;

  if(diagnosis==='uc')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>ULCERATIVE COLITIS — MNT (ECCO/ESPEN IBD 2023):</strong><br>
  • <strong>During flares:</strong> Maintain nutrition — no routine dietary restriction. Low-fibre diet if cramping severe; liquid diet or EN if very active. Do NOT fast unnecessarily.<br>
  • <strong>Hydration:</strong> Critical during active disease — high stool water/electrolyte losses (Na, K, Mg, Cl).<br>
  • <strong>Probiotics:</strong> VSL#3 (multi-strain: 8 species) has strongest evidence for UC remission maintenance and prevention of pouchitis (post-colectomy IPAA). Escherichia coli Nissle 1917 — equivalent to mesalazine for UC remission maintenance.<br>
  • <strong>Severe/toxic megacolon:</strong> NPO + TPN during acute surgical emergency.<br>
  • <strong>Micronutrients:</strong> Iron (IV preferred — chronic bleeding losses; oral iron poorly tolerated in active UC and may worsen mucosal inflammation), Folate (sulfasalazine antagonises folate — 1 mg/day supplement), Vit D 1000 IU/day, Ca 1200 mg/day.<br>
  • <strong>Post-colectomy (IPAA):</strong> Low-fibre initially; high fluid intake; avoid high-output foods (raw vegetables, fruits, spicy food) initially then liberalise. Monitor B12, fat-soluble vitamins.<br>
  • <em>Source: ECCO/ESPEN IBD 2023; Bischoff et al., Clin Nutr 2023;42:1705–1784</em></div></div>`;

  if(diagnosis==='diverticulosis')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>DIVERTICULOSIS — MNT (ACG 2021 / Krause 16th Ch. 28):</strong><br>
  • <strong>High-fibre diet:</strong> ≥25–38 g/day increases stool bulk and reduces intraluminal colonic pressure — primary strategy to prevent diverticulitis formation and progression.<br>
  • <strong>Fluid:</strong> ≥2 L/day — essential for fibre to function effectively.<br>
  • <strong>Nuts, seeds, popcorn:</strong> No evidence to avoid — historical advice now explicitly refuted by ACG 2021. A prospective study (HSPH) found higher nut/popcorn consumption REDUCED diverticulitis risk.<br>
  • <strong>Red meat:</strong> Epidemiological association with diverticulitis risk — consider limiting to <3 servings/week; replace with fish, poultry, legumes.<br>
  • <strong>Physical activity:</strong> Regular aerobic exercise reduces diverticulitis risk.<br>
  • <strong>Obesity/constipation:</strong> Both independently increase risk — weight management and bowel habit regularity are key preventive strategies.<br>
  • <em>Source: ACG Diverticular Disease Guidelines 2021; Strate LL et al., Gastroenterology 2021;160:1099–1149</em></div></div>`;

  if(diagnosis==='diverticulitis')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>ACUTE DIVERTICULITIS — MNT (ACG 2021 / NICE 2019):</strong><br>
  • <strong>Acute phase (mild, outpatient):</strong> Clear liquid diet or low-fibre diet (<10 g/day) for 2–4 days based on symptom severity. Oral antibiotics per local protocol. IV fluids if admitted.<br>
  • <strong>Severe (hospitalised):</strong> NPO + IV fluids ± bowel rest. IV antibiotics. PN only if prolonged NPO (>5–7 days) or post-surgical.<br>
  • <strong>Perforation/peritonitis:</strong> NPO + surgical emergency. Post-op EN when bowel function returns.<br>
  • <strong>Recovery phase:</strong> Gradually reintroduce low-fibre foods over 2–4 weeks. Return to high-fibre diet (≥25 g/day) after 4–6 weeks to prevent recurrence.<br>
  • <strong>Long-term:</strong> High-fibre diet is protective against recurrence. Avoid NSAIDs and opiates (increase diverticulitis risk). Weight loss if obese.<br>
  • <strong>Elective surgery:</strong> Consider after ≥2 recurrent attacks — peri-operative nutrition per ESPEN Surgery 2021 guidelines.<br>
  • <em>Source: ACG Diverticular Disease 2021; NICE NG147 2019; Strate LL et al., Gastroenterology 2021</em></div></div>`;

  if(diagnosis==='microscopic_colitis')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>MICROSCOPIC COLITIS — MNT (AGA 2016 / ESPEN IBD):</strong><br>
  • <strong>Diagnosis:</strong> Chronic watery, non-bloody diarrhoea with normal colonoscopy appearance — confirmed by colonic biopsy (collagenous or lymphocytic colitis).<br>
  • <strong>Trigger elimination:</strong> NSAIDs (especially diclofenac, ibuprofen, naproxen — strongest association), PPIs (omeprazole, lansoprazole), SSRIs (sertraline, paroxetine), metformin, statins — review all medications systematically.<br>
  • <strong>Dietary triggers:</strong> Caffeine, alcohol, smoking — avoid or eliminate. Lactose-free trial if lactase deficiency suspected. FODMAP assessment if IBS-like symptoms co-exist.<br>
  • <strong>Hydration + nutrition:</strong> Adequate fluid + electrolyte replacement (chronic diarrhoea causes significant losses). Maintain macronutrient intake — avoid unnecessary restriction.<br>
  • <strong>Pharmacotherapy:</strong> Budesonide 9 mg/day × 8 weeks — first-line (Grade A recommendation). Cholestyramine if bile acid malabsorption co-exists. Bismuth subsalicylate for mild cases.<br>
  • <strong>Monitoring:</strong> Weight, electrolytes, albumin, Vit D, bone density (chronic steroid use increases osteoporosis risk).<br>
  • <em>Source: AGA Technical Review Microscopic Colitis 2016; Miehlke S et al., United European Gastroenterol J 2021;9(3):283–354</em></div></div>`;

  if(diagnosis==='colostomy')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>COLOSTOMY — MNT (ESPEN / Krause 16th Ch. 28):</strong><br>
  • <strong>Early post-op (6–8 weeks):</strong> Low-fibre diet initially — avoid high-fibre, high-residue foods to reduce stoma output and risk of blockage. Then gradually increase fibre as tolerated.<br>
  • <strong>Fluid:</strong> Adequate hydration — colostomy output is more formed than ileostomy; electrolyte losses less extreme but still require monitoring.<br>
  • <strong>Gas-forming foods:</strong> Trial elimination if problematic — cabbage, onions, beans, carbonated drinks. Highly individual.<br>
  • <strong>Odour-causing foods:</strong> Eggs, fish, onions, garlic — chewing thoroughly and eating regularly reduces odour.<br>
  • <strong>Output consistency:</strong> Aim for formed stool. Monitor for constipation (low fibre/fluid) or loose output (dietary triggers, infection).<br>
  • <strong>Long-term:</strong> Return to a balanced, varied diet. No absolute exclusions after initial recovery period. Regular dietitian review for individualisation.<br>
  • <em>Source: ESPEN Guidelines; Krause & Mahan 16th ed., Ch. 28; United Ostomy Associations of America (UOAA) Nutrition Guide</em></div></div>`;

  document.getElementById('alerts-box').innerHTML=alerts;

  // ── NutriCDE — Run All Modules ──────────────────────────
  try {
    const _cdeCurrentDay = 1;
    const _cdeLabs = {
      albumin:    parseFloat(document.getElementById('la')?.value)       || null,
      prealbumin: parseFloat(document.getElementById('al-pre')?.value)   || null, // g/L — Nutritional Biomarkers field
      crp:        parseFloat(document.getElementById('lab-crp')?.value)  || null,
      glucose:    lg || null,
      phosphate:  lp || null,
      potassium:  lk || null,
      magnesium:  lm || null,
    };
    const _cdeFluidMl = (fluidLow + fluidHigh) / 2;
    const _isCDEIcu   = ['icu_critical','sepsis','septic_shock','trauma','ards','burns','multiorgan_failure','post_cardiac_arrest'].includes(diagnosis);
    const _cdeParams  = {
      energy, protein, weight, ibw, bmi, bmiCat, route, renal, hepatic,
      isRefeeding, rfRiskLevel, labs: _cdeLabs, fluidMl: _cdeFluidMl,
      phase: icuPhase, isICU: _isCDEIcu, dx: diagnosis, netEnergy,
      tbsa, icuPhase, diagText, age, sex
    };
    NutriCDE.runAll(_cdeParams);
  } catch(e) { console.warn('NutriCDE error:', e); }

  // ── AMPATH LAB INTERPRETATION ──────────────────────────────
  const lna   = parseFloat(document.getElementById('lna')?.value)  || null;
  const lca   = parseFloat(document.getElementById('lca')?.value)  || null;
  const lcl   = parseFloat(document.getElementById('lcl')?.value)  || null;
  const ltransferrin = parseFloat(document.getElementById('ltransferrin')?.value) || null;
  const lwbc  = parseFloat(document.getElementById('lwbc')?.value) || null;
  const legfr = parseFloat(document.getElementById('legfr')?.value)|| null;
  const lalt  = parseFloat(document.getElementById('lalt')?.value) || null;
  const last  = parseFloat(document.getElementById('last')?.value) || null;
  const lalp  = parseFloat(document.getElementById('lalp')?.value) || null;
  const lbili = parseFloat(document.getElementById('lbili')?.value)|| null;
  const lhba1c= parseFloat(document.getElementById('lhba1c')?.value)||null;
  const ltrig = parseFloat(document.getElementById('ltrig')?.value)|| null;
  const lchol = parseFloat(document.getElementById('lchol')?.value)|| null;
  const linr  = parseFloat(document.getElementById('linr')?.value) || null;
  const lhb   = parseFloat(document.getElementById('al-hb')?.value)|| null;
  const lcrp  = parseFloat(document.getElementById('al-crp')?.value)||null;
  const lpre  = parseFloat(document.getElementById('al-pre')?.value)||null;
  const lurea = parseFloat(document.getElementById('al-urea')?.value)||null;
  // New FBC fields
  const lplatelets = parseFloat(document.getElementById('lplatelets')?.value)||null;
  const lmcv  = parseFloat(document.getElementById('lmcv')?.value) || null;
  const lneut = parseFloat(document.getElementById('lneut')?.value)|| null;

  // sex for Hb reference
  const hbLo = sex==='female' ? 12.0 : 13.0;
  const hbHi = sex==='female' ? 16.0 : 17.0;

  const labRows = [];
  // FBC
  if(lhb)  labRows.push({g:'FBC',         n:`Haemoglobin (Hb) [${sex==='female'?'F':'M'}]`,v:lhb,lo:hbLo,hi:hbHi,u:'g/dL',note:lhb<hbLo?'Anaemia — assess iron/folate/B12, nutritional intake':lhb>hbHi?'Polycythaemia':'Normal'});
  if(lwbc)  labRows.push({g:'FBC',         n:'WBC (White Cell Count)',     v:lwbc, lo:4.0, hi:11.0,  u:'×10⁹/L', note: lwbc>12?'Leukocytosis — infection/inflammation; metabolic rate ↑': lwbc<4.0?' Leucopaenia — immunocompromised; neutropenic diet precautions':'Normal'});
  if(lneut) labRows.push({g:'FBC',         n:'Neutrophils',                v:lneut,lo:2.0, hi:7.5,   u:'×10⁹/L', note: lneut<0.5?' Severe neutropaenia — neutropenic diet; strict food safety':lneut<2.0?'Neutropaenia — infection risk elevated':'Normal'});
  if(lplatelets) labRows.push({g:'FBC',    n:'Platelets',                  v:lplatelets,lo:150,hi:400,u:'×10⁹/L',note: lplatelets<50?' Severe thrombocytopaenia — risk of bleeding; monitor in refeeding': lplatelets<150?'Thrombocytopaenia — sepsis, malaria, liver failure, HIV':lplatelets>400?'Reactive thrombocytosis — infection/inflammation':'Normal'});
  if(lmcv)  labRows.push({g:'FBC',         n:'MCV (Mean Cell Volume)',     v:lmcv, lo:80,  hi:100,   u:'fL',      note: lmcv<80?'Microcytosis — iron deficiency, thalassaemia; iron-rich foods': lmcv>100?'Macrocytosis — B12/folate deficiency; supplement':'Normal'});
  if(lcrp)  labRows.push({g:'FBC',         n:'CRP (C-reactive protein)',   v:lcrp, lo:0,   hi:5,     u:'mg/L',    note: lcrp>100?'Severe inflammation — nutritional biomarkers unreliable; prioritise clinical assessment': lcrp>10?'Elevated — caution interpreting albumin/pre-albumin':'Within range'});
  // Electrolytes
  if(lk)   labRows.push({g:'Electrolytes', n:'Potassium (K⁺)',       v:lk,   lo:3.5,  hi:5.0,   u:'mmol/L',  note: lk<3.5?' Replace IV/oral before feeding (risk refeeding)': lk>5.5?' Hyperkalaemia — restrict K⁺, reassess intake':'Within range'});
  if(lp)   labRows.push({g:'Electrolytes', n:'Phosphate (PO₄)',      v:lp,   lo:0.75, hi:1.50,  u:'mmol/L',  note: lp<0.75?' REPLACE BEFORE FEEDING — high refeeding risk': lp<1.0?'Borderline low — monitor q12h': lp>1.50?'Hyperphosphataemia — reduce phosphate intake':'Within range'});
  if(lm)   labRows.push({g:'Electrolytes', n:'Magnesium (Mg²⁺)',     v:lm,   lo:0.70, hi:1.05,  u:'mmol/L',  note: lm<0.70?' Replace IV (MgSO₄ 1–2g IV)': lm>1.05?'Hypermagnesaemia':'Within range'});
  if(lna)  labRows.push({g:'Electrolytes', n:'Sodium (Na⁺)',         v:lna,  lo:136,  hi:145,   u:'mmol/L',  note: lna<130?' Severe hyponatraemia — fluid restrict; cautious correction': lna<136?'Hyponatraemia — assess volume status': lna>150?' Hypernatraemia — free water deficit; assess fluid need':'Within range'});
  if(lca)  labRows.push({g:'Electrolytes', n:'Calcium (Ca²⁺ total)', v:lca,  lo:2.15, hi:2.55,  u:'mmol/L',  note: lca<2.15?'Hypocalcaemia — supplement Ca, check Mg/Vit D': lca>2.55?'Hypercalcaemia — limit Ca intake, hydration':'Within range'});
  if(lcl)  labRows.push({g:'Electrolytes', n:'Chloride (Cl⁻)',       v:lcl,  lo:98,   hi:106,   u:'mmol/L',  note: lcl<98?'Hypochloraemia — ?vomiting, NG losses': lcl>106?'Hyperchloraemia — monitor acid-base':'Within range'});
  // Nutritional biomarkers
  if(la)   labRows.push({g:'Nutrition',    n:'Albumin',               v:la,   lo:35,   hi:52,    u:'g/L',     note: la<20?'Severe hypoalbuminaemia — not reliable marker acutely; reflect protein reserves': la<35?'Low — malnutrition or acute phase response': la>52?'Above range — check hydration':'Within normal range (poor acute marker)'});
  if(lpre) labRows.push({g:'Nutrition',    n:'Pre-albumin (Transthyretin)',v:lpre,lo:0.20,hi:0.40,u:'g/L',  note: lpre<0.10?'Severe depletion — poor short-term nutritional status': lpre<0.20?'Low — assess nutritional intake adequacy':'Adequate short-term nutritional marker'});
  if(ltransferrin) labRows.push({g:'Nutrition', n:'Transferrin',      v:ltransferrin,lo:2.0,hi:3.6,u:'g/L', note: ltransferrin<2.0?'Low — malnutrition or anaemia of chronic disease': ltransferrin>3.6?'High — iron deficiency anaemia?':'Within range'});
  // Metabolic
  if(lg)   labRows.push({g:'Metabolic',    n:'Blood Glucose',         v:lg,   lo:3.9,  hi:10.0,  u:'mmol/L',  note: lg<3.9?' HYPOGLYCAEMIA — treat urgently; hold insulin; check dextrose': lg>10?' Hyperglycaemia — target 6.1–10.0 mmol/L (NICE-SUGAR); insulin protocol':'ICU glycaemic target met'});
  if(lhba1c)labRows.push({g:'Metabolic',   n:'HbA1c',                 v:lhba1c,lo:4.0,hi:5.6,   u:'%',       note: lhba1c>10?'Poor long-term control — adjust CHO target, diabetic formula': lhba1c>6.5?'Diagnosed DM — monitor BGL closely, target 6.1–10 mmol/L': lhba1c>5.7?'Pre-diabetic — low-GI diet, portion control':'Normal'});
  if(ltrig) labRows.push({g:'Metabolic',   n:'Triglycerides',         v:ltrig,lo:0,   hi:1.7,   u:'mmol/L',  note: ltrig>5.6?' Severe hypertriglyceridaemia — withhold lipid-based feeds (propofol, lipid PN)': ltrig>2.3?'Elevated — reduce fat intake, avoid lipid PN overload':'Acceptable for lipid feeding'});
  if(lchol) labRows.push({g:'Metabolic',   n:'Total Cholesterol',     v:lchol,lo:0,   hi:5.2,   u:'mmol/L',  note: lchol<2.0?'Very low — malnutrition marker, refeeding risk': lchol>6.2?'High — low saturated fat diet recommended':'Within target'});
  // Renal
  if(lc)   labRows.push({g:'Renal',        n:'Creatinine',            v:lc,   lo:60,  hi:120,   u:'µmol/L',  note: lc>500?'Severe renal failure — protein restriction, renal formula, RRT consideration': lc>120?'Elevated — assess AKI stage (KDIGO), adjust protein':'Normal renal function'});
  if(legfr) labRows.push({g:'Renal',       n:'eGFR',                  v:legfr,lo:60,  hi:120,   u:'mL/min',  note: legfr<15?'Stage 5 CKD — renal formula, specialist dietitian': legfr<30?'Stage 4 CKD — protein 0.6–0.8 g/kg IBW, restrict K/P/Na': legfr<60?'Stage 3 CKD — monitor protein, electrolytes':'Normal'});
  if(lurea) labRows.push({g:'Renal',       n:'Urea',                  v:lurea,lo:2.5, hi:7.5,   u:'mmol/L',  note: lurea>20?'Elevated — high protein catabolism or GI bleed; review protein target': lurea<2.5?'Low — ?liver disease, low protein intake':'Within range'});
  // Hepatic
  if(lalt)  labRows.push({g:'Hepatic / LFT', n:'ALT',                   v:lalt, lo:7,   hi:56,    u:'U/L',     note: lalt>200?' Significant hepatocellular damage — review EN tolerance, LFT trend': lalt>56?'Elevated — consider BCAA formula if hepatic failure':'Normal'});
  if(last)  labRows.push({g:'Hepatic / LFT', n:'AST',                   v:last, lo:10,  hi:40,    u:'U/L',     note: last>120?' Significant hepatic damage — monitor LFT trend, review EN formula': last>40?'Elevated — monitor LFT trend':'Normal'});
  if(lalp)  labRows.push({g:'Hepatic / LFT', n:'ALP',                   v:lalp, lo:44,  hi:147,   u:'U/L',     note: lalp>300?'Markedly elevated — ?cholestasis; restrict fat, consider MCT oil': lalp>147?'Elevated — cholestasis/bone disease':'Normal'});
  if(lbili) labRows.push({g:'Hepatic / LFT', n:'Total Bilirubin',       v:lbili,lo:3,   hi:21,    u:'µmol/L',  note: lbili>100?' Severe cholestasis — fat-restricted diet, fat-soluble vitamin supplementation': lbili>21?'Elevated — monitor liver function, assess EN formula fat content':'Normal'});
  if(linr)  labRows.push({g:'Hepatic / LFT', n:'INR',                   v:linr, lo:0.8, hi:1.2,   u:'ratio',   note: linr>2.5?' Severely impaired coagulation — Vit K, FFP; severe liver disease': linr>1.5?'Elevated — fat-soluble vitamin deficiency possible; supplement Vit K':'Normal'});

  const labCard=document.getElementById('r-lab-card');
  if(labRows.length){
    labCard.style.display='';
    // Group by category
    const groups = {};
    labRows.forEach(r => { if(!groups[r.g]) groups[r.g]=[];  groups[r.g].push(r); });
    const groupColors = {FBC:'var(--green)',Electrolytes:'var(--teal)',Nutrition:'var(--blue)',Metabolic:'var(--amber)',Renal:'var(--purple)','Hepatic / LFT':'#ff9f43'};
    document.getElementById('r-labs').innerHTML = Object.entries(groups).map(([grp, rows]) =>
      `<tr><td colspan="5" style="background:rgba(0,0,0,.15);padding:6px 14px;font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:${groupColors[grp]||'var(--text-dim)'};text-transform:uppercase">${grp}</td></tr>` +
      rows.map(r=>{
        const st=r.v<r.lo?'LOW':r.v>r.hi?'HIGH':'NORMAL';
        const col=st==='NORMAL'?'var(--green)':st==='LOW'?'var(--blue)':'var(--red)';
        const icon=st==='NORMAL'?'✓':st==='LOW'?'▼':'▲';
        return`<tr><td>${r.n}</td><td style="color:${col};font-family:var(--mono);font-weight:700">${r.v} ${r.u}</td><td style="color:var(--text-dim)">${r.lo}–${r.hi} ${r.u}</td><td style="color:${col}">${icon} ${st}</td><td style="font-size:10px;color:var(--text)">${r.note}</td></tr>`;
      }).join('')
    ).join('');


    // ── Push notification for critical lab values ──────────────
    if (typeof ntShowNotification === 'function' && typeof _ntPushPref === 'function') {
      const pref = _ntPushPref();
      if (pref.enabled && Notification.permission === 'granted') {
        // Collect critical rows (those with  in note)
        const criticals = labRows.filter(r => r.note && r.note.includes(''));
        const warnings  = labRows.filter(r => r.note && r.note.includes(''));
        if (criticals.length) {
          const nameTag = (typeof patientName !== 'undefined' && patientName) ? ` — ${patientName}` : '';
          const labSummary = criticals.map(r => `${r.n}: ${r.v} ${r.u}`).join(', ');
          ntShowNotification(
            ` Critical Lab Value${criticals.length > 1 ? 's' : ''}${nameTag}`,
            labSummary,
            { tag: 'nt-critical-lab', requireInteraction: true, data: { url: location.href } }
          );
        } else if (warnings.length) {
          const nameTag = (typeof patientName !== 'undefined' && patientName) ? ` — ${patientName}` : '';
          const labSummary = warnings.slice(0,2).map(r => `${r.n}: ${r.v} ${r.u}`).join(', ');
          ntShowNotification(
            ` Lab Warning${warnings.length > 1 ? 's' : ''}${nameTag}`,
            labSummary,
            { tag: 'nt-warn-lab', data: { url: location.href } }
          );
        }
      }
    }
    // ── End push notification block ────────────────────────────

  } else {
    labCard.style.display='none';
  }

  const rs=document.getElementById('results-section');
  rs.style.display='block';
  renderGLIMResult();
  document.getElementById('r-time').textContent=patientName?`${patientName} · ${new Date().toLocaleString()}`:new Date().toLocaleString();

  // Patient summary bar
  const ward = document.getElementById('a-ward')?.value || '';
  const _rawDiagText = document.getElementById('diagnosis')?.options[document.getElementById('diagnosis')?.selectedIndex]?.text || '';
  const _otherSpecify = (document.getElementById('other-specify-input')?.value || '').trim();
  const diagText = (document.getElementById('diagnosis')?.value === 'other_specify' && _otherSpecify) ? _otherSpecify : _rawDiagText;
  const summParts = [
    patientName ? `Patient: ${patientName}` : '',
    ward ? `Ward: ${ward}` : '',
    diagText && diagText !== '— Select —' ? `Dx: ${diagText}` : '',
    `Age: ${age}y`,
    sex === 'male' ? '♂' : '♀',
    `BMI: ${bmi.toFixed(1)} kg/m²`,
  ].filter(Boolean);
  const pBar = document.getElementById('r-patient-bar');
  if (pBar) pBar.innerHTML = summParts.map(p=>`<span style="margin-right:20px">${p}</span>`).join('') || '<span style="color:var(--text-dim)">No patient info entered</span>';

  // ── PES & Clinical Nutrition Insights Generation Engine ─────────────────
  (function() {
    const kcalPerKg      = weight > 0 ? (energy / weight).toFixed(1) : '—';
    const protPerKg      = weight > 0 ? (protein / weight).toFixed(2) : '—';
    const pctIBW         = ibw > 0 ? Math.round((weight / ibw) * 100) : null;
    const pctIntakeVsReq = parseFloat(document.getElementById('intake-pct')?.value) || null;
    const labs = {
      albumin:     parseFloat(document.getElementById('la')?.value)      || null,
      prealbumin:  parseFloat(document.getElementById('al-pre')?.value)  || null,
      crp:         parseFloat(document.getElementById('al-crp')?.value)  || null,
      glucose:     lg || null,
      phosphate:   lp || null,
      potassium:   lk || null,
      magnesium:   lm || null,
      sodium:      parseFloat(document.getElementById('lna')?.value)     || null,
      haemoglobin: parseFloat(document.getElementById('al-hb')?.value)   || null,
      egfr:        parseFloat(document.getElementById('legfr')?.value)   || null,
    };
    const dx             = diagnosis || 'general';
    const dxLabel        = (diagText && diagText !== '— Select —') ? diagText : dx.replace(/_/g,' ');

    // ── P: Select NCP nutrition diagnosis ─────────────────────────
    let P_code = '', P_label = '';
    const isCritical  = ['icu_critical','sepsis','septic_shock','trauma','ards','burns','post_cardiac_arrest','multiorgan_failure'].includes(dx);
    const isRenal     = ['ckd_g1g2','ckd_g3a','ckd_g3b','ckd_g4','ckd_g5','aki_no_rrt','aki_rrt','esrd_hd','esrd_pd'].includes(dx);
    const isHepatic   = ['liver_cirrhosis','liver_alf','liver_nash','liver_transplant'].includes(dx);
    const isSurgical  = ['surgery_post','surgery_pre','gi_surgery'].includes(dx);
    const isCancer    = ['cancer_general','cancer_gi','cancer_head_neck','cachexia'].includes(dx);
    const isObesity   = bmi >= 30;
    const isUnderweight = bmi < 18.5;

    if (isRefeeding && (rfRiskLevel === 'HIGH' || rfRiskLevel === 'MODERATE')) {
      P_code = 'NI-1.4'; P_label = 'Inadequate energy intake with refeeding syndrome risk';
    } else if (dx === 'burns' && tbsa > 0) {
      P_code = 'NI-5.1'; P_label = 'Increased nutrient needs — energy and protein (thermal injury)';
    } else if (isCritical) {
      P_code = 'NI-5.1'; P_label = 'Increased energy and protein needs secondary to hypermetabolism';
    } else if (isRenal) {
      P_code = 'NC-2.2'; P_label = 'Altered nutrition-related laboratory values — renal';
    } else if (isHepatic) {
      P_code = 'NC-2.1'; P_label = 'Impaired nutrient utilisation related to hepatic dysfunction';
    } else if (isCancer) {
      P_code = 'NI-5.2'; P_label = 'Malnutrition / cancer cachexia — inadequate energy–protein intake';
    } else if (dx === 'malnutrition_severe') {
      P_code = 'NI-5.2'; P_label = 'Malnutrition (severe) — inadequate energy and protein intake';
    } else if (dx === 'malnutrition_moderate') {
      P_code = 'NI-5.2'; P_label = 'Malnutrition (moderate) — inadequate energy and protein intake';
    } else if (isUnderweight) {
      P_code = 'NC-3.1'; P_label = 'Underweight — inadequate energy intake relative to needs';
    } else if (dx === 'diabetes_t2' || dx === 'diabetes_t1' || dx === 'dm1' || dx === 'dm2') {
      P_code = 'NI-5.8.6'; P_label = 'Inconsistent carbohydrate intake related to diabetes mellitus';
    } else if (dx === 'heart_failure') {
      P_code = 'NI-1.4'; P_label = 'Inadequate energy intake related to cardiac cachexia / heart failure';
    } else if (dx === 'copd' || dx === 'respiratory_failure') {
      P_code = 'NI-5.1'; P_label = 'Increased energy needs related to increased work of breathing';
    } else if (isSurgical) {
      P_code = 'NI-1.4'; P_label = 'Inadequate energy intake related to post-surgical catabolism';
    } else if (isObesity) {
      P_code = 'NC-3.3'; P_label = 'Overweight / obesity — excessive energy intake relative to needs';
    } else {
      P_code = 'NI-1.4'; P_label = 'Inadequate oral / enteral energy intake relative to estimated needs';
    }

    // ── E: Etiology ────────────────────────────────────────────────
    let E = '';
    if (isRefeeding && rfRiskLevel === 'HIGH') {
      E = 'prolonged starvation / severely inadequate intake prior to admission';
    } else if (dx === 'burns') {
      E = `thermal injury (${tbsa}% TBSA) causing hypermetabolism, protein catabolism, and increased evaporative fluid losses`;
    } else if (dx === 'icu_critical' || dx === 'sepsis' || dx === 'septic_shock') {
      E = 'systemic inflammatory response and catabolism secondary to critical illness, resulting in altered substrate metabolism';
    } else if (dx === 'trauma') {
      E = 'post-traumatic hypermetabolism, surgical stress, and increased catabolic hormone release';
    } else if (dx === 'ards') {
      E = 'impaired ventilation and elevated metabolic demand secondary to acute respiratory distress syndrome';
    } else if (isRenal) {
      E = 'impaired renal clearance, protein-energy wasting, and uraemia-related anorexia secondary to ' + dxLabel;
    } else if (isHepatic) {
      E = 'hepatic synthetic failure, impaired glycogen storage, and altered amino acid metabolism secondary to ' + dxLabel;
    } else if (isCancer) {
      E = 'tumour-driven cytokine release (IL-1, IL-6, TNF-α), reduced appetite, and treatment-related side effects';
    } else if (dx === 'heart_failure') {
      E = 'cardiac cachexia, gut oedema causing malabsorption, and fatigue-related reduced intake';
    } else if (dx === 'copd') {
      E = 'elevated work of breathing, systemic inflammation, and corticosteroid-related catabolism';
    } else if (isSurgical) {
      E = 'surgical stress response, nil-by-mouth period, and post-operative ileus';
    } else if (isObesity) {
      E = 'excessive energy intake, sedentary behaviour, and insulin resistance';
    } else {
      E = 'inadequate dietary intake and/or increased physiological demands related to ' + dxLabel;
    }

    // ── S: Signs & Symptoms — ABNORMAL FINDINGS ONLY ─────────────────────
    // Rules: exclude normal findings; include only deviations from reference range
    // or clinically significant values linked to the nutrition diagnosis.
    const sArr = [];

    // ── Anthropometric ────────────────────────────────────────────────────
    // BMI: only flag if outside normal range (18.5–24.9)
    if (bmi < 18.5) {
      const bmiSeverity = bmi < 16 ? 'severely underweight' : bmi < 17 ? 'severely underweight' : 'underweight';
      sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (${bmiSeverity} — normal 18.5–24.9 kg/m²)`);
    } else if (bmi >= 25 && bmi < 30) {
      sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (overweight — normal 18.5–24.9 kg/m²)`);
    } else if (bmi >= 30) {
      const obClass = bmi >= 40 ? 'Class III obesity' : bmi >= 35 ? 'Class II obesity' : 'Class I obesity';
      sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (${obClass} — normal 18.5–24.9 kg/m²)`);
    }
    // % IBW: flag only if meaningfully below or above IBW
    if (pctIBW !== null && pctIBW < 90) {
      sArr.push(`body weight ${weight.toFixed(1)} kg = ${pctIBW}% IBW — below expected (IBW ${ibw.toFixed(1)} kg)`);
    } else if (pctIBW !== null && pctIBW > 120) {
      sArr.push(`body weight ${weight.toFixed(1)} kg = ${pctIBW}% IBW — above expected (IBW ${ibw.toFixed(1)} kg)`);
    }

    // ── Dietary Intake ────────────────────────────────────────────────────
    // Show intake deficit only when patient is not meeting requirements
    if (pctIntakeVsReq && pctIntakeVsReq > 0 && pctIntakeVsReq < 75) {
      const deficitSeverity = pctIntakeVsReq < 25 ? 'severely deficient' : pctIntakeVsReq < 50 ? 'markedly deficient' : 'deficient';
      sArr.push(`estimated energy intake ≈${pctIntakeVsReq}% of calculated requirements (${deficitSeverity} — target 100%: ${Math.round(energy)} kcal/day, ${protein.toFixed(1)} g protein/day)`);
    } else if (pctIntakeVsReq && pctIntakeVsReq >= 75 && pctIntakeVsReq < 100) {
      sArr.push(`estimated energy intake ≈${pctIntakeVsReq}% of calculated requirements — below target (${Math.round(energy)} kcal/day, ${protein.toFixed(1)} g/day)`);
    }

    // ── Biochemical / Labs ────────────────────────────────────────────────
    if (labs) {
      // Albumin: low < 35 g/L (normal 35–50 g/L)
      if (labs.albumin && labs.albumin < 35)
        sArr.push(`serum albumin ${labs.albumin} g/L (low — normal 35–50 g/L; reflects inflammatory burden)`);
      // Pre-albumin: low < 0.15 g/L (normal 0.15–0.40 g/L)
      if (labs.prealbumin && labs.prealbumin < 0.15)
        sArr.push(`pre-albumin ${(labs.prealbumin * 1000).toFixed(0)} mg/L (low — normal 150–400 mg/L; short-term nutrition marker, t½ 2 days)`);
      // CRP: elevated > 5 mg/L (normal < 5 mg/L)
      if (labs.crp && labs.crp > 5)
        sArr.push(`CRP ${labs.crp} mg/L (elevated — normal < 5 mg/L; active systemic inflammation)`);
      // Blood glucose: hyperglycaemia > 10 mmol/L
      if (labs.glucose && labs.glucose > 10)
        sArr.push(`blood glucose ${labs.glucose} mmol/L (hyperglycaemia — target 6.1–10 mmol/L)`);
      // Phosphate: hypophosphataemia < 0.8 mmol/L (normal 0.8–1.5 mmol/L)
      if (labs.phosphate && labs.phosphate < 0.8)
        sArr.push(`serum phosphate ${labs.phosphate} mmol/L (hypophosphataemia — normal 0.8–1.5 mmol/L; refeeding risk)`);
      // Potassium: hypokalaemia < 3.5 mmol/L (normal 3.5–5.0 mmol/L)
      if (labs.potassium && labs.potassium < 3.5)
        sArr.push(`serum potassium ${labs.potassium} mmol/L (hypokalaemia — normal 3.5–5.0 mmol/L)`);
      // Magnesium: low < 0.7 mmol/L (normal 0.7–1.0 mmol/L)
      if (labs.magnesium && labs.magnesium < 0.7)
        sArr.push(`serum magnesium ${labs.magnesium} mmol/L (low — normal 0.7–1.0 mmol/L)`);
      // Sodium: hyponatraemia < 135 mmol/L
      if (labs.sodium && labs.sodium < 135)
        sArr.push(`serum sodium ${labs.sodium} mmol/L (hyponatraemia — normal 135–145 mmol/L)`);
      // Haemoglobin: anaemia thresholds (WHO: male < 130, female < 120 g/L)
      if (labs.haemoglobin && labs.haemoglobin < 120)
        sArr.push(`haemoglobin ${labs.haemoglobin} g/L (anaemia — normal ≥ 120 g/L [female] / ≥ 130 g/L [male])`);
      // eGFR: reduced renal function < 60 mL/min/1.73m²
      if (labs.egfr && labs.egfr < 60)
        sArr.push(`eGFR ${labs.egfr} mL/min/1.73m² (reduced — normal ≥ 60; renal nutrition adjustment required)`);
    }

    // ── Clinical Signs ────────────────────────────────────────────────────
    if (tbsa > 0)       sArr.push(`burns ${tbsa}% TBSA — hypermetabolism and protein catabolism`);
    if (isRefeeding)    sArr.push(`refeeding syndrome risk: ${rfRiskLevel} — electrolyte shifts anticipated on refeeding`);
    if (icuPhase && icuPhase !== 'stable') sArr.push(`ICU phase: ${icuPhase} — altered metabolic demands`);

    // ── NFPE Physical Exam Findings (live sync from NFPE tab) ─────────────
    // Reads window._nfpeFindings published by nfpeScore() in the NFPE tab.
    // Only injects when the user has assessed at least one abnormal domain.
    (function _injectNFPE() {
      const nfpe = window._nfpeFindings;
      if (!nfpe || !nfpe.hasFindings) return;

      // 1. Per-domain evidence strings (most specific — all abnormal domains)
      if (nfpe.evidenceArr && nfpe.evidenceArr.length) {
        nfpe.evidenceArr.forEach(function(s) { sArr.push(s); });
      }

      // 2. Overall malnutrition classification from NFPE (AND/ASPEN 2012)
      if (nfpe.dxText) sArr.push(nfpe.dxText);

      // 3. Edema flag — adds caveat about weight interpretation
      const edema = nfpe.abnormal && nfpe.abnormal.find(function(a){ return a.label === 'Edema'; });
      if (edema && edema.score > 0) {
        sArr.push(`pitting oedema grade ${edema.score} — actual lean mass likely underestimated; use dry/estimated weight for nutrition prescription`);
      }
    })();

    // Fallback: if no abnormal findings detected, note requirements as baseline reference
    if (sArr.length === 0) {
      sArr.push(`estimated requirements: ${Math.round(energy)} kcal/day (${kcalPerKg} kcal/kg), ${protein.toFixed(1)} g protein/day (${protPerKg} g/kg) — current intake not quantified`);
    }

    // ── Assemble PES Statements — minimum 2 ───────────────────────
    // Helper to render one numbered PES block
    function makePESBlock(num, code, label, etiology, signs, isSecondary) {
      const accent = isSecondary ? 'rgba(167,139,250,0.18)' : 'rgba(29,233,212,0.05)';
      const border = isSecondary ? 'rgba(167,139,250,0.35)'  : 'rgba(29,233,212,0.18)';
      const numCol = isSecondary ? '#a78bfa' : 'var(--teal)';
      return `<div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.75;padding:10px 14px;background:${accent};border:1px solid ${border};border-radius:6px">
        <strong style="color:${numCol}">${label}</strong> <span style="color:var(--text-dim);font-size:10px">(${code})</span> related to <em>${etiology}</em>, as evidenced by ${signs}.
      </div>`;
    }

    const pesBlocks = [];

    // ── PES #1: Primary diagnosis-driven statement ─────────────────
    const pesText1 = makePESBlock(1, P_code, P_label, E, sArr.join('; '));
    pesBlocks.push(pesText1);

    // ── PES #2: Secondary nutrition problem — always generate ──────
    // Logic: pick the most relevant secondary problem not already covered by PES #1
    let P2_code = '', P2_label = '', E2 = '', S2arr = [];

    // Priority order for secondary PES:
    // (a) Refeeding electrolyte risk (if not primary)
    // (b) Protein-specific deficit (if not already protein-labelled primary)
    // (c) Micronutrient / lab-driven (vitamin, mineral, electrolyte)
    // (d) Fluid imbalance
    // (e) Inadequate intake if weight loss documented
    // (f) Knowledge deficit / food–drug interaction
    // (g) General fallback: altered nutrition-related lab values

    const primaryCoversRefeeding = P_code === 'NI-1.4' && isRefeeding;
    const primaryCoversProtein   = ['NI-5.1','NI-5.2'].includes(P_code);
    const primaryCoversRenal     = P_code === 'NC-2.2';
    const primaryCoversObesity   = P_code === 'NC-3.3';

    // (a) Refeeding electrolyte risk — not already primary
    if (isRefeeding && !primaryCoversRefeeding) {
      P2_code  = 'NI-5.10.1';
      P2_label = 'Predicted suboptimal nutrient intake — electrolyte replenishment (refeeding syndrome risk)';
      E2 = 'anticipated intracellular electrolyte shifts on commencement of nutrition support after prolonged starvation / malnutrition';
      if (labs.phosphate && labs.phosphate < 0.8)  S2arr.push(`serum phosphate ${labs.phosphate} mmol/L (low — normal 0.8–1.5 mmol/L)`);
      if (labs.potassium && labs.potassium < 3.5)  S2arr.push(`serum potassium ${labs.potassium} mmol/L (low — normal 3.5–5.0 mmol/L)`);
      if (labs.magnesium && labs.magnesium < 0.7)  S2arr.push(`serum magnesium ${labs.magnesium} mmol/L (low — normal 0.7–1.0 mmol/L)`);
      if (!S2arr.length) S2arr.push(`refeeding syndrome risk classified as ${rfRiskLevel} — prophylactic electrolyte monitoring and replacement indicated per NICE 2006 / ASPEN 2020`);

    // (b) Protein deficit — when primary is not already protein-specific
    } else if (!primaryCoversProtein && (bmi < 22 || isRenal || isCritical || isCancer || isSurgical)) {
      P2_code  = 'NI-5.6.1';
      P2_label = 'Inadequate protein intake relative to estimated requirements';
      E2 = isCritical  ? 'accelerated muscle catabolism, negative nitrogen balance, and immune impairment secondary to critical illness / hypermetabolic state' :
           isRenal     ? 'protein-energy wasting associated with uraemia and dialysis-related amino acid losses' :
           isCancer    ? 'anorexia, dysphagia, mucositis, and cancer-related hypermetabolism limiting protein intake' :
           isSurgical  ? 'post-operative catabolism, nil-by-mouth period, and wound healing demands' :
                        'inadequate dietary protein relative to age- and disease-adjusted requirements';
      S2arr.push(`protein requirement estimated at ${protein.toFixed(1)} g/day (${protPerKg} g/kg) — intake not confirmed to meet target`);
      if (bmi < 18.5) S2arr.push(`BMI ${bmi.toFixed(1)} kg/m² indicating lean mass depletion`);
      if (labs.albumin && labs.albumin < 35)    S2arr.push(`serum albumin ${labs.albumin} g/L (low — normal 35–50 g/L; surrogate for chronic protein depletion in context of inflammation)`);
      if (labs.prealbumin && labs.prealbumin < 0.15) S2arr.push(`pre-albumin ${(labs.prealbumin*1000).toFixed(0)} mg/L (low — normal 150–400 mg/L)`);

    // (c) Micronutrient / electrolyte deficit — lab-driven
    } else if (labs.phosphate && labs.phosphate < 0.8) {
      P2_code  = 'NI-5.10.1'; P2_label = 'Inadequate phosphorus intake / hypophosphataemia';
      E2 = isRenal ? 'renal phosphate handling abnormality and dietary restriction' : 'depleted total body phosphate stores, malnutrition, or refeeding physiology';
      S2arr.push(`serum phosphate ${labs.phosphate} mmol/L (normal 0.8–1.5 mmol/L) — risk of muscle weakness, respiratory failure, haemolysis`);

    } else if (labs.potassium && labs.potassium < 3.5) {
      P2_code  = 'NI-5.10.1'; P2_label = 'Inadequate potassium intake / hypokalaemia';
      E2 = 'GI losses, diuretic therapy, or inadequate dietary potassium';
      S2arr.push(`serum potassium ${labs.potassium} mmol/L (normal 3.5–5.0 mmol/L) — arrhythmia risk; dietary and/or IV supplementation required`);

    } else if (labs.magnesium && labs.magnesium < 0.7) {
      P2_code  = 'NI-5.10.1'; P2_label = 'Inadequate magnesium intake / hypomagnesaemia';
      E2 = 'GI losses, refeeding physiology, or inadequate dietary intake';
      S2arr.push(`serum magnesium ${labs.magnesium} mmol/L (normal 0.7–1.0 mmol/L) — associated with hypokalaemia and cardiac arrhythmia risk`);

    } else if (labs.haemoglobin && labs.haemoglobin < 120) {
      P2_code  = 'NI-5.10.2'; P2_label = 'Inadequate iron / B12 / folate intake — nutritional anaemia';
      E2 = 'inadequate dietary intake of haematinic nutrients, chronic disease, or GI malabsorption';
      S2arr.push(`haemoglobin ${labs.haemoglobin} g/L (anaemia — WHO threshold: <120 g/L female, <130 g/L male)`);
      if (labs.crp && labs.crp > 5) S2arr.push(`CRP ${labs.crp} mg/L — anaemia of chronic disease component cannot be excluded`);

    // (d) Fluid / sodium imbalance
    } else if (labs.sodium && labs.sodium < 130) {
      P2_code  = 'NI-3.1'; P2_label = 'Excessive fluid intake / fluid imbalance — hyponatraemia';
      E2 = 'SIADH, cardiac failure, hepatic ascites, or excessive hypotonic fluid administration';
      S2arr.push(`serum sodium ${labs.sodium} mmol/L (severe hyponatraemia — normal 135–145 mmol/L); fluid restriction and sodium correction strategy required`);

    // (e) Obesity + malnutrition (sarcopenic obesity) — secondary PES
    } else if (primaryCoversObesity && (labs.albumin && labs.albumin < 35)) {
      P2_code  = 'NI-5.2'; P2_label = 'Malnutrition concurrent with obesity (sarcopenic obesity)';
      E2 = 'coexisting protein-energy malnutrition and excess adiposity — GLIM 2019 phenotypic criteria met despite elevated BMI';
      S2arr.push(`serum albumin ${labs.albumin} g/L (low — inflammatory-mediated protein depletion coexisting with obesity)`);
      S2arr.push(`BMI ${bmi.toFixed(1)} kg/m² — does NOT exclude malnutrition (GLIM 2019); lean mass assessment recommended (DEXA/CT)`);

    // (f) Renal-specific secondary (altered mineral metabolism)
    } else if (isRenal && !primaryCoversRenal) {
      P2_code  = 'NC-2.2'; P2_label = 'Altered nutrition-related laboratory values — renal mineral metabolism';
      E2 = 'progressive renal impairment causing secondary hyperparathyroidism, phosphate retention, and vitamin D deficiency';
      if (labs.egfr) S2arr.push(`eGFR ${labs.egfr} mL/min/1.73m² — phosphate, potassium, and bicarbonate monitoring required`);
      S2arr.push('renal bone disease risk — active vitamin D supplementation and dietary phosphate restriction indicated');

    // (g) Hepatic secondary — encephalopathy risk / BCAA
    } else if (isHepatic) {
      P2_code  = 'NI-5.6.1'; P2_label = 'Altered amino acid metabolism — hepatic encephalopathy risk';
      E2 = 'impaired hepatic deamination of aromatic amino acids and portosystemic shunting causing altered neurological function';
      S2arr.push('branched-chain amino acid (BCAA) supplementation may be indicated; avoid prolonged protein restriction — ESPEN Liver Guidelines 2019');
      if (labs.albumin && labs.albumin < 30) S2arr.push(`serum albumin ${labs.albumin} g/L — synthetic failure indicator in advanced hepatic disease`);

    // (h) Cancer / cachexia secondary — inflammation-mediated
    } else if (isCancer) {
      P2_code  = 'NB-1.1'; P2_label = 'Food and nutrition knowledge deficit — cancer cachexia self-management';
      E2 = 'lack of patient and caregiver knowledge regarding high-calorie, high-protein dietary strategies and nutrition support options during oncology treatment';
      S2arr.push('nutrition counselling indicated: energy-dense small frequent meals, ONS, and appetite-stimulating strategies (ESPEN Oncology Guidelines 2021)');
      S2arr.push(`estimated requirements ${Math.round(energy)} kcal/day, ${protein.toFixed(1)} g protein/day — patient education on meeting targets`);

    // (i) Fallback: food–drug interaction or knowledge deficit
    } else {
      const fallbackMap = {
        diabetes_t2:    { code:'NB-2.2', label:'Excessive energy intake / inconsistent meal timing related to diabetes', e:'irregular meal patterns, carbohydrate-dense snacking, and insufficient dietary fibre contributing to glycaemic variability', s:[`energy prescription ${Math.round(energy)} kcal/day with carbohydrate distribution ${Math.round(energy*0.45/4)}–${Math.round(energy*0.55/4)} g/day across 3 meals`, 'target consistent carbohydrate intake at each meal to optimise glycaemic control (ADA 2024 Standards of Care)'] },
        dm1:            { code:'NB-2.2', label:'Excessive energy intake / inconsistent meal timing related to diabetes', e:'irregular meal patterns, carbohydrate-dense snacking, and insufficient dietary fibre contributing to glycaemic variability', s:[`energy prescription ${Math.round(energy)} kcal/day with carbohydrate distribution ${Math.round(energy*0.45/4)}–${Math.round(energy*0.55/4)} g/day across 3 meals`, 'target consistent carbohydrate intake at each meal to optimise glycaemic control (ADA 2024 Standards of Care)'] },
        dm2:            { code:'NB-2.2', label:'Excessive energy intake / inconsistent meal timing related to diabetes', e:'irregular meal patterns, carbohydrate-dense snacking, and insufficient dietary fibre contributing to glycaemic variability', s:[`energy prescription ${Math.round(energy)} kcal/day`, 'target consistent carbohydrate intake at each meal to optimise glycaemic control (ADA 2024)'] },
        heart_failure:  { code:'NI-3.2', label:'Excessive fluid intake / sodium intake related to heart failure', e:'fluid and sodium restriction non-adherence contributing to symptomatic fluid retention and volume overload', s:['fluid restriction target 1.5–2.0 L/day — patient counselling required','sodium restriction <2 g/day (ESC Heart Failure Guidelines 2021)'] },
        copd:           { code:'NI-5.10.1', label:'Inadequate vitamin D and calcium intake — COPD comorbidity', e:'corticosteroid use, reduced sun exposure, and inadequate dietary intake predisposing to osteoporosis', s:['vitamin D supplementation recommended: 800–1000 IU/day (GOLD COPD Guidelines)', 'calcium intake target ≥1000 mg/day from diet and/or supplements'] },
      };
      const fb = fallbackMap[dx];
      if (fb) {
        P2_code = fb.code; P2_label = fb.label; E2 = fb.e; S2arr = fb.s;
      } else {
        // Generic universal fallback — always produces a meaningful second PES
        P2_code  = 'NB-1.1';
        P2_label = 'Food and nutrition knowledge deficit';
        E2 = 'lack of knowledge of appropriate food choices, portion sizes, and dietary modifications required to meet nutrition goals related to current medical condition';
        S2arr.push(`estimated nutrition requirements ${Math.round(energy)} kcal/day (${kcalPerKg} kcal/kg), protein ${protein.toFixed(1)} g/day (${protPerKg} g/kg) — patient education on meeting targets recommended`);
        S2arr.push('nutrition counselling indicated: goal-setting, meal planning, and self-monitoring strategies (AND Evidence-Based Nutrition Practice Guidelines)');
      }
    }

    // Ensure S2arr is never empty
    if (!S2arr.length) {
      S2arr.push(`current nutrition requirements: ${Math.round(energy)} kcal/day, ${protein.toFixed(1)} g protein/day — clinical monitoring indicated`);
    }

    const pesText2 = makePESBlock(2, P2_code, P2_label, E2, S2arr.join('; '), true);
    pesBlocks.push(pesText2);

    // ── PES #3: Tertiary — only when high-acuity or complex multi-morbidity ──
    const generateThird =
      (isCritical && isRenal) ||
      (isCritical && isHepatic) ||
      (isCancer && (labs.albumin && labs.albumin < 28)) ||
      (isRefeeding && rfRiskLevel === 'HIGH' && bmi < 16) ||
      (tbsa > 20);

    if (generateThird) {
      let P3_code = 'NI-5.10.1', P3_label = '', E3 = '', S3arr = [];
      if (isCritical && isRenal) {
        P3_code = 'NI-5.10.1'; P3_label = 'Inadequate electrolyte intake — critical illness + renal failure';
        E3 = 'oliguria / anuria, CRRT-related losses, and inadequate replacement of electrolytes consumed in metabolic acidosis correction';
        S3arr.push('CRRT removes amino acids (~10–15 g/day) — protein prescription must account for filter losses');
        if (labs.phosphate && labs.phosphate < 0.8) S3arr.push(`phosphate ${labs.phosphate} mmol/L — renal tubular dysfunction and catabolism`);
      } else if (isCancer && labs.albumin && labs.albumin < 28) {
        P3_code = 'NC-3.4'; P3_label = 'Malnutrition (severe) — cancer-associated weight loss and muscle wasting';
        E3 = 'tumour-driven proteolysis, elevated REE, systemic inflammation, and treatment-related toxicity preventing adequate nutritional intake';
        S3arr.push(`serum albumin ${labs.albumin} g/L — severe hypoalbuminaemia indicating significant protein depletion`);
        S3arr.push('Cachexia criteria likely met (ESPEN Oncology 2021): >5% weight loss, elevated CRP, reduced oral intake — intensive nutritional support warranted');
      } else if (tbsa > 20) {
        P3_code = 'NI-5.10.2'; P3_label = 'Inadequate vitamin and trace element intake — major thermal injury';
        E3 = 'massive losses of water-soluble vitamins, zinc, copper, and selenium through wound exudate, with markedly increased requirements';
        S3arr.push(`burns ${tbsa}% TBSA — supplementation protocol: vitamin C 1–2 g/day, zinc 40 mg/day, copper 4–6 mg/day, selenium 300–500 µg/day (ESPEN Burns 2013)`);
      } else {
        P3_code = 'NB-2.1'; P3_label = 'Physical inactivity / immobility-related muscle wasting';
        E3 = 'prolonged bed rest, ICU-acquired weakness, and reduced anabolic stimulus leading to accelerated lean mass loss';
        S3arr.push('progressive resistance programme or passive range-of-motion exercises recommended alongside high-protein nutrition support');
        S3arr.push('target ≥1.5–2.0 g/kg/day protein to minimise ICU-acquired weakness (ASPEN Critical Care 2022)');
      }
      pesBlocks.push(makePESBlock(3, P3_code, P3_label, E3, S3arr.join('; '), true));
    }

    // Render all PES blocks into the container
    const stmtEl = document.getElementById('pes-statement');
    if (stmtEl) stmtEl.innerHTML = pesBlocks.join('');

    // ── Oasis AI Silent PES Refinement ─────────────────────────────────────
    // Sends the generated PES to OasisAI.refinePES for clinical improvement.
    // Replaces content silently when refinement succeeds; original persists on
    // any error.  No loading indicator — the process is invisible to the user.
    if (window.OasisAI && typeof window.OasisAI.refinePES === 'function') {
      (function _oasisRefinePES() {
        const _pesEl = document.getElementById('pes-statement');
        if (!_pesEl) return;

        // Capture originals for fall-back
        const _origBlocks = pesBlocks.slice();

        // Structured PES objects consumed by OasisAI.refinePES
        const _p1 = {
          pCode:    P_code,
          pLabel:   P_label,
          etiology: [E],
          evidence: sArr.slice()
        };
        const _p2 = (P2_code && P2_label) ? {
          pCode:    P2_code,
          pLabel:   P2_label,
          etiology: [E2],
          evidence: S2arr.slice()
        } : null;

        // Compact patient context for the AI prompt
        let _pCtx = 'Diagnosis: ' + (dxLabel || dx || 'unspecified');
        if (bmi)            _pCtx += '; BMI '                + bmi.toFixed(1)            + ' kg/m\u00b2';
        if (weight)         _pCtx += '; Weight '             + weight                    + ' kg';
        if (energy)         _pCtx += '; Energy requirement ' + Math.round(energy)        + ' kcal/day';
        if (protein)        _pCtx += '; Protein requirement '+ protein.toFixed(1)        + ' g/day';
        if (pctIntakeVsReq) _pCtx += '; Oral intake \u2248'  + pctIntakeVsReq            + '% of estimated needs';
        if (labs.albumin)   _pCtx += '; Albumin '            + labs.albumin              + ' g/L';
        if (labs.crp)       _pCtx += '; CRP '                + labs.crp                  + ' mg/L';

        window.OasisAI.refinePES({
          primaryPES:    _p1,
          secondaryPES:  _p2,
          phaseLabel:    dxLabel || dx || 'General',
          patientContext: _pCtx
        }).then(function(res) {
          if (!res || !res.raw || !res.raw.trim()) return;

          // ── Internal helpers — parse AI text into {code,label,etiology,signs} ──

          // Extract the text block that belongs to one section header, stopping
          // before the next recognised header.
          function _getSection(txt, hdr) {
            var idx = txt.indexOf(hdr);
            if (idx === -1) return null;
            var start = idx + hdr.length;
            var end   = txt.length;
            var stops = [
              'REFINED PRIMARY PES:',
              'REFINED SECONDARY PES:',
              'IMPROVEMENT NOTES:',
              'CLINICAL PES SENTENCE:'
            ];
            for (var si = 0; si < stops.length; si++) {
              if (stops[si] === hdr) continue;
              var ni = txt.indexOf(stops[si], start);
              if (ni !== -1 && ni < end) end = ni;
            }
            return txt.substring(start, end).trim();
          }

          // Parse a single PES section block into component parts.
          // Handles both "[code] Label" and "Label [code]" orderings.
          function _parseSec(sec) {
            if (!sec) return null;
            var pm = sec.match(/^P:\s*(?:\[([^\]]+)\]\s*)?(.+)$/m);
            var em = sec.match(/^E:\s*(?:related to\s+)?(.+)$/m);
            var sm = sec.match(/^S:\s*(?:as evidenced by\s+)?(.+)$/m);
            if (!pm || !em || !sm) return null;
            var code  = (pm[1] || '').trim();
            var label = (pm[2] || '').trim();
            // Fallback: code may be embedded inside the label string
            if (!code) {
              var inLbl = label.match(/\[([A-Z]{2}-[\d.]+)\]/);
              if (inLbl) { code = inLbl[1]; label = label.replace(inLbl[0], '').trim(); }
            }
            return {
              code:     code,
              label:    label,
              etiology: em[1].trim(),
              signs:    sm[1].trim()
            };
          }

          // ── Rebuild HTML blocks using the same visual style as originals ──
          var _refined = [];

          // Primary PES
          var _r1 = _parseSec(_getSection(res.raw, 'REFINED PRIMARY PES:'));
          if (_r1 && _r1.label && _r1.etiology && _r1.signs) {
            _refined.push(makePESBlock(1, _r1.code || P_code, _r1.label, _r1.etiology, _r1.signs, false));
          } else {
            _refined.push(_origBlocks[0]); // fall back to original primary
          }

          // Secondary PES (only when the original had one)
          if (_origBlocks.length > 1) {
            var _r2 = _parseSec(_getSection(res.raw, 'REFINED SECONDARY PES:'));
            if (_r2 && _r2.label && _r2.etiology && _r2.signs) {
              _refined.push(makePESBlock(2, _r2.code || P2_code, _r2.label, _r2.etiology, _r2.signs, true));
            } else {
              _refined.push(_origBlocks[1]); // fall back to original secondary
            }
          }

          // Tertiary PES — high-acuity clinical data; preserved verbatim
          if (_origBlocks.length > 2) _refined.push(_origBlocks[2]);

          // Apply refined HTML only when we produced at least one valid block
          if (_refined.length > 0 && _pesEl) {
            _pesEl.innerHTML = _refined.join('');
            // Keep _pesGenerated in sync for the Copy button
            window._pesGenerated = {
              statement: _pesEl.innerHTML.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
              count:     _refined.length
            };
          }
        }).catch(function() {
          // Silent failure — original PES display is preserved unchanged
        });
      }());
    }
    // ── End Oasis AI Silent PES Refinement ─────────────────────────────────

    // ── Smart PES — supplemental disease-phase-aware PES ────────────────────
    if (window.SmartPES) {
      try {
        const _smartCtx = {
          dx:               diagnosis,
          bmi:              bmi,
          weight:           weight,
          ibw:              ibw,
          energy:           energy,
          protein:          protein,
          intakePct:        intakePct || null,
          weightLossPct:    parseFloat(document.getElementById('wl-pct')?.value) || null,
          albumin:          parseFloat(document.getElementById('la')?.value)       || null,
          crp:              parseFloat(document.getElementById('lab-crp')?.value)  || null,
          hba1c:            parseFloat(document.getElementById('lhba1c')?.value)   || null,
          fastingGlucose:   parseFloat(document.getElementById('lg')?.value)       || null,
          egfr:             parseFloat(document.getElementById('legfr')?.value)    || null,
          phosphate:        parseFloat(document.getElementById('lp')?.value)       || null,
          potassium:        parseFloat(document.getElementById('lk')?.value)       || null,
          magnesium:        parseFloat(document.getElementById('lm')?.value)       || null,
          icuPhase:         icuPhase  || null,
          dayOfIllness:     parseFloat(document.getElementById('day-of-illness')?.value) || null,
          comorbidities:    [],
          screeningScore:   parseFloat(document.getElementById('screening-score')?.value) || null,
          screeningTool:    document.getElementById('screening-tool')?.value       || null,
          ascites:          document.getElementById('ascites')?.value === 'yes',
          hepaticEncephalopathy: document.getElementById('hep-enc')?.value === 'yes',
          childPugh:        document.getElementById('child-pugh')?.value           || null,
          nyha:             parseFloat(document.getElementById('nyha')?.value)     || null,
          ventilated:       document.getElementById('ventilation')?.value === 'mechanical',
          hospitalised:     true,
          tbsaPct:          tbsa || null,
          daysPostOp:       parseFloat(document.getElementById('days-post-op')?.value) || null,
          isPedi:           false,
        };
        const _smartResult = window.SmartPES.generateAdult(_smartCtx);
        const _smartEl = document.getElementById('smart-pes-container');
        if (_smartEl) _smartEl.innerHTML = _smartResult.html;
      } catch(e) { console.warn('SmartPES adult error:', e); }
    }

    window._pesGenerated = {
      statement: pesBlocks.map(b => b.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()).join('\n\n'),
      count: pesBlocks.length
    };

    // ── Clinical Nutrition Insights ──────────────────────────────────────────
    const insights = [];

    // 1. Nutrition status
    if (bmi < 16) {
      insights.push({ icon:'', col:'#fca5a5', text:`Severely underweight (BMI ${bmi.toFixed(1)}) — high risk of refeeding complications; initiate nutrition support cautiously with close electrolyte monitoring.` });
    } else if (bmi < 18.5) {
      insights.push({ icon:'', col:'#fcd34d', text:`Underweight (BMI ${bmi.toFixed(1)}) — prioritise energy-dense foods/formulas. Target weight gain of 0.5–1 kg/week where appropriate.` });
    } else if (bmi >= 30 && !isCritical) {
      insights.push({ icon:'', col:'#fcd34d', text:`Obesity (BMI ${bmi.toFixed(1)}) — use hypocaloric high-protein strategy: 11–14 kcal/kg actual weight; protein ≥ 2 g/kg IBW (ASPEN Obesity Guidelines 2013).` });
    } else {
      insights.push({ icon:'', col:'#6ee7b7', text:`BMI ${bmi.toFixed(1)} kg/m² — ${bmiCat}. Weight-based energy and protein targets applied at ${kcalPerKg} kcal/kg/day using ${energyLabel.split('·')[0].trim()}.` });
    }
    // GLIM 2019 — sarcopenic obesity clarification
    if (bmi >= 30 && (isRefeeding || ['malnutrition_severe','malnutrition_moderate'].includes(dx) || (diagnosis && diagnosis.includes('malnutrition')))) {
      insights.push({ icon:'', col:'#fb923c', text:`Malnutrition diagnosed despite obesity (sarcopenic obesity) based on reduced intake, inflammation, and muscle loss (GLIM 2019). BMI ≥30 does NOT exclude malnutrition. Protein and micronutrient deficits may coexist with excess adiposity. High-protein prescription (≥1.5 g/kg IBW) is critical to preserve lean mass.` });
    }

    // 2. Refeeding risk
    if (isRefeeding) {
      if (rfRiskLevel === 'HIGH') {
        insights.push({ icon:'', col:'#fca5a5', text:`Refeeding syndrome risk: HIGH — energy capped at ≤5 kcal/kg/day; advance per protocol over 4–7 days. Correct K⁺ to ≥3.5 mmol/L, PO₄, and Mg²⁺ BEFORE commencing feeding. Monitor electrolytes daily (NICE CG32 2006).` });
        insights.push({ icon:'', col:'#fca5a5', text:`Permissive underfeeding: protein (${pRange}) is prioritised over total energy in early refeeding phase. Advance protein toward 1.5–2.0 g/kg as energy increases from Day 3 onwards.` });
      } else if (rfRiskLevel === 'MODERATE') {
        insights.push({ icon:'', col:'#fcd34d', text:`Refeeding syndrome risk: MODERATE — start at 50% target calories, increase over 2–3 days. Check electrolytes at 12h and 24h after commencing nutrition support (NICE CG32 2006).` });
      }
    }

    // 3. Protein adequacy
    const gPerKg = parseFloat(protPerKg);
    if (isRefeeding && rfRiskLevel === 'HIGH') {
      insights.push({ icon:'', col:'#a78bfa', text:`Protein: ${protein.toFixed(1)} g/day (${protPerKg} g/kg IBW) — conservatively initiated per NICE CG32. Range: ${pRange}. Advance toward 1.5–2.0 g/kg as energy increases from Day 3. ${pGuideline}.` });
    } else if (gPerKg >= 1.5) {
      insights.push({ icon:'', col:'#a78bfa', text:`High-protein prescription: ${protein.toFixed(1)} g/day (${protPerKg} g/kg) — justified by ${pGuideline}. Monitor for nitrogen accumulation in renal impairment (BUN, urea).` });
    } else if (gPerKg < 1.0 && !isRenal) {
      insights.push({ icon:'', col:'#fcd34d', text:`Protein target ${protein.toFixed(1)} g/day (${protPerKg} g/kg) is below 1.0 g/kg — consider increasing unless renal restriction applies. ESPEN 2019 recommends ≥ 1.2 g/kg for hospital patients.` });
    } else {
      insights.push({ icon:'', col:'#a78bfa', text:`Protein target: ${protein.toFixed(1)} g/day (${protPerKg} g/kg) — aligned with ${pGuideline}. Range: ${pRange}.` });
    }

    // 4. Feeding route / ICU
    if (isCritical && route !== 'enteral') {
      insights.push({ icon:'', col:'#60a5fa', text:`Enteral nutrition preferred in critical illness — initiate within 24–48h of ICU admission if haemodynamically stable (ESPEN ICU 2019, ASPEN/SCCM 2016).` });
    } else if (route === 'enteral') {
      if (isRefeeding && rfRiskLevel === 'HIGH') {
        insights.push({ icon:'', col:'#60a5fa', text:`Advance enteral feeding slowly over 4–7 days due to high refeeding risk. Routine GRV monitoring is not recommended; assess tolerance clinically (vomiting, distension, aspiration risk). (NICE CG32 2006 · ASPEN/SCCM 2016)` });
      } else {
        insights.push({ icon:'', col:'#60a5fa', text:`Enteral route selected — target full rate within 48–72h. Routine GRV monitoring is not recommended; assess tolerance clinically (ASPEN/SCCM 2016).` });
      }
    }

    // 5. Burns-specific
    if (dx === 'burns' && tbsa > 0) {
      const burnKcalKg = (energy / weight).toFixed(0);
      insights.push({ icon:'', col:'#fb923c', text:`Burns ${tbsa}% TBSA — estimated need ${Math.round(energy)} kcal/day (${burnKcalKg} kcal/kg). Initiate EN within 6h of injury; nasojejunal feeding preferred if gastric ileus. Protein 1.5–2.5 g/kg. Reassess weekly as wound healing progresses (ESPEN Burns 2013).` });
    }

    // 6. Renal-specific
    if (isRenal && renal === 'aki_rrt') {
      insights.push({ icon:'', col:'#34d399', text:`Patient on RRT/CRRT — protein target 1.7–2.5 g/kg to offset dialysis losses. Energy 25–30 kcal/kg. Avoid phosphate- and potassium-restricted formula unless labs indicate (KDIGO 2012 / ESPEN AKI 2023).` });
    } else if (isRenal && (renal === 'ckd_g4' || renal === 'ckd_g5')) {
      insights.push({ icon:'', col:'#34d399', text:`Advanced CKD (G4–G5) — protein restriction 0.6–0.8 g/kg only if no dialysis. Restrict phosphate (< 800 mg/day), potassium, and sodium as per labs. Supplement with ketoanalogues if available (KDIGO 2024).` });
    }

    // Render insights
    const insEl = document.getElementById('pes-insights');
    if (insEl) {
      insEl.innerHTML = insights.map(i =>
        `<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid ${i.col};border-radius:5px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.65">
          <span style="flex-shrink:0;font-size:13px;margin-top:1px">${i.icon}</span>
          <span>${i.text}</span>
        </div>`
      ).join('');
    }

    // ── Action & Domain (Intervention sub-section) ─────────────────────────
    const routeLabels = { oral:'Oral diet / oral nutritional supplements', enteral:'Enteral nutrition (tube feeding)', oral_ons:'Oral diet with oral nutritional supplements (ONS)' };
    const routeLabel  = routeLabels[route] || route;
    const actionEl    = document.getElementById('r-action-statement');
    if (actionEl) {
      const customDx = (document.getElementById('other-specify-input')?.value || '').trim();
      const dxDisplay = (dx === 'other_specify' && customDx) ? customDx : dxLabel;
      actionEl.innerHTML = `Initiate or optimise <strong>${routeLabel}</strong> to meet estimated energy and protein requirements for <em>${dxDisplay}</em>. Target ${Math.round(energy)} kcal/day and ${protein.toFixed(1)} g protein/day. Reassess within 48–72 hours or with significant clinical change.`;
    }
    // ── OasisAI — 4-domain NCP Intervention Generator ───────────────────────

    // ── Offline / Fallback NCP Intervention Engine ───────────────────────────
    // Generates evidence-based NCP interventions from clinical context when
    // OasisAI is unavailable or the network request fails.
    // Returns { nd, e, c, rc } as '\n'-separated bullet strings.
    function _generateOfflineFallbackInterventions(ctx) {
      const {
        dx = 'general', dxLabel = 'General', route = 'oral',
        energy = 0, protein = 0, protPerKg = '—', pGuideline = '',
        bmi = 0, bmiCat = '', weight = 0, ibw = 0, age = '', sex = '',
        isCritical = false, isRenal = false, isHepatic = false,
        isSurgical = false, isCancer = false, isObesity = false,
        isRefeeding = false, rfRiskLevel = '', isUnderweight = false,
        tbsa = 0, icuPhase = '', giFunction = 'normal', pctIntakeVsReq = null,
        labs = {}, P_label = '', P_code = '',
      } = ctx;

      const kcal   = Math.round(energy) || '—';
      const prot   = protein ? protein.toFixed(1) : '—';
      const ppkg   = protPerKg || '—';
      const glFunc = giFunction === 'normal' ? 'intact' : giFunction;

      // ── Shared helpers ──────────────────────────────────────────────────────
      const hasLowPhos  = labs.phosphate  && labs.phosphate  < 0.8;
      const hasLowK     = labs.potassium  && labs.potassium  < 3.5;
      const hasLowMg    = labs.magnesium  && labs.magnesium  < 0.7;
      const hasLowHb    = labs.haemoglobin && labs.haemoglobin < 10;
      const hasHighGlu  = labs.glucose    && labs.glucose    > 10;
      const hasLowNa    = labs.sodium     && labs.sodium     < 130;
      const hasHighNa   = labs.sodium     && labs.sodium     > 145;
      const hasLowAlb   = labs.albumin    && labs.albumin    < 30;
      const poorIntake  = pctIntakeVsReq !== null && pctIntakeVsReq < 60;

      // Route label
      const routeMap = { oral: 'oral diet', enteral: 'enteral nutrition (tube feeding)', oral_ons: 'oral diet + ONS', parenteral: 'parenteral nutrition', pn: 'parenteral nutrition' };
      const routeStr = routeMap[route] || route || 'oral diet';
      const isEN     = route === 'enteral';
      const isPN     = route === 'parenteral' || route === 'pn';
      const isOral   = route === 'oral' || route === 'oral_ons';

      // ── ND: Food / Nutrient Delivery ────────────────────────────────────────
      const ndBullets = [];

      // 1. Core feeding order — always present
      if (isEN) {
        ndBullets.push(`Initiate enteral nutrition via ${dx === 'burns' || isCritical ? 'NGT/NJT' : 'appropriate tube'} — target ${kcal} kcal/day and ${prot} g protein/day; advance to full rate over 24–48 h as tolerated.`);
        ndBullets.push(`Select standard polymeric formula (1.0–1.5 kcal/mL); upgrade to high-protein formula (≥20% protein energy) if ${P_code.startsWith('NI-5') ? 'protein-energy malnutrition confirmed' : 'protein requirements not met with standard formula'}.`);
        if (glFunc !== 'intact') ndBullets.push(`GI function: ${glFunc} — monitor gastric residual volumes q4h; hold feeds if GRV >250 mL × 2; consider post-pyloric placement if intolerance persists.`);
      } else if (isPN) {
        ndBullets.push(`Initiate PN: target ${kcal} kcal/day and ${prot} g protein/day; adjust macronutrient ratio to 50–60% CHO, 15–20% AA, 25–30% lipid (avoid excess dextrose — monitor BGL q6h).`);
        ndBullets.push(`Transition to EN/oral route as soon as GI function restored — aim to reduce PN reliance within 5–7 days where clinically feasible.`);
      } else {
        ndBullets.push(`Prescribe ${routeStr}: target ${kcal} kcal/day and ${prot} g protein/day (${ppkg} g/kg IBW/day — basis: ${pGuideline || 'clinical guidelines'}).`);
        if (route === 'oral_ons') ndBullets.push(`Supplement oral diet with high-energy / high-protein ONS (≥2 × 200 kcal/serving/day) — prescribe ≥400 kcal/day supplemental ONS and encourage between-meal use.`);
      }

      // 2. Diagnosis-specific ND adjustments
      if (isRefeeding) {
        const rfHigh = rfRiskLevel === 'HIGH';
        ndBullets.push(`Refeeding protocol (${rfRiskLevel || 'MODERATE'} risk): commence at ${rfHigh ? '5–10' : '10–15'} kcal/kg/day; increase by 200–400 kcal every 24–48 h only if electrolytes stable. DO NOT advance if phosphate <0.6 mmol/L.`);
        ndBullets.push(`Thiamine (B1) replacement BEFORE commencing feeds: ${rfHigh ? 'IV 200–300 mg' : 'oral/IV 100 mg'} once daily × 10 days — prevents Wernicke encephalopathy.`);
        if (hasLowPhos) ndBullets.push(`Phosphate IV replacement indicated (current: ${labs.phosphate} mmol/L, target ≥0.8 mmol/L) — hold / pause nutrition advancement until phosphate corrected.`);
        if (hasLowK)   ndBullets.push(`Potassium replacement required (${labs.potassium} mmol/L) before / during refeeding — monitor q6h during initial phase.`);
        if (hasLowMg)  ndBullets.push(`Magnesium replacement required (${labs.magnesium} mmol/L) — IV or oral MgSO₄ per pharmacy protocol.`);
      } else if (isRenal) {
        ndBullets.push(`Renal-adjusted diet: restrict dietary potassium to 1500–2000 mg/day, phosphorus to 800–1000 mg/day, sodium to <2 g/day; fluid restriction per renal team orders (typically 1.0–1.5 L/day on HD).`);
        if (isEN) ndBullets.push(`Select renal-specific EN formula (lower potassium, phosphorus, fluid-dense ≥2.0 kcal/mL) — e.g. Nepro HP or equivalent; adjust volume to fluid allowance.`);
        if (labs.egfr && labs.egfr < 30) ndBullets.push(`eGFR ${labs.egfr} mL/min/1.73m² — avoid phosphate-containing supplements; consult nephrology before starting micronutrient supplementation.`);
      } else if (isHepatic) {
        ndBullets.push(`Hepatic diet: avoid protein restriction unless overt hepatic encephalopathy (grade ≥2) — maintain protein at ${prot} g/day; prefer BCAA-enriched formula or BCAA supplement (0.2–0.4 g/kg/day) if encephalopathy present.`);
        ndBullets.push(`Small, frequent meals (4–6/day) + late-evening snack (200 kcal CHO-rich, e.g. banana + oats) — prevents overnight catabolism; critical in cirrhosis (ESPEN 2019).`);
        ndBullets.push(`Restrict sodium to 1.5–2 g/day if ascites present; avoid fluid restriction unless Na <125 mmol/L; monitor for zinc / B-vitamin deficiencies (supplement empirically in cirrhosis).`);
      } else if (isCritical) {
        const phase = icuPhase || 'acute';
        if (phase === 'early') {
          ndBullets.push(`ICU acute/early phase: initiate trophic/permissive underfeeding — commence EN at 10–20 kcal/kg/day within 24–48 h of ICU admission (ESPEN Critical Care 2023). Do NOT overfeed — avoid early full-dose nutrition.`);
        } else if (phase === 'late') {
          ndBullets.push(`ICU rehabilitation/late phase: advance to full energy target ${kcal} kcal/day and ${prot} g protein/day — optimise via EN, supplement PN only if persistent EN deficit >3 days.`);
        } else {
          ndBullets.push(`Critical illness: advance to target ${kcal} kcal/day (${Math.round(energy / (weight || 70))} kcal/kg) and ${prot} g protein/day — re-evaluate energy method with indirect calorimetry if available.`);
        }
        if (hasHighGlu) ndBullets.push(`Hyperglycaemia (BGL ${labs.glucose} mmol/L) — target BGL 6–10 mmol/L per ICU protocol; reduce dextrose load if on PN; monitor q2–4h; escalate insulin infusion per protocol.`);
      } else if (isCancer) {
        ndBullets.push(`Cancer / cachexia: target ${kcal} kcal/day and ${prot} g protein/day — prioritise protein preservation; supplement with ONS ≥ 2 × daily if oral intake <75% of requirements.`);
        ndBullets.push(`Omega-3 fatty acids (EPA 2 g/day) via fish oil or omega-3 enriched ONS — attenuates cancer cachexia and inflammatory response (ESPEN Oncology 2021).`);
        if (poorIntake) ndBullets.push(`Current intake ${pctIntakeVsReq}% of requirements — escalate nutrition support: consider appetite stimulant (megestrol/dexamethasone) in discussion with oncology; refer for enteral nutrition if PO <60% persists >3 days.`);
      } else if (isSurgical) {
        ndBullets.push(`Post-surgical nutrition: initiate oral sips / clear liquids within 4–6 h post-operatively; advance to full texture diet within 24–48 h if bowel sounds present and no anastomotic concerns.`);
        ndBullets.push(`Immunonutrition (arginine + omega-3 + glutamine) in major GI surgery if available — consider pre- and post-operative supplementation per ESPEN/ERAS protocols.`);
        if (isEN) ndBullets.push(`Early post-op EN if oral route inadequate — commence at 20–25 mL/h and advance; reduces infectious complications and hospital LOS (ERAS Society Guidelines 2023).`);
      } else if (isObesity && !isCritical) {
        ndBullets.push(`Hypocaloric high-protein diet: target ${kcal} kcal/day (energy deficit ~500–750 kcal/day vs. TDEE); protein ${prot} g/day (≥1.2 g/kg IBW) to preserve lean mass during weight loss.`);
        ndBullets.push(`Restrict ultra-processed foods, SSBs, and energy-dense snacks; emphasise whole grains, lean protein, legumes, non-starchy vegetables; limit total fat to 25–35% of energy.`);
      } else if (tbsa > 0) {
        ndBullets.push(`Burns (${tbsa}% TBSA): initiate early EN ≤6 h post-injury; target ${kcal} kcal/day using Curreri or Ireton-Jones formula; protein ${prot} g/day (1.5–2.0 g/kg) — obligatory loss through wounds.`);
        ndBullets.push(`High-dose micronutrients for burns: vitamin C 1–3 g/day, zinc 40 mg/day, copper 4–6 mg/day × 14–21 days — antioxidant support for wound healing (Singer et al. 2019).`);
      } else {
        // General / other
        if (poorIntake) {
          ndBullets.push(`Current oral intake estimated at ${pctIntakeVsReq}% of requirements — food fortification strategies: add butter/oil/full-fat dairy/nut pastes to meals; serve frequent small portions q2–3h.`);
        } else {
          ndBullets.push(`Optimise dietary intake to meet prescribed targets: ${kcal} kcal/day and ${prot} g protein/day via regular meals + snacks; advise on locally available high-energy and high-protein foods.`);
        }
        ndBullets.push(`If oral intake remains <75% of requirements for ≥3 days despite food fortification, escalate nutrition support to ONS (≥400 kcal/day) or enteral nutrition.`);
      }

      // 3. Lab-driven additions (universal)
      if (hasLowHb && !isRefeeding) ndBullets.push(`Low Hb ${labs.haemoglobin} g/dL — assess iron/B12/folate status; consider oral iron supplementation (ferrous sulphate 200 mg TDS with vitamin C) pending cause; dietary iron counselling.`);
      if (hasHighGlu && !isCritical) ndBullets.push(`Elevated fasting glucose ${labs.glucose} mmol/L — prescribe carbohydrate-controlled diet (CHO 45–60 g/meal, low GI); avoid SSBs and refined sugars; monitor BGL QID.`);

      // ── E: Nutrition Education ───────────────────────────────────────────────
      const eBullets = [];

      if (isRenal) {
        eBullets.push(`Educate on renal diet principles: phosphorus restriction (avoid processed cheese, colas, nuts in excess), potassium restriction (limit banana, orange, potato — choose apples, cabbage, rice), sodium restriction.`);
        eBullets.push(`Fluid management education: demonstrate measuring fluid intake; discuss high-fluid foods (soups, ice cream, fruits count toward allowance); provide pictorial fluid diary for self-monitoring.`);
        eBullets.push(`Label reading — identify 'hidden' phosphorus (phosphoric acid additives in cola/processed foods absorb ≈90%, vs. 50% from natural sources) — explain why additive phosphorus is more dangerous.`);
      } else if (isHepatic) {
        eBullets.push(`Educate on cirrhosis nutritional needs: explain why protein restriction is no longer routinely recommended; discuss high-protein snack ideas (eggs, Greek yoghurt, legumes) appropriate for the patient's food culture.`);
        eBullets.push(`Late-evening snack education: explain physiological rationale (shortened overnight fast prevents catabolism); provide practical snack options — e.g. nsima with groundnut flour, soya porridge, or Pronutro if available.`);
        eBullets.push(`Alcohol education: complete abstinence is essential in alcoholic liver disease — provide brief motivational advice; refer to alcohol cessation support programme.`);
      } else if (isCancer) {
        eBullets.push(`Educate on managing cancer treatment side effects: nausea (cold/room-temperature foods, avoid strong odours), mucositis (soft moist foods, avoid acidic/spicy), altered taste (marinate meats, try flavour enhancers, metallic taste → use plastic cutlery).`);
        eBullets.push(`High-calorie, high-protein food choices accessible in Malawi: groundnuts, soya pieces (Topsoy), Maheu fortified drink, eggs, milk, beans — provide practical portion guidance.`);
        eBullets.push(`Explain rationale for nutritional support during oncology treatment: adequate intake supports treatment tolerance, immune function, and quality of life — not a luxury but a clinical priority.`);
      } else if (isSurgical) {
        eBullets.push(`Post-surgical diet progression: explain clear liquids → soft diet → regular diet stages; advise to report pain, nausea, or distension immediately — these indicate the need to step back in the progression.`);
        eBullets.push(`Protein and wound healing: explain why ${prot} g/day protein is essential for surgical recovery (collagen synthesis, immune function); identify practical high-protein foods (eggs, fish, beans, soya, dairy).`);
        eBullets.push(`Supplement adherence: if ONS/supplements prescribed, explain the importance of completing the full course rather than substituting for meals.`);
      } else if (isObesity) {
        eBullets.push(`Educate on energy balance: use simplified plate model (½ non-starchy vegetables, ¼ lean protein, ¼ whole grains); explain energy-dense vs. nutrient-dense food choices using locally available foods.`);
        eBullets.push(`Food labelling and portion awareness: identify hidden sugars (e.g. ONGA mchuzi mix, tomato sauces) and excess fats; demonstrate portion sizes using hands/household measures (no food scale needed).`);
        eBullets.push(`Explain metabolic benefits of even modest weight loss (5–10%): improved BP, BGL, lipids, joint pain — emphasise that small sustained changes outperform extreme restriction.`);
      } else if (isRefeeding) {
        eBullets.push(`Explain refeeding syndrome to patient and family: describe why rapid nutrition increases are dangerous after prolonged starvation; reassure that the careful reintroduction plan is designed for safety.`);
        eBullets.push(`Electrolyte awareness: explain symptoms of low phosphate/potassium/magnesium (muscle weakness, palpitations, confusion) — instruct patient to report any of these immediately.`);
        eBullets.push(`Gradual diet progression after hospital discharge: advise small, frequent, nutrient-dense meals; avoid the temptation to 'catch up' rapidly after feeling better.`);
      } else if (dx === 'diabetes_t2' || dx === 'diabetes_t1' || dx === 'pregnancy_gest_dm') {
        eBullets.push(`Carbohydrate distribution education: target consistent 45–60 g CHO per main meal; identify low-GI staples (sorghum nsima, cassava, sweet potato vs. refined maize) and explain glycaemic differences.`);
        eBullets.push(`Dietary fibre: ≥14 g/1000 kcal/day from whole grains, legumes, vegetables — slows glucose absorption; demonstrate practical daily meal plan using locally available foods.`);
        eBullets.push(`Self-monitoring link to diet: educate on how to use BGL readings to identify meals causing spikes; show how to adjust food choices based on 2-hour post-meal BGL target (<8 mmol/L).`);
      } else if (dx === 'hypertension' || dx === 'heart_failure' || dx === 'cardiovascular') {
        eBullets.push(`DASH diet principles: ↑ fruits, vegetables, whole grains, low-fat dairy; ↓ sodium (<2 g/day), red/processed meat, added sugars — demonstrate how to adapt DASH to Malawian food culture.`);
        eBullets.push(`Sodium literacy: identify high-sodium foods common in Malawian diet (ONGA mchuzi mix, kapenta dried fish, processed snacks); demonstrate low-sodium cooking — use tomato, onion, garlic, herbs as flavour base.`);
        eBullets.push(`Potassium education (hypertension): explain that potassium-rich foods (beans, pumpkin leaves, groundnuts, sweet potato, banana) support blood pressure control through natriuresis.`);
      } else if (isCritical) {
        eBullets.push(`ICU nutrition education (if patient is communicative): explain the purpose of tube feeding / IV nutrition; address anxiety and cultural concerns around artificial feeding.`);
        eBullets.push(`Family / carer education: explain why the patient may not be eating by mouth; teach family appropriate snacks/foods to bring when oral intake resumes — discourage bringing inappropriate high-sugar or fasting foods.`);
        eBullets.push(`Communicate expected nutrition trajectory: explain the transition from ICU feeding to oral diet and what milestones the team is watching for (swallow safety, GI function, extubation).`);
      } else {
        eBullets.push(`Educate on meeting prescribed energy and protein targets: identify practical high-protein, high-energy foods available locally (eggs, beans, groundnuts, soya, full-fat milk, kapenta, dried fish).`);
        eBullets.push(`Meal frequency and distribution: encourage 3 main meals + 2–3 snacks daily; avoid prolonged gaps >4–5 h; distribute protein across meals (≥20 g/meal) for optimal synthesis.`);
        eBullets.push(`Nutrition label awareness: if using packaged supplements or foods, demonstrate how to read and compare energy/protein content; reinforce daily supplementation schedule if prescribed.`);
      }

      // ── C: Nutrition Counseling ──────────────────────────────────────────────
      const cBullets = [];

      // Shared opening — always relevant
      cBullets.push(`Explore barriers to meeting nutrition targets: physical (dysphagia, pain, fatigue, nausea), psychosocial (food insecurity, cultural beliefs, appetite loss), or disease-related (altered taste, malabsorption) — use motivational interviewing technique.`);

      if (isObesity) {
        cBullets.push(`Cognitive restructuring for weight management: challenge all-or-nothing thinking; set SMART goals (e.g. 'walk 20 min 3×/week for 4 weeks') rather than large outcome goals; celebrate non-scale victories.`);
        cBullets.push(`Emotional eating and food environment counselling: assess triggers for overeating; discuss strategies — structured meal times, removing high-risk foods from home, mindful eating practices.`);
      } else if (isCancer) {
        cBullets.push(`Address psychosocial barriers to eating: cancer-related anorexia is physiological, not willpower — validate patient's experience; set small achievable intake goals to build confidence.`);
        cBullets.push(`Shared goal-setting with patient and carer: agree on realistic daily intake targets; explore patient's food preferences and cultural food practices to improve dietary adherence during treatment.`);
      } else if (isRenal) {
        cBullets.push(`Renal diet adherence counselling: acknowledge the complexity and restrictiveness of the diet; use 'allowed, limit, avoid' framework rather than blanket restrictions to prevent unnecessary under-nutrition.`);
        cBullets.push(`Support system engagement: involve family member or primary carer in counselling session — renal dietary restrictions require household cooperation (cooking methods, food purchasing).`);
      } else if (isHepatic) {
        cBullets.push(`Motivational counselling — alcohol: use FRAMES model (Feedback, Responsibility, Advice, Menu, Empathy, Self-efficacy); non-judgmental tone; explore patient's own reasons for change.`);
        cBullets.push(`Appetite and fatigue management: hepatic patients often have early satiety (ascites) — counsel on small-volume, energy-dense meal strategies; address fatigue-related meal skipping.`);
      } else if (isRefeeding) {
        cBullets.push(`Address fear of eating / food avoidance after prolonged starvation: validate psychological difficulty; provide reassurance that the team's gradual reintroduction approach is safe.`);
        cBullets.push(`Post-discharge food security counselling: assess ability to access adequate food at home; provide community resource information; develop a simple transitional meal plan with food-secure options.`);
      } else if (isSurgical) {
        cBullets.push(`Surgical recovery counselling: address anxiety about eating post-operatively; reinforce that early adequate nutrition accelerates healing and reduces complications — it is part of treatment, not a luxury.`);
        cBullets.push(`Adherence to post-surgical diet protocol: discuss what to expect at each stage of diet progression; help patient set realistic expectations for appetite return and normal eating resumption.`);
      } else if (isCritical) {
        cBullets.push(`Counselling focus (when patient communicative): address fear of not eating normally; validate ICU nutrition experience; explain goal of protecting muscle mass and immune function during acute illness.`);
        cBullets.push(`Post-ICU nutritional recovery counselling: many patients experience prolonged anorexia post-ICU — begin counselling on high-protein diet, gradual oral intake increase, and supplement use as part of rehabilitation planning.`);
      } else {
        cBullets.push(`Motivational counselling for diet adherence: explore the patient's own health goals and link dietary changes to those goals; use brief action planning — agree 1–2 specific dietary changes for the next week.`);
        cBullets.push(`Address food insecurity or economic barriers: identify low-cost, locally accessible high-nutrient foods; connect with social work or community health worker if food access is a barrier.`);
      }

      // Universal closing for C
      if (bmi < 18.5 || poorIntake || hasLowAlb) {
        cBullets.push(`Appetite stimulation counselling: identify preferred foods; small flavour modifications to increase palatability; address early satiety — liquids before meals worsen; encourage calorie-dense first bites.`);
      }
      if (age && age > 65) {
        cBullets.push(`Older adult considerations: address potential for functional decline, isolation, or cognitive changes affecting dietary intake; involve carer or family member; consider occupational therapy referral for meal preparation difficulties.`);
      }

      // ── RC: Coordination of Nutrition Care ──────────────────────────────────
      const rcBullets = [];

      // Core MDT communication — always include
      rcBullets.push(`Document NCP goals, targets, and intervention plan in patient medical notes; communicate updated nutrition prescription to nursing staff for mealtime assistance, supplementation, and tube feeding administration.`);

      if (isCritical || isEN || isPN) {
        rcBullets.push(`Daily multidisciplinary round communication: liaise with medical officer/consultant regarding GI function, drug-nutrient interactions (propofol kcal, insulin, corticosteroids), and nutrition support progression; flag any tube displacement, GRV intolerance, or electrolyte abnormality.`);
        rcBullets.push(`Pharmacy liaison: review medication-nutrient interactions — check for tube feed-drug incompatibilities; confirm timing of meds vs. EN holds; ensure thiamine and micronutrient supplementation charted.`);
      }
      if (isRenal) {
        rcBullets.push(`Nephrology team coordination: confirm dietary prescriptions align with HD/PD schedule and fluid targets; communicate phosphate-binder timing with meals to pharmacy and nursing.`);
        rcBullets.push(`Haemodialysis unit referral: coordinate dietitian-to-renal nurse handover; ensure dietary restrictions updated in HD unit records at each session.`);
      }
      if (isHepatic) {
        rcBullets.push(`Hepatology/gastroenterology team coordination: communicate nutrition plan, BCAA use, and protein targets; flag any hepatic encephalopathy grade changes that necessitate protein protocol revision.`);
        rcBullets.push(`Alcohol cessation referral: liaise with social work or addiction support services; ensure patient has a pathway to alcohol counselling before or at discharge.`);
      }
      if (isCancer) {
        rcBullets.push(`Oncology team coordination: communicate patient's nutritional status, weight trajectory, and intake percentage to oncology at each chemotherapy/radiotherapy cycle review — poor nutrition status warrants treatment delay consideration.`);
        rcBullets.push(`Palliative care coordination (if applicable): align nutrition goals with overall goals of care — ensure patient's wishes regarding artificial nutrition are documented and respected.`);
      }
      if (isSurgical) {
        rcBullets.push(`Surgical team liaison: confirm diet progression orders post-operatively with surgeon; notify if oral intake <50% at 48 h post-op for early nutrition support escalation decision.`);
        rcBullets.push(`Discharge planning — nutrition continuity: arrange outpatient dietitian follow-up within 2–4 weeks of discharge; document discharge nutrition plan in referral letter including targets, supplements, and red flags.`);
      }
      if (isRefeeding) {
        rcBullets.push(`Electrolyte monitoring escalation pathway: communicate with prescribing team — daily electrolytes (phosphate, K, Mg, Na) during initial refeeding phase; ensure standing orders in place for replacement without delay.`);
        rcBullets.push(`Thiamine administration co-ordination: confirm IV/oral thiamine is charted and being administered BEFORE nutrition commences; alert nurse in charge if thiamine was not given pre-feed.`);
      }

      // Universal discharge / follow-up
      rcBullets.push(`Schedule dietitian follow-up: ${isCritical || isRefeeding || isEN ? 'daily inpatient review until nutrition targets achieved' : isRenal || isHepatic || isCancer ? 'weekly inpatient + outpatient appointment within 2–4 weeks of discharge' : 'review in 5–7 days inpatient or outpatient follow-up at 2–4 weeks'}.`);
      rcBullets.push(`Community referral at discharge: notify community health worker / primary care of nutrition status and ongoing dietary needs; ensure patient has written diet plan in preferred language (Chichewa if applicable).`);

      // ── Assemble output (max 4 bullets per domain for readability) ───────────
      function joinBullets(arr) {
        return arr.slice(0, 4).map(b => '• ' + b).join('\n');
      }

      return {
        nd: joinBullets(ndBullets),
        e:  joinBullets(eBullets),
        c:  joinBullets(cBullets),
        rc: joinBullets(rcBullets),
      };
    }
    // ── End offline fallback engine ──────────────────────────────────────────

    (function _generateNCPInterventions() {
      const ndEl = document.getElementById('r-nd-statement');
      const eEl  = document.getElementById('r-e-statement');
      const cEl  = document.getElementById('r-c-statement');
      const rcEl = document.getElementById('r-rc-statement');
      if (!ndEl || !eEl || !cEl || !rcEl) return;

      // Loading state
      const _loadingHTML = `<span style="font-family:var(--mono);font-size:9.5px;color:rgba(255,255,255,0.3);letter-spacing:0.5px">Generating<span class="_oai-dots"></span></span>`;
      [ndEl, eEl, cEl, rcEl].forEach(el => { el.innerHTML = _loadingHTML; });

      // Inject dot animation once
      if (!document.getElementById('_oai-dot-style')) {
        const s = document.createElement('style');
        s.id = '_oai-dot-style';
        s.textContent = `@keyframes _oaiDotPulse{0%,100%{opacity:.2}50%{opacity:1}} ._oai-dots::after{content:'...';animation:_oaiDotPulse 1.2s ease infinite;display:inline-block;width:18px;text-align:left}`;
        document.head.appendChild(s);
      }

      const customDx  = (document.getElementById('other-specify-input')?.value || '').trim();
      const dxDisplay = (dx === 'other_specify' && customDx) ? customDx : dxLabel;

      // Shared context object for both AI path and offline fallback
      const _ctx = {
        dx, dxLabel: dxDisplay, route,
        energy, protein, protPerKg, pGuideline,
        bmi, bmiCat, weight, ibw,
        age:     parseFloat(document.getElementById('age')?.value)    || '',
        sex:     document.getElementById('sex')?.value                || '',
        isCritical, isRenal, isHepatic, isSurgical, isCancer, isObesity,
        isRefeeding, rfRiskLevel, isUnderweight,
        tbsa, icuPhase,
        giFunction:     document.getElementById('gi-function')?.value || 'normal',
        pctIntakeVsReq,
        labs,
        pesStatement:   `${P_label} (${P_code}) related to ${E}, as evidenced by ${sArr.join('; ')}.`,
        P_label, P_code, E_etiology: E,
      };

      function _renderBullets(text, accentColor) {
        return text.split('\n').filter(l => l.trim()).map(line => {
          const clean = line.replace(/^[•\-\*]\s*/, '');
          return `<div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:5px;line-height:1.6">
              <span style="flex-shrink:0;color:${accentColor};font-size:10px;margin-top:2px">▸</span>
              <span>${clean}</span>
            </div>`;
        }).join('');
      }

      function _renderOffline(result) {
        // Subtle badge so clinician knows this is the static fallback
        const badge = `<div style="font-family:var(--mono);font-size:8.5px;color:rgba(251,191,36,0.55);margin-bottom:6px;letter-spacing:0.4px">⚡ offline — evidence-based fallback</div>`;
        ndEl.innerHTML = badge + _renderBullets(result.nd, '#1de9d4');
        eEl.innerHTML  = badge + _renderBullets(result.e,  '#60a5fa');
        cEl.innerHTML  = badge + _renderBullets(result.c,  '#a78bfa');
        rcEl.innerHTML = badge + _renderBullets(result.rc, '#fb923c');
      }

      if (typeof window.OasisAI === 'undefined' || typeof window.OasisAI.generateInterventions !== 'function') {
        _renderOffline(_generateOfflineFallbackInterventions(_ctx));
        return;
      }

      window.OasisAI.generateInterventions(_ctx).then(function(result) {
        ndEl.innerHTML = _renderBullets(result.nd, '#1de9d4');
        eEl.innerHTML  = _renderBullets(result.e,  '#60a5fa');
        cEl.innerHTML  = _renderBullets(result.c,  '#a78bfa');
        rcEl.innerHTML = _renderBullets(result.rc, '#fb923c');
      }).catch(function(err) {
        console.warn('[Oasis] AI intervention generation failed (' + (err.message || err) + ') — using offline fallback.');
        _renderOffline(_generateOfflineFallbackInterventions(_ctx));
      });
    })();

    // Store for copy function
    window._pesGenerated = {
      statement: `${P_label} (${P_code}) related to ${E}, as evidenced by ${sArr.join('; ')}.`,
      insights: insights.map(i => '• ' + i.text).join('\n')
    };
  })();

  const sett = DataService.get('settings') || {};
  if(sett['tog-scroll']!==false) rs.scrollIntoView({behavior:'smooth',block:'start'});
}

// ─────────────────────────────────────────────────────────────────
// GLIM 2019 MALNUTRITION ASSESSMENT
// Cederholm T et al. Clin Nutr 2019;38:1–9
// ─────────────────────────────────────────────────────────────────
function glimCalcData() {
  var wt   = parseFloat(document.getElementById('weight')?.value) || 0;
  var ubw  = parseFloat(document.getElementById('a-ubw')?.value)  || 0;
  var ht   = parseFloat(document.getElementById('height')?.value) || 0;
  var age  = parseFloat(document.getElementById('age')?.value)    || 0;
  var bmi  = (ht > 0 && wt > 0) ? wt / ((ht/100) * (ht/100)) : 0;
  var dur  = document.getElementById('glim-wl-duration')?.value || '6mo';

  // Weight loss %
  var wtLossPct = (ubw > 0 && wt > 0) ? Math.max(0, (ubw - wt) / ubw * 100) : 0;

  // ── Phenotypic criteria ──
  // P1: Weight loss
  var p1Mod = false, p1Sev = false;
  if (dur === '6mo') {
    p1Mod = wtLossPct >= 5  && wtLossPct <= 10;
    p1Sev = wtLossPct > 10;
  } else {
    p1Mod = wtLossPct >= 10 && wtLossPct <= 20;
    p1Sev = wtLossPct > 20;
  }
  var p1 = p1Mod || p1Sev;

  // P2: Low BMI
  var bmiModThresh = age >= 70 ? 22 : 20;
  var bmiSevThresh = age >= 70 ? 20 : 18.5;
  var p2Mod = bmi > 0 && bmi < bmiModThresh && bmi >= bmiSevThresh;
  var p2Sev = bmi > 0 && bmi < bmiSevThresh;
  var p2 = p2Mod || p2Sev;

  // P3: Muscle mass
  var p3Mod = document.getElementById('glim-muscle')?.checked || false;
  var p3Sev = document.getElementById('glim-muscle-severe')?.checked || false;
  var p3 = p3Mod || p3Sev;

  // ── Etiologic criteria ──
  var e1       = document.getElementById('glim-intake')?.checked        || false;
  var e2acute  = document.getElementById('glim-disease-acute')?.checked  || false;
  var e2chron  = document.getElementById('glim-disease-chronic')?.checked || false;
  var e2       = e2acute || e2chron;

  var phenotypicMet = p1 || p2 || p3;
  var etiologicMet  = e1 || e2;
  var isMalnourished = phenotypicMet && etiologicMet;

  // Severity — Stage 2 if any severe criterion met
  var isSevere = isMalnourished && (p1Sev || p2Sev || p3Sev);

  // Etiology label
  var etiology = '';
  if (e2chron)       etiology = 'chronic disease / inflammation';
  else if (e2acute)  etiology = 'acute disease or injury';
  else if (e1)       etiology = 'reduced food intake/assimilation';

  return {
    bmi: bmi, wtLossPct: wtLossPct, ubw: ubw,
    p1: p1, p1Mod: p1Mod, p1Sev: p1Sev,
    p2: p2, p2Mod: p2Mod, p2Sev: p2Sev,
    p3: p3, p3Mod: p3Mod, p3Sev: p3Sev,
    e1: e1, e2acute: e2acute, e2chron: e2chron, e2: e2,
    phenotypicMet: phenotypicMet, etiologicMet: etiologicMet,
    isMalnourished: isMalnourished, isSevere: isSevere,
    etiology: etiology
  };
}

function glimAutoAssess() {
  var d = glimCalcData();
  var badge = document.getElementById('glim-live-badge');
  var liveDiv = document.getElementById('glim-live-result');
  var wlDisp  = document.getElementById('glim-wl-display');

  // Update weight loss display
  if (wlDisp) {
    if (d.ubw > 0) {
      var dur = document.getElementById('glim-wl-duration')?.value || '6mo';
      var durLabel = dur === '6mo' ? '≤6 months' : '>6 months';
      var thresh   = dur === '6mo' ? '5% (mod) / >10% (sev)' : '10% (mod) / >20% (sev)';
      var pColor   = d.p1Sev ? '#ef4444' : d.p1Mod ? '#f0b429' : '#34d399';
      wlDisp.innerHTML = '<strong>Weight loss: </strong>'
        + '<span style="color:' + pColor + '">' + d.wtLossPct.toFixed(1) + '%</span>'
        + ' <span style="color:var(--text-dim)">over ' + durLabel + ' — threshold ' + thresh + '</span>';
    } else {
      wlDisp.innerHTML = '<span style="color:var(--text-dim)">Enter Usual Body Weight above to auto-calculate weight loss %</span>';
    }
  }

  if (!badge || !liveDiv) return;

  // Determine assessment outcome
  var diagnosis = '', badgeColor = '', diagColor = '', diagIcon = '', bgColor = '', bdColor = '';

  if (!d.phenotypicMet && !d.etiologicMet) {
    diagnosis  = 'Well Nourished';
    badgeColor = '#34d399'; bgColor = 'rgba(52,211,153,0.08)'; bdColor = 'rgba(52,211,153,0.45)'; diagColor = '#34d399'; diagIcon = '';
    badge.textContent = ' WELL NOURISHED';
    badge.style.background = 'rgba(52,211,153,0.15)'; badge.style.color = '#34d399'; badge.style.borderColor = 'rgba(52,211,153,0.5)';
  } else if (d.phenotypicMet && !d.etiologicMet) {
    diagnosis  = 'Phenotypic criteria met — Etiologic criteria needed to confirm malnutrition';
    badgeColor = '#60a5fa'; bgColor = 'rgba(96,165,250,0.07)'; bdColor = 'rgba(96,165,250,0.45)'; diagColor = '#60a5fa'; diagIcon = '';
    badge.textContent = ' ETIOLOGIC NEEDED';
    badge.style.background = 'rgba(96,165,250,0.15)'; badge.style.color = '#60a5fa'; badge.style.borderColor = 'rgba(96,165,250,0.5)';
  } else if (!d.phenotypicMet && d.etiologicMet) {
    diagnosis  = 'Etiologic criteria met — Phenotypic criteria needed to confirm malnutrition';
    badgeColor = '#60a5fa'; bgColor = 'rgba(96,165,250,0.07)'; bdColor = 'rgba(96,165,250,0.45)'; diagColor = '#60a5fa'; diagIcon = '';
    badge.textContent = ' PHENOTYPIC NEEDED';
    badge.style.background = 'rgba(96,165,250,0.15)'; badge.style.color = '#60a5fa'; badge.style.borderColor = 'rgba(96,165,250,0.5)';
  } else if (d.isMalnourished && d.isSevere) {
    diagnosis  = 'Malnutrition — Stage 2 (Severe)' + (d.etiology ? ' related to ' + d.etiology : '');
    badgeColor = '#ef4444'; bgColor = 'rgba(239,68,68,0.08)'; bdColor = 'rgba(239,68,68,0.5)'; diagColor = '#ef4444'; diagIcon = '';
    badge.textContent = ' SEVERE MALNUTRITION';
    badge.style.background = 'rgba(239,68,68,0.2)'; badge.style.color = '#ef4444'; badge.style.borderColor = 'rgba(239,68,68,0.6)';
  } else if (d.isMalnourished) {
    diagnosis  = 'Malnutrition — Stage 1 (Moderate)' + (d.etiology ? ' related to ' + d.etiology : '');
    badgeColor = '#f0b429'; bgColor = 'rgba(240,180,41,0.08)'; bdColor = 'rgba(240,180,41,0.5)'; diagColor = '#f0b429'; diagIcon = '';
    badge.textContent = ' MODERATE MALNUTRITION';
    badge.style.background = 'rgba(240,180,41,0.2)'; badge.style.color = '#f0b429'; badge.style.borderColor = 'rgba(240,180,41,0.6)';
  } else {
    badge.textContent = 'NOT ASSESSED';
    badge.style.background = 'var(--surface3)'; badge.style.color = 'var(--text-dim)'; badge.style.borderColor = 'rgba(100,100,100,.3)';
    liveDiv.style.display = 'none';
    return;
  }

  // Build criteria summary
  var phenoRows = [];
  if (d.ubw > 0) {
    var pCol = d.p1Sev ? '#ef4444' : d.p1Mod ? '#f0b429' : '#a8c8e8';
    phenoRows.push('<span style="color:' + pCol + '">' + (d.p1 ? '✓' : '✗') + ' Weight loss ' + d.wtLossPct.toFixed(1) + '%' + (d.p1Sev ? ' [<strong>severe</strong>]' : d.p1Mod ? ' [moderate]' : '') + '</span>');
  }
  if (d.bmi > 0) {
    var dur2 = document.getElementById('glim-wl-duration')?.value || '6mo';
    var age2 = parseFloat(document.getElementById('age')?.value) || 0;
    var bmiT = age2 >= 70 ? 22 : 20;
    var bCol = d.p2Sev ? '#ef4444' : d.p2Mod ? '#f0b429' : '#a8c8e8';
    phenoRows.push('<span style="color:' + bCol + '">' + (d.p2 ? '✓' : '✗') + ' BMI ' + d.bmi.toFixed(1) + ' kg/m²' + (d.p2Sev ? ' [<strong>severe</strong>]' : d.p2Mod ? ' [moderate]' : ' [normal]') + '</span>');
  }
  if (d.p3Sev) phenoRows.push('<span style="color:#ef4444">✓ Reduced muscle mass [<strong>severe</strong>]</span>');
  else if (d.p3Mod) phenoRows.push('<span style="color:#f0b429">✓ Reduced muscle mass [moderate]</span>');
  else phenoRows.push('<span style="color:#ddeeff">✗ Reduced muscle mass — not ticked</span>');

  var etioRows = [];
  etioRows.push('<span style="color:' + (d.e1 ? '#34d399' : '#a8c8e8') + '">' + (d.e1 ? '✓' : '✗') + ' Reduced food intake / assimilation</span>');
  etioRows.push('<span style="color:' + (d.e2acute ? '#34d399' : '#a8c8e8') + '">' + (d.e2acute ? '✓' : '✗') + ' Acute disease or injury</span>');
  etioRows.push('<span style="color:' + (d.e2chron ? '#34d399' : '#a8c8e8') + '">' + (d.e2chron ? '✓' : '✗') + ' Chronic disease / inflammation</span>');

  liveDiv.style.display = 'block';
  liveDiv.style.background = bgColor;
  liveDiv.style.borderColor = bdColor;
  liveDiv.innerHTML = '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">'
    + '<div style="flex:1;min-width:180px">'
    + '<div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:' + diagColor + ';text-transform:uppercase;margin-bottom:4px">GLIM Diagnosis</div>'
    + '<div style="font-size:13.5px;font-weight:700;color:' + diagColor + '">' + diagIcon + ' ' + diagnosis + '</div>'
    + '</div>'
    + '<div style="min-width:200px">'
    + '<div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--teal);text-transform:uppercase;margin-bottom:4px">Phenotypic (' + (d.phenotypicMet ? '≥1 MET' : 'NOT MET') + ')</div>'
    + '<div style="font-size:10px;line-height:1.8">' + phenoRows.join('<br>') + '</div>'
    + '</div>'
    + '<div style="min-width:200px">'
    + '<div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--amber);text-transform:uppercase;margin-bottom:4px">Etiologic (' + (d.etiologicMet ? '≥1 MET' : 'NOT MET') + ')</div>'
    + '<div style="font-size:10px;line-height:1.8">' + etioRows.join('<br>') + '</div>'
    + '</div>'
    + '</div>'
    + '<div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:8px"> Cederholm T et al. GLIM criteria for the diagnosis of malnutrition. Clin Nutr 2019;38:1–9. Screen first with MNA / NRS-2002 / MUST before applying GLIM.</div>';
}

function renderGLIMResult() {
  var card = document.getElementById('r-glim-card');
  if (!card) return;
  var d = glimCalcData();
  var age = parseFloat(document.getElementById('age')?.value) || 0;

  // Determine diagnosis string + styling
  var diagLabel = '', diagSub = '', stage = '', stageBadge = '', headerBg = '', borderCol = '', iconCol = '';

  if (d.isMalnourished && d.isSevere) {
    diagLabel  = 'Severe Malnutrition';
    diagSub    = 'Stage 2 — GLIM 2019';
    stage      = d.etiology ? 'Related to ' + d.etiology.charAt(0).toUpperCase() + d.etiology.slice(1) : 'Etiology not specified';
    stageBadge = ' STAGE 2 — SEVERE';
    headerBg   = 'rgba(239,68,68,0.12)'; borderCol = 'rgba(239,68,68,0.55)'; iconCol = '#ef4444';
  } else if (d.isMalnourished) {
    diagLabel  = 'Moderate Malnutrition';
    diagSub    = 'Stage 1 — GLIM 2019';
    stage      = d.etiology ? 'Related to ' + d.etiology.charAt(0).toUpperCase() + d.etiology.slice(1) : 'Etiology not specified';
    stageBadge = ' STAGE 1 — MODERATE';
    headerBg   = 'rgba(240,180,41,0.10)'; borderCol = 'rgba(240,180,41,0.55)'; iconCol = '#f0b429';
  } else if (d.phenotypicMet || d.etiologicMet) {
    diagLabel  = 'At Risk';
    diagSub    = 'Criteria partially met — GLIM 2019';
    stage      = d.phenotypicMet ? 'Phenotypic criteria met — etiologic assessment required' : 'Etiologic criteria met — phenotypic assessment required';
    stageBadge = ' CRITERIA INCOMPLETE';
    headerBg   = 'rgba(96,165,250,0.08)'; borderCol = 'rgba(96,165,250,0.45)'; iconCol = '#60a5fa';
  } else {
    diagLabel  = 'Well Nourished';
    diagSub    = 'No malnutrition criteria met — GLIM 2019';
    stage      = 'Continue monitoring — reassess if clinical status changes';
    stageBadge = ' WELL NOURISHED';
    headerBg   = 'rgba(52,211,153,0.08)'; borderCol = 'rgba(52,211,153,0.45)'; iconCol = '#34d399';
  }

  // Build criteria detail rows
  var dur = document.getElementById('glim-wl-duration')?.value || '6mo';
  var durLabel = dur === '6mo' ? '≤6 months' : '>6 months';
  var bmiThresh = age >= 70 ? 22 : 20;

  var rows = '';
  // Phenotypic
  var wlText = d.ubw > 0 ? (d.wtLossPct.toFixed(1) + '% over ' + durLabel)
    : 'Usual BW not entered';
  var wlStatus = d.p1Sev ? 'Severe' : d.p1Mod ? 'Moderate' : 'Not met';
  var wlColor  = d.p1Sev ? '#ef4444' : d.p1Mod ? '#f0b429' : '#a8c8e8';
  rows += '<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px"> Weight Loss</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">' + wlText + '</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + wlColor + '">' + wlStatus + '</td>'
    + '</tr>';

  var bmiText   = d.bmi > 0 ? d.bmi.toFixed(1) + ' kg/m² (threshold ' + bmiThresh + ')' : 'Not calculated';
  var bmiStatus = d.p2Sev ? 'Severe' : d.p2Mod ? 'Moderate' : 'Not met';
  var bmiColor  = d.p2Sev ? '#ef4444' : d.p2Mod ? '#f0b429' : '#a8c8e8';
  rows += '<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px"> Low BMI</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">' + bmiText + '</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + bmiColor + '">' + bmiStatus + '</td>'
    + '</tr>';

  var mmStatus = d.p3Sev ? 'Severe' : d.p3Mod ? 'Moderate' : 'Not reported';
  var mmColor  = d.p3Sev ? '#ef4444' : d.p3Mod ? '#f0b429' : '#a8c8e8';
  rows += '<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px"> Muscle Mass</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">BIA / DEXA / anthropometry</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + mmColor + '">' + mmStatus + '</td>'
    + '</tr>';

  rows += '<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px"> Reduced Intake</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">≤50% EER &gt;1 wk or GI malabsorption</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + (d.e1 ? '#34d399' : '#a8c8e8') + '">' + (d.e1 ? '✓ Met' : '✗ Not ticked') + '</td>'
    + '</tr>';

  rows += '<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px">Acute Disease</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">ICU, surgery, trauma, severe infection</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + (d.e2acute ? '#34d399' : '#a8c8e8') + '">' + (d.e2acute ? '✓ Met' : '✗ Not ticked') + '</td>'
    + '</tr>';

  rows += '<tr>'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px">Chronic Disease</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">Cancer, CKD, COPD, CVD, liver disease</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + (d.e2chron ? '#34d399' : '#a8c8e8') + '">' + (d.e2chron ? '✓ Met' : '✗ Not ticked') + '</td>'
    + '</tr>';

  card.style.display = 'block';
  card.innerHTML = '<div style="background:#0c1830;border:2px solid ' + borderCol + ';border-radius:12px;overflow:hidden">'
    + '<div style="background:' + headerBg + ';border-bottom:1px solid ' + borderCol + ';padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'
    + '<div style="display:flex;align-items:center;gap:10px">'
    + '<span style="font-size:20px"></span>'
    + '<div>'
    + '<div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:' + iconCol + ';text-transform:uppercase">GLIM 2019 — Nutrition Assessment</div>'
    + '<div style="font-family:-apple-system,system-ui,sans-serif;font-size:19px;font-weight:800;color:' + iconCol + ';letter-spacing:0.5px">' + diagLabel + '</div>'
    + '<div style="font-family:var(--mono);font-size:10px;color:rgba(168,200,232,0.8);margin-top:2px">' + stage + '</div>'
    + '</div></div>'
    + '<div style="background:' + borderCol + ';color:#fff;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1.5px;padding:6px 14px;border-radius:20px">' + stageBadge + '</div>'
    + '</div>'
    + '<div style="padding:0">'
    + '<table style="width:100%;border-collapse:collapse;font-family:var(--mono)">'
    + '<thead><tr style="background:#0d1e3a">'
    + '<th style="padding:7px 12px;text-align:left;color:#ddeeff;font-size:8px;letter-spacing:1.5px;text-transform:uppercase">Criterion</th>'
    + '<th style="padding:7px 12px;text-align:left;color:#ddeeff;font-size:8px;letter-spacing:1.5px;text-transform:uppercase">Detail</th>'
    + '<th style="padding:7px 12px;text-align:left;color:#ddeeff;font-size:8px;letter-spacing:1.5px;text-transform:uppercase">Status</th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>'
    + '<div style="padding:10px 18px;font-family:var(--mono);font-size:8.5px;color:var(--text-dim);border-top:1px solid rgba(56,100,168,0.2)">'
    + ' Cederholm T, Jensen GL, Correia MITD, et al. GLIM criteria for the diagnosis of malnutrition. <em>JPEN J Parenter Enteral Nutr.</em> 2019;43(1):32–40. &nbsp;|&nbsp; Screen first with NRS-2002, MNA, or MUST → diagnose with GLIM → grade severity → plan intervention.'
    + '</div></div>';
}

// ── SECTION ACCORDION ────────────────────────────────────────


// ── #9 DEBOUNCED LIVE ANTHROPOMETRICS ─────────────────────────
let _liveAnthroTimer = null;

// ════════════════════════════════════════════════════════════════
// ANTHROPOMETRY CALCULATORS — From Adult Clinical Nutrition Logbook
// Lee & Nieman, Gibson, CMAM Guidelines 2017
// ════════════════════════════════════════════════════════════════

// Adult MUAC interpretation (CMAM Guidelines 2017)
function interpAdultMUAC(muacCm, isFemale, isPregnant) {
  if (isPregnant) {
    if (muacCm < 19)   return { text:'Severe wasting (<19 cm)', col:'var(--red)' };
    if (muacCm < 23)   return { text:'Moderate wasting (19–23 cm)', col:'var(--amber)' };
    return               { text:'No wasting (≥23 cm)', col:'var(--green)' };
  }
  if (muacCm < 19)     return { text:'Severe wasting (<19 cm)', col:'var(--red)' };
  if (muacCm < 22)     return { text:'Moderate wasting (19–21.9 cm)', col:'var(--amber)' };
  return                 { text:'No wasting (≥22 cm)', col:'var(--green)' };
}

// Waist circumference interpretation (WHO Action Levels)
function interpWaist(waistCm, isFemale) {
  const l1 = isFemale ? 80  : 94;
  const l2 = isFemale ? 88  : 102;
  if (waistCm < l1)  return { text:'Low risk (Action Level 1)', col:'var(--green)' };
  if (waistCm < l2)  return { text:'Be aware — avoid weight gain (AL 2: '+(isFemale?'80–87.9':'94–101.9')+' cm)', col:'var(--amber)' };
  return               { text:'Seek advice — lose/maintain weight (AL 3: >'+(isFemale?'88':'102')+' cm)', col:'var(--red)' };
}

// Oedema/Ascites dry weight correction
const OEDEMA_CORRECTION = {
  none:0, mild:-1.0, moderate:-5.0, severe:-10.0,
  ascites_min:-2.2, ascites_mod:-6.0, ascites_sev:-14.0
};

// Height from Knee Height (Lee & Nieman)
function calcKH() {
  const kh   = parseFloat(document.getElementById('kh-val')?.value);
  const age  = parseFloat(document.getElementById('kh-age')?.value) || 35;
  const race = document.getElementById('kh-race')?.value || 'white';
  const sex  = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const el   = document.getElementById('kh-result');
  if (!kh || !el) return;
  let s;
  // Use 19-60 adult equations (most common; extend logic for 6-18 and >60 if needed)
  if (sex === 'male') {
    s = race === 'black' ? 73.42 + 1.79*kh : 71.85 + 1.88*kh;
  } else {
    s = race === 'black' ? 68.10 + 1.86*kh - 0.06*age : 70.25 + 1.87*kh - 0.06*age;
  }
  el.textContent = `Estimated height: ${s.toFixed(1)} cm`;
}

// Height from Demi-Span (Gibson)
function calcDS() {
  const ds  = parseFloat(document.getElementById('ds-val')?.value);
  const age = parseFloat(document.getElementById('ds-age')?.value) || 35;
  const sex = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const el  = document.getElementById('ds-result');
  if (!ds || !el) return;
  let h;
  if (sex === 'male') {
    h = age <= 54 ? ds*1.3+68 : ds*1.2+71;
  } else {
    h = age <= 54 ? ds*1.3+62 : ds*1.2+67;
  }
  el.textContent = `Estimated height: ${h.toFixed(1)} cm`;
}

// Height from Ulna Length (lookup table — simplified linear interpolation)
// Key anchor points from table (Men <65yr: 32cm→1.94m, 18.5cm→1.46m; Women <65yr: 32cm→1.84m, 18.5cm→1.47m)
function calcUL() {
  const ul  = parseFloat(document.getElementById('ul-val')?.value);
  const sex = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const age = parseFloat(document.querySelector('input[name="age"]')?.value) || 40;
  const el  = document.getElementById('ul-result');
  if (!ul || !el) return;
  // Linear interpolation between anchor points
  let h;
  const isOld = age >= 65;
  if (sex === 'male') {
    // <65: 32→1.94, 18.5→1.46 (slope 0.0355/cm); ≥65: 32→1.87, 18.5→1.45 (slope 0.0311)
    h = isOld ? 1.87 - (32-ul)*0.0311 : 1.94 - (32-ul)*0.0355;
  } else {
    // <65: 32→1.84, 18.5→1.47 (slope 0.0274); ≥65: 32→1.84, 18.5→1.40 (slope 0.0326)
    h = isOld ? 1.84 - (32-ul)*0.0326 : 1.84 - (32-ul)*0.0274;
  }
  el.textContent = `Estimated height: ${(h*100).toFixed(1)} cm`;
}

// Weight estimation from KH + MAC (Lee & Nieman)
const WE_COEFF = {
  female: {
    '6_18':  { black:[0.71,2.59,-50.43], white:[0.77,2.47,-50.16] },
    '19_59': { black:[1.24,2.97,-82.48], white:[1.01,2.81,-66.04] },
    '60_80': { black:[1.50,2.58,-84.22], white:[1.09,2.68,-65.51] },
  },
  male: {
    '6_18':  { black:[0.59,2.73,-48.32], white:[0.68,2.64,-50.08] },
    '19_59': { black:[1.09,3.14,-83.72], white:[1.19,3.21,-86.82] },
    '60_80': { black:[0.44,2.86,-39.21], white:[1.10,3.07,-75.81] },
  }
};
function calcWE() {
  const kh   = parseFloat(document.getElementById('we-kh')?.value);
  const mac  = parseFloat(document.getElementById('we-mac')?.value);
  const ag   = document.getElementById('we-age')?.value || '19_59';
  const race = document.getElementById('we-race')?.value || 'white';
  const sex  = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const el   = document.getElementById('we-result');
  if (!kh || !mac || !el) return;
  const coeff = WE_COEFF[sex][ag][race];
  const wt = coeff[0]*kh + coeff[1]*mac + coeff[2];
  el.textContent = `Estimated weight: ${wt.toFixed(1)} kg (SEE ±${sex==='male'?'11.3':'10.6'} kg)`;
}

// Amputation adjusted weight
function calcAmp() {
  const wt    = parseFloat(document.getElementById('amputee-wt')?.value);
  const parts = document.getElementById('amp-part');
  const el    = document.getElementById('amp-result');
  if (!wt || !parts || !el) return;
  let totalPct = 0;
  Array.from(parts.selectedOptions).forEach(o => totalPct += parseFloat(o.value));
  if (!totalPct) { el.textContent = ''; return; }
  const adjWt = wt / (100 - totalPct) * 100;
  el.textContent = `Adjusted body weight: ${adjWt.toFixed(1)} kg (${totalPct}% amputated)`;
}

function calcObesityAdjBW() {
  const wt   = parseFloat(document.getElementById('ob-actual-wt')?.value);
  const ht   = parseFloat(document.getElementById('ob-height')?.value);
  const sex  = document.getElementById('ob-sex')?.value || 'male';
  const el   = document.getElementById('adj-bw-obesity-result');
  if (!el) return;
  if (!wt || !ht) { el.textContent = ''; return; }

  // Devine IBW
  const hIn = ht / 2.54;
  const ibw = Math.max(sex === 'male' ? 50 + 2.3 * (hIn - 60) : 45.5 + 2.3 * (hIn - 60), 30);
  const bmi  = wt / ((ht / 100) ** 2);

  if (bmi <= 30) {
    el.style.color = 'var(--text-dim)';
    el.textContent = `BMI ${bmi.toFixed(1)} ≤ 30 — obesity adjustment not applicable`;
    return;
  }

  const adjA = ibw + 0.25 * (wt - ibw);
  const adjB = ibw + 0.50 * (wt - ibw);
  el.style.color = 'var(--amber)';
  el.innerHTML =
    `<div>BMI: <strong style="color:var(--red)">${bmi.toFixed(1)}</strong> &nbsp;|&nbsp; IBW (Devine): <strong style="color:var(--teal)">${ibw.toFixed(1)} kg</strong></div>` +
    `<div style="color:var(--amber)">Eq. a — Glynn 25%: <strong>${adjA.toFixed(1)} kg</strong></div>` +
    `<div style="color:var(--blue)">Eq. b — Barak 50%: <strong>${adjB.toFixed(1)} kg</strong></div>`;
}

// Nitrogen Balance (ESPEN / Logbook formula)
function calcNB() {
  const vol  = parseFloat(document.getElementById('nb-urvol')?.value);
  const urea = parseFloat(document.getElementById('nb-urea')?.value);
  const pIn  = parseFloat(document.getElementById('nb-prot-in')?.value);
  const el   = document.getElementById('nb-result');
  if (!vol || !urea || !el) return;
  const un    = vol * urea * 0.028;           // Urinary nitrogen (urea-derived)
  const tun   = un * 1.2;                     // Total urinary nitrogen
  const totalNout = tun + 4;                  // + obligatory 4g N/24hr
  const nIn   = pIn ? pIn / 6.25 : null;     // Protein intake → N intake
  const nb    = nIn !== null ? nIn - totalNout : null;

  let stressLvl = '0 Normal';
  if (un >= 15) stressLvl = '3 Severe';
  else if (un >= 10) stressLvl = '2 Moderate';
  else if (un >= 5) stressLvl = '1 Mild';

  el.innerHTML = [
    `<div>Urinary N (urea-derived): <strong style="color:var(--teal)">${un.toFixed(2)} g/24h</strong></div>`,
    `<div>Total Urinary N (×1.2): <strong style="color:var(--teal)">${tun.toFixed(2)} g/24h</strong></div>`,
    `<div>Total N Output (TUN + 4g obligatory): <strong style="color:var(--amber)">${totalNout.toFixed(2)} g/24h</strong></div>`,
    `<div>Stress Level: <strong style="color:${un>=10?'var(--red)':un>=5?'var(--amber)':'var(--green)'}">Level ${stressLvl}</strong></div>`,
    nIn !== null ? `<div>N Intake from protein: <strong style="color:var(--blue)">${nIn.toFixed(2)} g/24h</strong></div>` : '',
    nb !== null ? `<div>Nitrogen Balance: <strong style="color:${nb>0?'var(--green)':'var(--red)'}">${nb>0?'+':''}${nb.toFixed(2)} g/24h (${nb>0?'Anabolic':'Catabolic'})</strong></div>` : '',
    nb !== null ? `<div style="color:var(--text-dim);font-size:9px">NPE:N₂ ratio: ${nIn>0?Math.round(pIn*4/nIn):' — '} (>150:1 normal · 100–150 moderate · 80–100 severe stress)</div>` : '',
  ].join('');
}


function liveAnthro() {
  clearTimeout(_liveAnthroTimer);
  _liveAnthroTimer = setTimeout(_liveAnthroCore, 200);
}
function _liveAnthroCore() {
  const ht = parseFloat(document.getElementById('height').value) || 0;
  const wt = parseFloat(document.getElementById('weight').value) || 0;
  const ubw = parseFloat(document.getElementById('a-ubw').value) || 0;
  const bar = document.getElementById('live-anthro-bar');
  if (!ht || !wt) { if(bar) bar.style.display='none'; return; }
  if(bar) bar.style.display='';

  const htCm = ht;
  const wtKg  = wt;
  const bmi = calculateBMI(wtKg, htCm);
  const hIn = htCm / 2.54;
  const sex = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const ibw = Math.max(sex==='male' ? 50+2.3*(hIn-60) : 45.5+2.3*(hIn-60), 30);
  const adjbw = bmi > 30 ? ibw + 0.25*(wtKg-ibw) : null;
  const bmiCat = classifyAdultBMI(bmi);
  const bmiCol = bmi<18.5?'var(--amber)':bmi<25?'var(--green)':bmi<30?'var(--amber)':'var(--red)';
  let wCalc = wtKg, wBasis = 'Actual BW';
  if(bmi>40){wCalc=adjbw;wBasis='AdjBW (BMI>40)';}
  else if(bmi>30){wCalc=ibw;wBasis='IBW (BMI>30)';}

  document.getElementById('live-bmi').textContent = bmi.toFixed(1);
  document.getElementById('live-bmi').style.color = bmiCol;
  document.getElementById('live-bmi-cat').textContent = bmiCat;
  document.getElementById('live-ibw').textContent = ibw.toFixed(1) + ' kg';
  document.getElementById('live-adjbw').textContent = adjbw ? adjbw.toFixed(1)+' kg' : 'N/A';
  document.getElementById('live-wcalc').textContent = wCalc.toFixed(1)+' kg ('+wBasis+')';

  // Adult MUAC
  const muacCm  = parseFloat(document.getElementById('a-muac')?.value);
  const isFem   = document.querySelector('input[name="sex"]:checked')?.value === 'female';
  const muacEl  = document.getElementById('a-muac-interp');
  const muacLv  = document.getElementById('live-muac-result');
  if (muacCm) {
    const m = interpAdultMUAC(muacCm, isFem, false);
    if (muacEl) { muacEl.textContent = m.text; muacEl.style.color = m.col; }
    if (muacLv) { muacLv.textContent = 'MUAC: ' + m.text; muacLv.style.color = m.col; }
  } else {
    if (muacEl) muacEl.textContent = '';
    if (muacLv) muacLv.textContent = '';
  }

  // Waist circumference
  const waistCm = parseFloat(document.getElementById('a-waist')?.value);
  const waistEl = document.getElementById('a-waist-interp');
  const waistLv = document.getElementById('live-waist-result');
  if (waistCm) {
    const w = interpWaist(waistCm, isFem);
    if (waistEl) { waistEl.textContent = w.text; waistEl.style.color = w.col; }
    if (waistLv) { waistLv.textContent = 'Waist: ' + w.text; waistLv.style.color = w.col; }
  } else {
    if (waistEl) waistEl.textContent = '';
    if (waistLv) waistLv.textContent = '';
  }

  // Oedema dry weight
  const oedemaGrade = document.getElementById('a-oedema-grade')?.value || 'none';
  const oedemaCorrKg = OEDEMA_CORRECTION[oedemaGrade] || 0;
  const dryWtEl = document.getElementById('a-oedema-dry');
  const dryWtLv = document.getElementById('live-dry-wt');
  if (oedemaCorrKg !== 0) {
    const dryWt = wtKg + oedemaCorrKg;
    const msg = `Est. dry weight: ${dryWt.toFixed(1)} kg (corrected ${oedemaCorrKg} kg)`;
    if (dryWtEl) { dryWtEl.textContent = msg; }
    if (dryWtLv) { dryWtLv.textContent = msg; dryWtLv.style.color = 'var(--blue)'; }
  } else {
    if (dryWtEl) dryWtEl.textContent = '';
    if (dryWtLv) dryWtLv.textContent = '';
  }

  // Obesity adjusted BW display in expander
  const adjbwObEl = document.getElementById('adj-bw-obesity-result');
  if (adjbwObEl && bmi > 30) {
    const adjA = ibw + 0.25*(wtKg-ibw);
    const adjB = ibw + 0.50*(wtKg-ibw);
    adjbwObEl.innerHTML = `Eq.a (25% lean, Glynn): <strong>${adjA.toFixed(1)} kg</strong> &nbsp;|&nbsp; Eq.b (50% lean, Barak): <strong>${adjB.toFixed(1)} kg</strong>`;
  } else if (adjbwObEl) {
    adjbwObEl.textContent = 'BMI ≤ 30 — adjustment not applicable';
    adjbwObEl.style.color = 'var(--text-dim)';
  }

  if (ubw) {
    const pubw = (wtKg/ubw*100).toFixed(1);
    const pEl = document.getElementById('live-pubw');
    pEl.textContent = pubw+'%';
    pEl.style.color = parseFloat(pubw)<85 ? 'var(--red)' : parseFloat(pubw)<95 ? 'var(--amber)' : 'var(--green)';
    document.getElementById('live-wt-status').textContent = parseFloat(pubw)<85 ? 'Significant loss' : parseFloat(pubw)<95 ? 'Mild loss' : 'Acceptable';

    // Auto-detect RF risk from weight loss — bidirectional (ticks and unticks)
    const h2  = document.getElementById('rf-h2');
    const m2  = document.getElementById('rf-m2');
    const b_h2  = document.getElementById('badge-rf-h2');
    const b_m2  = document.getElementById('badge-rf-m2');
    const shouldH2 = parseFloat(pubw) < 85;
    const shouldM2 = parseFloat(pubw) < 90;
    if (h2) {
      if (shouldH2 && !h2.getAttribute('data-manual')) { h2.checked = true; h2.setAttribute('data-auto-anthro','1'); if(b_h2) b_h2.classList.add('visible'); }
      else if (!shouldH2 && h2.getAttribute('data-auto-anthro')) { h2.checked = false; h2.removeAttribute('data-auto-anthro'); if(b_h2) b_h2.classList.remove('visible'); }
    }
    if (m2) {
      if (shouldM2 && !m2.getAttribute('data-manual')) { m2.checked = true; m2.setAttribute('data-auto-anthro','1'); if(b_m2) b_m2.classList.add('visible'); }
      else if (!shouldM2 && m2.getAttribute('data-auto-anthro')) { m2.checked = false; m2.removeAttribute('data-auto-anthro'); if(b_m2) b_m2.classList.remove('visible'); }
    }
  } else {
    document.getElementById('live-pubw').textContent = '—';
    document.getElementById('live-wt-status').textContent = 'Enter UBW';
  }

  // Auto-detect BMI-based RF risk — bidirectional (ticks and unticks)
  const h1  = document.getElementById('rf-h1');
  const m1  = document.getElementById('rf-m1');
  const b_h1  = document.getElementById('badge-rf-h1');
  const b_m1  = document.getElementById('badge-rf-m1');
  const shouldH1 = bmi > 0 && bmi < 16;
  const shouldM1 = bmi > 0 && bmi < 18.5;
  if (h1) {
    if (shouldH1 && !h1.getAttribute('data-manual')) { h1.checked = true; h1.setAttribute('data-auto-anthro','1'); if(b_h1) b_h1.classList.add('visible'); }
    else if (!shouldH1 && h1.getAttribute('data-auto-anthro')) { h1.checked = false; h1.removeAttribute('data-auto-anthro'); if(b_h1) b_h1.classList.remove('visible'); }
  }
  if (m1) {
    if (shouldM1 && !m1.getAttribute('data-manual')) { m1.checked = true; m1.setAttribute('data-auto-anthro','1'); if(b_m1) b_m1.classList.add('visible'); }
    else if (!shouldM1 && m1.getAttribute('data-auto-anthro')) { m1.checked = false; m1.removeAttribute('data-auto-anthro'); if(b_m1) b_m1.classList.remove('visible'); }
  }
  rfAutoAssess();
  // Note: syncNpoToRFAndGLIM is driven by its own inputs (npo-days, intake-pct, gi-function).
  // Calling it here caused double-fire on every height/weight keystroke — removed.
  glimAutoAssess();
}

// MODULE: ENERGY CALCULATIONS

// ─────────────────────────────────────────────────────────────────────────────
// SMART SYNC: NPO days + Intake % + GI function → Refeeding & GLIM criteria
// ─────────────────────────────────────────────────────────────────────────────
function syncNpoToRFAndGLIM() {
  const npoDays   = parseFloat(document.getElementById('npo-days')?.value)   || 0;
  const intakePct = parseFloat(document.getElementById('intake-pct')?.value) || null;
  const giFunc    = document.getElementById('gi-function')?.value || 'normal';

  const giIsImpaired = ['malabsorption','ileus','fistula','post_op'].includes(giFunc);
  const giIsPartial  = giFunc === 'partial';

  // ── Bidirectional auto-check helpers ───────────────────────────────────────
  // Uses data-auto-npo attribute to track which ticks came from this function.
  // Manual user ticks (no data-auto-npo) are never touched.
  function autoSet(cbId, badgeId, shouldBe, reason) {
    const cb    = document.getElementById(cbId);
    const badge = document.getElementById(badgeId);
    if (!cb) return;
    const wasAutoSet = cb.getAttribute('data-auto-npo') === '1';
    const isManual   = cb.checked && !wasAutoSet;
    if (shouldBe && !isManual) {
      cb.checked = true;
      cb.setAttribute('data-auto-npo', '1');
      if (badge) { badge.title = reason; badge.classList.add('visible'); }
    } else if (!shouldBe && wasAutoSet) {
      cb.checked = false;
      cb.removeAttribute('data-auto-npo');
      if (badge) badge.classList.remove('visible');
    }
  }

  // ── REFEEDING RISK SYNC ─────────────────────────────────────────────────
  autoSet('rf-h3', 'badge-rf-h3',
    npoDays >= 10,
    `Auto: NPO ${npoDays} days ≥ 10 days threshold`);

  autoSet('rf-m3', 'badge-rf-m3',
    npoDays >= 5,
    `Auto: NPO/poor intake ${npoDays} days ≥ 5 days threshold`);

  autoSet('rf-a3', null,
    giIsImpaired,
    `Auto: GI function — ${giFunc}`);

  // ── GLIM ETIOLOGIC — INTAKE CRITERION ──────────────────────────────────
  // Trigger only when there is actual intake/NPO evidence (not NPO alone).
  // NPO alone without intake% is ambiguous — require either ≤50% EER,
  // or <75% for ≥14 days, or GI malabsorption.
  let glimIntakeTrigger = false;
  let glimIntakeReason  = '';

  if (intakePct !== null && intakePct <= 50) {
    glimIntakeTrigger = true;
    glimIntakeReason  = `Auto: Intake ${intakePct}% ≤50% EER`;
  }
  if (intakePct !== null && intakePct < 75 && npoDays >= 14) {
    glimIntakeTrigger = true;
    glimIntakeReason  = `Auto: Intake <75% for ${npoDays} days (>2 wks)`;
  }
  if (giIsImpaired) {
    glimIntakeTrigger = true;
    glimIntakeReason  = `Auto: GI malabsorption / impaired function (${giFunc})`;
  }
  // NPO alone only triggers GLIM intake if ≥14 days (clinically significant duration)
  if (npoDays >= 14 && intakePct === null) {
    glimIntakeTrigger = true;
    glimIntakeReason  = `Auto: NPO ${npoDays} days — marked reduction >2 weeks`;
  }

  autoSet('glim-intake', 'badge-glim-intake', glimIntakeTrigger, glimIntakeReason);

  // ── UPDATE HINT LABELS ──────────────────────────────────────────────────
  const npoDaysHint   = document.getElementById('npo-days-hint');
  const intakePctHint = document.getElementById('intake-pct-hint');
  const giHint        = document.getElementById('gi-function-hint');

  if (npoDaysHint) {
    if (!npoDays) { npoDaysHint.textContent = ''; }
    else if (npoDays >= 10) { npoDaysHint.textContent = ' ≥10d → HIGH refeeding risk (rf-h3)'; npoDaysHint.style.color = '#ef4444'; }
    else if (npoDays >= 5)  { npoDaysHint.textContent = ' ≥5d → MODERATE risk (rf-m3)';         npoDaysHint.style.color = '#f0b429'; }
    else                    { npoDaysHint.textContent = ' <5 days — monitor intake';              npoDaysHint.style.color = '#34d399'; }
  }
  if (intakePctHint) {
    if (intakePct === null) { intakePctHint.textContent = ''; }
    else if (intakePct <= 25)  { intakePctHint.textContent = ' Critical intake deficit → GLIM etiologic'; intakePctHint.style.color = '#ef4444'; }
    else if (intakePct <= 50)  { intakePctHint.textContent = ' ≤50% EER → GLIM intake criterion triggered'; intakePctHint.style.color = '#f0b429'; }
    else if (intakePct <= 75)  { intakePctHint.textContent = ' Reduced intake — monitor closely'; intakePctHint.style.color = '#f0b429'; }
    else                       { intakePctHint.textContent = ' Adequate intake'; intakePctHint.style.color = '#34d399'; }
  }
  if (giHint) {
    const giMsg = {
      'normal':        '',
      'partial':       ' Partial absorption — consider supplementation',
      'malabsorption': ' Malabsorption → GLIM intake + RF risk triggered',
      'ileus':         ' GI dysmotility → enteral feeding approach requires clinical review',
      'fistula':       ' High-output fistula → track losses, advance feeds cautiously',
      'post_op':       ' Post-surgical — advance feeds cautiously'
    };
    giHint.textContent = giMsg[giFunc] || '';
    giHint.style.color = giIsImpaired ? '#ef4444' : giIsPartial ? '#f0b429' : '#34d399';
  }

  // Re-run downstream assessments
  if (typeof rfAutoAssess   === 'function') rfAutoAssess();
  if (typeof glimAutoAssess === 'function') glimAutoAssess();
}

function clearAll() {
  if (!confirm('Clear all calculator fields and start fresh?')) return;
  document.querySelectorAll('#tab-calculator input:not([type=radio]):not([type=checkbox]), #tab-calculator textarea, #tab-calculator select').forEach(el => {
    if (el.type === 'checkbox') el.checked = false;
    else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  document.querySelectorAll('#tab-calculator input[type=radio]').forEach(el => el.checked = false);
  try { document.getElementById('sm').checked = true; } catch(e){}
  try { document.getElementById('energy_method').value = 'weightbased'; toggleIC(); } catch(e){}
  try { document.getElementById('icu_phase').value = 'early'; } catch(e){}
  try { document.getElementById('stress_factor').value = '1.2'; } catch(e){}
  try { document.getElementById('results-section').style.display = 'none'; } catch(e){}
  try { document.getElementById('live-anthro-bar').style.display = 'none'; } catch(e){}
  try { document.getElementById('burns-card').style.display = 'none'; } catch(e){}
  lastCalcData = null;
  showToast('Calculator cleared');
}


// MODULE: 24HR DIETARY RECALL


/** Persist dietary recall data to sessionStorage (clears on tab close for privacy) */
function saveRecallState() {
  try { sessionStorage.setItem('nc_recall', JSON.stringify(recallData)); } catch (_) {}
}
/** Restore dietary recall data from sessionStorage */
function restoreRecallState() {
  try {
    const saved = sessionStorage.getItem('nc_recall');
    if (saved) recallData = JSON.parse(saved);
  } catch (_) {}
}

/** Persist meal plan data to sessionStorage */
function saveMpState() {
  try { sessionStorage.setItem('nc_mealplan', JSON.stringify(mpData)); } catch (_) {}
}
/** Restore meal plan data from sessionStorage */
function restoreMpState() {
  try {
    const saved = sessionStorage.getItem('nc_mealplan');
    if (saved) mpData = JSON.parse(saved);
  } catch (_) {}
}

// ── 24HR DIETARY RECALL ───────────────────────────────────────
const EXCHANGE_TYPES = {
  starch:    { label:'Starch',             kcal:80,  kj:335, cho:15, pro:3, fat:0,  color:'var(--teal)' },
  lean:      { label:'Protein (Lean)',     kcal:45,  kj:190, cho:0,  pro:7, fat:2,  color:'var(--blue)' },
  medium:    { label:'Protein (Med-fat)',  kcal:75,  kj:315, cho:0,  pro:7, fat:5,  color:'#7eb8ff' },
  highfat:   { label:'Protein (High-fat)',kcal:100, kj:420, cho:0,  pro:7, fat:8,  color:'var(--amber)' },
  milk_ff:   { label:'Milk (Fat-free)',    kcal:80,  kj:335, cho:12, pro:8, fat:0,  color:'#e0aaff' },
  milk_lf:   { label:'Milk (Low fat)',     kcal:120, kj:504, cho:12, pro:8, fat:5,  color:'#c77dff' },
  milk_fc:   { label:'Milk (Full cream)',  kcal:160, kj:672, cho:12, pro:8, fat:8,  color:'#9d4edd' },
  veg:       { label:'Vegetables',         kcal:25,  kj:105, cho:5,  pro:2, fat:0,  color:'var(--green)' },
  fruit:     { label:'Fruit',              kcal:60,  kj:250, cho:15, pro:0, fat:0,  color:'#ffdd57' },
  fat:       { label:'Fat',                kcal:45,  kj:190, cho:0,  pro:0, fat:5,  color:'#ff9f43' },
  sugar:     { label:'Sugar / Sweet',      kcal:60,  kj:240, cho:15, pro:0, fat:0,  color:'#ff6b9d' },
  alcohol:   { label:'Alcohol',            kcal:100, kj:420, cho:7,  pro:0, fat:0,  color:'var(--red)' },
};


let FCT_CATS = []; // populated async by chakudyaDB.js

const MEAL_NAMES = ['Breakfast','Mid-morning Snack','Lunch','Afternoon Snack','Dinner','Evening Snack'];
let recallData = {}; // { mealIndex: [{type, exchanges, label, kcal, pro, cho, fat, kj, mode}] }
let recallMode = 'exchange'; // 'exchange' or 'fct'

// ── 24HR RECALL: initialise on tab entry ──────────────────────────
let _recallTabMode = 'fct';
function recallSetMode(mode) {
  _recallTabMode = mode || 'fct';
  recallMode = 'fct'; // default global mode
  // Render meal cards if not yet rendered
  const container = document.getElementById('recall-meals');
  if (container && container.children.length === 0) renderRecallMeals();
}

function renderRecallMeals() {
  const container = document.getElementById('recall-meals');
  if (container.children.length > 0) return;
  MEAL_NAMES.forEach((meal, mi) => {
    if (!recallData[mi]) recallData[mi] = [];
    const div = document.createElement('div');
    div.className = 'recall-exchange-card';
    div.id = `meal-${mi}`;
    div.innerHTML = `
      <div class="meal-header">
        <div class="meal-title">${['','','','','',''][mi]} ${meal}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim)" id="meal-${mi}-kcal">0 kcal</div>
      </div>
      <!-- Exchange mode (hidden — UCT Exchange removed from 24-Hour Recall) -->
      <div id="meal-${mi}-exchange-row" class="recall-add-row" style="display:none">
        <div class="field-group">
          <label class="field-lbl"> Food Description</label>
          <input class="field-inp" id="meal-${mi}-desc" placeholder="e.g. Nsima with beans relish" style="font-size:11px">
        </div>
        <div class="field-group">
          <label class="field-lbl"> Exchange Type</label>
          <select class="field-inp" id="meal-${mi}-type" onchange="populateUctFoodList(${mi})" style="font-size:11px">
            ${Object.entries(EXCHANGE_TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label class="field-lbl"> UCT Food Lookup</label>
          <select class="field-inp" id="meal-${mi}-uct-food" onchange="uctFoodSelect(${mi})" style="font-size:10px;color:var(--text-dim)">
            <option value="">— Pick from UCT Exchange List —</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-lbl">✕ Exchanges</label>
          <input class="field-inp" id="meal-${mi}-qty" type="number" value="1" min="0.5" step="0.5" style="font-size:11px">
        </div>
        <div class="field-group" style="padding-top:18px">
          <button onclick="addRecallExchangeUCT(${mi})" style="
            display:flex;align-items:center;justify-content:center;gap:6px;
            background:linear-gradient(135deg,rgba(29,233,212,0.22),rgba(29,233,212,0.10));
            border:1.5px solid rgba(29,233,212,0.55);
            color:var(--teal);
            padding:9px 18px;
            border-radius:9px;
            cursor:pointer;
            font-family:var(--mono);
            font-size:10px;
            font-weight:700;
            letter-spacing:2px;
            white-space:nowrap;
            width:100%;
            transition:all .18s;
            box-shadow:0 2px 10px rgba(29,233,212,0.08);
          "
          onmouseover="this.style.background='linear-gradient(135deg,rgba(29,233,212,0.35),rgba(29,233,212,0.18))';this.style.boxShadow='0 4px 18px rgba(29,233,212,0.18)';this.style.borderColor='rgba(29,233,212,0.8)'"
          onmouseout="this.style.background='linear-gradient(135deg,rgba(29,233,212,0.22),rgba(29,233,212,0.10))';this.style.boxShadow='0 2px 10px rgba(29,233,212,0.08)';this.style.borderColor='rgba(29,233,212,0.55)'">
            <span style="font-size:13px;line-height:1">+</span> ADD
          </button>
        </div>
      </div>
      <!-- Mode toggle: MALAWI FCT | COMMERCIAL FORMULA | CHAKUDYA API (internal mode key stays 'fdc') -->
      <div style="display:flex;gap:0;margin-bottom:10px;background:var(--surface3);border:1px solid var(--border);border-radius:5px;overflow:hidden;width:fit-content">
        <button onclick="setMealMode(${mi},'fct',this)" style="font-family:var(--mono);font-size:9px;padding:5px 12px;border:none;background:var(--amber);color:#000;cursor:pointer;letter-spacing:1px;font-weight:700" id="meal-${mi}-btn-fct">MALAWI FCT</button>
        <button onclick="setMealMode(${mi},'formula',this)" style="font-family:var(--mono);font-size:9px;padding:5px 12px;border:none;background:none;color:var(--text-dim);cursor:pointer;letter-spacing:1px" id="meal-${mi}-btn-formula">COMMERCIAL FORMULA</button>
        <button onclick="setMealMode(${mi},'fdc',this)" style="font-family:var(--mono);font-size:9px;padding:5px 12px;border:none;background:none;color:var(--text-dim);cursor:pointer;letter-spacing:1px" id="meal-${mi}-btn-fdc">🌐 Chakudya API</button>
      </div>
      <!-- FCT mode — default active -->
      <div id="meal-${mi}-fct-row" style="display:block;padding:16px 18px;background:rgba(6,14,32,0.7);border:1px solid rgba(56,100,168,0.22);border-radius:12px;margin-bottom:12px;position:relative;">
        <div style="position:absolute;top:0;left:18px;right:18px;height:1px;background:linear-gradient(90deg,transparent,rgba(240,180,41,0.2),transparent)"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">
          <div class="field-group">
            <label class="field-lbl"> Food Category</label>
            <select class="field-inp" id="meal-${mi}-fct-cat" onchange="filterFctItems(${mi})" style="font-size:11px">
              <option value="">— All Categories —</option>
              ${FCT_CATS.map(c=>`<option value="${c}">${c}</option>`).join('')}
              <option value="Packaged Foods">📦 Packaged Foods</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-lbl" id="meal-${mi}-fct-food-lbl"> Food Item (Malawi FCT)</label>
            <select class="field-inp" id="meal-${mi}-fct-food" onchange="updateFctPortions(${mi})" style="font-size:11px">
              ${MALAWI_FCT.map(f=>`<option value="${f.id}">${f.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px;align-items:end">
          <div class="field-group">
            <label class="field-lbl"> Household Measure / Portion</label>
            <select class="field-inp" id="meal-${mi}-fct-portion" style="font-size:11px">
              <option>—</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-lbl">✕ Servings</label>
            <input class="field-inp" id="meal-${mi}-fct-qty" type="number" value="1" min="0.5" step="0.5" style="font-size:11px">
          </div>
          <div id="meal-${mi}-fct-info" style="font-family:var(--mono);font-size:9px;color:var(--teal);line-height:1.5;padding-bottom:4px"></div>
          <div class="field-group" style="padding-top:18px">
            <button onclick="addRecallFct(${mi})" style="
              display:flex;align-items:center;justify-content:center;gap:6px;
              background:linear-gradient(135deg,rgba(240,180,41,0.22),rgba(240,180,41,0.10));
              border:1.5px solid rgba(240,180,41,0.6);
              color:var(--amber);
              padding:9px 18px;
              border-radius:9px;
              cursor:pointer;
              font-family:var(--mono);
              font-size:10px;
              font-weight:700;
              letter-spacing:2px;
              white-space:nowrap;
              width:100%;
              transition:all .18s;
              box-shadow:0 2px 10px rgba(240,180,41,0.08);
            "
            onmouseover="this.style.background='linear-gradient(135deg,rgba(240,180,41,0.35),rgba(240,180,41,0.18))';this.style.boxShadow='0 4px 18px rgba(240,180,41,0.18)';this.style.borderColor='rgba(240,180,41,0.85)'"
            onmouseout="this.style.background='linear-gradient(135deg,rgba(240,180,41,0.22),rgba(240,180,41,0.10))';this.style.boxShadow='0 2px 10px rgba(240,180,41,0.08)';this.style.borderColor='rgba(240,180,41,0.6)'">
              <span style="font-size:13px;line-height:1">+</span> ADD
            </button>
          </div>
        </div>
      </div>
      <!-- Commercial Formula mode -->
      <div id="meal-${mi}-formula-row" style="display:none;padding:16px 18px;background:rgba(6,14,32,0.7);border:1px solid rgba(96,165,250,0.22);border-radius:12px;margin-bottom:12px;position:relative;">
        <div style="position:absolute;top:0;left:18px;right:18px;height:1px;background:linear-gradient(90deg,transparent,rgba(96,165,250,0.2),transparent)"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">
          <div class="field-group">
            <label class="field-lbl"> Formula Category</label>
            <select class="field-inp" id="meal-${mi}-formula-cat" onchange="filterFormulaItems(${mi})" style="font-size:11px">
              <option value="">— All Categories —</option>
              ${[...new Set(ENTERAL_DB.map(f=>f.cat))].map(c=>`<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="field-group">
            <label class="field-lbl"> Formula / ONS</label>
            <select class="field-inp" id="meal-${mi}-formula-item" onchange="updateFormulaNutrients(${mi})" style="font-size:11px">
              ${ENTERAL_DB.map((f,i)=>`<option value="${i}">${f.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end">
          <div class="field-group">
            <label class="field-lbl"> Volume (mL)</label>
            <input class="field-inp" id="meal-${mi}-formula-vol" type="number" value="200" min="10" step="10" style="font-size:11px" oninput="updateFormulaNutrients(${mi})">
          </div>
          <div class="field-group">
            <label class="field-lbl"> Description</label>
            <input class="field-inp" id="meal-${mi}-formula-desc" placeholder="e.g. Ensure Plus 200 mL" style="font-size:11px">
          </div>
          <div id="meal-${mi}-formula-info" style="font-family:var(--mono);font-size:9px;color:var(--blue);line-height:1.6;padding-bottom:4px"></div>
          <div class="field-group" style="padding-top:18px">
            <button onclick="addRecallFormula(${mi})" style="
              display:flex;align-items:center;justify-content:center;gap:6px;
              background:linear-gradient(135deg,rgba(96,165,250,0.22),rgba(96,165,250,0.10));
              border:1.5px solid rgba(96,165,250,0.6);
              color:var(--blue);
              padding:9px 18px;
              border-radius:9px;
              cursor:pointer;
              font-family:var(--mono);
              font-size:10px;
              font-weight:700;
              letter-spacing:2px;
              white-space:nowrap;
              width:100%;
              transition:all .18s;
              box-shadow:0 2px 10px rgba(96,165,250,0.08);
            "
            onmouseover="this.style.background='linear-gradient(135deg,rgba(96,165,250,0.35),rgba(96,165,250,0.18))';this.style.borderColor='rgba(96,165,250,0.85)'"
            onmouseout="this.style.background='linear-gradient(135deg,rgba(96,165,250,0.22),rgba(96,165,250,0.10))';this.style.borderColor='rgba(96,165,250,0.6)'">
              <span style="font-size:13px;line-height:1">+</span> ADD
            </button>
          </div>
        </div>
      </div>
      <!-- Chakudya API Online Search mode -->
      <div id="meal-${mi}-fdc-row" style="display:none;padding:16px 18px;background:rgba(6,14,32,0.7);border:1px solid rgba(96,165,250,0.22);border-radius:12px;margin-bottom:12px;position:relative;">
        <div style="position:absolute;top:0;left:18px;right:18px;height:1px;background:linear-gradient(90deg,transparent,rgba(96,165,250,0.25),transparent)"></div>
        <div style="font-family:var(--mono);font-size:8.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#60a5fa;margin-bottom:10px">🌐 Chakudya Nutrition Registry (CNR) — Live Search</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <input class="field-inp" id="meal-${mi}-fdc-q" placeholder="Search Chakudya database (e.g. avocado, oatmeal)…"
            style="flex:1;font-size:11px"
            onkeydown="if(event.key==='Enter')recallFdcSearch(${mi})">
          <button onclick="recallFdcSearch(${mi})" style="font-family:var(--mono);font-size:9px;font-weight:700;padding:7px 14px;border-radius:7px;cursor:pointer;white-space:nowrap;background:rgba(96,165,250,0.12);color:#60a5fa;border:1px solid rgba(96,165,250,0.35);letter-spacing:1px">SEARCH</button>
        </div>
        <div id="meal-${mi}-fdc-status" style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-bottom:6px;min-height:14px"></div>
        <div id="meal-${mi}-fdc-results"></div>
      </div>
      <div id="meal-${mi}-items"></div>
    `;
    container.appendChild(div);
    // Init FCT portions for first item
    updateFctPortions(mi);
  });
  updateRecallTotals();
}

function setMealMode(mi, mode, btn) {
  const exRow      = document.getElementById(`meal-${mi}-exchange-row`);
  const fctRow     = document.getElementById(`meal-${mi}-fct-row`);
  const formulaRow = document.getElementById(`meal-${mi}-formula-row`);
  const fdcRow     = document.getElementById(`meal-${mi}-fdc-row`);
  if (exRow)      exRow.style.display      = 'none';
  if (fctRow)     fctRow.style.display     = mode === 'fct'     ? '' : 'none';
  if (formulaRow) formulaRow.style.display = mode === 'formula' ? '' : 'none';
  if (fdcRow)     fdcRow.style.display     = mode === 'fdc'     ? '' : 'none';
  const fctBtn     = document.getElementById(`meal-${mi}-btn-fct`);
  const formulaBtn = document.getElementById(`meal-${mi}-btn-formula`);
  const fdcBtn     = document.getElementById(`meal-${mi}-btn-fdc`);
  if (fctBtn) {
    fctBtn.style.background = mode === 'fct' ? 'var(--amber)' : 'none';
    fctBtn.style.color      = mode === 'fct' ? '#000' : 'var(--text-dim)';
    fctBtn.style.fontWeight = mode === 'fct' ? '700' : 'normal';
  }
  if (formulaBtn) {
    formulaBtn.style.background = mode === 'formula' ? 'var(--blue)' : 'none';
    formulaBtn.style.color      = mode === 'formula' ? '#000' : 'var(--text-dim)';
    formulaBtn.style.fontWeight = mode === 'formula' ? '700' : 'normal';
  }
  if (fdcBtn) {
    fdcBtn.style.background = mode === 'fdc' ? 'rgba(96,165,250,0.18)' : 'none';
    fdcBtn.style.color      = mode === 'fdc' ? '#60a5fa' : 'var(--text-dim)';
    fdcBtn.style.fontWeight = mode === 'fdc' ? '700' : 'normal';
  }
}

function filterFormulaItems(mi) {
  const cat = document.getElementById(`meal-${mi}-formula-cat`).value;
  const sel = document.getElementById(`meal-${mi}-formula-item`);
  const filtered = cat ? ENTERAL_DB.filter(f => f.cat === cat) : ENTERAL_DB;
  // Store original indices so we can retrieve correct ENTERAL_DB entry
  sel.innerHTML = filtered.map(f => {
    const idx = ENTERAL_DB.indexOf(f);
    return `<option value="${idx}">${f.name}</option>`;
  }).join('');
  updateFormulaNutrients(mi);
}

function updateFormulaNutrients(mi) {
  const sel  = document.getElementById(`meal-${mi}-formula-item`);
  const vol  = parseFloat(document.getElementById(`meal-${mi}-formula-vol`)?.value) || 200;
  const info = document.getElementById(`meal-${mi}-formula-info`);
  if (!sel || !info) return;
  const f = ENTERAL_DB[parseInt(sel.value)];
  if (!f) { info.textContent = ''; return; }
  const factor = vol / 100;
  const kcal   = (f.kcalML * vol).toFixed(0);
  const pro    = (f.pro  * factor).toFixed(1);
  const cho    = (f.cho  * factor).toFixed(1);
  const fat    = (f.fat  * factor).toFixed(1);
  info.innerHTML = `<span style="color:var(--teal)">${kcal} kcal</span><br>${pro}g pro · ${cho}g CHO · ${fat}g fat`;
  // Auto-fill description if empty
  const descEl = document.getElementById(`meal-${mi}-formula-desc`);
  if (descEl && !descEl.value) descEl.value = `${f.name} ${vol} mL`;
}

function addRecallFormula(mi) {
  const sel   = document.getElementById(`meal-${mi}-formula-item`);
  const vol   = parseFloat(document.getElementById(`meal-${mi}-formula-vol`)?.value) || 200;
  const desc  = document.getElementById(`meal-${mi}-formula-desc`)?.value.trim();
  if (!sel) return;
  const f = ENTERAL_DB[parseInt(sel.value)];
  if (!f) return;
  const factor = vol / 100;
  const item = {
    label:  desc || `${f.name} ${vol} mL`,
    source: 'formula',
    kcal:   parseFloat((f.kcalML * vol).toFixed(1)),
    pro:    parseFloat((f.pro  * factor).toFixed(1)),
    cho:    parseFloat((f.cho  * factor).toFixed(1)),
    fat:    parseFloat((f.fat  * factor).toFixed(1)),
    fluid:  vol,
    qty:    1,
    detail: `${f.kcalML} kcal/mL · ${vol} mL · ${f.cat}`
  };
  if (!recallData[mi]) recallData[mi] = [];
  recallData[mi].push(item);
  renderMealItems(mi);
  updateRecallTotals();
  // Reset volume + desc
  const volEl  = document.getElementById(`meal-${mi}-formula-vol`);
  const descEl = document.getElementById(`meal-${mi}-formula-desc`);
  if (volEl)  volEl.value  = '200';
  if (descEl) descEl.value = '';
  updateFormulaNutrients(mi);
}

function filterFctItems(mi) {
  const cat   = document.getElementById(`meal-${mi}-fct-cat`).value;
  const sel   = document.getElementById(`meal-${mi}-fct-food`);
  const lblEl = document.getElementById(`meal-${mi}-fct-food-lbl`);

  if (cat === 'Packaged Foods') {
    // ── Packaged Foods branch ────────────────────────────────────────
    if (lblEl) lblEl.textContent = '\u{1F4E6} Food Item (Packaged Foods DB)';
    const db = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    if (!db || !db._docMap || !db._docMap.size) {
      sel.innerHTML = '<option value="">\u23F3 Loading packaged foods\u2026</option>';
      if (db && typeof db.onSync === 'function') {
        db.onSync(() => filterFctItems(mi));
      }
      updateFctPortions(mi);
      return;
    }
    const entries = [];
    db._docMap.forEach((doc, id) => {
      const name  = doc.name || doc.productName || id;
      const brand = doc.brand ? ` — ${doc.brand}` : '';
      entries.push({ id, label: `${name}${brand}` });
    });
    entries.sort((a, b) => a.label.localeCompare(b.label));
    sel.innerHTML = entries.map(e => `<option value="pkg:${e.id}">${e.label}</option>`).join('');
  } else {
    // ── Malawi FCT branch ────────────────────────────────────────────
    if (lblEl) lblEl.textContent = ' Food Item (Malawi FCT)';
    const filtered = cat ? MALAWI_FCT.filter(f => f.cat === cat) : MALAWI_FCT;
    sel.innerHTML  = filtered.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
  }

  updateFctPortions(mi);
}

function updateFctPortions(mi) {
  const foodId  = document.getElementById(`meal-${mi}-fct-food`)?.value;
  const portSel = document.getElementById(`meal-${mi}-fct-portion`);
  const infoEl  = document.getElementById(`meal-${mi}-fct-info`);
  if (!portSel) return;

  // ── Packaged Foods branch ─────────────────────────────────────────
  if (foodId && foodId.startsWith('pkg:')) {
    const pkgId = foodId.slice(4);
    const db    = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    const doc   = db?._docMap?.get(pkgId);
    if (!doc) { portSel.innerHTML = '<option>—</option>'; portSel._pkgMeasures = null; return; }

    const n          = doc.per100g || doc.nutrition || {};
    const kcal100    = +(n.kcal   ?? n.energy_kcal ?? 0);
    const pro100     = +(n.pro    ?? n.protein_g   ?? 0);
    const cho100     = +(n.cho    ?? n.carbs_g     ?? 0);
    const fat100     = +(n.fat    ?? n.fat_g       ?? 0);
    const kj100      = +(n.kj    ?? (kcal100 * 4.184));
    const servingSize = +(doc.servingSize ?? 100);
    const servingLabel = doc.servingLabel || doc.servingDescription || 'serving';
    const ratio      = servingSize / 100;
    const ratioHalf  = (servingSize / 2) / 100;

    const measures = [
      {
        lbl:  `1 serving \u2014 ${servingLabel} (${servingSize}g)`,
        kcal: Math.round(kcal100 * ratio),
        pro:  +((pro100 * ratio).toFixed(1)),
        cho:  +((cho100 * ratio).toFixed(1)),
        fat:  +((fat100 * ratio).toFixed(1)),
        kj:   Math.round(kj100  * ratio),
        grams: servingSize,
      },
      {
        lbl:  `\u00BD serving (${servingSize / 2}g)`,
        kcal: Math.round(kcal100 * ratioHalf),
        pro:  +((pro100 * ratioHalf).toFixed(1)),
        cho:  +((cho100 * ratioHalf).toFixed(1)),
        fat:  +((fat100 * ratioHalf).toFixed(1)),
        kj:   Math.round(kj100  * ratioHalf),
        grams: servingSize / 2,
      },
      {
        lbl:  '100 g',
        kcal: Math.round(kcal100),
        pro:  +pro100.toFixed(1),
        cho:  +cho100.toFixed(1),
        fat:  +fat100.toFixed(1),
        kj:   Math.round(kj100),
        grams: 100,
      },
    ];

    portSel._pkgMeasures = measures;
    portSel.innerHTML = measures.map((m, i) => `<option value="${i}">${m.lbl}</option>`).join('');
    const m0 = measures[0];
    if (infoEl) infoEl.innerHTML = `${m0.kcal} kcal<br>${m0.pro}g pro`;
    portSel.onchange = () => {
      const idx = parseInt(portSel.value) || 0;
      const mx  = measures[idx];
      if (infoEl) infoEl.innerHTML = `${mx.kcal} kcal<br>${mx.pro}g pro`;
    };
    return;
  }

  // ── Malawi FCT branch ─────────────────────────────────────────────
  portSel._pkgMeasures = null;
  const food = MALAWI_FCT.find(f => f.id === foodId);
  if (!food) return;
  portSel.innerHTML = food.measures.map((m, i) => `<option value="${i}">${m.lbl}</option>`).join('');
  const m = food.measures[0];
  if (infoEl) infoEl.innerHTML = `${m.kcal} kcal<br>${m.pro}g pro`;
  portSel.onchange = () => {
    const idx = parseInt(portSel.value) || 0;
    const mx  = food.measures[idx];
    if (infoEl) infoEl.innerHTML = `${mx.kcal} kcal<br>${mx.pro}g pro`;
  };
}

function addRecallFct(mi) {
  const foodId  = document.getElementById(`meal-${mi}-fct-food`)?.value;
  const portSel = document.getElementById(`meal-${mi}-fct-portion`);
  const qty     = parseFloat(document.getElementById(`meal-${mi}-fct-qty`).value) || 1;

  // ── Packaged Foods branch ─────────────────────────────────────────
  if (foodId && foodId.startsWith('pkg:')) {
    const pkgId   = foodId.slice(4);
    const db      = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    const doc     = db?._docMap?.get(pkgId);
    if (!doc) return;
    const measures = portSel?._pkgMeasures;
    if (!measures || !measures.length) return;
    const portIdx = parseInt(portSel?.value) || 0;
    const m       = measures[portIdx];
    if (!m) return;
    const name    = doc.name || doc.productName || pkgId;
    const brand   = doc.brand ? ` (${doc.brand})` : '';
    if (!recallData[mi]) recallData[mi] = [];
    recallData[mi].push({
      mode: 'fct', source: 'packaged',
      label: `${name}${brand} \u2014 ${m.lbl}`,
      baseKcal: m.kcal, basePro: m.pro, baseCho: m.cho, baseFat: m.fat, baseKj: m.kj,
      kcal: Math.round(m.kcal * qty),
      pro:  parseFloat((m.pro  * qty).toFixed(1)),
      cho:  parseFloat((m.cho  * qty).toFixed(1)),
      fat:  parseFloat((m.fat  * qty).toFixed(1)),
      kj:   Math.round(m.kj   * qty),
      exchanges: 1, qty,
    });
    document.getElementById(`meal-${mi}-fct-qty`).value = '1';
    renderMealItems(mi);
    updateRecallTotals();
    return;
  }

  // ── Malawi FCT branch ─────────────────────────────────────────────
  const food = MALAWI_FCT.find(f => f.id === foodId);
  if (!food) return;
  const portIdx = parseInt(portSel?.value) || 0;
  const m = food.measures[portIdx];
  if (!recallData[mi]) recallData[mi] = [];
  recallData[mi].push({
    mode: 'fct', label: `${food.name} \u2014 ${m.lbl}`,
    baseKcal: m.kcal, basePro: m.pro, baseCho: m.cho, baseFat: m.fat, baseKj: m.kj,
    kcal: Math.round(m.kcal * qty), pro: parseFloat((m.pro * qty).toFixed(1)),
    cho:  parseFloat((m.cho * qty).toFixed(1)), fat: parseFloat((m.fat * qty).toFixed(1)),
    kj: Math.round(m.kj * qty), exchanges: 1, qty,
  });
  document.getElementById(`meal-${mi}-fct-qty`).value = '1';
  renderMealItems(mi);
  updateRecallTotals();
}

function addRecallExchangeUCT(mi) {
  addRecallExchange(mi); // delegate to existing fn
}

function populateUctFoodList(mi) {
  const type = document.getElementById(`meal-${mi}-type`)?.value;
  const sel  = document.getElementById(`meal-${mi}-uct-food`);
  if (!sel || !type || typeof UCT_EXCHANGE_DB === 'undefined') return;
  const foods = UCT_EXCHANGE_DB.filter(f => f.exchange_type === type);
  sel.innerHTML = '<option value="">— Select from UCT Exchange List —</option>' +
    foods.map((f, i) => `<option value="${i}">${f.name} — ${f.portions[0]}</option>`).join('');
}

function uctFoodSelect(mi) {
  const type = document.getElementById(`meal-${mi}-type`)?.value;
  const sel  = document.getElementById(`meal-${mi}-uct-food`);
  const descEl = document.getElementById(`meal-${mi}-desc`);
  if (!sel || !type || !descEl) return;
  const idx = parseInt(sel.value);
  if (isNaN(idx)) return;
  const foods = UCT_EXCHANGE_DB.filter(f => f.exchange_type === type);
  const food  = foods[idx];
  if (food) descEl.value = food.name + ' — ' + food.portions[0];
}

function addRecallExchange(mi) {
  const desc = document.getElementById(`meal-${mi}-desc`).value.trim() || 'Food item';
  const type = document.getElementById(`meal-${mi}-type`).value;
  const exchanges = parseFloat(document.getElementById(`meal-${mi}-qty`).value) || 1;
  if (!recallData[mi]) recallData[mi] = [];
  recallData[mi].push({ mode:'exchange', type, exchanges, qty:1, label: desc });
  document.getElementById(`meal-${mi}-desc`).value = '';
  document.getElementById(`meal-${mi}-qty`).value = '1';
  const uctSel = document.getElementById(`meal-${mi}-uct-food`);
  if (uctSel) uctSel.value = '';
  renderMealItems(mi);
  updateRecallTotals();
}


function removeRecallItem(mi, idx) {
  recallData[mi].splice(idx, 1);
  renderMealItems(mi);
  updateRecallTotals();
}

// ── CHAKUDYA API SEARCH FOR RECALL ────────────────────────────────────────
const _recallFdcCache = {};

async function recallFdcSearch(mi) {
  const qEl   = document.getElementById(`meal-${mi}-fdc-q`);
  const stEl  = document.getElementById(`meal-${mi}-fdc-status`);
  const resEl = document.getElementById(`meal-${mi}-fdc-results`);
  if (!qEl || !resEl) return;
  const q = qEl.value.trim();
  if (!q) return;
  stEl.textContent = `Searching Chakudya for "${q}"…`;
  resEl.innerHTML  = '';

  try {
    let foods = _recallFdcCache[q.toLowerCase()];
    if (!foods) {
      const url = `https://chakudya-api.edisontaimu9.workers.dev/foods/lookup?q=${encodeURIComponent(q)}`;
      const r   = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error('Chakudya ' + r.status);
      const json = await r.json();
      // /foods/lookup returns one best match, not a list — wrap it so the
      // rest of this function (card rendering, add-to-recall) is unchanged.
      if (json.status === 'success' && json.data) {
        const d = json.data;
        const kcal = d.energy_kcal ?? d.kcal ?? null;
        foods = [{
          name:   d.food_name || d.product_name || d.name || q,
          cat:    d.category || 'Chakudya API',
          kcal,
          kj:     d.kj ?? (kcal != null ? +(kcal * 4.184).toFixed(0) : null),
          pro:    d.protein_g ?? d.pro ?? null,
          cho:    d.carbs_g   ?? d.cho ?? null,
          fat:    d.fat_g     ?? d.fat ?? null,
          fiber:  d.fiber_g   ?? d.fiber ?? null,
          sugar:  d.sugar_g   ?? d.sugar ?? null,
          sodium: (d.sodium_mg ?? d.sodium) != null ? +((d.sodium_mg ?? d.sodium) / 1000).toFixed(3) : null,
          sourceUsed: 'chakudya',
        }];
      } else {
        foods = [];
      }
      _recallFdcCache[q.toLowerCase()] = foods;
    }

    if (!foods.length) {
      stEl.textContent = 'No results — try a different spelling.';
      return;
    }
    stEl.textContent = `${foods.length} result${foods.length > 1 ? 's' : ''} · per 100 g · select grams then ADD`;
    resEl.innerHTML  =
      `<div style="display:flex;justify-content:flex-end;margin-bottom:6px">` +
      `<button onclick="clearRecallFdcResults(${mi})" style="font-family:var(--mono);font-size:8px;font-weight:700;padding:3px 10px;border-radius:5px;cursor:pointer;background:rgba(239,68,68,0.08);color:#f87171;border:1px solid rgba(239,68,68,0.3);letter-spacing:.5px">✕ CLOSE RESULTS</button>` +
      `</div>` +
      foods.map((f, i) => _recallFdcCard(f, i, mi)).join('');
    window[`_recallFdcHits_${mi}`] = foods;
  } catch (err) {
    stEl.textContent = 'Chakudya search failed — check connection. (' + (err.message || err) + ')';
  }
}

window.clearRecallFdcResults = function(mi) {
  const stEl  = document.getElementById(`meal-${mi}-fdc-status`);
  const resEl = document.getElementById(`meal-${mi}-fdc-results`);
  const qEl   = document.getElementById(`meal-${mi}-fdc-q`);
  if (resEl) resEl.innerHTML = '';
  if (stEl)  stEl.textContent = '';
  if (qEl)   qEl.value = '';
  window[`_recallFdcHits_${mi}`] = [];
};

function _recallFdcCard(food, i, mi) {
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmt = (v, d = 1) => v != null ? (+(+v).toFixed(d)) : '—';
  const extras = [];
  if (food.fiber  != null) extras.push(`Fiber ${fmt(food.fiber)}g`);
  if (food.sodium != null) extras.push(`Na ${fmt(food.sodium * 1000, 0)}mg`);
  return `
  <div style="background:var(--card,#131b26);border:1px solid rgba(96,165,250,0.18);border-radius:9px;overflow:hidden;margin-bottom:7px;animation:lfsUp .18s ease both;animation-delay:${i * 0.04}s">
    <div style="height:2px;background:linear-gradient(90deg,rgba(96,165,250,0.5),var(--teal,#1de9d4))"></div>
    <div style="padding:8px 12px 5px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--text);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(food.name)}">${esc(food.name)}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:1px">${esc(food.cat)}</div>
      </div>
      <span style="font-family:var(--mono);font-size:8px;font-weight:700;padding:2px 7px;border-radius:100px;white-space:nowrap;flex-shrink:0;background:rgba(96,165,250,.1);color:#60a5fa;border:1px solid rgba(96,165,250,.25)">Chakudya API</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--border)">
      <div style="padding:6px 4px;text-align:center;border-right:1px solid var(--border)">
        <span style="font-family:var(--mono);font-size:12px;font-weight:500;color:var(--teal)" id="rfv_${mi}_${i}_kcal">${fmt(food.kcal, 0)}</span>
        <span style="display:block;font-size:8px;color:var(--text-dim);margin-top:2px;text-transform:uppercase;letter-spacing:.07em">kcal</span>
      </div>
      <div style="padding:6px 4px;text-align:center;border-right:1px solid var(--border)">
        <span style="font-family:var(--mono);font-size:12px;font-weight:500;color:#60a5fa" id="rfv_${mi}_${i}_pro">${fmt(food.pro)}g</span>
        <span style="display:block;font-size:8px;color:var(--text-dim);margin-top:2px;text-transform:uppercase;letter-spacing:.07em">pro</span>
      </div>
      <div style="padding:6px 4px;text-align:center;border-right:1px solid var(--border)">
        <span style="font-family:var(--mono);font-size:12px;font-weight:500;color:var(--amber,#f0b429)" id="rfv_${mi}_${i}_cho">${fmt(food.cho)}g</span>
        <span style="display:block;font-size:8px;color:var(--text-dim);margin-top:2px;text-transform:uppercase;letter-spacing:.07em">carbs</span>
      </div>
      <div style="padding:6px 4px;text-align:center">
        <span style="font-family:var(--mono);font-size:12px;font-weight:500;color:var(--orange,#fb923c)" id="rfv_${mi}_${i}_fat">${fmt(food.fat)}g</span>
        <span style="display:block;font-size:8px;color:var(--text-dim);margin-top:2px;text-transform:uppercase;letter-spacing:.07em">fat</span>
      </div>
    </div>
    ${extras.length ? `<div style="padding:4px 12px;border-top:1px solid var(--border);font-family:var(--mono);font-size:9px;color:var(--text-dim)">${extras.join(' · ')}</div>` : ''}
    <div style="border-top:1px solid var(--border);padding:6px 12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <span style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim)">per</span>
      <input type="number" min="1" max="2000" value="100" id="rfg_${mi}_${i}"
        style="width:54px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-family:var(--mono);font-size:11px;font-weight:600;color:var(--text);outline:none;text-align:center"
        oninput="recallFdcRecalc(${mi},${i})"
        onfocus="this.style.borderColor='rgba(29,233,212,.5)'"
        onblur="this.style.borderColor='var(--border)'"/>
      <span style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim)">g</span>
      <button onclick="addRecallFdcFood(${mi},${i})"
        style="font-family:var(--mono);font-size:8.5px;font-weight:700;padding:3px 11px;border-radius:5px;cursor:pointer;margin-left:auto;background:rgba(29,233,212,.1);color:var(--teal,#1de9d4);border:1px solid rgba(29,233,212,.3);letter-spacing:.5px"
        id="rfadd_${mi}_${i}">+ ADD TO RECALL</button>
    </div>
  </div>`;
}

window.recallFdcRecalc = function(mi, i) {
  const hits = window[`_recallFdcHits_${mi}`];
  if (!hits) return;
  const food = hits[i]; if (!food) return;
  const g = parseFloat(document.getElementById(`rfg_${mi}_${i}`)?.value) || 100;
  const f = g / 100;
  [['kcal', 0], ['pro', 1], ['cho', 1], ['fat', 1]].forEach(([k, d]) => {
    const el = document.getElementById(`rfv_${mi}_${i}_${k}`);
    if (!el || food[k] == null) return;
    el.textContent = d === 0
      ? String(+(food[k] * f).toFixed(0))
      : (+(food[k] * f).toFixed(1)) + 'g';
  });
};

window.addRecallFdcFood = function(mi, i) {
  const hits = window[`_recallFdcHits_${mi}`];
  if (!hits) return;
  const food = hits[i]; if (!food) return;
  const g = parseFloat(document.getElementById(`rfg_${mi}_${i}`)?.value) || 100;
  const f = g / 100;
  const item = {
    mode:     'fct',
    label:    `${food.name} — ${g}g (Chakudya API)`,
    source:   'chakudya',
    baseKcal: food.kcal, basePro: food.pro, baseCho: food.cho, baseFat: food.fat, baseKj: food.kj,
    kcal: food.kcal != null ? Math.round(food.kcal * f) : 0,
    pro:  food.pro  != null ? parseFloat((food.pro  * f).toFixed(1)) : 0,
    cho:  food.cho  != null ? parseFloat((food.cho  * f).toFixed(1)) : 0,
    fat:  food.fat  != null ? parseFloat((food.fat  * f).toFixed(1)) : 0,
    kj:   food.kj   != null ? Math.round(food.kj   * f) : 0,
    exchanges: 1,
    qty: 1,
  };
  if (!recallData[mi]) recallData[mi] = [];
  recallData[mi].push(item);
  renderMealItems(mi);
  updateRecallTotals();
  // Mark button
  const btn = document.getElementById(`rfadd_${mi}_${i}`);
  if (btn) {
    btn.textContent = '✓ Added';
    btn.style.color = 'var(--teal)';
    btn.style.background = 'rgba(29,233,212,.18)';
    btn.disabled = true;
    setTimeout(() => {
      if (btn) { btn.textContent = '+ ADD TO RECALL'; btn.style.color = 'var(--teal,#1de9d4)'; btn.style.background = 'rgba(29,233,212,.1)'; btn.disabled = false; }
    }, 2000);
  }
  // Also offer to save to local DB
  if (typeof NT_CustomFoods !== 'undefined') NT_CustomFoods.add(food);
};

function renderMealItems(mi) {
  const container = document.getElementById(`meal-${mi}-items`);
  if (!container) return;
  const items = recallData[mi] || [];
  if (!items.length) { container.innerHTML = ''; return; }
  let mealKcal = 0;
  container.innerHTML = items.map((item, idx) => {
    let kcal, pro, colorDot, typeLabel;
    if (item.source === 'chakudya') {
      kcal = item.kcal ?? 0;
      pro  = item.pro  ?? 0;
      colorDot = '#60a5fa'; typeLabel = 'CNR';
    } else if (item.mode === 'fct') {
      kcal = Math.round(item.baseKcal * item.qty);
      pro  = parseFloat((item.basePro  * item.qty).toFixed(1));
      item.kcal = kcal; item.pro = pro;
      colorDot = 'var(--amber)'; typeLabel = 'Malawi FCT';
    } else if (item.source === 'formula') {
      kcal = Math.round((item.kcal || 0) * (item.qty || 1));
      pro  = parseFloat(((item.pro  || 0) * (item.qty || 1)).toFixed(1));
      colorDot = 'var(--blue)';
      // Short label: just the category (3rd part of detail)
      const detailParts = (item.detail || '').split(' · ');
      typeLabel = detailParts[2] || 'Formula';
    } else {
      const ex = EXCHANGE_TYPES[item.type];
      if (!ex) { kcal = 0; pro = 0; colorDot = 'var(--text-dim)'; typeLabel = item.type || 'Unknown'; }
      else {
        kcal = Math.round(ex.kcal * item.exchanges * item.qty);
        pro  = parseFloat((ex.pro * item.exchanges * item.qty).toFixed(1));
        colorDot = ex.color; typeLabel = `${item.exchanges}× ${ex.label}`;
      }
    }
    mealKcal += kcal;
    const qty     = item.qty || 1;
    const isFdc   = item.source === 'chakudya';
    const qtyCtrl = isFdc
      ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-dim);white-space:nowrap">fixed g</span>`
      : `<button onclick="adjRecallQty(${mi},${idx},-0.5)" style="width:22px;height:22px;background:var(--surface3);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center">−</button>
        <span style="font-family:var(--mono);font-size:11px;color:var(--teal);min-width:22px;text-align:center">${qty}</span>
        <button onclick="adjRecallQty(${mi},${idx},0.5)" style="width:22px;height:22px;background:var(--surface3);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center">+</button>`;
    const fdcBadge = isFdc
      ? `<span style="font-family:var(--mono);font-size:7.5px;padding:1px 5px;border-radius:100px;background:rgba(96,165,250,.1);color:#60a5fa;border:1px solid rgba(96,165,250,.25);flex-shrink:0;white-space:nowrap">CNR</span>`
      : '';
    return `<div class="recall-item-row" id="rrow-${mi}-${idx}">
      <div style="width:8px;height:8px;border-radius:50%;background:${colorDot};flex-shrink:0"></div>
      <div class="ri-label" title="${item.label}">${item.label}</div>
      ${fdcBadge}
      <div class="ri-type">${typeLabel}</div>
      <div class="ri-qty">${qtyCtrl}</div>
      <div class="ri-kcal" style="color:${colorDot};font-family:var(--mono);font-size:11px">${kcal} kcal</div>
      <div class="ri-pro" style="font-family:var(--mono);font-size:11px">${pro}g pro</div>
      <button class="recall-del" onclick="removeRecallItem(${mi},${idx})">✕</button>
    </div>`;
  }).join('');
  const mealEl = document.getElementById(`meal-${mi}-kcal`);
  if (mealEl) mealEl.textContent = mealKcal + ' kcal';
}

function adjRecallQty(mi, idx, delta) {
  const item = (recallData[mi] || [])[idx];
  if (!item) return;
  const newQty = Math.max(0.5, Math.round(((item.qty || 1) + delta) * 10) / 10);
  item.qty = newQty;
  renderMealItems(mi);
  updateRecallTotals();
}

function updateRecallTotals() {
  let totKcal=0, totKj=0, totCho=0, totPro=0, totFat=0;
  const exchangeCounts = {};
  Object.keys(recallData).forEach(mi => {
    (recallData[mi]||[]).forEach(item => {
      if (item.source === 'chakudya') {
        totKcal += item.kcal  || 0;
        totKj   += item.kj   || 0;
        totCho  += item.cho  || 0;
        totPro  += item.pro  || 0;
        totFat  += item.fat  || 0;
        exchangeCounts['fdc'] = (exchangeCounts['fdc']||0) + 1;
      } else if (item.mode === 'fct') {
        const q = item.qty || 1;
        totKcal += (item.baseKcal||item.kcal||0)*q;
        totKj   += (item.baseKj  ||item.kj  ||0)*q;
        totCho  += (item.baseCho ||item.cho  ||0)*q;
        totPro  += (item.basePro ||item.pro  ||0)*q;
        totFat  += (item.baseFat ||item.fat  ||0)*q;
        exchangeCounts['fct'] = (exchangeCounts['fct']||0) + 1;
      } else if (item.source === 'formula') {
        const q = item.qty || 1;
        totKcal += (item.kcal||0)*q;
        totCho  += (item.cho ||0)*q;
        totPro  += (item.pro ||0)*q;
        totFat  += (item.fat ||0)*q;
        exchangeCounts['formula'] = (exchangeCounts['formula']||0) + 1;
      } else {
        const ex = EXCHANGE_TYPES[item.type];
        const q = (item.exchanges||1) * (item.qty||1);
        totKcal += ex.kcal * q; totKj += ex.kj * q;
        totCho  += ex.cho  * q; totPro += ex.pro * q; totFat += ex.fat * q;
        exchangeCounts[item.type] = (exchangeCounts[item.type]||0) + q;
      }
    });
  });
  totKcal=Math.round(totKcal); totKj=Math.round(totKj);
  totCho=Math.round(totCho); totPro=Math.round(totPro); totFat=Math.round(totFat);

  document.getElementById('rt-kcal').textContent = totKcal;
  document.getElementById('rt-kj').textContent   = totKj;
  document.getElementById('rt-cho').textContent  = totCho;
  document.getElementById('rt-pro').textContent  = totPro;
  document.getElementById('rt-fat').textContent  = totFat;

  // Adequacy bars
  const targetKcal = parseFloat(document.getElementById('recall-target-kcal')?.value) || 0;
  const targetPro  = parseFloat(document.getElementById('recall-target-pro')?.value)  || 0;
  if (targetKcal) {
    const pct = Math.min(Math.round(totKcal/targetKcal*100),150);
    document.getElementById('rf-kcal').style.width = Math.min(pct,100)+'%';
    document.getElementById('rf-kcal').style.background = pct>=90&&pct<=110?'var(--green)':pct<70?'var(--red)':'var(--amber)';
    document.getElementById('rp-kcal').textContent = pct+'% of target ('+targetKcal+' kcal)';
  }
  if (targetPro) {
    const pct = Math.min(Math.round(totPro/targetPro*100),150);
    document.getElementById('rf-pro').style.width = Math.min(pct,100)+'%';
    document.getElementById('rf-pro').style.background = pct>=90?'var(--green)':pct<70?'var(--red)':'var(--amber)';
    document.getElementById('rp-pro').textContent = pct+'% of target ('+targetPro+'g)';
  }
  const targetCho = parseFloat(document.getElementById('recall-target-cho')?.value) || 0;
  const targetFat = parseFloat(document.getElementById('recall-target-fat')?.value) || 0;
  const targetFluid = parseFloat(document.getElementById('recall-target-fluid')?.value) || 0;

  if (targetCho) {
    const pct = Math.min(Math.round(totCho/targetCho*100),150);
    document.getElementById('rf-cho').style.width = Math.min(pct,100)+'%';
    document.getElementById('rf-cho').style.background = pct>=90&&pct<=115?'var(--green)':pct<70?'var(--red)':'var(--amber)';
    document.getElementById('rp-cho').textContent = pct+'% of target ('+targetCho+'g)';
  } else {
    document.getElementById('rp-cho').textContent = '— set target above';
  }
  if (targetFat) {
    const pct = Math.min(Math.round(totFat/targetFat*100),150);
    document.getElementById('rf-fat').style.width = Math.min(pct,100)+'%';
    document.getElementById('rf-fat').style.background = pct>=90&&pct<=115?'var(--green)':pct<70?'var(--red)':'var(--amber)';
    document.getElementById('rp-fat').textContent = pct+'% of target ('+targetFat+'g)';
  } else {
    document.getElementById('rp-fat').textContent = '— set target above';
  }

  // Full dietary analysis table
  const analysisPanel = document.getElementById('recall-analysis-panel');
  const analysisTable = document.getElementById('recall-analysis-table');
  const hasAnyTarget  = targetKcal || targetCho || targetPro || targetFat;
  if (analysisPanel && analysisTable && hasAnyTarget) {
    analysisPanel.style.display = '';
    const aRow = (icon, name, actual, target, unit, note='') => {
      if (!target) return '';
      const pct    = Math.min(Math.round(actual/target*100), 200);
      const deficit= Math.round(target - actual);
      const status = pct >= 90 && pct <= 115 ? [' Adequate','var(--green)']
                   : pct < 70  ? [' Deficient','var(--red)']
                   : pct < 90  ? [' Low','var(--amber)']
                   : [' Excess','var(--amber)'];
      const barW   = Math.min(pct, 100);
      const barCol = status[1];
      return `<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">
        <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:var(--text);white-space:nowrap">${icon} ${name}</td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--text-bright);text-align:right">${actual}</td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:var(--text-dim);text-align:right">${target}</td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:${barCol};text-align:center;font-weight:700">${pct}%</td>
        <td style="padding:8px 10px;min-width:100px">
          <div style="height:6px;background:rgba(56,100,168,0.2);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${barW}%;background:${barCol};border-radius:3px;transition:width .4s"></div>
          </div>
        </td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:${status[1]}">${status[0]}</td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">${deficit > 0 ? '−'+deficit+' '+unit : deficit < -10 ? '+'+(Math.abs(deficit))+' '+unit+' excess' : '✓'}</td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:9.5px;color:var(--text-dim);font-style:italic">${note}</td>
      </tr>`;
    };

    // Energy balance
    const totalMacroKcal2 = totCho*4 + totPro*4 + totFat*9;
    const choKcal = totCho*4, proKcal = totPro*4, fatKcal = totFat*9;
    const choPctEnergy = totalMacroKcal2 > 0 ? Math.round(choKcal/totalMacroKcal2*100) : 0;
    const proPctEnergy = totalMacroKcal2 > 0 ? Math.round(proKcal/totalMacroKcal2*100) : 0;
    const fatPctEnergy = totalMacroKcal2 > 0 ? Math.round(fatKcal/totalMacroKcal2*100) : 0;

    analysisTable.innerHTML = `
      <div class="hscroll-table">
      <table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:11px;min-width:600px">
        <thead>
          <tr style="border-bottom:2px solid rgba(56,100,168,0.25)">
            <th style="padding:7px 10px;text-align:left;color:var(--text-dim);font-size:9px;letter-spacing:1px">NUTRIENT</th>
            <th style="padding:7px 10px;text-align:right;color:var(--text-dim);font-size:9px">INTAKE</th>
            <th style="padding:7px 10px;text-align:right;color:var(--text-dim);font-size:9px">TARGET</th>
            <th style="padding:7px 10px;text-align:center;color:var(--text-dim);font-size:9px">%</th>
            <th style="padding:7px 10px;color:var(--text-dim);font-size:9px">BAR</th>
            <th style="padding:7px 10px;text-align:center;color:var(--text-dim);font-size:9px">STATUS</th>
            <th style="padding:7px 10px;color:var(--text-dim);font-size:9px">DEFICIT / EXCESS</th>
            <th style="padding:7px 10px;color:var(--text-dim);font-size:9px">NOTE</th>
          </tr>
        </thead>
        <tbody>
          ${aRow('','Energy (kcal)', totKcal, targetKcal, 'kcal', 'Primary fuel')}
          ${aRow('','Carbohydrate (g)', totCho, targetCho, 'g', choPctEnergy+'% of energy intake')}
          ${aRow('','Protein (g)', totPro, targetPro, 'g', proPctEnergy+'% of energy intake')}
          ${aRow('','Fat (g)', totFat, targetFat, 'g', fatPctEnergy+'% of energy intake')}
          ${aRow('','Energy from CHO (kcal)', choKcal, targetCho?targetCho*4:0, 'kcal', 'CHO × 4')}
          ${aRow('','Energy from Protein (kcal)', proKcal, targetPro?targetPro*4:0, 'kcal', 'Pro × 4')}
          ${aRow('','Energy from Fat (kcal)', fatKcal, targetFat?targetFat*9:0, 'kcal', 'Fat × 9')}
        </tbody>
      </table>
      </div>
      <div style="margin-top:10px;padding:10px 12px;background:rgba(56,100,168,0.07);border-radius:6px;font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:1.8">
        <strong style="color:var(--text)">Energy source breakdown:</strong>
        CHO ${choPctEnergy}% · Protein ${proPctEnergy}% · Fat ${fatPctEnergy}% of total macro kcal (${totalMacroKcal2} kcal) ·
        Reference: 45–65% CHO · 10–35% protein · 20–35% fat (DRI/IOM AMDR) ·
        Total energy as calculated: ${totKcal} kcal ·
        ${targetKcal ? (totKcal >= targetKcal*0.9 && totKcal <= targetKcal*1.1 ?
          '<span style="color:var(--green)"> Energy intake within 10% of target</span>' :
          totKcal < targetKcal*0.9 ?
          '<span style="color:var(--red)"> Energy deficit: '+Math.round(targetKcal-totKcal)+' kcal/day</span>' :
          '<span style="color:var(--amber)"> Energy excess: '+Math.round(totKcal-targetKcal)+' kcal/day</span>') : ''}
      </div>
    `;
  } else if (analysisPanel) {
    analysisPanel.style.display = 'none';
  }

  // Macro distribution
  const totalMacroKcal = totCho*4 + totPro*4 + totFat*9;
  if (totalMacroKcal > 0) {
    const choPct = Math.round(totCho*4/totalMacroKcal*100);
    const proPct = Math.round(totPro*4/totalMacroKcal*100);
    const fatPct = Math.round(totFat*9/totalMacroKcal*100);
    document.getElementById('macro-dist-bars').innerHTML = `
      <div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span>Carbohydrate</span><span style="color:var(--amber)">${choPct}% (${totCho}g)</span></div><div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${choPct}%;background:var(--amber);border-radius:3px"></div></div></div>
      <div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span>Protein</span><span style="color:var(--blue)">${proPct}% (${totPro}g)</span></div><div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${proPct}%;background:var(--blue);border-radius:3px"></div></div></div>
      <div><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span>Fat</span><span style="color:var(--green)">${fatPct}% (${totFat}g)</span></div><div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${fatPct}%;background:var(--green);border-radius:3px"></div></div></div>
    `;
  }

  // Exchange count grid
  document.getElementById('exchange-count-grid').innerHTML = Object.entries(exchangeCounts).map(([k,v])=>{
    if (k==='fct') return `<div style="background:var(--surface3);border:1px solid var(--border);border-radius:6px;padding:8px 10px"><div style="color:var(--amber);font-size:14px;font-weight:700">${v}</div><div style="color:var(--text-dim);font-size:9px;letter-spacing:1px">MALAWI FCT ITEMS</div></div>`;
    if (k==='formula') return `<div style="background:var(--surface3);border:1px solid var(--border);border-radius:6px;padding:8px 10px"><div style="color:var(--blue);font-size:14px;font-weight:700">${v}</div><div style="color:var(--text-dim);font-size:9px;letter-spacing:1px">FORMULA ITEMS</div></div>`;
    const ex = EXCHANGE_TYPES[k];
    if (!ex) return '';
    return `<div style="background:var(--surface3);border:1px solid var(--border);border-radius:6px;padding:8px 10px"><div style="color:${ex.color};font-size:14px;font-weight:700">${v}</div><div style="color:var(--text-dim);font-size:9px;letter-spacing:1px">${ex.label.toUpperCase()}</div></div>`;
  }).join('');
}


// ── RECALL: sync targets from any calculator ─────────────────────────
function syncRecallFromCalc(sourceKey) {
  // Show source picker if multiple sources available
  const adult = CALC_SOURCES.adult.get();
  const pedi  = CALC_SOURCES.pedi.get();

  if (!sourceKey) {
    if (adult?.energy && pedi?.energy) {
      // Both available — show picker
      _showSyncPicker('recall-sync-status', 'syncRecallFromCalc');
      return;
    }
    sourceKey = adult?.energy ? 'adult' : pedi?.energy ? 'pedi' : null;
  }

  const d = sourceKey ? CALC_SOURCES[sourceKey]?.get() : getUniversalCalcData();
  if (!d || !d.energy) {
    showToast('Run a calculation first to sync requirements', 'warning'); return;
  }

  const kcal  = Math.round(d.energy);
  const pro   = Math.round(d.protein);
  const cho   = Math.round(kcal * 0.50 / 4);
  const fat   = Math.round(kcal * 0.30 / 9);
  const fluid = d.fluid || Math.round(35 * (parseFloat(d.weight) || 70));
  document.getElementById('recall-target-kcal').value  = kcal;
  document.getElementById('recall-target-cho').value   = cho;
  document.getElementById('recall-target-pro').value   = pro;
  document.getElementById('recall-target-fat').value   = fat;
  document.getElementById('recall-target-fluid').value = Math.round(fluid);
  if (d.weight) document.getElementById('recall-wt').value = parseFloat(d.weight).toFixed(1);

  const statusEl = document.getElementById('recall-sync-status');
  if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)"> Synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'} — edit any field to override</span>`;
  updateRecallTotals();
  showToast(`✓ Recall targets synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'}`, 'success');
}

// ── RECALL: auto-estimate targets from weight alone ───────────────
function recallAutoTargets() {
  const wt = parseFloat(document.getElementById('recall-wt')?.value);
  if (!wt || wt <= 0) return;
  const kcal  = Math.round(wt * 25);
  const cho   = Math.round(wt * 3);    // ~3 g/kg general
  const pro   = Math.round(wt * 1.2);  // 1.2 g/kg general
  const fat   = Math.round(wt * 0.8);  // 0.8 g/kg general
  const fluid = Math.round(wt * 35);   // 35 mL/kg
  document.getElementById('recall-target-kcal').value  = kcal;
  document.getElementById('recall-target-cho').value   = cho;
  document.getElementById('recall-target-pro').value   = pro;
  document.getElementById('recall-target-fat').value   = fat;
  document.getElementById('recall-target-fluid').value = fluid;
  const statusEl = document.getElementById('recall-sync-status');
  if(statusEl) statusEl.innerHTML = '<span style="color:var(--amber)"> Auto-estimated from weight ('+wt+' kg) — adjust per clinical context</span>';
  updateRecallTotals();
}

// ── MEAL PLANNER: mode selector (auto | manual | null) ───────────
let _mpPlanMode = null;
function mpSetPlanMode(mode) {
  _mpPlanMode = mode;
  const selector  = document.getElementById('mp-mode-selector');
  const autoSec   = document.getElementById('mp-auto-section');
  const manualSec = document.getElementById('mp-manual-section');
  if (!selector || !autoSec || !manualSec) return;
  if (mode === 'auto') {
    selector.style.display  = 'none';
    autoSec.style.display   = '';
    manualSec.style.display = 'none';
  } else if (mode === 'manual') {
    selector.style.display  = 'none';
    autoSec.style.display   = 'none';
    manualSec.style.display = '';
    renderMpMeals();
  } else {
    // null → back to selection screen
    selector.style.display  = '';
    autoSec.style.display   = 'none';
    manualSec.style.display = 'none';
  }
}

// ── MEAL PLANNER: handle manual entry ────────────────────────────
function mpManualEntry() {
  const kcal  = parseFloat(document.getElementById('mp-target-kcal')?.value) || 0;
  const cho   = parseFloat(document.getElementById('mp-target-cho')?.value)  || 0;
  const pro   = parseFloat(document.getElementById('mp-target-pro')?.value)  || 0;
  const fat   = parseFloat(document.getElementById('mp-target-fat')?.value)  || 0;
  const fluid = parseFloat(document.getElementById('mp-target-fluid')?.value)|| 0;
  mpRequirements.kcal  = kcal;
  mpRequirements.cho   = cho;
  mpRequirements.pro   = pro;
  mpRequirements.fat   = fat;
  mpRequirements.fluid = fluid;
  const status = document.getElementById('mp-calc-status');
  if(status) status.innerHTML = '<span style="color:var(--amber)">✏ Manual entry — sync from Calculator to overwrite</span>';
  updateMpTotals();
}

function clearRecall() {
  if (!confirm('Clear all 24hr recall data?')) return;
  recallData = {};
  document.getElementById('recall-meals').innerHTML = '';
  renderRecallMeals();
  showToast('Recall cleared');
}





let mpData = {}; // { mealIndex: [{name, portion, kcal, pro, cho, fat, kj}] }
const MP_MEAL_NAMES = [' Breakfast',' Mid-morning',' Lunch',' Afternoon Snack',' Dinner',' Evening Snack'];
let mpRequirements = { kcal: 0, pro: 0, fluid: 2000 };

function syncMealPlanFromCalc(sourceKey) {
  const adult = CALC_SOURCES.adult.get();
  const pedi  = CALC_SOURCES.pedi.get();

  if (!sourceKey) {
    if (adult?.energy && pedi?.energy) {
      _showSyncPicker('mp-calc-status', 'syncMealPlanFromCalc');
      return;
    }
    sourceKey = adult?.energy ? 'adult' : pedi?.energy ? 'pedi' : null;
  }

  const d = sourceKey ? CALC_SOURCES[sourceKey]?.get() : getUniversalCalcData();
  if (d && d.energy) {
    mpRequirements.kcal  = d.energy;
    mpRequirements.pro   = d.protein;
    mpRequirements.fluid = d.fluid || 2000;
    const _kcal = d.energy;
    const _pro  = d.protein;
    const _cho  = Math.round((_kcal * 0.50) / 4);
    const _fat  = Math.round((_kcal * 0.30) / 9);
    mpRequirements.cho = _cho;
    mpRequirements.fat = _fat;
    document.getElementById('mp-target-kcal').value  = Math.round(_kcal);
    document.getElementById('mp-target-cho').value   = _cho;
    document.getElementById('mp-target-pro').value   = Math.round(_pro);
    document.getElementById('mp-target-fat').value   = _fat;
    document.getElementById('mp-target-fluid').value = mpRequirements.fluid;
    document.getElementById('mp-calc-status').innerHTML = `<span style="color:var(--green)"> Synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'} — edit any field to override</span>`;
    const rke = document.getElementById('recall-target-kcal');
    const rpe = document.getElementById('recall-target-pro');
    if (rke) rke.value = Math.round(d.energy);
    if (rpe) rpe.value = Math.round(d.protein);
    showToast(`✓ Meal plan synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'}`, 'success');
  } else {
    document.getElementById('mp-calc-status').innerHTML = '<span style="color:var(--amber)"> Run calculator first to sync</span>';
  }
  updateMpTotals();
}

function filterMpFoods() {
  const cat = document.getElementById('mp-food-cat').value;
  const sel = document.getElementById('mp-food-item');
  const lbl = document.getElementById('mp-food-item-lbl');
  sel.innerHTML = '<option value="">— Select item —</option>';
  document.getElementById('mp-food-info').style.display = 'none';
  if (!cat) return;

  // ── Packaged Foods branch ──────────────────────────────────────────
  if (cat === 'packaged') {
    if (lbl) lbl.textContent = '📦 Food Item (Packaged Foods DB)';
    const db = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    if (!db || !db._docMap || !db._docMap.size) {
      sel.innerHTML = '<option value="">⏳ Loading packaged foods…</option>';
      if (db && typeof db.onSync === 'function') db.onSync(() => filterMpFoods());
      return;
    }
    const entries = [];
    db._docMap.forEach((doc, id) => {
      const name  = doc.name || doc.productName || id;
      const brand = doc.brand ? ` — ${doc.brand}` : '';
      entries.push({ id, label: `${name}${brand}` });
    });
    entries.sort((a, b) => a.label.localeCompare(b.label));
    sel.innerHTML = '<option value="">— Select item —</option>' +
      entries.map(e => `<option value="pkg:${e.id}">${e.label}</option>`).join('');
    sel.onchange = onMpFoodSelect;
    return;
  }

  // Reset label for all non-packaged branches
  if (lbl) lbl.textContent = 'Food Item';

  // Handle UCT exchange subcategory filters
  let foods;
  if (cat === 'exchange') {
    foods = UCT_EXCHANGE_DB;
  } else if (cat.startsWith('exchange_')) {
    const etype = cat.replace('exchange_', '');
    foods = UCT_EXCHANGE_DB.filter(f => f.exchange_type === etype);
  } else {
    foods = MP_FOODS[cat];
  }

  if (!foods || !foods.length) return;

  if (cat === 'exchange' || cat.startsWith('exchange_')) {
    foods.forEach((food, idx) => {
      const opt = document.createElement('option');
      opt.value = 'uct_' + idx + '_' + cat;
      const badge = { starch:'[S]',lean:'[P-L]',medium:'[P-M]',highfat:'[P-H]',
        milk_ff:'[M-FF]',milk_lf:'[M-LF]',milk_fc:'[M-FC]',veg:'[V]',
        fruit:'[F]',fat:'[FAT]',sugar:'[SU]',alcohol:'[ALC]',combo:'[C]' }[food.exchange_type] || '';
      opt.textContent = badge + ' ' + food.name + ' — ' + food.portions[0];
      sel.appendChild(opt);
    });
  } else {
    foods.forEach((food, idx) => {
      const opt = document.createElement('option');
      opt.value = cat + '_' + idx;
      opt.textContent = food.name;
      sel.appendChild(opt);
    });
  }
  sel.onchange = onMpFoodSelect;
}

function onMpFoodSelect() {
  const val = document.getElementById('mp-food-item').value;
  if (!val) { document.getElementById('mp-food-info').style.display = 'none'; return; }

  // ── Packaged Foods branch ──────────────────────────────────────────
  if (val.startsWith('pkg:')) {
    const pkgId  = val.slice(4);
    const db     = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    const doc    = db?._docMap?.get(pkgId);
    if (!doc) { document.getElementById('mp-food-info').style.display = 'none'; return; }

    const n          = doc.per100g || doc.nutrition || {};
    const kcal100    = +(n.kcal   ?? n.energy_kcal ?? 0);
    const pro100     = +(n.pro    ?? n.protein_g   ?? 0);
    const cho100     = +(n.cho    ?? n.carbs_g     ?? 0);
    const fat100     = +(n.fat    ?? n.fat_g       ?? 0);
    const kj100      = +(n.kj    ?? (kcal100 * 4.184));
    const servingSize  = +(doc.servingSize ?? 100);
    const servingLabel = doc.servingLabel || doc.servingDescription || 'serving';
    const ratio      = servingSize / 100;
    const ratioHalf  = (servingSize / 2) / 100;

    const measures = [
      {
        lbl:   `1 serving — ${servingLabel} (${servingSize}g)`,
        kcal:  Math.round(kcal100 * ratio),
        pro:   +((pro100 * ratio).toFixed(1)),
        cho:   +((cho100 * ratio).toFixed(1)),
        fat:   +((fat100 * ratio).toFixed(1)),
        kj:    Math.round(kj100  * ratio),
        grams: servingSize,
      },
      {
        lbl:   `½ serving (${servingSize / 2}g)`,
        kcal:  Math.round(kcal100 * ratioHalf),
        pro:   +((pro100 * ratioHalf).toFixed(1)),
        cho:   +((cho100 * ratioHalf).toFixed(1)),
        fat:   +((fat100 * ratioHalf).toFixed(1)),
        kj:    Math.round(kj100  * ratioHalf),
        grams: servingSize / 2,
      },
      {
        lbl:   '100 g',
        kcal:  Math.round(kcal100),
        pro:   +pro100.toFixed(1),
        cho:   +cho100.toFixed(1),
        fat:   +fat100.toFixed(1),
        kj:    Math.round(kj100),
        grams: 100,
      },
    ];

    const portSel = document.getElementById('mp-item-portion');
    portSel._pkgMeasures = measures;
    portSel.innerHTML = measures.map((m, i) => `<option value="${i}">${m.lbl}</option>`).join('');

    const showPkgInfo = (idx) => {
      const m    = measures[idx];
      const info = document.getElementById('mp-food-info');
      info.style.display = '';
      info.innerHTML = `<span style="color:var(--teal)">${m.kcal} kcal</span> · <span style="color:var(--blue)">${m.pro}g protein</span> · <span style="color:var(--amber)">${m.cho}g CHO</span> · <span style="color:var(--green)">${m.fat}g fat</span> · ${m.kj} kJ`;
      const name  = doc.name || doc.productName || pkgId;
      const brand = doc.brand ? ` (${doc.brand})` : '';
      document.getElementById('mp-item-desc').value = `${name}${brand} — ${m.lbl}`;
    };

    showPkgInfo(parseInt(portSel.value) || 0);
    portSel.onchange = () => showPkgInfo(parseInt(portSel.value) || 0);
    return;
  }

  // ── UCT / MP_FOODS branches ────────────────────────────────────────
  // Clear any stale packaged cache
  document.getElementById('mp-item-portion')._pkgMeasures = null;

  let food;
  if (val.startsWith('uct_')) {
    // UCT exchange food: format is uct_{index}_{cat}
    const parts = val.split('_');
    const uctIdx = parseInt(parts[1]);
    if (parts[2] === 'exchange') {
      food = UCT_EXCHANGE_DB[uctIdx];
    } else {
      const etype = parts.slice(2).join('_').replace('exchange_','');
      const filtered = UCT_EXCHANGE_DB.filter(f => f.exchange_type === etype);
      food = filtered[uctIdx];
    }
  } else {
    const [cat, idx] = val.split('_');
    food = MP_FOODS[cat][parseInt(idx)];
  }
  if (!food) { document.getElementById('mp-food-info').style.display = 'none'; return; }
  if (!food) return;
  // Update portions
  const portSel = document.getElementById('mp-item-portion');
  portSel.innerHTML = food.portions.map((p, i) => `<option value="${i}">${p}</option>`).join('');
  // Show info
  const pi = parseInt(portSel.value) || 0;
  showMpFoodInfo(food, pi);
  portSel.onchange = () => showMpFoodInfo(food, parseInt(portSel.value));
  // Pre-fill description
  document.getElementById('mp-item-desc').value = food.name + ' — ' + food.portions[pi];
}

function showMpFoodInfo(food, pi) {
  const info = document.getElementById('mp-food-info');
  info.style.display = '';
  const n = food.note ? `<div style="color:var(--amber);margin-top:4px">ℹ ${food.note}</div>` : '';
  info.innerHTML = `<span style="color:var(--teal)">${food.kcal[pi]} kcal</span> · <span style="color:var(--blue)">${food.pro[pi]}g protein</span> · <span style="color:var(--amber)">${food.cho[pi]}g CHO</span> · <span style="color:var(--green)">${food.fat[pi]}g fat</span> · ${food.kj[pi]} kJ${n}`;
  document.getElementById('mp-item-desc').value = food.name + ' — ' + food.portions[pi];
}

function addMpItem() {
  const val = document.getElementById('mp-food-item').value;
  const desc = document.getElementById('mp-item-desc').value.trim() || 'Food item';
  const mi = parseInt(document.getElementById('mp-item-meal').value);
  const initQty = parseFloat(document.getElementById('mp-item-qty')?.value) || 1;
  if (!val) { showToast('Select a food item first'); return; }

  // ── Packaged Foods branch ──────────────────────────────────────────
  if (val.startsWith('pkg:')) {
    const pkgId   = val.slice(4);
    const db      = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    const doc     = db?._docMap?.get(pkgId);
    if (!doc) { showToast('Packaged food not found'); return; }
    const portSel = document.getElementById('mp-item-portion');
    const measures = portSel?._pkgMeasures;
    if (!measures || !measures.length) { showToast('Select a portion first'); return; }
    const pi = parseInt(portSel.value) || 0;
    const m  = measures[pi];
    if (!m) return;
    if (!mpData[mi]) mpData[mi] = [];
    mpData[mi].push({
      source: 'packaged',
      desc, name: doc.name || doc.productName || pkgId, portion: m.lbl, qty: initQty,
      baseKcal: m.kcal, basePro: m.pro, baseCho: m.cho, baseFat: m.fat, baseKj: m.kj,
      kcal: Math.round(m.kcal * initQty),
      pro:  parseFloat((m.pro  * initQty).toFixed(1)),
      cho:  parseFloat((m.cho  * initQty).toFixed(1)),
      fat:  parseFloat((m.fat  * initQty).toFixed(1)),
      kj:   Math.round(m.kj   * initQty),
    });
    if (document.getElementById('mp-item-qty')) document.getElementById('mp-item-qty').value = '1';
    renderMpMeals();
    updateMpTotals();
    showToast('Added: ' + desc);
    return;
  }

  // ── UCT / MP_FOODS branches ────────────────────────────────────────
  let food;
  if (val.startsWith('uct_')) {
    const parts = val.split('_');
    const uctIdx = parseInt(parts[1]);
    const etype = parts.slice(2).join('_').replace('exchange_','');
    if (etype === 'exchange' || parts[2] === 'exchange' && parts.length === 3) {
      food = UCT_EXCHANGE_DB[uctIdx];
    } else {
      const filtered = UCT_EXCHANGE_DB.filter(f => f.exchange_type === etype);
      food = filtered[uctIdx];
    }
  } else {
    const [cat, idx] = val.split('_');
    food = MP_FOODS[cat][parseInt(idx)];
  }
  const pi = parseInt(document.getElementById('mp-item-portion').value) || 0;
  if (!mpData[mi]) mpData[mi] = [];
  mpData[mi].push({
    desc, name:food.name, portion:food.portions[pi], qty:initQty,
    baseKcal:food.kcal[pi], basePro:food.pro[pi], baseCho:food.cho[pi], baseFat:food.fat[pi], baseKj:food.kj[pi],
    kcal: Math.round(food.kcal[pi]*initQty), pro: parseFloat((food.pro[pi]*initQty).toFixed(1)),
    cho:  parseFloat((food.cho[pi]*initQty).toFixed(1)), fat: parseFloat((food.fat[pi]*initQty).toFixed(1)),
    kj:   Math.round(food.kj[pi]*initQty)
  });
  if (document.getElementById('mp-item-qty')) document.getElementById('mp-item-qty').value = '1';
  renderMpMeals();
  updateMpTotals();
  showToast('Added: ' + desc);
}

function renderMpMeals() {
  saveMpState();
  const grid = document.getElementById('mp-meals-grid');
  if (!grid) return;
  grid.innerHTML = '';
  MP_MEAL_NAMES.forEach((mname, mi) => {
    const items = mpData[mi] || [];
    const mealKcal = items.reduce((s, i) => {
      if (i.source === 'chakudya') return s + (i.kcal || 0);
      return s + Math.round((i.baseKcal||i.kcal||0)*(i.qty||1));
    }, 0);
    const div = document.createElement('div');
    div.className = 'card';
    div.style.marginBottom = '10px';
    div.innerHTML = `
      <div class="card-header">
        
        <div class="card-title">${mname.replace(/^.+?\s/,'')}</div>
        <div class="card-badge">${mealKcal} kcal</div>
      </div>
      <div class="card-body" style="padding:10px 14px">
        ${items.length === 0
          ? '<div style="color:var(--text-dim);font-family:var(--mono);font-size:10px;padding:6px 0">No items added yet</div>'
          : items.map((item, ii) => {
              const isFdc  = item.source === 'chakudya';
              const q      = item.qty || 1;
              const kcal   = isFdc ? (item.kcal || 0) : Math.round((item.baseKcal||item.kcal||0) * q);
              const pro    = isFdc ? (item.pro  || 0) : parseFloat(((item.basePro||item.pro||0) * q).toFixed(1));
              const badge  = isFdc
                ? `<span style="font-family:var(--mono);font-size:7.5px;padding:1px 5px;border-radius:100px;background:rgba(96,165,250,.1);color:#60a5fa;border:1px solid rgba(96,165,250,.25);white-space:nowrap;flex-shrink:0">CNR</span>`
                : '';
              const qtyCtrl = isFdc
                ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-dim);min-width:76px;text-align:center">fixed g</span>`
                : `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
                    <button onclick="adjMpQty(${mi},${ii},-0.5)" style="width:22px;height:22px;background:var(--surface3);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">−</button>
                    <span style="font-family:var(--mono);font-size:11px;color:var(--teal);min-width:28px;text-align:center">${q}</span>
                    <button onclick="adjMpQty(${mi},${ii},0.5)" style="width:22px;height:22px;background:var(--surface3);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">+</button>
                  </div>`;
              return `<div class="recall-item-row">
                <div style="flex:1;min-width:120px;color:var(--text-bright);font-family:var(--mono);font-size:11px;overflow-wrap:break-word;word-break:break-word;white-space:normal;padding-top:2px">${item.desc}</div>
                ${badge}
                ${qtyCtrl}
                <div style="color:${isFdc?'#60a5fa':'var(--teal)'};min-width:72px;text-align:right;font-family:var(--mono);font-size:11px">${kcal} kcal</div>
                <div style="color:var(--blue);min-width:55px;text-align:right;font-family:var(--mono);font-size:11px">${pro}g pro</div>
                <button class="recall-del" onclick="removeMpItem(${mi},${ii})">✕</button>
              </div>`;
            }).join('')
        }
      </div>`;
    grid.appendChild(div);
  });
}

function adjMpQty(mi, ii, delta) {
  const item = (mpData[mi] || [])[ii];
  if (!item) return;
  item.qty = Math.max(0.5, Math.round(((item.qty||1) + delta) * 10) / 10);
  item.kcal = Math.round((item.baseKcal||0) * item.qty);
  item.pro  = parseFloat(((item.basePro||0)  * item.qty).toFixed(1));
  item.cho  = parseFloat(((item.baseCho||0)  * item.qty).toFixed(1));
  item.fat  = parseFloat(((item.baseFat||0)  * item.qty).toFixed(1));
  item.kj   = Math.round((item.baseKj||0)   * item.qty);
  renderMpMeals();
  updateMpTotals();
}

function removeMpItem(mi, ii) {
  if (mpData[mi]) mpData[mi].splice(ii, 1);
  renderMpMeals();
  updateMpTotals();
}

function updateMpTotals() {
  let totKcal=0,totPro=0,totCho=0,totFat=0,totKj=0;
  Object.values(mpData).forEach(items => (items||[]).forEach(i=>{totKcal+=i.kcal;totPro+=i.pro;totCho+=i.cho;totFat+=i.fat;totKj+=i.kj;}));
  totKcal=Math.round(totKcal);totPro=Math.round(totPro);totCho=Math.round(totCho);totFat=Math.round(totFat);totKj=Math.round(totKj);
  document.getElementById('mp-tot-kcal').textContent=totKcal;
  document.getElementById('mp-tot-pro').textContent=totPro;
  document.getElementById('mp-tot-cho').textContent=totCho;
  document.getElementById('mp-tot-fat').textContent=totFat;
  document.getElementById('mp-tot-kj').textContent=totKj;
  // Read targets from input fields (manual or synced)
  const _tkEl=document.getElementById('mp-target-kcal'), _tpEl=document.getElementById('mp-target-pro');
  const _tcEl=document.getElementById('mp-target-cho'), _tfEl=document.getElementById('mp-target-fat');
  const tk=parseFloat(_tkEl?.value)||mpRequirements.kcal||0;
  const tp=parseFloat(_tpEl?.value)||mpRequirements.pro||0;
  const tc=parseFloat(_tcEl?.value)||mpRequirements.cho||0;
  const tf=parseFloat(_tfEl?.value)||mpRequirements.fat||0;
  // Keep mpRequirements in sync
  mpRequirements.kcal=tk; mpRequirements.pro=tp; mpRequirements.cho=tc; mpRequirements.fat=tf;
  if(tk){const pct=Math.min(Math.round(totKcal/tk*100),150);document.getElementById('mp-bar-kcal').style.width=Math.min(pct,100)+'%';document.getElementById('mp-bar-kcal').style.background=pct>=90&&pct<=110?'var(--green)':pct<70?'var(--red)':'var(--amber)';document.getElementById('mp-pct-kcal').textContent=pct+'% of '+tk+' kcal target';}
  if(tp){const pct=Math.min(Math.round(totPro/tp*100),150);document.getElementById('mp-bar-pro').style.width=Math.min(pct,100)+'%';document.getElementById('mp-bar-pro').style.background=pct>=90?'var(--green)':pct<70?'var(--red)':'var(--amber)';document.getElementById('mp-pct-pro').textContent=pct+'% of '+tp+'g target';}
  if(tc){const pct=Math.min(Math.round(totCho/tc*100),150);document.getElementById('mp-bar-cho').style.width=Math.min(pct,100)+'%';document.getElementById('mp-bar-cho').style.background=pct>=90&&pct<=115?'var(--green)':pct<70?'var(--red)':'var(--amber)';document.getElementById('mp-pct-cho').textContent=pct+'% of '+tc+'g CHO target';}
  else{document.getElementById('mp-pct-cho').textContent='CHO from calc';}
  if(tf){const pct=Math.min(Math.round(totFat/tf*100),150);document.getElementById('mp-bar-fat').style.width=Math.min(pct,100)+'%';document.getElementById('mp-bar-fat').style.background=pct>=90&&pct<=115?'var(--green)':pct<70?'var(--red)':'var(--amber)';document.getElementById('mp-pct-fat').textContent=pct+'% of '+tf+'g fat target';}
  else{document.getElementById('mp-pct-fat').textContent='Fat from calc';}
  // Macro distribution bars in meal planner
  const mpMacroKcal = totCho*4 + totPro*4 + totFat*9;
  const mpDistEl = document.getElementById('mp-macro-dist-bars');
  if(mpMacroKcal > 0 && mpDistEl){
    const choPct=Math.round(totCho*4/mpMacroKcal*100);
    const proPct=Math.round(totPro*4/mpMacroKcal*100);
    const fatPct=Math.round(totFat*9/mpMacroKcal*100);
    mpDistEl.innerHTML=`
      <div style="margin-bottom:8px"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:10px"><span style="color:var(--text-dim);flex-shrink:0">Carbohydrate</span><span style="color:var(--amber);overflow-wrap:break-word;word-break:break-word;text-align:right">${choPct}% (${totCho}g · ${totCho*4} kcal)</span></div><div style="height:7px;background:var(--surface3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${choPct}%;background:var(--amber);border-radius:4px;transition:width .5s"></div></div></div>
      <div style="margin-bottom:8px"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:10px"><span style="color:var(--text-dim);flex-shrink:0">Protein</span><span style="color:var(--blue);overflow-wrap:break-word;word-break:break-word;text-align:right">${proPct}% (${totPro}g · ${totPro*4} kcal)</span></div><div style="height:7px;background:var(--surface3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${proPct}%;background:var(--blue);border-radius:4px;transition:width .5s"></div></div></div>
      <div><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:10px"><span style="color:var(--text-dim);flex-shrink:0"> Fat</span><span style="color:var(--green);overflow-wrap:break-word;word-break:break-word;text-align:right">${fatPct}% (${totFat}g · ${totFat*9} kcal)</span></div><div style="height:7px;background:var(--surface3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${fatPct}%;background:var(--green);border-radius:4px;transition:width .5s"></div></div></div>
    `;
  }
  // Gap alert
  const gap = document.getElementById('mp-gap-alert');
  if(tk && totKcal < tk*0.75) {
    const deficit = tk - totKcal;
    gap.style.display='';
    gap.innerHTML=`<div class="alert warning"><span class="ai"></span><div>Energy gap: <strong>${deficit} kcal</strong> below target. Consider adding ONS or increasing portion sizes. ${tp && totPro < tp*0.75 ? `Protein gap: ${Math.round(tp-totPro)}g.` : ''}</div></div>`;
    document.getElementById('mp-ons-card').style.display='';
    document.getElementById('mp-ons-text').innerHTML=`<div style="margin-bottom:6px;color:var(--teal)">Suggested ONS to bridge the ${deficit} kcal gap:</div><div>• Fresubin Energy 200mL × ${Math.ceil(deficit/300)} bottle(s) = ~${Math.ceil(deficit/300)*300} kcal, ${Math.ceil(deficit/300)*11.2}g protein</div><div>• Ensure Plus 237mL × ${Math.ceil(deficit/350)} carton(s) = ~${Math.ceil(deficit/350)*350} kcal, ${Math.ceil(deficit/350)*13}g protein</div><div style="color:var(--text-dim);margin-top:6px">Prescribe ONS between meals, not as meal replacement.</div>`;
  } else {
    gap.style.display='none';
    document.getElementById('mp-ons-card').style.display='none';
  }
}

function clearMealPlan() {
  if (!confirm('Clear all meal plan items?')) return;
  mpData = {};
  renderMpMeals();
  updateMpTotals();
  showToast('Meal plan cleared');
}

// MODULE: ENTERAL FEEDING CALCULATOR

// ── ENTERAL FEEDING CALCULATOR ────────────────────────────────
const EN_FORMULAS = {
  fresubin_org: { name:'Fresubin Original', conc:1.0, pro:38, water:850 },
  fresubin_orig_fibre: { name:'Fresubin Original Fibre', conc:1.0, pro:38, water:850 },
  fresubin_1200: { name:'Fresubin 1200 Complete', conc:1.2, pro:60, water:770 },
  fresubin_energy: { name:'Fresubin Energy', conc:1.5, pro:56, water:780 },
  fresubin_energy_fibre: { name:'Fresubin Energy Fibre', conc:1.5, pro:56, water:760 },
  fresubin_hp_energy: { name:'Fresubin HP Energy', conc:1.5, pro:75, water:780 },
  fresubin_2kcal: { name:'Fresubin 2 kcal HP', conc:2.0, pro:100, water:690 },
  fresubin_3_2kcal: { name:'Fresubin 3.2 kcal DRINK', conc:3.2, pro:160, water:560 },
  fresubin_jucy: { name:'Fresubin Jucy DRINK', conc:1.5, pro:40, water:750 },
  diben: { name:'Diben', conc:1.0, pro:45, water:830 },
  diben_15: { name:'Diben 1.5 kcal HP', conc:1.5, pro:75, water:780 },
  survimed_opd: { name:'Survimed OPD', conc:1.0, pro:45, water:840 },
  survimed_hn: { name:'Survimed OPD HN', conc:1.0, pro:67, water:810 },
  supportan: { name:'Supportan', conc:1.5, pro:100, water:760 },
  supportan_drink: { name:'Supportan DRINK', conc:1.5, pro:100, water:760 },
  frebini_orig: { name:'Frebini Original', conc:1.0, pro:38, water:850 },
  frebini_energy: { name:'Frebini Energy Fibre', conc:1.5, pro:38, water:790 },
  intestamin: { name:'Intestamin', conc:1.0, pro:85, water:830 },
  // Nutricia — Nutrison Adult Tube Feed Range
  nutrison_std:          { name:'Nutrison Standard 1.0 kcal',        conc:1.0, pro:40,  water:840, cho:123, fat:39,  osm:255, fibre:0,   note:'Standard, fibre-free' },
  nutrison_std_mf:       { name:'Nutrison Std Multi-Fibre 1.0 kcal', conc:1.03,pro:40,  water:830, cho:123, fat:39,  osm:250, fibre:15,  note:'Standard + 15g fibre/L' },
  nutrison_energy:       { name:'Nutrison Energy 1.5 kcal',           conc:1.5, pro:60,  water:770, cho:183, fat:58,  osm:360, fibre:0,   note:'High energy, fibre-free' },
  nutrison_protein_plus: { name:'Nutrison Protein Plus MF 1.28 kcal',conc:1.28,pro:63,  water:790, cho:141, fat:49,  osm:280, fibre:15,  note:'High protein+energy+fibre' },
  nutrison_diason:       { name:'Nutrison Advanced Diason 1.0 kcal',  conc:1.0, pro:43,  water:840, cho:113, fat:42,  osm:300, fibre:15,  note:'Diabetic + 15g fibre/L · GI=17' },
  nutrison_peptisorb:    { name:'Nutrison Advanced Peptisorb 1.02',   conc:1.02,pro:40,  water:840, cho:176, fat:17,  osm:455, fibre:0,   note:'Semi-elemental, low fat' },
  nutrison_low_sodium:   { name:'Nutrison Low Sodium 1.0 kcal',       conc:1.0, pro:40,  water:840, cho:123, fat:39,  osm:205, fibre:0,   note:'Low Na (250 mg/L) + low protein' },
  custom: { name:'Custom Formula', conc:0, pro:0, water:800 }
};

/**
 * Debounce utility — delays fn execution until ms have elapsed since last call.
 * Used for enteral inputs (debouncedEnCalc) and burn equation preview.
 * @param {Function} fn  - Function to debounce
 * @param {number}   ms  - Delay in milliseconds
 * @returns {Function}
 */
function debounce(fn, ms = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

const debouncedEnCalc = debounce(enCalc, 350);

// Fix 2: Debounced wrappers for all auto-recalculate input handlers
const debouncedLiveAnthro   = debounce(function(){ if(typeof liveAnthro==='function') liveAnthro(); }, 350);
const debouncedRfAutoAssess = debounce(function(){ if(typeof rfAutoAssess==='function') rfAutoAssess(); }, 350);
const debouncedCalcKH       = debounce(function(){ if(typeof calcKH==='function') calcKH(); }, 350);
const debouncedCalcNB       = debounce(function(){ if(typeof calcNB==='function') calcNB(); }, 350);
const debouncedSyncNpo      = debounce(function(){ if(typeof syncNpoToRFAndGLIM==='function') syncNpoToRFAndGLIM(); }, 350);
const debouncedBurnPreview  = debounce(function(){ if(typeof burnEquationPreview==='function') burnEquationPreview(); }, 350);

// ════════════════════════════════════════════════════════════════
// ENTERAL FORMULA AUTO-SELECTION ENGINE
// Maps clinical diagnosis → recommended formula type + rationale
// Guidelines: ASPEN 2016 / ASPEN 2022, ESPEN 2019, NICE CG32, KDIGO, EASL
// ════════════════════════════════════════════════════════════════

const FORMULA_RECOMMENDATIONS = {
  // ── Renal ──────────────────────────────────────────────────────
  aki_no_rrt:      { formula:'nutrison_std',         reason:'Standard formula; protein 0.8–1.0 g/kg ABW (KDIGO AKI 2012 Ch.5.3.1). Do NOT restrict to CKD levels (0.6–0.8 g/kg) — avoid worsening catabolism. Avoid K⁺/PO₄-rich formulas.',                        badge:'RENAL', color:'var(--blue)' },
  aki_rrt:         { formula:'nutrison_protein_plus', reason:'Higher protein on RRT/CRRT: 1.0–1.5 g/kg on intermittent HD/PD (KDIGO Ch.5.3.2); up to 1.7 g/kg max on CRRT (KDIGO Ch.5.3.3). Limit K⁺ and PO₄. Account for 10–15 g/day AA losses through CRRT filter.',               badge:'RENAL', color:'var(--blue)' },
  ckd:             { formula:'nutrison_low_sodium',   reason:'Energy-dense, low K⁺/PO₄/Na⁺ formula. Restrict fluid to prevent overload. KDOQI 2020.',                             badge:'RENAL', color:'var(--blue)' },
  ckd_g1g2:        { formula:'nutrison_std',          reason:'CKD G1–G2 (eGFR ≥60): KDOQI 2020 has no protein restriction target at this stage. Standard formula. Prescribe at least RDA (0.8 g/kg IBW). Monitor electrolytes.',                            badge:'CKD G1-2', color:'var(--blue)' },
  ckd_g3a:         { formula:'nutrison_low_sodium',   reason:'CKD G3a: Low Na⁺/K⁺/PO₄ formula. Non-diabetic: 0.55–0.60 g/kg IBW (KDOQI G3.0.1). Diabetic: 0.6–0.8 g/kg (KDOQI G3.0.2). Monitor electrolytes.',                           badge:'CKD G3a', color:'var(--blue)' },
  ckd_g3b:         { formula:'nutrison_low_sodium',   reason:'CKD G3b: Low K⁺/PO₄/Na⁺ energy-dense formula. Non-diabetic: 0.55–0.60 g/kg IBW (KDOQI G3.0.1). Diabetic: 0.6–0.8 g/kg (KDOQI G3.0.2). Energy 25–35 kcal/kg.',             badge:'CKD G3b', color:'var(--blue)' },
  ckd_g4:          { formula:'nutrison_low_sodium',   reason:'CKD G4: Low K⁺/PO₄/Na⁺/fluid-restricted formula. Non-diabetic: 0.55–0.60 g/kg IBW; VLPD 0.28–0.43 g/kg + keto/AA analogues if supervised (KDOQI G3.0.1). Diabetic: 0.6–0.8 g/kg (KDOQI G3.0.2).', badge:'CKD G4', color:'var(--blue)' },
  ckd_g5:          { formula:'nutrison_low_sodium',   reason:'CKD G5 pre-dialysis: Strict K⁺/PO₄/Na⁺/fluid restriction. Non-diabetic: 0.55–0.60 g/kg or VLPD 0.28–0.43 g/kg + keto/AA analogues (KDOQI G3.0.1). Diabetic: 0.6–0.8 g/kg. Upon dialysis initiation: increase to 1.0–1.2 g/kg (KDOQI G3.0.3).',   badge:'CKD G5', color:'var(--blue)' },
  hd:              { formula:'nutrison_low_sodium',   reason:'HD: Low K⁺, PO₄, Na⁺ formula. Protein 1.0–1.2 g/kg dry weight (KDOQI 2020 G3.0.3). Dialysis removes potassium; monitor electrolytes closely.',                           badge:'RENAL', color:'var(--blue)' },
  pd:              { formula:'nutrison_low_sodium',   reason:'Low Na⁺, standard protein. PD provides ~300–500 kcal/day from dialysate glucose; adjust energy accordingly.',        badge:'RENAL', color:'var(--blue)' },
  nephrotic:       { formula:'nutrison_protein_plus', reason:'Nephrotic syndrome (not in KDOQI 2020): 0.8–1.0 g/kg IBW + urinary protein losses per NKF/KDIGO consensus. High-protein formula to compensate urinary losses (typically 5–20 g/day). Limit Na⁺.',                                      badge:'RENAL', color:'var(--blue)' },
  renal_transplant:{ formula:'fresubin_hp_energy',    reason:'High protein post-transplant (1.4–2.0 g/kg). Standard formula suitable once stable.',                                badge:'RENAL', color:'var(--blue)' },

  // ── Hepatic ────────────────────────────────────────────────────
  hepatic:         { formula:'fresubin_energy',       reason:'Standard polymeric formula. Do NOT restrict protein — even in hepatic encephalopathy. BCAA-enriched formula if protein intolerant. EASL 2019 / ESPEN Liver 2019.',            badge:'HEPATIC', color:'var(--amber)' },
  hepatic_severe:  { formula:'nutrison_std',          reason:'BCAA-enriched or standard polymeric. Protein restriction is NOT indicated even in severe HE — it worsens sarcopenia and ammonia clearance. Small frequent feeds including late evening snack. EASL 2019 / ESPEN Liver 2019.',            badge:'HEPATIC', color:'var(--amber)' },
  gi_fistula:      { formula:'survimed_opd',          reason:'Semi-elemental formula for proximal fistula. Reduces volume and pancreatic stimulation. Consider PN if output >500 mL/d.',badge:'GI', color:'var(--green)' },

  // ── Critical Care / ICU ────────────────────────────────────────
  sepsis:          { formula:'fresubin_hp_energy',    reason:'High-protein (1.2–2.0 g/kg), energy-dense formula. Avoid overfeeding in early phase. ASPEN 2016 / ASPEN 2022.',                  badge:'ICU', color:'var(--red)' },
  sepsis_severe:   { formula:'fresubin_hp_energy',    reason:'High-protein, energy-dense. Start at ≤70% target in day 1–2. Avoid hyperglycaemia. ASPEN 2016 / ASPEN 2022.',                   badge:'ICU', color:'var(--red)' },
  ards:            { formula:'fresubin_energy',       reason:'Energy-dense formula. Low volume to avoid fluid overload. Omega-3/antioxidant enriched if available. ASPEN 2016 / ASPEN 2022.',   badge:'ICU', color:'var(--red)' },
  burns:           { formula:'fresubin_hp_energy',    reason:'Very high protein (1.5–2.5 g/kg) + energy. High-protein, energy-dense formula essential. Curreri/Toronto equation.', badge:'BURNS', color:'var(--red)' },
  trauma:          { formula:'fresubin_hp_energy',    reason:'High protein (1.5–2.0 g/kg). Start EN within 24–48h. Energy-dense reduces volume load. ASPEN 2016 / ASPEN 2022.',                badge:'ICU', color:'var(--red)' },
  neuro:           { formula:'fresubin_energy',       reason:'Energy-dense, avoid fluid overload for ICP control. Standard protein (1.2–1.5 g/kg). ESPEN 2019.',                  badge:'NEURO', color:'var(--purple)' },
  stroke:          { formula:'fresubin_energy',       reason:'Standard polymeric. Consider texture modification for dysphagia. Start within 24h if aspirate safe. ESPEN 2019.',   badge:'NEURO', color:'var(--purple)' },
  spinal:          { formula:'nutrison_std',          reason:'Lower energy needs post-acute phase due to reduced muscle mass. Adjust protein for pressure injury risk.',             badge:'NEURO', color:'var(--purple)' },
  pancreatitis:    { formula:'survimed_opd',          reason:'Semi-elemental jejunal feeding preferred in severe AP. Reduces pancreatic stimulation. ESPEN 2019.',                  badge:'GI', color:'var(--green)' },
  general_icu:     { formula:'fresubin_energy',       reason:'Standard energy-dense formula. Titrate to 80% target in first 48h. ASPEN/ESPEN 2016.',                              badge:'ICU', color:'var(--red)' },
  post_op:         { formula:'fresubin_orig_fibre',   reason:'Standard polymeric with fibre. Early EN within 24h if haemodynamically stable. ESPEN 2019.',                        badge:'SURGICAL', color:'var(--teal)' },
  mechanical_vent: { formula:'fresubin_energy',       reason:'Energy-dense (1.5 kcal/mL) to minimise fluid volume. High protein to prevent ventilator-induced diaphragm atrophy.', badge:'ICU', color:'var(--red)' },
  cardiac:         { formula:'fresubin_energy',       reason:'Energy-dense, low-volume. Fluid restriction critical in cardiogenic shock. Monitor phosphate.',                       badge:'CARDIAC', color:'var(--red)' },

  // ── Respiratory ────────────────────────────────────────────────
  copd:            { formula:'fresubin_energy',       reason:'High-fat, low-CHO formula reduces CO₂ production and respiratory quotient (RQ). Pulmocare-type preferred.',          badge:'PULM', color:'var(--blue)' },
  copd_exac:       { formula:'fresubin_energy',       reason:'High-fat, low-CHO formula. Energy-dense reduces feed volume and diaphragm stress.',                                  badge:'PULM', color:'var(--blue)' },
  cf:              { formula:'fresubin_hp_energy',    reason:'Very high energy + protein. Pancreatic enzyme replacement essential. High-calorie, high-fat formula.',               badge:'PULM', color:'var(--blue)' },

  // ── Oncology ───────────────────────────────────────────────────
  cancer_solid:    { formula:'supportan',             reason:'Immune-modulating formula with omega-3, arginine. High protein (1.2–2.0 g/kg) to preserve lean mass. ESPEN 2021.',   badge:'ONCO', color:'var(--purple)' },
  cancer_head_neck:{ formula:'fresubin_hp_energy',    reason:'High-protein, energy-dense. Swallowing difficulty common — NGT/PEG feeding often required. ESPEN 2021.',            badge:'ONCO', color:'var(--purple)' },
  cancer_gi:       { formula:'survimed_opd',          reason:'Semi-elemental for GI malabsorption post-surgery. High protein. Monitor for dumping syndrome.',                      badge:'ONCO', color:'var(--purple)' },
  cachexia:        { formula:'supportan',             reason:'Immune-modulating with EPA/DHA. High protein + energy-dense formula. ESPEN Cancer Guidelines 2021.',                badge:'ONCO', color:'var(--purple)' },
  haem_malig:      { formula:'fresubin_hp_energy',    reason:'High protein post-BMT/chemo. Semi-elemental if mucositis/malabsorption. Low-microbial diet precautions.',           badge:'ONCO', color:'var(--purple)' },
  bmt:             { formula:'survimed_opd',          reason:'Semi-elemental during mucositis phase. High protein (1.5–2.0 g/kg). PN if GI tract not functional.',               badge:'ONCO', color:'var(--purple)' },
  post_chemo:      { formula:'fresubin_hp_energy',    reason:'High-protein to rebuild lean mass. Fibre-containing if GI tolerated. Monitor for refeeding risk.',                  badge:'ONCO', color:'var(--purple)' },

  // ── Diabetes / Metabolic ───────────────────────────────────────
  dm1:             { formula:'diben',                 reason:'Low-glycaemic-index, high-fat, low-CHO formula. Controls postprandial glucose. Diben/Nutrison Diason preferred.',    badge:'DM', color:'var(--amber)' },
  dm2:             { formula:'diben',                 reason:'Diabetes-specific formula (Diben/Diason). Reduces CHO % and glycaemic load. ADA MNT guidelines [Ref 83] and Krause 16th ed. [Ref 82].',             badge:'DM', color:'var(--amber)' },
  dm_icu:          { formula:'diben',                 reason:'Diabetes-specific formula in ICU. Tight glycaemic control target 7.8–10 mmol/L. Insulin sliding scale.',             badge:'DM', color:'var(--amber)' },
  obesity:         { formula:'fresubin_hp_energy',    reason:'Hypocaloric, high-protein strategy (≤70% energy, ≥2 g/kg IBW protein). ASPEN Obesity Guidelines 2016.',            badge:'OBESITY', color:'var(--amber)' },
  obesity_severe:  { formula:'fresubin_hp_energy',    reason:'Very high protein (2.0–2.5 g/kg IBW), hypocaloric. Protein-sparing modified fast approach.',                        badge:'OBESITY', color:'var(--amber)' },

  // ── Malnutrition / Wasting ─────────────────────────────────────
  sam:             { formula:'fresubin_orig_fibre',   reason:'Standard polymeric formula. Start low (50–75 kcal/kg/day) to avoid refeeding syndrome. WHO Phase 1→2 approach.',    badge:'MALNUT', color:'var(--amber)' },
  mam:             { formula:'fresubin_orig_fibre',   reason:'Standard polymeric formula. Advance gradually. RUTF/F-100 equivalent if oral feeding possible.',                    badge:'MALNUT', color:'var(--amber)' },
  refeeding_risk:  { formula:'nutrison_std',          reason:' START LOW: 5–10 kcal/kg/day. IV Thiamine 200–300 mg BEFORE feeds. Advance slowly over 5–7 days. Monitor PO₄/K⁺/Mg²⁺.',badge:'RF RISK', color:'var(--red)' },
  anorexia:        { formula:'nutrison_std',          reason:'Start very low (200–400 kcal/day). Increase by 200 kcal every 3–5 days. Monitor electrolytes for refeeding risk.',   badge:'MALNUT', color:'var(--amber)' },

  // ── GI / Malabsorption ─────────────────────────────────────────
  short_bowel:     { formula:'survimed_opd',          reason:'Semi-elemental formula reduces osmotic load and malabsorption. Low-fat if ileum absent. TPN if EN not tolerated.',   badge:'GI', color:'var(--green)' },
  ibd:             { formula:'survimed_opd',          reason:'Semi-elemental or polymeric in active IBD. EN reduces inflammation (Crohn\'s remission induction). ESPEN IBD 2017.', badge:'GI', color:'var(--green)' },
  malabsorption:   { formula:'survimed_hn',           reason:'Semi-elemental high-nitrogen formula. Pre-digested peptides improve absorption.',                                     badge:'GI', color:'var(--green)' },
  gi_surgery:      { formula:'fresubin_orig_fibre',   reason:'Standard polymeric with fibre post-GI surgery. Start within 24h of surgery if anastomosis safe. ESPEN 2019.',       badge:'SURGICAL', color:'var(--teal)' },
  dysphagia:       { formula:'fresubin_energy',       reason:'Energy-dense via NGT/PEG. Texture-modified oral feeds if swallow safe on FEES/VFSS (Rec 9, Rec 12 — ESPEN Neurology 2018, Burgos et al. Clin Nutr).',             badge:'GI', color:'var(--green)' },

  // ── Surgical / Trauma ──────────────────────────────────────────
  ortho_trauma:    { formula:'fresubin_hp_energy',    reason:'High protein (1.2–1.5 g/kg) for wound healing and bone repair. Vitamin D, calcium, zinc supplementation.',           badge:'SURGICAL', color:'var(--teal)' },
  pressure_injury: { formula:'fresubin_hp_energy',    reason:'High protein (1.5–2.0 g/kg) + arginine, vitamin C, zinc for wound healing. EPUAP/NPIAP Guidelines.',               badge:'WOUND', color:'var(--teal)' },

  // ── Infectious Disease ─────────────────────────────────────────
  hiv:             { formula:'fresubin_energy',       reason:'High energy (1.3–1.5× RMR) + protein (1.5–2.0 g/kg). Dense formula; micronutrient supplementation.',                badge:'HIV', color:'var(--purple)' },
  hiv_active:      { formula:'fresubin_hp_energy',    reason:'High protein + energy. Treat opportunistic infections. Monitor for drug-nutrient interactions.',                     badge:'HIV', color:'var(--purple)' },
  tb:              { formula:'fresubin_hp_energy',    reason:'High energy (40–45 kcal/kg) + protein (1.5 g/kg). Micronutrients (vit A, D, zinc) essential. Malawi NTCP 2021.',    badge:'TB', color:'var(--purple)' },
  tb_mdr:          { formula:'fresubin_hp_energy',    reason:'Increased needs (MDR-TB drugs affect appetite/metabolism). High protein + energy. Drug-nutrient monitoring.',        badge:'TB', color:'var(--purple)' },

  // ── Paediatric ─────────────────────────────────────────────────
  general:         { formula:'fresubin_org',          reason:'Standard polymeric formula (1 kcal/mL) appropriate for general ward. Advance as tolerated.',                        badge:'GENERAL', color:'var(--teal)' },
  other_specify:   { formula:'fresubin_org',          reason:'Standard polymeric formula — adjust formula selection based on the specific diagnosis documented.',                   badge:'CUSTOM',  color:'var(--teal)' },

  // ── Cardiac ────────────────────────────────────────────────────
  chf:             { formula:'fresubin_2kcal',        reason:'Ultra energy-dense (2 kcal/mL) to minimise fluid volume in fluid-restricted CHF patients.',                         badge:'CARDIAC', color:'var(--red)' },
  cardiac_cachexia:{ formula:'fresubin_2kcal',        reason:'Energy-dense, fluid-restricted. High protein (1.5 g/kg) to rebuild lean mass in cardiac cachexia.',                badge:'CARDIAC', color:'var(--red)' },
};

function getFormulaRecommendation(diagnosis, renal, hepatic) {
  // Priority: renal > hepatic > diagnosis-specific
  if (renal && renal !== 'normal' && renal !== 'none' && FORMULA_RECOMMENDATIONS[renal]) {
    return FORMULA_RECOMMENDATIONS[renal];
  }
  if (diagnosis && FORMULA_RECOMMENDATIONS[diagnosis]) {
    return FORMULA_RECOMMENDATIONS[diagnosis];
  }
  return FORMULA_RECOMMENDATIONS['general'];
}

function autoSelectFormula(diagnosis, renal, hepatic) {
  const rec = getFormulaRecommendation(diagnosis, renal, hepatic);
  if (!rec) return;

  const sel = document.getElementById('en-formula');
  if (!sel) return;

  // Try to set the formula
  const targetOpt = Array.from(sel.options).find(o => o.value === rec.formula);
  if (targetOpt) {
    sel.value = rec.formula;
    onFormulaChange();
  }

  // Show the recommendation banner
  renderFormulaBanner(rec, diagnosis, renal);
}

function renderFormulaBanner(rec, diagnosis, renal) {
  const formulaEl = document.getElementById('en-formula');
  const formulaLabel = formulaEl?.options[formulaEl.selectedIndex]?.text?.split('(')[0]?.trim() || '—';

  // ── Top recommendation panel ──
  const panel = document.getElementById('en-formula-rec-panel');
  const panelContent = document.getElementById('en-formula-rec-content');
  if (panel && panelContent) {
    panel.style.display = '';
    panelContent.innerHTML = `
      <span style="background:${rec.color};color:#fff;padding:1px 7px;border-radius:3px;font-size:8px;font-weight:700;letter-spacing:1px;margin-right:8px">${rec.badge}</span>
      <strong style="color:var(--text-bright)">${formulaLabel}</strong>
      <span style="color:var(--text-dim);margin-left:8px">${rec.reason}</span>`;
  }

  // ── Inline banner below dropdown ──
  let banner = document.getElementById('en-formula-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'en-formula-banner';
    const formulaGroup = document.getElementById('en-formula')?.closest('.field-group');
    if (formulaGroup) formulaGroup.appendChild(banner);
  }

  // Show AUTO badge on label
  const autoBadge = document.getElementById('en-formula-auto-badge');
  if (autoBadge) autoBadge.style.display = 'inline';

  banner.innerHTML = `
    <div style="margin-top:5px;padding:5px 10px;background:rgba(29,233,212,0.05);border:1px solid rgba(29,233,212,0.18);border-left:3px solid ${rec.color};border-radius:0 var(--r-sm) var(--r-sm) 0;font-family:var(--mono);font-size:8.5px;color:var(--teal)">
      ✓ Auto-selected · tap Formula dropdown to override
    </div>`;
}

function syncEnteralFromCalc(sourceKey) {
  const adult = CALC_SOURCES.adult.get();
  const pedi  = CALC_SOURCES.pedi.get();

  if (!sourceKey) {
    if (adult?.energy && pedi?.energy) {
      _showSyncPicker('en-sync-status', 'syncEnteralFromCalc');
      return;
    }
    sourceKey = adult?.energy ? 'adult' : pedi?.energy ? 'pedi' : null;
  }

  const d = sourceKey ? CALC_SOURCES[sourceKey]?.get() : getUniversalCalcData();
  if (!d || !d.energy) return;

  const netKcal = d.netEnergy || d.energy;
  document.getElementById('en-src-kcal').value   = Math.round(netKcal);
  document.getElementById('en-src-pro').value    = Math.round(d.protein);
  document.getElementById('en-src-fluid').value  = d.fluid || 2000;
  document.getElementById('en-src-offset').value = Math.round(d.energy - netKcal);

  const enStatus = document.getElementById('en-sync-status');
  if (enStatus) enStatus.innerHTML = `<span style="color:var(--green)"> Synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'} — edit any value to override</span>`;

  const diag  = d.diagnosis || 'general';
  const renal = d.renalRaw || d.renal     || 'normal';  // use raw key for formula lookup
  const hep   = d.hepatic   || 'none';
  autoSelectFormula(diag, renal, hep);

  showToast(` Enteral data synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'}`, 'success');
}

function onFormulaChange(manualOverride) {
  const fk = document.getElementById('en-formula').value;
  const customRow = document.getElementById('en-custom-row');
  if (fk === 'custom') {
    customRow.style.display = '';
  } else {
    customRow.style.display = 'none';
  }

  // If user manually changed formula, clear the auto banner
  if (manualOverride) {
    const banner = document.getElementById('en-formula-banner');
    if (banner) banner.innerHTML = '';
    const badge = document.getElementById('en-formula-auto-badge');
    if (badge) badge.style.display = 'none';
  }

  enCalc();
}

function toggleEnRfNote() {
  const isRF = document.querySelector('input[name="en-rf"]:checked')?.value === 'yes';
  const el = document.getElementById('en-rf-note');
  if (el) el.style.display = isRF ? '' : 'none';
  enCalc();
}

function enCalc() {
  const kcalNeed = parseFloat(document.getElementById('en-src-kcal').value) || 0;
  const proNeed = parseFloat(document.getElementById('en-src-pro').value) || 0;
  const fluidNeed = parseFloat(document.getElementById('en-src-fluid').value) || 2000;
  const medKcal = parseFloat(document.getElementById('en-med-kcal').value) || 0;
  const hours = parseFloat(document.getElementById('en-hours').value) || 24;
  const isRefeeding = document.querySelector('input[name="en-rf"]:checked')?.value === 'yes';
  const mode = document.getElementById('en-mode').value;
  const fk = document.getElementById('en-formula').value;

  let conc, proPerL, waterPerL, formulaName;
  let formulaCho = null, formulaFat = null, formulaOsm = null, formulaFibre = null, formulaNote = null;
  if (fk === 'custom') {
    conc = parseFloat(document.getElementById('en-custom-conc').value) || 1.0;
    proPerL = parseFloat(document.getElementById('en-custom-pro').value) || 40;
    waterPerL = parseFloat(document.getElementById('en-custom-water').value) || 850;
    formulaName = 'Custom Formula';
  } else {
    const f = EN_FORMULAS[fk];
    conc = f.conc; proPerL = f.pro; waterPerL = f.water; formulaName = f.name;
    formulaCho = f.cho||null; formulaFat = f.fat||null; formulaOsm = f.osm||null; formulaFibre = f.fibre !== undefined ? f.fibre : null; formulaNote = f.note||null;
  }
  if (!kcalNeed || !conc) return;

  const netKcal = Math.max(0, kcalNeed - medKcal);

  // Step 6: Volume per day
  let volDay = Math.round(netKcal / conc);
  if (mode === 'volume') volDay = Math.round(volDay / 100) * 100;

  // Step 7: Rate
  const rate = Math.round(volDay / hours);
  const rateStart = Math.round(rate * 0.5);
  const actualKcal = Math.round(volDay * conc);

  // Step 8: Protein check
  const proProvided = parseFloat(((volDay / 1000) * proPerL).toFixed(1));
  const proGap = parseFloat((proNeed - proProvided).toFixed(1));
  const proMet = proGap <= 0;

  // Step 9: Fluid from formula
  const fluidFromFormula = Math.round((volDay / 1000) * waterPerL);
  const fluidNeeded = Math.max(0, fluidNeed - fluidFromFormula);

  // Step 10: FWF calculation
  const fwfQ4 = Math.max(30, Math.round(fluidNeeded / 6 / 5) * 5); // round to 5mL, q4 = 6 times
  const fwfQ6 = Math.max(30, Math.round(fluidNeeded / 4 / 5) * 5); // q6 = 4 times
  const fwfActual = fwfQ4 * 6;

  // Step 11: Total fluid
  const totalFluid = fluidFromFormula + fwfActual;

  // DISPLAY — guard against en-results being wiped by ntClear before a fresh calculation
  const _enResultsEl = document.getElementById('en-results');
  if (!_enResultsEl || !document.getElementById('en-vol-day')) return;

  document.getElementById('en-vol-day').textContent = volDay;
  document.getElementById('en-rate').textContent = mode === 'volume' ? '—' : rate;
  document.getElementById('en-rate-start').textContent = mode === 'volume' ? '—' : rateStart;
  document.getElementById('en-kcal-actual').textContent = actualKcal;

  // Protein check table
  const proColor = proMet ? 'var(--green)' : 'var(--red)';
  document.getElementById('en-protein-check').innerHTML = `
    <tr><td>Formula</td><td class="c-t">${formulaName}</td></tr>
    <tr><td>Protein per litre</td><td>${proPerL} g/L</td></tr>
    ${formulaCho ? `<tr><td>CHO / Fat</td><td style="color:var(--text-dim)">${formulaCho} g/L CHO · ${formulaFat} g/L fat</td></tr>` : ''}
    ${formulaOsm ? `<tr><td>Osmolarity</td><td style="color:${formulaOsm > 400 ? 'var(--amber)' : 'var(--green)'}">${formulaOsm} mOsm/L ${formulaOsm > 400 ? ' high — monitor GI tolerance' : '✓ iso-osmolar'}</td></tr>` : ''}
    ${formulaFibre !== null ? `<tr><td>Fibre</td><td>${formulaFibre === 0 ? 'Fibre-free' : formulaFibre + ' g/L → ' + (formulaFibre*(volDay/1000)).toFixed(1) + ' g/day'}</td></tr>` : ''}
    <tr><td>Volume prescribed</td><td>${volDay} mL/day (${(volDay/1000).toFixed(2)} L)</td></tr>
    <tr><td>Protein provided</td><td style="color:${proColor};font-weight:700">${proProvided} g/day</td></tr>
    <tr><td>Protein target</td><td>${proNeed} g/day</td></tr>
    <tr><td>Protein gap</td><td style="color:${proGap>0?'var(--red)':'var(--green)'}">${proGap > 0 ? '+'+proGap+'g deficit — consider protein modular or adjust formula' : 'Met ✓'}</td></tr>
    ${proGap > 0 ? '<tr><td colspan="2" style="color:var(--amber);font-size:10px"> Add protein modular (e.g. Protifar) OR switch to higher-protein formula and recalculate</td></tr>' : ''}
  `;

  // Fluid table
  document.getElementById('en-fluid-check').innerHTML = `
    <tr><td>Total fluid target</td><td>${fluidNeed} mL/day</td></tr>
    <tr><td>Water from formula (${waterPerL} mL/L)</td><td>${fluidFromFormula} mL/day</td></tr>
    <tr><td>Remaining fluid needed</td><td>${fluidNeeded} mL/day</td></tr>
    <tr><td>Free Water Flush (Q4, 6×/day)</td><td class="c-t">${fwfQ4} mL Q4 (${fwfActual} mL/day total)</td></tr>
    <tr><td>Alternative: FWF Q6</td><td>${fwfQ6} mL Q6 (${fwfQ6*4} mL/day total)</td></tr>
    <tr><td>Total fluid delivered</td><td class="c-g">${totalFluid} mL/day (formula + Q4 FWF)</td></tr>
  `;

  // Step 12: Final prescription
  const rfWarning = isRefeeding ? '<div style="color:var(--amber)"> REFEEDING PROTOCOL: Start at 10–20 kcal/kg. IV Thiamine 200–300mg BEFORE feeding. Increase slowly. Monitor electrolytes 2–3× daily.</div>' : '';
  document.getElementById('en-prescription').innerHTML = `
    <div>Formula: <strong style="color:var(--teal)">${formulaName}</strong> · ${conc} kcal/mL · ${proPerL}g protein/L${formulaOsm ? ' · ' + formulaOsm + ' mOsm/L' : ''}</div>
    ${formulaNote ? `<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">ℹ ${formulaNote}</div>` : ''}
    ${formulaFibre !== null ? `<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">Fibre: <strong>${formulaFibre === 0 ? 'Fibre-free' : formulaFibre + ' g/L → ' + (formulaFibre*(volDay/1000)).toFixed(1) + ' g/day total'}</strong></div>` : ''}
    ${mode !== 'volume' ? `<div>Rate: <strong style="color:var(--amber)">${rate} mL/hr × ${hours} hrs/day</strong></div>` : `<div>Volume: <strong style="color:var(--amber)">${volDay} mL/day</strong> (volume-based — nursing to adjust rate to meet daily volume)</div>`}
    ${mode !== 'volume' ? `<div>Starting rate (Day 1): ${rateStart} mL/hr, advance to ${rate} mL/hr by Day 2–3</div>` : ''}
    <div>Total formula volume: ${volDay} mL/day → ${actualKcal} kcal/day | ${proProvided}g protein/day</div>
    <div>Free water flushes: <strong style="color:var(--blue)">${fwfQ4} mL Q4 hours</strong> (6 times/day = ${fwfActual} mL/day)</div>
    <div>Total fluid: ${totalFluid} mL/day</div>
    ${rfWarning}
    <div style="color:var(--text-dim);font-size:10px;margin-top:8px">Assess EN tolerance clinically (nausea, vomiting, distension) · Routine GRV monitoring not recommended (ASPEN/SCCM 2016) · BGL target 6.1–10.0 mmol/L · Reassess every 24–48h</div>
  `;

  // Alerts
  let alerts = '';
  if (rate > 150) alerts += `<div class="alert warning"><span class="ai"></span><div>Rate ${rate} mL/hr exceeds recommended max of 150 mL/hr for adults. Consider a higher concentration formula or volume-based ordering.</div></div>`;
  if (isRefeeding) alerts += `<div class="alert danger"><span class="ai"></span><div><strong>REFEEDING SYNDROME PRECAUTIONS ACTIVE:</strong> Start at 10–20 kcal/kg. IV Thiamine 200–300mg BEFORE starting feeds. Restrict fluid &lt;2L/day. Monitor K⁺, PO₄, Mg²⁺ 2–3× daily. Increase to goal over 5–7 days.</div></div>`;
  if (!proMet) alerts += `<div class="alert info"><span class="ai"></span><div>Protein not fully met by formula alone (${proProvided}g provided vs ${proNeed}g needed). Options: (1) Switch to higher-protein formula, (2) Add protein modular supplement, (3) Accept if patient is in early ICU phase.</div></div>`;
  document.getElementById('en-alerts').innerHTML = alerts;

  document.getElementById('en-results').style.display = '';
  // Log to Firestore
  try {
    const _enF = document.getElementById('en-formula')?.value || 'standard';
    const _enK = parseFloat(document.getElementById('en-src-kcal')?.value) || 0;
    const _enP = parseFloat(document.getElementById('en-src-pro')?.value) || 0;
    logCalcToFirebase({ calcType:'enteral', module:'enteral', formula:_enF, energy:_enK, protein:_enP });
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════

// ── ENTERAL CALCULATOR STATE ACCESSOR (for Oasis AI) ────────────
/**
 * getEnteralCalcState()
 * Collects all live inputs, formula details, computed outputs,
 * safety checklist status, and clinical metadata from the Enteral
 * Nutrition Calculator. Called by OasisAI to build rich context.
 *
 * Returns a structured state object, or null on error.
 * Exposed on window so oasisAI.js (loaded separately) can access it.
 */
function getEnteralCalcState() {
  try {
    const resultsEl  = document.getElementById('en-results');
    const hasResults = resultsEl && resultsEl.style.display !== 'none';

    // ── Inputs ──────────────────────────────────────────────────
    const fk         = document.getElementById('en-formula')?.value   || '';
    const kcalTarget = parseFloat(document.getElementById('en-src-kcal')?.value)   || 0;
    const proTarget  = parseFloat(document.getElementById('en-src-pro')?.value)    || 0;
    const fluidTarget= parseFloat(document.getElementById('en-src-fluid')?.value)  || 0;
    const medKcal    = parseFloat(document.getElementById('en-med-kcal')?.value)   || 0;
    const hours      = parseFloat(document.getElementById('en-hours')?.value)       || 24;
    const mode       = document.getElementById('en-mode')?.value                   || 'rate';
    const isRefeeding= document.querySelector('input[name="en-rf"]:checked')?.value === 'yes';
    const netKcal    = Math.max(0, kcalTarget - medKcal);

    // ── Safety checklist ────────────────────────────────────────
    const safe1 = document.getElementById('en-safe1')?.checked || false;
    const safe2 = document.getElementById('en-safe2')?.checked || false;
    const safe3 = document.getElementById('en-safe3')?.checked || false;
    const safe4 = document.getElementById('en-safe4')?.checked || false;
    const safetyScore = [safe1, safe2, safe3, safe4].filter(Boolean).length;

    // ── Formula details ─────────────────────────────────────────
    let formulaName = fk, conc = 0, proPerL = 0, waterPerL = 0;
    let formulaCho = null, formulaFat = null, formulaOsm = null;
    let formulaFibre = null, formulaNote = null;
    if (fk === 'custom') {
      conc         = parseFloat(document.getElementById('en-custom-conc')?.value)  || 1.0;
      proPerL      = parseFloat(document.getElementById('en-custom-pro')?.value)   || 40;
      waterPerL    = parseFloat(document.getElementById('en-custom-water')?.value) || 850;
      formulaName  = 'Custom Formula';
    } else if (typeof EN_FORMULAS !== 'undefined' && EN_FORMULAS[fk]) {
      const f      = EN_FORMULAS[fk];
      conc         = f.conc;
      proPerL      = f.pro;
      waterPerL    = f.water;
      formulaName  = f.name;
      formulaCho   = f.cho   || null;
      formulaFat   = f.fat   || null;
      formulaOsm   = f.osm   || null;
      formulaFibre = f.fibre !== undefined ? f.fibre : null;
      formulaNote  = f.note  || null;
    }

    // ── Computed outputs ─────────────────────────────────────────
    // Read from DOM when available (most accurate); re-derive when not.
    const domVolDay    = hasResults ? parseInt(document.getElementById('en-vol-day')?.textContent)    || 0 : 0;
    const domRate      = hasResults ? parseInt(document.getElementById('en-rate')?.textContent)       || 0 : 0;
    const domRateStart = hasResults ? parseInt(document.getElementById('en-rate-start')?.textContent) || 0 : 0;
    const domActualKcal= hasResults ? parseInt(document.getElementById('en-kcal-actual')?.textContent)|| 0 : 0;

    const calcVolDay    = (conc > 0 && netKcal > 0) ? Math.round(netKcal / conc) : domVolDay;
    const calcActualKcal= Math.round(calcVolDay * conc) || domActualKcal;
    const calcRate      = hours > 0 ? Math.round(calcVolDay / hours) : domRate;
    const calcRateStart = Math.round(calcRate * 0.5)  || domRateStart;

    const proProvided   = proPerL && calcVolDay  ? parseFloat(((calcVolDay / 1000) * proPerL).toFixed(1)) : 0;
    const proGap        = parseFloat((proTarget - proProvided).toFixed(1));
    const fluidFromFmla = waterPerL && calcVolDay ? Math.round((calcVolDay / 1000) * waterPerL)           : 0;
    const fluidNeeded   = Math.max(0, fluidTarget - fluidFromFmla);
    const fwfQ4         = Math.max(30, Math.round(fluidNeeded / 6 / 5) * 5);

    // ── Formula recommendation badge (from auto-select engine) ──
    const recContent = document.getElementById('en-formula-rec-content')?.textContent?.trim() || null;

    // ── ENTERAL_DB entry for selected formula ───────────────────
    let dbEntry = null;
    if (typeof ENTERAL_DB !== 'undefined') {
      dbEntry = ENTERAL_DB.find(f => f.name === formulaName) || null;
    }

    return {
      inputs: {
        kcalTarget,
        proTarget,
        fluidTarget,
        medKcal,
        netKcal,
        hours,
        mode,            // 'rate' | 'volume'
        isRefeeding,
        formulaKey: fk,
      },
      formula: {
        key:      fk,
        name:     formulaName,
        conc,            // kcal/mL
        proPerL,         // g/L
        waterPerL,       // mL/L
        cho:      formulaCho,
        fat:      formulaFat,
        osm:      formulaOsm,
        fibre:    formulaFibre,
        note:     formulaNote,
        // Extended ENTERAL_DB metadata when available
        category:   dbEntry?.cat  || null,
        route:      dbEntry?.route || null,
      },
      outputs: {
        volDay:           calcVolDay,
        rate:             domRate      || calcRate,
        rateStart:        domRateStart || calcRateStart,
        actualKcal:       calcActualKcal,
        proProvided,
        proGap,
        proMet:           proGap <= 0,
        fluidFromFormula: fluidFromFmla,
        fluidNeeded,
        fwfQ4,
      },
      clinical: {
        safetyChecklist: {
          functionalGut:              safe1,
          hemodynamicStability:       safe2,
          tubePositionConfirmed:      safe3,
          noAbsoluteContraindication: safe4,
          score: `${safetyScore}/4 criteria met`,
        },
        refeedingProtocol:             isRefeeding,
        formulaRecommendationContext:  recContent,
      },
      hasResults,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    console.warn('[Oasis] getEnteralCalcState error:', e.message);
    return null;
  }
}

// Expose globally for oasisAI.js cross-module access
window.getEnteralCalcState = getEnteralCalcState;

// ═══════════════════════════════════════════════════════════════


// ── BURNS EQUATION LIVE PREVIEW ──────────────────────────────────
function burnEquationPreview() {
  const tbsa    = parseFloat(document.getElementById('tbsa')?.value) || 0;
  const weight  = parseFloat(document.getElementById('weight')?.value) || 0;
  const height  = parseFloat(document.getElementById('height')?.value) || 0;
  const age     = parseFloat(document.getElementById('age')?.value) || 30;
  const temp    = parseFloat(document.getElementById('core_temp')?.value) || 37;
  const burnDays= parseFloat(document.getElementById('burn_days')?.value) || 1;
  const sex     = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const hIn     = height / 2.54;
  const ibw     = Math.max(sex==='male'?50+2.3*(hIn-60):45.5+2.3*(hIn-60),30);
  const wCalc   = (weight&&height) ? (parseFloat(document.getElementById('weight')?.value)||weight) : weight;
  const bmi_    = height>0 ? weight/((height/100)**2) : 25;
  const wUse    = bmi_>40 ? (ibw+0.25*(weight-ibw)) : bmi_>30 ? ibw : weight;
  const bsaT    = parseFloat(document.getElementById('burn_bsa')?.value) || (height>0&&weight>0 ? Math.sqrt((height*weight)/3600) : 0);
  const bsaB    = parseFloat(document.getElementById('burn_bsa_burned')?.value) || (bsaT * tbsa / 100);

  // Show/hide Galveston extra
  const selEq   = document.querySelector('input[name="burn_eq"]:checked')?.value || 'curreri';
  const galvExtra = document.getElementById('burn-galveston-extra');
  if(galvExtra) galvExtra.style.display = selEq==='galveston' ? '' : 'none';

  const tableEl = document.getElementById('burn-eq-table');
  if(!tableEl) return;
  if(!tbsa || !weight) { tableEl.innerHTML='<span style="color:var(--text-dim)">Enter weight and %TBSA above to compare equations.</span>'; return; }

  const hbBase  = sex==='male'?66.5+13.75*wUse+5.003*height-6.775*age:655.1+9.563*wUse+1.85*height-4.676*age;

  // Calculate each equation
  const curreri   = Math.round(25*wUse + 40*tbsa);
  const davies    = Math.round(20*wUse + 70*tbsa);
  const espenKcal = tbsa<20?27.5:tbsa<=40?32.5:37.5;
  const espen     = Math.round(espenKcal * wUse);
  const toronto   = Math.max(Math.round(-4343 + 10.5*tbsa + 0.23*(25*wUse) + 0.84*hbBase + 114*temp - 4.5*burnDays), Math.round(20*wUse));
  const galvK1 = age<1?2100:age<12?1800:1500;
  const galvK2 = age<1?1000:age<12?1300:1500;
  const galvAgeLabel = age<1?'0–1 yr':age<12?'1–11 yr':'≥12 yr';
  const galveston = bsaT>0 ? Math.round(galvK1*bsaT + galvK2*bsaB) : null;
  const sexF      = sex==='male'?1:0;
  const ijetones  = Math.round(1925 - 10*age + 5*weight + 281*sexF + 292 + 851);
  const curreriMod= Math.round(25*wUse + 30*tbsa); // Curreri Modified (safer ceiling)
  const espenRange= `${Math.round((tbsa<20?25:tbsa<=40?30:35)*wUse)}–${Math.round((tbsa<20?30:tbsa<=40?35:40)*wUse)}`;

  // Build colour coding — flag Curreri as potentially high vs ESPEN
  const rows = [
    { name:'Curreri (1974)',      ref:'ASPEN · Adults',                    val:curreri,    formula:`25×kg + 40×%TBSA`,           note:tbsa>40?' May overestimate for large burns':'Standard adult formula', pop:'adult' },
    { name:'Curreri Modified',   ref:'Modified practice',                 val:curreriMod, formula:`25×kg + 30×%TBSA`,           note:'Conservative ceiling — reduces overfeeding risk', pop:'adult' },
    { name:'Davies & Liljedahl', ref:'European · 1971',                   val:davies,     formula:`20×kg + 70×%TBSA`,           note:'Commonly used in European practice', pop:'adult' },
    { name:'Toronto Formula',    ref:'Allard 1990 · Day-specific',        val:toronto,    formula:`−4343 + 10.5×TBSA + 114×T°C − 4.5×day${burnDays}`, note:`Day ${burnDays} post-burn. Most validated for acute phase.`, pop:'adult' },
    { name:'Ireton-Jones (burns)',ref:'Ventilated patients · 1992',       val:ijetones,   formula:`1925 − 10×age + 5×kg + 292 + 851`, note:'For mechanically ventilated burn patients', pop:'adult' },
    { name:'ESPEN Burns 2013 (Rousseau et al.)',    ref:'Current guideline',                 val:espen,      formula:`${espenKcal} kcal/kg (${tbsa<20?'<20%':tbsa<=40?'20–40%':'>40%'} TBSA)`, note:`Range: ${espenRange} kcal/day. Current evidence-based guideline.`, pop:'adult', isRecommended:true },
    galveston!==null ? { name:`Galveston (${galvAgeLabel})`, ref:'Paediatric BSA-based · Herndon 2018', val:galveston, formula:`${galvK1}×BSA(${bsaT.toFixed(2)}m²) + ${galvK2}×burned(${bsaB.toFixed(2)}m²)`, note:`Age-stratified paediatric formula. 0–1yr: 2100+1000; 1–11yr: 1800+1300; ≥12yr: 1500+1500. All variants tend to overestimate vs IC.`, pop:'paediatric' } : null,
  ].filter(Boolean);

  const selectedEq = selEq;
  const eqMap = { curreri:curreri, davies:davies, toronto:toronto, galveston:galveston, iretojones:ijetones, espen:espen };
  const selectedVal = eqMap[selectedEq] || curreri;

  tableEl.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:10px">
      <thead>
        <tr style="background:rgba(255,99,20,.1)">
          <th style="padding:7px 10px;text-align:left;color:#ff6314;font-weight:700;letter-spacing:1px">EQUATION</th>
          <th style="padding:7px 10px;text-align:left;color:#ff6314;font-weight:700;letter-spacing:1px">REF/POP</th>
          <th style="padding:7px 10px;text-align:right;color:#ff6314;font-weight:700;letter-spacing:1px">kcal/DAY</th>
          <th style="padding:7px 10px;text-align:left;color:#ff6314;font-weight:700;letter-spacing:1px">FORMULA USED</th>
          <th style="padding:7px 10px;text-align:left;color:#ff6314;font-weight:700;letter-spacing:1px">NOTE</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          const isSelected = r.name.toLowerCase().includes(selectedEq) || (selectedEq==='curreri'&&r.name==='Curreri (1974)') || (selectedEq==='davies'&&r.name.includes('Davies')) || (selectedEq==='toronto'&&r.name.includes('Toronto')) || (selectedEq==='iretojones'&&r.name.includes('Ireton')) || (selectedEq==='espen'&&r.name.includes('ESPEN')) || (selectedEq==='galveston'&&r.name.includes('Galveston'));
          const diff = r.val - espen;
          const diffPct = espen>0 ? Math.round(diff/espen*100) : 0;
          const diffStr = diff>0 ? `<span style="color:var(--amber);font-size:9px">+${diffPct}% vs ESPEN</span>` : diff<0 ? `<span style="color:var(--blue);font-size:9px">${diffPct}% vs ESPEN</span>` : '<span style="color:var(--green);font-size:9px">ESPEN ✓</span>';
          const rowBg = isSelected ? 'rgba(255,99,20,.12)' : r.isRecommended ? 'rgba(0,212,184,.05)' : '';
          const border = isSelected ? 'border-left:3px solid #ff6314' : r.isRecommended ? 'border-left:3px solid var(--teal)' : 'border-left:3px solid transparent';
          return `<tr style="background:${rowBg};${border};border-bottom:1px solid rgba(255,99,20,.1)">
            <td style="padding:8px 10px;font-weight:700;color:${isSelected?'#ff9060':r.isRecommended?'var(--teal)':'var(--text-bright)'}">${r.name}${isSelected?' ✓':r.isRecommended?' ★':''}</td>
            <td style="padding:8px 10px;color:var(--text-dim);font-size:9px">${r.ref}</td>
            <td style="padding:8px 10px;text-align:right;font-size:14px;font-weight:700;color:${isSelected?'#ff9060':r.isRecommended?'var(--teal)':'var(--text-bright)'}">${r.val}<br>${diffStr}</td>
            <td style="padding:8px 10px;color:var(--text-dim);font-size:9px;font-style:italic">${r.formula}</td>
            <td style="padding:8px 10px;color:var(--text);font-size:9px">${r.note}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="margin-top:10px;padding:8px 12px;background:rgba(0,212,184,.05);border:1px solid rgba(0,212,184,.2);border-radius:6px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7">
      ESPEN Burns 2013 — recommended (Rousseau et al., Clin Nutr 2013;32:497–502) = current evidence-based recommendation. ✓ = your selected equation (used in main calculation).<br>
      Toronto is most validated for dynamic day-by-day energy targets. Galveston requires BSA — for paediatric patients only.<br>
      Curreri may overestimate by 30–50% in large burns — consider capping or using ESPEN Burns 2013 weight-based approach.<br>
      Refs: ESPEN Burns 2013 (Rousseau et al., Clin Nutr 2013;32:497–502) · Allard et al. 1990 · Galveston 1978 · Curreri 1974.
    </div>`;
}

// ── DIAGNOSIS HINTS (shown beneath the select) ───────────────
const DIAGNOSIS_HINTS = {
  // ICU
  sepsis:           ' SCCM/ASPEN · 1.5–2.0 g/kg protein · EN within 24–48 h',
  sepsis_severe:    ' Multi-organ · Permissive underfeeding early phase · 1.5–2.0 g/kg',
  trauma:           ' ESPEN ICU · 1.5–2.0 g/kg · High protein from Day 1',
  burns:            'ESPEN Burns 2013 (Rousseau et al.) · Adults 1.5–2.0 g/kg · Children up to 3.0 g/kg · Burns calculator shown below',
  ards:             ' SCCM/ASPEN · 1.5–2.0 g/kg IBW · Avoid excess CHO',
  cardiac:          ' ESPEN · 1.2–1.5 g/kg · Monitor fluid balance',
  neuro:            ' ASPEN-SCCM 2016 [1] · BTF 4th ed 2017 [60] · Lee & Oh, Brain Neurorehabil 2022 [78] · 1.5–2.0 g/kg ABW · EN within 24–48 h',
  stroke:           ' ESPEN Neurology 2018 · 1.2–1.5 g/kg · Screen ALL for dysphagia before oral intake',
  pancreatitis:     ' ESPEN 2020 · 1.2–1.5 g/kg · Early jejunal EN preferred',
  general_icu:      'ASPEN/ESPEN · 1.2–2.0 g/kg depending on phase',
  post_op:          ' ESPEN Surgery 2021 [80] / 2025 [81] · 1.2–1.5 g/kg · Early EN within 24 h',
  mechanical_vent:  ' Prolonged MV · 1.5–2.5 g/kg IBW · Protein first',
  // Renal
  aki_no_rrt:       ' KDIGO · 0.8–1.2 g/kg · Do NOT restrict protein to delay RRT',
  aki_rrt:          ' KDIGO/ESPEN · 1.5–2.5 g/kg · CRRT losses +10–15 g AA/day',
  ckd:              ' KDOQI 2020 G3.0.1 · 0.55–0.60 g/kg IBW (non-diabetic) · 0.6–0.8 g/kg (diabetic) · 25–35 kcal/kg',
  hd:               ' KDOQI 2020 G3.0.3 · 1.0–1.2 g/kg DW · 25–35 kcal/kg · Compensate dialytic losses',
  pd:               ' KDOQI 2020 G3.0.3 · 1.0–1.2 g/kg DW (KDOQI) · ISPD/ESPEN Renal 2021 allow 1.2–1.5 g/kg for peritoneal losses',
  nephrotic:        ' NKF/KDIGO consensus · 0.8–1.0 g/kg + urinary losses · Not in KDOQI 2020 · Low-sodium diet',
  renal_transplant: ' Post-transplant · 1.3–1.5 g/kg · Immunosuppression side-effects',
  // Pulmonary
  copd:             ' BTS/ESPEN · 1.2–1.5 g/kg · High fat, low CHO reduces CO₂ load',
  copd_exac:        ' ESPEN · 1.5 g/kg · High energy, low CHO · NIV/O₂ support',
  pneumonia:        ' ESPEN · 1.2–1.5 g/kg · Treat infection, support with adequate nutrition',
  cf:               ' CF Trust · 120–150% RDA energy · High fat + fat-soluble vitamins',
  pulmonary_htn:    ' Low sodium · Fluid restriction · 1.0–1.2 g/kg protein',
  lung_cancer:      ' ESPEN Onco · 1.2–1.5 g/kg · Address cachexia early',
  // Infectious
  hiv:              ' WHO/ESPEN · 1.2–1.5 g/kg · +10% energy stable, +20–30% if OI',
  hiv_active:       ' WHO · 1.5–2.0 g/kg · +50% energy in active OI · Address micronutrients',
  tb:               ' WHO · 1.2–1.5 g/kg · +20–30% energy · Pyridoxine B6 with INH',
  tb_mdr:           ' WHO · 1.5 g/kg · Extended treatment, higher micronutrient needs',
  malaria:          ' WHO · 1.2 g/kg · High fever = +13% energy per °C above 37',
  typhoid:          ' WHO · 1.2–1.5 g/kg · Fever-adjusted energy · Gut rest if perforation risk',
  meningitis:       ' ESPEN ICU 2023 · 1.5–2.0 g/kg · High metabolic stress · Early EN via NGT',
  covid:            ' ESPEN COVID · 1.3 g/kg min · Consider HPF enteral formula',
  // GI / Hepatic
  hepatic:          ' ESPEN/EASL · 1.2–1.5 g/kg DW · Never restrict protein',
  hepatic_severe:   ' ESPEN 2019 · 1.0–1.5 g/kg DW · BCAA if encephalopathy · LES snack',
  ibd:              ' ECCO/ESPEN · 1.2–1.5 g/kg · EN preferred in Crohn\'s · Address deficiencies',
  short_bowel:      ' ESPEN HEN · 1.5–2.0 g/kg · High output losses · PN if <100 cm SB',
  gi_fistula:       ' ESPEN · 1.5–2.0 g/kg · PN often required · Track output losses',
  dysphagia:        ' ESPEN · 1.2–1.5 g/kg · Texture modified / EN if aspiration risk',
  gi_cancer:        ' ESPEN Onco · 1.2–1.5 g/kg · Peri-op immunonutrition (arginine/EPA)',
  gi_obstruction:   ' PN until obstruction resolved · Then transition to EN/oral',
  malabsorption:    ' ESPEN · 1.5 g/kg · Semi-elemental formula · Fat-soluble vitamins',
  ileostomy:        ' ESPEN · 1.2–1.5 g/kg · High sodium/fluid losses · Monitor Mg, Zn',
  colostomy:        ' ESPEN · 1.2–1.5 g/kg · Lower electrolyte losses than ileostomy · Individualise fibre · Monitor hydration',
  constipation:     ' Krause 16th Ch. 28 · High fibre 25–38 g/day · Fluids >2 L/day · Soluble + insoluble fibre · Avoid laxative dependence',
  diarrhoea_acute:  ' WHO/Krause 16th Ch. 28 · ORS · Moderate soluble fibre · Avoid lactose/fructose/sugar alcohols if intolerant · Probiotics in selected cases',
  aad_cdiff:        ' IDSA/SHEA CDI 2021 · Rehydration first · Probiotics cautiously (Lactobacillus/Saccharomyces) · FMT for recurrent CDI · PN/EN if severe',
  coeliac:          ' ESPGHAN/BSG Coeliac 2020 · Strict lifelong GFD · Fe, Ca, Vit D, multivitamin · Temporary low lactose/FODMAP if symptomatic · Cross-contamination prevention',
  lactose_intolerance: ' Krause 16th Ch. 28 · Restrict lactose per tolerance · Lactose-free dairy · Lactase enzyme supplements · Ensure Ca + Vit D adequacy',
  ibs:              ' NICE IBS 2017 / Monash FODMAP · Low-FODMAP diet 4–8 wks then reintroduce · Probiotics/prebiotics cautiously · Stress reduction · Individualised food tolerance',
  sibo:             ' ACG SIBO 2020 · Low-FODMAP approach · Antibiotic (rifaximin) course · Elemental diet severe cases · B12 + fat-soluble vitamin supplementation · Digestive enzymes',
  crohns:           ' ECCO/ESPEN IBD 2023 · Low fibre during flares/strictures · EN preferred (EEN in paeds) · PN if severe/obstruction · Monitor B12, fat-soluble vitamins, Fe, folate, Vit D',
  uc:               ' ECCO/ESPEN IBD 2023 · Individualised diet during flares · Hydration support · Probiotics (VSL#3) may benefit pouchitis/UC remission · Fe, folate, Vit D supplementation',
  diverticulosis:   ' Krause 16th Ch. 28 / NICE 2019 · High-fibre diet ≥25 g/day · Adequate fluids · Regular bowel habits · No evidence against nuts/seeds',
  diverticulitis:   ' NICE 2019 / ACG Diverticulitis 2021 · Liquid or low-fibre diet during acute flare · Gradual return to high-fibre after recovery · Antibiotics per severity',
  microscopic_colitis: ' AGA Microscopic Colitis 2016 · Maintain hydration + nutrition status · Avoid NSAID/PPI/metformin triggers · Budesonide first-line · Diet supportive as per IBD',
  // Oncology
  cancer_solid:     ' ESPEN Onco · 1.2–1.5 g/kg · ONS + exercise · Address cachexia',
  cancer_head_neck: ' ESPEN · 1.5 g/kg · PEG/NGT often required · Mucositis management',
  cancer_gi:        ' ESPEN · 1.2–1.5 g/kg · Pre-op immunonutrition · Early post-op EN',
  haem_malig:       ' ESPEN · 1.5 g/kg · Mucositis, neutropenia · Safe food handling',
  bmt:              ' ESPEN · 1.5–2.0 g/kg · PN often needed · Aggressive micronutrient support',
  post_chemo:       ' ESPEN · 1.2–1.5 g/kg · Address nausea/vomiting · ONS',
  cachexia:         ' ESPEN · 1.5 g/kg + EPA · High protein, high energy · Omega-3',
  palliative:       ' ESPEN Palliative · Comfort feeding · Align with patient wishes',
  // Cardiac
  chf:              ' ESPEN · 1.1–1.4 g/kg · Fluid + sodium restriction · Cardiac cachexia risk',
  cardiac_cachexia: ' ESPEN · 1.5 g/kg · High protein, fluid-restricted · ONS',
  post_cardiac_surg:' ESPEN · 1.2–1.5 g/kg · Early EN within 12–24 h',
  endocarditis:     ' ESPEN · 1.5 g/kg · High catabolism · Adequate micronutrients',
  // Cardiovascular / Lipid (Krause & Mahan 16th ed.)
  ascvd:            '‍ Krause 16th · 1.0–1.2 g/kg · SFA <5–6%E · Fiber ≥25 g/day · Na ≤2400 mg · Omega-3 ≥2 servings fish/week · DASH or Mediterranean diet',
  coronary_hd:      ' Krause 16th · 1.0–1.2 g/kg · SFA <5–6%E · Low GI CHO · Omega-3 fish ≥2×/week · Statin + dietary modification',
  hypertension:     ' Krause 16th · 1.0–1.2 g/kg · DASH diet · Na ≤1500–2400 mg/day · K⁺-rich foods · Moderate alcohol · Weight management',
  dyslipidemia:     ' Krause 16th · 1.0–1.2 g/kg · SFA <5–6%E · Fiber 25–30 g/day · Omega-3 · Replace SFA with MUFA/PUFA',
  hypercholesterol: ' Krause 16th · LDL target · SFA <5–6%E · Trans fat minimal · Soluble fiber 10–25 g/day · Plant sterols 2 g/day',
  hypertriglyc:     ' Krause 16th · TG target · ↓ Simple sugars + refined CHO · Omega-3 fish oil · Avoid alcohol · Weight loss · If TG >5.6 mmol/L: strict fat restriction',
  low_hdl:          ' Krause 16th · ↑ HDL via: aerobic exercise · ↓ Trans fat · ↑ MUFA · Moderate alcohol (if appropriate) · Weight loss',
  familial_hc:      ' Krause 16th · Statin mandatory + dietary SFA <5%E · LDL-lowering diet · Plant sterols · Avoid TFA',
  familial_chl:     ' Krause 16th · Combined ↑ LDL + TG · SFA <5–6%E · ↓ CHO (refined) · Omega-3 · Weight management',
  metabolic_synd_cvd:' Krause 16th · 1.0–1.2 g/kg · Mediterranean / DASH · Weight loss 5–10% · ↑ Fiber · ↓ Refined CHO + SFA',
  cvd_high_risk:    ' Krause 16th · 10-yr CVD risk ≥10% · Aggressive dietary modification + exercise · SFA <5–6%E · Fiber ≥30 g/day',
  cvd_mod_risk:     ' Krause 16th · 10-yr CVD risk 5–9% · Dietary pattern change · SFA <7%E · Physical activity ≥150 min/week',
  // Neurological
  spinal:           ' ASPEN/ESPEN · 1.2–1.5 g/kg ABW · Adjust for reduced muscle mass',
  dementia:         ' ESPEN · 1.2 g/kg · Texture modification · Mealtime support',
  neurodegen:       ' ESPEN Neurology 2018 · 1.2–1.5 g/kg · Progressive dysphagia · PEG timing — discuss early',
  epilepsy_keto:    ' Ketogenic diet: 4:1 ratio fat:protein+CHO · Supervised protocol',
  // Endocrine
  dm1:              ' ESPEN DM · 1.0–1.2 g/kg · CHO-consistent diet · Insulin matching',
  dm2:              ' ESPEN DM · 1.0–1.2 g/kg · Low GI CHO · High fibre',
  dm_icu:           ' SCCM · 1.5–2.0 g/kg · Target BG 7.8–10 mmol/L · Diabetic EN formula',
  obesity:          ' SCCM/ASPEN · ≥2.0 g/kg IBW · Hypocaloric high-protein (65–70% target)',
  obesity_severe:   ' ASPEN · ≥2.5 g/kg IBW · 50–60% energy target',
  metabolic_synd:   ' ESPEN · 1.0–1.2 g/kg · Low GI, high fibre, Mediterranean pattern',
  thyroid:          ' Hypo: +10% energy · Hyper: +20–30% energy · Iodine monitoring',
  adrenal:          ' Steroid-induced catabolism · 1.5 g/kg · Calcium + Vitamin D support',
  // Malnutrition
  sam:              ' WHO SAM · F-75 → F-100 → RUTF · 100–150 kcal/kg · Catch-up growth',
  mam:              ' WHO MAM · RUSF · 1.0–1.5 g/kg · Therapeutic supplementary feeding',
  chronic_malnutrition: ' WHO · Energy-dense foods · Micronutrient supplementation · Growth monitoring',
  sarcopenia:       ' ESPEN · ≥1.2 g/kg · Resistance exercise + protein · Leucine-enriched',
  refeeding_risk:   ' NICE CG32 · Start ≤5–10 kcal/kg · IV Thiamine BEFORE feeds · Electrolytes Q6h',
  anorexia:         ' MARSIPAN · Incremental refeeding · MDT · Medical monitoring',
  // Obstetrics
  pregnancy:        ' WHO/NICE · +300 kcal/day (T2/T3) · +1.1 g/kg protein · Folate, iron, iodine',
  pregnancy_hg:     ' RCOG · PN if weight loss >5% · Anti-emetics · Thiamine replacement',
  pregnancy_gest_dm:' NICE · CHO-controlled · 4–5 small meals · Target BG as per NICE',
  lactation:        ' WHO · +500 kcal/day · +1.1 g/kg protein · Iodine, DHA, calcium',
  // Surgical
  gi_surgery:       ' ESPEN · 1.5 g/kg · Peri-op immunonutrition 5–7d · Early post-op EN',
  ortho_trauma:     ' ESPEN · 1.2–1.5 g/kg · Vitamin D + calcium · Early mobilisation',
  pressure_injury:  ' EPUAP/NPUAP · 1.5–2.0 g/kg · Zinc, Vitamin C, arginine · Hydration',
  amputation:       ' ESPEN · 1.5 g/kg · Adjust for reduced weight · Wound healing support',
  // Geriatric
  geriatric:        ' ESPEN Geriatric · 1.0–1.5 g/kg · Screen for sarcopenia · LES snack',
  hip_fracture:     ' ESPEN · 1.2–1.5 g/kg · Vitamin D, protein supplement · Prevent delirium',
  dehydration:      ' 1.0–1.2 g/kg · Fluid 35 mL/kg + losses · Oral hydration first',
  // Other
  general:          ' General guidelines: 1.2–1.5 g/kg · 25–30 kcal/kg · Reassess regularly',
  home_en:          ' ESPEN HEN · Match hospital prescription · Regular monitoring',
  pn_long_term:     ' ESPEN HPN · Cyclic PN · Liver function monitoring · Trace elements',
  immunosuppressed: ' ESPEN · 1.2–1.5 g/kg · Safe food handling · Avoid raw foods',
  other_specify:    ' Custom diagnosis — apply general guidelines; adjust targets based on clinical context and specific condition requirements',
};


// Protein factor map for extended diagnoses (merged with calculate())
const DIAGNOSIS_PROTEIN_MAP = {
  sepsis:           { pf:1.8, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'SCCM/ASPEN 2016 / ASPEN 2022', note:'Early protein delivery critical. Target 1.5–2.0 g/kg IBW.' },
  sepsis_severe:    { pf:1.8, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'SCCM/ASPEN 2016 / ASPEN 2022', note:'Multi-organ failure: permissive underfeeding first 48h, then full protein.' },
  trauma:           { pf:1.8, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'ESPEN ICU 2019',   note:'Polytrauma: elevated nitrogen losses. Full protein from Day 1.' },
  burns:            { pf:2.0, range:'1.5–2.0 g/kg/day (adults); 1.5–3.0 g/kg/day (children)', basis:'Actual', gl:'ESPEN Burns 2013 (Rousseau et al.)',  note:'Adults: 1.5–2.0 g/kg (ESPEN Grade D, strong). Children: up to 3 g/kg. Adjust per %TBSA. Evaluate via nitrogen balance & wound healing.' },
  ards:             { pf:1.6, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'SCCM/ASPEN',        note:'ARDS: 1.5–2.0 g/kg IBW. Avoid overfeeding CHO.' },
  cardiac:          { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Cardiac',     note:'Cardiac surgery: 1.2–1.5 g/kg. Early EN preferred.' },
  neuro:            { pf:1.7, range:'1.5–2.0 g/kg/day', basis:'ABW',    gl:'ASPEN-SCCM 2016 / BTF 2017',    note:'TBI: high catabolism. Protein 1.5–2.0 g/kg ABW; experts recommend ≥2 g/kg/day. EN within 24–48h. Penn State or Ireton-Jones equation on MV. Avoid overfeeding — excess CO₂ raises ICP. Permissive glycaemia 8–11 mmol/L (avoid tight control). Refs [1][60][77][78].' },
  stroke:           { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Neurology 2018 (Burgos et al. Clin Nutr 37:354–396)',  note:'Stroke: screen ALL patients for dysphagia before oral intake (Rec 52, Grade B). MUST within 48h (Rec 54). Early EN ≤72h if severe dysphagia (Rec 63). NGT for acute phase; PEG if EN >28 days (Recs 65–66, Grade A).' },
  pancreatitis:     { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Pancreas 2020', note:'Severe pancreatitis: jejunal EN preferred over PN. Avoid high-fat.' },
  general_icu:      { pf:1.5, range:'1.2–2.0 g/kg/day', basis:'IBW',    gl:'ASPEN/ESPEN',       note:'ICU general: 1.2–2.0 g/kg depending on phase and severity.' },
  post_op:          { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Surgery 2021 [80] / 2025 [81]', note:'Major surgery: early EN within 24h. Immunonutrition if malnourished/cancer (arginine/ω-3 5–7d). PN if EN <50% for >3–4d. Refs [79][80][81].' },
  mechanical_vent:  { pf:1.8, range:'1.5–2.5 g/kg/day', basis:'IBW',    gl:'ASPEN/ESPEN',       note:'Prolonged MV: prioritise protein delivery. Prevent respiratory muscle wasting.' },
  aki_no_rrt:       { pf:1.0, range:'0.8–1.2 g/kg/day', basis:'ABW',    gl:'KDIGO 2012 *(KDIGO 2024 update available)*',        note:'AKI no RRT: 0.8–1.2 g/kg. Do NOT restrict protein to delay RRT.' },
  aki_rrt:          { pf:1.8, range:'1.5–2.5 g/kg/day', basis:'IBW',    gl:'KDIGO/ESPEN 2023',  note:'CRRT: amino acid losses 10–15 g/day. Up to 2.5 g/kg in hypercatabolic patients.' },
  ckd:              { pf:0.58, range:'0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (diabetic)', basis:'IBW',    gl:'KDOQI 2020 Guideline 3.0.1 / 3.0.2',        note:'Non-diabetic CKD G3–G5 (KDOQI G3.0.1): LPD 0.55–0.60 g/kg IBW. VLPD option: 0.28–0.43 g/kg + keto/AA analogues under supervision. Diabetic (G3.0.2): 0.6–0.8 g/kg IBW. Energy 25–35 kcal/kg (G3.1.1).' },
  hd:               { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'DW',    gl:'KDOQI 2020 Guideline 3.0.3',  note:'Chronic HD: 1.0–1.2 g/kg dry weight (KDOQI 2020 G3.0.3). Dialytic amino acid losses ~10 g/session must be compensated. Energy 25–35 kcal/kg.' },
  pd:               { pf:1.3, range:'1.0–1.2 g/kg/day (KDOQI 2020) · 1.2–1.5 g/kg/day (ISPD/ESPEN Renal 2021)', basis:'DW',    gl:'KDOQI 2020 Guideline 3.0.3 / ISPD / ESPEN Renal 2021',        note:'KDOQI 2020 (G3.0.3): 1.0–1.2 g/kg DW. ISPD/ESPEN Renal 2021 allow 1.2–1.5 g/kg to replace peritoneal losses (5–15 g/day). Subtract dialysate dextrose calories.' },
  nephrotic:        { pf:0.9, range:'0.8–1.0 g/kg/day + urinary protein losses', basis:'IBW',    gl:'KDIGO CKD 2012 / NKF / Note: not addressed in KDOQI 2020',             note:'Nephrotic syndrome: not covered by KDOQI 2020. Per NKF/KDIGO consensus: 0.8–1.0 g/kg IBW + urinary protein losses (typically 5–20 g/day). Low sodium <2 g/day. Avoid high protein (>1.3 g/kg) — may worsen proteinuria.' },
  renal_transplant: { pf:1.4, range:'1.3–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Transplant',  note:'Post-transplant: high protein early phase. Long-term: 1.0 g/kg.' },
  copd:             { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'BTS/ESPEN',         note:'COPD: high fat (40–55%), low CHO to reduce CO₂ production.' },
  copd_exac:        { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'COPD exacerbation: 1.5 g/kg. High energy, low CHO formula.' },
  pneumonia:        { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Pneumonia: treat infection, maintain adequate nutrition.' },
  cf:               { pf:1.5, range:'1.5–2.0 g/kg/day', basis:'Actual', gl:'CF Trust/ESPEN',    note:'Cystic fibrosis: 120–150% RDA energy. High fat + fat-soluble vitamins.' },
  pulmonary_htn:    { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Pulmonary HTN: low sodium, fluid restriction, moderate protein.' },
  lung_cancer:      { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'Lung cancer: address cachexia early. Omega-3 may stabilise weight.' },
  hiv:              { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'WHO/ESPEN',         note:'HIV stable: +10% energy, 1.2–1.5 g/kg. Micronutrient-rich diet.' },
  hiv_active:       { pf:1.7, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'WHO',               note:'Active OI/AIDS: +50% energy, 1.5–2.0 g/kg. Aggressive nutritional support.' },
  tb:               { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'WHO TB + Nutrition', note:'Active TB: energy +20–30%. Pyridoxine (B6) 10–25 mg/day with INH.' },
  tb_mdr:           { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'WHO MDR-TB',        note:'MDR-TB: extended treatment, higher micronutrient needs, monitor drug interactions.' },
  malaria:          { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'ABW',    gl:'WHO',               note:'Severe malaria: fever increases energy by ~13%/°C above 37. Treat hypoglycaemia.' },
  typhoid:          { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'ABW',    gl:'WHO',               note:'Typhoid: fever-adjusted energy. Gut rest if perforation risk.' },
  meningitis:       { pf:1.6, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'ESPEN ICU 2023',    note:'Meningitis/encephalitis: high metabolic stress. Fluid restrict if SIADH. Early EN via NGT. Raised ICP may limit initial feeds.' },
  covid:            { pf:1.4, range:'1.3–2.0 g/kg/day', basis:'IBW',    gl:'ESPEN COVID 2022',  note:'COVID-19: 1.3 g/kg minimum. High protein formula if fluid-restricted.' },
  hepatic:          { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'DW',     gl:'ESPEN/EASL 2019',   note:'Cirrhosis: NEVER restrict protein. Use dry weight. Late evening snack.' },
  hepatic_severe:   { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'DW',     gl:'ESPEN/EASL 2019',   note:'Acute liver failure: 1.0–1.5 g/kg DW. BCAA if refractory encephalopathy.' },
  ibd:              { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ECCO/ESPEN',        note:'IBD: EN preferred in Crohn\'s. Address iron, B12, folate, Vit D deficiencies.' },
  short_bowel:      { pf:1.7, range:'1.5–2.0 g/kg/day', basis:'Actual', gl:'ESPEN SBS/HEN',     note:'SBS: high protein, PN if <100 cm remnant. Track stool/stoma losses.' },
  gi_fistula:       { pf:1.8, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Fistula: PN often required. Track output losses for fluid/electrolyte replacement.' },
  dysphagia:        { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Dysphagia: IDDSI texture modification. EN via NGT if aspiration risk.' },
  gi_cancer:        { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'GI cancer: peri-op immunonutrition (arginine, EPA, glutamine) 5–7 days.' },
  gi_obstruction:   { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'GI obstruction: PN until resolved. Transition to EN/oral when safe.' },
  malabsorption:    { pf:1.5, range:'1.2–1.8 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Malabsorption: semi-elemental formula. Monitor fat-soluble vitamins.' },
  ileostomy:        { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Ileostomy: high sodium/fluid losses. Monitor Mg, Zn. Avoid high-fibre foods.' },
  colostomy:        { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN / Krause 16th Ch. 28', note:'Colostomy: lower electrolyte losses than ileostomy. Individualise fibre. Monitor hydration and output consistency.' },
  constipation:     { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'ABW',    gl:'Krause & Mahan 16th ed., Ch. 28', note:'Constipation: energy needs unchanged. Primary intervention is dietary fibre 25–38 g/day (gradual increase to avoid bloating), fluid intake >2 L/day, physical activity. Soluble fibre (oats, psyllium, legumes) + insoluble fibre (wholegrains, vegetables). Avoid excessive laxative dependence.' },
  diarrhoea_acute:  { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'ABW',    gl:'WHO / Krause 16th Ch. 28', note:'Diarrhoea: ORS for fluid/electrolyte replacement. Moderate soluble fibre. Avoid excess sugar alcohols, lactose, fructose if intolerant. Gradual refeeding with BRAT-plus (banana, rice, applesauce, toast + lean protein). Probiotics (Lactobacillus rhamnosus GG, Saccharomyces boulardii) in selected cases.' },
  aad_cdiff:        { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'IDSA/SHEA CDI Guidelines 2021', note:'AAD/C. difficile: aggressive rehydration and electrolyte replacement. Probiotics cautiously (evidence strongest for Saccharomyces boulardii and Lactobacillus in AAD prevention). FMT for recurrent CDI (≥2 recurrences). EN/PN if severe/prolonged NPO. Avoid immunosuppressive diets. Protein 1.2–1.5 g/kg for recovery.' },
  coeliac:          { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'ESPGHAN Coeliac 2020 / BSG 2014', note:'Coeliac Disease: strict lifelong gluten-free diet (GFD) — avoid wheat, rye, barley, contaminated oats. Supplement iron (IDA common), calcium 1000–1200 mg/day, Vit D 1000–2000 IU/day, multivitamin (folate, B12, zinc). Temporary low lactose/FODMAP if symptomatic on GFD. Prevent cross-contamination. Monitor TTG-IgA annually for adherence. Bone density screen (DXA) if prolonged symptoms. Dietitian review every 6–12 months.' },
  lactose_intolerance:{ pf:1.1, range:'1.0–1.2 g/kg/day', basis:'ABW', gl:'Krause & Mahan 16th ed., Ch. 28 / NIH Consensus', note:'Lactose Intolerance: restrict lactose according to individual tolerance (most tolerate 12 g/day = 240 mL milk). Lactose-free dairy products. Lactase enzyme supplements at point of consumption. Hard cheeses and yoghurt better tolerated. Ensure calcium 1000–1200 mg/day + Vit D 600–800 IU/day from non-dairy sources (fortified plant milks, leafy greens, supplements). Do not routinely eliminate all dairy.' },
  ibs:              { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'ABW',    gl:'NICE IBS 2017 / Monash University Low-FODMAP', note:'IBS: Low-FODMAP diet 4–8 weeks (eliminate fermentable oligo-, di-, monosaccharides and polyols), then systematic reintroduction to identify triggers. Probiotics cautiously (Bifidobacterium, Lactobacillus — symptom-specific). Adequate fibre (soluble preferred — psyllium, oats). Stress reduction (IBS is biopsychosocial). Avoid carbonated drinks, excess caffeine, alcohol. Regular eating pattern. Small frequent meals. Peppermint oil capsules for IBS-D.' },
  sibo:             { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ACG SIBO 2020 / ESPEN', note:'SIBO: Low-FODMAP diet reduces substrate for bacterial fermentation. Antibiotic therapy: rifaximin 550 mg TID × 14 days (evidence-based). Elemental diet (2–3 weeks) in severe/refractory cases — reduces bacterial load. B12 supplementation (bacterial consumption). Fat-soluble vitamins (A, D, E, K) if malabsorption. Digestive enzyme supplementation if pancreatic exocrine insufficiency co-exists. Address underlying cause (motility disorder, structural abnormality).' },
  crohns:           { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ECCO/ESPEN IBD 2023', note:'Crohn\'s Disease: low-residue/low-fibre diet during flares and strictures (<10 g/day if obstructive). EN preferred over PN where possible (EEN induces remission in paeds). PN if severe obstruction, fistula, or short bowel. Supplement: B12 (terminal ileum disease/resection), fat-soluble vitamins (A, D, E, K) if steatorrhoea, iron (IDA very common), folate (methotrexate antagonism), Vit D 1000–2000 IU/day, zinc, magnesium. Omega-3 controversial for remission maintenance. Monitor weight, albumin, CRP, FBC, ferritin, B12, Vit D regularly.' },
  uc:               { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ECCO/ESPEN IBD 2023', note:'Ulcerative Colitis: maintain nutrition during flares — do not restrict unnecessarily. Individualised diet (no universal elimination diet). Probiotics: VSL#3 has strongest evidence for UC remission maintenance and pouchitis (post-colectomy). Hydration support critical in active disease. Supplement: iron (bleeding losses — prefer IV iron if severe IDA), folate (sulfasalazine antagonises), Vit D 1000 IU/day, calcium. EN/PN if severe flare (toxic megacolon — NPO + PN).' },
  diverticulosis:   { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'ABW',    gl:'Krause 16th Ch. 28 / ACG Diverticular 2021', note:'Diverticulosis: high-fibre diet ≥25–38 g/day to increase stool bulk and reduce intraluminal pressure. Adequate fluids ≥2 L/day. Regular physical activity. No evidence to avoid nuts, seeds, popcorn (historical advice now refuted). Red meat association with diverticulitis risk — reduce. Obesity is a risk factor — weight management.' },
  diverticulitis:   { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'NICE 2019 / ACG Diverticulitis 2021', note:'Acute Diverticulitis: clear liquid diet or low-fibre diet (<10 g/day) during acute flare depending on severity. IV fluids if admitted. NPO + bowel rest if perforation/peritonitis. Gradual return to high-fibre diet after 4–6 weeks recovery. Antibiotics per local protocol (mild: oral; severe: IV). High-fibre diet long-term prevents recurrence. Elective surgery for recurrent attacks.' },
  microscopic_colitis:{ pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW', gl:'AGA Microscopic Colitis 2016 / ESPEN IBD', note:'Microscopic Colitis (collagenous/lymphocytic colitis): chronic watery non-bloody diarrhoea with normal colonoscopy appearance — biopsy diagnosis. Avoid triggers: NSAIDs (esp. diclofenac, ibuprofen), PPIs, SSRIs, metformin, statins. Avoid caffeine, alcohol, smoking. Lactose-free diet trial. Supportive nutrition as per IBD. Budesonide 9 mg/day × 8 weeks is first-line pharmacotherapy. Cholestyramine if bile acid malabsorption co-exists. Weight and micronutrient monitoring essential.' },
  cancer_solid:     { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'Cancer: address cachexia early. ONS + physical activity. Omega-3 EPA.' },
  cancer_head_neck: { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'H&N cancer: PEG/NGT often required during RT. Mucositis management.' },
  cancer_gi:        { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'GI cancer: peri-operative immunonutrition. Early post-op EN.' },
  haem_malig:       { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'Haem malignancy: mucositis, neutropenia. Safe food handling. PN if gut failure.' },
  bmt:              { pf:1.7, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'BMT: PN often needed peri-transplant. Aggressive micronutrient support.' },
  post_chemo:       { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'Post-chemo: address nausea/vomiting. ONS to prevent weight loss.' },
  cachexia:         { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021 (Arends et al.)',   note:'Cancer cachexia: EPA 2 g/day may stabilise. High protein + energy.' },
  palliative:       { pf:1.0, range:'Comfort-based',     basis:'Actual', gl:'ESPEN Palliative',  note:'Palliative: align with patient goals. Avoid distress from forced feeding.' },
  chf:              { pf:1.2, range:'1.1–1.4 g/kg/day', basis:'IBW',    gl:'ESPEN Cardiac',     note:'CHF: fluid + Na restriction. Monitor for cardiac cachexia.' },
  cardiac_cachexia: { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Cardiac cachexia: high protein, fluid-restricted formula. ONS.' },
  post_cardiac_surg:{ pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Post-cardiac surgery: early EN within 12–24h.' },
  endocarditis:     { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Infective endocarditis: high catabolism. Prolonged treatment = sustained support.' },

  // ── Cardiovascular / Lipid (Krause & Mahan 16th ed.) ─────────
  ascvd:            { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 (Kris-Etherton et al.)',
    note:'ASCVD (Krause 16th, Ch. 33): Saturated fat ≤5–6% total kcal — primary dietary target for LDL reduction. Replace SFA with MUFA (olive oil, avocado) and PUFA (omega-6 + omega-3). Trans fat: minimise as much as possible. Dietary cholesterol: no strict numerical limit (new guideline) — but high-cholesterol foods often accompany high SFA, so limit in context. Dietary fiber target ≥25–30 g/day: soluble fiber (oats, barley, psyllium, legumes) specifically ↓ LDL via bile acid sequestration. Sodium ≤2400 mg/day (optimal 1500 mg/day for BP control). Omega-3: ≥2 servings fatty fish/week — ↓ TG, ↑ HDL, anti-inflammatory. Dietary pattern: DASH or Mediterranean recommended as primary framework. Physical activity ≥150 min/week moderate-intensity. Weight loss if overweight — improves LDL, HDL, TG, BP, inflammation. Source: Kris-Etherton PM et al., Krause & Mahan\'s Food & Nutrition Care Process, 16th ed., Ch. 33 (2022); AHA/ACC Guideline on CVD risk reduction.' },

  coronary_hd:      { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33',
    note:'Coronary Heart Disease (Krause 16th, Ch. 33): Primary goal — LDL reduction via SFA restriction (<5–6%E) and fiber increase. Replace SFA with unsaturated fats (MUFA/PUFA). Omega-3 fish ≥2×/week. Low GI, high-fibre carbohydrates. Mediterranean diet strongly recommended. Sodium ≤2400 mg/day. Plant sterols/stanols 2 g/day can reduce LDL by 5–15%. Avoid trans fat completely. Statin therapy is cornerstone; dietary modification is complementary and additive. Monitor: LDL-C, TG, HDL-C, hs-CRP, blood pressure. Screen for diabetes (potentiates CVD risk). Smoking cessation essential.' },

  hypertension:     { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / JNC8 / DASH Trial',
    note:'Hypertension (Krause 16th, Ch. 33): DASH diet is first-line dietary intervention — high in fruits, vegetables, whole grains, low-fat dairy; low in sodium, red meat, and sweets. Sodium: standard limit ≤2400 mg/day; optimal ≤1500 mg/day for maximum BP reduction. Potassium-rich foods (bananas, sweet potato, legumes, leafy greens) promote natriuresis — target 4700 mg/day. Magnesium and calcium from food sources support BP control. Weight loss: every 1 kg lost reduces systolic BP ~1 mmHg. Alcohol: limit ≤1 drink/day (women), ≤2/day (men). Physical activity ≥150 min/week moderate intensity. Caffeine: modest acute effect; habitual moderate intake likely neutral in most. DASH + sodium restriction reduces systolic BP by up to 11 mmHg in hypertensive individuals.' },

  dyslipidemia:     { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33',
    note:'Dyslipidemia (Krause 16th, Ch. 33): Mixed dyslipidemia — ↑ LDL + ↑ TG ± ↓ HDL. Dietary approach: (1) SFA <5–6%E — primary LDL target; (2) trans fat: eliminate; (3) soluble fiber 25–30 g/day — ↓ LDL; (4) omega-3 from fatty fish ≥2×/week — ↓ TG; (5) replace SFA with MUFA (olive oil) and PUFA (linoleic acid, EPA/DHA); (6) reduce refined CHO and added sugars — ↓ TG; (7) plant sterols/stanols 2 g/day — additional 5–15% LDL reduction; (8) Mediterranean or DASH dietary pattern as framework. Physical activity: ≥150 min/week moderate — improves HDL. Weight reduction: each 5–10% weight loss improves all lipid fractions. Alcohol: limit (raises TG). Monitor lipid panel 6–8 weeks after dietary change.' },

  hypercholesterol: { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / AHA/ACC 2019',
    note:'Hypercholesterolaemia ↑ LDL (Krause 16th, Ch. 33): LDL is the primary intervention target. Key dietary rules: (1) SFA <5–6%E — each 1%E reduction in SFA ↓ LDL ~1–2 mg/dL; (2) trans fat: absolute minimum — raises LDL and lowers HDL simultaneously; (3) soluble fiber: 10–25 g/day (psyllium, oats, barley, legumes) — ↓ LDL 3–10%; (4) plant sterols/stanols 2 g/day — ↓ LDL 5–15% additional; (5) soy protein (≥25 g/day) may provide modest LDL reduction; (6) dietary cholesterol: no strict limit per current guidelines — however, high-cholesterol foods (organ meats, egg yolks at excessive amounts) often carry high SFA, so contextual restriction appropriate. Therapeutic lifestyle change (TLC) diet historically targets LDL <100 mg/dL in high-risk. Reassess lipids 6–8 weeks post-dietary change.' },

  hypertriglyc:     { pf:1.0, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / AHA/ACC 2019',
    note:'Hypertriglyceridaemia ↑ TG (Krause 16th, Ch. 33): TG most responsive to diet + lifestyle. (1) Reduce simple sugars and refined CHO (white bread, rice, sugar-sweetened beverages) — primary dietary target; (2) omega-3 (EPA+DHA) ≥2 g/day from fatty fish or supplements ↓ TG 20–50%; (3) restrict alcohol — major TG-raising agent; (4) weight loss 5–10% substantially reduces TG; (5) increase physical activity; (6) moderate total CHO (45–50%E); (7) very high TG (>5.6 mmol/L / 500 mg/dL): strict fat restriction <15–20%E total fat, MCT oil substitution, NPO/PN if pancreatitis risk; (8) avoid high-carb, low-fat diets — paradoxically raise TG. Target: TG <150 mg/dL. Borderline 150–199 / High 200–499 / Very high ≥500 mg/dL — risk stratification per AHA 2019.' },

  low_hdl:          { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33',
    note:'Low HDL Cholesterol (Krause 16th, Ch. 33): Low HDL is an independent CVD risk factor. Strategies to raise HDL: (1) aerobic exercise ≥150 min/week — single most effective non-pharmacologic intervention; (2) eliminate trans fat — trans fat ↓ HDL and ↑ LDL simultaneously; (3) replace SFA with MUFA (olive oil) — MUFA maintains or modestly raises HDL while ↓ LDL; (4) moderate alcohol may raise HDL, but not recommended therapeutically; (5) weight loss in overweight individuals raises HDL; (6) smoking cessation raises HDL. Low-fat, very-high-CHO diets can paradoxically lower HDL and raise TG — avoid. Mediterranean diet pattern supports HDL maintenance. HDL <40 mg/dL (men) / <50 mg/dL (women) = low-risk threshold.' },

  familial_hc:      { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / EAS FH Consensus 2019',
    note:'Familial Hypercholesterolaemia (FH) (Krause 16th, Ch. 33): Genetic disorder — LDL receptor defect causes marked LDL elevation (LDL >190 mg/dL untreated). Dietary modification alone insufficient — statin therapy mandatory from childhood/adolescence. Dietary targets: SFA <5%E (strictly), trans fat: eliminate completely, soluble fiber 25–40 g/day, plant sterols/stanols 2–3 g/day, dietary cholesterol minimal. Replace SFA with MUFA/PUFA aggressively. Heterozygous FH: achievable LDL reduction ~20–25% with diet + statin. Homozygous FH: extremely high LDL — LDL apheresis + combination pharmacotherapy often required; dietary modification is supportive. Monitor: LDL-C, Lp(a), apo-B. Screen first-degree relatives (cascade screening). Xanthomas, corneal arcus, xanthelasma may be present.' },

  familial_chl:     { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33',
    note:'Familial Combined Hyperlipidaemia (FCH) (Krause 16th, Ch. 33): Combined ↑ LDL + ↑ TG (and often ↓ HDL). Most common familial lipid disorder (~1:100). Dietary approach targets both LDL and TG: (1) SFA <5–6%E for LDL; (2) reduce refined CHO and simple sugars for TG; (3) omega-3 from fatty fish ≥2×/week for TG; (4) weight management — central obesity worsens FCH; (5) eliminate alcohol; (6) Mediterranean pattern addresses all fractions simultaneously. Pharmacotherapy: statin + fibrate combination often used. Monitor: LDL-C, TG, HDL-C, apo-B, non-HDL cholesterol. Non-HDL cholesterol (total cholesterol − HDL) is a useful secondary target.' },

  metabolic_synd_cvd:{ pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / IDF/AHA 2009',
    note:'Metabolic Syndrome — CVD Risk (Krause 16th, Ch. 33): Cluster of ≥3 of: central obesity (WC >102 cm men / >88 cm women), TG ≥150 mg/dL, HDL <40 (men)/<50 (women) mg/dL, BP ≥130/85 mmHg, fasting glucose ≥100 mg/dL. Dietary strategy: (1) Mediterranean or DASH diet as framework; (2) weight loss 5–10% — most impactful single intervention; (3) ↓ refined CHO + sugar-sweetened beverages; (4) ↑ dietary fiber; (5) ↓ SFA + trans fat; (6) increase physical activity ≥150 min/week; (7) sodium ≤2400 mg/day; (8) omega-3 from fatty fish. hs-CRP often elevated — anti-inflammatory diet (omega-3, fiber, antioxidants) supports reduction. Address insulin resistance with low GI foods and regular activity. CVD risk reduction requires simultaneous treatment of all components.' },

  cvd_high_risk:    { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / AHA/ACC PCE 2013',
    note:'High CVD Risk — 10-yr risk ≥10% (Krause 16th, Ch. 33): Calculated by ACC/AHA Pooled Cohort Equations (race, sex, age, TC, HDL, SBP, DM, smoking). Nutrition prescription: Aggressive dietary fat modification — SFA <5–6%E; trans fat eliminated; replace with MUFA/PUFA. Fiber ≥30 g/day (soluble fiber prioritised — psyllium, oats, legumes). Sodium ≤1500 mg/day (optimal). Omega-3: ≥2 servings fatty fish/week or supplemental EPA+DHA 1–2 g/day. Plant sterols 2 g/day. Mediterranean or DASH pattern. Weight reduction to BMI <25 if feasible. Physical activity: ≥150 min/week moderate or 75 min/week vigorous. Statin therapy universally recommended in this risk category. Monitor: LDL-C, non-HDL-C, TG, hs-CRP, blood pressure, glucose/HbA1c.' },

  cvd_mod_risk:     { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / AHA/ACC PCE 2013',
    note:'Moderate CVD Risk — 10-yr risk 5–9% (Krause 16th, Ch. 33): Dietary modification is first-line treatment before pharmacotherapy in moderate risk. Targets: SFA <7%E, trans fat minimal, fiber ≥25 g/day, sodium ≤2400 mg/day, omega-3 from 2 fish meals/week. DASH or Mediterranean dietary pattern recommended. Physical activity ≥150 min/week. Weight management if BMI ≥25. Reassess risk factors at 6–12 months — if LDL remains elevated despite dietary change, statin therapy should be discussed. Screen for diabetes and hypertension as co-risk factors. Lifestyle change alone can reduce 10-yr CVD risk by 20–30% in motivated patients.' },
  spinal:           { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'ABW',    gl:'ESPEN',             note:'SCI: adjust energy for reduced muscle mass and activity. Pressure injury risk.' },
  dementia:         { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Geriatric',   note:'Dementia: texture modification. Mealtime assistance. Avoid PEG unless agreed.' },
  neurodegen:       { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Neurology 2018 (Burgos et al. Clin Nutr 37:354–396)',  note:'ALS/PD/MS: progressive dysphagia — FEES/VFSS for assessment. ALS: screen at every visit, energy ~30 kcal/kg (non-ventilated). PD: protein redistribution diet if motor fluctuations (Rec 31, Grade B); levodopa 30 min before meals; monitor B12, folate, Vit D. MS: Vit D supplementation (Rec 36, Grade B). Plan PEG early while patient can consent (Recs 17–19, GPP).' },
  epilepsy_keto:    { pf:1.3, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'Ketogenic Diet Protocol', note:'Ketogenic: 4:1 ratio fat:CHO+protein. Supervised protocol. Monitor ketones.' },
  dm1:              { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW',    gl:'ESPEN DM 2023',     note:'T1DM: CHO-consistent diet. Insulin-to-CHO ratio. Carb counting.' },
  dm2:              { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW',    gl:'ESPEN DM 2023',     note:'T2DM: low GI CHO, high fibre. Mediterranean pattern. Weight management.' },
  dm_icu:           { pf:1.6, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'SCCM/ASPEN',        note:'DM in ICU: target BG 7.8–10 mmol/L. Diabetic EN formula. Avoid overfeeding.' },
  obesity:          { pf:2.0, range:'≥2.0 g/kg IBW/day', basis:'IBW',   gl:'SCCM/ASPEN Obesity', note:'Obesity: ≥2.0 g/kg IBW. Hypocaloric high-protein (65–70% energy target).' },
  obesity_severe:   { pf:2.2, range:'≥2.5 g/kg IBW/day', basis:'IBW',   gl:'ASPEN Obesity',     note:'Severe obesity BMI>40: ≥2.5 g/kg IBW. 50–60% energy target only.' },
  metabolic_synd:   { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW',    gl:'ESPEN Obesity 2022 (Clin Nutr 2022;41:1623–1632) / IDF-AHA consensus',             note:'Metabolic syndrome: low GI, high fibre, Mediterranean. Weight reduction.' },
  thyroid:          { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'Krause\'s 15th ed. / ATA Clinical Practice',             note:'Hyperthyroid: energy +20–30%. Hypothyroid: reduced REE, weight gain risk.' },
  adrenal:          { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN ICU 2023 (steroid catabolism) / Endocrinology consensus',             note:'Corticosteroid catabolism: high protein. Ca + Vit D supplementation.' },
  sam:              { pf:1.5, range:'1.0–2.0 g/kg/day', basis:'Actual', gl:'WHO SAM Protocol',  note:'SAM: F-75 stabilisation → F-100 catch-up → RUTF. 100–150 kcal/kg.' },
  mam:              { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'Actual', gl:'WHO MAM Protocol',  note:'MAM: RUSF or supplementary feeding. Monitor weight gain and complications.' },
  chronic_malnutrition:{ pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW', gl:'WHO',              note:'Chronic malnutrition: energy-dense foods + micronutrients. Growth monitoring.' },
  sarcopenia:       { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'Actual', gl:'EWGSOP2 2019 (Cruz-Jentoft et al., Age Ageing 2019;48:16–31)',  note:'Sarcopenia: ≥1.2 g/kg + resistance exercise. Leucine-enriched protein.' },
  refeeding_risk:   { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'NICE CG32 2006',    note:'Refeeding risk: start ≤5 kcal/kg (HIGH risk) or 10 kcal/kg (MODERATE). IV Thiamine BEFORE feeds.' },
  anorexia:         { pf:1.2, range:'0.8–1.5 g/kg/day', basis:'IBW',    gl:'MARSIPAN/ESPEN',    note:'Anorexia: incremental refeeding under MDT. Medical monitoring essential.' },
  pregnancy:        { pf:1.2, range:'1.1–1.5 g/kg/day', basis:'PrePregWt', gl:'WHO/NICE',       note:'Pregnancy: +300 kcal T2/T3. Folate, iron, iodine, Vit D essential.' },
  pregnancy_hg:     { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'PrePregWt', gl:'RCOG',          note:'Hyperemesis: PN if >5% weight loss. Thiamine before glucose. Anti-emetics.' },
  pregnancy_gest_dm:{ pf:1.1, range:'1.0–1.2 g/kg/day', basis:'PrePregWt', gl:'NICE',          note:'GDM: CHO-controlled, 4–5 small meals. Target BG as per NICE/local protocol.' },
  lactation:        { pf:1.2, range:'1.1–1.5 g/kg/day', basis:'Actual', gl:'WHO',               note:'Lactation: +500 kcal/day. Iodine, DHA, calcium critical.' },
  gi_surgery:       { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Surgery 2021 [80] / 2025 [81]', note:'GI surgery: peri-op immunonutrition 5–7d (arginine/ω-3/ribonucleotides). Early post-op EN within 24h. NRS-2002 screening; postpone surgery if high metabolic risk. Refs [79][80][81].' },
  ortho_trauma:     { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Orthopaedic trauma: Vit D + Ca + protein. Early mobilisation.' },
  pressure_injury:  { pf:1.7, range:'1.5–2.0 g/kg/day', basis:'Actual', gl:'EPUAP/NPUAP 2019',  note:'Pressure injury: 1.5–2.0 g/kg. Zinc 25 mg, Vit C 500 mg, arginine support.' },
  amputation:       { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Amputation: adjust caloric targets for reduced limb weight. Wound healing support.' },
  geriatric:        { pf:1.3, range:'1.0–1.5 g/kg/day', basis:'Actual', gl:'ESPEN Geriatric',   note:'Geriatric/Frailty: ≥1.2 g/kg. Late evening snack. Screen for sarcopenia.' },
  hip_fracture:     { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Hip fracture: Vit D + protein supplement peri-op. Delirium prevention.' },
  dehydration:      { pf:1.0, range:'1.0–1.2 g/kg/day', basis:'Actual', gl:'WHO',               note:'Dehydration: fluid 35 mL/kg + ongoing losses. Oral hydration first.' },
  home_en:          { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN HEN',         note:'Home EN: match hospital prescription. Regular monitoring and reassessment.' },
  pn_long_term:     { pf:1.3, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN HPN',         note:'Long-term PN: cyclic PN. Liver function + trace elements monitoring.' },
  immunosuppressed: { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Immunocompromised: safe food handling. Avoid raw foods. Adequate micronutrients.' },
  other_specify:    { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'ABW',    gl:'ESPEN General',     note:'Custom diagnosis — apply general protein targets; adjust based on clinical context and specific condition requirements.' },

  // ── Haematological (Krause & Mahan 16th ed, Ch. 32) ──────────
  iron_def_anemia:  { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'Krause & Mahan 16th ed., Ch. 32 (Loy)',
    note:'Iron Deficiency Anemia (Krause Ch. 32): Protein adequate for RBC regeneration (1.2–1.5 g/kg). Priority is dietary iron enhancement — heme iron (meat, fish, poultry, liver) is ~15% absorbable vs 3–8% nonheme. Include vitamin C at every meal to enhance nonheme iron absorption. Separate inhibitors (tea, coffee, milk, high-fibre foods) from iron-rich foods by ≥1 hour. Oral ferrous iron preferred (ferrous bisglycinate causes less GI distress; ferrous sulfate is least expensive). Therapeutic dose: 120 mg elemental iron/day for adults × 3–6 months. Continue 4–6 months after Hb normalises to replete stores. Coordinate with physician for therapeutic supplementation.' },

  megaloblastic_folate: { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed., Ch. 32 (Loy)',
    note:'Folate-Deficiency Megaloblastic Anemia (Krause Ch. 32): Protein adequate (1.2–1.5 g/kg). Folate RDA: 400 mcg/day (adults); 600 mcg/day in pregnancy. After anemia correction, multiple servings of folate-rich fresh or minimally cooked fruit/dark green vegetables daily — folate is heat-labile. Since 1998 grains are folic acid–fortified in many countries. Treat folate BEFORE confirming B12 status — folate supplementation corrects the anemia but can MASK neurologic damage from B12 deficiency. Rule out B12 deficiency concurrently. Symptomatic improvement (alertness, appetite) appears within 24–48 hours; full haematologic recovery takes ~1 month. MTHFR variant: use methylfolate (5-MTHF) rather than folic acid if suspected.' },

  pernicious_anemia:  { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',  gl:'Krause & Mahan 16th ed., Ch. 32 (Loy)',
    note:'Pernicious Anemia / Vitamin B12 Deficiency (Krause Ch. 32): High protein diet (1.5 g/kg) is desirable for blood cell regeneration (explicitly stated in Krause). Rich B12 sources: beef, pork, dark meat poultry, eggs, milk and milk products. Treatment: IM/SC injection 100 mcg B12 weekly initially, then monthly maintenance. Large oral B12 (1000 mcg/day) effective even without intrinsic factor (IF) via passive diffusion (~1% absorbed). Check for IF antibody (IFAB) and parietal cell antibodies (PCA) to confirm pernicious anemia vs dietary B12 deficiency. Metformin use reduces B12 absorption in 10–30% of patients — supplement and/or increase calcium intake. Age >50: crystalline B12 (fortified cereals, supplements) recommended to bypass atrophic gastritis. RDA adults: 2.4 mcg/day. Folate supplement alone MUST NOT be used — will mask B12 neurologic damage.' },

  anemia_chronic_dis: { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',  gl:'Krause & Mahan 16th ed., Ch. 32 (Loy) / Nemeth & Ganz 2014',
    note:'Anemia of Chronic Disease (ACD) (Krause Ch. 32): Mild, normochromic, normocytic anemia from inflammation, infection, autoimmune disorders, CKD, liver disease, or malignancy. Protein 1.2–1.5 g/kg for underlying disease support. CRITICAL: Do NOT give iron supplements — ferritin is normal or elevated (hepcidin traps iron in macrophages); iron supplementation is inappropriate and potentially harmful. Standard therapy is treatment of the underlying disorder. ESAs (erythropoietin-stimulating agents) or transfusion only in severe cases. Differentiate from IDA using STFR (soluble transferrin receptors): elevated in IDA, normal in ACD. CRP may be elevated — expect suppressed albumin and pre-albumin as acute-phase reactants, not true protein depletion markers.' },

  sickle_cell:        { pf:1.5, range:'1.2–1.5 g/kg/day + higher if hypermetabolic', basis:'ABW', gl:'Krause & Mahan 16th ed., Ch. 32 (Loy) / CDC SCD Guidelines 2020',
    note:'Sickle Cell Disease (SCD) (Krause Ch. 32): Elevated caloric needs due to constant haemolysis, inflammation, and oxidative stress (hypermetabolism). Protein: 1.2–1.5 g/kg minimum; higher if active crisis or wound healing. High folate (400–600 mcg/day) — increased RBC turnover raises folate requirement. Zinc supplement may be beneficial: decreased plasma zinc common in SS genotype, associated with growth, muscle mass, and sexual maturation deficits. Zinc competes with copper for absorption — co-supplement with at least RDA copper. Multivitamin/mineral 50–150% RDA for folate, zinc, copper — NOT iron. Fluid 2–3 quarts (2–3 L) daily + low-sodium diet to reduce vasoocclusive risk. Vitamins A, C, D, E, calcium, and fibre often deficient. If iron restriction needed: emphasise vegetable proteins; exclude liver, iron-fortified cereals, iron-fortified energy bars; avoid vitamin C supplements and alcohol (both enhance iron absorption). SCD ≠ iron deficiency — do not supplement iron unless confirmed by labs.' },

  thalassemia:        { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',  gl:'Krause & Mahan 16th ed., Ch. 32 (Loy) / Cunningham 2016',
    note:'Thalassemia (α and β) (Krause Ch. 32): High folate diet essential (increased RBC production). Emphasise vitamins A and C, and trace minerals zinc, copper, and selenium. Adequate calcium and vitamin D for bone health (osteomalacia risk from marrow expansion). NON-TRANSFUSED patients: moderately low-iron diet — limit iron-fortified foods and high-red-meat intake; avoid multivitamins with iron or vitamin C above RDA. TRANSFUSED patients: require regular chelation therapy (deferoxamine/deferasirox) to prevent iron accumulation — do NOT need low-iron diet restriction. Growth impairment in thalassemia major can be partially corrected by increasing caloric intake. Monitor cardiac, hepatic, and endocrine function (iron deposition effects). Caloric intake must meet the elevated metabolic demands of chronic haemolysis.' },

  iron_overload:      { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW',  gl:'Krause & Mahan 16th ed., Ch. 32 (Loy) / NIDDK 2020',
    note:'Iron Overload / Hereditary Hemochromatosis (Krause Ch. 32): Reduce meat, fish, and poultry — shift to plant-based or vegetarian diet to reduce heme iron absorption. Reduce vitamin C intake and AVOID vitamin C supplements (vitamin C greatly increases iron absorption). Avoid iron-fortified foods: breakfast cereals, energy/sports bars, meal-replacement drinks. No iron supplements or multivitamins containing iron. RDA for iron should not be exceeded; some patients need lower intakes. Treatment: weekly phlebotomy 2–3 years; chelation with deferoxamine (IV) or deferasirox (oral) for non-hereditary forms. Morbidity reduced if excess iron removed before hepatic cirrhosis or diabetes develops. Avoid alcohol — increases iron absorption. Avoid vitamin C supplements — promotes iron absorption. Risk of hepatomegaly, diabetes, cardiac disease, arthritis, hypogonadism, and colorectal cancer with progressive iron accumulation.' },

  sports_anemia:      { pf:1.4, range:'1.2–1.6 g/kg/day', basis:'ABW',  gl:'Krause & Mahan 16th ed., Ch. 32 (Loy) / Ch. 23 Sports Nutrition',
    note:'Sports Anemia / Exercise-Associated Anemia (Krause Ch. 32): Physiologic hemodilution — reduction in Hb early in aerobic training is ADVANTAGEOUS and does not impair performance; not a true pathologic anemia. Diet: adequate protein + iron-rich foods; avoid tea, coffee, antacids, H2-blockers, and tetracycline (all inhibit iron absorption). NEVER supplement iron without confirmed true deficiency from full CBC, serum ferritin, serum iron, TIBC, and percent transferrin saturation. High-risk groups requiring periodic monitoring: females, vegetarians, endurance athletes, those in growth spurts. If true IDA confirmed: treat as iron deficiency anemia (dietary + supervised supplementation). Monitor Hb response with 2–4 weeks of treatment.' },
};


// ══════════════════════════════════════════════════════════════════
// MULTI-CONDITION DIAGNOSIS SYSTEM
// ══════════════════════════════════════════════════════════════════

// All available conditions (mirrors the old <select> options)
const ALL_DIAGNOSES = [
  // ICU / Critical Care
  { group:'ICU / Critical Care', value:'sepsis',           label:'Sepsis / Septic Shock' },
  { group:'ICU / Critical Care', value:'sepsis_severe',    label:'Severe Sepsis (multi-organ)' },
  { group:'ICU / Critical Care', value:'trauma',           label:'Trauma / Polytrauma' },
  { group:'ICU / Critical Care', value:'burns',            label:'Burns (% TBSA)' },
  { group:'ICU / Critical Care', value:'ards',             label:'ARDS / Acute Respiratory Failure' },
  { group:'ICU / Critical Care', value:'cardiac',          label:'Post-Cardiac Surgery / Cardiogenic Shock' },
  { group:'ICU / Critical Care', value:'neuro',            label:'TBI / Stroke / Acquired Brain Injury' },
  { group:'ICU / Critical Care', value:'pancreatitis',     label:'Severe Acute Pancreatitis' },
  { group:'ICU / Critical Care', value:'general_icu',      label:'ICU / Post-surgical (General)' },
  { group:'ICU / Critical Care', value:'post_op',          label:'Major Elective Surgery (Post-op)' },
  { group:'ICU / Critical Care', value:'mechanical_vent',  label:'Mechanically Ventilated (Prolonged)' },
  // Renal
  { group:'Renal',          value:'aki_no_rrt',       label:'AKI — No RRT (Conservative)' },
  { group:'Renal',          value:'aki_rrt',           label:'AKI — On RRT / CRRT' },
  { group:'Renal',          value:'ckd',               label:'CKD — Pre-dialysis' },
  { group:'Renal',          value:'hd',                label:'CKD — Chronic Haemodialysis' },
  { group:'Renal',          value:'pd',                label:'CKD — Peritoneal Dialysis' },
  { group:'Renal',          value:'nephrotic',         label:'Nephrotic Syndrome' },
  { group:'Renal',          value:'renal_transplant',  label:'Renal Transplant' },
  // Pulmonary
  { group:'Pulmonary',      value:'copd',              label:'COPD / Chronic Lung Disease' },
  { group:'Pulmonary',      value:'copd_exac',         label:'COPD Exacerbation (Acute)' },
  { group:'Pulmonary',      value:'pneumonia',         label:'Pneumonia / LRTI' },
  { group:'Pulmonary',      value:'cf',                label:'Cystic Fibrosis' },
  { group:'Pulmonary',      value:'pulmonary_htn',     label:'Pulmonary Hypertension' },
  { group:'Pulmonary',      value:'lung_cancer',       label:'Lung Cancer / Malignancy' },
  // Infectious
  { group:'Infectious',     value:'hiv',               label:'HIV / AIDS (Stable)' },
  { group:'Infectious',     value:'hiv_active',        label:'HIV / AIDS (Active OI / Advanced)' },
  { group:'Infectious',     value:'tb',                label:'Tuberculosis — Active (TB)' },
  { group:'Infectious',     value:'tb_mdr',            label:'MDR-TB / XDR-TB' },
  { group:'Infectious',     value:'malaria',            label:'Malaria (Severe)' },
  { group:'Infectious',     value:'typhoid',            label:'Typhoid Fever' },
  { group:'Infectious',     value:'meningitis',         label:'Meningitis / Encephalitis' },
  { group:'Infectious',     value:'covid',              label:'COVID-19 (Moderate–Severe)' },
  // GI
  { group:'Gastrointestinal', value:'hepatic',              label:'Liver Disease / Cirrhosis' },
  { group:'Gastrointestinal', value:'hepatic_severe',       label:'Liver Failure / Decompensated Cirrhosis' },
  { group:'Gastrointestinal', value:'dysphagia',            label:'Dysphagia / Oropharyngeal Dysfunction' },
  { group:'Gastrointestinal', value:'gi_obstruction',       label:'GI Obstruction / Stricture' },
  { group:'Gastrointestinal', value:'pancreatitis',         label:'Acute / Chronic Pancreatitis' },
  { group:'Lower GI / IBD',   value:'constipation',         label:'Constipation (Chronic)' },
  { group:'Lower GI / IBD',   value:'diarrhoea_acute',      label:'Acute / Chronic Diarrhoea' },
  { group:'Lower GI / IBD',   value:'aad_cdiff',            label:'Antibiotic-Associated Diarrhoea / C. difficile' },
  { group:'Lower GI / IBD',   value:'coeliac',              label:'Coeliac Disease (CD)' },
  { group:'Lower GI / IBD',   value:'lactose_intolerance',  label:'Lactose Intolerance' },
  { group:'Lower GI / IBD',   value:'ibs',                  label:'Irritable Bowel Syndrome (IBS)' },
  { group:'Lower GI / IBD',   value:'sibo',                 label:'Small Intestinal Bacterial Overgrowth (SIBO)' },
  { group:'Lower GI / IBD',   value:'ibd',                  label:'IBD — General (Crohn\'s / UC)' },
  { group:'Lower GI / IBD',   value:'crohns',               label:'Crohn\'s Disease' },
  { group:'Lower GI / IBD',   value:'uc',                   label:'Ulcerative Colitis (UC)' },
  { group:'Lower GI / IBD',   value:'diverticulosis',       label:'Diverticulosis' },
  { group:'Lower GI / IBD',   value:'diverticulitis',       label:'Diverticulitis (Acute)' },
  { group:'Lower GI / IBD',   value:'microscopic_colitis',  label:'Microscopic Colitis' },
  { group:'Malabsorption / Stoma', value:'malabsorption',   label:'Malabsorption Syndrome' },
  { group:'Malabsorption / Stoma', value:'short_bowel',     label:'Short Bowel Syndrome (SBS)' },
  { group:'Malabsorption / Stoma', value:'gi_fistula',      label:'Enterocutaneous Fistula (ECF)' },
  { group:'Malabsorption / Stoma', value:'ileostomy',       label:'Ileostomy / High-output Stoma' },
  { group:'Malabsorption / Stoma', value:'colostomy',       label:'Colostomy' },
  { group:'Gastrointestinal', value:'gi_cancer',            label:'GI Cancer' },
  // Oncology
  { group:'Oncology',       value:'cancer_solid',      label:'Cancer — Solid Tumour' },
  { group:'Oncology',       value:'cancer_head_neck',  label:'Head & Neck Cancer' },
  { group:'Oncology',       value:'cancer_gi',         label:'GI / Abdominal Cancer' },
  { group:'Oncology',       value:'haem_malig',        label:'Haematological Malignancy' },
  { group:'Oncology',       value:'bmt',               label:'Bone Marrow / Stem Cell Transplant' },
  { group:'Oncology',       value:'post_chemo',        label:'Post-Chemotherapy / Radiotherapy' },
  { group:'Oncology',       value:'cachexia',          label:'Cancer Cachexia' },
  { group:'Oncology',       value:'palliative',        label:'Palliative / End-of-Life' },
  // Cardiac
  { group:'Cardiac',        value:'chf',               label:'Chronic Heart Failure (CHF)' },
  { group:'Cardiac',        value:'cardiac_cachexia',  label:'Cardiac Cachexia' },
  { group:'Cardiac',        value:'post_cardiac_surg', label:'Post-Cardiac Surgery' },
  { group:'Cardiac',        value:'endocarditis',      label:'Infective Endocarditis' },
  // Cardiovascular / Lipid (Krause 16th ed.)
  { group:'Cardiovascular', value:'ascvd',             label:'Atherosclerotic CVD (ASCVD)' },
  { group:'Cardiovascular', value:'coronary_hd',       label:'Coronary Heart Disease (CHD)' },
  { group:'Cardiovascular', value:'hypertension',      label:'Hypertension (Primary / Secondary)' },
  { group:'Cardiovascular', value:'dyslipidemia',      label:'Dyslipidemia (Mixed / Unspecified)' },
  { group:'Cardiovascular', value:'hypercholesterol',  label:'Hypercholesterolaemia (↑ LDL)' },
  { group:'Cardiovascular', value:'hypertriglyc',      label:'Hypertriglyceridaemia (↑ TG)' },
  { group:'Cardiovascular', value:'low_hdl',           label:'Low HDL Cholesterol' },
  { group:'Cardiovascular', value:'familial_hc',       label:'Familial Hypercholesterolaemia (FH)' },
  { group:'Cardiovascular', value:'familial_chl',      label:'Familial Combined Hyperlipidaemia (FCH)' },
  { group:'Cardiovascular', value:'metabolic_synd_cvd',label:'Metabolic Syndrome (CVD Risk)' },
  { group:'Cardiovascular', value:'cvd_high_risk',     label:'High CVD Risk (10-yr risk ≥10%)' },
  { group:'Cardiovascular', value:'cvd_mod_risk',      label:'Moderate CVD Risk (5–9%)' },
  // Neurological
  { group:'Neurological',   value:'stroke',            label:'Stroke (Ischaemic / Haemorrhagic)' },
  { group:'Neurological',   value:'spinal',            label:'Spinal Cord Injury' },
  { group:'Neurological',   value:'dementia',          label:'Dementia / Cognitive Impairment' },
  { group:'Neurological',   value:'neurodegen',        label:'Neurodegenerative Disease (PD/MND/MS)' },
  { group:'Neurological',   value:'epilepsy_keto',     label:'Epilepsy — Ketogenic Diet' },
  // Endocrine
  { group:'Endocrine',      value:'dm1',               label:'Type 1 Diabetes Mellitus' },
  { group:'Endocrine',      value:'dm2',               label:'Type 2 Diabetes Mellitus' },
  { group:'Endocrine',      value:'dm_icu',            label:'Hyperglycaemia / DM in ICU' },
  { group:'Endocrine',      value:'obesity',           label:'Obesity (BMI 30–40)' },
  { group:'Endocrine',      value:'obesity_severe',    label:'Severe Obesity (BMI >40)' },
  { group:'Endocrine',      value:'metabolic_synd',    label:'Metabolic Syndrome' },
  { group:'Endocrine',      value:'thyroid',           label:'Thyroid Disorder (Unspecified)' },
  { group:'Endocrine',      value:'hypothyroid',       label:'Hypothyroidism (Hashimoto / Primary)' },
  { group:'Endocrine',      value:'hyperthyroid',      label:'Hyperthyroidism / Graves Disease' },
  { group:'Endocrine',      value:'pcos',              label:'Polycystic Ovary Syndrome (PCOS)' },
  { group:'Endocrine',      value:'adrenal',           label:'Adrenal Insufficiency / Cushing\'s' },
  { group:'Endocrine',      value:'addison',           label:'Addison Disease (Primary Adrenal Insufficiency)' },
  { group:'Endocrine',      value:'cushing',           label:'Cushing Syndrome' },
  { group:'Endocrine',      value:'adrenal_fatigue',   label:'Adrenal Fatigue / Subclinical Adrenal Insufficiency' },
  // Malnutrition
  { group:'Malnutrition',   value:'sam',               label:'Severe Acute Malnutrition (SAM)' },
  { group:'Malnutrition',   value:'mam',               label:'Moderate Acute Malnutrition (MAM)' },
  { group:'Malnutrition',   value:'chronic_malnutrition', label:'Chronic Malnutrition / Stunting' },
  { group:'Malnutrition',   value:'sarcopenia',        label:'Sarcopenia / Muscle Wasting' },
  { group:'Malnutrition',   value:'refeeding_risk',    label:'High Risk of Refeeding Syndrome' },
  { group:'Malnutrition',   value:'anorexia',          label:'Anorexia Nervosa / Eating Disorder' },
  // Obstetrics
  { group:'Obstetrics',     value:'pregnancy',         label:'Pregnancy (Normal)' },
  { group:'Obstetrics',     value:'pregnancy_hg',      label:'Hyperemesis Gravidarum' },
  { group:'Obstetrics',     value:'pregnancy_gest_dm', label:'Gestational Diabetes' },
  { group:'Obstetrics',     value:'lactation',         label:'Lactation / Breastfeeding' },
  // Surgical
  { group:'Surgical',       value:'gi_surgery',        label:'GI Surgery (Gastrectomy / Colectomy)' },
  { group:'Surgical',       value:'ortho_trauma',      label:'Orthopaedic Trauma / Hip Fracture' },
  { group:'Surgical',       value:'pressure_injury',   label:'Pressure Injury / Wound' },
  { group:'Surgical',       value:'amputation',        label:'Amputation' },
  // Geriatric
  { group:'Geriatric',      value:'geriatric',         label:'Geriatric / Frailty Syndrome' },
  { group:'Geriatric',      value:'hip_fracture',      label:'Hip Fracture (Elderly)' },
  { group:'Geriatric',      value:'dehydration',       label:'Dehydration / Poor Oral Intake' },
  // General
  { group:'General',        value:'general',           label:'General Ward / Unspecified' },
  { group:'General',        value:'home_en',            label:'Home Enteral Nutrition (HEN)' },
  { group:'General',        value:'immunosuppressed',   label:'Immunocompromised (Transplant / Steroids)' },
  { group:'General',        value:'other_specify',      label:'Other (Specify)' },
  // Haematological
  { group:'Haematological', value:'iron_def_anemia',    label:'Iron Deficiency Anemia (IDA)' },
  { group:'Haematological', value:'megaloblastic_folate', label:'Megaloblastic Anemia — Folate Deficiency' },
  { group:'Haematological', value:'pernicious_anemia',  label:'Pernicious Anemia / Vitamin B12 Deficiency' },
  { group:'Haematological', value:'anemia_chronic_dis', label:'Anemia of Chronic Disease (ACD)' },
  { group:'Haematological', value:'sickle_cell',        label:'Sickle Cell Disease (SCD)' },
  { group:'Haematological', value:'thalassemia',        label:'Thalassemia (Alpha / Beta)' },
  { group:'Haematological', value:'iron_overload',      label:'Iron Overload / Hemochromatosis' },
  { group:'Haematological', value:'sports_anemia',      label:'Sports Anemia (Exercise-Associated)' },
];

// Active selected conditions (array of values)
let _selectedDiagnoses = [];
const MAX_DIAGNOSES = 5;

// Build the diagnosis list UI
// Show/hide the "Specify Medical Diagnosis" field
// Update the tag label to show custom text if entered
function onOtherSpecifyInput() {
  const inp   = document.getElementById('other-specify-input');
  const hint  = document.getElementById('other-specify-hint');
  const val   = inp ? inp.value.trim() : '';
  if (hint) hint.textContent = val ? 'Custom diagnosis will appear in results.' : '';
  // Update the tag text live
  const tagEls = document.querySelectorAll('.diag-tag');
  tagEls.forEach(t => {
    if (t.textContent.startsWith('Other (Specify)') || t.dataset.val === 'other_specify') {
      const xSpan = t.querySelector('.diag-tag-x');
      t.textContent = (val || 'Other (Specify)') + ' ';
      if (xSpan) t.appendChild(xSpan);
    }
  });
}

// Returns array of active diagnosis values
function getActiveDiagnoses() {
  const selEl = document.getElementById('diagnosis');
  if (_selectedDiagnoses.length) return _selectedDiagnoses;
  return (selEl && selEl.value) ? [selEl.value] : ['general'];
}

// Get the combined protein factor (highest across all active conditions)
function getCombinedProteinFactor(diagnoses) {
  if (!diagnoses.length) return null;
  let best = null;
  diagnoses.forEach(dv => {
    const dm = (typeof DIAGNOSIS_PROTEIN_MAP !== 'undefined') ? DIAGNOSIS_PROTEIN_MAP[dv] : null;
    if (dm && (!best || dm.pf > best.pf)) best = { ...dm, diagnosis: dv };
  });
  return best;
}

// Get combined hints for all active conditions
function getCombinedHint(diagnoses) {
  return diagnoses
    .map(dv => DIAGNOSIS_HINTS[dv])
    .filter(Boolean)
    .join(' | ');
}

// Initialise on page load
document.addEventListener('DOMContentLoaded', () => {
  try { buildDiagList(); } catch(e) {}
  try { onRenalChange(); } catch(e) {}
});

// ─── KDOQI 2020 CKD Stage Hints ───────────────────────────────────────────────
var KDOQI_HINTS = {
  ckd_g1g2: ' KDOQI 2020 · G1–G2 (eGFR ≥60) · Protein 0.6–0.8 g/kg/day IBW (restrict to slow progression) · Energy 25–35 kcal/kg · K⁺, Na⁺, PO₄ usually unrestricted at this stage',
  ckd_g3a:  ' KDOQI 2020 · G3a (eGFR 45–59) · Protein 0.6–0.8 g/kg/day IBW · Energy 25–35 kcal/kg · Monitor K⁺ & PO₄; consider Na⁺ restriction if hypertensive',
  ckd_g3b:  ' KDOQI 2020 · G3b (eGFR 30–44) · Protein 0.6–0.8 g/kg/day IBW · Energy 30–35 kcal/kg · Begin K⁺/PO₄ monitoring; consider dietitian-led CKD clinic',
  ckd_g4:   ' KDOQI 2020 · G4 (eGFR 15–29) · Protein 0.6–0.8 g/kg/day IBW · Very Low Protein (0.3–0.4 g/kg + keto-analogues) if motivated & dietitian-supervised · Energy 30–35 kcal/kg · Restrict K⁺, PO₄, Na⁺',
  ckd_g5:   ' KDOQI 2020 · G5 pre-dialysis (eGFR <15) · Protein 0.6–0.8 g/kg/day IBW (or VLP 0.3–0.4 g/kg + keto-analogues) · Energy 30–35 kcal/kg · Strict K⁺, PO₄, fluid & Na⁺ restriction · Prepare for RRT',
  ckd:      ' KDOQI 2020 · CKD non-dialysis (stage unspecified) · Protein 0.6–0.8 g/kg/day IBW · Energy 25–35 kcal/kg · Monitor electrolytes',
  hd:       ' KDOQI 2020 · G5D Haemodialysis · Protein ≥1.0–1.2 g/kg/day dry wt (up to 1.4 in hypercatabolic) · Energy 25–35 kcal/kg · K⁺ & PO₄ restriction; fluid ~500–750 mL/day + urine output',
  pd:       ' KDOQI 2020 · G5D Peritoneal Dialysis · Protein 1.2–1.5 g/kg/day dry wt (peritoneal losses 5–15 g/day) · Energy 25–35 kcal/kg (subtract dextrose calories from dialysate) · Fluid, K⁺, Na⁺, PO₄ restriction',
  aki_no_rrt: ' KDIGO 2012 / ESPEN 2023 · AKI no RRT · Protein 0.8–1.2 g/kg/day ABW · Do NOT restrict protein to delay RRT · Monitor BUN trend',
  aki_rrt:  ' KDIGO / ESPEN 2023 · AKI on CRRT · Protein 1.5–2.5 g/kg/day IBW · CRRT losses 10–15 g AA/day · Up to 2.5 g/kg in hypercatabolic sepsis',
};

function onRenalChange() {
  var sel   = document.getElementById('renal');
  var hint  = document.getElementById('renal-kdoqi-hint');
  if (!sel || !hint) return;
  var v = sel.value;
  if (KDOQI_HINTS[v]) {
    hint.textContent = KDOQI_HINTS[v];
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
  }
}

// ──────────────────────────────────────────────────────────────────────────────

function onDiagnosisChange() {
  const _sel = document.getElementById('diagnosis');
  if (_sel && !_sel.multiple) _selectedDiagnoses = _sel.value ? [_sel.value] : ['general'];
  const ow = document.getElementById('other-specify-wrap');
  if (ow) ow.style.display = (_sel && _sel.value==='other_specify') ? '' : 'none';
  const diagnoses = getActiveDiagnoses();
  const val = diagnoses[0] || 'general';

  // Update hint with combined hints for all selected conditions
  const hint = document.getElementById('diagnosis-hint');
  if (hint) {
    const combined = getCombinedHint(diagnoses);
    hint.textContent = combined || DIAGNOSIS_HINTS[val] || '';
  }

  // Show/hide burns card if burns is among selected diagnoses
  const burnsCard = document.getElementById('burns-card');
  const hasBurns = diagnoses.includes('burns');
  if (burnsCard) burnsCard.style.display = hasBurns ? '' : 'none';
  if (hasBurns && typeof burnEquationPreview === 'function') burnEquationPreview();

  // Auto-suggest renal/hepatic selects based on primary/first condition
  const renalSel   = document.getElementById('renal');
  const hepaticSel = document.getElementById('hepatic');
  const renal2hepatic = { aki_no_rrt:'aki_no_rrt', aki_rrt:'aki_rrt', ckd:'ckd', ckd_g1g2:'ckd_g1g2', ckd_g3a:'ckd_g3a', ckd_g3b:'ckd_g3b', ckd_g4:'ckd_g4', ckd_g5:'ckd_g5', hd:'hd', pd:'pd', nephrotic:'normal', renal_transplant:'normal' };
  if (renalSel && renal2hepatic[val]) renalSel.value = renal2hepatic[val];
  if (hepaticSel && (val === 'hepatic' || val === 'hepatic_severe')) hepaticSel.value = val === 'hepatic_severe' ? 'severe' : 'mild';
}


// MODULE: NUTRITION DATABASE

let dbInitialized = false;

function dbInit() {
  if (dbInitialized) return;
  dbInitialized = true;

  // Populate category dropdown
  const catSel = document.getElementById('db-cat');
  const cats = [...new Set(MALAWI_FCT.map(f => f.cat))].sort();
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    catSel.appendChild(opt);
  });

  // Set total food count
  const countEl = document.getElementById('db-food-count');
  if (countEl) countEl.textContent = MALAWI_FCT.length;

  // Set category stat
  const catStat = document.getElementById('db-stat-categories');
  if (catStat) catStat.textContent = cats.length;

  dbRender();
  dbRenderHighlights();
  setTimeout(hscrollReinit, 100);
}

function dbGetPer100(food) {
  // Get per-100g values — use first measure and normalise to 100g.
  // Guards against missing measures or null weight (defensive).
  const m = food.measures?.[0];
  if (!m) {
    return { kcal: food.kcal ?? 0, pro: food.pro ?? 0, cho: food.cho ?? 0, fat: food.fat ?? 0, kj: food.kj ?? 0 };
  }
  if (!m.weight) {
    return { kcal: m.kcal ?? 0, pro: m.pro ?? 0, cho: m.cho ?? 0, fat: m.fat ?? 0, kj: m.kj ?? 0 };
  }
  const factor = 100 / m.weight;
  if (m.weight === 100) return { kcal: m.kcal, pro: m.pro, cho: m.cho, fat: m.fat, kj: m.kj };
  return {
    kcal: +(m.kcal * factor).toFixed(1),
    pro:  +(m.pro  * factor).toFixed(1),
    cho:  +(m.cho  * factor).toFixed(1),
    fat:  +(m.fat  * factor).toFixed(1),
    kj:   +(m.kj   * factor).toFixed(0),
  };
}

// ── GLOBAL FOOD SEARCH STATE ──────────────────────────────────────────────
const _dbGlobalResults = { items: [], active: false };

/**
 * dbRender — Layered Food Search (Local → Chakudya API)
 *
 * When the user types a query:
 *   1. In-memory Chakudya data (loaded async by chakudyaDB.js) is filtered.
 *   2. If local returns results, the table updates instantly.
 *   3. If local returns nothing (or enrichment forced), async API layers fire.
 *   4. API results are merged and appended to the table with a source badge.
 *
 * Category filter / sort / per-mode all still apply to local results.
 * API results are shown in a separate "Global Results" section below the table.
 * UCT Exchange List is excluded — it is a diabetic exchange system with its own tools.
 */
function dbRender() {
  const search  = (document.getElementById('db-search')?.value || '').trim();
  const cat     = document.getElementById('db-cat')?.value || '';
  const sort    = document.getElementById('db-sort')?.value || 'name';
  const perMode = document.getElementById('db-per')?.value || '100';
  const searchN = search.toLowerCase();

  // ── LOCAL FILTER — Malawi FCT only (UCT Exchange is a diabetic exchange
  //    system and is excluded from general search; it lives in its own tools) ──
  let foods;
  // Filter in-memory Chakudya data (loaded async by chakudyaDB.js)
  foods = MALAWI_FCT.filter(f => {
    const nameMatch = !searchN || f.name.toLowerCase().includes(searchN);
    const catMatch  = !cat     || f.cat === cat;
    return nameMatch && catMatch;
  });

  // ── ENTERAL FORMULAS — Chakudya CNR /formulas registry only ────────────
  // ENTERAL_DB is being retired, so this no longer touches it. GET /formulas
  // has no text-search query param (only route/limit/offset — see the API
  // README), so NTFoodSearch.searchEnteral() fetches the whole (paginated)
  // registry into an offline IndexedDB cache and matches it client-side
  // with the same tiered scorer used everywhere else in Food Search — see
  // foodSearch.js Layer 1b / 2c. Only fired on an actual search term and
  // only when the category filter is unset or specifically "Enteral
  // Formula", so a plain food browse never pulls formulas in.
  if (searchN.length >= 2 && (!cat || cat === 'Enteral Formula') &&
      typeof NTFoodSearch !== 'undefined' && typeof NTFoodSearch.searchEnteral === 'function') {
    try {
      const formulaHits = NTFoodSearch.searchEnteral(search, 20) || [];
      formulaHits.forEach(h => {
        if (!h || !h.name) return;
        foods.push({
          name:      h.name,
          cat:       'Enteral Formula',
          isFormula: true,
          route:     h.route || null,
          kcal: h.kcal ?? 0, kj: h.kj ?? 0, pro: h.pro ?? 0, cho: h.cho ?? 0, fat: h.fat ?? 0,
          measures: [{
            lbl: h.route ? `Per 100 mL · ${h.route}` : 'Per 100 mL',
            weight: 100,
            kcal: h.kcal ?? 0, kj: h.kj ?? 0, pro: h.pro ?? 0, cho: h.cho ?? 0, fat: h.fat ?? 0,
          }],
        });
      });
    } catch (_e) { /* CNR formula cache not yet hydrated — offline-first, skip silently */ }
  }

  // Sort
  if (sort === 'name')     foods.sort((a,b) => a.name.localeCompare(b.name));
  else if (sort === 'cat') foods.sort((a,b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
  else if (sort === 'kcal_desc') foods.sort((a,b) => dbGetPer100(b).kcal - dbGetPer100(a).kcal);
  else if (sort === 'kcal_asc')  foods.sort((a,b) => dbGetPer100(a).kcal - dbGetPer100(b).kcal);
  else if (sort === 'pro_desc')  foods.sort((a,b) => dbGetPer100(b).pro  - dbGetPer100(a).pro);

  const tbody = document.getElementById('db-tbody');
  const noRes = document.getElementById('db-no-results');
  const badge = document.getElementById('db-table-badge');

  // Update stats
  const statFoods = document.getElementById('db-stat-foods');
  const statKcal  = document.getElementById('db-stat-avg-kcal');
  const statPro   = document.getElementById('db-stat-avg-pro');
  if (statFoods) statFoods.textContent = foods.length;
  if (foods.length && statKcal) {
    const avgKcal = foods.reduce((s,f) => s + (dbGetPer100(f).kcal || 0), 0) / foods.length;
    const avgPro  = foods.reduce((s,f) => s + (dbGetPer100(f).pro  || 0), 0) / foods.length;
    statKcal.textContent = avgKcal.toFixed(0);
    statPro.textContent  = avgPro.toFixed(1);
  }
  const formulaCount = foods.filter(f => f.isFormula).length;
  if (badge) badge.textContent = formulaCount
    ? `${foods.length} results (${formulaCount} formula${formulaCount > 1 ? 's' : ''})`
    : `${foods.length} of ${MALAWI_FCT.length} foods`;

  if (!foods.length) {
    tbody.innerHTML = '';
    if (noRes) noRes.style.display = '';
    // Trigger global (API) search when local has nothing
    if (search.length >= 2) _dbGlobalSearch(search);
    return;
  }
  if (noRes) noRes.style.display = 'none';
  // Clear any previous global results panel
  _dbClearGlobalPanel();

  // Update measure header
  const thMeasure = document.getElementById('db-th-measure');
  if (thMeasure) thMeasure.textContent = perMode === '100' ? 'Values per 100g' : 'Serving Measure';

  if (perMode === '100') {
    // One row per food, per 100g
    tbody.innerHTML = foods.map(f => {
      const v = dbGetPer100(f);
      const density = v.kcal > 0 ? (v.kcal / 100).toFixed(2) : '—';
      const catColor = {
        Staples:'var(--amber)', Legumes:'var(--teal)', Vegetables:'var(--green)',
        'Protein Foods':'var(--blue)', Fruits:'#ff9f43', 'Fats & Oils':'var(--red)',
        Beverages:'var(--purple)', Condiments:'var(--text-dim)', 'Enteral Formula':'var(--purple)'
      }[f.cat] || 'var(--text-dim)';
      return `<tr>
        <td style="font-weight:600;color:var(--text-bright)">${f.name}</td>
        <td><span style="font-size:9px;padding:2px 8px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid;border-color:${catColor};color:${catColor}">${f.cat}</span></td>
        <td style="color:var(--text-dim);font-size:10px">${f.isFormula ? 'per 100mL' : 'per 100g'}</td>
        <td style="color:var(--text-dim)">100</td>
        <td style="color:var(--amber);font-weight:700">${v.kcal}</td>
        <td style="color:var(--text-dim)">${v.kj}</td>
        <td style="color:var(--blue);font-weight:600">${v.pro}</td>
        <td style="color:var(--teal)">${v.cho}</td>
        <td style="color:var(--green)">${v.fat}</td>
        <td style="color:var(--text-dim);font-size:10px">${density}</td>
      </tr>`;
    }).join('');
  } else {
    // Multiple rows per food — one per measure
    const rows = [];
    foods.forEach(f => {
      const catColor = {
        Staples:'var(--amber)', Legumes:'var(--teal)', Vegetables:'var(--green)',
        'Protein Foods':'var(--blue)', Fruits:'#ff9f43', 'Fats & Oils':'var(--red)',
        Beverages:'var(--purple)', Condiments:'var(--text-dim)', 'Enteral Formula':'var(--purple)'
      }[f.cat] || 'var(--text-dim)';
      f.measures.forEach((m, mi) => {
        rows.push(`<tr>
          ${mi===0 ? `<td rowspan="${f.measures.length}" style="font-weight:600;color:var(--text-bright);vertical-align:top;border-right:1px solid var(--border)">${f.name}</td>
          <td rowspan="${f.measures.length}" style="vertical-align:top"><span style="font-size:9px;padding:2px 8px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid;border-color:${catColor};color:${catColor}">${f.cat}</span></td>` : ''}
          <td style="color:var(--teal);font-size:10px">${m.lbl}</td>
          <td style="color:var(--text-dim)">${m.weight || (()=>{const wm=(m.lbl||'').match(/[(](\d+(?:\.\d+)?)[\s]*(?:g|mL|ml)[)]/i);return wm?wm[1]:'—'})()}</td>
          <td style="color:var(--amber);font-weight:700">${m.kcal}</td>
          <td style="color:var(--text-dim)">${m.kj}</td>
          <td style="color:var(--blue);font-weight:600">${m.pro}</td>
          <td style="color:var(--teal)">${m.cho}</td>
          <td style="color:var(--green)">${m.fat}</td>
          <td style="color:var(--text-dim);font-size:10px">${m.kcal>0?(()=>{const wm=(m.lbl||'').match(/[(](\d+(?:\.\d+)?)[\s]*(?:g|mL|ml)[)]/i);const wg=m.weight||(wm?parseFloat(wm[1]):100);return(m.kcal/wg).toFixed(2)})():'—'}</td>
        </tr>`);
      });
    });
    tbody.innerHTML = rows.join('');
  }
}

function dbRenderHighlights() {
  const el = document.getElementById('db-highlights');
  if (!el) return;
  const highlights = [
    { label:' Highest Energy', icon:'', sort:(a,b)=>dbGetPer100(b).kcal-dbGetPer100(a).kcal, unit:'kcal/100g', val:f=>dbGetPer100(f).kcal+' kcal', color:'var(--amber)' },
    { label:' Highest Protein', icon:'', sort:(a,b)=>dbGetPer100(b).pro-dbGetPer100(a).pro, unit:'g protein/100g', val:f=>dbGetPer100(f).pro+'g', color:'var(--blue)' },
    { label:' Lowest Energy (vegetables)', icon:'', filter:f=>f.cat==='Vegetables', sort:(a,b)=>dbGetPer100(a).kcal-dbGetPer100(b).kcal, unit:'kcal/100g (lowest)', val:f=>dbGetPer100(f).kcal+' kcal', color:'var(--green)' },
  ];
  el.innerHTML = highlights.map(h => {
    let foods = [...MALAWI_FCT];
    if (h.filter) foods = foods.filter(h.filter);
    foods.sort(h.sort);
    const top5 = foods.slice(0,5);
    return `<div class="hscroll-item highlight-card" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px">
      <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:1.5px;color:${h.color};text-transform:uppercase;margin-bottom:10px">${h.label}</div>
      ${top5.map((f,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px dotted rgba(255,255,255,.05);font-family:var(--mono);font-size:10px">
        <span style="color:var(--text)">${i+1}. ${f.name}</span>
        <span style="color:${h.color};font-weight:700">${h.val(f)}</span>
      </div>`).join('')}
    </div>`;
  }).join('');
  requestAnimationFrame(hscrollReinit);
}

function dbExportCSV() {
  // Database export disabled — food composition tables are not downloadable.
  showToast('Database export is disabled');
}


// ══════════════════════════════════════════════════════════════════
// PKG — PACKAGED FOODS MODULE
// Chakudya API (GET/POST /packaged) · in-memory index + IndexedDB cache,
// built and kept fresh by PackagedFoodsDB / rebuildPackagedFoodIndex()
// in foodData.js. No Firestore involved — anyone can submit a food item;
// submissions land with status "pending" and are reviewed server-side.
// Only approved items come back from GET /packaged.
// ══════════════════════════════════════════════════════════════════

let pkgInitialized = false;
let pkgCurrentPage = 0;
const PKG_PAGE_SIZE = 25;
let pkgEditingId = null;

// ── Init ──────────────────────────────────────────────────────────
async function pkgInit() {
  if (pkgInitialized) return;
  pkgInitialized = true;
  if (typeof PackagedFoodsDB === 'undefined') {
    console.warn('[pkgInit] PackagedFoodsDB not loaded');
    return;
  }
  await PackagedFoodsDB.ready();
  pkgRender();
  pkgUpdateStats();
}

// ── Render ────────────────────────────────────────────────────────
function pkgRender() {
  if (typeof PackagedFoodsDB === 'undefined') return;
  const query   = (document.getElementById('pkg-search')?.value || '').trim();
  const sortVal = document.getElementById('pkg-sort')?.value || 'name';
  const tbody   = document.getElementById('pkg-tbody');
  const noRes   = document.getElementById('pkg-no-results');
  if (!tbody) return;

  let items;
  if (query.length >= 2) {
    items = PackagedFoodsDB.search(query, { limit: 500 });
  } else {
    items = PackagedFoodsDB.list({ page: 0, size: 99999 }).items;
  }

  items = [...items];
  const cmp = {
    name:      (a, b) => (a.name  || '').localeCompare(b.name  || ''),
    brand:     (a, b) => (a.brand || '').localeCompare(b.brand || ''),
    kcal_desc: (a, b) => (b.kcal  || 0) - (a.kcal  || 0),
    kcal_asc:  (a, b) => (a.kcal  || 0) - (b.kcal  || 0),
    recent:    (a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0),
  };
  if (cmp[sortVal]) items.sort(cmp[sortVal]);

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / PKG_PAGE_SIZE));
  pkgCurrentPage = Math.min(pkgCurrentPage, pages - 1);
  const slice = items.slice(pkgCurrentPage * PKG_PAGE_SIZE, (pkgCurrentPage + 1) * PKG_PAGE_SIZE);

  const badge = document.getElementById('pkg-table-badge');
  if (badge) badge.textContent = `${total} product${total !== 1 ? 's' : ''}`;

  if (!slice.length) {
    tbody.innerHTML = '';
    if (noRes) noRes.style.display = '';
    pkgRenderPagination(0, 0);
    return;
  }
  if (noRes) noRes.style.display = 'none';

  const fmt = v => (v != null && v !== '') ? (+v).toFixed(1) : '—';

  tbody.innerHTML = slice.map(f => {
    const safeId = (f.id || '').replace(/'/g, "\\'");
    const submittedBadge = f.submittedBy
      ? `<span style="font-size:9px;color:var(--text-dim);display:block;margin-top:2px">by ${f.submittedBy}</span>`
      : '';
    const flagBadge = f.nutritionFlag?.type === 'kcal_mismatch'
      ? `<span title="kcal doesn't match protein/carbs/fat (≈${f.nutritionFlag.expectedKcal} kcal expected)"
           style="font-size:9px;color:#fbbf24;display:block;margin-top:2px">⚠ kcal mismatch</span>`
      : '';
    return `<tr>
      <td style="font-weight:500;color:var(--text)">${f.name || '—'}${submittedBadge}${flagBadge}</td>
      <td style="color:var(--text-dim)">${f.brand || '—'}</td>
      <td style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">${f.barcode || '—'}</td>
      <td style="text-align:center;color:var(--text-dim)">${f.servingSize != null ? f.servingSize + 'g' : '—'}</td>
      <td style="color:var(--amber);font-weight:600;text-align:right">${fmt(f.kcal)}</td>
      <td style="color:var(--blue);text-align:right">${fmt(f.pro)}</td>
      <td style="color:var(--teal);text-align:right">${fmt(f.cho)}</td>
      <td style="color:var(--green);text-align:right">${fmt(f.fat)}</td>
      <td style="text-align:right">${fmt(f.fiber)}</td>
      <td style="text-align:right">${fmt(f.sodium)}</td>

    </tr>`;
  }).join('');

  pkgRenderPagination(pkgCurrentPage, pages);
}

function pkgRenderPagination(page, pages) {
  const el = document.getElementById('pkg-pagination');
  if (!el) return;
  if (pages <= 1) { el.innerHTML = ''; return; }

  const btn = (label, n, active) =>
    `<button onclick="pkgGoPage(${n})"
      style="font-family:var(--mono);font-size:10px;padding:5px 11px;border-radius:5px;cursor:pointer;
             border:1px solid ${active ? 'var(--teal)' : 'var(--border)'};
             background:${active ? 'var(--teal)' : 'transparent'};
             color:${active ? '#0d1117' : 'var(--text-dim)'};font-weight:${active ? '700' : '400'}">
      ${label}
    </button>`;

  let html = page > 0 ? btn('← Prev', page - 1, false) : '';
  for (let i = 0; i < pages; i++) {
    if (pages <= 7 || i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) {
      html += btn(i + 1, i, i === page);
    } else if (Math.abs(i - page) === 2) {
      html += `<span style="color:var(--text-dim);padding:0 2px;font-size:12px">…</span>`;
    }
  }
  if (page < pages - 1) html += btn('Next →', page + 1, false);
  el.innerHTML = html;
}

function pkgGoPage(n) {
  pkgCurrentPage = n;
  pkgRender();
  document.getElementById('pkg-table')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Stats card updater ────────────────────────────────────────────
async function pkgUpdateStats() {
  if (typeof PackagedFoodsDB === 'undefined') return;

  const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const all   = PackagedFoodsDB.list({ page: 0, size: 99999 });
  const brands = new Set(all.items.map(f => f.brand).filter(Boolean)).size;

  setEl('pkg-stat-total',  all.total || '0');
  setEl('pkg-stat-brands', brands || '—');
  setEl('pkg-stat-status', navigator.onLine ? '🟢 Online' : '🔴 Offline');

  try {
    const syncTime = await new Promise((res, rej) => {
      const req = indexedDB.open('OasisPackagedFoods'); // no version arg — avoids VersionError vs foodData.js's IDB_VERSION
      req.onerror = () => res(null);
      req.onsuccess = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('meta')) { db.close(); res(null); return; }
        const tx  = db.transaction('meta', 'readonly');
        const get = tx.objectStore('meta').get('lastSync');
        get.onsuccess = () => { db.close(); res(get.result?.value ?? null); };
        get.onerror   = () => { db.close(); res(null); };
      };
    });
    if (syncTime) {
      const d = new Date(syncTime);
      setEl('pkg-stat-synced',
        d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) + ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } else {
      setEl('pkg-stat-synced', 'Never');
    }
  } catch {
    setEl('pkg-stat-synced', '—');
  }
}

// ── Add / Edit Modal ──────────────────────────────────────────────
// ── Manual-entry nutrition basis: "100" (per 100g/ml, stored as-is) or
// "serving" (user typed values as printed per-serving; we scale to per-100g/
// ml before submitting, same normalization the OCR/scan path already does
// server-side). Default "100" preserves prior behavior for anyone used to
// doing the math themselves. ──────────────────────────────────────────────
let pkgNutritionBasis = '100';

function pkgSetNutritionBasis(basis) {
  pkgNutritionBasis = (basis === 'serving') ? 'serving' : '100';
  const btn100 = document.getElementById('pkg-basis-btn-100');
  const btnServing = document.getElementById('pkg-basis-btn-serving');
  const hint = document.getElementById('pkg-basis-hint');
  const sectionLabel = document.getElementById('pkg-nutrition-basis-label');
  const active   = { color: 'var(--teal)', background: 'rgba(29,233,212,.12)', border: '1px solid var(--teal)' };
  const inactive = { color: 'var(--text-dim)', background: 'transparent', border: '1px solid var(--border)' };
  if (btn100)     Object.assign(btn100.style,     pkgNutritionBasis === '100'     ? active : inactive);
  if (btnServing) Object.assign(btnServing.style, pkgNutritionBasis === 'serving' ? active : inactive);
  if (hint) hint.style.display = pkgNutritionBasis === 'serving' ? 'block' : 'none';
  if (sectionLabel) sectionLabel.textContent = pkgNutritionBasis === 'serving' ? 'NUTRITION PER SERVING' : 'NUTRITION PER 100 g / ml';
}

// Fixed conversion factors (kJ ↔ kcal): kcal = kJ ÷ 4.184, kJ = kcal × 4.184.
// Live-fills whichever of the two energy fields the person didn't just type
// in, so they only ever need to copy one number off the label. Only the
// field NOT being edited is overwritten, so it never fights the person's
// typing or clobbers a value they entered on purpose in both boxes.
function pkgSyncEnergyField(source) {
  const kcalEl = document.getElementById('pkg-f-kcal');
  const kjEl   = document.getElementById('pkg-f-kj');
  if (!kcalEl || !kjEl) return;
  if (source === 'kcal') {
    const kcal = parseFloat(kcalEl.value);
    kjEl.value = (kcalEl.value !== '' && !isNaN(kcal)) ? Math.round(kcal * 4.184) : '';
  } else {
    const kj = parseFloat(kjEl.value);
    kcalEl.value = (kjEl.value !== '' && !isNaN(kj)) ? Math.round(kj / 4.184) : '';
  }
}

/** Scales a per-serving value to per-100g/ml, rounded to 2dp. Null-safe. */
function _pkgScaleToPer100(value, servingSize) {
  if (value == null || !servingSize) return value;
  return Math.round(value * (100 / servingSize) * 100) / 100;
}

function pkgOpenAddModal() {
  pkgEditingId = null;
  const title = document.getElementById('pkg-modal-title');
  if (title) title.textContent = 'SUBMIT PACKAGED FOOD';
  ['name','brand','barcode','serving','kcal','kj','pro','cho','fat','sugar','fiber','sodium']
    .forEach(f => { const el = document.getElementById('pkg-f-' + f); if (el) el.value = ''; });
  const nameEl = document.getElementById('pkg-f-name');
  if (nameEl) nameEl.style.borderColor = '';
  const errEl = document.getElementById('pkg-modal-error');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  pkgResetStagedScanPhotos();
  pkgSetNutritionBasis('100');
  const overlay = document.getElementById('pkg-modal-overlay');
  if (overlay) overlay.style.display = 'flex';
}

/**
 * Open the SUBMIT PACKAGED FOOD modal pre-filled with any known fields
 * (e.g. a barcode captured by the scanner). Any key matching
 * name/brand/barcode/servingSize/kcal/pro/cho/fat/sugar/fiber/sodium
 * in `data` is applied after the modal resets to a blank add form.
 * @param {object} [data]
 */
function pkgOpenAddModalWithData(data = {}) {
  pkgOpenAddModal();
  const map = {
    name: 'pkg-f-name', brand: 'pkg-f-brand', barcode: 'pkg-f-barcode',
    servingSize: 'pkg-f-serving', kcal: 'pkg-f-kcal', kj: 'pkg-f-kj', pro: 'pkg-f-pro',
    cho: 'pkg-f-cho', fat: 'pkg-f-fat', sugar: 'pkg-f-sugar',
    fiber: 'pkg-f-fiber', sodium: 'pkg-f-sodium',
  };
  Object.keys(map).forEach(k => {
    if (data[k] == null || data[k] === '') return;
    const el = document.getElementById(map[k]);
    if (el) el.value = data[k];
  });
  // Focus the first empty required field so the user can start typing.
  const nameEl = document.getElementById('pkg-f-name');
  if (nameEl && !nameEl.value) nameEl.focus();
}

function pkgOpenEditModal(id) {
  if (typeof PackagedFoodsDB === 'undefined') return;
  const doc = PackagedFoodsDB._docMap?.get(id);
  if (!doc) { console.warn('[pkgOpenEditModal] doc not found:', id); return; }

  pkgEditingId = id;
  const title = document.getElementById('pkg-modal-title');
  if (title) title.textContent = 'EDIT PACKAGED FOOD';

  const set = (fid, val) => {
    const el = document.getElementById(fid);
    if (el) el.value = (val != null) ? val : '';
  };
  const n = doc.per100g || doc.nutrition || {};
  set('pkg-f-name',    doc.name    || doc.productName);
  set('pkg-f-brand',   doc.brand);
  set('pkg-f-barcode', doc.barcode);
  set('pkg-f-serving', doc.servingSize);
  set('pkg-f-kcal',   n.kcal   ?? n.energy_kcal);
  set('pkg-f-kj',     n.kj     ?? n.energy_kj);
  set('pkg-f-pro',    n.pro    ?? n.protein_g);
  set('pkg-f-cho',    n.cho    ?? n.carbs_g);
  set('pkg-f-fat',    n.fat    ?? n.fat_g);
  set('pkg-f-sugar',  n.sugar  ?? n.sugar_g);
  set('pkg-f-fiber',  n.fiber  ?? n.fiber_g);
  set('pkg-f-sodium', n.sodium ?? n.sodium_mg);

  pkgResetStagedScanPhotos();
  pkgSetNutritionBasis('100'); // stored values are always per-100g/ml already — no reconversion on edit
  const overlay = document.getElementById('pkg-modal-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function pkgCloseModal() {
  const overlay = document.getElementById('pkg-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  pkgEditingId = null;
  pkgResetStagedScanPhotos();
}

async function pkgSaveModal() {
  if (typeof PackagedFoodsDB === 'undefined') return;

  const errEl = document.getElementById('pkg-modal-error');
  const showError = msg => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  // ── Auth guard: only signed-in users may submit ──────────────────
  try {
    const auth = typeof _getAuth === 'function' ? _getAuth() : null;
    if (!auth?.currentUser) {
      showError('Please sign in to submit a food item.');
      showToast('Please sign in to submit a food item.', 'warning');
      return;
    }
  } catch(e) {
    showError('Please sign in to submit a food item.');
    showToast('Please sign in to submit a food item.', 'warning');
    return;
  }
  // ────────────────────────────────────────────────────────────────

  const g   = id => { const v = document.getElementById(id)?.value; return (v !== '' && v != null) ? parseFloat(v) : null; };
  const s   = id => (document.getElementById(id)?.value || '').trim();
  const name = s('pkg-f-name');

  if (!name) {
    const el = document.getElementById('pkg-f-name');
    if (el) { el.style.borderColor = '#f87171'; el.focus(); }
    showError('Product name is required.');
    return;
  }
  const nameEl = document.getElementById('pkg-f-name');
  if (nameEl) nameEl.style.borderColor = '';

  const servingSize = g('pkg-f-serving') ?? 100;

  // ── Per-serving → per-100g/ml normalization ──────────────────────
  // Same math the OCR/scan endpoint already applies server-side, mirrored
  // here so manually-typed values (which people often copy straight off a
  // "per serving" label) land in the DB normalized the same way.
  if (pkgNutritionBasis === 'serving') {
    if (!servingSize || servingSize <= 0) {
      const el = document.getElementById('pkg-f-serving');
      if (el) { el.style.borderColor = '#f87171'; el.focus(); }
      showError('Enter a serving size to convert per-serving values to per-100g/ml.');
      return;
    }
  }
  const scaleIfNeeded = (val) => pkgNutritionBasis === 'serving' ? _pkgScaleToPer100(val, servingSize) : val;

  // Get current user identity for attribution
  let submittedBy = '';
  try {
    const profile = typeof getUserProfile === 'function' ? getUserProfile() : null;
    const auth    = typeof _getAuth === 'function' ? _getAuth() : null;
    submittedBy   = profile?.name || profile?.email || auth?.currentUser?.email || '';
  } catch(e) {}

  const scaledKcal = scaleIfNeeded(g('pkg-f-kcal'));
  const scaledKj    = scaleIfNeeded(g('pkg-f-kj'));
  const scaledPro  = scaleIfNeeded(g('pkg-f-pro'));
  const scaledCho  = scaleIfNeeded(g('pkg-f-cho'));
  const scaledFat  = scaleIfNeeded(g('pkg-f-fat'));

  // Live sync (pkgSyncEnergyField) keeps the two energy fields in step while
  // typing, but this is a belt-and-braces fallback for values set some other
  // way (pre-fill from a scan, programmatic edit-modal population, etc.) —
  // fixed factor: kJ → kcal is kcal = kJ ÷ 4.184.
  const kcalFromKj = scaledKj != null ? Math.round(scaledKj / 4.184) : null;

  // ── Energy/macro consistency check ────────────────────────────────
  // Standard Atwater factors: 4 kcal/g protein, 4 kcal/g carbohydrate,
  // 9 kcal/g fat. Catches typos and OCR-style misreads (decimal points,
  // g↔mg, per-serving vs per-100g mixups) before they reach the DB.
  // - kcal blank but protein/carbs/fat present → calculate it.
  // - kcal present but doesn't add up → ask whether to use the calculated
  //   value; if the person keeps what they entered it's still submitted,
  //   just flagged locally (PackagedFoodsDB.getLastNutritionFlag()) for
  //   admin review rather than silently overwritten.
  let finalKcal = scaledKcal ?? kcalFromKj;
  if (typeof PackagedFoodsDB !== 'undefined' && PackagedFoodsDB.checkKcalConsistency) {
    if (finalKcal == null) {
      const expected = PackagedFoodsDB.calcExpectedKcal(scaledPro, scaledCho, scaledFat);
      if (expected != null) {
        finalKcal = Math.round(expected);
        showToast(`Calories calculated from protein/carbs/fat: ${finalKcal} kcal`, 'info');
      }
    } else {
      const check = PackagedFoodsDB.checkKcalConsistency(finalKcal, scaledPro, scaledCho, scaledFat);
      if (check.checked && !check.consistent) {
        const useCalculated = confirm(
          `Entered ${check.providedKcal} kcal doesn't match protein + carbs + fat ` +
          `(≈${check.expectedKcal} kcal, ${check.diffPct}% off).\n\n` +
          `Use the calculated ${check.expectedKcal} kcal instead?\n` +
          `(Cancel submits ${check.providedKcal} kcal as entered, flagged for review.)`
        );
        if (useCalculated) finalKcal = check.expectedKcal;
      }
    }
  }

  const data = {
    name:        name,
    brand:       s('pkg-f-brand')  || '',
    barcode:     s('pkg-f-barcode').replace(/\D/g, '') || '',
    servingSize: servingSize,
    per100g: {
      kcal:   finalKcal,
      kj:     scaledKj ?? (finalKcal != null ? +(finalKcal * 4.184).toFixed(0) : null),
      pro:    scaledPro,
      cho:    scaledCho,
      fat:    scaledFat,
      sugar:  scaleIfNeeded(g('pkg-f-sugar')),
      fiber:  scaleIfNeeded(g('pkg-f-fiber')),
      sodium: scaleIfNeeded(g('pkg-f-sodium')),
    },
    // Attribution — who submitted this entry
    submittedBy: submittedBy || '',
    verified:    false,   // companion app verifies; only verified items are publicly visible
  };

  const saveBtn = document.querySelector('#pkg-modal-overlay button[onclick="pkgSaveModal()"]');
  if (saveBtn) { saveBtn.textContent = 'SUBMITTING…'; saveBtn.disabled = true; }

  try {
    const docId = pkgEditingId || (data.barcode || undefined);
    await PackagedFoodsDB.add(data, docId);
    pkgCloseModal();
    pkgRender();
    pkgUpdateStats();
    const isEdit = !!pkgEditingId;
    const flag = typeof PackagedFoodsDB !== 'undefined' && PackagedFoodsDB.getLastNutritionFlag
      ? PackagedFoodsDB.getLastNutritionFlag() : null;
    if (flag?.type === 'kcal_mismatch') {
      showToast(`⚠ Submitted, but flagged for review — kcal doesn't match protein/carbs/fat (≈${flag.expectedKcal} kcal expected)`, 'warning');
    } else {
      showToast(isEdit ? '✓ Packaged food updated' : '✓ Submitted — will appear once verified in the companion app', 'success');
    }
  } catch (err) {
    console.error('[pkgSaveModal]', err);
    showError('Save failed: ' + (err.message || String(err)));
  } finally {
    if (saveBtn) { saveBtn.textContent = 'SUBMIT FOR REVIEW'; saveBtn.disabled = false; }
  }
}

// ── Scan-a-label (photo(s) → OCR/AI → submit via /packaged/scan) ────
// Secondary path alongside the manual form above. Photos are staged locally
// (thumbnail strip) so the user can add a nutrition-panel photo AND a
// barcode photo — which are often on different faces of the package —
// before submitting them together in one Groq vision call. Resizes each
// photo client-side (phone camera photos are typically 8-15MB; the API caps
// each decoded image at ~6MB and doesn't need full resolution to read text),
// then hands the batch to PackagedFoodsDB.scanLabel(), which submits it for
// review server-side in one call (same as the manual SUBMIT FOR REVIEW
// button — there's no separate edit-before-commit step for scans).
function _pkgResizeAndEncodeImage(file, maxDim = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round(height * (maxDim / width));
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round(width * (maxDim / height));
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Could not read that image file.'));
    img.src = URL.createObjectURL(file);
  });
}

const PKG_SCAN_MAX_PHOTOS = 5;
let _pkgScanStagedPhotos = []; // array of "data:image/jpeg;base64,...." strings

function _pkgScanSetStatus(msg, tone) {
  const statusEl = document.getElementById('pkg-scan-status');
  if (!statusEl) return;
  if (!msg) { statusEl.style.display = 'none'; statusEl.textContent = ''; return; }
  statusEl.style.display = 'block';
  statusEl.textContent = msg;
  const styles = {
    info:    { color: '#60a5fa', background: 'rgba(96,165,250,.08)',  border: '1px solid rgba(96,165,250,.25)' },
    success: { color: 'var(--green,#00e676)', background: 'rgba(0,230,118,.08)', border: '1px solid rgba(0,230,118,.25)' },
    warn:    { color: '#fbbf24', background: 'rgba(251,191,36,.08)',  border: '1px solid rgba(251,191,36,.25)' },
    error:   { color: '#f87171', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)' },
  }[tone || 'info'];
  Object.assign(statusEl.style, styles);
}

function pkgResetStagedScanPhotos() {
  _pkgScanStagedPhotos = [];
  _pkgRenderScanThumbs();
  _pkgScanSetStatus(null);
}

function _pkgRenderScanThumbs() {
  const wrap = document.getElementById('pkg-scan-thumbs');
  const submitBtn = document.getElementById('pkg-scan-submit-btn');
  if (!wrap || !submitBtn) return;

  if (!_pkgScanStagedPhotos.length) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    submitBtn.style.display = 'none';
    submitBtn.disabled = true;
    return;
  }

  wrap.style.display = 'flex';
  wrap.innerHTML = _pkgScanStagedPhotos.map((dataUrl, i) => `
    <div style="position:relative;width:56px;height:56px">
      <img src="${dataUrl}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid rgba(96,165,250,.3)">
      <button type="button" onclick="pkgRemoveStagedScanPhoto(${i})" aria-label="Remove photo"
        style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#f87171;color:#0a1420;border:none;font-size:11px;line-height:1;cursor:pointer;font-weight:700">&#x2715;</button>
    </div>
  `).join('');

  submitBtn.style.display = 'block';
  submitBtn.disabled = false;
  submitBtn.textContent = `SCAN ${_pkgScanStagedPhotos.length} PHOTO${_pkgScanStagedPhotos.length > 1 ? 'S' : ''}`;
}

function pkgRemoveStagedScanPhoto(index) {
  _pkgScanStagedPhotos.splice(index, 1);
  _pkgRenderScanThumbs();
}

async function pkgAddScanPhotos(inputEl) {
  const files = Array.from(inputEl?.files || []);
  if (!files.length) return;

  const room = PKG_SCAN_MAX_PHOTOS - _pkgScanStagedPhotos.length;
  if (room <= 0) {
    _pkgScanSetStatus(`You can add up to ${PKG_SCAN_MAX_PHOTOS} photos.`, 'warn');
    inputEl.value = '';
    return;
  }
  const toAdd = files.slice(0, room);
  if (files.length > toAdd.length) {
    _pkgScanSetStatus(`Only added ${toAdd.length} — max ${PKG_SCAN_MAX_PHOTOS} photos per submission.`, 'warn');
  }

  try {
    const encoded = await Promise.all(toAdd.map(f => _pkgResizeAndEncodeImage(f)));
    _pkgScanStagedPhotos.push(...encoded);
    _pkgRenderScanThumbs();
  } catch (err) {
    console.error('[pkgAddScanPhotos]', err);
    _pkgScanSetStatus('Could not read one of those photos. Try again.', 'error');
  } finally {
    inputEl.value = ''; // allow re-selecting the same file(s)
  }
}

async function pkgSubmitScanPhotos() {
  if (!_pkgScanStagedPhotos.length) return;

  // Reuse the same sign-in gate as the manual submit path.
  try {
    const auth = typeof _getAuth === 'function' ? _getAuth() : null;
    if (!auth?.currentUser) {
      _pkgScanSetStatus('Please sign in to submit a food item.', 'warn');
      return;
    }
  } catch (e) {
    _pkgScanSetStatus('Please sign in to submit a food item.', 'warn');
    return;
  }

  if (typeof PackagedFoodsDB === 'undefined') {
    _pkgScanSetStatus('Packaged foods service is unavailable right now.', 'error');
    return;
  }

  const submitBtn = document.getElementById('pkg-scan-submit-btn');
  const toggleInputs = (disabled) => {
    document.querySelectorAll('[onclick*="pkg-scan-camera-input"], [onclick*="pkg-scan-gallery-input"]')
      .forEach(btn => { btn.disabled = disabled; btn.style.opacity = disabled ? '0.5' : ''; btn.style.pointerEvents = disabled ? 'none' : ''; });
    if (submitBtn) submitBtn.disabled = disabled;
  };

  try {
    toggleInputs(true);
    const n = _pkgScanStagedPhotos.length;
    _pkgScanSetStatus(`Reading ${n} photo${n > 1 ? 's' : ''} — this can take up to 15-20 seconds…`, 'info');
    const existingBarcode = (document.getElementById('pkg-f-barcode')?.value || '').trim();
    const result = await PackagedFoodsDB.scanLabel(_pkgScanStagedPhotos, existingBarcode);

    if (result?.status === 'success') {
      const lowConf = !!result.needs_review;
      _pkgScanSetStatus(lowConf
        ? '✓ Submitted for review — scan confidence was low, an admin will double-check.'
        : '✓ Submitted for review. Thanks for contributing to Chakudya!', 'success');
      pkgRender();
      pkgUpdateStats();
      showToast(lowConf ? '✓ Submitted — low-confidence scan, will be double-checked' : '✓ Submitted from photo — will appear once verified', 'success');
      setTimeout(() => { pkgCloseModal(); }, 1400);
    } else if (result?.status === 'needs_retry') {
      _pkgScanSetStatus(result.message || 'Couldn\'t read a label clearly. Try clearer photos or fill in the fields manually.', 'warn');
    } else {
      _pkgScanSetStatus((result && result.message) || 'Scan failed. Try again or fill in the fields manually.', 'error');
    }
  } catch (err) {
    console.error('[pkgSubmitScanPhotos]', err);
    _pkgScanSetStatus('Scan failed: ' + (err.message || String(err)) + ' — try again or fill in manually.', 'error');
  } finally {
    toggleInputs(false);
  }
}

async function pkgDelete(id) {
  if (typeof PackagedFoodsDB === 'undefined') return;
  if (!confirm('Delete this product? This cannot be undone.')) return;
  try {
    await PackagedFoodsDB.delete(id);
    pkgRender();
    pkgUpdateStats();
    showToast('✓ Product deleted', 'info');
  } catch (err) {
    alert('Delete failed: ' + (err.message || String(err)));
  }
}

// ── CSV Export ────────────────────────────────────────────────────
function pkgExportCSV() {
  // Database export disabled — packaged foods tables are not downloadable.
  showToast('Database export is disabled');
}

// ── END PKG MODULE ────────────────────────────────────────────────


// ── OFFLINE DETECTION ──────────────────────────────────────────────
(function initOfflineDetection() {
  const banner = document.getElementById('offline-banner');
  function update() { if (banner) banner.classList.toggle('visible', !navigator.onLine); }
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
})();

// ── RESTORE PERSISTED STATE ─────────────────────────────────────────
(function restorePersistedState() {
  restoreRecallState();
  restoreMpState();
})();

// ── WIRE EVENT LISTENERS ────────────────────────────────────────────
(function wireEventListeners() {
  // Burn equation radio buttons → burnEquationPreview
  document.querySelectorAll('.burn-eq-radio').forEach(el => {
    el.addEventListener('change', burnEquationPreview);
  });
  // Burns formula-specific inputs
  ['burn_days','core_temp','burn_bsa','burn_bsa_burned','ventilation','tbsa'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', debounce(burnEquationPreview, 200));
  });
  // Enteral RF radio buttons
  document.querySelectorAll('.en-rf-radio').forEach(el => {
    el.addEventListener('change', toggleEnRfNote);
  });
  // DB search/filter inputs (already have oninput but add ARIA live)
  const dbSearch = document.getElementById('db-search');
  if (dbSearch) {
    dbSearch.setAttribute('aria-label', 'Search food database');
    dbSearch.setAttribute('role', 'searchbox');
  }
})();


// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// USER IDENTITY SYSTEM — Firebase Auth (email + password)
// ══════════════════════════════════════════════════════════════════
// Users authenticate directly with their email address and password.
// Email is sourced from Firebase Auth and automatically stored in
// the user profile/database — no synthesis or mapping required.

const USER_KEY = 'nt_user_profile';

// ── Helpers ───────────────────────────────────────────────────────
function _getAuth() {
  if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
    return firebase.auth();
  }
  return null;
}

function getUserProfile() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
  catch(e) { return null; }
}

function saveUserProfile(p) {
  localStorage.setItem(USER_KEY, JSON.stringify(p));
  // Refresh profile drawer completion UI if open
  try {
    if (typeof _populateProfileDrawer === 'function') {
      var pdrOpen = document.getElementById('profile-drawer');
      if (pdrOpen && pdrOpen.classList.contains('open')) _populateProfileDrawer();
    }
  } catch(e) {}
  // Mirror to Firestore users collection (keyed by Firebase Auth UID when available)
  if (typeof db !== 'undefined' && db) {
    const auth = _getAuth();
    const fbUid = auth?.currentUser?.uid || SESSION_ID;
    try {
      db.collection('users').doc(fbUid).set({
        sessionId:   SESSION_ID,
        firebaseUid: fbUid,
        userName:    p.name         || '',
        userId:      p.uid          || '',
        userRole:    p.role         || '',
        institution: p.institution  || '',
        email:       p.email        || '',
        photoURL:    p.photoURL     || '',
        createdAt:   p.createdAt    || new Date().toISOString(),
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
        deviceInfo:  navigator.userAgent.slice(0, 120),
      }, { merge: true }).catch(e => console.warn('[UserProfile] Firestore sync failed:', e));
    } catch(e) {}
  }
}

// Role display metadata
// Role SVGs are 22×22 Lucide icons — used in both the home profile
// avatar and the settings drawer chip grid. Keep in sync with chips.
const _ROLE_SVG = {
  student:    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  dietitian:  `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-3.19 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.4 2.4 0 0 1 .44 1.06"/></svg>`,
  clinician:  `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`,
  researcher: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>`,
  nurse:      `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>`,
  other:      `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
};
const ROLE_META = {
  student:    { label:'Student',    icon:_ROLE_SVG.student,    color:'var(--blue)'   },
  dietitian:  { label:'Dietitian',  icon:_ROLE_SVG.dietitian,  color:'var(--green)'  },
  clinician:  { label:'Clinician',  icon:_ROLE_SVG.clinician,  color:'var(--teal)'   },
  researcher: { label:'Researcher', icon:_ROLE_SVG.researcher, color:'var(--purple)' },
  nurse:      { label:'Nurse',      icon:_ROLE_SVG.nurse,      color:'var(--amber)'  },
  other:      { label:'Other',      icon:_ROLE_SVG.other,      color:'var(--teal)'   },
};

// ── Auth step state ───────────────────────────────────────────────
let _obSelectedRole   = '';
let _obIsRegisterMode = false;

// Deferred registration: credentials held here after step-1 validation.
// Firebase account is NOT created until profile setup (step 2) is submitted.
// Cleared immediately after successful account creation in obSubmit().
let _obPendingReg = null;  // { email: string, pw: string } | null

// True while getRedirectResult() (mobile Google sign-in) is being resolved.
// checkOnboarding()'s onAuthStateChanged listener fires with user=null as
// an interim state on the page load that follows a redirect — BEFORE
// Firebase finishes restoring the real signed-in session — and without
// this guard, that interim null was forcing the sign-in overlay back open,
// stomping on whatever screen the redirect handler had already moved to.
let _obRedirectPending = false;

// Set heading on load: "Welcome back" for returning users, "Welcome" for new
(function() {
  const el = document.getElementById('ob-auth-heading');
  if (el && localStorage.getItem('ob_has_signed_out')) el.textContent = 'Welcome back';
})();

function obTogglePw(inputId, btn) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
  btn.textContent = el.type === 'password' ? '' : '';
}

function obToggleAuthMode() {
  _obIsRegisterMode = !_obIsRegisterMode;

  // ── Data isolation: wipe all previous-user data when entering register mode ──
  // This ensures a new account starts with a completely clean slate,
  // even if someone navigated to the auth screen without formally signing out.
  if (_obIsRegisterMode) {
    _wipeAllUserData();
    // Re-set the sign-out flag so it's available for heading logic below
    try { localStorage.setItem('ob_has_signed_out', '1'); } catch(e) {}
  }

  document.getElementById('ob-auth-heading').textContent  = _obIsRegisterMode ? 'Create account' : (localStorage.getItem('ob_has_signed_out') ? 'Welcome back' : 'Welcome');
  document.getElementById('ob-auth-sub').textContent      = _obIsRegisterMode
    ? 'Register with your email and a password.'
    : 'Sign in with your email and password.';
  document.getElementById('ob-auth-btn').innerHTML      = _obIsRegisterMode ? 'Register →' : 'Sign In →';
  document.getElementById('ob-auth-toggle-text').textContent = _obIsRegisterMode ? 'Already have an account?' : 'Don\'t have an account?';
  document.getElementById('ob-auth-toggle-btn').textContent  = _obIsRegisterMode ? 'Sign In' : 'Register';
  document.getElementById('ob-auth-error').style.display  = 'none';
  document.getElementById('ob-auth-pw').autocomplete      = _obIsRegisterMode ? 'new-password' : 'current-password';

  // Show confirm-password field only in register mode
  const confirmField = document.getElementById('ob-confirm-pw-field');
  if (confirmField) {
    confirmField.style.display = _obIsRegisterMode ? 'block' : 'none';
    // Clear confirm field when toggling
    const confirmInput = document.getElementById('ob-auth-confirm-pw');
    if (confirmInput) confirmInput.value = '';
  }

  const forgotRow = document.getElementById('ob-forgot-row');
  if (forgotRow) forgotRow.style.display = _obIsRegisterMode ? 'none' : 'block';
}

function _obSetAuthError(msg) {
  const el = document.getElementById('ob-auth-error');
  el.textContent = msg;
  el.style.color = 'var(--red)';
  el.style.display = 'block';
}

function _obAuthBusy(busy) {
  const btn = document.getElementById('ob-auth-btn');
  if (!btn) return;
  btn.disabled = busy;
  const label = _obIsRegisterMode ? 'Register →' : 'Sign In →';
  btn.innerHTML = busy
    ? `<span class="ob-spinner"></span><span>Please wait…</span>`
    : label;
}

// ── Google Sign-In ───────────────────────────────────────────────
// signInWithPopup() is unreliable on mobile Chrome: the popup doesn't
// behave like a true popup there, and Firebase relays the auth result
// back via cross-window messaging that depends on third-party cookies/
// storage — which mobile Chrome increasingly blocks by default. When
// that relay silently fails, Firebase surfaces it as a generic
// auth/internal-error (exactly what was reported).
//
// Fix: mobile devices use signInWithRedirect() instead — a full page
// navigation to Google and back, with no cross-window messaging
// involved. The result is picked up via getRedirectResult() in
// initFirebase() on the page load that follows the redirect. Desktop
// keeps the popup flow (nicer UX there, and not subject to this bug).
function _isMobileBrowser() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Shared logic for both the popup (desktop) and redirect (mobile) flows:
// look up whether this Google account already has a saved profile, and
// either finish sign-in or drop into profile setup for a first-time user.
async function _obHandleGoogleUser(gUser) {
  const fbUid   = gUser?.uid;
  const fbEmail = gUser?.email || '';

  let existingProfile = null;
  if (db && fbUid) {
    const snap = await db.collection('users').doc(fbUid).get().catch(() => null);
    if (snap && snap.exists && snap.data().userName) {
      existingProfile = snap.data();
    }
  }

  if (existingProfile) {
    // Returning user — same finish path as email sign-in.
    const p = {
      name:        existingProfile.userName    || '',
      uid:         existingProfile.userId      || '',
      institution: existingProfile.institution || '',
      role:        existingProfile.userRole    || 'student',
      email:       fbEmail,
      photoURL:    existingProfile.photoURL    || '',
      createdAt:   existingProfile.createdAt   || new Date().toISOString(),
      firebaseUid: fbUid,
    };
    saveUserProfile(p);
    _obFinish(p.name, true);
  } else {
    // First-time Google user — account already exists (created by
    // Firebase on sign-in success), so just collect the rest of the
    // profile. _obPendingReg stays null, which routes obSubmit() to
    // its "EXISTING USER" (no account creation) branch.
    _wipeAllUserData();
    _obSkipToProfile();

    const nameEl = document.getElementById('ob-name');
    if (nameEl && gUser?.displayName) nameEl.value = gUser.displayName;

    if (gUser?.photoURL) {
      const avatarImg   = document.getElementById('ob-avatar-img');
      const placeholder = document.getElementById('ob-avatar-placeholder');
      const photoData   = document.getElementById('ob-photo-data');
      if (avatarImg)   { avatarImg.src = gUser.photoURL; avatarImg.style.display = ''; }
      if (placeholder) placeholder.style.display = 'none';
      if (photoData)   photoData.value = gUser.photoURL;
    }
  }
}

async function obGoogleSignIn() {
  const auth = _getAuth();
  if (!auth) {
    _obSetAuthError('Unable to connect. Please check your internet and try again.');
    return;
  }

  const googleBtn = document.getElementById('ob-google-btn');
  if (googleBtn) { googleBtn.disabled = true; googleBtn.style.opacity = '0.6'; }
  document.getElementById('ob-auth-error').style.display = 'none';

  const provider = new firebase.auth.GoogleAuthProvider();

  // Mobile: redirect flow — the page navigates away entirely, so nothing
  // after this call runs on this page load. The result is handled by
  // getRedirectResult() in initFirebase() once the page comes back.
  if (_isMobileBrowser()) {
    try {
      await auth.signInWithRedirect(provider);
    } catch (err) {
      console.error('[Google Sign-In]', err && err.code, err && err.message);
      const codeStr = (err && err.code) ? ` (${err.code})` : '';
      _obSetAuthError('Google sign-in failed. Please try again.' + codeStr);
      if (googleBtn) { googleBtn.disabled = false; googleBtn.style.opacity = ''; }
    }
    return;
  }

  // Desktop: popup flow — resolves immediately, no page reload needed.
  try {
    const result = await auth.signInWithPopup(provider);
    await _obHandleGoogleUser(result.user);
  } catch (err) {
    console.error('[Google Sign-In]', err && err.code, err && err.message);
    if (err && err.code === 'auth/popup-closed-by-user') {
      // User dismissed the popup — no error message needed.
    } else if (err && err.code === 'auth/account-exists-with-different-credential') {
      _obSetAuthError('An account with this email already exists using a different sign-in method.');
    } else {
      // TEMP: showing the raw error code to make this diagnosable from a
      // phone without desktop remote debugging. Revert to the generic
      // message once the underlying cause is confirmed fixed.
      const codeStr = (err && err.code) ? ` (${err.code})` : '';
      _obSetAuthError('Google sign-in failed. Please try again.' + codeStr);
    }
  } finally {
    if (googleBtn) { googleBtn.disabled = false; googleBtn.style.opacity = ''; }
  }
}

async function obAuthSubmit() {
  const emailVal   = document.getElementById('ob-auth-email')?.value.trim();
  const pwVal      = document.getElementById('ob-auth-pw')?.value;
  const confirmVal = document.getElementById('ob-auth-confirm-pw')?.value;

  document.getElementById('ob-auth-error').style.display = 'none';

  // ── Input validation ─────────────────────────────────────────────
  if (!emailVal) { _obSetAuthError('Please enter your email address.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { _obSetAuthError('Please enter a valid email address.'); return; }
  if (!pwVal)  { _obSetAuthError('Please enter your password.'); return; }
  if (_obIsRegisterMode && pwVal.length < 6) { _obSetAuthError('Password must be at least 6 characters.'); return; }
  if (_obIsRegisterMode && pwVal !== confirmVal) { _obSetAuthError('Passwords do not match.'); return; }

  const auth = _getAuth();
  if (!auth) {
    _obSetAuthError('Unable to connect. Please check your internet and try again.');
    return;
  }

  const email = emailVal;

  // ── REGISTRATION path ────────────────────────────────────────────
  // Step 1 of 2: validate credentials, check email availability,
  // then advance to profile setup WITHOUT creating the Firebase account yet.
  // Account creation is deferred to obSubmit() so the user cannot be
  // authenticated until their profile is fully completed.
  if (_obIsRegisterMode) {
    _obAuthBusy(true);

    // Email availability check before advancing
    try {
      const methods = await auth.fetchSignInMethodsForEmail(email);
      if (methods && methods.length > 0) {
        _obAuthBusy(false);
        _obSetAuthError('An account with this email already exists. Try signing in.');
        return;
      }
    } catch(e) {
      // fetchSignInMethods unavailable (network/config) — proceed optimistically;
      // createUserWithEmailAndPassword in obSubmit() will catch the duplicate.
    }

    _obAuthBusy(false);

    // Wipe all previous-user data before advancing
    _wipeAllUserData();

    // Store credentials for deferred account creation in obSubmit()
    _obPendingReg = { email, pw: pwVal };

    // Advance to profile step with a guaranteed-blank form
    _obSkipToProfile();
    return;
  }

  // ── SIGN IN path ─────────────────────────────────────────────────
  _obAuthBusy(true);
  try {
    await auth.signInWithEmailAndPassword(email, pwVal);

    const auth2 = _getAuth();
    const fbUid = auth2?.currentUser?.uid;
    const fbEmail = auth2?.currentUser?.email || email;
    let existingProfile = null;
    if (db && fbUid) {
      const snap = await db.collection('users').doc(fbUid).get().catch(() => null);
      if (snap && snap.exists && snap.data().userName) {
        existingProfile = snap.data();
      }
    }
    if (existingProfile) {
      const p = {
        name:        existingProfile.userName    || '',
        uid:         existingProfile.userId      || '',
        institution: existingProfile.institution || '',
        role:        existingProfile.userRole    || 'student',
        email:       fbEmail,
        photoURL:    existingProfile.photoURL    || '',
        createdAt:   existingProfile.createdAt   || new Date().toISOString(),
        firebaseUid: fbUid,
      };
      saveUserProfile(p);
      _obFinish(p.name, true);
    } else {
      // Signed in but no profile (rare) — show setup
      _obSkipToProfile();
    }
  } catch (err) {
    _obAuthBusy(false);
    const codes = {
      'auth/user-not-found':         'Invalid email or password.',
      'auth/wrong-password':         'Invalid email or password.',
      'auth/invalid-credential':     'Invalid email or password.',
      'auth/invalid-email':          'Please enter a valid email address.',
      'auth/email-already-in-use':   'An account with this email already exists. Try signing in.',
      'auth/weak-password':          'Password must be at least 6 characters.',
      'auth/too-many-requests':      'Too many attempts. Please wait a moment.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    };
    _obSetAuthError(codes[err.code] || 'Invalid email or password.');
  }
}

// ── Forgot Password ───────────────────────────────────────────────
async function obForgotPassword() {
  const errorEl = document.getElementById('ob-auth-error');

  const auth = _getAuth();
  if (!auth) {
    _obSetAuthError('Password reset is unavailable in offline mode.');
    return;
  }

  // Use email from the sign-in input field
  const emailVal = document.getElementById('ob-auth-email')?.value.trim();

  if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    errorEl.textContent = 'Enter your email address above, then click Forgot Password.';
    errorEl.style.color = 'var(--amber, #f0b429)';
    errorEl.style.display = 'block';
    return;
  }

  try {
    await auth.sendPasswordResetEmail(emailVal);
    errorEl.textContent = '✓ Reset email sent to ' + emailVal.replace(/(.{2}).+(@.+)/, '$1…$2');
    errorEl.style.color = 'var(--teal, #00f5e4)';
    errorEl.style.display = 'block';
  } catch (err) {
    // Show a vague success — don't leak account existence
    errorEl.textContent = '✓ If a reset email can be sent, it\'s on its way.';
    errorEl.style.color = 'var(--teal, #00f5e4)';
    errorEl.style.display = 'block';
  }
}

// ═══════════════════════════════════════════════════════════════
// EMAIL VERIFICATION & IN-APP PASSWORD RESET
// ═══════════════════════════════════════════════════════════════

// ── Verification notice (profile drawer) ─────────────────────

/** No-op — banner removed; verification status shown inside profile drawer only. */
function _ntShowVerifyBanner() {}

/** No-op — banner removed; hides the in-profile notice instead. */
function ntDismissVerifyBanner() {
  const notice = document.getElementById('pdr-verify-notice');
  if (notice) notice.style.display = 'none';
}

/**
 * Check whether the currently signed-in user's email is verified.
 * Updates the in-profile notice card and the email badge — NOT a top banner.
 * Call this when the user opens the Profile or Settings panel.
 */
function checkEmailVerification() {
  try {
    const user = firebase.auth().currentUser;
    _ntUpdateVerifyStatusUI(user ? user.emailVerified : true);
  } catch (e) {
    // Firebase auth unavailable — hide notice
    _ntUpdateVerifyStatusUI(true);
  }
}

/**
 * Update the verified / unverified badge inside the profile drawer,
 * and show or hide the inline verification notice card.
 * @param {boolean} verified
 */
function _ntUpdateVerifyStatusUI(verified) {
  // Small inline badge next to the email address
  const badge = document.getElementById('pdr-email-verify-badge');
  if (badge) {
    badge.innerHTML = verified
      ? `<span style="color:var(--green,#34d399);font-family:var(--mono);font-size:9px;letter-spacing:0.5px">✓ Verified</span>`
      : `<span style="color:var(--amber,#f0b429);font-family:var(--mono);font-size:9px;letter-spacing:0.5px">⚠ Unverified</span>`;
  }
  // Inline notice card — visible only when unverified
  const notice = document.getElementById('pdr-verify-notice');
  if (notice) notice.style.display = verified ? 'none' : 'block';
}

// ── Resend verification email ─────────────────────────────────

/**
 * Resend a verification email to the currently signed-in user.
 * Called from the top banner resend button and the profile drawer badge.
 */
async function ntResendVerification() {
  const user = firebase.auth().currentUser;

  if (!user) {
    if (typeof showToast === 'function') showToast('Sign in first to resend a verification email.', 'info');
    return;
  }

  if (user.emailVerified) {
    if (typeof showToast === 'function') showToast('✓ Your email is already verified!', 'success');
    ntDismissVerifyBanner();
    _ntUpdateVerifyStatusUI(true);
    return;
  }

  try {
    await firebase.auth().currentUser.sendEmailVerification();
    if (typeof showToast === 'function') {
      showToast('✓ Verification email sent to ' + (user.email || 'your address'), 'success');
    }
  } catch (err) {
    const msg = err.code === 'auth/too-many-requests'
      ? 'Too many requests — please wait a moment before trying again.'
      : 'Could not send verification email. Please try again.';
    if (typeof showToast === 'function') showToast(msg, 'error');
  }
}

// ── Password reset from profile drawer ───────────────────────

/**
 * Send a password reset email to the currently signed-in user's address.
 * Accessible from the Profile drawer so the user never has to sign out first.
 */
async function ntSendPasswordResetFromProfile() {
  const auth = _getAuth();
  if (!auth) {
    if (typeof showToast === 'function') showToast('Password reset unavailable in offline mode.', 'info');
    return;
  }

  const email = auth.currentUser?.email || getUserProfile()?.email || '';
  if (!email) {
    if (typeof showToast === 'function') showToast('No email address on file.', 'info');
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    if (typeof showToast === 'function') {
      showToast('✓ Password reset email sent to ' + email.replace(/(.{2}).+(@.+)/, '$1…$2'), 'success');
    }
  } catch(err) {
    // Intentionally vague — don't leak account existence
    if (typeof showToast === 'function') showToast('✓ If a reset email can be sent, it\'s on its way.', 'success');
  }
}

function _obSkipToProfile(uidVal) {
  // ── Reset all profile form fields to blank ───────────────────
  // Prevents previous user's data bleeding into a new registration.

  // In-memory role state
  _obSelectedRole = '';

  // Text inputs
  ['ob-name', 'ob-uid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Also clear the confirm-password field (auth step) in case user goes back
  const confirmPw = document.getElementById('ob-auth-confirm-pw');
  if (confirmPw) confirmPw.value = '';

  // Institution select + free-text
  const instSel = document.getElementById('ob-inst');
  if (instSel) instSel.selectedIndex = 0;
  const instOther = document.getElementById('ob-inst-other');
  if (instOther) { instOther.value = ''; instOther.style.display = 'none'; }

  // Role chip buttons — deselect all, hide "other" row
  document.querySelectorAll('.ob-role-btn').forEach(b => {
    b.classList.remove('active', 'selected');
  });
  const roleOtherRow = document.getElementById('ob-role-other-row');
  if (roleOtherRow) roleOtherRow.style.display = 'none';
  const roleOtherVal = document.getElementById('ob-role-other-val');
  if (roleOtherVal) roleOtherVal.value = '';

  // Avatar / photo — restore to blank state
  const avatarImg     = document.getElementById('ob-avatar-img');
  const placeholder   = document.getElementById('ob-avatar-placeholder');
  const removeBtn     = document.getElementById('ob-avatar-remove');
  const photoData     = document.getElementById('ob-photo-data');
  const avatarColor   = document.getElementById('ob-avatar-color');
  const photoInput    = document.getElementById('ob-photo-input');
  const avatarPreview = document.getElementById('ob-avatar-preview');

  if (avatarImg)   { avatarImg.src = ''; avatarImg.style.display = 'none'; }
  if (placeholder) placeholder.style.display = '';
  if (removeBtn)   removeBtn.style.display = 'none';
  if (photoData)   photoData.value = '';
  if (avatarColor) avatarColor.value = '';
  if (photoInput)  photoInput.value = '';
  if (avatarPreview) avatarPreview.style.background = 'var(--surface2)';

  // Deselect any active colour chip
  document.querySelectorAll('.ob-av-color').forEach(b => {
    b.style.border = '2px solid transparent';
  });

  // Error message
  const errEl = document.getElementById('ob-error');
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

  // Submit button label: "Complete Registration →" for new users, "Save Profile →" otherwise
  const submitBtn = document.querySelector('#ob-step-profile .ob-submit');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = _obPendingReg ? 'Complete Registration →' : 'Save Profile →';
  }

  // Show profile step
  document.getElementById('ob-step-auth').style.display    = 'none';
  document.getElementById('ob-step-profile').style.display = 'block';

  // Wire institution "other" toggle
  const sel = document.getElementById('ob-inst');
  const other = document.getElementById('ob-inst-other');
  if (sel && other) {
    sel.onchange = () => { other.style.display = sel.value === '__other' ? 'block' : 'none'; };
  }
  _obAuthBusy(false);
}

// ── Onboarding photo / avatar helpers ────────────────────────────

/** Called when user picks a file from the file input */
function obHandlePhotoUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    if (typeof showToast === 'function') showToast('Please choose an image file.', 'error', 3000);
    return;
  }
  // Limit to 3 MB
  if (file.size > 3 * 1024 * 1024) {
    if (typeof showToast === 'function') showToast('Image must be under 3 MB.', 'error', 3000);
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataURL = e.target.result;
    // Resize to max 200×200 for storage
    const img = new Image();
    img.onload = function() {
      const MAX = 200;
      const canvas = document.createElement('canvas');
      const ratio  = Math.min(MAX / img.width, MAX / img.height, 1);
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.82);
      _obSetAvatarPhoto(compressed);
    };
    img.src = dataURL;
  };
  reader.readAsDataURL(file);
}

/** Render a photo into the preview circle and store in hidden input */
function _obSetAvatarPhoto(dataURL) {
  const preview   = document.getElementById('ob-avatar-preview');
  const imgEl     = document.getElementById('ob-avatar-img');
  const placeholder = document.getElementById('ob-avatar-placeholder');
  const removeBtn = document.getElementById('ob-avatar-remove');
  const dataEl    = document.getElementById('ob-photo-data');
  const colorEl   = document.getElementById('ob-avatar-color');
  const colorRow  = document.getElementById('ob-avatar-color-row');

  if (imgEl)      { imgEl.src = dataURL; imgEl.style.display = 'block'; }
  if (placeholder) placeholder.style.display = 'none';
  if (preview)    preview.style.borderStyle = 'solid';
  if (removeBtn)  removeBtn.style.display = 'block';
  if (dataEl)     dataEl.value = dataURL;
  if (colorEl)    colorEl.value = '';
  if (colorRow)   colorRow.style.opacity = '0.4';
  // Show camera overlay on hover after photo set
  if (preview) {
    preview.onmouseover = function() {
      const cam = document.getElementById('ob-avatar-cam');
      if (cam) cam.style.display = 'flex';
    };
    preview.onmouseout = function() {
      const cam = document.getElementById('ob-avatar-cam');
      if (cam) cam.style.display = 'none';
    };
  }
}

/** Clear the selected photo, restore placeholder */
function obClearPhoto() {
  const preview    = document.getElementById('ob-avatar-preview');
  const imgEl      = document.getElementById('ob-avatar-img');
  const placeholder= document.getElementById('ob-avatar-placeholder');
  const removeBtn  = document.getElementById('ob-avatar-remove');
  const dataEl     = document.getElementById('ob-photo-data');
  const colorEl    = document.getElementById('ob-avatar-color');
  const colorRow   = document.getElementById('ob-avatar-color-row');
  const fileInput  = document.getElementById('ob-photo-input');

  if (imgEl)      { imgEl.src = ''; imgEl.style.display = 'none'; }
  if (placeholder) placeholder.style.display = '';
  if (preview)    {
    preview.style.borderStyle = 'dashed';
    preview.style.background  = 'var(--surface2)';
    preview.onmouseover = null;
    preview.onmouseout  = null;
  }
  if (removeBtn)  removeBtn.style.display = 'none';
  if (dataEl)     dataEl.value = '';
  if (colorEl)    colorEl.value = '';
  if (colorRow)   colorRow.style.opacity = '1';
  if (fileInput)  fileInput.value = '';
  document.querySelectorAll('.ob-av-color').forEach(b => b.style.borderColor = 'transparent');
}

/** Pick an avatar colour — renders initials on coloured circle */
function obPickAvatarColor(btn) {
  const color    = btn.dataset.color;
  const preview  = document.getElementById('ob-avatar-preview');
  const imgEl    = document.getElementById('ob-avatar-img');
  const placeholder = document.getElementById('ob-avatar-placeholder');
  const removeBtn = document.getElementById('ob-avatar-remove');
  const dataEl   = document.getElementById('ob-photo-data');
  const colorEl  = document.getElementById('ob-avatar-color');
  const fileInput= document.getElementById('ob-photo-input');

  // Highlight selected swatch
  document.querySelectorAll('.ob-av-color').forEach(b => b.style.borderColor = 'transparent');
  btn.style.borderColor = '#fff';

  // Clear any uploaded photo
  if (imgEl)  { imgEl.src = ''; imgEl.style.display = 'none'; }
  if (dataEl) dataEl.value = '';
  if (fileInput) fileInput.value = '';
  if (colorEl) colorEl.value = color;

  // Show initials on coloured background
  if (placeholder) placeholder.style.display = 'none';
  if (preview) {
    preview.style.background   = color;
    preview.style.borderStyle  = 'solid';
    preview.style.borderColor  = color;
    // Render initials
    const name     = (document.getElementById('ob-name')?.value || '').trim();
    const initials = name
      ? name.split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase()
      : '?';
    // Remove any existing initials span
    const existing = preview.querySelector('.ob-av-initials');
    if (existing) existing.remove();
    const span = document.createElement('span');
    span.className = 'ob-av-initials';
    span.style.cssText = 'font-family:var(--cond,var(--sans));font-size:22px;font-weight:800;color:#020617;user-select:none;position:relative;z-index:1';
    span.textContent = initials;
    preview.appendChild(span);
    if (removeBtn) removeBtn.style.display = 'block';
  }
}

/** Update initials in the avatar preview when user types their name */
function obUpdateAvatarInitials() {
  const colorEl = document.getElementById('ob-avatar-color');
  const preview = document.getElementById('ob-avatar-preview');
  if (!colorEl?.value || !preview) return; // only update if colour-based avatar is active
  const name     = (document.getElementById('ob-name')?.value || '').trim();
  const initials = name
    ? name.split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase()
    : '?';
  const span = preview.querySelector('.ob-av-initials');
  if (span) span.textContent = initials;
}

function obSelectRole(btn) {
  document.querySelectorAll('.ob-role-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  _obSelectedRole = btn.dataset.role;
  // Show/hide "Other — specify" input
  var otherRow = document.getElementById('ob-role-other-row');
  var otherVal = document.getElementById('ob-role-other-val');
  if (otherRow) otherRow.style.display = (_obSelectedRole === 'other') ? 'block' : 'none';
  if (_obSelectedRole !== 'other' && otherVal) otherVal.value = '';
}

// ── Profile form value collector (shared by sync + async paths) ──
function _obCollectProfileForm() {
  const nameEl      = document.getElementById('ob-name');
  const uidEl       = document.getElementById('ob-uid');
  const instEl      = document.getElementById('ob-inst');
  const otherEl     = document.getElementById('ob-inst-other');
  const errEl       = document.getElementById('ob-error');
  const photoDataEl = document.getElementById('ob-photo-data');
  const avatarColorEl = document.getElementById('ob-avatar-color');
  const roleOtherEl = document.getElementById('ob-role-other-val');

  const name     = nameEl?.value.trim()  || '';
  const uid      = uidEl?.value.trim()   || '';
  const instRaw  = instEl?.value         || '';
  const inst     = instRaw === '__other' ? (otherEl?.value.trim() || '') : instRaw;
  const photoURL = photoDataEl?.value    || '';
  const avatarColor = avatarColorEl?.value || '';

  let finalRole = _obSelectedRole || '';
  if (finalRole === 'other') {
    const otherRoleText = roleOtherEl?.value.trim();
    if (!otherRoleText) {
      if (errEl) { errEl.textContent = 'Please specify your role.'; errEl.style.display = 'block'; }
      roleOtherEl?.classList.add('error');
      return null;
    }
    if (roleOtherEl) roleOtherEl.classList.remove('error');
  }
  const roleLabel = (finalRole === 'other' && roleOtherEl?.value.trim())
    ? roleOtherEl.value.trim() : finalRole;

  const errs = [];
  if (!name) { errs.push('Please enter your name.'); nameEl?.classList.add('error'); }
  else nameEl?.classList.remove('error');
  if (!inst) { errs.push('Please select your institution.'); instEl?.classList.add('error'); }
  else instEl?.classList.remove('error');
  if (!finalRole) errs.push('Please select your role.');

  if (errs.length) {
    if (errEl) { errEl.textContent = errs[0]; errEl.style.display = 'block'; }
    return null;
  }
  if (errEl) errEl.style.display = 'none';

  return { name, uid, inst, photoURL, avatarColor, finalRole, roleLabel };
}

// ── Persist profile and update Firestore (after Firebase UID known) ──
function _obSaveAndFinish(fields, fbUid) {
  const { name, uid, inst, photoURL, avatarColor, finalRole, roleLabel } = fields;

  // Email comes from Firebase Auth — the user's actual sign-in credential
  const auth = _getAuth();
  const email = auth?.currentUser?.email || '';

  const profile = {
    name, uid, institution: inst,
    role: finalRole, roleLabel,
    email, photoURL, avatarColor,
    createdAt: new Date().toISOString(), firebaseUid: fbUid || null,
  };
  saveUserProfile(profile);

  try {
    const s = DataService.get('settings') || {};
    s.institution = inst;
    DataService.save('settings', s);
    localStorage.setItem('nc_institution', inst);
  } catch(e) {}

  try {
    if (typeof db !== 'undefined' && db && typeof SESSION_ID !== 'undefined') {
      db.collection('sessions').doc(SESSION_ID).update({
        userName: profile.name, userId: profile.uid, userRole: profile.role,
        roleLabel: profile.roleLabel || profile.role,
        institution: inst, institutionCat: typeof _getInstitutionCategory !== 'undefined' ? _getInstitutionCategory(inst) : '',
        photoURL: profile.photoURL || '', avatarColor: profile.avatarColor || '',
      }).catch(() => {});
    }
    const _pid = sessionStorage.getItem('_ntpPid');
    if (typeof db !== 'undefined' && db && _pid) {
      db.collection('presence').doc(_pid).update({
        userName: profile.name, userRole: profile.role, userUid: profile.uid,
        institution: inst,
      }).catch(() => {});
    }
  } catch(e) {}

  _obFinish(name, false);
}

async function obSubmit() {
  const errEl = document.getElementById('ob-error');

  // Collect and validate profile form
  const fields = _obCollectProfileForm();
  if (!fields) return;  // validation failed — error already shown

  const submitBtn = document.querySelector('#ob-step-profile .ob-submit');

  // ── NEW REGISTRATION: create Firebase account then save profile ──
  // _obPendingReg is set in obAuthSubmit() when Register is clicked.
  // Account creation is deferred to here so the user is never
  // authenticated until their profile is fully completed.
  if (_obPendingReg) {
    const { email: regEmail, pw: regPw } = _obPendingReg;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="ob-spinner"></span><span>Creating account…</span>';
    }

    const auth = _getAuth();
    if (!auth) {
      if (errEl) { errEl.textContent = 'Unable to connect. Please check your internet.'; errEl.style.display = 'block'; }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Complete Registration →'; }
      return;
    }

    try {
      const cred = await auth.createUserWithEmailAndPassword(regEmail, regPw);
      const fbUid = cred.user?.uid || null;

      // Send email verification immediately — user must confirm ownership
      cred.user.sendEmailVerification().catch(() => {});

      // Account created — clear the pending credentials immediately
      _obPendingReg = null;

      _obSaveAndFinish(fields, fbUid);
    } catch(err) {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Complete Registration →'; }
      const codes = {
        'auth/email-already-in-use':   'An account with this email already exists. Please go back and use a different email.',
        'auth/weak-password':          'Password must be at least 6 characters.',
        'auth/network-request-failed': 'Network error. Check your connection and try again.',
        'auth/too-many-requests':      'Too many attempts. Please wait a moment.',
      };
      if (errEl) {
        errEl.textContent = codes[err.code] || 'Account creation failed. Please try again.';
        errEl.style.display = 'block';
      }
    }
    return;
  }

  // ── EXISTING USER: profile setup after sign-in (no account creation needed) ──
  const auth = _getAuth();
  const fbUid = auth?.currentUser?.uid || null;
  _obSaveAndFinish(fields, fbUid);
}

function _obFinish(name, isReturning) {
  document.getElementById('ob-overlay').classList.add('hidden');
  document.body.classList.add('ob-authed');
  document.body.style.overflow = '';
  try { renderHomePage(); } catch(e) {}
  try { renderProfileCard(); } catch(e) {}
  showToast((isReturning ? 'Welcome back, ' : 'Welcome, ') + name + '! ', 'success');
}

// ── Onboarding gate ───────────────────────────────────────────────
function checkOnboarding() {
  const auth = _getAuth();
  if (auth) {
    // Let Firebase Auth state determine whether to show the overlay
    auth.onAuthStateChanged((user) => {
      if (user) {
        // ── Session revocation check ──────────────────────────────
        // Cross-check sign-in time against the Firestore revocation
        // registry. If this user was signed out from another session
        // (or a stale session was revoked on logout), the revokedAt
        // timestamp will be newer than their lastSignInTime → force
        // an immediate re-logout so no stale session can persist.
        if (typeof db !== 'undefined' && db) {
          db.collection('session_revocations').doc(user.uid).get()
            .then(rSnap => {
              if (rSnap.exists) {
                const revokedAt   = rSnap.data().revokedAt ? rSnap.data().revokedAt.toDate() : null;
                const lastSignIn  = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null;
                if (revokedAt && lastSignIn && revokedAt > lastSignIn) {
                  // Stale session detected — wipe and re-authenticate
                  _wipeAllUserData();
                  try { localStorage.setItem('ob_has_signed_out', '1'); } catch(e) {}
                  auth.signOut().catch(() => {});
                  _showOnboardingOverlay();
                  return; // Do not proceed with profile load
                }
              }
              // Not revoked — proceed with normal profile check
              _obResolveProfile(user);
            })
            .catch(() => {
              // Revocation check failed (offline) — proceed normally
              // (fail-open: don't lock user out when Firestore is unreachable)
              _obResolveProfile(user);
            });
        } else {
          _obResolveProfile(user);
        }
      } else {
        // Not signed in — always block home screen. Exception: if a
        // Google redirect sign-in is still being resolved, this null is
        // likely just the interim pre-redirect-restore state, not a real
        // "not signed in" — wait for the redirect handler to finish
        // instead of flashing the sign-in screen over its result.
        if (_obRedirectPending) return;
        _showOnboardingOverlay();
      }
    });
  } else {
    // Firebase auth unavailable — simple localStorage check
    if (!getUserProfile()) {
      _showOnboardingOverlay();
    } else {
      _hideOnboardingOverlay();
    }
  }
}

// ── Shared profile resolution after revocation check passes ──────
function _obResolveProfile(user) {
  if (!getUserProfile()) {
    // Profile missing locally — restore from Firestore or re-prompt
    if (typeof db !== 'undefined' && db) {
      db.collection('users').doc(user.uid).get().then(snap => {
        if (snap.exists && snap.data().userName) {
          const d = snap.data();
          saveUserProfile({ name: d.userName, uid: d.userId || '', institution: d.institution || '', role: d.userRole || 'student', email: user.email || d.email || '', photoURL: d.photoURL || '', createdAt: d.createdAt || new Date().toISOString(), firebaseUid: user.uid });
          try { renderProfileCard(); } catch(e) {}
          _hideOnboardingOverlay();
        } else {
          _showOnboardingOverlay();
        }
      }).catch(() => _showOnboardingOverlay());
    } else {
      _showOnboardingOverlay();
    }
  } else {
    // Profile present — hide overlay, let user in
    _hideOnboardingOverlay();
  }
}

function _showOnboardingOverlay() {
  const overlay = document.getElementById('ob-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  document.body.classList.remove('ob-authed');
  document.body.style.overflow = 'hidden';
}

function _hideOnboardingOverlay() {
  const overlay = document.getElementById('ob-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.classList.add('ob-authed');
  document.body.style.overflow = '';
}

// ── Home profile card render ──────────────────────────────────────
function renderProfileCard() {
  const wrap = document.getElementById('hp-profile-card-wrap');
  if (!wrap) return;
  const p = getUserProfile();
  if (!p) {
    wrap.innerHTML = `
      <div class="hp-profile-card" style="cursor:pointer;border:1.5px dashed rgba(29,233,212,0.35);opacity:.85" onclick="checkOnboarding()">
        <div class="hp-profile-avatar"></div>
        <div class="hp-profile-info">
          <div class="hp-profile-name" style="color:var(--teal)">Sign in / Set up profile</div>
          <div class="hp-profile-inst" style="color:var(--text-dim)">Tap to add your name, ID &amp; role</div>
        </div>
        <div class="hp-profile-role" style="border-color:rgba(29,233,212,0.4);color:var(--teal);background:rgba(29,233,212,0.08)">Get started →</div>
      </div>`;
    return;
  }
  const knownRoles = ['student','dietitian','clinician','researcher','nurse','other'];
  const isKnown = knownRoles.includes(p.role);
  const rm = isKnown
    ? ROLE_META[p.role]
    : { label: p.role || 'Other', icon: _ROLE_SVG.other, color: 'var(--teal)' };
  const signOutBtn = ``;
  const avatarInner = p.photoURL
    ? `<img src="${p.photoURL}" alt="Profile photo">`
    : rm.icon;
  wrap.innerHTML = `
    <div class="hp-profile-card">
      <div class="hp-profile-avatar">${avatarInner}</div>
      <div class="hp-profile-info">
        <div class="hp-profile-name">${p.name}</div>
        <div class="hp-profile-inst">${p.institution}</div>
        <div class="hp-profile-id">ID: ${p.uid}</div>
        ${signOutBtn}
      </div>
      <div class="hp-profile-role" style="border-color:${rm.color};color:${rm.color};background:${rm.color}18">${rm.label}</div>
    </div>`;
}

// ── Sign out ──────────────────────────────────────────────────────
// ── Listener cleanup — call on every logout ────────────────────
function _cleanupListeners() {
  (window._ntUnsubs || []).forEach(fn => { try { fn(); } catch(e) {} });
  window._ntUnsubs = [];
}

// ── Comprehensive user-data wipe ─────────────────────────────────
// Clears all user-owned storage and in-memory state.
// Preserves only app-infrastructure keys (SW version flags, PWA
// install state) that are not tied to any individual user.
//
// PRESERVED keys (app infrastructure — not user data):
//   nt-sw-ver               Service worker version gate
//   nt-sw-update-dismissed  SW update toast dismiss flag
//   nt-update-dismissed-ver In-app update banner dismiss
//   pwa-banner-dismissed    PWA install prompt dismiss
//   ob_has_signed_out       Controls "Welcome back" heading text
//
// WIPED keys (user data):
//   nt_user_profile         User profile object
//   nt_push_sub             Push notification subscription
//   nt_custom_foods_v1      User-imported custom foods
//   nc_*                    All DataService keys (settings, patient data)
//   oasis_bc_cache_v1       Barcode scan cache
//   oasis_bc_history_v1     Barcode scan history
//   oasis_feedback_queue    Queued offline feedback
//
// sessionStorage (all wiped — tab-scoped, no app-infra content):
//   _ntPendingPhoto         Pending profile photo blob URL
//   _ntpPid                 Anonymous page-view tracking ID
//   nc_recall               Dietary recall in-progress data
//   nc_mealplan             Meal plan in-progress data

const _PRESERVE_KEYS = new Set([
  'nt-sw-ver',
  'nt-sw-update-dismissed',
  'nt-update-dismissed-ver',
  'pwa-banner-dismissed',
  'ob_has_signed_out',
]);

function _wipeAllUserData() {
  // 1. localStorage — scan and remove all keys not in the preserve list
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !_PRESERVE_KEYS.has(k)) toRemove.push(k);
    }
    toRemove.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });
  } catch(e) {}

  // 2. sessionStorage — wipe entirely (tab-scoped; no cross-user infra content)
  try { sessionStorage.clear(); } catch(e) {}

  // 3. In-memory application state reset
  try {
    // Reset calculation counter
    if (typeof calcCount !== 'undefined') window.calcCount = 0;
    // Clear active module tracker
    window._activeModule = 'home';
    // Null out any cached patient/profile references held on window
    window._ntLastProfile = null;
    window._ntLastPatient = null;
    // Reset pending photo reference (was in sessionStorage; also clear blob URL)
    if (window._ntPendingPhotoURL) {
      try { URL.revokeObjectURL(window._ntPendingPhotoURL); } catch(_) {}
      window._ntPendingPhotoURL = null;
    }
    window._pedrRemovedPhoto = false;
  } catch(e) {}

  // 4. Detach all active Firestore / RTDB listeners
  _cleanupListeners();
}

// Backward-compat alias used by any legacy call sites
function _clearUserLocalStorage() { _wipeAllUserData(); }

// ── Profile completion — tracks 6 fields including photo ─────────
function getProfileCompletion() {
  const p = getUserProfile();
  if (!p) return { pct: 0, missing: [{ key:'name', label:'Full Name' }, { key:'photo', label:'Profile Photo' }], done: 0, total: 6 };
  const fields = [
    { key: 'name',        label: 'Full Name',       done: !!(p.name        && p.name.trim()) },
    { key: 'id',          label: 'Staff/Student ID', done: !!(p.uid        && p.uid.trim()) },
    { key: 'role',        label: 'Role',             done: !!(p.role       && p.role.trim()) },
    { key: 'institution', label: 'Institution',      done: !!(p.institution && p.institution.trim()) },
    { key: 'email',       label: 'Email',            done: !!(p.email      && p.email.trim()) },
    { key: 'photo',       label: 'Profile Photo',    done: !!p.photoURL },
  ];
  const done    = fields.filter(f => f.done).length;
  const missing = fields.filter(f => !f.done).map(f => ({ key: f.key, label: f.label }));
  return { pct: Math.round((done / fields.length) * 100), missing, done, total: fields.length };
}

// ── Secure logout with Firestore-backed session revocation ───────
//
// Security sequence:
//   1. Capture UID BEFORE any wipe (needed for revocation record)
//   2. Write revocation record to Firestore session_revocations/{uid}
//      — acts as the "backend token invalidation"; any future
//        onAuthStateChanged that finds a sign-in time predating this
//        record will force an immediate re-logout.
//   3. Only AFTER Firestore confirms the write: wipe all local data
//      (localStorage, sessionStorage, in-memory state, listeners).
//   4. Call Firebase Auth signOut() to revoke local tokens.
//   5. Reset UI to auth screen.
//
//   On Firestore write failure: proceed with local wipe + signOut
//   after a 3-second timeout, so network issues can never lock the
//   user in (fail-open for UX, fail-closed on data — local data is
//   still wiped even if the remote record couldn't be written).

function obSignOut() {
  if (!confirm('Sign out of Oasis?')) return;
  const auth    = _getAuth();
  const fbUser  = auth ? auth.currentUser : null;
  const uid     = fbUser ? fbUser.uid : null;

  // ── Helper: execute the local wipe + Firebase signOut ──────────
  function _doLocalSignOut() {
    // Wipe all user data (localStorage, sessionStorage, in-memory state)
    _wipeAllUserData();
    // Re-set the "has signed out" flag so next auth screen says "Welcome back"
    try { localStorage.setItem('ob_has_signed_out', '1'); } catch(e) {}

    // Firebase Auth signOut — revokes local ID token and refresh token
    (auth ? auth.signOut() : Promise.resolve())
      .then(() => {
        try { renderProfileCard(); } catch(e) {}
        showToast('Signed out.', 'success');
        document.getElementById('ob-step-auth').style.display    = 'block';
        document.getElementById('ob-step-profile').style.display = 'none';
        document.getElementById('ob-auth-email').value = '';
        document.getElementById('ob-auth-pw').value  = '';
        const confirmPwEl = document.getElementById('ob-auth-confirm-pw');
        if (confirmPwEl) confirmPwEl.value = '';
        document.getElementById('ob-auth-error').textContent  = '';
        document.getElementById('ob-auth-error').style.display = 'none';
        if (_obIsRegisterMode) obToggleAuthMode();
        document.getElementById('ob-auth-heading').textContent = 'Welcome back';
        _showOnboardingOverlay();
      })
      .catch(() => {
        // signOut() failed (e.g. network). Local data already wiped.
        try { renderProfileCard(); } catch(e) {}
        _showOnboardingOverlay();
      });
  }

  // ── Step 1: Write Firestore revocation record, then wipe ───────
  if (uid && typeof db !== 'undefined' && db) {
    // 3-second timeout ensures network issues don't block the logout
    let _done = false;
    const _timer = setTimeout(() => {
      if (_done) return;
      _done = true;
      _doLocalSignOut();
    }, 3000);

    db.collection('session_revocations').doc(uid).set({
      revokedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      revokedBy:   SESSION_ID,  // which session triggered the logout
      userAgent:   navigator.userAgent.slice(0, 200),
    })
    .then(() => {
      if (_done) return;
      _done = true;
      clearTimeout(_timer);
      _doLocalSignOut();
    })
    .catch(() => {
      if (_done) return;
      _done = true;
      clearTimeout(_timer);
      // Firestore write failed — proceed anyway (fail-open for UX)
      _doLocalSignOut();
    });
  } else {
    // No Firestore or no UID — just do the local wipe directly
    _doLocalSignOut();
  }
}

// ── Settings profile sync ─────────────────────────────────────────
// ── Settings drawer role chip selector ──────────────────────────
// Mirrors obSelectRole() from onboarding but targets the settings
// drawer chip grid. Writes the chosen role to the hidden input
// and shows/hides the "Other (specify)" free-text row.
function sdrSelectRole(btn) {
  document.querySelectorAll('.sdr-role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const role = btn.dataset.role || 'other';
  const roleEl   = document.getElementById('sdr-user-role');
  const otherRow = document.getElementById('sdr-role-other-row');
  const otherVal = document.getElementById('sdr-role-other-val');
  if (roleEl) roleEl.value = role;
  if (otherRow) otherRow.style.display = (role === 'other') ? 'block' : 'none';
  if (role !== 'other' && otherVal) otherVal.value = '';
  autoSaveSettings();
}

function loadProfileIntoSettings() {
  const p = getUserProfile();
  const signOutRow = document.getElementById('sdr-signout-row');
  if (signOutRow) signOutRow.style.display = p ? 'block' : 'none';
  if (!p) return;
  const nameEl  = document.getElementById('sdr-user-name');
  const uidEl   = document.getElementById('sdr-user-uid');
  const roleEl  = document.getElementById('sdr-user-role');
  const emailEl = document.getElementById('sdr-user-email');
  if (nameEl)  nameEl.value  = p.name  || '';
  if (uidEl)   uidEl.value   = p.uid   || '';
  if (emailEl) emailEl.value = p.email || '';
  // Restore institution into settings dropdown
  const savedInst = p.institution || localStorage.getItem('nc_institution') || '';
  const instSel   = document.getElementById('def-institution');
  const instOtherRow = document.getElementById('institution-other-row');
  const instOtherInput = document.getElementById('def-institution-other');
  if (instSel && savedInst) {
    const knownOptions = Array.from(instSel.options).map(o => o.value);
    if (knownOptions.includes(savedInst)) {
      instSel.value = savedInst;
      if (instOtherRow) instOtherRow.style.display = 'none';
    } else {
      instSel.value = 'Other';
      if (instOtherInput) instOtherInput.value = savedInst;
      if (instOtherRow) instOtherRow.style.display = 'block';
    }
  }
  // Restore role chip selection
  const savedRole = p.role || 'student';
  const knownRoles = ['student','dietitian','clinician','researcher','nurse','other'];
  const isKnown = knownRoles.includes(savedRole);
  const chipRole = isKnown ? savedRole : 'other';
  if (roleEl) roleEl.value = chipRole === 'other' && !isKnown ? savedRole : chipRole;
  document.querySelectorAll('.sdr-role-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.role === chipRole);
  });
  const otherRow = document.getElementById('sdr-role-other-row');
  const otherVal = document.getElementById('sdr-role-other-val');
  if (chipRole === 'other') {
    if (otherRow) otherRow.style.display = 'block';
    if (otherVal && !isKnown) otherVal.value = savedRole;
  } else {
    if (otherRow) otherRow.style.display = 'none';
    if (otherVal) otherVal.value = '';
  }
}

function saveProfileFromSettings() {
  const p = getUserProfile() || {};
  const nameEl  = document.getElementById('sdr-user-name');
  const uidEl   = document.getElementById('sdr-user-uid');
  const roleEl  = document.getElementById('sdr-user-role');
  const emailEl = document.getElementById('sdr-user-email');
  if (nameEl && nameEl.value.trim()) p.name = nameEl.value.trim();
  if (uidEl  && uidEl.value.trim())  p.uid  = uidEl.value.trim();
  if (roleEl) {
    // If 'other' chip is active, use the free-text value instead
    const chipVal = roleEl.value;
    if (chipVal === 'other') {
      const otherText = (document.getElementById('sdr-role-other-val')?.value || '').trim();
      p.role = otherText || 'other';
    } else {
      p.role = chipVal;
    }
  }
  if (emailEl) {
    const newEmail = emailEl.value.trim();
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      const prevEmail = p.email || '';
      p.email = newEmail;
      // Update Firebase Auth email so password reset actually works
      if (newEmail !== prevEmail) {
        const auth = _getAuth();
        if (auth?.currentUser) auth.currentUser.updateEmail(newEmail).catch(() => {});
      }
    }
  }
  const instSel = document.getElementById('def-institution');
  if (instSel && instSel.value) {
    const instVal = instSel.value === 'Other'
      ? (document.getElementById('def-institution-other')?.value.trim() || 'Other')
      : instSel.value;
    if (instVal) p.institution = instVal;
  }
  saveUserProfile(p);
}

// ── BACKGROUND CLOCK (time-awareness only — no DOM writes) ───────
// Exposes window.NT_NOW (live Date) and fires a custom 'nt-tick' event
// every second so any module can listen without this function touching tabs.
(function startBackgroundClock() {
  function tick() {
    window.NT_NOW = new Date();
    try {
      document.dispatchEvent(new CustomEvent('nt-tick', { detail: window.NT_NOW }));
    } catch(e) {}
  }
  tick();
  setInterval(tick, 1000);
})();

// Update visible clock from nt-tick
document.addEventListener('nt-tick', function(e) {
  var el = document.getElementById('nt-clock');
  if (!el) return;
  var now = e.detail;
  var h = String(now.getHours()).padStart(2,'0');
  var m = String(now.getMinutes()).padStart(2,'0');
  el.innerHTML = h + '<span style="animation:clock-colon-blink 1s step-start infinite;display:inline-block">:</span>' + m;
});

// ── BOOT ─────────────────────────────────────────────────────────
applyInitialSettings();

// Immediately hide overlay if user is already signed in (prevents home screen flash)
if (getUserProfile()) {
  const _bootOverlay = document.getElementById('ob-overlay');
  if (_bootOverlay) { _bootOverlay.classList.add('hidden'); document.body.style.overflow = ''; }
  document.body.classList.add('ob-authed');
}

if (USE_FIREBASE) {
  initFirebase();   // async — connects to Firestore and logs session
} else {
  initOfflineMode();
}
// Render the activity/preset strip after a short delay to allow DataService to init
setTimeout(() => {
  try { renderActivityStrip(); } catch(e){}
  try { renderHomePage();      } catch(e){}
  try { renderProfileCard();   } catch(e){}
  try { buildDiagList();       } catch(e){}
  checkOnboarding();
}, 300);


// ═══════════════════════════════════════════════════════════════
// MODULE: PEDIATRIC CALCULATOR — FENTON 2013 GROWTH CHARTS
//
// Reference: Fenton TR, Kim JH. "A systematic review and meta-analysis
// to revise the Fenton growth chart for preterm infants."
// BMC Pediatrics. 2013;13:59. doi:10.1186/1471-2431-13-59
//
//   NOTE: "Fenton 2025" is not a formally published edition.
//     These LMS values are derived from the Fenton 2013 supplementary
//     tables. Verify all values against the official publication before
//     clinical use. Data marked 【VERIFY】 are interpolated estimates.
//
// LMS Z-score: Z = [(y/M)^L − 1] / (L × S)  when L ≠ 0
//              Z = ln(y/M) / S                 when L = 0
// ═══════════════════════════════════════════════════════════════

// ── FENTON 2013 LMS LOOKUP TABLES ───────────────────────────
// Each row: [GA_weeks, L, M(median), S(CV)]
// GA range: 22–50 post-menstrual weeks
// ─────────────────────────────────────────────────────────────


// DATABASE SUB-TAB SWITCHER
// ══════════════════════════════════════════════════════════════
// UCT EXCHANGE DATABASE — INIT & RENDER
// ══════════════════════════════════════════════════════════════
let uctInitialized = false;


function uctInit() {
  if (uctInitialized) return;
  uctInitialized = true;
  uctRender();
}

function uctRender() {
  if (typeof UCT_EXCHANGE_DB === 'undefined') return;
  const search  = (document.getElementById('uct-search')?.value || '').toLowerCase().trim();
  const catVal  = document.getElementById('uct-cat')?.value   || '';
  const sortVal = document.getElementById('uct-sort')?.value  || 'name';

  let foods = UCT_EXCHANGE_DB.filter(f => {
    const matchName = !search || f.name.toLowerCase().includes(search);
    const matchCat  = !catVal || f.exchange_type === catVal;
    return matchName && matchCat;
  });

  // Sort
  if (sortVal === 'name')       foods.sort((a,b) => a.name.localeCompare(b.name));
  else if (sortVal === 'kcal_desc') foods.sort((a,b) => (b.kcal[0]||0) - (a.kcal[0]||0));
  else if (sortVal === 'kcal_asc')  foods.sort((a,b) => (a.kcal[0]||0) - (b.kcal[0]||0));
  else if (sortVal === 'pro_desc')  foods.sort((a,b) => (b.pro[0]||0)  - (a.pro[0]||0));
  else if (sortVal === 'type')      foods.sort((a,b) => a.exchange_type.localeCompare(b.exchange_type) || a.name.localeCompare(b.name));

  // Stats
  const statFoods = document.getElementById('uct-stat-foods');
  const statKcal  = document.getElementById('uct-stat-avg-kcal');
  const statPro   = document.getElementById('uct-stat-avg-pro');
  const statTypes = document.getElementById('uct-stat-types');
  const badge     = document.getElementById('uct-table-badge');
  if (statFoods) statFoods.textContent = foods.length;
  if (statKcal && foods.length) {
    const avg = foods.reduce((s,f) => s + (f.kcal[0]||0), 0) / foods.length;
    statKcal.textContent = avg.toFixed(0);
  }
  if (statPro && foods.length) {
    const avg = foods.reduce((s,f) => s + (f.pro[0]||0), 0) / foods.length;
    statPro.textContent = avg.toFixed(1);
  }
  if (statTypes) {
    const types = new Set(foods.map(f => f.exchange_type));
    statTypes.textContent = types.size;
  }
  if (badge) badge.textContent = `${foods.length} of ${UCT_EXCHANGE_DB.length} foods`;

  const tbody = document.getElementById('uct-tbody');
  const noResults = document.getElementById('uct-no-results');
  if (!tbody) return;

  if (!foods.length) {
    tbody.innerHTML = '';
    if (noResults) noResults.style.display = '';
    return;
  }
  if (noResults) noResults.style.display = 'none';

  tbody.innerHTML = foods.map(f => {
    const typeLabel = UCT_EXCHANGE_TYPE_LABELS[f.exchange_type] || f.exchange_type;
    const portions  = f.portions.join(' / ');
    return `<tr>
      <td style="font-weight:600">${f.name}</td>
      <td><span style="background:rgba(29,233,212,.12);color:var(--teal);padding:2px 7px;border-radius:4px;font-size:9px;font-family:var(--mono);letter-spacing:.5px">${typeLabel}</span></td>
      <td style="font-family:var(--mono);font-size:10px">${portions}</td>
      <td style="color:var(--amber);font-weight:700">${f.kcal[0] ?? '—'}</td>
      <td style="color:var(--amber)">${f.kj[0] ?? '—'}</td>
      <td style="color:var(--blue)">${f.pro[0] ?? '—'}</td>
      <td style="color:var(--teal)">${f.cho[0] ?? '—'}</td>
      <td style="color:var(--green)">${f.fat[0] ?? '—'}</td>
    </tr>`;
  }).join('');
}

function uctExportCSV() {
  // Database export disabled — exchange list tables are not downloadable.
  showToast('Database export is disabled');
}

function dbSwitchTab(tab) {
  ['food','exchange','enteral','pn','renal','packaged'].forEach(t => {
    const panel = document.getElementById('dbpanel-' + t);
    const btn   = document.getElementById('dbtab-' + t);
    if (panel) panel.style.display = t === tab ? '' : 'none';
    if (btn)   btn.classList.toggle('dbtab-active', t === tab);
  });
  // Database export button disabled across all tabs — food/exchange/enteral/
  // renal/packaged tables are no longer downloadable.
  const exportBtn = document.getElementById('db-export-btn');
  if (exportBtn) { exportBtn.onclick = null; exportBtn.style.display = 'none'; }
  if (tab === 'enteral'  && !enInitialized)  enInit();
  if (tab === 'exchange' && !uctInitialized) uctInit();
  if (tab === 'renal'    && !rnInitialized)  rnInit();
  if (tab === 'packaged' && !pkgInitialized) pkgInit();
}

// ══════════════════════════════════════════════════════════════
// RENAL EXCHANGE LIST — DATABASE PANEL ENGINE
// Source: Chakudya Nutrition Registry (CNR) — GET /renal (349 items,
//         South African renal-diet exchange list: per-portion energy,
//         protein, fat, CHO, and the three renal-relevant minerals —
//         phosphate, sodium, potassium).
// Offline-first: fetched once, cached in localStorage (24h TTL), and
// re-synced silently in the background — same pattern as the formula
// registry cache in foodSearch.js. No local hardcoded array involved.
// Columns: Name · Portion · kJ/kcal · Protein · PO4 · K · Na · Tags
// ══════════════════════════════════════════════════════════════

const RENAL_CACHE_KEY = 'oasis_renal_cache_v1';
const RENAL_SYNC_TTL  = 24 * 60 * 60 * 1000; // 24h
let _renalCache        = [];
let _renalSyncedAt     = 0;
let rnInitialized       = false;

/** Normalise one raw /renal row into a flat numeric-safe shape. */
function _renalRowToUnified(d) {
  if (!d || !d.name) return null;
  const num = v => (v == null || v === '' ? null : +v);
  return {
    id:       d.id,
    name:     d.name,
    code:     d.code || null,
    grams:    d.grams || null,
    measure:  d.measure || null,
    energy_kj: num(d.energy_kj),
    protein_g: num(d.protein),
    fat_g:     num(d.fat),
    cho_g:     num(d.cho),
    po4_mg:    num(d.po4),
    na_mg:     num(d.na),
    k_mg:      num(d.k),
  };
}

/** Fetch the full CNR /renal registry (349 items fit in one page) and cache it. */
async function _syncRenalFromCNR() {
  try {
    const res = await fetch('https://chakudya-api.edisontaimu9.workers.dev/renal?limit=400');
    if (!res.ok) return false;
    const json = await res.json();
    if (json.status !== 'success' || !Array.isArray(json.data)) return false;
    const rows = json.data.map(_renalRowToUnified).filter(Boolean);
    _renalCache    = rows;
    _renalSyncedAt = Date.now();
    try {
      localStorage.setItem(RENAL_CACHE_KEY, JSON.stringify({ data: rows, ts: _renalSyncedAt }));
    } catch (_e) { /* storage full — in-memory cache still works this session */ }
    return true;
  } catch (_e) {
    // Offline or unreachable — whatever's cached (memory or localStorage) stands.
    return false;
  }
}

function rnInit() {
  if (rnInitialized) return;
  rnInitialized = true;

  // Instant paint from localStorage if we have it, however stale.
  try {
    const raw = localStorage.getItem(RENAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.data)) { _renalCache = parsed.data; _renalSyncedAt = parsed.ts || 0; }
    }
  } catch (_e) { /* corrupt/unavailable cache — ignore, network sync below will fill it */ }

  rnRender();

  // Always attempt a fresh sync if the cache is empty or stale; re-render on success.
  if (!_renalCache.length || Date.now() - _renalSyncedAt >= RENAL_SYNC_TTL) {
    const badge = document.getElementById('rn-table-badge');
    if (badge && !_renalCache.length) badge.textContent = 'Loading from Chakudya…';
    _syncRenalFromCNR().then(ok => { if (ok) rnRender(); });
  }
}

/** Derive clinically-relevant tags from raw mineral values (no server-side tags on this endpoint). */
function _renalTags(e) {
  const tags = [];
  if (e.po4_mg != null) tags.push(e.po4_mg > 100 ? 'High Phosphorus' : 'Low Phosphorus');
  if (e.k_mg   != null) tags.push(e.k_mg > 200 ? 'High Potassium' : e.k_mg >= 120 ? 'Moderate Potassium' : 'Low Potassium');
  if (e.na_mg  != null) tags.push(e.na_mg >= 430 ? 'High Sodium' : e.na_mg <= 55 ? 'Low Sodium' : null);
  return tags.filter(Boolean);
}

function rnRender() {
  const query = (document.getElementById('rn-search')?.value || '').toLowerCase().trim();
  const kTag   = document.getElementById('rn-k')?.value   || '';
  const naTag  = document.getElementById('rn-na')?.value  || '';
  const po4Tag = document.getElementById('rn-po4')?.value || '';
  const sort   = document.getElementById('rn-sort')?.value || 'name';

  let rows = _renalCache.map(e => ({ ...e, _tags: _renalTags(e) })).filter(e => {
    if (query  && !e.name.toLowerCase().includes(query)) return false;
    if (kTag   && !e._tags.includes(kTag))   return false;
    if (naTag  && !e._tags.includes(naTag))  return false;
    if (po4Tag && !e._tags.includes(po4Tag)) return false;
    return true;
  });

  rows.sort((a, b) => {
    if (sort === 'po4_desc')  return (b.po4_mg || 0) - (a.po4_mg || 0);
    if (sort === 'k_desc')    return (b.k_mg   || 0) - (a.k_mg   || 0);
    if (sort === 'na_desc')   return (b.na_mg  || 0) - (a.na_mg  || 0);
    if (sort === 'kcal_desc') return ((b.energy_kj || 0) / 4.184) - ((a.energy_kj || 0) / 4.184);
    return a.name.localeCompare(b.name);
  });

  const count  = rows.length;
  const avgPO4 = count ? Math.round(rows.reduce((s, e) => s + (e.po4_mg || 0), 0) / count) : 0;
  const avgK   = count ? Math.round(rows.reduce((s, e) => s + (e.k_mg   || 0), 0) / count) : 0;
  const avgNa  = count ? Math.round(rows.reduce((s, e) => s + (e.na_mg  || 0), 0) / count) : 0;

  const _s = id => document.getElementById(id);
  if (_s('rn-stat-count')) _s('rn-stat-count').textContent = count;
  if (_s('rn-stat-po4'))   _s('rn-stat-po4').textContent   = avgPO4 || '—';
  if (_s('rn-stat-k'))     { _s('rn-stat-k').textContent = avgK || '—'; _s('rn-stat-k').style.color = '#c084fc'; }
  if (_s('rn-stat-na'))    _s('rn-stat-na').textContent    = avgNa || '—';
  if (_s('rn-table-badge')) {
    _s('rn-table-badge').textContent = _renalCache.length
      ? `${count} of ${_renalCache.length} · Chakudya CNR`
      : 'No data — check connection';
  }

  const _tagBadge = tag => {
    let color = 'var(--text-dim)', bg = 'rgba(100,100,100,.12)', border = 'rgba(100,100,100,.25)';
    if (tag === 'High Phosphorus')    { color = 'var(--amber)'; bg = 'rgba(251,191,36,.12)';  border = 'rgba(251,191,36,.3)'; }
    if (tag === 'Low Phosphorus')     { color = 'var(--green)'; bg = 'rgba(0,230,118,.10)';    border = 'rgba(0,230,118,.25)'; }
    if (tag === 'High Potassium')     { color = '#c084fc';      bg = 'rgba(192,132,252,.12)';  border = 'rgba(192,132,252,.3)'; }
    if (tag === 'Moderate Potassium') { color = '#c084fc';      bg = 'rgba(192,132,252,.07)';  border = 'rgba(192,132,252,.2)'; }
    if (tag === 'Low Potassium')      { color = 'var(--green)'; bg = 'rgba(0,230,118,.10)';    border = 'rgba(0,230,118,.25)'; }
    if (tag === 'High Sodium')        { color = 'var(--blue)';  bg = 'rgba(96,165,250,.12)';   border = 'rgba(96,165,250,.3)'; }
    if (tag === 'Low Sodium')         { color = 'var(--green)'; bg = 'rgba(0,230,118,.10)';    border = 'rgba(0,230,118,.25)'; }
    return `<span style="font-family:var(--mono);font-size:7.5px;font-weight:700;padding:2px 6px;border-radius:100px;white-space:nowrap;color:${color};background:${bg};border:1px solid ${border};display:inline-block;margin:1px 2px 1px 0">${tag}</span>`;
  };

  const _elCell = (val, type) => {
    if (val == null) return '<td style="color:var(--text-dim)">—</td>';
    let color = 'var(--text)';
    if (type === 'po4') color = val > 100  ? 'var(--amber)' : 'var(--green)';
    if (type === 'k')   color = val > 200  ? '#c084fc' : val >= 120 ? '#c084fc' : 'var(--green)';
    if (type === 'na')  color = val >= 430 ? 'var(--blue)' : val <= 55 ? 'var(--green)' : 'var(--text)';
    return `<td style="font-family:var(--mono);font-size:12px;font-weight:700;color:${color}">${val}</td>`;
  };

  const tbody = document.getElementById('rn-tbody');
  const noRes = document.getElementById('rn-no-results');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '';
    if (noRes) noRes.style.display = '';
    return;
  }
  if (noRes) noRes.style.display = 'none';

  tbody.innerHTML = rows.map(e => {
    const kcal    = e.energy_kj != null ? Math.round(e.energy_kj / 4.184) : '—';
    const portion = [e.grams, e.measure].filter(Boolean).join(' · ') || '—';
    const tags    = e._tags.map(_tagBadge).join('');
    return `<tr>
      <td style="font-weight:600">${e.name}</td>
      <td style="font-family:var(--mono);font-size:11px">${portion}</td>
      <td style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--amber)">${kcal}</td>
      <td style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--blue)">${e.protein_g != null ? e.protein_g.toFixed(1) : '—'}</td>
      ${_elCell(e.po4_mg, 'po4')}
      ${_elCell(e.k_mg,   'k')}
      ${_elCell(e.na_mg,  'na')}
      <td style="min-width:160px">${tags}</td>
    </tr>`;
  }).join('');
}

function rnExportCSV() {
  // Database export disabled — renal exchange list tables are not downloadable.
  showToast('Database export is disabled');
}

// ══════════════════════════════════════════════════════════════
// ENTERAL FORMULA TAG ENGINE
// Clinical thresholds — all values per 100 mL unless stated.
// Sources: ASPEN 2022 · ESPEN 2023 · AND Evidence Analysis Library
// ══════════════════════════════════════════════════════════════

/**
 * TAG THRESHOLDS (per 100 mL)
 * ─────────────────────────────────────────────────────────────
 * Energy Density
 *   High Energy  : ≥ 1.5 kcal/mL
 *   Standard Energy : < 1.5 kcal/mL
 *
 * Protein (% of total energy)
 *   High Protein : protein energy ≥ 20 % of total energy
 *                  i.e. (pro_g × 4) / (kcalML × 100) ≥ 0.20
 *   Standard Protein : < 20 %
 *
 * Fibre (g per 100 mL — equivalent to g/dL of feed)
 *   Low Fibre    : fibre < 2 g/100 mL  (< ~10 g/500 mL serving)
 *   Moderate Fibre: 2 – 5 g/100 mL     (10–25 g/500 mL)
 *   High Fibre   : > 5 g/100 mL        (> 25 g/500 mL)
 *
 * Route-derived
 *   Sip Feed     : route contains "Oral"
 *   Tube Feed    : route contains "Enteral"
 *
 * Category-derived (extensible)
 *   Renal-Adapted · Diabetic / Low-GI · Semi-elemental
 *   Elemental · Immune-enhancing · Hepatic · Pulmonary
 *   Paediatric · Modular
 */

const TAG_THRESHOLDS = {
  HIGH_ENERGY_KCAL_ML : 1.5,
  HIGH_PROTEIN_PCT    : 0.20,   // fraction of kcal from protein
  MODERATE_FIBRE_MIN  : 2.0,    // g/100 mL
  HIGH_FIBRE_MIN      : 5.0,    // g/100 mL
};

/** Returns a sorted array of clinical tag strings for a formula object. */
function getFormulaTags(f) {
  const tags = [];
  const kcalPer100 = (f.kcalML || 0) * 100;

  // ── Energy ──────────────────────────────────────────────────
  if ((f.kcalML || 0) >= TAG_THRESHOLDS.HIGH_ENERGY_KCAL_ML) {
    tags.push('High Energy');
  } else {
    tags.push('Standard Energy');
  }

  // ── Protein % of energy ─────────────────────────────────────
  if (kcalPer100 > 0 && f.pro != null) {
    const proteinPct = (f.pro * 4) / kcalPer100;
    if (proteinPct >= TAG_THRESHOLDS.HIGH_PROTEIN_PCT) {
      tags.push('High Protein');
    } else {
      tags.push('Standard Protein');
    }
  }

  // ── Fibre ────────────────────────────────────────────────────
  const fibre = f.fibre || 0;
  if (fibre >= TAG_THRESHOLDS.HIGH_FIBRE_MIN) {
    tags.push('High Fibre');
  } else if (fibre >= TAG_THRESHOLDS.MODERATE_FIBRE_MIN) {
    tags.push('Moderate Fibre');
  } else {
    tags.push('Low Fibre');
  }

  // ── Route ────────────────────────────────────────────────────
  if (f.route) {
    if (f.route.includes('Oral'))    tags.push('Sip Feed');
    if (f.route.includes('Enteral')) tags.push('Tube Feed');
  }

  // ── Category-derived clinical tags ──────────────────────────
  const catMap = {
    'Renal'                       : 'Renal-Adapted',
    'Hepatic'                     : 'Hepatic',
    'Pulmonary / ARDS'            : 'Pulmonary',
    'Diabetic / Glycaemic Control': 'Diabetic / Low-GI',
    'Semi-elemental'              : 'Semi-elemental',
    'Elemental / Amino Acid'      : 'Elemental',
    'Immune-enhancing'            : 'Immune-enhancing',
    'Paediatric'                  : 'Paediatric',
    'Modular Supplement'          : 'Modular',
  };
  if (f.cat && catMap[f.cat]) tags.push(catMap[f.cat]);

  return tags;
}

/** Clinical condition → required tags mapping for quick-filter presets. */
const CLINICAL_PRESETS = [
  { label:'ICU / Critical',    icon:'', tags:['High Protein','High Energy'],          note:'High protein + energy dense — trauma, sepsis, burns' },
  { label:' Oncology',          icon:'', tags:['High Protein','Immune-enhancing'],      note:'Immune-enhancing, high protein — cancer cachexia' },
  { label:' Constipation',      icon:'', tags:['High Fibre'],                           note:'High fibre formulas for gut motility support' },
  { label:' Bowel Support',     icon:'', tags:['Moderate Fibre'],                       note:'Moderate fibre — diarrhoea/constipation management' },
  { label:'Malabsorption',     icon:'', tags:['Semi-elemental'],                       note:'Peptide-based, low fat — IBD, pancreatitis, short bowel' },
  { label:' Severe Malabs.',   icon:'', tags:['Elemental'],                            note:'Free amino acid — severe malabsorption, fistulae' },
  { label:' Renal / CKD',       icon:'', tags:['Renal-Adapted'],                        note:'Low electrolytes — dialysis and pre-dialysis patients' },
  { label:' Diabetes',          icon:'', tags:['Diabetic / Low-GI'],                    note:'Slow-release CHO, high MUFA — glycaemic control' },
  { label:' Fluid Restricted',  icon:'', tags:['High Energy'],                          note:'Energy dense ≥1.5 kcal/mL — fluid-restricted patients' },
  { label:' Paediatric',        icon:'', tags:['Paediatric'],                           note:'Age-specific formula for children' },
  { label:' Oral Supplement',   icon:'', tags:['Sip Feed'],                             note:'Oral nutritional supplements (ONS)' },
  { label:' Respiratory',       icon:'', tags:['Pulmonary'],                            note:'High fat, low CHO — ↓CO₂ production, COPD/ARDS' },
];

// ── Tag colour map (consistent across UI) ───────────────────────
const TAG_COLORS = {
  'High Energy'         : { bg:'rgba(240,180,41,.15)',   border:'rgba(240,180,41,.5)',   text:'var(--amber)' },
  'Standard Energy'     : { bg:'rgba(100,140,200,.08)',  border:'rgba(100,140,200,.25)', text:'var(--text-dim)' },
  'High Protein'        : { bg:'rgba(96,165,250,.15)',   border:'rgba(96,165,250,.5)',   text:'var(--blue)' },
  'Standard Protein'    : { bg:'rgba(100,140,200,.08)',  border:'rgba(100,140,200,.25)', text:'var(--text-dim)' },
  'High Fibre'          : { bg:'rgba(52,211,153,.15)',   border:'rgba(52,211,153,.5)',   text:'var(--green)' },
  'Moderate Fibre'      : { bg:'rgba(52,211,153,.08)',   border:'rgba(52,211,153,.3)',   text:'#6ee7b7' },
  'Low Fibre'           : { bg:'rgba(100,140,200,.06)',  border:'rgba(100,140,200,.2)',  text:'var(--text-dim)' },
  'Sip Feed'            : { bg:'rgba(29,233,212,.12)',   border:'rgba(29,233,212,.4)',   text:'var(--teal)' },
  'Tube Feed'           : { bg:'rgba(167,139,250,.12)',  border:'rgba(167,139,250,.4)',  text:'var(--purple)' },
  'Renal-Adapted'       : { bg:'rgba(251,113,133,.15)',  border:'rgba(251,113,133,.5)',  text:'var(--red)' },
  'Hepatic'             : { bg:'rgba(167,139,250,.15)',  border:'rgba(167,139,250,.5)',  text:'var(--purple)' },
  'Pulmonary'           : { bg:'rgba(52,211,153,.12)',   border:'rgba(52,211,153,.4)',   text:'var(--green)' },
  'Diabetic / Low-GI'   : { bg:'rgba(38,222,129,.12)',   border:'rgba(38,222,129,.4)',   text:'#26de81' },
  'Semi-elemental'      : { bg:'rgba(253,150,68,.12)',   border:'rgba(253,150,68,.4)',   text:'#fd9644' },
  'Elemental'           : { bg:'rgba(253,150,68,.15)',   border:'rgba(253,150,68,.5)',   text:'#fc8c37' },
  'Immune-enhancing'    : { bg:'rgba(69,170,242,.12)',   border:'rgba(69,170,242,.4)',   text:'#45aaf2' },
  'Paediatric'          : { bg:'rgba(255,159,67,.12)',   border:'rgba(255,159,67,.4)',   text:'#ff9f43' },
  'Modular'             : { bg:'rgba(100,140,200,.08)',  border:'rgba(100,140,200,.25)', text:'var(--text-dim)' },
};

function tagBadge(tag, small = true) {
  const c = TAG_COLORS[tag] || { bg:'rgba(100,140,200,.08)', border:'rgba(100,140,200,.25)', text:'var(--text-dim)' };
  const sz = small ? '8px' : '10px';
  const px = small ? '5px 8px' : '4px 10px';
  return `<span style="display:inline-block;font-size:${sz};padding:${px};border-radius:10px;background:${c.bg};border:1px solid ${c.border};color:${c.text};font-family:var(--mono);letter-spacing:.3px;white-space:nowrap">${tag}</span>`;
}

// ══════════════════════════════════════════════════════════════
// ENTERAL FORMULA DATABASE
// Sources: ASPEN Adult Nutrition Support Core Curriculum 2012/2022
//          ASPEN Paediatric Handbook 3rd ed. 2024
//          ESPEN Guidelines on Enteral Nutrition 2006–2023
//          Abbott Nutrition, Fresenius Kabi, Nestlé Health Science,
//          Nutricia/Danone product data sheets (clinically reviewed)
// Values per 100 mL unless noted. Verify with current SPC/label.
// Tags are computed dynamically via getFormulaTags() — do not
// hard-code tags; edit thresholds in TAG_THRESHOLDS instead.
// ══════════════════════════════════════════════════════════════
const ENTERAL_DB = [
  // STANDARD POLYMERIC
  { name:'Ensure Original (Abbott)',          cat:'Standard Polymeric',         route:'Oral (Sip Feed)',            kcalML:1.06, pro:3.7,  cho:14.5, fat:3.4,  osm:590,  fibre:0,   note:'Standard complete oral supplement. Lactose-free. Vanilla/chocolate/strawberry.' },
  { name:'Ensure Plus (Abbott)',              cat:'High Energy',                route:'Oral (Sip Feed)',            kcalML:1.5,  pro:6.3,  cho:20.0, fat:5.3,  osm:680,  fibre:0,   note:'1.5 kcal/mL high energy oral supplement. Useful in fluid-restricted patients.' },
  { name:'Ensure High Protein (Abbott)',      cat:'High Protein',               route:'Oral (Sip Feed)',            kcalML:1.25, pro:8.3,  cho:15.7, fat:3.7,  osm:620,  fibre:0,   note:'High protein supplement: 20g protein per 240 mL. Wound healing, sarcopenia.' },
  { name:'Fresubin Original (Fresenius)',     cat:'Standard Polymeric',         route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:3.8,  cho:13.8, fat:3.4,  osm:300,  fibre:0,   note:'Standard isocaloric enteral feed. Low osmolality — suitable for gut transition.' },
  { name:'Fresubin 2 kcal HP (Fresenius)',    cat:'High Energy',                route:'Enteral (NG/NJ/PEG)',        kcalML:2.0,  pro:10.0, cho:22.0, fat:9.0,  osm:840,  fibre:0,   note:'2 kcal/mL high-energy, high-protein. Fluid-restricted ICU patients.' },
  { name:'Fresubin HP Energy (Fresenius)',    cat:'High Protein',               route:'Both',                      kcalML:1.5,  pro:7.5,  cho:17.0, fat:5.8,  osm:495,  fibre:0,   note:'1.5 kcal/mL, 7.5g protein/100mL. Burns, trauma, post-surgical.' },
  { name:'Fresubin 3.2 kcal DRINK (Fresenius)', cat:'Oral Nutritional Supplement', route:'Oral (Sip Feed)',        kcalML:3.2,  pro:16.0, cho:25.0, fat:16.0, osm:730,  fibre:0.5, note:'Ultra high-energy (3.2 kcal/mL) sip feed in 125 mL bottle = 400 kcal, 20g protein. Unique collagen hydrolysate + milk protein blend. ~50% RDA vitamin D/bottle. Nutritionally complete in 5 bottles. For malnutrition, frail elderly, cancer — Grade A. Fat 45%, CHO 33%, protein 20% energy. Halaal, Kosher, gluten-free, lactose-free. Osmolality 1000 mOsm/kg. Mango flavour available.' },
  { name:'Fresubin Jucy DRINK (Fresenius)',   cat:'Oral Nutritional Supplement', route:'Oral (Sip Feed)',           kcalML:1.5,  pro:4.0,  cho:33.5, fat:0,    osm:null, fibre:0,   note:'Juice-style sip feed — 200 mL EasyBottle. 1.5 kcal/mL, 100% whey protein (4g/100mL), fat-free and fibre-free. Suitable for fat malabsorption, clear fluid diet, patients disliking milky drinks. RDA met in 400–600 mL/day. Blackcurrant & Pineapple flavours. Halaal, Kosher, lactose-free, gluten-free. Not suitable <3 yrs.' },
  { name:'Supportan Tube Feed (Fresenius)',   cat:'Immune-enhancing',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:10.0, cho:11.8, fat:6.7,  osm:440,  fibre:1.2, note:'High-energy (1.5 kcal/mL), high-protein (100g/L), low-sodium (475mg/L) enteral feed for ICU and oncology. MCT 34% of fat, EPA ≥2g/500mL from fish oil. Antioxidant-enriched (vit A, C, E, β-carotene, selenium, zinc). Soluble fibre 12g/L. Contains DHA. Anti-inflammatory omega-3 (EPA+DHA) mechanisms: eicosanoid modulation, resolvins/protectins production, NF-κB inhibition. Osmolality 430 mOsm/kg. Fat 40%, CHO 33%, protein 27%. Halaal, Kosher, gluten-free, lactose-free. Not for <3 yrs.' },
  { name:'Supportan DRINK (Fresenius)',       cat:'Oral Nutritional Supplement', route:'Oral (Sip Feed)',           kcalML:1.5,  pro:10.0, cho:12.4, fat:6.7,  osm:null, fibre:0,   note:'Oral version of Supportan for oncology, cachexia, chronic catabolic disease. 1.5 kcal/mL, 27% protein of energy, 40% fat, 33% CHO. High EPA from fish oil — counteracts weight/muscle loss and supports immune function. Preferred energy substrate (fat) suits insulin-resistant cancer patients. ESPEN guidelines support fish oil supplementation for appetite. Halaal, Kosher, gluten-free, lactose-free. Not for <3 yrs.' },
  { name:'Jevity 1.0 Cal (Abbott)',           cat:'Standard Polymeric',         route:'Enteral (NG/NJ/PEG)',        kcalML:1.06, pro:4.4,  cho:15.3, fat:3.5,  osm:300,  fibre:1.4, note:'Standard feed with fibre blend. Gut motility support. Diarrhoea prevention.' },
  { name:'Jevity 1.5 Cal (Abbott)',           cat:'High Energy',                route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:6.4,  cho:21.5, fat:4.9,  osm:525,  fibre:2.2, note:'High energy with fibre. ICU patients needing volume restriction + bowel support.' },
  { name:'Osmolite 1.0 Cal (Abbott)',         cat:'Standard Polymeric',         route:'Enteral (NG/NJ/PEG)',        kcalML:1.06, pro:4.4,  cho:14.4, fat:3.5,  osm:300,  fibre:0,   note:'Low osmolality isocaloric feed. Gut intolerance, jejunal feeding.' },
  { name:'Osmolite 1.5 Cal (Abbott)',         cat:'High Energy',                route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:6.3,  cho:20.4, fat:5.0,  osm:360,  fibre:0,   note:'High energy, low osmolality. Jejunal feeding, critically ill.' },
  // HIGH PROTEIN
  { name:'Promote (Abbott)',                  cat:'High Protein',               route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:6.3,  cho:13.0, fat:2.8,  osm:340,  fibre:0,   note:'High protein (6.3g/100mL), 1.0 kcal/mL. Wound healing, pressure injuries, burns.' },
  { name:'Replete (Nestlé)',                  cat:'High Protein',               route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:6.3,  cho:11.3, fat:3.4,  osm:350,  fibre:1.4, note:'High protein with fibre. Wound healing, pressure injury prevention.' },
  { name:'Cubison (Nestlé)',                  cat:'High Protein',               route:'Both',                      kcalML:1.5,  pro:9.4,  cho:16.9, fat:5.8,  osm:580,  fibre:0,   note:'Very high protein (94g/L). Severely malnourished, pre/post surgical patients.' },
  // RENAL
  { name:'Nepro HP (Abbott)',                 cat:'Renal',                      route:'Oral (Sip Feed)',            kcalML:1.8,  pro:8.1,  cho:21.2, fat:9.6,  osm:590,  fibre:0,   note:'CKD dialysis: high energy, low electrolytes (K⁺ 42 mmol/L, PO₄ 6 mmol/L).' },
  { name:'Suplena (Abbott)',                  cat:'Renal',                      route:'Oral (Sip Feed)',            kcalML:1.8,  pro:4.5,  cho:25.6, fat:9.4,  osm:595,  fibre:0,   note:'Pre-dialysis CKD: low protein (45g/L), low K/P/Na. Slows dialysis initiation.' },
  { name:'Renalcal (Nestlé)',                 cat:'Renal',                      route:'Enteral (NG/NJ/PEG)',        kcalML:2.0,  pro:3.4,  cho:28.8, fat:10.4, osm:600,  fibre:0,   note:'2 kcal/mL, low AA-N for pre-dialysis. Essential amino acid enriched.' },
  { name:'Renilon 7.5 (Nutricia)',            cat:'Renal',                      route:'Oral (Sip Feed)',            kcalML:2.0,  pro:7.5,  cho:22.7, fat:10.0, osm:690,  fibre:0,   note:'High energy dialysis supplement. Low phosphate, low potassium.' },
  // HEPATIC
  { name:'NutriHep (Nestlé)',                 cat:'Hepatic',                    route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:4.0,  cho:21.5, fat:2.6,  osm:790,  fibre:0,   note:'Enriched BCAA (leucine/isoleucine/valine). Hepatic encephalopathy, cirrhosis.' },
  { name:'Heparon Junior (Nestlé)',           cat:'Hepatic',                    route:'Oral (Sip Feed)',            kcalML:1.5,  pro:6.0,  cho:19.0, fat:5.7,  osm:690,  fibre:0,   note:'Paediatric hepatic formula. Enriched BCAA, low AAA, encephalopathy prevention.' },
  // PULMONARY / ARDS
  { name:'Pulmocare (Abbott)',                cat:'Pulmonary / ARDS',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:6.3,  cho:10.6, fat:9.3,  osm:475,  fibre:0,   note:'55% kcal from fat (↓CO₂ production). COPD, ARDS, ventilator-dependent patients.' },
  { name:'Oxepa (Abbott)',                    cat:'Pulmonary / ARDS',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:6.3,  cho:10.5, fat:9.4,  osm:535,  fibre:0,   note:'EPA+GLA anti-inflammatory lipids. ARDS, ALI patients.' },
  { name:'Fresubin Lungx (Fresenius)',        cat:'Pulmonary / ARDS',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:7.5,  cho:12.5, fat:8.2,  osm:400,  fibre:1.5, note:'High fat, low CHO for respiratory patients. Reduces ventilatory drive from CO₂.' },
  // DIABETIC
  { name:'Glucerna 1.0 Cal (Abbott)',         cat:'Diabetic / Glycaemic Control',route:'Both',                     kcalML:1.0,  pro:4.2,  cho:9.6,  fat:5.4,  osm:355,  fibre:1.4, note:'Low GI, high MUFA. Hyperglycaemia, DM2, insulin resistance. Blunts glucose spike.' },
  { name:'Glucerna 1.5 Cal (Abbott)',         cat:'Diabetic / Glycaemic Control',route:'Both',                     kcalML:1.5,  pro:6.3,  cho:14.8, fat:7.2,  osm:474,  fibre:2.2, note:'High energy diabetic formula. Volume-restricted DM2 patients in ICU.' },
  { name:'Diben (Fresenius)',                 cat:'Diabetic / Glycaemic Control',route:'Both',                     kcalML:1.0,  pro:4.5,  cho:8.5,  fat:5.8,  osm:315,  fibre:1.5, note:'Slow-release CHO, high MUFA. Postoperative DM, steroid-induced hyperglycaemia.' },
  { name:'Diason (Nutricia)',                 cat:'Diabetic / Glycaemic Control',route:'Oral (Sip Feed)',           kcalML:1.0,  pro:4.0,  cho:9.7,  fat:5.2,  osm:325,  fibre:2.5, note:'Fructo-oligosaccharide fibre blend. Type 1 and Type 2 DM oral supplement.' },
  // SEMI-ELEMENTAL
  { name:'Peptamen (Nestlé)',                 cat:'Semi-elemental',             route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:4.0,  cho:12.7, fat:3.9,  osm:260,  fibre:0,   note:'Peptide-based (whey). Malabsorption, IBD, pancreatitis, short bowel, chylothorax.' },
  { name:'Peptamen AF (Nestlé)',              cat:'Semi-elemental',             route:'Enteral (NG/NJ/PEG)',        kcalML:1.2,  pro:7.5,  cho:13.3, fat:5.6,  osm:380,  fibre:0,   note:'High protein peptide-based. Critical illness with GI dysfunction.' },
  { name:'Survimed OPD (Fresenius)',          cat:'Semi-elemental',             route:'Both',                      kcalML:1.0,  pro:4.0,  cho:13.2, fat:3.3,  osm:390,  fibre:0,   note:'Short-chain peptides + MCT. Exocrine pancreatic insufficiency, IBD, fistulae.' },
  { name:'Peptison (Nutricia)',               cat:'Semi-elemental',             route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:4.0,  cho:12.2, fat:3.9,  osm:270,  fibre:0,   note:'Semi-elemental + fibre. Gut mucosal recovery, chemotherapy, radiation enteritis.' },
  // ELEMENTAL
  { name:'Vivonex T.E.N. (Nestlé)',          cat:'Elemental / Amino Acid',     route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:3.8,  cho:17.6, fat:0.3,  osm:630,  fibre:0,   note:'Free amino acid formula, virtually fat-free. Severe malabsorption, short bowel.' },
  { name:'Tolerex (Nestlé)',                  cat:'Elemental / Amino Acid',     route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:2.1,  cho:22.6, fat:0.1,  osm:550,  fibre:0,   note:'Ultra-low fat. Severe fat malabsorption, chylothorax, lymphangiectasia.' },
  // IMMUNE-ENHANCING
  { name:'Impact (Nestlé)',                   cat:'Immune-enhancing',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:5.6,  cho:13.0, fat:2.8,  osm:375,  fibre:0,   note:'Arginine 12.5g/L + EPA + RNA. Peri-operative major surgery, head & neck cancer.' },
  { name:'Stresson (Nutricia)',               cat:'Immune-enhancing',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.25, pro:7.5,  cho:14.5, fat:4.0,  osm:395,  fibre:0,   note:'High BCAA + arginine + glutamine. Major trauma, burns, post-op immunonutrition.' },
  { name:'Alitraq (Abbott)',                  cat:'Immune-enhancing',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:5.25, cho:15.0, fat:1.5,  osm:575,  fibre:0,   note:'Glutamine-enriched semi-elemental. Gut mucosal integrity, critical illness.' },
  // PAEDIATRIC
  { name:'Frebini Original (Fresenius)',      cat:'Paediatric',                 route:'Both',                      kcalML:1.0,  pro:2.6,  cho:11.3, fat:4.3,  osm:270,  fibre:0,   note:'Standard paediatric feed 1–6 yr. Complete nutrition for tube or oral use.' },
  { name:'Frebini Energy (Fresenius)',        cat:'Paediatric',                 route:'Both',                      kcalML:1.5,  pro:3.8,  cho:17.8, fat:6.1,  osm:380,  fibre:0,   note:'High energy paediatric 1–6 yr. Catch-up growth, volume-restricted children.' },
  { name:'Frebini Energy Fibre (Fresenius)', cat:'Paediatric',                 route:'Both',                      kcalML:1.5,  pro:3.8,  cho:17.6, fat:6.1,  osm:400,  fibre:1.0, note:'High energy paediatric with FOS/inulin fibre. Constipation-prone children.' },
  { name:'Infatrini (Nutricia)',              cat:'Paediatric',                 route:'Both',                      kcalML:1.0,  pro:2.6,  cho:10.3, fat:5.4,  osm:300,  fibre:0,   note:'High-energy infant formula 0–18 months. Faltering growth, post-surgical neonates.' },
  { name:'Infatrini Peptisorb (Nutricia)',    cat:'Paediatric',                 route:'Both',                      kcalML:1.0,  pro:2.8,  cho:10.4, fat:5.0,  osm:320,  fibre:0,   note:'Hydrolysed peptide infant formula. GI dysfunction, malabsorption in infants.' },
  { name:'Paediasure (Abbott)',               cat:'Paediatric',                 route:'Oral (Sip Feed)',            kcalML:1.0,  pro:2.8,  cho:10.7, fat:4.8,  osm:345,  fibre:0,   note:'Oral supplement 1–10 yr. Complete nutrition. 26 vitamins & minerals.' },
  { name:'Paediasure Plus (Abbott)',          cat:'Paediatric',                 route:'Oral (Sip Feed)',            kcalML:1.5,  pro:4.2,  cho:16.6, fat:6.7,  osm:445,  fibre:0,   note:'High energy oral supplement for children with faltering growth or increased needs.' },
  { name:'Nutrini (Nutricia)',                cat:'Paediatric',                 route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:2.8,  cho:10.9, fat:4.4,  osm:260,  fibre:0,   note:'Standard paediatric enteral feed 1–6 yr. Low osmolality, gut tolerance.' },
  { name:'Nutrini Energy (Nutricia)',         cat:'Paediatric',                 route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:4.2,  cho:16.3, fat:6.6,  osm:360,  fibre:0,   note:'High energy paediatric enteral. Catch-up growth, restricted fluid volume.' },
  { name:'Nutrini Max (Nutricia)',            cat:'Paediatric',                 route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:3.0,  cho:10.3, fat:4.9,  osm:290,  fibre:0,   note:'Paediatric formula 7–12 yr. Older child needs, tube or oral.' },
  // MODULAR SUPPLEMENTS
  { name:'Polycal (Nutricia)',                cat:'Modular Supplement',         route:'Oral (Sip Feed)',            kcalML:2.4,  pro:0,    cho:60.0, fat:0,    osm:900,  fibre:0,   note:'Pure maltodextrin powder. Add to foods/feeds to boost energy without volume.' },
  { name:'Duocal (Nutricia)',                 cat:'Modular Supplement',         route:'Both',                      kcalML:4.9,  pro:0,    cho:72.8, fat:22.3, osm:null, fibre:0,   note:'Fat + CHO energy supplement powder (powder: 492 kcal/100g). Faltering growth.' },
  { name:'Maxijul (Nutricia)',                cat:'Modular Supplement',         route:'Both',                      kcalML:3.8,  pro:0,    cho:95.5, fat:0,    osm:null, fibre:0,   note:'Glucose polymer powder. Energy supplementation, glycogen storage disorders.' },
  { name:'Calogen (Nutricia)',                cat:'Modular Supplement',         route:'Oral (Sip Feed)',            kcalML:4.5,  pro:0,    cho:0,    fat:50.0, osm:null, fibre:0,   note:'Fat emulsion (50% fat, 4.5 kcal/mL). Energy-dense fat supplement. LCT-based.' },
  { name:'Scandishake (Nutricia)',            cat:'Oral Nutritional Supplement', route:'Oral (Sip Feed)',           kcalML:1.5,  pro:3.0,  cho:21.0, fat:6.0,  osm:500,  fibre:0,   note:'Powder supplement made with milk. High energy oral supplement, CF, cystic fibrosis.' },
  { name:'Fortisip Compact Protein (Nutricia)',cat:'Oral Nutritional Supplement',route:'Oral (Sip Feed)',          kcalML:2.4,  pro:18.0, cho:21.7, fat:11.6, osm:760,  fibre:0,   note:'Very high energy and protein. 2.4 kcal/mL. 18g protein/125mL. COPD, cancer, oncology.' },
];


// ── Enteral DB state ──────────────────────────────────────────
let enInitialized = false;
function enInit() {
  enInitialized = true;
  enInitPresets();
  enRender();
  enRenderHighlights();
}

function enRender() {
  const search    = (document.getElementById('en-search')?.value   || '').toLowerCase();
  const cat       = document.getElementById('en-cat')?.value       || '';
  const sort      = document.getElementById('en-sort')?.value      || 'name';
  const route     = document.getElementById('en-route')?.value     || '';
  const tagEnergy = document.getElementById('en-tag-energy')?.value || '';
  const tagPro    = document.getElementById('en-tag-protein')?.value || '';
  const tagFibre  = document.getElementById('en-tag-fibre')?.value  || '';

  let data = ENTERAL_DB.filter(f => {
    if (search && !f.name.toLowerCase().includes(search) && !f.note.toLowerCase().includes(search)) return false;
    if (cat   && f.cat !== cat)   return false;
    if (route && f.route !== route) return false;
    // Tag filters — computed on-the-fly
    const tags = getFormulaTags(f);
    if (tagEnergy && !tags.includes(tagEnergy)) return false;
    if (tagPro    && !tags.includes(tagPro))    return false;
    if (tagFibre  && !tags.includes(tagFibre))  return false;
    return true;
  });

  // Sorting
  if (sort === 'name')         data.sort((a,b) => a.name.localeCompare(b.name));
  else if (sort === 'cat')     data.sort((a,b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
  else if (sort === 'kcal_desc')    data.sort((a,b) => b.kcalML - a.kcalML);
  else if (sort === 'pro_desc')     data.sort((a,b) => b.pro - a.pro);
  else if (sort === 'fibre_desc')   data.sort((a,b) => (b.fibre||0) - (a.fibre||0));
  else if (sort === 'proepct_desc') data.sort((a,b) => {
    const pctA = a.kcalML ? (a.pro*4)/(a.kcalML*100) : 0;
    const pctB = b.kcalML ? (b.pro*4)/(b.kcalML*100) : 0;
    return pctB - pctA;
  });

  const tbody  = document.getElementById('en-tbody');
  const noRes  = document.getElementById('en-no-results');
  const badge  = document.getElementById('en-table-badge');
  const cntEl  = document.getElementById('en-stat-count');
  const kcalEl = document.getElementById('en-stat-kcal');
  const proEl  = document.getElementById('en-stat-pro');
  const fibreEl= document.getElementById('en-stat-fibre');
  const catsEl = document.getElementById('en-stat-cats');

  // Stats
  if (cntEl) cntEl.textContent = data.length;
  if (data.length) {
    if (kcalEl)  kcalEl.textContent  = (data.reduce((s,f)=>s+f.kcalML,0)/data.length).toFixed(2);
    if (proEl)   proEl.textContent   = (data.reduce((s,f)=>s+f.pro,0)/data.length).toFixed(1);
    if (fibreEl) fibreEl.textContent = (data.reduce((s,f)=>s+(f.fibre||0),0)/data.length).toFixed(2);
  }
  const cats = [...new Set(data.map(f=>f.cat))];
  if (catsEl) catsEl.textContent = cats.length;
  if (badge)  badge.textContent  = `${data.length} of ${ENTERAL_DB.length} formulas`;

  // Active filter strip
  const activeArr = [];
  if (search)    activeArr.push(`Search: "${search}"`);
  if (cat)       activeArr.push(`Cat: ${cat}`);
  if (route)     activeArr.push(`Route: ${route}`);
  if (tagEnergy) activeArr.push(tagEnergy);
  if (tagPro)    activeArr.push(tagPro);
  if (tagFibre)  activeArr.push(tagFibre);
  const strip    = document.getElementById('en-active-tags');
  const stripList= document.getElementById('en-active-tags-list');
  if (strip) strip.style.display = activeArr.length ? '' : 'none';
  if (stripList) stripList.innerHTML = activeArr.map(t => tagBadge(t,false)).join(' ');

  const catColors = {
    'Standard Polymeric':'var(--teal)','High Energy':'var(--amber)','High Protein':'var(--blue)',
    'Paediatric':'#ff9f43','Renal':'var(--red)','Hepatic':'var(--purple)',
    'Pulmonary / ARDS':'var(--green)','Diabetic / Glycaemic Control':'#26de81',
    'Semi-elemental':'var(--text)','Elemental / Amino Acid':'#fd9644',
    'Immune-enhancing':'#45aaf2','Modular Supplement':'var(--text-dim)',
    'Oral Nutritional Supplement':'var(--teal)'
  };

  if (!data.length) {
    if (tbody) tbody.innerHTML = '';
    if (noRes) noRes.style.display = '';
    return;
  }
  if (noRes) noRes.style.display = 'none';

  if (tbody) tbody.innerHTML = data.map(f => {
    const col       = catColors[f.cat] || 'var(--text-dim)';
    const kcal500   = f.kcalML ? Math.round(f.kcalML * 500) : '—';
    const tags      = getFormulaTags(f);
    const proPctE   = f.kcalML ? Math.round((f.pro*4)/(f.kcalML*100)*100) : '—';
    const fibreL    = f.fibre != null ? (f.fibre * 10).toFixed(0) : '0';

    // Only show clinically meaningful tags in the cell (exclude Standard tags to reduce noise)
    const displayTags = tags.filter(t => !['Standard Energy','Standard Protein'].includes(t));
    const tagHtml   = displayTags.map(t => tagBadge(t)).join(' ');

    return `<tr>
      <td style="font-weight:600;color:var(--text-bright)">${f.name}</td>
      <td><span style="font-size:9px;padding:2px 8px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid;border-color:${col};color:${col}">${f.cat}</span></td>
      <td style="font-size:10px;color:var(--text-dim)">${f.route}</td>
      <td style="color:var(--amber);font-weight:700">${f.kcalML}</td>
      <td style="color:var(--amber)">${kcal500}</td>
      <td style="color:var(--blue);font-weight:600">${f.pro ?? '—'}</td>
      <td style="color:var(--blue);font-size:10px">${proPctE}%</td>
      <td style="color:var(--teal)">${f.cho ?? '—'}</td>
      <td style="color:var(--green)">${f.fat ?? '—'}</td>
      <td style="color:var(--purple)">${f.osm ?? '—'}</td>
      <td style="color:var(--green);font-weight:${(f.fibre||0)>=2?'700':'400'}">${fibreL}</td>
      <td style="max-width:220px"><div style="display:flex;flex-wrap:wrap;gap:3px">${tagHtml}</div></td>
      <td style="font-size:10px;color:var(--text-dim);max-width:220px;white-space:normal">${f.note}</td>
    </tr>`;
  }).join('');
}

/** Populate clinical preset buttons (called once on init). */
function enInitPresets() {
  const el = document.getElementById('en-presets');
  if (!el) return;
  el.innerHTML = CLINICAL_PRESETS.map((p, i) => `
    <div class="hscroll-item preset-pill">
      <button onclick="enApplyPreset(${i})" style="font-family:var(--mono);font-size:10px;padding:5px 11px;border-radius:20px;background:var(--surface2);border:1px solid var(--border);color:var(--text-dim);cursor:pointer;transition:all .2s;white-space:nowrap" id="en-preset-${i}"
        title="${p.note}">${p.label}</button>
    </div>`).join('');
  requestAnimationFrame(hscrollReinit);
}

function enApplyPreset(idx) {
  const p = CLINICAL_PRESETS[idx];
  if (!p) return;
  enClearFilters(true);
  // Map tags to their respective filter selects
  p.tags.forEach(tag => {
    if (['High Energy','Standard Energy'].includes(tag))       { const el=document.getElementById('en-tag-energy');  if(el) el.value=tag; }
    else if (['High Protein','Standard Protein'].includes(tag)){ const el=document.getElementById('en-tag-protein'); if(el) el.value=tag; }
    else if (['High Fibre','Moderate Fibre','Low Fibre'].includes(tag)){ const el=document.getElementById('en-tag-fibre'); if(el) el.value=tag; }
    else if (['Sip Feed','Tube Feed'].includes(tag))           { const el=document.getElementById('en-route'); if(el) el.value = tag==='Sip Feed'?'Oral (Sip Feed)':'Enteral (NG/NJ/PEG)'; }
    else {
      // Category-derived tag — try to map back to a category
      const catRevMap = {
        'Renal-Adapted':'Renal','Hepatic':'Hepatic','Pulmonary':'Pulmonary / ARDS',
        'Diabetic / Low-GI':'Diabetic / Glycaemic Control','Semi-elemental':'Semi-elemental',
        'Elemental':'Elemental / Amino Acid','Immune-enhancing':'Immune-enhancing',
        'Paediatric':'Paediatric','Modular':'Modular Supplement'
      };
      if (catRevMap[tag]) { const el=document.getElementById('en-cat'); if(el) el.value=catRevMap[tag]; }
    }
  });
  // Highlight active preset button
  document.querySelectorAll('[id^="en-preset-"]').forEach(b=>{b.style.background='var(--surface2)';b.style.borderColor='var(--border)';b.style.color='var(--text-dim)';});
  const btn = document.getElementById(`en-preset-${idx}`);
  if (btn) { btn.style.background='rgba(29,233,212,.12)'; btn.style.borderColor='rgba(29,233,212,.4)'; btn.style.color='var(--teal)'; }
  enRender();
}

function enClearFilters(silent=false) {
  ['en-search','en-cat','en-route','en-tag-energy','en-tag-protein','en-tag-fibre','en-sort'].forEach(id=>{
    const el=document.getElementById(id);
    if (el) { if(el.tagName==='INPUT') el.value=''; else el.value=el.id==='en-sort'?'name':''; }
  });
  document.querySelectorAll('[id^="en-preset-"]').forEach(b=>{b.style.background='var(--surface2)';b.style.borderColor='var(--border)';b.style.color='var(--text-dim)';});
  if (!silent) enRender();
}

function enRenderHighlights() {
  const el = document.getElementById('en-highlights');
  if (!el) return;
  const hs = [
    { label:' Highest Energy Density', color:'var(--amber)',  list: [...ENTERAL_DB].sort((a,b)=>b.kcalML-a.kcalML).slice(0,5),     val:f=>`${f.kcalML} kcal/mL` },
    { label:' Highest Protein %E',     color:'var(--blue)',   list: [...ENTERAL_DB].filter(f=>f.kcalML>0).sort((a,b)=>(b.pro*4/(b.kcalML*100))-(a.pro*4/(a.kcalML*100))).slice(0,5), val:f=>`${Math.round(f.pro*4/(f.kcalML*100)*100)}% energy` },
    { label:' Highest Fibre Content',  color:'var(--green)',  list: [...ENTERAL_DB].sort((a,b)=>(b.fibre||0)-(a.fibre||0)).slice(0,5), val:f=>`${((f.fibre||0)*10).toFixed(0)} g/L` },
    { label:' Paediatric Formulas',    color:'#ff9f43',       list: ENTERAL_DB.filter(f=>f.cat==='Paediatric').slice(0,5),          val:f=>`${f.kcalML} kcal/mL` },
    { label:' Renal-Adapted',          color:'var(--red)',    list: ENTERAL_DB.filter(f=>f.cat==='Renal').slice(0,5),               val:f=>`${f.kcalML} kcal/mL` },
    { label:'Semi / Elemental',       color:'#fd9644',       list: ENTERAL_DB.filter(f=>f.cat==='Semi-elemental'||f.cat==='Elemental / Amino Acid').slice(0,5), val:f=>f.cat },
  ];
  el.innerHTML = hs.map(h => `
    <div class="hscroll-item highlight-card" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px">
      <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:1.5px;color:${h.color};text-transform:uppercase;margin-bottom:10px">${h.label}</div>
      ${h.list.length ? h.list.map((f,i)=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted rgba(255,255,255,.05);font-family:var(--mono);font-size:10px">
        <span style="color:var(--text)">${i+1}. ${f.name}</span>
        <span style="color:${h.color};font-weight:700">${h.val(f)}</span>
      </div>`).join('') : '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">No formulas in this category.</div>'}
    </div>`).join('');
  requestAnimationFrame(hscrollReinit);
}

function enExportCSV() {
  // Database export disabled — enteral formula tables are not downloadable.
  showToast('Database export is disabled');
}

// ── Disease filter state ──────────────────────────────────────

function disFilter(cat) {
  document.querySelectorAll('#dis-filter-btns .preset-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('disfil-' + cat);
  if (btn) btn.classList.add('active');
  document.querySelectorAll('#dis-tbody .dis-row').forEach(row => {
    if (cat === 'all' || row.dataset.cat === cat) {
      row.classList.remove('hidden');
    } else {
      row.classList.add('hidden');
    }
  });
  // Section headers: hide if no visible rows in that section
  document.querySelectorAll('#dis-tbody .dis-section-hdr').forEach(hdr => {
    let next = hdr.nextElementSibling;
    let hasVisible = false;
    while (next && !next.classList.contains('dis-section-hdr')) {
      if (!next.classList.contains('hidden')) hasVisible = true;
      next = next.nextElementSibling;
    }
    hdr.style.display = hasVisible ? '' : 'none';
  });
}

// ═══════════════════════════════════════════════════════════════
// SAM ADMISSION CRITERIA — Interactive Checklist Logic
// CMAM 2016 · Children 6 months to 15 years
// ═══════════════════════════════════════════════════════════════

function toggleAdmissionPanel() {
  const body = document.getElementById('adm-panel-body');
  const icon = document.getElementById('adm-toggle-icon');
  if (!body) return;
  const open = body.style.display === '';
  body.style.display = open ? 'none' : '';
  if (icon) icon.textContent = open ? '▼' : '▲';
}

// Called from ucAutoAge() and calcUnified() to show/hide admission section based on age
function ucUpdateAdmissionVisibility() {
  const dobStr = document.getElementById('uc-dob')?.value;
  const admStr = document.getElementById('uc-admit')?.value;
  const gaBirthStr = document.getElementById('uc-ga-birth')?.value || '';
  const sec = document.getElementById('uc-admission-section');
  if (!sec || !dobStr) return;
  const gaBirthDec = (typeof parseGestationalAge === 'function') ? parseGestationalAge(gaBirthStr) : null;
  const isPreterm = gaBirthDec && gaBirthDec < 37;
  const ref = admStr ? new Date(admStr + 'T00:00:00') : new Date();
  const born = new Date(dobStr + 'T00:00:00');
  const totalDays = Math.floor((ref - born) / 86400000);
  const prematurityWks = isPreterm ? (40 - gaBirthDec) : 0;
  const correctedDays = Math.max(0, totalDays - Math.round(prematurityWks * 7));
  const ageMo = isPreterm ? correctedDays / 30.4375 : totalDays / 30.4375;
  // Show only for 6 months to 15 years
  sec.style.display = (ageMo >= 6 && ageMo <= 180) ? '' : 'none';
  // Auto-pre-fill oedema checkbox from unified form
  const oedema = document.querySelector('input[name="uc-oedema"]:checked')?.value === 'yes';
  ['adm-oedema-3plus','adm-mk-oedema','adm-c-oedema-1or2'].forEach(id => {
    const cb = document.getElementById(id);
    if (cb && oedema && !cb.checked) cb.checked = true;
  });
}

function admCheck() {
  const g = id => document.getElementById(id)?.checked;

  // Group A: Oedema +++
  const groupA = g('adm-oedema-3plus');

  // Group B: Marasmic kwashiorkor (oedema ANY grade + severe wasting)
  const mkOedema  = g('adm-mk-oedema');
  const mkWasting = g('adm-mk-muac1') || g('adm-mk-muac2') || g('adm-mk-muac3') || g('adm-mk-wfh');
  const groupB    = mkOedema && mkWasting;

  // Group C: Oedema +/++ OR severe wasting WITH danger signs
  const cWasting  = g('adm-c-oedema-1or2') || g('adm-c-muac1') || g('adm-c-muac2') || g('adm-c-muac3') || g('adm-c-wfh');
  const cDanger   = g('adm-ds-anorexia') || g('adm-ds-vomit') || g('adm-ds-convulsions') ||
                    g('adm-ds-lethargy') || g('adm-ds-uncon') || g('adm-ds-nodrink') || g('adm-ds-fever');
  const groupC    = cWasting && cDanger;

  // Group D: Medical complications
  const groupD = g('adm-mc-hypogly') || g('adm-mc-hypotherm') || g('adm-mc-infection') ||
                 g('adm-mc-dehydration') || g('adm-mc-shock') || g('adm-mc-anaemia') ||
                 g('adm-mc-cardiac') || g('adm-mc-dermato') || g('adm-mc-vitA') ||
                 g('adm-mc-diarrhoea') || g('adm-mc-malaria');

  // Group E: OTP referrals
  const groupE = g('adm-otp-deterioration') || g('adm-otp-oedema') || g('adm-otp-wtloss') || g('adm-otp-noresp');

  const admit = groupA || groupB || groupC || groupD || groupE;

  const el = document.getElementById('adm-result');
  if (!el) return;
  el.style.display = '';

  let reasons = [];
  if (groupA) reasons.push('Bilateral pitting oedema <strong>+++</strong> — immediate inpatient admission');
  if (groupB) reasons.push('Marasmic kwashiorkor — oedema + severe wasting');
  if (groupC) {
    const ds = [];
    if (g('adm-ds-anorexia'))   ds.push('anorexia');
    if (g('adm-ds-vomit'))      ds.push('intractable vomiting');
    if (g('adm-ds-convulsions'))ds.push('convulsions');
    if (g('adm-ds-lethargy'))   ds.push('lethargy');
    if (g('adm-ds-uncon'))      ds.push('unconsciousness');
    if (g('adm-ds-nodrink'))    ds.push('inability to drink/breastfeed');
    if (g('adm-ds-fever'))      ds.push('high fever');
    reasons.push('Oedema/wasting with danger sign(s): ' + ds.join(', '));
  }
  if (groupD) {
    const mc = [];
    if (g('adm-mc-hypogly'))     mc.push('hypoglycaemia');
    if (g('adm-mc-hypotherm'))   mc.push('hypothermia');
    if (g('adm-mc-infection'))   mc.push('infection');
    if (g('adm-mc-dehydration')) mc.push('severe dehydration');
    if (g('adm-mc-shock'))       mc.push('shock');
    if (g('adm-mc-anaemia'))     mc.push('very severe anaemia');
    if (g('adm-mc-cardiac'))     mc.push('cardiac failure');
    if (g('adm-mc-dermato'))     mc.push('severe dermatosis');
    if (g('adm-mc-vitA'))        mc.push('vitamin A deficiency signs');
    if (g('adm-mc-diarrhoea'))   mc.push('diarrhoea with dehydration');
    if (g('adm-mc-malaria'))     mc.push('severe malaria');
    reasons.push('Medical complication(s): ' + mc.join(', '));
  }
  if (groupE) {
    const otp = [];
    if (g('adm-otp-deterioration')) otp.push('clinical deterioration');
    if (g('adm-otp-oedema'))        otp.push('increasing oedema');
    if (g('adm-otp-wtloss'))        otp.push('weight loss / static weight');
    if (g('adm-otp-noresp'))        otp.push('no response after 12 weeks OTP');
    reasons.push('OTP referral: ' + otp.join(', '));
  }

  if (admit) {
    el.style.background = 'rgba(251,113,133,0.12)';
    el.style.border     = '1px solid rgba(251,113,133,0.4)';
    el.innerHTML = `
      <div style="font-family:var(--cond);font-size:18px;font-weight:800;color:var(--red);letter-spacing:2px;margin-bottom:10px">
        INPATIENT ADMISSION INDICATED
      </div>
      <div style="font-family:var(--mono);font-size:11px;color:var(--text);text-align:left;max-width:560px;margin:0 auto">
        ${reasons.map(r=>`<div style="padding:4px 0;border-bottom:1px dotted rgba(255,255,255,.08)">• ${r}</div>`).join('')}
      </div>
      <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:12px">
         Refer to inpatient therapeutic care. Stabilisation phase (F-75) applies. Always confirm with clinical team.
      </div>`;
    // Sync into inline results panel
    const inline = document.getElementById('adm-result-inline');
    if (inline) inline.innerHTML = `<div style="color:var(--red);font-weight:700;font-size:13px">INPATIENT ADMISSION INDICATED</div><div style="margin-top:6px;line-height:1.8">${reasons.map(r=>`• ${r}`).join('<br>')}</div>`;
  } else {
    const anyTicked = document.querySelectorAll('#uc-admission-section input[type=checkbox]:checked').length > 0;
    el.style.background = anyTicked ? 'rgba(52,211,153,0.08)' : 'rgba(56,100,168,0.08)';
    el.style.border     = anyTicked ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(56,100,168,0.25)';
    el.innerHTML = anyTicked
      ? `<div style="font-family:var(--cond);font-size:16px;font-weight:700;color:var(--green);letter-spacing:2px;margin-bottom:8px">
           ✓ No Inpatient Admission Criteria Met
         </div>
         <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">
           Based on criteria ticked. Continue outpatient / OTP management if SAM diagnosed. Reassess if clinical condition changes.
         </div>`
      : `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">
           Tick the criteria present above to assess admission eligibility.
         </div>`;
  }
}

function admReset() {
  document.querySelectorAll('#uc-admission-section input[type=checkbox]').forEach(cb => cb.checked = false);
  const el = document.getElementById('adm-result');
  if (el) el.style.display = 'none';
}


// ════════════════════════════════════════════════════════════════
// PEDIATRIC SAFETY ENGINE
// Validates inputs, enforces age routing & growth model selection,
// blocks invalid combinations, returns SAM status + clinical alerts.
// Called by calcUnified() before any calculation proceeds.
// ════════════════════════════════════════════════════════════════


/**
 * Syncs requirements into TPN, Recall, and Meal Planner from a given source.
 * Called automatically after any calc completes. Can also be called manually.
 * @param {string} sourceKey — 'adult' | 'pedi'
 */
function syncAllModulesFromSource(sourceKey) {
  const data = CALC_SOURCES[sourceKey]?.get();
  if (!data || !data.energy) return;
  // Store in global for all consumers
  if (sourceKey === 'pedi') lastPediCalcData = data;
  else if (sourceKey === 'adult') lastCalcData = data;
}
// ║  CONDITION ENGINE · DIAGNOSIS ENGINE · VISUAL ENGINE        ║
// ║  WHO/CMAM/ASPEN compliant · Chart.js powered               ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Chart instance registry (to destroy before redraw) ───────────
const _chartRegistry = {};
function _destroyChart(id) {
  if (_chartRegistry[id]) { try { _chartRegistry[id].destroy(); } catch(e){} delete _chartRegistry[id]; }
}
function _registerChart(id, chart) { _chartRegistry[id] = chart; }

// ── Shared chart defaults ────────────────────────────────────────
const _CHART_DEFAULTS = {
  font: { family: "'JetBrains Mono', monospace", size: 10 },
  color: 'rgba(196,220,255,0.7)',
  grid: 'rgba(56,100,168,0.18)',
};

// ══════════════════════════════════════════════════════════════
// CONDITION ENGINE
// Age-adaptive: evaluates malnutrition, growth failure,
// clinical risks — returns structured { diagnoses, risks }
// ══════════════════════════════════════════════════════════════
const ConditionEngine = {

  evaluate(patient, growth) {
    const { ageMo, sex, muacMm, oedema, weightKg, heightCm,
            bwtG, wtLossPct, meals, fgroups, bf, status } = patient;
    const { wazZ, hazZ, whzZ, wlzZ, bmiazZ, acfaZ, velGKgDay, fenWtP } = growth;

    const diagnoses = [];  // confirmed clinical diagnoses
    const risks     = [];  // clinical risk flags

    // ── Malnutrition classification (WHO CMAM core) ──────────────
    const whz = whzZ ?? wlzZ;

    if (oedema) {
      diagnoses.push({ code:'SAM_OED', label:'Oedematous SAM (Kwashiorkor)', severity:'critical',
        detail:'Bilateral pitting oedema → SAM regardless of MUAC or WHZ. Inpatient admission required.' });
    } else if (muacMm != null && ageMo >= 6) {
      const { sam, mam } = this._muacThresholds(ageMo);
      if (sam && muacMm < sam) {
        diagnoses.push({ code:'SAM_MUAC', label:'Severe Acute Malnutrition (MUAC)', severity:'critical',
          detail:`MUAC ${muacMm} mm < ${sam} mm threshold.` });
      } else if (mam && muacMm >= sam && muacMm < mam) {
        diagnoses.push({ code:'MAM_MUAC', label:'Moderate Acute Malnutrition (MUAC)', severity:'high',
          detail:`MUAC ${muacMm} mm in MAM range (${sam}–${mam-1} mm).` });
      }
    }

    if (whz != null && !diagnoses.some(d=>d.code.startsWith('SAM'))) {
      if (whz < -3) diagnoses.push({ code:'SAM_WHZ', label:'Severe Acute Malnutrition (Wasting)', severity:'critical',
        detail:`WHZ/WLZ ${whz.toFixed(2)} < −3 SD.` });
      else if (whz < -2 && !diagnoses.some(d=>d.code.startsWith('MAM'))) {
        diagnoses.push({ code:'MAM_WHZ', label:'Moderate Acute Malnutrition (Wasting)', severity:'high',
          detail:`WHZ/WLZ ${whz.toFixed(2)} in −3 to −2 SD range.` });
      }
    }

    // ── Stunting ─────────────────────────────────────────────────
    if (hazZ != null) {
      if (hazZ < -3) diagnoses.push({ code:'SEVERE_STUNT', label:'Severe Stunting', severity:'high',
        detail:`HAZ/LAZ ${hazZ.toFixed(2)} < −3 SD. Chronic undernutrition.` });
      else if (hazZ < -2) diagnoses.push({ code:'MOD_STUNT', label:'Moderate Stunting', severity:'medium',
        detail:`HAZ/LAZ ${hazZ.toFixed(2)} < −2 SD.` });
    }

    // ── Underweight ───────────────────────────────────────────────
    if (wazZ != null) {
      if (wazZ < -3) diagnoses.push({ code:'SEVERE_UW', label:'Severe Underweight', severity:'high',
        detail:`WAZ ${wazZ.toFixed(2)} < −3 SD.` });
      else if (wazZ < -2) diagnoses.push({ code:'MOD_UW', label:'Moderate Underweight', severity:'medium',
        detail:`WAZ ${wazZ.toFixed(2)} < −2 SD.` });
    }

    // ── Overweight / Obesity ──────────────────────────────────────
    if (bmiazZ != null) {
      if (bmiazZ > 2)  diagnoses.push({ code:'OBESE',      label:'Obesity',            severity:'medium', detail:`BMI-for-age z ${bmiazZ.toFixed(2)} > +2 SD.` });
      else if (bmiazZ > 1) diagnoses.push({ code:'OVERWT', label:'At risk of overweight', severity:'low', detail:`BMI-for-age z ${bmiazZ.toFixed(2)} > +1 SD.` });
    }

    // ── Preterm-specific ──────────────────────────────────────────
    if (ageMo < 3 && fenWtP != null) {
      if (fenWtP < 10) {
        diagnoses.push({ code:'SGA', label:'Small for Gestational Age (SGA)', severity:'high',
          detail:`Weight-for-GA < 10th percentile (Fenton 2013).` });
        if (hazZ != null && hazZ < -2) {
          diagnoses.push({ code:'EUGR', label:'Extrauterine Growth Restriction (EUGR)', severity:'high',
            detail:'Linear growth failure in the ex-utero period. Increase energy and protein targets.' });
        }
      } else if (fenWtP > 90) {
        diagnoses.push({ code:'LGA', label:'Large for Gestational Age (LGA)', severity:'low',
          detail:'Weight-for-GA > 90th percentile. Monitor for hypoglycaemia.' });
      } else {
        diagnoses.push({ code:'AGA', label:'Appropriate for Gestational Age (AGA)', severity:'ok',
          detail:'Weight-for-GA between 10th and 90th percentile (Fenton 2013).' });
      }
      if (velGKgDay != null && velGKgDay < 10) {
        risks.push({ code:'POOR_VEL', label:'Inadequate weight gain velocity', severity:'high',
          detail:`${velGKgDay} g/kg/day < 10 g/kg/day minimum. Review energy and protein intake.` });
      }
    }

    // ── Neonate-specific ─────────────────────────────────────────
    if (ageMo < 1 && wtLossPct != null) {
      if (wtLossPct > 10) {
        diagnoses.push({ code:'EXCESS_WTLOSS', label:'Excessive Neonatal Weight Loss', severity:'critical',
          detail:`${wtLossPct.toFixed(1)}% weight loss > 10% threshold. Urgent feeding assessment.` });
        risks.push({ code:'HYPOGLY_RISK', label:'Hypoglycaemia risk', severity:'high',
          detail:'Excessive weight loss associated with hypoglycaemia. Monitor glucose q2–3h.' });
        risks.push({ code:'BF_FAIL', label:'Risk of breastfeeding failure', severity:'high',
          detail:'>10% weight loss suggests inadequate milk intake. Lactation support required.' });
      } else if (wtLossPct > 7) {
        risks.push({ code:'WTLOSS_WATCH', label:'Weight loss approaching threshold', severity:'medium',
          detail:`${wtLossPct.toFixed(1)}% — monitor closely. Reassess in 24h.` });
      }
    }

    // ── Infant-specific ──────────────────────────────────────────
    if (ageMo >= 1 && ageMo < 6) {
      if (wazZ != null && hazZ != null && wazZ < -2 && hazZ < -2) {
        diagnoses.push({ code:'FTT', label:'Failure to Thrive (FTT)', severity:'high',
          detail:'Both WAZ and LAZ < −2 SD. Comprehensive nutritional assessment required.' });
      }
      if (bwtG && weightKg && weightKg < bwtG/1000 * 1.5 && ageMo > 2) {
        risks.push({ code:'POOR_GROWTH', label:'Suboptimal growth since birth', severity:'medium',
          detail:'Expected to double birth weight by ~5 months.' });
      }
    }

    // ── Complementary feeding (6–24m) ────────────────────────────
    if (ageMo >= 6 && ageMo < 24) {
      const madMet = bf ? (meals >= 2 && fgroups >= 4) : (meals >= 3 && fgroups >= 4);
      if (!madMet) {
        diagnoses.push({ code:'INAD_FEED', label:'Inadequate Complementary Feeding', severity:'medium',
          detail:`Minimum Acceptable Diet not met. Meals/day: ${meals??'?'}, Food groups: ${fgroups??'?'}.` });
      }
      if (fgroups != null && fgroups < 3) {
        risks.push({ code:'MDD_FAIL', label:'Minimum Dietary Diversity not met', severity:'medium',
          detail:'< 4 food groups. Risk of micronutrient deficiencies (iron, zinc, vitamin A).' });
      }
      risks.push({ code:'IRON_RISK', label:'Iron deficiency risk', severity:'low',
        detail:'Introduce iron-rich foods at every meal. Supplement if diet inadequate.' });
    }

    // ── Older children / adolescent ──────────────────────────────
    if (ageMo >= 60) {
      if (diagnoses.some(d => d.code.startsWith('SAM'))) {
        risks.push({ code:'HIGH_MORT', label:'Elevated mortality risk', severity:'critical',
          detail:'SAM in school-age children carries high mortality without treatment.' });
      }
      if (bmiazZ != null && bmiazZ < -2) {
        risks.push({ code:'POOR_DIET', label:'Poor diet quality likely', severity:'medium',
          detail:'BMI-for-age < −2 SD. Review dietary intake and social determinants.' });
      }
    }

    // ── Adolescent-specific ───────────────────────────────────────
    if (ageMo >= 120) {
      if (sex === 'female' && wazZ != null && wazZ < -1) {
        risks.push({ code:'IRON_DEF_GIRL', label:'Iron deficiency risk (female)', severity:'medium',
          detail:'Low weight + female sex → screen for iron deficiency anaemia.' });
      }
      if (bmiazZ != null && bmiazZ < -3) {
        risks.push({ code:'EATING_SCREEN', label:'Consider eating disorder screening', severity:'medium',
          detail:'Severe thinness in adolescent — consider psychosocial assessment.' });
      }
    }

    return { diagnoses, risks };
  },

  _muacThresholds(ageMo) {
    if (ageMo < 6)   return { sam: null, mam: null };
    if (ageMo < 60)  return { sam: 115, mam: 125 };
    if (ageMo < 120) return { sam: 130, mam: 140 };
    return               { sam: 160, mam: 170 };
  },
};


// ══════════════════════════════════════════════════════════════
// DIAGNOSIS ENGINE
// Wraps ConditionEngine, produces prioritised clinical output
// with action codes and risk level
// ══════════════════════════════════════════════════════════════
const DiagnosisEngine = {

  classify(patient, growth) {
    const { diagnoses, risks } = ConditionEngine.evaluate(patient, growth);

    // Priority order: SAM > MAM > FTT > Stunting > Underweight > Normal
    const isSAM = diagnoses.some(d => d.code.startsWith('SAM'));
    const isMAM = !isSAM && diagnoses.some(d => d.code.startsWith('MAM'));
    const isFTT = diagnoses.some(d => d.code === 'FTT');
    const criticalRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high');

    const riskLevel = isSAM || diagnoses.some(d=>d.code==='EXCESS_WTLOSS') ? 'critical'
      : isMAM || isFTT || criticalRisks.length ? 'high'
      : diagnoses.length ? 'moderate'
      : 'low';

    // Primary action
    const action = isSAM
      ? { label:'ADMIT — START SAM PROTOCOL', color:'var(--red)', bg:'rgba(251,113,133,0.15)' }
      : isMAM
      ? { label:'SUPPLEMENTARY FEEDING (MAM)', color:'var(--amber)', bg:'rgba(240,180,41,0.12)' }
      : diagnoses.some(d=>d.code==='EXCESS_WTLOSS')
      ? { label:'URGENT FEEDING ASSESSMENT', color:'var(--red)', bg:'rgba(251,113,133,0.12)' }
      : diagnoses.some(d=>d.code==='FTT')
      ? { label:'NUTRITIONAL REHABILITATION', color:'var(--amber)', bg:'rgba(240,180,41,0.1)' }
      : diagnoses.length
      ? { label:'MONITORING & SUPPORT', color:'var(--blue)', bg:'rgba(96,165,250,0.1)' }
      : { label:'ROUTINE CARE', color:'var(--green)', bg:'rgba(52,211,153,0.1)' };

    return { diagnoses, risks, riskLevel, action };
  },
};


// ══════════════════════════════════════════════════════════════
// VISUAL ENGINE — Chart rendering
// All functions return the HTML container (canvas wrapper)
// and register charts via _registerChart for cleanup
// ══════════════════════════════════════════════════════════════
const VisualEngine = {

  // ── Render the diagnosis summary card ───────────────────────
  renderDiagnosisCard(result) {
    const { diagnoses, risks, riskLevel, action } = result;
    if (!diagnoses.length && !risks.length) {
      return `<div style="padding:12px 16px;border-radius:10px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.35);margin-bottom:14px;font-family:var(--mono);font-size:11px;color:var(--green)">
         <strong>No malnutrition or growth concerns detected.</strong> Routine monitoring recommended.
      </div>`;
    }

    const severityIcon = { critical:'', high:'', medium:'', low:'ℹ', ok:'' };
    const severityColor = { critical:'var(--red)', high:'var(--amber)', medium:'var(--blue)', low:'var(--text-dim)', ok:'var(--green)' };

    const diagHtml = diagnoses.map(d => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px dotted rgba(56,100,168,0.15)">
        <span style="flex-shrink:0;font-size:13px">${severityIcon[d.severity]||'•'}</span>
        <div>
          <div style="font-family:var(--cond);font-size:11px;font-weight:700;color:${severityColor[d.severity]||'var(--text)'};">${d.label}</div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:2px">${d.detail}</div>
        </div>
      </div>`).join('');

    const riskHtml = risks.length ? `
      <div style="margin-top:10px;font-family:var(--cond);font-size:9px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px">Clinical Risks</div>
      ${risks.map(r => `<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px dotted rgba(56,100,168,0.1)">
        <span style="flex-shrink:0;font-size:11px">${severityIcon[r.severity]||'•'}</span>
        <div>
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:${severityColor[r.severity]||'var(--text)'};">${r.label}</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">${r.detail}</div>
        </div>
      </div>`).join('')}` : '';

    return `<div style="padding:14px 16px;border-radius:12px;background:${action.bg};border:2px solid ${action.color}44;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px">
        <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--text-dim)">CLINICAL ASSESSMENT</div>
        <div style="font-family:var(--mono);font-size:10px;font-weight:700;padding:4px 12px;border-radius:6px;background:${action.color}20;color:${action.color}">${action.label}</div>
      </div>
      <div style="font-family:var(--cond);font-size:9px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px">Diagnoses</div>
      ${diagHtml}
      ${riskHtml}
    </div>`;
  },

  // ── Z-score visual bar (−5 to +5 scale) ─────────────────────
  renderZBar(z, label) {
    if (z === null || z === undefined || isNaN(z)) return '';
    const clamped = Math.max(-5, Math.min(5, z));
    const pct     = ((clamped + 5) / 10 * 100).toFixed(1);
    const color   = z < -3 ? '#fb7185' : z < -2 ? '#f0b429' : z < -1 ? '#60a5fa' : z < 2 ? '#34d399' : '#f0b429';
    const sign    = z >= 0 ? '+' : '';
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-bottom:4px">
        <span>${label}</span>
        <span style="color:${color};font-weight:700">${sign}${z.toFixed(2)} SD</span>
      </div>
      <div style="position:relative;height:8px;border-radius:4px;background:rgba(56,100,168,0.2);overflow:visible">
        <!-- Zone bands -->
        <div style="position:absolute;left:0%;width:20%;height:100%;background:rgba(251,113,133,0.25);border-radius:4px 0 0 4px"></div>
        <div style="position:absolute;left:20%;width:10%;height:100%;background:rgba(240,180,41,0.2)"></div>
        <div style="position:absolute;left:30%;width:40%;height:100%;background:rgba(52,211,153,0.15)"></div>
        <div style="position:absolute;left:70%;width:10%;height:100%;background:rgba(240,180,41,0.2)"></div>
        <div style="position:absolute;left:80%;width:20%;height:100%;background:rgba(251,113,133,0.25);border-radius:0 4px 4px 0"></div>
        <!-- Patient marker -->
        <div style="position:absolute;top:-3px;width:14px;height:14px;border-radius:50%;
          background:${color};border:2px solid var(--bg);box-shadow:0 0 8px ${color}88;
          left:calc(${pct}% - 7px);transition:left .4s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">
        <span>−5</span><span>−3</span><span>−2</span><span>0</span><span>+2</span><span>+3</span><span>+5</span>
      </div>
    </div>`;
  },

  // ── Multi Z-score panel ──────────────────────────────────────
  renderZScorePanel(zScores) {
    const entries = Object.entries(zScores).filter(([,v]) => v !== null && v !== undefined);
    if (!entries.length) return '';
    const bars = entries.map(([label, z]) => this.renderZBar(z, label)).join('');
    return `<div style="padding:14px 16px;border-radius:10px;background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);margin-bottom:14px">
      <div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:var(--teal);margin-bottom:12px;text-transform:uppercase">Z-Score Indicators</div>
      ${bars}
      <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:8px;display:flex;gap:12px;flex-wrap:wrap">
        <span><span style="color:#fb7185">■</span> &lt;−3 Severe</span>
        <span><span style="color:#f0b429">■</span> −3 to −2 Moderate</span>
        <span><span style="color:#34d399">■</span> −2 to +2 Normal</span>
        <span><span style="color:#f0b429">■</span> &gt;+2 Above normal</span>
      </div>
    </div>`;
  },

  // ── Nutrition doughnut (Energy · Protein · Fluids) ──────────
  renderNutritionDonut(canvasId, { energyKcal, proteinG, carbG, fatG }) {
    _destroyChart(canvasId);
    const protKcal = proteinG * 4;
    const carbKcal = carbG ? carbG * 4 : 0;
    const fatKcal  = fatG  ? fatG  * 9 : energyKcal - protKcal - carbKcal;
    const html = `<div style="position:relative;width:160px;height:160px;margin:0 auto"><canvas id="${canvasId}" width="160" height="160"></canvas></div>`;
    setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const chart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Carbohydrate', 'Fat', 'Protein'],
          datasets: [{
            data: [Math.max(0,carbKcal), Math.max(0,fatKcal), Math.max(0,protKcal)],
            backgroundColor: ['rgba(96,165,250,0.8)','rgba(240,180,41,0.8)','rgba(52,211,153,0.8)'],
            borderColor: ['#60a5fa','#f0b429','#34d399'],
            borderWidth: 1.5,
          }]
        },
        options: {
          responsive: false,
          cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.label}: ${ctx.raw.toFixed(0)} kcal (${(ctx.raw/energyKcal*100).toFixed(0)}%)`
              }
            }
          }
        }
      });
      _registerChart(canvasId, chart);
    }, 60);
    return html;
  },

  // ── WHO growth chart (weight-for-age or BMI-for-age) ─────────
  renderWHOGrowthChart(canvasId, { sex, ageMo, measureValue, tableKey, yLabel, indicator }) {
    _destroyChart(canvasId);

    // Get reference data from WHO_LMS
    const tableRef = (typeof WHO_LMS !== 'undefined') ? WHO_LMS[tableKey] : null;
    if (!tableRef || !tableRef.length) {
      return `<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);padding:10px">WHO reference data not available for this indicator.</div>`;
    }

    // Build percentile curves from LMS data: 3rd(−2SD), 15th(−1SD), 50th, 85th(+1SD), 97th(+2SD)
    const zToValue = (lms, z) => {
      const { L, M, S } = lms;
      if (L === 0) return M * Math.exp(S * z);
      return M * Math.pow(1 + L * S * z, 1/L);
    };

    const labels = tableRef.map(r => r[0]);
    const p3   = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]}, -2).toFixed(2)));
    const p15  = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]}, -1).toFixed(2)));
    const p50  = tableRef.map(r => parseFloat(r[2].toFixed(2)));
    const p85  = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]}, +1).toFixed(2)));
    const p97  = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]}, +2).toFixed(2)));

    const html = `<div style="position:relative;width:100%;height:220px"><canvas id="${canvasId}"></canvas></div>`;

    setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const ptDatasets = ageMo != null && measureValue != null ? [{
        label: 'Patient',
        data: [{ x: ageMo, y: measureValue }],
        type: 'scatter',
        pointBackgroundColor: '#1de9d4',
        pointBorderColor: '#fff',
        pointRadius: 7,
        pointHoverRadius: 9,
        order: 0,
      }] : [];

      const chart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            ...ptDatasets,
            { label:'-2 SD (Z=-2)', data:p3,  borderColor:'rgba(251,113,133,0.8)', borderWidth:1.5, borderDash:[4,3], fill:false, pointRadius:0, tension:0.3 },
            { label:'-1 SD',        data:p15, borderColor:'rgba(240,180,41,0.5)',  borderWidth:1,   borderDash:[2,3], fill:false, pointRadius:0, tension:0.3 },
            { label:'Median',       data:p50, borderColor:'rgba(52,211,153,0.9)',  borderWidth:2,   fill:false, pointRadius:0, tension:0.3 },
            { label:'+1 SD',        data:p85, borderColor:'rgba(240,180,41,0.5)',  borderWidth:1,   borderDash:[2,3], fill:false, pointRadius:0, tension:0.3 },
            { label:'+2 SD',        data:p97, borderColor:'rgba(251,113,133,0.8)', borderWidth:1.5, borderDash:[4,3], fill:false, pointRadius:0, tension:0.3 },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 400 },
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { color:'rgba(196,220,255,0.7)', font:{ size:9, family:"'JetBrains Mono',monospace" }, padding:10, boxWidth:14 }
            },
            tooltip: { mode:'nearest', intersect:false }
          },
          scales: {
            x: {
              title: { display:true, text: indicator === 'waz' || indicator === 'haz' ? 'Age (months)' : 'Age (months)', color:'rgba(196,220,255,0.6)', font:{size:9} },
              ticks: { color:'rgba(196,220,255,0.55)', font:{size:8} },
              grid:  { color:'rgba(56,100,168,0.15)' }
            },
            y: {
              title: { display:true, text: yLabel, color:'rgba(196,220,255,0.6)', font:{size:9} },
              ticks: { color:'rgba(196,220,255,0.55)', font:{size:8} },
              grid:  { color:'rgba(56,100,168,0.15)' }
            }
          }
        }
      });
      _registerChart(canvasId, chart);
    }, 80);

    return html;
  },

  // ── Fenton growth chart (preterm, weight-for-GA) ─────────────
  renderFentonChart(canvasId, { sex, gaDec, wtG }) {
    _destroyChart(canvasId);
    const tableRef = (typeof FENTON_LMS !== 'undefined') ? FENTON_LMS[sex]?.weight : null;
    if (!tableRef) return `<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);padding:10px">Fenton data unavailable.</div>`;

    const zToValue = (lms, z) => { const {L,M,S} = lms; return L===0 ? M*Math.exp(S*z) : M*Math.pow(1+L*S*z,1/L); };
    const labels = tableRef.map(r => r[0]);
    const p3  = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]},-2).toFixed(0)));
    const p50 = tableRef.map(r => parseFloat(r[2].toFixed(0)));
    const p90 = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]},+1.28).toFixed(0)));
    const p97 = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]},+2).toFixed(0)));

    const html = `<div style="position:relative;width:100%;height:220px"><canvas id="${canvasId}"></canvas></div>`;
    setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ptData = gaDec && wtG ? [{ x: gaDec, y: wtG }] : [];
      const chart = new Chart(canvas.getContext('2d'), {
        type:'line',
        data:{
          labels,
          datasets:[
            ptData.length ? { label:'Patient', data:ptData, type:'scatter', pointBackgroundColor:'#1de9d4', pointBorderColor:'#fff', pointRadius:7, order:0 } : null,
            { label:'3rd  %ile (−2SD)', data:p3,  borderColor:'rgba(251,113,133,0.9)', borderWidth:1.5, borderDash:[4,3], fill:false, pointRadius:0, tension:0.3 },
            { label:'50th %ile', data:p50, borderColor:'rgba(52,211,153,0.9)', borderWidth:2, fill:false, pointRadius:0, tension:0.3 },
            { label:'90th %ile', data:p90, borderColor:'rgba(96,165,250,0.7)',  borderWidth:1.5, borderDash:[3,2], fill:false, pointRadius:0, tension:0.3 },
            { label:'97th %ile', data:p97, borderColor:'rgba(240,180,41,0.8)',  borderWidth:1.5, borderDash:[4,3], fill:false, pointRadius:0, tension:0.3 },
          ].filter(Boolean)
        },
        options:{
          responsive:true, maintainAspectRatio:false, animation:{duration:400},
          plugins:{
            legend:{ display:true, position:'bottom', labels:{ color:'rgba(196,220,255,0.7)', font:{size:9,family:"'JetBrains Mono',monospace"}, padding:8, boxWidth:12 } },
          },
          scales:{
            x:{ title:{display:true,text:'Gestational Age (weeks)',color:'rgba(196,220,255,0.6)',font:{size:9}}, ticks:{color:'rgba(196,220,255,0.55)',font:{size:8}}, grid:{color:'rgba(56,100,168,0.15)'} },
            y:{ title:{display:true,text:'Weight (g)',color:'rgba(196,220,255,0.6)',font:{size:9}}, ticks:{color:'rgba(196,220,255,0.55)',font:{size:8}}, grid:{color:'rgba(56,100,168,0.15)'} }
          }
        }
      });
      _registerChart(canvasId, chart);
    }, 80);
    return html;
  },

  // ── SAM risk traffic-light indicator ─────────────────────────
  renderRiskGauge(riskLevel) {
    const cfg = {
      critical: { label:'CRITICAL', color:'#fb7185', fill:4, icon:'' },
      high:     { label:'HIGH',     color:'#f0b429', fill:3, icon:'' },
      moderate: { label:'MODERATE', color:'#60a5fa', fill:2, icon:'' },
      low:      { label:'LOW',      color:'#34d399', fill:1, icon:'' },
    }[riskLevel] || { label:'UNKNOWN', color:'var(--text-dim)', fill:0, icon:'?' };

    const dots = [1,2,3,4].map(n =>
      `<div style="width:18px;height:18px;border-radius:50%;background:${n<=cfg.fill?cfg.color:'rgba(56,100,168,0.25)'};
      ${n<=cfg.fill?`box-shadow:0 0 8px ${cfg.color}66`:''};transition:all .3s"></div>`
    ).join('');

    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;
      background:${cfg.color}12;border:1px solid ${cfg.color}44;margin-bottom:14px">
      <span style="font-size:18px">${cfg.icon}</span>
      <div>
        <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:${cfg.color}">RISK LEVEL: ${cfg.label}</div>
      </div>
      <div style="display:flex;gap:5px;margin-left:auto">${dots}</div>
    </div>`;
  },

  // ── MUAC progress bar ─────────────────────────────────────────
  renderMuacBar(muacMm, ageMo) {
    if (!muacMm) return '';
    const { sam, mam } = ConditionEngine._muacThresholds(ageMo);
    if (!sam) return '';
    const normal = mam + 20;
    const max    = normal + 20;
    const pct    = Math.min(100, Math.max(0, (muacMm - sam + 20) / (max - sam + 20) * 100));
    const color  = muacMm < sam ? '#fb7185' : muacMm < mam ? '#f0b429' : '#34d399';
    const label  = muacMm < sam ? `SAM (<${sam}mm)` : muacMm < mam ? `MAM (${sam}–${mam-1}mm)` : `Normal (≥${mam}mm)`;

    return `<div style="margin-top:8px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9.5px;margin-bottom:5px">
        <span style="color:var(--text-dim)">MUAC</span>
        <span style="color:${color};font-weight:700">${muacMm} mm — ${label}</span>
      </div>
      <div style="position:relative;height:12px;border-radius:6px;overflow:hidden;background:rgba(56,100,168,0.2)">
        <div style="position:absolute;left:0;width:${(20/(max-sam+20)*100).toFixed(1)}%;height:100%;background:rgba(251,113,133,0.45)"></div>
        <div style="position:absolute;left:${(20/(max-sam+20)*100).toFixed(1)}%;width:${((mam-sam)/(max-sam+20)*100).toFixed(1)}%;height:100%;background:rgba(240,180,41,0.4)"></div>
        <div style="position:absolute;left:${((mam-sam+20)/(max-sam+20)*100).toFixed(1)}%;right:0;height:100%;background:rgba(52,211,153,0.35)"></div>
        <div style="position:absolute;top:1px;width:10px;height:10px;border-radius:50%;background:${color};border:1.5px solid #fff;box-shadow:0 0 6px ${color};left:calc(${pct.toFixed(1)}% - 5px)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">
        <span>SAM &lt;${sam}</span><span>MAM ${sam}–${mam-1}</span><span>Normal ≥${mam}</span>
      </div>
    </div>`;
  },

  // ── Feeding plan progress bar ─────────────────────────────────
  renderFeedingProgress(actual, target, label, unit) {
    const pct = Math.min(100, actual / target * 100);
    const color = pct < 60 ? '#fb7185' : pct < 90 ? '#f0b429' : '#34d399';
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-bottom:4px">
        <span>${label}</span>
        <span style="color:${color};font-weight:700">${actual} / ${target} ${unit} (${pct.toFixed(0)}%)</span>
      </div>
      <div style="height:10px;border-radius:5px;background:rgba(56,100,168,0.2);overflow:hidden">
        <div style="height:100%;width:${pct.toFixed(1)}%;background:${color};border-radius:5px;transition:width .4s ease;
          box-shadow:0 0 8px ${color}44"></div>
      </div>
    </div>`;
  },
};



// ╔══════════════════════════════════════════════════════════════╗
// ║  CLINICAL SAMPLE CASES — 7 Population Groups               ║
// ║  Realistic but fictional patients for demonstration         ║
// ╚══════════════════════════════════════════════════════════════╝







// ══════════════════════════════════════════════════════════════
// UCT EXCHANGE LIST REFERENCE — searchable table renderer
// ══════════════════════════════════════════════════════════════
let _uctRefRendered = false;

function toggleExchangeRef() {
  const ref = document.getElementById('exchange-ref');
  if (!ref) return;
  const show = ref.style.display === 'none' || !ref.style.display;
  ref.style.display = show ? '' : 'none';
  if (show && !_uctRefRendered) { renderUctRef(UCT_EXCHANGE_DB); _uctRefRendered = true; }
}

function renderUctRef(foods) {
  const tbl = document.getElementById('uct-ref-table');
  if (!tbl) return;
  const cnt = document.getElementById('uct-ref-count');
  if (cnt) cnt.textContent = foods.length + ' foods · UCT Division of Human Nutrition 2014';

  const rows = foods.map(f => {
    const col = UCT_TYPE_COLORS[f.exchange_type] || 'var(--text-dim)';
    const lbl = UCT_TYPE_LABELS[f.exchange_type] || f.exchange_type;
    const m   = UCT_MACROS[f.exchange_type] || f;
    const kcal= f.kcal[0] ?? (m.kcal||'—');
    const cho = f.cho[0]  ?? (m.cho||'—');
    const pro = f.pro[0]  ?? (m.pro||'—');
    const fat = f.fat[0]  ?? (m.fat||'—');
    const noteHtml = f.note ? `<div style="font-size:8.5px;color:var(--text-dim);margin-top:2px">${f.note}</div>` : '';
    return `<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">
      <td style="padding:6px 10px;font-family:var(--mono);font-size:10px;color:var(--text)">${f.name}${noteHtml}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:9px;font-weight:700;color:${col};white-space:nowrap">${lbl}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">${f.portions[0]}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:10px;color:var(--amber);text-align:right">${kcal}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:10px;color:var(--blue);text-align:right">${cho}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:10px;color:var(--green);text-align:right">${pro}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:10px;color:var(--red);text-align:right">${fat}</td>
    </tr>`;
  }).join('');

  tbl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:10px">
    <thead><tr style="border-bottom:2px solid rgba(56,100,168,0.3);background:rgba(8,18,36,0.8);position:sticky;top:0;z-index:1">
      <th style="padding:7px 10px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Food Item</th>
      <th style="padding:7px 8px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Exchange Type</th>
      <th style="padding:7px 8px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Household Measure</th>
      <th style="padding:7px 8px;text-align:right;color:var(--amber);font-family:var(--mono);font-size:9px">kcal</th>
      <th style="padding:7px 8px;text-align:right;color:var(--blue);font-family:var(--mono);font-size:9px">CHO g</th>
      <th style="padding:7px 8px;text-align:right;color:var(--green);font-family:var(--mono);font-size:9px">Pro g</th>
      <th style="padding:7px 8px;text-align:right;color:var(--red);font-family:var(--mono);font-size:9px">Fat g</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function filterUctRef() {
  if (typeof UCT_EXCHANGE_DB === 'undefined') return;
  const q   = (document.getElementById('uct-ref-search')?.value || '').toLowerCase();
  const cat = document.getElementById('uct-ref-cat')?.value || '';
  let foods = UCT_EXCHANGE_DB;
  if (cat) foods = foods.filter(f => f.exchange_type === cat);
  if (q)   foods = foods.filter(f => f.name.toLowerCase().includes(q) || f.portions[0].toLowerCase().includes(q));
  renderUctRef(foods);
}


// ══════════════════════════════════════════════════════════════════════
// LOW-RESOURCE & BLENDERIZED ENTERAL FEED MODULE
// Malawi Context · Edison Taimu · Oasis
// ══════════════════════════════════════════════════════════════════════

// ── Mode switcher ─────────────────────────────────────────────────────
function switchEnMode(mode) {
  const modes = ['commercial','lowres','blend'];
  modes.forEach(m => {
    const sec = document.getElementById('en-'+m+'-section');
    const btn = document.getElementById('enmode-btn-'+m);
    if (!sec || !btn) return;
    const active = (m === mode);
    sec.style.display = active ? '' : 'none';
    if (active) {
      btn.style.borderColor = 'rgba(29,233,212,0.6)';
      btn.style.background  = 'rgba(29,233,212,0.08)';
      btn.style.color       = 'var(--teal)';
    } else {
      btn.style.borderColor = 'var(--border)';
      btn.style.background  = 'transparent';
      btn.style.color       = 'var(--text-dim)';
    }
  });
}

// ── Sync LR panel from Calculator ────────────────────────────────────
function syncLRFromCalc(sourceKey) {
  const adult = CALC_SOURCES.adult.get();
  const pedi  = CALC_SOURCES.pedi.get();
  if (!sourceKey) {
    if (adult?.energy && pedi?.energy) { _showSyncPicker('lr-sync-status','syncLRFromCalc'); return; }
    sourceKey = adult?.energy ? 'adult' : pedi?.energy ? 'pedi' : null;
  }
  const d = sourceKey ? CALC_SOURCES[sourceKey]?.get() : getUniversalCalcData();
  const s = document.getElementById('lr-sync-status');
  if (!d || !d.energy) {
    if (s) s.innerHTML = '<span style="color:var(--amber)"> Run the calculator first, then sync</span>';
    return;
  }
  // Populate absolute targets
  const netKcal   = d.netEnergy || d.energy || 0;
  const propKcal  = d.propofol  || 0;
  const nonNutr   = Math.max(0, Math.round((d.energy || 0) - netKcal));
  const _sv = (id, v) => { const el = document.getElementById(id); if(el && v) el.value = Math.round(v); };
  _sv('lr-pt-kcal-abs',  netKcal);
  _sv('lr-pt-pro-abs',   d.protein  || 0);
  _sv('lr-pt-fluid-abs', d.fluid    || Math.round((parseFloat(d.weight)||0)*35) || '');
  const nn = document.getElementById('lr-pt-nonnutr');
  if (nn) nn.value = nonNutr > 0 ? nonNutr : 0;

  if (s) s.innerHTML = `<span style="color:var(--green)"> Synced from ${CALC_SOURCES[sourceKey]?.label||'Calculator'} — ${Math.round(netKcal)} kcal · ${Math.round(d.protein||0)} g protein/day</span>`;
  lrCalc();
  showToast(` Low-Resource panel synced from ${CALC_SOURCES[sourceKey]?.label||'Calculator'}`, 'success');
}

// ── Sync Blend panel from Calculator ─────────────────────────────────
function syncBlendFromCalc(sourceKey) {
  const adult = CALC_SOURCES.adult.get();
  const pedi  = CALC_SOURCES.pedi.get();
  if (!sourceKey) {
    if (adult?.energy && pedi?.energy) { _showSyncPicker('blend-sync-status','syncBlendFromCalc'); return; }
    sourceKey = adult?.energy ? 'adult' : pedi?.energy ? 'pedi' : null;
  }
  const d = sourceKey ? CALC_SOURCES[sourceKey]?.get() : getUniversalCalcData();
  const s = document.getElementById('blend-sync-status') || getElementById('blend-header-sync-status');
  if (!d || !d.energy) {
    if (s) s.innerHTML = '<span style="color:var(--amber)"> Run the calculator first, then sync</span>';
    return;
  }
  const netKcal  = d.netEnergy || d.energy || 0;
  const nonNutr  = Math.max(0, Math.round((d.energy || 0) - netKcal));
  const _sv = (id, v) => { const el = document.getElementById(id); if(el && v) el.value = Math.round(v); };
  _sv('blend-pt-kcal-abs',  netKcal);
  _sv('blend-pt-pro-abs',   d.protein || 0);
  _sv('blend-pt-fluid-abs', d.fluid   || Math.round((parseFloat(d.weight)||0)*35) || '');
  const nn = document.getElementById('blend-pt-nonnutr');
  if (nn) nn.value = nonNutr > 0 ? nonNutr : 0;

  if (s) s.innerHTML = `<span style="color:var(--green)"> Synced from ${CALC_SOURCES[sourceKey]?.label||'Calculator'} — ${Math.round(netKcal)} kcal · ${Math.round(d.protein||0)} g protein/day</span>`;
  blendCalc();
  showToast(` Blenderized panel synced from ${CALC_SOURCES[sourceKey]?.label||'Calculator'}`, 'success');
}

// ── Low-Resource Formula: Nutritional values per unit ─────────────────
// Values derived from MP_FOODS database (Malawi FCT)
// milk: per ml | likuni: per ml (maize-soy blend, estimated) | oil: per ml | sugar: per g
const LR_NUTR = {
  // Milk full cream: MP_FOODS.protein → 152 kcal / 250ml = 0.608/ml; pro 7.7/250=0.0308; fat 8.1/250=0.0324; cho 11.7/250=0.0468
  milk:   { kcal:0.608, pro:0.0308, fat:0.0324, cho:0.0468 },
  // Likuni Phala cooked: maize-soy blend ~55:45; estimate from maize porridge + protein boost
  // Nsima 1 cup 240g=246kcal → 1.025/g; scaled to ml (cooked porridge ~1g/ml): 0.55 kcal/ml; pro higher due to soy
  likuni: { kcal:0.550, pro:0.0250, fat:0.0100, cho:0.0960 },
  // Cooking oil: MP_FOODS.fats → 44 kcal / 5ml = 8.8/ml; fat 5/5=1.0/ml
  oil:    { kcal:8.800, pro:0,      fat:1.000,  cho:0      },
  // Sugar: standard 3.87 kcal/g, all CHO
  sugar:  { kcal:3.870, pro:0,      fat:0,      cho:1.000  },
};

function lrCalc() {
  // ── Helpers ──────────────────────────────────────────────
  const errEl     = document.getElementById('lr-error-msg');
  const resultSec = document.getElementById('lr-results-section');
  const _showErr  = (html) => {
    if (errEl) { errEl.innerHTML = html; errEl.style.display = 'block'; }
    if (resultSec) resultSec.style.display = 'none';
  };
  const _clearErr = () => { if (errEl) errEl.style.display = 'none'; };
  const _markInvalid = (id) => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = 'rgba(251,113,133,0.7)'; el.style.boxShadow = '0 0 0 2px rgba(251,113,133,0.18)'; }
  };
  const _clearInvalid = (...ids) => ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
  });

  // ── Read recipe values ───────────────────────────────────
  const milk   = parseFloat(document.getElementById('lr-milk')?.value)   || 0;
  const likuni = parseFloat(document.getElementById('lr-likuni')?.value) || 0;
  const oil    = parseFloat(document.getElementById('lr-oil')?.value)    || 0;
  const sugar  = parseFloat(document.getElementById('lr-sugar')?.value)  || 0;
  const vol    = parseFloat(document.getElementById('lr-vol')?.value)    || 0;
  const kcalReq = parseFloat(document.getElementById('lr-pt-kcal-abs')?.value) || 0;
  const proReq  = parseFloat(document.getElementById('lr-pt-pro-abs')?.value)  || 0;

  _clearInvalid('lr-milk','lr-likuni','lr-vol','lr-pt-kcal-abs','lr-pt-pro-abs');

  // ── Validation ───────────────────────────────────────────
  const errors = [];

  if (milk <= 0 && likuni <= 0) {
    errors.push(' Recipe: Enter at least milk or Likuni Phala amount.');
    _markInvalid('lr-milk'); _markInvalid('lr-likuni');
  }
  if (!vol || vol <= 0) {
    errors.push(' Total batch volume is required.');
    _markInvalid('lr-vol');
  }
  if (!kcalReq || kcalReq <= 0) {
    errors.push(' Patient energy requirement (kcal/day) is required.');
    _markInvalid('lr-pt-kcal-abs');
  }
  if (!proReq || proReq <= 0) {
    errors.push(' Patient protein requirement (g/day) is required.');
    _markInvalid('lr-pt-pro-abs');
  }

  if (errors.length > 0) {
    _showErr('<strong>Please fix the following before calculating:</strong><br>' + errors.join('<br>'));
    return;
  }
  _clearErr();

  // ── Calculate recipe nutrition ───────────────────────────
  const kcal = milk*LR_NUTR.milk.kcal + likuni*LR_NUTR.likuni.kcal + oil*LR_NUTR.oil.kcal + sugar*LR_NUTR.sugar.kcal;
  const pro  = milk*LR_NUTR.milk.pro  + likuni*LR_NUTR.likuni.pro  + oil*LR_NUTR.oil.pro  + sugar*LR_NUTR.sugar.pro;
  const fat  = milk*LR_NUTR.milk.fat  + likuni*LR_NUTR.likuni.fat  + oil*LR_NUTR.oil.fat  + sugar*LR_NUTR.sugar.fat;
  const cho  = milk*LR_NUTR.milk.cho  + likuni*LR_NUTR.likuni.cho  + oil*LR_NUTR.oil.cho  + sugar*LR_NUTR.sugar.cho;

  const sf     = 1000 / vol;
  const kcalL  = kcal * sf;
  const proL   = pro  * sf;
  const fatL   = fat  * sf;
  const choL   = cho  * sf;
  const kcalMl = kcalL / 1000;

  // ── Populate result boxes ────────────────────────────────
  const _set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  _set('lr-r-kcalL',  kcalL.toFixed(0));
  _set('lr-r-proL',   proL.toFixed(1));
  _set('lr-r-fatL',   fatL.toFixed(1));
  _set('lr-r-choL',   choL.toFixed(1));
  _set('lr-r-kcalml', kcalMl.toFixed(2));
  _set('lr-r-pro100', (proL/10).toFixed(1));

  const kEl = document.getElementById('lr-r-kcalL');
  const pEl = document.getElementById('lr-r-proL');
  if (kEl) kEl.style.color = kcalL >= 900 ? 'var(--green)' : 'var(--amber)';
  if (pEl) pEl.style.color = proL  >= 30  ? 'var(--green)' : 'var(--amber)';

  // ── Show results section ─────────────────────────────────
  if (resultSec) {
    resultSec.style.display = 'block';
    resultSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  lrGenPrescription(kcalMl, proL);
  if (typeof showToast === 'function') showToast(' Low-Resource prescription calculated', 'success');
  // Log to Firestore
  try { logCalcToFirebase({ calcType:'enteral-lowresource', module:'enteral', formula:'low-resource' }); } catch(e) {}
}

function lrLoadPreset(idx) {
  const presets = [
    { name:'Standard',    milk:600, likuni:300, oil:30, sugar:20, vol:1000 },
    { name:'High-Energy', milk:500, likuni:300, oil:50, sugar:30, vol:1000 },
    { name:'High-Protein',milk:700, likuni:250, oil:20, sugar:10, vol:1000 },
  ];
  const p = presets[idx];
  if (!p) return;
  const _sv = (id, v) => { const el = document.getElementById(id); if(el) el.value = v; };
  _sv('lr-milk',   p.milk);
  _sv('lr-likuni', p.likuni);
  _sv('lr-oil',    p.oil);
  _sv('lr-sugar',  p.sugar);
  _sv('lr-vol',    p.vol);
  if (typeof showToast === 'function') showToast('Preset loaded: ' + p.name + ' — click Calculate to see results', 'info');
}

function lrGenPrescription(kcalMl, proL) {
  const el = document.getElementById('lr-prescription');
  if (!el) return;

  // ── badge update ─────────────────────────────────────────
  const kcalL  = kcalMl * 1000;
  const badge  = document.getElementById('lr-quality-badge');
  const bIcon  = document.getElementById('lr-badge-icon');
  const bTitle = document.getElementById('lr-badge-title');
  const bSub   = document.getElementById('lr-badge-sub');
  const bKcal  = document.getElementById('lr-badge-kcal');
  const kcalOk = kcalL >= 900 && kcalL <= 1200;
  const proOk  = proL  >= 30;
  const allOk  = kcalOk && proOk;
  if (badge) {
    badge.style.borderColor  = allOk ? 'rgba(52,211,153,0.5)'  : kcalOk || proOk ? 'rgba(240,180,41,0.5)' : 'rgba(251,113,133,0.5)';
    badge.style.background   = allOk ? 'rgba(52,211,153,0.06)' : kcalOk || proOk ? 'rgba(240,180,41,0.06)' : 'rgba(251,113,133,0.06)';
  }
  if (bIcon)  bIcon.textContent  = allOk ? '' : kcalOk || proOk ? '' : '';
  if (bTitle) { bTitle.textContent = allOk ? 'RECIPE ADEQUATE' : kcalOk || proOk ? 'RECIPE BELOW TARGET' : 'RECIPE INADEQUATE'; bTitle.style.color = allOk ? 'var(--green)' : kcalOk || proOk ? 'var(--amber)' : 'var(--red)'; }
  if (bSub) {
    const msgs = [];
    if (!kcalOk) msgs.push(kcalL < 900 ? 'Energy too low (<900 kcal/L)' : 'Energy too high (>1200 kcal/L)');
    if (!proOk)  msgs.push('Protein below target (<30 g/L)');
    if (allOk)   msgs.push('Energy and protein meet clinical targets');
    bSub.textContent = msgs.join(' · ');
  }
  if (bKcal) { bKcal.textContent = kcalL.toFixed(0); bKcal.style.color = allOk ? 'var(--green)' : kcalOk ? 'var(--amber)' : 'var(--red)'; }

  // ── read patient inputs ───────────────────────────────────
  const targetKcal  = parseFloat(document.getElementById('lr-pt-kcal-abs')?.value)  || 0;
  const targetPro   = parseFloat(document.getElementById('lr-pt-pro-abs')?.value)   || 0;
  const targetFluid = parseFloat(document.getElementById('lr-pt-fluid-abs')?.value) || 0;
  const nonNutr     = parseFloat(document.getElementById('lr-pt-nonnutr')?.value)   || 0;
  const weight      = parseFloat(document.getElementById('lr-pt-weight')?.value)    || 0;
  const route       = document.getElementById('lr-pt-route')?.value  || 'NGT';
  const method      = document.getElementById('lr-pt-method')?.value || 'bolus';

  if (!targetKcal || !kcalMl) { el.innerHTML = ''; return; }

  // ── calculations ─────────────────────────────────────────
  const adjKcal   = Math.max(0, targetKcal - nonNutr);
  const volDay    = kcalMl > 0 ? adjKcal / kcalMl : 0;
  const proDeliv  = (volDay / 1000 * proL).toFixed(1);
  const proMet    = targetPro > 0 ? Math.round(parseFloat(proDeliv) / targetPro * 100) : null;
  const proMetCol = proMet !== null ? (proMet >= 90 ? 'var(--green)' : proMet >= 70 ? 'var(--amber)' : 'var(--red)') : 'var(--blue)';
  const fluidGap  = targetFluid > 0 && volDay < targetFluid ? Math.round(targetFluid - volDay) : 0;

  // per-kg values
  const kcalKg  = weight > 0 ? (adjKcal  / weight).toFixed(1) : null;
  const proKg   = weight > 0 ? (parseFloat(proDeliv) / weight).toFixed(2) : null;
  const fluidKg = weight > 0 ? (targetFluid / weight).toFixed(0) : null;

  // delivery options
  const rate24   = (volDay / 24).toFixed(0);
  const rate20   = (volDay / 20).toFixed(0);
  const bolus6   = Math.round(volDay / 6);
  const bolus8   = Math.round(volDay / 8);
  const halfRate = (parseFloat(rate24) / 2).toFixed(0);

  // method label
  const methodLabels = { bolus:'Bolus', intermittent:'Intermittent', continuous:'Continuous', cyclic:'Cyclic' };
  const routeLabels  = { NGT:'NGT', NJT:'NJT', PEG:'PEG', PEJ:'PEJ' };

  // method-specific admin text
  let adminHtml = '';
  if (method === 'bolus') {
    adminHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
        <div style="background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--amber);letter-spacing:1px;margin-bottom:5px">BOLUS Q4H (×6/day)</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus6} mL</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">06:00 · 10:00 · 14:00 · 18:00 · 22:00 · 02:00</div>
        </div>
        <div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--purple);letter-spacing:1px;margin-bottom:5px">BOLUS Q3H (×8/day)</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus8} mL</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Alternate schedule — smaller, more frequent volumes</div>
        </div>
      </div>
      <div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--text-dim)">Administer over 15–30 min via syringe gravity drip. Day 1–2: give 50% of bolus volume, advance as tolerated.</div>`;
  } else if (method === 'intermittent') {
    adminHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
        <div style="background:rgba(96,165,250,0.06);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--blue);letter-spacing:1px;margin-bottom:5px">INTERMITTENT Q4H (×6/day)</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus6} mL</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Gravity drip over 30–60 min each feed</div>
        </div>
      </div>
      <div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--text-dim)">Day 1–2 starter: give 50% volume (${Math.round(bolus6/2)} mL/feed). Assess tolerance before each feed — nausea, distension, vomiting. Routine GRV measurement not recommended (ASPEN/SCCM 2016).</div>`;
  } else if (method === 'continuous') {
    adminHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
        <div style="background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--teal);letter-spacing:1px;margin-bottom:5px">CONTINUOUS 24H</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${rate24} mL/hr</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Day 1–2 starter: <span style="color:var(--amber)">${halfRate} mL/hr</span></div>
        </div>
        <div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--green);letter-spacing:1px;margin-bottom:5px">CONTINUOUS 20H</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${rate20} mL/hr</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">4h break for procedures/positioning</div>
        </div>
      </div>`;
  } else {
    adminHtml = `
      <div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:8px;padding:10px 12px">
        <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--purple);letter-spacing:1px;margin-bottom:5px">CYCLIC (16H ON / 8H OFF)</div>
        <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${(volDay/16).toFixed(0)} mL/hr</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Run 07:00–23:00 (16h). Adjust to ward routine.</div>
      </div>`;
  }

  el.innerHTML = `
  <div style="background:var(--surface2);border:1px solid rgba(240,180,41,0.3);border-radius:12px;overflow:hidden;margin-bottom:6px">

    <!-- Header -->
    <div style="background:linear-gradient(90deg,rgba(240,180,41,0.18),rgba(240,180,41,0.04));padding:14px 18px;border-bottom:2px solid rgba(240,180,41,0.25);display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-family:var(--cond);font-size:16px;font-weight:800;letter-spacing:3px;color:var(--amber)"> PRESCRIPTION ORDER</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px;letter-spacing:0.5px">Low-Resource Hospital Enteral Nutrition · ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
      </div>
      <div style="font-family:var(--mono);font-size:8px;padding:4px 10px;border-radius:12px;background:rgba(240,180,41,0.12);border:1px solid rgba(240,180,41,0.35);color:var(--amber);letter-spacing:1px">ENTERAL · ${routeLabels[route]} · ${methodLabels[method].toUpperCase()}</div>
    </div>

    <!-- Section 1: Nutrition Requirements -->
    <div style="padding:16px 18px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--amber);margin-bottom:12px">① NUTRITION REQUIREMENTS</div>
      <div style="display:flex;flex-direction:column;gap:0;background:rgba(8,18,36,0.4);border:1px solid rgba(56,100,168,0.2);border-radius:8px;overflow:hidden">

        <!-- Energy row -->
        <div style="display:flex;align-items:center;padding:11px 14px;border-bottom:1px solid rgba(56,100,168,0.12)">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:80px;flex-shrink:0">Energy</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:16px;font-weight:800;color:var(--amber)">${Math.round(adjKcal)}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">kcal/day${nonNutr > 0 ? ' (adjusted)' : ''}</span>
            ${kcalKg ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-muted);padding:2px 8px;background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.2);border-radius:10px">${kcalKg} kcal/kg/day</span>` : ''}
          </div>
        </div>

        <!-- Protein row -->
        <div style="display:flex;align-items:center;padding:11px 14px;border-bottom:1px solid rgba(56,100,168,0.12)">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:80px;flex-shrink:0">Protein</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:16px;font-weight:800;color:${proMetCol}">${proDeliv}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">g/day delivered</span>
            ${proKg ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-muted);padding:2px 8px;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);border-radius:10px">${proKg} g/kg/day</span>` : ''}
            ${proMet ? `<span style="font-family:var(--mono);font-size:9px;color:${proMetCol}">(${proMet}% of ${targetPro}g target)</span>` : ''}
          </div>
        </div>

        <!-- Fluids row -->
        <div style="display:flex;align-items:center;padding:11px 14px">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:80px;flex-shrink:0"> Fluids</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:16px;font-weight:800;color:var(--teal)">${Math.round(targetFluid > 0 ? targetFluid : volDay)}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">mL/day${targetFluid > 0 ? ' (target)' : ' (formula)'}</span>
            ${fluidKg ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-muted);padding:2px 8px;background:rgba(29,233,212,0.08);border:1px solid rgba(29,233,212,0.2);border-radius:10px">${fluidKg} mL/kg/day</span>` : ''}
            ${fluidGap > 0 ? `<span style="font-family:var(--mono);font-size:9px;color:var(--blue)">(+ ${fluidGap} mL flush to meet target)</span>` : ''}
          </div>
        </div>
      </div>
      ${nonNutr > 0 ? `<div style="margin-top:8px;padding:7px 12px;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:6px;font-family:var(--mono);font-size:9px;color:var(--amber)"> ${Math.round(nonNutr)} kcal non-nutritional deducted (propofol / IV glucose)</div>` : ''}
    </div>

    <!-- Section 2: Feeding Type -->
    <div style="padding:14px 16px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--text-muted);margin-bottom:10px">② FEEDING TYPE</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;font-family:var(--mono);font-size:10px">
        <div style="padding:8px 12px;background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);border-radius:7px">
          <span style="color:var(--text-dim)">Type: </span><strong style="color:var(--text-bright)">Low-Resource Enteral Nutrition</strong>
        </div>
        <div style="padding:8px 12px;background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);border-radius:7px">
          <span style="color:var(--text-dim)">Route: </span><strong style="color:var(--amber)">${routeLabels[route]}</strong>
        </div>
        <div style="padding:8px 12px;background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);border-radius:7px">
          <span style="color:var(--text-dim)">Method: </span><strong style="color:var(--amber)">${methodLabels[method]}</strong>
        </div>
      </div>
    </div>

    <!-- Section 3: Feed Composition -->
    <div style="padding:14px 16px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--text-muted);margin-bottom:10px">③ FEED COMPOSITION</div>
      <div style="font-family:var(--mono);font-size:9.5px;color:var(--text);line-height:1.9">
        <strong style="color:var(--amber)">Hospital Low-Resource Formula</strong> — Locally sourced ingredients<br>
        <span style="color:var(--text-dim)">Base ingredients:</span> Full-cream milk · Likuni Phala (cooked, strained) · Vegetable oil · Sugar<br>
        <span style="color:var(--text-dim)">Formula density:</span> ${kcalMl.toFixed(2)} kcal/mL · Protein ${proL.toFixed(1)} g/L<br>
        <span style="color:var(--text-dim)">Preparation:</span> Blend thoroughly, strain through fine sieve, top up to <strong>${Math.round(volDay)} mL/day</strong> with boiled water<br>
        <span style="color:var(--text-dim)">Consistency:</span> Smooth, lump-free; tube-passable through ≥12 Fr bore
      </div>
    </div>

    <!-- Section 4: Administration -->
    <div style="padding:14px 16px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--text-muted);margin-bottom:10px">④ ADMINISTRATION</div>
      ${adminHtml}
    </div>

    <!-- Section 5: Water Flush -->
    <div style="padding:14px 16px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--text-muted);margin-bottom:8px">⑤ WATER FLUSH</div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="padding:8px 14px;background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.2);border-radius:7px;font-family:var(--mono);font-size:11px;font-weight:700;color:var(--teal)">50–100 mL</div>
        <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">clean boiled water <strong style="color:var(--text)">before and after each feed</strong>${fluidGap > 0 ? ` · also add ${fluidGap} mL across the day to meet fluid target` : ''}</div>
      </div>
    </div>

    <!-- Section 6: Monitoring -->
    <div style="padding:14px 16px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--text-muted);margin-bottom:10px">⑥ MONITORING</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px">
        ${[
          [' Tolerance','Nausea, vomiting, diarrhoea, abdominal distension — assess clinically before each feed. Routine GRV monitoring not recommended (ASPEN/SCCM 2016). GRV checks are not applicable for patients with adequate oral intake or post-pyloric feeds. If clinically indicated (nasogastric ICU patients with suspected gastroparesis only): GRV ≥500 mL with symptoms = hold &amp; reassess; GRV &lt;500 mL alone = continue EN.'],
          [' Tube patency','Check position before each feed (aspiration / pH paper). Flush with warm water if resistance felt.'],
          [' Weight & hydration','Weigh every 3 days. Monitor urine output, skin turgor, mucous membranes, oedema.'],
          ['Biochemistry','Electrolytes (Na, K, Mg, PO₄) twice weekly. Refeeding syndrome risk: monitor closely first 72h.'],
          [' Nutritional response','Reassess energy & protein targets weekly or if clinical status changes significantly.'],
        ].map(([title, desc]) => `
          <div style="padding:8px 10px;background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.18);border-radius:7px">
            <div style="font-family:var(--mono);font-size:8.5px;font-weight:700;color:var(--text-bright);margin-bottom:3px">${title}</div>
            <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);line-height:1.6">${desc}</div>
          </div>`).join('')}
      </div>
    </div>

  </div>`;
}


let blendIngredients = [];

function blendAddFromSelect() {
  const sel    = document.getElementById('blend-food-select');
  const amtEl  = document.getElementById('blend-food-amount');
  const foodId = sel ? sel.value : '';
  const amount = parseFloat(amtEl ? amtEl.value : '') || 0;
  if (!foodId) { if(typeof showToast==='function') showToast('Select a food item','warning'); return; }
  if (!amount || amount <= 0) { if(typeof showToast==='function') showToast('Enter a valid amount','warning'); return; }
  const food = BLEND_FOODS.find(f => f.id === foodId);
  if (!food) return;
  blendIngredients.push({ ...food, amount });
  if (amtEl) amtEl.value = '';
  blendRenderTable();
  blendCalc();
}

function blendRemove(idx) {
  blendIngredients.splice(idx, 1);
  blendRenderTable();
  blendCalc();
}

function blendClearAll() {
  blendIngredients = [];
  blendRenderTable();
  blendCalc();
}

function blendRenderTable() {
  const tbody = document.getElementById('blend-ing-tbody');
  const tfoot = document.getElementById('blend-ing-tfoot');
  if (!tbody) return;

  if (!blendIngredients.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:18px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">No ingredients yet — add from the selector above or load a preset.</td></tr>`;
    if (tfoot) tfoot.style.display = 'none';
    return;
  }

  let totKcal=0, totPro=0, totFat=0, totCho=0;
  tbody.innerHTML = blendIngredients.map((ing, i) => {
    const kcal = ing.kcal * ing.amount;
    const pro  = ing.pro  * ing.amount;
    const fat  = ing.fat  * ing.amount;
    const cho  = ing.cho  * ing.amount;
    totKcal += kcal; totPro += pro; totFat += fat; totCho += cho;
    return `<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">
      <td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text)">${ing.name}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--text-dim);text-align:center">${ing.amount} ${ing.unit}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--amber);text-align:right">${kcal.toFixed(0)}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--blue);text-align:right">${pro.toFixed(1)}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--red);text-align:right">${fat.toFixed(1)}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--green);text-align:right">${cho.toFixed(1)}</td>
      <td style="padding:7px 8px;text-align:center">
        <button onclick="blendRemove(${i})" style="background:rgba(251,113,133,0.12);border:1px solid rgba(251,113,133,0.3);border-radius:4px;color:var(--red);font-size:9px;padding:2px 8px;cursor:pointer;font-family:var(--mono)">✕</button>
      </td>
    </tr>`;
  }).join('');

  if (tfoot) {
    tfoot.style.display = '';
    const _st = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    _st('blend-tot-kcal', totKcal.toFixed(0));
    _st('blend-tot-pro',  totPro.toFixed(1));
    _st('blend-tot-fat',  totFat.toFixed(1));
    _st('blend-tot-cho',  totCho.toFixed(1));
  }
}

function blendCalc() {
  // ── Helpers ──────────────────────────────────────────────
  const errEl     = document.getElementById('blend-error-msg');
  const resultSec = document.getElementById('blend-results-section');
  const _showErr  = (html) => {
    if (errEl) { errEl.innerHTML = html; errEl.style.display = 'block'; }
    if (resultSec) resultSec.style.display = 'none';
  };
  const _clearErr = () => { if (errEl) errEl.style.display = 'none'; };
  const _markInvalid = (id) => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = 'rgba(251,113,133,0.7)'; el.style.boxShadow = '0 0 0 2px rgba(251,113,133,0.18)'; }
  };
  const _clearInvalid = (...ids) => ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
  });

  const totalVol = parseFloat(document.getElementById('blend-total-vol')?.value) || 0;
  const kcalReq  = parseFloat(document.getElementById('blend-pt-kcal-abs')?.value) || 0;
  const proReq   = parseFloat(document.getElementById('blend-pt-pro-abs')?.value)  || 0;

  _clearInvalid('blend-total-vol','blend-pt-kcal-abs','blend-pt-pro-abs');

  // ── Validation ───────────────────────────────────────────
  const errors = [];

  if (!blendIngredients || blendIngredients.length === 0) {
    errors.push(' Add at least one ingredient to the blend recipe above.');
  }
  if (!totalVol || totalVol <= 0) {
    errors.push(' Total batch volume is required.');
    _markInvalid('blend-total-vol');
  }
  if (!kcalReq || kcalReq <= 0) {
    errors.push(' Patient energy requirement (kcal/day) is required.');
    _markInvalid('blend-pt-kcal-abs');
  }
  if (!proReq || proReq <= 0) {
    errors.push(' Patient protein requirement (g/day) is required.');
    _markInvalid('blend-pt-pro-abs');
  }

  if (errors.length > 0) {
    _showErr('<strong>Please fix the following before calculating:</strong><br>' + errors.join('<br>'));
    return;
  }
  _clearErr();

  // ── Calculate blend nutrition ────────────────────────────
  let totKcal=0, totPro=0, totFat=0, totCho=0;
  blendIngredients.forEach(ing => {
    totKcal += ing.kcal * ing.amount;
    totPro  += ing.pro  * ing.amount;
    totFat  += ing.fat  * ing.amount;
    totCho  += ing.cho  * ing.amount;
  });
  const sf     = 1000 / totalVol;
  const kcalL  = totKcal * sf;
  const proL   = totPro  * sf;
  const fatL   = totFat  * sf;
  const choL   = totCho  * sf;
  const kcalMl = kcalL / 1000;

  // ── Populate result boxes ────────────────────────────────
  const _set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  _set('blend-r-kcalL',  kcalL.toFixed(0));
  _set('blend-r-proL',   proL.toFixed(1));
  _set('blend-r-fatL',   fatL.toFixed(1));
  _set('blend-r-choL',   choL.toFixed(1));
  _set('blend-r-kcalml', kcalMl.toFixed(2));
  _set('blend-r-pro100', (proL/10).toFixed(1));

  const kEl = document.getElementById('blend-r-kcalL');
  const pEl = document.getElementById('blend-r-proL');
  if (kEl) kEl.style.color = kcalL >= 900 ? 'var(--green)' : 'var(--amber)';
  if (pEl) pEl.style.color = proL  >= 30  ? 'var(--green)' : 'var(--amber)';

  // ── Show results section ─────────────────────────────────
  if (resultSec) {
    resultSec.style.display = 'block';
    resultSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  blendGenPrescription(kcalMl, proL);
  if (typeof showToast === 'function') showToast(' Blenderized prescription calculated', 'success');
  // Log to Firestore
  try { logCalcToFirebase({ calcType:'enteral-blenderized', module:'enteral', formula:'blenderized' }); } catch(e) {}
}

function blendLoadPreset(idx) {
  const presets = [
    {
      name: 'High-Energy Feed',
      vol: 1000,
      items: [
        { id:'milk',  amount:500 },
        { id:'likuni',amount:250 },
        { id:'gnut',  amount:30  },
        { id:'oil',   amount:20  },
        { id:'sugar', amount:15  },
      ]
    },
    {
      name: 'High-Protein Feed',
      vol: 1000,
      items: [
        { id:'milk',  amount:400 },
        { id:'beans', amount:150 },
        { id:'egg',   amount:1   },
        { id:'likuni',amount:200 },
        { id:'oil',   amount:20  },
      ]
    },
  ];
  const preset = presets[idx];
  if (!preset) return;
  blendIngredients = preset.items.map(item => {
    const food = BLEND_FOODS.find(f => f.id === item.id);
    return food ? { ...food, amount: item.amount } : null;
  }).filter(Boolean);
  const volEl = document.getElementById('blend-total-vol');
  if (volEl) volEl.value = preset.vol;
  blendRenderTable();
  if (typeof showToast === 'function') showToast('Preset loaded: ' + preset.name + ' — click Calculate to see results', 'info');
}

function blendGenPrescription(kcalMl, proL) {
  const el = document.getElementById('blend-prescription');
  if (!el) return;

  // ── badge update ─────────────────────────────────────────
  const kcalL  = kcalMl * 1000;
  const badge  = document.getElementById('blend-quality-badge');
  const bIcon  = document.getElementById('blend-badge-icon');
  const bTitle = document.getElementById('blend-badge-title');
  const bSub   = document.getElementById('blend-badge-sub');
  const bKcal  = document.getElementById('blend-badge-kcal');
  const kcalOk = kcalL >= 900 && kcalL <= 1200;
  const proOk  = proL  >= 30;
  const allOk  = kcalOk && proOk;
  if (badge) {
    badge.style.borderColor = allOk ? 'rgba(52,211,153,0.5)'  : kcalOk || proOk ? 'rgba(240,180,41,0.5)' : 'rgba(251,113,133,0.5)';
    badge.style.background  = allOk ? 'rgba(52,211,153,0.06)' : kcalOk || proOk ? 'rgba(240,180,41,0.06)' : 'rgba(251,113,133,0.06)';
  }
  if (bIcon)  bIcon.textContent  = allOk ? '' : kcalOk || proOk ? '' : '';
  if (bTitle) { bTitle.textContent = allOk ? 'BLEND ADEQUATE' : kcalOk || proOk ? 'BLEND BELOW TARGET' : 'BLEND INADEQUATE'; bTitle.style.color = allOk ? 'var(--green)' : kcalOk || proOk ? 'var(--amber)' : 'var(--red)'; }
  if (bSub) {
    const msgs = [];
    if (!kcalOk) msgs.push(kcalL < 900 ? 'Energy too low (<900 kcal/L) — add more oil or starchy staples' : 'Energy very high (>1200 kcal/L)');
    if (!proOk)  msgs.push('Protein below target (<30 g/L) — add more milk, beans, egg or usipa');
    if (allOk)   msgs.push('Energy and protein meet clinical targets — blend is suitable for tube feeding');
    bSub.textContent = msgs.join(' · ');
  }
  if (bKcal) { bKcal.textContent = kcalL.toFixed(0); bKcal.style.color = allOk ? 'var(--green)' : kcalOk ? 'var(--amber)' : 'var(--red)'; }

  // ── calorie contribution chart ────────────────────────────
  const chartWrap = document.getElementById('blend-calorie-chart');
  const chartBars = document.getElementById('blend-chart-bars');
  if (chartBars && blendIngredients.length > 0) {
    const totalKcalBatch = blendIngredients.reduce((s, i) => s + i.kcal * i.amount, 0);
    const barColors = ['var(--amber)','var(--teal)','var(--blue)','var(--green)','var(--purple)','var(--red)','#f472b6','#fb923c'];
    const sorted = blendIngredients.slice().sort((a, b) => (b.kcal * b.amount) - (a.kcal * a.amount));
    chartBars.innerHTML = sorted.map((ing, idx) => {
      const ingKcal = ing.kcal * ing.amount;
      const pct     = totalKcalBatch > 0 ? Math.round(ingKcal / totalKcalBatch * 100) : 0;
      const col     = barColors[idx % barColors.length];
      return `<div style="display:flex;align-items:center;gap:8px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);width:120px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${ing.name}">${ing.name.split('(')[0].trim()}</div>
        <div style="flex:1;background:rgba(255,255,255,0.05);border-radius:3px;height:14px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${col};border-radius:3px;transition:width 0.4s ease"></div>
        </div>
        <div style="font-family:var(--mono);font-size:9px;font-weight:700;color:${col};width:36px;text-align:right;flex-shrink:0">${pct}%</div>
      </div>`;
    }).join('');
    if (chartWrap) chartWrap.style.display = 'block';
  }

  // ── patient prescription ──────────────────────────────────
  const targetKcal  = parseFloat(document.getElementById('blend-pt-kcal-abs')?.value)  || 0;
  const targetPro   = parseFloat(document.getElementById('blend-pt-pro-abs')?.value)   || 0;
  const targetFluid = parseFloat(document.getElementById('blend-pt-fluid-abs')?.value) || 0;
  const nonNutr     = parseFloat(document.getElementById('blend-pt-nonnutr')?.value)   || 0;
  const weight      = parseFloat(document.getElementById('blend-pt-weight')?.value)    || 0;
  const route       = document.getElementById('blend-pt-route')?.value  || 'NGT';
  const method      = document.getElementById('blend-pt-method')?.value || 'bolus';
  const R = { patientName: (document.getElementById('blend-pt-name')?.value || '').trim() };

  if (!targetKcal || !kcalMl || !blendIngredients.length) { el.innerHTML = ''; return; }

  const adjKcal   = Math.max(0, targetKcal - nonNutr);
  const volDay    = kcalMl > 0 ? adjKcal / kcalMl : 0;
  const proDeliv  = (volDay / 1000 * proL).toFixed(1);
  const proMet    = targetPro > 0 ? Math.round(parseFloat(proDeliv) / targetPro * 100) : null;
  const proMetCol = proMet !== null ? (proMet >= 90 ? 'var(--green)' : proMet >= 70 ? 'var(--amber)' : 'var(--red)') : 'var(--blue)';
  const fluidGap  = targetFluid > 0 && volDay < targetFluid ? Math.round(targetFluid - volDay) : 0;

  const kcalKg  = weight > 0 ? (adjKcal  / weight).toFixed(1) : null;
  const proKg   = weight > 0 ? (parseFloat(proDeliv) / weight).toFixed(2) : null;
  const fluidKg = weight > 0 ? (targetFluid / weight).toFixed(0) : null;

  const rate24   = (volDay / 24).toFixed(0);
  const rate20   = (volDay / 20).toFixed(0);
  const bolus6   = Math.round(volDay / 6);
  const bolus8   = Math.round(volDay / 8);
  const halfRate = (parseFloat(rate24) / 2).toFixed(0);

  const methodLabels = { bolus:'Bolus', intermittent:'Intermittent', continuous:'Continuous', cyclic:'Cyclic' };
  const routeLabels  = { NGT:'NGT', NJT:'NJT', PEG:'PEG', PEJ:'PEJ' };

  // build ingredient list for composition section
  const ingList = blendIngredients.slice(0,6).map(i => i.name.split('(')[0].trim().split('/')[0].trim()).join(', ');
  const ingMore = blendIngredients.length > 6 ? ` + ${blendIngredients.length - 6} more` : '';

  let adminHtml = '';
  if (method === 'bolus') {
    adminHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
        <div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--green);letter-spacing:1px;margin-bottom:5px">BOLUS Q4H (×6/day)</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus6} mL</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">06:00 · 10:00 · 14:00 · 18:00 · 22:00 · 02:00</div>
        </div>
        <div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--purple);letter-spacing:1px;margin-bottom:5px">BOLUS Q3H (×8/day)</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus8} mL</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Alternate — smaller, more frequent</div>
        </div>
      </div>
      <div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--text-dim)">Administer over 20–30 min via syringe. Day 1–2: give 50% volume (${Math.round(bolus6/2)} mL), advance as tolerated. Large-bore tube ≥14 Fr mandatory.</div>`;
  } else if (method === 'intermittent') {
    adminHtml = `
      <div style="background:rgba(96,165,250,0.06);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:10px 12px;display:inline-block;min-width:160px">
        <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--blue);letter-spacing:1px;margin-bottom:5px">INTERMITTENT Q4H (×6/day)</div>
        <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus6} mL</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Gravity drip over 45–60 min each feed</div>
      </div>
      <div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--text-dim)">Day 1–2: 50% volume (${Math.round(bolus6/2)} mL). Always strain before administration. Tube ≥14 Fr only.</div>`;
  } else if (method === 'continuous') {
    adminHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
        <div style="background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--teal);letter-spacing:1px;margin-bottom:5px">CONTINUOUS 24H</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${rate24} mL/hr</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Starter: <span style="color:var(--amber)">${halfRate} mL/hr</span> × 24–48h</div>
        </div>
        <div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--green);letter-spacing:1px;margin-bottom:5px">CONTINUOUS 20H</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${rate20} mL/hr</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">4h rest break recommended</div>
        </div>
      </div>
      <div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--red)"> Blenderized feeds are NOT recommended for continuous pump delivery — high blockage risk. Use bolus or intermittent if possible.</div>`;
  } else {
    adminHtml = `
      <div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:8px;padding:10px 12px;display:inline-block">
        <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--purple);letter-spacing:1px;margin-bottom:5px">CYCLIC (16H ON / 8H OFF)</div>
        <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${(volDay/16).toFixed(0)} mL/hr</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">07:00–23:00. Tube ≥14 Fr.</div>
      </div>`;
  }

  el.innerHTML = `
  <!-- ═══════════════════════════════════════════════════════
       BLENDERIZED EN — PRESCRIPTION ORDER
       ═══════════════════════════════════════════════════════ -->
  <div style="background:var(--surface2);border:1px solid rgba(52,211,153,0.35);border-radius:14px;overflow:hidden;margin-bottom:6px">

    <!-- Prescription Header -->
    <div style="background:linear-gradient(90deg,rgba(52,211,153,0.20),rgba(52,211,153,0.04));padding:16px 20px;border-bottom:2px solid rgba(52,211,153,0.25)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-family:var(--cond);font-size:17px;font-weight:800;letter-spacing:3px;color:var(--green)">PRESCRIPTION ORDER</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px;letter-spacing:0.5px">Blenderized Enteral Nutrition · ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">
          <div style="font-family:var(--mono);font-size:9px;padding:4px 12px;border-radius:12px;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.35);color:var(--green);letter-spacing:1px">BLENDERIZED EN · ${routeLabels[route] || route} · ${(methodLabels[method] || method).toUpperCase()}</div>
          ${weight ? `<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">Body weight: <strong style="color:var(--text-bright)">${weight} kg</strong></div>` : ''}
          ${R.patientName ? `<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">Patient: <strong style="color:var(--text-bright)">${R.patientName}</strong></div>` : ''}
        </div>
      </div>
    </div>

    <!-- ① Nutrition Requirements -->
    <div style="padding:16px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:14px;text-transform:uppercase">① Nutrition Requirements</div>
      <div style="display:flex;flex-direction:column;gap:0;background:rgba(8,18,36,0.45);border:1px solid rgba(52,211,153,0.15);border-radius:10px;overflow:hidden">

        <!-- Energy row -->
        <div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(56,100,168,0.12)">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:70px;flex-shrink:0">Energy</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:20px;font-weight:800;color:var(--amber)">${Math.round(adjKcal)}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">kcal/day</span>
            ${kcalKg ? `<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--amber);background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.2);border-radius:8px;padding:2px 10px">${kcalKg} kcal/kg/day</span>` : ''}
            ${nonNutr > 0 ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-muted)">(adjusted −${Math.round(nonNutr)} kcal non-nutritional)</span>` : ''}
          </div>
        </div>

        <!-- Protein row -->
        <div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(56,100,168,0.12)">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:70px;flex-shrink:0">Protein</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:20px;font-weight:800;color:${proMetCol}">${proDeliv}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">g/day delivered</span>
            ${proKg ? `<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--blue);background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:2px 10px">${proKg} g/kg/day</span>` : ''}
            ${proMet !== null ? `<span style="font-family:var(--mono);font-size:9px;color:${proMetCol}">${proMet}% of ${targetPro}g/day target</span>` : ''}
          </div>
        </div>

        <!-- Fluids row -->
        <div style="display:flex;align-items:center;padding:12px 16px">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:70px;flex-shrink:0">Fluids</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:20px;font-weight:800;color:var(--teal)">${Math.round(targetFluid > 0 ? targetFluid : volDay)}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">mL/day${targetFluid > 0 ? ' target' : ' (formula vol)'}</span>
            ${fluidKg ? `<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--teal);background:rgba(29,233,212,0.08);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:2px 10px">${fluidKg} mL/kg/day</span>` : ''}
            ${fluidGap > 0 ? `<span style="font-family:var(--mono);font-size:9px;color:var(--blue)">(+ ${fluidGap} mL additional flush needed)</span>` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- ② Feeding Type -->
    <div style="padding:14px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">② Feeding Type</div>
      <div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:2;background:rgba(8,18,36,0.4);border:1px solid rgba(52,211,153,0.12);border-radius:8px;padding:12px 16px">
        <div><span style="color:var(--text-dim);width:80px;display:inline-block">Type:</span> <strong style="color:var(--text-bright)">Blenderized Enteral Nutrition</strong></div>
        <div><span style="color:var(--text-dim);width:80px;display:inline-block">Route:</span> <strong style="color:var(--green)">${routeLabels[route] || route}</strong></div>
        <div><span style="color:var(--text-dim);width:80px;display:inline-block">Method:</span> <strong style="color:var(--green)">${methodLabels[method] || method}</strong></div>
      </div>
    </div>

    <!-- ③ Feed Composition -->
    <div style="padding:14px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">③ Feed Composition</div>
      <div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:2;background:rgba(8,18,36,0.4);border:1px solid rgba(52,211,153,0.12);border-radius:8px;padding:12px 16px">
        <div><strong style="color:var(--green)">Locally available foods</strong> (e.g. nsima, beans, milk, egg, oil, vegetables)</div>
        ${ingList ? `<div style="color:var(--text-dim);font-size:9.5px">Ingredients used: <span style="color:var(--text)">${ingList}${ingMore}</span></div>` : ''}
        <div style="margin-top:4px">Blended, strained through fine mesh, and diluted to appropriate consistency</div>
        <div>Formula density: <strong style="color:var(--amber)">${kcalMl.toFixed(2)} kcal/mL</strong> &nbsp;·&nbsp; Protein: <strong style="color:var(--blue)">${proL.toFixed(1)} g/L</strong></div>
        <div style="color:var(--text-dim);font-size:9.5px;margin-top:4px">Adjust ingredient quantities to achieve target energy and protein — see ingredient table above</div>
        <div style="color:var(--amber);font-size:9.5px;margin-top:2px">Large-bore tube ≥14 Fr mandatory — do NOT use fine-bore tubes</div>
      </div>
    </div>

    <!-- ④ Administration -->
    <div style="padding:14px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">④ Administration</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">
        ${method === 'bolus' || method === 'intermittent' ? `
        <div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;padding:12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--green);letter-spacing:1px;margin-bottom:6px">BOLUS SCHEDULE</div>
          <div style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--text-bright)">${bolus6} mL</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px">every 3–4 hours (×6/day)</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:4px">Administer over 20–30 min via syringe or gravity drip<br>Day 1–2: give 50% volume (${Math.round(bolus6/2)} mL), advance as tolerated</div>
        </div>
        ` : ''}
        ${method === 'continuous' || method === 'cyclic' ? `
        <div style="background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--teal);letter-spacing:1px;margin-bottom:6px">CONTINUOUS RATE</div>
          <div style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--text-bright)">${rate24} mL/hr</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px">${method === 'cyclic' ? `cyclic ${(volDay/16).toFixed(0)} mL/hr × 16h` : '24-hour continuous'}</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:4px">Starter: <span style="color:var(--amber)">${halfRate} mL/hr × 24–48h</span><br>Blenderized feeds: high blockage risk on continuous — use bolus if possible</div>
        </div>
        ` : ''}
        <div style="background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.15);border-radius:8px;padding:12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--blue);letter-spacing:1px;margin-bottom:6px">TYPICAL RANGE</div>
          <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--text-bright)">250–300 mL / feed</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px">or 50–70 mL/hr (continuous)</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:4px">Adjust based on tolerance and daily target volume of <strong>${Math.round(volDay)} mL/day</strong></div>
        </div>
      </div>
    </div>

    <!-- ⑤ Water Flush -->
    <div style="padding:14px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">⑤ Water Flush</div>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--teal);background:rgba(29,233,212,0.07);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:8px 18px">50–100 mL</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:1.8">
          Clean boiled water <strong style="color:var(--text)">before and after each feed</strong><br>
          ${fluidGap > 0 ? `<span style="color:var(--blue)">Additional ${fluidGap} mL distributed through the day to meet daily fluid target</span>` : 'Flushes count towards total daily fluid intake'}
        </div>
      </div>
    </div>

    <!-- ⑥ Monitoring -->
    <div style="padding:14px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">⑥ Monitoring</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">
        ${[
          ['Tolerance', 'Nausea, vomiting, diarrhoea, abdominal distension — assess clinically before each feed. Routine GRV measurement not recommended (ASPEN/SCCM 2016). Hold feed if patient vomits or reports significant abdominal discomfort; reassess and resume when resolved.'],
          ['Tube patency', 'Check tube position before each feed. Flush with warm water. Replace if blockage suspected.'],
          ['Weight & hydration', 'Weigh every 3 days. Monitor urine output, skin turgor, mucous membranes daily.'],
          ['Biochemistry', 'Electrolytes (K, Na, Mg, PO₄) twice weekly. Monitor first 72h for refeeding risk.'],
          ['Nutritional response', 'Reassess energy and protein targets weekly. Adjust recipe as needed.'],
        ].map(([title, desc]) => `
          <div style="padding:10px 12px;background:rgba(8,18,36,0.45);border:1px solid rgba(56,100,168,0.15);border-radius:8px">
            <div style="font-family:var(--mono);font-size:9px;font-weight:700;color:var(--text-bright);margin-bottom:4px">${title}</div>
            <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.6">${desc}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- ⑦ Special Instructions -->
    <div style="padding:14px 20px">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">⑦ Special Instructions</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.6">
        <div style="display:flex;gap:10px"><span style="color:var(--green);flex-shrink:0;font-weight:700">•</span><span>Maintain strict hygiene during preparation — wash hands, use clean sterilised blender and utensils</span></div>
        <div style="display:flex;gap:10px"><span style="color:var(--green);flex-shrink:0;font-weight:700">•</span><span>Use within <strong>24 hours if refrigerated (4°C)</strong> — discard within <strong>2 hours at room temperature</strong></span></div>
        <div style="display:flex;gap:10px"><span style="color:var(--green);flex-shrink:0;font-weight:700">•</span><span>Strain well through fine mesh sieve to prevent tube blockage</span></div>
        <div style="display:flex;gap:10px"><span style="color:var(--green);flex-shrink:0;font-weight:700">•</span><span>Allow feed to reach body temperature before administration</span></div>
        <div style="display:flex;gap:10px"><span style="color:var(--green);flex-shrink:0;font-weight:700">•</span><span>Large-bore tube ≥14 Fr only — blenderized feeds will block fine-bore tubes</span></div>
        ${proMet !== null && proMet < 90 ? `<div style="display:flex;gap:10px"><span style="color:var(--amber);flex-shrink:0;font-weight:700"></span><span>Protein delivery ${proMet}% of target — increase milk, beans, egg or usipa in recipe</span></div>` : ''}
        ${!allOk ? `<div style="display:flex;gap:10px"><span style="color:var(--red);flex-shrink:0;font-weight:700"></span><span>Blend does not fully meet nutritional targets — review recipe or refer to dietitian</span></div>` : ''}
      </div>
    </div>

  </div>`;
}



// ── PEDI SAVE TO HISTORY ─────────────────────────────────────────────

// ── ENTERAL SAVE RECORD ──────────────────────────────────────────────
function saveEnteralRecord() {
  const presc = document.getElementById('en-prescription');
  if (!presc || !presc.innerHTML.trim()) {
    showToast('Generate a prescription first before saving', 'warning'); return;
  }
  const kcal = document.getElementById('en-r-kcal')?.textContent || '—';
  const pro  = document.getElementById('en-r-prot')?.textContent  || '—';
  const vol  = document.getElementById('en-r-vol')?.textContent   || '—';
  const entry = {
    id:       Date.now(),
    savedAt:  new Date().toLocaleString(),
    module:   'enteral',
    label:    'Enteral Feeding Prescription',
    snapshot: 'Energy: ' + kcal + ' kcal/day · Protein: ' + pro + ' g/day · Volume: ' + vol + ' mL/day',
  };
  try { DataService.addToList('history', entry, 50); } catch(e) {}
  showToast(' Enteral prescription saved to history', 'success');
  try { renderActivityStrip(); } catch(e) {}
}

// ── MEAL PLAN SAVE RECORD ────────────────────────────────────────────
function saveMealPlanRecord() {
  const kcal = document.getElementById('mp-tot-kcal')?.textContent || '0';
  const pro  = document.getElementById('mp-tot-pro')?.textContent  || '0';
  const fat  = document.getElementById('mp-tot-fat')?.textContent  || '0';
  if (!kcal || kcal === '0') {
    showToast('Add food items to the meal plan before saving', 'warning'); return;
  }
  const entry = {
    id:       Date.now(),
    savedAt:  new Date().toLocaleString(),
    module:   'mealplan',
    label:    'Meal Plan — Oral / ONS',
    snapshot: 'Energy: ' + kcal + ' kcal/day · Protein: ' + pro + ' g · Fat: ' + fat + ' g',
  };
  try { DataService.addToList('history', entry, 50); } catch(e) {}
  showToast(' Meal plan saved to history', 'success');
  try { renderActivityStrip(); } catch(e) {}
}

// ── LR SAVE RECORD ───────────────────────────────────────────────────
function saveLRRecord() {
  const presc = document.getElementById('lr-prescription');
  if (!presc || !presc.innerHTML.trim() || presc.innerHTML.includes('Enter requirements')) {
    showToast('Generate a prescription first before saving', 'warning'); return;
  }
  const kcal = document.getElementById('lr-pt-kcal-abs')?.value || '—';
  const pro  = document.getElementById('lr-pt-pro-abs')?.value  || '—';
  const vol  = document.getElementById('lr-r-kcalL')?.textContent || '—';
  const entry = {
    id:        Date.now(),
    savedAt:   new Date().toLocaleString(),
    module:    'low-resource',
    label:     'Low-Resource Formula',
    snapshot:  'Energy: ' + kcal + ' kcal/day · Protein: ' + pro + ' g/day · Formula: ' + vol + ' kcal/L',
  };
  DataService.addToList('history', entry, 50);
  showToast(' Low-Resource prescription saved to history', 'success');
  try { renderActivityStrip(); } catch(e) {}
}

// ── BLEND GENERATE PRESCRIPTION (standalone button handler) ──────────
function blendGeneratePrescription() {
  const btn = document.getElementById('blend-gen-presc-btn');
  // Run the full calculation + prescription generation
  blendCalc();
  // After blendCalc, check if prescription was populated
  const presc = document.getElementById('blend-prescription');
  if (presc && presc.innerHTML.trim()) {
    // Auto-save after generation
    const kcal = document.getElementById('blend-pt-kcal-abs')?.value || '—';
    const pro  = document.getElementById('blend-pt-pro-abs')?.value  || '—';
    const vol  = document.getElementById('blend-r-kcalL')?.textContent || '—';
    const n    = (typeof blendIngredients !== 'undefined') ? blendIngredients.length : '?';
    const entry = {
      id:        Date.now(),
      savedAt:   new Date().toLocaleString(),
      module:    'blenderized',
      label:     'Blenderized Tube Feed',
      snapshot:  'Energy: ' + kcal + ' kcal/day · Protein: ' + pro + ' g/day · Formula: ' + vol + ' kcal/L · ' + n + ' ingredients',
    };
    try { DataService.addToList('history', entry, 50); } catch(e) {}
    if (typeof showToast === 'function') showToast(' Prescription generated and saved to history', 'success');
    try { renderActivityStrip(); } catch(e) {}
    // Scroll to the prescription
    setTimeout(() => {
      presc.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }
  // If prescription is still empty, blendCalc already showed the validation errors
}

// ── BLEND SAVE RECORD ────────────────────────────────────────────────
function saveBlendRecord() {
  const presc = document.getElementById('blend-prescription');
  // If prescription not yet generated, try to generate it now
  if (!presc || !presc.innerHTML.trim()) {
    blendCalc();
    // Re-check after attempting generation
    const prescAfter = document.getElementById('blend-prescription');
    if (!prescAfter || !prescAfter.innerHTML.trim()) {
      showToast(' Fill in all required fields and calculate first', 'warning');
      return;
    }
  }
  const kcal = document.getElementById('blend-pt-kcal-abs')?.value || '—';
  const pro  = document.getElementById('blend-pt-pro-abs')?.value  || '—';
  const vol  = document.getElementById('blend-r-kcalL')?.textContent || '—';
  const n    = (typeof blendIngredients !== 'undefined') ? blendIngredients.length : '?';
  const entry = {
    id:        Date.now(),
    savedAt:   new Date().toLocaleString(),
    module:    'blenderized',
    label:     'Blenderized Tube Feed',
    snapshot:  'Energy: ' + kcal + ' kcal/day · Protein: ' + pro + ' g/day · Formula: ' + vol + ' kcal/L · ' + n + ' ingredients',
  };
  DataService.addToList('history', entry, 50);
  showToast(' Blenderized prescription saved to history', 'success');
  try { renderActivityStrip(); } catch(e) {}
}

// LR preset NOT auto-loaded on page load — user must click Calculate


// ══════════════════════════════════════════════════════════════════════
// AUTOMATIC MEAL PLAN GENERATOR
// Malawi Context — Oral, Enteral, Mixed modes
// Edison Taimu · Oasis
// ══════════════════════════════════════════════════════════════════════

let _ampMode = 'oral';

function ampSetMode(mode) {
  _ampMode = mode;
  ['oral','enteral','mixed'].forEach(m => {
    const btn = document.getElementById('amp-btn-'+m);
    if (!btn) return;
    const active = m === mode;
    btn.style.borderColor = active ? 'rgba(29,233,212,0.6)' : 'var(--border)';
    btn.style.background  = active ? 'rgba(29,233,212,0.08)' : 'transparent';
    btn.style.color       = active ? 'var(--teal)' : 'var(--text-dim)';
  });
  const eOpts   = document.getElementById('amp-enteral-opts');
  const eMOpts  = document.getElementById('amp-enteral-mode-opts');
  const mRow    = document.getElementById('amp-mixed-oral-row');
  const eNote   = document.getElementById('amp-enteral-context-note');
  const mNote   = document.getElementById('amp-mixed-context-note');
  const feedRow = document.getElementById('amp-feed-row');
  if (feedRow) feedRow.style.display = (mode==='enteral'||mode==='mixed') ? '' : 'none';
  if (eOpts)  eOpts.style.display  = (mode==='enteral'||mode==='mixed') ? '' : 'none';
  if (eMOpts) eMOpts.style.display = (mode==='enteral'||mode==='mixed') ? '' : 'none';
  if (mRow)   mRow.style.display   = mode==='mixed' ? '' : 'none';
  if (eNote)  eNote.style.display  = mode==='enteral' ? '' : 'none';
  if (mNote)  mNote.style.display  = mode==='mixed'   ? '' : 'none';
  ampShowCondFlags();
}

function ampOnChange() { ampShowCondFlags(); }

function ampShowCondFlags() {
  const cond  = document.getElementById('amp-cond')?.value || 'general';
  const el    = document.getElementById('amp-cond-flags');
  if (!el) return;
  const flags = {
    renal:    ' <strong>Renal:</strong> Limit protein to 0.6–0.8 g/kg/day · Restrict potassium, phosphorus, sodium · Limit fluid if anuric',
    diabetic: ' <strong>Diabetic:</strong> Distribute CHO evenly · Avoid concentrated sweets · Prefer low-GI starches (nsima from refined maize is moderate-GI)',
    cardiac:  ' <strong>Cardiac:</strong> Restrict fluid to 1.5–2 L/day · Limit sodium · Monitor oedema daily',
    burns:    ' <strong>Burns/High Stress:</strong> Energy needs markedly elevated · Protein 1.5–2.5 g/kg/day · Reassess daily',
    hiv:      ' <strong>HIV/TB:</strong> Energy +10–30% above standard · Micronutrient supplementation recommended · Monitor for drug-nutrient interactions',
    malnutrition: ' <strong>SAM/MAM:</strong> Start low (60–80 kcal/kg/day) and advance · Use F-75 then F-100 / RUTF per IMAM protocol · Monitor for refeeding syndrome',
  };
  const msg = flags[cond];
  if (msg) {
    el.style.display = '';
    el.innerHTML = `<div style="background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.3);border-radius:8px;padding:11px 14px;font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.8">${msg}</div>`;
  } else {
    el.style.display = 'none';
  }
}

// ── Food library for auto-generator ─────────────────────────────────
// Each food: { name, portion, kcal, pro, fat, cho, meal: [0-5] }
// meal: 0=breakfast 1=mid-morn 2=lunch 3=aftn 4=dinner 5=evening
const AMP_FOOD_LIB = {
  // Staples
  nsima_cup:      { name:'Nsima (1 cup, thick)',            portion:'1 cup (~250g)', kcal:260, pro:5.5, fat:0.6, cho:57,  meals:[2,4] },
  nsima_sm:       { name:'Nsima (small portion)',           portion:'½ cup (~125g)', kcal:130, pro:2.8, fat:0.3, cho:28,  meals:[2,4] },
  likuni_cup:     { name:'Likuni Phala porridge (1 cup)',   portion:'1 cup (250ml)', kcal:140, pro:5.5, fat:2.5, cho:24,  meals:[0,1] },
  maize_thin:     { name:'Thin maize porridge (1 cup)',     portion:'1 cup (250ml)', kcal:95,  pro:2.0, fat:0.5, cho:21,  meals:[0]   },
  bread_slice:    { name:'Bread (white/brown, 1 slice)',    portion:'1 slice (35g)', kcal:88,  pro:2.8, fat:1.0, cho:17,  meals:[0,1] },
  rice_cup:       { name:'Rice (cooked, 1 cup)',            portion:'1 cup (185g)',  kcal:240, pro:4.4, fat:0.4, cho:53,  meals:[2,4] },
  sweet_pot:      { name:'Sweet potato (boiled, 1 medium)', portion:'1 med (150g)',  kcal:130, pro:2.4, fat:0.2, cho:30,  meals:[1,4] },
  // Protein
  beans_cup:      { name:'Beans (cooked, 1 cup)',           portion:'1 cup (170g)',  kcal:230, pro:15,  fat:0.9, cho:42,  meals:[2,4] },
  soya_cup:       { name:'Soya pieces stew (1 cup)',        portion:'1 cup (180g)',  kcal:290, pro:25,  fat:9,   cho:28,  meals:[2,4] },
  fish_usipa:     { name:'Usipa/Kapenta (2 tbsp, dried)',   portion:'2 tbsp (20g)',  kcal:66,  pro:13,  fat:1.4, cho:0,   meals:[2,4] },
  fish_chambo:    { name:'Chambo (fresh, 90g portion)',     portion:'1 portion(90g)',kcal:117, pro:25.5,fat:1.8, cho:0,   meals:[2,4] },
  chicken_90:     { name:'Chicken stew (cooked, 90g)',      portion:'1 portion(90g)',kcal:150, pro:28.5,fat:4.2, cho:0,   meals:[2,4] },
  egg_boiled:     { name:'Egg (boiled, 1 large)',           portion:'1 egg (50g)',   kcal:72,  pro:6.3, fat:4.8, cho:0.4, meals:[0,1] },
  milk_cup:       { name:'Milk (full cream, 1 cup)',        portion:'1 cup (250ml)', kcal:152, pro:7.7, fat:8.1, cho:11.7,meals:[0,1,5] },
  milk_half:      { name:'Milk (full cream, ½ cup)',        portion:'½ cup (125ml)', kcal:76,  pro:3.9, fat:4.1, cho:5.9, meals:[1,5] },
  gnut_2tbsp:     { name:'Groundnuts (2 tablespoons)',      portion:'2 tbsp (30g)',  kcal:177, pro:7.8, fat:15.3,cho:5.9, meals:[0,1,5] },
  gnut_paste:     { name:'Groundnut paste (2 tbsp)',        portion:'2 tbsp (32g)',  kcal:188, pro:8,   fat:16,  cho:6,   meals:[0,1] },
  beans_sm:       { name:'Bean relish (small, ½ cup)',      portion:'½ cup (85g)',   kcal:115, pro:7.5, fat:0.5, cho:21,  meals:[2,4] },
  // Vegetables
  rape_kale:      { name:'Rape/Kale (cooked, 1 cup)',       portion:'1 cup (130g)',  kcal:36,  pro:4.0, fat:0.6, cho:4,   meals:[2,4] },
  tomato:         { name:'Tomato (1 medium)',                portion:'1 medium',      kcal:22,  pro:1.1, fat:0.2, cho:4.8, meals:[2,4] },
  mixed_veg:      { name:'Mixed vegetables (cooked)',        portion:'½ cup (80g)',   kcal:30,  pro:1.5, fat:0.3, cho:6,   meals:[2,4] },
  // Fruit
  banana:         { name:'Banana (1 medium, ripe)',          portion:'1 banana',      kcal:105, pro:1.3, fat:0.4, cho:27,  meals:[1,3,5] },
  mango:          { name:'Mango (½ medium)',                 portion:'½ mango(100g)', kcal:68,  pro:0.6, fat:0.3, cho:17.5,meals:[1,3] },
  papaya:         { name:'Papaya/Pawpaw (1 cup)',            portion:'1 cup (140g)',  kcal:55,  pro:0.9, fat:0.1, cho:14,  meals:[1,3] },
  // Fats / extras
  oil_tsp:        { name:'Cooking oil (1 teaspoon)',         portion:'1 tsp (5ml)',   kcal:44,  pro:0,   fat:5,   cho:0,   meals:[0,2,4] },
  oil_tbsp:       { name:'Cooking oil (1 tablespoon)',       portion:'1 tbsp (15ml)', kcal:133, pro:0,   fat:15,  cho:0,   meals:[2,4] },
  sugar_tsp:      { name:'Sugar (2 teaspoons)',              portion:'2 tsp (8g)',    kcal:31,  pro:0,   fat:0,   cho:8,   meals:[0,1] },
  tea:            { name:'Tea (black, no sugar)',             portion:'1 cup',         kcal:2,   pro:0,   fat:0,   cho:0.5, meals:[0,5] },
  tea_milk:       { name:'Tea with milk (1 cup)',            portion:'1 cup (250ml)', kcal:40,  pro:2,   fat:2,   cho:5,   meals:[0,5] },
};

// meal-slot proportions: [breakfast, mid-morn, lunch, aftn, dinner, evening]
const AMP_MEAL_PROPS = [0.25, 0.10, 0.30, 0.10, 0.25, 0.00];
const AMP_MEAL_ICONS = ['','','','','',''];
const AMP_MEAL_LABELS = ['Breakfast','Mid-morning snack','Lunch','Afternoon snack','Dinner','Evening snack'];

// Curated slot menus — arrays of food keys per slot
const AMP_SLOT_MENUS = [
  // 0 — Breakfast options
  [
    ['likuni_cup','milk_half','gnut_2tbsp','sugar_tsp'],
    ['maize_thin','milk_cup','egg_boiled','sugar_tsp'],
    ['bread_slice','bread_slice','egg_boiled','tea_milk'],
    ['likuni_cup','gnut_paste','milk_half'],
    ['maize_thin','gnut_2tbsp','banana'],
  ],
  // 1 — Mid-morning
  [
    ['banana','milk_half'],
    ['gnut_2tbsp','tea_milk'],
    ['sweet_pot','milk_half'],
    ['bread_slice','gnut_paste'],
    ['papaya','milk_half'],
    ['mango','gnut_2tbsp'],
  ],
  // 2 — Lunch options
  [
    ['nsima_cup','beans_cup','rape_kale','oil_tsp'],
    ['nsima_cup','soya_cup','tomato','oil_tsp'],
    ['nsima_cup','fish_usipa','mixed_veg','oil_tbsp'],
    ['nsima_cup','chicken_90','rape_kale'],
    ['rice_cup','beans_cup','mixed_veg','oil_tsp'],
    ['nsima_cup','fish_chambo','tomato','oil_tsp'],
  ],
  // 3 — Afternoon snack
  [
    ['banana'],
    ['gnut_2tbsp','tea'],
    ['mango'],
    ['papaya'],
    ['milk_half'],
  ],
  // 4 — Dinner options
  [
    ['nsima_cup','beans_cup','rape_kale'],
    ['nsima_cup','soya_cup','tomato','oil_tsp'],
    ['sweet_pot','beans_sm','milk_half'],
    ['nsima_sm','fish_usipa','mixed_veg'],
    ['rice_cup','chicken_90','rape_kale'],
    ['nsima_cup','fish_chambo','mixed_veg'],
  ],
  // 5 — Evening
  [
    ['milk_cup'],
    ['tea_milk','banana'],
    ['gnut_2tbsp','milk_half'],
  ],
];

// Scale a set of foods to hit a kcal target, returning items array
function _ampScaleMeal(foodKeys, targetKcal) {
  const raw = foodKeys.map(k => AMP_FOOD_LIB[k]).filter(Boolean);
  const rawKcal = raw.reduce((s,f) => s+f.kcal, 0);
  if (rawKcal <= 0) return [];
  const scale = targetKcal / rawKcal;
  const s = Math.max(0.5, Math.min(2.5, scale));
  return raw.map(f => ({
    name:    f.name,
    amount:  _ampScaleAmount(f.portion, s),
    kcal:    Math.round(f.kcal * s),
    pro:     parseFloat((f.pro  * s).toFixed(1)),
    fat:     parseFloat((f.fat  * s).toFixed(1)),
    cho:     parseFloat((f.cho  * s).toFixed(1)),
    kj:      Math.round(f.kcal  * s * 4.184),
  }));
}

// Produce a readable scaled-amount string
function _ampScaleAmount(portion, s) {
  if (Math.abs(s - 1) < 0.12) return portion;
  const m = portion.match(/^([\d.½¼¾]+)\s*(.*)/);
  if (m) {
    const num = parseFloat(m[1].replace('½','0.5').replace('¼','0.25').replace('¾','0.75'));
    if (!isNaN(num)) {
      const scaled = num * s;
      return `${scaled < 10 ? parseFloat(scaled.toFixed(1)) : Math.round(scaled)} ${m[2]}`.trim();
    }
  }
  return `${portion} ×${s.toFixed(1)}`;
}

function _ampPickMenu(slot) {
  const menus = AMP_SLOT_MENUS[slot];
  return menus[Math.floor(Math.random() * menus.length)];
}

// Format kcal/ml as colour-coded badge
function _ampBadge(val, ok, warn) {
  const col = val>=ok ? 'var(--green)' : val>=warn ? 'var(--amber)' : 'var(--red)';
  return `<span style="color:${col};font-weight:700">${val}</span>`;
}


// ══════════════════════════════════════════════════════════════
// AMP PATIENT SYNC — reads from Adult/Pedi calculators
// ══════════════════════════════════════════════════════════════

let _ampOverrideMode = false;
let _ampSyncedData   = null;  // last synced calc data

// Map diagnosis string → amp-cond value
function _ampDiagToCondition(diag) {
  if (!diag) return 'general';
  const d = diag.toLowerCase();
  if (d.includes('sam') || d.includes('mam') || d.includes('malnutrition') || d.includes('kwash') || d.includes('marasmus')) return 'malnutrition';
  if (d.includes('hiv') || d.includes('tb') || d.includes('tuberculosis') || d.includes('aids')) return 'hiv';
  if (d.includes('renal') || d.includes('kidney') || d.includes('ckd') || d.includes('aki')) return 'renal';
  if (d.includes('diab')) return 'diabetic';
  if (d.includes('burn')) return 'burns';
  if (d.includes('cardiac') || d.includes('heart') || d.includes('chf')) return 'cardiac';
  return 'general';
}

// Map age number → amp-age value  
function _ampAgeGroup(ageYrs) {
  if (!ageYrs) return 'adult';
  if (ageYrs < 5)  return 'toddler';
  if (ageYrs < 18) return 'child';
  return 'adult';
}

function ampSyncFromCalc() {
  const adult = (typeof CALC_SOURCES !== 'undefined') ? CALC_SOURCES.adult?.get() : lastCalcData;
  const pedi  = (typeof CALC_SOURCES !== 'undefined') ? CALC_SOURCES.pedi?.get()  : lastPediCalcData;

  let d = null, src = '';
  if (adult?.energy && pedi?.energy) {
    // Both available — prefer adult unless user just ran pedi
    d = adult; src = 'Adult Calculator';
  } else if (adult?.energy) {
    d = adult; src = 'Adult Calculator';
  } else if (pedi?.energy) {
    d = pedi; src = 'Pediatric Calculator';
  }

  if (!d) {
    showToast('Run Adult or Pediatric calculator first', 'warning');
    return;
  }

  _ampSyncedData = d;

  // Fill requirements bar
  const kcal  = Math.round(d.energy || 0);
  const pro   = Math.round(d.protein || 0);
  const fat   = Math.round(d.fat   || (kcal * 0.30 / 9));
  const cho   = Math.round(d.cho   || (kcal * 0.50 / 4));
  const fluid = Math.round(d.fluid || d.netEnergy * 0 || (parseFloat(d.weight||0) * 35) || 2000);

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('mp-target-kcal',  kcal);
  set('mp-target-pro',   pro);
  set('mp-target-fat',   fat);
  set('mp-target-cho',   cho);
  set('mp-target-fluid', fluid);
  document.getElementById('mp-calc-status').innerHTML =
    `<span style="color:var(--green)"> Synced from ${src}</span>`;

  // Fill override fields (even if hidden — used as fallback)
  set('amp-wt', parseFloat(d.weight || 0) || '');
  const ageEl  = document.getElementById('amp-age');
  const condEl = document.getElementById('amp-cond');
  const ageSrc = parseFloat(d.age || 0);
  if (ageEl)  ageEl.value  = _ampAgeGroup(ageSrc);
  if (condEl) condEl.value = _ampDiagToCondition(d.diagnosis || d.diag || '');

  // Update display banner
  _ampRenderInfoBanner(d, src);

  // Close override panel
  _ampOverrideMode = false;
  const or = document.getElementById('amp-override-row');
  const ob = document.getElementById('amp-override-btn');
  if (or) or.style.display = 'none';
  if (ob) { ob.textContent = '✏ OVERRIDE'; ob.style.color = 'var(--text-dim)'; ob.style.borderColor = 'var(--border)'; }

  showToast(`✓ Patient info synced from ${src}`, 'success');
}

function _ampRenderInfoBanner(d, src) {
  const disp = document.getElementById('amp-info-display');
  if (!disp) return;
  const cond = _ampDiagToCondition(d.diagnosis || d.diag || '');
  const COND_LABELS = { general:'General recovery', malnutrition:'SAM/MAM', hiv:'HIV/TB', renal:'Renal disease', diabetic:'Diabetic', burns:'Burns/High-stress', cardiac:'Cardiac' };
  const pill = (icon, val, col) => `<span style="font-family:var(--mono);font-size:10px;color:${col||'var(--text-bright)'};background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 10px">${icon} ${val}</span>`;
  disp.innerHTML = `
    <span style="font-family:var(--mono);font-size:9px;color:var(--green)"> ${src}</span>
    ${d.patientName ? pill('', d.patientName.split(' ')[0], 'var(--text-bright)') : ''}
    ${d.weight      ? pill('', d.weight+'kg') : ''}
    ${d.age         ? pill('', d.age+'y') : ''}
    ${d.sex         ? pill('', d.sex) : ''}
    ${pill('', (d.diagnosis || 'General').replace(/_/g,' '), 'var(--teal)')}
    ${pill('', Math.round(d.energy||0)+' kcal', 'var(--amber)')}
    ${pill('', Math.round(d.protein||0)+'g pro', 'var(--blue)')}
  `;
  const srcEl = document.getElementById('amp-sync-source');
  if (srcEl) srcEl.textContent = ' ' + src;
}

function ampToggleOverride() {
  _ampOverrideMode = !_ampOverrideMode;
  const or = document.getElementById('amp-override-row');
  const ob = document.getElementById('amp-override-btn');
  if (or) or.style.display = _ampOverrideMode ? '' : 'none';
  if (ob) {
    ob.textContent   = _ampOverrideMode ? '✕ CLOSE' : '✏ OVERRIDE';
    ob.style.color   = _ampOverrideMode ? 'var(--teal)' : 'var(--text-dim)';
    ob.style.borderColor = _ampOverrideMode ? 'rgba(29,233,212,0.4)' : 'var(--border)';
  }
}

// Get weight/age/cond — prefers synced data, falls back to override inputs
function ampGetPatientData() {
  const overWt   = parseFloat(document.getElementById('amp-wt')?.value)   || 0;
  const overAge  = document.getElementById('amp-age')?.value  || 'adult';
  const overCond = document.getElementById('amp-cond')?.value || 'general';

  if (_ampSyncedData) {
    return {
      wt:   overWt || parseFloat(_ampSyncedData.weight || 0),
      age:  overAge,
      cond: overCond,
    };
  }
  return { wt: overWt, age: overAge, cond: overCond };
}

// Auto-sync when switching to mealplan tab (if calc data available)
function _ampAutoSync() {
  const adult = (typeof CALC_SOURCES !== 'undefined') ? CALC_SOURCES.adult?.get() : lastCalcData;
  const pedi  = (typeof CALC_SOURCES !== 'undefined') ? CALC_SOURCES.pedi?.get()  : lastPediCalcData;
  if ((adult?.energy || pedi?.energy) && !_ampSyncedData) {
    ampSyncFromCalc();
  }
}

// ── UNIFIED NUTRITION ANALYSIS ENGINE ────────────────────────────────
// Builds a full inline analysis panel from any source (generated or manual)
function mpBuildAnalysisHTML(totKcal, totPro, totCho, totFat, targetKcal, targetPro, targetFluid, source) {
  totKcal = Math.round(totKcal); totPro = Math.round(totPro);
  totCho  = Math.round(totCho);  totFat = Math.round(totFat);
  const hasMacro = (totCho > 0 || totFat > 0);
  const macroKcal = totCho*4 + totPro*4 + totFat*9;
  const choPctE = hasMacro && macroKcal>0 ? Math.round(totCho*4/macroKcal*100) : null;
  const proPctE = hasMacro && macroKcal>0 ? Math.round(totPro*4/macroKcal*100) : null;
  const fatPctE = hasMacro && macroKcal>0 ? Math.round(totFat*9/macroKcal*100) : null;
  const kcalPct = targetKcal>0 ? Math.round(totKcal/targetKcal*100) : null;
  const proPct  = targetPro >0 ? Math.round(totPro /targetPro *100) : null;
  const _col = p => p===null?'var(--text-dim)':p>=90&&p<=115?'var(--green)':p<75?'var(--red)':'var(--amber)';
  const _lbl = p => p===null?'—':p>=90&&p<=115?' Adequate':p<75?' Below target':' Marginal';
  const _driLbl = (p, lo, hi) => p===null?'—':p>=lo&&p<=hi?` Within DRI (${lo}–${hi}%E)`:p<lo?` Below ${lo}%E`:` Above ${hi}%E`;

  const macroDistHTML = hasMacro ? `
    <div style="font-family:var(--mono);font-size:8.5px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px;margin-top:2px">MACRONUTRIENT DISTRIBUTION (%E) vs WHO/DRI Ranges</div>
    <div style="margin-bottom:7px">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:9.5px">
        <span style="color:var(--text-dim);flex-shrink:0"> Carbohydrate</span>
        <span style="color:var(--amber);overflow-wrap:break-word;word-break:break-word;text-align:right">${choPctE}%E · ${totCho}g · ${totCho*4} kcal · ${_driLbl(choPctE,45,65)}</span>
      </div>
      <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:4px"><div style="height:100%;width:${Math.min(choPctE,100)}%;background:var(--amber);border-radius:4px;transition:width .5s"></div></div>
    </div>
    <div style="margin-bottom:7px">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:9.5px">
        <span style="color:var(--text-dim);flex-shrink:0">Protein</span>
        <span style="color:var(--blue);overflow-wrap:break-word;word-break:break-word;text-align:right">${proPctE}%E · ${totPro}g · ${totPro*4} kcal · ${_driLbl(proPctE,10,35)}</span>
      </div>
      <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:4px"><div style="height:100%;width:${Math.min(proPctE,100)}%;background:var(--blue);border-radius:4px;transition:width .5s"></div></div>
    </div>
    <div style="margin-bottom:12px">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:9.5px">
        <span style="color:var(--text-dim);flex-shrink:0"> Fat</span>
        <span style="color:var(--green);overflow-wrap:break-word;word-break:break-word;text-align:right">${fatPctE}%E · ${totFat}g · ${totFat*9} kcal · ${_driLbl(fatPctE,20,35)}</span>
      </div>
      <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:4px"><div style="height:100%;width:${Math.min(fatPctE,100)}%;background:var(--green);border-radius:4px;transition:width .5s"></div></div>
    </div>` : `<div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-bottom:12px;padding:8px;background:rgba(255,255,255,0.03);border-radius:6px">ℹ CHO/Fat breakdown not available for formula-based plans — macro %E distribution requires food-item level data.</div>`;

  const gapKcal = targetKcal>0 ? targetKcal - totKcal : 0;
  const gapPro  = targetPro >0 ? targetPro  - totPro  : 0;
  const gapHTML = gapKcal>0 && gapKcal > targetKcal*0.1 ? `
    <div style="background:rgba(251,113,133,0.07);border:1px solid rgba(251,113,133,0.3);border-radius:8px;padding:10px 12px;font-family:var(--mono);font-size:10px;color:var(--red);line-height:1.8;margin-top:4px">
       <strong>Energy gap: ${gapKcal} kcal</strong> below target.
      ${gapPro > targetPro*0.1 ? `&nbsp;|&nbsp; <strong>Protein gap: ${gapPro}g</strong>.` : ''}
      <br>ONS bridge: Fresubin Energy 200mL ×${Math.ceil(gapKcal/300)} = ~${Math.ceil(gapKcal/300)*300} kcal &nbsp;|&nbsp; Ensure Plus 237mL ×${Math.ceil(gapKcal/350)} = ~${Math.ceil(gapKcal/350)*350} kcal
    </div>` : kcalPct!==null && kcalPct>=90 ? `
    <div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.25);border-radius:8px;padding:10px 12px;font-family:var(--mono);font-size:10px;color:var(--green);line-height:1.8;margin-top:4px">
       Energy target met (${kcalPct}% of ${targetKcal} kcal).
      ${proPct!==null ? proPct>=90 ? '&nbsp;Protein target met ' : `&nbsp; Protein ${proPct}% of target — add protein-rich foods or protein supplement.` : ''}
      ${targetFluid>0?`<br> Fluid target: <strong>${targetFluid} mL/day</strong> — advise 6–8 cups water/oral fluids.`:''}
    </div>` : '';

  const fluidOnlyHTML = (!gapHTML || gapKcal<=0) && targetFluid>0 && kcalPct===null ? `
    <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:8px"> Fluid target: <strong>${targetFluid} mL/day</strong>.</div>` : '';

  return `<div style="margin-top:16px;background:rgba(5,15,35,0.75);border:1px solid rgba(29,233,212,0.35);border-radius:12px;padding:16px">
    <div style="font-family:var(--cond);font-size:11px;font-weight:800;letter-spacing:2px;color:var(--teal);margin-bottom:14px">NUTRITION ANALYSIS — ${source}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:14px">
      ${_mpAnaCard('Energy', totKcal, 'kcal', targetKcal>0?'target: '+targetKcal+' kcal':'no target set', kcalPct, _col(kcalPct), _lbl(kcalPct))}
      ${_mpAnaCard('Protein', totPro, 'g', targetPro>0?'target: '+targetPro+'g':'no target set', proPct, _col(proPct), _lbl(proPct))}
      ${hasMacro ? _mpAnaCard('CHO', totCho, 'g', (totCho*4)+' kcal · '+choPctE+'%E', choPctE, choPctE>=45&&choPctE<=65?'var(--green)':'var(--amber)', _driLbl(choPctE,45,65)) : ''}
      ${hasMacro ? _mpAnaCard(' Fat', totFat, 'g', (totFat*9)+' kcal · '+fatPctE+'%E', fatPctE, fatPctE>=20&&fatPctE<=35?'var(--green)':'var(--amber)', _driLbl(fatPctE,20,35)) : ''}
    </div>
    ${macroDistHTML}
    ${gapHTML}${fluidOnlyHTML}
    <div style="font-family:var(--mono);font-size:8px;color:var(--text-muted);margin-top:10px;line-height:1.7">
      Reference: DRI macronutrient ranges: CHO 45–65%E · Protein 10–35%E · Fat 20–35%E (IOM/WHO). Clinical adequacy: ≥90% of target = adequate. Sources: ASPEN 2016 / ASPEN 2022 · ESPEN 2019 · Malawi FCT.
    </div>
  </div>`;
}

function _mpAnaCard(label, val, unit, sub, pct, col, statusLabel) {
  const barW = pct!==null ? Math.min(Math.max(pct,0), 100) : 0;
  return `<div style="background:rgba(8,18,36,0.55);border:1px solid rgba(56,100,168,0.2);border-radius:9px;padding:11px 12px">
    <div style="font-family:var(--mono);font-size:8px;letter-spacing:1.2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:5px">${label}</div>
    <div style="font-family:var(--mono);font-size:21px;font-weight:800;color:${col};line-height:1.1;margin-bottom:2px">${val}<span style="font-size:10px;font-weight:400;margin-left:3px;color:var(--text-dim)">${unit}</span></div>
    <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-muted);margin-bottom:7px;overflow-wrap:break-word;word-break:break-word">${sub}</div>
    ${pct!==null?`<div style="height:4px;background:rgba(255,255,255,0.06);border-radius:3px;margin-bottom:5px"><div style="height:100%;width:${barW}%;background:${col};border-radius:3px"></div></div>`:''}
    <div style="font-family:var(--mono);font-size:8px;color:${col}">${statusLabel}</div>
  </div>`;
}

// Trigger analysis from Manual Meal Builder
function mpRunManualAnalysis() {
  let totKcal=0,totPro=0,totCho=0,totFat=0;
  Object.values(mpData).forEach(items=>(items||[]).forEach(i=>{totKcal+=i.kcal;totPro+=i.pro;totCho+=i.cho;totFat+=i.fat;}));
  if (totKcal === 0) { if(typeof showToast==='function') showToast('Add food items first to analyse','warning'); return; }
  const tk = parseFloat(document.getElementById('mp-target-kcal')?.value)||0;
  const tp = parseFloat(document.getElementById('mp-target-pro')?.value)||0;
  const tf = parseFloat(document.getElementById('mp-target-fluid')?.value)||0;
  const panel = document.getElementById('mp-manual-analysis-out');
  if (panel) {
    panel.innerHTML = mpBuildAnalysisHTML(totKcal,totPro,totCho,totFat,tk,tp,tf,'MANUAL MEAL BUILDER');
    panel.style.display='';
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
}

function ampGenerate() {
  const kcalTarget  = parseFloat(document.getElementById('mp-target-kcal')?.value)  || 0;
  const proTarget   = parseFloat(document.getElementById('mp-target-pro')?.value)   || 0;
  const fluidTarget = parseFloat(document.getElementById('mp-target-fluid')?.value) || 2000;
  const _pd         = ampGetPatientData();
  const wt          = _pd.wt;
  const cond        = _pd.cond;
  const feedType    = document.getElementById('amp-feed-type')?.value || 'commercial';
  const delivery    = document.getElementById('amp-delivery')?.value || 'continuous';
  const oralPct     = parseInt(document.getElementById('amp-oral-pct')?.value || '50') / 100;

  if (!kcalTarget) {
    if (typeof showToast==='function') showToast('Enter or sync energy target first (Requirements bar above)','warning');
    return;
  }

  const out = document.getElementById('amp-output');
  if (!out) return;

  if (_ampMode === 'oral')    { _ampGenOral(kcalTarget, proTarget, fluidTarget, cond, out); }
  else if (_ampMode==='enteral') { _ampGenEnteral(kcalTarget, proTarget, fluidTarget, feedType, delivery, wt, cond, out); }
  else                         { _ampGenMixed(kcalTarget, proTarget, fluidTarget, feedType, delivery, wt, cond, oralPct, out); }

  out.style.display = '';
  out.scrollIntoView({ behavior:'smooth', block:'nearest' });
  if (typeof showToast==='function') showToast('Meal plan generated — review below','success');
}

// ── ORAL GENERATOR ───────────────────────────────────────────────────
function _ampGenOral(kcalTarget, proTarget, fluidTarget, cond, out) {
  // Adjust targets for condition
  let condNote = '';
  if (cond==='malnutrition') { condNote='<div style="background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.3);border-radius:7px;padding:10px;font-family:var(--mono);font-size:10px;color:var(--amber);margin-bottom:12px"> SAM/MAM: Start at 60–80 kcal/kg. Advance slowly. Use F-75/F-100/RUTF per IMAM protocol.</div>'; }
  if (cond==='renal')       { condNote='<div style="background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.3);border-radius:7px;padding:10px;font-family:var(--mono);font-size:10px;color:var(--red);margin-bottom:12px"> Renal: protein limited. Avoid high-K foods (banana, avocado, sweet potato) if hyperkalaemic.</div>'; }
  if (cond==='diabetic')    { condNote='<div style="background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.3);border-radius:7px;padding:10px;font-family:var(--mono);font-size:10px;color:var(--blue);margin-bottom:12px"> Diabetic: Distribute CHO evenly. No concentrated sweets. Choose moderate-GI starches.</div>'; }

  // Build meals
  const newMpData = {};
  let totalKcal=0, totalPro=0;
  const mealHtml = [];

  for (let mi=0; mi<6; mi++) {
    const mealKcalTarget = kcalTarget * AMP_MEAL_PROPS[mi];
    if (mealKcalTarget < 20) { newMpData[mi]=[]; continue; }
    const foodKeys = _ampPickMenu(mi);
    const items    = _ampScaleMeal(foodKeys, mealKcalTarget);
    newMpData[mi]  = items;
    const mKcal = items.reduce((s,i)=>s+i.kcal, 0);
    const mPro  = items.reduce((s,i)=>s+i.pro,  0);
    const mFat  = items.reduce((s,i)=>s+i.fat,  0);
    const mCho  = items.reduce((s,i)=>s+i.cho,  0);
    totalKcal += mKcal;
    totalPro  += mPro;

    const itemRows = items.map(i=>`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:1px solid rgba(56,100,168,0.08);flex-wrap:wrap;gap:4px">
        <div style="min-width:0;flex:1">
          <div style="font-family:var(--mono);font-size:11.5px;color:var(--text-bright);font-weight:600">${i.name}</div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:1px"> ${i.amount}</div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0;padding-top:2px">
          <span style="font-family:var(--mono);font-size:9px;background:rgba(240,180,41,0.1);border:1px solid rgba(240,180,41,0.25);color:var(--amber);padding:1px 7px;border-radius:8px">${i.kcal}</span>
          <span style="font-family:var(--mono);font-size:9px;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);color:var(--blue);padding:1px 7px;border-radius:8px">P ${i.pro}g</span>
          <span style="font-family:var(--mono);font-size:9px;background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.2);color:var(--red);padding:1px 7px;border-radius:8px">F ${i.fat}g</span>
          <span style="font-family:var(--mono);font-size:9px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);color:var(--green);padding:1px 7px;border-radius:8px">C ${i.cho}g</span>
        </div>
      </div>`).join('');

    mealHtml.push(`
      <div style="background:rgba(8,18,36,0.6);border:1px solid rgba(56,100,168,0.2);border-radius:10px;padding:12px 14px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
          <div style="font-family:var(--cond);font-size:12px;font-weight:700;letter-spacing:1.5px;color:var(--text-bright)">${AMP_MEAL_ICONS[mi]} ${AMP_MEAL_LABELS[mi].toUpperCase()}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:9.5px;background:rgba(240,180,41,0.12);border:1px solid rgba(240,180,41,0.25);color:var(--amber);padding:2px 9px;border-radius:10px">${mKcal} kcal</span>
            <span style="font-family:var(--mono);font-size:9.5px;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.25);color:var(--blue);padding:2px 9px;border-radius:10px">P ${mPro.toFixed(1)}g</span>
            <span style="font-family:var(--mono);font-size:9.5px;background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.2);color:var(--red);padding:2px 9px;border-radius:10px">F ${mFat.toFixed(1)}g</span>
            <span style="font-family:var(--mono);font-size:9.5px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);color:var(--green);padding:2px 9px;border-radius:10px">C ${mCho.toFixed(1)}g</span>
          </div>
        </div>
        ${itemRows}
      </div>`);
  }

  // Adequacy check
  const kcalPct = kcalTarget > 0 ? Math.round(totalKcal/kcalTarget*100) : 0;
  const proPct  = proTarget  > 0 ? Math.round(totalPro /proTarget *100) : 0;
  const kcalOk  = kcalPct >= 90 && kcalPct <=115;
  const proOk   = proPct  >= 90;
  // Compute total fat & cho across all meals
  const totalFat = parseFloat(Object.values(newMpData).flat().reduce((s,i)=>s+(i.fat||0),0).toFixed(1));
  const totalCho = parseFloat(Object.values(newMpData).flat().reduce((s,i)=>s+(i.cho||0),0).toFixed(1));

  // Safety flags
  const flags = [];
  if (!kcalOk) flags.push(`<li>Energy ${kcalOk?'':''} ${totalKcal} kcal = <strong>${kcalPct}%</strong> of ${kcalTarget} kcal target${kcalPct<80?' — <span style="color:var(--red)">BELOW TARGET</span>':''}</li>`);
  if (!proOk)  flags.push(`<li>Protein ${proOk?'':''} ${totalPro.toFixed(0)}g = <strong>${proPct}%</strong> of ${proTarget}g target${proPct<80?' — <span style="color:var(--red)">BELOW TARGET</span>':''}</li>`);
  if (fluidTarget>0) flags.push(`<li> Hydration reminder: target <strong>${fluidTarget} mL/day</strong> fluid — ensure 6–8 cups water/day in addition to milk and fluids in meals</li>`);

  const flagHtml = flags.length ? `<ul style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:2;padding-left:18px;margin:0">${flags.join('')}</ul>` : '';

  out.innerHTML = `
    <div style="border-top:1px solid rgba(29,233,212,0.2);padding-top:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <div style="font-family:var(--cond);font-size:13px;font-weight:700;letter-spacing:2px;color:var(--teal)"> DAILY ORAL MEAL PLAN</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <span style="font-family:var(--mono);font-size:9.5px;background:rgba(240,180,41,0.12);border:1px solid rgba(240,180,41,0.25);color:var(--amber);padding:3px 12px;border-radius:12px">${totalKcal} kcal (${kcalPct}%)</span>
          <span style="font-family:var(--mono);font-size:9.5px;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.2);color:var(--blue);padding:3px 12px;border-radius:12px">P ${totalPro.toFixed(0)}g (${proPct}%)</span>
          <span style="font-family:var(--mono);font-size:9.5px;background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.2);color:var(--red);padding:3px 12px;border-radius:12px">F ${totalFat}g</span>
          <span style="font-family:var(--mono);font-size:9.5px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);color:var(--green);padding:3px 12px;border-radius:12px">C ${totalCho}g</span>
        </div>
      </div>
      ${condNote}
      ${mealHtml.join('')}
      ${flagHtml ? `<div style="background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);border-radius:8px;padding:12px;margin-top:8px">${flagHtml}</div>` : ''}
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button onclick="ampApplyToPlanner()" style="flex:1;min-width:140px;padding:10px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;border-radius:8px;border:2px solid rgba(52,211,153,0.5);background:rgba(52,211,153,0.1);color:var(--green);cursor:pointer"> APPLY TO MEAL PLANNER</button>
        <button onclick="ampGenerate()" style="flex:1;min-width:120px;padding:10px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;border-radius:8px;border:1px solid var(--border);background:var(--surface3);color:var(--text-dim);cursor:pointer">↺ REGENERATE</button>
      </div>
      ${mpBuildAnalysisHTML(totalKcal,totalPro,totalCho,totalFat,kcalTarget,proTarget,fluidTarget,'GENERATED ORAL PLAN')}
    </div>`;

  // Store generated plan for apply
  window._ampGeneratedData = newMpData;
}

// ── ENTERAL GENERATOR ────────────────────────────────────────────────
function _ampGenEnteral(kcalTarget, proTarget, fluidTarget, feedType, delivery, wt, cond, out) {
  // Choose formula concentrations based on feed type
  const formulas = {
    commercial: { name:'Standard commercial formula', kcalMl:1.0,  proL:40,  note:'e.g. Fresubin Original / Nutrison Standard' },
    lowres:     { name:'Low-resource: Milk + Likuni Phala (standard recipe)', kcalMl:0.96, proL:32, note:'600ml milk + 300ml Likuni Phala + 30ml oil + 20g sugar per 1000ml' },
    blend:      { name:'Blenderized local food formula', kcalMl:0.90, proL:28, note:'See Blenderized Feed module for exact recipe' },
  };
  const formula = formulas[feedType] || formulas.commercial;
  const volDay  = kcalTarget / formula.kcalMl;
  const proDay  = (volDay / 1000) * formula.proL;
  const rate24  = (volDay / 24).toFixed(0);
  const rate20  = (volDay / 20).toFixed(0);
  const bolusMl = (volDay / 6).toFixed(0);
  const halfRate= (parseFloat(rate24)/2).toFixed(0);
  const kcalDel = (volDay * formula.kcalMl).toFixed(0);
  const proPct  = proTarget > 0 ? Math.round(proDay/proTarget*100) : '—';

  let specialNote = '';
  if (cond==='renal')    specialNote='<div style="background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.3);border-radius:7px;padding:10px 12px;font-family:var(--mono);font-size:10px;color:var(--red);margin-bottom:10px"> Renal: Consider renal-specific formula (Fresubin Renal / Nepro). Limit protein to 0.6–0.8g/kg if non-dialysis.</div>';
  if (cond==='diabetic') specialNote='<div style="background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.3);border-radius:7px;padding:10px 12px;font-family:var(--mono);font-size:10px;color:var(--blue);margin-bottom:10px"> Diabetic: Consider Nutrison Diason or Fresubin Diabetes. Spread feeds evenly across 24h.</div>';
  if (cond==='burns')    specialNote='<div style="background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.3);border-radius:7px;padding:10px 12px;font-family:var(--mono);font-size:10px;color:var(--amber);margin-bottom:10px"> High Stress/Burns: Consider high-protein formula (Supportan / Fresubin HP). Reassess energy needs daily using Curreri formula.</div>';

  const contHtml = `
    <div style="background:rgba(29,233,212,0.04);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:14px;margin-bottom:10px">
      <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:1.5px;color:var(--teal);margin-bottom:10px">CONTINUOUS FEEDING</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">
        ${_ampStatBox('Total Volume',Math.round(volDay),'mL/day','var(--teal)')}
        ${_ampStatBox('Rate (24h)',rate24,'mL/hr','var(--teal)')}
        ${_ampStatBox('Rate (20h)',rate20,'mL/hr','var(--blue)')}
        ${_ampStatBox('Starter rate',halfRate,'mL/hr (Day 1–2)','var(--amber)')}
        ${_ampStatBox('Energy',kcalDel,'kcal/day','var(--amber)')}
        ${_ampStatBox('Protein',proDay.toFixed(0)+'g','/ day ('+proPct+'%)','var(--blue)')}
      </div>
    </div>`;

  const bolusHtml = `
    <div style="background:rgba(96,165,250,0.04);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:14px;margin-bottom:10px">
      <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:1.5px;color:var(--blue);margin-bottom:10px">BOLUS SCHEDULE (6 feeds/day)</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">
        ${_ampStatBox('Feeds/day','6','(every 4 hrs)','var(--blue)')}
        ${_ampStatBox('Volume/feed',bolusMl,'mL','var(--blue)')}
        ${_ampStatBox('Energy',kcalDel,'kcal/day','var(--amber)')}
        ${_ampStatBox('Protein',proDay.toFixed(0)+'g','/ day ('+proPct+'%)','var(--blue)')}
      </div>
      <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:8px">Schedule: 06:00 · 10:00 · 14:00 · 18:00 · 22:00 · 02:00 (or adjust to ward routine)</div>
    </div>`;

  out.innerHTML = `
    <div style="border-top:1px solid rgba(29,233,212,0.2);padding-top:16px">
      <div style="font-family:var(--cond);font-size:13px;font-weight:700;letter-spacing:2px;color:var(--teal);margin-bottom:12px"> ENTERAL TUBE FEEDING PLAN</div>
      ${specialNote}
      <div style="background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-family:var(--mono);font-size:10px;color:var(--text)">
        <strong style="color:var(--teal)">Formula:</strong> ${formula.name}<br>
        <strong style="color:var(--teal)">Concentration:</strong> ${formula.kcalMl} kcal/mL · ${formula.proL}g protein/L<br>
        <em style="color:var(--text-dim)">${formula.note}</em>
      </div>
      ${delivery === 'bolus' ? bolusHtml : contHtml}
      ${delivery === 'continuous' ? bolusHtml : contHtml}
      <div style="background:rgba(240,180,41,0.07);border:1px solid rgba(240,180,41,0.25);border-radius:8px;padding:11px 14px;font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.9;margin-top:4px">
        <strong style="color:var(--amber)"> Tube safety reminders:</strong><br>
        • Flush tube with 30–50 mL clean boiled water before &amp; after each feed<br>
        • Starter rate Day 1–2: <strong>${halfRate} mL/hr</strong> — advance to full rate if tolerating well<br>
        • Monitor tolerance: nausea, vomiting, abdominal distension, diarrhoea — assess clinically before each feed<br>
        • Routine GRV measurement not recommended (ASPEN/SCCM 2016). For ward/community EN, hold feed if patient vomits or reports significant discomfort — reassess position and tolerance<br>
        • Target fluid: <strong>${Math.round(fluidTarget)} mL/day</strong> (include formula water content)
      </div>
      ${mpBuildAnalysisHTML(parseFloat(kcalDel), parseFloat(proDay), 0, 0, kcalTarget, proTarget, fluidTarget, 'GENERATED ENTERAL PLAN')}
    </div>`;
}

// ── MIXED GENERATOR ──────────────────────────────────────────────────
function _ampGenMixed(kcalTarget, proTarget, fluidTarget, feedType, delivery, wt, cond, oralPct, out) {
  const oralKcal    = Math.round(kcalTarget * oralPct);
  const enteralKcal = kcalTarget - oralKcal;
  const oralPro     = Math.round(proTarget * oralPct);
  const enteralPro  = proTarget - oralPro;
  const enteralFluid= Math.round(fluidTarget * (1-oralPct));

  // Make two sub-containers, generate into each
  const oralDiv    = { innerHTML: '' };
  const enteralDiv = { innerHTML: '' };
  _ampGenOral(oralKcal, oralPro, 0, cond, oralDiv);
  _ampGenEnteral(enteralKcal, enteralPro, enteralFluid, feedType, delivery, wt, cond, enteralDiv);

  // Compute combined oral totals for analysis
  const _mixOralItems = Object.values(window._ampGeneratedData || {}).flat();
  const _mixTotKcal = oralKcal + enteralKcal;
  const _mixTotPro  = oralPro  + enteralPro;
  const _mixTotCho  = _mixOralItems.reduce((s,i)=>s+(i.cho||0),0);
  const _mixTotFat  = _mixOralItems.reduce((s,i)=>s+(i.fat||0),0);

  out.innerHTML = `
    <div style="border-top:1px solid rgba(29,233,212,0.2);padding-top:16px">
      <div style="font-family:var(--cond);font-size:13px;font-weight:700;letter-spacing:2px;color:var(--teal);margin-bottom:6px"> MIXED ORAL + ENTERAL PLAN</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-bottom:14px">
        Oral: <strong style="color:var(--teal)">${oralPct*100}%</strong> (${oralKcal} kcal · ${oralPro}g protein) &nbsp;|&nbsp;
        Enteral: <strong style="color:var(--blue)">${Math.round((1-oralPct)*100)}%</strong> (${enteralKcal} kcal · ${enteralPro}g protein)
      </div>
      <div style="background:rgba(8,18,36,0.4);border:1px solid rgba(56,100,168,0.2);border-radius:10px;padding:14px;margin-bottom:10px">
        ${oralDiv.innerHTML}
      </div>
      <div style="background:rgba(8,18,36,0.4);border:1px solid rgba(96,165,250,0.15);border-radius:10px;padding:14px;margin-bottom:10px">
        ${enteralDiv.innerHTML}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="ampApplyToPlanner()" style="flex:1;min-width:140px;padding:10px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;border-radius:8px;border:2px solid rgba(52,211,153,0.5);background:rgba(52,211,153,0.1);color:var(--green);cursor:pointer"> APPLY ORAL PART TO PLANNER</button>
        <button onclick="ampGenerate()" style="flex:1;min-width:120px;padding:10px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;border-radius:8px;border:1px solid var(--border);background:var(--surface3);color:var(--text-dim);cursor:pointer">↺ REGENERATE</button>
      </div>
      ${mpBuildAnalysisHTML(_mixTotKcal, _mixTotPro, _mixTotCho, _mixTotFat, kcalTarget, proTarget, fluidTarget, 'GENERATED MIXED PLAN (COMBINED)')}
    </div>`;
}

function _ampStatBox(label, value, unit, col) {
  return `<div style="background:rgba(8,18,36,0.6);border:1px solid rgba(56,100,168,0.15);border-radius:8px;padding:10px;text-align:center">
    <div style="font-family:var(--mono);font-size:20px;font-weight:700;color:${col}">${value}</div>
    <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;margin-top:2px">${label}</div>
    <div style="font-family:var(--mono);font-size:8px;color:var(--text-muted);margin-top:1px">${unit}</div>
  </div>`;
}

// Apply generated oral plan to the interactive meal planner below
function ampApplyToPlanner() {
  if (!window._ampGeneratedData) {
    if (typeof showToast==='function') showToast('Generate an oral plan first','warning');
    return;
  }
  mpData = JSON.parse(JSON.stringify(window._ampGeneratedData));
  renderMpMeals();
  updateMpTotals();
  document.getElementById('mp-meals-grid')?.scrollIntoView({ behavior:'smooth', block:'start' });
  if (typeof showToast==='function') showToast('Plan applied — edit portions below as needed','success');
}

// Initialise mode on page load
document.addEventListener('DOMContentLoaded', function() {
  ampSetMode('oral');
  ampShowCondFlags();
});

/* ═══════════════════════════════════════════════════════════════
   CONTROLLED COPY — JS layer
   • copyResultsToClipboard(containerId, label) — shared utility
   • injectCopyButtons() — adds "Copy Results" buttons to all
     result sections once they are rendered
   • MutationObserver re-runs injection when hidden sections
     become visible (display: none → block)
   ═══════════════════════════════════════════════════════════════ */
(function() {

  /* ── Utility: extract plain text from a result container ── */
  window.copyResultsToClipboard = function(containerId, label) {
    const el = document.getElementById(containerId);
    if (!el) { showToast('No results to copy', 'warning'); return; }
    const text = (el.innerText || el.textContent || '').trim();
    if (!text) { showToast('No results to copy yet', 'warning'); return; }

    // Prepend a header line for context
    const header = `Oasis — ${label || 'Results'}\n${'─'.repeat(48)}\n`;
    const fullText = header + text;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText)
        .then(() => { showToast('✓ Results copied to clipboard', 'success'); })
        .catch(() => _fallbackCopy(fullText));
    } else {
      _fallbackCopy(fullText);
    }
  };

  function _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try {
      document.execCommand('copy');
      showToast('✓ Results copied to clipboard', 'success');
    } catch(e) {
      showToast('Copy failed — select text manually', 'error');
    }
    document.body.removeChild(ta);
  }

  /* ── Button factory ── */
  function makeCopyBtn(containerId, label) {
    const btn = document.createElement('button');
    btn.className = 'nt-copy-btn';
    btn.setAttribute('aria-label', 'Copy ' + label);
    btn.innerHTML = '<span style="font-size:12px">⎘</span> COPY RESULTS';
    btn.addEventListener('click', function() {
      window.copyResultsToClipboard(containerId, label);
      btn.classList.add('copied');
      btn.innerHTML = '<span style="font-size:12px">✓</span> COPIED!';
      setTimeout(function() {
        btn.classList.remove('copied');
        btn.innerHTML = '<span style="font-size:12px">⎘</span> COPY RESULTS';
      }, 2200);
    });
    return btn;
  }

  /* ── Descriptor map: containerId → {label, headerSelector} ──
     headerSelector: where to inject the button (appended to first
     matching child — usually the section header row)              */
  const RESULT_SECTIONS = [
    { id: 'results-section',       label: 'Adult Calculator Results',   headerSel: null },
    { id: 'en-results',            label: 'Enteral Feeding Results',     headerSel: null },
    { id: 'pt-results',            label: 'Preterm Results',            headerSel: null },
    { id: 'nn-results',            label: 'Neonate Results',            headerSel: null },
    { id: 'ie-results',            label: 'Infant/Early Child Results', headerSel: null },
    { id: 'il-results',            label: 'Infant/Late Child Results',  headerSel: null },
    { id: 'c10-results',           label: 'Child (10–15yr) Results',    headerSel: null },
    { id: 'ad-results',            label: 'Adolescent Results',         headerSel: null },
    { id: 'uc-results',            label: 'Unclassified Results',       headerSel: null },
    { id: 'amp-output',            label: 'Auto Meal Plan',             headerSel: null },
    { id: 'recall-totals-panel',   label: '24hr Recall Totals',        headerSel: null },
    { id: 'mp-totals-card',        label: 'Meal Plan Totals',           headerSel: null },
    { id: 'mp-manual-analysis-out',label: 'Meal Plan Analysis',         headerSel: null },
  ];

  /* ── Inject a button into a section if not already present ── */
  function injectBtn(cfg) {
    const el = document.getElementById(cfg.id);
    if (!el) return;
    // Skip if already injected or section is empty
    if (el.querySelector('.nt-copy-btn')) return;
    if (!el.innerText.trim()) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:10px';
    wrapper.appendChild(makeCopyBtn(cfg.id, cfg.label));

    // Insert at top of container
    el.insertBefore(wrapper, el.firstChild);
  }

  /* ── Run injection across all sections ── */
  function injectAll() {
    RESULT_SECTIONS.forEach(injectBtn);
  }

  /* ── MutationObserver: watch for content appearing in result
     sections (they start as display:none / empty) ── */
  var observer = new MutationObserver(function(mutations) {
    var shouldRun = mutations.some(function(m) {
      // Only act when child nodes are added or style/display changes
      return m.type === 'childList' || m.type === 'attributes';
    });
    if (shouldRun) injectAll();
  });

  // Observe each result container
  function startObserving() {
    RESULT_SECTIONS.forEach(function(cfg) {
      var el = document.getElementById(cfg.id);
      if (el) {
        observer.observe(el, {
          childList: true, subtree: false,
          attributes: true, attributeFilter: ['style', 'class']
        });
      }
    });
    // Also observe body for dynamically rendered pedi/enteral sections
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Initial run + start observing after DOM settles
  setTimeout(function() { injectAll(); startObserving(); }, 800);

})();



// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL FOOD SEARCH — API Fallback UI Helpers
// Called by dbRender() when local DB has no match.
// ══════════════════════════════════════════════════════════════════════════════

const _GS_PANEL_ID = 'db-global-results-panel';
let   _GS_debounceTimer = null;

/** Remove the global results panel if present */
function _dbClearGlobalPanel() {
  const el = document.getElementById(_GS_PANEL_ID);
  if (el) el.remove();
}

/** Render a single unified food object into the global results panel */
function _dbRenderGlobalResult(food) {
  _dbClearGlobalPanel();

  const sourceColors = {
    local:         'var(--teal)',
    regional:      'var(--amber)',
    chakudya:      'var(--blue)',
    combined:      'var(--green)',
  };
  const srcColor  = sourceColors[food.sourceUsed] || 'var(--text-dim)';
  const srcLabel  = {
    local:'Local DB', regional:'Regional FCT', chakudya:'Chakudya (CNR)', combined:'Combined'
  }[food.sourceUsed] || food.sourceUsed;

  const confidence = Math.round((food.confidenceScore ?? 0) * 100);
  const updated    = food.lastUpdated ? `<span style="color:var(--text-dim);font-size:9px">Updated: ${food.lastUpdated}</span>` : '';
  const fiber      = food.fiber  != null ? `<div style="font-size:10px;color:var(--text-dim)">Fiber: <b>${food.fiber}g</b></div>` : '';
  const sugar      = food.sugar  != null ? `<div style="font-size:10px;color:var(--text-dim)">Sugar: <b>${food.sugar}g</b></div>` : '';
  const sodium     = food.sodium != null ? `<div style="font-size:10px;color:var(--text-dim)">Sodium: <b>${(food.sodium*1000).toFixed(0)}mg</b></div>` : '';

  const panel = document.createElement('div');
  panel.id    = _GS_PANEL_ID;
  panel.style.cssText = 'margin-top:14px';
  panel.innerHTML = `
    <div class="card" style="border:1px solid ${srcColor}40">
      <div class="card-header">
        <div class="card-title" style="color:${srcColor}"> Global Search Result</div>
        <div class="card-badge" style="color:${srcColor};border-color:${srcColor}40">
          ${srcLabel} · ${confidence}% match
        </div>
      </div>
      <div class="card-body" style="padding:14px">
        <div style="font-weight:700;font-size:14px;color:var(--text-bright);margin-bottom:6px">${food.name}</div>
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:10px">${food.cat || ''} ${updated}</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;text-align:center;margin-bottom:10px">
          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">
            <div style="font-size:18px;font-weight:700;color:var(--amber)">${food.kcal ?? '—'}</div>
            <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px">kcal</div>
          </div>
          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">
            <div style="font-size:18px;font-weight:700;color:var(--blue)">${food.pro ?? '—'}</div>
            <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px">PRO g</div>
          </div>
          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">
            <div style="font-size:18px;font-weight:700;color:var(--teal)">${food.cho ?? '—'}</div>
            <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px">CHO g</div>
          </div>
          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">
            <div style="font-size:18px;font-weight:700;color:var(--green)">${food.fat ?? '—'}</div>
            <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px">FAT g</div>
          </div>
          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">
            <div style="font-size:18px;font-weight:700;color:var(--text-dim)">${food.kj ?? '—'}</div>
            <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px">kJ</div>
          </div>
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap">${fiber}${sugar}${sodium}</div>
        <div style="margin-top:10px;font-family:var(--mono);font-size:9px;color:var(--text-dim)">
          Values per 100g · Source: ${srcLabel} · Confidence: ${confidence}%
        </div>
      </div>
    </div>`;

  // Insert after db-no-results
  const noRes = document.getElementById('db-no-results');
  if (noRes?.parentNode) {
    noRes.parentNode.insertBefore(panel, noRes.nextSibling);
  } else {
    const tbody = document.getElementById('db-tbody');
    tbody?.parentNode?.parentNode?.parentNode?.appendChild(panel);
  }
}

/** Show loading state in global panel */
function _dbShowGlobalLoading(query) {
  _dbClearGlobalPanel();
  const panel = document.createElement('div');
  panel.id    = _GS_PANEL_ID;
  panel.style.cssText = 'margin-top:14px';
  panel.innerHTML = `
    <div class="card" style="border:1px solid rgba(100,200,255,.2)">
      <div class="card-body" style="padding:18px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--text-dim)">
         Searching global databases for "<b style="color:var(--teal)">${query}</b>"…
        <div style="margin-top:6px;font-size:9px">Chakudya Nutrition Registry (CNR)</div>
      </div>
    </div>`;
  const noRes = document.getElementById('db-no-results');
  if (noRes?.parentNode) noRes.parentNode.insertBefore(panel, noRes.nextSibling);
}

/**
 * Debounced global search — fires 600ms after user stops typing.
 * Uses NTFoodSearch layered retrieval (local → Chakudya API).
 */
function _dbGlobalSearch(query) {
  clearTimeout(_GS_debounceTimer);
  if (!query || query.length < 2 || typeof NTFoodSearch === 'undefined') return;

  _dbShowGlobalLoading(query);
  _GS_debounceTimer = setTimeout(async () => {
    try {
      const result = await NTFoodSearch.search(query, { enrich: false });
      if (!result) {
        _dbClearGlobalPanel();
        return;
      }
      // Only show if this query is still the active search
      const currentQuery = (document.getElementById('db-search')?.value || '').trim();
      if (currentQuery.toLowerCase() !== query.toLowerCase()) return;
      _dbRenderGlobalResult(result);
    } catch (_e) {
      _dbClearGlobalPanel();
    }
  }, 600);
}
