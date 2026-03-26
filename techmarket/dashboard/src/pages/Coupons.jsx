import { useState, useEffect } from 'react';
import { Plus, Trash2, Ticket } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Coupons() {
  const [coupons, setCoupons] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ code:'', type:'percentage', value:'', minOrder:'', maxDiscount:'', usageLimit:'100', expiresAt:'' });
  useEffect(() => { api.get('/admin/coupons').then(r => setCoupons(r.data)).catch(()=>{}); }, []);
  const inp = "w-full px-4 py-2.5 bg-surface-800/50 border border-surface-600/50 rounded-xl text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50";

  const add = async () => {
    if(!form.code||!form.value) { toast.error('Code and value required'); return; }
    try { const r = await api.post('/admin/coupons', form); setCoupons([...coupons, r.data]); setShow(false); setForm({code:'',type:'percentage',value:'',minOrder:'',maxDiscount:'',usageLimit:'100',expiresAt:''}); toast.success('Created'); } catch(e) { toast.error(e.response?.data?.error||'Failed'); }
  };
  const del = async (id) => { if(!confirm('Delete?'))return; try { await api.delete(`/admin/coupons/${id}`); setCoupons(coupons.filter(c=>c.id!==id)); toast.success('Deleted'); } catch { toast.error('Failed'); } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Coupons</h1><p className="text-surface-400 text-sm mt-1">{coupons.length} coupons</p></div>
        <button onClick={() => setShow(!show)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold rounded-xl"><Plus className="w-4 h-4"/> New Coupon</button>
      </div>
      {show && <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">New Coupon</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="CODE" className={inp}/>
          <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className={inp}><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select>
          <input type="number" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} placeholder="Value" className={inp}/>
          <input type="number" value={form.minOrder} onChange={e=>setForm({...form,minOrder:e.target.value})} placeholder="Min Order" className={inp}/>
          <input type="number" value={form.maxDiscount} onChange={e=>setForm({...form,maxDiscount:e.target.value})} placeholder="Max Discount" className={inp}/>
          <input type="number" value={form.usageLimit} onChange={e=>setForm({...form,usageLimit:e.target.value})} placeholder="Usage Limit" className={inp}/>
          <input type="date" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})} className={inp}/>
          <button onClick={add} className="px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl">Create</button>
        </div>
      </div>}
      <div className="glass rounded-2xl overflow-hidden"><table className="w-full"><thead><tr className="border-b border-surface-700/50 bg-surface-800/30">
        {['Code','Type','Value','Min Order','Max Disc','Used/Limit','Expires',''].map(h => <th key={h} className="text-left text-xs font-medium text-surface-400 uppercase py-4 px-5">{h}</th>)}
      </tr></thead><tbody className="divide-y divide-surface-700/30">
        {coupons.map(c => <tr key={c.id} className="hover:bg-surface-800/20">
          <td className="py-4 px-5"><span className="text-sm font-bold text-primary-400 flex items-center gap-2"><Ticket className="w-4 h-4"/>{c.code}</span></td>
          <td className="py-4 px-5 text-sm text-surface-300 capitalize">{c.type}</td>
          <td className="py-4 px-5 text-sm font-semibold text-white">{c.type==='percentage'?`${c.value}%`:`$${c.value}`}</td>
          <td className="py-4 px-5 text-sm text-surface-300">${c.minOrder}</td>
          <td className="py-4 px-5 text-sm text-surface-300">${c.maxDiscount}</td>
          <td className="py-4 px-5 text-sm text-surface-300">{c.usedCount}/{c.usageLimit}</td>
          <td className="py-4 px-5 text-sm text-surface-400">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</td>
          <td className="py-4 px-5"><button onClick={()=>del(c.id)} className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4"/></button></td>
        </tr>)}
      </tbody></table></div>
    </div>
  );
}
