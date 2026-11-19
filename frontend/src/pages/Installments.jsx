import { Fragment, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatCnicSearchInput, matchesCnicSearch, matchesMobileSearch } from '../utils/cnicSearch';
import { useSettings } from '../context/SettingsContext';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

import {
  Layers,
  Plus,
  Sparkles,
  Search,
  Eye,
  Edit2,
  Trash2,
  Lock,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

const PAGE_SIZE = 20;

const Installments = () => {
  const { settings } = useSettings();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    saleId: null,
    invoiceNum: '',
  });
  const isDeletionUnlocked = settings?.allowGlobalDeletion === true;

  // Universal Date Filter states
  const [filterPreset, setFilterPreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterPreset, customStartDate, customEndDate]);

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

  const triggerDeleteConfirmation = (saleId, invoiceNum) => {
    if (!isDeletionUnlocked) {
      toast.error('Deletion Mode is disabled. Enable it from Settings first.');
      return;
    }
    setDeleteModal({ isOpen: true, saleId, invoiceNum });
  };

  const confirmDelete = async () => {
    const { saleId, invoiceNum } = deleteModal;
    try {
      await api.delete(`/api/sales/${saleId}`);
      setPlans((currentPlans) => currentPlans.filter((plan) => String(plan.sale?._id) !== String(saleId)));
      toast.success(`Installment sale "${invoiceNum}" deleted and stock restored.`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete installment sale.');
    } finally {
      setDeleteModal({ isOpen: false, saleId: null, invoiceNum: '' });
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
  const formatPlanDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime())
      ? 'N/A'
      : date.toLocaleDateString('en-PK', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
  };

  const formatPlanTime = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime())
      ? 'N/A'
      : date.toLocaleTimeString('en-PK', {
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  // SEARCH + DATE FILTER
  // INSTALLMENT PLANS ONLY
  // =====================================================

  const searchDigits = searchTerm.trim().replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const normalizedInvoiceSearch = searchTerm.trim().toLowerCase();
  const isInvoiceLookupTerm =
    /^\d{1,10}$/.test(searchDigits) || /^[a-z]+[-/]?\d+[a-z0-9-]*$/i.test(normalizedInvoiceSearch);
  const hasInvoiceNumberMatch = !isInvoiceLookupTerm || plans.some((plan) => {
    const invoiceNumber = String(plan.sale?.saleId || '').toLowerCase();
    return invoiceNumber.includes(normalizedInvoiceSearch) ||
      invoiceNumber.replace(/[^a-z0-9]/g, '').includes(normalizedInvoiceSearch.replace(/[^a-z0-9]/g, ''));
  });
  const hasExactInvoiceSearch = Boolean(searchDigits) && plans.some((plan) => {
    const invoiceDigits = String(plan.sale?.saleId || '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    return invoiceDigits === searchDigits;
  });

  const filteredPlans = plans.filter(
    (p) => {
      const custName =
        p.customer?.fullName?.toLowerCase() ||
        '';

      const custPhone =
        p.customer?.mobileNumber ||
        '';

      const custCnic = p.customer?.cnic || p.customer?.CNIC || '';

      const invoiceNumbers = [
        p.sale?.saleId,
        p.sale?.invoiceNumber,
        p.sale?.invoiceNo,
        p.sale?.billNumber,
      ]
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).toLowerCase());

      const prodName =
        p.product?.name?.toLowerCase() ||
        '';

      const sTerm =
        searchTerm.trim().toLowerCase();
      const normalizedSearchTerm = sTerm.replace(/[^a-z0-9]/g, '');
      const matchesInvoiceNumber = invoiceNumbers.some((invoiceNumber) =>
        invoiceNumber.includes(sTerm) ||
        invoiceNumber.replace(/[^a-z0-9]/g, '').includes(normalizedSearchTerm)
      );
      const searchDigits = sTerm.replace(/\D/g, '');
      const matchesExactInvoiceNumber = Boolean(searchDigits) && invoiceNumbers.some((invoiceNumber) => {
        const invoiceDigits = invoiceNumber.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
        const normalizedSearchDigits = searchDigits.replace(/^0+(?=\d)/, '');
        return invoiceDigits === normalizedSearchDigits;
      });

      const matchesSearch = hasExactInvoiceSearch
        ? matchesExactInvoiceNumber
        : (
        custName.includes(sTerm) ||
        custPhone.includes(sTerm) ||
        matchesMobileSearch(custPhone, sTerm) ||
        matchesCnicSearch(custCnic, sTerm) ||
        matchesInvoiceNumber ||
        prodName.includes(sTerm)
      );

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
  ).sort((a, b) =>
    String(b.sale?.saleId || '').localeCompare(
      String(a.sale?.saleId || ''),
      undefined,
      { numeric: true, sensitivity: 'base' }
    )
  );

  const pageCount = Math.max(1, Math.ceil(filteredPlans.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagePlans = filteredPlans.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  const firstVisiblePlan = filteredPlans.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const lastVisiblePlan = Math.min(safePage * PAGE_SIZE, filteredPlans.length);

  const totalPurchaseCost = filteredPlans.reduce(
    (sum, plan) => {
      const saleItems = plan.sale?.items || [];
      const planCost = saleItems.length
        ? saleItems.reduce((itemSum, item) => itemSum + Number(item.quantity || 0) * Number(item.purchasePriceAtSale || 0), 0)
        : Number(plan.sale?.quantity || 0) * Number(plan.sale?.purchasePriceAtSale || 0);
      return sum + planCost;
    },
    0
  );
  const totalSellingPrice = filteredPlans.reduce(
    (sum, plan) => sum + Number(plan.sale?.finalTotal || 0),
    0
  );
  const totalProfit = totalSellingPrice - totalPurchaseCost;
  const formatMoney = (amount) =>
    `${settings?.currency || 'PKR'} ${Number(amount || 0).toLocaleString('en-PK')}`;

  return (
    <>
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">

      {/* =================================================
          HEADER
      ================================================== */}

      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white shadow-2xl shadow-blue-950/20">
        <div className="pointer-events-none absolute -left-20 -top-32 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-10 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                  <Sparkles className="h-3 w-3 text-blue-400" />
                  Installment Sales
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {plans.length} Total Installment Sales
                </span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                Installment Sales
              </h1>
              <p className="mt-1.5 max-w-2xl text-xs font-medium leading-relaxed text-slate-400 sm:text-sm">
                Search installment sales by invoice number and customer, and manage active payment plans.
              </p>
            </div>

            <Link
              to="/sales/new?type=installment"
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-950/40 transition hover:opacity-95 active:scale-95 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span>New Installment Sale</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =================================================
          STATS OVERVIEW BANNER
      ================================================== */}

      <div className="grid grid-cols-2 gap-3">

        {/* FILTERED PLANS */}

        <div className="premium-card p-3 sm:p-4 rounded-xl shadow-sm">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
            Filtered Installment Plans
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
            {filteredPlans.length}
          </p>
        </div>

        {/* OUTSTANDING BALANCE */}

        <div className="premium-card p-3 sm:p-4 rounded-xl shadow-sm">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
            Outstanding Financed Balance
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-red-600 mt-1">
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

        <div className="premium-card p-3 sm:p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
              Overdue/Defaulter Plans
            </span>
            <p className="text-lg sm:text-xl font-extrabold text-amber-600 mt-1">
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

        <div className="premium-card p-3 sm:p-4 rounded-xl shadow-sm">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total Purchasing Cost</span>
          <p className="text-lg sm:text-xl font-extrabold text-amber-600 mt-1">{formatMoney(totalPurchaseCost)}</p>
          <span className="text-[10px] text-slate-400">Cost of products sold</span>
        </div>

        <div className="premium-card p-3 sm:p-4 rounded-xl shadow-sm">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total Selling Price</span>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-600 mt-1">{formatMoney(totalSellingPrice)}</p>
          <span className="text-[10px] text-slate-400">Sale total after discount</span>
        </div>

        <div className="premium-card p-3 sm:p-4 rounded-xl shadow-sm">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total Profit</span>
          <p className={`text-lg sm:text-xl font-extrabold mt-1 ${totalProfit < 0 ? 'text-rose-600' : 'text-violet-600'}`}>{formatMoney(totalProfit)}</p>
          <span className="text-[10px] text-slate-400">Selling price minus purchasing cost</span>
        </div>

      </div>

      {/* =================================================
          SEARCH & DATE FILTERS
      ================================================== */}

      <div className="premium-card p-4 rounded-xl shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by invoice/bill number, customer name, mobile number, CNIC, or plan ID..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(formatCnicSearchInput(e.target.value))
            }
            className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 bg-slate-50 focus:bg-white transition-all"
          />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'today', label: 'Today (Daily)' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'dayBeforeYesterday', label: 'Day Before Yesterday' },
              { id: 'all', label: 'All-Time' },
              { id: 'week', label: 'Weekly (7 Days)' },
              { id: 'month', label: 'Monthly (This Month)' },
              { id: 'custom', label: 'Custom Range' }
            ].map(
              (preset) => (
                <button
                  key={preset.id}
                  onClick={() => setFilterPreset(preset.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                    filterPreset === preset.id
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {preset.label}
                </button>
              )
            )}
          </div>
          {filterPreset === 'custom' && (
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 focus:outline-none bg-white text-slate-900"
              />
              <span>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 focus:outline-none bg-white text-slate-900"
              />
            </div>
          )}
        </div>
      </div>

      {!loading && isInvoiceLookupTerm && !hasInvoiceNumberMatch && filteredPlans.length > 0 && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm font-black text-amber-900"
        >
          No invoice number matched &quot;{searchTerm.trim()}&quot;. Other search matches are shown below.
        </div>
      )}

      {/* =================================================
          MAIN LIST
      ================================================== */}

      <div className="premium-card overflow-hidden">

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
              {searchTerm.trim()
                ? `No matching installment sale found for "${searchTerm.trim()}".`
                : 'No installment sale recorded yet'}
            </p>

            {!searchTerm.trim() && (
              <p className="text-xs">
                Installment schedules will generate automatically once you finalize an "Installment Sale" under the Installments checkout.
              </p>
            )}

          </div>

        ) : (

          <div className="datatable-vertical-scroll max-h-[65vh] overflow-x-auto overflow-y-auto overscroll-contain">

            <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">

              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">

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

                  <th className="px-6 py-4 text-center">
                    Qty
                  </th>

                  <th className="px-6 py-4 text-right text-rose-600">
                    Discount
                  </th>

                  <th className="px-6 py-4">
                    Purchasing Cost
                  </th>

                  <th className="px-6 py-4">
                    Selling Price
                  </th>

                  <th className="px-6 py-4">
                    Final Total
                  </th>

                  <th className="px-6 py-4">
                    Down Payment
                  </th>

                  <th className="px-6 py-4 text-red-600 font-black">
                    Remaining Dues
                  </th>

                  <th className="px-6 py-4">
                    Total Payable
                  </th>

                  <th className="px-6 py-4">
                    Term
                  </th>

                  <th className="px-6 py-4">
                    Date / Time
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

                {pagePlans.map((plan) => {
                  const saleItems = plan.sale?.items?.length
                    ? plan.sale.items
                    : [{
                        product: plan.product,
                        quantity: plan.sale?.quantity || 0,
                        unitPrice: plan.sale?.unitPrice || 0,
                        purchasePriceAtSale: plan.sale?.purchasePriceAtSale || 0,
                        discount: plan.sale?.discount || 0,
                      }];
                  const rowSpan = saleItems.length;

                  return (
                    <Fragment key={plan._id}>
                      {saleItems.map((item, itemIndex) => {
                        const itemQuantity = Number(item.quantity || 0);
                        const itemUnitPrice = Number(item.unitPrice || 0);
                        const itemPurchasePrice = Number(item.purchasePriceAtSale ?? plan.sale?.purchasePriceAtSale ?? 0);
                        const product = item.product && typeof item.product === 'object' ? item.product : plan.product;

                        return (
                          <tr key={`${plan._id}-${itemIndex}`} className="hover:bg-gray-50/75 transition-colors">
                            {itemIndex === 0 && (
                              <>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-middle text-indigo-600 font-extrabold tracking-wider">
                                  {plan.sale?.saleId || 'N/A'}
                                </td>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-middle">
                                  <p className="font-bold text-gray-900">{plan.customer?.fullName || 'N/A'}</p>
                                  <p className="text-xs text-gray-500">{plan.customer?.mobileNumber || ''}</p>
                                </td>
                              </>
                            )}

                            <td className="px-6 py-4 text-gray-800">
                              <p className="font-bold text-slate-800">{product?.name || 'Deleted Product'}</p>
                              <p className="text-[10px] text-slate-400">{[product?.brand, product?.model].filter(Boolean).join(' · ')}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-700">{itemQuantity}</td>
                            <td className="px-6 py-4 text-right font-bold text-rose-600">-{formatMoney(item.discount || 0)}</td>
                            <td className="px-6 py-4 text-slate-600">{formatMoney(itemQuantity * itemPurchasePrice)}</td>
                            <td className="px-6 py-4 font-bold text-slate-700">{formatMoney(itemQuantity * itemUnitPrice)}</td>

                            {itemIndex === 0 && (
                              <>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-middle font-bold text-slate-800">{formatMoney(plan.sale?.finalTotal ?? plan.totalAmount ?? 0)}</td>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-middle text-green-600">-{settings.currency} {(plan.downPayment || 0).toLocaleString()}</td>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-middle font-black text-red-600">{settings.currency} {(plan.remainingBalance || 0).toLocaleString()}</td>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-middle font-black text-indigo-700">
                                  {formatMoney(plan.totalAmount ?? plan.sale?.totalWithMarkup ?? plan.sale?.finalTotal ?? 0)}
                                </td>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-middle text-gray-500 font-bold">{plan.duration}M</td>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-middle whitespace-nowrap">
                                  <p className="font-semibold text-slate-700">{formatPlanDate(plan.createdAt || plan.sale?.saleDate || plan.sale?.createdAt)}</p>
                                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">{formatPlanTime(plan.createdAt || plan.sale?.saleDate || plan.sale?.createdAt)}</p>
                                </td>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-middle">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${plan.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-700' : plan.status === 'Overdue' ? 'bg-red-50 border-red-200 text-red-700 font-bold animate-pulse' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                    {plan.status}
                                  </span>
                                </td>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-middle text-center">
                                  {plan.sale?._id && (
                                    <Link to={`/sales/edit/${plan.sale._id}`} className="mr-1 inline-flex p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit installment sale">
                                      <Edit2 className="w-4 h-4" />
                                    </Link>
                                  )}
                                  <Link to={`/installments/${plan._id}`} className="inline-flex p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View installment details">
                                    <Eye className="w-4 h-4" />
                                  </Link>
                                  {isDeletionUnlocked ? (
                                    <button type="button" onClick={() => triggerDeleteConfirmation(plan.sale?._id, plan.sale?.saleId || 'Invoice unavailable')} disabled={!plan.sale?._id} className="inline-flex p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40" title="Delete installment sale and restore stock">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span className="inline-flex p-1.5 text-slate-400" title="Deletion Mode is locked in Settings">
                                      <Lock className="w-4 h-4" />
                                    </span>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}

              </tbody>

            </table>

          </div>

        )}

        {!loading && filteredPlans.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-bold text-slate-500">
              Showing <span className="font-black text-slate-700">{firstVisiblePlan}–{lastVisiblePlan}</span> of <span className="font-black text-slate-700">{filteredPlans.length}</span> installment plans
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                Go to page
                <select
                  value={safePage}
                  onChange={(event) => setPage(Number(event.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-black text-slate-700 outline-none focus:border-indigo-400"
                  aria-label="Jump to installment sales page"
                >
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                    <option key={pageNumber} value={pageNumber}>{pageNumber}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
    <ConfirmModal
      isOpen={deleteModal.isOpen}
      onClose={() => setDeleteModal((current) => ({ ...current, isOpen: false }))}
      onConfirm={confirmDelete}
      title="Delete Installment Sale"
      message={`WARNING: Delete installment sale "${deleteModal.invoiceNum}"? Its linked payment receipts, installment plan, installments, and returns will also be deleted, and sold stock will be restored to inventory.`}
      confirmText="Delete Sale"
      cancelText="Cancel"
      danger
    />
    </>
  );
};

export default Installments;
