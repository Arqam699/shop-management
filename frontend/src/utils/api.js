import axios from 'axios';
import { getDeviceId } from './deviceIdentity';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000',

  withCredentials: true,
});

// ========================================================
// DEVICE ID
// ========================================================

api.interceptors.request.use(
  (config) => {
    const deviceId =
      getDeviceId();

    if (deviceId) {
      config.headers =
        config.headers || {};

      config.headers[
        'X-Device-Id'
      ] = deviceId;
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

// ========================================================
// SESSION REVOKED EVENT
// ========================================================

const notifySessionRevoked = (
  data
) => {
  window.dispatchEvent(
    new CustomEvent(
      'shop-auth-revoked',
      {
        detail: data,
      }
    )
  );
};

// ========================================================
// RESPONSE INTERCEPTOR
// ========================================================

api.interceptors.response.use(
  (response) =>
    response,

  (error) => {
    const status =
      error.response?.status;

    const data =
      error.response?.data;

    const code =
      data?.code;

    const requestUrl =
      error.config?.url ||
      '';

    const isLoginRequest =
      requestUrl.includes(
        '/auth/login'
      );

    // ====================================================
    // AUTH FAILURE CODES
    // ====================================================

    const shouldLogout =
      code ===
        'ACCOUNT_SUSPENDED' ||
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
        'SHOP_NOT_FOUND' ||
      code ===
        'SUBSCRIPTION_EXPIRED';

    // ====================================================
    // TRIGGER GLOBAL LOGOUT EVENT
    // ====================================================

    if (
      !isLoginRequest &&
      (
        shouldLogout ||
        status === 401 ||
        status === 403
      )
    ) {
      notifySessionRevoked({
        code:
          code ||
          (
            status === 403
              ? 'ACCOUNT_ACCESS_DENIED'
              : 'SESSION_REVOKED'
          ),

        message:
          data?.message ||
          'Your session is no longer valid.',

        accountSuspended:
          data?.accountSuspended ||
          code ===
            'ACCOUNT_SUSPENDED',

        suspensionReason:
          data?.suspensionReason ||
          '',
      });
    }

    return Promise.reject(
      error
    );
  }
);

export default api;