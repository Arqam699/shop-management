import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Production mein console logs ko disable karne ke liye
if (import.meta.env.PROD) {
  window.console.log = () => {};
  window.console.info = () => {};
  window.console.warn = () => {};
  window.console.error = () => {};
  window.console.debug = () => {};
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);