import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import {
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  ShieldAlert,
  KeyRound,
  X,
  AlertCircle,
  Sparkles,
  Building2,
  Calculator,
  ShieldCheck,
} from 'lucide-react';

const SettingsPage = () => {
  const { settings, updateSettings, refreshSettings } = useSettings();

  const [formData, setFormData] = useState({ ...settings });

  const [status, setStatus] = useState({
    type: '',
    message: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Enable / Disable mode
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDurationsChange = (e) => {
    const arr = e.target.value
      .split(',')
      .map((num) => parseInt(num.trim()))
      .filter((n) => !isNaN(n));

    setFormData((prev) => ({
      ...prev,
      defaultInstallmentDurations: arr,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({
      type: '',
      message: '',
    });

    setIsSaving(true);
    const result = await updateSettings(formData);
    setIsSaving(false);

    if (result.success) {
      await refreshSettings();
      setStatus({
        type: 'success',
        message: 'Settings database updated successfully!',
      });

      setTimeout(() => {
        setStatus({
          type: '',
          message: '',
        });
      }, 5000);
    } else {
      setStatus({
        type: 'error',
        message: result.message || 'Failed to update settings.',
      });
    }
  };

  // Open password modal
  const handleToggleClick = () => {
    setAdminPassword('');
    setPasswordError('');

    if (settings?.allowGlobalDeletion) {
      setPendingAction('disable');
    } else {
      setPendingAction('enable');
    }

    setShowPasswordModal(true);
  };

  // Verify password and enable/disable deletion mode
  const handleVerifyPasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setIsVerifying(true);

    try {
      let response;

      if (pendingAction === 'enable') {
        response = await api.post('/api/settings/deletion-mode/enable', {
          password: adminPassword,
        });
      } else {
        response = await api.post('/api/settings/deletion-mode/disable', {
          password: adminPassword,
        });
      }

      if (response.data?.success) {
        await refreshSettings();

        setShowPasswordModal(false);
        setAdminPassword('');
        setPasswordError('');
        setPendingAction(null);

        if (response.data.data) {
          setFormData(response.data.data);
        }

        toast.success(
          pendingAction === 'enable'
            ? 'IDENTITY VERIFIED! Deletion Mode is now ON for 30 minutes.'
            : 'IDENTITY VERIFIED! Deletion Mode has been turned OFF.'
        );
      }
    } catch (error) {
      setPasswordError(
        error.response?.data?.message ||
          'Incorrect Admin Password. Access Denied!'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const closePasswordModal = () => {
    if (isVerifying) return;
    setShowPasswordModal(false);
    setAdminPassword('');
    setPasswordError('');
    setPendingAction(null);
  };

  const isDeletionUnlocked = settings?.allowGlobalDeletion || false;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">

      {/* =====================================================
          DARK HERO HEADER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  System Configurations
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-bold text-slate-400">
                  Security & Rules
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Shop Configurations & Security
              </h1>

              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                Customize system rules, print prefixes, currency parameters, and master deletion security locks.
              </p>
            </div>

            <button
              onClick={refreshSettings}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95 self-start sm:self-auto"
              title="Reload configurations"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Reload Settings</span>
            </button>

          </div>
        </div>
      </section>

      {/* STATUS ALERT */}
      {status.message && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border animate-[pageEnter_0.2s_ease-out] ${
            status.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}

          <span className="text-xs font-bold leading-relaxed">
            {status.message}
          </span>
        </div>
      )}

      {/* DELETION MODE CARD */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-sm ${
          isDeletionUnlocked
            ? 'bg-rose-50/80 border-rose-300 shadow-md'
            : 'bg-white border-slate-200/80'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isDeletionUnlocked
                  ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-950/20'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  Master Deletion Access Switch
                </h3>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    isDeletionUnlocked
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {isDeletionUnlocked ? 'UNLOCKED (Active)' : 'LOCKED (Safe Mode)'}
                </span>
              </div>

              <p className="text-xs text-slate-500 max-w-lg leading-relaxed font-semibold">
                {isDeletionUnlocked
                  ? '⚠️ Danger Mode: Delete buttons are currently active. Deletion Mode will automatically lock after 30 minutes.'
                  : 'All deletion buttons are currently LOCKED. Turning ON requires your Admin Password.'}
              </p>

              {isDeletionUnlocked && settings?.deletionModeExpiresAt && (
                <p className="text-xs font-black text-rose-700">
                  Auto-lock time:{' '}
                  {new Date(settings.deletionModeExpiresAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* TOGGLE SWITCH */}
          <button
            type="button"
            onClick={handleToggleClick}
            className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isDeletionUnlocked ? 'bg-rose-600' : 'bg-slate-300'
            }`}
            title={
              isDeletionUnlocked
                ? 'Disable Deletion Mode'
                : 'Enable Deletion Mode'
            }
          >
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                isDeletionUnlocked
                  ? 'translate-x-8 text-rose-600'
                  : 'translate-x-0 text-slate-400'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>

      {/* NORMAL SETTINGS FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="p-6 sm:p-8 space-y-7">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* SHOP INFORMATION */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Dukan Information</h3>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Shop Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName || ''}
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Shop Address
                </label>
                <input
                  type="text"
                  name="shopAddress"
                  value={formData.shopAddress || ''}
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="text"
                  name="shopPhone"
                  value={formData.shopPhone || ''}
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Shop Email
                </label>
                <input
                  type="email"
                  name="shopEmail"
                  value={formData.shopEmail || ''}
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            {/* SYSTEM CALCULATIONS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <Calculator className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">System Parameters & Prefixes</h3>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Local Currency Symbol <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="currency"
                  value={formData.currency || 'PKR'}
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Default Stock Threshold (Low warning) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="defaultMinStockLevel"
                  value={formData.defaultMinStockLevel || 5}
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Invoice ID Prefix <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="invoicePrefix"
                    value={formData.invoicePrefix || 'INV'}
                    onChange={handleChange}
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Customer ID Prefix <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customerIdPrefix"
                    value={formData.customerIdPrefix || 'CUST'}
                    onChange={handleChange}
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Installment Durations (Months, comma-separated) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="defaultInstallmentDurations"
                  value={
                    formData.defaultInstallmentDurations
                      ? formData.defaultInstallmentDurations.join(', ')
                      : '3, 6, 12'
                  }
                  onChange={handleDurationsChange}
                  placeholder="3, 6, 12"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />
              </div>
            </div>

          </div>

        </div>

        {/* SAVE FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Configurations...' : 'Save System Settings'}</span>
          </button>
        </div>
      </form>

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-[pageEnter_0.25s_ease-out]">
          <form
            onSubmit={handleVerifyPasswordSubmit}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div
              className={`p-5 sm:p-6 border-b flex justify-between items-center ${
                pendingAction === 'enable' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shadow-md ${
                  pendingAction === 'enable' ? 'bg-rose-600' : 'bg-slate-900'
                }`}>
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-slate-900">
                    Confirm Admin Password
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">Security verification required</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closePasswordModal}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {passwordError && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                {pendingAction === 'enable'
                  ? 'To enable Deletion Mode, enter your active Admin Password. Delete buttons will become available for 30 minutes.'
                  : 'To disable Deletion Mode, enter your active Admin Password to confirm this security action.'}
              </p>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Security Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-black bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={closePasswordModal}
                disabled={isVerifying}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-600 transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isVerifying}
                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-black shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 ${
                  pendingAction === 'enable'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/20'
                    : 'bg-slate-900 hover:bg-slate-800 shadow-slate-950/20'
                }`}
              >
                {isVerifying
                  ? 'Verifying Password...'
                  : pendingAction === 'enable'
                  ? 'Verify & Enable Deletion'
                  : 'Verify & Disable Deletion'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;