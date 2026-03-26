const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database
const DB_PATH = path.join(__dirname, 'db.json');
let db;
try { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); console.log('Database loaded'); } catch (err) { console.error('DB Error:', err.message); process.exit(1); }
const saveDb = () => { try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch (err) { console.error('Save Error:', err.message); } };

// Ensure arrays exist
if (!db.carts) db.carts = [];
if (!db.wishlist) db.wishlist = [];
if (!db.reviews) db.reviews = [];
if (!db.coupons) db.coupons = [];
if (!db.orders) db.orders = [];
if (!db.settings) db.settings = { storeName: 'TechMarket', storeEmail: 'info@techmarket.com', storePhone: '+998901234567', currency: 'USD', taxRate: 10, shippingRate: 9.99, freeShippingThreshold: 500, socialLinks: {} };

// Auto-hash passwords on startup (ensures passwords always work)
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
      // Always rehash to ensure it works
      const isValid = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
      if (isValid) {
        try {
          const match = await bcrypt.compare(defaultPwd, user.password);
          if (match) continue; // Hash is correct, skip
        } catch { }
      }
      // Hash doesn't match or isn't valid - regenerate
      user.password = await bcrypt.hash(defaultPwd, 10);
      changed = true;
      console.log(`  Password rehashed for ${user.email}`);
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

// Public settings
app.get('/api/settings/public', (req, res) => {
  const s = db.settings || {};
  res.json({ storeName: s.storeName, storeEmail: s.storeEmail, storePhone: s.storePhone, currency: s.currency, freeShippingThreshold: s.freeShippingThreshold, socialLinks: s.socialLinks });
});

app.get('/api/health', (req, res) => { res.json({ status: 'ok', name: 'TechMarket API', version: '1.0.0' }); });
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: 'Internal server error' }); });
app.use((req, res) => { res.status(404).json({ error: 'Route not found' }); });

// Start server after password init
initPasswords().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  TechMarket API Server running on http://localhost:${PORT}`);
    console.log(`  Admin: admin@techmarket.com / admin123`);
    console.log(`  Customer: john@example.com / password123\n`);
  });
}).catch(err => {
  console.error('Init error:', err);
  app.listen(PORT);
});

module.exports = app;
