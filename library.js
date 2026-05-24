/**
 * library.js — Oasis Nutrition Resource Library Module
 * ─────────────────────────────────────────────────────────────
 * Version  : 1.1.0
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
 * Firebase:
 *  • Firestore collection : library_resources
 *  • Firestore collection : library_bookmarks/{uid}/items
 *  • Storage path         : library_uploads/{uid}/{timestamp}_{filename}
 *
 * Integration:
 *  1. Add firebase-storage-compat.js SDK before this script (see index.html patch)
 *  2. Add <script src="library.js"></script> before </body> in index.html
 *  3. Firestore & Storage security rules: see LIBRARY_RULES.txt (companion file)
 *
 * Firestore document schema (library_resources/{id}):
 *  {
 *    title         : string           // display title
 *    titleLower    : string           // lowercase — used for dup-check queries
 *    description   : string
 *    category      : string           // from LIB_CATEGORIES
 *    tags          : string[]
 *    source        : string           // publisher / journal / organisation
 *    fileType      : 'pdf'|'docx'|'image'|'link'
 *    fileURL       : string           // Storage download URL  (empty for links)
 *    externalLink  : string           // external URL          (empty for files)
 *    fileName      : string
 *    fileSize      : number           // bytes
 *    uploadedBy    : string           // Firebase Auth UID
 *    uploaderName  : string
 *    uploadedAt    : Timestamp
 *    status        : 'pending'|'approved'|'rejected'
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
  var LIB_VERSION       = '1.1.0';
  var LIB_COL           = 'library_resources';
  var LIB_BM_COL        = 'library_bookmarks';
  var LIB_STORAGE       = 'library_uploads';
  var LIB_MAX_MB        = 25;

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
  var _db            = null;
  var _storage       = null;
  var _auth          = null;
  var _user          = null;
  var _resources     = [];      // approved resources cache
  var _myResources   = [];      // current user's uploads cache
  var _bookmarks     = {};      // { resourceId: true }
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
  var RS_PUBMED_KEY      = 'fc03ed1b136070a34347982eb7950c9e3307';
  var RS_OPENALEX_MAILTO = 'oasis-cnst@research.tool';
  var RS_PAGE_SIZE       = 10;

  /* ── Frontiers Search API config ── */
  var RS_FRONTIERS_KEY  = 'e41a769c392c4760760a1b4702795e77';   // Elsevier-registered key
  var RS_FRONTIERS_BASE = 'https://search-api.frontiersin.org/api/V1';
  var RS_FRONTIERS_SIZE = 10;

  /* ── Layer 3: Elsevier (Scopus + ScienceDirect) config ── */
  var RS_ELSEVIER_KEY    = 'e41a769c392c4760760a1b4702795e77';
  var RS_ELSEVIER_SCOPUS = 'https://api.elsevier.com/content/search/scopus';
  var RS_ELSEVIER_SD     = 'https://api.elsevier.com/content/search/sciencedirect';
  var RS_ELSEVIER_SIZE   = 10;

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
    'ESPGHAN[ad]'
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
      '.lib-card-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;',
        'margin-top:9px;padding-top:9px;border-top:1px solid rgba(30,41,59,.55)}',
      '.lib-card-cat{font-family:var(--mono);font-size:8.5px;color:var(--text-muted);',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.lib-card-acts{display:flex;gap:4px;flex-shrink:0}',

      /* ── Icon button ── */
      '.lib-ibtn{width:29px;height:29px;border-radius:7px;background:var(--surface2);border:1px solid var(--border);',
        'color:var(--text-dim);display:flex;align-items:center;justify-content:center;',
        'cursor:pointer;transition:all .15s;font-size:12px;flex-shrink:0}',
      '.lib-ibtn:hover{border-color:var(--teal);color:var(--teal)}',
      '.lib-ibtn.bm-active{color:var(--amber);border-color:rgba(240,180,41,.35);background:rgba(240,180,41,.07)}',

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
      '.lib-vacts{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}',
      '.lib-vbtn{display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:7px;',
        'font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.5px;',
        'cursor:pointer;transition:all .15s;border:1px solid var(--border);',
        'background:var(--surface2);color:var(--text-dim);text-decoration:none}',
      '.lib-vbtn:hover{border-color:var(--teal);color:var(--teal)}',
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
     FIREBASE ACCESSORS
  ════════════════════════════════════════════════════ */
  function _db2() {
    if (_db) return _db;
    if (typeof db !== 'undefined' && db) { _db = db; return _db; }
    if (typeof firebase !== 'undefined') { _db = firebase.firestore(); return _db; }
    return null;
  }

  function _stor() {
    if (_storage) return _storage;
    if (typeof firebase !== 'undefined' && firebase.storage) {
      _storage = firebase.storage(); return _storage;
    }
    return null;
  }

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

  function _fsv() {
    // Firebase server value shortcuts
    return {
      ts:  firebase.firestore.FieldValue.serverTimestamp(),
      inc1: firebase.firestore.FieldValue.increment(1),
      dec1: firebase.firestore.FieldValue.increment(-1)
    };
  }

  /* ════════════════════════════════════════════════════
     CITATION GENERATOR
  ════════════════════════════════════════════════════ */
  function _genCitation(r, style) {
    var year     = _getYear(r.uploadedAt);
    var title    = r.title || 'Untitled';
    var source   = r.source || 'Unknown';
    var url      = r.fileURL || r.externalLink || '';
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
    return '<div class="lib-card" onclick="LibraryModule.openResource(\''+r.id+'\')">' +
      '<div class="lib-card-row">' +
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
        '<div class="lib-card-acts" onclick="event.stopPropagation()">' +
          '<button class="lib-ibtn'+(bm?' bm-active':'')+'" data-bmid="'+r.id+'" title="'+(bm?'Remove bookmark':'Bookmark')+'" '+
            'onclick="LibraryModule.toggleBookmark(\''+r.id+'\')">'+(bm?'🔖':'☆')+'</button>' +
          '<button class="lib-ibtn" title="Share" onclick="LibraryModule.shareResource(\''+r.id+'\')" aria-label="Share">↗</button>' +
          (r.fileURL||r.externalLink
            ? '<button class="lib-ibtn" title="Download / Open" onclick="LibraryModule.downloadResource(\''+r.id+'\')" aria-label="Download">↓</button>'
            : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ════════════════════════════════════════════════════
     RENDER: PANELS
  ════════════════════════════════════════════════════ */
  function _renderEmpty(msg) {
    return '<div class="lib-empty"><div class="lib-empty-ico">📭</div>' +
           '<div class="lib-empty-txt">'+msg+'</div></div>';
  }

  function _applyFilters(list) {
    return list.filter(function(r) {
      if (_filterCat  && r.category !== _filterCat)  return false;
      if (_filterType && r.fileType !== _filterType) return false;
      if (_searchQ) {
        var q = _searchQ.toLowerCase();
        var haystack = (r.title+' '+r.description+' '+(r.tags||[]).join(' ')+' '+r.source).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      return true;
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

    var localResults  = _applyFilters(_resources);
    var extResults    = _bgExternalResults;
    var totalVisible  = localResults.length + _bgGLResults.length + _bgFRResults.length + _bgELResults.length + extResults.length;

    if (label) label.textContent = 'Search Results';
    if (badge) badge.textContent = totalVisible + (_bgHasMore.pubmed || _bgHasMore.oa || _bgHasMoreGL || _bgHasMoreFR || _bgHasMoreEL ? '+' : '');

    var html = '';

    // ── Oasis Library results first ─────────────────────────────────────────
    if (localResults.length) {
      html += '<div class="lib-src-divider">Oasis Library (' + localResults.length + ')</div>';
      html += localResults.map(function(r){ return _cardHTML(r, false, true); }).join('');
    }

    // ── Layer 2: Clinical Guidelines ────────────────────────────────────────
    if (_bgGLResults.length) {
      var glGCount = _bgGLResults.filter(function(r){ return r._pubType === 'guideline'; }).length;
      var glRCount = _bgGLResults.filter(function(r){ return r._pubType === 'review'; }).length;
      var glLabel = 'Clinical Guidelines (' + _bgGLResults.length + (_bgHasMoreGL ? '+' : '') + ')';
      html += '<div class="lib-src-divider lib-gl-divider">' + glLabel + '</div>';
      html += _bgGLResults.map(function(r, i){ return _glCardHTML(r, i); }).join('');
    }

    // ── Layer 3: Frontiers in Research ──────────────────────────────────────
    if (_bgFRResults.length) {
      var frLabel = 'Frontiers in Research (' + _bgFRResults.length + (_bgHasMoreFR ? '+' : '') + ')';
      html += '<div class="lib-src-divider lib-fr-divider">' + frLabel + '</div>';
      html += _bgFRResults.map(function(r, i){ return _frCardHTML(r, i); }).join('');
    }

    // ── Layer 3b: Elsevier (Scopus + ScienceDirect) ──────────────────────────
    if (_bgELResults.length) {
      var elScopusCount = _bgELResults.filter(function(r){ return r._sub === 'scopus'; }).length;
      var elSDCount     = _bgELResults.filter(function(r){ return r._sub === 'sciencedirect'; }).length;
      var elParts = [];
      if (elScopusCount) elParts.push(elScopusCount + ' Scopus');
      if (elSDCount)     elParts.push(elSDCount + ' ScienceDirect');
      var elLabel = 'Elsevier — ' + elParts.join(' · ') + (_bgHasMoreEL ? '+' : '');
      html += '<div class="lib-src-divider lib-el-divider">' + elLabel + '</div>';
      html += _bgELResults.map(function(r, i){ return _elCardHTML(r, i); }).join('');
    }

    // ── Background loading indicator ────────────────────────────────────────
    if (_bgLoading && extResults.length === 0) {
      html +=
        '<div class="lib-bg-status">' +
          '<span class="lib-bg-spin"></span>' +
          '<span>Searching guidelines, Frontiers, Elsevier &amp; research…</span>' +
        '</div>';
    }

    // ── External results ────────────────────────────────────────────────────
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
      if (extResults.length || _bgFRResults.length || _bgELResults.length) {
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
    if (_bgHasMore.pubmed || _bgHasMore.oa || _bgHasMoreFR || _bgHasMoreEL) {
      _addSentinel();
    } else {
      _removeSentinel();
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

  /* ── Unified search — fires on every keystroke (with debounce) ────────────── */
  var _bgSearchTimer = null;
  function _unifiedSearch(q) {
    clearTimeout(_bgSearchTimer);
    _bgSearchTimer = setTimeout(function(){ _doUnifiedSearch(q); }, 300);
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
     DATA: LOAD APPROVED
  ════════════════════════════════════════════════════ */
  function _loadApproved() {
    var d = _db2();
    if (!d) { _renderBrowse(); return; }
    document.getElementById('lib-browse-cards').innerHTML = '<div class="lib-spin"></div>';
    d.collection(LIB_COL)
      .where('status','==','approved')
      .orderBy('uploadedAt','desc')
      .limit(120)
      .get()
      .then(function(snap) {
        _resources = snap.docs.map(function(doc){ return Object.assign({id:doc.id},doc.data()); });
        _renderBrowse();
        _renderBookmarks();
      })
      .catch(function(e) {
        console.error('[Library] loadApproved:',e);
        _renderBrowse();
      });
  }

  /* ════════════════════════════════════════════════════
     DATA: MY UPLOADS (real-time)
  ════════════════════════════════════════════════════ */
  function _subscribeMyUploads() {
    var d = _db2();
    var uid = _curUser() && _curUser().uid;
    if (!d || !uid) {
      _renderMine();
      return;
    }
    if (_unsubMine) { _unsubMine(); _unsubMine = null; }
    var prevStatuses = {};
    _myResources.forEach(function(r){ prevStatuses[r.id] = r.status; });

    _unsubMine = d.collection(LIB_COL)
      .where('uploadedBy','==',uid)
      .orderBy('uploadedAt','desc')
      .onSnapshot(function(snap) {
        _myResources = snap.docs.map(function(doc){ return Object.assign({id:doc.id},doc.data()); });
        // Detect status changes for notifications
        snap.docChanges().forEach(function(change) {
          if (change.type === 'modified') {
            var data = change.doc.data();
            var prev = prevStatuses[change.doc.id];
            if (prev && prev !== data.status && data.status !== 'pending') {
              var msg = data.status === 'approved'
                ? '✓ "'+data.title+'" was approved'
                : '✗ "'+data.title+'" was not approved';
              _toast(msg, data.status === 'approved' ? 'success' : 'warning', 5500);
              // Show nav dot
              var dot = document.getElementById('lib-nav-dot');
              if (dot) dot.classList.add('show');
            }
          }
        });
        _myResources.forEach(function(r){ prevStatuses[r.id] = r.status; });
        _renderMine();
      }, function(err){ console.error('[Library] myUploads err:', err); });
  }

  /* ════════════════════════════════════════════════════
     DATA: BOOKMARKS
  ════════════════════════════════════════════════════ */
  function _loadBookmarks() {
    var d = _db2();
    var uid = _curUser() && _curUser().uid;
    if (!d || !uid) { _renderBookmarks(); return; }
    d.collection(LIB_BM_COL).doc(uid).collection('items').get()
      .then(function(snap) {
        _bookmarks = {};
        snap.docs.forEach(function(doc){ _bookmarks[doc.id] = true; });
        _renderBookmarks();
        // Refresh bookmark icons on browse cards
        document.querySelectorAll('[data-bmid]').forEach(function(btn) {
          var id = btn.getAttribute('data-bmid');
          var active = !!_bookmarks[id];
          btn.classList.toggle('bm-active', active);
          btn.title = active ? 'Remove bookmark' : 'Bookmark';
          btn.textContent = active ? '🔖' : '☆';
        });
      })
      .catch(function(e){ console.error('[Library] loadBookmarks:', e); });
  }

  /* ════════════════════════════════════════════════════
     BOOKMARK TOGGLE
  ════════════════════════════════════════════════════ */
  function _toggleBookmark(resourceId) {
    if (!_requireAuth()) return;
    var d = _db2();
    var uid = _curUser().uid;
    var itemRef = d.collection(LIB_BM_COL).doc(uid).collection('items').doc(resourceId);
    var resRef  = d.collection(LIB_COL).doc(resourceId);
    var fv = _fsv();
    if (_bookmarks[resourceId]) {
      delete _bookmarks[resourceId];
      itemRef.delete().catch(function(){});
      resRef.update({ bookmarkCount: fv.dec1 }).catch(function(){});
      _toast('Removed from bookmarks', 'info');
    } else {
      _bookmarks[resourceId] = true;
      itemRef.set({ addedAt: fv.ts }).catch(function(){});
      resRef.update({ bookmarkCount: fv.inc1 }).catch(function(){});
      _toast('Bookmarked!', 'success');
    }
    // Update all buttons with this resource ID
    document.querySelectorAll('[data-bmid="'+resourceId+'"]').forEach(function(btn) {
      var active = !!_bookmarks[resourceId];
      btn.classList.toggle('bm-active', active);
      btn.title = active ? 'Remove bookmark' : 'Bookmark';
      btn.textContent = active ? '🔖' : '☆';
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
    if (r.fileType === 'pdf' && r.fileURL) {
      content.innerHTML = '<iframe src="'+r.fileURL+'#toolbar=1&navpanes=0" title="'+_esc(r.title)+'" allowfullscreen></iframe>';
    } else if (r.fileType === 'image' && r.fileURL) {
      content.innerHTML = '<img src="'+r.fileURL+'" alt="'+_esc(r.title)+'" loading="lazy" style="width:100%;height:100%;object-fit:contain;display:block">';
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
    meta.innerHTML =
      '<div class="lib-vacts">'+
        (r.fileURL||r.externalLink
          ? '<a href="'+(r.fileURL||r.externalLink)+'" target="_blank" rel="noopener noreferrer" '+
              'class="lib-vbtn primary" onclick="LibraryModule._trackView(\''+r.id+'\',\'download\')">↓ Download / Open</a>'
          : '') +
        '<button class="lib-vbtn" onclick="LibraryModule.toggleBookmark(\''+r.id+'\')">☆ Bookmark</button>'+
        '<button class="lib-vbtn" onclick="LibraryModule.shareResource(\''+r.id+'\')">↗ Share</button>'+
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

  function _trackView(resourceId, action) {
    var d = _db2();
    if (!d) return;
    var fv = _fsv();
    var field = action === 'view' ? 'viewCount' : 'downloadCount';
    var update = {};
    update[field] = fv.inc1;
    d.collection(LIB_COL).doc(resourceId).update(update).catch(function(){});
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
    var url = r.fileURL || r.externalLink;
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
     DUPLICATE CHECK
  ════════════════════════════════════════════════════ */
  function _checkDup(title, cb) {
    var d = _db2();
    var uid = _curUser() && _curUser().uid;
    if (!d || !uid) { cb(false); return; }
    d.collection(LIB_COL)
      .where('uploadedBy','==',uid)
      .where('titleLower','==',title.toLowerCase().trim())
      .limit(1).get()
      .then(function(snap){ cb(!snap.empty); })
      .catch(function(){ cb(false); });
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

  function _doUpload(title, desc, category, source, type, linkUrl) {
    var btn = document.getElementById('lib-submit-btn');
    var progWrap = document.getElementById('lib-prog-wrap');
    var progBar  = document.getElementById('lib-prog-bar');
    var progLbl  = document.getElementById('lib-prog-lbl');
    if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }
    if (progWrap) progWrap.style.display = 'block';

    var fileURL  = type === 'link' ? linkUrl : '';
    var fileName = '';
    var fileSize = 0;
    var fv = _fsv();
    var d = _db2();
    var user = _curUser();

    function _saveDoc() {
      if (progLbl) progLbl.textContent = 'Saving metadata…';
      if (progBar)  progBar.style.width = '95%';
      return d.collection(LIB_COL).add({
        title:         title,
        titleLower:    title.toLowerCase().trim(),
        description:   desc,
        category:      category,
        tags:          _uploadTags.slice(),
        source:        source,
        fileType:      type,
        fileURL:       fileURL,
        externalLink:  type === 'link' ? linkUrl : '',
        fileName:      fileName,
        fileSize:      fileSize,
        uploadedBy:    user.uid,
        uploaderName:  user.displayName || user.email || 'Anonymous',
        uploadedAt:    fv.ts,
        status:        'pending',
        reviewNote:    '',
        bookmarkCount: 0,
        viewCount:     0,
        downloadCount: 0
      });
    }

    function _onDone() {
      if (progBar) progBar.style.width = '100%';
      if (progLbl) progLbl.textContent = 'Submitted ✓';
      _toast('✓ Resource submitted for review','success', 4000);
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
      _toast('Upload failed — '+(err && err.message ? err.message : 'please try again'),'error');
      if (btn) { btn.disabled = false; btn.textContent = '↑ SUBMIT FOR REVIEW'; }
      if (progWrap) progWrap.style.display = 'none';
    }

    if (type === 'link') {
      _saveDoc().then(_onDone).catch(_onErr);
    } else {
      var stor = _stor();
      if (!stor) { _toast('Storage not available — reload and try again','error'); _onErr(new Error('No storage')); return; }
      var uid = user.uid;
      var safeName = _selectedFile.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      var path = LIB_STORAGE + '/' + uid + '/' + Date.now() + '_' + safeName;
      var ref = stor.ref(path);
      var task = ref.put(_selectedFile);

      task.on('state_changed',
        function(snap) {
          var pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
          if (progBar) progBar.style.width = pct + '%';
          if (progLbl) progLbl.textContent = 'Uploading… ' + pct + '%';
        },
        _onErr,
        function() {
          task.snapshot.ref.getDownloadURL().then(function(url) {
            fileURL  = url;
            fileName = _selectedFile.name;
            fileSize = _selectedFile.size;
            return _saveDoc();
          }).then(_onDone).catch(_onErr);
        }
      );
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
      '&api_key=' + RS_PUBMED_KEY +
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

        var summaryUrl = base + 'esummary.fcgi?db=pubmed&retmode=json&api_key=' + RS_PUBMED_KEY +
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
      'db=pubmed&retmode=xml&rettype=abstract&api_key=' + RS_PUBMED_KEY +
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
    return '';
  }

  /* ═══════════════════════════════════════════════════════════════
     LAYER 2: CLINICAL GUIDELINES — UNIFIED MULTI-SOURCE SEARCH
     Fires PubMed, OpenAlex, Frontiers, and Elsevier (Scopus) in
     parallel — all filtered/boosted toward guidelines and reviews.
     Results are merged, deduped within the batch, then ranked:
       guideline > review > article.
  ═══════════════════════════════════════════════════════════════ */

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

  /* Unified wrapper — fires all 4 sources in parallel */
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
    return fetch(url, {
      headers: { 'X-ELS-APIKey': RS_ELSEVIER_KEY, 'Accept': 'application/json' }
    })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      var sr    = (data && data['search-results']) || {};
      var total = parseInt(sr['opensearch:totalResults'] || '0', 10) || 0;
      var items = sr.entry || [];
      var results = items.map(function(e, i) {
        var doi = (e['prism:doi'] || '').replace(/^https?:\/\/doi\.org\//i, '');
        var url = e['prism:url'] || (doi ? 'https://doi.org/' + doi : '');
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
    .catch(function(){ return { results: [], total: 0 }; });
  }

  /* PubMed search scoped to guideline orgs + guideline/review pub-types */
  function _glPubMedSearch(query, page) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var retstart = (page - 1) * GL_PAGE_SIZE;
    var base     = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
    var fullTerm = '(' + query + ') AND ' + GL_PT_FILTER + ' AND (' + GL_ORG_FILTER + ')';
    var searchUrl = base + 'esearch.fcgi?db=pubmed&retmode=json&retmax=' + GL_PAGE_SIZE +
      '&retstart=' + retstart + '&api_key=' + RS_PUBMED_KEY +
      '&term=' + encodeURIComponent(fullTerm);

    return fetch(searchUrl)
      .then(function(r){ return r.json(); })
      .then(function(data) {
        var ids   = (data.esearchresult && data.esearchresult.idlist) || [];
        var total = parseInt((data.esearchresult && data.esearchresult.count) || 0, 10);
        if (!ids.length) return { results: [], total: total };

        var summaryUrl = base + 'esummary.fcgi?db=pubmed&retmode=json&api_key=' + RS_PUBMED_KEY +
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
    var subLabels = { openalex: 'OpenAlex', frontiers: 'Frontiers', elsevier: 'Scopus' };
    var subCls    = { openalex: 'rs-badge-openalex', frontiers: 'rs-badge-frontiers', elsevier: 'rs-badge-scopus' };
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
        typeBadge + orgBadge + subBadge +
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
        'X-ELS-APIKey': RS_FRONTIERS_KEY,
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
        srcBadge + oaBadge +
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
   * Layer 3b: Elsevier — searches both Scopus and ScienceDirect in parallel,
   * normalises their responses, tags each result by sub-source, and merges
   * into one unified feed.  No UI selection required — always auto-queries.
   * ────────────────────────────────────────────────────────────────────────── */
  function _rsElsevierSearch(query, page) {
    if (!query) return Promise.resolve({ results: [], total: 0 });
    var start = (page - 1) * RS_ELSEVIER_SIZE;
    var headers = {
      'X-ELS-APIKey': RS_ELSEVIER_KEY,
      'Accept':       'application/json'
    };

    /* ── Scopus ── */
    var scopusUrl = RS_ELSEVIER_SCOPUS +
      '?query=TITLE-ABS-KEY(' + encodeURIComponent(query) + ')' +
      '&count=' + RS_ELSEVIER_SIZE +
      '&start=' + start +
      '&field=dc:title,dc:creator,prism:publicationName,prism:coverDate,prism:doi,prism:url,dc:description,openaccess,citedby-count,eid';

    var scopusPromise = fetch(scopusUrl, { headers: headers })
      .then(function(r) {
        if (!r.ok) throw new Error('Scopus ' + r.status);
        return r.json();
      })
      .then(function(data) {
        var sr     = (data && data['search-results']) || {};
        var total  = parseInt(sr['opensearch:totalResults'] || '0', 10) || 0;
        var items  = sr.entry || [];
        var results = items.map(function(e, i) {
          var doi = (e['prism:doi'] || '').replace(/^https?:\/\/doi\.org\//i, '');
          var url = e['prism:url'] || (doi ? 'https://doi.org/' + doi : '');
          var year = '';
          var d = e['prism:coverDate'] || '';
          var m = String(d).match(/\d{4}/);
          if (m) year = m[0];
          return {
            _src:      'elsevier',
            _sub:      'scopus',
            id:        'el_sc_' + (e['eid'] || i + '_' + page),
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
      .catch(function() { return { results: [], total: 0 }; });

    /* ── ScienceDirect ── */
    var sdUrl = RS_ELSEVIER_SD +
      '?query=' + encodeURIComponent(query) +
      '&count=' + RS_ELSEVIER_SIZE +
      '&start=' + start +
      '&field=dc:title,dc:creator,prism:publicationName,prism:coverDate,prism:doi,prism:url,dc:description,openaccess';

    var sdPromise = fetch(sdUrl, { headers: headers })
      .then(function(r) {
        if (!r.ok) throw new Error('ScienceDirect ' + r.status);
        return r.json();
      })
      .then(function(data) {
        var sr    = (data && data['search-results']) || {};
        var total = parseInt(sr['opensearch:totalResults'] || '0', 10) || 0;
        var items = sr.entry || [];
        var results = items.map(function(e, i) {
          var doi = (e['prism:doi'] || '').replace(/^https?:\/\/doi\.org\//i, '');
          var url = e['prism:url'] || (doi ? 'https://doi.org/' + doi : '');
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
      .catch(function() { return { results: [], total: 0 }; });

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
    var abstractHtml = hasAbstract
      ? '<div class="rs-result-abstract" id="el-abs-' + idx + '">' + _esc(r.abstract) + '</div>' +
        '<button class="rs-act-btn" style="font-size:8.5px;padding:3px 8px" ' +
          'onclick="LibraryModule.elToggleAbstract(' + idx + ')">Show more</button>'
      : '';

    return '<div class="rs-result" id="el-card-' + idx + '">' +
      '<div class="rs-result-title">'    + _esc(r.title)   + '</div>' +
      (r.authors ? '<div class="rs-result-authors">' + _esc(r.authors) + '</div>' : '') +
      '<div class="rs-result-meta">' +
        srcBadge + oaBadge + citBadge +
        (r.journal ? '<span class="rs-result-journal" title="' + _esc(r.journal) + '">' + _esc(r.journal) + '</span>' : '') +
        (r.year    ? '<span class="rs-result-year">'    + _esc(r.year)    + '</span>' : '') +
      '</div>' +
      abstractHtml +
      '<div class="rs-result-acts">' + actBtns + '</div>' +
    '</div>';
  }

  /* Toggle abstract for Elsevier card */
  function _elToggleAbstract(idx) {
    var absEl = document.getElementById('el-abs-' + idx);
    if (!absEl) return;
    var btn     = absEl.nextElementSibling;
    var expanded = absEl.classList.toggle('expanded');
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
        srcBadge +
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
              'placeholder="Search Oasis Library · PubMed · OpenAlex · Frontiers…" '+
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
     ADMIN API (consumed by admin dashboard)
  ════════════════════════════════════════════════════ */
  window.LibraryAdminAPI = {
    /**
     * Approve a resource.
     * @param {string} resourceId
     * @param {string} [note]      optional admin note
     */
    approve: function(resourceId, note) {
      var d = _db2();
      if (!d) return Promise.reject('No Firestore');
      return d.collection(LIB_COL).doc(resourceId).update({
        status:     'approved',
        reviewNote: note || '',
        reviewedAt: _fsv().ts
      });
    },
    /**
     * Reject a resource.
     * @param {string} resourceId
     * @param {string} note        reason for rejection (required)
     */
    reject: function(resourceId, note) {
      var d = _db2();
      if (!d) return Promise.reject('No Firestore');
      return d.collection(LIB_COL).doc(resourceId).update({
        status:     'rejected',
        reviewNote: note || 'Did not meet submission criteria.',
        reviewedAt: _fsv().ts
      });
    },
    /**
     * Update resource metadata (admin edit).
     * @param {string} resourceId
     * @param {Object} fields      partial update — any writable fields
     */
    update: function(resourceId, fields) {
      var d = _db2();
      if (!d) return Promise.reject('No Firestore');
      var safe = {};
      ['title','description','category','tags','source','status','reviewNote'].forEach(function(k){
        if (Object.prototype.hasOwnProperty.call(fields, k)) safe[k] = fields[k];
      });
      if (safe.title) safe.titleLower = safe.title.toLowerCase().trim();
      return d.collection(LIB_COL).doc(resourceId).update(safe);
    },
    /**
     * Delete a resource and its Storage file.
     * @param {string} resourceId
     */
    delete: function(resourceId) {
      var d = _db2();
      if (!d) return Promise.reject('No Firestore');
      return d.collection(LIB_COL).doc(resourceId).get().then(function(snap) {
        var data = snap.data() || {};
        var del = d.collection(LIB_COL).doc(resourceId).delete();
        if (data.fileURL) {
          var stor = _stor();
          if (stor) {
            try { stor.refFromURL(data.fileURL).delete().catch(function(){}); } catch(e){}
          }
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
      var d = _db2();
      if (!d) return Promise.reject('No Firestore');
      var q = d.collection(LIB_COL).orderBy('uploadedAt','desc').limit(300);
      if (status && status !== 'all') q = q.where('status','==',status);
      return q.get().then(function(snap) {
        return snap.docs.map(function(doc){ return Object.assign({id:doc.id}, doc.data()); });
      });
    },
    /**
     * Get categories list (for admin category manager).
     */
    getCategories: function() { return LIB_CATEGORIES.slice(); },
    /**
     * Expose Firestore collection name for direct admin queries.
     */
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
        _removeSentinel();
        _renderBrowse();
      }
    },

    filterByCategory: function(cat) {
      _filterCat = cat;
      document.querySelectorAll('[data-cat]').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-cat') === cat);
      });
      _renderBrowse();
    },
    filterByType: function(type) {
      _filterType = type;
      document.querySelectorAll('[data-ftype]').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-ftype') === type);
      });
      _renderBrowse();
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
