# TechMarket — Premium Online Electronics Store

A full-stack e-commerce platform for electronics built with modern technologies.

## 🏗️ Project Structure

```
techmarket/
├── backend/          # Node.js + Express API server
├── dashboard/        # React Admin Dashboard  
└── frontend/         # React Customer Website
```

## 🚀 Quick Start

### 1. Backend (API Server)
```bash
cd backend
npm install
npm start
# Runs on http://localhost:5000
```

### 2. Admin Dashboard
```bash
cd dashboard
npm install
npm run dev
# Runs on http://localhost:5174
```

### 3. Frontend Website
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## 🔑 Default Credentials

**Admin Dashboard:**
- Email: `admin@techmarket.com`
- Password: `admin123`

**Customer Account:**
- Email: `john@example.com`
- Password: `password123`

## 📋 Features

### Backend
- RESTful API with Express.js
- JWT Authentication & Authorization
- Product management with search, filter, pagination
- Shopping cart with coupon support
- Order management with tracking
- Admin analytics & statistics
- File-based database (db.json)

### Admin Dashboard
- Analytics dashboard with charts (Recharts)
- Product CRUD with image management
- Order management with status tracking
- Customer management
- Category, Coupon & Settings management
- Dark glass-morphism design

### Customer Website
- Modern responsive homepage with hero slider
- Product catalog with advanced filtering
- Product detail with image gallery & reviews
- Shopping cart & multi-step checkout
- User authentication (login/register)
- User profile & address management
- Order history with tracking
- Wishlist functionality

## 🛠️ Tech Stack

| Component | Technologies |
|-----------|-------------|
| Backend | Node.js, Express, JWT, bcryptjs |
| Dashboard | React 18, Tailwind CSS, Recharts, Lucide Icons |
| Frontend | React 18, Tailwind CSS, Lucide Icons |
| Database | JSON file (db.json) |

## 📁 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| GET | /api/products | List products |
| GET | /api/products/:id | Product detail |
| GET | /api/categories | List categories |
| POST | /api/cart/add | Add to cart |
| POST | /api/orders | Create order |
| GET | /api/orders | Order history |
| GET | /api/admin/stats | Dashboard stats |

---
Built with ❤️ for TechMarket
