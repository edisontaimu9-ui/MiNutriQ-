// buySnack.js — "Buy me a Snack" donation widget for Oasis
// Integrates with Paychangu API (MWK · Airtel Money · TNM Mpamba · Bank · Card)
//
// Usage:
//   import { initBuySnack } from './buySnack.js';
//   initBuySnack(loadedConfig?.paychangu_secret_key);
//
// Add trigger anywhere in your HTML:
//   <button id="buy-snack-btn">🍿 Buy me a Snack</button>
//
// Security: pass your Paychangu secret key via Firebase Remote Config
// key name: "paychangu_secret_key"
// OR proxy through a Cloudflare Worker and set PAYCHANGU_ENDPOINT below.

const PAYCHANGU_ENDPOINT = 'https://api.paychangu.com/payment';
// Cloudflare Worker proxy (recommended):
// const PAYCHANGU_ENDPOINT = 'https://your-worker.your-subdomain.workers.dev/paychangu';

const SNACKS = [
  { id: 'mandasi',   emoji: '🍩', name: 'Mandasi',    desc: 'Classic Malawian fried dough', price: 500,  color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'popcorn',   emoji: '🍿', name: 'Popcorn',    desc: 'Light & crunchy snack',        price: 800,  color: '#EF4444', bg: '#FEF2F2' },
  { id: 'samosa',    emoji: '🥟', name: 'Samosa',     desc: 'Crispy & spicy pastry',        price: 1000, color: '#10B981', bg: '#ECFDF5' },
  { id: 'zitumbuwa', emoji: '🍌', name: 'Zitumbuwa',  desc: 'Malawian banana fritters',     price: 1500, color: '#F59E0B', bg: '#FFFDE7' },
  { id: 'crisps',    emoji: '🥔', name: 'Crisps',     desc: 'Crunchy packet crisps',        price: 2000, color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'chips',     emoji: '🍟', name: 'Chips',      desc: 'Hot street chips',             price: 2500, color: '#F97316', bg: '#FFF7ED' },
  { id: 'cake',      emoji: '🎂', name: 'Cake Slice', desc: 'Sweet celebration treat',      price: 3500, color: '#EC4899', bg: '#FDF2F8' },
  { id: 'box',       emoji: '🎁', name: 'Snack Box',  desc: 'The full spread!',             price: 6000, color: '#3B82F6', bg: '#EFF6FF', badge: 'Best' },
  { id: 'custom',    emoji: '✏️', name: 'Custom',     desc: 'Enter your own amount',        price: 0,    color: '#6B7280', bg: '#F9FAFB' },
];

// ─── State ────────────────────────────────────────────────────────────────────
let _selectedSnack = null;
let _customAmount  = 0;
let _paychanguKey  = null;

// ─── Public API ───────────────────────────────────────────────────────────────

export function initBuySnack(paychanguSecretKey = null) {
  _paychanguKey = paychanguSecretKey;
  _injectStyles();
  _injectModal();
  _bindTriggers();
}

// ─── Modal HTML ───────────────────────────────────────────────────────────────

