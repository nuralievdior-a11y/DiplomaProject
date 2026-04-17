const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const cartRoutes = require('../routes/cart');
const ordersRoutes = require('../routes/orders');

const createAuthHeader = ({ id, role }) => {
  const token = jwt.sign({ id, email: `${id}@example.com`, role }, JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
};

const createTestApp = ({ db, saveDb }) => {
  const app = express();
  app.use(express.json());
  app.use('/api/cart', cartRoutes(db, saveDb));
  app.use('/api/orders', ordersRoutes(db, saveDb));
  return app;
};

const withServer = async (app, fn) => {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    return await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const jsonFetch = async (url, { method = 'GET', headers = {}, body } = {}) => {
  const res = await fetch(url, {
    method,
    headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json };
};

const createBaseDb = () => ({
  users: [
    { id: 'usr_customer', firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'x', role: 'customer', isActive: true },
    { id: 'usr_admin', firstName: 'Admin', lastName: 'User', email: 'admin@techmarket.com', password: 'x', role: 'admin', isActive: true }
  ],
  products: [
    { id: 'prod_1', name: 'Laptop', description: 'Laptop', brand: 'TechBrand', categoryId: 'cat_1', price: 1000, comparePrice: 1200, images: ['img.png'], stock: 5, isActive: true, createdAt: new Date().toISOString() }
  ],
  carts: [],
  orders: [],
  coupons: [],
  settings: { taxRate: 10, shippingRate: 10, freeShippingThreshold: 500 }
});

test('cart: adds item and keeps totals consistent', async () => {
  const db = createBaseDb();
  let saveCalls = 0;
  const app = createTestApp({ db, saveDb: () => { saveCalls++; } });
  const auth = createAuthHeader({ id: 'usr_customer', role: 'customer' });

  await withServer(app, async (baseUrl) => {
    const add = await jsonFetch(`${baseUrl}/api/cart/add`, {
      method: 'POST',
      headers: { Authorization: auth },
      body: { productId: 'prod_1', quantity: 1 }
    });

    assert.equal(add.status, 200);
    assert.equal(add.json.message, 'Added to cart.');
    assert.equal(add.json.cart.subtotal, 1000);
    assert.equal(add.json.cart.shipping, 0);
    assert.equal(add.json.cart.tax, 100);
    assert.equal(add.json.cart.total, 1100);
    assert.equal(add.json.cart.itemCount, 1);
  });

  assert.equal(saveCalls, 1);
  assert.equal(db.carts.length, 1);
  assert.deepEqual(db.carts[0].items, [{ productId: 'prod_1', quantity: 1 }]);
});

test('cart: out-of-stock add returns user-friendly error and does not mutate cart', async () => {
  const db = createBaseDb();
  db.products[0].stock = 0;
  let saveCalls = 0;
  const app = createTestApp({ db, saveDb: () => { saveCalls++; } });
  const auth = createAuthHeader({ id: 'usr_customer', role: 'customer' });

  await withServer(app, async (baseUrl) => {
    const add = await jsonFetch(`${baseUrl}/api/cart/add`, {
      method: 'POST',
      headers: { Authorization: auth },
      body: { productId: 'prod_1', quantity: 1 }
    });

    assert.equal(add.status, 400);
    assert.equal(add.json.error, 'Insufficient stock.');
  });

  assert.equal(saveCalls, 0);
  assert.equal(db.carts.length, 0);
});

test('orders: creates order, decrements stock, clears cart (data integrity)', async () => {
  const db = createBaseDb();
  db.carts.push({ userId: 'usr_customer', items: [{ productId: 'prod_1', quantity: 2 }], updatedAt: new Date().toISOString() });
  let saveCalls = 0;
  const app = createTestApp({ db, saveDb: () => { saveCalls++; } });
  const auth = createAuthHeader({ id: 'usr_customer', role: 'customer' });

  await withServer(app, async (baseUrl) => {
    const create = await jsonFetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { Authorization: auth },
      body: {
        shippingAddress: { name: 'John Doe', city: 'Tashkent', address: 'Main st', phone: '+998901234567' },
        paymentMethod: 'card'
      }
    });

    assert.equal(create.status, 201);
    assert.equal(create.json.subtotal, 2000);
    assert.equal(create.json.shipping, 0);
    assert.equal(create.json.tax, 200);
    assert.equal(create.json.total, 2200);
    assert.equal(create.json.paymentStatus, 'paid');
    assert.equal(create.json.status, 'pending');
  });

  assert.equal(saveCalls, 1);
  assert.equal(db.orders.length, 1);
  assert.equal(db.products[0].stock, 3);
  assert.equal(db.carts[0].items.length, 0);
});

test('orders: insufficient stock fails gracefully and does not partially update state', async () => {
  const db = createBaseDb();
  db.products[0].stock = 1;
  db.carts.push({ userId: 'usr_customer', items: [{ productId: 'prod_1', quantity: 2 }], updatedAt: new Date().toISOString() });
  let saveCalls = 0;
  const app = createTestApp({ db, saveDb: () => { saveCalls++; } });
  const auth = createAuthHeader({ id: 'usr_customer', role: 'customer' });

  await withServer(app, async (baseUrl) => {
    const create = await jsonFetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { Authorization: auth },
      body: {
        shippingAddress: { name: 'John Doe', city: 'Tashkent', address: 'Main st', phone: '+998901234567' },
        paymentMethod: 'card'
      }
    });

    assert.equal(create.status, 400);
    assert.match(create.json.error, /Insufficient stock for/i);
  });

  assert.equal(saveCalls, 0);
  assert.equal(db.orders.length, 0);
  assert.equal(db.products[0].stock, 1);
  assert.equal(db.carts[0].items.length, 1);
});

