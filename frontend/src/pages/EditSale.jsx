import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
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
  Plus,
  Trash2,
} from 'lucide-react';

const EditSale = () => {
  const { id } = useParams();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cashItems, setCashItems] = useState([]);
  const [installmentPlan, setInstallmentPlan] = useState(null);
  const [hasInstallmentPaymentHistory, setHasInstallmentPaymentHistory] = useState(false);
  const [planDiscountInput, setPlanDiscountInput] = useState('');
  const [originalSaleDateTime, setOriginalSaleDateTime] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    customerId: '',
    customerRef: '',
    saleDate: '',
    product: '',
    quantity: 1,
    unitPrice: 0,
    purchasePriceAtSale: 0,
    discount: 0,
    paymentType: 'Cash',
    downPayment: 0,
    installmentDuration: 3,
    markupPercentage: 0,
    treatDownPaymentAsFirstInstallment: false,
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
        const [prodRes, customerRes, saleRes] = await Promise.all([
          api.get('/api/products'),
          api.get('/customers'),
          api.get(`/api/sales/${id}`),
        ]);

        if (prodRes.data && prodRes.data.success) {
          setProducts(prodRes.data.data);
        }
        const customerData = customerRes?.data?.customers || customerRes?.data?.data?.customers || customerRes?.data?.results || customerRes?.data?.data || customerRes?.data || [];
        setCustomers(Array.isArray(customerData) ? customerData : []);

        if (saleRes.data && saleRes.data.success) {
          const saleResponse = saleRes.data.data;
          const s = saleResponse.sale || saleResponse;
          setOriginalSaleDateTime(s.saleDate || s.createdAt || '');
          if (s.paymentType === 'Installment' && saleResponse.plan?._id) {
            let planData = {};
            try {
              const planResponse = await api.get(`/api/installments/${saleResponse.plan._id}`);
              planData = planResponse.data?.data || {};
            } catch {
              // Keep the sale edit usable with the plan snapshot from its invoice response.
            }
            const currentPlan = planData.plan || saleResponse.plan;
            setInstallmentPlan(currentPlan);
            setHasInstallmentPaymentHistory(
              (Array.isArray(planData.payments) && planData.payments.length > 0) ||
              (Array.isArray(saleResponse.installments) && saleResponse.installments.some((item) => Number(item.paidAmount || 0) > 0)) ||
              Number(currentPlan.downPayment || 0) > 0 ||
              Number(currentPlan.totalPaid || 0) > 0
            );
          }
          const initialCashItems = Array.isArray(s.items) && s.items.length > 0
            ? s.items
            : [{
                product: s.product,
                quantity: s.quantity,
                unitPrice: s.unitPrice,
                discount: s.discount,
                purchasePriceAtSale: s.purchasePriceAtSale,
              }];
          setCashItems(initialCashItems.map((item) => ({
            product: item.product?._id || item.product || '',
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            discount: Number(item.discount || 0),
            purchasePriceAtSale: Number(item.purchasePriceAtSale ?? item.product?.purchasePrice ?? 0),
          })));
          setFormData({
            customerName: s.customer?.fullName || '',
            customerId: s.customer?.customerId || '',
            customerRef: s.customer?._id || '',
            saleDate: s.saleDate
              ? new Date(new Date(s.saleDate).getTime() - new Date(s.saleDate).getTimezoneOffset() * 60000).toISOString().slice(0, 10)
              : '',
            product: s.product?._id || '',
            quantity: s.quantity,
            unitPrice: s.unitPrice,
            purchasePriceAtSale: Number(s.purchasePriceAtSale ?? s.product?.purchasePrice ?? 0),
            discount: s.discount,
            paymentType: s.paymentType,
            downPayment: s.downPayment,
            installmentDuration: s.selectedInstallmentDuration || s.installmentDuration || 3,
            markupPercentage: Number(s.markupPercentage || 0),
            treatDownPaymentAsFirstInstallment: Boolean(s.treatDownPaymentAsFirstInstallment),
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

  const handleCustomerChange = (e) => {
    const customerRef = e.target.value;
    const selected = customers.find((customer) => String(customer._id) === customerRef);
    setFormData((prev) => ({
      ...prev,
      customerRef,
      customerName: selected?.fullName || '',
      customerId: selected?.customerId || '',
    }));
  };

  const handleProductChange = (e) => {
    const prodId = e.target.value;
    const found = products.find((p) => p._id === prodId);
    setFormData((prev) => ({
      ...prev,
      product: prodId,
      unitPrice: found ? found.salePrice : 0,
      purchasePriceAtSale: found ? found.purchasePrice : 0,
      quantity: 1,
    }));
  };

  const getEditedSaleDateTime = () => {
    if (!formData.saleDate) return null;
    const originalDate = originalSaleDateTime ? new Date(originalSaleDateTime) : null;
    const timePart = originalDate && !Number.isNaN(originalDate.getTime())
      ? `${String(originalDate.getHours()).padStart(2, '0')}:${String(originalDate.getMinutes()).padStart(2, '0')}:${String(originalDate.getSeconds()).padStart(2, '0')}`
      : '12:00:00';
    const editedDate = new Date(`${formData.saleDate}T${timePart}`);
    return Number.isNaN(editedDate.getTime()) ? null : editedDate.toISOString();
  };

  const updateCashItem = (index, field, value) => {
    setCashItems((currentItems) => currentItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  };

  const selectCashItemProduct = (index, productId) => {
    const selectedProduct = products.find((product) => product._id === productId);
    setCashItems((currentItems) => currentItems.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            product: productId,
            unitPrice: selectedProduct?.salePrice || 0,
            purchasePriceAtSale: selectedProduct?.purchasePrice || 0,
          }
        : item
    ));
  };

  const cashSubtotal = cashItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );
  const cashDiscount = cashItems.reduce(
    (sum, item) => sum + Number(item.discount || 0),
    0
  );
  const cashFinalTotal = Math.max(0, cashSubtotal - cashDiscount);
  const subtotal = cashSubtotal;
  const finalTotal = cashFinalTotal;
  const installmentMarkupBase = formData.treatDownPaymentAsFirstInstallment
    ? Math.max(0, finalTotal - Number(formData.downPayment || 0))
    : finalTotal;
  const installmentMarkup = installmentMarkupBase * Number(formData.markupPercentage || 0) / 100;
  const installmentFinancedBalance = formData.treatDownPaymentAsFirstInstallment
    ? installmentMarkupBase + installmentMarkup
    : Math.max(0, finalTotal + installmentMarkup - Number(formData.downPayment || 0));
  const installmentTotalPayable = Number(formData.downPayment || 0) + installmentFinancedBalance;
  const remaining =
    formData.paymentType === 'Installment'
      ? installmentFinancedBalance
      : 0;
  const existingPlanDiscount = Number(installmentPlan?.balanceDiscount || 0);
  const amountReceivedBeforeRevision = Math.max(
    0,
    Number(installmentPlan?.totalAmount || 0) -
      existingPlanDiscount -
      Number(installmentPlan?.remainingBalance || 0)
  );
  const revisedDealTotalAfterDiscount = Math.max(
    0,
    installmentTotalPayable - existingPlanDiscount - Number(planDiscountInput || 0)
  );
  const revisedBalanceAfterEdit = revisedDealTotalAfterDiscount - amountReceivedBeforeRevision;
  const maximumPlanDiscount = Math.max(
    0,
    installmentTotalPayable - existingPlanDiscount - amountReceivedBeforeRevision
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSaving(true);

    if (!hasInstallmentPaymentHistory && cashItems.length === 0) {
      setErrorMsg('Add at least one product to this sale.');
      setIsSaving(false);
      return;
    }

    if (!hasInstallmentPaymentHistory && cashItems.some((item) =>
      !item.product ||
      !Number.isInteger(Number(item.quantity)) ||
      Number(item.quantity) < 1 ||
      !Number.isFinite(Number(item.unitPrice)) ||
      Number(item.unitPrice) < 0 ||
      !Number.isFinite(Number(item.purchasePriceAtSale)) ||
      Number(item.purchasePriceAtSale) < 0 ||
      Number(item.discount) < 0 ||
      Number(item.discount) > Number(item.quantity) * Number(item.unitPrice)
    )) {
      setErrorMsg('Check each product, quantity, price, and discount before saving.');
      setIsSaving(false);
      return;
    }

    try {
      if (hasInstallmentPaymentHistory && formData.paymentType === 'Installment' && installmentPlan?._id) {
        const duration = Number(formData.installmentDuration);
        const markupPercentage = Number(formData.markupPercentage || 0);
        const discountAmount = Number(planDiscountInput || 0);
        if (!Number.isInteger(duration) || duration < 1 || duration > 36) {
          throw new Error('Plan duration must be a whole number from 1 to 36 months.');
        }
        if (!Number.isFinite(markupPercentage) || markupPercentage < 0) {
          throw new Error('Enter a valid markup percentage of zero or more.');
        }
        if (!Number.isFinite(discountAmount) || discountAmount < 0) {
          throw new Error('Enter a valid plan discount amount.');
        }
        const saleDate = getEditedSaleDateTime();
        if (!saleDate) {
          throw new Error('Enter a valid sale date.');
        }
        if (discountAmount > maximumPlanDiscount + 0.005) {
          throw new Error('The plan discount cannot exceed the amount still due after recalculating the revised deal.');
        }
        if (revisedBalanceAfterEdit < -0.005) {
          throw new Error('The revised deal amount cannot be less than the payments already received.');
        }

        const response = await api.put(`/api/installments/${installmentPlan._id}/revise`, {
          duration,
          markupPercentage,
          discountAmount,
          saleDate,
        });
        toast.success(response.data?.message || 'Installment plan updated; payment history preserved.');
        navigate(`/invoices/${id}`);
        return;
      }

      const payload = formData.paymentType === 'Cash'
        ? {
            paymentType: 'Cash',
            customer: formData.customerRef || null,
            saleDate: formData.saleDate ? new Date(`${formData.saleDate}T12:00:00`).toISOString() : null,
            items: cashItems.map((item) => ({
              product: item.product,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              purchasePriceAtSale: Number(item.purchasePriceAtSale),
              discount: Number(item.discount || 0),
            })),
          }
        : {
        product: cashItems[0].product,
        quantity: Number(cashItems[0].quantity),
        unitPrice: Number(cashItems[0].unitPrice),
        purchasePriceAtSale: Number(cashItems[0].purchasePriceAtSale),
        discount: cashDiscount,
        items: cashItems.map((item) => ({
          product: item.product,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          purchasePriceAtSale: Number(item.purchasePriceAtSale),
          discount: Number(item.discount || 0),
        })),
        paymentType: formData.paymentType,
        customer: formData.customerRef || null,
        saleDate: formData.saleDate ? new Date(`${formData.saleDate}T12:00:00`).toISOString() : null,
        downPayment:
          formData.paymentType === 'Installment'
            ? Number(formData.downPayment)
            : 0,
        installmentDuration:
          formData.paymentType === 'Installment'
            ? Number(formData.installmentDuration)
            : 0,
        markupPercentage:
          formData.paymentType === 'Installment'
            ? Number(formData.markupPercentage || 0)
            : 0,
        treatDownPaymentAsFirstInstallment:
          formData.paymentType === 'Installment' && formData.treatDownPaymentAsFirstInstallment,
          };

      await api.put(`/api/sales/${id}`, payload);

      toast.success('Sale updated successfully.');

      navigate('/sales');
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to update transaction.';
      setErrorMsg(message);
      toast.error(message);
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
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {/* LEFT COLUMN: SALE INPUTS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">

            {/* Customer Information Box */}
            {formData.paymentType === 'Cash' ? (
              <div className="grid gap-4 rounded-2xl border border-blue-500/15 bg-blue-500/5 p-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="saleDate" className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">Sale date</label>
                  <input id="saleDate" name="saleDate" type="date" required value={formData.saleDate} onChange={handleChange} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">Customer (Optional)</label>
                  <div className="flex gap-2">
                    <select value={formData.customerRef} onChange={handleCustomerChange} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500">
                      <option value="">No customer / Walk-in</option>
                      {customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.customerId || 'No ID'} — {customer.fullName || 'Unnamed'}{customer.mobileNumber ? ` — ${customer.mobileNumber}` : ''}</option>)}
                    </select>
                    {formData.customerRef && <button type="button" onClick={() => handleCustomerChange({ target: { value: '' } })} className="rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50">Remove</button>}
                  </div>
                </div>
              </div>
            ) : (
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
            )}

            {hasInstallmentPaymentHistory && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-black text-amber-900">Payments already received</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-800">
                  This edit updates the existing installment plan only. Products, down payment, invoice number, and past receipts stay unchanged.
                </p>
                <div className="mt-3 divide-y divide-amber-200/70">
                  {cashItems.map((item, index) => {
                    const product = products.find((entry) => String(entry._id) === String(item.product));
                    return (
                      <div key={`${item.product}-${index}`} className="flex flex-wrap justify-between gap-2 py-2 text-xs">
                        <span className="font-black text-slate-800">{product?.name || 'Product'} {product?.model ? `(${product.model})` : ''}</span>
                        <span className="font-bold text-slate-600">Qty {item.quantity} · {settings?.currency || 'PKR'} {Number(item.unitPrice || 0).toLocaleString()} each</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(formData.paymentType === 'Cash' || formData.paymentType === 'Installment') && !hasInstallmentPaymentHistory && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Products in this {formData.paymentType.toLowerCase()} sale</label>
                    <p className="mt-1 text-[11px] font-medium text-slate-400">Remove products or add another product to the invoice.</p>
                  </div>
                  <button type="button" onClick={() => setCashItems((current) => [...current, { product: '', quantity: 1, unitPrice: 0, purchasePriceAtSale: 0, discount: 0 }])} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700">
                    <Plus className="h-4 w-4" /> Add Product
                  </button>
                </div>
                {cashItems.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs font-semibold text-slate-500">No products added. Use “Add Product” to start this invoice.</div>}
                {cashItems.map((item, index) => (
                  <div key={`${item.product || 'new'}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Product {index + 1}</span>
                      <button type="button" onClick={() => setCashItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50" aria-label={`Remove product ${index + 1}`}>
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                    <select value={item.product} onChange={(event) => selectCashItemProduct(index, event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 outline-none focus:border-blue-500">
                      <option value="">Select Inventory Product...</option>
                      {products.map((product) => <option key={product._id} value={product._id}>{product.name} ({product.brand} {product.model}) — [Stock: {product.quantity}]</option>)}
                    </select>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Quantity<input type="number" min="1" required value={item.quantity} onChange={(event) => updateCashItem(index, 'quantity', event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500" /></label>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Unit Cost<input type="number" min="0" required value={item.purchasePriceAtSale} onChange={(event) => updateCashItem(index, 'purchasePriceAtSale', event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500" /></label>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Unit Selling Price<input type="number" min="0" required value={item.unitPrice} onChange={(event) => updateCashItem(index, 'unitPrice', event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500" /></label>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Product Discount<input type="number" min="0" value={item.discount} onChange={(event) => updateCashItem(index, 'discount', event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-rose-600 outline-none focus:border-blue-500" /></label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Method Selector */}
            {hasInstallmentPaymentHistory ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-black text-indigo-900">
                Existing installment sale · {installmentPlan?.planId || 'Plan'}
              </div>
            ) : (
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
            )}

            {/* Installment Parameters (Conditional) */}
            {formData.paymentType === 'Installment' && (
              <div className="space-y-4 animate-[pageEnter_0.25s_ease-out]">
                <div className="rounded-2xl border border-blue-500/15 bg-blue-500/5 p-4">
                  {hasInstallmentPaymentHistory ? (
                    <>
                      <label htmlFor="saleDate" className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">Sale date (editable)</label>
                      <input id="saleDate" name="saleDate" type="date" required value={formData.saleDate} onChange={handleChange} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 sm:max-w-xs" />
                      <p className="mt-1.5 text-[10px] font-semibold text-slate-500">Invoice date will update. Existing payment history and installment due dates will stay unchanged.</p>
                    </>
                  ) : (
                    <>
                      <label htmlFor="saleDate" className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">Sale date</label>
                      <input id="saleDate" name="saleDate" type="date" required value={formData.saleDate} onChange={handleChange} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 sm:max-w-xs" />
                    </>
                  )}
                </div>
                <div className="bg-indigo-50/50 border border-indigo-200/80 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900">
                    Financing Parameters
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                      disabled={hasInstallmentPaymentHistory}
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
                      {!['3', '6', '12', '18', '24', '36'].includes(String(formData.installmentDuration)) && (
                        <option value={formData.installmentDuration}>{formData.installmentDuration} Months Plan</option>
                      )}
                      <option value="3">3 Months Plan</option>
                      <option value="6">6 Months Plan</option>
                      <option value="12">12 Months Plan</option>
                      <option value="18">18 Months Plan</option>
                      <option value="24">24 Months Plan</option>
                      <option value="36">36 Months Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-800 mb-1.5">Markup (%)</label>
                    <input type="number" name="markupPercentage" value={formData.markupPercentage} onChange={handleChange} min="0" step="0.01" className="w-full h-11 border border-indigo-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-white text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                  </div>
                  {hasInstallmentPaymentHistory && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-800 mb-1.5">Plan Discount ({settings?.currency || 'PKR'})</label>
                      <input type="number" value={planDiscountInput} onChange={(event) => setPlanDiscountInput(event.target.value)} min="0" max={maximumPlanDiscount} step="0.01" placeholder="0" className="w-full h-11 border border-emerald-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-white text-emerald-900 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                      <span className="mt-1 block text-[10px] font-semibold text-emerald-700">Deducted from the revised total; not printed as a discount line.</span>
                    </div>
                  )}
                </div>
                <label className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-white/70 p-3 text-xs font-bold text-indigo-900">
                  <input type="checkbox" name="treatDownPaymentAsFirstInstallment" checked={formData.treatDownPaymentAsFirstInstallment} disabled={hasInstallmentPaymentHistory} onChange={(event) => setFormData((current) => ({ ...current, treatDownPaymentAsFirstInstallment: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-indigo-600" />
                  <span>Count the down payment as installment #1</span>
                </label>
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
                <span className="text-slate-400">Products subtotal</span>
                <span className="font-bold text-white text-sm">
                  {settings?.currency || 'PKR'} {subtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Discount ({settings?.currency || 'PKR'})</span>
                <input
                  type="number"
                  name="discount"
                  value={cashDiscount}
                  readOnly
                  placeholder="0"
                  className="w-28 h-9 bg-white/[0.06] border border-white/[0.1] rounded-xl px-2.5 text-right text-xs font-black text-rose-400 outline-none focus:border-blue-500 focus:bg-white/[0.1] transition-all"
                  min="0"
                />
              </div>

              <div className="border-t border-white/[0.08] pt-4 flex justify-between items-center">
                <span className="text-sm font-black text-white">Net Total Payable</span>
                <span className="text-lg font-black bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                  {settings?.currency || 'PKR'} {(hasInstallmentPaymentHistory ? revisedDealTotalAfterDiscount : formData.paymentType === 'Installment' ? installmentTotalPayable : finalTotal).toLocaleString()}
                </span>
              </div>

              {formData.paymentType === 'Installment' && (
                <div className="space-y-2 border-t border-white/[0.08] pt-3.5 text-xs text-slate-400">
                  {hasInstallmentPaymentHistory && existingPlanDiscount > 0 && (
                    <div className="flex justify-between">
                      <span>Previously applied plan discount</span>
                      <span className="font-bold text-emerald-400">- {settings?.currency || 'PKR'} {existingPlanDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {hasInstallmentPaymentHistory && Number(planDiscountInput || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>New plan discount</span>
                      <span className="font-bold text-emerald-400">- {settings?.currency || 'PKR'} {Number(planDiscountInput || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Down Payment {formData.treatDownPaymentAsFirstInstallment ? '(Installment #1)' : ''}</span>
                    <span className="text-emerald-400 font-bold">
                      - {settings?.currency || 'PKR'} {Number(formData.downPayment || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-white pt-1">
                    <span>{hasInstallmentPaymentHistory ? 'Remaining After Revision' : 'Financed Balance'}</span>
                    <span className="text-indigo-400 font-black">
                      {settings?.currency || 'PKR'} {(hasInstallmentPaymentHistory ? Math.max(0, revisedBalanceAfterEdit) : remaining).toLocaleString()}
                    </span>
                  </div>
                  {hasInstallmentPaymentHistory && (
                    <>
                      <div className="flex justify-between">
                        <span>Already received</span>
                        <span className="font-bold text-amber-300">{settings?.currency || 'PKR'} {amountReceivedBeforeRevision.toLocaleString()}</span>
                      </div>
                      {revisedBalanceAfterEdit < -0.005 && (
                        <p className="rounded-lg bg-rose-500/10 px-3 py-2 font-bold text-rose-300">
                          Revised deal is {settings?.currency || 'PKR'} {Math.abs(revisedBalanceAfterEdit).toLocaleString()} below the amount already received.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="fixed bottom-4 right-4 z-50 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-black text-xs shadow-lg shadow-blue-950/40 transition-shadow duration-200 hover:shadow-xl active:scale-95 disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Corrections...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{hasInstallmentPaymentHistory ? 'Update Plan & Invoice' : 'Update & Save Invoice'}</span>
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
