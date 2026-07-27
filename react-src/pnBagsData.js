// Canonical PN bag reference data — copied exactly from parenteral.js PN_BAGS.
// Single source of truth for both PNBagDatabase.jsx (browse) and PNCalculator.jsx (bag matching).

export const PN_BAGS = {
  kabiven_1026:  { id:'kabiven_1026',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:1026,  aa:34,  nitrogen:5.4,  glucose:100, fat:40,  energy_total:900,  energy_np:800,  na:32,  k:24,  mg:4,   ca:2,   phosphate:10, osmolarity:1060, ph:5.6 },
  kabiven_1540:  { id:'kabiven_1540',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:1540,  aa:51,  nitrogen:8.1,  glucose:150, fat:60,  energy_total:1400, energy_np:1200, na:48,  k:36,  mg:6,   ca:3,   phosphate:15, osmolarity:1060, ph:5.6 },
  kabiven_2053:  { id:'kabiven_2053',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:2053,  aa:68,  nitrogen:10.8, glucose:200, fat:80,  energy_total:1900, energy_np:1600, na:64,  k:48,  mg:8,   ca:4,   phosphate:20, osmolarity:1060, ph:5.6 },
  kabiven_2566:  { id:'kabiven_2566',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:2566,  aa:85,  nitrogen:13.5, glucose:250, fat:100, energy_total:2300, energy_np:2000, na:80,  k:60,  mg:10,  ca:5,   phosphate:25, osmolarity:1060, ph:5.6 },
  nutriflex_peri_1875:    { id:'nutriflex_peri_1875',    brand:'NuTRIflex Lipid Peri',    manufacturer:'B. Braun', type:'3-in-1', route:'peripheral', vol:1875,  aa:60,  nitrogen:8.6,  glucose:120, fat:75,  energy_total:1435, energy_np:null, na:75,   k:45,   mg:4.5, ca:4.5, phosphate:11.3, osmolarity:840,  ph:null },
  nutriflex_peri_2500:    { id:'nutriflex_peri_2500',    brand:'NuTRIflex Lipid Peri',    manufacturer:'B. Braun', type:'3-in-1', route:'peripheral', vol:2500,  aa:80,  nitrogen:11.4, glucose:160, fat:100, energy_total:1910, energy_np:null, na:100,  k:60,   mg:6,   ca:6,   phosphate:15,   osmolarity:840,  ph:null },
  nutriflex_plus_1875:    { id:'nutriflex_plus_1875',    brand:'NuTRIflex Lipid Plus',    manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:1875,  aa:72,  nitrogen:10,   glucose:225, fat:75,  energy_total:1900, energy_np:null, na:75,   k:52.5, mg:6,   ca:6,   phosphate:22.5, osmolarity:1215, ph:null },
  nutriflex_plus_2500:    { id:'nutriflex_plus_2500',    brand:'NuTRIflex Lipid Plus',    manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:2500,  aa:96,  nitrogen:14,   glucose:300, fat:100, energy_total:2530, energy_np:null, na:100,  k:70,   mg:8,   ca:8,   phosphate:30,   osmolarity:1215, ph:null },
  nutriflex_special_625:  { id:'nutriflex_special_625',  brand:'NuTRIflex Lipid Special', manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:625,   aa:36,  nitrogen:5,    glucose:90,  fat:25,  energy_total:740,  energy_np:null, na:33.5, k:23.5, mg:2.65,ca:2.65,phosphate:10,   osmolarity:1545, ph:null },
  nutriflex_special_1250: { id:'nutriflex_special_1250', brand:'NuTRIflex Lipid Special', manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:1250,  aa:72,  nitrogen:10,   glucose:180, fat:50,  energy_total:1475, energy_np:null, na:67,   k:47,   mg:5.3, ca:5.3, phosphate:20,   osmolarity:1545, ph:null },
  nutriflex_special_1875: { id:'nutriflex_special_1875', brand:'NuTRIflex Lipid Special', manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:1875,  aa:108, nitrogen:15,   glucose:270, fat:75,  energy_total:2215, energy_np:null, na:100.5,k:70.5, mg:8,   ca:8,   phosphate:30,   osmolarity:1545, ph:null },
  nutriflex_special_2500: { id:'nutriflex_special_2500', brand:'NuTRIflex Lipid Special', manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:2500,  aa:144, nitrogen:20,   glucose:360, fat:100, energy_total:2950, energy_np:null, na:134,  k:94,   mg:10.6,ca:10.6,phosphate:40,   osmolarity:1545, ph:null },
  clinimix_275_5:  { id:'clinimix_275_5',  brand:'Clinimix E 2.75/5',  manufacturer:'Baxter', type:'2-in-1', route:'peripheral', vol:1000, aa:27.5, glucose:50,  fat:0, energy_total:280,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:570,  ph:6.0, aa_pct:2.75, dex_pct:5  },
  clinimix_275_10: { id:'clinimix_275_10', brand:'Clinimix E 2.75/10', manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:27.5, glucose:100, fat:0, energy_total:450,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:880,  ph:6.0, aa_pct:2.75, dex_pct:10 },
  clinimix_425_5:  { id:'clinimix_425_5',  brand:'Clinimix E 4.25/5',  manufacturer:'Baxter', type:'2-in-1', route:'peripheral', vol:1000, aa:42.5, glucose:50,  fat:0, energy_total:340,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:880,  ph:6.0, aa_pct:4.25, dex_pct:5  },
  clinimix_425_10: { id:'clinimix_425_10', brand:'Clinimix E 4.25/10', manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:42.5, glucose:100, fat:0, energy_total:510,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:1035, ph:6.0, aa_pct:4.25, dex_pct:10 },
  clinimix_425_25: { id:'clinimix_425_25', brand:'Clinimix E 4.25/25', manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:42.5, glucose:250, fat:0, energy_total:1020, na:35, k:30, ca:4.5, phosphate:15, osmolarity:1825, ph:6.0, aa_pct:4.25, dex_pct:25 },
  clinimix_5_15:   { id:'clinimix_5_15',   brand:'Clinimix E 5/15',    manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:50,   glucose:150, fat:0, energy_total:710,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:1395, ph:6.0, aa_pct:5,    dex_pct:15 },
  clinimix_5_20:   { id:'clinimix_5_20',   brand:'Clinimix E 5/20',    manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:50,   glucose:200, fat:0, energy_total:880,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:1650, ph:6.0, aa_pct:5,    dex_pct:20 },
  clinimix_5_25:   { id:'clinimix_5_25',   brand:'Clinimix E 5/25',    manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:50,   glucose:250, fat:0, energy_total:1050, na:35, k:30, ca:4.5, phosphate:15, osmolarity:1900, ph:6.0, aa_pct:5,    dex_pct:25 },
};

export const PN_FLUID_RATES = {
  adult:        { lo: 30, hi: 40, label: '30–40 mL/kg/day (adult standard)' },
  pedi:         { lo: 100, hi: 120, label: '100–120 mL/kg/day (paediatric default)' },
  preterm_elbw: { lo: 100, hi: 150, label: '100–150 mL/kg/day (ELBW/VLBW — ESPGHAN 2022)' },
  preterm_lbw:  { lo: 140, hi: 160, label: '140–160 mL/kg/day (LBW stable)' },
  neonate:      { lo: 140, hi: 170, label: '140–170 mL/kg/day (term neonate)' },
  infant:       { lo: 120, hi: 150, label: '120–150 mL/kg/day (infant)' },
};
