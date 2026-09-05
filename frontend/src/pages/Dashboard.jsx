import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { 
  Boxes, Users, ShoppingCart, Layers, TrendingUp, Wallet, ShieldCheck, Eye, FileSpreadsheet, Calendar, PlusCircle, Clock, AlertCircle, Search, Sparkles, MessageCircle
} from 'lucide-react';

const Dashboard = () => {
  const { settings } = useSettings();
  const [stats, setStats] = useState(null); 
  const [loading, setLoading] = useState(true);

  const [activeTableTab, setActiveTableTab] = useState(0);
  const [filterPreset, setFilterPreset] = useState('all'); 
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/reports/dashboard');
      if (response.data && response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatWhatsAppNumber = (phoneStr) => {
    if (!phoneStr) return '';
    let clean = phoneStr.replace(/[^0-9]/g, '');
    if (clean.startsWith('03')) {
      clean = '92' + clean.slice(1);
    } else if (clean.startsWith('3')) {
      clean = '92' + clean;
    }
    return clean;
  };

  // URGENT REMINDER FROM DASHBOARD (Tareeqh guzar chuki hai message)
 const handleSendUrgentReminder = (inst) => {
  const phone = formatWhatsAppNumber(
    inst.installmentPlan?.customer?.mobileNumber
  );

  if (!phone) {
    return alert("Customer phone number is missing or invalid.");
  }

  const customerName =
    inst.installmentPlan?.customer?.fullName || "Customer";

  const productName =
    inst.installmentPlan?.product?.name || "Item";

  const dueDateFormatted = new Date(inst.dueDate).toLocaleDateString("en-PK");

  const message = `*⚠️ URGENT INSTALLMENT REMINDER*
━━━━━━━━━━━━━━━━━━━━

Assalam-o-Alaikum *${customerName}*,

Aapko yaad dilaya jata hai ke aapki *${productName}* ki kist k date guzar chuke hai aur abhi tak aapki payment receive nahi hui hai...:

📅 *Due Date:* ${dueDateFormatted}


💰 *Installment Amount:* ${settings.currency} ${inst.amount.toLocaleString()}
🔢 *Installment:* Month #${inst.installmentNumber}

Meharbani farma kar apni installment *jald az jald* jama karwa dein, taake aapka payment record updated rahe aur kisi bhi mushkil se bacha sake.

Agar aap payment already kar chuke hain to is message ko ignore karein ya payment details share kar dein.

━━━━━━━━━━━━━━━━━━━━
🏪 *Dukan:* ${settings.shopName || "Electronics Shop"}
📞 *Phone:* ${settings.shopPhone || ""}
━━━━━━━━━━━━━━━━━━━━

*Shukriya - ${settings.shopName || "Electronics Shop"}*`;

  const encoded = encodeURIComponent(message);

  window.open(
    `https://wa.me/${phone}?text=${encoded}`,
    "_blank"
  );
};
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-600 text-sm font-semibold tracking-wide">Syncing with cloud database...</span>
      </div>
    );
  }

  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterPreset === 'all') return true;
    if (filterPreset === 'today') return date.getTime() === today.getTime();
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

  const filteredSalesList = (stats?.sales?.salesList || []).filter(s => isDateInFilter(s.saleDate));
  const filteredFinancingList = (stats?.installments?.activeFinancingList || []).filter(p => isDateInFilter(p.createdAt));
  const filteredPaymentsList = (stats?.installments?.paymentsList || []).filter(pay => isDateInFilter(pay.paymentDate));
  const filteredExpensesList = (stats?.expenses?.expensesList || []).filter(e => isDateInFilter(e.expenseDate));

  const totalSalesVal = filteredSalesList.reduce((sum, s) => sum + (s.finalTotal || 0), 0);
  const totalCollected = filteredPaymentsList.reduce((sum, pay) => sum + (pay.amount || 0), 0) + filteredSalesList.reduce((sum, s) => sum + (s.downPayment || 0), 0);
  const totalOutstanding = filteredFinancingList.reduce((sum, p) => sum + (p.remainingBalance || 0), 0);

  const totalRevenue = totalSalesVal;
  const totalCostOfSold = filteredSalesList.reduce((sum, s) => sum + ((s.quantity || 0) * (s.product?.purchasePrice || 0)), 0);
  const grossProfit = totalRevenue - totalCostOfSold; 
  const totalExpensesVal = filteredExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfitVal = grossProfit - totalExpensesVal; 

  const searchFilter = (item) => {
    if (!globalSearch) return true;
    const term = globalSearch.toLowerCase();
    const custName = item.customer?.fullName?.toLowerCase() || '';
    const custPhone = item.customer?.mobileNumber || '';
    const id = (item.saleId || item.planId || '').toLowerCase();
    const prodName = item.product?.name?.toLowerCase() || '';
    return custName.includes(term) || custPhone.includes(term) || id.includes(term) || prodName.includes(term);
  };

  const cashSales = filteredSalesList.filter(s => s.paymentType === 'Cash' && searchFilter(s));
  const activeFinancingLedgerList = filteredFinancingList.filter(p => searchFilter(p));

  const firstRowKpis = [
    { name: 'Filtered Sales Revenue', value: `${settings.currency} ${totalSalesVal.toLocaleString()}`, icon: ShoppingCart, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { name: 'Filtered Total Collected', value: `${settings.currency} ${totalCollected.toLocaleString()}`, icon: Wallet, color: 'text-green-600 bg-green-50 border-green-100' },
    { name: 'Outstanding Financed Dues', value: `${settings.currency} ${totalOutstanding.toLocaleString()}`, icon: Layers, color: 'text-purple-600 bg-purple-50 border-purple-100' },
  ];

  const secondRowKpis = [
    { name: 'Audited Gross Profit', value: `${settings.currency} ${grossProfit.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { name: 'Total Operational Expenses', value: `${settings.currency} ${totalExpensesVal.toLocaleString()}`, icon: Wallet, color: 'text-amber-600 bg-amber-50 border-amber-100' }, 
    { name: 'After Expenses Net Profit', value: `${settings.currency} ${netProfitVal.toLocaleString()}`, icon: Sparkles, color: 'text-rose-600 bg-rose-50 border-rose-100 animate-pulse' }, 
  ];

  const handleDownloadCSV = () => {
    if (filteredSalesList.length === 0) return alert('No transaction data found in this selected date range.');
    const headers = ['Invoice ID,Customer Name,Product,Qty,Net Price,Payment Method,Date & Time'];
    const rows = filteredSalesList.map(s => {
      const dateFormatted = new Date(s.saleDate).toLocaleString('en-PK');
      return `"${s.saleId}","${s.customer?.fullName || 'Walk-in'}","${s.product?.name || 'Deleted Product'}",${s.quantity},${s.finalTotal},"${s.paymentType}","${dateFormatted}"`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dukan_Ledger_Report_${filterPreset}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 border border-gray-200 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{settings?.shopName || 'Electronics Shop'} Dashboard</h2>
          <p className="text-sm text-gray-500 font-medium">Digital control center and billing auditing registers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/sales/new" className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors">
            <PlusCircle className="w-4 h-4" />
            <span>New Checkout</span>
          </Link>
          <Link to="/customers/add" className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors">
            <Users className="w-4 h-4" />
            <span>Register Customer</span>
          </Link>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
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
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All-Time' },
              { id: 'today', label: 'Today (Daily)' },
              { id: 'week', label: 'Weekly (7 Days)' },
              { id: 'month', label: 'Monthly (This Month)' },
              { id: 'custom', label: 'Custom Range' }
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => setFilterPreset(preset.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-colors ${
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
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* SPACIOUS KPI CARDS */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {firstRowKpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.name} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">{kpi.name}</span>
                  <p className="text-2xl font-black text-slate-800 tracking-tight">{kpi.value}</p>
                </div>
                <div className={`p-3.5 rounded-xl border shrink-0 ${kpi.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {secondRowKpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.name} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">{kpi.name}</span>
                  <p className="text-2xl font-black text-slate-800 tracking-tight">{kpi.value}</p>
                </div>
                <div className={`p-3.5 rounded-xl border shrink-0 ${kpi.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TWO COLUMN CONTENT */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-gray-50/50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-gray-200/60 p-1 rounded-xl self-start">
              <button
                onClick={() => setActiveTableTab(0)}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-colors ${
                  activeTableTab === 0 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-slate-900 hover:bg-gray-100'
                }`}
              >
                Financing Installment Ledger ({activeFinancingLedgerList.length})
              </button>
              <button
                onClick={() => setActiveTableTab(1)}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-colors ${
                  activeTableTab === 1 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-slate-900 hover:bg-gray-100'
                }`}
              >
                Cash Deals Ledger ({cashSales.length})
              </button>
            </div>
          </div>

          {activeTableTab === 0 && (
            <div className="overflow-x-auto">
              {activeFinancingLedgerList.length === 0 ? (
                <p className="p-10 text-center text-xs text-gray-400">No active financing installment plans found.</p>
              ) : (
                <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">
                  <thead className="bg-gray-50 border-b text-xs font-bold uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Plan ID</th>
                      <th className="px-6 py-4">Buyer Name</th>
                      <th className="px-6 py-4">Financed Item</th>
                      <th className="px-6 py-4 text-right">Received</th>
                      <th className="px-6 py-4 text-right">Remaining dues</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activeFinancingLedgerList.map((plan) => {
                      const totalWithMarkup = plan.totalAmount || 0;
                      const remaining = plan.remainingBalance || 0;
                      const amountReceived = Math.max(0, totalWithMarkup - remaining);

                      return (
                        <tr key={plan._id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-3.5 text-indigo-600 font-bold tracking-wider">{plan.planId}</td>
                          <td className="px-6 py-3.5 font-bold text-gray-900">{plan.customer?.fullName || 'Walk-in'}</td>
                          <td className="px-6 py-3.5 text-slate-700 text-xs">{plan.product?.name || 'Item'}</td>
                          <td className="px-6 py-3.5 text-right text-green-700 font-bold">+{settings.currency} {amountReceived.toLocaleString()}</td>
                          <td className="px-6 py-3.5 text-right text-red-600 font-black">{settings.currency} {remaining.toLocaleString()}</td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                              plan.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-700' :
                              plan.status === 'Overdue' ? 'bg-red-50 border-red-200 text-red-700' :
                              'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                              {plan.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <Link to={`/installments/${plan._id}`} className="inline-flex p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                              <Eye className="w-4 h-4" />
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

          {activeTableTab === 1 && (
            <div className="overflow-x-auto">
              {cashSales.length === 0 ? (
                <p className="p-10 text-center text-xs text-gray-400">No completed cash deals found.</p>
              ) : (
                <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">
                  <thead className="bg-gray-50 border-b text-xs font-bold uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Invoice ID</th>
                      <th className="px-6 py-4">Buyer Name</th>
                      <th className="px-6 py-4">Product Purchased</th>
                      <th className="px-6 py-4 text-center">Quantity</th>
                      <th className="px-6 py-4 text-right">Deal Cost</th>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4 text-center">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cashSales.map((sale) => (
                      <tr key={sale._id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3.5 text-indigo-600 font-bold tracking-wider">{sale.saleId}</td>
                        <td className="px-6 py-3.5 font-bold text-gray-900">{sale.customer?.fullName || 'Walk-in'}</td>
                        <td className="px-6 py-3.5 text-slate-800 text-xs">{sale.product?.name || 'Item'}</td>
                        <td className="px-6 py-3.5 text-center text-slate-900 font-bold">{sale.quantity}</td>
                        <td className="px-6 py-3.5 text-right font-extrabold text-green-600">{settings.currency} {sale.finalTotal.toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-xs text-gray-500">{new Date(sale.saleDate).toLocaleString('en-PK')}</td>
                        <td className="px-6 py-3.5 text-center">
                          <Link to={`/invoices/${sale._id}`} className="inline-flex p-1 hover:bg-gray-100 rounded text-indigo-600">
                            <Eye className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Urgent Dues Alerts */}
        <div className="space-y-6">
          <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden no-split">
            <div className="p-4 border-b bg-red-50/50 border-red-100 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-red-800">Urgent Due Installments</h3>
            </div>
            
            {stats?.installments?.urgentInstallments && stats.installments.urgentInstallments.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                No due or overdue installments detected for today!
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats?.installments?.urgentInstallments && stats.installments.urgentInstallments.map(inst => (
                  <div key={inst._id} className="p-4 space-y-3 font-sans">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-gray-900">{inst.installmentPlan?.customer?.fullName || 'N/A'}</p>
                        <p className="text-[10px] text-gray-500 font-bold">Mob: {inst.installmentPlan?.customer?.mobileNumber || ''}</p>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border ${
                        inst.status === 'Overdue' ? 'bg-red-50 border-red-100 text-red-700 animate-pulse' : 'bg-amber-50 border-amber-100 text-amber-700'
                      }`}>
                        {inst.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>Month #{inst.installmentNumber} ({inst.installmentPlan?.product?.name || 'Item'})</span>
                      <span className="text-slate-900">{settings.currency} {inst.amount.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-dashed pt-2">
                      <span className="text-[9px] text-red-500 font-semibold flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Due: {new Date(inst.dueDate).toLocaleDateString()}</span>
                      </span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleSendUrgentReminder(inst)}
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
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;