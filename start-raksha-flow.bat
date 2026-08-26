@echo off
title RAKSHA FLOW — Emergency Response Platform Launcher
color 0B
echo.
echo ========================================================
echo         RAKSHA FLOW — AI-Powered Emergency Response
echo ========================================================
echo.
echo [1/2] Starting Raksha Flow FastAPI Backend Server on port 8080...
echo.

cd /d "%~dp0backend"
start "Raksha Flow Backend Server" python -m uvicorn app.main:app --host 0.0.0.0 --port 8080

timeout /t 3 >nul

echo [2/2] Opening Raksha Flow Web Application in your default browser...
start http://localhost:8080/

echo.
echo ========================================================
echo  Raksha Flow is running live at http://localhost:8080
echo ========================================================
echo.
echo Press any key to stop the launcher window.
pause >nul
