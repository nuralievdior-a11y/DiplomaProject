-- ============================================
-- TechMarket - Initial Schema
-- ============================================

-- UUID extension (kelajakda kerak bo'lishi mumkin)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================
-- 1. USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(50) PRIMARY KEY,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'customer',
  phone         VARCHAR(30),
  avatar        TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- 2. ADDRESSES (users ichidan ajratilgan)
-- ============================================
CREATE TABLE IF NOT EXISTS addresses (
  id            VARCHAR(50) PRIMARY KEY,
  user_id       VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         VARCHAR(100),
  street        VARCHAR(255) NOT NULL,
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100),
  zip_code      VARCHAR(20),
  country       VARCHAR(100) NOT NULL,
  is_default    BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_addresses_user ON addresses(user_id);

-- ============================================
-- 3. CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id            VARCHAR(50) PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(120) UNIQUE NOT NULL,
  description   TEXT,
  image         TEXT,
  icon          VARCHAR(50),
  parent_id     VARCHAR(50) REFERENCES categories(id) ON DELETE SET NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  "order"       INT DEFAULT 0
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ============================================
-- 4. PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id                 VARCHAR(50) PRIMARY KEY,
  name               VARCHAR(255) NOT NULL,
  slug               VARCHAR(280) UNIQUE NOT NULL,
  description        TEXT,
  short_description  TEXT,
  price              NUMERIC(12,2) NOT NULL,
  compare_price      NUMERIC(12,2),
  category_id        VARCHAR(50) REFERENCES categories(id) ON DELETE SET NULL,
  brand              VARCHAR(100),
  sku                VARCHAR(100) UNIQUE,
  stock              INT DEFAULT 0,
  images             JSONB DEFAULT '[]'::jsonb,
  specifications     JSONB DEFAULT '{}'::jsonb,
  features           JSONB DEFAULT '[]'::jsonb,
  rating             NUMERIC(3,2) DEFAULT 0,
  review_count       INT DEFAULT 0,
  is_featured        BOOLEAN DEFAULT FALSE,
  is_new             BOOLEAN DEFAULT FALSE,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;

-- ============================================
-- 5. CARTS
-- ============================================
CREATE TABLE IF NOT EXISTS carts (
  user_id       VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. CART_ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS cart_items (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(50) NOT NULL REFERENCES carts(user_id) ON DELETE CASCADE,
  product_id    VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity      INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_cart_items_user ON cart_items(user_id);

-- ============================================
-- 7. ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id                  VARCHAR(50) PRIMARY KEY,
  user_id             VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  subtotal            NUMERIC(12,2) NOT NULL,
  discount            NUMERIC(12,2) DEFAULT 0,
  shipping            NUMERIC(12,2) DEFAULT 0,
  tax                 NUMERIC(12,2) DEFAULT 0,
  total               NUMERIC(12,2) NOT NULL,
  status              VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_method      VARCHAR(50),
  payment_status      VARCHAR(30) DEFAULT 'pending',
  shipping_address    JSONB,
  tracking_number     VARCHAR(100),
  estimated_delivery  TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ============================================
-- 8. ORDER_ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id            SERIAL PRIMARY KEY,
  order_id      VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL,
  name          VARCHAR(255) NOT NULL,
  price         NUMERIC(12,2) NOT NULL,
  quantity      INT NOT NULL CHECK (quantity > 0),
  image         TEXT
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================
-- 9. REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id            VARCHAR(50) PRIMARY KEY,
  product_id    VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id       VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  user_name     VARCHAR(150),
  rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         VARCHAR(255),
  comment       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);

-- ============================================
-- 10. COUPONS
-- ============================================
CREATE TABLE IF NOT EXISTS coupons (
  id              VARCHAR(50) PRIMARY KEY,
  code            VARCHAR(50) UNIQUE NOT NULL,
  type            VARCHAR(20) NOT NULL,
  value           NUMERIC(12,2) NOT NULL,
  min_order       NUMERIC(12,2) DEFAULT 0,
  max_discount    NUMERIC(12,2),
  usage_limit     INT,
  used_count      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_coupons_code ON coupons(code);

-- ============================================
-- 11. WISHLIST
-- ============================================
CREATE TABLE IF NOT EXISTS wishlist (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id    VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlist_user ON wishlist(user_id);

-- ============================================
-- 12. NEWSLETTER
-- ============================================
CREATE TABLE IF NOT EXISTS newsletter (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active     BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 13. SETTINGS (key-value)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  key           VARCHAR(100) PRIMARY KEY,
  value         JSONB NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);