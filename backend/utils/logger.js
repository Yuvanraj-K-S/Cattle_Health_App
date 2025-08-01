const winston = require('winston');
const path = require('path');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, align, errors, json } = format;
const { NODE_ENV } = process.env;

// Define log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  const logMessage = stack || message;
  return `${timestamp} [${level}]: ${logMessage}`;
});

// Create logs directory path
const logsDir = path.join(__dirname, '../../logs');

// Define different formats for different environments
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  align(),
  logFormat
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// Create logger instance
const logger = createLogger({
  level: NODE_ENV === 'development' ? 'debug' : 'info',
  format: NODE_ENV === 'development' ? devFormat : prodFormat,
  defaultMeta: { service: 'cattle-health-api' },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Write all logs with level `info` and below to `combined.log`
    new transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false, // Don't exit on handled exceptions
});

// If we're not in production, also log to the console
if (NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: devFormat,
    level: 'debug',
  }));
}

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
  write: function(message) {
    // Remove extra newline at the end
    logger.info(message.trim());
  },
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.stack}`);
  // Don't exit immediately, wait for the event loop to be empty
  process.exitCode = 1;
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  // Don't exit immediately, wait for the event loop to be empty
  process.exitCode = 1;
});

module.exports = logger;
