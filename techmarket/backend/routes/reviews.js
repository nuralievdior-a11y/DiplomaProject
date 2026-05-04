const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { query, pool } = require('../config/database');

const mapReview = (r) => r && {
  id: r.id,
  productId: r.product_id,
  userId: r.user_id,
  userName: r.user_name,
  rating: r.rating,
  title: r.title,
  comment: r.comment,
  createdAt: r.created_at,
};

const mapProduct = (row) => row && {
  id: row.id,
  name: row.name,
  slug: row.slug,
  price: parseFloat(row.price),
  comparePrice: row.compare_price ? parseFloat(row.compare_price) : null,
  images: row.images || [],
  brand: row.brand,
  rating: parseFloat(row.rating),
  stock: row.stock,
  isActive: row.is_active,
};

module.exports = () => {
  const router = express.Router();

  // GET /reviews/product/:productId
  router.get('/reviews/product/:productId', async (req, res) => {
    try {
      const r = await query(
        'SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC',
        [req.params.productId]
      );
      res.json(r.rows.map(mapReview));
    } catch (err) {
      console.error('GET reviews:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // POST /reviews - tranzaksiya bilan (review qo'shish + product rating yangilash)
  router.post('/reviews', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
      const { productId, rating, title, comment } = req.body;
      if (!productId || !rating)
        return res.status(400).json({ error: 'Product and rating required.' });

      await client.query('BEGIN');

      // User olish
      const userRes = await client.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [req.user.id]
      );
      if (!userRes.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found.' });
      }
      const u = userRes.rows[0];

      // Already reviewed?
      const exists = await client.query(
        'SELECT id FROM reviews WHERE product_id = $1 AND user_id = $2',
        [productId, req.user.id]
      );
      if (exists.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Already reviewed.' });
      }

      // Review qo'shish
      const id = `rev_${uuidv4().slice(0, 6)}`;
      const userName = `${u.first_name} ${u.last_name.charAt(0)}.`;
      const insRes = await client.query(
        `INSERT INTO reviews (id, product_id, user_id, user_name, rating, title, comment, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
        [id, productId, req.user.id, userName, parseInt(rating), title || null, comment || null]
      );

      // Product rating va review_count yangilash
      const aggRes = await client.query(
        'SELECT COUNT(*) AS cnt, AVG(rating) AS avg FROM reviews WHERE product_id = $1',
        [productId]
      );
      const { cnt, avg } = aggRes.rows[0];
      await client.query(
        'UPDATE products SET rating = $1, review_count = $2, updated_at = NOW() WHERE id = $3',
        [parseFloat(avg).toFixed(1), parseInt(cnt), productId]
      );

      await client.query('COMMIT');
      res.status(201).json(mapReview(insRes.rows[0]));
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('POST reviews:', err);
      res.status(500).json({ error: 'Server error.' });
    } finally {
      client.release();
    }
  });

  // GET /wishlist
  router.get('/wishlist', authenticate, async (req, res) => {
    try {
      const r = await query(
        `SELECT w.id, w.user_id, w.product_id, w.added_at,
                p.id AS p_id, p.name, p.slug, p.price, p.compare_price,
                p.images, p.brand, p.rating, p.stock, p.is_active
         FROM wishlist w
         JOIN products p ON p.id = w.product_id
         WHERE w.user_id = $1
         ORDER BY w.added_at DESC`,
        [req.user.id]
      );
      res.json(r.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
        addedAt: row.added_at,
        product: mapProduct({
          id: row.p_id, name: row.name, slug: row.slug,
          price: row.price, compare_price: row.compare_price,
          images: row.images, brand: row.brand, rating: row.rating,
          stock: row.stock, is_active: row.is_active,
        }),
      })));
    } catch (err) {
      console.error('GET wishlist:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // POST /wishlist
  router.post('/wishlist', authenticate, async (req, res) => {
    try {
      const { productId } = req.body;
      if (!productId) return res.status(400).json({ error: 'Product required.' });

      const exists = await query(
        'SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2',
        [req.user.id, productId]
      );
      if (exists.rows.length) return res.status(400).json({ error: 'Already in wishlist.' });

      const r = await query(
        `INSERT INTO wishlist (user_id, product_id, added_at)
         VALUES ($1, $2, NOW()) RETURNING *`,
        [req.user.id, productId]
      );
      res.status(201).json({
        id: r.rows[0].id,
        userId: r.rows[0].user_id,
        productId: r.rows[0].product_id,
        addedAt: r.rows[0].added_at,
      });
    } catch (err) {
      console.error('POST wishlist:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // DELETE /wishlist/:productId
  router.delete('/wishlist/:productId', authenticate, async (req, res) => {
    try {
      await query(
        'DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2',
        [req.user.id, req.params.productId]
      );
      res.json({ message: 'Removed.' });
    } catch (err) {
      console.error('DELETE wishlist:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  return router;
};
