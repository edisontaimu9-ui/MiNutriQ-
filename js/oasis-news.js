// ═══════════════════════════════════════════════════════════════
// MODULE: OASIS NEWS FEED
// Fetches clinical nutrition news from oasis-nutrition-api
// (Django/APScheduler — hosted on Render)
// Exposes: window.OasisNews.init(), .refresh(), .switchFilter()
// ═══════════════════════════════════════════════════════════════
(function OasisNews() {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────
  // Override via localStorage ('oasis_news_api') for local dev switching.
  const NEWS_API = (function () {
    return localStorage.getItem('oasis_news_api') || 'https://oasis-nutrition-api.onrender.com/api/v1';
  })();

  const PAGE_SIZE = 10;

  // ── State ──────────────────────────────────────────────────────
  var _state = {
    articles:    [],
    page:        1,
    totalCount:  0,
    loading:     false,
    error:       null,
    filter: {
      category: '',
      region:   '',
      search:   '',
    },
  };

  // ── DOM refs (set on init) ──────────────────────────────────────
  var _el = {};

  // ── Fetch helpers ───────────────────────────────────────────────
  function _buildUrl(path, params) {
    var url = NEWS_API + path;
    var q   = Object.keys(params || {})
      .filter(function (k) { return params[k] !== '' && params[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');
    return q ? url + '?' + q : url;
  }

  function _fetch(path, params) {
    return fetch(_buildUrl(path, params), { signal: AbortSignal.timeout(12000) })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
  }

  // ── Render helpers ──────────────────────────────────────────────
  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var CATEGORY_LABELS = {
    clinical_nutrition: 'Clinical',
    dietetics:          'Dietetics',
    research:           'Research',
    public_health:      'Public Health',
    pediatric:          'Pediatric',
    malnutrition:       'Malnutrition',
    food_security:      'Food Security',
    policy:             'Policy',
    education:          'Education',
    other:              'Other',
  };

  var REGION_COLOR = {
    malawi:  'var(--teal)',
    africa:  '#f0b429',
    global:  'var(--text-muted)',
  };

  function _catColor(cat) {
    var map = {
      clinical_nutrition: 'var(--teal)',
      research:           '#a78bfa',
      pediatric:          '#34d399',
      malnutrition:       '#fb7185',
      policy:             '#60a5fa',
      public_health:      '#f0b429',
    };
    return map[cat] || 'var(--text-muted)';
  }

  function _relTime(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var diff = Date.now() - d.getTime();
    if (diff < 0) return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    var m = Math.floor(diff / 60000);
    if (m < 1)    return 'just now';
    if (m < 60)   return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24)   return h + 'h ago';
    var days = Math.floor(h / 24);
    if (days < 30) return days + 'd ago';
    return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  }

  function _articleCard(a) {
    var catLabel = CATEGORY_LABELS[a.category] || a.category;
    var catColor = _catColor(a.category);
    var regColor = REGION_COLOR[a.region] || 'var(--text-muted)';
    var time     = _relTime(a.published_at || a.crawled_at);
    var summary  = a.summary ? _esc(a.summary.slice(0, 140)) + (a.summary.length > 140 ? '…' : '') : '';
    var source   = a.source_name ? _esc(a.source_name) : '';
    var journal  = a.journal    ? ' · ' + _esc(a.journal.slice(0, 40)) : '';

    return '<a class="on-article-card" href="' + _esc(a.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + _esc(a.title) + '">' +
      '<div class="on-card-meta">' +
        '<span class="on-cat-chip" style="color:' + catColor + ';border-color:' + catColor + '22">' + _esc(catLabel) + '</span>' +
        (a.region !== 'global' ? '<span class="on-region-chip" style="color:' + regColor + '">' + _esc(a.region.toUpperCase()) + '</span>' : '') +
        '<span class="on-time">' + _esc(time) + '</span>' +
      '</div>' +
      '<div class="on-card-title">' + _esc(a.title) + '</div>' +
      (summary ? '<div class="on-card-summary">' + summary + '</div>' : '') +
      '<div class="on-card-source">' + _esc(source) + _esc(journal) + '</div>' +
    '</a>';
  }

  // ── Render list ─────────────────────────────────────────────────
  function _renderList() {
    var list = _el.list;
    if (!list) return;

    if (_state.loading && _state.articles.length === 0) {
      list.innerHTML = '<div class="on-skeleton-wrap">' +
        [1,2,3,4].map(function () {
          return '<div class="on-skeleton"></div>';
        }).join('') + '</div>';
      return;
    }

    if (_state.error) {
      list.innerHTML = '<div class="on-empty">' +
        '<div class="on-empty-icon">⚡</div>' +
        '<div class="on-empty-title">API offline</div>' +
        '<div class="on-empty-desc">The news server may be starting up.<br>Render free instances spin down after inactivity — please wait a moment and retry.</div>' +
        '<button class="on-retry-btn" onclick="OasisNews.refresh()">Retry</button>' +
      '</div>';
      return;
    }

    if (_state.articles.length === 0) {
      list.innerHTML = '<div class="on-empty">' +
        '<div class="on-empty-icon">📰</div>' +
        '<div class="on-empty-title">No articles found</div>' +
        '<div class="on-empty-desc">Try a different filter or trigger a crawl.</div>' +
      '</div>';
      return;
    }

    list.innerHTML = _state.articles.map(_articleCard).join('');

    // Load more button
    if (_state.articles.length < _state.totalCount) {
      list.innerHTML += '<button class="on-load-more" onclick="OasisNews.loadMore()">' +
        'Load more <span style="opacity:.5">(' + (_state.totalCount - _state.articles.length) + ' remaining)</span>' +
      '</button>';
    }
  }

  function _setLoading(v) {
    _state.loading = v;
    if (_el.refresh) {
      _el.refresh.style.opacity  = v ? '0.4' : '1';
      _el.refresh.disabled = v;
    }
  }

  function _renderStats(stats) {
    if (!_el.stats || !stats) return;
    _el.stats.innerHTML =
      '<span class="on-stat"><b>' + (stats.total_articles || 0) + '</b> articles</span>' +
      '<span class="on-stat-sep">·</span>' +
      '<span class="on-stat"><b>' + (stats.sources_active || 0) + '</b> sources</span>' +
      (stats.last_crawl
        ? '<span class="on-stat-sep">·</span><span class="on-stat">crawled ' + _relTime(stats.last_crawl.completed_at) + '</span>'
        : '');
  }

  // ── Load data ───────────────────────────────────────────────────
  function _load(reset) {
    if (_state.loading) return;
    if (reset) {
      _state.page     = 1;
      _state.articles = [];
      _state.error    = null;
    }

    _setLoading(true);
    _renderList();

    var params = {
      page:      _state.page,
      page_size: PAGE_SIZE,
    };
    if (_state.filter.category) params.category = _state.filter.category;
    if (_state.filter.region)   params.region   = _state.filter.region;
    if (_state.filter.search)   params.search   = _state.filter.search;

    _fetch('/articles/', params)
      .then(function (data) {
        _state.totalCount = data.count || 0;
        var results = data.results || data;
        if (reset) {
          _state.articles = results;
        } else {
          _state.articles = _state.articles.concat(results);
        }
        _state.error = null;
      })
      .catch(function (err) {
        _state.error = err.message || 'Network error';
      })
      .finally(function () {
        _setLoading(false);
        _renderList();
      });

    // Fetch stats separately (non-blocking)
    if (reset) {
      _fetch('/articles/stats/')
        .then(_renderStats)
        .catch(function () {}); // silent
    }
  }

  // ── Search debounce ─────────────────────────────────────────────
  var _searchTimer = null;
  function _onSearch(e) {
    var q = e.target.value.trim();
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(function () {
      _state.filter.search = q;
      _load(true);
    }, 420);
  }

  // ── Public API ──────────────────────────────────────────────────
  window.OasisNews = {

    init: function () {
      _el.list    = document.getElementById('on-article-list');
      _el.stats   = document.getElementById('on-stats-bar');
      _el.refresh = document.getElementById('on-refresh-btn');
      _el.search  = document.getElementById('on-search-input');

      if (_el.search) {
        _el.search.addEventListener('input', _onSearch);
        _el.search.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            clearTimeout(_searchTimer);
            _state.filter.search = _el.search.value.trim();
            _load(true);
          }
        });
      }

      _load(true);
    },

    refresh: function () {
      if (_el.search) _el.search.value = '';
      _state.filter = { category: '', region: '', search: '' };
      // Reset active filter chips
      document.querySelectorAll('.on-filter-chip').forEach(function (c) {
        c.classList.remove('on-chip-active');
        if (c.dataset.value === '') c.classList.add('on-chip-active');
      });
      _load(true);
    },

    switchFilter: function (type, value, el) {
      // Deactivate siblings
      var siblings = document.querySelectorAll('.on-filter-chip[data-type="' + type + '"]');
      siblings.forEach(function (c) { c.classList.remove('on-chip-active'); });
      if (el) el.classList.add('on-chip-active');

      _state.filter[type] = value;
      _load(true);
    },

    loadMore: function () {
      _state.page++;
      _load(false);
    },

    triggerCrawl: function () {
      var btn = document.getElementById('on-crawl-btn');
      if (btn) { btn.textContent = 'Crawling…'; btn.disabled = true; }

      fetch(NEWS_API + '/crawl/trigger/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    '{}',
      })
        .then(function (r) { return r.json(); })
        .then(function () {
          if (btn) { btn.textContent = 'Triggered ✓'; }
          setTimeout(function () {
            if (btn) { btn.textContent = 'Crawl now'; btn.disabled = false; }
            _load(true);
          }, 8000);
        })
        .catch(function () {
          // Offline or request failed — queue a Background Sync retry so it
          // fires automatically once connectivity returns (no-ops if unsupported).
          if (window._registerBackgroundSync) window._registerBackgroundSync('news-crawl-retry');
          if (btn) { btn.textContent = 'Failed'; btn.disabled = false; }
        });
    },
  };

  // ── Auto-init when tab is opened ────────────────────────────────
  // Hooks into switchTab so we lazy-init only when needed
  document.addEventListener('DOMContentLoaded', function () {
    var _origSwitch = window.switchTab;
    if (typeof _origSwitch === 'function') {
      window.switchTab = function (tab) {
        _origSwitch(tab);
        if (tab === 'news' && _state.articles.length === 0 && !_state.loading) {
          window.window.OasisNews.init();
        }
      };
    }
  });

})();
