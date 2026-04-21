import axios from 'axios';

const DEFAULT_API_ORIGIN = 'https://diplomaproject-1-dtsp.onrender.com';

const normalizeApiOrigin = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

const ENV_API_URL = import.meta.env.VITE_API_URL;
console.log('API_URL:', ENV_API_URL);

export const API_URL = normalizeApiOrigin(ENV_API_URL || DEFAULT_API_ORIGIN);
export const API_BASE_URL = `${API_URL}/api`;

if (!ENV_API_URL && import.meta.env.PROD) {
  console.warn(`[TechMarket] VITE_API_URL is not set. Falling back to default API: ${DEFAULT_API_ORIGIN}`);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(c => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use(r => r, err => { if (err.response?.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); } return Promise.reject(err); });
export default api;
