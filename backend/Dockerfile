# Build stage — build the React frontend
FROM node:18-alpine AS builder

WORKDIR /app

COPY frontend/ ./frontend/
COPY backend/ ./backend/

RUN cd frontend && npm install && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

COPY --from=builder /app/frontend/build ./frontend/build
COPY backend/ ./backend/

EXPOSE 3001

CMD ["node", "backend/server.js"]
