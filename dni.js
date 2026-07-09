(function _installDNIModule() {
'use strict';

// ══════════════════════════════════════════════════════════════════════
// 1.  DATABASE  — sourced from Krause & Mahan 16th ed. Appendix 13
//     Each entry: { id, drug, aliases[], category, subcategory,
//                   effects[], implications[], severity, tags[] }
//     severity: 'info' | 'caution' | 'moderate' | 'major'
// ══════════════════════════════════════════════════════════════════════

var DNI_DB = [

  // ── ANTIBACTERIALS ────────────────────────────────────────────────

  {
    id:'penicillins', drug:'Penicillins',
    aliases:['amoxicillin','amoxil','augmentin','amoxicillin/clavulanic acid','penicillin VK','pen-vk','piperacillin/tazobactam','zosyn'],
    category:'Anti-infective', subcategory:'Antibacterial — Penicillins',
    effects:[
      'Short-term: diarrhea',
      'Long-term: oral candidiasis, epigastric distress, C. difficile',
      'Pen-VK contains potassium (0.73–1.44 mEq/tab); Zosyn contains sodium (125–256 mg/dose)',
    ],
    implications:[
      'Take Augmentin with food to reduce GI distress',
      'Replace fluids and electrolytes for diarrhea',
      'Probiotic recommended during and after course',
