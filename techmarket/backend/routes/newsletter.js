const express = require('express');
const { query } = require('../config/database');

const isValidEmail = (value) => {
  const email = String(value || '').trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

module.exports = () => {
  const router = express.Router();

  router.post('/subscribe', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required.' });

      const exists = await query('SELECT id FROM newsletter WHERE email = $1', [email]);
      if (exists.rows.length) return res.status(400).json({ error: 'Already subscribed.' });

      const r = await query(
        `INSERT INTO newsletter (email, subscribed_at, is_active)
         VALUES ($1, NOW(), TRUE) RETURNING *`,
        [email]
      );
      res.status(201).json({
        message: 'Subscribed.',
        subscription: {
          id: r.rows[0].id,
          email: r.rows[0].email,
          createdAt: r.rows[0].subscribed_at,
        },
      });
    } catch (err) {
      console.error('POST /newsletter:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  return router;
};
