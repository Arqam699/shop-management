import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

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

    // Deletion Mode
    allowGlobalDeletion: false,
    deletionModeExpiresAt: null,
  });

  const [loading, setLoading] = useState(true);


  // ==========================================
  // FETCH SETTINGS
  // ==========================================
  const fetchSettings = async () => {
    if (!admin) {
      setLoading(false);

      // Reset settings when admin logs out
      setSettings({
        shopName: 'My Electronics Shop',
        shopAddress: '',
        shopPhone: '',
        shopEmail: '',
        currency: 'Rs.',
        defaultInstallmentDurations: [3, 6, 12],
        defaultMinStockLevel: 5,
        invoicePrefix: 'INV',
        customerIdPrefix: 'CUST',
        allowGlobalDeletion: false,
        deletionModeExpiresAt: null,
      });

      return;
    }

    try {
      setLoading(true);

      const response = await api.get('/api/settings');

      if (response.data?.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error(
        'Failed to fetch settings from API:',
        error
      );
    } finally {
      setLoading(false);
    }
  };


  // ==========================================
  // FETCH SETTINGS WHEN ADMIN CHANGES
  // ==========================================
  useEffect(() => {
    fetchSettings();
  }, [admin]);


  // ==========================================
  // UPDATE NORMAL SETTINGS
  // ==========================================
  const updateSettings = async (updatedData) => {
    try {
      const response = await api.put(
        '/api/settings',
        updatedData
      );

      if (response.data?.success) {
        setSettings(response.data.data);

        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message:
          response.data?.message ||
          'Failed to update settings',
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


  // ==========================================
  // ENABLE DELETION MODE
  // ==========================================
  const enableDeletionMode = async (password) => {
    try {
      const response = await api.post(
        '/api/settings/deletion-mode/enable',
        {
          password,
        }
      );

      if (response.data?.success) {
        setSettings(response.data.data);

        return {
          success: true,
          data: response.data.data,
          message: response.data.message,
        };
      }

      return {
        success: false,
        message:
          response.data?.message ||
          'Failed to enable deletion mode',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          'Server error enabling deletion mode',
      };
    }
  };


  // ==========================================
  // DISABLE DELETION MODE
  // ==========================================
  const disableDeletionMode = async (password) => {
    try {
      const response = await api.post(
        '/api/settings/deletion-mode/disable',
        {
          password,
        }
      );

      if (response.data?.success) {
        setSettings(response.data.data);

        return {
          success: true,
          data: response.data.data,
          message: response.data.message,
        };
      }

      return {
        success: false,
        message:
          response.data?.message ||
          'Failed to disable deletion mode',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          'Server error disabling deletion mode',
      };
    }
  };


  // ==========================================
  // CONTEXT
  // ==========================================
  return (
    <SettingsContext.Provider
      value={{
        settings,

        updateSettings,

        enableDeletionMode,
        disableDeletionMode,

        refreshSettings: fetchSettings,

        loading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};


// ==========================================
// CUSTOM HOOK
// ==========================================
export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error(
      'useSettings must be used inside a SettingsProvider'
    );
  }

  return context;
};