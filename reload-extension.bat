@echo off
echo ======================================================
echo   Propace Autofill Assistant - Force Extension Reload
echo ======================================================
echo.
echo This script will help you properly reload the extension
echo.
echo Steps to follow:
echo 1. Go to Chrome Extensions (chrome://extensions/)
echo 2. Click the REFRESH/RELOAD button for Propace Autofill Assistant
echo 3. Or toggle OFF and then ON the extension
echo 4. Close all extension popups/windows if open
echo 5. Clear browser cache if needed (Ctrl+Shift+Del)
echo.
echo Press any key to open Chrome Extensions page...
pause >nul
start chrome://extensions/
echo.
echo Extension page opened. Please:
echo - Find "Propace Autofill Assistant"
echo - Click the refresh/reload button (circular arrow icon)
echo - Or toggle the extension OFF and then ON
echo - Test the changes
echo.
pause
