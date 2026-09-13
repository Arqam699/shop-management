import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

import {
  Calendar,
  Plus,
  Eye,
  Trash2,
  X,
  AlertCircle,
  Lock,
  Sparkles,
  CalendarRange,
  ShieldCheck,
  CircleDollarSign,
  TrendingUp,
} from 'lucide-react';

const YearlyAudits = () => {
  const { settings } = useSettings();

  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =====================================================
  // CONFIRMATION MODAL
  // =====================================================
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Deletion Mode status from Settings
  const isDeletionUnlocked = settings?.allowGlobalDeletion === true;

  // =====================================================
  // FETCH AUDITS
  // =====================================================
  const fetchAudits = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/audits');

      if (res.data && res.data.success) {
        setAudits(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit registers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  // =====================================================
  // CREATE YEAR SLOT
  // =====================================================
  const handleCreateYear = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    try {
      const res = await api.post('/api/audits', {
        year: newYear,
      });

      if (res.data && res.data.success) {
        toast.success(`Audit Sheet for Year ${newYear} generated successfully!`);
        setShowAddModal(false);
        setNewYear('');
        fetchAudits();
      }
    } catch (error) {
      setModalError(
        error.response?.data?.message || 'Failed to create year slot.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // DELETE YEAR AUDIT
  // =====================================================
  const handleDeleteYear = (id, year) => {
    if (!isDeletionUnlocked) {
      toast.error('Deletion Mode is disabled. Enable it from Settings first.');
      return;
    }

    setConfirmConfig({
      title: 'Delete Yearly Audit',
      message: `DANGER: Are you sure you want to permanently delete Yearly Audit register for Year "${year}"?`,
      onConfirm: async () => {
        try {
          await api.delete(`/api/audits/${id}`);

          setAudits((currentAudits) =>
            currentAudits.filter((a) => a._id !== id)
          );

          toast.success(`Yearly Audit register for ${year} deleted successfully.`);
        } catch (error) {
          toast.error(
            error.response?.data?.message || 'Failed to remove yearly audit register.'
          );
        }
      },
    });
  };

  const formatMoney = (val) =>
    `${settings?.currency || 'PKR'} ${Number(val || 0).toLocaleString('en-PK')}`;

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO HEADER (Matched to Layout Theme)
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Fiscal Audits
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {audits.length} Audited Years
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Lifetime Yearly Audits
              </h1>

              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                Digitize your shop's past manual registers (buying costs, cash/installment sales & net profits) cleanly.
              </p>
            </div>

            {/* ACTION BUTTON */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95 self-start xl:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Year Audit Sheet</span>
            </button>

          </div>
        </div>
      </section>

      {/* =====================================================
          AUDIT SHEETS GRID
      ====================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="p-16 text-center col-span-full">
            <div className="w-8 h-8 mx-auto border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-slate-400 text-xs font-black uppercase tracking-wider">
              Loading auditing registers...
            </span>
          </div>
        ) : audits.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center col-span-full space-y-2 text-slate-400 shadow-sm">
            <Calendar className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-black text-slate-700 text-sm">No historical registers added yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click "Add Year Audit Sheet" to start digitizing historical shop registers from previous years.
            </p>
          </div>
        ) : (
          audits.map((audit) => (
            <div
              key={audit._id}
              className="group relative bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between space-y-5 overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Fiscal Year</span>
                    <h3 className="text-lg font-black text-slate-900">Year {audit.year}</h3>
                  </div>
                </div>

                {isDeletionUnlocked ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteYear(audit._id, audit.year)}
                    className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition-colors"
                    title="Delete entire year audit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-400"
                    title="Deletion Mode is locked in Settings"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="space-y-2.5 text-xs font-semibold text-slate-500">
                <div className="flex justify-between items-center">
                  <span>Investment (Buy Cost):</span>
                  <span className="font-bold text-slate-800">
                    {formatMoney(audit.totalInventoryCost)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Total Collected Revenue:</span>
                  <span className="font-black text-emerald-600">
                    {formatMoney(audit.totalSalesRevenue)}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-2.5 text-sm font-black text-slate-900">
                  <span>Net Audited Profit:</span>
                  <span className="text-indigo-600">
                    {formatMoney(audit.totalYearlyProfit)}
                  </span>
                </div>
              </div>

              <Link
                to={`/audits/${audit._id}`}
                className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-3 rounded-2xl transition-all shadow-sm hover:scale-[1.02] active:scale-95"
              >
                <Eye className="w-4 h-4" />
                <span>Open Auditing Sheets</span>
              </Link>
            </div>
          ))
        )}
      </div>

      {/* =====================================================
          ADD YEAR MODAL
      ====================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-[pageEnter_0.25s_ease-out]">
          <form
            onSubmit={handleCreateYear}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white p-5 border-b border-white/[0.08] flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <CalendarRange className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm tracking-tight text-white">
                  Generate Year Audit Slot
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modalError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start gap-2 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Enter Fiscal Year (e.g. 2022, 2023) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="2024"
                  min="2000"
                  max="2100"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-black bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-600 transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              >
                {isSubmitting ? 'Generating...' : 'Create Year Slot'}
              </button>
            </div>
          </form>
        </div>
      )}

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

export default YearlyAudits;