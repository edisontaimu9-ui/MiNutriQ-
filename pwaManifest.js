(function () {
  'use strict';

  // Icon PNGs are served as static files from /icons/.
  // (Not read from window globals — nothing else in the app sets those.)
  var iconPNG48URL  = '/icons/icon-48.png';
  var iconPNG72URL  = '/icons/icon-72.png';
  var iconPNG96URL  = '/icons/icon-96.png';
  var iconPNG128URL = '/icons/icon-128.png';
  var iconPNG144URL = '/icons/icon-144.png';
  var iconPNG152URL = '/icons/icon-152.png';
  var iconPNG192URL = '/icons/icon-192.png';
  var iconPNG384URL = '/icons/icon-384.png';
  var iconPNG512URL = '/icons/icon-512.png';

  // Wire up the apple-touch-icon link so iOS home-screen installs get an icon.
  var appleIconEl = document.getElementById('pwa-apple-icon');
  if (appleIconEl) appleIconEl.href = iconPNG192URL; // PNG for iOS home-screen

  var manifest = {
    name: 'Oasis',
    short_name: 'Oasis',
    description: 'Clinical nutrition decision support tool — Adult, Pediatric, Enteral, Meal Planner. Works offline.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#020617',
    theme_color: '#020617',   // matches background_color → seamless Android 12 system splash
    categories: ['medical', 'health', 'utilities'],
    icons: [
      // PNG raster — SPLIT 'any' + 'maskable' per size.
      // Android 12+ requires separate entries (not combined 'any maskable') to correctly
      // select the maskable variant for the system splash screen adaptive icon.
      // 512×512 maskable is placed last — browsers/OS pick the highest-res maskable first.
      { src: iconPNG48URL,  sizes: '48x48',   type: 'image/png', purpose: 'any' },
      { src: iconPNG48URL,  sizes: '48x48',   type: 'image/png', purpose: 'maskable' },
      { src: iconPNG72URL,  sizes: '72x72',   type: 'image/png', purpose: 'any' },
      { src: iconPNG72URL,  sizes: '72x72',   type: 'image/png', purpose: 'maskable' },
      { src: iconPNG96URL,  sizes: '96x96',   type: 'image/png', purpose: 'any' },
      { src: iconPNG96URL,  sizes: '96x96',   type: 'image/png', purpose: 'maskable' },
      { src: iconPNG128URL, sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: iconPNG128URL, sizes: '128x128', type: 'image/png', purpose: 'maskable' },
      { src: iconPNG144URL, sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: iconPNG144URL, sizes: '144x144', type: 'image/png', purpose: 'maskable' },
      { src: iconPNG152URL, sizes: '152x152', type: 'image/png', purpose: 'any' },
      { src: iconPNG152URL, sizes: '152x152', type: 'image/png', purpose: 'maskable' },
      { src: iconPNG192URL, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: iconPNG192URL, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: iconPNG384URL, sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: iconPNG384URL, sizes: '384x384', type: 'image/png', purpose: 'maskable' },
      { src: iconPNG512URL, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: iconPNG512URL, sizes: '512x512', type: 'image/png', purpose: 'maskable' }, // ← Android 12 splash icon
    ],
    shortcuts: [
      { name: 'Calculator',   short_name: 'Calc',    url: './#calculator', description: 'Open nutrition calculator' },
      { name: 'Meal Planner', short_name: 'Planner', url: './#mealplan',   description: 'Open meal planner' },
    ],
    screenshots: [
      { label: 'Adult Nutrition Calculator', form_factor: 'wide' },
      { label: 'Pediatric Assessment',       form_factor: 'narrow' },
    ],
  };

  var manifestEl = document.getElementById('pwa-manifest');
  if (manifestEl) {
    var mBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    manifestEl.href = URL.createObjectURL(mBlob);
  }
})();
