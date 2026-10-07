/**
 * Integration Test: Milestone 7 - Invoice Layer
 * Tests invoice creation upon Job completion, monetary calculations, duplicate prevention,
 * role-based access control, admin transitions, immutability, and edge cases.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

const User = require('../src/models/User');
const ServiceCategory = require('../src/models/ServiceCategory');
const ProviderProfile = require('../src/models/ProviderProfile');
const ServiceRequest = require('../src/models/ServiceRequest');
const Quote = require('../src/models/Quote');
const Booking = require('../src/models/Booking');
const Job = require('../src/models/Job');
const Invoice = require('../src/models/Invoice');

const jobService = require('../src/services/job.service');
const invoiceService = require('../src/services/invoice.service');

const { ROLES } = require('../src/constants/roles');
const {
  PROVIDER_VERIFICATION_STATUS,
  SERVICE_REQUEST_STATUS,
  QUOTE_STATUS,
  BOOKING_STATUS,
  JOB_STATUS,
  INVOICE_STATUS,
  USER_STATUS,
} = require('../src/constants/status');

let mongoServer;
let adminToken;
let adminUser;

let customer1Token;
let customer1User;

let customer2Token;
let customer2User;

let provider1Token;
let provider1User;
let provider1Profile;

let provider2Token;
let provider2User;
let provider2Profile;

let supportToken;
let supportUser;

let testCategory;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Platform Admin',
    email: 'admin.invoice@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = adminRes.body.data.token;
  adminUser = adminRes.body.data.user;

  // Setup Customer 1
  const c1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Customer One',
    email: 'customer1.invoice@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer1Token = c1Res.body.data.token;
  customer1User = c1Res.body.data.user;

  // Setup Customer 2
  const c2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Customer Two',
    email: 'customer2.invoice@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer2Token = c2Res.body.data.token;
  customer2User = c2Res.body.data.user;

  // Setup Provider 1
  const p1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Provider One',
    email: 'provider1.invoice@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider1Token = p1Res.body.data.token;
  provider1User = p1Res.body.data.user;

  provider1Profile = await ProviderProfile.findOneAndUpdate(
    { user: provider1User._id },
    {
      businessName: 'Provider One Services',
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      hourlyRate: 50,
      isActive: true,
    },
    { new: true, upsert: true }
  );

  // Setup Provider 2
  const p2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Provider Two',
    email: 'provider2.invoice@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider2Token = p2Res.body.data.token;
  provider2User = p2Res.body.data.user;

  provider2Profile = await ProviderProfile.findOneAndUpdate(
    { user: provider2User._id },
    {
      businessName: 'Provider Two Services',
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      hourlyRate: 60,
      isActive: true,
    },
    { new: true, upsert: true }
  );

  // Setup Support Agent
  const supRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Support Agent',
    email: 'support.invoice@careconnect.local',
    password: 'Password123!',
    role: ROLES.SUPPORT_AGENT,
  });
  supportToken = supRes.body.data.token;
  supportUser = supRes.body.data.user;

  // Base Service Category
  testCategory = await ServiceCategory.create({
    name: 'Electrical Repairs',
    slug: 'electrical-repairs-inv',
    description: 'Electrical wiring and appliances',
    isActive: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

/**
 * Helper to build a complete Booking and Job pipeline
 */
