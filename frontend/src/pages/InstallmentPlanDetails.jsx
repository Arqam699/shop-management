import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  MessageCircle,
  Package,
  Phone,
  Receipt,
  User,
  X,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Sparkles,
  Printer,
  Wallet,
  Split,
  CircleDollarSign,
  ArrowRight,
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
    const number = Number(value || 0);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.round((number + Number.EPSILON) * 100) / 100;
  };

  const toBoolean = (value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      if (
        ['true', '1', 'yes', 'on'].includes(
          normalized
        )
      ) {
        return true;
      }

      if (
        ['false', '0', 'no', 'off', ''].includes(
          normalized
        )
      ) {
        return false;
      }
    }

    return Boolean(value);
  };

  const formatMoney = (amount) => {
    return `${currency} ${Number(amount || 0).toLocaleString(
      'en-PK',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const formatDate = (date) => {
    if (!date) {
      return 'N/A';
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return 'N/A';
    }

    return parsed.toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInstallmentRemaining = (installment) => {
    const amount = roundMoney(installment?.amount);
    const paid = roundMoney(installment?.paidAmount);

    const backendRemaining =
      installment?.remainingAmount !== undefined &&
      installment?.remainingAmount !== null
        ? roundMoney(installment.remainingAmount)
        : null;

    if (backendRemaining !== null) {
      return Math.max(0, backendRemaining);
    }

    return Math.max(
      0,
      roundMoney(amount - paid)
    );
  };

  const isInstallmentPaid = (installment) => {
    const remaining =
      getInstallmentRemaining(installment);

    return (
      remaining <= 0 ||
      installment?.status === 'Paid' ||
      installment?.status === 'Settled'
    );
  };

  // =========================================================
  // FETCH PLAN
  // =========================================================

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        `/api/installments/${id}`
      );

      if (response.data?.success) {
        setPlan(
          response.data.data?.plan || null
        );

        setInstallments(
          response.data.data?.installments || []
        );

        setPayments(
          response.data.data?.payments || []
        );
      } else {
        setError(
          response.data?.message ||
            'Failed to load installment plan.'
        );
      }
    } catch (err) {
      console.error(
        'Failed to fetch installment plan:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Failed to load installment plan.'
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

  const quantity = Number(
    sale?.quantity || 1
  );

  const productUnitPrice = Number(
    sale?.unitPrice || 0
  );

  const subtotal =
    Number(sale?.subtotal) ||
    quantity * productUnitPrice;

  const discount = Number(
    sale?.discount || 0
  );

  let originalPrice = 0;

  if (
    sale?.finalTotal !== undefined &&
    sale?.finalTotal !== null
  ) {
    originalPrice =
      Number(sale.finalTotal) || 0;
  } else {
    originalPrice = Math.max(
      0,
      subtotal - discount
    );
  }

  // =========================================================
  // DOWN PAYMENT
  // =========================================================

  const downPayment = roundMoney(
    plan?.downPayment ??
      sale?.downPayment ??
      0
  );

  // =========================================================
  // DOWN PAYMENT AS FIRST INSTALLMENT
  // IMPORTANT:
  // Backend field is:
  // treatDownPaymentAsFirstInstallment
  // =========================================================

  const rawDownPaymentFirst =
    plan?.treatDownPaymentAsFirstInstallment ??
    sale?.treatDownPaymentAsFirstInstallment ??
    sale?.downPaymentAsFirstInstallment ??
    sale?.isDownPaymentFirstInstallment ??
    false;

  const downPaymentAsFirstInstallment =
    toBoolean(rawDownPaymentFirst);

  // =========================================================
  // SELECTED / ACTUAL DURATION
  // =========================================================

  const selectedDuration = Number(
    plan?.selectedDuration ??
      plan?.invoiceSnapshot?.selectedDuration ??
      sale?.selectedInstallmentDuration ??
      0
  );

  const actualDuration = Number(
    plan?.duration ??
      sale?.installmentDuration ??
      installments?.length ??
      0
  );

  /*
   * For DP-first:
   *
   * selectedDuration = total schedule installments
   * Example selected = 12
   * #1 = DP
   * Remaining monthly = 11
   *
   * For normal mode:
   * selectedDuration = monthly installments
   */

  const displayDuration =
    selectedDuration > 0
      ? selectedDuration
      : actualDuration;

  // =========================================================
  // MARKUP
  // =========================================================
  //
  // IMPORTANT:
  // Use SELECTED duration for markup.
  //
  // DP-first:
  // selectedDuration = 12
  // actualDuration = 11
  // markup must still be 50%.
  //
  // =========================================================

  let markupPercent = 0;

  if (displayDuration === 3) {
    markupPercent = 15;
  } else if (displayDuration === 6) {
    markupPercent = 25;
  } else if (displayDuration === 12) {
    markupPercent = 50;
  } else if (displayDuration <= 3) {
    markupPercent = 15;
  } else if (displayDuration <= 6) {
    markupPercent = 25;
  } else {
    markupPercent = 50;
  }

  // =========================================================
  // FINANCING CALCULATION
  // =========================================================

  const remainingPrincipal = Math.max(
    0,
    roundMoney(
      originalPrice - downPayment
    )
  );

  const calculatedMarkupAmount = roundMoney(
    remainingPrincipal *
      (markupPercent / 100)
  );

  /*
   * Backend plan.totalAmount is the source of truth.
   *
   * In DP-first mode:
   *
   * Sale = 100,000
   * DP = 50,000
   * Principal = 50,000
   * Markup = 25,000
   * Financed = 75,000
   * DP + financed = 125,000
   *
   * The DP is already part of the total deal.
   */

  const calculatedTotalPayable = roundMoney(
    originalPrice +
      calculatedMarkupAmount
  );

  const totalPayable = roundMoney(
    plan?.totalAmount ??
      calculatedTotalPayable
  );

  // =========================================================
  // INSTALLMENT SCHEDULE TOTAL
  // =========================================================

  const calculatedInstallmentScheduleTotal =
    downPaymentAsFirstInstallment
      ? totalPayable
      : Math.max(
          0,
          roundMoney(
            totalPayable -
              downPayment
          )
        );

  const currentInstallmentTotal =
    installments.reduce(
      (sum, installment) =>
        sum +
        roundMoney(
          installment?.amount
        ),
      0
    );

  const installmentScheduleTotal =
    installments.length > 0
      ? roundMoney(
          currentInstallmentTotal
        )
      : roundMoney(
          calculatedInstallmentScheduleTotal
        );

  const averageMonthlyInstallment =
    actualDuration > 0
      ? roundMoney(
          installmentScheduleTotal /
            actualDuration
        )
      : 0;

  // =========================================================
  // TOTAL PAID
  // =========================================================
  //
  // CRITICAL FIX
  //
  // DP-FIRST:
  //
  // DP = 50,000
  // Installment #1:
  // amount = 50,000
  // paidAmount = 50,000
  //
  // totalPaidInInstallments = 50,000
  //
  // Total Customer Paid MUST be:
  // 50,000
  //
  // NOT:
  // 50,000 DP + 50,000 installment
  //
  // Payment records are NOT added here because they
  // represent the payment transactions for the same
  // installment amounts.
  //
  // =========================================================

  const totalPaidInInstallments =
    roundMoney(
      installments.reduce(
        (sum, installment) =>
          sum +
          roundMoney(
            installment?.paidAmount
          ),
        0
      )
    );

  const totalCustomerPaid =
    downPaymentAsFirstInstallment
      ? totalPaidInInstallments
      : roundMoney(
          downPayment +
            totalPaidInInstallments
        );

  // =========================================================
  // ACTUAL INSTALLMENT REMAINING
  // =========================================================

  const installmentRemainingTotal =
    roundMoney(
      installments.reduce(
        (sum, installment) =>
          sum +
          getInstallmentRemaining(
            installment
          ),
        0
      )
    );

  // =========================================================
  // FINAL REMAINING BALANCE
  // =========================================================

  /*
   * DP-first:
   * Remaining balance comes directly from installment schedule.
   *
   * Normal:
   * Total payable - DP - installment payments.
   *
   * This prevents DP from being subtracted twice.
   */

  const calculatedRemainingBalance =
    downPaymentAsFirstInstallment &&
    installments.length > 0
      ? installmentRemainingTotal
      : Math.max(
          0,
          roundMoney(
            totalPayable -
              totalCustomerPaid
          )
        );

  const remainingBalance = roundMoney(
    calculatedRemainingBalance
  );

  // =========================================================
  // PAYMENT PROGRESS
  // =========================================================

  const paymentProgress =
    totalPayable > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (totalCustomerPaid /
              totalPayable) *
              100
          )
        )
      : 0;

  const paidInstallments =
    installments.filter((installment) =>
      isInstallmentPaid(installment)
    ).length;

  const partialInstallments =
    installments.filter(
      (installment) =>
        installment?.status ===
        'Partially Paid'
    ).length;

  const overdueInstallments =
    installments.filter(
      (installment) =>
        installment?.status ===
          'Overdue' &&
        !isInstallmentPaid(installment)
    ).length;

  const invoiceBillNumber =
    sale?.saleId ||
    plan?.planId ||
    'N/A';

  const planStartDate =
    plan?.createdAt ||
    sale?.createdAt;

  // =========================================================
  // SCHEDULE LABEL
  // =========================================================

  const scheduleInstallmentCount =
    installments.length > 0
      ? installments.length
      : displayDuration;

  const remainingMonthlyInstallmentCount =
    downPaymentAsFirstInstallment
      ? Math.max(
          0,
          scheduleInstallmentCount - 1
        )
      : scheduleInstallmentCount;

  // =========================================================
  // SELECTED PAYMENT CALCULATIONS
  // =========================================================

  const selectedRemaining = roundMoney(
    selectedInstallment
      ? getInstallmentRemaining(
          selectedInstallment
        )
      : 0
  );

  const enteredPayment = roundMoney(
    paymentAmount
  );

  const paymentDifference = roundMoney(
    enteredPayment -
      selectedRemaining
  );

  const isPartialPayment =
    enteredPayment > 0 &&
    enteredPayment <
      selectedRemaining;

  const isExactPayment =
    enteredPayment > 0 &&
    enteredPayment ===
      selectedRemaining;

  const isOverPayment =
    enteredPayment >
    selectedRemaining;

  // =========================================================
  // FUTURE INSTALLMENTS
  // =========================================================

  const futureInstallments =
    useMemo(() => {
      if (!selectedInstallment) {
        return [];
      }

      const currentNumber = Number(
        selectedInstallment.installmentNumber
      );

      return installments
        .filter((installment) => {
          const installmentNumber =
            Number(
              installment.installmentNumber
            );

          return (
            installmentNumber >
              currentNumber &&
            getInstallmentRemaining(
              installment
            ) > 0
          );
        })
        .sort(
          (a, b) =>
            Number(
              a.installmentNumber
            ) -
            Number(
              b.installmentNumber
            )
        );
    }, [
      installments,
      selectedInstallment,
    ]);

  // =========================================================
  // OVERPAYMENT ALLOCATION PREVIEW
  // =========================================================

  const overpaymentAllocation =
    useMemo(() => {
      if (
        !isOverPayment ||
        paymentDifference <= 0
      ) {
        return {
          extra: 0,
          perInstallment: 0,
          allocations: [],
          leftover: 0,
        };
      }

      if (
        futureInstallments.length === 0
      ) {
        return {
          extra: paymentDifference,
          perInstallment: 0,
          allocations: [],
          leftover: paymentDifference,
        };
      }

      const futureCount =
        futureInstallments.length;

      const baseShare = roundMoney(
        paymentDifference /
          futureCount
      );

      let distributed = 0;

      const allocations =
        futureInstallments.map(
          (installment, index) => {
            let allocation =
              baseShare;

            if (
              index ===
              futureCount - 1
            ) {
              allocation =
                roundMoney(
                  paymentDifference -
                    distributed
                );
            }

            distributed =
              roundMoney(
                distributed +
                  allocation
              );

            return {
              installmentNumber:
                installment.installmentNumber,
              amount: allocation,
            };
          }
        );

      const leftover = roundMoney(
        paymentDifference -
          distributed
      );

      return {
        extra: paymentDifference,
        perInstallment: baseShare,
        allocations,
        leftover,
      };
    }, [
      isOverPayment,
      paymentDifference,
      futureInstallments,
    ]);

  // =========================================================
  // PAYMENT MODAL CONTROLS
  // =========================================================

  const openPaymentModal = (
    installment
  ) => {
    setSelectedInstallment(
      installment
    );

    setPaymentAmount(
      getInstallmentRemaining(
        installment
      ).toString()
    );

    setPaymentMethod('Cash');
    setShowPaymentModal(true);
  };

  const closePaymentModal = (
    force = false
  ) => {
    if (
      paymentLoading &&
      !force
    ) {
      return;
    }

    setShowPaymentModal(false);
    setSelectedInstallment(null);
    setPaymentAmount('');
    setPaymentMethod('Cash');
  };

  // =========================================================
  // QUICK PAYMENT
  // =========================================================

  const setQuickAmount = (
    amount
  ) => {
    setPaymentAmount(
      roundMoney(amount).toString()
    );
  };

  // =========================================================
  // HANDLE PAYMENT
  // =========================================================

  const handlePayment = async (
    e
  ) => {
    e.preventDefault();

    if (!selectedInstallment) {
      toast.error(
        'Please select an installment.'
      );
      return;
    }

    const amount = roundMoney(
      paymentAmount
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error(
        'Please enter a valid payment amount.'
      );
      return;
    }

    const remaining =
      getInstallmentRemaining(
        selectedInstallment
      );

    if (remaining <= 0) {
      toast.error(
        'This installment is already paid.'
      );
      return;
    }

    const paymentPayload = {
      installmentId:
        selectedInstallment._id,

      paymentAmount: amount,

      paymentMethod,

      notes: '',

      allowOverPayment: true,

      distributionMode: 'equal',

      carryShortfallForward: false,

      keepExcessAsAdvance: true,
    };

    try {
      setPaymentLoading(true);

      const response =
        await api.post(
          `/api/installments/${selectedInstallment._id}/pay`,
          paymentPayload
        );

      if (response.data?.success) {
        const responseExtra =
          roundMoney(
            response.data?.extraPayment ??
              response.data?.carryForwardAmount ??
              response.data?.overPayment ??
              0
          );

        const responseAdvance =
          roundMoney(
            response.data?.advanceAmount ??
              response.data?.customerAdvance ??
              response.data?.creditAmount ??
              0
          );

        const backendDistributed =
          roundMoney(
            response.data
              ?.distributedAmount ?? 0
          );

        // ===================================================
        // PARTIAL
        // ===================================================

        if (
          amount < remaining
        ) {
          const newRemaining =
            roundMoney(
              remaining - amount
            );

          toast.success(
            `Partial payment recorded. ${formatMoney(
              newRemaining
            )} remains on this installment.`
          );
        }

        // ===================================================
        // EXACT
        // ===================================================

        else if (
          amount === remaining
        ) {
          toast.success(
            response.data?.message ||
              'Installment paid successfully.'
          );
        }

        // ===================================================
        // OVERPAYMENT
        // ===================================================

        else {
          const localExtra =
            paymentDifference;

          const extra =
            responseExtra ||
            localExtra;

          const distributed =
            backendDistributed ||
            Math.min(
              extra,
              futureInstallments.reduce(
                (sum, installment) =>
                  sum +
                  getInstallmentRemaining(
                    installment
                  ),
                0
              )
            );

          if (
            responseAdvance > 0
          ) {
            toast.success(
              `Payment recorded. ${formatMoney(
                distributed
              )} was distributed across future installments and ${formatMoney(
                responseAdvance
              )} was kept as customer advance.`
            );
          } else if (
            futureInstallments.length >
              0
          ) {
            toast.success(
              `Payment recorded. ${formatMoney(
                extra
              )} extra payment was distributed across future installments.`
            );
          } else {
            toast.success(
              `Payment recorded. ${formatMoney(
                extra
              )} extra payment was kept as customer advance.`
            );
          }
        }

        closePaymentModal(true);

        await fetchPlan();
      } else {
        toast.error(
          response.data?.message ||
            'Failed to record payment.'
        );
      }
    } catch (err) {
      console.error(
        'Payment error:',
        err
      );

      toast.error(
        err.response?.data?.message ||
          'Failed to record payment.'
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  // =========================================================
  // WHATSAPP
  // =========================================================

  const formatWhatsAppNumber = (
    phone
  ) => {
    if (!phone) {
      return '';
    }

    let cleaned = String(phone)
      .replace(/[^0-9]/g, '');

    if (
      cleaned.startsWith('00')
    ) {
      cleaned =
        cleaned.substring(2);
    }

    if (
      cleaned.startsWith('0')
    ) {
      cleaned =
        `92${cleaned.substring(1)}`;
    }

    if (
      !cleaned.startsWith('92') &&
      cleaned.length === 10
    ) {
      cleaned =
        `92${cleaned}`;
    }

    return cleaned;
  };

  const handleSendWhatsAppReminder = (
    installment
  ) => {
    const phone =
      formatWhatsAppNumber(
        plan?.customer
          ?.mobileNumber
      );

    if (!phone) {
      toast.error(
        'Customer mobile number is missing or invalid.'
      );
      return;
    }

    const customerName =
      plan?.customer?.fullName ||
      'Customer';

    const dueAmount =
      getInstallmentRemaining(
        installment
      );

    const dueDate =
      installment?.dueDate
        ? formatDate(
            installment.dueDate
          )
        : 'N/A';

    const message = `Assalam-o-Alaikum ${customerName},

This is a reminder regarding your installment plan at ${
      settings?.shopName ||
      'Electronics Shop'
    }.

Installment: Month #${
      installment.installmentNumber
    }
