import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Send } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    const nextEmail = String(email || '').trim();
    if (!nextEmail) { toast.error('Please enter your email'); return; }

    setSubmitting(true);
    try {
      await api.post('/newsletter/subscribe', { email: nextEmail });
      setEmail('');
      toast.success('Subscribed!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to subscribe');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-neutral-900 text-neutral-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter */}
        <div className="py-12 border-b border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white font-display">Stay in the loop</h3>
            <p className="text-sm text-neutral-400 mt-1">Get the latest deals and tech news delivered to your inbox.</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex w-full md:w-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              className="flex-1 md:w-72 px-5 py-3 bg-neutral-800 border border-neutral-700 rounded-l-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500"
            />
            <button disabled={submitting} className="px-6 py-3 bg-brand-600 text-white font-semibold rounded-r-xl hover:bg-brand-500 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" /> Subscribe
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white font-display">TechMarket</span>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed mb-4">Your trusted destination for premium electronics with fast delivery and competitive prices.</p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-brand-600 transition-all">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Shop</h4>
            <ul className="space-y-2.5">
              {['Smartphones','Laptops','Tablets','Headphones','Smartwatches','Gaming','Accessories'].map(item => (
                <li key={item}><Link to={`/products`} className="text-sm text-neutral-400 hover:text-white transition-colors">{item}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Account</h4>
            <ul className="space-y-2.5">
              {[['My Profile','/profile'],['Order History','/orders'],['Wishlist','/wishlist'],['Shopping Cart','/cart']].map(([label,path]) => (
                <li key={path}><Link to={path} className="text-sm text-neutral-400 hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3"><Mail className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" /><span className="text-sm text-neutral-400">info@techmarket.com</span></li>
              <li className="flex items-start gap-3"><Phone className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" /><span className="text-sm text-neutral-400">+998 90 123 45 67</span></li>
              <li className="flex items-start gap-3"><MapPin className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" /><span className="text-sm text-neutral-400">Tashkent, Uzbekistan</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="py-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-500">&copy; {new Date().getFullYear()} TechMarket. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {['Privacy Policy','Terms of Service','Cookie Policy'].map(item => (
              <a key={item} href="#" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
