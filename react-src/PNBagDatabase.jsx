import React from 'react';
import './PNBagDatabase.css';

const PN_BAGS = {
  kabiven_1026:  { vol:1026,  aa:34,  nitrogen:5.4,  glucose:100, fat:40,  energy_total:900,  na:32,  k:24,  mg:4,   ca:2,   phosphate:10, osmolarity:1060, ph:5.6, route:'central' },
  kabiven_1540:  { vol:1540,  aa:51,  nitrogen:8.1,  glucose:150, fat:60,  energy_total:1400, na:48,  k:36,  mg:6,   ca:3,   phosphate:15, osmolarity:1060, ph:5.6, route:'central' },
  kabiven_2053:  { vol:2053,  aa:68,  nitrogen:10.8, glucose:200, fat:80,  energy_total:1900, na:64,  k:48,  mg:8,   ca:4,   phosphate:20, osmolarity:1060, ph:5.6, route:'central' },
  kabiven_2566:  { vol:2566,  aa:85,  nitrogen:13.5, glucose:250, fat:100, energy_total:2300, na:80,  k:60,  mg:10,  ca:5,   phosphate:25, osmolarity:1060, ph:5.6, route:'central' },
  nutriflex_peri_1875:    { vol:1875, aa:60,  nitrogen:8.6,  glucose:120, fat:75,  energy_total:1435, na:75,   k:45,   mg:4.5, ca:4.5, phosphate:11.3, osmolarity:840,  ph:null, route:'peripheral' },
  nutriflex_peri_2500:    { vol:2500, aa:80,  nitrogen:11.4, glucose:160, fat:100, energy_total:1910, na:100,  k:60,   mg:6,   ca:6,   phosphate:15,   osmolarity:840,  ph:null, route:'peripheral' },
  nutriflex_plus_1875:    { vol:1875, aa:72,  nitrogen:10,   glucose:225, fat:75,  energy_total:1900, na:75,   k:52.5, mg:6,   ca:6,   phosphate:22.5, osmolarity:1215, ph:null, route:'central' },
  nutriflex_plus_2500:    { vol:2500, aa:96,  nitrogen:14,   glucose:300, fat:100, energy_total:2530, na:100,  k:70,   mg:8,   ca:8,   phosphate:30,   osmolarity:1215, ph:null, route:'central' },
  nutriflex_special_625:  { vol:625,  aa:36,  nitrogen:5,    glucose:90,  fat:25,  energy_total:740,  na:33.5, k:23.5, mg:2.65,ca:2.65,phosphate:10,   osmolarity:1545, ph:null, route:'central' },
  nutriflex_special_1250: { vol:1250, aa:72,  nitrogen:10,   glucose:180, fat:50,  energy_total:1475, na:67,   k:47,   mg:5.3, ca:5.3, phosphate:20,   osmolarity:1545, ph:null, route:'central' },
  nutriflex_special_1875: { vol:1875, aa:108, nitrogen:15,   glucose:270, fat:75,  energy_total:2215, na:100.5,k:70.5, mg:8,   ca:8,   phosphate:30,   osmolarity:1545, ph:null, route:'central' },
  nutriflex_special_2500: { vol:2500, aa:144, nitrogen:20,   glucose:360, fat:100, energy_total:2950, na:134,  k:94,   mg:10.6,ca:10.6,phosphate:40,   osmolarity:1545, ph:null, route:'central' },
  clinimix_275_5:  { vol:1000, aa:27.5, nitrogen:null, glucose:50,  fat:0, energy_total:280,  na:35, k:30, mg:null, ca:4.5, phosphate:15, osmolarity:570,  ph:6.0, route:'peripheral' },
  clinimix_275_10: { vol:1000, aa:27.5, nitrogen:null, glucose:100, fat:0, energy_total:450,  na:35, k:30, mg:null, ca:4.5, phosphate:15, osmolarity:880,  ph:6.0, route:'central' },
  clinimix_425_5:  { vol:1000, aa:42.5, nitrogen:null, glucose:50,  fat:0, energy_total:340,  na:35, k:30, mg:null, ca:4.5, phosphate:15, osmolarity:880,  ph:6.0, route:'peripheral' },
  clinimix_425_10: { vol:1000, aa:42.5, nitrogen:null, glucose:100, fat:0, energy_total:510,  na:35, k:30, mg:null, ca:4.5, phosphate:15, osmolarity:1035, ph:6.0, route:'central' },
  clinimix_425_25: { vol:1000, aa:42.5, nitrogen:null, glucose:250, fat:0, energy_total:1020, na:35, k:30, mg:null, ca:4.5, phosphate:15, osmolarity:1825, ph:6.0, route:'central' },
  clinimix_5_15:   { vol:1000, aa:50,   nitrogen:null, glucose:150, fat:0, energy_total:710,  na:35, k:30, mg:null, ca:4.5, phosphate:15, osmolarity:1395, ph:6.0, route:'central' },
  clinimix_5_20:   { vol:1000, aa:50,   nitrogen:null, glucose:200, fat:0, energy_total:880,  na:35, k:30, mg:null, ca:4.5, phosphate:15, osmolarity:1650, ph:6.0, route:'central' },
  clinimix_5_25:   { vol:1000, aa:50,   nitrogen:null, glucose:250, fat:0, energy_total:1050, na:35, k:30, mg:null, ca:4.5, phosphate:15, osmolarity:1900, ph:6.0, route:'central' },
};

