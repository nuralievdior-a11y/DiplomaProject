const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, isAdmin } = require('../middleware/auth');

module.exports = (db, saveDb) => {
  const router = express.Router();

  const applyProductFilters = (products, query) => {
    let filtered = products;
    const { search, category, brand, minPrice, maxPrice, minRating, featured, isNew } = query;

    if (search) {
      const s = String(search).toLowerCase();
      filtered = filtered.filter(p =>
        String(p.name || '').toLowerCase().includes(s) ||
        String(p.description || '').toLowerCase().includes(s) ||
        String(p.brand || '').toLowerCase().includes(s)
      );
    }
    if (category) filtered = filtered.filter(p => p.categoryId === category);
    if (brand) {
      const brands = String(brand).split(',').map(b => b.trim()).filter(Boolean);
      filtered = filtered.filter(p => brands.includes(p.brand));
    }
    if (minPrice) filtered = filtered.filter(p => p.price >= parseFloat(minPrice));
    if (maxPrice) filtered = filtered.filter(p => p.price <= parseFloat(maxPrice));
    if (minRating) filtered = filtered.filter(p => p.rating >= parseFloat(minRating));
    if (featured === 'true') filtered = filtered.filter(p => p.isFeatured);
    if (isNew === 'true') filtered = filtered.filter(p => p.isNew);

    return filtered;
  };

  // GET /api/products - with search, filter, sort, pagination
  router.get('/', (req, res) => {
    let products = db.products.filter(p => p.isActive);
    const { search, category, brand, minPrice, maxPrice, minRating, featured, isNew, sortBy, sortOrder, page = 1, limit = 12 } = req.query;

    products = applyProductFilters(products, { search, category, brand, minPrice, maxPrice, minRating, featured, isNew });

    const order = sortOrder === 'asc' ? 1 : -1;
    products.sort((a, b) => {
      if (sortBy === 'price') return (a.price - b.price) * order;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * order;
      if (sortBy === 'rating') return (a.rating - b.rating) * order;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const start = (parseInt(page) - 1) * parseInt(limit);
    const total = products.length;
    res.json({
      products: products.slice(start, start + parseInt(limit)),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)), hasNext: start + parseInt(limit) < total, hasPrev: parseInt(page) > 1 }
    });
  });

  router.get('/brands', (req, res) => {
    const { minPrice, maxPrice, ...rest } = req.query || {};
    const products = applyProductFilters(db.products.filter(p => p.isActive), rest);
    res.json([...new Set(products.map(p => p.brand).filter(Boolean))].sort());
  });

  router.get('/featured', (req, res) => { res.json(db.products.filter(p => p.isActive && p.isFeatured).slice(0, 8)); });
  router.get('/new', (req, res) => { res.json(db.products.filter(p => p.isActive && p.isNew).slice(0, 8)); });

  router.get('/deals', (req, res) => {
    res.json(db.products.filter(p => p.isActive && p.comparePrice > p.price)
      .sort((a, b) => ((b.comparePrice - b.price) / b.comparePrice) - ((a.comparePrice - a.price) / a.comparePrice)).slice(0, 8));
  });

  router.get('/:id', (req, res) => {
    const product = db.products.find(p => p.id === req.params.id || p.slug === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const related = db.products.filter(p => p.categoryId === product.categoryId && p.id !== product.id && p.isActive).slice(0, 4);
    const reviews = db.reviews.filter(r => r.productId === product.id);
    res.json({ product, related, reviews });
  });

  router.post('/', authenticate, isAdmin, async (req, res) => {
    const { name, price, categoryId } = req.body;
    if (!name || !price || !categoryId) return res.status(400).json({ error: 'Name, price, category required.' });
    const newProduct = {
      id: `prod_${uuidv4().slice(0, 6)}`,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      ...req.body, price: parseFloat(price), comparePrice: parseFloat(req.body.comparePrice) || 0,
      stock: parseInt(req.body.stock) || 0, rating: 0, reviewCount: 0, isActive: true,
      createdAt: new Date().toISOString()
    };
    db.products.push(newProduct);
    await saveDb();
    res.status(201).json(newProduct);
  });

  router.put('/:id', authenticate, isAdmin, async (req, res) => {
    const idx = db.products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found.' });
    db.products[idx] = { ...db.products[idx], ...req.body };
    if (req.body.name) db.products[idx].slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await saveDb();
    res.json(db.products[idx]);
  });

  router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    const idx = db.products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found.' });
    db.products[idx].isActive = false;
    await saveDb();
    res.json({ message: 'Product deleted.' });
  });

  return router;
};
