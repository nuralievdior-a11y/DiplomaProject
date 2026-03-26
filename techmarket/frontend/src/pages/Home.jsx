import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, Headphones, RotateCcw, Zap, ChevronRight, Star, Sparkles, Timer, TrendingUp } from 'lucide-react';
import api from '../api';
import ProductCard from '../components/ProductCard';

const heroSlides = [
  { title: 'Future of Tech,', highlight: 'Delivered Today', subtitle: 'Discover the latest smartphones, laptops, and gadgets with free express delivery on orders over $500.', cta: 'Shop Now', link: '/products', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80', badge: 'New Arrivals 2025' },
  { title: 'Premium Sound,', highlight: 'Pure Experience', subtitle: 'Immerse yourself in crystal-clear audio with our curated headphone collection from top brands.', cta: 'Explore Audio', link: '/products?category=cat_004', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80', badge: 'Best Sellers' },
  { title: 'Game Without', highlight: 'Limits', subtitle: 'Level up your setup with cutting-edge gaming gear — keyboards, monitors, consoles and more.', cta: 'Shop Gaming', link: '/products?category=cat_007', image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=600&q=80', badge: 'Gaming Zone' }
];

const features = [
  { icon: Truck, title: 'Free Delivery', desc: 'On orders over $500' },
  { icon: ShieldCheck, title: '2 Year Warranty', desc: 'Full coverage' },
  { icon: Headphones, title: '24/7 Support', desc: 'Expert assistance' },
  { icon: RotateCcw, title: 'Easy Returns', desc: '30 day returns' }
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [deals, setDeals] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [featRes, dealsRes, newRes, catRes] = await Promise.all([
          api.get('/products/featured').catch(() => ({ data: [] })),
          api.get('/products/deals').catch(() => ({ data: [] })),
          api.get('/products/new').catch(() => ({ data: [] })),
          api.get('/categories').catch(() => ({ data: [] }))
        ]);
        setFeatured(featRes.data.slice(0, 8));
        setDeals(dealsRes.data.slice(0, 4));
        setNewArrivals(newRes.data.slice(0, 8));
        setCategories(catRes.data);
      } catch { }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setSlide(s => (s + 1) % heroSlides.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const current = heroSlides[slide];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative mesh-gradient noise overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-10 items-center min-h-[400px] lg:min-h-[480px]">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm border border-brand-100 rounded-full text-xs font-semibold text-brand-700 mb-6 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> {current.badge}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-neutral-900 leading-[1.1] tracking-tight">
                {current.title}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-accent-600">
                  {current.highlight}
                </span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-neutral-500 max-w-md leading-relaxed">{current.subtitle}</p>
              <div className="flex flex-wrap items-center gap-3 mt-8">
                <Link to={current.link} className="btn-primary px-7 py-3.5 text-sm flex items-center gap-2">
                  {current.cta} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/products" className="btn-outline px-7 py-3.5 text-sm">
                  View All Products
                </Link>
              </div>

              {/* Slide indicators */}
              <div className="flex items-center gap-2 mt-10">
                {heroSlides.map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-500 ${i === slide ? 'w-8 bg-brand-600' : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'}`} />
                ))}
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-72 h-72 sm:w-96 sm:h-96">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-200/40 to-accent-200/40 rounded-[3rem] rotate-6" />
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-[3rem] shadow-2xl shadow-brand-500/10 overflow-hidden">
                  <img src={current.image} alt="" className="w-full h-full object-cover p-8 transition-all duration-700" />
                </div>
                {/* Floating badges */}
                <div className="absolute -bottom-3 -left-3 px-4 py-2.5 bg-white rounded-2xl shadow-xl shadow-neutral-200/50 border border-neutral-100 flex items-center gap-2 animate-float">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><Truck className="w-4 h-4 text-emerald-600" /></div>
                  <div><p className="text-xs font-bold text-neutral-800">Free Shipping</p><p className="text-[10px] text-neutral-400">Orders $500+</p></div>
                </div>
                <div className="absolute -top-3 -right-3 px-4 py-2.5 bg-white rounded-2xl shadow-xl shadow-neutral-200/50 border border-neutral-100 flex items-center gap-2" style={{ animation: 'float 3s ease-in-out infinite .5s' }}>
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><Star className="w-4 h-4 text-amber-600 fill-amber-600" /></div>
                  <div><p className="text-xs font-bold text-neutral-800">Top Rated</p><p className="text-[10px] text-neutral-400">4.8+ Stars</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="border-b border-neutral-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800">{f.title}</p>
                  <p className="text-xs text-neutral-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display">Shop by Category</h2>
            <p className="text-neutral-500 mt-1 text-sm">Find exactly what you're looking for</p>
          </div>
          <Link to="/products" state={{ scrollToTop: true }} className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
            All Categories <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <Link key={cat.id} to={`/products?category=${cat.id}`} state={{ scrollToTop: true }}
              className={`group relative bg-white rounded-2xl border border-neutral-100 p-6 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300 animate-fade-up stagger-${Math.min(i + 1, 4)}`}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">{cat.icon || '📱'}</span>
              </div>
              <h3 className="font-semibold text-neutral-800 text-sm group-hover:text-brand-600 transition-colors">{cat.name}</h3>
              <p className="text-xs text-neutral-400 mt-1">{cat.productCount || 0} products</p>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-brand-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Trending</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display">Featured Products</h2>
            </div>
            <Link to="/products" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-3xl overflow-hidden">
                  <div className="aspect-square skeleton" />
                  <div className="p-4 space-y-2"><div className="h-3 skeleton rounded w-1/3" /><div className="h-4 skeleton rounded w-2/3" /><div className="h-5 skeleton rounded w-1/4 mt-3" /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Deals Banner */}
      {deals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 p-8 sm:p-12">
            <div className="absolute inset-0 opacity-10 mesh-gradient" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Timer className="w-5 h-5 text-red-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">Limited Time</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-display mb-2">Hot Deals & Offers</h2>
              <p className="text-neutral-400 text-sm mb-8 max-w-md">Don't miss out on incredible savings. These deals won't last forever.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {deals.map(p => {
                  const pPrice = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
                  const pCompare = typeof p.comparePrice === 'number' ? p.comparePrice : parseFloat(p.comparePrice) || 0;
                  return (
                  <Link key={p.id} to={`/products/${p.slug || p.id}`}
                    className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-white/20 transition-all">
                    <div className="aspect-square bg-white/5 rounded-xl overflow-hidden mb-3 p-4">
                      <img src={p.images?.[0] || ''} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                    </div>
                    <p className="text-xs text-brand-400 font-medium">{p.brand}</p>
                    <h3 className="text-sm font-semibold text-white line-clamp-2 mt-1">{p.name}</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-lg font-bold text-white font-display">${pPrice.toFixed(2)}</span>
                      {pCompare > pPrice && <span className="text-sm text-neutral-500 line-through">${pCompare.toFixed(2)}</span>}
                    </div>
                    {pCompare > pPrice && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                        Save ${(pCompare - pPrice).toFixed(0)}
                      </span>
                    )}
                  </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="bg-neutral-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-accent-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-accent-600">Just In</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display">New Arrivals</h2>
              </div>
              <Link to="/products" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
                See More <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {newArrivals.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 font-display">
            Ready to Upgrade Your Tech?
          </h2>
          <p className="text-neutral-500 mt-4 text-base leading-relaxed">
            Join thousands of satisfied customers who trust TechMarket for their electronics needs. Fast delivery, competitive prices, and exceptional service.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link to="/products" className="btn-primary px-8 py-4 text-sm flex items-center gap-2">
              Start Shopping <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/register" className="btn-outline px-8 py-4 text-sm">
              Create Account
            </Link>
          </div>
          <div className="flex items-center justify-center gap-8 mt-10 text-sm text-neutral-400">
            <span className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> 4.9 Rating</span>
            <span>10K+ Products</span>
            <span>50K+ Customers</span>
          </div>
        </div>
      </section>
    </div>
  );
}
