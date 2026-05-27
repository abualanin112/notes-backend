const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');

describe('Request Pipeline Verification', () => {
  describe('Middleware Order & Error Handling', () => {
    it('should return 404 for unknown modular routes', async () => {
      await request(app).get('/v1/unknown-module/route').expect(httpStatus.NOT_FOUND);
    });

    it('should correctly map errors through the error converter and handler', async () => {
      // Because /v1/unknown uses ApiError from our 404 middleware,
      // it verifies that the error pipeline is intact.
      const res = await request(app).get('/v1/invalid-route').expect(httpStatus.NOT_FOUND);
      expect(res.body.error).toHaveProperty('message', 'Not found');
    });
  });

  describe('Route Registration Isolation', () => {
    it('should isolate IAM routes correctly', async () => {
      // Just check if auth route exists (might be 400 or 404 depending on body, but not 404 from Express router)
      const res = await request(app).post('/v1/auth/login').send({});
      expect(res.status).not.toBe(httpStatus.NOT_FOUND); // meaning route is registered
    });

    it('should isolate Notes routes correctly', async () => {
      const res = await request(app).get('/v1/notes');
      expect(res.status).not.toBe(httpStatus.NOT_FOUND); // meaning route is registered
    });
  });

  describe('Application Shell Health', () => {
    it('should expose operational health probes', async () => {
      await request(app).get('/live').expect(httpStatus.OK);
    });
  });
});
