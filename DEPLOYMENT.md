# Cattle Health App - Deployment Guide

This guide explains how to deploy the Cattle Health Application using Docker and Docker Compose.

## Prerequisites

- Docker (v20.10.0 or higher)
- Docker Compose (v2.0.0 or higher)
- Git (for cloning the repository)

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd Cattle_Health_App
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env` in the backend directory:
     ```bash
     cp backend/.env.example backend/.env
     ```
   - Update the values in `backend/.env` as needed

3. **Make the deployment script executable** (Linux/Mac):
   ```bash
   chmod +x deploy.sh
   ```

4. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```

   On Windows, you can use Git Bash or run:
   ```bash
   bash deploy.sh
   ```

## Manual Deployment

If you prefer to run the services manually:

1. **Start MongoDB**:
   ```bash
   docker-compose up -d mongo
   ```

2. **Build and start the backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```

3. **Build and start the frontend** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run build
   ```

## Accessing the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3001/api/v1
- **MongoDB Express**: http://localhost:8081 (if enabled in docker-compose.yml)

## Environment Variables

Update these in `backend/.env` before deployment:

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `PORT`: Port for the backend server (default: 3001)
- `NODE_ENV`: Environment (development/production)

## Stopping the Application

To stop all services:

```bash
docker-compose down
```

## Troubleshooting

- **Check logs**: `docker-compose logs -f`
- **Rebuild containers**: `docker-compose up -d --build`
- **Reset database** (WARNING: deletes all data):
  ```bash
  docker-compose down -v
  docker-compose up -d
  ```

## Production Considerations

1. **Security**:
   - Change all default passwords
   - Use HTTPS with a valid SSL certificate
   - Set strong JWT secrets
   - Enable authentication for MongoDB

2. **Scaling**:
   - Consider using a process manager like PM2 for Node.js
   - Set up MongoDB replication for production
   - Use a reverse proxy (Nginx) for load balancing

3. **Monitoring**:
   - Set up logging and monitoring
   - Configure alerts for critical services
   - Regular database backups
