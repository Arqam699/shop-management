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
  const [selectedInstallment, setSelectedInstallment] =
    useState(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const currency = settings?.currency || 'Rs.';

  // =========================================================
  // HELPERS
  // =========================================================

  const roundMoney = (value) => {
    return Math.round(
      (Number(value || 0) + Number.EPSILON) * 100
    ) / 100;
  };

  const formatMoney = (amount) => {
    return `${currency} ${Number(
      amount || 0
    ).toLocaleString('en-PK')}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';

    return new Date(date).toLocaleDateString(
      'en-PK',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
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
          response.data.data.plan
        );

        setInstallments(
          response.data.data.installments || []
        );

        setPayments(
          response.data.data.payments || []
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

  const downPayment = Number(
    plan?.downPayment ||
      sale?.downPayment ||
      0
  );

  const duration = Number(
    plan?.duration ||
      sale?.installmentDuration ||
      installments?.length ||
      0
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

  const remainingPrincipal = Math.max(
    0,
    originalPrice - downPayment
  );

  const calculatedMarkupAmount =
    Math.round(
      remainingPrincipal *
        (markupPercent / 100)
    );

  const totalPayable = Number(
    plan?.totalAmount ||
      originalPrice +
        calculatedMarkupAmount
  );

  const installmentTotal = Math.max(
    0,
    totalPayable - downPayment
  );

  const currentInstallmentTotal =
    installments.reduce(
      (sum, inst) =>
        sum +
        Number(inst.amount || 0),
      0
    );

  const averageMonthlyInstallment =
    duration > 0
      ? currentInstallmentTotal /
        duration
      : 0;

  const totalPaidInInstallments =
    installments.reduce(
      (sum, inst) =>
        sum +
        Number(inst.paidAmount || 0),
      0
    );

  const totalCustomerPaid =
    downPayment +
    totalPaidInInstallments;

  const remainingBalance = Number(
    plan?.remainingBalance ??
      Math.max(
        0,
        totalPayable -
          totalCustomerPaid
      )
  );

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
    installments.filter(
      (inst) =>
        inst.status === 'Paid' ||
        inst.status === 'Settled'
    ).length;

  const partialInstallments =
    installments.filter(
      (inst) =>
        inst.status ===
        'Partially Paid'
    ).length;

  const invoiceBillNumber =
    sale?.saleId ||
    plan?.planId ||
    'N/A';

  const planStartDate =
    plan?.createdAt ||
    sale?.createdAt;

  // =========================================================
  // SELECTED PAYMENT CALCULATIONS
  // =========================================================

  const selectedRemaining = Number(
    selectedInstallment?.remainingAmount ||
      0
  );

  const enteredPayment = Number(
    paymentAmount || 0
  );

  const paymentDifference =
    roundMoney(
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

  const futureInstallments =
    useMemo(() => {
      if (!selectedInstallment) {
        return [];
      }

      return installments.filter(
        (inst) =>
          Number(
            inst.installmentNumber
          ) >
            Number(
              selectedInstallment.installmentNumber
            ) &&
          Number(
            inst.remainingAmount || 0
          ) > 0
      );
    }, [
      installments,
      selectedInstallment,
    ]);

  const estimatedEqualAdjustment =
    isOverPayment &&
    futureInstallments.length > 0
      ? roundMoney(
          paymentDifference /
            futureInstallments.length
        )
      : 0;

  // =========================================================
  // PAYMENT MODAL
  // =========================================================

  const openPaymentModal = (
    installment
  ) => {
    setSelectedInstallment(
      installment
    );

    setPaymentAmount(
      Number(
        installment?.remainingAmount || 0
      ).toString()
    );

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
  // HANDLE PAYMENT
  // =========================================================

  const handlePayment = async (e) => {
    e.preventDefault();

    if (!selectedInstallment) {
      return;
    }

    const amount =
      roundMoney(paymentAmount);

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
      roundMoney(
        selectedInstallment.remainingAmount
      );

    if (remaining <= 0) {
      toast.error(
        'This installment is already paid.'
      );
      return;
    }

    try {
      setPaymentLoading(true);

      const response =
        await api.post(
          `/api/installments/${selectedInstallment._id}/pay`,
          {
            installmentId:
              selectedInstallment._id,

            paymentAmount:
              amount,

            paymentMethod,

            notes: '',
          }
        );

      if (response.data?.success) {
        const extraPayment =
          Number(
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
        } else if (
          amount < remaining
        ) {
          toast.success(
            `Partial payment recorded. ${formatMoney(
              remaining - amount
            )} remains on this installment.`
          );
        } else {
          toast.success(
            response.data?.message ||
              'Payment recorded successfully.'
          );
        }

        closePaymentModal();

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
  // WHATSAPP REMINDER
  // =========================================================

  const formatWhatsAppNumber = (
    phone
  ) => {
    if (!phone) return '';

    let cleaned =
      String(phone).replace(
        /[^0-9]/g,
        ''
      );

    if (cleaned.startsWith('00')) {
      cleaned =
        cleaned.substring(2);
    }

    if (cleaned.startsWith('0')) {
      cleaned = `92${cleaned.substring(
        1
      )}`;
    }

    if (
      !cleaned.startsWith('92')
    ) {
      if (cleaned.length === 10) {
        cleaned = `92${cleaned}`;
      }
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

    const dueAmount = Number(
      installment?.remainingAmount ||
        0
    );

    const dueDate =
      installment?.dueDate
        ? formatDate(
            installment.dueDate
          )
        : 'N/A';

    const message = `Assalam-o-Alaikum ${customerName},

This is a reminder regarding your installment plan.

Installment: #${installment.installmentNumber}
Due Amount: ${formatMoney(dueAmount)}
Due Date: ${dueDate}

Please contact us for payment.

Thank you.`;

    const whatsappUrl =
      `https://wa.me/${phone}?text=` +
      encodeURIComponent(message);

    window.open(
      whatsappUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // =========================================================
  // PAYMENT STATUS BADGE
  // =========================================================

  const getStatusClasses = (
    status
  ) => {
    if (status === 'Paid') {
      return 'bg-green-100 text-green-700';
    }

    if (status === 'Overdue') {
      return 'bg-red-100 text-red-700';
    }

    if (
      status ===
      'Partially Paid'
    ) {
      return 'bg-yellow-100 text-yellow-700';
    }

    return 'bg-blue-100 text-blue-700';
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">

          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>

          <p className="text-gray-600">
            Loading installment plan...
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
      <div className="min-h-screen bg-gray-50 p-6">

        <div className="max-w-4xl mx-auto">

          <Link
            to="/installments"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft size={18} />
            Back to Installments
          </Link>

          <div className="bg-white rounded-xl shadow p-8 text-center">

            <AlertCircle
              size={48}
              className="mx-auto text-red-500 mb-4"
            />

            <h2 className="text-xl font-semibold text-gray-800">
              Failed to Load Plan
            </h2>

            <p className="text-gray-500 mt-2">
              {error ||
                'Installment plan not found.'}
            </p>

          </div>

        </div>

      </div>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">

      <div className="max-w-7xl mx-auto">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

          <div>

            <Link
              to="/installments"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-3"
            >
              <ArrowLeft size={18} />
              Back to Installments
            </Link>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Installment Plan Details
            </h1>

            <p className="text-gray-500 mt-1">
              Plan ID:{' '}
              {plan.planId || 'N/A'}
            </p>

          </div>

          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${
              plan.status ===
              'Completed'
                ? 'bg-green-100 text-green-700'
                : plan.status ===
                  'Overdue'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >

            {plan.status ===
            'Completed' ? (
              <CheckCircle size={18} />
            ) : plan.status ===
              'Overdue' ? (
              <AlertCircle size={18} />
            ) : (
              <Clock size={18} />
            )}

            {plan.status}

          </div>

        </div>

        {/* ================================================= */}
        {/* CUSTOMER + SALE INFO */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* CUSTOMER */}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">

            <div className="flex items-center gap-3 mb-4">

              <div className="p-2 bg-blue-100 rounded-lg">
                <User
                  size={22}
                  className="text-blue-600"
                />
              </div>

              <h2 className="text-lg font-semibold text-gray-800">
                Customer Information
              </h2>

            </div>

            <div className="space-y-3">

              <div>

                <p className="text-xs text-gray-500">
                  Customer Name
                </p>

                <p className="font-medium text-gray-800">
                  {plan.customer
                    ?.fullName ||
                    'N/A'}
                </p>

              </div>

              <div>

                <p className="text-xs text-gray-500">
                  Customer ID
                </p>

                <p className="font-medium text-gray-800">
                  {plan.customer
                    ?.customerId ||
                    'N/A'}
                </p>

              </div>

              <div className="flex items-center gap-2">

                <Phone
                  size={16}
                  className="text-gray-400"
                />

                <span className="text-gray-700">
                  {plan.customer
                    ?.mobileNumber ||
                    'N/A'}
                </span>

              </div>

            </div>

          </div>

          {/* SALE */}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">

            <div className="flex items-center gap-3 mb-4">

              <div className="p-2 bg-purple-100 rounded-lg">

                <Package
                  size={22}
                  className="text-purple-600"
                />

              </div>

              <h2 className="text-lg font-semibold text-gray-800">
                Sale Information
              </h2>

            </div>

            <div className="grid grid-cols-2 gap-4">

              <div>

                <p className="text-xs text-gray-500">
                  Invoice / Sale #
                </p>

                <p className="font-medium text-gray-800">
                  {invoiceBillNumber}
                </p>

              </div>

              <div>

                <p className="text-xs text-gray-500">
                  Plan Start
                </p>

                <p className="font-medium text-gray-800">
                  {formatDate(
                    planStartDate
                  )}
                </p>

              </div>

              <div>

                <p className="text-xs text-gray-500">
                  Product
                </p>

                <p className="font-medium text-gray-800">
                  {plan.product
                    ?.name ||
                    'N/A'}
                </p>

              </div>

              <div>

                <p className="text-xs text-gray-500">
                  Quantity
                </p>

                <p className="font-medium text-gray-800">
                  {quantity} unit
                  {quantity !== 1
                    ? 's'
                    : ''}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================= */}
        {/* INSTALLMENT CALCULATION */}
        {/* ================================================= */}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">

          <div className="flex items-center gap-3 mb-5">

            <div className="p-2 bg-blue-100 rounded-lg">

              <Receipt
                size={22}
                className="text-blue-600"
              />

            </div>

            <div>

              <h2 className="text-xl font-bold text-gray-800">
                Installment Calculation
              </h2>

              <p className="text-sm text-gray-500">
                How this installment plan was calculated
              </p>

            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* SALE TOTAL */}

            <div className="border border-gray-200 rounded-lg p-4">

              <p className="text-sm text-gray-500 mb-1">
                Sale Total
              </p>

              <p className="text-xl font-bold text-gray-800">
                {formatMoney(
                  originalPrice
                )}
              </p>

            </div>

            {/* DOWN PAYMENT */}

            <div className="border border-gray-200 rounded-lg p-4">

              <p className="text-sm text-gray-500 mb-1">
                Down Payment
              </p>

              <p className="text-xl font-bold text-green-600">
                {formatMoney(
                  downPayment
                )}
              </p>

            </div>

            {/* REMAINING */}

            <div className="border border-gray-200 rounded-lg p-4">

              <p className="text-sm text-gray-500 mb-1">
                Remaining After Down Payment
              </p>

              <p className="text-xl font-bold text-blue-600">
                {formatMoney(
                  remainingPrincipal
                )}
              </p>

            </div>

            {/* MARKUP */}

            <div className="border border-gray-200 rounded-lg p-4">

              <div className="flex items-center gap-2 mb-1">

                <p className="text-sm text-gray-500">
                  Markup
                </p>

                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                  {markupPercent}%
                </span>

              </div>

              <p className="text-xl font-bold text-orange-600">
                {formatMoney(
                  calculatedMarkupAmount
                )}
              </p>

              <p className="text-xs text-gray-400 mt-1">
                {formatMoney(
                  remainingPrincipal
                )}{' '}
                × {markupPercent}%
              </p>

            </div>

            {/* INSTALLMENT TOTAL */}

            <div className="border border-gray-200 rounded-lg p-4">

              <p className="text-sm text-gray-500 mb-1">
                Total Installments
              </p>

              <p className="text-xl font-bold text-blue-700">
                {formatMoney(
                  installmentTotal
                )}
              </p>

            </div>

            {/* DURATION */}

            <div className="border border-gray-200 rounded-lg p-4">

              <p className="text-sm text-gray-500 mb-1">
                Duration
              </p>

              <p className="text-xl font-bold text-gray-800">
                {duration} Month
                {duration !== 1
                  ? 's'
                  : ''}
              </p>

            </div>

          </div>

          <div className="mt-5 bg-gray-50 border border-gray-200 rounded-lg p-4">

            <p className="text-sm text-gray-700">

              <span className="font-semibold">
                Calculation:
              </span>{' '}

              {formatMoney(
                originalPrice
              )}

              {' − '}

              {formatMoney(
                downPayment
              )}

              {' = '}

              <strong>
                {formatMoney(
                  remainingPrincipal
                )}
              </strong>

              {' → '}

              {formatMoney(
                remainingPrincipal
              )}

              {' + '}

              {formatMoney(
                calculatedMarkupAmount
              )}

              {' = '}

              <strong>
                {formatMoney(
                  installmentTotal
                )}
              </strong>

              {' / '}

              {duration} months

            </p>

          </div>

        </div>

        {/* ================================================= */}
        {/* PAYMENT PROGRESS */}
        {/* ================================================= */}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">

            <div>

              <h2 className="text-lg font-semibold text-gray-800">
                Payment Progress
              </h2>

              <p className="text-sm text-gray-500">
                {paidInstallments} of{' '}
                {installments.length}{' '}
                installments paid
              </p>

              {partialInstallments >
                0 && (
                <p className="text-sm text-yellow-600 mt-1">
                  {partialInstallments}{' '}
                  partially paid
                </p>
              )}

            </div>

            <div className="text-right">

              <p className="text-2xl font-bold text-gray-800">
                {paymentProgress.toFixed(
                  1
                )}
                %
              </p>

              <p className="text-sm text-gray-500">
                paid
              </p>

            </div>

          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">

            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{
                width: `${paymentProgress}%`,
              }}
            />

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">

            <div className="p-4 rounded-lg bg-green-50">

              <p className="text-sm text-gray-500">
                Total Paid
              </p>

              <p className="text-lg font-bold text-green-700">
                {formatMoney(
                  totalCustomerPaid
                )}
              </p>

            </div>

            <div className="p-4 rounded-lg bg-red-50">

              <p className="text-sm text-gray-500">
                Remaining
              </p>

              <p className="text-lg font-bold text-red-700">
                {formatMoney(
                  remainingBalance
                )}
              </p>

            </div>

            <div className="p-4 rounded-lg bg-blue-50">

              <p className="text-sm text-gray-500">
                Total Payable
              </p>

              <p className="text-lg font-bold text-blue-700">
                {formatMoney(
                  totalPayable
                )}
              </p>

            </div>

          </div>

        </div>

        {/* ================================================= */}
        {/* INSTALLMENT TABLE */}
        {/* ================================================= */}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          <div className="p-5 border-b border-gray-200">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

              <div>

                <h2 className="text-xl font-bold text-gray-800">
                  Installment Schedule
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {duration} monthly installment
                  {duration !== 1
                    ? 's'
                    : ''}
                </p>

              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">

                <Wallet size={18} />

                Current installment total:{' '}

                <strong>
                  {formatMoney(
                    currentInstallmentTotal
                  )}
                </strong>

              </div>

            </div>

          </div>

          {installments.length ===
          0 ? (

            <div className="p-8 text-center text-gray-500">
              No installments found.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[950px]">

                <thead className="bg-gray-50 border-b border-gray-200">

                  <tr>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      #
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Required Amount
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Paid
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Remaining
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Due Date
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Paid Date
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Status
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {installments.map(
                    (inst) => {

                      const instAmount =
                        Number(
                          inst.amount || 0
                        );

                      const paidAmount =
                        Number(
                          inst.paidAmount ||
                            0
                        );

                      const remainingAmount =
                        Number(
                          inst.remainingAmount ||
                            0
                        );

                      return (
                        <tr
                          key={
                            inst._id
                          }
                          className="hover:bg-gray-50"
                        >

                          <td className="px-4 py-4">

                            <div className="font-semibold text-gray-800">
                              #
                              {
                                inst.installmentNumber
                              }
                            </div>

                          </td>

                          <td className="px-4 py-4">

                            <div className="font-semibold text-gray-800">
                              {formatMoney(
                                instAmount
                              )}
                            </div>

                            {Number(
                              inst.originalAmount ||
                                0
                            ) !==
                              instAmount && (

                              <div className="text-xs text-gray-400">
                                Original:{' '}
                                {formatMoney(
                                  inst.originalAmount
                                )}
                              </div>

                            )}

                          </td>

                          <td className="px-4 py-4">

                            <span className="font-medium text-green-600">
                              {formatMoney(
                                paidAmount
                              )}
                            </span>

                          </td>

                          <td className="px-4 py-4">

                            <span
                              className={`font-semibold ${
                                remainingAmount >
                                0
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }`}
                            >
                              {formatMoney(
                                remainingAmount
                              )}
                            </span>

                          </td>

                          <td className="px-4 py-4">

                            <div className="flex items-center gap-2 text-gray-700">

                              <Calendar
                                size={15}
                              />

                              {formatDate(
                                inst.dueDate
                              )}

                            </div>

                          </td>

                          <td className="px-4 py-4 text-gray-600">

                            {inst.paidDate
                              ? formatDate(
                                  inst.paidDate
                                )
                              : '—'}

                          </td>

                          <td className="px-4 py-4">

                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusClasses(
                                inst.status
                              )}`}
                            >

                              {inst.status ===
                              'Paid' ? (
                                <CheckCircle
                                  size={
                                    13
                                  }
                                />
                              ) : inst.status ===
                                'Overdue' ? (
                                <AlertCircle
                                  size={
                                    13
                                  }
                                />
                              ) : (
                                <Clock
                                  size={
                                    13
                                  }
                                />
                              )}

                              {inst.status}

                            </span>

                          </td>

                          <td className="px-4 py-4">

                            {inst.status !==
                              'Paid' &&
                            inst.status !==
                              'Settled' ? (

                              <div className="flex items-center justify-end gap-2">

                                <button
                                  onClick={() =>
                                    openPaymentModal(
                                      inst
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                                >

                                  <CreditCard
                                    size={
                                      15
                                    }
                                  />

                                  Pay

                                </button>

                                <button
                                  onClick={() =>
                                    handleSendWhatsAppReminder(
                                      inst
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
                                  title="Send WhatsApp reminder"
                                >

                                  <MessageCircle
                                    size={
                                      15
                                    }
                                  />

                                </button>

                              </div>

                            ) : (

                              <div className="flex justify-end">

                                <span className="text-green-600 text-sm font-medium flex items-center gap-1">

                                  <CheckCircle
                                    size={
                                      15
                                    }
                                  />

                                  Paid

                                </span>

                              </div>

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

        </div>

        {/* ================================================= */}
        {/* PAYMENT MODAL */}
        {/* ================================================= */}

        {showPaymentModal &&
          selectedInstallment && (

            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">

                {/* MODAL HEADER */}

                <div className="flex items-center justify-between p-5 border-b border-gray-200">

                  <div>

                    <h2 className="text-lg font-bold text-gray-800">
                      Record Payment
                    </h2>

                    <p className="text-sm text-gray-500">
                      Installment #
                      {
                        selectedInstallment.installmentNumber
                      }
                    </p>

                  </div>

                  <button
                    onClick={
                      closePaymentModal
                    }
                    disabled={
                      paymentLoading
                    }
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>

                </div>

                {/* MODAL FORM */}

                <form
                  onSubmit={
                    handlePayment
                  }
                  className="p-5"
                >

                  {/* CURRENT DUE */}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">

                    <div className="flex justify-between mb-2">

                      <span className="text-sm text-gray-600">
                        Required Amount
                      </span>

                      <span className="font-semibold">
                        {formatMoney(
                          selectedInstallment.amount
                        )}
                      </span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-sm text-gray-600">
                        Current Remaining
                      </span>

                      <span className="font-bold text-red-600">
                        {formatMoney(
                          selectedInstallment.remainingAmount
                        )}
                      </span>

                    </div>

                  </div>

                  {/* PAYMENT AMOUNT */}

                  <div className="mb-4">

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={
                        paymentAmount
                      }
                      onChange={(
                        e
                      ) =>
                        setPaymentAmount(
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Enter payment amount"
                      required
                    />

                    <p className="text-xs text-gray-500 mt-2">
                      You can pay less,
                      exactly the due
                      amount, or more
                      than the current
                      installment.
                    </p>

                  </div>

                  {/* PAYMENT PREVIEW */}

                  {enteredPayment >
                    0 && (
                    <div className="mb-5">

                      {/* PARTIAL */}

                      {isPartialPayment && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">

                          <div className="flex items-start gap-3">

                            <ArrowDownCircle
                              size={
                                20
                              }
                              className="text-yellow-600 mt-0.5"
                            />

                            <div>

                              <p className="font-semibold text-yellow-800">
                                Partial Payment
                              </p>

                              <p className="text-sm text-yellow-700 mt-1">
                                You are paying{' '}
                                <strong>
                                  {formatMoney(
                                    enteredPayment
                                  )}
                                </strong>{' '}
                                out of{' '}
                                <strong>
                                  {formatMoney(
                                    selectedRemaining
                                  )}
                                </strong>
                                .
                              </p>

                              <p className="text-sm text-yellow-700 mt-1">
                                Remaining on
                                this installment:{' '}
                                <strong>
                                  {formatMoney(
                                    selectedRemaining -
                                      enteredPayment
                                  )}
                                </strong>
                              </p>

                              <p className="text-xs text-yellow-600 mt-2">
                                This remaining
                                amount will stay
                                on this
                                installment. It
                                will NOT be
                                transferred to
                                the next
                                installment.
                              </p>

                            </div>

                          </div>

                        </div>
                      )}

                      {/* EXACT */}

                      {isExactPayment && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">

                          <div className="flex items-start gap-3">

                            <CheckCircle
                              size={
                                20
                              }
                              className="text-green-600 mt-0.5"
                            />

                            <div>

                              <p className="font-semibold text-green-800">
                                Full Installment Payment
                              </p>

                              <p className="text-sm text-green-700 mt-1">
                                This payment
                                will fully
                                clear
                                installment #
                                {
                                  selectedInstallment.installmentNumber
                                }
                                .
                              </p>

                            </div>

                          </div>

                        </div>
                      )}

                      {/* OVERPAYMENT */}

                      {isOverPayment && (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">

                          <div className="flex items-start gap-3">

                            <ArrowUpCircle
                              size={
                                20
                              }
                              className="text-purple-600 mt-0.5"
                            />

                            <div className="w-full">

                              <p className="font-semibold text-purple-800">
                                Extra Payment
                              </p>

                              <p className="text-sm text-purple-700 mt-1">

                                Current
                                installment
                                will be paid
                                first.

                              </p>

                              <div className="mt-3 space-y-2">

                                <div className="flex justify-between text-sm">

                                  <span className="text-gray-600">
                                    Current due
                                  </span>

                                  <strong className="text-gray-800">
                                    {formatMoney(
                                      selectedRemaining
                                    )}
                                  </strong>

                                </div>

                                <div className="flex justify-between text-sm">

                                  <span className="text-gray-600">
                                    Total payment
                                  </span>

                                  <strong className="text-purple-700">
                                    {formatMoney(
                                      enteredPayment
                                    )}
                                  </strong>

                                </div>

                                <div className="border-t border-purple-200 pt-2 flex justify-between text-sm">

                                  <span className="text-purple-700 font-medium">
                                    Extra payment
                                  </span>

                                  <strong className="text-purple-800">
                                    {formatMoney(
                                      paymentDifference
                                    )}
                                  </strong>

                                </div>

                              </div>

                              {futureInstallments.length >
                                0 ? (

                                <div className="mt-4 bg-white border border-purple-200 rounded-lg p-3">

                                  <div className="flex items-center gap-2 mb-2">

                                    <Split
                                      size={
                                        16
                                      }
                                      className="text-purple-600"
                                    />

                                    <span className="text-sm font-semibold text-gray-800">
                                      Equal Adjustment
                                    </span>

                                  </div>

                                  <p className="text-xs text-gray-600">

                                    Extra payment
                                    will be
                                    adjusted
                                    across{' '}

                                    <strong>
                                      {
                                        futureInstallments.length
                                      }
                                    </strong>{' '}

                                    remaining
                                    installment
                                    {futureInstallments.length !==
                                    1
                                      ? 's'
                                      : ''}.

                                  </p>

                                  <div className="mt-2 flex justify-between">

                                    <span className="text-xs text-gray-500">
                                      Estimated
                                      adjustment
                                      per
                                      installment
                                    </span>

                                    <strong className="text-sm text-purple-700">
                                      {formatMoney(
                                        estimatedEqualAdjustment
                                      )}
                                    </strong>

                                  </div>

                                  <p className="text-[11px] text-gray-400 mt-2">
                                    Final allocation
                                    is calculated
                                    by the server
                                    using each
                                    installment's
                                    remaining
                                    balance.
                                  </p>

                                </div>

                              ) : (

                                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">

                                  <p className="text-xs text-yellow-700">
                                    There are no
                                    remaining
                                    installments
                                    after this
                                    installment.
                                  </p>

                                </div>

                              )}

                            </div>

                          </div>

                        </div>
                      )}

                    </div>
                  )}

                  {/* PAYMENT METHOD */}

                  <div className="mb-6">

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>

                    <select
                      value={
                        paymentMethod
                      }
                      onChange={(
                        e
                      ) =>
                        setPaymentMethod(
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                        Card
                      </option>

                    </select>

                  </div>

                  {/* ACTIONS */}

                  <div className="flex gap-3">

                    <button
                      type="button"
                      onClick={
                        closePaymentModal
                      }
                      disabled={
                        paymentLoading
                      }
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        paymentLoading ||
                        !enteredPayment
                      }
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >

                      {paymentLoading
                        ? 'Processing...'
                        : isOverPayment
                        ? 'Record Extra Payment'
                        : isPartialPayment
                        ? 'Record Partial Payment'
                        : 'Record Payment'}

                    </button>

                  </div>

                </form>

              </div>

            </div>
          )}

      </div>

    </div>
  );
};

export default InstallmentPlanDetails;