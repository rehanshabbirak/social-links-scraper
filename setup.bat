@echo off
REM Email & Social Media Scraper - Setup Script (Windows)
REM This script sets up the development environment

echo 🚀 Email & Social Media Scraper - Setup
echo ======================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:v=%
if %NODE_VERSION% lss 18 (
    echo ⚠️  Node.js version 18 or higher is recommended
    for /f "tokens=*" %%i in ('node -v') do echo Current version: %%i
)

for /f "tokens=*" %%i in ('node -v') do echo ✅ Node.js version: %%i

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

cd ..

REM Create environment file if it doesn't exist
if not exist "backend\.env" (
    echo 📝 Creating environment file...
    copy backend\env.example backend\.env
    echo ✅ Created backend\.env file
    echo ⚠️  Please review and update backend\.env with your configuration
)

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist "backend\logs" mkdir backend\logs
if not exist "backend\output" mkdir backend\output

echo ✅ Setup completed successfully!
echo.
echo 🚀 To start the development servers:
echo    npm run dev:all
echo.
echo 🌐 The application will be available at:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo 📚 For more information, see README.md
pause
