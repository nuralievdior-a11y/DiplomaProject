const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, isAdmin } = require('../middleware/auth');
const { query, pool } = require('../config/database');

const mapOrder = (row) => row && {
  id: row.id,
  userId: row.user_id,
  subtotal: parseFloat(row.subtotal),
  discount: parseFloat(row.discount),
  shipping: parseFloat(row.shipping),
  tax: parseFloat(row.tax),
  total: parseFloat(row.total),
  status: row.status,
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  shippingAddress: row.shipping_address,
  trackingNumber: row.tracking_number,
  estimatedDelivery: row.estimated_delivery,
  deliveredAt: row.delivered_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
};

const mapItem = (row) => ({
  productId: row.product_id,
  name: row.name,
  price: parseFloat(row.price),
  quantity: row.quantity,
  image: row.image,
});

async function getOrderItems(orderId) {
  const r = await query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
  return r.rows.map(mapItem);
}

async function getSettings() {
  const r = await query("SELECT key, value FROM settings WHERE key IN ('taxRate','shippingRate','freeShippingThreshold')");
  const out = { taxRate: 10, shippingRate: 9.99, freeShippingThreshold: 500 };
  for (const row of r.rows) {
    const v = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    out[row.key] = v;
  }
  return out;
}

module.exports = () => {
  const router = express.Router();

  // GET / - foydalanuvchi orders, admin barchasini all=true bilan
  router.get('/', authenticate, async (req, res) => {
    try {
      const { status, page = 1, limit = 10, all } = req.query;
      const isAdminQuery = req.user.role === 'admin' && all === 'true';

      const where = [];
      const params = [];
      if (!isAdminQuery) {
        params.push(req.user.id);
        where.push(`o.user_id = $${params.length}`);
      }
      if (status) {
        params.push(status);
        where.push(`o.status = $${params.length}`);
      }
      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

      const countRes = await query(`SELECT COUNT(*) FROM orders o ${whereClause}`, params);
      const total = parseInt(countRes.rows[0].count);

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);
      const dataRes = await query(
        `SELECT o.*, u.first_name, u.last_name
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      const orders = await Promise.all(dataRes.rows.map(async (r) => ({
        ...mapOrder(r),
        items: await getOrderItems(r.id),
        userName: r.first_name ? `${r.first_name} ${r.last_name}` : 'Unknown',
      })));

      res.json({
        orders,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (err) {
      console.error('GET /orders:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /stats - admin
  router.get('/stats', authenticate, isAdmin, async (req, res) => {
    try {
      const totals = await query(`
        SELECT COUNT(*) AS total,
               COALESCE(SUM(total),0) AS revenue,
               COUNT(DISTINCT user_id) AS customers
        FROM orders`);

      const statusRes = await query(`SELECT status, COUNT(*) FROM orders GROUP BY status`);
      const statusCounts = {};
      for (const r of statusRes.rows) statusCounts[r.status] = parseInt(r.count);

      const monthlyRes = await query(`
        SELECT TO_CHAR(date_trunc('month', created_at), 'Mon YYYY') AS month,
               date_trunc('month', created_at) AS m,
               COUNT(*) AS orders,
               COALESCE(SUM(total),0) AS revenue
        FROM orders
        WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY m
        ORDER BY m ASC`);

      const topProducts = await query(`
        SELECT product_id AS id, MAX(name) AS name,
               SUM(quantity) AS qty,
               SUM(price * quantity) AS rev
        FROM order_items
        WHERE product_id IS NOT NULL
        GROUP BY product_id
        ORDER BY rev DESC
        LIMIT 5`);

      const totalProducts = await query("SELECT COUNT(*) FROM products WHERE is_active = TRUE");

      const t = totals.rows[0];
      const total = parseInt(t.total);
      const revenue = parseFloat(t.revenue);

      res.json({
        totalOrders: total,
        totalRevenue: +revenue.toFixed(2),
        avgOrderValue: total ? +(revenue / total).toFixed(2) : 0,
        totalCustomers: parseInt(t.customers),
        totalProducts: parseInt(totalProducts.rows[0].count),
        statusCounts,
        monthlyRevenue: monthlyRes.rows.map(r => ({
          month: r.month,
          revenue: +parseFloat(r.revenue).toFixed(2),
          orders: parseInt(r.orders),
        })),
        topProducts: topProducts.rows.map(r => ({
          id: r.id,
          name: r.name,
          qty: parseInt(r.qty),
          rev: +parseFloat(r.rev).toFixed(2),
        })),
      });
    } catch (err) {
      console.error('GET /orders/stats:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /:id
  router.get('/:id', authenticate, async (req, res) => {
    try {
      const r = await query(
        `SELECT o.*, u.first_name, u.last_name
         FROM orders o LEFT JOIN users u ON u.id = o.user_id
         WHERE o.id = $1`,
        [req.params.id]
      );
      const row = r.rows[0];
      if (!row) return res.status(404).json({ error: 'Not found.' });
      if (req.user.role !== 'admin' && row.user_id !== req.user.id)
        return res.status(403).json({ error: 'Access denied.' });

      res.json({
        ...mapOrder(row),
        items: await getOrderItems(row.id),
        userName: row.first_name ? `${row.first_name} ${row.last_name}` : 'Unknown',
      });
    } catch (err) {
      console.error('GET /orders/:id:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // POST / - yangi order (transaksiya bilan)
  router.post('/', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
      const { shippingAddress, paymentMethod, couponCode, payment } = req.body;
      if (!shippingAddress || !paymentMethod)
        return res.status(400).json({ error: 'Address and payment required.' });

      if (payment && payment.status === 'failed')
        return res.status(402).json({ error: 'Payment failed.' });

      await client.query('BEGIN');

      // Cart items olish
      const cartRes = await client.query(
        `SELECT ci.product_id, ci.quantity, p.name, p.price, p.images, p.stock, p.is_active
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         WHERE ci.user_id = $1`,
        [req.user.id]
      );
      if (cartRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cart is empty.' });
      }

      // Stock va is_active tekshirish
      const items = [];
      for (const ci of cartRes.rows) {
        if (!ci.is_active) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `${ci.product_id} unavailable.` });
        }
        if (ci.stock < ci.quantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Insufficient stock for ${ci.name}.` });
        }
        items.push({
          productId: ci.product_id,
          name: ci.name,
          price: parseFloat(ci.price),
          quantity: ci.quantity,
          image: (ci.images && ci.images[0]) || '',
        });
      }

      // Settings
      const setRes = await client.query("SELECT key, value FROM settings WHERE key IN ('taxRate','shippingRate','freeShippingThreshold')");
      const settings = { taxRate: 10, shippingRate: 9.99, freeShippingThreshold: 500 };
      for (const row of setRes.rows) {
        const v = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        settings[row.key] = v;
      }

      // Hisob-kitob
      let subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      let discount = 0;
      let appliedCoupon = null;

      if (couponCode) {
        const cpnRes = await client.query(
          'SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE FOR UPDATE',
          [couponCode]
        );
        const cpn = cpnRes.rows[0];
        if (cpn && subtotal >= parseFloat(cpn.min_order)) {
          const value = parseFloat(cpn.value);
          const maxD = cpn.max_discount ? parseFloat(cpn.max_discount) : Infinity;
          discount = cpn.type === 'percentage'
            ? Math.min(subtotal * value / 100, maxD)
            : Math.min(value, maxD);
          appliedCoupon = cpn;
        }
      }

      const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingRate;
      const tax = (subtotal - discount) * (settings.taxRate / 100);
      const total = subtotal - discount + shipping + tax;

      const orderId = `ord_${uuidv4().slice(0, 6)}`;
      const orderCountRes = await client.query('SELECT COUNT(*) FROM orders');
      const orderNum = parseInt(orderCountRes.rows[0].count) + 1;
      const trackingNumber = `TM-${new Date().getFullYear()}-${String(orderNum).padStart(5, '0')}`;
      const estDelivery = new Date();
      estDelivery.setDate(estDelivery.getDate() + 7);

      // Order yaratish
      await client.query(
        `INSERT INTO orders (id, user_id, subtotal, discount, shipping, tax, total,
                             status, payment_method, payment_status, shipping_address,
                             tracking_number, estimated_delivery, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,'paid',$9,$10,$11,NOW(),NOW())`,
        [orderId, req.user.id,
         subtotal.toFixed(2), discount.toFixed(2), shipping.toFixed(2), tax.toFixed(2), total.toFixed(2),
         paymentMethod, JSON.stringify(shippingAddress), trackingNumber, estDelivery]
      );

      // Order items
      for (const i of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, name, price, quantity, image)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [orderId, i.productId, i.name, i.price, i.quantity, i.image]
        );
        // Stock kamaytirish
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [i.quantity, i.productId]
        );
      }

      // Coupon used_count oshirish
      if (appliedCoupon) {
        await client.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1',
          [appliedCoupon.id]);
      }

      // Cart tozalash
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);

      await client.query('COMMIT');

      // Response
      const orderRes = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
      res.status(201).json({
        ...mapOrder(orderRes.rows[0]),
        items,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('POST /orders:', err);
      res.status(500).json({ error: 'Server error.' });
    } finally {
      client.release();
    }
  });

  // PUT /:id/status - admin
  router.put('/:id/status', authenticate, isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
      const { status, reason } = req.body;
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'delivery_issue'];
      if (!validStatuses.includes(status))
        return res.status(400).json({ error: 'Invalid status.' });
      if (status === 'delivery_issue' && (!reason || String(reason).trim() === ''))
        return res.status(400).json({ error: 'Delivery issue reason required.' });

      await client.query('BEGIN');

      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE',
        [req.params.id]);
      if (!orderRes.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found.' });
      }

      const fields = ['status = $1', 'updated_at = NOW()'];
      const params = [status];

      if (status === 'delivered') {
        fields.push('delivered_at = NOW()');
      }

      // Cancel - stock qaytarish
      if (status === 'cancelled') {
        const itemsRes = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [req.params.id]
        );
        for (const i of itemsRes.rows) {
          if (i.product_id) {
            await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2',
              [i.quantity, i.product_id]);
          }
        }
      }

      params.push(req.params.id);
      const updRes = await client.query(
        `UPDATE orders SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );

      await client.query('COMMIT');

      res.json({
        ...mapOrder(updRes.rows[0]),
        items: await getOrderItems(req.params.id),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('PUT /orders/:id/status:', err);
      res.status(500).json({ error: 'Server error.' });
    } finally {
      client.release();
    }
  });

  return router;
};
