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
import ExistingPrintPopup from '../components/ExistingPrintPopup';

const getLocalDateInputValue = (value = new Date()) => {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const getImageSource = (image) => {
  if (!image || typeof image !== 'string') return '';
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

const InstallmentPlanDetails = () => {
  const { id } = useParams();
  const { settings } = useSettings();

  const [plan, setPlan] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [printPopup, setPrintPopup] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => getLocalDateInputValue());
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPlanRevision, setShowPlanRevision] = useState(false);
  const [revisionDuration, setRevisionDuration] = useState('');
  const [revisionMarkupInput, setRevisionMarkupInput] = useState('');
  const [revisionLoading, setRevisionLoading] = useState(false);

  const currency = settings?.currency || 'PKR';
  const customerPhoto = getImageSource(plan?.customer?.liveImage || plan?.customer?.photo);
  const customerFingerprint = getImageSource(plan?.customer?.fingerprintImage);

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

  const formatTime = (date) => {
    if (!date) return 'N/A';

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'N/A';

    return parsed.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInstallmentPaymentEntries = (installment) => {
    const installmentNumber = Number(installment?.installmentNumber || 0);

    return payments
      .flatMap((payment) => {
        if (Number(payment?.planRevision || 0) !== Number(installment?.revisionNumber || 0)) return [];
        const allocations = Array.isArray(payment?.allocations)
          ? payment.allocations
          : [];

        if (allocations.length > 0) {
          return allocations
            .filter((allocation) => Number(allocation?.installmentNumber || 0) === installmentNumber)
            .map((allocation) => ({
              date: payment.paymentDate || payment.createdAt,
              amount: Number(allocation.amount || 0) + Number(payment?.balanceReductionAmount || 0),
              extraAmount: Number(payment?.balanceReductionAmount || 0),
              paymentId: payment._id,
            }));
        }

        const paymentInstallmentNumber = Number(
          payment?.installment?.installmentNumber ||
          payment?.currentInstallmentNumber ||
          payment?.installmentNumber ||
          0
        );

        return paymentInstallmentNumber === installmentNumber
          ? [{
              date: payment.paymentDate || payment.createdAt,
              amount: Number(payment.amount || 0),
              extraAmount: 0,
              paymentId: payment._id,
            }]
          : [];
      })
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  };

  const getInstallmentRemaining = (installment) => {
    if (plan?.status === 'Completed' || Number(plan?.remainingBalance || 0) <= 0) {
      return 0;
    }

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
    if (plan?.status === 'Completed' || Number(plan?.remainingBalance || 0) <= 0) {
      return true;
    }

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
  const financedProducts = Array.isArray(sale?.items) && sale.items.length > 0
    ? sale.items
    : [{ product: plan?.product, quantity }];

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
  const initialPaymentCountsAsFirstInstallment = Boolean(
    plan?.initialPaymentCountsAsFirstInstallment ??
      plan?.invoiceSnapshot?.initialPaymentCountsAsFirstInstallment ??
      downPaymentAsFirstInstallment
  );

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

  const storedMarkupPercent = Number(sale?.markupPercentage);
  const markupPercent = Number.isFinite(storedMarkupPercent)
    ? storedMarkupPercent
    : displayDuration <= 3 ? 15 : displayDuration <= 6 ? 25 : 50;

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
  const totalDealDiscount = roundMoney(plan?.balanceDiscount || 0);
  const netTotalPayable = roundMoney(Math.max(0, totalPayable - totalDealDiscount));
  const previousPlanTotal = Number(plan?.revisions?.[plan.revisions.length - 1]?.totalAmount || 0);
  const isRevisedInstallmentPlan = Number(plan?.revisionNumber || 0) > 0;
  const earlySettlementDiscount = isRevisedInstallmentPlan
    ? 0
    : Math.max(0, roundMoney(previousPlanTotal - totalPayable));

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
  const balanceReduction = roundMoney(plan?.balanceReduction || 0);

  const totalCustomerPaid =
    downPaymentAsFirstInstallment
      ? roundMoney(totalPaidInInstallments + balanceReduction)
      : roundMoney(
          downPayment +
            totalPaidInInstallments +
            balanceReduction
        );

  const commonShorterDurations = [3, 6, 12].filter((duration) => duration < displayDuration);
  const defaultRevisionDuration = Math.max(1, Math.min(displayDuration - 1, commonShorterDurations[commonShorterDurations.length - 1] || displayDuration - 1));
  const revisedDurationNumber = Number(revisionDuration || defaultRevisionDuration || 0);
  const revisedMarkupBase = downPaymentAsFirstInstallment
    ? Math.max(0, originalPrice - downPayment)
    : originalPrice;
  const currentMarkupForRevision = Number.isFinite(Number(sale?.markupPercentage))
    ? Number(sale.markupPercentage)
    : revisedMarkupBase > 0
      ? Math.max(0, (totalPayable - originalPrice) / revisedMarkupBase * 100)
      : markupPercent;
  const suggestedRevisionMarkup = displayDuration > 0
    ? roundMoney(currentMarkupForRevision * revisedDurationNumber / displayDuration)
    : 0;
  const revisedMarkupPercent = Number(revisionMarkupInput === '' ? 0 : revisionMarkupInput);
  const revisedMarkupAmount = roundMoney(revisedMarkupBase * revisedMarkupPercent / 100);
  const revisedTotalPayable = roundMoney(originalPrice + revisedMarkupAmount);
  const currentDealDiscount = totalDealDiscount;
  const revisedNetDealAmount = roundMoney(Math.max(0, revisedTotalPayable - currentDealDiscount));
  const currentNetDealAmount = roundMoney(Math.max(0, totalPayable - currentDealDiscount));
  const revisedRemainingBalance = roundMoney(revisedNetDealAmount - totalCustomerPaid);

  const revisePlan = async () => {
    if (!Number.isInteger(revisedDurationNumber) || revisedDurationNumber < 1 || revisedDurationNumber > 12) {
      toast.error('Enter a whole number of months from 1 to 12.');
      return;
    }
    if (revisedRemainingBalance < 0) {
      toast.error('Payments already received exceed the revised plan total.');
      return;
    }
    if (!Number.isFinite(revisedMarkupPercent) || revisedMarkupPercent < 0) {
      toast.error('Enter a valid markup percentage of zero or more.');
      return;
    }
    try {
      setRevisionLoading(true);
      const response = await api.put(`/api/installments/${id}/revise`, {
        duration: revisedDurationNumber,
        markupPercentage: revisedMarkupPercent,
      });
      toast.success(response.data?.message || 'Installment plan revised.');
      setShowPlanRevision(false);
      await fetchPlan();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not revise the installment plan.');
    } finally {
      setRevisionLoading(false);
    }
  };

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
      ? Math.max(0, roundMoney(installmentRemainingTotal - balanceReduction))
      : Math.max(
          0,
          roundMoney(
            totalPayable -
              totalCustomerPaid -
              Number(plan?.balanceDiscount || 0)
          )
        );

  const remainingBalance = roundMoney(
    calculatedRemainingBalance
  );

  // =========================================================
  // PAYMENT PROGRESS
  // =========================================================

  const paymentProgress =
    remainingBalance <= 0.005
      ? 100
      : netTotalPayable > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (totalCustomerPaid /
              netTotalPayable) *
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
    installments.length > 0
      ? installments.filter((installment) => Number(installment.remainingAmount ?? (Number(installment.amount || 0) - Number(installment.paidAmount || 0))) > 0.005).length
      : initialPaymentCountsAsFirstInstallment
        ? Math.max(0, scheduleInstallmentCount - 1)
        : scheduleInstallmentCount;

  // =========================================================
  // PAYMENT RECEIPT HISTORY
  //
  // Every saved payment keeps an allocation snapshot.  Using the
  // snapshot (rather than today's installment balance) makes the
  // history truthful even after later payments are received.
  // =========================================================

  const paymentHistory = useMemo(() => {
    const newestReceipt = [...payments].sort(
      (a, b) =>
        new Date(b.paymentDate || b.createdAt) -
        new Date(a.paymentDate || a.createdAt)
    )[0];
    const planIsSettled =
      plan?.status === 'Completed' || Number(plan?.remainingBalance || 0) <= 0;

    return [...payments]
      .map((payment) => {
        const allocations = Array.isArray(payment?.allocations)
          ? [...payment.allocations].sort(
              (a, b) =>
                Number(a?.installmentNumber || 0) -
                Number(b?.installmentNumber || 0)
            )
          : [];

        const primaryAllocation =
          allocations[0] || null;

        const installmentNumber = Number(
          primaryAllocation?.installmentNumber ||
            payment?.installment?.installmentNumber ||
            0
        );

        const savedOriginalInstallmentAmount = roundMoney(
          payment?.originalInstallmentAmount
        );

        const actualPaid = roundMoney(payment?.amount);
        const savedPayableAtPayment = roundMoney(
          primaryAllocation?.previousRemaining ??
            (savedOriginalInstallmentAmount > 0
              ? savedOriginalInstallmentAmount
              : null) ??
            payment?.installment?.originalAmount ??
            payment?.installment?.remainingAmount ??
            payment?.installment?.amount ??
            0
        );
        const isLatestLegacySettlement =
          planIsSettled &&
          String(payment?._id) === String(newestReceipt?._id) &&
          (payment?.planRemainingBalanceAfterPayment === null ||
            payment?.planRemainingBalanceAfterPayment === undefined);
        const payableAtPayment = roundMoney(
          payment?.planPayableAmountAtPayment ??
            (isLatestLegacySettlement
              ? Math.min(savedPayableAtPayment, actualPaid)
              : savedPayableAtPayment)
        );

        const paidToCurrentInstallment = roundMoney(
          primaryAllocation?.amount ??
            Math.min(actualPaid, payableAtPayment)
        );

        const balanceReductionPaid = roundMoney(
          payment?.balanceReductionAmount || 0
        );

        const extraPaid = roundMoney(
          payment?.carryForwardAmount ??
            Math.max(0, actualPaid - paidToCurrentInstallment - balanceReductionPaid)
        );

        const planBalanceAfterPayment = payment?.planRemainingBalanceAfterPayment;
        const remainingAfterPayment = roundMoney(
          (planBalanceAfterPayment !== null &&
            planBalanceAfterPayment !== undefined &&
            Number(planBalanceAfterPayment) <= 0) ||
            isLatestLegacySettlement
            ? 0
            : primaryAllocation?.remainingAfterPayment ??
                Math.max(0, payableAtPayment - paidToCurrentInstallment)
        );

        return {
          ...payment,
          installmentNumber,
          payableAtPayment,
          actualPaid,
          paidToCurrentInstallment,
          balanceReductionPaid,
          extraPaid,
          remainingAfterPayment,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.paymentDate || b.createdAt) -
          new Date(a.paymentDate || a.createdAt)
      );
  }, [payments, plan]);

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
  const exceedsRemainingBalance =
    enteredPayment > remainingBalance;

  // =========================================================
  // OVERPAYMENT BALANCE REDUCTION PREVIEW
  // =========================================================

  const overpaymentAllocation =
    useMemo(() => {
      if (
        !isOverPayment ||
        paymentDifference <= 0
      ) {
        return {
          extra: 0,
          reduction: 0,
          leftover: 0,
        };
      }

      const availableBalanceAfterCurrentDue = Math.max(
        0,
        roundMoney(remainingBalance - selectedRemaining)
      );
      const reduction = roundMoney(
        Math.min(paymentDifference, availableBalanceAfterCurrentDue)
      );
      const leftover = roundMoney(paymentDifference - reduction);

      return {
        extra: paymentDifference,
        reduction,
        leftover,
      };
    }, [
      isOverPayment,
      paymentDifference,
      remainingBalance,
      selectedRemaining,
    ]);

  // =========================================================
  // PAYMENT MODAL CONTROLS
  // =========================================================

  const openPaymentModal = (
    installment
  ) => {
    if (remainingBalance <= 0) {
      toast.error('The plan balance is fully paid. No more payment is due.');
      return;
    }

    setSelectedInstallment(
      installment
    );

    setPaymentAmount(
      getInstallmentRemaining(
        installment
      ).toString()
    );

    setPaymentMethod('');
    setPaymentDate(getLocalDateInputValue());
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
    setPaymentMethod('');
    setPaymentDate(getLocalDateInputValue());
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

    if (amount > remainingBalance) {
      toast.error(`Payment cannot exceed remaining balance (${formatMoney(remainingBalance)}).`);
      return;
    }

    if (!paymentMethod.trim()) {
      toast.error('Please enter the payment method.');
      return;
    }

    if (!paymentDate || paymentDate > getLocalDateInputValue()) {
      toast.error('Select a valid payment date that is not in the future.');
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

    const [paymentYear, paymentMonth, paymentDay] = paymentDate.split('-').map(Number);
    const currentTime = new Date();
    const recordedPaymentDate = new Date(
      paymentYear,
      paymentMonth - 1,
      paymentDay,
      currentTime.getHours(),
      currentTime.getMinutes(),
      currentTime.getSeconds()
    ).toISOString();

    const paymentPayload = {
      installmentId:
        selectedInstallment._id,

      paymentAmount: amount,

      paymentDate: recordedPaymentDate,

      paymentMethod,

      notes: '',

      allowOverPayment: true,

      distributionMode: 'balance-reduction',

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
        const responseAdvance =
          roundMoney(
            response.data?.advanceAmount ??
              response.data?.customerAdvance ??
              response.data?.creditAmount ??
              0
          );

        const backendDistributed =
          roundMoney(
            response.data?.balanceReductionAmount ??
              response.data?.distributedAmount ??
              0
          );

        // ===================================================
        // PARTIAL
        // ===================================================

        if (
          amount < remaining
        ) {
          const updatedCurrentInstallment = response.data?.installments?.find(
            (installment) => String(installment._id) === String(selectedInstallment._id)
          );
          const newRemaining = roundMoney(
            updatedCurrentInstallment?.remainingAmount ?? remaining - amount
          );
          const unappliedAmount = roundMoney(response.data?.unallocatedAmount || 0);

          toast.success(
            unappliedAmount > 0
              ? `Payment recorded. ${formatMoney(amount - unappliedAmount)} applied to the plan; ${formatMoney(unappliedAmount)} kept as customer advance. ${formatMoney(newRemaining)} remains on this installment.`
              : `Partial payment recorded. ${formatMoney(newRemaining)} remains on this installment.`
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
          const balanceReduced = backendDistributed;
          const advance = responseAdvance || Math.max(0, paymentDifference - balanceReduced);
          toast.success(
            advance > 0
              ? `Payment recorded. ${formatMoney(balanceReduced)} reduced the remaining balance; ${formatMoney(advance)} remains as customer advance. Installments were not changed by the extra amount.`
              : `Payment recorded. ${formatMoney(balanceReduced)} extra payment reduced only the remaining balance; installment records were unchanged.`
          );
        }

        const paymentId = response.data?.payment?._id;
        if (paymentId) {
          setPrintPopup({ kind: 'payment', recordId: paymentId });
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
                    Invoice #{sale?.saleId || 'N/A'}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                  Installment Plan Details
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">

              {plan.status !== 'Completed' && (
                <>
                  <button
                    type="button"
                    onClick={() => { setRevisionDuration(String(defaultRevisionDuration)); setRevisionMarkupInput(String(roundMoney(currentMarkupForRevision * defaultRevisionDuration / displayDuration))); setShowPlanRevision(true); }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-2.5 text-xs font-black text-amber-200 transition-all hover:bg-amber-400/20"
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    Revise Plan
                  </button>
                </>
              )}

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

      {Array.isArray(plan.revisions) && plan.revisions.length > 0 && (
        <section className="premium-card overflow-hidden no-print">
          <div className="border-b border-slate-100 bg-amber-50 px-4 py-3">
            <h2 className="text-sm font-black text-amber-900">Plan Revision Audit</h2>
            <p className="mt-0.5 text-[11px] font-semibold text-amber-700">Earlier plan terms are kept here; payment receipts remain unchanged.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {[...plan.revisions].reverse().map((revision, index) => (
              <div key={`${revision.revisionNumber}-${revision.revisedAt || index}`} className="px-4 py-3">
                <div className="grid gap-2 text-xs sm:grid-cols-4 sm:items-center">
                  <span className="font-black text-slate-800">Previous plan: {revision.selectedDuration || revision.duration} months</span>
                  <span className="font-bold text-slate-600">Old total: {formatMoney(revision.totalAmount)}</span>
                  <span className="font-bold text-emerald-700">Revised total: {formatMoney(index === 0 ? plan.totalAmount : plan.revisions[plan.revisions.length - index]?.totalAmount)}</span>
                  <span className="text-slate-500">{revision.revisedAt ? formatDate(revision.revisedAt) : ''}</span>
                </div>
                {Array.isArray(revision.installments) && revision.installments.length > 0 && (
                  <details className="mt-2 rounded-lg border border-slate-100 bg-slate-50">
                    <summary className="cursor-pointer px-3 py-2 text-[10px] font-black text-indigo-700">View previous {revision.installments.length}-installment schedule</summary>
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="w-full min-w-[520px] text-left text-[10px]">
                        <thead className="text-slate-400"><tr><th className="px-3 py-2">Month</th><th className="px-3 py-2">Due date</th><th className="px-3 py-2 text-right">Scheduled</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Remaining</th></tr></thead>
                        <tbody>{revision.installments.map((item, itemIndex) => <tr key={`${item.installmentNumber}-${itemIndex}`} className="border-t border-slate-100"><td className="px-3 py-2 font-bold">#{item.installmentNumber}</td><td className="px-3 py-2">{item.dueDate ? formatDate(item.dueDate) : '—'}</td><td className="px-3 py-2 text-right">{formatMoney(item.amount)}</td><td className="px-3 py-2 text-right">{formatMoney(item.paidAmount)}</td><td className="px-3 py-2 text-right">{formatMoney(item.remainingAmount)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================
          CUSTOMER + SALE
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 no-print">

        <div className="premium-card p-5 sm:p-6">

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

              <p className="font-black text-slate-800 mt-0.5 break-words">
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

        <div className="premium-card p-5 sm:p-6">

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
                {formatDate(planStartDate)}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                {formatTime(planStartDate)}
              </p>
            </div>

            <div className="col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[9px] uppercase font-black text-slate-400 block">
                Products & Models
              </span>

              <div className="mt-1.5 space-y-2">
                {financedProducts.map((item, index) => (
                  <div
                    key={item._id || item.product?._id || index}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-slate-200 pt-2 first:border-t-0 first:pt-0"
                  >
                    <p className="font-black text-slate-800 break-words">
                      Product {index + 1}: {item.product?.name || 'Product'}
                      <span className="ml-2 text-xs font-bold text-slate-500">
                        Qty: {Number(item.quantity || 0)}
                      </span>
                    </p>
                    <p className="text-xs font-bold text-slate-700 break-words">
                      Model: {item.product?.model || item.model || 'N/A'}
                    </p>
                    <p className="w-full text-xs font-bold text-slate-700">
                      Purchase Price: {formatMoney(
                        Number(item.purchasePriceAtSale ?? (index === 0 ? sale?.purchasePriceAtSale : undefined) ?? item.product?.purchasePrice ?? 0)
                      )} per unit
                      {Number(item.quantity || 0) > 1 && (
                        <span className="ml-2 font-semibold text-slate-500">
                          (Total: {formatMoney(
                            Number(item.purchasePriceAtSale ?? (index === 0 ? sale?.purchasePriceAtSale : undefined) ?? item.product?.purchasePrice ?? 0) * Number(item.quantity || 0)
                          )})
                        </span>
                      )}
                    </p>
                    {item.product?.imei && (
                      <p className="w-full break-all text-xs font-semibold text-slate-600">
                        IMEI: {item.product.imei}
                      </p>
                    )}
                    {item.product?.engineNumber && (
                      <p className="w-full break-all text-xs font-semibold text-slate-600">
                        Engine No: {item.product.engineNumber}
                      </p>
                    )}
                    {item.product?.chassisNumber && (
                      <p className="w-full break-all text-xs font-semibold text-slate-600">
                        Chassis No: {item.product.chassisNumber}
                      </p>
                    )}
                  </div>
                ))}
              </div>
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

      <section className="premium-card no-print">

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

            {initialPaymentCountsAsFirstInstallment && (
              <p className="text-[9px] font-bold text-slate-500 mt-1">
                {remainingMonthlyInstallmentCount} monthly dues remain after the initial installment
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
              {formatMoney(netTotalPayable)}
            </strong>{' '}
            total payable{totalDealDiscount > 0 ? ' after discount' : ''}
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

      <section className="premium-card no-print">

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
              {formatMoney(netTotalPayable)}
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

      <section className="premium-card overflow-hidden no-print">

        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

          <div>
            <h2 className="text-base font-black text-slate-900">
              Installment Schedule & Dues
            </h2>

            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {initialPaymentCountsAsFirstInstallment
                ? `${scheduleInstallmentCount} total schedule installments • #1 paid at sale • ${remainingMonthlyInstallmentCount} monthly dues`
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
                    const installmentPaymentEntries =
                      getInstallmentPaymentEntries(inst);
                    const receivedThisMonth = roundMoney(
                      installmentPaymentEntries.length
                        ? installmentPaymentEntries.reduce(
                            (sum, entry) => sum + Number(entry.amount || 0),
                            0
                          )
                        : paidAmount
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
                            receivedThisMonth
                          )}
                          {installmentPaymentEntries.length > 0 && (
                            <div className="mt-1.5 space-y-1 border-t border-emerald-100 pt-1.5 text-[10px] font-semibold leading-4 text-slate-600">
                              {installmentPaymentEntries.map((entry, paymentIndex) => (
                                <div key={`${entry.paymentId || inst._id}-${paymentIndex}`}>
                                  <div>{formatDate(entry.date)}: {formatMoney(entry.amount)} received</div>
                                  {entry.extraAmount > 0 && (
                                    <div className="font-black text-indigo-700">
                                      Extra: {formatMoney(entry.extraAmount)} (reduced total balance)
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
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
                              isPaid ? 'Paid' : inst.status
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
          PAYMENT RECEIPT HISTORY
      ====================================================== */}

      <section className="premium-card overflow-hidden no-print">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900">
              Payment Receipt History
            </h2>

            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Each receipt shows the amount payable at that time and the amount actually received.
            </p>
          </div>

          <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            {paymentHistory.length} receipt{paymentHistory.length === 1 ? '' : 's'}
          </span>
        </div>

        {Number(plan?.balanceDiscount || 0) > 0 && (
          <div className="mx-4 mt-4 sm:mx-5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-amber-800">Discount applied to total deal amount</p>
              <p className="mt-0.5 text-[11px] font-semibold text-amber-700">This discount is deducted from the invoice deal total and amount due.</p>
            </div>
            <p className="shrink-0 text-sm font-black text-amber-900">
              {formatMoney(plan.balanceDiscount)}
            </p>
          </div>
        )}

        {paymentHistory.length === 0 ? (
          <div className="p-10 text-center text-xs font-semibold text-slate-400">
            No payment receipt has been recorded for this plan yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paymentHistory.map((payment) => {
              const isBalanceReduction = payment.balanceReductionPaid > 0;
              const isExtraPayment = payment.extraPaid > 0;
              const isShortPayment =
                payment.actualPaid > 0 &&
                payment.remainingAfterPayment > 0;

              return (
                <div
                  key={payment._id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900">
                        {payment.installmentNumber > 0
                          ? `Month #${payment.installmentNumber}`
                          : 'Installment payment'}
                      </p>

                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        Receipt #{payment.paymentId || 'N/A'} • {formatDate(payment.paymentDate || payment.createdAt)}
                      </p>
                    </div>

                    <span className="w-fit text-[10px] font-black px-2.5 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                      {payment.paymentMethod || 'Cash'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 block">
                        Payable at payment time
                      </span>
                      <p className="text-sm font-black text-slate-900 mt-1">
                        {formatMoney(payment.payableAtPayment)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                      <span className="text-[9px] uppercase font-black tracking-wider text-emerald-600 block">
                        Actually paid
                      </span>
                      <p className="text-sm font-black text-emerald-700 mt-1">
                        {formatMoney(payment.actualPaid)}
                      </p>
                    </div>

                    <div
                      className={`rounded-xl border p-3 ${
                        isExtraPayment
                          ? 'border-indigo-200 bg-indigo-50/60'
                          : isShortPayment
                          ? 'border-amber-200 bg-amber-50/60'
                          : 'border-emerald-200 bg-emerald-50/60'
                      }`}
                    >
                      <span className="text-[9px] uppercase font-black tracking-wider text-slate-500 block">
                        {isBalanceReduction
                          ? 'Balance reduced'
                          : isExtraPayment
                          ? 'Extra paid'
                          : isShortPayment
                          ? 'Still payable'
                          : 'Payment result'}
                      </span>
                      <p
                        className={`text-sm font-black mt-1 ${
                          isExtraPayment
                            ? 'text-indigo-700'
                            : isShortPayment
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {isBalanceReduction
                          ? formatMoney(payment.balanceReductionPaid)
                          : isExtraPayment
                          ? formatMoney(payment.extraPaid)
                          : isShortPayment
                          ? formatMoney(payment.remainingAfterPayment)
                          : 'Settled'}
                      </p>
                    </div>
                  </div>

                  {isExtraPayment && (
                    <p className="mt-3 text-[11px] font-bold text-indigo-700">
                      Extra amount was paid and adjusted against future installments.
                    </p>
                  )}
                  {isBalanceReduction && (
                    <p className="mt-3 text-[11px] font-bold text-indigo-700">
                      Extra paid: {formatMoney(payment.balanceReductionPaid)}. This amount reduced the total remaining balance; it was not carried into another installment.
                    </p>
                  )}

                  {isShortPayment && (
                    <p className="mt-3 text-[11px] font-bold text-amber-700">
                      This remaining amount stays on the same installment until it is paid.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showPlanRevision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !revisionLoading) setShowPlanRevision(false); }}>
            <section className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Shorten installment plan">
            <header className="bg-slate-950 px-5 py-4 text-white">
                <h2 className="text-base font-black">Shorten Installment Plan</h2>
                <p className="mt-1 text-xs text-slate-300">Recalculate the full deal total using the shorter duration rate.</p>
            </header>
            <div className="space-y-4 p-5">
              <label className="block text-xs font-black text-slate-600">Plan duration (months)
                <input type="number" min="1" max="12" step="1" value={revisionDuration || defaultRevisionDuration} onChange={(event) => { const raw = event.target.value; setRevisionDuration(raw); const duration = Number(raw); if (Number.isInteger(duration) && duration >= 1 && duration <= 12) setRevisionMarkupInput(String(roundMoney(currentMarkupForRevision * duration / displayDuration))); }} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500" />
                <span className="mt-1 block text-[10px] font-semibold text-slate-400">Enter a whole number from 1 to 12 months.</span>
              </label>
              <label className="block text-xs font-black text-slate-600">Markup for revised plan (%)
                <input type="number" min="0" step="0.01" value={revisionMarkupInput || '0'} onChange={(event) => setRevisionMarkupInput(event.target.value === '' ? '0' : event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500" />
                <span className="mt-1 block text-[10px] font-semibold text-slate-400">Enter the rate you want. Changing duration suggests a proportional rate, which you can edit.</span>
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-bold text-slate-500">Previous deal amount</p><p className="mt-1 font-black text-slate-800">{formatMoney(currentNetDealAmount)}</p></div>
                <div className="rounded-xl bg-indigo-50 p-3"><p className="font-bold text-indigo-600">Revised deal amount</p><p className="mt-1 font-black text-indigo-900">{formatMoney(revisedNetDealAmount)}</p></div>
                <div className="rounded-xl bg-emerald-50 p-3"><p className="font-bold text-emerald-700">Change in deal amount</p><p className="mt-1 font-black text-emerald-900">{formatMoney(Math.max(0, currentNetDealAmount - revisedNetDealAmount))}</p></div>
                <div className="rounded-xl bg-amber-50 p-3"><p className="font-bold text-amber-700">Already received</p><p className="mt-1 font-black text-amber-900">{formatMoney(totalCustomerPaid)}</p></div>
              </div>
              <div className={`rounded-xl border p-3 text-xs font-bold ${revisedRemainingBalance < 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                {revisedRemainingBalance < 0
                  ? `Received payments exceed the revised total by ${formatMoney(Math.abs(revisedRemainingBalance))}. This revision cannot be applied.`
                  : `Amount remaining after revision: ${formatMoney(revisedRemainingBalance)}. Existing receipts stay in history; the prior schedule is retained in the audit.`}
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" disabled={revisionLoading} onClick={() => setShowPlanRevision(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={revisionLoading || revisedRemainingBalance < 0} onClick={revisePlan} className="h-10 rounded-lg bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">{revisionLoading ? 'Updating plan...' : 'Confirm New Plan'}</button>
            </footer>
          </section>
        </div>
      )}

      {/* =====================================================
          PAYMENT MODAL
      ====================================================== */}

      {showPaymentModal &&
        selectedInstallment && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center overflow-y-auto p-3 sm:p-4 animate-[pageEnter_0.25s_ease-out]" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); closePaymentModal(); } }}>

            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 max-h-[calc(100dvh-1.5rem)] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Record installment payment">

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
                          Math.min(
                            roundMoney(selectedRemaining * 2),
                            remainingBalance
                          )
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-[10px] font-black text-indigo-700 hover:bg-indigo-100"
                    >
                      2 × Due
                    </button>

                    {remainingBalance > selectedRemaining && (
                      <button
                        type="button"
                        onClick={() => setQuickAmount(remainingBalance)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"
                      >
                        Pay Remaining Balance
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="installmentPaymentDate" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Payment Received Date
                  </label>
                  <input
                    id="installmentPaymentDate"
                    type="date"
                    value={paymentDate}
                    max={getLocalDateInputValue()}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                  <p className="mt-1 text-[10px] font-medium text-slate-400">For an old sale, select the actual date you received this payment.</p>
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

                          <span>Remaining Balance Reduction</span>
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

                          <p className="mt-2 font-semibold text-indigo-800">
                            Extra amount will be subtracted from the total remaining balance only. No installment amount or status will be changed by the extra payment.
                          </p>
                        </div>

                        {overpaymentAllocation.reduction > 0 && (
                          <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-white px-3 py-2.5">
                            <span className="text-[11px] font-bold text-slate-700">Direct balance reduction</span>
                            <strong className="text-[11px] font-black text-indigo-700">
                              {formatMoney(overpaymentAllocation.reduction)}
                            </strong>
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

                  <input
                    type="text"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="Enter payment method (e.g. Cash, Bank Transfer)"
                    required
                    maxLength={80}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                {isOverPayment && (
                  <div className="flex gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-[10px] text-blue-800 font-semibold">

                    <CircleDollarSign className="w-4 h-4 shrink-0 text-blue-600" />

                    <p>
                      You can collect more than this month’s installment. The extra reduces the overall remaining balance; the monthly installment amount stays unchanged. Payment cannot exceed the total remaining balance.
                    </p>
                  </div>
                )}

                {exceedsRemainingBalance && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                    Payment amount cannot be more than the total remaining balance ({formatMoney(remainingBalance)}). No advance will be accepted.
                  </p>
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
                      !enteredPayment ||
                      exceedsRemainingBalance
                    }
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {paymentLoading
                      ? 'Processing Payment...'
                      : isOverPayment
                      ? 'Record & Reduce Balance'
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

          <div className="print-header-media">
            {customerPhoto && (
              <img className="customer-photo" src={customerPhoto} alt="Customer" />
            )}
          </div>

          <div className="print-header-center">
            <div className="print-invoice-number">
              Invoice #: <strong>{invoiceBillNumber}</strong>
            </div>
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
            {settings?.shopPhone && !settings?.shopAddress && (
              <small>Phone: {settings.shopPhone}</small>
            )}
            <div className="print-date">
              Printed: {new Date().toLocaleString('en-PK')}
            </div>
          </div>

          <div className="print-header-media">
            {customerFingerprint && (
              <img className="customer-fingerprint" src={customerFingerprint} alt="Customer fingerprint" />
            )}
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
              Father Name:{' '}
              <b>
                {plan.customer?.fatherName ||
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

            <div>
              Address:{' '}
              <b>
                {[plan.customer?.address, plan.customer?.city]
                  .filter(Boolean)
                  .join(', ') || 'N/A'}
              </b>
            </div>

            <div>
              Working Address:{' '}
              <b>{plan.customer?.workingAddress || 'N/A'}</b>
            </div>

          </div>

          <div className="print-box">
            <strong className="print-box-heading">
              FINANCED DEAL DETAILS:
            </strong>

            <div className="print-products-list">
              {financedProducts.map((item, index) => (
                <div className="print-product-row" key={item._id || item.product?._id || index}>
                  <div className="print-product-heading">
                    Product {index + 1}: {item.product?.name || 'Product'}
                  </div>
                  <div className="print-product-fields">
                    <div className="print-product-primary-fields">
                      <div><b>Model</b><span>{item.product?.model || item.model || 'N/A'}</span></div>
                      <div><b>Qty</b><span>{Number(item.quantity || 0)}</span></div>
                    </div>
                    {item.product?.imei && <div><b>IMEI</b><span>{item.product.imei}</span></div>}
                    {item.product?.engineNumber && <div><b>Engine No</b><span>{item.product.engineNumber}</span></div>}
                    {item.product?.chassisNumber && <div><b>Chassis No</b><span>{item.product.chassisNumber}</span></div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="print-deal-totals">
              <div className="print-deal-total">
                <span>Total Deal</span>
                <b>{formatMoney(netTotalPayable)}</b>
              </div>
              {earlySettlementDiscount > 0 && (
                <div className="print-deal-total">
                  <span>Early Settlement Discount</span>
                  <b>-{formatMoney(earlySettlementDiscount)}</b>
                </div>
              )}
              <div className="print-deal-total">
                <span>Down Payment</span>
                <b>{formatMoney(downPayment)}</b>
                {downPaymentAsFirstInstallment && <small>Counts as Installment #1</small>}
              </div>
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
                Paid Amount / Payment Dates
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
              (inst, idx) => {
                const printPaymentEntries = getInstallmentPaymentEntries(inst);
                const printReceivedTotal = roundMoney(
                  printPaymentEntries.length
                    ? printPaymentEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
                    : inst.paidAmount || 0
                );

                return (
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
                      printReceivedTotal
                    )}
                    <div className="print-payment-history">
                      {printPaymentEntries.map((entry, paymentIndex) => (
                        <div key={`${entry.paymentId || idx}-${paymentIndex}`}>
                          {formatDate(entry.date)}: {formatMoney(entry.amount)}
                          {entry.extraAmount > 0 && (
                            <strong> (Extra: {formatMoney(entry.extraAmount)})</strong>
                          )}
                        </div>
                      ))}
                    </div>
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
                );
              }
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

          body * {
            visibility: hidden !important;
          }

          .installment-print-slip,
          .installment-print-slip * {
            visibility: visible !important;
          }

          .installment-print-slip {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: auto !important;
            width: 202mm !important;
            box-sizing: border-box !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            transform: none !important;
            transform-origin: top left !important;
          }

          @page {
            size: A4 portrait;
            margin: 0 4mm 8mm;
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
            width: 202mm;
            min-height: 281mm;
            height: auto;
            max-height: none;
            box-sizing: border-box;
            overflow: visible;
            position: absolute !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 0 3mm !important;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            line-height: 1.35;
            font-weight: 800;
            color: #000000;
          }

          .installment-print-slip strong,
          .installment-print-slip b,
          .installment-print-slip th,
          .installment-print-slip td,
          .installment-print-slip p,
          .installment-print-slip span,
          .installment-print-slip small,
          .installment-print-slip div {
            font-weight: 800;
          }

          .print-header {
            display: grid;
            grid-template-columns: 25mm minmax(0, 1fr) 25mm;
            align-items: center;
            gap: 8px;
            border-bottom: 2px solid #0f172a;
            margin: 0 0 6px;
            padding: 0 0 5px;
          }

          .print-header-center {
            min-width: 0;
            text-align: center;
          }

          .print-invoice-number {
            font-size: 16px;
            font-weight: 900 !important;
            margin-bottom: 4px;
          }

          .print-invoice-number strong {
            font-size: 17px;
            font-weight: 900 !important;
          }

          .print-header-media {
            width: 25mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            text-align: center;
          }

          .print-header-media img {
            display: block;
            width: 25mm;
            height: 32mm;
            border: 1px solid #64748b;
            border-radius: 6px;
            background: #ffffff !important;
          }

          .print-header-media .customer-photo {
            object-fit: cover;
          }

          .print-header-media .customer-fingerprint {
            object-fit: contain;
            padding: 2px;
          }

          .print-header-media small {
            font-size: 8px;
            font-weight: 900;
          }

          .print-header h1 {
            font-size: 22px;
            font-weight: 900;
            margin: 0;
            text-transform: uppercase;
          }

          .print-header p {
            font-size: 14px;
            font-weight: 900;
            margin: 3px 0;
          }

          .print-header small {
            font-size: 11px;
            font-weight: 800;
            color: #475569;
          }

          .print-date {
            margin-top: 3px;
            font-size: 10px;
            font-weight: 800;
          }

          .print-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
            margin-bottom: 4px;
          }

          .print-box {
            border: 1px solid #94a3b8;
            padding: 3px 5px;
            font-size: 10px;
            line-height: 1.15;
          }

          .print-grid-2 > .print-box:first-child > div {
            margin-top: 2mm;
          }

          .print-products-list {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin: 2px 0 3px;
          }

          .print-product-row {
            border: 1px solid #94a3b8;
            border-radius: 4px;
            padding: 3px 4px;
            overflow-wrap: normal;
          }

          .print-box-heading {
            display: block;
            border-bottom: 1px solid #64748b;
            padding-bottom: 1px;
            font-size: 10px;
          }

          .print-product-heading {
            margin-bottom: 2px;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 2px;
            font-size: 11px;
            font-weight: 900;
          }

          .print-product-fields {
            display: grid;
            grid-template-columns: 1fr;
            row-gap: 1px;
          }

          .print-product-fields > div:not(.print-product-primary-fields) {
            display: grid;
            grid-template-columns: 17mm minmax(0, 1fr);
            gap: 2px;
            align-items: start;
            font-size: 9px;
            line-height: 1.1;
          }

          .print-product-primary-fields {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 2px;
          }

          .print-product-primary-fields > div {
            display: grid;
            grid-template-columns: 17mm minmax(0, 1fr);
            gap: 2px;
            align-items: start;
            font-size: 9px;
            line-height: 1.1;
          }

          .print-product-fields > div > b {
            color: #334155;
          }

          .print-product-fields > div > span {
            overflow-wrap: normal;
          }

          .print-deal-totals {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3px;
            border-top: 2px solid #0f172a;
            padding-top: 3px;
          }

          .print-deal-total {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: center;
            gap: 3px;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 2px 3px;
            min-width: 0;
          }

          .print-deal-total > span {
            color: #475569;
            font-size: 8px;
            font-weight: 900;
            text-transform: uppercase;
            white-space: nowrap;
          }

          .print-deal-total > b {
            font-size: 9px;
            font-weight: 900;
            text-align: right;
            overflow-wrap: normal;
          }

          .print-deal-total > small {
            grid-column: 1 / -1;
            font-size: 7px;
            color: #475569;
            font-weight: 800;
          }

          .print-section-title {
            font-size: 13px;
            font-weight: 900;
            border-bottom: 1px solid #0f172a;
            padding-bottom: 2px;
            margin-bottom: 7px;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            font-weight: 800;
            margin-bottom: 10px;
          }

          .print-table th {
            background-color: #f1f5f9 !important;
            border: 0.5px solid #94a3b8;
            padding: 5px 6px;
            font-weight: 900;
            text-align: left;
          }

          .print-table td {
            border: 0.5px solid #cbd5e1;
            padding: 5px 6px;
            font-weight: 800;
          }

          .print-payment-history {
            margin-top: 3px;
            color: #334155;
            font-size: 10px;
            line-height: 1.3;
            font-weight: 800;
          }

          .print-summary-box {
            display: flex;
            justify-content: space-between;
            border: 1.5px solid #0f172a;
            padding: 9px 12px;
            font-size: 13px;
            font-weight: 900;
            margin-top: 10px;
            margin-bottom: 22px;
            background-color: #f8fafc !important;
          }

          .print-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 56px;
            margin-top: 34px;
            margin-bottom: 24px;
            page-break-inside: avoid;
          }

          .signature-box {
            text-align: center;
            min-height: 105px;
          }

          .signature-line {
            border-top: 1px solid #0f172a;
            margin-top: 76px;
            margin-bottom: 6px;
          }

          .signature-box p {
            font-size: 12px;
            font-weight: 900;
            margin: 0;
          }

          .print-footer {
            margin-top: 10px;
            text-align: center;
            font-size: 10px;
            font-weight: 800;
            color: #64748b;
            border-top: 0.5px solid #cbd5e1;
            padding-top: 3px;
          }

          .print-grid-2 > .print-box,
          .print-grid-2 > .print-box * {
            font-size: 11px !important;
          }
        }
      `}</style>

          <ExistingPrintPopup
        kind={printPopup?.kind}
        recordId={printPopup?.recordId}
        onClose={() => setPrintPopup(null)}
      />
      </div>
  );
};

export default InstallmentPlanDetails;
