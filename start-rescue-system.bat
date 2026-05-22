@echo off
title ARDMS Emergency Suite - Localhost Server Launcher
color 0A
cls

echo =======================================================================
echo     ___   ___  ___   __  __  ____    _        ___   ____   _     
echo    / _ \ / _ \|  _ \ |  \/  |/ ___|  ^| ^|      / _ \ / ___^| / \    
echo   ^|  _  ^|  _  ^| ^|_) ^| ^|\/^| ^|\___ \  ^| ^|     ^| ^| ^| ^| ^|    / _ \   
echo   ^| ^|_^| ^| ^|_^| ^|  _ / ^| ^|  ^| ^| ___) ^| ^| ^|___  ^| ^|_^| ^| ^|___/ ___ \  
echo   ^|_^| ^|_^|_^| ^|_^|_^|   ^|_^|  ^|_^|____/  ^|_____^|  \___/ \____/_/   \_\ 
echo                                                                       
echo     ARDMS COMMAND CORE - LOCAL HOST PREVIEW ^& DEVELOPMENT PLATFORM
echo =======================================================================
echo.

cd /d "%~dp0"

echo [*] Step 1: Scanning active network interfaces...
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v "256.0.0.0"') do (
    set LOCAL_IP=%%a
)
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

echo [+] Detected Local IP Address: %LOCAL_IP%
echo.

echo [*] Step 2: Choose network binding interface
echo [1] Bound to LOCAL IP: %LOCAL_IP% (Recommended: Allows mobile devices on same WiFi to connect)
echo [2] Bound to Loopback: 127.0.0.1 (Strictly offline, local to this laptop only)
echo.
set /p CHOICE="Enter choice [1 or 2, default: 1]: "

set TARGET_IP=%LOCAL_IP%
if "%CHOICE%"=="2" set TARGET_IP=127.0.0.1

echo.
echo [+] Target Interface selected: %TARGET_IP%
echo.

echo [*] Step 3: Running Dynamic Endpoint Synchronizer...
python sync_apps.py %TARGET_IP%
if %errorLevel% neq 0 (
    echo [ERROR] sync_apps.py encountered an error. Proceeding anyway...
)
echo.

echo [*] Step 4: Injecting Windows Firewall Rules for Port 3001...
powershell -Command "New-NetFirewallRule -DisplayName 'Rescue Local Port 3001' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue" >nul 2>&1
echo [+] Firewall rules verified.
echo.

echo [*] Step 5: Opening Portal Hub in default browser...
timeout /t 2 >nul
start chrome "http://localhost:3001/index.html"
if %errorLevel% neq 0 (
    start "" "http://localhost:3001/index.html"
)
echo.

echo [*] Step 6: Launching Express.js Server Command Core...
echo -----------------------------------------------------------------------
echo [SYSTEM STATUS] Launching backend server on http://%TARGET_IP%:3001
echo [SYSTEM STATUS] Portal Hub UI: http://localhost:3001/index.html
echo [SYSTEM STATUS] Database: rescue.db (WAL Mode Enabled)
echo.
echo Press Ctrl+C at any time to terminate the server session.
echo -----------------------------------------------------------------------
echo.

cd system-backend
npm start

pause
