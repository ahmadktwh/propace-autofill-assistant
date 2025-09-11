@echo off
echo ================================================
echo   PROPACE AUTOFILL - QUICK DEBUG TEST
echo ================================================
echo.
echo Step 1: Copy the debug commands file to clipboard
echo.
type debug-console-commands.js | clip
echo Debug commands copied to clipboard!
echo.
echo Step 2: Manual testing instructions:
echo =====================================
echo.
echo 1. Go to the VU University page (vu.edu.pk/Apply/Login.aspx)
echo 2. Open Chrome DevTools (F12)
echo 3. Go to Console tab
echo 4. Paste the debug commands (Ctrl+V)
echo 5. Run: propaceDebug.runFullDiagnostic()
echo.
echo Expected results:
echo - Content Script: Should be ✅
echo - Chrome APIs: Should be ✅  
echo - Form Fields: Should find several fields
echo - Google Service Block: Should be ✅ ALLOWED (not blocked)
echo.
echo If Google Service shows as BLOCKED:
echo - Run: propaceDebug.fixGoogleDetection()
echo - Then run: propaceDebug.testAutofill()
echo.
echo =====================================
echo Press any key when you're ready to continue...
pause >nul
echo.
echo Opening test page for comparison...
start "" "test-google-services-fix.html"
echo.
echo Now test both pages and compare results!
echo Press any key to close...
pause >nul
