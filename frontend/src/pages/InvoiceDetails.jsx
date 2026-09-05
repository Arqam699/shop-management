
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import {
  ArrowLeft,
  Printer,
  Calculator,
  Layers,
  RefreshCw,
  X,
  AlertCircle
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

  const fetchInvoiceAndProducts = async () => {
    try {
      setLoading(true);

      const [saleRes, prodRes] = await Promise.all([
        api.get(`/api/sales/${id}`),
        api.get('/api/products')
      ]);

      if (saleRes.data && saleRes.data.success) {
        setInvoice(saleRes.data.data);
        setRefundAmount(saleRes.data.data.finalTotal || 0);
      }

      if (prodRes.data && prodRes.data.success) {
        setProducts(
          prodRes.data.data.filter(
            (p) => p.quantity > 0
          )
        );
      }
    } catch (error) {
      console.error(
        'Error loading tax invoice details:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceAndProducts();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';

    const date = new Date(dateStr);

    return date.toLocaleString('en-PK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();

    setReturnError('');
    setProcessingReturn(true);

    const invoiceQty = invoice?.quantity || 0;

    if (returnedQty > invoiceQty) {
      setReturnError(
        `Cannot return more than purchased quantity (${invoiceQty} units).`
      );
      setProcessingReturn(false);
      return;
    }

    try {
      const response = await api.post('/api/returns', {
        saleId: invoice._id,
        returnedQty,
        refundAmount,
        reason: returnReason
      });

      if (response.data && response.data.success) {
        alert(
          'Return processed successfully! Stock restored and dues adjusted.'
        );

        setShowReturnModal(false);
        navigate('/returns');
      }
    } catch (error) {
      setReturnError(
        error.response?.data?.message ||
        'Failed to submit return request.'
      );
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleProductChange = (e) => {
    const prodId = e.target.value;

    setSelectedNewProduct(prodId);

    const found = products.find(
      (p) => p._id === prodId
    );

    setNewProductPrice(
      found ? found.salePrice || 0 : 0
    );
  };

  const handleExchangeSubmit = async (e) => {
    e.preventDefault();

    setExchangeError('');
    setProcessingExchange(true);

    if (!selectedNewProduct) {
      setExchangeError(
        'Please select a target product for exchange.'
      );
      setProcessingExchange(false);
      return;
    }

    try {
      const res = await api.post(
        `/api/sales/${invoice._id}/exchange`,
        {
          newProductId: selectedNewProduct,
          newPrice: newProductPrice
        }
      );

      if (res.data && res.data.success) {
        alert(
          'Exchange processed successfully! Stocks swapped and dynamic kist adjusted!'
        );

        setShowExchangeModal(false);
        fetchInvoiceAndProducts();
      }
    } catch (error) {
      setExchangeError(
        error.response?.data?.message ||
        'Failed to complete exchange.'
      );
    } finally {
      setProcessingExchange(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>

        <span className="text-gray-500 text-sm font-semibold">
          Drafting printable thermal invoice...
        </span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center p-10 text-red-600">
        Error: Invoice metadata lost.
      </div>
    );
  }

  const originalPrice = invoice.finalTotal || 0;
  const duration = invoice.installmentDuration || 0;

  const markupAmount = invoice.installmentPlan
    ? (invoice.installmentPlan.totalAmount || 0) -
      originalPrice
    : 0;

  const totalCostWithPlan =
    originalPrice + markupAmount;

  const downPaymentPaid =
    invoice.downPayment || 0;

  const installmentsArray =
    invoice.installments || [];

  const totalInstallmentsCount =
    installmentsArray.length;

  const paidInstallmentsCount =
    installmentsArray.filter(
      (inst) => inst.status === 'Paid'
    ).length;

  const remainingInstallmentsCount =
    totalInstallmentsCount -
    paidInstallmentsCount;

  const totalPaidInstallmentsValue =
    installmentsArray
      .filter((inst) => inst.status === 'Paid')
      .reduce(
        (sum, inst) =>
          sum + (inst.amount || 0),
        0
      );

  const totalPaidSoFar =
    downPaymentPaid +
    totalPaidInstallmentsValue;

  const remainingBalanceDue =
    invoice.remainingBalance || 0;

  const invoiceUnitPrice =
    invoice.unitPrice || 0;

  const invoiceQuantity =
    invoice.quantity || 0;

  return (
    <div className="max-w-md mx-auto space-y-6">

      {/* PURE NO-SCROLL PRINT & SCREEN STYLES */}
      <style>{`
        #printable-thermal-invoice,
        #printable-thermal-invoice * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        #printable-thermal-invoice::-webkit-scrollbar,
        #printable-thermal-invoice *::-webkit-scrollbar {
          display: none !important;
        }

        @page {
          size: auto;
          margin: 4mm;
        }

        @media print {
          html,
          body {
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: monospace !important;
            height: auto !important;
            overflow: visible !important;
          }

          aside,
          header,
          .print\\:hidden,
          button {
            display: none !important;
          }

          #printable-thermal-invoice {
            border: none !important;
            box-shadow: none !important;
            position: static !important;
            transform: none !important;
            width: 80mm !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }

          .border-b,
          .border-t {
            border-color: black !important;
            border-style: dashed !important;
          }

          tr,
          .no-split {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Action Header controls */}
      <div className="flex justify-between items-center bg-white p-4 border border-gray-200 rounded-xl shadow-sm print:hidden">
        <Link
          to="/invoices"
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex space-x-1.5">
          {invoiceQuantity > 0 && (
            <>
              <button
                onClick={() => {
                  setShowExchangeModal(true);
                  setSelectedNewProduct('');
                  setNewProductPrice(0);
                  setExchangeError('');
                }}
                className="flex items-center space-x-1 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] px-2.5 py-2 rounded-lg transition-colors"
                title="Swap Product with another item"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Exchange</span>
              </button>

              <button
                onClick={() => {
                  setShowReturnModal(true);
                  setReturnedQty(1);
                  setReturnReason('');
                }}
                className="flex items-center space-x-1 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[10px] px-2.5 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Return</span>
              </button>
            </>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3.5 py-2 rounded-lg shadow transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Slip</span>
          </button>
        </div>
      </div>

      {/* RESTORED PREVIOUS COMFORTABLE DESIGN */}
      <div
        className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-4 text-xs font-mono text-slate-800 overflow-visible print:p-0 print:border-none print:shadow-none"
        id="printable-thermal-invoice"
      >

        {/* SHOP HEADER */}
        <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-300">
          <h1 className="text-lg font-black tracking-wider uppercase">
            {settings.shopName}
          </h1>

          <p className="text-[10px] text-gray-500 font-bold">
            {settings.shopAddress}
          </p>

          <p className="text-[11px] font-extrabold text-slate-900">
            Mob: {settings.shopPhone}
          </p>

          <p className="text-[10px] font-bold text-indigo-600 tracking-wider">
            SALE SLIP / TAX INVOICE
          </p>
        </div>

        {/* INVOICE METADATA */}
        <div className="grid grid-cols-2 text-[10px] py-1 border-b border-dashed border-slate-300 gap-1 font-bold">
          <div>
            Invoice: {invoice.saleId}
          </div>

          <div className="text-right">
            {formatDateTime(invoice.saleDate)}
          </div>
        </div>

        {/* CUSTOMER & PRODUCT ROW */}
        <div className="grid grid-cols-2 gap-4 py-1 border-b border-dashed border-slate-300 text-[11px]">
          <div className="space-y-0.5 border-r border-dashed border-slate-200 pr-2">
            <span className="text-[9px] uppercase font-bold text-gray-400 block">
              Customer
            </span>

            <p className="font-extrabold text-slate-900 truncate">
              {invoice.customer?.fullName || 'Walk-in'}
            </p>

            <p className="text-slate-600 font-bold text-[10px]">
              {invoice.customer?.mobileNumber || 'N/A'}
            </p>
          </div>

          <div className="space-y-0.5 pl-1">
            <span className="text-[9px] uppercase font-bold text-gray-400 block">
              Product
            </span>

            <p className="font-extrabold text-slate-900 truncate">
              {invoice.product?.name || 'Item'}
            </p>

            <p className="text-slate-600 font-bold text-[10px] truncate">
              {invoice.product?.brand} {invoice.product?.model}
            </p>
          </div>
        </div>

        {/* PRICING & BREAKDOWN */}
        <div className="space-y-1.5 py-1 text-[11px] font-bold text-slate-800">
          <div className="flex justify-between">
            <span>Cash Net Price:</span>

            <span>
              {settings.currency}{' '}
              {(originalPrice || 0).toLocaleString()}
            </span>
          </div>

          {invoice.paymentType === 'Installment' &&
          invoice.installmentPlan ? (
            <div className="space-y-1.5 border-t border-dashed border-slate-300 pt-1.5">
              <div className="flex justify-between text-purple-900">
                <span>Selected Plan:</span>

                <span className="text-indigo-600 font-black">
                  {duration} Months Plan
                </span>
              </div>

              <div className="flex justify-between text-purple-700">
                <span>
                  Plan Markup Added (
                  {invoice.installmentDuration === 3
                    ? '15%'
                    : invoice.installmentDuration === 6
                    ? '25%'
                    : '50%'}
                  ):
                </span>

                <span>
                  +{settings.currency}{' '}
                  {(markupAmount || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-green-700">
                <span>Down Payment Paid:</span>

                <span>
                  -{settings.currency}{' '}
                  {(downPaymentPaid || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-slate-900 font-black border-t border-dashed border-slate-200 pt-1">
                <span>Total Cost (Plan Included):</span>

                <span>
                  {settings.currency}{' '}
                  {(totalCostWithPlan || 0).toLocaleString()}
                </span>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-1.5 space-y-1 text-[10px] text-gray-500">
                <div className="flex justify-between">
                  <span>Paid Installments:</span>

                  <span className="text-green-700 font-bold">
                    {paidInstallmentsCount} /{' '}
                    {totalInstallmentsCount} Months
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Remaining Installments:</span>

                  <span className="text-amber-700 font-bold">
                    {remainingInstallmentsCount} /{' '}
                    {totalInstallmentsCount} Months
                  </span>
                </div>

                <div className="flex justify-between border-t border-dashed border-slate-200 pt-1 text-green-700 font-bold">
                  <span>Total Paid (So far):</span>

                  <span>
                    {settings.currency}{' '}
                    {(totalPaidSoFar || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-red-600 font-black text-sm pt-0.5">
                  <span>Remaining Balance:</span>

                  <span>
                    {settings.currency}{' '}
                    {(remainingBalanceDue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Installments Schedule Brief */}
              <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-100 mt-2 text-[9px] overflow-visible">
                <p className="font-extrabold text-purple-950 uppercase mb-1">
                  Financing Installments List:
                </p>

                {invoice.installments &&
                  invoice.installments.map((inst) => (
                    <div
                      key={inst._id}
                      className="flex justify-between py-0.5 border-b border-dashed border-purple-100/60 last:border-b-0"
                    >
                      <span>
                        Month #{inst.installmentNumber} ({inst.status})
                      </span>

                      <span>
                        {settings.currency}{' '}
                        {(inst.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="border-t border-dashed border-slate-200 pt-1.5 flex justify-between text-green-700 font-bold">
              <span>Payment Status:</span>
              <span>Fully Settled (Cash)</span>
            </div>
          )}
        </div>

        {/* SIGNATURES */}
        <div className="pt-8 flex justify-between items-end text-center text-[9px] font-bold border-t border-dashed border-slate-300">
          <div className="border-t border-dashed border-gray-400 w-24 pt-1">
            Buyer Sign
          </div>

          <div className="border-t border-dashed border-gray-400 w-24 pt-1">
            Cashier Sign
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-widest font-extrabold">
            *** Thank You! Visit Again ***
          </p>
        </div>
      </div>

      {/* MODAL RETURN */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <form
            onSubmit={handleReturnSubmit}
            className="bg-white border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <span className="font-extrabold text-sm uppercase text-purple-800 tracking-wider flex items-center space-x-1.5">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Process Item Return</span>
              </span>

              <button
                type="button"
                onClick={() =>
                  setShowReturnModal(false)
                }
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {returnError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start space-x-2 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />

                  <span className="font-semibold">
                    {returnError}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500">
                    Return Qty (Max: {invoiceQuantity})
                  </label>

                  <input
                    type="number"
                    value={returnedQty}
                    onChange={(e) =>
                      setReturnedQty(
                        Number(e.target.value)
                      )
                    }
                    max={invoiceQuantity}
                    min="1"
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500">
                    {invoice.paymentType === 'Installment'
                      ? 'Adjust Value / Refund'
                      : 'Refund Cash Amount'}
                  </label>

                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) =>
                      setRefundAmount(
                        Number(e.target.value)
                      )
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500">
                  Return Reason
                </label>

                <textarea
                  value={returnReason}
                  onChange={(e) =>
                    setReturnReason(e.target.value)
                  }
                  placeholder="Explain why the customer is returning this item..."
                  rows="3"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                type="submit"
                disabled={processingReturn}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow transition-colors disabled:bg-purple-400"
              >
                {processingReturn
                  ? 'Processing...'
                  : 'Complete Return'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EXCHANGE */}
      {showExchangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <form
            onSubmit={handleExchangeSubmit}
            className="bg-white border rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <span className="font-extrabold text-sm uppercase text-indigo-800 tracking-wider flex items-center space-x-1.5">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Exchange & Swap Product</span>
              </span>

              <button
                type="button"
                onClick={() =>
                  setShowExchangeModal(false)
                }
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {exchangeError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start space-x-2 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />

                  <span className="font-semibold">
                    {exchangeError}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500">
                  Select New Exchange Item
                </label>

                <select
                  value={selectedNewProduct}
                  onChange={handleProductChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-800"
                  required
                >
                  <option value="">
                    -- Select Product --
                  </option>

                  {products.map((p) => (
                    <option
                      key={p._id}
                      value={p._id}
                    >
                      {p.name} ({p.brand} {p.model}) -
                      Stock: {p.quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500">
                  New Item Deal Price ({settings.currency})
                </label>

                <input
                  type="number"
                  value={newProductPrice}
                  onChange={(e) =>
                    setNewProductPrice(
                      Number(e.target.value)
                    )
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-extrabold text-slate-900"
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                type="submit"
                disabled={processingExchange}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow transition-colors disabled:bg-indigo-400"
              >
                {processingExchange
                  ? 'Processing...'
                  : 'Complete Exchange'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetails;