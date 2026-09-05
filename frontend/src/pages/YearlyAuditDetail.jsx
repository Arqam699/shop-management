
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { ALLOW_GLOBAL_DELETION } from '../utils/config'; // Security Lock
import { ArrowLeft, Trash2, ClipboardList, ShoppingCart, Plus, Lock } from 'lucide-react';

const YearlyAuditDetail = () => {
  const { id } = useParams();
  const { settings } = useSettings();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  const [purchaseForm, setPurchaseForm] = useState({ name: '', brand: '', quantity: 1, purchasePrice: '' });
  const [saleForm, setSaleForm] = useState({ 
    name: '', 
    brand: '', 
    paymentType: 'Cash', 
    purchasePrice: '', 
    salePrice: '', 
    receivedAmount: '', 
    planDuration: 3, 
    downPayment: 0 
  });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/audits/${id}`);
      if (res.data && res.data.success) {
        setAudit(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/api/audits/${id}/purchase`, purchaseForm);
      if (res.data && res.data.success) {
        setAudit(res.data.data);
        setPurchaseForm({ name: '', brand: '', quantity: 1, purchasePrice: '' });
      }
    } catch (err) {
      alert('Failed to log purchase item.');
    }
  };

  const handleAddSale = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/api/audits/${id}/sale`, saleForm);
      if (res.data && res.data.success) {
        setAudit(res.data.data);
        setSaleForm({ 
          name: '', 
          brand: '', 
          paymentType: 'Cash', 
          purchasePrice: '', 
          salePrice: '', 
          receivedAmount: '', 
          planDuration: 3, 
          downPayment: 0 
        });
      }
    } catch (err) {
      alert('Failed to log selling item.');
    }
  };

  const handleDeleteItem = async (itemId, type) => {
    if (window.confirm('Are you sure you want to delete this historical entry?')) {
      try {
        const res = await api.delete(`/api/audits/${id}/item/${itemId}?type=${type}`);
        if (res.data && res.data.success) {
          setAudit(res.data.data);
        }
      } catch (err) {
        alert('Deletion failed.');
      }
    }
  };

  if (loading && !audit) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold text-sm">Compiling historical registers...</p>
      </div>
    );
  }

  if (!audit) return <p className="text-center p-10 text-red-600 font-bold">Register sheet lost.</p>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      <div className="flex items-center space-x-3 bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">
        <Link to="/audits" className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Audit Register — Year {audit.year}</h2>
          <p className="text-xs text-gray-500 font-medium">Re-enter past stock buys and sales from your manual shop registers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Investment (Stock Bought Cost)</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{settings.currency} {(audit.totalInventoryCost || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Sales Revenue Received</span>
          <p className="text-2xl font-black text-green-700 mt-1">{settings.currency} {(audit.totalSalesRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Net Year Audited Profit</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">{settings.currency} {(audit.totalYearlyProfit || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* SECTION 1: PURCHASES */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="border-b pb-3 flex justify-between items-center">
          <h3 className="font-extrabold text-base uppercase tracking-wider text-slate-800 flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <span>1. Stock Purchases Register (Dukan Buying list)</span>
          </h3>
          <span className="text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-lg">
            Total Items: {audit.purchasedProducts.length}
          </span>
        </div>

        <form onSubmit={handleAddPurchase} className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs font-bold bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div>
            <label className="block text-gray-500 uppercase tracking-wider">Product Name</label>
            <input 
              type="text" 
              value={purchaseForm.name} 
              onChange={(e) => setPurchaseForm({...purchaseForm, name: e.target.value})} 
              placeholder="e.g. Air Cooler, LED 43" 
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              required 
            />
          </div>
          <div>
            <label className="block text-gray-500 uppercase tracking-wider">Brand / Model</label>
            <input 
              type="text" 
              value={purchaseForm.brand} 
              onChange={(e) => setPurchaseForm({...purchaseForm, brand: e.target.value})} 
              placeholder="e.g. Super Asia, Samsung" 
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              required 
            />
          </div>
          <div>
            <label className="block text-gray-500 uppercase tracking-wider">Quantity</label>
            <input 
              type="number" 
              value={purchaseForm.quantity} 
              onChange={(e) => setPurchaseForm({...purchaseForm, quantity: Number(e.target.value)})} 
              min="1" 
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black" 
              required 
            />
          </div>
          <div>
            <label className="block text-gray-500 uppercase tracking-wider">Buying Cost ({settings.currency})</label>
            <input 
              type="number" 
              value={purchaseForm.purchasePrice} 
              onChange={(e) => setPurchaseForm({...purchaseForm, purchasePrice: e.target.value})} 
              placeholder="12000" 
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black" 
              required 
            />
          </div>
          <div className="flex items-end">
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm text-xs flex items-center justify-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Save Purchase</span>
            </button>
          </div>
        </form>

        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full text-left text-xs font-medium border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3">Product Name</th>
                  <th className="px-6 py-3">Brand / Model</th>
                  <th className="px-6 py-3 text-center">Quantity</th>
                  <th className="px-6 py-3 text-right">Buying Price</th>
                  <th className="px-6 py-3 text-right">Subtotal Cost</th>
                  <th className="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {audit.purchasedProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      No stock purchase entries added yet.
                    </td>
                  </tr>
                ) : (
                  audit.purchasedProducts.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 font-bold text-slate-800">{p.name}</td>
                      <td className="px-6 py-3 text-gray-500">{p.brand}</td>
                      <td className="px-6 py-3 text-center font-bold text-slate-900">{p.quantity}</td>
                      <td className="px-6 py-3 text-right">{settings.currency} {p.purchasePrice.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right font-extrabold text-slate-900">{settings.currency} {(p.quantity * p.purchasePrice).toLocaleString()}</td>
                      <td className="px-6 py-3 text-center">
                        {ALLOW_GLOBAL_DELETION ? (
                          <button 
                            onClick={() => handleDeleteItem(p._id, 'purchase')} 
                            className="text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors inline-flex"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center p-1 text-gray-400 cursor-not-allowed opacity-60" title="Locked: Only Admin can delete from config">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: SALES */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="border-b pb-3 flex justify-between items-center">
          <h3 className="font-extrabold text-base uppercase tracking-wider text-slate-800 flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            <span>2. Selling Products Register (Sales list & Dynamic Profit)</span>
          </h3>
          <span className="text-xs font-bold bg-green-50 border border-green-200 text-green-800 px-3 py-1 rounded-lg">
            Total Sold: {audit.soldProducts.length}
          </span>
        </div>

        <form onSubmit={handleAddSale} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold bg-slate-50 p-5 rounded-xl border border-slate-100">
          <div>
            <label className="block text-gray-500 uppercase tracking-wider">Product Name</label>
            <input 
              type="text" 
              value={saleForm.name} 
              onChange={(e) => setSaleForm({...saleForm, name: e.target.value})} 
              placeholder="e.g. iPhone 11, Cooler" 
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              required 
            />
          </div>
          <div>
            <label className="block text-gray-500 uppercase tracking-wider">Brand / Model</label>
            <input 
              type="text" 
              value={saleForm.brand} 
              onChange={(e) => setSaleForm({...saleForm, brand: e.target.value})} 
              placeholder="e.g. Apple, Super Asia" 
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              required 
            />
          </div>
          <div>
            <label className="block text-gray-500 uppercase tracking-wider">Buying Cost Price ({settings.currency})</label>
            <input 
              type="number" 
              value={saleForm.purchasePrice} 
              onChange={(e) => setSaleForm({...saleForm, purchasePrice: e.target.value})} 
              placeholder="Cost Price" 
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-black" 
              required 
            />
          </div>
          <div>
            <label className="block text-gray-500 uppercase tracking-wider">Final Selling Price ({settings.currency})</label>
            <input 
              type="number" 
              value={saleForm.salePrice} 
              onChange={(e) => setSaleForm({...saleForm, salePrice: e.target.value})} 
              placeholder="Sale Price" 
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-black" 
              required 
            />
          </div>

          <div>
            <label className="block text-gray-500 uppercase tracking-wider">Payment Method</label>
            <select 
              value={saleForm.paymentType} 
              onChange={(e) => setSaleForm({...saleForm, paymentType: e.target.value})} 
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold"
            >
              <option value="Cash">Cash Deal</option>
              <option value="Installment">Installments Deal</option>
            </select>
          </div>

          {saleForm.paymentType === 'Installment' ? (
            <>
              <div>
                <label className="block text-purple-700 uppercase tracking-wider">Down Payment Received</label>
                <input 
                  type="number" 
                  value={saleForm.downPayment} 
                  onChange={(e) => setSaleForm({...saleForm, downPayment: Number(e.target.value)})} 
                  className="mt-1 block w-full border border-purple-200 bg-purple-50 rounded-lg px-3 py-2 text-xs focus:outline-none font-black" 
                  required 
                />
              </div>
              <div>
                <label className="block text-purple-700 uppercase tracking-wider">Plan (Months)</label>
                <select 
                  value={saleForm.planDuration} 
                  onChange={(e) => setSaleForm({...saleForm, planDuration: Number(e.target.value)})} 
                  className="mt-1 block w-full border border-purple-200 bg-purple-50 rounded-lg px-3 py-2 text-xs focus:outline-none font-bold bg-white"
                >
                  <option value="3">3 Months Plan</option>
                  <option value="6">6 Months Plan</option>
                  <option value="12">12 Months Plan</option>
                </select>
              </div>
              <div>
                <label className="block text-purple-700 uppercase tracking-wider">Actual Received Amount So-far</label>
                <input 
                  type="number" 
                  value={saleForm.receivedAmount} 
                  onChange={(e) => setSaleForm({...saleForm, receivedAmount: e.target.value})} 
                  placeholder="Total cash collected so far" 
                  className="mt-1 block w-full border border-purple-200 bg-purple-50 rounded-lg px-3 py-2 text-xs focus:outline-none font-black" 
                  required 
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-3">
              <label className="block text-gray-400 uppercase tracking-wider">Actual Received Amount (Cash)</label>
              <input 
                type="number" 
                value={saleForm.salePrice} 
                disabled 
                className="mt-1 block w-full border border-gray-200 bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-500 font-black cursor-not-allowed" 
              />
            </div>
          )}

          <div className="md:col-span-4 flex justify-end pt-2">
            <button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm text-xs flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Save Sale & Compute Profit</span>
            </button>
          </div>
        </form>

        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full text-left text-xs font-medium border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3">Product Name</th>
                  <th className="px-6 py-3">Payment Method</th>
                  <th className="px-6 py-3 text-right">Selling Price</th>
                  <th className="px-6 py-3 text-right">Received Amount</th>
                  <th className="px-6 py-3 text-right">Audited Profit</th>
                  <th className="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {audit.soldProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      No sales records added yet for this year.
                    </td>
                  </tr>
                ) : (
                  audit.soldProducts.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-bold text-slate-800">{s.name}</p>
                        <p className="text-[10px] text-gray-500">{s.brand}</p>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.paymentType === 'Cash' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-purple-50 border-purple-200 text-purple-700'
                        }`}>
                          {s.paymentType}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-bold">{settings.currency} {s.salePrice.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right font-bold text-green-700">{settings.currency} {s.receivedAmount.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right font-black text-indigo-600">{settings.currency} {s.profit.toLocaleString()}</td>
                      <td className="px-6 py-3 text-center">
                        {ALLOW_GLOBAL_DELETION ? (
                          <button 
                            onClick={() => handleDeleteItem(s._id, 'sale')} 
                            className="text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors inline-flex"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center p-1 text-gray-400 cursor-not-allowed opacity-60" title="Locked: Only Admin can delete from config">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default YearlyAuditDetail;
