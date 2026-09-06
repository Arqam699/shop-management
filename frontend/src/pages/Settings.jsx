import React, { useState, useEffect } from 'react';
import api from '../utils/api'; // API import for password verification
import { useSettings } from '../context/SettingsContext';
import { 
  Save, CheckCircle2, AlertTriangle, RefreshCw, Lock, ShieldAlert, KeyRound, X 
} from 'lucide-react';

const SettingsPage = () => {
  const { settings, updateSettings, refreshSettings } = useSettings();
  const [formData, setFormData] = useState({ ...settings });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Master Deletion Security Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDurationsChange = (e) => {
    const arr = e.target.value.split(',').map(num => parseInt(num.trim())).filter(n => !isNaN(n));
    setFormData({ ...formData, defaultInstallmentDurations: arr });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setIsSaving(true);
    
    const result = await updateSettings(formData);
    setIsSaving(false);

    if (result.success) {
      setStatus({ type: 'success', message: 'Settings database updated successfully!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    } else {
      setStatus({ type: 'error', message: result.message || 'Failed to update settings.' });
    }
  };

  // Toggle Master Deletion Lock handler
  const handleToggleClick = async () => {
    if (!settings?.allowGlobalDeletion) {
      // If currently locked, open password modal to confirm admin identity
      setAdminPassword('');
      setPasswordError('');
      setShowPasswordModal(true);
    } else {
      // If currently unlocked, lock it back immediately with 1-click
      if (window.confirm('Lock all deletion actions across the system (Safe Mode)?')) {
        const res = await updateSettings({ ...formData, allowGlobalDeletion: false });
        if (res.success) {
          alert('System Deletions LOCKED! All delete buttons are now disabled.');
        }
      }
    }
  };

  // Verify Admin Password and Unlock Deletions
  const handleVerifyPasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setIsVerifying(true);

    try {
      const verifyRes = await api.post('/auth/verify-password', { password: adminPassword });
      if (verifyRes.data && verifyRes.data.success) {
        // Password verified! Now enable global deletion in settings
        const updateRes = await updateSettings({ ...formData, allowGlobalDeletion: true });
        if (updateRes.success) {
          alert('IDENTITY VERIFIED! System Deletions UNLOCKED. All delete buttons are now active across the application.');
          setShowPasswordModal(false);
        }
      }
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Incorrect Admin Password. Access Denied!');
    } finally {
      setIsVerifying(false);
    }
  };

  const isDeletionUnlocked = settings?.allowGlobalDeletion || false;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">Shop Configurations & Security</h2>
          <p className="text-sm text-gray-600">Customize system rules, print prefixes, and master deletion security locks.</p>
        </div>
        <button 
          onClick={refreshSettings}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Reload configurations"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {status.message && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 border ${
          status.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-medium">{status.message}</span>
        </div>
      )}

      {/* MASTER SECURITY TOGGLE CARD (Password Protected) */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDeletionUnlocked 
          ? 'bg-red-50/50 border-red-300 shadow-md' 
          : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className={`p-3 rounded-xl ${isDeletionUnlocked ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-slate-900">Master Deletion Access Switch</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isDeletionUnlocked 
                    ? 'bg-red-100 text-red-800 border-red-200' 
                    : 'bg-green-100 text-green-800 border-green-200'
                }`}>
                  {isDeletionUnlocked ? 'UNLOCKED (Active)' : 'LOCKED (Safe Mode)'}
                </span>
              </div>
              <p className="text-xs text-gray-500 max-w-lg leading-relaxed font-medium">
                {isDeletionUnlocked 
                  ? '⚠️ Danger Mode: All delete buttons across the application are currently UNLOCKED. Click switch to lock.'
                  : 'All deletion buttons across the entire software are currently LOCKED to prevent accidental data loss. Turning ON requires Admin Password.'}
              </p>
            </div>
          </div>

          {/* TOGGLE SWITCH BUTTON */}
          <button
            type="button"
            onClick={handleToggleClick}
            className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isDeletionUnlocked ? 'bg-red-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                isDeletionUnlocked ? 'translate-x-8 text-red-600' : 'translate-x-0 text-slate-400'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>

      {/* REGULAR SETTINGS FORM */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shop Details */}
            <div className="space-y-4">
              <h3 className="text-md font-bold text-gray-800 border-b pb-2">Dukan Information</h3>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">Shop Name</label>
                <input 
                  type="text" 
                  name="shopName" 
                  value={formData.shopName || ''} 
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">Shop Address</label>
                <input 
                  type="text" 
                  name="shopAddress" 
                  value={formData.shopAddress || ''} 
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">Mobile Number</label>
                <input 
                  type="text" 
                  name="shopPhone" 
                  value={formData.shopPhone || ''} 
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">Shop Email</label>
                <input 
                  type="email" 
                  name="shopEmail" 
                  value={formData.shopEmail || ''} 
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>

            {/* Invoicing and Defaults */}
            <div className="space-y-4">
              <h3 className="text-md font-bold text-gray-800 border-b pb-2">System Calculations</h3>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">Local Currency Symbol</label>
                <input 
                  type="text" 
                  name="currency" 
                  value={formData.currency || 'Rs.'} 
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">Default Stock Threshold (Low warning)</label>
                <input 
                  type="number" 
                  name="defaultMinStockLevel" 
                  value={formData.defaultMinStockLevel || 5} 
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500">Invoice ID Prefix</label>
                  <input 
                    type="text" 
                    name="invoicePrefix" 
                    value={formData.invoicePrefix || 'INV'} 
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500">Customer ID Prefix</label>
                  <input 
                    type="text" 
                    name="customerIdPrefix" 
                    value={formData.customerIdPrefix || 'CUST'} 
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">Installment Durations (Months, comma-separated)</label>
                <input 
                  type="text" 
                  name="defaultInstallmentDurations" 
                  value={formData.defaultInstallmentDurations ? formData.defaultInstallmentDurations.join(', ') : '3, 6, 12'} 
                  onChange={handleDurationsChange}
                  placeholder="3, 6, 12"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:bg-indigo-400"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Configurations...' : 'Save System Settings'}</span>
          </button>
        </div>
      </form>

      {/* PASSWORD VERIFICATION MODAL FOR UNLOCKING DELETIONS */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleVerifyPasswordSubmit} className="bg-white border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-5 border-b bg-red-50 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-red-800">
                <KeyRound className="w-5 h-5" />
                <span className="font-extrabold text-sm uppercase tracking-wider">Confirm Admin Password</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {passwordError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start space-x-2 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{passwordError}</span>
                </div>
              )}

              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                To unlock delete buttons across the application, please enter your active <strong>Admin Password</strong> to confirm your identity.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500">Security Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-extrabold"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow transition-colors disabled:bg-red-400"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Unlock Deletions'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;