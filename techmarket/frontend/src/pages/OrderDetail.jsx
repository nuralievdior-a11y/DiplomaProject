import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  Package,
  Truck,
  XCircle
} from 'lucide-react';
import api from '../api';

const STATUS = {
  pending: { label: 'pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmed: { label: 'confirmed', color: 'bg-blue-100 text-blue-700', icon: Check },
  processing: { label: 'processing', color: 'bg-indigo-100 text-indigo-700', icon: Package },
  shipped: { label: 'shipped', color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { label: 'delivered', color: 'bg-emerald-100 text-emerald-700', icon: Check },
  cancelled: { label: 'cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  delivery_issue: { label: 'delivery issue', color: 'bg-rose-100 text-rose-700', icon: AlertTriangle }
};

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const money = (value) => {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
};

const shortDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const seeded = location.state?.order || null;

  const [order, setOrder] = useState(seeded);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    api.get(`/orders/${id}`)
      .then((r) => {
        if (cancelled) return;
        setOrder(r.data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) setNotFound(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  const statusCfg = useMemo(() => STATUS[order?.status] || STATUS.pending, [order?.status]);
  const StatusIcon = statusCfg.icon;
  const currentStep = useMemo(() => STATUS_STEPS.indexOf(order?.status), [order?.status]);
  const showTracker = order && order.status !== 'cancelled' && order.status !== 'delivery_issue';

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-5 w-56 skeleton rounded-lg mb-7" />
        <div className="h-10 w-80 skeleton rounded-2xl mb-6" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 skeleton rounded-3xl" />
            <div className="h-56 skeleton rounded-3xl" />
          </div>
          <div className="space-y-4">
            <div className="h-40 skeleton rounded-3xl" />
            <div className="h-56 skeleton rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center bg-white rounded-3xl border border-neutral-100 p-10">
          <Package className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 font-display">Order not found</h1>
          <p className="text-sm text-neutral-400 mt-2">This order does not exist or you don’t have access to it.</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => navigate('/orders')} className="btn-primary px-6 py-3 text-sm">Back to Orders</button>
            <Link to="/products" className="btn-outline px-6 py-3 text-sm">Browse Products</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-xs text-neutral-400 mb-6">
        <Link to="/" className="hover:text-neutral-600">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/orders" className="hover:text-neutral-600">My Orders</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-neutral-600">Order</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display">
            Order <span className="text-neutral-400">#{order.trackingNumber || order.id}</span>
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-neutral-500 flex-wrap">
            <span>Placed: <span className="text-neutral-700 font-medium">{shortDate(order.createdAt)}</span></span>
            {order.updatedAt && <span>Updated: <span className="text-neutral-700 font-medium">{shortDate(order.updatedAt)}</span></span>}
          </div>
        </div>

        <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full capitalize ${statusCfg.color}`}>
          <StatusIcon className="w-3.5 h-3.5" /> {STATUS[order.status]?.label || order.status}
        </span>
      </div>

      {order.status === 'delivery_issue' && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center border border-rose-100 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-rose-800">Delivery issue reported</p>
              <p className="text-sm text-rose-700 mt-1">{order.deliveryIssue?.reason || 'We’ll contact you with updates soon.'}</p>
              {order.deliveryIssue?.reportedAt && (
                <p className="text-xs text-rose-600 mt-2">Reported: {shortDate(order.deliveryIssue.reportedAt)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress tracker */}
          {showTracker && (
            <div className="bg-white rounded-3xl border border-neutral-100 p-6">
              <h2 className="text-sm font-bold text-neutral-900 font-display mb-4">Order status</h2>
              <div className="flex items-center justify-between relative px-2">
                <div className="absolute top-3.5 left-2 right-2 h-0.5 bg-neutral-100" />
                <div
                  className="absolute top-3.5 left-2 h-0.5 bg-brand-500 transition-all"
                  style={{ width: `${Math.max(0, currentStep) / (STATUS_STEPS.length - 1) * 100}%` }}
                />
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} className="relative flex flex-col items-center z-10">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${i <= currentStep ? 'bg-brand-500 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                      {i < currentStep ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 capitalize ${i <= currentStep ? 'text-brand-600 font-medium' : 'text-neutral-400'}`}>{s}</span>
                  </div>
                ))}
              </div>
              {order.estimatedDelivery && (
                <p className="text-xs text-neutral-400 mt-4">Estimated delivery: <span className="text-neutral-700 font-medium">{shortDate(order.estimatedDelivery)}</span></p>
              )}
              {order.deliveredAt && (
                <p className="text-xs text-neutral-400 mt-1">Delivered: <span className="text-neutral-700 font-medium">{shortDate(order.deliveredAt)}</span></p>
              )}
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-3xl border border-neutral-100 p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="text-sm font-bold text-neutral-900 font-display">Items</h2>
              <p className="text-xs text-neutral-400">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</p>
            </div>
            <div className="space-y-2">
              {order.items?.map((item, idx) => (
                <div key={`${item.productId || idx}-${idx}`} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-2xl">
                  <div className="w-12 h-12 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-neutral-100">
                    {item.image ? (
                      <img src={item.image} alt={item.name || ''} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-neutral-200" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 truncate">{item.name || 'Item'}</p>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-0.5">
                      <span>Qty: <span className="text-neutral-700 font-medium">{item.quantity || 0}</span></span>
                      <span>Price: <span className="text-neutral-700 font-medium">{money(item.price)}</span></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-neutral-900">{money((item.price || 0) * (item.quantity || 0))}</p>
                    {item.productId && (
                      <Link to={`/products/${item.productId}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                        View
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-6">
          {/* Shipping */}
          <div className="bg-white rounded-3xl border border-neutral-100 p-6">
            <h2 className="text-sm font-bold text-neutral-900 font-display mb-4">Shipping</h2>
            <div className="text-sm text-neutral-700 space-y-1">
              <p className="font-semibold text-neutral-900">{order.shippingAddress?.name || '—'}</p>
              {order.shippingAddress?.address && <p>{order.shippingAddress.address}</p>}
              {order.shippingAddress?.city && <p className="text-neutral-500">{order.shippingAddress.city}</p>}
              {order.shippingAddress?.phone && <p className="text-neutral-500">{order.shippingAddress.phone}</p>}
            </div>
          </div>

          {/* Payment + totals */}
          <div className="bg-white rounded-3xl border border-neutral-100 p-6">
            <h2 className="text-sm font-bold text-neutral-900 font-display mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-neutral-500">
                <span>Subtotal</span>
                <span className="text-neutral-800 font-medium">{money(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-500">
                <span>Discount</span>
                <span className="text-neutral-800 font-medium">-{money(order.discount)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-500">
                <span>Shipping</span>
                <span className="text-neutral-800 font-medium">{order.shipping === 0 ? 'Free' : money(order.shipping)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-500">
                <span>Tax</span>
                <span className="text-neutral-800 font-medium">{money(order.tax)}</span>
              </div>
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900">Total</span>
                <span className="text-lg font-bold text-neutral-900 font-display">{money(order.total)}</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-neutral-100 text-xs text-neutral-500 space-y-1">
              <p>Payment method: <span className="text-neutral-800 font-medium capitalize">{String(order.paymentMethod || '').replace(/_/g, ' ') || '—'}</span></p>
              <p>Payment status: <span className="text-neutral-800 font-medium capitalize">{order.paymentStatus || '—'}</span></p>
              {order.couponCode && <p>Coupon: <span className="text-neutral-800 font-medium">{order.couponCode}</span></p>}
            </div>

            <button onClick={() => navigate('/orders')} className="mt-6 w-full btn-outline py-3 text-sm">
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