async function setupCompletedJobFixture({
  customer = customer1User,
  provider = provider1User,
  providerProfile = provider1Profile,
  amount = 150.5,
  completeJob = true,
} = {}) {
  const serviceRequest = await ServiceRequest.create({
    customer: customer._id,
    category: testCategory._id,
    title: 'Fix Living Room Circuit',
    description: 'The breaker trips whenever the AC is switched on.',
    status: SERVICE_REQUEST_STATUS.BOOKED,
    location: {
      address: '123 Test Street, Apartment 4B',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      coordinates: [72.8777, 19.076],
    },
    preferredDate: new Date(Date.now() + 86400000),
  });

  const quote = await Quote.create({
    serviceRequest: serviceRequest._id,
    provider: provider._id,
    providerProfile: providerProfile._id,
    amount,
    currency: 'INR',
    estimatedDuration: 2,
    description: 'Complete diagnosis and circuit replacement',
    status: QUOTE_STATUS.ACCEPTED,
    validUntil: new Date(Date.now() + 86400000),
  });

  const scheduledStart = new Date(Date.now() + 3600000);
  const scheduledEnd = new Date(Date.now() + 7200000);

  const booking = await Booking.create({
    serviceRequest: serviceRequest._id,
    customer: customer._id,
    provider: provider._id,
    providerProfile: providerProfile._id,
    quote: quote._id,
    scheduledStart,
    scheduledEnd,
    price: amount,
    currency: 'INR',
    status: BOOKING_STATUS.CONFIRMED,
  });

  const job = await Job.create({
    booking: booking._id,
    customer: customer._id,
    provider: provider._id,
    status: JOB_STATUS.ASSIGNED,
  });

  if (completeJob) {
    job.status = JOB_STATUS.COMPLETED;
    job.completedAt = new Date();
    await job.save();

    const invoice = await invoiceService.generateInvoiceFromJob(job);
    return { serviceRequest, quote, booking, job, invoice };
  }

  return { serviceRequest, quote, booking, job, invoice: null };
}

