
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { ALLOW_GLOBAL_DELETION } from '../utils/config';
import {
  CreditCard,
  Search,
  Printer,
  X,
  ShieldCheck,
  Trash2,
  Folder,
  Layers,
  ChevronRight,
  Lock,
  Calendar
} from 'lucide-react';

const Payments = () => {
  const { settings } = useSettings();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Tab View Mode
  const [viewModeTab, setViewModeTab] = useState(0);
  const [selectedInvoiceGroup, setSelectedInvoiceGroup] = useState(null);

  // Universal Date Filter states
  const [filterPreset, setFilterPreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const response = await api.get('/api/payments');

      if (response.data && response.data.success) {
        setPayments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching payments history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleDeletePayment = async (id, paymentId) => {
    if (
      window.confirm(
        `Are you sure you want to delete this payment receipt to clean up the ledger?`
      )
    ) {
      try {
        const res = await api.delete(`/api/payments/${id}`);

        if (res.data && res.data.success) {
          setPayments(
            payments.filter((p) => p._id !== id)
          );

          if (selectedInvoiceGroup) {
            setSelectedInvoiceGroup((prev) => ({
              ...prev,
              receipts: prev.receipts.filter(
                (p) => p._id !== id
              )
            }));
          }

          alert(`Payment receipt removed successfully!`);
        }
      } catch (error) {
        alert(
          error.response?.data?.message ||
            'Failed to delete payment receipt.'
        );
      }
    }
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

  // Helper to filter dates
  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false;

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterPreset === 'all') return true;

    if (filterPreset === 'today') {
      return date.getTime() === today.getTime();
    }

    if (filterPreset === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);

      return date >= startOfWeek && date <= today;
    }

    if (filterPreset === 'month') {
      const startOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      return date >= startOfMonth && date <= today;
    }

    if (
      filterPreset === 'custom' &&
      customStartDate &&
      customEndDate
    ) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);

      return date >= start && date <= end;
    }

    return true;
  };

  // Combined Search & Date Filter logic
  const filteredPayments = payments.filter((p) => {
    const name =
      p.customer?.fullName?.toLowerCase() || '';

    const mobile = p.customer?.mobileNumber || '';

    const invoiceNumber = (
      p.sale?.saleId ||
      p.installmentPlan?.sale?.saleId ||
      ''
    ).toLowerCase();

    const term = searchTerm.toLowerCase();

    const matchesSearch =
      name.includes(term) ||
      mobile.includes(term) ||
      invoiceNumber.includes(term);

    const matchesDate = isDateInFilter(
      p.paymentDate
    );

    return matchesSearch && matchesDate;
  });

  // Invoice-wise classification map
  const invoiceGroupsMap = {};

  filteredPayments.forEach((p) => {
    const invoiceNo =
      p.sale?.saleId ||
      p.installmentPlan?.sale?.saleId ||
      'UNLINKED-INVOICE';

    if (!invoiceGroupsMap[invoiceNo]) {
      invoiceGroupsMap[invoiceNo] = {
        invoiceNumber: invoiceNo,
        customer: p.customer,
        product:
          p.installmentPlan?.product ||
          p.sale?.product,
        installmentPlan: p.installmentPlan,
        sale: p.sale,
        totalPaidOnThisInvoice: 0,
        receipts: []
      };
    }

    invoiceGroupsMap[invoiceNo]
      .totalPaidOnThisInvoice += p.amount || 0;

    invoiceGroupsMap[invoiceNo]
      .receipts.push(p);
  });

  const invoiceGroupsList =
    Object.values(invoiceGroupsMap);

  const handlePrint = () => {
    window.print();
  };

  const planDoc = activeReceipt?.installmentPlan;
  const totalPlanAmount =
    planDoc?.totalAmount || 0;

  const remainingDues =
    planDoc?.remainingBalance || 0;

  const totalPaidSoFar = Math.max(
    0,
    totalPlanAmount - remainingDues
  );

  const baseCashPrice =
    planDoc?.sale?.finalTotal ||
    (totalPlanAmount > 0
      ? Math.round(totalPlanAmount / 1.25)
      : 0);

  const invoiceBillNumber =
    activeReceipt?.sale?.saleId ||
    planDoc?.sale?.saleId ||
    activeReceipt?.installmentPlan?.saleId ||
    'N/A';

  return (
    <>
      <div className="space-y-6 print:hidden">

        {/* Header & Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-sans">
              Payments & Invoices Ledger
            </h2>

            <p className="text-sm text-gray-600 font-medium">
              Filter payments by date, search by Invoice Number, and view collections.
            </p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl border self-start md:self-auto">
            <button
              onClick={() => setViewModeTab(0)}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-colors flex items-center space-x-1.5 ${
                viewModeTab === 0
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-slate-900'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>
                Invoice Classification ({invoiceGroupsList.length})
              </span>
            </button>

            <button
              onClick={() => setViewModeTab(1)}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-colors flex items-center space-x-1.5 ${
                viewModeTab === 1
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>
                All Receipts Ledger ({filteredPayments.length})
              </span>
            </button>
          </div>
        </div>

        {/* SEARCH & UNIVERSAL DATE FILTERS BAR */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />

            <input
              type="text"
              placeholder="Search directly by Invoice / Bill Number (e.g. BILL-101), Customer Name, or Phone..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Date Filter Presets */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All-Time' },
                { id: 'today', label: 'Received Today' },
                { id: 'week', label: 'Received This Week' },
                { id: 'month', label: 'Received This Month' },
                { id: 'custom', label: 'Custom Range' }
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() =>
                    setFilterPreset(preset.id)
                  }
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                    filterPreset === preset.id
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {filterPreset === 'custom' && (
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-500">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />

                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) =>
                    setCustomStartDate(e.target.value)
                  }
                  className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
                />

                <span>to</span>

                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) =>
                    setCustomEndDate(e.target.value)
                  }
                  className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* TAB 0: INVOICE-WISE CLASSIFICATION */}
        {viewModeTab === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50/50 border-b flex justify-between items-center">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>
                  Invoice Numbers Classification List
                </span>
              </h3>

              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                Click any invoice to view its receipts
              </span>
            </div>

            {loading ? (
              <div className="p-10 text-center font-bold text-sm text-gray-500">
                Loading invoice payments hub...
              </div>
            ) : invoiceGroupsList.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-xs">
                No invoice payment collections found for this selection.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Invoice / Bill #</th>
                      <th className="px-6 py-4">Customer Details</th>
                      <th className="px-6 py-4">Product details</th>
                      <th className="px-6 py-4 text-right">
                        Total Deal Cost
                      </th>
                      <th className="px-6 py-4 text-right text-green-700">
                        Total Paid
                      </th>
                      <th className="px-6 py-4 text-right text-red-600">
                        Remaining Dues
                      </th>
                      <th className="px-6 py-4 text-center">
                        Receipts Count
                      </th>
                      <th className="px-6 py-4 text-center">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {invoiceGroupsList.map((group) => {
                      const remaining =
                        group.installmentPlan?.remainingBalance ||
                        0;

                      const totalCost =
                        group.installmentPlan?.totalAmount ||
                        group.sale?.finalTotal ||
                        0;

                      return (
                        <tr
                          key={group.invoiceNumber}
                          className="hover:bg-gray-50/50"
                        >
                          <td className="px-6 py-4 text-indigo-600 font-extrabold tracking-wider">
                            {group.invoiceNumber}
                          </td>

                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-gray-900">
                                {group.customer?.fullName ||
                                  'Walk-in'}
                              </p>

                              <p className="text-xs text-gray-500">
                                {group.customer?.mobileNumber ||
                                  ''}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-slate-800 text-xs">
                            {group.product?.name || 'Item'}
                          </td>

                          <td className="px-6 py-4 text-right font-bold text-slate-900">
                            {settings.currency}{' '}
                            {totalCost.toLocaleString()}
                          </td>

                          <td className="px-6 py-4 text-right font-bold text-green-700">
                            +{settings.currency}{' '}
                            {group.totalPaidOnThisInvoice.toLocaleString()}
                          </td>

                          <td className="px-6 py-4 text-right font-black text-red-600">
                            {settings.currency}{' '}
                            {remaining.toLocaleString()}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                              {group.receipts.length} Receipts
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                setSelectedInvoiceGroup(group)
                              }
                              className="inline-flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                            >
                              <span>View Receipts</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: ALL RECEIPTS LIST */}
        {viewModeTab === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {filteredPayments.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-xs">
                No receipts logged for this selection.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-4">
                        Invoice / Bill #
                      </th>
                      <th className="px-6 py-4">
                        Customer Details
                      </th>
                      <th className="px-6 py-4">
                        Installment Month
                      </th>
                      <th className="px-6 py-4 text-right">
                        Amount Paid
                      </th>
                      <th className="px-6 py-4 font-bold">
                        Method
                      </th>
                      <th className="px-6 py-4">
                        Collection Date
                      </th>
                      <th className="px-6 py-4 text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {filteredPayments.map((p) => {
                      const invNo =
                        p.sale?.saleId ||
                        p.installmentPlan?.sale?.saleId ||
                        'N/A';

                      return (
                        <tr
                          key={p._id}
                          className="hover:bg-gray-50/50"
                        >
                          <td className="px-6 py-4 text-indigo-600 font-extrabold tracking-wider">
                            {invNo}
                          </td>

                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900">
                              {p.customer?.fullName || 'N/A'}
                            </p>

                            <p className="text-xs text-gray-500">
                              {p.customer?.mobileNumber || ''}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-slate-800">
                            Installment #{p.installment?.installmentNumber}
                          </td>

                          <td className="px-6 py-4 text-right font-extrabold text-green-600">
                            {settings.currency}{' '}
                            {p.amount.toLocaleString()}
                          </td>

                          <td className="px-6 py-4 font-bold text-slate-800">
                            {p.paymentMethod}
                          </td>

                          <td className="px-6 py-4 text-xs text-gray-500">
                            {formatDateTime(p.paymentDate)}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() =>
                                  setActiveReceipt(p)
                                }
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                                title="Print Receipt"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {ALLOW_GLOBAL_DELETION ? (
                                <button
                                  onClick={() =>
                                    handleDeletePayment(
                                      p._id,
                                      p.paymentId
                                    )
                                  }
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                                  title="Delete Payment"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed select-none"
                                  title="Locked: Only Admin can unlock from config"
                                >
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>Locked</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: VIEW ALL RECEIPTS OF A SPECIFIC INVOICE */}
      {selectedInvoiceGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white border rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-widest">
                  Invoice Receipts Hub
                </span>

                <h3 className="font-extrabold text-base text-slate-900">
                  Bill No:{' '}
                  <strong className="text-indigo-600">
                    {selectedInvoiceGroup.invoiceNumber}
                  </strong>{' '}
                  ({selectedInvoiceGroup.customer?.fullName})
                </h3>
              </div>

              <button
                onClick={() =>
                  setSelectedInvoiceGroup(null)
                }
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 text-center font-bold">
                <div>
                  <span className="text-[9px] uppercase text-gray-400 block">
                    Product
                  </span>

                  <p className="text-slate-800 mt-0.5">
                    {selectedInvoiceGroup.product?.name ||
                      'Item'}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] uppercase text-gray-400 block">
                    Total Paid So-far
                  </span>

                  <p className="text-green-700 mt-0.5">
                    {settings.currency}{' '}
                    {selectedInvoiceGroup.totalPaidOnThisInvoice.toLocaleString()}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] uppercase text-gray-400 block">
                    Remaining Dues
                  </span>

                  <p className="text-red-600 mt-0.5">
                    {settings.currency}{' '}
                    {(
                      selectedInvoiceGroup.installmentPlan?.remainingBalance ||
                      0
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b font-bold text-gray-500 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">
                        Installment Month
                      </th>
                      <th className="px-4 py-3 text-right">
                        Amount Received
                      </th>
                      <th className="px-4 py-3">
                        Payment Date & Time
                      </th>
                      <th className="px-4 py-3 text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {selectedInvoiceGroup.receipts.map((p) => (
                      <tr
                        key={p._id}
                        className="hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-3 text-slate-800 font-bold">
                          Month #{p.installment?.installmentNumber}
                        </td>

                        <td className="px-4 py-3 text-right font-extrabold text-green-600">
                          {settings.currency}{' '}
                          {p.amount.toLocaleString()}
                        </td>

                        <td className="px-4 py-3 text-gray-500 text-[10px]">
                          {formatDateTime(p.paymentDate)}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() =>
                                setActiveReceipt(p)
                              }
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                              title="Print This Slip"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {ALLOW_GLOBAL_DELETION && (
                              <button
                                onClick={() =>
                                  handleDeletePayment(
                                    p._id,
                                    p.paymentId
                                  )
                                }
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:static print:p-0 print:bg-white">

          <style>{`
            .hide-scrollbar, .hide-scrollbar * {
              scrollbar-width: none !important;
              -ms-overflow-style: none !important;
            }

            .hide-scrollbar::-webkit-scrollbar,
            .hide-scrollbar *::-webkit-scrollbar {
              display: none !important;
            }

            @page {
              size: auto;
              margin: 4mm;
            }

            @media print {
              html, body {
                background-color: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: monospace !important;
                height: auto !important;
                width: 100% !important;
              }

              .print\\:hidden, button {
                display: none !important;
              }

              #printable-receipt-modal-container {
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
                page-break-inside: avoid !important;
              }

              .border-b, .border-t {
                border-color: black !important;
                border-style: dashed !important;
              }

              tr, .no-split {
                page-break-inside: avoid !important;
              }
            }
          `}</style>

          <div
            id="printable-receipt-modal-container"
            className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm my-auto shadow-2xl flex flex-col max-h-[90vh] print:shadow-none print:border-none print:max-h-full print:my-0 print:w-[80mm] print:mx-auto"
          >
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0 print:hidden rounded-t-2xl">
              <span className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Print Receipt Preview</span>
              </span>

              <div className="flex space-x-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>

                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className="p-6 space-y-3.5 text-slate-800 font-mono overflow-y-auto flex-1 hide-scrollbar print:overflow-visible print:p-0"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-300 space-y-1">
                <h3 className="text-lg font-black tracking-wider uppercase">
                  {settings.shopName || 'Electronics Shop'}
                </h3>

                <p className="text-[10px] text-gray-500 font-bold">
                  {settings.shopAddress ||
                    'Dukan Address Details'}
                </p>

                <p className="text-[11px] font-extrabold text-slate-900">
                  Mob:{' '}
                  {settings.shopPhone ||
                    '+92 300 1234567'}
                </p>

                <p className="text-[10px] font-bold text-indigo-600 tracking-wider">
                  INSTALLMENT PAYMENT RECEIPT
                </p>
              </div>

              {/* ONLY INVOICE NUMBER */}
              <div className="flex justify-between items-center text-[11px] border-b border-dashed border-slate-300 pb-1.5 font-bold">
                <div>
                  Invoice / Bill #:{' '}
                  <strong className="text-indigo-600 font-black">
                    {invoiceBillNumber}
                  </strong>
                </div>

                <div className="text-right text-[10px] text-slate-700">
                  {formatDateTime(
                    activeReceipt.paymentDate
                  )}
                </div>
              </div>

              {/* CUSTOMER & PRODUCT */}
              <div className="grid grid-cols-2 gap-4 py-1 border-b border-dashed border-slate-300 text-[11px]">
                <div className="space-y-0.5 border-r border-dashed border-slate-200 pr-2">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block">
                    Customer
                  </span>

                  <p className="font-extrabold text-slate-900 truncate">
                    {activeReceipt.customer?.fullName ||
                      'Walk-in'}
                  </p>

                  <p className="text-slate-600 font-bold text-[10px]">
                    {activeReceipt.customer?.mobileNumber ||
                      ''}
                  </p>

                  <p className="text-[9px] text-slate-500 truncate">
                    CNIC: {activeReceipt.customer?.cnic || ''}
                  </p>
                </div>

                <div className="space-y-0.5 pl-1">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block">
                    Product Financed
                  </span>

                  <p className="font-extrabold text-slate-900 truncate">
                    {planDoc?.product?.name || 'Item'}
                  </p>

                  <p className="text-slate-600 font-bold text-[10px] truncate">
                    {planDoc?.product?.brand || ''}{' '}
                    {planDoc?.product?.model || ''}
                  </p>
                </div>
              </div>

              {/* PRICING BREAKDOWN */}
              <div className="space-y-1.5 text-[11px] font-bold text-gray-800">
                <div className="flex justify-between">
                  <span>Unit Cash Price:</span>

                  <span>
                    {settings.currency}{' '}
                    {baseCashPrice.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-purple-900">
                  <span>Financing Plan Taken:</span>

                  <span className="text-indigo-600 font-black">
                    {planDoc?.duration || 0} Months Plan
                  </span>
                </div>

                <div className="flex justify-between text-slate-900">
                  <span>Total Price (Plan Included):</span>

                  <span>
                    {settings.currency}{' '}
                    {totalPlanAmount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-green-700 border-b border-dashed border-slate-200 pb-1">
                  <span>Total Paid (So far):</span>

                  <span>
                    {settings.currency}{' '}
                    {totalPaidSoFar.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between pt-1">
                  <span>Settled Month:</span>

                  <span>
                    Installment #{activeReceipt.installment?.installmentNumber}
                  </span>
                </div>

                {activeReceipt.originalInstallmentAmount >
                  activeReceipt.amount && (
                  <div className="bg-orange-50 border border-dashed border-orange-200 p-2 rounded text-[9px] text-orange-800 space-y-0.5">
                    <p className="font-black uppercase tracking-wider">
                      Carry-Forward Adjustment:
                    </p>

                    <div className="flex justify-between">
                      <span>Standard Month Due:</span>

                      <span>
                        {settings.currency}{' '}
                        {activeReceipt.originalInstallmentAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between font-extrabold text-red-600">
                      <span>
                        Carried Forward to Future:
                      </span>

                      <span>
                        +{settings.currency}{' '}
                        {activeReceipt.carryForwardAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between border-t border-dashed border-slate-300 pt-1.5 items-center text-sm font-black text-slate-900">
                  <span>This Receipt Paid:</span>

                  <span className="text-green-600">
                    {settings.currency}{' '}
                    {activeReceipt.amount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-gray-500 pt-0.5 border-b border-dashed border-slate-300 pb-1.5">
                  <span>Remaining Dues Balance:</span>

                  <span className="text-red-500 font-extrabold">
                    {settings.currency}{' '}
                    {remainingDues.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* SIGNATURES */}
              <div className="pt-6 flex justify-between items-end text-center text-[9px] font-bold border-t border-dashed border-slate-300 print:pt-6">
                <div className="border-t border-dashed border-gray-400 w-24 pt-1">
                  Customer Sign
                </div>

                <div className="border-t border-dashed border-gray-400 w-24 pt-1">
                  Cashier Sign
                </div>
              </div>

              <div className="text-center pt-1">
                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-extrabold">
                  *** Thank You! ***
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Payments;
