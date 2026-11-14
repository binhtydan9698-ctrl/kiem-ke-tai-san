@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Kiem tra du lieu kiem ke
if not exist node_modules (
  echo Lan dau: dang cai thu vien...
  call npm install --no-audit --no-fund
)
echo Lay ban moi nhat tu GitHub (neu co)...
git pull --ff-only
if errorlevel 1 echo   ! Khong lay duoc ban moi tu GitHub, kiem tra file Excel dang co tren may nay.
echo.
call npm test
echo.
echo Xem ket qua o tren: dong co dau X la can sua trong file Excel; dong co dau ! chi la ghi chu.
pause