test('orders: payment failure returns feedback and does not mutate order/stock/cart', async () => {
  const db = createBaseDb();
  db.carts.push({ userId: 'usr_customer', items: [{ productId: 'prod_1', quantity: 1 }], updatedAt: new Date().toISOString() });
  let saveCalls = 0;
  const app = createTestApp({ db, saveDb: () => { saveCalls++; } });
  const auth = createAuthHeader({ id: 'usr_customer', role: 'customer' });

  await withServer(app, async (baseUrl) => {
    const create = await jsonFetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { Authorization: auth },
      body: {
        shippingAddress: { name: 'John Doe', city: 'Tashkent', address: 'Main st', phone: '+998901234567' },
        paymentMethod: 'card',
        payment: { status: 'failed' }
      }
    });

    assert.equal(create.status, 402);
    assert.equal(create.json.error, 'Payment failed.');
  });

  assert.equal(saveCalls, 0);
  assert.equal(db.orders.length, 0);
  assert.equal(db.products[0].stock, 5);
  assert.equal(db.carts[0].items.length, 1);
});

test('orders: delivery issue status requires reason and persists user-friendly details', async () => {
  const db = createBaseDb();
  db.orders.push({
    id: 'ord_1',
    userId: 'usr_customer',
    items: [],
    subtotal: 0,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    status: 'shipped',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    shippingAddress: { name: 'John Doe' },
    trackingNumber: 'TM-2026-00001',
    estimatedDelivery: new Date().toISOString(),
    deliveredAt: null,
    couponCode: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  let saveCalls = 0;
  const app = createTestApp({ db, saveDb: () => { saveCalls++; } });
  const adminAuth = createAuthHeader({ id: 'usr_admin', role: 'admin' });

  await withServer(app, async (baseUrl) => {
    const missingReason = await jsonFetch(`${baseUrl}/api/orders/ord_1/status`, {
      method: 'PUT',
      headers: { Authorization: adminAuth },
      body: { status: 'delivery_issue' }
    });
    assert.equal(missingReason.status, 400);
    assert.equal(missingReason.json.error, 'Delivery issue reason required.');

    const ok = await jsonFetch(`${baseUrl}/api/orders/ord_1/status`, {
      method: 'PUT',
      headers: { Authorization: adminAuth },
      body: { status: 'delivery_issue', reason: 'Courier reported damaged package.' }
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.status, 'delivery_issue');
    assert.equal(ok.json.deliveryIssue.reason, 'Courier reported damaged package.');
  });

  assert.equal(saveCalls, 1);
  assert.equal(db.orders[0].status, 'delivery_issue');
  assert.equal(db.orders[0].deliveryIssue.reason, 'Courier reported damaged package.');
});

