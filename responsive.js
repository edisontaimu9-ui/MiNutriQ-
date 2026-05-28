/**
 * responsive.js — Oasis Desktop Sidebar + Responsive Enhancements
 * ─────────────────────────────────────────────────────────────────
 * Responsibilities:
 *   1. Build and inject the #oasis-sidebar element at runtime.
 *   2. Keep sidebar active states in sync with the existing switchTab() system.
 *   3. Expose a public updateSidebarActive() helper for external callers.
 *   4. Mirror the existing mobile tab groups faithfully.
 *
 * Does NOT modify or override any existing JS logic — it hooks into
 * the established switchTab() call-chain by patching it once.
 *
 * Load order: after styles.css + responsive.css, before or after app scripts.
 * ─────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ── Config ──────────────────────────────────────────────────── */
  var DESKTOP_BREAKPOINT = 1024; // px — sidebar becomes visible

  /* All navigable tabs: mirrors .tabs and .bottom-nav in index.html */
  var NAV_ITEMS = [
    /* Group 1: Primary Views */
    { group: 'Primary', items: [
      {
        id: 'home',
        label: 'Home',
        type: 'support',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3L21 10.5V20A1 1 0 0120 21H15V16H9V21H4A1 1 0 013 20V10.5Z"/><circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.7"/></svg>'
      }
    ]},

    /* Group 2: Clinical Calculators */
    { group: 'Clinical', items: [
      {
        id: 'calculator',
        label: 'Adult Nutrition',
        type: 'clinical',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="3"/><path d="M3 19C3 15.134 5.686 12 9 12S15 15.134 15 19"/><rect x="17" y="13" width="2" height="6" rx="0.5" fill="currentColor" opacity="0.85"/><rect x="20" y="10" width="2" height="9" rx="0.5" fill="currentColor" opacity="0.7"/></svg>'
      },
      {
        id: 'pedi',
        label: 'Pediatric',
        type: 'clinical',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="5" r="2.8"/><path d="M2.5 17C2.5 13.5 5.2 11 8.5 11S14.5 13.5 14.5 17"/><path d="M13 19C14 17.5 16 14 17 11.5C18 9 19.5 7 21.5 5.5" stroke="#34d399" stroke-width="2"/><circle cx="13" cy="19" r="1.5" fill="#34d399"/><circle cx="17" cy="11.5" r="1.5" fill="#34d399"/><circle cx="21.5" cy="5.5" r="1.5" fill="#34d399"/></svg>'
      },
      {
        id: 'enteral',
        label: 'Enteral',
        type: 'clinical',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="9" rx="2"/><path d="M12 14Q12 17.5 10 20Q8.5 21.5 7.5 22.5"/><rect x="5.5" y="21.5" width="4" height="2" rx="0.8" fill="currentColor" opacity="0.7"/></svg>'
      },
      {
        id: 'parenteral',
        label: 'Parenteral (PN)',
        type: 'clinical',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l1 4H8L9 3z"/><rect x="8" y="7" width="8" height="12" rx="1.5"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="10" y1="13" x2="14" y2="13"/></svg>'
      },
      {
        id: 'pediburn',
        label: 'Pedi Burns',
        type: 'clinical',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 6 6 10 8 14c1 2 3 3 4 5 1-2 3-3 4-5 2-4 0-8-4-12z"/><path d="M12 14c-1 1-1 3 0 4 1-1 1-3 0-4z" fill="currentColor" opacity="0.5"/></svg>'
      }
    ]},

    /* Group 3: Assessment */
    { group: 'Assessment', items: [
      {
        id: 'anthro',
        label: 'Anthropometry',
        type: 'clinical',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="7" x2="22" y2="7"/><line x1="2" y1="17" x2="22" y2="17"/></svg>'
      },
      {
        id: 'screening',
        label: 'Screening',
        type: 'assess',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>'
      },
      {
        id: 'assessment',
        label: 'NFPE / SGA',
        type: 'assess',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
      },
      {
        id: 'cde',
        label: 'Dietary Assessment',
        type: 'assess',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'
      }
    ]},

    /* Group 4: Support Tools */
    { group: 'Support', items: [
      {
        id: 'dni',
        label: 'Drug–Nutrient',
        type: 'support',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>'
      },
      {
        id: 'pes',
        label: 'PES Statements',
        type: 'support',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
      },
      {
        id: 'library',
        label: 'References',
        type: 'support',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
      }
    ]}
  ];

  /* ── Build Sidebar HTML ───────────────────────────────────────── */
  function _buildSidebar() {
    var sidebar = document.createElement('nav');
    sidebar.id = 'oasis-sidebar';
    sidebar.setAttribute('aria-label', 'Desktop navigation');

    /* Logo lockup */
    var logo = document.createElement('div');
    logo.className = 'sidebar-logo';
    logo.setAttribute('role', 'banner');
    logo.innerHTML = [
      '<div class="sidebar-logo-icon">',
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal,#1de9d4)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">',
          '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>',
          '<rect x="9" y="3" width="6" height="4" rx="1"/>',
          '<path d="M9 12h6M9 16h4"/>',
        '</svg>',
      '</div>',
      '<div class="sidebar-wordmark">',
        '<div class="sidebar-brand-name">Oa<span>sis</span></div>',
        '<div class="sidebar-brand-sub">Clinical Nutrition DST</div>',
      '</div>'
    ].join('');
    sidebar.appendChild(logo);

    /* Navigation groups */
    NAV_ITEMS.forEach(function (group) {
      /* Group label */
      var lbl = document.createElement('div');
      lbl.className = 'sidebar-group-label';
      lbl.textContent = group.group;
      sidebar.appendChild(lbl);

      /* Items */
      group.items.forEach(function (item) {
        var el = document.createElement('div');
        el.className = 'sidebar-nav-item';
        el.dataset.tab = item.id;
        el.dataset.type = item.type;
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', item.label);
        el.innerHTML = [
          '<span class="sidebar-icon">' + item.icon + '</span>',
          '<span class="sidebar-label">' + item.label + '</span>'
        ].join('');

        /* Click handler — delegate to existing switchTab */
        el.addEventListener('click', function () {
          if (typeof window.switchTab === 'function') {
            window.switchTab(item.id);
          }
        });

        /* Keyboard accessibility */
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (typeof window.switchTab === 'function') {
              window.switchTab(item.id);
            }
          }
        });

        sidebar.appendChild(el);
      });

      /* Separator after each group except the last */
      var sep = document.createElement('div');
      sep.className = 'sidebar-sep';
      sidebar.appendChild(sep);
    });

    /* Oasis AI button */
    var aiBtn = document.createElement('div');
    aiBtn.className = 'sidebar-ai-btn';
    aiBtn.setAttribute('role', 'button');
    aiBtn.setAttribute('tabindex', '0');
    aiBtn.setAttribute('aria-label', 'Open Oasis AI assistant');
    aiBtn.innerHTML = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">',
        '<path d="M12 2C6.5 2 2 6 2 11c0 2.4 1 4.6 2.6 6.2L4 22l4.8-1.6C10 21 11 21.2 12 21.2c5.5 0 10-4 10-9S17.5 2 12 2z"/>',
        '<path d="M8 11h8M8 15h5"/>',
      '</svg>',
      '<span>Oasis AI</span>'
    ].join('');
    aiBtn.addEventListener('click', function () {
      if (typeof window.openOasisAIPanel === 'function') {
        window.openOasisAIPanel();
      }
    });
    aiBtn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (typeof window.openOasisAIPanel === 'function') {
          window.openOasisAIPanel();
        }
      }
    });
    sidebar.appendChild(aiBtn);

    /* Version badge at bottom */
    var ver = document.createElement('div');
    ver.className = 'sidebar-version';
    var appVer = (typeof APP_VERSION !== 'undefined') ? 'v' + APP_VERSION : 'v1.2.9';
    ver.textContent = appVer + ' · Oasis Clinical DST';
    sidebar.appendChild(ver);

    return sidebar;
  }

  /* ── Update sidebar active state ─────────────────────────────── */
  function updateSidebarActive(tabId) {
    var items = document.querySelectorAll('#oasis-sidebar .sidebar-nav-item');
    items.forEach(function (item) {
      /* Remove all active classes */
      item.classList.remove('active-clinical', 'active-assess', 'active-support');

      if (item.dataset.tab === tabId) {
        var type = item.dataset.type || 'clinical';
        item.classList.add('active-' + type);
      }
    });
  }

  /* ── Patch switchTab to also update sidebar ──────────────────── */
  function _patchSwitchTab() {
    var _originalSwitchTab = window.switchTab;
    if (typeof _originalSwitchTab !== 'function') {
      /* switchTab not yet defined — retry shortly */
      setTimeout(_patchSwitchTab, 100);
      return;
    }

    window.switchTab = function (tabId) {
      /* Call original first */
      _originalSwitchTab.call(this, tabId);
      /* Then sync sidebar */
      updateSidebarActive(tabId);
    };

    /* Sync to whatever tab is currently active on load */
    var activeTab = document.querySelector('[id^="tab-"].active');
    if (activeTab) {
      var currentId = activeTab.id.replace('tab-', '');
      updateSidebarActive(currentId);
    } else {
      updateSidebarActive('home');
    }
  }

  /* ── Header offset for sticky elements ──────────────────────── */
  function _applyHeaderOffset() {
    var header = document.querySelector('header');
    if (!header) return;
    var h = header.offsetHeight;
    document.documentElement.style.setProperty('--header-h', h + 'px');
  }

  /* ── Main init ───────────────────────────────────────────────── */
  function _init() {
    /* Build and insert sidebar */
    var existing = document.getElementById('oasis-sidebar');
    if (!existing) {
      var sidebar = _buildSidebar();
      document.body.insertBefore(sidebar, document.body.firstChild);
    }

    /* Patch the existing tab switcher */
    _patchSwitchTab();

    /* Measure header */
    _applyHeaderOffset();
    window.addEventListener('resize', _applyHeaderOffset);
  }

  /* ── Wait for DOM ─────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    /* DOM already ready (deferred script) */
    _init();
  }

  /* ── Expose helpers globally ─────────────────────────────────── */
  window.updateSidebarActive = updateSidebarActive;

})();
