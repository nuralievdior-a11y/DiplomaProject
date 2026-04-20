import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:5000/api', headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use(c => { const t = localStorage.getItem('admin_token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use(r => r, err => { if (err.response?.status === 401) { localStorage.removeItem('admin_token'); window.location.href = '/login'; } return Promise.reject(err); });
export default api;
