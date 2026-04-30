const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const aiRoutes = require('../routes/ai');

const createTestApp = ({ db }) => {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', aiRoutes(db));
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
  settings: { storeName: 'TechMarket', currency: 'USD' },
  products: [{ id: 'prod_1', name: 'Laptop', description: 'Fast laptop', brand: 'TechBrand', price: 1000, stock: 5, isActive: true }]
});

test('ai: status shows configured=false when key is missing', async () => {
  const prev = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const app = createTestApp({ db: createBaseDb() });
  await withServer(app, async (baseUrl) => {
    const res = await jsonFetch(`${baseUrl}/api/ai/status`);
    assert.equal(res.status, 200);
    assert.equal(res.json.configured, false);
  });

  if (prev) process.env.OPENAI_API_KEY = prev;
});

test('ai: chat returns 501 when key is missing', async () => {
  const prev = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const app = createTestApp({ db: createBaseDb() });
  await withServer(app, async (baseUrl) => {
    const res = await jsonFetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'hello' }] }
    });
    assert.equal(res.status, 501);
    assert.match(res.json.error, /OPENAI_API_KEY/i);
  });

  if (prev) process.env.OPENAI_API_KEY = prev;
});

