import axios from 'axios';

const normalizeApiOrigin = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

const DEBUG_API = import.meta.env.VITE_DEBUG_API === 'true';
const DEFAULT_API_ORIGIN = 'https://diplomaproject-1-dtsp.onrender.com';

export const API_URL = normalizeApiOrigin(import.meta.env.VITE_API_URL || DEFAULT_API_ORIGIN);
export const API_BASE_URL = `${API_URL}/api`;

if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
  console.warn(`[TechMarket Dashboard] VITE_API_URL is not set. Falling back to default API: ${DEFAULT_API_ORIGIN}`);
}

if (DEBUG_API && API_URL) {
  console.log('[TechMarket Dashboard] API_BASE_URL:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(c => { const t = localStorage.getItem('admin_token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.request.use((c) => {
  if (DEBUG_API && API_URL) {
    const url = new URL(c.url || '', c.baseURL);
    console.log('[TechMarket Dashboard] ->', (c.method || 'GET').toUpperCase(), url.toString());
  }
  return c;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (DEBUG_API && API_URL) {
      const baseURL = err.config?.baseURL || API_BASE_URL;
      const url = new URL(err.config?.url || '', baseURL);
      const status = err.response?.status;
      console.warn('[TechMarket Dashboard] <-', status || 'ERR', url.toString());
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
export default api;