describe('Milestone 7: Invoice Layer Integration Tests', () => {
  describe('1. Invoice Generation from Completed Job', () => {
    it('should generate an invoice when a Job transitions to COMPLETED', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: false });
      expect(fixture.job.status).toBe(JOB_STATUS.ASSIGNED);

      // Transition job to IN_PROGRESS so it can be completed
      fixture.job.status = JOB_STATUS.IN_PROGRESS;
      await fixture.job.save();

      // Complete the job via service
      await jobService.complete(fixture.job._id, provider1User._id, 'Job executed successfully');

      const updatedJob = await Job.findById(fixture.job._id);
      expect(updatedJob.status).toBe(JOB_STATUS.COMPLETED);

      const generatedInvoice = await Invoice.findOne({ job: fixture.job._id });
      expect(generatedInvoice).not.toBeNull();
      expect(generatedInvoice.status).toBe(INVOICE_STATUS.ISSUED);
      expect(generatedInvoice.invoiceNumber).toMatch(/^CC-INV-\d{4}-\d{6}$/);
    });

    it('should not generate an invoice for non-completed jobs', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: false });
      const invoice = await invoiceService.generateInvoiceFromJob(fixture.job);
      expect(invoice).toBeNull();

      const invoiceInDb = await Invoice.findOne({ job: fixture.job._id });
      expect(invoiceInDb).toBeNull();
    });
  });

  describe('2. Correct Invoice Amounts and References', () => {
    it('should correctly calculate subtotal, totalAmount in cents, and link all references', async () => {
      const quotePrice = 249.75;
      const fixture = await setupCompletedJobFixture({ amount: quotePrice, completeJob: true });
      const { invoice, job, booking, quote } = fixture;

      expect(invoice).toBeDefined();
      // 249.75 * 100 = 24975 cents
      expect(invoice.subtotal).toBe(24975);
      expect(invoice.tax).toBe(0);
      expect(invoice.platformFee).toBe(0);
      expect(invoice.totalAmount).toBe(24975);

      // Verify entity references
      expect(String(invoice.job)).toBe(String(job._id));
      expect(String(invoice.booking)).toBe(String(booking._id));
      expect(String(invoice.quote)).toBe(String(quote._id));
      expect(String(invoice.customer)).toBe(String(customer1User._id));
      expect(String(invoice.provider)).toBe(String(provider1User._id));
    });
  });

  describe('3. Duplicate Invoice Prevention', () => {
    it('should be idempotent and not create duplicate invoices for the same Job', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: true });
      const originalInvoice = fixture.invoice;

      // Call generation again on the same job
      const secondCallResult = await invoiceService.generateInvoiceFromJob(fixture.job);
      expect(String(secondCallResult._id)).toBe(String(originalInvoice._id));
      expect(secondCallResult.invoiceNumber).toBe(originalInvoice.invoiceNumber);

      const totalInvoicesForJob = await Invoice.countDocuments({ job: fixture.job._id });
      expect(totalInvoicesForJob).toBe(1);
    });

    it('should prevent duplicates under concurrent execution', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: false });
      fixture.job.status = JOB_STATUS.COMPLETED;
      await fixture.job.save();

      // Trigger concurrent generation requests
      const [inv1, inv2] = await Promise.all([
        invoiceService.generateInvoiceFromJob(fixture.job),
        invoiceService.generateInvoiceFromJob(fixture.job),
      ]);

      expect(inv1).toBeDefined();
      expect(inv2).toBeDefined();
      expect(String(inv1._id)).toBe(String(inv2._id));

      const count = await Invoice.countDocuments({ job: fixture.job._id });
      expect(count).toBe(1);
    });
  });

  describe('4. Invoice Retrieval by Authorized Customer', () => {
    it('should allow customer to list their own invoices with pagination', async () => {
      const fixture = await setupCompletedJobFixture({ customer: customer1User, completeJob: true });

      const res = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);

      const found = res.body.data.items.find((i) => i._id === String(fixture.invoice._id));
      expect(found).toBeDefined();
      expect(found.customer).toBe(String(customer1User._id));
      expect(res.body.data.pagination).toHaveProperty('total');
    });

    it('should allow customer to retrieve their specific invoice by ID', async () => {
      const fixture = await setupCompletedJobFixture({ customer: customer1User, completeJob: true });

      const res = await request(app)
        .get(`/api/v1/invoices/${fixture.invoice._id}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice._id).toBe(String(fixture.invoice._id));
      expect(res.body.data.invoice.invoiceNumber).toBe(fixture.invoice.invoiceNumber);
    });
  });

  describe('5. Invoice Retrieval by Authorized Provider', () => {
    it('should allow provider to list their own invoices via /provider endpoint', async () => {
      const fixture = await setupCompletedJobFixture({ provider: provider1User, completeJob: true });

      const res = await request(app)
        .get('/api/v1/invoices/provider')
        .set('Authorization', `Bearer ${provider1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);

      const found = res.body.data.items.find((i) => i._id === String(fixture.invoice._id));
      expect(found).toBeDefined();
      expect(found.provider).toBe(String(provider1User._id));
    });

    it('should allow provider to retrieve their invoice via /provider/:id and shared /:id', async () => {
      const fixture = await setupCompletedJobFixture({ provider: provider1User, completeJob: true });

      // Direct /provider/:id
      const res1 = await request(app)
        .get(`/api/v1/invoices/provider/${fixture.invoice._id}`)
        .set('Authorization', `Bearer ${provider1Token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data.invoice._id).toBe(String(fixture.invoice._id));

      // Shared /:id
      const res2 = await request(app)
        .get(`/api/v1/invoices/${fixture.invoice._id}`)
        .set('Authorization', `Bearer ${provider1Token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.invoice._id).toBe(String(fixture.invoice._id));
    });
  });

  describe("6. Cross-Tenant Isolation: Attempts to Access Another User's Invoice are Rejected", () => {
    it("should reject customer attempts to access another customer's invoice with 403 Forbidden", async () => {
      const fixture = await setupCompletedJobFixture({ customer: customer1User, completeJob: true });

      const res = await request(app)
        .get(`/api/v1/invoices/${fixture.invoice._id}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only access their own invoices/i);
    });

    it("should reject provider attempts to access another provider's invoice with 403 Forbidden", async () => {
      const fixture = await setupCompletedJobFixture({ provider: provider1User, completeJob: true });

      // Try shared /:id
      const res1 = await request(app)
        .get(`/api/v1/invoices/${fixture.invoice._id}`)
        .set('Authorization', `Bearer ${provider2Token}`);

      expect(res1.status).toBe(403);
      expect(res1.body.success).toBe(false);

      // Try provider /provider/:id
      const res2 = await request(app)
        .get(`/api/v1/invoices/provider/${fixture.invoice._id}`)
        .set('Authorization', `Bearer ${provider2Token}`);

      expect(res2.status).toBe(403);
      expect(res2.body.success).toBe(false);
    });
  });

  describe('7. Unauthenticated & Unauthorized Role Rejections', () => {
    it('should reject unauthenticated requests to all invoice endpoints with 401', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: true });

      const resList = await request(app).get('/api/v1/invoices');
      expect(resList.status).toBe(401);

      const resGet = await request(app).get(`/api/v1/invoices/${fixture.invoice._id}`);
      expect(resGet.status).toBe(401);

      const resProv = await request(app).get('/api/v1/invoices/provider');
      expect(resProv.status).toBe(401);

      const resAdmin = await request(app).get('/api/v1/invoices/admin');
      expect(resAdmin.status).toBe(401);

      const resPatch = await request(app)
        .patch(`/api/v1/invoices/${fixture.invoice._id}/status`)
        .send({ status: 'PAID' });
      expect(resPatch.status).toBe(401);
    });

    it('should reject customers attempting admin or provider routes with 403', async () => {
      const fixture = await setupCompletedJobFixture({ customer: customer1User, completeJob: true });

      const resAdmin = await request(app)
        .get('/api/v1/invoices/admin')
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(resAdmin.status).toBe(403);

      const resProv = await request(app)
        .get('/api/v1/invoices/provider')
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(resProv.status).toBe(403);

      const resPatch = await request(app)
        .patch(`/api/v1/invoices/${fixture.invoice._id}/status`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ status: 'PAID' });
      expect(resPatch.status).toBe(403);
    });

    it('should reject providers attempting customer or admin routes with 403', async () => {
      const fixture = await setupCompletedJobFixture({ provider: provider1User, completeJob: true });

      const resCustList = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${provider1Token}`);
      expect(resCustList.status).toBe(403);

      const resAdmin = await request(app)
        .get('/api/v1/invoices/admin')
        .set('Authorization', `Bearer ${provider1Token}`);
      expect(resAdmin.status).toBe(403);
    });

    it('should reject other unauthorized roles (e.g. SUPPORT_AGENT) on invoice detail with 403', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: true });

      const res = await request(app)
        .get(`/api/v1/invoices/${fixture.invoice._id}`)
        .set('Authorization', `Bearer ${supportToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('8. Admin-Only Operations and Status Updates', () => {
    it('should allow admin to list all invoices and retrieve any invoice', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: true });

      const resList = await request(app)
        .get('/api/v1/invoices/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resList.status).toBe(200);
      expect(Array.isArray(resList.body.data.items)).toBe(true);

      const resDetail = await request(app)
        .get(`/api/v1/invoices/${fixture.invoice._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resDetail.status).toBe(200);
      expect(resDetail.body.data.invoice._id).toBe(String(fixture.invoice._id));
    });

    it('should allow admin to update invoice status from ISSUED to PAID and set paidAt timestamp', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: true });

      const res = await request(app)
        .patch(`/api/v1/invoices/${fixture.invoice._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: INVOICE_STATUS.PAID });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.status).toBe(INVOICE_STATUS.PAID);
      expect(res.body.data.invoice.paidAt).toBeDefined();

      const dbInvoice = await Invoice.findById(fixture.invoice._id);
      expect(dbInvoice.status).toBe(INVOICE_STATUS.PAID);
      expect(dbInvoice.paidAt).not.toBeNull();
    });

    it('should allow admin to transition PAID invoice to REFUNDED', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: true });

      // First pay
      await invoiceService.transitionInvoiceStatus(fixture.invoice._id, INVOICE_STATUS.PAID);

      const res = await request(app)
        .patch(`/api/v1/invoices/${fixture.invoice._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: INVOICE_STATUS.REFUNDED });

      expect(res.status).toBe(200);
      expect(res.body.data.invoice.status).toBe(INVOICE_STATUS.REFUNDED);
    });
  });

  describe('9. Invalid Invoice Status Transitions are Rejected', () => {
    it('should reject transition from VOID to PAID with 400 Bad Request', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: true });

      // Transition to VOID
      await invoiceService.transitionInvoiceStatus(fixture.invoice._id, INVOICE_STATUS.VOID);

      const res = await request(app)
        .patch(`/api/v1/invoices/${fixture.invoice._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: INVOICE_STATUS.PAID });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid invoice status transition/i);
    });

    it('should reject transition from ISSUED directly to REFUNDED with 400 Bad Request', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: true });

      const res = await request(app)
        .patch(`/api/v1/invoices/${fixture.invoice._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: INVOICE_STATUS.REFUNDED });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid invoice status transition/i);
    });

    it('should reject invalid or non-existent status values with 400', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: true });

      const res = await request(app)
        .patch(`/api/v1/invoices/${fixture.invoice._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS_XYZ' });

      expect(res.status).toBe(400);
    });

    it('should reject request missing status payload with 400', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: true });

      const res = await request(app)
        .patch(`/api/v1/invoices/${fixture.invoice._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/New status is required/i);
    });
  });

  describe('10. Financial Field Immutability through API', () => {
    it('should reject PUT or non-status PATCH modification attempts with 404', async () => {
      const fixture = await setupCompletedJobFixture({ completeJob: true });

      const putRes = await request(app)
        .put(`/api/v1/invoices/${fixture.invoice._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ subtotal: 0, totalAmount: 0 });
      expect(putRes.status).toBe(404);

      const patchRes = await request(app)
        .patch(`/api/v1/invoices/${fixture.invoice._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ subtotal: 0, totalAmount: 0 });
      expect(patchRes.status).toBe(404);
    });

    it('should ignore attempted financial field injection during status update', async () => {
      const fixture = await setupCompletedJobFixture({ amount: 100, completeJob: true });
      const originalSubtotal = fixture.invoice.subtotal;
      const originalTotal = fixture.invoice.totalAmount;

      const res = await request(app)
        .patch(`/api/v1/invoices/${fixture.invoice._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: INVOICE_STATUS.PAID,
          subtotal: 1,
          totalAmount: 1,
          tax: 99999,
          platformFee: 99999,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.invoice.subtotal).toBe(originalSubtotal);
      expect(res.body.data.invoice.totalAmount).toBe(originalTotal);

      const dbInvoice = await Invoice.findById(fixture.invoice._id);
      expect(dbInvoice.subtotal).toBe(originalSubtotal);
      expect(dbInvoice.totalAmount).toBe(originalTotal);
      expect(dbInvoice.tax).toBe(0);
      expect(dbInvoice.platformFee).toBe(0);
    });
  });

  describe('11. Missing or Invalid Resources', () => {
    it('should return 404 Not Found for non-existent ObjectId', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/v1/invoices/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 Bad Request for malformed ID format', async () => {
      const res = await request(app)
        .get('/api/v1/invoices/malformed-id-123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 404 when patching non-existent invoice status', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/v1/invoices/${nonExistentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: INVOICE_STATUS.PAID });

      expect(res.status).toBe(404);
    });
  });

  describe('12. Edge Cases in Invoice Numbering & Monetary Precision', () => {
    it('should generate properly formatted sequential invoice numbers', async () => {
      const fixture1 = await setupCompletedJobFixture({ completeJob: true });
      const fixture2 = await setupCompletedJobFixture({ completeJob: true });

      const currentYear = new Date().getFullYear();
      expect(fixture1.invoice.invoiceNumber).toMatch(new RegExp(`^CC-INV-${currentYear}-\\d{6}$`));
      expect(fixture2.invoice.invoiceNumber).toMatch(new RegExp(`^CC-INV-${currentYear}-\\d{6}$`));

      const seq1 = parseInt(fixture1.invoice.invoiceNumber.split('-')[3], 10);
      const seq2 = parseInt(fixture2.invoice.invoiceNumber.split('-')[3], 10);
      expect(seq2).toBeGreaterThan(seq1);
    });

    it('should accurately convert decimal currency to integer cents without floating point drift', async () => {
      const fixture = await setupCompletedJobFixture({ amount: 499.99, completeJob: true });
      expect(fixture.invoice.subtotal).toBe(49999);
      expect(fixture.invoice.totalAmount).toBe(49999);
    });
  });
});
