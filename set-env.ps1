# PowerShell script to set environment variables for QR Queue System
Write-Host "Setting environment variables for QR Queue System..." -ForegroundColor Green

$env:HOST = "192.168.1.69"
$env:PORT = "5000"

Write-Host "HOST = $env:HOST" -ForegroundColor Yellow
Write-Host "PORT = $env:PORT" -ForegroundColor Yellow
Write-Host ""
Write-Host "Now you can start your server with: npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your QR codes will now use: http://$env:HOST`:$env:PORT/api/queues/join/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
