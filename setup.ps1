# Setup script for HealthAssist Pro

Write-Host "Setting up HealthAssist Pro..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version $nodeVersion is installed" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if MongoDB is installed
try {
    $mongoVersion = mongod --version
    Write-Host "MongoDB is installed" -ForegroundColor Green
} catch {
    Write-Host "MongoDB is not installed. Please install MongoDB from https://www.mongodb.com/try/download/community" -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location -Path "backend"
npm install

# Create .env file if it doesn't exist
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env file. Please update it with your configuration." -ForegroundColor Yellow
}

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location -Path "../frontend"
npm install

# Start development servers
Write-Host "Starting development servers..." -ForegroundColor Green
Start-Process powershell -ArgumentList "cd backend; npm run dev"
Start-Process powershell -ArgumentList "cd frontend; npm start"

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Backend server running at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend server running at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Please update the .env file in the backend directory with your configuration." -ForegroundColor Yellow 