/**
 * Analytics Service
 * Production-quality aggregation pipelines for CareConnect platform analytics.
 * Supports date range filtering, division-by-zero protection, integer-cent conversions,
 * provider rankings, category demand, and dispute/support trend analysis.
 */

const Booking = require('../models/Booking');
const Job = require('../models/Job');
const Invoice = require('../models/Invoice');
const ServiceCategory = require('../models/ServiceCategory');
const ServiceRequest = require('../models/ServiceRequest');
const Dispute = require('../models/Dispute');
const SupportTicket = require('../models/SupportTicket');

const {
  BOOKING_STATUS,
  JOB_STATUS,
  INVOICE_STATUS,
  DISPUTE_STATUS,
  SUPPORT_TICKET_STATUS,
  SUPPORT_TICKET_PRIORITY,
} = require('../constants/status');

/**
 * Builds MongoDB date filter query on specified date field.
 * Handles single day bounds (YYYY-MM-DD end of day).
 */
const buildDateFilter = (startDate, endDate, dateField = 'createdAt') => {
  const filter = {};
  if (startDate || endDate) {
    filter[dateField] = {};
    if (startDate) {
      filter[dateField].$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      if (typeof endDate === 'string' && endDate.length === 10) {
        end.setUTCHours(23, 59, 59, 999);
      }
      filter[dateField].$lte = end;
    }
  }
  return filter;
};

/**
 * 1. Booking Trends
 * Aggregates daily booking counts and computes completion & cancellation rates.
 */
const getBookingTrends = async ({ startDate, endDate } = {}) => {
  const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

  const dailyAgg = await Booking.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.CANCELLED] }, 1, 0] },
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.IN_PROGRESS] }, 1, 0] },
        },
        confirmed: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.CONFIRMED] }, 1, 0] },
        },
        disputed: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.DISPUTED] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const timeline = dailyAgg.map((item) => ({
    date: item._id,
    total: item.total,
    completed: item.completed,
    cancelled: item.cancelled,
    inProgress: item.inProgress,
    confirmed: item.confirmed,
    disputed: item.disputed,
  }));

  const summaryAgg = await Booking.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0] },
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.CANCELLED] }, 1, 0] },
        },
        inProgressBookings: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.IN_PROGRESS] }, 1, 0] },
        },
        confirmedBookings: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.CONFIRMED] }, 1, 0] },
        },
        disputedBookings: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.DISPUTED] }, 1, 0] },
        },
      },
    },
  ]);

  const totalBookings = summaryAgg[0]?.totalBookings || 0;
  const completedBookings = summaryAgg[0]?.completedBookings || 0;
  const cancelledBookings = summaryAgg[0]?.cancelledBookings || 0;
  const inProgressBookings = summaryAgg[0]?.inProgressBookings || 0;
  const confirmedBookings = summaryAgg[0]?.confirmedBookings || 0;
  const disputedBookings = summaryAgg[0]?.disputedBookings || 0;

  const completionRate =
    totalBookings > 0
      ? Number(((completedBookings / totalBookings) * 100).toFixed(2))
      : 0;
  const cancellationRate =
    totalBookings > 0
      ? Number(((cancelledBookings / totalBookings) * 100).toFixed(2))
      : 0;

  return {
    summary: {
      totalBookings,
      completedBookings,
      cancelledBookings,
      inProgressBookings,
      confirmedBookings,
      disputedBookings,
      completionRate,
      cancellationRate,
    },
    timeline,
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
};

/**
 * 2. Revenue Trends
 * Grouped revenue metrics distinguishing paid revenue from issued/draft invoices.
 */
