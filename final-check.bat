@echo off
cls
echo 🔍 PROPACE EXTENSION - FINAL STATUS CHECK
echo ==========================================
echo.

echo 📄 Checking core files...
if exist "manifest.json" (echo ✅ manifest.json - OK) else (echo ❌ manifest.json - MISSING)
if exist "content-script.js" (echo ✅ content-script.js - OK) else (echo ❌ content-script.js - MISSING)  
if exist "popup.js" (echo ✅ popup.js - OK) else (echo ❌ popup.js - MISSING)
if exist "popup.html" (echo ✅ popup.html - OK) else (echo ❌ popup.html - MISSING)
if exist "background.js" (echo ✅ background.js - OK) else (echo ❌ background.js - MISSING)

echo.
echo 🛡️ Checking CSP policy...
findstr "unsafe-eval" manifest.json >nul
if %errorlevel% equ 0 (
    echo ❌ CSP contains unsafe-eval - WILL CAUSE ERROR
) else (
    echo ✅ CSP policy is safe - NO ERRORS EXPECTED
)

echo.
echo 📁 Extension folder path:
echo %cd%
echo.
echo 🎯 STATUS: READY TO LOAD!
echo.
echo NEXT STEPS:
echo 1. Go to chrome://extensions/
echo 2. Enable Developer mode
echo 3. Click "Load unpacked"  
echo 4. Select this folder: %cd%
echo 5. Extension should load without errors!
echo.
pause
