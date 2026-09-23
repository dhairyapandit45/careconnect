/**
 * Integration Test: Health Check Endpoint
 */

const request = require('supertest');
const app = require('../src/app');

describe('GET /api/v1/health', () => {
  it('should return 200 OK and health confirmation message', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'CareConnect API is running');
    expect(res.body.data).toHaveProperty('environment');
    expect(res.body.data).toHaveProperty('timestamp');
  });

  it('should handle undefined routes with standardized 404 response', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-404');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});
