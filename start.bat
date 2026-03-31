@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: ---- 检查 Node.js 是否安装 ----
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装: https://nodejs.org/
    pause
    exit /b 1
)

:: ---- 检查依赖是否安装 ----
if not exist "node_modules\" (
    echo [提示] 首次运行，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败，请检查网络后重试
        pause
        exit /b 1
    )
    echo.
)

:: ---- 检查 .env 配置 ----
if not exist ".env" (
    echo [错误] 缺少 .env 配置文件，请先创建并填入 DEEPSEEK_API_KEY
    pause
    exit /b 1
)

:: ---- 先停止已有进程，避免端口冲突 ----
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: ---- 菜单 ----
echo.
echo +========================================+
echo :        天 机 阁 - 启 动 选 项          :
echo +========================================+
echo :  1. 仅本地启动 (127.0.0.1:3000)       :
echo :  2. 本地 + 公网隧道 (生成公网链接)    :
echo :  3. 停止所有服务                       :
echo +========================================+
echo.
set /p choice=请选择 (1/2/3): 

if "%choice%"=="3" (
    call stop.bat
    exit /b 0
)

if "%choice%"=="2" (
    echo.
    echo 正在启动服务 + 公网隧道...
    start "天机阁-服务" /min cmd /c "node server.js"
    echo 等待服务就绪...
    timeout /t 3 /nobreak >nul

    :: 验证服务是否启动成功
    netstat -aon | findstr ":3000" | findstr "LISTENING" >nul 2>&1
    if errorlevel 1 (
        echo [错误] 服务启动失败，请检查日志
        pause
        exit /b 1
    )

    start "天机阁-隧道" cmd /c "node tunnel.js"
    echo.
    echo 服务已启动！公网地址请查看弹出的隧道窗口
) else (
    echo.
    echo 正在启动本地服务...
    start "天机阁-服务" /min cmd /c "node server.js"
    timeout /t 2 /nobreak >nul

    netstat -aon | findstr ":3000" | findstr "LISTENING" >nul 2>&1
    if errorlevel 1 (
        echo [错误] 服务启动失败，请检查日志
        pause
        exit /b 1
    )

    echo 服务已启动！
    echo 正在打开浏览器...
    start http://127.0.0.1:3000
)
echo.
pause
