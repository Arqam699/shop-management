import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';
import {
  formatCnicSearchInput,
  matchesCnicSearch,
  matchesMobileSearch,
} from '../utils/cnicSearch';
import { useSettings } from '../context/SettingsContext';
import {
  FileText,
  Search,
  Eye,
  Trash2,
  Lock,
  Calendar,
  Sparkles,
  RefreshCw,
  PlusCircle,
  CalendarRange,
  X,
  Receipt,
  User,
  Package,
  CreditCard,
  Banknote,
  CircleDollarSign,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const Invoices = () => {
  const { settings } = useSettings();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Universal Date Filter states
  const [filterPreset, setFilterPreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Settings-based Universal Deletion Mode
  const isDeletionUnlocked = settings?.allowGlobalDeletion === true;

  // =====================================================
  // FETCH INVOICES
  // =====================================================
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/sales');

      if (response.data && response.data.success) {
        setInvoices(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching invoices ledger:', error);
      toast.error('Failed to load invoice records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // =====================================================
  // DELETE INVOICE & RESTORE STOCK
  // =====================================================
  const handleDeleteInvoice = (id, saleId) => {
    if (!isDeletionUnlocked) {
      toast.error('Deletion Mode is disabled. Enable it from Settings first.');
      return;
    }

    setConfirmConfig({
      title: 'Cancel and Delete Invoice',
      message: `WARNING: Are you sure you want to cancel and permanently delete Invoice "${saleId}"?\n\nThis will delete the sale, wipe out any associated installment schedules, and automatically RESTORE the stock quantity back to your inventory.`,
      onConfirm: async () => {
        try {
          await api.delete(`/api/sales/${id}`);

          setInvoices((currentInvoices) =>
            currentInvoices.filter((inv) => inv._id !== id)
          );

          toast.success(
            `Invoice ${saleId} deleted successfully and stock restored!`
          );
        } catch (error) {
          toast.error(
            error.response?.data?.message || 'Failed to delete sale invoice.'
          );
        }
      },
    });
  };

  // =====================================================
  // DATE FILTER HELPER
  // =====================================================
  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false;

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(today.getDate() - 2);

    if (filterPreset === 'all') return true;
    if (filterPreset === 'today') return date.getTime() === today.getTime();
    if (filterPreset === 'yesterday') return date.getTime() === yesterday.getTime();
    if (filterPreset === 'dayBeforeYesterday')
      return date.getTime() === dayBeforeYesterday.getTime();

    if (filterPreset === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      return date >= startOfWeek && date <= today;
    }

    if (filterPreset === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return date >= startOfMonth && date <= today;
    }

    if (filterPreset === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);

      return date >= start && date <= end;
    }

    return true;
  };

  // =====================================================
  // FILTERED INVOICES
  // =====================================================
  const filteredInvoices = invoices.filter((inv) => {
    const custName = inv.customer?.fullName?.toLowerCase() || '';
    const sId = inv.saleId?.toLowerCase() || '';
    const prodName = inv.product?.name?.toLowerCase() || '';
    const custCnic = inv.customer?.cnic || inv.customer?.CNIC || '';
    const custMobile = inv.customer?.mobileNumber || inv.customer?.mobile || '';
    const term = searchTerm.toLowerCase().trim();

    const matchesSearch =
      custName.includes(term) ||
      matchesMobileSearch(custMobile, term) ||
      matchesCnicSearch(custCnic, term) ||
      sId.includes(term) ||
      prodName.includes(term);

    const matchesDate = isDateInFilter(inv.saleDate || inv.createdAt);

    return matchesSearch && matchesDate;
  });

  const totalInvoicedVal = filteredInvoices.reduce(
    (sum, inv) => sum + Number(inv.finalTotal || inv.totalAmount || 0),
    0
  );

  const totalOutstandingDues = filteredInvoices.reduce(
    (sum, inv) => sum + Number(inv.remainingBalance || 0),
    0
  );

  const formatMoney = (val) =>
    `${settings?.currency || 'PKR'} ${Number(val || 0).toLocaleString('en-PK')}`;

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO HEADER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Tax Invoices & Slips
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {invoices.length} Total Registered Invoices
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Tax Invoices Ledger
              </h1>

              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                Search sales records by invoice ID, verify custom bill numbers, open printable thermal slips and manage accounts.
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={fetchInvoices}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                <span>Refresh</span>
              </button>

              <Link
                to="/sales/new"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Invoice Checkout</span>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          INVOICE METRICS KPI CARDS
      ====================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Invoices Count */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Filtered Invoices
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {filteredInvoices.length} Slips
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Invoices in date range
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Total Invoiced Value */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Total Invoiced Value
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 truncate">
                {formatMoney(totalInvoicedVal)}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Total gross sales billed
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CircleDollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Remaining Dues */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-rose-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Remaining Financed Dues
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-rose-600 truncate">
                {formatMoney(totalOutstandingDues)}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Installment recovery pending
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

      </div>

      {/* =====================================================
          SEARCH & DATE FILTERS TOOLBAR
      ====================================================== */}
      <section className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-3xl shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoices by invoice/bill number, customer name, mobile, CNIC, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(formatCnicSearchInput(e.target.value))}
            className="w-full h-11 border border-slate-200 rounded-xl pl-11 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter Presets */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
            {[
              { id: 'all', label: 'All-Time' },
              { id: 'today', label: 'Invoiced Today' },
              { id: 'yesterday', label: 'Invoiced Yesterday' },
              { id: 'dayBeforeYesterday', label: 'Day Before' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setFilterPreset(preset.id)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  filterPreset === preset.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/20 scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {filterPreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 animate-[pageEnter_0.2s_ease-out]">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-700 outline-none"
                />
              </div>

              <span>to</span>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-violet-600" />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-700 outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          INVOICES LEDGER TABLE
      ====================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-xs font-black uppercase tracking-wider">
              Accessing tax invoices database...
            </span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <FileText className="w-12 h-12 text-slate-300" />
            <p className="text-sm font-black text-slate-700">No tax invoices found</p>
            <p className="text-xs text-slate-400 max-w-sm">
              Try switching filters to "All-Time" or click "New Invoice Checkout" to generate fresh sales receipts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 font-medium">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-4">Invoice / Bill #</th>
                  <th className="px-5 py-4">Customer Details</th>
                  <th className="px-5 py-4">Product Details</th>
                  <th className="px-5 py-4 text-right">Final Total</th>
                  <th className="px-5 py-4 text-right">Down Payment</th>
                  <th className="px-5 py-4 text-right text-rose-600 font-black">Financing Dues</th>
                  <th className="px-5 py-4 text-center">Payment Term</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-black text-indigo-600 tracking-wider">
                      {inv.saleId || '—'}
                    </td>

                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-black text-slate-900">
                          {inv.customer?.fullName || 'Walk-in'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {inv.customer?.mobileNumber || ''}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-700 font-bold truncate max-w-[170px]">
                      {inv.product?.name || 'Deleted Product'}
                    </td>

                    <td className="px-5 py-3.5 text-right font-black text-slate-900">
                      {formatMoney(inv.finalTotal || inv.totalAmount || 0)}
                    </td>

                    <td className="px-5 py-3.5 text-right font-black text-emerald-600">
                      +{formatMoney(inv.downPayment || 0)}
                    </td>

                    <td className="px-5 py-3.5 text-right font-black text-rose-600 text-sm">
                      {formatMoney(inv.remainingBalance || 0)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                          inv.paymentType === 'Cash'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        }`}
                      >
                        {inv.paymentType || 'Cash'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Printable Thermal Slip */}
                        <Link
                          to={`/invoices/${inv._id}`}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                          title="Open Printable Thermal Slip"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* Delete Invoice */}
                        {isDeletionUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv._id, inv.saleId)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                            title="Cancel Sale & Restore Stock"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-400"
                            title="Deletion Mode is locked in Settings"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!confirmConfig}
        onClose={() => setConfirmConfig(null)}
        onConfirm={async () => {
          if (confirmConfig?.onConfirm) {
            await confirmConfig.onConfirm();
          }
          setConfirmConfig(null);
        }}
        title={confirmConfig?.title || 'Confirm Action'}
        message={confirmConfig?.message || 'Are you sure you want to proceed?'}
      />

    </div>
  );
};

export default Invoices;