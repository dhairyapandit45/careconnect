/**
 * MongoDB / Mongoose Connection Management
 */

const mongoose = require('mongoose');
const { env } = require('./env');
const { logger } = require('../utils/logger');

let isConnected = false;

const connectDB = async (customUri = null) => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = customUri || env.MONGODB_URI;

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info(`MongoDB connected successfully to host: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`, { error: err });
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB connection lost. Disconnected.');
  });

  try {
    await mongoose.connect(uri);
    isConnected = true;
    return mongoose.connection;
  } catch (error) {
    logger.error(`Failed to establish MongoDB connection: ${error.message}`);
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected cleanly');
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
