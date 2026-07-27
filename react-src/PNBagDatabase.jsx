import React from 'react';
import './PNBagDatabase.css';
import { PN_BAGS } from './pnBagsData.js';

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
