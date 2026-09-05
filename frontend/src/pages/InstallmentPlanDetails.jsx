
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import {
  ArrowLeft,
  User,
  CreditCard,
  ShoppingBag,
  CheckCircle,
  X,
  AlertCircle,
  MessageCircle
} from 'lucide-react';

const InstallmentPlanDetails = () => {
  const { id } = useParams();
  const { settings } = useSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInst, setSelectedInst] = useState(null);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payError, setPayError] = useState('');

  const fetchPlanDetails = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/api/installments/${id}`);

      if (response.data && response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading schedule sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanDetails();
  }, [id]);

  const handleOpenPayModal = (inst) => {
    setSelectedInst(inst);
    setReceivedAmount(inst.remainingAmount);
    setPaymentMethod('Cash');
    setPayError('');
    setShowPayModal(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    setPayError('');
    setIsSubmitting(true);

    const amt = Number(receivedAmount);

    if (isNaN(amt) || amt <= 0) {
      setPayError('Please enter a valid positive payment amount.');
      setIsSubmitting(false);
      return;
    }

    if (amt > selectedInst.remainingAmount) {
      setPayError(
        `Payment amount cannot be larger than outstanding dues (${selectedInst.remainingAmount}).`
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await api.post(
        `/api/installments/installment/${selectedInst._id}/pay`,
        {
          amount: amt,
          paymentMethod
        }
      );

      if (res.data && res.data.success) {
        alert(
          'Payment recorded successfully! Balance recalculated and carried forward.'
        );

        setShowPayModal(false);
        fetchPlanDetails();
      }
    } catch (error) {
      setPayError(
        error.response?.data?.message || 'Failed to submit payment.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';

    const date = new Date(dateStr);

    return date.toLocaleString('en-PK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

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

  const handleSendWhatsAppReminder = (inst) => {
    if (!data?.plan) return;

    const plan = data.plan;

    const phone = formatWhatsAppNumber(plan.customer?.mobileNumber);

    if (!phone) {
      return alert('Customer mobile number is missing or invalid.');
    }

    const dueDate = new Date(inst.dueDate);
    dueDate.setHours(23, 59, 59, 999);

    const today = new Date();

    const dueDateFormatted = new Date(
      inst.dueDate
    ).toLocaleDateString('en-PK');

    const isPastDue =
      today > dueDate || inst.status === 'Overdue';

    let message = '';

    if (isPastDue) {
      message = `*⚠️ Zaroori Notice - ${settings.shopName || 'Electronics Shop'}*

