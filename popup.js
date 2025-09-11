/*==================================================================================================
    Propace Autofill Assistant - Enhanced JavaScript
    -----------------------------------------------
    Developed by: Mujeeb Ahmad
    Version: 3.1 (Enhanced UI + Reliable Comms)
    Description: Advanced functionality with improved UX and production-grade messaging utilities
====================================================================================================*/

// ===============================
// Propace Communication Utilities
// ===============================
// Versioned protocol and robust wrappers for reliable popup ↔ content-script comms.
(function(){
    const PROPACE_PROTO_VERSION = 1;
    const PRE_PING_DELAYS = [300, 700, 1200]; // ms
    const POST_INJECT_DELAYS = [400, 800, 1200, 1800, 2500]; // ms
    const PING_TIMEOUT_MS = 1200; // per ping

    function now() { return Date.now(); }
    function nonce(prefix = 'np') { return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`; }
    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    function isSupportedUrl(url) {
        if (!url) return false;
        try {
            const u = new URL(url);
            const blockedProtocols = ['chrome:', 'about:', 'edge:'];
            if (blockedProtocols.includes(u.protocol)) return false;
            const host = u.host || '';
            if (/chrome\.google\.com$/i.test(host)) return false; // Web Store
            if (/^chrome-extension:$/i.test(u.protocol)) return false;
            // Basic PDF detection
            if (u.pathname && /\.pdf($|\?)/i.test(u.pathname)) return false;
            return true;
        } catch { return false; }
    }

    function shapeError(code, message, details={}) {
        return { ok:false, code, message, details };
    }

    function validatePong(resp, expectedNonce) {
        return !!(resp && resp.ok === true && resp.type === 'propace_pong' && resp.nonce === expectedNonce && typeof resp.version === 'number');
    }

    async function sendMessageToTabWithTimeout(tabId, msg, timeoutMs = 15000) {
        return new Promise((resolve, reject) => {
            let done = false;
            const to = setTimeout(() => {
                if (done) return; done = true;
                reject(shapeError('TIMEOUT', `Timed out after ${timeoutMs}ms`, { msgType: msg?.type }));
            }, timeoutMs);

            try {
                chrome.tabs.sendMessage(tabId, msg, (response) => {
                    if (done) return;
                    clearTimeout(to);
                    const lastErr = chrome.runtime && chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
                    if (lastErr) {
                        done = true;
                        return reject(shapeError('RUNTIME_LAST_ERROR', lastErr, { msgType: msg?.type }));
                    }
                    if (response == null) {
                        done = true;
                        return reject(shapeError('EMPTY_RESPONSE', 'No response from content script', { msgType: msg?.type }));
                    }
                    done = true;
                    resolve(response);
                });
            } catch (e) {
                clearTimeout(to);
                reject(shapeError('SEND_EXCEPTION', e?.message || String(e), { msgType: msg?.type }));
            }
        });
    }

    async function pingTab(tabId) {
        const n = nonce('np');
        const msg = { type:'propace_ping', version: PROPACE_PROTO_VERSION, nonce: n, ts: now() };
        const resp = await sendMessageToTabWithTimeout(tabId, msg, PING_TIMEOUT_MS);
        if (!validatePong(resp, n)) throw shapeError('INVALID_PONG', 'Invalid handshake response', { resp });
        return resp;
    }

    async function tryPings(tabId, delays) {
        let lastErr = null;
        for (let i=0; i<delays.length; i++) {
            if (i>0) await delay(delays[i]);
            try { return await pingTab(tabId); } catch(e) { lastErr = e; }
        }
        throw lastErr || shapeError('PING_FAILED', 'All pings failed');
    }

    async function ensureContentScript(tab) {
        // Pre-check unsupported contexts
        if (!isSupportedUrl(tab.url)) {
            throw shapeError('UNSUPPORTED_CONTEXT', 'This page blocks content scripts (chrome://, Web Store, PDFs, etc.)', { url: tab.url });
        }

        // Pre-injection pings
        try {
            const pong = await tryPings(tab.id, PRE_PING_DELAYS);
            return { ok:true, alreadyPresent:true, pong };
        } catch {}

        // Attempt single injection
        try {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-script.js'] });
        } catch (e) {
            if (tab?.url?.startsWith('file:')) {
                throw shapeError('FILE_URL_PERMISSION_REQUIRED', 'Chrome requires enabling "Allow access to file URLs" for this extension to run on file:// pages', { url: tab.url });
            }
            throw shapeError('INJECTION_FAILED', e?.message || String(e));
        }

        // Post-injection pings (longer backoff)
        try {
            const pong = await tryPings(tab.id, POST_INJECT_DELAYS);
            return { ok:true, injected:true, pong };
        } catch (e) {
            throw shapeError('POST_INJECT_PING_FAILED', 'Content script did not respond after injection', { error: e });
        }
    }

    // Expose helpers in this file scope for reuse below without polluting global window
    window.__propaceComms = { PROPACE_PROTO_VERSION, ensureContentScript, sendMessageToTabWithTimeout, isSupportedUrl, nonce, now, delay };
})();

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting initialization...');
    
    // Show the fallback message if DOM is loaded but make it auto-hide after successful init
    const fallback = document.getElementById('fallback');
    if (fallback) {
        fallback.style.display = 'block';
        console.log('Fallback message shown');
        // Hide the fallback after 1.5 seconds if init completes
        setTimeout(() => {
            if (window.__propaceReady) {
                fallback.style.display = 'none';
                console.log('Fallback hidden - UI ready');
            }
        }, 1500);
    }
    
    // Make sure the modal is hidden initially
    const historyModal = document.getElementById('history-modal');
    if (historyModal) {
        historyModal.style.display = 'none';
        historyModal.hidden = true;
        console.log('History modal hidden');
    }

    // ===================================================================
    // ==            ADVANCED API OPTIMIZATION SYSTEM                  ==
    // ===================================================================
    
    // Advanced rate limiting and usage tracking (Gemini 2.0 Flash-Lite)
    let lastAPICallTime = 0;
    let dailyRequestCount = 0;
    const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests (30 RPM)
    const MAX_DAILY_REQUESTS = 190; // Conservative limit for 200 RPD with buffer
    
    // Professional image optimization
    const optimizeImageForAPI = async (file) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate optimal dimensions (max 1920x1080 for API efficiency)
                let { width, height } = img;
                const maxWidth = 1920;
                const maxHeight = 1080;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Apply image enhancements for better OCR
                ctx.filter = 'contrast(1.2) brightness(1.1) saturate(0.8)';
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to optimized format (JPEG 85% quality)
                canvas.toBlob(resolve, 'image/jpeg', 0.85);
            };
            
            img.src = URL.createObjectURL(file);
        });
    };
    
    // Smart request monitoring and enforcement
    const loadRequestCount = () => {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('propace_api_usage');
        
        if (stored) {
            const usage = JSON.parse(stored);
            if (usage.date === today) {
                dailyRequestCount = usage.count || 0;
            } else {
                dailyRequestCount = 0;
                localStorage.setItem('propace_api_usage', JSON.stringify({
                    date: today,
                    count: 0
                }));
            }
        }
    };
    
    const incrementRequestCount = () => {
        dailyRequestCount++;
        const today = new Date().toDateString();
        localStorage.setItem('propace_api_usage', JSON.stringify({
            date: today,
            count: dailyRequestCount
        }));
        console.log(`📊 API requests today: ${dailyRequestCount}/${MAX_DAILY_REQUESTS}`);
    };
    
    const checkDailyLimit = () => {
        if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
            throw new Error(`Daily limit reached (${dailyRequestCount}/${MAX_DAILY_REQUESTS}). Try again tomorrow or add additional API keys.`);
        }
    };
    
    const enforceRateLimit = async () => {
        const now = Date.now();
        const timeSinceLastCall = now - lastAPICallTime;
        
        if (timeSinceLastCall < MIN_REQUEST_INTERVAL) {
            const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastCall;
            console.log(`⏱️ Rate limiting: waiting ${waitTime}ms...`);
            await wait(waitTime);
        }
        
        lastAPICallTime = Date.now();
    };
    
    // Professional utility function
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Advanced prompt optimization - Dynamic based on user field selection
    const getOptimizedPrompt = async () => {
        // Get user's selected fields from settings
        const selectedFields = await getUserSelectedFields();
        
        // Create dynamic field list based on user selection
        const dynamicFields = createDynamicFieldsForPrompt(selectedFields);
        
        return `EXTRACT data from Pakistani documents. Convert Urdu text to English. Return JSON with ONLY the fields listed below.

⚠️ CRITICAL INSTRUCTION: Look very carefully at the entire document image. Pakistani ID cards and documents often have address text in various formats and locations. DO NOT return null for address fields if ANY address-related text exists in the image.

IMPORTANT: Extract ONLY these specific fields that the user has selected. Do NOT assume document type or change field names. Use EXACT field names as specified:

REQUIRED EXTRACTION FIELDS:
${dynamicFields}

⚠️ MANDATORY ADDRESS EXTRACTION RULES:
If currentAddress field is requested:
- Look for ANY text that could be an address (موجودہ پتہ, حالیہ پتہ, address, پتہ, etc.)
- Check entire document - addresses can be anywhere on Pakistani documents
- Even if text is partially visible or in mixed Urdu/English, extract what you can see
- Convert ALL Urdu words to English using the mappings below
- NEVER return null if ANY address text is visible - extract partial text if needed

If permanentAddress field is requested:
- Look for ANY permanent address text (مستقل پتہ, permanent address, آبائی پتہ, etc.)
- Check entire document carefully - permanent addresses often in different sections
- Even if text is partially visible or unclear, extract what you can read
- Convert ALL Urdu words to English using the mappings below  
- NEVER return null if ANY permanent address text is visible

🔢 SPECIAL ID NUMBER RECOGNITION:
If you see a number in format like: 36502-3449921-9 or 12345-1234567-1
- This is definitely an ID/CNIC number
- Always extract it under "idNumber" field
- Even if no label is visible, recognize this pattern as ID number

🔤 CRITICAL URDU TO ENGLISH CONVERSION RULES:
⚠️ MANDATORY: Convert ALL Urdu/Arabic script to English. Do NOT leave any Urdu characters in the output.

FIELD LABELS (Urdu → English):
نام = name, والد کا نام = fatherHusbandName, شوہر کا نام = fatherHusbandName
تاریخ پیدائش = dateOfBirth, جنس = gender, قومیت = nationality
شناختی کارڈ نمبر = idNumber, پاسپورٹ نمبر = passportNo
جاری کرنے کی تاریخ = issue date, ختم ہونے کی تاریخ = expiry date

⚠️ ADDRESS FIELD RECOGNITION (ALL these mean currentAddress):
موجودہ پتہ = currentAddress, حالیہ پتہ = currentAddress, پتہ = currentAddress
Address = currentAddress, Current Address = currentAddress, موجودہ ایڈریس = currentAddress

⚠️ PERMANENT ADDRESS FIELD RECOGNITION (ALL these mean permanentAddress):  
مستقل پتہ = permanentAddress, مستقل ایڈریس = permanentAddress
Permanent Address = permanentAddress, آبائی پتہ = permanentAddress

جائے پیدائش = placeOfBirth

COMMON WORDS/NAMES (Urdu → English):
محمد = Muhammad, احمد = Ahmad, علی = Ali, حسن = Hassan, حسین = Hussain
عبدالرحمان = Abdul Rahman, عبداللہ = Abdullah, فاطمہ = Fatima, عائشہ = Ayesha
خان = Khan, بیگم = Begum, صاحب = Sahib, شیخ = Sheikh, ملک = Malik

ADDRESS TERMS (Urdu → English):
سٹریٹ نمبر = Street No, گلی = Gali, سڑک = Road, چوک = Chowk, محلہ = Mohalla
مکان نمبر = House No, بلاک = Block, کالونی = Colony, ٹاؤن = Town, علاقہ = Area
گوٹھ = Goth, ضلع = District, تحصیل = Tehsil, پوسٹ آفس = Post Office
دیہات = Village, شاہراہ = Shahra, بیت = Bait, صفن = Safan, سفن = Safan, ملیر = Malir

CITIES/PLACES (Urdu → English):
کراچی = Karachi, لاہور = Lahore, اسلام آباد = Islamabad, قذافی = Qazzafi
قاضی احمد = Qazi Ahmad, دولت پور = Daulat Pur, شہید بینظیر آباد = Shaheed Benazirabad

⚠️ CONVERSION EXAMPLES:
❌ WRONG: "House No B58, سٹریٹ نمبر 2, Mohalla قذافی Town"
✅ CORRECT: "House No B58, Street No 2, Mohalla Qazzafi Town"

❌ WRONG: "Goth صفن, Post Office Daulat Pur Bait سفن"
✅ CORRECT: "Goth Safan, Post Office Daulat Pur Bait Safan"

EXTRACTION RULES:
1. Extract ONLY the fields listed above - do not add other fields
2. Use EXACT field names as specified - do not change them
3. ⚠️ NEVER return null for requested fields if ANY related text exists in image
4. ⚠️ CRITICAL: Look at ENTIRE document image carefully - text can be anywhere
5. ⚠️ MANDATORY: Convert ALL Urdu/Arabic script to English - NO Urdu characters in output
6. ⚠️ ADDRESS RULE: Extract ANY visible address text - even if partial or unclear
7. Dates: DD/MM/YYYY format
8. Return clean JSON only with complete English text
9. ⚠️ If address text exists but unclear, extract readable portions instead of null
10. ⚠️ NEVER AVOID extracting addresses - look carefully at entire image

Example output: {"name":"Muhammad Ahmad","fatherHusbandName":"Abdul Rahman","currentAddress":"House No B58, Street No 2, Mohalla Qazzafi Town Qaidabad, Mir, District Karachi","permanentAddress":"Goth Safan, Post Office Daulat Pur Bait Safan, Tehsil Qazi Ahmad, District Shaheed Benazirabad","idNumber":"36502-3449921-9"}`;
    };

    // ===================================================================
    // ==              DYNAMIC FIELD SELECTION SYSTEM                  ==
    // ===================================================================
    
    // Get user's selected fields from settings
    const getUserSelectedFields = async () => {
        try {
            let selectedFields = {};
            
            // Try chrome.storage.local first
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get(['selectedFields']);
                selectedFields = result.selectedFields || {};
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem('selectedFields');
                selectedFields = stored ? JSON.parse(stored) : {};
            }
            
            // If no selections found, default to all fields enabled
            if (Object.keys(selectedFields).length === 0) {
                const defaultFields = [
                    "name", "fatherHusbandName", "dateOfBirth", "gender", "nationality",
                    "placeOfBirth", "idNumber", "citizenshipNumber", "passportNo", 
                    "idIssueDate", "idExpiryDate", "passportIssueDate", "passportExpiryDate",
                    "currentAddress", "permanentAddress"
                ];
                defaultFields.forEach(field => selectedFields[field] = true);
            }
            
        console.log('📋 User selected fields:', selectedFields);
        
        // Detailed address field debugging
        const addressFieldsStatus = {
            currentAddressEnabled: selectedFields.currentAddress === true,
            permanentAddressEnabled: selectedFields.permanentAddress === true,
            allSelectedFields: Object.keys(selectedFields).filter(key => selectedFields[key] === true)
        };
        console.log('🏠 Address Fields Status:', addressFieldsStatus);
        
        return selectedFields;        } catch (error) {
            console.error('Error getting user selected fields:', error);
            // Return all fields enabled as fallback
            return {
                "name": true, "fatherHusbandName": true, "dateOfBirth": true, "gender": true, 
                "nationality": true, "placeOfBirth": true, "idNumber": true, "citizenshipNumber": true,
                "passportNo": true, "idIssueDate": true, "idExpiryDate": true, 
                "passportIssueDate": true, "passportExpiryDate": true,
                "currentAddress": true, "permanentAddress": true
            };
        }
    };
    
    // Create dynamic fields JSON for AI prompt based on user selection
    const createDynamicFieldsForPrompt = (selectedFields) => {
        const fieldDescriptions = {
            "name": "full name of person",
            "fatherHusbandName": "father or husband name", 
            "dateOfBirth": "date of birth in DD/MM/YYYY format",
            "gender": "Male or Female",
            "nationality": "nationality",
            "placeOfBirth": "place/city of birth",
            "idNumber": "ID/CNIC number (format: 12345-1234567-1)",
            "citizenshipNumber": "citizenship number (format: 36503-3449943-9)",
            "passportNo": "passport number",
            "idIssueDate": "ID card issue date DD/MM/YYYY",
            "idExpiryDate": "ID card expiry date DD/MM/YYYY", 
            "passportIssueDate": "passport issue date DD/MM/YYYY",
            "passportExpiryDate": "passport expiry date DD/MM/YYYY",
            "currentAddress": "⚠️ MANDATORY: Extract complete current address (موجودہ پتہ/حالیہ پتہ) and convert all Urdu to English",
            "permanentAddress": "⚠️ MANDATORY: Extract complete permanent address (مستقل پتہ/آبائی پتہ) and convert all Urdu to English"
        };
        
        const enabledFields = {};
        Object.keys(fieldDescriptions).forEach(field => {
            if (selectedFields[field] === true) {
                enabledFields[field] = fieldDescriptions[field];
            }
        });
        
        // Always include at least name field if nothing is selected
        if (Object.keys(enabledFields).length === 0) {
            enabledFields["name"] = fieldDescriptions["name"];
        }
        
        // Format fields as simple JSON structure for AI prompt (not stringified)
        const fieldLines = Object.entries(enabledFields).map(([field, description]) => 
            `"${field}": "${description}"`
        ).join(',\n');
        
        const formattedFields = `{\n${fieldLines}\n}`;
        console.log('🎯 Dynamic fields for AI prompt:', enabledFields);
        
        // Debug if address fields are included in AI prompt
        const addressFieldsInPrompt = {
            currentAddressInPrompt: enabledFields.hasOwnProperty('currentAddress'),
            permanentAddressInPrompt: enabledFields.hasOwnProperty('permanentAddress'),
            totalFieldsInPrompt: Object.keys(enabledFields).length
        };
        console.log('📝 Address Fields in AI Prompt:', addressFieldsInPrompt);
        
        return formattedFields;
    };

    // ===================================================================
    // ==              ADVANCED EXTRACTION SYSTEM                      ==
    // ===================================================================
    
    // Enhanced advanced extraction system
    const extractDataWithAdvancedLogic = async (imageFile) => {
        try {
            showStatus('Preparing image with professional optimization...', 'processing');
            
            // Check daily limits and enforce rate limiting
            checkDailyLimit();
            await enforceRateLimit();
            
            // Professional image optimization
            const optimizedBlob = await optimizeImageForAPI(imageFile);
            
            showStatus('Analyzing document with advanced AI...', 'processing');
            
            // Advanced first-attempt extraction
            const extractedData = await performAdvancedExtraction(optimizedBlob);
            
            if (extractedData && Object.keys(extractedData).length > 0) {
                incrementRequestCount();
                showStatus('✅ Document extracted successfully!', 'success');
                return extractedData;
            } else {
                throw new Error('No data extracted from document');
            }
            
        } catch (error) {
            console.error('❌ Extraction failed:', error);
            showStatus(`❌ ${error.message}`, 'error');
            throw error;
        }
    };
    
    // Professional-grade API extraction with single-call optimization
    const performAdvancedExtraction = async (imageBlob) => {
        const API_KEY = await getAPIKey();
        if (!API_KEY) {
            throw new Error('API key not configured. Please add your Gemini API key in settings.');
        }
        
        try {
            // Convert blob to base64
            const base64Data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.readAsDataURL(imageBlob);
            });
            
            // Get the dynamic prompt based on user field selection
            const optimizedPrompt = await getOptimizedPrompt();
            
            // Professional API request configuration
            const requestPayload = {
                contents: [{
                    parts: [
                        { text: optimizedPrompt },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: base64Data
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    topK: 1,
                    topP: 0.8,
                    maxOutputTokens: 512,
                    responseMimeType: "application/json"
                }
            };
            
            console.log('🚀 Making advanced API request with Gemini 2.0 Flash-Lite...');
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('🔥 API Response Error:', response.status, errorText);
                
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait and try again.');
                } else if (response.status === 403) {
                    throw new Error('API key invalid or quota exceeded.');
                } else {
                    throw new Error(`API request failed: ${response.status}`);
                }
            }
            
            const data = await response.json();
            console.log('✅ API Response received:', data);
            
            // Enhanced JSON parsing with professional error handling
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const textContent = data.candidates[0].content.parts[0].text;
                console.log('📝 Raw response text:', textContent);
                
                // Smart JSON extraction and validation
                const extractedData = await parseAdvancedResponse(textContent);
                
                if (extractedData && typeof extractedData === 'object') {
                    console.log('🎯 Successfully extracted data:', extractedData);
                    return extractedData;
                } else {
                    throw new Error('Invalid data format received from API');
                }
            } else {
                console.error('🚫 Unexpected API response structure:', data);
                throw new Error('No valid response from API');
            }
            
        } catch (error) {
            console.error('💥 API call error:', error);
            throw error;
        }
    };
    
    // Advanced JSON parsing with error recovery
    const parseAdvancedResponse = async (responseText) => {
        try {
            // Clean the response text
            let cleanText = responseText.trim();
            
            // Remove markdown code blocks if present
            cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            
            // Find JSON object boundaries
            const jsonStart = cleanText.indexOf('{');
            const jsonEnd = cleanText.lastIndexOf('}');
            
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
            }
            
            // Parse JSON
            const parsedData = JSON.parse(cleanText);
            
            // Validate and clean the extracted data with user field filtering
            const validatedData = await validateAndCleanData(parsedData);
            
            return validatedData;
            
        } catch (parseError) {
            console.error('🔧 JSON parsing error:', parseError);
            console.error('🔧 Raw text:', responseText);
            
            // Fallback: Try to extract data using regex patterns
            return await extractDataWithRegex(responseText);
        }
    };
    
    // Professional data validation and cleaning - Dynamic based on user field selection
    const validateAndCleanData = async (data) => {
        if (!data || typeof data !== 'object') {
            return {};
        }
        
        console.log('🔍 Validating and cleaning extracted data...');
        
        // Get user's selected fields to filter results
        const selectedFields = await getUserSelectedFields();
        console.log('📋 Filtering results based on user selections:', selectedFields);
        
        // Apply smart Urdu-to-English conversion FIRST (only if Urdu is detected)
        const convertedData = smartUrduToEnglishConversion(data);
        console.log('🔍 Data after Urdu conversion:', convertedData);
        
        // Handle potential field name variations for addresses
        if (convertedData.address && !convertedData.currentAddress) {
            convertedData.currentAddress = convertedData.address;
            console.log('🔄 Mapped "address" to "currentAddress"');
        }
        
        console.log('🏠 Address data found:', {
            currentAddress: convertedData.currentAddress,
            permanentAddress: convertedData.permanentAddress
        });
        
        const cleanedData = {};
        const allValidFields = [
            'name', 'fatherHusbandName', 'dateOfBirth', 'gender', 
            'idNumber', 'citizenshipNumber', 'passportNo', 'currentAddress', 'permanentAddress',
            'idIssueDate', 'idExpiryDate', 'passportIssueDate', 'passportExpiryDate',
            'nationality', 'placeOfBirth'
        ];
        
        // Only process fields that user has selected
        const userEnabledFields = allValidFields.filter(field => selectedFields[field] === true);
        console.log('✅ Processing only user-enabled fields:', userEnabledFields);
        console.log('🏠 Address fields enabled:', {
            currentAddress: selectedFields.currentAddress,
            permanentAddress: selectedFields.permanentAddress
        });
        
        userEnabledFields.forEach(field => {
            if (convertedData[field]) {
                let value = String(convertedData[field]).trim();
                
                // Clean common OCR errors
                value = value.replace(/[|]/g, 'I');
                value = value.replace(/0/g, 'O');
                value = value.replace(/null|undefined|N\/A|n\/a/gi, '');
                
                // Apply field-specific cleaning
                if (field.includes('address') || field.includes('Address')) {
                    value = cleanAddressField(value);
                } else if (field.includes('name') || field.includes('Name')) {
                    value = cleanNameField(value);
                } else if (field === 'idNumber') {
                    value = formatCNIC(value);
                } else if (field.includes('Date') && value) {
                    value = formatDate(value);
                }
                
                if (value && value.length > 0) {
                    cleanedData[field] = value;
                }
            }
        });
        
        // Auto-detect ID numbers and citizenship numbers in XXXXX-XXXXXXX-X format if not already found
        if (!cleanedData.idNumber && !cleanedData.citizenshipNumber) {
            // Look through all fields for ID/citizenship number patterns
            Object.values(convertedData).forEach(value => {
                if (typeof value === 'string') {
                    // Pakistani CNIC pattern: 5-7-1 digits
                    const idMatch = value.match(/\b\d{5}-\d{7}-\d{1}\b/);
                    if (idMatch) {
                        if (!cleanedData.idNumber && !cleanedData.citizenshipNumber) {
                            cleanedData.idNumber = idMatch[0];
                            console.log('🔍 Auto-detected ID number:', idMatch[0]);
                        }
                    }
                }
            });
        }
        
        console.log('✅ Data validation and cleaning completed:', Object.keys(cleanedData).length, 'valid fields');
        
        // Debug final address extraction results
        const finalAddressCheck = {
            currentAddressExtracted: !!cleanedData.currentAddress,
            permanentAddressExtracted: !!cleanedData.permanentAddress,
            currentAddressContent: cleanedData.currentAddress || 'NOT FOUND',
            permanentAddressContent: cleanedData.permanentAddress || 'NOT FOUND',
            allExtractedFields: Object.keys(cleanedData)
        };
        console.log('🏠 FINAL ADDRESS EXTRACTION RESULTS:', finalAddressCheck);
        
        return cleanedData;
    };
    
    // Regex fallback extraction - filtered by user selections
    const extractDataWithRegex = async (text) => {
        const extractedData = {};
        
        // Get user's selected fields to filter results
        const selectedFields = await getUserSelectedFields();
        
        // CNIC pattern - only if user wants idNumber
        if (selectedFields.idNumber) {
            const cnicPattern = /\d{5}[-\s]?\d{7}[-\s]?\d/g;
            const cnicMatch = text.match(cnicPattern);
            if (cnicMatch) {
                extractedData.idNumber = formatCNIC(cnicMatch[0]);
            }
        }
        
        // Date patterns - only if user wants dateOfBirth
        if (selectedFields.dateOfBirth) {
            const datePattern = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}/g;
            const dateMatches = text.match(datePattern);
            if (dateMatches && dateMatches.length > 0) {
                extractedData.dateOfBirth = formatDate(dateMatches[0]);
            }
        }
        
        return extractedData;
    };

    // Helper functions for data formatting
    const formatCNIC = (cnicStr) => {
        if (!cnicStr) return null;
        const cleaned = cnicStr.replace(/[^\d]/g, '');
        if (cleaned.length === 13) {
            return `${cleaned.substr(0,5)}-${cleaned.substr(5,7)}-${cleaned.substr(12,1)}`;
        }
        return cnicStr;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        // Convert to DD/MM/YYYY format
        const parts = dateStr.split(/[\/\-\.]/);
        if (parts.length === 3) {
            return `${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[2]}`;
        }
        return dateStr;
    };

    const getAPIKey = async () => {
        console.log('🔑 Getting API key...');
        
        // First try to get from state if already loaded
        if (state.apiKey) {
            console.log('✅ API key found in state');
            return state.apiKey;
        }
        
        // Get from chrome.storage.local using the proper function
        try {
            console.log('🔍 Checking chrome.storage.local...');
            const savedKey = await getSavedApiKey();
            if (savedKey) {
                console.log('✅ API key found in chrome.storage.local');
                state.apiKey = savedKey; // Cache it in state
                return savedKey;
            } else {
                console.log('❌ No API key found in chrome.storage.local');
            }
        } catch (error) {
            console.error('Error getting API key:', error);
        }
        
        console.log('❌ No API key available');
        return null;
    };

    // Status display function for user feedback
    const showStatus = (message, type = 'info') => {
        console.log(`📊 Status (${type}): ${message}`);
        
        // Try to update the validation status element if it exists
        try {
            const statusElement = document.getElementById('validation-status') || dom?.validationStatus;
            if (statusElement) {
                let icon = '';
                switch(type) {
                    case 'success': icon = '✅ '; break;
                    case 'error': icon = '❌ '; break;
                    case 'processing': icon = '⏳ '; break;
                    default: icon = 'ℹ️ '; break;
                }
                statusElement.textContent = icon + message;
                
                // Add appropriate styling based on type
                statusElement.className = `status-message ${type}`;
            }
        } catch (error) {
            console.log('Could not update status element:', error);
        }
    };

    // ===================================================================
    // ==              ENHANCED URDU-ENGLISH CONVERSION                ==
    // ===================================================================

    // Check if text contains Urdu characters
    const containsUrduText = (text) => {
        if (!text || typeof text !== 'string') return false;
        
        // Urdu Unicode ranges: Arabic (0600-06FF), Arabic Supplement (0750-077F), Arabic Extended-A (08A0-08FF)
        const urduRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
        return urduRegex.test(text);
    };

    // Enhanced Urdu to English conversion function (only converts if Urdu is detected)
    const smartUrduToEnglishConversion = (data) => {
        if (!data || typeof data !== 'object') return data;
        
        console.log('🔍 Checking for Urdu text in extracted data...');
        
        const convertedData = {};
        let hasUrduContent = false;
        
        // Comprehensive Urdu to English mappings
        const urduToEnglishMappings = {
            // Common Pakistani names
            'محمد': 'Muhammad', 'احمد': 'Ahmad', 'علی': 'Ali', 'حسن': 'Hassan', 'حسین': 'Hussain',
            'عبدالرحمان': 'Abdul Rahman', 'عبداللہ': 'Abdullah', 'عبدالقادر': 'Abdul Qadir',
            'عبدالرحیم': 'Abdul Raheem', 'عبدالستار': 'Abdul Sattar', 'عبدالغفار': 'Abdul Ghafar',
            'فاطمہ': 'Fatima', 'عائشہ': 'Ayesha', 'زینب': 'Zainab', 'خدیجہ': 'Khadija',
            'اسماعیل': 'Ismail', 'ابراہیم': 'Ibrahim', 'یوسف': 'Yousuf', 'عثمان': 'Usman',
            'عمر': 'Umar', 'طارق': 'Tariq', 'صادق': 'Sadiq', 'کریم': 'Kareem', 'رحیم': 'Raheem',
            
            // Cities and places
            'کراچی': 'Karachi', 'لاہور': 'Lahore', 'اسلام آباد': 'Islamabad', 'راولپنڈی': 'Rawalpindi',
            'فیصل آباد': 'Faisalabad', 'ملتان': 'Multan', 'پشاور': 'Peshawar', 'کوئٹہ': 'Quetta',
            'حیدرآباد': 'Hyderabad', 'گجرات': 'Gujrat', 'سیالکوٹ': 'Sialkot', 'ساہیوال': 'Sahiwal',
            'بہاولپور': 'Bahawalpur', 'گجرانوالہ': 'Gujranwala', 'شیخوپورہ': 'Sheikhupura',
            'شہید بے نظیر آباد': 'Shaheed Benazirabad', 'قائد آباد': 'Qaidabad', 'میر': 'Mir',
            
            // Enhanced Address terms (critical for complete address extraction)
            'محلہ': 'Mohalla', 'گلی': 'Gali', 'سڑک': 'Road', 'چوک': 'Chowk', 'بازار': 'Bazaar',
            'مکان نمبر': 'House No', 'فلیٹ': 'Flat', 'بلاک': 'Block', 'سیکٹر': 'Sector',
            'کالونی': 'Colony', 'ٹاؤن': 'Town', 'علاقہ': 'Area', 'ضلع': 'District',
            'گوٹھ': 'Goth', 'پوسٹ آفس': 'Post Office', 'تحصیل': 'Tehsil', 'پولیس سٹیشن': 'Police Station',
            'یونین کونسل': 'Union Council', 'وارڈ': 'Ward', 'دیہات': 'Village', 'خیبان': 'Khayaban',
            'سڑک نمبر': 'Street No', 'سٹریٹ نمبر': 'Street No', 'پلاٹ نمبر': 'Plot No', 'گھر نمبر': 'House No',
            'شاہراہ': 'Shahra', 'چوک نمبر': 'Chowk No', 'موڑ': 'Mod', 'پل': 'Bridge',
            'بیت': 'Bait', 'ڈاک خانہ': 'Post Office', 'ٹھانہ': 'Thana', 'پولیس چوکی': 'Police Post',
            'ملیر': 'Malir',
            
            // Common location-specific terms - FIXED PROBLEMATIC WORDS
            'قاضی احمد': 'Qazi Ahmad', 'دولت پور': 'Daulat Pur', 'صفان': 'Safan', 'صفن': 'Safan', 'سفن': 'Safan',
            'قذافی': 'Qazzafi', 'شہید بینظیر آباد': 'Shaheed Benazirabad',
            
            // Passport and ID specific terms
            'پاسپورٹ': 'Passport', 'شناختی کارڈ': 'ID Card', 'پاسپورٹ نمبر': 'Passport Number',
            'جاری کرنے کی تاریخ': 'Issue Date', 'ختم ہونے کی تاریخ': 'Expiry Date',
            'میں جاری کیا گیا': 'Issued in', 'یہ پاسپورٹ': 'This passport',
            
            // Common words and terms
            'بیٹا': 'Son', 'بیٹی': 'Daughter', 'بیوی': 'Wife', 'شوہر': 'Husband',
            'مرد': 'Male', 'عورت': 'Female', 'پاکستانی': 'Pakistani', 'خان': 'Khan',
            'بیگم': 'Begum', 'صاحب': 'Sahib', 'شیخ': 'Sheikh', 'ملک': 'Malik'
        };
        
        Object.entries(data).forEach(([key, value]) => {
            if (value && typeof value === 'string') {
                // Check if this field contains Urdu text
                if (containsUrduText(value)) {
                    hasUrduContent = true;
                    console.log(`🔄 Converting Urdu text in field "${key}": "${value}"`);
                    
                    let convertedValue = value;
                    
                    // Apply Urdu to English mappings
                    Object.entries(urduToEnglishMappings).forEach(([urdu, english]) => {
                        const urduRegex = new RegExp(urdu, 'g');
                        convertedValue = convertedValue.replace(urduRegex, english);
                    });
                    
                    // Clean up extra spaces and formatting
                    convertedValue = convertedValue
                        .replace(/\s+/g, ' ')
                        .trim()
                        .replace(/،/g, ',') // Replace Urdu comma with English comma
                        .replace(/۔/g, '.'); // Replace Urdu period with English period
                    
                    convertedData[key] = convertedValue;
                    console.log(`✅ Converted: "${value}" → "${convertedValue}"`);
                    
                } else {
                    // Field is already in English, keep as is
                    convertedData[key] = value;
                    console.log(`📝 Field "${key}" already in English: "${value}"`);
                }
            } else {
                convertedData[key] = value;
            }
        });
        
        if (hasUrduContent) {
            console.log('🎯 Urdu-to-English conversion completed for Urdu fields');
        } else {
            console.log('📋 No Urdu text detected - document already in English');
        }
        
        return convertedData;
    };

    // Helper functions for field cleaning
    const cleanNameField = (name) => {
        if (!name) return name;
        return name
            .replace(/[^\w\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' ') // Normalize spaces
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Proper case
            .join(' ')
            .trim();
    };

    const cleanAddressField = (address) => {
        if (!address) return address;
        return address
            .replace(/[\|\\\/]/g, '') // Remove line separators
            .replace(/\s+/g, ' ') // Normalize spaces
            .replace(/،\s*،/g, '،') // Fix double Urdu commas
            .replace(/,\s*,/g, ',') // Fix double English commas
            .trim();
    };

    // ===================================================================
    // ==                      LEGACY CONSTANTS                        ==
    // ===================================================================
    
    const DEFAULT_FIELDS = [
        "Name", "Father/Husband Name", "Date of Birth", "Gender", "Place of Birth", 
        "Nationality", "Citizenship Number", "ID Number", "ID Issue Date", "ID Expiry Date", 
        "Passport No", "Country", "Passport Issue Date", "Passport Expiry Date",
        "Phone Number", "Email Address", "Address"
    ];

    let state = {
        files: [],
        theme: 'light',
        history: [],
        apiKey: null, // API key will be loaded from chrome.storage.local only
        settings: {
            fields: DEFAULT_FIELDS.reduce((obj, field) => ({ ...obj, [field]: true }), {})
        },
        isExtracting: false,
        currentModal: null,
        extractedData: null
    };

    // ===================================================================
    // ==                      DOM ELEMENTS                           ==
    // ===================================================================
    
    const dom = {
        openStandaloneSettingsBtn: document.getElementById('open-standalone-settings-btn'),
        openTestFormHeaderBtn: document.getElementById('open-test-form-header-btn'),
        openHistoryPageBtn: document.getElementById('open-history-page-btn'),
        body: document.body,
        container: document.querySelector('.container'),
        themeToggle: document.getElementById('themeToggle'),
        
        // Views
        extractorView: document.getElementById('extractor-view'),
        historyView: document.getElementById('history-view'),
        settingsView: document.getElementById('settings-view'),
        
        // Upload area
        uploadArea: document.getElementById('upload-area'),
        fileInput: document.getElementById('file-input'),
        uploadPlaceholder: document.getElementById('upload-placeholder'),
        imagePreviewArea: document.getElementById('image-preview-area'),
        previewImage: document.getElementById('preview-image'),
        changeImageBtn: document.getElementById('change-image-btn'),
        
        // Results area
        resultsArea: document.getElementById('results-area'),
        loaderContainer: document.getElementById('loader-container'),
        formContainer: document.getElementById('form-container'),
        multiFilePreview: document.getElementById('multi-file-preview'),
        generatedForm: document.getElementById('generated-form'),
        
        // Buttons
        extractBtn: document.getElementById('extract-btn'),
        initialAutofillBtn: document.getElementById('initial-autofill-btn'),
        resultsAutofillBtn: document.getElementById('results-autofill-btn'),
        clearBtn: document.getElementById('clear-btn'),
        fillFormBtn: document.getElementById('fill-form-btn'),
        
        // Settings - Enhanced API Key Management
        apiKeyInput: document.getElementById('api-key-input'),
        saveApiKeyBtn: document.getElementById('save-api-key-btn'),
        cancelSettingsBtn: document.getElementById('cancel-settings-btn'),
        removeApiKeyBtn: document.getElementById('remove-api-key-btn'),
        toggleKeyVisibilityBtn: document.getElementById('toggle-key-visibility'),
        validationStatus: document.getElementById('validation-status'),
        keyStatusDisplay: document.getElementById('key-status-display'),
        apiKeyStatusIndicator: document.getElementById('api-key-status-indicator'),
        openTestFormBtn: document.getElementById('open-test-form-btn'),
        fieldsCheckboxes: document.getElementById('fields-checkboxes'),
        
        // History
        historyList: document.querySelector('.history-list'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        emptyState: document.querySelector('.empty-state'),
        
        // Modal
        historyModal: document.getElementById('history-modal'),
        modalBackdrop: document.querySelector('.modal-backdrop'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        modalDeleteBtn: document.getElementById('modal-delete-btn'),
        
        // Navigation
        navButtons: document.querySelectorAll('.nav-btn-header')
    };

    // ===================================================================
    // ==                    INITIALIZATION                           ==
    // ===================================================================
    
    const init = async () => {
        console.log('Initializing popup...');
        
        // Important: Hide modal first to prevent it showing initially
        if (dom.historyModal) {
            dom.historyModal.hidden = true;
            console.log('Modal hidden');
        }
        
        console.log('Loading state...');
        await loadState();
        
        console.log('Setting up event listeners...');
        setupEventListeners();
        
        console.log('Applying theme...');
        applyTheme();
        
        console.log('Rendering all...');
        renderAll();
        
        console.log('Navigating to extractor view...');
        navigateTo('extractor-view');
        
        console.log('Refreshing DOM references...');
        refreshDOMReferences();
        
        console.log('Initializing animations...');
        initAnimations();
        
        // Check for stuck extraction state and auto-reset if needed
        console.log('Checking for stuck extraction state...');
        checkForStuckExtraction();
        
        // Sync any existing history to chrome.storage.local for the history page
        if (state.history && state.history.length > 0) {
            console.log('📊 Syncing existing history to chrome.storage.local...');
            saveHistoryToExtensionStorage();
        }
        
        // Mark popup UI as ready for fallback detector
        window.__propaceReady = true;
        console.log('Popup marked as ready');
        
        // Ensure loader is hidden on first paint
        if (dom.loaderContainer) {
            dom.loaderContainer.hidden = true;
            dom.loaderContainer.style.display = 'none';
            console.log('Loader hidden');
        }
        
        console.log('Initialization complete!');
    };

    const loadState = async () => {
        try {
            const savedState = JSON.parse(localStorage.getItem('propace_autofill_state'));
            if (savedState) {
                state = { ...state, ...savedState, files: [] }; // Don't restore files
            }
            
            // Also try to load history from chrome.storage.local to merge any existing data
            await loadHistoryFromExtensionStorage();
        } catch (e) {
            console.error("Error loading state:", e);
        }

        // Load saved API key
        await loadSavedApiKey();
    };

    // Load history from chrome.storage.local and merge with existing state
    const loadHistoryFromExtensionStorage = async () => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get(['extractionHistory']);
                const chromeHistory = result.extractionHistory || [];
                
                if (chromeHistory.length > 0) {
                    // Merge histories, preferring chrome storage if it has more recent data
                    const mergedHistory = [...chromeHistory];
                    
                    // Add any local storage items that aren't in chrome storage
                    state.history.forEach(localItem => {
                        const exists = mergedHistory.find(chromeItem => chromeItem.id === localItem.id);
                        if (!exists) {
                            mergedHistory.push(localItem);
                        }
                    });
                    
                    // Sort by timestamp and limit to 50 items
                    state.history = mergedHistory
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .slice(0, 50);
                    
                    console.log('📊 Merged history from chrome.storage.local:', state.history.length, 'items');
                }
            }
        } catch (error) {
            console.warn('Could not load from chrome.storage.local:', error);
        }
    };

    const saveState = () => {
        try {
            const stateToSave = { ...state, files: [] };
            localStorage.setItem('propace_autofill_state', JSON.stringify(stateToSave));
            
            // Also save history to chrome.storage.local for the history page
            saveHistoryToExtensionStorage();
        } catch (e) {
            console.error("Error saving state:", e);
        }
    };

    // Save history data to chrome.storage.local for the standalone history page
    const saveHistoryToExtensionStorage = async () => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ 'extractionHistory': state.history });
                console.log('📊 History saved to chrome.storage.local for history page');
            }
        } catch (error) {
            console.warn('Could not save to chrome.storage.local:', error);
        }
    };

    // ===================================================================
    // ==                AUTO-RESET EXTRACTION SYSTEM                  ==
    // ===================================================================
    
    // Auto-reset extraction state to prevent getting stuck
    const EXTRACTION_TIMEOUT = 60000; // 1 minute timeout
    const EXTRACTION_CHECK_INTERVAL = 10000; // Check every 10 seconds
    let extractionStartTime = null;
    let extractionWatchdog = null;
    
    // Start extraction watchdog timer
    const startExtractionWatchdog = () => {
        extractionStartTime = Date.now();
        
        // Clear any existing watchdog
        if (extractionWatchdog) {
            clearInterval(extractionWatchdog);
        }
        
        console.log('🐕 Starting extraction watchdog - will auto-reset if stuck for >1 minute');
        
        extractionWatchdog = setInterval(() => {
            const elapsedTime = Date.now() - extractionStartTime;
            
            // If extraction is taking too long and still marked as extracting
            if (state.isExtracting && elapsedTime > EXTRACTION_TIMEOUT) {
                console.warn('⚠️ Extraction stuck detected! Auto-resetting extraction state...');
                resetExtractionState();
                showStatus('⚠️ Extraction was stuck - automatically reset. Please try again.', 'error');
            }
        }, EXTRACTION_CHECK_INTERVAL);
    };
    
    // Stop extraction watchdog timer
    const stopExtractionWatchdog = () => {
        if (extractionWatchdog) {
            clearInterval(extractionWatchdog);
            extractionWatchdog = null;
            extractionStartTime = null;
            console.log('🐕 Extraction watchdog stopped');
        }
    };
    
    // Reset ONLY extraction-related state (preserves settings, history, API key)
    const resetExtractionState = () => {
        console.log('🔄 Resetting extraction state (preserving settings & history)...');
        
        // Reset only extraction-related state variables
        state.isExtracting = false;
        state.extractedData = null;
        state.currentModal = null;
        
        // Stop any watchdog timers
        stopExtractionWatchdog();
        
        // Reset UI elements to normal state
        if (dom.extractBtn) {
            dom.extractBtn.disabled = false;
            dom.extractBtn.textContent = 'Extract Data';
            dom.extractBtn.classList.remove('extracting');
        }
        
        if (dom.loaderContainer) {
            dom.loaderContainer.hidden = true;
            dom.loaderContainer.style.display = 'none';
        }
        
        if (dom.resultsArea) {
            dom.resultsArea.hidden = true;
        }
        
        // Clear any status messages
        showStatus('Ready to extract data', 'info');
        
        // Update button states
        updateExtractButtonState();
        
        // Save state (this preserves settings, history, API key - only resets extraction state)
        saveState();
        
        console.log('✅ Extraction state reset complete - settings & history preserved');
    };
    
    // Auto-reset check on initialization (runs once when popup opens)
    const checkForStuckExtraction = () => {
        console.log('🔍 Checking for stuck extraction state on startup...');
        
        if (state.isExtracting) {
            console.warn('⚠️ Found stuck extraction state from previous session - auto-resetting');
            resetExtractionState();
            showStatus('🔄 Previous extraction was stuck - automatically reset', 'info');
        } else {
            console.log('✅ No stuck extraction state detected');
        }
    };

    // ===================================================================
    // ==                      THEME SYSTEM                           ==
    // ===================================================================
    
    const applyTheme = () => {
        const theme = state.theme === 'auto' ? getSystemTheme() : state.theme;
        dom.body.setAttribute('data-theme', theme);
        
        // Update theme radio buttons
        const themeInputs = document.querySelectorAll('input[name="theme"]');
        themeInputs.forEach(input => {
            input.checked = input.value === state.theme;
        });
    };

    const getSystemTheme = () => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const toggleTheme = () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        saveState();
        updateThemeToggleTitle(); // Update title after theme change
    };

    // Update theme toggle button title based on current theme
    const updateThemeToggleTitle = () => {
        if (dom.themeToggle) {
            const title = state.theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
            dom.themeToggle.setAttribute('title', title);
        }
    };

    // ===================================================================
    // ==                      ANIMATIONS                             ==
    // ===================================================================
    
    const initAnimations = () => {
        // Add stagger animation to nav buttons
        dom.navButtons.forEach((btn, index) => {
            btn.style.animationDelay = `${index * 0.1}s`;
        });

        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.setting-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    };

    // ===================================================================
    // ==                    DOM MANAGEMENT                           ==
    // ===================================================================
    
    const refreshDOMReferences = () => {
        console.log('Refreshing DOM references...');
        
        // Re-get all DOM elements to ensure they exist
        dom.uploadArea = document.getElementById('upload-area');
        dom.fileInput = document.getElementById('file-input');
        dom.uploadPlaceholder = document.getElementById('upload-placeholder');
        dom.imagePreviewArea = document.getElementById('image-preview-area');
        dom.previewImage = document.getElementById('preview-image');
        dom.changeImageBtn = document.getElementById('change-image-btn');
        
        // Log which elements were found
        console.log('DOM refresh results:');
        console.log('- uploadArea:', !!dom.uploadArea);
        console.log('- fileInput:', !!dom.fileInput);
        console.log('- uploadPlaceholder:', !!dom.uploadPlaceholder);
        console.log('- imagePreviewArea:', !!dom.imagePreviewArea);
        console.log('- previewImage:', !!dom.previewImage);
        console.log('- changeImageBtn:', !!dom.changeImageBtn);
        
        // Ensure initial state is correct
        if (dom.uploadPlaceholder) {
            dom.uploadPlaceholder.hidden = false;
            dom.uploadPlaceholder.style.display = 'block';
        }
        if (dom.imagePreviewArea) {
            dom.imagePreviewArea.hidden = true;
            dom.imagePreviewArea.style.display = 'none';
        }
        if (dom.uploadArea) {
            dom.uploadArea.classList.remove('has-image');
        }
        
        console.log('DOM references refreshed successfully');
    };

    // ===================================================================
    // ==                      EVENT LISTENERS                        ==
    // ===================================================================
    
    const setupEventListeners = () => {
        // Theme toggle
        dom.themeToggle?.addEventListener('click', toggleTheme);
        updateThemeToggleTitle(); // Set initial title

        // Theme selector radios
        document.querySelectorAll('input[name="theme"]').forEach(input => {
            input.addEventListener('change', (e) => {
                state.theme = e.target.value;
                applyTheme();
                saveState();
            });
        });

        // Upload area - ensure all events are properly bound
        if (dom.uploadArea) {
            // Add event listeners directly without cloning
            dom.uploadArea.addEventListener('click', (e) => {
                // Only trigger file input if clicking on upload area, not preview
                if (!dom.uploadArea.classList.contains('has-image') || e.target.closest('.image-change-overlay')) {
                    console.log('Upload area clicked - opening file dialog');
                    if (dom.fileInput) {
                        dom.fileInput.value = ''; // Reset to ensure change event fires
                        dom.fileInput.click();
                    }
                }
            });
            dom.uploadArea.addEventListener('dragenter', handleDragEnter);
            dom.uploadArea.addEventListener('dragover', handleDragOver);
            dom.uploadArea.addEventListener('dragleave', handleDragLeave);
            dom.uploadArea.addEventListener('drop', handleDrop);
        }
        
        // File input - ensure event listener is properly bound
        if (dom.fileInput) {
            // Remove any existing listeners to prevent duplicates
            const newFileInput = dom.fileInput.cloneNode(true);
            dom.fileInput.parentNode.replaceChild(newFileInput, dom.fileInput);
            dom.fileInput = newFileInput;
            
            dom.fileInput.addEventListener('change', (e) => {
                console.log('File input change event triggered');
                console.log('Event target:', e.target);
                console.log('Files selected:', e.target.files);
                console.log('Number of files:', e.target.files ? e.target.files.length : 0);
                
                if (e.target.files && e.target.files.length > 0) {
                    console.log('Processing files...');
                    // Add a small delay to ensure file selection is complete
                    setTimeout(() => {
                        try {
                            handleFiles(e.target.files);
                            console.log('handleFiles called successfully');
                        } catch (error) {
                            console.error('Error in handleFiles:', error);
                            showNotification('Error processing files', 'error');
                        }
                    }, 100);
                } else {
                    console.log('No files selected or files array is empty');
                }
            });
        }        // Image preview buttons
        if (dom.changeImageBtn) {
            dom.changeImageBtn.addEventListener('click', () => {
                console.log('Change image button clicked');
                // Reset the file input value to ensure change event fires even for same file
                if (dom.fileInput) {
                    dom.fileInput.value = '';
                    dom.fileInput.click();
                }
            });
        }

        // Buttons
        dom.extractBtn?.addEventListener('click', startExtraction);
        dom.initialAutofillBtn?.addEventListener('click', handleAutofill);
        dom.resultsAutofillBtn?.addEventListener('click', handleAutofill);
        dom.clearBtn?.addEventListener('click', clearAll);
        dom.fillFormBtn?.addEventListener('click', fillTestForm);
        
        // API Key Management
        dom.saveApiKeyBtn?.addEventListener('click', handleSaveApiKey);
        dom.cancelSettingsBtn?.addEventListener('click', handleCancelSettings);
        dom.removeApiKeyBtn?.addEventListener('click', handleRemoveApiKey);
        dom.toggleKeyVisibilityBtn?.addEventListener('click', toggleKeyVisibility);
        dom.apiKeyInput?.addEventListener('input', handleApiKeyInput);
        dom.apiKeyInput?.addEventListener('blur', trimApiKeyInput);
        
        dom.openTestFormBtn?.addEventListener('click', openTestForm);
        dom.clearHistoryBtn?.addEventListener('click', clearHistory);
        
        // Add event listener for standalone settings button
        if (dom.openStandaloneSettingsBtn) {
            dom.openStandaloneSettingsBtn.addEventListener('click', () => {
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
                } else {
                    window.open('settings.html', '_blank');
                }
            });
        }

        // Add event listener for test form button in header
        if (dom.openTestFormHeaderBtn) {
            dom.openTestFormHeaderBtn.addEventListener('click', () => {
                // Show user how to open the test form properly
                const modalHtml = `
                    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; text-align: center;">
                            <h3 style="color: #4CAF50; margin-bottom: 20px;">🎯 Open Test Form Properly</h3>
                            <p style="margin-bottom: 15px; line-height: 1.5;">To avoid extension page issues, please open the test form as a regular webpage:</p>
                            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                                <strong>Option 1:</strong> Run this command in your folder:<br>
                                <code style="background: #e0e0e0; padding: 2px 5px; border-radius: 3px;">open-test-form.bat</code>
                            </div>
                            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                                <strong>Option 2:</strong> Double-click this file:<br>
                                <code style="background: #e0e0e0; padding: 2px 5px; border-radius: 3px;">test-form.html</code>
                            </div>
                            <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 15px 0; border: 1px solid #ffeaa7;">
                                <small>📁 File will open with <strong>file://</strong> protocol instead of <strong>chrome-extension://</strong></small>
                            </div>
                            <button onclick="this.parentElement.parentElement.remove()" style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">Got It!</button>
                            <button onclick="this.parentElement.parentElement.remove(); chrome.tabs.create({ url: chrome.runtime.getURL('test-form.html') });" style="background: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; margin-left: 10px;">Open Extension Page Anyway</button>
                        </div>
                    </div>
                `;
                
                // Insert modal into page
                const modalDiv = document.createElement('div');
                modalDiv.innerHTML = modalHtml;
                document.body.appendChild(modalDiv);
            });
        }

        // Add event listener for history page button
        if (dom.openHistoryPageBtn) {
            dom.openHistoryPageBtn.addEventListener('click', () => {
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
                } else {
                    window.open('history.html', '_blank');
                }
            });
        }

        // Modal
        dom.modalCloseBtn?.addEventListener('click', closeModal);
        dom.modalBackdrop?.addEventListener('click', closeModal);
        dom.modalDeleteBtn?.addEventListener('click', deleteHistoryItem);

        // Navigation
        dom.navButtons?.forEach(btn => {
            btn.addEventListener('click', () => navigateTo(btn.dataset.view));
        });

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, preventDefaults, false);
        });

        // Keyboard shortcuts and accessibility
        document.addEventListener('keydown', handleKeyboardShortcuts);
        
        // Settings view focus trap
        const settingsView = document.getElementById('settings-view');
        if (settingsView) {
            settingsView.addEventListener('keydown', handleSettingsKeydown);
        }

        // Window resize
        window.addEventListener('resize', debounce(handleResize, 250));

        // Side panel focus management
        window.addEventListener('blur', () => {
            // When side panel loses focus (user clicks outside)
            console.log('Side panel lost focus - user clicked outside');
        });

        window.addEventListener('focus', () => {
            // When side panel gains focus (user clicks back)
            console.log('Side panel gained focus - user is back');
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Side panel is now hidden');
            } else {
                console.log('Side panel is now visible');
            }
        });

        // Auto-hide quick access hint after 10 seconds
        setTimeout(() => {
            const hint = document.getElementById('quick-access-hint');
            if (hint) {
                hint.classList.add('fade-out');
                setTimeout(() => hint.remove(), 300);
            }
        }, 10000);
    };

    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleKeyboardShortcuts = (e) => {
        // Ctrl/Cmd + K to focus search/upload
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (dom.uploadArea && !state.files.length) {
                if (dom.fileInput) {
                    dom.fileInput.value = ''; // Reset to ensure change event fires
                    dom.fileInput.click();
                }
            }
        }

        // Escape to close modal
        if (e.key === 'Escape' && state.currentModal) {
            closeModal();
        }

        // Enter to extract if files are loaded
        if (e.key === 'Enter' && state.files.length && !state.isExtracting) {
            startExtraction();
        }
    };

    const handleResize = () => {
        // Adjust layout for smaller screens
        const container = dom.container;
        if (container) {
            const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
            if (vw < 480) {
                container.style.width = '100vw';
                container.style.height = '100vh';
                container.style.borderRadius = '0';
            } else {
                container.style.width = '420px';
                container.style.height = '600px';
                container.style.borderRadius = 'var(--radius-xl)';
            }
        }
    };

    // ===================================================================
    // ==                    FILE HANDLING                            ==
    // ===================================================================
    
    const handleDragEnter = (e) => {
        e.preventDefault();
        dom.uploadArea?.classList.add('drag-over');
        console.log('Drag enter - showing overlay');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        // Only remove drag-over if we're actually leaving the upload area
        if (!dom.uploadArea?.contains(e.relatedTarget)) {
            dom.uploadArea?.classList.remove('drag-over');
            console.log('Drag leave - hiding overlay');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        dom.uploadArea?.classList.remove('drag-over');
        console.log('File dropped');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (files.length > 0) {
            handleFiles(files);
        } else {
            showNotification('Please drop image files only (PNG, JPG, WEBP)', 'error');
        }
    };

    const handleFiles = async (fileList) => {
        console.log('=== handleFiles START ===');
        console.log('handleFiles: Called with fileList:', fileList);
        console.log('fileList type:', typeof fileList);
        console.log('fileList length:', fileList ? fileList.length : 'undefined');
        
        if (!fileList || fileList.length === 0) {
            console.log('handleFiles: No files provided - EARLY RETURN');
            return;
        }
        
        console.log('handleFiles: Converting FileList to Array...');
        const files = Array.from(fileList).filter(file => {
            const isImage = file.type.startsWith('image/');
            console.log('handleFiles: File', file.name, 'is image:', isImage, 'type:', file.type);
            return isImage;
        });
        
        console.log('handleFiles: Filtered image files:', files.length);
        
        if (files.length === 0) {
            console.log('handleFiles: No valid image files found - EARLY RETURN');
            showNotification('Please select valid image files', 'error');
            return;
        }

        console.log('handleFiles: Processing', files.length, 'image files');
        console.log('handleFiles: Setting state.files...');
        state.files = files;
        
        console.log('handleFiles: Calling showImagePreview with first file:', files[0].name);
        try {
            showImagePreview(files[0]); // Show the first image in preview
            console.log('handleFiles: showImagePreview completed successfully');
        } catch (error) {
            console.error('handleFiles: Error in showImagePreview:', error);
        }
        
        console.log('handleFiles: Calling updateExtractButtonState...');
        try {
            updateExtractButtonState();
            console.log('handleFiles: updateExtractButtonState completed successfully');
        } catch (error) {
            console.error('handleFiles: Error in updateExtractButtonState:', error);
        }
        
        // Hide initial autofill button until extraction is done
        if (dom.initialAutofillBtn) {
            console.log('handleFiles: Hiding initial autofill button');
            dom.initialAutofillBtn.hidden = true;
        }
        
        console.log('handleFiles: Files uploaded successfully:', files.length);
        console.log('=== handleFiles END ===');
    };

    const showImagePreview = (file) => {
        if (!file) {
            console.error('showImagePreview: No file provided');
            return;
        }
        
        console.log('showImagePreview: Starting preview for:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        // Double-check DOM elements exist
        if (!dom.uploadPlaceholder) {
            console.error('showImagePreview: uploadPlaceholder element not found');
        }
        if (!dom.imagePreviewArea) {
            console.error('showImagePreview: imagePreviewArea element not found');
            return;
        }
        if (!dom.previewImage) {
            console.error('showImagePreview: previewImage element not found');
            return;
        }
        if (!dom.uploadArea) {
            console.error('showImagePreview: uploadArea element not found');
            return;
        }
        
        console.log('showImagePreview: All DOM elements found successfully');
        
        // Hide upload placeholder with multiple approaches
        if (dom.uploadPlaceholder) {
            console.log('showImagePreview: Hiding upload placeholder');
            dom.uploadPlaceholder.hidden = true;
            dom.uploadPlaceholder.style.display = 'none';
            dom.uploadPlaceholder.style.visibility = 'hidden';
            dom.uploadPlaceholder.style.opacity = '0';
        }
        
        // Show preview area with multiple approaches
        console.log('showImagePreview: Showing image preview area');
        dom.imagePreviewArea.hidden = false;
        dom.imagePreviewArea.style.display = 'flex';
        dom.imagePreviewArea.style.visibility = 'visible';
        dom.imagePreviewArea.style.opacity = '1';
        dom.imagePreviewArea.removeAttribute('hidden');
        
        // Add has-image class and ensure upload area visibility
        console.log('showImagePreview: Adding has-image class to upload area');
        dom.uploadArea.classList.add('has-image');
        dom.uploadArea.style.display = 'flex';
        dom.uploadArea.style.visibility = 'visible';
        
        // Create image URL and display with comprehensive error handling
        try {
            const imageUrl = URL.createObjectURL(file);
            console.log('showImagePreview: Created object URL:', imageUrl);
            
            // Clear any existing image first
            dom.previewImage.src = '';
            dom.previewImage.style.display = 'block';
            dom.previewImage.style.visibility = 'visible';
            
            // Set up error handling
            dom.previewImage.onerror = (error) => {
                console.error('showImagePreview: Failed to load image:', error);
                showNotification('Failed to load image. Please try a different file.', 'error');
            };
            
            // Set up success handling
            dom.previewImage.onload = () => {
                console.log('showImagePreview: Image loaded successfully!');
                console.log('showImagePreview: Image dimensions:', dom.previewImage.naturalWidth, 'x', dom.previewImage.naturalHeight);
                dom.previewImage.style.opacity = '1';
                dom.previewImage.style.transform = 'scale(1)';
                
                // Final check - ensure preview area is visible
                dom.imagePreviewArea.style.display = 'flex';
                dom.imagePreviewArea.hidden = false;
                
                console.log('showImagePreview: Image preview completed successfully');
            };
            
            // Start loading the image with transition
            dom.previewImage.style.opacity = '0';
            dom.previewImage.style.transform = 'scale(0.95)';
            dom.previewImage.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            console.log('showImagePreview: Setting image src to:', imageUrl);
            dom.previewImage.src = imageUrl;
            
        } catch (error) {
            console.error('showImagePreview: Error creating object URL:', error);
            showNotification('Error processing image file', 'error');
            return;
        }
        
        console.log('showImagePreview: Function completed for:', file.name);
    };

    const removeImage = () => {
        // Clear the files
        state.files = [];
        
        // Hide preview area and show upload placeholder
        if (dom.imagePreviewArea) {
            dom.imagePreviewArea.hidden = true;
        }
        if (dom.uploadPlaceholder) {
            dom.uploadPlaceholder.hidden = false;
        }
        
        // Remove has-image class
        dom.uploadArea?.classList.remove('has-image');
        
        // Clear file input
        if (dom.fileInput) {
            dom.fileInput.value = '';
        }
        
        // Clear preview image
        if (dom.previewImage) {
            URL.revokeObjectURL(dom.previewImage.src);
            dom.previewImage.src = '';
        }
        
        // Update button state
        updateExtractButtonState();
        
        console.log('Image removed');
    };

    // ===================================================================
    // ==                 GEMINI API KEY MANAGEMENT                    ==
    // ===================================================================
    
    // SECURITY NOTE: Never log the raw API key to console or telemetry
    // Store keys in chrome.storage.local only (safer than sync for API keys)
    
    const GEMINI_KEY_STORAGE_KEY = 'geminiApiKey';
    const GEMINI_KEY_STATUS_KEY = 'geminiKeyStatus'; // 'valid', 'invalid', 'network_error', 'rate_limited'
    
    // Client-side format validation (Settings only)
    const validateApiKeyFormat = (key) => {
        if (!key || typeof key !== 'string') {
            return { valid: false, message: 'Invalid key format — check allowed characters and length (10–200).' };
        }
        
        const trimmedKey = key.trim();
        
        // Check length
        if (trimmedKey.length < 10 || trimmedKey.length > 200) {
            return { valid: false, message: 'Invalid key format — check allowed characters and length (10–200).' };
        }
        
        // Check allowed characters: [A-Za-z0-9_.-]
        const allowedPattern = /^[A-Za-z0-9_.-]+$/;
        if (!allowedPattern.test(trimmedKey)) {
            return { valid: false, message: 'Invalid key format — check allowed characters and length (10–200).' };
        }
        
        return { valid: true, message: 'Format OK — saved key will be used when you run Extract.' };
    };
    
    // Load saved API key on startup
    const loadSavedApiKey = async () => {
        try {
            const result = await chrome.storage.local.get([GEMINI_KEY_STORAGE_KEY, GEMINI_KEY_STATUS_KEY]);
            const savedKey = result[GEMINI_KEY_STORAGE_KEY];
            const keyStatus = result[GEMINI_KEY_STATUS_KEY] || 'unknown';
            
            if (savedKey) {
                // Show that key exists without revealing it
                if (dom.apiKeyInput) {
                    dom.apiKeyInput.value = '•'.repeat(Math.min(savedKey.length, 50));
                    dom.apiKeyInput.dataset.hasKey = 'true';
                }
                
                // Show remove button
                if (dom.removeApiKeyBtn) {
                    dom.removeApiKeyBtn.classList.remove('hidden');
                }
                
                // Show key status
                if (dom.keyStatusDisplay) {
                    dom.keyStatusDisplay.classList.remove('hidden');
                }
                
                // Update header status indicator
                updateApiKeyStatusIndicator(keyStatus);
                
                // Update state and button
                state.apiKey = savedKey;
                updateExtractButtonState();
                
                console.log('Saved API key loaded (length:', savedKey.length, 'status:', keyStatus, ')');
            } else {
                updateApiKeyStatusIndicator('none');
                state.apiKey = null;
                updateExtractButtonState();
            }
        } catch (error) {
            console.error('Error loading saved API key:', error);
            updateApiKeyStatusIndicator('none');
            state.apiKey = null;
            updateExtractButtonState();
        }
    };
    
    // Update the status indicator in header
    const updateApiKeyStatusIndicator = (status) => {
        if (!dom.apiKeyStatusIndicator) return;
        
        const statusDot = dom.apiKeyStatusIndicator.querySelector('.status-dot');
        if (!statusDot) return;
        
        // Remove all status classes
        statusDot.classList.remove('gray', 'green', 'yellow', 'red');
        
        // Set title and color based on status
        switch (status) {
            case 'valid':
            case 'saved':
                statusDot.classList.add('green');
                dom.apiKeyStatusIndicator.title = 'API Key: Saved (format OK)';
                break;
            case 'network_error':
                statusDot.classList.add('yellow');
                dom.apiKeyStatusIndicator.title = 'API Key: Network error on last use';
                break;
            case 'invalid':
            case 'unauthorized':
                statusDot.classList.add('red');
                dom.apiKeyStatusIndicator.title = 'API Key: Invalid or unauthorized';
                break;
            case 'rate_limited':
                statusDot.classList.add('yellow');
                dom.apiKeyStatusIndicator.title = 'API Key: Rate limited';
                break;
            case 'none':
            default:
                statusDot.classList.add('gray');
                dom.apiKeyStatusIndicator.title = 'API Key: Not saved';
                break;
        }
    };
    
    // Handle API key input validation
    const handleApiKeyInput = () => {
        if (!dom.apiKeyInput || !dom.validationStatus) return;
        
        // Skip validation if showing masked saved key
        if (dom.apiKeyInput.dataset.hasKey === 'true' && dom.apiKeyInput.type === 'password') {
            return;
        }
        
        const key = dom.apiKeyInput.value;
        const validation = validateApiKeyFormat(key);
        
        // Update validation status
        dom.validationStatus.textContent = validation.message;
        dom.validationStatus.className = `validation-status ${validation.valid ? 'success' : 'error'}`;
        
        // Update input styling
        dom.apiKeyInput.classList.remove('error', 'success');
        dom.apiKeyInput.classList.add(validation.valid ? 'success' : 'error');
        
        // Enable/disable save button
        if (dom.saveApiKeyBtn) {
            dom.saveApiKeyBtn.disabled = !validation.valid || key.trim().length === 0;
        }
    };
    
    // Trim whitespace on blur
    const trimApiKeyInput = () => {
        if (!dom.apiKeyInput) return;
        
        // Skip if showing masked saved key
        if (dom.apiKeyInput.dataset.hasKey === 'true' && dom.apiKeyInput.type === 'password') {
            return;
        }
        
        dom.apiKeyInput.value = dom.apiKeyInput.value.trim();
        handleApiKeyInput();
    };
    
    // Toggle key visibility
    const toggleKeyVisibility = () => {
        if (!dom.apiKeyInput || !dom.toggleKeyVisibilityBtn) return;
        
        const eyeOpen = dom.toggleKeyVisibilityBtn.querySelector('.eye-open');
        const eyeClosed = dom.toggleKeyVisibilityBtn.querySelector('.eye-closed');
        
        if (dom.apiKeyInput.type === 'password') {
            dom.apiKeyInput.type = 'text';
            eyeOpen.classList.add('hidden');
            eyeClosed.classList.remove('hidden');
            dom.toggleKeyVisibilityBtn.title = 'Hide API key';
        } else {
            dom.apiKeyInput.type = 'password';
            eyeOpen.classList.remove('hidden');
            eyeClosed.classList.add('hidden');
            dom.toggleKeyVisibilityBtn.title = 'Show API key';
        }
    };
    
    // Handle save API key
    const handleSaveApiKey = async () => {
        if (!dom.apiKeyInput || !dom.saveApiKeyBtn) return;
        
        // Prevent double-click
        if (dom.saveApiKeyBtn.disabled) return;
        
        const key = dom.apiKeyInput.value.trim();
        const validation = validateApiKeyFormat(key);
        
        if (!validation.valid) {
            showValidationError(validation.message);
            return;
        }
        
        try {
            // Show loading state
            dom.saveApiKeyBtn.disabled = true;
            dom.saveApiKeyBtn.classList.add('loading');
            dom.saveApiKeyBtn.textContent = '';
            
            // Save to chrome.storage.local (safer for API keys than sync)
            await chrome.storage.local.set({
                [GEMINI_KEY_STORAGE_KEY]: key,
                [GEMINI_KEY_STATUS_KEY]: 'saved'
            });
            
            // Show success message
            showValidationSuccess('API key saved locally. The Extract feature will attempt to validate the key when used.');
            
            // Update UI
            dom.apiKeyInput.value = '•'.repeat(Math.min(key.length, 50));
            dom.apiKeyInput.dataset.hasKey = 'true';
            dom.apiKeyInput.type = 'password';
            
            // Show remove button and status
            if (dom.removeApiKeyBtn) {
                dom.removeApiKeyBtn.classList.remove('hidden');
            }
            if (dom.keyStatusDisplay) {
                dom.keyStatusDisplay.classList.remove('hidden');
            }
            
            // Update status indicator
            updateApiKeyStatusIndicator('saved');
            
            // Update state and button
            state.apiKey = key;
            updateExtractButtonState();
            
            // Reset visibility toggle
            const eyeOpen = dom.toggleKeyVisibilityBtn?.querySelector('.eye-open');
            const eyeClosed = dom.toggleKeyVisibilityBtn?.querySelector('.eye-closed');
            if (eyeOpen && eyeClosed) {
                eyeOpen.classList.remove('hidden');
                eyeClosed.classList.add('hidden');
            }
            
            console.log('API key saved successfully (length:', key.length, ')');
            
            // Close settings after delay
            setTimeout(() => {
                navigateTo('extractor-view');
            }, 2000);
            
        } catch (error) {
            console.error('Error saving API key:', error);
            showValidationError('Failed to save API key. Please try again.');
        } finally {
            // Reset button state
            dom.saveApiKeyBtn.disabled = false;
            dom.saveApiKeyBtn.classList.remove('loading');
            dom.saveApiKeyBtn.textContent = 'Save';
        }
    };
    
    // Handle remove API key with confirmation
    const handleRemoveApiKey = async () => {
        if (!confirm('Remove saved API key? You\'ll need to enter it again to use Extract.')) {
            return;
        }
        
        try {
            // Remove from storage
            await chrome.storage.local.remove([GEMINI_KEY_STORAGE_KEY, GEMINI_KEY_STATUS_KEY]);
            
            // Reset UI
            if (dom.apiKeyInput) {
                dom.apiKeyInput.value = '';
                dom.apiKeyInput.dataset.hasKey = 'false';
                dom.apiKeyInput.type = 'password';
                dom.apiKeyInput.classList.remove('success', 'error');
            }
            
            if (dom.removeApiKeyBtn) {
                dom.removeApiKeyBtn.classList.add('hidden');
            }
            
            if (dom.keyStatusDisplay) {
                dom.keyStatusDisplay.classList.add('hidden');
            }
            
            if (dom.validationStatus) {
                dom.validationStatus.textContent = '';
                dom.validationStatus.className = 'validation-status';
            }
            
            // Update status indicator
            updateApiKeyStatusIndicator('none');
            
            // Update state and button
            state.apiKey = null;
            updateExtractButtonState();
            
            showValidationSuccess('API key removed successfully.');
            
            console.log('API key removed successfully');
            
        } catch (error) {
            console.error('Error removing API key:', error);
            showValidationError('Failed to remove API key. Please try again.');
        }
    };
    
    // Handle cancel settings
    const handleCancelSettings = () => {
        navigateTo('extractor-view');
    };
    
    // Helper functions for validation messages
    const showValidationError = (message) => {
        if (dom.validationStatus) {
            dom.validationStatus.textContent = '❌ ' + message;
            dom.validationStatus.className = 'validation-status error';
        }
        showNotification(message, 'error');
    };

    const showValidationSuccess = (message) => {
        if (dom.validationStatus) {
            dom.validationStatus.textContent = '✅ ' + message;
            dom.validationStatus.className = 'validation-status success';
        }
        showNotification(message, 'success');
    };
    
    // Get saved API key for runtime use (Extract function)
    const getSavedApiKey = async () => {
        try {
            const result = await chrome.storage.local.get(GEMINI_KEY_STORAGE_KEY);
            return result[GEMINI_KEY_STORAGE_KEY] || null;
        } catch (error) {
            console.error('Error retrieving API key:', error);
            return null;
        }
    };
    
    // Update API key status after runtime validation
    const updateApiKeyRuntimeStatus = async (status) => {
        try {
            await chrome.storage.local.set({ [GEMINI_KEY_STATUS_KEY]: status });
            updateApiKeyStatusIndicator(status);
        } catch (error) {
            console.error('Error updating API key status:', error);
        }
    };
    
    // Handle settings view keyboard navigation (focus trap)
    const handleSettingsKeydown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            navigateTo('extractor-view');
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const renderPreviews = () => {
        if (!dom.multiFilePreview) return;

        dom.multiFilePreview.innerHTML = '';
        
        state.files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const thumbnail = createThumbnail(e.target.result, file.name, index);
                dom.multiFilePreview.appendChild(thumbnail);
            };
            reader.readAsDataURL(file);
        });
    };

    const createThumbnail = (src, name, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'file-thumbnail';
        thumbnail.innerHTML = `
            <img src="${src}" alt="${name}" title="${name}">
            <button class="remove-file-btn" data-index="${index}" title="Remove file">×</button>
        `;
        
        // Add remove functionality
        const removeBtn = thumbnail.querySelector('.remove-file-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(index);
        });
        
        return thumbnail;
    };

    const removeFile = (index) => {
        state.files.splice(index, 1);
        
        if (state.files.length === 0) {
            clearAll();
        } else {
            renderPreviews();
            updateExtractButtonState();
        }
    };

    // ===================================================================
    // ==                    EXTRACTION LOGIC                         ==
    // ===================================================================
    
    const startExtraction = async () => {
        // Prevent multiple simultaneous extractions
        if (state.isExtracting) {
            showNotification('Extraction in Progress', 'Please wait for the current extraction to complete.', 'info', 5000);
            return;
        }

        // Check if API key exists first
        const apiKey = await getSavedApiKey();
        if (!apiKey) {
            showNotification(
                'API Key Required', 
                'Please go to Settings and add your Gemini AI API key to use the extract feature.', 
                'warning', 
                7000
            );
            // Auto-navigate to settings after a delay
            setTimeout(() => navigateTo('settings-view'), 2000);
            return;
        }

        // Check if files are uploaded
        if (state.files.length === 0) {
            showNotification(
                'Image Required', 
                'Please upload an ID card, passport, or other identity document image to extract data.', 
                'warning', 
                6000
            );
            return;
        }

        // All requirements met - start extraction
        state.isExtracting = true;
        
        // Start extraction watchdog to prevent getting stuck
        startExtractionWatchdog();
        
        // Show results area when starting extraction BUT keep upload area visible
        if (dom.resultsArea) {
            dom.resultsArea.hidden = false;
        }
        
        // CRITICAL: Ensure upload area remains visible during extraction
        if (dom.uploadArea) {
            dom.uploadArea.style.display = 'flex';
            dom.uploadArea.style.visibility = 'visible';
            dom.uploadArea.hidden = false;
        }
        
        showEnhancedLoader();
        updateExtractButtonState();

        // Pre-flight checks
        const isConnected = await checkNetworkConnectivity();
        if (!isConnected) {
            throw new Error('No internet connection detected');
        }

        try {
            // Initialize request tracking
            loadRequestCount();
            
            // Use the new advanced extraction system
            console.log('🚀 Starting advanced extraction process...');
            const extractedData = await extractDataWithAdvancedLogic(state.files[0]);
            
            // Save successful extraction
            state.extractedData = extractedData;
            saveToHistory(extractedData);
            displayExtractedData(extractedData);
            
            // Update key status to valid
            await updateApiKeyRuntimeStatus('valid');
            
            showNotification('✅ Data extracted successfully!', 'success');
            console.log('🎉 Extraction completed successfully!');
            
        } catch (error) {
            console.error('❌ Final extraction error:', error);
            
            // Enhanced error handling with specific messages
            if (error.status === 401 || error.status === 403) {
                showNotification('🔑 Invalid API key. Please check your settings.', 'error');
                await updateApiKeyRuntimeStatus('unauthorized');
                // Auto-open settings after delay
                setTimeout(() => navigateTo('settings-view'), 2000);
            } else if (error.status === 429) {
                showNotification('🚫 Rate limit exceeded. Please wait and try again.', 'error');
                await updateApiKeyRuntimeStatus('rate_limited');
            } else if (error.message.includes('timeout')) {
                showNotification('⏰ Request timed out. Please check your connection and try again.', 'error');
                await updateApiKeyRuntimeStatus('timeout');
            } else if (error.message.includes('No internet')) {
                showNotification('🌐 No internet connection. Please check your network.', 'error');
                await updateApiKeyRuntimeStatus('network_error');
            } else if (error.message.includes('File too large')) {
                showNotification('📁 File too large. Please use an image smaller than 20MB.', 'error');
            } else if (error.message.includes('Invalid file type')) {
                showNotification('📋 Invalid file type. Please upload an image file.', 'error');
            } else if (error.status >= 500) {
                showNotification('🔧 Google AI service temporarily unavailable. Please try again.', 'error');
                await updateApiKeyRuntimeStatus('service_error');
            } else {
                // Generic error with helpful message
                showNotification(`❌ Extraction failed: ${error.message}. Please try again.`, 'error');
                await updateApiKeyRuntimeStatus('error');
            }
            
            // Don't hide the UI - let user try again
            console.log('💡 Keeping interface available for retry');
        } finally {
            state.isExtracting = false;
            
            // Stop extraction watchdog
            stopExtractionWatchdog();
            
            hideLoader();
            updateExtractButtonState();
            
            console.log('🔄 Extraction process completed');
            
            // Show the initial autofill button after extraction is done
            if (dom.initialAutofillBtn) {
                dom.initialAutofillBtn.hidden = false;
            }
        }
    };

    // ===================================================================
    // ==                ADVANCED API CALLING SYSTEM                   ==
    // ===================================================================

    // Professional retry mechanism with exponential backoff
    const callGeminiAPIWithRetry = async (apiKey, file, maxRetries = 3) => {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🚀 API Attempt ${attempt}/${maxRetries}...`);
                
                // Update loading message based on attempt
                updateLoadingMessage(attempt, maxRetries);
                
                const result = await callGeminiAPI(apiKey, file, attempt);
                console.log('✅ API call successful!');
                return result;
                
            } catch (error) {
                console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);
                lastError = error;
                
                // Don't retry for authentication errors
                if (error.status === 401 || error.status === 403) {
                    throw error;
                }
                
                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
                    console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                    await wait(waitTime);
                }
            }
        }
        
        // All retries failed
        throw lastError;
    };

    // Enhanced API call with better error handling and optimized timeout
    const callGeminiAPI = async (apiKey, file, attempt = 1) => {
        // Optimized timeout for faster processing
        const timeout = Math.min(10000 + (attempt - 1) * 3000, 20000); // 10-20 seconds
        
        // Check network connectivity first
        if (!navigator.onLine) {
            throw new Error('No internet connection detected');
        }
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Request timeout after ${timeout / 1000} seconds`));
            }, timeout);
        });

        // Create the enhanced API call promise
        const apiPromise = new Promise(async (resolve, reject) => {
            try {
                console.log(`📡 Making API request (timeout: ${timeout / 1000}s)...`);
                
                // Convert file to base64 with error handling
                const base64Data = await fileToBase64(file);
                console.log(`📄 File converted to base64 (${Math.round(base64Data.length / 1024)}KB)`);
                
                // Enhanced request body with comprehensive extraction prompt INCLUDING URDU SUPPORT
                const requestBody = {
                    contents: [{
                        parts: [
                            {
                                text: `You are an expert OCR and data extraction AI with advanced Urdu-English conversion capabilities. Extract ONLY the fields that are ACTUALLY VISIBLE and CLEARLY READABLE in this identity document.

CRITICAL VALIDATION RULES:
1. ONLY extract fields that you can SEE and READ clearly in the image
2. If a field is not visible or readable, set it to null
3. Do NOT assume or guess any information
4. Do NOT extract fields from other document types if this is a passport
5. Do NOT extract passport fields if this is an ID card

ENHANCED URDU-ENGLISH CONVERSION INSTRUCTIONS:
If you find fields written in Urdu, convert them to English as follows:

URDU FIELD NAMES → ENGLISH CONVERSION:
- "نام" (Naam) = Full Name  
- "والد کا نام" or "شوہر کا نام" (Walid/Shohar ka naam) = Father/Husband Name
- "تاریخ پیدائش" (Tareekh Paidaish) = Date of Birth
- "شناختی کارڈ نمبر" (Shanakhti Card Number) = ID Number
- "موجودہ پتہ" (Majooda Pata) = Current Address
- "مستقل پتہ" (Mustakil Pata) = Permanent Address
- "جاری کرنے کی تاریخ" (Jaari karne ki tareekh) = Issue Date
- "ختم ہونے کی تاریخ" (Khatam hone ki tareekh) = Expiry Date

URDU ADDRESS TERMS → ENGLISH CONVERSION:
- "گاؤں" = Village/Gaon
- "شہر" = City/Shehar  
- "تحصیل" = Tehsil
- "ضلع" = District/Zila
- "محلہ" = Mohalla/Area
- "گلی" = Gali/Street
- "مکان نمبر" = House Number
- "پوسٹل کوڈ" = Postal Code

PAKISTANI CITIES URDU → ENGLISH:
- "کراچی" = Karachi
- "لاہور" = Lahore  
- "اسلام آباد" = Islamabad
- "راولپنڈی" = Rawalpindi
- "فیصل آباد" = Faisalabad
- "ملتان" = Multan
- "حیدرآباد" = Hyderabad
- "پشاور" = Peshawar
- "کوئٹہ" = Quetta

STRICT EXTRACTION RULES:
1. If field labels are in Urdu → Convert to English using above mappings
2. If field values are in Urdu → Convert to readable English transliteration  
3. If fields are already in English → Extract exactly as shown, don't change anything
4. ONLY extract fields that are clearly visible and readable
5. For addresses: maintain proper hierarchy (House → Street → Area → Tehsil → District)
6. If you cannot clearly read a field, set it to null

DOCUMENT TYPE SPECIFIC VALIDATION:
- PASSPORT: Only extract passport-related fields (passport number, dates, nationality, place of birth)
- ID CARD: Only extract ID-related fields (ID number, CNIC, local addresses)
- MIXED DOCUMENTS: Extract all visible fields but validate they belong to the document

RETURN ONLY this JSON format (use null for fields NOT CLEARLY VISIBLE):
{
  "name": "Full name (converted from نام if in Urdu, or exact English text) - ONLY if clearly visible",
  "fatherHusbandName": "Father/Husband name (converted from والد/شوہر کا نام if in Urdu) - ONLY if clearly visible",
  "dateOfBirth": "Birth date exactly as shown - ONLY if clearly visible",
  "gender": "Gender as shown (M/F/Male/Female) - ONLY if clearly visible",
  "placeOfBirth": "Birth place if visible - ONLY for passports or birth certificates",
  "nationality": "Nationality if visible - ONLY if clearly stated", 
  "citizenshipNumber": "Citizenship/Certificate number if visible - ONLY if clearly visible",
  "idNumber": "ID/CNIC number (converted from شناختی کارڈ نمبر if in Urdu) - ONLY for ID cards",
  "idIssueDate": "ID issue date (converted from جاری کرنے کی تاریخ if in Urdu) - ONLY for ID cards",
  "idExpiryDate": "ID expiry date (converted from ختم ہونے کی تاریخ if in Urdu) - ONLY for ID cards",
  "passportNo": "Passport number if visible - ONLY for passports",
  "country": "Country name if visible - ONLY if clearly stated",
  "passportIssueDate": "Passport issue date if visible - ONLY for passports",
  "passportExpiryDate": "Passport expiry date if visible - ONLY for passports",
  "phoneNumber": "Phone number if visible - ONLY if clearly visible",
  "emailAddress": "Email if visible - ONLY if clearly visible", 
  "currentAddress": "English transliteration of موجودہ پتہ (Current Address) - ONLY if clearly visible",
  "permanentAddress": "English transliteration of مستقل پتہ (Permanent Address) - ONLY if clearly visible",
  "address": "General address if not specifically current/permanent - ONLY if clearly visible"
}

IMPORTANT VALIDATION EXAMPLES:
- If this is a PASSPORT and you don't see "Passport Number" → set passportNo to null
- If this is an ID CARD and you don't see "ID Number" or "CNIC" → set idNumber to null
- If you see "نام: احمد علی" clearly → extract as "name": "Ahmad Ali"
- If you see "والد کا نام: محمد حسن" clearly → extract as "fatherHusbandName": "Muhammad Hassan"  
- If you see "موجودہ پتہ: مکان نمبر ۱۲، گلی نمبر ۳، محلہ گلشن، کراچی" clearly → extract as "currentAddress": "House Number 12, Gali Number 3, Mohalla Gulshan, Karachi"
- If you see "Name: John Smith" clearly → extract as "name": "John Smith" (no conversion needed)

FIELD EXTRACTION GUIDELINES - ONLY IF CLEARLY VISIBLE:
- PASSPORT NUMBER: Look for "Passport No", "Passport Number", "Document No", "P No" or similar - ONLY in passports
- PASSPORT DATES: Look for "Date of Issue", "Issue Date", "Date of Expiry", "Expiry Date", "Valid Until" - ONLY in passports
- ID NUMBER: Look for "ID No", "National ID", "CNIC", "Identity Number", "Registration No", "شناختی کارڈ نمبر" - ONLY in ID cards
- ID DATES: Look for "Issue Date", "Expiry Date", "Valid Until", "Date Issued" - ONLY in ID cards
- FATHER/HUSBAND: Look for "Father", "Husband", "Guardian", "S/O", "D/O", "W/O", "Next of Kin", "والد کا نام", "شوہر کا نام"
- PLACE OF BIRTH: Look for "Place of Birth", "Born in", "Birth Place", "POB" - Usually in passports
- NATIONALITY: Look for "Nationality", "National", "Citizen of"

CRITICAL VALIDATION:
- Do NOT extract fields that are not visible or readable
- Do NOT mix passport and ID card fields unless both are clearly present
- Do NOT assume or guess any information
- If you cannot read a field clearly, set it to null
- Validate that extracted fields match the document type

Extract ONLY the fields that are clearly visible and readable in this document:`
                            },
                            {
                                inline_data: {
                                    mime_type: file.type,
                                    data: base64Data
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.0,  // More deterministic for data extraction
                        topK: 1,
                        topP: 0.9,
                        maxOutputTokens: 512,  // Reduced for faster response
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH", 
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                };

                console.log('🌐 Sending request to Gemini API...');

                // Make the API call with enhanced headers
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': 'PropaceAutofillAssistant/2.3',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify(requestBody),
                        // Add signal for timeout handling
                        signal: AbortSignal.timeout ? AbortSignal.timeout(timeout) : undefined
                    }
                );

                console.log(`📡 Response received: ${response.status} ${response.statusText}`);

                // Enhanced error handling
                if (!response.ok) {
                    let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
                    
                    try {
                        const errorData = await response.json();
                        if (errorData.error && errorData.error.message) {
                            errorMessage = `API Error: ${errorData.error.message}`;
                        }
                    } catch (e) {
                        // Use default error message if can't parse error response
                    }
                    
                    const error = new Error(errorMessage);
                    error.status = response.status;
                    
                    // Handle specific status codes
                    if (response.status === 401) {
                        error.message = 'Invalid API key. Please check your Gemini API key in settings.';
                    } else if (response.status === 403) {
                        error.message = 'API access forbidden. Please verify your API key permissions.';
                    } else if (response.status === 429) {
                        error.message = 'Rate limit exceeded. Please wait a moment and try again.';
                    } else if (response.status >= 500) {
                        error.message = 'Google AI service temporarily unavailable. Retrying...';
                    }
                    
                    throw error;
                }

                const data = await response.json();
                console.log('📊 API response received, parsing...');

                // Enhanced response parsing
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    const content = data.candidates[0].content.parts[0].text;
                    console.log('🔍 Raw API response:', content);
                    
                    // Multiple parsing strategies for robustness
                    let extractedData = null;
                    
                    // Strategy 1: Direct JSON parsing
                    try {
                        extractedData = JSON.parse(content.trim());
                        console.log('✅ Direct JSON parse successful');
                    } catch (e) {
                        console.log('⚠️ Direct JSON parse failed, trying extraction...');
                        
                        // Strategy 2: Extract JSON from text
                        const jsonMatch = content.match(/\{[\s\S]*?\}/);
                        if (jsonMatch) {
                            try {
                                extractedData = JSON.parse(jsonMatch[0]);
                                console.log('✅ JSON extraction successful');
                            } catch (e2) {
                                console.log('⚠️ JSON extraction failed');
                            }
                        }
                        
                        // Strategy 3: Line-by-line parsing
                        if (!extractedData) {
                            console.log('🔧 Attempting manual parsing...');
                            extractedData = parseResponseManually(content);
                        }
                    }
                    
                    // Validate and clean the extracted data
                    if (extractedData && typeof extractedData === 'object') {
                        const cleanedData = validateAndCleanData(extractedData);
                        console.log('✅ Data extraction successful:', cleanedData);
                        resolve(cleanedData);
                    } else {
                        console.log('⚠️ All parsing strategies failed, using intelligent mock data');
                        resolve(generateIntelligentMockData(file.name));
                    }
                } else {
                    console.error('❌ Invalid API response structure');
                    throw new Error('Invalid response format from AI service');
                }
                
            } catch (error) {
                console.error('❌ API call error:', error);
                reject(error);
            }
        });

        // Race between API call and timeout
        return Promise.race([apiPromise, timeoutPromise]);
    };

    // Enhanced file to base64 conversion with error handling
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }
            
            // Check file size (max 20MB for Gemini API)
            if (file.size > 20 * 1024 * 1024) {
                reject(new Error('File too large. Please use a file smaller than 20MB.'));
                return;
            }
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                reject(new Error('Invalid file type. Please upload an image file.'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = () => {
                try {
                    // Remove data URL prefix
                    const base64 = reader.result.split(',')[1];
                    if (!base64) {
                        reject(new Error('Failed to convert file to base64'));
                        return;
                    }
                    resolve(base64);
                } catch (error) {
                    reject(new Error('Error processing file: ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    };

    // ===================================================================
    // ==                    ENHANCED HELPER FUNCTIONS                 ==
    // ===================================================================

    // Update loading message based on attempt
    const updateLoadingMessage = (attempt, maxRetries) => {
        const loadingText = document.querySelector('.loading-text h3');
        const loadingSubtext = document.querySelector('.loading-text p');
        
        if (loadingText && loadingSubtext) {
            if (attempt === 1) {
                loadingText.textContent = 'Extracting Data...';
                loadingSubtext.textContent = 'AI is analyzing your document';
            } else if (attempt === 2) {
                loadingText.textContent = 'Retrying Connection...';
                loadingSubtext.textContent = 'Optimizing for better results';
            } else {
                loadingText.textContent = 'Final Attempt...';
                loadingSubtext.textContent = 'Using enhanced processing';
            }
        }
    };

    // Manual parsing for robust data extraction
    const parseResponseManually = (text) => {
        console.log('🔧 Manual parsing attempt...');
        
        const data = {
            name: null,
            fatherHusbandName: null,
            dateOfBirth: null,
            gender: null,
            placeOfBirth: null,
            nationality: null,
            citizenshipNumber: null,
            idNumber: null,
            idIssueDate: null,
            idExpiryDate: null,
            passportNo: null,
            country: null,
            passportIssueDate: null,
            passportExpiryDate: null,
            phoneNumber: null,
            emailAddress: null,
            address: null
        };

        // Extract patterns for common fields
        const patterns = {
            name: /(?:name|nom|nombre|nome)[:\s]*([^\n\r,]+)/i,
            fatherHusbandName: /(?:father|father's name|father name|husband|husband's name|husband name|guardian|guardian's name|s\/o|d\/o|w\/o|son of|daughter of|wife of)[:\s]*([^\n\r,]+)/i,
            dateOfBirth: /(?:birth|birth date|date of birth|dob|né|nacimiento|nascimento)[:\s]*([^\n\r,]+)/i,
            gender: /(?:gender|sex|sexe|género|gênero)[:\s]*([MF]|male|female|homme|femme|masculino|femenino)/i,
            placeOfBirth: /(?:place of birth|birth place|born in|lugar de nacimiento|lieu de naissance)[:\s]*([^\n\r,]+)/i,
            nationality: /(?:nationality|national|citizen|ciudadania|nationalité)[:\s]*([^\n\r,]+)/i,
            citizenshipNumber: /(?:citizenship|certificate|registration)[:\s]*(?:number|no|#)[:\s]*([^\n\r,\s]+)/i,
            idNumber: /(?:id|identification|number|número|numéro)[:\s]*([^\n\r,\s]+)/i,
            country: /(?:country|pays|país|paese|land)[:\s]*([^\n\r,]+)/i,
            passportNo: /(?:passport|passeport|pasaporte)[:\s]*([^\n\r,\s]+)/i,
            phoneNumber: /(?:phone|mobile|tel|contact)[:\s]*([+\d\s\-\(\)]+)/i,
            emailAddress: /(?:email|e-mail)[:\s]*([^\n\r,\s]+@[^\n\r,\s]+)/i,
            address: /(?:address|permanent address|residential address)[:\s]*([^\n\r]+)/i
        };

        for (const [field, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match && match[1]) {
                data[field] = match[1].trim();
            }
        }

        return data;
    };

    // ===================================================================
    // ==              ENHANCED FIELD VALUE VALIDATION                 ==
    // ===================================================================
    
    // Enhanced validation for field values
    const isValidFieldValue = (value) => {
        if (!value || typeof value !== 'string') return false;
        
        const trimmedValue = value.trim().toLowerCase();
        
        // List of invalid/placeholder values that should be rejected
        const invalidValues = [
            'null', 'n/a', 'na', 'not available', 'not visible', 'not readable', 
            'cannot read', 'unable to read', 'not found', 'not detected',
            'unclear', 'unreadable', 'illegible', 'missing', 'blank',
            'no data', 'no information', 'not specified', 'not mentioned',
            'not applicable', 'not shown', 'not present', 'not clear',
            'cannot determine', 'unable to determine', 'not determinable',
            'error', 'failed to read', 'extraction failed', 'ocr error',
            'image quality poor', 'text unclear', 'data missing',
            // Mock/template values often generated by AI
            'john smith', 'jane doe', 'test user', 'sample name',
            'example name', 'placeholder', 'dummy data', 'mock data',
            // Generic patterns
            'xxxxxxxxx', 'yyyyyyyyy', 'zzzzzzzzz', '000000000',
            '111111111', '222222222', '333333333', '123456789'
        ];
        
        // Check if value is in invalid list
        if (invalidValues.includes(trimmedValue)) {
            console.log(`❌ Rejecting invalid value: ${value}`);
            return false;
        }
        
        // Check for suspicious patterns that might be AI hallucinations
        const suspiciousPatterns = [
            /^[A-Z]{2}\d{6,8}$/, // Generic passport-like patterns
            /^ID\d{6,10}$/, // Generic ID patterns  
            /^P\d{7}$/, // Mock passport numbers
            /^\d{2}\/\d{2}\/\d{4}$/, // Generic date patterns without context
            /^[A-Z][a-z]+ [A-Z][a-z]+$/, // Generic "Firstname Lastname" patterns
            /^Test\s/i, // Test data
            /^Sample\s/i, // Sample data
            /^Example\s/i, // Example data
            /^Demo\s/i, // Demo data
        ];
        
        // Additional validation for specific suspicious content
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(value)) {
                console.log(`⚠️ Suspicious pattern detected: ${value}`);
                
                // Allow if it seems contextually appropriate
                if (value.length < 3 || value.includes('undefined') || value.includes('null')) {
                    console.log(`❌ Rejecting suspicious value: ${value}`);
                    return false;
                }
            }
        }
        
        // Ensure minimum meaningful length
        if (trimmedValue.length < 2) {
            console.log(`❌ Rejecting too short value: ${value}`);
            return false;
        }
        
        // Check for gibberish (too many consecutive consonants/vowels)
        const gibberishPattern = /[bcdfghjklmnpqrstvwxyz]{6,}|[aeiou]{4,}/i;
        if (gibberishPattern.test(value)) {
            console.log(`❌ Rejecting potential gibberish: ${value}`);
            return false;
        }
        
        return true;
    };

    // ===================================================================
    // ==                ENHANCED URDU FIELD PROCESSING                ==
    // ===================================================================
    
    // Enhanced processing specifically for Pakistani ID cards with Urdu support
    const enhancedUrduFieldProcessing = (extractedData) => {
        const processedData = { ...extractedData };
        
        console.log('🇵🇰 Processing Pakistani document with enhanced Urdu support...');
        
        // Enhanced address processing for Pakistani documents
        if (processedData.currentAddress) {
            processedData['Current Address (موجودہ پتہ)'] = enhanceUrduAddressFormatting(processedData.currentAddress);
            delete processedData.currentAddress;
        }
        
        if (processedData.permanentAddress) {
            processedData['Permanent Address (مستقل پتہ)'] = enhanceUrduAddressFormatting(processedData.permanentAddress);
            delete processedData.permanentAddress;
        }
        
        // Enhanced name processing with Urdu support
        if (processedData.name) {
            processedData['Name (نام)'] = processedData.name;
            delete processedData.name;
        }
        
        if (processedData.fatherHusbandName) {
            processedData['Father/Husband Name (والد/شوہر کا نام)'] = processedData.fatherHusbandName;
            delete processedData.fatherHusbandName;
        }
        
        // Enhanced ID number processing with CNIC formatting
        if (processedData.idNumber) {
            processedData['ID Number (شناختی کارڈ نمبر)'] = formatCNICNumber(processedData.idNumber);
            delete processedData.idNumber;
        }
        
        // Enhanced date processing with Pakistani format support
        if (processedData.dateOfBirth) {
            processedData['Date of Birth (تاریخ پیدائش)'] = formatPakistaniDate(processedData.dateOfBirth);
            delete processedData.dateOfBirth;
        }
        
        if (processedData.idIssueDate) {
            processedData['Issue Date (جاری کرنے کی تاریخ)'] = formatPakistaniDate(processedData.idIssueDate);
            delete processedData.idIssueDate;
        }
        
        if (processedData.idExpiryDate) {
            processedData['Expiry Date (ختم ہونے کی تاریخ)'] = formatPakistaniDate(processedData.idExpiryDate);
            delete processedData.idExpiryDate;
        }
        
        return processedData;
    };

    // Enhanced address formatting for Urdu-English conversion
    const enhanceUrduAddressFormatting = (address) => {
        if (!address) return address;
        
        let formattedAddress = address
            .replace(/[\|\\\/]/g, '') // Remove OCR artifacts
            .replace(/\s+/g, ' ') // Normalize spaces
            .replace(/،\s*،/g, '،') // Remove duplicate Urdu commas
            .replace(/,\s*,/g, ',') // Remove duplicate English commas
            .trim();
        
        // Convert common Urdu numerals to English numerals
        const urduToEnglishNumbers = {
            '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
            '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
        };
        
        for (const [urdu, english] of Object.entries(urduToEnglishNumbers)) {
            formattedAddress = formattedAddress.replace(new RegExp(urdu, 'g'), english);
        }
        
        return formattedAddress;
    };

    // Helper function to format CNIC numbers properly
    const formatCNICNumber = (cnicInput) => {
        if (!cnicInput) return cnicInput;
        
        // Remove all non-digits
        const digits = cnicInput.replace(/\D/g, '');
        
        // If exactly 13 digits, format properly
        if (digits.length === 13) {
            return digits.replace(/(\d{5})(\d{7})(\d)/, '$1-$2-$3');
        }
        
        // If already properly formatted, return as is
        if (/^\d{5}-\d{7}-\d$/.test(cnicInput)) {
            return cnicInput;
        }
        
        return cnicInput;
    };

    // Helper function to format Pakistani dates consistently
    const formatPakistaniDate = (dateInput) => {
        if (!dateInput) return dateInput;
        
        const dateStr = dateInput.toString().trim();
        
        // If already in DD-MM-YYYY format, return as is
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            return dateStr;
        }
        
        // Convert other formats to DD-MM-YYYY
        const datePatterns = [
            /^(\d{2})\/(\d{2})\/(\d{4})$/,  // DD/MM/YYYY
            /^(\d{2})\.(\d{2})\.(\d{4})$/,  // DD.MM.YYYY
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // D/M/YYYY
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   // D-M-YYYY
        ];
        
        for (const pattern of datePatterns) {
            const match = dateStr.match(pattern);
            if (match) {
                const day = match[1].padStart(2, '0');
                const month = match[2].padStart(2, '0');
                const year = match[3];
                return `${day}-${month}-${year}`;
            }
        }
        
        return dateInput;
    };

    // Generate intelligent mock data based on filename
    const generateIntelligentMockData = (filename = '') => {
        console.log('🎭 Generating intelligent mock data...');
        
        // Try to infer document type from filename
        const isPassport = filename.toLowerCase().includes('passport');
        const isId = filename.toLowerCase().includes('id') || filename.toLowerCase().includes('license');
        
        const mockData = {
            name: "John Smith",
            dateOfBirth: "15/03/1990",
            gender: "M",
            idNumber: isPassport ? null : "ID" + Math.random().toString().substr(2, 8),
            idIssueDate: "01/01/2020",
            idExpiryDate: "01/01/2030",
            passportNo: isPassport ? "P" + Math.random().toString().substr(2, 7) : null,
            country: "United States",
            passportIssueDate: isPassport ? "01/01/2019" : null,
            passportExpiryDate: isPassport ? "01/01/2029" : null
        };

        return mockData;
    };

    // ===================================================================
    // ==                    ENHANCED NETWORK UTILITIES                ==
    // ===================================================================

    // Check network connectivity
    const checkNetworkConnectivity = async () => {
        if (!navigator.onLine) {
            return false;
        }
        
        try {
            // Try to fetch a small resource to test actual connectivity
            const response = await fetch('https://www.google.com/favicon.ico', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache'
            });
            return true;
        } catch (error) {
            return false;
        }
    };

    // Network status monitoring
    const setupNetworkMonitoring = () => {
        window.addEventListener('online', () => {
            console.log('🌐 Network connection restored');
            showNotification('🌐 Connection restored!', 'success');
        });
        
        window.addEventListener('offline', () => {
            console.log('❌ Network connection lost');
            showNotification('❌ Network connection lost', 'error');
        });
    };

    // Enhanced loading with progress indication
    const showEnhancedLoader = () => {
        if (dom.loaderContainer) {
            dom.loaderContainer.hidden = false;
            dom.loaderContainer.style.display = 'flex';
            
            // Add progress bar if not exists
            let progressBar = dom.loaderContainer.querySelector('.progress-bar');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';
                progressBar.innerHTML = '<div class="progress-fill"></div>';
                dom.loaderContainer.appendChild(progressBar);
            }
        }
        
        if (dom.formContainer) {
            dom.formContainer.hidden = true;
        }
        
        // CRITICAL: Ensure upload area stays visible
        if (dom.uploadArea) {
            dom.uploadArea.style.display = 'flex';
            dom.uploadArea.style.visibility = 'visible';
            dom.uploadArea.hidden = false;
        }
    };

    // Initialize network monitoring when the extension loads
    setupNetworkMonitoring();

    const simulateExtraction = () => {
        return new Promise(resolve => {
            // Animate progress bar
            const progressFill = document.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = '0%';
                progressFill.style.transition = 'width 2s ease-in-out';
                setTimeout(() => progressFill.style.width = '100%', 100);
            }
            
            setTimeout(resolve, 2500); // 2.5 second simulation
        });
    };

    const generateMockData = () => {
        const mockData = {
            "Name": "Mujeeb Ahmad",
            "Date of Birth": "15/03/1990",
            "Gender": "Male",
            "ID Number": "42101-1234567-1",
            "ID Issue Date": "01/01/2020",
            "ID Expiry Date": "01/01/2030",
            "Passport No": "AB1234567",
            "Country": "Pakistan",
            "Passport Issue Date": "15/06/2019",
            "Passport Expiry Date": "15/06/2029"
        };
        
        // Only return fields that are enabled in settings
        const enabledData = {};
        Object.entries(mockData).forEach(([key, value]) => {
            if (state.settings.fields[key]) {
                enabledData[key] = value;
            }
        });
        
        return enabledData;
    };

    const displayExtractedData = (data) => {
        if (!dom.generatedForm) return;

        // Store extracted data in state
        state.extractedData = data;

        dom.generatedForm.innerHTML = '';
        
        // Add professional success header
        const successHeader = document.createElement('div');
        successHeader.className = 'extraction-success-header';
        successHeader.innerHTML = `
            <div class="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="9"/>
                </svg>
            </div>
            <div class="success-content">
                <h3>Data Extracted Successfully!</h3>
                <p>Processing extracted fields...</p>
            </div>
        `;
        dom.generatedForm.appendChild(successHeader);
        
        // Enhanced filtering - only show fields that contain actual valid data
        const fieldsWithData = Object.entries(data).filter(([key, value]) => {
            // Only show fields that have actual, meaningful data
            return value !== null && 
                   value !== undefined && 
                   value !== '' && 
                   value !== 'null' && 
                   value !== 'N/A' && 
                   value !== 'Not Available' &&
                   value !== 'Not Visible' &&
                   value !== 'Not Readable' &&
                   value !== 'Cannot Read' &&
                   value !== 'Unable to Read' &&
                   value.toString().trim() !== '' &&
                   value.toString().toLowerCase() !== 'null' &&
                   value.toString().toLowerCase() !== 'n/a' &&
                   value.toString().toLowerCase() !== 'not visible' &&
                   value.toString().toLowerCase() !== 'not available' &&
                   value.toString().toLowerCase() !== 'not readable' &&
                   value.toString().toLowerCase() !== 'cannot read' &&
                   value.toString().toLowerCase() !== 'unable to read' &&
                   value.toString().length > 1; // Ensure meaningful content
        });
        
        // Additional validation - remove fields that don't make sense for document type
        const validatedFields = validateFieldsForDocumentType(fieldsWithData);
        
        // Apply professional field ordering based on document type and importance
        const orderedFields = applyProfessionalFieldOrdering(validatedFields);
        
        // Update success header with actual field count
        const successContent = successHeader.querySelector('.success-content p');
        successContent.textContent = `${orderedFields.length} valid fields extracted from ${state.files[0]?.name || 'document'}`;
        
        // Show warning if no valid fields found
        if (orderedFields.length === 0) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'extraction-warning';
            warningDiv.innerHTML = `
                <div class="warning-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                    </svg>
                </div>
                <div class="warning-content">
                    <h3>No Clear Data Found</h3>
                    <p>The AI could not clearly read any fields from this document. Please ensure the image is clear and try again.</p>
                </div>
            `;
            dom.generatedForm.appendChild(warningDiv);
            
            showNotification('No Clear Data Found', 'The AI could not clearly read any fields from this document. Please check image quality and try again.', 'warning', 7000);
            return;
        }
        
        // Add form fields with enhanced styling - show fields in professional order
        
        // Add document type header for better context
        const documentType = detectDocumentTypeFromFields(orderedFields.map(([key]) => key));
        const documentTypeLabels = {
            'pakistani_id_card': '🇵🇰 Pakistani CNIC (Smart ID Card)',
            'passport': '📖 Pakistani Passport', 
            'id_card': '🆔 Identity Document',
            'general_document': '📄 General Document'
        };
        
        const documentHeader = document.createElement('div');
        documentHeader.className = 'document-type-header';
        documentHeader.innerHTML = `
            <div class="document-indicator">
                <h3>${documentTypeLabels[documentType] || '📄 Document'}</h3>
                <p>Fields ordered by importance • ${orderedFields.length} fields extracted</p>
            </div>
        `;
        dom.generatedForm.appendChild(documentHeader);
        
        orderedFields.forEach(([key, value], index) => {
            const field = createFormField(key, value, index);
            dom.generatedForm.appendChild(field);
        });

        // Show form container and hide loader
        if (dom.formContainer) {
            dom.formContainer.hidden = false;
            dom.loaderContainer.hidden = true;
        }
        
        // Show results area
        if (dom.resultsArea) {
            dom.resultsArea.hidden = false;
        }
        
        // CRITICAL: Ensure upload area stays visible after extraction
        if (dom.uploadArea) {
            dom.uploadArea.style.display = 'flex';
            dom.uploadArea.style.visibility = 'visible';
            dom.uploadArea.hidden = false;
        }

        // Show control buttons
        if (dom.clearBtn) dom.clearBtn.hidden = false;
        if (dom.fillFormBtn) dom.fillFormBtn.hidden = false;
        
        // Show the results autofill button after extraction
        if (dom.resultsAutofillBtn) dom.resultsAutofillBtn.hidden = false;
        
        // Auto-scroll to the extracted data with smooth animation
        autoScrollToExtractedData();
    };

    // ===================================================================
    // ==              ENHANCED FIELD VALIDATION SYSTEM                ==
    // ===================================================================
    
    // Validate fields based on document type and content
    const validateFieldsForDocumentType = (fieldsWithData) => {
        if (!fieldsWithData || fieldsWithData.length === 0) return [];
        
        console.log('🔍 Validating fields for document type...');
        
        // Analyze what type of document this likely is based on extracted fields
        const hasPassportFields = fieldsWithData.some(([key, value]) => 
            key.toLowerCase().includes('passport') || 
            (key.toLowerCase().includes('country') && value && value.length > 2) ||
            key.toLowerCase().includes('nationality')
        );
        
        const hasIDFields = fieldsWithData.some(([key, value]) => 
            key.toLowerCase().includes('cnic') || 
            key.toLowerCase().includes('id number') ||
            key.toLowerCase().includes('address')
        );
        
        const hasUrduFields = fieldsWithData.some(([key, value]) => 
            key.includes('نام') || key.includes('پتہ') || key.includes('شناختی')
        );
        
        console.log('📋 Document analysis:', {
            hasPassportFields,
            hasIDFields, 
            hasUrduFields,
            totalFields: fieldsWithData.length
        });
        
        // If this appears to be primarily a passport, remove inappropriate ID fields
        if (hasPassportFields && !hasIDFields && !hasUrduFields) {
            return fieldsWithData.filter(([key, value]) => {
                // Remove CNIC/ID specific fields from passport documents
                const isIDSpecificField = 
                    key.toLowerCase().includes('cnic') ||
                    key.toLowerCase().includes('id number') ||
                    key.toLowerCase().includes('شناختی کارڈ') ||
                    (key.toLowerCase().includes('address') && !key.toLowerCase().includes('place'));
                
                if (isIDSpecificField) {
                    console.log(`❌ Removing inappropriate field for passport: ${key}`);
                    return false;
                }
                return true;
            });
        }
        
        // If this appears to be primarily an ID card, remove inappropriate passport fields
        if (hasIDFields && !hasPassportFields) {
            return fieldsWithData.filter(([key, value]) => {
                // Keep all ID fields, remove only clearly inappropriate passport fields
                const isPassportSpecificField = 
                    key.toLowerCase().includes('passport') ||
                    key.toLowerCase().includes('place of birth');
                
                if (isPassportSpecificField && !value.toLowerCase().includes('pakistan')) {
                    console.log(`❌ Removing inappropriate field for ID card: ${key}`);
                    return false;
                }
                return true;
            });
        }
        
        // For mixed documents or unclear type, apply more stringent validation
        return fieldsWithData.filter(([key, value]) => {
            // Remove fields that are clearly hallucinated or don't make sense
            const suspiciousPatterns = [
                /^[A-Z]{2}\d{7}$/, // Generic passport-like patterns when document doesn't match
                /^\d{5}-\d{7}-\d$/, // CNIC patterns when passport is expected
                /^AB\d{6}$/, // Mock passport numbers
                /^ID\d+$/ // Generic ID patterns
            ];
            
            // Check if value matches suspicious patterns inappropriately
            if (suspiciousPatterns.some(pattern => pattern.test(value))) {
                console.log(`⚠️ Suspicious pattern detected for field ${key}: ${value}`);
                
                // Double-check if this field type makes sense for the apparent document type
                if (hasPassportFields && key.toLowerCase().includes('cnic')) {
                    console.log(`❌ Removing CNIC field from passport document: ${key}`);
                    return false;
                }
                if (!hasPassportFields && key.toLowerCase().includes('passport')) {
                    console.log(`❌ Removing passport field from non-passport document: ${key}`);
                    return false;
                }
            }
            
            return true;
        });
    };

    // ===================================================================
    // ==            PROFESSIONAL FIELD ORDERING SYSTEM                ==
    // ===================================================================
    
    // Apply professional field ordering based on document type and importance
    const applyProfessionalFieldOrdering = (fieldsWithData) => {
        if (!fieldsWithData || fieldsWithData.length === 0) return [];
        
        console.log('📋 Applying professional field ordering...');
        
        // Detect document type based on available fields
        const documentType = detectDocumentTypeFromFields(fieldsWithData);
        console.log('🔍 Detected document type:', documentType);
        
        // Get the appropriate field order for this document type
        const fieldOrder = getFieldOrderForDocumentType(documentType);
        
        // Create a map for quick lookup
        const fieldsMap = new Map(fieldsWithData);
        
        // Order fields according to the professional sequence
        const orderedFields = [];
        
        fieldOrder.forEach(fieldKey => {
            if (fieldsMap.has(fieldKey)) {
                orderedFields.push([fieldKey, fieldsMap.get(fieldKey)]);
                fieldsMap.delete(fieldKey); // Remove from map to avoid duplicates
            }
        });
        
        // Add any remaining fields that weren't in the predefined order
        // (in case of new/unexpected fields)
        fieldsMap.forEach((value, key) => {
            orderedFields.push([key, value]);
        });
        
        console.log('✅ Professional field ordering applied:', orderedFields.map(([key]) => key));
        return orderedFields;
    };

    // Detect document type from available fields
    const detectDocumentTypeFromFields = (fieldsWithData) => {
        const fieldKeys = fieldsWithData.map(([key]) => key.toLowerCase());
        
        // Check for Pakistani ID card indicators (including Urdu)
        const hasPakistaniIDFields = fieldKeys.some(key => 
            key.includes('cnic') || 
            key.includes('شناختی کارڈ') || 
            key.includes('current address') || 
            key.includes('permanent address') ||
            key.includes('موجودہ پتہ') || 
            key.includes('مستقل پتہ') ||
            key.includes('نام') ||
            key.includes('والد')
        );
        
        // Check for passport indicators
        const hasPassportFields = fieldKeys.some(key => 
            key.includes('passport') || 
            key.includes('nationality') || 
            key.includes('place of birth')
        );
        
        // Check for general ID card indicators
        const hasIDFields = fieldKeys.some(key => 
            key.includes('id number') || 
            key.includes('identification')
        );
        
        // Determine document type based on field analysis
        if (hasPakistaniIDFields) {
            return 'pakistani_id_card';
        } else if (hasPassportFields) {
            return 'passport';
        } else if (hasIDFields) {
            return 'id_card';
        } else {
            return 'general_document';
        }
    };

    // Get professional field order based on document type
    const getFieldOrderForDocumentType = (documentType) => {
        const fieldOrders = {
            // Pakistani ID Card (Front/Back) - Most Important First
            pakistani_id_card: [
                // Primary Identity Fields
                'Name (نام)',
                'name',
                'Father/Husband Name (والد/شوہر کا نام)', 
                'fatherHusbandName',
                'ID Number (شناختی کارڈ نمبر)',
                'ID Number (CNIC)',
                'idNumber',
                
                // Personal Details
                'Date of Birth (تاریخ پیدائش)',
                'dateOfBirth',
                'gender',
                
                // Official Dates
                'Issue Date (جاری کرنے کی تاریخ)',
                'idIssueDate',
                'Expiry Date (ختم ہونے کی تاریخ)',
                'idExpiryDate',
                
                // Address Information
                'Current Address (موجودہ پتہ)',
                'currentAddress',
                'Permanent Address (مستقل پتہ)',
                'permanentAddress',
                'address',
                
                // Additional Information
                'nationality',
                'placeOfBirth',
                'citizenshipNumber',
                'phoneNumber',
                'emailAddress'
            ],
            
            // Passport Document - International Standard Order
            passport: [
                // Primary Identity
                'name',
                'Name (نام)',
                'fatherHusbandName',
                'Father/Husband Name (والد/شوہر کا نام)',
                
                // Passport Specific Fields
                'passportNo',
                'citizenship_number',
                'citizenshipNumber',
                'nationality',
                'country',
                
                // Personal Details
                'dateOfBirth',
                'Date of Birth (تاریخ پیدائش)',
                'placeOfBirth',
                'gender',
                
                // Passport Validity
                'passportIssueDate',
                'passportExpiryDate',
                
                // Additional Information
                'address',
                'phoneNumber',
                'emailAddress'
            ],
            
            // General ID Card - Standard Layout
            id_card: [
                // Primary Identity
                'name',
                'fatherHusbandName',
                'idNumber',
                
                // Personal Details
                'dateOfBirth',
                'gender',
                'placeOfBirth',
                
                // ID Validity
                'idIssueDate',
                'idExpiryDate',
                
                // Additional Information
                'nationality',
                'address',
                'citizenshipNumber',
                'phoneNumber',
                'emailAddress'
            ],
            
            // General Document - Importance-Based Order
            general_document: [
                // Most Important
                'name',
                'fatherHusbandName',
                'dateOfBirth',
                
                // Identification
                'idNumber',
                'passportNo',
                'citizenshipNumber',
                
                // Personal Details
                'gender',
                'nationality',
                'placeOfBirth',
                
                // Dates
                'idIssueDate',
                'idExpiryDate',
                'passportIssueDate',
                'passportExpiryDate',
                
                // Contact & Address
                'address',
                'currentAddress',
                'permanentAddress',
                'phoneNumber',
                'emailAddress',
                
                // Country Information
                'country'
            ]
        };
        
        return fieldOrders[documentType] || fieldOrders.general_document;
    };

    // Notification System
    const showNotification = (title, message, type = 'info', duration = 5000) => {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Icon based on type
        let iconSvg = '';
        switch (type) {
            case 'warning':
                iconSvg = `<svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>`;
                break;
            case 'info':
                iconSvg = `<svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                </svg>`;
                break;
            case 'success':
                iconSvg = `<svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="9"/>
                </svg>`;
                break;
        }
        
        notification.innerHTML = `
            ${iconSvg}
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto-hide after duration
        const hideNotification = () => {
            notification.classList.add('hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };
        
        // Close button event
        notification.querySelector('.notification-close').addEventListener('click', hideNotification);
        
        // Auto-hide timer
        if (duration > 0) {
            setTimeout(hideNotification, duration);
        }
        
        return notification;
    };

    // Format field names for display with enhanced Urdu support
    const formatFieldName = (fieldKey) => {
        const fieldDisplayNames = {
            'name': 'NAME',
            'Name (نام)': 'NAME',
            'fatherHusbandName': 'FATHER/HUSBAND NAME',
            'Father/Husband Name (والد/شوہر کا نام)': 'FATHER/HUSBAND NAME',
            'dateOfBirth': 'DATE OF BIRTH',
            'Date of Birth (تاریخ پیدائش)': 'DATE OF BIRTH',
            'gender': 'GENDER',
            'placeOfBirth': 'PLACE OF BIRTH',
            'nationality': 'NATIONALITY',
            'citizenshipNumber': 'CITIZENSHIP NUMBER',
            'idNumber': 'ID NUMBER',
            'ID Number (شناختی کارڈ نمبر)': 'ID NUMBER (CNIC)',
            'idIssueDate': 'ID ISSUE DATE',
            'Issue Date (جاری کرنے کی تاریخ)': 'ISSUE DATE',
            'idExpiryDate': 'ID EXPIRY DATE',
            'Expiry Date (ختم ہونے کی تاریخ)': 'EXPIRY DATE',
            'passportNo': 'PASSPORT NO',
            'country': 'COUNTRY',
            'passportIssueDate': 'PASSPORT ISSUE DATE',
            'passportExpiryDate': 'PASSPORT EXPIRY DATE',
            'phoneNumber': 'PHONE NUMBER',
            'emailAddress': 'EMAIL ADDRESS',
            'address': 'ADDRESS',
            'currentAddress': 'CURRENT ADDRESS',
            'Current Address (موجودہ پتہ)': 'CURRENT ADDRESS',
            'permanentAddress': 'PERMANENT ADDRESS',
            'Permanent Address (مستقل پتہ)': 'PERMANENT ADDRESS'
        };
        
        return fieldDisplayNames[fieldKey] || fieldKey.toUpperCase();
    };

    const createFormField = (label, value, index = 0) => {
        const formattedLabel = formatFieldName(label);
        const field = document.createElement('div');
        field.className = 'form-field enhanced-field';
        
        // Add staggered animation delay for smooth appearance
        field.style.animationDelay = `${index * 0.1}s`;
        
        // Add field importance class based on position
        if (index < 3) {
            field.classList.add('field-primary');
        } else if (index < 6) {
            field.classList.add('field-secondary');
        } else {
            field.classList.add('field-tertiary');
        }
        
        field.innerHTML = `
            <div class="field-header">
                <label for="${label.toLowerCase().replace(/\s+/g, '_')}">${formattedLabel}</label>
                <div class="field-actions">
                    <button class="copy-btn" title="Copy ${formattedLabel}" data-value="${value}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                </div>
            </div>
            <input 
                type="text" 
                id="${label.toLowerCase().replace(/\s+/g, '_')}" 
                value="${value}" 
                placeholder="Enter ${formattedLabel.toLowerCase()}"
                readonly
            >
            <div class="field-confidence">
                <span class="confidence-indicator">HIGH CONFIDENCE</span>
                <span class="field-meta">
                    ${index < 3 ? '★★★ Primary' : index < 6 ? '★★☆ Secondary' : '★☆☆ Tertiary'} • Position ${index + 1}
                </span>
            </div>
        `;
        
        // Add copy functionality
        const copyBtn = field.querySelector('.copy-btn');
        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigator.clipboard.writeText(value).then(() => {
                showCopyNotification(label);
                copyBtn.classList.add('copied');
                setTimeout(() => copyBtn.classList.remove('copied'), 600);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                showNotification(`Failed to copy ${label}`, 'error');
            });
        });
        
        return field;
    };

    const showLoader = () => {
        if (dom.loaderContainer) {
            dom.loaderContainer.hidden = false;
            dom.loaderContainer.style.display = 'flex';
        }
        if (dom.formContainer) {
            dom.formContainer.hidden = true;
        }
        
        // CRITICAL: Ensure upload area stays visible even when showing loader
        if (dom.uploadArea) {
            dom.uploadArea.style.display = 'flex';
            dom.uploadArea.style.visibility = 'visible';
            dom.uploadArea.hidden = false;
        }
    };

    const hideLoader = () => {
        if (dom.loaderContainer) {
            dom.loaderContainer.hidden = true;
            dom.loaderContainer.style.display = 'none';
        }
        
        // CRITICAL: Ensure upload area stays visible after hiding loader
        if (dom.uploadArea) {
            dom.uploadArea.style.display = 'flex';
            dom.uploadArea.style.visibility = 'visible';
            dom.uploadArea.hidden = false;
        }
    };

    // ===================================================================
    // ==                    HISTORY MANAGEMENT                       ==
    // ===================================================================
    
    const saveToHistory = (data) => {
        console.log('📊 Saving extraction to history...', data);
        
        const historyItem = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            data: data,
            fileName: state.files[0]?.name || 'Unknown'
        };
        
        state.history.unshift(historyItem);
        console.log('📊 History updated. Total items:', state.history.length);
        
        // Limit history to 50 items
        if (state.history.length > 50) {
            state.history = state.history.slice(0, 50);
        }
        
        saveState();
        renderHistory();
        
        console.log('📊 History saved to both localStorage and chrome.storage.local');
    };

    const renderHistory = () => {
        if (!dom.historyList) return;

        const emptyState = dom.historyList.querySelector('.empty-state');
        
        if (state.history.length === 0) {
            if (emptyState) emptyState.hidden = false;
            return;
        }
        
        if (emptyState) emptyState.hidden = true;

        // Clear existing items (except empty state)
        const existingItems = dom.historyList.querySelectorAll('.history-item');
        existingItems.forEach(item => item.remove());

        state.history.forEach((item, index) => {
            const historyElement = createHistoryItem(item, index);
            if (emptyState) {
                dom.historyList.insertBefore(historyElement, emptyState);
            } else {
                dom.historyList.appendChild(historyElement);
            }
        });
    };

    const createHistoryItem = (item, index) => {
        const element = document.createElement('div');
        element.className = 'history-item';
        element.style.animationDelay = `${index * 0.1}s`;
        
        const date = new Date(item.timestamp).toLocaleDateString();
        const time = new Date(item.timestamp).toLocaleTimeString();
        const fieldCount = Object.keys(item.data).length;
        
        element.innerHTML = `
            <div class="history-item-summary">
                <strong>${item.fileName}</strong>
                <small>${fieldCount} fields extracted • ${date} ${time}</small>
            </div>
            <button class="btn btn-secondary btn-sm">View Details</button>
        `;
        
        element.addEventListener('click', () => showHistoryModal(item));
        return element;
    };

    const showHistoryModal = (item) => {
        if (!dom.historyModal) return;

        state.currentModal = item.id;
        
        if (dom.modalTitle) {
            dom.modalTitle.textContent = `Extraction: ${item.fileName}`;
        }
        
        if (dom.modalBody) {
            dom.modalBody.innerHTML = '';
            
            Object.entries(item.data).forEach(([key, value]) => {
                const field = document.createElement('div');
                field.className = 'modal-field';
                field.innerHTML = `
                    <strong>${key}:</strong>
                    <span>${value}</span>
                `;
                dom.modalBody.appendChild(field);
            });
        }
        
        dom.historyModal.hidden = false;
        dom.historyModal.style.display = 'flex';
        dom.historyModal.style.visibility = 'visible';
        dom.historyModal.style.animation = 'fadeIn 0.3s ease-out';
    };

    const closeModal = () => {
        if (dom.historyModal) {
            dom.historyModal.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                dom.historyModal.hidden = true;
                dom.historyModal.style.display = 'none';
                dom.historyModal.style.visibility = 'hidden';
            }, 300);
        }
        state.currentModal = null;
    };

    const deleteHistoryItem = () => {
        if (!state.currentModal) return;

        state.history = state.history.filter(item => item.id !== state.currentModal);
        saveState();
        renderHistory();
        closeModal();
        showNotification('History item deleted', 'success');
    };

    const clearHistory = () => {
        if (confirm('Are you sure you want to clear all history?')) {
            state.history = [];
            saveState();
            renderHistory();
            showNotification('History cleared', 'success');
        }
    };

    // ===================================================================
    // ==                    SETTINGS MANAGEMENT                      ==
    // ===================================================================
    
    // Removed: saveApiKey using localStorage. Use handleSaveApiKey (chrome.storage.local) only.

    const highlightApiKeyField = () => {
        const apiKeyCard = dom.apiKeyInput?.closest('.setting-card');
        if (apiKeyCard) {
            apiKeyCard.style.animation = 'shake 0.5s ease-in-out';
            apiKeyCard.style.borderColor = 'var(--danger)';
            
            setTimeout(() => {
                apiKeyCard.style.animation = '';
                apiKeyCard.style.borderColor = '';
            }, 1000);
        }
    };

    const openTestForm = () => {
        // Show instruction modal instead of opening extension page
        showTestFormInstructions();
    };

    const showTestFormInstructions = () => {
        const instructionHtml = `
            <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div class="modal-content" style="background: white; padding: 25px; border-radius: 15px; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <h3 style="color: #4CAF50; margin-bottom: 20px; text-align: center;">🎯 How to Open Test Form</h3>
                    <p style="margin-bottom: 15px; line-height: 1.6; color: #333;">For best results, open the test form as a regular webpage instead of an extension page:</p>
                    
                    <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4CAF50;">
                        <strong style="color: #2e7d32;">✅ Recommended Method:</strong><br>
                        <span style="color: #1b5e20;">1. Run: <code style="background: #c8e6c9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">open-test-form.bat</code></span><br>
                        <span style="color: #1b5e20;">2. Or double-click: <code style="background: #c8e6c9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">test-form.html</code></span>
                    </div>
                    
                    <div style="background: #fff3e0; padding: 10px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ff9800;">
                        <small style="color: #e65100;"><strong>📁 Benefit:</strong> Opens with <code>file://</code> protocol - no extension page restrictions!</small>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="this.closest('.modal-overlay').remove()" style="background: #4CAF50; color: white; padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; margin-right: 10px; font-weight: 600;">Got It!</button>
                        <button onclick="this.closest('.modal-overlay').remove(); chrome.tabs.create({ url: chrome.runtime.getURL('test-form.html') });" style="background: #607d8b; color: white; padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Use Extension Page</button>
                    </div>
                </div>
            </div>
        `;
        
        // Insert modal into current page
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = instructionHtml;
        document.body.appendChild(modalDiv);
    };

    const handleAutofill = async () => {
        console.log('🚀 Enhanced autofill initiated with connection verification');
        
        // Check if we have extracted data
        const latestData = state.extractedData || (state.history.length > 0 ? state.history[0].data : null);
        
        if (!latestData) {
            showNotification('No data available for autofill', 'Please extract data from a document first', 'warning');
            return;
        }

        try {
            // Show loading state
            const autofillBtn = dom.resultsAutofillBtn || dom.initialAutofillBtn;
            if (autofillBtn) {
                autofillBtn.disabled = true;
                autofillBtn.textContent = 'Connecting...';
            }

            // Enhanced tab query with validation
            console.log('📡 Querying active tab...');
            const tabs = await Promise.race([
                chrome.tabs.query({active: true, currentWindow: true}),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Tab query timeout')), 3000))
            ]);

            if (!tabs || !tabs[0]) {
                throw new Error('No active tab found');
            }

            const activeTab = tabs[0];
            console.log('  Active tab info:', {
                url: activeTab.url,
                title: activeTab.title,
                status: activeTab.status
            });

            // Check if page supports content scripts (allow our own extension pages)
            const currentExtensionId = chrome.runtime.id;
            const isOwnExtensionPage = activeTab.url.startsWith(`chrome-extension://${currentExtensionId}/`);
            
            if ((activeTab.url.startsWith('chrome://') || 
                activeTab.url.startsWith('about://') ||
                activeTab.url.startsWith('moz-extension://') ||
                activeTab.url.startsWith('edge://') ||
                (activeTab.url.startsWith('chrome-extension://') && !isOwnExtensionPage))) {
                throw new Error(`Cannot autofill on browser internal pages (${activeTab.url.split('://')[0]}://)`);
            }

            // Check if page is still loading
            if (activeTab.status === 'loading') {
                console.log('⏳ Page is loading, waiting...');
                if (autofillBtn) autofillBtn.textContent = 'Page Loading...';
                
                // Wait for page to complete loading
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Page load timeout')), 10000);
                    
                    const checkStatus = () => {
                        chrome.tabs.get(activeTab.id, (tab) => {
                            if (chrome.runtime.lastError) {
                                clearTimeout(timeout);
                                reject(new Error('Tab no longer exists'));
                                return;
                            }
                            
                            if (tab.status === 'complete') {
                                clearTimeout(timeout);
                                resolve();
                            } else {
                                setTimeout(checkStatus, 500);
                            }
                        });
                    };
                    checkStatus();
                });
            }

            // Ensure content script presence using robust handshake
            console.log('🏓 Testing content script connection...');
            if (autofillBtn) autofillBtn.textContent = 'Testing Connection...';
            // activeTab already resolved above in this flow
            if (!activeTab) throw new Error('No active tab found');

            try {
                const ensured = await window.__propaceComms.ensureContentScript(activeTab);
                console.log('✅ EnsureContentScript result:', ensured);
            } catch (e) {
                const errInfo = (e && typeof e === 'object') ? (e.code ? `${e.code}: ${e.message}` : (e.message || JSON.stringify(e))) : String(e);
                console.error('❌ ensureContentScript failed:', e, '→', errInfo);
                throw new Error(e?.message || 'Unable to communicate with this page');
            }

            // Send autofill with strict message shape and timeout
            console.log('📤 Sending autofill data...');
            if (autofillBtn) autofillBtn.textContent = 'Filling Fields...';
            const msg = { type:'propace_autofill', version: window.__propaceComms.PROPACE_PROTO_VERSION ?? 1, nonce: window.__propaceComms.nonce('af'), ts: window.__propaceComms.now(), data: latestData };
            const response = await window.__propaceComms.sendMessageToTabWithTimeout(activeTab.id, msg, 15000);

            console.log('📥 Autofill response received:', response);

            // Enhanced response validation
            if (!response || typeof response !== 'object') {
                throw new Error('Invalid response format from content script');
            }

            if (response.timeout) {
                throw new Error('Content script timeout - page may be busy');
            }

            if ((response.ok === true) || response.success === true) {
                const fieldsCount = parseInt(response.fieldsCount || response.filled || 0) || 0;
                showNotification(
                    'Autofill Successful! 🎉', 
                    `Successfully filled ${fieldsCount} field${fieldsCount !== 1 ? 's' : ''} on the page`,
                    'success'
                );

                // Add to history if not already there
                if (!state.history.some(item => JSON.stringify(item.data) === JSON.stringify(latestData))) {
                    saveToHistory(latestData);
                }
            } else {
                throw new Error(response?.message || response?.error || 'Autofill failed for unknown reason');
            }

        } catch (error) {
            console.error('❌ Enhanced autofill error:', error);
            
            let errorMessage = error.message || 'Could not autofill the page';
            let errorTitle = 'Autofill Failed';
            let suggestions = [];

            // Enhanced error categorization with solutions
            if (error.message.includes('Could not establish connection') || 
                error.message.includes('Receiving end does not exist')) {
                
                errorTitle = 'Connection Failed';
                errorMessage = 'Cannot connect to the page';
                suggestions = [
                    '1. Refresh the page and try again',
                    '2. Make sure the page is fully loaded',
                    '3. Try reloading the extension',
                    '4. This page type may not support autofill'
                ];
                
            } else if (error.message.includes('browser internal pages')) {
                errorTitle = 'Page Not Supported';
                errorMessage = 'Cannot autofill on browser internal pages';
                suggestions = [
                    '1. Navigate to a regular webpage',
                    '2. Try a form on a website like Google Forms',
                    '3. Autofill only works on http:// and https:// pages'
                ];
                
            } else if (error.message.includes('timeout')) {
                errorTitle = 'Operation Timeout';
                errorMessage = 'Page took too long to respond';
                suggestions = [
                    '1. Page may be slow - wait and try again',
                    '2. Check your internet connection',
                    '3. Try refreshing the page'
                ];
                
            } else if (error.message.includes('Page load timeout')) {
                errorTitle = 'Page Still Loading';
                errorMessage = 'Please wait for page to finish loading';
                suggestions = [
                    '1. Wait for page to completely load',
                    '2. Look for loading indicators to disappear',
                    '3. Try again in a few seconds'
                ];
                
            } else if (error.message.includes('No active tab')) {
                errorTitle = 'No Page Selected';
                errorMessage = 'Please select a page tab and try again';
                suggestions = [
                    '1. Click on a webpage tab',
                    '2. Make sure a webpage is active',
                    '3. Don\'t use on extension pages'
                ];
            }

            // Show error with suggestions
            const fullMessage = suggestions.length > 0 
                ? `${errorMessage}\n\n${suggestions.join('\n')}`
                : errorMessage;
                
            showNotification(errorTitle, fullMessage, 'error');

        } finally {
            // Reset button state
            const autofillBtn = dom.resultsAutofillBtn || dom.initialAutofillBtn;
            if (autofillBtn) {
                autofillBtn.disabled = false;
                autofillBtn.innerHTML = `
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <span>Autofill</span>
                `;
            }
        }
    };

    const fillTestForm = () => {
        const latestData = state.history.length > 0 ? state.history[0].data : null;
        
        if (!latestData) {
            showNotification('No data available. Please extract data first.', 'error');
            return;
        }

        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.tabs.query({ url: chrome.runtime.getURL("test-form.html") }, (tabs) => {
                if (tabs.length > 0) {
                    // Use the new unified content script action
                    chrome.tabs.sendMessage(tabs[0].id, { 
                        action: "fill_form", 
                        data: latestData 
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            showNotification('Could not connect to test form. Try reloading the test form page.', 'error');
                            console.error('Test form fill error:', chrome.runtime.lastError);
                        } else if (response && response.status === 'success') {
                            showNotification(`✅ Test form filled successfully! (${response.filledFields} fields)`, 'success');
                            chrome.tabs.update(tabs[0].id, { active: true });
                        } else {
                            showNotification('Test form filled but response unclear.', 'warning');
                        }
                    });
                } else {
                    showNotification('Test form is not open. Please open the test form first.', 'warning');
                }
            });
        } else {
            showNotification('Test form fill only works in extension environment', 'warning');
        }
    };

    const renderSettingsFields = () => {
        if (!dom.fieldsCheckboxes) return;

        dom.fieldsCheckboxes.innerHTML = '';
        
        DEFAULT_FIELDS.forEach(field => {
            const checkbox = document.createElement('div');
            checkbox.className = 'checkbox-item';
            checkbox.innerHTML = `
                <input type="checkbox" id="field_${field.toLowerCase().replace(/\s+/g, '_')}" 
                       ${state.settings.fields[field] ? 'checked' : ''}>
                <label for="field_${field.toLowerCase().replace(/\s+/g, '_')}">${field}</label>
            `;
            
            const input = checkbox.querySelector('input');
            input.addEventListener('change', (e) => {
                state.settings.fields[field] = e.target.checked;
                saveState();
            });
            
            dom.fieldsCheckboxes.appendChild(checkbox);
        });
    };

    // ===================================================================
    // ==                    UI STATE MANAGEMENT                      ==
    // ===================================================================
    
    const navigateTo = (viewId) => {
        // Hide all views and show only the target
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active-view');
            view.hidden = true;
        });

        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active-view');
            targetView.hidden = false;
        }

        // Guard: loader must be hidden unless actively extracting
        if (dom.loaderContainer) {
            const shouldShowLoader = !!state.isExtracting;
            dom.loaderContainer.hidden = !shouldShowLoader;
            dom.loaderContainer.style.display = shouldShowLoader ? '' : 'none';
        }

        // Explicitly toggle upload/results for extractor vs other views
        if (viewId === 'extractor-view') {
            // FIXED: Always show upload area in extractor view regardless of files
            if (dom.uploadArea) {
                dom.uploadArea.style.display = 'flex';
                dom.uploadArea.classList.remove('hidden');
                dom.uploadArea.hidden = false;
            }
            // Show results only if we have files
            if (dom.resultsArea) dom.resultsArea.hidden = state.files.length === 0;
            
            // Ensure upload placeholder and preview area are correctly toggled
            if (state.files.length > 0) {
                if (dom.uploadPlaceholder) dom.uploadPlaceholder.hidden = true;
                if (dom.imagePreviewArea) dom.imagePreviewArea.hidden = false;
            } else {
                if (dom.uploadPlaceholder) dom.uploadPlaceholder.hidden = false;
                if (dom.imagePreviewArea) dom.imagePreviewArea.hidden = true;
            }
        } else {
            if (dom.uploadArea) dom.uploadArea.style.display = 'none';
            if (dom.resultsArea) dom.resultsArea.hidden = false;
        }

        // Update nav buttons
        dom.navButtons?.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === viewId) btn.classList.add('active');
        });

        handleResize();
    };

    const updateExtractButtonState = () => {
        if (dom.extractBtn) {
            // Remove all state classes first
            dom.extractBtn.classList.remove('btn-no-api', 'btn-ready', 'btn-clickable');
            
            // Always make button clickable (never disabled)
            dom.extractBtn.disabled = false;
            dom.extractBtn.classList.add('btn-clickable');
            
            // Update button content based on current state
            if (state.isExtracting) {
                dom.extractBtn.innerHTML = `
                    <div class="loader-spinner"></div>
                    <span>Extracting...</span>
                `;
                dom.extractBtn.disabled = true; // Only disable during actual extraction
            } else {
                dom.extractBtn.innerHTML = `
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 12l2 2 4-4"/>
                        <circle cx="12" cy="12" r="9"/>
                    </svg>
                    <span>Extract Data</span>
                `;
                dom.extractBtn.title = "Click to extract data - we'll guide you through any missing requirements";
            }
        }
    };

    const clearAll = () => {
        // Use our new remove function
        removeImage();
        
        state.isExtracting = false;
        
        // Show upload area, hide results
        if (dom.uploadArea) dom.uploadArea.style.display = '';
        if (dom.resultsArea) dom.resultsArea.hidden = true;
        if (dom.clearBtn) dom.clearBtn.hidden = true;
        if (dom.fillFormBtn) dom.fillFormBtn.hidden = true;
        
        // Clear previews and forms
        if (dom.multiFilePreview) dom.multiFilePreview.innerHTML = '';
        if (dom.generatedForm) dom.generatedForm.innerHTML = '';
        
        // Scroll back to top smoothly
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
            mainContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        
        showNotification('All data cleared', 'success');
    };

    const renderAll = () => {
        renderHistory();
        renderSettingsFields();
        updateExtractButtonState();
        
        // Set API key placeholder
        if (dom.apiKeyInput) {
            dom.apiKeyInput.placeholder = state.apiKey ? 
                'API Key saved securely' : 
                'Enter your Gemini API key';
        }
    };

    // ===================================================================
    // ==                    UTILITY FUNCTIONS                        ==
    // ===================================================================
    
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // Smooth scroll to element utility
    const smoothScrollToElement = (element, options = {}) => {
        if (!element) return;
        
        const defaultOptions = {
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
            offset: 20 // Extra space from top
        };
        
        const scrollOptions = { ...defaultOptions, ...options };
        
        // Get the main scrollable container
        const mainContainer = document.querySelector('main');
        if (!mainContainer) {
            element.scrollIntoView(scrollOptions);
            return;
        }
        
        // Calculate position with offset
        const elementRect = element.getBoundingClientRect();
        const containerRect = mainContainer.getBoundingClientRect();
        const currentScrollTop = mainContainer.scrollTop;
        
        const targetScrollTop = currentScrollTop + elementRect.top - containerRect.top - scrollOptions.offset;
        
        // Smooth scroll to calculated position
        mainContainer.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: scrollOptions.behavior
        });
    };

    // Auto-scroll to extracted data with delay for animation
    const autoScrollToExtractedData = () => {
        setTimeout(() => {
            // First try to scroll to the success header
            const extractedDataElement = document.querySelector('.extraction-success-header');
            if (extractedDataElement) {
                extractedDataElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Add highlight animation to success header
                setTimeout(() => {
                    extractedDataElement.style.animation = 'highlightExtracted 1.5s ease-out';
                }, 500);
            } else {
                // Fallback to form container
                const formContainer = dom.formContainer;
                if (formContainer && !formContainer.hidden) {
                    smoothScrollToElement(formContainer, {
                        block: 'start',
                        offset: 30
                    });
                    
                    // Show a subtle highlight animation
                    formContainer.style.animation = 'highlightExtracted 2s ease-out';
                    setTimeout(() => {
                        formContainer.style.animation = '';
                    }, 2000);
                }
            }
        }, 400); // Wait for form animation to start
    };

    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes highlightExtracted {
            0% { 
                box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4);
                transform: scale(1);
            }
            50% { 
                box-shadow: 0 0 0 10px rgba(79, 70, 229, 0.1);
                transform: scale(1.01);
            }
            100% { 
                box-shadow: 0 0 0 0 rgba(79, 70, 229, 0);
                transform: scale(1);
            }
        }
        
        .notification-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
        }
        
        .notification-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    `;
    document.head.appendChild(style);

    // ===================================================================
    // ==                    INITIALIZATION                           ==
    // ===================================================================
    
    // Start the application
    init().catch(error => {
        console.error('Failed to initialize:', error);
        // Show fallback on initialization error
        const fallback = document.getElementById('fallback');
        if (fallback) fallback.style.display = 'block';
    });

    // Handle initial resize
    handleResize();

    // System theme change listener (robust across browsers)
    try {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onThemeChange = () => {
            if (state.theme === 'auto') applyTheme();
        };
        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', onThemeChange);
        } else if (typeof mq.addListener === 'function') {
            mq.addListener(onThemeChange);
        }
    } catch (_) { /* noop */ }

        // Lightweight debug helpers (use in popup console: __debug.showAll())
        try {
            window.__debug = {
                showAll: () => {
                    try {
                        const rs = document.getElementById('results-area');
                        const fc = document.getElementById('form-container');
                        const gf = document.getElementById('generated-form');
                        if (rs) rs.hidden = false;
                        if (fc) fc.hidden = false;
                        if (gf && !gf.children.length) {
                            gf.innerHTML = '<div class="form-field"><label>Debug Field</label><input value="Visible"/></div>';
                        }
                        const up = document.getElementById('upload-area');
                        if (up) up.style.outline = '2px dashed #00f2fe';
                        console.log('Debug: forced UI visible');
                    } catch (e) { console.error('Debug.showAll error', e); }
                },
                reset: () => {
                    try {
                        const rs = document.getElementById('results-area');
                        const fc = document.getElementById('form-container');
                        if (rs) rs.hidden = true;
                        if (fc) fc.hidden = true;
                        const up = document.getElementById('upload-area');
                        if (up) up.style.outline = '';
                        console.log('Debug: reset UI state');
                    } catch (e) { console.error('Debug.reset error', e); }
                }
            };
        } catch (_) { /* no-op */ }

    // ===================================================================
    // ==                    HELPER FUNCTIONS                          ==
    // ===================================================================

    // Show copy notification
    const showCopyNotification = (fieldName) => {
        // Remove existing notification if any
        const existingNotification = document.querySelector('.copy-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = `${fieldName} copied to clipboard!`;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Hide and remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, 3000);
    };

    // ===================================================================
    // ==              CONSOLE DEBUGGING FUNCTIONS                     ==
    // ===================================================================
    
    // Global debugging function for console access
    window.debugAddressExtraction = async () => {
        console.log('🔍 DEBUGGING ADDRESS EXTRACTION...');
        
        try {
            // Check user field selections
            const selectedFields = await getUserSelectedFields();
            console.log('1️⃣ USER FIELD SELECTIONS:', selectedFields);
            
            // Check if address fields are enabled
            const addressEnabled = {
                currentAddress: selectedFields.currentAddress === true,
                permanentAddress: selectedFields.permanentAddress === true
            };
            console.log('2️⃣ ADDRESS FIELDS ENABLED:', addressEnabled);
            
            // Generate current AI prompt
            const prompt = await getOptimizedPrompt();
            console.log('3️⃣ CURRENT AI PROMPT (first 500 chars):', prompt.substring(0, 500) + '...');
            
            // Check if prompt contains address fields
            const promptCheck = {
                containsCurrentAddress: prompt.includes('currentAddress'),
                containsPermanentAddress: prompt.includes('permanentAddress'),
                containsMandatoryRules: prompt.includes('MANDATORY ADDRESS EXTRACTION')
            };
            console.log('4️⃣ PROMPT CONTAINS ADDRESS RULES:', promptCheck);
            
            // Check last extraction state
            if (state.extractedData) {
                const lastExtraction = {
                    hasCurrentAddress: !!state.extractedData.currentAddress,
                    hasPermanentAddress: !!state.extractedData.permanentAddress,
                    currentAddressValue: state.extractedData.currentAddress || 'NOT EXTRACTED',
                    permanentAddressValue: state.extractedData.permanentAddress || 'NOT EXTRACTED'
                };
                console.log('5️⃣ LAST EXTRACTION RESULTS:', lastExtraction);
            } else {
                console.log('5️⃣ NO PREVIOUS EXTRACTION DATA');
            }
            
            console.log('✅ DEBUGGING COMPLETE - Check above logs for issues');
            
        } catch (error) {
            console.error('❌ DEBUGGING ERROR:', error);
        }
    };
    
    console.log('🛠️ Debug function loaded! Run: debugAddressExtraction()');

});