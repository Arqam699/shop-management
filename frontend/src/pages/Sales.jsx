import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatCnicSearchInput, matchesCnicSearch, matchesMobileSearch } from '../utils/cnicSearch';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

import {
  Plus,
  ShoppingCart,
  Edit2,
  Trash2,
  Lock,
  Search,
  Calendar,
  ChevronDown,
  Banknote
} from 'lucide-react';

const Sales = () => {
  const { settings } = useSettings();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // =====================================================
  // CASH SALE MENU
  // =====================================================

  const [saleTypeMenuOpen, setSaleTypeMenuOpen] =
    useState(false);

  // =====================================================
  // DELETE MODAL STATE
  // =====================================================

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    saleId: null,
    invoiceNum: '',
  });

  // Universal Date Filter states
  // Today, Week, Month, Custom, All-Time
  const [filterPreset, setFilterPreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Settings-based Universal Deletion Mode
  const isDeletionUnlocked =
    settings?.allowGlobalDeletion === true;

  // =====================================================
  // FETCH CASH SALES ONLY
  // =====================================================

  const fetchSales = async () => {
    try {
      setLoading(true);

      const response = await api.get('/api/sales?type=cash');

      if (
        response.data &&
        response.data.success
      ) {
        setSales(response.data.data || []);
      }
    } catch (error) {
      console.error(
        'Failed to load cash sales history:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // =====================================================
  // DELETE CONFIRMATION
  // =====================================================

  const triggerDeleteConfirmation = (
    id,
    saleId
  ) => {
    if (!isDeletionUnlocked) {
      toast.error(
        'Deletion Mode is disabled. Enable it from Settings first.'
      );
      return;
    }

    setDeleteModal({
      isOpen: true,
      saleId: id,
      invoiceNum: saleId,
    });
  };

  const confirmDelete = async () => {
    const { saleId } = deleteModal;

    try {
      await api.delete(
        `/api/sales/${saleId}`
      );

      setSales((currentSales) =>
        currentSales.filter(
          (s) => s._id !== saleId
        )
      );

      toast.success(
        `Cash sale invoice ${deleteModal.invoiceNum} removed successfully!`
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to delete sale invoice.'
      );
    } finally {
      setDeleteModal({
        isOpen: false,
        saleId: null,
        invoiceNum: '',
      });
    }
  };

  // =====================================================
  // HELPER TO FILTER DATES
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

    const dayBeforeYesterday = new Date(today);
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
      const startOfWeek = new Date(
        today
      );

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
  // CASH SALES ARE ALREADY FILTERED IN fetchSales()
  // =====================================================

  const filteredSales = sales.filter(
    (sale) => {
      const custName =
        sale.customer?.fullName?.toLowerCase() ||
        '';

      const custPhone =
        sale.customer?.mobileNumber ||
        '';

      const custCnic = sale.customer?.cnic || sale.customer?.CNIC || '';

      const sId =
        sale.saleId?.toLowerCase() ||
        '';

      const prodName =
        sale.product?.name?.toLowerCase() ||
        '';

      const term =
        searchTerm.toLowerCase();

      const matchesSearch =
        custName.includes(term) ||
        custPhone.includes(term) ||
        matchesMobileSearch(custPhone, term) ||
        matchesCnicSearch(custCnic, term) ||
        sId.includes(term) ||
        prodName.includes(term);

      const matchesDate =
        isDateInFilter(
          sale.saleDate
        );

      return (
        matchesSearch &&
        matchesDate
      );
    }
  );

  return (
    <>
      <div className="space-y-6">

        {/* =================================================
            HEADER
        ================================================== */}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Cash Sales History
            </h2>

            <p className="text-sm text-gray-600 font-medium">
              Track all cash sales, cash invoices, and sales dates.
            </p>
          </div>

          {/* =================================================
              NEW CASH SALE MENU
          ================================================== */}

          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setSaleTypeMenuOpen(
                  (prev) => !prev
                )
              }
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />

              <span>
                New Cash Sale
              </span>

              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  saleTypeMenuOpen
                    ? 'rotate-180'
                    : ''
                }`}
              />
            </button>

            {saleTypeMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">

                {/* CASH SALE ONLY */}

                <Link
                  to="/sales/new?type=cash"
                  onClick={() =>
                    setSaleTypeMenuOpen(false)
                  }
                  className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors"
                >

                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">

                    <Banknote className="w-5 h-5 text-green-700" />

                  </div>

                  <div>

                    <p className="text-sm font-bold text-gray-900">
                      Cash Sale
                    </p>

                    <p className="text-xs text-gray-500">
                      New cash checkout
                    </p>

                  </div>

                </Link>

              </div>
            )}

          </div>

        </div>

        {/* =================================================
            CASH SALES LABEL
        ================================================== */}

        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm">

          <div className="flex flex-wrap items-center gap-2">

            <span className="text-xs font-bold text-gray-500 mr-1">
              Sales Type:
            </span>

            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border bg-green-600 border-green-600 text-white">

              <Banknote className="w-3.5 h-3.5" />

              Cash Sales Only

            </div>

            <span className="ml-auto text-xs font-bold text-gray-400">
              Showing: Cash Sales
            </span>

          </div>

        </div>

        {/* =================================================
            SEARCH & UNIVERSAL DATE FILTERS BAR
        ================================================== */}

        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-4">

          <div className="relative">

            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />

            <input
              type="text"
              placeholder="Search cash sale by invoice/bill number, customer name, mobile number, CNIC, or product..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(formatCnicSearchInput(e.target.value))
              }
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />

          </div>

          {/* Date Filter Presets */}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-3">

            <div className="flex flex-wrap gap-1.5">

              {[
                {
                  id: 'today',
                  label: 'Sold Today'
                },
                {
                  id: 'yesterday',
                  label: 'Sold Yesterday'
                },
                {
                  id: 'dayBeforeYesterday',
                  label: 'Sold Day Before Yesterday'
                },
                {
                  id: 'all',
                  label: 'All-Time'
                },
                {
                  id: 'week',
                  label: 'Sold This Week'
                },
                {
                  id: 'month',
                  label: 'Sold This Month'
                },
                {
                  id: 'custom',
                  label: 'Custom Range'
                }
              ].map(
                (preset) => (
                  <button
                    key={preset.id}
                    type="button"
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
                Loading cash sales history...
              </span>

            </div>

          ) : filteredSales.length ===
            0 ? (

            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">

              <ShoppingCart className="w-12 h-12 text-gray-300" />

              <p className="text-sm font-semibold">
                No cash sales logged for this selection
              </p>

              <p className="text-xs">
                Try switching date filters to "All-Time" or click "New Cash Sale".
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
                      Product Details
                    </th>

                    <th className="px-6 py-4">
                      Qty
                    </th>

                    <th className="px-6 py-4 text-right">
                      Subtotal
                    </th>

                    <th className="px-6 py-4 text-right">
                      Discount
                    </th>

                    <th className="px-6 py-4 text-right">
                      Final Price
                    </th>

                    <th className="px-6 py-4">
                      Method
                    </th>

                    <th className="px-6 py-4">
                      Date
                    </th>

                    <th className="px-6 py-4 text-center">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-200">

                  {filteredSales.map(
                    (sale) => (

                      <tr
                        key={sale._id}
                        className="hover:bg-gray-50/75 transition-colors"
                      >

                        <td className="px-6 py-4 text-indigo-600 font-extrabold tracking-wider">
                          {sale.saleId}
                        </td>

                        <td className="px-6 py-4">

                          <div>

                            <p className="font-bold text-gray-900">
                              {sale.customer
                                ?.fullName ||
                                'N/A'}
                            </p>

                            <p className="text-xs text-gray-500">
                              {sale.customer
                                ?.mobileNumber ||
                                ''}
                            </p>

                          </div>

                        </td>

                        <td className="px-6 py-4">

                          <div>

                            <p className="font-semibold text-gray-800">
                              {sale.product
                                ?.name ||
                                'Deleted Product'}
                            </p>

                            <p className="text-xs text-gray-500">

                              {sale.product
                                ?.brand}{' '}

                              /{' '}

                              {sale.product
                                ?.model}

                            </p>

                          </div>

                        </td>

                        <td className="px-6 py-4 text-gray-800">
                          {sale.quantity}
                        </td>

                        <td className="px-6 py-4 text-right">

                          {settings.currency}{' '}

                          {(
                            sale.subtotal ||
                            0
                          ).toLocaleString()}

                        </td>

                        <td className="px-6 py-4 text-right text-red-600">

                          -{settings.currency}{' '}

                          {(
                            sale.discount ||
                            0
                          ).toLocaleString()}

                        </td>

                        <td className="px-6 py-4 text-right font-bold text-gray-900">

                          {settings.currency}{' '}

                          {(
                            sale.finalTotal ||
                            0
                          ).toLocaleString()}

                        </td>

                        <td className="px-6 py-4">

                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-green-50 border-green-200 text-green-700">

                            Cash

                          </span>

                        </td>

                        <td className="px-6 py-4 text-gray-500 text-xs">

                          {new Date(
                            sale.saleDate
                          ).toLocaleDateString()}

                        </td>

                        <td className="px-6 py-4 text-center">

                          <div className="flex items-center justify-center space-x-2">

                            {/* Edit Sale */}

                            <Link
                              to={`/sales/edit/${sale._id}`}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                              title="Edit Cash Sale"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>

                            {/* Delete Sale */}

                            {isDeletionUnlocked ? (

                              <button
                                type="button"
                                onClick={() =>
                                  triggerDeleteConfirmation(
                                    sale._id,
                                    sale.saleId
                                  )
                                }
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                                title="Delete Cash Sale & Restore Stock"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                            ) : (

                              <span
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed select-none"
                                title="Locked: Enable Deletion Mode from Settings"
                              >

                                <Lock className="w-3 h-3 text-slate-400" />

                                <span>
                                  Locked
                                </span>

                              </span>

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

      <ConfirmModal
        isOpen={
          deleteModal.isOpen
        }
        onClose={() =>
          setDeleteModal({
            ...deleteModal,
            isOpen: false
          })
        }
        onConfirm={
          confirmDelete
        }
        title="Delete Cash Sale Invoice"
        message={`WARNING: Are you sure you want to delete Cash Sale Invoice "${deleteModal.invoiceNum}"? This will return the sold quantity back to your inventory stock.`}
      />

    </>
  );
};

export default Sales;
