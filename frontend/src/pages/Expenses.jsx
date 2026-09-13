import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import {
  Wallet,
  Search,
  PlusCircle,
  Trash2,
  Calendar,
  FileSpreadsheet,
  X,
  AlertCircle,
  Lock,
  Sparkles,
  RefreshCw,
  CalendarRange,
  Receipt,
  Tag,
  TrendingDown,
  Layers,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const Expenses = () => {
  const { settings } = useSettings();

  // Universal Deletion Mode
  const isDeletionUnlocked = settings?.allowGlobalDeletion === true;

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPreset, setFilterPreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Add Expense Modal states
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Other',
    amount: '',
    notes: '',
    expenseDate: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // =====================================================
  // FETCH EXPENSES
  // =====================================================
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/expenses');

      if (response.data && response.data.success) {
        setExpenses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching dukan expenses:', error);
      toast.error('Failed to load expense records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // =====================================================
  // DELETE EXPENSE HANDLER
  // =====================================================
  const handleDeleteExpense = (id, expenseId, amount) => {
    if (!isDeletionUnlocked) {
      toast.error('Deletion Mode is disabled. Enable it from Settings first.');
      return;
    }

    setConfirmConfig({
      title: 'Delete Expense Voucher',
      message: `Are you sure you want to permanently delete Expense Voucher "${expenseId}" worth ${settings?.currency || 'PKR'} ${Number(amount || 0).toLocaleString()}?`,
      onConfirm: async () => {
        try {
          const response = await api.delete(`/api/expenses/${id}`);

          if (response.data && response.data.success) {
            setExpenses((currentExpenses) =>
              currentExpenses.filter((e) => e._id !== id)
            );

            toast.success(`Expense Voucher ${expenseId} removed successfully!`);
          }
        } catch (error) {
          toast.error(
            error.response?.data?.message || 'Failed to remove expense record.'
          );
        }
      },
    });
  };

  // =====================================================
  // MODAL FORM SUBMIT
  // =====================================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    const amt = Number(formData.amount);

    if (isNaN(amt) || amt <= 0) {
      setModalError('Please enter a valid positive expense amount.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await api.post('/api/expenses', formData);

      if (response.data && response.data.success) {
        toast.success('Expense Voucher registered successfully!');
        setShowAddModal(false);

        setFormData({
          title: '',
          category: 'Other',
          amount: '',
          notes: '',
          expenseDate: '',
        });

        fetchExpenses();
      }
    } catch (error) {
      setModalError(
        error.response?.data?.message || 'Failed to save expense details.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // DATE FILTER
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

  // Filtered list
  const filteredExpenses = expenses.filter((e) => {
    const title = e.title?.toLowerCase() || '';
    const id = e.expenseId?.toLowerCase() || '';
    const category = e.category?.toLowerCase() || '';
    const term = searchTerm.toLowerCase().trim();

    const matchesSearch =
      title.includes(term) || id.includes(term) || category.includes(term);

    const matchesDate = isDateInFilter(e.expenseDate);

    return matchesSearch && matchesDate;
  });

  const totalFilteredExpensesVal = filteredExpenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  // =====================================================
  // CSV EXPORT
  // =====================================================
  const handleDownloadCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No expense logs found for this selected date range.');
      return;
    }

    const headers = ['Voucher ID,Expense Title,Category,Amount,Date & Time,Notes'];

    const rows = filteredExpenses.map((e) => {
      const dateFormatted = new Date(e.expenseDate).toLocaleDateString('en-PK');
      return `"${e.expenseId}","${e.title}","${e.category}",${e.amount},"${dateFormatted}","${e.notes || ''}"`;
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');

    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Expenses_Report_${filterPreset}_${new Date().toISOString().split('T')[0]}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Expense report exported successfully.');
  };

  const formatMoney = (val) =>
    `${settings?.currency || 'PKR'} ${Number(val || 0).toLocaleString('en-PK')}`;

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO HEADER (Matched to Layout theme)
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
                  Expenses Ledger
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {expenses.length} Total Vouchers Recorded
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Yomiyah Akhrajaat (Expenses)
              </h1>

              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                Track dynamic daily, weekly and monthly shop operating expenses, bills, salaries and utilities.
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Log New Expense</span>
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          EXPENSE METRICS KPI CARDS
      ====================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Total Filtered Vouchers */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Filtered Total Vouchers
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {filteredExpenses.length} Records
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Vouchers in selected date range
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Total Expense Amount */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-rose-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Total Expenses Amount
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-rose-600 truncate">
                {formatMoney(totalFilteredExpensesVal)}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Cumulative spent amount
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Wallet className="w-6 h-6" />
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
            placeholder="Search expenses by Title, Category, Voucher ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              { id: 'today', label: 'Today (Daily)' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'dayBeforeYesterday', label: 'Day Before' },
              { id: 'week', label: '7 Days' },
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
          EXPENSES TABLE
      ====================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-xs font-black uppercase tracking-wider">
              Accessing expenses register...
            </span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <Wallet className="w-12 h-12 text-slate-300" />
            <p className="text-sm font-black text-slate-700">No expense records found</p>
            <p className="text-xs text-slate-400 max-w-sm">
              Click "Log New Expense" to register daily shop expenses into your accounts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 font-medium">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Voucher ID</th>
                  <th className="px-6 py-4">Expense Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Amount Spent</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4">Expense Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((e) => (
                  <tr key={e._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-black text-indigo-600 tracking-wider">
                      {e.expenseId}
                    </td>

                    <td className="px-6 py-3.5 font-black text-slate-900">
                      {e.title}
                    </td>

                    <td className="px-6 py-3.5">
                      <span className="inline-flex px-2.5 py-0.5 rounded-md bg-slate-100 font-bold text-[10px] text-slate-700 border border-slate-200">
                        {e.category}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-right font-black text-rose-600 text-sm">
                      {formatMoney(e.amount)}
                    </td>

                    <td
                      className="px-6 py-3.5 text-slate-500 truncate max-w-[180px]"
                      title={e.notes}
                    >
                      {e.notes || '—'}
                    </td>

                    <td className="px-6 py-3.5 text-slate-500 font-semibold whitespace-nowrap">
                      {new Date(e.expenseDate).toLocaleDateString('en-PK', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      {isDeletionUnlocked ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteExpense(e._id, e.expenseId, e.amount)
                          }
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                          title="Delete Expense Voucher"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================
          ADD EXPENSE MODAL
      ====================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-[pageEnter_0.25s_ease-out]">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="relative bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white p-5 sm:p-6 border-b border-white/[0.08] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-950/40">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">
                    Log Daily Expense
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Record shop expense voucher</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {modalError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start gap-2 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Expense Title / Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Shop Electricity Bill, Staff Lunch, Stationary"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />
              </div>

              {/* Category + Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                    required
                  >
                    {[
                      'Rent',
                      'Electricity Bill',
                      'Salaries',
                      'Tea & Entertainment',
                      'Stationery',
                      'Repair & Maintenance',
                      'Other',
                    ].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Amount Spent ({settings?.currency || 'PKR'}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-rose-600 bg-slate-50 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all"
                    required
                    min="1"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Expense Date (Leave empty for Today)
                </label>
                <input
                  type="date"
                  name="expenseDate"
                  value={formData.expenseDate}
                  onChange={handleInputChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Additional Notes / Reference
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Optional details, receipt number or supplier notes..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-600 transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              >
                {isSubmitting ? 'Logging Expense...' : 'Complete Log Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

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

export default Expenses;