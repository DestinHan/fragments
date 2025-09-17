const request = require('supertest');
const app = require('../../src/app');

describe('health check /', () => {
  test('returns non-cacheable health json', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toMatch(/no-cache/i);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('author');
    expect(res.body).toHaveProperty('version');
  });
});
