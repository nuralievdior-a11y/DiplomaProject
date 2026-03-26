const express = require('express');
const { authenticate } = require('../middleware/auth');

module.exports = (db, saveDb) => {
  const router = express.Router();

  const getCart = (userId) => {
    let cart = db.carts.find(c => c.userId === userId);
    if (!cart) { cart = { userId, items: [], updatedAt: new Date().toISOString() }; db.carts.push(cart); saveDb(); }
    return cart;
  };

  const enrichCart = (cart) => {
    const items = cart.items.map(item => {
      const p = db.products.find(pr => pr.id === item.productId);
      if (!p) return null;
      return { ...item, name: p.name, price: p.price, comparePrice: p.comparePrice, image: p.images[0] || '', stock: p.stock, brand: p.brand };
    }).filter(Boolean);
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const shipping = subtotal >= (db.settings.freeShippingThreshold || 500) ? 0 : (db.settings.shippingRate || 9.99);
    const tax = subtotal * ((db.settings.taxRate || 10) / 100);
    return { items, subtotal: +subtotal.toFixed(2), shipping: +shipping.toFixed(2), tax: +tax.toFixed(2), total: +(subtotal + shipping + tax).toFixed(2), itemCount: items.reduce((s, i) => s + i.quantity, 0) };
  };

  router.get('/', authenticate, (req, res) => { res.json(enrichCart(getCart(req.user.id))); });

  router.post('/add', authenticate, (req, res) => {
    const { productId, quantity = 1 } = req.body;
    const product = db.products.find(p => p.id === productId && p.isActive);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock.' });

    let cartIdx = db.carts.findIndex(c => c.userId === req.user.id);
    if (cartIdx === -1) { db.carts.push({ userId: req.user.id, items: [], updatedAt: new Date().toISOString() }); cartIdx = db.carts.length - 1; }

    const itemIdx = db.carts[cartIdx].items.findIndex(i => i.productId === productId);
    if (itemIdx > -1) {
      const newQty = db.carts[cartIdx].items[itemIdx].quantity + quantity;
      if (newQty > product.stock) return res.status(400).json({ error: 'Insufficient stock.' });
      db.carts[cartIdx].items[itemIdx].quantity = newQty;
    } else {
      db.carts[cartIdx].items.push({ productId, quantity });
    }
    db.carts[cartIdx].updatedAt = new Date().toISOString();
    saveDb();
    res.json({ message: 'Added to cart.', cart: enrichCart(db.carts[cartIdx]) });
  });

  router.put('/update', authenticate, (req, res) => {
    const { productId, quantity } = req.body;
    const cartIdx = db.carts.findIndex(c => c.userId === req.user.id);
    if (cartIdx === -1) return res.status(404).json({ error: 'Cart not found.' });
    if (quantity <= 0) {
      db.carts[cartIdx].items = db.carts[cartIdx].items.filter(i => i.productId !== productId);
    } else {
      const itemIdx = db.carts[cartIdx].items.findIndex(i => i.productId === productId);
      if (itemIdx > -1) db.carts[cartIdx].items[itemIdx].quantity = quantity;
    }
    saveDb();
    res.json({ message: 'Cart updated.', cart: enrichCart(db.carts[cartIdx]) });
  });

  router.delete('/remove/:productId', authenticate, (req, res) => {
    const cartIdx = db.carts.findIndex(c => c.userId === req.user.id);
    if (cartIdx === -1) return res.status(404).json({ error: 'Cart not found.' });
    db.carts[cartIdx].items = db.carts[cartIdx].items.filter(i => i.productId !== req.params.productId);
    saveDb();
    res.json({ message: 'Removed.', cart: enrichCart(db.carts[cartIdx]) });
  });

  router.delete('/clear', authenticate, (req, res) => {
    const cartIdx = db.carts.findIndex(c => c.userId === req.user.id);
    if (cartIdx > -1) { db.carts[cartIdx].items = []; saveDb(); }
    res.json({ message: 'Cart cleared.' });
  });

  router.post('/coupon', authenticate, (req, res) => {
    const coupon = db.coupons.find(c => c.code === req.body.code && c.isActive);
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon.' });
    if (new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ error: 'Coupon expired.' });
    if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ error: 'Coupon limit reached.' });
    res.json({ code: coupon.code, type: coupon.type, value: coupon.value, minOrder: coupon.minOrder, maxDiscount: coupon.maxDiscount });
  });

  return router;
};
