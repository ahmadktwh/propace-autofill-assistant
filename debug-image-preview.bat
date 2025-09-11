@echo off
cls
echo ============================================
echo   IMAGE PREVIEW DEBUG HELPER
echo ============================================
echo.
echo This guide will help you debug the image preview issue:
echo.
echo STEP 1: Open Chrome Developer Tools
echo   - Right-click on your extension popup
echo   - Select "Inspect"
echo   - Go to the "Console" tab
echo.
echo STEP 2: Try uploading an image
echo   - Upload an image via drag-drop or click
echo   - Watch the console for debug messages
echo.
echo STEP 3: Check for these console messages:
echo   ✓ "File input changed [FileList]"
echo   ✓ "handleFiles: Called with fileList"
echo   ✓ "handleFiles: Filtered image files: 1"
echo   ✓ "showImagePreview: Starting preview for: [filename]"
echo   ✓ "showImagePreview: All DOM elements found successfully"
echo   ✓ "showImagePreview: Created object URL: blob:..."
echo   ✓ "showImagePreview: Image loaded successfully!"
echo.
echo STEP 4: Check for these elements in the DOM (Elements tab):
echo   - #upload-placeholder should have hidden="true"
echo   - #image-preview-area should NOT have hidden attribute
echo   - #preview-image should have a src="blob:..." attribute
echo   - .upload-area should have class "has-image"
echo.
echo STEP 5: If you see any errors, note them down and share
echo.
echo Press any key to continue...
pause > nul

echo.
echo ============================================
echo   MANUAL DOM INSPECTION COMMANDS
echo ============================================
echo.
echo Copy and paste these commands in the Console:
echo.
echo // Check if elements exist
echo console.log('Upload Area:', document.getElementById('upload-area'));
echo console.log('Preview Area:', document.getElementById('image-preview-area'));
echo console.log('Preview Image:', document.getElementById('preview-image'));
echo console.log('Upload Placeholder:', document.getElementById('upload-placeholder'));
echo.
echo // Check element visibility
echo console.log('Preview Area Hidden:', document.getElementById('image-preview-area').hidden);
echo console.log('Preview Area Style:', document.getElementById('image-preview-area').style.cssText);
echo console.log('Upload Area Classes:', document.getElementById('upload-area').className);
echo.
echo // Force show preview area (test command)
echo document.getElementById('image-preview-area').hidden = false;
echo document.getElementById('image-preview-area').style.display = 'flex';
echo document.getElementById('upload-placeholder').hidden = true;
echo.
echo Press any key to exit...
pause > nul
