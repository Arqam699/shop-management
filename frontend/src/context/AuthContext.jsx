import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import api from '../utils/api';

const AuthContext =
  createContext(null);

export const AuthProvider = ({
  children,
}) => {
  const [admin, setAdmin] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    sessionMessage,
    setSessionMessage,
  ] = useState('');

  const [
    suspensionReason,
    setSuspensionReason,
  ] = useState('');

  const logoutInProgress =
    useRef(false);

  // ======================================================
  // CLEAR AUTH STATE
  // ======================================================

  const clearAuthState =
    useCallback(
      ({
        message = '',
        reason = '',
      } = {}) => {
        setAdmin(null);

        if (message) {
          setSessionMessage(
            message
          );
        } else {
          setSessionMessage('');
        }

        if (reason) {
          setSuspensionReason(
            reason
          );
        } else {
          setSuspensionReason('');
        }
      },
      []
    );

  // ======================================================
  // CHECK AUTH STATUS
  // ======================================================

  const checkAuthStatus =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          const response =
            await api.get(
              '/api/auth/me'
            );

          if (
            response.data &&
            response.data.success
          ) {
            const authData =
              response.data.data;

            setAdmin(
              authData
            );

            if (!silent) {
              setSessionMessage('');
              setSuspensionReason('');
            }

            return {
              success: true,

              data:
                authData,

              // ==========================================
              // PASSWORD CHANGE REQUIRED
              // ==========================================

              mustChangePassword:
                !!authData.mustChangePassword,
            };
          }

          clearAuthState();

          return {
            success: false,
          };
        } catch (error) {
          const data =
            error.response?.data;

          const code =
            data?.code;

          // ==============================================
          // SUSPENDED
          // ==============================================

          if (
            code ===
              'ACCOUNT_SUSPENDED' ||
            data?.accountSuspended
          ) {
            clearAuthState({
              message:
                data?.message ||
                'Your shop account has been suspended.',

              reason:
                data?.suspensionReason ||
                '',
            });

            return {
              success: false,

              accountSuspended:
                true,

              suspensionReason:
                data?.suspensionReason ||
                '',
            };
          }

          // ==============================================
          // SUBSCRIPTION EXPIRED
          // ==============================================

          if (
            code ===
            'SUBSCRIPTION_EXPIRED'
          ) {
            clearAuthState({
              message:
                data?.message ||
                'Your subscription has expired.',
            });

            return {
              success: false,

              subscriptionExpired:
                true,
            };
          }

          // ==============================================
          // SESSION REVOKED
          // ==============================================

          if (
            code ===
              'SESSION_REVOKED' ||
            code ===
              'TOKEN_EXPIRED' ||
            code ===
              'INVALID_TOKEN' ||
            code ===
              'AUTH_REQUIRED' ||
            code ===
              'ADMIN_NOT_FOUND' ||
            code ===
              'SHOP_NOT_FOUND'
          ) {
            clearAuthState({
              message:
                data?.message ||
                'Your session has expired. Please log in again.',
            });

            return {
              success: false,
            };
          }

          // ==============================================
          // UNKNOWN ERROR
          // ==============================================

          clearAuthState();

          return {
            success: false,
          };
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      },
      [clearAuthState]
    );

  // ======================================================
  // INITIAL AUTH CHECK
  // ======================================================

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // ======================================================
  // AUTOMATIC SESSION MONITOR
  //
  // Every 10 seconds.
  //
  // This also detects:
  // - Suspension
  // - Session revocation
  // - Subscription expiry
  // - Password reset by Super Admin
  // ======================================================

  useEffect(() => {
    if (!admin) {
      return undefined;
    }

    const interval =
      setInterval(() => {
        checkAuthStatus({
          silent: true,
        });
      }, 10000);

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    admin,
    checkAuthStatus,
  ]);

  // ======================================================
  // LISTEN FOR API AUTH EVENTS
  // ======================================================

  useEffect(() => {
    const handleSessionRevoked =
      (event) => {
        const detail =
          event.detail || {};

        clearAuthState({
          message:
            detail.message ||
            'Your session is no longer valid.',

          reason:
            detail.suspensionReason ||
            '',
        });
      };

    window.addEventListener(
      'shop-auth-revoked',
      handleSessionRevoked
    );

    return () => {
      window.removeEventListener(
        'shop-auth-revoked',
        handleSessionRevoked
      );
    };
  }, [clearAuthState]);

  // ======================================================
  // LOGIN
  // ======================================================

  const login = async (
    email,
    password
  ) => {
    try {
      const response =
        await api.post(
          '/api/auth/login',
          {
            email,
            password,
          }
        );

      // ==================================================
      // SUCCESS
      // ==================================================

      if (
        response.data &&
        response.data.success
      ) {
        const authData =
          response.data.data;

        setAdmin(
          authData
        );

        setSessionMessage('');

        setSuspensionReason('');

        return {
          success: true,

          data:
            authData,

          // ============================================
          // IMPORTANT
          // ============================================

          mustChangePassword:
            !!authData.mustChangePassword,
        };
      }

      // ==================================================
      // FAILURE
      // ==================================================

      return {
        success: false,

        message:
          response.data?.message ||
          'Login failed',

        accountSuspended:
          response.data
            ?.accountSuspended ||
          false,

        suspensionReason:
          response.data
            ?.suspensionReason ||
          '',

        code:
          response.data?.code ||
          '',
      };
    } catch (error) {
      const responseData =
        error.response?.data;

      return {
        success: false,

        message:
          responseData?.message ||
          'Server error, please check credentials.',

        accountSuspended:
          responseData
            ?.accountSuspended ||
          false,

        suspensionReason:
          responseData
            ?.suspensionReason ||
          '',

        code:
          responseData?.code ||
          '',
      };
    }
  };

  // ======================================================
  // CHANGE PASSWORD
  // ======================================================

  const changePassword =
    async (
      newPassword,
      confirmPassword
    ) => {
      try {
        const response =
          await api.patch(
            '/api/auth/change-password',
            {
              newPassword,
              confirmPassword,
            }
          );

        // ================================================
        // SUCCESS
        // ================================================

        if (
          response.data &&
          response.data.success
        ) {
          // ----------------------------------------------
          // Update local state immediately
          // ----------------------------------------------

          setAdmin(
            (currentAdmin) => {
              if (!currentAdmin) {
                return currentAdmin;
              }

              return {
                ...currentAdmin,

                mustChangePassword:
                  false,
              };
            }
          );

          setSessionMessage('');

          setSuspensionReason('');

          // ----------------------------------------------
          // Refresh from backend
          // ----------------------------------------------

          const authCheck =
            await checkAuthStatus({
              silent: true,
            });

          return {
            success: true,

            message:
              response.data.message ||
              'Password changed successfully.',

            data:
              authCheck.data ||
              response.data.data,
          };
        }

        return {
          success: false,

          message:
            response.data?.message ||
            'Unable to change password.',
        };
      } catch (error) {
        const responseData =
          error.response?.data;

        // ==============================================
        // SUSPENDED
        // ==============================================

        if (
          responseData?.code ===
            'ACCOUNT_SUSPENDED' ||
          responseData?.accountSuspended
        ) {
          clearAuthState({
            message:
              responseData?.message ||
              'Your shop account has been suspended.',

            reason:
              responseData?.suspensionReason ||
              '',
          });

          return {
            success: false,

            accountSuspended:
              true,

            suspensionReason:
              responseData?.suspensionReason ||
              '',

            message:
              responseData?.message ||
              'Your shop account has been suspended.',
          };
        }

        // ==============================================
        // SESSION REVOKED
        // ==============================================

        if (
          responseData?.code ===
            'SESSION_REVOKED' ||
          responseData?.code ===
            'TOKEN_EXPIRED' ||
          responseData?.code ===
            'INVALID_TOKEN' ||
          responseData?.code ===
            'AUTH_REQUIRED'
        ) {
          clearAuthState({
            message:
              responseData?.message ||
              'Your session has expired. Please log in again.',
          });

          return {
            success: false,

            code:
              responseData?.code ||
              '',

            message:
              responseData?.message ||
              'Your session has expired. Please log in again.',
          };
        }

        // ==============================================
        // NORMAL ERROR
        // ==============================================

        return {
          success: false,

          message:
            responseData?.message ||
            'Unable to change password. Please try again.',
        };
      }
    };

  // ======================================================
  // LOGOUT
  // ======================================================

  const logout = async () => {
    if (
      logoutInProgress.current
    ) {
      return;
    }

    logoutInProgress.current =
      true;

    try {
      await api.post(
        '/api/auth/logout'
      );
    } catch (error) {
      console.error(
        'Logout error:',
        error
      );
    } finally {
      setAdmin(null);

      setSessionMessage('');

      setSuspensionReason('');

      logoutInProgress.current =
        false;
    }
  };

  // ======================================================
  // CONTEXT
  // ======================================================

  return (
    <AuthContext.Provider
      value={{
        admin,

        loading,

        login,

        logout,

        changePassword,

        checkAuthStatus,

        sessionMessage,

        suspensionReason,

        clearAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ========================================================
// USE AUTH
// ========================================================

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
};