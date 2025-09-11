@echo off
echo ======================================================
echo   Testing Propace Extension on VU University Website
echo ======================================================
echo.
echo This will open VU University website for testing
echo.
echo 1. Wait for Chrome to open
echo 2. Navigate to VU admission form or any form page
echo 3. Open Developer Console (F12)
echo 4. Check for JavaScript errors
echo 5. Test autofill functionality
echo.
pause

start chrome --new-window --load-extension="%~dp0" "https://vu.edu.pk"

echo.
echo VU University website opened with extension!
echo.
echo To debug:
echo 1. Press F12 to open Developer Console
echo 2. Go to Console tab
echo 3. Check for any red errors
echo 4. Test the Propace autofill extension
echo.
pause
