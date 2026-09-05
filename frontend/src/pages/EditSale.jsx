
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { ArrowLeft, Calculator, AlertCircle, Save, Loader2 } from 'lucide-react';

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
    installmentDuration: 3
  });

  const [fetching, setFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setFetching(true);
        const [prodRes, saleRes] = await Promise.all([
          api.get('/api/products'),
          api.get(`/api/sales/${id}`)
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
            installmentDuration: s.installmentDuration || 3
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (e) => {
    const prodId = e.target.value;
    const found = products.find(p => p._id === prodId);
    setFormData(prev => ({
      ...prev,
      product: prodId,
      unitPrice: found ? found.salePrice : 0,
      quantity: 1
    }));
  };

  const activeProduct = products.find(p => p._id === formData.product);
  const subtotal = formData.quantity * formData.unitPrice;
  const finalTotal = subtotal - formData.discount;
  const remaining =
    formData.paymentType === 'Installment'
      ? (finalTotal - formData.downPayment)
      : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSaving(true);

    if (formData.discount > subtotal) {
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
            : 0
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

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-500 text-sm">
          Querying invoice records...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          to="/sales"
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Correct Invoice Deal (Edit Sale)
          </h2>
          <p className="text-sm text-gray-600">
            Modify items or recalculate discount structures for customer:{' '}
            <strong>{formData.customerName}</strong>
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start space-x-3 text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-xs uppercase font-bold text-gray-400">
                Customer Tied To Invoice
              </span>
              <p className="text-lg font-extrabold text-gray-800 mt-1">
                {formData.customerName}
              </p>
              <span className="text-xs text-indigo-600 font-bold tracking-wider">
                {formData.customerId}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Stock Item
              </label>
              <select
                value={formData.product}
                onChange={handleProductChange}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-800"
                required
              >
                {products.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.brand} {p.model}) - Max Available Stock:{' '}
                    {p.quantity}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500">
                  Unit Price ({settings.currency})
                </label>
                <input
                  type="number"
                  name="unitPrice"
                  value={formData.unitPrice}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500">
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-800"
                  required
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Payment Term
              </label>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      paymentType: 'Cash'
                    }))
                  }
                  className={`py-3 px-4 border rounded-xl text-sm font-bold transition-colors ${
                    formData.paymentType === 'Cash'
                      ? 'border-green-600 bg-green-50 text-green-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Cash Deal
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      paymentType: 'Installment'
                    }))
                  }
                  className={`py-3 px-4 border rounded-xl text-sm font-bold transition-colors ${
                    formData.paymentType === 'Installment'
                      ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Installments Deal
                </button>
              </div>
            </div>

            {formData.paymentType === 'Installment' && (
              <div className="bg-purple-50/50 border border-purple-200 p-4 rounded-xl space-y-4">
                <h4 className="text-sm font-extrabold text-purple-800">
                  Installment Parameters
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-purple-700">
                      Down Payment ({settings.currency})
                    </label>
                    <input
                      type="number"
                      name="downPayment"
                      value={formData.downPayment}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-purple-700">
                      Plan Duration (Months)
                    </label>
                    <select
                      name="installmentDuration"
                      value={formData.installmentDuration}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold bg-white"
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

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-md space-y-6 sticky top-24">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-3 flex items-center space-x-2">
              <Calculator className="w-4 h-4" />
              <span>Corrected Deal Ledger</span>
            </h3>

            <div className="space-y-3 font-medium text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  {settings.currency} {subtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>Discount</span>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right text-sm font-bold text-red-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  min="0"
                />
              </div>

              <div className="border-t border-slate-800 my-4 pt-4 flex justify-between text-base font-extrabold text-white">
                <span>Net Payable</span>
                <span className="text-indigo-400">
                  {settings.currency} {finalTotal.toLocaleString()}
                </span>
              </div>

              {formData.paymentType === 'Installment' && (
                <div className="space-y-2 border-t border-slate-800/50 pt-4 text-xs font-semibold text-slate-400">
                  <div className="flex justify-between text-sm font-extrabold text-white pt-1">
                    <span>Financed Balance</span>
                    <span className="text-purple-400">
                      {settings.currency} {remaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow transition-colors text-sm"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span>Save Corrections</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditSale;
