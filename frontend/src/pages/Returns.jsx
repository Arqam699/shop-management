import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import {
  RefreshCcw,
  Search,
  Trash2,
  Lock,
  Sparkles,
  RotateCcw,
  Package,
  User,
  Receipt,
  CircleDollarSign,
} from 'lucide-react';

const Returns = () => {
  const { settings } = useSettings();

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Settings-based Universal Deletion Mode
  const isDeletionUnlocked = settings?.allowGlobalDeletion === true;

  // =====================================================
  // FETCH RETURNS
  // =====================================================
  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/returns');

      if (response.data && response.data.success) {
        setReturns(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching returns directory:', error);
      toast.error('Failed to load return records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  // =====================================================
  // DELETE RETURN LOGIC
  // =====================================================
  const handleDeleteReturn = (id, returnId) => {
    if (!isDeletionUnlocked) {
      toast.error('Deletion Mode is disabled. Enable it from Settings first.');
      return;
    }

    setConfirmConfig({
      title: 'Delete Return Record',
      message: `Are you sure you want to permanently delete return record "${returnId}" from database?`,
      onConfirm: async () => {
        try {
          const response = await api.delete(`/api/returns/${id}`);

          if (response.data && response.data.success) {
            setReturns((currentReturns) =>
              currentReturns.filter((r) => r._id !== id)
            );

            toast.success(`Return record ${returnId} removed successfully!`);
          }
        } catch (error) {
          toast.error(
            error.response?.data?.message || 'Failed to delete return record.'
          );
        }
      },
    });
  };

  const filteredReturns = returns.filter(
    (r) =>
      r.customer?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.returnId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMoney = (val) =>
    `${settings?.currency || 'PKR'} ${Number(val || 0).toLocaleString('en-PK')}`;

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
            
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Inventory Adjustments
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {returns.length} Total Returns Logged
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Returns & Adjustments History
              </h1>

              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                Track dynamic product exchanges, refund cashbacks and installment plan reductions.
              </p>
            </div>

            {/* Quick Metrics Badge */}
            <div className="flex items-center gap-3 bg-white/[0.06] border border-white/[0.08] rounded-2xl p-4 self-start xl:self-auto">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-black text-slate-400 block">Total Returns</span>
                <p className="text-lg font-black text-white mt-0.5">{filteredReturns.length} Records</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SEARCH TOOLBAR */}
      <section className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-3xl shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search returned vouchers by customer name, return ID (RET-...) ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 border border-slate-200 rounded-xl pl-11 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </section>

      {/* RETURNS TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-xs font-black uppercase tracking-wider">
              Querying returns directory...
            </span>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <RefreshCcw className="w-12 h-12 text-slate-300" />
            <p className="text-sm font-black text-slate-700">No returns recorded yet</p>
            <p className="text-xs text-slate-400 max-w-sm">
              If a customer returns an item, click "Return" directly from their invoice details page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 font-medium">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-4">Return ID</th>
                  <th className="px-5 py-4">Original Invoice</th>
                  <th className="px-5 py-4">Customer Details</th>
                  <th className="px-5 py-4">Returned Product</th>
                  <th className="px-5 py-4 text-center">Returned Qty</th>
                  <th className="px-5 py-4 text-right">Refund / Adjusted</th>
                  <th className="px-5 py-4">Reason</th>
                  <th className="px-5 py-4">Return Date</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredReturns.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-black text-indigo-600 tracking-wider">
                      {r.returnId}
                    </td>

                    <td className="px-5 py-3.5 font-bold text-slate-700">
                      {r.sale?.saleId || 'Deleted Invoice'}
                    </td>

                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-black text-slate-900">{r.customer?.fullName || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{r.customer?.mobileNumber || ''}</p>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-800 font-bold">
                      {r.product?.name || 'Deleted Product'}
                    </td>

                    <td className="px-5 py-3.5 text-center font-black text-rose-600">
                      {r.quantity} Units
                    </td>

                    <td className="px-5 py-3.5 text-right font-black text-emerald-600 text-sm">
                      {formatMoney(r.refundAmount)}
                    </td>

                    <td
                      className="px-5 py-3.5 text-slate-500 truncate max-w-[150px]"
                      title={r.reason}
                    >
                      {r.reason || '—'}
                    </td>

                    <td className="px-5 py-3.5 text-slate-500 font-semibold whitespace-nowrap">
                      {new Date(r.returnDate || r.createdAt).toLocaleDateString('en-PK', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {isDeletionUnlocked ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteReturn(r._id, r.returnId)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                          title="Delete Return Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div
                          className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-slate-400"
                          title="Deletion Mode is locked in Settings"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

export default Returns;