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
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere',
      },
    },
    preferredDate: {
      type: Date,
    },
    preferredTimeSlot: {
      type: String, // e.g. "MORNING", "AFTERNOON", "EVENING"
    },
    requiredSkills: [
      {
        type: String,
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
  }
);

// Performance compound indices
serviceRequestSchema.index({ customer: 1, status: 1 });
serviceRequestSchema.index({ category: 1, status: 1 });

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);

module.exports = ServiceRequest;
