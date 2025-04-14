# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY ./backend ./backend

# Build TypeScript
RUN npm run build:backend

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY ./backend ./backend

# Set environment variables
ENV NODE_ENV=development
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start the app in development mode
CMD ["npm", "run", "dev:backend"]

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built app from build stage
COPY --from=build /app/backend/dist ./backend/dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start the app in production mode
CMD ["npm", "start"]

# Set working directory
WORKDIR /usr/src/app

# Create volume for logs
VOLUME [ "/usr/src/app/logs" ]

# Set environment variables
ENV NODE_ENV=production \
    PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the application
CMD ["ts-node", "src/server.ts"] 