@echo off
echo Starting My Shiva Honda Mobile App (Expo)...
cd "%~dp0mobile-app"
node "node_modules/expo/bin/cli" start --port 8081
pause
