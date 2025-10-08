@echo off
echo 🚀 Project GGL - Push to GitHub
echo =================================
echo.

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git not found. Please install Git first:
    echo    1. Go to https://git-scm.com/download/win
    echo    2. Download and install Git
    echo    3. Restart Command Prompt and run this script again
    pause
    exit /b 1
)

echo ✅ Git found
echo.

REM Initialize Git repository if needed
if not exist ".git" (
    echo 🔧 Initializing Git repository...
    git init
    echo ✅ Git repository initialized
) else (
    echo ✅ Git repository already exists
)

echo.
echo 📝 Adding files to Git...
git add .

echo.
echo 💾 Committing changes...
git commit -m "Initial commit - Project GGL CRM with AI features"

echo.
echo 🌐 GitHub Setup Instructions:
echo =================================
echo.
echo 1. Create a new repository on GitHub:
echo    - Go to https://github.com/new
echo    - Repository name: project-ggl
echo    - Description: AI-powered CRM with lead management and outreach automation
echo    - Make it Public or Private (your choice)
echo    - DON'T initialize with README, .gitignore, or license
echo    - Click 'Create repository'
echo.
echo 2. Copy the repository URL from GitHub
echo    - It will look like: https://github.com/yourusername/project-ggl.git
echo.
echo 3. Run these commands in Command Prompt:
echo    git remote add origin https://github.com/yourusername/project-ggl.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 4. After pushing, you can deploy to Vercel:
echo    - Go to https://vercel.com/dashboard
echo    - Click 'New Project'
echo    - Import your GitHub repository
echo    - Configure environment variables
echo    - Deploy!
echo.
echo 📖 For detailed instructions, see DEPLOYMENT.md
echo.
echo 🎉 Your project is ready to be pushed to GitHub!
echo.
pause