const getRevenueTrends = async ({ startDate, endDate } = {}) => {
  const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

  const dailyAgg = await Invoice.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        totalInvoices: { $sum: 1 },
        paidInvoices: {
          $sum: { $cond: [{ $eq: ['$status', INVOICE_STATUS.PAID] }, 1, 0] },
        },
        totalInvoicedCents: { $sum: '$totalAmount' },
        paidRevenueCents: {
          $sum: {
            $cond: [{ $eq: ['$status', INVOICE_STATUS.PAID] }, '$totalAmount', 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const timeline = dailyAgg.map((item) => ({
    date: item._id,
    totalInvoices: item.totalInvoices,
    paidInvoices: item.paidInvoices,
    totalInvoicedCents: item.totalInvoicedCents,
    totalInvoiced: item.totalInvoicedCents / 100,
    paidRevenueCents: item.paidRevenueCents,
    paidRevenue: item.paidRevenueCents / 100,
  }));

  const summaryAgg = await Invoice.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        paidInvoices: {
          $sum: { $cond: [{ $eq: ['$status', INVOICE_STATUS.PAID] }, 1, 0] },
        },
        totalInvoicedCents: { $sum: '$totalAmount' },
        paidRevenueCents: {
          $sum: {
            $cond: [{ $eq: ['$status', INVOICE_STATUS.PAID] }, '$totalAmount', 0],
          },
        },
      },
    },
  ]);

  const totalInvoices = summaryAgg[0]?.totalInvoices || 0;
  const paidInvoices = summaryAgg[0]?.paidInvoices || 0;
  const totalInvoicedCents = summaryAgg[0]?.totalInvoicedCents || 0;
  const totalInvoiced = totalInvoicedCents / 100;
  const paidRevenueCents = summaryAgg[0]?.paidRevenueCents || 0;
  const paidRevenue = paidRevenueCents / 100;
  const paidRate =
    totalInvoices > 0
      ? Number(((paidInvoices / totalInvoices) * 100).toFixed(2))
      : 0;

  return {
    summary: {
      totalInvoices,
      paidInvoices,
      totalInvoicedCents,
      totalInvoiced,
      paidRevenueCents,
      paidRevenue,
      paidRate,
    },
    timeline,
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
};

/**
 * 3. Provider Performance
 * Aggregates provider-level metrics: completed/cancelled jobs, completion rate, paid revenue.
 */
const getProviderPerformance = async ({ startDate, endDate, limit = 20 } = {}) => {
  const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

  const pipeline = [
    { $match: dateFilter },
    {
      $group: {
        _id: '$provider',
        totalJobs: { $sum: 1 },
        completedJobs: {
          $sum: { $cond: [{ $eq: ['$status', JOB_STATUS.COMPLETED] }, 1, 0] },
        },
        cancelledJobs: {
          $sum: { $cond: [{ $eq: ['$status', JOB_STATUS.CANCELLED] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'providerprofiles',
        localField: '_id',
        foreignField: 'user',
        as: 'profile',
      },
    },
    { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'invoices',
        let: { providerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$provider', '$$providerId'] },
                  { $eq: ['$status', INVOICE_STATUS.PAID] },
                ],
              },
              ...dateFilter,
            },
          },
          {
            $group: {
              _id: null,
              totalPaidCents: { $sum: '$totalAmount' },
            },
          },
        ],
        as: 'revenueData',
      },
    },
    {
      $project: {
        _id: 0,
        providerId: '$_id',
        name: { $ifNull: ['$user.name', 'Unknown Provider'] },
        email: { $ifNull: ['$user.email', ''] },
        businessName: { $ifNull: ['$profile.businessName', ''] },
        rating: { $ifNull: ['$profile.rating', 0] },
        reviewCount: { $ifNull: ['$profile.reviewCount', 0] },
        totalJobs: 1,
        completedJobs: 1,
        cancelledJobs: 1,
        completionRate: {
          $cond: [
            { $gt: ['$totalJobs', 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$completedJobs', '$totalJobs'] },
                    100,
                  ],
                },
                2,
              ],
            },
            0,
          ],
        },
        revenueCents: {
          $ifNull: [{ $arrayElemAt: ['$revenueData.totalPaidCents', 0] }, 0],
        },
      },
    },
    {
      $addFields: {
        revenue: { $divide: ['$revenueCents', 100] },
      },
    },
    { $sort: { completedJobs: -1, totalJobs: -1 } },
    { $limit: Number(limit) || 20 },
  ];

  const providers = await Job.aggregate(pipeline);

  return {
    providers,
    totalCount: providers.length,
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
};

/**
 * 4. Category Demand
 * Aggregates service requests and bookings by service category, sorted descending by demand.
 */
