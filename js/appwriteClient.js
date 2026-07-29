/**
 * appwriteClient.js — Appwrite SDK client for Oasis Library
 * ──────────────────────────────────────────────────────────
 * Initialises and exposes the Appwrite client, Storage,
 * Databases, and Functions instances.  All four share the
 * same Client so project ID and session propagate to every
 * service automatically.
 *
 * Firebase Auth is NOT migrated — window.firebase.auth() is
 * still used for session management everywhere else in the app.
 *
 * ── Required index.html addition (before library.js) ────────
 *   <script src="https://cdn.jsdelivr.net/npm/appwrite@15/dist/iife/sdk.js"></script>
 *   <script src="appwriteClient.js"></script>
 *
 * ── Appwrite Console permissions ────────────────────────────
 *   Storage Bucket  (APPWRITE_BUCKET_ID)
 *     • read("users")   — authenticated Appwrite users can read files
 *     • create("users") — authenticated Appwrite users can upload
 *
 *   Database Collection (APPWRITE_COLLECTION_ID)
 *     • read("users")   — authenticated Appwrite users can query
 *     • create("users") — authenticated Appwrite users can write
 *
 *   Functions (per-function in Appwrite console)
 *     • execute("any")   — allow unauthenticated frontend calls, OR
 *     • execute("users") — restrict to authenticated Appwrite users
 *
 *   Note: frontend calls use the client-side SDK with only the
 *   project ID as identification.  API-key proxying (Cloudflare
 *   Worker) is deferred to the next PR; until then, set
 *   read("any") / create("any") in the Appwrite console for
 *   development, and tighten before production.
 *
 * ── Calling a Function from any module ──────────────────────
 *   window.AppwriteFunctions.createExecution(
 *     'your-function-id',        // Function ID from Appwrite console
 *     JSON.stringify({ key: 'value' }),  // request body (must be string)
 *     false                      // false = synchronous (wait for result)
 *   ).then(function(exec) {
 *     var result = JSON.parse(exec.responseBody);
 *   }).catch(function(e) {
 *     console.error('[Functions]', e);
 *   });
 * ────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ── Appwrite project configuration ───────────────────── */
  var APPWRITE_ENDPOINT    = 'https://sgp.cloud.appwrite.io/v1';
  var APPWRITE_PROJECT_ID  = '6a25de8d000c21cbdbba';
  var APPWRITE_DATABASE_ID = '6a25e03b0031c4391fa4';
  var APPWRITE_BUCKET_ID   = '6a25df33001285e51ee6';

  /**
   * APPWRITE_COLLECTION_ID — fill in after creating the
   * "library_resources" collection in the Appwrite console.
   *
   * Required collection attributes (String unless noted):
   *   title, titleLower, description, category,
   *   tags (String[], array), source, fileType,
   *   fileId, externalLink, fileName,
   *   fileSize (Integer), uploadedBy, uploaderName,
   *   createdAt, status, reviewNote,
   *   bookmarkCount (Integer), viewCount (Integer),
   *   downloadCount (Integer)
   *
   * Required indexes:
   *   • status (ASC)  — for listing approved resources
   *   • uploadedBy (ASC) + createdAt (DESC) — for "My Uploads"
   *   • uploadedBy (ASC) + titleLower (ASC) — for dup-check
   */
  var APPWRITE_COLLECTION_ID = 'library-resources';

  /* Guard: Appwrite IIFE SDK must already be loaded */
  if (typeof Appwrite === 'undefined' || !Appwrite.Client) {
    console.error(
      '[AppwriteClient] Appwrite SDK not found. ' +
      'Add <script src="https://cdn.jsdelivr.net/npm/appwrite@15/dist/iife/sdk.js"></script> ' +
      'before appwriteClient.js in index.html.'
    );
    return;
  }

  /* ── Initialise client ──────────────────────────────────── */
  var client = new Appwrite.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

  var storage   = new Appwrite.Storage(client);
  var databases = new Appwrite.Databases(client);
  var functions = new Appwrite.Functions(client);

  /* ── Expose globally for library.js and other modules ──── */
  window.AppwriteClient    = client;
  window.AppwriteStorage   = storage;
  window.AppwriteDatabases = databases;
  window.AppwriteFunctions = functions;   // call via createExecution() — see header

  /* ── Constants consumed by library.js ──────────────────── */
  window.APPWRITE_ENDPOINT       = APPWRITE_ENDPOINT;
  window.APPWRITE_PROJECT_ID     = APPWRITE_PROJECT_ID;
  window.APPWRITE_DATABASE_ID    = APPWRITE_DATABASE_ID;
  window.APPWRITE_BUCKET_ID      = APPWRITE_BUCKET_ID;
  window.APPWRITE_COLLECTION_ID  = APPWRITE_COLLECTION_ID;

  console.log('[AppwriteClient] Initialised — project:', APPWRITE_PROJECT_ID,
              '| services: Storage, Databases, Functions');
})();
