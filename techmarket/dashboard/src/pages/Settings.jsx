import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  useEffect(() => { api.get('/admin/settings').then(r => setSettings(r.data)).catch(()=>{}).finally(() => setLoading(false)); }, []);

  const save = async () => {
    setSaving(true);
    try { await api.put('/admin/settings', settings); toast.success('Settings saved!'); } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  if (loading || !settings) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"/></div>;
  const inp = "w-full px-4 py-2.5 bg-surface-800/50 border border-surface-600/50 rounded-xl text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50";
  const lbl = "block text-sm font-medium text-surface-300 mb-1.5";
  const ch = (key, val) => setSettings(p => ({...p, [key]: val}));

  return (
    <div className="max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-surface-400 text-sm mt-1">Configure your store</p></div>
      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">General</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={lbl}>Store Name</label><input value={settings.storeName} onChange={e=>ch('storeName',e.target.value)} className={inp}/></div>
          <div><label className={lbl}>Email</label><input value={settings.storeEmail} onChange={e=>ch('storeEmail',e.target.value)} className={inp}/></div>
          <div><label className={lbl}>Phone</label><input value={settings.storePhone} onChange={e=>ch('storePhone',e.target.value)} className={inp}/></div>
          <div><label className={lbl}>Currency</label><input value={settings.currency} onChange={e=>ch('currency',e.target.value)} className={inp}/></div>
        </div>
      </div>
      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Pricing & Shipping</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className={lbl}>Tax Rate (%)</label><input type="number" value={settings.taxRate} onChange={e=>ch('taxRate',parseFloat(e.target.value))} className={inp}/></div>
          <div><label className={lbl}>Shipping Rate ($)</label><input type="number" step="0.01" value={settings.shippingRate} onChange={e=>ch('shippingRate',parseFloat(e.target.value))} className={inp}/></div>
          <div><label className={lbl}>Free Shipping ($+)</label><input type="number" value={settings.freeShippingThreshold} onChange={e=>ch('freeShippingThreshold',parseFloat(e.target.value))} className={inp}/></div>
        </div>
      </div>
      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Social Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(settings.socialLinks||{}).map(([k,v]) => <div key={k}><label className={lbl}>{k.charAt(0).toUpperCase()+k.slice(1)}</label><input value={v} onChange={e=>setSettings(p=>({...p,socialLinks:{...p.socialLinks,[k]:e.target.value}}))} className={inp}/></div>)}
        </div>
      </div>
      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 disabled:opacity-50"><Save className="w-4 h-4"/>{saving?'Saving...':'Save Settings'}</button>
    </div>
  );
}
