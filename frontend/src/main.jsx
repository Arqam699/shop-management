import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Apply bold weight to every print layout across the app, then restore the
// screen styles after the print dialog closes.
let previousPrintFontWeights = [];
window.addEventListener('beforeprint', () => {
  previousPrintFontWeights = Array.from(document.body.querySelectorAll('*'), (element) => ({
    element,
    value: element.style.getPropertyValue('font-weight'),
    priority: element.style.getPropertyPriority('font-weight'),
    fontFamily: element.style.getPropertyValue('font-family'),
    fontFamilyPriority: element.style.getPropertyPriority('font-family'),
  }));
  previousPrintFontWeights.forEach(({ element }) => {
    element.style.setProperty('font-family', 'Arial, Helvetica, sans-serif', 'important');
    element.style.setProperty('font-weight', '900', 'important');
  });
});

window.addEventListener('afterprint', () => {
  previousPrintFontWeights.forEach(({ element, value, priority, fontFamily, fontFamilyPriority }) => {
    if (value) element.style.setProperty('font-weight', value, priority);
    else element.style.removeProperty('font-weight');
    if (fontFamily) element.style.setProperty('font-family', fontFamily, fontFamilyPriority);
    else element.style.removeProperty('font-family');
  });
  previousPrintFontWeights = [];
});

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
