import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, Tag, ArrowRight, ChevronRight, Truck, ShieldCheck, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart, applyCoupon, loading } = useCart();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const handleQuantity = async (productId, newQty) => {
    if (newQty < 1) return;
    try { await updateQuantity(productId, newQty); } catch (err) { toast.error(err.response?.data?.error || 'Failed to update'); }
  };

  const handleRemove = async (productId) => {
    try { await removeFromCart(productId); toast.success('Item removed'); } catch { toast.error('Failed to remove'); }
  };

  const handleCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await applyCoupon(couponCode.trim());
      setAppliedCoupon(res);
      toast.success('Coupon applied!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid coupon');
    }
    setCouponLoading(false);
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-neutral-100 flex items-center justify-center mb-5">
          <ShoppingBag className="w-9 h-9 text-neutral-300" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 font-display">Your cart is empty</h2>
        <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto">Looks like you haven't added anything to your cart yet. Start exploring our products!</p>
        <Link to="/products" className="inline-flex items-center gap-2 btn-primary px-7 py-3.5 text-sm mt-6">
          Start Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-neutral-400 mb-6">
        <Link to="/" className="hover:text-neutral-600">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-neutral-600">Shopping Cart</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display mb-8">
        Shopping Cart <span className="text-neutral-400 text-lg font-normal">({cart.itemCount} items)</span>
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div key={item.productId} className="bg-white rounded-2xl border border-neutral-100 p-4 sm:p-5 flex gap-4 group hover:border-neutral-200 transition-all">
              {/* Image */}
              <Link to={`/products/${item.slug || item.productId}`} className="w-24 h-24 sm:w-28 sm:h-28 bg-neutral-50 rounded-xl overflow-hidden flex-shrink-0">
                <img src={item.image || ''} alt={item.name} className="w-full h-full object-contain p-3" />
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-brand-600">{item.brand}</p>
                    <Link to={`/products/${item.slug || item.productId}`}>
                      <h3 className="text-sm font-semibold text-neutral-800 hover:text-brand-600 transition-colors line-clamp-2">{item.name}</h3>
                    </Link>
                  </div>
                  <button onClick={() => handleRemove(item.productId)}
                    className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-end justify-between mt-3">
                  {/* Quantity */}
                  <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden">
                    <button onClick={() => handleQuantity(item.productId, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-10 h-8 flex items-center justify-center text-xs font-bold text-neutral-800 border-x border-neutral-200">{item.quantity}</span>
                    <button onClick={() => handleQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-base font-bold text-neutral-900 font-display">${((item.price || 0) * item.quantity).toFixed(2)}</p>
                    {item.quantity > 1 && <p className="text-xs text-neutral-400">${(item.price || 0).toFixed(2)} each</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Clear cart */}
          <div className="flex justify-between items-center pt-2">
            <Link to="/products" className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Continue Shopping
            </Link>
            <button onClick={() => { clearCart(); toast.success('Cart cleared'); }}
              className="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Clear Cart
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 sticky top-28">
            <h3 className="text-lg font-bold text-neutral-900 font-display mb-5">Order Summary</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal ({cart.itemCount} items)</span>
                <span className="font-semibold text-neutral-800">${(cart.subtotal || 0).toFixed(2)}</span>
              </div>
              {(cart.discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-semibold">-${(cart.discount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">Shipping</span>
                <span className={`font-semibold ${cart.shipping === 0 ? 'text-emerald-600' : 'text-neutral-800'}`}>
                  {cart.shipping === 0 ? 'Free' : `$${(cart.shipping || 0).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Estimated Tax</span>
                <span className="font-semibold text-neutral-800">${(cart.tax || 0).toFixed(2)}</span>
              </div>

              <div className="border-t border-neutral-100 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-base font-bold text-neutral-900">Total</span>
                  <span className="text-xl font-bold text-neutral-900 font-display">${(cart.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Coupon */}
            <div className="mt-5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Coupon code"
                    className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10" />
                </div>
                <button onClick={handleCoupon} disabled={couponLoading}
                  className="px-4 py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-all disabled:opacity-50">
                  Apply
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-2">Try "WELCOME10" for 10% off</p>
            </div>

            {/* Checkout button */}
            <button onClick={() => navigate('/checkout')}
              className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2 mt-5">
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>

            {/* Trust badges */}
            <div className="mt-5 pt-5 border-t border-neutral-100 space-y-3">
              {[
                { icon: Truck, text: 'Free shipping on orders over $500' },
                { icon: ShieldCheck, text: 'Secure checkout & data protection' },
                { icon: Package, text: '30-day easy return policy' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-neutral-400">
                  <item.icon className="w-4 h-4 text-neutral-300 flex-shrink-0" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
