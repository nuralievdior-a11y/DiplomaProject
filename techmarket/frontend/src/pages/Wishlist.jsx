import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ChevronRight, Trash2, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../api';
import toast from 'react-hot-toast';
import ProductCard from '../components/ProductCard';

export default function Wishlist() {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    api.get('/wishlist').then(r => setItems(r.data.items || r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleRemove = async (productId) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      setItems(i => i.filter(item => (item.productId || item.id) !== productId));
      toast.success('Removed from wishlist');
    } catch { toast.error('Failed to remove'); }
  };

  const handleMoveToCart = async (item) => {
    try {
      await addToCart(item.productId || item.id);
      await api.delete(`/wishlist/${item.productId || item.id}`);
      setItems(i => i.filter(x => (x.productId || x.id) !== (item.productId || item.id)));
      toast.success('Moved to cart!');
    } catch { toast.error('Failed'); }
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-3xl overflow-hidden border border-neutral-100">
            <div className="aspect-square skeleton" />
            <div className="p-4 space-y-2"><div className="h-3 skeleton rounded w-1/3" /><div className="h-4 skeleton rounded w-2/3" /></div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-xs text-neutral-400 mb-6">
        <Link to="/" className="hover:text-neutral-600">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-neutral-600">Wishlist</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display mb-8">
        My Wishlist <span className="text-neutral-400 text-lg font-normal">({items.length} items)</span>
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-neutral-100 flex items-center justify-center mb-5">
            <Heart className="w-9 h-9 text-neutral-300" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 font-display">Your wishlist is empty</h2>
          <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto">Save items you love and come back to them later</p>
          <Link to="/products" className="inline-flex items-center gap-2 btn-primary px-6 py-3 text-sm mt-6">
            Explore Products <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map(item => {
            const product = item.product || item;
            return (
              <div key={item.productId || item.id} className="bg-white rounded-3xl border border-neutral-100 overflow-hidden group hover:border-brand-100 hover:shadow-lg hover:shadow-brand-500/5 transition-all">
                <Link to={`/products/${product.slug || product.id || item.productId}`} className="block relative aspect-square bg-neutral-50 p-6">
                  <img src={product.images?.[0] || product.image || ''} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                </Link>
                <div className="p-4">
                  <p className="text-xs font-medium text-brand-600">{product.brand}</p>
                  <h3 className="text-sm font-semibold text-neutral-800 line-clamp-2 mt-1 min-h-[40px]">{product.name}</h3>
                  <p className="text-lg font-bold text-neutral-900 font-display mt-2">${(product.price || 0).toFixed(2)}</p>

                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleMoveToCart(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-brand-600 transition-colors">
                      <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
                    </button>
                    <button onClick={() => handleRemove(item.productId || item.id)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
