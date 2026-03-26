import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Search, ShoppingBag, User, Heart, Menu, X, Zap, ChevronDown, LogOut, Package, Settings } from 'lucide-react';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setUserMenu(false); }, [location]);

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenu(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSearch = (e) => { e.preventDefault(); if (search.trim()) { navigate(`/products?search=${encodeURIComponent(search.trim())}`); setSearch(''); } };

  const isHome = location.pathname === '/';

  return (
    <>
      <header className={`sticky top-0 z-[60] transition-all duration-300 ${scrolled ? 'bg-white shadow-sm shadow-neutral-200/50' : isHome ? 'bg-transparent' : 'bg-white'}`}>
        {/* Top bar */}
        <div className={`text-center py-2 text-xs font-medium tracking-wide transition-all ${scrolled ? 'h-0 overflow-hidden py-0 opacity-0' : 'bg-neutral-900 text-neutral-300'}`}>
          Free Shipping on orders over $500 — Use code <span className="text-brand-400 font-bold">WELCOME10</span> for 10% off
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-all">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xl font-bold font-display tracking-tight transition-colors ${scrolled || !isHome ? 'text-neutral-900' : 'text-neutral-900'}`}>
                Tech<span className="text-brand-600">Market</span>
              </span>
            </Link>

            {/* Search bar - desktop */}
            <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-500 transition-colors" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search for laptops, phones, accessories..."
                  className="w-full pl-11 pr-4 py-3 bg-neutral-100 border border-transparent rounded-2xl text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-500/10 transition-all" />
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {isAuthenticated && (
                <Link to="/wishlist" className="relative p-2.5 rounded-xl text-neutral-500 hover:text-brand-600 hover:bg-brand-50 transition-all hidden sm:flex">
                  <Heart className="w-5 h-5" />
                </Link>
              )}

              <Link to="/cart" className="relative p-2.5 rounded-xl text-neutral-500 hover:text-brand-600 hover:bg-brand-50 transition-all">
                <ShoppingBag className="w-5 h-5" />
                {cart.itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 animate-scale-in">
                    {cart.itemCount}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setUserMenu(!userMenu)}
                    className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-xl hover:bg-neutral-100 transition-all">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-neutral-700">{user?.firstName}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform hidden sm:block ${userMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-neutral-200/50 border border-neutral-100 py-2 animate-scale-in origin-top-right z-50">
                      <div className="px-4 py-3 border-b border-neutral-100">
                        <p className="text-sm font-semibold text-neutral-800">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{user?.email}</p>
                      </div>
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 transition-colors"><User className="w-4 h-4" /> My Profile</Link>
                      <Link to="/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 transition-colors"><Package className="w-4 h-4" /> My Orders</Link>
                      <Link to="/wishlist" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 transition-colors"><Heart className="w-4 h-4" /> Wishlist</Link>
                      <div className="border-t border-neutral-100 mt-1 pt-1">
                        <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"><LogOut className="w-4 h-4" /> Sign Out</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-all">
                  <User className="w-4 h-4" /> <span className="hidden sm:inline">Sign In</span>
                </Link>
              )}

              <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2.5 rounded-xl text-neutral-500 hover:bg-neutral-100">
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category nav - desktop */}
          <nav className="hidden lg:flex items-center gap-1 pb-3 -mt-1">
            {[
              { path: '/products', label: 'All Products' },
              { path: '/products?category=cat_001', label: 'Smartphones' },
              { path: '/products?category=cat_002', label: 'Laptops' },
              { path: '/products?category=cat_003', label: 'Tablets' },
              { path: '/products?category=cat_004', label: 'Headphones' },
              { path: '/products?category=cat_005', label: 'Smartwatches' },
              { path: '/products?category=cat_007', label: 'Gaming' },
              { path: '/products?category=cat_008', label: 'Accessories' },
            ].map(item => (
              <Link key={item.path} to={item.path}
                className="px-3 py-1.5 text-[13px] font-medium text-neutral-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <span className="text-lg font-bold font-display">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl hover:bg-neutral-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSearch} className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
            </form>
            <nav className="px-3 space-y-0.5">
              {['All Products','Smartphones','Laptops','Tablets','Headphones','Gaming','Accessories'].map((item, i) => (
                <Link key={item} to={i === 0 ? '/products' : `/products?category=cat_00${i}`} className="block px-4 py-3 text-sm font-medium text-neutral-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all">{item}</Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
