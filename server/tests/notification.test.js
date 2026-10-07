/**
 * Integration Test: Milestone 8C - Notifications Layer
 * Tests in-app notification listing, multi-tenant isolation, read transitions (single & batch),
 * idempotent reads, unread counts, server-side only generation (no public creation endpoint),
 * and automatic notification triggers across Booking, Job, Invoice, Review, Dispute, and Support Ticket lifecycles.
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
const Review = require('../src/models/Review');
const Dispute = require('../src/models/Dispute');
const SupportTicket = require('../src/models/SupportTicket');
const Notification = require('../src/models/Notification');
const Availability = require('../src/models/Availability');

const notificationService = require('../src/services/notification.service');
const { ROLES } = require('../src/constants/roles');
const {
  PROVIDER_VERIFICATION_STATUS,
  SERVICE_REQUEST_STATUS,
  QUOTE_STATUS,
  BOOKING_STATUS,
  JOB_STATUS,
  INVOICE_STATUS,
  DISPUTE_STATUS,
  SUPPORT_TICKET_STATUS,
  NOTIFICATION_TYPE,
  DAYS_OF_WEEK,
} = require('../src/constants/status');

let mongoServer;

let adminToken;
let adminUser;

let supportToken;
let supportUser;

let customer1Token;
let customer1User;

let customer2Token;
let customer2User;

let provider1Token;
let provider1User;
let provider1Profile;

let testCategory;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup Platform Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Admin User',
    email: 'admin.notif@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = adminRes.body.data.token;
  adminUser = adminRes.body.data.user;

  // Setup Support Agent
  const supRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Support Agent',
    email: 'support.notif@careconnect.local',
    password: 'Password123!',
    role: ROLES.SUPPORT_AGENT,
  });
  supportToken = supRes.body.data.token;
  supportUser = supRes.body.data.user;

  // Setup Customer 1
  const c1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Alice Customer',
    email: 'alice.notif@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer1Token = c1Res.body.data.token;
  customer1User = c1Res.body.data.user;

  // Setup Customer 2
  const c2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Bob Customer',
    email: 'bob.notif@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer2Token = c2Res.body.data.token;
  customer2User = c2Res.body.data.user;

  // Setup Provider 1
  const p1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Pro Electrician',
    email: 'pro1.notif@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider1Token = p1Res.body.data.token;
  provider1User = p1Res.body.data.user;

  // Setup Category
  testCategory = await ServiceCategory.create({
    name: 'Home Electrical',
    slug: 'home-electrical-notif',
    description: 'Electrical wiring and repair',
  });

  // Setup Provider 1 Profile
  provider1Profile = await ProviderProfile.findOneAndUpdate(
    { user: provider1User._id },
    {
      businessName: 'Pro Electric Co',
      categories: [testCategory._id],
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      skills: ['Wiring', 'Lighting'],
      hourlyRate: 50,
      isActive: true,
    },
    { new: true, upsert: true }
  );

  // Seed weekly availability
  for (const day of Object.values(DAYS_OF_WEEK)) {
    await Availability.create({
      provider: provider1User._id,
      providerProfile: provider1Profile._id,
      dayOfWeek: day,
      startTime: '00:00',
      endTime: '23:59',
      isAvailable: true,
    });
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('CareConnect Milestone 8C — Notifications Layer', () => {

  describe('1. Access Control & Server-side Creation Integrity', () => {
    it('Scenario 2: Unauthenticated user cannot access notifications (401)', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('Scenario 9: Notification creation is server-side only (no public POST endpoint)', async () => {
      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          title: 'Fake Notification',
          message: 'Hacked',
        });
      // Should return 404 Route not found (or 405 Method Not Allowed)
      expect([404, 405]).toContain(res.status);
    });

    it('Scenario 10: Client cannot create arbitrary notification for another user', async () => {
      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          recipient: customer2User._id,
          title: 'Spam',
          message: 'Spam message',
        });
      expect([404, 405]).toContain(res.status);
    });
  });

  describe('2. Direct Notification Retrieval & State Transitions', () => {
    let aliceNotif1;
    let aliceNotif2;
    let bobNotif1;

    beforeEach(async () => {
      await Notification.deleteMany({});

      aliceNotif1 = await notificationService.createNotification({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.SYSTEM,
        title: 'Welcome Alice',
        message: 'Welcome to CareConnect!',
      });

      aliceNotif2 = await notificationService.createNotification({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.ACCOUNT_STATUS_CHANGED,
        title: 'Account Active',
        message: 'Your account is in good standing.',
      });

      bobNotif1 = await notificationService.createNotification({
        recipient: customer2User._id,
        type: NOTIFICATION_TYPE.SYSTEM,
        title: 'Welcome Bob',
        message: 'Welcome to CareConnect!',
      });
    });

    it('Scenario 1: Authenticated user can list own notifications', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items.every(n => n.recipient === customer1User._id || n.recipient._id === customer1User._id)).toBe(true);
      expect(res.body.data.unreadCount).toBe(2);
    });

    it('Scenario 3: User cannot see another user\'s notification in their list', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0]._id).toBe(String(bobNotif1._id));
      expect(res.body.data.items.some(n => n._id === String(aliceNotif1._id))).toBe(false);
    });

    it('Scenario 4: User cannot mark another user\'s notification as read (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${bobNotif1._id}/read`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      // Verify Bob's notification is still unread
      const bobCheck = await Notification.findById(bobNotif1._id);
      expect(bobCheck.read).toBe(false);
    });

    it('Scenario 5: User can mark own notification as read (200, read: true, readAt set)', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${aliceNotif1._id}/read`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.read).toBe(true);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).toBeDefined();

      // Check database state
      const dbNotif = await Notification.findById(aliceNotif1._id);
      expect(dbNotif.read).toBe(true);
      expect(dbNotif.isRead).toBe(true);
      expect(dbNotif.readAt).not.toBeNull();
    });

    it('Scenario 6: Marking already-read notification is safe and idempotent', async () => {
      // First read
      const res1 = await request(app)
        .patch(`/api/v1/notifications/${aliceNotif1._id}/read`)
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(res1.status).toBe(200);
      const originalReadAt = res1.body.data.readAt;

      // Second read
      const res2 = await request(app)
        .patch(`/api/v1/notifications/${aliceNotif1._id}/read`)
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.read).toBe(true);
      expect(new Date(res2.body.data.readAt).getTime()).toBe(new Date(originalReadAt).getTime());
    });

    it('Scenario 7: Mark-all-read only affects authenticated user\'s notifications', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.modifiedCount).toBe(2);

      // Verify Alice's notifications are all read
      const aliceUnread = await Notification.countDocuments({
        recipient: customer1User._id,
        read: false,
      });
      expect(aliceUnread).toBe(0);

      // Verify Bob's notification is still unread!
      const bobCheck = await Notification.findById(bobNotif1._id);
      expect(bobCheck.read).toBe(false);
      expect(bobCheck.isRead).toBe(false);
    });

    it('Scenario 8: Unread count endpoint is correct', async () => {
      const res1 = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data.unreadCount).toBe(2);

      // Mark one as read
      await request(app)
        .patch(`/api/v1/notifications/${aliceNotif1._id}/read`)
        .set('Authorization', `Bearer ${customer1Token}`);

      const res2 = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.unreadCount).toBe(1);
    });

    it('Scenario 18: Pagination and order works correctly (newest first)', async () => {
      // Create 5 additional notifications with slight delays
      for (let i = 1; i <= 5; i++) {
        await notificationService.createNotification({
          recipient: customer1User._id,
          type: NOTIFICATION_TYPE.SYSTEM,
          title: `Paged Item ${i}`,
          message: `Body ${i}`,
        });
      }

      // Total for Alice is now 2 + 5 = 7 items
      const page1 = await request(app)
        .get('/api/v1/notifications?page=1&limit=3')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(page1.status).toBe(200);
      expect(page1.body.data.items).toHaveLength(3);
      expect(page1.body.data.pagination.total).toBe(7);
      expect(page1.body.data.pagination.totalPages).toBe(3);
      expect(page1.body.data.pagination.page).toBe(1);

      // Validate descending order (newest first)
      const date1 = new Date(page1.body.data.items[0].createdAt);
      const date2 = new Date(page1.body.data.items[1].createdAt);
      expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());

      const page2 = await request(app)
        .get('/api/v1/notifications?page=2&limit=3')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(page2.status).toBe(200);
      expect(page2.body.data.items).toHaveLength(3);
      expect(page2.body.data.items[0]._id).not.toBe(page1.body.data.items[0]._id);
    });

    it('Scenario 11: Notification references populated properly', async () => {
      const dummyBooking = new mongoose.Types.ObjectId();
      const notifWithRef = await notificationService.createNotification({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.BOOKING_CONFIRMED,
        title: 'Booking Confirmed',
        message: 'Reference test',
        relatedBooking: dummyBooking,
      });

      const retrieved = await Notification.findById(notifWithRef._id);
      expect(String(retrieved.relatedBooking)).toBe(String(dummyBooking));
    });
  });

  describe('3. Automated Domain Event Trigger Verifications', () => {
    let activeServiceRequest;
    let activeQuote;
    let confirmedBooking;
    let assignedJob;

    beforeEach(async () => {
      await Notification.deleteMany({});
      await Booking.deleteMany({});
      await Job.deleteMany({});
      await Quote.deleteMany({});
      await ServiceRequest.deleteMany({});

      // 1. Create Service Request
      activeServiceRequest = await ServiceRequest.create({
        customer: customer1User._id,
        category: testCategory._id,
        title: 'Fix Ceiling Fan Wiring',
        description: 'Wiring in bedroom fan is sparking and needs repair',
        location: {
          address: '100 Test St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
        },
        preferredDate: new Date(Date.now() + 86400000),
        status: SERVICE_REQUEST_STATUS.SUBMITTED,
      });

      // 2. Provider submits quote
      activeQuote = await Quote.create({
        serviceRequest: activeServiceRequest._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        amount: 80,
        estimatedDuration: 2,
        description: 'I will repair the wiring safely',
        validUntil: new Date(Date.now() + 7 * 86400000),
        status: QUOTE_STATUS.SUBMITTED,
      });
    });

    it('Scenario 12: Booking creation triggers expected notifications for both Customer and Provider', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setUTCHours(10, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setUTCHours(12, 0, 0, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${activeServiceRequest._id}/quotes/${activeQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: tomorrow.toISOString(),
          scheduledEnd: endTime.toISOString(),
        });

      expect([200, 201]).toContain(res.status);
      confirmedBooking = res.body.data.booking;

      // Check Customer received BOOKING_CONFIRMED
      const customerNotifs = await Notification.find({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.BOOKING_CONFIRMED,
      });
      expect(customerNotifs.length).toBeGreaterThanOrEqual(1);
      expect(customerNotifs[0].title).toBe('Booking Confirmed');
      expect(String(customerNotifs[0].relatedBooking)).toBe(String(confirmedBooking._id));

      // Check Provider received BOOKING_CREATED
      const providerNotifs = await Notification.find({
        recipient: provider1User._id,
        type: NOTIFICATION_TYPE.BOOKING_CREATED,
      });
      expect(providerNotifs.length).toBeGreaterThanOrEqual(1);
      expect(providerNotifs[0].title).toBe('New Booking Assigned');
      expect(String(providerNotifs[0].relatedBooking)).toBe(String(confirmedBooking._id));
    });

    it('Scenario 13: Job lifecycle events create expected notifications for Customer and Provider', async () => {
      // Pre-create confirmed booking & job
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      tomorrow.setUTCHours(10, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setUTCHours(12, 0, 0, 0);

      const acceptRes = await request(app)
        .post(`/api/v1/service-requests/${activeServiceRequest._id}/quotes/${activeQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: tomorrow.toISOString(),
          scheduledEnd: endTime.toISOString(),
        });

      confirmedBooking = acceptRes.body.data.booking;
      assignedJob = await Job.findOne({ booking: confirmedBooking._id });
      expect(assignedJob).toBeDefined();

      // Clear notifications so far to test job transitions cleanly
      await Notification.deleteMany({});

      // 1. Transition to ON_THE_WAY via service
      const jobService = require('../src/services/job.service');
      await jobService.transitionStatus(assignedJob._id, JOB_STATUS.ON_THE_WAY, provider1User._id);

      const wayNotifs = await Notification.find({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.JOB_ON_THE_WAY,
      });
      expect(wayNotifs).toHaveLength(1);
      expect(wayNotifs[0].title).toBe('Provider On The Way');

      // 2. Provider transitions to CHECKED_IN
      const checkRes = await request(app)
        .post(`/api/v1/jobs/${assignedJob._id}/checkin`)
        .set('Authorization', `Bearer ${provider1Token}`);
      expect(checkRes.status).toBe(200);

      const checkNotifs = await Notification.find({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.JOB_CHECKED_IN,
      });
      expect(checkNotifs).toHaveLength(1);

      // 3. Provider transitions to IN_PROGRESS
      const startRes = await request(app)
        .post(`/api/v1/jobs/${assignedJob._id}/start`)
        .set('Authorization', `Bearer ${provider1Token}`);
      expect(startRes.status).toBe(200);

      const progNotifs = await Notification.find({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.JOB_IN_PROGRESS,
      });
      expect(progNotifs).toHaveLength(1);

      // 4. Provider transitions to COMPLETED
      const compRes = await request(app)
        .post(`/api/v1/jobs/${assignedJob._id}/complete`)
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({ notes: 'Fan repaired safely' });
      expect(compRes.status).toBe(200);

      const compNotifs = await Notification.find({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.JOB_COMPLETED,
      });
      expect(compNotifs).toHaveLength(1);

      // 5. Customer confirms completion
      const confirmRes = await request(app)
        .post(`/api/v1/jobs/${assignedJob._id}/confirm`)
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(confirmRes.status).toBe(200);

      const providerConfNotifs = await Notification.find({
        recipient: provider1User._id,
        type: NOTIFICATION_TYPE.JOB_CONFIRMED,
      });
      expect(providerConfNotifs).toHaveLength(1);
      expect(providerConfNotifs[0].title).toBe('Job Confirmed by Customer');
    });

    it('Scenario 14: Invoice generation and payment create expected notifications', async () => {
      // Directly create completed Job and Booking
      const booking = await Booking.create({
        serviceRequest: activeServiceRequest._id,
        customer: customer1User._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        quote: activeQuote._id,
        scheduledStart: new Date(),
        scheduledEnd: new Date(),
        price: 90,
        currency: 'INR',
        status: BOOKING_STATUS.COMPLETED,
      });

      const job = await Job.create({
        booking: booking._id,
        customer: customer1User._id,
        provider: provider1User._id,
        status: JOB_STATUS.COMPLETED,
      });

      await Notification.deleteMany({});

      const invoiceService = require('../src/services/invoice.service');
      const invoice = await invoiceService.generateInvoiceFromJob(job);
      expect(invoice).toBeDefined();

      // Check INVOICE_GENERATED notification
      const invNotifs = await Notification.find({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.INVOICE_GENERATED,
      });
      expect(invNotifs).toHaveLength(1);
      expect(invNotifs[0].title).toBe('Invoice Issued');
      expect(String(invNotifs[0].relatedInvoice)).toBe(String(invoice._id));

      // Transition to PAID
      await invoiceService.transitionInvoiceStatus(invoice._id, INVOICE_STATUS.PAID);

      const paidNotifs = await Notification.find({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.INVOICE_PAID,
      });
      expect(paidNotifs).toHaveLength(1);
      expect(paidNotifs[0].title).toBe('Invoice Paid');
    });

    it('Scenario 15: Review submission creates REVIEW_RECEIVED notification for Provider', async () => {
      const booking = await Booking.create({
        serviceRequest: activeServiceRequest._id,
        customer: customer1User._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        quote: activeQuote._id,
        scheduledStart: new Date(),
        scheduledEnd: new Date(),
        price: 90,
        currency: 'INR',
        status: BOOKING_STATUS.COMPLETED,
      });

      const job = await Job.create({
        booking: booking._id,
        customer: customer1User._id,
        provider: provider1User._id,
        status: JOB_STATUS.COMPLETED,
      });

      await Notification.deleteMany({});

      const reviewRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: job._id,
          rating: 5,
          comment: 'Fantastic electrical work!',
        });

      expect(reviewRes.status).toBe(201);

      const providerReviewNotifs = await Notification.find({
        recipient: provider1User._id,
        type: NOTIFICATION_TYPE.REVIEW_RECEIVED,
      });
      expect(providerReviewNotifs).toHaveLength(1);
      expect(providerReviewNotifs[0].title).toBe('New Review Received');
      expect(providerReviewNotifs[0].message).toContain('5-star');
    });

    it('Scenario 16: Dispute creation, lifecycle status update, and cancellation create notifications', async () => {
      const booking = await Booking.create({
        serviceRequest: activeServiceRequest._id,
        customer: customer1User._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        quote: activeQuote._id,
        scheduledStart: new Date(),
        scheduledEnd: new Date(),
        price: 100,
        currency: 'INR',
        status: BOOKING_STATUS.COMPLETED,
      });

      const job = await Job.create({
        booking: booking._id,
        customer: customer1User._id,
        provider: provider1User._id,
        status: JOB_STATUS.COMPLETED,
      });

      await Notification.deleteMany({});

      // 1. Customer creates dispute -> Provider notified
      const dispRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: job._id,
          reason: 'Switchboard left loose',
          description: 'Provider did not screw in the switchboard properly',
        });

      expect(dispRes.status).toBe(201);
      const disputeId = dispRes.body.data.dispute?._id || dispRes.body.data._id;

      const dispCreatedNotifs = await Notification.find({
        recipient: provider1User._id,
        type: NOTIFICATION_TYPE.DISPUTE_CREATED,
      });
      expect(dispCreatedNotifs).toHaveLength(1);
      expect(dispCreatedNotifs[0].title).toBe('Dispute Raised');

      // 2. Admin updates dispute to UNDER_REVIEW -> both parties notified
      const reviewRes = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: DISPUTE_STATUS.UNDER_REVIEW });

      expect(reviewRes.status).toBe(200);

      const underReviewCustomer = await Notification.find({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.DISPUTE_UNDER_REVIEW,
      });
      const underReviewProvider = await Notification.find({
        recipient: provider1User._id,
        type: NOTIFICATION_TYPE.DISPUTE_UNDER_REVIEW,
      });
      expect(underReviewCustomer).toHaveLength(1);
      expect(underReviewProvider).toHaveLength(1);

      // 3. Admin resolves dispute -> both parties notified
      const resolveRes = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: DISPUTE_STATUS.RESOLVED,
          resolutionNotes: 'Partial refund approved',
          refundApproved: true,
          refundAmount: 50,
        });

      expect(resolveRes.status).toBe(200);

      const resolvedCustomer = await Notification.find({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.DISPUTE_RESOLVED,
      });
      expect(resolvedCustomer).toHaveLength(1);
    });

    it('Scenario 17: Support Ticket creation and message reply create notifications', async () => {
      await Notification.deleteMany({});

      // 1. Customer creates support ticket
      const ticketRes = await request(app)
        .post('/api/v1/support-tickets')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          subject: 'App Billing Query',
          description: 'Need clarification on platform fees',
          category: 'PAYMENT',
          priority: 'MEDIUM',
        });

      expect(ticketRes.status).toBe(201);
      const ticketId = ticketRes.body.data.ticket?._id || ticketRes.body.data._id;

      // Customer receives confirmation notification
      const createNotifs = await Notification.find({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.SUPPORT_TICKET_CREATED,
      });
      expect(createNotifs).toHaveLength(1);
      expect(createNotifs[0].title).toBe('Support Ticket Created');

      // 2. Support agent assigns ticket to self
      const assignRes = await request(app)
        .patch(`/api/v1/support-tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ assignedTo: supportUser._id });

      expect(assignRes.status).toBe(200);

      const assignNotifs = await Notification.find({
        recipient: supportUser._id,
        type: NOTIFICATION_TYPE.SUPPORT_TICKET_ASSIGNED,
      });
      expect(assignNotifs).toHaveLength(1);
      expect(assignNotifs[0].title).toBe('Support Ticket Assigned');

      // 3. Support agent replies with message -> Customer notified
      const replyRes = await request(app)
        .post(`/api/v1/support-tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ message: 'Hello Alice, we have looked into your query.' });

      expect(replyRes.status).toBe(200);

      const msgNotifs = await Notification.find({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.SUPPORT_TICKET_MESSAGE,
      });
      expect(msgNotifs).toHaveLength(1);
      expect(msgNotifs[0].title).toBe('New Support Ticket Message');
    });

    it('Scenario 19: Duplicate/unnecessary notifications are prevented where appropriate', async () => {
      // Calling createNotification with no recipient returns null
      const nullNotif = await notificationService.createNotification({});
      expect(nullNotif).toBeNull();

      // Safe idempotent markAsRead repeatedly does not duplicate readAt updates
      const notif = await notificationService.createNotification({
        recipient: customer1User._id,
        type: NOTIFICATION_TYPE.SYSTEM,
        title: 'Check',
        message: 'Check body',
      });

      const firstRead = await notificationService.markAsRead(notif._id, customer1User._id);
      const readAt1 = firstRead.readAt;

      const secondRead = await notificationService.markAsRead(notif._id, customer1User._id);
      expect(secondRead.readAt.getTime()).toBe(readAt1.getTime());
    });
  });

});
