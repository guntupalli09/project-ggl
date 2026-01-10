# Setup script for LinkedIn OAuth backend
Write-Host "Setting up LinkedIn OAuth backend..." -ForegroundColor Green

# Create .env file in backend directory
$envContent = @"
LINKEDIN_CLIENT_ID=86ts0ompt7atve
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:5173/linkedin/callback
PORT=3001
"@

$envPath = "backend\.env"
$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host "Created backend/.env file" -ForegroundColor Yellow
Write-Host "IMPORTANT: Replace 'your_client_secret_here' with your actual LinkedIn Client Secret!" -ForegroundColor Red
Write-Host "Get it from: https://www.linkedin.com/developers/apps" -ForegroundColor Cyan

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Green
Set-Location backend
node server.js
