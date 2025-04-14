#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up HealthAssist Pro...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js from https://nodejs.org/${NC}"
    exit 1
else
    echo -e "${GREEN}Node.js version $(node --version) is installed${NC}"
fi

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo -e "${RED}MongoDB is not installed. Please install MongoDB from https://www.mongodb.com/try/download/community${NC}"
    exit 1
else
    echo -e "${GREEN}MongoDB is installed${NC}"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd backend
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}Created .env file. Please update it with your configuration.${NC}"
fi

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd ../frontend
npm install

# Create necessary directories
mkdir -p ./logs
mkdir -p ./data/mongodb
mkdir -p ./data/redis

# Generate random JWT secret if not exists
if [ ! -f .env ]; then
    echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
fi

# Start the development environment
docker-compose up -d

echo "Development environment is ready!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"
echo "API Documentation: http://localhost:5000/api-docs"

# Start development servers
echo -e "${GREEN}Starting development servers...${NC}"
gnome-terminal --tab --title="Backend Server" --command="bash -c 'cd backend && npm run dev; exec bash'" 2>/dev/null || \
xterm -e "cd backend && npm run dev" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd $(pwd)/backend && npm run dev"' 2>/dev/null || \
echo -e "${YELLOW}Please start the backend server manually: cd backend && npm run dev${NC}"

gnome-terminal --tab --title="Frontend Server" --command="bash -c 'cd frontend && npm start; exec bash'" 2>/dev/null || \
xterm -e "cd frontend && npm start" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd $(pwd)/frontend && npm start"' 2>/dev/null || \
echo -e "${YELLOW}Please start the frontend server manually: cd frontend && npm start${NC}"

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${CYAN}Backend server running at: http://localhost:5000${NC}"
echo -e "${CYAN}Frontend server running at: http://localhost:3000${NC}"
echo -e "${YELLOW}Please update the .env file in the backend directory with your configuration.${NC}" 