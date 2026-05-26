// ═══════════════════════════════════════════════════════════════
// OASIS AI ASSISTANT — Groq API Integration
// Module: oasisAI.js
//
// Features:
//  - generatePES()         → PES statement generation
//  - generateADIME()       → ADIME note assistance
//  - generatePatientSummary() → Clinical patient summary
//  - analyzeNutritionAssessment() → Nutrition assessment analysis
//  - chatWithOasisAI()     → Clinical nutrition chat assistant
//
// Usage:
//  import or include oasisAI.js after main.js
//  All functions return Promises.
//
// eNCPT-informed, ASPEN/ESPEN/AND aligned prompts.
// Token-optimized for low-latency clinical use.
// ═══════════════════════════════════════════════════════════════

(function _OasisAI() {
  'use strict';

  // ── Configuration ────────────────────────────────────────────
  const GROQ_API_URL  = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_MODEL    = 'llama-3.3-70b-versatile';
  const MAX_TOKENS    = 900;

  // API key: set via window.GROQ_API_KEY (from .env / config) or fallback
  function _getKey() {
    return (typeof window !== 'undefined' && window.GROQ_API_KEY)
      ? window.GROQ_API_KEY
      : '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';
  }

  // ── eNCPT System Prompt (shared base) ───────────────────────
  const BASE_SYSTEM = `You are Oasis AI, a clinical nutrition decision support assistant embedded in the Oasis CNST platform. You are trained on the eNCPT (electronic Nutrition Care Process Terminology), ASPEN, ESPEN, AND, BAPEN, NICE, and WHO nutrition guidelines.

Rules:
- Use eNCPT terminology precisely (NCP domains: Intake, Clinical, Behavioral-Environmental, Functional).
- Be concise, evidence-based, and clinically structured.
- Do NOT provide definitive medical diagnoses. Support clinical reasoning.
- Use standardized nutrition diagnosis language (NB, NC, NI prefixes).
- Format responses in clean sections. Avoid unnecessary preamble.`;

  // ── Core API call ─────────────────────────────────────────────
  async function _groqChat(messages, maxTokens = MAX_TOKENS) {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${_getKey()}`
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        max_tokens:  maxTokens,
        temperature: 0.3,
        messages
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Groq API error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  // ════════════════════════════════════════════════════════════
  // 1. PES STATEMENT GENERATOR
  // ════════════════════════════════════════════════════════════
  /**
   * generatePES(opts)
   * opts: { diagnosis, etiology, signs, patientContext }
   * Returns: { pes, components: { problem, etiology, signs } }
   */
  async function generatePES(opts = {}) {
    const { diagnosis = '', etiology = '', signs = '', patientContext = '' } = opts;

    const userMsg = `Generate a clinical PES statement using eNCPT terminology.

Patient context: ${patientContext || 'Not specified'}
Nutrition problem / diagnosis: ${diagnosis}
Etiology / related factors: ${etiology}
Signs & symptoms / evidence: ${signs}

Output ONLY:
PROBLEM: [eNCPT nutrition diagnosis label + code if known]
ETIOLOGY: [related to…]
SIGNS/SYMPTOMS: [as evidenced by…]
PES STATEMENT: [Full integrated PES in one sentence]`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg }
    ]);

    return { raw: response, type: 'pes' };
  }

  // ════════════════════════════════════════════════════════════
  // 2. ADIME NOTE GENERATOR
  // ════════════════════════════════════════════════════════════
  /**
   * generateADIME(opts)
   * opts: { assessment, diagnosis, intervention, monitoring, patientContext }
   */
  async function generateADIME(opts = {}) {
    const {
      assessment    = '',
      diagnosis     = '',
      intervention  = '',
      monitoring    = '',
      patientContext = ''
    } = opts;

    const userMsg = `Generate a structured ADIME nutrition note.

Patient context: ${patientContext || 'Not specified'}
Assessment data provided: ${assessment || 'None'}
Nutrition diagnosis (PES): ${diagnosis || 'Not specified'}
Intervention ideas: ${intervention || 'Standard'}
Monitoring parameters: ${monitoring || 'Standard'}

Write a complete ADIME note with these exact headers:
ASSESSMENT:
DIAGNOSIS (PES):
INTERVENTION:
MONITORING & EVALUATION:

Be specific, concise, and clinically relevant. Use eNCPT language.`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg }
    ], 1000);

    return { raw: response, type: 'adime' };
  }

  // ════════════════════════════════════════════════════════════
  // 3. NUTRITION ASSESSMENT ANALYSIS
  // ════════════════════════════════════════════════════════════
  /**
   * analyzeNutritionAssessment(opts)
   * opts: { weight, height, bmi, age, sex, intake, labs, clinical }
   */
  async function analyzeNutritionAssessment(opts = {}) {
    const {
      weight   = '',
      height   = '',
      bmi      = '',
      age      = '',
      sex      = '',
      intake   = '',
      labs     = '',
      clinical = '',
      energy   = '',
      protein  = ''
    } = opts;

    const userMsg = `Analyze the following nutrition assessment data and provide clinical interpretation.

Demographics: Age ${age || '?'}, Sex: ${sex || '?'}
Anthropometrics: Weight ${weight || '?'} kg, Height ${height || '?'} cm, BMI ${bmi || '?'}
Estimated requirements: Energy ${energy || '?'} kcal, Protein ${protein || '?'} g
Dietary intake: ${intake || 'Not reported'}
Biochemical data: ${labs || 'Not provided'}
Clinical notes: ${clinical || 'Not provided'}

Provide:
NUTRITIONAL STATUS: [brief statement]
KEY FINDINGS: [bullet list of ≤4 key clinical findings]
NUTRITION DIAGNOSES TO CONSIDER: [≤3 PES-aligned diagnoses]
PRIORITY INTERVENTIONS: [≤3 concise interventions]
MONITORING PARAMETERS: [≤3 key parameters]`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg }
    ]);

    return { raw: response, type: 'assessment' };
  }

  // ════════════════════════════════════════════════════════════
  // 4. PATIENT SUMMARY GENERATOR
  // ════════════════════════════════════════════════════════════
  /**
   * generatePatientSummary(opts)
   * opts: { patientData, calcResults, screeningResults }
   */
  async function generatePatientSummary(opts = {}) {
    const { patientData = {}, calcResults = {}, screeningResults = {} } = opts;

    const userMsg = `Generate a concise clinical nutrition patient summary for handover or documentation.

Patient data: ${JSON.stringify(patientData)}
Calculator results: ${JSON.stringify(calcResults)}
Screening results: ${JSON.stringify(screeningResults)}

Format:
PATIENT NUTRITION SUMMARY
Date: [today]

NUTRITION STATUS: [1 sentence]
REQUIREMENTS: [Energy / Protein / Fluid]
CURRENT INTAKE: [Brief statement]
RISK LEVEL: [Low / Medium / High — with rationale]
ACTIVE NUTRITION DIAGNOSES: [PES statements]
PLAN: [Key interventions in 2–3 bullet points]
FOLLOW-UP: [Key monitoring parameters]

Keep it under 200 words. Use professional clinical language.`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg }
    ], 700);

    return { raw: response, type: 'summary' };
  }

  // ════════════════════════════════════════════════════════════
  // 5. CLINICAL NUTRITION CHAT
  // ════════════════════════════════════════════════════════════
  /**
   * chatWithOasisAI(userMessage, conversationHistory)
   * conversationHistory: array of { role: 'user'|'assistant', content: string }
   */
  async function chatWithOasisAI(userMessage, conversationHistory = []) {
    const messages = [
      { role: 'system', content: BASE_SYSTEM },
      ...conversationHistory.slice(-8), // keep last 8 turns for context
      { role: 'user',   content: userMessage }
    ];

    const response = await _groqChat(messages, 800);
    return { raw: response, type: 'chat' };
  }

  // ── Expose on window ─────────────────────────────────────────
  window.OasisAI = {
    generatePES,
    generateADIME,
    analyzeNutritionAssessment,
    generatePatientSummary,
    chatWithOasisAI
  };

  console.log('[OasisAI] Module loaded — Groq LLaMA 3.3 70B ready');
})();


// ═══════════════════════════════════════════════════════════════
// OASIS AI CHAT UI — Home Screen Widget
// Injects the AI chat panel into #home-tab-panel or #ai-chat-mount
// ═══════════════════════════════════════════════════════════════

(function _OasisAIChatUI() {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  let _history     = [];   // conversation history
  let _isLoading   = false;
  let _activeMode  = 'chat'; // 'chat' | 'pes' | 'adime' | 'assessment' | 'summary'

  // ── Mount point: injected into existing home tab ────────────
  function mount() {
    const mount = document.getElementById('oasis-ai-mount');
    if (!mount) return;
    mount.innerHTML = _buildUI();
    _bindEvents();
    _renderWelcome();
  }

  // ── Build HTML ──────────────────────────────────────────────
  function _buildUI() {
    return `
<div id="oai-root" style="
  font-family: var(--sans, 'Outfit', sans-serif);
  background: var(--surface2, #0d1a2b);
  border: 1px solid rgba(29,233,212,0.18);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(29,233,212,0.06);
">

  <!-- ── Header ── -->
  <div style="
    background: linear-gradient(135deg, rgba(29,233,212,0.10) 0%, rgba(96,165,250,0.07) 100%);
    border-bottom: 1px solid rgba(29,233,212,0.14);
    padding: 14px 16px 12px;
    display: flex; align-items: center; justify-content: space-between;
  ">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="
        width:32px;height:32px;border-radius:9px;flex-shrink:0;
        background:linear-gradient(135deg,rgba(29,233,212,0.2),rgba(96,165,250,0.15));
        border:1px solid rgba(29,233,212,0.3);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal,#1de9d4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/>
        </svg>
      </div>
      <div>
        <div style="font-family:var(--mono,'JetBrains Mono',monospace);font-size:11px;font-weight:800;letter-spacing:1.5px;color:var(--teal,#1de9d4);text-transform:uppercase">Oasis AI</div>
        <div style="font-family:var(--mono);font-size:8.5px;color:rgba(255,255,255,0.35);letter-spacing:0.5px;margin-top:1px">eNCPT · ASPEN · ESPEN · LLaMA 3.3</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <div id="oai-status-dot" style="width:7px;height:7px;border-radius:50%;background:rgba(29,233,212,0.4);transition:all .3s"></div>
      <span id="oai-status-lbl" style="font-family:var(--mono);font-size:8.5px;color:rgba(255,255,255,0.35);letter-spacing:0.5px">READY</span>
    </div>
  </div>

  <!-- ── Mode Selector ── -->
  <div id="oai-mode-bar" style="
    display:flex;overflow-x:auto;gap:0;
    border-bottom:1px solid rgba(255,255,255,0.06);
    scrollbar-width:none;
  ">
    ${_modeBtn('chat',       '💬', 'Chat')}
    ${_modeBtn('pes',        '📋', 'PES')}
    ${_modeBtn('adime',      '📝', 'ADIME')}
    ${_modeBtn('assessment', '🔬', 'Assess')}
    ${_modeBtn('summary',    '📄', 'Summary')}
  </div>

  <!-- ── Chat area ── -->
  <div id="oai-messages" style="
    height: 300px; overflow-y: auto; padding: 12px 14px; display:flex;
    flex-direction:column; gap:10px;
    scrollbar-width:thin; scrollbar-color:rgba(29,233,212,0.2) transparent;
  "></div>

  <!-- ── Form area ── -->
  <div id="oai-form-area">

    <!-- Default chat input -->
    <div id="oai-form-chat" style="border-top:1px solid rgba(255,255,255,0.06);padding:12px 14px">
      <div style="display:flex;gap:8px;align-items:flex-end">
        <textarea id="oai-input"
          placeholder="Ask about nutrition assessment, guidelines, drug-nutrient interactions…"
          rows="2"
          style="
            flex:1;resize:none;background:rgba(0,0,0,0.25);
            border:1px solid rgba(29,233,212,0.2);border-radius:10px;
            padding:10px 12px;font-family:var(--sans);font-size:12.5px;
            color:var(--text-bright,#f0f6fc);outline:none;line-height:1.6;
            transition:border-color .15s;
          "
          onfocus="this.style.borderColor='rgba(29,233,212,0.5)'"
          onblur="this.style.borderColor='rgba(29,233,212,0.2)'"
          onkeydown="OasisAIUI.handleKey(event)"
        ></textarea>
        <button id="oai-send-btn" onclick="OasisAIUI.sendChat()" style="
          width:42px;height:42px;border-radius:10px;flex-shrink:0;
          background:rgba(29,233,212,0.12);border:1px solid rgba(29,233,212,0.35);
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          transition:all .15s;color:var(--teal,#1de9d4);
        " onmouseover="this.style.background='rgba(29,233,212,0.22)'" onmouseout="this.style.background='rgba(29,233,212,0.12)'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        ${_quickBtn('Albumin levels significance', 'albumin')}
        ${_quickBtn('Calculate MUST score', 'must')}
        ${_quickBtn('Refeeding syndrome risk', 'refeeding')}
        ${_quickBtn('High protein foods', 'protein')}
      </div>
    </div>

    <!-- PES Form -->
    <div id="oai-form-pes" style="display:none;border-top:1px solid rgba(255,255,255,0.06);padding:14px">
      ${_formField('oai-pes-context', 'Patient Context', 'Age, diagnosis, clinical setting…', false)}
      ${_formField('oai-pes-problem', 'Nutrition Problem / Diagnosis *', 'e.g. Inadequate oral food/beverage intake', false)}
      ${_formField('oai-pes-etiology', 'Etiology (Related Factors) *', 'e.g. Anorexia related to chemotherapy', false)}
      ${_formField('oai-pes-signs', 'Signs & Symptoms *', 'e.g. 8% weight loss in 1 month, albumin 28 g/L', false)}
      <button onclick="OasisAIUI.runPES()" style="${_btnStyle()}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/></svg>
        Generate PES Statement
      </button>
    </div>

    <!-- ADIME Form -->
    <div id="oai-form-adime" style="display:none;border-top:1px solid rgba(255,255,255,0.06);padding:14px">
      ${_formField('oai-adime-context', 'Patient Context', '55yr F, post-op day 2, BMI 22…', false)}
      ${_formField('oai-adime-assessment', 'Assessment Data', 'Anthropometrics, labs, intake data…', true)}
      ${_formField('oai-adime-diagnosis', 'Nutrition Diagnosis (optional)', 'PES statement if known…', false)}
      ${_formField('oai-adime-intervention', 'Intervention Ideas', 'Oral supplements, dietitian review…', false)}
      <button onclick="OasisAIUI.runADIME()" style="${_btnStyle()}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Generate ADIME Note
      </button>
    </div>

    <!-- Assessment Form -->
    <div id="oai-form-assessment" style="display:none;border-top:1px solid rgba(255,255,255,0.06);padding:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        ${_inlineField('oai-ass-age', 'Age', 'yrs')}
        ${_inlineField('oai-ass-sex', 'Sex', 'M/F')}
        ${_inlineField('oai-ass-weight', 'Weight', 'kg')}
        ${_inlineField('oai-ass-height', 'Height', 'cm')}
        ${_inlineField('oai-ass-bmi', 'BMI', 'auto')}
        ${_inlineField('oai-ass-energy', 'Energy req.', 'kcal')}
        ${_inlineField('oai-ass-protein', 'Protein req.', 'g')}
      </div>
      ${_formField('oai-ass-intake', 'Dietary Intake', '1200 kcal/day, poor appetite…', false)}
      ${_formField('oai-ass-labs', 'Biochemical Data', 'Albumin 28 g/L, Hb 95 g/L, CRP elevated…', false)}
      ${_formField('oai-ass-clinical', 'Clinical Notes', 'Diagnosis, medications, relevant history…', false)}
      <button onclick="OasisAIUI.runAssessment()" style="${_btnStyle()}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Analyze Assessment
      </button>
    </div>

    <!-- Summary Form -->
    <div id="oai-form-summary" style="display:none;border-top:1px solid rgba(255,255,255,0.06);padding:14px">
      <p style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin:0 0 10px;line-height:1.6">
        Auto-pulls data from last calculator run. Or paste patient data below:
      </p>
      ${_formField('oai-sum-data', 'Patient Data (optional override)', 'Paste any relevant data…', true)}
      <button onclick="OasisAIUI.runSummary()" style="${_btnStyle()}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Generate Patient Summary
      </button>
    </div>

  </div><!-- /form area -->

  <!-- ── Footer ── -->
  <div style="
    padding:7px 14px;border-top:1px solid rgba(255,255,255,0.05);
    display:flex;align-items:center;justify-content:space-between;
  ">
    <span style="font-family:var(--mono);font-size:8px;color:rgba(255,255,255,0.2);letter-spacing:0.5px">CLINICAL SUPPORT ONLY · NOT A SUBSTITUTE FOR PROFESSIONAL JUDGEMENT</span>
    <button onclick="OasisAIUI.clearChat()" style="
      background:none;border:none;cursor:pointer;font-family:var(--mono);
      font-size:8px;color:rgba(255,255,255,0.2);letter-spacing:0.5px;
      transition:color .15s;padding:2px 6px;
    " onmouseover="this.style.color='rgba(248,113,113,0.6)'" onmouseout="this.style.color='rgba(255,255,255,0.2)'">
      CLEAR
    </button>
  </div>

</div>`;
  }

  function _modeBtn(id, emoji, label) {
    const active = id === 'chat';
    return `<button id="oai-mode-${id}" onclick="OasisAIUI.setMode('${id}')" style="
      flex:1;min-width:60px;padding:9px 6px;background:${active ? 'rgba(29,233,212,0.08)' : 'none'};
      border:none;border-bottom:2px solid ${active ? 'var(--teal,#1de9d4)' : 'transparent'};
      cursor:pointer;font-family:var(--mono);font-size:9px;font-weight:700;
      color:${active ? 'var(--teal,#1de9d4)' : 'rgba(255,255,255,0.35)'};
      letter-spacing:0.5px;transition:all .15s;white-space:nowrap;
    ">${emoji} ${label}</button>`;
  }

  function _quickBtn(label, id) {
    return `<button onclick="OasisAIUI.quickPrompt('${label}')" style="
      font-family:var(--mono);font-size:8.5px;padding:4px 10px;border-radius:100px;
      background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.18);
      color:rgba(29,233,212,0.7);cursor:pointer;white-space:nowrap;transition:all .15s;
    " onmouseover="this.style.background='rgba(29,233,212,0.14)'" onmouseout="this.style.background='rgba(29,233,212,0.06)'">${label}</button>`;
  }

  function _formField(id, label, placeholder, isTextarea) {
    const tag = isTextarea ? 'textarea' : 'input';
    const extra = isTextarea ? 'rows="3" style="resize:vertical;' : 'style="';
    return `
<div style="margin-bottom:8px">
  <label style="display:block;font-family:var(--mono);font-size:8.5px;font-weight:700;color:rgba(29,233,212,0.7);letter-spacing:1px;margin-bottom:5px;text-transform:uppercase">${label}</label>
  <${tag} id="${id}" placeholder="${placeholder}" ${extra}
    width:100%;box-sizing:border-box;background:rgba(0,0,0,0.25);
    border:1px solid rgba(29,233,212,0.18);border-radius:8px;padding:8px 10px;
    font-family:var(--sans);font-size:12px;color:var(--text-bright,#f0f6fc);
    outline:none;transition:border-color .15s;font-size:12px;"
    onfocus="this.style.borderColor='rgba(29,233,212,0.45)'"
    onblur="this.style.borderColor='rgba(29,233,212,0.18)'"
  >${isTextarea ? '</textarea>' : '">'}
</div>`;
  }

  function _inlineField(id, label, placeholder) {
    return `<div>
  <label style="display:block;font-family:var(--mono);font-size:8px;font-weight:700;color:rgba(29,233,212,0.6);letter-spacing:0.8px;margin-bottom:4px;text-transform:uppercase">${label}</label>
  <input id="${id}" placeholder="${placeholder}" style="
    width:100%;box-sizing:border-box;background:rgba(0,0,0,0.25);
    border:1px solid rgba(29,233,212,0.15);border-radius:7px;padding:7px 9px;
    font-family:var(--mono);font-size:11px;color:var(--text-bright,#f0f6fc);outline:none;"
    onfocus="this.style.borderColor='rgba(29,233,212,0.45)'"
    onblur="this.style.borderColor='rgba(29,233,212,0.15)'">
</div>`;
  }

  function _btnStyle() {
    return `
      width:100%;padding:11px;margin-top:6px;
      background:rgba(29,233,212,0.1);border:1px solid rgba(29,233,212,0.35);
      border-radius:10px;cursor:pointer;font-family:var(--mono);
      font-size:11px;font-weight:700;letter-spacing:0.8px;
      color:var(--teal,#1de9d4);display:flex;align-items:center;
      justify-content:center;gap:8px;transition:all .15s;
    `;
  }

  // ── Render helpers ────────────────────────────────────────────
  function _renderWelcome() {
    _addMsg('assistant', `**Oasis AI** is ready to assist.\n\nI can help with:\n• **PES statements** (eNCPT-aligned)\n• **ADIME notes** for clinical documentation\n• **Nutrition assessment** analysis\n• **Patient summary** generation\n• **Clinical nutrition questions** — guidelines, interactions, calculations\n\nSwitch modes above or type your question below.`);
  }

  function _addMsg(role, content) {
    const el   = document.getElementById('oai-messages');
    if (!el) return;

    const isUser = role === 'user';
    const div  = document.createElement('div');
    div.style.cssText = `
      display:flex;flex-direction:column;
      align-items:${isUser ? 'flex-end' : 'flex-start'};
      animation:oaiFadeIn .25s ease;
    `;

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      max-width:88%;padding:10px 13px;border-radius:12px;
      font-family:var(--sans);font-size:12.5px;line-height:1.7;
      ${isUser
        ? 'background:rgba(29,233,212,0.12);border:1px solid rgba(29,233,212,0.25);color:var(--text-bright,#f0f6fc);border-bottom-right-radius:4px;'
        : 'background:rgba(15,30,50,0.8);border:1px solid rgba(255,255,255,0.07);color:var(--text,#c9d1d9);border-bottom-left-radius:4px;'}
    `;

    bubble.innerHTML = _formatMessage(content);
    div.appendChild(bubble);
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  }

  function _addThinking() {
    const el = document.getElementById('oai-messages');
    if (!el) return;

    const div = document.createElement('div');
    div.id = 'oai-thinking';
    div.style.cssText = 'display:flex;align-items:flex-start;animation:oaiFadeIn .25s ease;';
    div.innerHTML = `
      <div style="
        padding:10px 14px;border-radius:12px;border-bottom-left-radius:4px;
        background:rgba(15,30,50,0.8);border:1px solid rgba(255,255,255,0.07);
        display:flex;align-items:center;gap:6px;
      ">
        <span id="oai-think-dot1" style="width:6px;height:6px;border-radius:50%;background:rgba(29,233,212,0.5);animation:oaiPulse 1.4s ease .0s infinite"></span>
        <span id="oai-think-dot2" style="width:6px;height:6px;border-radius:50%;background:rgba(29,233,212,0.5);animation:oaiPulse 1.4s ease .2s infinite"></span>
        <span id="oai-think-dot3" style="width:6px;height:6px;border-radius:50%;background:rgba(29,233,212,0.5);animation:oaiPulse 1.4s ease .4s infinite"></span>
        <span style="font-family:var(--mono);font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:0.5px;margin-left:2px">Oasis AI thinking…</span>
      </div>`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  }

  function _removeThinking() {
    const t = document.getElementById('oai-thinking');
    if (t) t.remove();
  }

  function _formatMessage(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-bright,#f0f6fc)">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="font-family:var(--mono);font-size:11px;background:rgba(29,233,212,0.1);padding:1px 5px;border-radius:4px;color:var(--teal,#1de9d4)">$1</code>')
      .replace(/^#{1,3} (.+)$/gm, '<div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--teal,#1de9d4);letter-spacing:1px;text-transform:uppercase;margin:8px 0 4px">$1</div>')
      .replace(/^•\s(.+)$/gm, '<div style="padding-left:12px;position:relative"><span style="position:absolute;left:2px;color:var(--teal,#1de9d4)">▸</span>$1</div>')
      .replace(/^[-]\s(.+)$/gm, '<div style="padding-left:12px;position:relative"><span style="position:absolute;left:2px;color:rgba(29,233,212,0.5)">–</span>$1</div>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function _setStatus(loading) {
    _isLoading = loading;
    const dot = document.getElementById('oai-status-dot');
    const lbl = document.getElementById('oai-status-lbl');
    const btn = document.getElementById('oai-send-btn');
    if (dot) dot.style.background = loading ? 'rgba(240,180,41,0.8)' : 'rgba(29,233,212,0.6)';
    if (dot) dot.style.boxShadow  = loading ? '0 0 8px rgba(240,180,41,0.5)' : '0 0 6px rgba(29,233,212,0.3)';
    if (lbl) lbl.textContent = loading ? 'THINKING' : 'READY';
    if (btn) btn.disabled = loading;
    if (btn) btn.style.opacity = loading ? '0.5' : '1';
  }

  function _setMode(mode) {
    _activeMode = mode;
    const forms = ['chat','pes','adime','assessment','summary'];
    forms.forEach(f => {
      const form = document.getElementById(`oai-form-${f}`);
      const btn  = document.getElementById(`oai-mode-${f}`);
      const active = f === mode;
      if (form) form.style.display = active ? 'block' : 'none';
      if (btn) {
        btn.style.color       = active ? 'var(--teal,#1de9d4)' : 'rgba(255,255,255,0.35)';
        btn.style.borderColor = active ? 'var(--teal,#1de9d4)' : 'transparent';
        btn.style.background  = active ? 'rgba(29,233,212,0.08)' : 'none';
      }
    });
  }

  // ── Event binding ─────────────────────────────────────────────
  function _bindEvents() {
    // inject CSS animations
    if (!document.getElementById('oai-styles')) {
      const style = document.createElement('style');
      style.id = 'oai-styles';
      style.textContent = `
        @keyframes oaiFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes oaiPulse  { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
        #oai-messages::-webkit-scrollbar{width:4px}
        #oai-messages::-webkit-scrollbar-thumb{background:rgba(29,233,212,0.2);border-radius:2px}
        #oai-mode-bar::-webkit-scrollbar{display:none}
      `;
      document.head.appendChild(style);
    }

    // BMI auto-calc for assessment form
    ['oai-ass-weight','oai-ass-height'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => {
        const w = parseFloat(document.getElementById('oai-ass-weight')?.value);
        const h = parseFloat(document.getElementById('oai-ass-height')?.value) / 100;
        const bmiEl = document.getElementById('oai-ass-bmi');
        if (bmiEl && w > 0 && h > 0) bmiEl.value = (w / (h*h)).toFixed(1);
      });
    });
  }

  // ── Public UI actions ─────────────────────────────────────────
  async function sendChat() {
    if (_isLoading) return;
    const input = document.getElementById('oai-input');
    const msg   = (input?.value || '').trim();
    if (!msg) return;

    input.value = '';
    _addMsg('user', msg);
    _history.push({ role: 'user', content: msg });
    _setStatus(true);
    _addThinking();

    try {
      const result  = await window.OasisAI.chatWithOasisAI(msg, _history.slice(0,-1));
      _removeThinking();
      _addMsg('assistant', result.raw);
      _history.push({ role: 'assistant', content: result.raw });
    } catch (e) {
      _removeThinking();
      _addMsg('assistant', `⚠️ **Error:** ${e.message}\n\nPlease check your connection and try again.`);
    } finally {
      _setStatus(false);
    }
  }

  async function runPES() {
    if (_isLoading) return;
    const opts = {
      patientContext: document.getElementById('oai-pes-context')?.value,
      diagnosis:      document.getElementById('oai-pes-problem')?.value,
      etiology:       document.getElementById('oai-pes-etiology')?.value,
      signs:          document.getElementById('oai-pes-signs')?.value,
    };
    if (!opts.diagnosis) { _showFormError('Please enter a nutrition diagnosis / problem.'); return; }

    _addMsg('user', `**PES Request:** ${opts.diagnosis} | ${opts.etiology || 'etiology not specified'}`);
    _setStatus(true);
    _addThinking();

    try {
      const result = await window.OasisAI.generatePES(opts);
      _removeThinking();
      _addMsg('assistant', `📋 **PES STATEMENT**\n\n${result.raw}`);
    } catch(e) {
      _removeThinking();
      _addMsg('assistant', `⚠️ **Error:** ${e.message}`);
    } finally {
      _setStatus(false);
    }
  }

  async function runADIME() {
    if (_isLoading) return;
    const opts = {
      patientContext: document.getElementById('oai-adime-context')?.value,
      assessment:     document.getElementById('oai-adime-assessment')?.value,
      diagnosis:      document.getElementById('oai-adime-diagnosis')?.value,
      intervention:   document.getElementById('oai-adime-intervention')?.value,
    };

    _addMsg('user', `**ADIME Note Request** — ${opts.patientContext || 'Patient context not specified'}`);
    _setStatus(true);
    _addThinking();

    try {
      const result = await window.OasisAI.generateADIME(opts);
      _removeThinking();
      _addMsg('assistant', `📝 **ADIME NOTE**\n\n${result.raw}`);
    } catch(e) {
      _removeThinking();
      _addMsg('assistant', `⚠️ **Error:** ${e.message}`);
    } finally {
      _setStatus(false);
    }
  }

  async function runAssessment() {
    if (_isLoading) return;
    const opts = {
      age:     document.getElementById('oai-ass-age')?.value,
      sex:     document.getElementById('oai-ass-sex')?.value,
      weight:  document.getElementById('oai-ass-weight')?.value,
      height:  document.getElementById('oai-ass-height')?.value,
      bmi:     document.getElementById('oai-ass-bmi')?.value,
      energy:  document.getElementById('oai-ass-energy')?.value,
      protein: document.getElementById('oai-ass-protein')?.value,
      intake:  document.getElementById('oai-ass-intake')?.value,
      labs:    document.getElementById('oai-ass-labs')?.value,
      clinical:document.getElementById('oai-ass-clinical')?.value,
    };

    _addMsg('user', `**Assessment Analysis** — ${opts.weight || '?'}kg, ${opts.height || '?'}cm, BMI ${opts.bmi || '?'}, Age ${opts.age || '?'}`);
    _setStatus(true);
    _addThinking();

    try {
      const result = await window.OasisAI.analyzeNutritionAssessment(opts);
      _removeThinking();
      _addMsg('assistant', `🔬 **NUTRITION ASSESSMENT ANALYSIS**\n\n${result.raw}`);
    } catch(e) {
      _removeThinking();
      _addMsg('assistant', `⚠️ **Error:** ${e.message}`);
    } finally {
      _setStatus(false);
    }
  }

  async function runSummary() {
    if (_isLoading) return;

    // Try to pull from existing calc data
    const calcData  = (typeof getUniversalCalcData === 'function') ? getUniversalCalcData() : {};
    const customData = document.getElementById('oai-sum-data')?.value;

    const opts = {
      calcResults:  calcData || {},
      patientData:  customData ? { raw: customData } : {},
    };

    _addMsg('user', '**Patient Summary Request** — pulling current session data…');
    _setStatus(true);
    _addThinking();

    try {
      const result = await window.OasisAI.generatePatientSummary(opts);
      _removeThinking();
      _addMsg('assistant', `📄 **PATIENT NUTRITION SUMMARY**\n\n${result.raw}`);
    } catch(e) {
      _removeThinking();
      _addMsg('assistant', `⚠️ **Error:** ${e.message}`);
    } finally {
      _setStatus(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  }

  function quickPrompt(text) {
    const input = document.getElementById('oai-input');
    if (input) input.value = text;
    sendChat();
  }

  function clearChat() {
    _history = [];
    const el = document.getElementById('oai-messages');
    if (el) el.innerHTML = '';
    _renderWelcome();
  }

  function _showFormError(msg) {
    try { showToast(msg, 'error', 3000); } catch(e) { alert(msg); }
  }

  // ── Public API ────────────────────────────────────────────────
  window.OasisAIUI = {
    mount,
    setMode:      _setMode,
    sendChat,
    runPES,
    runADIME,
    runAssessment,
    runSummary,
    handleKey,
    quickPrompt,
    clearChat
  };

  // ── Auto-mount on DOMContentLoaded ────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 600));
  } else {
    setTimeout(mount, 300);
  }

  console.log('[OasisAIUI] Chat UI module loaded');
})();
