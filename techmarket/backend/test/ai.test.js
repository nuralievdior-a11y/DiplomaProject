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
  const prev = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const app = createTestApp({ db: createBaseDb() });
    await withServer(app, async (baseUrl) => {
      const res = await jsonFetch(`${baseUrl}/api/ai/status`);
      assert.equal(res.status, 200);
      assert.equal(res.json.provider, 'gemini');
      assert.equal(res.json.configured, false);
    });
  } finally {
    if (prev) process.env.GEMINI_API_KEY = prev;
  }
});

test('ai: chat returns 501 when key is missing', async () => {
  const prev = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const app = createTestApp({ db: createBaseDb() });
    await withServer(app, async (baseUrl) => {
      const res = await jsonFetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        body: { messages: [{ role: 'user', content: 'hello' }] }
      });
      assert.equal(res.status, 501);
      assert.match(res.json.error, /GEMINI_API_KEY/i);
    });
  } finally {
    if (prev) process.env.GEMINI_API_KEY = prev;
  }
});

test('ai: chat sends Gemini request and returns text', async () => {
  const prevKey = process.env.GEMINI_API_KEY;
  const prevModel = process.env.GEMINI_MODEL;
  const prevBaseUrl = process.env.GEMINI_BASE_URL;
  const prevFetch = global.fetch;
  let upstreamRequest;

  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.GEMINI_MODEL = 'gemini-test-model';
  process.env.GEMINI_BASE_URL = 'https://gemini.example/v1beta';

  global.fetch = async (url, options) => {
    upstreamRequest = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Sure, here is a laptop.' }] } }]
      })
    };
  };

  try {
    const app = createTestApp({ db: createBaseDb() });
    await withServer(app, async (baseUrl) => {
      const res = await jsonFetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        body: {
          messages: [
            { role: 'assistant', content: 'Welcome message' },
            { role: 'user', content: 'Do you have a laptop?' }
          ]
        }
      });

      assert.equal(res.status, 200);
      assert.equal(res.json.message, 'Sure, here is a laptop.');
      assert.equal(upstreamRequest.url, 'https://gemini.example/v1beta/models/gemini-test-model:generateContent');
      assert.equal(upstreamRequest.options.headers['x-goog-api-key'], 'test-gemini-key');
      assert.equal(upstreamRequest.body.contents.length, 1);
      assert.equal(upstreamRequest.body.contents[0].role, 'user');
      assert.match(upstreamRequest.body.systemInstruction.parts[0].text, /Relevant products/i);
    });
  } finally {
    global.fetch = prevFetch;
    if (prevKey) process.env.GEMINI_API_KEY = prevKey; else delete process.env.GEMINI_API_KEY;
    if (prevModel) process.env.GEMINI_MODEL = prevModel; else delete process.env.GEMINI_MODEL;
    if (prevBaseUrl) process.env.GEMINI_BASE_URL = prevBaseUrl; else delete process.env.GEMINI_BASE_URL;
  }
});

