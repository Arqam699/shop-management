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
    // INDEX RECORD
    // =========================================================

    const [showIndexRecord, setShowIndexRecord] = useState(false);
    const [indexRecordData, setIndexRecordData] = useState(null);
    const [indexRecordLoading, setIndexRecordLoading] = useState(false);
    const [indexRecordError, setIndexRecordError] = useState('');

    const [indexMonth, setIndexMonth] = useState(() => {
      const now = new Date();

      return `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}`;
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
          error.response?.data?.message ||
            'Unable to load the monthly index record.'
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
    // HELPERS
    // =========================================================

    const money = (value) =>
      `${settings.currency} ${Number(value || 0).toLocaleString()}`;

    const formatDate = (date) => {
      if (!date) return 'N/A';

      return new Date(date).toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    const formatDateTime = (date) => {
      if (!date) return 'N/A';

      return new Date(date).toLocaleString('en-PK', {
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

    // =========================================================
    // URGENT REMINDER
    // =========================================================

    const handleSendUrgentReminder = (inst) => {
      const phone = formatWhatsAppNumber(
        inst.installmentPlan?.customer?.mobileNumber
      );

      if (!phone) {
        return toast.error(
          'Customer phone number is missing or invalid.'
        );
      }

      const customerName =
        inst.installmentPlan?.customer?.fullName || 'Customer';

      const productName =
        inst.installmentPlan?.product?.name || 'Item';

      const dueDateFormatted = new Date(
        inst.dueDate
      ).toLocaleDateString('en-PK');

      const message = `*⚠️ URGENT INSTALLMENT REMINDER*
  ━━━━━━━━━━━━━━━━━━━━

  Assalam-o-Alaikum *${customerName}*,

  Aapko yaad dilaya jata hai ke aapki *${productName}* ki kist ki date guzar chuki hai aur abhi tak aapki payment receive nahi hui hai:

  📅 *Due Date:* ${dueDateFormatted}

  💰 *Installment Amount:* ${
        settings.currency
      } ${Number(inst.amount || 0).toLocaleString()}

  🔢 *Installment:* Month #${inst.installmentNumber}

  Meharbani farma kar apni installment *jald az jald* jama karwa dein, taake aapka payment record updated rahe aur kisi bhi mushkil se bacha sake.

  Agar aap payment already kar chuke hain to is message ko ignore karein ya payment details share kar dein.

  ━━━━━━━━━━━━━━━━━━━━
  🏪 *Dukan:* ${
        settings.shopName || 'Electronics Shop'
      }
  📞 *Phone:* ${settings.shopPhone || ''}
  ━━━━━━━━━━━━━━━━━━━━

  *Shukriya - ${
        settings.shopName || 'Electronics Shop'
      }*`;

      const encoded = encodeURIComponent(message);

      window.open(
        `https://wa.me/${phone}?text=${encoded}`,
        '_blank'
      );
    };

    // =========================================================
    // INDEX RECORD HELPERS
    // =========================================================

    const getPlanInstallments = (plan) => {
      if (!plan) return [];

      if (Array.isArray(plan.installments)) {
        return plan.installments;
      }

      if (Array.isArray(plan.paymentSchedule)) {
        return plan.paymentSchedule;
      }

      if (Array.isArray(plan.installmentSchedule)) {
        return plan.installmentSchedule;
      }

      if (Array.isArray(plan.schedule)) {
        return plan.schedule;
      }

      if (Array.isArray(plan.installmentList)) {
        return plan.installmentList;
      }

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
        installment.paidAmount ??
          installment.amountPaid ??
          installment.paid ??
          0
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

    const getPreviousPaidAmount = (
      installments,
      currentNumber,
      plan
    ) => {
      let previousPaid = 0;

      installments.forEach((item, index) => {
        const itemNumber = getInstallmentNumber(
          item,
          index
        );

        if (itemNumber < currentNumber) {
          previousPaid += getInstallmentPaidAmount(item);
        }
      });

      /*
        If down payment is not already stored as installment #1,
        include it in previous paid amount for installments after #1.
      */
      const hasFirstInstallmentAsDownPayment =
        installments.some((item, index) => {
          const number = getInstallmentNumber(
            item,
            index
          );

          return (
            number === 1 &&
            (
              item?.isDownPayment === true ||
              item?.downPayment === true ||
              item?.type === 'Down Payment'
            )
          );
        });

      if (
        currentNumber > 1 &&
        !hasFirstInstallmentAsDownPayment
      ) {
        previousPaid += Number(
          plan?.downPayment || 0
        );
      }

      return previousPaid;
    };

    // =========================================================
    // INDEX RECORD ROWS
    // =========================================================

    const fallbackIndexRecordRows = useMemo(() => {
      if (!stats) return [];

      const plans =
        stats?.installments?.activeFinancingList || [];

      const selectedPlans = Array.isArray(plans)
        ? plans
        : [];

      const rows = [];

      selectedPlans.forEach((plan) => {
        const installments =
          getPlanInstallments(plan);

        if (!installments.length) {
          return;
        }

        const totalInstallments =
          getTotalInstallments(
            plan,
            installments
          );

        installments.forEach(
          (installment, index) => {
            const dueDate =
              getInstallmentDueDate(
                installment
              );

            if (!dueDate) return;

            const date = new Date(dueDate);

            if (Number.isNaN(date.getTime())) {
              return;
            }

            const year = date.getFullYear();
            const month = String(
              date.getMonth() + 1
            ).padStart(2, '0');

            const dueMonth =
              `${year}-${month}`;

            if (dueMonth !== indexMonth) {
              return;
            }

            const installmentAmount =
              getInstallmentAmount(
                installment
              );

            const paidAmount =
              getInstallmentPaidAmount(
                installment
              );

            /*
              Fully paid installments are not included.
              Partially paid installments remain visible.
            */
            if (
              paidAmount >= installmentAmount &&
              installmentAmount > 0
            ) {
              return;
            }

            const installmentNumber =
              getInstallmentNumber(
                installment,
                index
              );

            rows.push({
              id:
                installment._id ||
                `${plan._id}-${installmentNumber}-${index}`,

              customerName:
                plan?.customer?.fullName ||
                plan?.customer?.name ||
                'N/A',

              mobile:
                getCustomerMobile(plan),

              cnic:
                getCustomerCNIC(plan),

              productName:
                plan?.product?.name ||
                plan?.productName ||
                'Item',

              model:
                plan?.product?.model ||
                plan?.product?.productModel ||
                plan?.product?.modelNumber ||
                plan?.model ||
                plan?.productModel ||
                plan?.modelNumber ||
                'N/A',

              installmentPrice:
                installmentAmount,

              previousPaidAmount:
                getPreviousPaidAmount(
                  installments,
                  installmentNumber,
                  plan
                ),

              installmentNumber,

              totalInstallments,

              dueDate,
            });
          }
        );
      });

      /*
        Sort by due date and then customer name.
      */
      rows.sort((a, b) => {
        const dateDifference =
          new Date(a.dueDate).getTime() -
          new Date(b.dueDate).getTime();

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return a.customerName.localeCompare(
          b.customerName
        );
      });

      return rows;
    }, [stats, indexMonth]);

    // Due dates live in the Installment collection, so the API result is
    // the source of truth. The fallback keeps older dashboard payloads safe.
    const indexRecordRows =
      indexRecordData?.rows || fallbackIndexRecordRows;

    // =========================================================
    // INDEX RECORD MONTH LABEL
    // =========================================================

    const indexMonthLabel = useMemo(() => {
      if (!indexMonth) return '';

      const [year, month] =
        indexMonth.split('-');

      const date = new Date(
        Number(year),
        Number(month) - 1,
        1
      );

      return date.toLocaleDateString(
        'en-PK',
        {
          month: 'long',
          year: 'numeric',
        }
      );
    }, [indexMonth]);

    // =========================================================
    // FULL DIGIT TEXT HELPERS
    // =========================================================

    /*
      Mobile/CNIC are intentionally converted to String.
      No masking or truncation is performed.
    */
    const fullDigits = (value) => {
      if (
        value === null ||
        value === undefined
      ) {
        return '';
      }

      return String(value);
    };

    /*
      CSV Excel-safe text.
      ="03123456789"
      keeps the complete value as text in Excel
      and prevents scientific notation / digit loss.
    */
    const csvTextCell = (value) => {
      const text = fullDigits(value)
        .replace(/"/g, '""');

      return `="${text}"`;
    };

    const csvNormalCell = (value) => {
      const text = String(
        value ?? ''
      ).replace(/"/g, '""');

      return `"${text}"`;
    };

    // =========================================================
    // INDEX RECORD CSV
    // =========================================================

    const handleIndexRecordCSV = () => {
      if (
        indexRecordRows.length === 0
      ) {
        return toast.error(
          `No due installments found for ${indexMonthLabel}.`
        );
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

      const rows =
        indexRecordRows.map((row) => {
          return [
            csvNormalCell(
              row.customerName
            ),

            /*
              FULL MOBILE NUMBER.
              No masking.
            */
            csvTextCell(row.mobile),

            /*
              FULL CNIC.
              No masking.
            */
            csvTextCell(row.cnic),

            csvNormalCell(
              row.productName
            ),

            csvNormalCell(
              row.model
            ),

            csvNormalCell(
              formatDate(row.dueDate)
            ),

            csvNormalCell(
              `${settings.currency} ${Number(
                row.installmentPrice || 0
              ).toLocaleString()}`
            ),

            csvNormalCell(
              `${settings.currency} ${Number(
                row.previousPaidAmount || 0
              ).toLocaleString()}`
            ),

            csvNormalCell(
              `${row.paidInstallments ?? Math.max(0, Number(row.installmentNumber || 1) - 1)} / ${
                row.totalInstallments
              }`
            ),

            csvNormalCell(
              row.installmentNumber
            ),
          ].join(',');
        });

      /*
        UTF-8 BOM helps Excel open the file correctly.
      */
      const csvContent =
        '\uFEFF' +
        [
          headers
            .map((header) =>
              csvNormalCell(header)
            )
            .join(','),
          ...rows,
        ].join('\r\n');

      const blob = new Blob(
        [csvContent],
        {
          type:
            'text/csv;charset=utf-8;',
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      link.href = url;

      link.download =
        `Index_Record_${indexMonth}.csv`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      toast.success(
        'Index Record CSV exported successfully.'
      );
    };

    // =========================================================
    // INDEX RECORD PRINT
    // =========================================================

    const handleIndexRecordPrint = () => {
      if (
        indexRecordRows.length === 0
      ) {
        return toast.error(
          `No due installments found for ${indexMonthLabel}.`
        );
      }

      window.print();
    };

    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {
      return (
        <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center px-4">
          <div className="text-center">
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 rounded-2xl bg-slate-900 animate-pulse" />
              <div className="absolute inset-2 rounded-xl bg-white flex items-center justify-center">
                <Activity className="w-5 h-5 text-slate-900 animate-pulse" />
              </div>
            </div>

            <h3 className="mt-5 text-sm font-black text-slate-900">
              Loading Dashboard
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Preparing your business overview...
            </p>
          </div>
        </div>
      );
    }

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
        const startOfMonth =
          new Date(
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
        const start =
          new Date(customStartDate);

        start.setHours(0, 0, 0, 0);

        const end =
          new Date(customEndDate);

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

    // =========================================================
    // FILTERED DATA
    // =========================================================

    const filteredSalesList = (
      stats?.sales?.salesList || []
    ).filter((s) =>
      isDateInFilter(s.saleDate)
    );

    const filteredFinancingList = (
      stats?.installments
        ?.activeFinancingList || []
    ).filter((p) =>
      isDateInFilter(p.createdAt)
    );

    const filteredPaymentsList = (
      stats?.installments
        ?.paymentsList || []
    ).filter((pay) =>
      isDateInFilter(pay.paymentDate)
    );

    const filteredExpensesList = (
      stats?.expenses?.expensesList || []
    ).filter((e) =>
      isDateInFilter(e.expenseDate)
    );

    // =========================================================
    // CASH / INSTALLMENT
    // =========================================================

    const cashSalesList =
      filteredSalesList.filter(
        (s) => s.paymentType === 'Cash'
      );

    const installmentSalesList =
      filteredSalesList.filter(
        (s) =>
          s.paymentType === 'Installment'
      );

    // =========================================================
    // REVENUE
    // =========================================================

    const totalRevenue =
      filteredSalesList.reduce(
        (sum, s) =>
          sum +
          Number(s.finalTotal || 0),
        0
      );

    const cashRevenue =
      cashSalesList.reduce(
        (sum, s) =>
          sum +
          Number(s.finalTotal || 0),
        0
      );

    // =========================================================
    // CASH PROFIT
    // =========================================================

    const cashCost =
      cashSalesList.reduce(
        (sum, s) =>
          sum +
          Number(s.quantity || 0) *
            Number(
              s.product?.purchasePrice ||
                0
            ),
        0
      );

    const cashProfit =
      cashRevenue - cashCost;

    // =========================================================
    // INSTALLMENT PROFIT
    // =========================================================

    const installmentRevenue =
      installmentSalesList.reduce(
        (sum, s) =>
          sum +
          Number(s.finalTotal || 0),
        0
      );

    const installmentCost =
      installmentSalesList.reduce(
        (sum, s) =>
          sum +
          Number(s.quantity || 0) *
            Number(
              s.product?.purchasePrice ||
                0
            ),
        0
      );

    const installmentMarkupProfit =
      installmentSalesList.reduce(
        (sum, s) => {
          const finalTotal =
            Number(
              s.finalTotal || 0
            );

          const downPayment =
            Number(
              s.downPayment || 0
            );

          const duration =
            Number(
              s.installmentDuration ||
                0
            );

          let markupPercent = 0;

          if (duration === 3) {
            markupPercent = 15;
          } else if (
            duration === 6
          ) {
            markupPercent = 25;
          } else if (
            duration === 12
          ) {
            markupPercent = 50;
          } else if (
            duration <= 3
          ) {
            markupPercent = 15;
          } else if (
            duration <= 6
          ) {
            markupPercent = 25;
          } else {
            markupPercent = 50;
          }

          const remainingPrincipal =
            Math.max(
              0,
              finalTotal -
                downPayment
            );

          const markupAmount =
            Math.round(
              remainingPrincipal *
                (markupPercent /
                  100)
            );

          return (
            sum + markupAmount
          );
        },
        0
      );

    const installmentProductProfit =
      installmentRevenue -
      installmentCost;

    const installmentProfit =
      installmentProductProfit +
      installmentMarkupProfit;

    // =========================================================
    // INSTALLMENT PAYMENTS
    // =========================================================

    const installmentDownPayments =
      installmentSalesList.reduce(
        (sum, s) =>
          sum +
          Number(
            s.downPayment || 0
          ),
        0
      );

    const installmentPayments =
      filteredPaymentsList.reduce(
        (sum, pay) =>
          sum +
          Number(pay.amount || 0),
        0
      );

    const totalInstallmentPaymentsReceived =
      installmentDownPayments +
      installmentPayments;

    // =========================================================
    // TOTALS
    // =========================================================

    const totalCollected =
      cashRevenue +
      totalInstallmentPaymentsReceived;

    const totalOutstanding =
      filteredFinancingList.reduce(
        (sum, p) =>
          sum +
          Number(
            p.remainingBalance || 0
          ),
        0
      );

    const grossProfit =
      cashProfit +
      installmentProfit;

    const totalExpensesVal =
      filteredExpensesList.reduce(
        (sum, e) =>
          sum +
          Number(e.amount || 0),
        0
      );

    const netProfitVal =
      grossProfit -
      totalExpensesVal;

    // =========================================================
    // SEARCH
    // =========================================================

    const searchFilter = (item) => {
      if (!globalSearch) return true;

      const term =
        globalSearch
          .toLowerCase()
          .trim();

      const custName =
        item.customer?.fullName?.toLowerCase() ||
        '';

      const custPhone =
        item.customer?.mobileNumber || '';

      const id = (
        item.saleId ||
        item.planId ||
        ''
      ).toLowerCase();

      const prodName =
        item.product?.name?.toLowerCase() ||
        '';

      return (
        custName.includes(term) ||
        custPhone.includes(term) ||
        id.includes(term) ||
        prodName.includes(term)
      );
    };

    // =========================================================
    // TABLE DATA
    // =========================================================

    const cashSales =
      cashSalesList.filter((s) =>
        searchFilter(s)
      );

    const activeFinancingLedgerList =
      filteredFinancingList.filter(
        (p) => searchFilter(p)
      );

    // =========================================================
    // DETAILED CASH PROFIT
    // =========================================================

    const detailedCashProfitList =
      cashSalesList
        .filter((s) =>
          searchFilter(s)
        )
        .map((sale) => {
          const quantity =
            Number(
              sale.quantity || 0
            );

          const purchasePrice =
            Number(
              sale.product
                ?.purchasePrice || 0
            );

          const originalCost =
            quantity *
            purchasePrice;

          const sellingPrice =
            Number(
              sale.finalTotal || 0
            );

          const profit =
            sellingPrice -
            originalCost;

          return {
            ...sale,
            quantity,
            purchasePrice,
            originalCost,
            sellingPrice,
            profit,
          };
        });

    // =========================================================
    // DETAILED INSTALLMENT PROFIT
    // =========================================================

    const detailedInstallmentProfitList =
      installmentSalesList
        .filter((s) =>
          searchFilter(s)
        )
        .map((sale) => {
          const quantity =
            Number(
              sale.quantity || 0
            );

          const purchasePrice =
            Number(
              sale.product
                ?.purchasePrice || 0
            );

          const originalCost =
            quantity *
            purchasePrice;

          const sellingPrice =
            Number(
              sale.finalTotal || 0
            );

          const downPayment =
            Number(
              sale.downPayment || 0
            );

          const duration =
            Number(
              sale.installmentDuration ||
                0
            );

          let markupPercent = 0;

          if (duration === 3) {
            markupPercent = 15;
          } else if (
            duration === 6
          ) {
            markupPercent = 25;
          } else if (
            duration === 12
          ) {
            markupPercent = 50;
          } else if (
            duration <= 3
          ) {
            markupPercent = 15;
          } else if (
            duration <= 6
          ) {
            markupPercent = 25;
          } else {
            markupPercent = 50;
          }

          const remainingPrincipal =
            Math.max(
              0,
              sellingPrice -
                downPayment
            );

          const markupAmount =
            Math.round(
              remainingPrincipal *
                (markupPercent /
                  100)
            );

          const totalCustomerPayable =
            sellingPrice +
            markupAmount;

          const customerPayments =
            filteredPaymentsList.filter(
              (payment) => {
                const paymentSaleId =
                  payment.sale?._id ||
                  payment.sale;

                return (
                  paymentSaleId &&
                  sale._id &&
                  String(
                    paymentSaleId
                  ) ===
                    String(sale._id)
                );
              }
            );

          const installmentPaymentsReceived =
            customerPayments.reduce(
              (sum, payment) =>
                sum +
                Number(
                  payment.amount || 0
                ),
              0
            );

          const totalReceived =
            downPayment +
            installmentPaymentsReceived;

          const remainingAmount =
            Math.max(
              0,
              totalCustomerPayable -
                totalReceived
            );

          const productProfit =
            sellingPrice -
            originalCost;

          const totalProfit =
            productProfit +
            markupAmount;

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

    // =========================================================
    // KPI DATA
    // =========================================================

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
        value: money(
          totalInstallmentPaymentsReceived
        ),
        icon: CreditCard,
        tone: 'violet',
        description:
          'Down payments + installments',
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
        value: money(
          installmentProfit
        ),
        icon: Layers,
        tone: 'indigo',
        description: 'Financing profit',
      },
      {
        name: 'Total Expenses',
        value: money(
          totalExpensesVal
        ),
        icon: Wallet,
        tone: 'amber',
        description:
          'Recorded expenses',
      },
    ];

    // =========================================================
    // CSV EXPORT
    // =========================================================

    const handleDownloadCSV = () => {
      if (
        filteredSalesList.length ===
        0
      ) {
        return toast.error(
          'No transaction data found in this selected date range.'
        );
      }

      const headers =
        'Invoice ID,Customer Name,Product,Qty,Net Price,Payment Method,Date & Time';

      const rows =
        filteredSalesList.map((s) => {
          const dateFormatted =
            new Date(
              s.saleDate
            ).toLocaleString(
              'en-PK'
            );

          return `"${s.saleId || ''}","${
            s.customer?.fullName ||
            'Walk-in'
          }","${
            s.product?.name ||
            'Deleted Product'
          }",${s.quantity || 0},${
            s.finalTotal || 0
          },"${
            s.paymentType || ''
          }","${dateFormatted}"`;
        });

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          headers,
          ...rows,
        ].join('\n');

      const encodedUri =
        encodeURI(csvContent);

      const link =
        document.createElement('a');

      link.setAttribute(
        'href',
        encodedUri
      );

      link.setAttribute(
        'download',
        `Dukan_Ledger_Report_${filterPreset}_${new Date()
          .toISOString()
          .split('T')[0]}.csv`
      );

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      toast.success(
        'Report exported successfully.'
      );
    };

    // =========================================================
    // STYLE HELPERS
    // =========================================================

    const toneStyles = {
      blue: {
        icon: 'bg-blue-50 text-blue-600 border-blue-100',
        glow: 'from-blue-500/10',
      },
      emerald: {
        icon: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        glow: 'from-emerald-500/10',
      },
      violet: {
        icon: 'bg-violet-50 text-violet-600 border-violet-100',
        glow: 'from-violet-500/10',
      },
      green: {
        icon: 'bg-green-50 text-green-600 border-green-100',
        glow: 'from-green-500/10',
      },
      indigo: {
        icon: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        glow: 'from-indigo-500/10',
      },
      amber: {
        icon: 'bg-amber-50 text-amber-600 border-amber-100',
        glow: 'from-amber-500/10',
      },
    };

    const filterOptions = [
      {
        id: 'today',
        label: 'Today',
      },
      {
        id: 'yesterday',
        label: 'Yesterday',
      },
      {
        id: 'dayBeforeYesterday',
        label: 'Day Before Yesterday',
      },
      {
        id: 'week',
        label: '7 Days',
      },
      {
        id: 'month',
        label: 'This Month',
      },
      {
        id: 'all',
        label: 'All Time',
      },
      {
        id: 'custom',
        label: 'Custom',
      },
    ];

    // =========================================================
    // UI
    // =========================================================

    return (
      <>
        <style>
          {`
            @media print {
              @page {
                size: A4 landscape;
                margin: 3mm;
              }

              body {
                background: #ffffff !important;
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
                right: 0 !important;
                top: 0 !important;
                width: 216mm !important;
                max-width: none !important;
                margin: 0 auto !important;
                padding: 0 !important;
                background: white !important;
                box-shadow: none !important;
                border: none !important;
              }

              /* Print only the actual record table, without dashboard UI. */
              .index-print-header,
              .index-print-controls {
                display: none !important;
              }

              #index-record-print .overflow-x-auto {
                overflow: visible !important;
              }

              #index-record-print .print\\:block {
                display: none !important;
              }

              .index-record-table {
                /* Keep the record compact and centered instead of stretching
                   mostly-empty columns across the entire printed page. */
                width: 216mm !important;
                min-width: 0 !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
                font-size: 6.5px !important;
                margin-left: auto !important;
                margin-right: auto !important;
              }

              .index-record-table col:nth-child(1) { width: 23mm !important; }
              .index-record-table col:nth-child(2) { width: 21mm !important; }
              .index-record-table col:nth-child(3) { width: 24mm !important; }
              .index-record-table col:nth-child(4) { width: 35mm !important; }
              .index-record-table col:nth-child(5) { width: 18mm !important; }
              .index-record-table col:nth-child(6) { width: 17mm !important; }
              .index-record-table col:nth-child(7) { width: 20mm !important; }
              .index-record-table col:nth-child(8) { width: 22mm !important; }
              .index-record-table col:nth-child(9) { width: 20mm !important; }
              .index-record-table col:nth-child(10) { width: 16mm !important; }
              }

              /* Show column headings only on the first printed page. */
              .index-record-table thead {
                display: table-row-group !important;
              }

              .index-record-table tr {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              .index-record-table th,
              .index-record-table td {
                border: 1px solid #cbd5e1 !important;
                padding: 1.5px 2px !important;
                color: #0f172a !important;
                background: white !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: clip !important;
                line-height: 1.1 !important;
                vertical-align: middle !important;
                text-align: center !important;
              }

              .index-record-table td:nth-child(1),
              .index-record-table td:nth-child(4),
              .index-record-table td:nth-child(5) {
                white-space: normal !important;
                overflow-wrap: anywhere !important;
              }

              .index-record-table th {
                background: #f1f5f9 !important;
                font-weight: 900 !important;
                text-align: center !important;
                font-size: 5.8px !important;
              }

              .index-record-table .mobile-cell,
              .index-record-table .cnic-cell {
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: clip !important;
                font-family: Arial, sans-serif !important;
                font-size: 6px !important;
                letter-spacing: -0.15px !important;
              }

              .index-record-table span {
                font-size: 6.5px !important;
                line-height: 1.1 !important;
              }

              .index-print-header h1 {
                font-size: 11px !important;
                line-height: 1.1 !important;
              }

              .index-print-header p {
                font-size: 6.5px !important;
                line-height: 1.1 !important;
              }

              #index-record-print {
                left: 0 !important;
                right: 0 !important;
                margin-left: auto !important;
                margin-right: auto !important;
              }
            }

            .index-print-header {
              display: none;
            }
          `}
        </style>

        <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
          <div className="max-w-[1500px] mx-auto px-3 sm:px-5 lg:px-7 py-4 sm:py-6 space-y-5">

            {/* =====================================================
                PREMIUM HEADER
            ====================================================== */}

            <section className="relative overflow-hidden rounded-[24px] bg-slate-950 border border-slate-800 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.55)]">

              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />
                <div className="absolute -bottom-32 left-1/3 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
              </div>

              <div className="relative p-5 sm:p-7">

                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

                  <div className="min-w-0">

                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                        <Activity className="w-3 h-3" />
                        Business Overview
                      </span>

                      <span className="hidden sm:inline text-[10px] text-slate-500">
                        •
                      </span>

                      <span className="hidden sm:inline text-[10px] font-semibold text-slate-500">
                        {filterPreset === 'today'
                          ? 'Today'
                          : filterPreset === 'yesterday'
                          ? 'Yesterday'
                          : filterPreset ===
                            'dayBeforeYesterday'
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

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                      {settings?.shopName ||
                        'Electronics Shop'}
                    </h1>

                    <p className="mt-2 text-sm text-slate-400 max-w-2xl">
                      Sales, collections, installment financing and
                      profitability — all in one place.
                    </p>

                  </div>

                  <div className="flex flex-wrap gap-2.5">

                    <button
                      onClick={() =>
                        fetchStats(true)
                      }
                      disabled={refreshing}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-black transition disabled:opacity-60"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          refreshing
                            ? 'animate-spin'
                            : ''
                        }`}
                      />
                      Refresh
                    </button>

                    <button
                      onClick={() =>
                        setShowIndexRecord(
                          true
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-lg shadow-amber-500/10"
                    >
                      <List className="w-4 h-4" />
                      Index Record
                    </button>

                    <Link
                      to="/sales/new"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 text-xs font-black transition shadow-lg shadow-black/10"
                    >
                      <PlusCircle className="w-4 h-4" />
                      New Checkout
                    </Link>

                    <Link
                      to="/customers/add"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition"
                    >
                      <Users className="w-4 h-4" />

                      <span className="hidden sm:inline">
                        Register Customer
                      </span>

                      <span className="sm:hidden">
                        Customer
                      </span>
                    </Link>

                    <button
                      onClick={
                        handleDownloadCSV
                      }
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black transition"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export
                    </button>

                  </div>

                </div>
              </div>
            </section>

            {/* =====================================================
                INDEX RECORD
            ====================================================== */}

            {showIndexRecord && (
              <section
                id="index-record-print"
                className="bg-white rounded-[22px] border border-slate-200 shadow-sm overflow-hidden"
              >

                {/* PRINT HEADER */}

                <div className="index-print-header px-4 py-3 border-b border-slate-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-black text-slate-900">
                        {settings?.shopName ||
                          'Electronics Shop'}
                      </h1>

                      <p className="text-xs font-bold text-slate-600 mt-1">
                        Monthly Index Record —{' '}
                        {indexMonthLabel}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                        Total Due Records
                      </p>

                      <p className="text-lg font-black text-slate-900">
                        {
                          indexRecordRows.length
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* INDEX HEADER */}

                <div className="px-4 sm:px-5 py-4 border-b border-slate-100 index-print-controls">

                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                    <div className="flex items-center gap-3">

                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                        <List className="w-5 h-5" />
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-slate-900">
                          Index Record
                        </h3>

                        <p className="text-[10px] text-slate-400 mt-1">
                          Monthly installment due record
                        </p>
                      </div>

                    </div>

                    <div className="flex flex-wrap items-center gap-2 index-print-actions">

                      <div className="flex items-center gap-2">

                        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                        </div>

                        <input
                          type="month"
                          value={indexMonth}
                          onChange={(e) =>
                            setIndexMonth(
                              e.target.value
                            )
                          }
                          className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                        />

                      </div>

                      <button
                        onClick={
                          handleIndexRecordCSV
                        }
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition"
                      >
                        <Download className="w-4 h-4" />
                        CSV
                      </button>

                      <button
                        onClick={
                          handleIndexRecordPrint
                        }
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </button>

                      <button
                        onClick={() =>
                          setShowIndexRecord(
                            false
                          )
                        }
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                        title="Close Index Record"
                      >
                        <X className="w-4 h-4" />
                      </button>

                    </div>

                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">

                    <div className="px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100">
                      <span className="text-[9px] uppercase tracking-wider font-black text-indigo-500">
                        Month
                      </span>

                      <span className="ml-2 text-xs font-black text-indigo-700">
                        {indexMonthLabel}
                      </span>
                    </div>

                    <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">
                        Due Records
                      </span>

                      <span className="ml-2 text-xs font-black text-slate-900">
                        {
                          indexRecordRows.length
                        }
                      </span>
                    </div>

                  </div>

                </div>

                {/* INDEX TABLE */}

                <div className="w-full overflow-x-auto">

                  {indexRecordLoading ? (
                    <div className="py-16 px-5 text-center">
                      <div className="w-7 h-7 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="mt-3 text-[11px] font-bold text-slate-500">
                        Loading due installments for {indexMonthLabel}...
                      </p>
                    </div>
                  ) : indexRecordRows.length === 0 ? (
                    <div className="py-16 px-5 text-center">

                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 mx-auto flex items-center justify-center">
                        <List className="w-6 h-6 text-slate-300" />
                      </div>

                      <h4 className="mt-4 text-sm font-black text-slate-700">
                        No due installments found
                      </h4>

                      <p className="mt-1 text-[11px] text-slate-400">
                        {indexRecordError ||
                          `There are no unpaid installment records for ${indexMonthLabel}.`}
                      </p>

                    </div>
                  ) : (
                    <table className="index-record-table w-full min-w-[1300px] table-fixed text-left">

                      <colgroup>
                        <col className="w-[11%]" />
                        <col className="w-[10%]" />
                        <col className="w-[11%]" />
                        <col className="w-[15%]" />
                        <col className="w-[8%]" />
                        <col className="w-[8%]" />
                        <col className="w-[9%]" />
                        <col className="w-[10%]" />
                        <col className="w-[10%]" />
                        <col className="w-[8%]" />
                      </colgroup>

                      <thead className="bg-slate-50 border-y border-slate-200">

                        <tr>

                          <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            Customer Name
                          </th>

                          <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            Mobile Number
                          </th>

                          <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            CNIC
                          </th>

                          <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            Product Name
                          </th>

                          <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            Model
                          </th>

                          <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            Due Date
                          </th>

                          <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            Installment Price
                          </th>

                          <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            Previous Paid Amount
                          </th>

                          <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500 text-center">
                            Paid Installments
                          </th>

                          <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500 text-center">
                            This Installment
                          </th>

                        </tr>

                      </thead>

                      <tbody className="divide-y divide-slate-100">

                        {indexRecordRows.map(
                          (row) => (
                            <tr
                              key={row.id}
                              className="hover:bg-slate-50/70 transition"
                            >

                              <td className="px-4 py-3">
                                <span className="text-[11px] font-black text-slate-800">
                                  {
                                    row.customerName
                                  }
                                </span>
                              </td>

                              {/* FULL MOBILE */}

                              <td className="px-4 py-3">
                                <span className="mobile-cell text-[11px] font-bold text-slate-700 whitespace-nowrap">
                                  {fullDigits(
                                    row.mobile
                                  ) || 'N/A'}
                                </span>
                              </td>

                              {/* FULL CNIC */}

                              <td className="px-4 py-3">
                                <span className="cnic-cell text-[11px] font-bold text-slate-700 whitespace-nowrap">
                                  {fullDigits(
                                    row.cnic
                                  ) || 'N/A'}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <span className="text-[11px] font-bold text-slate-700">
                                  {
                                    row.productName
                                  }
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <span className="text-[11px] font-semibold text-slate-600">
                                  {row.model ||
                                    'N/A'}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">
                                  {formatDate(
                                    row.dueDate
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <span className="text-[11px] font-black text-indigo-600 whitespace-nowrap">
                                  {money(
                                    row.installmentPrice
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <span className="text-[11px] font-black text-emerald-600 whitespace-nowrap">
                                  {money(
                                    row.previousPaidAmount
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-700 whitespace-nowrap">
                                  {
                                    row.paidInstallments ??
                                      Math.max(
                                        0,
                                        Number(
                                          row.installmentNumber ||
                                            1
                                        ) - 1
                                      )
                                  }{' '}
                                  /{' '}
                                  {
                                    row.totalInstallments
                                  }
                                </span>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-700 whitespace-nowrap">
                                  {row.installmentNumber}
                                </span>
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>
                  )}

                </div>

                {/* PRINT FOOTER */}

                {indexRecordRows.length >
                  0 && (
                  <div className="hidden print:block px-2 py-2 border-t border-slate-300">

                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-500">
                      <span>
                        Total Records:{' '}
                        {
                          indexRecordRows.length
                        }
                      </span>

                      <span>
                        Printed:{' '}
                        {new Date().toLocaleString(
                          'en-PK'
                        )}
                      </span>
                    </div>

                  </div>
                )}

              </section>
            )}

            {/* =====================================================
                SEARCH + FILTER TOOLBAR
            ====================================================== */}

            <section className="bg-white rounded-[22px] border border-slate-200 shadow-sm p-3 sm:p-4">

              <div className="flex flex-col xl:flex-row xl:items-center gap-3">

                <div className="relative flex-1 min-w-0">

                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Search customer, phone, invoice, plan or product..."
                    value={globalSearch}
                    onChange={(e) =>
                      setGlobalSearch(
                        e.target.value
                      )
                    }
                    className="w-full h-11 sm:h-12 rounded-xl bg-slate-50 border border-slate-200 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                  />

                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200">

                  {filterOptions.map(
                    (preset) => (
                      <button
                        key={preset.id}
                        onClick={() =>
                          setFilterPreset(
                            preset.id
                          )
                        }
                        className={`px-3 sm:px-4 py-2 rounded-lg text-[11px] sm:text-xs font-black transition ${
                          filterPreset ===
                          preset.id
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  )}

                </div>

              </div>

              {filterPreset ===
                'custom' && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2">

                  <div className="flex items-center gap-2">

                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                    </div>

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
                      className="h-10 border border-slate-200 rounded-lg px-3 text-xs font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                    />

                  </div>

                  <span className="text-xs font-bold text-slate-400 px-1">
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
                    className="h-10 border border-slate-200 rounded-lg px-3 text-xs font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                  />

                </div>
              )}

            </section>

            {/* =====================================================
                KPI ROW
            ====================================================== */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

              {firstRowKpis.map(
                (kpi) => {
                  const Icon =
                    kpi.icon;

                  const tone =
                    toneStyles[
                      kpi.tone
                    ];

                  return (
                    <div
                      key={kpi.name}
                      className="group relative overflow-hidden bg-white rounded-[20px] border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                    >

                      <div
                        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.glow} to-transparent`}
                      />

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                            {kpi.name}
                          </p>

                          <p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-slate-900 truncate">
                            {kpi.value}
                          </p>

                          <p className="mt-1 text-[11px] font-medium text-slate-400">
                            {
                              kpi.description
                            }
                          </p>

                        </div>

                        <div
                          className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${tone.icon}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

              {secondRowKpis.map(
                (kpi) => {
                  const Icon =
                    kpi.icon;

                  const tone =
                    toneStyles[
                      kpi.tone
                    ];

                  return (
                    <div
                      key={kpi.name}
                      className="group relative overflow-hidden bg-white rounded-[20px] border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                    >

                      <div
                        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.glow} to-transparent`}
                      />

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                            {kpi.name}
                          </p>

                          <p className="mt-2 text-xl sm:text-2xl font-black tracking-tight truncate text-slate-900">
                            {kpi.value}
                          </p>

                          <p className="mt-1 text-[11px] font-medium text-slate-400">
                            {
                              kpi.description
                            }
                          </p>

                        </div>

                        <div
                          className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${tone.icon}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

            {/* =====================================================
                QUICK FINANCIAL SUMMARY
            ====================================================== */}

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="bg-slate-900 rounded-[20px] p-5 text-white shadow-sm">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-400">
                      Total Collected
                    </p>

                    <p className="mt-2 text-2xl font-black tracking-tight">
                      {money(
                        totalCollected
                      )}
                    </p>
                  </div>

                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                    <CircleDollarSign className="w-5 h-5 text-white" />
                  </div>

                </div>

                <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  Cash + installment collections
                </div>

              </div>

              <div className="bg-white rounded-[20px] border border-slate-200 p-5 shadow-sm">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-400">
                      Outstanding
                    </p>

                    <p className="mt-2 text-2xl font-black tracking-tight text-red-600">
                      {money(
                        totalOutstanding
                      )}
                    </p>
                  </div>

                  <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-red-600" />
                  </div>

                </div>

                <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                  Remaining customer balances
                </div>

              </div>

              <div className="bg-white rounded-[20px] border border-slate-200 p-5 shadow-sm">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-400">
                      Net Profit
                    </p>

                    <p
                      className={`mt-2 text-2xl font-black tracking-tight ${
                        netProfitVal >=
                        0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {money(
                        netProfitVal
                      )}
                    </p>
                  </div>

                  <div
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                      netProfitVal >=
                      0
                        ? 'bg-emerald-50 border-emerald-100'
                        : 'bg-red-50 border-red-100'
                    }`}
                  >
                    <TrendingUp
                      className={`w-5 h-5 ${
                        netProfitVal >=
                        0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    />
                  </div>

                </div>

                <div className="mt-4 text-[11px] font-semibold text-slate-400">
                  Gross profit after expenses
                </div>

              </div>

            </section>

            {/* =====================================================
                PROFIT BREAKDOWN
            ====================================================== */}

            <section className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden">

              <div className="px-5 sm:px-6 py-5 border-b border-slate-100">

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                  <div>

                    <div className="flex items-center gap-2">

                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>

                      <h3 className="text-lg font-black text-slate-900">
                        Profit Breakdown
                      </h3>

                    </div>

                    <p className="text-xs text-slate-500 mt-2">
                      Detailed profitability across cash and installment
                      business.
                    </p>

                  </div>

                  <div className="text-left sm:text-right">

                    <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                      Net Profit
                    </p>

                    <p
                      className={`text-xl font-black ${
                        netProfitVal >=
                        0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {money(
                        netProfitVal
                      )}
                    </p>

                  </div>

                </div>

              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 p-5 sm:p-6">

                {/* CASH BUSINESS */}

                <div className="rounded-[20px] border border-emerald-100 overflow-hidden bg-white">

                  <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100">

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
                        {
                          cashSalesList.length
                        }{' '}
                        Sales
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
                          {money(
                            cashRevenue
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-4">
                        <span className="text-xs font-semibold text-slate-500">
                          Product Cost
                        </span>

                        <span className="text-sm font-black text-red-600">
                          -{' '}
                          {money(
                            cashCost
                          )}
                        </span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-center gap-4">

                        <span className="text-sm font-black text-slate-900">
                          Cash Profit
                        </span>

                        <span className="text-lg font-black text-emerald-600">
                          {money(
                            cashProfit
                          )}
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

                          <p className="text-[10px] text-slate-400 mt-1">
                            Cost, selling price and profit per sale.
                          </p>
                        </div>

                        <Receipt className="w-4 h-4 text-emerald-500" />

                      </div>

                      {detailedCashProfitList.length ===
                      0 ? (
                        <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 py-8 text-center">

                          <ShoppingCart className="w-7 h-7 mx-auto text-slate-300" />

                          <p className="text-xs font-semibold text-slate-400 mt-2">
                            No cash sales found.
                          </p>

                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">

                          {detailedCashProfitList.map(
                            (
                              sale,
                              index
                            ) => (
                              <div
                                key={
                                  sale._id ||
                                  index
                                }
                                className="group rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:bg-white hover:border-emerald-200 hover:shadow-sm transition"
                              >

                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                                  <div className="min-w-0">

                                    <div className="flex items-center gap-2">

                                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                        <Users className="w-3.5 h-3.5 text-slate-500" />
                                      </div>

                                      <span className="font-black text-sm text-slate-900 truncate">
                                        {sale
                                          .customer
                                          ?.fullName ||
                                          'Walk-in Customer'}
                                      </span>

                                    </div>

                                    <div className="flex items-start gap-2 mt-3">

                                      <ShoppingCart className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />

                                      <div className="min-w-0">

                                        <p className="font-bold text-xs text-slate-700 break-words">
                                          {sale
                                            .product
                                            ?.name ||
                                            'Deleted Product'}
                                        </p>

                                        <p className="text-[10px] text-slate-400 mt-1">
                                          Qty{' '}
                                          {
                                            sale.quantity
                                          }

                                          <span className="mx-1">
                                            •
                                          </span>

                                          Invoice{' '}
                                          {
                                            sale.saleId ||
                                            '-'
                                          }
                                        </p>

                                      </div>

                                    </div>

                                  </div>

                                  <div className="sm:text-right shrink-0">

                                    <p className="text-[9px] uppercase tracking-wider font-black text-slate-400">
                                      Profit
                                    </p>

                                    <p className="text-base font-black text-emerald-600 mt-0.5">
                                      {money(
                                        sale.profit
                                      )}
                                    </p>

                                  </div>

                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-dashed border-slate-200">

                                  <div>
                                    <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                      Cost
                                    </p>

                                    <p className="font-bold text-red-600 text-[11px] mt-1">
                                      {money(
                                        sale.originalCost
                                      )}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                      Sold For
                                    </p>

                                    <p className="font-bold text-slate-800 text-[11px] mt-1">
                                      {money(
                                        sale.sellingPrice
                                      )}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                      Unit Cost
                                    </p>

                                    <p className="font-bold text-slate-700 text-[11px] mt-1">
                                      {money(
                                        sale.purchasePrice
                                      )}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                      Date
                                    </p>

                                    <p className="font-bold text-slate-700 text-[11px] mt-1">
                                      {formatDate(
                                        sale.saleDate
                                      )}
                                    </p>
                                  </div>

                                </div>

                              </div>
                            )
                          )}

                        </div>
                      )}

                    </div>

                  </div>
                </div>

                {/* INSTALLMENT BUSINESS */}

                <div className="rounded-[20px] border border-indigo-100 overflow-hidden bg-white">

                  <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">

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
                        {
                          detailedInstallmentProfitList.length
                        }{' '}
                        Customers
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
                          {money(
                            installmentRevenue
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-4">
                        <span className="text-xs font-semibold text-slate-500">
                          Product Cost
                        </span>

                        <span className="text-sm font-black text-red-600">
                          -{' '}
                          {money(
                            installmentCost
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-4">
                        <span className="text-xs font-semibold text-slate-500">
                          Financing Markup
                        </span>

                        <span className="text-sm font-black text-indigo-600">
                          +{' '}
                          {money(
                            installmentMarkupProfit
                          )}
                        </span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-center gap-4">

                        <span className="text-sm font-black text-slate-900">
                          Installment Profit
                        </span>

                        <span className="text-lg font-black text-indigo-600">
                          {money(
                            installmentProfit
                          )}
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

                          <p className="text-[10px] text-slate-400 mt-1">
                            Customer-wise financing activity.
                          </p>
                        </div>

                        <Layers className="w-4 h-4 text-indigo-500" />

                      </div>

                      {detailedInstallmentProfitList.length ===
                      0 ? (
                        <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 py-8 text-center">

                          <CreditCard className="w-7 h-7 mx-auto text-slate-300" />

                          <p className="text-xs font-semibold text-slate-400 mt-2">
                            No installment sales found.
                          </p>

                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">

                          {detailedInstallmentProfitList.map(
                            (
                              sale,
                              index
                            ) => (
                              <div
                                key={
                                  sale._id ||
                                  index
                                }
                                className="rounded-xl border border-slate-200 overflow-hidden hover:border-indigo-200 hover:shadow-sm transition"
                              >

                                {/* CUSTOMER */}

                                <div className="p-4 bg-indigo-50/40 border-b border-indigo-100">

                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                                    <div className="min-w-0">

                                      <div className="flex items-center gap-2">

                                        <div className="w-7 h-7 rounded-lg bg-white border border-indigo-100 flex items-center justify-center shrink-0">
                                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                                        </div>

                                        <h6 className="font-black text-sm text-slate-900 truncate">
                                          {sale
                                            .customer
                                            ?.fullName ||
                                            'Customer'}
                                        </h6>

                                      </div>

                                      <div className="mt-2 space-y-0.5 pl-9">

                                        <p className="text-[10px] text-slate-500">
                                          Mob:{' '}
                                          {sale
                                            .customer
                                            ?.mobileNumber ||
                                            'N/A'}
                                        </p>

                                        <p className="text-[10px] text-slate-500 truncate">
                                          Product:{' '}
                                          {sale
                                            .product
                                            ?.name ||
                                            'Item'}
                                        </p>

                                      </div>

                                    </div>

                                    <div className="sm:text-right">

                                      <p className="text-[9px] uppercase tracking-wider font-black text-slate-400">
                                        Total Profit
                                      </p>

                                      <p className="text-base font-black text-indigo-600 mt-0.5">
                                        {money(
                                          sale.totalProfit
                                        )}
                                      </p>

                                    </div>

                                  </div>

                                </div>

                                {/* DEAL */}

                                <div className="p-4">

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                                    <div>
                                      <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                        Cost
                                      </p>

                                      <p className="font-bold text-red-600 text-[11px] mt-1">
                                        {money(
                                          sale.originalCost
                                        )}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                        Sale Price
                                      </p>

                                      <p className="font-bold text-slate-800 text-[11px] mt-1">
                                        {money(
                                          sale.sellingPrice
                                        )}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                        Down Payment
                                      </p>

                                      <p className="font-bold text-emerald-600 text-[11px] mt-1">
                                        {money(
                                          sale.downPayment
                                        )}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                        Markup
                                      </p>

                                      <p className="font-bold text-indigo-600 text-[11px] mt-1">
                                        {
                                          sale.markupPercent
                                        }
                                        % •{' '}
                                        {money(
                                          sale.markupAmount
                                        )}
                                      </p>
                                    </div>

                                  </div>

                                  {/* PAYMENT SUMMARY */}

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-dashed border-slate-200">

                                    <div className="rounded-lg bg-slate-50 p-3">

                                      <p className="text-[8px] uppercase tracking-wider font-black text-slate-400">
                                        Customer Payable
                                      </p>

                                      <p className="font-black text-slate-900 text-sm mt-1">
                                        {money(
                                          sale.totalCustomerPayable
                                        )}
                                      </p>

                                    </div>

                                    <div className="rounded-lg bg-emerald-50 p-3">

                                      <p className="text-[8px] uppercase tracking-wider font-black text-emerald-600">
                                        Total Received
                                      </p>

                                      <p className="font-black text-emerald-700 text-sm mt-1">
                                        {money(
                                          sale.totalReceived
                                        )}
                                      </p>

                                    </div>

                                    <div className="rounded-lg bg-red-50 p-3">

                                      <p className="text-[8px] uppercase tracking-wider font-black text-red-500">
                                        Remaining
                                      </p>

                                      <p className="font-black text-red-600 text-sm mt-1">
                                        {money(
                                          sale.remainingAmount
                                        )}
                                      </p>

                                    </div>

                                  </div>

                                  {/* PAYMENT HISTORY */}

                                  <div className="mt-5">

                                    <div className="flex items-center justify-between mb-2">

                                      <h6 className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                                        Payment History
                                      </h6>

                                      <span className="text-[9px] font-bold text-slate-400">
                                        {
                                          sale
                                            .customerPayments
                                            .length
                                        }{' '}
                                        Payments
                                      </span>

                                    </div>

                                    <div className="space-y-2">

                                      {/* DOWN PAYMENT */}

                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">

                                        <div>

                                          <p className="text-[10px] font-black text-emerald-800">
                                            Down Payment
                                          </p>

                                          <p className="text-[9px] text-emerald-600 mt-0.5">
                                            Sale Date:{' '}
                                            {formatDate(
                                              sale.saleDate
                                            )}
                                          </p>

                                        </div>

                                        <p className="text-xs font-black text-emerald-700">
                                          +{' '}
                                          {money(
                                            sale.downPayment
                                          )}
                                        </p>

                                      </div>

                                      {/* PAYMENTS */}

                                      {sale
                                        .customerPayments
                                        .length >
                                      0 ? (
                                        sale.customerPayments.map(
                                          (
                                            payment,
                                            paymentIndex
                                          ) => (
                                            <div
                                              key={
                                                payment._id ||
                                                paymentIndex
                                              }
                                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5"
                                            >

                                              <div>

                                                <p className="text-[10px] font-black text-slate-700">
                                                  Installment Payment #{' '}
                                                  {paymentIndex +
                                                    1}
                                                </p>

                                                <p className="text-[9px] text-slate-500 mt-0.5">
                                                  {payment.paymentDate
                                                    ? formatDate(
                                                        payment.paymentDate
                                                      )
                                                    : 'Date N/A'}
                                                  {' • '}
                                                  {payment.paymentMethod ||
                                                    'Cash'}
                                                </p>

                                              </div>

                                              <p className="text-xs font-black text-slate-800">
                                                +{' '}
                                                {money(
                                                  payment.amount
                                                )}
                                              </p>

                                            </div>
                                          )
                                        )
                                      ) : (
                                        <p className="text-[10px] text-slate-400 text-center py-3">
                                          No installment payment received yet.
                                        </p>
                                      )}

                                    </div>

                                  </div>

                                </div>

                              </div>
                            )
                          )}

                        </div>
                      )}

                    </div>

                  </div>
                </div>

              </div>

              {/* FINAL PROFIT */}

              <div className="mx-5 sm:mx-6 mb-6 rounded-[20px] border border-slate-200 overflow-hidden">

                <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between gap-4">

                  <div>
                    <h4 className="font-black text-sm">
                      Final Profit Calculation
                    </h4>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Gross profit less recorded expenses.
                    </p>
                  </div>

                  <TrendingUp className="w-5 h-5 text-slate-400" />

                </div>

                <div className="p-5 space-y-3">

                  <div className="flex justify-between items-center gap-4">

                    <span className="text-xs font-semibold text-slate-500">
                      Cash Profit
                    </span>

                    <span className="text-sm font-black text-emerald-600">
                      + {money(
                        cashProfit
                      )}
                    </span>

                  </div>

                  <div className="flex justify-between items-center gap-4">

                    <span className="text-xs font-semibold text-slate-500">
                      Installment Profit
                    </span>

                    <span className="text-sm font-black text-indigo-600">
                      + {money(
                        installmentProfit
                      )}
                    </span>

                  </div>

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center gap-4">

                    <span className="text-sm font-black text-slate-900">
                      Gross Profit
                    </span>

                    <span className="text-sm font-black text-slate-900">
                      {money(
                        grossProfit
                      )}
                    </span>

                  </div>

                  <div className="flex justify-between items-center gap-4">

                    <span className="text-xs font-semibold text-slate-500">
                      Less: Total Expenses
                    </span>

                    <span className="text-sm font-black text-red-600">
                      - {money(
                        totalExpensesVal
                      )}
                    </span>

                  </div>

                  <div className="mt-2 pt-4 border-t-2 border-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                    <div>

                      <span className="text-lg font-black text-slate-900">
                        Clear / Net Profit
                      </span>

                      <p className="text-[10px] text-slate-400 mt-1">
                        Gross Profit − Total Expenses
                      </p>

                    </div>

                    <span
                      className={`text-2xl font-black ${
                        netProfitVal >=
                        0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {money(
                        netProfitVal
                      )}
                    </span>

                  </div>

                </div>

              </div>

            </section>

            {/* =====================================================
                LEDGERS + URGENT DUES
            ====================================================== */}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

              {/* LEDGER */}

              <section className="xl:col-span-2 bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden">

                <div className="p-4 sm:p-5 border-b border-slate-100">

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                    <div>

                      <h3 className="text-lg font-black text-slate-900">
                        Transaction Ledger
                      </h3>

                      <p className="text-[10px] text-slate-400 mt-1">
                        Monitor financing and cash transactions.
                      </p>

                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200">

                      <button
                        onClick={() =>
                          setActiveTableTab(
                            0
                          )
                        }
                        className={`px-3 py-2 rounded-lg text-[10px] sm:text-xs font-black transition ${
                          activeTableTab ===
                          0
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        Financing (
                        {
                          activeFinancingLedgerList.length
                        }
                        )
                      </button>

                      <button
                        onClick={() =>
                          setActiveTableTab(
                            1
                          )
                        }
                        className={`px-3 py-2 rounded-lg text-[10px] sm:text-xs font-black transition ${
                          activeTableTab ===
                          1
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        Cash (
                        {
                          cashSales.length
                        }
                        )
                      </button>

                    </div>

                  </div>

                </div>

                {/* FINANCING TABLE */}

                {activeTableTab ===
                  0 && (
                  <div className="overflow-x-auto">

                    {activeFinancingLedgerList.length ===
                    0 ? (
                      <div className="py-14 text-center">

                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 mx-auto flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-slate-300" />
                        </div>

                        <p className="text-sm font-bold text-slate-500 mt-3">
                          No financing plans found
                        </p>

                        <p className="text-[10px] text-slate-400 mt-1">
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

                        <tbody className="divide-y divide-slate-100">

                          {activeFinancingLedgerList.map(
                            (plan) => {
                              const totalWithMarkup =
                                Number(
                                  plan.totalAmount ||
                                    0
                                );

                              const remaining =
                                Number(
                                  plan.remainingBalance ||
                                    0
                                );

                              const amountReceived =
                                Math.max(
                                  0,
                                  totalWithMarkup -
                                    remaining
                                );

                              return (
                                <tr
                                  key={
                                    plan._id
                                  }
                                  className="group hover:bg-slate-50/80 transition"
                                >

                                  <td className="px-5 py-4">
                                    <span className="font-black text-xs text-indigo-600">
                                      {
                                        plan.planId
                                      }
                                    </span>
                                  </td>

                                  <td className="px-5 py-4">
                                    <div className="font-bold text-xs text-slate-800">
                                      {plan
                                        .customer
                                        ?.fullName ||
                                        'Walk-in'}
                                    </div>
                                  </td>

                                  <td className="px-5 py-4">
                                    <div className="max-w-[180px] truncate text-xs text-slate-600">
                                      {plan
                                        .product
                                        ?.name ||
                                        'Item'}
                                    </div>
                                  </td>

                                  <td className="px-5 py-4 text-right">
                                    <span className="font-black text-xs text-emerald-600">
                                      +{' '}
                                      {money(
                                        amountReceived
                                      )}
                                    </span>
                                  </td>

                                  <td className="px-5 py-4 text-right">
                                    <span className="font-black text-xs text-red-600">
                                      {money(
                                        remaining
                                      )}
                                    </span>
                                  </td>

                                  <td className="px-5 py-4 text-center">

                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black border ${
                                        plan.status ===
                                        'Completed'
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                          : plan.status ===
                                            'Overdue'
                                          ? 'bg-red-50 border-red-200 text-red-700'
                                          : 'bg-blue-50 border-blue-200 text-blue-700'
                                      }`}
                                    >
                                      {
                                        plan.status
                                      }
                                    </span>

                                  </td>

                                  <td className="px-5 py-4 text-center">

                                    <Link
                                      to={`/installments/${plan._id}`}
                                      className="inline-flex w-8 h-8 items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Link>

                                  </td>

                                </tr>
                              );
                            }
                          )}

                        </tbody>

                      </table>
                    )}

                  </div>
                )}

                {/* CASH TABLE */}

                {activeTableTab ===
                  1 && (
                  <div className="overflow-x-auto">

                    {cashSales.length ===
                    0 ? (
                      <div className="py-14 text-center">

                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 mx-auto flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-slate-300" />
                        </div>

                        <p className="text-sm font-bold text-slate-500 mt-3">
                          No cash transactions found
                        </p>

                        <p className="text-[10px] text-slate-400 mt-1">
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

                        <tbody className="divide-y divide-slate-100">

                          {cashSales.map(
                            (sale) => (
                              <tr
                                key={
                                  sale._id
                                }
                                className="hover:bg-slate-50/80 transition"
                              >

                                <td className="px-5 py-4">
                                  <span className="font-black text-xs text-indigo-600">
                                    {
                                      sale.saleId
                                    }
                                  </span>
                                </td>

                                <td className="px-5 py-4">
                                  <span className="font-bold text-xs text-slate-800">
                                    {sale
                                      .customer
                                      ?.fullName ||
                                      'Walk-in'}
                                  </span>
                                </td>

                                <td className="px-5 py-4">
                                  <span className="block max-w-[180px] truncate text-xs text-slate-700">
                                    {sale
                                      .product
                                      ?.name ||
                                      'Item'}
                                  </span>
                                </td>

                                <td className="px-5 py-4 text-center">

                                  <span className="inline-flex min-w-7 justify-center px-2 py-1 rounded-md bg-slate-100 text-[10px] font-black text-slate-700">
                                    {
                                      sale.quantity
                                    }
                                  </span>

                                </td>

                                <td className="px-5 py-4 text-right">

                                  <span className="font-black text-xs text-emerald-600">
                                    {money(
                                      sale.finalTotal
                                    )}
                                  </span>

                                </td>

                                <td className="px-5 py-4">

                                  <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                                    {formatDateTime(
                                      sale.saleDate
                                    )}
                                  </span>

                                </td>

                                <td className="px-5 py-4 text-center">

                                  <Link
                                    to={`/invoices/${sale._id}`}
                                    className="inline-flex w-8 h-8 items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Link>

                                </td>

                              </tr>
                            )
                          )}

                        </tbody>

                      </table>
                    )}

                  </div>
                )}

              </section>

              {/* URGENT DUES */}

              <section className="bg-white border border-red-100 rounded-[24px] shadow-sm overflow-hidden">

                <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-white border-b border-red-100">

                  <div className="flex items-center justify-between gap-3">

                    <div className="flex items-center gap-3">

                      <div className="w-10 h-10 rounded-xl bg-white border border-red-100 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>

                      <div>

                        <h3 className="font-black text-sm text-slate-900">
                          Urgent Dues
                        </h3>

                        <p className="text-[10px] text-slate-500 mt-1">
                          Due & overdue installments
                        </p>

                      </div>

                    </div>

                    {stats?.installments
                      ?.urgentInstallments
                      ?.length >
                      0 && (
                      <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black">
                        {
                          stats
                            .installments
                            .urgentInstallments
                            .length
                        }
                      </span>
                    )}

                  </div>

                </div>

                {!stats?.installments
                  ?.urgentInstallments ||
                stats.installments
                  .urgentInstallments
                  .length === 0 ? (
                  <div className="p-10 text-center">

                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 mx-auto flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>

                    <p className="text-sm font-black text-slate-600 mt-3">
                      Everything looks good
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
                      No due or overdue installments today.
                    </p>

                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">

                    {stats.installments.urgentInstallments.map(
                      (inst) => (
                        <div
                          key={
                            inst._id
                          }
                          className="p-4 hover:bg-slate-50/70 transition"
                        >

                          <div className="flex justify-between items-start gap-3">

                            <div className="min-w-0">

                              <p className="text-sm font-black text-slate-900 truncate">
                                {inst
                                  .installmentPlan
                                  ?.customer
                                  ?.fullName ||
                                  'N/A'}
                              </p>

                              <p className="text-[9px] text-slate-500 font-bold mt-1">
                                Mob:{' '}
                                {inst
                                  .installmentPlan
                                  ?.customer
                                  ?.mobileNumber ||
                                  ''}
                              </p>

                            </div>

                            <span
                              className={`shrink-0 px-2 py-1 rounded-full text-[8px] font-black border ${
                                inst.status ===
                                'Overdue'
                                  ? 'bg-red-50 border-red-100 text-red-700'
                                  : 'bg-amber-50 border-amber-100 text-amber-700'
                              }`}
                            >
                              {
                                inst.status
                              }
                            </span>

                          </div>

                          <div className="mt-3 flex justify-between items-start gap-3">

                            <div className="min-w-0">

                              <p className="text-[10px] font-bold text-slate-700 truncate">
                                Month #{' '}
                                {
                                  inst.installmentNumber
                                }
                              </p>

                              <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                                {inst
                                  .installmentPlan
                                  ?.product
                                  ?.name ||
                                  'Item'}
                              </p>

                            </div>

                            <span className="text-sm font-black text-slate-900 shrink-0">
                              {money(
                                inst.amount
                              )}
                            </span>

                          </div>

                          <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex justify-between items-center gap-2">

                            <span className="text-[9px] text-red-500 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Due:{' '}
                              {formatDate(
                                inst.dueDate
                              )}
                            </span>

                            <div className="flex gap-1.5">

                              <button
                                onClick={() =>
                                  handleSendUrgentReminder(
                                    inst
                                  )
                                }
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition"
                                title="Send WhatsApp Due Alert"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>

                              <Link
                                to={`/installments/${inst.installmentPlan?._id}`}
                                className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] px-3 py-2 rounded-lg transition"
                              >
                                Settle
                                <ChevronRight className="w-3 h-3" />
                              </Link>

                            </div>

                          </div>

                        </div>
                      )
                    )}

                  </div>
                )}

              </section>

            </div>

          </div>
        </div>
      </>
    );
  };

  export default Dashboard;
