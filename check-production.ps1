# PowerShell script to check production server from local machine

Write-Host "🔍 Checking Production Pmail Server" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Test API health endpoint
Write-Host "1️⃣ Testing API Health Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://login.pryro.com/api/health" -Method Get -TimeoutSec 10
    Write-Host "✅ API is responding!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "❌ API Health Check Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test registration endpoint
Write-Host "2️⃣ Testing Registration Endpoint..." -ForegroundColor Yellow
try {
    $testData = @{
        email = "test@test.com"
        password = "Test123456"
        name = "Test User"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "https://login.pryro.com/api/auth/register" `
        -Method Post `
        -Body $testData `
        -ContentType "application/json" `
        -TimeoutSec 10
    
    Write-Host "✅ Registration endpoint is responding!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Registration Test Result:" -ForegroundColor Yellow
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Gray
    }
}

Write-Host ""

# Test API base URL
Write-Host "3️⃣ Testing API Base URL..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://login.pryro.com/api" -Method Get -TimeoutSec 10
    Write-Host "✅ API base URL accessible (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ API base URL not accessible!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Instructions for SSH
Write-Host "📡 To check server logs via SSH:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Connect to server:" -ForegroundColor White
Write-Host "   ssh root@vmi3109658" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Check PM2 status:" -ForegroundColor White
Write-Host "   pm2 status" -ForegroundColor Gray
Write-Host ""
Write-Host "3. View server logs:" -ForegroundColor White
Write-Host "   pm2 logs pmail-server --lines 50" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Run quick check script (upload it first):" -ForegroundColor White
Write-Host "   bash quick-server-check.sh" -ForegroundColor Gray
Write-Host ""

# Check if .env is configured for production
Write-Host "⚙️ Checking Local .env Configuration:" -ForegroundColor Cyan
$envPath = "e:\pmail\.env"
if (Test-Path $envPath) {
    $apiUrl = Select-String -Path $envPath -Pattern "VITE_API_URL" | Select-Object -First 1
    Write-Host "Current setting: $($apiUrl.Line)" -ForegroundColor Gray
    
    if ($apiUrl.Line -match "localhost") {
        Write-Host "⚠️ WARNING: .env is pointing to localhost!" -ForegroundColor Yellow
        Write-Host "For production, change to:" -ForegroundColor Yellow
        Write-Host "VITE_API_URL=https://login.pryro.com/api" -ForegroundColor Green
    } else {
        Write-Host "✅ .env configured for production" -ForegroundColor Green
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Check Complete!" -ForegroundColor Green
