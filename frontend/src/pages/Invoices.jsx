import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { ALLOW_GLOBAL_DELETION } from '../utils/config'; // Security Master Switch
import { FileText, Search, Eye, Trash2, Lock, Calendar } from 'lucide-react';

const Invoices = () => {
  const { settings } = useSettings();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Universal Date Filter states (Today, Week, Month, Custom, All-Time)
  const [filterPreset, setFilterPreset] = useState('all'); 
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sales'); 
      if (response.data && response.data.success) {
        setInvoices(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching invoices ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDeleteInvoice = async (id, saleId) => {
    if (window.confirm(`WARNING: Are you sure you want to cancel and permanently delete Invoice "${saleId}"?\n\nThis will delete the sale, wipe out any associated installment schedules, and automatically RESTORE the stock quantity back to your inventory.`)) {
      try {
        await api.delete(`/sales/${id}`);
        setInvoices(invoices.filter(inv => inv._id !== id));
        alert(`Invoice ${saleId} deleted successfully and stock restored!`);
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete sale invoice.');
      }
    }
  };

  // Helper to filter dates
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

  // Combined Search & Date Filter logic (100% crash-proof)
  const filteredInvoices = invoices.filter(inv => {
    const custName = inv.customer?.fullName?.toLowerCase() || '';
    const sId = inv.saleId?.toLowerCase() || '';
    const prodName = inv.product?.name?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();

    const matchesSearch = custName.includes(term) || sId.includes(term) || prodName.includes(term);
    const matchesDate = isDateInFilter(inv.saleDate);

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">Tax Invoices Ledger</h2>
          <p className="text-sm text-gray-600 font-medium">Filter invoices by date, verify custom Bill Numbers, and print customer slips.</p>
        </div>
      </div>

      {/* SEARCH & UNIVERSAL DATE FILTERS BAR */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice files by Invoice / Bill Number (e.g. BILL-101), Customer Name, or Product..."
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
              { id: 'today', label: 'Invoiced Today' },
              { id: 'week', label: 'Invoiced This Week' },
              { id: 'month', label: 'Invoiced This Month' },
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

      {/* Main List */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500 text-sm">Querying tax invoices database...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
            <FileText className="w-12 h-12 text-gray-300" />
            <p className="text-sm font-semibold">No tax invoices found for this selection</p>
            <p className="text-xs">Try switching date filters to "All-Time" or create a new checkout.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4">Invoice / Bill #</th>
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">Product details</th>
                  <th className="px-6 py-4 text-right">Final Amount</th>
                  <th className="px-6 py-4 text-right">Down Payment</th>
                  <th className="px-6 py-4 text-right text-red-600">Financing Dues</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-indigo-600 font-extrabold tracking-wider">{inv.saleId}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900">{inv.customer?.fullName || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{inv.customer?.mobileNumber || ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-800">{inv.product?.name || 'Deleted Product'}</td>
                    
                    {/* Safe mapping using "|| 0" fallback */}
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{settings.currency} {(inv.finalTotal || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-green-600">{settings.currency} {(inv.downPayment || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-red-600 font-black">{settings.currency} {(inv.remainingBalance || 0).toLocaleString()}</td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                        inv.paymentType === 'Cash' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-purple-50 border-purple-200 text-purple-700'
                      }`}>
                        {inv.paymentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Link 
                          to={`/invoices/${inv._id}`}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                          title="Open Printable Thermal Slip"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* EXPLICIT "ONLY ADMIN CAN UNLOCK" SECURITY BADGE */}
                        {ALLOW_GLOBAL_DELETION ? (
                          <button
                            onClick={() => handleDeleteInvoice(inv._id, inv.saleId)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                            title="Cancel Sale & Restore Stock"
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;