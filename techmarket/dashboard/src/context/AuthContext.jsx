import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (token) { api.defaults.headers.common['Authorization'] = `Bearer ${token}`; fetchUser(); } else setLoading(false); }, [token]);

  const fetchUser = async () => {
    try { const r = await api.get('/auth/me'); if (r.data.role !== 'admin') { logout(); return; } setUser(r.data); } catch { logout(); } finally { setLoading(false); }
  };

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    if (r.data.user.role !== 'admin') throw new Error('Admin only.');
    localStorage.setItem('admin_token', r.data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`;
    setToken(r.data.token); setUser(r.data.user);
  };

  const logout = () => { localStorage.removeItem('admin_token'); delete api.defaults.headers.common['Authorization']; setToken(null); setUser(null); };

  return <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!user }}>{children}</AuthContext.Provider>;
};
