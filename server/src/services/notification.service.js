/**
 * Notification Service
 * Manages in-app notification creation, role-isolated listings, unread counts,
 * and single/batch read state transitions.
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { ApiError } = require('../utils/apiError');

/**
 * Creates an in-app notification for a designated recipient
 * @param {object} payload - Notification data
 */
async function createNotification(payload) {
  if (!payload || !payload.recipient) {
    return null;
  }

  const notification = new Notification({
    recipient: payload.recipient,
    type: payload.type || 'SYSTEM',
    title: payload.title,
    message: payload.message,
    data: payload.data || {},
    relatedBooking: payload.relatedBooking || null,
    relatedJob: payload.relatedJob || null,
    relatedInvoice: payload.relatedInvoice || null,
    relatedReview: payload.relatedReview || null,
    relatedDispute: payload.relatedDispute || null,
    relatedSupportTicket: payload.relatedSupportTicket || null,
    read: false,
    isRead: false,
    readAt: null,
  });

  await notification.save();
  return notification;
}

/**
 * Lists notifications for the authenticated user with unread count and pagination
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {object} queryParams
 */
async function listUserNotifications(userId, queryParams = {}) {
  const filter = { recipient: userId };

  if (queryParams.read !== undefined) {
    filter.read = queryParams.read === 'true' || queryParams.read === true;
  } else if (queryParams.isRead !== undefined) {
    filter.isRead = queryParams.isRead === 'true' || queryParams.isRead === true;
  }

  if (queryParams.type) {
    filter.type = queryParams.type;
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    read: false,
  });

  const items = await Notification.find(filter)
    .populate('relatedBooking')
    .populate('relatedJob')
    .populate('relatedInvoice')
    .populate('relatedReview')
    .populate('relatedDispute')
    .populate('relatedSupportTicket')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return {
    items,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Returns the unread notification count for a user
 * @param {string|mongoose.Types.ObjectId} userId
 */
async function getUnreadCount(userId) {
  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    read: false,
  });
  return { unreadCount };
}

/**
 * Marks a single notification as read (idempotent)
 * @param {string} notificationId
 * @param {string|mongoose.Types.ObjectId} userId
 */
async function markAsRead(notificationId, userId) {
  if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
    throw ApiError.badRequest('Invalid notification ID format');
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  if (String(notification.recipient) !== String(userId)) {
    throw ApiError.forbidden('You do not have permission to modify this notification');
  }

  if (!notification.read) {
    notification.read = true;
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
}

/**
 * Marks all unread notifications for a user as read
 * @param {string|mongoose.Types.ObjectId} userId
 */
async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true, isRead: true, readAt: new Date() } }
  );

  return {
    modifiedCount: result.modifiedCount || 0,
  };
}

module.exports = {
  createNotification,
  listUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
