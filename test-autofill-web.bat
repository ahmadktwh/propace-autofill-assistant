@echo off
title Propace Autofill Test - ULTRA-INTELLIGENT Field Detection System
color 0A

echo ===============================================
echo    PROPACE ULTRA-INTELLIGENT AUTOFILL
echo ===============================================
echo.
echo Testing ULTRA-BROAD field detection system...
echo.

echo Step 1: Opening sample test page...
start "" "%~dp0sample-autofill-test.html"

echo.
echo Step 2: Waiting for page to load...
timeout /t 3 >nul

echo.
echo ===============================================
echo          ULTRA-ENHANCED FEATURES
echo ===============================================
echo.
echo ✅ 300+ field patterns (vs 50 before)
echo ✅ 5-level intelligent matching system
echo ✅ International language support
echo ✅ Semantic word matching
echo ✅ Context-aware detection
echo ✅ Works on ANY website globally
echo.
echo Field Detection Examples:
echo → "Given name" / "Sur name" → Fills Name
echo → "Which country do you live" → Fills Nationality  
echo → "Your country" / "Nationality" → Fills Country
echo → "First name" / "Second name" → Fills Name
echo → "Contact" / "Mobile" / "Tel" → Fills Phone
echo.
echo ===============================================
echo              TESTING INSTRUCTIONS
echo ===============================================
echo.
echo 1. Sample form opened in browser
echo 2. Open Propace extension
echo 3. Extract data from ID card/passport
echo 4. Go to sample form OR any website
echo 5. Click "Autofill" button
echo 6. Watch INTELLIGENT field detection work!
echo.
echo ===============================================
echo               DEBUG TOOLS
echo ===============================================
echo.
echo Open Browser Console (F12) and run:
echo → debugPropaceFields()    (analyze page fields)
echo → testPropaceAutofill()   (test with sample data)
echo.
echo This will show you exactly which fields
echo the system detects and how it matches them!
echo.
echo ===============================================
echo               ADVANCED MATCHING
echo ===============================================
echo.
echo Level 1: Exact matches (name = name)
echo Level 2: Prefix/Suffix (firstname = first_name)
echo Level 3: Contains (fullname contains name)
echo Level 4: Semantic words (given matches name)
echo Level 5: Special patterns (contextual matching)
echo.
echo ===============================================
echo               GLOBAL SUPPORT
echo ===============================================
echo.
echo Now works with international forms:
echo ✓ Registration forms (any country)
echo ✓ Visa applications
echo ✓ Job applications  
echo ✓ Banking forms
echo ✓ Government portals
echo ✓ University applications
echo ✓ Insurance forms
echo ✓ ANY form with personal data!
echo.

echo Press any key to close this window...
pause >nul
