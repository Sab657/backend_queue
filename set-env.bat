@echo off
echo Setting environment variables for QR Queue System...
set HOST=192.168.1.69
set PORT=5000
echo HOST=%HOST%
echo PORT=%PORT%
echo.
echo Now you can start your server with: npm run dev
echo.
echo Your QR codes will now use: http://%HOST%:%PORT%/api/queues/join/
echo.
pause
