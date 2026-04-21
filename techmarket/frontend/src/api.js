import axios from 'axios';

const normalizeApiOrigin = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

export const API_URL = normalizeApiOrigin(import.meta.env.VITE_API_URL);
export const API_BASE_URL = API_URL ? `${API_URL}/api` : '/api';

if (!API_URL && import.meta.env.PROD) {
  console.warn('[TechMarket] VITE_API_URL is not set. Set it in Vercel env vars to enable login/API calls.');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(c => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use(r => r, err => { if (err.response?.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); } return Promise.reject(err); });
export default api;
