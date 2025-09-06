@echo off
REM Email & Social Media Scraper - GitHub Deployment Script (Windows)
REM This script helps you push your code to GitHub

echo 🚀 Email & Social Media Scraper - GitHub Deployment
echo ==================================================

REM Check if git is initialized
if not exist ".git" (
    echo 📁 Initializing Git repository...
    git init
)

REM Add all files
echo 📝 Adding files to Git...
git add .

REM Check if there are changes to commit
git diff --staged --quiet
if %errorlevel% equ 0 (
    echo ✅ No changes to commit
) else (
    REM Commit changes
    echo 💾 Committing changes...
    git commit -m "Add: Email & Social Media Scraper with real-time progress tracking

- Real-time scraping progress with live updates
- CSV upload with automatic website column detection
- Smart crawling optimization (skip deep crawl if emails found on homepage)
- Comprehensive error handling with break conditions
- Cloudflare blocking detection with VPN suggestions
- Email verification system
- Enhanced URL normalization and validation
- Export results in JSON and CSV formats
- Modern UI with Tailwind CSS and React components"

    echo ✅ Changes committed successfully
)

REM Check if remote origin exists
git remote get-url origin >nul 2>&1
if %errorlevel% equ 0 (
    echo 🌐 Remote origin already exists
    for /f "tokens=*" %%i in ('git remote get-url origin') do echo 📍 Current remote URL: %%i
) else (
    echo ⚠️  No remote origin found
    echo Please add your GitHub repository as remote origin:
    echo git remote add origin https://github.com/yourusername/email-social-scraper.git
    echo.
    echo Or run this command with your GitHub username:
    echo git remote add origin https://github.com/YOUR_USERNAME/email-social-scraper.git
    pause
    exit /b 1
)

REM Push to GitHub
echo 🚀 Pushing to GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo 🎉 Successfully pushed to GitHub!
    echo 📋 Next steps:
    echo 1. Visit your GitHub repository
    echo 2. Create a README.md if you haven't already
    echo 3. Set up GitHub Actions for CI/CD
    echo 4. Configure branch protection rules
    echo 5. Add collaborators if needed
    echo.
    for /f "tokens=*" %%i in ('git remote get-url origin') do echo 🔗 Your repository: %%i
) else (
    echo ❌ Failed to push to GitHub
    echo Please check your GitHub credentials and try again
    pause
    exit /b 1
)

pause
