@echo off
cls
echo ======================================================
echo   Propace Autofill Assistant - Extension Loader
echo ======================================================
echo.
echo STATUS: ✅ CSP Error Fixed - Ready for Loading
echo.

:: Get the current directory
set "EXTENSION_PATH=%~dp0"

:: Remove trailing backslash
set "EXTENSION_PATH=%EXTENSION_PATH:~0,-1%"

REM Check if files exist
if not exist "%EXTENSION_PATH%\manifest.json" (
    echo ❌ ERROR: manifest.json not found!
    pause
    exit /b 1
)

if not exist "%EXTENSION_PATH%\content-script.js" (
    echo ❌ ERROR: content-script.js not found!
    pause
    exit /b 1
)

echo ✅ All core files present
echo.
echo Extension folder: %EXTENSION_PATH%
echo.
echo CHOOSE LOADING METHOD:
echo ======================
echo [1] Automatic Loading (may not work due to Chrome restrictions)
echo [2] Manual Loading (recommended)
echo.
set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" goto auto_load
if "%choice%"=="2" goto manual_load

:auto_load
echo.
echo Attempting automatic loading...
echo Press any key to launch Chrome with extension...
pause > nul

start chrome --load-extension="%EXTENSION_PATH%" --user-data-dir="%TEMP%\PropaceExtensionTest" "about:blank"

echo.
echo ✅ Chrome launched with extension attempt
echo.
echo If extension didn't load, use manual method:
echo 1. Go to chrome://extensions/
echo 2. Enable Developer mode
echo 3. Click "Load unpacked"
echo 4. Select folder: %EXTENSION_PATH%
echo.
goto end

:manual_load
echo.
echo Opening Chrome extensions page for manual loading...
echo.
echo MANUAL STEPS:
echo 1. Enable "Developer mode" (top-right toggle)
echo 2. Click "Load unpacked" button  
echo 3. Navigate to and select: %EXTENSION_PATH%
echo 4. Extension should load without CSP errors
echo.
pause

start chrome://extensions/

echo.
echo ✅ Chrome extensions page opened
echo 📁 Select this folder: %EXTENSION_PATH%
echo.

:end
echo After loading successfully:
echo - Test on any webpage with forms
echo - Click extension icon to use autofill
echo - Check console for detailed logs
echo.
pause
