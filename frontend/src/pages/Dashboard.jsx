import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { fallbackAppReleases, loadAppReleases } from '../utils/appReleases';

import {
  Users,
  ShoppingCart,
  Layers,
  TrendingUp,
  Wallet,
  Eye,
  FileSpreadsheet,
  Calendar,
  PlusCircle,
  Clock,
  AlertCircle,
  Search,
  MessageCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CreditCard,
  Receipt,
  CircleDollarSign,
  Banknote,
  Activity,
  ChevronRight,
  Printer,
  X,
  List,
  Download,
  Sparkles,
  CalendarRange,
  DatabaseBackup,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  MonitorDown,
} from 'lucide-react';

const PAKISTAN_DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const PAKISTAN_DATE_FORMATTER = new Intl.DateTimeFormat('en-PK', {
  timeZone: 'Asia/Karachi',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const PAKISTAN_DATETIME_FORMATTER = new Intl.DateTimeFormat('en-PK', {
  timeZone: 'Asia/Karachi',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const pakistanDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = PAKISTAN_DATE_KEY_FORMATTER.formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const addDaysToDateKey = (dateKey, days) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dashboardView = ['cash', 'installment'].includes(searchParams.get('view'))
    ? searchParams.get('view')
    : 'main';
  const { settings } = useSettings();
  const { admin } = useAuth();

  const [showDemoAppPopup, setShowDemoAppPopup] = useState(false);
  const [appReleases, setAppReleases] = useState(import.meta.env.VITE_APP_UPDATES_URL ? null : fallbackAppReleases);
  const [appReleasesReady, setAppReleasesReady] = useState(!import.meta.env.VITE_APP_UPDATES_URL);

  useEffect(() => loadAppReleases((next) => {
    setAppReleases(next);
    setAppReleasesReady(true);
  }), []);

  useEffect(() => {
    if (!appReleasesReady) return;
    if (!admin?.isDemoAccount || !admin.email) return;

    const dismissedKey = `demo-app-download-dismissed:${admin.email.toLowerCase()}`;
    try {
      if (window.localStorage.getItem(dismissedKey) !== 'true') {
        setShowDemoAppPopup(true);
      }
    } catch {
      setShowDemoAppPopup(true);
    }
  }, [admin?.email, admin?.isDemoAccount, appReleasesReady]);

  const dismissDemoAppPopup = () => {
    if (admin?.email) {
      try {
        window.localStorage.setItem(
          `demo-app-download-dismissed:${admin.email.toLowerCase()}`,
          'true'
        );
      } catch {
        // The popup can still be dismissed if browser storage is unavailable.
      }
    }
    setShowDemoAppPopup(false);
  };

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const statsRequestInFlight = useRef(false);

  const [activeTableTab, setActiveTableTab] = useState(0);
  const [cashDetailsPage, setCashDetailsPage] = useState(1);
  const [filterPreset, setFilterPreset] = useState('all');

  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (dashboardView === 'cash' || dashboardView === 'installment') {
      setFilterPreset('today');
      setCustomStartDate('');
      setCustomEndDate('');
    }
  }, [dashboardView]);

  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    setActiveTableTab(dashboardView === 'cash' ? 1 : 0);
  }, [dashboardView]);

  // =========================================================
  // INDEX RECORD STATES
  // =========================================================
  const [showIndexRecord, setShowIndexRecord] = useState(false);
  const [indexRecordData, setIndexRecordData] = useState(null);
  const [indexRecordLoading, setIndexRecordLoading] = useState(false);
  const [indexRecordError, setIndexRecordError] = useState('');
  const [indexRecordMode, setIndexRecordMode] = useState('all');
  const [selectedIndexReference, setSelectedIndexReference] = useState('');


  // =========================================================
  // FETCH DASHBOARD DATA
  // =========================================================
  const fetchStats = async (showRefresh = false) => {
    if (statsRequestInFlight.current) return;
    statsRequestInFlight.current = true;
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get('/api/reports/dashboard');

      if (response.data?.success) {
        setStats(response.data.data);
        setLastUpdatedAt(new Date());
      }
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      if (!showRefresh) {
        toast.error('Unable to load dashboard data.');
      }
    } finally {
      statsRequestInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const refreshDashboard = () => {
      if (document.visibilityState === 'visible') fetchStats(true);
    };
    const intervalId = window.setInterval(refreshDashboard, 60_000);
    window.addEventListener('focus', refreshDashboard);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshDashboard);
    };
  }, []);

  const fetchIndexRecord = async () => {
    try {
      setIndexRecordLoading(true);
      setIndexRecordError('');

      const response = await api.get('/api/reports/index-record');

      if (response.data?.success) {
        setIndexRecordData(response.data.data);
      } else {
        setIndexRecordData(null);
        setIndexRecordError('Unable to load the overall index record.');
      }
    } catch (error) {
      console.error('Failed to load index record:', error);
      setIndexRecordData(null);
      setIndexRecordError(
        error.response?.data?.message || 'Unable to load the overall index record.'
      );
    } finally {
      setIndexRecordLoading(false);
    }
  };

  useEffect(() => {
    if (showIndexRecord) {
      fetchIndexRecord();
    }
  }, [showIndexRecord]);

  useEffect(() => {
    if (!showIndexRecord) return undefined;
    const intervalId = window.setInterval(fetchIndexRecord, 60_000);
    const refreshIndexRecord = () => {
      if (document.visibilityState === 'visible') fetchIndexRecord();
    };
    window.addEventListener('focus', refreshIndexRecord);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshIndexRecord);
    };
  }, [showIndexRecord]);

  // =========================================================
  // FORMATTERS & HELPERS
  // =========================================================
  const money = (value) =>
    `${settings?.currency || 'PKR'} ${Number(value || 0).toLocaleString()}`;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return PAKISTAN_DATE_FORMATTER.format(new Date(date));
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return PAKISTAN_DATETIME_FORMATTER.format(new Date(dateStr));
  };

  // =========================================================
  // WHATSAPP REMINDER
  // =========================================================
  const formatWhatsAppNumber = (phoneStr) => {
    if (!phoneStr) return '';
    let clean = String(phoneStr).replace(/[^0-9]/g, '');
    if (clean.startsWith('03')) {
      clean = '92' + clean.slice(1);
    } else if (clean.startsWith('3')) {
      clean = '92' + clean;
    }
    return clean;
  };

  const handleSendUrgentReminder = (inst) => {
    const phone = formatWhatsAppNumber(
      inst.installmentPlan?.customer?.mobileNumber
    );

    if (!phone) {
      return toast.error('Customer phone number is missing or invalid.');
    }

    const customerName =
      inst.installmentPlan?.customer?.fullName || 'Customer';
    const productName = inst.installmentPlan?.product?.name || 'Item';
    const dueDateFormatted = new Date(inst.dueDate).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' });

    const message = `*⚠️ URGENT INSTALLMENT REMINDER*
━━━━━━━━━━━━━━━━━━━━

Assalam-o-Alaikum *${customerName}*,

Aapko yaad dilaya jata hai ke aapki *${productName}* ki kist ki date guzar chuki hai aur abhi tak aapki payment receive nahi hui hai:

📅 *Due Date:* ${dueDateFormatted}
💰 *Installment Amount:* ${settings?.currency || 'PKR'} ${Number(inst.amount || 0).toLocaleString()}
🔢 *Installment:* Month #${inst.installmentNumber}

Meharbani farma kar apni installment *jald az jald* jama karwa dein, taake aapka payment record updated rahe aur kisi bhi mushkil se bacha sake.

Agar aap payment already kar chuke hain to is message ko ignore karein ya payment details share kar dein.

━━━━━━━━━━━━━━━━━━━━
🏪 *Dukan:* ${settings?.shopName || 'Electronics Shop'}
📞 *Phone:* ${settings?.shopPhone || ''}
━━━━━━━━━━━━━━━━━━━━

*Shukriya - ${settings?.shopName || 'Electronics Shop'}*`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  // Overall and reference-filtered installment register rows.
  const allIndexRecordRows = indexRecordData?.rows || [];
  const indexRecordReferences = indexRecordData?.references || [];
  const indexRecordRows = (indexRecordMode === 'reference'
    ? allIndexRecordRows.filter((row) => selectedIndexReference && String(row.referredBy || '').trim() === selectedIndexReference)
    : allIndexRecordRows
  ).map((row, index) => ({ ...row, serialNumber: index + 1 }));
  const indexRecordPages = Array.from(
    { length: Math.ceil(indexRecordRows.length / 12) },
    (_, pageIndex) => indexRecordRows.slice(pageIndex * 12, (pageIndex + 1) * 12)
  );
  const indexRecordPrintedDate = PAKISTAN_DATE_FORMATTER.format(new Date());
  const indexMoney = (value) => Number(value || 0).toLocaleString('en-PK');

  const fullDigits = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const csvTextCell = (value) => {
    const text = fullDigits(value).replace(/"/g, '""');
    return `="${text}"`;
  };

  const csvNormalCell = (value) => {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
  };

  const handleIndexRecordCSV = () => {
    if (indexRecordRows.length === 0) {
      return toast.error('No active installment plans found.');
    }

    const headers = ['S.N.', 'Date of Material Purchase', 'Name of Customer', 'Invoice No.', 'Total Amount', 'Total Remaining Amount', 'Installment Amount + Remaining', 'Installment Plan & No.', 'Received Amount', 'Remain Amount', 'Receiver Sign', 'Installment Received Date', 'Phone No.', 'Remarks'];

    const rows = indexRecordRows.map((row) => {
      return [
        row.serialNumber,
        csvNormalCell(formatDate(row.purchaseDate)),
        csvNormalCell(row.customerName),
        csvTextCell(row.invoiceNumber),
        csvNormalCell(Number(row.totalAmount || 0)),
        csvNormalCell(Number(row.totalRemainingAmount || 0)),
        csvNormalCell((row.installmentBreakdown?.length ? row.installmentBreakdown : [{ installmentNumber: row.installmentNumber, amount: row.installmentAmount, remainingAmount: row.installmentRemainingAmount }])
          .filter((item) => item.installmentNumber)
          .map((item) => `#${item.installmentNumber}: ${Number(item.amount || 0)} / ${Number(item.remainingAmount || 0)}`)
          .join('; ')),
        csvNormalCell(row.installmentPlan),
        csvNormalCell(''), csvNormalCell(Number(row.remainingAmount || 0)), csvNormalCell(''), csvNormalCell(''),
        csvTextCell(row.mobile), csvNormalCell(''),
      ].join(',');
    });

    const csvContent =
      '\uFEFF' +
      [headers.map((header) => csvNormalCell(header)).join(','), ...rows].join(
        '\r\n'
      );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const referenceSuffix = indexRecordMode === 'reference' && selectedIndexReference
      ? `_${selectedIndexReference.replace(/[^a-z0-9]+/gi, '_')}`
      : '';
    link.download = `Installment_${indexRecordMode === 'reference' ? 'Reference' : 'Index'}_Record${referenceSuffix}_${pakistanDateKey()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Index Record CSV exported successfully.');
  };

  const handleIndexRecordPrint = () => {
    if (indexRecordRows.length === 0) {
      return toast.error('No active installment plans found.');
    }

    window.scrollTo(0, 0);
    const scrollContainer = document.querySelector('main')?.parentElement;
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }

    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintInstallmentReceipt = (payment) => {
    if (!payment?._id) return toast.error('Payment receipt ID is unavailable.');
    const receiptUrl = new URL('/payments', window.location.origin);
    receiptUrl.searchParams.set('receipt', payment._id);
    receiptUrl.searchParams.set('print', '1');
    receiptUrl.searchParams.set('close', '1');
    const receiptWindow = window.open(receiptUrl.toString(), '_blank');
    if (!receiptWindow) toast.error('Allow pop-ups to print the payment slip.');
  };

  // =========================================================
  // DATE FILTER
  // =========================================================
  const isDateInFilter = useCallback((dateStr) => {
    if (!dateStr) return false;
    const dateKey = pakistanDateKey(dateStr);
    const todayKey = pakistanDateKey();
    if (!dateKey) return false;

    if (filterPreset === 'all') return true;
    if (filterPreset === 'today') return dateKey === todayKey;
    if (filterPreset === 'yesterday') return dateKey === addDaysToDateKey(todayKey, -1);
    if (filterPreset === 'dayBeforeYesterday') return dateKey === addDaysToDateKey(todayKey, -2);

    if (filterPreset === 'week') {
      return dateKey >= addDaysToDateKey(todayKey, -6) && dateKey <= todayKey;
    }

    if (filterPreset === 'month') {
      return dateKey >= `${todayKey.slice(0, 7)}-01` && dateKey <= todayKey;
    }

    if (filterPreset === 'custom') {
      return Boolean(
        customStartDate &&
        customEndDate &&
        customStartDate <= customEndDate &&
        dateKey >= customStartDate &&
        dateKey <= customEndDate
      );
    }

    return true;
  }, [filterPreset, customStartDate, customEndDate]);

  // =========================================================
  // FILTERED DATA
  // =========================================================
  const filteredSalesList = useMemo(
    () => (stats?.sales?.salesList || []).filter((s) => isDateInFilter(s.saleDate)),
    [stats, isDateInFilter]
  );
  const filteredFinancingList = useMemo(
    () => (stats?.installments?.activeFinancingList || []).filter((p) => isDateInFilter(p.createdAt)),
    [stats, isDateInFilter]
  );
  const filteredPaymentsList = useMemo(
    () => (stats?.installments?.paymentsList || []).filter((pay) => isDateInFilter(pay.paymentDate)),
    [stats, isDateInFilter]
  );
  const filteredExpensesList = useMemo(
    () => (stats?.expenses?.expensesList || []).filter((e) => isDateInFilter(e.expenseDate)),
    [stats, isDateInFilter]
  );
  const paymentsBySale = useMemo(() => {
    const bySale = new Map();
    filteredPaymentsList.forEach((payment) => {
      const saleId = payment.sale?._id || payment.sale;
      if (!saleId) return;
      const key = String(saleId);
      const list = bySale.get(key) || [];
      list.push(payment);
      bySale.set(key, list);
    });
    return bySale;
  }, [filteredPaymentsList]);
  const cashSalesList = useMemo(
    () => filteredSalesList.filter((s) => s.paymentType === 'Cash'),
    [filteredSalesList]
  );
  const installmentSalesList = useMemo(
    () => filteredSalesList.filter((s) => s.paymentType === 'Installment'),
    [filteredSalesList]
  );

  // Cash Revenue
  const cashRevenue = useMemo(
    () => cashSalesList.reduce((sum, s) => sum + Number(s.finalTotal || 0), 0),
    [cashSalesList]
  );

  const getCashSaleCost = (sale) => {
    if (Array.isArray(sale.items) && sale.items.length > 0) {
      return sale.items.reduce((sum, item) => {
        const quantity = Number(item.quantity || 0);
        const purchasePrice = Number(
          item.purchasePriceAtSale ??
            item.product?.purchasePrice ??
            (sale.items.length === 1
              ? sale.purchasePriceAtSale ?? sale.product?.purchasePrice
              : 0) ??
            0
        );
        return sum + quantity * purchasePrice;
      }, 0);
    }

    return Number(sale.quantity || 0) * Number(
      sale.purchasePriceAtSale ?? sale.product?.purchasePrice ?? 0
    );
  };

  // Cash Cost & Cash Profit
  const cashCost = useMemo(
    () => cashSalesList.reduce((sum, sale) => sum + getCashSaleCost(sale), 0),
    [cashSalesList]
  );
  const cashProfit = cashRevenue - cashCost;

  // Search Filter
  const searchTerm = globalSearch.trim().toLowerCase();
  const searchFilter = useCallback((item) => {
    if (!searchTerm) return true;
    const term = searchTerm;
    const custName = item.customer?.fullName?.toLowerCase() || '';
    const custPhone = item.customer?.mobileNumber || '';
    const id = (item.sale?.saleId || item.saleId || '').toLowerCase();
    const prodName = item.product?.name?.toLowerCase() || '';

    return (
      custName.includes(term) ||
      custPhone.includes(term) ||
      id.includes(term) ||
      prodName.includes(term)
    );
  }, [searchTerm]);

  const cashSales = useMemo(
    () => cashSalesList.filter((sale) => searchFilter(sale)),
    [cashSalesList, searchFilter]
  );
  const activeFinancingLedgerList = useMemo(
    () => filteredFinancingList.filter((plan) => searchFilter(plan)),
    [filteredFinancingList, searchFilter]
  );

  // Detailed Cash Profit
  const detailedCashProfitList = useMemo(() => cashSalesList
    .filter((s) => searchFilter(s))
    .map((sale) => {
      const quantity = Number(sale.quantity || 0);
      const originalCost = getCashSaleCost(sale);
      const purchasePrice = quantity > 0 ? originalCost / quantity : 0;
      const sellingPrice = Number(sale.finalTotal || 0);
      const profit = sellingPrice - originalCost;

      return {
        ...sale,
        quantity,
        purchasePrice,
        originalCost,
        sellingPrice,
        profit,
      };
    }), [cashSalesList, searchFilter]);
  const cashDetailsPageSize = 20;
  const cashDetailsPageCount = Math.max(1, Math.ceil(detailedCashProfitList.length / cashDetailsPageSize));
  const currentCashDetailsPage = Math.min(cashDetailsPage, cashDetailsPageCount);
  const visibleCashDetails = detailedCashProfitList.slice(
    (currentCashDetailsPage - 1) * cashDetailsPageSize,
    currentCashDetailsPage * cashDetailsPageSize
  );

  useEffect(() => {
    setCashDetailsPage(1);
  }, [searchTerm, filterPreset, customStartDate, customEndDate]);

  // =========================================================
  // DETAILED INSTALLMENT PROFIT LIST
  // (Product Profit + Markup Profit Summed)
  // =========================================================
  const detailedInstallmentProfitList = useMemo(() => installmentSalesList
    .map((sale) => {
      const quantity = Number(sale.quantity || 1);
      const purchasePrice = Number(sale.purchasePriceAtSale ?? sale.product?.purchasePrice ?? 0);
      const originalCost = quantity * purchasePrice;

      // Use the immutable values saved at the time of sale. Rebuilding these
      // from the current product price or a duration-based markup can inflate
      // old installment sales after product prices/settings are changed.
      const baseCashPrice = Number(sale.finalTotal || 0);

      const downPayment = Number(sale.downPayment || 0);
      const duration = Number(
        sale.selectedInstallmentDuration || sale.installmentDuration || 0
      );
      const markupPercent = Number(sale.markupPercentage || 0);
      const markupAmount = Number(sale.markupAmount || 0);
      const storedTotalWithMarkup = Number(sale.totalWithMarkup || 0);

      // Older records may not have totalWithMarkup; only then use the saved
      // base amount + saved markup. Never calculate markup a second time.
      const totalCustomerPayable =
        storedTotalWithMarkup > 0
          ? storedTotalWithMarkup
          : baseCashPrice + markupAmount;

      // Payments against this sale
      const customerPayments = paymentsBySale.get(String(sale._id)) || [];

      const installmentPaymentsReceived = customerPayments.reduce((sum, payment) => {
        const isDownPay =
          payment.paymentType === 'Down Payment' ||
          payment.type === 'Down Payment' ||
          payment.isDownPayment === true;
        if (isDownPay) return sum;
        return sum + Number(payment.amount || 0);
      }, 0);

      const totalReceived = downPayment + installmentPaymentsReceived;
      const remainingAmount = Math.max(0, totalCustomerPayable - totalReceived);

      // 1. Base Product Margin
      const productBaseProfit = baseCashPrice - originalCost;

      // 2. Financing Markup Profit
      const markupProfit = markupAmount;

      // 3. ✅ COMBINED: Product Profit + Markup Profit
      const totalProfit = productBaseProfit + markupProfit;

      return {
        ...sale,
        quantity,
        purchasePrice,
        originalCost,
        sellingPrice: baseCashPrice,
        downPayment,
        duration,
        markupPercent,
        markupAmount,
        totalCustomerPayable,
        customerPayments,
        installmentPaymentsReceived,
        totalReceived,
        remainingAmount,
        productProfit: productBaseProfit, // Product Profit
        totalProfit,                      // Product Profit + Markup Profit
      };
    }), [installmentSalesList, paymentsBySale]);
  const visibleInstallmentProfitList = useMemo(
    () => detailedInstallmentProfitList.filter((sale) => searchFilter(sale)),
    [detailedInstallmentProfitList, searchFilter]
  );

  // =========================================================
  // INSTALLMENT TOTALS (Product Profit + Markup Profit)
  // =========================================================
  const installmentTotals = useMemo(() => detailedInstallmentProfitList.reduce(
    (totals, sale) => ({
      cost: totals.cost + Number(sale.originalCost || 0),
      sellingPrice: totals.sellingPrice + Number(sale.sellingPrice || 0),
      productProfit: totals.productProfit + Number(sale.productProfit || 0),
      markupProfit: totals.markupProfit + Number(sale.markupAmount || 0),
      revenue: totals.revenue + Number(sale.totalCustomerPayable || 0),
    }),
    { cost: 0, sellingPrice: 0, productProfit: 0, markupProfit: 0, revenue: 0 }
  ), [detailedInstallmentProfitList]);
  const installmentCost = installmentTotals.cost;
  const installmentProductSellingPrice = installmentTotals.sellingPrice;
  const installmentBaseProductProfit = installmentTotals.productProfit;
  const installmentMarkupProfit = installmentTotals.markupProfit;

  // ✅ Total Installment Profit = Product Profit + Markup Profit
  const installmentProfit = installmentBaseProductProfit + installmentMarkupProfit;

  // Installment Revenue
  const installmentRevenue = installmentTotals.revenue;

  // Total Revenue (Cash + Installment Contracts)
  const totalRevenue = cashRevenue + installmentRevenue;

  // Collections (Safe from double counting)
  const installmentDownPayments = useMemo(
    () => installmentSalesList.reduce((sum, s) => sum + Number(s.downPayment || 0), 0),
    [installmentSalesList]
  );

  const isDownPayment = (payment) =>
    payment.paymentType === 'Down Payment' ||
    payment.type === 'Down Payment' ||
    payment.isDownPayment === true;
  const installmentPayments = useMemo(() => filteredPaymentsList.reduce((sum, pay) => {
    if (isDownPayment(pay)) return sum;
    return sum + Number(pay.amount || 0);
  }, 0), [filteredPaymentsList]);
  const installmentRecoveryList = useMemo(
    () => filteredPaymentsList
      .filter((payment) => !isDownPayment(payment))
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)),
    [filteredPaymentsList]
  );

  const totalInstallmentPaymentsReceived =
    installmentDownPayments + installmentPayments;

  const totalCollected = cashRevenue + totalInstallmentPaymentsReceived;

  // Overall Shop Outstanding
  const totalOutstanding = useMemo(
    () => (stats?.installments?.activeFinancingList || []).reduce(
      (sum, p) => sum + (p.status === 'Completed' ? 0 : Number(p.remainingBalance || 0)),
      0
    ),
    [stats]
  );

  // Gross Profit = Cash Profit + Installment Profit.
  const grossProfit = cashProfit + installmentProfit;

  const totalExpensesVal = useMemo(
    () => filteredExpensesList.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [filteredExpensesList]
  );

  // Net Profit
  const netProfitVal = grossProfit - totalExpensesVal;

  // KPI Data Arrays
  const firstRowKpis = [
    {
      name: 'Total Revenue',
      value: money(totalRevenue),
      icon: ShoppingCart,
      tone: 'blue',
      description: 'Sales generated',
    },
    {
      name: 'Cash Received',
      value: money(cashRevenue),
      icon: Banknote,
      tone: 'emerald',
      description: 'Cash sales',
    },
    {
      name: 'Installment Received',
      value: money(totalInstallmentPaymentsReceived),
      icon: CreditCard,
      tone: 'violet',
      description: 'Down payments + installments',
    },
  ];

  const secondRowKpis = [
    {
      name: 'Cash Profit',
      value: money(cashProfit),
      icon: TrendingUp,
      tone: 'green',
      description: 'Cash business profit',
    },
    {
      name: 'Installment Profit',
      value: money(installmentProfit),
      icon: Layers,
      tone: 'indigo',
      description: 'Product Margin + Markup Profit',
    },
    {
      name: 'Total Expenses',
      value: money(totalExpensesVal),
      icon: Wallet,
      tone: 'amber',
      description: 'Recorded expenses',
    },
  ];

  const cashDashboardKpis = [
    { name: 'Cash Sales', value: String(cashSalesList.length), icon: ShoppingCart, tone: 'blue', description: 'Sales in selected period' },
  ];
  const installmentDashboardKpis = [
    { name: 'Installment Plans', value: String(installmentSalesList.length), icon: Layers, tone: 'blue', description: 'Plans started in selected period' },
    { name: 'Installment Sale Value', value: money(installmentRevenue), icon: Receipt, tone: 'violet', description: 'Total customer payable' },
    { name: 'Outstanding Balance', value: money(totalOutstanding), icon: Wallet, tone: 'amber', description: 'Remaining customer balances' },
    { name: 'Product Purchase Cost', value: money(installmentCost), icon: Banknote, tone: 'amber', description: 'Total product purchase cost' },
    { name: 'Installment Payment Recovery', value: money(installmentPayments), icon: CreditCard, tone: 'emerald', description: 'Received installment payments, excluding down payments' },
  ];
  const visibleKpis = dashboardView === 'cash'
    ? cashDashboardKpis
    : dashboardView === 'installment'
    ? installmentDashboardKpis
    : [...firstRowKpis, ...secondRowKpis];

  // CSV Export
  const handleDownloadCSV = () => {
    const exportSales = dashboardView === 'cash'
      ? cashSalesList
      : dashboardView === 'installment'
      ? installmentSalesList
      : filteredSalesList;
    if (exportSales.length === 0) {
      return toast.error('No transaction data found in this selected date range.');
    }

    const headers =
      'Invoice ID,Customer Name,Product,Qty,Net Price,Payment Method,Date & Time';

    const rows = exportSales.map((s) => {
      const dateFormatted = new Date(s.saleDate).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
      return `"${s.saleId || ''}","${s.customer?.fullName || 'Walk-in'}","${
        s.product?.name || 'Deleted Product'
      }",${s.quantity || 0},${s.finalTotal || 0},"${s.paymentType || ''}","${dateFormatted}"`;
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Dukan_Ledger_Report_${filterPreset}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully.');
  };

  const toneStyles = {
    blue: {
      icon: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      glow: 'from-blue-600/20 via-blue-500/5',
      indicator: 'bg-blue-600',
    },
    emerald: {
      icon: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      glow: 'from-emerald-600/20 via-emerald-500/5',
      indicator: 'bg-emerald-600',
    },
    violet: {
      icon: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
      glow: 'from-violet-600/20 via-violet-500/5',
      indicator: 'bg-violet-600',
    },
    green: {
      icon: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      glow: 'from-emerald-600/20 via-emerald-500/5',
      indicator: 'bg-emerald-600',
    },
    indigo: {
      icon: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      glow: 'from-indigo-600/20 via-indigo-500/5',
      indicator: 'bg-indigo-600',
    },
    amber: {
      icon: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      glow: 'from-amber-600/20 via-amber-500/5',
      indicator: 'bg-amber-600',
    },
  };

  const filterOptions = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'dayBeforeYesterday', label: 'Day Before Yesterday' },
    { id: 'week', label: '7 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom' },
  ];

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 animate-pulse opacity-25" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
              <Activity className="w-7 h-7 text-blue-400 animate-pulse" />
            </div>
          </div>

          <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-slate-800">
            Loading Dashboard
          </h3>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            Preparing your business analytics and ledger overview...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // UI RETURN
  // =========================================================
  return (
    <>
      {showDemoAppPopup && appReleases && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-app-download-title"
            className="relative my-auto w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 pb-7 pt-6 text-white sm:px-8 sm:pt-8">
              <button
                type="button"
                onClick={dismissDemoAppPopup}
                aria-label="Close app download popup"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-indigo-200">
                <Download className="h-6 w-6" />
              </span>
              <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-200">Your demo is ready</p>
              <h2 id="demo-app-download-title" className="mt-2 max-w-sm text-2xl font-black leading-tight sm:text-3xl">
                Get ArZaib POS on your devices
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
                Download the mobile or PC app now, or close this window and continue using the website.
              </p>
            </div>

            <div className="space-y-3 p-5 sm:p-7">
              <a
                href={appReleases.android.url}
                {...(appReleases.android.url.startsWith('/') ? { download: true } : { target: '_blank', rel: 'noreferrer' })}
                onClick={dismissDemoAppPopup}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><Smartphone className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm font-black text-slate-900">Download Android app</strong><span className="block text-xs text-slate-500">Version {appReleases.android.version} · {appReleases.android.fileName}</span></span>
                <Download className="h-4 w-4 shrink-0 text-emerald-700" />
              </a>

              <a
                href={appReleases.windows.url}
                {...(appReleases.windows.url.startsWith('/') ? { download: true } : { target: '_blank', rel: 'noreferrer' })}
                onClick={dismissDemoAppPopup}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-100"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm"><MonitorDown className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm font-black text-slate-900">Download PC app</strong><span className="block text-xs text-slate-500">Version {appReleases.windows.version} · {appReleases.windows.fileName}</span></span>
                <Download className="h-4 w-4 shrink-0 text-indigo-700" />
              </a>

              <button
                type="button"
                onClick={dismissDemoAppPopup}
                className="min-h-12 w-full rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                Maybe later — continue to my dashboard
              </button>
            </div>
          </section>
        </div>
      )}

      <style>{`
        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.25);
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.45);
        }

        .cash-profit-breakdown [class~="text-[8px]"] { font-size: 10px !important; }
        .cash-profit-breakdown [class~="text-[9px]"] { font-size: 11px !important; }
        .cash-profit-breakdown [class~="text-[10px]"] { font-size: 12px !important; }
        .cash-profit-breakdown [class~="text-[11px]"] { font-size: 13px !important; }
        .cash-profit-breakdown [class~="text-xs"] { font-size: 14px !important; }
        .cash-profit-breakdown [class~="text-sm"] { font-size: 16px !important; }
        .cash-profit-breakdown [class~="text-lg"] { font-size: 22px !important; }
        .cash-profit-breakdown [class~="text-xl"] { font-size: 26px !important; }

        /* Default Screen: Hide print header */
        .index-print-header {
          display: none;
        }
        .index-record-page { display: contents; }
        .index-record-table th { white-space: normal; }
        .index-record-table th:nth-child(2),
        .index-record-table td:nth-child(2) { white-space: nowrap; }
        .index-record-table td { vertical-align: middle; }
        .index-record-table td small { display: block; margin-top: 2px; font-size: 9px; color: #64748b; }

        /* =====================================================
           INDEX RECORD PRINT STYLESHEET
        ====================================================== */
        @media print {
          @page {
            /* Use physical landscape dimensions so browser/printer defaults
               cannot reinterpret the index sheet as a portrait layout. */
            size: 297mm 210mm;
            margin: 0 5mm 0 4mm;
          }

          html, body, #root, #root > div, main, div, section {
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            transform: none !important;
            animation: none !important;
            box-shadow: none !important;
          }

          body * {
            visibility: hidden !important;
          }

          #index-record-print,
          #index-record-print * {
            visibility: visible !important;
          }

          #index-record-print {
            position: absolute !important;
            left: 0 !important;
            right: auto !important;
            top: 4mm !important;
            width: 288mm !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            writing-mode: horizontal-tb !important;
            direction: ltr !important;
            background: #ffffff !important;
            border: none !important;
            display: block !important;
          }

          .index-print-controls,
          .index-print-actions,
          .no-print {
            display: none !important;
          }

          .index-print-header {
            display: block !important;
            visibility: visible !important;
            margin: 0 0 2mm !important;
            padding: 0 !important;
            border: 2px solid #000000 !important;
            text-align: center !important;
          }

          .index-record-page {
            display: block !important;
            break-after: page !important;
            page-break-after: always !important;
          }

          .index-record-page:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }

          .index-print-title {
            display: block !important;
            margin: 0 !important;
            padding: 2mm 0 !important;
            background: #fbe4d5 !important;
            font-size: 19pt !important;
            line-height: 1.1 !important;
            border-bottom: 2px solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .index-print-company {
            display: flex !important;
            align-items: center !important;
            justify-content: space-around !important;
            margin: 0 !important;
            padding: 1.5mm 0 !important;
            background: #dbe4f3 !important;
            color: #31558e !important;
            font-size: 15pt !important;
            line-height: 1.1 !important;
            text-transform: uppercase !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .index-print-header h1 {
            color: #000000 !important;
            visibility: visible !important;
          }
          .index-print-company,
          .index-print-company span { color: #31558e !important; visibility: visible !important; }

          .index-record-table {
            display: table !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 8pt !important;
            margin: 0 !important;
            visibility: visible !important;
          }

          .index-record-table thead {
            display: table-header-group !important;
            visibility: visible !important;
          }

          .index-record-table tbody {
            display: table-row-group !important;
            visibility: visible !important;
          }

          .index-record-table tr {
            display: table-row !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            visibility: visible !important;
          }

          .index-record-table th {
            display: table-cell !important;
            border: 1px solid #000000 !important;
            background-color: #e8e8e8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000000 !important;
            padding: 2.2mm 1mm !important;
            font-weight: 900 !important;
            text-align: center !important;
            font-size: 8pt !important;
            visibility: visible !important;
          }

          .index-record-table td {
            display: table-cell !important;
            border: 1px solid #000000 !important;
            padding: 1.8mm .8mm !important;
            color: #000000 !important;
            background: #ffffff !important;
            font-size: 8pt !important;
            line-height: 1.15 !important;
            height: 11mm !important;
            text-align: center !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            visibility: visible !important;
          }

          .index-record-table th:nth-child(2) {
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            line-height: 1.05 !important;
            padding: 1mm 0.5mm !important;
          }

          .index-record-table td span {
            color: #000000 !important;
            visibility: visible !important;
          }

          .index-record-table td:nth-child(3) {
            font-weight: 800 !important;
            font-size: 7.5pt !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
          }

          .index-record-table td:nth-child(7) > div {
            font-size: 9pt !important;
            line-height: 1.15 !important;
          }

          .index-record-table td:nth-child(9),
          .index-record-table td:nth-child(11),
          .index-record-table td:nth-child(12),
          .index-record-table td:nth-child(14) {
            min-width: 14mm !important;
            height: 11mm !important;
          }

          .index-record-table td small {
            color: #000 !important;
            font-size: 7.5pt !important;
            font-weight: 700 !important;
          }

          .print-footer { display: none !important; }
        }
      `}</style>

      <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">

        {/* =====================================================
            HERO HEADER
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
            Console Overview
          </span>

          <span className="text-slate-600">•</span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.05] text-[10px] font-bold text-slate-300">
            <Calendar className="w-3 h-3 text-violet-400" />

            {filterPreset === 'today'
              ? 'Today'
              : filterPreset === 'yesterday'
              ? 'Yesterday'
              : filterPreset === 'dayBeforeYesterday'
              ? 'Day Before Yesterday'
              : filterPreset === 'week'
              ? 'Last 7 Days'
              : filterPreset === 'month'
              ? 'This Month'
              : filterPreset === 'all'
              ? 'All Time'
              : 'Custom Range'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white truncate">
          {settings?.shopName || 'Electronics Shop'}
        </h1>

        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
          {dashboardView === 'cash'
            ? 'Cash sales, product costs, revenue and cash profit.'
            : dashboardView === 'installment'
            ? 'Installment plans, customer payments, outstanding balances and installment profit.'
            : 'Sales, collections, installment financing and profitability — all in one place.'}
        </p>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap items-center gap-2.5">

        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-slate-300">
          <span className="sr-only">Select dashboard</span>
          <select
            value={dashboardView}
            onChange={(event) => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.set('view', event.target.value);
              setSearchParams(nextParams);
            }}
            className="max-w-[190px] bg-transparent text-xs font-black text-white outline-none [&>option]:text-slate-900"
          >
            <option value="main">Main Dashboard</option>
            <option value="cash">Cash Dashboard</option>
            <option value="installment">Installment Dashboard</option>
          </select>
        </label>

        {/* REFRESH */}
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 transition-transform duration-500 ${
              refreshing
                ? 'animate-spin text-blue-400'
                : 'group-hover:rotate-180'
            }`}
          />
          Refresh
        </button>
        <span className="w-full text-right text-[10px] font-medium text-slate-400 sm:w-auto">
          Auto refresh: 1 min{lastUpdatedAt ? ` · Updated ${formatDateTime(lastUpdatedAt)}` : ''}
        </span>

        {/* INDEX RECORD */}
        {dashboardView !== 'cash' && <button
          onClick={() => { setIndexRecordMode('all'); setSelectedIndexReference(''); setShowIndexRecord(true); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-500/20"
        >
          <List className="w-3.5 h-3.5" />
          Index Record
        </button>}
        {(dashboardView === 'main' || dashboardView === 'installment') && <button
          onClick={() => { setIndexRecordMode('reference'); setSelectedIndexReference(''); setShowIndexRecord(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2.5 text-xs font-black text-cyan-200 transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-500/25 active:scale-95"
        >
          <Users className="h-3.5 w-3.5" />
          Reference Record
        </button>}

        {/* NEW CHECKOUT */}
        <Link
          to={dashboardView === 'cash' ? '/sales/new?type=cash' : dashboardView === 'installment' ? '/sales/new?type=installment' : '/sales/new'}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          New Checkout
        </Link>

        {/* REGISTER CUSTOMER */}
        <Link
          to="/customers/add"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />

          <span className="hidden sm:inline">
            Register Customer
          </span>

          <span className="sm:hidden">
            Customer
          </span>
        </Link>

        {/* EXPORT */}
        <button
          onClick={handleDownloadCSV}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Export
        </button>

        {/* BACKUP */}
        <Link
          to="/backup"
          className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
        >
          <DatabaseBackup className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
          Backup
        </Link>

      </div>

    </div>
  </div>
</section>
        {/* =====================================================
            INDEX RECORD DRAWER / SECTION
        ====================================================== */}
        {dashboardView !== 'cash' && showIndexRecord && (
          <section
            id="index-record-print"
            className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden animate-[pageEnter_0.35s_cubic-bezier(0.16,1,0.3,1)]"
          >
            {/* ON-SCREEN CONTROLS HEADER */}
            <div className="px-5 py-4.5 border-b border-slate-100 index-print-controls bg-slate-900 text-white">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-lg shadow-amber-500/20">
                    <List className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {indexRecordMode === 'reference' ? 'Reference-wise Installment Record' : 'Index Sheet Installment Plan'}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {indexRecordMode === 'reference' ? 'Installment records filtered by customer reference' : 'Complete register of active installment plans'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 index-print-actions">
                  <button
                    onClick={handleIndexRecordCSV}
                    className="inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>

                  <button
                    onClick={handleIndexRecordPrint}
                    className="inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>

                  <button
                    onClick={() => setShowIndexRecord(false)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                    title="Close Index Record"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

              </div>

              <div className="mt-3.5 pt-3.5 border-t border-white/[0.08] flex flex-wrap items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                  <span className="text-[9px] uppercase tracking-wider font-black text-blue-300">
                    Register:
                  </span>
                  <span className="ml-2 text-xs font-black text-white">
                    {indexRecordMode === 'reference' ? (selectedIndexReference || 'Choose a reference') : 'All active plans'}
                  </span>
                </div>

                {indexRecordMode === 'reference' && (
                  <label className="flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-white/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-cyan-200">
                    Reference
                    <select value={selectedIndexReference} onChange={(event) => setSelectedIndexReference(event.target.value)} className="max-w-[220px] bg-transparent text-xs font-black normal-case tracking-normal text-white outline-none [&>option]:text-slate-900">
                      <option value="">Select reference name</option>
                      {indexRecordReferences.map((reference) => <option key={reference} value={reference}>{reference}</option>)}
                    </select>
                  </label>
                )}

                <div className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                  <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">
                    Printed:
                  </span>
                  <span className="ml-2 text-xs font-black text-white">
                    {indexRecordPrintedDate}
                  </span>
                </div>
              </div>

            </div>

            {/* INDEX TABLE */}
            <div className="w-full overflow-x-auto">
              {indexRecordLoading ? (
                <div className="py-16 px-5 text-center">
                  <div className="w-7 h-7 mx-auto border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="mt-3 text-xs font-bold text-slate-500">
                    Loading active installment plans...
                  </p>
                </div>
              ) : indexRecordRows.length === 0 ? (
                <div className="py-16 px-5 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center">
                    <List className="w-5 h-5 text-slate-400" />
                  </div>
                  <h4 className="mt-3 text-sm font-black text-slate-700">
                    {indexRecordMode === 'reference' && !selectedIndexReference ? 'Choose a reference name' : 'No active installment plans found'}
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    {indexRecordMode === 'reference' && !selectedIndexReference
                      ? 'Select a name from the dropdown to view its installment records.'
                      : indexRecordError || 'There are no active installment plans with an outstanding balance for this selection.'}
                  </p>
                </div>
              ) : (
                <div className="index-record-pages">
                  {indexRecordPages.map((pageRows, pageIndex) => (
                    <div className="index-record-page" key={`index-page-${pageIndex}`}>
                      <div className="index-print-header px-4 py-3">
                        <h1 className="index-print-title text-xl font-black text-slate-900 tracking-tight">{indexRecordMode === 'reference' ? `REFERENCE RECORD — ${selectedIndexReference}` : 'INDEX SHEET INSTALLMENT PLAN'}</h1>
                        <p className="index-print-company text-xs font-bold text-slate-700 mt-0.5"><span>{settings?.shopName || 'Electronics Shop'}</span><span>{indexRecordPrintedDate}</span></p>
                      </div>
                      <table className="index-record-table w-full min-w-[1500px] text-left">
                        <colgroup>
                          {[3.1538, 8.1538, 9.1538, 4.6538, 6.6538, 7.1538, 9.1538, 5, 7.1538, 6.1538, 8.1538, 9.1538, 8.1538, 8.1538].map((width, index) => (
                            <col key={index} style={{ width: `${width}%` }} />
                          ))}
                        </colgroup>
                        <thead>
                          <tr>
                            <th>S.N.</th><th>Date of<br />Material<br />Purchase</th><th>Name of Customer</th><th>Invoice No.</th><th>Total<br />Amount</th><th>Total Remaining<br />Amount</th><th>Installment Amount<br />+ Remaining</th><th>Inst.<br />Plan &amp;<br />No.</th><th>Received Amount</th><th>Remain Amount</th><th>Receiver Sign</th><th>Installment Received Date</th><th>Phone No.</th><th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((row, rowIndex) => {
                            const index = pageIndex * 12 + rowIndex;
                            const installmentBreakdown = row.installmentBreakdown?.length
                              ? row.installmentBreakdown
                              : row.installmentNumber
                                ? [{ installmentNumber: row.installmentNumber, amount: row.installmentAmount, remainingAmount: row.installmentRemainingAmount }]
                                : [];
                            return (
                              <tr key={row.id}>
                                <td>{index + 1}</td>
                                <td>{formatDate(row.purchaseDate)}</td>
                                <td className="index-customer-cell">{row.customerName}</td>
                                <td>{row.invoiceNumber}</td>
                                <td>{indexMoney(row.totalAmount)}</td>
                                <td>{indexMoney(row.totalRemainingAmount)}</td>
                                <td>
                                  <div className="mx-auto max-w-[42mm] text-[7px] leading-tight">
                                    {installmentBreakdown.map((installment, installmentIndex) => {
                                      const scheduledAmount = Number(installment.amount || 0);
                                      const remainingInstallmentAmount = Number(installment.remainingAmount || 0);
                                      const isPartiallyPaid = remainingInstallmentAmount < scheduledAmount - 0.005;
                                      return (
                                      <div key={installment.installmentNumber} className={`flex items-center justify-center gap-1 px-0.5 py-0.5 text-right ${installmentIndex < installmentBreakdown.length - 1 ? 'border-b border-slate-300' : ''}`}>
                                        <span className="font-black">#{installment.installmentNumber}</span>
                                        <span>{indexMoney(scheduledAmount)}{isPartiallyPaid ? ` / ${indexMoney(remainingInstallmentAmount)}` : ''}</span>
                                      </div>
                                    );})}
                                  </div>
                                </td>
                                <td>{row.installmentPlan}</td>
                                <td className="index-write-cell">&nbsp;</td>
                                <td>{indexMoney(row.remainingAmount)}</td>
                                <td className="index-write-cell">&nbsp;</td>
                                <td className="index-write-cell">&nbsp;</td>
                                <td>{fullDigits(row.mobile)}</td>
                                <td className="index-write-cell">&nbsp;</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PRINT ONLY FOOTER */}
            {indexRecordRows.length > 0 && (
              <div className="hidden print-footer px-3 py-2 border-t border-slate-300">
                <div className="flex items-center justify-between text-[8px] font-bold text-slate-600">
                  <span>Total Records: {indexRecordRows.length}</span>
                  <span>Printed: {new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =====================================================
            SEARCH + FILTER TOOLBAR
        ====================================================== */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5 sm:p-4 transition-all duration-300">
          <div className="flex flex-col xl:flex-row xl:items-center gap-3">

            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer, phone, invoice, plan or product..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 pl-11 pr-4 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
              {filterOptions.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setFilterPreset(preset.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all duration-300 ${
                    filterPreset === preset.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/20 scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

          </div>

          {filterPreset === 'custom' && (
            <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 animate-[pageEnter_0.3s_ease-out]">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <CalendarRange className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">From</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-700 outline-none"
                />
              </div>

              <span className="text-xs font-black text-slate-400 px-1">to</span>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <CalendarRange className="w-4 h-4 text-violet-600" />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-700 outline-none"
                />
              </div>
            </div>
          )}
        </section>

        {/* =====================================================
            KPI ROW 1
        ====================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleKpis.map((kpi) => {
            const Icon = kpi.icon;
            const tone = toneStyles[kpi.tone];

            return (
              <div
                key={kpi.name}
                className="premium-card group relative overflow-hidden p-5 shadow-sm"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.glow} to-transparent`}
                />

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {kpi.name}
                    </p>

                    <p className="mt-2 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 truncate">
                      {kpi.value}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-400">
                      {kpi.description}
                    </p>
                  </div>

                  <div
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${tone.icon} group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* =====================================================
            QUICK FINANCIAL SUMMARY
        ====================================================== */}
        {dashboardView === 'cash' ? (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative overflow-hidden bg-slate-950 rounded-2xl p-5 text-white shadow-xl border border-slate-800">
            <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-400">Product Purchase Cost</p>
            <p className="mt-2 text-2xl lg:text-3xl font-black tracking-tight">{money(cashCost)}</p>
            <p className="mt-3 text-xs font-bold text-slate-400">Total purchase cost of cash sale products</p>
          </div>
          <div className="premium-card p-5 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-400">Product Selling Price</p>
            <p className="mt-2 text-2xl lg:text-3xl font-black text-slate-900">{money(cashRevenue)}</p>
            <p className="mt-3 text-xs font-semibold text-slate-400">Total selling price of cash sale products</p>
          </div>
          <div className="premium-card p-5 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-400">Cash Profit</p>
            <p className={`mt-2 text-2xl lg:text-3xl font-black ${cashProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(cashProfit)}</p>
            <p className="mt-3 text-xs font-semibold text-slate-400">Selling price less purchase cost</p>
          </div>
        </section>
        ) : dashboardView === 'installment' ? null : <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative overflow-hidden bg-slate-950 rounded-2xl p-5 text-white shadow-xl border border-slate-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-400">
                    Total Collected
                  </p>
                  <p className="mt-2 text-2xl lg:text-3xl font-black tracking-tight text-white">
                    {money(totalCollected)}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <CircleDollarSign className="w-5 h-5 text-blue-400" />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Cash + installment collections
              </div>
            </div>
          </div>

          <div className="premium-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-400">
                    Current Outstanding
                </p>
                <p className="mt-2 text-2xl lg:text-3xl font-black tracking-tight text-red-600">
                  {money(totalOutstanding)}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
              Remaining customer balances
            </div>
          </div>

          <div className="premium-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-400">
                  Net Profit
                </p>
                <p
                  className={`mt-2 text-2xl lg:text-3xl font-black tracking-tight ${
                    netProfitVal >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {money(netProfitVal)}
                </p>
              </div>

              <div
                className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                  netProfitVal >= 0
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-red-50 border-red-100'
                }`}
              >
                <TrendingUp
                  className={`w-5 h-5 ${
                    netProfitVal >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                />
              </div>
            </div>

            <div className="mt-4 text-xs font-semibold text-slate-400">
              Gross profit after expenses
            </div>
          </div>
        </section>}

        {/* =====================================================
            PROFIT BREAKDOWN (Detailed Views)
        ====================================================== */}
        {dashboardView !== 'main' && <section className={`bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden ${dashboardView === 'cash' ? 'cash-profit-breakdown' : ''}`}>
          <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    {dashboardView === 'cash' ? 'Cash Profit Breakdown' : dashboardView === 'installment' ? 'Installment Profit Breakdown' : 'Profit Breakdown'}
                  </h3>
                </div>

                <p className="text-xs text-slate-400 mt-1.5">
                  Sale-time product cost is used for new sales; older sales without a saved cost use the product's current cost.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                  {dashboardView === 'cash' ? 'Cash Profit' : dashboardView === 'installment' ? 'Installment Profit' : 'Net Profit'}
                </p>
                <p
                  className={`text-xl font-black ${
                    (dashboardView === 'cash' ? cashProfit : dashboardView === 'installment' ? installmentProfit : netProfitVal) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {money(dashboardView === 'cash' ? cashProfit : dashboardView === 'installment' ? installmentProfit : netProfitVal)}
                </p>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${dashboardView === 'main' ? 'xl:grid-cols-2' : ''} gap-5 p-5 sm:p-6`}>

            {/* CASH BUSINESS */}
            {dashboardView !== 'installment' && <div className="rounded-2xl border border-emerald-100 overflow-hidden bg-white shadow-sm">
              <div className="px-5 py-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-white border-b border-emerald-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-emerald-100 flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900">
                        Cash Business
                      </h4>
                      <p className="text-[10px] font-medium text-slate-500">
                        Immediate payment sales
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                    {cashSalesList.length} Sales
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold text-slate-500">
                      {dashboardView === 'cash' ? 'Product Selling Price' : 'Cash Revenue'}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {money(cashRevenue)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Product Cost
                    </span>
                    <span className="text-sm font-black text-red-600">
                      - {money(cashCost)}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-center gap-4">
                    <span className="text-sm font-black text-slate-900">
                      Cash Profit
                    </span>
                    <span className="text-lg font-black text-emerald-600">
                      {money(cashProfit)}
                    </span>
                  </div>
                </div>

                {/* CASH DETAILS */}
                <div className="mt-6 pt-5 border-t border-emerald-100">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h5 className="text-sm font-black text-slate-900">
                        Cash Sale Details
                      </h5>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Unit cost, selling price and profit per sale.
                      </p>
                    </div>
                    <Receipt className="w-4 h-4 text-emerald-500" />
                  </div>

                  {detailedCashProfitList.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 py-8 text-center">
                      <ShoppingCart className="w-7 h-7 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold text-slate-400 mt-2">
                        No cash sales found.
                      </p>
                    </div>
                  ) : (
                    <>
                    <div className="space-y-3 max-h-[900px] overflow-y-auto pr-1 custom-scrollbar">
                      {visibleCashDetails.map((sale, index) => (
                        <div
                          key={sale._id || index}
                          className="group rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:bg-white hover:border-emerald-200 hover:shadow-sm transition"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                  <Users className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                                <span className="font-black text-xs text-slate-900 truncate">
                                  {sale.customer?.fullName || 'Walk-in Customer'}
                                </span>
                              </div>
                              {sale.customer && (
                                <div className="ml-9 mt-1 space-y-0.5 text-[10px] text-slate-500">
                                  {sale.customer.mobileNumber && <p>Phone: {sale.customer.mobileNumber}</p>}
                                  {sale.customer.cnic && <p>CNIC: {sale.customer.cnic}</p>}
                                </div>
                              )}

                              <div className="flex items-start gap-2 mt-2.5">
                                <ShoppingCart className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-slate-700 break-words">
                                    {sale.product?.name || 'Deleted Product'}
                                  </p>
                                  {(sale.product?.brand || sale.product?.category) && (
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {[sale.product?.brand, sale.product?.category].filter(Boolean).join(' · ')}
                                    </p>
                                  )}
                                  <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                                    Model: {sale.product?.model || sale.product?.productModel || sale.product?.modelNumber || sale.model || sale.productModel || sale.modelNumber || 'N/A'}
                                  </p>
                                  {(sale.product?.serialNumber || sale.product?.imei || sale.product?.chassisNumber || sale.product?.engineNumber) && (
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {[sale.product?.serialNumber && `Serial: ${sale.product.serialNumber}`, sale.product?.imei && `IMEI: ${sale.product.imei}`, sale.product?.chassisNumber && `Chassis: ${sale.product.chassisNumber}`, sale.product?.engineNumber && `Engine: ${sale.product.engineNumber}`].filter(Boolean).join(' · ')}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Qty {sale.quantity}
                                    <span className="mx-1">•</span>
                                    Invoice {sale.saleId || '-'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="sm:text-right shrink-0">
                              <p className="text-[9px] uppercase tracking-wider font-black text-slate-400">
                                Profit
                              </p>
                              <p className="text-sm font-black text-emerald-600 mt-0.5">
                                {money(sale.profit)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-dashed border-slate-200">
                            <div>
                              <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                Unit Cost
                              </p>
                              <p className="font-bold text-slate-700 text-[11px] mt-0.5">
                                {money(sale.purchasePrice)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                Sold For
                              </p>
                              <p className="font-bold text-slate-800 text-[11px] mt-0.5">
                                {money(sale.sellingPrice)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                Date
                              </p>
                              <p className="font-bold text-slate-700 text-[11px] mt-0.5">
                                {formatDate(sale.saleDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {detailedCashProfitList.length > cashDetailsPageSize && (
                      <div className="mt-4 flex flex-col gap-3 border-t border-emerald-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-semibold text-slate-500">
                          Showing {(currentCashDetailsPage - 1) * cashDetailsPageSize + 1}–{Math.min(currentCashDetailsPage * cashDetailsPageSize, detailedCashProfitList.length)} of {detailedCashProfitList.length} cash sales
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCashDetailsPage((page) => Math.max(1, page - 1))}
                            disabled={currentCashDetailsPage === 1}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Previous
                          </button>
                          <span className="text-xs font-bold text-slate-600">Page {currentCashDetailsPage} of {cashDetailsPageCount}</span>
                          <button
                            type="button"
                            onClick={() => setCashDetailsPage((page) => Math.min(cashDetailsPageCount, page + 1))}
                            disabled={currentCashDetailsPage === cashDetailsPageCount}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                    </>
                  )}
                </div>
              </div>
            </div>}

            {/* INSTALLMENT BUSINESS */}
            {dashboardView !== 'cash' && <div className="rounded-2xl border border-indigo-100 overflow-hidden bg-white shadow-sm">
              <div className="px-5 py-4 bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-white border-b border-indigo-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900">
                        Installment Business
                      </h4>
                      <p className="text-[10px] font-medium text-slate-500">
                        Customer financing portfolio
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">
                    {visibleInstallmentProfitList.length} Deals
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Installment Revenue
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {money(installmentRevenue)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Product Cost
                    </span>
                    <span className="text-sm font-black text-red-600">
                      - {money(installmentCost)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Product Base Margin
                    </span>
                    <span className="text-sm font-black text-slate-700">
                      + {money(installmentBaseProductProfit)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Financing Markup Profit
                    </span>
                    <span className="text-sm font-black text-indigo-600">
                      + {money(installmentMarkupProfit)}
                    </span>
                  </div>

                  {/* SUMMED: Product Profit + Markup Profit */}
                  <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-center gap-4">
                    <div>
                      <span className="text-sm font-black text-slate-900">
                        Total Installment Profit
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Product Margin + Financing Markup
                      </p>
                    </div>
                    <span className="text-lg font-black text-indigo-600">
                      {money(installmentProfit)}
                    </span>
                  </div>
                </div>

                {/* INSTALLMENT DETAILS */}
                {dashboardView !== 'installment' && <div className="mt-6 pt-5 border-t border-indigo-100">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h5 className="text-sm font-black text-slate-900">
                        Customer & Payment Details
                      </h5>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Customer-wise financing activity.
                      </p>
                    </div>
                    <Layers className="w-4 h-4 text-indigo-500" />
                  </div>

                  {visibleInstallmentProfitList.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 py-8 text-center">
                      <CreditCard className="w-7 h-7 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold text-slate-400 mt-2">
                        No installment sales found.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                      {visibleInstallmentProfitList.map((sale, index) => (
                        <div
                          key={sale._id || index}
                          className="rounded-xl border border-slate-200 overflow-hidden hover:border-indigo-200 hover:shadow-sm transition"
                        >
                          {/* CUSTOMER HEADER */}
                          <div className="p-3.5 bg-indigo-50/40 border-b border-indigo-100">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-white border border-indigo-100 flex items-center justify-center shrink-0">
                                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                                  </div>
                                  <h6 className="font-black text-xs text-slate-900 truncate">
                                    {sale.customer?.fullName || 'Customer'}
                                  </h6>
                                </div>

                                <div className="mt-1.5 space-y-0.5 pl-8">
                                  <p className="text-[10px] text-slate-500 font-semibold">
                                    Mob: {sale.customer?.mobileNumber || 'N/A'}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    Product: {sale.product?.name || 'Item'}
                                  </p>
                                  <p className="text-[10px] font-semibold text-indigo-600 truncate">
                                    Model: {sale.product?.model || sale.product?.productModel || sale.product?.modelNumber || sale.model || sale.productModel || sale.modelNumber || 'N/A'}
                                  </p>
                                </div>
                              </div>

                              <div className="sm:text-right">
                                <p className="text-[9px] uppercase tracking-wider font-black text-slate-400">
                                  Total Profit
                                </p>
                                <p className="text-sm font-black text-indigo-600 mt-0.5">
                                  {money(sale.totalProfit)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* DEAL DETAILS */}
                          <div className="p-3.5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              <div>
                                <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                  Cost
                                </p>
                                <p className="font-bold text-red-600 text-[11px] mt-0.5">
                                  {money(sale.originalCost)}
                                </p>
                              </div>

                              <div>
                                <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                  Cash Price
                                </p>
                                <p className="font-bold text-slate-800 text-[11px] mt-0.5">
                                  {money(sale.sellingPrice)}
                                </p>
                              </div>

                              <div>
                                <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                  Down Payment
                                </p>
                                <p className="font-bold text-emerald-600 text-[11px] mt-0.5">
                                  {money(sale.downPayment)}
                                </p>
                              </div>

                              <div>
                                <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                  Markup Profit
                                </p>
                                <p className="font-bold text-indigo-600 text-[11px] mt-0.5">
                                  {sale.markupPercent}% • {money(sale.markupAmount)}
                                </p>
                              </div>
                            </div>

                            {/* PAYMENT SUMMARY */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3.5 pt-3.5 border-t border-dashed border-slate-200">
                              <div className="rounded-lg bg-slate-50 p-2.5">
                                <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                  Customer Payable
                                </p>
                                <p className="font-black text-slate-900 text-xs mt-0.5">
                                  {money(sale.totalCustomerPayable)}
                                </p>
                              </div>

                              <div className="rounded-lg bg-emerald-50 p-2.5">
                                <p className="text-[8px] uppercase tracking-wider font-black text-emerald-600">
                                  Total Received
                                </p>
                                <p className="font-black text-emerald-700 text-xs mt-0.5">
                                  {money(sale.totalReceived)}
                                </p>
                              </div>

                              <div className="rounded-lg bg-red-50 p-2.5">
                                <p className="text-[8px] uppercase tracking-wider font-black text-red-500">
                                  Remaining
                                </p>
                                <p className="font-black text-red-600 text-xs mt-0.5">
                                  {money(sale.remainingAmount)}
                                </p>
                              </div>
                            </div>

                            {/* PAYMENT HISTORY */}
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <h6 className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                                  Payment History
                                </h6>
                                <span className="text-[9px] font-bold text-slate-400">
                                  {sale.customerPayments.length} Payments
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {/* DOWN PAYMENT */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 bg-emerald-50/70 border border-emerald-100 rounded-lg px-3 py-2">
                                  <div>
                                    <p className="text-[10px] font-black text-emerald-800">
                                      Down Payment
                                    </p>
                                    <p className="text-[9px] text-emerald-600">
                                      Sale Date: {formatDate(sale.saleDate)}
                                    </p>
                                  </div>
                                  <p className="text-xs font-black text-emerald-700">
                                    + {money(sale.downPayment)}
                                  </p>
                                </div>

                                {/* INSTALLMENT PAYMENTS */}
                                {sale.customerPayments.length > 0 ? (
                                  sale.customerPayments.map((payment, paymentIndex) => (
                                    <div
                                      key={payment._id || paymentIndex}
                                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                                    >
                                      <div>
                                        <p className="text-[10px] font-black text-slate-700">
                                          Installment Payment #{paymentIndex + 1}
                                        </p>
                                        <p className="text-[9px] text-slate-500">
                                          {payment.paymentDate
                                            ? formatDate(payment.paymentDate)
                                            : 'Date N/A'}
                                          {' • '}
                                          {payment.paymentMethod || 'Cash'}
                                        </p>
                                      </div>
                                      <p className="text-xs font-black text-slate-800">
                                        + {money(payment.amount)}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[10px] text-slate-400 text-center py-2">
                                    No installment payment received yet.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>}
              </div>
            </div>}

          </div>

          {/* FINAL PROFIT SUMMARY */}
            {dashboardView === 'cash' ? (
          <div className="mx-5 sm:mx-6 mb-6 rounded-2xl border border-emerald-200 overflow-hidden bg-emerald-50/50">
            <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between gap-4"><div><h4 className="font-black text-sm">Cash Profit Summary</h4><p className="text-[10px] text-emerald-100 mt-0.5">Cash sales less cash sale product cost.</p></div><Banknote className="w-5 h-5" /></div>
            <div className="p-5 space-y-3"><div className="flex justify-between"><span className="text-xs font-semibold text-slate-500">Product Cost</span><span className="text-sm font-black text-red-600">− {money(cashCost)}</span></div><div className="border-t border-emerald-200 pt-3 flex justify-between"><span className="text-sm font-black">Cash Profit</span><span className="text-lg font-black text-emerald-700">{money(cashProfit)}</span></div></div>
            </div>
            ) : dashboardView === 'installment' ? (
            <div className="mx-5 sm:mx-6 mb-6 rounded-2xl border border-indigo-200 overflow-hidden bg-indigo-50/50">
              <div className="px-5 py-4 bg-indigo-800 text-white flex items-center justify-between gap-4"><div><h4 className="font-black text-sm">Installment Profit Summary</h4><p className="text-[10px] text-indigo-100 mt-0.5">Installment product margin and financing markup.</p></div><CreditCard className="w-5 h-5" /></div>
              <div className="p-5 space-y-3"><div className="flex justify-between"><span className="text-xs font-semibold text-slate-500">Product Margin</span><span className="text-sm font-black">{money(installmentBaseProductProfit)}</span></div><div className="flex justify-between"><span className="text-xs font-semibold text-slate-500">Financing Markup</span><span className="text-sm font-black text-indigo-600">{money(installmentMarkupProfit)}</span></div><div className="border-t border-indigo-200 pt-3 flex justify-between"><span className="text-sm font-black">Installment Profit</span><span className="text-lg font-black text-indigo-700">{money(installmentProfit)}</span></div></div>
            </div>
            ) : <div className="mx-5 sm:mx-6 mb-6 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between gap-4">
              <div>
                <h4 className="font-black text-sm">
                  Final Profit Calculation
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Gross profit less recorded expenses.
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>

            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs font-semibold text-slate-500">
                  Cash Profit
                </span>
                <span className="text-sm font-black text-emerald-600">
                  + {money(cashProfit)}
                </span>
              </div>

              <div className="flex justify-between items-center gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500">
                    Installment Profit
                  </span>
                  <span className="ml-1.5 text-[10px] text-slate-400">
                    (Product Margin + Markup)
                  </span>
                </div>
                <span className="text-sm font-black text-indigo-600">
                  + {money(installmentProfit)}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center gap-4">
                <span className="text-sm font-black text-slate-900">
                  Gross Profit
                </span>
                <span className="text-sm font-black text-slate-900">
                  {money(grossProfit)}
                </span>
              </div>

              <div className="flex justify-between items-center gap-4">
                <span className="text-xs font-semibold text-slate-500">
                  Less: Total Expenses
                </span>
                <span className="text-sm font-black text-red-600">
                  - {money(totalExpensesVal)}
                </span>
              </div>

              <div className="mt-2 pt-4 border-t-2 border-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-base sm:text-lg font-black text-slate-900">
                    Clear / Net Profit
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Gross Profit − Total Expenses
                  </p>
                </div>

                <span
                  className={`text-2xl sm:text-3xl font-black ${
                    netProfitVal >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {money(netProfitVal)}
                </span>
              </div>
            </div>
          </div>}
        </section>}

        {/* =====================================================
            LEDGERS + URGENT DUES
        ====================================================== */}
        {dashboardView !== 'main' && <div className={`grid grid-cols-1 gap-6`}>

          {/* LEDGER */}
          <section className={`${dashboardView === 'main' ? 'xl:col-span-2' : ''} bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden flex flex-col`}>
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {dashboardView === 'installment' ? 'Installment Recovery' : 'Transaction Ledger'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {dashboardView === 'installment'
                      ? 'All received installment payments for the selected date range.'
                      : dashboardView === 'cash'
                      ? 'Cash sale transactions.'
                      : 'Monitor financing and cash transactions.'}
                  </p>
                </div>

                {dashboardView !== 'installment' && <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                  {dashboardView === 'main' && <button
                    onClick={() => setActiveTableTab(0)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      activeTableTab === 0
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Financing ({activeFinancingLedgerList.length})
                  </button>}

                  <button
                    onClick={() => setActiveTableTab(1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      activeTableTab === 1
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Cash ({cashSales.length})
                  </button>
                </div>}
              </div>
            </div>

            {dashboardView === 'installment' && (
              <div className="space-y-4 p-4 sm:p-6">
                {installmentRecoveryList.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center">
                    <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-600">No installment payments received</p>
                    <p className="mt-1 text-xs text-slate-400">Received qist payments for this date range will appear here.</p>
                  </div>
                ) : (
                  <>
                  <div className="flex flex-col gap-1 rounded-xl bg-indigo-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-sm font-black text-indigo-950">Total Recovery</h4>
                    <p className="text-xs font-bold text-indigo-700">{installmentRecoveryList.length} payments · {money(installmentPayments)}</p>
                  </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left">
                        <thead className="border-b border-slate-100 bg-white">
                          <tr>
                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Received At</th>
                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Customer</th>
                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Invoice Number</th>
                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Installment</th>
                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Method</th>
                            <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-wider text-slate-400">Amount Received</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {installmentRecoveryList.map((payment, index) => {
                            const installmentNumbers = payment.allocations?.length
                              ? payment.allocations.map((allocation) => allocation.installmentNumber).filter(Boolean).join(', ')
                              : payment.installment?.installmentNumber;
                            return (
                              <tr key={payment._id || index} className="hover:bg-slate-50">
                                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{formatDateTime(payment.paymentDate)}</td>
                                <td className="px-4 py-3 font-bold text-slate-800">{payment.customer?.fullName || 'Customer'}</td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{payment.sale?.saleId || '—'}</td>
                                <td className="px-4 py-3 text-slate-600">{installmentNumbers ? `#${installmentNumbers}` : '—'}</td>
                                <td className="px-4 py-3 text-slate-600">{payment.paymentMethod || 'Cash'}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-3">
                                    <span className="font-black text-emerald-700">{money(payment.amount)}</span>
                                    <button
                                      type="button"
                                      onClick={() => handlePrintInstallmentReceipt(payment)}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-indigo-500"
                                      title="Print payment receipt"
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                      Print Slip
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* FINANCING TABLE */}
            {dashboardView === 'main' && activeTableTab === 0 && (
              <div className="overflow-x-auto flex-1">
                {activeFinancingLedgerList.length === 0 ? (
                  <div className="py-14 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 mx-auto flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-3">
                      No financing plans found
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Try changing the date filter or search.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Invoice
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Buyer
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Item
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">
                          Received
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">
                          Remaining
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                          Status
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                          View
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-xs">
                      {activeFinancingLedgerList.map((plan) => {
                        const totalWithMarkup = Number(plan.totalAmount || 0);
                        const remaining = Number(plan.remainingBalance || 0);
                        const amountReceived = Math.max(0, totalWithMarkup - remaining);

                        return (
                          <tr
                            key={plan._id}
                            className="group hover:bg-slate-50/80 transition"
                          >
                            <td className="px-5 py-3.5 font-black text-indigo-600">
                              {plan.sale?.saleId || 'Invoice unavailable'}
                            </td>

                            <td className="px-5 py-3.5 font-bold text-slate-800">
                              {plan.customer?.fullName || 'Walk-in'}
                            </td>

                            <td className="px-5 py-3.5">
                              <div className="max-w-[180px] truncate text-slate-600 font-medium">
                                {plan.product?.name || 'Item'}
                              </div>
                            </td>

                            <td className="px-5 py-3.5 text-right font-black text-emerald-600">
                              + {money(amountReceived)}
                            </td>

                            <td className="px-5 py-3.5 text-right font-black text-red-600">
                              {money(remaining)}
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black border ${
                                  plan.status === 'Completed'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : plan.status === 'Overdue'
                                    ? 'bg-red-50 border-red-200 text-red-700'
                                    : 'bg-blue-50 border-blue-200 text-blue-700'
                                }`}
                              >
                                {plan.status}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              <Link
                                to={`/installments/${plan._id}`}
                                className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* CASH TABLE */}
            {dashboardView !== 'installment' && activeTableTab === 1 && (
              <div className="overflow-x-auto flex-1">
                {cashSales.length === 0 ? (
                  <div className="py-14 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 mx-auto flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-3">
                      No cash transactions found
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Try changing the date filter or search.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Invoice
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Buyer
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Product
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                          Qty
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">
                          Deal
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Date
                        </th>
                        <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                          View
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-xs">
                      {cashSales.map((sale) => (
                        <tr
                          key={sale._id}
                          className="hover:bg-slate-50/80 transition"
                        >
                          <td className="px-5 py-3.5 font-black text-indigo-600">
                            {sale.saleId}
                          </td>

                          <td className="px-5 py-3.5 font-bold text-slate-800">
                            {sale.customer?.fullName || 'Walk-in'}
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="block max-w-[180px] truncate text-slate-700 font-medium">
                              {sale.product?.name || 'Item'}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex min-w-7 justify-center px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-700">
                              {sale.quantity}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right font-black text-emerald-600">
                            {money(sale.finalTotal)}
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                              {formatDateTime(sale.saleDate)}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <Link
                              to={`/invoices/${sale._id}`}
                              className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>

          {/* URGENT DUES */}
          {dashboardView === 'main' && <section className="bg-white border border-red-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-r from-red-500/10 via-red-500/5 to-white border-b border-red-100">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/20">
                    <AlertCircle className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">
                      Urgent Dues
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Due & overdue installments
                    </p>
                  </div>
                </div>

                {stats?.installments?.urgentInstallments?.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black">
                    {stats.installments.urgentInstallments.length}
                  </span>
                )}
              </div>
            </div>

            {!stats?.installments?.urgentInstallments ||
            stats.installments.urgentInstallments.length === 0 ? (
              <div className="p-10 text-center flex-1 flex flex-col items-center justify-center">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs font-black text-slate-700 mt-2.5">
                  Everything looks good
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  No due or overdue installments today.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                {stats.installments.urgentInstallments.map((inst) => (
                  <div
                    key={inst._id}
                    className="p-4 hover:bg-slate-50/70 transition"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">
                          {inst.installmentPlan?.customer?.fullName || 'N/A'}
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold mt-0.5">
                          Mob: {inst.installmentPlan?.customer?.mobileNumber || ''}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black border ${
                          inst.status === 'Overdue'
                            ? 'bg-red-50 border-red-100 text-red-700'
                            : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}
                      >
                        {inst.status}
                      </span>
                    </div>

                    <div className="mt-2.5 flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-700 truncate">
                          Month #{inst.installmentNumber}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                          {inst.installmentPlan?.product?.name || 'Item'}
                        </p>
                      </div>

                      <span className="text-xs font-black text-slate-900 shrink-0">
                        {money(inst.amount)}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 flex justify-between items-center gap-2">
                      <span className="text-[9px] text-red-500 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due: {formatDate(inst.dueDate)}
                      </span>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleSendUrgentReminder(inst)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition"
                          title="Send WhatsApp Due Alert"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        <Link
                          to={`/installments/${inst.installmentPlan?._id}`}
                          className="inline-flex items-center gap-1 bg-slate-900 hover:bg-indigo-600 text-white font-black text-[9px] px-2.5 py-1.5 rounded-lg transition"
                        >
                          Settle
                          <ChevronRight className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>}

        </div>}

      </div>
    </>
  );
};

export default Dashboard;
