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

test('cart: applying coupon persists it and updates totals', async () => {
  const db = createBaseDb();
  db.coupons.push({
    id: 'cpn_welcome10',
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    minOrder: 50,
    maxDiscount: 100,
    usageLimit: 100,
    usedCount: 0,
    isActive: true,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });

  let saveCalls = 0;
  const app = createTestApp({ db, saveDb: () => { saveCalls++; } });
  const auth = createAuthHeader({ id: 'usr_customer', role: 'customer' });

  await withServer(app, async (baseUrl) => {
    await jsonFetch(`${baseUrl}/api/cart/add`, {
      method: 'POST',
      headers: { Authorization: auth },
      body: { productId: 'prod_1', quantity: 1 }
    });

    const apply = await jsonFetch(`${baseUrl}/api/cart/coupon`, {
      method: 'POST',
      headers: { Authorization: auth },
      body: { code: 'welcome10' }
    });

    assert.equal(apply.status, 200);
    assert.equal(apply.json.couponCode, 'WELCOME10');
    assert.equal(apply.json.subtotal, 1000);
    assert.equal(apply.json.discount, 100);
    assert.equal(apply.json.tax, 90);
    assert.equal(apply.json.total, 990);

    const remove = await jsonFetch(`${baseUrl}/api/cart/coupon`, {
      method: 'DELETE',
      headers: { Authorization: auth }
    });

    assert.equal(remove.status, 200);
    assert.equal(remove.json.couponCode, null);
    assert.equal(remove.json.discount, 0);
    assert.equal(remove.json.tax, 100);
    assert.equal(remove.json.total, 1100);
  });

  assert.equal(db.carts[0].couponCode, null);
  assert.equal(saveCalls, 3);
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

test('orders: applies cart coupon when not provided in request body', async () => {
  const db = createBaseDb();
  db.coupons.push({
    id: 'cpn_welcome10',
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    minOrder: 50,
    maxDiscount: 100,
    usageLimit: 100,
    usedCount: 0,
    isActive: true,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
  db.carts.push({ userId: 'usr_customer', items: [{ productId: 'prod_1', quantity: 1 }], couponCode: 'WELCOME10', updatedAt: new Date().toISOString() });

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
    assert.equal(create.json.couponCode, 'WELCOME10');
    assert.equal(create.json.discount, 100);
  });

  assert.equal(db.coupons[0].usedCount, 1);
  assert.equal(db.carts[0].couponCode, null);
  assert.equal(saveCalls, 1);
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

test('orders: customer can view order history (own orders only) with statuses', async () => {
  const db = createBaseDb();
  db.users.push({ id: 'usr_other', firstName: 'Jane', lastName: 'Roe', email: 'jane@example.com', password: 'x', role: 'customer', isActive: true });

  const now = Date.now();
  db.orders.push(
    {
      id: 'ord_old',
      userId: 'usr_customer',
      items: [{ productId: 'prod_1', name: 'Laptop', price: 1000, quantity: 1, image: 'img.png' }],
      subtotal: 1000, discount: 0, shipping: 0, tax: 100, total: 1100,
      status: 'pending',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      shippingAddress: { name: 'John Doe' },
      trackingNumber: 'TM-2026-00001',
      estimatedDelivery: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
      deliveredAt: null,
      couponCode: null,
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'ord_new',
      userId: 'usr_customer',
      items: [{ productId: 'prod_1', name: 'Laptop', price: 1000, quantity: 2, image: 'img.png' }],
      subtotal: 2000, discount: 0, shipping: 0, tax: 200, total: 2200,
      status: 'delivered',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      shippingAddress: { name: 'John Doe' },
      trackingNumber: 'TM-2026-00002',
      estimatedDelivery: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
      deliveredAt: new Date(now - 30 * 60 * 1000).toISOString(),
      couponCode: null,
      createdAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 30 * 60 * 1000).toISOString()
    },
    {
      id: 'ord_other',
      userId: 'usr_other',
      items: [],
      subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0,
      status: 'processing',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      shippingAddress: { name: 'Jane Roe' },
      trackingNumber: 'TM-2026-00003',
      estimatedDelivery: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
      deliveredAt: null,
      couponCode: null,
      createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString()
    }
  );

  const app = createTestApp({ db, saveDb: () => {} });
  const auth = createAuthHeader({ id: 'usr_customer', role: 'customer' });

  await withServer(app, async (baseUrl) => {
    const list = await jsonFetch(`${baseUrl}/api/orders`, {
      headers: { Authorization: auth }
    });

    assert.equal(list.status, 200);
    assert.equal(list.json.orders.length, 2);
    assert.deepEqual(list.json.orders.map(o => o.id), ['ord_new', 'ord_old']);
    assert.equal(list.json.orders[0].status, 'delivered');
    assert.equal(list.json.orders[1].status, 'pending');
    assert.equal(list.json.pagination.total, 2);

    const deliveredOnly = await jsonFetch(`${baseUrl}/api/orders?status=delivered`, {
      headers: { Authorization: auth }
    });
    assert.equal(deliveredOnly.status, 200);
    assert.equal(deliveredOnly.json.orders.length, 1);
    assert.equal(deliveredOnly.json.orders[0].id, 'ord_new');
  });
});

test('orders: customer can view order details, but cannot access others', async () => {
  const db = createBaseDb();
  db.users.push({ id: 'usr_other', firstName: 'Jane', lastName: 'Roe', email: 'jane@example.com', password: 'x', role: 'customer', isActive: true });

  db.orders.push(
    {
      id: 'ord_mine',
      userId: 'usr_customer',
      items: [{ productId: 'prod_1', name: 'Laptop', price: 1000, quantity: 1, image: 'img.png' }],
      subtotal: 1000, discount: 0, shipping: 0, tax: 100, total: 1100,
      status: 'shipped',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      shippingAddress: { name: 'John Doe' },
      trackingNumber: 'TM-2026-00010',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      deliveredAt: null,
      couponCode: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'ord_theirs',
      userId: 'usr_other',
      items: [],
      subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0,
      status: 'pending',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      shippingAddress: { name: 'Jane Roe' },
      trackingNumber: 'TM-2026-00011',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      deliveredAt: null,
      couponCode: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  );

  const app = createTestApp({ db, saveDb: () => {} });
  const auth = createAuthHeader({ id: 'usr_customer', role: 'customer' });

  await withServer(app, async (baseUrl) => {
    const mine = await jsonFetch(`${baseUrl}/api/orders/ord_mine`, {
      headers: { Authorization: auth }
    });
    assert.equal(mine.status, 200);
    assert.equal(mine.json.id, 'ord_mine');
    assert.equal(mine.json.status, 'shipped');
    assert.equal(mine.json.userName, 'John Doe');
    assert.equal(mine.json.items.length, 1);

    const theirs = await jsonFetch(`${baseUrl}/api/orders/ord_theirs`, {
      headers: { Authorization: auth }
    });
    assert.equal(theirs.status, 403);
    assert.equal(theirs.json.error, 'Access denied.');
  });
});

test('orders: admin can list all orders with all=true (order history across users)', async () => {
  const db = createBaseDb();
  db.users.push({ id: 'usr_other', firstName: 'Jane', lastName: 'Roe', email: 'jane@example.com', password: 'x', role: 'customer', isActive: true });
  db.orders.push(
    { id: 'ord_a', userId: 'usr_customer', items: [], subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, status: 'pending', paymentMethod: 'card', paymentStatus: 'paid', shippingAddress: { name: 'John Doe' }, trackingNumber: 'TM-2026-00100', estimatedDelivery: new Date().toISOString(), deliveredAt: null, couponCode: null, createdAt: new Date(Date.now() - 1000).toISOString(), updatedAt: new Date(Date.now() - 1000).toISOString() },
    { id: 'ord_b', userId: 'usr_other', items: [], subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, status: 'processing', paymentMethod: 'card', paymentStatus: 'paid', shippingAddress: { name: 'Jane Roe' }, trackingNumber: 'TM-2026-00101', estimatedDelivery: new Date().toISOString(), deliveredAt: null, couponCode: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  );

  const app = createTestApp({ db, saveDb: () => {} });
  const adminAuth = createAuthHeader({ id: 'usr_admin', role: 'admin' });

  await withServer(app, async (baseUrl) => {
    const list = await jsonFetch(`${baseUrl}/api/orders?all=true`, {
      headers: { Authorization: adminAuth }
    });

    assert.equal(list.status, 200);
    assert.equal(list.json.orders.length, 2);
    assert.equal(list.json.pagination.total, 2);
  });
});

