import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import {
  ArrowLeft,
  Printer,
  RectangleVertical,
  RectangleHorizontal,
  Scissors,
  AlertCircle,
  Sparkles,
  Receipt,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  Package,
  CreditCard,
  Building2,
  Fingerprint,
} from 'lucide-react';

const InvoiceDetails = () => {
  const { id } = useParams();
  const { settings } = useSettings();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  // =========================================================
  // FETCH INVOICE
  // =========================================================
  const fetchInvoice = async () => {
    try {
      setLoading(true);

      const saleRes = await api.get(`/api/sales/${id}`);

      if (saleRes.data && saleRes.data.success) {
        const sale = saleRes.data.data;
        setInvoice(sale);
      }
    } catch (error) {
      console.error('Error loading tax invoice details:', error);
      toast.error('Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);


  // =========================================================
  // PRINT
  // =========================================================
  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (!invoice) return undefined;
    window.__shopPrintCurrentView = handlePrint;
    return () => {
      if (window.__shopPrintCurrentView === handlePrint) delete window.__shopPrintCurrentView;
    };
  }, [invoice]);

  // =========================================================
  // PRINT MODE: portrait = 80mm slip, landscape = A4 wide, half = A4 top-half only
  // =========================================================
  const [printOrientation, setPrintOrientation] = useState(() => {
    try {
      return localStorage.getItem('pos_invoice_orientation') || 'portrait';
    } catch {
      return 'portrait';
    }
  });

  const handleOrientationChange = (mode) => {
    setPrintOrientation(mode);
    try {
      localStorage.setItem('pos_invoice_orientation', mode);
    } catch {
      /* storage unavailable */
    }
  };

  // =========================================================
  // FORMATTERS
  // =========================================================
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getImageSource = (image) => {
    if (!image || typeof image !== 'string') return '';
    if (
      image.startsWith('data:image/') ||
      image.startsWith('http://') ||
      image.startsWith('https://') ||
      image.startsWith('blob:')
    ) {
      return image;
    }
    return `data:image/jpeg;base64,${image}`;
  };
  // =========================================================
  // LOADING STATE
  // =========================================================
  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 animate-pulse opacity-25" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
              <Receipt className="w-7 h-7 text-blue-400 animate-pulse" />
            </div>
          </div>
          <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-slate-800">
            Drafting Invoice Slip
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Formatting official receipt parameters...
          </p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-black text-slate-800">Invoice Not Found</h2>
        <p className="text-xs text-slate-400 mt-1">The requested receipt record could not be loaded.</p>
        <Link
          to="/invoices"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
      </div>
    );
  }

  // =========================================================
  // VALUE PARSING
  // =========================================================
  const saleObj = invoice.sale || invoice;
  const isInstallmentInvoice =
    saleObj.paymentType === 'Installment';
  const downPaymentPaid = Number(saleObj.downPayment || 0);
  const totalAmount = Number(
    invoice.plan?.totalAmount ??
      saleObj.finalTotal ??
      saleObj.totalAmount ??
      0
  );
  // A cash invoice is paid in full at checkout. Only an installment
  // invoice has a down payment and financing balance.
  const displayedPaymentAmount = isInstallmentInvoice
    ? downPaymentPaid
    : totalAmount;
  const remainingAmount = isInstallmentInvoice
    ? Math.max(
        Number(
          saleObj.remainingBalance ??
            invoice.plan?.remainingBalance ??
            totalAmount - downPaymentPaid
        ),
        0
      )
    : 0;
  const invoiceQuantity = saleObj.quantity || 0;
  const installments = Array.isArray(invoice.installments)
    ? invoice.installments
    : [];
  const originalPlanMonths = Number(
    saleObj.installmentDuration || invoice.plan?.months || 0
  );

  const firstPendingInstallment = installments.find(
    (inst) => String(inst.status || '').toLowerCase() !== 'paid'
  );
  const installmentAmount = Number(
    firstPendingInstallment?.amount || installments[0]?.amount || 0
  );

  const customerPhoto = getImageSource(saleObj.customer?.liveImage || saleObj.customer?.photo);
  const customerFingerprint = getImageSource(saleObj.customer?.fingerprintImage);

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          ACTION TOOLBAR (SCREEN ONLY)
      ====================================================== */}
      <section className="bg-white border border-slate-200/80 p-4 rounded-3xl shadow-sm flex items-center justify-between gap-3 no-print">
        <Link
          to="/invoices"
          className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
          title="Back to Invoices"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex flex-wrap items-center gap-2">
