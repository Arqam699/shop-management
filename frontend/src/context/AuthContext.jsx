
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // CHECK AUTH STATUS
  // =====================================================

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/api/auth/me');

      if (response.data && response.data.success) {
        setAdmin(response.data.data);
      } else {
        setAdmin(null);
      }
    } catch (error) {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL AUTH CHECK
  // =====================================================

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // =====================================================
  // LOGIN
  // =====================================================

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      // =================================================
      // SUCCESSFUL LOGIN
      // =================================================

      if (response.data && response.data.success) {
        setAdmin(response.data.data);

        return {
          success: true,
          data: response.data.data,
        };
      }

      // =================================================
      // NORMAL LOGIN FAILURE
      // =================================================

      return {
        success: false,
        message:
          response.data?.message ||
          'Login failed',
        accountSuspended:
          response.data?.accountSuspended || false,
        suspensionReason:
          response.data?.suspensionReason || '',
      };
    } catch (error) {
      // =================================================
      // BACKEND ERROR RESPONSE
      // =================================================

      const responseData = error.response?.data;

      return {
        success: false,

        message:
          responseData?.message ||
          'Server error, please check credentials.',

        // IMPORTANT:
        // These values are returned even when HTTP status
        // is 403 because Axios puts the response in
        // error.response.data.
        accountSuspended:
          responseData?.accountSuspended || false,

        suspensionReason:
          responseData?.suspensionReason || '',
      };
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAdmin(null);
    }
  };

  // =====================================================
  // CONTEXT
  // =====================================================

  return (
    <AuthContext.Provider
      value={{
        admin,
        loading,
        login,
        logout,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// =====================================================
// USE AUTH HOOK
// =====================================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside an AuthProvider'
    );
  }

  return context;
};
