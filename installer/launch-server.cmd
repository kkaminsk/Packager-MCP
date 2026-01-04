@echo off
REM Packager-MCP Server Launcher
REM Uses bundled Node.js runtime

setlocal

REM Get the directory where this script is located
set "INSTALL_DIR=%~dp0"

REM Set paths
set "NODE_EXE=%INSTALL_DIR%nodejs\node.exe"
set "SERVER_JS=%INSTALL_DIR%dist\server.js"

REM Verify Node.js exists
if not exist "%NODE_EXE%" (
    echo ERROR: Bundled Node.js not found at: %NODE_EXE%
    echo Please reinstall Packager-MCP.
    pause
    exit /b 1
)

REM Verify server.js exists
if not exist "%SERVER_JS%" (
    echo ERROR: Server script not found at: %SERVER_JS%
    echo Please reinstall Packager-MCP.
    pause
    exit /b 1
)

REM Change to install directory for proper relative paths
cd /d "%INSTALL_DIR%"

REM Launch the MCP server
echo Starting Packager-MCP server...
echo Node.js: %NODE_EXE%
echo Server: %SERVER_JS%
echo.

"%NODE_EXE%" "%SERVER_JS%" %*

endlocal
