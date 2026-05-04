const express = require('express');
const { authenticate, isAdmin } = require('../middleware/auth');
const { query } = require('../config/database');

const mapUser = (r) => r && {
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  email: r.email,
  role: r.role,
  phone: r.phone,
  avatar: r.avatar,
  isActive: r.is_active,
  createdAt: r.created_at,
};

const mapCoupon = (r) => r && {
  id: r.id,
  code: r.code,
  type: r.type,
  value: parseFloat(r.value),
  minOrder: parseFloat(r.min_order),
  maxDiscount: r.max_discount ? parseFloat(r.max_discount) : null,
  usageLimit: r.usage_limit,
  usedCount: r.used_count,
  isActive: r.is_active,
  expiresAt: r.expires_at,
};

const parseSettingValue = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

module.exports = () => {
  const router = express.Router();

  // GET /users - search, filter, pagination
  router.get('/users', authenticate, isAdmin, async (req, res) => {
    try {
      const { search, role, page = 1, limit = 10 } = req.query;
      const where = [];
      const params = [];

      if (search) {
        params.push(`%${search}%`);
        where.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
      }
      if (role) {
        params.push(role);
        where.push(`role = $${params.length}`);
      }
      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

      const countRes = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
      const total = parseInt(countRes.rows[0].count);

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);
      const r = await query(
        `SELECT * FROM users ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      res.json({
        users: r.rows.map(mapUser),
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (err) {
      console.error('GET /admin/users:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // PUT /users/:id - role va isActive
  router.put('/users/:id', authenticate, isAdmin, async (req, res) => {
    try {
      const sets = [];
      const params = [];
      if (req.body.role !== undefined) {
        params.push(req.body.role);
        sets.push(`role = $${params.length}`);
      }
      if (req.body.isActive !== undefined) {
        params.push(req.body.isActive);
        sets.push(`is_active = $${params.length}`);
      }
      if (sets.length === 0) return res.status(400).json({ error: 'No fields.' });

      sets.push('updated_at = NOW()');
      params.push(req.params.id);
      const r = await query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (!r.rows[0]) return res.status(404).json({ error: 'Not found.' });
      res.json(mapUser(r.rows[0]));
    } catch (err) {
      console.error('PUT /admin/users:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /dashboard
  router.get('/dashboard', authenticate, isAdmin, async (req, res) => {
    try {
      const productsRes = await query("SELECT COUNT(*) FROM products WHERE is_active = TRUE");
      const lowStockRes = await query("SELECT COUNT(*) FROM products WHERE is_active = TRUE AND stock < 10");
      const usersRes = await query("SELECT COUNT(*) FROM users WHERE role = 'customer'");
      const ordersRes = await query("SELECT COUNT(*) AS cnt, COALESCE(SUM(total),0) AS rev FROM orders");
      const pendingRes = await query("SELECT COUNT(*) FROM orders WHERE status IN ('pending','processing')");

      const statusRes = await query("SELECT status, COUNT(*) FROM orders GROUP BY status");
      const ordersByStatus = {};
      for (const row of statusRes.rows) ordersByStatus[row.status] = parseInt(row.count);

      const catRes = await query(`
        SELECT c.name, COUNT(p.id) FILTER (WHERE p.is_active = TRUE) AS count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        WHERE c.is_active = TRUE
        GROUP BY c.id, c.name
        ORDER BY c."order" ASC`);

      const recentRes = await query(`
        SELECT o.*, u.first_name, u.last_name
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT 8`);

      const recentOrders = recentRes.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        total: parseFloat(r.total),
        status: r.status,
        createdAt: r.created_at,
        userName: r.first_name ? `${r.first_name} ${r.last_name}` : 'Unknown',
      }));

      res.json({
        totalProducts: parseInt(productsRes.rows[0].count),
        totalUsers: parseInt(usersRes.rows[0].count),
        totalOrders: parseInt(ordersRes.rows[0].cnt),
        totalRevenue: +parseFloat(ordersRes.rows[0].rev).toFixed(2),
        pendingOrders: parseInt(pendingRes.rows[0].count),
        lowStockProducts: parseInt(lowStockRes.rows[0].count),
        ordersByStatus,
        categoryDistribution: catRes.rows.map(r => ({ name: r.name, count: parseInt(r.count) })),
        recentOrders,
      });
    } catch (err) {
      console.error('GET /admin/dashboard:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /settings
  router.get('/settings', authenticate, isAdmin, async (req, res) => {
    try {
      const r = await query('SELECT key, value FROM settings');
      const out = {};
      for (const row of r.rows) {
        out[row.key] = parseSettingValue(row.value);
      }
      res.json(out);
    } catch (err) {
      console.error('GET /admin/settings:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // PUT /settings
  router.put('/settings', authenticate, isAdmin, async (req, res) => {
    try {
      for (const [key, value] of Object.entries(req.body)) {
        await query(
          `INSERT INTO settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, JSON.stringify(value)]
        );
      }
      const r = await query('SELECT key, value FROM settings');
      const out = {};
      for (const row of r.rows) {
        out[row.key] = parseSettingValue(row.value);
      }
      res.json(out);
    } catch (err) {
      console.error('PUT /admin/settings:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /reviews
  router.get('/reviews', authenticate, isAdmin, async (req, res) => {
    try {
      const r = await query(`
        SELECT r.*, p.name AS product_name
        FROM reviews r
        LEFT JOIN products p ON p.id = r.product_id
        ORDER BY r.created_at DESC`);
      res.json(r.rows.map(row => ({
        id: row.id,
        productId: row.product_id,
        userId: row.user_id,
        userName: row.user_name,
        rating: row.rating,
        title: row.title,
        comment: row.comment,
        createdAt: row.created_at,
        productName: row.product_name || 'Unknown',
      })));
    } catch (err) {
      console.error('GET /admin/reviews:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // DELETE /reviews/:id
  router.delete('/reviews/:id', authenticate, isAdmin, async (req, res) => {
    try {
      const r = await query('DELETE FROM reviews WHERE id = $1 RETURNING id', [req.params.id]);
      if (!r.rows[0]) return res.status(404).json({ error: 'Not found.' });
      res.json({ message: 'Deleted.' });
    } catch (err) {
      console.error('DELETE /admin/reviews:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /coupons
  router.get('/coupons', authenticate, isAdmin, async (req, res) => {
    try {
      const r = await query('SELECT * FROM coupons ORDER BY id ASC');
      res.json(r.rows.map(mapCoupon));
    } catch (err) {
      console.error('GET /admin/coupons:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // POST /coupons
  router.post('/coupons', authenticate, isAdmin, async (req, res) => {
    try {
      const id = `cpn_${Date.now()}`;
      const r = await query(
        `INSERT INTO coupons (id, code, type, value, min_order, max_discount,
                              usage_limit, used_count, is_active, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,0,TRUE,$8) RETURNING *`,
        [id, req.body.code.toUpperCase(),
         req.body.type || 'percentage',
         parseFloat(req.body.value),
         parseFloat(req.body.minOrder) || 0,
         parseFloat(req.body.maxDiscount) || 1000,
         parseInt(req.body.usageLimit) || 100,
         req.body.expiresAt || null]
      );
      res.status(201).json(mapCoupon(r.rows[0]));
    } catch (err) {
      console.error('POST /admin/coupons:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // DELETE /coupons/:id
  router.delete('/coupons/:id', authenticate, isAdmin, async (req, res) => {
    try {
      const r = await query('DELETE FROM coupons WHERE id = $1 RETURNING id', [req.params.id]);
      if (!r.rows[0]) return res.status(404).json({ error: 'Not found.' });
      res.json({ message: 'Deleted.' });
    } catch (err) {
      console.error('DELETE /admin/coupons:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  return router;
};
