import React, { useState, useEffect, useRef } from 'react';
import './BuySnack.css';

const PAYCHANGU_FUNCTION_ID = 'paychangu_proxy'; // ← update if your function ID differs

const SNACKS = [
  { id: 'zitumbuwa', emoji: '🍌', name: 'Zitumbuwa',  desc: 'Malawian banana fritters',     price: 1000,  color: '#F59E0B', bg: '#FFFDE7' },
  { id: 'doughnut',  emoji: '🍩', name: 'Doughnut',   desc: 'Sweet glazed treat',           price: 2000,  color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'popcorn',   emoji: '🍿', name: 'Popcorn',    desc: 'Light & crunchy snack',        price: 3000,  color: '#EF4444', bg: '#FEF2F2' },
  { id: 'samosa',    emoji: '🥟', name: 'Samosa',     desc: 'Crispy & spicy pastry',        price: 4000,  color: '#10B981', bg: '#ECFDF5' },
  { id: 'crisps',    emoji: '🥔', name: 'Crisps',     desc: 'Crunchy packet crisps',        price: 5000,  color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'chips',     emoji: '🍟', name: 'Chips',      desc: 'Hot street chips',             price: 6000,  color: '#F97316', bg: '#FFF7ED' },
  { id: 'cake',      emoji: '🎂', name: 'Cake Slice', desc: 'Sweet celebration treat',      price: 8000,  color: '#EC4899', bg: '#FDF2F8' },
  { id: 'box',       emoji: '🎁', name: 'Snack Box',  desc: 'The full spread!',             price: 10000, color: '#3B82F6', bg: '#EFF6FF', badge: 'Best' },
  { id: 'custom',    emoji: '✏️', name: 'Custom',     desc: 'Enter your own amount',        price: 0,     color: '#6B7280', bg: '#F9FAFB' },
];

const ANIM_MAP = {
  doughnut: 'bs-anim-spin', popcorn: 'bs-anim-bounce', samosa: 'bs-anim-shake',
  zitumbuwa: 'bs-anim-bounce', crisps: 'bs-anim-shake', chips: 'bs-anim-pop',
  cake: 'bs-anim-pop', box: 'bs-anim-spin', custom: 'bs-anim-pop',
};

