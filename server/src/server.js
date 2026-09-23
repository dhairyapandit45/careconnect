/**
 * Server Entry Point
 * Initializes Database Connection, Express Listener, and Process Lifecycle Listeners.
 */

const app = require('./app');
const { env } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { logger } = require('./utils/logger');

let server;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express listener
    server = app.listen(env.PORT, () => {
      logger.info(`CareConnect API server started successfully.`);
      logger.info(`Listening on port: ${env.PORT} in [${env.NODE_ENV}] mode`);
      logger.info(`Health check available at: http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await disconnectDB();
        logger.info('Database connections closed cleanly.');
        process.exit(0);
      } catch (err) {
        logger.error(`Error during DB disconnect: ${err.message}`);
        process.exit(1);
      }
    });

    // Force close after 10s if hanging
    setTimeout(() => {
      logger.error('Shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

// Start the server
startServer();

module.exports = server;
