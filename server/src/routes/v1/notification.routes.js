/**
 * Notification Routes
 * Endpoints for retrieving user notifications, unread metrics, and marking notifications as read.
 */

const express = require('express');
const {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require('../../controllers/notification.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

// List authenticated user notifications
router.get('/', authenticate, listNotifications);

// Retrieve unread count (placed before /:id)
router.get('/unread-count', authenticate, getUnreadCount);

// Mark all notifications as read (placed before /:id)
router.patch('/read-all', authenticate, markAllAsRead);

// Mark specific notification as read
router.patch('/:id/read', authenticate, markAsRead);

module.exports = router;
