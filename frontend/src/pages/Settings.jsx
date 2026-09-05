import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Save, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

const SettingsPage = () => {
  const { settings, updateSettings, refreshSettings } = useSettings();
  const [formData, setFormData] = useState({ ...settings });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shop Configurations</h2>
          <p className="text-sm text-gray-600">Customize system rules, print prefixes, and dukan identifiers.</p>
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
    </div>
  );
};

export default SettingsPage;