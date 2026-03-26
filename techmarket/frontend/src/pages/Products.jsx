import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown, Grid3X3, LayoutList, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api';
import ProductCard from '../components/ProductCard';

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Most Popular' },
];

const priceRanges = [
  { label: 'Under $100', min: 0, max: 100 },
  { label: '$100 - $500', min: 100, max: 500 },
  { label: '$500 - $1000', min: 500, max: 1000 },
  { label: '$1000 - $2000', min: 1000, max: 2000 },
  { label: 'Over $2000', min: 2000, max: 99999 },
];

export default function Products() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const didInitialScrollRef = useRef(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [grid, setGrid] = useState(4);

  useLayoutEffect(() => {
    if (didInitialScrollRef.current) return;
    if (location.state?.scrollToTop) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    didInitialScrollRef.current = true;
  }, []);

  const searchQ = params.get('search') || '';
  const categoryQ = params.get('category') || '';
  const brandQ = params.get('brand') || '';
  const sortQ = params.get('sort') || 'newest';
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const pageQ = parseInt(params.get('page') || '1');

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = { page: pageQ, limit: 12 };
        // Map sort options to backend params
        if (sortQ === 'price_asc') { q.sortBy = 'price'; q.sortOrder = 'asc'; }
        else if (sortQ === 'price_desc') { q.sortBy = 'price'; q.sortOrder = 'desc'; }
        else if (sortQ === 'rating') { q.sortBy = 'rating'; q.sortOrder = 'desc'; }
        else if (sortQ === 'popular') { q.sortBy = 'rating'; q.sortOrder = 'desc'; }
        // newest = default (sorts by createdAt desc in backend)
        if (searchQ) q.search = searchQ;
        if (categoryQ) q.category = categoryQ;
        if (brandQ) q.brand = brandQ;
        if (minPrice) q.minPrice = minPrice;
        if (maxPrice) q.maxPrice = maxPrice;
        const res = await api.get('/products', { params: q });
        setProducts(res.data.products || res.data);
        setPagination(res.data.pagination || {});
        // Extract unique brands
        const allBrands = (res.data.products || res.data).map(p => p.brand).filter(Boolean);
        setBrands([...new Set(allBrands)]);
      } catch { }
      setLoading(false);
    };
    fetchProducts();
  }, [searchQ, categoryQ, brandQ, sortQ, minPrice, maxPrice, pageQ]);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(params);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    if (key !== 'page') newParams.delete('page');
    setParams(newParams);
  };

  const clearFilters = () => setParams({});

  const activeFilters = [categoryQ, brandQ, minPrice || maxPrice ? 'price' : '', searchQ].filter(Boolean).length;

  const selectedCategory = categories.find(c => c.id === categoryQ);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb & Title */}
      <div className="mb-6">
        <div className="text-xs text-neutral-400 mb-2">
          Home / <span className="text-neutral-600">{selectedCategory?.name || 'All Products'}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display">
              {searchQ ? `Results for "${searchQ}"` : selectedCategory?.name || 'All Products'}
            </h1>
            <p className="text-sm text-neutral-400 mt-1">{pagination.total || products.length} products found</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Grid toggle */}
            <div className="hidden md:flex items-center gap-1 p-1 bg-neutral-100 rounded-xl">
              {[3, 4].map(g => (
                <button key={g} onClick={() => setGrid(g)}
                  className={`p-2 rounded-lg transition-all ${grid === g ? 'bg-white shadow-sm text-neutral-800' : 'text-neutral-400 hover:text-neutral-600'}`}>
                  {g === 3 ? <LayoutList className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="relative">
              <select value={sortQ} onChange={e => updateParam('sort', e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 cursor-pointer focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10">
                {sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>

            {/* Filter toggle (mobile) */}
            <button onClick={() => setFiltersOpen(!filtersOpen)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilters > 0 && <span className="w-5 h-5 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilters}</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white lg:bg-transparent p-6 lg:p-0 overflow-y-auto lg:overflow-visible transform transition-transform lg:transform-none lg:flex-shrink-0 ${filtersOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          {/* Mobile header */}
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h3 className="text-lg font-bold font-display">Filters</h3>
            <button onClick={() => setFiltersOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl"><X className="w-5 h-5" /></button>
          </div>

          {activeFilters > 0 && (
            <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-600 font-medium mb-5 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear all filters
            </button>
          )}

          {/* Search */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type="text" value={searchQ} onChange={e => updateParam('search', e.target.value)} placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10" />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 block">Category</label>
            <div className="space-y-1">
              <button onClick={() => updateParam('category', '')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${!categoryQ ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                All Categories
              </button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => updateParam('category', cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center justify-between ${categoryQ === cat.id ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                  <span className="flex items-center gap-2">{cat.icon && <span>{cat.icon}</span>} {cat.name}</span>
                  <span className="text-xs text-neutral-400">{cat.productCount || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 block">Price Range</label>
            <div className="space-y-1">
              <button onClick={() => { updateParam('minPrice', ''); updateParam('maxPrice', ''); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${!minPrice && !maxPrice ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                All Prices
              </button>
              {priceRanges.map(range => {
                const active = minPrice === String(range.min) && maxPrice === String(range.max);
                return (
                  <button key={range.label} onClick={() => {
                    const np = new URLSearchParams(params);
                    np.set('minPrice', range.min); np.set('maxPrice', range.max); np.delete('page');
                    setParams(np);
                  }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${active ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brands */}
          {brands.length > 0 && (
            <div className="mb-6">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 block">Brand</label>
              <div className="space-y-1">
                <button onClick={() => updateParam('brand', '')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${!brandQ ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                  All Brands
                </button>
                {brands.map(b => (
                  <button key={b} onClick={() => updateParam('brand', b)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${brandQ === b ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Filter overlay (mobile) */}
        {filtersOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setFiltersOpen(false)} />}

        {/* Product Grid */}
        <div className="flex-1 min-w-0">
          {/* Active filter chips */}
          {activeFilters > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {searchQ && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full">
                  Search: {searchQ} <button onClick={() => updateParam('search', '')} className="hover:text-brand-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full">
                  {selectedCategory.name} <button onClick={() => updateParam('category', '')} className="hover:text-brand-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {brandQ && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full">
                  {brandQ} <button onClick={() => updateParam('brand', '')} className="hover:text-brand-900"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className={`grid grid-cols-2 md:grid-cols-${grid === 3 ? 3 : 3} lg:grid-cols-${grid} gap-5`}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-3xl overflow-hidden border border-neutral-100">
                  <div className="aspect-square skeleton" />
                  <div className="p-4 space-y-2"><div className="h-3 skeleton rounded w-1/3" /><div className="h-4 skeleton rounded w-2/3" /><div className="h-5 skeleton rounded w-1/4 mt-3" /></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-neutral-300" />
              </div>
              <h3 className="text-lg font-bold text-neutral-800">No products found</h3>
              <p className="text-sm text-neutral-400 mt-1">Try adjusting your search or filter criteria</p>
              <button onClick={clearFilters} className="mt-4 px-5 py-2.5 btn-primary text-sm">Clear Filters</button>
            </div>
          ) : (
            <>
              <div className={`grid grid-cols-2 lg:grid-cols-${grid} gap-5`}>
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>

              {/* Pagination */}
              {(pagination.totalPages || 0) > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button onClick={() => updateParam('page', Math.max(1, pageQ - 1))} disabled={pageQ <= 1}
                    className="p-2.5 rounded-xl border border-neutral-200 text-neutral-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button key={i} onClick={() => updateParam('page', i + 1)}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${pageQ === i + 1 ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25' : 'text-neutral-500 hover:bg-neutral-100'}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => updateParam('page', Math.min(pagination.totalPages, pageQ + 1))} disabled={pageQ >= pagination.totalPages}
                    className="p-2.5 rounded-xl border border-neutral-200 text-neutral-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
