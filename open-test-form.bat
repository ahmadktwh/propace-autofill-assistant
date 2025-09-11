@echo off
echo ======================================================
echo    Open Test Form as Regular Webpage  
echo ======================================================
echo.
echo ✅ Benefits of Regular Webpage Mode:
echo    • Opens with file:// protocol - no extension issues
echo    • Content script loads automatically 
echo    • Better debugging experience
echo    • No manifest permission problems
echo.
echo Opening test form as regular webpage...
echo.

start "" "test-form.html"

echo.
echo 🎯 Test form opened successfully!
echo.
echo Now you can:
echo 1. Use your extension popup to upload an image
echo 2. Extract data from the image  
echo 3. Click "Autofill" button
echo 4. Watch the form get filled automatically
echo.
echo 🔍 For debugging:
echo - Press F12 to open DevTools
echo - Check Console for extension messages
echo - Monitor Network tab for any issues
echo.
echo URL will be: file:///[your-folder]/test-form.html
echo.
pause
