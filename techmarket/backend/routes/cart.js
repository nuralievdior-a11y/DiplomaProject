const express = require('express');
const { authenticate } = require('../middleware/auth');
const { query, pool } = require('../config/database');

async function getSettings() {
  const r = await query("SELECT key, value FROM settings WHERE key IN ('taxRate','shippingRate','freeShippingThreshold')");
  const out = { taxRate: 10, shippingRate: 9.99, freeShippingThreshold: 500 };
  for (const row of r.rows) {
    const v = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    out[row.key] = v;
  }
  return out;
}

async function ensureCart(userId) {
  await query(
    `INSERT INTO carts (user_id, updated_at) VALUES ($1, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function buildCart(userId) {
  const itemsRes = await query(
    `SELECT ci.product_id, ci.quantity,
            p.name, p.price, p.compare_price, p.images, p.stock, p.brand
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1
     ORDER BY ci.added_at ASC`,
    [userId]
  );
  const items = itemsRes.rows.map(r => ({
    productId: r.product_id,
    quantity: r.quantity,
    name: r.name,
    price: parseFloat(r.price),
    comparePrice: r.compare_price ? parseFloat(r.compare_price) : null,
    image: (r.images && r.images[0]) || '',
    stock: r.stock,
    brand: r.brand,
  }));

  const settings = await getSettings();
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingRate;
  const tax = subtotal * (settings.taxRate / 100);
  return {
    items,
    subtotal: +subtotal.toFixed(2),
    shipping: +shipping.toFixed(2),
    tax: +tax.toFixed(2),
    total: +(subtotal + shipping + tax).toFixed(2),
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
  };
}

module.exports = () => {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      await ensureCart(req.user.id);
      res.json(await buildCart(req.user.id));
    } catch (err) {
      console.error('GET /cart:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  router.post('/add', authenticate, async (req, res) => {
    try {
      const { productId, quantity = 1 } = req.body;
      const p = await query('SELECT * FROM products WHERE id = $1 AND is_active = TRUE', [productId]);
      if (!p.rows[0]) return res.status(404).json({ error: 'Product not found.' });
      if (p.rows[0].stock < quantity) return res.status(400).json({ error: 'Insufficient stock.' });

      await ensureCart(req.user.id);

      const existing = await query(
        'SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [req.user.id, productId]
      );
      if (existing.rows[0]) {
        const newQty = existing.rows[0].quantity + quantity;
        if (newQty > p.rows[0].stock) return res.status(400).json({ error: 'Insufficient stock.' });
        await query(
          'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3',
          [newQty, req.user.id, productId]
        );
      } else {
        await query(
          'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
          [req.user.id, productId, quantity]
        );
      }
      await query('UPDATE carts SET updated_at = NOW() WHERE user_id = $1', [req.user.id]);

      res.json({ message: 'Added to cart.', cart: await buildCart(req.user.id) });
    } catch (err) {
      console.error('POST /cart/add:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  router.put('/update', authenticate, async (req, res) => {
    try {
      const { productId, quantity } = req.body;
      if (quantity <= 0) {
        await query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
          [req.user.id, productId]);
      } else {
        await query(
          'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3',
          [quantity, req.user.id, productId]
        );
      }
      res.json({ message: 'Cart updated.', cart: await buildCart(req.user.id) });
    } catch (err) {
      console.error('PUT /cart/update:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  router.delete('/remove/:productId', authenticate, async (req, res) => {
    try {
      await query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [req.user.id, req.params.productId]);
      res.json({ message: 'Removed.', cart: await buildCart(req.user.id) });
    } catch (err) {
      console.error('DELETE /cart/remove:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  router.delete('/clear', authenticate, async (req, res) => {
    try {
      await query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
      res.json({ message: 'Cart cleared.' });
    } catch (err) {
      console.error('DELETE /cart/clear:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  router.post('/coupon', authenticate, async (req, res) => {
    try {
      const r = await query(
        'SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE',
        [req.body.code]
      );
      const coupon = r.rows[0];
      if (!coupon) return res.status(404).json({ error: 'Invalid coupon.' });
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
        return res.status(400).json({ error: 'Coupon expired.' });
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit)
        return res.status(400).json({ error: 'Coupon limit reached.' });

      res.json({
        code: coupon.code,
        type: coupon.type,
        value: parseFloat(coupon.value),
        minOrder: parseFloat(coupon.min_order),
        maxDiscount: coupon.max_discount ? parseFloat(coupon.max_discount) : null,
      });
    } catch (err) {
      console.error('POST /cart/coupon:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  return router;
};
