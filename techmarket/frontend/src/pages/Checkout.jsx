import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, Truck, MapPin, ChevronRight, ArrowLeft, ShieldCheck, Check, Banknote, Wallet } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

const paymentMethods = [
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard, desc: 'Visa, Mastercard, AMEX' },
  { id: 'cash_on_delivery', label: 'Cash on Delivery', icon: Banknote, desc: 'Pay when you receive' },
  { id: 'digital_wallet', label: 'Digital Wallet', icon: Wallet, desc: 'PayMe, Click, Uzum' },
];

export default function Checkout() {
  const { cart, fetchCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const [address, setAddress] = useState({
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    phone: user?.phone || '',
    street: '', city: '', state: '', zipCode: '', country: 'Uzbekistan'
  });

  const [payment, setPayment] = useState('cash_on_delivery');

  useEffect(() => {
    if (user?.addresses?.length > 0) {
      const addr = user.addresses[0];
      setAddress(a => ({ ...a, street: addr.street || '', city: addr.city || '', state: addr.state || '', zipCode: addr.zipCode || '', country: addr.country || 'Uzbekistan' }));
    }
  }, [user]);

  const handleAddressChange = (field, value) => setAddress(a => ({ ...a, [field]: value }));

  const validateAddress = () => {
    if (!address.fullName || !address.phone || !address.street || !address.city) {
      toast.error('Please fill in all required fields');
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateAddress()) { setStep(1); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/orders', {
        items: cart.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: address,
        paymentMethod: payment,
      });
      setOrderSuccess(res.data);
      // Backend already clears cart during order creation, just refresh local state
      fetchCart();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to place order');
    }
    setSubmitting(false);
  };

  if (cart.items.length === 0 && !orderSuccess) {
    navigate('/cart');
    return null;
  }

  if (orderSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-100 flex items-center justify-center mb-5 animate-scale-in">
          <Check className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 font-display">Order Placed Successfully!</h1>
        <p className="text-neutral-500 mt-3 max-w-md mx-auto">Thank you for your purchase. We'll send you a confirmation email with tracking details soon.</p>

        <div className="mt-8 bg-neutral-50 rounded-2xl p-6 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Order ID</span>
            <span className="font-semibold text-neutral-800">{orderSuccess.order?.id || orderSuccess.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Tracking Number</span>
            <span className="font-semibold text-neutral-800">{orderSuccess.order?.trackingNumber || 'TM-' + Date.now()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Total</span>
            <span className="font-bold text-neutral-900 font-display">${(orderSuccess.order?.total || orderSuccess.total || cart.total || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Estimated Delivery</span>
            <span className="font-semibold text-neutral-800">{orderSuccess.order?.estimatedDelivery ? new Date(orderSuccess.order.estimatedDelivery).toLocaleDateString() : '3-5 business days'}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link to="/orders" className="btn-primary px-6 py-3 text-sm">View My Orders</Link>
          <Link to="/products" className="btn-outline px-6 py-3 text-sm">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-neutral-400 mb-6">
        <Link to="/cart" className="hover:text-neutral-600 flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Cart</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-neutral-600">Checkout</span>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[{ n: 1, label: 'Shipping' }, { n: 2, label: 'Payment' }, { n: 3, label: 'Review' }].map((s, i) => (
          <div key={s.n} className="flex items-center gap-3">
            <button onClick={() => setStep(s.n)} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s.n ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                {step > s.n ? <Check className="w-4 h-4" /> : s.n}
              </div>
              <span className={`text-sm font-medium ${step >= s.n ? 'text-neutral-800' : 'text-neutral-400'}`}>{s.label}</span>
            </button>
            {i < 2 && <div className={`h-px w-10 ${step > s.n ? 'bg-brand-600' : 'bg-neutral-200'}`} />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Step 1: Shipping */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-neutral-100 p-6">
              <h2 className="text-lg font-bold text-neutral-900 font-display flex items-center gap-2 mb-6">
                <MapPin className="w-5 h-5 text-brand-600" /> Shipping Address
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { field: 'fullName', label: 'Full Name *', span: 1 },
                  { field: 'phone', label: 'Phone Number *', span: 1 },
                  { field: 'street', label: 'Street Address *', span: 2 },
                  { field: 'city', label: 'City *', span: 1 },
                  { field: 'state', label: 'State / Region', span: 1 },
                  { field: 'zipCode', label: 'ZIP Code', span: 1 },
                  { field: 'country', label: 'Country', span: 1 },
                ].map(({ field, label, span }) => (
                  <div key={field} className={span === 2 ? 'sm:col-span-2' : ''}>
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">{label}</label>
                    <input type="text" value={address[field]} onChange={e => handleAddressChange(field, e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-800 focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 transition-all" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={() => { if (validateAddress()) setStep(2); }} className="btn-primary px-6 py-3 text-sm flex items-center gap-2">
                  Continue to Payment <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-neutral-100 p-6">
              <h2 className="text-lg font-bold text-neutral-900 font-display flex items-center gap-2 mb-6">
                <CreditCard className="w-5 h-5 text-brand-600" /> Payment Method
              </h2>
              <div className="space-y-3">
                {paymentMethods.map(pm => (
                  <button key={pm.id} onClick={() => setPayment(pm.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${payment === pm.id ? 'border-brand-500 bg-brand-50/50' : 'border-neutral-100 hover:border-neutral-200'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${payment === pm.id ? 'bg-brand-100 text-brand-600' : 'bg-neutral-100 text-neutral-400'}`}>
                      <pm.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-neutral-800">{pm.label}</p>
                      <p className="text-xs text-neutral-400">{pm.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payment === pm.id ? 'border-brand-500' : 'border-neutral-300'}`}>
                      {payment === pm.id && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                    </div>
                  </button>
                ))}
              </div>

              {payment === 'credit_card' && (
                <div className="mt-5 p-4 bg-neutral-50 rounded-xl space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-500 uppercase mb-1.5 block">Card Number</label>
                    <input placeholder="1234 5678 9012 3456" className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-neutral-500 uppercase mb-1.5 block">Expiry</label>
                      <input placeholder="MM/YY" className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-neutral-500 uppercase mb-1.5 block">CVV</label>
                      <input placeholder="123" className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(1)} className="text-sm font-medium text-neutral-500 hover:text-neutral-700 flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(3)} className="btn-primary px-6 py-3 text-sm flex items-center gap-2">
                  Review Order <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Shipping info */}
              <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2"><MapPin className="w-4 h-4 text-brand-600" /> Shipping Address</h3>
                  <button onClick={() => setStep(1)} className="text-xs text-brand-600 font-semibold hover:text-brand-700">Edit</button>
                </div>
                <div className="text-sm text-neutral-600 space-y-0.5">
                  <p className="font-semibold text-neutral-800">{address.fullName}</p>
                  <p>{address.street}</p>
                  <p>{address.city}, {address.state} {address.zipCode}</p>
                  <p>{address.country}</p>
                  <p className="text-neutral-400 mt-1">{address.phone}</p>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2"><CreditCard className="w-4 h-4 text-brand-600" /> Payment Method</h3>
                  <button onClick={() => setStep(2)} className="text-xs text-brand-600 font-semibold hover:text-brand-700">Edit</button>
                </div>
                <p className="text-sm text-neutral-600 capitalize">{payment.replace(/_/g, ' ')}</p>
              </div>

              {/* Items */}
              <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                <h3 className="text-sm font-bold text-neutral-800 mb-4">Order Items ({cart.itemCount})</h3>
                <div className="space-y-3">
                  {cart.items.map(item => (
                    <div key={item.productId} className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-neutral-50 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.image} alt="" className="w-full h-full object-contain p-2" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-800 truncate">{item.name}</p>
                        <p className="text-xs text-neutral-400">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-neutral-800">${((item.price || 0) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="text-sm font-medium text-neutral-500 hover:text-neutral-700 flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handlePlaceOrder} disabled={submitting}
                  className="btn-primary px-8 py-3.5 text-sm flex items-center gap-2 disabled:opacity-50">
                  {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {submitting ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 sticky top-28">
            <h3 className="text-lg font-bold text-neutral-900 font-display mb-5">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span className="font-semibold">${(cart.subtotal || 0).toFixed(2)}</span></div>
              {(cart.discount || 0) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="font-semibold">-${(cart.discount || 0).toFixed(2)}</span></div>}
              <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span className={`font-semibold ${cart.shipping === 0 ? 'text-emerald-600' : ''}`}>{cart.shipping === 0 ? 'Free' : `$${(cart.shipping || 0).toFixed(2)}`}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Tax</span><span className="font-semibold">${(cart.tax || 0).toFixed(2)}</span></div>
              <div className="border-t border-neutral-100 pt-3">
                <div className="flex justify-between"><span className="text-base font-bold text-neutral-900">Total</span><span className="text-xl font-bold text-neutral-900 font-display">${(cart.total || 0).toFixed(2)}</span></div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Your payment info is secure & encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
