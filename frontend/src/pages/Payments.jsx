import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../utils/api';
import { getInstallmentRevisionLabel } from '../utils/installmentRevisionLabel';
import {
  formatCnicSearchInput,
  matchesCnicSearch,
  matchesMobileSearch,
} from '../utils/cnicSearch';
import { useSettings } from '../context/SettingsContext';
import { useSearchParams } from 'react-router-dom';
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
  Package,
  Camera,
} from 'lucide-react';

const getPaymentInvoiceNumber = (payment) => String(
  payment.sale?.saleId || payment.installmentPlan?.sale?.saleId || ''
);

const Payments = () => {
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const requestedReceiptId = searchParams.get('receipt');
  const requestedPrint = searchParams.get('print') === '1';
  const closeAfterPrint = searchParams.get('close') === '1';
  const handledReceiptId = useRef('');
  const printedReceiptId = useRef('');

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

  useEffect(() => {
    if (!requestedReceiptId || handledReceiptId.current === requestedReceiptId) return;
    handledReceiptId.current = requestedReceiptId;
    openReceipt(requestedReceiptId);
  }, [requestedReceiptId]);

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
  const normalizedInvoiceSearch = searchTerm.trim().toLowerCase();
  const searchDigits = normalizedInvoiceSearch.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const isInvoiceLookupTerm =
    /^\d{1,10}$/.test(searchDigits) || /^[a-z]+[-/]?\d+[a-z0-9-]*$/i.test(normalizedInvoiceSearch);
  const hasInvoiceNumberMatch = !isInvoiceLookupTerm || payments.some((payment) => {
    const invoiceNumber = getPaymentInvoiceNumber(payment).toLowerCase();
    return invoiceNumber.includes(normalizedInvoiceSearch) ||
      invoiceNumber.replace(/[^a-z0-9]/g, '').includes(normalizedInvoiceSearch.replace(/[^a-z0-9]/g, ''));
  });

  const filteredPayments = useMemo(() => {
    const term = normalizedInvoiceSearch;
    const hasExactInvoiceSearch = Boolean(searchDigits) && payments.some((payment) => {
      const invoiceDigits = getPaymentInvoiceNumber(payment).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      return invoiceDigits === searchDigits;
    });

    return payments.filter((payment) => {
      const name = payment.customer?.fullName?.toLowerCase() || '';
      const mobile = payment.customer?.mobileNumber || '';
      const cnic = payment.customer?.cnic || payment.customer?.CNIC || '';
      const invoiceNumber = getPaymentInvoiceNumber(payment).toLowerCase();
      const invoiceDigits = invoiceNumber.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      const matchesExactInvoiceNumber = Boolean(searchDigits) && invoiceDigits === searchDigits;
      const matchesInvoiceNumber =
        invoiceNumber.includes(term) ||
        invoiceNumber.replace(/[^a-z0-9]/g, '').includes(term.replace(/[^a-z0-9]/g, ''));

      const matchesSearch = hasExactInvoiceSearch
        ? matchesExactInvoiceNumber
        : name.includes(term) ||
          mobile.includes(term) ||
          matchesMobileSearch(mobile, term) ||
          matchesCnicSearch(cnic, term) ||
          matchesInvoiceNumber;

      const matchesDate = isDateInFilter(payment.paymentDate || payment.createdAt);

      return matchesSearch && matchesDate;
    }).sort((a, b) =>
      getPaymentInvoiceNumber(b).localeCompare(
        getPaymentInvoiceNumber(a),
        undefined,
        { numeric: true, sensitivity: 'base' }
      ) || new Date(b.paymentDate || b.createdAt || 0) - new Date(a.paymentDate || a.createdAt || 0)
    );
  }, [payments, normalizedInvoiceSearch, searchDigits, filterPreset, customStartDate, customEndDate]);

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
            payment.installmentPlan?.product || payment.sale?.product || payment.sale?.items?.[0]?.product,
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

    return Object.values(invoiceGroupsMap).sort((a, b) =>
      String(b.invoiceNumber).localeCompare(
        String(a.invoiceNumber),
        undefined,
        { numeric: true, sensitivity: 'base' }
      )
    );
  }, [filteredPayments]);

  // =========================================================
  const handlePrint = async () => {
  const receipt = document.getElementById('printable-receipt-content');

  if (receipt) {
    // Wait for the customer photo and fingerprint to finish decoding before
    // opening the browser print dialog; otherwise print preview can omit them.
    const receiptImages = Array.from(receipt.querySelectorAll('img'));
    await Promise.all(
      receiptImages.map((image) =>
        typeof image.decode === 'function'
          ? image.decode().catch(() => undefined)
          : Promise.resolve()
      )
    );

    const MM_TO_PX = 3.779527559;
    const PRINT_TEXT_SCALE = 1.45;

    const PRINTABLE_HEIGHT_MM = 132;
    const A4_PRINTABLE_HEIGHT_PX = PRINTABLE_HEIGHT_MM * MM_TO_PX;

    const contentHeight = receipt.scrollHeight;

    // Receipt ko automatically single page mein fit karega
    const scale = Math.min(
      1,
      A4_PRINTABLE_HEIGHT_PX / (contentHeight * PRINT_TEXT_SCALE)
    );

    receipt.style.setProperty(
      '--print-scale',
      String(scale)
    );

    receipt.style.setProperty(
      '--print-height',
      `${contentHeight}px`
    );
    receipt.style.setProperty('--print-text-scale', String(PRINT_TEXT_SCALE));
    receipt.style.setProperty('--print-width', `${198 / PRINT_TEXT_SCALE}mm`);
  }

  window.print();

  // Print ke baad normal preview restore
  setTimeout(() => {
    if (receipt) {
      receipt.style.removeProperty('--print-scale');
      receipt.style.removeProperty('--print-height');
      receipt.style.removeProperty('--print-text-scale');
      receipt.style.removeProperty('--print-width');
    }
  }, 500);
};

  useEffect(() => {
    if (!activeReceipt) return undefined;
    window.__shopPrintCurrentView = handlePrint;
    return () => {
      if (window.__shopPrintCurrentView === handlePrint) delete window.__shopPrintCurrentView;
    };
  }, [activeReceipt]);

  useEffect(() => {
    if (!requestedPrint || !activeReceipt?._id || printedReceiptId.current === activeReceipt._id) return undefined;
    printedReceiptId.current = activeReceipt._id;
    const closeReceiptWindow = () => {
      if (closeAfterPrint) window.close();
    };
    if (closeAfterPrint) window.addEventListener('afterprint', closeReceiptWindow);
    const timeoutId = window.setTimeout(() => handlePrint(), 250);
    return () => {
      window.clearTimeout(timeoutId);
      if (closeAfterPrint) window.removeEventListener('afterprint', closeReceiptWindow);
    };
  }, [activeReceipt, requestedPrint, closeAfterPrint]);


  // =====================================================
  // CURRENT RECEIPT / PLAN COMPUTATIONS
  // =====================================================
  const planDoc = activeReceipt?.installmentPlan;
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
  const receiptInstallmentAllocation = Array.isArray(activeReceipt?.allocations)
    ? activeReceipt.allocations.find(
        (allocation) => Number(allocation.installmentNumber) === currentInstallmentNumber
      ) || activeReceipt.allocations[0]
    : null;
  const totalPlanRemainingBalance = Math.max(
    0,
    Number(
      activeReceipt?.cashRemainingBalanceAfterPayment ??
        activeReceipt?.planRemainingBalanceAfterPayment ??
        planDoc?.remainingBalance ??
        activeReceipt?.remainingBalance ??
        0
    )
  );
  const remainingOnScheduledMonth = Math.max(
    0,
    totalPlanRemainingBalance <= 0
      ? 0
      : Number(
          receiptInstallmentAllocation?.remainingAfterPayment ??
            currentInstallment?.remainingAmount ??
            (Number(receiptInstallmentAllocation?.previousRemaining ?? originalInstallmentAmount) -
              Number(receiptInstallmentAllocation?.amount ?? currentReceiptAmount))
        )
  );

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
        <section className="premium-card p-4 sm:p-5 space-y-4">
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
        {!loading && searchTerm.trim() && filteredPayments.length === 0 && (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-center text-sm font-black text-amber-900"
          >
            No invoice found for &quot;{searchTerm.trim()}&quot;.
          </div>
        )}
        {!loading && isInvoiceLookupTerm && !hasInvoiceNumberMatch && filteredPayments.length > 0 && (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm font-black text-amber-900"
          >
            No invoice number matched &quot;{searchTerm.trim()}&quot;. Other search matches are shown below.
          </div>
        )}

        {viewModeTab === 0 && (
          <div className="premium-card overflow-hidden">
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
                {searchTerm.trim()
                  ? `Koi invoice nahi mila: “${searchTerm.trim()}”.`
                  : 'No invoice payment collections found for this selection.'}
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
                            {Number(group.installmentPlan?.revisionNumber || 0) > 0 && (
                              <span className="mt-1 block w-fit rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-700">
                                {getInstallmentRevisionLabel(group.installmentPlan)}
                              </span>
                            )}
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
          <div className="premium-card overflow-hidden">
            {filteredPayments.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs font-semibold">
                {searchTerm.trim()
                  ? `Koi invoice nahi mila: “${searchTerm.trim()}”.`
                  : 'No receipts logged for this selection.'}
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
                            {Number(payment.installmentPlan?.revisionNumber || 0) > 0 && (
                              <span className="mt-1 block w-fit rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-700">
                                {getInstallmentRevisionLabel(payment.installmentPlan)}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5">
                            <div>
                              <p className="font-black text-slate-900">{payment.customer?.fullName || 'Walk-in'}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{payment.customer?.mobileNumber || ''}</p>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 font-bold text-slate-800">
                            {payment.balanceReductionOnly ? (
                              <span className="text-indigo-700 font-black">Extra to plan balance</span>
                            ) : payment.cashSalePayment ? (
                              <span className="text-emerald-700 font-black">Cash balance payment</span>
                            ) : isFirstDownPayment ? (
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

                              {isDeletionUnlocked && !payment.cashSalePayment ? (
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-[pageEnter_0.25s_ease-out] no-print" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setSelectedInvoiceGroup(null); } }}>
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)]" role="dialog" aria-modal="true" aria-label="Invoice payment history">
              
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
                              {payment.balanceReductionOnly ? 'Extra to plan balance' : `Month #${installmentNumber}`}
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
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-x-hidden overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible" role="dialog" aria-modal="true" aria-label="Payment receipt preview" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setActiveReceipt(null); } }}
        >
          <div
            id="printable-receipt-modal-container"
            className="bg-white border border-slate-200 rounded-3xl w-full min-w-0 max-w-sm my-auto shadow-2xl flex flex-col max-h-[calc(100dvh-1rem)] print:shadow-none print:border-none print:max-h-full print:my-0 print:w-[80mm] print:mx-auto"
          >
            {/* PREVIEW TOOLBAR */}
            <div className="p-3 sm:p-4 border-b bg-slate-50 flex flex-col items-stretch gap-3 shrink-0 print:hidden rounded-t-3xl">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Print Receipt Preview</span>
              </span>

              <div className="flex w-full min-w-0 flex-col gap-2">
                <span className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-black text-slate-600">A4 · Half Page</span>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs shadow-md transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Slip</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveReceipt(null)}
                    aria-label="Close receipt preview"
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* RECEIPT CONTENT */}
            <div
              id="printable-receipt-content"
              className="relative isolate p-5 space-y-3 text-slate-900 font-mono text-xs overflow-y-auto flex-1 custom-scrollbar print:overflow-visible print:p-0"
            >
              <div className="relative z-10 space-y-3">
              {/* SHOP HEADER */}
              <div className="receipt-header grid grid-cols-[20mm_minmax(0,1fr)_20mm] items-center gap-2 pb-2 border-b-2 border-dashed border-slate-400">
                <div className="self-start text-left">
                  {activeCustomerPhoto && (
                    <>
                      <span className="receipt-image-label mb-0.5 block text-[7px] font-black uppercase text-slate-600">Photo</span>
                      <img loading="eager" decoding="sync" src={activeCustomerPhoto} alt="Customer" className="h-[25mm] w-[20mm] rounded border border-slate-400 object-cover" />
                    </>
                  )}
                </div>
                <div className="text-center space-y-0.5">
                {/* BRAND NAME — auto-styled, prominent */}
                <div className="receipt-header-invoice-number text-lg font-black text-slate-900">
                  Invoice #: {invoiceBillNumber}
                </div>
                <h3 className="whitespace-nowrap text-xl font-black uppercase tracking-[0.12em] text-slate-900 leading-tight">
                  {settings?.shopName || 'Electronics Shop'}
                </h3>
                {settings?.brandTagline && (
                  <p className="text-[10px] font-bold italic uppercase tracking-[0.3em] text-slate-500">
                    {settings.brandTagline}
                  </p>
                )}
                {settings?.shopAddress && (
                  <p className="text-[10px] text-slate-600 font-bold">{settings.shopAddress}</p>
                )}
                {settings?.shopPhone && (
                  <p className="text-[10px] font-black text-slate-900">Tel: {settings.shopPhone}</p>
                )}
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-900 text-[9px] font-black uppercase tracking-wider mt-1 border border-slate-300">
                {activeReceipt.cashSalePayment
                  ? 'CASH PAYMENT RECEIPT'
                  : isDownPaymentFirstInstallment && currentInstallmentNumber === 1
                    ? 'DOWN PAYMENT RECEIPT'
                    : 'INSTALLMENT RECOVERY RECEIPT'}
                </span>
                {isDownPaymentFirstInstallment && currentInstallmentNumber === 1 && (
                  <p className="text-[10px] font-black text-indigo-700">
                    Down Payment as First Installment
                  </p>
                )}
                <p className="receipt-printed-date text-[9px] font-bold text-slate-700">
                  Printed: {new Date().toLocaleString('en-PK')}
                </p>
                </div>
                <div className="self-start text-right">
                  {activeCustomerFingerprint && (
                    <>
                      <span className="receipt-image-label mb-0.5 block text-[7px] font-black uppercase text-slate-600">Fingerprint</span>
                      <img loading="eager" decoding="sync" src={activeCustomerFingerprint} alt="Fingerprint" className="ml-auto h-[25mm] w-[20mm] rounded border border-slate-400 bg-white object-contain p-0.5" />
                    </>
                  )}
                </div>
              </div>

              {/* CUSTOMER & PRODUCT DETAILS */}
              <div className="receipt-customer-product-details relative isolate grid grid-cols-2 gap-2 py-1.5 border-b border-dashed border-slate-300 text-[10px]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
                  <span className="rotate-[-28deg] whitespace-nowrap rounded-lg border-double border-4 border-emerald-700 px-3 py-1 text-3xl font-black tracking-[0.16em] text-emerald-700 opacity-25 [print-color-adjust:exact]">PAID</span>
                </div>
                <div className="relative z-10 space-y-0.5 border-r border-dashed border-slate-300 pr-1">
                  <span className="text-[8px] uppercase font-black text-slate-500 block">Customer Details</span>
                  <p className="font-black text-slate-900 break-words"><strong>Customer Name:</strong> {activeReceipt.customer?.fullName || 'Walk-in'}</p>
                  {activeReceipt.customer?.fatherName && (
                    <p className="text-slate-700 font-bold break-words"><strong>Father Name:</strong> {activeReceipt.customer.fatherName}</p>
                  )}
                  <p className="text-slate-700 font-bold break-words"><strong>Mobile No:</strong> {activeReceipt.customer?.mobileNumber || 'N/A'}</p>
                  <p className="text-slate-700 font-bold break-words"><strong>Payment Received Date:</strong> {formatDateTime(activeReceipt.paymentDate || activeReceipt.createdAt)}</p>
                  {activeReceipt.customer?.cnic && (
                    <p className="text-slate-600 text-[9px] break-words"><strong>CNIC:</strong> {activeReceipt.customer.cnic}</p>
                  )}
                </div>

                <div className="relative z-10 space-y-0.5 pl-1">
                  <span className="text-[8px] uppercase font-black text-slate-500 block">Financed Item:</span>
                  {(planDoc?.product ? [planDoc.product] : activeReceipt.sale?.items?.length ? activeReceipt.sale.items.map((item) => item.product).filter(Boolean) : [activeReceipt.sale?.product].filter(Boolean)).map((product, index) => (
                    <div key={product._id || index}>
                      <p className="font-black text-slate-900 break-words">{product.name || 'Item'}</p>
                      {product.brand && <p className="text-slate-700 font-bold">Brand: {product.brand}</p>}
                      {product.model && <p className="text-slate-700 font-bold">Model: {product.model}</p>}
                      {product.imei && <p className="break-all text-[9px] text-slate-700">IMEI: {product.imei}</p>}
                      {product.chassisNumber && <p className="break-all text-[9px] text-slate-700">Chassis: {product.chassisNumber}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* PROMINENT CURRENT PAYMENT BOX */}
              <div className="receipt-amount-box p-2.5 rounded-xl border-2 border-slate-900 bg-slate-50/80 text-center space-y-0.5">
                <span className="text-[9px] uppercase font-black tracking-widest text-slate-600 block">
                  Amount Received In This Receipt
                </span>
                <p className="text-lg font-black text-slate-900">
                  {formatMoney(currentReceiptAmount)}
                </p>
                <p className="pt-1 text-[10px] font-bold text-slate-700">
                  Payment Method: <span className="font-black text-slate-900">{activeReceipt.paymentMethod || 'Cash'}</span>
                </p>
                {Number(activeReceipt.advanceAmount || 0) > 0 && (
                  <p className="text-[10px] font-bold text-emerald-700">
                    Customer advance: <span className="font-black">{formatMoney(activeReceipt.advanceAmount)}</span>
                  </p>
                )}
              </div>

              {/* CURRENT INSTALLMENT PAYMENT BREAKDOWN */}
              {activeReceipt.cashSalePayment ? (
                <div className="receipt-schedule-summary border-b border-dashed border-slate-300 pb-2 text-[9px] font-bold">
                  <div className="flex justify-between text-slate-700"><span>Payment date:</span><span>{formatDateTime(activeReceipt.paymentDate || activeReceipt.createdAt)}</span></div>
                </div>
              ) : activeReceipt.balanceReductionOnly ? (
                <div className="receipt-schedule-summary border-b border-dashed border-slate-300 pb-2 text-[9px] font-bold">
                  <div className="flex justify-between text-indigo-700"><span>Extra payment applied to:</span><span>Remaining plan balance</span></div>
                </div>
              ) : originalInstallmentAmount > 0 && (
                <div className="receipt-schedule-summary border-b border-dashed border-slate-300 pb-2 space-y-1 text-[9px] font-bold">
                  <div className="flex justify-between text-slate-700">
                    <span>Scheduled month:</span>
                    <span>{currentInstallmentLabel}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-black text-slate-900">
                    <span>Remaining this month:</span>
                    <span>{formatMoney(remainingOnScheduledMonth)}</span>
                  </div>
                </div>
              )}

              <div className="receipt-total-remaining flex justify-between border-b border-dashed border-slate-300 pb-2 text-[9px] font-black text-slate-900">
                <span>Total remaining balance:</span>
                <span>{formatMoney(totalPlanRemainingBalance)}</span>
              </div>

              <div className="receipt-signatures mt-4 grid grid-cols-2 gap-10 pt-1 text-center text-[9px] font-black">
                <div>
                  <div className="h-[12mm] border-b border-slate-700" />
                  <p className="pt-1">Customer Signature</p>
                </div>
                <div>
                  <div className="h-[12mm] border-b border-slate-700" />
                  <p className="pt-1">Shop Signature &amp; Stamp</p>
                </div>
              </div>
              <div className="receipt-developed-credit">Designed &amp; Developed by ArZaib POS</div>
              </div>
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
      .receipt-developed-credit { display: none; }
      @media print {
  @page {
    size: A4 portrait;
    margin: 0 6mm;
  }

  html,
  body {
    width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: #fff !important;
  }

  /* Application ki baqi cheezen print nahi hongi */
  body * {
    visibility: hidden !important;
  }

  /* Sirf payment receipt visible */
  #printable-receipt-wrapper,
  #printable-receipt-wrapper *,
  #printable-receipt-modal-container,
  #printable-receipt-modal-container *,
  #printable-receipt-content,
  #printable-receipt-content * {
    visibility: visible !important;
  }

  /* Buttons / toolbar print nahi honge */
  .no-print,
  #printable-receipt-wrapper .no-print,
  #printable-receipt-modal-container .no-print {
    display: none !important;
  }

  #printable-receipt-content,
  #printable-receipt-content * {
    font-weight: 900 !important;
  }

  #printable-receipt-content .receipt-image-label {
    display: none !important;
  }

  #printable-receipt-content .receipt-developed-credit {
    display: block !important;
    margin-top: 1.5mm !important;
    padding-bottom: 2mm !important;
    color: #64748b !important;
    font-size: 7pt !important;
    font-weight: 700 !important;
    line-height: 1.15 !important;
    text-align: center !important;
  }

  #printable-receipt-content .receipt-customer-product-details,
  #printable-receipt-content .receipt-customer-product-details * {
    font-size: 14px !important;
    line-height: 1.3 !important;
  }

  #printable-receipt-content .receipt-header-invoice-number {
    font-size: 18px !important;
    font-weight: 900 !important;
  }

  #printable-receipt-content .receipt-printed-date {
    font-size: 10px !important;
  }

  #printable-receipt-content .receipt-header {
    padding-bottom: 2mm !important;
    border-bottom: 1.5px solid #334155 !important;
  }

  #printable-receipt-content .receipt-customer-product-details {
    padding: 2mm !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 2mm !important;
    background: #f8fafc !important;
  }

  #printable-receipt-content .receipt-amount-box {
    margin: 2mm 0 !important;
    padding: 3mm !important;
    border: 2px solid #15803d !important;
    border-radius: 2mm !important;
    background: #f0fdf4 !important;
  }

  #printable-receipt-content .receipt-amount-box > p:first-of-type {
    font-size: 22px !important;
    line-height: 1.15 !important;
  }

  #printable-receipt-content .receipt-schedule-summary,
  #printable-receipt-content .receipt-schedule-summary * {
    font-size: 12px !important;
    font-weight: 900 !important;
    line-height: 1.25 !important;
  }

  #printable-receipt-content .receipt-total-remaining,
  #printable-receipt-content .receipt-total-remaining * {
    font-size: 12px !important;
    line-height: 1.25 !important;
  }

  #printable-receipt-content .receipt-total-remaining {
    margin-top: 2mm !important;
    padding: 2mm 1mm !important;
    border-top: 1px solid #64748b !important;
    border-bottom: 1px solid #64748b !important;
    background: #f8fafc !important;
  }

  #printable-receipt-content .receipt-signatures {
    margin-top: 5mm !important;
    padding-top: 0 !important;
    gap: 18mm !important;
  }

  #printable-receipt-content .receipt-customer-product-details .truncate {
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: normal !important;
    overflow-wrap: normal !important;
    word-break: normal !important;
  }

  #printable-receipt-wrapper {
    position: fixed !important;
    inset: 0 0 auto 0 !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: auto !important;
    display: block !important;
    width: 100% !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: #fff !important;
  }

  #printable-receipt-modal-container {
  position: absolute !important;

  top: 8mm !important;
  left: 0 !important;

  width: 100vw !important;
  max-width: 100vw !important;

  height: auto !important;
  min-height: 0 !important;

  margin: 0 !important;
  padding: 0 !important;

  display: flex !important;

  flex-direction: column !important;

  align-items: center !important;
  justify-content: flex-start !important;

  overflow: visible !important;

  background: transparent !important;
  box-shadow: none !important;
  border: 0 !important;
}


