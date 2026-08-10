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
      ? `<span style="color:var(--green,#34d399);font-family:var(--mono);font-size:11px;letter-spacing:0.5px">✓ Verified</span>`
      : `<span style="color:var(--amber,#f0b429);font-family:var(--mono);font-size:11px;letter-spacing:0.5px">⚠ Unverified</span>`;
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

// ── Auth-ready signal ──────────────────────────────────────────────
// Tells the splash-dismiss script (index.html) that we now know whether
// the user is signed in or not, so it's safe to reveal either the app or
// the sign-in overlay — whichever _showOnboardingOverlay/_hideOnboardingOverlay
// just chose. Idempotent: dismissSplash() on the listening side no-ops
// after the first call, so firing this more than once is harmless.
function _signalAuthReady() {
  window.__oasisAuthReady = true;
  try { document.dispatchEvent(new CustomEvent('oasis-auth-ready')); } catch(e) {}
}

function _obFinish(name, isReturning) {
  document.getElementById('ob-overlay').classList.add('hidden');
  document.body.classList.add('ob-authed');
  document.body.style.overflow = '';
  _signalAuthReady();
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
        // ── Resolve profile FIRST; revocation check runs alongside ──
        // Previously the revocation Firestore lookup gated _obResolveProfile
        // behind a network round trip, so an offline (or slow-network)
        // returning user with a perfectly valid local profile sat staring
        // at the splash until it timed out and fell back to the sign-in
        // form. A local profile is trustworthy enough to unlock the app
        // immediately; revocation (a rare, security-only case) is checked
        // in the background and can retroactively sign the user out if it
        // comes back positive, without blocking startup.
        _obResolveProfile(user);

        try { if (typeof analytics !== 'undefined' && analytics) analytics.setUserId(user.uid); } catch (e) {}

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
                }
              }
            })
            .catch(() => {
              // Revocation check failed (offline/unreachable) — fail open.
              // _obResolveProfile() above has already unlocked the app.
            });
        }
      } else {
        // Not signed in — block home screen and show the sign-in overlay.
        _showOnboardingOverlay();
      }
    });
  } else {
    // Firebase auth SDK unavailable (e.g. blocked/failed to load offline)
    // — fall back to whatever profile is cached locally.
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
      }).catch(() => {
        // Firestore fetch failed. If it's specifically a connectivity
        // problem, the person IS a signed-in, valid user — the network
        // just can't confirm their profile details right now. Forcing
        // them into the sign-in form is a dead end offline (signing in
        // needs network too), so instead let them into the app with a
        // minimal profile built from the auth record, and mark it so the
        // full profile re-syncs from Firestore the next time we're online.
        if (!navigator.onLine) {
          saveUserProfile({
            name: (user.email || 'User').split('@')[0],
            uid: '', institution: '', role: 'student',
            email: user.email || '', photoURL: '',
            createdAt: new Date().toISOString(),
            firebaseUid: user.uid,
            _pendingSync: true
          });
          try { renderProfileCard(); } catch(e) {}
          _hideOnboardingOverlay();
        } else {
          _showOnboardingOverlay();
        }
      });
    } else {
      _showOnboardingOverlay();
    }
  } else {
    // Profile present — hide overlay, let user in
    _hideOnboardingOverlay();
  }
}

// Once back online, quietly replace any offline-built placeholder profile
// (_pendingSync) with the real one from Firestore.
window.addEventListener('online', () => {
  try {
    const p = getUserProfile();
    const auth = _getAuth();
    const user = auth && auth.currentUser;
    if (p && p._pendingSync && user && typeof db !== 'undefined' && db) {
      db.collection('users').doc(user.uid).get().then(snap => {
        if (snap.exists && snap.data().userName) {
          const d = snap.data();
          saveUserProfile({ name: d.userName, uid: d.userId || '', institution: d.institution || '', role: d.userRole || 'student', email: user.email || d.email || '', photoURL: d.photoURL || '', createdAt: d.createdAt || new Date().toISOString(), firebaseUid: user.uid });
          try { renderProfileCard(); } catch(e) {}
        }
      }).catch(() => {});
    }
  } catch(e) {}
});

function _showOnboardingOverlay() {
  const overlay = document.getElementById('ob-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    document.body.classList.remove('ob-authed');
    document.body.style.overflow = 'hidden';
  }
  // Signing in/registering both require a network round trip to Firebase —
  // if we've landed here with no connection, say so up front rather than
  // letting the person fill out a form that will fail silently on submit.
  const errEl = document.getElementById('ob-auth-error');
  if (errEl) {
    if (!navigator.onLine) {
      errEl.textContent = "You're offline — sign-in and registration need an internet connection. Reconnect and try again.";
      errEl.style.display = 'block';
    } else if (errEl.textContent && errEl.textContent.indexOf('offline') !== -1) {
      errEl.textContent = '';
      errEl.style.display = 'none';
    }
  }
  // No session found — safe to reveal the sign-in form now.
  _signalAuthReady();
}

function _hideOnboardingOverlay() {
  const overlay = document.getElementById('ob-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    document.body.classList.add('ob-authed');
    document.body.style.overflow = '';
  }
  // Valid session confirmed — safe to reveal the authenticated app now.
  _signalAuthReady();
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

// Fast path: a cached profile means we very likely have a session, so hide
// the overlay right away (prevents home-screen flash for returning users
// on a warm cache). checkOnboarding() below still runs immediately after
// to confirm this against the real Firebase Auth state — if it turns out
// there's no valid session after all, it will flip back to the sign-in
// overlay itself (via _showOnboardingOverlay).
if (getUserProfile()) {
  _hideOnboardingOverlay();
}

if (USE_FIREBASE) {
  initFirebase();   // async — connects to Firestore and logs session
} else {
  initOfflineMode();
}

// Determine auth state (and therefore whether to show the sign-in overlay
// or the app) as early as possible — do NOT defer this behind a timer.
// The splash screen stays up until this resolves (see the
// 'oasis-auth-ready' listener in index.html), so starting it late is what
// causes the sign-in-form flash on startup/refresh/PWA launch.
checkOnboarding();

// Render the activity/preset strip after a short delay to allow DataService to init.
// Purely cosmetic content, unrelated to the auth gate, so it can stay deferred.
setTimeout(() => {
  try { renderActivityStrip(); } catch(e){}
  try { renderHomePage();      } catch(e){}
  try { renderProfileCard();   } catch(e){}
  try { buildDiagList();       } catch(e){}
}, 300);


// ═══════════════════════════════════════════════════════════════
