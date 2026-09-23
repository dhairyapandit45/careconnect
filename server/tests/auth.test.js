/**
 * Integration Test: Authentication, Security, and RBAC Architecture
 * Exercises all 14 required verification scenarios against an in-memory MongoDB database.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const { ROLES } = require('../src/constants/roles');
const { USER_STATUS } = require('../src/constants/status');
const { env } = require('../src/config/env');

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

describe('Milestone 2: Authentication, Security & RBAC Hardening Test Suite', () => {
  const validCustomer = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'SecurePassword123!',
    phone: '+1-555-0199',
    role: ROLES.CUSTOMER,
  };

  const validAdmin = {
    name: 'Platform Administrator',
    email: 'admin@careconnect.local',
    password: 'SuperAdminSecretPass1!',
    role: ROLES.PLATFORM_ADMIN,
  };

  // 1. Successful registration
  it('1. should successfully register a customer and return sanitized user data and JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(validCustomer);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('User registered successfully');
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('name', 'Alice Johnson');
    expect(res.body.data.user).toHaveProperty('email', 'alice@example.com');
    expect(res.body.data.user).toHaveProperty('role', ROLES.CUSTOMER);
    expect(res.body.data.user).toHaveProperty('status', USER_STATUS.ACTIVE);
  });

  // 2. Duplicate email rejection
  it('2. should reject registration with duplicate email address with a 409 conflict error', async () => {
    await request(app).post('/api/v1/auth/register').send(validCustomer);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validCustomer, name: 'Alice Duplicate' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_RESOURCE');
  });

  // 3. Invalid email rejection
  it('3. should reject registration with an invalid email format with a 422 error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...validCustomer,
        email: 'invalid-email-not-an-address',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field.includes('email'))).toBe(true);
  });

  // 4. Weak password rejection
  it('4. should reject registration when password is weak (< 8 characters) with a 422 error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...validCustomer,
        password: 'short',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field.includes('password'))).toBe(true);
  });

  // 5. Successful login
  it('5. should authenticate valid credentials, verify bcrypt hash, and issue JWT', async () => {
    await request(app).post('/api/v1/auth/register').send(validCustomer);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: '  ALICE@example.COM  ', // Tests normalization
        password: validCustomer.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('alice@example.com');
  });

  // 6. Incorrect password rejection
  it('6. should reject login with incorrect password with 401 unauthorized', async () => {
    await request(app).post('/api/v1/auth/register').send(validCustomer);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: validCustomer.email,
        password: 'WrongPassword456!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 7. Inactive / suspended account rejection
  it('7. should reject login for suspended and inactive accounts with 403 forbidden', async () => {
    // Create suspended user
    await User.create({
      name: 'Suspended User',
      email: 'suspended@example.com',
      passwordHash: 'ValidPassword123!',
      role: ROLES.CUSTOMER,
      status: USER_STATUS.SUSPENDED,
    });

    // Create inactive user
    await User.create({
      name: 'Inactive User',
      email: 'inactive@example.com',
      passwordHash: 'ValidPassword123!',
      role: ROLES.CUSTOMER,
      status: USER_STATUS.INACTIVE,
    });

    const resSuspended = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'suspended@example.com', password: 'ValidPassword123!' });

    expect(resSuspended.status).toBe(403);
    expect(resSuspended.body.message).toContain('suspended');

    const resInactive = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'inactive@example.com', password: 'ValidPassword123!' });

    expect(resInactive.status).toBe(403);
    expect(resInactive.body.message).toContain('inactive');
  });

  // 8. Missing JWT
  it('8. should reject access to protected routes when JWT authorization header is missing', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 9. Invalid JWT
  it('9. should reject malformed or tampered JWT tokens with 401 unauthorized', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.tampered.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 10. Expired JWT
  it('10. should reject expired JWT tokens with 401 unauthorized', async () => {
    const user = await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      passwordHash: 'ValidPassword123!',
      role: ROLES.CUSTOMER,
      status: USER_STATUS.ACTIVE,
    });

    // Sign an already expired token (expired 10 seconds ago)
    const expiredToken = jwt.sign(
      { id: user._id.toString(), role: user.role },
      env.JWT_SECRET,
      { expiresIn: '-10s' }
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('expired');
  });

  // 11. /me profile retrieval
  it('11. should return authenticated user profile from /me without passwordHash', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(validCustomer);
    const token = regRes.body.data.token;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validCustomer.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  // 12. Unauthorized role blocked from admin routes (RBAC enforcement)
  it('12. should block CUSTOMER from accessing PLATFORM_ADMIN routes with 403 Forbidden', async () => {
    const custRes = await request(app).post('/api/v1/auth/register').send(validCustomer);
    const customerToken = custRes.body.data.token;

    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.message).toContain('does not have required permissions');
  });

  // 13. Authorized role access to admin routes
  it('13. should allow PLATFORM_ADMIN to access /admin/dashboard with 200 OK', async () => {
    const adminRes = await request(app).post('/api/v1/auth/register').send(validAdmin);
    const adminToken = adminRes.body.data.token;

    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('systemStatus', 'HEALTHY');
    expect(res.body.data).toHaveProperty('activeRole', ROLES.PLATFORM_ADMIN);
  });

  // 14. passwordHash not returned from any API response or queries
  it('14. should guarantee that passwordHash is never returned or leaked in responses', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(validCustomer);
    expect(regRes.body.data.user.passwordHash).toBeUndefined();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validCustomer.email, password: validCustomer.password });
    expect(loginRes.body.data.user.passwordHash).toBeUndefined();

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.token}`);
    expect(meRes.body.data.user.passwordHash).toBeUndefined();
  });
});
