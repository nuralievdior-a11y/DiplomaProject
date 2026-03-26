import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CreditCard, Package, Truck, Check } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const steps = ['pending','confirmed','processing','shipped','delivered'];

export default function OrderDetail() {
  const { id } = useParams(); const nav = useNavigate();
  const [order, setOrder] = useState(null); const [loading, setLoading] = useState(true);

  useEffect(() => { api.get(`/orders/${id}`).then(r => setOrder(r.data)).catch(() => { toast.error('Not found'); nav('/orders'); }).finally(() => setLoading(false)); }, [id]);

  const update = async (s) => { try { await api.put(`/orders/${id}/status`, { status: s }); toast.success('Updated'); const r = await api.get(`/orders/${id}`); setOrder(r.data); } catch { toast.error('Failed'); } };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"/></div>;
  if (!order) return null;
  const cur = steps.indexOf(order.status); const a = order.shippingAddress;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => nav('/orders')} className="p-2 text-surface-400 hover:text-white hover:bg-surface-700 rounded-xl"><ArrowLeft className="w-5 h-5"/></button>
        <div className="flex-1"><h1 className="text-2xl font-bold text-white">{order.trackingNumber}</h1><p className="text-surface-400 text-sm mt-1">{new Date(order.createdAt).toLocaleDateString('en',{year:'numeric',month:'long',day:'numeric'})}</p></div>
        <span className={`text-sm font-semibold px-4 py-2 rounded-full badge-${order.status}`}>{order.status}</span>
      </div>

      {order.status !== 'cancelled' && <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-surface-700"/>
          <div className="absolute top-5 left-0 h-0.5 bg-primary-500 transition-all" style={{width:`${(cur/(steps.length-1))*100}%`}}/>
          {steps.map((s,i) => <div key={s} className="relative flex flex-col items-center z-10"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${i<=cur?'bg-primary-500 text-white':'bg-surface-700 text-surface-500'}`}>{i<cur?<Check className="w-5 h-5"/>:<Package className="w-4 h-4"/>}</div><p className={`text-xs mt-2 capitalize ${i<=cur?'text-primary-400 font-medium':'text-surface-500'}`}>{s}</p></div>)}
        </div>
      </div>}

      <div className="glass rounded-2xl p-6">
        <h3 className="text-base font-semibold text-white mb-4">Items</h3>
        <div className="space-y-3">{order.items.map((item,i) => <div key={i} className="flex items-center gap-4 p-3 bg-surface-800/30 rounded-xl"><img src={item.image} alt="" className="w-14 h-14 rounded-xl object-cover bg-surface-700"/><div className="flex-1"><p className="text-sm font-semibold text-white">{item.name}</p><p className="text-xs text-surface-400">Qty: {item.quantity}</p></div><p className="text-sm font-bold text-white">${((item.price||0)*item.quantity).toFixed(2)}</p></div>)}</div>
        <div className="mt-4 pt-4 border-t border-surface-700/50 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-surface-400">Subtotal</span><span className="text-surface-200">${(order.subtotal||0).toFixed(2)}</span></div>
          {(order.discount||0) > 0 && <div className="flex justify-between text-sm"><span className="text-surface-400">Discount</span><span className="text-emerald-400">-${(order.discount||0).toFixed(2)}</span></div>}
          <div className="flex justify-between text-sm"><span className="text-surface-400">Shipping</span><span className="text-surface-200">{order.shipping===0?'Free':`$${(order.shipping||0).toFixed(2)}`}</span></div>
          <div className="flex justify-between text-sm"><span className="text-surface-400">Tax</span><span className="text-surface-200">${(order.tax||0).toFixed(2)}</span></div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-surface-700/50"><span>Total</span><span>${(order.total||0).toFixed(2)}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary-400"/>Shipping</h3>
          <div className="text-sm text-surface-300 space-y-1"><p className="text-white font-medium">{order.userName}</p><p>{a?.street}</p><p>{a?.city}, {a?.state} {a?.zipCode}</p><p>{a?.country}</p></div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary-400"/>Payment</h3>
          <div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-surface-400">Method</span><span className="text-surface-200 capitalize">{order.paymentMethod?.replace('_',' ')}</span></div><div className="flex justify-between text-sm"><span className="text-surface-400">Status</span><span className="text-emerald-400 capitalize">{order.paymentStatus}</span></div></div>
          <div className="mt-4 pt-4 border-t border-surface-700/50"><p className="text-xs text-surface-400 mb-3">Update Status</p><div className="flex flex-wrap gap-2">{steps.map(s => <button key={s} onClick={() => update(s)} disabled={order.status===s} className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${order.status===s?'bg-primary-500/20 text-primary-400':'text-surface-400 bg-surface-700/50 hover:bg-surface-600/50'}`}>{s}</button>)}<button onClick={() => update('cancelled')} className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20">Cancel</button></div></div>
        </div>
      </div>
    </div>
  );
}
