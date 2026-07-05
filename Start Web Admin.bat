@echo off
title ARDMS Web Admin - Production Launcher
color 0B
cd /d "%~dp0"
cls

echo ===================================================
echo   ARDMS COMMAND CENTER - PRODUCTION SERVER LAUNCHER
echo ===================================================
echo.

echo [*] Checking for Node.js installation...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [!] ERROR: Node.js is not installed or not in PATH.
    echo [!] Please install Node.js from https://nodejs.org/ and restart this launcher.
    pause
    exit /b
)

echo [*] Checking for PM2 Process Manager...
call pm2 -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [*] PM2 not found. Installing PM2 globally for production...
    call npm install -g pm2
)

echo [*] Ensuring Windows Firewall allows Port 3001 for mobile connectivity...
powershell -Command "Start-Process powershell -ArgumentList '-Command \"New-NetFirewallRule -DisplayName ''Rescue Local Port 3001'' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue\"' -Verb RunAs -WindowStyle Hidden" >nul 2>&1

cd system-backend

echo [*] Checking and installing Node dependencies...
IF NOT EXIST "node_modules\" (
    echo [*] Installing required Node modules...
    call npm install
)

echo [*] Retrieving Local IP Address...
for /f "tokens=14" %%a in ('ipconfig ^| findstr IPv4') do set LOCAL_IP=%%a
echo [+] Server accessible locally at: http://localhost:3001
echo [+] Server accessible on network at: http://%LOCAL_IP%:3001
echo.

echo [*] Opening Web Admin in your default browser...
start http://localhost:3001

echo [*] Starting Production Backend Service via PM2...
call pm2 start server.js --name "ardms-backend"

echo [*] Saving PM2 state for auto-reboot...
call pm2 save

echo.
echo ===================================================
echo [+] SYSTEM ONLINE IN PRODUCTION MODE
echo [+] Press any key to view live server logs...
echo ===================================================
pause >nul
pm2 logs ardms-backend
