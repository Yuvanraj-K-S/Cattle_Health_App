const { NODE_ENV } = process.env;
const session = require('express-session');
const MongoStore = require('connect-mongo');

// CORS configuration
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-XSRF-TOKEN',
  ],
  exposedHeaders: ['set-cookie'],
};

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for certain paths
    const skipPaths = ['/health', '/api/v1/auth/login', '/api/v1/auth/refresh-token'];
    return skipPaths.some(path => req.path.startsWith(path));
  },
};

// Session configuration
const sessionConfig = {
  name: 'cattle_health.sid',
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'interval',
    autoRemoveInterval: 10, // In minutes
    touchAfter: 24 * 3600, // 24 hours
  }),
  cookie: {
    secure: NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
    domain: NODE_ENV === 'production' ? '.yourdomain.com' : undefined,
  },
};

// HPP whitelist
const hppWhitelist = [
  'status',
  'group',
  'location',
  'search',
  'sort',
  'fields',
  'page',
  'limit',
  'duration',
  'ratingsQuantity',
  'ratingsAverage',
  'maxGroupSize',
  'difficulty',
  'price',
];

// Security headers configuration
const securityHeaders = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://cdn.jsdelivr.net',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
      ],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'", 'https://api.yourdomain.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: true },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
};

// Export configurations
module.exports = {
  corsOptions,
  rateLimitConfig,
  sessionConfig,
  securityHeaders,
  hppWhitelist,
};
