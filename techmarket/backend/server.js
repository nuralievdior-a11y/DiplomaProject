const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

const parseCorsOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);

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

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database (JSON)
// IMPORTANT:
// - `db.json` is treated as a seed/template (tracked in git)
// - runtime changes are persisted to `db.local.json` (ignored by git) or `DB_JSON_PATH`
const DB_TEMPLATE_PATH = path.join(__dirname, 'db.json');
const DB_LOCAL_PATH = path.join(__dirname, 'db.local.json');
const DB_RUNTIME_PATH = process.env.DB_JSON_PATH
  ? path.resolve(process.env.DB_JSON_PATH)
  : DB_LOCAL_PATH;

const ensureRuntimeDbFile = () => {
  if (fs.existsSync(DB_RUNTIME_PATH)) return;

  // If a custom path is provided, ensure directory exists.
  const dir = path.dirname(DB_RUNTIME_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Initialize runtime DB from the template.
  fs.copyFileSync(DB_TEMPLATE_PATH, DB_RUNTIME_PATH);
};

const readDb = () => {
  ensureRuntimeDbFile();
  return JSON.parse(fs.readFileSync(DB_RUNTIME_PATH, 'utf-8'));
};

let db;
try {
  db = readDb();
  console.log(`Database loaded: ${DB_RUNTIME_PATH}`);
} catch (err) {
  console.error('DB Error:', err.message);
  process.exit(1);
}

const saveDb = () => {
  try {
    const tmp = `${DB_RUNTIME_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_RUNTIME_PATH);
  } catch (err) {
    console.error('Save Error:', err.message);
  }
};

// Ensure arrays exist
if (!db.carts) db.carts = [];
if (!db.wishlist) db.wishlist = [];
if (!db.reviews) db.reviews = [];
if (!db.coupons) db.coupons = [];
if (!db.orders) db.orders = [];
if (!db.newsletter) db.newsletter = [];
if (!db.settings) {
  db.settings = {
    storeName: 'TechMarket',
    storeEmail: 'info@techmarket.com',
    storePhone: '+998901234567',
    currency: 'USD',
    taxRate: 10,
    shippingRate: 9.99,
    freeShippingThreshold: 500,
    socialLinks: {}
  };
}

// ✅ Password hashing
const initPasswords = async () => {
  const defaultPasswords = {
    'admin@techmarket.com': 'admin123',
    'diyor@example.com': 'password123',
    'john@example.com': 'password123'
  };

  let changed = false;

  for (const user of db.users) {
    const defaultPwd = defaultPasswords[user.email];

    if (defaultPwd) {
      const isHashed =
        user.password.startsWith('$2a$') ||
        user.password.startsWith('$2b$');

      if (isHashed) {
        try {
          const match = await bcrypt.compare(defaultPwd, user.password);
          if (match) continue;
        } catch {}
      }

      user.password = await bcrypt.hash(defaultPwd, 10);
      changed = true;
      console.log(`Password fixed for ${user.email}`);
    }
  }

  if (changed) saveDb();
};

// Routes
app.use('/api/auth', require('./routes/auth')(db, saveDb));
app.use('/api/products', require('./routes/products')(db, saveDb));
app.use('/api/categories', require('./routes/categories')(db, saveDb));
app.use('/api/cart', require('./routes/cart')(db, saveDb));
app.use('/api/orders', require('./routes/orders')(db, saveDb));
app.use('/api/admin', require('./routes/admin')(db, saveDb));
app.use('/api', require('./routes/reviews')(db, saveDb));
app.use('/api/newsletter', require('./routes/newsletter')(db, saveDb));
app.use('/api/ai', require('./routes/ai')(db, saveDb));

// Public settings
app.get('/api/settings/public', (req, res) => {
  const s = db.settings || {};
  res.json({
    storeName: s.storeName,
    storeEmail: s.storeEmail,
    storePhone: s.storePhone,
    currency: s.currency,
    freeShippingThreshold: s.freeShippingThreshold,
    socialLinks: s.socialLinks
  });
});

// Health check (important for Render)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'TechMarket API',
    version: '1.0.0'
  });
});

// Errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
initPasswords()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Admin: admin@techmarket.com / admin123`);
    });
  })
  .catch((err) => {
    console.error('Init error:', err);
    app.listen(PORT);
  });

module.exports = app;
