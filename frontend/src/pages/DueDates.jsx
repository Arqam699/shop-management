import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import {
  CalendarClock,
  AlertCircle,
  Clock,
  Search,
  Eye,
  MessageCircle,
  CreditCard,
  User,
  Package,
  CalendarDays,
  Phone,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  CalendarRange,
  X,
  Building2,
} from 'lucide-react';

const DueDates = () => {
  const { settings } = useSettings();

  const [dueData, setDueData] = useState({
    overdue: [],
    dueToday: [],
    totalOverdue: 0,
    totalDueToday: 0,
    totalDue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // ======================================================
  // FETCH DUE INSTALLMENTS
  // ======================================================
  const fetchDueInstallments = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get('/api/installments/due');

      if (response.data?.success) {
        setDueData(
          response.data.data || {
            overdue: [],
            dueToday: [],
            totalOverdue: 0,
            totalDueToday: 0,
            totalDue: 0,
          }
        );
      }
    } catch (error) {
      console.error('Failed to fetch due installments:', error);
      toast.error(
        error.response?.data?.message || 'Failed to load due installments.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDueInstallments();
  }, []);

  // ======================================================
  // FORMAT CURRENCY & DATE
  // ======================================================
  const formatCurrency = (amount) => {
    return `${settings?.currency || 'PKR'} ${Number(amount || 0).toLocaleString('en-PK')}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ======================================================
  // WHATSAPP NUMBER FORMATTER
  // ======================================================
  const formatWhatsAppNumber = (phone) => {
    if (!phone) return '';
    let number = String(phone).replace(/[^0-9]/g, '');

    if (number.startsWith('0')) {
      number = `92${number.substring(1)}`;
    }

    if (number.startsWith('92') && number.length >= 12) {
      return number;
    }

    return '';
  };

  // ======================================================
  // WHATSAPP REMINDER
  // ======================================================
  const handleWhatsAppReminder = (item) => {
    const customer = item.installmentPlan?.customer;
    const phone = formatWhatsAppNumber(customer?.mobileNumber);

    if (!phone) {
      toast.error('Customer mobile number is missing or invalid.');
      return;
    }

    const name = customer?.fullName || 'Dear Customer';
    const product = item.installmentPlan?.product?.name || 'your product';
    const installmentNumber = item.installmentNumber || '-';
    const amount = Number(item.remainingAmount || item.amount || 0);
    const dueDate = formatDate(item.dueDate);

    let message = '';

    if (item.category === 'Overdue') {
      message =
        `Assalam-o-Alaikum ${name},\n\n` +
        `This is a reminder regarding your installment payment for ${product}.\n\n` +
        `Installment: #${installmentNumber}\n` +
        `Due Date: ${dueDate}\n` +
        `Remaining Amount: ${formatCurrency(amount)}\n\n` +
        `Your payment due date has passed. Please contact us or visit the shop to settle your payment.\n\n` +
        `Thank you - ${settings?.shopName || 'Electronics Shop'}`;
    } else {
      message =
        `Assalam-o-Alaikum ${name},\n\n` +
        `This is a reminder that your installment payment for ${product} is due today.\n\n` +
        `Installment: #${installmentNumber}\n` +
        `Due Date: ${dueDate}\n` +
        `Remaining Amount: ${formatCurrency(amount)}\n\n` +
        `Please contact us or visit the shop to settle your payment.\n\n` +
        `Thank you - ${settings?.shopName || 'Electronics Shop'}`;
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // ======================================================
  // SEARCH FILTER
  // ======================================================
  const searchFilter = (item) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;

    const customer = item.installmentPlan?.customer;
    const product = item.installmentPlan?.product;
    const sale = item.installmentPlan?.sale;

    const searchableText = [
      customer?.fullName,
      customer?.mobileNumber,
      customer?.customerId,
      product?.name,
      product?.brand,
      product?.model,
      product?.sku,
      sale?.saleId,
      item.installmentNumber,
      item.status,
      item.category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(search);
  };

  const filteredOverdue = useMemo(() => {
    return (dueData.overdue || []).filter(searchFilter);
  }, [dueData.overdue, searchTerm]);

  const filteredDueToday = useMemo(() => {
    return (dueData.dueToday || []).filter(searchFilter);
  }, [dueData.dueToday, searchTerm]);

  const toggleDetails = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // ======================================================
  // INSTALLMENT CARD COMPONENT
  // ======================================================
  const InstallmentCard = ({ item, type }) => {
    const plan = item.installmentPlan || {};
    const customer = plan.customer || {};
    const product = plan.product || {};
    const sale = plan.sale || {};

    const remainingAmount = Number(item.remainingAmount || 0);
    const paidAmount = Number(item.paidAmount || 0);
    const installmentAmount = Number(item.amount || 0);

    const cardId = `${item._id}-${type}`;
    const isExpanded = expandedId === cardId;
    const isOverdue = type === 'overdue';

    return (
      <div
        className={`group relative bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${
          isOverdue
            ? 'border-rose-200/80 hover:border-rose-300'
            : 'border-amber-200/80 hover:border-amber-300'
        }`}
      >
        {/* Top Glow Accent */}
        <div
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
            isOverdue
              ? 'from-rose-500 via-red-500 to-rose-400'
              : 'from-amber-500 via-orange-500 to-amber-400'
          }`}
        />

        {/* MAIN CARD BODY */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            
            {/* CUSTOMER INFO */}
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${
                  isOverdue
                    ? 'bg-rose-50 border-rose-100 text-rose-600'
                    : 'bg-amber-50 border-amber-100 text-amber-600'
                }`}
              >
                <User className="w-6 h-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 text-base truncate">
                    {customer.fullName || 'Unknown Customer'}
                  </h3>
                  {customer.customerId && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-600">
                      ID: {customer.customerId}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{customer.mobileNumber || 'No mobile recorded'}</span>
                </div>
              </div>
            </div>

            {/* PRODUCT */}
            <div className="flex items-start gap-3 min-w-0 xl:max-w-[240px] flex-1">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Package className="w-4 h-4" />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Purchased Item
                </p>
                <p className="font-bold text-xs text-slate-800 truncate mt-0.5">
                  {product.name || 'Unknown Product'}
                </p>
                {(product.brand || product.model) && (
                  <p className="text-[10px] text-slate-400 font-semibold truncate">
                    {[product.brand, product.model].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>

            {/* INSTALLMENT DURATION */}
            <div className="flex items-start gap-3 flex-1">
              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
                <CreditCard className="w-4 h-4" />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Installment
                </p>
                <p className="font-black text-xs text-slate-900 mt-0.5">
                  Month #{item.installmentNumber}
                </p>
                <p className="text-[10px] font-semibold text-slate-400">
                  of {plan.duration || '-'} Months Plan
                </p>
              </div>
            </div>

            {/* DUE DATE */}
            <div className="flex items-start gap-3 flex-1">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  isOverdue
                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Due Date
                </p>
                <p
                  className={`font-black text-xs mt-0.5 ${
                    isOverdue ? 'text-rose-600' : 'text-amber-600'
                  }`}
                >
                  {formatDate(item.dueDate)}
                </p>

                {isOverdue && item.daysOverdue ? (
                  <p className="text-[10px] font-black text-rose-500">
                    {item.daysOverdue} {item.daysOverdue === 1 ? 'day' : 'days'} overdue
                  </p>
                ) : (
                  <p className="text-[10px] font-black text-amber-600">
                    Payable Today
                  </p>
                )}
              </div>
            </div>

            {/* REMAINING AMOUNT */}
            <div className="text-left xl:text-right min-w-[140px]">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Remaining Due
              </p>
              <p
                className={`text-xl lg:text-2xl font-black tracking-tight mt-0.5 ${
                  isOverdue ? 'text-rose-600' : 'text-amber-600'
                }`}
              >
                {formatCurrency(remainingAmount)}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                Total: {formatCurrency(installmentAmount)}
              </p>
            </div>

          </div>

          {/* CARD ACTION BUTTONS */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => toggleDetails(cardId)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all hover:scale-[1.02] active:scale-95"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleWhatsAppReminder(item)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Reminder</span>
              </button>

              <Link
                to={`/installments/${plan._id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-md shadow-blue-950/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Settle Payment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* EXPANDED DETAILS DRAWER */}
        {isExpanded && (
          <div className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6 animate-[pageEnter_0.25s_ease-out]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* Customer Box */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-xs font-black text-slate-800">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Customer Info</span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-800">{customer.fullName || 'N/A'}</p>
                  <p className="text-slate-500">{customer.mobileNumber || 'No Phone'}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">City: {customer.city || '—'}</p>
                </div>
              </div>

              {/* Product Box */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-xs font-black text-slate-800">
                  <Package className="w-3.5 h-3.5 text-violet-600" />
                  <span>Product Details</span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-800 truncate">{product.name || 'N/A'}</p>
                  <p className="text-slate-500 truncate">{[product.brand, product.model].filter(Boolean).join(' / ') || 'N/A'}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">SKU: {product.sku || '—'}</p>
                </div>
              </div>

              {/* Installment Box */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-xs font-black text-slate-800">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Installment Status</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(installmentAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Paid:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className={`font-black ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financing Plan Box */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-xs font-black text-slate-800">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Financing Plan</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plan ID:</span>
                    <span className="font-bold text-slate-800">{plan.planId || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Invoice:</span>
                    <span className="font-bold text-slate-800">{sale.saleId || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Remaining:</span>
                    <span className="font-black text-rose-600">{formatCurrency(plan.remainingBalance)}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
              <Link
                to={`/installments/${plan._id}`}
                className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Full Financing Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ======================================================
  // LOADING STATE
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 animate-pulse opacity-25" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
              <RefreshCw className="w-7 h-7 text-blue-400 animate-spin" />
            </div>
          </div>
          <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-slate-800">
            Checking Due Dates
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Calculating overdue & today's customer installments...
          </p>
        </div>
      </div>
    );
  }

  // ======================================================
  // PAGE RENDER
  // ======================================================
  return (
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">

      {/* =====================================================
          DARK HERO HEADER
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
                  Installment Alerts
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-bold text-slate-400">
                  Real-time Dues Monitor
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Due Dates & Overdue Dues
              </h1>

              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                Track pending customer payments, send automated WhatsApp reminders, and settle installments.
              </p>
            </div>

            <button
              onClick={() => fetchDueInstallments(true)}
              disabled={refreshing}
              className="group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60 self-start xl:self-auto"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 transition-transform duration-500 ${
                  refreshing ? 'animate-spin text-blue-400' : 'group-hover:rotate-180'
                }`}
              />
              <span>Refresh Dues</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          SUMMARY KPI METRICS
      ====================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Overdue */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-rose-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Overdue Installments
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-rose-600">
                {dueData.totalOverdue}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Date has passed
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Due Today */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-amber-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Due Today
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-amber-600">
                {dueData.totalDueToday}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Payable on today's date
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Total Active Due */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-blue-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-violet-600" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Total Pending Dues
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {dueData.totalDue}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Overdue + Today's count
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>
        </div>

      </div>

      {/* =====================================================
          SEARCH TOOLBAR
      ====================================================== */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5 sm:p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer name, mobile, product, customer ID, or invoice ID..."
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
      </section>

      {/* =====================================================
          OVERDUE INSTALLMENTS SECTION
      ====================================================== */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Overdue Installments
              </h2>
              <p className="text-xs text-slate-400">
                Customer payments whose due date has passed.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-black self-start sm:self-auto border border-rose-200">
            {filteredOverdue.length} Records Found
          </span>
        </div>

        {filteredOverdue.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-black text-slate-800 text-base">
              No Overdue Installments
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Great! There are no unpaid overdue installments at this moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOverdue.map((item) => (
              <InstallmentCard
                key={`${item._id}-overdue`}
                item={item}
                type="overdue"
              />
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          DUE TODAY INSTALLMENTS SECTION
      ====================================================== */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Installments Due Today
              </h2>
              <p className="text-xs text-slate-400">
                Payments scheduled for collection today.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-black self-start sm:self-auto border border-amber-200">
            {filteredDueToday.length} Records Found
          </span>
        </div>

        {filteredDueToday.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-7 h-7" />
            </div>
            <h3 className="font-black text-slate-800 text-base">
              No Installments Due Today
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              There are no unpaid customer installments scheduled for today.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDueToday.map((item) => (
              <InstallmentCard
                key={`${item._id}-today`}
                item={item}
                type="dueToday"
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

export default DueDates;