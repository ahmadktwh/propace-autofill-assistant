@echo off
echo ======================================================
echo    MANIFEST FIXED - File Protocol Support Added
echo ======================================================
echo.
echo ✅ Fixed Issues:
echo    1. Added "file:///*" to host_permissions
echo    2. Added "file:///*" to content_scripts matches  
echo    3. Added "file:///*" to web_accessible_resources matches
echo.
echo 🔧 Changes Made:
echo    • Extension can now access file:// URLs
echo    • Content script will load on local HTML files
echo    • No more "Extension manifest must request permission" error
echo.
echo NOW FOLLOW THESE STEPS:
echo ========================
echo.
echo 1. RELOAD EXTENSION:
echo    - Go to chrome://extensions/
echo    - Find "Propace Autofill Assistant"
echo    - Click the RELOAD button (refresh icon)
echo    - Make sure it loads without errors
echo.
pause
echo.
echo 2. ENABLE FILE ACCESS (IMPORTANT):
echo    - In chrome://extensions/
echo    - Find your extension
echo    - Click "Details" button
echo    - Scroll down to "Allow access to file URLs" 
echo    - TURN ON this toggle switch ⚠️ IMPORTANT!
echo.
pause  
echo.
echo 3. TEST THE FORM:
echo    - The test form should now work properly
echo    - Content script will load automatically
echo    - Autofill should work without permission errors
echo.
echo Opening test form now...
start "" "test-form.html"
echo.
echo ✅ If you still see permission errors:
echo    - Make sure "Allow access to file URLs" is enabled
echo    - Reload the extension again
echo    - Refresh the test form page
echo.
pause
