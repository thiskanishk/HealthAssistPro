
#!/bin/bash

echo "🔧 Starting HealthAssist Pro deployment..."

# Step 1: Load environment variables
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env file created from example"
fi

# Step 2: Build and run containers
docker-compose down
docker-compose build
docker-compose up -d

# Step 3: Print container status
docker ps

echo "🚀 HealthAssist Pro is now running at http://localhost:8080"
echo "📊 Swagger Docs: http://localhost:8080/api-docs"
echo "💡 Status Check: curl http://localhost:8080/api/v1/status"