#printable-receipt-content {
  position: relative !important;

  /* IMPORTANT: left/right ko reset */
  left: auto !important;
  right: auto !important;
  top: auto !important;
  margin-top: 0 !important;
  padding-top: 0 !important;

  /* Receipt width */
  width: var(--print-width, 198mm) !important;
  min-width: var(--print-width, 198mm) !important;
  max-width: var(--print-width, 198mm) !important;
  height: var(--print-height, 140mm) !important;
  max-height: none !important;
  overflow: visible !important;

  /* IMPORTANT: margin auto */
  margin-left: auto !important;
  margin-right: auto !important;

  margin-top: 0 !important;

  padding: 0 !important;

  box-sizing: border-box !important;
  zoom: var(--print-text-scale, 1) !important;

  /* IMPORTANT: transform center se scale hoga */
  transform-origin: top center !important;
  transform: scaleX(1) scaleY(var(--print-scale, 1)) !important;

  background: #fff !important;

  box-shadow: none !important;
  border: 0 !important;

  overflow: visible !important;

  page-break-before: avoid !important;
  page-break-after: avoid !important;
  page-break-inside: avoid !important;

  break-before: avoid !important;
  break-after: avoid !important;
  break-inside: avoid !important;
}

  #printable-receipt-content {
    position: relative !important;
    top: 0 !important;

    width: var(--print-width, 198mm) !important;
    max-width: var(--print-width, 198mm) !important;
    min-width: var(--print-width, 198mm) !important;

    height: var(--print-height, 140mm) !important;
    max-height: none !important;

    margin: 0 auto !important;
    padding: 0 !important;
    padding-top: 0 !important;

    box-sizing: border-box !important;
    zoom: var(--print-text-scale, 1) !important;

    overflow: visible !important;

    /*
      Receipt agar lambi ho to automatically
      choti hokar single page mein fit hogi.
    */
    transform-origin: top center !important;
    transform: scaleX(1) scaleY(var(--print-scale, 1)) !important;

    font-size: 8.5px !important;
    line-height: 1.25 !important;

    background: #fff !important;
    box-shadow: none !important;
    border: 0 !important;

    /* Page break prevent */
    page-break-before: avoid !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;

    break-before: avoid !important;
    break-after: avoid !important;
    break-inside: avoid !important;
  }

  #printable-receipt-content > .relative.z-10 {
    margin-top: 0 !important;
    padding-top: 0 !important;
  }

  /* Receipt ke andar bhi page break prevent */
  #printable-receipt-content table,
  #printable-receipt-content tr,
  #printable-receipt-content td,
  #printable-receipt-content th,
  #printable-receipt-content img,
  #printable-receipt-content p,
  #printable-receipt-content h1,
  #printable-receipt-content h2,
  #printable-receipt-content h3,
  #printable-receipt-content h4,
  #printable-receipt-content h5,
  #printable-receipt-content h6 {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  #printable-receipt-content img {
    max-width: 100% !important;
  }
}
      `}</style>
    </>
  );
};

export default Payments;
