import React from 'react';
import { createRoot } from 'react-dom/client';
import BuySnackWidget from './BuySnackWidget.jsx';

const mountPoint = document.getElementById('oasis-react-root');
if (mountPoint) {
  createRoot(mountPoint).render(<BuySnackWidget />);
}
