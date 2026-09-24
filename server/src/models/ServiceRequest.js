/**
 * ServiceRequest Model
 * Home service requests created by customers.
 */

const mongoose = require('mongoose');
const { SERVICE_REQUEST_STATUS } = require('../constants/status');

const serviceRequestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: [true, 'Service category is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Request title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Problem description is required'],
      trim: true,
      minlength: [15, 'Description must be at least 15 characters long'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    location: {
      address: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      postalCode: {
        type: String,
        required: [true, 'Postal code is required'],
        trim: true,
      },
      state: {
        type: String,
        default: '',
        trim: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere',
      },
    },
    preferredDate: {
      type: Date,
      required: [true, 'Preferred date is required'],
    },
    preferredTime: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '12:00' },
    },
    preferredTimeSlot: {
      type: String, // Backwards compatibility alias
      default: 'MORNING',
    },
    requiredSkills: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: Object.values(SERVICE_REQUEST_STATUS),
      default: SERVICE_REQUEST_STATUS.SUBMITTED,
      index: true,
    },
    aiClassification: {
      predictedCategory: String,
      confidenceScore: Number,
      extractedUrgency: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'],
        default: 'MEDIUM',
      },
      tags: [String],
      processedAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Performance compound indices for high-frequency filters
serviceRequestSchema.index({ customer: 1, status: 1 });
serviceRequestSchema.index({ category: 1, status: 1 });
serviceRequestSchema.index({ preferredDate: 1, status: 1 });
serviceRequestSchema.index({ 'location.city': 1, status: 1 });

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);

module.exports = ServiceRequest;
