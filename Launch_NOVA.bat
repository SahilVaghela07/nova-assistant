@echo off
title NOVA AI Assistant - Boot Sequence
color 0B
echo.
echo ===================================================
echo             NOVA AI CORE INITIALIZATION
echo ===================================================
echo 🔒 100%% Local Processing - Data never leaves this PC
echo.

:: Start the Node Proxy Backend quietly in a separate background window
echo [1/3] Booting Backend AI Router on Port 3001...
cd /d "%~dp0backend"
start /min cmd /c "npm start"

:: Start the React UI server in a separate background window
echo [2/3] Booting Holographic Interface on Port 5173...
cd /d "%~dp0frontend"
start /min cmd /c "npm run dev"

:: Wait 3 seconds to let servers bind to ports
echo [3/3] Establishing local loopback connection...
timeout /t 3 /nobreak >nul

:: Launch standard browser window to the UI and exit the terminal
start http://localhost:5173
exit
