import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import { Link } from 'react-router-dom';

import toast from 'react-hot-toast';

import api from '../utils/api';

import {
  AlertCircle,
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
  TrendingUp,
  Target,
  ShieldAlert,
  Send,
  Users,
  Wallet,
  CircleCheck,
  Clock,
} from 'lucide-react';

import { useSettings } from '../context/SettingsContext';

const DueDates = () => {
  const { settings } = useSettings();

  // ======================================================
  // STATE
  // ======================================================

  const [dueData, setDueData] = useState({
    overdue: [],
    dueToday: [],
    upcoming: [],

    totalOverdue: 0,
    totalDueToday: 0,
    totalUpcoming: 0,
    totalDue: 0,
    totalPending: 0,

    overdueAmount: 0,
    dueTodayAmount: 0,
    upcomingAmount: 0,
    totalPendingAmount: 0,
  });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState('');

  const [expandedId, setExpandedId] =
    useState(null);

  // ======================================================
  // FETCH DUE INSTALLMENTS
  // ======================================================

  const fetchDueInstallments = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response =
        await api.get(
          '/api/installments/due'
        );

      if (response.data?.success) {
        const data =
          response.data?.data || {};

        const overdue =
          data.overdue || [];

        const dueToday =
          data.dueToday || [];

        const upcoming =
          data.upcoming || [];

        const overdueAmount =
          overdue.reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item.remainingAmount ||
                  item.amount ||
                  0
              ),
            0
          );

        const dueTodayAmount =
          dueToday.reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item.remainingAmount ||
                  item.amount ||
                  0
              ),
            0
          );

        const upcomingAmount =
          upcoming.reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item.remainingAmount ||
                  item.amount ||
                  0
              ),
            0
          );

        const totalRecovery =
          overdueAmount +
          dueTodayAmount;

        const totalPendingAmount =
          totalRecovery +
          upcomingAmount;

        setDueData({
          overdue,

          dueToday,

          upcoming,

          totalOverdue:
            data.totalOverdue ??
            overdue.length,

          totalDueToday:
            data.totalDueToday ??
            dueToday.length,

          totalUpcoming:
            data.totalUpcoming ??
            upcoming.length,

          totalDue:
            data.totalDue ??
            overdue.length +
              dueToday.length,

          totalPending:
            data.totalPending ??
            overdue.length +
              dueToday.length +
              upcoming.length,

          overdueAmount:
            Number(
              data.overdueAmount ??
                overdueAmount
            ),

          dueTodayAmount:
            Number(
              data.dueTodayAmount ??
                dueTodayAmount
            ),

          upcomingAmount:
            Number(
              data.upcomingAmount ??
                upcomingAmount
            ),

          totalPendingAmount:
            Number(
              data.totalPendingAmount ??
                totalPendingAmount
            ),
        });
      }

    } catch (error) {
      console.error(
        'Failed to fetch due installments:',
        error
      );

      toast.error(
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

  const formatCurrency = (
    amount
  ) => {
    return `${
      settings?.currency ||
      'PKR'
    } ${Number(
      amount || 0
    ).toLocaleString('en-PK')}`;
  };

  // ======================================================
  // FORMAT DATE
  // ======================================================

  const formatDate = (
    date
  ) => {
    if (!date) {
      return 'N/A';
    }

    return new Date(
      date
    ).toLocaleDateString(
      'en-PK',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  // ======================================================
  // WHATSAPP NUMBER
  // ======================================================

  const formatWhatsAppNumber = (
    phone
  ) => {
    if (!phone) {
      return '';
    }

    let number =
      String(phone).replace(
        /[^0-9]/g,
        ''
      );

    if (
      number.startsWith('0')
    ) {
      number =
        `92${number.substring(1)}`;
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
  // PRIORITY
  // ======================================================

  const getRecoveryPriority = (
    item,
    type = 'overdue'
  ) => {

    // ====================================================
    // UPCOMING
    // ====================================================

    if (
      type === 'upcoming'
    ) {
      return {
        key: 'upcoming',

        label: 'Upcoming',

        description:
          'Future installment - advance reminder recommended',

        score: 10,

        badge:
          'bg-blue-100 text-blue-700 border-blue-200',

        Icon: CalendarRange,

        iconClass:
          'text-blue-600',

        bgClass:
          'bg-blue-50 border-blue-100',
      };
    }

    // ====================================================
    // TODAY
    // ====================================================

    if (
      type === 'dueToday'
    ) {
      return {
        key: 'normal',

        label: 'Normal',

        description:
          'Payment is due today',

        score: 30,

        badge:
          'bg-emerald-100 text-emerald-700 border-emerald-200',

        Icon: CircleCheck,

        iconClass:
          'text-emerald-600',

        bgClass:
          'bg-emerald-50 border-emerald-100',
      };
    }

    // ====================================================
    // OVERDUE
    // ====================================================

    const daysOverdue =
      Number(
        item.daysOverdue || 0
      );

    // 11+ DAYS
    if (
      daysOverdue > 10
    ) {
      return {
        key: 'urgent',

        label: 'Urgent',

        description:
          'More than 10 days overdue - immediate recovery required',

        score: 100,

        badge:
          'bg-rose-100 text-rose-700 border-rose-200',

        Icon: ShieldAlert,

        iconClass:
          'text-rose-600',

        bgClass:
          'bg-rose-50 border-rose-100',
      };
    }

    // 7-10 DAYS
    if (
      daysOverdue >= 7
    ) {
      return {
        key: 'high',

        label: 'High',

        description:
          '7-10 days overdue - strong follow-up required',

        score: 85,

        badge:
          'bg-orange-100 text-orange-700 border-orange-200',

        Icon: AlertTriangle,

        iconClass:
          'text-orange-600',

        bgClass:
          'bg-orange-50 border-orange-100',
      };
    }

    // 1-6 DAYS
    if (
      daysOverdue > 0
    ) {
      return {
        key: 'medium',

        label: 'Medium',

        description:
          'Recently overdue - follow-up recommended',

        score: 70,

        badge:
          'bg-amber-100 text-amber-700 border-amber-200',

        Icon: AlertTriangle,

        iconClass:
          'text-amber-600',

        bgClass:
          'bg-amber-50 border-amber-100',
      };
    }

    // FALLBACK
    return {
      key: 'normal',

      label: 'Normal',

      description:
        'Payment is due today',

      score: 30,

      badge:
        'bg-emerald-100 text-emerald-700 border-emerald-200',

      Icon: CircleCheck,

      iconClass:
        'text-emerald-600',

      bgClass:
        'bg-emerald-50 border-emerald-100',
    };
  };

  // ======================================================
  // RECOVERY DATA
  // ======================================================

  const recoveryData =
    useMemo(() => {

      const overdue =
        dueData.overdue || [];

      const dueToday =
        dueData.dueToday || [];

      const allItems = [
        ...overdue.map(
          (item) => ({
            ...item,
            dueType: 'overdue',
          })
        ),

        ...dueToday.map(
          (item) => ({
            ...item,
            dueType: 'dueToday',
          })
        ),
      ];

      const overdueRecovery =
        overdue.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.remainingAmount ||
                item.amount ||
                0
            ),
          0
        );

      const todayRecovery =
        dueToday.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.remainingAmount ||
                item.amount ||
                0
            ),
          0
        );

      const totalRecovery =
        overdueRecovery +
        todayRecovery;

      const priorityItems =
        allItems
          .map(
            (item) => ({
              ...item,

              recoveryPriority:
                getRecoveryPriority(
                  item,
                  item.dueType
                ),
            })
          )
          .sort(
            (
              a,
              b
            ) => {

              if (
                b.recoveryPriority
                  .score !==
                a.recoveryPriority
                  .score
              ) {
                return (
                  b.recoveryPriority
                    .score -
                  a.recoveryPriority
                    .score
                );
              }

              return (
                Number(
                  b.remainingAmount ||
                    b.amount ||
                    0
                ) -
                Number(
                  a.remainingAmount ||
                    a.amount ||
                    0
                )
              );
            }
          );

      const urgentCount =
        priorityItems.filter(
          (item) =>
            item.recoveryPriority
              .key === 'urgent'
        ).length;

      const highCount =
        priorityItems.filter(
          (item) =>
            item.recoveryPriority
              .key === 'high'
        ).length;

      const mediumCount =
        priorityItems.filter(
          (item) =>
            item.recoveryPriority
              .key === 'medium'
        ).length;

      return {
        allItems,

        overdueRecovery,

        todayRecovery,

        totalRecovery,

        priorityItems,

        urgentCount,

        highCount,

        mediumCount,
      };

    }, [dueData]);

  // ======================================================
  // WHATSAPP REMINDER
  // ======================================================

  const handleWhatsAppReminder = (
    item,
    type = 'dueToday'
  ) => {

    const customer =
      item.installmentPlan
        ?.customer;

    const phone =
      formatWhatsAppNumber(
        customer?.mobileNumber
      );

    if (!phone) {
      toast.error(
        'Customer mobile number is missing or invalid.'
      );

      return;
    }

    const name =
      customer?.fullName ||
      'Dear Customer';

    const product =
      item.installmentPlan
        ?.product?.name ||
      'your product';

    const installmentNumber =
      item.installmentNumber ||
      '-';

    const amount =
      Number(
        item.remainingAmount ||
          item.amount ||
          0
      );

    const dueDate =
      formatDate(
        item.dueDate
      );

    let message = '';

    // ====================================================
    // OVERDUE
    // ====================================================

    if (
      type === 'overdue'
    ) {

      const daysOverdue =
        Number(
          item.daysOverdue || 0
        );

      message =
        `Assalam-o-Alaikum ${name},\n\n` +
        `This is a reminder regarding your installment payment for ${product}.\n\n` +
        `Installment: #${installmentNumber}\n` +
        `Due Date: ${dueDate}\n` +
        `Remaining Amount: ${formatCurrency(amount)}\n` +
        `Days Overdue: ${daysOverdue}\n\n` +
        `Your payment due date has passed. Please contact us or visit the shop to settle your payment.\n\n` +
        `Thank you - ${
          settings?.shopName ||
          'Electronics Shop'
        }`;

    // ====================================================
    // UPCOMING
    // ====================================================

    } else if (
      type === 'upcoming'
    ) {

      const days =
        Number(
          item.daysUntilDue || 0
        );

      const dueText =
        days === 1
          ? 'tomorrow'
          : `in ${days} days`;

      message =
        `Assalam-o-Alaikum ${name},\n\n` +
        `This is an advance reminder regarding your installment payment for ${product}.\n\n` +
        `Installment: #${installmentNumber}\n` +
        `Due Date: ${dueDate}\n` +
        `Remaining Amount: ${formatCurrency(amount)}\n\n` +
        `Your installment is due ${dueText}. We are reminding you in advance so you can arrange your payment on time.\n\n` +
        `Thank you - ${
          settings?.shopName ||
          'Electronics Shop'
        }`;

    // ====================================================
    // TODAY
    // ====================================================

    } else {

      message =
        `Assalam-o-Alaikum ${name},\n\n` +
        `This is a reminder that your installment payment for ${product} is due today.\n\n` +
        `Installment: #${installmentNumber}\n` +
        `Due Date: ${dueDate}\n` +
        `Remaining Amount: ${formatCurrency(amount)}\n\n` +
        `Please contact us or visit the shop to settle your payment.\n\n` +
        `Thank you - ${
          settings?.shopName ||
          'Electronics Shop'
        }`;
    }

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

  // ======================================================
  // BULK WHATSAPP
  // ======================================================

  const handleBulkWhatsApp =
    () => {

      const customers =
        recoveryData.priorityItems
          .filter(
            (item) => {

              const customer =
                item.installmentPlan
                  ?.customer;

              return Boolean(
                formatWhatsAppNumber(
                  customer?.mobileNumber
                )
              );
            }
          )
          .slice(0, 10);

      if (
        !customers.length
      ) {
        toast.error(
          'No customers with valid WhatsApp numbers found.'
        );

        return;
      }

      customers.forEach(
        (
          item,
          index
        ) => {

          setTimeout(
            () => {

              handleWhatsAppReminder(
                item,
                item.dueType ||
                  'dueToday'
              );

            },
            index * 700
          );
        }
      );

      toast.success(
        `${customers.length} WhatsApp reminders prepared.`
      );
    };

  // ======================================================
  // SEARCH
  // ======================================================

  const searchFilter =
    (item) => {

      const search =
        searchTerm
          .trim()
          .toLowerCase();

      if (!search) {
        return true;
      }

      const customer =
        item.installmentPlan
          ?.customer;

      const product =
        item.installmentPlan
          ?.product;

      const sale =
        item.installmentPlan
          ?.sale;

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

        item.daysUntilDue,

        item.daysOverdue,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(
        search
      );
    };

  // ======================================================
  // FILTERED DATA
  // ======================================================

  const filteredOverdue =
    useMemo(
      () =>
        (
          dueData.overdue ||
          []
        ).filter(
          searchFilter
        ),
      [
        dueData.overdue,
        searchTerm
      ]
    );

  const filteredDueToday =
    useMemo(
      () =>
        (
          dueData.dueToday ||
          []
        ).filter(
          searchFilter
        ),
      [
        dueData.dueToday,
        searchTerm
      ]
    );

  const filteredUpcoming =
    useMemo(
      () =>
        (
          dueData.upcoming ||
          []
        ).filter(
          searchFilter
        ),
      [
        dueData.upcoming,
        searchTerm
      ]
    );

  // ======================================================
  // TOGGLE DETAILS
  // ======================================================

  const toggleDetails =
    (id) => {

      setExpandedId(
        expandedId === id
          ? null
          : id
      );
    };

  // ======================================================
  // INSTALLMENT CARD
  // ======================================================

  const InstallmentCard = ({
    item,
    type,
  }) => {

    const plan =
      item.installmentPlan ||
      {};

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

    const recoveryPriority =
      getRecoveryPriority(
        item,
        type
      );

    const PriorityIcon =
      recoveryPriority.Icon;

    const cardId =
      `${item._id}-${type}`;

    const isExpanded =
      expandedId === cardId;

    const isOverdue =
      type === 'overdue';

    const isUpcoming =
      type === 'upcoming';

    const isToday =
      type === 'dueToday';

    return (
      <div
        className={`group relative bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${
          isUpcoming
            ? 'border-blue-200/80 hover:border-blue-300'
            : recoveryPriority.key ===
              'urgent'
            ? 'border-rose-300 hover:border-rose-400'
            : recoveryPriority.key ===
              'high'
            ? 'border-orange-200/80 hover:border-orange-300'
            : recoveryPriority.key ===
              'medium'
            ? 'border-amber-200/80 hover:border-amber-300'
            : 'border-emerald-200/80 hover:border-emerald-300'
        }`}
      >

        {/* TOP ACCENT */}

        <div
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
            isUpcoming
              ? 'from-blue-500 via-indigo-500 to-blue-400'
              : recoveryPriority.key ===
                'urgent'
              ? 'from-rose-600 via-red-600 to-rose-500'
              : recoveryPriority.key ===
                'high'
              ? 'from-orange-500 via-amber-500 to-orange-400'
              : recoveryPriority.key ===
                'medium'
              ? 'from-amber-500 via-yellow-500 to-amber-400'
              : 'from-emerald-500 via-teal-500 to-emerald-400'
          }`}
        />

        <div className="p-5 sm:p-6">

          {/* ==================================================
              MAIN INFO
          ================================================== */}

          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

            {/* CUSTOMER */}

            <div className="flex items-start gap-3.5 min-w-0 flex-1">

              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${
                  isUpcoming
                    ? 'bg-blue-50 border-blue-100 text-blue-600'
                    : recoveryPriority.key ===
                      'urgent'
                    ? 'bg-rose-50 border-rose-100 text-rose-600'
                    : recoveryPriority.key ===
                      'high'
                    ? 'bg-orange-50 border-orange-100 text-orange-600'
                    : recoveryPriority.key ===
                      'medium'
                    ? 'bg-amber-50 border-amber-100 text-amber-600'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                }`}
              >
                <User className="w-6 h-6" />
              </div>

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <h3 className="font-black text-slate-900 text-base truncate">
                    {customer.fullName ||
                      'Unknown Customer'}
                  </h3>

                  {customer.customerId && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-600">
                      ID:{' '}
                      {customer.customerId}
                    </span>
                  )}

                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-1">

                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                  <span>
                    {customer.mobileNumber ||
                      'No mobile recorded'}
                  </span>

                </div>

                {/* PRIORITY */}

                <div className="mt-2">

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wide ${recoveryPriority.badge}`}
                  >

                    <PriorityIcon
                      className={`w-3 h-3 ${recoveryPriority.iconClass}`}
                    />

                    {recoveryPriority.label}

                  </span>

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
                  {product.name ||
                    'Unknown Product'}
                </p>

                {(product.brand ||
                  product.model) && (
                  <p className="text-[10px] text-slate-400 font-semibold truncate">
                    {[
                      product.brand,
                      product.model,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}

              </div>
            </div>

            {/* INSTALLMENT */}

            <div className="flex items-start gap-3 flex-1">

              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
                <CreditCard className="w-4 h-4" />
              </div>

              <div>

                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Installment
                </p>

                <p className="font-black text-xs text-slate-900 mt-0.5">
                  Month #
                  {item.installmentNumber}
                </p>

                <p className="text-[10px] font-semibold text-slate-400">
                  of{' '}
                  {plan.duration ||
                    '-'}{' '}
                  Months Plan
                </p>

              </div>
            </div>

            {/* DUE DATE */}

            <div className="flex items-start gap-3 flex-1">

              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  isUpcoming
                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                    : recoveryPriority.key ===
                      'urgent'
                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                    : recoveryPriority.key ===
                      'high'
                    ? 'bg-orange-50 text-orange-600 border-orange-100'
                    : recoveryPriority.key ===
                      'medium'
                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
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
                    isUpcoming
                      ? 'text-blue-600'
                      : recoveryPriority.key ===
                        'urgent'
                      ? 'text-rose-600'
                      : recoveryPriority.key ===
                        'high'
                      ? 'text-orange-600'
                      : recoveryPriority.key ===
                        'medium'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {formatDate(
                    item.dueDate
                  )}
                </p>

                {isOverdue ? (

                  <p
                    className={`text-[10px] font-black ${
                      recoveryPriority.key ===
                      'urgent'
                        ? 'text-rose-600'
                        : recoveryPriority.key ===
                          'high'
                        ? 'text-orange-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {item.daysOverdue ||
                      0}{' '}
                    {Number(
                      item.daysOverdue ||
                        0
                    ) === 1
                      ? 'day'
                      : 'days'}{' '}
                    overdue
                  </p>

                ) : isUpcoming ? (

                  <p className="text-[10px] font-black text-blue-600">
                    {Number(
                      item.daysUntilDue ||
                        0
                    ) === 1
                      ? 'Due Tomorrow'
                      : `Due in ${
                          item.daysUntilDue ||
                          0
                        } days`}
                  </p>

                ) : (

                  <p className="text-[10px] font-black text-emerald-600">
                    Payable Today
                  </p>

                )}

              </div>
            </div>

            {/* AMOUNT */}

            <div className="text-left xl:text-right min-w-[140px]">

              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Remaining Due
              </p>

              <p
                className={`text-xl lg:text-2xl font-black tracking-tight mt-0.5 ${
                  isUpcoming
                    ? 'text-blue-600'
                    : recoveryPriority.key ===
                      'urgent'
                    ? 'text-rose-600'
                    : recoveryPriority.key ===
                      'high'
                    ? 'text-orange-600'
                    : recoveryPriority.key ===
                      'medium'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {formatCurrency(
                  remainingAmount
                )}
              </p>

              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                Total:{' '}
                {formatCurrency(
                  installmentAmount
                )}
              </p>

            </div>
          </div>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">

            <button
              type="button"
              onClick={() =>
                toggleDetails(
                  cardId
                )
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all hover:scale-[1.02] active:scale-95"
            >

              <Eye className="w-3.5 h-3.5" />

              {isExpanded
                ? 'Hide Details'
                : 'View Details'}

              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}

            </button>

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  handleWhatsAppReminder(
                    item,
                    type
                  )
                }
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all hover:scale-[1.02] active:scale-95 shadow-sm ${
                  isUpcoming
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >

                <MessageCircle className="w-3.5 h-3.5" />

                {isUpcoming
                  ? 'Advance Reminder'
                  : 'WhatsApp Reminder'}

              </button>

              <Link
                to={`/installments/${plan._id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-md shadow-blue-950/20 transition-all hover:scale-[1.02] active:scale-95"
              >

                <CreditCard className="w-3.5 h-3.5" />

                Settle Payment

                <ArrowRight className="w-3.5 h-3.5" />

              </Link>

            </div>
          </div>
        </div>

        {/* ==================================================
            EXPANDED DETAILS
        ================================================== */}

        {isExpanded && (

          <div className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">

              {/* CUSTOMER */}

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">

                <div className="flex items-center gap-2 mb-2 text-xs font-black text-slate-800">

                  <User className="w-3.5 h-3.5 text-blue-600" />

                  Customer Info

                </div>

                <div className="space-y-1 text-xs">

                  <p className="font-bold text-slate-800">
                    {customer.fullName ||
                      'N/A'}
                  </p>

                  <p className="text-slate-500">
                    {customer.mobileNumber ||
                      'No Phone'}
                  </p>

                  <p className="text-[10px] text-slate-400 font-semibold">
                    City:{' '}
                    {customer.city ||
                      '—'}
                  </p>

                </div>
              </div>

              {/* PRODUCT */}

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">

                <div className="flex items-center gap-2 mb-2 text-xs font-black text-slate-800">

                  <Package className="w-3.5 h-3.5 text-violet-600" />

                  Product Details

                </div>

                <div className="space-y-1 text-xs">

                  <p className="font-bold text-slate-800 truncate">
                    {product.name ||
                      'N/A'}
                  </p>

                  <p className="text-slate-500 truncate">
                    {[
                      product.brand,
                      product.model,
                    ]
                      .filter(Boolean)
                      .join(' / ') ||
                      'N/A'}
                  </p>

                  <p className="text-[10px] text-slate-400 font-semibold">
                    SKU:{' '}
                    {product.sku ||
                      '—'}
                  </p>

                </div>
              </div>

              {/* INSTALLMENT */}

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">

                <div className="flex items-center gap-2 mb-2 text-xs font-black text-slate-800">

                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />

                  Installment Status

                </div>

                <div className="space-y-1 text-xs">

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Total:
                    </span>

                    <span className="font-bold text-slate-800">
                      {formatCurrency(
                        installmentAmount
                      )}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Paid:
                    </span>

                    <span className="font-bold text-emerald-600">
                      {formatCurrency(
                        paidAmount
                      )}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Status:
                    </span>

                    <span
                      className={`font-black ${
                        isUpcoming
                          ? 'text-blue-600'
                          : recoveryPriority.key ===
                            'urgent'
                          ? 'text-rose-600'
                          : recoveryPriority.key ===
                            'high'
                          ? 'text-orange-600'
                          : recoveryPriority.key ===
                            'medium'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {isUpcoming
                        ? 'Upcoming'
                        : isToday
                        ? 'Due Today'
                        : item.status}
                    </span>

                  </div>

                </div>
              </div>

              {/* FINANCING */}

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">

                <div className="flex items-center gap-2 mb-2 text-xs font-black text-slate-800">

                  <FileText className="w-3.5 h-3.5 text-emerald-600" />

                  Financing Plan

                </div>

                <div className="space-y-1 text-xs">

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Plan ID:
                    </span>

                    <span className="font-bold text-slate-800">
                      {plan.planId ||
                        '—'}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Invoice:
                    </span>

                    <span className="font-bold text-slate-800">
                      {sale.saleId ||
                        '—'}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Remaining:
                    </span>

                    <span className="font-black text-rose-600">
                      {formatCurrency(
                        plan.remainingBalance
                      )}
                    </span>

                  </div>

                </div>
              </div>
            </div>

            {/* RECOVERY RECOMMENDATION */}

            <div className="mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50 p-4">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                <div className="flex items-start gap-3">

                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${recoveryPriority.bgClass}`}
                  >
                    <PriorityIcon
                      className={`w-4 h-4 ${recoveryPriority.iconClass}`}
                    />
                  </div>

                  <div>

                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">

                      {isUpcoming
                        ? 'Advance Collection Recommendation'
                        : 'Recovery Recommendation'}

                    </p>

                    <p className="text-xs font-bold text-slate-700 mt-0.5">

                      {isUpcoming
                        ? `Installment is due in ${
                            item.daysUntilDue ||
                            0
                          } ${
                            Number(
                              item.daysUntilDue ||
                                0
                            ) === 1
                              ? 'day'
                              : 'days'
                          }. Send an advance reminder to improve on-time collection.`
                        : recoveryPriority.description}

                    </p>

                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black ${recoveryPriority.badge}`}
                >

                  <PriorityIcon
                    className={`w-3 h-3 ${recoveryPriority.iconClass}`}
                  />

                  {recoveryPriority.label}

                </span>

              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60">

              <Link
                to={`/installments/${plan._id}`}
                className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors"
              >

                <Eye className="w-3.5 h-3.5" />

                Open Full Financing Schedule

                <ArrowRight className="w-3.5 h-3.5" />

              </Link>

            </div>

          </div>
        )}

      </div>
    );
  };

  // ======================================================
  // SCROLLABLE SECTION WRAPPER
  // ======================================================

  const ScrollableCards = ({
    children,
    empty,
  }) => {

    if (empty) {
      return null;
    }

    return (
      <div
        className="
          max-h-[760px]
          overflow-y-auto
          overflow-x-hidden
          pr-1
          space-y-4
          scrollbar-thin
          scrollbar-thumb-slate-300
          scrollbar-track-transparent
          hover:scrollbar-thumb-slate-400
        "
      >
        {children}
      </div>
    );
  };

  // ======================================================
  // LOADING
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
            Calculating overdue, today's & upcoming customer installments...
          </p>

        </div>
      </div>
    );
  }

  // ======================================================
  // PAGE
  // ======================================================

  return (
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">

        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />

        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7 lg:p-8">

          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

            <div>

              <div className="flex flex-wrap items-center gap-2 mb-3">

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">

                  <Sparkles className="w-3 h-3 text-blue-400" />

                  Smart Recovery

                </span>

                <span className="text-slate-600">
                  •
                </span>

                <span className="text-[10px] font-bold text-slate-400">
                  Real-time Dues Monitor
                </span>

              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Due Dates & Overdue Dues
              </h1>

              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                Track pending customer payments, prioritize recovery, send WhatsApp reminders, and stay ahead of upcoming installments.
              </p>

            </div>

            <button
              onClick={() =>
                fetchDueInstallments(
                  true
                )
              }
              disabled={refreshing}
              className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 self-start xl:self-auto"
            >

              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshing
                    ? 'animate-spin text-blue-400'
                    : 'group-hover:rotate-180'
                } transition-transform duration-500`}
              />

              Refresh Dues

            </button>

          </div>
        </div>
      </section>

      {/* =====================================================
          RECOVERY SUMMARY
      ====================================================== */}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* OVERDUE RECOVERY */}

        <div className="group relative overflow-hidden bg-white rounded-3xl border border-rose-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">

          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />

          <div className="flex items-start justify-between gap-4">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Overdue Recovery
              </p>

              <p className="mt-2 text-xl sm:text-2xl font-black text-rose-600">
                {formatCurrency(
                  recoveryData.overdueRecovery
                )}
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                {dueData.totalOverdue}{' '}
                overdue installments
              </p>

            </div>

            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>

          </div>
        </div>

        {/* TODAY RECOVERY */}

        <div className="group relative overflow-hidden bg-white rounded-3xl border border-emerald-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">

          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />

          <div className="flex items-start justify-between gap-4">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Today Recovery
              </p>

              <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-600">
                {formatCurrency(
                  recoveryData.todayRecovery
                )}
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                {dueData.totalDueToday}{' '}
                installments due today
              </p>

            </div>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CircleCheck className="w-6 h-6" />
            </div>

          </div>
        </div>

        {/* TOTAL RECOVERY */}

        <div className="group relative overflow-hidden bg-white rounded-3xl border border-indigo-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">

          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-violet-600" />

          <div className="flex items-start justify-between gap-4">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Total Recovery
              </p>

              <p className="mt-2 text-xl sm:text-2xl font-black text-indigo-600">
                {formatCurrency(
                  recoveryData.totalRecovery
                )}
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                Overdue + Today
              </p>

            </div>

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6" />
            </div>

          </div>
        </div>

        {/* UPCOMING */}

        <div className="group relative overflow-hidden bg-white rounded-3xl border border-blue-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">

          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

          <div className="flex items-start justify-between gap-4">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Upcoming Recovery
              </p>

              <p className="mt-2 text-xl sm:text-2xl font-black text-blue-600">
                {formatCurrency(
                  dueData.upcomingAmount
                )}
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                {dueData.totalUpcoming}{' '}
                future installments
              </p>

            </div>

            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarRange className="w-6 h-6" />
            </div>

          </div>
        </div>

      </section>

      {/* =====================================================
          PRIORITY LEGEND
      ====================================================== */}

      <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-5">

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">

          <div>

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Recovery Priority Guide
            </p>

            <p className="text-xs text-slate-500 font-semibold mt-1">
              Priority is based on overdue days, not installment amount.
            </p>

          </div>

          <div className="flex flex-wrap items-center gap-2">

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black">
              <CircleCheck className="w-3 h-3" />
              Normal · Today
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black">
              <AlertTriangle className="w-3 h-3" />
              Medium · 1–6 Days
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-black">
              <AlertTriangle className="w-3 h-3" />
              High · 7–10 Days
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black">
              <ShieldAlert className="w-3 h-3" />
              Urgent · 11+ Days
            </span>

          </div>
        </div>
      </section>

      {/* =====================================================
          SEARCH
      ====================================================== */}

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5 sm:p-4">

        <div className="relative">

          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

          <input
            type="text"
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
            placeholder="Search customer, mobile, product, customer ID, invoice..."
            className="w-full h-11 border border-slate-200 rounded-xl pl-11 pr-10 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />

          {searchTerm && (

            <button
              onClick={() =>
                setSearchTerm('')
              }
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>

          )}

        </div>
      </section>

      {/* =====================================================
          RECOMMENDED RECOVERY
          ONLY 5 VISIBLE + SCROLL
      ====================================================== */}

      {recoveryData.priorityItems.length > 0 && (

        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">

          <div className="p-5 sm:p-6 border-b border-slate-100">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <TrendingUp className="w-5 h-5" />
                </div>

                <div>

                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Recommended Recovery
                  </h2>

                  <p className="text-xs text-slate-400">
                    Highest priority customers requiring attention.
                  </p>

                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black">

                  <Users className="w-3 h-3" />

                  {recoveryData.priorityItems.length}{' '}
                  Customers

                </span>

                <button
                  type="button"
                  onClick={
                    handleBulkWhatsApp
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all hover:scale-[1.02] active:scale-95"
                >

                  <Send className="w-3.5 h-3.5" />

                  Send Reminders

                </button>

              </div>

            </div>
          </div>

          <div
            className="
              max-h-[520px]
              overflow-y-auto
              p-3 sm:p-4
              space-y-3
              scrollbar-thin
              scrollbar-thumb-slate-300
              scrollbar-track-transparent
            "
          >

            {recoveryData.priorityItems.map(
              (
                item,
                index
              ) => {

                const customer =
                  item.installmentPlan
                    ?.customer ||
                  {};

                const amount =
                  Number(
                    item.remainingAmount ||
                      item.amount ||
                      0
                  );

                const priority =
                  item.recoveryPriority;

                const PriorityIcon =
                  priority.Icon;

                return (
                  <div
                    key={`priority-${item._id}-${index}`}
                    className="bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl p-4 transition-all"
                  >

                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                        #{index + 1}
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <p className="font-black text-sm text-slate-900 truncate">
                            {customer.fullName ||
                              'Unknown Customer'}
                          </p>

                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-black ${priority.badge}`}
                          >

                            <PriorityIcon
                              className={`w-3 h-3 ${priority.iconClass}`}
                            />

                            {priority.label}

                          </span>

                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[10px] font-semibold text-slate-400">

                          <span>
                            {customer.mobileNumber ||
                              'No phone'}
                          </span>

                          {item.daysOverdue > 0 && (

                            <span
                              className={
                                priority.key ===
                                'urgent'
                                  ? 'text-rose-600 font-black'
                                  : priority.key ===
                                    'high'
                                  ? 'text-orange-600 font-black'
                                  : 'text-amber-600 font-black'
                              }
                            >
                              {item.daysOverdue}{' '}
                              days overdue
                            </span>

                          )}

                          {item.dueType ===
                            'dueToday' && (

                            <span className="text-emerald-600 font-black">
                              Payable Today
                            </span>

                          )}

                          <span>
                            Installment #
                            {item.installmentNumber ||
                              '-'}
                          </span>

                        </div>
                      </div>

                      <div className="lg:text-right min-w-[140px]">

                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Recovery Amount
                        </p>

                        <p className="text-base font-black text-slate-900 mt-0.5">
                          {formatCurrency(
                            amount
                          )}
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleWhatsAppReminder(
                            item,
                            item.dueType ||
                              'dueToday'
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black transition-all active:scale-95"
                      >

                        <MessageCircle className="w-3.5 h-3.5" />

                        Remind

                      </button>

                    </div>
                  </div>
                );
              }
            )}

          </div>

          {recoveryData.priorityItems.length > 5 && (

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-center">

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Showing 5 of{' '}
                {recoveryData.priorityItems.length}{' '}
                · Scroll to view more
              </p>

            </div>

          )}

        </section>
      )}

      {/* =====================================================
          OVERDUE
          ONLY 5 VISIBLE + SCROLL
      ====================================================== */}

      <section className="space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div className="flex items-center gap-3">

            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <AlertCircle className="w-4 h-4" />
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
            {filteredOverdue.length}{' '}
            Records Found
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

          <div
            className="
              max-h-[760px]
              overflow-y-auto
              overflow-x-hidden
              pr-1
              space-y-4
              scrollbar-thin
              scrollbar-thumb-slate-300
              scrollbar-track-transparent
            "
          >

            {filteredOverdue.map(
              (item) => (

                <InstallmentCard
                  key={`${item._id}-overdue`}
                  item={item}
                  type="overdue"
                />

              )
            )}

          </div>

        )}

        {filteredOverdue.length > 5 && (

          <div className="text-center">

            <p className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-wider text-rose-600">

              <Clock className="w-3 h-3" />

              Showing 5+ with internal scroll

            </p>

          </div>

        )}

      </section>

      {/* =====================================================
          DUE TODAY
          ONLY 5 VISIBLE + SCROLL
      ====================================================== */}

      <section className="space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div className="flex items-center gap-3">

            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <CircleCheck className="w-4 h-4" />
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

          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black self-start sm:self-auto border border-emerald-200">
            {filteredDueToday.length}{' '}
            Records Found
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

          <div
            className="
              max-h-[760px]
              overflow-y-auto
              overflow-x-hidden
              pr-1
              space-y-4
              scrollbar-thin
              scrollbar-thumb-slate-300
              scrollbar-track-transparent
            "
          >

            {filteredDueToday.map(
              (item) => (

                <InstallmentCard
                  key={`${item._id}-today`}
                  item={item}
                  type="dueToday"
                />

              )
            )}

          </div>

        )}

        {filteredDueToday.length > 5 && (

          <div className="text-center">

            <p className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[10px] font-black uppercase tracking-wider text-emerald-600">

              <Clock className="w-3 h-3" />

              Showing 5+ with internal scroll

            </p>

          </div>

        )}

      </section>

      {/* =====================================================
          UPCOMING
          ONLY 5 VISIBLE + SCROLL
      ====================================================== */}

      <section className="space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div className="flex items-center gap-3">

            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <CalendarRange className="w-4 h-4" />
            </div>

            <div>

              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Upcoming Installments
              </h2>

              <p className="text-xs text-slate-400">
                Customer payments scheduled after today.
              </p>

            </div>

          </div>

          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-black self-start sm:self-auto border border-blue-200">
            {filteredUpcoming.length}{' '}
            Records Found
          </span>

        </div>

        {filteredUpcoming.length === 0 ? (

          <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center shadow-sm">

            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="font-black text-slate-800 text-base">
              No Upcoming Installments
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              There are no unpaid customer installments scheduled after today.
            </p>

          </div>

        ) : (

          <div
            className="
              max-h-[760px]
              overflow-y-auto
              overflow-x-hidden
              pr-1
              space-y-4
              scrollbar-thin
              scrollbar-thumb-slate-300
              scrollbar-track-transparent
            "
          >

            {filteredUpcoming.map(
              (item) => (

                <InstallmentCard
                  key={`${item._id}-upcoming`}
                  item={item}
                  type="upcoming"
                />

              )
            )}

          </div>

        )}

        {filteredUpcoming.length > 5 && (

          <div className="text-center">

            <p className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-100 text-[10px] font-black uppercase tracking-wider text-blue-600">

              <Clock className="w-3 h-3" />

              Showing 5+ with internal scroll

            </p>

          </div>

        )}

      </section>

    </div>
  );
};

export default DueDates;