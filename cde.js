(function _installCDE() {
'use strict';

// ─────────────────────────────────────────────────────────────────
// SECTION 1: GUIDELINE DATABASE
// Redirected to UnifiedNutritionGuidelineEngine — single source of truth.
// All energy + protein ranges, TPN limits, and lab thresholds are now
// maintained exclusively in window.UnifiedNutritionGuidelineEngine._data.
// Do NOT add local energy/protein entries here — update the unified engine.
// ─────────────────────────────────────────────────────────────────
var _GL = window.UnifiedNutritionGuidelineEngine
  ? window.UnifiedNutritionGuidelineEngine._data
  : {
    /* Emergency fallback — should never be reached */
    energy:  { general: {min:25, max:30, src:'ESPEN 2023'} },
    protein: { general: {min:0.8, max:1.5, src:'ASPEN/ESPEN 2022'} },
    labs:    { phosphate_critical:0.30, phosphate_low:0.75, potassium_critical:2.5, albumin_severe:25, bilirubin_severe:100, bilirubin_moderate:50, trig_hold:4.5, glucose_hyper:12, egfr_severe:30 }
  };

// ─────────────────────────────────────────────────────────────────
// SECTION 2: PUBLIC GUIDELINE ENGINE API
// NTGuidelineEngine is now a backward-compatible alias for
// UnifiedNutritionGuidelineEngine. All new code should call
// window.UnifiedNutritionGuidelineEngine directly.
// ─────────────────────────────────────────────────────────────────
window.NTGuidelineEngine = window.UnifiedNutritionGuidelineEngine;

// ─────────────────────────────────────────────────────────────────
// SECTION 3: CLINICAL DECISION ENGINE
// ─────────────────────────────────────────────────────────────────
window.NTClinicalDecision = {

  /* ── Core analysis: reads lastCalcData + lab DOM values ────── */
  analyze: function() {
    var d = window.lastCalcData;
    if (!d || !d.weight) return [];

    var alerts = [];
    var wt   = parseFloat(d.weight) || 0;
    var eCal = parseFloat(d.energy) || 0;
