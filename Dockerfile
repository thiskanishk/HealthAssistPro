FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Backend build
FROM base AS backend-build
WORKDIR /app
RUN npm run build:backend

# Frontend build
FROM base AS frontend-build
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN npm run build

# Production image
FROM node:18-alpine AS production
WORKDIR /app

# Copy backend build
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY package*.json ./
RUN npm install --only=production

# Copy frontend build
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose backend port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
