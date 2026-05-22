@echo off
title ARDMS Network-in-a-Box (NIB) Launcher & Synchronizer
color 0B
cls

echo =======================================================================
echo     ___   ___  ___   __  __  ____    _   _ ___ ____   _     ___ _   _ 
echo    / _ \ / _ \|  _ \ |  \/  |/ ___|  ^| \ ^| ^|_ _^| __ )  ^| ^|   ^|_ _^| ^| ^| ^|
echo   ^|  _  ^|  _  ^| ^|_) ^| ^|\/^| ^|\___ \  ^|  \^| ^| ^| ^|  _ \  ^| ^|    ^| ^| ^| ^| ^| ^|
echo   ^| ^|_^| ^| ^|_^| ^|  _ / ^| ^|  ^| ^| ___) ^| ^| ^|\  ^| ^| ^| ^|_) ^| ^| ^|___ ^| ^| ^| |_^| ^|
echo   ^|_^| ^|_^|_^| ^|_^|_^|   ^|_^|  ^|_^|____/  ^|_^| \_^|___^|____/  ^|_____^|___^|\___/ 
echo                                                                       
echo     ARDMS COMMAND CORE - PRIVATE CELLULAR STATION AUTOMATION SYSTEM
echo =======================================================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Running with elevated Administrator privileges.
    goto :START_SYSTEM
) else (
    echo [WARN] Elevated administrator rights are required to configure firewall rules.
    echo [*] Attempting to elevate console privileges...
    timeout /t 2 >nul
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

:START_SYSTEM
echo [*] Step 1: Scanning active network interfaces and IP addresses...
echo -----------------------------------------------------------------------
powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*'} | Select-Object @{Name='Interface Name';Expression={$_.InterfaceAlias}}, @{Name='IPv4 Address';Expression={$_.IPAddress}} | Format-Table -AutoSize"
echo -----------------------------------------------------------------------
echo.

echo [*] Step 2: Configure Server Routing Target
echo Enter the NIB Mobile Core TUN interface IP (usually 10.45.0.1 for Open5GS/srsRAN)
echo or press ENTER to use the standard NIB default gateway:
set /p NIB_IP="Target IP [Default: 10.45.0.1]: "
if "%NIB_IP%"=="" set NIB_IP=10.45.0.1

echo.
echo [+] Routing Target locked: %NIB_IP%
echo.

echo [*] Step 3: Running Dynamic Endpoint Synchronizer...
echo.
cd /d "%~dp0"
python sync_apps.py %NIB_IP%
if %errorLevel% neq 0 (
    echo [ERROR] sync_apps.py encountered an error. Checking configurations...
    pause
    exit /b
)
echo.
echo [+] Synchronization complete. API endpoints linked to NIB cellular network!
echo.

echo [*] Step 4: Injecting Windows Defender Firewall Rules...
echo.
:: Inbound port 3001 TCP rule
powershell -Command "New-NetFirewallRule -DisplayName 'Rescue NIB Express Port' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue" >nul 2>&1
:: Specific core subnet route allowance rule
powershell -Command "New-NetFirewallRule -DisplayName 'Rescue NIB Core Subnet' -Direction Inbound -LocalPort 3001 -Protocol TCP -RemoteAddress 10.45.0.0/24 -Action Allow -ErrorAction SilentlyContinue" >nul 2>&1

echo [+] Firewall configured! Inbound port 3001 open for TUN interface packets.
echo.

echo [*] Step 5: Preparing and Launching Express.js Server Command Core...
echo -----------------------------------------------------------------------
echo [SYSTEM STATUS] Launching backend server on http://%NIB_IP%:3001
echo [SYSTEM STATUS] Database: rescue.db (WAL Mode Enabled)
echo.
echo Press Ctrl+C at any time to terminate the NIB server session.
echo -----------------------------------------------------------------------
echo.

cd system-backend
npm start

pause
