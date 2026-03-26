import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
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

const Layout = ({ children }) => (
  <div className="flex min-h-screen bg-surface-900">
    <Sidebar />
    <main className="flex-1 ml-64 p-8 overflow-auto">{children}</main>
  </div>
);

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
