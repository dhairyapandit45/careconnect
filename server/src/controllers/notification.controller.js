/**
 * Notification Controller
 * REST HTTP endpoints for user notification listings, unread metrics, and read state transitions.
 */

const notificationService = require('../services/notification.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * List notifications for the authenticated user
 */
const listNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.listUserNotifications(req.user._id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Notifications retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notification count for the authenticated user
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount(req.user._id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Unread notification count retrieved',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    const notifObj = notification.toObject ? notification.toObject() : notification;
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Notification marked as read',
      data: { ...notifObj, notification },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read for the authenticated user
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'All notifications marked as read',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
