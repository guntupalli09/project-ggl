# Project GGL - Push to GitHub Script
# This script helps push your project to GitHub

Write-Host "🚀 Project GGL - Push to GitHub" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check if Git is installed
Write-Host "`n📋 Checking Git installation..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✅ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git not found. Please install Git first:" -ForegroundColor Red
    Write-Host "   1. Go to https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "   2. Download and install Git" -ForegroundColor Yellow
    Write-Host "   3. Restart PowerShell and run this script again" -ForegroundColor Yellow
    exit 1
}

# Check if we're in a git repository
Write-Host "`n📁 Checking Git repository..." -ForegroundColor Yellow
if (!(Test-Path ".git")) {
    Write-Host "🔧 Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git repository already exists" -ForegroundColor Green
}

# Add all files
Write-Host "`n📝 Adding files to Git..." -ForegroundColor Yellow
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "`n💾 Committing changes..." -ForegroundColor Yellow
    git commit -m "Initial commit - Project GGL CRM with AI features"
    Write-Host "✅ Changes committed" -ForegroundColor Green
} else {
    Write-Host "ℹ️ No changes to commit" -ForegroundColor Blue
}

Write-Host "`n🌐 GitHub Setup Instructions:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create a new repository on GitHub:" -ForegroundColor White
Write-Host "   - Go to https://github.com/new" -ForegroundColor Gray
Write-Host "   - Repository name: project-ggl" -ForegroundColor Gray
Write-Host "   - Description: AI-powered CRM with lead management and outreach automation" -ForegroundColor Gray
Write-Host "   - Make it Public or Private (your choice)" -ForegroundColor Gray
Write-Host "   - DO NOT initialize with README, .gitignore, or license" -ForegroundColor Red
Write-Host "   - Click Create repository" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Copy the repository URL from GitHub" -ForegroundColor White
Write-Host "   - It will look like: https://github.com/yourusername/project-ggl.git" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Run these commands in PowerShell:" -ForegroundColor White
Write-Host "   git remote add origin https://github.com/yourusername/project-ggl.git" -ForegroundColor Gray
Write-Host "   git branch -M main" -ForegroundColor Gray
Write-Host "   git push -u origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "4. After pushing, you can deploy to Vercel:" -ForegroundColor White
Write-Host "   - Go to https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host "   - Click New Project" -ForegroundColor Gray
Write-Host "   - Import your GitHub repository" -ForegroundColor Gray
Write-Host "   - Configure environment variables" -ForegroundColor Gray
Write-Host "   - Deploy!" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 For detailed instructions, see DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Your project is ready to be pushed to GitHub!" -ForegroundColor Green