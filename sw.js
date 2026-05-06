/**
 * sw.js — MiNutriQ Service Worker
 * ─────────────────────────────────────────────────────────────────────────
 * Extracted from index.html (was generated as a Blob URL at runtime).
 * Now registered as a real file: navigator.serviceWorker.register('/sw.js?v=VERSION')
 *
 * Version is passed via query param (?v=) so the browser detects changes
 * via the URL itself, enabling proper HTTP cache-busting without blob: URLs.
 *
 * Strategy: Network-first for navigation + Firebase/CDN resources.
 *           Cache-first for sub-resources (scripts, styles, fonts).
 *           Offline fallback page baked in.
 *
 * Author : Edison Taimu
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Read version from query param (?v=1.2.5) injected at registration ──
const _swParams   = new URL(self.location.href).searchParams;
const SW_VERSION  = _swParams.get('v') || 'unknown';
const CACHE       = 'minutriq-v' + SW_VERSION;

// PRECACHE: use the SW scope root (the app shell URL) instead of the
// page's location.href (which was only available via template literal).
// self.registration.scope resolves to the deployed app root, e.g. https://example.com/
const PRECACHE    = [self.registration.scope];
const OFFLINE_URL = '__offline__';

// ── Offline fallback page (baked-in, no network needed) ─────
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MiNutriQ — Offline</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #020617;
    color: #e2e8f0;
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    text-align: center;
    gap: 0;
  }
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse at 30% 25%, rgba(29,233,212,0.06) 0%, transparent 55%),
      radial-gradient(ellipse at 72% 75%, rgba(96,165,250,0.05) 0%, transparent 50%);
    pointer-events: none;
  }
  .ring-wrap {
    position: relative;
    width: 80px; height: 80px;
    margin-bottom: 28px;
  }
  .ring {
    position: absolute; inset: 0;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top-color: #1de9d4;
    border-right-color: rgba(29,233,212,0.25);
    animation: spin 1.4s linear infinite;
  }
  .ring-inner {
    position: absolute; inset: 9px;
    border-radius: 50%;
    border: 1.5px solid transparent;
    border-bottom-color: rgba(96,165,250,0.45);
    animation: spin 2s linear infinite reverse;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .icon-bg {
    position: absolute; inset: 16px;
    border-radius: 50%;
    background: rgba(10,22,40,0.9);
    border: 1px solid rgba(29,233,212,0.12);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
  }
  h1 {
    font-size: 20px; font-weight: 800;
    letter-spacing: 1px;
    color: #f0f6ff;
    margin-bottom: 8px;
  }
  .badge {
    display: inline-block;
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 9px; font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(29,233,212,0.8);
    background: rgba(29,233,212,0.08);
    border: 1px solid rgba(29,233,212,0.2);
    border-radius: 20px;
    padding: 4px 12px;
    margin-bottom: 20px;
  }
  p {
    font-size: 13px; color: rgba(148,174,208,0.75);
    line-height: 1.7; max-width: 320px;
    margin-bottom: 28px;
  }
  .feats {
    display: flex; flex-direction: column; gap: 8px;
    width: 100%; max-width: 300px;
    margin-bottom: 32px;
  }
  .feat {
    background: rgba(15,23,42,0.8);
    border: 1px solid rgba(56,100,168,0.2);
    border-radius: 10px;
    padding: 10px 14px;
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 10px;
    color: rgba(148,174,208,0.7);
    text-align: left;
    display: flex; align-items: center; gap: 10px;
  }
  .feat-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #1de9d4; flex-shrink: 0;
  }
  .btn {
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 11px; font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    background: #1de9d4; color: #020617;
    border: none; border-radius: 10px;
    padding: 13px 32px;
    cursor: pointer;
    transition: opacity .15s, transform .15s;
  }
  .btn:hover { opacity: .85; transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }
  footer {
    position: fixed; bottom: 20px;
    font-family: ui-monospace, monospace;
    font-size: 8.5px;
    color: rgba(100,130,165,0.4);
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="ring-wrap">
    <div class="ring"></div>
    <div class="ring-inner"></div>
    <div class="icon-bg">📡</div>
  </div>
  <h1>You're Offline</h1>
  <div class="badge">MiNutriQ</div>
  <p>The app couldn't be reached from cache. Once you connect or reload, full functionality resumes instantly.</p>
  <div class="feats">
    <div class="feat"><div class="feat-dot"></div>All calculations run locally — no internet needed</div>
    <div class="feat"><div class="feat-dot"></div>Patient data saved to device storage</div>
    <div class="feat"><div class="feat-dot"></div>Meal plans &amp; history fully available offline</div>
  </div>
  <button class="btn" onclick="location.reload()">↺ Try Again</button>
  <footer>MiNutriQ · Offline Fallback · By Edison Taimu</footer>
</body>
</html>`;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // Cache the app shell + store the offline page
      c.addAll(PRECACHE).then(() =>
        c.put(OFFLINE_URL, new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Always network-first for Firebase/CDN resources — fall back to cache only,
  // never serve offline HTML for non-navigation requests
  if (url.hostname.includes('firebase') || url.hostname.includes('gstatic') || url.hostname.includes('googleapis')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // For navigation requests (page load), network-first → cache → offline fallback
  // Network-first ensures new deployments are always served, not stale cache.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() =>
        // Network failed — try cache, then fall back to offline page
        caches.match(e.request).then(cached => cached || caches.match(OFFLINE_URL))
      )
    );
    return;
  }

  // Sub-resources (scripts, styles, fonts): cache-first with network update
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

// Listen for skipWaiting message from client
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// ── PUSH NOTIFICATIONS ─────────────────────────────────────────
self.addEventListener('push', e => {
  let payload = { title: 'MiNutriQ', body: 'You have a new notification.', tag: 'nt-default' };
  try { if (e.data) payload = { ...payload, ...e.data.json() }; } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(payload.title, {
      body:              payload.body,
      icon:              payload.icon  || '',
      badge:             payload.badge || '',
      tag:               payload.tag,
      data:              payload.data  || {},
      vibrate:           [150, 60, 150],
      requireInteraction: !!payload.requireInteraction,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || self.location.href.split('?')[0];
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if (c.url && 'focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

self.addEventListener('pushsubscriptionchange', e => {
  // Re-subscribe when browser rotates the subscription
  e.waitUntil(
    self.registration.pushManager.subscribe(e.oldSubscription
      ? { userVisibleOnly: true, applicationServerKey: e.oldSubscription.options.applicationServerKey }
      : { userVisibleOnly: true }
    ).catch(() => {})
  );
});
