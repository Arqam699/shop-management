import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import {
  ArrowLeft,
  Printer,
  RefreshCw,
  X,
  AlertCircle,
  Sparkles,
  Receipt,
  RotateCcw,
  Repeat,
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
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnedQty, setReturnedQty] = useState(1);
  const [refundAmount, setRefundAmount] = useState(0);
  const [returnReason, setReturnReason] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);
  const [returnError, setReturnError] = useState('');

  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [selectedNewProduct, setSelectedNewProduct] = useState('');
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [processingExchange, setProcessingExchange] = useState(false);
  const [exchangeError, setExchangeError] = useState('');

  // =========================================================
  // FETCH INVOICE + PRODUCTS
  // =========================================================
  const fetchInvoiceAndProducts = async () => {
    try {
      setLoading(true);

      const [saleRes, prodRes] = await Promise.all([
        api.get(`/api/sales/${id}`),
        api.get('/api/products'),
      ]);

      if (saleRes.data && saleRes.data.success) {
        const sale = saleRes.data.data;
        setInvoice(sale);
        setRefundAmount(
          sale.finalTotal || sale.totalAmount || sale.sale?.finalTotal || 0
        );
      }

      if (prodRes.data && prodRes.data.success) {
        setProducts(prodRes.data.data.filter((p) => p.quantity > 0));
      }
    } catch (error) {
      console.error('Error loading tax invoice details:', error);
      toast.error('Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceAndProducts();
  }, [id]);

  // =========================================================
  // PRINT
  // =========================================================
  const handlePrint = () => {
    window.print();
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
  // RETURN SUBMIT
  // =========================================================
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    setReturnError('');
    setProcessingReturn(true);

    const invoiceQty = invoice?.sale?.quantity || invoice?.quantity || 0;

    if (returnedQty > invoiceQty) {
      setReturnError(
        `Cannot return more than purchased quantity (${invoiceQty} units).`
      );
      setProcessingReturn(false);
      return;
    }

    try {
      const saleId = invoice?.sale?._id || invoice?._id;
      const response = await api.post('/api/returns', {
        saleId,
        returnedQty,
        refundAmount,
        reason: returnReason,
      });

      if (response.data && response.data.success) {
        toast.success(
          'Return processed successfully! Stock restored and dues adjusted.'
        );
        setShowReturnModal(false);
        navigate('/returns');
      }
    } catch (error) {
      setReturnError(
        error.response?.data?.message || 'Failed to submit return request.'
      );
    } finally {
      setProcessingReturn(false);
    }
  };

  // =========================================================
  // EXCHANGE PRODUCT HANDLER
  // =========================================================
  const handleProductChange = (e) => {
    const prodId = e.target.value;
    setSelectedNewProduct(prodId);
    const found = products.find((p) => p._id === prodId);
    setNewProductPrice(found ? found.salePrice || 0 : 0);
  };

  const handleExchangeSubmit = async (e) => {
    e.preventDefault();
    setExchangeError('');
    setProcessingExchange(true);

    if (!selectedNewProduct) {
      setExchangeError('Please select a target product for exchange.');
      setProcessingExchange(false);
      return;
    }

    try {
      const saleId = invoice?.sale?._id || invoice?._id;
      const res = await api.post(`/api/sales/${saleId}/exchange`, {
        newProductId: selectedNewProduct,
        newPrice: newProductPrice,
      });

      if (res.data && res.data.success) {
        toast.success(
          'Exchange processed successfully! Stocks swapped and installments adjusted.'
        );
        setShowExchangeModal(false);
        fetchInvoiceAndProducts();
      }
    } catch (error) {
      setExchangeError(
        error.response?.data?.message || 'Failed to complete exchange.'
      );
    } finally {
      setProcessingExchange(false);
    }
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
  const downPaymentPaid = Number(saleObj.downPayment || 0);
  const totalAmount = Number(
    invoice.plan?.totalAmount ??
      saleObj.finalTotal ??
      saleObj.totalAmount ??
      0
  );
  const remainingAmount = Math.max(totalAmount - downPaymentPaid, 0);
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
          {invoiceQuantity > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowExchangeModal(true);
                  setSelectedNewProduct('');
                  setNewProductPrice(0);
                  setExchangeError('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black transition-all hover:scale-[1.02] active:scale-95"
              >
                <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                <span>Exchange</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowReturnModal(true);
                  setReturnedQty(1);
                  setReturnReason('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-black transition-all hover:scale-[1.02] active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                <span>Return</span>
              </button>
            </>
          )}

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
          <h1 className="text-base font-black tracking-wider uppercase">
            {settings?.shopName || 'Electronics Shop'}
          </h1>
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
        {saleObj.paymentType === 'Installment' && (
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
            <span>Down Payment Paid:</span>
            <span>
              +{settings?.currency || 'PKR'} {downPaymentPaid.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between text-rose-600 font-black text-sm pt-1 border-t border-dotted border-slate-200">
            <span>Remaining Balance:</span>
            <span>
              {settings?.currency || 'PKR'} {remainingAmount.toLocaleString()}
            </span>
          </div>
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
          RETURN MODAL
      ====================================================== */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-[pageEnter_0.25s_ease-out] no-print">
          <form
            onSubmit={handleReturnSubmit}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white p-5 sm:p-6 border-b border-white/[0.08] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">
                    Process Item Return
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Restock item and adjust dues</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {returnError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start gap-2 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{returnError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Return Qty (Max: {invoiceQuantity}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={returnedQty}
                    onChange={(e) => setReturnedQty(Number(e.target.value))}
                    max={invoiceQuantity}
                    min="1"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    {saleObj.paymentType === 'Installment' ? 'Adjust Value / Refund' : 'Refund Cash Amount'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-rose-600 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Return Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Explain why the customer is returning this item..."
                  rows="3"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                  required
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-600 transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={processingReturn}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-purple-950/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              >
                {processingReturn ? 'Processing...' : 'Complete Return'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================
          EXCHANGE MODAL
      ====================================================== */}
      {showExchangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-[pageEnter_0.25s_ease-out] no-print">
          <form
            onSubmit={handleExchangeSubmit}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white p-5 sm:p-6 border-b border-white/[0.08] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">
                    Exchange & Swap Product
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Replace with new inventory item</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowExchangeModal(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {exchangeError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start gap-2 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{exchangeError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Select New Target Product <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedNewProduct}
                  onChange={handleProductChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                  required
                >
                  <option value="">-- Choose In-Stock Product --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.brand} {p.model}) — [Available Stock: {p.quantity}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  New Product Deal Price ({settings?.currency || 'PKR'}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(Number(e.target.value))}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowExchangeModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-600 transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={processingExchange}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              >
                {processingExchange ? 'Processing...' : 'Complete Exchange'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================
          COMPACT PRINT STYLESHEET
      ====================================================== */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 3mm 4mm;
          }

          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
          }

          .no-print {
            display: none !important;
          }

          #printable-thermal-invoice {
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            color: #000000 !important;
            font-size: 8.5px !important;
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