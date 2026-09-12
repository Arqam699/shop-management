import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { formatCnicSearchInput, matchesCnicSearch, matchesMobileSearch } from '../utils/cnicSearch';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

import {
  CreditCard,
  Search,
  Printer,
  X,
  ShieldCheck,
  Trash2,
  Folder,
  Layers,
  ChevronRight,
  Lock,
  Calendar,
  History,
  CheckCircle2,
  Clock3,
} from 'lucide-react';

const Payments = () => {
  const { settings } = useSettings();

  // =====================================================
  // STATE
  // =====================================================

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null);

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    paymentId: null,
    paymentReceiptNo: '',
  });

  const [viewModeTab, setViewModeTab] = useState(0);
  const [selectedInvoiceGroup, setSelectedInvoiceGroup] =
    useState(null);

  const [filterPreset, setFilterPreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const isDeletionUnlocked =
    settings?.allowGlobalDeletion === true;

  // =====================================================
  // FETCH PAYMENTS
  // =====================================================

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const response = await api.get('/payments');

      if (response.data?.success) {
        setPayments(response.data.data || []);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments history:', error);

      toast.error(
        error.response?.data?.message ||
          'Failed to load payment history.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // =====================================================
  // DELETE
  // =====================================================

  const triggerDeleteConfirmation = (id, paymentId) => {
    if (!isDeletionUnlocked) {
      toast.error(
        'Deletion Mode is disabled. Enable it from Settings first.'
      );
      return;
    }

    setDeleteModal({
      isOpen: true,
      paymentId: id,
      paymentReceiptNo: paymentId || 'Payment',
    });
  };

  const confirmDeletePayment = async () => {
    const { paymentId } = deleteModal;

    if (!paymentId) {
      setDeleteModal({
        isOpen: false,
        paymentId: null,
        paymentReceiptNo: '',
      });
      return;
    }

    try {
      const response = await api.delete(
        `/payments/${paymentId}`
      );

      if (response.data?.success) {
        setPayments((currentPayments) =>
          currentPayments.filter(
            (payment) => payment._id !== paymentId
          )
        );

        setSelectedInvoiceGroup((currentGroup) => {
          if (!currentGroup) return null;

          const updatedReceipts =
            currentGroup.receipts.filter(
              (payment) =>
                payment._id !== paymentId
            );

          return {
            ...currentGroup,
            receipts: updatedReceipts,
            totalPaidOnThisInvoice:
              updatedReceipts.reduce(
                (sum, payment) =>
                  sum + Number(payment.amount || 0),
                0
              ),
          };
        });

        if (activeReceipt?._id === paymentId) {
          setActiveReceipt(null);
        }

        toast.success(
          response.data?.message ||
            'Payment receipt removed successfully!'
        );
      } else {
        toast.error(
          response.data?.message ||
            'Failed to delete payment receipt.'
        );
      }
    } catch (error) {
      console.error('DELETE PAYMENT ERROR:', error);

      toast.error(
        error.response?.data?.message ||
          'Failed to delete payment receipt.'
      );
    } finally {
      setDeleteModal({
        isOpen: false,
        paymentId: null,
        paymentReceiptNo: '',
      });
    }
  };

  // =====================================================
  // DATE / TIME
  // =====================================================

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleString('en-PK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return 'N/A';

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleDateString('en-PK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return 'N/A';

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // =====================================================
  // IMAGE
  // =====================================================

  const getImageSource = (image) => {
    if (!image || typeof image !== 'string') {
      return '';
    }

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

  // =====================================================
  // SALE TYPE
  // =====================================================

  const getSaleType = (payment) => {
    const directSaleType =
      payment?.sale?.paymentType;

    const installmentSaleType =
      payment?.installmentPlan?.sale?.paymentType;

    if (
      directSaleType === 'Cash' ||
      installmentSaleType === 'Cash'
    ) {
      return 'Cash';
    }

    if (
      directSaleType === 'Installment' ||
      installmentSaleType === 'Installment'
    ) {
      return 'Installment';
    }

    if (payment?.installmentPlan) {
      return 'Installment';
    }

    return 'N/A';
  };

  // =====================================================
  // DATE FILTER
  // =====================================================

  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false;

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(today.getDate() - 2);

    if (filterPreset === 'all') {
      return true;
    }

    if (filterPreset === 'today') {
      return date.getTime() === today.getTime();
    }

    if (filterPreset === 'yesterday') {
      return date.getTime() === yesterday.getTime();
    }

    if (filterPreset === 'dayBeforeYesterday') {
      return date.getTime() === dayBeforeYesterday.getTime();
    }

    if (filterPreset === 'week') {
      const startOfWeek = new Date(today);

      startOfWeek.setDate(
        today.getDate() - 7
      );

      return (
        date >= startOfWeek &&
        date <= today
      );
    }

    if (filterPreset === 'month') {
      const startOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      return (
        date >= startOfMonth &&
        date <= today
      );
    }

    if (
      filterPreset === 'custom' &&
      customStartDate &&
      customEndDate
    ) {
      const start = new Date(customStartDate);

      start.setHours(0, 0, 0, 0);

      const end = new Date(customEndDate);

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

  // =====================================================
  // SEARCH + DATE FILTER
  // =====================================================

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const name =
        payment.customer?.fullName?.toLowerCase() ||
        '';

      const mobile =
        payment.customer?.mobileNumber || '';

      const cnic = payment.customer?.cnic || payment.customer?.CNIC || '';

      const invoiceNumber = (
        payment.sale?.saleId ||
        payment.installmentPlan?.sale?.saleId ||
        ''
      ).toLowerCase();

      const term =
        searchTerm.toLowerCase().trim();

      const matchesSearch =
        name.includes(term) ||
        mobile.includes(term) ||
        matchesMobileSearch(mobile, term) ||
        matchesCnicSearch(cnic, term) ||
        invoiceNumber.includes(term);

      const matchesDate =
        isDateInFilter(payment.paymentDate);

      return (
        matchesSearch &&
        matchesDate
      );
    });
  }, [
    payments,
    searchTerm,
    filterPreset,
    customStartDate,
    customEndDate,
  ]);

  // =====================================================
  // INVOICE-WISE GROUPING
  // =====================================================

  const invoiceGroupsList = useMemo(() => {
    const invoiceGroupsMap = {};

    filteredPayments.forEach((payment) => {
      const invoiceNo =
        payment.sale?.saleId ||
        payment.installmentPlan?.sale?.saleId ||
        'UNLINKED-INVOICE';

      if (!invoiceGroupsMap[invoiceNo]) {
        invoiceGroupsMap[invoiceNo] = {
          invoiceNumber: invoiceNo,
          customer: payment.customer,
          product:
            payment.installmentPlan?.product ||
            payment.sale?.product,
          installmentPlan:
            payment.installmentPlan,
          sale: payment.sale,
          totalPaidOnThisInvoice: 0,
          receipts: [],
        };
      }

      invoiceGroupsMap[
        invoiceNo
      ].totalPaidOnThisInvoice += Number(
        payment.amount || 0
      );

      invoiceGroupsMap[
        invoiceNo
      ].receipts.push(payment);
    });

    return Object.values(invoiceGroupsMap);
  }, [filteredPayments]);

  // =====================================================
  // PRINT
  // =====================================================

  const handlePrint = () => {
    window.print();
  };

  // =====================================================
  // CURRENT RECEIPT / PLAN
  // =====================================================

  const planDoc =
    activeReceipt?.installmentPlan;

  const totalPlanAmount = Number(
    planDoc?.totalAmount || 0
  );

  const downPayment = Number(
    planDoc?.downPayment || 0
  );

  const activeReceiptDate = activeReceipt
    ? new Date(
        activeReceipt.paymentDate
      )
    : null;

  // =====================================================
  // CURRENT INSTALLMENT NUMBER
  // =====================================================

  const currentInstallmentNumber =
    Number(
      activeReceipt?.currentInstallmentNumber ||
        activeReceipt?.installment
          ?.installmentNumber ||
        activeReceipt?.allocations?.[0]
          ?.installmentNumber ||
        0
    );

  // =====================================================
  // DOWN PAYMENT AS FIRST INSTALLMENT
  // =====================================================

  const isDownPaymentFirstInstallment =
    planDoc?.treatDownPaymentAsFirstInstallment ===
    true;

  // =====================================================
  // CURRENT INSTALLMENT
  // =====================================================

  const currentInstallment =
    activeReceipt?.currentInstallment ||
    activeReceipt?.installment ||
    activeReceipt?.allocations?.[0]
      ?.installment ||
    null;

  // =====================================================
  // CURRENT INSTALLMENT LABEL
  // =====================================================

  const currentInstallmentLabel =
    isDownPaymentFirstInstallment &&
    currentInstallmentNumber === 1
      ? 'Down Payment — First Installment'
      : currentInstallmentNumber > 0
      ? `Installment #${currentInstallmentNumber}`
      : 'Installment N/A';

  // =====================================================
  // INSTALLMENT HISTORY
  // =====================================================

  const installmentHistory =
    Array.isArray(
      activeReceipt?.installmentHistory
    )
      ? activeReceipt.installmentHistory
      : [];

  // =====================================================
  // PREVIOUS INSTALLMENTS
  // =====================================================

  const previousInstallments = useMemo(() => {
    if (
      Array.isArray(
        activeReceipt?.previousInstallments
      )
    ) {
      return [
        ...activeReceipt.previousInstallments,
      ].sort(
        (a, b) =>
          Number(a.installmentNumber || 0) -
          Number(b.installmentNumber || 0)
      );
    }

    return installmentHistory
      .filter((installment) => {
        const number = Number(
          installment.installmentNumber || 0
        );

        const paidAmount = Number(
          installment.paidAmount || 0
        );

        return (
          number < currentInstallmentNumber &&
          paidAmount > 0
        );
      })
      .sort(
        (a, b) =>
          Number(a.installmentNumber || 0) -
          Number(b.installmentNumber || 0)
      );
  }, [
    activeReceipt,
    installmentHistory,
    currentInstallmentNumber,
  ]);

  // =====================================================
  // PREVIOUS INSTALLMENTS TOTAL
  // =====================================================

  const previousInstallmentsPaid =
    previousInstallments.reduce(
      (sum, installment) =>
        sum +
        Number(
          installment.paidAmount || 0
        ),
      0
    );

  // =====================================================
  // PAYMENTS UP TO CURRENT RECEIPT
  // =====================================================

  const paymentsUpToReceipt = useMemo(() => {
    if (!activeReceipt || !activeReceiptDate) {
      return [];
    }

    return payments.filter((payment) => {
      const samePlan =
        payment.installmentPlan?._id &&
        planDoc?._id &&
        payment.installmentPlan._id ===
          planDoc._id;

      const sameSale =
        payment.sale?._id &&
        activeReceipt.sale?._id &&
        payment.sale._id ===
          activeReceipt.sale._id;

      const sameInvoice =
        samePlan ||
        sameSale;

      const paymentDate = new Date(
        payment.paymentDate
      );

      if (
        Number.isNaN(
          paymentDate.getTime()
        )
      ) {
        return false;
      }

      return (
        sameInvoice &&
        paymentDate <= activeReceiptDate
      );
    });
  }, [
    activeReceipt,
    activeReceiptDate,
    payments,
    planDoc,
  ]);

  // =====================================================
  // PAYMENT RECORD TOTAL
  // =====================================================

  const paymentAmountUpToReceipt =
    paymentsUpToReceipt.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  // =====================================================
  // DOWN PAYMENT DOUBLE-COUNT PROTECTION
  // =====================================================

  const hasSeparateDownPaymentPayment =
    isDownPaymentFirstInstallment &&
    paymentsUpToReceipt.some((payment) => {
      const number = Number(
        payment.installment
          ?.installmentNumber ||
          payment.currentInstallmentNumber ||
          payment.allocations?.[0]
            ?.installmentNumber ||
          0
      );

      return (
        number === 1 &&
        Number(payment.amount || 0) ===
          downPayment
      );
    });

  const totalPaidSoFar =
    downPayment > 0 &&
    !hasSeparateDownPaymentPayment
      ? downPayment +
        paymentAmountUpToReceipt
      : paymentAmountUpToReceipt;

  // =====================================================
  // HISTORICAL REMAINING BALANCE
  // =====================================================

  const remainingDuesAtReceipt =
    Math.max(
      0,
      totalPlanAmount -
        totalPaidSoFar
    );

  // =====================================================
  // INVOICE NUMBER
  // =====================================================

  const invoiceBillNumber =
    activeReceipt?.sale?.saleId ||
    planDoc?.sale?.saleId ||
    activeReceipt?.installmentPlan
      ?.saleId ||
    'N/A';

  // =====================================================
  // CURRENT RECEIPT AMOUNTS
  // =====================================================

  const currentReceiptAmount =
    Number(
      activeReceipt?.amount || 0
    );

  const originalInstallmentAmount =
    Number(
      activeReceipt
        ?.originalInstallmentAmount ||
        currentInstallment?.originalAmount ||
        currentInstallment?.amount ||
        0
    );

  const currentPaidTotal =
    currentInstallment
      ? Number(
          currentInstallment.paidAmount ??
            currentReceiptAmount
        )
      : currentReceiptAmount;

  const currentRemaining =
    currentInstallment
      ? Number(
          currentInstallment.remainingAmount ??
            Math.max(
              0,
              originalInstallmentAmount -
                currentPaidTotal
            )
        )
      : 0;

  const carryForwardAmount =
    Number(
      activeReceipt?.carryForwardAmount ||
        0
    );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      {/* =================================================
          NORMAL PAGE
      ================================================== */}

      <div className="space-y-6 print:hidden">

        {/* =================================================
            HEADER
        ================================================== */}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">

          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-sans">
              Payments & Invoices Ledger
            </h2>

            <p className="text-sm text-gray-600 font-medium">
              Filter payments by date, search by Invoice Number, and view collections.
            </p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl border self-start md:self-auto">

            <button
              onClick={() =>
                setViewModeTab(0)
              }
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-colors flex items-center space-x-1.5 ${
                viewModeTab === 0
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-slate-900'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />

              <span>
                Invoice Classification (
                {invoiceGroupsList.length})
              </span>
            </button>

            <button
              onClick={() =>
                setViewModeTab(1)
              }
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-colors flex items-center space-x-1.5 ${
                viewModeTab === 1
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />

              <span>
                All Receipts Ledger (
                {filteredPayments.length})
              </span>
            </button>

          </div>
        </div>

        {/* =================================================
            SEARCH + FILTERS
        ================================================== */}

        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-4">

          <div className="relative">

            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />

            <input
              type="text"
              placeholder="Search by invoice/bill number, customer name, mobile number, or CNIC..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(formatCnicSearchInput(e.target.value))
              }
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />

          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-3">

            <div className="flex flex-wrap gap-1.5">

              {[
                {
                  id: 'today',
                  label: 'Received Today',
                },
                {
                  id: 'yesterday',
                  label: 'Received Yesterday',
                },
                {
                  id: 'dayBeforeYesterday',
                  label: 'Received Day Before Yesterday',
                },
                {
                  id: 'all',
                  label: 'All-Time',
                },
                {
                  id: 'week',
                  label: 'Received This Week',
                },
                {
                  id: 'month',
                  label: 'Received This Month',
                },
                {
                  id: 'custom',
                  label: 'Custom Range',
                },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() =>
                    setFilterPreset(
                      preset.id
                    )
                  }
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                    filterPreset ===
                    preset.id
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
                  onChange={(e) =>
                    setCustomStartDate(
                      e.target.value
                    )
                  }
                  className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
                />

                <span>to</span>

                <input
                  type="date"
                  value={customEndDate}
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

        {/* =================================================
            TAB 0 — INVOICE CLASSIFICATION
        ================================================== */}

        {viewModeTab === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

            <div className="p-4 bg-gray-50/50 border-b flex justify-between items-center">

              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-2">

                <Layers className="w-4 h-4 text-indigo-600" />

                <span>
                  Invoice Numbers Classification List
                </span>

              </h3>

              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                Click any invoice to view its receipts
              </span>

            </div>

            {loading ? (
              <div className="p-10 text-center font-bold text-sm text-gray-500">
                Loading invoice payments hub...
              </div>
            ) : invoiceGroupsList.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-xs">
                No invoice payment collections found for this selection.
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">

                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">

                    <tr>

                      <th className="px-6 py-4">
                        Invoice / Bill #
                      </th>

                      <th className="px-6 py-4">
                        Customer Details
                      </th>

                      <th className="px-6 py-4">
                        Product details
                      </th>

                      <th className="px-6 py-4 text-right">
                        Total Deal Cost
                      </th>

                      <th className="px-6 py-4 text-right text-green-700">
                        Total Paid
                      </th>

                      <th className="px-6 py-4 text-right text-red-600">
                        Remaining Dues
                      </th>

                      <th className="px-6 py-4 text-center">
                        Receipts Count
                      </th>

                      <th className="px-6 py-4 text-center">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-200">

                    {invoiceGroupsList.map(
                      (group) => {
                        const remaining =
                          group
                            .installmentPlan
                            ?.remainingBalance ||
                          0;

                        const totalCost =
                          group
                            .installmentPlan
                            ?.totalAmount ||
                          group.sale
                            ?.finalTotal ||
                          0;

                        return (
                          <tr
                            key={
                              group.invoiceNumber
                            }
                            className="hover:bg-gray-50/50"
                          >

                            <td className="px-6 py-4 text-indigo-600 font-extrabold tracking-wider">
                              {
                                group.invoiceNumber
                              }
                            </td>

                            <td className="px-6 py-4">

                              <div>

                                <p className="font-bold text-gray-900">
                                  {group.customer
                                    ?.fullName ||
                                    'Walk-in'}
                                </p>

                                <p className="text-xs text-gray-500">
                                  {group.customer
                                    ?.mobileNumber ||
                                    ''}
                                </p>

                              </div>

                            </td>

                            <td className="px-6 py-4 text-slate-800 text-xs">
                              {group.product
                                ?.name ||
                                'Item'}
                            </td>

                            <td className="px-6 py-4 text-right font-bold text-slate-900">
                              {settings.currency}{' '}
                              {Number(
                                totalCost
                              ).toLocaleString()}
                            </td>

                            <td className="px-6 py-4 text-right font-bold text-green-700">
                              +
                              {settings.currency}{' '}
                              {Number(
                                group.totalPaidOnThisInvoice
                              ).toLocaleString()}
                            </td>

                            <td className="px-6 py-4 text-right font-black text-red-600">
                              {settings.currency}{' '}
                              {Number(
                                remaining
                              ).toLocaleString()}
                            </td>

                            <td className="px-6 py-4 text-center">

                              <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                {
                                  group
                                    .receipts
                                    .length
                                }{' '}
                                Receipts
                              </span>

                            </td>

                            <td className="px-6 py-4 text-center">

                              <button
                                onClick={() =>
                                  setSelectedInvoiceGroup(
                                    group
                                  )
                                }
                                className="inline-flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                              >
                                <span>
                                  View Receipts
                                </span>

                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>

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
        )}

        {/* =================================================
            TAB 1 — ALL RECEIPTS
        ================================================== */}

        {viewModeTab === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

            {filteredPayments.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-xs">
                No receipts logged for this selection.
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">

                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">

                    <tr>

                      <th className="px-6 py-4">
                        Invoice / Bill #
                      </th>

                      <th className="px-6 py-4">
                        Customer Details
                      </th>

                      <th className="px-6 py-4">
                        Installment Month
                      </th>

                      <th className="px-6 py-4 text-right">
                        Amount Paid
                      </th>

                      <th className="px-6 py-4 font-bold">
                        Method
                      </th>

                      <th className="px-6 py-4">
                        Collection Date
                      </th>

                      <th className="px-6 py-4 text-center">
                        Actions
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-200">

                    {filteredPayments.map(
                      (payment) => {

                        const invoiceNumber =
                          payment.sale?.saleId ||
                          payment.installmentPlan
                            ?.sale?.saleId ||
                          'N/A';

                        const installmentNumber =
                          payment.installment
                            ?.installmentNumber ||
                          payment.currentInstallmentNumber ||
                          payment.allocations?.[0]
                            ?.installmentNumber ||
                          'N/A';

                        const planIsFirst =
                          payment.installmentPlan
                            ?.treatDownPaymentAsFirstInstallment ===
                          true;

                        const isFirstDownPayment =
                          planIsFirst &&
                          Number(
                            installmentNumber
                          ) === 1;

                        const saleType =
                          getSaleType(payment);

                        return (
                          <tr
                            key={
                              payment._id
                            }
                            className="hover:bg-gray-50/50"
                          >

                            <td className="px-6 py-4 text-indigo-600 font-extrabold tracking-wider">
                              {invoiceNumber}
                            </td>

                            <td className="px-6 py-4">

                              <p className="font-bold text-gray-900">
                                {payment.customer
                                  ?.fullName ||
                                  'N/A'}
                              </p>

                              <p className="text-xs text-gray-500">
                                {payment.customer
                                  ?.mobileNumber ||
                                  ''}
                              </p>

                            </td>

                            <td className="px-6 py-4 text-slate-800">

                              {isFirstDownPayment ? (
                                <div className="space-y-0.5">

                                  <div className="font-black text-indigo-700">
                                    Down Payment
                                  </div>

                                  <div className="text-[10px] text-indigo-500 font-bold">
                                    First Installment
                                  </div>

                                </div>
                              ) : (
                                <>
                                  Installment #
                                  {
                                    installmentNumber
                                  }
                                </>
                              )}

                            </td>

                            <td className="px-6 py-4 text-right font-extrabold text-green-600">
                              {settings.currency}{' '}
                              {Number(
                                payment.amount || 0
                              ).toLocaleString()}
                            </td>

                            <td className="px-6 py-4 font-bold">

                              {saleType === 'Cash' ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-700 border border-green-200">
                                  Cash
                                </span>
                              ) : saleType === 'Installment' ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Installment
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                                  N/A
                                </span>
                              )}

                            </td>

                            <td className="px-6 py-4 text-xs text-gray-500">
                              {formatDateTime(
                                payment.paymentDate
                              )}
                            </td>

                            <td className="px-6 py-4 text-center">

                              <div className="flex items-center justify-center space-x-1.5">

                                <button
                                  onClick={() =>
                                    setActiveReceipt(
                                      payment
                                    )
                                  }
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                                  title="View Receipt"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>

                                {isDeletionUnlocked ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      triggerDeleteConfirmation(
                                        payment._id,
                                        payment.paymentId
                                      )
                                    }
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                                    title="Delete Payment"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <span
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed select-none"
                                    title="Locked: Enable Deletion Mode from Settings"
                                  >
                                    <Lock className="w-3 h-3 text-slate-400" />

                                    <span>
                                      Locked
                                    </span>
                                  </span>
                                )}

                              </div>

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
        )}

        {/* =================================================
            INVOICE RECEIPTS MODAL
        ================================================== */}

        {selectedInvoiceGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">

            <div className="bg-white border rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-scale-in">

              <div className="p-5 border-b bg-gray-50 flex justify-between items-center">

                <div>

                  <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-widest">
                    Invoice Receipts Hub
                  </span>

                  <h3 className="font-extrabold text-base text-slate-900">

                    Bill No:{' '}

                    <strong className="text-indigo-600">
                      {
                        selectedInvoiceGroup.invoiceNumber
                      }
                    </strong>{' '}

                    (
                    {
                      selectedInvoiceGroup
                        .customer
                        ?.fullName
                    }
                    )

                  </h3>

                </div>

                <button
                  onClick={() =>
                    setSelectedInvoiceGroup(
                      null
                    )
                  }
                  className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>

              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 text-center font-bold">

                  <div>

                    <span className="text-[9px] uppercase text-gray-400 block">
                      Product
                    </span>

                    <p className="text-slate-800 mt-0.5">
                      {
                        selectedInvoiceGroup
                          .product?.name
                      }
                    </p>

                  </div>

                  <div>

                    <span className="text-[9px] uppercase text-gray-400 block">
                      Total Paid So-far
                    </span>

                    <p className="text-green-700 mt-0.5">
                      {settings.currency}{' '}
                      {Number(
                        selectedInvoiceGroup.totalPaidOnThisInvoice
                      ).toLocaleString()}
                    </p>

                  </div>

                  <div>

                    <span className="text-[9px] uppercase text-gray-400 block">
                      Remaining Dues
                    </span>

                    <p className="text-red-600 mt-0.5">
                      {settings.currency}{' '}
                      {Number(
                        selectedInvoiceGroup
                          .installmentPlan
                          ?.remainingBalance ||
                          0
                      ).toLocaleString()}
                    </p>

                  </div>

                </div>

                <div className="border rounded-xl overflow-hidden text-xs">

                  <table className="w-full text-left">

                    <thead className="bg-gray-50 border-b font-bold text-gray-500 uppercase text-[10px]">

                      <tr>

                        <th className="px-4 py-3">
                          Installment Month
                        </th>

                        <th className="px-4 py-3 text-right">
                          Amount Received
                        </th>

                        <th className="px-4 py-3">
                          Payment Date & Time
                        </th>

                        <th className="px-4 py-3 text-center">
                          Actions
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y">

                      {selectedInvoiceGroup.receipts.map(
                        (payment) => {

                          const installmentNumber =
                            payment.installment
                              ?.installmentNumber ||
                            payment.currentInstallmentNumber ||
                            payment.allocations?.[0]
                              ?.installmentNumber ||
                            'N/A';

                          const specialFirst =
                            selectedInvoiceGroup
                              .installmentPlan
                              ?.treatDownPaymentAsFirstInstallment ===
                              true &&
                            Number(
                              installmentNumber
                            ) === 1;

                          return (
                            <tr
                              key={
                                payment._id
                              }
                              className="hover:bg-gray-50/50"
                            >

                              <td className="px-4 py-3 text-slate-800 font-bold">

                                {specialFirst ? (
                                  <div>

                                    <div className="font-black text-indigo-700">
                                      Down Payment
                                    </div>

                                    <div className="text-[9px] text-indigo-500 font-bold">
                                      First Installment
                                    </div>

                                  </div>
                                ) : (
                                  <>
                                    Month #
                                    {
                                      installmentNumber
                                    }
                                  </>
                                )}

                              </td>

                              <td className="px-4 py-3 text-right font-extrabold text-green-600">

                                {settings.currency}{' '}

                                {Number(
                                  payment.amount || 0
                                ).toLocaleString()}

                              </td>

                              <td className="px-4 py-3 text-gray-500 text-[10px]">
                                {formatDateTime(
                                  payment.paymentDate
                                )}
                              </td>

                              <td className="px-4 py-3 text-center">

                                <div className="flex items-center justify-center space-x-1.5">

                                  <button
                                    onClick={() =>
                                      setActiveReceipt(
                                        payment
                                      )
                                    }
                                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                    title="View This Slip"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>

                                  {isDeletionUnlocked ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        triggerDeleteConfirmation(
                                          payment._id,
                                          payment.paymentId
                                        )
                                      }
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                      title="Delete Payment"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span
                                      className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed select-none"
                                      title="Locked: Enable Deletion Mode from Settings"
                                    >
                                      <Lock className="w-3 h-3 text-slate-400" />

                                      <span>
                                        Locked
                                      </span>
                                    </span>
                                  )}

                                </div>

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* =====================================================
          PRINTABLE RECEIPT
      ===================================================== */}

      {activeReceipt && (
        <div
          id="printable-receipt-wrapper"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible"
        >

          <style>{`

            .hide-scrollbar,
            .hide-scrollbar * {
              scrollbar-width: none !important;
              -ms-overflow-style: none !important;
            }

            .hide-scrollbar::-webkit-scrollbar,
            .hide-scrollbar *::-webkit-scrollbar {
              display: none !important;
            }

            @page {
              size: auto;
              margin: 4mm;
            }

            @media print {

              html,
              body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: monospace !important;
                height: auto !important;
                width: 100% !important;
                overflow: visible !important;
              }

              body > * {
                visibility: visible !important;
              }

              #root {
                visibility: visible !important;
              }

              #root > * {
                visibility: hidden !important;
              }

              #root #printable-receipt-wrapper {
                visibility: visible !important;
                position: static !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                overflow: visible !important;
              }

              #root #printable-receipt-wrapper * {
                visibility: visible !important;
              }

              #printable-receipt-wrapper .print\\:hidden,
              #printable-receipt-wrapper button {
                display: none !important;
              }

              #printable-receipt-modal-container {
                display: flex !important;
                flex-direction: column !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                position: static !important;
                transform: none !important;
                width: 80mm !important;
                max-width: 80mm !important;
                min-width: 80mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                page-break-inside: avoid !important;
              }

              #printable-receipt-content {
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
                padding: 0 !important;
              }

              .border-b,
              .border-t {
                border-color: black !important;
                border-style: dashed !important;
              }

              tr,
              .no-split {
                page-break-inside: avoid !important;
              }

              img {
                print-color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
              }
            }

          `}</style>

          <div
            id="printable-receipt-modal-container"
            className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm my-auto shadow-2xl flex flex-col max-h-[90vh] print:shadow-none print:border-none print:max-h-full print:my-0 print:w-[80mm] print:mx-auto"
          >

            {/* =================================================
                RECEIPT PREVIEW HEADER
            ================================================== */}

            <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0 print:hidden rounded-t-2xl">

              <span className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">

                <ShieldCheck className="w-4 h-4 text-indigo-600" />

                <span>
                  Print Receipt Preview
                </span>

              </span>

              <div className="flex space-x-2">

                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow transition-colors"
                >

                  <Printer className="w-3.5 h-3.5" />

                  <span>
                    Print Slip
                  </span>

                </button>

                <button
                  onClick={() =>
                    setActiveReceipt(null)
                  }
                  className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                >

                  <X className="w-4 h-4" />

                </button>

              </div>

            </div>

            {/* =================================================
                RECEIPT CONTENT
            ================================================== */}

            <div
              id="printable-receipt-content"
              className="p-6 space-y-3.5 text-slate-800 font-mono overflow-y-auto flex-1 hide-scrollbar print:overflow-visible print:p-0"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >

              {/* =================================================
                  SHOP HEADER
              ================================================== */}

              <div className="text-center pb-2 border-b border-dashed border-slate-300 space-y-1">

                <h3 className="text-lg font-black tracking-wider uppercase">
                  {settings.shopName ||
                    'Electronics Shop'}
                </h3>

                <p className="text-[10px] text-gray-500 font-bold">
                  {settings.shopAddress ||
                    'Dukan Address Details'}
                </p>

                <p className="text-[11px] font-extrabold text-slate-900">
                  Mob:{' '}
                  {settings.shopPhone ||
                    '+92 300 1234567'}
                </p>

                {isDownPaymentFirstInstallment &&
                currentInstallmentNumber ===
                  1 ? (
                  <p className="text-[10px] font-black text-indigo-700 tracking-wider">
                    DOWN PAYMENT — FIRST INSTALLMENT RECEIPT
                  </p>
                ) : (
                  <p className="text-[10px] font-bold text-indigo-600 tracking-wider">
                    INSTALLMENT PAYMENT RECEIPT
                  </p>
                )}

              </div>

              {/* =================================================
                  SPECIAL FIRST INSTALLMENT NOTICE
              ================================================== */}

              {isDownPaymentFirstInstallment &&
                currentInstallmentNumber ===
                  1 && (
                <div className="bg-indigo-50 border border-dashed border-indigo-200 rounded p-2 text-[9px] text-indigo-800">

                  <p className="font-black uppercase tracking-wider">
                    Down Payment — First Installment Receipt
                  </p>

                  <p className="mt-0.5">
                    This down payment has been counted as Installment #1 of the selected plan.
                  </p>

                </div>
              )}

              {/* =================================================
                  INVOICE
              ================================================== */}

              <div className="flex justify-between items-center text-[11px] border-b border-dashed border-slate-300 pb-1.5 font-bold">

                <div>
                  Invoice / Bill #:{' '}

                  <strong className="text-indigo-600 font-black">
                    {invoiceBillNumber}
                  </strong>
                </div>

                <div className="text-right text-[10px] text-slate-700">
                  {formatDateTime(
                    activeReceipt.paymentDate
                  )}
                </div>

              </div>

              {/* =================================================
                  CUSTOMER + PRODUCT
              ================================================== */}

              <div className="grid grid-cols-2 gap-4 py-1 border-b border-dashed border-slate-300 text-[11px]">

                <div className="space-y-0.5 border-r border-dashed border-slate-200 pr-2">

                  <span className="text-[9px] uppercase font-bold text-gray-400 block">
                    Customer
                  </span>

                  <p className="font-extrabold text-slate-900 truncate">
                    {activeReceipt.customer
                      ?.fullName ||
                      'Walk-in'}
                  </p>

                  <p className="text-slate-600 font-bold text-[10px]">
                    {activeReceipt.customer
                      ?.mobileNumber ||
                      ''}
                  </p>

                  <p className="text-[9px] text-slate-500 truncate">
                    CNIC:{' '}
                    {activeReceipt
                      .customer
                      ?.cnic || ''}
                  </p>

                  <div className="mt-2 flex space-x-2">

                    {activeReceipt.customer
                      ?.fingerprintImage && (
                      <img
                        src={getImageSource(
                          activeReceipt
                            .customer
                            .fingerprintImage
                        )}
                        alt="Fingerprint"
                        className="w-10 h-10 border border-gray-300 object-cover grayscale contrast-125"
                      />
                    )}

                    {activeReceipt.customer
                      ?.liveImage && (
                      <img
                        src={getImageSource(
                          activeReceipt
                            .customer
                            .liveImage
                        )}
                        alt="Live Photo"
                        className="w-10 h-10 border border-gray-300 object-cover"
                      />
                    )}

                  </div>

                </div>

                <div className="space-y-0.5 pl-1">

                  <span className="text-[9px] uppercase font-bold text-gray-400 block">
                    Product Financed
                  </span>

                  <p className="font-extrabold text-slate-900 truncate">
                    {planDoc?.product
                      ?.name ||
                      'Item'}
                  </p>

                  <p className="text-slate-600 font-bold text-[10px] truncate">
                    {planDoc?.product
                      ?.brand || ''}{' '}
                    {planDoc?.product
                      ?.model || ''}
                  </p>

                  {planDoc?.product
                    ?.imei && (
                    <p className="text-slate-600 font-bold text-[10px] truncate">
                      IMEI:{' '}
                      {
                        planDoc.product
                          .imei
                      }
                    </p>
                  )}

                  {planDoc?.product
                    ?.chassisNumber && (
                    <p className="text-slate-600 font-bold text-[10px] truncate">
                      Chassis:{' '}
                      {
                        planDoc.product
                          .chassisNumber
                      }
                    </p>
                  )}

                </div>

              </div>

              {/* =================================================
                  PREVIOUS INSTALLMENT HISTORY
              ================================================== */}

              {previousInstallments.length >
                0 && (
                <div className="border-b border-dashed border-slate-300 pb-2">

                  <div className="flex items-center justify-between mb-2">

                    <div className="flex items-center gap-1.5">

                      <History className="w-3.5 h-3.5 text-indigo-600" />

                      <span className="text-[10px] uppercase tracking-wider font-black text-slate-800">
                        Previous Installment History
                      </span>

                    </div>

                    <span className="text-[9px] font-bold text-green-700">
                      {settings.currency}{' '}
                      {previousInstallmentsPaid.toLocaleString()}{' '}
                      Paid
                    </span>

                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">

                    <table className="w-full text-[9px]">

                      <thead className="bg-slate-50">

                        <tr>

                          <th className="px-2 py-1.5 text-left font-black text-slate-500">
                            #
                          </th>

                          <th className="px-2 py-1.5 text-right font-black text-slate-500">
                            Paid
                          </th>

                          <th className="px-2 py-1.5 text-left font-black text-slate-500">
                            Date / Time
                          </th>

                          <th className="px-2 py-1.5 text-center font-black text-slate-500">
                            Status
                          </th>

                        </tr>

                      </thead>

                      <tbody className="divide-y divide-slate-100">

                        {previousInstallments.map(
                          (
                            installment
                          ) => {

                            const installmentNumber =
                              Number(
                                installment.installmentNumber ||
                                  0
                              );

                            const paidAmount =
                              Number(
                                installment.paidAmount ||
                                  0
                              );

                            const isFirstDownPayment =
                              isDownPaymentFirstInstallment &&
                              installmentNumber ===
                                1;

                            const status =
                              installment.status ||
                              (Number(
                                installment.remainingAmount ||
                                  0
                              ) === 0
                                ? 'Paid'
                                : paidAmount > 0
                                ? 'Partially Paid'
                                : 'Pending');

                            return (
                              <tr
                                key={
                                  installment._id ||
                                  installmentNumber
                                }
                              >

                                <td className="px-2 py-1.5 font-black text-slate-800">

                                  {isFirstDownPayment ? (
                                    <div className="leading-tight">

                                      <div className="text-indigo-700">
                                        #1
                                      </div>

                                      <div className="text-[7px] text-indigo-500">
                                        Down Payment
                                      </div>

                                    </div>
                                  ) : (
                                    <>
                                      #
                                      {
                                        installment.installmentNumber
                                      }
                                    </>
                                  )}

                                </td>

                                <td className="px-2 py-1.5 text-right font-black text-green-700">
                                  {settings.currency}{' '}
                                  {paidAmount.toLocaleString()}
                                </td>

                                <td className="px-2 py-1.5 text-slate-500">

                                  <div className="flex flex-col">

                                    <span>
                                      {formatDateOnly(
                                        installment.paidDate
                                      )}
                                    </span>

                                    <span className="text-[8px] text-slate-400">
                                      {formatTimeOnly(
                                        installment.paidDate
                                      )}
                                    </span>

                                  </div>

                                </td>

                                <td className="px-2 py-1.5 text-center">

                                  <span
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                                      status ===
                                      'Paid'
                                        ? 'bg-green-50 text-green-700'
                                        : status ===
                                          'Partially Paid'
                                        ? 'bg-orange-50 text-orange-700'
                                        : 'bg-slate-50 text-slate-600'
                                    }`}
                                  >

                                    {status ===
                                    'Paid' ? (
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                    ) : (
                                      <Clock3 className="w-2.5 h-2.5" />
                                    )}

                                    {status}

                                  </span>

                                </td>

                              </tr>
                            );
                          }
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}

              {/* =================================================
                  PRICING BREAKDOWN
                  
                  Unit Cash Price REMOVED
                  Financing Plan Taken REMOVED
              ================================================== */}

              <div className="space-y-1.5 text-[11px] font-bold text-gray-800">

                {/* Total Price */}

                <div className="flex justify-between text-slate-900">

                  <span>
                    Total Price (Plan Included):
                  </span>

                  <span>
                    {settings.currency}{' '}
                    {totalPlanAmount.toLocaleString()}
                  </span>

                </div>

                {/* Down Payment */}

                {downPayment > 0 && (
                  <div className="flex justify-between text-slate-600">

                    <span>
                      Down Payment:
                    </span>

                    <span>
                      {settings.currency}{' '}
                      {downPayment.toLocaleString()}
                    </span>

                  </div>
                )}

                {/* Total Paid */}

                <div className="flex justify-between text-green-700 border-b border-dashed border-slate-200 pb-1">

                  <span>
                    Total Paid (So far):
                  </span>

                  <span>
                    {settings.currency}{' '}
                    {totalPaidSoFar.toLocaleString()}
                  </span>

                </div>

                {/* Settled Installment */}

                <div className="flex justify-between pt-1">

                  <span>
                    Settled Month:
                  </span>

                  <span
                    className={
                      isDownPaymentFirstInstallment &&
                      currentInstallmentNumber ===
                        1
                        ? 'text-indigo-700 font-black'
                        : ''
                    }
                  >
                    {currentInstallmentLabel}
                  </span>

                </div>

                {/* Current Installment Details */}

                {currentInstallment && (
                  <div className="bg-indigo-50 border border-dashed border-indigo-200 p-2 rounded text-[9px] space-y-1">

                    <div className="flex justify-between">

                      <span className="font-bold text-indigo-800">
                        Current Installment Due:
                      </span>

                      <span className="font-black text-indigo-900">
                        {settings.currency}{' '}
                        {originalInstallmentAmount.toLocaleString()}
                      </span>

                    </div>

                    <div className="flex justify-between">

                      <span className="font-bold text-indigo-800">
                        Current Paid Total:
                      </span>

                      <span className="font-black text-green-700">
                        {settings.currency}{' '}
                        {currentPaidTotal.toLocaleString()}
                      </span>

                    </div>

                    <div className="flex justify-between">

                      <span className="font-bold text-indigo-800">
                        Current Remaining:
                      </span>

                      <span className="font-black text-red-600">
                        {settings.currency}{' '}
                        {currentRemaining.toLocaleString()}
                      </span>

                    </div>

                  </div>
                )}

                {/* Extra Payment / Future Adjustment */}

                {carryForwardAmount > 0 && (
                  <div className="bg-orange-50 border border-dashed border-orange-200 p-2 rounded text-[9px] text-orange-800 space-y-0.5">

                    <p className="font-black uppercase tracking-wider">
                      Extra Payment Adjustment:
                    </p>

                    <div className="flex justify-between">

                      <span>
                        Standard Installment Due:
                      </span>

                      <span>
                        {settings.currency}{' '}
                        {originalInstallmentAmount.toLocaleString()}
                      </span>

                    </div>

                    <div className="flex justify-between font-extrabold text-red-600">

                      <span>
                        Adjusted to Future Installments:
                      </span>

                      <span>
                        +
                        {settings.currency}{' '}
                        {carryForwardAmount.toLocaleString()}
                      </span>

                    </div>

                  </div>
                )}

                {/* This Receipt Paid */}

                <div className="flex justify-between border-t border-dashed border-slate-300 pt-1.5 items-center text-sm font-black text-slate-900">

                  <span>
                    This Receipt Paid:
                  </span>

                  <span className="text-green-600">
                    {settings.currency}{' '}
                    {currentReceiptAmount.toLocaleString()}
                  </span>

                </div>

                {/* Remaining Balance */}

                <div className="flex justify-between text-gray-500 pt-0.5 border-b border-dashed border-slate-300 pb-1.5">

                  <span>
                    Remaining Dues Balance:
                  </span>

                  <span className="text-red-500 font-extrabold">
                    {settings.currency}{' '}
                    {remainingDuesAtReceipt.toLocaleString()}
                  </span>

                </div>

              </div>

              {/* =================================================
                  SPECIAL FIRST INSTALLMENT PAYMENT DETAILS
              ================================================== */}

              {isDownPaymentFirstInstallment &&
                currentInstallmentNumber ===
                  1 && (
                <div className="border border-dashed border-indigo-200 bg-indigo-50 rounded p-2 text-[9px]">

                  <div className="flex justify-between gap-2">

                    <span className="font-black text-indigo-800">
                      Down Payment counted as:
                    </span>

                    <span className="font-black text-indigo-900">
                      Installment #1
                    </span>

                  </div>

                  <div className="flex justify-between gap-2 mt-1">

                    <span className="font-bold text-indigo-700">
                      First Installment Amount:
                    </span>

                    <span className="font-black text-green-700">
                      {settings.currency}{' '}
                      {downPayment.toLocaleString()}
                    </span>

                  </div>

                </div>
              )}

              {/* =================================================
                  SIGNATURES
              ================================================== */}

              <div className="pt-6 flex justify-between items-end text-center text-[9px] font-bold border-t border-dashed border-slate-300 print:pt-6">

                <div className="border-t border-dashed border-gray-400 w-24 pt-1">
                  Customer Sign
                </div>

                <div className="border-t border-dashed border-gray-400 w-24 pt-1">
                  Cashier Sign
                </div>

              </div>

              <div className="text-center pt-1">

                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-extrabold">
                  *** Thank You! ***
                </p>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          DELETE CONFIRM MODAL
      ===================================================== */}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({
            isOpen: false,
            paymentId: null,
            paymentReceiptNo: '',
          })
        }
        onConfirm={confirmDeletePayment}
        title="Delete Payment Receipt?"
        message={`Are you sure you want to permanently delete payment receipt ${
          deleteModal.paymentReceiptNo || ''
        }? This action cannot be undone.`}
        confirmText="Delete Receipt"
        cancelText="Cancel"
        danger
      />
    </>
  );
};

export default Payments;
