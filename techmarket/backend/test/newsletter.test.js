const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const newsletterRoutes = require('../routes/newsletter');

const createTestApp = ({ db, saveDb }) => {
  const app = express();
  app.use(express.json());
  app.use('/api/newsletter', newsletterRoutes(db, saveDb));
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

test('newsletter: subscribe stores email and blocks duplicates', async () => {
  const db = { newsletter: [] };
  let saveCalls = 0;
  const app = createTestApp({ db, saveDb: () => { saveCalls++; } });

  await withServer(app, async (baseUrl) => {
    const first = await jsonFetch(`${baseUrl}/api/newsletter/subscribe`, {
      method: 'POST',
      body: { email: 'Test@Example.com' }
    });
    assert.equal(first.status, 201);
    assert.equal(first.json.message, 'Subscribed.');
    assert.equal(first.json.subscription.email, 'test@example.com');

    const dup = await jsonFetch(`${baseUrl}/api/newsletter/subscribe`, {
      method: 'POST',
      body: { email: 'test@example.com' }
    });
    assert.equal(dup.status, 400);
    assert.equal(dup.json.error, 'Already subscribed.');
  });

  assert.equal(saveCalls, 1);
  assert.equal(db.newsletter.length, 1);
});

