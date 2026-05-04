# TechMarket Backend

Node.js + Express + PostgreSQL backend for TechMarket e-commerce.

## Stack

- Node.js 18+
- Express 4.x
- PostgreSQL 15+
- pg (node-postgres) for DB access
- JWT for authentication
- bcryptjs for password hashing

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 15 or higher
- pgAdmin (optional, for DB management)

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd techmarket/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` and set your actual `DB_PASSWORD` and `JWT_SECRET`.

### 4. Create the database

In pgAdmin or via psql, create a new database:

```sql
CREATE DATABASE techmarket;
```

### 5. Run the schema migration

In pgAdmin Query Tool (connected to `techmarket` database), execute the contents of `migrations/001_init_schema.sql`.

Or via command line:

```bash
psql -U postgres -d techmarket -f migrations/001_init_schema.sql
```

### 6. Seed initial data

```bash
node scripts/seed.js
```

This loads sample data from `db.json` into PostgreSQL: 3 users, 8 categories, 20 products, 3 orders, 3 reviews, 3 coupons.

### 7. Start the server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server will start on `http://localhost:5000`.

## Default users (after seed)

| Email | Password | Role |
|-------|----------|------|
| admin@techmarket.com | admin123 | admin |
| diyor@example.com | password123 | customer |
| john@example.com | password123 | customer |

## API Endpoints

- `GET  /api/health` - Health check
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET  /api/products` - List products (search, filter, sort, pagination)
- `GET  /api/categories` - List categories
- `GET  /api/cart` - Get user cart
- `POST /api/cart/add` - Add to cart
- `POST /api/orders` - Create order (transactional)
- `GET  /api/admin/dashboard` - Admin dashboard (admin only)

## Project structure

```text
backend/
├── config/
│   └── database.js         # PostgreSQL pool configuration
├── middleware/
│   └── auth.js             # JWT authentication
├── migrations/
│   └── 001_init_schema.sql # Database schema
├── routes/
│   ├── auth.js
│   ├── products.js
│   ├── categories.js
│   ├── cart.js
│   ├── orders.js
│   ├── reviews.js
│   ├── admin.js
│   ├── newsletter.js
│   └── ai.js
├── scripts/
│   └── seed.js             # Data migration script
├── db.json                 # Seed data source (legacy reference)
├── server.js               # Express app entry point
├── package.json
└── .env.example
```

## Database schema

13 normalized tables: users, addresses, categories, products, carts, cart_items, orders, order_items, reviews, coupons, wishlist, newsletter, settings.

## License

ISC
