import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatCnicSearchInput, matchesCnicSearch, matchesMobileSearch } from '../utils/cnicSearch';
import { useSettings } from '../context/SettingsContext';

import {
  Layers,
  Search,
  Eye,
  AlertTriangle,
  Calendar,
  Lock
} from 'lucide-react';

const Installments = () => {
  const { settings } = useSettings();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Universal Date Filter states
  const [filterPreset, setFilterPreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // =====================================================
  // FETCH INSTALLMENT PLANS ONLY
  // =====================================================

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);

        const response = await api.get(
          '/api/installments'
        );

        if (
          response.data &&
          response.data.success
        ) {
          const allPlans =
            response.data.data || [];

          // IMPORTANT:
          // Installments page will ONLY contain
          // installment sales.
          //
          // Cash sales are completely excluded.
          const installmentPlans =
            allPlans.filter((plan) => {
              const paymentType =
                plan.sale?.paymentType;

              return (
                paymentType &&
                paymentType !== 'Cash'
              );
            });

          setPlans(installmentPlans);
        }
      } catch (error) {
        console.error(
          'Error fetching installments plans:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

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
    yesterday.setDate(
      today.getDate() - 1
    );

    const dayBeforeYesterday =
      new Date(today);

    dayBeforeYesterday.setDate(
      today.getDate() - 2
    );

    if (filterPreset === 'all') {
      return true;
    }

    if (filterPreset === 'today') {
      return (
        date.getTime() ===
        today.getTime()
      );
    }

    if (filterPreset === 'yesterday') {
      return (
        date.getTime() ===
        yesterday.getTime()
      );
    }

    if (
      filterPreset ===
      'dayBeforeYesterday'
    ) {
      return (
        date.getTime() ===
        dayBeforeYesterday.getTime()
      );
    }

    if (filterPreset === 'week') {
      const startOfWeek =
        new Date(today);

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
        customStartDate
      );

      start.setHours(0, 0, 0, 0);

      const end = new Date(
        customEndDate
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      return (
        date >= start &&
        date <= end
      );
    }

    return true;
  };

  // =====================================================
  // SEARCH + DATE FILTER
  // INSTALLMENT PLANS ONLY
  // =====================================================

  const filteredPlans = plans.filter(
    (p) => {
      const custName =
        p.customer?.fullName?.toLowerCase() ||
        '';

      const custPhone =
        p.customer?.mobileNumber ||
        '';

      const custCnic = p.customer?.cnic || p.customer?.CNIC || '';

      const planIdStr =
        p.planId?.toLowerCase() ||
        '';

      const invoiceNumber =
        (
          p.sale?.saleId || ''
        ).toLowerCase();

      const prodName =
        p.product?.name?.toLowerCase() ||
        '';

      const sTerm =
        searchTerm.toLowerCase();

      const matchesSearch =
        custName.includes(sTerm) ||
        custPhone.includes(sTerm) ||
        matchesMobileSearch(custPhone, sTerm) ||
        matchesCnicSearch(custCnic, sTerm) ||
        planIdStr.includes(sTerm) ||
        invoiceNumber.includes(sTerm) ||
        prodName.includes(sTerm);

      const matchesDate =
        isDateInFilter(
          p.createdAt
        );

      // Extra safety:
      // Only installment plans can appear here.
      const isInstallmentSale =
        p.sale?.paymentType &&
        p.sale?.paymentType !== 'Cash';

      return (
        isInstallmentSale &&
        matchesSearch &&
        matchesDate
      );
    }
  );

  return (
    <div className="space-y-6">

      {/* =================================================
          HEADER
      ================================================== */}

      <div>

        <h2 className="text-2xl font-bold text-gray-900 font-sans">
          Installment Sales
        </h2>

        <p className="text-sm text-gray-600 font-medium">
          Search installment sales by Invoice Number,
          customer name, and manage active installments.
        </p>

      </div>

      {/* =================================================
          STATS OVERVIEW BANNER
      ================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* FILTERED PLANS */}

        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">

          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Filtered Installment Plans
          </span>

          <p className="text-2xl font-extrabold text-gray-900 mt-1">
            {filteredPlans.length}
          </p>

        </div>

        {/* OUTSTANDING BALANCE */}

        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">

          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Outstanding Financed Balance
          </span>

          <p className="text-2xl font-extrabold text-red-600 mt-1">

            {settings.currency}{' '}

            {filteredPlans
              .reduce(
                (sum, p) =>
                  sum +
                  (p.remainingBalance ||
                    0),
                0
              )
              .toLocaleString()}

          </p>

        </div>

        {/* OVERDUE */}

        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm flex items-center justify-between">

          <div>

            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Overdue/Defaulter Plans
            </span>

            <p className="text-2xl font-extrabold text-amber-600 mt-1">

              {
                filteredPlans.filter(
                  (p) =>
                    p.status ===
                    'Overdue'
                ).length
              }

            </p>

          </div>

          {
            filteredPlans.filter(
              (p) =>
                p.status ===
                'Overdue'
            ).length > 0 && (
              <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
            )
          }

        </div>

      </div>

      {/* =================================================
          SEARCH & DATE FILTERS
      ================================================== */}

      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-4">

        <div className="relative">

          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />

          <input
            type="text"
            placeholder="Search by invoice/bill number, customer name, mobile number, CNIC, or plan ID..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(formatCnicSearchInput(e.target.value))
            }
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />

        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-3">

          <div className="flex flex-wrap gap-1.5">

            {[
              {
                id: 'today',
                label: 'Today (Daily)'
              },
              {
                id: 'yesterday',
                label: 'Yesterday'
              },
              {
                id: 'dayBeforeYesterday',
                label: 'Day Before Yesterday'
              },
              {
                id: 'all',
                label: 'All-Time'
              },
              {
                id: 'week',
                label: 'Weekly (7 Days)'
              },
              {
                id: 'month',
                label: 'Monthly (This Month)'
              },
              {
                id: 'custom',
                label: 'Custom Range'
              }
            ].map(
              (preset) => (
                <button
                  key={preset.id}
                  onClick={() =>
                    setFilterPreset(
                      preset.id
                    )
                  }
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                    filterPreset ===
                    preset.id
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              )
            )}

          </div>

          {filterPreset ===
            'custom' && (
            <div className="flex items-center space-x-2 text-xs font-bold text-gray-500">

              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />

              <input
                type="date"
                value={
                  customStartDate
                }
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
                value={
                  customEndDate
                }
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

      {/* =================================================
          MAIN LIST
      ================================================== */}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

        {loading ? (

          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">

            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>

            <span className="text-gray-500 text-sm">
              Accessing installment sales directory...
            </span>

          </div>

        ) : filteredPlans.length ===
          0 ? (

          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">

            <Layers className="w-12 h-12 text-gray-300" />

            <p className="text-sm font-semibold">
              No installment sale recorded yet
            </p>

            <p className="text-xs">
              Installment schedules will generate automatically once you finalize an "Installment Sale" under the Installments checkout.
            </p>

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
                    Financed Item
                  </th>

                  <th className="px-6 py-4">
                    Total Cost
                  </th>

                  <th className="px-6 py-4">
                    Down Payment
                  </th>

                  <th className="px-6 py-4 text-red-600 font-black">
                    Remaining Dues
                  </th>

                  <th className="px-6 py-4">
                    Plan #
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4 text-center">
                    View
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-200">

                {filteredPlans.map(
                  (plan) => (

                    <tr
                      key={plan._id}
                      className="hover:bg-gray-50/75 transition-colors"
                    >

                      <td className="px-6 py-4 text-indigo-600 font-extrabold tracking-wider">
                        {plan.sale?.saleId ||
                          'N/A'}
                      </td>

                      <td className="px-6 py-4">

                        <div>

                          <p className="font-bold text-gray-900">
                            {plan.customer
                              ?.fullName ||
                              'N/A'}
                          </p>

                          <p className="text-xs text-gray-500">
                            {plan.customer
                              ?.mobileNumber ||
                              ''}
                          </p>

                        </div>

                      </td>

                      <td className="px-6 py-4 text-gray-800">
                        {plan.product?.name ||
                          'Deleted Product'}
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-800">

                        {settings.currency}{' '}

                        {(
                          plan.totalAmount ||
                          0
                        ).toLocaleString()}

                      </td>

                      <td className="px-6 py-4 text-green-600">

                        -{settings.currency}{' '}

                        {(
                          plan.downPayment ||
                          0
                        ).toLocaleString()}

                      </td>

                      <td className="px-6 py-4 font-black text-red-600">

                        {settings.currency}{' '}

                        {(
                          plan.remainingBalance ||
                          0
                        ).toLocaleString()}

                      </td>

                      <td className="px-6 py-4 text-gray-500 font-bold">

                        {plan.planId} (
                        {plan.duration}M)

                      </td>

                      <td className="px-6 py-4">

                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            plan.status ===
                            'Completed'
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : plan.status ===
                                'Overdue'
                              ? 'bg-red-50 border-red-200 text-red-700 font-bold animate-pulse'
                              : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}
                        >
                          {plan.status}
                        </span>

                      </td>

                      <td className="px-6 py-4 text-center">

                        <Link
                          to={`/installments/${plan._id}`}
                          className="inline-flex p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View installment details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

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

export default Installments;
