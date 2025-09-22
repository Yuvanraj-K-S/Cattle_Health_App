# Build stage
FROM node:18-alpine AS builder

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the frontend
RUN cd ../frontend && \
    npm install && \
    npm run build

# Production stage
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built frontend
COPY --from=builder /usr/src/app/../frontend/build ../frontend/build

# Copy backend source
COPY . .

# Expose the app port
EXPOSE 3001

# Start the application
CMD ["node", "server.js"]
