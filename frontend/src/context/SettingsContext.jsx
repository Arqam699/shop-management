import React, { createContext, useContext, useState, useEffect } from 'react';

import api from '../utils/api';

import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { admin } = useAuth();

  const [settings, setSettings] = useState({
    shopName: 'My Electronics Shop',
    shopAddress: '',
    shopPhone: '',
    shopEmail: '',
    currency: 'Rs.',
    defaultInstallmentDurations: [3, 6, 12],
    defaultMinStockLevel: 5,
    invoicePrefix: 'INV',
    customerIdPrefix: 'CUST',
  });

  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    if (!admin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await api.get('/api/settings');

      if (response.data && response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings from API:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [admin]);

  const updateSettings = async (updatedData) => {
    try {
      const response = await api.put('/api/settings', updatedData);

      if (response.data && response.data.success) {
        setSettings(response.data.data);

        return {
          success: true,
        };
      }

      return {
        success: false,
        message: response.data.message || 'Failed to update settings',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          'Server error saving settings',
      };
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        refreshSettings: fetchSettings,
        loading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error(
      'useSettings must be used inside a SettingsProvider'
    );
  }

  return context;
};