function _injectModal() {
  if (document.getElementById('buysnack-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'buysnack-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'buysnack-title');

  overlay.innerHTML = `
    <div class="bs-modal" id="bs-modal">

      <button class="bs-close" id="bs-close" aria-label="Close">✕</button>

      <!-- Header -->
      <div class="bs-header">
        <span class="bs-hero">🍿</span>
        <h2 class="bs-title" id="buysnack-title">Buy me a Snack</h2>
        <p class="bs-subtitle">Pick a snack & support Oasis — free clinical nutrition tools for Malawi 🇲🇼</p>
      </div>

      <!-- Snack grid -->
      <p class="bs-section-label">Choose a snack</p>
      <div class="bs-grid" id="bs-grid">
        ${SNACKS.map(s => `
          <div class="bs-card" id="bs-card-${s.id}"
               data-id="${s.id}"
               style="--c:${s.color};--cl:${s.bg}"
               role="button" tabindex="0"
               aria-label="${s.name} MWK ${s.price || 'custom'}">
            ${s.badge ? `<span class="bs-badge">${s.badge}</span>` : ''}
            <span class="bs-card-emoji">${s.emoji}</span>
            <span class="bs-card-name">${s.name}</span>
            <span class="bs-card-price">${s.price ? 'K' + s.price.toLocaleString() : 'Any'}</span>
          </div>
        `).join('')}
      </div>

      <!-- Custom amount input -->
      <div class="bs-custom-wrap" id="bs-custom-wrap" hidden>
        <div class="bs-field">
          <label for="bs-custom-input">
            Your amount <span class="bs-req">*</span>
            <span class="bs-opt">minimum MWK 100</span>
          </label>
          <div class="bs-prefix-wrap">
            <span class="bs-prefix">MWK</span>
            <input type="number" id="bs-custom-input" placeholder="e.g. 5000" min="100"/>
          </div>
        </div>
      </div>

      <!-- Selection preview -->
      <div class="bs-preview" id="bs-preview">
        <span class="bs-preview-emoji" id="bs-preview-emoji">👆</span>
        <div class="bs-preview-info">
          <div class="bs-preview-name" id="bs-preview-name">Pick a snack above</div>
          <div class="bs-preview-desc" id="bs-preview-desc">Your support keeps Oasis free</div>
        </div>
        <span class="bs-preview-price" id="bs-preview-price">—</span>
      </div>

      <div class="bs-divider"></div>

      <!-- Donor form -->
      <div class="bs-form">
        <div class="bs-field">
          <label for="bs-name">Your name</label>
          <input type="text" id="bs-name" placeholder="e.g. Chisomo Banda" autocomplete="name"/>
        </div>
        <div class="bs-field">
          <label for="bs-email">Email <span class="bs-req">*</span></label>
          <input type="email" id="bs-email" placeholder="you@example.com" autocomplete="email"/>
        </div>
        <div class="bs-field">
          <label for="bs-phone">
            Phone <span class="bs-opt">optional · Airtel / Mpamba</span>
          </label>
          <input type="tel" id="bs-phone" placeholder="+265 99x xxx xxx" autocomplete="tel"/>
        </div>
      </div>

      <!-- Error -->
      <p class="bs-error" id="bs-error" hidden></p>

      <!-- Pay button -->
      <button class="bs-pay-btn" id="bs-pay-btn" disabled>
        Select a snack to continue
      </button>

      <!-- Payment methods -->
      <div class="bs-pay-methods">
        <span class="bs-pm-label">Pay via</span>
        <div class="bs-pm-badges">
          <span class="bs-pm airtel">📱 Airtel Money</span>
          <span class="bs-pm mpamba">📱 TNM Mpamba</span>
          <span class="bs-pm bank">🏦 Bank Transfer</span>
          <span class="bs-pm card">💳 Card</span>
        </div>
      </div>

      <p class="bs-note">🇲🇼 Powered by Paychangu · Licensed by the Reserve Bank of Malawi</p>

    </div>
  `;

  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeModal(); });

  // Close button
  document.getElementById('bs-close').addEventListener('click', _closeModal);

  // Snack card clicks + keyboard
  document.getElementById('bs-grid').addEventListener('click', e => {
    const card = e.target.closest('.bs-card');
    if (card) _selectSnack(card.dataset.id);
  });
  document.getElementById('bs-grid').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.bs-card');
      if (card) _selectSnack(card.dataset.id);
    }
  });

  // Custom amount input
  document.getElementById('bs-custom-input').addEventListener('input', e => {
    _updateCustomAmount(parseInt(e.target.value) || 0);
  });

  // Pay button
  document.getElementById('bs-pay-btn').addEventListener('click', _processDonation);

  // Escape key
  document.addEventListener('keydown', e => { if (e.key === 'Escape') _closeModal(); });
}

function _bindTriggers() {
  document.querySelectorAll('#buy-snack-btn, .buy-snack-trigger').forEach(el => {
    el.addEventListener('click', _openModal);
  });
}

// ─── Modal State ──────────────────────────────────────────────────────────────

function _openModal() {
  document.getElementById('buysnack-overlay')?.classList.add('active');
}

function _closeModal() {
  document.getElementById('buysnack-overlay')?.classList.remove('active');
  _clearError();
  _setLoading(false);
}

