import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, ShoppingBag, Heart, Minus, Plus, Truck, ShieldCheck, RotateCcw, Check, ChevronRight, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../api';
import toast from 'react-hot-toast';
import ProductCard from '../components/ProductCard';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/products/${id}`);
        const data = res.data;

        // Backend returns { product, related, reviews } for detail endpoint
        if (data.product) {
          setProduct(data.product);
          setRelated(data.related || []);
          setReviews(data.reviews || []);
        } else {
          // Fallback if response is flat product object
          setProduct(data);
          if (data.categoryId) {
            api.get('/products', { params: { category: data.categoryId, limit: 4 } })
              .then(r => {
                const prods = r.data.products || r.data || [];
                setRelated(prods.filter(p => p.id !== data.id).slice(0, 4));
              }).catch(() => {});
          }
          api.get(`/reviews/product/${data.id}`)
            .then(r => setReviews(Array.isArray(r.data) ? r.data : (r.data.reviews || [])))
            .catch(() => {});
        }
        setSelectedImage(0);
        setQuantity(1);
      } catch (err) {
        console.error('Failed to load product:', err);
        toast.error('Product not found');
        navigate('/products');
      }
      setLoading(false);
    };
    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) { toast.error('Please sign in to add items'); navigate('/login'); return; }
    try { await addToCart(product.id, quantity); toast.success('Added to cart!'); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) { toast.error('Please sign in'); return; }
    try {
      if (wishlisted) { await api.delete(`/wishlist/${product.id}`); setWishlisted(false); toast.success('Removed from wishlist'); }
      else { await api.post('/wishlist', { productId: product.id }); setWishlisted(true); toast.success('Added to wishlist!'); }
    } catch { }
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="aspect-square skeleton rounded-3xl" />
        <div className="space-y-4"><div className="h-4 skeleton rounded w-1/4" /><div className="h-8 skeleton rounded w-3/4" /><div className="h-6 skeleton rounded w-1/3" /><div className="h-20 skeleton rounded mt-4" /></div>
      </div>
    </div>
  );

  if (!product) return null;

  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
  const comparePrice = typeof product.comparePrice === 'number' ? product.comparePrice : parseFloat(product.comparePrice) || 0;
  const discount = comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;
  const images = product.images?.length > 0 ? product.images : ['https://via.placeholder.com/400x400?text=No+Image'];
  const stock = product.stock || 0;
  const rating = product.rating || 0;
  const reviewCount = product.reviewCount || 0;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 text-xs text-neutral-400 mb-8">
          <Link to="/" className="hover:text-neutral-600">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/products" className="hover:text-neutral-600">Products</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-neutral-600 truncate max-w-[200px]">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          <div className="space-y-4">
            <div className="relative aspect-square bg-neutral-50 rounded-3xl overflow-hidden border border-neutral-100 group">
              <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-contain p-8 transition-transform duration-500 group-hover:scale-105" />
              {discount > 0 && <span className="absolute top-4 left-4 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full">-{discount}%</span>}
              {product.isNew && <span className="absolute top-4 right-4 px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-full">NEW</span>}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${selectedImage === i ? 'border-brand-500 shadow-lg shadow-brand-500/20' : 'border-neutral-100 hover:border-neutral-300'}`}>
                    <img src={img} alt="" className="w-full h-full object-contain p-2 bg-neutral-50" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              {product.brand && <span className="text-sm font-semibold text-brand-600">{product.brand}</span>}
              {product.sku && <span className="text-xs text-neutral-400">SKU: {product.sku}</span>}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display leading-tight">{product.name}</h1>

            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'}`} />
                ))}
              </div>
              <span className="text-sm font-semibold text-neutral-700">{rating.toFixed(1)}</span>
              <span className="text-sm text-neutral-400">({reviewCount} reviews)</span>
            </div>

            <div className="flex items-baseline gap-3 mt-5">
              <span className="text-3xl font-bold text-neutral-900 font-display">${price.toFixed(2)}</span>
              {discount > 0 && (
                <>
                  <span className="text-lg text-neutral-400 line-through">${comparePrice.toFixed(2)}</span>
                  <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full">Save ${(comparePrice - price).toFixed(0)}</span>
                </>
              )}
            </div>

            {product.description && <p className="text-sm text-neutral-500 leading-relaxed mt-5 line-clamp-3">{product.description}</p>}

            <div className="mt-5">
              {stock > 0 ? (
                <p className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium text-emerald-600">In Stock</span>
                  {stock < 10 && <span className="text-neutral-400">— Only {stock} left</span>}
                </p>
              ) : (
                <p className="text-sm font-medium text-red-500">Out of Stock</p>
              )}
            </div>

            <div className="border-t border-neutral-100 mt-6 pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-11 h-11 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className="w-12 h-11 flex items-center justify-center text-sm font-bold text-neutral-800 border-x border-neutral-200">{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(stock || 99, q + 1))} className="w-11 h-11 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <button onClick={handleAddToCart} disabled={stock === 0} className="flex-1 btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"><ShoppingBag className="w-4 h-4" /> Add to Cart</button>
                <button onClick={handleWishlist} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${wishlisted ? 'border-red-200 bg-red-50 text-red-500' : 'border-neutral-200 text-neutral-400 hover:border-red-200 hover:text-red-400'}`}>
                  <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>
              <button onClick={() => { handleAddToCart(); setTimeout(() => navigate('/checkout'), 300); }} disabled={stock === 0}
                className="w-full mt-3 py-3.5 text-sm font-semibold text-brand-600 border-2 border-brand-200 rounded-2xl hover:bg-brand-50 transition-all disabled:opacity-40">Buy Now</button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-neutral-100">
              {[{ icon: Truck, text: 'Free Delivery', sub: 'Orders $500+' }, { icon: ShieldCheck, text: '2 Yr Warranty', sub: 'Full coverage' }, { icon: RotateCcw, text: 'Easy Returns', sub: '30 day policy' }].map((item, i) => (
                <div key={i} className="text-center p-3 bg-neutral-50 rounded-xl">
                  <item.icon className="w-5 h-5 text-brand-600 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-neutral-700">{item.text}</p>
                  <p className="text-[10px] text-neutral-400">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="flex items-center gap-1 border-b border-neutral-200">
            {['description', 'specifications', 'reviews'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${activeTab === tab ? 'border-brand-600 text-brand-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}>
                {tab} {tab === 'reviews' && `(${reviews.length})`}
              </button>
            ))}
          </div>
          <div className="py-8">
            {activeTab === 'description' && (
              <div className="max-w-3xl">
                <p className="text-sm text-neutral-600 leading-relaxed">{product.description}</p>
                {product.features?.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-neutral-800 mb-3">Key Features</h3>
                    <ul className="space-y-2">
                      {product.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-neutral-600"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> {f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'specifications' && product.specifications && (
              <div className="max-w-2xl">
                <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden">
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div key={key} className="flex">
                      <div className="w-1/3 px-5 py-3.5 bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase">{key.replace(/([A-Z])/g, ' $1')}</div>
                      <div className="flex-1 px-5 py-3.5 text-sm text-neutral-700">{String(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'reviews' && (
              <div className="max-w-3xl">
                {reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
                    <p className="text-sm text-neutral-400">No reviews yet. Be the first to review this product!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((rev, i) => (
                      <div key={rev.id || i} className="bg-neutral-50 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-sm font-bold">{(rev.userName || 'U').charAt(0)}</div>
                            <div>
                              <p className="text-sm font-semibold text-neutral-800">{rev.userName || 'User'}</p>
                              <div className="flex items-center gap-1">{[...Array(5)].map((_, j) => (
                                <Star key={j} className={`w-3 h-3 ${j < (rev.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200'}`} />
                              ))}</div>
                            </div>
                          </div>
                          {rev.createdAt && <span className="text-xs text-neutral-400">{new Date(rev.createdAt).toLocaleDateString()}</span>}
                        </div>
                        {rev.title && <p className="text-sm font-semibold text-neutral-800 mb-1">{rev.title}</p>}
                        <p className="text-sm text-neutral-600">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-8 pt-8 border-t border-neutral-100">
            <h2 className="text-xl font-bold text-neutral-900 font-display mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
