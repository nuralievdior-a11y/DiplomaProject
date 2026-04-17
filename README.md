# TechMarket (DiplomaProject)

Full-stack e-commerce platform (electronics online store) consisting of:
- `techmarket/backend/` - REST API on Node.js + Express (JWT, cart, orders, admin analytics)
- `techmarket/frontend/` - customer website on React + Vite
- `techmarket/dashboard/` - admin dashboard on React + Vite

## Architecture

High-level flow:

1) `frontend` / `dashboard` send requests to the API (`/api/...`)
2) `backend` validates JWT (`Authorization: Bearer <token>`) and runs business logic
3) Data is stored in a file-based DB: `techmarket/backend/db.json`

Key API modules:
- Auth & profile: `techmarket/backend/routes/auth.js`
- Catalog: `techmarket/backend/routes/products.js`, `techmarket/backend/routes/categories.js`
- Cart: `techmarket/backend/routes/cart.js`
- Orders: `techmarket/backend/routes/orders.js`
- Admin: `techmarket/backend/routes/admin.js`
- Reviews & wishlist: `techmarket/backend/routes/reviews.js`

## Repository Structure

```
techmarket/
  backend/      Express API + db.json
  frontend/     React customer website (Vite)
  dashboard/    React admin dashboard (Vite)
vercel.json     Static SPA deploy rules (frontend + dashboard)
```

## Tech Stack

- Backend: Node.js, Express, JWT, bcryptjs
- Frontend/Dashboard: React 18, Vite, Tailwind CSS, axios, react-router-dom
- Storage: JSON file `db.json` (demo / development)

## Local Development

### 1) Backend API

```bash
cd techmarket/backend
npm install
npm run dev
```

API will run at `http://localhost:5000`.

Optional environment variables:
- `PORT` (default `5000`)
- `JWT_SECRET` (falls back to a default value in code)

### 2) Frontend (customer website)

```bash
cd techmarket/frontend
npm install
npm run dev
```

Open: `http://localhost:5173/DiplomaProject/`

### 3) Dashboard (admin)

```bash
cd techmarket/dashboard
npm install
npm run dev
```

Open: `http://localhost:5174/DiplomaProject/dashboard/`

## API URL Configuration (frontend/dashboard)

By default, both SPAs use `baseURL = /api` and rely on the Vite dev proxy for local development.

For production, set:
- `VITE_API_URL` (example: `https://your-backend.example.com/api`)

PowerShell example:

```powershell
$env:VITE_API_URL="https://your-backend.example.com/api"
npm run build
```

Files where it is used:
- `techmarket/frontend/src/api.js`
- `techmarket/dashboard/src/api.js`

## Unit Tests (backend)

Tests live in `techmarket/backend/test` and cover critical e-commerce scenarios:
- add-to-cart and totals calculation
- out-of-stock / insufficient stock checks
- order creation with data integrity (order created, stock decreases, cart is cleared)
- payment failure simulation (HTTP 402, no state mutations)
- delivery issues handling (`delivery_issue` status requires a `reason`)

Run:

```bash
cd techmarket/backend
npm test
```

## API (main endpoints)

Base URL: `http://localhost:5000/api`

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/profile`
- `PUT /auth/change-password`
- `POST /auth/addresses`
- `DELETE /auth/addresses/:id`

Catalog:
- `GET /products` (search/filter/sort/pagination)
- `GET /products/:id`
- `GET /products/brands`
- `GET /products/featured`
- `GET /products/new`
- `GET /products/deals`
- `GET /categories`
- `GET /categories/:id`

Cart:
- `GET /cart`
- `POST /cart/add`
- `PUT /cart/update`
- `DELETE /cart/remove/:productId`
- `DELETE /cart/clear`
- `POST /cart/coupon`

Orders:
- `GET /orders`
- `GET /orders/:id`
- `POST /orders` (validates `paymentMethod`; supports payment failure via `payment: { status: 'failed' }`)
- `PUT /orders/:id/status` (admin; includes `delivery_issue` with required `reason`)

Admin:
- `GET /admin/users` (admin)
- `PUT /admin/users/:id` (admin)
- `GET /admin/dashboard` (admin)
- `GET /admin/settings` / `PUT /admin/settings` (admin)
- `GET /admin/reviews` / `DELETE /admin/reviews/:id` (admin)
- `GET /admin/coupons` / `POST /admin/coupons` / `DELETE /admin/coupons/:id` (admin)

Reviews / Wishlist:
- `GET /reviews/product/:productId`
- `POST /reviews` (auth)
- `GET /wishlist` (auth)
- `POST /wishlist` (auth)
- `DELETE /wishlist/:productId` (auth)

## Deployment (Vercel)

The repo includes `vercel.json` which deploys **two static SPAs**:
- `frontend` at `/DiplomaProject/`
- `dashboard` at `/DiplomaProject/dashboard/`

Important: the backend is not included in this Vercel setup - deploy it separately (Render/Railway/VPS, etc.), then set `VITE_API_URL` for the SPAs.

## Default Accounts

Admin:
- Email: `admin@techmarket.com`
- Password: `admin123`

Customer:
- Email: `john@example.com`
- Password: `password123`

## Demo Limitations

- `db.json` is a file-based database (not suitable for real production workloads / concurrent writes).
- "Payment failure" and "Delivery issue" are implemented as API-level error/status handling for demonstrating graceful error handling.