<div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1 no-print">
            <button
              type="button"
              onClick={() => handleOrientationChange('portrait')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                printOrientation === 'portrait'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <RectangleVertical className="w-3.5 h-3.5" />
              <span>Portrait</span>
            </button>
            <button
              type="button"
              onClick={() => handleOrientationChange('landscape')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                printOrientation === 'landscape'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <RectangleHorizontal className="w-3.5 h-3.5" />
              <span>Landscape</span>
            </button>
            <button
              type="button"
              onClick={() => handleOrientationChange('half')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                printOrientation === 'half'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Half Page</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice Slip</span>
          </button>
        </div>
      </section>

      {/* =====================================================
          ENHANCED PRINTABLE INVOICE SLIP
      ====================================================== */}
      <div
        id="printable-thermal-invoice"
        className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xl shadow-slate-200/50 space-y-4 text-xs font-mono text-slate-900"
      >
        {/* SHOP HEADER */}
        <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-300">
          {/* BRAND NAME — auto-styled, prominent */}
          <h1 className="text-2xl font-black uppercase tracking-[0.18em] text-slate-900 leading-tight">
            {settings?.shopName || 'Electronics Shop'}
          </h1>
          {settings?.brandTagline && (
            <p className="text-[10px] font-bold italic uppercase tracking-[0.3em] text-slate-500">
              {settings.brandTagline}
            </p>
          )}
          {settings?.shopAddress && (
            <p className="text-[10px] text-slate-500 font-bold">
              {settings.shopAddress}
            </p>
          )}
          {settings?.shopPhone && (
            <p className="text-[10px] font-black text-slate-900">
              Tel: {settings.shopPhone}
            </p>
          )}
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[9px] font-black uppercase tracking-widest mt-1">
            Tax Invoice / Sale Receipt
          </span>
        </div>

        {/* INVOICE METADATA */}
        <div className="grid grid-cols-2 text-[10px] py-1.5 border-b border-dashed border-slate-300 gap-1 font-black">
          <div>
            Invoice: <strong className="text-blue-600">{saleObj.saleId || '—'}</strong>
          </div>
          <div className="text-right text-slate-600">
            {formatDateTime(saleObj.saleDate || saleObj.createdAt)}
          </div>
        </div>

        {/* CUSTOMER + PRODUCT DETAILS */}
        <div className="grid grid-cols-2 gap-3 py-2 border-b border-dashed border-slate-300 text-[11px]">
          {/* Customer Column */}
          <div className="space-y-1 border-r border-dashed border-slate-200 pr-2">
            <span className="text-[9px] uppercase font-black text-slate-400 block">
              Customer Info
            </span>
            <p className="font-black text-slate-900 truncate">
              {saleObj.customer?.fullName || 'Walk-in Customer'}
            </p>
            <p className="text-slate-600 font-bold text-[10px]">
              {saleObj.customer?.mobileNumber || 'No Phone'}
            </p>
            {saleObj.customer?.address && (
              <p className="text-slate-500 text-[9px] leading-tight line-clamp-2">
                {saleObj.customer.address}
              </p>
            )}
          </div>

          {/* Product Column */}
          <div className="space-y-1 pl-1">
            <span className="text-[9px] uppercase font-black text-slate-400 block">
              Item Details
            </span>
            <p className="font-black text-slate-900 truncate">
              {saleObj.product?.name || 'Product'}
            </p>
            <p className="text-slate-600 font-bold text-[10px] truncate">
              {[saleObj.product?.brand, saleObj.product?.model].filter(Boolean).join(' • ')}
            </p>
            <p className="text-slate-500 font-bold text-[9px]">
              Qty: {invoiceQuantity} Unit{invoiceQuantity !== 1 ? 's' : ''}
            </p>

            {saleObj.product?.imei && (
              <p className="text-slate-600 font-bold text-[9px] truncate">
                IMEI: {saleObj.product.imei}
              </p>
            )}

            {saleObj.product?.chassisNumber && (
              <p className="text-slate-600 font-bold text-[9px] truncate">
                Chassis: {saleObj.product.chassisNumber}
              </p>
            )}
          </div>
        </div>

        {/* CUSTOMER PHOTO & FINGERPRINT IMAGE ON SLIP */}
        {(customerPhoto || customerFingerprint) && (
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl space-y-1">
            <span className="text-[8px] uppercase font-black text-slate-500 block text-center">
              Customer Biometric & Photo Verification
            </span>
            
            <div className="flex items-center justify-around gap-2 pt-1">
              <div className="text-center">
                {customerPhoto ? (
                  <img
                    loading="lazy"
                    src={customerPhoto}
                    alt="Customer"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-400 mx-auto"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-slate-300 bg-white flex items-center justify-center mx-auto text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <span className="text-[7.5px] font-bold text-slate-600 block mt-0.5">Photo</span>
              </div>

              <div className="text-center">
                {customerFingerprint ? (
                  <img
                    loading="lazy"
                    src={customerFingerprint}
                    alt="Fingerprint"
                    className="w-12 h-12 object-contain rounded-lg border border-slate-400 bg-white mx-auto p-0.5"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-slate-300 bg-white flex items-center justify-center mx-auto text-slate-400">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                )}
                <span className="text-[7.5px] font-bold text-slate-600 block mt-0.5">Fingerprint</span>
              </div>
            </div>
          </div>
        )}

        {/* URDU INSTALLMENT AGREEMENT (FOR INSTALLMENT DEALS) */}
        {isInstallmentInvoice && (
          <div
            dir="rtl"
            className="py-2.5 border-b border-dashed border-slate-300 text-[10px] leading-relaxed text-right bg-slate-50/50 p-2 rounded-xl"
          >
            <p className="font-black text-slate-900 mb-1">
              قسطوں کے معاہدے کی تصدیق
            </p>
            <p>
              ٹوٹل پلان:{' '}
              <span className="font-black text-slate-900">{originalPlanMonths} ماہ</span>
              {' • '}
              ماہانہ قسط:{' '}
              <span className="font-black text-slate-900">
                {settings?.currency || 'PKR'} {installmentAmount.toLocaleString()}
              </span>
            </p>
            <p className="text-[8.5px] text-slate-600 mt-1 leading-normal">
              میں تصدیق کرتا ہوں کہ میں نے سامان بالکل درست حالت میں وصول کر لیا ہے اور قسطوں کے تمام شرائط و ضوابط کو قبول کرتا ہوں۔
            </p>
          </div>
        )}

        {/* PAYMENT TOTALS SUMMARY */}
        <div className="space-y-1.5 py-2 text-xs font-bold border-b border-dashed border-slate-300">
          <div className="flex justify-between text-slate-900 font-black">
            <span>Total Deal Amount:</span>
            <span>
              {settings?.currency || 'PKR'} {totalAmount.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between text-emerald-600">
            <span>
              {isInstallmentInvoice
                ? 'Down Payment Paid:'
                : 'Paid Amount:'}
            </span>
            <span>
              +{settings?.currency || 'PKR'} {displayedPaymentAmount.toLocaleString()}
            </span>
          </div>

          {isInstallmentInvoice && (
            <div className="flex justify-between text-rose-600 font-black text-sm pt-1 border-t border-dotted border-slate-200">
              <span>Remaining Balance:</span>
              <span>
                {settings?.currency || 'PKR'} {remainingAmount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* SIGNATURES BLOCK */}
        <div className="pt-6 flex justify-between items-end text-center text-[9px] font-black">
          <div className="border-t border-slate-800 w-24 pt-1 text-slate-800">
            Buyer Sign
          </div>

          <div className="border-t border-slate-800 w-24 pt-1 text-slate-800">
            Cashier Sign
          </div>
        </div>

        {/* THANK YOU FOOTER */}
        <div className="text-center pt-2 border-t border-dashed border-slate-200">
          <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
            *** Thank You for Shopping! Visit Again ***
          </p>
        </div>
      </div>
      {/* =====================================================
          COMPACT PRINT STYLESHEET
      ====================================================== */}
      <style>{`
        @media print {
          @page {
            size: ${printOrientation === 'landscape' ? 'A4 landscape' : printOrientation === 'half' ? 'A4 portrait' : '80mm auto'};
            margin: ${printOrientation === 'portrait' ? '3mm 4mm' : '8mm'};
          }

          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
          }

          /* Print only the invoice. The application header, sidebar,
             page toolbar and every other screen element stay hidden. */
          body * {
            visibility: hidden !important;
          }

          #printable-thermal-invoice,
          #printable-thermal-invoice * {
            visibility: visible !important;
          }

          .no-print {
            display: none !important;
          }

          #printable-thermal-invoice {
            position: fixed !important;
            left: 50% !important;
            top: 0 !important;
            width: 100% !important;
            max-width: ${printOrientation === 'landscape' ? '100%' : '80mm'} !important;
            margin: 0 !important;
            transform: translateX(-50%) !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            color: #000000 !important;
            font-size: ${printOrientation === 'landscape' ? '10px' : '8.5px'} !important;
          }

          img {
            display: block !important;
            visibility: visible !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>

    </div>
  );
};

export default InvoiceDetails;
