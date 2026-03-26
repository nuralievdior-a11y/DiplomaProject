import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Categories() {
  const [cats, setCats] = useState([]); const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); const [form, setForm] = useState({ name:'', description:'', icon:'package' });

  useEffect(() => { fetch(); }, []);
  const fetch = async () => { try { const r = await api.get('/categories'); setCats(r.data); } catch {} finally { setLoading(false); } };

  const save = async () => {
    if (!form.name) { toast.error('Name required'); return; }
    try {
      if (editing) { await api.put(`/categories/${editing}`, form); toast.success('Updated'); }
      else { await api.post('/categories', form); toast.success('Created'); }
      setEditing(null); setForm({ name:'', description:'', icon:'package' }); fetch();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const del = async (id, name) => { if(!confirm(`Delete "${name}"?`))return; try { await api.delete(`/categories/${id}`); toast.success('Deleted'); fetch(); } catch { toast.error('Failed'); } };
  const edit = (c) => { setEditing(c.id); setForm({ name: c.name, description: c.description, icon: c.icon }); };
  const inp = "w-full px-4 py-2.5 bg-surface-800/50 border border-surface-600/50 rounded-xl text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50";

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Categories</h1><p className="text-surface-400 text-sm mt-1">{cats.length} categories</p></div>
      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">{editing ? 'Edit' : 'Add'} Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Name" className={inp} />
          <input value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Description" className={inp} />
          <input value={form.icon} onChange={e => setForm({...form, icon:e.target.value})} placeholder="Icon name" className={inp} />
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-500"><Save className="w-4 h-4"/>{editing?'Update':'Add'}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({name:'',description:'',icon:'package'}); }} className="px-5 py-2.5 text-surface-400 bg-surface-700/50 rounded-xl text-sm"><X className="w-4 h-4"/></button>}
        </div>
      </div>
      {loading ? <div className="flex justify-center py-10"><div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"/></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cats.map(c => (
            <div key={c.id} className="glass rounded-2xl p-5 flex items-start gap-4 hover:border-primary-500/30 transition-all">
              <img src={c.image} alt="" className="w-16 h-16 rounded-xl object-cover bg-surface-700" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{c.name}</p>
                <p className="text-xs text-surface-400 mt-1 truncate">{c.description}</p>
                <p className="text-xs text-primary-400 mt-2">{c.productCount} products</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => edit(c)} className="p-1.5 text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg"><Edit className="w-3.5 h-3.5"/></button>
                <button onClick={() => del(c.id, c.name)} className="p-1.5 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
