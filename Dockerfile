
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/api/v1/status || exit 1

CMD ["node", "src/server.js"]
