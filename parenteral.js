(function _installParenteralModule() {
'use strict';

// ── 1. BAG DATABASE ──────────────────────────────────────────────────
const PN_BAGS = {
  kabiven_1026:  { id:'kabiven_1026',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:1026,  aa:34,  nitrogen:5.4,  glucose:100, fat:40,  energy_total:900,  energy_np:800,  na:32,  k:24,  mg:4,   ca:2,   phosphate:10, osmolarity:1060, ph:5.6 },
  kabiven_1540:  { id:'kabiven_1540',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:1540,  aa:51,  nitrogen:8.1,  glucose:150, fat:60,  energy_total:1400, energy_np:1200, na:48,  k:36,  mg:6,   ca:3,   phosphate:15, osmolarity:1060, ph:5.6 },
  kabiven_2053:  { id:'kabiven_2053',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:2053,  aa:68,  nitrogen:10.8, glucose:200, fat:80,  energy_total:1900, energy_np:1600, na:64,  k:48,  mg:8,   ca:4,   phosphate:20, osmolarity:1060, ph:5.6 },
  kabiven_2566:  { id:'kabiven_2566',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:2566,  aa:85,  nitrogen:13.5, glucose:250, fat:100, energy_total:2300, energy_np:2000, na:80,  k:60,  mg:10,  ca:5,   phosphate:25, osmolarity:1060, ph:5.6 },