const getCategoryDemand = async ({ startDate, endDate } = {}) => {
  const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

  // Bookings grouped by category
  const bookingCatAgg = await Booking.aggregate([
    { $match: dateFilter },
    {
      $lookup: {
        from: 'servicerequests',
        localField: 'serviceRequest',
        foreignField: '_id',
        as: 'req',
      },
    },
    { $unwind: '$req' },
    {
      $group: {
        _id: '$req.category',
        bookingCount: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0] },
        },
        totalRevenueCents: {
          $sum: {
            $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, '$price', 0],
          },
        },
      },
    },
  ]);

  // Service requests grouped by category
  const requestCatAgg = await ServiceRequest.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$category',
        requestCount: { $sum: 1 },
      },
    },
  ]);

  const allCategories = await ServiceCategory.find().lean();
  const categoryMap = new Map();

  allCategories.forEach((cat) => {
    categoryMap.set(String(cat._id), {
      categoryId: cat._id,
      name: cat.name,
      slug: cat.slug,
      requestCount: 0,
      bookingCount: 0,
      completedCount: 0,
      totalRevenueCents: 0,
      totalRevenue: 0,
    });
  });

  requestCatAgg.forEach((item) => {
    const key = String(item._id);
    if (categoryMap.has(key)) {
      categoryMap.get(key).requestCount = item.requestCount;
    } else {
      categoryMap.set(key, {
        categoryId: item._id,
        name: 'Unknown Category',
        slug: 'unknown',
        requestCount: item.requestCount,
        bookingCount: 0,
        completedCount: 0,
        totalRevenueCents: 0,
        totalRevenue: 0,
      });
    }
  });

  bookingCatAgg.forEach((item) => {
    const key = String(item._id);
    if (categoryMap.has(key)) {
      const entry = categoryMap.get(key);
      entry.bookingCount = item.bookingCount;
      entry.completedCount = item.completedCount;
      entry.totalRevenueCents = item.totalRevenueCents;
      entry.totalRevenue = item.totalRevenueCents / 100;
    } else {
      categoryMap.set(key, {
        categoryId: item._id,
        name: 'Unknown Category',
        slug: 'unknown',
        requestCount: 0,
        bookingCount: item.bookingCount,
        completedCount: item.completedCount,
        totalRevenueCents: item.totalRevenueCents,
        totalRevenue: item.totalRevenueCents / 100,
      });
    }
  });

  const categories = Array.from(categoryMap.values())
    .filter((cat) => cat.bookingCount > 0 || cat.requestCount > 0)
    .sort((a, b) => b.bookingCount - a.bookingCount || b.requestCount - a.requestCount);

  return {
    categories,
    totalCategories: categories.length,
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
};

/**
 * 5. Dispute Trends
 * Aggregates dispute counts by status and category with resolution rate.
 */
const getDisputeTrends = async ({ startDate, endDate } = {}) => {
  const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

  const disputeAgg = await Dispute.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        refundApprovedCount: {
          $sum: { $cond: [{ $eq: ['$resolution.refundApproved', true] }, 1, 0] },
        },
        refundAmountTotal: { $sum: { $ifNull: ['$resolution.refundAmount', 0] } },
      },
    },
  ]);

  const byStatus = {
    [DISPUTE_STATUS.OPEN]: 0,
    [DISPUTE_STATUS.UNDER_REVIEW]: 0,
    [DISPUTE_STATUS.RESOLVED]: 0,
    [DISPUTE_STATUS.REJECTED]: 0,
    [DISPUTE_STATUS.CANCELLED]: 0,
  };

  let totalDisputes = 0;
  let refundApprovedCount = 0;
  let refundAmountTotal = 0;

  disputeAgg.forEach((item) => {
    if (item._id && byStatus[item._id] !== undefined) {
      byStatus[item._id] = item.count;
    }
    totalDisputes += item.count;
    refundApprovedCount += item.refundApprovedCount || 0;
    refundAmountTotal += item.refundAmountTotal || 0;
  });

  const resolvedCount =
    (byStatus[DISPUTE_STATUS.RESOLVED] || 0) + (byStatus[DISPUTE_STATUS.REJECTED] || 0);
  const resolutionRate =
    totalDisputes > 0
      ? Number(((resolvedCount / totalDisputes) * 100).toFixed(2))
      : 0;

  const categoryAgg = await Dispute.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const byCategory = categoryAgg.map((c) => ({
    category: c._id || 'GENERAL',
    count: c.count,
  }));

  return {
    totalDisputes,
    resolvedCount,
    resolutionRate,
    refundApprovedCount,
    refundAmountTotal,
    byStatus,
    byCategory,
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
};

/**
 * 6. Support Ticket Trends
 * Aggregates support ticket counts by status, priority, and category with resolution rate.
 */
const getSupportTrends = async ({ startDate, endDate } = {}) => {
  const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

  const [statusAgg, priorityAgg, categoryAgg] = await Promise.all([
    SupportTicket.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    SupportTicket.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]),
    SupportTicket.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),
  ]);

  const byStatus = {
    [SUPPORT_TICKET_STATUS.OPEN]: 0,
    [SUPPORT_TICKET_STATUS.IN_PROGRESS]: 0,
    [SUPPORT_TICKET_STATUS.WAITING_FOR_CUSTOMER]: 0,
    [SUPPORT_TICKET_STATUS.WAITING_FOR_PROVIDER]: 0,
    [SUPPORT_TICKET_STATUS.RESOLVED]: 0,
    [SUPPORT_TICKET_STATUS.CLOSED]: 0,
  };

  let totalTickets = 0;
  statusAgg.forEach((s) => {
    if (s._id && byStatus[s._id] !== undefined) {
      byStatus[s._id] = s.count;
    }
    totalTickets += s.count;
  });

  const byPriority = {
    [SUPPORT_TICKET_PRIORITY.LOW]: 0,
    [SUPPORT_TICKET_PRIORITY.MEDIUM]: 0,
    [SUPPORT_TICKET_PRIORITY.HIGH]: 0,
    [SUPPORT_TICKET_PRIORITY.URGENT]: 0,
  };

  priorityAgg.forEach((p) => {
    if (p._id && byPriority[p._id] !== undefined) {
      byPriority[p._id] = p.count;
    }
  });

  const byCategory = categoryAgg.map((c) => ({
    category: c._id || 'OTHER',
    count: c.count,
  }));

  const resolvedCount =
    (byStatus[SUPPORT_TICKET_STATUS.RESOLVED] || 0) +
    (byStatus[SUPPORT_TICKET_STATUS.CLOSED] || 0);
  const resolutionRate =
    totalTickets > 0
      ? Number(((resolvedCount / totalTickets) * 100).toFixed(2))
      : 0;

  return {
    totalTickets,
    resolvedCount,
    resolutionRate,
    byStatus,
    byPriority,
    byCategory,
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
};

/**
 * 7. Overview Analytics
 * High-level consolidated KPI summary across all dimensions.
 */
const getOverviewAnalytics = async ({ startDate, endDate } = {}) => {
  const [bookingTrends, revenueTrends, disputeTrends, supportTrends, categories, providers] =
    await Promise.all([
      getBookingTrends({ startDate, endDate }),
      getRevenueTrends({ startDate, endDate }),
      getDisputeTrends({ startDate, endDate }),
      getSupportTrends({ startDate, endDate }),
      getCategoryDemand({ startDate, endDate }),
      getProviderPerformance({ startDate, endDate, limit: 5 }),
    ]);

  return {
    bookings: bookingTrends.summary,
    revenue: revenueTrends.summary,
    disputes: {
      totalDisputes: disputeTrends.totalDisputes,
      resolvedCount: disputeTrends.resolvedCount,
      resolutionRate: disputeTrends.resolutionRate,
    },
    support: {
      totalTickets: supportTrends.totalTickets,
      resolvedCount: supportTrends.resolvedCount,
      resolutionRate: supportTrends.resolutionRate,
    },
    topCategories: categories.categories.slice(0, 5),
    topProviders: providers.providers.slice(0, 5),
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
};

module.exports = {
  getBookingTrends,
  getRevenueTrends,
  getProviderPerformance,
  getCategoryDemand,
  getDisputeTrends,
  getSupportTrends,
  getOverviewAnalytics,
};
