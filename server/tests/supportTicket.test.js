/**
 * Integration Test: Milestone 8B - Support Ticket Module
 * Tests ticket creation, human-readable ticket numbering, RBAC boundaries,
 * related-resource ownership, conversation threads & internal staff notes,
 * priority updates, staff assignment, state machine transitions, and terminal closure.
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
const Dispute = require('../src/models/Dispute');
const SupportTicket = require('../src/models/SupportTicket');

const { ROLES } = require('../src/constants/roles');
const {
  PROVIDER_VERIFICATION_STATUS,
  SERVICE_REQUEST_STATUS,
  QUOTE_STATUS,
  BOOKING_STATUS,
  JOB_STATUS,
  DISPUTE_STATUS,
  SUPPORT_TICKET_STATUS,
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_CATEGORY,
} = require('../src/constants/status');

let mongoServer;
let adminToken;
let adminUser;

let supportToken;
let supportUser;

let opsToken;
let opsUser;

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

let testCategory;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup Platform Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Platform Admin',
    email: 'admin.support@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = adminRes.body.data.token;
  adminUser = adminRes.body.data.user;

  // Setup Support Agent
  const supRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Support Agent Jane',
    email: 'support.agent@careconnect.local',
    password: 'Password123!',
    role: ROLES.SUPPORT_AGENT,
  });
  supportToken = supRes.body.data.token;
  supportUser = supRes.body.data.user;

  // Setup Operations Manager
  const opsRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Operations Manager Jack',
    email: 'ops.manager@careconnect.local',
    password: 'Password123!',
    role: ROLES.OPERATIONS_MANAGER,
  });
  opsToken = opsRes.body.data.token;
  opsUser = opsRes.body.data.user;

  // Setup Customer 1
  const c1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Alice Customer',
    email: 'alice.support@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer1Token = c1Res.body.data.token;
  customer1User = c1Res.body.data.user;

  // Setup Customer 2
  const c2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Bob Customer',
    email: 'bob.support@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer2Token = c2Res.body.data.token;
  customer2User = c2Res.body.data.user;

  // Setup Provider 1
  const p1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Dave Plumber',
    email: 'dave.support@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider1Token = p1Res.body.data.token;
  provider1User = p1Res.body.data.user;

  provider1Profile = await ProviderProfile.findOneAndUpdate(
    { user: provider1User._id },
    {
      businessName: 'Dave Plumbing Pro',
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      hourlyRate: 50,
      isActive: true,
    },
    { new: true, upsert: true }
  );

  // Setup Provider 2
  const p2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Evan Electrician',
    email: 'evan.support@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider2Token = p2Res.body.data.token;
  provider2User = p2Res.body.data.user;

  provider2Profile = await ProviderProfile.findOneAndUpdate(
    { user: provider2User._id },
    {
      businessName: 'Evan Electrical Masters',
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      hourlyRate: 60,
      isActive: true,
    },
    { new: true, upsert: true }
  );

  // Base Service Category
  testCategory = await ServiceCategory.create({
    name: 'Appliance Repair',
    slug: 'appliance-repair-tkt',
    description: 'Domestic and commercial appliance maintenance',
    isActive: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

/**
 * Fixture builder for complete Booking, Job, and Dispute pipeline
 */
async function setupResourcesFixture({
  customer = customer1User,
  provider = provider1User,
  providerProfile = provider1Profile,
} = {}) {
  const serviceRequest = await ServiceRequest.create({
    customer: customer._id,
    category: testCategory._id,
    title: 'Washing Machine Drainage Issue',
    description: 'Water does not drain after spin cycle finishes.',
    status: SERVICE_REQUEST_STATUS.BOOKED,
    location: {
      address: '15 Queens Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400004',
      coordinates: [72.82, 18.95],
    },
    preferredDate: new Date(Date.now() + 86400000),
  });

  const quote = await Quote.create({
    serviceRequest: serviceRequest._id,
    provider: provider._id,
    providerProfile: providerProfile._id,
    amount: 180,
    currency: 'INR',
    estimatedDuration: 2,
    description: 'Pump check and pipe clearance',
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
    price: 180,
    currency: 'INR',
    status: BOOKING_STATUS.IN_PROGRESS,
  });

  const job = await Job.create({
    booking: booking._id,
    customer: customer._id,
    provider: provider._id,
    status: JOB_STATUS.IN_PROGRESS,
  });

  const dispute = await Dispute.create({
    booking: booking._id,
    job: job._id,
    customer: customer._id,
    provider: provider._id,
    raisedBy: customer._id,
    reason: 'Defective pump replacement',
    description: 'The replacement pump is leaking continuously.',
    status: DISPUTE_STATUS.OPEN,
  });

  return { serviceRequest, quote, booking, job, dispute };
}

