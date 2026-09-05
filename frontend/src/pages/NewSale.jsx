import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { ArrowLeft, ShoppingCart, User, Cpu, Calculator, AlertCircle, CheckCircle2, Hash } from 'lucide-react';

const NewSale = () => {
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form selections states
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState(''); // NEW: Custom Invoice Number!
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState('Cash');
  const [downPayment, setDownPayment] = useState(0);
  const [installmentDuration, setInstallmentDuration] = useState(3);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loadWizardOptions = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products')
        ]);
        if (custRes.data && custRes.data.success) setCustomers(custRes.data.data);
        if (prodRes.data && prodRes.data.success) {
          const stockAvailable = prodRes.data.data.filter(p => p.quantity > 0);
          setProducts(stockAvailable);
        }
      } catch (err) {
        setErrorMsg('Failed to fetch product or customer list from servers.');
      } finally {
        setLoadingOptions(false);
      }
    };
    loadWizardOptions();
  }, []);

  const handleProductChange = (e) => {
    const prodId = e.target.value;
    setSelectedProduct(prodId);
    const found = products.find(p => p._id === prodId);
    if (found) {
      setUnitPrice(found.salePrice);
      setQuantity(1);
    } else {
      setUnitPrice(0);
    }
  };

  const activeProductDoc = products.find(p => p._id === selectedProduct);
  const subtotal = quantity * unitPrice;
  const finalTotal = subtotal - discount;
  const remainingBalance = paymentType === 'Installment' ? (finalTotal - downPayment) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    if (!selectedCustomer) {
      setErrorMsg('Please select a customer for this checkout invoice.');
      setIsSubmitting(false);
      return;
    }
    if (!selectedProduct) {
      setErrorMsg('Please choose an item to finalize checkout.');
      setIsSubmitting(false);
      return;
    }
    if (quantity > activeProductDoc?.quantity) {
      setErrorMsg(`Insufficient stock. Only ${activeProductDoc.quantity} items are available.`);
      setIsSubmitting(false);
      return;
    }
    if (discount > subtotal) {
      setErrorMsg('Discount amount cannot be larger than subtotal.');
      setIsSubmitting(false);
      return;
    }
    if (paymentType === 'Installment' && downPayment > finalTotal) {
      setErrorMsg('Down payment cannot exceed final purchase total.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        manualInvoiceNumber: manualInvoiceNumber ? manualInvoiceNumber.trim() : undefined,
        customer: selectedCustomer,
        product: selectedProduct,
        quantity,
        unitPrice,
        discount,
        paymentType,
        downPayment: paymentType === 'Installment' ? downPayment : 0,
        installmentDuration: paymentType === 'Installment' ? installmentDuration : 0
      };

      const res = await api.post('/sales', payload);
      if (res.data && res.data.success) {
        navigate('/sales');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Transaction could not be compiled on database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-500 text-sm font-semibold">Opening dynamic Checkout terminal...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link to="/sales" className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Checkout Terminal (New Sale)</h2>
          <p className="text-sm text-gray-600">Finalize cash sales or configure installment structures with custom Bill Number.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start space-x-3 text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Selectors inputs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            
            {/* NEW: Custom / Manual Invoice Number input */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold uppercase text-slate-700 flex items-center space-x-1.5">
                <Hash className="w-4 h-4 text-indigo-600" />
                <span>Custom / Manual Invoice Number (Bill No)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 101, BILL-500, INV-2026 (Leave empty for auto-generated)"
                value={manualInvoiceNumber}
                onChange={(e) => setManualInvoiceNumber(e.target.value)}
                className="mt-1.5 block w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-extrabold uppercase tracking-wider text-indigo-700"
              />
              <p className="text-[10px] text-gray-400 mt-1 font-medium">* Note: You can enter your paper receipt book number here, or leave empty to let system auto-generate unique ID.</p>
            </div>

            {/* Customer select */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>Select Registered Customer</span>
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-gray-800"
                required
              >
                <option value="">-- Choose Customer --</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>({c.customerId}) {c.fullName} - Mob: {c.mobileNumber}</option>
                ))}
              </select>
            </div>

            {/* Product select */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 flex items-center space-x-1">
                <Cpu className="w-3.5 h-3.5 text-gray-400" />
                <span>Choose Stock Item</span>
              </label>
              <select
                value={selectedProduct}
                onChange={handleProductChange}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-gray-800"
                required
              >
                <option value="">-- Select Product --</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.brand} {p.model}) - Stock Qty: {p.quantity}</option>
                ))}
              </select>
            </div>

            {/* Price override & Qty fields */}
            {selectedProduct && (
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 border border-gray-200 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-gray-500">Unit Price ({settings.currency})</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-800"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500">Quantity (Max: {activeProductDoc?.quantity})</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-800"
                    required
                    min="1"
                    max={activeProductDoc?.quantity}
                  />
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">Payment Term</label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('Cash')}
                  className={`py-3 px-4 border rounded-xl text-sm font-bold transition-colors ${
                    paymentType === 'Cash'
                      ? 'border-green-600 bg-green-50 text-green-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Cash (Immediate Settlement)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('Installment')}
                  className={`py-3 px-4 border rounded-xl text-sm font-bold transition-colors ${
                    paymentType === 'Installment'
                      ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Installments Deal
                </button>
              </div>
            </div>

            {/* Render dynamic installments conditions */}
            {paymentType === 'Installment' && (
              <div className="bg-purple-50/50 border border-purple-200 p-4 rounded-xl space-y-4">
                <h4 className="text-sm font-extrabold text-purple-800">Installment Parameters Configurations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-purple-700">Down Payment ({settings.currency})</label>
                    <input
                      type="number"
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="mt-1 block w-full border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white font-bold"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-purple-700">Plan Duration (Months)</label>
                    <select
                      value={installmentDuration}
                      onChange={(e) => setInstallmentDuration(Number(e.target.value))}
                      className="mt-1 block w-full border border-purple-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white font-bold"
                      required
                    >
                      <option value="3">3 Months Plan (15% Markup)</option>
                      <option value="6">6 Months Plan (25% Markup)</option>
                      <option value="12">12 Months Plan (50% Markup)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Pricing calculations summary ledger */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-md space-y-6 sticky top-24">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-3 flex items-center space-x-2">
              <Calculator className="w-4 h-4" />
              <span>Checkout Ledger</span>
            </h3>

            <div className="space-y-3 font-medium text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal ({quantity} units)</span>
                <span>{settings.currency} {subtotal.toLocaleString()}</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span>Custom Discount</span>
                  <div className="w-28 relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">-</span>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 pl-5 text-right text-sm font-bold text-red-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 my-4 pt-4 flex justify-between text-base font-extrabold text-white">
                <span>Net Payable</span>
                <span className="text-indigo-400">{settings.currency} {finalTotal.toLocaleString()}</span>
              </div>

              {paymentType === 'Installment' && (
                <div className="space-y-2 border-t border-slate-800/50 pt-4 text-xs font-semibold text-slate-400">
                  <div className="flex justify-between">
                    <span>Down Payment Deducted</span>
                    <span className="text-green-400">-{settings.currency} {downPayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-white pt-1">
                    <span>Financed Balance</span>
                    <span className="text-purple-400">{settings.currency} {remainingBalance.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedCustomer || !selectedProduct}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow transition-colors text-sm"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{isSubmitting ? 'Finalizing checkout...' : 'Finalize Checkout Transaction'}</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default NewSale;