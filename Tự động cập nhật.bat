@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Tu dong cap nhat web kiem ke
if not exist node_modules (
  echo Lan dau: dang cai thu vien...
  call npm install --no-audit --no-fund
)
call npm run tu-dong-cap-nhat
pause
