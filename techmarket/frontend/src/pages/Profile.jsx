import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, MapPin, Save, Plus, Trash2, Package, Heart, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [addresses, setAddresses] = useState(user?.addresses || []);
  const [newAddress, setNewAddress] = useState(null);

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', form);
      updateUser(res.data);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
    setLoading(false);
  };

  const handleSaveAddress = async () => {
    if (!newAddress?.street || !newAddress?.city) { toast.error('Fill required fields'); return; }
    try {
      const res = await api.post('/auth/addresses', newAddress);
      // Backend returns the new address object
      const savedAddr = res.data;
      setAddresses(a => [...a, savedAddr]);
      setNewAddress(null);
      toast.success('Address saved!');
    } catch {
      toast.error('Failed to save address');
    }
  };

  const handleDeleteAddress = async (addr) => {
    try {
      await api.delete(`/auth/addresses/${addr.id}`);
      setAddresses(a => a.filter(x => x.id !== addr.id));
      toast.success('Address removed');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const sideLinks = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
  ];

  const quickLinks = [
    { to: '/orders', label: 'My Orders', icon: Package, desc: 'Track and manage orders' },
    { to: '/wishlist', label: 'Wishlist', icon: Heart, desc: 'Saved items' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display mb-8">My Account</h1>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* User card */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-brand-500/20">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-neutral-800">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-neutral-400">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-2 mb-4">
            {sideLinks.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? 'bg-brand-50 text-brand-700' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'}`}>
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            ))}
          </div>

          {/* Quick links */}
          <div className="space-y-2">
            {quickLinks.map(item => (
              <Link key={item.to} to={item.to}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-neutral-100 hover:border-brand-200 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-neutral-50 group-hover:bg-brand-50 flex items-center justify-center transition-colors">
                  <item.icon className="w-5 h-5 text-neutral-400 group-hover:text-brand-600 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-700 group-hover:text-brand-600 transition-colors">{item.label}</p>
                  <p className="text-xs text-neutral-400">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'personal' && (
            <div className="bg-white rounded-2xl border border-neutral-100 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-neutral-900 font-display mb-6">Personal Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">First Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="text" value={form.firstName} onChange={e => updateField('firstName', e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Last Name</label>
                  <input type="text" value={form.lastName} onChange={e => updateField('lastName', e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 transition-all" />
                  </div>
                </div>
              </div>
              <button onClick={handleSaveProfile} disabled={loading}
                className="btn-primary px-6 py-3 text-sm flex items-center gap-2 mt-6 disabled:opacity-50">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-900 font-display">Saved Addresses</h2>
                <button onClick={() => setNewAddress({ street: '', city: '', state: '', zipCode: '', country: 'Uzbekistan', isDefault: false })}
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Address
                </button>
              </div>

              {newAddress && (
                <div className="bg-white rounded-2xl border-2 border-brand-200 p-6">
                  <h3 className="text-sm font-bold text-neutral-800 mb-4">New Address</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { field: 'street', label: 'Street *', span: 2 },
                      { field: 'city', label: 'City *', span: 1 },
                      { field: 'state', label: 'State', span: 1 },
                      { field: 'zipCode', label: 'ZIP', span: 1 },
                      { field: 'country', label: 'Country', span: 1 },
                    ].map(({ field, label, span }) => (
                      <div key={field} className={span === 2 ? 'sm:col-span-2' : ''}>
                        <label className="text-xs font-semibold text-neutral-500 mb-1 block">{label}</label>
                        <input type="text" value={newAddress[field]} onChange={e => setNewAddress(a => ({ ...a, [field]: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={handleSaveAddress} className="btn-primary px-5 py-2.5 text-sm">Save Address</button>
                    <button onClick={() => setNewAddress(null)} className="px-5 py-2.5 text-sm text-neutral-500 hover:text-neutral-700">Cancel</button>
                  </div>
                </div>
              )}

              {addresses.length === 0 && !newAddress ? (
                <div className="bg-white rounded-2xl border border-neutral-100 p-10 text-center">
                  <MapPin className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
                  <p className="text-sm text-neutral-400">No saved addresses yet</p>
                </div>
              ) : (
                addresses.map((addr) => (
                  <div key={addr.id || addr.street} className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-start justify-between group hover:border-neutral-200 transition-all">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold text-neutral-800">{addr.street}</p>
                        <p className="text-neutral-500">{addr.city}, {addr.state} {addr.zipCode}</p>
                        <p className="text-neutral-400">{addr.country}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAddress(addr)}
                      className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
