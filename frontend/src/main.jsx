import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Silence noisy logs in production, but keep
// warnings and errors visible for debugging.
if (import.meta.env.PROD) {
  window.console.log = () => {};
  window.console.debug = () => {};
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);