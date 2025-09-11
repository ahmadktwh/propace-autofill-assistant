@echo off
cls
echo ========================================
echo   Propace Extension - CSP Fix Test
echo ========================================
echo.
echo CSP Error Fixed:
echo [✓] Removed 'unsafe-eval' from manifest
echo [✓] Using safe CSP policy
echo [✓] Extension should load properly now
echo.
echo INSTALLATION STEPS:
echo ==================
echo.
echo 1. Open Chrome and go to: chrome://extensions/
echo 2. Enable "Developer mode" (top right toggle)
echo 3. Click "Load unpacked"
echo 4. Select this folder: %cd%
echo 5. Extension should load without errors
echo.
echo If you still see errors:
echo - Try refreshing the page
echo - Check if all files are present
echo - Verify folder permissions
echo.
echo Opening Chrome extensions page...
start chrome://extensions/
echo.
echo Extension folder ready for loading:
echo %cd%
echo.
pause
