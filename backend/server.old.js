require('dotenv').config({ path: './.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const helmet = require('helmet');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cattle_health';
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`   MongoDB: ${MONGODB_URI.split('@').pop() || MONGODB_URI}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Start the application
startServer();

// Handle SIGTERM (for Docker, Kubernetes, etc.)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
    process.exit(0);
  });
});

// Trust first proxy (if behind a proxy like Nginx)
app.set('trust proxy', 1);

// Basic request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
  res.status(404).json({
    status: 'error',
    message: 'Not Found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Set mongoose options
mongoose.set('strictPopulate', false);

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
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
    const server = startServer();
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      
      // Close server and exit process
      server.close(() => {
        console.log('💥 Process terminated!');
        process.exit(1);
      });
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      
      // Close server and exit process
      server.close(() => {
        console.log('💥 Process terminated!');
        process.exit(1);
      });
    });
    
    // Handle SIGTERM (for Docker, Kubernetes, etc.)
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
      server.close(() => {
        console.log('💥 Process terminated!');
        process.exit(0);
      });
    });
    
    // Export the Express app for testing
    module.exports = app;
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });