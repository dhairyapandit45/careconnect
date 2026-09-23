/**
 * Integration Test: Service Requests Workflow & Access Boundaries
 * Verifies customer submission, strict customer ownership isolation, initial status immutability,
 * RBAC access gates, provider quarantine, operational staff visibility, and pagination controls.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const ServiceCategory = require('../src/models/ServiceCategory');
const ServiceRequest = require('../src/models/ServiceRequest');
const { ROLES } = require('../src/constants/roles');
const { SERVICE_REQUEST_STATUS } = require('../src/constants/status');

let mongoServer;
let customer1Token;
let customer1User;
let customer2Token;
let customer2User;
let providerToken;
let adminToken;
let operationsToken;
let activeCategory;
let inactiveCategory;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Register Customer 1
  const c1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Customer One',
    email: 'customer1@test.com',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer1Token = c1Res.body.data.token;
  customer1User = c1Res.body.data.user;

  // Register Customer 2
  const c2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Customer Two',
    email: 'customer2@test.com',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer2Token = c2Res.body.data.token;
  customer2User = c2Res.body.data.user;

  // Register Service Provider
  const pRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Provider Pro',
    email: 'provider@test.com',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  providerToken = pRes.body.data.token;

  // Register Platform Admin
  const aRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Admin Boss',
    email: 'admin@test.com',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = aRes.body.data.token;

  // Register Operations Manager
  const oRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Ops Manager',
    email: 'ops@test.com',
    password: 'Password123!',
    role: ROLES.OPERATIONS_MANAGER,
  });
  operationsToken = oRes.body.data.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await ServiceCategory.deleteMany({});
  await ServiceRequest.deleteMany({});

  activeCategory = await ServiceCategory.create({
    name: 'Plumbing Services',
    slug: 'plumbing-services',
    description: 'Expert residential plumbing',
    icon: 'Droplets',
    pricingUnit: 'HOURLY',
    startingPrice: 70,
    isActive: true,
  });

  inactiveCategory = await ServiceCategory.create({
    name: 'Seasonal Snow Clearing',
    slug: 'seasonal-snow-clearing',
    description: 'Winter snow clearing services',
    icon: 'Hammer',
    isActive: false,
  });
});

describe('Milestone 3: Customer Service Request Workflow & Security', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const validPayload = {
    title: 'Kitchen Sink Drain Blockage',
    description: 'The kitchen sink is backed up completely and water does not drain at all.',
    address: '456 Oak Avenue',
    city: 'Springfield',
    postalCode: '62701',
    state: 'IL',
    preferredDate: tomorrowStr,
    preferredTime: {
      start: '10:00',
      end: '13:00',
    },
    requiredSkills: ['drain cleaning', 'pipe inspection'],
  };

  it('1. should allow customer to submit a service request with forced SUBMITTED status and authenticated ownership', async () => {
    const maliciousPayload = {
      ...validPayload,
      categoryId: activeCategory._id.toString(),
      customer: customer2User._id, // Attempt spoofing customer ownership
      status: 'BOOKED', // Attempt spoofing status
    };

    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send(maliciousPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.serviceRequest.status).toBe(SERVICE_REQUEST_STATUS.SUBMITTED);
    expect(res.body.data.serviceRequest.customer._id).toBe(customer1User._id);
    expect(res.body.data.serviceRequest.title).toBe(validPayload.title);
    expect(res.body.data.serviceRequest.location.address).toBe(validPayload.address);
    expect(res.body.data.serviceRequest.location.city).toBe(validPayload.city);
    expect(res.body.data.serviceRequest.location.postalCode).toBe(validPayload.postalCode);
  });

  it('2. should reject unauthenticated service request submission with 401', async () => {
    const res = await request(app)
      .post('/api/v1/service-requests')
      .send({ ...validPayload, categoryId: activeCategory._id.toString() });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('3. should reject service request submission from non-customers (e.g. PLATFORM_ADMIN or SERVICE_PROVIDER) with 403', async () => {
    const provRes = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ ...validPayload, categoryId: activeCategory._id.toString() });

    expect(provRes.status).toBe(403);
    expect(provRes.body.success).toBe(false);

    const adminRes = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validPayload, categoryId: activeCategory._id.toString() });

    expect(adminRes.status).toBe(403);
    expect(adminRes.body.success).toBe(false);
  });

  it('4. should reject submission with an inactive category with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ ...validPayload, categoryId: inactiveCategory._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CATEGORY_INACTIVE');
  });

  it('5. should reject submission with past preferred date with 422 Unprocessable Entity', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        ...validPayload,
        categoryId: activeCategory._id.toString(),
        preferredDate: pastDate.toISOString().split('T')[0],
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('6. should reject short title (<5 chars) and short description (<15 chars)', async () => {
    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        ...validPayload,
        categoryId: activeCategory._id.toString(),
        title: 'Fix',
        description: 'Broken sink',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('7. should enforce customer data isolation (Customer 1 cannot see Customer 2 requests)', async () => {
    // Create request for Customer 1
    await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ ...validPayload, categoryId: activeCategory._id.toString(), title: 'Customer 1 Request' });

    // Create request for Customer 2
    const c2CreateRes = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ ...validPayload, categoryId: activeCategory._id.toString(), title: 'Customer 2 Request' });

    const c2RequestId = c2CreateRes.body.data.serviceRequest._id;

    // Customer 1 queries listing
    const c1List = await request(app)
      .get('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(c1List.status).toBe(200);
    expect(c1List.body.data.items).toHaveLength(1);
    expect(c1List.body.data.items[0].title).toBe('Customer 1 Request');

    // Customer 1 tries to access Customer 2's specific request detail
    const unauthorizedDetailRes = await request(app)
      .get(`/api/v1/service-requests/${c2RequestId}`)
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(unauthorizedDetailRes.status).toBe(403);
    expect(unauthorizedDetailRes.body.success).toBe(false);
    expect(unauthorizedDetailRes.body.error.code).toBe('FORBIDDEN');
  });

  it('8. should quarantine SERVICE_PROVIDER from GET /api/v1/service-requests with 403', async () => {
    const res = await request(app)
      .get('/api/v1/service-requests')
      .set('Authorization', `Bearer ${providerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('9. should allow operational roles (PLATFORM_ADMIN, OPERATIONS_MANAGER) to inspect all requests', async () => {
    // Create requests for both customers
    await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ ...validPayload, categoryId: activeCategory._id.toString(), title: 'Customer 1 Job' });

    await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ ...validPayload, categoryId: activeCategory._id.toString(), title: 'Customer 2 Job' });

    // Admin lists requests
    const adminList = await request(app)
      .get('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminList.status).toBe(200);
    expect(adminList.body.data.items).toHaveLength(2);

    // Operations lists requests
    const opsList = await request(app)
      .get('/api/v1/service-requests')
      .set('Authorization', `Bearer ${operationsToken}`);

    expect(opsList.status).toBe(200);
    expect(opsList.body.data.items).toHaveLength(2);
  });

  it('10. should paginate requests and enforce limit ceiling of 50', async () => {
    // Request with limit 100
    const res = await request(app)
      .get('/api/v1/service-requests?limit=100')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(50);
  });
});
