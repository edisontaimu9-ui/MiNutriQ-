  // ── Web App Manifest ─────────────────────────────────────────
  // The manifest now lives as a real static file at /manifest.json
  // (see <link rel="manifest" href="/manifest.json"> in <head>).
  // It is no longer built in JS and swapped in as a blob: URL —
  // that approach left the tag pointing at a 404 until this script
  // ran, and blob: manifests aren't fetchable by Android's WebAPK
  // minting service or by crawlers, which silently broke "Add to
  // Home Screen" icon resolution. A real file fixes both.

  // Wire up the apple-touch-icon link so iOS home-screen installs get an icon.
  // Uses the dedicated 180×180 apple-touch-icon.png (not a resized PWA icon) —
  // matches Apple's recommended home-screen icon size exactly.
  const appleIconEl = document.getElementById('pwa-apple-icon');
  if (appleIconEl) appleIconEl.href = '/icons/apple-touch-icon.png';
