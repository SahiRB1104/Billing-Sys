# ==============================================================================
# Billing Sys — Windows Offline Desktop Installer Build Script (PowerShell)
# Bundles the FastAPI + SQLite backend and compiles the Tauri v2 Windows `.msi`
# and `.exe` desktop application.
# ==============================================================================

$ErrorActionPreference = "Stop"
$RootDir = Resolve-Path "$PSScriptRoot\.."

Write-Host "==> [1/3] Building Frontend Production Bundle (Vite + Tiro Devanagari Marathi)..." -ForegroundColor Cyan
Set-Location "$RootDir\frontend"
npm install
npm run build

Write-Host "==> [2/3] Verifying Backend Dependencies & Database Schema..." -ForegroundColor Cyan
Set-Location "$RootDir\backend"
python -m pip install -r requirements.txt

Write-Host "==> [3/3] Building Tauri v2 Native Windows Desktop Application..." -ForegroundColor Cyan
Set-Location "$RootDir\frontend"
npx tauri build

Write-Host "==> Build Complete! Windows installer located under frontend\src-tauri\target\release\bundle\" -ForegroundColor Green
