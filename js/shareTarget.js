/**
 * shareTarget.js — Web Share Target consumer
 * ─────────────────────────────────────────────────────────────────────────
 * Pairs with the "share_target" entry in manifest.json and the POST
 * /share-target/ handler in sw.js.
 *
 * Flow:
 *   1. User shares a photo / PDF / link / text into Oasis from another app
 *      (gallery, camera roll, browser share sheet, etc.).
 *   2. Browser POSTs the multipart payload to /share-target/.
 *   3. sw.js intercepts it, stashes it in IndexedDB, and 303-redirects to
 *      "/?share-target=1".
 *   4. This script runs on load, notices the query param, reads the stashed
 *      payload back out of IndexedDB, and routes it to the right place in
 *      the app:
 *        - image  → opens the barcode scanner, gallery tab, pre-loaded
 *        - PDF    → opens Library → Upload, pre-loaded, for the user to
 *                   finish tagging and submit for review
 *        - text/url (no file) → dropped into the food search box
 *
 * Author: Edison Taimu
 * ─────────────────────────────────────────────────────────────────────────
 */
(function () {
  const DB_NAME = 'oasis-share-target';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('incoming');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function takeLatest() {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('incoming', 'readwrite');
      const store = tx.objectStore('incoming');
      const getReq = store.get('latest');
      getReq.onsuccess = () => {
        const val = getReq.result;
        store.delete('latest');
        tx.oncomplete = () => { db.close(); resolve(val); };
      };
      getReq.onerror = () => { db.close(); reject(getReq.error); };
    }));
  }

  function waitFor(fnName, tries = 40) {
    return new Promise(resolve => {
      (function poll(n) {
        if (typeof window[fnName] === 'function') return resolve(true);
        if (n <= 0) return resolve(false);
        setTimeout(() => poll(n - 1), 150);
      })(tries);
    });
  }

  function fileFromBlob(blob, name, type) {
    try {
      return new File([blob], name || 'shared-file', { type: type || blob.type });
    } catch (e) {
      // Safari-style fallback
      blob.name = name || 'shared-file';
      return blob;
    }
  }

  function setInputFiles(input, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
  }

  async function routeImage(file) {
    const ok = await waitFor('hpBarcodeOpen');
    if (!ok) return;
    window.hpBarcodeOpen();
    if (typeof window.hpBarcodeSetTab === 'function') {
      window.hpBarcodeSetTab('gallery');
    }
    const input = document.getElementById('bc-file-input');
    if (input) {
      setInputFiles(input, file);
      if (typeof window.hpBarcodeGalleryPick === 'function') {
        window.hpBarcodeGalleryPick(input);
      }
    }
  }

  async function routeDocument(file) {
    const ok = await waitFor('switchTab');
    if (!ok) return;
    window.switchTab('library');
    const readyLib = await waitFor('LibraryModule', 40);
    if (!readyLib || !window.LibraryModule || typeof window.LibraryModule.switchPanel !== 'function') return;
    window.LibraryModule.switchPanel('upload');
    // Give the upload panel a moment to render its DOM before wiring the file.
    setTimeout(() => {
      const input = document.getElementById('lib-file-input');
      if (input) {
        setInputFiles(input, file);
        if (typeof window.LibraryModule.onFileSelect === 'function') {
          window.LibraryModule.onFileSelect({ target: input });
        }
      }
    }, 300);
  }

  async function routeTextOrUrl(text, url) {
    const ok = await waitFor('hpSearch');
    if (!ok) return;
    const q = document.getElementById('hp-search-q');
    if (!q) return;
    q.value = (url && url.trim()) ? url.trim() : (text || '').trim();
    q.dispatchEvent(new Event('input'));
    if (q.value) window.hpSearch();
  }

  async function consumeSharedPayload() {
    const params = new URLSearchParams(location.search);
    if (params.get('share-target') !== '1') return;

    // Strip the marker from the URL so a refresh doesn't re-trigger routing.
    const cleanUrl = location.pathname + location.hash;
    history.replaceState(null, '', cleanUrl);

    let payload;
    try {
      payload = await takeLatest();
    } catch (e) {
      console.warn('[shareTarget] could not read stashed payload', e);
      return;
    }
    if (!payload) return;

    const { fileBlob, fileName, fileType, text, url } = payload;

    if (fileBlob && fileType && fileType.startsWith('image/')) {
      await routeImage(fileFromBlob(fileBlob, fileName, fileType));
    } else if (fileBlob && (fileType === 'application/pdf' || /\.pdf$/i.test(fileName || ''))) {
      await routeDocument(fileFromBlob(fileBlob, fileName, fileType));
    } else if (text || url) {
      await routeTextOrUrl(text, url);
    }
  }

  // ── File Handling API: user double-taps an image/PDF in their file
  // manager and picks Oasis to open it with (see "file_handlers" in
  // manifest.json). No service worker relay needed — the browser hands us
  // FileSystemFileHandle objects directly via launchQueue.
  function consumeLaunchFiles() {
    if (!('launchQueue' in window) || !window.launchQueue) return;
    window.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams.files || !launchParams.files.length) return;
      try {
        const handle = launchParams.files[0];
        const file = await handle.getFile();
        if (file.type.startsWith('image/')) {
          await routeImage(file);
        } else if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')) {
          await routeDocument(file);
        }
      } catch (e) {
        console.warn('[shareTarget] launch file handling failed', e);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Defer slightly so the rest of the app's boot scripts (which register
    // hpBarcodeOpen, LibraryModule, hpSearch, etc.) have a chance to run.
    setTimeout(consumeSharedPayload, 400);
    setTimeout(consumeLaunchFiles, 400);
  });
})();
