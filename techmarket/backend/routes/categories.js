const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, isAdmin } = require('../middleware/auth');

module.exports = (db, saveDb) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(db.categories.filter(c => c.isActive).sort((a, b) => a.order - b.order)
      .map(cat => ({ ...cat, productCount: db.products.filter(p => p.categoryId === cat.id && p.isActive).length })));
  });

  router.get('/:id', (req, res) => {
    const cat = db.categories.find(c => c.id === req.params.id || c.slug === req.params.id);
    if (!cat) return res.status(404).json({ error: 'Category not found.' });
    res.json({ ...cat, productCount: db.products.filter(p => p.categoryId === cat.id && p.isActive).length });
  });

  router.post('/', authenticate, isAdmin, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const newCat = {
      id: `cat_${uuidv4().slice(0, 6)}`, name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: req.body.description || '', image: req.body.image || '',
      icon: req.body.icon || 'package', parentId: null, isActive: true,
      order: Math.max(...db.categories.map(c => c.order), 0) + 1
    };
    db.categories.push(newCat);
    saveDb();
    res.status(201).json(newCat);
  });

  router.put('/:id', authenticate, isAdmin, (req, res) => {
    const idx = db.categories.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found.' });
    db.categories[idx] = { ...db.categories[idx], ...req.body };
    saveDb();
    res.json(db.categories[idx]);
  });

  router.delete('/:id', authenticate, isAdmin, (req, res) => {
    const idx = db.categories.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found.' });
    db.categories[idx].isActive = false;
    saveDb();
    res.json({ message: 'Deleted.' });
  });

  return router;
};
