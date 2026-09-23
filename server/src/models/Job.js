/**
 * Job Model
 * Operational tracking of active service fulfillment, evidence, and milestones.
 */

const mongoose = require('mongoose');
const { JOB_STATUS } = require('../constants/status');

const jobSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.SCHEDULED,
      index: true,
    },
    startedAt: Date,
    completedAt: Date,
    serviceEvidence: [
      {
        url: String,
        description: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: String,
  },
  {
    timestamps: true,
  }
);

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
