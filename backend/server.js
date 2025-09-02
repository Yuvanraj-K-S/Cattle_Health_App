const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const AppError = require('./utils/appError');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/authRoutes');
const cattleRoutes = require('./routes/cattleRoutes');

// Import controllers
const authController = require('./controllers/authController');

// Import config
const { JWT_SECRET } = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));


// Connect to MongoDB with better error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cattleMonitor', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// Routes
app.use('/api/v1/auth', authRoutes);

// Protect all routes after this middleware
app.use(authController.protect);

// API routes
app.use('/api/v1/cattle', cattleRoutes);

// Serve static files from the React frontend app
const frontendBuildPath = path.join(__dirname, '../frontend/build');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    
    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
} else {
    // Fallback for development when frontend is running on a different port
    app.all('*', (req, res, next) => {
        next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
    });
}

// Global error handling middleware
app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    console.error('ERROR 💥', err);

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', err => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});