@echo off
REM Ralph Pre-flight Check - Windows Wrapper
REM Tests all components before running the main loop

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

echo.
echo ===================================================================
echo    Ralph Pre-flight Check
echo ===================================================================
echo.

REM Run the bash script with Git Bash
"C:\Program Files\Git\bin\bash.exe" "%SCRIPT_DIR%\ralph-preflight.sh" %*

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Ready to run: ralph-multi-agent.cmd
) else (
    echo.
    echo Fix the issues above before running Ralph.
)
