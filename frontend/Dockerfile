# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3000
ENV REACT_APP_API_URL=http://localhost:5000

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["npm", "start"]

# Production stage
FROM nginx:alpine AS production

COPY --from=builder /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 