Due Amount: ${formatMoney(
      dueAmount
    )}
Due Date: ${dueDate}

Please visit our shop to settle your payment.

Thank you - ${
      settings?.shopName ||
      'Electronics Shop'
    }`;

    const whatsappUrl =
      `https://wa.me/${phone}?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      whatsappUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // =========================================================
  // STATUS
  // =========================================================

  const getStatusClasses = (
    status
  ) => {
    if (
      status === 'Paid' ||
      status === 'Settled'
    ) {
      return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    }

    if (
      status === 'Overdue'
    ) {
      return 'bg-rose-50 border-rose-200 text-rose-700';
    }

    if (
      status ===
      'Partially Paid'
    ) {
      return 'bg-amber-50 border-amber-200 text-amber-700';
    }

    return 'bg-blue-50 border-blue-200 text-blue-700';
  };

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
  // ERROR
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
            {error ||
              'Installment plan record not found in database.'}
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
  // MAIN
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
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div>
                <div className="flex items-center gap-2 mb-1">

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">
                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                    Financing Schedule
                  </span>

                  <span className="text-slate-600">
                    •
                  </span>

                  <span className="text-[9px] font-bold text-slate-400">
                    Plan ID:{' '}
                    {plan.planId ||
                      'N/A'}
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
                onClick={() =>
                  window.print()
                }
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all hover:scale-[1.02] active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>
                  Print Schedule Slip
                </span>
              </button>

              <div
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border ${
                  plan.status ===
                  'Completed'
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    : plan.status ===
                      'Overdue'
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                    : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                }`}
              >
                {plan.status ===
                'Completed' ? (
                  <CheckCircle2 size={16} />
                ) : plan.status ===
                  'Overdue' ? (
                  <AlertCircle size={16} />
                ) : (
                  <Clock size={16} />
                )}

                <span>
                  {plan.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CUSTOMER + SALE
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 no-print">

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
              <User size={20} />
            </div>

            <div>
              <h2 className="text-sm font-black text-slate-900">
                Customer Information
              </h2>

              <p className="text-[10px] text-slate-400 font-semibold">
                Tied account details
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">
                Full Name
              </span>

              <p className="font-black text-slate-800 mt-0.5 truncate">
                {plan.customer?.fullName ||
                  'N/A'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">
                Customer ID
              </span>

              <p className="font-black text-indigo-600 mt-0.5 truncate">
                {plan.customer?.customerId ||
                  'N/A'}
              </p>
            </div>

            <div className="col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">

              <div>
                <span className="text-[9px] uppercase font-black text-slate-400 block">
                  Mobile Contact
                </span>

                <p className="font-bold text-slate-800 mt-0.5">
                  {plan.customer?.mobileNumber ||
                    'N/A'}
                </p>
              </div>

              <Phone className="w-4 h-4 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
              <Package size={20} />
            </div>

            <div>
              <h2 className="text-sm font-black text-slate-900">
                Purchased Item & Invoice
              </h2>

              <p className="text-[10px] text-slate-400 font-semibold">
                Financed stock details
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">
                Invoice / Deal #
              </span>

              <p className="font-black text-indigo-600 mt-0.5 truncate">
                {invoiceBillNumber}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">
                Plan Start Date
              </span>

              <p className="font-bold text-slate-800 mt-0.5 truncate">
                {formatDate(
                  planStartDate
                )}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">
                Product
              </span>

              <p className="font-black text-slate-800 mt-0.5 truncate">
                {plan.product?.name ||
                  'N/A'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">
                Financed Quantity
              </span>

              <p className="font-black text-slate-800 mt-0.5">
                {quantity} Unit
                {quantity !== 1
                  ? 's'
                  : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          CALCULATION
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
            <p className="text-[9px] uppercase font-black text-slate-400">
              Sale Total
            </p>

            <p className="text-base font-black text-slate-900 mt-1">
              {formatMoney(
                originalPrice
              )}
            </p>
          </div>

          <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200/80 p-3.5">
            <p className="text-[9px] uppercase font-black text-emerald-700">
              Down Payment
            </p>

            <p className="text-base font-black text-emerald-700 mt-1">
              {formatMoney(
                downPayment
              )}
            </p>

            {downPaymentAsFirstInstallment && (
              <p className="text-[9px] font-bold text-emerald-600 mt-1">
                Included as Installment #1
              </p>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5">
            <p className="text-[9px] uppercase font-black text-slate-400">
              Principal Amount
            </p>

            <p className="text-base font-black text-blue-600 mt-1">
              {formatMoney(
                remainingPrincipal
              )}
            </p>
          </div>

          <div className="bg-amber-50/60 rounded-2xl border border-amber-200/80 p-3.5">
            <p className="text-[9px] uppercase font-black text-amber-700">
              Markup ({markupPercent}%)
            </p>

            <p className="text-base font-black text-amber-700 mt-1">
              +{formatMoney(
                calculatedMarkupAmount
              )}
            </p>
          </div>

          <div className="bg-indigo-50/60 rounded-2xl border border-indigo-200/80 p-3.5">
            <p className="text-[9px] uppercase font-black text-indigo-700">
              Total Installments
            </p>

            <p className="text-base font-black text-indigo-700 mt-1">
              {formatMoney(
                installmentScheduleTotal
              )}
            </p>

            {downPaymentAsFirstInstallment && (
              <p className="text-[9px] font-bold text-indigo-600 mt-1">
                DP included in schedule
              </p>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5">
            <p className="text-[9px] uppercase font-black text-slate-400">
              Duration
            </p>

            <p className="text-base font-black text-slate-900 mt-1">
              {displayDuration} Months
            </p>

            {downPaymentAsFirstInstallment && (
              <p className="text-[9px] font-bold text-slate-500 mt-1">
                {remainingMonthlyInstallmentCount} monthly dues after DP
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/5 via-violet-500/5 to-transparent border border-blue-500/15 text-xs text-slate-700 font-semibold flex flex-wrap items-center gap-2">

          <span className="text-blue-600 font-black">
            Calculation Formula:
          </span>

          <span>
            (
            {formatMoney(
              originalPrice
            )}{' '}
            −{' '}
            {formatMoney(
              downPayment
            )}
            ) ={' '}
            {formatMoney(
              remainingPrincipal
            )}
          </span>

          <span>
            →
          </span>

          <span>
            (
            {formatMoney(
              remainingPrincipal
            )}{' '}
            + {markupPercent}% Markup) ={' '}
            <strong className="text-slate-900 font-black">
              {formatMoney(
                totalPayable
              )}
            </strong>{' '}
            total payable
          </span>

          {downPaymentAsFirstInstallment && (
            <>
              <span>
                →
              </span>

              <span className="text-indigo-700 font-black">
                Down Payment is Installment #1
              </span>
            </>
          )}
        </div>
      </section>

      {/* =====================================================
          PAYMENT PROGRESS
      ====================================================== */}

      <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm no-print">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">

          <div>
            <h2 className="text-base font-black text-slate-900">
              Recovery & Payment Progress
            </h2>

            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {paidInstallments} of{' '}
              {installments.length}{' '}
              installments paid in full
              {partialInstallments >
              0
                ? ` (${partialInstallments} partial)`
                : ''}
            </p>
          </div>

          <span className="text-xl sm:text-2xl font-black text-slate-900 self-start sm:self-auto">
            {paymentProgress.toFixed(
              1
            )}
            %{' '}
            <span className="text-xs font-bold text-slate-400">
              Cleared
            </span>
          </span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">

          <div
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-700 shadow-sm"
            style={{
              width: `${paymentProgress}%`,
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
            <span className="text-[9px] uppercase font-black tracking-wider text-emerald-800">
              Total Customer Paid
            </span>

            <p className="text-xl font-black text-emerald-700 mt-1">
              {formatMoney(
                totalCustomerPaid
              )}
            </p>

            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              {downPaymentAsFirstInstallment
                ? 'Installment Payments — DP included in #1'
                : 'Down Payment + Installments'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/70">
            <span className="text-[9px] uppercase font-black tracking-wider text-rose-800">
              Remaining Balance
            </span>

            <p className="text-xl font-black text-rose-700 mt-1">
              {formatMoney(
                remainingBalance
              )}
            </p>

            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
              Pending to be collected
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[9px] uppercase font-black tracking-wider text-slate-500">
              Total Deal Payable
            </span>

            <p className="text-xl font-black text-slate-900 mt-1">
              {formatMoney(
                totalPayable
              )}
            </p>

            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Grand total with markup
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          INSTALLMENT TABLE
      ====================================================== */}

      <section className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm no-print">

        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

          <div>
            <h2 className="text-base font-black text-slate-900">
              Installment Schedule & Dues
            </h2>

            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {downPaymentAsFirstInstallment
                ? `${scheduleInstallmentCount} total schedule installments • DP is #1 • ${remainingMonthlyInstallmentCount} monthly dues`
                : `${displayDuration} Monthly payment installments`}
            </p>
          </div>

          <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            Schedule Total:{' '}
            <strong className="text-blue-600">
              {formatMoney(
                installmentScheduleTotal
              )}
            </strong>
          </span>
        </div>

        {installments.length ===
        0 ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-400">
            No installments found for this plan.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs font-medium text-slate-600">

              <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">

                <tr>
                  <th className="px-5 py-3.5 text-center">
                    #
                  </th>

                  <th className="px-5 py-3.5">
                    Required Amount
                  </th>

                  <th className="px-5 py-3.5">
                    Paid
                  </th>

                  <th className="px-5 py-3.5">
                    Remaining
                  </th>

                  <th className="px-5 py-3.5">
                    Due Date
                  </th>

                  <th className="px-5 py-3.5">
                    Paid Date
                  </th>

                  <th className="px-5 py-3.5 text-center">
                    Status
                  </th>

                  <th className="px-5 py-3.5 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {installments.map(
                  (inst) => {
                    const instAmount =
                      roundMoney(
                        inst.amount
                      );

                    const paidAmount =
                      roundMoney(
                        inst.paidAmount
                      );

                    const remainingAmount =
                      getInstallmentRemaining(
                        inst
                      );

                    const isPaid =
                      isInstallmentPaid(
                        inst
                      );

                    return (
                      <tr
                        key={
                          inst._id
                        }
                        className="hover:bg-slate-50/70 transition-colors"
                      >

                        <td className="px-5 py-4 text-center font-black text-slate-800">
                          Month #
                          {
                            inst.installmentNumber
                          }
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-black text-slate-900">
                            {formatMoney(
                              instAmount
                            )}
                          </span>

                          {Number(
                            inst.originalAmount ||
                              0
                          ) !==
                            instAmount && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              Orig:{' '}
                              {formatMoney(
                                inst.originalAmount
                              )}
                            </span>
                          )}

                          {downPaymentAsFirstInstallment &&
                            Number(
                              inst.installmentNumber
                            ) === 1 && (
                              <span className="inline-flex mt-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                Down Payment
                              </span>
                            )}
                        </td>

                        <td className="px-5 py-4 font-black text-emerald-600">
                          {formatMoney(
                            paidAmount
                          )}
                        </td>

                        <td className="px-5 py-4 font-black text-rose-600">
                          {formatMoney(
                            remainingAmount
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold text-blue-600">
                          {formatDate(
                            inst.dueDate
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-500 font-semibold">
                          {inst.paidDate
                            ? formatDate(
                                inst.paidDate
                              )
                            : '—'}
                        </td>

                        <td className="px-5 py-4 text-center">

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border ${getStatusClasses(
                              inst.status
                            )}`}
                          >

                            {isPaid ? (
                              <CheckCircle2 size={12} />
                            ) : inst.status ===
                              'Overdue' ? (
                              <AlertCircle size={12} />
                            ) : (
                              <Clock size={12} />
                            )}

                            <span>
                              {isPaid
                                ? 'Paid'
                                : inst.status}
                            </span>
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">

                          {!isPaid ? (
                            <div className="flex items-center justify-end gap-1.5">

                              <button
                                type="button"
                                onClick={() =>
                                  openPaymentModal(
                                    inst
                                  )
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black hover:opacity-95 shadow-sm transition-all hover:scale-105 active:scale-95"
                              >
                                <CreditCard size={13} />
                                <span>
                                  Pay
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleSendWhatsAppReminder(
                                    inst
                                  )
                                }
                                className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all hover:scale-105 active:scale-95"
                                title="Send WhatsApp Payment Alert"
                              >
                                <MessageCircle size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-black text-xs">
                              <CheckCircle2 size={14} />
                              <span>
                                Paid
                              </span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          PAYMENT MODAL
      ====================================================== */}

      {showPaymentModal &&
        selectedInstallment && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-[pageEnter_0.25s_ease-out]">

            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 max-h-[94vh] overflow-y-auto">

              <div className="relative bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-950/40">
                    <CreditCard className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-black tracking-tight text-white">
                      Record Installment Payment
                    </h3>

                    <p className="text-xs text-slate-400 font-medium">
                      Installment #
                      {
                        selectedInstallment.installmentNumber
                      }{' '}
                      • Due:{' '}
                      {formatDate(
                        selectedInstallment.dueDate
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    closePaymentModal()
                  }
                  disabled={
                    paymentLoading
                  }
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={
                  handlePayment
                }
                className="p-5 sm:p-6 space-y-4"
              >

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">

                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 block">
                      Required Monthly Due
                    </span>

                    <p className="text-sm font-black text-slate-800 mt-0.5">
                      {formatMoney(
                        selectedInstallment.amount
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] uppercase font-black text-rose-500 block">
                      Current Remaining
                    </span>

                    <p className="text-base font-black text-rose-600 mt-0.5">
                      {formatMoney(
                        selectedRemaining
                      )}
                    </p>
                  </div>
                </div>

                <div>

                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Enter Payment Amount (
                    {currency}
                    ){' '}
                    <span className="text-rose-500">
                      *
                    </span>
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      paymentAmount
                    }
                    onChange={(e) =>
                      setPaymentAmount(
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                    className="w-full h-12 border border-slate-200 rounded-xl px-4 text-base font-black text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />

                  <div className="flex flex-wrap gap-2 mt-2">

                    <button
                      type="button"
                      onClick={() =>
                        setQuickAmount(
                          selectedRemaining
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600 hover:bg-slate-200"
                    >
                      Current Due
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setQuickAmount(
                          roundMoney(
                            selectedRemaining *
                              2
                          )
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-[10px] font-black text-indigo-700 hover:bg-indigo-100"
                    >
                      2 × Due
                    </button>

                    {futureInstallments.length >
                      0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setQuickAmount(
                            roundMoney(
                              selectedRemaining +
                                futureInstallments.reduce(
                                  (
                                    sum,
                                    item
                                  ) =>
                                    sum +
                                    getInstallmentRemaining(
                                      item
                                    ),
                                  0
                                )
                            )
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"
                      >
                        Clear Future Dues
                      </button>
                    )}
                  </div>
                </div>

                {enteredPayment >
                  0 && (
                  <div className="space-y-3 animate-[pageEnter_0.2s_ease-out]">

                    {isPartialPayment && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">

                        <div className="flex items-center gap-2 font-black">
                          <ArrowDownCircle className="w-4 h-4 text-amber-600" />

                          <span>
                            Partial Payment Mode
                          </span>
                        </div>

                        <p className="mt-1 font-semibold">
                          Paying{' '}
                          {formatMoney(
                            enteredPayment
                          )}
                          . Remaining on this installment will be{' '}
                          <strong className="text-rose-600">
                            {formatMoney(
                              selectedRemaining -
                                enteredPayment
                            )}
                          </strong>
                          .
                        </p>

                        <p className="mt-1 text-[10px] text-amber-700 font-bold">
                          This shortfall will stay on this installment and will NOT be transferred to the next installment.
                        </p>
                      </div>
                    )}

                    {isExactPayment && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">

                        <div className="flex items-center gap-2 font-black">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />

                          <span>
                            Full Installment Payment
                          </span>
                        </div>

                        <p className="mt-1 font-semibold">
                          Installment #
                          {
                            selectedInstallment.installmentNumber
                          }{' '}
                          will be completely cleared.
                        </p>
                      </div>
                    )}

                    {isOverPayment && (
                      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-3">

                        <div className="flex items-center gap-2 font-black">
                          <ArrowUpCircle className="w-4 h-4 text-indigo-600" />

                          <span>
                            Extra Payment Distribution
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">

                          <div className="p-3 bg-white/70 rounded-xl border border-indigo-100">
                            <span className="text-[9px] uppercase font-black text-indigo-500">
                              Current Due
                            </span>

                            <p className="font-black text-indigo-900 mt-1">
                              {formatMoney(
                                selectedRemaining
                              )}
                            </p>
                          </div>

                          <div className="p-3 bg-white/70 rounded-xl border border-indigo-100">
                            <span className="text-[9px] uppercase font-black text-indigo-500">
                              Customer Pays
                            </span>

                            <p className="font-black text-indigo-900 mt-1">
                              {formatMoney(
                                enteredPayment
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white/80 border border-indigo-100">

                          <div className="flex items-center justify-between gap-2">

                            <div className="flex items-center gap-2">
                              <Split className="w-4 h-4 text-indigo-600" />

                              <span className="font-black">
                                Extra Amount
                              </span>
                            </div>

                            <strong className="text-indigo-700">
                              {formatMoney(
                                paymentDifference
                              )}
                            </strong>
                          </div>

                          {futureInstallments.length >
                          0 ? (
                            <p className="mt-2 font-semibold text-indigo-800">
                              Extra amount will be distributed equally among{' '}
                              <strong>
                                {
                                  futureInstallments.length
                                }
                              </strong>{' '}
                              future unpaid installments.
                            </p>
                          ) : (
                            <p className="mt-2 font-semibold text-indigo-800">
                              There are no future unpaid installments. The extra amount will be saved as customer advance/credit.
                            </p>
                          )}
                        </div>

                        {overpaymentAllocation
                          .allocations
                          .length >
                          0 && (
                          <div className="rounded-xl overflow-hidden border border-indigo-200 bg-white">

                            <div className="px-3 py-2 bg-indigo-100/60 border-b border-indigo-200">
                              <span className="text-[9px] uppercase font-black tracking-wider text-indigo-700">
                                Equal Distribution Preview
                              </span>
                            </div>

                            <div className="divide-y divide-indigo-100">

                              {overpaymentAllocation.allocations.map(
                                (
                                  allocation
                                ) => (
                                  <div
                                    key={
                                      allocation.installmentNumber
                                    }
                                    className="px-3 py-2.5 flex items-center justify-between"
                                  >
                                    <span className="text-[11px] font-bold text-slate-700">
                                      Month #
                                      {
                                        allocation.installmentNumber
                                      }
                                    </span>

                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-700">
                                      +
                                      {formatMoney(
                                        allocation.amount
                                      )}

                                      <ArrowRight className="w-3 h-3" />
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {overpaymentAllocation.leftover >
                          0 && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">

                            <div className="flex items-center gap-2 font-black">
                              <Wallet className="w-4 h-4 text-emerald-600" />

                              <span>
                                Customer Advance
                              </span>
                            </div>

                            <p className="mt-1 font-semibold">
                              {formatMoney(
                                overpaymentAllocation.leftover
                              )}{' '}
                              will remain as customer credit/advance.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>

                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Payment Method
                  </label>

                  <select
                    value={
                      paymentMethod
                    }
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value
                      )
                    }
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                  >
                    <option value="Cash">
                      Cash
                    </option>

                    <option value="Bank Transfer">
                      Bank Transfer
                    </option>

                    <option value="EasyPaisa">
                      EasyPaisa
                    </option>

                    <option value="JazzCash">
                      JazzCash
                    </option>

                    <option value="Card">
                      Debit/Credit Card
                    </option>
                  </select>
                </div>

                {isOverPayment && (
                  <div className="flex gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-[10px] text-blue-800 font-semibold">

                    <CircleDollarSign className="w-4 h-4 shrink-0 text-blue-600" />

                    <p>
                      You can collect more than the current monthly installment. The current installment will be cleared first, and the remaining amount will be distributed equally across future unpaid installments.
                    </p>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-between gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      closePaymentModal()
                    }
                    disabled={
                      paymentLoading
                    }
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-600 transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      paymentLoading ||
                      !enteredPayment
                    }
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {paymentLoading
                      ? 'Processing Payment...'
                      : isOverPayment
                      ? 'Record & Distribute Payment'
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
          PRINT SLIP
      ====================================================== */}

      <div className="installment-print-slip print-only">

        <div className="print-header">

          <div>
            <h1>
              {settings?.shopName ||
                'Electronics Shop'}
            </h1>

            <p>
              CUSTOMER INSTALLMENT RECOVERY SCHEDULE SLIP
            </p>

            {settings?.shopAddress && (
              <small>
                {settings.shopAddress}{' '}
                {settings.shopPhone
                  ? `• Phone: ${settings.shopPhone}`
                  : ''}
              </small>
            )}
          </div>

          <div className="print-date text-right">
            <span>
              Plan ID:{' '}
              <strong>
                {plan.planId ||
                  'N/A'}
              </strong>
            </span>

            <span>
              Invoice #:{' '}
              <strong>
                {
                  invoiceBillNumber
                }
              </strong>
            </span>

            <span>
              Printed:{' '}
              {new Date().toLocaleString(
                'en-PK'
              )}
            </span>
          </div>
        </div>

        <div className="print-grid-2">

          <div className="print-box">
            <strong>
              CUSTOMER DETAILS:
            </strong>

            <div>
              Name:{' '}
              <b>
                {plan.customer?.fullName ||
                  'N/A'}
              </b>
            </div>

            <div>
              Customer ID:{' '}
              <b>
                {plan.customer?.customerId ||
                  'N/A'}
              </b>
            </div>

            <div>
              Phone:{' '}
              <b>
                {plan.customer?.mobileNumber ||
                  'N/A'}
              </b>
            </div>

            <div>
              CNIC:{' '}
              <b>
                {plan.customer?.cnic ||
                  'N/A'}
              </b>
            </div>
          </div>

          <div className="print-box">
            <strong>
              FINANCED DEAL DETAILS:
            </strong>

            <div>
              Product:{' '}
              <b>
                {plan.product?.name ||
                  'N/A'}
              </b>
            </div>

            <div>
              Quantity:{' '}
              <b>
                {quantity} Unit(s)
              </b>
            </div>

            <div>
              Total Deal:{' '}
              <b>
                {formatMoney(
                  totalPayable
                )}
              </b>
            </div>

            <div>
              Down Payment:{' '}
              <b>
                {formatMoney(
                  downPayment
                )}
              </b>

              {downPaymentAsFirstInstallment && (
                <span>
                  {' '}
                  (Installment #1)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="print-section-title">
          MONTHLY PAYMENT INSTALLMENT SCHEDULE (
          {scheduleInstallmentCount} INSTALLMENTS)
        </div>

        <table className="print-table">

          <thead>
            <tr>
              <th>#</th>
              <th>
                Due Date
              </th>
              <th>
                Installment Amount
              </th>
              <th>
                Paid Amount
              </th>
              <th>
                Remaining Due
              </th>
              <th>
                Status
              </th>
              <th>
                Paid Date
              </th>
            </tr>
          </thead>

          <tbody>
            {installments.map(
              (inst, idx) => (
                <tr key={idx}>
                  <td
                    style={{
                      textAlign:
                        'center',
                    }}
                  >
                    Month #
                    {
                      inst.installmentNumber
                    }
                    {downPaymentAsFirstInstallment &&
                      Number(
                        inst.installmentNumber
                      ) === 1
                      ? ' (DP)'
                      : ''}
                  </td>

                  <td>
                    {formatDate(
                      inst.dueDate
                    )}
                  </td>

                  <td>
                    {formatMoney(
                      inst.amount
                    )}
                  </td>

                  <td>
                    {formatMoney(
                      inst.paidAmount ||
                        0
                    )}
                  </td>

                  <td>
                    {formatMoney(
                      getInstallmentRemaining(
                        inst
                      )
                    )}
                  </td>

                  <td>
                    {isInstallmentPaid(
                      inst
                    )
                      ? 'Paid'
                      : inst.status}
                  </td>

                  <td>
                    {inst.paidDate
                      ? formatDate(
                          inst.paidDate
                        )
                      : '—'}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        <div className="print-summary-box">

          <div>
            Total Customer Paid:{' '}
            <b>
              {formatMoney(
                totalCustomerPaid
              )}
            </b>
          </div>

          <div>
            Remaining Balance:{' '}
            <b
              style={{
                color: '#dc2626',
              }}
            >
              {formatMoney(
                remainingBalance
              )}
            </b>
          </div>

          <div>
            Progress:{' '}
            <b>
              {paymentProgress.toFixed(
                1
              )}
              % Cleared
            </b>
          </div>
        </div>

        <div className="print-signatures">

          <div className="signature-box">
            <div className="signature-line" />

            <p>
              Customer Signature
            </p>
          </div>

          <div className="signature-box">
            <div className="signature-line" />

            <p>
              Authorized Shop Stamp & Signature
            </p>
          </div>
        </div>

        <div className="print-footer">
          Computer generated recovery schedule slip from{' '}
          {settings?.shopName ||
            'Electronics Shop'}{' '}
          POS system.
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

          html,
          body {
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