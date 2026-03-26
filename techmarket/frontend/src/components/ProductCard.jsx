import { Link } from 'react-router-dom';
import { Star, ShoppingBag, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

export default function ProductCard({ product, onWishlist }) {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
  const comparePrice = typeof product.comparePrice === 'number' ? product.comparePrice : parseFloat(product.comparePrice) || 0;
  const discount = comparePrice > price
    ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  const handleAdd = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated) { toast.error('Please sign in to add items'); return; }
    try { await addToCart(product.id); toast.success('Added to cart!'); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <Link to={`/products/${product.slug || product.id}`} className="product-card group block bg-white rounded-3xl overflow-hidden border border-neutral-100 hover:border-brand-100">
      {/* Image */}
      <div className="relative aspect-square bg-neutral-50 overflow-hidden p-6">
        <img src={product.images?.[0] || ''} alt={product.name} className="product-img w-full h-full object-contain" loading="lazy" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discount > 0 && <span className="px-2.5 py-1 bg-red-500 text-white text-[11px] font-bold rounded-full shadow-sm">-{discount}%</span>}
          {product.isNew && <span className="px-2.5 py-1 bg-brand-600 text-white text-[11px] font-bold rounded-full shadow-sm">NEW</span>}
        </div>

        {/* Quick actions - appear on hover */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          {onWishlist && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWishlist(product.id); }}
              className="w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center text-neutral-400 hover:text-red-500 transition-colors">
              <Heart className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Add to cart button - appears on hover */}
        <div className="absolute bottom-3 inset-x-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <button onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-lg">
            <ShoppingBag className="w-4 h-4" /> Add to Cart
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 pt-3">
        <p className="text-xs font-medium text-brand-600 mb-1">{product.brand}</p>
        <h3 className="text-sm font-semibold text-neutral-800 leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors min-h-[40px]">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'}`} />
            ))}
          </div>
          <span className="text-xs text-neutral-400">({product.reviewCount || 0})</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-2.5">
          <span className="text-lg font-bold text-neutral-900 font-display">${price.toFixed(2)}</span>
          {discount > 0 && <span className="text-sm text-neutral-400 line-through">${comparePrice.toFixed(2)}</span>}
        </div>

        {/* Stock indicator */}
        {product.stock < 10 && product.stock > 0 && (
          <p className="text-xs text-amber-600 font-medium mt-2">Only {product.stock} left in stock</p>
        )}
      </div>
    </Link>
  );
}
