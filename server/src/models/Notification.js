/**
 * Notification Model
 * In-app user notifications for critical system, booking, job, invoice, review, dispute, and support events.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    relatedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },
    relatedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      index: true,
    },
    relatedInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    relatedReview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      index: true,
    },
    relatedDispute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispute',
      index: true,
    },
    relatedSupportTicket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportTicket',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Keep read and isRead in sync before saving
notificationSchema.pre('save', function (next) {
  if (this.isModified('read')) {
    this.isRead = this.read;
  } else if (this.isModified('isRead')) {
    this.read = this.isRead;
  }
  next();
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
