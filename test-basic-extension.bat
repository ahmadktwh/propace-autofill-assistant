@echo off
echo ===============================================
echo  Testing Basic Propace Autofill Extension
===============================================
echo.
echo This will open the test form to verify basic functionality
echo.
echo What to test:
echo 1. Open the extension popup
echo 2. Upload a document image
echo 3. Extract data
echo 4. Click Autofill Form button
echo 5. Check if form fields are filled
echo.
echo Opening test form...
start chrome-extension://your-extension-id/test-form.html
echo.
echo Note: Replace 'your-extension-id' with your actual extension ID
echo You can find it at chrome://extensions/
echo.
pause
