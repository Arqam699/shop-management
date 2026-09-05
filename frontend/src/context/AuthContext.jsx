import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/auth/me');
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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data && response.data.success) {
        setAdmin(response.data.data);
        return { success: true };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Server error, please check credentials.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAdmin(null);
    }
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};