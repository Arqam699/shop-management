import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { ALLOW_GLOBAL_DELETION } from '../utils/config'; // Security Master Switch
import { Wallet, Search, PlusCircle, Trash2, Calendar, FileSpreadsheet, X, AlertCircle, Lock } from 'lucide-react';

const Expenses = () => {
  const { settings } = useSettings();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

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
    expenseDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/expenses');
      if (response.data && response.data.success) {
        setExpenses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching dukan expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDeleteExpense = async (id, expenseId, amount) => {
    if (window.confirm(`Are you sure you want to permanently delete Expense Voucher "${expenseId}" worth ${settings.currency} ${amount.toLocaleString()}?`)) {
      try {
        const response = await api.delete(`/api/expenses/${id}`);
        if (response.data && response.data.success) {
          setExpenses(expenses.filter(e => e._id !== id));
          alert(`Expense Voucher ${expenseId} removed successfully!`);
        }
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to remove expense record.');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
        alert('Expense Voucher registered successfully!');
        setShowAddModal(false);
        setFormData({ title: '', category: 'Other', amount: '', notes: '', expenseDate: '' });
        fetchExpenses(); 
      }
    } catch (error) {
      setModalError(error.response?.data?.message || 'Failed to save expense details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterPreset === 'all') return true;
    if (filterPreset === 'today') return date.getTime() === today.getTime();
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

  const filteredExpenses = expenses.filter(e => {
    const title = e.title?.toLowerCase() || '';
    const id = e.expenseId?.toLowerCase() || '';
    const category = e.category?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();

    const matchesSearch = title.includes(term) || id.includes(term) || category.includes(term);
    const matchesDate = isDateInFilter(e.expenseDate);

    return matchesSearch && matchesDate;
  });

  const totalFilteredExpensesVal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleDownloadCSV = () => {
    if (filteredExpenses.length === 0) return alert('No expense logs found for this selected date range.');

    const headers = ['Voucher ID,Expense Title,Category,Amount,Date & Time,Notes'];
    const rows = filteredExpenses.map(e => {
      const dateFormatted = new Date(e.expenseDate).toLocaleDateString('en-PK');
      return `"${e.expenseId}","${e.title}","${e.category}",${e.amount},"${dateFormatted}","${e.notes || ''}"`;
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dukan_Expenses_Report_${filterPreset}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">Yomiyah Akhrajaat (Expenses)</h2>
          <p className="text-sm text-gray-600 font-medium">Track dynamic daily, weekly and monthly shop expenses parameters.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center space-x-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Daily Expense</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Filtered Total Vouchers</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{filteredExpenses.length} Records</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Filtered Total Expense Amount</span>
          <p className="text-2xl font-extrabold text-red-600 mt-1">{settings.currency} {totalFilteredExpensesVal.toLocaleString()}</p>
        </div>
      </div>

      {/* SEARCH & UNIVERSAL DATE FILTERS BAR */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search expenses by Title, Category, Voucher ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        {/* Date Filter Presets */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All-Time' },
              { id: 'today', label: 'Today (Daily)' },
              { id: 'week', label: 'Weekly (7 Days)' },
              { id: 'month', label: 'Monthly (This Month)' },
              { id: 'custom', label: 'Custom Range' }
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => setFilterPreset(preset.id)}
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
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              />
              <span>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main ledger listing */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500 text-sm font-semibold">Accessing expenses register...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
            <Wallet className="w-12 h-12 text-gray-300" />
            <p className="text-sm font-semibold">No expense records found for this selection</p>
            <p className="text-xs">Click "Add Daily Expense" to register dukan daily expenses on cloud database.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4">Voucher ID</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4 font-bold text-slate-700">Category</th>
                  <th className="px-6 py-4 text-right">Amount spent</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4">Expense Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExpenses.map((e) => (
                  <tr key={e._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-indigo-600 font-bold tracking-wider">{e.expenseId}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{e.title}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-red-600">{settings.currency} {e.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-500 truncate max-w-[150px]" title={e.notes}>{e.notes || 'N/A'}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(e.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      
                      {/* EXPLICIT "ONLY ADMIN CAN UNLOCK" SECURITY BADGE */}
                      {ALLOW_GLOBAL_DELETION ? (
                        <button
                          onClick={() => handleDeleteExpense(e._id, e.expenseId, e.amount)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                          title="Delete Expense Voucher"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DYNAMIC RECORD NEW DAILY EXPENSE DIALOG MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleFormSubmit} className="bg-white border rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-scale-in">
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <span className="font-extrabold text-sm uppercase text-slate-800 tracking-wider">
                Log New Daily Expense
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modalError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start space-x-2 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500">Expense Title / Description</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Electricity Bill, Chai & Samosa"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-800"
                    required
                  >
                    {['Rent', 'Electricity Bill', 'Salaries', 'Tea & Entertainment', 'Stationery', 'Repair & Maintenance', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500">Amount spent ({settings.currency})</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-extrabold text-slate-900"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500">Custom Date (Leave empty for Today)</label>
                <input
                  type="date"
                  name="expenseDate"
                  value={formData.expenseDate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500">Extra notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Guarantor references, payment medium etc..."
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow transition-colors disabled:bg-indigo-400"
              >
                {isSubmitting ? 'Logging Expense...' : 'Complete Log Entry'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Expenses;