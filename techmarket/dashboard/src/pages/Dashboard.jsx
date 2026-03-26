import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingCart, Users, Package, ArrowUpRight, Clock, AlertTriangle } from 'lucide-react';
import api from '../api';

const COLORS = ['#818cf8','#6366f1','#4f46e5','#a78bfa','#7c3aed','#c084fc','#e879f9','#f472b6'];
const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="glass rounded-2xl p-6 animate-in">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-surface-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {trend && <div className="flex items-center gap-1 mt-2"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-400 font-medium">{trend}</span></div>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-6 h-6 text-white" /></div>
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/admin/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"/></div>;
  if (!data) return <p className="text-surface-400 text-center py-20">Failed to load</p>;

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold text-white">Dashboard</h1><p className="text-surface-400 text-sm mt-1">Welcome back! Here's your store overview.</p></div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`$${data.totalRevenue.toLocaleString()}`} icon={DollarSign} color="bg-gradient-to-br from-emerald-500 to-emerald-600" trend="+12.5%" />
        <StatCard title="Total Orders" value={data.totalOrders} icon={ShoppingCart} color="bg-gradient-to-br from-primary-500 to-primary-600" trend="+8.2%" />
        <StatCard title="Customers" value={data.totalUsers} icon={Users} color="bg-gradient-to-br from-amber-500 to-amber-600" trend="+15.3%" />
        <StatCard title="Products" value={data.totalProducts} icon={Package} color="bg-gradient-to-br from-cyan-500 to-cyan-600" />
      </div>

      {(data.pendingOrders > 0 || data.lowStockProducts > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.pendingOrders > 0 && <div className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl"><Clock className="w-5 h-5 text-amber-400" /><p className="text-sm text-amber-200"><strong>{data.pendingOrders}</strong> pending orders</p><Link to="/orders" className="ml-auto text-xs text-amber-400 font-medium">View →</Link></div>}
          {data.lowStockProducts > 0 && <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-400" /><p className="text-sm text-red-200"><strong>{data.lowStockProducts}</strong> low stock</p><Link to="/products" className="ml-auto text-xs text-red-400 font-medium">View →</Link></div>}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Categories</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart><Pie data={data.categoryDistribution} cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={3} dataKey="count" nameKey="name">
              {data.categoryDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', fontSize:'13px', color:'#e2e8f0' }} /></PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">{data.categoryDistribution.map((c, i) => <span key={c.name} className="flex items-center gap-1.5 text-xs text-surface-300"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }}/>{c.name}</span>)}</div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Order Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={Object.entries(data.ordersByStatus || {}).map(([name, value]) => ({ name, value }))}>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', fontSize:'13px', color:'#e2e8f0' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-surface-800/50 rounded-xl"><span className="text-sm text-surface-300">Avg Order</span><span className="text-sm font-bold text-white">${(data.totalRevenue/(data.totalOrders||1)).toFixed(2)}</span></div>
            {Object.entries(data.ordersByStatus||{}).map(([s,c]) => <div key={s} className="flex justify-between p-3 bg-surface-800/50 rounded-xl"><span className="text-sm text-surface-300 capitalize">{s}</span><span className={`text-xs font-semibold px-2.5 py-1 rounded-full badge-${s}`}>{c}</span></div>)}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold text-white">Recent Orders</h3><Link to="/orders" className="text-sm text-primary-400 hover:text-primary-300 font-medium">View All →</Link></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-surface-700/50">
              {['Order','Customer','Items','Total','Status','Date'].map(h => <th key={h} className="text-left text-xs font-medium text-surface-400 uppercase pb-3 px-4">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-surface-700/30">
              {data.recentOrders.map(o => (
                <tr key={o.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="py-3.5 px-4"><Link to={`/orders/${o.id}`} className="text-sm text-primary-400 hover:text-primary-300 font-medium">{o.trackingNumber}</Link></td>
                  <td className="py-3.5 px-4 text-sm text-surface-200">{o.userName}</td>
                  <td className="py-3.5 px-4 text-sm text-surface-300">{o.items.length} items</td>
                  <td className="py-3.5 px-4 text-sm font-semibold text-white">${(o.total || 0).toFixed(2)}</td>
                  <td className="py-3.5 px-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full badge-${o.status}`}>{o.status}</span></td>
                  <td className="py-3.5 px-4 text-sm text-surface-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
