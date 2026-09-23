/**
 * Integration Test: Service Categories Management & Discovery
 * Tests CRUD operations, RBAC enforcement, auto-slug generation, and deletion safety checks.
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
let adminToken;
let customerToken;
let providerToken;
let customerUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup test users
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Admin User',
    email: 'admin.cat@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = adminRes.body.data.token;

  const custRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Customer User',
    email: 'customer.cat@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customerToken = custRes.body.data.token;
  customerUser = custRes.body.data.user;

  const provRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Provider User',
    email: 'provider.cat@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  providerToken = provRes.body.data.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await ServiceCategory.deleteMany({});
  await ServiceRequest.deleteMany({});
});

describe('Milestone 3: Service Categories API Test Suite', () => {
  const sampleCategory = {
    name: 'Appliance Repair',
    description: 'Diagnosis and repair for washers, dryers, and refrigerators',
    icon: 'Wrench',
    pricingUnit: 'HOURLY',
    startingPrice: 65,
    requiredSkills: ['diagnostics', 'electrical', 'refrigeration'],
  };

  it('1. should allow PLATFORM_ADMIN to create a new category with auto-generated slug', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(sampleCategory);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category.name).toBe('Appliance Repair');
    expect(res.body.data.category.slug).toBe('appliance-repair');
    expect(res.body.data.category.pricingUnit).toBe('HOURLY');
    expect(res.body.data.category.startingPrice).toBe(65);
    expect(res.body.data.category.isActive).toBe(true);
  });

  it('2. should reject category creation from unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .send(sampleCategory);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('3. should reject category creation from CUSTOMER or SERVICE_PROVIDER with 403 Forbidden', async () => {
    const custRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(sampleCategory);

    expect(custRes.status).toBe(403);
    expect(custRes.body.success).toBe(false);

    const provRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${providerToken}`)
      .send(sampleCategory);

    expect(provRes.status).toBe(403);
    expect(provRes.body.success).toBe(false);
  });

  it('4. should reject duplicate category name or slug with 409 Conflict', async () => {
    await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(sampleCategory);

    const dupRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...sampleCategory, description: 'Another description' });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.error.code).toBe('DUPLICATE_RESOURCE');
  });

  it('5. should list active categories publicly without authentication', async () => {
    // Create one active and one inactive category
    await ServiceCategory.create({
      name: 'Active Category',
      slug: 'active-cat',
      description: 'Active category description',
      icon: 'Sparkles',
      isActive: true,
    });

    await ServiceCategory.create({
      name: 'Inactive Category',
      slug: 'inactive-cat',
      description: 'Inactive category description',
      icon: 'Hammer',
      isActive: false,
    });

    const res = await request(app).get('/api/v1/categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categories).toHaveLength(1);
    expect(res.body.data.categories[0].name).toBe('Active Category');
  });

  it('6. should allow PLATFORM_ADMIN to view both active and inactive categories with includeInactive=true', async () => {
    await ServiceCategory.create({
      name: 'Active Cat',
      slug: 'active-cat',
      description: 'Active cat desc',
      isActive: true,
    });

    await ServiceCategory.create({
      name: 'Archived Cat',
      slug: 'archived-cat',
      description: 'Archived cat desc',
      isActive: false,
    });

    const res = await request(app)
      .get('/api/v1/categories?includeInactive=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categories).toHaveLength(2);
  });

  it('7. should allow PLATFORM_ADMIN to update category details and toggle active status', async () => {
    const created = await ServiceCategory.create({
      name: 'Original Name',
      slug: 'original-name',
      description: 'Original description here',
      startingPrice: 50,
      isActive: true,
    });

    const updateRes = await request(app)
      .patch(`/api/v1/categories/${created._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated Name',
        startingPrice: 75,
        isActive: false,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.category.name).toBe('Updated Name');
    expect(updateRes.body.data.category.startingPrice).toBe(75);
    expect(updateRes.body.data.category.isActive).toBe(false);
  });

  it('8. should allow PLATFORM_ADMIN to delete an unreferenced category', async () => {
    const cat = await ServiceCategory.create({
      name: 'Deletable Category',
      slug: 'deletable-cat',
      description: 'Can be safely deleted',
    });

    const delRes = await request(app)
      .delete(`/api/v1/categories/${cat._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const found = await ServiceCategory.findById(cat._id);
    expect(found).toBeNull();
  });

  it('9. should reject category deletion with 400 if service requests reference it', async () => {
    const cat = await ServiceCategory.create({
      name: 'Referenced Category',
      slug: 'referenced-cat',
      description: 'Has existing requests',
    });

    await ServiceRequest.create({
      customer: customerUser._id,
      category: cat._id,
      title: 'Fix kitchen sink leak',
      description: 'The kitchen sink pipe is dripping continuously.',
      location: {
        address: '123 Main St',
        city: 'Metropolis',
        postalCode: '10001',
      },
      preferredDate: new Date(Date.now() + 86400000),
      status: SERVICE_REQUEST_STATUS.SUBMITTED,
    });

    const delRes = await request(app)
      .delete(`/api/v1/categories/${cat._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(400);
    expect(delRes.body.success).toBe(false);
    expect(delRes.body.error.code).toBe('CATEGORY_IN_USE');

    // Confirm category is still in database
    const found = await ServiceCategory.findById(cat._id);
    expect(found).not.toBeNull();
  });
});
