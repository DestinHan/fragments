const request = require('supertest');
const app = require('../../src/app');

const AUTH = { user: 'user1', pass: 'password' };

describe('/v1/fragments routes', () => {
  test('unauthenticated GET /v1/fragments -> 401', async () => {
    const res = await request(app).get('/v1/fragments');
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
  });

  test('GET /v1/fragments (auth) -> 200 []', async () => {
    const res = await request(app).get('/v1/fragments').auth(AUTH.user, AUTH.pass);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.fragments)).toBe(true);
  });

  test('POST /v1/fragments (text/plain) -> 201 with Location', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(AUTH.user, AUTH.pass)
      .set('Content-Type', 'text/plain')
      .send('hello');

    expect(res.status).toBe(201);
    expect(res.headers).toHaveProperty('location');
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment.type).toMatch(/^text\/plain/);
    expect(res.body.fragment.size).toBe(5);
  });

  test('GET /v1/fragments?expand=1 returns full fragments', async () => {
    const res = await request(app).get('/v1/fragments?expand=1').auth(AUTH.user, AUTH.pass);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.fragments)).toBe(true);
    if (res.body.fragments.length) {
      const f = res.body.fragments[0];
      expect(f).toHaveProperty('id');
      expect(f).toHaveProperty('ownerId');
      expect(f).toHaveProperty('type');
      expect(f).toHaveProperty('size');
    }
  });

  test('GET /v1/fragments/:id returns stored data with correct Content-Type', async () => {
    const created = await request(app)
      .post('/v1/fragments')
      .auth(AUTH.user, AUTH.pass)
      .set('Content-Type', 'text/plain')
      .send('abc');
    const id = created.body.fragment.id;

    const res = await request(app).get(`/v1/fragments/${id}`).auth(AUTH.user, AUTH.pass);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/plain/);
    expect(res.text).toBe('abc');
  });

  test('GET /v1/fragments/:id/info returns metadata', async () => {
    const created = await request(app)
      .post('/v1/fragments')
      .auth(AUTH.user, AUTH.pass)
      .set('Content-Type', 'text/plain')
      .send('x');
    const id = created.body.fragment.id;

    const res = await request(app).get(`/v1/fragments/${id}/info`).auth(AUTH.user, AUTH.pass);
    expect(res.status).toBe(200);
    expect(res.body.fragment.id).toBe(id);
    expect(res.body.fragment).toHaveProperty('ownerId');
    expect(res.body.fragment).toHaveProperty('type');
  });

  test('DELETE /v1/fragments/:id removes fragment and subsequent GET -> 404', async () => {
    const created = await request(app)
      .post('/v1/fragments')
      .auth(AUTH.user, AUTH.pass)
      .set('Content-Type', 'text/plain')
      .send('bye');
    const id = created.body.fragment.id;

    const del = await request(app).delete(`/v1/fragments/${id}`).auth(AUTH.user, AUTH.pass);
    expect(del.status).toBe(200);

    const get = await request(app).get(`/v1/fragments/${id}`).auth(AUTH.user, AUTH.pass);
    expect(get.status).toBe(404);
  });

  test('POST unsupported content-type -> 415', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(AUTH.user, AUTH.pass)
      .set('Content-Type', 'application/xml')
      .send('<x/>');

    expect(res.status).toBe(415);
  });
});
