/**
 * library.js — Oasis Nutrition Resource Library Module
 * ─────────────────────────────────────────────────────────────
 * Version  : 1.2.0
 * Author   : Edison Taimu
 * Project  : Oasis Clinical Nutrition Decision Support Tool
 *
 * Features:
 *  • Upload PDFs, DOCX, images and external links with rich metadata
 *  • Required fields: title, description, category, tags, source
 *  • Pending → Approved / Rejected review workflow (admin-controlled)
 *  • Browse + search + multi-filter approved resources
 *  • PDF viewer (iframe), image viewer, DOCX/link handler
 *  • Bookmark & share (Web Share API or clipboard fallback)
 *  • Related resources (same category / overlapping tags)
 *  • Offline APA 7th & Vancouver citation generator with copy button
 *  • Real-time Firestore listener → in-app approval/rejection alerts
 *  • Notification dot on nav tab for unread status changes
 *  • Firebase Storage for file uploads (max 25 MB)
 *  • Duplicate upload guard (per-user, by title)
 *  • view / download tracking counters
 *  • Admin dashboard hooks: exposes window.LibraryAdminAPI
 *
 * Storage / Database:
 *  • Appwrite Storage bucket  : APPWRITE_BUCKET_ID   (see appwriteClient.js)
 *  • Appwrite Database        : APPWRITE_DATABASE_ID
 *  • Appwrite Collection      : APPWRITE_COLLECTION_ID
 *  • Bookmarks                : localStorage  key "oasis_lib_bm_{uid}"
 *
 * Firebase Auth is NOT migrated — window.firebase.auth() is still used
 * for session management.  Only Storage and Firestore have been replaced.
 *
 * Integration:
 *  1. Add Appwrite SDK CDN before appwriteClient.js (see appwriteClient.js)
 *  2. Add <script src="appwriteClient.js"></script> before library.js
 *  3. Add <script src="library.js"></script> before </body> in index.html
 *  4. Appwrite bucket/collection permissions: see appwriteClient.js header
 *
 * Appwrite document schema (library_resources collection):
 *  {
 *    title         : string           // display title
 *    titleLower    : string           // lowercase — used for dup-check queries
 *    description   : string
 *    category      : string           // from LIB_CATEGORIES
 *    tags          : string[]
 *    source        : string           // publisher / journal / organisation
 *    fileType      : 'pdf'|'docx'|'image'|'link'
 *    fileId        : string           // Appwrite Storage file $id (empty for links)
 *    externalLink  : string           // external URL             (empty for files)
 *    fileName      : string
 *    fileSize      : number           // bytes
 *    uploadedBy    : string           // Firebase Auth UID
 *    uploaderName  : string
 *    createdAt     : string           // ISO 8601 timestamp (maps to uploadedAt in UI)
 *    status        : 'approved'|'rejected'  // open publishing — uploads are approved immediately
 *    reviewNote    : string           // admin comment
 *    bookmarkCount : number
 *    viewCount     : number
 *    downloadCount : number
 *  }
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ════════════════════════════════════════════════════
     CONSTANTS
  ════════════════════════════════════════════════════ */
  var LIB_VERSION       = '1.3.0';   // bumped: Appwrite backend migration
  /* Appwrite config — values are set by appwriteClient.js and read at call-time
     so that the script can be loaded before window.APPWRITE_* are defined.    */
  var _AW_DB_ID   = function(){ return window.APPWRITE_DATABASE_ID   || ''; };
  var _AW_COL_ID  = function(){ return window.APPWRITE_COLLECTION_ID || ''; };
  var _AW_BKT_ID  = function(){ return window.APPWRITE_BUCKET_ID     || ''; };
  var _AW_EP      = function(){ return window.APPWRITE_ENDPOINT       || ''; };
  var _AW_PROJ    = function(){ return window.APPWRITE_PROJECT_ID     || ''; };

  /* Legacy name kept for LibraryAdminAPI.COLLECTION compatibility */
  var LIB_COL     = 'library_resources';
  var LIB_MAX_MB  = 25;

  var LIB_MIME_MAP = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'docx',
    'image/jpeg':  'image',
    'image/jpg':   'image',
    'image/png':   'image',
    'image/gif':   'image',
    'image/webp':  'image'
  };

  var LIB_CATEGORIES = [
    { id: 'clinical_guidelines',  label: 'Clinical Guidelines' },
    { id: 'research_articles',    label: 'Research Articles' },
    { id: 'protocols',            label: 'Protocols & SOPs' },
    { id: 'patient_education',    label: 'Patient Education' },
    { id: 'reference_tables',     label: 'Reference Tables & Charts' },
    { id: 'assessment_tools',     label: 'Assessment Tools' },
    { id: 'enteral_parenteral',   label: 'Enteral & Parenteral Nutrition' },
    { id: 'pediatric',            label: 'Pediatric Nutrition' },
    { id: 'disease_specific',     label: 'Disease-Specific Nutrition' },
    { id: 'malawi_context',       label: 'Malawi / Sub-Saharan Africa' },
    { id: 'textbooks',            label: 'Textbooks & Manuals' },
    { id: 'other',                label: 'Other' }
  ];

  var LIB_FTYPES = [
    { id: 'pdf',   label: 'PDF Document' },
    { id: 'docx',  label: 'Word Document (DOCX)' },
    { id: 'image', label: 'Image (JPG / PNG / GIF / WebP)' },
    { id: 'link',  label: 'External Link / URL' }
  ];

  /* ════════════════════════════════════════════════════
     STATE
  ════════════════════════════════════════════════════ */
  var _auth          = null;
  var _user          = null;
  var _resources     = [];      // approved resources cache
  var _myResources   = [];      // current user's uploads cache
  var _bookmarks     = {};      // { resourceId: true } — stored in localStorage
  var _panel         = 'browse';
  var _filterCat     = '';
  var _filterType    = '';
  var _searchQ       = '';
  var _activeRes     = null;
  var _citStyle      = 'apa';
  var _uploadTags    = [];
  var _selectedFile  = null;
  var _unsubMine     = null;    // Firestore real-time unsubscribe fn
  var _initDone      = false;

  /* ── API credentials ── */
  /* PubMed API key — loaded at call-time from Remote Config (window.PUBMED_API_KEY),
     falling back to the hardcoded key only when Remote Config is unavailable.      */
  var RS_PUBMED_KEY_FALLBACK = 'fc03ed1b136070a34347982eb7950c9e3307';
  function _getPubMedKey() {
    var rcKey = typeof window !== 'undefined' && window.PUBMED_API_KEY;
    return (rcKey && String(rcKey).trim()) || RS_PUBMED_KEY_FALLBACK;
  }
  var RS_OPENALEX_MAILTO = 'oasis-cnst@research.tool';
  var RS_PAGE_SIZE       = 10;

  /* ── Frontiers Search API config ── */
  /* Frontiers API key — loaded at call-time from Remote Config (window.FRONTIERS_API_KEY),
     falling back to the hardcoded key only when Remote Config is unavailable.           */
  var RS_FRONTIERS_KEY_FALLBACK = 'e41a769c392c4760760a1b4702795e77';
  function _getFrontiersKey() {
    var rcKey = typeof window !== 'undefined' && window.FRONTIERS_API_KEY;
    return (rcKey && String(rcKey).trim()) || RS_FRONTIERS_KEY_FALLBACK;
  }
  var RS_FRONTIERS_BASE = 'https://search-api.frontiersin.org/api/V1';
  var RS_FRONTIERS_SIZE = 10;

  /* ── Layer 3: Elsevier (Scopus + ScienceDirect) config ── */
  /* Elsevier API key — loaded at call-time from Remote Config (window.ELSEVIER_API_KEY),
     falling back to the hardcoded key only when Remote Config is unavailable.        */
  var RS_ELSEVIER_KEY_FALLBACK = 'e41a769c392c4760760a1b4702795e77';
  function _getElsevierKey() {
    var rcKey = typeof window !== 'undefined' && window.ELSEVIER_API_KEY;
    return (rcKey && String(rcKey).trim()) || RS_ELSEVIER_KEY_FALLBACK;
  }
  var RS_ELSEVIER_SCOPUS   = 'https://api.elsevier.com/content/search/scopus';
  var RS_ELSEVIER_SD       = 'https://api.elsevier.com/content/search/sciencedirect';
  var RS_ELSEVIER_ABSTRACT = 'https://api.elsevier.com/content/abstract/scopus_id/';
  var RS_ELSEVIER_SIZE     = 10;

  /* ── Layer 2: Clinical Guidelines config ── */
  var GL_PAGE_SIZE = 8;
  /* Journal anchors + affiliation filters for target guideline orgs:
     ASPEN, ESPEN, KDIGO, KDOQI, ADA, EatRight/AND, WHO, NICE, ACS, BDA,
     AACE, ISN, ESICM, ACG, EASL, ESC-nutrition, BAPEN, ESPGHAN */
  var GL_ORG_FILTER = [
    '"JPEN J Parenter Enteral Nutr"[ta]',
    '"Nutr Clin Pract"[ta]',
    '"Clin Nutr"[ta]',
    '"Clin Nutr ESPEN"[ta]',
    '"Kidney Int Suppl"[ta]',
    '"Am J Kidney Dis"[ta]',
    '"Kidney Int"[ta]',
    '"Diabetes Care"[ta]',
    '"CA Cancer J Clin"[ta]',
    '"J Hum Nutr Diet"[ta]',
    '"Endocr Pract"[ta]',
    '"J Gastroenterol Hepatol"[ta]',
    '"J Hepatol"[ta]',
    '"Crit Care Med"[ta]',
    'ASPEN[ad]',
    'ESPEN[ad]',
    'KDIGO[ad]',
    'KDOQI[ad]',
    '"World Health Organization"[ad]',
    '"Academy of Nutrition and Dietetics"[ad]',
    '"National Institute for Health and Care Excellence"[ad]',
    '"British Dietetic Association"[ad]',
    '"American Cancer Society"[ad]',
    '"American Diabetes Association"[ad]',
    'BAPEN[ad]',
    'ESPGHAN[ad]',
    '"Food and Agriculture Organization"[ad]',
    '"Ministry of Health, Malawi"[ad]',
    '"Malawi Ministry of Health"[ad]',
    '"Kamuzu University of Health Sciences"[ad]',
    '"Queen Elizabeth Central Hospital"[ad]'
  ].join(' OR ');
  var GL_PT_FILTER = '(guideline[pt] OR "practice guideline"[pt] OR ' +
    '"systematic review"[pt] OR "meta-analysis"[pt])';

  /* ── Unified background search state ── */
  var _bgLoading         = false;   // background API fetch in progress
  var _bgCurrentQuery    = '';      // guards against stale async updates
  var _bgPubMedPage      = 1;
  var _bgOAPage          = 1;
  var _bgPubMedTotal     = 0;
  var _bgOATotal         = 0;
  var _bgHasMore         = { pubmed: false, oa: false };
  var _bgExternalResults = [];      // deduped PubMed + OpenAlex results
  var _bgObserver        = null;    // IntersectionObserver for infinite scroll
  /* ── Layer 2: Clinical Guidelines state ── */
  var _bgGLResults   = [];          // deduped guideline results
  var _bgGLPage      = 1;
  var _bgGLTotal     = 0;
  var _bgHasMoreGL   = false;
  /* ── Layer 3: Frontiers in Research state ── */
  var _bgFRResults   = [];          // deduped Frontiers results
  var _bgFRPage      = 1;
  var _bgFRTotal     = 0;
  var _bgHasMoreFR   = false;
  /* ── Layer 3b: Elsevier (Scopus + ScienceDirect) state ── */
  var _bgELResults   = [];          // deduped Elsevier results (Scopus + ScienceDirect merged)
  var _bgELPage      = 1;
  var _bgELTotal     = 0;
  var _bgHasMoreEL   = false;
  /* ── AI Overview state ── */
  var _aiOvQuery    = '';     // last query for which overview was generated/loading
  var _aiOvLoading  = false;  // Groq fetch in progress
  /* Legacy RS vars kept for internal reuse */
  var _rsYearFrom        = '';
  var _rsYearTo          = '';
  var _rsOpenAccess      = false;


  /* ════════════════════════════════════════════════════
     CSS INJECTION
  ════════════════════════════════════════════════════ */
  function _injectCSS() {
    if (document.getElementById('lib-css')) return;
    var s = document.createElement('style');
    s.id = 'lib-css';
    s.textContent = [
      /* ── Layout ── */
      '#tab-library{padding:0}',
      '.lib-wrap{max-width:700px;margin:0 auto;padding-bottom:90px}',

      /* ── Sub-navigation ── */
      '.lib-subnav{display:flex;background:var(--surface2);border-bottom:1px solid var(--border);',
        'overflow-x:auto;scrollbar-width:none;position:sticky;top:0;z-index:20}',
      '.lib-subnav::-webkit-scrollbar{display:none}',
      '.lib-sntab{flex-shrink:0;padding:13px 18px;font-family:var(--mono);font-size:10px;font-weight:700;',
        'letter-spacing:.9px;text-transform:uppercase;color:var(--text-dim);cursor:pointer;',
        'border:none;border-bottom:2px solid transparent;background:none;',
        'transition:color .15s,border-color .15s;white-space:nowrap}',
      '.lib-sntab:hover{color:var(--text)}',
      '.lib-sntab.active{color:var(--teal);border-bottom-color:var(--teal)}',

      /* ── Panels ── */
      '.lib-panel{display:none;padding:16px}',
      '.lib-panel.active{display:block}',

      /* ── Section header row ── */
      '.lib-sec-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}',
      '.lib-sec-title{font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:1px;',
        'text-transform:uppercase;color:var(--text-dim)}',
      '.lib-badge{background:rgba(29,233,212,.1);border:1px solid rgba(29,233,212,.2);border-radius:100px;',
        'padding:2px 9px;font-family:var(--mono);font-size:9px;font-weight:700;color:var(--teal)}',

      /* ── Search bar ── */
      '.lib-searchbar{display:flex;align-items:center;gap:0;background:var(--surface2);',
        'border:1.5px solid var(--border);border-radius:9px;padding:0 10px;gap:8px;',
        'margin-bottom:12px;transition:border-color .2s}',
      '.lib-searchbar:focus-within{border-color:rgba(29,233,212,.45)}',
      '.lib-searchbar input{flex:1;background:none;border:none;outline:none;',
        'font-family:var(--mono);font-size:12px;color:var(--text);padding:11px 0}',
      '.lib-searchbar input::placeholder{color:var(--text-muted)}',
      '.lib-search-icon{color:var(--teal);opacity:.6;font-size:15px;flex-shrink:0;pointer-events:none}',
      '.lib-search-btn{padding:6px 14px;background:var(--teal);border:none;border-radius:7px;',
        'font-family:var(--mono);font-size:10px;font-weight:700;color:#020617;cursor:pointer;',
        'transition:opacity .15s;white-space:nowrap}',
      '.lib-search-btn:hover{opacity:.85}',

      /* ── AI Overview ── */
      '#lib-ai-overview{margin:10px 0 4px}',
      '.lib-aio-card{background:linear-gradient(135deg,rgba(29,233,212,0.06) 0%,rgba(96,165,250,0.04) 100%);border:1px solid rgba(29,233,212,0.22);border-radius:14px;overflow:hidden;animation:libAioFadeIn .35s ease}',
      '@keyframes libAioFadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}',
      '.lib-aio-header{display:flex;align-items:center;gap:9px;padding:11px 14px 0}',
      '.lib-aio-icon{width:22px;height:22px;border-radius:7px;flex-shrink:0;background:linear-gradient(135deg,rgba(29,233,212,0.25),rgba(96,165,250,0.18));border:1px solid rgba(29,233,212,0.35);display:flex;align-items:center;justify-content:center}',
      '.lib-aio-label{font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1.2px;color:rgba(29,233,212,0.8);text-transform:uppercase}',
      '.lib-aio-body{padding:8px 14px 6px;font-family:var(--sans);font-size:12.5px;line-height:1.75;color:var(--text,#c9d1d9)}',
      '.lib-aio-body strong{color:var(--text-bright,#f0f6fc)}',
      '.lib-aio-body em{color:rgba(29,233,212,0.85);font-style:normal}',
      '.lib-aio-loading{display:flex;align-items:center;gap:8px;padding:10px 14px 12px;font-family:var(--mono);font-size:9px;color:rgba(255,255,255,0.35);letter-spacing:.5px}',
      '.lib-aio-dots span{display:inline-block;width:5px;height:5px;border-radius:50%;background:rgba(29,233,212,0.5);margin:0 2px;animation:libAioPulse 1.4s ease infinite}',
      '.lib-aio-dots span:nth-child(2){animation-delay:.2s}',
      '.lib-aio-dots span:nth-child(3){animation-delay:.4s}',
      '@keyframes libAioPulse{0%,100%{opacity:.3;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}',
      '.lib-aio-sources-toggle{display:flex;align-items:center;gap:6px;padding:5px 14px 10px;cursor:pointer;font-family:var(--mono);font-size:8.5px;color:rgba(255,255,255,0.35);letter-spacing:.5px;transition:color .15s;width:100%;background:none;border:none;text-align:left}',
      '.lib-aio-sources-toggle:hover{color:rgba(29,233,212,0.7)}',
      '.lib-aio-sources-toggle svg{transition:transform .2s}',
      '.lib-aio-sources-toggle.open svg{transform:rotate(180deg)}',
      '.lib-aio-sources{display:none;padding:0 14px 12px;border-top:1px solid rgba(255,255,255,0.05);margin-top:2px}',
      '.lib-aio-sources.open{display:block}',
      '.lib-aio-src-item{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)}',
      '.lib-aio-src-item:last-child{border-bottom:none}',
      '.lib-aio-src-badge{flex-shrink:0;font-family:var(--mono);font-size:7.5px;font-weight:700;padding:2px 7px;border-radius:100px;letter-spacing:.5px;white-space:nowrap}',
      '.lib-aio-src-badge.local{background:rgba(29,233,212,0.12);color:rgba(29,233,212,0.8);border:1px solid rgba(29,233,212,0.25)}',
      '.lib-aio-src-badge.guideline{background:rgba(96,165,250,0.12);color:rgba(96,165,250,0.85);border:1px solid rgba(96,165,250,0.25)}',
      '.lib-aio-src-badge.research{background:rgba(52,211,153,0.1);color:rgba(52,211,153,0.8);border:1px solid rgba(52,211,153,0.2)}',
      '.lib-aio-src-badge.database{background:rgba(251,146,60,0.1);color:rgba(251,146,60,0.75);border:1px solid rgba(251,146,60,0.2)}',
      '.lib-aio-src-title{font-family:var(--sans);font-size:11px;color:rgba(255,255,255,0.6);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.4}',
      '.lib-aio-err{padding:8px 14px 12px;font-family:var(--mono);font-size:9px;color:rgba(248,113,113,0.6);letter-spacing:.5px}',

      /* ── Filter chip row ── */
      '.lib-chips{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;margin-bottom:12px;padding-bottom:1px}',
      '.lib-chips::-webkit-scrollbar{display:none}',
      '.lib-chip{flex-shrink:0;padding:4px 11px;border-radius:100px;font-family:var(--mono);font-size:9.5px;',
        'font-weight:700;letter-spacing:.4px;background:var(--surface2);border:1px solid var(--border);',
        'color:var(--text-dim);cursor:pointer;transition:all .15s;white-space:nowrap}',
      '.lib-chip:hover,.lib-chip.active{background:rgba(29,233,212,.1);border-color:var(--teal);color:var(--teal)}',

      /* ── Resource card ── */
      '.lib-cards{display:flex;flex-direction:column;gap:10px}',
      '.lib-card{background:var(--surface);border:1px solid var(--border);border-radius:13px;',
        'padding:14px 14px 10px;cursor:pointer;transition:border-color .15s,box-shadow .15s}',
      '.lib-card:hover{border-color:rgba(29,233,212,.3);box-shadow:0 4px 24px rgba(0,0,0,.35)}',
      '.lib-card-row{display:flex;align-items:flex-start;gap:11px}',
      '.lib-card-icon{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;',
        'justify-content:center;flex-shrink:0;font-size:17px}',
      '.lic-pdf  {background:rgba(251,113,133,.1);border:1px solid rgba(251,113,133,.2)}',
      '.lic-docx {background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.2)}',
      '.lic-image{background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2)}',
      '.lic-link {background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2)}',
      '.lic-other{background:rgba(240,180,41,.1);border:1px solid rgba(240,180,41,.2)}',
      '.lib-card-info{flex:1;min-width:0}',
      '.lib-card-title{font-family:var(--sans);font-size:13px;font-weight:600;color:var(--text-bright);',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}',
      '.lib-card-desc{font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:1.55;',
        'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:7px}',
      '.lib-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}',
      '.lib-tag{font-family:var(--mono);font-size:8.5px;padding:2px 7px;border-radius:100px;',
        'background:rgba(29,233,212,.06);border:1px solid rgba(29,233,212,.14);color:var(--teal)}',
      '.lib-card-foot{display:flex;align-items:center;justify-content:flex-start;gap:8px;',
        'margin-top:9px;padding-top:9px;border-top:1px solid rgba(30,41,59,.55)}',
      '.lib-card-cat{font-family:var(--mono);font-size:8.5px;color:var(--text-muted);',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}',
      '.lib-card-acts{display:none}',/* hidden — replaced by lib-cta-bar */

      /* ── Icon button (legacy, kept for viewer fallback) ── */
      '.lib-ibtn{width:29px;height:29px;border-radius:7px;background:var(--surface2);border:1px solid var(--border);',
        'color:var(--text-dim);display:flex;align-items:center;justify-content:center;',
        'cursor:pointer;transition:all .15s;font-size:12px;flex-shrink:0}',
      '.lib-ibtn:hover{border-color:var(--teal);color:var(--teal)}',
      '.lib-ibtn.bm-active{color:var(--amber);border-color:rgba(240,180,41,.35);background:rgba(240,180,41,.07)}',

      /* ── CTA Action Bar ── */
      '.lib-cta-bar{display:flex;gap:5px;padding:10px 0 2px;margin-top:6px;border-top:1px solid rgba(30,41,59,.6)}',

      /* Base button */
      '.lib-cta-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;',
        'min-height:48px;padding:9px 4px 8px;border-radius:11px;border:1px solid transparent;',
        'cursor:pointer;font-family:var(--mono);font-size:8.5px;font-weight:700;letter-spacing:.6px;',
        'text-transform:uppercase;transition:all .2s cubic-bezier(.34,1.56,.64,1);',
        'position:relative;overflow:hidden;user-select:none;-webkit-tap-highlight-color:transparent;',
        'background:none;outline:none;-webkit-appearance:none}',

      /* Focus ring for keyboard nav */
      '.lib-cta-btn:focus-visible{outline:2px solid rgba(29,233,212,.65);outline-offset:2px}',

      /* Ripple layer */
      '.lib-cta-btn::before{content:"";position:absolute;inset:0;background:currentColor;opacity:0;',
        'transition:opacity .15s;border-radius:inherit}',
      '.lib-cta-btn:active::before{opacity:.07}',

      /* Save / Bookmark */
      '.lib-cta-save{background:rgba(240,180,41,.09);border-color:rgba(240,180,41,.28);color:rgba(240,180,41,.75)}',
      '.lib-cta-save:hover{background:rgba(240,180,41,.17);border-color:rgba(240,180,41,.55);',
        'color:var(--amber,#f0b429);transform:translateY(-1px);',
        'box-shadow:0 4px 12px rgba(240,180,41,.12)}',
      '.lib-cta-save:active{transform:translateY(0) scale(.97)}',
      '.lib-cta-save.bm-active{background:rgba(240,180,41,.2);border-color:rgba(240,180,41,.65);',
        'color:var(--amber,#f0b429);',
        'box-shadow:0 0 14px rgba(240,180,41,.18),inset 0 0 12px rgba(240,180,41,.07)}',
      '.lib-cta-save.bm-active .lib-cta-icon{filter:drop-shadow(0 0 4px rgba(240,180,41,.6))}',

      /* Share */
      '.lib-cta-share{background:rgba(96,165,250,.09);border-color:rgba(96,165,250,.28);color:rgba(96,165,250,.75)}',
      '.lib-cta-share:hover{background:rgba(96,165,250,.17);border-color:rgba(96,165,250,.55);',
        'color:#60a5fa;transform:translateY(-1px);',
        'box-shadow:0 4px 12px rgba(96,165,250,.12)}',
      '.lib-cta-share:active{transform:translateY(0) scale(.97)}',

      /* Download — primary CTA, highest visual priority */
      '.lib-cta-dl{background:rgba(29,233,212,.13);border-color:rgba(29,233,212,.45);color:var(--teal,#1de9d4);',
        'box-shadow:0 0 10px rgba(29,233,212,.08),inset 0 1px 0 rgba(29,233,212,.12)}',
      '.lib-cta-dl:hover{background:rgba(29,233,212,.22);border-color:var(--teal,#1de9d4);',
        'transform:translateY(-1px);',
        'box-shadow:0 4px 18px rgba(29,233,212,.22),inset 0 1px 0 rgba(29,233,212,.2)}',
      '.lib-cta-dl:active{transform:translateY(0) scale(.97)}',
      '.lib-cta-dl .lib-cta-icon{filter:drop-shadow(0 0 3px rgba(29,233,212,.4))}',

      /* Icon container */
      '.lib-cta-icon{width:18px;height:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;',
        'transition:transform .2s cubic-bezier(.34,1.56,.64,1)}',
      '.lib-cta-btn:hover .lib-cta-icon{transform:scale(1.15)}',
      '.lib-cta-icon svg{width:15px;height:15px}',

      /* Text label */
      '.lib-cta-label{font-size:8px;line-height:1;letter-spacing:.7px;',
        'font-family:var(--mono);font-weight:700;transition:opacity .15s}',

      /* Completed flash */
      '.lib-cta-btn.cta-done{animation:ctaBtnDone .45s ease forwards}',
      '@keyframes ctaBtnDone{0%{transform:scale(1)}35%{transform:scale(1.08)}75%{transform:scale(.98)}100%{transform:scale(1)}}',

      /* ── Status badges ── */
      '.lib-status{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:100px;',
        'font-family:var(--mono);font-size:8.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}',
      '.ls-pending {background:rgba(240,180,41,.1);color:var(--amber);border:1px solid rgba(240,180,41,.25)}',
      '.ls-approved{background:rgba(52,211,153,.1);color:var(--green);border:1px solid rgba(52,211,153,.25)}',
      '.ls-rejected{background:rgba(251,113,133,.1);color:var(--red);border:1px solid rgba(251,113,133,.25)}',

      /* ── Upload form ── */
      '.lib-form-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px}',
      '.lib-form-ttl{font-family:var(--cond);font-size:15px;font-weight:700;letter-spacing:1px;',
        'color:var(--teal);margin-bottom:18px}',
      '.lib-row{margin-bottom:14px}',
      '.lib-lbl{display:block;font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.8px;',
        'text-transform:uppercase;color:var(--text-dim);margin-bottom:5px}',
      '.lib-lbl em{color:var(--red);font-style:normal}',
      '.lib-inp{width:100%;background:rgba(2,6,23,.8);border:1px solid var(--border);border-radius:8px;',
        'padding:10px 12px;font-family:var(--mono);font-size:12px;color:var(--text);',
        'outline:none;transition:border-color .2s;box-sizing:border-box}',
      '.lib-inp:focus{border-color:rgba(29,233,212,.45)}',
      '.lib-inp::placeholder{color:var(--text-muted)}',
      'select.lib-inp{cursor:pointer}',
      'textarea.lib-inp{resize:vertical;min-height:72px;line-height:1.55}',

      /* ── Drop zone ── */
      '.lib-dropzone{border:2px dashed var(--border);border-radius:10px;padding:30px 16px;',
        'text-align:center;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}',
      '.lib-dropzone:hover,.lib-dropzone.drag-over{border-color:var(--teal);background:rgba(29,233,212,.04)}',
      '.lib-dropzone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}',
      '.lib-drop-ico{font-size:28px;margin-bottom:9px;color:var(--teal);opacity:.55}',
      '.lib-drop-txt{font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-bottom:3px}',
      '.lib-drop-sub{font-family:var(--mono);font-size:9.5px;color:var(--text-muted)}',
      '.lib-file-prev{display:flex;align-items:center;gap:10px;background:var(--surface2);',
        'border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-top:8px}',
      '.lib-fp-name{flex:1;font-family:var(--mono);font-size:11px;color:var(--text);',
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.lib-fp-size{font-family:var(--mono);font-size:9.5px;color:var(--text-muted);flex-shrink:0}',

      /* ── Tags input widget ── */
      '.lib-tags-wrap{display:flex;flex-wrap:wrap;gap:5px;background:rgba(2,6,23,.8);',
        'border:1px solid var(--border);border-radius:8px;padding:7px 10px;min-height:42px;',
        'cursor:text;transition:border-color .2s}',
      '.lib-tags-wrap:focus-within{border-color:rgba(29,233,212,.45)}',
      '.lib-tag-pill{display:flex;align-items:center;gap:4px;background:rgba(29,233,212,.1);',
        'border:1px solid rgba(29,233,212,.2);border-radius:100px;padding:2px 8px;',
        'font-family:var(--mono);font-size:10px;color:var(--teal)}',
      '.lib-tag-x{background:none;border:none;color:var(--teal);cursor:pointer;',
        'font-size:11px;padding:0;line-height:1;opacity:.7;transition:opacity .1s}',
      '.lib-tag-x:hover{opacity:1}',
      '.lib-tag-txt{background:none;border:none;outline:none;font-family:var(--mono);',
        'font-size:11px;color:var(--text);min-width:80px;flex:1;padding:2px 0}',

      /* ── Progress bar ── */
      '.lib-prog-wrap{background:var(--surface2);border-radius:100px;height:4px;overflow:hidden;margin-top:9px}',
      '.lib-prog-bar{height:100%;background:linear-gradient(90deg,var(--teal),#60a5fa);',
        'border-radius:100px;transition:width .3s;width:0}',

      /* ── Submit button ── */
      '.lib-submit{width:100%;padding:13px;background:var(--teal);border:none;border-radius:9px;',
        'font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:1px;',
        'color:#020617;cursor:pointer;transition:opacity .15s;margin-top:8px}',
      '.lib-submit:hover{opacity:.85}',
      '.lib-submit:disabled{opacity:.4;cursor:not-allowed}',

      /* ── Link preview ── */
      '.lib-link-ok{display:flex;align-items:center;gap:8px;background:rgba(52,211,153,.06);',
        'border:1px solid rgba(52,211,153,.2);border-radius:8px;padding:8px 12px;margin-top:6px;',
        'font-family:var(--mono);font-size:10px;color:var(--green)}',
      '.lib-link-err{background:rgba(251,113,133,.06);border-color:rgba(251,113,133,.2);color:var(--red)}',

      /* ── Empty state ── */
      '.lib-empty{text-align:center;padding:44px 16px}',
      '.lib-empty-ico{font-size:36px;margin-bottom:13px;opacity:.35}',
      '.lib-empty-txt{font-family:var(--mono);font-size:11px;color:var(--text-muted);line-height:1.65}',

      /* ── Loading spinner ── */
      '.lib-spin{width:20px;height:20px;border-radius:50%;border:2px solid var(--border);',
        'border-top-color:var(--teal);animation:libSpin .65s linear infinite;margin:36px auto}',
      '@keyframes libSpin{to{transform:rotate(360deg)}}',

      /* ── My-upload card ── */
      '.lib-my-card{background:var(--surface);border:1px solid var(--border);',
        'border-radius:12px;padding:13px 14px;margin-bottom:10px}',
      '.lib-my-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}',
      '.lib-my-title{flex:1;font-family:var(--sans);font-size:12px;font-weight:600;color:var(--text-bright)}',
      '.lib-review-note{font-family:var(--mono);font-size:9.5px;color:var(--text-dim);line-height:1.55;',
        'padding:6px 10px;border-radius:6px;background:rgba(30,41,59,.5);border-left:2px solid var(--amber)}',
      '.lib-review-note.rn-approved{border-left-color:var(--green)}',
      '.lib-review-note.rn-rejected{border-left-color:var(--red)}',

      /* ── Viewer modal ── */
      '#lib-viewer{position:fixed;inset:0;z-index:9900;background:rgba(2,6,23,.97);',
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
        'display:none;flex-direction:column}',
      '#lib-viewer.open{display:flex}',
      '.lib-vh{display:flex;align-items:center;gap:10px;padding:12px 14px;',
        'background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0}',
      '.lib-vtitle{flex:1;font-family:var(--sans);font-size:13px;font-weight:600;',
        'color:var(--text-bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.lib-vbody{flex:1;overflow:hidden;display:flex;flex-direction:column}',
      '.lib-vcontent{flex:1;overflow:hidden;background:#0a0f1e}',
      '.lib-vcontent iframe{width:100%;height:100%;border:none;display:block}',
      '.lib-vcontent img{width:100%;height:100%;object-fit:contain;display:block}',
      '.lib-vmeta{background:var(--surface);border-top:1px solid var(--border);',
        'padding:12px 14px;flex-shrink:0;max-height:220px;overflow-y:auto}',
      '.lib-vacts{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}',
      '.lib-vbtn{display:flex;align-items:center;gap:5px;padding:8px 15px;border-radius:8px;',
        'font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.5px;',
        'cursor:pointer;transition:all .18s cubic-bezier(.34,1.56,.64,1);border:1px solid var(--border);',
        'background:var(--surface2);color:var(--text-dim);text-decoration:none;',
        'min-height:38px;-webkit-tap-highlight-color:transparent}',
      '.lib-vbtn:hover{border-color:var(--teal);color:var(--teal);transform:translateY(-1px)}',
      '.lib-vbtn:active{transform:scale(.97)}',
      '.lib-vbtn.primary{background:rgba(29,233,212,.1);border-color:rgba(29,233,212,.3);color:var(--teal)}',

      /* ── Citation block ── */
      '.lib-cit-tabs{display:flex;margin-bottom:5px}',
      '.lib-cit-tab{padding:4px 13px;font-family:var(--mono);font-size:9.5px;font-weight:700;',
        'cursor:pointer;border:1px solid var(--border);color:var(--text-dim);background:var(--surface2);',
        'transition:all .15s}',
      '.lib-cit-tab:first-child{border-radius:6px 0 0 6px}',
      '.lib-cit-tab:last-child{border-radius:0 6px 6px 0;border-left:none}',
      '.lib-cit-tab.active{background:rgba(29,233,212,.1);border-color:var(--teal);color:var(--teal)}',
      '.lib-cit-block{position:relative;background:var(--surface2);border:1px solid var(--border);',
        'border-radius:8px;padding:10px 60px 10px 12px;font-family:var(--mono);font-size:9.5px;',
        'color:var(--text-dim);line-height:1.65}',
      '.lib-cit-copy{position:absolute;top:7px;right:8px;background:var(--surface);',
        'border:1px solid var(--border);border-radius:5px;padding:2px 9px;',
        'font-family:var(--mono);font-size:8.5px;color:var(--teal);cursor:pointer;transition:all .15s}',
      '.lib-cit-copy:hover{background:rgba(29,233,212,.1)}',

      /* ── Related resources ── */
      '.lib-rel-hdr{font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.9px;',
        'text-transform:uppercase;color:var(--text-muted);margin:12px 0 7px}',
      '.lib-rel-item{display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--surface2);',
        'border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:border-color .15s;',
        'font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-bottom:5px}',
      '.lib-rel-item:hover{border-color:rgba(29,233,212,.3);color:var(--text)}',

      /* ── Close / small action button (viewer header) ── */
      '.lib-close-btn{background:var(--surface2);border:1px solid var(--border);border-radius:7px;',
        'color:var(--text-dim);cursor:pointer;padding:5px 12px;font-family:var(--mono);',
        'font-size:11px;transition:all .15s;flex-shrink:0}',
      '.lib-close-btn:hover{border-color:var(--red);color:var(--red)}',

      /* ── Nav notification dot ── */
      '.lib-dot{display:none;width:7px;height:7px;border-radius:50%;background:var(--red);',
        'position:absolute;top:8px;right:7px}',
      '.lib-dot.show{display:block}',

      /* ── Action-link button in my-upload card ── */
      '.lib-act-link{display:inline-flex;align-items:center;gap:5px;margin-top:8px;',
        'padding:7px 14px;border-radius:7px;font-family:var(--mono);font-size:9.5px;font-weight:700;',
        'letter-spacing:.5px;background:rgba(29,233,212,.08);border:1px solid rgba(29,233,212,.25);',
        'color:var(--teal);cursor:pointer;transition:all .15s}',
      '.lib-act-link:hover{background:rgba(29,233,212,.15)}',

      /* ── Research Search panel ── */
      '.rs-source-tabs{display:flex;gap:6px;margin-bottom:12px}',
      '.rs-stab{flex:1;padding:7px 10px;background:var(--surface2);border:1px solid var(--border);',
        'border-radius:8px;font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.5px;',
        'color:var(--text-dim);cursor:pointer;transition:all .15s;text-align:center;white-space:nowrap}',
      '.rs-stab:hover{border-color:rgba(29,233,212,.35);color:var(--text)}',
      '.rs-stab.active{background:rgba(29,233,212,.1);border-color:rgba(29,233,212,.4);color:var(--teal)}',
      '.rs-result{background:var(--surface);border:1px solid var(--border);border-radius:12px;',
        'padding:13px 14px;margin-bottom:9px;transition:border-color .15s}',
      '.rs-result:hover{border-color:rgba(29,233,212,.3)}',
      '.rs-result-title{font-family:var(--sans);font-size:13px;font-weight:600;color:var(--text-bright);',
        'margin-bottom:4px;line-height:1.35}',
      '.rs-result-authors{font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-bottom:5px;',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.rs-result-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px}',
      '.rs-result-journal{font-family:var(--mono);font-size:9px;color:var(--teal);',
        'background:rgba(29,233,212,.06);border:1px solid rgba(29,233,212,.15);',
        'border-radius:100px;padding:2px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}',
      '.rs-result-year{font-family:var(--mono);font-size:9px;color:var(--text-muted)}',
      '.rs-result-cite{font-family:var(--mono);font-size:9px;color:var(--text-muted)}',
      '.rs-result-abstract{font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:1.6;',
        'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:8px}',
      '.rs-result-abstract.expanded{-webkit-line-clamp:unset;display:block}',
      '.rs-result-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}',
      '.rs-act-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 11px;border-radius:6px;',
        'font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.4px;',
        'background:var(--surface2);border:1px solid var(--border);color:var(--text-dim);',
        'cursor:pointer;transition:all .15s;text-decoration:none}',
      '.rs-act-btn:hover{border-color:var(--teal);color:var(--teal)}',
      '.rs-act-btn.primary{background:rgba(29,233,212,.08);border-color:rgba(29,233,212,.25);color:var(--teal)}',
      '.rs-source-badge{font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:.5px;',
        'padding:2px 7px;border-radius:100px;text-transform:uppercase}',
      '.rs-badge-pubmed{background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.2);color:#60a5fa}',
      '.rs-badge-openalex{background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);color:#a78bfa}',
      /* ── Frontiers badge ── */
      '.rs-badge-frontiers{background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.25);color:#f97316}',
      '.lib-fr-divider{color:#f97316!important}',
      '.lib-fr-divider::after{background:rgba(249,115,22,.2)!important}',
      /* ── Elsevier (Scopus + ScienceDirect) badges ── */
      '.rs-badge-scopus{background:rgba(255,102,0,.12);border:1px solid rgba(255,102,0,.3);color:#ff6600}',
      '.rs-badge-scidir{background:rgba(230,46,0,.1);border:1px solid rgba(230,46,0,.25);color:#e62e00}',
      '.lib-el-divider{color:#ff6600!important}',
      '.lib-el-divider::after{background:rgba(255,102,0,.2)!important}',
      /* ── Layer 2 guideline badges ── */
      '.rs-badge-guideline{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);color:#34d399}',
      '.rs-badge-review{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.25);color:#fbbf24}',
      /* ── WHO / FAO / MoH Malawi source badges ── */
      '.rs-badge-who{background:rgba(0,147,213,.1);border:1px solid rgba(0,147,213,.3);color:#0093d5}',
      '.rs-badge-fao{background:rgba(0,107,60,.1);border:1px solid rgba(0,107,60,.3);color:#006b3c}',
      '.rs-badge-moh{background:rgba(196,18,47,.1);border:1px solid rgba(196,18,47,.3);color:#c4122f}',
      '.rs-org-badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:100px;',
        'font-family:var(--mono);font-size:7.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;',
        'background:rgba(29,233,212,.07);border:1px solid rgba(29,233,212,.18);color:var(--teal)}',
      '.lib-gl-divider{color:#34d399!important}',
      '.lib-gl-divider::after{background:rgba(52,211,153,.2)!important}',
      '.rs-filter-row{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}',
      '.rs-filter-sel{background:var(--surface2);border:1px solid var(--border);border-radius:7px;',
        'padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim);',
        'outline:none;cursor:pointer;flex:1;min-width:120px}',
      '.rs-filter-sel:focus{border-color:rgba(29,233,212,.4)}',
      '.rs-sort-info{font-family:var(--mono);font-size:9px;color:var(--text-muted);',
        'margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}',
      '.rs-oa-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;',
        'border-radius:100px;font-family:var(--mono);font-size:8px;font-weight:700;',
        'background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);color:var(--green)}',
      '.rs-pagination{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:14px}',
      '.rs-pg-btn{padding:6px 16px;background:var(--surface2);border:1px solid var(--border);',
        'border-radius:7px;font-family:var(--mono);font-size:10px;color:var(--text-dim);',
        'cursor:pointer;transition:all .15s}',
      '.rs-pg-btn:hover:not(:disabled){border-color:var(--teal);color:var(--teal)}',
      '.rs-pg-btn:disabled{opacity:.35;cursor:not-allowed}',
      '.rs-pg-info{font-family:var(--mono);font-size:9.5px;color:var(--text-dim)}',

      /* ── Layer selector tabs (kept for theme compat) ── */
      /* ── Mixed results divider ── */
      '.lib-src-divider{font-family:var(--mono);font-size:8.5px;font-weight:700;letter-spacing:.8px;',
        'text-transform:uppercase;color:var(--text-muted);padding:10px 0 6px;display:flex;align-items:center;gap:8px}',
      '.lib-src-divider::after{content:"";flex:1;height:1px;background:var(--border)}',
      /* ── Oasis Library source badge ── */
      '.rs-badge-oasis{background:rgba(29,233,212,.1);border:1px solid rgba(29,233,212,.25);color:var(--teal)}',
      /* ── Background loading status bar ── */
      '.lib-bg-status{display:flex;align-items:center;gap:8px;padding:8px 12px;',
        'font-family:var(--mono);font-size:9.5px;color:var(--text-muted);',
        'border:1px solid var(--border);border-radius:8px;margin-bottom:8px}',
      '.lib-bg-spin{width:14px;height:14px;border-radius:50%;',
        'border:2px solid var(--border);border-top-color:var(--teal);',
        'animation:libSpin .65s linear infinite;flex-shrink:0}',
      /* ── Load-more button ── */
      '.lib-load-more{width:100%;padding:10px;margin-top:8px;background:var(--surface2);',
        'border:1px solid var(--border);border-radius:9px;font-family:var(--mono);',
        'font-size:10px;color:var(--text-dim);cursor:pointer;transition:all .15s}',
      '.lib-load-more:hover{border-color:var(--teal);color:var(--teal)}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ════════════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════════════ */
  function _esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmtDate(ts) {
    if (!ts) return '';
    var d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  }

  function _fmtSize(bytes) {
    if (!bytes) return '';
    return bytes > 1048576
      ? (bytes/1048576).toFixed(1)+' MB'
      : Math.round(bytes/1024)+' KB';
  }

  function _getYear(ts) {
    if (!ts) return new Date().getFullYear();
    return (ts.seconds ? new Date(ts.seconds*1000) : new Date(ts)).getFullYear();
  }

  function _typeIcon(ft) {
    return {pdf:'📄',docx:'📝',image:'🖼️',link:'🔗'}[ft] || '📁';
  }

  function _typeCls(ft) {
    return {pdf:'lic-pdf',docx:'lic-docx',image:'lic-image',link:'lic-link'}[ft] || 'lic-other';
  }

  function _catLabel(id) {
    var c = LIB_CATEGORIES.filter(function(x){return x.id===id;})[0];
    return c ? c.label : id || '';
  }

  function _toast(msg, type, dur) {
    if (typeof showToast === 'function') showToast(msg, type || 'info', dur || 2800);
  }

  /* ════════════════════════════════════════════════════
     APPWRITE ACCESSORS
  ════════════════════════════════════════════════════ */

  /** Return Appwrite Databases instance (set by appwriteClient.js). */
  function _awDb() {
    return (typeof window !== 'undefined' && window.AppwriteDatabases) || null;
  }

  /** Return Appwrite Storage instance (set by appwriteClient.js). */
  function _awStor() {
    return (typeof window !== 'undefined' && window.AppwriteStorage) || null;
  }

  /**
   * Build a direct Appwrite Storage view URL for use in <img>, <a>, and
   * Google Docs Viewer.  The bucket must allow read("any") (or equivalent)
   * for unauthenticated browser requests to succeed.
   * @param {string} fileId — Appwrite file $id
   * @returns {string}
   */
  function _awFileUrl(fileId) {
    if (!fileId) return '';
    return _AW_EP() + '/storage/buckets/' + _AW_BKT_ID() +
           '/files/' + encodeURIComponent(fileId) +
           '/view?project=' + _AW_PROJ();
  }

  /**
   * Normalise an Appwrite document to the shape expected by all existing
   * render/logic code.  Maps $id → id and createdAt → uploadedAt so that
   * _fmtDate(), _getYear(), and card templates work unchanged.
   * @param {Object} doc — raw Appwrite document
   * @returns {Object}
   */
  function _awNormDoc(doc) {
    return Object.assign({}, doc, {
      id:         doc.$id,
      uploadedAt: doc.createdAt   // _fmtDate() already handles ISO strings
    });
  }

  /* ════════════════════════════════════════════════════
     FIREBASE AUTH ACCESSORS  (unchanged — Auth is not migrated)
  ════════════════════════════════════════════════════ */

  function _authObj() {
    if (_auth) return _auth;
    if (typeof firebase !== 'undefined' && firebase.auth) {
      _auth = firebase.auth(); return _auth;
    }
    return null;
  }

  function _curUser() {
    return _user || (_authObj() && _authObj().currentUser) || null;
  }

  function _requireAuth() {
    if (!_curUser()) { _toast('Sign in to use the Library', 'warning'); return false; }
    return true;
  }

  /* _fsv() removed — Appwrite has no server-side FieldValue equivalents.
     Timestamps use new Date().toISOString(); counters use read-then-write. */

  /* ════════════════════════════════════════════════════
     CITATION GENERATOR
  ════════════════════════════════════════════════════ */
  function _genCitation(r, style) {
    var year     = _getYear(r.uploadedAt);
    var title    = r.title || 'Untitled';
    var source   = r.source || 'Unknown';
    /* Prefer Appwrite file view URL; fall back to fileURL (legacy) or externalLink */
    var url      = r.fileId ? _awFileUrl(r.fileId) : (r.fileURL || r.externalLink || '');
    var accessed = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    if (style === 'apa') {
      // APA 7th — Organization/Author. (Year). Title. Source. Retrieved Date, from URL
      return source + '. (' + year + '). ' + title + '. ' + source + '.' +
        (url ? ' Retrieved ' + accessed + ', from ' + url : '');
    }
    // Vancouver — Author/Org. Title. [Internet]. Year [cited Date]. Available from: URL
    return source + '. ' + title + '. [Internet]. ' + year +
      ' [cited ' + accessed + ']. Available from: ' + (url || '[URL unavailable]');
  }

  /* ════════════════════════════════════════════════════
     RENDER: RESOURCE CARD
  ════════════════════════════════════════════════════ */
  function _cardHTML(r, showStatus, showOasisBadge) {
    var tags = (r.tags || []).slice(0,6).map(function(t){
      return '<span class="lib-tag">'+_esc(t)+'</span>';
    }).join('');
    var bm = !!_bookmarks[r.id];
    var statusBadge = showStatus
      ? '<span class="lib-status ls-'+r.status+'">'+
          (r.status==='pending'?'⏳ Pending':r.status==='approved'?'✓ Approved':'✗ Rejected')+
        '</span> '
      : '';
    /* SVG icon definitions */
    var bmIcon = bm
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
      : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    var shareIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
    var dlIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    var hasDl = !!(r.fileId||r.fileURL||r.externalLink);
    return '<div class="lib-card">' +
      '<div class="lib-card-row" onclick="LibraryModule.openResource(\''+r.id+'\')" style="cursor:pointer">' +
        '<div class="lib-card-icon '+_typeCls(r.fileType)+'">'+_typeIcon(r.fileType)+'</div>' +
        '<div class="lib-card-info">' +
          '<div class="lib-card-title">'+_esc(r.title)+'</div>' +
          '<div class="lib-card-desc">'+_esc(r.description)+'</div>' +
          (tags ? '<div class="lib-tags">'+tags+'</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="lib-card-foot">' +
        '<div class="lib-card-cat">' +
          (showOasisBadge ? '<span class="rs-source-badge rs-badge-oasis" style="margin-right:5px">Oasis</span>' : '') +
          statusBadge+_esc(_catLabel(r.category))+
        '</div>' +
      '</div>' +
      /* ── CTA Action Bar ── */
      '<div class="lib-cta-bar" role="group" aria-label="Resource actions">' +
        '<button class="lib-cta-btn lib-cta-save'+(bm?' bm-active':'')+'" '+
          'data-bmid="'+r.id+'" '+
          'title="'+(bm?'Remove from saved':'Save resource')+'" '+
          'aria-label="'+(bm?'Remove from saved':'Save resource')+'" '+
          'aria-pressed="'+(bm?'true':'false')+'" '+
          'onclick="event.stopPropagation();LibraryModule.toggleBookmark(\''+r.id+'\')">'+
          '<span class="lib-cta-icon">'+bmIcon+'</span>'+
          '<span class="lib-cta-label">'+(bm?'Saved':'Save')+'</span>'+
        '</button>'+
        '<button class="lib-cta-btn lib-cta-share" '+
          'title="Share resource" aria-label="Share resource" '+
          'onclick="event.stopPropagation();LibraryModule.shareResource(\''+r.id+'\')">'+
          '<span class="lib-cta-icon">'+shareIcon+'</span>'+
          '<span class="lib-cta-label">Share</span>'+
        '</button>'+
        (hasDl
          ? '<button class="lib-cta-btn lib-cta-dl" '+
              'title="Download or open resource" aria-label="Download resource" '+
              'onclick="event.stopPropagation();LibraryModule.downloadResource(\''+r.id+'\')">'+
              '<span class="lib-cta-icon">'+dlIcon+'</span>'+
              '<span class="lib-cta-label">Download</span>'+
            '</button>'
          : '') +
      '</div>'+
    '</div>';
  }

  /* ════════════════════════════════════════════════════
     RENDER: PANELS
  ════════════════════════════════════════════════════ */
  function _renderEmpty(msg) {
    return '<div class="lib-empty"><div class="lib-empty-ico">📭</div>' +
           '<div class="lib-empty-txt">'+msg+'</div></div>';
  }

  /* ════════════════════════════════════════════════════
     SEARCH QUALITY ENGINE — v2
     ─────────────────────────────────────────────────
     Implements:
       • Phrase detection & exact-phrase boosting
       • Fuzzy similarity with configurable threshold
       • Weighted relevance scoring
         (exact title phrase > title kw > tags > cat > desc > fulltext)
       • Minimum relevance gate (no weak matches shown)
       • Result deduplication
       • Search cache (last 20 queries)
  ════════════════════════════════════════════════════ */

  /* ── Scoring weights ── */
  var SQ_W = {
    EXACT_TITLE_PHRASE : 20,
    TITLE_KEYWORD      : 10,
    TAG                :  6,
    CATEGORY           :  5,
    DESCRIPTION        :  3,
    FULLTEXT           :  1
  };

  /* ── Minimum total score to appear in results ── */
  var SQ_MIN_SCORE = 3;

  /* ── Fuzzy match threshold (0–1). Below this → ignored. ── */
  var SQ_FUZZY_THRESHOLD = 0.72;

  /* ── Search result cache ── */
  var _sqCache = {};           // { normalizedQuery: scoredAndSorted[] }
  var _sqCacheKeys = [];       // LRU ordered keys
  var SQ_CACHE_MAX = 20;

  /**
   * Normalise a string for comparison: lowercase, strip punctuation, collapse spaces.
   */
  function _sqNorm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract the set of meaningful tokens from a query string (words ≥ 2 chars).
   */
  function _sqTokens(q) {
    return _sqNorm(q).split(' ').filter(function(w){ return w.length >= 2; });
  }

  /**
   * Detect whether the query contains one or more quoted phrases OR
   * a multi-word phrase that should be treated atomically.
   * Returns an array of phrase strings (already normalised, no quotes).
   */
  function _sqPhrases(raw) {
    var phrases = [];
    // 1. Explicit quoted phrases — "renal nutrition"
    var quoted = raw.match(/"([^"]+)"/g);
    if (quoted) {
      quoted.forEach(function(q){ phrases.push(_sqNorm(q.replace(/"/g, ''))); });
    }
    // 2. The whole unquoted query as an implicit phrase (if ≥ 2 words)
    var unquoted = _sqNorm(raw.replace(/"[^"]*"/g, '').trim());
    if (unquoted && unquoted.split(' ').length >= 2) phrases.push(unquoted);
    return phrases;
  }

  /**
   * Levenshtein distance — used for fuzzy single-word matching.
   */
  function _sqLevenshtein(a, b) {
    if (a === b) return 0;
    var la = a.length, lb = b.length;
    if (!la) return lb;
    if (!lb) return la;
    var prev = [], curr = [];
    for (var j = 0; j <= lb; j++) prev[j] = j;
    for (var i = 1; i <= la; i++) {
      curr[0] = i;
      for (var j2 = 1; j2 <= lb; j2++) {
        var cost = a[i-1] === b[j2-1] ? 0 : 1;
        curr[j2] = Math.min(curr[j2-1]+1, prev[j2]+1, prev[j2-1]+cost);
      }
      prev = curr.slice();
    }
    return prev[lb];
  }

  /**
   * Similarity score (0–1) between two words via Levenshtein.
   */
  function _sqWordSim(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    var maxLen = Math.max(a.length, b.length);
    if (!maxLen) return 1;
    return 1 - _sqLevenshtein(a, b) / maxLen;
  }

  /**
   * Check whether a query token matches a field token — exact or fuzzy.
   * Returns true if sim >= threshold OR exact substring.
   */
  function _sqTokenMatches(qTok, fieldTok) {
    if (fieldTok.indexOf(qTok) !== -1) return true;          // substring
    if (qTok.length <= 3) return fieldTok === qTok;          // short tokens: exact only
    return _sqWordSim(qTok, fieldTok) >= SQ_FUZZY_THRESHOLD;
  }

  /**
   * Score a single resource against the parsed query.
   * Returns numeric score (0 = no match / below threshold).
   */
  function _sqScore(r, tokens, phrases) {
    if (!tokens.length && !phrases.length) return 0;

    var titleNorm = _sqNorm(r.title);
    var descNorm  = _sqNorm(r.description);
    var tagsNorm  = (r.tags || []).map(_sqNorm);
    var catLabel  = _sqNorm(_catLabel(r.category));
    var srcNorm   = _sqNorm(r.source);
    var fullText  = [titleNorm, descNorm, tagsNorm.join(' '), catLabel, srcNorm].join(' ');

    var score = 0;

    // ── 1. Exact phrase in title ─────────────────────────────────────────────
    phrases.forEach(function(ph) {
      if (ph && titleNorm.indexOf(ph) !== -1) {
        score += SQ_W.EXACT_TITLE_PHRASE;
      }
    });

    // ── 2. Token-level scoring ───────────────────────────────────────────────
    var titleWords = titleNorm.split(' ');
    var descWords  = descNorm.split(' ');
    var fullWords  = fullText.split(' ');

    var allTokensFoundInTitle = tokens.length > 0;
    tokens.forEach(function(tok) {
      var foundInTitle = titleWords.some(function(tw){ return _sqTokenMatches(tok, tw); });
      var foundInTag   = tagsNorm.some(function(tag){
        return tag.split(' ').some(function(tw){ return _sqTokenMatches(tok, tw); });
      });
      var foundInCat   = catLabel.split(' ').some(function(tw){ return _sqTokenMatches(tok, tw); });
      var foundInDesc  = descWords.some(function(dw){ return _sqTokenMatches(tok, dw); });
      var foundInFull  = fullWords.some(function(fw){ return _sqTokenMatches(tok, fw); });

      if (foundInTitle) {
        score += SQ_W.TITLE_KEYWORD;
      } else {
        allTokensFoundInTitle = false;
      }
      if (foundInTag)  score += SQ_W.TAG;
      if (foundInCat)  score += SQ_W.CATEGORY;
      if (!foundInTitle && foundInDesc) score += SQ_W.DESCRIPTION;
      if (!foundInTitle && !foundInDesc && foundInFull) score += SQ_W.FULLTEXT;

      // If not found anywhere → penalise heavily (prevents weak multi-token mismatches)
      if (!foundInFull) score -= 5;
    });

    // Bonus: all query tokens found in title → phrase-level coherence boost
    if (tokens.length > 1 && allTokensFoundInTitle) score += 5;

    return score;
  }

  /**
   * Main search function: filter + score + sort + gate local resources.
   */
  function _applyFilters(list) {
    // Apply hard category / type filters first
    var filtered = list.filter(function(r) {
      if (_filterCat  && r.category !== _filterCat)  return false;
      if (_filterType && r.fileType !== _filterType) return false;
      return true;
    });

    if (!_searchQ || !_searchQ.trim()) return filtered;

    var raw     = _searchQ.trim();
    var cacheKey = _sqNorm(raw) + '|' + _filterCat + '|' + _filterType;

    // Check cache
    if (_sqCache[cacheKey]) return _sqCache[cacheKey];

    var tokens  = _sqTokens(raw);
    var phrases = _sqPhrases(raw);

    // Score every resource
    var scored = [];
    var seen   = {};   // dedup by normalised title
    filtered.forEach(function(r) {
      var normTitle = _sqNorm(r.title);
      if (seen[normTitle]) return;   // deduplicate
      seen[normTitle] = true;

      var s = _sqScore(r, tokens, phrases);
      if (s >= SQ_MIN_SCORE) scored.push({ r: r, score: s });
    });

    // Sort highest score first
    scored.sort(function(a, b){ return b.score - a.score; });
    var result = scored.map(function(x){ return x.r; });

    // Cache result
    if (_sqCacheKeys.length >= SQ_CACHE_MAX) {
      delete _sqCache[_sqCacheKeys.shift()];
    }
    _sqCache[cacheKey] = result;
    _sqCacheKeys.push(cacheKey);

    return result;
  }

  /**
   * Invalidate local search cache (call when _resources changes).
   */
  function _sqClearCache() {
    _sqCache = {};
    _sqCacheKeys = [];
  }

  /* ─────────────────────────────────────────────────────────────────────────
     AI OVERVIEW — generates an AI summary at the top of library search results
  ───────────────────────────────────────────────────────────────────────── */

  /* Build compact context string from all matched results for the AI prompt */
  function _aioContext(localResults, glResults, frResults, elResults, extResults) {
    var items = [];
    localResults.slice(0, 5).forEach(function(r) {
      items.push('[Oasis Library] ' + r.title + (r.description ? ' — ' + r.description.substring(0, 120) : ''));
    });
    glResults.slice(0, 5).forEach(function(r) {
      var desc = (r.abstract || r.journal || '').substring(0, 120);
      items.push('[Clinical Guideline] ' + r.title + (desc ? ' — ' + desc : ''));
    });
    frResults.slice(0, 3).forEach(function(r) {
      items.push('[Frontiers] ' + r.title + (r.abstract ? ' — ' + r.abstract.substring(0, 120) : ''));
    });
    elResults.slice(0, 3).forEach(function(r) {
      items.push('[Elsevier] ' + r.title + (r.abstract ? ' — ' + r.abstract.substring(0, 120) : ''));
    });
    extResults.slice(0, 4).forEach(function(r) {
      var src = r._src === 'pubmed' ? 'PubMed' : 'OpenAlex';
      items.push('[' + src + '] ' + r.title + (r.abstract ? ' — ' + r.abstract.substring(0, 120) : ''));
    });
    return items.map(function(it, i){ return (i+1) + '. ' + it; }).join('\n');
  }

  /* Format AI markdown-lite response into safe HTML */
  function _aioFormat(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="font-family:var(--mono);font-size:10.5px;background:rgba(29,233,212,0.1);padding:1px 5px;border-radius:4px;color:rgba(29,233,212,0.9)">$1</code>')
      .replace(/^[-•]\s(.+)$/gm, '<div style="padding-left:13px;position:relative;margin:2px 0"><span style="position:absolute;left:2px;color:rgba(29,233,212,0.6)">▸</span>$1</div>')
      .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  }

  /* Build expandable sources list HTML */
  function _aioBuildSources(localResults, glResults, frResults, elResults, extResults) {
    var html = '';
    function row(src, cls, title, url) {
      var safeTitle = String(title || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      var titleEl = url
        ? '<a href="' + url + '" target="_blank" rel="noopener" class="lib-aio-src-title" style="color:rgba(29,233,212,0.7);text-decoration:none">' + safeTitle + '</a>'
        : '<span class="lib-aio-src-title">' + safeTitle + '</span>';
      return '<div class="lib-aio-src-item"><span class="lib-aio-src-badge ' + cls + '">' + src + '</span>' + titleEl + '</div>';
    }
    localResults.slice(0, 5).forEach(function(r) {
      html += row('Oasis Library', 'local', r.title, r.externalLink || r.fileURL || '');
    });
    glResults.slice(0, 5).forEach(function(r) {
      var url = r.url || (r.pmid ? 'https://pubmed.ncbi.nlm.nih.gov/' + r.pmid : '');
      html += row('Guideline', 'guideline', r.title, url);
    });
    frResults.slice(0, 3).forEach(function(r) { html += row('Frontiers', 'research', r.title, r.url || ''); });
    elResults.slice(0, 3).forEach(function(r) { html += row('Elsevier', 'database', r.title, r.url || ''); });
    extResults.slice(0, 4).forEach(function(r) {
      var src = r._src === 'pubmed' ? 'PubMed' : 'OpenAlex';
      var url = r.url || (r.pmid ? 'https://pubmed.ncbi.nlm.nih.gov/' + r.pmid : '');
      html += row(src, 'research', r.title, url);
    });
    return html;
  }

  /* Toggle sources panel */
  function _aioToggleSources() {
    var toggle  = document.getElementById('lib-aio-src-toggle');
    var sources = document.getElementById('lib-aio-src-list');
    if (!toggle || !sources) return;
    var isOpen = sources.classList.contains('open');
    sources.classList.toggle('open', !isOpen);
    toggle.classList.toggle('open', !isOpen);
    var countEl = toggle.querySelector('[data-aio-count]');
    if (countEl) countEl.textContent = isOpen ? 'Show sources' : 'Hide sources';
  }
  window._aioToggleSources = _aioToggleSources;

  /* Show loading skeleton */
  function _aioShowLoading() {
    var el = document.getElementById('lib-ai-overview');
    if (!el) return;
    el.innerHTML =
      '<div class="lib-aio-card">' +
        '<div class="lib-aio-header">' +
          '<div class="lib-aio-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(29,233,212,0.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>' +
          '<span class="lib-aio-label">AI Overview</span>' +
          '<span style="font-family:var(--mono);font-size:8px;color:rgba(255,255,255,0.2);margin-left:auto;letter-spacing:.5px">Oasis AI · Groq</span>' +
        '</div>' +
        '<div class="lib-aio-loading"><div class="lib-aio-dots"><span></span><span></span><span></span></div><span>Generating clinical summary…</span></div>' +
      '</div>';
  }

  /* Render final overview card */
  function _aioShowResult(summaryHtml, sourcesHtml, sourceCount) {
    var el = document.getElementById('lib-ai-overview');
    if (!el) return;
    el.innerHTML =
      '<div class="lib-aio-card">' +
        '<div class="lib-aio-header">' +
          '<div class="lib-aio-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(29,233,212,0.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>' +
          '<span class="lib-aio-label">AI Overview</span>' +
          '<span style="font-family:var(--mono);font-size:8px;color:rgba(255,255,255,0.2);margin-left:auto;letter-spacing:.5px">Oasis AI · Groq</span>' +
        '</div>' +
        '<div class="lib-aio-body">' + summaryHtml + '</div>' +
        (sourcesHtml
          ? '<button id="lib-aio-src-toggle" class="lib-aio-sources-toggle" onclick="_aioToggleSources()">' +
              '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
              '<span data-aio-count>Show sources</span>' +
              '<span style="font-family:var(--mono);font-size:8px;margin-left:2px;opacity:.5">(' + sourceCount + ')</span>' +
            '</button>' +
            '<div id="lib-aio-src-list" class="lib-aio-sources">' + sourcesHtml + '</div>'
          : '') +
      '</div>';
  }

  /* Clear overview when query resets */
  function _aioClear() {
    var el = document.getElementById('lib-ai-overview');
    if (el) el.innerHTML = '';
    _aiOvQuery   = '';
    _aiOvLoading = false;
  }

  /* Main trigger — called from _renderUnified after results land */
  function _triggerAIOverview(q, localResults, glResults, frResults, elResults, extResults) {
    var total = localResults.length + glResults.length + frResults.length + elResults.length + extResults.length;
    if (!total || !q || q.trim().length < 3) { _aioClear(); return; }
    if (_aiOvQuery === q.trim()) return; // already done for this query
    _aiOvQuery   = q.trim();
    _aiOvLoading = true;

    var context = _aioContext(localResults, glResults, frResults, elResults, extResults);
    if (!context) { _aioClear(); return; }

    _aioShowLoading();

    var apiKey = (typeof window !== 'undefined' && window.GROQ_API_KEY)
      ? window.GROQ_API_KEY
      : '';
    if (!apiKey) { _aioClear(); return; }

    var capturedQ = q.trim();
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 400,
        temperature: 0.25,
        messages: [
          {
            role: 'system',
            content: 'You are Oasis AI, a clinical nutrition knowledge assistant embedded in the Oasis Library search. ' +
              'Provide concise, evidence-informed overviews of nutrition topics based on matched resources. ' +
              'Use **bold** for key clinical terms. 2–4 short paragraphs or focused bullet points. ' +
              'Lead with the most clinically relevant insight. Keep under 160 words. No disclaimers, no preamble.'
          },
          {
            role: 'user',
            content: 'Search query: "' + capturedQ + '"\n\nMatched resources:\n' + context + '\n\n' +
              'Summarise the key clinical nutrition insights from these resources for a dietitian searching "' + capturedQ + '". ' +
              'Cover: main findings, guideline recommendations or evidence level, practical nutrition implications, and any important clinical caveats. ' +
              'Do not list the sources — they appear in a separate section below.'
          }
        ]
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (_aiOvQuery !== capturedQ) return; // stale response
      var raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      if (!raw) { _aioClear(); return; }
      var summaryHtml = _aioFormat(raw.trim());
      var sourcesHtml = _aioBuildSources(localResults, glResults, frResults, elResults, extResults);
      var sourceCount = Math.min(localResults.length, 5) + Math.min(glResults.length, 5) +
                        Math.min(frResults.length, 3) + Math.min(elResults.length, 3) + Math.min(extResults.length, 4);
      _aioShowResult(summaryHtml, sourcesHtml, sourceCount);
      _aiOvLoading = false;
    })
    .catch(function() {
      if (_aiOvQuery !== capturedQ) return;
      _aiOvLoading = false;
      var el = document.getElementById('lib-ai-overview');
      if (el && el.innerHTML) el.innerHTML = ''; // silently clear on error
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     _renderBrowse — called when no query is active (shows local library only)
     _renderUnified — called when a query is active (shows merged results)
  ───────────────────────────────────────────────────────────────────────── */
  function _renderBrowse() {
    var cont   = document.getElementById('lib-browse-cards');
    var badge  = document.getElementById('lib-res-count');
    var label  = document.getElementById('lib-results-label');
    var pgCont = document.getElementById('rs-pagination');
    var infoEl = document.getElementById('rs-sort-info');
    if (!cont) return;

    // Always show local filters when no query
    var localFilters = document.getElementById('lib-local-filters');
    if (localFilters) localFilters.style.display = 'block';
    if (pgCont) pgCont.innerHTML = '';
    if (infoEl) infoEl.style.display = 'none';
    if (label)  label.textContent = 'Library Resources';

    _removeSentinel();
    var filtered = _applyFilters(_resources);
    if (badge) badge.textContent = filtered.length;
    cont.innerHTML = filtered.length
      ? filtered.map(function(r){ return _cardHTML(r, false, false); }).join('')
      : _renderEmpty('No approved resources found.<br>Try different filters or upload a resource.');
  }

  function _renderUnified() {
    var cont   = document.getElementById('lib-browse-cards');
    var badge  = document.getElementById('lib-res-count');
    var label  = document.getElementById('lib-results-label');
    var pgCont = document.getElementById('rs-pagination');
    var infoEl = document.getElementById('rs-sort-info');
    if (!cont) return;

    // Hide local filters while a query is active
    var localFilters = document.getElementById('lib-local-filters');
    if (localFilters) localFilters.style.display = 'none';
    if (pgCont) pgCont.innerHTML = '';

    var isMalawiFilter = _filterCat === 'malawi_context';

    var localResults  = _applyFilters(_resources);
    // When the Malawi category filter is active, restrict GL results to the
    // MoH / Malawi-institution sub-source only (country_code:MW from OpenAlex).
    // All other external layers (Frontiers, Elsevier, PubMed, OpenAlex general)
    // are suppressed because they are not specifically Malawian content.
    var glResults  = isMalawiFilter
      ? _bgGLResults.filter(function(r){ return r._sub === 'moh'; })
      : _bgGLResults;
    var frResults  = isMalawiFilter ? [] : _bgFRResults;
    var elResults  = isMalawiFilter ? [] : _bgELResults;
    var extResults = isMalawiFilter ? [] : _bgExternalResults;

    var totalVisible  = localResults.length + glResults.length + frResults.length + elResults.length + extResults.length;

    if (label) label.textContent = 'Search Results';
    if (badge) badge.textContent = totalVisible + (_bgHasMore.pubmed || _bgHasMore.oa || _bgHasMoreGL || _bgHasMoreFR || _bgHasMoreEL ? '+' : '');

    var html = '';

    // ── Oasis Library results first ─────────────────────────────────────────
    if (localResults.length) {
      html += '<div class="lib-src-divider">Oasis Library (' + localResults.length + ')</div>';
      html += localResults.map(function(r){ return _cardHTML(r, false, true); }).join('');
    }

    // ── Layer 2: Clinical Guidelines ────────────────────────────────────────
    // When Malawi filter is active, only MoH/Malawi-institution results are shown.
    if (glResults.length) {
      var glLabel = isMalawiFilter
        ? 'Malawi MoH &amp; Institutions (' + glResults.length + (_bgHasMoreGL ? '+' : '') + ')'
        : 'Clinical Guidelines (' + glResults.length + (_bgHasMoreGL ? '+' : '') + ')';
      html += '<div class="lib-src-divider lib-gl-divider">' + glLabel + '</div>';
      html += glResults.map(function(r, i){ return _glCardHTML(r, i); }).join('');
    }

    // ── Layer 3: Frontiers in Research (hidden for Malawi filter) ───────────
    if (frResults.length) {
      var frLabel = 'Frontiers in Research (' + frResults.length + (_bgHasMoreFR ? '+' : '') + ')';
      html += '<div class="lib-src-divider lib-fr-divider">' + frLabel + '</div>';
      html += frResults.map(function(r, i){ return _frCardHTML(r, i); }).join('');
    }

    // ── Layer 3b: Elsevier (hidden for Malawi filter) ───────────────────────
    if (elResults.length) {
      var elScopusCount = elResults.filter(function(r){ return r._sub === 'scopus'; }).length;
      var elSDCount     = elResults.filter(function(r){ return r._sub === 'sciencedirect'; }).length;
      var elParts = [];
      if (elScopusCount) elParts.push(elScopusCount + ' Scopus');
      if (elSDCount)     elParts.push(elSDCount + ' ScienceDirect');
      var elLabel = 'Elsevier — ' + elParts.join(' · ') + (_bgHasMoreEL ? '+' : '');
      html += '<div class="lib-src-divider lib-el-divider">' + elLabel + '</div>';
      html += elResults.map(function(r, i){ return _elCardHTML(r, i); }).join('');
    }

    // ── Background loading indicator ────────────────────────────────────────
    if (_bgLoading && extResults.length === 0 && glResults.length === 0) {
      html +=
        '<div class="lib-bg-status">' +
          '<span class="lib-bg-spin"></span>' +
          '<span>Searching…</span>' +
        '</div>';
    }

    // ── External results (hidden for Malawi filter) ─────────────────────────
    if (extResults.length) {
      var pmCount = extResults.filter(function(r){ return r._src === 'pubmed'; }).length;
      var oaCount = extResults.filter(function(r){ return r._src === 'openalex'; }).length;
      var extLabel = [];
      if (pmCount) extLabel.push(pmCount + ' PubMed');
      if (oaCount) extLabel.push(oaCount + ' OpenAlex');
      html += '<div class="lib-src-divider">' + extLabel.join(' · ') + '</div>';
      html += extResults.map(function(r, i){ return _rsCardHTML(r, i); }).join('');
    }

    // ── Nothing found ───────────────────────────────────────────────────────
    if (!html) {
      html = _bgLoading
        ? '<div class="lib-bg-status"><span class="lib-bg-spin"></span><span>Searching…</span></div>'
        : _renderEmpty('No results found.<br>Try different keywords.');
    }

    cont.innerHTML = html;

    // ── Sort info bar ────────────────────────────────────────────────────────
    if (infoEl) {
      if (!isMalawiFilter && (extResults.length || frResults.length || elResults.length)) {
        var totParts = [];
        if (_bgPubMedTotal) totParts.push(_bgPubMedTotal.toLocaleString() + ' PubMed');
        if (_bgOATotal)     totParts.push(_bgOATotal.toLocaleString() + ' OpenAlex');
        if (_bgFRTotal)     totParts.push(_bgFRTotal.toLocaleString() + ' Frontiers');
        if (_bgELTotal)     totParts.push(_bgELTotal.toLocaleString() + ' Elsevier');
        infoEl.style.display = 'flex';
        infoEl.innerHTML =
          '<span>' + totParts.join(' · ') + ' total results</span>' +
          (_rsOpenAccess ? '<span class="rs-oa-badge">🔓 Open Access</span>' : '');
      } else {
        infoEl.style.display = 'none';
      }
    }

    // ── Infinite scroll sentinel ─────────────────────────────────────────────
    // For the Malawi filter, none of the load-more sources are relevant.
    var _canLoadMore = !isMalawiFilter && (_bgHasMore.pubmed || _bgHasMore.oa || _bgHasMoreFR || _bgHasMoreEL);
    if (_canLoadMore) {
      _addSentinel();
    } else {
      _removeSentinel();
    }

    // ── AI Overview: fire after results land (not while still loading)
    if (!_bgLoading && _searchQ && _searchQ.trim().length >= 3) {
      _triggerAIOverview(_searchQ, localResults, glResults, frResults, elResults, extResults);
    }
  }

  /* ── Deduplication helpers ────────────────────────────────────────────────── */
  function _normalizeTitle(t) {
    return String(t || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function _titleSimilarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    var aW = a.split(' ').filter(function(w){ return w.length > 3; });
    var bW = b.split(' ').filter(function(w){ return w.length > 3; });
    if (!aW.length || !bW.length) return 0;
    var shared = aW.filter(function(w){ return bW.indexOf(w) !== -1; });
    return shared.length / Math.max(aW.length, bW.length);
  }

  function _deduplicateExternal(candidates) {
    // Build lookup from local library items
    var localTitles = _resources.map(function(r){ return _normalizeTitle(r.title); });
    var localDois = {};
    _resources.forEach(function(r){ if (r.doi) localDois[r.doi] = true; });
    // Build lookup from already-loaded external results
    var existingIds = {};
    _bgExternalResults.forEach(function(r){ existingIds[r.id] = true; });
    var existingTitles = _bgExternalResults.map(function(r){ return _normalizeTitle(r.title); });
    // Exclude items already shown in Layer 2 (Clinical Guidelines) or Layer 3 (Frontiers)
    var glPmids = {};
    _bgGLResults.forEach(function(r){ if (r.pmid) glPmids[r.pmid] = true; });
    var glTitles = _bgGLResults.map(function(r){ return _normalizeTitle(r.title); });
    var frDois = {};
    _bgFRResults.forEach(function(r){ if (r.doi) frDois[r.doi] = true; });
    var frTitles = _bgFRResults.map(function(r){ return _normalizeTitle(r.title); });

    return candidates.filter(function(c) {
      if (existingIds[c.id]) return false;
      if (c.pmid && glPmids[c.pmid]) return false;
      var cTitle = _normalizeTitle(c.title);
      if (c.doi && localDois[c.doi]) return false;
      if (c.doi && frDois[c.doi]) return false;
      if (localTitles.some(function(lt){ return _titleSimilarity(lt, cTitle) > 0.80; })) return false;
      if (existingTitles.some(function(et){ return _titleSimilarity(et, cTitle) > 0.80; })) return false;
      if (glTitles.some(function(gt){ return _titleSimilarity(gt, cTitle) > 0.80; })) return false;
      if (frTitles.some(function(ft){ return _titleSimilarity(ft, cTitle) > 0.80; })) return false;
      return true;
    });
  }

  /* ── Unified search — debounced at 400 ms to reduce excessive API calls ─── */
  var _bgSearchTimer = null;
  function _unifiedSearch(q) {
    clearTimeout(_bgSearchTimer);
    // Show local scored results immediately (fast, no network) while debouncing API
    var tokens  = _sqTokens(q);
    var phrases = _sqPhrases(q);
    var localPreview = _resources.filter(function(r) {
      if (_filterCat  && r.category !== _filterCat)  return false;
      if (_filterType && r.fileType !== _filterType) return false;
      return _sqScore(r, tokens, phrases) >= SQ_MIN_SCORE;
    });
    localPreview.sort(function(a, b) {
      return _sqScore(b, tokens, phrases) - _sqScore(a, tokens, phrases);
    });
    // Render local preview while waiting for API
    var cont = document.getElementById('lib-browse-cards');
    var localFilters = document.getElementById('lib-local-filters');
    if (cont && localPreview.length) {
      if (localFilters) localFilters.style.display = 'none';
      cont.innerHTML =
        '<div class="lib-src-divider">Oasis Library (' + localPreview.length + ')</div>' +
        localPreview.map(function(r){ return _cardHTML(r, false, true); }).join('') +
        '<div class="lib-bg-status"><span class="lib-bg-spin"></span><span>Searching…</span></div>';
    }
    _bgSearchTimer = setTimeout(function(){ _doUnifiedSearch(q); }, 400);
  }

  function _doUnifiedSearch(q) {
    _bgCurrentQuery    = q;
    _bgExternalResults = [];
    _bgPubMedPage      = 1;
    _bgOAPage          = 1;
    _bgPubMedTotal     = 0;
    _bgOATotal         = 0;
    _bgHasMore         = { pubmed: false, oa: false };
    _bgGLResults       = [];
    _bgGLPage          = 1;
    _bgGLTotal         = 0;
    _bgHasMoreGL       = false;
    _bgFRResults       = [];
    _bgFRPage          = 1;
    _bgFRTotal         = 0;
    _bgHasMoreFR       = false;
    _bgELResults       = [];
    _bgELPage          = 1;
    _bgELTotal         = 0;
    _bgHasMoreEL       = false;
    _removeSentinel();

    if (!q || q.trim().length < 2) {
      _bgLoading = false;
      _renderBrowse();
      return;
    }

    // Show local results immediately (offline-safe)
    _bgLoading = navigator.onLine !== false;
    _renderUnified();

    if (!_bgLoading) {
      _toast('Offline — showing Oasis Library results only', 'info');
      return;
    }

    var capturedQuery = q;
    Promise.all([
      _rsPubMedSearch(q, 1, _rsYearFrom, _rsYearTo)
        .catch(function(){ return { results: [], total: 0 }; }),
      _rsOASearch(q, 1, _rsYearFrom, _rsYearTo, _rsOpenAccess)
        .catch(function(){ return { results: [], total: 0 }; }),
      _glUnifiedSearch(q, 1)
        .catch(function(){ return { results: [], total: 0 }; }),
      _rsFrontiersSearch(q, 1)
        .catch(function(){ return { results: [], total: 0 }; }),
      _rsElsevierSearch(q, 1)
        .catch(function(){ return { results: [], total: 0 }; })
    ]).then(function(arrs) {
      if (_bgCurrentQuery !== capturedQuery) return; // stale
      var pmData = arrs[0], oaData = arrs[1], glData = arrs[2], frData = arrs[3], elData = arrs[4];
      _bgPubMedTotal    = pmData.total;
      _bgOATotal        = oaData.total;
      _bgHasMore.pubmed = pmData.results.length === RS_PAGE_SIZE && pmData.total > RS_PAGE_SIZE;
      _bgHasMore.oa     = oaData.results.length === RS_PAGE_SIZE && oaData.total > RS_PAGE_SIZE;

      // Layer 2: Guidelines — deduplicated against local library
      _bgGLTotal        = glData.total;
      _bgHasMoreGL      = glData.results.length === GL_PAGE_SIZE && glData.total > GL_PAGE_SIZE;
      _bgGLResults      = _deduplicateGL(glData.results);

      // Layer 3: Frontiers — deduplicated against local library + GL
      _bgFRTotal        = frData.total;
      _bgHasMoreFR      = frData.results.length === RS_FRONTIERS_SIZE && frData.total > RS_FRONTIERS_SIZE;
      _bgFRResults      = _deduplicateFR(frData.results);

      // Layer 3b: Elsevier — deduplicated against local library + GL + FR
      _bgELTotal        = elData.total;
      _bgHasMoreEL      = elData.results.length === RS_ELSEVIER_SIZE && elData.total > RS_ELSEVIER_SIZE;
      _bgELResults      = _deduplicateEL(elData.results);

      var allExt = pmData.results.concat(oaData.results);
      _bgExternalResults = _deduplicateExternal(allExt);
      _bgLoading = false;
      _renderUnified();
    }).catch(function() {
      if (_bgCurrentQuery !== capturedQuery) return;
      _bgLoading = false;
      _renderUnified();
    });
  }

  /* ── Load more (infinite scroll) ─────────────────────────────────────────── */
  function _loadMoreExternal() {
    if (_bgLoading) return;
    var q = _searchQ.trim();
    if (!q || (!_bgHasMore.pubmed && !_bgHasMore.oa && !_bgHasMoreFR && !_bgHasMoreEL)) return;
    _bgLoading = true;

    var promises = [];
    if (_bgHasMore.pubmed) {
      _bgPubMedPage++;
      promises.push(
        _rsPubMedSearch(q, _bgPubMedPage, _rsYearFrom, _rsYearTo)
          .then(function(d){
            _bgPubMedTotal    = d.total;
            _bgHasMore.pubmed = d.results.length === RS_PAGE_SIZE;
            return d.results;
          }).catch(function(){ _bgHasMore.pubmed = false; return []; })
      );
    }
    if (_bgHasMore.oa) {
      _bgOAPage++;
      promises.push(
        _rsOASearch(q, _bgOAPage, _rsYearFrom, _rsYearTo, _rsOpenAccess)
          .then(function(d){
            _bgOATotal    = d.total;
            _bgHasMore.oa = d.results.length === RS_PAGE_SIZE;
            return d.results;
          }).catch(function(){ _bgHasMore.oa = false; return []; })
      );
    }
    if (_bgHasMoreFR) {
      _bgFRPage++;
      _rsFrontiersSearch(q, _bgFRPage)
        .then(function(d) {
          _bgFRTotal   = d.total;
          _bgHasMoreFR = d.results.length === RS_FRONTIERS_SIZE;
          var deduped  = _deduplicateFR(d.results);
          deduped.forEach(function(r){ _bgFRResults.push(r); });
        }).catch(function(){ _bgHasMoreFR = false; });
    }
    if (_bgHasMoreEL) {
      _bgELPage++;
      _rsElsevierSearch(q, _bgELPage)
        .then(function(d) {
          _bgELTotal   = d.total;
          _bgHasMoreEL = d.results.length === RS_ELSEVIER_SIZE;
          var deduped  = _deduplicateEL(d.results);
          deduped.forEach(function(r){ _bgELResults.push(r); });
        }).catch(function(){ _bgHasMoreEL = false; });
    }

    Promise.all(promises).then(function(arrs) {
      var newResults = [].concat.apply([], arrs);
      var deduped = _deduplicateExternal(newResults);
      deduped.forEach(function(r){ _bgExternalResults.push(r); });
      _bgLoading = false;
      _renderUnified();
    });
  }

  /* ── IntersectionObserver sentinel ───────────────────────────────────────── */
  function _addSentinel() {
    var cont = document.getElementById('lib-browse-cards');
    if (!cont) return;
    if (_bgObserver) _bgObserver.disconnect();
    // Append sentinel if not present
    var sentinel = document.getElementById('lib-scroll-sentinel');
    if (!sentinel) {
      sentinel = document.createElement('div');
      sentinel.id = 'lib-scroll-sentinel';
      sentinel.style.cssText = 'height:48px;display:flex;align-items:center;justify-content:center';
      sentinel.innerHTML = '<div class="lib-bg-spin"></div>';
      cont.appendChild(sentinel);
    }
    if (typeof IntersectionObserver !== 'undefined') {
      _bgObserver = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting && !_bgLoading) _loadMoreExternal();
      }, { rootMargin: '200px' });
      _bgObserver.observe(sentinel);
    }
  }

  function _removeSentinel() {
    if (_bgObserver) { _bgObserver.disconnect(); _bgObserver = null; }
    var s = document.getElementById('lib-scroll-sentinel');
    if (s) s.remove();
  }

  function _renderMine() {
    var cont = document.getElementById('lib-my-cards');
    var badge = document.getElementById('lib-my-count');
    if (!cont) return;
    if (badge) badge.textContent = _myResources.length;
    if (!_myResources.length) {
      cont.innerHTML = _renderEmpty("You haven't submitted any resources yet.<br>Switch to the Upload tab to submit one.");
      return;
    }
    cont.innerHTML = _myResources.map(function(r) {
      var note = r.reviewNote
        ? '<div class="lib-review-note rn-'+r.status+'">'+_esc(r.reviewNote)+'</div>'
        : '';
      var viewBtn = r.status === 'approved'
        ? '<button class="lib-act-link" onclick="LibraryModule.openResource(\''+r.id+'\')">View Public Resource →</button>'
        : '';
      return '<div class="lib-my-card">' +
        '<div class="lib-my-head">' +
          '<div class="lib-card-icon '+_typeCls(r.fileType)+'" style="width:32px;height:32px;font-size:14px">'+_typeIcon(r.fileType)+'</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="lib-my-title">'+_esc(r.title)+'</div>' +
            '<div style="font-family:var(--mono);font-size:9px;color:var(--text-muted);margin-top:2px">'+
              _esc(_catLabel(r.category))+' · '+r.fileType.toUpperCase()+' · '+_fmtDate(r.uploadedAt)+
            '</div>' +
          '</div>' +
          '<span class="lib-status ls-'+r.status+'">' +
            (r.status==='pending'?'⏳':r.status==='approved'?'✓':'✗')+' '+r.status +
          '</span>' +
        '</div>' +
        note + viewBtn +
      '</div>';
    }).join('');
  }

  function _renderBookmarks() {
    var cont = document.getElementById('lib-bm-cards');
    var badge = document.getElementById('lib-bm-count');
    if (!cont) return;
    var bmList = _resources.filter(function(r){ return !!_bookmarks[r.id]; });
    if (badge) badge.textContent = bmList.length;
    if (!bmList.length) {
      cont.innerHTML = _renderEmpty('No bookmarks yet.<br>Browse approved resources and click ☆ to save them here.');
      return;
    }
    cont.innerHTML = bmList.map(function(r){ return _cardHTML(r, false); }).join('');
  }

  /* ════════════════════════════════════════════════════
     DATA: LOAD APPROVED  (Appwrite Databases)
  ════════════════════════════════════════════════════ */
  function _loadApproved() {
    var awdb = _awDb();
    if (!awdb) { _renderBrowse(); return; }
    var cont = document.getElementById('lib-browse-cards');
    if (cont) cont.innerHTML = '<div class="lib-spin"></div>';
    awdb.listDocuments(
      _AW_DB_ID(),
      _AW_COL_ID(),
      [
        Appwrite.Query.equal('status', 'approved'),
        Appwrite.Query.orderDesc('createdAt'),
        Appwrite.Query.limit(120)
      ]
    ).then(function(resp) {
      _resources = resp.documents.map(_awNormDoc);
      _sqClearCache();   // invalidate scored search cache after fresh data
      _renderBrowse();
      _renderBookmarks();
    }).catch(function(e) {
      console.error('[Library] loadApproved:', e);
      _renderBrowse();
    });
  }

  /* ════════════════════════════════════════════════════
     DATA: MY UPLOADS  (Appwrite Databases + Realtime)
  ════════════════════════════════════════════════════ */
  function _subscribeMyUploads() {
    var awdb = _awDb();
    var uid  = _curUser() && _curUser().uid;
    if (!awdb || !uid) { _renderMine(); return; }

    /* Tear down previous subscription */
    if (_unsubMine) { _unsubMine(); _unsubMine = null; }

    var prevStatuses = {};
    _myResources.forEach(function(r){ prevStatuses[r.id] = r.status; });

    /* ── One-shot fetch helper — shared by initial load and realtime refresh ── */
    function _fetchMine() {
      return awdb.listDocuments(
        _AW_DB_ID(),
        _AW_COL_ID(),
        [
          Appwrite.Query.equal('uploadedBy', uid),
          Appwrite.Query.orderDesc('createdAt'),
          Appwrite.Query.limit(100)
        ]
      ).then(function(resp) {
        _myResources = resp.documents.map(_awNormDoc);
        _renderMine();
        return _myResources;
      });
    }

    /* Initial load */
    _fetchMine().then(function(resources) {
      resources.forEach(function(r){ prevStatuses[r.id] = r.status; });
    }).catch(function(e){ console.error('[Library] myUploads err:', e); _renderMine(); });

    /* ── Appwrite Realtime subscription for status-change toasts ── */
    var awclient = window.AppwriteClient;
    if (awclient && typeof awclient.subscribe === 'function') {
      var channel = 'databases.' + _AW_DB_ID() +
                    '.collections.' + _AW_COL_ID() + '.documents';
      _unsubMine = awclient.subscribe(channel, function(response) {
        var doc = response && response.payload;
        if (!doc || doc.uploadedBy !== uid) return;

        var normalized = _awNormDoc(doc);
        var prev = prevStatuses[normalized.id];

        /* Detect admin status changes and surface toast + nav dot */
        if (prev && prev !== normalized.status && normalized.status !== 'pending') {
          var msg = normalized.status === 'approved'
            ? '✓ "' + normalized.title + '" was approved'
            : '✗ "' + normalized.title + '" was not approved';
          _toast(msg, normalized.status === 'approved' ? 'success' : 'warning', 5500);
          var dot = document.getElementById('lib-nav-dot');
          if (dot) dot.classList.add('show');
        }

        /* Refresh the full list after any change to this user's docs */
        _fetchMine().then(function(resources) {
          resources.forEach(function(r){ prevStatuses[r.id] = r.status; });
        }).catch(function(){});
      });
    }
  }

  /* ════════════════════════════════════════════════════
     DATA: BOOKMARKS  (localStorage — no Appwrite collection)
     Key format: "oasis_lib_bm_{uid}"
  ════════════════════════════════════════════════════ */
  function _loadBookmarks() {
    var uid = _curUser() && _curUser().uid;
    _bookmarks = {};
    if (uid) {
      try {
        var raw = localStorage.getItem('oasis_lib_bm_' + uid);
        if (raw) _bookmarks = JSON.parse(raw) || {};
      } catch (e) { /* ignore parse errors */ }
    }
    _renderBookmarks();
    /* Refresh bookmark icons on already-rendered browse cards */
    document.querySelectorAll('[data-bmid]').forEach(function(btn) {
      var id     = btn.getAttribute('data-bmid');
      var active = !!_bookmarks[id];
      btn.classList.toggle('bm-active', active);
      btn.title = active ? 'Remove from saved' : 'Save resource';
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      var iconEl  = btn.querySelector('.lib-cta-icon');
      var labelEl = btn.querySelector('.lib-cta-label');
      if (iconEl) {
        iconEl.innerHTML = active
          ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
          : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
      }
      if (labelEl) labelEl.textContent = active ? 'Saved' : 'Save';
    });
  }

  /* ════════════════════════════════════════════════════
     BOOKMARK TOGGLE  (localStorage)
  ════════════════════════════════════════════════════ */
  function _toggleBookmark(resourceId) {
    if (!_requireAuth()) return;
    var uid = _curUser().uid;
    if (_bookmarks[resourceId]) {
      delete _bookmarks[resourceId];
      _toast('Removed from saved', 'info');
    } else {
      _bookmarks[resourceId] = true;
      _toast('✓ Saved to bookmarks', 'success');
    }
    try {
      localStorage.setItem('oasis_lib_bm_' + uid, JSON.stringify(_bookmarks));
    } catch (e) { /* quota exceeded or private mode — silent */ }
    /* Update all buttons with this resource ID */
    document.querySelectorAll('[data-bmid="'+resourceId+'"]').forEach(function(btn) {
      var active = !!_bookmarks[resourceId];
      btn.classList.toggle('bm-active', active);
      btn.title = active ? 'Remove from saved' : 'Save resource';
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      var iconEl  = btn.querySelector('.lib-cta-icon');
      var labelEl = btn.querySelector('.lib-cta-label');
      if (iconEl) {
        iconEl.innerHTML = active
          ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
          : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
      }
      if (labelEl) labelEl.textContent = active ? 'Saved' : 'Save';
      /* Micro-animation on state change */
      btn.classList.add('cta-done');
      setTimeout(function(){ btn.classList.remove('cta-done'); }, 500);
    });
    _renderBookmarks();
  }

  /* ════════════════════════════════════════════════════
     RESOURCE VIEWER
  ════════════════════════════════════════════════════ */
  function _openResource(resourceId) {
    var r = _resources.concat(_myResources).filter(function(x){return x.id===resourceId;})[0];
    if (!r) return;
    _activeRes = r;

    var modal   = document.getElementById('lib-viewer');
    var titleEl = document.getElementById('lib-vtitle-el');
    var content = document.getElementById('lib-vcontent');
    var meta    = document.getElementById('lib-vmeta');

    titleEl.textContent = r.title || 'Resource';

    // Content pane
    if (r.fileType === 'pdf' && (r.fileId || r.fileURL)) {
      var pdfSrc = r.fileId ? _awFileUrl(r.fileId) : r.fileURL;
      content.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:16px;padding:24px;text-align:center">'+
          '<div style="font-size:44px">📄</div>'+
          '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">Use the button below to open or download this PDF.</div>'+
          '<a href="'+pdfSrc+'" target="_blank" rel="noopener noreferrer" '+
            'style="padding:11px 28px;background:rgba(29,233,212,.1);border:1px solid var(--teal);border-radius:9px;'+
            'color:var(--teal);font-family:var(--mono);font-size:11px;font-weight:700;text-decoration:none">'+
            '↓ Open PDF ↗</a>'+
        '</div>';
    } else if (r.fileType === 'image' && (r.fileId || r.fileURL)) {
      var imgSrc = r.fileId ? _awFileUrl(r.fileId) : r.fileURL;
      content.innerHTML = '<img src="'+imgSrc+'" alt="'+_esc(r.title)+'" loading="lazy" style="width:100%;height:100%;object-fit:contain;display:block">';
    } else if (r.fileType === 'link' && r.externalLink) {
      content.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:16px;padding:24px;text-align:center">'+
          '<div style="font-size:44px">🔗</div>'+
          '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);word-break:break-all;max-width:460px">'+_esc(r.externalLink)+'</div>'+
          '<a href="'+r.externalLink+'" target="_blank" rel="noopener noreferrer" '+
            'style="padding:11px 28px;background:rgba(29,233,212,.1);border:1px solid var(--teal);border-radius:9px;'+
            'color:var(--teal);font-family:var(--mono);font-size:11px;font-weight:700;text-decoration:none">'+
            'Open External Link ↗</a>'+
        '</div>';
    } else {
      content.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;padding:24px">'+
          '<div style="font-size:44px">'+_typeIcon(r.fileType)+'</div>'+
          '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);text-align:center">'+
            'Preview not available for this file type.<br>Use the download button below.</div>'+
        '</div>';
    }

    // Related resources
    var related = _resources.filter(function(x) {
      if (x.id === r.id) return false;
      if (x.category === r.category) return true;
      return (r.tags||[]).some(function(t){ return (x.tags||[]).indexOf(t) !== -1; });
    }).slice(0,4);

    var relHTML = related.length
      ? '<div class="lib-rel-hdr">Related Resources</div>' +
        related.map(function(rel) {
          return '<div class="lib-rel-item" onclick="LibraryModule.openResource(\''+rel.id+'\')">'+
            '<span>'+_typeIcon(rel.fileType)+'</span>'+
            '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_esc(rel.title)+'</span>'+
          '</div>';
        }).join('')
      : '';

    // Metadata pane
    /* Resolve the action URL: Appwrite fileId takes priority over legacy fileURL */
    var _actUrl = r.fileId ? _awFileUrl(r.fileId) : (r.fileURL || r.externalLink || '');
    var _bmActive = !!_bookmarks[r.id];
    var _bmSvgFilled = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    var _bmSvgEmpty = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    var _shareSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
    var _dlSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    meta.innerHTML =
      '<div class="lib-vacts">'+
        (_actUrl
          ? '<a href="'+_actUrl+'" target="_blank" rel="noopener noreferrer" '+
              'class="lib-vbtn primary" style="gap:6px;font-size:11px;padding:9px 18px;border-radius:9px;background:rgba(29,233,212,.15);border-color:rgba(29,233,212,.5);box-shadow:0 0 12px rgba(29,233,212,.15)" '+
              'onclick="LibraryModule._trackView(\''+r.id+'\',\'download\')">'+_dlSvg+' Download / Open</a>'
          : '') +
        '<button class="lib-vbtn'+((_bmActive)?' bm-active':'')+'" '+
          'data-bmid="'+r.id+'" '+
          'style="gap:6px;font-size:11px;padding:9px 16px;border-radius:9px;'+
          ((_bmActive)?'background:rgba(240,180,41,.18);border-color:rgba(240,180,41,.55);color:var(--amber)':'')+'" '+
          'onclick="LibraryModule.toggleBookmark(\''+r.id+'\')">'+
          '<span class="lib-cta-icon" style="width:16px;height:16px">'+(_bmActive?_bmSvgFilled:_bmSvgEmpty)+'</span>'+
          '<span class="lib-cta-label" style="font-size:11px;letter-spacing:.3px;text-transform:none;font-weight:600">'+(_bmActive?'Saved':'Save')+'</span>'+
        '</button>'+
        '<button class="lib-vbtn" '+
          'style="gap:6px;font-size:11px;padding:9px 16px;border-radius:9px;background:rgba(96,165,250,.1);border-color:rgba(96,165,250,.35);color:#60a5fa" '+
          'onclick="LibraryModule.shareResource(\''+r.id+'\')">'+_shareSvg+' Share</button>'+
      '</div>'+
      '<div style="font-family:var(--mono);font-size:9px;color:var(--text-muted);margin-bottom:10px;line-height:1.7">'+
        '<strong style="color:var(--text-dim)">Source:</strong> '+_esc(r.source||'—')+'&nbsp;·&nbsp;'+
        '<strong style="color:var(--text-dim)">Category:</strong> '+_esc(_catLabel(r.category))+'&nbsp;·&nbsp;'+
        '<strong style="color:var(--text-dim)">Added:</strong> '+_fmtDate(r.uploadedAt)+
      '</div>'+
      (r.tags&&r.tags.length
        ? '<div class="lib-tags" style="margin-bottom:10px">'+r.tags.map(function(t){return '<span class="lib-tag">'+_esc(t)+'</span>';}).join('')+'</div>'
        : '') +
      '<div>'+
        '<div class="lib-cit-tabs">'+
          '<button class="lib-cit-tab active" id="lib-cit-apa"  onclick="LibraryModule.setCitStyle(\'apa\')">APA 7th</button>'+
          '<button class="lib-cit-tab"        id="lib-cit-van"  onclick="LibraryModule.setCitStyle(\'vancouver\')">Vancouver</button>'+
        '</div>'+
        '<div class="lib-cit-block">'+
          '<button class="lib-cit-copy" onclick="LibraryModule.copyCitation()">Copy</button>'+
          '<div id="lib-cit-text">'+_esc(_genCitation(r,'apa'))+'</div>'+
        '</div>'+
      '</div>'+
      relHTML;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    _trackView(r.id, 'view');
  }

  function _closeViewer() {
    var modal = document.getElementById('lib-viewer');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
    // Free iframe memory
    var c = document.getElementById('lib-vcontent');
    if (c) c.innerHTML = '';
    _activeRes = null;
  }

  /* ── View / download counter ─────────────────────────────────────────────
     Appwrite has no server-side atomic increment.  We do a best-effort
     read-then-write; race conditions are acceptable for analytics counters.
  ───────────────────────────────────────────────────────────────────────── */
  function _trackView(resourceId, action) {
    var awdb = _awDb();
    if (!awdb) return;
    var field = action === 'view' ? 'viewCount' : 'downloadCount';
    awdb.getDocument(_AW_DB_ID(), _AW_COL_ID(), resourceId)
      .then(function(doc) {
        var patch = {};
        patch[field] = (doc[field] || 0) + 1;
        return awdb.updateDocument(_AW_DB_ID(), _AW_COL_ID(), resourceId, patch);
      })
      .catch(function(){}); // silent — tracking is non-critical
  }

  /* ════════════════════════════════════════════════════
     SHARE + DOWNLOAD
  ════════════════════════════════════════════════════ */
  function _shareResource(resourceId) {
    var r = _resources.concat(_myResources).filter(function(x){return x.id===resourceId;})[0];
    if (!r) return;
    var text = r.title + ' — ' + (r.source||'Oasis Library') + '\n' + (r.description||'');
    if (navigator.share) {
      navigator.share({title:r.title,text:text,url:r.externalLink||window.location.href}).catch(function(){});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(function(){ _toast('Copied to clipboard', 'success'); })
        .catch(function(){ _toast('Sharing not supported on this device','info'); });
    } else {
      _toast('Sharing not supported on this device','info');
    }
  }

  function _downloadResource(resourceId) {
    var r = _resources.concat(_myResources).filter(function(x){return x.id===resourceId;})[0];
    if (!r) return;
    var url = r.fileId ? _awFileUrl(r.fileId) : (r.fileURL || r.externalLink);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      _trackView(resourceId, 'download');
    } else {
      _toast('No file available for download','warning');
    }
  }

  /* ════════════════════════════════════════════════════
     CITATION STYLE TOGGLE
  ════════════════════════════════════════════════════ */
  function _setCitStyle(style) {
    _citStyle = style;
    var apaTab = document.getElementById('lib-cit-apa');
    var vanTab = document.getElementById('lib-cit-van');
    if (apaTab) apaTab.classList.toggle('active', style === 'apa');
    if (vanTab) vanTab.classList.toggle('active', style === 'vancouver');
    var textEl = document.getElementById('lib-cit-text');
    if (textEl && _activeRes) textEl.textContent = _genCitation(_activeRes, style);
  }

  function _copyCitation() {
    var textEl = document.getElementById('lib-cit-text');
    if (!textEl) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textEl.textContent)
        .then(function(){ _toast('Citation copied!','success'); })
        .catch(function(){ _toast('Could not copy','warning'); });
    } else {
      _toast('Clipboard not supported on this device','info');
    }
  }

  /* ════════════════════════════════════════════════════
     UPLOAD FORM — TYPE CHANGE
  ════════════════════════════════════════════════════ */
  function _onTypeChange(val) {
    var fileSec = document.getElementById('lib-file-sec');
    var linkSec = document.getElementById('lib-link-sec');
    if (fileSec) fileSec.style.display = val === 'link' ? 'none' : 'block';
    if (linkSec) linkSec.style.display = val === 'link' ? 'block' : 'none';
  }

  /* ════════════════════════════════════════════════════
     UPLOAD FORM — FILE HANDLING
  ════════════════════════════════════════════════════ */
  function _onFileDrop(ev) {
    ev.preventDefault();
    var dz = document.getElementById('lib-dropzone');
    if (dz) dz.classList.remove('drag-over');
    var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (file) _processFile(file);
  }

  function _onFileSelect(ev) {
    var file = ev.target && ev.target.files && ev.target.files[0];
    if (file) _processFile(file);
  }

  function _processFile(file) {
    if (file.size > LIB_MAX_MB * 1048576) {
      _toast('File exceeds '+LIB_MAX_MB+'MB limit','error'); return;
    }
    if (!LIB_MIME_MAP[file.type]) {
      _toast('Unsupported file type. Accepted: PDF, DOCX, JPG, PNG, GIF, WebP','error'); return;
    }
    _selectedFile = file;
    var wrap = document.getElementById('lib-fp-wrap');
    if (wrap) {
      wrap.innerHTML =
        '<div class="lib-file-prev">'+
          '<span>'+_typeIcon(LIB_MIME_MAP[file.type])+'</span>'+
          '<span class="lib-fp-name">'+_esc(file.name)+'</span>'+
          '<span class="lib-fp-size">'+_fmtSize(file.size)+'</span>'+
          '<button onclick="LibraryModule._clearFile()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:13px;flex-shrink:0">✕</button>'+
        '</div>';
    }
  }

  function _clearFile() {
    _selectedFile = null;
    var wrap = document.getElementById('lib-fp-wrap');
    if (wrap) wrap.innerHTML = '';
    var fi = document.getElementById('lib-file-input');
    if (fi) fi.value = '';
  }

  function _validateLinkPreview(url) {
    var wrap = document.getElementById('lib-link-preview');
    if (!wrap) return;
    if (!url) { wrap.innerHTML = ''; return; }
    try {
      new URL(url);
      wrap.innerHTML = '<div class="lib-link-ok">🔗 Valid URL — '+_esc(url.length>60?url.slice(0,60)+'…':url)+'</div>';
    } catch(e) {
      wrap.innerHTML = '<div class="lib-link-ok lib-link-err">⚠ Invalid URL format</div>';
    }
  }

  /* ════════════════════════════════════════════════════
     UPLOAD FORM — TAG WIDGET
  ════════════════════════════════════════════════════ */
  function _handleTagKey(ev) {
    if (ev.key === 'Enter' || ev.key === ',') {
      ev.preventDefault();
      _addTag(ev.target.value.replace(/,$/,'').trim());
      ev.target.value = '';
    } else if (ev.key === 'Backspace' && !ev.target.value && _uploadTags.length) {
      _removeTagAt(_uploadTags.length - 1);
    }
  }

  function _handleTagInput(val) {
    if (val && val[val.length-1] === ',') {
      _addTag(val.slice(0,-1).trim());
      document.getElementById('lib-tag-input').value = '';
    }
  }

  function _addTag(val) {
    if (!val || _uploadTags.length >= 10) return;
    var tag = val.toLowerCase().replace(/[^a-z0-9\-_\s]/g,'').replace(/\s+/g,'-').slice(0,30);
    if (!tag || _uploadTags.indexOf(tag) !== -1) return;
    _uploadTags.push(tag);
    _refreshTagPills();
  }

  function _removeTagAt(idx) {
    _uploadTags.splice(idx, 1);
    _refreshTagPills();
  }

  function _refreshTagPills() {
    var wrap = document.getElementById('lib-tags-wrap');
    if (!wrap) return;
    var input = document.getElementById('lib-tag-input');
    var pills = wrap.querySelectorAll('.lib-tag-pill');
    Array.prototype.forEach.call(pills, function(p){ p.remove(); });
    _uploadTags.forEach(function(tag, i) {
      var pill = document.createElement('span');
      pill.className = 'lib-tag-pill';
      pill.innerHTML = _esc(tag) +
        '<button class="lib-tag-x" onclick="LibraryModule._removeTagAt('+i+')">×</button>';
      wrap.insertBefore(pill, input);
    });
  }

  /* ════════════════════════════════════════════════════
     DUPLICATE CHECK  (Appwrite Databases)
  ════════════════════════════════════════════════════ */
  function _checkDup(title, cb) {
    var awdb = _awDb();
    var uid  = _curUser() && _curUser().uid;
    if (!awdb || !uid) { cb(false); return; }
    awdb.listDocuments(
      _AW_DB_ID(),
      _AW_COL_ID(),
      [
        Appwrite.Query.equal('uploadedBy', uid),
        Appwrite.Query.equal('titleLower', title.toLowerCase().trim()),
        Appwrite.Query.limit(1)
      ]
    ).then(function(resp) {
      cb(resp.total > 0);
    }).catch(function() { cb(false); });
  }

  /* ════════════════════════════════════════════════════
     UPLOAD — SUBMIT
  ════════════════════════════════════════════════════ */
  function _submitUpload() {
    if (!_requireAuth()) return;

    var title    = (document.getElementById('lib-up-title')||{}).value.trim();
    var desc     = (document.getElementById('lib-up-desc')||{}).value.trim();
    var category = (document.getElementById('lib-up-category')||{}).value;
    var source   = (document.getElementById('lib-up-source')||{}).value.trim();
    var type     = (document.getElementById('lib-up-type')||{}).value;
    var linkUrl  = (document.getElementById('lib-up-link')||{}).value.trim();

    if (!title)    { _toast('Title is required','warning'); return; }
    if (!desc)     { _toast('Description is required','warning'); return; }
    if (!category) { _toast('Select a category','warning'); return; }
    if (!source)   { _toast('Source / publisher is required','warning'); return; }
    if (!_uploadTags.length) { _toast('Add at least one tag','warning'); return; }
    if (!type)     { _toast('Select a resource type','warning'); return; }
    if (type === 'link') {
      if (!linkUrl) { _toast('Enter a URL','warning'); return; }
      try { new URL(linkUrl); } catch(e) { _toast('Invalid URL format','error'); return; }
    } else {
      if (!_selectedFile) { _toast('Select a file to upload','warning'); return; }
    }

    _checkDup(title, function(isDup) {
      if (isDup) {
        _toast('You already submitted a resource with this title','warning');
        return;
      }
      _doUpload(title, desc, category, source, type, linkUrl);
    });
  }

  /* ════════════════════════════════════════════════════
     UPLOAD — EXECUTE  (Appwrite Storage + Databases)
  ════════════════════════════════════════════════════ */
  function _doUpload(title, desc, category, source, type, linkUrl) {
    var btn      = document.getElementById('lib-submit-btn');
    var progWrap = document.getElementById('lib-prog-wrap');
    var progBar  = document.getElementById('lib-prog-bar');
    var progLbl  = document.getElementById('lib-prog-lbl');
    if (btn)      { btn.disabled = true; btn.textContent = 'Uploading…'; }
    if (progWrap) progWrap.style.display = 'block';

    var fileId   = '';
    var fileName = '';
    var fileSize = 0;
    var awdb     = _awDb();
    var awst     = _awStor();
    var user     = _curUser();

    /* ── Create Appwrite document after file is (optionally) uploaded ── */
    function _saveDoc() {
      if (progLbl) progLbl.textContent = 'Saving metadata…';
      if (progBar) progBar.style.width = '95%';
      return awdb.createDocument(
        _AW_DB_ID(),
        _AW_COL_ID(),
        Appwrite.ID.unique(),
        {
          title:         title,
          titleLower:    title.toLowerCase().trim(),
          description:   desc,
          category:      category,
          tags:          _uploadTags.slice(),
          source:        source,
          fileType:      type,
          /* Appwrite file ID (empty for external links) */
          fileId:        fileId,
          externalLink:  type === 'link' ? linkUrl : '',
          fileName:      fileName,
          fileSize:      fileSize,
          uploadedBy:    user.uid,
          uploaderName:  user.displayName || user.email || 'Anonymous',
          /* ISO timestamp — _fmtDate() handles this via new Date(ts) path */
          createdAt:     new Date().toISOString(),
          /* Open publishing: authenticated uploads are immediately visible */
          status:        'approved',
          reviewNote:    '',
          bookmarkCount: 0,
          viewCount:     0,
          downloadCount: 0
        }
      );
    }

    function _onDone() {
      if (progBar) progBar.style.width = '100%';
      if (progLbl) progLbl.textContent = 'Published ✓';
      _toast('✓ Resource published', 'success', 4000);
      _resetUploadForm();
      LibraryModule.switchPanel('myuploads');
      if (btn) { btn.disabled = false; btn.textContent = '↑ SUBMIT FOR REVIEW'; }
      setTimeout(function(){
        if (progWrap) progWrap.style.display = 'none';
        if (progBar)  progBar.style.width = '0';
      }, 2200);
    }

    function _onErr(err) {
      console.error('[Library] upload err:', err);
      _toast('Upload failed — '+(err && err.message ? err.message : 'please try again'), 'error');
      if (btn) { btn.disabled = false; btn.textContent = '↑ SUBMIT FOR REVIEW'; }
      if (progWrap) progWrap.style.display = 'none';
    }

    if (type === 'link') {
      /* External links — skip file upload, save doc directly */
      _saveDoc().then(_onDone).catch(_onErr);
    } else {
      /* File upload → Appwrite Storage, then save metadata doc */
      if (!awst) {
        _toast('Storage not available — reload and try again', 'error');
        _onErr(new Error('No Appwrite Storage'));
        return;
      }
      if (progBar) progBar.style.width = '10%';
      if (progLbl) progLbl.textContent = 'Uploading…';

      /* Appwrite createFile() resolves when the upload completes.
         No progress events are available via the SDK; we advance the
         bar to 80 % on success to mirror the old Firebase progress UX. */
      awst.createFile(_AW_BKT_ID(), Appwrite.ID.unique(), _selectedFile)
        .then(function(fileDoc) {
          if (progBar) progBar.style.width = '80%';
          fileId   = fileDoc.$id;
          fileName = _selectedFile.name;
          fileSize = _selectedFile.size;
          return _saveDoc();
        })
        .then(_onDone)
        .catch(_onErr);
    }
  }

  function _resetUploadForm() {
    ['lib-up-title','lib-up-desc','lib-up-source','lib-up-link'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    var cat = document.getElementById('lib-up-category');
    var type = document.getElementById('lib-up-type');
    if (cat)  cat.selectedIndex  = 0;
    if (type) { type.selectedIndex = 0; _onTypeChange(''); }
    _uploadTags  = [];
    _selectedFile = null;
    var fpw = document.getElementById('lib-fp-wrap');
    if (fpw) fpw.innerHTML = '';
    var lpw = document.getElementById('lib-link-preview');
    if (lpw) lpw.innerHTML = '';
    _refreshTagPills();
    var fi = document.getElementById('lib-file-input');
    if (fi) fi.value = '';
  }


  /* ════════════════════════════════════════════════════
     RESEARCH SEARCH — PubMed + OpenAlex
  ════════════════════════════════════════════════════ */

  /* ── PubMed: search → fetch summaries ── */
  function _rsPubMedSearch(query, page, yearFrom, yearTo) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var retstart = (page - 1) * RS_PAGE_SIZE;
    var base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
    var searchUrl = base + 'esearch.fcgi?db=pubmed&retmode=json&retmax=' + RS_PAGE_SIZE +
      '&retstart=' + retstart +
      '&api_key=' + _getPubMedKey() +
      '&term=' + encodeURIComponent(query) +
      (yearFrom || yearTo
        ? '&datetype=pdat&mindate=' + (yearFrom || '1900') + '/01/01' +
          '&maxdate=' + (yearTo || new Date().getFullYear()) + '/12/31'
        : '');

    return fetch(searchUrl)
      .then(function(r){ return r.json(); })
      .then(function(data) {
        var ids = (data.esearchresult && data.esearchresult.idlist) || [];
        var total = parseInt((data.esearchresult && data.esearchresult.count) || 0, 10);
        if (!ids.length) return { results: [], total: total };

        var summaryUrl = base + 'esummary.fcgi?db=pubmed&retmode=json&api_key=' + _getPubMedKey() +
          '&id=' + ids.join(',');
        return fetch(summaryUrl)
          .then(function(r){ return r.json(); })
          .then(function(sd) {
            var uids = (sd.result && sd.result.uids) || [];
            var results = uids.map(function(uid) {
              var doc = sd.result[uid] || {};
              var authors = (doc.authors || []).slice(0,4).map(function(a){ return a.name; });
              if ((doc.authors||[]).length > 4) authors.push('et al.');
              return {
                _src:     'pubmed',
                id:       'pm_' + uid,
                pmid:     uid,
                title:    doc.title  || 'Untitled',
                authors:  authors.join(', '),
                journal:  (doc.source || ''),
                year:     (doc.pubdate || '').slice(0, 4),
                doi:      doc.elocationid ? doc.elocationid.replace(/^doi: /i,'') : '',
                abstract: '',   // fetched on expand
                openAccess: false,
                url:      'https://pubmed.ncbi.nlm.nih.gov/' + uid + '/'
              };
            });
            return { results: results, total: total };
          });
      });
  }

  /* ── PubMed: fetch abstract for a single PMID ── */
  function _rsPubMedAbstract(pmid, callback) {
    var url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?' +
      'db=pubmed&retmode=xml&rettype=abstract&api_key=' + _getPubMedKey() +
      '&id=' + pmid;
    fetch(url)
      .then(function(r){ return r.text(); })
      .then(function(xml) {
        var m = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
        callback(m ? m[1].replace(/<[^>]+>/g,'').trim() : '');
      })
      .catch(function(){ callback(''); });
  }

  /* ── OpenAlex: search ── */
  function _rsOASearch(query, page, yearFrom, yearTo, openAccess) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var filters = [];
    if (yearFrom)   filters.push('from_publication_date:' + yearFrom + '-01-01');
    if (yearTo)     filters.push('to_publication_date:' + yearTo + '-12-31');
    if (openAccess) filters.push('is_oa:true');

    var url = 'https://api.openalex.org/works?' +
      'search=' + encodeURIComponent(query) +
      '&page=' + page + '&per-page=' + RS_PAGE_SIZE +
      '&mailto=' + encodeURIComponent(RS_OPENALEX_MAILTO) +
      (filters.length ? '&filter=' + encodeURIComponent(filters.join(',')) : '');

    return fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(data) {
        var works = data.results || [];
        var total = (data.meta && data.meta.count) || 0;
        var results = works.map(function(w) {
          var authors = (w.authorships || []).slice(0,4).map(function(a){
            return a.author && a.author.display_name ? a.author.display_name : '';
          }).filter(Boolean);
          if ((w.authorships||[]).length > 4) authors.push('et al.');
          var journal = (w.primary_location && w.primary_location.source &&
                         w.primary_location.source.display_name) || '';
          var doi = (w.doi || '').replace('https://doi.org/','');
          var oaUrl = (w.primary_location && w.primary_location.pdf_url) ||
                      (w.open_access && w.open_access.oa_url) || '';
          return {
            _src:      'openalex',
            id:        'oa_' + (w.id || '').replace('https://openalex.org/',''),
            oaId:      w.id || '',
            title:     w.title || 'Untitled',
            authors:   authors.join(', '),
            journal:   journal,
            year:      w.publication_year ? String(w.publication_year) : '',
            doi:       doi,
            abstract:  w.abstract || '',
            openAccess: !!(w.open_access && w.open_access.is_oa),
            oaUrl:     oaUrl,
            citedBy:   w.cited_by_count || 0,
            url:       doi ? 'https://doi.org/' + doi : (w.id || '#')
          };
        });
        return { results: results, total: total };
      });
  }

  /* ── _rsSearch / pagination removed — replaced by _unifiedSearch / _loadMoreExternal ── */

  /* ═══════════════════════════════════════════════════════════════
     LAYER 2: CLINICAL GUIDELINES SEARCH
     Auto-searches PubMed, OpenAlex, Frontiers, and Elsevier (Scopus)
     — all filtered/boosted toward guidelines and systematic reviews.
     Results tagged GUIDELINE (green) or REVIEW (amber).
     Ranked: guideline > review > article.
  ═══════════════════════════════════════════════════════════════ */

  /* Detect issuing organisation from journal abbreviation */
  function _glDetectOrg(journal, fullJournal) {
    var j = ((journal || '') + ' ' + (fullJournal || '')).toLowerCase();
    if (j.indexOf('jpen') !== -1 || j.indexOf('parenter enteral') !== -1) return 'ASPEN';
    if (j.indexOf('nutr clin pract') !== -1)   return 'ASPEN';
    if (j.indexOf('clin nutr espen') !== -1)    return 'ESPEN';
    if (j.indexOf('clin nutr') !== -1)          return 'ESPEN';
    if (j.indexOf('kidney int suppl') !== -1)   return 'KDIGO';
    if (j.indexOf('kidney int') !== -1)         return 'KDIGO';
    if (j.indexOf('am j kidney') !== -1)        return 'KDOQI';
    if (j.indexOf('diabetes care') !== -1)      return 'ADA';
    if (j.indexOf('ca cancer') !== -1)          return 'ACS';
    if (j.indexOf('hum nutr diet') !== -1)      return 'BDA';
    if (j.indexOf('endocr pract') !== -1)       return 'AACE';
    if (j.indexOf('hepatol') !== -1)            return 'EASL';
    if (j.indexOf('gastroenterol') !== -1)      return 'ACG';
    if (j.indexOf('crit care med') !== -1)      return 'ESICM';
    if (j.indexOf('bulletin of the world health') !== -1 ||
        j.indexOf('who') !== -1 ||
        j.indexOf('world health organ') !== -1) return 'WHO';
    if (j.indexOf('food and agriculture') !== -1 ||
        j.indexOf('fao') !== -1 ||
        j.indexOf('agris') !== -1)              return 'FAO';
    if (j.indexOf('malawi') !== -1 ||
        j.indexOf('kamuzu') !== -1 ||
        j.indexOf('kuhes') !== -1 ||
        j.indexOf('qech') !== -1)               return 'MoH Malawi';
    return '';
  }

  /* ═══════════════════════════════════════════════════════════════
     LAYER 2: CLINICAL GUIDELINES — UNIFIED MULTI-SOURCE SEARCH
     Fires PubMed, OpenAlex, Frontiers, and Elsevier (Scopus) in
     parallel — all filtered/boosted toward guidelines and reviews.
     Results are merged, deduped within the batch, then ranked:
       guideline > review > article.
  ═══════════════════════════════════════════════════════════════ */

  /* ──────────────────────────────────────────────────────────────────────────
   * _glDSpaceSearch — generic DSpace 7 REST search helper.
   * Used for WHO IRIS and FAO OpenKnowledge (both run DSpace 7).
   * Base URL e.g. 'https://iris.who.int'  →  /server/api/discover/search/objects
   * orgTag: short label used for logging and result tagging ('WHO', 'FAO')
   * ────────────────────────────────────────────────────────────────────────── */
  function _glDSpaceSearch(baseUrl, orgTag, query, page) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var signal;
    try { signal = AbortSignal.timeout(12000); } catch(_) { /* Safari < 17 */ }
    var url = baseUrl + '/server/api/discover/search/objects?' +
      'query=' + encodeURIComponent(query) +
      '&size=' + GL_PAGE_SIZE +
      '&page=' + (page - 1) +   /* DSpace pages are 0-indexed */
      '&embed=item';
    var subKey = orgTag.toLowerCase();
    return fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal:  signal
    })
    .then(function(r) {
      if (r.status === 429) {
        console.error('[GL ' + orgTag + '] Rate-limit (429).');
        throw new Error(orgTag + '_RATE_LIMIT');
      }
      if (!r.ok) {
        console.error('[GL ' + orgTag + '] HTTP ' + r.status);
        throw new Error(orgTag + '_HTTP_' + r.status);
      }
      return r.json();
    })
    .then(function(data) {
      if (!data || typeof data !== 'object') {
        console.warn('[GL ' + orgTag + '] Empty or non-object response.');
        return { results: [], total: 0 };
      }
      var sr      = (data._embedded && data._embedded.searchResult) || {};
      var total   = (sr.page && sr.page.totalElements) || 0;
      var objects = (sr._embedded && sr._embedded.objects) || [];

      var results = objects.map(function(obj, i) {
        /* DSpace 7: item is at obj._embedded.indexableObject */
        var item   = (obj._embedded && obj._embedded.indexableObject) || {};
        var meta   = item.metadata || {};

        function first(key) {
          var v = meta[key];
          return (Array.isArray(v) && v[0]) ? (v[0].value || '') : '';
        }
        function all(key) {
          var v = meta[key];
          if (!Array.isArray(v)) return '';
          return v.map(function(m){ return m.value || ''; }).filter(Boolean).join(', ');
        }

        var title    = first('dc.title');
        var authors  = all('dc.contributor.author') || all('dc.creator');
        var rawDate  = first('dc.date.issued') || first('dc.date.available') || '';
        var year     = (rawDate.match(/\d{4}/) || [''])[0];
        var doi      = first('dc.identifier.doi').replace(/^https?:\/\/doi\.org\//i, '');
        var handle   = first('dc.identifier.uri') || first('dc.identifier') || '';
        var url_     = doi ? 'https://doi.org/' + doi : (handle || '');
        var abstract = first('dc.description.abstract');
        var journal  = first('prism:publicationName') || first('dc.relation.journal') || first('dc.source') || '';
        var docType  = first('dc.type');

        if (!title) return null;
        return {
          _src:       'guideline',
          _sub:       subKey,
          _pubType:   _glDetectPubType(title, docType),
          _org:       orgTag,
          id:         subKey + '_' + (item.uuid || (i + '_' + page)),
          pmid:       '',
          title:      title,
          authors:    authors,
          journal:    journal,
          year:       year,
          doi:        doi,
          abstract:   abstract,
          openAccess: true,   /* WHO / FAO repositories are open access */
          url:        url_
        };
      }).filter(Boolean);

      return { results: results, total: total };
    })
    .catch(function(err) {
      if (err && err.name === 'TimeoutError')
        console.error('[GL ' + orgTag + '] Request timed out.');
      else if (err && err.name === 'TypeError')
        console.error('[GL ' + orgTag + '] Network failure:', err.message);
      else if (err && err.message && err.message.indexOf(orgTag + '_') !== 0)
        console.error('[GL ' + orgTag + '] Unexpected error:', err);
      return { results: [], total: 0 };
    });
  }

  /* ── GL sub-source: WHO IRIS ────────────────────────────────────────────── */
  function _glWHOSearch(query, page) {
    return _glDSpaceSearch('https://iris.who.int', 'WHO', query, page);
  }

  /* ── GL sub-source: FAO OpenKnowledge ──────────────────────────────────── */
  function _glFAOSearch(query, page) {
    return _glDSpaceSearch('https://openknowledge.fao.org', 'FAO', query, page);
  }

  /* ── GL sub-source: Ministry of Health Malawi & Malawi institutions ─────
   * Uses OpenAlex filtered to Malawi (country_code:MW).  This surfaces MoH
   * Malawi, KUHES, QECH, COM, NHSRC, and other Malawian health bodies.
   * ────────────────────────────────────────────────────────────────────── */
  function _glMoHMalawiSearch(query, page) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var url = 'https://api.openalex.org/works?' +
      'search=' + encodeURIComponent(query) +
      '&filter=authorships.institutions.country_code:MW' +
      '&sort=cited_by_count:desc' +
      '&per-page=' + GL_PAGE_SIZE +
      '&page=' + page +
      '&mailto=' + RS_OPENALEX_MAILTO;
    return fetch(url)
      .then(function(r) {
        if (!r.ok) {
          console.error('[GL MoH Malawi] HTTP ' + r.status);
          throw new Error('MOH_HTTP_' + r.status);
        }
        return r.json();
      })
      .then(function(data) {
        var total = (data.meta && data.meta.count) || 0;
        var items = data.results || [];
        var results = items.map(function(w) {
          var doi     = (w.doi || '').replace(/^https?:\/\/doi\.org\//i, '');
          var authors = (w.authorships || []).slice(0, 4).map(function(a) {
            return a.author ? (a.author.display_name || '') : '';
          }).filter(Boolean);
          if ((w.authorships || []).length > 4) authors.push('et al.');
          var journal = (w.primary_location && w.primary_location.source &&
                         w.primary_location.source.display_name) || '';
          var url_    = doi ? 'https://doi.org/' + doi
                            : (w.primary_location && w.primary_location.landing_page_url) || '';
          /* Detect if any authoring institution is specifically MoH */
          var instNames = (w.authorships || []).reduce(function(acc, a) {
            return acc.concat((a.institutions || []).map(function(ins){ return (ins.display_name || '').toLowerCase(); }));
          }, []);
          var isMoH = instNames.some(function(n) {
            return n.indexOf('ministry of health') !== -1 ||
                   (n.indexOf('malawi') !== -1 && n.indexOf('national') !== -1);
          });
          var orgLabel = isMoH ? 'MoH Malawi'
                       : (instNames.some(function(n){ return n.indexOf('kamuzu') !== -1 || n.indexOf('kuhes') !== -1; }) ? 'KUHES'
                       : (instNames.some(function(n){ return n.indexOf('queen elizabeth') !== -1 || n.indexOf('qech') !== -1; }) ? 'QECH'
                       : 'Malawi'));
          return {
            _src:       'guideline',
            _sub:       'moh',
            _pubType:   _glDetectPubType(w.title, w.type),
            _org:       orgLabel,
            id:         'moh_' + (w.id || '').replace('https://openalex.org/', ''),
            pmid:       '',
            title:      w.title || 'Untitled',
            authors:    authors.join(', '),
            journal:    journal,
            year:       w.publication_year ? String(w.publication_year) : '',
            doi:        doi,
            abstract:   w.abstract || '',
            openAccess: !!(w.open_access && w.open_access.is_oa),
            url:        url_
          };
        });
        return { results: results, total: total };
      })
      .catch(function(err) {
        console.error('[GL MoH Malawi] Search failed:', err && (err.message || err));
        return { results: [], total: 0 };
      });
  }

  /* GL query boost terms — appended to user query for non-PubMed sources */
  var GL_BOOST_TERMS = 'guideline systematic review meta-analysis clinical practice consensus';

  /* Detect pub-type from title / subtype strings */
  function _glDetectPubType(title, subtype) {
    var t = ((title || '') + ' ' + (subtype || '')).toLowerCase();
    if (t.indexOf('guideline') !== -1 || t.indexOf('clinical practice') !== -1 ||
        t.indexOf('position statement') !== -1 || t.indexOf('consensus') !== -1) return 'guideline';
    if (t.indexOf('systematic review') !== -1 || t.indexOf('meta-analysis') !== -1 ||
        t.indexOf('review') !== -1) return 'review';
    return 'article';
  }

  /* Unified wrapper — fires all 7 sources in parallel */
  function _glUnifiedSearch(query, page) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    return Promise.all([
      _glPubMedSearch(query, page)
        .catch(function(){ return { results: [], total: 0 }; }),
      _glOASearch(query, page)
        .catch(function(){ return { results: [], total: 0 }; }),
      _glFrontiersGLSearch(query, page)
        .catch(function(){ return { results: [], total: 0 }; }),
      _glElsevierSearch(query, page)
        .catch(function(){ return { results: [], total: 0 }; }),
      _glWHOSearch(query, page)
        .catch(function(){ return { results: [], total: 0 }; }),
      _glFAOSearch(query, page)
        .catch(function(){ return { results: [], total: 0 }; }),
      _glMoHMalawiSearch(query, page)
        .catch(function(){ return { results: [], total: 0 }; })
    ]).then(function(arrs) {
      var combinedTotal = arrs.reduce(function(s, d){ return s + (d.total || 0); }, 0);
      var all = [].concat.apply([], arrs.map(function(d){ return d.results; }));
      /* Dedup within batch by DOI then title */
      var seenDois = {}, seenTitles = [];
      var merged = all.filter(function(r) {
        if (r.doi && seenDois[r.doi.toLowerCase()]) return false;
        if (r.doi) seenDois[r.doi.toLowerCase()] = true;
        var t = _normalizeTitle(r.title);
        if (seenTitles.some(function(st){ return _titleSimilarity(st, t) > 0.80; })) return false;
        seenTitles.push(t);
        return true;
      });
      /* Rank: guidelines first, reviews second, articles last */
      merged.sort(function(a, b) {
        var rank = { guideline: 0, review: 1, article: 2 };
        return (rank[a._pubType] || 2) - (rank[b._pubType] || 2);
      });
      return { results: merged, total: combinedTotal };
    });
  }

  /* ── GL sub-source: OpenAlex ── */
  function _glOASearch(query, page) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var boosted = query + ' ' + GL_BOOST_TERMS;
    var url = 'https://api.openalex.org/works?' +
      'search=' + encodeURIComponent(boosted) +
      '&filter=type:review' +
      '&sort=cited_by_count:desc' +
      '&per-page=' + GL_PAGE_SIZE +
      '&page=' + page +
      '&mailto=' + RS_OPENALEX_MAILTO;
    return fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(data) {
        var total = (data.meta && data.meta.count) || 0;
        var items = (data.results || []);
        var results = items.map(function(w) {
          var authors = (w.authorships || []).slice(0, 4).map(function(a){
            return a.author && (a.author.display_name || '');
          }).filter(Boolean);
          if ((w.authorships || []).length > 4) authors.push('et al.');
          var doi = (w.doi || '').replace(/^https?:\/\/doi\.org\//i, '');
          var journal = (w.primary_location && w.primary_location.source &&
            w.primary_location.source.display_name) || '';
          return {
            _src:      'guideline',
            _sub:      'openalex',
            _pubType:  _glDetectPubType(w.title, ''),
            _org:      _glDetectOrg(journal, journal),
            id:        'gl_oa_' + (w.id || '').replace('https://openalex.org/', ''),
            pmid:      '',
            title:     w.title || 'Untitled',
            authors:   authors.join(', '),
            journal:   journal,
            year:      w.publication_year ? String(w.publication_year) : '',
            doi:       doi,
            abstract:  w.abstract || '',
            openAccess: !!(w.open_access && w.open_access.is_oa),
            url:       doi ? 'https://doi.org/' + doi : (w.id || '#')
          };
        });
        return { results: results, total: total };
      });
  }

  /* ── GL sub-source: Frontiers ── */
  function _glFrontiersGLSearch(query, page) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var enhanced = query + ' ' + GL_BOOST_TERMS;
    return _rsFrontiersSearch(enhanced, page).then(function(data) {
      var results = data.results.map(function(r) {
        return Object.assign({}, r, {
          _src:     'guideline',
          _sub:     'frontiers',
          _pubType: _glDetectPubType(r.title, ''),
          _org:     _glDetectOrg(r.journal, r.journal),
          id:       'gl_fr_' + r.id
        });
      });
      return { results: results, total: data.total };
    });
  }

  /* ── GL sub-source: Elsevier Scopus ── */
  function _glElsevierSearch(query, page) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var start = (page - 1) * GL_PAGE_SIZE;
    var scopusQ = 'TITLE-ABS-KEY((' + query + ') AND (' +
      'guideline OR "systematic review" OR "meta-analysis" OR ' +
      '"clinical practice" OR consensus))';
    var url = RS_ELSEVIER_SCOPUS +
      '?query=' + encodeURIComponent(scopusQ) +
      '&count=' + GL_PAGE_SIZE +
      '&start=' + start +
      '&field=dc:title,dc:creator,prism:publicationName,prism:coverDate,' +
             'prism:doi,prism:url,dc:description,openaccess,subtype,subtypeDescription,eid';
    return _elsFetch(url, { 'X-ELS-APIKey': _getElsevierKey(), 'Accept': 'application/json' }, 'GL-Scopus')
    .then(function(data) {
      var sr    = (data && data['search-results']) || {};
      var total = parseInt(sr['opensearch:totalResults'] || '0', 10) || 0;
      var rawEntry = sr.entry;
      var items = Array.isArray(rawEntry) ? rawEntry : (rawEntry ? [rawEntry] : []);
      var results = items.map(function(e, i) {
        var doi = (e['prism:doi'] || '').replace(/^https?:\/\/doi\.org\//i, '');
        var url = _elsHumanUrl(e['prism:url'] || '', doi);
        var year = '';
        var m = String(e['prism:coverDate'] || '').match(/\d{4}/);
        if (m) year = m[0];
        var journal = e['prism:publicationName'] || '';
        return {
          _src:      'guideline',
          _sub:      'elsevier',
          _pubType:  _glDetectPubType(e['dc:title'], e['subtypeDescription']),
          _org:      _glDetectOrg(journal, journal),
          id:        'gl_el_' + (e['eid'] || i + '_' + page),
          pmid:      '',
          title:     e['dc:title'] || 'Untitled',
          authors:   e['dc:creator'] || '',
          journal:   journal,
          year:      year,
          doi:       doi,
          abstract:  e['dc:description'] || '',
          openAccess: e['openaccess'] === '1' || e['openaccess'] === 1,
          url:       url
        };
      });
      return { results: results, total: total };
    })
    .catch(function(err) {
      console.error('[ELS GL-Scopus] Guideline search failed:', err && (err.message || err));
      return { results: [], total: 0 };
    });
  }

  /* PubMed search scoped to guideline orgs + guideline/review pub-types */
  function _glPubMedSearch(query, page) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var retstart = (page - 1) * GL_PAGE_SIZE;
    var base     = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
    var fullTerm = '(' + query + ') AND ' + GL_PT_FILTER + ' AND (' + GL_ORG_FILTER + ')';
    var searchUrl = base + 'esearch.fcgi?db=pubmed&retmode=json&retmax=' + GL_PAGE_SIZE +
      '&retstart=' + retstart + '&api_key=' + _getPubMedKey() +
      '&term=' + encodeURIComponent(fullTerm);

    return fetch(searchUrl)
      .then(function(r){ return r.json(); })
      .then(function(data) {
        var ids   = (data.esearchresult && data.esearchresult.idlist) || [];
        var total = parseInt((data.esearchresult && data.esearchresult.count) || 0, 10);
        if (!ids.length) return { results: [], total: total };

        var summaryUrl = base + 'esummary.fcgi?db=pubmed&retmode=json&api_key=' + _getPubMedKey() +
          '&id=' + ids.join(',');
        return fetch(summaryUrl)
          .then(function(r){ return r.json(); })
          .then(function(sd) {
            var uids = (sd.result && sd.result.uids) || [];
            var results = uids.map(function(uid) {
              var doc     = sd.result[uid] || {};
              var authors = (doc.authors || []).slice(0,4).map(function(a){ return a.name; });
              if ((doc.authors||[]).length > 4) authors.push('et al.');
              var pubTypes    = (doc.pubtype || []).map(function(t){ return t.toLowerCase(); });
              var isGuideline = pubTypes.some(function(t){ return t.indexOf('guideline') !== -1; });
              var isReview    = pubTypes.some(function(t){
                return t.indexOf('review') !== -1 || t.indexOf('meta-analysis') !== -1;
              });
              var journal = doc.source || '';
              return {
                _src:     'guideline',
                _pubType: isGuideline ? 'guideline' : (isReview ? 'review' : 'article'),
                _org:     _glDetectOrg(journal, doc.fulljournalname || ''),
                id:       'gl_' + uid,
                pmid:     uid,
                title:    doc.title  || 'Untitled',
                authors:  authors.join(', '),
                journal:  journal,
                year:     (doc.pubdate || '').slice(0, 4),
                doi:      doc.elocationid ? doc.elocationid.replace(/^doi: /i,'') : '',
                abstract: '',
                url:      'https://pubmed.ncbi.nlm.nih.gov/' + uid + '/'
              };
            });
            // Rank: guidelines first, reviews second, articles last
            results.sort(function(a, b) {
              var rank = { guideline: 0, review: 1, article: 2 };
              return (rank[a._pubType] || 2) - (rank[b._pubType] || 2);
            });
            return { results: results, total: total };
          });
      });
  }

  /* Deduplicate GL results against local Oasis Library */
  function _deduplicateGL(candidates) {
    var localTitles = _resources.map(function(r){ return _normalizeTitle(r.title); });
    var localDois   = {};
    _resources.forEach(function(r){ if (r.doi) localDois[r.doi] = true; });
    return candidates.filter(function(c) {
      if (c.doi && localDois[c.doi]) return false;
      var cTitle = _normalizeTitle(c.title);
      if (localTitles.some(function(lt){ return _titleSimilarity(lt, cTitle) > 0.80; })) return false;
      return true;
    });
  }

  /* Layer 2 result card — GUIDELINE (green) / REVIEW (amber) / ARTICLE badges */
  function _glCardHTML(r, idx) {
    var typeLabel = r._pubType === 'guideline' ? 'GUIDELINE'
                  : r._pubType === 'review'    ? 'REVIEW'
                  : 'ARTICLE';
    var typeCls   = r._pubType === 'guideline' ? 'rs-badge-guideline'
                  : r._pubType === 'review'    ? 'rs-badge-review'
                  : 'rs-badge-openalex';
    var typeBadge = '<span class="rs-source-badge ' + typeCls + '">' + typeLabel + '</span>';
    var orgBadge  = r._org
      ? '<span class="rs-org-badge">' + _esc(r._org) + '</span>'
      : '';
    /* Sub-source badge — shown for non-PubMed GL results */
    var subLabels = { openalex: 'OpenAlex', frontiers: 'Frontiers', elsevier: 'Scopus', who: 'WHO IRIS', fao: 'FAO', moh: 'Malawi' };
    var subCls    = { openalex: 'rs-badge-openalex', frontiers: 'rs-badge-frontiers', elsevier: 'rs-badge-scopus', who: 'rs-badge-who', fao: 'rs-badge-fao', moh: 'rs-badge-moh' };
    var subBadge  = (r._sub && subLabels[r._sub])
      ? '<span class="rs-source-badge ' + (subCls[r._sub] || '') + '" style="opacity:.75">' +
          subLabels[r._sub] + '</span>'
      : '';

    var actBtns = '<a class="rs-act-btn primary" href="' + _esc(r.url) + '" ' +
      'target="_blank" rel="noopener noreferrer">View Guideline ↗</a>';
    if (r.doi) {
      actBtns += '<a class="rs-act-btn" href="https://doi.org/' + _esc(r.doi) + '" ' +
        'target="_blank" rel="noopener noreferrer">DOI ↗</a>';
    }
    actBtns += '<button class="rs-act-btn" onclick="LibraryModule.glCopyRef(' + idx + ')" ' +
      'title="Copy citation">📋 Cite</button>';

    var hasAbstract  = !!r.abstract;
    var abstractHtml = hasAbstract
      ? '<div class="rs-result-abstract" id="gl-abs-' + idx + '">' + _esc(r.abstract) + '</div>' +
        '<button class="rs-act-btn" style="font-size:8.5px;padding:3px 8px" ' +
          'onclick="LibraryModule.glToggleAbstract(' + idx + ',\'' + r.pmid + '\')">Show more</button>'
      : '<button class="rs-act-btn" style="font-size:8.5px;padding:3px 8px" ' +
          'onclick="LibraryModule.glToggleAbstract(' + idx + ',\'' + r.pmid + '\')">Load abstract</button>';

    return '<div class="rs-result" id="gl-card-' + idx + '">' +
      '<div class="rs-result-title">'    + _esc(r.title)   + '</div>' +
      (r.authors ? '<div class="rs-result-authors">' + _esc(r.authors) + '</div>' : '') +
      '<div class="rs-result-meta">' +
        typeBadge + orgBadge +
        (r.journal ? '<span class="rs-result-journal" title="' + _esc(r.journal) + '">' + _esc(r.journal) + '</span>' : '') +
        (r.year    ? '<span class="rs-result-year">'    + _esc(r.year)    + '</span>' : '') +
      '</div>' +
      abstractHtml +
      '<div class="rs-result-acts">' + actBtns + '</div>' +
    '</div>';
  }

  /* Toggle / lazy-load abstract for a Layer 2 card */
  function _glToggleAbstract(idx, pmid) {
    var absEl = document.getElementById('gl-abs-' + idx);
    var r     = _bgGLResults[idx];
    if (!absEl) {
      var card = document.getElementById('gl-card-' + idx);
      if (!card) return;
      var actsDiv = card.querySelector('.rs-result-acts');
      var newAbs  = document.createElement('div');
      newAbs.id        = 'gl-abs-' + idx;
      newAbs.className = 'rs-result-abstract';
      newAbs.textContent = 'Loading abstract…';
      card.insertBefore(newAbs, actsDiv || null);
      absEl = newAbs;
      if (pmid && r && !r.abstract) {
        _rsPubMedAbstract(pmid, function(text) {
          if (r) r.abstract = text;
          absEl.textContent = text || 'No abstract available.';
        });
      } else if (r && r.abstract) {
        absEl.textContent = r.abstract;
      } else {
        absEl.textContent = 'No abstract available.';
      }
      return;
    }
    var btn      = absEl.nextElementSibling;
    var expanded = absEl.classList.toggle('expanded');
    if (btn && btn.tagName === 'BUTTON') btn.textContent = expanded ? 'Show less' : 'Show more';
  }

  /* Copy APA-style citation for a Layer 2 guideline result */
  function _glCopyRef(idx) {
    var r = _bgGLResults[idx];
    if (!r) return;
    var cit = (r.authors || 'Unknown') + '. ' + (r.title || '') + '. ' +
      (r.journal ? r.journal + '. ' : '') +
      (r.year    ? r.year    + '. '  : '') +
      (r.doi     ? 'doi:' + r.doi   : r.url || '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cit)
        .then(function(){ _toast('Citation copied!','success'); })
        .catch(function(){ _toast('Could not copy','warning'); });
    } else {
      _toast('Clipboard not supported','info');
    }
  }

  /* ════════════════════════════════════════════════════
     LAYER 3: FRONTIERS IN RESEARCH SEARCH API
     Base: https://search-api.frontiersin.org/api/V1
     Auth: X-ELS-APIKey header (Elsevier-registered key)
  ════════════════════════════════════════════════════ */

  /**
   * Search the Frontiers Search API V1.
   * Robust parsing handles multiple possible response shapes.
   */
  function _rsFrontiersSearch(query, page) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var offset = (page - 1) * RS_FRONTIERS_SIZE;
    var url = RS_FRONTIERS_BASE + '/search?' +
      'query=' + encodeURIComponent(query) +
      '&limit=' + RS_FRONTIERS_SIZE +
      '&offset=' + offset;

    return fetch(url, {
      headers: {
        'X-ELS-APIKey': _getFrontiersKey(),
        'Accept':       'application/json'
      }
    })
    .then(function(r) {
      if (!r.ok) throw new Error('Frontiers API ' + r.status);
      return r.json();
    })
    .then(function(data) {
      /* ── Normalise response — multiple possible shapes ── */
      var rawItems = [];
      var total    = 0;

      if (data && data.hits && Array.isArray(data.hits.hits)) {
        // Shape A: Elasticsearch-style { hits: { total, hits: [...] } }
        rawItems = data.hits.hits;
        total    = (typeof data.hits.total === 'object')
          ? (data.hits.total.value || 0)
          : (data.hits.total || 0);
      } else if (data && Array.isArray(data.results)) {
        // Shape B: { results: [...], total: n }
        rawItems = data.results;
        total    = data.total || rawItems.length;
      } else if (data && data.data && Array.isArray(data.data.results)) {
        // Shape C: { data: { results: [...], total: n } }
        rawItems = data.data.results;
        total    = data.data.total || rawItems.length;
      } else if (Array.isArray(data)) {
        // Shape D: bare array
        rawItems = data;
        total    = rawItems.length;
      }

      var results = rawItems.map(function(item, i) {
        /* source may be nested under _source (Elasticsearch) or flat */
        var src = (item._source || item);

        /* ── Authors ── */
        var rawAuthors = src.authors || src.author || [];
        var authors = [];
        if (Array.isArray(rawAuthors)) {
          authors = rawAuthors.slice(0, 4).map(function(a) {
            return typeof a === 'string' ? a : (a.name || a.displayName || a.full_name || '');
          }).filter(Boolean);
          if (rawAuthors.length > 4) authors.push('et al.');
        } else if (typeof rawAuthors === 'string') {
          authors = [rawAuthors];
        }

        /* ── Journal ── */
        var journal = src.journal || src.journalName || src.journal_name ||
          (src.journal_abbr) || '';
        if (journal && typeof journal === 'object') {
          journal = journal.name || journal.title || '';
        }

        /* ── Year ── */
        var year = '';
        var pubDate = src.publicationDate || src.published || src.date ||
          src.publication_date || src.publishedDate || '';
        if (pubDate) {
          var m = String(pubDate).match(/\d{4}/);
          if (m) year = m[0];
        }

        /* ── DOI ── */
        var doi = (src.doi || src.DOI || '').replace(/^https?:\/\/doi\.org\//i, '');

        /* ── URL ── */
        var articleUrl = src.url || src.articleUrl || src.article_url ||
          src.frontiers_url || src.link || '';
        if (!articleUrl && doi) {
          articleUrl = 'https://doi.org/' + doi;
        }
        if (!articleUrl) {
          articleUrl = 'https://www.frontiersin.org/search?query=' +
            encodeURIComponent(src.title || query);
        }

        /* ── Abstract ── */
        var abstract = src.abstract || src.abstractText || src.abstract_text || '';

        /* ── Open Access — Frontiers is fully open access ── */
        var oa = src.isOpenAccess !== undefined ? !!src.isOpenAccess : true;

        return {
          _src:       'frontiers',
          id:         'fr_' + (src.id || src.articleId || src.pmid || i + '_' + page),
          title:      src.title || 'Untitled',
          authors:    authors.join(', '),
          journal:    journal,
          year:       year,
          doi:        doi,
          abstract:   abstract,
          openAccess: oa,
          url:        articleUrl
        };
      });

      return { results: results, total: total };
    });
  }

  /* Deduplicate Frontiers results against local library + GL results */
  function _deduplicateFR(candidates) {
    var localTitles = _resources.map(function(r){ return _normalizeTitle(r.title); });
    var localDois   = {};
    _resources.forEach(function(r){ if (r.doi) localDois[r.doi] = true; });
    var glTitles = _bgGLResults.map(function(r){ return _normalizeTitle(r.title); });
    var existingIds = {};
    _bgFRResults.forEach(function(r){ existingIds[r.id] = true; });
    var existingTitles = _bgFRResults.map(function(r){ return _normalizeTitle(r.title); });

    return candidates.filter(function(c) {
      if (existingIds[c.id]) return false;
      var cTitle = _normalizeTitle(c.title);
      if (c.doi && localDois[c.doi]) return false;
      if (localTitles.some(function(lt){ return _titleSimilarity(lt, cTitle) > 0.80; })) return false;
      if (existingTitles.some(function(et){ return _titleSimilarity(et, cTitle) > 0.80; })) return false;
      if (glTitles.some(function(gt){ return _titleSimilarity(gt, cTitle) > 0.80; })) return false;
      return true;
    });
  }

  /* ── Frontiers result card ── */
  function _frCardHTML(r, idx) {
    var srcBadge = '<span class="rs-source-badge rs-badge-frontiers">Frontiers</span>';
    var oaBadge  = r.openAccess ? '<span class="rs-oa-badge">🔓 Open Access</span>' : '';

    var actBtns = '<a class="rs-act-btn primary" href="' + _esc(r.url) + '" ' +
      'target="_blank" rel="noopener noreferrer">View Article ↗</a>';
    if (r.doi) {
      actBtns += '<a class="rs-act-btn" href="https://doi.org/' + _esc(r.doi) + '" ' +
        'target="_blank" rel="noopener noreferrer">DOI ↗</a>';
    }
    actBtns += '<button class="rs-act-btn" onclick="LibraryModule.frCopyRef(' + idx + ')" ' +
      'title="Copy citation">📋 Cite</button>';

    var hasAbstract  = !!r.abstract;
    var abstractHtml = hasAbstract
      ? '<div class="rs-result-abstract" id="fr-abs-' + idx + '">' + _esc(r.abstract) + '</div>' +
        '<button class="rs-act-btn" style="font-size:8.5px;padding:3px 8px" ' +
          'onclick="LibraryModule.frToggleAbstract(' + idx + ')">Show more</button>'
      : '';

    return '<div class="rs-result" id="fr-card-' + idx + '">' +
      '<div class="rs-result-title">'    + _esc(r.title)   + '</div>' +
      (r.authors ? '<div class="rs-result-authors">' + _esc(r.authors) + '</div>' : '') +
      '<div class="rs-result-meta">' +
        oaBadge +
        (r.journal ? '<span class="rs-result-journal" title="' + _esc(r.journal) + '">' + _esc(r.journal) + '</span>' : '') +
        (r.year    ? '<span class="rs-result-year">'    + _esc(r.year)    + '</span>' : '') +
      '</div>' +
      abstractHtml +
      '<div class="rs-result-acts">' + actBtns + '</div>' +
    '</div>';
  }

  /* Toggle abstract for Frontiers card */
  function _frToggleAbstract(idx) {
    var absEl = document.getElementById('fr-abs-' + idx);
    if (!absEl) return;
    var btn     = absEl.nextElementSibling;
    var expanded = absEl.classList.toggle('expanded');
    if (btn && btn.tagName === 'BUTTON') btn.textContent = expanded ? 'Show less' : 'Show more';
  }

  /* Copy APA-style citation for a Frontiers result */
  function _frCopyRef(idx) {
    var r = _bgFRResults[idx];
    if (!r) return;
    var cit = (r.authors || 'Unknown') + '. ' + (r.title || '') + '. ' +
      (r.journal ? r.journal + '. ' : '') +
      (r.year    ? r.year    + '. '  : '') +
      (r.doi     ? 'doi:' + r.doi   : r.url || '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cit)
        .then(function(){ _toast('Citation copied!', 'success'); })
        .catch(function(){ _toast('Could not copy', 'warning'); });
    } else {
      _toast('Clipboard not supported', 'info');
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * _elsFetch — shared Elsevier fetch wrapper used by every Scopus /
   * ScienceDirect request.  Guarantees:
   *   • X-ELS-APIKey + Accept:application/json on every call (caller supplies)
   *   • 12-second AbortSignal timeout
   *   • Detects XML responses (Elsevier returns XML on bad keys / quota)
   *     and converts them safely via DOMParser before returning a stub
   *   • Dedicated handling for 429 (rate-limit), 401/403 (auth), 400 (bad ID)
   *   • Full error logging to console for every failure path
   *   • Guards empty / undefined response objects before returning
   * ────────────────────────────────────────────────────────────────────────── */
  /* ── Sanitize a raw Elsevier API URL into a human-facing article URL ──────
   * prism:url from Scopus returns api.elsevier.com/content/abstract/scopus_id/…
   * which browsers open as raw XML.  Convert these to the Scopus record viewer
   * and fall back to doi.org when a DOI is available.
   * ────────────────────────────────────────────────────────────────────────── */
  function _elsHumanUrl(rawUrl, doi) {
    if (!rawUrl && !doi) return '';
    /* Prefer DOI link as it always resolves to the publisher's landing page */
    if (doi) return 'https://doi.org/' + doi;
    /* If the URL is already a human-facing page (ScienceDirect, Scopus, DOI), keep it */
    if (/^https?:\/\/(www\.)?(sciencedirect|scopus|doi)\.org\//i.test(rawUrl)) return rawUrl;
    /* Convert api.elsevier.com/content/abstract/scopus_id/<ID> → Scopus record */
    var sidMatch = rawUrl.match(/content\/abstract\/scopus_id\/(\d+)/i);
    if (sidMatch) return 'https://www.scopus.com/record/display.uri?eid=2-s2.0-' + sidMatch[1] + '&origin=inward';
    /* Convert api.elsevier.com/content/article/pii/<PII> → ScienceDirect article */
    var piiMatch = rawUrl.match(/content\/article\/pii\/([A-Z0-9]+)/i);
    if (piiMatch) return 'https://www.sciencedirect.com/science/article/pii/' + piiMatch[1];
    /* Last resort: keep the raw URL (may still be useful) */
    return rawUrl;
  }

  /* ── Parse an Elsevier XML response body into a normalised article object ─
   * Used as fallback when the server ignores Accept:application/json.
   * Handles both search-results XML and abstract-retrieval-response XML.
   * ────────────────────────────────────────────────────────────────────────── */
  function _parseElsXML(xml, source) {
    try {
      var parser = new DOMParser();
      var doc    = parser.parseFromString(xml, 'application/xml');
      /* ── Search-results response ── */
      var totalEl = doc.querySelector('totalResults');
      if (totalEl) {
        var total = parseInt(totalEl.textContent, 10) || 0;
        var entries = Array.from(doc.querySelectorAll('entry'));
        var items = entries.map(function(e) {
          var getText = function(sel) {
            var el = e.querySelector(sel); return el ? el.textContent.trim() : '';
          };
          var doi = getText('doi').replace(/^https?:\/\/doi\.org\//i, '');
          var rawUrl = getText('url') || getText('prism\\:url') || '';
          return {
            'dc:title':              getText('title') || getText('dc\\:title'),
            'dc:creator':            getText('creator') || getText('dc\\:creator'),
            'prism:publicationName': getText('publicationName') || getText('prism\\:publicationName'),
            'prism:coverDate':       getText('coverDate') || getText('prism\\:coverDate'),
            'prism:doi':             doi,
            'prism:url':             _elsHumanUrl(rawUrl, doi),
            'dc:description':        getText('description') || getText('dc\\:description'),
            'openaccess':            getText('openaccess'),
            'citedby-count':         getText('citedby-count'),
            'eid':                   getText('eid')
          };
        });
        return { 'search-results': { 'opensearch:totalResults': String(total), entry: items } };
      }
      /* ── Abstract retrieval response (single article) ── */
      var coredata = doc.querySelector('coredata');
      if (coredata) {
        var get = function(sel) {
          var el = coredata.querySelector(sel); return el ? el.textContent.trim() : '';
        };
        var doi = get('doi').replace(/^https?:\/\/doi\.org\//i, '');
        return {
          'abstracts-retrieval-response': {
            coredata: {
              'dc:title':              get('title') || get('dc\\:title'),
              'dc:creator':            get('creator') || get('dc\\:creator'),
              'prism:publicationName': get('publicationName') || get('prism\\:publicationName'),
              'prism:coverDate':       get('coverDate') || get('prism\\:coverDate'),
              'prism:doi':             doi,
              'dc:description':        get('description') || get('dc\\:description') ||
                                       get('abstract') || get('Abstract'),
              'openaccess':            get('openaccess'),
              'citedby-count':         get('citedby-count'),
              'eid':                   get('eid'),
              'prism:url':             _elsHumanUrl('', doi)
            }
          }
        };
      }
      console.warn('[ELS ' + source + '] XML response has unrecognised structure; returning empty.');
      return {};
    } catch(xmlErr) {
      console.error('[ELS ' + source + '] DOMParser XML conversion failed:', xmlErr);
      return {};
    }
  }

  function _elsFetch(url, headers, source) {
    /* ── Always append httpAccept=application/json so the server returns JSON
       even when a proxy or CDN strips the Accept request header ── */
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    var fetchUrl = url + sep + 'httpAccept=application%2Fjson';

    /* Ensure Accept header is always set (caller may supply its own copy) */
    var hdrs = Object.assign({ 'Accept': 'application/json' }, headers);

    var signal;
    try { signal = AbortSignal.timeout(12000); } catch(_) { /* older Safari */ }
    var opts = signal ? { headers: hdrs, signal: signal } : { headers: hdrs };

    return fetch(fetchUrl, opts)
      .then(function(r) {
        var ct = (r.headers.get('Content-Type') || '').toLowerCase();
        var isXML = ct.indexOf('xml') !== -1;

        /* ── Rate limit ── */
        if (r.status === 429) {
          var reset = r.headers.get('X-RateLimit-Reset') || r.headers.get('Retry-After') || 'unknown';
          console.error('[ELS ' + source + '] Rate-limit hit (429). X-RateLimit-Reset:', reset);
          throw new Error('ELS_RATE_LIMIT');
        }

        /* ── Auth / API key problems ── */
        if (r.status === 401 || r.status === 403) {
          console.error('[ELS ' + source + '] Auth error (' + r.status + '): verify elsevier_api_key in Remote Config has Scopus entitlement.');
          throw new Error('ELS_AUTH_' + r.status);
        }

        /* ── Bad request — often an invalid Scopus ID or malformed query ── */
        if (r.status === 400) {
          return r.text().then(function(body) {
            console.error('[ELS ' + source + '] Bad request (400) — possible invalid Scopus ID or query syntax. Body:', body.slice(0, 400));
            throw new Error('ELS_BAD_REQUEST');
          });
        }

        /* ── Any other non-2xx ── */
        if (!r.ok) {
          return r.text().then(function(body) {
            console.error('[ELS ' + source + '] HTTP', r.status, 'error. Body:', body.slice(0, 400));
            throw new Error('ELS_HTTP_' + r.status);
          });
        }

        /* ── XML body — server ignored Accept/httpAccept; parse gracefully ── */
        if (isXML) {
          return r.text().then(function(xml) {
            console.warn('[ELS ' + source + '] Received XML despite JSON request (check API key/quota). Attempting XML parse.');
            return _parseElsXML(xml, source);
          });
        }

        /* ── Sniff: sometimes Content-Type is wrong; detect XML by body start ── */
        return r.text().then(function(body) {
          var trimmed = body.trimStart();
          if (trimmed.charAt(0) === '<') {
            console.warn('[ELS ' + source + '] Response body is XML despite non-XML Content-Type. Attempting XML parse.');
            return _parseElsXML(trimmed, source);
          }
          try {
            var data = JSON.parse(body);
            if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
              console.warn('[ELS ' + source + '] Received empty JSON response.');
              return {};
            }
            return data;
          } catch(parseErr) {
            console.error('[ELS ' + source + '] Failed to parse response as JSON:', parseErr, 'Body snippet:', body.slice(0, 200));
            return {};
          }
        });
      })
      .catch(function(err) {
        /* Network-level failures (offline, DNS, CORS, timeout) */
        if (err && err.name === 'TimeoutError') {
          console.error('[ELS ' + source + '] Request timed out after 12 s.');
        } else if (err && err.name === 'AbortError') {
          console.error('[ELS ' + source + '] Request aborted (timeout or manual cancel).');
        } else if (err && err.name === 'TypeError') {
          console.error('[ELS ' + source + '] Network failure (offline / CORS / DNS):', err.message);
        } else if (err && err.message && err.message.slice(0, 4) !== 'ELS_') {
          /* Re-log anything not already logged above */
          console.error('[ELS ' + source + '] Unexpected error:', err);
        }
        throw err; /* propagate so callers can return their safe fallback */
      });
  }

  /* ── Fetch abstract for a single Scopus ID via the Abstract Retrieval API ─
   * Falls back to an empty string on any error so the card still renders.
   * ────────────────────────────────────────────────────────────────────────── */
  function _elsAbstractFetch(scopusId, callback) {
    if (!scopusId) { callback(''); return; }
    var url  = RS_ELSEVIER_ABSTRACT + encodeURIComponent(scopusId);
    var hdrs = { 'X-ELS-APIKey': _getElsevierKey(), 'Accept': 'application/json' };
    _elsFetch(url, hdrs, 'AbstractRetrieval')
      .then(function(data) {
        /* JSON path */
        var core = (data && data['abstracts-retrieval-response'] && data['abstracts-retrieval-response'].coredata) || {};
        var abstract = core['dc:description'] || core['abstract'] || '';
        callback(abstract);
      })
      .catch(function() { callback(''); });
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * Layer 3b: Elsevier — searches both Scopus and ScienceDirect in parallel,
   * normalises their responses, tags each result by sub-source, and merges
   * into one unified feed.  No UI selection required — always auto-queries.
   * ────────────────────────────────────────────────────────────────────────── */
  function _rsElsevierSearch(query, page) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var start = (page - 1) * RS_ELSEVIER_SIZE;
    var headers = {
      'X-ELS-APIKey': _getElsevierKey(),
      'Accept':       'application/json'
    };

    /* ── Scopus ── */
    var scopusUrl = RS_ELSEVIER_SCOPUS +
      '?query=TITLE-ABS-KEY(' + encodeURIComponent(query) + ')' +
      '&count=' + RS_ELSEVIER_SIZE +
      '&start=' + start +
      '&field=dc:title,dc:creator,prism:publicationName,prism:coverDate,prism:doi,prism:url,dc:description,openaccess,citedby-count,eid';

    var scopusPromise = _elsFetch(scopusUrl, headers, 'Scopus')
      .then(function(data) {
        var sr     = (data && data['search-results']) || {};
        var total  = parseInt(sr['opensearch:totalResults'] || '0', 10) || 0;
        var rawEntry = sr.entry;
        var items  = Array.isArray(rawEntry) ? rawEntry : (rawEntry ? [rawEntry] : []);
        var results = items.map(function(e, i) {
          var doi = (e['prism:doi'] || '').replace(/^https?:\/\/doi\.org\//i, '');
          var url = _elsHumanUrl(e['prism:url'] || '', doi);
          var year = '';
          var d = e['prism:coverDate'] || '';
          var m = String(d).match(/\d{4}/);
          if (m) year = m[0];
          /* Extract Scopus ID from eid (format: 2-s2.0-<number>) for lazy abstract fetch */
          var eid = e['eid'] || '';
          var scopusIdMatch = eid.match(/2-s2\.0-(\d+)/);
          var scopusId = scopusIdMatch ? scopusIdMatch[1] : '';
          return {
            _src:      'elsevier',
            _sub:      'scopus',
            _scopusId: scopusId,
            id:        'el_sc_' + (eid || i + '_' + page),
            title:     e['dc:title'] || 'Untitled',
            authors:   e['dc:creator'] || '',
            journal:   e['prism:publicationName'] || '',
            year:      year,
            doi:       doi,
            abstract:  e['dc:description'] || '',
            openAccess: e['openaccess'] === '1' || e['openaccess'] === 1,
            cited:     e['citedby-count'] || '',
            url:       url
          };
        });
        return { results: results, total: total };
      })
      .catch(function(err) {
        console.error('[ELS Scopus] Layer 3b search failed:', err && (err.message || err));
        return { results: [], total: 0 };
      });

    /* ── ScienceDirect ── */
    var sdUrl = RS_ELSEVIER_SD +
      '?query=' + encodeURIComponent(query) +
      '&count=' + RS_ELSEVIER_SIZE +
      '&start=' + start +
      '&field=dc:title,dc:creator,prism:publicationName,prism:coverDate,prism:doi,prism:url,dc:description,openaccess';

    var sdPromise = _elsFetch(sdUrl, headers, 'ScienceDirect')
      .then(function(data) {
        var sr    = (data && data['search-results']) || {};
        var total = parseInt(sr['opensearch:totalResults'] || '0', 10) || 0;
        var rawEntry = sr.entry;
        var items = Array.isArray(rawEntry) ? rawEntry : (rawEntry ? [rawEntry] : []);
        var results = items.map(function(e, i) {
          var doi = (e['prism:doi'] || '').replace(/^https?:\/\/doi\.org\//i, '');
          var url = _elsHumanUrl(e['prism:url'] || '', doi);
          var year = '';
          var d = e['prism:coverDate'] || '';
          var m = String(d).match(/\d{4}/);
          if (m) year = m[0];
          return {
            _src:      'elsevier',
            _sub:      'sciencedirect',
            id:        'el_sd_' + (e['eid'] || e['dc:identifier'] || i + '_' + page),
            title:     e['dc:title'] || 'Untitled',
            authors:   e['dc:creator'] || '',
            journal:   e['prism:publicationName'] || '',
            year:      year,
            doi:       doi,
            abstract:  e['dc:description'] || '',
            openAccess: e['openaccess'] === '1' || e['openaccess'] === 1,
            url:       url
          };
        });
        return { results: results, total: total };
      })
      .catch(function(err) {
        console.error('[ELS ScienceDirect] Layer 3b search failed:', err && (err.message || err));
        return { results: [], total: 0 };
      });

    /* ── Merge parallel results ── */
    return Promise.all([scopusPromise, sdPromise]).then(function(both) {
      var scData = both[0], sdData = both[1];
      /* Interleave: Scopus first, then ScienceDirect.  Dedup by DOI within
         this batch before handing off to _deduplicateEL. */
      var seen = {};
      var merged = [];
      scData.results.concat(sdData.results).forEach(function(r) {
        var key = r.doi ? r.doi.toLowerCase() : r.id;
        if (!seen[key]) { seen[key] = true; merged.push(r); }
      });
      var combinedTotal = (scData.total || 0) + (sdData.total || 0);
      return { results: merged, total: combinedTotal };
    });
  }

  /* Deduplicate Elsevier results against local library + GL + FR + existing EL */
  function _deduplicateEL(candidates) {
    var localTitles = _resources.map(function(r){ return _normalizeTitle(r.title); });
    var localDois   = {};
    _resources.forEach(function(r){ if (r.doi) localDois[r.doi] = true; });
    var glTitles = _bgGLResults.map(function(r){ return _normalizeTitle(r.title); });
    var frDois   = {};
    _bgFRResults.forEach(function(r){ if (r.doi) frDois[r.doi] = true; });
    var frTitles = _bgFRResults.map(function(r){ return _normalizeTitle(r.title); });
    var existingIds = {};
    _bgELResults.forEach(function(r){ existingIds[r.id] = true; });
    var existingTitles = _bgELResults.map(function(r){ return _normalizeTitle(r.title); });

    return candidates.filter(function(c) {
      if (existingIds[c.id]) return false;
      var cTitle = _normalizeTitle(c.title);
      if (c.doi && (localDois[c.doi] || frDois[c.doi])) return false;
      if (localTitles.some(function(lt){ return _titleSimilarity(lt, cTitle) > 0.80; })) return false;
      if (existingTitles.some(function(et){ return _titleSimilarity(et, cTitle) > 0.80; })) return false;
      if (glTitles.some(function(gt){ return _titleSimilarity(gt, cTitle) > 0.80; })) return false;
      if (frTitles.some(function(ft){ return _titleSimilarity(ft, cTitle) > 0.80; })) return false;
      return true;
    });
  }

  /* ── Elsevier result card ── */
  function _elCardHTML(r, idx) {
    var isScopus  = r._sub === 'scopus';
    var srcBadge  = isScopus
      ? '<span class="rs-source-badge rs-badge-scopus">Scopus</span>'
      : '<span class="rs-source-badge rs-badge-scidir">ScienceDirect</span>';
    var oaBadge   = r.openAccess ? '<span class="rs-oa-badge">🔓 Open Access</span>' : '';
    var citBadge  = r.cited ? '<span class="rs-result-year" title="Cited by">📊 ' + r.cited + '</span>' : '';

    var actBtns = '<a class="rs-act-btn primary" href="' + _esc(r.url || '#') + '" ' +
      'target="_blank" rel="noopener noreferrer">View Article ↗</a>';
    if (r.doi) {
      actBtns += '<a class="rs-act-btn" href="https://doi.org/' + _esc(r.doi) + '" ' +
        'target="_blank" rel="noopener noreferrer">DOI ↗</a>';
    }
    actBtns += '<button class="rs-act-btn" onclick="LibraryModule.elCopyRef(' + idx + ')" ' +
      'title="Copy citation">📋 Cite</button>';

    var hasAbstract  = !!r.abstract;
    /* Scopus cards without an abstract can lazy-fetch it via the Abstract Retrieval API */
    var canLazyFetch = !hasAbstract && r._sub === 'scopus' && !!r._scopusId;
    var abstractHtml = hasAbstract
      ? '<div class="rs-result-abstract" id="el-abs-' + idx + '">' + _esc(r.abstract) + '</div>' +
        '<button class="rs-act-btn" style="font-size:8.5px;padding:3px 8px" ' +
          'onclick="LibraryModule.elToggleAbstract(' + idx + ')">Show more</button>'
      : canLazyFetch
        ? '<div class="rs-result-abstract" id="el-abs-' + idx + '" style="display:none"></div>' +
          '<button class="rs-act-btn" style="font-size:8.5px;padding:3px 8px" ' +
            'onclick="LibraryModule.elToggleAbstract(' + idx + ')">Load abstract</button>'
        : '';

    return '<div class="rs-result" id="el-card-' + idx + '">' +
      '<div class="rs-result-title">'    + _esc(r.title)   + '</div>' +
      (r.authors ? '<div class="rs-result-authors">' + _esc(r.authors) + '</div>' : '') +
      '<div class="rs-result-meta">' +
        oaBadge + citBadge +
        (r.journal ? '<span class="rs-result-journal" title="' + _esc(r.journal) + '">' + _esc(r.journal) + '</span>' : '') +
        (r.year    ? '<span class="rs-result-year">'    + _esc(r.year)    + '</span>' : '') +
      '</div>' +
      abstractHtml +
      '<div class="rs-result-acts">' + actBtns + '</div>' +
    '</div>';
  }

  /* Toggle / lazy-load abstract for Elsevier card.
   * If the card has no abstract yet but has a Scopus ID, fetches it via
   * the Abstract Retrieval API (JSON) and populates the placeholder. */
  function _elToggleAbstract(idx) {
    var r     = _bgELResults[idx];
    var absEl = document.getElementById('el-abs-' + idx);
    if (!absEl) return;
    var btn = absEl.nextElementSibling;

    /* ── Lazy-fetch path: abstract not yet loaded ── */
    if (!r.abstract && r._scopusId) {
      absEl.style.display = 'block';
      absEl.textContent   = 'Loading abstract…';
      if (btn && btn.tagName === 'BUTTON') btn.disabled = true;
      _elsAbstractFetch(r._scopusId, function(text) {
        if (r) r.abstract = text;
        absEl.textContent = text || 'No abstract available.';
        absEl.classList.add('expanded');
        if (btn && btn.tagName === 'BUTTON') {
          btn.disabled    = false;
          btn.textContent = 'Show less';
        }
      });
      return;
    }

    /* ── Toggle expand/collapse for already-loaded abstract ── */
    var expanded = absEl.classList.toggle('expanded');
    absEl.style.display = '';
    if (btn && btn.tagName === 'BUTTON') btn.textContent = expanded ? 'Show less' : 'Show more';
  }

  /* Copy APA-style citation for an Elsevier result */
  function _elCopyRef(idx) {
    var r = _bgELResults[idx];
    if (!r) return;
    var cit = (r.authors || 'Unknown') + '. ' + (r.title || '') + '. ' +
      (r.journal ? r.journal + '. ' : '') +
      (r.year    ? r.year    + '. '  : '') +
      (r.doi     ? 'doi:' + r.doi   : r.url || '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cit)
        .then(function(){ _toast('Citation copied!', 'success'); })
        .catch(function(){ _toast('Could not copy', 'warning'); });
    } else {
      _toast('Clipboard not supported', 'info');
    }
  }

  /* ── Individual result card ── */
  function _rsCardHTML(r, idx) {
    var srcBadge = r._src === 'pubmed'
      ? '<span class="rs-source-badge rs-badge-pubmed">PubMed</span>'
      : '<span class="rs-source-badge rs-badge-openalex">OpenAlex</span>';
    var oaBadge = r.openAccess ? '<span class="rs-oa-badge">🔓 Open Access</span>' : '';
    var citeStr = (r.citedBy !== undefined && r.citedBy !== null)
      ? '<span class="rs-result-cite">Cited by ' + r.citedBy.toLocaleString() + '</span>'
      : '';

    var actBtns = '<a class="rs-act-btn primary" href="' + _esc(r.url) + '" target="_blank" rel="noopener noreferrer">View Article ↗</a>';
    if (r.doi) {
      actBtns += '<a class="rs-act-btn" href="https://doi.org/' + _esc(r.doi) + '" target="_blank" rel="noopener noreferrer">DOI ↗</a>';
    }
    if (r.oaUrl) {
      actBtns += '<a class="rs-act-btn" href="' + _esc(r.oaUrl) + '" target="_blank" rel="noopener noreferrer">Free PDF ↗</a>';
    }
    actBtns += '<button class="rs-act-btn" onclick="LibraryModule.rsCopyRef(\''+idx+'\')" title="Copy citation">📋 Cite</button>';

    var hasAbstract = !!r.abstract;
    var abstractHtml = hasAbstract
      ? '<div class="rs-result-abstract" id="rs-abs-'+idx+'">' + _esc(r.abstract) + '</div>' +
        '<button class="rs-act-btn" style="font-size:8.5px;padding:3px 8px" ' +
          'onclick="LibraryModule.rsToggleAbstract(\''+idx+'\',\'' + (r._src === 'pubmed' ? r.pmid : '') + '\')">Show more</button>'
      : (r._src === 'pubmed'
        ? '<button class="rs-act-btn" style="font-size:8.5px;padding:3px 8px" ' +
            'onclick="LibraryModule.rsToggleAbstract(\''+idx+'\',\''+r.pmid+'\')">Load abstract</button>'
        : '');

    return '<div class="rs-result" id="rs-card-'+idx+'">' +
      '<div class="rs-result-title">'+_esc(r.title)+'</div>' +
      (r.authors ? '<div class="rs-result-authors">'+_esc(r.authors)+'</div>' : '') +
      '<div class="rs-result-meta">' +
        (r.journal ? '<span class="rs-result-journal" title="'+_esc(r.journal)+'">'+_esc(r.journal)+'</span>' : '') +
        (r.year ? '<span class="rs-result-year">'+_esc(r.year)+'</span>' : '') +
        oaBadge +
        citeStr +
      '</div>' +
      abstractHtml +
      '<div class="rs-result-acts">' + actBtns + '</div>' +
    '</div>';
  }

  /* ── Toggle / load abstract ── */
  function _rsToggleAbstract(idx, pmid) {
    var absEl = document.getElementById('rs-abs-' + idx);
    var r = _bgExternalResults[idx];

    if (!absEl) {
      // Create the element and fetch if needed
      var card = document.getElementById('rs-card-' + idx);
      if (!card) return;
      var actsDiv = card.querySelector('.rs-result-acts');
      var newAbs = document.createElement('div');
      newAbs.id = 'rs-abs-' + idx;
      newAbs.className = 'rs-result-abstract';
      newAbs.textContent = 'Loading abstract…';
      card.insertBefore(newAbs, actsDiv ? actsDiv.previousSibling : null);
      absEl = newAbs;

      if (pmid && r && !r.abstract) {
        _rsPubMedAbstract(pmid, function(text) {
          if (r) r.abstract = text;
          absEl.textContent = text || 'No abstract available.';
        });
      } else if (r && r.abstract) {
        absEl.textContent = r.abstract;
      } else {
        absEl.textContent = 'No abstract available.';
      }
      return;
    }

    // Toggle expand/collapse
    var btn = absEl.nextElementSibling;
    var expanded = absEl.classList.toggle('expanded');
    if (btn && btn.tagName === 'BUTTON') btn.textContent = expanded ? 'Show less' : 'Show more';
  }

  /* ── Copy citation for a research result ── */
  function _rsCopyRef(idx) {
    var r = _bgExternalResults[idx];
    if (!r) return;
    var cit = (r.authors || 'Unknown') + '. ' + (r.title || '') + '. ' +
      (r.journal ? r.journal + '. ' : '') +
      (r.year ? r.year + '. ' : '') +
      (r.doi ? 'doi:' + r.doi : r.url || '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cit)
        .then(function(){ _toast('Citation copied!','success'); })
        .catch(function(){ _toast('Could not copy','warning'); });
    } else {
      _toast('Clipboard not supported','info');
    }
  }

  /* ── Open-access filter (still used internally) ── */
  function _rsSetOpenAccess(val) {
    _rsOpenAccess = val;
  }

  /* ════════════════════════════════════════════════════
     PANEL SWITCH
  ════════════════════════════════════════════════════ */
  function _switchPanel(panel) {
    _panel = panel;
    document.querySelectorAll('.lib-panel').forEach(function(p){ p.classList.remove('active'); });
    document.querySelectorAll('.lib-sntab').forEach(function(t){ t.classList.remove('active'); });
    var pEl = document.getElementById('lib-panel-' + panel);
    if (pEl) pEl.classList.add('active');
    var tEl = document.querySelector('[data-lpanel="'+panel+'"]');
    if (tEl) tEl.classList.add('active');

    if (panel === 'browse')    { _loadApproved(); }
    if (panel === 'myuploads') { _subscribeMyUploads(); }
    if (panel === 'bookmarks') { _loadApproved(); _loadBookmarks(); }
    if (panel === 'upload' && !_curUser()) {
      _toast('Sign in to upload resources','warning');
    }
    if (panel === 'myuploads') {
      var dot = document.getElementById('lib-nav-dot');
      if (dot) dot.classList.remove('show');
    }
  }

  /* ════════════════════════════════════════════════════
     HTML INJECTION
  ════════════════════════════════════════════════════ */
  function _buildCatOptions(withAll) {
    var opts = withAll
      ? '<option value="">All Categories</option>'
      : '<option value="">Select category *</option>';
    LIB_CATEGORIES.forEach(function(c) {
      opts += '<option value="'+c.id+'">'+c.label+'</option>';
    });
    return opts;
  }

  function _buildTypeOptions() {
    var opts = '<option value="">Select type *</option>';
    LIB_FTYPES.forEach(function(t) {
      opts += '<option value="'+t.id+'">'+t.label+'</option>';
    });
    return opts;
  }

  function _injectHTML() {
    // ── 1. Main tab panel ──────────────────────────────
    if (!document.getElementById('tab-library')) {
      var wrap = document.createElement('div');
      wrap.className = 'main';
      wrap.id = 'tab-library';

      var catChips = LIB_CATEGORIES.map(function(c) {
        return '<button class="lib-chip" data-cat="'+c.id+'" onclick="LibraryModule.filterByCategory(\''+c.id+'\')">'+c.label+'</button>';
      }).join('');

      var typeChips = LIB_FTYPES.map(function(t) {
        return '<button class="lib-chip" data-ftype="'+t.id+'" onclick="LibraryModule.filterByType(\''+t.id+'\')">'+t.label+'</button>';
      }).join('');

      wrap.innerHTML =
        '<div class="lib-wrap">'+

        /* ── sub-nav ── */
        '<nav class="lib-subnav" role="navigation" aria-label="Library navigation">'+
          '<button class="lib-sntab active" data-lpanel="browse"    onclick="LibraryModule.switchPanel(\'browse\')">Browse</button>'+
          '<button class="lib-sntab"        data-lpanel="upload"    onclick="LibraryModule.switchPanel(\'upload\')">Upload</button>'+
          '<button class="lib-sntab"        data-lpanel="myuploads" onclick="LibraryModule.switchPanel(\'myuploads\')">My Uploads</button>'+
          '<button class="lib-sntab"        data-lpanel="bookmarks" onclick="LibraryModule.switchPanel(\'bookmarks\')">Bookmarks</button>'+
        '</nav>'+

        /* ── Browse panel — unified layered search ── */
        '<div class="lib-panel active" id="lib-panel-browse">'+
          /* Search bar — single unified input */
          '<div class="lib-searchbar">'+
            '<span class="lib-search-icon">⌕</span>'+
            '<input type="text" id="lib-q" '+
              'placeholder="Search guidelines, articles, books, protocols…" '+
              'autocomplete="off" spellcheck="false" '+
              'oninput="LibraryModule.onSearch(this.value)" '+
              'onkeydown="if(event.key===\'Enter\')LibraryModule.onSearch(this.value)">'+
            '<button class="lib-search-btn" onclick="LibraryModule.onSearch(document.getElementById(\'lib-q\').value)">Search</button>'+
          '</div>'+
          /* Category / type chips — hidden while query is active */
          '<div id="lib-local-filters">'+
            '<div class="lib-chips" id="lib-cat-chips">'+
              '<button class="lib-chip active" data-cat="" onclick="LibraryModule.filterByCategory(\'\')">All</button>'+
              catChips+
            '</div>'+
            '<div class="lib-chips" id="lib-type-chips">'+
              '<button class="lib-chip active" data-ftype="" onclick="LibraryModule.filterByType(\'\')">All Types</button>'+
              typeChips+
            '</div>'+
          '</div>'+
          /* Results info bar */
          '<div class="lib-sec-hdr" style="margin-top:4px">'+
            '<div class="lib-sec-title" id="lib-results-label">Library Resources</div>'+
            '<div class="lib-badge" id="lib-res-count">0</div>'+
          '</div>'+
          '<div class="rs-sort-info" id="rs-sort-info" style="display:none"></div>'+
          /* AI Overview container — injected above results when a query is active */
          '<div id="lib-ai-overview"></div>'+
          /* Unified results container */
          '<div id="lib-browse-cards" class="lib-cards"><div class="lib-spin"></div></div>'+
          '<div id="rs-pagination"></div>'+
        '</div>'+

        /* ── Upload panel ── */
        '<div class="lib-panel" id="lib-panel-upload">'+
          '<div class="lib-form-card">'+
            '<div class="lib-form-ttl">📤 Submit Resource</div>'+

            '<div class="lib-row">'+
              '<label class="lib-lbl" for="lib-up-title">Title <em>*</em></label>'+
              '<input id="lib-up-title" class="lib-inp" type="text" placeholder="e.g. ESPEN Guideline on Clinical Nutrition in ICU" maxlength="200">'+
            '</div>'+

            '<div class="lib-row">'+
              '<label class="lib-lbl" for="lib-up-desc">Description <em>*</em></label>'+
              '<textarea id="lib-up-desc" class="lib-inp" rows="3" placeholder="Brief description of the resource and its clinical relevance…" maxlength="800"></textarea>'+
            '</div>'+

            '<div class="lib-row">'+
              '<label class="lib-lbl" for="lib-up-category">Category <em>*</em></label>'+
              '<select id="lib-up-category" class="lib-inp">'+_buildCatOptions(false)+'</select>'+
            '</div>'+

            '<div class="lib-row">'+
              '<label class="lib-lbl" for="lib-up-source">Source / Publisher <em>*</em></label>'+
              '<input id="lib-up-source" class="lib-inp" type="text" placeholder="e.g. ESPEN, WHO, ASPEN, Journal of Clinical Nutrition" maxlength="200">'+
            '</div>'+

            '<div class="lib-row">'+
              '<label class="lib-lbl">Tags <em>*</em> <span style="font-weight:400;text-transform:none;font-size:8.5px;opacity:.7">(Enter or comma to add · max 10)</span></label>'+
              '<div class="lib-tags-wrap" id="lib-tags-wrap" onclick="document.getElementById(\'lib-tag-input\').focus()">'+
                '<input type="text" id="lib-tag-input" class="lib-tag-txt" placeholder="Add tag…" '+
                  'onkeydown="LibraryModule.handleTagKey(event)" oninput="LibraryModule.handleTagInput(this.value)">'+
              '</div>'+
            '</div>'+

            '<div class="lib-row">'+
              '<label class="lib-lbl" for="lib-up-type">Resource Type <em>*</em></label>'+
              '<select id="lib-up-type" class="lib-inp" onchange="LibraryModule.onTypeChange(this.value)">'+_buildTypeOptions()+'</select>'+
            '</div>'+

            /* File drop zone */
            '<div id="lib-file-sec">'+
              '<div class="lib-dropzone" id="lib-dropzone" '+
                'ondragover="event.preventDefault();this.classList.add(\'drag-over\')" '+
                'ondragleave="this.classList.remove(\'drag-over\')" '+
                'ondrop="LibraryModule.onFileDrop(event)">'+
                '<input type="file" id="lib-file-input" '+
                  'accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.webp" '+
                  'onchange="LibraryModule.onFileSelect(event)">'+
                '<div class="lib-drop-ico">📁</div>'+
                '<div class="lib-drop-txt">Drop file here or click to browse</div>'+
                '<div class="lib-drop-sub">PDF · DOCX · JPG · PNG · GIF · WebP &nbsp;·&nbsp; Max '+LIB_MAX_MB+'MB</div>'+
              '</div>'+
              '<div id="lib-fp-wrap"></div>'+
            '</div>'+

            /* Link input (hidden until type=link) */
            '<div id="lib-link-sec" style="display:none">'+
              '<div class="lib-row" style="margin-bottom:4px">'+
                '<label class="lib-lbl" for="lib-up-link">URL <em>*</em></label>'+
                '<input id="lib-up-link" class="lib-inp" type="url" placeholder="https://…" '+
                  'oninput="LibraryModule.validateLinkPreview(this.value)">'+
              '</div>'+
              '<div id="lib-link-preview"></div>'+
            '</div>'+

            /* Progress */
            '<div id="lib-prog-wrap" style="display:none">'+
              '<div class="lib-prog-wrap"><div class="lib-prog-bar" id="lib-prog-bar"></div></div>'+
              '<div id="lib-prog-lbl" style="font-family:var(--mono);font-size:9.5px;color:var(--text-muted);margin-top:5px;text-align:center"></div>'+
            '</div>'+

            '<button class="lib-submit" id="lib-submit-btn" onclick="LibraryModule.submitUpload()">↑ SUBMIT FOR REVIEW</button>'+

            '<div style="margin-top:10px;text-align:center;font-family:var(--mono);font-size:9.5px;color:var(--text-muted);line-height:1.55">'+
              'Resources are reviewed by an admin before becoming publicly visible.<br>'+
              'You will receive an in-app notification once your submission is reviewed.'+
            '</div>'+
          '</div>'+
        '</div>'+

        /* ── My Uploads panel ── */
        '<div class="lib-panel" id="lib-panel-myuploads">'+
          '<div class="lib-sec-hdr"><div class="lib-sec-title">My Submissions</div><div class="lib-badge" id="lib-my-count">0</div></div>'+
          '<div id="lib-my-cards"></div>'+
        '</div>'+

        /* ── Bookmarks panel ── */
        '<div class="lib-panel" id="lib-panel-bookmarks">'+
          '<div class="lib-sec-hdr"><div class="lib-sec-title">Saved Resources</div><div class="lib-badge" id="lib-bm-count">0</div></div>'+
          '<div id="lib-bm-cards" class="lib-cards"></div>'+
        '</div>'+

        '</div>'+/* /lib-wrap */

        /* ── Resource Viewer Modal ── */
        '<div id="lib-viewer" role="dialog" aria-modal="true" aria-label="Resource viewer">'+
          '<div class="lib-vh">'+
            '<div class="lib-vtitle" id="lib-vtitle-el">Resource</div>'+
            '<button class="lib-close-btn" onclick="LibraryModule.closeViewer()">✕ Close</button>'+
          '</div>'+
          '<div class="lib-vbody">'+
            '<div class="lib-vcontent" id="lib-vcontent"></div>'+
            '<div class="lib-vmeta"   id="lib-vmeta"></div>'+
          '</div>'+
        '</div>';

      document.body.appendChild(wrap);
    }

    // ── 2. Bottom-nav tab ──────────────────────────────
    if (!document.getElementById('bnav-library')) {
      var nav = document.getElementById('bottom-nav-scroll');
      if (nav) {
        var btn = document.createElement('div');
        btn.id        = 'bnav-library';
        btn.className = 'tab tab-support';
        btn.setAttribute('onclick',  "switchTab('library')");
        btn.setAttribute('role',     'button');
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('aria-label', 'Resource Library');
        btn.innerHTML =
          '<span class="tab-icon" style="position:relative">'+
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
              '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'+
              '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'+
              '<line x1="9" y1="8" x2="15" y2="8" opacity="0.6"/>'+
              '<line x1="9" y1="12" x2="13" y2="12" opacity="0.4"/>'+
            '</svg>'+
            '<span class="lib-dot" id="lib-nav-dot"></span>'+
          '</span>'+
          '<span class="tab-label">Library</span>';
        nav.appendChild(btn);
      }
    }

    // ── 3. Home-screen Information card ──────────────
    var hpRefs = document.querySelector('.hp-refs');
    if (hpRefs && !document.getElementById('hp-ref-library')) {
      var card = document.createElement('div');
      card.id        = 'hp-ref-library';
      card.className = 'hp-ref-card';
      card.setAttribute('onclick', "switchTab('library')");
      card.innerHTML =
        '<span class="hp-ref-icon">'+
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+
            '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'+
            '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'+
            '<line x1="9" y1="8" x2="15" y2="8" opacity="0.6"/>'+
            '<line x1="9" y1="12" x2="13" y2="12" opacity="0.4"/>'+
          '</svg>'+
        '</span>'+
        '<div>'+
          '<div class="hp-ref-name">Resource Library</div>'+
          '<div class="hp-ref-desc">Guidelines · Protocols · Articles</div>'+
        '</div>';
      hpRefs.appendChild(card);
    }
  }

  /* ════════════════════════════════════════════════════
     ADMIN API  (consumed by admin dashboard)
     All operations now use Appwrite Databases + Storage.
     Firebase Auth UID is still used for uploadedBy checks.
  ════════════════════════════════════════════════════ */
  window.LibraryAdminAPI = {
    /**
     * Approve a resource.
     * @param {string} resourceId — Appwrite document $id
     * @param {string} [note]      optional admin note
     */
    approve: function(resourceId, note) {
      var awdb = _awDb();
      if (!awdb) return Promise.reject('No Appwrite DB');
      return awdb.updateDocument(_AW_DB_ID(), _AW_COL_ID(), resourceId, {
        status:     'approved',
        reviewNote: note || '',
        reviewedAt: new Date().toISOString()
      });
    },

    /**
     * Reject a resource.
     * @param {string} resourceId
     * @param {string} note — reason for rejection (required)
     */
    reject: function(resourceId, note) {
      var awdb = _awDb();
      if (!awdb) return Promise.reject('No Appwrite DB');
      return awdb.updateDocument(_AW_DB_ID(), _AW_COL_ID(), resourceId, {
        status:     'rejected',
        reviewNote: note || 'Did not meet submission criteria.',
        reviewedAt: new Date().toISOString()
      });
    },

    /**
     * Update resource metadata (admin edit).
     * @param {string} resourceId
     * @param {Object} fields — partial update
     */
    update: function(resourceId, fields) {
      var awdb = _awDb();
      if (!awdb) return Promise.reject('No Appwrite DB');
      var safe = {};
      ['title','description','category','tags','source','status','reviewNote'].forEach(function(k){
        if (Object.prototype.hasOwnProperty.call(fields, k)) safe[k] = fields[k];
      });
      if (safe.title) safe.titleLower = safe.title.toLowerCase().trim();
      return awdb.updateDocument(_AW_DB_ID(), _AW_COL_ID(), resourceId, safe);
    },

    /**
     * Delete a resource and its Appwrite Storage file.
     * @param {string} resourceId
     */
    delete: function(resourceId) {
      var awdb = _awDb();
      var awst = _awStor();
      if (!awdb) return Promise.reject('No Appwrite DB');
      return awdb.getDocument(_AW_DB_ID(), _AW_COL_ID(), resourceId)
        .then(function(doc) {
          var del = awdb.deleteDocument(_AW_DB_ID(), _AW_COL_ID(), resourceId);
          /* Best-effort: delete file from Storage — ignore errors */
          if (doc.fileId && awst) {
            awst.deleteFile(_AW_BKT_ID(), doc.fileId).catch(function(){});
          }
          return del;
        });
    },

    /**
     * Fetch all resources with a specific status for admin listing.
     * @param {'pending'|'approved'|'rejected'|'all'} status
     * @returns {Promise<Array>}
     */
    fetchByStatus: function(status) {
      var awdb = _awDb();
      if (!awdb) return Promise.reject('No Appwrite DB');
      var queries = [
        Appwrite.Query.orderDesc('createdAt'),
        Appwrite.Query.limit(300)
      ];
      if (status && status !== 'all') {
        queries.push(Appwrite.Query.equal('status', status));
      }
      return awdb.listDocuments(_AW_DB_ID(), _AW_COL_ID(), queries)
        .then(function(resp) {
          return resp.documents.map(_awNormDoc);
        });
    },

    /** Get categories list (for admin category manager). */
    getCategories: function() { return LIB_CATEGORIES.slice(); },

    /** Expose collection name for legacy admin code compatibility. */
    COLLECTION: LIB_COL
  };

  /* ════════════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════════ */
  function _init() {
    if (_initDone) return;
    _initDone = true;

    _injectCSS();
    _injectHTML();

    // Auth state
    function _setupAuth() {
      var a = _authObj();
      if (!a) return false;
      a.onAuthStateChanged(function(user) {
        _user = user;
        if (user) {
          _loadApproved();
          _loadBookmarks();
        } else {
          _resources = [];
          _renderBrowse();
        }
      });
      return true;
    }

    if (!_setupAuth()) {
      // Firebase not yet loaded — retry after scripts settle
      setTimeout(function() {
        if (!_setupAuth()) {
          _loadApproved(); // unauthenticated fallback
        }
      }, 1800);
    }

    // Patch window.switchTab to trigger Library-specific hooks
    var _origSwitchTab = window.switchTab;
    if (typeof _origSwitchTab === 'function') {
      window.switchTab = function(tab) {
        _origSwitchTab(tab);
        if (tab === 'library') {
          if (_panel === 'browse') _loadApproved();
          _loadBookmarks();
        }
      };
    }

    // Keyboard: Escape closes viewer
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var v = document.getElementById('lib-viewer');
        if (v && v.classList.contains('open')) _closeViewer();
      }
    });

    console.log('[Library] Module v' + LIB_VERSION + ' ready');
  }

  /* ════════════════════════════════════════════════════
     PUBLIC API  (window.LibraryModule)
  ════════════════════════════════════════════════════ */
  window.LibraryModule = {
    version: LIB_VERSION,

    /* Navigation */
    switchPanel:   _switchPanel,

    /* Browse */
    onSearch: function(val) {
      _searchQ = val || '';
      if (_searchQ.trim().length >= 2) {
        _unifiedSearch(_searchQ);
      } else {
        // Clear query — fall back to local library view
        clearTimeout(_bgSearchTimer);
        _bgLoading         = false;
        _bgExternalResults = [];
        _bgHasMore         = { pubmed: false, oa: false };
        _bgGLResults       = [];
        _bgGLTotal         = 0;
        _bgHasMoreGL       = false;
        _bgFRResults       = [];
        _bgFRTotal         = 0;
        _bgHasMoreFR       = false;
        _bgELResults       = [];
        _bgELTotal         = 0;
        _bgHasMoreEL       = false;
        _sqClearCache();   // reset scored search cache
        _removeSentinel();
        _aioClear();       // clear AI overview when query is cleared
        _renderBrowse();
      }
    },

    filterByCategory: function(cat) {
      _filterCat = cat;
      _sqClearCache();
      document.querySelectorAll('[data-cat]').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-cat') === cat);
      });
      if (_searchQ.trim().length >= 2) _doUnifiedSearch(_searchQ);
      else _renderBrowse();
    },
    filterByType: function(type) {
      _filterType = type;
      _sqClearCache();
      document.querySelectorAll('[data-ftype]').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-ftype') === type);
      });
      if (_searchQ.trim().length >= 2) _doUnifiedSearch(_searchQ);
      else _renderBrowse();
    },

    /* Resource actions */
    openResource:       _openResource,
    closeViewer:        _closeViewer,
    toggleBookmark:     _toggleBookmark,
    shareResource:      _shareResource,
    downloadResource:   _downloadResource,
    _trackView:         _trackView,

    /* Upload */
    onTypeChange:          _onTypeChange,
    onFileDrop:            _onFileDrop,
    onFileSelect:          _onFileSelect,
    _clearFile:            _clearFile,
    validateLinkPreview:   _validateLinkPreview,
    handleTagKey:          _handleTagKey,
    handleTagInput:        _handleTagInput,
    _removeTagAt:          _removeTagAt,
    submitUpload:          _submitUpload,

    /* Citation */
    setCitStyle:    _setCitStyle,
    copyCitation:   _copyCitation,
    getCitation:    function(resourceId, style) {
      var r = _resources.concat(_myResources).filter(function(x){return x.id===resourceId;})[0];
      return r ? _genCitation(r, style || 'apa') : '';
    },

    /* Research Search */
    rsToggleAbstract:  _rsToggleAbstract,
    rsCopyRef:         _rsCopyRef,
    loadMoreExternal:  _loadMoreExternal,
    rsSetOpenAccess:   _rsSetOpenAccess,
    rsSetYearFrom:     function(val) { _rsYearFrom = val || ''; },
    rsSetYearTo:       function(val) { _rsYearTo = val || ''; },

    /* Layer 2: Clinical Guidelines */
    glToggleAbstract:  _glToggleAbstract,
    glCopyRef:         _glCopyRef,

    /* Layer 3: Frontiers in Research */
    frToggleAbstract:  _frToggleAbstract,
    frCopyRef:         _frCopyRef,

    /* Layer 3b: Elsevier (Scopus + ScienceDirect) */
    elToggleAbstract:  _elToggleAbstract,
    elCopyRef:         _elCopyRef
  };

  /* Boot */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
