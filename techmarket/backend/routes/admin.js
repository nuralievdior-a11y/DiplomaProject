const express = require('express');
const { authenticate, isAdmin } = require('../middleware/auth');

module.exports = (db, saveDb) => {
  const router = express.Router();

  // Users management
  router.get('/users', authenticate, isAdmin, (req, res) => {
    let users = db.users.map(({ password, ...u }) => u);
    if (req.query.search) { const s = req.query.search.toLowerCase(); users = users.filter(u => u.firstName.toLowerCase().includes(s) || u.lastName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)); }
    if (req.query.role) users = users.filter(u => u.role === req.query.role);
    const page = parseInt(req.query.page) || 1, limit = parseInt(req.query.limit) || 10, start = (page - 1) * limit;
    res.json({ users: users.slice(start, start + limit), pagination: { page, limit, total: users.length, totalPages: Math.ceil(users.length / limit) } });
  });

  router.put('/users/:id', authenticate, isAdmin, (req, res) => {
    const idx = db.users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found.' });
    if (req.body.role) db.users[idx].role = req.body.role;
    if (req.body.isActive !== undefined) db.users[idx].isActive = req.body.isActive;
    saveDb();
    const { password, ...safe } = db.users[idx];
    res.json(safe);
  });

  // Dashboard overview
  router.get('/dashboard', authenticate, isAdmin, (req, res) => {
    const totalProducts = db.products.filter(p => p.isActive).length;
    const totalUsers = db.users.filter(u => u.role === 'customer').length;
    const totalOrders = db.orders.length;
    const totalRevenue = db.orders.reduce((s, o) => s + o.total, 0);
    const pendingOrders = db.orders.filter(o => ['pending', 'processing'].includes(o.status)).length;
    const lowStockProducts = db.products.filter(p => p.isActive && p.stock < 10).length;
    const ordersByStatus = {}; db.orders.forEach(o => { ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1; });
    const categoryDistribution = db.categories.filter(c => c.isActive).map(cat => ({ name: cat.name, count: db.products.filter(p => p.categoryId === cat.id && p.isActive).length }));
    const recentOrders = [...db.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8).map(o => {
      const u = db.users.find(usr => usr.id === o.userId);
      return { ...o, userName: u ? `${u.firstName} ${u.lastName}` : 'Unknown' };
    });
    res.json({ totalProducts, totalUsers, totalOrders, totalRevenue: +totalRevenue.toFixed(2), pendingOrders, lowStockProducts, ordersByStatus, categoryDistribution, recentOrders });
  });

  // Settings
  router.get('/settings', authenticate, isAdmin, (req, res) => { res.json(db.settings); });
  router.put('/settings', authenticate, isAdmin, (req, res) => { db.settings = { ...db.settings, ...req.body }; saveDb(); res.json(db.settings); });

  // Reviews management
  router.get('/reviews', authenticate, isAdmin, (req, res) => {
    res.json(db.reviews.map(r => { const p = db.products.find(pr => pr.id === r.productId); return { ...r, productName: p ? p.name : 'Unknown' }; }));
  });
  router.delete('/reviews/:id', authenticate, isAdmin, (req, res) => {
    const idx = db.reviews.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found.' });
    db.reviews.splice(idx, 1); saveDb();
    res.json({ message: 'Deleted.' });
  });

  // Coupons
  router.get('/coupons', authenticate, isAdmin, (req, res) => { res.json(db.coupons); });
  router.post('/coupons', authenticate, isAdmin, (req, res) => {
    const cpn = { id: `cpn_${Date.now()}`, code: req.body.code.toUpperCase(), type: req.body.type || 'percentage', value: parseFloat(req.body.value), minOrder: parseFloat(req.body.minOrder) || 0, maxDiscount: parseFloat(req.body.maxDiscount) || 1000, usageLimit: parseInt(req.body.usageLimit) || 100, usedCount: 0, isActive: true, expiresAt: req.body.expiresAt };
    db.coupons.push(cpn); saveDb();
    res.status(201).json(cpn);
  });
  router.delete('/coupons/:id', authenticate, isAdmin, (req, res) => {
    const idx = db.coupons.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found.' });
    db.coupons.splice(idx, 1); saveDb();
    res.json({ message: 'Deleted.' });
  });

  return router;
};
