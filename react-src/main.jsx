import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const mountPoint = document.getElementById('oasis-react-root');
if (mountPoint) {
  createRoot(mountPoint).render(<App />);
}