--------------------------------
Assalam-o-Alaikum *${plan.customer?.fullName || 'Customer'}*,
Aapko yaad dilaya jata hai ke aapki *${plan.product?.name || 'Item'}* ki kist k date guzar chuke hai aur  (Month #${inst.installmentNumber}) abhi tak aapki payment receive nahi hui hai...

*Kist Raqam:* ${settings.currency} ${inst.remainingAmount.toLocaleString()}
*Tareeqh Thi:* ${dueDateFormatted}

Bara-e-meherbani foran dukan tashreef layein aur apni kist jama karwayein taake record kharab na ho.
--------------------------------
*Dukan:* ${settings.shopName || ''}
*Phone:* ${settings.shopPhone || ''}`;
    } else {
      message = `*Kist Reminder - ${settings.shopName || 'Electronics Shop'}*
--------------------------------
Assalam-o-Alaikum *${plan.customer?.fullName || 'Customer'}* ,
Aapki *${plan.product?.name || 'Item'}* ki kist (Month #${inst.installmentNumber}) jald ane wale hai.

*Kist Raqam:* ${settings.currency} ${inst.remainingAmount.toLocaleString()}
*Akhri Tareeqh:* ${dueDateFormatted}

Bara-e-meherbani time par dukan tashreef la kar kist jama karwa dena.
--------------------------------
*Dukan:* ${settings.shopName || ''}
*Phone:* ${settings.shopPhone || ''}`;
    }

    const encoded = encodeURIComponent(message);

    window.open(
      `https://wa.me/${phone}?text=${encoded}`,
      '_blank'
    );
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>

        <span className="text-gray-500 text-sm">
          Compiling monthly installments calendar...
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-10 text-red-600">
        Error: Plan data missing.
      </div>
    );
  }

  const { plan, installments } = data;

  const originalPrice =
    plan?.sale?.finalTotal ||
    (plan?.totalAmount -
      (plan?.totalAmount -
        plan?.downPayment -
        plan?.remainingBalance)) ||
    0;

  const remainingPrincipal =
    originalPrice - (plan?.downPayment || 0);

  const markupAmount =
    (plan?.totalAmount || 0) - originalPrice;

  const totalFinanced =
    (plan?.totalAmount || 0) - (plan?.downPayment || 0);

  const invoiceBillNumber =
    plan?.sale?.saleId ||
    plan?.planId ||
    'N/A';

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div className="flex items-center space-x-3">
        <Link
          to="/installments"
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">
            Schedule Sheet — Bill / Invoice #:{" "}
            <strong className="text-indigo-600">
              {invoiceBillNumber}
            </strong>
          </h2>

          <p className="text-sm text-gray-600 font-medium">
            Plan #{plan?.planId} ({plan?.duration} Months) — Process
            payments and check real-time dynamic schedules.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
            <User className="w-6 h-6" />
          </div>

          <div className="truncate">
            <span className="text-[10px] uppercase font-bold text-gray-400">
              Buyer
            </span>

            <h4 className="font-bold text-gray-900 truncate">
              {plan?.customer?.fullName || 'N/A'}
            </h4>

            <p className="text-xs text-gray-500">
              {plan?.customer?.mobileNumber || ''}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>

          <div className="truncate">
            <span className="text-[10px] uppercase font-bold text-gray-400">
              Financed Item
            </span>

            <h4 className="font-bold text-gray-900 truncate">
              {plan?.product?.name || 'Deleted Product'}
            </h4>

            <p className="text-xs text-gray-500">
              {plan?.product?.brand || ''} / {plan?.product?.model || ''}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">
              Dues Outstanding
            </span>

            <h4 className="font-extrabold text-red-600 text-lg">
              {settings.currency}{' '}
              {(plan?.remainingBalance || 0).toLocaleString()}
            </h4>

            <p className="text-xs text-gray-500">
              Duration: {plan?.duration || 0} Months
            </p>
          </div>
        </div>

      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-extrabold text-sm text-gray-700 uppercase tracking-wider">
            Plan Installments List
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">

            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4">Installment #</th>
                <th className="px-6 py-4">Required Amount</th>
                <th className="px-6 py-4">Paid amount</th>
                <th className="px-6 py-4">Remaining balance</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Payment Date & Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {installments &&
                installments.map((inst) => (
                  <tr
                    key={inst._id}
                    className="hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-4 text-gray-900 font-bold">
                      Installment #{inst.installmentNumber}
                    </td>

                    <td className="px-6 py-4">
                      {settings.currency}{' '}
                      {inst.amount.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-green-600 font-bold">
                      {settings.currency}{' '}
                      {inst.paidAmount.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-gray-800 font-bold">
                      {settings.currency}{' '}
                      {inst.remainingAmount.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(inst.dueDate).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                      {inst.status === 'Paid' ? (
                        <span className="text-green-700 font-black tracking-wide">
                          {formatDateTime(inst.paidDate)}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">
                          Unpaid
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          inst.status === 'Paid'
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : inst.status === 'Overdue'
                            ? 'bg-red-50 border-red-200 text-red-700 font-bold animate-pulse'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        {inst.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">

                        {inst.status !== 'Paid' ? (
                          <>
                            <button
                              onClick={() =>
                                handleSendWhatsAppReminder(inst)
                              }
                              className="inline-flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs p-1.5 rounded-lg transition-colors"
                              title="Send WhatsApp Reminder"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() =>
                                handleOpenPayModal(inst)
                              }
                              className="inline-flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Settle</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-green-600 font-bold">
                            Closed
                          </span>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPayModal && selectedInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">

          <form
            onSubmit={handlePaySubmit}
            className="bg-white border rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-scale-in"
          >

            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <span className="font-extrabold text-sm uppercase text-slate-800 tracking-wider">
                Settle Month #{selectedInst.installmentNumber}
              </span>

              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">

              {payError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start space-x-2 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">
                    {payError}
                  </span>
                </div>
              )}

              <div className="bg-slate-50 p-4 border rounded-xl space-y-2 text-xs font-semibold text-slate-700">

                <div className="flex justify-between">
                  <span>Required Installment Amount:</span>
                  <span>
                    {settings.currency}{' '}
                    {selectedInst.amount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Remaining Months Unpaid:</span>
                  <span>
                    {
                      installments.filter(
                        inst =>
                          inst.status !== 'Paid' &&
                          inst._id !== selectedInst._id
                      ).length
                    }{' '}
                    Months
                  </span>
                </div>

              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500">
                  Manual Received Amount ({settings.currency})
                </label>

                <input
                  type="number"
                  value={receivedAmount}
                  onChange={(e) =>
                    setReceivedAmount(e.target.value)
                  }
                  max={selectedInst.remainingAmount}
                  min="1"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-extrabold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                  Payment Method
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    'Cash',
                    'Easypaisa',
                    'JazzCash',
                    'Bank Transfer',
                    'Other'
                  ].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() =>
                        setPaymentMethod(method)
                      }
                      className={`py-2 px-3 border text-[11px] font-bold rounded-lg transition-colors ${
                        paymentMethod === method
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow transition-colors disabled:bg-indigo-400"
              >
                {isSubmitting
                  ? 'Processing Payment...'
                  : 'Record Payment & Adjust Future Dues'}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
};

export default InstallmentPlanDetails;
