const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, isAdmin } = require('../middleware/auth');
const { query } = require('../config/database');

const mapProduct = (row) => row && {
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  shortDescription: row.short_description,
  price: parseFloat(row.price),
  comparePrice: row.compare_price ? parseFloat(row.compare_price) : null,
  categoryId: row.category_id,
  brand: row.brand,
  sku: row.sku,
  stock: row.stock,
  images: row.images || [],
  specifications: row.specifications || {},
  features: row.features || [],
  rating: parseFloat(row.rating),
  reviewCount: row.review_count,
  isFeatured: row.is_featured,
  isNew: row.is_new,
  isActive: row.is_active,
  createdAt: row.created_at,
};

const mapReview = (row) => row && {
  id: row.id,
  productId: row.product_id,
  userId: row.user_id,
  userName: row.user_name,
  rating: row.rating,
  title: row.title,
  comment: row.comment,
  createdAt: row.created_at,
};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

module.exports = () => {
  const router = express.Router();

  // GET / - filter, search, sort, pagination
  router.get('/', async (req, res) => {
    try {
      const {
        search, category, brand, minPrice, maxPrice, minRating,
        featured, isNew, sortBy, sortOrder,
        page = 1, limit = 12
      } = req.query;

      const where = ['is_active = TRUE'];
      const params = [];

      if (search) {
        params.push(`%${search}%`);
        const i = params.length;
        where.push(`(name ILIKE $${i} OR description ILIKE $${i} OR brand ILIKE $${i})`);
      }
      if (category) {
        params.push(category);
        where.push(`category_id = $${params.length}`);
      }
      if (brand) {
        const brands = brand.split(',');
        params.push(brands);
        where.push(`brand = ANY($${params.length})`);
      }
      if (minPrice) {
        params.push(parseFloat(minPrice));
        where.push(`price >= $${params.length}`);
      }
      if (maxPrice) {
        params.push(parseFloat(maxPrice));
        where.push(`price <= $${params.length}`);
      }
      if (minRating) {
        params.push(parseFloat(minRating));
        where.push(`rating >= $${params.length}`);
      }
      if (featured === 'true') where.push('is_featured = TRUE');
      if (isNew === 'true') where.push('is_new = TRUE');

      // Sort - whitelist (SQL injection oldini olish)
      const sortMap = {
        price: 'price',
        name: 'name',
        rating: 'rating',
      };
      const orderCol = sortMap[sortBy] || 'created_at';
      const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
      const orderBy = sortBy ? `${orderCol} ${orderDir}` : 'created_at DESC';

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 12;
      const offset = (pageNum - 1) * limitNum;

      const whereClause = where.join(' AND ');

      // Total count
      const countRes = await query(
        `SELECT COUNT(*) FROM products WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countRes.rows[0].count);

      // Data
      params.push(limitNum, offset);
      const dataRes = await query(
        `SELECT * FROM products WHERE ${whereClause}
         ORDER BY ${orderBy}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      res.json({
        products: dataRes.rows.map(mapProduct),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: offset + limitNum < total,
          hasPrev: pageNum > 1,
        },
      });
    } catch (err) {
      console.error('GET /products error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /brands
  router.get('/brands', async (req, res) => {
    try {
      const result = await query(
        `SELECT DISTINCT brand FROM products
         WHERE is_active = TRUE AND brand IS NOT NULL
         ORDER BY brand ASC`
      );
      res.json(result.rows.map(r => r.brand));
    } catch (err) {
      console.error('GET /brands error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /featured
  router.get('/featured', async (req, res) => {
    try {
      const result = await query(
        `SELECT * FROM products WHERE is_active = TRUE AND is_featured = TRUE
         ORDER BY created_at DESC LIMIT 8`
      );
      res.json(result.rows.map(mapProduct));
    } catch (err) {
      console.error('GET /featured error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /new
  router.get('/new', async (req, res) => {
    try {
      const result = await query(
        `SELECT * FROM products WHERE is_active = TRUE AND is_new = TRUE
         ORDER BY created_at DESC LIMIT 8`
      );
      res.json(result.rows.map(mapProduct));
    } catch (err) {
      console.error('GET /new error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /deals
  router.get('/deals', async (req, res) => {
    try {
      const result = await query(
        `SELECT * FROM products
         WHERE is_active = TRUE AND compare_price IS NOT NULL AND compare_price > price
         ORDER BY ((compare_price - price) / compare_price) DESC
         LIMIT 8`
      );
      res.json(result.rows.map(mapProduct));
    } catch (err) {
      console.error('GET /deals error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // GET /:id (id yoki slug)
  router.get('/:id', async (req, res) => {
    try {
      const result = await query(
        'SELECT * FROM products WHERE id = $1 OR slug = $1',
        [req.params.id]
      );
      const product = result.rows[0];
      if (!product) return res.status(404).json({ error: 'Product not found.' });

      const relatedRes = await query(
        `SELECT * FROM products
         WHERE category_id = $1 AND id != $2 AND is_active = TRUE
         LIMIT 4`,
        [product.category_id, product.id]
      );

      const reviewsRes = await query(
        'SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC',
        [product.id]
      );

      res.json({
        product: mapProduct(product),
        related: relatedRes.rows.map(mapProduct),
        reviews: reviewsRes.rows.map(mapReview),
      });
    } catch (err) {
      console.error('GET /products/:id error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // POST / (admin)
  router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
      const {
        name, price, categoryId, description, shortDescription,
        comparePrice, brand, sku, stock, images, specifications,
        features, isFeatured, isNew
      } = req.body;

      if (!name || !price || !categoryId)
        return res.status(400).json({ error: 'Name, price, category required.' });

      const id = `prod_${uuidv4().slice(0, 6)}`;
      const slug = slugify(name);

      const result = await query(
        `INSERT INTO products (id, name, slug, description, short_description, price,
                               compare_price, category_id, brand, sku, stock,
                               images, specifications, features,
                               is_featured, is_new, is_active, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE,NOW())
         RETURNING *`,
        [id, name, slug, description || null, shortDescription || null,
         parseFloat(price), comparePrice ? parseFloat(comparePrice) : null,
         categoryId, brand || null, sku || null, parseInt(stock) || 0,
         JSON.stringify(images || []),
         JSON.stringify(specifications || {}),
         JSON.stringify(features || []),
         !!isFeatured, !!isNew]
      );
      res.status(201).json(mapProduct(result.rows[0]));
    } catch (err) {
      console.error('POST /products error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // PUT /:id (admin)
  router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
      const fieldMap = {
        name: 'name',
        description: 'description',
        shortDescription: 'short_description',
        price: 'price',
        comparePrice: 'compare_price',
        categoryId: 'category_id',
        brand: 'brand',
        sku: 'sku',
        stock: 'stock',
        images: 'images',
        specifications: 'specifications',
        features: 'features',
        isFeatured: 'is_featured',
        isNew: 'is_new',
        isActive: 'is_active',
      };

      const sets = [];
      const params = [];

      for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
        if (req.body[jsKey] !== undefined) {
          let val = req.body[jsKey];
          if (['images', 'specifications', 'features'].includes(jsKey))
            val = JSON.stringify(val);
          params.push(val);
          sets.push(`${dbCol} = $${params.length}`);
        }
      }

      if (req.body.name) {
        params.push(slugify(req.body.name));
        sets.push(`slug = $${params.length}`);
      }

      if (sets.length === 0)
        return res.status(400).json({ error: 'No fields to update.' });

      sets.push('updated_at = NOW()');
      params.push(req.params.id);

      const result = await query(
        `UPDATE products SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );

      if (!result.rows[0]) return res.status(404).json({ error: 'Product not found.' });
      res.json(mapProduct(result.rows[0]));
    } catch (err) {
      console.error('PUT /products/:id error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  // DELETE /:id (admin) - soft delete
  router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
      const result = await query(
        'UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
        [req.params.id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Product not found.' });
      res.json({ message: 'Product deleted.' });
    } catch (err) {
      console.error('DELETE /products/:id error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  return router;
};
