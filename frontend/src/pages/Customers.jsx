import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  UserCheck,
  Lock,
  Calendar,
} from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Get current Deletion Mode from SettingsContext
  const { settings } = useSettings();

  const isDeletionUnlocked =
    settings?.allowGlobalDeletion === true;

  // Universal Date Filter states
  const [filterPreset, setFilterPreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const response = await api.get('/api/customers');

      if (
        response.data?.success &&
        Array.isArray(response.data.data)
      ) {
        setCustomers(response.data.data);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error(
        'Error loading customer index:',
        error
      );

      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);


  // ==========================================
  // DELETE CUSTOMER
  // ==========================================
  const handleDelete = async (id, name) => {
    // Extra frontend protection
    if (!isDeletionUnlocked) {
      alert(
        'Deletion Mode is disabled. Enable it from Settings first.'
      );
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to permanently delete customer profile for "${name}"?`
      )
    ) {
      try {
        const response = await api.delete(
          `/api/customers/${id}`
        );

        if (response.data?.success) {
          setCustomers((prevCustomers) =>
            prevCustomers.filter(
              (customer) => customer._id !== id
            )
          );

          alert(
            `Customer ${name} profile deleted successfully.`
          );
        }
      } catch (error) {
        console.error(
          'Error deleting customer:',
          error
        );

        alert(
          error.response?.data?.message ||
            'Failed to delete customer profile.'
        );
      }
    }
  };


  // ==========================================
  // DATE FILTER
  // ==========================================
  const isDateInFilter = (dateStr) => {
    if (filterPreset === 'all') {
      return true;
    }

    if (!dateStr) {
      return false;
    }

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterPreset === 'today') {
      return date.getTime() === today.getTime();
    }

    if (filterPreset === 'week') {
      const startOfWeek = new Date(today);

      startOfWeek.setDate(
        today.getDate() - 7
      );

      return (
        date >= startOfWeek &&
        date <= today
      );
    }

    if (filterPreset === 'month') {
      const startOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      return (
        date >= startOfMonth &&
        date <= today
      );
    }

    if (
      filterPreset === 'custom' &&
      customStartDate &&
      customEndDate
    ) {
      const start = new Date(
        `${customStartDate}T00:00:00`
      );

      const end = new Date(
        `${customEndDate}T23:59:59`
      );

      return date >= start && date <= end;
    }

    return true;
  };


  // ==========================================
  // SEARCH + DATE FILTER
  // ==========================================
  const filteredCustomers = customers.filter(
    (customer) => {
      const name = String(
        customer?.fullName || ''
      ).toLowerCase();

      const id = String(
        customer?.customerId || ''
      ).toLowerCase();

      const phone = String(
        customer?.mobileNumber || ''
      ).toLowerCase();

      const cnic = String(
        customer?.cnic || ''
      ).toLowerCase();

      const term = String(
        searchTerm || ''
      ).toLowerCase();

      const matchesSearch =
        name.includes(term) ||
        id.includes(term) ||
        phone.includes(term) ||
        cnic.includes(term);

      const matchesDate =
        isDateInFilter(
          customer?.createdAt
        );

      return (
        matchesSearch &&
        matchesDate
      );
    }
  );


  return (
    <div className="space-y-6">

      {/* ==========================================
          HEADER
      ========================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">
            Customers Ledger Directory
          </h2>

          <p className="text-sm text-gray-600 font-medium">
            Register new buyers, track registration dates,
            and manage credit records.
          </p>
        </div>

        <Link
          to="/customers/add"
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />

          <span>
            Register Customer
          </span>
        </Link>

      </div>


      {/* ==========================================
          SEARCH & DATE FILTERS
      ========================================== */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-4">

        <div className="relative">

          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />

          <input
            type="text"
            placeholder="Search customer by Full Name, Phone, CNIC (e.g. 35401-...), or Customer ID (01, 02...)..."
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
              {
                id: 'all',
                label: 'All-Time',
              },
              {
                id: 'today',
                label: 'Registered Today',
              },
              {
                id: 'week',
                label: 'Registered This Week',
              },
              {
                id: 'month',
                label: 'Registered This Month',
              },
              {
                id: 'custom',
                label: 'Custom Range',
              },
            ].map((preset) => (

              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  setFilterPreset(
                    preset.id
                  )
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
                  setCustomStartDate(
                    e.target.value
                  )
                }
                className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              />

              <span>
                to
              </span>

              <input
                type="date"
                value={customEndDate}
                onChange={(e) =>
                  setCustomEndDate(
                    e.target.value
                  )
                }
                className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              />

            </div>

          )}

        </div>
      </div>


      {/* ==========================================
          CUSTOMERS LIST
      ========================================== */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

        {loading ? (

          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">

            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>

            <span className="text-gray-500 text-sm">
              Accessing customer ledger...
            </span>

          </div>

        ) : filteredCustomers.length === 0 ? (

          <div className="p-10 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">

            <UserCheck className="w-10 h-10 text-gray-300" />

            <p className="text-sm font-semibold">
              No customers found for this selection
            </p>

            <p className="text-xs">
              Try switching date filters to
              "All-Time" or click "Register Customer".
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">

              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">

                <tr>

                  <th className="px-6 py-4">
                    Cust ID
                  </th>

                  <th className="px-6 py-4">
                    Full Name
                  </th>

                  <th className="px-6 py-4">
                    Father's Name
                  </th>

                  <th className="px-6 py-4">
                    Mobile Number
                  </th>

                  <th className="px-6 py-4">
                    CNIC
                  </th>

                  <th className="px-6 py-4">
                    City
                  </th>

                  <th className="px-6 py-4 text-center">
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-gray-200">

                {filteredCustomers.map(
                  (customer) => (

                    <tr
                      key={customer._id}
                      className="hover:bg-gray-50/75 transition-colors"
                    >

                      <td className="px-6 py-4 text-indigo-600 font-bold tracking-wider">
                        {customer.customerId}
                      </td>


                      <td className="px-6 py-4 font-bold text-gray-900">
                        {customer.fullName}
                      </td>


                      <td className="px-6 py-4 text-gray-700">
                        {customer.fatherName}
                      </td>


                      <td className="px-6 py-4 text-gray-800">
                        {customer.mobileNumber}
                      </td>


                      <td className="px-6 py-4 text-gray-500 tracking-wide">
                        {customer.cnic}
                      </td>


                      <td className="px-6 py-4 text-gray-600">
                        {customer.city}
                      </td>


                      {/* ==========================================
                          ACTIONS
                      ========================================== */}
                      <td className="px-6 py-4 text-center">

                        <div className="flex items-center justify-center space-x-2">

                          {/* VIEW */}
                          <Link
                            to={`/customers/${customer._id}`}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                            title="View Profile & Zamanti"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>


                          {/* EDIT */}
                          <Link
                            to={`/customers/edit/${customer._id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                            title="Edit Customer Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>


                          {/* ========================================
                              DELETE / LOCKED
                          ======================================== */}

                          {isDeletionUnlocked ? (

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  customer._id,
                                  customer.fullName
                                )
                              }
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                              title="Delete Customer Profile"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                          ) : (

                            <div
                              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-gray-400"
                              title="Deletion Mode is disabled"
                            >
                              <Lock className="w-4 h-4" />

                              <span className="text-xs font-semibold">
                                Locked
                              </span>
                            </div>

                          )}

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
};

export default Customers;