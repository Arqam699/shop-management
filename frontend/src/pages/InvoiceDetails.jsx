import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import {
  ArrowLeft,
  Printer,
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
    const invoiceElement = document.getElementById('printable-thermal-invoice');
    if (invoiceElement) {
      const fitInvoiceToPage = () => {
        const availableHeight = (281 * 96) / 25.4;
        const measurementCopy = invoiceElement.cloneNode(true);
        measurementCopy.removeAttribute('id');
        Object.assign(measurementCopy.style, {
          position: 'fixed',
          left: '-10000px',
          top: '0',
          width: '194mm',
          maxWidth: 'none',
          minHeight: '0',
          height: 'auto',
          maxHeight: 'none',
          overflow: 'visible',
          transform: 'none',
          boxSizing: 'border-box',
          padding: '0 0 8mm',
          visibility: 'hidden',
        });
        measurementCopy.style.setProperty('font-size', '12pt', 'important');
        measurementCopy.style.setProperty('font-weight', '900', 'important');
        measurementCopy.style.setProperty('line-height', '1.35', 'important');
        measurementCopy.querySelectorAll('*').forEach((node) => {
          node.style.setProperty('font-size', '12pt', 'important');
          node.style.setProperty('font-weight', '900', 'important');
          node.style.setProperty('line-height', '1.35', 'important');
          node.style.setProperty('overflow-wrap', 'normal', 'important');
          node.style.setProperty('word-break', 'normal', 'important');
        });
        measurementCopy.querySelectorAll('.invoice-header-number, .invoice-header-number strong').forEach((node) => {
          node.style.setProperty('white-space', 'normal', 'important');
          node.style.setProperty('word-break', 'normal', 'important');
          node.style.setProperty('overflow-wrap', 'normal', 'important');
        });
        measurementCopy.querySelectorAll('h1').forEach((node) => {
          node.style.setProperty('font-size', '22pt', 'important');
          node.style.setProperty('font-weight', '900', 'important');
          node.style.setProperty('line-height', '1.2', 'important');
        });
        measurementCopy.querySelectorAll('.invoice-header-number').forEach((node) => {
          node.style.setProperty('font-size', '20pt', 'important');
          node.style.setProperty('font-weight', '900', 'important');
        });
        measurementCopy.querySelectorAll('.invoice-header-number strong').forEach((node) => {
          node.style.setProperty('font-size', '22pt', 'important');
          node.style.setProperty('font-weight', '900', 'important');
        });
        measurementCopy.querySelectorAll('.invoice-printed-date').forEach((node) => {
          node.style.setProperty('font-size', '9pt', 'important');
          node.style.setProperty('font-weight', '900', 'important');
        });
        measurementCopy.querySelectorAll('.invoice-customer-info *').forEach((node) => {
          node.style.setProperty('font-size', '14pt', 'important');
          node.style.setProperty('font-weight', '900', 'important');
          node.style.setProperty('line-height', '1.4', 'important');
          node.style.setProperty('white-space', 'normal', 'important');
          node.style.setProperty('overflow', 'visible', 'important');
          node.style.setProperty('text-overflow', 'clip', 'important');
        });
        measurementCopy.querySelectorAll('.invoice-customer-info .grid > span').forEach((node) => {
          node.style.setProperty('font-size', '12pt', 'important');
        });
        measurementCopy.querySelectorAll('.invoice-customer-name').forEach((node) => {
          node.style.setProperty('font-size', '16pt', 'important');
          node.style.setProperty('font-weight', '900', 'important');
        });
        measurementCopy.querySelectorAll('.invoice-payment-totals, .invoice-payment-totals *').forEach((node) => {
          node.style.setProperty('font-size', '14pt', 'important');
          node.style.setProperty('font-weight', '900', 'important');
          node.style.setProperty('line-height', '1.4', 'important');
        });
        measurementCopy.querySelectorAll('.invoice-item-grid-installment').forEach((node) => {
          node.style.setProperty('grid-template-columns', 'minmax(0, 1fr) 65px 115px', 'important');
        });
        measurementCopy.querySelectorAll('.invoice-item-grid-cash').forEach((node) => {
          node.style.setProperty('grid-template-columns', 'minmax(0, 1fr) 100px 65px 115px', 'important');
        });
        measurementCopy.querySelectorAll('img').forEach((node) => {
          node.style.setProperty('max-width', '35mm', 'important');
          node.style.setProperty('max-height', '45mm', 'important');
        });
        document.body.appendChild(measurementCopy);
        const contentWrapper = measurementCopy.querySelector('.relative.z-10');
        const contentWrapperHeight = contentWrapper?.getBoundingClientRect().height || 0;
        const contentHeight = Math.max(
          measurementCopy.scrollHeight,
          measurementCopy.getBoundingClientRect().height,
          contentWrapperHeight + ((8 * 96) / 25.4),
          (measurementCopy.querySelector('.invoice-signatures')?.getBoundingClientRect().bottom || 0) + ((8 * 96) / 25.4)
        );
        measurementCopy.remove();
        const scale = Math.min(1, availableHeight / contentHeight);
        invoiceElement.style.setProperty('--invoice-print-scale', String(scale));
        invoiceElement.style.setProperty('--invoice-print-width', `${194 / scale}mm`);
        invoiceElement.style.setProperty('--invoice-print-min-height', `${281 / scale}mm`);
      };
      const clearInvoiceFit = () => {
        invoiceElement.style.removeProperty('--invoice-print-scale');
        invoiceElement.style.removeProperty('--invoice-print-width');
        invoiceElement.style.removeProperty('--invoice-print-min-height');
        invoiceElement.style.removeProperty('border');
        invoiceElement.style.removeProperty('outline');
        invoiceElement.style.removeProperty('box-shadow');
        window.removeEventListener('beforeprint', fitInvoiceToPage);
      };
      // Some installed-app WebViews keep the screen card frame when printing.
      // Force-clear it inline before opening the native print dialog.
      invoiceElement.style.setProperty('border', '0', 'important');
      invoiceElement.style.setProperty('outline', '0', 'important');
      invoiceElement.style.setProperty('box-shadow', 'none', 'important');
      fitInvoiceToPage();
      window.addEventListener('beforeprint', fitInvoiceToPage, { once: true });
      window.addEventListener('afterprint', clearInvoiceFit, { once: true });
    }
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
  const planStartDate = saleObj.saleDate || saleObj.createdAt;
  const invoiceSnapshot = invoice.plan?.invoiceSnapshot || {};
  const downPaymentPaid = Number(saleObj.downPayment || 0);
  const initialPaymentType = invoiceSnapshot.initialPaymentType || invoice.plan?.initialPaymentType || saleObj.initialPaymentType || 'None';
  const firstInstallmentPaid = Number(invoiceSnapshot.initialInstallmentPaidAmount ?? invoice.plan?.initialInstallmentPaidAmount ?? saleObj.initialInstallmentPaidAmount ?? 0);
  const isFirstInstallmentInitialPayment = isInstallmentInvoice && initialPaymentType === 'FirstInstallment';
  const invoicePaymentStatus = String(
        saleObj.paymentStatus ||
          (Number(saleObj.remainingBalance || 0) > 0 ? 'Unpaid' : 'Paid')
      ).toUpperCase();
  const totalAmount = Number(
    invoice.plan?.totalAmount ??
      saleObj.finalTotal ??
      saleObj.totalAmount ??
      0
  );
  const balanceDiscount = isInstallmentInvoice ? Number(invoice.plan?.balanceDiscount || 0) : 0;
  const invoiceDealAmount = Math.max(0, totalAmount - balanceDiscount);
  const grossDealAmount = Number(saleObj.subtotal ?? (Number(saleObj.finalTotal || 0) + Number(saleObj.discount || 0)));
  const overallDiscount = Number(saleObj.discount || 0);
  const netDealAmount = Number(saleObj.finalTotal ?? Math.max(0, grossDealAmount - overallDiscount));
  const displayedMarkupAmount = Number(saleObj.markupAmount ?? Math.max(0, totalAmount - netDealAmount));
  const previousPlanTotal = Number(invoice.plan?.revisions?.[invoice.plan.revisions.length - 1]?.totalAmount || 0);
  const isRevisedInstallmentPlan = Number(invoice.plan?.revisionNumber || 0) > 0;
  const earlySettlementDiscount = isRevisedInstallmentPlan
    ? 0
    : Math.max(0, previousPlanTotal - totalAmount);
  // For cash sales this field stores cumulative cash received so far; for
  // installment sales it remains the original sale down payment.
  const displayedPaymentAmount = isFirstInstallmentInitialPayment ? firstInstallmentPaid : downPaymentPaid;
  const advancePaymentAmount = downPaymentPaid + firstInstallmentPaid;
  const installmentPlanCompleted = isInstallmentInvoice && (
    invoice.plan?.status === 'Completed' ||
    (Number(saleObj.remainingBalance || 0) <= 0.005 && invoicePaymentStatus === 'PAID')
  );
  const remainingAmount = isInstallmentInvoice
    ? installmentPlanCompleted
      ? 0
      : Math.max(
        Number(
          invoiceSnapshot.financedAmount ??
            saleObj.remainingBalance ??
            invoice.plan?.remainingBalance ??
            totalAmount - downPaymentPaid
        ),
        0
      )
      : Math.max(
          0,
          Number(saleObj.remainingBalance ?? totalAmount - downPaymentPaid)
        );
  const invoiceQuantity = saleObj.quantity || 0;
  const invoiceItems = Array.isArray(saleObj.items) && saleObj.items.length
    ? saleObj.items
    : [{ product: saleObj.product, quantity: invoiceQuantity, unitPrice: saleObj.unitPrice, discount: saleObj.discount || 0 }];
  const getInvoiceItemProduct = (item) =>
    item.product && typeof item.product === 'object' ? item.product : {};
  const allProductDetailFields = [
    { key: 'item', label: 'Item', getValue: (product, item, index) => `${index + 1}. ${product.name || product.productName || 'Product'}`, alwaysShow: true },
    { key: 'model', label: 'Model', getValue: (product) => product.model || 'N/A', alwaysShow: true },
    { key: 'imei', label: 'IMEI', getValue: (product) => product.imei, showIfPresent: true },
    { key: 'engineNumber', label: 'Engine No', getValue: (product) => product.engineNumber, showIfPresent: true },
    { key: 'chassisNumber', label: 'Chassis No', getValue: (product) => product.chassisNumber, showIfPresent: true },
  ];
  const invoiceProductDetailFields = allProductDetailFields.filter((field) =>
    field.alwaysShow || invoiceItems.some((item) => Boolean(field.getValue(getInvoiceItemProduct(item), item)))
  );
  const invoiceProductDetailColumns = invoiceProductDetailFields
    .map((_, index) => `minmax(0, ${index === 0 ? 1.5 : 1}fr)`)
    .join(' ');
  const snapshotSchedule = Array.isArray(invoiceSnapshot.installments)
    ? invoiceSnapshot.installments
    : [];
  const downPaymentCountsAsFirstInstallment =
    invoiceSnapshot.treatDownPaymentAsFirstInstallment ??
    saleObj.treatDownPaymentAsFirstInstallment ??
    false;
  const installmentSchedule = snapshotSchedule.length
    ? snapshotSchedule
    : Array.isArray(invoice.invoiceSchedule)
    ? invoice.invoiceSchedule
    : Array.isArray(saleObj.installmentScheduleSnapshot)
    ? saleObj.installmentScheduleSnapshot
    : [];
  const initialPaymentCountsAsFirstInstallment =
    invoiceSnapshot.initialPaymentCountsAsFirstInstallment ??
    invoice.plan?.initialPaymentCountsAsFirstInstallment ??
    (isFirstInstallmentInitialPayment && firstInstallmentPaid >= Number(installmentSchedule.find((item) => Number(item.installmentNumber) === 1)?.amount || 0));
  const originalPlanMonths = Number(
    invoiceSnapshot.selectedDuration ||
      saleObj.selectedInstallmentDuration ||
      invoice.plan?.selectedDuration ||
      saleObj.installmentDuration ||
      invoice.plan?.months ||
      0
  );
  const activePlanInstallments = Array.isArray(invoice.installments) ? invoice.installments : [];
  const unpaidActiveInstallments = activePlanInstallments.filter((item) =>
    Number(item.remainingAmount ?? item.amount ?? 0) > 0.005 &&
    !['Paid', 'Settled'].includes(String(item.status || '').trim())
  );
  const remainingInstallmentCount = Number(
    isRevisedInstallmentPlan && invoiceSnapshot.remainingInstallmentCount !== undefined && invoiceSnapshot.remainingInstallmentCount !== null
      ? invoiceSnapshot.remainingInstallmentCount
      : isRevisedInstallmentPlan && activePlanInstallments.length
        ? unpaidActiveInstallments.length
      : invoiceSnapshot.duration ??
          saleObj.installmentDuration ??
          invoice.plan?.duration ??
          0
  );
  const firstScheduledInstallment = isRevisedInstallmentPlan && activePlanInstallments.length
    ? unpaidActiveInstallments[0]
    : installmentSchedule.find(
        (item) => Number(item.installmentNumber) === ((downPaymentCountsAsFirstInstallment || initialPaymentCountsAsFirstInstallment) ? 2 : 1)
      ) || installmentSchedule[0];
  const installmentAmount = Number(firstScheduledInstallment?.remainingAmount ?? firstScheduledInstallment?.amount ?? 0);
  const installmentDueDay = 5;

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
<span className="no-print rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600">A4 · Half Page</span>

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
        className={`relative overflow-hidden bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xl shadow-slate-200/50 space-y-2.5 text-xs font-mono font-bold text-slate-900 print:border-0 print:shadow-none ${!isInstallmentInvoice ? 'cash-sale-invoice' : ''}`}
      >
        {!isInstallmentInvoice && invoicePaymentStatus === 'PAID' && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
            <span className="rotate-[-28deg] whitespace-nowrap rounded-lg border-double border-4 border-emerald-700 px-4 py-1.5 text-4xl font-black tracking-[0.2em] text-emerald-700 opacity-15">PAID</span>
          </div>
        )}
        <div className="relative z-10">
        {/* SHOP HEADER */}
        <div className="grid grid-cols-[35mm_minmax(0,1fr)_35mm] items-center gap-2 border-b-2 border-slate-500 pb-2">
          <div className="self-start text-left">
            {customerPhoto && (
              <img src={customerPhoto} alt="Customer" className="h-[45mm] w-[35mm] rounded-lg border border-slate-500 object-cover" />
            )}
          </div>
          <div className="text-center space-y-0.5">
          {/* BRAND NAME — auto-styled, prominent */}
          <div className="invoice-header-number">
            Invoice #: <strong>{saleObj.saleId || '—'}</strong>
          </div>
          <h1 className="text-xl font-black uppercase tracking-[0.12em] text-slate-900 leading-tight">
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
          <p className="invoice-printed-date">
            Printed: {new Date().toLocaleString('en-PK')}
          </p>
          </div>
          <div className="self-start text-right">
            {customerFingerprint && (
              <img src={customerFingerprint} alt="Fingerprint" className="ml-auto h-[45mm] w-[35mm] rounded-lg border border-slate-500 bg-white object-contain p-1" />
            )}
          </div>
        </div>

        {/* INVOICE METADATA */}
        <div className="invoice-metadata grid grid-cols-1 text-[10px] py-1.5 border-b border-slate-400 gap-1 font-black">
          <div>
            Invoice: <strong className="text-blue-600">{saleObj.saleId || '—'}</strong>
          </div>
          <div className="text-right text-slate-600">
            {formatDateTime(saleObj.saleDate || saleObj.createdAt)}
          </div>
        </div>

        {/* CUSTOMER + PRODUCT DETAILS */}
        <div className="invoice-customer-info py-1.5 border-b border-slate-400 text-[10px]">
          {/* Customer Column */}
          <div className="grid grid-cols-2 items-start gap-x-3 gap-y-0">
            <span className="col-span-2 text-[9px] uppercase font-black text-slate-400 block">
              Customer Info
            </span>
            <div className="space-y-0 leading-tight">
              <p className="invoice-customer-name m-0 font-black text-slate-900">Name: {saleObj.customer?.fullName || 'Walk-in Customer'}</p>
              {saleObj.customer?.fatherName && <p className="m-0 font-bold text-slate-600">Father Name: {saleObj.customer.fatherName}</p>}
              <p className="m-0 font-bold text-slate-600">Mobile No: {saleObj.customer?.mobileNumber || 'No Phone'}</p>
              {saleObj.customer?.alternateMobileNumber && <p className="m-0 font-bold text-slate-600">Alt Phone: {saleObj.customer.alternateMobileNumber}</p>}
              {isInstallmentInvoice && <p className="m-0 font-bold text-slate-600">Plan Start Date: {formatDateTime(planStartDate)}</p>}
            </div>
            <div className="space-y-0 leading-tight">
              {saleObj.customer?.cnic && <p className="m-0 font-bold text-slate-600">CNIC: {saleObj.customer.cnic}</p>}
              {saleObj.customer?.address && <p className="m-0 font-bold text-slate-500">Address: {saleObj.customer.address}{saleObj.customer?.city ? `, ${saleObj.customer.city}` : ''}</p>}
              {saleObj.customer?.workingAddress && <p className="m-0 font-bold text-slate-500">Working Address: {saleObj.customer.workingAddress}</p>}
            </div>
          </div>

          {/* Product Column */}
          <div className="hidden">
            <span className="text-[9px] uppercase font-black text-slate-400 block">
              Sale Details
            </span>
            <p className="font-black text-slate-900 truncate">
              {isInstallmentInvoice ? 'Installment Sale' : 'Cash Sale'}
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

        {/* ITEMIZED SHOPPING RECEIPT LINES */}
        <div className="invoice-items-section border-b border-slate-400 pb-2">
          <div className={`invoice-item-grid ${isInstallmentInvoice ? 'invoice-item-grid-installment grid-cols-[minmax(0,1fr)_20px_68px]' : 'invoice-item-grid-cash grid-cols-[minmax(0,1fr)_58px_20px_68px]'} grid gap-1 border-b border-slate-400 pb-1 text-[9px] font-black uppercase tracking-wide`}>
            <div className="grid min-w-0 text-[8px]" style={{ gridTemplateColumns: invoiceProductDetailColumns }}>
              {invoiceProductDetailFields.map((field) => (
                <span key={field.key} className="min-w-0 border-r border-slate-400 px-1 last:border-r-0">
                  {field.label}
                </span>
              ))}
            </div>
            {!isInstallmentInvoice && <span className="border-l border-slate-400 pl-1 text-right">Unit Price</span>}
            <span className="border-l border-slate-400 pl-1 text-right">Qty</span>
            <span className="border-l border-slate-400 pl-1 text-right">Deal</span>
          </div>
          <div className="divide-y divide-slate-300">
            {invoiceItems.map((item, index) => {
              const itemProduct = getInvoiceItemProduct(item);
              const itemQty = Number(item.quantity || 0);
              const itemDealPrice = itemQty * Number(item.unitPrice || 0);
              const installmentItemDealPrice = grossDealAmount > 0
                ? invoiceDealAmount * (itemDealPrice / grossDealAmount)
                : invoiceDealAmount / Math.max(1, invoiceItems.length);
              return <div key={String(item._id || itemProduct._id || index)} className="py-1.5">
                <div className={`invoice-item-grid ${isInstallmentInvoice ? 'invoice-item-grid-installment grid-cols-[minmax(0,1fr)_20px_68px]' : 'invoice-item-grid-cash grid-cols-[minmax(0,1fr)_58px_20px_68px]'} grid items-start gap-1`}>
                  <div className="min-w-0 flex-1">
                    <div
                      className="grid min-w-0 text-[8px] leading-tight"
                      style={{ gridTemplateColumns: invoiceProductDetailColumns }}
                    >
                      {invoiceProductDetailFields.map((field) => (
                        <div key={field.key} className="min-w-0 border-r border-slate-300 px-1 py-0.5 last:border-r-0">
                          <p className="break-normal font-bold text-slate-900">
                            {field.getValue(itemProduct, item, index) || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {!isInstallmentInvoice && <span className="border-l border-slate-300 pl-1 text-right text-[9px] font-bold">{Number(item.unitPrice || 0).toLocaleString()}</span>}
                  <span className="border-l border-slate-300 pl-1 text-right text-[10px] font-black">{itemQty}</span>
                  <span className="border-l border-slate-300 pl-1 text-right text-[10px] font-black">{(isInstallmentInvoice ? installmentItemDealPrice : itemDealPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>;
            })}
          </div>
        </div>

        {/* INSTALLMENT AGREEMENT (INSTALLMENT INVOICES ONLY) */}
        {isInstallmentInvoice && (
          <div
            dir="rtl"
            className="invoice-agreement-section space-y-1 border-b border-slate-500 bg-slate-50/50 p-2.5 text-right text-[12px] font-bold leading-relaxed"
          >
            <p className="mb-1 text-[14px] font-black text-slate-900">قسطوں کے معاہدے کی تصدیق</p>
            <p className="text-[12px] font-bold text-slate-900">
              کل منصوبہ: <b className="text-slate-900">{originalPlanMonths} ماہ</b>
              {' • '}باقی اقساط: <b className="text-slate-900">{remainingInstallmentCount}</b>
            </p>
            <p className="text-[12px] font-bold text-slate-900">
              ہر قسط: <b className="text-slate-900">{settings?.currency || 'PKR'} {installmentAmount.toLocaleString()}</b>
              {' • '}ہر ماہ کی <b className="text-slate-900">{installmentDueDay ?? '—'} تاریخ</b> کو ادا کرنا لازم ہے۔
            </p>
            <p className="text-[11px] font-bold text-slate-900">
              تاخیر کی صورت میں جرمانہ ادا کرنا ہوگا۔ میں سامان وصول کرنے کی تصدیق کرتا ہوں۔
            </p>
          </div>
        )}
        {/* PAYMENT TOTALS SUMMARY */}
        <div className="invoice-payment-totals space-y-1.5 py-2 text-xs font-bold border-b border-slate-400">
          {isInstallmentInvoice ? (
            <>
              {overallDiscount > 0 && <div className="flex justify-between text-rose-600 font-black"><span>Overall Discount:</span><span>-{settings?.currency || 'PKR'} {overallDiscount.toLocaleString()}</span></div>}
              <div className="flex justify-between text-slate-900 font-black"><span>Total Deal Amount:</span><span>{settings?.currency || 'PKR'} {invoiceDealAmount.toLocaleString()}</span></div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-slate-900 font-black"><span>Total Deal Amount:</span><span>{settings?.currency || 'PKR'} {grossDealAmount.toLocaleString()}</span></div>
              {overallDiscount > 0 && <div className="flex justify-between text-rose-600 font-black"><span>Overall Discount:</span><span>-{settings?.currency || 'PKR'} {overallDiscount.toLocaleString()}</span></div>}
              <div className="flex justify-between text-slate-900 font-black"><span>Deal Amount After Discount:</span><span>{settings?.currency || 'PKR'} {netDealAmount.toLocaleString()}</span></div>
            </>
          )}

          {earlySettlementDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-black">
              <span>Early Settlement Discount:</span>
              <span>-{settings?.currency || 'PKR'} {earlySettlementDiscount.toLocaleString()}</span>
            </div>
          )}

          {isInstallmentInvoice ? (
            <div className="flex justify-between text-emerald-600">
              <span>Advance Payment:</span>
              <span>{settings?.currency || 'PKR'} {advancePaymentAmount.toLocaleString()}</span>
            </div>
          ) : (
            Number(saleObj.remainingBalance || 0) > 0 && displayedPaymentAmount > 0 ? (
              <div className="flex justify-between text-emerald-600">
                <span>Amount Received:</span>
                <span>{settings?.currency || 'PKR'} {displayedPaymentAmount.toLocaleString()}</span>
              </div>
            ) : null
          )}

          {(isInstallmentInvoice || invoicePaymentStatus === 'UNPAID') && (
            <div className="flex justify-between text-rose-600 font-black text-sm pt-1 border-t border-dotted border-slate-200">
              <span>Remaining Balance:</span>
              <span>
                {settings?.currency || 'PKR'} {remainingAmount.toLocaleString()}
              </span>
            </div>
          )}
          {installmentPlanCompleted && (
            <div className="pt-1 text-center text-emerald-700 font-black text-sm">
              This plan is fully completed
            </div>
          )}
        </div>

        {/* THANK YOU FOOTER */}
        <div className="text-center pt-2 border-t border-slate-400">
          <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
            *** Thank You for Shopping! Visit Again ***
          </p>
          <p dir="rtl" className="mt-1 text-[10px] font-black text-slate-700">
            الیکٹرونکس کی کوئی بھی چیز واپس یا تبدیل نہیں ہوگی۔
          </p>
        </div>
        <div className="invoice-signatures mt-4 grid grid-cols-2 gap-12 border-t border-slate-400 pt-3 text-center">
          <div>
            <div className="h-[24mm] border-b border-slate-700" />
            <p className="pt-2 font-black text-slate-900">Customer Agreement & Signature</p>
          </div>
          <div>
            <div className="h-[24mm] border-b border-slate-700" />
            <p className="pt-2 font-black text-slate-900">Shop Signature & Stamp</p>
          </div>
        </div>
        <div className="invoice-developed-credit">Designed &amp; Developed by ArZaib POS</div>
        </div>
      </div>
      {/* =====================================================
          COMPACT PRINT STYLESHEET
      ====================================================== */}
      <style>{`
        #printable-thermal-invoice .invoice-metadata {
          display: none !important;
        }

        .invoice-developed-credit {
          display: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0 8mm 8mm;
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

          #printable-thermal-invoice * {
            font-size: 12pt !important;
            font-weight: 900 !important;
            line-height: 1.35 !important;
            overflow-wrap: normal !important;
            word-break: normal !important;
          }

          #printable-thermal-invoice .invoice-payment-totals .flex {
            flex-wrap: wrap !important;
            gap: 2mm !important;
          }

          #printable-thermal-invoice .invoice-developed-credit {
            display: block !important;
            margin-top: 2mm !important;
            margin-bottom: 8mm !important;
            color: #64748b !important;
            font-size: 9pt !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
            text-align: center !important;
          }

          #printable-thermal-invoice .invoice-customer-info {
            font-size: 14pt !important;
          }

          #printable-thermal-invoice .invoice-customer-info * {
            font-size: 14pt !important;
            font-weight: 900 !important;
            line-height: 1.4 !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }

          #printable-thermal-invoice .invoice-customer-info .grid > span {
            font-size: 12pt !important;
          }

          #printable-thermal-invoice .invoice-customer-name {
            font-size: 16pt !important;
            font-weight: 900 !important;
          }

          #printable-thermal-invoice .invoice-payment-totals,
          #printable-thermal-invoice .invoice-payment-totals * {
            font-size: 14pt !important;
            font-weight: 900 !important;
            line-height: 1.4 !important;
          }

          #printable-thermal-invoice .invoice-items-section,
          #printable-thermal-invoice .invoice-agreement-section {
            border: 1px solid #334155 !important;
            border-radius: 2mm !important;
            margin-top: 3mm !important;
            padding: 3mm !important;
            break-inside: avoid !important;
          }

          #printable-thermal-invoice .invoice-item-grid-installment {
            grid-template-columns: minmax(0, 1fr) 65px 115px !important;
          }

          #printable-thermal-invoice .invoice-item-grid-cash {
            grid-template-columns: minmax(0, 1fr) 100px 65px 115px !important;
          }

          #printable-thermal-invoice h1 {
            font-size: 22pt !important;
            font-weight: 900 !important;
            line-height: 1.2 !important;
          }

          #printable-thermal-invoice .invoice-header-number {
            margin-bottom: 1mm !important;
            font-size: 20pt !important;
            font-weight: 900 !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: normal !important;
          }

          #printable-thermal-invoice .invoice-header-number strong {
            font-size: 22pt !important;
            font-weight: 900 !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: normal !important;
          }

          #printable-thermal-invoice .invoice-printed-date {
            margin-top: 1mm !important;
            font-size: 9pt !important;
            font-weight: 800 !important;
          }

          #printable-thermal-invoice img {
            max-width: 35mm !important;
            max-height: 45mm !important;
          }

          .no-print {
            display: none !important;
          }

          #printable-thermal-invoice {
            position: absolute !important;
            left: 0 !important;
            right: auto !important;
            top: 0 !important;
            width: var(--invoice-print-width, 194mm) !important;
            max-width: none !important;
            min-height: var(--invoice-print-min-height, 281mm) !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            zoom: var(--invoice-print-scale, 1) !important;
            transform: none !important;
            box-sizing: border-box !important;
            padding: 0 0 12mm !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
            border: none !important;
            border-width: 0 !important;
            border-style: none !important;
            border-color: transparent !important;
            outline: none !important;
            box-shadow: none !important;
            color: #000000 !important;
            font-size: 12pt !important;
            font-weight: 900 !important;
            line-height: 1.35 !important;
          }

          #printable-thermal-invoice.cash-sale-invoice {
            padding-top: 4mm !important;
          }

          #printable-thermal-invoice::before,
          #printable-thermal-invoice::after {
            content: none !important;
            border: 0 !important;
            outline: 0 !important;
            box-shadow: none !important;
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
