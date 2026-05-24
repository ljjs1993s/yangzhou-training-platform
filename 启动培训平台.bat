@echo off
chcp 65001 >nul 2>&1
title Training Platform Server
cls
echo ==========================================
echo    Training Platform Server
echo ==========================================
echo.
cd /d "%~dp0"
echo [Starting] Please wait...
echo.

:: ---- Auto-detect Node.js (no PATH dependency) ----
set "NODE_EXE="

:: 1. Trae IDE bundled Node.js (highest priority)
if exist "%USERPROFILE%\.trae-cn\binaries\node\versions\24.15.0\node.exe" (
  set "NODE_EXE=%USERPROFILE%\.trae-cn\binaries\node\versions\24.15.0\node.exe"
  goto :found_node
)
if exist "%USERPROFILE%\.trae\binaries\node\versions\24.15.0\node.exe" (
  set "NODE_EXE=%USERPROFILE%\.trae\binaries\node\versions\24.15.0\node.exe"
  goto :found_node
)

:: 2. WorkBuddy bundled Node.js (auto-detect any version subfolder)
if exist "%USERPROFILE%\.workbuddy\binaries\node\versions" (
  for /d %%D in ("%USERPROFILE%\.workbuddy\binaries\node\versions\*") do (
    if exist "%%D\node.exe" (
      set "NODE_EXE=%%D\node.exe"
      goto :found_node
    )
  )
)

:: 3. Standard install locations
if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
  goto :found_node
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
  goto :found_node
)
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
  set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
  goto :found_node
)

:: 4. nvm managed versions (each as separate if, no for loop)
if exist "%APPDATA%\nvm\v24.15.0\node.exe" ( set "NODE_EXE=%APPDATA%\nvm\v24.15.0\node.exe" & goto :found_node )
if exist "%APPDATA%\nvm\v22.14.0\node.exe" ( set "NODE_EXE=%APPDATA%\nvm\v22.14.0\node.exe" & goto :found_node )
if exist "%APPDATA%\nvm\v22.12.0\node.exe" ( set "NODE_EXE=%APPDATA%\nvm\v22.12.0\node.exe" & goto :found_node )
if exist "%APPDATA%\nvm\v20.19.0\node.exe" ( set "NODE_EXE=%APPDATA%\nvm\v20.19.0\node.exe" & goto :found_node )
if exist "%APPDATA%\nvm\v18.20.0\node.exe" ( set "NODE_EXE=%APPDATA%\nvm\v18.20.0\node.exe" & goto :found_node )

:: 5. Fall back to system PATH as last resort
where node >nul 2>&1
if %errorlevel% equ 0 (
    set "NODE_EXE=node"
    goto :found_node
)

:: Not found
echo [ERROR] Failed to start server.
echo Please make sure Node.js is installed.
echo.
echo Download from: https://nodejs.org/
echo.
pause
exit /b 1

:found_node
:: Clear NODE_OPTIONS to avoid --use-system-ca incompatibility with Node v22+
set "NODE_OPTIONS="
echo [INFO] Using Node.js: %NODE_EXE%
"%NODE_EXE%" --version
echo.
echo [INFO] Starting server...
echo.

"%NODE_EXE%" server.js

:: Check exit code and show friendly message
if %errorlevel% equ 0 (
    echo.
    echo [INFO] Server stopped normally.
) else (
    echo.
    echo [WARN] Server stopped with error code %errorlevel%.
    echo.
    echo Common fixes:
    echo   - Port 3001 in use: close other instances and try again.
    echo   - Missing modules: run 'npm install' first.
)
echo.
echo Press any key to exit...
pause >nul
