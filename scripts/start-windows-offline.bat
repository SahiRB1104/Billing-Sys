@echo off
REM ============================================================================
REM Billing Sys — Offline Windows Supermarket POS Launcher
REM Starts the local SQLite + FastAPI backend and launches the POS terminal UI
REM in a dedicated single-screen app window (zero internet required).
REM ============================================================================

title Billing Sys — Offline Supermarket POS
setlocal

set "ROOT_DIR=%~dp0.."
cd /d "%ROOT_DIR%"

if not defined POS_DATA_DIR (
    if exist "%ROOT_DIR%\backend\data\store.db" (
        set "POS_DATA_DIR=%ROOT_DIR%\backend\data"
    ) else (
        set "POS_DATA_DIR=%LOCALAPPDATA%\BillingSysPOS\data"
    )
)

if not exist "%POS_DATA_DIR%" mkdir "%POS_DATA_DIR%"

echo [1/2] Starting Offline POS Backend (127.0.0.1:8000)...
if exist "%ROOT_DIR%\backend\.venv\Scripts\python.exe" (
    start "BillingSysBackend" /min "%ROOT_DIR%\backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir "%ROOT_DIR%\backend" --host 127.0.0.1 --port 8000
) else (
    start "BillingSysBackend" /min python -m uvicorn app.main:app --app-dir "%ROOT_DIR%\backend" --host 127.0.0.1 --port 8000
)

timeout /t 2 /nobreak >nul

echo [2/2] Starting Offline POS Frontend Terminal...
if exist "%ROOT_DIR%\frontend\src-tauri\target\release\app.exe" (
    start "" "%ROOT_DIR%\frontend\src-tauri\target\release\app.exe"
) else (
    cd /d "%ROOT_DIR%\frontend"
    start "BillingSysFrontend" /min cmd /c "npm run preview -- --host 127.0.0.1 --port 5173"
    timeout /t 2 /nobreak >nul
    start "" msedge --app=http://127.0.0.1:5173 --start-maximized
)

echo POS Terminal launched successfully.
endlocal
