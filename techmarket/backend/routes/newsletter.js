const express = require('express');
const { v4: uuidv4 } = require('uuid');

const isValidEmail = (value) => {
  const email = String(value || '').trim();
  if (!email) return false;
  // Simple, pragmatic validation (good enough for demo apps)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

module.exports = (db, saveDb) => {
  const router = express.Router();

  router.post('/subscribe', (req, res) => {
    const emailRaw = req.body?.email;
    const email = String(emailRaw || '').trim().toLowerCase();

    if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required.' });

    if (!db.newsletter) db.newsletter = [];

    const exists = db.newsletter.some((s) => String(s.email || '').toLowerCase() === email);
    if (exists) return res.status(400).json({ error: 'Already subscribed.' });

    const subscription = {
      id: `nl_${uuidv4().slice(0, 6)}`,
      email,
      createdAt: new Date().toISOString()
    };

    db.newsletter.push(subscription);
    saveDb();

    res.status(201).json({ message: 'Subscribed.', subscription });
  });

  return router;
};

