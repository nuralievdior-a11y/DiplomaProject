import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function ProductForm() {
  const { id } = useParams(); const nav = useNavigate(); const isEdit = !!id;
  const [cats, setCats] = useState([]); const [saving, setSaving] = useState(false);
  const [imgUrl, setImgUrl] = useState(''); const [specKey, setSpecKey] = useState(''); const [specVal, setSpecVal] = useState(''); const [feat, setFeat] = useState('');
  const [form, setForm] = useState({ name:'',description:'',shortDescription:'',price:'',comparePrice:'',categoryId:'',brand:'',sku:'',stock:'',images:[],specifications:{},features:[],isFeatured:false,isNew:false });

  useEffect(() => { api.get('/categories').then(r => setCats(r.data)); if (isEdit) api.get(`/products/${id}`).then(r => { const p = r.data.product; setForm({ ...p, price: p.price+'', comparePrice: (p.comparePrice||'')+'', stock: p.stock+'' }); }).catch(() => { toast.error('Not found'); nav('/products'); }); }, [id]);

  const inp = "w-full px-4 py-2.5 bg-surface-800/50 border border-surface-600/50 rounded-xl text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50";
  const lbl = "block text-sm font-medium text-surface-300 mb-1.5";
  const ch = (e) => { const { name, value, type, checked } = e.target; setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value })); };

  const submit = async (e) => {
    e.preventDefault(); if (!form.name || !form.price || !form.categoryId) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try { const d = { ...form, price: parseFloat(form.price), comparePrice: parseFloat(form.comparePrice)||0, stock: parseInt(form.stock)||0 };
      isEdit ? await api.put(`/products/${id}`, d) : await api.post('/products', d);
      toast.success(isEdit ? 'Updated!' : 'Created!'); nav('/products');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => nav('/products')} className="p-2 text-surface-400 hover:text-white hover:bg-surface-700 rounded-xl"><ArrowLeft className="w-5 h-5"/></button>
        <div><h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit' : 'New'} Product</h1></div>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-white">Basic Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className={lbl}>Name *</label><input name="name" value={form.name} onChange={ch} className={inp} required /></div>
            <div className="md:col-span-2"><label className={lbl}>Short Description</label><input name="shortDescription" value={form.shortDescription} onChange={ch} className={inp} /></div>
            <div className="md:col-span-2"><label className={lbl}>Description</label><textarea name="description" value={form.description} onChange={ch} rows={3} className={inp} /></div>
          </div>
        </div>
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-white">Pricing & Inventory</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className={lbl}>Price *</label><input name="price" type="number" step="0.01" value={form.price} onChange={ch} className={inp} required /></div>
            <div><label className={lbl}>Compare Price</label><input name="comparePrice" type="number" step="0.01" value={form.comparePrice} onChange={ch} className={inp} /></div>
            <div><label className={lbl}>SKU</label><input name="sku" value={form.sku} onChange={ch} className={inp} /></div>
            <div><label className={lbl}>Stock</label><input name="stock" type="number" value={form.stock} onChange={ch} className={inp} /></div>
          </div>
        </div>
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-white">Organization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={lbl}>Category *</label><select name="categoryId" value={form.categoryId} onChange={ch} className={inp} required><option value="">Select</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className={lbl}>Brand</label><input name="brand" value={form.brand} onChange={ch} className={inp} /></div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={ch} className="w-4 h-4 rounded"/><span className="text-sm text-surface-200">Featured</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="isNew" checked={form.isNew} onChange={ch} className="w-4 h-4 rounded"/><span className="text-sm text-surface-200">New Arrival</span></label>
          </div>
        </div>
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-white">Images</h3>
          <div className="flex gap-2"><input value={imgUrl} onChange={e => setImgUrl(e.target.value)} className={`${inp} flex-1`} placeholder="Image URL" /><button type="button" onClick={() => { if(imgUrl.trim()){ setForm(p=>({...p,images:[...p.images,imgUrl.trim()]})); setImgUrl(''); }}} className="px-4 py-2.5 bg-primary-600 text-white rounded-xl"><Plus className="w-4 h-4"/></button></div>
          {form.images.length > 0 && <div className="flex flex-wrap gap-3">{form.images.map((img,i) => <div key={i} className="relative group"><img src={img} alt="" className="w-20 h-20 rounded-xl object-cover bg-surface-700"/><button type="button" onClick={() => setForm(p=>({...p,images:p.images.filter((_,j)=>j!==i)}))} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button></div>)}</div>}
        </div>
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-white">Specifications</h3>
          <div className="flex gap-2"><input value={specKey} onChange={e=>setSpecKey(e.target.value)} className={`${inp} flex-1`} placeholder="Key"/><input value={specVal} onChange={e=>setSpecVal(e.target.value)} className={`${inp} flex-1`} placeholder="Value"/><button type="button" onClick={() => {if(specKey&&specVal){setForm(p=>({...p,specifications:{...p.specifications,[specKey]:specVal}}));setSpecKey('');setSpecVal('');}}} className="px-4 py-2.5 bg-primary-600 text-white rounded-xl"><Plus className="w-4 h-4"/></button></div>
          {Object.keys(form.specifications).length > 0 && <div className="space-y-2">{Object.entries(form.specifications).map(([k,v]) => <div key={k} className="flex items-center justify-between p-3 bg-surface-800/50 rounded-xl"><span className="text-sm"><span className="text-surface-400">{k}:</span> <span className="text-white">{v}</span></span><button type="button" onClick={() => {const s={...form.specifications};delete s[k];setForm(p=>({...p,specifications:s}));}} className="text-surface-400 hover:text-red-400"><X className="w-4 h-4"/></button></div>)}</div>}
        </div>
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-white">Features</h3>
          <div className="flex gap-2"><input value={feat} onChange={e=>setFeat(e.target.value)} className={`${inp} flex-1`} placeholder="Feature" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(feat.trim()){setForm(p=>({...p,features:[...p.features,feat.trim()]}));setFeat('');}}}} /><button type="button" onClick={() => {if(feat.trim()){setForm(p=>({...p,features:[...p.features,feat.trim()]}));setFeat('');}}} className="px-4 py-2.5 bg-primary-600 text-white rounded-xl"><Plus className="w-4 h-4"/></button></div>
          {form.features.length > 0 && <div className="flex flex-wrap gap-2">{form.features.map((f,i) => <span key={i} className="flex items-center gap-1.5 text-sm bg-surface-700/50 px-3 py-1.5 rounded-lg text-surface-200">{f}<button type="button" onClick={() => setForm(p=>({...p,features:p.features.filter((_,j)=>j!==i)}))} className="text-surface-500 hover:text-red-400"><X className="w-3 h-3"/></button></span>)}</div>}
        </div>
        <div className="flex gap-4">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 disabled:opacity-50"><Save className="w-4 h-4"/>{isEdit ? 'Update' : 'Create'}</button>
          <button type="button" onClick={() => nav('/products')} className="px-6 py-3 text-surface-400 bg-surface-700/50 rounded-xl text-sm font-medium">Cancel</button>
        </div>
      </form>
    </div>
  );
}
