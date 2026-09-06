import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
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
  ChevronUp
} from 'lucide-react';

const DueDates = () => {
  const [dueData, setDueData] = useState({
    overdue: [],
    dueToday: [],
    totalOverdue: 0,
    totalDueToday: 0,
    totalDue: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

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
            totalDue: 0
          }
        );
      }
    } catch (error) {
      console.error(
        'Failed to fetch due installments:',
        error
      );

      alert(
        error.response?.data?.message ||
        'Failed to load due installments.'
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
  // FORMAT CURRENCY
  // ======================================================
  const formatCurrency = (amount) => {
    return `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;
  };

  // ======================================================
  // FORMAT DATE
  // ======================================================
  const formatDate = (date) => {
    if (!date) return 'N/A';

    return new Date(date).toLocaleDateString(
      'en-PK',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  };

  // ======================================================
  // WHATSAPP NUMBER
  // ======================================================
  const formatWhatsAppNumber = (phone) => {
    if (!phone) return '';

    let number = String(phone).replace(
      /[^0-9]/g,
      ''
    );

    if (number.startsWith('0')) {
      number = `92${number.substring(1)}`;
    }

    if (
      number.startsWith('92') &&
      number.length >= 12
    ) {
      return number;
    }

    return '';
  };

  // ======================================================
  // WHATSAPP REMINDER
  // ======================================================
  const handleWhatsAppReminder = (item) => {
    const customer = item.installmentPlan?.customer;

    const phone = formatWhatsAppNumber(
      customer?.mobileNumber
    );

    if (!phone) {
      alert(
        'Customer mobile number is missing or invalid.'
      );
      return;
    }

    const name =
      customer?.fullName ||
      'Dear Customer';

    const product =
      item.installmentPlan?.product?.name ||
      'your product';

    const installmentNumber =
      item.installmentNumber || '-';

    const amount = Number(
      item.remainingAmount || item.amount || 0
    );

    const dueDate = formatDate(
      item.dueDate
    );

    let message = '';

    if (item.category === 'Overdue') {
      message =
        `Assalam-o-Alaikum ${name},\n\n` +
        `This is a reminder regarding your installment payment for ${product}.\n\n` +
        `Installment: #${installmentNumber}\n` +
        `Due Date: ${dueDate}\n` +
        `Remaining Amount: ${formatCurrency(amount)}\n\n` +
        `Your payment due date has passed. Please contact us or visit the shop to settle your payment.\n\n` +
        `Thank you.`;
    } else {
      message =
        `Assalam-o-Alaikum ${name},\n\n` +
        `This is a reminder that your installment payment for ${product} is due today.\n\n` +
        `Installment: #${installmentNumber}\n` +
        `Due Date: ${dueDate}\n` +
        `Remaining Amount: ${formatCurrency(amount)}\n\n` +
        `Please contact us or visit the shop to settle your payment.\n\n` +
        `Thank you.`;
    }

    const whatsappUrl =
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(
      whatsappUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // ======================================================
  // SEARCH FILTER
  // ======================================================
  const searchFilter = (item) => {
    const search =
      searchTerm.trim().toLowerCase();

    if (!search) return true;

    const customer =
      item.installmentPlan?.customer;

    const product =
      item.installmentPlan?.product;

    const sale =
      item.installmentPlan?.sale;

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
      item.category
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(search);
  };

  const filteredOverdue = useMemo(() => {
    return (dueData.overdue || []).filter(
      searchFilter
    );
  }, [dueData.overdue, searchTerm]);

  const filteredDueToday = useMemo(() => {
    return (dueData.dueToday || []).filter(
      searchFilter
    );
  }, [dueData.dueToday, searchTerm]);

  // ======================================================
  // TOGGLE DETAILS
  // ======================================================
  const toggleDetails = (id) => {
    setExpandedId(
      expandedId === id ? null : id
    );
  };

  // ======================================================
  // INSTALLMENT CARD
  // ======================================================
  const InstallmentCard = ({
    item,
    type
  }) => {
    const plan =
      item.installmentPlan || {};

    const customer =
      plan.customer || {};

    const product =
      plan.product || {};

    const sale =
      plan.sale || {};

    const remainingAmount =
      Number(
        item.remainingAmount || 0
      );

    const paidAmount =
      Number(
        item.paidAmount || 0
      );

    const installmentAmount =
      Number(
        item.amount || 0
      );

    const cardId =
      `${item._id}-${type}`;

    const isExpanded =
      expandedId === cardId;

    return (
      <div
        className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
          type === 'overdue'
            ? 'border-red-200'
            : 'border-orange-200'
        }`}
      >

        {/* ==================================================
            MAIN CARD
        ================================================== */}
        <div className="p-5">

          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

            {/* CUSTOMER */}
            <div className="flex items-start gap-4 min-w-0">

              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  type === 'overdue'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-orange-100 text-orange-600'
                }`}
              >
                <User className="w-6 h-6" />
              </div>

              <div className="min-w-0">

                <h3 className="font-bold text-gray-900 text-base truncate">
                  {customer.fullName ||
                    'Unknown Customer'}
                </h3>

                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <Phone className="w-3.5 h-3.5 shrink-0" />

                  <span>
                    {customer.mobileNumber ||
                      'No mobile number'}
                  </span>
                </div>

                {customer.customerId && (
                  <p className="text-xs text-gray-400 mt-1">
                    ID: {customer.customerId}
                  </p>
                )}

              </div>
            </div>


            {/* PRODUCT */}
            <div className="flex items-start gap-3 min-w-0 xl:max-w-[220px]">

              <Package className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />

              <div className="min-w-0">

                <p className="text-xs text-gray-400 font-semibold uppercase">
                  Product
                </p>

                <p className="font-semibold text-gray-800 truncate">
                  {product.name ||
                    'Unknown Product'}
                </p>

                {(product.brand ||
                  product.model) && (
                  <p className="text-xs text-gray-500 truncate">
                    {[
                      product.brand,
                      product.model
                    ]
                      .filter(Boolean)
                      .join(' - ')}
                  </p>
                )}

              </div>
            </div>


            {/* INSTALLMENT */}
            <div className="flex items-start gap-3">

              <CreditCard className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />

              <div>

                <p className="text-xs text-gray-400 font-semibold uppercase">
                  Installment
                </p>

                <p className="font-bold text-gray-800">
                  #{item.installmentNumber}
                </p>

                <p className="text-xs text-gray-500">
                  of {plan.duration || '-'} months
                </p>

              </div>
            </div>


            {/* DUE DATE */}
            <div className="flex items-start gap-3">

              <CalendarDays
                className={`w-5 h-5 mt-0.5 shrink-0 ${
                  type === 'overdue'
                    ? 'text-red-500'
                    : 'text-orange-500'
                }`}
              />

              <div>

                <p className="text-xs text-gray-400 font-semibold uppercase">
                  Due Date
                </p>

                <p
                  className={`font-bold ${
                    type === 'overdue'
                      ? 'text-red-600'
                      : 'text-orange-600'
                  }`}
                >
                  {formatDate(
                    item.dueDate
                  )}
                </p>

                {type === 'overdue' &&
                  item.daysOverdue && (
                    <p className="text-xs text-red-500 font-semibold">
                      {item.daysOverdue}{' '}
                      {item.daysOverdue === 1
                        ? 'day'
                        : 'days'} overdue
                    </p>
                  )}

                {type === 'dueToday' && (
                  <p className="text-xs text-orange-500 font-semibold">
                    Due Today
                  </p>
                )}

              </div>
            </div>


            {/* REMAINING */}
            <div className="text-left xl:text-right">

              <p className="text-xs text-gray-400 font-semibold uppercase">
                Remaining
              </p>

              <p
                className={`text-xl font-black ${
                  type === 'overdue'
                    ? 'text-red-600'
                    : 'text-orange-600'
                }`}
              >
                {formatCurrency(
                  remainingAmount
                )}
              </p>

              <p className="text-xs text-gray-400">
                Installment amount:{' '}
                {formatCurrency(
                  installmentAmount
                )}
              </p>

            </div>

          </div>


          {/* ACTIONS */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-2">

            <button
              onClick={() =>
                toggleDetails(cardId)
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold transition-colors"
            >
              <Eye className="w-4 h-4" />

              {isExpanded
                ? 'Hide Details'
                : 'View Details'}

              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>


            <Link
              to={`/installments/${plan._id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
            >
              <CreditCard className="w-4 h-4" />

              Settle Payment
            </Link>


            <button
              onClick={() =>
                handleWhatsAppReminder(item)
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />

              WhatsApp Reminder
            </button>

          </div>

        </div>


        {/* ==================================================
            EXPANDED DETAILS
        ================================================== */}
        {isExpanded && (
          <div className="border-t border-gray-200 bg-gray-50 p-5">

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

              {/* Customer Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">

                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-indigo-500" />

                  <h4 className="font-bold text-gray-800">
                    Customer
                  </h4>
                </div>

                <div className="space-y-2 text-sm">

                  <div>
                    <span className="text-gray-400">
                      Name
                    </span>

                    <p className="font-semibold text-gray-800">
                      {customer.fullName ||
                        'N/A'}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      Mobile
                    </span>

                    <p className="font-semibold text-gray-800">
                      {customer.mobileNumber ||
                        'N/A'}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      Customer ID
                    </span>

                    <p className="font-semibold text-gray-800">
                      {customer.customerId ||
                        'N/A'}
                    </p>
                  </div>

                </div>

              </div>


              {/* Product Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">

                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-purple-500" />

                  <h4 className="font-bold text-gray-800">
                    Product
                  </h4>
                </div>

                <div className="space-y-2 text-sm">

                  <div>
                    <span className="text-gray-400">
                      Name
                    </span>

                    <p className="font-semibold text-gray-800">
                      {product.name ||
                        'N/A'}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      Brand / Model
                    </span>

                    <p className="font-semibold text-gray-800">
                      {[
                        product.brand,
                        product.model
                      ]
                        .filter(Boolean)
                        .join(' / ') ||
                        'N/A'}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      SKU
                    </span>

                    <p className="font-semibold text-gray-800">
                      {product.sku ||
                        'N/A'}
                    </p>
                  </div>

                </div>

              </div>


              {/* Installment Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">

                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-blue-500" />

                  <h4 className="font-bold text-gray-800">
                    Installment
                  </h4>
                </div>

                <div className="space-y-2 text-sm">

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">
                      Installment No.
                    </span>

                    <span className="font-bold">
                      #{item.installmentNumber}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">
                      Amount
                    </span>

                    <span className="font-bold">
                      {formatCurrency(
                        installmentAmount
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">
                      Paid
                    </span>

                    <span className="font-bold text-green-600">
                      {formatCurrency(
                        paidAmount
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">
                      Remaining
                    </span>

                    <span className="font-black text-red-600">
                      {formatCurrency(
                        remainingAmount
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">
                      Status
                    </span>

                    <span
                      className={`font-bold ${
                        item.status === 'Overdue'
                          ? 'text-red-600'
                          : 'text-orange-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                </div>

              </div>


              {/* Plan Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">

                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-green-500" />

                  <h4 className="font-bold text-gray-800">
                    Plan Details
                  </h4>
                </div>

                <div className="space-y-2 text-sm">

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">
                      Plan ID
                    </span>

                    <span className="font-semibold text-gray-800 truncate">
                      {plan.planId ||
                        'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">
                      Duration
                    </span>

                    <span className="font-semibold">
                      {plan.duration || '-'} months
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">
                      Plan Remaining
                    </span>

                    <span className="font-black text-red-600">
                      {formatCurrency(
                        plan.remainingBalance
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">
                      Invoice / Sale
                    </span>

                    <span className="font-semibold">
                      {sale.saleId ||
                        'N/A'}
                    </span>
                  </div>

                </div>

              </div>

            </div>


            {/* Full Plan Button */}
            <div className="mt-4">

              <Link
                to={`/installments/${plan._id}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800"
              >
                <Eye className="w-4 h-4" />

                Open Complete Installment Plan
              </Link>

            </div>

          </div>
        )}

      </div>
    );
  };


  // ======================================================
  // LOADING
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">

        <div className="text-center">

          <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />

          <p className="text-gray-500 font-semibold">
            Loading due dates...
          </p>

        </div>

      </div>
    );
  }


  // ======================================================
  // PAGE
  // ======================================================
  return (
    <div className="space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <CalendarClock className="w-7 h-7" />
            </div>

            <div>

              <h1 className="text-2xl md:text-3xl font-black text-gray-900">
                Due Dates
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                Manage overdue and today's installment payments.
              </p>

            </div>

          </div>

        </div>


        <button
          onClick={() =>
            fetchDueInstallments(true)
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold disabled:opacity-60"
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

      </div>


      {/* ==================================================
          SUMMARY CARDS
      ================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Overdue
              </p>

              <p className="text-3xl font-black text-red-600 mt-1">
                {dueData.totalOverdue}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Installments
              </p>

            </div>

            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

          </div>

        </div>


        <div className="bg-white border border-orange-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Due Today
              </p>

              <p className="text-3xl font-black text-orange-600 mt-1">
                {dueData.totalDueToday}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Installments
              </p>

            </div>

            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>

          </div>

        </div>


        <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Total Due
              </p>

              <p className="text-3xl font-black text-indigo-600 mt-1">
                {dueData.totalDue}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Overdue + Today
              </p>

            </div>

            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </div>

          </div>

        </div>

      </div>


      {/* ==================================================
          SEARCH
      ================================================== */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">

        <div className="relative">

          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

          <input
            type="text"
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            placeholder="Search customer, mobile, product, customer ID, invoice..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
          />

        </div>

      </div>


      {/* ==================================================
          OVERDUE SECTION
      ================================================== */}
      <section>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>

            <div>

              <h2 className="text-xl font-black text-gray-900">
                Overdue
              </h2>

              <p className="text-sm text-gray-500">
                Installments whose due date has passed.
              </p>

            </div>

          </div>

          <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-black">
            {filteredOverdue.length} found
          </span>

        </div>


        {filteredOverdue.length === 0 ? (

          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">

            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-gray-800 text-lg">
              No Overdue Installments
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Great! There are no overdue unpaid installments.
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


      {/* ==================================================
          DUE TODAY SECTION
      ================================================== */}
      <section>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>

            <div>

              <h2 className="text-xl font-black text-gray-900">
                Due Today
              </h2>

              <p className="text-sm text-gray-500">
                Installments due today.
              </p>

            </div>

          </div>

          <span className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-black">
            {filteredDueToday.length} found
          </span>

        </div>


        {filteredDueToday.length === 0 ? (

          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">

            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-gray-800 text-lg">
              No Installments Due Today
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              There are no unpaid installments due today.
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