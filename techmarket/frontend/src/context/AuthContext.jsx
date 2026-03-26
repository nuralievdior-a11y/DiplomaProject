import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) { api.get('/auth/me').then(r => { setUser(r.data); localStorage.setItem('user', JSON.stringify(r.data)); }).catch(() => { logout(); }).finally(() => setLoading(false)); }
    else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', r.data.token);
    localStorage.setItem('user', JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (data) => {
    const r = await api.post('/auth/register', data);
    localStorage.setItem('token', r.data.token);
    localStorage.setItem('user', JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); };
  const updateUser = (data) => { setUser(data); localStorage.setItem('user', JSON.stringify(data)); };

  return <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAuthenticated: !!user }}>{children}</AuthContext.Provider>;
};
