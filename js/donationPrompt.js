/**
 * donationPrompt.js — Smart donation prompt for Oasis
 * ─────────────────────────────────────────────────────────────────────────
 * Replaces the old always-visible "Buy me a Snack" FAB with an engagement-
 * scored prompt that only surfaces to genuinely engaged users, at a good
 * moment, without nagging.
 *
 * Design notes:
 *   • Non-invasive: hooks into a handful of functions/elements that are
 *     already global (switchTab, logCalcToFirebase, showToast, #lib-viewer)
 *     instead of editing every calculator/screening/library file.
 *   • State lives in localStorage (works offline / signed-out) and is
 *     best-effort synced to Firestore under users/{uid}.donationPrompt when
 *     the user is signed in, so the cooldown follows them across devices.
 *   • All thresholds/cooldowns are in DP_CONFIG below — tune freely.
 *
 * Usage (see index.html):
 *   import { initDonationPrompt } from './js/donationPrompt.js';
 *   initDonationPrompt();
 *
 * Author: Edison Taimu
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Config — every threshold lives here ────────────────────────────────
const DP_CONFIG = {
  points: {
    sessionOver5Min:        2,
    fiveScreensOpened:      2,
    threeClinicalTools:     3,
    fiveSearchesOrCalcs:    2,
    registered14Days:       2,
    active8DaysThisMonth:   2,
    viewedGuideline:        1,
    completedWorkflow:      2,
  },
  thresholds: {
    sessionMinutes:      5,
    screensOpened:       5,
    clinicalTools:       3,
    searchesOrCalcs:     5,
    registeredDays:      14,
    activeDaysThisMonth: 8,
  },
  scoreToShow:            8,
  shownCooldownDays:      7,     // "ignored" cooldown
  dismissedCooldownDays:  30,
  donatedCooldownDaysMin: 90,
  donatedCooldownDaysMax: 180,
  randomChanceMin:        0.40,
  randomChanceMax:        0.50,
  // Delay after a "task completed" signal before we even consider showing —
  // gives any transient success toast/modal time to clear so the card never
  // fights for attention with what the user just finished doing.
  postTaskDelayMs:        1600,
};

// Tab ids (from switchTab()) that count as "clinical tools" for the +3 rule.
const CLINICAL_TABS = new Set([
  'anthro', 'calculator', 'dni', 'enteral', 'nfpe',
  'parenteral', 'pedi', 'screening', 'assessments',
]);

// ── Storage keys ─────────────────────────────────────────────────────────
const LS_VISIT_DAYS   = 'oasis_dp_visitDays';   // persisted array of 'YYYY-MM-DD'
const LS_LAST_SHOWN    = 'oasis_dp_lastShown';
const LS_LAST_DISMISS  = 'oasis_dp_lastDismissed';
const LS_DONATED       = 'oasis_dp_donated';     // { donatedAt } | null
const SS_SESSION_START = 'oasis_dp_sessionStart';
const SS_TABS          = 'oasis_dp_sessionTabs';
const SS_CLINICAL_TABS = 'oasis_dp_sessionClinicalTabs';
const SS_CALCS         = 'oasis_dp_sessionCalcs';
const SS_GUIDELINES    = 'oasis_dp_sessionGuidelineViews';
const SS_WORKFLOW_DONE = 'oasis_dp_sessionWorkflowDone';

// ── Small storage helpers (fail silently — never break the app) ────────
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
  catch (e) { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}
function ssGet(key, fallback) {
  try { const v = sessionStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
  catch (e) { return fallback; }
}
function ssSet(key, val) {
  try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}
function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// ── Session bootstrap ───────────────────────────────────────────────────
if (!ssGet(SS_SESSION_START, null)) ssSet(SS_SESSION_START, Date.now());
if (!ssGet(SS_TABS, null))          ssSet(SS_TABS, []);
if (!ssGet(SS_CLINICAL_TABS, null)) ssSet(SS_CLINICAL_TABS, []);
if (ssGet(SS_CALCS, null) === null)      ssSet(SS_CALCS, 0);
if (ssGet(SS_GUIDELINES, null) === null) ssSet(SS_GUIDELINES, 0);
if (ssGet(SS_WORKFLOW_DONE, null) === null) ssSet(SS_WORKFLOW_DONE, false);

// Record today's visit for the "active N days this month" rule.
(function recordVisitDay() {
  const days = lsGet(LS_VISIT_DAYS, []);
  const today = todayStr();
  if (!days.includes(today)) {
    days.push(today);
    // Keep this bounded — ~2 months of history is plenty.
    while (days.length > 62) days.shift();
    lsSet(LS_VISIT_DAYS, days);
  }
})();

// Random per-load show-chance threshold (40–50%), per DP_CONFIG.
const _sessionShowChance =
  DP_CONFIG.randomChanceMin +
  Math.random() * (DP_CONFIG.randomChanceMax - DP_CONFIG.randomChanceMin);

// ── Score computation ───────────────────────────────────────────────────
function _computeScore() {
  const p = DP_CONFIG.points, t = DP_CONFIG.thresholds;
  let score = 0;
  const breakdown = {};

  const sessionMinutes = (Date.now() - ssGet(SS_SESSION_START, Date.now())) / 60000;
  if (sessionMinutes > t.sessionMinutes) { score += p.sessionOver5Min; breakdown.session = p.sessionOver5Min; }

  const tabsOpened = ssGet(SS_TABS, []).length;
  if (tabsOpened >= t.screensOpened) { score += p.fiveScreensOpened; breakdown.screens = p.fiveScreensOpened; }

  const clinicalUsed = ssGet(SS_CLINICAL_TABS, []).length;
  if (clinicalUsed >= t.clinicalTools) { score += p.threeClinicalTools; breakdown.clinicalTools = p.threeClinicalTools; }

  const calcs = ssGet(SS_CALCS, 0);
  if (calcs >= t.searchesOrCalcs) { score += p.fiveSearchesOrCalcs; breakdown.calcs = p.fiveSearchesOrCalcs; }

  let profile = null;
  try { profile = typeof getUserProfile === 'function' ? getUserProfile() : null; } catch (e) {}
  if (profile && profile.createdAt) {
    const regDays = daysSince(profile.createdAt);
    if (regDays >= t.registeredDays) { score += p.registered14Days; breakdown.registered = p.registered14Days; }
  }

  const visitDays = lsGet(LS_VISIT_DAYS, []);
  const thisMonth = todayStr().slice(0, 7); // 'YYYY-MM'
  const activeThisMonth = visitDays.filter(d => d.slice(0, 7) === thisMonth).length;
  if (activeThisMonth >= t.activeDaysThisMonth) { score += p.active8DaysThisMonth; breakdown.activeDays = p.active8DaysThisMonth; }

  if (ssGet(SS_GUIDELINES, 0) >= 1) { score += p.viewedGuideline; breakdown.guideline = p.viewedGuideline; }

  if (ssGet(SS_WORKFLOW_DONE, false)) { score += p.completedWorkflow; breakdown.workflow = p.completedWorkflow; }

  return { score, breakdown };
}

// ── "Is the user mid-task right now?" guard ─────────────────────────────
function _isBusy() {
  const overlaySelectors = [
    '#lib-viewer.open',
    '#buysnack-overlay.active',
    '#userguide-overlay',
    '.kebab-menu.open',
  ];
  for (const sel of overlaySelectors) {
    const el = document.querySelector(sel);
    if (el && getComputedStyle(el).display !== 'none') return true;
  }
  const obOverlay = document.getElementById('ob-overlay');
  if (obOverlay && !obOverlay.classList.contains('hidden')) return true;

  const active = document.activeElement;
  if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return true;

  return false;
}

// ── Eligibility check (all Display Rules) ───────────────────────────────
function _isEligible() {
  if (lsGet(LS_DONATED, null)) {
    const d = lsGet(LS_DONATED, null);
    if (daysSince(d.donatedAt) < d.cooldownDays) return false;
    // Past cooldown — allow a gentle repeat-support ask, still gated below.
  }
  const { score } = _computeScore();
  if (score < DP_CONFIG.scoreToShow) return false;

  if (daysSince(lsGet(LS_LAST_SHOWN, null)) < DP_CONFIG.shownCooldownDays) return false;
  if (daysSince(lsGet(LS_LAST_DISMISS, null)) < DP_CONFIG.dismissedCooldownDays) return false;

  if (_isBusy()) return false;
  if (Math.random() > _sessionShowChance) return false;

  return true;
}

// ── Firestore sync (best-effort, never blocks UI) ───────────────────────
function _remoteDocRef() {
  try {
    const auth = typeof _getAuth === 'function' ? _getAuth() : null;
    const uid = auth?.currentUser?.uid;
    if (!uid || typeof db === 'undefined' || !db) return null;
    return db.collection('users').doc(uid);
  } catch (e) { return null; }
}

function _syncToRemote(patch) {
  const ref = _remoteDocRef();
  if (!ref) return;
  ref.set({ donationPrompt: patch }, { merge: true }).catch(() => {});
}

async function _pullFromRemote() {
  const ref = _remoteDocRef();
  if (!ref) return;
  try {
    const snap = await ref.get();
    const remote = snap.exists ? (snap.data().donationPrompt || null) : null;
    if (!remote) return;
    // Merge remote into local, preferring whichever is more restrictive/recent.
    if (remote.lastShown && daysSince(remote.lastShown) < daysSince(lsGet(LS_LAST_SHOWN, null))) {
      lsSet(LS_LAST_SHOWN, remote.lastShown);
    }
    if (remote.lastDismissed && daysSince(remote.lastDismissed) < daysSince(lsGet(LS_LAST_DISMISS, null))) {
      lsSet(LS_LAST_DISMISS, remote.lastDismissed);
    }
    if (remote.donated && !lsGet(LS_DONATED, null)) {
      lsSet(LS_DONATED, remote.donated);
    }
  } catch (e) {}
}

// ── UI ───────────────────────────────────────────────────────────────────
function _ensureStyles() {
  if (document.getElementById('dp-styles')) return;
  const style = document.createElement('style');
  style.id = 'dp-styles';
  style.textContent = `
    #dp-card {
      position: fixed;
      left: 16px;
      right: 16px;
      bottom: calc(var(--bottom-nav-h, 60px) + var(--sab, 0px) + 14px);
      z-index: 890;
      max-width: 440px;
      margin: 0 auto;
      background: linear-gradient(135deg, rgba(15,23,42,0.97), rgba(12,18,34,0.97));
      border: 1px solid rgba(249,115,22,0.35);
      box-shadow: 0 10px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3);
      border-radius: 16px;
      padding: 14px 14px 14px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      opacity: 0;
      transform: translateY(16px);
      pointer-events: none;
      transition: opacity 0.35s ease, transform 0.35s cubic-bezier(.22,.68,0,1.05);
    }
    #dp-card.dp-visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
    #dp-card .dp-emoji { font-size: 26px; flex-shrink: 0; line-height: 1; }
    #dp-card .dp-body { flex: 1; min-width: 0; }
    #dp-card .dp-title { font-family: var(--sans,'Outfit',sans-serif); font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 2px; }
    #dp-card .dp-sub { font-family: var(--sans,'Outfit',sans-serif); font-size: 11px; color: rgba(255,255,255,0.6); line-height: 1.4; }
    #dp-card .dp-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
    #dp-card .dp-support-btn {
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: #fff; border: none; border-radius: 20px;
      padding: 8px 14px; font-family: var(--sans,'Outfit',sans-serif);
      font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;
    }
    #dp-card .dp-dismiss-btn {
      background: none; border: none; color: rgba(255,255,255,0.45);
      font-size: 16px; cursor: pointer; padding: 2px 6px; line-height: 1;
      align-self: flex-end;
    }
    #dp-thanks-badge {
      position: fixed;
      bottom: calc(var(--bottom-nav-h, 60px) + var(--sab, 0px) + 16px);
      right: 20px;
      z-index: 890;
      display: none;
      align-items: center;
      gap: 6px;
      background: rgba(15,23,42,0.92);
      border: 1px solid rgba(244,63,94,0.3);
      color: #fda4af;
      border-radius: 50px;
      padding: 8px 14px;
      font-family: var(--sans,'Outfit',sans-serif);
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 6px 20px rgba(0,0,0,0.35);
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    #dp-thanks-badge.dp-visible { display: flex; opacity: 1; transform: translateY(0); }
    @media (min-width: 640px) {
      #dp-card { left: auto; right: 20px; width: 380px; }
    }
  `;
  document.head.appendChild(style);
}

function _ensureCardEl() {
  let card = document.getElementById('dp-card');
  if (card) return card;
  card = document.createElement('div');
  card.id = 'dp-card';
  card.setAttribute('role', 'complementary');
  card.setAttribute('aria-label', 'Support Oasis');
  card.innerHTML = `
    <span class="dp-emoji">🍿</span>
    <div class="dp-body">
      <div class="dp-title">Enjoying Oasis?</div>
      <div class="dp-sub">If it's saving you time, consider buying the dev a snack.</div>
    </div>
    <div class="dp-actions">
      <button type="button" class="dp-dismiss-btn" aria-label="Dismiss">✕</button>
      <button type="button" class="dp-support-btn">Support</button>
    </div>
  `;
  document.body.appendChild(card);
  card.querySelector('.dp-support-btn').addEventListener('click', _handleSupportClick);
  card.querySelector('.dp-dismiss-btn').addEventListener('click', _handleDismissClick);
  return card;
}

function _ensureBadgeEl() {
  let badge = document.getElementById('dp-thanks-badge');
  if (badge) return badge;
  badge = document.createElement('div');
  badge.id = 'dp-thanks-badge';
  badge.innerHTML = `<span>❤️</span><span>Thanks for supporting Oasis</span>`;
  document.body.appendChild(badge);
  return badge;
}

function _handleSupportClick() {
  const card = document.getElementById('dp-card');
  if (card) card.classList.remove('dp-visible');
  const overlay = document.getElementById('buysnack-overlay');
  if (overlay) overlay.classList.add('active');
}

function _handleDismissClick() {
  const card = document.getElementById('dp-card');
  if (card) card.classList.remove('dp-visible');
  const now = new Date().toISOString();
  lsSet(LS_LAST_DISMISS, now);
  _syncToRemote({ lastDismissed: now });
}

function _showCard() {
  _ensureStyles();
  const card = _ensureCardEl();
  requestAnimationFrame(() => card.classList.add('dp-visible'));
  const now = new Date().toISOString();
  lsSet(LS_LAST_SHOWN, now);
  _syncToRemote({ lastShown: now });
}

function _showThanksBadge() {
  _ensureStyles();
  const badge = _ensureBadgeEl();
  const card = document.getElementById('dp-card');
  if (card) card.classList.remove('dp-visible');
  requestAnimationFrame(() => badge.classList.add('dp-visible'));
}

function markDonated() {
  const donated = {
    donatedAt: new Date().toISOString(),
    cooldownDays: Math.round(
      DP_CONFIG.donatedCooldownDaysMin +
      Math.random() * (DP_CONFIG.donatedCooldownDaysMax - DP_CONFIG.donatedCooldownDaysMin)
    ),
  };
  lsSet(LS_DONATED, donated);
  _syncToRemote({ donated });
  _showThanksBadge();
  try { if (typeof showToast === 'function') showToast('Thank you for supporting Oasis! ❤️', 'success'); } catch (e) {}
}

// Pick up the ?donated=true redirect PayChangu sends back after checkout.
function _checkDonatedReturn() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('donated') === 'true') {
      markDonated();
      params.delete('donated');
      const clean = location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash;
      history.replaceState(null, '', clean);
    }
  } catch (e) {}
}

// ── Evaluation trigger ───────────────────────────────────────────────────
// Called after a "task completed" signal. Waits a beat so nothing steals
// attention from what the user just finished, then checks all display rules.
function _maybeShowAfterTask() {
  if (lsGet(LS_DONATED, null)) {
    const badge = document.getElementById('dp-thanks-badge');
    if (!badge || !badge.classList.contains('dp-visible')) _showThanksBadge();
    return;
  }
  setTimeout(() => {
    if (_isEligible()) _showCard();
  }, DP_CONFIG.postTaskDelayMs);
}

// ── Non-invasive hooks into existing app functions ──────────────────────
function _wireHooks() {
  // 1. Screens opened + clinical tools used — wrap switchTab.
  const _origSwitchTab = window.switchTab;
  if (typeof _origSwitchTab === 'function') {
    window.switchTab = function (tab) {
      const result = _origSwitchTab.apply(this, arguments);
      try {
        const tabs = ssGet(SS_TABS, []);
        if (!tabs.includes(tab)) { tabs.push(tab); ssSet(SS_TABS, tabs); }
        if (CLINICAL_TABS.has(tab)) {
          const ct = ssGet(SS_CLINICAL_TABS, []);
          if (!ct.includes(tab)) { ct.push(tab); ssSet(SS_CLINICAL_TABS, ct); }
        }
        // Leaving a clinical tab back to somewhere neutral reads as "task
        // exited" — a reasonable moment to evaluate the prompt.
        if (!CLINICAL_TABS.has(tab)) _maybeShowAfterTask();
      } catch (e) {}
      return result;
    };
  }

  // 2. Searches/calculations completed + workflow-completed signal.
  const _origLogCalc = window.logCalcToFirebase;
  if (typeof _origLogCalc === 'function') {
    window.logCalcToFirebase = function (data) {
      const result = _origLogCalc.apply(this, arguments);
      try {
        ssSet(SS_CALCS, ssGet(SS_CALCS, 0) + 1);
        ssSet(SS_WORKFLOW_DONE, true);
        _maybeShowAfterTask();
      } catch (e) {}
      return result;
    };
  }

  // 3. Generic "workflow completed successfully" signal via success toasts.
  const _origShowToast = window.showToast;
  if (typeof _origShowToast === 'function') {
    window.showToast = function (msg, type, duration) {
      const result = _origShowToast.apply(this, arguments);
      try {
        if (type === 'success') {
          ssSet(SS_WORKFLOW_DONE, true);
          _maybeShowAfterTask();
        }
      } catch (e) {}
      return result;
    };
  }

  // 4. Guideline/article viewed — observe the Library resource viewer.
  const wireViewerObserver = () => {
    const viewer = document.getElementById('lib-viewer');
    if (!viewer) return false;
    const obs = new MutationObserver(() => {
      if (viewer.classList.contains('open')) {
        ssSet(SS_GUIDELINES, ssGet(SS_GUIDELINES, 0) + 1);
      } else {
        _maybeShowAfterTask();
      }
    });
    obs.observe(viewer, { attributes: true, attributeFilter: ['class'] });
    return true;
  };
  if (!wireViewerObserver()) {
    // library.js loads deferred and may inject #lib-viewer after this
    // script runs — poll briefly for it.
    let tries = 0;
    const poll = setInterval(() => {
      if (wireViewerObserver() || ++tries > 40) clearInterval(poll);
    }, 250);
  }
}

// ── Remove the old always-on FAB, if present, and its dumb toggler ──────
function _removeLegacyFab() {
  const legacy = document.getElementById('bs-fab');
  if (legacy) legacy.remove();
}

// ── Public entry point ───────────────────────────────────────────────────
export function initDonationPrompt() {
  _ensureStyles();
  _removeLegacyFab();
  _checkDonatedReturn();

  if (lsGet(LS_DONATED, null)) {
    _ensureBadgeEl();
    requestAnimationFrame(() => _showThanksBadge());
  }

  _pullFromRemote();
  _wireHooks();

  // Also evaluate once on load for users who arrive already well past the
  // engagement thresholds (e.g. returning power users), same delay/gates.
  _maybeShowAfterTask();
}

// Exposed for the buy-snack success flow to call directly if it ever wants
// to mark a donation without a full page redirect round-trip.
export { markDonated };
