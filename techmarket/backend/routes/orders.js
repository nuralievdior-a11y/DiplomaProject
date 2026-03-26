const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, isAdmin } = require('../middleware/auth');

module.exports = (db, saveDb) => {
  const router = express.Router();

  router.get('/', authenticate, (req, res) => {
    let orders = (req.user.role === 'admin' && req.query.all === 'true') ? [...db.orders] : db.orders.filter(o => o.userId === req.user.id);
    if (req.query.status) orders = orders.filter(o => o.status === req.query.status);
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const page = parseInt(req.query.page) || 1, limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;
    const enriched = orders.slice(start, start + limit).map(o => {
      const user = db.users.find(u => u.id === o.userId);
      return { ...o, userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown' };
    });
    res.json({ orders: enriched, pagination: { page, limit, total: orders.length, totalPages: Math.ceil(orders.length / limit) } });
  });

  router.get('/stats', authenticate, isAdmin, (req, res) => {
    const total = db.orders.length;
    const revenue = db.orders.reduce((s, o) => s + o.total, 0);
    const statusCounts = {}; db.orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const mo = db.orders.filter(o => { const od = new Date(o.createdAt); return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear(); });
      monthly.push({ month: d.toLocaleString('en', { month: 'short', year: 'numeric' }), revenue: +mo.reduce((s, o) => s + o.total, 0).toFixed(2), orders: mo.length });
    }
    const productSales = {};
    db.orders.forEach(o => o.items.forEach(i => {
      if (!productSales[i.productId]) productSales[i.productId] = { name: i.name, qty: 0, rev: 0 };
      productSales[i.productId].qty += i.quantity; productSales[i.productId].rev += i.price * i.quantity;
    }));
    res.json({ totalOrders: total, totalRevenue: +revenue.toFixed(2), avgOrderValue: total ? +(revenue / total).toFixed(2) : 0, totalCustomers: new Set(db.orders.map(o => o.userId)).size, totalProducts: db.products.filter(p => p.isActive).length, statusCounts, monthlyRevenue: monthly, topProducts: Object.entries(productSales).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.rev - a.rev).slice(0, 5) });
  });

  router.get('/:id', authenticate, (req, res) => {
    const order = db.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found.' });
    if (req.user.role !== 'admin' && order.userId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
    const user = db.users.find(u => u.id === order.userId);
    res.json({ ...order, userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown' });
  });

  router.post('/', authenticate, (req, res) => {
    const { shippingAddress, paymentMethod, couponCode } = req.body;
    if (!shippingAddress || !paymentMethod) return res.status(400).json({ error: 'Address and payment required.' });
    const cart = db.carts.find(c => c.userId === req.user.id);
    if (!cart || !cart.items.length) return res.status(400).json({ error: 'Cart is empty.' });

    const orderItems = [];
    for (const ci of cart.items) {
      const p = db.products.find(pr => pr.id === ci.productId);
      if (!p || !p.isActive) return res.status(400).json({ error: `${ci.productId} unavailable.` });
      if (p.stock < ci.quantity) return res.status(400).json({ error: `Insufficient stock for ${p.name}.` });
      orderItems.push({ productId: p.id, name: p.name, price: p.price, quantity: ci.quantity, image: p.images[0] || '' });
    }

    let subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0), discount = 0;
    if (couponCode) {
      const cpn = db.coupons.find(c => c.code === couponCode && c.isActive);
      if (cpn && subtotal >= cpn.minOrder) {
        discount = cpn.type === 'percentage' ? Math.min(subtotal * cpn.value / 100, cpn.maxDiscount) : Math.min(cpn.value, cpn.maxDiscount);
        cpn.usedCount++;
      }
    }
    const shipping = subtotal >= (db.settings.freeShippingThreshold || 500) ? 0 : (db.settings.shippingRate || 9.99);
    const tax = (subtotal - discount) * ((db.settings.taxRate || 10) / 100);
    const est = new Date(); est.setDate(est.getDate() + 7);

    const order = {
      id: `ord_${uuidv4().slice(0, 6)}`, userId: req.user.id, items: orderItems,
      subtotal: +subtotal.toFixed(2), discount: +discount.toFixed(2), shipping: +shipping.toFixed(2),
      tax: +tax.toFixed(2), total: +(subtotal - discount + shipping + tax).toFixed(2),
      status: 'pending', paymentMethod, paymentStatus: 'paid', shippingAddress,
      trackingNumber: `TM-${new Date().getFullYear()}-${String(db.orders.length + 1).padStart(5, '0')}`,
      estimatedDelivery: est.toISOString(), deliveredAt: null, couponCode: couponCode || null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };

    orderItems.forEach(i => { const pi = db.products.findIndex(p => p.id === i.productId); if (pi > -1) db.products[pi].stock -= i.quantity; });
    const ci = db.carts.findIndex(c => c.userId === req.user.id); if (ci > -1) db.carts[ci].items = [];
    db.orders.push(order);
    saveDb();
    res.status(201).json(order);
  });

  router.put('/:id/status', authenticate, isAdmin, (req, res) => {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status))
      return res.status(400).json({ error: 'Invalid status.' });
    const idx = db.orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found.' });
    db.orders[idx].status = status;
    db.orders[idx].updatedAt = new Date().toISOString();
    if (status === 'delivered') db.orders[idx].deliveredAt = new Date().toISOString();
    if (status === 'cancelled') db.orders[idx].items.forEach(i => { const pi = db.products.findIndex(p => p.id === i.productId); if (pi > -1) db.products[pi].stock += i.quantity; });
    saveDb();
    res.json(db.orders[idx]);
  });

  return router;
};
