@echo off
chcp 65001 >nul
title 扬州培训平台 - 公网隧道

echo.
echo ╔══════════════════════════════════════╗
echo ║   扬州培训平台 - 公网隧道守护     ║
echo ╚══════════════════════════════════════╝
echo.

:: 以管理员权限运行 PowerShell 守护脚本
powershell -ExecutionPolicy Bypass -File "%~dp0tunnel-guard.ps1"

pause
