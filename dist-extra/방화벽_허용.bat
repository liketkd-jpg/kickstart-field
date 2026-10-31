@echo off
chcp 65001 >nul
rem  휴대폰(심판·전광판)과 다른 노트북(본부·코트)이 이 노트북의 현장 모드에 접속할 수 있게 윈도우 방화벽을 엽니다.
net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
echo.
echo   KICKSTART 현장 모드: 방화벽을 여는 중입니다...
netsh advfirewall firewall delete rule name="KICKSTART Field Mode" >nul 2>&1
netsh advfirewall firewall delete rule name="KICKSTART Field Discovery" >nul 2>&1
netsh advfirewall firewall add rule name="KICKSTART Field Mode" dir=in action=allow protocol=TCP localport=8080-8099 profile=any
netsh advfirewall firewall add rule name="KICKSTART Field Discovery" dir=in action=allow protocol=UDP localport=47800 profile=any
echo.
echo   완료되었습니다. 이 창을 닫고 "KICKSTART 현장모드.exe"를 실행하세요.
echo.
pause
