import React from 'react';
import { createRoot } from 'react-dom/client';
import BuySnackWidget from './BuySnackWidget.jsx';
import PNBagDatabase from './PNBagDatabase.jsx';
import PNCalculator from './PNCalculator.jsx';
import Screening from './Screening.jsx';
import { installGrowthChartsBridge } from './growthChartsBridge.jsx';
import DrugNutrientInteractions from './DrugNutrientInteractions.jsx';
import { DNI_DB, SEVERITY_CONFIG, searchDNI } from './dniData.js';

const buySnackMount = document.getElementById('oasis-react-root');
if (buySnackMount) {
  createRoot(buySnackMount).render(<BuySnackWidget />);
}

const pnDbMount = document.getElementById('pn-db-react-root');
if (pnDbMount) {
  createRoot(pnDbMount).render(<PNBagDatabase />);
}

const pnCalcMount = document.getElementById('pn-calc-react-root');
if (pnCalcMount) {
  createRoot(pnCalcMount).render(<PNCalculator />);
}

const screeningMount = document.getElementById('screening-react-root');
if (screeningMount) {
  createRoot(screeningMount).render(<Screening />);
}

const dniMount = document.getElementById('dni-react-root');
if (dniMount) {
  createRoot(dniMount).render(<DrugNutrientInteractions />);
}

// oasisAI.js reads these directly — same contract as the old dni.js exposed
window.DNI_DB = DNI_DB;
window._dniSearchFn = searchDNI;
window.DNI_SEVERITY = SEVERITY_CONFIG;

installGrowthChartsBridge();
