import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Package, ChevronRight, Truck, Check, Clock, XCircle, Search, ArrowLeft, ArrowRight, ChevronDown, SlidersHorizontal } from 'lucide-react';
import api from '../api';

const statusConfig = {
  pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmed: { color: 'bg-blue-100 text-blue-700', icon: Check },
  processing: { color: 'bg-indigo-100 text-indigo-700', icon: Package },
  shipped: { color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { color: 'bg-emerald-100 text-emerald-700', icon: Check },
  cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
  delivery_issue: { color: 'bg-rose-100 text-rose-700', icon: AlertTriangle },
};

const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const shortDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const status = (searchParams.get('status') || '').trim();
  const q = (searchParams.get('q') || '').trim();

  const setParam = (next) => {
    const sp = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => {
      if (v === null || v === undefined || String(v).trim() === '') sp.delete(k);
      else sp.set(k, String(v));
    });
    if (!sp.get('page')) sp.set('page', '1');
    setSearchParams(sp);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/orders', { params: { page, limit: 10, ...(status ? { status } : {}) } })
      .then((r) => {
        if (cancelled) return;
        setOrders(r.data.orders || r.data || []);
        setPagination(r.data.pagination || { page, limit: 10, total: (r.data.orders || r.data || []).length, totalPages: 1 });
      })
      .catch(() => {
        if (cancelled) return;
        setOrders([]);
        setPagination({ page, limit: 10, total: 0, totalPages: 1 });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, status]);

  const filteredOrders = useMemo(() => {
    if (!q) return orders;
    const needle = q.toLowerCase();
    return orders.filter((o) => {
      const id = String(o.id || '').toLowerCase();
      const tn = String(o.trackingNumber || '').toLowerCase();
      return id.includes(needle) || tn.includes(needle);
    });
  }, [orders, q]);

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

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display">My Orders</h1>
          <p className="text-sm text-neutral-400 mt-1">Track status and view order details anytime.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-4 sm:p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-500 transition-colors" />
              <input
                value={q}
                onChange={(e) => setParam({ q: e.target.value, page: 1 })}
                placeholder="Search by order id or tracking number..."
                className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="relative group">
              <SlidersHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-500 transition-colors" />
              <select
                value={status}
                onChange={(e) => setParam({ status: e.target.value, page: 1 })}
                className={[
                  'appearance-none w-full pl-11 pr-11 py-3',
                  status ? 'bg-brand-50 border border-brand-200' : 'bg-neutral-50 border border-neutral-200',
                  'rounded-2xl',
                  'text-sm focus:outline-none focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-500/10 transition-all',
                  status ? 'hover:bg-brand-50 hover:border-brand-300' : 'hover:bg-white hover:border-neutral-300',
                  'cursor-pointer',
                  status ? 'text-neutral-800' : 'text-neutral-500'
                ].join(' ')}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="delivery_issue">Delivery issue</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-500 transition-colors" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
          <p className="text-xs text-neutral-400">
            Showing <span className="text-neutral-700 font-semibold">{filteredOrders.length}</span> of{' '}
            <span className="text-neutral-700 font-semibold">{pagination.total || orders.length}</span> order(s)
          </p>
          {(q || status) && (
            <button
              onClick={() => setSearchParams(new URLSearchParams({ page: '1' }))}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-neutral-100 flex items-center justify-center mb-5">
            <Package className="w-9 h-9 text-neutral-300" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 font-display">{orders.length === 0 ? 'No orders yet' : 'No results'}</h2>
          <p className="text-sm text-neutral-400 mt-2">
            {orders.length === 0 ? 'Start shopping to see your orders here' : 'Try adjusting search or status filter'}
          </p>
          <Link to="/products" className="inline-flex items-center gap-2 btn-primary px-6 py-3 text-sm mt-6">
            Browse Products <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
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
                      <span>{shortDate(order.createdAt)}</span>
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
                    {order.status !== 'cancelled' && order.status !== 'delivery_issue' && (
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

                    {order.status === 'delivery_issue' && (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-white border border-rose-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-rose-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-rose-800">Delivery issue</p>
                            <p className="text-sm text-rose-700 mt-1">{order.deliveryIssue?.reason || 'We’ll update you soon.'}</p>
                          </div>
                        </div>
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
                    <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-neutral-100">
                      <div className="text-xs text-neutral-400 space-y-1">
                        {order.shippingAddress?.name && <p>Recipient: <span className="text-neutral-700 font-medium">{order.shippingAddress.name}</span></p>}
                        {order.shippingAddress?.city && <p>City: <span className="text-neutral-700 font-medium">{order.shippingAddress.city}</span></p>}
                        {order.shippingAddress?.address && <p className="truncate">Address: <span className="text-neutral-700 font-medium">{order.shippingAddress.address}</span></p>}
                        {order.estimatedDelivery && <p>Est. delivery: <span className="text-neutral-700 font-medium">{shortDate(order.estimatedDelivery)}</span></p>}
                        <p>Payment: <span className="capitalize text-neutral-700 font-medium">{order.paymentMethod?.replace(/_/g, ' ')}</span></p>
                      </div>
                      <div className="text-right text-sm space-y-0.5">
                        <p className="text-neutral-400">Subtotal: ${(order.subtotal || 0).toFixed(2)}</p>
                        <p className="text-neutral-400">Discount: -${(order.discount || 0).toFixed(2)}</p>
                        <p className="text-neutral-400">Shipping: {order.shipping === 0 ? 'Free' : `$${(order.shipping || 0).toFixed(2)}`}</p>
                        <p className="font-bold text-neutral-900">Total: ${(order.total || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <Link
                        to={`/orders/${order.id}`}
                        state={{ order }}
                        className="btn-outline px-5 py-2.5 text-sm"
                      >
                        View details
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {orders.length > 0 && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 mt-8">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setParam({ page: Math.max(1, pagination.page - 1) })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:border-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" /> Prev
          </button>
          <p className="text-xs text-neutral-400">
            Page <span className="text-neutral-700 font-semibold">{pagination.page}</span> of{' '}
            <span className="text-neutral-700 font-semibold">{pagination.totalPages}</span>
          </p>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setParam({ page: Math.min(pagination.totalPages, pagination.page + 1) })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:border-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
