@echo off
REM Ralph Multi-Agent Loop - Windows Wrapper
REM SPACE PUSH - 3D Multiplayer Game Builder

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

echo.
echo ===================================================================
echo    SPACE PUSH - Ralph Multi-Agent Builder
echo    Builder: Claude ^| Reviewer: Gemini ^| Validator: GPT-4
echo ===================================================================
echo.

REM Run the bash script with Git Bash
"C:\Program Files\Git\bin\bash.exe" "%SCRIPT_DIR%\ralph-multi-agent.sh" %*
