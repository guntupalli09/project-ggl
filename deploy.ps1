# Project GGL - Deployment Script for Windows PowerShell
# This script helps prepare and deploy the project to Vercel

Write-Host "🚀 Project GGL - Deployment Preparation" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Check if Git is installed
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✅ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git not found. Please install Git from https://git-scm.com/downloads" -ForegroundColor Red
    Write-Host "After installing Git, run this script again." -ForegroundColor Yellow
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔧 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`n🏗️ Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed. Please check the errors above." -ForegroundColor Red
    exit 1
}

Write-Host "`n📁 Initializing Git repository..." -ForegroundColor Yellow
if (!(Test-Path ".git")) {
    git init
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git repository already exists" -ForegroundColor Green
}

Write-Host "`n📝 Adding files to Git..." -ForegroundColor Yellow
git add .

Write-Host "`n💾 Committing changes..." -ForegroundColor Yellow
git commit -m "Initial commit - Project GGL ready for deployment"

Write-Host "`n🎉 Project is ready for deployment!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create a GitHub repository" -ForegroundColor White
Write-Host "2. Push your code to GitHub:" -ForegroundColor White
Write-Host "   git remote add origin https://github.com/yourusername/project-ggl.git" -ForegroundColor Gray
Write-Host "   git branch -M main" -ForegroundColor Gray
Write-Host "   git push -u origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Deploy to Vercel:" -ForegroundColor White
Write-Host "   - Go to https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host "   - Click 'New Project'" -ForegroundColor Gray
Write-Host "   - Import your GitHub repository" -ForegroundColor Gray
Write-Host "   - Configure environment variables" -ForegroundColor Gray
Write-Host "   - Deploy!" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 For detailed instructions, see DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment variables to set in Vercel:" -ForegroundColor Yellow
Write-Host "VITE_SUPABASE_URL=https://rmrhvrptpqopaogrftgl.supabase.co" -ForegroundColor Gray
Write-Host "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDI0NjIsImV4cCI6MjA3NTUxODQ2Mn0.QNQhnn2-rHuIjpKeRTSzAxVOgUQFrYg5hJ6KCPldquc" -ForegroundColor Gray
Write-Host "VITE_OPENAI_API_KEY=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" -ForegroundColor Gray
