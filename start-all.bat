@echo off
echo Starting Pmail Application...
echo.

echo Starting Backend Server...
start cmd /k "cd /d %~dp0server && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Both servers are starting!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
