import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import { Menu, Zap } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Customers from './pages/Customers';
import Categories from './pages/Categories';
import Coupons from './pages/Coupons';
import Settings from './pages/Settings';

const Protected = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-surface-900 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"/></div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    if (sidebarOpen) document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
    if (sidebarOpen) el.style.overflow = 'hidden';
    return () => { el.style.overflow = prev; };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-surface-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface-950/70 backdrop-blur border-b border-surface-700/50 z-30">
        <div className="h-full px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2.5 rounded-xl text-surface-200 hover:bg-surface-800/60 transition-all"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">TechMarket</p>
              <p className="text-[11px] text-surface-400 font-medium tracking-wider uppercase">Admin</p>
            </div>
          </div>

          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 overflow-auto">
        {children}
      </main>
    </div>
  );
};

const P = ({ children }) => <Protected><Layout>{children}</Layout></Protected>;

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background:'#1e293b', color:'#e2e8f0', border:'1px solid #334155', borderRadius:'12px', fontSize:'14px' } }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<P><Dashboard /></P>} />
        <Route path="/products" element={<P><Products /></P>} />
        <Route path="/products/new" element={<P><ProductForm /></P>} />
        <Route path="/products/edit/:id" element={<P><ProductForm /></P>} />
        <Route path="/orders" element={<P><Orders /></P>} />
        <Route path="/orders/:id" element={<P><OrderDetail /></P>} />
        <Route path="/customers" element={<P><Customers /></P>} />
        <Route path="/categories" element={<P><Categories /></P>} />
        <Route path="/coupons" element={<P><Coupons /></P>} />
        <Route path="/settings" element={<P><Settings /></P>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
