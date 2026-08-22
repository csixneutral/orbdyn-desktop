@echo off
title Orbdyn
cd /d "%~dp0"

echo.
echo   ORBDYN
echo   ------
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js is not installed on this computer yet.
  echo.
  echo   Orbdyn needs it to run. It is free and takes about two minutes:
  echo     1. Go to  https://nodejs.org
  echo     2. Download the big green "LTS" button and install it
  echo        ^(keep clicking Next - the default answers are fine^)
  echo     3. Close this window and double-click this file again
  echo.
  pause
  exit /b
)

if not exist "node_modules\electron" (
  echo   First time setup. This downloads what Orbdyn needs - about 2-5 minutes.
  echo   You only ever have to do this once. Please leave this window open.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   Setup did not finish. Check that you are connected to the internet
    echo   and try again.
    pause
    exit /b
  )
)

echo   Starting Orbdyn...
call npm start
