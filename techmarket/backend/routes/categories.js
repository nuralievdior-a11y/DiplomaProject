const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, isAdmin } = require('../middleware/auth');
const { query } = require('../config/database');

const mapCategory = (row) => row && {
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  image: row.image,
  icon: row.icon,
  parentId: row.parent_id,
  isActive: row.is_active,
  order: row.order,
  productCount: row.product_count !== undefined ? parseInt(row.product_count) : 0,
};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

module.exports = () => {
  const router = express.Router();

  // GET / - barcha faol kategoriyalar + productCount
  router.get('/', async (req, res) => {
    try {
      const result = await query(
        `SELECT c.*,
                COUNT(p.id) FILTER (WHERE p.is_active = TRUE) AS product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         WHERE c.is_active = TRUE
         GROUP BY c.id
         ORDER BY c."order" ASC`
      );
      res.json(result.rows.map(mapCategory));
    } catch (err) {
      console.error('GET /categories error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /:id - id yoki slug bilan
  router.get('/:id', async (req, res) => {
    try {
      const result = await query(
        `SELECT c.*,
                COUNT(p.id) FILTER (WHERE p.is_active = TRUE) AS product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         WHERE c.id = $1 OR c.slug = $1
         GROUP BY c.id`,
        [req.params.id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Category not found.' });
      res.json(mapCategory(result.rows[0]));
    } catch (err) {
      console.error('GET /categories/:id error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // POST / (admin)
  router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
      const { name, description, image, icon, parentId } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required.' });

      const id = `cat_${uuidv4().slice(0, 6)}`;
      const slug = slugify(name);

      // Order: eng katta order + 1
      const maxRes = await query('SELECT COALESCE(MAX("order"), 0) AS max FROM categories');
      const nextOrder = parseInt(maxRes.rows[0].max) + 1;

      const result = await query(
        `INSERT INTO categories (id, name, slug, description, image, icon, parent_id, is_active, "order")
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8)
         RETURNING *`,
        [id, name, slug, description || null, image || null,
         icon || 'package', parentId || null, nextOrder]
      );
      res.status(201).json(mapCategory({ ...result.rows[0], product_count: 0 }));
    } catch (err) {
      console.error('POST /categories error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // PUT /:id (admin)
  router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
      const fieldMap = {
        name: 'name',
        description: 'description',
        image: 'image',
        icon: 'icon',
        parentId: 'parent_id',
        isActive: 'is_active',
        order: '"order"',
      };

      const sets = [];
      const params = [];

      for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
        if (req.body[jsKey] !== undefined) {
          params.push(req.body[jsKey]);
          sets.push(`${dbCol} = $${params.length}`);
        }
      }

      // Agar name o'zgarsa, slug ham yangilanadi
      if (req.body.name) {
        params.push(slugify(req.body.name));
        sets.push(`slug = $${params.length}`);
      }

      if (sets.length === 0)
        return res.status(400).json({ error: 'No fields to update.' });

      params.push(req.params.id);
      const result = await query(
        `UPDATE categories SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found.' });
      res.json(mapCategory(result.rows[0]));
    } catch (err) {
      console.error('PUT /categories/:id error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // DELETE /:id (admin) - soft delete
  router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
      const result = await query(
        'UPDATE categories SET is_active = FALSE WHERE id = $1 RETURNING id',
        [req.params.id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found.' });
      res.json({ message: 'Deleted.' });
    } catch (err) {
      console.error('DELETE /categories/:id error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  return router;
};