describe('Milestone 8B: Support Ticket Module Integration Tests', () => {
  // 1. Unauthenticated user cannot access tickets
  describe('1. Unauthenticated Request Rejection', () => {
    it('should reject unauthenticated POST /api/v1/support-tickets with 401', async () => {
      const res = await request(app).post('/api/v1/support-tickets').send({
        subject: 'General Question',
        description: 'Testing unauthenticated access rejection.',
      });
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/v1/support-tickets with 401', async () => {
      const res = await request(app).get('/api/v1/support-tickets');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/v1/support-tickets/:id with 401', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/v1/support-tickets/${id}`);
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated POST /api/v1/support-tickets/:id/messages with 401', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const res = await request(app).post(`/api/v1/support-tickets/${id}/messages`).send({
        message: 'Hello support team',
      });
      expect(res.status).toBe(401);
    });
  });

  // 2. Customer can create a ticket
  describe('2. Customer Ticket Creation', () => {
    it('should allow customer to create a support ticket with human-readable ticket number', async () => {
      const res = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'App Billing Query',
          description: 'I need clarification on the GST component charged on my last invoice.',
          category: SUPPORT_TICKET_CATEGORY.PAYMENT,
          priority: SUPPORT_TICKET_PRIORITY.MEDIUM,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticket).toBeDefined();

      const tkt = res.body.data.ticket;
      expect(tkt.ticketNumber).toMatch(/^CC-TKT-\d{4}-\d{6}$/);
      expect(tkt.createdBy.toString()).toBe(customer1User._id.toString());
      expect(tkt.customer.toString()).toBe(customer1User._id.toString());
      expect(tkt.status).toBe(SUPPORT_TICKET_STATUS.OPEN);
      expect(tkt.messages).toHaveLength(1);
      expect(tkt.messages[0].sender.toString()).toBe(customer1User._id.toString());
    });

    it('should ignore client-supplied createdBy/customer and derive identity server-side', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          createdBy: fakeId,
          customer: fakeId,
          provider: fakeId,
          subject: 'Identity Derivation Verification',
          description: 'Server must not trust client supplied participant IDs.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ticket.createdBy.toString()).toBe(customer1User._id.toString());
      expect(res.body.data.ticket.customer.toString()).toBe(customer1User._id.toString());
    });
  });

  // 3. Provider can create a ticket
  describe('3. Provider Ticket Creation', () => {
    it('should allow service provider to create a support ticket', async () => {
      const res = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({
          subject: 'Payout Schedule Inquiry',
          description: 'Can support clarify when weekly bank transfers are executed?',
          category: SUPPORT_TICKET_CATEGORY.PAYMENT,
          priority: SUPPORT_TICKET_PRIORITY.LOW,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ticket.createdBy.toString()).toBe(provider1User._id.toString());
      expect(res.body.data.ticket.provider.toString()).toBe(provider1User._id.toString());
      expect(res.body.data.ticket.status).toBe(SUPPORT_TICKET_STATUS.OPEN);
    });
  });

  // 4. Customer cannot view another customer's ticket
  describe("4. Customer Cannot View Another Customer's Ticket", () => {
    it("should reject customer attempting to view another customer's ticket with 403", async () => {
      // Customer 1 creates ticket
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Customer 1 Confidential Ticket',
          description: 'Private customer information regarding account safety.',
        });

      const ticketId = createRes.body.data.ticket._id;

      // Customer 2 attempts to view Customer 1's ticket
      const res = await request(app)
        .get(`/api/v1/support-tickets/${ticketId}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission/i);
    });
  });

  // 5. Provider cannot view another provider's ticket
  describe("5. Provider Cannot View Another Provider's Ticket", () => {
    it("should reject provider attempting to view another provider's ticket with 403", async () => {
      // Provider 1 creates ticket
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({
          subject: 'Provider 1 Verification Inquiry',
          description: 'Private provider credentials clarification request.',
        });

      const ticketId = createRes.body.data.ticket._id;

      // Provider 2 attempts to view Provider 1's ticket
      const res = await request(app)
        .get(`/api/v1/support-tickets/${ticketId}`)
        .set('Authorization', `Bearer ${provider2Token}`);

      expect(res.status).toBe(403);
    });
  });

  // 6. Customer cannot access unrelated private ticket
  describe('6. Customer Cannot Access Unrelated Private Ticket', () => {
    it('should reject customer attempting to post reply to unrelated ticket with 403', async () => {
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Customer 1 Exclusive Ticket',
          description: 'Initial message on customer 1 ticket.',
        });

      const ticketId = createRes.body.data.ticket._id;

      // Customer 2 attempts to post reply to Customer 1's ticket
      const res = await request(app)
        .post(`/api/v1/support-tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          message: 'Intruding message on another user ticket.',
        });

      expect(res.status).toBe(403);
    });
  });

  // 7. Support agent can access authorized support queue
  describe('7. Support Agent Queue Access', () => {
    it('should allow support agent to view all tickets in the platform support queue', async () => {
      const res = await request(app)
        .get('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should allow support agent to inspect any ticket details', async () => {
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Inspection by Support Agent',
          description: 'Ticket to be reviewed by Jane in support queue.',
        });

      const ticketId = createRes.body.data.ticket._id;

      const res = await request(app)
        .get(`/api/v1/support-tickets/${ticketId}`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ticket._id.toString()).toBe(ticketId.toString());
    });
  });

  // 8. Support agent can update permitted fields (status, priority, assignment)
  describe('8. Support Agent Field Management', () => {
    it('should allow support agent to assign ticket, update priority, and advance status', async () => {
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Urgent System Bug',
          description: 'Application crashes when clicking download PDF button.',
        });

      const ticketId = createRes.body.data.ticket._id;

      // 1. Assign ticket to supportUser
      const assignRes = await request(app)
        .patch(`/api/v1/support-tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ assignedTo: supportUser._id.toString() });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.ticket.assignedTo.toString()).toBe(supportUser._id.toString());
      expect(assignRes.body.data.ticket.status).toBe(SUPPORT_TICKET_STATUS.IN_PROGRESS);

      // 2. Escalate priority to URGENT
      const priorityRes = await request(app)
        .patch(`/api/v1/support-tickets/${ticketId}/priority`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ priority: SUPPORT_TICKET_PRIORITY.URGENT });

      expect(priorityRes.status).toBe(200);
      expect(priorityRes.body.data.ticket.priority).toBe(SUPPORT_TICKET_PRIORITY.URGENT);

      // 3. Move status to WAITING_FOR_CUSTOMER
      const statusRes = await request(app)
        .patch(`/api/v1/support-tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ status: SUPPORT_TICKET_STATUS.WAITING_FOR_CUSTOMER });

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.ticket.status).toBe(SUPPORT_TICKET_STATUS.WAITING_FOR_CUSTOMER);
    });
  });

  // 9. Customer/provider cannot perform support-agent/admin operations
  describe('9. Customer/Provider Operation Restrictions', () => {
    it('should reject customer attempting to reassign ticket with 403', async () => {
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Self-assignment restriction test',
          description: 'Customer attempts to assign ticket to someone else.',
        });

      const ticketId = createRes.body.data.ticket._id;

      const res = await request(app)
        .patch(`/api/v1/support-tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ assignedTo: supportUser._id.toString() });

      expect(res.status).toBe(403);
    });

    it('should reject provider attempting to change ticket priority with 403', async () => {
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({
          subject: 'Priority alteration restriction',
          description: 'Provider attempts to force URGENT priority on their ticket.',
        });

      const ticketId = createRes.body.data.ticket._id;

      const res = await request(app)
        .patch(`/api/v1/support-tickets/${ticketId}/priority`)
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({ priority: SUPPORT_TICKET_PRIORITY.URGENT });

      expect(res.status).toBe(403);
    });
  });

  // 10. Related Booking/Job/Dispute ownership is enforced
  describe('10. Related Resource Ownership Enforcement', () => {
    it("should reject customer attempting to link another customer's booking with 403", async () => {
      const fixture = await setupResourcesFixture({ customer: customer1User, provider: provider1User });

      // Customer 2 attempts to create ticket referencing Customer 1's booking
      const res = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          subject: 'Attaching unrelated booking',
          description: 'Trying to reference booking belonging to someone else.',
          relatedBookingId: fixture.booking._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized to attach/i);
    });

    it("should reject customer attempting to link another customer's dispute with 403", async () => {
      const fixture = await setupResourcesFixture({ customer: customer1User, provider: provider1User });

      // Customer 2 attempts to create ticket referencing Customer 1's dispute
      const res = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          subject: 'Attaching unrelated dispute',
          description: 'Trying to reference dispute belonging to someone else.',
          relatedDisputeId: fixture.dispute._id.toString(),
        });

      expect(res.status).toBe(403);
    });

    it('should allow customer to link their own valid Booking, Job, and Dispute', async () => {
      const fixture = await setupResourcesFixture({ customer: customer1User, provider: provider1User });

      const res = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Dispute escalation to senior support',
          description: 'Please review the active dispute regarding the broken pump.',
          relatedBookingId: fixture.booking._id.toString(),
          relatedJobId: fixture.job._id.toString(),
          relatedDisputeId: fixture.dispute._id.toString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ticket.relatedBooking.toString()).toBe(fixture.booking._id.toString());
      expect(res.body.data.ticket.relatedJob.toString()).toBe(fixture.job._id.toString());
      expect(res.body.data.ticket.relatedDispute.toString()).toBe(fixture.dispute._id.toString());
    });
  });

  // 11. Invalid status transitions are rejected
  describe('11. Invalid Status Transitions', () => {
    it('should reject invalid transition from CLOSED to OPEN with 400', async () => {
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Closure transition test',
          description: 'Ticket will be closed and then illegally reopened.',
        });

      const ticketId = createRes.body.data.ticket._id;

      // Close the ticket
      await request(app)
        .patch(`/api/v1/support-tickets/${ticketId}/close`)
        .set('Authorization', `Bearer ${customer1Token}`);

      // Attempt to move back to OPEN
      const res = await request(app)
        .patch(`/api/v1/support-tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ status: SUPPORT_TICKET_STATUS.OPEN });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/closed.*cannot be modified|invalid.*transition/i);
    });
  });

  // 12. Invalid priority/category values are rejected
  describe('12. Invalid Priority and Category Rejection', () => {
    it('should reject invalid priority value with 422', async () => {
      const res = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Invalid Priority Test',
          description: 'Sending bogus priority enum value.',
          priority: 'CRITICAL_NOW',
        });

      expect(res.status).toBe(422);
    });

    it('should reject invalid category value with 422', async () => {
      const res = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Invalid Category Test',
          description: 'Sending bogus category enum value.',
          category: 'RANDOM_CATEGORY',
        });

      expect(res.status).toBe(422);
    });
  });

  // 13. Closed tickets cannot be improperly modified
  describe('13. Closed Ticket Immutability', () => {
    it('should reject adding messages to a closed ticket with 400', async () => {
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Completed Matter',
          description: 'All questions answered; closing ticket.',
        });

      const ticketId = createRes.body.data.ticket._id;

      // Customer closes ticket
      await request(app)
        .patch(`/api/v1/support-tickets/${ticketId}/close`)
        .set('Authorization', `Bearer ${customer1Token}`);

      // Attempt to post new message
      const res = await request(app)
        .post(`/api/v1/support-tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ message: 'Can I ask one more question?' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/closed/i);
    });
  });

  // 14. Ticket numbers are unique
  describe('14. Unique Human-Readable Ticket Number Generation', () => {
    it('should generate distinct, sequential ticket numbers for successive creations', async () => {
      const res1 = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Sequential Number Test 1',
          description: 'First sequential ticket in batch test.',
        });

      const res2 = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Sequential Number Test 2',
          description: 'Second sequential ticket in batch test.',
        });

      const num1 = res1.body.data.ticket.ticketNumber;
      const num2 = res2.body.data.ticket.ticketNumber;

      expect(num1).toBeDefined();
      expect(num2).toBeDefined();
      expect(num1).not.toBe(num2);
      expect(num1).toMatch(/^CC-TKT-\d{4}-\d{6}$/);
      expect(num2).toMatch(/^CC-TKT-\d{4}-\d{6}$/);
    });
  });

  // 15. Message authorship is derived server-side
  describe('15. Message Authorship Derivation', () => {
    it('should correctly derive sender and senderRole from authenticated user', async () => {
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Conversation Thread Test',
          description: 'Initial customer request message.',
        });

      const ticketId = createRes.body.data.ticket._id;

      // Support agent replies
      const fakeSenderId = new mongoose.Types.ObjectId().toString();
      const replyRes = await request(app)
        .post(`/api/v1/support-tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          sender: fakeSenderId,
          senderRole: 'PLATFORM_ADMIN',
          message: 'Hello, I am reviewing your request and will assist shortly.',
        });

      expect(replyRes.status).toBe(200);

      const updatedTicket = replyRes.body.data.ticket;
      const agentMsg = updatedTicket.messages.find(
        (m) => m.message === 'Hello, I am reviewing your request and will assist shortly.'
      );
      expect(agentMsg).toBeDefined();
      expect(agentMsg.sender.toString()).toBe(supportUser._id.toString());
      expect(agentMsg.senderRole).toBe(ROLES.SUPPORT_AGENT);
    });
  });

  // 16. Unauthorized users cannot read ticket messages and internal notes are concealed
  describe('16. Internal Notes Isolation and Message Security', () => {
    it('should conceal internal support notes from customer view while showing them to staff', async () => {
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Internal Note Visibility Check',
          description: 'Customer inquiry for testing confidential staff notes.',
        });

      const ticketId = createRes.body.data.ticket._id;

      // Staff adds an internal note
      await request(app)
        .post(`/api/v1/support-tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          message: 'Internal Staff Note: Suspected fraudulent refund history.',
          isInternal: true,
        });

      // Staff adds a public customer-facing reply
      await request(app)
        .post(`/api/v1/support-tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          message: 'We are processing your inquiry and will update you shortly.',
          isInternal: false,
        });

      // Customer fetches ticket detail: internal note MUST NOT be visible
      const custViewRes = await request(app)
        .get(`/api/v1/support-tickets/${ticketId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(custViewRes.status).toBe(200);
      const custMessages = custViewRes.body.data.ticket.messages;
      const foundInternalInCust = custMessages.find((m) => m.isInternal === true);
      expect(foundInternalInCust).toBeUndefined();
      expect(custMessages.some((m) => m.message.includes('Suspected fraudulent'))).toBe(false);

      // Staff fetches ticket detail: internal note MUST be visible
      const staffViewRes = await request(app)
        .get(`/api/v1/support-tickets/${ticketId}`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(staffViewRes.status).toBe(200);
      const staffMessages = staffViewRes.body.data.ticket.messages;
      const foundInternalInStaff = staffMessages.find((m) => m.isInternal === true);
      expect(foundInternalInStaff).toBeDefined();
      expect(foundInternalInStaff.message).toBe(
        'Internal Staff Note: Suspected fraudulent refund history.'
      );
    });
  });

  // 17. Customer and Provider can close their own ticket
  describe('17. Customer and Provider Ticket Closure', () => {
    it('should allow customer to close their own open ticket', async () => {
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'Issue solved by self',
          description: 'Problem resolved; closing ticket directly.',
        });

      const ticketId = createRes.body.data.ticket._id;

      const closeRes = await request(app)
        .patch(`/api/v1/support-tickets/${ticketId}/close`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ resolutionNotes: 'Solved on my own' });

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.ticket.status).toBe(SUPPORT_TICKET_STATUS.CLOSED);
    });

    it('should allow provider to close their own open ticket', async () => {
      const createRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({
          subject: 'Provider issue solved',
          description: 'Bank details verified; closing ticket.',
        });

      const ticketId = createRes.body.data.ticket._id;

      const closeRes = await request(app)
        .patch(`/api/v1/support-tickets/${ticketId}/close`)
        .set('Authorization', `Bearer ${provider1Token}`);

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.ticket.status).toBe(SUPPORT_TICKET_STATUS.CLOSED);
    });
  });
});
