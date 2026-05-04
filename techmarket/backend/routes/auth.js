const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { query } = require('../config/database');

const mapUser = (row) => row && {
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  role: row.role,
  phone: row.phone,
  avatar: row.avatar,
  isActive: row.is_active,
  createdAt: row.created_at,
};

const mapAddress = (row) => row && {
  id: row.id,
  label: row.label,
  street: row.street,
  city: row.city,
  state: row.state,
  zipCode: row.zip_code,
  country: row.country,
  isDefault: row.is_default,
};

async function getUserWithAddresses(userId) {
  const u = await query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!u.rows[0]) return null;
  const a = await query('SELECT * FROM addresses WHERE user_id = $1', [userId]);
  return { ...mapUser(u.rows[0]), addresses: a.rows.map(mapAddress) };
}

module.exports = () => {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    try {
      const { firstName, lastName, email, password, phone } = req.body;
      if (!firstName || !lastName || !email || !password)
        return res.status(400).json({ error: 'All fields are required.' });

      const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (exists.rows.length) return res.status(400).json({ error: 'Email already registered.' });

      const id = `usr_${uuidv4().slice(0, 8)}`;
      const hashed = await bcrypt.hash(password, 10);

      await query(
        `INSERT INTO users (id, first_name, last_name, email, password, role, phone, avatar, is_active, created_at)
         VALUES ($1,$2,$3,$4,$5,'customer',$6,'',TRUE,NOW())`,
        [id, firstName, lastName, email, hashed, phone || null]
      );

      const safe = await getUserWithAddresses(id);
      const token = jwt.sign({ id, email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ user: safe, token });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
      if (!user.is_active) return res.status(403).json({ error: 'Account deactivated.' });
      if (!(await bcrypt.compare(password, user.password)))
        return res.status(401).json({ error: 'Invalid credentials.' });

      const safe = await getUserWithAddresses(user.id);
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ user: safe, token });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  router.get('/me', authenticate, async (req, res) => {
    try {
      const user = await getUserWithAddresses(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      res.json(user);
    } catch (err) {
      console.error('Me error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  router.put('/profile', authenticate, async (req, res) => {
    try {
      const { firstName, lastName, phone, avatar } = req.body;
      const result = await query(
        `UPDATE users SET
           first_name = COALESCE($1, first_name),
           last_name  = COALESCE($2, last_name),
           phone      = COALESCE($3, phone),
           avatar     = COALESCE($4, avatar),
           updated_at = NOW()
         WHERE id = $5
         RETURNING id`,
        [firstName || null, lastName || null, phone || null,
         avatar !== undefined ? avatar : null, req.user.id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
      const user = await getUserWithAddresses(req.user.id);
      res.json(user);
    } catch (err) {
      console.error('Profile error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  router.put('/change-password', authenticate, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword)
        return res.status(400).json({ error: 'Both passwords required.' });

      const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });

      if (!(await bcrypt.compare(currentPassword, result.rows[0].password)))
        return res.status(400).json({ error: 'Current password is incorrect.' });

      const hashed = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
                  [hashed, req.user.id]);
      res.json({ message: 'Password changed.' });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  router.post('/addresses', authenticate, async (req, res) => {
    try {
      const { label, street, city, state, zipCode, country, isDefault } = req.body;
      if (!street || !city || !country)
        return res.status(400).json({ error: 'Street, city and country required.' });

      const id = `addr_${uuidv4().slice(0, 8)}`;

      if (isDefault) {
        await query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
      }

      const result = await query(
        `INSERT INTO addresses (id, user_id, label, street, city, state, zip_code, country, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [id, req.user.id, label || null, street, city, state || null,
         zipCode || null, country, !!isDefault]
      );
      res.status(201).json(mapAddress(result.rows[0]));
    } catch (err) {
      console.error('Add address error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  router.delete('/addresses/:id', authenticate, async (req, res) => {
    try {
      const result = await query(
        'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id',
        [req.params.id, req.user.id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Address not found.' });
      res.json({ message: 'Address deleted.' });
    } catch (err) {
      console.error('Delete address error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  });

  return router;
};
