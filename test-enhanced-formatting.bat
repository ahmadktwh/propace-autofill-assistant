@echo off
title Test Enhanced Formatting - Propace Autofill Extension
echo.
echo ===================================
echo  Testing Enhanced Formatting
echo ===================================
echo.
echo Opening enhanced field detection test...
echo.
echo Features being tested:
echo - Pakistani ID number formatting (36502-2333333-1)
echo - Phone number formatting (+92-300-1234567)
echo - Date field handling and calendar pickers
echo - Advanced field pattern matching
echo - Multiple naming conventions support
echo.

start "" "test-enhanced-formatting.html"

echo Test page opened in your default browser.
echo.
echo Instructions:
echo 1. Make sure your Propace extension is loaded in Chrome
echo 2. Click "Test Enhanced Autofill" button on the page
echo 3. Check if ID numbers are formatted as 36502-2333333-1
echo 4. Verify phone numbers show as +92-300-1234567
echo 5. Test date fields for proper formatting
echo.
pause
