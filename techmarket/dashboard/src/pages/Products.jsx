import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Star, AlertTriangle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});

  useEffect(() => { fetchProducts(); api.get('/categories').then(r => setCategories(r.data)).catch(()=>{}); }, [search, catFilter]);

  const fetchProducts = async (page = 1) => {
    try {
      const params = { page, limit: 12 }; if (search) params.search = search; if (catFilter) params.category = catFilter;
      const r = await api.get('/products', { params }); setProducts(r.data.products); setPagination(r.data.pagination);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await api.delete(`/products/${id}`); toast.success('Deleted'); fetchProducts(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Products</h1><p className="text-surface-400 text-sm mt-1">{pagination.total || 0} total</p></div>
        <Link to="/products/new" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold rounded-xl hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25"><Plus className="w-4 h-4" /> Add Product</Link>
      </div>
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-surface-600/50 rounded-xl text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-4 py-2.5 bg-surface-800/50 border border-surface-600/50 rounded-xl text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {loading ? <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"/></div> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-surface-700/50 bg-surface-800/30">
              {['Product','Category','Price','Stock','Rating','Actions'].map(h => <th key={h} className={`text-${h==='Actions'?'right':'left'} text-xs font-medium text-surface-400 uppercase py-4 px-5`}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-surface-700/30">
              {products.map(p => {
                const cat = categories.find(c => c.id === p.categoryId);
                return (
                  <tr key={p.id} className="hover:bg-surface-800/20 transition-colors">
                    <td className="py-4 px-5"><div className="flex items-center gap-3"><img src={p.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover bg-surface-700"/><div><p className="text-sm font-semibold text-white">{p.name}</p><p className="text-xs text-surface-400">{p.brand} · {p.sku}</p></div></div></td>
                    <td className="py-4 px-5"><span className="text-xs font-medium text-surface-300 bg-surface-700/50 px-2.5 py-1 rounded-lg">{cat?.name || 'N/A'}</span></td>
                    <td className="py-4 px-5"><p className="text-sm font-bold text-white">${(p.price || 0).toFixed(2)}</p>{(p.comparePrice || 0) > (p.price || 0) && <p className="text-xs text-surface-500 line-through">${(p.comparePrice || 0).toFixed(2)}</p>}</td>
                    <td className="py-4 px-5"><div className="flex items-center gap-2">{p.stock < 10 && <AlertTriangle className="w-3.5 h-3.5 text-amber-400"/>}<span className={`text-sm font-medium ${p.stock < 10 ? 'text-amber-400' : 'text-surface-200'}`}>{p.stock}</span></div></td>
                    <td className="py-4 px-5"><div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400"/><span className="text-sm text-surface-200">{p.rating}</span><span className="text-xs text-surface-500">({p.reviewCount})</span></div></td>
                    <td className="py-4 px-5"><div className="flex items-center justify-end gap-1">
                      <Link to={`/products/edit/${p.id}`} className="p-2 text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"><Edit className="w-4 h-4"/></Link>
                      <button onClick={() => handleDelete(p.id, p.name)} className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pagination.totalPages > 1 && <div className="flex items-center justify-between px-5 py-4 border-t border-surface-700/50"><p className="text-sm text-surface-400">Page {pagination.page} of {pagination.totalPages}</p><div className="flex gap-2"><button onClick={() => fetchProducts(pagination.page-1)} disabled={!pagination.hasPrev} className="px-4 py-2 text-sm bg-surface-700/50 text-surface-200 rounded-lg disabled:opacity-30">Prev</button><button onClick={() => fetchProducts(pagination.page+1)} disabled={!pagination.hasNext} className="px-4 py-2 text-sm bg-surface-700/50 text-surface-200 rounded-lg disabled:opacity-30">Next</button></div></div>}
        </div>
      )}
    </div>
  );
}
