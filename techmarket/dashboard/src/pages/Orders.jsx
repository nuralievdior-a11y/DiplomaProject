import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Eye, Package } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const statuses = ['all','pending','confirmed','processing','shipped','delivered','cancelled'];

export default function Orders() {
  const [sp] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pag, setPag] = useState({});
  const [status, setStatus] = useState(sp.get('status') || 'all');

  useEffect(() => { fetch(); }, [status]);

  const fetch = async (page = 1) => {
    try { const p = { all:'true', page, limit:10 }; if (status !== 'all') p.status = status;
      const r = await api.get('/orders', { params: p }); setOrders(r.data.orders); setPag(r.data.pagination);
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  };

  const update = async (id, s) => { try { await api.put(`/orders/${id}/status`, { status: s }); toast.success('Updated'); fetch(pag.page); } catch { toast.error('Failed'); } };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Orders</h1><p className="text-surface-400 text-sm mt-1">Manage customer orders</p></div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statuses.map(s => <button key={s} onClick={() => setStatus(s)} className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${status===s ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>)}
      </div>
      {loading ? <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"/></div> : !orders.length ? <div className="glass rounded-2xl p-12 text-center"><Package className="w-12 h-12 text-surface-500 mx-auto mb-3"/><p className="text-surface-400">No orders found</p></div> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-surface-700/50 bg-surface-800/30">
              {['Order','Customer','Total','Status','Date',''].map(h => <th key={h} className="text-left text-xs font-medium text-surface-400 uppercase py-4 px-5">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-surface-700/30">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-surface-800/20 transition-colors">
                  <td className="py-4 px-5"><p className="text-sm font-semibold text-primary-400">{o.trackingNumber}</p></td>
                  <td className="py-4 px-5 text-sm text-surface-200">{o.userName}</td>
                  <td className="py-4 px-5 text-sm font-bold text-white">${(o.total || 0).toFixed(2)}</td>
                  <td className="py-4 px-5">
                    <select value={o.status} onChange={e => update(o.id, e.target.value)} className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 focus:outline-none cursor-pointer badge-${o.status}`}>
                      {statuses.filter(s=>s!=='all').map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-4 px-5 text-sm text-surface-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="py-4 px-5"><Link to={`/orders/${o.id}`} className="p-2 text-surface-400 hover:text-primary-400 rounded-lg inline-flex"><Eye className="w-4 h-4"/></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
