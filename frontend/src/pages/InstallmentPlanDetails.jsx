import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  MessageCircle,
  Package,
  Phone,
  Receipt,
  User,
  Wallet,
  X,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Split,
  Sparkles,
  Printer,
  ShieldCheck,
  CheckCircle2,
  CalendarDays,
  Percent,
  CircleDollarSign,
  ArrowRight,
  TrendingDown,
  Building2,
} from 'lucide-react';

import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

const InstallmentPlanDetails = () => {
  const { id } = useParams();
  const { settings } = useSettings();

  const [plan, setPlan] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const currency = settings?.currency || 'PKR';

  // =========================================================
  // HELPERS
  // =========================================================

  const roundMoney = (value) => {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  };

  const formatMoney = (amount) => {
    return `${currency} ${Number(amount || 0).toLocaleString('en-PK')}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // =========================================================
  // FETCH PLAN
  // =========================================================

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/api/installments/${id}`);

      if (response.data?.success) {
        setPlan(response.data.data.plan);
        setInstallments(response.data.data.installments || []);
        setPayments(response.data.data.payments || []);
      } else {
        setError(response.data?.message || 'Failed to load installment plan.');
      }
    } catch (err) {
      console.error('Failed to fetch installment plan:', err);
      setError(
        err.response?.data?.message || 'Failed to load installment plan.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPlan();
    }
  }, [id]);

  // =========================================================
  // SALE / PLAN CALCULATION
  // =========================================================

  const sale = plan?.sale || {};
  const quantity = Number(sale?.quantity || 1);
  const productUnitPrice = Number(sale?.unitPrice || 0);
  const subtotal = Number(sale?.subtotal) || quantity * productUnitPrice;
  const discount = Number(sale?.discount || 0);

  let originalPrice = 0;
  if (sale?.finalTotal !== undefined && sale?.finalTotal !== null) {
    originalPrice = Number(sale.finalTotal) || 0;
  } else {
    originalPrice = Math.max(0, subtotal - discount);
  }

  const downPayment = Number(plan?.downPayment || sale?.downPayment || 0);
  const duration = Number(
    plan?.duration || sale?.installmentDuration || installments?.length || 0
  );

  let markupPercent = 0;
  if (duration === 3) {
    markupPercent = 15;
  } else if (duration === 6) {
    markupPercent = 25;
  } else if (duration === 12) {
    markupPercent = 50;
  } else {
    if (duration <= 3) {
      markupPercent = 15;
    } else if (duration <= 6) {
      markupPercent = 25;
    } else {
      markupPercent = 50;
    }
  }

  const remainingPrincipal = Math.max(0, originalPrice - downPayment);
  const calculatedMarkupAmount = Math.round(
    remainingPrincipal * (markupPercent / 100)
  );

  const totalPayable = Number(
    plan?.totalAmount || originalPrice + calculatedMarkupAmount
  );

  const installmentTotal = Math.max(0, totalPayable - downPayment);

  const currentInstallmentTotal = installments.reduce(
    (sum, inst) => sum + Number(inst.amount || 0),
    0
  );

  const averageMonthlyInstallment =
    duration > 0 ? currentInstallmentTotal / duration : 0;

  const totalPaidInInstallments = installments.reduce(
    (sum, inst) => sum + Number(inst.paidAmount || 0),
    0
  );

  const totalCustomerPaid = downPayment + totalPaidInInstallments;

  const remainingBalance = Number(
    plan?.remainingBalance ?? Math.max(0, totalPayable - totalCustomerPaid)
  );

  const paymentProgress =
    totalPayable > 0
      ? Math.min(100, Math.max(0, (totalCustomerPaid / totalPayable) * 100))
      : 0;

  const paidInstallments = installments.filter(
    (inst) => inst.status === 'Paid' || inst.status === 'Settled'
  ).length;

  const partialInstallments = installments.filter(
    (inst) => inst.status === 'Partially Paid'
  ).length;

  const invoiceBillNumber = sale?.saleId || plan?.planId || 'N/A';
  const planStartDate = plan?.createdAt || sale?.createdAt;

  // =========================================================
  // SELECTED PAYMENT CALCULATIONS
  // =========================================================

  const selectedRemaining = Number(selectedInstallment?.remainingAmount || 0);
  const enteredPayment = Number(paymentAmount || 0);
  const paymentDifference = roundMoney(enteredPayment - selectedRemaining);

  const isPartialPayment =
    enteredPayment > 0 && enteredPayment < selectedRemaining;
  const isExactPayment =
    enteredPayment > 0 && enteredPayment === selectedRemaining;
  const isOverPayment = enteredPayment > selectedRemaining;

  const futureInstallments = useMemo(() => {
    if (!selectedInstallment) {
      return [];
    }

    return installments.filter(
      (inst) =>
        Number(inst.installmentNumber) >
          Number(selectedInstallment.installmentNumber) &&
        Number(inst.remainingAmount || 0) > 0
    );
  }, [installments, selectedInstallment]);

  const estimatedEqualAdjustment =
    isOverPayment && futureInstallments.length > 0
      ? roundMoney(paymentDifference / futureInstallments.length)
      : 0;

  // =========================================================
  // PAYMENT MODAL CONTROLS
  // =========================================================

  const openPaymentModal = (installment) => {
    setSelectedInstallment(installment);
    setPaymentAmount(Number(installment?.remainingAmount || 0).toString());
    setPaymentMethod('Cash');
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    if (paymentLoading) return;
    setShowPaymentModal(false);
    setSelectedInstallment(null);
    setPaymentAmount('');
    setPaymentMethod('Cash');
  };

  // =========================================================
  // HANDLE PAYMENT SUBMIT
  // =========================================================

  const handlePayment = async (e) => {
    e.preventDefault();

    if (!selectedInstallment) return;

    const amount = roundMoney(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    const remaining = roundMoney(selectedInstallment.remainingAmount);

    if (remaining <= 0) {
      toast.error('This installment is already paid.');
      return;
    }

    try {
      setPaymentLoading(true);

      const response = await api.post(
        `/api/installments/${selectedInstallment._id}/pay`,
        {
          installmentId: selectedInstallment._id,
          paymentAmount: amount,
          paymentMethod,
          notes: '',
        }
      );

      if (response.data?.success) {
        const extraPayment = Number(
          response.data?.extraPayment ||
            response.data?.carryForwardAmount ||
            0
        );

        if (extraPayment > 0) {
          toast.success(
            `Payment recorded. ${formatMoney(
              extraPayment
            )} extra payment was adjusted across remaining installments.`
          );
        } else if (amount < remaining) {
          toast.success(
            `Partial payment recorded. ${formatMoney(
              remaining - amount
            )} remains on this installment.`
          );
        } else {
          toast.success(
            response.data?.message || 'Payment recorded successfully.'
          );
        }

        closePaymentModal();
        await fetchPlan();
      } else {
        toast.error(
          response.data?.message || 'Failed to record payment.'
        );
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(
        err.response?.data?.message || 'Failed to record payment.'
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  // =========================================================
  // WHATSAPP REMINDER
  // =========================================================

  const formatWhatsAppNumber = (phone) => {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[^0-9]/g, '');

    if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
    if (cleaned.startsWith('0')) cleaned = `92${cleaned.substring(1)}`;
    if (!cleaned.startsWith('92') && cleaned.length === 10) {
      cleaned = `92${cleaned}`;
    }
    return cleaned;
  };

  const handleSendWhatsAppReminder = (installment) => {
    const phone = formatWhatsAppNumber(plan?.customer?.mobileNumber);

    if (!phone) {
      toast.error('Customer mobile number is missing or invalid.');
      return;
    }

    const customerName = plan?.customer?.fullName || 'Customer';
    const dueAmount = Number(installment?.remainingAmount || 0);
    const dueDate = installment?.dueDate ? formatDate(installment.dueDate) : 'N/A';

    const message = `Assalam-o-Alaikum ${customerName},

This is a reminder regarding your installment plan at ${settings?.shopName || 'Electronics Shop'}.

Installment: Month #${installment.installmentNumber}
Due Amount: ${formatMoney(dueAmount)}
Due Date: ${dueDate}

Please visit our shop to settle your payment.

Thank you - ${settings?.shopName || 'Electronics Shop'}`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // =========================================================
  // STATUS BADGE CLASS HELPERS
  // =========================================================

  const getStatusClasses = (status) => {
    if (status === 'Paid' || status === 'Settled') {
      return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    }
    if (status === 'Overdue') {
      return 'bg-rose-50 border-rose-200 text-rose-700';
    }
    if (status === 'Partially Paid') {
      return 'bg-amber-50 border-amber-200 text-amber-700';
    }
    return 'bg-blue-50 border-blue-200 text-blue-700';
  };

  // =========================================================
  // LOADING STATE
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 animate-pulse opacity-25" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-blue-400 animate-pulse" />
            </div>
          </div>
          <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-slate-800">
            Loading Financing Plan
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Compiling installment schedule and recovery ledgers...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR STATE
  // =========================================================

  if (error || !plan) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 animate-[pageEnter_0.3s_ease-out]">
        <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-black text-slate-900">
            Failed to Load Plan
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {error || 'Installment plan record not found in database.'}
          </p>

          <Link
            to="/installments"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Installments Directory
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN RENDER
  // =========================================================

  return (
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO HEADER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white no-print">
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5">
              <Link
                to="/installments"
                className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Back to Installments"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">
                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                    Financing Schedule
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[9px] font-bold text-slate-400">
                    Plan ID: {plan.planId || 'N/A'}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                  Installment Plan Details
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all hover:scale-[1.02] active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print Schedule Slip</span>
              </button>

              <div
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border ${
                  plan.status === 'Completed'
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    : plan.status === 'Overdue'
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                    : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                }`}
              >
                {plan.status === 'Completed' ? (
                  <CheckCircle2 size={16} />
                ) : plan.status === 'Overdue' ? (
                  <AlertCircle size={16} />
                ) : (
                  <Clock size={16} />
                )}
                <span>{plan.status}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          CUSTOMER + SALE INFORMATION CARDS
      ====================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 no-print">
        
        {/* CUSTOMER CARD */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Customer Information</h2>
              <p className="text-[10px] text-slate-400 font-semibold">Tied account details</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">Full Name</span>
              <p className="font-black text-slate-800 mt-0.5 truncate">{plan.customer?.fullName || 'N/A'}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">Customer ID</span>
              <p className="font-black text-indigo-600 mt-0.5 truncate">{plan.customer?.customerId || 'N/A'}</p>
            </div>

            <div className="col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-black text-slate-400 block">Mobile Contact</span>
                <p className="font-bold text-slate-800 mt-0.5">{plan.customer?.mobileNumber || 'N/A'}</p>
              </div>
              <Phone className="w-4 h-4 text-blue-500" />
            </div>
          </div>
        </div>

        {/* SALE CARD */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Purchased Item & Invoice</h2>
              <p className="text-[10px] text-slate-400 font-semibold">Financed stock details</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">Invoice / Deal #</span>
              <p className="font-black text-indigo-600 mt-0.5 truncate">{invoiceBillNumber}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">Plan Start Date</span>
              <p className="font-bold text-slate-800 mt-0.5 truncate">{formatDate(planStartDate)}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">Product</span>
              <p className="font-black text-slate-800 mt-0.5 truncate">{plan.product?.name || 'N/A'}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">Financed Quantity</span>
              <p className="font-black text-slate-800 mt-0.5">{quantity} Unit{quantity !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

      </div>

      {/* =====================================================
          INSTALLMENT CALCULATION BREAKDOWN
      ====================================================== */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm no-print">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-950/20 shrink-0">
            <Receipt size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              Financing Markup & Installment Calculation
            </h2>
            <p className="text-xs text-slate-400 font-semibold">
              How this customer plan was calculated from purchase price
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5">
            <p className="text-[9px] uppercase font-black text-slate-400">Sale Total</p>
            <p className="text-base font-black text-slate-900 mt-1">{formatMoney(originalPrice)}</p>
          </div>

          <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200/80 p-3.5">
            <p className="text-[9px] uppercase font-black text-emerald-700">Down Payment</p>
            <p className="text-base font-black text-emerald-700 mt-1">+{formatMoney(downPayment)}</p>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5">
            <p className="text-[9px] uppercase font-black text-slate-400">Principal Amount</p>
            <p className="text-base font-black text-blue-600 mt-1">{formatMoney(remainingPrincipal)}</p>
          </div>

          <div className="bg-amber-50/60 rounded-2xl border border-amber-200/80 p-3.5">
            <p className="text-[9px] uppercase font-black text-amber-700">Markup ({markupPercent}%)</p>
            <p className="text-base font-black text-amber-700 mt-1">+{formatMoney(calculatedMarkupAmount)}</p>
          </div>

          <div className="bg-indigo-50/60 rounded-2xl border border-indigo-200/80 p-3.5">
            <p className="text-[9px] uppercase font-black text-indigo-700">Total Installments</p>
            <p className="text-base font-black text-indigo-700 mt-1">{formatMoney(installmentTotal)}</p>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5">
            <p className="text-[9px] uppercase font-black text-slate-400">Duration</p>
            <p className="text-base font-black text-slate-900 mt-1">{duration} Months</p>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/5 via-violet-500/5 to-transparent border border-blue-500/15 text-xs text-slate-700 font-semibold flex flex-wrap items-center gap-2">
          <span className="text-blue-600 font-black">Calculation Formula:</span>
          <span>({formatMoney(originalPrice)} − {formatMoney(downPayment)}) = {formatMoney(remainingPrincipal)}</span>
          <span>→</span>
          <span>({formatMoney(remainingPrincipal)} + {markupPercent}% Markup) = <strong className="text-slate-900 font-black">{formatMoney(installmentTotal)}</strong> total / {duration} months</span>
        </div>
      </section>

      {/* =====================================================
          PAYMENT PROGRESS & BALANCES
      ====================================================== */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-black text-slate-900">Recovery & Payment Progress</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {paidInstallments} of {installments.length} installments paid in full {partialInstallments > 0 ? `(${partialInstallments} partial)` : ''}
            </p>
          </div>

          <span className="text-xl sm:text-2xl font-black text-slate-900 self-start sm:self-auto">
            {paymentProgress.toFixed(1)}% <span className="text-xs font-bold text-slate-400">Cleared</span>
          </span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
          <div
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-700 shadow-sm"
            style={{ width: `${paymentProgress}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
            <span className="text-[9px] uppercase font-black tracking-wider text-emerald-800">Total Customer Paid</span>
            <p className="text-xl font-black text-emerald-700 mt-1">{formatMoney(totalCustomerPaid)}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Down Payment + Installments</p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/70">
            <span className="text-[9px] uppercase font-black tracking-wider text-rose-800">Remaining Balance</span>
            <p className="text-xl font-black text-rose-700 mt-1">{formatMoney(remainingBalance)}</p>
            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Pending to be collected</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[9px] uppercase font-black tracking-wider text-slate-500">Total Deal Payable</span>
            <p className="text-xl font-black text-slate-900 mt-1">{formatMoney(totalPayable)}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Grand total with markup</p>
          </div>
        </div>
      </section>

      {/* =====================================================
          INSTALLMENT SCHEDULE TABLE (ON-SCREEN)
      ====================================================== */}
      <section className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm no-print">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900">Installment Schedule & Dues</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {duration} Monthly payment installments
            </p>
          </div>

          <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            Schedule Total: <strong className="text-blue-600">{formatMoney(currentInstallmentTotal)}</strong>
          </span>
        </div>

        {installments.length === 0 ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-400">
            No installments found for this plan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 text-center">#</th>
                  <th className="px-5 py-3.5">Required Amount</th>
                  <th className="px-5 py-3.5">Paid</th>
                  <th className="px-5 py-3.5">Remaining</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5">Paid Date</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {installments.map((inst) => {
                  const instAmount = Number(inst.amount || 0);
                  const paidAmount = Number(inst.paidAmount || 0);
                  const remainingAmount = Number(inst.remainingAmount || 0);
                  const isPaid = inst.status === 'Paid' || inst.status === 'Settled';

                  return (
                    <tr key={inst._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 text-center font-black text-slate-800">
                        Month #{inst.installmentNumber}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-black text-slate-900">{formatMoney(instAmount)}</span>
                        {Number(inst.originalAmount || 0) !== instAmount && (
                          <span className="text-[10px] text-slate-400 block font-normal">
                            Orig: {formatMoney(inst.originalAmount)}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 font-black text-emerald-600">
                        {formatMoney(paidAmount)}
                      </td>

                      <td className="px-5 py-4 font-black text-rose-600">
                        {formatMoney(remainingAmount)}
                      </td>

                      <td className="px-5 py-4 font-bold text-blue-600">
                        {formatDate(inst.dueDate)}
                      </td>

                      <td className="px-5 py-4 text-slate-500 font-semibold">
                        {inst.paidDate ? formatDate(inst.paidDate) : '—'}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border ${getStatusClasses(
                            inst.status
                          )}`}
                        >
                          {inst.status === 'Paid' ? (
                            <CheckCircle2 size={12} />
                          ) : inst.status === 'Overdue' ? (
                            <AlertCircle size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          <span>{inst.status}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {!isPaid ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openPaymentModal(inst)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black hover:opacity-95 shadow-sm transition-all hover:scale-105 active:scale-95"
                            >
                              <CreditCard size={13} />
                              <span>Pay</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppReminder(inst)}
                              className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all hover:scale-105 active:scale-95"
                              title="Send WhatsApp Payment Alert"
                            >
                              <MessageCircle size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-black text-xs">
                            <CheckCircle2 size={14} />
                            <span>Paid</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          RECORD PAYMENT MODAL
      ====================================================== */}
      {showPaymentModal && selectedInstallment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-[pageEnter_0.25s_ease-out]">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="relative bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-950/40">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">
                    Settle Installment Payment
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Installment #{selectedInstallment.installmentNumber} • Due: {formatDate(selectedInstallment.dueDate)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closePaymentModal}
                disabled={paymentLoading}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-black text-slate-400 block">Required Monthly Due</span>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{formatMoney(selectedInstallment.amount)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-black text-rose-500 block">Remaining Due</span>
                  <p className="text-base font-black text-rose-600 mt-0.5">{formatMoney(selectedInstallment.remainingAmount)}</p>
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Enter Payment Amount ({currency}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-12 border border-slate-200 rounded-xl px-4 text-base font-black text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />
              </div>

              {/* LIVE ADJUSTMENT PREVIEW */}
              {enteredPayment > 0 && (
                <div className="space-y-3 animate-[pageEnter_0.2s_ease-out]">
                  {isPartialPayment && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      <div className="flex items-center gap-2 font-black">
                        <ArrowDownCircle className="w-4 h-4 text-amber-600" />
                        <span>Partial Payment Mode</span>
                      </div>
                      <p className="mt-1 font-semibold">
                        Paying {formatMoney(enteredPayment)}. Remaining on this installment will be <strong className="text-rose-600">{formatMoney(selectedRemaining - enteredPayment)}</strong>.
                      </p>
                    </div>
                  )}

                  {isExactPayment && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                      <div className="flex items-center gap-2 font-black">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Exact Full Installment Payment</span>
                      </div>
                      <p className="mt-1 font-semibold">
                        Installment #{selectedInstallment.installmentNumber} will be completely cleared.
                      </p>
                    </div>
                  )}

                  {isOverPayment && (
                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-2">
                      <div className="flex items-center gap-2 font-black">
                        <ArrowUpCircle className="w-4 h-4 text-indigo-600" />
                        <span>Overpayment / Extra Split Adjustment</span>
                      </div>
                      <p className="font-semibold">
                        This installment will be cleared, and <strong className="text-indigo-700">{formatMoney(paymentDifference)}</strong> extra will auto-split across {futureInstallments.length} remaining installments (~{formatMoney(estimatedEqualAdjustment)} each).
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Card">Debit/Credit Card</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  disabled={paymentLoading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-600 transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={paymentLoading || !enteredPayment}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  {paymentLoading
                    ? 'Processing Payment...'
                    : isOverPayment
                    ? 'Record Extra Payment'
                    : isPartialPayment
                    ? 'Record Partial Payment'
                    : 'Confirm Payment'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* =====================================================
          OFFICIAL PRINT SLIP (FOR WINDOW.PRINT())
      ====================================================== */}
      <div className="installment-print-slip print-only">
        
        {/* Header */}
        <div className="print-header">
          <div>
            <h1>{settings?.shopName || 'Electronics Shop'}</h1>
            <p>CUSTOMER INSTALLMENT RECOVERY SCHEDULE SLIP</p>
            {settings?.shopAddress && (
              <small>{settings.shopAddress} {settings.shopPhone ? `• Phone: ${settings.shopPhone}` : ''}</small>
            )}
          </div>
          <div className="print-date text-right">
            <span>Plan ID: <strong>{plan.planId || 'N/A'}</strong></span>
            <span>Invoice #: <strong>{invoiceBillNumber}</strong></span>
            <span>Printed: {new Date().toLocaleString('en-PK')}</span>
          </div>
        </div>

        {/* Customer & Product Row */}
        <div className="print-grid-2">
          <div className="print-box">
            <strong>CUSTOMER DETAILS:</strong>
            <div>Name: <b>{plan.customer?.fullName || 'N/A'}</b></div>
            <div>Customer ID: <b>{plan.customer?.customerId || 'N/A'}</b></div>
            <div>Phone: <b>{plan.customer?.mobileNumber || 'N/A'}</b></div>
            <div>CNIC: <b>{plan.customer?.cnic || 'N/A'}</b></div>
          </div>

          <div className="print-box">
            <strong>FINANCED DEAL DETAILS:</strong>
            <div>Product: <b>{plan.product?.name || 'N/A'}</b></div>
            <div>Quantity: <b>{quantity} Unit(s)</b></div>
            <div>Total Deal: <b>{formatMoney(totalPayable)}</b></div>
            <div>Down Payment: <b>{formatMoney(downPayment)}</b></div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="print-section-title">MONTHLY PAYMENT INSTALLMENT SCHEDULE ({duration} MONTHS)</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Due Date</th>
              <th>Installment Amount</th>
              <th>Paid Amount</th>
              <th>Remaining Due</th>
              <th>Status</th>
              <th>Paid Date</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((inst, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>Month #{inst.installmentNumber}</td>
                <td>{formatDate(inst.dueDate)}</td>
                <td>{formatMoney(inst.amount)}</td>
                <td>{formatMoney(inst.paidAmount || 0)}</td>
                <td>{formatMoney(inst.remainingAmount || 0)}</td>
                <td>{inst.status}</td>
                <td>{inst.paidDate ? formatDate(inst.paidDate) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Summary Box */}
        <div className="print-summary-box">
          <div>Total Customer Paid: <b>{formatMoney(totalCustomerPaid)}</b></div>
          <div>Remaining Balance: <b style={{ color: '#dc2626' }}>{formatMoney(remainingBalance)}</b></div>
          <div>Progress: <b>{paymentProgress.toFixed(1)}% Cleared</b></div>
        </div>

        {/* Signatures */}
        <div className="print-signatures">
          <div className="signature-box">
            <div className="signature-line" />
            <p>Customer Signature</p>
          </div>
          <div className="signature-box">
            <div className="signature-line" />
            <p>Authorized Shop Stamp & Signature</p>
          </div>
        </div>

        <div className="print-footer">
          Computer generated recovery schedule slip from {settings?.shopName || 'Electronics Shop'} POS system.
        </div>
      </div>

      {/* =====================================================
          PRINT CSS
      ====================================================== */}
      <style>{`
        .print-only {
          display: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }

          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            font-size: 8.5px !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .installment-print-slip {
            width: 100%;
            font-family: Arial, Helvetica, sans-serif;
          }

          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }

          .print-header h1 {
            font-size: 14px;
            font-weight: 900;
            margin: 0;
            text-transform: uppercase;
          }

          .print-header p {
            font-size: 8px;
            font-weight: 700;
            margin: 1px 0;
          }

          .print-header small {
            font-size: 7px;
            color: #475569;
          }

          .print-date {
            font-size: 7.5px;
            display: flex;
            flex-direction: column;
            gap: 1px;
          }

          .print-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 6px;
          }

          .print-box {
            border: 1px solid #94a3b8;
            padding: 4px 6px;
            font-size: 7.5px;
            line-height: 1.3;
          }

          .print-section-title {
            font-size: 8px;
            font-weight: 900;
            border-bottom: 1px solid #0f172a;
            padding-bottom: 2px;
            margin-bottom: 4px;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.5px;
            margin-bottom: 6px;
          }

          .print-table th {
            background-color: #f1f5f9 !important;
            border: 0.5px solid #94a3b8;
            padding: 2.5px 3.5px;
            font-weight: 900;
            text-align: left;
          }

          .print-table td {
            border: 0.5px solid #cbd5e1;
            padding: 2.5px 3.5px;
          }

          .print-summary-box {
            display: flex;
            justify-content: space-between;
            border: 1.5px solid #0f172a;
            padding: 4px 8px;
            font-size: 8.5px;
            margin-top: 6px;
            margin-bottom: 14px;
            background-color: #f8fafc !important;
          }

          .print-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 20px;
            page-break-inside: avoid;
          }

          .signature-box {
            text-align: center;
          }

          .signature-line {
            border-top: 1px solid #0f172a;
            margin-bottom: 3px;
          }

          .signature-box p {
            font-size: 7.5px;
            font-weight: 800;
            margin: 0;
          }

          .print-footer {
            margin-top: 10px;
            text-align: center;
            font-size: 6.5px;
            color: #64748b;
            border-top: 0.5px solid #cbd5e1;
            padding-top: 3px;
          }
        }
      `}</style>

    </div>
  );
};

export default InstallmentPlanDetails;