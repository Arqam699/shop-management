import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, Printer, X, Receipt } from 'lucide-react';

const ExistingPrintPopup = ({ kind, recordId, onClose }) => {
  const frameRef = useRef(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!kind || !recordId) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); onCloseRef.current?.(); }
      if (event.key === 'Tab') {
        const items = [closeButtonRef.current, ...dialogRef.current?.querySelectorAll('[data-print-popup-action]') || []].filter((item) => item && !item.disabled);
        const first = items[0]; const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [kind, recordId]);

  const source = kind === 'invoice'
    ? '/invoices/' + encodeURIComponent(recordId) + '?popup=1'
    : '/payments?receipt=' + encodeURIComponent(recordId) + '&popup=1';

  useEffect(() => {
    setFrameLoaded(false);
    setReady(false);
    setLoadError('');
  }, [source]);

  useEffect(() => {
    if (!kind || !recordId || !frameLoaded) return undefined;
    let timedOut = false;
    const timer = setInterval(() => {
      if (timedOut) return;
      try {
        const frameWindow = frameRef.current?.contentWindow;
        const frameDocument = frameRef.current?.contentDocument;
        const targetId = kind === 'invoice' ? 'printable-thermal-invoice' : 'printable-receipt-content';
        const target = frameDocument?.getElementById(targetId);
        if (!frameWindow || !target || typeof frameWindow.__shopPrintCurrentView !== 'function') return;

        let style = frameDocument.getElementById('existing-print-popup-styles');
        if (!style) {
          style = frameDocument.createElement('style');
          style.id = 'existing-print-popup-styles';
          frameDocument.head.appendChild(style);
        }
        style.textContent = kind === 'invoice'
          ? '@media screen { #printable-thermal-invoice { position: fixed !important; top: 16px !important; left: 50% !important; transform: translateX(-50%) !important; width: min(80mm, calc(100vw - 24px)) !important; max-width: none !important; max-height: calc(100vh - 32px) !important; overflow: auto !important; z-index: 99999 !important; } }'
          : '@media screen { #printable-receipt-wrapper { position: fixed !important; inset: 0 !important; z-index: 99999 !important; background: #fff !important; } #printable-receipt-modal-container > div:first-child { display: none !important; } #printable-receipt-modal-container { max-height: 100vh !important; } #printable-receipt-content { max-height: none !important; overflow: visible !important; } }';

        // Remove sibling route content from layout, while retaining the original print target and its ancestor structure.
        let branch = target;
        while (branch && branch !== frameDocument.body) {
          const parent = branch.parentElement;
          if (!parent) break;
          Array.from(parent.children).forEach((sibling) => {
            if (sibling !== branch) sibling.style.setProperty('display', 'none', 'important');
          });
          branch = parent;
        }
        setReady(true);
        clearInterval(timer);
        window.clearTimeout(timeout);
      } catch (error) {
        console.error('Could not prepare the print preview frame:', error);
      }
    }, 150);
    const timeout = window.setTimeout(() => {
      timedOut = true;
      clearInterval(timer);
      setLoadError('Preview could not be loaded. Close this window and try again.');
    }, 15000);
    return () => { clearInterval(timer); window.clearTimeout(timeout); };
  }, [frameLoaded, kind, recordId]);

  if (!kind || !recordId) return null;

  const printExistingDesign = () => {
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow) return;
    frameWindow.focus();
    if (typeof frameWindow.__shopPrintCurrentView === 'function') {
      frameWindow.__shopPrintCurrentView();
    } else {
      frameWindow.print();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="existing-print-popup-title" className="flex h-[min(88dvh,48rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Receipt className="h-5 w-5" /></span>
            <div><h2 id="existing-print-popup-title" className="font-black text-slate-900">{kind === 'invoice' ? 'Invoice Preview' : 'Payment Receipt Preview'}</h2><p className="text-xs text-slate-500">{kind === 'invoice' ? 'Original invoice layout' : 'Original receipt layout'}</p></div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close print popup" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="relative min-h-0 flex-1 bg-white">
          <iframe ref={frameRef} key={source} title={kind === 'invoice' ? 'Invoice preview' : 'Payment receipt preview'} src={source} onLoad={() => setFrameLoaded(true)} className={`h-full w-full border-0 bg-white transition-opacity duration-200 ${ready ? 'opacity-100' : 'opacity-0'}`} />
          {!ready && !loadError && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center text-sm font-semibold text-slate-500"><LoaderCircle className="h-6 w-6 animate-spin text-blue-600" /><span>Loading print preview…</span></div>}
          {loadError && <div role="status" className="absolute inset-0 flex items-center justify-center bg-white p-6 text-center text-sm font-semibold text-slate-600">{loadError}</div>}
        </div>
        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <button type="button" data-print-popup-action onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Done</button>
          <button type="button" data-print-popup-action onClick={printExistingDesign} disabled={!ready} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"><Printer className="h-4 w-4" /> {ready ? 'Print' : 'Loading preview…'}</button>
        </footer>
      </section>
    </div>, document.body
  );
};

export default ExistingPrintPopup;
