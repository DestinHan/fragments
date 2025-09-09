const request = require('supertest');
const app = require('../../src/app');

describe('app 404 handler', () => {
  test('unknown routes return 404 with error payload', async () => {
    const res = await request(app).get('/__no_such_route__');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      error: { message: 'not found', code: 404 },
    });
  });
});
