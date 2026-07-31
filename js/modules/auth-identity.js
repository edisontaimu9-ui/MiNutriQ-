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
