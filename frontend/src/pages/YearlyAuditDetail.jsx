import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

import {
  ArrowLeft,
  Trash2,
  ClipboardList,
  ShoppingCart,
  Plus,
  Lock,
  Sparkles,
  Calendar,
  CircleDollarSign,
  TrendingUp,
  Package,
} from 'lucide-react';

const YearlyAuditDetail = () => {
  const { id } = useParams();
  const { settings } = useSettings();

  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  const [confirmConfig, setConfirmConfig] = useState(null);

  const [purchaseForm, setPurchaseForm] = useState({
    name: '',
    brand: '',
    quantity: 1,
    purchasePrice: '',
  });

  const [saleForm, setSaleForm] = useState({
    name: '',
    brand: '',
    paymentType: 'Cash',
    purchasePrice: '',
    salePrice: '',
    receivedAmount: '',
    planDuration: 3,
    downPayment: 0,
  });

  // Settings-based Universal Deletion Mode
  const isDeletionUnlocked = settings?.allowGlobalDeletion === true;

  // =====================================================
  // FETCH AUDIT DETAILS
  // =====================================================
  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/audits/${id}`);

      if (res.data && res.data.success) {
        setAudit(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit register details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // =====================================================
  // ADD PURCHASE ITEM
  // =====================================================
  const handleAddPurchase = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post(`/api/audits/${id}/purchase`, purchaseForm);

      if (res.data && res.data.success) {
        setAudit(res.data.data);
        setPurchaseForm({
          name: '',
          brand: '',
          quantity: 1,
          purchasePrice: '',
        });
        toast.success('Stock purchase logged successfully.');
      }
    } catch (err) {
      toast.error('Failed to log purchase item.');
    }
  };

  // =====================================================
  // ADD SALE ITEM
  // =====================================================
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
          downPayment: 0,
        });
        toast.success('Sale record logged & profit computed.');
      }
    } catch (err) {
      toast.error('Failed to log selling item.');
    }
  };

  // =====================================================
  // DELETE ITEM
  // =====================================================
  const handleDeleteItem = (itemId, type) => {
    if (!isDeletionUnlocked) {
      toast.error('Deletion Mode is disabled. Enable it from Settings first.');
      return;
    }

    setConfirmConfig({
      title: 'Delete Entry',
      message: 'Are you sure you want to permanently delete this historical entry?',
      onConfirm: async () => {
        try {
          const res = await api.delete(
            `/api/audits/${id}/item/${itemId}?type=${type}`
          );

          if (res.data && res.data.success) {
            setAudit(res.data.data);
            toast.success('Historical entry removed successfully.');
          }
        } catch (err) {
          toast.error(
            err.response?.data?.message || 'Deletion failed.'
          );
        }
      },
    });
  };

  const formatMoney = (val) =>
    `${settings?.currency || 'PKR'} ${Number(val || 0).toLocaleString('en-PK')}`;

  // =====================================================
  // LOADING STATE
  // =====================================================
  if (loading && !audit) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 animate-pulse opacity-25" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
              <ClipboardList className="w-7 h-7 text-blue-400 animate-pulse" />
            </div>
          </div>
          <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-slate-800">
            Compiling Historical Registers
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Loading yearly audit records and profit sheets...
          </p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-sm font-black text-rose-600">Register sheet lost or unavailable.</p>
        <Link
          to="/audits"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Audits Directory
        </Link>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO HEADER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            
            <div className="flex items-center gap-3.5 min-w-0">
              <Link
                to="/audits"
                className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Back to Audits Directory"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    Historical Audit
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Fiscal Year {audit.year}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  Audit Register — Year {audit.year}
                </h1>

                <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
                  Re-enter past stock buys and sales from your manual shop registers.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          SUMMARY KPI CARDS
      ====================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Inventory Cost */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Investment (Stock Cost)
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 truncate">
            {formatMoney(audit.totalInventoryCost)}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Buying investment</p>
        </div>

        {/* Total Sales Revenue */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Total Sales Revenue
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 truncate">
            {formatMoney(audit.totalSalesRevenue)}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Collections received</p>
        </div>

        {/* Net Yearly Profit */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-600 to-purple-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Net Year Audited Profit
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-indigo-600 truncate">
            {formatMoney(audit.totalYearlyProfit)}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Net audited earnings</p>
        </div>

      </div>

      {/* =====================================================
          SECTION 1: PURCHASES REGISTER
      ====================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-5 sm:p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                1. Stock Purchases Register (Buying List)
              </h3>
              <p className="text-[10px] text-slate-400">Log wholesale or factory purchases</p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-black">
            {audit.purchasedProducts.length} Items
          </span>
        </div>

        {/* PURCHASE FORM */}
        <form
          onSubmit={handleAddPurchase}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80"
        >
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={purchaseForm.name}
              onChange={(e) =>
                setPurchaseForm({ ...purchaseForm, name: e.target.value })
              }
              placeholder="e.g. Air Cooler, LED 43"
              className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-bold bg-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Brand / Model *
            </label>
            <input
              type="text"
              value={purchaseForm.brand}
              onChange={(e) =>
                setPurchaseForm({ ...purchaseForm, brand: e.target.value })
              }
              placeholder="e.g. Super Asia, Samsung"
              className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-bold bg-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              value={purchaseForm.quantity}
              onChange={(e) =>
                setPurchaseForm({
                  ...purchaseForm,
                  quantity: Number(e.target.value),
                })
              }
              min="1"
              className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-black bg-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Buying Cost ({settings?.currency || 'PKR'}) *
            </label>
            <input
              type="number"
              value={purchaseForm.purchasePrice}
              onChange={(e) =>
                setPurchaseForm({ ...purchaseForm, purchasePrice: e.target.value })
              }
              placeholder="12000"
              className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-black bg-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Save Purchase</span>
            </button>
          </div>
        </form>

        {/* PURCHASE TABLE */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs text-slate-600 font-medium">
              <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3.5">Product Name</th>
                  <th className="px-5 py-3.5">Brand / Model</th>
                  <th className="px-5 py-3.5 text-center">Quantity</th>
                  <th className="px-5 py-3.5 text-right">Buying Price</th>
                  <th className="px-5 py-3.5 text-right">Subtotal Cost</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {audit.purchasedProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-8 text-center text-slate-400 font-semibold">
                      No stock purchase entries added yet for this year.
                    </td>
                  </tr>
                ) : (
                  audit.purchasedProducts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 font-black text-slate-900">{p.name}</td>
                      <td className="px-5 py-3 text-slate-500">{p.brand}</td>
                      <td className="px-5 py-3 text-center font-bold text-slate-900">{p.quantity}</td>
                      <td className="px-5 py-3 text-right">{formatMoney(p.purchasePrice)}</td>
                      <td className="px-5 py-3 text-right font-black text-slate-900">
                        {formatMoney(p.quantity * p.purchasePrice)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isDeletionUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(p._id, 'purchase')}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200"
                            title="Locked: Enable Deletion Mode from Settings"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
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

      {/* =====================================================
          SECTION 2: SALES REGISTER
      ====================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-5 sm:p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                2. Selling Products Register (Sales List & Profit)
              </h3>
              <p className="text-[10px] text-slate-400">Cash and installment audited deals</p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black">
            {audit.soldProducts.length} Sales
          </span>
        </div>

        {/* SALES FORM */}
        <form
          onSubmit={handleAddSale}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 text-xs"
        >
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={saleForm.name}
              onChange={(e) => setSaleForm({ ...saleForm, name: e.target.value })}
              placeholder="e.g. iPhone 11, Cooler"
              className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-bold bg-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Brand / Model *
            </label>
            <input
              type="text"
              value={saleForm.brand}
              onChange={(e) => setSaleForm({ ...saleForm, brand: e.target.value })}
              placeholder="e.g. Apple, Super Asia"
              className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-bold bg-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Buying Cost Price ({settings?.currency || 'PKR'}) *
            </label>
            <input
              type="number"
              value={saleForm.purchasePrice}
              onChange={(e) => setSaleForm({ ...saleForm, purchasePrice: e.target.value })}
              placeholder="Cost Price"
              className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-bold bg-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Final Selling Price ({settings?.currency || 'PKR'}) *
            </label>
            <input
              type="number"
              value={saleForm.salePrice}
              onChange={(e) => setSaleForm({ ...saleForm, salePrice: e.target.value })}
              placeholder="Sale Price"
              className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-bold bg-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Payment Method
            </label>
            <select
              value={saleForm.paymentType}
              onChange={(e) => setSaleForm({ ...saleForm, paymentType: e.target.value })}
              className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-bold bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Cash">Cash Deal</option>
              <option value="Installment">Installments Deal</option>
            </select>
          </div>

          {saleForm.paymentType === 'Installment' ? (
            <>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-purple-700 mb-1">
                  Down Payment Received
                </label>
                <input
                  type="number"
                  value={saleForm.downPayment}
                  onChange={(e) => setSaleForm({ ...saleForm, downPayment: Number(e.target.value) })}
                  className="w-full h-11 border border-purple-200 bg-purple-50/70 rounded-xl px-3.5 text-xs font-bold focus:outline-none text-purple-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-purple-700 mb-1">
                  Plan Duration (Months)
                </label>
                <select
                  value={saleForm.planDuration}
                  onChange={(e) => setSaleForm({ ...saleForm, planDuration: Number(e.target.value) })}
                  className="w-full h-11 border border-purple-200 bg-purple-50/70 rounded-xl px-3.5 text-xs font-bold bg-white focus:outline-none cursor-pointer"
                >
                  <option value="3">3 Months Plan</option>
                  <option value="6">6 Months Plan</option>
                  <option value="12">12 Months Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-purple-700 mb-1">
                  Actual Received Amount So-far
                </label>
                <input
                  type="number"
                  value={saleForm.receivedAmount}
                  onChange={(e) => setSaleForm({ ...saleForm, receivedAmount: e.target.value })}
                  placeholder="Total cash collected so far"
                  className="w-full h-11 border border-purple-200 bg-purple-50/70 rounded-xl px-3.5 text-xs font-black focus:outline-none text-purple-900"
                  required
                />
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Actual Received Amount (Cash Full)
              </label>
              <input
                type="number"
                value={saleForm.salePrice}
                disabled
                className="w-full h-11 border border-slate-200 bg-slate-100 rounded-xl px-3.5 text-xs font-black text-slate-500 cursor-not-allowed"
              />
            </div>
          )}

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-emerald-950/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Save Sale & Compute Profit</span>
            </button>
          </div>
        </form>

        {/* SALES TABLE */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs text-slate-600 font-medium">
              <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3.5">Product Name</th>
                  <th className="px-5 py-3.5">Payment Method</th>
                  <th className="px-5 py-3.5 text-right">Selling Price</th>
                  <th className="px-5 py-3.5 text-right">Received Amount</th>
                  <th className="px-5 py-3.5 text-right text-indigo-600">Audited Profit</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {audit.soldProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-8 text-center text-slate-400 font-semibold">
                      No sales records added yet for this fiscal year.
                    </td>
                  </tr>
                ) : (
                  audit.soldProducts.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-black text-slate-900">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{s.brand}</p>
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                            s.paymentType === 'Cash'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-purple-50 border-purple-200 text-purple-700'
                          }`}
                        >
                          {s.paymentType}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right font-bold text-slate-800">
                        {formatMoney(s.salePrice)}
                      </td>

                      <td className="px-5 py-3 text-right font-bold text-emerald-600">
                        {formatMoney(s.receivedAmount)}
                      </td>

                      <td className="px-5 py-3 text-right font-black text-indigo-600">
                        {formatMoney(s.profit)}
                      </td>

                      <td className="px-5 py-3 text-center">
                        {isDeletionUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(s._id, 'sale')}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200"
                            title="Locked: Enable Deletion Mode from Settings"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
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

      <ConfirmModal
        isOpen={!!confirmConfig}
        onClose={() => setConfirmConfig(null)}
        onConfirm={async () => {
          if (confirmConfig?.onConfirm) {
            await confirmConfig.onConfirm();
          }
          setConfirmConfig(null);
        }}
        title={confirmConfig?.title || 'Confirm Action'}
        message={confirmConfig?.message || 'Are you sure you want to proceed?'}
      />
    </div>
  );
};

export default YearlyAuditDetail;