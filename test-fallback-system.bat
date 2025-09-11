@echo off
echo ========================================
echo   Propace Fallback System Test
echo ========================================
echo.
echo This will test all automatic fallback mechanisms:
echo - Standard autofill
echo - Manual field mapping  
echo - Emergency fallbacks
echo - Shadow DOM bypass
echo - Basic DOM fallback
echo.

REM Open test page
start "" "test-fallback-system.html"

echo Test page opened in browser!
echo.
echo Instructions:
echo 1. Install the extension in Chrome
echo 2. Go to the test page
echo 3. Click "Test Propace Autofill" 
echo 4. Check "Field Status" to see results
echo.
echo The system will automatically try different methods
echo if the primary autofill fails!
echo.
pause
