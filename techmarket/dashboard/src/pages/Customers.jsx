import { useState, useEffect } from 'react';
import { Search, Shield, UserX, UserCheck, Mail, Phone } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Customers() {
  const [users, setUsers] = useState([]); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true); const [pag, setPag] = useState({});
  useEffect(() => { fetch(); }, [search]);
  const fetch = async (page=1) => { try { const p = { page, limit:10 }; if(search) p.search=search; const r = await api.get('/admin/users',{params:p}); setUsers(r.data.users); setPag(r.data.pagination); } catch { toast.error('Failed'); } finally { setLoading(false); } };
  const toggle = async (id, active) => { try { await api.put(`/admin/users/${id}`,{isActive:!active}); toast.success(active?'Deactivated':'Activated'); fetch(pag.page); } catch { toast.error('Failed'); } };
  const role = async (id, cur) => { if(!confirm(`Change to ${cur==='admin'?'customer':'admin'}?`))return; try { await api.put(`/admin/users/${id}`,{role:cur==='admin'?'customer':'admin'}); toast.success('Updated'); fetch(pag.page); } catch { toast.error('Failed'); } };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Customers</h1><p className="text-surface-400 text-sm mt-1">{pag.total||0} users</p></div>
      <div className="glass rounded-2xl p-4"><div className="relative max-w-md"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-surface-600/50 rounded-xl text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"/></div></div>
      {loading ? <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"/></div> : (
        <div className="glass rounded-2xl overflow-hidden"><table className="w-full"><thead><tr className="border-b border-surface-700/50 bg-surface-800/30">
          {['Customer','Contact','Role','Status','Joined','Actions'].map(h => <th key={h} className={`text-${h==='Actions'?'right':'left'} text-xs font-medium text-surface-400 uppercase py-4 px-5`}>{h}</th>)}
        </tr></thead><tbody className="divide-y divide-surface-700/30">
          {users.map(u => <tr key={u.id} className="hover:bg-surface-800/20">
            <td className="py-4 px-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">{u.firstName?.charAt(0)}{u.lastName?.charAt(0)}</div><div><p className="text-sm font-semibold text-white">{u.firstName} {u.lastName}</p><p className="text-xs text-surface-500">{u.id}</p></div></div></td>
            <td className="py-4 px-5"><p className="text-sm text-surface-300 flex items-center gap-1.5"><Mail className="w-3 h-3"/>{u.email}</p>{u.phone&&<p className="text-xs text-surface-500 flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3"/>{u.phone}</p>}</td>
            <td className="py-4 px-5"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.role==='admin'?'bg-primary-500/20 text-primary-400':'bg-surface-600/50 text-surface-300'}`}>{u.role}</span></td>
            <td className="py-4 px-5"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.isActive?'bg-emerald-500/20 text-emerald-400':'bg-red-500/20 text-red-400'}`}>{u.isActive?'Active':'Inactive'}</span></td>
            <td className="py-4 px-5 text-sm text-surface-400">{new Date(u.createdAt).toLocaleDateString()}</td>
            <td className="py-4 px-5"><div className="flex justify-end gap-1"><button onClick={()=>role(u.id,u.role)} className="p-2 text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg"><Shield className="w-4 h-4"/></button><button onClick={()=>toggle(u.id,u.isActive)} className={`p-2 rounded-lg ${u.isActive?'text-surface-400 hover:text-red-400 hover:bg-red-500/10':'text-surface-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`}>{u.isActive?<UserX className="w-4 h-4"/>:<UserCheck className="w-4 h-4"/>}</button></div></td>
          </tr>)}
        </tbody></table></div>
      )}
    </div>
  );
}
