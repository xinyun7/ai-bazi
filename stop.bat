@echo off
chcp 65001 >nul
echo 正在停止天机阁服务...

:: 停止 Node.js 服务（端口 3000）
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 停止隧道进程（查找 tunnel.js）
for /f "tokens=2" %%a in ('tasklist /FI "WINDOWTITLE eq 天机阁-隧道" /NH 2^>nul ^| findstr "node"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo 服务和隧道已停止
pause
