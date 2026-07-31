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