export default function BuySnackWidget({ paychanguPublicKey = null }) {
  const [fabVisible, setFabVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState(0);
  const [animatingId, setAnimatingId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const customInputRef = useRef(null);

  // FAB visibility mirrors #tab-home active state, same as original MutationObserver
  useEffect(() => {
    const homeTab = document.getElementById('tab-home');
    if (!homeTab) return;
    const update = () => setFabVisible(homeTab.classList.contains('active'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(homeTab, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  function closeModal() {
    setIsOpen(false);
    setError('');
    setLoading(false);
  }

  function selectSnack(id) {
    const snack = SNACKS.find(s => s.id === id);
    if (!snack) return;

    setAnimatingId(id);
    setTimeout(() => setAnimatingId(null), 700);

    const custom = id === 'custom';
    setSelectedId(id);
    setIsCustom(custom);

    if (custom) {
      setCustomAmount(0);
      setTimeout(() => customInputRef.current?.focus(), 0);
    }
  }

  const selectedSnack = SNACKS.find(s => s.id === selectedId) || null;
  const currentPrice = isCustom ? customAmount : (selectedSnack?.price || 0);
  const previewColor = selectedSnack?.color || '#9ca3af';
  const previewBg = selectedSnack?.bg || '#F9FAFB';
  const payDisabled = !selectedSnack || !currentPrice || (isCustom && customAmount < 1000);

  function payButtonLabel() {
    if (!selectedSnack) return 'Select a snack to continue';
    if (isCustom && customAmount < 1000) return 'Enter an amount to continue';
    return `Pay MWK ${currentPrice.toLocaleString()} via Paychangu`;
  }

  async function processDonation() {
    setError('');

    if (!selectedSnack) { setError('Please select a snack first.'); return; }
    if (!currentPrice || currentPrice < 1000) {
      setError('Please enter a valid amount (minimum MWK 1,000).');
      customInputRef.current?.focus();
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    const donorName = name.trim() || 'Supporter';
    const [firstName, ...rest] = donorName.split(' ');
    const lastName = rest.join(' ') || 'Supporter';

    const publicKey = paychanguPublicKey
      ?? window.PAYCHANGU_PUBLIC_KEY
      ?? (typeof window.loadedConfig !== 'undefined' && window.loadedConfig?.paychangu_public_key)
      ?? null;

    if (typeof window.AppwriteFunctions === 'undefined') {
      setError('Payment not available — Appwrite client not initialised.');
      console.error('[BuySnackWidget] window.AppwriteFunctions is undefined. Ensure appwriteClient.js loads before this component.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        amount: currentPrice,
        currency: 'MWK',
        email: trimmedEmail,
        first_name: firstName,
        last_name: lastName,
        ...(phone.trim() && { phone_number: phone.trim() }),
        ...(publicKey && { public_key: publicKey }),
        callback_url: 'https://minutriq.me',
        return_url: 'https://minutriq.me/?donated=true',
        tx_ref: `OASIS-SNACK-${Date.now()}`,
        customization: {
          title: 'Support Oasis',
          description: `${selectedSnack.emoji} ${selectedSnack.name} — Thank you for supporting free clinical nutrition tools in Malawi 🇲🇼`,
          logo: 'https://minutriq.me/icons/icon-192.png',
        },
      };

      const exec = await window.AppwriteFunctions.createExecution(
        PAYCHANGU_FUNCTION_ID,
        JSON.stringify(payload),
        false
      );

      let data;
      try {
        data = JSON.parse(exec.responseBody);
      } catch (_) {
        throw new Error('Invalid response from payment proxy.');
      }

      if (exec.responseStatusCode !== 200 || data?.status !== 'success') {
        setError(data?.message || 'Payment could not be initiated. Please try again.');
        return;
      }

      if (data?.data?.checkout_url) {
        window.location.href = data.data.checkout_url;
      } else {
        setError('No checkout URL returned. Please try again.');
      }
    } catch (err) {
      console.error('[BuySnackWidget] Appwrite Function error:', err);
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        id="bs-fab"
        aria-label="Buy me a Snack"
        title="Buy me a Snack 🍿"
        style={{ display: fabVisible ? 'flex' : 'none' }}
        onClick={() => setIsOpen(true)}
      >
        <span style={{ fontSize: 17, lineHeight: 1 }}>🍿</span>
        <span>Buy me a Snack</span>
      </button>

      <div
        id="buysnack-overlay"
        className={isOpen ? 'active' : ''}
        role="dialog"
        aria-modal="true"
        aria-labelledby="buysnack-title"
        onClick={(e) => { if (e.target.id === 'buysnack-overlay') closeModal(); }}
      >
        <div className="bs-modal" id="bs-modal">
          <button className="bs-close" id="bs-close" aria-label="Close" onClick={closeModal}>✕</button>

          <div className="bs-header">
            <span className="bs-hero">🍿</span>
            <h2 className="bs-title" id="buysnack-title">Buy me a Snack</h2>
            <p className="bs-subtitle">Pick a snack &amp; support Oasis — free clinical nutrition tools for Malawi 🇲🇼</p>
          </div>

          <p className="bs-section-label">Choose a snack</p>
          <div className="bs-grid" id="bs-grid">
            {SNACKS.map(s => (
              <div
                key={s.id}
                className={`bs-card${selectedId === s.id ? ' selected' : ''}`}
                id={`bs-card-${s.id}`}
                style={{ '--c': s.color, '--cl': s.bg }}
                role="button"
                tabIndex={0}
                aria-label={`${s.name} MWK ${s.price || 'custom'}`}
                onClick={() => selectSnack(s.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectSnack(s.id); }}
              >
                {s.badge && <span className="bs-badge">{s.badge}</span>}
                <span className={`bs-card-emoji${animatingId === s.id ? ' ' + (ANIM_MAP[s.id] || 'bs-anim-pop') : ''}`}>{s.emoji}</span>
                <span className="bs-card-name">{s.name}</span>
                <span className="bs-card-price">{s.price ? 'K' + s.price.toLocaleString() : 'Any'}</span>
              </div>
            ))}
          </div>

          <div className="bs-custom-wrap" id="bs-custom-wrap" hidden={!isCustom}>
            <div className="bs-field">
              <label htmlFor="bs-custom-input">
                Your amount <span className="bs-req">*</span>
                <span className="bs-opt">minimum MWK 1,000</span>
              </label>
              <div className="bs-prefix-wrap">
                <span className="bs-prefix">MWK</span>
                <input
                  ref={customInputRef}
                  type="number"
                  id="bs-custom-input"
                  placeholder="e.g. 2000"
                  min="1000"
                  value={customAmount || ''}
                  onChange={(e) => setCustomAmount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="bs-preview" id="bs-preview" style={{ '--preview-color': previewColor, '--preview-bg': previewBg }}>
            <span className="bs-preview-emoji" id="bs-preview-emoji">{selectedSnack ? selectedSnack.emoji : '👆'}</span>
            <div className="bs-preview-info">
              <div className="bs-preview-name" id="bs-preview-name">
                {selectedSnack ? (isCustom ? 'Custom Snack' : selectedSnack.name) : 'Pick a snack above'}
              </div>
              <div className="bs-preview-desc" id="bs-preview-desc">
                {selectedSnack
                  ? (isCustom ? (customAmount >= 1000 ? 'Your custom amount' : 'Minimum MWK 1,000') : selectedSnack.desc)
                  : 'Your support keeps Oasis free'}
              </div>
            </div>
            <span className="bs-preview-price" id="bs-preview-price" style={{ color: currentPrice ? previewColor : '#9ca3af' }}>
              {currentPrice ? `MWK ${currentPrice.toLocaleString()}` : '—'}
            </span>
          </div>

          <div className="bs-divider"></div>

          <div className="bs-form">
            <div className="bs-field">
              <label htmlFor="bs-name">Your name</label>
              <input type="text" id="bs-name" placeholder="e.g. Chisomo Banda" autoComplete="name"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="bs-field">
              <label htmlFor="bs-email">Email <span className="bs-req">*</span></label>
              <input type="email" id="bs-email" placeholder="you@example.com" autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="bs-field">
              <label htmlFor="bs-phone">Phone <span className="bs-opt">optional · Airtel / Mpamba</span></label>
              <input type="tel" id="bs-phone" placeholder="+265 99x xxx xxx" autoComplete="tel"
                value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          {error && <p className="bs-error" id="bs-error">{error}</p>}

          <button
            className="bs-pay-btn"
            id="bs-pay-btn"
            disabled={payDisabled || loading}
            style={{
              background: (payDisabled || loading)
                ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                : `linear-gradient(135deg, ${previewColor}, ${previewColor}cc)`
            }}
            onClick={processDonation}
          >
            {loading ? 'Redirecting to Paychangu…' : payButtonLabel()}
          </button>

          <div className="bs-pay-methods">
            <span className="bs-pm-label">Accepted Payment Methods</span>
            <div className="bs-pm-badges">
              <span className="bs-pm airtel">
                <img className="bs-pm-icon" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='8' fill='%23E63329'/%3E%3Cpath d='M10.6 11H9.2L8.7 9.6H6.3L5.8 11H4.4L6.8 5h2l2.8 6zm-2.3-2.3L7.5 6.5l-.8 2.2h1.6z' fill='white'/%3E%3C/svg%3E" />
                {' '}Airtel Money
              </span>
              <span className="bs-pm mpamba">
                <img className="bs-pm-icon" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='8' fill='%231B8C3A'/%3E%3Cpath d='M3.5 11V5h1.8l1.7 3 1.7-3H10.5v6H9.2V7.2L7.3 10H6.7L4.8 7.2V11z' fill='white'/%3E%3C/svg%3E" />
                {' '}TNM Mpamba
              </span>
              <span className="bs-pm bank">🏦 Bank Transfer</span>
              <span className="bs-pm card"><span className="bs-card-ticker">💳 Card</span></span>
            </div>
          </div>

          <p className="bs-note">🇲🇼 Powered by Paychangu · Licensed by the Reserve Bank of Malawi</p>
        </div>
      </div>
    </>
  );
}
