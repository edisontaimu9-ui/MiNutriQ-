import React from 'react';
import { createRoot } from 'react-dom/client';
import BuySnackWidget from './BuySnackWidget.jsx';
import PNBagDatabase from './PNBagDatabase.jsx';

const buySnackMount = document.getElementById('oasis-react-root');
if (buySnackMount) {
  createRoot(buySnackMount).render(<BuySnackWidget />);
}

const pnDbMount = document.getElementById('pn-db-react-root');
if (pnDbMount) {
  createRoot(pnDbMount).render(<PNBagDatabase />);
}
