# Multi-tenant Cattle Health App - Deployment Guide

This guide provides step-by-step instructions for deploying the multi-tenant Cattle Health App in a production environment.

## Prerequisites

- Node.js 16.x or later
- MongoDB 5.0 or later (MongoDB Atlas recommended for production)
- Redis (for session storage and caching)
- Nginx (recommended as reverse proxy)
- PM2 (recommended for process management)
- SSL Certificate (Let's Encrypt recommended)

## Environment Setup

### 1. Server Requirements

- **CPU**: Minimum 2 cores (4+ recommended for production)
- **RAM**: Minimum 4GB (8GB+ recommended for production)
- **Storage**: Minimum 20GB (SSD recommended)
- **OS**: Ubuntu 20.04 LTS or later (recommended)

### 2. Required Ports

- `3000`: Main application (or configured port)
- `5000`: Flask ML API (if running separately)
- `27017`: MongoDB (default, should not be exposed publicly)
- `6379`: Redis (default, should not be exposed publicly)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/cattle-health-app.git
cd cattle-health-app/backend
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Environment Configuration

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/cattle_health_prod

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Session Configuration
SESSION_SECRET=your_session_secret
SESSION_EXPIRE=30 # days

# Email Configuration (for password resets, etc.)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM='Cattle Health <noreply@example.com>'

# Frontend URL (for CORS and email links)
FRONTEND_URL=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15 * 60 * 1000 # 15 minutes
RATE_LIMIT_MAX=100 # requests per window

# API Configuration
API_VERSION=1
API_PREFIX=/api/v1

# ML API Configuration (if running separately)
ML_API_URL=http://localhost:5000

# Redis Configuration (for sessions and caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### 4. Database Setup

1. **MongoDB**:
   - Create a new database for production
   - Set up authentication
   - Create indexes for better performance:
     ```bash
     npm run create-indexes
     ```

2. **Redis**:
   - Install and configure Redis
   - Set up authentication
   - Configure persistence (RDB or AOF)

## Deployment

### 1. Using PM2 (Recommended)

Install PM2 globally:
```bash
npm install -g pm2
```

Start the application:
```bash
NODE_ENV=production pm2 start server.js --name "cattle-health-api"
```

Save PM2 process list:
```bash
pm2 save
```

Set up PM2 to start on boot:
```bash
pm2 startup
# Follow the instructions to enable startup script
```

### 2. Using Docker (Alternative)

1. Build the Docker image:
   ```bash
   docker build -t cattle-health-api .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name cattle-health-api \
     -p 3000:3000 \
     --env-file .env \
     cattle-health-api
   ```

## Nginx Configuration

Create a new Nginx configuration file at `/etc/nginx/sites-available/cattle-health-app`:

```nginx
upstream cattle_health_app {
    server 127.0.0.1:3000;
    # Add more servers for load balancing if needed
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline'" always;

    # Logging
    access_log /var/log/nginx/cattle_health_access.log;
    error_log /var/log/nginx/cattle_health_error.log;

    # Proxy configuration
    location / {
        proxy_pass http://cattle_health_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /public/ {
        alias /path/to/your/backend/public/;
        expires 30d;
        access_log off;
        add_header Cache-Control "public, no-transform";
    }
}
```

Enable the site and test the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/cattle-health-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Certificate (Let's Encrypt)

Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
```

Obtain and install SSL certificate:
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Set up automatic renewal:
```bash
sudo certbot renew --dry-run
```

## Monitoring and Maintenance

### 1. Log Management

- **PM2 Logs**: `pm2 logs cattle-health-api`
- **Nginx Logs**: `/var/log/nginx/`
- **Application Logs**: Configured in your logging setup

### 2. Backup Strategy

1. **MongoDB Backup**:
   ```bash
   mongodump --uri="mongodb://username:password@localhost:27017/cattle_health_prod" --out=/backup/mongodb/$(date +%Y%m%d)
   ```

2. **Redis Backup**:
   - RDB snapshots are automatically created based on your Redis configuration
   - Manual backup: `redis-cli SAVE` (creates a dump.rdb file)

3. **File Uploads**:
   - Back up the `uploads` directory if you have file uploads

### 3. Monitoring

- **PM2 Monitoring**: `pm2 monit`
- **MongoDB Monitoring**: `mongostat`
- **System Monitoring**: Install and configure `htop`, `iotop`, etc.

## Scaling

### 1. Horizontal Scaling

1. **Load Balancing**:
   - Use Nginx as a load balancer
   - Add more application instances
   - Configure session storage in Redis

2. **Database Scaling**:
   - Set up MongoDB replica set
   - Consider sharding for very large deployments

### 2. Caching

- Enable Redis caching for frequently accessed data
- Implement API response caching where appropriate

## Security Hardening

1. **Server Hardening**:
   - Configure firewall (UFW)
   - Disable root SSH login
   - Use SSH keys for authentication
   - Keep system packages updated

2. **Application Security**:
   - Regular security audits
   - Dependency updates (`npm audit`)
   - Rate limiting
   - Input validation
   - CORS configuration

## Updating the Application

1. Pull the latest changes:
   ```bash
   git pull origin main
   npm install --production
   ```

2. Restart the application:
   ```bash
   pm2 restart cattle-health-api
   ```

3. Run database migrations if needed:
   ```bash
   npm run migrate
   ```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   sudo lsof -i :3000
   kill -9 <PID>
   ```

2. **MongoDB connection issues**:
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Check authentication credentials

3. **High CPU/Memory Usage**:
   - Check logs for memory leaks
   - Consider increasing server resources
   - Optimize database queries

## Support

For additional support, please contact:
- Email: support@example.com
- Documentation: https://docs.cattlehealthapp.com
- GitHub Issues: https://github.com/your-username/cattle-health-app/issues
