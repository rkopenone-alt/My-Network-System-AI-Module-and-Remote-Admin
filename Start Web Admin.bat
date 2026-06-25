@echo off
title ARDMS Web Admin Launcher
color 0B
cls

echo ===================================================
echo     ARDMS COMMAND CENTER - LOCAL SERVER LAUNCHER
echo ===================================================
echo.

echo [*] Opening Web Admin in your default browser...
start http://localhost:3001

echo [*] Ensuring Windows Firewall allows Port 3001 for mobile connectivity...
powershell -Command "Start-Process powershell -ArgumentList '-Command \"New-NetFirewallRule -DisplayName ''Rescue Local Port 3001'' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue\"' -Verb RunAs -WindowStyle Hidden" >nul 2>&1

echo [*] Starting Backend Server...
cd system-backend
node server.js

pause
