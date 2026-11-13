@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Xem thu trang kiem ke
if not exist node_modules call npm install --no-audit --no-fund
start "" http://localhost:3000
call npm run dev
pause
