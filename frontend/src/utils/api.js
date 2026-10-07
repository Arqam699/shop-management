import axios from 'axios';
import { getDeviceId } from './deviceIdentity';
import { addActivityNotification } from './activityNotifications';

// ============================================================
// FAIL FAST IN PRODUCTION
// ============================================================

if (
  import.meta.env.PROD &&
  !import.meta.env.VITE_API_URL
) {
  throw new Error(
    'VITE_API_URL is required in production.'
  );
}

// ============================================================
// API
// ============================================================

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000',

  withCredentials: true,

  timeout: 30000,
});

const getActivityDetails = (response) => {
  const config = response.config || {};
  const method = String(config.method || 'get').toLowerCase();
  if (!['post', 'put', 'patch', 'delete'].includes(method)) return null;

  const url = String(config.url || '').split('?')[0];
  if (/\/(auth|ai|backup|super-admin|reports)(\/|$)/i.test(url)) return null;
  if (response.data?.success === false) return null;

  const parts = url.split('/').filter(Boolean);
  const resource = parts.find((part) =>
    ['sales', 'customers', 'products', 'payments', 'installments', 'expenses', 'returns', 'audits', 'settings'].includes(part)
  );
  if (!resource) return null;
  const isCollectionCreate = method === 'post' && parts[parts.length - 1] === resource;

  const data = response.data?.data || response.data || {};
  const requestData = (() => {
    try {
      return typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    } catch {
      return {};
    }
  })();
  const methodVerb = method === 'post' ? 'added' : method === 'delete' ? 'deleted' : 'updated';
  const routeByResource = {
    sales: '/sales',
    customers: '/customers',
    products: '/inventory',
    payments: '/payments',
    installments: '/installments',
    expenses: '/expenses',
    returns: '/returns',
    audits: '/audits',
    settings: '/settings',
  };

  if (resource === 'sales' && isCollectionCreate) {
    const sale = data.sale || data;
    const product = sale.product && typeof sale.product === 'object' ? sale.product : {};
    const quantity = Number(sale.quantity || requestData.quantity || 0);
    const stockLeft = product.quantity ?? data.stockRemaining;
    const productName = product.name || data.productName || 'Product';
    return {
      title: 'Sale completed',
      action: 'Sale created',
      message: `Sold ${quantity} × ${productName}${stockLeft !== undefined ? `. Remaining stock: ${stockLeft}` : ''}`,
      route: '/sales',
    };
  }

  if (resource === 'products' && isCollectionCreate) {
    const product = data.product || data;
    const productName = product.name || requestData.name || 'Product';
    const quantity = product.quantity ?? requestData.quantity;
    return {
      title: 'Product added',
      action: 'Product added to inventory',
      message: `${productName}${quantity !== undefined ? ` was added with starting stock of ${quantity}` : ' was added to inventory'}`,
      route: '/inventory',
    };
  }

  if (resource === 'customers' && isCollectionCreate) {
    const name = data.fullName || data.customer?.fullName || requestData.fullName || 'Customer';
    return {
      title: 'Customer added',
      action: 'Customer registered',
      message: `${name} was added to the customer list.`,
      route: '/customers',
    };
  }

  if (resource === 'payments' && isCollectionCreate) {
    const amount = data.amount ?? requestData.amount;
    const customer = data.customer?.fullName || requestData.customerName;
    return {
      title: 'Payment recorded',
      action: 'Payment recorded',
      message: `${customer ? `From ${customer} · ` : ''}${amount !== undefined ? `Amount ${amount}` : response.data?.message || 'Payment saved'}`,
      route: '/payments',
    };
  }

  if (resource === 'installments' && parts.includes('pay')) {
    const amount = data.payment?.amount ?? data.amount ?? requestData.amount;
    return {
      title: 'Installment payment recorded',
      action: 'Installment payment recorded',
      message: amount !== undefined ? `Amount ${amount} received` : response.data?.message || 'Payment saved',
      route: '/payments',
    };
  }

  const entity = {
    customers: data.fullName || data.customer?.fullName || requestData.fullName || 'Customer',
    products: data.name || data.product?.name || requestData.name || 'Product',
    payments: data.customer?.fullName ? `Payment from ${data.customer.fullName}` : `Payment of ${data.amount || requestData.amount || ''}`,
    installments: data.customer?.fullName ? `Installment for ${data.customer.fullName}` : 'Installment payment',
    expenses: data.title || data.description || requestData.title || requestData.description || 'Expense',
    returns: data.returnId || data.sale?.saleId || 'Return',
    audits: data.year || requestData.year || 'Audit record',
    settings: 'Shop settings',
    sales: data.sale?.saleId || data.saleId || 'Sale',
  }[resource];
  const resourceLabel = resource.slice(0, -1);
  const action = method === 'delete' ? 'deleted' : method === 'post' ? 'created' : 'updated';

  const title = `${resourceLabel.charAt(0).toUpperCase()}${resourceLabel.slice(1)} ${action}`;
  return {
    title,
    action: response.data?.message || title,
    message: entity || `${entity} ${methodVerb}`,
    route: routeByResource[resource],
  };
};

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

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

// ============================================================
// SESSION REVOKED EVENT
// ============================================================

const notifySessionRevoked =
  (data) => {
    window.dispatchEvent(
      new CustomEvent(
        'shop-auth-revoked',
        {
          detail: data,
        }
      )
    );
  };

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(
  (response) => {
    const activity = getActivityDetails(response);
    if (activity) addActivityNotification(activity);
    return response;
  },

  (error) => {
    const status =
      error.response?.status;

    const data =
      error.response?.data;

    const code =
      data?.code;

    const requestUrl =
      error.config?.url || '';

    const isLoginRequest =
      requestUrl.includes(
        '/auth/login'
      );

    const isBackupRequest =
      requestUrl.includes(
        '/backup/'
      );

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

    const isSuperAdminRequest =
      requestUrl.includes(
        '/api/super-admin'
      );

    if (
      !isLoginRequest &&
      !isSuperAdminRequest &&
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

    // ========================================================
    // BACKUP ERROR LOG
    // ========================================================

    if (isBackupRequest) {
      console.error(
        'Backup API Error:',
        {
          status,
          code,
          message:
            data?.message ||
            error.message,
        }
      );
    }

    return Promise.reject(
      error
    );
  }
);

export default api;
