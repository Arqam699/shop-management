
import axios from 'axios';
import { getDeviceId } from './deviceIdentity';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

// Send the stable browser/device identity with login and normal API requests.
// The backend uses it only to enforce the two-device rule for a shop.
api.interceptors.request.use((config) => {
  const deviceId = getDeviceId();

  if (deviceId) {
    config.headers['X-Device-Id'] = deviceId;
  }

  return config;
});

export default api;
