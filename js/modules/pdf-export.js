// SAVE TO PDF — Universal print-to-PDF for all results sections
// Uses browser print dialog with PDF print destination.
// sectionId: optional — if supplied, only that element is printed.
// title: optional — window title for the PDF.
// ════════════════════════════════════════════════════════════════
function saveToPDF(sectionId, title) {
  const section = sectionId ? document.getElementById(sectionId) : null;
  const pdfTitle = title || 'Oasis — Report';
  const timestamp = new Date().toLocaleString();

  // Build print content
  const html = section ? section.innerHTML : document.getElementById('results-section')?.innerHTML || document.body.innerHTML;

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) { showToast('Allow pop-ups to save PDF', 'warning'); return; }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${pdfTitle}</title>
  <meta charset="UTF-8">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;padding:20px 28px;max-width:780px;margin:0 auto;line-height:1.5}
    h1{font-size:17px;color:#005e52;border-bottom:2px solid #005e52;padding-bottom:7px;margin-bottom:16px}
    h2,h3{font-size:12px;color:#005e52;margin:14px 0 6px;text-transform:uppercase;letter-spacing:1px}
    table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
    td,th{padding:6px 9px;border:1px solid #c8d4e0;text-align:left}
    th{background:#e4eef8;font-weight:700;color:#1a3a5c}
    .card,.card-body,.mc,.plan-block,.alert,.info-note{background:#f8fbff;border:1px solid #c8d4e0;border-radius:5px;padding:10px 12px;margin-bottom:10px}
    .card-header{background:#e4eef8;padding:7px 12px;margin:-10px -12px 10px;border-bottom:1px solid #c8d4e0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1a3a5c}
    .metrics-grid,.who-tile-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
    .mc,.who-tile{padding:8px 10px;background:#f0f6ff;border:1px solid #b8d0e8;border-radius:4px}
    .m-val,.fenton-big,.who-tile-z{font-size:18px;font-weight:700;color:#005e52}
    .m-lbl,.m-unit,.m-range,.who-tile-label,.who-tile-sub{font-size:11px;color:#4a6a8a}
    .alert.danger{background:#fff0f0;border-color:#f5b8b8;color:#7f1d1d}
    .alert.warning{background:#fffbe6;border-color:#f5d87a;color:#78350f}
    .alert.info{background:#eff8ff;border-color:#93c5fd;color:#1e3a5f}
    .alert.success{background:#f0fdf4;border-color:#86efac;color:#14532d}
    .plan-block-title{font-weight:700;font-size:11px;color:#1a3a5c;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #c8d4e0}
    .pi{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #dde8f0;font-size:11px}
    .pi .k{color:#4a6a8a}.pi .v{font-weight:700;color:#005e52}
    .dtbl{width:100%;border-collapse:collapse;font-size:11px}
    .dtbl th{background:#e4eef8;color:#1a3a5c;padding:6px 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #b8d0e8}
    .dtbl td{padding:6px 8px;border-bottom:1px solid #dde8f0;color:#222;vertical-align:top}
    .cmam-banner,.muac-indicator{padding:9px 12px;border-radius:4px;border:1px solid #c8d4e0;margin-bottom:10px;font-size:11px}
    .pctl-bar-wrap,.who-z-bar-wrap,.adequacy-bar{display:none} /* hide SVG bars in PDF */
    #r-patient-bar{background:#e4eef8;border:1px solid #b8cce0;border-radius:4px;padding:8px 12px;margin-bottom:12px;font-size:11px;color:#1a3a5c}
    .results-title{font-size:15px;font-weight:800;color:#005e52;margin-bottom:12px}
    .divider-lbl{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#4a6a8a;padding:10px 0 6px;border-top:1px solid #c8d4e0;margin-top:12px}
    .info-note{background:#eff8ff;border-color:#93c5fd;color:#1a3a5c;padding:8px 12px;font-size:11px}
    button,.calc-btn,.print-btn,.preset-btn,.preset-strip,
    .support-header-btn,.hscroll-btn{display:none!important}
    .c-t{color:#007a68}.c-a{color:#92400e}.c-b{color:#1e40af}.c-g{color:#065f46}.c-r{color:#b91c1c}
    .pdf-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #005e52}
    .pdf-header h1{border:none;padding:0;margin:0}
    .pdf-meta{font-size:11px;color:#4a6a8a;text-align:right;line-height:1.8}
    .pdf-footer{margin-top:20px;padding-top:10px;border-top:1px solid #c8d4e0;font-size:11px;color:#666;text-align:center;line-height:1.8}
    .pdf-disclaimer{background:#fff8e1;border:1px solid #f9c942;border-radius:4px;padding:8px 12px;font-size:11px;color:#5c4200;margin-top:14px}
    @media print{
      body{padding:10px 14px}
      @page{margin:14mm 10mm}
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <h1> Oasis</h1>
    <div class="pdf-meta">
      ${pdfTitle}<br>
      Generated: ${timestamp}
    </div>
  </div>
  ${html}
  <div class="pdf-disclaimer">
     <strong>Clinical Decision Support Only.</strong> This report is generated by Oasis as a clinical decision support aid. All prescriptions and dietary interventions must be reviewed and authorised by a qualified dietitian or clinician before implementation.
  </div>
  <div class="pdf-footer">
    Oasis · ASPEN 2016 / ASPEN 2022 · ESPEN 2019 · NICE CG32 · KDIGO · EASL · WHO<br>
    Developed by Edison Taimu · Kamuzu University of Health Sciences · Malawi
  </div>
</body>
</html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 500);
}

function copyPESStatement() {
  const gen  = window._pesGenerated || {};
  const notes = document.getElementById('pes-notes')?.value?.trim() || '';
  let txt = '';
  if (gen.statement) txt += 'NUTRITION DIAGNOSIS — PES STATEMENTS (' + (gen.count||1) + ' diagnosis' + (gen.count > 1 ? 'es' : '') + '):\n' + gen.statement + '\n\n';
  if (gen.insights)  txt += 'CLINICAL NUTRITION INSIGHTS:\n' + gen.insights;
  if (notes)         txt += '\n\nCLINICIAN NOTES:\n' + notes;
  if (!txt.trim()) { showToast('Nothing to copy'); return; }
  navigator.clipboard?.writeText(txt.trim()).then(() => showToast('✓ PES & Insights copied')).catch(() => showToast('Copy failed'));
}

function downloadCSV(filename,headers,rows) {
  const csv=[headers,...rows].map(row=>row.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=filename; a.click(); showToast('✓ CSV downloaded');
}


// MODULE: SETTINGS & THEMES
const THEMES={ocean:{bg:'#07111c',surface:'#0d1e30',surface2:'#112437',surface3:'#162c42',border:'#224060',teal:'#00d4b8',tealDim:'#00b8a0'},slate:{bg:'#0e0e14',surface:'#16162a',surface2:'#1c1c36',surface3:'#222240',border:'#2e2e50',teal:'#a78bfa',tealDim:'#8b6df5'},forest:{bg:'#071410',surface:'#0d2018',surface2:'#122a20',surface3:'#173428',border:'#1a3a28',teal:'#4ade80',tealDim:'#22c55e'},amber:{bg:'#130e05',surface:'#1c1508',surface2:'#261c0a',surface3:'#30230d',border:'#3a2a10',teal:'#fbbf24',tealDim:'#f59e0b'},clinical:{bg:'#040d18',surface:'#081624',surface2:'#0c1e30',surface3:'#10263c',border:'#1a3a58',teal:'#4db8e8',tealDim:'#2a9fd4'},midnight:{bg:'#000000',surface:'#080810',surface2:'#0e0e1a',surface3:'#141422',border:'#1e1e32',teal:'#00e5ff',tealDim:'#00b8cc'}};
function applyTheme(name){const t=THEMES[name];if(!t)return;const r=document.documentElement.style;r.setProperty('--bg',t.bg);r.setProperty('--surface',t.surface);r.setProperty('--surface2',t.surface2);r.setProperty('--surface3',t.surface3);r.setProperty('--border',t.border);r.setProperty('--teal',t.teal);r.setProperty('--teal-dim',t.tealDim);r.setProperty('--teal-glow',`rgba(0,0,0,.15)`);if(name==='clinical'){r.setProperty('--text','#c8dff0');r.setProperty('--text-dim','#6899bb');r.setProperty('--text-bright','#e8f4ff');}else{r.setProperty('--text','#cce0f5');r.setProperty('--text-dim','#6890b8');r.setProperty('--text-bright','#eaf4ff');}document.querySelectorAll('.theme-swatch').forEach(s=>s.classList.remove('active'));const el=document.getElementById('th-'+name);if(el)el.classList.add('active');currentSettings.theme=name;try{const _s=DataService.get('settings')||{};_s.theme=name;DataService.save('settings',_s);}catch(e){}}
function applyFontSize(sz){
  const map={sm:'12px',md:'14px',lg:'16px',xl:'19px'};
  const size = map[sz] || '14px';
  const scale = {sm:0.857,md:1,lg:1.143,xl:1.357}[sz] || 1; // relative to 14px base

  // Set root font size so rem units cascade
  document.documentElement.style.fontSize = size;
  document.body.style.fontSize = size;

  // Inject/update a comprehensive override that covers explicit px values
  // by scaling every text element relative to a CSS custom property.
  const FSID = 'nt-fontsize-override';
  let fsEl = document.getElementById(FSID);
  if (!fsEl) { fsEl = document.createElement('style'); fsEl.id = FSID; document.head.appendChild(fsEl); }

  // We set --fs-scale on :root and use it to override common explicit sizes
  fsEl.textContent = `
    :root {
      --fs-scale: ${scale};
      --fs-base:  ${size};
      --fs-xs:    calc(9px  * ${scale});
      --fs-sm:    calc(10px * ${scale});
      --fs-body:  calc(12px * ${scale});
      --fs-md:    calc(13px * ${scale});
      --fs-lg:    calc(14px * ${scale});
      --fs-xl:    calc(16px * ${scale});
      --fs-2xl:   calc(18px * ${scale});
      --fs-3xl:   calc(22px * ${scale});
    }
    html, body { font-size: ${size} !important; }
    /* Cards, labels, rows */
    .card-title, .card-badge, .sdr-lbl, .sdr-item-lbl, .sdr-group-label,
    .lbl, .sdr-sub, .sdr-item-sub, .alert div, .plan-block-title,
    .m-lbl, .m-unit, .m-range, .pedi-mc-label, .pedi-mc-sub,
    .pedi-row-label, .pedi-row-value, .pedi-row-note,
    .pedi-z-title, .pedi-z-detail-label, .pedi-z-detail-val, .pedi-note,
    .tab-label, .sdr-chip { font-size: calc(var(--fs-body) * 1) !important; }
    /* Primary values */
    .m-val, .pedi-mc-value { font-size: calc(var(--fs-3xl)) !important; }
    .pedi-z-score { font-size: calc(24px * ${scale}) !important; }
    /* Body text, descriptions */
    p, li, td, th, label, span:not(.logo-name-nutri):not(.logo-name-track):not(.logo-name-pro),
    div.sdr-lbl, div.sdr-sub, div.sdr-item-sub { font-size: calc(var(--fs-md)) !important; }
    /* Buttons */
    .calc-btn, .print-btn, .preset-btn, button.sdr-chip,
    button.sdr-reset, button.sdr-save { font-size: calc(var(--fs-body)) !important; }
    /* Section titles, headings */
    h1,h2,h3,h4 { font-size: calc(var(--fs-xl)) !important; }
    .results-title, .card-title { font-size: calc(var(--fs-lg)) !important; }
    /* Keep mono data readability — scale but don't stretch too much */
    .mono-data, .fenton-big { font-size: calc(var(--fs-2xl)) !important; }
  `;

  // Clear active chips
  ['sz-sm','sz-md','sz-lg','sz-xl'].forEach(id => document.getElementById(id)?.classList.remove('active'));
  document.getElementById('sz-' + sz)?.classList.add('active');
  currentSettings.fontSize = sz;
}
function applyCompact(on){document.querySelectorAll('.card-body').forEach(el=>el.style.padding=on?'12px':'');document.querySelectorAll('.form-row').forEach(el=>el.style.marginBottom=on?'8px':'');currentSettings.compact=on;}
function applyStatusBar(on){document.getElementById('status-bar').style.display=on?'':'none';}

// ── APPEARANCE MODE ────────────────────────────────────────────────
/**
 * applyAppearanceMode('dark'|'amoled'|'hc')
 * Applies the chosen appearance mode, updates buttons, persists choice.
 */

// ══════════════════════════════════════════════════════════════════
