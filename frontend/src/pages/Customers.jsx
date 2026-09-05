import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { ALLOW_GLOBAL_DELETION } from '../utils/config'; // Security Master Switch
import { Plus, Search, Edit2, Trash2, Eye, UserCheck, Lock, Calendar } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Universal Date Filter states (Today, Week, Month, Custom, All-Time)
  const [filterPreset, setFilterPreset] = useState('all'); 
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customers');
      if (response.data && response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Error loading customer index:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete customer profile for "${name}"?`)) {
      try {
        await api.delete(`/customers/${id}`);
        setCustomers(customers.filter(c => c._id !== id));
        alert(`Customer ${name} profile deleted successfully.`);
      } catch (error) {
        alert('Failed to delete customer profile.');
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

  // Combined Search & Date Filter logic
  const filteredCustomers = customers.filter(c => {
    const name = c.fullName?.toLowerCase() || '';
    const id = c.customerId?.toLowerCase() || '';
    const phone = c.mobileNumber || '';
    const cnic = c.cnic || '';
    const term = searchTerm.toLowerCase();

    const matchesSearch = name.includes(term) || id.includes(term) || phone.includes(term) || cnic.includes(term);
    const matchesDate = isDateInFilter(c.createdAt);

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">Customers Ledger Directory</h2>
          <p className="text-sm text-gray-600 font-medium">Register new buyers, track registration dates, and manage credit records.</p>
        </div>
        <Link
          to="/customers/add"
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Customer</span>
        </Link>
      </div>

      {/* SEARCH & UNIVERSAL DATE FILTERS BAR */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search customer by Full Name, Phone, CNIC (e.g. 35401-...), or Customer ID (01, 02...)..."
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
              { id: 'today', label: 'Registered Today' },
              { id: 'week', label: 'Registered This Week' },
              { id: 'month', label: 'Registered This Month' },
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

      {/* Main Customers List Sheet */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500 text-sm">Accessing customer ledger...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-10 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
            <UserCheck className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-semibold">No customers found for this selection</p>
            <p className="text-xs">Try switching date filters to "All-Time" or click "Register Customer".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4">Cust ID</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Father's Name</th>
                  <th className="px-6 py-4">Mobile Number</th>
                  <th className="px-6 py-4">CNIC</th>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-6 py-4 text-indigo-600 font-bold tracking-wider">{c.customerId}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{c.fullName}</td>
                    <td className="px-6 py-4 text-gray-700">{c.fatherName}</td>
                    <td className="px-6 py-4 text-gray-800">{c.mobileNumber}</td>
                    <td className="px-6 py-4 text-gray-500 tracking-wide">{c.cnic}</td>
                    <td className="px-6 py-4 text-gray-600">{c.city}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Link 
                          to={`/customers/${c._id}`}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                          title="View Profile & Zamanti"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link 
                          to={`/customers/edit/${c._id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                          title="Edit Customer Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>

                        {/* EXPLICIT "ONLY ADMIN CAN UNLOCK" SECURITY BADGE */}
                        {ALLOW_GLOBAL_DELETION ? (
                          <button
                            onClick={() => handleDelete(c._id, c.fullName)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                            title="Delete Customer Profile"
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

export default Customers;