function _selectSnack(id) {
  const snack = SNACKS.find(s => s.id === id);
  if (!snack) return;

  // Highlight card
  document.querySelectorAll('.bs-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`bs-card-${id}`)?.classList.add('selected');

  const isCustom = id === 'custom';

  // Show/hide custom input
  const customWrap = document.getElementById('bs-custom-wrap');
  customWrap.hidden = !isCustom;
  if (isCustom) {
    _customAmount = 0;
    document.getElementById('bs-custom-input').value = '';
    document.getElementById('bs-custom-input').focus();
    _selectedSnack = { ...snack, isCustom: true };
    _updatePreview(snack.emoji, snack.name, snack.desc, 0, snack.color, snack.bg);
    _setPayButton(0, snack.color, true);
    return;
  }

  _selectedSnack = { ...snack, isCustom: false };
  _updatePreview(snack.emoji, snack.name, snack.desc, snack.price, snack.color, snack.bg);
  _setPayButton(snack.price, snack.color, false);
}

function _updateCustomAmount(amount) {
  _customAmount = amount;
  const snack = SNACKS.find(s => s.id === 'custom');
  const valid = amount >= 100;

  _updatePreview(
    snack.emoji,
    'Custom Snack',
    valid ? 'Your custom amount' : 'Minimum MWK 100',
    valid ? amount : 0,
    snack.color,
    snack.bg
  );
  _setPayButton(valid ? amount : 0, snack.color, !valid);

  if (_selectedSnack?.isCustom) {
    _selectedSnack.price = valid ? amount : 0;
  }
}

function _updatePreview(emoji, name, desc, price, color, bg) {
  const preview = document.getElementById('bs-preview');
  preview.style.setProperty('--preview-color', color);
  preview.style.setProperty('--preview-bg', bg);
  preview.classList.toggle('has-selection', !!price);

  document.getElementById('bs-preview-emoji').textContent = emoji;
  document.getElementById('bs-preview-name').textContent  = name;
  document.getElementById('bs-preview-desc').textContent  = desc;

  const priceEl = document.getElementById('bs-preview-price');
  priceEl.textContent   = price ? `MWK ${price.toLocaleString()}` : '—';
  priceEl.style.color   = price ? color : '#9ca3af';
}

function _setPayButton(price, color, disabled) {
  const btn = document.getElementById('bs-pay-btn');
  btn.disabled        = disabled || !price;
  btn.textContent     = (disabled || !price)
    ? (price === 0 && _selectedSnack?.isCustom ? 'Enter an amount to continue' : 'Select a snack to continue')
    : `Pay MWK ${price.toLocaleString()} via Paychangu`;
  btn.style.background = disabled || !price
    ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
    : `linear-gradient(135deg, ${color}, ${color}cc)`;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

async function _processDonation() {
  _clearError();

  if (!_selectedSnack) {
    _showError('Please select a snack first.');
    return;
  }

  const finalPrice = _selectedSnack.isCustom ? _customAmount : _selectedSnack.price;

  if (!finalPrice || finalPrice < 100) {
    _showError('Please enter a valid amount (minimum MWK 100).');
    document.getElementById('bs-custom-input')?.focus();
    return;
  }

  const email = document.getElementById('bs-email')?.value.trim();
  if (!email || !email.includes('@')) {
    _showError('Please enter a valid email address.');
    document.getElementById('bs-email')?.focus();
    return;
  }

  const name  = document.getElementById('bs-name')?.value.trim() || 'Supporter';
  const phone = document.getElementById('bs-phone')?.value.trim();
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ') || 'Supporter';

  const secretKey = _paychanguKey
    ?? window.PAYCHANGU_SECRET_KEY
    ?? (typeof loadedConfig !== 'undefined' && loadedConfig?.paychangu_secret_key)
    ?? null;

  if (!secretKey) {
    _showError('Payment not configured. Please contact the developer.');
    console.error('[buySnack] No Paychangu secret key. Pass it to initBuySnack() or add "paychangu_secret_key" to Firebase Remote Config.');
    return;
  }

  _setLoading(true);

  try {
    const res = await fetch(PAYCHANGU_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        amount:       finalPrice,
        currency:     'MWK',
        email,
        first_name:   firstName,
        last_name:    lastName,
        ...(phone && { phone_number: phone }),
        callback_url: 'https://minutriq.me',
        return_url:   'https://minutriq.me/?donated=true',
        tx_ref:       `OASIS-SNACK-${Date.now()}`,
        customization: {
          title:       'Support Oasis',
          description: `${_selectedSnack.emoji} ${_selectedSnack.name} — Thank you for supporting free clinical nutrition tools in Malawi 🇲🇼`,
          logo:        'https://minutriq.me/icons/icon-192.png',
        },
      }),
    });

    const data = await res.json();

    if (data?.status === 'success' && data?.data?.checkout_url) {
      window.location.href = data.data.checkout_url;
    } else {
      _showError(data?.message || 'Payment could not be initiated. Please try again.');
    }
  } catch (err) {
    console.error('[buySnack] Fetch error:', err);
    _showError('Network error. Check your connection and try again.');
  } finally {
    _setLoading(false);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _setLoading(loading) {
  const btn = document.getElementById('bs-pay-btn');
  if (!btn) return;
  btn.disabled    = loading;
  if (loading) btn.textContent = 'Redirecting to Paychangu…';
}

function _showError(msg) {
  const el = document.getElementById('bs-error');
  if (el) { el.textContent = msg; el.hidden = false; }
}

function _clearError() {
  const el = document.getElementById('bs-error');
  if (el) { el.textContent = ''; el.hidden = true; }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function _injectStyles() {
  if (document.getElementById('buysnack-styles')) return;
  const style = document.createElement('style');
  style.id = 'buysnack-styles';
  style.textContent = `
    #buysnack-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      z-index: 9999;
      align-items: center; justify-content: center;
      padding: 16px;
    }
    #buysnack-overlay.active { display: flex; animation: bs-fadeIn 0.2s ease; }
    @keyframes bs-fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .bs-modal {
      background: #fff; border-radius: 24px;
      width: 100%; max-width: 460px; max-height: 93vh;
      overflow-y: auto; padding: 28px 22px 22px;
      position: relative;
      box-shadow: 0 32px 80px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: bs-slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes bs-slideUp {
      from { transform: translateY(24px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }

    .bs-close {
      position: absolute; top: 14px; right: 14px;
      background: #f3f4f6; border: none; border-radius: 50%;
      width: 34px; height: 34px; cursor: pointer;
      font-size: 14px; color: #6b7280;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .bs-close:hover { background: #e5e7eb; }

    .bs-header { text-align: center; margin-bottom: 20px; }
    .bs-hero {
      display: block; font-size: 50px; line-height: 1;
      margin-bottom: 10px;
      animation: bs-wobble 2.5s ease-in-out infinite;
    }
    @keyframes bs-wobble {
      0%,100% { transform: rotate(-5deg) scale(1); }
      50%      { transform: rotate(5deg)  scale(1.08); }
    }
    .bs-title    { font-size: 22px; font-weight: 800; color: #111827; margin-bottom: 4px; letter-spacing: -0.02em; }
    .bs-subtitle { font-size: 13px; color: #6b7280; line-height: 1.5; max-width: 300px; margin: 0 auto; }

    .bs-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 10px; }

    .bs-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px; margin-bottom: 14px;
    }
    .bs-card {
      border: 2px solid #e5e7eb; border-radius: 12px;
      background: #f9fafb; padding: 12px 6px 10px;
      cursor: pointer; text-align: center;
      display: flex; flex-direction: column;
      align-items: center; gap: 4px;
      transition: all 0.15s; position: relative;
      user-select: none; outline: none;
    }
    .bs-card:hover    { border-color: var(--c); background: var(--cl); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
    .bs-card.selected { border-color: var(--c); background: var(--cl); transform: translateY(-2px); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 25%, transparent); }
    .bs-card.selected .bs-card-price { color: var(--c); }
    .bs-card:focus-visible { outline: 2px solid var(--c); outline-offset: 2px; }

    .bs-badge {
      position: absolute; top: -6px; right: -4px;
      background: #EF4444; color: #fff;
      font-size: 8px; font-weight: 800;
      padding: 2px 5px; border-radius: 99px;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .bs-card-emoji { font-size: 24px; line-height: 1.2; }
    .bs-card-name  { font-size: 10px; font-weight: 700; color: #374151; line-height: 1.2; }
    .bs-card-price { font-size: 11px; font-weight: 700; color: #6b7280; transition: color 0.15s; }

    .bs-custom-wrap { margin-bottom: 14px; }

    .bs-preview {
      display: flex; align-items: center;
      background: #f9fafb; border: 1.5px solid #e5e7eb;
      border-radius: 12px; padding: 12px 14px; gap: 12px;
      margin-bottom: 16px; transition: border-color 0.2s, background 0.2s;
    }
    .bs-preview.has-selection {
      border-color: var(--preview-color, #e5e7eb);
      background: var(--preview-bg, #f9fafb);
    }
    .bs-preview-emoji { font-size: 28px; min-width: 32px; }
    .bs-preview-info  { flex: 1; }
    .bs-preview-name  { font-size: 13px; font-weight: 700; color: #111827; }
    .bs-preview-desc  { font-size: 11px; color: #9ca3af; margin-top: 1px; }
    .bs-preview-price { font-size: 18px; font-weight: 800; color: #9ca3af; letter-spacing: -0.02em; }

    .bs-divider { height: 1.5px; background: #f3f4f6; margin-bottom: 16px; border-radius: 2px; }

    .bs-form { display: flex; flex-direction: column; gap: 11px; margin-bottom: 16px; }
    .bs-field { display: flex; flex-direction: column; gap: 4px; }
    .bs-field label {
      font-size: 11px; font-weight: 700; color: #374151;
      text-transform: uppercase; letter-spacing: 0.06em;
      display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
    }
    .bs-req { color: #ef4444; }
    .bs-opt { font-weight: 500; color: #9ca3af; text-transform: none; letter-spacing: 0; font-size: 11px; }
    .bs-field input {
      border: 1.5px solid #e5e7eb; border-radius: 10px;
      padding: 10px 13px; font-size: 14px;
      font-family: inherit; color: #111827; outline: none;
      background: #fff; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .bs-field input:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.12); }
    .bs-field input::placeholder { color: #d1d5db; }

    .bs-prefix-wrap { position: relative; }
    .bs-prefix {
      position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
      font-size: 13px; font-weight: 700; color: #6b7280; pointer-events: none;
    }
    .bs-prefix-wrap input { padding-left: 52px; }

    .bs-error {
      font-size: 13px; color: #dc2626;
      background: #fef2f2; border: 1px solid #fecaca;
      border-radius: 8px; padding: 9px 12px; margin-bottom: 12px;
    }

    .bs-pay-btn {
      width: 100%; padding: 15px;
      color: #fff; border: none; border-radius: 12px;
      font-size: 15px; font-weight: 700; font-family: inherit;
      cursor: pointer; letter-spacing: 0.01em;
      transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      margin-bottom: 14px;
      background: linear-gradient(135deg, #9ca3af, #6b7280);
    }
    .bs-pay-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
    .bs-pay-btn:disabled { cursor: not-allowed; opacity: 0.6; }

    .bs-pay-methods { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 10px; }
    .bs-pm-label    { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; }
    .bs-pm-badges   { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
    .bs-pm          { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 99px; border: 1.5px solid; }
    .bs-pm.airtel   { color: #dc2626; border-color: #fca5a5; background: #fef2f2; }
    .bs-pm.mpamba   { color: #0369a1; border-color: #93c5fd; background: #eff6ff; }
    .bs-pm.bank     { color: #065f46; border-color: #6ee7b7; background: #ecfdf5; }
    .bs-pm.card     { color: #5b21b6; border-color: #c4b5fd; background: #f5f3ff; }

    .bs-note { text-align: center; font-size: 11px; color: #9ca3af; }

    @media (max-width: 380px) {
      .bs-grid { grid-template-columns: repeat(3, 1fr); }
    }
  `;
  document.head.appendChild(style);
}
