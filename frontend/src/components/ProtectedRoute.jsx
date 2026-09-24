import React from 'react';
import {
  Navigate,
  useLocation,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({
  children,
}) => {
  const {
    admin,
    loading,
  } = useAuth();

  const location =
    useLocation();

  // ======================================================
  // VERIFYING
  // ======================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />

          <span className="text-gray-600 text-sm font-medium">
            Verifying Session Authorization...
          </span>
        </div>
      </div>
    );
  }

  // ======================================================
  // NOT LOGGED IN
  // ======================================================

  if (!admin) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  // ======================================================
  // FORCE PASSWORD CHANGE
  // ======================================================
  //
  // New shop / Super Admin password reset:
  // admin.mustChangePassword === true
  //
  // Admin is only allowed to access:
  // /change-password
  //
  // All other protected pages are blocked until
  // the password has been changed.
  // ======================================================

  if (
    admin.mustChangePassword &&
    location.pathname !== '/change-password'
  ) {
    return (
      <Navigate
        to="/change-password"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  // ======================================================
  // ALREADY CHANGED PASSWORD
  // ======================================================
  //
  // If someone manually opens /change-password after
  // completing the password change, send them to dashboard.
  // ======================================================

  if (
    !admin.mustChangePassword &&
    location.pathname === '/change-password'
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  // ======================================================
  // AUTHORIZED
  // ======================================================

  return children;
};