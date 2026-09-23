/**
 * Integration Test: Authentication and User Lifecycle
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Authentication Flow & RBAC Architecture', () => {
  const testUser = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'SecurePassword123!',
    phone: '+1-555-0199',
    role: 'CUSTOMER',
  };

  it('should successfully register a customer and omit passwordHash from the response', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('email', 'alice@example.com');
    expect(res.body.data.user).toHaveProperty('role', 'CUSTOMER');
    expect(res.body.data.user.passwordHash).toBeUndefined();

    // Verify database record has hashed password
    const dbUser = await User.findOne({ email: 'alice@example.com' }).select('+passwordHash');
    expect(dbUser).toBeDefined();
    expect(dbUser.passwordHash).not.toBe(testUser.password);
    expect(dbUser.passwordHash.startsWith('$2')).toBe(true);
  });

  it('should reject registration with duplicate email address with a 409 error', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);

    const duplicateRes = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.error.code).toBe('DUPLICATE_RESOURCE');
  });

  it('should reject registration when required fields are missing with 422 validation error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'incomplete@example.com' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('should authenticate valid credentials and issue JWT bearer token', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data).toHaveProperty('token');
    expect(loginRes.body.data.user.email).toBe(testUser.email);
  });

  it('should reject login with wrong password with 401 unauthorized', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'IncorrectPassword!',
      });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
    expect(loginRes.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should allow access to /me with valid JWT token', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(testUser);
    const token = regRes.body.data.token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe(testUser.email);
  });

  it('should reject access to protected routes when token is missing', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
