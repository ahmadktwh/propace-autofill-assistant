@echo off
echo ======================================================
echo    FIXED - Extension Reload and Test
echo ======================================================
echo.
echo ✅ Fixed Issues:
echo    1. Removed invalid chrome-extension://* from manifest
echo    2. Added programmatic content script injection
echo    3. Added content-script.js to web_accessible_resources
echo    4. Added auto-loader script to test-form.html
echo.
echo Now follow these steps:
echo.
echo 1. Go to Chrome Extensions (chrome://extensions/)
echo 2. Find "Propace Autofill Assistant"
echo 3. Click the RELOAD button (refresh icon)
echo 4. Make sure extension loads without errors
echo.
pause
echo.
echo Opening extension test form...
start chrome chrome-extension://odbbfcacnmkbgabadnhdjdacpfmgnmhm/test-form.html
echo.
echo ✅ Test form opened!
echo.
echo Now test the autofill:
echo 1. Click extension icon to open popup
echo 2. Click "Autofill" button
echo 3. Form should get filled automatically
echo.
echo If you see any errors, check:
echo - Chrome DevTools Console (F12)
echo - Extension errors in chrome://extensions/
echo.
pause
