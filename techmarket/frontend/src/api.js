import axios from 'axios';

const DEFAULT_API_ORIGIN = 'https://diplomaproject-1-dtsp.onrender.com';

const normalizeApiOrigin = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

const ENV_API_URL = import.meta.env.VITE_API_URL;
const DEBUG_API = import.meta.env.VITE_DEBUG_API === 'true';

export const API_URL = normalizeApiOrigin(ENV_API_URL || DEFAULT_API_ORIGIN);
export const API_BASE_URL = `${API_URL}/api`;

if (!ENV_API_URL && import.meta.env.PROD) {
  console.warn(`[TechMarket] VITE_API_URL is not set. Falling back to default API: ${DEFAULT_API_ORIGIN}`);
}

if (DEBUG_API) {
  console.log('[TechMarket] API_BASE_URL:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(c => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  if (DEBUG_API) {
    const url = new URL(c.url || '', c.baseURL);
    console.log('[TechMarket] ->', (c.method || 'GET').toUpperCase(), url.toString());
  }
  return c;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (DEBUG_API) {
      const baseURL = err.config?.baseURL || API_BASE_URL;
      const url = new URL(err.config?.url || '', baseURL);
      const status = err.response?.status;
      console.warn('[TechMarket] <-', status || 'ERR', url.toString());
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(err);
  }
);
export default api;