const GROUPS = [
  { label: 'Kabiven — Fresenius Kabi · 3-in-1 · Central vein', ids: ['kabiven_1026','kabiven_1540','kabiven_2053','kabiven_2566'] },
  { label: 'NuTRIflex Lipid Peri — B. Braun · 3-in-1 · Peripheral/Central', ids: ['nutriflex_peri_1875','nutriflex_peri_2500'] },
  { label: 'NuTRIflex Lipid Plus — B. Braun · 3-in-1 · Central', ids: ['nutriflex_plus_1875','nutriflex_plus_2500'] },
  { label: 'NuTRIflex Lipid Special — B. Braun · 3-in-1 · Central', ids: ['nutriflex_special_625','nutriflex_special_1250','nutriflex_special_1875','nutriflex_special_2500'] },
  { label: 'Clinimix E — Baxter · 2-in-1 · No lipid (add IVFE separately)', ids: ['clinimix_275_5','clinimix_275_10','clinimix_425_5','clinimix_425_10','clinimix_425_25','clinimix_5_15','clinimix_5_20','clinimix_5_25'] },
];

const COLUMNS = ['Vol (mL)','AA (g)','N₂ (g)','Glucose (g)','Fat (g)','Energy (kcal)','Na (mmol)','K (mmol)','Mg (mmol)','Ca (mmol)','PO₄ (mmol)','Osm (mOsm/L)','pH','Route'];

export default function PNBagDatabase() {
  return (
    <div className="pn-db-wrap">
      {GROUPS.map(g => (
        <div key={g.label} className="pn-db-group">
          <div className="pn-db-group-label">{g.label}</div>
          <div className="pn-db-scroll">
            <table className="pn-db-table">
              <thead>
                <tr>
                  {COLUMNS.map(c => <th key={c}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {g.ids.map((id, i) => {
                  const b = PN_BAGS[id];
                  return (
                    <tr key={id} className={i % 2 === 0 ? 'pn-db-row-alt' : ''}>
                      <td className="pn-db-vol">{b.vol}</td>
                      <td className="pn-db-aa">{b.aa}</td>
                      <td>{b.nitrogen ?? '—'}</td>
                      <td className="pn-db-glu">{b.glucose}</td>
                      <td className="pn-db-fat">{b.fat || '—'}</td>
                      <td className="pn-db-energy">{b.energy_total}</td>
                      <td>{b.na}</td>
                      <td>{b.k}</td>
                      <td>{b.mg ?? '—'}</td>
                      <td>{b.ca ?? '—'}</td>
                      <td>{b.phosphate ?? '—'}</td>
                      <td>{b.osmolarity ?? '—'}</td>
                      <td>{b.ph ?? '—'}</td>
                      <td className={b.route === 'peripheral' ? 'pn-db-route-peri' : 'pn-db-route-central'}>{b.route}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <div className="pn-db-sources">
        Sources: Kabiven Summary of Product Characteristics (Fresenius Kabi 2006) · NuTRIflex Lipid composition chart (B. Braun July 2015) · Clinimix E sulfite-free Prescribing Information (Baxter 2010). Osmolarity: Kabiven ≈1060 mOsm/L after mixing · NuTRIflex Peri 840, Plus 1215, Special 1545 mOsm/L. 20% IVFE = 2 kcal/mL.
      </div>
    </div>
  );
}
