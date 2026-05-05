const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

module.exports = (db, saveDb) => {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    try {
      const { firstName, lastName, email, password, phone } = req.body;
      if (!firstName || !lastName || !email || !password) return res.status(400).json({ error: 'All fields are required.' });
      if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered.' });

      const newUser = {
        id: `usr_${uuidv4().slice(0, 8)}`, firstName, lastName, email,
        password: await bcrypt.hash(password, 10), role: 'customer',
        phone: phone || '', avatar: '', addresses: [],
        createdAt: new Date().toISOString(), isActive: true
      };
      db.users.push(newUser);
      saveDb();

      const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...safe } = newUser;
      res.status(201).json({ user: safe, token });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
      const user = db.users.find(u => u.email === email);
      if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
      if (!user.isActive) return res.status(403).json({ error: 'Account deactivated.' });
      if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials.' });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...safe } = user;
      res.json({ user: safe, token });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
  });

  router.get('/me', authenticate, (req, res) => {
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password: _, ...safe } = user;
    res.json(safe);
  });

  router.put('/profile', authenticate, async (req, res) => {
    const idx = db.users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found.' });
    const { firstName, lastName, phone, avatar } = req.body;
    if (firstName) db.users[idx].firstName = firstName;
    if (lastName) db.users[idx].lastName = lastName;
    if (phone) db.users[idx].phone = phone;
    if (avatar !== undefined) db.users[idx].avatar = avatar;
    saveDb();
    const { password: _, ...safe } = db.users[idx];
    res.json(safe);
  });

  router.put('/change-password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const idx = db.users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found.' });
    if (!(await bcrypt.compare(currentPassword, db.users[idx].password)))
      return res.status(400).json({ error: 'Current password is incorrect.' });
    db.users[idx].password = await bcrypt.hash(newPassword, 10);
    saveDb();
    res.json({ message: 'Password changed.' });
  });

  router.post('/addresses', authenticate, (req, res) => {
    const idx = db.users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found.' });
    const addr = { id: `addr_${uuidv4().slice(0, 8)}`, ...req.body, isDefault: req.body.isDefault || false };
    if (addr.isDefault) db.users[idx].addresses.forEach(a => a.isDefault = false);
    db.users[idx].addresses.push(addr);
    saveDb();
    res.status(201).json(addr);
  });

  router.delete('/addresses/:id', authenticate, (req, res) => {
    const idx = db.users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found.' });
    db.users[idx].addresses = db.users[idx].addresses.filter(a => a.id !== req.params.id);
    saveDb();
    res.json({ message: 'Address deleted.' });
  });

  return router;
};
