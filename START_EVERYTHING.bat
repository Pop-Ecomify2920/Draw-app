@echo off
echo.
echo ========================================
echo  Daily Dollar Lotto - Full System Start
echo ========================================
echo.

REM Start Backend
echo [1/2] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 5 /nobreak >nul

REM Start Frontend Web
echo [2/2] Starting Web App...
start "Web App" cmd /k "npm run web"

echo.
echo ========================================
echo  System Starting!
echo ========================================
echo.
echo  Backend:  http://localhost:3000
echo  Web App:  http://localhost:8082
echo.
echo  Press Ctrl+C in each window to stop
echo ========================================
echo.
pause
