require('dotenv').config({ path: './.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const compression = require('compression');
const morgan = require('morgan');
const passport = require('passport');
const { StatusCodes } = require('http-status-codes');

// Configuration and utilities
const securityConfig = require('./config/security');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const validateRequest = require('./middleware/validateRequest');

// Initialize Express app
const app = express();

// Trust first proxy (if behind a proxy like Nginx)
app.set('trust proxy', 1);

// Log requests
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev', { stream: logger.stream }));
} else if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: logger.stream,
    skip: (req) => req.originalUrl.includes('health')
  }));
}

// Body parser middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp(securityConfig.hppWhitelist));

// Compression middleware (gzip)
app.use(compression());

// Enable CORS
app.use(cors(securityConfig.corsOptions));
app.options('*', cors(securityConfig.corsOptions));

// Session middleware
app.use(session(securityConfig.sessionConfig));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
app.use('/api', rateLimit(securityConfig.rateLimitConfig));

// Security headers
app.use(helmet(securityConfig.securityHeaders));

// Set security headers for all responses
app.use((req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.status(StatusCodes.OK).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const farmRoutes = require('./routes/farms');
const cattleRoutes = require('./routes/cattle');
const farmCattleRoutes = require('./routes/farmCattle');

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/farms', farmRoutes);
app.use('/api/v1/cattle', cattleRoutes);
app.use('/api/v1/farms', farmCattleRoutes);

// 404 handler
app.all('*', (req, res, next) => {
  res.status(StatusCodes.NOT_FOUND).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Error handling middleware (must be after all other middleware and routes)
app.use(errorHandler);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'status',
      'group',
      'location',
      'search',
      'sort',
      'fields',
      'page',
      'limit'
    ]
  })
);

// Rate limiting
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Enable CORS
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/farms', farmRoutes);
app.use('/api/v1/cattle', cattleRoutes);

// Handle 404 - Route not found
app.all('*', (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB
const DB = process.env.MONGODB_URI || 'mongodb://localhost:27017/cattleMonitor';

// Set mongoose options
mongoose.set('strictPopulate', false);

mongoose
  .connect(DB, {
    serverSelectionTimeoutMS: 5000,
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('✅ Connected to MongoDB');
    
    // Function to get next available port
    const getNextAvailablePort = (port = 3002, maxAttempts = 10) => {
      return new Promise((resolve, reject) => {
        const server = require('http').createServer();
        
        const tryPort = (currentPort, attemptsLeft) => {
          if (attemptsLeft <= 0) {
            server.close();
            return reject(new Error(`Could not find an available port after ${maxAttempts} attempts`));
          }
          
          server.listen(currentPort, '0.0.0.0')
            .on('error', (err) => {
              if (err.code === 'EADDRINUSE') {
                console.log(`Port ${currentPort} is in use, trying port ${currentPort + 1}...`);
                tryPort(currentPort + 1, attemptsLeft - 1);
              } else {
                server.close();
                reject(err);
              }
            })
            .on('listening', () => {
              server.close();
              resolve(currentPort);
            });
        };
        
        tryPort(port, maxAttempts);
      });
    };

    // Start server with port handling
    const startServer = async () => {
      try {
        const PORT = await getNextAvailablePort(process.env.PORT || 3002);
        const server = app.listen(PORT, () => {
          console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
          console.error('UNHANDLED REJECTION! 💥 Shutting down...');
          console.error(err.name, err);
          server.close(() => {
            process.exit(1);
          });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
          console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
          console.error(err.name, err);
          server.close(() => {
            process.exit(1);
          });
        });

        // Handle SIGTERM (for Heroku)
        process.on('SIGTERM', () => {
          console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
          server.close(() => {
            console.log('💥 Process terminated!');
          });
        });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    };

    // Start the server
    startServer();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

module.exports = app;