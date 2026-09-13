import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';

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
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const Dashboard = () => {
  const { settings } = useSettings();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTableTab, setActiveTableTab] = useState(0);
  const [filterPreset, setFilterPreset] = useState('all');

  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [globalSearch, setGlobalSearch] = useState('');

  // =========================================================
  // INDEX RECORD STATES
  // =========================================================
  const [showIndexRecord, setShowIndexRecord] = useState(false);
  const [indexRecordData, setIndexRecordData] = useState(null);
  const [indexRecordLoading, setIndexRecordLoading] = useState(false);
  const [indexRecordError, setIndexRecordError] = useState('');

  const [indexMonth, setIndexMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // =========================================================
  // FETCH DASHBOARD DATA
  // =========================================================
  const fetchStats = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get('/api/reports/dashboard');

      if (response.data?.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      if (!showRefresh) {
        toast.error('Unable to load dashboard data.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchIndexRecord = async () => {
    if (!indexMonth) return;

    try {
      setIndexRecordLoading(true);
      setIndexRecordError('');

      const response = await api.get('/api/reports/index-record', {
        params: { month: indexMonth },
      });

      if (response.data?.success) {
        setIndexRecordData(response.data.data);
      } else {
        setIndexRecordData(null);
        setIndexRecordError('Unable to load the monthly index record.');
      }
    } catch (error) {
      console.error('Failed to load index record:', error);
      setIndexRecordData(null);
      setIndexRecordError(
        error.response?.data?.message || 'Unable to load the monthly index record.'
      );
    } finally {
      setIndexRecordLoading(false);
    }
  };

  useEffect(() => {
    if (showIndexRecord) {
      fetchIndexRecord();
    }
  }, [showIndexRecord, indexMonth]);

  // =========================================================
  // FORMATTERS & HELPERS
  // =========================================================
  const money = (value) =>
    `${settings?.currency || 'PKR'} ${Number(value || 0).toLocaleString()}`;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // =========================================================
  // WHATSAPP
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
    const dueDateFormatted = new Date(inst.dueDate).toLocaleDateString('en-PK');

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

  // =========================================================
  // INDEX RECORD HELPERS
  // =========================================================
  const getPlanInstallments = (plan) => {
    if (!plan) return [];
    if (Array.isArray(plan.installments)) return plan.installments;
    if (Array.isArray(plan.paymentSchedule)) return plan.paymentSchedule;
    if (Array.isArray(plan.installmentSchedule)) return plan.installmentSchedule;
    if (Array.isArray(plan.schedule)) return plan.schedule;
    if (Array.isArray(plan.installmentList)) return plan.installmentList;
    return [];
  };

  const getInstallmentDueDate = (installment) => {
    if (!installment) return null;
    return (
      installment.dueDate ||
      installment.date ||
      installment.paymentDate ||
      installment.installmentDate ||
      null
    );
  };

  const getInstallmentAmount = (installment) => {
    if (!installment) return 0;
    return Number(
      installment.amount ??
        installment.installmentAmount ??
        installment.originalAmount ??
        installment.totalAmount ??
        0
    );
  };

  const getInstallmentPaidAmount = (installment) => {
    if (!installment) return 0;
    return Number(
      installment.paidAmount ?? installment.amountPaid ?? installment.paid ?? 0
    );
  };

  const getInstallmentNumber = (installment, index) => {
    if (!installment) return index + 1;
    return Number(
      installment.installmentNumber ??
        installment.number ??
        installment.installmentNo ??
        index + 1
    );
  };

  const getTotalInstallments = (plan, installments) => {
    const value =
      plan?.totalInstallments ??
      plan?.numberOfInstallments ??
      plan?.installmentCount ??
      plan?.duration ??
      plan?.installmentDuration ??
      installments?.length ??
      0;
    return Number(value || 0);
  };

  const getCustomerMobile = (plan) => {
    return String(
      plan?.customer?.mobileNumber ??
        plan?.customer?.mobile ??
        plan?.mobileNumber ??
        ''
    );
  };

  const getCustomerCNIC = (plan) => {
    return String(
      plan?.customer?.cnic ??
        plan?.customer?.cnicNumber ??
        plan?.cnic ??
        plan?.cnicNumber ??
        ''
    );
  };

  const getPreviousPaidAmount = (installments, currentNumber, plan) => {
    let previousPaid = 0;
    installments.forEach((item, index) => {
      const itemNumber = getInstallmentNumber(item, index);
      if (itemNumber < currentNumber) {
        previousPaid += getInstallmentPaidAmount(item);
      }
    });

    const hasFirstInstallmentAsDownPayment = installments.some((item, index) => {
      const number = getInstallmentNumber(item, index);
      return (
        number === 1 &&
        (item?.isDownPayment === true ||
          item?.downPayment === true ||
          item?.type === 'Down Payment')
      );
    });

    if (currentNumber > 1 && !hasFirstInstallmentAsDownPayment) {
      previousPaid += Number(plan?.downPayment || 0);
    }

    return previousPaid;
  };

  // =========================================================
  // INDEX RECORD ROWS
  // =========================================================
  const fallbackIndexRecordRows = useMemo(() => {
    if (!stats) return [];
    const plans = stats?.installments?.activeFinancingList || [];
    const selectedPlans = Array.isArray(plans) ? plans : [];
    const rows = [];

    selectedPlans.forEach((plan) => {
      const installments = getPlanInstallments(plan);
      if (!installments.length) return;

      const totalInstallments = getTotalInstallments(plan, installments);

      installments.forEach((installment, index) => {
        const dueDate = getInstallmentDueDate(installment);
        if (!dueDate) return;

        const date = new Date(dueDate);
        if (Number.isNaN(date.getTime())) return;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dueMonth = `${year}-${month}`;

        if (dueMonth !== indexMonth) return;

        const installmentAmount = getInstallmentAmount(installment);
        const paidAmount = getInstallmentPaidAmount(installment);

        if (paidAmount >= installmentAmount && installmentAmount > 0) return;

        const installmentNumber = getInstallmentNumber(installment, index);

        rows.push({
          id: installment._id || `${plan._id}-${installmentNumber}-${index}`,
          customerName: plan?.customer?.fullName || plan?.customer?.name || 'N/A',
          mobile: getCustomerMobile(plan),
          cnic: getCustomerCNIC(plan),
          productName: plan?.product?.name || plan?.productName || 'Item',
          model:
            plan?.product?.model ||
            plan?.product?.productModel ||
            plan?.product?.modelNumber ||
            plan?.model ||
            plan?.productModel ||
            plan?.modelNumber ||
            'N/A',
          installmentPrice: installmentAmount,
          previousPaidAmount: getPreviousPaidAmount(
            installments,
            installmentNumber,
            plan
          ),
          installmentNumber,
          totalInstallments,
          dueDate,
        });
      });
    });

    rows.sort((a, b) => {
      const dateDifference =
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dateDifference !== 0) return dateDifference;
      return a.customerName.localeCompare(b.customerName);
    });

    return rows;
  }, [stats, indexMonth]);

  const indexRecordRows = indexRecordData?.rows || fallbackIndexRecordRows;

  const indexMonthLabel = useMemo(() => {
    if (!indexMonth) return '';
    const [year, month] = indexMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-PK', {
      month: 'long',
      year: 'numeric',
    });
  }, [indexMonth]);

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
      return toast.error(`No due installments found for ${indexMonthLabel}.`);
    }

    const headers = [
      'Customer Name',
      'Mobile Number',
      'CNIC',
      'Product Name',
      'Model',
      'Due Date',
      'Installment Price',
      'Previous Paid Amount',
      'Paid Installments',
      'This Installment',
    ];

    const rows = indexRecordRows.map((row) => {
      return [
        csvNormalCell(row.customerName),
        csvTextCell(row.mobile),
        csvTextCell(row.cnic),
        csvNormalCell(row.productName),
        csvNormalCell(row.model),
        csvNormalCell(formatDate(row.dueDate)),
        csvNormalCell(
          `${settings?.currency || 'PKR'} ${Number(row.installmentPrice || 0).toLocaleString()}`
        ),
        csvNormalCell(
          `${settings?.currency || 'PKR'} ${Number(row.previousPaidAmount || 0).toLocaleString()}`
        ),
        csvNormalCell(
          `${row.paidInstallments ?? Math.max(0, Number(row.installmentNumber || 1) - 1)} / ${row.totalInstallments}`
        ),
        csvNormalCell(row.installmentNumber),
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
    link.download = `Index_Record_${indexMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Index Record CSV exported successfully.');
  };

  // =========================================================
  // PRINT HANDLER (FIXED FOR ZERO SCROLL OFFSET & RENDERING)
  // =========================================================
  const handleIndexRecordPrint = () => {
    if (indexRecordRows.length === 0) {
      return toast.error(`No due installments found for ${indexMonthLabel}.`);
    }

    // Scroll parent layout and window to top so printable content isn't clipped
    window.scrollTo(0, 0);
    const scrollContainer = document.querySelector('main')?.parentElement;
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }

    setTimeout(() => {
      window.print();
    }, 150);
  };

  // =========================================================
  // DATE FILTER
  // =========================================================
  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false;

    const date = new Date(dateStr);
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

  // =========================================================
  // FILTERED DATA
  // =========================================================
  const filteredSalesList = (stats?.sales?.salesList || []).filter((s) =>
    isDateInFilter(s.saleDate)
  );
  const filteredFinancingList = (stats?.installments?.activeFinancingList || []).filter(
    (p) => isDateInFilter(p.createdAt)
  );
  const filteredPaymentsList = (stats?.installments?.paymentsList || []).filter(
    (pay) => isDateInFilter(pay.paymentDate)
  );
  const filteredExpensesList = (stats?.expenses?.expensesList || []).filter((e) =>
    isDateInFilter(e.expenseDate)
  );

  const cashSalesList = filteredSalesList.filter((s) => s.paymentType === 'Cash');
  const installmentSalesList = filteredSalesList.filter(
    (s) => s.paymentType === 'Installment'
  );

  // Revenue
  const totalRevenue = filteredSalesList.reduce(
    (sum, s) => sum + Number(s.finalTotal || 0),
    0
  );
  const cashRevenue = cashSalesList.reduce(
    (sum, s) => sum + Number(s.finalTotal || 0),
    0
  );

  // Cash Profit
  const cashCost = cashSalesList.reduce(
    (sum, s) =>
      sum + Number(s.quantity || 0) * Number(s.product?.purchasePrice || 0),
    0
  );
  const cashProfit = cashRevenue - cashCost;

  // Installment Profit
  const installmentRevenue = installmentSalesList.reduce(
    (sum, s) => sum + Number(s.finalTotal || 0),
    0
  );
  const installmentCost = installmentSalesList.reduce(
    (sum, s) =>
      sum + Number(s.quantity || 0) * Number(s.product?.purchasePrice || 0),
    0
  );

  const installmentMarkupProfit = installmentSalesList.reduce((sum, s) => {
    const finalTotal = Number(s.finalTotal || 0);
    const downPayment = Number(s.downPayment || 0);
    const duration = Number(s.installmentDuration || 0);

    let markupPercent = 0;
    if (duration === 3) {
      markupPercent = 15;
    } else if (duration === 6) {
      markupPercent = 25;
    } else if (duration === 12) {
      markupPercent = 50;
    } else if (duration <= 3) {
      markupPercent = 15;
    } else if (duration <= 6) {
      markupPercent = 25;
    } else {
      markupPercent = 50;
    }

    const remainingPrincipal = Math.max(0, finalTotal - downPayment);
    const markupAmount = Math.round(remainingPrincipal * (markupPercent / 100));

    return sum + markupAmount;
  }, 0);

  const installmentProductProfit = installmentRevenue - installmentCost;
  const installmentProfit = installmentProductProfit + installmentMarkupProfit;

  // Installment Payments
  const installmentDownPayments = installmentSalesList.reduce(
    (sum, s) => sum + Number(s.downPayment || 0),
    0
  );
  const installmentPayments = filteredPaymentsList.reduce(
    (sum, pay) => sum + Number(pay.amount || 0),
    0
  );
  const totalInstallmentPaymentsReceived =
    installmentDownPayments + installmentPayments;

  // Totals
  const totalCollected = cashRevenue + totalInstallmentPaymentsReceived;
  const totalOutstanding = filteredFinancingList.reduce(
    (sum, p) => sum + Number(p.remainingBalance || 0),
    0
  );
  const grossProfit = cashProfit + installmentProfit;
  const totalExpensesVal = filteredExpensesList.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );
  const netProfitVal = grossProfit - totalExpensesVal;

  // Search Filter
  const searchFilter = (item) => {
    if (!globalSearch) return true;
    const term = globalSearch.toLowerCase().trim();
    const custName = item.customer?.fullName?.toLowerCase() || '';
    const custPhone = item.customer?.mobileNumber || '';
    const id = (item.saleId || item.planId || '').toLowerCase();
    const prodName = item.product?.name?.toLowerCase() || '';

    return (
      custName.includes(term) ||
      custPhone.includes(term) ||
      id.includes(term) ||
      prodName.includes(term)
    );
  };

  const cashSales = cashSalesList.filter((s) => searchFilter(s));
  const activeFinancingLedgerList = filteredFinancingList.filter((p) =>
    searchFilter(p)
  );

  // Detailed Cash Profit
  const detailedCashProfitList = cashSalesList
    .filter((s) => searchFilter(s))
    .map((sale) => {
      const quantity = Number(sale.quantity || 0);
      const purchasePrice = Number(sale.product?.purchasePrice || 0);
      const originalCost = quantity * purchasePrice;
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
    });

  // Detailed Installment Profit
  const detailedInstallmentProfitList = installmentSalesList
    .filter((s) => searchFilter(s))
    .map((sale) => {
      const quantity = Number(sale.quantity || 0);
      const purchasePrice = Number(sale.product?.purchasePrice || 0);
      const originalCost = quantity * purchasePrice;
      const sellingPrice = Number(sale.finalTotal || 0);
      const downPayment = Number(sale.downPayment || 0);
      const duration = Number(sale.installmentDuration || 0);

      let markupPercent = 0;
      if (duration === 3) {
        markupPercent = 15;
      } else if (duration === 6) {
        markupPercent = 25;
      } else if (duration === 12) {
        markupPercent = 50;
      } else if (duration <= 3) {
        markupPercent = 15;
      } else if (duration <= 6) {
        markupPercent = 25;
      } else {
        markupPercent = 50;
      }

      const remainingPrincipal = Math.max(0, sellingPrice - downPayment);
      const markupAmount = Math.round(remainingPrincipal * (markupPercent / 100));
      const totalCustomerPayable = sellingPrice + markupAmount;

      const customerPayments = filteredPaymentsList.filter((payment) => {
        const paymentSaleId = payment.sale?._id || payment.sale;
        return (
          paymentSaleId &&
          sale._id &&
          String(paymentSaleId) === String(sale._id)
        );
      });

      const installmentPaymentsReceived = customerPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );
      const totalReceived = downPayment + installmentPaymentsReceived;
      const remainingAmount = Math.max(0, totalCustomerPayable - totalReceived);
      const productProfit = sellingPrice - originalCost;
      const totalProfit = productProfit + markupAmount;

      return {
        ...sale,
        quantity,
        purchasePrice,
        originalCost,
        sellingPrice,
        downPayment,
        duration,
        markupPercent,
        markupAmount,
        totalCustomerPayable,
        customerPayments,
        installmentPaymentsReceived,
        totalReceived,
        remainingAmount,
        productProfit,
        totalProfit,
      };
    });

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
      description: 'Financing profit',
    },
    {
      name: 'Total Expenses',
      value: money(totalExpensesVal),
      icon: Wallet,
      tone: 'amber',
      description: 'Recorded expenses',
    },
  ];

  // CSV Export
  const handleDownloadCSV = () => {
    if (filteredSalesList.length === 0) {
      return toast.error('No transaction data found in this selected date range.');
    }

    const headers =
      'Invoice ID,Customer Name,Product,Qty,Net Price,Payment Method,Date & Time';

    const rows = filteredSalesList.map((s) => {
      const dateFormatted = new Date(s.saleDate).toLocaleString('en-PK');
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

        /* Default Screen: Hide print header */
        .index-print-header {
          display: none;
        }

        /* =====================================================
           INDEX RECORD 100% RELIABLE PRINT STYLESHEET
        ====================================================== */
        @media print {
          @page {
            size: A4 landscape;
            margin: 4mm 6mm;
          }

          /* Reset all parent container constraints so browser won't clip */
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

          /* Hide everything in body */
          body * {
            visibility: hidden !important;
          }

          /* Only show the index-record-print section */
          #index-record-print,
          #index-record-print * {
            visibility: visible !important;
          }

          #index-record-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            border: none !important;
            display: block !important;
          }

          /* Hide on-screen buttons in print */
          .index-print-controls,
          .index-print-actions,
          .no-print {
            display: none !important;
          }

          /* Display print header */
          .index-print-header {
            display: block !important;
            visibility: visible !important;
            margin-bottom: 6px !important;
            padding-bottom: 4px !important;
            border-bottom: 2px solid #000000 !important;
          }

          .index-print-header h1,
          .index-print-header p,
          .index-print-header span {
            color: #000000 !important;
            visibility: visible !important;
          }

          /* Force Table Display */
          .index-record-table {
            display: table !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            font-size: 8px !important;
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
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000000 !important;
            padding: 4px !important;
            font-weight: 900 !important;
            text-align: center !important;
            font-size: 7.5px !important;
            visibility: visible !important;
          }

          .index-record-table td {
            display: table-cell !important;
            border: 1px solid #334155 !important;
            padding: 3px 4px !important;
            color: #000000 !important;
            background: #ffffff !important;
            font-size: 8px !important;
            line-height: 1.2 !important;
            text-align: center !important;
            white-space: nowrap !important;
            visibility: visible !important;
          }

          .index-record-table td span {
            color: #000000 !important;
            visibility: visible !important;
          }

          .index-record-table td:nth-child(1),
          .index-record-table td:nth-child(4),
          .index-record-table td:nth-child(5) {
            text-align: left !important;
            white-space: normal !important;
          }

          .print-footer {
            display: block !important;
            visibility: visible !important;
            margin-top: 6px !important;
            color: #000000 !important;
          }
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
                  Sales, collections, installment financing and profitability — all in one place.
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => fetchStats(true)}
                  disabled={refreshing}
                  className="group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 transition-transform duration-500 ${
                      refreshing ? 'animate-spin text-blue-400' : 'group-hover:rotate-180'
                    }`}
                  />
                  Refresh
                </button>

                <button
                  onClick={() => setShowIndexRecord(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-500/20"
                >
                  <List className="w-3.5 h-3.5" />
                  Index Record
                </button>

                <Link
                  to="/sales/new"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  New Checkout
                </Link>

                <Link
                  to="/customers/add"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Register Customer</span>
                  <span className="sm:hidden">Customer</span>
                </Link>

                <button
                  onClick={handleDownloadCSV}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            INDEX RECORD DRAWER / SECTION
        ====================================================== */}
        {showIndexRecord && (
          <section
            id="index-record-print"
            className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden animate-[pageEnter_0.35s_cubic-bezier(0.16,1,0.3,1)]"
          >
            {/* PRINT ONLY HEADER */}
            <div className="index-print-header px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {settings?.shopName || 'Electronics Shop'}
                  </h1>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">
                    Monthly Index Record — {indexMonthLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-widest font-black text-slate-500">
                    Total Due Records
                  </p>
                  <p className="text-lg font-black text-slate-900">
                    {indexRecordRows.length}
                  </p>
                </div>
              </div>
            </div>

            {/* ON-SCREEN CONTROLS HEADER */}
            <div className="px-5 py-4.5 border-b border-slate-100 index-print-controls bg-slate-900 text-white">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-lg shadow-amber-500/20">
                    <List className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      Index Record
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Monthly installment due record
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 index-print-actions">
                  <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-3 py-1.5">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <input
                      type="month"
                      value={indexMonth}
                      onChange={(e) => setIndexMonth(e.target.value)}
                      className="bg-transparent text-xs font-black text-white outline-none cursor-pointer"
                    />
                  </div>

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
                    Month:
                  </span>
                  <span className="ml-2 text-xs font-black text-white">
                    {indexMonthLabel}
                  </span>
                </div>

                <div className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                  <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">
                    Due Records:
                  </span>
                  <span className="ml-2 text-xs font-black text-white">
                    {indexRecordRows.length}
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
                    Loading due installments for {indexMonthLabel}...
                  </p>
                </div>
              ) : indexRecordRows.length === 0 ? (
                <div className="py-16 px-5 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center">
                    <List className="w-5 h-5 text-slate-400" />
                  </div>
                  <h4 className="mt-3 text-sm font-black text-slate-700">
                    No due installments found
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    {indexRecordError ||
                      `There are no unpaid installment records for ${indexMonthLabel}.`}
                  </p>
                </div>
              ) : (
                <table className="index-record-table w-full min-w-[1300px] text-left">
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Customer Name
                      </th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Mobile Number
                      </th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                        CNIC
                      </th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Product Name
                      </th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Model
                      </th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Due Date
                      </th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">
                        Installment Price
                      </th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">
                        Previous Paid Amount
                      </th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                        Paid Installments
                      </th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                        This Installment
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {indexRecordRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3">
                          <span className="text-xs font-black text-slate-800">
                            {row.customerName}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="mobile-cell text-xs font-bold text-slate-700 whitespace-nowrap">
                            {fullDigits(row.mobile) || 'N/A'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="cnic-cell text-xs font-bold text-slate-700 whitespace-nowrap">
                            {fullDigits(row.cnic) || 'N/A'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-slate-700">
                            {row.productName}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-slate-600">
                            {row.model || 'N/A'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-blue-600 whitespace-nowrap">
                            {formatDate(row.dueDate)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-black text-indigo-600 whitespace-nowrap">
                            {money(row.installmentPrice)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-black text-emerald-600 whitespace-nowrap">
                            {money(row.previousPaidAmount)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-700 whitespace-nowrap">
                            {row.paidInstallments ??
                              Math.max(0, Number(row.installmentNumber || 1) - 1)}{' '}
                            / {row.totalInstallments}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-700 whitespace-nowrap">
                            {row.installmentNumber}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* PRINT ONLY FOOTER */}
            {indexRecordRows.length > 0 && (
              <div className="hidden print-footer px-3 py-2 border-t border-slate-300">
                <div className="flex items-center justify-between text-[8px] font-bold text-slate-600">
                  <span>Total Records: {indexRecordRows.length}</span>
                  <span>Printed: {new Date().toLocaleString('en-PK')}</span>
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
          {firstRowKpis.map((kpi) => {
            const Icon = kpi.icon;
            const tone = toneStyles[kpi.tone];

            return (
              <div
                key={kpi.name}
                className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300"
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
            KPI ROW 2
        ====================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {secondRowKpis.map((kpi) => {
            const Icon = kpi.icon;
            const tone = toneStyles[kpi.tone];

            return (
              <div
                key={kpi.name}
                className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.glow} to-transparent`}
                />

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {kpi.name}
                    </p>

                    <p className="mt-2 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight truncate text-slate-900">
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
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-400">
                  Outstanding
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

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-300">
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
        </section>

        {/* =====================================================
            PROFIT BREAKDOWN (Detailed Views)
        ====================================================== */}
        <section className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    Profit Breakdown
                  </h3>
                </div>

                <p className="text-xs text-slate-400 mt-1.5">
                  Detailed profitability across cash and installment business.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                  Net Profit
                </p>
                <p
                  className={`text-xl font-black ${
                    netProfitVal >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {money(netProfitVal)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 p-5 sm:p-6">

            {/* CASH BUSINESS */}
            <div className="rounded-2xl border border-emerald-100 overflow-hidden bg-white shadow-sm">
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
                      Cash Revenue
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
                        Cost, selling price and profit per sale.
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
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                      {detailedCashProfitList.map((sale, index) => (
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

                              <div className="flex items-start gap-2 mt-2.5">
                                <ShoppingCart className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-slate-700 break-words">
                                    {sale.product?.name || 'Deleted Product'}
                                  </p>
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

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-dashed border-slate-200">
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
                                Sold For
                              </p>
                              <p className="font-bold text-slate-800 text-[11px] mt-0.5">
                                {money(sale.sellingPrice)}
                              </p>
                            </div>

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
                  )}
                </div>
              </div>
            </div>

            {/* INSTALLMENT BUSINESS */}
            <div className="rounded-2xl border border-indigo-100 overflow-hidden bg-white shadow-sm">
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
                    {detailedInstallmentProfitList.length} Customers
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
                      Financing Markup
                    </span>
                    <span className="text-sm font-black text-indigo-600">
                      + {money(installmentMarkupProfit)}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-center gap-4">
                    <span className="text-sm font-black text-slate-900">
                      Installment Profit
                    </span>
                    <span className="text-lg font-black text-indigo-600">
                      {money(installmentProfit)}
                    </span>
                  </div>
                </div>

                {/* INSTALLMENT DETAILS */}
                <div className="mt-6 pt-5 border-t border-indigo-100">
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

                  {detailedInstallmentProfitList.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 py-8 text-center">
                      <CreditCard className="w-7 h-7 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold text-slate-400 mt-2">
                        No installment sales found.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                      {detailedInstallmentProfitList.map((sale, index) => (
                        <div
                          key={sale._id || index}
                          className="rounded-xl border border-slate-200 overflow-hidden hover:border-indigo-200 hover:shadow-sm transition"
                        >
                          {/* CUSTOMER */}
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

                          {/* DEAL */}
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
                                  Sale Price
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
                                  Markup
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

                                {/* PAYMENTS */}
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
                </div>
              </div>
            </div>

          </div>

          {/* FINAL PROFIT SUMMARY */}
          <div className="mx-5 sm:mx-6 mb-6 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50">
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
                <span className="text-xs font-semibold text-slate-500">
                  Installment Profit
                </span>
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
          </div>
        </section>

        {/* =====================================================
            LEDGERS + URGENT DUES
        ====================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEDGER */}
          <section className="xl:col-span-2 bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Transaction Ledger
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Monitor financing and cash transactions.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                  <button
                    onClick={() => setActiveTableTab(0)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      activeTableTab === 0
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Financing ({activeFinancingLedgerList.length})
                  </button>

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
                </div>
              </div>
            </div>

            {/* FINANCING TABLE */}
            {activeTableTab === 0 && (
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
                          Plan
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
                              {plan.planId}
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
            {activeTableTab === 1 && (
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
          <section className="bg-white border border-red-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
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
          </section>

        </div>

      </div>
    </>
  );
};

export default Dashboard;