import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import {
  formatCnicSearchInput,
  matchesCnicSearch,
  matchesMobileSearch,
} from '../utils/cnicSearch';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

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
  Calendar,
  History,
  CheckCircle2,
  Clock3,
  Sparkles,
  RefreshCw,
  CalendarRange,
  Banknote,
  Receipt,
  ArrowDownCircle,
  User,
  Package,
  Fingerprint,
  Camera,
} from 'lucide-react';

const Payments = () => {
  const { settings } = useSettings();

  // =====================================================
  // STATE
  // =====================================================
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null);

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    paymentId: null,
    paymentReceiptNo: '',
  });

  const [viewModeTab, setViewModeTab] = useState(0);
  const [selectedInvoiceGroup, setSelectedInvoiceGroup] = useState(null);

  const [filterPreset, setFilterPreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const isDeletionUnlocked = settings?.allowGlobalDeletion === true;

  // =====================================================
  // FETCH PAYMENTS
  // =====================================================
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments');

      if (response.data?.success) {
        setPayments(response.data.data || []);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments history:', error);
      toast.error(
        error.response?.data?.message || 'Failed to load payment history.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const openReceipt = async (paymentId) => {
    try {
      const response = await api.get(`/payments/${paymentId}`);

      if (response.data?.success) {
        setActiveReceipt(response.data.data);
      } else {
        toast.error('Failed to load payment receipt.');
      }
    } catch (error) {
      console.error('Error loading payment receipt:', error);
      toast.error(
        error.response?.data?.message || 'Failed to load payment receipt.'
      );
    }
  };

  // =====================================================
  // DELETE
  // =====================================================
  const triggerDeleteConfirmation = (id, paymentId) => {
    if (!isDeletionUnlocked) {
      toast.error('Deletion Mode is disabled. Enable it from Settings first.');
      return;
    }

    setDeleteModal({
      isOpen: true,
      paymentId: id,
      paymentReceiptNo: paymentId || 'Payment',
    });
  };

  const confirmDeletePayment = async () => {
    const { paymentId } = deleteModal;

    if (!paymentId) {
      setDeleteModal({
        isOpen: false,
        paymentId: null,
        paymentReceiptNo: '',
      });
      return;
    }

    try {
      const response = await api.delete(`/payments/${paymentId}`);

      if (response.data?.success) {
        setPayments((currentPayments) =>
          currentPayments.filter((payment) => payment._id !== paymentId)
        );

        setSelectedInvoiceGroup((currentGroup) => {
          if (!currentGroup) return null;

          const updatedReceipts = currentGroup.receipts.filter(
            (payment) => payment._id !== paymentId
          );

          return {
            ...currentGroup,
            receipts: updatedReceipts,
            totalPaidOnThisInvoice: updatedReceipts.reduce(
              (sum, payment) => sum + Number(payment.amount || 0),
              0
            ),
          };
        });

        if (activeReceipt?._id === paymentId) {
          setActiveReceipt(null);
        }

        toast.success(
          response.data?.message || 'Payment receipt removed successfully!'
        );
      } else {
        toast.error(
          response.data?.message || 'Failed to delete payment receipt.'
        );
      }
    } catch (error) {
      console.error('DELETE PAYMENT ERROR:', error);
      toast.error(
        error.response?.data?.message || 'Failed to delete payment receipt.'
      );
    } finally {
      setDeleteModal({
        isOpen: false,
        paymentId: null,
        paymentReceiptNo: '',
      });
    }
  };

  // =====================================================
  // FORMATTERS & IMAGE RESOLVERS
  // =====================================================
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getImageSource = (image) => {
    if (!image) return '';
    if (typeof image !== 'string') return '';
    if (
      image.startsWith('data:image/') ||
      image.startsWith('http://') ||
      image.startsWith('https://') ||
      image.startsWith('blob:')
    ) {
      return image;
    }
    return `data:image/jpeg;base64,${image}`;
  };

  const getCustomerPhoto = (customer) => {
    if (!customer) return '';
    return (
      customer.liveImage ||
      customer.photoUrl ||
      customer.photo ||
      customer.image ||
      customer.customerPhoto ||
      customer.avatar ||
      customer.media?.liveImage ||
      customer.media?.photo ||
      ''
    );
  };

  const getCustomerFingerprint = (customer) => {
    if (!customer) return '';
    return (
      customer.fingerprintImage ||
      customer.fingerprintImageUrl ||
      customer.fingerprintPhoto ||
      customer.fingerprint ||
      customer.media?.fingerprintImage ||
      customer.media?.fingerprint ||
      ''
    );
  };

  const getSaleType = (payment) => {
    const directSaleType = payment?.sale?.paymentType;
    const installmentSaleType = payment?.installmentPlan?.sale?.paymentType;

    if (directSaleType === 'Cash' || installmentSaleType === 'Cash') {
      return 'Cash';
    }
    if (directSaleType === 'Installment' || installmentSaleType === 'Installment') {
      return 'Installment';
    }
    if (payment?.installmentPlan) {
      return 'Installment';
    }
    return 'N/A';
  };

  // =====================================================
  // DATE FILTER
  // =====================================================
  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false;

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return false;

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
  // SEARCH + DATE FILTER
  // =====================================================
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const name = payment.customer?.fullName?.toLowerCase() || '';
      const mobile = payment.customer?.mobileNumber || '';
      const cnic = payment.customer?.cnic || payment.customer?.CNIC || '';
      const invoiceNumber = (
        payment.sale?.saleId ||
        payment.installmentPlan?.sale?.saleId ||
        ''
      ).toLowerCase();
      const term = searchTerm.toLowerCase().trim();

      const matchesSearch =
        name.includes(term) ||
        mobile.includes(term) ||
        matchesMobileSearch(mobile, term) ||
        matchesCnicSearch(cnic, term) ||
        invoiceNumber.includes(term);

      const matchesDate = isDateInFilter(payment.paymentDate || payment.createdAt);

      return matchesSearch && matchesDate;
    });
  }, [payments, searchTerm, filterPreset, customStartDate, customEndDate]);

  // =====================================================
  // INVOICE-WISE GROUPING
  // =====================================================
  const invoiceGroupsList = useMemo(() => {
    const invoiceGroupsMap = {};

    filteredPayments.forEach((payment) => {
      const invoiceNo =
        payment.sale?.saleId ||
        payment.installmentPlan?.sale?.saleId ||
        'UNLINKED-INVOICE';

      if (!invoiceGroupsMap[invoiceNo]) {
        invoiceGroupsMap[invoiceNo] = {
          invoiceNumber: invoiceNo,
          customer: payment.customer,
          product:
            payment.installmentPlan?.product || payment.sale?.product,
          installmentPlan: payment.installmentPlan,
          sale: payment.sale,
          totalPaidOnThisInvoice: 0,
          receipts: [],
        };
      }

      invoiceGroupsMap[invoiceNo].totalPaidOnThisInvoice += Number(
        payment.amount || 0
      );
      invoiceGroupsMap[invoiceNo].receipts.push(payment);
    });

    return Object.values(invoiceGroupsMap);
  }, [filteredPayments]);

  const handlePrint = () => {
    window.print();
  };

  // =====================================================
  // CURRENT RECEIPT / PLAN COMPUTATIONS
  // =====================================================
  const planDoc = activeReceipt?.installmentPlan;
  const totalPlanAmount = Number(planDoc?.totalAmount || 0);
  const downPayment = Number(planDoc?.downPayment || 0);
  const activeReceiptDate = activeReceipt
    ? new Date(activeReceipt.paymentDate || activeReceipt.createdAt)
    : null;

  const currentInstallmentNumber = Number(
    activeReceipt?.currentInstallmentNumber ||
      activeReceipt?.installment?.installmentNumber ||
      activeReceipt?.allocations?.[0]?.installmentNumber ||
      0
  );

  const isDownPaymentFirstInstallment =
    planDoc?.treatDownPaymentAsFirstInstallment === true;

  const currentInstallment =
    activeReceipt?.currentInstallment ||
    activeReceipt?.installment ||
    activeReceipt?.allocations?.[0]?.installment ||
    null;

  const currentInstallmentLabel =
    isDownPaymentFirstInstallment && currentInstallmentNumber === 1
      ? 'Down Payment (Month #1)'
      : currentInstallmentNumber > 0
      ? `Month #${currentInstallmentNumber}`
      : 'Installment N/A';

  const installmentHistory = Array.isArray(activeReceipt?.installmentHistory)
    ? activeReceipt.installmentHistory
    : [];

  const previousInstallments = useMemo(() => {
    if (Array.isArray(activeReceipt?.previousInstallments)) {
      return [...activeReceipt.previousInstallments].sort(
        (a, b) =>
          Number(a.installmentNumber || 0) - Number(b.installmentNumber || 0)
      );
    }

    return installmentHistory
      .filter((installment) => {
        const number = Number(installment.installmentNumber || 0);
        const paidAmount = Number(installment.paidAmount || 0);
        return number < currentInstallmentNumber && paidAmount > 0;
      })
      .sort(
        (a, b) =>
          Number(a.installmentNumber || 0) - Number(b.installmentNumber || 0)
      );
  }, [activeReceipt, installmentHistory, currentInstallmentNumber]);

  const previousInstallmentsPaid = previousInstallments.reduce(
    (sum, installment) => sum + Number(installment.paidAmount || 0),
    0
  );

  const paymentsUpToReceipt = useMemo(() => {
    if (!activeReceipt || !activeReceiptDate) {
      return [];
    }

    return payments.filter((payment) => {
      const samePlan =
        payment.installmentPlan?._id &&
        planDoc?._id &&
        payment.installmentPlan._id === planDoc._id;

      const sameSale =
        payment.sale?._id &&
        activeReceipt.sale?._id &&
        payment.sale._id === activeReceipt.sale._id;

      const sameInvoice = samePlan || sameSale;
      const paymentDate = new Date(payment.paymentDate || payment.createdAt);

      if (Number.isNaN(paymentDate.getTime())) {
        return false;
      }

      return sameInvoice && paymentDate <= activeReceiptDate;
    });
  }, [activeReceipt, activeReceiptDate, payments, planDoc]);

  const paymentAmountUpToReceipt = paymentsUpToReceipt.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const hasSeparateDownPaymentPayment =
    isDownPaymentFirstInstallment &&
    paymentsUpToReceipt.some((payment) => {
      const number = Number(
        payment.installment?.installmentNumber ||
          payment.currentInstallmentNumber ||
          payment.allocations?.[0]?.installmentNumber ||
          0
      );

      return number === 1 && Number(payment.amount || 0) === downPayment;
    });

  const totalPaidSoFar =
    downPayment > 0 && !hasSeparateDownPaymentPayment
      ? downPayment + paymentAmountUpToReceipt
      : paymentAmountUpToReceipt;

  const remainingDuesAtReceipt = Math.max(0, totalPlanAmount - totalPaidSoFar);

  const invoiceBillNumber =
    activeReceipt?.sale?.saleId ||
    planDoc?.sale?.saleId ||
    activeReceipt?.installmentPlan?.saleId ||
    'N/A';

  const currentReceiptAmount = Number(activeReceipt?.amount || 0);
  const originalInstallmentAmount = Number(
    activeReceipt?.originalInstallmentAmount ||
      currentInstallment?.originalAmount ||
      currentInstallment?.amount ||
      0
  );

  const currentPaidTotal = currentInstallment
    ? Number(currentInstallment.paidAmount ?? currentReceiptAmount)
    : currentReceiptAmount;

  const currentRemaining = currentInstallment
    ? Number(
        currentInstallment.remainingAmount ??
          Math.max(0, originalInstallmentAmount - currentPaidTotal)
      )
    : 0;

  const carryForwardAmount = Number(activeReceipt?.carryForwardAmount || 0);

  const formatMoney = (val) =>
    `${settings?.currency || 'PKR'} ${Number(val || 0).toLocaleString('en-PK')}`;

  // Customer media
  const activeCustomerPhoto = getImageSource(
    getCustomerPhoto(activeReceipt?.customer)
  );
  const activeCustomerFingerprint = getImageSource(
    getCustomerFingerprint(activeReceipt?.customer)
  );

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <>
      {/* =================================================
          NORMAL SCREEN PAGE
      ================================================== */}
      <div className="space-y-6 print:hidden animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
        
        {/* DARK HERO HEADER */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">
          <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

          <div className="relative z-10 p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
              
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    Recovery & Receipts
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {payments.length} Total Receipts Logged
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  Payments & Recovery Ledger
                </h1>

                <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                  Search by invoice number, inspect payment breakdown by customer, and print official recovery receipts.
                </p>
              </div>

              {/* View Mode Tab Switcher */}
              <div className="flex p-1 rounded-2xl bg-white/[0.06] border border-white/[0.1] self-start xl:self-auto">
                <button
                  type="button"
                  onClick={() => setViewModeTab(0)}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                    viewModeTab === 0
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/40 scale-[1.02]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  <span>Invoice Classification ({invoiceGroupsList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewModeTab(1)}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                    viewModeTab === 1
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/40 scale-[1.02]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>All Receipts ({filteredPayments.length})</span>
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* SEARCH & DATE FILTERS TOOLBAR */}
        <section className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-3xl shadow-sm space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice ID, customer name, mobile number, or CNIC..."
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

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
              {[
                { id: 'all', label: 'All-Time' },
                { id: 'today', label: 'Received Today' },
                { id: 'yesterday', label: 'Received Yesterday' },
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
            TAB 0 — INVOICE CLASSIFICATION LIST
        ====================================================== */}
        {viewModeTab === 0 && (
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">
                    Invoice Classification Groups
                  </h3>
                  <p className="text-[10px] text-slate-400">Click any deal to view all receipt slips</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-black">
                {invoiceGroupsList.length} Deals
              </span>
            </div>

            {loading ? (
              <div className="p-16 text-center text-xs font-bold text-slate-500">
                <div className="w-8 h-8 mx-auto border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                Loading invoice groups...
              </div>
            ) : invoiceGroupsList.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs font-semibold">
                No invoice payment collections found for this selection.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 font-medium">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-4">Invoice / Bill #</th>
                      <th className="px-5 py-4">Customer Details</th>
                      <th className="px-5 py-4">Product Details</th>
                      <th className="px-5 py-4 text-right">Total Deal Cost</th>
                      <th className="px-5 py-4 text-right">Total Paid</th>
                      <th className="px-5 py-4 text-right text-rose-600">Remaining Dues</th>
                      <th className="px-5 py-4 text-center">Receipts</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {invoiceGroupsList.map((group) => {
                      const remaining = group.installmentPlan?.remainingBalance || 0;
                      const totalCost = group.installmentPlan?.totalAmount || group.sale?.finalTotal || 0;

                      return (
                        <tr key={group.invoiceNumber} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-black text-indigo-600 tracking-wider">
                            {group.invoiceNumber}
                          </td>

                          <td className="px-5 py-3.5">
                            <div>
                              <p className="font-black text-slate-900">{group.customer?.fullName || 'Walk-in'}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{group.customer?.mobileNumber || ''}</p>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 text-slate-700 font-bold truncate max-w-[160px]">
                            {group.product?.name || 'Item'}
                          </td>

                          <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                            {formatMoney(totalCost)}
                          </td>

                          <td className="px-5 py-3.5 text-right font-black text-emerald-600">
                            +{formatMoney(group.totalPaidOnThisInvoice)}
                          </td>

                          <td className="px-5 py-3.5 text-right font-black text-rose-600">
                            {formatMoney(remaining)}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex px-2.5 py-0.5 rounded-md bg-slate-100 font-black text-[10px] text-slate-700">
                              {group.receipts.length} Slips
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceGroup(group)}
                              className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95"
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

        {/* =====================================================
            TAB 1 — ALL RECEIPTS LEDGER
        ====================================================== */}
        {viewModeTab === 1 && (
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            {filteredPayments.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs font-semibold">
                No receipts logged for this selection.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 font-medium">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-4">Invoice / Bill #</th>
                      <th className="px-5 py-4">Customer Details</th>
                      <th className="px-5 py-4">Installment Month</th>
                      <th className="px-5 py-4 text-right">Amount Paid</th>
                      <th className="px-5 py-4 text-center">Sale Type</th>
                      <th className="px-5 py-4">Collection Date</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((payment) => {
                      const invoiceNumber =
                        payment.sale?.saleId ||
                        payment.installmentPlan?.sale?.saleId ||
                        'N/A';

                      const installmentNumber =
                        payment.installment?.installmentNumber ||
                        payment.currentInstallmentNumber ||
                        payment.allocations?.[0]?.installmentNumber ||
                        'N/A';

                      const planIsFirst =
                        payment.installmentPlan?.treatDownPaymentAsFirstInstallment === true;
                      const isFirstDownPayment =
                        planIsFirst && Number(installmentNumber) === 1;
                      const saleType = getSaleType(payment);

                      return (
                        <tr key={payment._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-black text-indigo-600 tracking-wider">
                            {invoiceNumber}
                          </td>

                          <td className="px-5 py-3.5">
                            <div>
                              <p className="font-black text-slate-900">{payment.customer?.fullName || 'Walk-in'}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{payment.customer?.mobileNumber || ''}</p>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 font-bold text-slate-800">
                            {isFirstDownPayment ? (
                              <span className="text-indigo-700 font-black">Down Payment (#1)</span>
                            ) : (
                              <span>Month #{installmentNumber}</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right font-black text-emerald-600 text-sm">
                            +{formatMoney(payment.amount)}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                                saleType === 'Cash'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              }`}
                            >
                              {saleType}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap font-semibold">
                            {formatDateTime(payment.paymentDate || payment.createdAt)}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openReceipt(payment._id)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Print Slip"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {isDeletionUnlocked ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    triggerDeleteConfirmation(payment._id, payment.paymentId)
                                  }
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Payment"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <div
                                  className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-slate-400"
                                  title="Deletion Mode is locked in Settings"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </div>
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

        {/* =====================================================
            INVOICE GROUP RECEIPTS MODAL
        ====================================================== */}
        {selectedInvoiceGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-[pageEnter_0.25s_ease-out] no-print">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              
              <div className="relative bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white p-5 sm:p-6 border-b border-white/[0.08] flex justify-between items-center shrink-0">
                <div>
                  <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest block">
                    Invoice Receipts Hub
                  </span>
                  <h3 className="font-black text-base text-white mt-0.5">
                    Bill No: {selectedInvoiceGroup.invoiceNumber} ({selectedInvoiceGroup.customer?.fullName})
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedInvoiceGroup(null)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center font-bold">
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 block">Product</span>
                    <p className="text-slate-800 font-black mt-0.5 truncate">{selectedInvoiceGroup.product?.name || 'Item'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 block">Total Paid So-far</span>
                    <p className="text-emerald-600 font-black mt-0.5">{formatMoney(selectedInvoiceGroup.totalPaidOnThisInvoice)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 block">Remaining Dues</span>
                    <p className="text-rose-600 font-black mt-0.5">
                      {formatMoney(selectedInvoiceGroup.installmentPlan?.remainingBalance || 0)}
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b font-black text-slate-400 uppercase text-[9px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Installment</th>
                        <th className="px-4 py-3 text-right">Amount Received</th>
                        <th className="px-4 py-3">Payment Date</th>
                        <th className="px-4 py-3 text-center">Slip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedInvoiceGroup.receipts.map((payment) => {
                        const installmentNumber =
                          payment.installment?.installmentNumber ||
                          payment.currentInstallmentNumber ||
                          payment.allocations?.[0]?.installmentNumber ||
                          'N/A';

                        return (
                          <tr key={payment._id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-bold text-slate-800">
                              Month #{installmentNumber}
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-emerald-600">
                              +{formatMoney(payment.amount)}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">
                              {formatDateTime(payment.paymentDate || payment.createdAt)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => openReceipt(payment._id)}
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* =====================================================
          ENHANCED PRINTABLE RECEIPT SLIP MODAL
          (WITH CUSTOMER PHOTO & FINGERPRINT IMAGE)
      ====================================================== */}
      {activeReceipt && (
        <div
          id="printable-receipt-wrapper"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible"
        >
          <div
            id="printable-receipt-modal-container"
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm my-auto shadow-2xl flex flex-col max-h-[92vh] print:shadow-none print:border-none print:max-h-full print:my-0 print:w-[80mm] print:mx-auto"
          >
            {/* PREVIEW TOOLBAR */}
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0 print:hidden rounded-t-3xl">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Print Receipt Preview</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs shadow-md transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveReceipt(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* RECEIPT CONTENT */}
            <div
              id="printable-receipt-content"
              className="p-5 space-y-3 text-slate-900 font-mono text-xs overflow-y-auto flex-1 custom-scrollbar print:overflow-visible print:p-0"
            >
              {/* SHOP HEADER */}
              <div className="text-center pb-2 border-b-2 border-dashed border-slate-400 space-y-0.5">
                <h3 className="text-base font-black tracking-wider uppercase">
                  {settings?.shopName || 'Electronics Shop'}
                </h3>
                {settings?.shopAddress && (
                  <p className="text-[10px] text-slate-600 font-bold">{settings.shopAddress}</p>
                )}
                {settings?.shopPhone && (
                  <p className="text-[10px] font-black text-slate-900">Tel: {settings.shopPhone}</p>
                )}
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-900 text-[9px] font-black uppercase tracking-wider mt-1 border border-slate-300">
                  {isDownPaymentFirstInstallment && currentInstallmentNumber === 1
                    ? 'DOWN PAYMENT RECEIPT'
                    : 'INSTALLMENT RECOVERY RECEIPT'}
                </span>
              </div>

              {/* INVOICE & DATE */}
              <div className="flex justify-between items-center text-[10px] border-b border-dashed border-slate-300 pb-1.5 font-black">
                <span>Invoice / Bill #: <strong className="text-slate-900">{invoiceBillNumber}</strong></span>
                <span className="text-slate-700">{formatDateTime(activeReceipt.paymentDate || activeReceipt.createdAt)}</span>
              </div>

              {/* CUSTOMER & PRODUCT DETAILS */}
              <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-dashed border-slate-300 text-[10px]">
                <div className="space-y-0.5 border-r border-dashed border-slate-300 pr-1">
                  <span className="text-[8px] uppercase font-black text-slate-500 block">Customer:</span>
                  <p className="font-black text-slate-900 truncate">{activeReceipt.customer?.fullName || 'Walk-in'}</p>
                  <p className="text-slate-700 font-bold">{activeReceipt.customer?.mobileNumber || ''}</p>
                  {activeReceipt.customer?.cnic && (
                    <p className="text-slate-600 text-[9px]">CNIC: {activeReceipt.customer.cnic}</p>
                  )}
                </div>

                <div className="space-y-0.5 pl-1">
                  <span className="text-[8px] uppercase font-black text-slate-500 block">Financed Item:</span>
                  <p className="font-black text-slate-900 truncate">{planDoc?.product?.name || 'Item'}</p>
                  <p className="text-slate-700 font-bold truncate">{[planDoc?.product?.brand, planDoc?.product?.model].filter(Boolean).join(' ')}</p>
                </div>
              </div>

              {/* CUSTOMER IDENTITY MEDIA (PHOTO & FINGERPRINT ON SLIP) */}
              {(activeCustomerPhoto || activeCustomerFingerprint) && (
                <div className="p-2 bg-slate-50 border border-slate-300 rounded-xl space-y-1">
                  <span className="text-[8px] uppercase font-black text-slate-500 block text-center">
                    Customer Identity & Biometric Verification
                  </span>
                  
                  <div className="flex items-center justify-around gap-2 pt-1">
                    {/* Customer Photo */}
                    <div className="text-center">
                      {activeCustomerPhoto ? (
                        <img
                          src={activeCustomerPhoto}
                          alt="Customer"
                          className="w-12 h-12 object-cover rounded-lg border border-slate-400 mx-auto"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg border border-slate-300 bg-white flex items-center justify-center mx-auto text-slate-400">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      <span className="text-[7.5px] font-bold text-slate-600 block mt-0.5">Photo</span>
                    </div>

                    {/* Customer Fingerprint */}
                    <div className="text-center">
                      {activeCustomerFingerprint ? (
                        <img
                          src={activeCustomerFingerprint}
                          alt="Fingerprint"
                          className="w-12 h-12 object-contain rounded-lg border border-slate-400 bg-white mx-auto p-0.5"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg border border-slate-300 bg-white flex items-center justify-center mx-auto text-slate-400">
                          <Fingerprint className="w-5 h-5" />
                        </div>
                      )}
                      <span className="text-[7.5px] font-bold text-slate-600 block mt-0.5">Fingerprint</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PROMINENT CURRENT PAYMENT BOX */}
              <div className="p-2.5 rounded-xl border-2 border-slate-900 bg-slate-50/80 text-center space-y-0.5">
                <span className="text-[9px] uppercase font-black tracking-widest text-slate-600 block">
                  Amount Received In This Receipt
                </span>
                <p className="text-lg font-black text-slate-900">
                  {formatMoney(currentReceiptAmount)}
                </p>
                <p className="text-[9px] font-bold text-slate-700">
                  Settled: <strong>{currentInstallmentLabel}</strong>
                </p>
              </div>

              {/* PREVIOUS INSTALLMENT HISTORY TABLE */}
              {previousInstallments.length > 0 && (
                <div className="border-b border-dashed border-slate-300 pb-2 space-y-1">
                  <div className="flex justify-between text-[9px] font-black text-slate-800">
                    <span>Previous Installments Paid:</span>
                    <span>+{formatMoney(previousInstallmentsPaid)}</span>
                  </div>

                  <table className="w-full text-[8.5px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border border-slate-300 text-slate-600 font-black">
                        <th className="p-1 text-center">#</th>
                        <th className="p-1 text-right">Paid</th>
                        <th className="p-1 text-left">Date</th>
                        <th className="p-1 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previousInstallments.map((inst, idx) => (
                        <tr key={idx} className="border-b border-slate-200">
                          <td className="p-1 text-center font-bold">Month #{inst.installmentNumber}</td>
                          <td className="p-1 text-right font-black">{formatMoney(inst.paidAmount || 0)}</td>
                          <td className="p-1 text-slate-600">{formatDateOnly(inst.paidDate)}</td>
                          <td className="p-1 text-center font-bold text-emerald-700">{inst.status || 'Paid'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PRICING BREAKDOWN */}
              <div className="space-y-1 py-1 text-[10px] font-bold border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span>Total Plan Price:</span>
                  <span>{formatMoney(totalPlanAmount)}</span>
                </div>

                {downPayment > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Down Payment Paid:</span>
                    <span>+{formatMoney(downPayment)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-900 font-black">
                  <span>Total Paid So Far:</span>
                  <span>+{formatMoney(totalPaidSoFar)}</span>
                </div>

                <div className="flex justify-between text-rose-600 font-black pt-1 border-t border-dotted border-slate-300">
                  <span>Net Remaining Dues:</span>
                  <span>{formatMoney(remainingDuesAtReceipt)}</span>
                </div>
              </div>

              {/* EXTRA OVERPAYMENT / CARRY FORWARD NOTICE */}
              {carryForwardAmount > 0 && (
                <div className="p-1.5 rounded border border-dashed border-slate-400 text-[8.5px] text-slate-800 space-y-0.5">
                  <p className="font-black">Extra Payment Adjustment:</p>
                  <p>+{formatMoney(carryForwardAmount)} extra payment adjusted into future monthly installments.</p>
                </div>
              )}

              {/* SIGNATURES */}
              <div className="pt-6 flex justify-between items-end text-center text-[9px] font-black">
                <div className="border-t border-slate-900 w-20 pt-1">Customer Sign</div>
                <div className="border-t border-slate-900 w-20 pt-1">Cashier Sign</div>
              </div>

              <p className="text-[8px] text-center text-slate-500 uppercase tracking-widest font-black pt-1">
                *** Thank You for Your Timely Payment ***
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({
            isOpen: false,
            paymentId: null,
            paymentReceiptNo: '',
          })
        }
        onConfirm={confirmDeletePayment}
        title="Delete Payment Receipt?"
        message={`Are you sure you want to permanently delete payment receipt ${
          deleteModal.paymentReceiptNo || ''
        }? This action cannot be undone.`}
        confirmText="Delete Receipt"
        cancelText="Cancel"
        danger
      />

      {/* COMPACT THERMAL & A4 PRINT CSS */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 3mm 4mm;
          }

          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
          }

          .no-print {
            display: none !important;
          }

          #printable-receipt-modal-container {
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            color: #000000 !important;
            font-size: 8.5px !important;
          }

          img {
            display: block !important;
            visibility: visible !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
};

export default Payments;