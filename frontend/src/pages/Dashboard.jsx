import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
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
  Sparkles,
  MessageCircle
} from 'lucide-react';

const Dashboard = () => {
  const { settings } = useSettings();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTableTab, setActiveTableTab] = useState(0);

  // DEFAULT FILTER = TODAY
  const [filterPreset, setFilterPreset] =
    useState('today');

  const [customStartDate, setCustomStartDate] =
    useState('');

  const [customEndDate, setCustomEndDate] =
    useState('');

  const [globalSearch, setGlobalSearch] =
    useState('');

  // ===============================
  // FETCH DASHBOARD DATA
  // ===============================

  const fetchStats = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        '/api/reports/dashboard'
      );

      if (
        response.data &&
        response.data.success
      ) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error(
        'Failed to load dashboard metrics:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // ===============================
  // WHATSAPP NUMBER
  // ===============================

  const formatWhatsAppNumber = (
    phoneStr
  ) => {
    if (!phoneStr) return '';

    let clean =
      phoneStr.replace(
        /[^0-9]/g,
        ''
      );

    if (clean.startsWith('03')) {
      clean =
        '92' +
        clean.slice(1);
    } else if (
      clean.startsWith('3')
    ) {
      clean =
        '92' + clean;
    }

    return clean;
  };

  // ===============================
  // URGENT REMINDER
  // ===============================

  const handleSendUrgentReminder = (
    inst
  ) => {
    const phone =
      formatWhatsAppNumber(
        inst.installmentPlan
          ?.customer
          ?.mobileNumber
      );

    if (!phone) {
      return alert(
        'Customer phone number is missing or invalid.'
      );
    }

    const customerName =
      inst.installmentPlan
        ?.customer
        ?.fullName ||
      'Customer';

    const productName =
      inst.installmentPlan
        ?.product?.name ||
      'Item';

    const dueDateFormatted =
      new Date(
        inst.dueDate
      ).toLocaleDateString(
        'en-PK'
      );

    const message = `*⚠️ URGENT INSTALLMENT REMINDER*
━━━━━━━━━━━━━━━━━━━━

Assalam-o-Alaikum *${customerName}*,

Aapko yaad dilaya jata hai ke aapki *${productName}* ki kist ki date guzar chuki hai aur abhi tak aapki payment receive nahi hui hai...:

📅 *Due Date:* ${dueDateFormatted}

💰 *Installment Amount:* ${
      settings.currency
    } ${Number(
      inst.amount || 0
    ).toLocaleString()}

🔢 *Installment:* Month #${inst.installmentNumber}

Meharbani farma kar apni installment *jald az jald* jama karwa dein, taake aapka payment record updated rahe aur kisi bhi mushkil se bacha sake.

Agar aap payment already kar chuke hain to is message ko ignore karein ya payment details share kar dein.

━━━━━━━━━━━━━━━━━━━━
🏪 *Dukan:* ${
      settings.shopName ||
      'Electronics Shop'
    }
📞 *Phone:* ${
      settings.shopPhone ||
      ''
    }
━━━━━━━━━━━━━━━━━━━━

*Shukriya - ${
      settings.shopName ||
      'Electronics Shop'
    }*`;

    const encoded =
      encodeURIComponent(
        message
      );

    window.open(
      `https://wa.me/${phone}?text=${encoded}`,
      '_blank'
    );
  };

  // ===============================
  // LOADING
  // ===============================

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 min-h-screen bg-slate-50">

        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>

        <span className="text-slate-600 text-sm font-semibold tracking-wide">
          Syncing with cloud database...
        </span>

      </div>
    );
  }

  // ===============================
  // DATE FILTER
  // ===============================

  const isDateInFilter = (
    dateStr
  ) => {
    if (!dateStr) return false;

    const date =
      new Date(dateStr);

    date.setHours(
      0,
      0,
      0,
      0
    );

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    if (
      filterPreset ===
      'all'
    ) {
      return true;
    }

    if (
      filterPreset ===
      'today'
    ) {
      return (
        date.getTime() ===
        today.getTime()
      );
    }

    if (
      filterPreset ===
      'week'
    ) {
      const startOfWeek =
        new Date(today);

      startOfWeek.setDate(
        today.getDate() - 7
      );

      return (
        date >=
          startOfWeek &&
        date <= today
      );
    }

    if (
      filterPreset ===
      'month'
    ) {
      const startOfMonth =
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );

      return (
        date >=
          startOfMonth &&
        date <= today
      );
    }

    if (
      filterPreset ===
        'custom' &&
      customStartDate &&
      customEndDate
    ) {
      const start =
        new Date(
          customStartDate
        );

      start.setHours(
        0,
        0,
        0,
        0
      );

      const end =
        new Date(
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

  // ===============================
  // FILTERED DATA
  // ===============================

  const filteredSalesList =
    (
      stats?.sales
        ?.salesList || []
    ).filter((s) =>
      isDateInFilter(
        s.saleDate
      )
    );

  const filteredFinancingList =
    (
      stats?.installments
        ?.activeFinancingList ||
      []
    ).filter((p) =>
      isDateInFilter(
        p.createdAt
      )
    );

  const filteredPaymentsList =
    (
      stats?.installments
        ?.paymentsList || []
    ).filter((pay) =>
      isDateInFilter(
        pay.paymentDate
      )
    );

  const filteredExpensesList =
    (
      stats?.expenses
        ?.expensesList || []
    ).filter((e) =>
      isDateInFilter(
        e.expenseDate
      )
    );

  // ===============================
  // CASH / INSTALLMENT SALES
  // ===============================

  const cashSalesList =
    filteredSalesList.filter(
      (s) =>
        s.paymentType ===
        'Cash'
    );

  const installmentSalesList =
    filteredSalesList.filter(
      (s) =>
        s.paymentType ===
        'Installment'
    );

  // ===============================
  // TOTAL REVENUE
  // ===============================

  const totalRevenue =
    filteredSalesList.reduce(
      (sum, s) =>
        sum +
        Number(
          s.finalTotal || 0
        ),
      0
    );

  // ===============================
  // CASH REVENUE
  // ===============================

  const cashRevenue =
    cashSalesList.reduce(
      (sum, s) =>
        sum +
        Number(
          s.finalTotal || 0
        ),
      0
    );

  // ===============================
  // CASH COST
  // ===============================

  const cashCost =
    cashSalesList.reduce(
      (sum, s) =>
        sum +
        Number(
          s.quantity || 0
        ) *
          Number(
            s.product
              ?.purchasePrice ||
              0
          ),
      0
    );

  // ===============================
  // CASH PROFIT
  // ===============================

  const cashProfit =
    cashRevenue -
    cashCost;

  // ===============================
  // INSTALLMENT REVENUE
  // ===============================

  const installmentRevenue =
    installmentSalesList.reduce(
      (sum, s) =>
        sum +
        Number(
          s.finalTotal || 0
        ),
      0
    );

  // ===============================
  // INSTALLMENT COST
  // ===============================

  const installmentCost =
    installmentSalesList.reduce(
      (sum, s) =>
        sum +
        Number(
          s.quantity || 0
        ) *
          Number(
            s.product
              ?.purchasePrice ||
              0
          ),
      0
    );

  // ===============================
  // INSTALLMENT MARKUP
  // ===============================

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

        let markupPercent =
          0;

        if (
          duration === 3
        ) {
          markupPercent =
            15;
        } else if (
          duration === 6
        ) {
          markupPercent =
            25;
        } else if (
          duration === 12
        ) {
          markupPercent =
            50;
        } else if (
          duration <= 3
        ) {
          markupPercent =
            15;
        } else if (
          duration <= 6
        ) {
          markupPercent =
            25;
        } else {
          markupPercent =
            50;
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
          sum +
          markupAmount
        );
      },
      0
    );

  // ===============================
  // INSTALLMENT PRODUCT PROFIT
  // ===============================

  const installmentProductProfit =
    installmentRevenue -
    installmentCost;

  // ===============================
  // TOTAL INSTALLMENT PROFIT
  // ===============================

  const installmentProfit =
    installmentProductProfit +
    installmentMarkupProfit;

  // ===============================
  // INSTALLMENT PAYMENTS RECEIVED
  // ===============================

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
        Number(
          pay.amount || 0
        ),
      0
    );

  const totalInstallmentPaymentsReceived =
    installmentDownPayments +
    installmentPayments;

  // ===============================
  // TOTAL COLLECTED
  // ===============================

  const totalCollected =
    cashRevenue +
    totalInstallmentPaymentsReceived;

  // ===============================
  // OUTSTANDING
  // ===============================

  const totalOutstanding =
    filteredFinancingList.reduce(
      (sum, p) =>
        sum +
        Number(
          p.remainingBalance ||
            0
        ),
      0
    );

  // ===============================
  // GROSS PROFIT
  // ===============================

  const grossProfit =
    cashProfit +
    installmentProfit;

  // ===============================
  // EXPENSES
  // ===============================

  const totalExpensesVal =
    filteredExpensesList.reduce(
      (sum, e) =>
        sum +
        Number(
          e.amount || 0
        ),
      0
    );

  // ===============================
  // CLEAR / NET PROFIT
  // ===============================

  const netProfitVal =
    grossProfit -
    totalExpensesVal;

  // ===============================
  // SEARCH
  // ===============================

  const searchFilter = (
    item
  ) => {
    if (!globalSearch)
      return true;

    const term =
      globalSearch.toLowerCase();

    const custName =
      item.customer
        ?.fullName
        ?.toLowerCase() ||
      '';

    const custPhone =
      item.customer
        ?.mobileNumber || '';

    const id = (
      item.saleId ||
      item.planId ||
      ''
    ).toLowerCase();

    const prodName =
      item.product
        ?.name
        ?.toLowerCase() ||
      '';

    return (
      custName.includes(
        term
      ) ||
      custPhone.includes(
        term
      ) ||
      id.includes(term) ||
      prodName.includes(
        term
      )
    );
  };

  // ===============================
  // TABLE DATA
  // ===============================

  const cashSales =
    cashSalesList.filter(
      (s) =>
        searchFilter(s)
    );

  const activeFinancingLedgerList =
    filteredFinancingList.filter(
      (p) =>
        searchFilter(p)
    );

  // ===============================
  // DETAILED CASH PROFIT DATA
  // ===============================

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
              ?.purchasePrice ||
              0
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
          profit
        };
      });

  // ===============================
  // DETAILED INSTALLMENT PROFIT DATA
  // ===============================

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
              ?.purchasePrice ||
              0
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

        let markupPercent =
          0;

        if (
          duration === 3
        ) {
          markupPercent =
            15;
        } else if (
          duration === 6
        ) {
          markupPercent =
            25;
        } else if (
          duration === 12
        ) {
          markupPercent =
            50;
        } else if (
          duration <= 3
        ) {
          markupPercent =
            15;
        } else if (
          duration <= 6
        ) {
          markupPercent =
            25;
        } else {
          markupPercent =
            50;
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

        // Find payments for this exact sale
        const customerPayments =
          filteredPaymentsList.filter(
            (payment) => {
              const paymentSaleId =
                payment.sale
                  ?._id ||
                payment.sale;

              return (
                paymentSaleId &&
                sale._id &&
                String(
                  paymentSaleId
                ) ===
                  String(
                    sale._id
                  )
              );
            }
          );

        const installmentPaymentsReceived =
          customerPayments.reduce(
            (
              sum,
              payment
            ) =>
              sum +
              Number(
                payment.amount ||
                  0
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
          totalProfit
        };
      });

  // ===============================
  // KPI ROW 1
  // ===============================

  const firstRowKpis = [
    {
      name: 'Total Earnings / Revenue',
      value: `${
        settings.currency
      } ${totalRevenue.toLocaleString()}`,
      icon: ShoppingCart,
      color:
        'text-blue-600 bg-blue-50 border-blue-100'
    },
    {
      name: 'Cash Payments Received',
      value: `${
        settings.currency
      } ${cashRevenue.toLocaleString()}`,
      icon: Wallet,
      color:
        'text-green-600 bg-green-50 border-green-100'
    },
    {
      name: 'Installment Payments Received',
      value: `${
        settings.currency
      } ${totalInstallmentPaymentsReceived.toLocaleString()}`,
      icon: Layers,
      color:
        'text-purple-600 bg-purple-50 border-purple-100'
    }
  ];

  // ===============================
  // PROFIT KPI ROW
  // ===============================

  const secondRowKpis = [
    {
      name: 'Cash Profit',
      value: `${
        settings.currency
      } ${cashProfit.toLocaleString()}`,
      icon: TrendingUp,
      color:
        'text-emerald-600 bg-emerald-50 border-emerald-100'
    },
    {
      name: 'Installment Profit',
      value: `${
        settings.currency
      } ${installmentProfit.toLocaleString()}`,
      icon: Layers,
      color:
        'text-indigo-600 bg-indigo-50 border-indigo-100'
    },
    {
      name: 'Total Expenses',
      value: `${
        settings.currency
      } ${totalExpensesVal.toLocaleString()}`,
      icon: Wallet,
      color:
        'text-amber-600 bg-amber-50 border-amber-100'
    }
  ];

  // ===============================
  // PROFIT SUMMARY
  // ===============================

  const profitSummary = [
    {
      label: 'Cash Profit',
      value: cashProfit,
      icon: TrendingUp
    },
    {
      label: 'Installment Profit',
      value: installmentProfit,
      icon: Layers
    },
    {
      label: 'Gross Profit',
      value: grossProfit,
      icon: Sparkles
    },
    {
      label: 'Less: Expenses',
      value: -totalExpensesVal,
      icon: Wallet
    },
    {
      label: 'Clear',
      value: netProfitVal,
      icon: TrendingUp
    }
  ];

  // ===============================
  // CSV
  // ===============================

  const handleDownloadCSV = () => {
    if (
      filteredSalesList.length ===
      0
    ) {
      return alert(
        'No transaction data found in this selected date range.'
      );
    }

    const headers = [
      'Invoice ID,Customer Name,Product,Qty,Net Price,Payment Method,Date & Time'
    ];

    const rows =
      filteredSalesList.map(
        (s) => {
          const dateFormatted =
            new Date(
              s.saleDate
            ).toLocaleString(
              'en-PK'
            );

          return `"${s.saleId}","${
            s.customer
              ?.fullName ||
            'Walk-in'
          }","${
            s.product
              ?.name ||
            'Deleted Product'
          }",${s.quantity},${
            s.finalTotal
          },"${
            s.paymentType
          }","${dateFormatted}"`;
        }
      );

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers,
        ...rows
      ].join('\n');

    const encodedUri =
      encodeURI(
        csvContent
      );

    const link =
      document.createElement(
        'a'
      );

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
  };

  // ===============================
  // UI
  // ===============================

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* HEADER */}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 border border-gray-200 rounded-2xl shadow-sm">

        <div className="space-y-1">

          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {settings?.shopName ||
              'Electronics Shop'}{' '}
            Dashboard
          </h2>

          <p className="text-sm text-gray-500 font-medium">
            Digital control center and billing auditing registers.
          </p>

        </div>

        <div className="flex flex-wrap gap-2">

          <Link
            to="/sales/new"
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />

            <span>
              New Checkout
            </span>
          </Link>

          <Link
            to="/customers/add"
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            <Users className="w-4 h-4" />

            <span>
              Register Customer
            </span>
          </Link>

          <button
            onClick={
              handleDownloadCSV
            }
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />

            <span>
              Export CSV
            </span>
          </button>

        </div>

      </div>

      {/* FILTER PANEL */}

      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">

        <div className="relative">

          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3" />

          <input
            type="text"
            placeholder="Search across cash deals, installment ledgers, customer names, SKUs, or invoices..."
            value={
              globalSearch
            }
            onChange={(e) =>
              setGlobalSearch(
                e.target.value
              )
            }
            className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-3">

          <div className="flex flex-wrap gap-1.5">

            {[
              {
                id: 'all',
                label: 'All-Time'
              },
              {
                id: 'today',
                label: 'Today (Daily)'
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
                  key={
                    preset.id
                  }
                  onClick={() =>
                    setFilterPreset(
                      preset.id
                    )
                  }
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-colors ${
                    filterPreset ===
                    preset.id
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {
                    preset.label
                  }
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

              <span className="text-gray-400">
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

      {/* KPI CARDS */}

      <div className="space-y-6">

        {/* ROW 1 */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {firstRowKpis.map(
            (kpi) => {

              const Icon =
                kpi.icon;

              return (

                <div
                  key={
                    kpi.name
                  }
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-between"
                >

                  <div className="space-y-1">

                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      {
                        kpi.name
                      }
                    </span>

                    <p className="text-2xl font-black text-slate-800 tracking-tight">
                      {
                        kpi.value
                      }
                    </p>

                  </div>

                  <div
                    className={`p-3.5 rounded-xl border shrink-0 ${kpi.color}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                </div>

              );
            }
          )}

        </div>

        {/* ROW 2 */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {secondRowKpis.map(
            (kpi) => {

              const Icon =
                kpi.icon;

              return (

                <div
                  key={
                    kpi.name
                  }
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-between"
                >

                  <div className="space-y-1">

                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      {
                        kpi.name
                      }
                    </span>

                    <p className="text-2xl font-black text-slate-800 tracking-tight">
                      {
                        kpi.value
                      }
                    </p>

                  </div>

                  <div
                    className={`p-3.5 rounded-xl border shrink-0 ${kpi.color}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                </div>

              );
            }
          )}

        </div>

      </div>

      {/* ===============================
          PROFIT BREAKDOWN
      =============================== */}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 border-b border-gray-200 bg-gray-50/50">

          <div>

            <h3 className="text-lg font-black text-slate-800">
              Profit Breakdown
            </h3>

            <p className="text-xs text-gray-500 mt-1">
              Cash aur installment business ka complete profit breakdown.
            </p>

          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">

          {/* ===============================
              CASH BUSINESS
          =============================== */}

          <div className="border border-green-200 rounded-2xl overflow-hidden">

            <div className="px-5 py-4 bg-green-50 border-b border-green-200">

              <h4 className="font-black text-green-800">
                Cash Business
              </h4>

            </div>

            <div className="p-5 space-y-4">

              <div className="flex justify-between">

                <span className="text-sm text-gray-500 font-medium">
                  Cash Revenue
                </span>

                <span className="font-bold text-slate-800">
                  {
                    settings.currency
                  }{' '}
                  {
                    cashRevenue.toLocaleString()
                  }
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-sm text-gray-500 font-medium">
                  Product Cost
                </span>

                <span className="font-bold text-red-600">
                  -{' '}
                  {
                    settings.currency
                  }{' '}
                  {
                    cashCost.toLocaleString()
                  }
                </span>

              </div>

              <div className="border-t pt-4 flex justify-between">

                <span className="font-black text-slate-800">
                  Cash Profit
                </span>

                <span className="font-black text-green-600 text-lg">
                  {
                    settings.currency
                  }{' '}
                  {
                    cashProfit.toLocaleString()
                  }
                </span>

              </div>

              {/* ===============================
                  CASH SALE DETAILS
                  MAX 3 CARDS VISIBLE + SCROLL
              =============================== */}

              <div className="border-t border-green-200 mt-5 pt-5">

                <div className="flex items-center justify-between mb-4">

                  <div>

                    <h5 className="font-black text-slate-800">
                      Cash Sale Details
                    </h5>

                    <p className="text-xs text-gray-500 mt-1">
                      Har cash sale ka original cost, selling price aur profit.
                    </p>

                  </div>

                  <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                    {
                      detailedCashProfitList.length
                    }{' '}
                    Sales
                  </span>

                </div>

                {detailedCashProfitList.length ===
                0 ? (

                  <p className="text-xs text-gray-400 text-center py-6">
                    No cash sales found.
                  </p>

                ) : (

                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">

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
                          className="border border-gray-200 rounded-xl p-4 bg-white"
                        >

                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                            <div className="min-w-0">

                              <div className="flex items-center gap-2 mb-2">

                                <Users className="w-4 h-4 text-gray-400" />

                                <span className="font-black text-slate-800">
                                  {
                                    sale
                                      .customer
                                      ?.fullName ||
                                    'Walk-in Customer'
                                  }
                                </span>

                              </div>

                              <div className="flex items-start gap-2">

                                <ShoppingCart className="w-4 h-4 text-gray-400 mt-0.5" />

                                <div>

                                  <p className="font-bold text-sm text-slate-700">
                                    {
                                      sale
                                        .product
                                        ?.name ||
                                      'Deleted Product'
                                    }
                                  </p>

                                  <p className="text-xs text-gray-400">
                                    Qty:{' '}
                                    {
                                      sale.quantity
                                    }
                                    {' • '}
                                    Invoice:{' '}
                                    {
                                      sale.saleId ||
                                      '-'
                                    }
                                  </p>

                                </div>

                              </div>

                            </div>

                            <div className="text-left md:text-right">

                              <p className="text-[10px] uppercase font-bold text-gray-400">
                                Profit
                              </p>

                              <p className="text-xl font-black text-green-600">
                                {
                                  settings.currency
                                }{' '}
                                {
                                  sale.profit.toLocaleString()
                                }
                              </p>

                            </div>

                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-dashed">

                            <div>

                              <p className="text-[10px] uppercase font-bold text-gray-400">
                                Original Cost
                              </p>

                              <p className="font-bold text-red-600 text-sm">
                                {
                                  settings.currency
                                }{' '}
                                {
                                  sale.originalCost.toLocaleString()
                                }
                              </p>

                            </div>

                            <div>

                              <p className="text-[10px] uppercase font-bold text-gray-400">
                                Sold For
                              </p>

                              <p className="font-bold text-slate-800 text-sm">
                                {
                                  settings.currency
                                }{' '}
                                {
                                  sale.sellingPrice.toLocaleString()
                                }
                              </p>

                            </div>

                            <div>

                              <p className="text-[10px] uppercase font-bold text-gray-400">
                                Cost / Unit
                              </p>

                              <p className="font-bold text-slate-700 text-sm">
                                {
                                  settings.currency
                                }{' '}
                                {
                                  sale.purchasePrice.toLocaleString()
                                }
                              </p>

                            </div>

                            <div>

                              <p className="text-[10px] uppercase font-bold text-gray-400">
                                Sale Date
                              </p>

                              <p className="font-bold text-slate-700 text-sm">
                                {new Date(
                                  sale.saleDate
                                ).toLocaleDateString(
                                  'en-PK'
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

          {/* ===============================
              INSTALLMENT BUSINESS
          =============================== */}

          <div className="border border-indigo-200 rounded-2xl overflow-hidden">

            <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-200">

              <h4 className="font-black text-indigo-800">
                Installment Business
              </h4>

            </div>

            <div className="p-5 space-y-4">

              <div className="flex justify-between">

                <span className="text-sm text-gray-500 font-medium">
                  Installment Revenue
                </span>

                <span className="font-bold text-slate-800">
                  {
                    settings.currency
                  }{' '}
                  {
                    installmentRevenue.toLocaleString()
                  }
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-sm text-gray-500 font-medium">
                  Product Cost
                </span>

                <span className="font-bold text-red-600">
                  -{' '}
                  {
                    settings.currency
                  }{' '}
                  {
                    installmentCost.toLocaleString()
                  }
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-sm text-gray-500 font-medium">
                  Financing Markup Profit
                </span>

                <span className="font-bold text-indigo-600">
                  +{' '}
                  {
                    settings.currency
                  }{' '}
                  {
                    installmentMarkupProfit.toLocaleString()
                  }
                </span>

              </div>

              <div className="border-t pt-4 flex justify-between">

                <span className="font-black text-slate-800">
                  Installment Profit
                </span>

                <span className="font-black text-indigo-600 text-lg">
                  {
                    settings.currency
                  }{' '}
                  {
                    installmentProfit.toLocaleString()
                  }
                </span>

              </div>

              {/* ===============================
                  CUSTOMER & PAYMENT DETAILS
                  MAX 3 CARDS VISIBLE + SCROLL
              =============================== */}

              <div className="border-t border-indigo-200 mt-5 pt-5">

                <div className="flex items-center justify-between mb-4">

                  <div>

                    <h5 className="font-black text-slate-800">
                      Customer & Payment Details
                    </h5>

                    <p className="text-xs text-gray-500 mt-1">
                      Customer-wise installment payment aur profit details.
                    </p>

                  </div>

                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                    {
                      detailedInstallmentProfitList.length
                    }{' '}
                    Customers
                  </span>

                </div>

                {detailedInstallmentProfitList.length ===
                0 ? (

                  <p className="text-xs text-gray-400 text-center py-6">
                    No installment sales found.
                  </p>

                ) : (

                  <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2">

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
                          className="border border-gray-200 rounded-xl overflow-hidden bg-white"
                        >

                          {/* CUSTOMER HEADER */}

                          <div className="p-4 bg-indigo-50/50 border-b border-indigo-100">

                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

                              <div>

                                <div className="flex items-center gap-2">

                                  <Users className="w-4 h-4 text-indigo-600" />

                                  <h6 className="font-black text-slate-800">
                                    {
                                      sale
                                        .customer
                                        ?.fullName ||
                                      'Customer'
                                    }
                                  </h6>

                                </div>

                                <p className="text-xs text-gray-500 mt-1">
                                  Mob:{' '}
                                  {
                                    sale
                                      .customer
                                      ?.mobileNumber ||
                                    'N/A'
                                  }
                                  {' • '}
                                  Product:{' '}
                                  {
                                    sale
                                      .product
                                      ?.name ||
                                    'Item'
                                  }
                                </p>

                              </div>

                              <div className="text-left md:text-right">

                                <p className="text-[10px] uppercase font-bold text-gray-400">
                                  Total Profit
                                </p>

                                <p className="text-xl font-black text-indigo-600">
                                  {
                                    settings.currency
                                  }{' '}
                                  {
                                    sale.totalProfit.toLocaleString()
                                  }
                                </p>

                              </div>

                            </div>

                          </div>

                          {/* DEAL DETAILS */}

                          <div className="p-4">

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                              <div>

                                <p className="text-[10px] uppercase font-bold text-gray-400">
                                  Original Cost
                                </p>

                                <p className="font-bold text-red-600 text-sm mt-1">
                                  {
                                    settings.currency
                                  }{' '}
                                  {
                                    sale.originalCost.toLocaleString()
                                  }
                                </p>

                              </div>

                              <div>

                                <p className="text-[10px] uppercase font-bold text-gray-400">
                                  Sale Price
                                </p>

                                <p className="font-bold text-slate-800 text-sm mt-1">
                                  {
                                    settings.currency
                                  }{' '}
                                  {
                                    sale.sellingPrice.toLocaleString()
                                  }
                                </p>

                              </div>

                              <div>

                                <p className="text-[10px] uppercase font-bold text-gray-400">
                                  Down Payment
                                </p>

                                <p className="font-bold text-green-600 text-sm mt-1">
                                  {
                                    settings.currency
                                  }{' '}
                                  {
                                    sale.downPayment.toLocaleString()
                                  }
                                </p>

                              </div>

                              <div>

                                <p className="text-[10px] uppercase font-bold text-gray-400">
                                  Markup
                                </p>

                                <p className="font-bold text-indigo-600 text-sm mt-1">
                                  {
                                    sale.markupPercent
                                  }%
                                  {' • '}
                                  {
                                    settings.currency
                                  }{' '}
                                  {
                                    sale.markupAmount.toLocaleString()
                                  }
                                </p>

                              </div>

                            </div>

                            {/* PAYMENT SUMMARY */}

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-dashed">

                              <div>

                                <p className="text-[10px] uppercase font-bold text-gray-400">
                                  Total Customer Payable
                                </p>

                                <p className="font-black text-slate-900 mt-1">
                                  {
                                    settings.currency
                                  }{' '}
                                  {
                                    sale.totalCustomerPayable.toLocaleString()
                                  }
                                </p>

                              </div>

                              <div>

                                <p className="text-[10px] uppercase font-bold text-gray-400">
                                  Total Received
                                </p>

                                <p className="font-black text-green-600 mt-1">
                                  {
                                    settings.currency
                                  }{' '}
                                  {
                                    sale.totalReceived.toLocaleString()
                                  }
                                </p>

                              </div>

                              <div>

                                <p className="text-[10px] uppercase font-bold text-gray-400">
                                  Remaining
                                </p>

                                <p className="font-black text-red-600 mt-1">
                                  {
                                    settings.currency
                                  }{' '}
                                  {
                                    sale.remainingAmount.toLocaleString()
                                  }
                                </p>

                              </div>

                            </div>

                            {/* PAYMENT HISTORY */}

                            <div className="mt-5">

                              <div className="flex items-center justify-between mb-3">

                                <h6 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                  Payment History
                                </h6>

                                <span className="text-[10px] font-bold text-gray-400">
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

                                <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2">

                                  <div>

                                    <p className="text-xs font-bold text-green-800">
                                      Down Payment
                                    </p>

                                    <p className="text-[10px] text-green-600">
                                      Sale Date:{' '}
                                      {new Date(
                                        sale.saleDate
                                      ).toLocaleDateString(
                                        'en-PK'
                                      )}
                                    </p>

                                  </div>

                                  <p className="text-sm font-black text-green-700">
                                    +{' '}
                                    {
                                      settings.currency
                                    }{' '}
                                    {
                                      sale.downPayment.toLocaleString()
                                    }
                                  </p>

                                </div>

                                {/* INSTALLMENT PAYMENTS */}

                                {sale.customerPayments
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
                                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                                      >

                                        <div>

                                          <p className="text-xs font-bold text-slate-700">
                                            Installment Payment #
                                            {
                                              paymentIndex +
                                              1
                                            }
                                          </p>

                                          <p className="text-[10px] text-gray-500">

                                            {payment.paymentDate
                                              ? new Date(
                                                  payment.paymentDate
                                                ).toLocaleDateString(
                                                  'en-PK'
                                                )
                                              : 'Date N/A'}

                                            {' • '}

                                            {
                                              payment.paymentMethod ||
                                              'Cash'
                                            }

                                          </p>

                                        </div>

                                        <p className="text-sm font-black text-slate-800">
                                          +{' '}
                                          {
                                            settings.currency
                                          }{' '}
                                          {Number(
                                            payment.amount ||
                                              0
                                          ).toLocaleString()}
                                        </p>

                                      </div>

                                    )
                                  )

                                ) : (

                                  <p className="text-[10px] text-gray-400 text-center py-3">
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

        {/* ===============================
            FINAL PROFIT
        =============================== */}

        <div className="mx-6 mb-6 border border-gray-200 rounded-2xl overflow-hidden">

          <div className="px-5 py-4 bg-slate-900 text-white">

            <h4 className="font-black">
              Final Profit Calculation
            </h4>

          </div>

          <div className="p-5 space-y-4">

            <div className="flex justify-between items-center">

              <span className="font-medium text-gray-600">
                Cash Profit
              </span>

              <span className="font-bold text-green-600">
                +{' '}
                {
                  settings.currency
                }{' '}
                {
                  cashProfit.toLocaleString()
                }
              </span>

            </div>

            <div className="flex justify-between items-center">

              <span className="font-medium text-gray-600">
                Installment Profit
              </span>

              <span className="font-bold text-indigo-600">
                +{' '}
                {
                  settings.currency
                }{' '}
                {
                  installmentProfit.toLocaleString()
                }
              </span>

            </div>

            <div className="border-t pt-4 flex justify-between items-center">

              <span className="font-black text-slate-800">
                Gross Profit
              </span>

              <span className="font-black text-slate-900 text-lg">
                {
                  settings.currency
                }{' '}
                {
                  grossProfit.toLocaleString()
                }
              </span>

            </div>

            <div className="flex justify-between items-center">

              <span className="font-medium text-gray-600">
                Less: Total Expenses
              </span>

              <span className="font-bold text-red-600">
                -{' '}
                {
                  settings.currency
                }{' '}
                {
                  totalExpensesVal.toLocaleString()
                }
              </span>

            </div>

            <div className="border-t-2 border-slate-900 pt-5 flex justify-between items-center">

              <div>

                <span className="font-black text-xl text-slate-900">
                  Clear / Net Profit
                </span>

                <p className="text-xs text-gray-500 mt-1">
                  Gross Profit − Total Expenses
                </p>

              </div>

              <span
                className={`font-black text-2xl ${
                  netProfitVal >=
                  0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}
              >
                {
                  settings.currency
                }{' '}
                {
                  netProfitVal.toLocaleString()
                }
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* ===============================
          TWO COLUMN CONTENT
      =============================== */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEDGERS */}

        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">

          <div className="p-4 bg-gray-50/50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

            <div className="flex bg-gray-200/60 p-1 rounded-xl self-start">

              <button
                onClick={() =>
                  setActiveTableTab(
                    0
                  )
                }
                className={`px-4 py-2 text-xs font-black rounded-lg transition-colors ${
                  activeTableTab ===
                  0
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-slate-900 hover:bg-gray-100'
                }`}
              >
                Financing Installment Ledger (
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
                className={`px-4 py-2 text-xs font-black rounded-lg transition-colors ${
                  activeTableTab ===
                  1
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-slate-900 hover:bg-gray-100'
                }`}
              >
                Cash Deals Ledger (
                {
                  cashSales.length
                }
                )
              </button>

            </div>

          </div>

          {/* INSTALLMENT LEDGER */}

          {activeTableTab ===
            0 && (

            <div className="overflow-x-auto">

              {activeFinancingLedgerList.length ===
              0 ? (

                <p className="p-10 text-center text-xs text-gray-400">
                  No active financing installment plans found.
                </p>

              ) : (

                <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">

                  <thead className="bg-gray-50 border-b text-xs font-bold uppercase text-gray-500">

                    <tr>

                      <th className="px-6 py-4">
                        Plan ID
                      </th>

                      <th className="px-6 py-4">
                        Buyer Name
                      </th>

                      <th className="px-6 py-4">
                        Financed Item
                      </th>

                      <th className="px-6 py-4 text-right">
                        Received
                      </th>

                      <th className="px-6 py-4 text-right">
                        Remaining dues
                      </th>

                      <th className="px-6 py-4 text-center">
                        Status
                      </th>

                      <th className="px-6 py-4 text-center">
                        View
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-200">

                    {activeFinancingLedgerList.map(
                      (
                        plan
                      ) => {

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
                            className="hover:bg-gray-50/50"
                          >

                            <td className="px-6 py-3.5 text-indigo-600 font-bold tracking-wider">
                              {
                                plan.planId
                              }
                            </td>

                            <td className="px-6 py-3.5 font-bold text-gray-900">
                              {
                                plan
                                  .customer
                                  ?.fullName ||
                                'Walk-in'
                              }
                            </td>

                            <td className="px-6 py-3.5 text-slate-700 text-xs">
                              {
                                plan
                                  .product
                                  ?.name ||
                                'Item'
                              }
                            </td>

                            <td className="px-6 py-3.5 text-right text-green-700 font-bold">
                              +{' '}
                              {
                                settings.currency
                              }{' '}
                              {
                                amountReceived.toLocaleString()
                              }
                            </td>

                            <td className="px-6 py-3.5 text-right text-red-600 font-black">
                              {
                                settings.currency
                              }{' '}
                              {
                                remaining.toLocaleString()
                              }
                            </td>

                            <td className="px-6 py-3.5 text-center">

                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  plan.status ===
                                  'Completed'
                                    ? 'bg-green-50 border-green-200 text-green-700'
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

                            <td className="px-6 py-3.5 text-center">

                              <Link
                                to={`/installments/${plan._id}`}
                                className="inline-flex p-1 text-indigo-600 hover:bg-indigo-50 rounded"
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

          {/* CASH LEDGER */}

          {activeTableTab ===
            1 && (

            <div className="overflow-x-auto">

              {cashSales.length ===
              0 ? (

                <p className="p-10 text-center text-xs text-gray-400">
                  No completed cash deals found.
                </p>

              ) : (

                <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">

                  <thead className="bg-gray-50 border-b text-xs font-bold uppercase text-gray-500">

                    <tr>

                      <th className="px-6 py-4">
                        Invoice ID
                      </th>

                      <th className="px-6 py-4">
                        Buyer Name
                      </th>

                      <th className="px-6 py-4">
                        Product Purchased
                      </th>

                      <th className="px-6 py-4 text-center">
                        Quantity
                      </th>

                      <th className="px-6 py-4 text-right">
                        Deal Cost
                      </th>

                      <th className="px-6 py-4">
                        Date & Time
                      </th>

                      <th className="px-6 py-4 text-center">
                        Invoice
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-200">

                    {cashSales.map(
                      (
                        sale
                      ) => (

                        <tr
                          key={
                            sale._id
                          }
                          className="hover:bg-gray-50/50"
                        >

                          <td className="px-6 py-3.5 text-indigo-600 font-bold tracking-wider">
                            {
                              sale.saleId
                            }
                          </td>

                          <td className="px-6 py-3.5 font-bold text-gray-900">
                            {
                              sale
                                .customer
                                ?.fullName ||
                              'Walk-in'
                            }
                          </td>

                          <td className="px-6 py-3.5 text-slate-800 text-xs">
                            {
                              sale
                                .product
                                ?.name ||
                              'Item'
                            }
                          </td>

                          <td className="px-6 py-3.5 text-center text-slate-900 font-bold">
                            {
                              sale.quantity
                            }
                          </td>

                          <td className="px-6 py-3.5 text-right font-extrabold text-green-600">
                            {
                              settings.currency
                            }{' '}
                            {Number(
                              sale.finalTotal ||
                                0
                            ).toLocaleString()}
                          </td>

                          <td className="px-6 py-3.5 text-xs text-gray-500">
                            {new Date(
                              sale.saleDate
                            ).toLocaleString(
                              'en-PK'
                            )}
                          </td>

                          <td className="px-6 py-3.5 text-center">

                            <Link
                              to={`/invoices/${sale._id}`}
                              className="inline-flex p-1 hover:bg-gray-100 rounded text-indigo-600"
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

        </div>

        {/* URGENT DUES */}

        <div className="space-y-6">

          <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden no-split">

            <div className="p-4 border-b bg-red-50/50 border-red-100 flex items-center space-x-2">

              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />

              <h3 className="font-extrabold text-xs uppercase tracking-wider text-red-800">
                Urgent Due Installments
              </h3>

            </div>

            {stats?.installments
              ?.urgentInstallments &&
            stats.installments
              .urgentInstallments
              .length ===
              0 ? (

              <div className="p-6 text-center text-xs text-gray-400">
                No due or overdue installments detected for today!
              </div>

            ) : (

              <div className="divide-y divide-gray-100">

                {stats?.installments
                  ?.urgentInstallments &&
                  stats.installments.urgentInstallments.map(
                    (
                      inst
                    ) => (

                      <div
                        key={
                          inst._id
                        }
                        className="p-4 space-y-3 font-sans"
                      >

                        <div className="flex justify-between items-start">

                          <div>

                            <p className="text-xs font-black text-gray-900">
                              {
                                inst
                                  .installmentPlan
                                  ?.customer
                                  ?.fullName ||
                                'N/A'
                              }
                            </p>

                            <p className="text-[10px] text-gray-500 font-bold">
                              Mob:{' '}
                              {
                                inst
                                  .installmentPlan
                                  ?.customer
                                  ?.mobileNumber ||
                                ''
                              }
                            </p>

                          </div>

                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border ${
                              inst.status ===
                              'Overdue'
                                ? 'bg-red-50 border-red-100 text-red-700 animate-pulse'
                                : 'bg-amber-50 border-amber-100 text-amber-700'
                            }`}
                          >
                            {
                              inst.status
                            }
                          </span>

                        </div>

                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">

                          <span>
                            Month #
                            {
                              inst.installmentNumber
                            }{' '}
                            (
                            {
                              inst
                                .installmentPlan
                                ?.product
                                ?.name ||
                              'Item'
                            }
                            )
                          </span>

                          <span className="text-slate-900">
                            {
                              settings.currency
                            }{' '}
                            {Number(
                              inst.amount ||
                                0
                            ).toLocaleString()}
                          </span>

                        </div>

                        <div className="flex justify-between items-center border-t border-dashed pt-2">

                          <span className="text-[9px] text-red-500 font-semibold flex items-center space-x-1">

                            <Clock className="w-3 h-3" />

                            <span>
                              Due:{' '}
                              {new Date(
                                inst.dueDate
                              ).toLocaleDateString()}
                            </span>

                          </span>

                          <div className="flex space-x-1">

                            <button
                              onClick={() =>
                                handleSendUrgentReminder(
                                  inst
                                )
                              }
                              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 p-1.5 rounded transition-colors"
                              title="Send WhatsApp Due Alert"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>

                            <Link
                              to={`/installments/${inst.installmentPlan?._id}`}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors"
                            >
                              Settle
                            </Link>

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
  );
};

export default Dashboard;