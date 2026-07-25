@echo off
echo ====================================================
echo   MY SHIVA HONDA - DEALER DAILY REPORTING SYSTEM
echo ====================================================
echo.
echo 1. Launching Backend Server...
start "Backend" run-backend.bat
echo 2. Launching Admin Dashboard...
start "Admin Dashboard" run-admin.bat
echo 3. Launching Mobile App (Expo)...
start "Mobile App" run-mobile.bat
echo.
echo All modules are starting in separate windows.
echo ====================================================
pause
