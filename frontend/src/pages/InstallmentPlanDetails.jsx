import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  MessageCircle,
  Package,
  Percent,
  Phone,
  Receipt,
  User,
  Wallet,
  X,
  AlertCircle,
} from 'lucide-react';

import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

const InstallmentPlanDetails = () => {
  const { id } = useParams();
  const { settings } = useSettings();

  const [plan, setPlan] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const currency = settings?.currency || 'Rs.';

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

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/api/installments/${id}`);

      if (response.data?.success) {
        setPlan(response.data.data.plan);
        setInstallments(response.data.data.installments || []);
      } else {
        setError(
          response.data?.message || 'Failed to load installment plan.'
        );
      }
    } catch (err) {
      console.error('Failed to fetch installment plan:', err);

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

  // ---------------------------------------------------------
  // CALCULATIONS
  // ---------------------------------------------------------

  const sale = plan?.sale || {};

  // Quantity comes from Sale model.
  const quantity = Number(sale?.quantity || 1);

  // Unit price from Sale.
  const productUnitPrice = Number(sale?.unitPrice || 0);

  // Subtotal = quantity × unit price
  const subtotal =
    Number(sale?.subtotal) ||
    quantity * productUnitPrice;

  // Discount
  const discount = Number(sale?.discount || 0);

  // Original sale total after discount.
  // This is the amount before financing markup.
  let originalPrice = 0;

  if (
    sale?.finalTotal !== undefined &&
    sale?.finalTotal !== null
  ) {
    originalPrice = Number(sale.finalTotal) || 0;
  } else {
    originalPrice = Math.max(
      0,
      subtotal - discount
    );
  }

  // Down payment
  const downPayment = Number(
    plan?.downPayment || sale?.downPayment || 0
  );

  // Duration
  const duration = Number(
    plan?.duration ||
      sale?.installmentDuration ||
      installments?.length ||
      0
  );

  // ---------------------------------------------------------
  // MARKUP RATE
  // Same logic as saleController.js
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // PRINCIPAL AFTER DOWN PAYMENT
  // ---------------------------------------------------------

  const remainingPrincipal = Math.max(
    0,
    originalPrice - downPayment
  );

  // ---------------------------------------------------------
  // MARKUP AMOUNT
  //
  // Backend:
  // initialRemaining = finalTotal - downPayment
  // markupAmount = initialRemaining × markupPercent
  // ---------------------------------------------------------

  const calculatedMarkupAmount = Math.round(
    remainingPrincipal * (markupPercent / 100)
  );

  // Use stored plan total to stay synchronized with backend.
  const totalPayable = Number(
    plan?.totalAmount ||
      originalPrice + calculatedMarkupAmount
  );

  // Exact markup stored/represented by backend.
  const markupAmount = Math.max(
    0,
    totalPayable - originalPrice
  );

  // Amount that was financed through installments.
  // This excludes down payment.
  const financedAmount = Math.max(
    0,
    totalPayable - downPayment
  );

  // ---------------------------------------------------------
  // INSTALLMENT PAYMENTS
  // ---------------------------------------------------------

  const totalPaidInInstallments =
    installments.reduce(
      (sum, inst) =>
        sum + Number(inst.paidAmount || 0),
      0
    );

  // Down payment + installment payments
  const totalCustomerPaid =
    downPayment + totalPaidInInstallments;

  // Backend remaining balance is the most reliable value.
  const remainingBalance = Number(
    plan?.remainingBalance ??
      Math.max(
        0,
        totalPayable - totalCustomerPaid
      )
  );

  // Current installment amounts.
  const currentInstallmentTotal =
    installments.reduce(
      (sum, inst) =>
        sum + Number(inst.amount || 0),
      0
    );

  // Average current installment
  const averageMonthlyInstallment =
    duration > 0
      ? currentInstallmentTotal / duration
      : 0;

  // Initial schedule amount.
  const initialInstallmentTotal =
    installments.reduce(
      (sum, inst) =>
        sum +
        Number(
          inst.originalAmount ||
            inst.amount ||
            0
        ),
      0
    );

  // Payment progress including down payment.
  const paymentProgress =
    totalPayable > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (totalCustomerPaid / totalPayable) * 100
          )
        )
      : 0;

  const paidInstallments =
    installments.filter(
      (inst) => inst.status === 'Paid'
    ).length;

  const pendingInstallments =
    installments.filter(
      (inst) => inst.status !== 'Paid'
    ).length;

  const invoiceBillNumber =
    sale?.saleId ||
    plan?.planId ||
    'N/A';

  const planStartDate =
    plan?.createdAt ||
    sale?.createdAt;

  // ---------------------------------------------------------
  // PAYMENT MODAL
  // ---------------------------------------------------------

  const openPaymentModal = (installment) => {
    setSelectedInstallment(installment);

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

  const handlePayment = async (e) => {
    e.preventDefault();

    if (!selectedInstallment) return;

    const amount = Number(paymentAmount);

    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const remaining = Number(
      selectedInstallment.remainingAmount || 0
    );

    if (amount > remaining) {
      alert(
        `Payment cannot exceed remaining dues of ${formatMoney(
          remaining
        )}.`
      );
      return;
    }

    try {
      setPaymentLoading(true);

      const response = await api.post(
        `/api/installments/${selectedInstallment._id}/pay`,
        {
          amount,
          paymentMethod,
        }
      );

      if (response.data?.success) {
        alert(
          response.data?.message ||
            'Payment recorded successfully.'
        );

        closePaymentModal();
        await fetchPlan();
      } else {
        alert(
          response.data?.message ||
            'Failed to record payment.'
        );
      }
    } catch (err) {
      console.error('Payment error:', err);

      alert(
        err.response?.data?.message ||
          'Failed to record payment.'
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  // ---------------------------------------------------------
  // WHATSAPP REMINDER
  // ---------------------------------------------------------

  const formatWhatsAppNumber = (phone) => {
    if (!phone) return '';

    let cleaned = String(phone).replace(
      /[^0-9]/g,
      ''
    );

    if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
    }

    if (cleaned.startsWith('0')) {
      cleaned = `92${cleaned.substring(1)}`;
    }

    if (!cleaned.startsWith('92')) {
      if (cleaned.length === 10) {
        cleaned = `92${cleaned}`;
      }
    }

    return cleaned;
  };

  const handleSendWhatsAppReminder = (
    installment
  ) => {
    const phone = formatWhatsAppNumber(
      plan?.customer?.mobileNumber
    );

    if (!phone) {
      alert(
        'Customer mobile number is missing or invalid.'
      );
      return;
    }

    const customerName =
      plan?.customer?.fullName ||
      'Customer';

    const dueAmount = Number(
      installment?.remainingAmount || 0
    );

    const dueDate = installment?.dueDate
      ? formatDate(installment.dueDate)
      : 'N/A';

    const message = `Assalam-o-Alaikum ${customerName},

This is a reminder regarding your installment plan.

Installment: #${installment.installmentNumber}
Due Amount: ${formatMoney(dueAmount)}
Due Date: ${dueDate}

Please contact us for payment.

Thank you.`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
      message
    )}`;

    window.open(
      whatsappUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // ---------------------------------------------------------
  // LOADING / ERROR
  // ---------------------------------------------------------

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
              {error || 'Installment plan not found.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* ------------------------------------------------ */}
        {/* HEADER */}
        {/* ------------------------------------------------ */}

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
              Plan ID: {plan.planId || 'N/A'}
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${
              plan.status === 'Completed'
                ? 'bg-green-100 text-green-700'
                : plan.status === 'Overdue'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {plan.status === 'Completed' ? (
              <CheckCircle size={18} />
            ) : plan.status === 'Overdue' ? (
              <AlertCircle size={18} />
            ) : (
              <Clock size={18} />
            )}

            {plan.status}
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* CUSTOMER + SALE INFO */}
        {/* ------------------------------------------------ */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Customer */}
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
                  {plan.customer?.fullName || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Customer ID
                </p>

                <p className="font-medium text-gray-800">
                  {plan.customer?.customerId || 'N/A'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Phone
                  size={16}
                  className="text-gray-400"
                />

                <span className="text-gray-700">
                  {plan.customer?.mobileNumber ||
                    'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Product / Sale */}
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
                  {formatDate(planStartDate)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Product
                </p>

                <p className="font-medium text-gray-800">
                  {plan.product?.name || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Quantity
                </p>

                <p className="font-medium text-gray-800">
                  {quantity} unit
                  {quantity !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* CALCULATION BREAKDOWN */}
        {/* ------------------------------------------------ */}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">

          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Receipt
                  size={22}
                  className="text-indigo-600"
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Financing Calculation
                </h2>

                <p className="text-sm text-gray-500">
                  See exactly how the down payment,
                  markup and installments are calculated.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">

            {/* Formula Explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">
                How your financing is calculated
              </h3>

              <div className="text-sm text-blue-900 space-y-1">
                <p>
                  <strong>1.</strong> Original Sale Total
                  = Subtotal − Discount
                </p>

                <p>
                  <strong>2.</strong> Remaining Principal
                  = Original Sale Total − Down Payment
                </p>

                <p>
                  <strong>3.</strong> Markup
                  = Remaining Principal × Markup %
                </p>

                <p>
                  <strong>4.</strong> Installment Total
                  = Remaining Principal + Markup
                </p>

                <p>
                  <strong>5.</strong> Total Customer Payable
                  = Down Payment + Installment Total
                </p>
              </div>
            </div>

            {/* Calculation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

              {/* Quantity */}
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Package
                    size={18}
                    className="text-purple-600"
                  />

                  <span className="text-sm text-gray-500">
                    Quantity Purchased
                  </span>
                </div>

                <p className="text-xl font-bold text-gray-800">
                  {quantity} unit
                  {quantity !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Unit Price */}
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign
                    size={18}
                    className="text-green-600"
                  />

                  <span className="text-sm text-gray-500">
                    Unit Price
                  </span>
                </div>

                <p className="text-xl font-bold text-gray-800">
                  {formatMoney(productUnitPrice)}
                </p>
              </div>

              {/* Subtotal */}
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt
                    size={18}
                    className="text-gray-600"
                  />

                  <span className="text-sm text-gray-500">
                    Subtotal
                  </span>
                </div>

                <p className="text-xl font-bold text-gray-800">
                  {formatMoney(subtotal)}
                </p>
              </div>

              {/* Discount */}
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign
                    size={18}
                    className="text-red-500"
                  />

                  <span className="text-sm text-gray-500">
                    Discount
                  </span>
                </div>

                <p className="text-xl font-bold text-red-600">
                  - {formatMoney(discount)}
                </p>
              </div>

            </div>

            {/* Main Calculation */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Left Calculation */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">

                <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">
                    Step-by-Step Calculation
                  </h3>
                </div>

                <div className="p-5 space-y-4">

                  {/* Original */}
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-800">
                        Original Sale Total
                      </p>

                      <p className="text-xs text-gray-500">
                        Subtotal − Discount
                      </p>
                    </div>

                    <p className="font-bold text-gray-800">
                      {formatMoney(originalPrice)}
                    </p>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Down Payment */}
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-800">
                        Down Payment
                      </p>

                      <p className="text-xs text-gray-500">
                        Paid at the time of sale
                      </p>
                    </div>

                    <p className="font-bold text-green-600">
                      - {formatMoney(downPayment)}
                    </p>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Remaining Principal */}
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-800">
                        Principal After Down Payment
                      </p>

                      <p className="text-xs text-gray-500">
                        {formatMoney(originalPrice)} −{' '}
                        {formatMoney(downPayment)}
                      </p>
                    </div>

                    <p className="font-bold text-blue-600">
                      {formatMoney(remainingPrincipal)}
                    </p>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Markup */}
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        Markup

                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                          {markupPercent}%
                        </span>
                      </p>

                      <p className="text-xs text-gray-500">
                        {formatMoney(
                          remainingPrincipal
                        )}{' '}
                        × {markupPercent}%
                      </p>
                    </div>

                    <p className="font-bold text-orange-600">
                      + {formatMoney(markupAmount)}
                    </p>
                  </div>

                  <div className="border-t border-gray-200" />

                  {/* Installment Total */}
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-800">
                        Installment Total
                      </p>

                      <p className="text-xs text-gray-500">
                        Principal + Markup
                      </p>
                    </div>

                    <p className="font-bold text-blue-700">
                      {formatMoney(financedAmount)}
                    </p>
                  </div>

                  <div className="border-t border-gray-200" />

                  {/* Total Payable */}
                  <div className="flex justify-between gap-4 bg-green-50 -mx-5 px-5 py-4">
                    <div>
                      <p className="font-bold text-gray-800">
                        Total Customer Payable
                      </p>

                      <p className="text-xs text-gray-600">
                        Down Payment + Installments
                      </p>
                    </div>

                    <p className="text-xl font-bold text-green-700">
                      {formatMoney(totalPayable)}
                    </p>
                  </div>

                </div>
              </div>

              {/* Right Summary */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">

                <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">
                    Plan Summary
                  </h3>
                </div>

                <div className="p-5 space-y-4">

                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Plan Duration
                    </span>

                    <span className="font-semibold text-gray-800">
                      {duration} month
                      {duration !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Markup Rate
                    </span>

                    <span className="font-semibold text-orange-600">
                      {markupPercent}%
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Markup Amount
                    </span>

                    <span className="font-semibold text-orange-600">
                      {formatMoney(markupAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Down Payment
                    </span>

                    <span className="font-semibold text-green-600">
                      {formatMoney(downPayment)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Amount for Installments
                    </span>

                    <span className="font-semibold text-blue-600">
                      {formatMoney(financedAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Initial Installment Schedule
                    </span>

                    <span className="font-semibold text-gray-800">
                      {formatMoney(initialInstallmentTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Average Current Installment
                    </span>

                    <span className="font-semibold text-gray-800">
                      {formatMoney(
                        averageMonthlyInstallment
                      )}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-4">

                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">
                        Total Paid in Installments
                      </span>

                      <span className="font-semibold text-green-600">
                        {formatMoney(
                          totalPaidInInstallments
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">
                        Total Paid Including Down Payment
                      </span>

                      <span className="font-bold text-green-700">
                        {formatMoney(
                          totalCustomerPaid
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Remaining Balance
                      </span>

                      <span className="font-bold text-red-600">
                        {formatMoney(
                          remainingBalance
                        )}
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* Simple Formula */}
            <div className="mt-6 bg-gray-900 text-white rounded-xl p-5">

              <div className="flex items-center gap-2 mb-3">
                <Percent size={20} />
                <h3 className="font-semibold">
                  Current Plan Formula
                </h3>
              </div>

              <div className="text-sm md:text-base space-y-2 font-mono">

                <p>
                  Original Sale ={' '}
                  {formatMoney(originalPrice)}
                </p>

                <p>
                  Down Payment ={' '}
                  {formatMoney(downPayment)}
                </p>

                <p>
                  Remaining Principal ={' '}
                  {formatMoney(originalPrice)} −{' '}
                  {formatMoney(downPayment)} ={' '}
                  <strong>
                    {formatMoney(remainingPrincipal)}
                  </strong>
                </p>

                <p>
                  Markup ={' '}
                  {formatMoney(remainingPrincipal)} ×{' '}
                  {markupPercent}% ={' '}
                  <strong>
                    {formatMoney(markupAmount)}
                  </strong>
                </p>

                <p>
                  Installments ={' '}
                  {formatMoney(remainingPrincipal)} +{' '}
                  {formatMoney(markupAmount)} ={' '}
                  <strong>
                    {formatMoney(financedAmount)}
                  </strong>
                </p>

                <p>
                  Total Customer Cost ={' '}
                  {formatMoney(downPayment)} +{' '}
                  {formatMoney(financedAmount)} ={' '}
                  <strong>
                    {formatMoney(totalPayable)}
                  </strong>
                </p>

              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* PAYMENT PROGRESS */}
        {/* ------------------------------------------------ */}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">

            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Payment Progress
              </h2>

              <p className="text-sm text-gray-500">
                {paidInstallments} of{' '}
                {installments.length} installments paid
              </p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800">
                {paymentProgress.toFixed(1)}%
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
                {formatMoney(totalCustomerPaid)}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-red-50">
              <p className="text-sm text-gray-500">
                Remaining
              </p>

              <p className="text-lg font-bold text-red-700">
                {formatMoney(remainingBalance)}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-50">
              <p className="text-sm text-gray-500">
                Total Payable
              </p>

              <p className="text-lg font-bold text-blue-700">
                {formatMoney(totalPayable)}
              </p>
            </div>

          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* INSTALLMENT TABLE */}
        {/* ------------------------------------------------ */}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          <div className="p-5 border-b border-gray-200">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Installment Schedule
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {duration} monthly installment
                  {duration !== 1 ? 's' : ''}
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

          {installments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No installments found.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[900px]">

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

                  {installments.map((inst) => {

                    const instAmount = Number(
                      inst.amount || 0
                    );

                    const paidAmount = Number(
                      inst.paidAmount || 0
                    );

                    const remainingAmount = Number(
                      inst.remainingAmount || 0
                    );

                    return (
                      <tr
                        key={inst._id}
                        className="hover:bg-gray-50"
                      >

                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-800">
                            #{inst.installmentNumber}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-800">
                            {formatMoney(instAmount)}
                          </div>

                          {Number(
                            inst.originalAmount || 0
                          ) !== instAmount && (
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
                            {formatMoney(paidAmount)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`font-semibold ${
                              remainingAmount > 0
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
                            <Calendar size={15} />

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
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              inst.status === 'Paid'
                                ? 'bg-green-100 text-green-700'
                                : inst.status === 'Overdue'
                                ? 'bg-red-100 text-red-700'
                                : inst.status ===
                                  'Partially Paid'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {inst.status === 'Paid' ? (
                              <CheckCircle size={13} />
                            ) : inst.status ===
                              'Overdue' ? (
                              <AlertCircle size={13} />
                            ) : (
                              <Clock size={13} />
                            )}

                            {inst.status}
                          </span>

                        </td>

                        <td className="px-4 py-4">

                          {inst.status !== 'Paid' ? (
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
                                  size={15}
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
                                  size={15}
                                />
                              </button>

                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                                <CheckCircle
                                  size={15}
                                />
                                Paid
                              </span>
                            </div>
                          )}

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>
            </div>
          )}
        </div>

        {/* ------------------------------------------------ */}
        {/* PAYMENT MODAL */}
        {/* ------------------------------------------------ */}

        {showPaymentModal &&
          selectedInstallment && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

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
                    onClick={closePaymentModal}
                    disabled={paymentLoading}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>

                </div>

                <form
                  onSubmit={handlePayment}
                  className="p-5"
                >

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
                        Remaining Due
                      </span>

                      <span className="font-bold text-red-600">
                        {formatMoney(
                          selectedInstallment.remainingAmount
                        )}
                      </span>
                    </div>

                  </div>

                  <div className="mb-4">

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) =>
                        setPaymentAmount(
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Enter payment amount"
                      required
                    />

                  </div>

                  <div className="mb-6">

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>

                    <select
                      value={paymentMethod}
                      onChange={(e) =>
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

                  <div className="flex gap-3">

                    <button
                      type="button"
                      onClick={closePaymentModal}
                      disabled={paymentLoading}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={paymentLoading}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {paymentLoading
                        ? 'Processing...'
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