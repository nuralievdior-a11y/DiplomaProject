import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Search, Truck, Check, Clock, XCircle, Eye } from 'lucide-react';
import api from '../api';

const statusConfig = {
  pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmed: { color: 'bg-blue-100 text-blue-700', icon: Check },
  processing: { color: 'bg-indigo-100 text-indigo-700', icon: Package },
  shipped: { color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { color: 'bg-emerald-100 text-emerald-700', icon: Check },
  cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
};

const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    api.get('/orders').then(r => setOrders(r.data.orders || r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 skeleton rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-xs text-neutral-400 mb-6">
        <Link to="/" className="hover:text-neutral-600">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-neutral-600">My Orders</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-neutral-100 flex items-center justify-center mb-5">
            <Package className="w-9 h-9 text-neutral-300" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 font-display">No orders yet</h2>
          <p className="text-sm text-neutral-400 mt-2">Start shopping to see your orders here</p>
          <Link to="/products" className="inline-flex items-center gap-2 btn-primary px-6 py-3 text-sm mt-6">
            Browse Products <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isExpanded = expandedOrder === order.id;
            const currentStep = statusSteps.indexOf(order.status);

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:border-neutral-200 transition-all">
                {/* Order header */}
                <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full p-5 flex items-center gap-4 text-left">
                  <div className="hidden sm:flex w-14 h-14 rounded-xl bg-neutral-50 items-center justify-center flex-shrink-0">
                    {order.items?.[0]?.image ? (
                      <img src={order.items[0].image} alt="" className="w-10 h-10 object-contain" />
                    ) : (
                      <Package className="w-6 h-6 text-neutral-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-neutral-800">#{order.trackingNumber || order.id}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full capitalize ${status.color}`}>
                        <StatusIcon className="w-3 h-3" /> {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-neutral-400">
                      <span>{new Date(order.createdAt).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      <span>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-neutral-900 font-display">${(order.total || 0).toFixed(2)}</p>
                  </div>

                  <ChevronRight className={`w-4 h-4 text-neutral-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-neutral-100 pt-4 space-y-5 animate-fade-up">
                    {/* Progress tracker */}
                    {order.status !== 'cancelled' && (
                      <div className="flex items-center justify-between relative px-4">
                        <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-neutral-100" />
                        <div className="absolute top-3.5 left-4 h-0.5 bg-brand-500 transition-all" style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }} />
                        {statusSteps.map((s, i) => (
                          <div key={s} className="relative flex flex-col items-center z-10">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${i <= currentStep ? 'bg-brand-500 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                              {i < currentStep ? <Check className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            <span className={`text-[10px] mt-1 capitalize ${i <= currentStep ? 'text-brand-600 font-medium' : 'text-neutral-400'}`}>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-2">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                          <div className="w-12 h-12 bg-white rounded-lg overflow-hidden flex-shrink-0">
                            <img src={item.image} alt="" className="w-full h-full object-contain p-1.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-800 truncate">{item.name}</p>
                            <p className="text-xs text-neutral-400">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-bold text-neutral-800">${((item.price || 0) * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                      <div className="text-xs text-neutral-400 space-y-1">
                        {order.shippingAddress && (
                          <p>Ship to: {order.shippingAddress.city}, {order.shippingAddress.country}</p>
                        )}
                        {order.estimatedDelivery && (
                          <p>Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}</p>
                        )}
                        <p>Payment: <span className="capitalize">{order.paymentMethod?.replace(/_/g, ' ')}</span></p>
                      </div>
                      <div className="text-right text-sm space-y-0.5">
                        <p className="text-neutral-400">Subtotal: ${(order.subtotal || 0).toFixed(2)}</p>
                        <p className="text-neutral-400">Shipping: {order.shipping === 0 ? 'Free' : `$${(order.shipping || 0).toFixed(2)}`}</p>
                        <p className="font-bold text-neutral-900">Total: ${(order.total || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
