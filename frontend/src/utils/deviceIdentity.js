const DEVICE_ID_STORAGE_KEY = 'shop_management_device_id';

// This identifier belongs to one browser profile (for example, the shop PC
// browser or the owner's mobile browser). It is not personal customer data.
const createDeviceId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

export const getDeviceId = () => {
  if (typeof window === 'undefined') return '';

  let deviceId = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);

  if (!deviceId) {
    deviceId = createDeviceId();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }

  return deviceId;
};
