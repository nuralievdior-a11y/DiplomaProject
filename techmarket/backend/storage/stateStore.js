const fs = require('fs');
const path = require('path');

const safeParseJson = (text, fallback = null) => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const ensureFileFromTemplate = (runtimePath, templatePath) => {
  if (fs.existsSync(runtimePath)) return;
  ensureDir(runtimePath);
  fs.copyFileSync(templatePath, runtimePath);
};

const readJsonFile = (filePath) => safeParseJson(fs.readFileSync(filePath, 'utf-8'), null);

const writeJsonFileAtomic = (filePath, data) => {
  ensureDir(filePath);
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
};

const defaultMode = () => String(process.env.DATA_STORE || 'json').toLowerCase();

const normalizeDbShape = (db) => {
  if (!db || typeof db !== 'object') return {};
  if (!db.users) db.users = [];
  if (!db.products) db.products = [];
  if (!db.categories) db.categories = [];
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
  return db;
};

const createJsonStateStore = ({ templatePath, runtimePath }) => {
  ensureFileFromTemplate(runtimePath, templatePath);
  return {
    mode: 'json',
    runtimePath,
    async load() {
      const data = readJsonFile(runtimePath);
      if (!data) throw new Error(`Failed to read JSON DB: ${runtimePath}`);
      return normalizeDbShape(data);
    },
    async save(db) {
      writeJsonFileAtomic(runtimePath, db);
    }
  };
};

const createPostgresStateStore = ({ templatePath, runtimePath }) => {
  // Lazy require so JSON mode doesn't need pg installed.
  const { query } = require('../config/database');

  const ensureTable = async () => {
    await query(
      `CREATE TABLE IF NOT EXISTS app_state (
        id INT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    );
  };

  const getInitialStateFromFiles = () => {
    // Prefer runtime file if it exists (so local changes can be migrated once).
    const candidate = runtimePath && fs.existsSync(runtimePath) ? runtimePath : null;
    if (candidate) {
      const fromRuntime = readJsonFile(candidate);
      if (fromRuntime) return normalizeDbShape(fromRuntime);
    }
    const fromTemplate = readJsonFile(templatePath);
    return normalizeDbShape(fromTemplate || {});
  };

  return {
    mode: 'postgres',
    async load() {
      await ensureTable();
      const res = await query('SELECT data FROM app_state WHERE id = 1');
      if (res.rows.length > 0) return normalizeDbShape(res.rows[0].data);

      const initial = getInitialStateFromFiles();
      await query(
        'INSERT INTO app_state (id, data, updated_at) VALUES (1, $1::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()',
        [JSON.stringify(initial)]
      );
      return initial;
    },
    async save(db) {
      await ensureTable();
      await query(
        'INSERT INTO app_state (id, data, updated_at) VALUES (1, $1::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()',
        [JSON.stringify(db)]
      );
    }
  };
};

const createStateStore = ({ templatePath, runtimePath } = {}) => {
  const mode = defaultMode();
  if (mode === 'postgres') return createPostgresStateStore({ templatePath, runtimePath });
  return createJsonStateStore({ templatePath, runtimePath });
};

module.exports = { createStateStore, defaultMode, normalizeDbShape };

