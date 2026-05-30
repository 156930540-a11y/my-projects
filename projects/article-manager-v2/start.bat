@echo off
chcp 65001 >nul
title 文章管理系统

echo.
echo   ╔══════════════════════════════════════╗
echo   ║     📝 文章管理系统 - 一键部署        ║
echo   ╚══════════════════════════════════════╝
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo   ❌ 未检测到 Node.js，请先安装 Node.js
  echo   📥 下载地址: https://nodejs.org/
  pause
  exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do echo   ✅ Node.js 版本: %%i
echo.

:: 安装依赖
if not exist "node_modules" (
  echo   📦 首次运行，正在安装依赖...
  call npm install
  echo.
)

echo   🚀 正在启动服务...
echo.

:: 启动
node server.js

pause
