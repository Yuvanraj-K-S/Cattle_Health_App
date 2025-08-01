# Cattle Health Monitoring System - Backend

This is the backend service for the Cattle Health Monitoring System, built with Node.js, Express, and MongoDB. It provides RESTful APIs for managing cattle health data, user authentication, and farm management.

## Features

- **RESTful API** with proper HTTP methods and status codes
- **Authentication & Authorization** using JWT and Passport.js
- **Security** with rate limiting, CORS, and various security headers
- **Data Validation** using express-validator
- **Logging** with Winston (file and console)
- **Error Handling** with custom error classes and middleware
- **API Documentation** (coming soon)

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5.0 or higher)
- npm (v8 or higher)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cattle-health-app.git
   cd cattle-health-app/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration.

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## Environment Variables

See [.env.example](.env.example) for all available environment variables and their descriptions.

## Project Structure

```
backend/
├── config/               # Configuration files
├── controllers/          # Route controllers
├── middlewares/         # Custom middleware
├── models/              # Database models
├── routes/              # Route definitions
├── services/            # Business logic
├── utils/               # Utility functions
├── validators/          # Request validation schemas
├── .env.example         # Example environment variables
├── .eslintrc.json       # ESLint configuration
├── .prettierrc          # Prettier configuration
├── package.json         # Project dependencies
└── server.js            # Application entry point
```

## API Documentation

API documentation is available at `/api-docs` when running in development mode.

## Development

- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Testing**: `npm test`
- **Debugging**: Use `DEBUG=app:*` for detailed logs

## Production

For production deployment, make sure to:

1. Set `NODE_ENV=production`
2. Configure proper logging
3. Set up process management (PM2, systemd, etc.)
4. Enable HTTPS
5. Configure proper CORS settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
