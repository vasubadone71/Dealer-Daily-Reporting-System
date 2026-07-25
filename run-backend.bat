@echo off
echo Starting My Shiva Honda Reporting System Backend...
cd "%~dp0backend"
node "node_modules/nodemon/bin/nodemon.js" server.js || node server.js
pause
