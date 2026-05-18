/* ══════════════════════════════════════════════════════════════════
   WHAT'S NEW  —  Oasis update broadcast receiver + user reply module
   ──────────────────────────────────────────────────────────────────
   Firestore collections used:
     • system/app_version        (read)  — existing push channel
     • app_updates               (read)  — release notes feed
         doc fields: version, title, body (string | string[]),
                     tag ('new'|'improved'|'fixed'|'removed'),
                     publishedAt (Timestamp), pinned (bool)
     • update_replies            (write) — user replies/suggestions
         doc fields: updateId, message, userName, userRole,
                     userId, sessionId, createdAt, read, appVersion

   Globals exposed (all on window):
     openWhatsNew()   — open the drawer
     closeWhatsNew()  — close the drawer
     wsnSubmitReply() — called by the send button

   Depends on globals from main.js:
     db, getUserProfile(), SESSION_ID, APP_VERSION, showToast()
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── constants ──────────────────────────────────────────────── */
  const COLLECTION_UPDATES = 'app_updates';
  const COLLECTION_REPLIES = 'update_replies';
  const SEEN_KEY           = 'oasis_wsn_seen_ver';    // last version user opened
  const BADGE_COUNT_KEY    = 'oasis_wsn_unseen_count'; // persisted badge count

  /* ── state ──────────────────────────────────────────────────── */
  let _updates          = [];    // [{id, version, title, body, tag, publishedAt, pinned}]
  let _listenerAttached = false; // true once onSnapshot is actually registered
  let _replyTargetId    = null;  // update doc ID the user is replying to
  let _replySending     = false;

  /* ══════════════════════════════════════════════════════════════
     BADGE — red dot on the Harbinger menu button
  ══════════════════════════════════════════════════════════════ */
  function _getBadgeEl() {
    let b = document.getElementById('wsn-badge');
    if (!b) {
      // Inject badge onto the kebab button
      const kebab = document.getElementById('kebab-btn');
      if (!kebab) return null;
      b = document.createElement('span');
      b.id = 'wsn-badge';
      b.style.cssText = [
        'position:absolute', 'top:2px', 'right:2px',
        'width:8px', 'height:8px',
        'background:var(--red,#ef4444)',
        'border-radius:50%',
        'border:1.5px solid var(--bg,#020617)',
        'display:none',
        'pointer-events:none',
      ].join(';');
      // kebab-btn needs relative positioning (add only if not set)
      if (getComputedStyle(kebab).position === 'static') {
        kebab.style.position = 'relative';
      }
      kebab.appendChild(b);
    }
    return b;
  }

  function _showBadge(count) {
    const b = _getBadgeEl();
    if (!b) return;
    b.style.display = (count > 0) ? 'block' : 'none';
    try { localStorage.setItem(BADGE_COUNT_KEY, String(count)); } catch(e) {}
  }

  function _hideBadge() { _showBadge(0); }

  function _restoreBadge() {
    try {
      const n = parseInt(localStorage.getItem(BADGE_COUNT_KEY) || '0', 10);
      if (n > 0) _showBadge(n);
    } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════════
     FIRESTORE LISTENER — watches app_updates collection
     Picks up new documents in real-time (same push mechanism as
     the existing version watcher in _initUpdateWatcher).
  ══════════════════════════════════════════════════════════════ */
  function _attachListener(dbRef) {
    if (_listenerAttached) return;
    _listenerAttached = true;
    try {
      dbRef.collection(COLLECTION_UPDATES)
        .orderBy('publishedAt', 'desc')
        .limit(30)
        .onSnapshot((snap) => {
          _updates = [];
          snap.forEach((doc) => {
            const d = doc.data();
            _updates.push({
              id:          doc.id,
              version:     d.version     || '',
              title:       d.title       || 'Update',
              body:        d.body        || '',
              tag:         d.tag         || 'new',
              publishedAt: d.publishedAt || null,
              pinned:      !!d.pinned,
            });
          });

          // Sort: pinned first, then by date desc
          _updates.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            const ta = a.publishedAt?.toMillis?.() || 0;
            const tb = b.publishedAt?.toMillis?.() || 0;
            return tb - ta;
          });

          // Calculate unseen count
          const seenVer = _getSeenVersion();
          const unseen  = _updates.filter(u => u.version && u.version > seenVer).length;
          _showBadge(unseen);

          // If drawer is open, re-render live
          const drawer = document.getElementById('wsn-drawer');
          if (drawer && drawer.classList.contains('open')) {
            _renderList();
          }
        }, (err) => {
          console.warn('[WhatsNew] Firestore listener error:', err);
          _listenerAttached = false; // allow retry
        });
    } catch(e) {
      console.warn('[WhatsNew] Could not start updates listener:', e);
      _listenerAttached = false; // allow retry
    }
  }

  // Poll until db global is available (Firebase loads async after page init)
  function _initUpdatesListener() {
    const _db = (typeof db !== 'undefined' && db) ? db : null;
    if (_db) { _attachListener(_db); return; }
    // db not ready yet — poll every 500 ms for up to 15 s
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const _dbNow = (typeof db !== 'undefined' && db) ? db : null;
      if (_dbNow) {
        clearInterval(poll);
        _attachListener(_dbNow);
      } else if (attempts >= 30) {
        clearInterval(poll);
        // Show empty state in drawer if it's open and still spinning
        const drawer = document.getElementById('wsn-drawer');
        if (drawer && drawer.classList.contains('open')) _renderList();
        console.warn('[WhatsNew] db unavailable after 15 s — running offline.');
      }
    }, 500);
  }

  /* ══════════════════════════════════════════════════════════════
     SEEN VERSION — tracks which version the user last viewed
  ══════════════════════════════════════════════════════════════ */
  function _getSeenVersion() {
    try { return localStorage.getItem(SEEN_KEY) || ''; } catch(e) { return ''; }
  }
  function _markAllSeen() {
    // Mark the newest version as seen
    const newest = _updates[0]?.version || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '');
    try { localStorage.setItem(SEEN_KEY, newest); } catch(e) {}
    _hideBadge();
  }

  /* ══════════════════════════════════════════════════════════════
     TAG CHIP STYLES
  ══════════════════════════════════════════════════════════════ */
  const TAG_STYLES = {
    new:      { label: '✦ NEW',      bg: 'rgba(29,233,212,0.12)',  border: 'rgba(29,233,212,0.4)',  color: 'var(--teal,#1de9d4)' },
    improved: { label: '▲ IMPROVED', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.4)',  color: 'var(--blue,#60a5fa)' },
    fixed:    { label: '✔ FIXED',    bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.4)',  color: 'var(--green,#34d399)' },
    removed:  { label: '✕ REMOVED',  bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.35)',  color: 'var(--red,#ef4444)'  },
    pinned:   { label: '📌 PINNED',   bg: 'rgba(240,180,41,0.10)', border: 'rgba(240,180,41,0.35)', color: 'var(--amber,#f0b429)' },
  };

  function _tagChip(tag, pinned) {
    const t = pinned ? TAG_STYLES.pinned : (TAG_STYLES[tag] || TAG_STYLES.new);
    return `<span style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:1px;padding:2px 8px;border-radius:4px;background:${t.bg};border:1px solid ${t.border};color:${t.color};white-space:nowrap">${t.label}</span>`;
  }

  /* ══════════════════════════════════════════════════════════════
     DATE FORMATTER
  ══════════════════════════════════════════════════════════════ */
  function _fmtDate(ts) {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    } catch(e) { return ''; }
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER — list of update cards
  ══════════════════════════════════════════════════════════════ */
  function _renderList() {
    const container = document.getElementById('wsn-list');
    if (!container) return;

    if (_updates.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:48px 24px;color:var(--text-dim)">
          <div style="font-size:32px;margin-bottom:12px">📭</div>
          <div style="font-family:var(--mono);font-size:11px;letter-spacing:1px">No updates yet</div>
          <div style="font-family:var(--sans);font-size:12px;margin-top:6px;line-height:1.6">
            Release notes will appear here when the developer pushes an update.
          </div>
        </div>`;
      return;
    }

    const seenVer = _getSeenVersion();

    container.innerHTML = _updates.map((u) => {
      const isUnseen = u.version && u.version > seenVer;
      const dateStr  = _fmtDate(u.publishedAt);
      const bodyHtml = Array.isArray(u.body)
        ? u.body.map(line => `<li style="margin-bottom:4px">${_esc(line)}</li>`).join('')
        : `<li style="margin-bottom:4px">${_esc(u.body)}</li>`;

      return `
        <div class="wsn-card${isUnseen ? ' wsn-card--unseen' : ''}" data-id="${_esc(u.id)}" style="
          background:var(--surface2,#111c2e);
          border:1px solid ${isUnseen ? 'rgba(29,233,212,0.35)' : 'var(--border,rgba(30,41,59,1))'};
          border-radius:12px;
          padding:14px 16px;
          margin-bottom:10px;
          position:relative;
        ">
          ${isUnseen ? '<span style="position:absolute;top:12px;right:12px;width:7px;height:7px;background:var(--teal);border-radius:50%"></span>' : ''}

          <!-- Header row -->
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            ${_tagChip(u.tag, u.pinned)}
            ${u.version ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:.5px">v${_esc(u.version)}</span>` : ''}
            ${dateStr    ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-left:auto">${dateStr}</span>` : ''}
          </div>

          <!-- Title -->
          <div style="font-family:var(--mono);font-size:12.5px;font-weight:700;color:var(--text,#cce0f5);margin-bottom:6px;line-height:1.4">
            ${_esc(u.title)}
          </div>

          <!-- Body -->
          ${u.body ? `
          <ul style="font-family:var(--sans);font-size:12px;color:var(--text-dim);line-height:1.7;margin:0;padding-left:16px">
            ${bodyHtml}
          </ul>` : ''}

          <!-- Reply button -->
          <button
            onclick="window._wsnOpenReply('${_esc(u.id)}', '${_esc(u.title)}')"
            style="
              margin-top:10px;
              display:inline-flex;align-items:center;gap:5px;
              font-family:var(--mono);font-size:9px;letter-spacing:.8px;
              color:var(--text-dim);
              background:none;
              border:1px solid rgba(100,116,139,0.25);
              border-radius:6px;
              padding:4px 10px;
              cursor:pointer;
              transition:color .12s,border-color .12s;
            "
            onmouseover="this.style.color='var(--teal)';this.style.borderColor='rgba(29,233,212,0.45)'"
            onmouseout="this.style.color='var(--text-dim)';this.style.borderColor='rgba(100,116,139,0.25)'"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            REPLY / SUGGEST
          </button>
        </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════════
     REPLY PANEL — slides up inside the drawer
  ══════════════════════════════════════════════════════════════ */
  window._wsnOpenReply = function(updateId, updateTitle) {
    _replyTargetId = updateId;
    const panel   = document.getElementById('wsn-reply-panel');
    const titleEl = document.getElementById('wsn-reply-for');
    const textarea = document.getElementById('wsn-reply-text');
    if (!panel) return;
    if (titleEl) titleEl.textContent = 'Re: ' + updateTitle;
    if (textarea) textarea.value = '';
    _wsnClearReplyError();
    panel.style.display = 'flex';
    panel.style.animation = 'none';
    requestAnimationFrame(() => {
      panel.style.animation = '_wsn-slide-up .22s cubic-bezier(.22,1,.36,1) forwards';
    });
    setTimeout(() => { if (textarea) textarea.focus(); }, 240);
  };

  window._wsnCloseReply = function() {
    const panel = document.getElementById('wsn-reply-panel');
    if (panel) panel.style.display = 'none';
    _replyTargetId = null;
    _replySending  = false;
  };

  function _wsnClearReplyError() {
    const el = document.getElementById('wsn-reply-error');
    if (el) el.style.display = 'none';
  }
  function _wsnShowReplyError(msg) {
    const el = document.getElementById('wsn-reply-error');
    if (el) { el.textContent = '⚠ ' + msg; el.style.display = 'block'; }
  }

  /* ══════════════════════════════════════════════════════════════
     SUBMIT REPLY
  ══════════════════════════════════════════════════════════════ */
  window.wsnSubmitReply = function() {
    if (_replySending) return;
    const textarea = document.getElementById('wsn-reply-text');
    const message  = (textarea?.value || '').trim();

    if (!message) { _wsnShowReplyError('Please enter a message.'); return; }
    if (message.length < 3) { _wsnShowReplyError('Message too short.'); return; }
    _wsnClearReplyError();

    const _db  = (typeof db !== 'undefined') ? db : null;
    const _fp  = (typeof getUserProfile === 'function') ? getUserProfile() : null;
    const _sid = (typeof SESSION_ID    !== 'undefined') ? SESSION_ID    : null;
    const _ver = (typeof APP_VERSION   !== 'undefined') ? APP_VERSION   : null;

    const payload = {
      updateId:    _replyTargetId || null,
      message:     message,
      userName:    _fp?.name        || null,
      userRole:    _fp?.role        || null,
      userId:      _fp?.uid         || null,
      firebaseUid: _fp?.firebaseUid || null,
      institution: _fp?.institution || null,
      sessionId:   _sid,
      appVersion:  _ver,
      createdAt:   (_db && typeof firebase !== 'undefined' && firebase.firestore)
                     ? firebase.firestore.FieldValue.serverTimestamp()
                     : new Date().toISOString(),
      read:        false,
    };

    // UI: busy state
    _replySending = true;
    const btn = document.getElementById('wsn-reply-send-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="wsn-spinner"></span>Sending…'; }

    const _persist = () => {
      if (_db) {
        return _db.collection(COLLECTION_REPLIES).add(payload);
      }
      // Offline fallback — queue locally
      try {
        const q = JSON.parse(localStorage.getItem('oasis_wsn_offline_replies') || '[]');
        q.push(Object.assign({}, payload, { createdAt: new Date().toISOString() }));
        localStorage.setItem('oasis_wsn_offline_replies', JSON.stringify(q.slice(-20)));
      } catch(e) {}
      return Promise.resolve();
    };

    _persist().then(() => {
      _replySending = false;
      window._wsnCloseReply();
      if (typeof showToast === 'function') showToast('Reply sent — thank you! 🙏', 'success');
    }).catch((err) => {
      console.error('[WhatsNew] Reply submit failed:', err);
      _replySending = false;
      if (btn) { btn.disabled = false; btn.innerHTML = 'Send'; }
      _wsnShowReplyError('Could not send — check your connection.');
    });
  };

  /* ══════════════════════════════════════════════════════════════
     HTML SCAFFOLD — injected once into <body>
  ══════════════════════════════════════════════════════════════ */
  function _buildScaffold() {
    if (document.getElementById('wsn-overlay')) return; // already injected

    const el = document.createElement('div');
    el.innerHTML = `
<style>
  @keyframes _wsn-slide-in  { from { transform:translateX(100%) } to { transform:translateX(0) } }
  @keyframes _wsn-slide-out { from { transform:translateX(0) }     to { transform:translateX(100%) } }
  @keyframes _wsn-slide-up  { from { opacity:0;transform:translateY(16px) } to { opacity:1;transform:translateY(0) } }
  @keyframes wsn-spin        { to { transform:rotate(360deg) } }

  #wsn-drawer {
    position:fixed; top:0; right:0; bottom:0;
    width:min(100vw, 420px);
    background:var(--surface,#0d1626);
    border-left:1px solid var(--border,rgba(30,41,59,1));
    z-index:99999;
    display:flex; flex-direction:column;
    transform:translateX(100%);
    transition:transform .28s cubic-bezier(.22,1,.36,1);
    box-shadow:-8px 0 40px rgba(0,0,0,.6);
  }
  #wsn-drawer.open { transform:translateX(0); }

  #wsn-overlay {
    position:fixed; inset:0;
    background:rgba(2,6,23,.55);
    backdrop-filter:blur(4px);
    -webkit-backdrop-filter:blur(4px);
    z-index:99998;
    display:none;
    opacity:0;
    transition:opacity .25s ease;
  }
  #wsn-overlay.open { display:block; opacity:1; }

  #wsn-list { overflow-y:auto; flex:1; padding:14px 14px 80px; scroll-behavior:smooth; }
  #wsn-list::-webkit-scrollbar { width:4px; }
  #wsn-list::-webkit-scrollbar-track { background:transparent; }
  #wsn-list::-webkit-scrollbar-thumb { background:rgba(100,116,139,.3); border-radius:2px; }

  #wsn-reply-panel {
    display:none;
    flex-direction:column;
    gap:8px;
    position:absolute;
    bottom:0; left:0; right:0;
    background:var(--surface,#0d1626);
    border-top:1.5px solid rgba(29,233,212,0.25);
    padding:14px 16px 18px;
    box-shadow:0 -8px 32px rgba(0,0,0,.45);
    z-index:10;
  }
  #wsn-reply-text {
    width:100%;
    background:rgba(15,23,42,.85);
    color:var(--text,#cce0f5);
    border:1.5px solid rgba(100,116,139,.28);
    border-radius:var(--r-sm,6px);
    padding:9px 12px;
    font-family:var(--sans);
    font-size:12.5px;
    line-height:1.55;
    resize:none;
    min-height:72px;
    max-height:180px;
    outline:none;
    box-sizing:border-box;
    transition:border-color .15s, box-shadow .15s;
  }
  #wsn-reply-text:focus {
    border-color:rgba(29,233,212,.55);
    box-shadow:0 0 0 3px rgba(29,233,212,.1);
  }
  .wsn-spinner {
    display:inline-block;
    width:12px; height:12px;
    border:2px solid rgba(2,6,23,.3);
    border-top-color:#020617;
    border-radius:50%;
    animation:wsn-spin .7s linear infinite;
    margin-right:6px;
    vertical-align:middle;
  }
</style>

<!-- Overlay -->
<div id="wsn-overlay" onclick="closeWhatsNew()"></div>

<!-- Drawer -->
<div id="wsn-drawer" role="dialog" aria-modal="true" aria-label="What's New">

  <!-- Header -->
  <div style="
    padding:14px 16px;
    border-bottom:1px solid var(--border,rgba(30,41,59,1));
    background:linear-gradient(135deg,rgba(29,233,212,.07),rgba(96,165,250,.05));
    display:flex; align-items:center; justify-content:space-between;
    flex-shrink:0;
  ">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="
        width:32px;height:32px;
        background:rgba(29,233,212,.1);
        border:1px solid rgba(29,233,212,.3);
        border-radius:9px;
        display:flex;align-items:center;justify-content:center;
        flex-shrink:0;font-size:16px;line-height:1
      ">🚀</div>
      <div>
        <div style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--teal);letter-spacing:2px">WHAT'S NEW</div>
        <div style="font-family:var(--sans);font-size:10px;color:var(--text-dim);margin-top:1px" id="wsn-subtitle">Latest updates &amp; release notes</div>
      </div>
    </div>
    <button
      onclick="closeWhatsNew()"
      style="background:none;border:none;color:var(--text-dim);font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;line-height:1;transition:color .12s,background .12s"
      onmouseover="this.style.color='var(--text)';this.style.background='rgba(100,116,139,.12)'"
      onmouseout="this.style.color='var(--text-dim)';this.style.background='none'"
      aria-label="Close"
    >✕</button>
  </div>

  <!-- Update list -->
  <div id="wsn-list">
    <!-- Loading skeleton -->
    <div id="wsn-loading" style="padding:32px 16px;text-align:center;color:var(--text-dim)">
      <div style="font-family:var(--mono);font-size:10px;letter-spacing:1px;opacity:.6">Loading…</div>
    </div>
  </div>

  <!-- Reply panel (slides up from bottom) -->
  <div id="wsn-reply-panel">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
      <span id="wsn-reply-for" style="font-family:var(--mono);font-size:9px;color:var(--teal);letter-spacing:.8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;margin-right:8px"></span>
      <button onclick="window._wsnCloseReply()" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:15px;padding:0 4px;line-height:1" aria-label="Close reply">✕</button>
    </div>
    <textarea
      id="wsn-reply-text"
      placeholder="Leave a reply, suggestion, or feedback about this update…"
      maxlength="1000"
      rows="3"
      oninput="window._wsnClearReplyErrorPub()"
    ></textarea>
    <div id="wsn-reply-error" style="font-family:var(--mono);font-size:9px;color:rgba(239,68,68,.9);display:none;margin-top:2px"></div>
    <div style="display:flex;gap:8px;margin-top:2px">
      <button
        id="wsn-reply-send-btn"
        onclick="wsnSubmitReply()"
        style="
          flex:1;padding:9px;
          font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.2px;
          color:#020617;
          background:linear-gradient(135deg,var(--teal,#00f5e4),var(--blue,#60a5fa));
          border:none;border-radius:8px;cursor:pointer;
          transition:opacity .15s,transform .12s;
          display:flex;align-items:center;justify-content:center;gap:6px;
        "
        onmouseover="this.style.opacity='.88'"
        onmouseout="this.style.opacity='1'"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Send
      </button>
      <button
        onclick="window._wsnCloseReply()"
        style="
          padding:9px 16px;
          font-family:var(--mono);font-size:9px;color:var(--text-dim);
          background:transparent;
          border:1px solid rgba(100,116,139,.2);
          border-radius:8px;cursor:pointer;letter-spacing:.5px;
          transition:border-color .12s,color .12s;
        "
        onmouseover="this.style.borderColor='rgba(100,116,139,.45)';this.style.color='var(--text)'"
        onmouseout="this.style.borderColor='rgba(100,116,139,.2)';this.style.color='var(--text-dim)'"
      >Cancel</button>
    </div>
  </div>

</div><!-- /wsn-drawer -->`;

    document.body.appendChild(el);

    // Expose error-clear for textarea oninput
    window._wsnClearReplyErrorPub = function() {
      const el = document.getElementById('wsn-reply-error');
      if (el) el.style.display = 'none';
    };

    // Escape key closes drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const drawer = document.getElementById('wsn-drawer');
        if (drawer?.classList.contains('open')) closeWhatsNew();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     OPEN / CLOSE
  ══════════════════════════════════════════════════════════════ */
  window.openWhatsNew = function () {
    _buildScaffold();

    const drawer  = document.getElementById('wsn-drawer');
    const overlay = document.getElementById('wsn-overlay');
    const loading = document.getElementById('wsn-loading');
    const list    = document.getElementById('wsn-list');

    if (!drawer) return;

    // Close reply panel if open from previous session
    window._wsnCloseReply();

    // Show drawer
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Update subtitle with version info
    const sub = document.getElementById('wsn-subtitle');
    if (sub && typeof APP_VERSION !== 'undefined') {
      sub.textContent = 'Current version: v' + APP_VERSION;
    }

    // Always try to attach listener (safe to call repeatedly — guards internally)
    _initUpdatesListener();

    // Render or show loading spinner
    if (_updates.length > 0) {
      _renderList();
    } else {
      if (list) list.innerHTML = `
        <div id="wsn-loading" style="padding:48px 16px;text-align:center;color:var(--text-dim)">
          <div style="width:28px;height:28px;border:2.5px solid rgba(29,233,212,0.15);border-top-color:var(--teal,#1de9d4);border-radius:50%;animation:wsn-spin .8s linear infinite;margin:0 auto 14px"></div>
          <div style="font-family:var(--mono);font-size:10px;letter-spacing:1px;opacity:.7">Loading updates…</div>
        </div>`;
      // Safety timeout — if Firestore never responds, show empty state after 8 s
      setTimeout(() => {
        const drawer = document.getElementById('wsn-drawer');
        if (!drawer || !drawer.classList.contains('open')) return;
        if (_updates.length === 0) _renderList(); // shows "No updates yet" card
      }, 8000);
    }

    // Mark seen after a moment (user had time to see the new items)
    setTimeout(_markAllSeen, 1800);
  };

  window.closeWhatsNew = function () {
    const drawer  = document.getElementById('wsn-drawer');
    const overlay = document.getElementById('wsn-overlay');
    if (drawer)  drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    window._wsnCloseReply();
  };

  /* ══════════════════════════════════════════════════════════════
     SAFE HTML ESCAPE
  ══════════════════════════════════════════════════════════════ */
  function _esc(s) {
    if (typeof s !== 'string') return String(s ?? '');
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* ══════════════════════════════════════════════════════════════
     INIT — runs when DOM is ready
  ══════════════════════════════════════════════════════════════ */
  function _init() {
    // Restore badge from last session immediately (before Firestore loads)
    _restoreBadge();
    // Attempt listener startup — polls until db is ready
    _initUpdatesListener();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
