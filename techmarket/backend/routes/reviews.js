const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

module.exports = (db, saveDb) => {
  const router = express.Router();

  router.get('/reviews/product/:productId', (req, res) => { res.json(db.reviews.filter(r => r.productId === req.params.productId)); });

  router.post('/reviews', authenticate, (req, res) => {
    const { productId, rating, title, comment } = req.body;
    if (!productId || !rating) return res.status(400).json({ error: 'Product and rating required.' });
    const user = db.users.find(u => u.id === req.user.id);
    if (db.reviews.find(r => r.productId === productId && r.userId === req.user.id)) return res.status(400).json({ error: 'Already reviewed.' });
    const review = { id: `rev_${uuidv4().slice(0, 6)}`, productId, userId: req.user.id, userName: `${user.firstName} ${user.lastName.charAt(0)}.`, rating: parseInt(rating), title: title || '', comment: comment || '', createdAt: new Date().toISOString() };
    db.reviews.push(review);
    const pRevs = db.reviews.filter(r => r.productId === productId);
    const pi = db.products.findIndex(p => p.id === productId);
    if (pi > -1) { db.products[pi].rating = +(pRevs.reduce((s, r) => s + r.rating, 0) / pRevs.length).toFixed(1); db.products[pi].reviewCount = pRevs.length; }
    saveDb();
    res.status(201).json(review);
  });

  router.get('/wishlist', authenticate, (req, res) => {
    res.json(db.wishlist.filter(w => w.userId === req.user.id).map(w => { const p = db.products.find(pr => pr.id === w.productId); return p ? { ...w, product: p } : null; }).filter(Boolean));
  });

  router.post('/wishlist', authenticate, (req, res) => {
    if (db.wishlist.find(w => w.userId === req.user.id && w.productId === req.body.productId)) return res.status(400).json({ error: 'Already in wishlist.' });
    const item = { id: `wl_${uuidv4().slice(0, 6)}`, userId: req.user.id, productId: req.body.productId, addedAt: new Date().toISOString() };
    db.wishlist.push(item); saveDb();
    res.status(201).json(item);
  });

  router.delete('/wishlist/:productId', authenticate, (req, res) => {
    db.wishlist = db.wishlist.filter(w => !(w.userId === req.user.id && w.productId === req.params.productId));
    saveDb();
    res.json({ message: 'Removed.' });
  });

  return router;
};
