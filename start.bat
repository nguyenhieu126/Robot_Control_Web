@echo off
chcp 65001 >nul
title Robot Control System

echo ============================================
echo   Robot Control System - Startup
echo ============================================

REM ── Kiểm tra node_modules backend ──
if not exist "%~dp0backend\node_modules" (
    echo [BACKEND] Chua co node_modules, dang cai dat...
    cd /d "%~dp0backend"
    call npm install
    if errorlevel 1 (
        echo [LOI] npm install backend that bai!
        pause
        exit /b 1
    )
)

REM ── Kiểm tra node_modules frontend ──
if not exist "%~dp0frontend\node_modules" (
    echo [FRONTEND] Chua co node_modules, dang cai dat...
    cd /d "%~dp0frontend"
    call npm install
    if errorlevel 1 (
        echo [LOI] npm install frontend that bai!
        pause
        exit /b 1
    )
)

echo.
echo [1/2] Khoi dong Backend server  (http://localhost:5000)
echo [2/2] Khoi dong Frontend web    (http://localhost:3000)
echo.
echo Nhan Ctrl+C trong moi cua so de dung rieng tung service.
echo Dong cua so nay se DUNG CA HAI service.
echo ============================================
echo.

REM ── Mở Backend trong cửa sổ mới ──
start "Backend - Node.js :5000" cmd /k "cd /d "%~dp0backend" && npm run dev"

REM ── Đợi 2 giây để backend khởi động trước ──
timeout /t 2 /nobreak >nul

REM ── Mở Frontend trong cửa sổ mới ──
start "Frontend - React :3000" cmd /k "cd /d "%~dp0frontend" && npm start"

echo [OK] Ca hai service da duoc khoi dong trong cua so rieng.
echo.
echo Backend  : http://localhost:5000
echo Frontend : http://localhost:3000
echo WebSocket: ws://localhost:5000/ws/robot
echo.
pause
