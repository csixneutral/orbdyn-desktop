@echo off
title Build Orbdyn installer
cd /d "%~dp0"

echo.
echo   Building the Orbdyn installer for Windows...
echo   This takes a few minutes the first time.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   Please install Node.js first from https://nodejs.org ^(the green LTS button^).
  pause
  exit /b
)

call npm install || (pause & exit /b)
call npm run build:ui || (pause & exit /b)
call npx electron-builder --win nsis || (pause & exit /b)

echo.
echo   Done. Look inside the "dist" folder next to this file for
echo   "Orbdyn Setup 1.0.0.exe" - run it to install Orbdyn.
echo.
pause
