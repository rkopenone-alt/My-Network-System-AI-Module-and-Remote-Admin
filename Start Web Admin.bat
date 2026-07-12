@echo off
setlocal EnableDelayedExpansion
title ARDMS Web Admin - Production Launcher
color 0B
cd /d "%~dp0"
cls

echo ===================================================
echo   ARDMS COMMAND CENTER - PRODUCTION SERVER LAUNCHER
echo ===================================================
echo.

REM 4. NOTIFY PREREQUISITES
echo [*] Checking System Prerequisites...

REM Check Node.js
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] CRITICAL ERROR: Node.js is missing!
    echo [!] The system requires Node.js to run the local host server.
    echo [!] Action Required: Please install Node.js from https://nodejs.org/
    echo [!] After installing, restart this batch file.
    echo.
    pause
    exit /b
)
echo [OK] Node.js is installed.

REM Check Python (optional, for build scripts)
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Python is not installed. You will need it if you want to compile new APKs later.
) ELSE (
    echo [OK] Python is installed.
)

REM 1. & 2. INSTALL/RUN NECESSARY FILES
cd system-backend

IF NOT EXIST "node_modules\" (
    echo.
    echo [*] First-time setup detected ^(system files not found^).
    echo [*] Installing necessary system files...
    echo [*] Running: npm install
    
    REM Simple ping to warn if offline
    ping -n 1 8.8.8.8 >nul 2>&1
    IF !ERRORLEVEL! NEQ 0 (
        echo [!] WARNING: You appear to be offline. 
        echo [!] If this is your first time, the installation requires internet access.
    )

    call npm install
    IF !ERRORLEVEL! NEQ 0 (
        echo [!] WARNING: Dependency installation encountered an error. 
        echo [!] If you are offline, ensure you run this once while connected to the internet.
    ) ELSE (
        echo [+] Installation complete.
    )
) ELSE (
    echo.
    echo [*] System files already exist. Loading local host...
)

echo.
echo [*] Checking PM2 Process Manager...
call pm2 -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [*] PM2 not found. Installing PM2 globally for robust production execution...
    call npm install -g pm2
)

echo [*] Ensuring Windows Firewall allows Port 3001 for mobile connectivity...
powershell -Command "Start-Process powershell -ArgumentList '-Command \"New-NetFirewallRule -DisplayName ''Rescue Local Port 3001'' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue\"' -Verb RunAs -WindowStyle Hidden" >nul 2>&1

echo.
echo [*] Starting Production Backend Service via PM2...
REM Stop existing instance if any to prevent conflicts, then start
call pm2 stop ardms-backend >nul 2>&1
call pm2 start server.js --name "ardms-backend"
call pm2 save >nul 2>&1

echo.
echo [*] Retrieving Local IP Address...
for /f "tokens=14" %%a in ('ipconfig ^| findstr IPv4') do set LOCAL_IP=%%a
echo [+] Server accessible locally at: http://localhost:3001
echo [+] Server accessible on network at: http://%LOCAL_IP%:3001
echo.

REM 3. OPEN WEB DASH IN CHROME OR EDGE
echo [*] Launching Web Dashboard...
REG QUERY "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo [+] Opening in Google Chrome...
    start chrome "http://localhost:3001"
) ELSE (
    REG QUERY "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe" >nul 2>&1
    IF %ERRORLEVEL% EQU 0 (
        echo [+] Chrome not found. Opening in Microsoft Edge...
        start msedge "http://localhost:3001"
    ) ELSE (
        echo [+] Opening in Default Browser...
        start "" "http://localhost:3001"
    )
)

echo.
echo ===================================================
echo [+] SYSTEM ONLINE IN PRODUCTION MODE
echo [+] Press any key to view live server logs...
echo ===================================================
pause >nul
pm2 logs ardms-backend
