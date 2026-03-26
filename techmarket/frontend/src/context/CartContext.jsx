import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, itemCount: 0 });
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) { setCart({ items: [], subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, itemCount: 0 }); return; }
    setLoading(true);
    try { const r = await api.get('/cart'); setCart({ discount: 0, ...r.data }); } catch { } finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    if (!isAuthenticated) throw new Error('Please login first');
    const r = await api.post('/cart/add', { productId, quantity });
    setCart(r.data.cart);
    return r.data;
  };

  const updateQuantity = async (productId, quantity) => {
    const r = await api.put('/cart/update', { productId, quantity });
    setCart(r.data.cart);
  };

  const removeFromCart = async (productId) => {
    const r = await api.delete(`/cart/remove/${productId}`);
    setCart(r.data.cart);
  };

  const clearCart = async () => {
    await api.delete('/cart/clear');
    setCart({ items: [], subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, itemCount: 0 });
  };

  const applyCoupon = async (code) => {
    const r = await api.post('/cart/coupon', { code });
    return r.data;
  };

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateQuantity, removeFromCart, clearCart, applyCoupon, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};
