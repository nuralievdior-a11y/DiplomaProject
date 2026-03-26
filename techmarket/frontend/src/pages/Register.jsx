import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) { toast.error('Please fill in all required fields'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, password: form.password });
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold font-display text-neutral-900">Tech<span className="text-brand-600">Market</span></span>
          </Link>
          <h1 className="text-2xl font-bold font-display text-neutral-900">Create an account</h1>
          <p className="text-sm text-neutral-400 mt-1">Join TechMarket and start shopping</p>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-100 p-8 shadow-xl shadow-neutral-200/20">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">First Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input type="text" value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="John"
                    className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Last Name *</label>
                <input type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Doe"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 transition-all" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Email *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 transition-all" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Phone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+998 90 123 45 67"
                  className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 transition-all" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Password *</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min. 6 characters"
                  className="w-full pl-11 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input type="password" value={form.confirm} onChange={e => update('confirm', e.target.value)} placeholder="Repeat your password"
                  className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 transition-all" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-neutral-400">
              Already have an account? <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
