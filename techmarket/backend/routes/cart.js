const express = require('express');
const { authenticate } = require('../middleware/auth');

module.exports = (db, saveDb) => {
  const router = express.Router();

  const normalizeCouponCode = (code) => String(code || '').trim().toUpperCase();

  const computeCouponDiscount = ({ subtotal, couponCode }) => {
    const code = normalizeCouponCode(couponCode);
    if (!code) return 0;

    const coupon = db.coupons.find(c => normalizeCouponCode(c.code) === code && c.isActive);
    if (!coupon) return 0;
    if (new Date(coupon.expiresAt) < new Date()) return 0;
    if (coupon.usedCount >= coupon.usageLimit) return 0;
    if (subtotal < (coupon.minOrder || 0)) return 0;

    const raw = coupon.type === 'percentage' ? (subtotal * coupon.value / 100) : coupon.value;
    const cap = typeof coupon.maxDiscount === 'number' ? coupon.maxDiscount : Infinity;
    return Math.max(0, Math.min(raw, cap));
  };

  const getCart = async (userId) => {
    let cart = db.carts.find(c => c.userId === userId);
    if (!cart) {
      cart = { userId, items: [], couponCode: null, updatedAt: new Date().toISOString() };
      db.carts.push(cart);
      await saveDb();
    }
    return cart;
  };

  const enrichCart = (cart) => {
    const items = cart.items.map(item => {
      const p = db.products.find(pr => pr.id === item.productId);
      if (!p) return null;
      return { ...item, name: p.name, price: p.price, comparePrice: p.comparePrice, image: p.images[0] || '', stock: p.stock, brand: p.brand };
    }).filter(Boolean);
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = computeCouponDiscount({ subtotal, couponCode: cart.couponCode });
    const shipping = subtotal >= (db.settings.freeShippingThreshold || 500) ? 0 : (db.settings.shippingRate || 9.99);
    const tax = (subtotal - discount) * ((db.settings.taxRate || 10) / 100);
    return {
      items,
      couponCode: cart.couponCode ? normalizeCouponCode(cart.couponCode) : null,
      subtotal: +subtotal.toFixed(2),
      discount: +discount.toFixed(2),
      shipping: +shipping.toFixed(2),
      tax: +tax.toFixed(2),
      total: +(subtotal - discount + shipping + tax).toFixed(2),
      itemCount: items.reduce((s, i) => s + i.quantity, 0)
    };
  };

  router.get('/', authenticate, async (req, res) => {
    const cart = await getCart(req.user.id);
    res.json(enrichCart(cart));
  });

  router.post('/add', authenticate, async (req, res) => {
    const { productId, quantity = 1 } = req.body;
    const product = db.products.find(p => p.id === productId && p.isActive);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock.' });

    let cartIdx = db.carts.findIndex(c => c.userId === req.user.id);
    if (cartIdx === -1) { db.carts.push({ userId: req.user.id, items: [], couponCode: null, updatedAt: new Date().toISOString() }); cartIdx = db.carts.length - 1; }

    const itemIdx = db.carts[cartIdx].items.findIndex(i => i.productId === productId);
    if (itemIdx > -1) {
      const newQty = db.carts[cartIdx].items[itemIdx].quantity + quantity;
      if (newQty > product.stock) return res.status(400).json({ error: 'Insufficient stock.' });
      db.carts[cartIdx].items[itemIdx].quantity = newQty;
    } else {
      db.carts[cartIdx].items.push({ productId, quantity });
    }
    db.carts[cartIdx].updatedAt = new Date().toISOString();
    await saveDb();
    res.json({ message: 'Added to cart.', cart: enrichCart(db.carts[cartIdx]) });
  });

  router.put('/update', authenticate, async (req, res) => {
    const { productId, quantity } = req.body;
    const cartIdx = db.carts.findIndex(c => c.userId === req.user.id);
    if (cartIdx === -1) return res.status(404).json({ error: 'Cart not found.' });
    if (quantity <= 0) {
      db.carts[cartIdx].items = db.carts[cartIdx].items.filter(i => i.productId !== productId);
    } else {
      const itemIdx = db.carts[cartIdx].items.findIndex(i => i.productId === productId);
      if (itemIdx > -1) db.carts[cartIdx].items[itemIdx].quantity = quantity;
    }
    await saveDb();
    res.json({ message: 'Cart updated.', cart: enrichCart(db.carts[cartIdx]) });
  });

  router.delete('/remove/:productId', authenticate, async (req, res) => {
    const cartIdx = db.carts.findIndex(c => c.userId === req.user.id);
    if (cartIdx === -1) return res.status(404).json({ error: 'Cart not found.' });
    db.carts[cartIdx].items = db.carts[cartIdx].items.filter(i => i.productId !== req.params.productId);
    await saveDb();
    res.json({ message: 'Removed.', cart: enrichCart(db.carts[cartIdx]) });
  });

  router.delete('/clear', authenticate, async (req, res) => {
    const cartIdx = db.carts.findIndex(c => c.userId === req.user.id);
    if (cartIdx > -1) {
      db.carts[cartIdx].items = [];
      db.carts[cartIdx].couponCode = null;
      await saveDb();
    }
    res.json({ message: 'Cart cleared.' });
  });

  router.post('/coupon', authenticate, async (req, res) => {
    const code = normalizeCouponCode(req.body?.code);
    if (!code) return res.status(400).json({ error: 'Coupon code required.' });

    const coupon = db.coupons.find(c => normalizeCouponCode(c.code) === code && c.isActive);
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon.' });
    if (new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ error: 'Coupon expired.' });
    if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ error: 'Coupon limit reached.' });

    const cart = await getCart(req.user.id);
    const enrichedBefore = enrichCart(cart);
    if ((coupon.minOrder || 0) > 0 && enrichedBefore.subtotal < coupon.minOrder) {
      return res.status(400).json({ error: `Minimum order is $${Number(coupon.minOrder).toFixed(2)}.` });
    }

    cart.couponCode = coupon.code;
    cart.updatedAt = new Date().toISOString();
    await saveDb();
    res.json(enrichCart(cart));
  });

  router.delete('/coupon', authenticate, async (req, res) => {
    const cart = await getCart(req.user.id);
    cart.couponCode = null;
    cart.updatedAt = new Date().toISOString();
    await saveDb();
    res.json(enrichCart(cart));
  });

  return router;
};
