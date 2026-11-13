@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Cap nhat len web
if not exist node_modules (
  echo Lan dau: dang cai thu vien...
  call npm install --no-audit --no-fund
)
call npm run day-len-web
pause
