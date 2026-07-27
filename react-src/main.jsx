import React from 'react';
import { createRoot } from 'react-dom/client';
import BuySnackWidget from './BuySnackWidget.jsx';
import PNBagDatabase from './PNBagDatabase.jsx';
import PNCalculator from './PNCalculator.jsx';
import Screening from './Screening.jsx';

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
