@echo off
echo ======================================================
echo    Testing Extension on Own Test Form
echo ======================================================
echo.
echo This script will help you test the autofill on your extension's test form
echo.
echo Steps to follow:
echo 1. Make sure the extension is reloaded in Chrome Extensions
echo 2. Open the test form in Chrome
echo 3. Test the autofill functionality
echo.
echo Opening test form...
start chrome chrome-extension://odbbfcacnmkbgabadnhdjdacpfmgnmhm/test-form.html
echo.
echo Test form opened! Now:
echo 1. Click on the extension icon to open the popup
echo 2. Upload an image or use existing data
echo 3. Click "Autofill" button
echo 4. The form should get filled automatically
echo.
echo If you see any errors:
echo - Check Chrome DevTools Console (F12)
echo - Check Extension Errors in chrome://extensions/
echo - Make sure the extension is properly reloaded
echo.
pause
