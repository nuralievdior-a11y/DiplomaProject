const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

const parseCorsOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);

const parseSettingValue = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    return allowedOrigins.includes(origin)
      ? callback(null, true)
      : callback(new Error('CORS not allowed'), false);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes (hammasi PostgreSQL bilan)
app.use('/api/auth', require('./routes/auth')());
app.use('/api/products', require('./routes/products')());
app.use('/api/categories', require('./routes/categories')());
app.use('/api/cart', require('./routes/cart')());
app.use('/api/orders', require('./routes/orders')());
app.use('/api/admin', require('./routes/admin')());
app.use('/api', require('./routes/reviews')());
app.use('/api/newsletter', require('./routes/newsletter')());
app.use('/api/ai', require('./routes/ai')());

// Public settings
app.get('/api/settings/public', async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT key, value FROM settings WHERE key IN ('storeName','storeEmail','storePhone','currency','freeShippingThreshold','socialLinks')"
    );
    const s = {};
    for (const row of r.rows) {
      s[row.key] = parseSettingValue(row.value);
    }
    res.json({
      storeName: s.storeName,
      storeEmail: s.storeEmail,
      storePhone: s.storePhone,
      currency: s.currency,
      freeShippingThreshold: s.freeShippingThreshold,
      socialLinks: s.socialLinks || {},
    });
  } catch (err) {
    console.error('GET /settings/public:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', name: 'TechMarket API', version: '2.0.0', database: 'PostgreSQL' });
  } catch (err) {
    res.status(503).json({ status: 'error', error: 'Database unreachable' });
  }
});

// Errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Database: PostgreSQL`);
  console.log(`👤 Admin: admin@techmarket.com / admin123`);
});

module.exports = app;
