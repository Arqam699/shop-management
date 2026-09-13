import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import {
  ArrowLeft,
  Calculator,
  AlertCircle,
  Save,
  Loader2,
  Package,
  User,
  CreditCard,
  Banknote,
  Sparkles,
  Receipt,
  Tag,
  ShieldCheck,
  CalendarDays,
  CircleDollarSign,
  ArrowRight,
} from 'lucide-react';

const EditSale = () => {
  const { id } = useParams();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customerName: '',
    customerId: '',
    product: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    paymentType: 'Cash',
    downPayment: 0,
    installmentDuration: 3,
  });

  const [fetching, setFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // =====================================================
  // LOAD TRANSACTION DATA
  // =====================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        setFetching(true);
        const [prodRes, saleRes] = await Promise.all([
          api.get('/api/products'),
          api.get(`/api/sales/${id}`),
        ]);

        if (prodRes.data && prodRes.data.success) {
          setProducts(prodRes.data.data);
        }

        if (saleRes.data && saleRes.data.success) {
          const s = saleRes.data.data;
          setFormData({
            customerName: s.customer?.fullName || '',
            customerId: s.customer?.customerId || '',
            product: s.product?._id || '',
            quantity: s.quantity,
            unitPrice: s.unitPrice,
            discount: s.discount,
            paymentType: s.paymentType,
            downPayment: s.downPayment,
            installmentDuration: s.installmentDuration || 3,
          });
        }
      } catch (err) {
        setErrorMsg('Failed to load transaction details.');
      } finally {
        setFetching(false);
      }
    };
    loadData();
  }, [id]);

  // =====================================================
  // FORM HANDLERS
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (e) => {
    const prodId = e.target.value;
    const found = products.find((p) => p._id === prodId);
    setFormData((prev) => ({
      ...prev,
      product: prodId,
      unitPrice: found ? found.salePrice : 0,
      quantity: 1,
    }));
  };

  const activeProduct = products.find((p) => p._id === formData.product);
  const subtotal = Number(formData.quantity || 0) * Number(formData.unitPrice || 0);
  const finalTotal = Math.max(0, subtotal - Number(formData.discount || 0));
  const remaining =
    formData.paymentType === 'Installment'
      ? Math.max(0, finalTotal - Number(formData.downPayment || 0))
      : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSaving(true);

    if (Number(formData.discount) > subtotal) {
      setErrorMsg('Discount cannot be larger than subtotal.');
      setIsSaving(false);
      return;
    }

    try {
      await api.put(`/api/sales/${id}`, {
        product: formData.product,
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice),
        discount: Number(formData.discount),
        paymentType: formData.paymentType,
        downPayment:
          formData.paymentType === 'Installment'
            ? Number(formData.downPayment)
            : 0,
        installmentDuration:
          formData.paymentType === 'Installment'
            ? Number(formData.installmentDuration)
            : 0,
      });

      navigate('/sales');
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || 'Failed to update transaction.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // =====================================================
  // LOADING STATE
  // =====================================================
  if (fetching) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 animate-pulse opacity-25" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
            </div>
          </div>
          <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-slate-800">
            Loading Invoice Record
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Fetching deal parameters and product specifications...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER EDIT SALE
  // =====================================================
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO HEADER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5">
              <Link
                to="/sales"
                className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Back to Sales History"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">
                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                    Sale Adjustment
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[9px] font-bold text-slate-400">
                    Invoice Correction Mode
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                  Edit Sale Transaction
                </h1>
              </div>
            </div>

            <span className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-bold text-slate-300 self-start sm:self-auto">
              Customer: <strong className="text-blue-400">{formData.customerName || 'Customer'}</strong>
            </span>

          </div>
        </div>
      </section>

      {/* =====================================================
          ERROR ALERT MESSAGE
      ====================================================== */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-rose-800 animate-[pageEnter_0.3s_ease-out]">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-rose-600">Transaction Warning</p>
            <p className="text-xs font-bold mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* =====================================================
          EDIT FORM & LIVE CALCULATOR
      ====================================================== */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* LEFT COLUMN: SALE INPUTS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">

            {/* Customer Information Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/5 via-violet-500/5 to-transparent border border-blue-500/15 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 block">
                    Customer Tied To Invoice
                  </span>
                  <p className="text-sm font-black text-slate-900 mt-0.5">
                    {formData.customerName || 'Walk-in Customer'}
                  </p>
                </div>
              </div>

              {formData.customerId && (
                <span className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black">
                  ID: {formData.customerId}
                </span>
              )}
            </div>

            {/* Select Stock Item */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Stock Item Product <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.product}
                  onChange={handleProductChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                  required
                >
                  <option value="">Select Inventory Product...</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.brand} {p.model}) — [Stock: {p.quantity} Available]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Unit Price & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Unit Price ({settings?.currency || 'PKR'}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="unitPrice"
                  value={formData.unitPrice}
                  onChange={handleChange}
                  min="0"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                  min="1"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Payment Terms <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      paymentType: 'Cash',
                    }))
                  }
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition-all ${
                    formData.paymentType === 'Cash'
                      ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-800 shadow-sm scale-[1.01]'
                      : 'border border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Cash Sale</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      paymentType: 'Installment',
                    }))
                  }
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition-all ${
                    formData.paymentType === 'Installment'
                      ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-800 shadow-sm scale-[1.01]'
                      : 'border border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Installments Deal</span>
                </button>
              </div>
            </div>

            {/* Installment Parameters (Conditional) */}
            {formData.paymentType === 'Installment' && (
              <div className="bg-indigo-50/50 border border-indigo-200/80 p-5 rounded-2xl space-y-4 animate-[pageEnter_0.25s_ease-out]">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900">
                    Financing Parameters
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-800 mb-1.5">
                      Down Payment ({settings?.currency || 'PKR'})
                    </label>
                    <input
                      type="number"
                      name="downPayment"
                      value={formData.downPayment}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      className="w-full h-11 border border-indigo-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-white text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-800 mb-1.5">
                      Plan Duration (Months)
                    </label>
                    <select
                      name="installmentDuration"
                      value={formData.installmentDuration}
                      onChange={handleChange}
                      className="w-full h-11 border border-indigo-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-white text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                      required
                    >
                      <option value="3">3 Months Plan</option>
                      <option value="6">6 Months Plan</option>
                      <option value="12">12 Months Plan</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: STICKY SUMMARY & CALCULATOR */}
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] rounded-3xl p-6 text-white shadow-2xl shadow-blue-950/30 space-y-6 sticky top-24">
            
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-400" />
                <h3 className="font-black text-xs uppercase tracking-[0.16em] text-white">
                  Invoice Deal Ledger
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-blue-300">
                Live Calc
              </span>
            </div>

            <div className="space-y-3.5 text-xs font-semibold text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Subtotal ({formData.quantity} × Price)</span>
                <span className="font-bold text-white text-sm">
                  {settings?.currency || 'PKR'} {subtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Discount ({settings?.currency || 'PKR'})</span>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-28 h-9 bg-white/[0.06] border border-white/[0.1] rounded-xl px-2.5 text-right text-xs font-black text-rose-400 outline-none focus:border-blue-500 focus:bg-white/[0.1] transition-all"
                  min="0"
                />
              </div>

              <div className="border-t border-white/[0.08] pt-4 flex justify-between items-center">
                <span className="text-sm font-black text-white">Net Total Payable</span>
                <span className="text-lg font-black bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                  {settings?.currency || 'PKR'} {finalTotal.toLocaleString()}
                </span>
              </div>

              {formData.paymentType === 'Installment' && (
                <div className="space-y-2 border-t border-white/[0.08] pt-3.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Down Payment</span>
                    <span className="text-emerald-400 font-bold">
                      - {settings?.currency || 'PKR'} {Number(formData.downPayment || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-white pt-1">
                    <span>Financed Balance</span>
                    <span className="text-indigo-400 font-black">
                      {settings?.currency || 'PKR'} {remaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Corrections...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update & Save Invoice</span>
                </>
              )}
            </button>

          </div>
        </div>
      </form>

    </div>
  );
};

export default EditSale;