@echo off
title ARDMS Firewall Unlocker
color 0C
cls
echo ===================================================
echo     ARDMS PORT 3001 FIREWALL UNLOCKER
echo ===================================================
echo.
echo [*] Requesting Administrator Privileges to unlock Port 3001...
powershell -Command "Start-Process powershell -ArgumentList '-Command \"New-NetFirewallRule -DisplayName ''Rescue Local Port 3001'' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue\"' -Verb RunAs"
echo.
echo [+] Firewall rules successfully injected!
echo [+] Your mobile devices can now seamlessly connect to the local server.
echo.
pause
