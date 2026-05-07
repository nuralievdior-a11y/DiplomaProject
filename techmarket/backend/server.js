const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { createStateStore, defaultMode } = require('./storage/stateStore');

const app = express();
const PORT = process.env.PORT || 5000;
const DEBUG_ROUTES = process.env.DEBUG_ROUTES === 'true';

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

if (DEBUG_ROUTES) {
  app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ✅ Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// State store
// - `DATA_STORE=json` (default): persists runtime state to `db.local.json` (ignored by git)
// - `DATA_STORE=postgres`: persists runtime state to PostgreSQL in `app_state` table
const DB_TEMPLATE_PATH = path.join(__dirname, 'db.json');
const DB_LOCAL_PATH = path.join(__dirname, 'db.local.json');
const DB_RUNTIME_PATH = process.env.DB_JSON_PATH
  ? path.resolve(process.env.DB_JSON_PATH)
  : DB_LOCAL_PATH;

const stateStore = createStateStore({ templatePath: DB_TEMPLATE_PATH, runtimePath: DB_RUNTIME_PATH });
let db;

const saveDb = async () => {
  try {
    await stateStore.save(db);
  } catch (err) {
    console.error('Save Error:', err.message);
  }
};

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

  if (changed) await saveDb();
};

const registerRoutes = () => {
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
};

const registerErrorHandlers = () => {
  // Errors
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
};

// Health check (important for Render)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'TechMarket API',
    version: '1.0.0'
  });
});

// Start server
const start = async () => {
  try {
    db = await stateStore.load();
    console.log(`State store: ${defaultMode()} (${stateStore.mode === 'json' ? stateStore.runtimePath : 'postgres'})`);
  } catch (err) {
    console.error('DB Error:', err.message);
    process.exit(1);
  }

  registerRoutes();
  registerErrorHandlers();

  await initPasswords();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Admin: admin@techmarket.com / admin123`);
  });
};

start().catch((err) => {
  console.error('Init error:', err);
  app.listen(PORT);
});

module.exports = app;
