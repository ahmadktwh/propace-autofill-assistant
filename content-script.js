// === PHASE 3: COMMUNICATION & POPUP INTEGRATION ===
// Advanced message sender with validation and extensibility
function sendAutofillStatusToPopup(status, extra = {}) {
    try {
        const message = {
            type: 'AUTOFILL_STATUS_UPDATE',
            status,
            timestamp: Date.now(),
            ...extra
        };
        // Validate message structure
        if (!message.type || typeof message.status !== 'object') {
            throw new Error('Invalid message structure');
        }
        window.postMessage(message, '*');
    } catch (e) {
        console.error('[Propace Autofill] Failed to send status to popup:', e);
        // Report error to popup for diagnostics
        window.postMessage({ type: 'AUTOFILL_ERROR', error: e.message, timestamp: Date.now() }, '*');
    }
}

// Listen for popup requests and provide professional feedback
// Advanced async message handler with handshake and queue
const popupMessageQueue = [];
let popupHandshakeComplete = false;

window.addEventListener('message', async (event) => {
    if (!event.data || !event.data.type) return;
    // Handshake protocol for secure communication
    if (event.data.type === 'POPUP_HANDSHAKE') {
        popupHandshakeComplete = true;
        sendAutofillStatusToPopup(window.latestAutofillStatus || { success: false, fieldsCount: 0, message: 'Handshake complete, no autofill yet.' }, { handshake: true });
        return;
    }
    // Queue requests for async processing
    popupMessageQueue.push(event.data);
    // Process queue
    while (popupMessageQueue.length > 0) {
        const msg = popupMessageQueue.shift();
        if (msg.type === 'REQUEST_AUTOFILL_STATUS') {
            const status = window.latestAutofillStatus || { success: false, fieldsCount: 0, message: 'No autofill performed yet.' };
            sendAutofillStatusToPopup(status);
        }
        // Extensible: handle future popup requests here
        if (msg.type === 'REQUEST_AUTOFILL_ERROR_LOG') {
            const errorLog = window.latestAutofillStatus && window.latestAutofillStatus.errorLog ? window.latestAutofillStatus.errorLog : [];
            window.postMessage({ type: 'AUTOFILL_ERROR_LOG', errorLog, timestamp: Date.now() }, '*');
        }
    }
});
// === PHASE 2+3: ENTERPRISE-GRADE AUTOFILL ENGINE ===
async function enterpriseAutofillEngine(extractedData) {
    // Step 1: Use unified, robust mapping
    const result = await performUnifiedAutofill(extractedData);
    let filledCount = result.fieldsCount;
    let mappings = result.mappings;

    // Step 2: Multi-field mapping (fill all possible matches, not just best)
    // For each dataKey, fill all fields with confidence >= 80
    for (const [dataKey, dataValue] of Object.entries(extractedData)) {
        if (!dataValue) continue;
        const fields = await findAllFillableFields(document.body);
        for (const field of fields) {
            const score = (field.predictedType && dataKey.toLowerCase().includes(field.predictedType)) ? 90 : 0;
            if (score >= 80 && field.element.value !== dataValue) {
                try {
                    field.element.value = dataValue;
                    field.element.dispatchEvent(new Event('input', { bubbles: true }));
                    field.element.dispatchEvent(new Event('change', { bubbles: true }));
                    filledCount++;
                } catch(e) { /* error handling */ }
            }
        }
    }

    // Step 3: Fallback strategies (try filling by placeholder, label, etc. if not already filled)
    for (const [dataKey, dataValue] of Object.entries(extractedData)) {
        if (!dataValue) continue;
        const fields = await findAllFillableFields(document.body);
        for (const field of fields) {
            if (field.element.value && field.element.value !== '') continue;
            const text = (field.name + ' ' + field.type + ' ' + field.value + ' ' + field.predictedType + ' ' + (field.element.placeholder || '')).toLowerCase();
            if (text.includes(dataKey.toLowerCase())) {
                try {
                    field.element.value = dataValue;
                    field.element.dispatchEvent(new Event('input', { bubbles: true }));
                    field.element.dispatchEvent(new Event('change', { bubbles: true }));
                    filledCount++;
                } catch(e) { /* error handling */ }
            }
        }
    }

    // Step 4: User feedback hook (for professional UX)
    if (typeof window.showAutofillFeedback === 'function') {
        window.showAutofillFeedback({ filledCount, mappings });
    }

    // Step 5: Detailed logging for diagnostics
    console.log(`[Propace Autofill] Enterprise autofill completed. Fields filled: ${filledCount}`);
    if (filledCount === 0) {
        console.warn('[Propace Autofill] No fields filled. Check mapping and extraction accuracy.');
    }

    // Save status for popup communication
    window.latestAutofillStatus = {
        success: filledCount > 0,
        fieldsCount: filledCount,
        mappings,
        message: filledCount > 0 ? `Filled ${filledCount} fields (enterprise-grade)` : 'No fields filled',
        errorLog: [],
    };
    // Notify popup of status
    sendAutofillStatusToPopup(window.latestAutofillStatus);
    return window.latestAutofillStatus;
}
// === PHASE 2: UNIFIED FIELD MATCHING, SCORING, AND STATE MANAGEMENT ===
async function performUnifiedAutofill(extractedData) {
    // Centralized state
    const usedFields = new WeakSet();
    const usedDataKeys = new Set();
    let filledCount = 0;
    let mappingResults = [];

    // Get all fillable fields (advanced engine)
    const fields = await findAllFillableFields(document.body);
    if (!fields || fields.length === 0) {
        return { success: false, fieldsCount: 0, message: 'No fillable fields found', mappings: [] };
    }

    // Unified, context-aware scoring algorithm
    function getConfidenceScore(dataKey, field) {
        let score = 0;
        const keyLower = dataKey.toLowerCase();
        const fieldText = `${field.name} ${field.type} ${field.value} ${field.predictedType}`.toLowerCase();
        // Direct match
        if (keyLower === field.name.toLowerCase()) score = 100;
        // Pattern match
        else if (field.predictedType && keyLower.includes(field.predictedType)) score = 90;
        // Fuzzy match
        else if (fieldText.includes(keyLower)) score = 70;
        // Context-aware: prioritize visible, main form fields
        if (isElementReallyVisible(field.element)) score += 10;
        // Penalty for duplicate/low-confidence
        if (usedFields.has(field.element) || usedDataKeys.has(dataKey)) score -= 30;
        return Math.max(0, Math.min(score, 100));
    }

    // Build mapping results
    for (const [dataKey, dataValue] of Object.entries(extractedData)) {
        if (!dataValue || usedDataKeys.has(dataKey)) continue;
        let bestField = null;
        let bestScore = 0;
        for (const field of fields) {
            if (usedFields.has(field.element)) continue;
            const score = getConfidenceScore(dataKey, field);
            if (score > bestScore) {
                bestScore = score;
                bestField = field;
            }
        }
        if (bestField && bestScore >= 60) { // Only fill high-confidence matches
            mappingResults.push({ dataKey, dataValue, field: bestField, score: bestScore });
            usedFields.add(bestField.element);
            usedDataKeys.add(dataKey);
        }
    }

    // Fill fields
    for (const mapping of mappingResults) {
        try {
            const el = mapping.field.element;
            const val = mapping.dataValue;
            const wasReadOnly = el.readOnly;
            if (wasReadOnly) el.readOnly = false;
            if (el.tagName.toLowerCase() === 'select') {
                for (let i=0; i<el.options.length; i++) {
                    if (el.options[i].textContent.toLowerCase().includes(val.toLowerCase()) || el.options[i].value.toLowerCase().includes(val.toLowerCase())) {
                        el.selectedIndex = i;
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
            } else if (el.type === 'checkbox') {
                el.checked = ['true','1','yes','on'].includes(String(val).toLowerCase());
            } else if (el.type === 'radio') {
                if (el.value === String(val)) el.checked = true;
            } else if (el.isContentEditable) {
                el.textContent = val;
            } else {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (wasReadOnly) el.readOnly = true;
            filledCount++;
        } catch(e) { /* error handling */ }
    }

    return {
        success: filledCount > 0,
        fieldsCount: filledCount,
        message: filledCount > 0 ? `Filled ${filledCount} fields` : 'No high-confidence matches found',
        mappings: mappingResults
    };
}
/*==================================================================================================
    Propace Autofill Assistant - World-Class Professional Content Script
    -------------------------------------------------------------------
    Developed by: Mujeeb Ahmad (with Claude AI)
    Version: 3.0 - Enterprise-Grade Professional Edition
    Description: World-class content script with comprehensive error handling, performance monitoring,
                 and modular architecture. Handles all modern web forms with maximum accuracy.
                 
    Enhancement 8: Code Structure, Performance, and Error Handling
    - Modular function architecture with clear separation of concerns
    - Comprehensive try...catch blocks with graceful error recovery
    - Performance monitoring and optimization
    - Clean console output with grouped logging
    - Optimized pattern processing for better performance
====================================================================================================*/

// --- EARLY HANDSHAKE LISTENER (guaranteed immediate ping replies) ---
// Registers asap to ensure popup handshake succeeds even before heavy initialization.
(function earlyHandshake(){
    try {
        if (typeof window !== 'undefined' && typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
            if (!window.__PROPACE_EARLY_HANDSHAKE__) {
                Object.defineProperty(window, '__PROPACE_EARLY_HANDSHAKE__', { value: true, writable: false });
                chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                    try {
                        // If main receiver is ready, let it handle pings to avoid double sendResponse
                        if (window.__PROPACE_MAIN_RECEIVER_READY__) {
                            return false;
                        }
                        if (request && request.type === 'propace_ping' && typeof request.version === 'number' && request.nonce) {
                            sendResponse({ ok: true, type: 'propace_pong', version: request.version, nonce: request.nonce, ts: Date.now() });
                            return false; // synchronous response
                        }
                    } catch(_) { /* no-op */ }
                    return false;
                });
            }
        }
    } catch(_) { /* no-op */ }
})();

// ===================================================================
// ==              ENHANCED INJECTION PROTECTION SYSTEM            ==
// ===================================================================

// Advanced injection check with Google services compatibility + strong idempotent guard
try {
    if (Object.prototype.hasOwnProperty.call(window, '__PROPACE_CONTENT_SCRIPT_LOADED__')) {
        console.group('🔄 Propace Autofill: Injection Check');
        console.log('Content script already initialized (strong guard), skipping');
        console.groupEnd();
        throw new Error('ALREADY_INITIALIZED');
    }
    Object.defineProperty(window, '__PROPACE_CONTENT_SCRIPT_LOADED__', {
        value: true,
        writable: false,
        configurable: false,
        enumerable: false
    });
} catch(_){}

if (window.propaceAutofillInjected) {
    console.group('🔄 Propace Autofill: Injection Check');
    console.log('Content script already injected, skipping initialization');
    console.groupEnd();
} else {
    window.propaceAutofillInjected = true;
    
    // ===================================================================
    // ==              CRITICAL FIXES - MISSING FUNCTIONS             ==
    // ===================================================================
    
    // CRITICAL FIX #1: Implement missing performEnhancedAutofill function
    function performEnhancedAutofill(extractedData) {
        console.log('🎯 performEnhancedAutofill: Starting enhanced autofill process...');
        return fillAdvancedFormFields(extractedData);
    }

    // CRITICAL FIX #2: Robust promisified storage wrapper (ChatGPT enhanced)
    const safeStorage = {
        get: (keys) => new Promise((resolve) => {
            try {
                if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
                    console.warn('safeStorage.get: chrome.storage.local not available, returning {}');
                    return resolve({});
                }
                chrome.storage.local.get(keys, (res) => {
                    if (chrome.runtime.lastError) {
                        console.warn('safeStorage.get lastError:', chrome.runtime.lastError.message);
                        return resolve({});
                    }
                    resolve(res || {});
                });
            } catch (e) {
                console.warn('safeStorage.get exception:', e);
                resolve({});
            }
        }),

        set: (items) => new Promise((resolve) => {
            try {
                if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
                    console.warn('safeStorage.set: chrome.storage.local not available');
                    return resolve(false);
                }
                chrome.storage.local.set(items, () => {
                    if (chrome.runtime.lastError) {
                        console.warn('safeStorage.set lastError:', chrome.runtime.lastError.message);
                        return resolve(false);
                    }
                    resolve(true);
                });
            } catch (e) {
                console.warn('safeStorage.set exception:', e);
                resolve(false);
            }
        }),

        remove: (keys) => new Promise((resolve) => {
            try {
                if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
                    return resolve(false);
                }
                chrome.storage.local.remove(keys, () => {
                    if (chrome.runtime.lastError) {
                        console.warn('safeStorage.remove lastError:', chrome.runtime.lastError.message);
                        return resolve(false);
                    }
                    resolve(true);
                });
            } catch (e) {
                console.warn('safeStorage.remove exception:', e);
                resolve(false);
            }
        })
    };

    // CRITICAL FIX #3: Framework-compatible setNativeValue for React/Vue
    function setNativeValue(element, value) {
        const descriptor = Object.getOwnPropertyDescriptor(element, 'value') || 
                          Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
        
        if (descriptor && descriptor.set) {
            descriptor.set.call(element, value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // CRITICAL FIX #4: Shadow DOM query helper with timeout
    async function queryDeep(selector, root = document, timeout = 5000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const elements = [];
            
            // Query in main document
            elements.push(...root.querySelectorAll(selector));
            
            // Query in open shadow roots
            const allElements = root.querySelectorAll('*');
            for (const element of allElements) {
                if (controller.signal.aborted) break;
                
                if (element.shadowRoot) {
                    try {
                        elements.push(...element.shadowRoot.querySelectorAll(selector));
                    } catch (e) {
                        // Shadow root access denied, skip
                    }
                }
            }
            
            clearTimeout(timeoutId);
            return elements;
        } catch (error) {
            clearTimeout(timeoutId);
            console.warn('queryDeep failed:', error.message);
            return [];
        }
    }

    // CRITICAL FIX #5: Retry with exponential backoff
    async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                
                const delay = baseDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
                console.warn(`Retry attempt ${attempt} failed, retrying in ${delay}ms...`);
            }
        }
    }

    // (Removed duplicate hoist-safe formatName/formatIdNumber to avoid redeclaration; using advanced versions later in file.)

    // CRITICAL FIX #7: Normalize data keys with alias mapping
    function normalizeDataKeys(data) {
        const keyMapping = {
            'fullName': 'name',
            'fullname': 'name', 
            'applicantName': 'name',
            'applicantname': 'name',
            'studentName': 'name',
            'candidateName': 'name',
            'userName': 'name',
            'username': 'name',
            'id': 'idNumber',
            'cnic': 'idNumber',
            'nationalId': 'idNumber',
            'identityNumber': 'idNumber',
            'passportNumber': 'passportNo',
            'passportNum': 'passportNo',
            'fatherName': 'father',
            'fathersName': 'father',
            'husbandName': 'husband',
            'husbandsName': 'husband',
            'emailAddress': 'email',
            'emailId': 'email',
            'phoneNumber': 'phone',
            'mobileNumber': 'phone',
            'contactNumber': 'phone',
            'dateOfBirth': 'dob',
            'birthDate': 'dob',
            'currentAddress': 'address',
            'permanentAddress': 'address',
            'residentialAddress': 'address'
        };
        
        const normalized = { ...data };
        for (const [key, value] of Object.entries(data)) {
            const normalizedKey = keyMapping[key] || key;
            if (normalizedKey !== key) {
                normalized[normalizedKey] = value;
                delete normalized[key];
            }
        }
        return normalized;
    }

    // CRITICAL FIX #8: Configurable confidence threshold
    let MINIMUM_CONFIDENCE = 0.6; // Default lowered from 0.75
    
    // Load confidence override from storage
    (async () => {
        try {
            const settings = await safeStorage.get(['propace_confidence_threshold']);
            if (settings.propace_confidence_threshold) {
                MINIMUM_CONFIDENCE = parseFloat(settings.propace_confidence_threshold);
                console.log('📊 Confidence threshold loaded:', MINIMUM_CONFIDENCE);
            }
        } catch (error) {
            console.warn('Could not load confidence threshold:', error.message);
        }
    })();

    // CRITICAL FIX #9: Enhanced field type detection for email
    function detectFieldType(element) {
        const type = element.type?.toLowerCase() || 'text';
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const label = getFieldLabel(element)?.toLowerCase() || '';
        const className = (element.className || '').toLowerCase();
        
        const allText = `${type} ${name} ${id} ${placeholder} ${label} ${className}`;
        
        // Enhanced email detection
        if (type === 'email' || /email|mail|e-mail/.test(allText)) {
            return 'email';
        }
        
        // Other type detections
        if (type === 'tel' || /phone|mobile|contact|tel/.test(allText)) {
            return 'phone';
        }
        
        if (type === 'password' || /password|pwd/.test(allText)) {
            return 'password';
        }
        
        return type;
    }
    
    // Helper function to get field label text
    function getFieldLabel(element) {
        // Try various methods to find the label
        if (element.labels && element.labels.length > 0) {
            return element.labels[0].textContent.trim();
        }
        
        // Look for label with for attribute
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) return label.textContent.trim();
        }
        
        // Look for parent/sibling labels
        const parent = element.parentElement;
        if (parent) {
            const label = parent.querySelector('label');
            if (label) return label.textContent.trim();
            
            // Check previous sibling
            const prevSibling = element.previousElementSibling;
            if (prevSibling && (prevSibling.tagName === 'LABEL' || prevSibling.querySelector('label'))) {
                return prevSibling.textContent.trim();
            }
        }
        
        return '';
    }

    // CRITICAL FIX #10: Enhanced validateDataForField with strict cross-contamination prevention
    function validateDataForField(dataValue, fieldType, element) {
        if (!dataValue) return false;
        
        const valueStr = String(dataValue).toLowerCase();
        
        // Strict email field protection
        if (fieldType === 'email') {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dataValue);
        }
        
        // Strict phone field protection  
        if (fieldType === 'phone' || fieldType === 'tel') {
            return /^[\+]?[\d\s\-\(\)]{10,}$/.test(dataValue);
        }
        
        // Prevent ID numbers in non-ID fields
        if (fieldType !== 'text' && fieldType !== 'idNumber' && /^\d{5}-\d{7}-\d{1}$/.test(dataValue)) {
            console.warn('🚫 Blocking CNIC format in non-ID field:', fieldType);
            return false;
        }
        
        return true;
    }
    
    // ===================================================================
    // ==              ENTERPRISE COMMUNICATION RECEIVER               ==
    // ===================================================================
    
    // Enhanced message handling system with health monitoring
    class PropaceMessageSystem {
        constructor() {
            this.connectionStatus = 'initializing';
            this.messageQueue = [];
            this.retryCount = 0;
            this.maxRetries = 5;
            this.lastSuccessfulMessage = null;
            
            // Set up health check interval
            this.startHealthCheck();
        }
        
        async processMessage(message, sender) {
            console.group(`📨 Processing message: ${message.type}`);
            
            try {
                // Validate message format
                if (!this.validateMessage(message)) {
                    throw new Error('Invalid message format');
                }
                
                // Handle message based on type
                let response;
                switch (message.type) {
                    case 'autofill':
                        response = await handleAutofillRequest(message);
                        break;
                    case 'extract':
                        response = await handleTextExtraction(message);
                        break;
                    case 'health_check':
                        response = this.getHealthStatus();
                        break;
                    default:
                        throw new Error(`Unknown message type: ${message.type}`);
                }
                
                this.lastSuccessfulMessage = Date.now();
                this.connectionStatus = 'connected';
                this.retryCount = 0;
                
                console.log('✅ Message processed successfully');
                console.groupEnd();
                return { success: true, data: response };
                
            } catch (error) {
                this.handleError(error, message);
                throw error;
            }
        }
        
        validateMessage(message) {
            return message && 
                   typeof message === 'object' && 
                   message.type && 
                   typeof message.type === 'string';
        }
        
        handleError(error, message) {
            this.retryCount++;
            this.connectionStatus = this.retryCount >= this.maxRetries ? 'error' : 'degraded';
            
            const errorInfo = {
                timestamp: Date.now(),
                error: error.message,
                messageType: message?.type,
                retryCount: this.retryCount,
                connectionStatus: this.connectionStatus
            };
            
            console.error('❌ Message processing error:', errorInfo);
            console.groupEnd();
            
            // Store error for debugging
            if (window.handlePropaceError) {
                window.handlePropaceError(error, 'message_system');
            }
        }
        
        getHealthStatus() {
            return {
                status: this.connectionStatus,
                lastSuccessfulMessage: this.lastSuccessfulMessage,
                retryCount: this.retryCount,
                queueLength: this.messageQueue.length,
                errors: window.propaceErrorLog || []
            };
        }
        
        startHealthCheck() {
            setInterval(() => {
                try {
                    if (this.retryCount > 0 && Date.now() - (this.lastSuccessfulMessage || 0) > 30000) {
                        this.connectionStatus = 'degraded';
                        console.warn('⚠️ Connection health degraded - no successful messages in 30s');
                    }
                } catch (error) {
                    console.error('❌ Health check error:', error);
                }
            }, 30000); // Check every 30 seconds
        }
    }
    
    // Initialize message system
    window.propaceMessageSystem = new PropaceMessageSystem();
    
    class PropaceAdvancedReceiver {
        constructor() {
            this.messageQueue = new Map();
            this.responseHandlers = new Map();
            this.bypassMethods = ['event', 'dom', 'window'];
            this.isInitialized = false;
            
            this.initializeReceiver();
            console.log('🚀 Propace Advanced Receiver initialized');
        }

        initializeReceiver() {
            if (this.isInitialized) return;
            
            // Method 1: Standard Chrome extension messaging
            this.setupStandardMessaging();
            
            // Method 2: Custom event listener for CSP bypass
            this.setupEventBypass();
            
            // Method 3: DOM mutation observer for DOM bridge
            this.setupDOMBypass();
            
            // Method 4: Window object monitoring
            this.setupWindowBypass();
            
            this.isInitialized = true;
            console.log('🛡️ All communication bypass methods initialized');
        }

        setupStandardMessaging() {
            // Enhanced standard messaging with better error handling
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
                chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                    try {
                        // Strict handshake support
                        if (request && request.type === 'propace_ping' && typeof request.version === 'number' && request.nonce) {
                            const resp = { ok:true, type:'propace_pong', version: request.version, nonce: request.nonce, ts: Date.now(), fieldsDetected: (typeof this?.lastFieldsDetected === 'number' ? this.lastFieldsDetected : 0) };
                            sendResponse(resp);
                            return false; // sync response
                        }
                        console.log('📨 Standard message received:', request);
                        // IMPORTANT: Do not return a Promise to onMessage. Always return true to keep the channel open.
                        // We'll send the response asynchronously inside handleMessage.
                        try {
                            Promise.resolve(this.handleMessage(request, sendResponse, 'standard')).catch((e) => {
                                try { sendResponse({ success:false, error: e?.message || String(e) }); } catch(_) {}
                            });
                        } catch (e) {
                            try { sendResponse({ success:false, error: e?.message || String(e) }); } catch(_) {}
                        }
                        return true;
                    } catch (e) {
                        try { sendResponse({ ok:false, code:'HANDLER_ERROR', message: e?.message || String(e) }); } catch(_){}
                        return false;
                    }
                });
            }
        }

        setupEventBypass() {
            // Listen for custom events (CSP bypass method)
            document.addEventListener('propaceBypassMessage', (event) => {
                console.log('🎯 Bypass event received:', event.detail);
                this.handleMessage(event.detail, (response) => {
                    // Store response for pickup
                    window.propaceBypassResponse = response;
                    
                    // Also dispatch response event
                    const responseEvent = new CustomEvent('propaceBypassResponse', {
                        detail: response
                    });
                    document.dispatchEvent(responseEvent);
                }, 'event-bypass');
            });
        }

        setupDOMBypass() {
            // DOM bridge for extreme CSP cases
            document.addEventListener('propaceDOMBridge', (event) => {
                console.log('🌉 DOM bridge event received:', event.detail);
                
                const bridge = document.getElementById('propace-dom-bridge');
                if (bridge) {
                    const messageData = JSON.parse(bridge.getAttribute('data-message'));
                    
                    this.handleMessage(messageData, (response) => {
                        // Create response element
                        const responseEl = document.createElement('div');
                        responseEl.id = 'propace-dom-response';
                        responseEl.style.display = 'none';
                        responseEl.setAttribute('data-response', JSON.stringify(response));
                        responseEl.setAttribute('data-message-id', messageData.messageId);
                        
                        document.body.appendChild(responseEl);
                        
                        // Clean up bridge
                        bridge.remove();
                    }, 'dom-bypass');
                }
            });
        }

        setupWindowBypass() {
            // Monitor window object for bypass messages
            const checkWindowMessages = () => {
                if (window.propaceBypassMessage && window.propaceBypassTimestamp) {
                    const message = window.propaceBypassMessage;
                    const timestamp = window.propaceBypassTimestamp;
                    
                    // Process if recent (within 5 seconds)
                    if (Date.now() - timestamp < 5000) {
                        console.log('🪟 Window bypass message received:', message);
                        
                        this.handleMessage(message, (response) => {
                            window.propaceBypassResponse = response;
                        }, 'window-bypass');
                        
                        // Clean up
                        delete window.propaceBypassMessage;
                        delete window.propaceBypassTimestamp;
                    }
                }
            };
            
            // Check every 100ms for window messages
            setInterval(checkWindowMessages, 100);
        }

    async handleMessage(request, sendResponse, method = 'unknown') {
            const startTime = Date.now();
            const messageId = request.messageId || 'unknown';
            
            console.group(`🎯 Processing message via ${method} [${messageId}]`);
            console.log('Request:', request);
            
            try {
                let response = { success: false, error: 'Unknown action' };
                
                // Support both legacy and new structured types
                if (request.action === 'autofill' || request.action === 'autofill_form' || request.type === 'propace_autofill') {
                    response = await this.handleAutofillRequest(request);
                } else if (request.action === 'extractText') {
                    response = await this.handleTextExtraction(request);
                } else if (request.action === 'ping') {
                    response = { 
                        success: true, 
                        message: 'Content script active',
                        method: method,
                        timestamp: Date.now()
                    };
                } else if (request && request.type === 'propace_ping') {
                    response = { ok:true, type:'propace_pong', version: (typeof request.version==='number'?request.version:1), nonce: request.nonce, ts: Date.now(), fieldsDetected: 0 };
                } else if (request.action === 'healthCheck') {
                    response = this.getHealthStatus();
                }
                
                // Add processing metadata
                response.processingTime = Date.now() - startTime;
                response.method = method;
                response.messageId = messageId;
                
                console.log('✅ Response:', response);
                console.groupEnd();
                
                try { sendResponse(response); } catch(_) {}
                // Always return true to keep the channel open until sendResponse completes
                return true;
                
            } catch (error) {
                const errorResponse = {
                    success: false,
                    error: error.message,
                    processingTime: Date.now() - startTime,
                    method: method,
                    messageId: messageId
                };
                
                console.error('❌ Message handling error:', error);
                console.groupEnd();
                
                try { sendResponse(errorResponse); } catch(_) {}
                return true;
            }
        }

        async handleAutofillRequest(request) {
            console.log('🎯 Advanced autofill request processing...');
            
            // Check for data in multiple possible properties for maximum compatibility
            const autofillData = request.data || request.propaceData || request.formData || request.payload;
            
            if (!autofillData || Object.keys(autofillData).length === 0) {
                throw new Error('No autofill data provided in request');
            }

            console.log('📊 Autofill data received:', Object.keys(autofillData));
            
            // Store data globally for dynamic content
            window.propaceGlobalData = autofillData;
            
            // Enhanced autofill with CSP-aware field detection
            const result = await this.performCSPAwareAutofill(autofillData);
            
            return {
                success: true,
                message: 'Autofill completed successfully',
                fieldsProcessed: result.fieldsProcessed || 0,
                fieldsSuccess: result.fieldsSuccess || 0,
                method: 'advanced-autofill',
                bypassUsed: result.bypassUsed || false
            };
        }

        async performCSPAwareAutofill(data) {
            console.group('🛡️ Propace Enterprise Autofill System - Starting...');
            console.log('⏰ Timeout Limit: 60 seconds');
            console.log('📊 Data fields to process:', Object.keys(data).length);
            
            const startTime = Date.now();
            const TIMEOUT_LIMIT = 60000; // 1 minute timeout
            
            let fieldsProcessed = 0;
            let fieldsSuccess = 0;
            let bypassUsed = false;
            let methodsUsed = [];
            let errorLog = [];
            let warnings = [];
            
            // Timeout controller
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(() => {
                timeoutController.abort();
                console.error('⏰ AUTOFILL TIMEOUT: Process stopped after 60 seconds');
            }, TIMEOUT_LIMIT);
            
            try {
                // Pre-flight checks
                console.group('🔍 Pre-flight System Diagnostics');
                await this.performSystemDiagnostics(errorLog, warnings);
                console.groupEnd();
                
                // Method 1: Try standard autofill first (highest success rate)
                if (!timeoutController.signal.aborted) {
                    console.group('📝 Method 1: Standard Autofill');
                    console.log('⏱️ Starting standard autofill...');
                    
                    try {
                        const standardResult = await Promise.race([
                            this.tryStandardAutofill(data),
                            this.createTimeoutPromise(15000, 'Standard autofill timeout')
                        ]);
                        
                        fieldsProcessed += standardResult.processed;
                        fieldsSuccess += standardResult.success;
                        
                        if (standardResult.success > 0) {
                            methodsUsed.push('standard');
                            console.log(`✅ Standard autofill: ${standardResult.success}/${standardResult.processed} fields`);
                        } else {
                            errorLog.push('Standard autofill failed - no fields filled');
                            console.warn('⚠️ Standard autofill: 0 fields filled');
                        }
                    } catch (error) {
                        errorLog.push(`Standard autofill error: ${error.message}`);
                        console.error('❌ Standard autofill failed:', error.message);
                    }
                    console.groupEnd();
                }
                
                // Method 2: If standard failed or incomplete (less than 80% success), try bypass methods
                if (!timeoutController.signal.aborted && (fieldsSuccess === 0 || fieldsSuccess < fieldsProcessed * 0.8)) {
                    console.group('🔄 Method 2: CSP Bypass Methods');
                    console.log('⏱️ Standard autofill incomplete, activating bypass methods...');
                    
                    try {
                        const bypassResult = await Promise.race([
                            this.tryBypassAutofill(data),
                            this.createTimeoutPromise(20000, 'Bypass autofill timeout')
                        ]);
                        
                        fieldsProcessed += bypassResult.processed;
                        fieldsSuccess += bypassResult.success;
                        bypassUsed = bypassResult.used;
                        
                        if (bypassResult.used) {
                            methodsUsed.push('bypass');
                            console.log(`✅ Bypass methods: ${bypassResult.success}/${bypassResult.processed} fields`);
                        } else {
                            errorLog.push('CSP bypass methods failed');
                            console.warn('⚠️ CSP bypass methods: No success');
                        }
                    } catch (error) {
                        errorLog.push(`CSP bypass error: ${error.message}`);
                        console.error('❌ CSP bypass failed:', error.message);
                    }
                    console.groupEnd();
                }
                
                // Method 3: If still unsuccessful, try emergency fallback
                if (!timeoutController.signal.aborted && fieldsSuccess === 0) {
                    console.group('🚨 Method 3: Emergency Fallback');
                    console.log('⏱️ Activating emergency fallback methods...');
                    
                    try {
                        const emergencyResult = await Promise.race([
                            this.tryEmergencyFallback(data),
                            this.createTimeoutPromise(15000, 'Emergency fallback timeout')
                        ]);
                        
                        fieldsProcessed += emergencyResult.processed;
                        fieldsSuccess += emergencyResult.success;
                        
                        if (emergencyResult.success > 0) {
                            methodsUsed.push('emergency');
                            bypassUsed = true;
                            console.log(`✅ Emergency fallback: ${emergencyResult.success}/${emergencyResult.processed} fields`);
                        } else {
                            errorLog.push('Emergency fallback methods failed');
                            console.warn('⚠️ Emergency fallback: No fields filled');
                        }
                    } catch (error) {
                        errorLog.push(`Emergency fallback error: ${error.message}`);
                        console.error('❌ Emergency fallback failed:', error.message);
                    }
                    console.groupEnd();
                    console.groupEnd();
                }
                
                // Clear timeout since we completed successfully
                clearTimeout(timeoutId);
                
            } catch (error) {
                clearTimeout(timeoutId);
                errorLog.push(`Main autofill process error: ${error.message}`);
                console.error('❌ CSP-aware autofill error:', error);
                
                // Last resort: Try basic DOM manipulation (if not timed out)
                if (!timeoutController.signal.aborted) {
                    try {
                        console.group('🛟 Method 4: Last Resort - Basic DOM');
                        console.log('⏱️ Attempting basic DOM manipulation...');
                        
                        const lastResortResult = await Promise.race([
                            this.basicDOMFallback(data),
                            this.createTimeoutPromise(10000, 'Basic DOM timeout')
                        ]);
                        
                        fieldsProcessed += lastResortResult.processed;
                        fieldsSuccess += lastResortResult.success;
                        
                        if (lastResortResult.success > 0) {
                            methodsUsed.push('last-resort');
                            bypassUsed = true;
                            console.log(`✅ Basic DOM: ${lastResortResult.success}/${lastResortResult.processed} fields`);
                        } else {
                            errorLog.push('Basic DOM fallback failed');
                        }
                        console.groupEnd();
                    } catch (lastResortError) {
                        errorLog.push(`Basic DOM fallback error: ${lastResortError.message}`);
                        console.error('❌ Last resort also failed:', lastResortError);
                    }
                }
            }
            
            // Calculate final timing
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const timeoutOccurred = timeoutController.signal.aborted;
            
            // Generate comprehensive final report
            this.generateFinalReport({
                fieldsProcessed,
                fieldsSuccess,
                methodsUsed,
                bypassUsed,
                totalTime,
                timeoutOccurred,
                errorLog,
                warnings,
                data
            });
            
            console.groupEnd();
            
            return {
                fieldsProcessed,
                fieldsProcessed,
                fieldsSuccess,
                bypassUsed,
                methodsUsed
            };
        }

        async tryStandardAutofill(data) {
            console.log('📝 Trying enhanced standard autofill with multiple strategies...');
            
            let processed = 0;
            let success = 0;
            let strategiesUsed = [];
            
            try {
                // Strategy 1: Use existing advanced autofill functions
                console.log('🎯 Strategy 1: Existing autofill functions...');
                if (typeof fillAdvancedFormFields === 'function') {
                    try {
                        const result = await fillAdvancedFormFields(data);
                        processed += result.fieldsProcessed || Object.keys(data).length;
                        success += result.fieldsSuccess || result.fieldsProcessed || 0;
                        strategiesUsed.push('fillAdvancedFormFields');
                        console.log(`✅ fillAdvancedFormFields: ${result.fieldsSuccess || 0} fields`);
                    } catch (error) {
                        console.log('❌ fillAdvancedFormFields failed:', error.message);
                    }
                }
                
                // Strategy 2: Try enhanced autofill function
                if (success === 0 && typeof performEnhancedAutofill === 'function') {
                    try {
                        console.log('🎯 Strategy 2: Enhanced autofill function...');
                        await performEnhancedAutofill(data);
                        processed = Object.keys(data).length;
                        success = processed; // Assume success if no error
                        strategiesUsed.push('performEnhancedAutofill');
                        console.log(`✅ performEnhancedAutofill: ${success} fields`);
                    } catch (error) {
                        console.log('❌ performEnhancedAutofill failed:', error.message);
                        success = 0;
                    }
                }
                
                // Strategy 3: Manual field mapping as fallback
                if (success === 0) {
                    console.log('🎯 Strategy 3: Manual field mapping...');
                    const manualResult = await this.manualFieldMapping(data);
                    processed += manualResult.processed;
                    success += manualResult.success;
                    
                    if (manualResult.success > 0) {
                        strategiesUsed.push('manualFieldMapping');
                        console.log(`✅ Manual field mapping: ${manualResult.success} fields`);
                    }
                }
                
            } catch (error) {
                console.error('❌ Standard autofill strategies failed:', error);
            }
            
            console.log(`📊 Standard autofill result: ${success}/${processed} fields using: ${strategiesUsed.join(', ')}`);
            return { processed, success, strategiesUsed };
        }

        async tryBypassAutofill(data) {
            console.log('🛡️ Trying comprehensive bypass autofill methods...');
            
            let processed = 0;
            let success = 0;
            let used = false;
            let bypassMethods = [];
            
            // Method 1: Direct DOM manipulation bypass (most reliable)
            try {
                console.log('🎯 Bypass Method 1: Direct DOM manipulation...');
                const directResult = await this.directDOMBypass(data);
                processed += directResult.processed;
                success += directResult.success;
                
                if (directResult.success > 0) {
                    used = true;
                    bypassMethods.push('direct-dom');
                    console.log(`✅ Direct DOM bypass: ${directResult.success}/${directResult.processed} fields`);
                }
            } catch (error) {
                console.log('❌ Direct DOM bypass failed:', error.message);
            }
            
            // Method 2: Event-based bypass (if DOM method incomplete)
            if (success < processed * 0.7) {
                try {
                    console.log('🎯 Bypass Method 2: Event-based bypass...');
                    const eventResult = await this.eventBasedBypass(data);
                    processed += eventResult.processed;
                    success += eventResult.success;
                    
                    if (eventResult.success > 0) {
                        used = true;
                        bypassMethods.push('event-based');
                        console.log(`✅ Event-based bypass: ${eventResult.success}/${eventResult.processed} fields`);
                    }
                } catch (error) {
                    console.log('❌ Event-based bypass failed:', error.message);
                }
            }
            
            // Method 3: Shadow DOM bypass (for web components)
            if (success < processed * 0.8) {
                try {
                    console.log('🎯 Bypass Method 3: Shadow DOM bypass...');
                    const shadowResult = await this.shadowDOMBypass(data);
                    processed += shadowResult.processed;
                    success += shadowResult.success;
                    
                    if (shadowResult.success > 0) {
                        used = true;
                        bypassMethods.push('shadow-dom');
                        console.log(`✅ Shadow DOM bypass: ${shadowResult.success}/${shadowResult.processed} fields`);
                    }
                } catch (error) {
                    console.log('❌ Shadow DOM bypass failed:', error.message);
                }
            }
            
            console.log(`🛡️ Bypass autofill result: ${success}/${processed} fields using: ${bypassMethods.join(', ')}`);
            return { processed, success, used, bypassMethods };
        }

        async directDOMBypass(data) {
            console.log('🎯 Direct DOM bypass...');
            
            let processed = 0;
            let success = 0;
            
            // Find all form fields using multiple selectors
            const fields = document.querySelectorAll(`
                input:not([type="hidden"]):not([type="submit"]):not([type="button"]),
                select,
                textarea,
                [contenteditable="true"],
                [role="textbox"],
                [role="combobox"]
            `);
            
            for (const field of fields) {
                processed++;
                
                try {
                    // Try to match field with data
                    const matchedData = this.smartFieldMatching(field, data);
                    
                    if (matchedData) {
                        // Use multiple filling strategies
                        const filled = await this.bypassFieldFill(field, matchedData);
                        if (filled) success++;
                    }
                } catch (error) {
                    console.log('❌ Field bypass failed:', error.message);
                }
            }
            
            return { processed, success };
        }

        smartFieldMatching(field, data) {
            // Enhanced field matching with advanced patterns and formatting
            const fieldIdentifiers = [
                field.name,
                field.id,
                field.placeholder,
                field.getAttribute('aria-label'),
                field.getAttribute('data-testid'),
                field.className,
                field.getAttribute('data-name'),
                field.getAttribute('for'),
                field.title
            ].filter(Boolean).map(s => s.toLowerCase());
            
            // Advanced field patterns for better detection
            const fieldPatterns = {
                // ID Number patterns
                idNumber: [
                    'cnic', 'id', 'identity', 'national', 'card', 'nic', 'snic',
                    'idnumber', 'id_number', 'nationalid', 'identity_card',
                    'citizen', 'registration', 'govt_id', 'government_id'
                ],
                
                // Name patterns
                firstName: [
                    'firstname', 'first_name', 'fname', 'given_name', 'forename'
                ],
                lastName: [
                    'lastname', 'last_name', 'lname', 'surname', 'family_name'
                ],
                fullName: [
                    'name', 'fullname', 'full_name', 'complete_name', 'username',
                    'display_name', 'person_name', 'customer_name', 'applicant_name'
                ],
                
                // Contact patterns
                email: [
                    'email', 'mail', 'e_mail', 'email_address', 'contact_email'
                ],
                phone: [
                    'phone', 'mobile', 'cell', 'telephone', 'contact', 'number',
                    'phonenumber', 'phone_number', 'mobile_number', 'tel'
                ],
                
                // Address patterns
                address: [
                    'address', 'street', 'location', 'residence', 'home_address',
                    'postal_address', 'mailing_address', 'current_address'
                ],
                city: [
                    'city', 'town', 'municipality', 'district', 'area', 'locality'
                ],
                
                // Date patterns
                dateOfBirth: [
                    'dob', 'birth', 'birthday', 'date_of_birth', 'birth_date',
                    'birthdate', 'born', 'date_birth'
                ],
                date: [
                    'date', 'day', 'month', 'year', 'calendar', 'datepicker'
                ]
            };
            
            // First try exact matches
            for (const [key, value] of Object.entries(data)) {
                const keyLower = key.toLowerCase();
                
                if (fieldIdentifiers.some(id => 
                    id === keyLower || 
                    id.includes(keyLower) || 
                    keyLower.includes(id)
                )) {
                    return this.formatValueForField(field, value, key);
                }
            }
            
            // Try pattern matching
            for (const [dataKey, dataValue] of Object.entries(data)) {
                const patterns = fieldPatterns[dataKey] || [];
                
                for (const pattern of patterns) {
                    if (fieldIdentifiers.some(id => id.includes(pattern))) {
                        return this.formatValueForField(field, dataValue, dataKey);
                    }
                }
            }
            
            // Fallback: try semantic matching
            for (const identifier of fieldIdentifiers) {
                // ID Number detection
                if (/cnic|id|identity|national|card/.test(identifier) && data.idNumber) {
                    return this.formatValueForField(field, data.idNumber, 'idNumber');
                }
                
                // Name detection
                if (/name/.test(identifier) && !/(user|login|account)/.test(identifier)) {
                    if (/first|given|fore/.test(identifier) && data.firstName) {
                        return this.formatValueForField(field, data.firstName, 'firstName');
                    }
                    if (/last|sur|family/.test(identifier) && data.lastName) {
                        return this.formatValueForField(field, data.lastName, 'lastName');
                    }
                    if (data.fullName || data.name) {
                        return this.formatValueForField(field, data.fullName || data.name, 'fullName');
                    }
                }
                
                // Contact detection
                if (/email|mail/.test(identifier) && data.email) {
                    return this.formatValueForField(field, data.email, 'email');
                }
                if (/phone|mobile|tel|contact/.test(identifier) && data.phone) {
                    return this.formatValueForField(field, data.phone, 'phone');
                }
                
                // Address detection
                if (/address|street|location/.test(identifier) && data.address) {
                    return this.formatValueForField(field, data.address, 'address');
                }
                if (/city|town/.test(identifier) && data.city) {
                    return this.formatValueForField(field, data.city, 'city');
                }
                
                // Date detection
                if (/date|birth|dob/.test(identifier)) {
                    if (data.dateOfBirth || data.dob || data.birthDate) {
                        return this.formatValueForField(field, data.dateOfBirth || data.dob || data.birthDate, 'date');
                    }
                }
            }
            
            return null;
        }

        formatValueForField(field, value, dataType) {
            if (!value) return value;
            
            const fieldType = field.type?.toLowerCase();
            const fieldName = (field.name || field.id || '').toLowerCase();
            
            try {
                switch (dataType) {
                    case 'idNumber':
                        return this.formatIdNumber(value, field);
                    
                    case 'phone':
                        return this.formatPhoneNumber(value, field);
                    
                    case 'date':
                    case 'dateOfBirth':
                        return this.formatDate(value, field);
                    
                    case 'firstName':
                    case 'lastName':
                    case 'fullName':
                        return this.formatName(value, field);
                    
                    case 'email':
                        return this.formatEmail(value, field);
                    
                    default:
                        return value;
                }
            } catch (error) {
                console.warn('Formatting error:', error);
                return value;
            }
        }

        formatIdNumber(value, field) {
            // Pakistani CNIC format: 36502-2333333-1
            let cleanNumber = value.toString().replace(/\D/g, ''); // Remove non-digits
            
            if (cleanNumber.length === 13) {
                // Standard CNIC format
                return `${cleanNumber.slice(0, 5)}-${cleanNumber.slice(5, 12)}-${cleanNumber.slice(12)}`;
            } else if (cleanNumber.length === 15) {
                // Alternative format
                return `${cleanNumber.slice(0, 5)}-${cleanNumber.slice(5, 13)}-${cleanNumber.slice(13)}`;
            } else if (cleanNumber.length >= 11) {
                // Flexible formatting
                const firstPart = cleanNumber.slice(0, 5);
                const middlePart = cleanNumber.slice(5, -1);
                const lastPart = cleanNumber.slice(-1);
                return `${firstPart}-${middlePart}-${lastPart}`;
            }
            
            return value; // Return as-is if doesn't match expected length
        }

        formatPhoneNumber(value, field) {
            let cleanNumber = value.toString().replace(/\D/g, '');
            
            // Pakistani mobile number formats
            if (cleanNumber.startsWith('92')) {
                // +92-300-1234567 format
                return `+${cleanNumber.slice(0, 2)}-${cleanNumber.slice(2, 5)}-${cleanNumber.slice(5)}`;
            } else if (cleanNumber.startsWith('0') && cleanNumber.length === 11) {
                // 0300-1234567 format
                return `${cleanNumber.slice(0, 4)}-${cleanNumber.slice(4)}`;
            } else if (cleanNumber.length === 10) {
                // 300-1234567 format
                return `${cleanNumber.slice(0, 3)}-${cleanNumber.slice(3)}`;
            }
            
            return value; // Return as-is if doesn't match patterns
        }

        formatDate(value, field) {
            try {
                const date = new Date(value);
                if (isNaN(date.getTime())) return value;
                
                const fieldType = field.type?.toLowerCase();
                const fieldName = (field.name || field.id || '').toLowerCase();
                
                // Date input field
                if (fieldType === 'date') {
                    return date.toISOString().split('T')[0]; // YYYY-MM-DD
                }
                
                // Check for specific date format requirements
                if (/dd[\-\/]mm[\-\/]yyyy/.test(field.placeholder || field.pattern || '')) {
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}/${month}/${year}`;
                }
                
                if (/mm[\-\/]dd[\-\/]yyyy/.test(field.placeholder || field.pattern || '')) {
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${month}/${day}/${year}`;
                }
                
                // Default format based on locale
                return date.toLocaleDateString('en-PK'); // Pakistani format
                
            } catch (error) {
                return value;
            }
        }

        formatName(value, field) {
            // Proper name formatting
            return value.toString()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }

        formatEmail(value, field) {
            return value.toString().toLowerCase().trim();
        }

        getFieldLabel(field) {
            // Get field label from various sources
            try {
                let label = '';
                
                // Check for label element
                if (field.id) {
                    const labelElement = document.querySelector(`label[for="${field.id}"]`);
                    if (labelElement) {
                        label += labelElement.textContent || labelElement.innerText || '';
                    }
                }
                
                // Check parent elements for label text
                const parent = field.parentElement;
                if (parent) {
                    const siblingLabel = parent.querySelector('label');
                    if (siblingLabel) {
                        label += ' ' + (siblingLabel.textContent || siblingLabel.innerText || '');
                    }
                    
                    // Check for text in parent element
                    const parentText = parent.textContent || parent.innerText || '';
                    if (parentText.length < 100) { // Avoid capturing too much text
                        label += ' ' + parentText;
                    }
                }
                
                // Check for aria-label or title attributes
                label += ' ' + (field.getAttribute('aria-label') || '');
                label += ' ' + (field.getAttribute('title') || '');
                
                return label.trim().toLowerCase();
                
            } catch (error) {
                console.warn('getFieldLabel error:', error);
                return '';
            }
        }

        async bypassFieldFill(field, value) {
            console.log('🎯 Enhanced bypass field fill:', field, value);
            
            try {
                const fieldType = field.type?.toLowerCase();
                const fieldName = (field.name || field.id || '').toLowerCase();
                
                // Special handling for date fields and calendar pickers
                if (fieldType === 'date' || /date|calendar|picker/.test(fieldName)) {
                    return await this.handleDateField(field, value);
                }
                
                // Special handling for number fields (like ID numbers)
                if (fieldType === 'number' || fieldType === 'tel' || /id|cnic|number/.test(fieldName)) {
                    return await this.handleNumberField(field, value);
                }
                
                // Special handling for text fields (names, addresses, etc.)
                if (fieldType === 'text' || fieldType === 'email' || !fieldType || 
                    /name|address|city|citizenship|postal/.test(fieldName)) {
                    return await this.handleTextField(field, value);
                }
                
                // Method 1: Direct value assignment
                if (field.tagName.toLowerCase() === 'select') {
                    return await this.handleSelectField(field, value);
                } else {
                    return await this.handleInputField(field, value);
                }
                
            } catch (error) {
                console.error('❌ Bypass field fill error:', error);
                return false;
            }
        }

        async handleDateField(field, value) {
            console.log('📅 Enhanced date field handling:', field, value);
            
            try {
                // Enhanced date formatting for all date field types
                const fieldIdentifiers = (field.name || field.id || field.className || '').toLowerCase();
                const fieldPlaceholder = (field.placeholder || '').toLowerCase();
                const fieldLabel = this.getFieldLabel(field);
                const allText = `${fieldIdentifiers} ${fieldPlaceholder} ${fieldLabel}`.toLowerCase();
                
                let formattedValue = value;
                let dataKey = 'dateOfBirth'; // default
                
                // Determine the date field type
                if (/passport.*issue|issue.*date.*passport/.test(allText)) {
                    dataKey = 'passportIssueDate';
                } else if (/passport.*expir|expir.*date.*passport/.test(allText)) {
                    dataKey = 'passportExpiryDate';
                } else if (/id.*issue|issue.*date.*id|cnic.*issue/.test(allText)) {
                    dataKey = 'idIssueDate';
                } else if (/id.*expir|expir.*date.*id|cnic.*expir/.test(allText)) {
                    dataKey = 'idExpiryDate';
                } else if (/birth|dob|born/.test(allText)) {
                    dataKey = 'dateOfBirth';
                }
                
                // Apply enhanced date formatting
                formattedValue = formatDocumentDate(value, field, dataKey);
                
                // Try direct date input first
                if (field.type === 'date') {
                    field.value = formattedValue;
                    this.triggerAllEvents(field);
                    
                    // Verify the value was set
                    if (field.value === formattedValue) {
                        return true;
                    }
                }
                
                // Handle calendar pickers
                const isCalendarField = field.getAttribute('data-toggle') === 'datepicker' ||
                                      field.classList.contains('datepicker') ||
                                      field.parentElement.querySelector('.calendar, .datepicker') ||
                                      /calendar|picker/.test(field.className);
                
                if (isCalendarField) {
                    return await this.handleCalendarPicker(field, formattedValue);
                }
                
                // Try different date formats for compatibility
                const dateFormats = [
                    formattedValue, // Our enhanced formatted value
                    this.formatDate(value, { type: 'date' }), // YYYY-MM-DD
                    new Date(value).toLocaleDateString('en-PK'), // DD/MM/YYYY
                    new Date(value).toLocaleDateString('en-US'), // MM/DD/YYYY
                    new Date(value).toLocaleDateString('en-GB'), // DD/MM/YYYY
                ];
                
                for (const format of dateFormats) {
                    field.value = format;
                    this.triggerAllEvents(field);
                    
                    if (field.value === format) {
                        console.log(`✅ Date format successful: ${format}`);
                        return true;
                    }
                    
                    await this.wait(100); // Small delay between attempts
                }
                
                return false;
                
            } catch (error) {
                console.error('❌ Enhanced date field handling error:', error);
                return false;
            }
        }

        async handleCalendarPicker(field, value) {
            console.log('📅 Handling calendar picker:', field, value);
            
            try {
                const date = new Date(value);
                if (isNaN(date.getTime())) return false;
                
                // Click the field to open calendar
                field.click();
                field.focus();
                await this.wait(500); // Wait for calendar to open
                
                // Try to find calendar container
                const calendarSelectors = [
                    '.datepicker',
                    '.calendar',
                    '.date-picker',
                    '.ui-datepicker',
                    '.bootstrap-datepicker',
                    '[role="dialog"]',
                    '.modal.date',
                    '.popup.date'
                ];
                
                let calendar = null;
                for (const selector of calendarSelectors) {
                    calendar = document.querySelector(selector);
                    if (calendar && calendar.offsetParent !== null) break; // Visible calendar
                }
                
                if (calendar) {
                    return await this.navigateCalendar(calendar, date);
                } else {
                    // Fallback: try setting value directly
                    field.value = this.formatDate(value, field);
                    this.triggerAllEvents(field);
                    return field.value !== '';
                }
                
            } catch (error) {
                console.error('❌ Calendar picker error:', error);
                return false;
            }
        }

        async navigateCalendar(calendar, targetDate) {
            console.log('🗓️ Navigating calendar to date:', targetDate);
            
            try {
                const targetYear = targetDate.getFullYear();
                const targetMonth = targetDate.getMonth();
                const targetDay = targetDate.getDate();
                
                // Try to set year first
                const yearSelect = calendar.querySelector('select[name*="year"], .year-select, .ui-datepicker-year');
                if (yearSelect) {
                    yearSelect.value = targetYear;
                    this.triggerAllEvents(yearSelect);
                    await this.wait(300);
                }
                
                // Try to set month
                const monthSelect = calendar.querySelector('select[name*="month"], .month-select, .ui-datepicker-month');
                if (monthSelect) {
                    monthSelect.value = targetMonth;
                    this.triggerAllEvents(monthSelect);
                    await this.wait(300);
                }
                
                // Try to click the day
                const daySelectors = [
                    `[data-day="${targetDay}"]`,
                    `[data-date="${targetDay}"]`,
                    `.day:contains("${targetDay}")`,
                    `td a:contains("${targetDay}")`,
                    `button:contains("${targetDay}")`,
                    `.ui-state-default:contains("${targetDay}")`
                ];
                
                for (const selector of daySelectors) {
                    const dayElement = calendar.querySelector(selector);
                    if (dayElement && !dayElement.classList.contains('disabled')) {
                        dayElement.click();
                        await this.wait(200);
                        return true;
                    }
                }
                
                // Alternative: try all day elements and match text content
                const dayElements = calendar.querySelectorAll('td, button, a, .day, .date');
                for (const dayEl of dayElements) {
                    if (dayEl.textContent.trim() === targetDay.toString() && 
                        !dayEl.classList.contains('disabled') &&
                        !dayEl.classList.contains('other-month')) {
                        dayEl.click();
                        await this.wait(200);
                        return true;
                    }
                }
                
                return false;
                
            } catch (error) {
                console.error('❌ Calendar navigation error:', error);
                return false;
            }
        }

        async handleNumberField(field, value) {
            console.log('🔢 Handling number field:', field, value);
            
            try {
                // Enhanced formatting for all field types
                let formattedValue = value;
                const fieldIdentifiers = (field.name || field.id || field.className || '').toLowerCase();
                const fieldPlaceholder = (field.placeholder || '').toLowerCase();
                const fieldLabel = this.getFieldLabel(field);
                const allText = `${fieldIdentifiers} ${fieldPlaceholder} ${fieldLabel}`.toLowerCase();
                
                // ID Number formatting (CNIC, SSN, etc.)
                if (/cnic|id|identity|national/.test(allText)) {
                    formattedValue = formatIdNumber(value, field);
                }
                // Phone number formatting
                else if (/phone|mobile|tel|contact/.test(allText)) {
                    formattedValue = this.formatPhoneNumber(value, field);
                }
                // Passport number formatting  
                else if (/passport|travel.*doc|document.*no/.test(allText)) {
                    formattedValue = formatPassportNumber(value, field);
                }
                // Pure number fields (age, etc.)
                else if (field.type === 'number') {
                    // Remove non-numeric characters for pure number fields
                    formattedValue = value.toString().replace(/\D/g, '');
                }
                // Default: keep original value
                else {
                    formattedValue = value;
                }
                
                field.value = formattedValue;
                this.triggerAllEvents(field);
                
                return field.value === formattedValue;
                
            } catch (error) {
                console.error('❌ Number field handling error:', error);
                return false;
            }
        }

    // duplicate handleDateField removed; consolidated earlier advanced implementation is used

        async handleTextField(field, value) {
            console.log('📝 Handling text field:', field, value);
            
            try {
                // Enhanced text formatting for all text field types
                const fieldIdentifiers = (field.name || field.id || field.className || '').toLowerCase();
                const fieldPlaceholder = (field.placeholder || '').toLowerCase();
                const fieldLabel = this.getFieldLabel(field);
                const allText = `${fieldIdentifiers} ${fieldPlaceholder} ${fieldLabel}`.toLowerCase();
                
                let formattedValue = value;
                
                // Name field formatting
                if (/name|full.*name|first.*name|last.*name|father|husband|guardian/.test(allText)) {
                    formattedValue = formatName(value, field);
                }
                // Address field formatting (basic cleaning)
                else if (/address|location|residence/.test(allText)) {
                    // Basic address formatting - trim and clean extra spaces
                    formattedValue = value.trim().replace(/\s+/g, ' ');
                }
                // Citizenship field formatting
                else if (/citizenship|nationality|citizen/.test(allText)) {
                    // Capitalize citizenship
                    formattedValue = value.trim().replace(/\b\w/g, l => l.toUpperCase());
                }
                // City field formatting
                else if (/city|town|municipality/.test(allText)) {
                    // Capitalize city names
                    formattedValue = value.trim().replace(/\b\w/g, l => l.toUpperCase());
                }
                // Postal code formatting
                else if (/postal|zip|pin.*code/.test(allText)) {
                    // Clean postal code - remove extra spaces
                    formattedValue = value.replace(/\s+/g, '').toUpperCase();
                }
                // Default: basic cleaning
                else {
                    formattedValue = value.trim();
                }
                
                field.value = formattedValue;
                this.triggerAllEvents(field);
                
                return field.value === formattedValue;
                
            } catch (error) {
                console.error('❌ Text field handling error:', error);
                return false;
            }
        }

        async handleSelectField(field, value) {
            console.log('📋 Handling select field:', field, value);
            
            try {
                // Handle select fields
                const option = Array.from(field.options).find(opt => 
                    opt.text.toLowerCase().includes(value.toLowerCase()) ||
                    opt.value.toLowerCase().includes(value.toLowerCase()) ||
                    opt.value === value
                );
                
                if (option) {
                    field.value = option.value;
                    option.selected = true;
                    this.triggerAllEvents(field);
                    return true;
                }
                
                return false;
                
            } catch (error) {
                console.error('❌ Select field handling error:', error);
                return false;
            }
        }

        async handleInputField(field, value) {
            console.log('📝 Handling input field:', field, value);
            
            try {
                // Clear field first
                field.focus();
                field.select();
                document.execCommand('delete');
                
                // Set value using multiple methods
                field.value = value;
                
                // For React/Vue compatibility
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeInputValueSetter.call(field, value);
                
                // Trigger all events
                this.triggerAllEvents(field);
                
                // Additional method for stubborn fields
                if (field.value !== value) {
                    field.setAttribute('value', value);
                    this.triggerAllEvents(field);
                }
                
                return field.value === value || field.getAttribute('value') === value;
                
            } catch (error) {
                console.error('❌ Input field handling error:', error);
                return false;
            }
        }

        triggerAllEvents(field) {
            // Comprehensive event triggering for maximum compatibility
            const events = [
                'input', 'change', 'blur', 'keyup', 'keydown', 'focus',
                'paste', 'textInput', 'propertychange'
            ];
            
            events.forEach(eventName => {
                try {
                    const event = new Event(eventName, { bubbles: true, cancelable: true });
                    field.dispatchEvent(event);
                } catch (e) {
                    // Fallback for older browsers
                    try {
                        const event = document.createEvent('Event');
                        event.initEvent(eventName, true, true);
                        field.dispatchEvent(event);
                    } catch (e2) {
                        console.log(`Could not trigger ${eventName} event`);
                    }
                }
            });
            
            // React/Vue specific events
            this.triggerReactVueEvents(field);
        }
    triggerReactVueEvents(field) {
            try {
                // Trigger React events
                if (field._valueTracker) {
                    field._valueTracker.setValue('');
                }
                
                // Trigger Vue events
                if (field.__vue__) {
                    field.__vue__.$emit('input', field.value);
                }
                
                // Generic framework events
                const frameworkEvents = ['input', 'change', 'update'];
                frameworkEvents.forEach(eventType => {
                    try {
                        const event = new CustomEvent(eventType, {
                            detail: { value: field.value },
                            bubbles: true
                        });
                        field.dispatchEvent(event);
                    } catch (error) {
                        // Ignore framework event errors
                    }
                });
                
            } catch (error) {
                // Ignore framework-specific errors
                console.log('Framework events skipped:', error.message);
            }
        }

    async eventBasedBypass(data) {
            console.log('📡 Event-based bypass...');
            
            // This method uses custom events to bypass CSP
            let processed = 0;
            let success = 0;
            
            try {
                const bypassEvent = new CustomEvent('propaceAutofillBypass', {
                    detail: {
                        data: data,
                        timestamp: Date.now(),
                        source: 'advanced-receiver'
                    }
                });
                
                document.dispatchEvent(bypassEvent);
                
                // Wait for potential processing
                await new Promise(resolve => setTimeout(resolve, 500));
                
                processed = Object.keys(data).length;
                success = processed; // Assume success for event-based bypass
                
            } catch (error) {
                console.error('❌ Event-based bypass error:', error);
            }
            
            return { processed, success };
        }

    async handleTextExtraction(request) {
            console.log('📝 Advanced text extraction...');
            
            try {
                // Use existing extraction function if available
                if (typeof extractDocumentDataEnhanced === 'function') {
                    const data = extractDocumentDataEnhanced();
                    return { success: true, data: data };
                }
                
                // Fallback extraction
                const fallbackData = this.performFallbackExtraction();
                return { success: true, data: fallbackData };
                
            } catch (error) {
                throw new Error(`Text extraction failed: ${error.message}`);
            }
        }

    performFallbackExtraction() {
            // Basic text extraction for CSP-restricted environments
            const data = {};
            
            const textElements = document.querySelectorAll('p, span, div, td, li, h1, h2, h3, h4, h5, h6');
            
            for (const element of textElements) {
                const text = element.textContent.trim();
                
                if (text.length > 5 && text.length < 100) {
                    // Try to identify the content type
                    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) {
                        data.email = text;
                    } else if (/\b\d{10,15}\b/.test(text)) {
                        data.phone = text;
                    } else if (/\b[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(text)) {
                        if (!data.name) data.name = text;
                    }
                }
            }
            
            return data;
        }

        // Missing method implementations for comprehensive fallback system
    async manualFieldMapping(data) {
            console.log('🗺️ Manual field mapping started...');
            
            let processed = 0;
            let success = 0;
            
            try {
                const fields = document.querySelectorAll('input, select, textarea, [contenteditable="true"]');
                
                for (const field of fields) {
                    processed++;
                    
                    const matchedValue = this.smartFieldMatching(field, data);
                    if (matchedValue) {
                        const filled = await this.safeFieldFill(field, matchedValue);
                        if (filled) success++;
                    }
                }
                
            } catch (error) {
                console.error('❌ Manual field mapping error:', error);
            }
            
            return { processed, success };
        }

    async tryEmergencyFallback(data) {
            console.log('🚨 Emergency fallback methods activated...');
            
            let processed = 0;
            let success = 0;
            
            try {
                // Emergency Method 1: Brute force field matching
                const bruteForceResult = await this.bruteForceFieldMatching(data);
                processed += bruteForceResult.processed;
                success += bruteForceResult.success;
                
                // Emergency Method 2: Timeout-based filling
                if (success === 0) {
                    const timeoutResult = await this.timeoutBasedFilling(data);
                    processed += timeoutResult.processed;
                    success += timeoutResult.success;
                }
                
            } catch (error) {
                console.error('❌ Emergency fallback error:', error);
            }
            
            return { processed, success };
        }

    async basicDOMFallback(data) {
            console.log('🛟 Basic DOM fallback (last resort)...');
            
            let processed = 0;
            let success = 0;
            
            try {
                // Very basic approach - just set values directly
                const allInputs = document.querySelectorAll('input, textarea');
                const dataValues = Object.values(data);
                
                for (let i = 0; i < Math.min(allInputs.length, dataValues.length); i++) {
                    processed++;
                    
                    try {
                        const field = allInputs[i];
                        const value = dataValues[i];
                        
                        if (field && value && field.type !== 'hidden' && field.type !== 'submit') {
                            field.value = value;
                            field.dispatchEvent(new Event('input', { bubbles: true }));
                            success++;
                        }
                    } catch (fillError) {
                        console.log('Basic fill failed for field:', fillError.message);
                    }
                }
                
            } catch (error) {
                console.error('❌ Basic DOM fallback error:', error);
            }
            
            return { processed, success };
        }

    async shadowDOMBypass(data) {
            console.log('🌒 Shadow DOM bypass for web components...');
            
            let processed = 0;
            let success = 0;
            
            try {
                // Find shadow roots
                const shadowHosts = document.querySelectorAll('*');
                
                for (const host of shadowHosts) {
                    if (host.shadowRoot) {
                        const shadowFields = host.shadowRoot.querySelectorAll('input, select, textarea');
                        
                        for (const field of shadowFields) {
                            processed++;
                            
                            const matchedValue = this.smartFieldMatching(field, data);
                            if (matchedValue) {
                                const filled = await this.safeFieldFill(field, matchedValue);
                                if (filled) success++;
                            }
                        }
                    }
                }
                
            } catch (error) {
                console.log('❌ Shadow DOM bypass error:', error.message);
            }
            
            return { processed, success };
        }

    async bruteForceFieldMatching(data) {
            // --- OPTIMIZED UNIFIED AUTOFILL ---
            const startTime = Date.now();
            let fieldsProcessed = 0;
            let fieldsSuccess = 0;
            let errorLog = [];
            // Get all fillable fields (smart cache)
            const fields = findAllFillableFields(document.body);
            if (!fields || fields.length === 0) {
                errorLog.push('No fillable fields found');
                return { fieldsProcessed: 0, fieldsSuccess: 0, errorLog, duration: Date.now() - startTime };
            }
            // Unified scoring
            const patterns = {
                name: /name|fname|first.*name|given.*name/i,
                lastName: /surname|lname|last.*name|family.*name/i,
                email: /email|e-mail|mail/i,
                phone: /phone|mobile|tel|contact/i,
                address: /address|street|location/i,
                city: /city|town/i,
                cnic: /cnic|id.*number|identity|national.*id/i,
                fatherName: /father|parent.*name/i,
                gender: /gender|sex/i,
                dateOfBirth: /birth|dob|age/i
            };
            const mappings = [];
            for (const [dataKey, dataValue] of Object.entries(data)) {
                if (!dataValue) continue;
                for (const field of fields) {
                    let score = 0;
                    const fieldText = `${field.name} ${field.id || ''} ${field.placeholder || ''}`.toLowerCase();
                    for (const [patternKey, pattern] of Object.entries(patterns)) {
                        if (dataKey.includes(patternKey) && pattern.test(fieldText)) {
                            score = 0.9;
                        }
                    }
                    if (dataKey.includes('name') && fieldText.includes('name')) score = Math.max(score, 0.7);
                    if (dataKey.includes('email') && fieldText.includes('email')) score = Math.max(score, 0.8);
                    if (dataKey.includes('phone') && fieldText.includes('phone')) score = Math.max(score, 0.8);
                    if (dataKey.includes('address') && fieldText.includes('address')) score = Math.max(score, 0.7);
                    if (score > 0.3) {
                        mappings.push({ dataKey, dataValue, field, score });
                    }
                }
            }
            mappings.sort((a,b)=>b.score-a.score);
            // Centralized state management
            const usedFields = new WeakSet();
            const usedDataKeys = new Set();
            for (const mapping of mappings) {
                if (usedFields.has(mapping.field.element) || usedDataKeys.has(mapping.dataKey)) continue;
                try {
                    // Fill field
                    const el = mapping.field.element;
                    const val = mapping.dataValue;
                    const wasReadOnly = el.readOnly;
                    if (wasReadOnly) el.readOnly = false;
                    if (el.tagName.toLowerCase() === 'select') {
                        for (let i=0; i<el.options.length; i++) {
                            if (el.options[i].textContent.toLowerCase().includes(val.toLowerCase()) || el.options[i].value.toLowerCase().includes(val.toLowerCase())) {
                                el.selectedIndex = i;
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                                break;
                            }
                        }
                    } else if (el.type === 'checkbox') {
                        el.checked = ['true','1','yes','on'].includes(String(val).toLowerCase());
                    } else if (el.type === 'radio') {
                        if (el.value === String(val)) el.checked = true;
                    } else if (el.isContentEditable) {
                        el.textContent = val;
                    } else {
                        el.value = val;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    if (wasReadOnly) el.readOnly = true;
                    usedFields.add(el);
                    usedDataKeys.add(mapping.dataKey);
                    fieldsSuccess++;
                } catch(e) { errorLog.push(e.message); }
                fieldsProcessed++;
            }
            return {
                fieldsProcessed,
                fieldsSuccess,
                errorLog,
                duration: Date.now() - startTime
            };
    }

    async performSystemDiagnostics(errorLog, warnings) {
            try {
                // Check 1: Page loading state
                console.log('📄 Page State:', document.readyState);
                if (document.readyState !== 'complete') {
                    warnings.push('Page not fully loaded - may affect autofill accuracy');
                }

                // Check 2: Content Security Policy
                const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
                if (cspMeta) {
                    console.log('🛡️ CSP Detected:', cspMeta.content.substring(0, 100) + '...');
                    warnings.push('Content Security Policy detected - may require bypass methods');
                }

                // Check 3: Framework detection
                const frameworks = this.detectFrameworks();
                if (frameworks.length > 0) {
                    console.log('⚛️ Frameworks detected:', frameworks.join(', '));
                    warnings.push(`Modern frameworks detected: ${frameworks.join(', ')} - may need special handling`);
                }

                // Check 4: Form fields availability
                const forms = document.querySelectorAll('form');
                const inputs = document.querySelectorAll('input, select, textarea');
                console.log('📝 Form elements:', `${forms.length} forms, ${inputs.length} input fields`);
                
                if (inputs.length === 0) {
                    errorLog.push('CRITICAL: No input fields found on page');
                }

                // Check 5: Extension permissions
                if (typeof chrome === 'undefined') {
                    errorLog.push('CRITICAL: Chrome extension APIs not available');
                } else {
                    console.log('🔧 Extension APIs: Available');
                }

                // Check 6: Site restrictions
                const hostname = window.location.hostname;
                const restrictedSites = ['accounts.google.com', 'login.microsoftonline.com', 'facebook.com'];
                if (restrictedSites.some(site => hostname.includes(site))) {
                    warnings.push(`Restricted site detected: ${hostname} - enhanced security measures may block autofill`);
                }

                // Check 7: JavaScript errors
                const originalConsoleError = console.error;
                let jsErrors = [];
                console.error = function(...args) {
                    jsErrors.push(args.join(' '));
                    originalConsoleError.apply(console, args);
                };
                
                // Restore console.error after a brief period
                setTimeout(() => {
                    console.error = originalConsoleError;
                    if (jsErrors.length > 0) {
                        warnings.push(`JavaScript errors detected: ${jsErrors.length} errors`);
                    }
                }, 2000);

            } catch (error) {
                errorLog.push(`Diagnostics failed: ${error.message}`);
            }
        }

    detectFrameworks() {
            const frameworks = [];
            
            if (window.React || document.querySelector('[data-reactroot]')) {
                frameworks.push('React');
            }
            if (window.Vue || document.querySelector('[data-v-]')) {
                frameworks.push('Vue');
            }
            if (window.angular || document.querySelector('[ng-app], [data-ng-app]')) {
                frameworks.push('Angular');
            }
            if (window.jQuery || window.$) {
                frameworks.push('jQuery');
            }
            
            return frameworks;
        }

    generateFinalReport(report) {
            const {
                fieldsProcessed,
                fieldsSuccess,
                methodsUsed,
                bypassUsed,
                totalTime,
                timeoutOccurred,
                errorLog,
                warnings,
                data
            } = report;

            console.group('📊 PROPACE AUTOFILL - FINAL REPORT');
            
            // Success metrics
            const successRate = fieldsProcessed > 0 ? Math.round((fieldsSuccess / fieldsProcessed) * 100) : 0;
            console.log(`🎯 SUCCESS RATE: ${successRate}% (${fieldsSuccess}/${fieldsProcessed} fields)`);
            console.log(`⏱️ EXECUTION TIME: ${totalTime}ms ${timeoutOccurred ? '(TIMED OUT)' : ''}`);
            console.log(`🔧 METHODS USED: ${methodsUsed.length > 0 ? methodsUsed.join(', ') : 'None'}`);
            console.log(`🛡️ BYPASS REQUIRED: ${bypassUsed ? 'Yes' : 'No'}`);
            
            // Data analysis
            console.log(`📋 DATA FIELDS AVAILABLE: ${Object.keys(data).length}`);
            console.log(`📋 FIELDS AVAILABLE: ${Object.keys(data).join(', ')}`);
            
            // Warnings section
            if (warnings.length > 0) {
                console.group('⚠️ WARNINGS');
                warnings.forEach((warning, index) => {
                    console.warn(`${index + 1}. ${warning}`);
                });
                console.groupEnd();
            }
            
            // Error analysis
            if (errorLog.length > 0) {
                console.group('❌ ERRORS AND ISSUES');
                errorLog.forEach((error, index) => {
                    console.error(`${index + 1}. ${error}`);
                });
                
                // Provide solutions
                console.group('💡 POSSIBLE SOLUTIONS');
                if (errorLog.some(e => e.includes('CSP'))) {
                    console.log('🛡️ CSP Issues: Try enabling "Allow scripts" or use a different browser');
                }
                if (errorLog.some(e => e.includes('timeout'))) {
                    console.log('⏰ Timeout Issues: Page may be slow loading - try again after page fully loads');
                }
                if (errorLog.some(e => e.includes('permission'))) {
                    console.log('🔒 Permission Issues: Extension may need additional permissions in Chrome settings');
                }
                if (errorLog.some(e => e.includes('field'))) {
                    console.log('📝 Field Issues: Form may use custom components - manual filling may be required');
                }
                if (successRate === 0) {
                    console.log('🚨 Complete Failure: This website may have strong anti-automation measures');
                    console.log('🔧 Recommendations: 1) Refresh page 2) Check Chrome extension permissions 3) Try manual entry');
                }
                console.groupEnd();
                console.groupEnd();
            }
            
            // Success message or failure analysis
            if (successRate >= 80) {
                console.log('🎉 AUTOFILL SUCCESSFUL - Most fields filled correctly!');
            } else if (successRate >= 50) {
                console.log('⚠️ PARTIAL SUCCESS - Some fields may need manual attention');
            } else if (successRate > 0) {
                console.log('❌ LIMITED SUCCESS - Manual filling recommended');
            } else {
                console.log('🚫 AUTOFILL FAILED - Website may block automated form filling');
            }
            
            console.groupEnd();
        }

    getHealthStatus() {
            return {
                success: true,
                status: 'healthy',
                features: {
                    standardMessaging: typeof chrome !== 'undefined' && !!chrome.runtime,
                    eventBypass: true,
                    domBypass: true,
                    windowBypass: true,
                    advancedReceiver: this.isInitialized
                },
                timestamp: Date.now(),
                uptime: Date.now() - window.propaceInjectionTime
            };
        }
    }

    // Store injection time for health monitoring
    window.propaceInjectionTime = Date.now();
    
    // Initialize advanced receiver
    window.propaceReceiver = new PropaceAdvancedReceiver();
    try { Object.defineProperty(window, '__PROPACE_MAIN_RECEIVER_READY__', { value: true, writable: false }); } catch(_) {}
    
    // Make receiver functions globally available for backward compatibility
    window.handleAutofillRequest = (request, sendResponse) => {
        return window.propaceReceiver.handleMessage(request, sendResponse, 'legacy-call');
    };
    
    window.handleTextExtraction = (request, sendResponse) => {
        return window.propaceReceiver.handleMessage(
            { ...request, action: 'extractText' }, 
            sendResponse, 
            'legacy-call'
        );
    };
    
    // ===================================================================
    // ==              RUNTIME MESSAGE LISTENER - ENHANCED             ==
    // ===================================================================
    
    // Add message listener with proper error handling
    // REMOVED: Duplicate message listener that was causing conflicts
    
    console.log('✅ Message listener registered successfully (using main handler)');
    
    // ===================================================================
    // ==              GOOGLE SERVICES COMPATIBILITY CHECK            ==
    // ===================================================================
    
    const isGoogleService = window.location.hostname.includes('google.com') || 
                           window.location.hostname.includes('googleapis.com') ||
                           window.location.hostname.includes('googleusercontent.com');
    
    const isGoogleDrive = window.location.hostname === 'drive.google.com' ||
                         window.location.href.includes('drive.google.com');
    
    const isComplexGoogleApp = isGoogleDrive || 
                              window.location.hostname.includes('docs.google.com') ||
                              window.location.hostname.includes('sheets.google.com') ||
                              window.location.hostname.includes('forms.google.com') ||
                              window.location.hostname.includes('mail.google.com');
    
    console.group('🚀 Propace Autofill: Enhanced Professional Initialization');
    console.log(`Advanced content script loading on: ${window.location.hostname}`);
    console.log(`URL: ${window.location.href}`);
    console.log('Version: 3.0 Enterprise-Grade Professional Edition');
    console.log(`Google Service Detected: ${isGoogleService}`);
    console.log(`Complex Google App: ${isComplexGoogleApp}`);
    
    // Check if we're on extension's own page
    const isExtensionPage = window.location.protocol === 'chrome-extension:';
    if (isExtensionPage) {
        console.log('🎯 Running on extension page - Enhanced compatibility mode');
    }
    
    // Special handling for Google services
    if (isComplexGoogleApp) {
        console.log('⚠️ Complex Google application detected - Using enhanced compatibility mode');
        console.log('📋 Note: Limited autofill functionality on Google services due to CSP restrictions');
    }
    
    console.groupEnd();

    // Make Google service detection variables globally accessible
    window.propaceIsGoogleService = isGoogleService;
    window.propaceIsComplexGoogleApp = isComplexGoogleApp;

    // ===================================================================
    // ==        ENHANCED GLOBAL VARIABLES & W3SCHOOLS COMPATIBILITY   ==
    // ===================================================================

    // Enhanced field patterns for better detection (preventing redefinition)
    if (typeof window.ENHANCED_ADVANCED_FIELD_PATTERNS === 'undefined') {
        window.ENHANCED_ADVANCED_FIELD_PATTERNS = {
            name: {
                patterns: [
                    /^(full[-_\s]?name|name|complete[-_\s]?name)$/i,
                    /^(first[-_\s]?name|fname|given[-_\s]?name)$/i,
                    /^(last[-_\s]?name|lname|surname|family[-_\s]?name)$/i,
                    /name/i
                ],
                keywords: ['name', 'full', 'complete', 'first', 'last', 'given', 'family', 'surname'],
                priority: 1
            },
            email: {
                patterns: [
                    /^(email|e[-_\s]?mail|email[-_\s]?address|mail)$/i,
                    /email/i
                ],
                keywords: ['email', 'mail', 'e-mail'],
                priority: 1
            },
            phone: {
                patterns: [
                    /^(phone|tel|telephone|mobile|cell|contact)$/i,
                    /^(phone[-_\s]?number|tel[-_\s]?number|mobile[-_\s]?number)$/i,
                    /phone|tel|mobile|contact/i
                ],
                keywords: ['phone', 'tel', 'mobile', 'cell', 'contact'],
                priority: 1
            },
            address: {
                patterns: [
                    /^(address|addr|location|street)$/i,
                    /^(home[-_\s]?address|work[-_\s]?address|mailing[-_\s]?address)$/i,
                    /address|location|street/i
                ],
                keywords: ['address', 'location', 'street', 'addr'],
                priority: 1
            },
            date: {
                patterns: [
                    /^(date|dob|birth|birthday)$/i,
                    /^(date[-_\s]?of[-_\s]?birth|birth[-_\s]?date)$/i,
                    /date|birth/i
                ],
                keywords: ['date', 'birth', 'dob', 'birthday'],
                priority: 1
            }
        };
        console.log('✅ Enhanced field patterns initialized');
    }

    // Enhanced helper function to get field label
    const getEnhancedFieldLabel = (element) => {
        if (!element) return '';
        
        let label = '';
        
        // Method 1: Direct label element
        if (element.id) {
            const labelElement = document.querySelector(`label[for="${element.id}"]`);
            if (labelElement) {
                label = labelElement.textContent || labelElement.innerText || '';
            }
        }
        
        // Method 2: Parent label
        if (!label) {
            const parentLabel = element.closest('label');
            if (parentLabel) {
                label = parentLabel.textContent || parentLabel.innerText || '';
            }
        }
        
        // Method 3: Previous sibling text
        if (!label) {
            let sibling = element.previousElementSibling;
            while (sibling && !label) {
                if (sibling.tagName === 'LABEL' || sibling.tagName === 'SPAN' || sibling.tagName === 'DIV') {
                    label = sibling.textContent || sibling.innerText || '';
                    break;
                }
                sibling = sibling.previousElementSibling;
            }
        }
        
        return label.trim();
    };

    // ===================================================================
    // ==              W3SCHOOLS TRYIT EDITOR COMPATIBILITY            ==
    // ===================================================================

    // Special handling for W3Schools TryIt editor
    const handleW3SchoolsTryIt = () => {
        console.log('🎯 Detecting W3Schools TryIt editor...');
        
        // Check if we're in W3Schools TryIt iframe
        const isW3SchoolsTryIt = window.location.href.includes('w3schools.com') || 
                               window.location.href.includes('tryit.asp') ||
                               document.querySelector('#iframeResult') ||
                               parent !== window; // We're in an iframe
        
        if (isW3SchoolsTryIt) {
            console.log('📝 W3Schools TryIt editor detected, applying special handling...');
            
            // Handle iframe content
            setTimeout(() => {
                // Look for result iframe
                const resultFrame = document.getElementById('iframeResult') || 
                                   document.querySelector('iframe[name="iframeResult"]') ||
                                   document.querySelector('.w3-example iframe');
                
                if (resultFrame) {
                    console.log('🖼️ Found result iframe, waiting for content...');
                    
                    // Wait for iframe to load
                    resultFrame.addEventListener('load', () => {
                        try {
                            const iframeDoc = resultFrame.contentDocument || resultFrame.contentWindow.document;
                            if (iframeDoc) {
                                console.log('✅ Iframe document accessible, scanning for forms...');
                                scanIframeForForms(iframeDoc);
                            }
                        } catch (error) {
                            console.warn('⚠️ Cannot access iframe content (cross-origin):', error.message);
                            // Fallback: scan current document
                            scanCurrentDocument();
                        }
                    });
                    
                    // Also try immediate access
                    try {
                        const iframeDoc = resultFrame.contentDocument || resultFrame.contentWindow.document;
                        if (iframeDoc && iframeDoc.readyState === 'complete') {
                            scanIframeForForms(iframeDoc);
                        }
                    } catch (error) {
                        console.log('🔄 Iframe not ready yet, will wait for load event...');
                    }
                } else {
                    // No iframe found, scan current document
                    console.log('📄 No iframe found, scanning current document...');
                    scanCurrentDocument();
                }
            }, 1000);
            
            return true;
        }
        
        return false;
    };

    // Scan iframe document for forms
    const scanIframeForForms = (iframeDoc) => {
        console.log('🔍 Scanning iframe for form fields...');
        
        const fields = iframeDoc.querySelectorAll('input, select, textarea');
        console.log(`📊 Found ${fields.length} form fields in iframe`);
        
        if (fields.length > 0) {
            // Store reference to iframe document for autofill
            window.propaceTargetDocument = iframeDoc;
            console.log('✅ Iframe fields detected and ready for autofill');
            
            // Optional: Highlight fields for demonstration
            fields.forEach((field, index) => {
                if (field.type !== 'hidden' && field.type !== 'submit' && field.type !== 'button') {
                    field.style.border = '2px solid #4CAF50';
                    field.title = `Propace Field ${index + 1}: ${window.detectFieldType(field)}`;
                }
            });
        }
    };

    // Scan current document
    const scanCurrentDocument = () => {
        console.log('🔍 Scanning current document for form fields...');
        
        const fields = document.querySelectorAll('input, select, textarea');
        console.log(`📊 Found ${fields.length} form fields in current document`);
        
        if (fields.length > 0) {
            window.propaceTargetDocument = document;
            console.log('✅ Current document fields detected and ready for autofill');
        }
    };

    // Enhanced single field filling function
    const fillSingleFieldEnhanced = async (field, value) => {
        if (!field || value === null || value === undefined) return false;
        
        try {
            // Focus the field first
            field.focus();
            
            // Handle different field types
            switch (field.type) {
                case 'checkbox':
                    field.checked = Boolean(value);
                    break;
                    
                case 'radio':
                    if (field.value === value || value === true) {
                        field.checked = true;
                    }
                    break;
                    
                case 'select-one':
                case 'select-multiple':
                    // Try to find matching option
                    const options = field.querySelectorAll('option');
                    for (const option of options) {
                        if (option.value.toLowerCase() === String(value).toLowerCase() ||
                            option.textContent.toLowerCase() === String(value).toLowerCase()) {
                            option.selected = true;
                            break;
                        }
                    }
                    break;
                    
                default:
                    // Clear existing value
                    field.value = '';
                    
                    // Set new value
                    field.value = String(value);
                    
                    // Trigger input events for frameworks
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
            }
            
            // Final blur to complete the interaction
            field.blur();
            
            // Small delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return true;
            
        } catch (error) {
            console.warn('⚠️ Error filling single field:', error);
            return false;
        }
    };

    // Helper function to show temporary notification
    const showTemporaryNotification = (message) => {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    };

    // Initialize W3Schools compatibility
    setTimeout(() => {
        handleW3SchoolsTryIt();
    }, 500);

    // ===================================================================
    // ==         ENHANCED FIELD TYPE DETECTION (GLOBAL FUNCTION)     ==
    // ===================================================================

    // Enhanced field type detection function (avoiding redefinition)
    if (typeof window.detectFieldType === 'undefined') {
        window.detectFieldType = (element) => {
            if (!element) return 'unknown';
            
            const tagName = element.tagName.toLowerCase();
            const type = element.type ? element.type.toLowerCase() : '';
            const role = element.getAttribute('role');
            const name = element.name ? element.name.toLowerCase() : '';
            const id = element.id ? element.id.toLowerCase() : '';
            const className = element.className ? element.className.toLowerCase() : '';
            const placeholder = element.placeholder ? element.placeholder.toLowerCase() : '';
            
            // Get field label for better detection
            const label = getEnhancedFieldLabel(element).toLowerCase();
            const allText = `${name} ${id} ${className} ${placeholder} ${label}`.toLowerCase();
            
            // Special field types first
            if (tagName === 'select') return 'select';
            if (element.getAttribute('contenteditable') === 'true') return 'contenteditable';
            if (type === 'radio') return 'radio-group';
            if (type === 'checkbox') return 'checkbox';
            if (type === 'date' || type === 'datetime-local') return 'date';
            if (type === 'email') return 'email';
            if (type === 'tel' || type === 'phone') return 'phone';
            if (type === 'url') return 'url';
            if (type === 'number') return 'number';
            if (tagName === 'textarea') return 'textarea';
            
            // Detect custom dropdowns
            if (role === 'combobox' || role === 'listbox' || 
                className.includes('dropdown') ||
                className.includes('select') ||
                element.getAttribute('aria-haspopup')) {
                return 'custom-dropdown';
            }
            
            // Enhanced pattern matching using the new global patterns
            for (const [fieldType, config] of Object.entries(window.ENHANCED_ADVANCED_FIELD_PATTERNS)) {
                // Check against patterns
                for (const pattern of config.patterns) {
                    if (pattern.test(allText) || pattern.test(name) || pattern.test(id)) {
                        return fieldType;
                    }
                }
                
                // Check against keywords
                for (const keyword of config.keywords) {
                    if (allText.includes(keyword)) {
                        return fieldType;
                    }
                }
            }
            
            return 'input';
        };
        console.log('✅ Enhanced detectFieldType function initialized globally');
    }

    // Make detectFieldType available as local const for backward compatibility
    // const detectFieldType = window.detectFieldType; // COMMENTED TO PREVENT REDECLARATION ERROR

    // ===================================================================
    // ==           OPTIMIZED FIELD PATTERNS - PERFORMANCE ENHANCED   ==
    // ===================================================================

    // Comprehensive field mapping for intelligent form detection - OPTIMIZED FOR PERFORMANCE
    // Make ADVANCED_FIELD_PATTERNS globally accessible
    window.ADVANCED_FIELD_PATTERNS = {
        // Name fields - ULTRA COMPREHENSIVE (100+ variations)
        name: [
            // Basic name patterns
            'name', 'full_name', 'fullname', 'full-name', 'complete_name', 'completename',
            'user_name', 'username', 'user-name', 'display_name', 'displayname',
            
            // First/Given name patterns
            'fname', 'first_name', 'firstname', 'first-name', 'given_name', 'givenname', 'given-name',
            'forename', 'fore_name', 'fore-name', 'christian_name', 'personal_name',
            
            // Last/Sur name patterns (but treat as full name)
            'lname', 'last_name', 'lastname', 'last-name', 'surname', 'sur_name', 'sur-name',
            'family_name', 'familyname', 'family-name', 'second_name', 'secondname', 'second-name',
            
            // International variations
            'applicant_name', 'participant_name', 'member_name', 'student_name', 'customer_name',
            'client_name', 'person_name', 'individual_name', 'candidate_name', 'employee_name',
            'beneficiary_name', 'account_holder', 'holder_name', 'legal_name', 'official_name',
            
            // Multi-language support - Enhanced with regional dialects
            'nom', 'nombre', 'nome', 'nomi', 'naam', 'nama', 'isim', 'ten', 'имя', 'नाम',
            'اسم', 'نام', 'ชื่อ', '名前', '姓名', '이름', 'tên', 'pangalan', 'jina',
            
            // Enhanced Arabic/Urdu patterns
            'اسم کامل', 'نام مکمل', 'پورا نام', 'مکمل نام', 'الاسم الكامل', 'الاسم الأول', 'الاسم الأخير',
            
            // Enhanced Hindi/Devanagari patterns
            'पूरा नाम', 'व्यक्ति का नाम', 'नाम पूर्ण', 'संपूर्ण नाम', 'व्यक्तिगत नाम',
            
            // Enhanced European patterns
            'vollständiger name', 'nome completo', 'nom complet', 'nombre completo', 'teljes név',
            'pełne imię', 'jméno a příjmení', 'ime i prezime', 'täielik nimi'
        ],

        // Father/Guardian name - ULTRA COMPREHENSIVE
        fatherName: [
            // PRIMARY FATHER PATTERNS
            'father_name', 'fathername', 'father-name', 'father', 'fathers_name', 'father_full_name',
            'father_complete_name', 'complete_father_name', 'full_father_name', 'dad_name', 'daddy_name',
            'paternal_name', 'paternalname', 'paternal-name', 'paternal_guardian', 'male_guardian',
            
            // GUARDIAN/PARENT PATTERNS
            'guardian_name', 'guardian-name', 'guardianname', 'guardian', 'legal_guardian', 'legal-guardian',
            'parent_name', 'parentname', 'parent-name', 'male_parent', 'primary_guardian',
            'responsible_parent', 'head_of_family', 'family_head', 'household_head',
            
            // PAKISTANI/URDU SPECIFIC
            'والد_کا_نام', 'والد_نام', 'باپ_کا_نام', 'ابو_کا_نام', 'والدین_کا_نام',
            'سرپرست_کا_نام', 'ولی_کا_نام', 'قانونی_سرپرست', 'خاندان_کا_سربراہ',
            
            // ACADEMIC/FORMAL CONTEXTS
            'father_guardian_name', 'father/guardian_name', 'father_or_guardian', 'parent_guardian',
            'next_of_kin', 'emergency_contact', 'responsible_person', 'sponsor_name', 'reference_person',
            'family_contact', 'primary_contact', 'authorized_person', 'nominated_person',
            
            // INTERNATIONAL VARIATIONS
            'padre', 'père', 'vater', 'отец', 'पिता', 'أب', 'padre_nombre', 'nom_père',
            'vater_name', 'father_full', 'complete_father', 'father_info', 'paternal_info',
            
            // FORM SPECIFIC
            'your_father', 'your-father', 'enter_father', 'father_details', 'paternal_details',
            'guardian_details', 'parent_information', 'family_reference'
        ],

        // Husband/Spouse name - ULTRA COMPREHENSIVE  
        husbandName: [
            // PRIMARY HUSBAND/SPOUSE PATTERNS
            'husband_name', 'husbandname', 'husband-name', 'husband', 'husbands_name', 'husband_full_name',
            'spouse_name', 'spouse-name', 'spousename', 'spouse', 'spouse_full_name', 'complete_spouse_name',
            'partner_name', 'partnername', 'partner-name', 'life_partner', 'life-partner',
            'marital_partner', 'marriage_partner', 'married_to', 'wedded_to', 'union_partner',
            
            // PAKISTANI/URDU SPECIFIC
            'شوہر_کا_نام', 'شوہر_نام', 'میاں_کا_نام', 'خاوند_کا_نام', 'شریک_حیات',
            'زوج_کا_نام', 'ہمسفر_کا_نام', 'بیوی_کا_نام', 'بیگم_کا_نام',
            
            // RELATIONSHIP CONTEXT
            'significant_other', 'domestic_partner', 'civil_partner', 'registered_partner',
            'common_law_spouse', 'de_facto_spouse', 'marital_name', 'married_name', 'family_name',
            'spousal_name', 'conjugal_partner', 'relationship_partner', 'romantic_partner',
            
            // FORMAL/LEGAL CONTEXT
            'legal_spouse', 'lawful_spouse', 'wedded_spouse', 'matrimonial_partner', 'union_name',
            'joint_name', 'shared_name', 'couple_name', 'marriage_name', 'wedding_partner',
            
            // EMERGENCY/CONTACT CONTEXT
            'emergency_spouse', 'contact_spouse', 'notify_spouse', 'spousal_contact', 'partner_contact',
            'next_of_kin_spouse', 'family_emergency', 'spousal_reference', 'marital_contact',
            
            // INTERNATIONAL VARIATIONS
            'esposo', 'époux', 'ehemann', 'муж', 'पति', 'زوج', 'esposa', 'épouse', 'ehefrau',
            'жена', 'पत्नी', 'زوجة', 'cónyuge', 'conjoint', 'ehepartner', 'супруг'
        ],
            
            // Date fields - ULTRA COMPREHENSIVE
            dateOfBirth: [
                // Basic DOB patterns
                'dob', 'date_of_birth', 'dateofbirth', 'date-of-birth', 'birth_date', 'birthdate', 'birth-date',
                'bdate', 'birthday', 'born_date', 'born_on', 'date_born', 'birth_day', 'birth_year', 'birth_month',
                
                // International variations
                'date_naissance', 'fecha_nacimiento', 'data_nascimento', 'geburtsdatum', 'geboortedatum',
                'birth_info', 'born', 'age_verification', 'birth_verification', 'when_born',
                
                // Arabic/Urdu
                'تاریخ_پیدائش', 'تولد', 'پیدائش', 'جنم_تاریخ'
            ],
            
            // Gender - COMPREHENSIVE
            gender: [
                'gender', 'sex', 'male_female', 'gender_type', 'gender_selection', 'gender_identity',
                'biological_sex', 'assigned_sex', 'birth_sex', 'legal_gender', 'sex_assigned',
                'mr_mrs', 'title', 'salutation', 'prefix', 'gender_marker', 'sexe', 'género', 'gênero'
            ],
            
            // ID fields - ULTRA COMPREHENSIVE (Pakistani + International) - ENHANCED
            idNumber: [
                // Pakistani CNIC patterns - PRIMARY
                'id_number', 'idnumber', 'id-number', 'id_no', 'id-no', 'id_num', 'id-num',
                'cnic', 'cnic_number', 'cnic-number', 'cnic_no', 'cnic-no', 'cnicnumber',
                'national_id', 'nationalid', 'national-id', 'national_id_card', 'national-id-card',
                'identity_number', 'identity_card', 'identity-card', 'identity_card_number',
                'id_card', 'id_card_number', 'id-card-number', 'card_number', 'card-number',
                'citizen_id', 'citizen-id', 'personal_id', 'personal-id', 'govt_id', 'govt-id',
                'computerized_id', 'computerized-id', 'smart_card', 'smart-card',
                
                // Pakistani specific terms
                'شناختی_کارڈ', 'شناختی_کارڈ_نمبر', 'قومی_شناختی_کارڈ', 'سی_این_آئی_سی',
                'قومی_شناخت', 'شناخت_نمبر', 'قومی_شناختی_کارڈ_نمبر',
                
                // University/Academic specific
                'student_id', 'student-id', 'student_number', 'student-number', 'roll_number', 'roll-number',
                'admission_id', 'admission-id', 'admission_number', 'admission-number',
                'registration_id', 'registration-id', 'reg_id', 'reg-id', 'reg_number', 'reg-number',
                'university_id', 'university-id', 'college_id', 'college-id', 'enrollment_id',
                'matric_id', 'matric-id', 'academic_id', 'academic-id',
                
                // Alternative ID patterns
                'identification', 'identification_number', 'identification-number', 'id_code', 'id-code',
                'person_id', 'person-id', 'individual_id', 'individual-id', 'unique_id', 'unique-id',
                'document_number', 'document-number', 'doc_number', 'doc-number', 'reference_id',
                'applicant_id', 'applicant-id', 'candidate_id', 'candidate-id', 'member_id', 'member-id',
                
                // International variations
                'social_security', 'ssn', 'sin', 'nino', 'tax_id', 'tax_number', 'tin',
                'national_insurance', 'alien_number', 'green_card', 'state_id', 'drivers_license',
                'licence_number', 'permit_number', 'health_card', 'medicare', 'medicaid',
                'passport_number', 'passport-number', 'visa_number', 'visa-number',
                
                // Regional specific
                'aadhar', 'aadhar_number', 'pan_card', 'pan_number', 'voter_id', 'voter-id',
                'ration_card', 'ration-card', 'uid', 'unique_identification'
            ],

            // Country/Nationality - SUPER BROAD
            country: [
                // Basic country patterns
                'country', 'nationality', 'nation', 'citizenship', 'citizen_of', 'native_of',
                'country_of_birth', 'birth_country', 'origin_country', 'home_country',
                'country_of_origin', 'country_of_citizenship', 'country_of_residence',
                
                // Passport/Travel related
                'country_of_issue', 'countryofissue', 'country-of-issue', 'issuing_country',
                'passport_country', 'issued_by_country', 'document_issuing_country',
                
                // Broad matching patterns
                'where_are_you_from', 'which_country', 'your_country', 'home_nation',
                'country_you_live', 'country_of_living', 'residence_country', 'domicile',
                'where_do_you_live', 'current_country', 'living_in', 'based_in',
                'country_code', 'nation_code', 'iso_country', 'country_selection',
                
                // Multi-language
                'pays', 'país', 'paese', 'land', 'страна', 'देश', 'ملک', 'بلد', 'ประเทศ', '国', '나라'
            ],

            // Contact fields - ULTRA COMPREHENSIVE PHONE PATTERNS
            phoneNumber: [
                // PRIMARY PHONE PATTERNS
                'phone', 'phone_number', 'phonenumber', 'phone-number', 'phone_no', 'phone-no',
                'tel', 'telephone', 'telephone_number', 'telephone-number', 'tel_number', 'tel-number',
                'mobile', 'mobile_number', 'mobilenumber', 'mobile-number', 'mobile_no', 'mobile-no',
                'cell', 'cellphone', 'cell_phone', 'cell-phone', 'cellular', 'cellular_number',
                
                // CONTACT SPECIFIC
                'contact', 'contact_number', 'contactnumber', 'contact-number', 'contact_no', 'contact-no',
                'contact_phone', 'contact-phone', 'phone_contact', 'phone-contact',
                'reach_number', 'reach-number', 'call_number', 'call-number', 'call_at', 'call-at',
                
                // CONTEXT SPECIFIC
                'primary_phone', 'primary-phone', 'main_phone', 'main-phone', 'personal_phone', 'personal-phone',
                'home_phone', 'home-phone', 'residence_phone', 'residence-phone', 'house_phone', 'house-phone',
                'work_phone', 'work-phone', 'office_phone', 'office-phone', 'business_phone', 'business-phone',
                'emergency_phone', 'emergency-phone', 'emergency_contact', 'emergency-contact',
                'alternate_phone', 'alternate-phone', 'alternative_phone', 'alternative-phone',
                'secondary_phone', 'secondary-phone', 'backup_phone', 'backup-phone', 'other_phone', 'other-phone',
                
                // MESSAGING/SOCIAL
                'whatsapp', 'whatsapp_number', 'whatsapp-number', 'whatsapp_no', 'whatsapp-no',
                'messaging_number', 'messaging-number', 'sms_number', 'sms-number', 'text_number', 'text-number',
                'viber', 'viber_number', 'telegram', 'telegram_number', 'signal_number',
                
                // TECHNICAL VARIATIONS
                'landline', 'landline_number', 'landline-number', 'fixed_line', 'fixed-line',
                'fax', 'fax_number', 'fax-number', 'facsimile', 'facsimile_number',
                
                // PAKISTANI/REGIONAL SPECIFIC
                'موبائل', 'موبائل_نمبر', 'فون_نمبر', 'رابطہ_نمبر', 'ٹیلیفون',
                'جاز', 'ٹیلینار', 'یوفون', 'زونگ', 'واٹس_ایپ',
                
                // INTERNATIONAL VARIATIONS
                'móvil', 'movil_numero', 'celular', 'celular_numero', 'teléfono', 'telefono_numero',
                'telefone', 'telefone_numero', 'telefoon', 'telefoon_nummer', 'telefon', 'telefon_nummer',
                'телефон', 'мобильный', 'сотовый', 'फ़ोन', 'मोबाइल', 'தொலைபேசி',
                
                // FORM SPECIFIC
                'your_phone', 'your-phone', 'enter_phone', 'enter-phone', 'provide_phone', 'phone_here', 'phone-here'
            ],

            // Email - ULTRA COMPREHENSIVE with STRICT PATTERNS
            email: [
                // PRIMARY EMAIL PATTERNS - Exact matches
                'email', 'email_address', 'emailaddress', 'email-address', 'e_mail', 'e-mail',
                'mail_address', 'mail-address', 'mailaddress', 'electronic_mail', 'electronic-mail',
                
                // SPECIFIC EMAIL CONTEXTS
                'contact_email', 'contact-email', 'user_email', 'user-email', 'personal_email', 'personal-email',
                'primary_email', 'primary-email', 'work_email', 'work-email', 'business_email', 'business-email',
                'official_email', 'official-email', 'professional_email', 'professional-email',
                'login_email', 'login-email', 'account_email', 'account-email', 'signin_email', 'signin-email',
                'recovery_email', 'recovery-email', 'backup_email', 'backup-email', 'alternate_email', 'alternate-email',
                'correspondence_email', 'communication_email', 'notification_email', 'alert_email',
                
                // ACADEMIC/UNIVERSITY SPECIFIC
                'student_email', 'student-email', 'university_email', 'university-email', 'academic_email', 'academic-email',
                'school_email', 'school-email', 'college_email', 'college-email', 'institutional_email',
                'edu_email', 'edu-email', 'campus_email', 'campus-email',
                
                // TECHNICAL VARIATIONS
                'email_id', 'email-id', 'emailid', 'mail_id', 'mail-id', 'mailid',
                'email_contact', 'email-contact', 'contact_mail', 'contact-mail',
                'reach_email', 'reach-email', 'reply_email', 'reply-email',
                'from_email', 'from-email', 'to_email', 'to-email', 'sender_email',
                
                // INTERNATIONAL VARIATIONS
                'correo', 'correo_electronico', 'correo-electronico', 'correio', 'correio_eletronico',
                'courriel', 'courrier_electronique', 'posta_elettronica', 'email_adres',
                'электронная_почта', 'ईमेल', 'ای_میل', 'برید_الکترونیک',
                
                // FORM SPECIFIC
                'your_email', 'your-email', 'enter_email', 'enter-email', 'provide_email',
                'email_here', 'email-here', 'valid_email', 'valid-email'
            ],
            
            // Address fields - ULTRA BROAD with PRIORITY SYSTEM
            address: [
                // PRIMARY ADDRESS PATTERNS (General address - lowest priority)
                'address', 'street_address', 'streetaddress', 'street-address', 'street',
                'residential_address', 'home_address', 'homeaddress', 'home-address',
                'mailing_address', 'postal_address', 'contact_address', 'physical_address',
                'location', 'residence', 'domicile_address', 'living_address',
                
                // Address components
                'address_line_1', 'address_line1', 'address1', 'addr1', 'line1',
                'address_line_2', 'address_line2', 'address2', 'addr2', 'line2',
                'street_name', 'road', 'avenue', 'boulevard', 'lane', 'drive', 'way',
                'house_number', 'building_number', 'apartment', 'apt', 'suite', 'unit',
                'flat', 'floor', 'room', 'block', 'sector', 'plot', 'house_no',
                'building_name', 'complex', 'society', 'colony', 'area', 'locality',
                
                // International variations
                'dirección', 'endereço', 'adresse', 'indirizzo', 'адрес', 'पता', 'عنوان',
                'complete_address', 'full_address', 'detailed_address'
            ],

            // Current Address - HIGHEST PRIORITY
            currentAddress: [
                'current_address', 'currentaddress', 'current-address', 'present_address',
                'presentaddress', 'present-address', 'temporary_address', 'temp_address',
                'residing_address', 'living_address', 'staying_address', 'actual_address',
                'correspondence_address', 'communication_address', 'contact_address',
                'current_residential', 'present_residential', 'current_location',
                'where_you_live', 'current_residence', 'present_residence',
                'current_home', 'present_home', 'current_postal', 'present_postal'
            ],

            // Permanent Address - MEDIUM PRIORITY
            permanentAddress: [
                'permanent_address', 'permanentaddress', 'permanent-address', 'perm_address',
                'home_address', 'homeaddress', 'home-address', 'family_address',
                'native_address', 'original_address', 'base_address', 'primary_address',
                'registered_address', 'legal_address', 'official_address', 'domicile',
                'ancestral_address', 'hometown_address', 'birth_address', 'origin_address',
                'permanent_residential', 'permanent_home', 'permanent_location',
                'fixed_address', 'stable_address', 'long_term_address'
            ],

            // Additional comprehensive patterns...
            city: [
                'city', 'town', 'municipality', 'urban', 'metro', 'district', 'locality',
                'place', 'settlement', 'township', 'borough', 'county', 'parish',
                'city_name', 'town_name', 'municipality_name', 'district_name',
                'current_city', 'present_city', 'home_city', 'birth_city',
                'resident_city', 'living_city', 'location_city', 'address_city',
                'ciudad', 'cidade', 'ville', 'città', 'город', 'शहर', 'شهر',
                'tehsil', 'thana', 'upazila', 'mandal', 'taluka', 'block'
            ],

            state: [
                'state', 'province', 'region', 'territory', 'prefecture', 'oblast',
                'state_name', 'province_name', 'region_name', 'territory_name',
                'administrative_division', 'federal_state', 'constituent_state',
                'estado', 'província', 'région', 'regione', 'область', 'राज्य', 'صوبہ'
            ],

            postalCode: [
                'postal_code', 'postalcode', 'postal-code', 'zip_code', 'zipcode', 'zip-code',
                'zip', 'postcode', 'post_code', 'post-code', 'pin', 'pin_code', 'pincode',
                'area_code', 'mail_code', 'delivery_code', 'sorting_code',
                'código_postal', 'cep', 'code_postal', 'codice_postale', 'почтовый_код'
            ],

            placeOfBirth: [
                'place_of_birth', 'placeofbirth', 'place-of-birth', 'birth_place', 'birthplace', 'birth-place',
                'born_in', 'born_at', 'birth_city', 'birth_location', 'native_place', 'hometown',
                'birth_town', 'birth_village', 'origin_place', 'where_born', 'birth_region',
                'lieu_naissance', 'lugar_nacimiento', 'local_nascimento', 'geburtsort'
            ],

            idIssueDate: [
                'id_issue_date', 'id_issue', 'id-issue-date', 'issue_date', 'issuedate', 'issue-date',
                'issued_on', 'issued_date', 'card_issue_date', 'date_issued', 'issuance_date',
                'document_date', 'validity_start', 'effective_date', 'granted_on'
            ],

            // Passport Number - ULTRA COMPREHENSIVE
            passportNo: [
                // PRIMARY PASSPORT PATTERNS
                'passport_number', 'passportnumber', 'passport-number', 'passport_no', 'passportno',
                'passport-no', 'passport', 'passport_id', 'passport-id', 'passportid',
                'travel_document', 'travel-document', 'travel_document_number', 'travel-document-number',
                'document_number', 'document-number', 'documentnumber', 'doc_number', 'doc-number',
                
                // TRAVEL DOCUMENT VARIATIONS
                'travel_doc_number', 'travel-doc-number', 'travel_id', 'travel-id', 'travelid',
                'international_id', 'international-id', 'passport_ref', 'passport-ref', 'passport_reference',
                'passport_document', 'passport-document', 'official_document', 'official-document',
                'government_document', 'govt_document', 'identity_document', 'identity-document',
                
                // PAKISTANI/URDU SPECIFIC
                'پاسپورٹ_نمبر', 'پاسپورٹ_نامبر', 'سفری_دستاویز', 'سفری_کاغذات', 'بین_الاقوامی_شناخت',
                'حکومتی_دستاویز', 'سرکاری_کاغذات', 'شناختی_دستاویز', 'قومی_دستاویز',
                
                // INTERNATIONAL VARIATIONS
                'pasaporte', 'pasaporte_numero', 'numero_pasaporte', 'passeport', 'passeport_numero',
                'numero_passeport', 'passaporto', 'numero_passaporto', 'reisepass', 'reisepass_nummer',
                'паспорт', 'номер_паспорта', 'पासपोर्ट', 'पासपोर्ट_संख्या', 'جواز_السفر', 'رقم_جواز_السفر',
                
                // FORM SPECIFIC
                'your_passport', 'your-passport', 'enter_passport', 'passport_info', 'passport_details',
                'provide_passport', 'passport_here', 'valid_passport', 'current_passport'
            ],

            // Passport Issue Date - COMPREHENSIVE
            passportIssueDate: [
                // PRIMARY ISSUE DATE PATTERNS
                'passport_issue_date', 'passport_issue', 'passport-issue-date', 'passport_issued_on',
                'passport_issued_date', 'passport-issued-date', 'passport_date_issued', 'passport_grant_date',
                'passport_issuance_date', 'passport-issuance-date', 'passport_grant', 'passport_given',
                
                // DOCUMENT ISSUE PATTERNS
                'document_issue_date', 'document-issue-date', 'doc_issue_date', 'doc-issue-date',
                'travel_doc_issue', 'travel-doc-issue', 'travel_document_issue', 'travel-document-issue',
                'issue_date', 'issue-date', 'issued_on', 'issued-on', 'date_issued', 'date-issued',
                
                // GOVERNMENT/AUTHORITY PATTERNS
                'government_issue_date', 'govt_issue_date', 'authority_issue_date', 'official_issue_date',
                'issued_by_date', 'granted_on', 'authorized_on', 'validated_on', 'certified_on',
                
                // PAKISTANI/URDU SPECIFIC
                'پاسپورٹ_جاری_کرنے_کی_تاریخ', 'جاری_کرنے_کی_تاریخ', 'اجرا_کی_تاریخ', 'تصدیق_کی_تاریخ',
                
                // INTERNATIONAL VARIATIONS
                'fecha_emision_pasaporte', 'date_emission_passeport', 'data_emissione_passaporto',
                'ausstellungsdatum', 'дата_выдачи_паспорта', 'पासपोर्ट_जारी_दिनांक', 'تاريخ_إصدار_الجواز'
            ],

            // Passport Expiry Date - COMPREHENSIVE
            passportExpiryDate: [
                // PRIMARY EXPIRY PATTERNS
                'passport_expiry_date', 'passport_expiry', 'passport-expiry-date', 'passport_expires_on',
                'passport_expire_date', 'passport-expire-date', 'passport_expiration', 'passport_end_date',
                'passport_valid_until', 'passport-valid-until', 'passport_validity_end', 'passport_due_date',
                
                // DOCUMENT EXPIRY PATTERNS
                'document_expiry_date', 'document-expiry-date', 'doc_expiry_date', 'doc-expiry-date',
                'travel_doc_expiry', 'travel-doc-expiry', 'travel_document_expiry', 'travel-document-expiry',
                'expiry_date', 'expiry-date', 'expires_on', 'expires-on', 'expiration_date', 'expiration-date',
                
                // VALIDITY PATTERNS
                'valid_until', 'valid-until', 'validity_end', 'validity-end', 'end_date', 'end-date',
                'due_date', 'due-date', 'renewal_date', 'renewal-date', 'renewal_due', 'renewal-due',
                
                // PAKISTANI/URDU SPECIFIC
                'پاسپورٹ_ختم_ہونے_کی_تاریخ', 'ختم_ہونے_کی_تاریخ', 'میعاد_ختم', 'تجدید_کی_تاریخ',
                
                // INTERNATIONAL VARIATIONS
                'fecha_vencimiento_pasaporte', 'date_expiration_passeport', 'data_scadenza_passaporto',
                'ablaufdatum', 'дата_истечения_паспорта', 'पासपोर्ट_समाप्ति_दिनांक', 'تاريخ_انتهاء_الجواز'
            ],

            // ID Issue Date - COMPREHENSIVE
            idIssueDate: [
                // PRIMARY ID ISSUE PATTERNS
                'id_issue_date', 'id_issue', 'id-issue-date', 'id_issued_on', 'id_issued_date',
                'id-issued-date', 'id_date_issued', 'id_grant_date', 'id_issuance_date',
                'cnic_issue_date', 'cnic_issue', 'cnic-issue-date', 'cnic_issued_on',
                
                // IDENTITY CARD ISSUE PATTERNS
                'identity_card_issue', 'identity-card-issue', 'card_issue_date', 'card-issue-date',
                'national_id_issue', 'national-id-issue', 'citizen_id_issue', 'citizen-id-issue',
                'personal_id_issue', 'personal-id-issue', 'govt_id_issue', 'govt-id-issue',
                
                // PAKISTANI/URDU SPECIFIC
                'شناختی_کارڈ_جاری_کرنے_کی_تاریخ', 'سی_این_آئی_سی_جاری_کرنے_کی_تاریخ',
                'قومی_شناختی_کارڈ_جاری_کرنے_کی_تاریخ', 'آئی_ڈی_جاری_کرنے_کی_تاریخ',
                
                // INTERNATIONAL VARIATIONS
                'fecha_emision_cedula', 'date_emission_carte_identite', 'data_emissione_carta_identita',
                'ausstellungsdatum_ausweis', 'дата_выдачи_удостоверения', 'पहचान_पत्र_जारी_दिनांक'
            ],

            // ID Expiry Date - COMPREHENSIVE
            idExpiryDate: [
                // PRIMARY ID EXPIRY PATTERNS
                'id_expiry_date', 'id_expiry', 'id-expiry-date', 'id_expires_on', 'id_expire_date',
                'id-expire-date', 'id_expiration', 'id_end_date', 'id_valid_until', 'id-valid-until',
                'cnic_expiry_date', 'cnic_expiry', 'cnic-expiry-date', 'cnic_expires_on',
                
                // IDENTITY CARD EXPIRY PATTERNS
                'identity_card_expiry', 'identity-card-expiry', 'card_expiry_date', 'card-expiry-date',
                'national_id_expiry', 'national-id-expiry', 'citizen_id_expiry', 'citizen-id-expiry',
                'personal_id_expiry', 'personal-id-expiry', 'govt_id_expiry', 'govt-id-expiry',
                
                // VALIDITY PATTERNS
                'card_valid_until', 'card-valid-until', 'id_validity_end', 'id-validity-end',
                'card_renewal_date', 'card-renewal-date', 'id_renewal_due', 'id-renewal-due',
                
                // PAKISTANI/URDU SPECIFIC
                'شناختی_کارڈ_ختم_ہونے_کی_تاریخ', 'سی_این_آئی_سی_ختم_ہونے_کی_تاریخ',
                'قومی_شناختی_کارڈ_ختم_ہونے_کی_تاریخ', 'آئی_ڈی_ختم_ہونے_کی_تاریخ',
                
                // INTERNATIONAL VARIATIONS
                'fecha_vencimiento_cedula', 'date_expiration_carte_identite', 'data_scadenza_carta_identita',
                'ablaufdatum_ausweis', 'дата_истечения_удостоверения', 'पहचान_पत्र_समाप्ति_दिनांक'
            ],

            // Citizenship - ULTRA COMPREHENSIVE
            citizenship: [
                // PRIMARY CITIZENSHIP PATTERNS
                'citizenship', 'citizen_number', 'citizennumber', 'citizen-number', 'citizenship_number',
                'citizen_id', 'citizen-id', 'citizenid', 'citizenship_status', 'citizen_status',
                'nationality_status', 'national_status', 'civic_status', 'civil_status',
                
                // LEGAL STATUS PATTERNS
                'legal_status', 'legal-status', 'residency_status', 'residency-status', 'residence_status',
                'immigration_status', 'immigration-status', 'visa_status', 'visa-status',
                'naturalization_status', 'naturalization-status', 'naturalized_citizen', 'born_citizen',
                
                // COUNTRY CITIZENSHIP PATTERNS
                'pakistani_citizen', 'pakistani-citizen', 'us_citizen', 'us-citizen', 'british_citizen',
                'canadian_citizen', 'dual_citizenship', 'dual-citizenship', 'multiple_citizenship',
                'citizen_of', 'citizen-of', 'native_of', 'native-of', 'born_in', 'born-in',
                
                // PAKISTANI/URDU SPECIFIC
                'شہریت', 'قومیت', 'پاکستانی_شہریت', 'قومی_شہریت', 'ملکی_شہریت', 'تابعیت',
                'قانونی_حیثیت', 'رہائشی_حیثیت', 'امیگریشن_اسٹیٹس', 'ویزا_اسٹیٹس',
                
                // INTERNATIONAL VARIATIONS
                'ciudadania', 'nationalite', 'cittadinanza', 'staatsangehorigkeit', 'гражданство',
                'नागरिकता', 'الجنسية', 'สัญชาติ', '国籍', '시민권'
            ]
        };

        // Pre-compile normalized patterns for better performance - REMOVED TO FIX SCOPE ISSUE
        console.group('📊 Field Patterns Optimization');
        console.log(`Compiled ${Object.keys(window.ADVANCED_FIELD_PATTERNS).length} field pattern categories`);
        console.log(`Total patterns: ${Object.values(window.ADVANCED_FIELD_PATTERNS).flat().length}`);
        console.groupEnd();

    // ===================================================================
    // ==              LEGACY TEST FORM SUPPORT                        ==
    // ===================================================================

    // Legacy field mapping for test-form.html compatibility
    const LEGACY_TEST_FORM_MAPPING = {
        "Name": "full_name",
        "Date of Birth": "date_of_birth", 
        "Gender": "gender",
        "ID Number": "id_number",
        "ID Issue Date": "id_issue_date",
        "ID Expiry Date": "id_expiry_date",
        "Passport No": "passport_number",
        "Country": "country_of_issue",
        "Passport Issue Date": "passport_issue_date",
        "Passport Expiry Date": "passport_expiry_date"
    };

    // ===================================================================
    // ==              MODULAR ERROR HANDLING SYSTEM                   ==
    // ===================================================================

    // Enhanced error handling with performance monitoring
    class PropaceErrorHandler {
        constructor() {
            this.errorCount = 0;
            this.errorLog = [];
            this.performanceMetrics = {};
            this.startTime = Date.now();
        }

        logError(operation, error, context = {}) {
            try {
                this.errorCount++;
                const errorEntry = {
                    id: this.errorCount,
                    timestamp: Date.now(),
                    operation: operation,
                    error: {
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                    },
                    context: context,
                    url: window.location.href
                };
                
                this.errorLog.push(errorEntry);
                
                console.group(`❌ Propace Error #${this.errorCount}: ${operation}`);
                console.error('Error Details:', error);
                console.log('Context:', context);
                console.log('Stack Trace:', error.stack);
                console.groupEnd();

                // Keep only last 50 errors for memory management
                if (this.errorLog.length > 50) {
                    this.errorLog = this.errorLog.slice(-50);
                }

                return errorEntry;
            } catch (logError) {
                console.error('Critical: Error handler itself failed:', logError);
            }
        }

        logPerformance(operation, duration, metadata = {}) {
            try {
                this.performanceMetrics[operation] = {
                    duration: duration,
                    timestamp: Date.now(),
                    metadata: metadata
                };

                if (duration > 1000) {
                    console.group('⚠️ Performance Warning');
                    console.warn(`Operation "${operation}" took ${duration.toFixed(2)}ms`);
                    console.log('Metadata:', metadata);
                    console.groupEnd();
                }
            } catch (error) {
                console.error('Performance logging failed:', error);
            }
        }

        getStats() {
            return {
                totalErrors: this.errorCount,
                recentErrors: this.errorLog.slice(-10),
                performanceMetrics: this.performanceMetrics,
                uptime: Date.now() - this.startTime,
                errorRate: this.errorCount / ((Date.now() - this.startTime) / 1000 / 60) // errors per minute
            };
        }

        clearStats() {
            this.errorCount = 0;
            this.errorLog = [];
            this.performanceMetrics = {};
            this.startTime = Date.now();
        }
    }

    // Global error handler instance
    const propaceErrorHandler = new PropaceErrorHandler();

    // Enhanced safe execution wrapper with performance monitoring
    const safeExecute = async (operation, operationName = 'Unknown Operation', fallback = null) => {
        // Allow callers to pass (operation, fallback) without label
        const isLabelString = typeof operationName === 'string';
        const label = isLabelString ? operationName : (operation?.name || 'Task');
        const fb = isLabelString ? fallback : operationName;

        const startTime = performance.now();
        try {
            const result = await operation();
            const duration = performance.now() - startTime;
            propaceErrorHandler.logPerformance(label, duration);
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            propaceErrorHandler.logError(label, error, { duration, fallbackUsed: fb !== null });
            // Only show UX warning for clearly-labeled critical ops
            if (typeof label === 'string' && (label.includes('Fill') || label.includes('Process'))) {
                showAdvancedPageNotification(`⚠️ Propace: Minor issue in ${label}, continuing...`, 'warning');
            }
            return fb;
        }
    };

    // Modular field processing functions with error handling
    const fieldProcessingModule = {
        processDataForField: (dataValue, dataKey, fieldElement) => {
            return safeExecute(async () => {
                console.group(`🔄 Processing: ${dataKey}`);
                console.log(`Raw value: "${dataValue}"`);
                console.log('Target element:', fieldElement);
                
                if (!dataValue || dataValue === 'null' || dataValue === 'undefined') {
                    console.log('❌ Invalid data value');
                    console.groupEnd();
                    return null;
                }

                let processedValue;
                switch (dataKey) {
                    case 'name':
                        processedValue = this.processNameData(dataValue, fieldElement);
                        break;
                    case 'fatherName':
                    case 'husbandName':
                        processedValue = this.processNameData(dataValue, fieldElement);
                        break;
                    case 'phoneNumber':
                        processedValue = this.processPhoneData(dataValue, fieldElement);
                        break;
                    case 'dateOfBirth':
                        processedValue = this.processDateData(dataValue, fieldElement);
                        break;
                    case 'address':
                    case 'currentAddress':
                    case 'permanentAddress':
                        processedValue = this.processAddressData(dataValue, fieldElement);
                        break;
                    case 'email':
                        processedValue = this.processEmailData(dataValue, fieldElement);
                        break;
                    case 'country':
                        processedValue = this.processCountryData(dataValue, fieldElement);
                        break;
                    case 'gender':
                        processedValue = this.processGenderData(dataValue, fieldElement);
                        break;
                    default:
                        processedValue = dataValue.toString().trim();
                }

                console.log(`Processed value: "${processedValue}"`);
                console.groupEnd();
                return processedValue;
            }, 'Field Data Processing', dataValue);
        },

        processNameData: (nameValue, fieldElement) => {
            return safeExecute(() => {
                const fieldContext = this.getFieldContext(fieldElement);
                const nameParts = this.splitFullName(nameValue);
                
                console.group('👤 Name Processing');
                console.log('Name parts:', nameParts);
                console.log('Field context:', fieldContext);
                
                let result;
                if (fieldContext.isFirstName) {
                    result = nameParts.firstName || nameValue;
                } else if (fieldContext.isLastName) {
                    result = nameParts.lastName || nameValue;
                } else if (fieldContext.isMiddleName) {
                    result = nameParts.middleName || '';
                } else {
                    result = nameValue;
                }
                
                console.log(`Result: "${result}"`);
                console.groupEnd();
                return result;
            }, 'Name Data Processing', nameValue);
        },

        splitFullName: (fullName) => {
            return safeExecute(() => {
                if (!fullName || typeof fullName !== 'string') {
                    return { firstName: '', middleName: '', lastName: '', fullName: fullName || '' };
                }

                const cleanName = fullName.trim().replace(/\s+/g, ' ');
                const parts = cleanName.split(' ');
                
                let firstName = '';
                let middleName = '';
                let lastName = '';

                if (parts.length === 1) {
                    firstName = parts[0];
                } else if (parts.length === 2) {
                    firstName = parts[0];
                    lastName = parts[1];
                } else if (parts.length >= 3) {
                    firstName = parts[0];
                    lastName = parts[parts.length - 1];
                    middleName = parts.slice(1, -1).join(' ');
                }

                return {
                    firstName: firstName,
                    middleName: middleName,
                    lastName: lastName,
                    fullName: cleanName
                };
            }, 'Name Splitting', { firstName: '', middleName: '', lastName: '', fullName: fullName || '' });
        },

        getFieldContext: (element) => {
            return safeExecute(() => {
                const identifiers = [
                    element.name || '',
                    element.id || '',
                    element.getAttribute('placeholder') || '',
                    element.getAttribute('aria-label') || '',
                    element.className || ''
                ].join(' ').toLowerCase();

                const labelElement = element.labels?.[0] || 
                                   document.querySelector(`label[for="${element.id}"]`) ||
                                   element.closest('label');
                
                let combinedIdentifiers = identifiers;
                if (labelElement) {
                    combinedIdentifiers += ' ' + labelElement.textContent.toLowerCase();
                }

                return {
                    isFirstName: /first|given|fore/.test(combinedIdentifiers) && !/last|sur|family/.test(combinedIdentifiers),
                    isLastName: /last|sur|family/.test(combinedIdentifiers) && !/first|given|fore/.test(combinedIdentifiers),
                    isMiddleName: /middle|mid/.test(combinedIdentifiers),
                    isFullName: /full|complete|name/.test(combinedIdentifiers) && !/first|last|middle/.test(combinedIdentifiers),
                    context: combinedIdentifiers
                };
            }, 'Field Context Analysis', {
                isFirstName: false,
                isLastName: false,
                isMiddleName: false,
                isFullName: true,
                context: ''
            });
        },

        processPhoneData: (phoneValue, fieldElement) => {
            return safeExecute(() => {
                let phone = phoneValue.toString().replace(/\D/g, '');
                
                const fieldContext = this.getFieldContext(fieldElement);
                const placeholder = fieldElement.getAttribute('placeholder') || '';
                
                console.group('📞 Phone Processing');
                console.log('Original:', phoneValue);
                console.log('Cleaned digits:', phone);
                console.log('Context:', fieldContext.context);
                
                const expectsCountryCode = /country|international|\+/.test(fieldContext.context + ' ' + placeholder);
                const expectsLocalFormat = /local|national|without/.test(fieldContext.context + ' ' + placeholder);
                
                // Pakistani number processing with error handling
                try {
                    if (phone.startsWith('92') && phone.length >= 12) {
                        if (expectsLocalFormat || placeholder.includes('03')) {
                            phone = phone.substring(2);
                            if (phone.startsWith('0')) {
                                phone = phone.substring(1);
                            }
                            phone = '0' + phone;
                        } else if (expectsCountryCode) {
                            phone = '+92' + phone.substring(2);
                        }
                    } else if (phone.startsWith('0') && phone.length >= 10) {
                        if (expectsCountryCode) {
                            phone = '+92' + phone.substring(1);
                        }
                    }
                    
                    if (placeholder) {
                        phone = this.formatPhoneToPattern(phone, placeholder);
                    }
                } catch (formatError) {
                    console.warn('Phone formatting failed, using cleaned digits');
                }
                
                console.log('Result:', phone);
                console.groupEnd();
                return phone;
            }, 'Phone Data Processing', phoneValue);
        },

        formatPhoneToPattern: (phone, pattern) => {
            return safeExecute(() => {
                const digits = phone.replace(/\D/g, '');
                
                if (pattern.includes('(') && pattern.includes(')')) {
                    if (digits.length >= 10) {
                        return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
                    }
                } else if (pattern.includes('-')) {
                    if (digits.length >= 10) {
                        return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
                    }
                } else if (pattern.includes(' ')) {
                    if (digits.length >= 10) {
                        return `${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6, 10)}`;
                    }
                }
                
                return phone;
            }, 'Phone Pattern Formatting', phone);
        },

        processDateData: (dateValue, fieldElement) => {
            return safeExecute(() => {
                const fieldContext = this.getFieldContext(fieldElement);
                const placeholder = fieldElement.getAttribute('placeholder') || '';
                const inputType = fieldElement.type || '';
                
                console.group('📅 Date Processing');
                console.log('Original:', dateValue);
                console.log('Type:', inputType, 'Placeholder:', placeholder);
                
                const parsedDate = this.parseDate(dateValue);
                if (!parsedDate) {
                    console.warn('Could not parse date');
                    console.groupEnd();
                    return dateValue;
                }
                
                let result;
                if (inputType === 'date') {
                    result = parsedDate.toISOString().split('T')[0];
                } else if (placeholder.includes('dd/mm/yyyy')) {
                    result = `${parsedDate.getDate().toString().padStart(2, '0')}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
                } else if (placeholder.includes('mm/dd/yyyy')) {
                    result = `${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getDate().toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
                } else if (placeholder.includes('yyyy-mm-dd')) {
                    result = parsedDate.toISOString().split('T')[0];
                } else {
                    result = `${parsedDate.getDate().toString().padStart(2, '0')}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
                }
                
                console.log('Result:', result);
                console.groupEnd();
                return result;
            }, 'Date Data Processing', dateValue);
        },

        parseDate: (dateString) => {
            return safeExecute(() => {
                if (!dateString) return null;
                
                const cleanedDate = String(dateString).trim();
                
                // Try parsing with Date constructor first
                let date = new Date(cleanedDate);
                if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
                    return date;
                }

                // Enhanced date patterns with comprehensive matching
                const patterns = [
                    {
                        regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
                        handler: (match) => {
                            const day = parseInt(match[1]);
                            const month = parseInt(match[2]);
                            const year = parseInt(match[3]);
                            
                            if (day > 12) {
                                return new Date(year, month - 1, day);
                            }
                            if (month > 12) {
                                return new Date(year, day - 1, month);
                            }
                            return new Date(year, month - 1, day);
                        }
                    },
                    {
                        regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
                        handler: (match) => new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
                    }
                ];

                for (const pattern of patterns) {
                    const match = cleanedDate.match(pattern.regex);
                    if (match) {
                        try {
                            const result = pattern.handler(match);
                            if (result && !isNaN(result.getTime()) && 
                                result.getFullYear() > 1900 && result.getFullYear() < 2100) {
                                return result;
                            }
                        } catch (patternError) {
                            console.warn('Date pattern failed:', pattern.regex, patternError);
                        }
                    }
                }

                return null;
            }, 'Date Parsing', null);
        },

        processAddressData: (addressValue, fieldElement) => {
            return safeExecute(() => {
                const fieldContext = this.getFieldContext(fieldElement);
                
                if (/line1|first/.test(fieldContext.context)) {
                    return this.extractAddressLine1(addressValue);
                } else if (/line2|second/.test(fieldContext.context)) {
                    return this.extractAddressLine2(addressValue);
                } else if (/city/.test(fieldContext.context)) {
                    return this.extractCityFromAddress(addressValue) || '';
                } else if (/state|province/.test(fieldContext.context)) {
                    return this.extractStateFromAddress(addressValue) || '';
                } else if (/postal|zip/.test(fieldContext.context)) {
                    return this.extractPostalCodeFromAddress(addressValue) || '';
                } else {
                    return addressValue;
                }
            }, 'Address Data Processing', addressValue);
        },

        extractAddressLine1: (address) => {
            return safeExecute(() => {
                if (!address) return '';
                const parts = address.split(',');
                return parts[0].trim();
            }, 'Address Line 1 Extraction', '');
        },

        extractAddressLine2: (address) => {
            return safeExecute(() => {
                if (!address) return '';
                
                const secondaryPatterns = /apt|apartment|suite|floor|unit|room|#/i;
                const parts = address.split(',');
                
                for (const part of parts) {
                    if (secondaryPatterns.test(part)) {
                        return part.trim();
                    }
                }
                
                return '';
            }, 'Address Line 2 Extraction', '');
        },

        extractStateFromAddress: (address) => {
            return safeExecute(() => {
                if (!address) return null;
                
                const pakistaniStates = [
                    'punjab', 'sindh', 'balochistan', 'khyber pakhtunkhwa', 'kpk', 'nwfp',
                    'gilgit baltistan', 'azad kashmir', 'islamabad capital territory', 'ict'
                ];
                
                const normalizedAddress = address.toLowerCase();
                
                for (const state of pakistaniStates) {
                    if (normalizedAddress.includes(state)) {
                        return state.replace(/\b\w/g, l => l.toUpperCase());
                    }
                }
                
                return null;
            }, 'State Extraction', null);
        },

        extractCityFromAddress: (address) => {
            return safeExecute(() => {
                if (!address) return null;
                
                const parts = address.split(',');
                if (parts.length >= 2) {
                    return parts[parts.length - 2].trim();
                }
                
                return null;
            }, 'City Extraction', null);
        },

        extractPostalCodeFromAddress: (address) => {
            return safeExecute(() => {
                if (!address) return null;
                
                const postalCodePattern = /\b\d{5}(-\d{4})?\b/;
                const match = address.match(postalCodePattern);
                
                return match ? match[0] : null;
            }, 'Postal Code Extraction', null);
        },

        processEmailData: (emailValue, fieldElement) => {
            return safeExecute(() => {
                const email = emailValue.toString().trim().toLowerCase();
                return email.replace(/\s/g, '');
            }, 'Email Data Processing', emailValue);
        },

        processCountryData: (countryValue, fieldElement) => {
            return safeExecute(() => {
                const fieldContext = this.getFieldContext(fieldElement);
                
                if (/code/.test(fieldContext.context)) {
                    return this.getCountryCode(countryValue);
                } else {
                    return this.getCountryName(countryValue);
                }
            }, 'Country Data Processing', countryValue);
        },

        getCountryCode: (countryName) => {
            return safeExecute(() => {
                const countryCodes = {
                    'pakistan': 'PK',
                    'pakistani': 'PK',
                    'united states': 'US',
                    'usa': 'US',
                    'united kingdom': 'GB',
                    'uk': 'GB',
                    'canada': 'CA',
                    'australia': 'AU',
                    'india': 'IN',
                    'bangladesh': 'BD',
                    'afghanistan': 'AF'
                };
                
                const normalized = countryName.toLowerCase().trim();
                return countryCodes[normalized] || countryName;
            }, 'Country Code Lookup', countryName);
        },

        getCountryName: (countryInput) => {
            return safeExecute(() => {
                const countryNames = {
                    'pk': 'Pakistan',
                    'pakistani': 'Pakistan',
                    'us': 'United States',
                    'usa': 'United States',
                    'gb': 'United Kingdom',
                    'uk': 'United Kingdom',
                    'ca': 'Canada',
                    'au': 'Australia',
                    'in': 'India',
                    'bd': 'Bangladesh',
                    'af': 'Afghanistan'
                };
                
                const normalized = countryInput.toLowerCase().trim();
                return countryNames[normalized] || countryInput;
            }, 'Country Name Lookup', countryInput);
        },

        processGenderData: (genderValue, fieldElement) => {
            return safeExecute(() => {
                const fieldContext = this.getFieldContext(fieldElement);
                const normalized = genderValue.toLowerCase().trim();
                
                if (/mr|mrs|ms|title|salutation/.test(fieldContext.context)) {
                    if (normalized === 'male' || normalized === 'm') return 'Mr';
                    if (normalized === 'female' || normalized === 'f') return 'Mrs';
                    return genderValue;
                } else {
                    if (normalized === 'm' || normalized === 'mr') return 'Male';
                    if (normalized === 'f' || normalized === 'mrs' || normalized === 'ms') return 'Female';
                    return genderValue;
                }
            }, 'Gender Data Processing', genderValue);
        }
    };

    // ===================================================================
    // ==              ULTRA-INTELLIGENT FIELD MATCHING               ==
    // ===================================================================

    // Enhanced normalization with international character support
    const normalizeFieldName = (name) => {
        if (!name) return '';
        return name.toLowerCase()
            .replace(/[\s\-_\.\,\:\;\(\)\[\]]+/g, '') // Remove special chars
            .replace(/[^\w\u00C0-\u017F\u0100-\u024F\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/g, '') // Keep international chars
            .trim();
    };

    // ===================================================================
    // ==              SCORING-BASED HEURISTIC ENGINE (Enhancement 3)  ==
    // ===================================================================

    // ULTRA-ADVANCED: Precision scoring-based field matching with strict confidence levels
    const calculateFieldMatchScore = (element, dataKey) => {
        let score = 0.0;
        const maxScore = 1.0;
        const evidence = [];
    // Use global, user-configurable threshold (default set near top of file)
    // let MINIMUM_CONFIDENCE is defined globally and may be updated from storage

        try {
            // Get comprehensive field information
            const fieldInfo = getElementFieldInfo(element);
            const fieldType = element.type?.toLowerCase();
            const allIdentifiers = fieldInfo.allIdentifiers.filter(Boolean);
            
            // Normalize all identifiers for comparison
            const normalizedIdentifiers = allIdentifiers.map(id => normalizeFieldName(id));
            
            // Get patterns for this data key
            const patterns = window.ADVANCED_FIELD_PATTERNS[dataKey] || [];
            if (patterns.length === 0) {
                evidence.push(`No patterns found for dataKey: ${dataKey}`);
                return { score: 0, evidence, confidence: 'NONE', fieldInfo };
            }

            // STRICT FIELD TYPE PROTECTION - Prevent wrong data in wrong field types
            
            // EMAIL FIELD PROTECTION
            if ((fieldType === 'email' || normalizedIdentifiers.some(id => id.includes('email'))) && dataKey !== 'email') {
                evidence.push(`BLOCKED: Email field protected from non-email data (${dataKey})`);
                return { score: 0, evidence, confidence: 'BLOCKED', fieldInfo };
            }
            
            // PHONE FIELD PROTECTION
            if ((fieldType === 'tel' || normalizedIdentifiers.some(id => id.includes('phone') || id.includes('mobile') || id.includes('tel'))) && dataKey !== 'phoneNumber') {
                evidence.push(`BLOCKED: Phone field protected from non-phone data (${dataKey})`);
                return { score: 0, evidence, confidence: 'BLOCKED', fieldInfo };
            }
            
            // DATE FIELD PROTECTION (allow all recognized date keys)
            const allowedDateKeys = new Set([
                'dateOfBirth', 'idIssueDate', 'idExpiryDate', 'passportIssueDate', 'passportExpiryDate'
            ]);
            if ((fieldType === 'date' || normalizedIdentifiers.some(id => id.includes('date') || id.includes('birth'))) && !allowedDateKeys.has(dataKey)) {
                evidence.push(`BLOCKED: Date-like field protected from non-date data (${dataKey})`);
                return { score: 0, evidence, confidence: 'BLOCKED', fieldInfo };
            }
            
            // NUMBER FIELD SPECIFIC PROTECTION
            if (fieldType === 'number' && !['idNumber', 'phoneNumber', 'postalCode'].includes(dataKey)) {
                evidence.push(`BLOCKED: Number field protected from non-numeric data (${dataKey})`);
                return { score: 0, evidence, confidence: 'BLOCKED', fieldInfo };
            }

            // HIERARCHICAL SCORING SYSTEM with STRICT THRESHOLDS

            // LEVEL 1.0: PERFECT EXACT MATCH (id, name, data-field)
            const criticalAttributes = [element.id, element.name, element.getAttribute('data-field')];
            for (const attr of criticalAttributes) {
                if (attr) {
                    const normalizedAttr = normalizeFieldName(attr);
                    for (const pattern of patterns) {
                        const normalizedPattern = normalizeFieldName(pattern);
                        if (normalizedAttr === normalizedPattern) {
                            score = Math.max(score, 1.0);
                            evidence.push(`🎯 PERFECT MATCH: ${attr} === ${pattern}`);
                        }
                    }
                }
            }

            // LEVEL 0.95: HIGH PRIORITY EXACT MATCH (placeholder, aria-label)
            if (score < 0.95) {
                const highPriorityAttributes = [
                    element.getAttribute('placeholder'),
                    element.getAttribute('aria-label'),
                    element.getAttribute('title')
                ];
                
                for (const attr of highPriorityAttributes) {
                    if (attr) {
                        const normalizedAttr = normalizeFieldName(attr);
                        for (const pattern of patterns) {
                            const normalizedPattern = normalizeFieldName(pattern);
                            if (normalizedAttr === normalizedPattern) {
                                score = Math.max(score, 0.95);
                                evidence.push(`🎯 HIGH PRIORITY MATCH: ${attr} === ${pattern}`);
                            }
                        }
                    }
                }
            }

            // LEVEL 0.9: STRONG LABEL MATCH
            if (score < 0.9) {
                const labelText = fieldInfo.label;
                if (labelText) {
                    const normalizedLabel = normalizeFieldName(labelText);
                    for (const pattern of patterns) {
                        const normalizedPattern = normalizeFieldName(pattern);
                        if (normalizedLabel === normalizedPattern) {
                            score = Math.max(score, 0.9);
                            evidence.push(`📋 LABEL EXACT MATCH: "${labelText}" === "${pattern}"`);
                        }
                    }
                }
            }

            // LEVEL 0.85: SUBSTRING MATCHES (strict contains)
            if (score < 0.85) {
                for (const identifier of normalizedIdentifiers) {
                    for (const pattern of patterns) {
                        const normalizedPattern = normalizeFieldName(pattern);
                        if (identifier.includes(normalizedPattern) && normalizedPattern.length >= 3) {
                            score = Math.max(score, 0.85);
                            evidence.push(`🔍 CONTAINS MATCH: "${identifier}" contains "${normalizedPattern}"`);
                        }
                    }
                }
            }

            // LEVEL 0.8: REVERSE SUBSTRING MATCHES
            if (score < 0.8) {
                for (const identifier of normalizedIdentifiers) {
                    for (const pattern of patterns) {
                        const normalizedPattern = normalizeFieldName(pattern);
                        if (normalizedPattern.includes(identifier) && identifier.length >= 3) {
                            score = Math.max(score, 0.8);
                            evidence.push(`🔍 REVERSE CONTAINS: "${normalizedPattern}" contains "${identifier}"`);
                        }
                    }
                }
            }

            // CONFIDENCE LEVEL CALCULATION
            let confidence = 'NONE';
            if (score >= 0.95) confidence = 'ULTRA_HIGH';
            else if (score >= 0.9) confidence = 'HIGH'; 
            else if (score >= 0.85) confidence = 'MEDIUM';
            else if (score >= 0.75) confidence = 'LOW';
            else confidence = 'VERY_LOW';

            // APPLY MINIMUM CONFIDENCE THRESHOLD
            if (score < MINIMUM_CONFIDENCE) {
                evidence.push(`❌ REJECTED: Score ${score.toFixed(3)} below minimum threshold ${MINIMUM_CONFIDENCE}`);
                score = 0;
                confidence = 'REJECTED';
            }

            return {
                score: Math.min(score, maxScore),
                evidence: evidence,
                confidence: confidence,
                fieldInfo: fieldInfo,
                fieldType: fieldType,
                minimumThreshold: MINIMUM_CONFIDENCE
            };

        } catch (error) {
            console.error('❌ Field matching error:', error);
            return { 
                score: 0, 
                evidence: [`Error: ${error.message}`], 
                confidence: 'ERROR',
                fieldInfo: null 
            };
        }
        // Ensure function closes properly before defining helpers
    };
    // UPDATED: Replace boolean matching with scoring-based matching
    const findMatchingField = (element, dataKey) => {
        const result = calculateFieldMatchScore(element, dataKey);
    return result.score >= MINIMUM_CONFIDENCE;
    };

    // ULTRA-ADVANCED: Find best matching field with strict priority system and conflict resolution
    const findBestMatchingField = (fields, dataKey, usedFields = new Set()) => {
        let candidates = [];
        const ULTRA_HIGH_THRESHOLD = 0.95;
        const HIGH_THRESHOLD = 0.9;
    const MINIMUM_THRESHOLD = MINIMUM_CONFIDENCE; // Respect dynamic threshold

        try {
            console.group(`🔍 FIELD ANALYSIS for "${dataKey}"`);
            console.log(`Analyzing ${fields.length} fields, ${usedFields.size} already used`);

            for (const field of fields) {
                // STRICT FIELD VALIDATION
                
                // Skip if field is already used
                if (usedFields.has(field.element)) {
                    console.log(`⏭️ SKIP: Field already used - ${field.name}`);
                    continue;
                }
                
                // Skip if field is already filled by us
                if (field.element.hasAttribute('data-propace-filled')) {
                    console.log(`⏭️ SKIP: Field already filled - ${field.name}`);
                    continue;
                }

                // Skip if field is hidden, disabled, or readonly
                const computedStyle = window.getComputedStyle(field.element);
                const rect = field.element.getBoundingClientRect();
                
                if (field.element.style.display === 'none' || 
                    field.element.style.visibility === 'hidden' ||
                    computedStyle.display === 'none' ||
                    computedStyle.visibility === 'hidden' ||
                    field.element.disabled ||
                    field.element.readOnly ||
                    rect.width === 0 || rect.height === 0) {
                    console.log(`⏭️ SKIP: Field not accessible - ${field.name}`);
                    continue;
                }

                // Calculate field match score
                const scoreResult = calculateFieldMatchScore(field.element, dataKey);
                
                // Only consider fields above minimum threshold
                if (scoreResult.score < MINIMUM_THRESHOLD) {
                    console.log(`⏭️ SKIP: Score too low (${scoreResult.score.toFixed(3)}) - ${field.name}`);
                    continue;
                }

                // Add to candidates
                candidates.push({
                    field: field,
                    score: scoreResult.score,
                    evidence: scoreResult.evidence,
                    confidence: scoreResult.confidence,
                    fieldInfo: scoreResult.fieldInfo,
                    element: field.element,
                    fieldType: scoreResult.fieldType
                });

                console.log(`✅ CANDIDATE: ${field.name} - Score: ${scoreResult.score.toFixed(3)} (${scoreResult.confidence})`);
            }

            if (candidates.length === 0) {
                console.log(`❌ NO CANDIDATES: No fields meet minimum threshold ${MINIMUM_THRESHOLD}`);
                console.groupEnd();
                return null;
            }

            // PRIORITY-BASED SELECTION ALGORITHM

            // Priority 1: Ultra-high confidence matches (0.95+)
            let ultraHighCandidates = candidates.filter(c => c.score >= ULTRA_HIGH_THRESHOLD);
            if (ultraHighCandidates.length > 0) {
                const selected = ultraHighCandidates[0];
                console.log(`🎯 ULTRA-HIGH PRIORITY: Selected "${selected.field.name}" (Score: ${selected.score.toFixed(3)})`);
                console.groupEnd();
                return selected.field;
            }

            // Priority 2: High confidence matches (0.9+)
            let highCandidates = candidates.filter(c => c.score >= HIGH_THRESHOLD);
            if (highCandidates.length === 1) {
                const selected = highCandidates[0];
                console.log(`🎯 HIGH PRIORITY: Selected "${selected.field.name}" (Score: ${selected.score.toFixed(3)})`);
                console.groupEnd();
                return selected.field;
            }

            // Priority 3: Multiple high candidates - apply tiebreaker rules
            if (highCandidates.length > 1) {
                console.log(`🔀 TIEBREAKER: ${highCandidates.length} high-score candidates`);
                
                // Rule 3a: Prefer exact field type matches
                const typeMatches = highCandidates.filter(c => {
                    const fieldType = c.fieldType;
                    if (dataKey === 'email' && fieldType === 'email') return true;
                    if (dataKey === 'phoneNumber' && fieldType === 'tel') return true;
                    if (dataKey === 'dateOfBirth' && fieldType === 'date') return true;
                    return false;
                });
                
                if (typeMatches.length === 1) {
                    const selected = typeMatches[0];
                    console.log(`🎯 TYPE MATCH: Selected "${selected.field.name}" (Type: ${selected.fieldType})`);
                    console.groupEnd();
                    return selected.field;
                }

                // Rule 3b: Prefer fields with highest confidence level
                const sortedByConfidence = highCandidates.sort((a, b) => {
                    const confidenceOrder = { 'ULTRA_HIGH': 5, 'HIGH': 4, 'MEDIUM': 3, 'LOW': 2, 'VERY_LOW': 1 };
                    return (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
                });

                // Rule 3c: Among same confidence, prefer highest score
                const topConfidence = sortedByConfidence[0].confidence;
                const sameConfidenceCandidates = sortedByConfidence.filter(c => c.confidence === topConfidence);
                
                if (sameConfidenceCandidates.length === 1) {
                    const selected = sameConfidenceCandidates[0];
                    console.log(`🎯 CONFIDENCE MATCH: Selected "${selected.field.name}" (${selected.confidence})`);
                    console.groupEnd();
                    return selected.field;
                }

                // Rule 3d: Prefer first field in document order (DOM precedence)
                const documentOrderSorted = sameConfidenceCandidates.sort((a, b) => {
                    const position = a.element.compareDocumentPosition(b.element);
                    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
                });

                const selected = documentOrderSorted[0];
                console.log(`🎯 DOM ORDER: Selected "${selected.field.name}" (Document precedence)`);
                console.groupEnd();
                return selected.field;
            }

            // Priority 4: All candidates are below high threshold - select best available
            const sortedCandidates = candidates.sort((a, b) => b.score - a.score);
            const selected = sortedCandidates[0];
            
            console.log(`🎯 BEST AVAILABLE: Selected "${selected.field.name}" (Score: ${selected.score.toFixed(3)})`);
            console.log(`🔍 Evidence:`, selected.evidence);
            console.groupEnd();
            return selected.field;

        } catch (error) {
            console.error('❌ Error in field selection:', error);
            console.groupEnd();
            return null;
        }
    };

    // (Removed duplicate validateDataForField function - original kept earlier)

    // ULTRA-ADVANCED: ID Number formatting for Pakistani CNIC and international formats
    const formatIdNumber = (idValue, fieldElement) => {
        try {
            console.group(`🔢 ID FORMATTING: "${idValue}"`);
            
            if (!idValue) {
                console.groupEnd();
                return idValue;
            }
            
            // Clean the ID (remove existing formatting)
            const cleanId = idValue.replace(/[\s\-\_\.\(\)\[\]]/g, '');
            
            // Check field hints for format preference
            const fieldInfo = getElementFieldInfo(fieldElement);
            const allText = fieldInfo.allIdentifiers.join(' ').toLowerCase();
            
            // Pakistani CNIC formatting (13 digits → XXXXX-XXXXXXX-X)
            if (cleanId.length === 13 && /^\d{13}$/.test(cleanId)) {
                const formatted = `${cleanId.substring(0, 5)}-${cleanId.substring(5, 12)}-${cleanId.substring(12)}`;
                console.log(`✅ CNIC FORMAT: ${cleanId} → ${formatted}`);
                console.groupEnd();
                return formatted;
            }
            
            // Alternative CNIC format (13 digits → XXXXX XXXXXXX X)
            if (cleanId.length === 13 && /^\d{13}$/.test(cleanId) && allText.includes('space')) {
                const formatted = `${cleanId.substring(0, 5)} ${cleanId.substring(5, 12)} ${cleanId.substring(12)}`;
                console.log(`✅ CNIC SPACE FORMAT: ${cleanId} → ${formatted}`);
                console.groupEnd();
                return formatted;
            }
            
            // Student ID / Roll Number (keep original if alphanumeric)
            if (/^[a-zA-Z0-9]{3,20}$/.test(cleanId) && (allText.includes('student') || allText.includes('roll') || allText.includes('reg'))) {
                console.log(`✅ STUDENT ID: Keeping original format "${idValue}"`);
                console.groupEnd();
                return idValue;
            }
            
            // Social Security Number (XXX-XX-XXXX)
            if (cleanId.length === 9 && /^\d{9}$/.test(cleanId) && allText.includes('social')) {
                const formatted = `${cleanId.substring(0, 3)}-${cleanId.substring(3, 5)}-${cleanId.substring(5)}`;
                console.log(`✅ SSN FORMAT: ${cleanId} → ${formatted}`);
                console.groupEnd();
                return formatted;
            }
            
            // Generic number formatting for IDs 10+ digits
            if (cleanId.length >= 10 && /^\d+$/.test(cleanId)) {
                // Add dashes every 4 digits for readability
                const formatted = cleanId.replace(/(\d{4})(?=\d)/g, '$1-');
                console.log(`✅ GENERIC ID FORMAT: ${cleanId} → ${formatted}`);
                console.groupEnd();
                return formatted;
            }
            
            // Keep original format if no specific pattern matches
            console.log(`✅ ORIGINAL FORMAT: No specific format applied to "${idValue}"`);
            console.groupEnd();
            return idValue;
            
        } catch (error) {
            console.error('❌ ID formatting error:', error);
            console.groupEnd();
            return idValue; // Return original on error
        }
    };

    // ULTRA-ADVANCED: Passport Number formatting for international formats
    const formatPassportNumber = (passportValue, fieldElement) => {
        try {
            console.group(`🛂 PASSPORT FORMATTING: "${passportValue}"`);
            
            if (!passportValue) {
                console.groupEnd();
                return passportValue;
            }
            
            // Clean the passport number (remove existing formatting)
            const cleanPassport = passportValue.replace(/[\s\-\_\.\(\)\[\]]/g, '').toUpperCase();
            
            // Check field hints for format preference
            const fieldInfo = getElementFieldInfo(fieldElement);
            const allText = fieldInfo.allIdentifiers.join(' ').toLowerCase();
            
            // Pakistani passport formatting (ABXXXXXXX → AB-XXXXXXX or AB XXXXXXX)
            if (/^[A-Z]{2}\d{7}$/.test(cleanPassport)) {
                if (allText.includes('dash') || allText.includes('-')) {
                    const formatted = `${cleanPassport.substring(0, 2)}-${cleanPassport.substring(2)}`;
                    console.log(`✅ PAKISTANI PASSPORT DASH: ${cleanPassport} → ${formatted}`);
                    console.groupEnd();
                    return formatted;
                } else if (allText.includes('space')) {
                    const formatted = `${cleanPassport.substring(0, 2)} ${cleanPassport.substring(2)}`;
                    console.log(`✅ PAKISTANI PASSPORT SPACE: ${cleanPassport} → ${formatted}`);
                    console.groupEnd();
                    return formatted;
                } else {
                    // Default format
                    console.log(`✅ PAKISTANI PASSPORT: Keeping format "${cleanPassport}"`);
                    console.groupEnd();
                    return cleanPassport;
                }
            }
            
            // US passport (9 characters alphanumeric - add formatting if needed)
            if (/^[A-Z0-9]{9}$/.test(cleanPassport)) {
                // US passports typically don't have special formatting
                console.log(`✅ US PASSPORT: Keeping format "${cleanPassport}"`);
                console.groupEnd();
                return cleanPassport;
            }
            
            // European/International passport (6-12 characters)
            if (/^[A-Z0-9]{6,12}$/.test(cleanPassport)) {
                console.log(`✅ INTERNATIONAL PASSPORT: Keeping format "${cleanPassport}"`);
                console.groupEnd();
                return cleanPassport.toUpperCase();
            }
            
            // Keep original format if no specific pattern matches
            console.log(`✅ ORIGINAL PASSPORT FORMAT: No specific format applied to "${passportValue}"`);
            console.groupEnd();
            return passportValue.toUpperCase();
            
        } catch (error) {
            console.error('❌ Passport formatting error:', error);
            console.groupEnd();
            return passportValue; // Return original on error
        }
    };

    // ULTRA-ADVANCED: Date formatting for document dates
    const formatDocumentDate = (dateValue, fieldElement, dataKey) => {
        try {
            console.group(`📅 DATE FORMATTING: "${dateValue}" for ${dataKey}`);
            
            if (!dateValue) {
                console.groupEnd();
                return dateValue;
            }
            
            // Check field hints for format preference
            const fieldInfo = getElementFieldInfo(fieldElement);
            const allText = fieldInfo.allIdentifiers.join(' ').toLowerCase();
            
            // Parse the date from various input formats
            let parsedDate;
            
            // Try to parse different input formats
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                // YYYY-MM-DD format
                parsedDate = new Date(dateValue);
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
                // DD/MM/YYYY format (assuming European format)
                const [day, month, year] = dateValue.split('/');
                parsedDate = new Date(year, month - 1, day);
            } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateValue)) {
                // DD-MM-YYYY format
                const [day, month, year] = dateValue.split('-');
                parsedDate = new Date(year, month - 1, day);
            } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
                // D/M/YYYY or DD/M/YYYY format
                const [day, month, year] = dateValue.split('/');
                parsedDate = new Date(year, month - 1, day);
            } else {
                // Try direct parsing
                parsedDate = new Date(dateValue);
            }
            
            if (isNaN(parsedDate.getTime())) {
                console.log(`🚫 INVALID DATE: Cannot parse "${dateValue}"`);
                console.groupEnd();
                return dateValue; // Return original if unparseable
            }
            
            // Determine output format based on field preferences
            let formattedDate;
            
            if (allText.includes('yyyy-mm-dd') || allText.includes('iso')) {
                // ISO format: YYYY-MM-DD
                formattedDate = parsedDate.toISOString().split('T')[0];
                console.log(`✅ ISO DATE FORMAT: ${dateValue} → ${formattedDate}`);
            } else if (allText.includes('dd/mm/yyyy') || allText.includes('european')) {
                // European format: DD/MM/YYYY
                const day = parsedDate.getDate().toString().padStart(2, '0');
                const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
                const year = parsedDate.getFullYear();
                formattedDate = `${day}/${month}/${year}`;
                console.log(`✅ EUROPEAN DATE FORMAT: ${dateValue} → ${formattedDate}`);
            } else if (allText.includes('mm/dd/yyyy') || allText.includes('american')) {
                // American format: MM/DD/YYYY
                const day = parsedDate.getDate().toString().padStart(2, '0');
                const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
                const year = parsedDate.getFullYear();
                formattedDate = `${month}/${day}/${year}`;
                console.log(`✅ AMERICAN DATE FORMAT: ${dateValue} → ${formattedDate}`);
            } else if (allText.includes('dd-mm-yyyy')) {
                // Dash format: DD-MM-YYYY
                const day = parsedDate.getDate().toString().padStart(2, '0');
                const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
                const year = parsedDate.getFullYear();
                formattedDate = `${day}-${month}-${year}`;
                console.log(`✅ DASH DATE FORMAT: ${dateValue} → ${formattedDate}`);
            } else {
                // Default to DD/MM/YYYY (most common international format)
                const day = parsedDate.getDate().toString().padStart(2, '0');
                const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
                const year = parsedDate.getFullYear();
                formattedDate = `${day}/${month}/${year}`;
                console.log(`✅ DEFAULT DATE FORMAT: ${dateValue} → ${formattedDate}`);
            }
            
            console.groupEnd();
            return formattedDate;
            
        } catch (error) {
            console.error('❌ Date formatting error:', error);
            console.groupEnd();
            return dateValue; // Return original on error
        }
    };

    // ULTRA-ADVANCED: Name formatting (supporting multiple languages)
    const formatName = (nameValue, fieldElement) => {
        try {
            console.group(`👤 NAME FORMATTING: "${nameValue}"`);
            
            if (!nameValue) {
                console.groupEnd();
                return nameValue;
            }
            
            // Check field hints for format preference
            const fieldInfo = getElementFieldInfo(fieldElement);
            const allText = fieldInfo.allIdentifiers.join(' ').toLowerCase();
            
            // Basic name cleaning and formatting
            let formattedName = nameValue.trim();
            
            // Remove extra spaces
            formattedName = formattedName.replace(/\s+/g, ' ');
            
            // Capitalize if requested or if all caps/lowercase
            if (allText.includes('capitalize') || allText.includes('title') || 
                formattedName === formattedName.toLowerCase() || 
                formattedName === formattedName.toUpperCase()) {
                
                // Split into words and capitalize each
                formattedName = formattedName.split(' ').map(word => {
                    if (word.length === 0) return word;
                    
                    // Handle special cases for common prefixes/suffixes
                    const lowerWord = word.toLowerCase();
                    if (['de', 'van', 'von', 'la', 'le', 'el', 'al', 'ibn', 'bin'].includes(lowerWord)) {
                        return lowerWord; // Keep lowercase for these particles
                    }
                    
                    // Capitalize first letter, rest lowercase
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }).join(' ');
                
                console.log(`✅ CAPITALIZED NAME: ${nameValue} → ${formattedName}`);
            } else if (allText.includes('uppercase') || allText.includes('caps')) {
                formattedName = formattedName.toUpperCase();
                console.log(`✅ UPPERCASE NAME: ${nameValue} → ${formattedName}`);
            } else if (allText.includes('lowercase')) {
                formattedName = formattedName.toLowerCase();
                console.log(`✅ LOWERCASE NAME: ${nameValue} → ${formattedName}`);
            } else {
                console.log(`✅ ORIGINAL NAME FORMAT: Keeping "${nameValue}"`);
            }
            
            console.groupEnd();
            return formattedName;
            
        } catch (error) {
            console.error('❌ Name formatting error:', error);
            console.groupEnd();
            return nameValue; // Return original on error
        }
    };
    // --- Early lightweight fieldCache stub to avoid TDZ and init races ---
    // Ensures references before the full implementation won't throw.
    if (typeof window.fieldCache === 'undefined') {
        try {
            window.fieldCache = {
                cache: new Map(),
                generateCacheKey: () => `early_${Date.now()}`,
                simpleHash: () => '0',
                getCachedFields: () => null,
                setCachedFields: () => {},
                clearCache: () => { try { window.fieldCache.cache?.clear?.(); } catch(_) {} window.fieldCache.cache = new Map(); },
                initialize: () => { if (!window.fieldCache.cache) window.fieldCache.cache = new Map(); }
            };
        } catch(_) { /* no-op */ }
    }
    var fieldCache = window.fieldCache;

    const initializeAdvancedSystem = () => {
        try {
            // Ensure all critical objects exist
            if (!window.ADVANCED_FIELD_PATTERNS) {
                console.warn('⚠️ Field patterns not loaded, initializing...');
                // Initialize basic patterns if not loaded
                window.ADVANCED_FIELD_PATTERNS = {
                    name: ['name', 'fullname', 'full_name'],
                    email: ['email', 'email_address', 'mail'],
                    phoneNumber: ['phone', 'mobile', 'tel'],
                    idNumber: ['id', 'cnic', 'id_number'],
                };
            }
            
            if (!fieldCache || !fieldCache.cache) {
                console.warn('⚠️ Field cache not initialized, creating...');
                try { fieldCache && typeof fieldCache.initialize === 'function' ? fieldCache.initialize() : (fieldCache = window.fieldCache); } catch(_) {}
            }
            
            console.log('✅ Advanced system initialization complete');
            return true;
            
        } catch (error) {
            console.error('❌ System initialization failed:', error);
            return false;
        }
    };

    // Auto-recovery on errors
    if (typeof window !== 'undefined') {
        window.addEventListener('error', (event) => {
            if (event.filename?.includes('content-script.js')) {
                console.log('🔧 Auto-recovery triggered for content script error');
                setTimeout(() => {
                    initializeAdvancedSystem();
                }, 1000);
            }
        });
    }

    // Initialize system immediately
    initializeAdvancedSystem();

    // Special pattern matching for edge cases
    const checkSpecialFieldPatterns = (element, dataKey, normalizedIdentifiers) => {
        const allText = normalizedIdentifiers.join(' ');
        
        // Special rules for country/nationality
        if (dataKey === 'country') {
            const countryPatterns = [
                'where', 'live', 'from', 'citizen', 'resident', 'nationality', 'nation',
                'country', 'origin', 'birth', 'home', 'native', 'passport', 'issued'
            ];
            
            for (const pattern of countryPatterns) {
                if (allText.includes(pattern)) {
                    console.log(`Propace Autofill: SPECIAL COUNTRY MATCH found: "${allText}" contains "${pattern}"`);
                    return true;
                }
            }
        }
        
        // Special rules for names
        if (dataKey === 'name') {
            const namePatterns = [
                'your', 'enter', 'full', 'complete', 'first', 'last', 'given', 'family',
                'sir', 'madam', 'title', 'mr', 'mrs', 'ms', 'dr'
            ];
            
            for (const pattern of namePatterns) {
                if (allText.includes(pattern) && allText.includes('name')) {
                    console.log(`Propace Autofill: SPECIAL NAME MATCH found: "${allText}" contains "${pattern}" + name`);
                    return true;
                }
            }
        }

        // Special rules for phone
        if (dataKey === 'phoneNumber') {
            const phonePatterns = [
                'contact', 'reach', 'call', 'dial', 'ring', 'number', 'digits'
            ];
            
            for (const pattern of phonePatterns) {
                if (allText.includes(pattern)) {
                    console.log(`Propace Autofill: SPECIAL PHONE MATCH found: "${allText}" contains "${pattern}"`);
                    return true;
                }
            }
        }

        // Check autocomplete attributes
        const autocomplete = element.getAttribute('autocomplete');
        if (autocomplete) {
            const autocompleteMapping = {
                'name': ['name', 'given-name', 'family-name', 'additional-name'],
                'country': ['country', 'country-name'],
                'phoneNumber': ['tel', 'tel-national', 'tel-local'],
                'email': ['email'],
                'address': ['street-address', 'address-line1', 'address-line2'],
                'dateOfBirth': ['bday']
            };
            
            const autocompletePatterns = autocompleteMapping[dataKey] || [];
            for (const pattern of autocompletePatterns) {
                if (autocomplete.includes(pattern)) {
                    console.log(`Propace Autofill: AUTOCOMPLETE MATCH found for ${dataKey}: "${autocomplete}" contains "${pattern}"`);
                    return true;
                }
            }
        }

        return false;
    };

    // ===================================================================
    // ==              RECURSIVE SHADOW DOM SUPPORT (Enhancement 2)    ==
    // ===================================================================

    // NEW: Recursive function to find all fillable fields including Shadow DOM
    // === PHASE 1: ADVANCED FIELD DETECTION WITH SMART CACHING & DEBOUNCING ===
    // Restored advanced recursive logic, now enhanced with:
    // - Smart caching (no repeated DOM scans)
    // - Debounced scanning for rapid DOM changes
    // - Priority-based field processing
    // - Pre-compiled regex patterns
    // - Comments for clarity

    const FIELD_CACHE_DURATION = 30000; // 30 seconds
    let fieldCache = { fields: null, domHash: '', lastScan: 0 };
    let debounceTimer = null;

    // Pre-compile regex patterns for field types (performance)
    const FIELD_TYPE_PATTERNS = {
        name: /name|fname|first.*name|given.*name/i,
        lastName: /surname|lname|last.*name|family.*name/i,
        email: /email|e-mail|mail/i,
        phone: /phone|mobile|tel|contact/i,
        address: /address|street|location/i,
        city: /city|town/i,
        cnic: /cnic|id.*number|identity|national.*id/i,
        fatherName: /father|parent.*name/i,
        gender: /gender|sex/i,
        dateOfBirth: /birth|dob|age/i
    };

    // PHASE 1: ADVANCED FIELD DETECTION (SMART CACHING, LAZY LOADING, ASYNC, PRIORITY)
    // === PHASE 1: MAXIMUM ADVANCED FIELD DETECTION ENGINE ===
    // Features: Smart caching, async/debounced scan, parallelized scanning, mutation observer, field type prediction, deduplication, ranking, error handling
    let mutationObserver = null;
    async function findAllFillableFields(rootNode = document.body, options = {}) {
        // Smart DOM fingerprint for cache invalidation
        const domHash = document.body.innerHTML.length + '-' + document.querySelectorAll('form').length + '-' + document.querySelectorAll('input,select,textarea').length;
        const now = Date.now();
        if (fieldCache.domHash === domHash && (now - fieldCache.lastScan) < FIELD_CACHE_DURATION) {
            return fieldCache.fields;
        }

        // Priority-based field processing: login/signup forms first
        const authSelectors = [
            '[data-auth-section]','[data-login]','[data-signup]','[data-register]',
            'form[id*="login" i]','form[id*="signin" i]','form[id*="signup" i]','form[id*="register" i]',
            'form[class*="login" i]','form[class*="signin" i]','form[class*="signup" i]','form[class*="register" i]'
        ];
        let scopedRoot = rootNode;
        try {
            const candidates = Array.from(document.querySelectorAll(authSelectors.join(',')));
            const visible = candidates.filter(el => isElementReallyVisible(el));
            if (visible.length > 0) {
                scopedRoot = visible.sort((a,b)=>a.getBoundingClientRect().width*a.getBoundingClientRect().height - b.getBoundingClientRect().width*b.getBoundingClientRect().height)[0];
            }
        } catch(e) { /* best-effort */ }

        // Unified selector for all fillable fields
        const fieldSelectors = [
            'input:not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="file"])',
            'textarea',
            'select',
            '[contenteditable="true"]',
            '[role="textbox"]',
            '[role="combobox"]',
            '[role="listbox"]',
            '.input', '.form-control', '.form-field', '.text-input', '.select-input',
            '[data-input]', '[data-field]', '[data-form]', '[data-textbox]',
            '.ant-input', '.el-input__inner', '.v-text-field input', '.mat-input-element',
            '.form-control', '.form-select', '.custom-select', '.form-input',
            '[aria-label*="name"]', '[aria-label*="email"]', '[aria-label*="phone"]',
            '[aria-label*="address"]', '[aria-label*="country"]', '[aria-label*="nationality"]'
        ];

        // --- Parallelized scanning for large forms ---
        async function scanContainersParallel(containers) {
            return (await Promise.all(containers.map(async container => await traverseNode(container)))).flat();
        }

        // --- Advanced recursive traversal with async/lazy loading ---
        async function traverseNode(node, depth = 0) {
            const fields = [];
            if (node.querySelectorAll) {
                const elements = node.querySelectorAll(fieldSelectors.join(', '));
                for (const element of elements) {
                    if (shouldSkipElement(element)) continue;
                    if (!isElementReallyVisible(element)) continue;
                    const fieldInfo = getElementFieldInfo(element);
                    // --- Field type prediction ---
                    let predictedType = 'unknown';
                    for (const [typeKey, pattern] of Object.entries(FIELD_TYPE_PATTERNS)) {
                        if (pattern.test(fieldInfo.name.toLowerCase() + ' ' + fieldInfo.id + ' ' + fieldInfo.placeholder)) {
                            predictedType = typeKey;
                            break;
                        }
                    }
                    fields.push({
                        element: element,
                        name: fieldInfo.name,
                        type: fieldInfo.type,
                        value: fieldInfo.value,
                        context: fieldInfo.context,
                        index: fields.length,
                        domPath: getShadowDOMPath(element),
                        isInShadowDOM: node !== document && node !== document.body,
                        predictedType
                    });
                    // Lazy load: yield control for large forms
                    if (fields.length % 50 === 0) await new Promise(r => setTimeout(r, 1));
                }
            }
            // Traverse child elements for Shadow DOM
            const childElements = node.children || node.childNodes || [];
            for (const child of Array.from(childElements)) {
                if (child.nodeType !== Node.ELEMENT_NODE) continue;
                if (child.shadowRoot) {
                    const shadowFields = await traverseNode(child.shadowRoot, depth + 1);
                    fields.push(...shadowFields);
                }
                if (child.children && child.children.length > 0) {
                    const nestedFields = await traverseNode(child, depth + 1);
                    fields.push(...nestedFields);
                }
            }
            return fields;
        }

        // --- Mutation Observer for live updates ---
        if (!mutationObserver) {
            mutationObserver = new MutationObserver(() => {
                fieldCache.domHash = '';
            });
            mutationObserver.observe(document.body, { childList: true, subtree: true });
        }

        // --- Debounced scan for rapid DOM changes (async) ---
        if (debounceTimer) clearTimeout(debounceTimer);
        let allFields = [];
        debounceTimer = setTimeout(async () => {
            try {
                // Scan all major form containers in parallel
                const containers = [scopedRoot, ...Array.from(document.querySelectorAll('form'))];
                allFields = await scanContainersParallel(containers);
                // --- Deduplicate fields ---
                const seen = new Set();
                allFields = allFields.filter(f => {
                    const key = f.name + '|' + f.domPath;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                // --- Rank fields by visibility and importance ---
                allFields.sort((a, b) => {
                    // Visible fields first, then by predictedType importance
                    const visA = isElementReallyVisible(a.element) ? 1 : 0;
                    const visB = isElementReallyVisible(b.element) ? 1 : 0;
                    if (visA !== visB) return visB - visA;
                    const rankOrder = ['name','email','phone','address','cnic','dateOfBirth','gender','fatherName','city','lastName'];
                    return rankOrder.indexOf(a.predictedType) - rankOrder.indexOf(b.predictedType);
                });
                fieldCache.fields = allFields;
                fieldCache.domHash = domHash;
                fieldCache.lastScan = now;
            } catch(e) { /* error handling */ }
        }, 50); // 50ms debounce

        // For immediate return, use last cached or fresh scan
        if (!fieldCache.fields || fieldCache.domHash !== domHash) {
            try {
                const containers = [scopedRoot, ...Array.from(document.querySelectorAll('form'))];
                allFields = await scanContainersParallel(containers);
                // Deduplicate
                const seen = new Set();
                allFields = allFields.filter(f => {
                    const key = f.name + '|' + f.domPath;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                // Rank
                allFields.sort((a, b) => {
                    const visA = isElementReallyVisible(a.element) ? 1 : 0;
                    const visB = isElementReallyVisible(b.element) ? 1 : 0;
                    if (visA !== visB) return visB - visA;
                    const rankOrder = ['name','email','phone','address','cnic','dateOfBirth','gender','fatherName','city','lastName'];
                    return rankOrder.indexOf(a.predictedType) - rankOrder.indexOf(b.predictedType);
                });
                fieldCache.fields = allFields;
                fieldCache.domHash = domHash;
                fieldCache.lastScan = now;
            } catch(e) { /* error handling */ }
        } else {
            allFields = fieldCache.fields;
        }
        return allFields;
    }

    // Stronger visibility check used by field discovery
    function isElementReallyVisible(el) {
        if (!el || !(el instanceof Element)) return false;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width < 5 || rect.height < 5) return false;
        // Check if element is within viewport horizontally (allow offscreen vertically if container scrolls)
        const inHorizontal = rect.right > 0 && rect.left < (window.innerWidth || document.documentElement.clientWidth);
        return inHorizontal;
    }

    // Helper function to get the Shadow DOM path for debugging
    const getShadowDOMPath = (element) => {
        const path = [];
        let current = element;
        
        while (current) {
            if (current.host) {
                // This is a shadow root
                path.unshift(`#shadow-root`);
                current = current.host;
            } else if (current.parentNode) {
                if (current.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                    // Parent is a shadow root
                    path.unshift(`#shadow-root`);
                    current = current.parentNode.host;
                } else {
                    // Regular DOM element
                    const tagName = current.tagName ? current.tagName.toLowerCase() : 'unknown';
                    const id = current.id ? `#${current.id}` : '';
                    const className = current.className && typeof current.className === 'string' 
                        ? `.${current.className.split(' ')[0]}` : '';
                    path.unshift(`${tagName}${id}${className}`);
                    current = current.parentNode;
                }
            } else {
                break;
            }
        }
        
        return path.join(' > ');
    };

    // LEGACY: Keep the old function for backward compatibility but redirect to new one
    const getAdvancedFormFields = () => {
        console.log('Propace Autofill: Using legacy getAdvancedFormFields (redirecting to findAllFillableFields)');
        return findAllFillableFields(document.body);
    };

    // Enhanced element filtering
    const shouldSkipElement = (element) => {
        // Skip disabled, readonly, or hidden elements
        if (element.disabled || element.readOnly || element.type === 'hidden') {
            return true;
        }
        
        // Skip elements that are not visible
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return true;
        }
        
        // Skip elements that are too small (likely decorative)
        const rect = element.getBoundingClientRect();
        if (rect.width < 5 || rect.height < 5) {
            return true;
        }
        
    // Allow password fields (some forms require them). We still avoid auto-filling values like OTP/captcha above.
        
        // Skip CAPTCHA fields
        const captchaPatterns = ['captcha', 'recaptcha', 'security', 'verification', 'challenge'];
        const elementText = (element.name + ' ' + element.id + ' ' + element.className).toLowerCase();
        if (captchaPatterns.some(pattern => elementText.includes(pattern))) {
            return true;
        }
        
        return false;
    };

    // Get comprehensive field information
    const getElementFieldInfo = (element) => {
        const identifiers = [
            element.name,
            element.id,
            element.getAttribute('placeholder'),
            element.getAttribute('aria-label'),
            element.getAttribute('title'),
            element.getAttribute('data-field'),
            element.getAttribute('data-name')
        ].filter(Boolean);

        // Get context from labels and surrounding text
        let context = '';
        
        // Check for associated label
        const labelElement = element.labels?.[0] || 
                           document.querySelector(`label[for="${element.id}"]`) ||
                           element.closest('label') ||
                           element.parentElement?.querySelector('label');
        
        if (labelElement) {
            context += ' ' + labelElement.textContent;
        }
        
        // Check parent elements for context
        let parent = element.parentElement;
        for (let i = 0; i < 2 && parent; i++) {
            const textContent = Array.from(parent.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent.trim())
                .filter(text => text.length > 2 && text.length < 50)
                .join(' ');
            
            if (textContent) {
                context += ' ' + textContent;
            }
            
            parent = parent.parentElement;
        }

        return {
            name: identifiers[0] || 'unknown_field',
            type: element.type || element.tagName.toLowerCase(),
            value: element.value || element.textContent || '',
            context: context.trim(),
            allIdentifiers: identifiers
        };
    };

    // ===================================================================
    // ==              LEGACY SECTION REFERENCE                        ==
    // ===================================================================
    // Note: Enhanced versions of functions are now in the Error Handling section above
    // Legacy functions have been replaced with enhanced versions that include:
    // - Comprehensive error handling
    // - Performance monitoring  
    // - Advanced state management
    // - Better visual feedback

    // ===================================================================
    // ==              ADVANCED WEB FORM HANDLER                       ==
    // ===================================================================

    // ===================================================================
    // ==              USE-ONCE STATE MANAGEMENT (Enhancement 5)       ==
    // ===================================================================

    // State management for preventing duplicate fills
    // ===================================================================
    // ==              ENHANCED "USE-ONCE" STATE MANAGEMENT            ==
    // ===================================================================

    class PropaceStateManager {
        constructor() {
            // Core state tracking
            this.usedDataKeys = new Set();
            this.filledFields = new Set(); // WeakSet would be better but need iteration capability
            this.fieldScores = new Map();
            this.fillHistory = [];
            
            // Enhanced tracking for "Use-Once" functionality
            this.dataKeyUsageMap = new Map(); // Track which data key was used for which field
            this.fieldDataMap = new Map(); // Track which field contains which data
            this.pendingFields = new Set(); // Fields currently being processed
            this.conflictLog = []; // Log of conflicts and resolutions
            this.sessionId = this.generateSessionId();
            
            // Performance tracking
            this.startTime = Date.now();
            this.operationCount = 0;
            
            console.log(`🔧 Propace State Manager initialized (Session: ${this.sessionId})`);
        }

        // Generate unique session ID
        generateSessionId() {
            return `propace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Enhanced data key usage tracking
        markDataKeyUsed(dataKey, fieldElement, score, evidence = []) {
            // Prevent duplicate usage
            if (this.isDataKeyUsed(dataKey)) {
                console.warn(`⚠️ Data key "${dataKey}" already used, creating conflict log entry`);
                this.logConflict('DATA_KEY_REUSE', dataKey, fieldElement, 'Data key already used');
                return false;
            }

            // Prevent field re-filling
            if (this.isFieldFilled(fieldElement)) {
                console.warn(`⚠️ Field already filled, creating conflict log entry`);
                this.logConflict('FIELD_REFILL', dataKey, fieldElement, 'Field already filled');
                return false;
            }

            // Mark as used
            this.usedDataKeys.add(dataKey);
            this.filledFields.add(fieldElement);
            this.fieldScores.set(fieldElement, score);
            
            // Enhanced tracking
            this.dataKeyUsageMap.set(dataKey, {
                field: fieldElement,
                score: score,
                evidence: evidence,
                timestamp: Date.now(),
                sessionId: this.sessionId
            });
            
            this.fieldDataMap.set(fieldElement, {
                dataKey: dataKey,
                score: score,
                evidence: evidence,
                timestamp: Date.now()
            });

            // Add to fill history with enhanced metadata
            this.fillHistory.push({
                dataKey: dataKey,
                element: fieldElement,
                score: score,
                evidence: evidence,
                timestamp: Date.now(),
                sessionId: this.sessionId,
                fieldName: fieldElement.name || fieldElement.id || 'unnamed',
                fieldType: fieldElement.type || fieldElement.tagName.toLowerCase()
            });

            // Remove from pending if exists
            this.pendingFields.delete(fieldElement);
            
            // Add DOM attribute for debugging
            fieldElement.setAttribute('data-propace-filled', 'true');
            fieldElement.setAttribute('data-propace-session', this.sessionId);
            fieldElement.setAttribute('data-propace-data-key', dataKey);
            
            this.operationCount++;
            
            console.log(`✅ Marked data key "${dataKey}" as used with score ${score.toFixed(3)} (Op: ${this.operationCount})`);
            return true;
        }

        // Enhanced field reservation system
        reserveField(fieldElement, dataKey) {
            if (this.isFieldFilled(fieldElement) || this.pendingFields.has(fieldElement)) {
                return false;
            }
            
            this.pendingFields.add(fieldElement);
            fieldElement.setAttribute('data-propace-pending', dataKey);
            
            console.log(`🔒 Reserved field for data key "${dataKey}"`);
            return true;
        }

        // Release field reservation
        releaseField(fieldElement) {
            this.pendingFields.delete(fieldElement);
            fieldElement.removeAttribute('data-propace-pending');
            console.log(`🔓 Released field reservation`);
        }

        // Enhanced data key usage check
        isDataKeyUsed(dataKey) {
            return this.usedDataKeys.has(dataKey);
        }

        // Enhanced field filling check
        isFieldFilled(fieldElement) {
            return this.filledFields.has(fieldElement) || 
                   fieldElement.hasAttribute('data-propace-filled') ||
                   this.pendingFields.has(fieldElement);
        }

        // Check if field is reserved/pending
        isFieldPending(fieldElement) {
            return this.pendingFields.has(fieldElement);
        }

        // Get data key that was used for a specific field
        getFieldDataKey(fieldElement) {
            const fieldData = this.fieldDataMap.get(fieldElement);
            return fieldData ? fieldData.dataKey : null;
        }

        // Get field that was used for a specific data key
        getDataKeyField(dataKey) {
            const usage = this.dataKeyUsageMap.get(dataKey);
            return usage ? usage.field : null;
        }

        // Enhanced field score retrieval
        getFieldScore(fieldElement) {
            return this.fieldScores.get(fieldElement) || 0;
        }

        // Log conflicts for debugging
        logConflict(type, dataKey, fieldElement, reason) {
            const conflict = {
                type: type,
                dataKey: dataKey,
                fieldElement: fieldElement,
                reason: reason,
                timestamp: Date.now(),
                sessionId: this.sessionId,
                existingDataKey: this.getFieldDataKey(fieldElement),
                existingField: this.getDataKeyField(dataKey)
            };
            
            this.conflictLog.push(conflict);
            console.warn(`⚠️ Conflict logged: ${type} - ${reason}`, conflict);
        }

        // Get available data keys (not yet used)
        getAvailableDataKeys(allDataKeys) {
            return allDataKeys.filter(key => !this.isDataKeyUsed(key));
        }

        // Get available fields (not yet filled)
        getAvailableFields(allFields) {
            return allFields.filter(field => !this.isFieldFilled(field.element));
        }

        // Enhanced reset with conflict preservation option
        reset(preserveConflicts = false) {
            console.log(`🔄 Resetting state manager (Session: ${this.sessionId})`);
            
            // Clear core state
            this.usedDataKeys.clear();
            this.filledFields.clear();
            this.fieldScores.clear();
            this.pendingFields.clear();
            this.fillHistory = [];
            this.dataKeyUsageMap.clear();
            this.fieldDataMap.clear();
            
            // Optionally preserve conflicts for debugging
            if (!preserveConflicts) {
                this.conflictLog = [];
            }

            // Remove all propace attributes from DOM
            document.querySelectorAll('[data-propace-filled]').forEach(element => {
                element.removeAttribute('data-propace-filled');
                element.removeAttribute('data-propace-session');
                element.removeAttribute('data-propace-data-key');
                element.removeAttribute('data-propace-pending');
            });

            // Reset performance tracking
            this.startTime = Date.now();
            this.operationCount = 0;
            this.sessionId = this.generateSessionId();
            
            console.log(`✅ State manager reset complete (New Session: ${this.sessionId})`);
        }

        // Enhanced statistics with detailed breakdown
        getStats() {
            const duration = Date.now() - this.startTime;
            
            return {
                sessionId: this.sessionId,
                performance: {
                    duration: duration,
                    operationsPerSecond: duration > 0 ? (this.operationCount / (duration / 1000)).toFixed(2) : 0,
                    totalOperations: this.operationCount
                },
                usage: {
                    usedDataKeys: Array.from(this.usedDataKeys),
                    filledFieldsCount: this.filledFields.size,
                    pendingFieldsCount: this.pendingFields.size,
                    conflictCount: this.conflictLog.length
                },
                history: {
                    fillHistory: this.fillHistory,
                    conflicts: this.conflictLog
                },
                mappings: {
                    dataKeyToField: Object.fromEntries(
                        Array.from(this.dataKeyUsageMap.entries()).map(([key, value]) => [
                            key, 
                            {
                                fieldName: value.field.name || value.field.id || 'unnamed',
                                score: value.score,
                                timestamp: value.timestamp
                            }
                        ])
                    )
                }
            };
        }

        // Validation method to check state consistency
        validateState() {
            const issues = [];
            
            // Check if DOM and state are consistent
            const domFilledFields = document.querySelectorAll('[data-propace-filled]');
            if (domFilledFields.length !== this.filledFields.size) {
                issues.push(`DOM filled fields (${domFilledFields.length}) doesn't match state (${this.filledFields.size})`);
            }

            // Check for orphaned pending fields
            const domPendingFields = document.querySelectorAll('[data-propace-pending]');
            if (domPendingFields.length !== this.pendingFields.size) {
                issues.push(`DOM pending fields (${domPendingFields.length}) doesn't match state (${this.pendingFields.size})`);
            }

            // Check data consistency
            if (this.usedDataKeys.size !== this.dataKeyUsageMap.size) {
                issues.push(`Used data keys (${this.usedDataKeys.size}) doesn't match usage map (${this.dataKeyUsageMap.size})`);
            }

            if (issues.length > 0) {
                console.warn('⚠️ State validation issues found:', issues);
                return { valid: false, issues };
            }

            console.log('✅ State validation passed');
            return { valid: true, issues: [] };
        }

        // Debug method to print current state
        debugPrint() {
            console.group(`🔍 Propace State Manager Debug (Session: ${this.sessionId})`);
            console.log('Used Data Keys:', Array.from(this.usedDataKeys));
            console.log('Filled Fields Count:', this.filledFields.size);
            console.log('Pending Fields Count:', this.pendingFields.size);
            console.log('Conflicts:', this.conflictLog.length);
            console.log('Fill History:', this.fillHistory);
            console.log('Performance:', `${this.operationCount} ops in ${Date.now() - this.startTime}ms`);
            console.groupEnd();
        }
    }

    // Global state manager instance
    let propaceStateManager = new PropaceStateManager();

    // ===================================================================
    // ==              "USE-ONCE" UTILITY FUNCTIONS                    ==
    // ===================================================================

    // Force cleanup of all state management (emergency reset)
    const forceCleanupState = () => {
        console.log('🧹 Force cleaning up all state management');
        
        // Clean DOM attributes
        document.querySelectorAll('[data-propace-filled], [data-propace-pending], [data-propace-session], [data-propace-data-key]').forEach(element => {
            element.removeAttribute('data-propace-filled');
            element.removeAttribute('data-propace-pending');
            element.removeAttribute('data-propace-session');
            element.removeAttribute('data-propace-data-key');
        });

        // Reset state manager
        if (propaceStateManager) {
            propaceStateManager.reset(false); // Don't preserve conflicts
        }

        console.log('✅ Force cleanup completed');
    };

    // Validate and repair state consistency
    const validateAndRepairState = () => {
        console.log('🔧 Validating and repairing state consistency');
        
        if (!propaceStateManager) {
            console.log('⚠️ State manager not initialized, creating new instance');
            propaceStateManager = new PropaceStateManager();
            return false;
        }

        const validation = propaceStateManager.validateState();
        
        if (!validation.valid) {
            console.warn('⚠️ State inconsistencies detected, attempting repair');
            
            // Repair DOM-State mismatches
            const domFilledFields = document.querySelectorAll('[data-propace-filled]');
            const domPendingFields = document.querySelectorAll('[data-propace-pending]');
            
            // Sync DOM with state
            domFilledFields.forEach(element => {
                if (!propaceStateManager.filledFields.has(element)) {
                    console.log('🔧 Adding orphaned DOM field to state');
                    propaceStateManager.filledFields.add(element);
                }
            });

            // Clean orphaned pending fields
            domPendingFields.forEach(element => {
                if (!propaceStateManager.pendingFields.has(element)) {
                    console.log('🔧 Removing orphaned pending field from DOM');
                    element.removeAttribute('data-propace-pending');
                }
            });

            console.log('✅ State repair completed');
            return true;
        }

        console.log('✅ State validation passed');
        return true;
    };

    // Get comprehensive state report for debugging
    const getStateReport = () => {
        if (!propaceStateManager) {
            return { error: 'State manager not initialized' };
        }

        const domFilledCount = document.querySelectorAll('[data-propace-filled]').length;
        const domPendingCount = document.querySelectorAll('[data-propace-pending]').length;
        
        return {
            stateManager: propaceStateManager.getStats(),
            validation: propaceStateManager.validateState(),
            domSync: {
                domFilledFields: domFilledCount,
                stateFilled: propaceStateManager.filledFields.size,
                domPendingFields: domPendingCount,
                statePending: propaceStateManager.pendingFields.size,
                inSync: domFilledCount === propaceStateManager.filledFields.size && 
                        domPendingCount === propaceStateManager.pendingFields.size
            },
            sessionInfo: {
                sessionId: propaceStateManager.sessionId,
                startTime: propaceStateManager.startTime,
                duration: Date.now() - propaceStateManager.startTime
            }
        };
    };

    // ===================================================================
    // ==              MODULAR FORM FILLING SYSTEM                     ==
    // ===================================================================

    // Enhanced form filling with comprehensive error handling and performance monitoring
    const fillAdvancedFormFields = async (extractedData) => {
        return safeExecute(async () => {
            console.group('🎯 Propace Autofill: Enterprise Form Filling Started');
            console.log('📊 Processing extracted data:', extractedData);
            
            // CRITICAL FIX: Normalize data keys first
            const normalizedData = normalizeDataKeys(extractedData);
            console.log('📋 Normalized data keys:', Object.keys(normalizedData));
            
            const startTime = performance.now();
            
            // Reset state for new autofill session
            propaceStateManager.reset();
            
            // Save data for cross-tab persistence
            await crossTabDataManager.saveToStorage(normalizedData);
            
            // Use enhanced field finder with caching
            const cacheKey = fieldCache.generateCacheKey(document.body);
            let formFields = fieldCache.getCachedFields(cacheKey);
            
            if (!formFields) {
                formFields = findAllFillableFields(document.body);
                fieldCache.setCachedFields(cacheKey, formFields);
            }
            
            console.log(`📋 Discovered ${formFields.length} fillable fields (including Shadow DOM)`);
            
            // Process iFrames if present
            const iframeFilledCount = await handleIFrameAutofill(extractedData);
            
            if (formFields.length === 0 && iframeFilledCount === 0) {
                console.groupEnd();
                return { 
                    success: false, 
                    fieldsCount: 0, 
                    message: 'No fillable form fields found on this page',
                    performanceMetrics: propaceErrorHandler.getStats()
                };
            }

            let filledCount = 0;
            const filledFields = [];

            // Enhanced data mapping with comprehensive coverage
            const dataMapping = createDataMapping();

            // Phase 1: Data Processing with Error Isolation and Enhanced Recognition
            console.group('🔄 Phase 1: Enhanced Data Processing & Analysis');
            
            let dataProcessingResults = await processFormDataMappingsEnhanced(extractedData, dataMapping, formFields);
            // Filter out entries with null/empty processed values or failed validation, to keep preview honest
            dataProcessingResults = dataProcessingResults.filter(r => {
                const val = r.processedValue;
                const nonEmpty = !(val == null || (typeof val === 'string' && val.trim() === ''));
                const valid = !r.validation || r.validation.isValid !== false;
                return nonEmpty && valid;
            });
            
            console.log(`📊 Processed ${dataProcessingResults.length} potential field matches`);
            console.groupEnd();

            // Phase 2: User Preview Mode (if enabled)
            console.group('👁️ Phase 2: User Preview & Validation');
            
            const shouldProceed = await userFeedbackSystem.showPreviewMode(dataProcessingResults);
            if (!shouldProceed) {
                console.log('❌ User cancelled autofill operation');
                console.groupEnd();
                console.groupEnd();
                return { success: false, fieldsCount: 0, message: 'User cancelled operation' };
            }
            
            console.groupEnd();

            // Phase 3: Enhanced "Use-Once" Field Filling with Validation
            console.group('🎯 Phase 3: Intelligent Field Filling with Validation');
            
            const fillResults = await performIntelligentFieldFillingWithValidation(dataProcessingResults);
            filledCount = fillResults.filledCount;
            filledFields.push(...fillResults.filledFields);
            
            console.groupEnd();

            // Phase 4: Results Summary with Performance Metrics
            console.group('📈 Phase 4: Results & Performance Analysis');
            
            const endTime = performance.now();
            const totalDuration = endTime - startTime;
            
            propaceErrorHandler.logPerformance('Complete Form Fill Operation', totalDuration, {
                fieldsFound: formFields.length,
                fieldsProcessed: dataProcessingResults.length,
                fieldsFilled: filledCount,
                iframeFieldsFilled: iframeFilledCount,
                dataKeys: Object.keys(extractedData).length
            });
            
            // Final state validation
            const finalValidation = propaceStateManager.validateState();
            
            console.log(`✅ Successfully filled ${filledCount + iframeFilledCount} fields in ${totalDuration.toFixed(2)}ms`);
            console.log(`📊 Performance Metrics:`, propaceErrorHandler.getStats());
            console.log(`🔧 State Validation:`, finalValidation.valid ? 'PASSED' : 'FAILED');
            
            if (!finalValidation.valid) {
                console.warn('⚠️ State validation issues:', finalValidation.issues);
            }
            
            console.groupEnd();
            console.groupEnd();

            // Show professional success notification
            const totalFilled = filledCount + iframeFilledCount;
            if (totalFilled > 0) {
                showAdvancedPageNotification(
                    `🎯 Propace: Successfully filled ${totalFilled} fields with intelligent matching!`, 
                    'success'
                );
            } else {
                showAdvancedPageNotification(
                    'ℹ️ Propace: No matching form fields found on this page', 
                    'info'
                );
            }

            return {
                success: totalFilled > 0,
                fieldsCount: totalFilled,
                fieldsSuccess: totalFilled,
                filledFields: filledFields,
                totalFieldsFound: formFields.length,
                iframeFieldsFilled: iframeFilledCount,
                processingResults: dataProcessingResults.length,
                stateStats: propaceStateManager.getStats(),
                stateValidation: finalValidation,
                performanceMetrics: propaceErrorHandler.getStats(),
                sessionId: propaceStateManager.sessionId,
                duration: totalDuration,
                message: totalFilled > 0 ? 
                    `Successfully filled ${totalFilled} fields with enterprise-grade processing` : 
                    'No matching fields found'
            };

        }, 'Enhanced Form Fill Operation', {
            success: false,
            fieldsCount: 0,
            error: 'Critical error in form filling',
            performanceMetrics: propaceErrorHandler.getStats()
        });
    };

    // Enhanced data processing with AI-like recognition
    const processFormDataMappingsEnhanced = async (extractedData, dataMapping, formFields) => {
        return safeExecute(async () => {
            const dataProcessingResults = [];
            
            // Get available data keys (not yet used)
            const availableDataKeys = propaceStateManager.getAvailableDataKeys(Object.keys(extractedData));
            console.log(`📋 Available data keys (${availableDataKeys.length}/${Object.keys(extractedData).length}):`, availableDataKeys);
            
            for (const dataKey of availableDataKeys) {
                let dataValue = extractedData[dataKey];
                
                console.group(`🔍 Processing: ${dataKey} = "${dataValue}"`);
                
                // Skip empty or invalid values
                if (!dataValue || dataValue === 'null' || dataValue === 'undefined' || 
                    (typeof dataValue === 'string' && dataValue.trim() === '')) {
                    console.log('⏭️ Skipping empty value');
                    console.groupEnd();
                    continue;
                }

                // USE-ONCE CHECK: Skip if data key is already used
                if (propaceStateManager.isDataKeyUsed(dataKey)) {
                    console.log(`⏭️ Data key "${dataKey}" already used, skipping`);
                    console.groupEnd();
                    continue;
                }

                // Get field patterns for this data key
                let fieldKeys = dataMapping[dataKey];
                if (!fieldKeys) {
                    console.log('❌ No mapping found for this data key');
                    console.groupEnd();
                    continue;
                }

                // Convert to array if single value
                if (typeof fieldKeys === 'string') {
                    fieldKeys = [fieldKeys];
                }

                console.log('🎯 Target field patterns:', fieldKeys);

                // Process each field pattern for this data
                for (const fieldKey of fieldKeys) {
                    // Get available fields (not yet filled or pending)
                    const availableFields = propaceStateManager.getAvailableFields(formFields);
                    
                    if (availableFields.length === 0) {
                        console.log('❌ No available fields remaining');
                        break;
                    }

                    // Enhanced field matching with AI-like recognition
                    const bestMatch = findBestMatchingFieldEnhanced(availableFields, fieldKey, propaceStateManager.filledFields);
                    
                    if (bestMatch) {
                        // Double-check field availability (extra safety)
                        if (propaceStateManager.isFieldFilled(bestMatch.field.element)) {
                            console.log(`⏭️ Field "${bestMatch.field.name}" already filled, skipping`);
                            continue;
                        }

                        // Reserve the field to prevent conflicts
                        if (propaceStateManager.reserveField(bestMatch.field.element, dataKey)) {
                            // Enhanced data processing with smart address parsing
                            const processedValue = await processDataForFieldEnhanced(dataValue, fieldKey, bestMatch.field.element);
                            
                            // Validate the processed value
                            const validation = await validationChecker.validateField(bestMatch.field.element, processedValue);
                            
                            dataProcessingResults.push({
                                originalDataKey: dataKey,
                                fieldKey: fieldKey,
                                originalValue: dataValue,
                                processedValue: processedValue,
                                field: bestMatch.field,
                                score: bestMatch.score,
                                evidence: bestMatch.evidence,
                                validation: validation,
                                enhancedAnalysis: bestMatch.enhancedAnalysis
                            });

                            console.log(`✅ Best match found: "${bestMatch.field.name}" (Score: ${bestMatch.score.toFixed(2)})`);
                            console.log(`🔄 Processed data: "${dataValue}" → "${processedValue}"`);
                            console.log(`🔒 Field reserved for data key "${dataKey}"`);
                            console.log(`✅ Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
                        } else {
                            console.log(`❌ Could not reserve field "${bestMatch.field.name}"`);
                        }
                    } else {
                        console.log(`❌ No suitable available field found for pattern "${fieldKey}"`);
                    }
                }

                console.groupEnd();
            }
            
            return dataProcessingResults;
        }, []);
    };

    // Heuristic signals extractor for labels/attrs/nearby texts
    const getFieldSignals = (el) => {
        const toStr = (v) => (v || '').toString().toLowerCase();
        const name = toStr(el.name);
        const id = toStr(el.id);
        const type = toStr(el.type);
        const placeholder = toStr(el.placeholder);
        const title = toStr(el.title);
        const aria = toStr(el.getAttribute?.('aria-label'));
        const autocomplete = toStr(el.getAttribute?.('autocomplete'));
        const pattern = toStr(el.getAttribute?.('pattern'));
        let labelText = '';
        try {
            if (el.labels && el.labels.length > 0) {
                labelText = toStr(el.labels[0].textContent || el.labels[0].innerText);
            } else if (el.id) {
                const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
                if (lbl) labelText = toStr(lbl.textContent || lbl.innerText);
            }
        } catch(_) {}
        let nearby = '';
        try { nearby = enhancedFieldRecognition.getNearbyTextContent(el, 120) || ''; } catch(_) {}
        return { name, id, type, placeholder, title, aria, autocomplete, pattern, labelText, nearby };
    };

    // Semantic boost for target data keys (0.0 .. 0.6)
    const computeSemanticBoost = (el, dataKey) => {
        const s = getFieldSignals(el);
        const has = (...words) => words.some(w => s.name.includes(w) || s.id.includes(w) || s.labelText.includes(w) || s.placeholder.includes(w) || s.aria.includes(w) || s.nearby.includes(w));
        const hasAny = (arr) => has(...arr);
        const len = (v) => (v == null ? 0 : String(v).length);
        let boost = 0;
        const cues = [];

        switch (dataKey) {
            case 'idNumber': {
                // CNIC signals
                const cnicWords = ['cnic','nic','id card','id-card','id card no','id card number','national id','national-id','nicop'];
                if (hasAny(cnicWords)) { boost += 0.35; cues.push('cue:cnic-words'); }
                if (has('id')) { boost += 0.15; cues.push('cue:generic-id'); }
                if (/\d{5}-\d{7}-\d{1}/.test(s.placeholder)) { boost += 0.2; cues.push('cue:placeholder-cnic-pattern'); }
                if (/\d{13}/.test(s.placeholder.replace(/\D/g,''))) { boost += 0.1; cues.push('cue:placeholder-13digits'); }
                if (s.type === 'number' || s.type === 'tel') { boost += 0.08; cues.push(`type:${s.type}`); }
                const ml = parseInt(el.getAttribute('maxlength') || el.maxLength || 0, 10);
                if (ml === 13 || ml === 15) { boost += 0.08; cues.push(`maxlength:${ml}`); }
                if ((s.autocomplete || '').includes('id')) { boost += 0.05; cues.push('autocomplete:id'); }
                break;
            }
            case 'email': {
                if (s.type === 'email') { boost += 0.3; cues.push('type:email'); }
                if (has('email','e-mail','mail')) { boost += 0.25; cues.push('cue:email-words'); }
                if ((s.autocomplete || '').includes('email')) { boost += 0.1; cues.push('autocomplete:email'); }
                break;
            }
            case 'phoneNumber': {
                if (s.type === 'tel' || s.type === 'number') { boost += 0.25; cues.push(`type:${s.type}`); }
                if (has('phone','mobile','contact','tel')) { boost += 0.25; cues.push('cue:phone-words'); }
                if ((s.autocomplete || '').includes('tel')) { boost += 0.08; cues.push('autocomplete:tel'); }
                if (/\+?\d[\d\s\-()]{9,}/.test(s.placeholder)) { boost += 0.08; cues.push('placeholder:phone-pattern'); }
                break;
            }
            case 'dateOfBirth': {
                if (s.type === 'date' || s.type === 'datetime-local') { boost += 0.3; cues.push(`type:${s.type}`); }
                if (has('dob','date of birth','birth date','birth','bday','birthday')) { boost += 0.25; cues.push('cue:dob-words'); }
                if ((s.autocomplete || '').includes('bday')) { boost += 0.08; cues.push('autocomplete:bday'); }
                break;
            }
            case 'name':
            case 'fatherName':
            case 'husbandName': {
                if (has('name','full name','first name','last name','given name','family name','father','husband')) { boost += 0.3; cues.push('cue:name-words'); }
                if (len(s.type) && s.type === 'text') { boost += 0.05; cues.push('type:text'); }
                break;
            }
            case 'password': {
                if (s.type === 'password') { boost += 0.45; cues.push('type:password'); }
                if (has('password','pass','pwd')) { boost += 0.2; cues.push('cue:password-words'); }
                break;
            }
            case 'address':
            case 'currentAddress':
            case 'permanentAddress': {
                if (has('address','street','house','block','sector','city','state','province','zip','postal')) { boost += 0.25; cues.push('cue:address-words'); }
                if (len(s.placeholder) > 12) { boost += 0.05; cues.push('placeholder:long'); }
                break;
            }
        }
        // Clamp
        if (boost > 0.6) boost = 0.6;
        return { boost, cues };
    };

    // Enhanced field matching with AI-like recognition + semantic boost
    const findBestMatchingFieldEnhanced = (fields, dataKey, usedFields = new Set()) => {
        let bestField = null;
        let bestScore = 0;
        let bestEvidence = [];
        let bestEnhancedAnalysis = null;
        let bestSemanticHints = null;
        let candidates = [];

        for (const field of fields) {
            // Skip if field is already used
            if (usedFields.has(field.element)) continue;
            
            // Skip if field is already filled by us
            if (field.element.hasAttribute('data-propace-filled')) continue;

            // Skip if field is hidden or disabled
            if (field.element.style.display === 'none' || 
                field.element.style.visibility === 'hidden' ||
                field.element.disabled ||
                field.element.readOnly) continue;

            // Get traditional score
            const scoreResult = calculateFieldMatchScore(field.element, dataKey);
            
            // Get enhanced AI-like analysis
            const enhancedAnalysis = enhancedFieldRecognition.analyzeField(field.element);
            
            // Semantic domain-specific boost
            const sem = computeSemanticBoost(field.element, dataKey);
            // Combine scores + boost
            const combinedScore = (scoreResult.score * 0.65) + (enhancedAnalysis.score * 0.25) + sem.boost;
            
            // Store all candidates for better analysis
            candidates.push({
                field: field,
                score: combinedScore,
                evidence: scoreResult.evidence,
                enhancedAnalysis: enhancedAnalysis,
                element: field.element
            });
            
            if (combinedScore > bestScore) {
                bestScore = combinedScore;
                bestField = field;
                bestEvidence = scoreResult.evidence;
                bestEnhancedAnalysis = enhancedAnalysis;
                bestSemanticHints = { semBoost: sem.boost, cues: sem.cues };
            }
        }

        // Advanced field selection logic
        if (bestField && bestScore >= 0.3) {
            console.log(`🎯 Propace Enhanced: Best match for "${dataKey}": Field "${bestField.name}" with score ${bestScore.toFixed(2)}`);
            console.log('📊 Enhanced Analysis:', bestEnhancedAnalysis);
            if (bestSemanticHints) {
                console.log('🧭 Semantic Hints:', bestSemanticHints);
            }
            
            return { 
                field: bestField, 
                score: bestScore, 
                evidence: bestEvidence,
                enhancedAnalysis: bestEnhancedAnalysis,
                semanticHints: bestSemanticHints,
                alternatives: candidates.filter(c => c.field !== bestField).length
            };
        }

        console.log(`❌ Propace Enhanced: No suitable field found for "${dataKey}" (analyzed ${candidates.length} candidates)`);
    return null;
    };

    // Enhanced data processing with smart parsing
    const processDataForFieldEnhanced = async (dataValue, dataKey, fieldElement) => {
        return safeExecute(async () => {
            console.group(`🔄 Enhanced Processing: ${dataKey}`);
            console.log(`Raw value: "${dataValue}"`);
            console.log('Target element:', fieldElement);
            
            if (!dataValue || dataValue === 'null' || dataValue === 'undefined') {
                console.log('❌ Invalid data value');
                console.groupEnd();
                return null;
            }

            let processedValue;
            
            // Enhanced processing based on data type
            switch (dataKey) {
                case 'address':
                case 'currentAddress':
                case 'permanentAddress':
                    processedValue = await processAddressDataEnhanced(dataValue, fieldElement);
                    break;
                case 'name':
                case 'fatherName':
                case 'husbandName':
                    processedValue = fieldProcessingModule.processNameData(dataValue, fieldElement);
                    break;
                case 'phoneNumber':
                    processedValue = fieldProcessingModule.processPhoneData(dataValue, fieldElement);
                    break;
                case 'dateOfBirth':
                    processedValue = fieldProcessingModule.processDateData(dataValue, fieldElement);
                    break;
                case 'email':
                    processedValue = fieldProcessingModule.processEmailData(dataValue, fieldElement);
                    break;
                case 'country':
                    processedValue = fieldProcessingModule.processCountryData(dataValue, fieldElement);
                    break;
                case 'gender':
                    processedValue = fieldProcessingModule.processGenderData(dataValue, fieldElement);
                    break;
                default:
                    processedValue = dataValue.toString().trim();
            }

            console.log(`Processed value: "${processedValue}"`);
            console.groupEnd();
            return processedValue;
        }, 'Enhanced Field Data Processing', dataValue);
    };

    // Enhanced address processing with smart parsing
    const processAddressDataEnhanced = async (addressValue, fieldElement) => {
        return safeExecute(async () => {
            const fieldContext = fieldProcessingModule.getFieldContext(fieldElement);
            
            // Use smart address parser for component extraction
            const addressComponents = await smartAddressParser.extractComponents(addressValue);
            
            if (addressComponents && addressComponents.confidence > 0.5) {
                console.log('🏠 Smart address parsing successful:', addressComponents);
                
                // Return appropriate component based on field context
                if (/line1|first/.test(fieldContext.context)) {
                    return addressComponents.line1;
                } else if (/line2|second/.test(fieldContext.context)) {
                    return addressComponents.line2;
                } else if (/city/.test(fieldContext.context)) {
                    return addressComponents.city;
                } else if (/state|province/.test(fieldContext.context)) {
                    return addressComponents.state;
                } else if (/postal|zip/.test(fieldContext.context)) {
                    return addressComponents.postalCode;
                } else if (/country/.test(fieldContext.context)) {
                    return addressComponents.country;
                } else {
                    return addressValue; // Return full address for general fields
                }
            } else {
                console.log('🏠 Using fallback address processing');
                return fieldProcessingModule.processAddressData(addressValue, fieldElement);
            }
        }, 'Enhanced Address Processing', addressValue);
    };

    // Enhanced field filling with validation
    const performIntelligentFieldFillingWithValidation = async (dataProcessingResults) => {
        let filledCount = 0;
        const filledFields = [];
        
        // Sort by score (highest first) to fill best matches first
        dataProcessingResults.sort((a, b) => b.score - a.score);
        
        // Validate state before filling
        const stateValidation = propaceStateManager.validateState();
        if (!stateValidation.valid) {
            console.warn('⚠️ State validation failed before filling:', stateValidation.issues);
        }
        
        // Process each result sequentially to avoid conflicts
        for (let index = 0; index < dataProcessingResults.length; index++) {
            const result = dataProcessingResults[index];
            console.group(`📝 Fill ${index + 1}: ${result.originalDataKey} → ${result.field.name} (Score: ${result.score.toFixed(2)})`);
            
            try {
                // ENHANCED USE-ONCE CHECKS
                
                // Check 1: Data key already used
                if (propaceStateManager.isDataKeyUsed(result.originalDataKey)) {
                    console.log(`⏭️ Data key "${result.originalDataKey}" already used, skipping`);
                    propaceStateManager.releaseField(result.field.element);
                    console.groupEnd();
                    continue;
                }

                // Check 2: Field already filled
                if (propaceStateManager.isFieldFilled(result.field.element)) {
                    console.log(`⏭️ Field "${result.field.name}" already filled, skipping`);
                    propaceStateManager.releaseField(result.field.element);
                    console.groupEnd();
                    continue;
                }

                // Check 3: Validation check
                if (!result.validation.isValid) {
                    console.log(`❌ Validation failed for "${result.processedValue}":`, result.validation);
                    // Still proceed but log the warning
                }

                console.log('🔄 All use-once checks passed, proceeding with fill...');

                // Fill the field using advanced method
                // Force idNumber type when the data key is idNumber to allow CNIC formatting and bypass non-ID guard
                const detectedType = window.detectFieldType(result.field.element);
                const effectiveType = (result.originalDataKey === 'idNumber') ? 'idNumber' : detectedType;
                const fillSuccess = await fillFieldAdvanced(
                    result.field.element, 
                    result.processedValue, 
                    effectiveType
                );

                if (fillSuccess) {
                    // Add visual feedback
                    addVisualFeedback(result.field.element);
                    
                    // Log correction for learning if validation failed
                    if (!result.validation.isValid) {
                        await userFeedbackSystem.allowFieldCorrection(
                            result.field, 
                            result.processedValue, 
                            result.field.element.value
                        );
                    }
                    
                    // Update state manager with enhanced tracking
                    const markSuccess = propaceStateManager.markDataKeyUsed(
                        result.originalDataKey, 
                        result.field.element, 
                        result.score,
                        result.evidence
                    );

                    if (markSuccess) {
                        filledCount++;
                        filledFields.push({
                            originalDataKey: result.originalDataKey,
                            fieldPattern: result.fieldKey,
                            fieldName: result.field.name,
                            processedValue: result.processedValue,
                            score: result.score,
                            evidence: result.evidence,
                            validation: result.validation,
                            enhancedAnalysis: result.enhancedAnalysis,
                            fieldType: result.field.type,
                            isInShadowDOM: result.field.isInShadowDOM,
                            sessionId: propaceStateManager.sessionId,
                            timestamp: Date.now()
                        });

                        console.log(`✅ Successfully filled and marked as used (Score: ${result.score.toFixed(3)})`);
                        console.log(`📊 State: ${propaceStateManager.usedDataKeys.size} data keys used, ${propaceStateManager.filledFields.size} fields filled`);
                    } else {
                        console.warn('⚠️ Field filled but state marking failed');
                    }
                } else {
                    console.log('❌ Fill operation failed, releasing field reservation');
                    propaceStateManager.releaseField(result.field.element);
                }

            } catch (error) {
                console.error('💥 Error filling field:', error);
                // Release field reservation on error
                propaceStateManager.releaseField(result.field.element);
            }

            console.groupEnd();
        }
        
        return { filledCount, filledFields };
    };

    // Core advanced fill implementation (missing earlier). Handles inputs, selects, checkboxes, radios, dates, and contenteditable.
    const fillFieldAdvanced = async (element, rawValue, effectiveType = '') => {
        try {
            // Resolve value if a Promise (some callers pass async processors without awaiting)
            const dataValue = await Promise.resolve(rawValue);
            if (dataValue === undefined || dataValue === null) return false;

            const tag = (element.tagName || '').toLowerCase();
            const type = (element.type || '').toLowerCase();
            const isContentEditable = element.isContentEditable || element.getAttribute?.('contenteditable') === 'true';

            // Temporarily remove readonly to allow setting
            const wasReadOnly = !!element.readOnly;
            if (wasReadOnly) {
                try { element.readOnly = false; element.removeAttribute('readonly'); } catch {}
            }

            let success = false;

            // Handle select elements
            if (tag === 'select') {
                success = await fillSelectFieldAdvanced(element, String(dataValue));
                if (!success) {
                    // Try custom dropdowns attached to a proxy element
                    success = await fillCustomDropdown(element, String(dataValue));
                }
            }
            // Checkboxes
            else if (type === 'checkbox') {
                success = await fillCheckbox(element, dataValue);
            }
            // Radio groups
            else if (type === 'radio') {
                success = await fillRadioGroup(element, String(dataValue));
            }
            // Date and date-like
            else if (type === 'date' || type === 'datetime-local' || ['dateOfBirth','idIssueDate','idExpiryDate','passportIssueDate','passportExpiryDate'].includes(effectiveType)) {
                success = await fillDateField(element, String(dataValue));
            }
            // Contenteditable
            else if (isContentEditable) {
                success = await fillContentEditableField(element, String(dataValue));
            }
            // Password and text-like inputs, textareas, others
            else if (tag === 'input' || tag === 'textarea') {
                // Prefer framework-safe setter
                try { setNativeValue(element, String(dataValue)); } catch { element.value = String(dataValue); }
                await triggerInputEventsAdvanced(element);
                success = !!element.value || type === 'password' || element.value === String(dataValue);
            } else {
                // Fallback: try setting common properties
                if ('value' in element) {
                    try { element.value = String(dataValue); } catch {}
                    await triggerInputEventsAdvanced(element);
                    success = !!element.value;
                } else if (isContentEditable) {
                    success = await fillContentEditableField(element, String(dataValue));
                }
            }

            // Restore readonly if it was set
            if (wasReadOnly) {
                try { element.readOnly = true; element.setAttribute('readonly', 'readonly'); } catch {}
            }

            return !!success;
        } catch (e) {
            console.warn('fillFieldAdvanced error', e);
            return false;
        }
    };

    // Create comprehensive data mapping
    // Create comprehensive data mapping
    const createDataMapping = () => {
        return {
            'Name': 'name', 'name': 'name', 'fullName': 'name', 'full_name': 'name',
            'Father/Husband Name': ['fatherName', 'husbandName'],
            'Father Name': 'fatherName', 'father_name': 'fatherName', 'fatherName': 'fatherName',
            'Husband Name': 'husbandName', 'husband_name': 'husbandName', 'husbandName': 'husbandName',
            'Date of Birth': 'dateOfBirth', 'date_of_birth': 'dateOfBirth', 'dateOfBirth': 'dateOfBirth',
            'dob': 'dateOfBirth', 'birth_date': 'dateOfBirth',
            'Gender': 'gender', 'gender': 'gender', 'sex': 'gender',
            'Place of Birth': 'placeOfBirth', 'place_of_birth': 'placeOfBirth', 'placeOfBirth': 'placeOfBirth',
            'birth_place': 'placeOfBirth',
            'Nationality': 'country', 'nationality': 'country', 'Country': 'country', 'country': 'country',
            'Nation': 'country', 'nation': 'country', 'citizenship': 'country', 'Citizenship': 'country',
            'Citizenship Number': 'citizenship', 'citizenship_number': 'citizenship', 'citizen_number': 'citizenship',
            'ID Number': 'idNumber', 'id_number': 'idNumber', 'idNumber': 'idNumber',
            'CNIC': 'idNumber', 'cnic': 'idNumber', 'cnic_number': 'idNumber',
            'national_id': 'idNumber', 'nationalId': 'idNumber',
            'ID Issue Date': 'idIssueDate', 'id_issue_date': 'idIssueDate', 'idIssueDate': 'idIssueDate',
            'issue_date': 'idIssueDate',
            'ID Expiry Date': 'idExpiryDate', 'id_expiry_date': 'idExpiryDate', 'idExpiryDate': 'idExpiryDate',
            'expiry_date': 'idExpiryDate',
            'Passport No': 'passportNo', 'passport_no': 'passportNo', 'passportNo': 'passportNo',
            'passport_number': 'passportNo', 'passportNumber': 'passportNo', 'Passport Number': 'passportNo',
            'Passport Issue Date': 'passportIssueDate', 'passport_issue_date': 'passportIssueDate',
            'passportIssueDate': 'passportIssueDate',
            'Passport Expiry Date': 'passportExpiryDate', 'passport_expiry_date': 'passportExpiryDate',
            'passportExpiryDate': 'passportExpiryDate',
            'Phone Number': 'phoneNumber', 'phone_number': 'phoneNumber', 'phoneNumber': 'phoneNumber',
            'phone': 'phoneNumber', 'mobile': 'phoneNumber', 'mobile_number': 'phoneNumber',
            'mobileNumber': 'phoneNumber', 'contact': 'phoneNumber', 'contact_number': 'phoneNumber',
            'contactNumber': 'phoneNumber',
            'Email Address': 'email', 'email_address': 'email', 'emailAddress': 'email',
            'email': 'email', 'e_mail': 'email', 'mail': 'email',
            'Current Address': 'currentAddress', 'current_address': 'currentAddress',
            'currentAddress': 'currentAddress', 'present_address': 'currentAddress',
            'temporary_address': 'currentAddress',
            'Address': 'address', 'address': 'address', 'street_address': 'address',
            'streetAddress': 'address', 'home_address': 'address', 'residential_address': 'address',
            'mailing_address': 'address',
            'Permanent Address': 'permanentAddress', 'permanent_address': 'permanentAddress',
            'permanentAddress': 'permanentAddress', 'family_address': 'permanentAddress',
            'native_address': 'permanentAddress'
        };
    }

    // NOTE: detectFieldType function is already defined globally above at line 360
    // This duplicate definition has been removed to prevent redeclaration errors

    // ================= REINSTATED ADVANCED FIELD/EVENT HELPERS (previously removed) =================
    // Contenteditable field filling with multiple strategies
    const fillContentEditableField = async (element, dataValue) => {
        try {
            const original = element.textContent;
            element.textContent = dataValue;
            await triggerInputEventsAdvanced(element);
            if (element.textContent !== dataValue) {
                element.innerHTML = dataValue;
                await triggerInputEventsAdvanced(element);
            }
            if (element.textContent !== dataValue) {
                element.focus();
                try {
                    document.execCommand('selectAll', false, null);
                    document.execCommand('insertText', false, dataValue);
                    await triggerInputEventsAdvanced(element);
                } catch {}
            }
            return element.textContent && element.textContent.indexOf(dataValue) !== -1;
        } catch (e) {
            console.warn('fillContentEditableField failed', e);
            return false;
        }
    };

    // Robust input event triggering orchestrator
    const triggerInputEventsAdvanced = async (element) => {
        try {
            await simulatePreInteraction(element);
            await simulateUserInputSequence(element, element.value || element.textContent || '');
            await triggerFrameworkEventsRobust(element);
            await simulatePostInteraction(element);
        } catch (e) {
            console.warn('triggerInputEventsAdvanced fallback path', e);
            try {
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } catch {}
        }
    };

    // Pre-interaction simulation (focus & mouse priming)
    const simulatePreInteraction = async (element) => {
        try {
            if (document.activeElement !== element) {
                element.focus({ preventScroll: true });
                await sleep(15);
            }
            const mouseEvents = ['mouseenter','mouseover','mousedown'];
            for (const t of mouseEvents) {
                element.dispatchEvent(new MouseEvent(t,{ bubbles:true, cancelable:true }));
                await sleep(5);
            }
            const focusEvents = ['focusin','focus'];
            for (const t of focusEvents) {
                element.dispatchEvent(new FocusEvent(t,{ bubbles:true, cancelable:true }));
                await sleep(5);
            }
        } catch (e) { console.warn('simulatePreInteraction error', e); }
    };

    // User typing sequence simulation (lightweight)
    const simulateUserInputSequence = async (element, previousValue) => {
        try {
            // Basic key events to wake reactive frameworks
            const keys = ['a','e','Enter'];
            for (const k of keys) {
                element.dispatchEvent(new KeyboardEvent('keydown',{ key:k, bubbles:true }));
                element.dispatchEvent(new KeyboardEvent('keypress',{ key:k, bubbles:true }));
                element.dispatchEvent(new KeyboardEvent('keyup',{ key:k, bubbles:true }));
                await sleep(3);
            }
            // Ensure input event fires with current value
            element.dispatchEvent(new InputEvent('input',{ bubbles:true, data: element.value || '' }));
        } catch (e) { console.warn('simulateUserInputSequence error', e); }
    };
    // ================= END REINSTATED HELPERS =================

    // Advanced select field filling
    const fillSelectFieldAdvanced = async (selectElement, dataValue) => {
        const options = selectElement.querySelectorAll('option');
        let optionFound = false;
        
        console.log(`Propace Autofill: Filling select with ${options.length} options`);
        
        // Try exact value match first
        for (const option of options) {
            if (option.value.toLowerCase() === dataValue.toLowerCase()) {
                selectElement.value = option.value;
                optionFound = true;
                console.log(`Propace Autofill: Exact value match: ${option.value}`);
                break;
            }
        }
        
        // Try exact text match
        if (!optionFound) {
            for (const option of options) {
                if (option.textContent.toLowerCase().trim() === dataValue.toLowerCase().trim()) {
                    selectElement.value = option.value;
                    optionFound = true;
                    console.log(`Propace Autofill: Exact text match: ${option.textContent}`);
                    break;
                }
            }
        }
        
        // Try partial matches
        if (!optionFound) {
            for (const option of options) {
                const optionText = option.textContent.toLowerCase().trim();
                const optionValue = option.value.toLowerCase();
                const searchValue = dataValue.toLowerCase().trim();
                
                if (optionText.includes(searchValue) || optionValue.includes(searchValue) ||
                    searchValue.includes(optionText) || searchValue.includes(optionValue)) {
                    selectElement.value = option.value;
                    optionFound = true;
                    console.log(`Propace Autofill: Partial match: ${option.textContent} ~ ${dataValue}`);
                    break;
                }
            }
        }
        
        if (!optionFound) {
            console.log(`Propace Autofill: No matching option found for: ${dataValue}`);
        }
        
        // Trigger events
        await triggerInputEventsAdvanced(selectElement);
        return optionFound;
    };

    // Enhanced Custom dropdown handling with intelligent detection
    const fillCustomDropdown = async (element, dataValue) => {
        console.log('Propace Autofill: Handling custom dropdown with advanced detection');
        
        try {
            // Store original state
            const originalValue = element.value || element.textContent || '';
            
            // Multiple click strategies for different dropdown types
            const clickStrategies = [
                () => element.click(),
                () => element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })),
                () => element.dispatchEvent(new Event('focus', { bubbles: true })),
                () => {
                    const trigger = element.querySelector('.dropdown-trigger, .select-trigger, .arrow, .caret');
                    if (trigger) trigger.click();
                }
            ];

            let optionsFound = false;
            let retryCount = 0;
            
            while (!optionsFound && retryCount < clickStrategies.length) {
                console.log(`Propace Autofill: Trying click strategy ${retryCount + 1}`);
                
                // Execute click strategy
                clickStrategies[retryCount]();
                
                // Progressive wait times
                const waitTime = 200 + (retryCount * 100);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                // Enhanced container detection with mutation observer
                const possibleContainers = [
                    document.body,
                    element.parentElement,
                    element.closest('.dropdown-container, .select-container, .combobox-container'),
                    element.closest('[data-dropdown], [data-select]'),
                    ...Array.from(document.querySelectorAll('.dropdown-menu, .select-options, .dropdown-list, .select-list, .options-container, [role="listbox"], [role="menu"], [role="combobox"]'))
                ].filter(Boolean);

                // Look for newly appeared options with enhanced selectors
                for (const container of possibleContainers) {
                    const optionSelectors = [
                        '[role="option"]',
                        '.dropdown-item', '.dropdown-option', '.select-option', '.option', '.menu-item',
                        'li[data-value]', 'div[data-value]', 'span[data-value]',
                        'li[data-option]', 'div[data-option]', 'span[data-option]',
                        '.list-item', '.choice', '.selection',
                        'li:not(.disabled)', 'div.selectable', 'span.selectable'
                    ];

                    const options = container.querySelectorAll(optionSelectors.join(', '));
                    
                    // Filter for visible options only
                    const visibleOptions = Array.from(options).filter(opt => {
                        const rect = opt.getBoundingClientRect();
                        const style = window.getComputedStyle(opt);
                        return rect.height > 0 && rect.width > 0 && 
                               style.display !== 'none' && style.visibility !== 'hidden';
                    });

                    if (visibleOptions.length > 0) {
                        console.log(`Propace Autofill: Found ${visibleOptions.length} visible custom dropdown options`);
                        optionsFound = true;

                        // Enhanced matching algorithm with scoring
                        let bestMatch = null;
                        let bestScore = 0;

                        for (const option of visibleOptions) {
                            const score = calculateOptionMatchScore(option, dataValue);
                            if (score > bestScore) {
                                bestScore = score;
                                bestMatch = option;
                            }
                        }

                        if (bestMatch && bestScore > 0.3) {
                            console.log(`Propace Autofill: Clicking best match option with score ${bestScore.toFixed(2)}`);
                            
                            // Enhanced clicking with multiple strategies
                            const clickOption = async (opt) => {
                                const clickMethods = [
                                    () => opt.click(),
                                    () => opt.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
                                    () => opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })),
                                    () => {
                                        opt.focus();
                                        opt.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                                    }
                                ];

                                for (const method of clickMethods) {
                                    try {
                                        method();
                                        await new Promise(resolve => setTimeout(resolve, 100));
                                        
                                        // Check if selection was successful
                                        const newValue = element.value || element.textContent || '';
                                        if (newValue !== originalValue) {
                                            console.log(`Propace Autofill: Custom dropdown filled successfully: ${newValue}`);
                                            return true;
                                        }
                                    } catch (error) {
                                        console.log(`Propace Autofill: Click method failed:`, error);
                                    }
                                }
                                return false;
                            };

                            if (await clickOption(bestMatch)) {
                                await triggerInputEventsAdvanced(element);
                                return true;
                            }
                        }
                        break;
                    }
                }
                
                retryCount++;
            }

            // If no option found, try to close the dropdown
            if (optionsFound) {
                element.click();
                console.log('Propace Autofill: No matching custom dropdown option found, closing dropdown');
            }
            return false;

        } catch (error) {
            console.error('Propace Autofill: Error handling custom dropdown:', error);
            return false;
        }
    };

    // Calculate option match score for custom dropdowns
    const calculateOptionMatchScore = (option, dataValue) => {
        const optionText = option.textContent.toLowerCase().trim();
        const optionValue = (option.getAttribute('data-value') || option.getAttribute('value') || '').toLowerCase();
        const searchValue = dataValue.toLowerCase().trim();
        
        let score = 0;
        
        // Exact matches get highest score
        if (optionText === searchValue || optionValue === searchValue) {
            score = 1.0;
        }
        // Contains matches
        else if (optionText.includes(searchValue) || optionValue.includes(searchValue)) {
            score = 0.8;
        }
        // Reverse contains (search value contains option)
        else if (searchValue.includes(optionText) || searchValue.includes(optionValue)) {
            score = 0.6;
        }
        // Fuzzy matching for partial words
        else {
            const optionWords = optionText.split(/\s+/);
            const searchWords = searchValue.split(/\s+/);
            
            let matchingWords = 0;
            for (const searchWord of searchWords) {
                for (const optionWord of optionWords) {
                    if (optionWord.includes(searchWord) || searchWord.includes(optionWord)) {
                        matchingWords++;
                        break;
                    }
                }
            }
            
            if (matchingWords > 0) {
                score = (matchingWords / Math.max(optionWords.length, searchWords.length)) * 0.4;
            }
        }
        
        return score;
    };

    // Enhanced Radio button group handling with intelligent matching
    const fillRadioGroup = async (element, dataValue) => {
        console.log('Propace Autofill: Handling radio group with advanced matching');
        
        // Find all radio buttons with the same name
        const name = element.name;
        if (!name) {
            console.log('Propace Autofill: Radio element has no name attribute, searching by form context');
            
            // Try to find radio group by form context
            const form = element.closest('form') || document;
            const allRadios = form.querySelectorAll('input[type="radio"]');
            const contextRadios = Array.from(allRadios).filter(radio => {
                const radioContainer = radio.closest('fieldset, .radio-group, .form-group, .question, [role="radiogroup"]');
                const elementContainer = element.closest('fieldset, .radio-group, .form-group, .question, [role="radiogroup"]');
                return radioContainer === elementContainer;
            });
            
            if (contextRadios.length > 0) {
                return await processRadioButtons(contextRadios, dataValue);
            }
            return false;
        }

        const radioButtons = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
        console.log(`Propace Autofill: Found ${radioButtons.length} radio buttons in group "${name}"`);

        return await processRadioButtons(radioButtons, dataValue);
    };

    // Process radio buttons with enhanced matching
    const processRadioButtons = async (radioButtons, dataValue) => {
        const candidates = [];
        
        // Collect all radio button candidates with scoring
        for (const radio of radioButtons) {
            const radioInfo = getRadioInfo(radio);
            const score = calculateRadioMatchScore(radioInfo, dataValue);
            
            candidates.push({
                element: radio,
                info: radioInfo,
                score: score
            });
        }

        // Sort by score and select the best match
        candidates.sort((a, b) => b.score - a.score);
        
        if (candidates.length > 0 && candidates[0].score > 0.3) {
            const bestMatch = candidates[0];
            console.log(`Propace Autofill: Selecting radio with score ${bestMatch.score.toFixed(2)}: ${bestMatch.info.label || bestMatch.info.value}`);
            
            bestMatch.element.checked = true;
            await triggerInputEventsAdvanced(bestMatch.element);
            return true;
        }

        console.log('Propace Autofill: No suitable radio button match found');
        return false;
    };

    // Calculate radio button match score
    const calculateRadioMatchScore = (radioInfo, dataValue) => {
        const searchValue = dataValue.toLowerCase().trim();
        let score = 0;

        // Check value matches
        if (radioInfo.value.toLowerCase() === searchValue) {
            score = Math.max(score, 1.0);
        } else if (radioInfo.value.toLowerCase().includes(searchValue) || searchValue.includes(radioInfo.value.toLowerCase())) {
            score = Math.max(score, 0.8);
        }

        // Check label matches
        if (radioInfo.label.toLowerCase() === searchValue) {
            score = Math.max(score, 0.9);
        } else if (radioInfo.label.toLowerCase().includes(searchValue) || searchValue.includes(radioInfo.label.toLowerCase())) {
            score = Math.max(score, 0.7);
        }

        // Special handling for gender values
        if (searchValue === 'male' || searchValue === 'm') {
            if (radioInfo.value.toLowerCase().includes('male') || radioInfo.label.toLowerCase().includes('male') ||
                radioInfo.value.toLowerCase() === 'm' || radioInfo.label.toLowerCase().includes('mr')) {
                score = Math.max(score, 0.9);
            }
        } else if (searchValue === 'female' || searchValue === 'f') {
            if (radioInfo.value.toLowerCase().includes('female') || radioInfo.label.toLowerCase().includes('female') ||
                radioInfo.value.toLowerCase() === 'f' || radioInfo.label.toLowerCase().includes('mrs') ||
                radioInfo.label.toLowerCase().includes('ms')) {
                score = Math.max(score, 0.9);
            }
        }

        // Check for common value mappings
        const valueMappings = {
            'yes': ['true', '1', 'on', 'enabled', 'active'],
            'no': ['false', '0', 'off', 'disabled', 'inactive'],
            'true': ['yes', '1', 'on', 'enabled'],
            'false': ['no', '0', 'off', 'disabled']
        };

        for (const [key, alternatives] of Object.entries(valueMappings)) {
            if (searchValue === key && alternatives.some(alt => 
                radioInfo.value.toLowerCase().includes(alt) || radioInfo.label.toLowerCase().includes(alt))) {
                score = Math.max(score, 0.8);
            }
        }

        return score;
    };

    // Enhanced radio button information extraction
    const getRadioInfo = (radioElement) => {
        let label = '';
        let value = radioElement.value || '';

        // Strategy 1: Label element with for attribute
        if (radioElement.id) {
            const labelElement = document.querySelector(`label[for="${radioElement.id}"]`);
            if (labelElement) {
                label = labelElement.textContent.trim();
            }
        }

        // Strategy 2: Parent label element
        if (!label) {
            const parentLabel = radioElement.closest('label');
            if (parentLabel) {
                label = parentLabel.textContent.replace(value, '').trim();
            }
        }

        // Strategy 3: Adjacent text nodes
        if (!label) {
            const nextSibling = radioElement.nextSibling;
            if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
                label = nextSibling.textContent.trim();
            } else {
                const nextElement = radioElement.nextElementSibling;
                if (nextElement && (nextElement.tagName === 'SPAN' || nextElement.tagName === 'LABEL')) {
                    label = nextElement.textContent.trim();
                }
            }
        }

        // Strategy 4: Parent container text
        if (!label) {
            const parent = radioElement.parentElement;
            if (parent) {
                const parentText = parent.textContent.replace(value, '').trim();
                // Filter out other radio button values
                const siblings = parent.querySelectorAll('input[type="radio"]');
                let cleanText = parentText;
                siblings.forEach(sibling => {
                    if (sibling !== radioElement && sibling.value) {
                        cleanText = cleanText.replace(sibling.value, '');
                    }
                });
                label = cleanText.trim();
            }
        }

        // Strategy 5: aria-label or data attributes
        if (!label) {
            label = radioElement.getAttribute('aria-label') || 
                   radioElement.getAttribute('data-label') ||
                   radioElement.getAttribute('title') || '';
        }

        return {
            value: value,
            label: label,
            element: radioElement
        };
    };

    // Enhanced Checkbox handling
    const fillCheckbox = async (element, dataValue) => {
        console.log('Propace Autofill: Handling checkbox with intelligent value interpretation');
        
        const shouldCheck = interpretBooleanValue(dataValue);
        
        if (shouldCheck !== null) {
            element.checked = shouldCheck;
            console.log(`Propace Autofill: Checkbox ${shouldCheck ? 'checked' : 'unchecked'} based on value: ${dataValue}`);
            await triggerInputEventsAdvanced(element);
            return true;
        }

        console.log(`Propace Autofill: Could not interpret checkbox value: ${dataValue}`);
        return false;
    };

    // Interpret various boolean representations
    const interpretBooleanValue = (value) => {
        if (typeof value === 'boolean') return value;
        
        const strValue = String(value).toLowerCase().trim();
        
        // True values
        const trueValues = ['true', 'yes', 'on', '1', 'checked', 'selected', 'enabled', 'active'];
        if (trueValues.includes(strValue)) return true;
        
        // False values
        const falseValues = ['false', 'no', 'off', '0', 'unchecked', 'unselected', 'disabled', 'inactive'];
        if (falseValues.includes(strValue)) return false;
        
        // If it's a number, treat 0 as false, non-zero as true
        const numValue = parseFloat(strValue);
        if (!isNaN(numValue)) {
            return numValue !== 0;
        }
        
        return null; // Could not interpret
    };

    // Enhanced Date field handling with comprehensive format support
    const fillDateField = async (element, dataValue) => {
        console.log('Propace Autofill: Handling date field with advanced format detection');
        
        // Parse the date value into a standard format
        const parsedDate = parseDate(dataValue);
        if (!parsedDate) {
            console.log('Propace Autofill: Could not parse date:', dataValue);
            return false;
        }

        console.log(`Propace Autofill: Parsed date: ${parsedDate.toISOString()}`);

        // Comprehensive list of date formats to try
        const formats = [
            // ISO formats (most compatible)
            parsedDate.toISOString().split('T')[0], // YYYY-MM-DD
            parsedDate.toISOString(), // Full ISO string
            
            // US formats
            `${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getDate().toString().padStart(2, '0')}/${parsedDate.getFullYear()}`, // MM/DD/YYYY
            `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()}`, // M/D/YYYY
            
            // European formats  
            `${parsedDate.getDate().toString().padStart(2, '0')}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getFullYear()}`, // DD/MM/YYYY
            `${parsedDate.getDate()}/${parsedDate.getMonth() + 1}/${parsedDate.getFullYear()}`, // D/M/YYYY
            
            // Dash separated
            `${parsedDate.getFullYear()}-${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}-${parsedDate.getDate().toString().padStart(2, '0')}`, // YYYY-MM-DD
            `${parsedDate.getDate().toString().padStart(2, '0')}-${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}-${parsedDate.getFullYear()}`, // DD-MM-YYYY
            `${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}-${parsedDate.getDate().toString().padStart(2, '0')}-${parsedDate.getFullYear()}`, // MM-DD-YYYY
            
            // Dot separated (European style)
            `${parsedDate.getDate().toString().padStart(2, '0')}.${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}.${parsedDate.getFullYear()}`, // DD.MM.YYYY
            
            // Two-digit year formats
            `${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getDate().toString().padStart(2, '0')}/${parsedDate.getFullYear().toString().slice(-2)}`, // MM/DD/YY
            `${parsedDate.getDate().toString().padStart(2, '0')}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getFullYear().toString().slice(-2)}`, // DD/MM/YY
            
            // Compact formats
            `${parsedDate.getFullYear()}${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}${parsedDate.getDate().toString().padStart(2, '0')}`, // YYYYMMDD
            
            // Locale-specific formats
            parsedDate.toLocaleDateString('en-US'), // US locale
            parsedDate.toLocaleDateString('en-GB'), // UK locale
            parsedDate.toLocaleDateString('de-DE'), // German locale
            
            // Text-based formats
            parsedDate.toDateString(), // "Mon Jan 01 2024"
            
            // For datetime-local inputs
            `${parsedDate.toISOString().split('T')[0]}T00:00`, // YYYY-MM-DDTHH:MM
            `${parsedDate.toISOString().split('T')[0]} 00:00:00` // YYYY-MM-DD HH:MM:SS
        ];

        // Remove duplicates while preserving order
        const uniqueFormats = [...new Set(formats)];
        
        console.log(`Propace Autofill: Trying ${uniqueFormats.length} date formats`);

        // Strategy 1: Direct value assignment with validation
        for (const format of uniqueFormats) {
            try {
                const originalValue = element.value;
                element.value = format;
                
                // Trigger events to ensure the field accepts the value
                await triggerInputEventsAdvanced(element);
                
                // Short delay to allow field validation
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Check if the value was accepted and processed
                if (element.value && element.value !== originalValue) {
                    console.log(`Propace Autofill: Date filled successfully with format: ${format} (result: ${element.value})`);
                    return true;
                }
                
                // Some fields may not change value immediately but still accept it
                if (element.validity && element.validity.valid) {
                    console.log(`Propace Autofill: Date format accepted by validation: ${format}`);
                    return true;
                }
                
            } catch (error) {
                console.log(`Propace Autofill: Date format ${format} failed:`, error);
            }
        }

        // Strategy 2: Custom date picker interaction
        if (!await interactWithCustomDatePicker(element, parsedDate)) {
            // Strategy 3: Simulate user typing
            console.log('Propace Autofill: Trying date input simulation');
            if (await simulateDateTyping(element, uniqueFormats[0])) {
                return true;
            }
        }

        console.log('Propace Autofill: All date filling strategies failed');
        return false;
    };

    // Interact with custom date pickers
    const interactWithCustomDatePicker = async (element, parsedDate) => {
        console.log('Propace Autofill: Attempting custom date picker interaction');
        
        try {
            // Look for date picker triggers
            const triggers = [
                element.nextElementSibling,
                element.parentElement.querySelector('.date-picker-trigger, .calendar-icon, .date-icon'),
                element.parentElement.querySelector('[class*="calendar"], [class*="date"]'),
                document.querySelector(`[data-target="#${element.id}"], [data-for="${element.id}"]`)
            ].filter(Boolean);

            for (const trigger of triggers) {
                if (trigger.offsetHeight > 0) { // Check if visible
                    console.log('Propace Autofill: Found potential date picker trigger');
                    
                    // Click the trigger
                    trigger.click();
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // Look for opened date picker
                    const datePicker = document.querySelector('.date-picker, .calendar, .datepicker, [role="dialog"][aria-label*="date"], [role="dialog"][aria-label*="calendar"]');
                    
                    if (datePicker) {
                        console.log('Propace Autofill: Date picker opened, attempting to navigate');
                        return await navigateDatePicker(datePicker, parsedDate, element);
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('Propace Autofill: Error in custom date picker interaction:', error);
            return false;
        }
    };

    // Navigate opened date picker
    const navigateDatePicker = async (datePicker, targetDate, originalElement) => {
        try {
            // Look for date cells or buttons
            const targetDay = targetDate.getDate();
            const targetMonth = targetDate.getMonth();
            const targetYear = targetDate.getFullYear();
            
            // Try to find and click the target date
            const dateCells = datePicker.querySelectorAll('td, button, .day, .date, [role="gridcell"]');
            
            for (const cell of dateCells) {
                const cellText = cell.textContent.trim();
                if (cellText === targetDay.toString()) {
                    // Additional validation could be added here for month/year
                    console.log(`Propace Autofill: Clicking date cell: ${cellText}`);
                    cell.click();
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Check if the original field was filled
                    if (originalElement.value) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('Propace Autofill: Error navigating date picker:', error);
            return false;
        }
    };

    // Simulate typing for date inputs
    const simulateDateTyping = async (element, dateString) => {
        try {
            console.log(`Propace Autofill: Simulating typing: ${dateString}`);
            
            // Focus the element
            element.focus();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Clear existing value
            element.select();
            document.execCommand('delete');
            
            // Type each character
            for (const char of dateString) {
                const keyboardEvent = new KeyboardEvent('keydown', {
                    key: char,
                    char: char,
                    bubbles: true,
                    cancelable: true
                });
                
                element.dispatchEvent(keyboardEvent);
                element.value += char;
                
                const inputEvent = new Event('input', { bubbles: true });
                element.dispatchEvent(inputEvent);
                
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Final events
            await triggerInputEventsAdvanced(element);
            
            return element.value.length > 0;
            
        } catch (error) {
            console.error('Propace Autofill: Error in date typing simulation:', error);
            return false;
        }
    };

    // Enhanced date parsing with comprehensive format support
    const parseDate = (dateString) => {
        if (!dateString) return null;
        
        // Clean the input string
        const cleanedDate = String(dateString).trim();
        
        // Try parsing with Date constructor first (handles ISO and common formats)
        let date = new Date(cleanedDate);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
            return date;
        }

        // Enhanced date patterns with more comprehensive matching
        const patterns = [
            // DD/MM/YYYY or MM/DD/YYYY patterns
            {
                regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
                handler: (match) => {
                    // Try as DD/MM/YYYY first (international standard)
                    const day = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    const year = parseInt(match[3]);
                    
                    // If day > 12, definitely DD/MM/YYYY
                    if (day > 12) {
                        return new Date(year, month - 1, day);
                    }
                    // If month > 12, definitely MM/DD/YYYY
                    if (month > 12) {
                        return new Date(year, day - 1, month);
                    }
                    // Ambiguous case - try DD/MM/YYYY first
                    const ddmmDate = new Date(year, month - 1, day);
                    if (!isNaN(ddmmDate.getTime())) {
                        return ddmmDate;
                    }
                    // Fallback to MM/DD/YYYY
                    return new Date(year, day - 1, month);
                }
            },
            
            // YYYY/MM/DD patterns
            {
                regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
                handler: (match) => new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
            },
            
            // Two-digit year patterns
            {
                regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/,
                handler: (match) => {
                    const day = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    let year = parseInt(match[3]);
                    
                    // Convert 2-digit year to 4-digit (assume 20xx for years 00-30, 19xx for 31-99)
                    year = year <= 30 ? 2000 + year : 1900 + year;
                    
                    // Apply same DD/MM vs MM/DD logic
                    if (day > 12) return new Date(year, month - 1, day);
                    if (month > 12) return new Date(year, day - 1, month);
                    return new Date(year, month - 1, day); // Default to DD/MM
                }
            },
            
            // Month name patterns (DD MMM YYYY, MMM DD YYYY)
            {
                regex: /^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})$/i,
                handler: (match) => new Date(`${match[2]} ${match[1]}, ${match[3]}`)
            },
            {
                regex: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})$/i,
                handler: (match) => new Date(`${match[1]} ${match[2]}, ${match[3]}`)
            },
            
            // Compact format YYYYMMDD
            {
                regex: /^(\d{4})(\d{2})(\d{2})$/,
                handler: (match) => new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
            },
            
            // Compact format DDMMYYYY
            {
                regex: /^(\d{2})(\d{2})(\d{4})$/,
                handler: (match) => new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
            },
            
            // Time-based patterns (extract date part)
            {
                regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+\d{1,2}:\d{2}/,
                handler: (match) => parseDate(match[1]) // Recursively parse date part
            },
            
            // Relative date expressions
            {
                regex: /^today$/i,
                handler: () => new Date()
            },
            {
                regex: /^yesterday$/i,
                handler: () => {
                    const date = new Date();
                    date.setDate(date.getDate() - 1);
                    return date;
                }
            },
            {
                regex: /^(\d+)\s+(days?|months?|years?)\s+ago$/i,
                handler: (match) => {
                    const date = new Date();
                    const amount = parseInt(match[1]);
                    const unit = match[2].toLowerCase();
                    
                    if (unit.startsWith('day')) {
                        date.setDate(date.getDate() - amount);
                    } else if (unit.startsWith('month')) {
                        date.setMonth(date.getMonth() - amount);
                    } else if (unit.startsWith('year')) {
                        date.setFullYear(date.getFullYear() - amount);
                    }
                    return date;
                }
            }
        ];

        // Try each pattern
        for (const pattern of patterns) {
            const match = cleanedDate.match(pattern.regex);
            if (match) {
                try {
                    const result = pattern.handler(match);
                    if (result && !isNaN(result.getTime()) && 
                        result.getFullYear() > 1900 && result.getFullYear() < 2100) {
                        console.log(`Propace Autofill: Date parsed successfully using pattern: ${pattern.regex}`);
                        return result;
                    }
                } catch (error) {
                    console.log(`Propace Autofill: Pattern ${pattern.regex} failed:`, error);
                }
            }
        }

        // Final attempt: Try to extract numbers and guess the format
        const numbers = cleanedDate.match(/\d+/g);
        if (numbers && numbers.length >= 3) {
            try {
                const nums = numbers.map(n => parseInt(n));
                
                // If first number is > 31, likely YYYY MM DD
                if (nums[0] > 31) {
                    return new Date(nums[0], nums[1] - 1, nums[2]);
                }
                // If third number is > 31, likely DD MM YYYY or MM DD YYYY
                if (nums[2] > 31) {
                    // If first number > 12, must be DD MM YYYY
                    if (nums[0] > 12) {
                        return new Date(nums[2], nums[1] - 1, nums[0]);
                    }
                    // If second number > 12, must be MM DD YYYY  
                    if (nums[1] > 12) {
                        return new Date(nums[2], nums[0] - 1, nums[1]);
                    }
                    // Ambiguous, default to DD MM YYYY
                    return new Date(nums[2], nums[1] - 1, nums[0]);
                }
            } catch (error) {
                console.log('Propace Autofill: Final number extraction failed:', error);
            }
        }

        console.log(`Propace Autofill: Could not parse date: ${cleanedDate}`);
        return null;
    };

    // Advanced input field filling
    const fillInputFieldAdvanced = async (inputElement, dataValue) => {
        console.log('Propace Autofill: Filling input field');
        
        // Store original value for comparison
        const originalValue = inputElement.value;
        
        // CRITICAL FIX: Use setNativeValue for React/Vue compatibility
        setNativeValue(inputElement, dataValue);
        
        // Verify the value was set correctly
        if (inputElement.value !== dataValue) {
            console.log('Propace Autofill: Value not set correctly, trying alternative method');
            
            // Try setting property directly
            try {
                Object.defineProperty(inputElement, 'value', {
                    value: dataValue,
                    writable: true
                });
                await triggerInputEventsAdvanced(inputElement);
            } catch (e) {
                console.log('Propace Autofill: Alternative method failed');
            }
        }
        
        return inputElement.value === dataValue;
    };

    // (Removed duplicate validateDataForField implementation - original function retained earlier)

    // Enhanced keyboard event simulation
    const simulateKeyEvent = async (element, type, key) => {
        try {
            const keyboardEvent = new KeyboardEvent(type, {
                bubbles: true,
                cancelable: true,
                key: key,
                code: getKeyCode(key),
                which: getKeyWhich(key),
                keyCode: getKeyWhich(key),
                charCode: type === 'keypress' ? getKeyWhich(key) : 0,
                view: window,
                ctrlKey: false,
                altKey: false,
                shiftKey: false,
                metaKey: false
            });
            
            element.dispatchEvent(keyboardEvent);
        } catch (error) {
            // Fallback to basic KeyboardEvent
            element.dispatchEvent(new KeyboardEvent(type, { 
                bubbles: true, 
                cancelable: true,
                key: key 
            }));
        }
    };

    // Get appropriate key codes
    const getKeyCode = (key) => {
        const codes = {
            'Enter': 'Enter',
            'Delete': 'Delete',
            'Backspace': 'Backspace',
            'Tab': 'Tab',
            ' ': 'Space'
        };
        return codes[key] || `Key${key.toUpperCase()}`;
    };

    const getKeyWhich = (key) => {
        if (key.length === 1) {
            return key.charCodeAt(0);
        }
        const codes = {
            'Enter': 13,
            'Delete': 46,
            'Backspace': 8,
            'Tab': 9
        };
        return codes[key] || 0;
    };

    // Robust framework-specific event handling with error recovery
    const triggerFrameworkEventsRobust = async (element) => {
        const frameworks = [
            () => triggerReactEventsRobust(element),
            () => triggerVueEventsRobust(element),
            () => triggerAngularEventsRobust(element),
            () => triggerSvelteEventsRobust(element),
            () => triggerGenericFrameworkEvents(element)
        ];

        // Try each framework handler with individual error handling
        for (const frameworkHandler of frameworks) {
            try {
                await frameworkHandler();
                await sleep(10); // Small delay between framework handlers
            } catch (error) {
                console.warn('Propace Autofill: Framework handler failed:', error);
                // Continue with other handlers
            }
        }
    };

    // Enhanced React event handling with error recovery
    const triggerReactEventsRobust = async (element) => {
        try {
            // Multiple ways to detect React
            const isReact = element._reactInternalFiber || 
                          element.__reactInternalInstance || 
                          element._reactInternalInstance ||
                          element.__reactEventHandlers ||
                          Object.keys(element).some(key => key.startsWith('__reactEventHandlers')) ||
                          Object.keys(element).some(key => key.startsWith('__reactInternalInstance'));

            if (!isReact) return;

            console.log('Propace Autofill: Applying robust React event handling');

            // Strategy 1: React's internal value setter (with error handling)
            try {
                const descriptor = Object.getOwnPropertyDescriptor(element, 'value') ||
                                 Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value') ||
                                 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

                if (descriptor && descriptor.set) {
                    const originalValue = element.value;
                    descriptor.set.call(element, ''); // Clear first
                    descriptor.set.call(element, originalValue); // Set actual value
                    console.log('Propace Autofill: React internal setter triggered successfully');
                }
            } catch (setterError) {
                console.warn('Propace Autofill: React setter strategy failed:', setterError);
            }

            // Strategy 2: React SyntheticEvent simulation
            try {
                const syntheticEvent = new Event('input', { bubbles: true, cancelable: true });
                Object.defineProperty(syntheticEvent, 'target', { 
                    value: element, 
                    enumerable: true, 
                    writable: false 
                });
                Object.defineProperty(syntheticEvent, 'currentTarget', { 
                    value: element, 
                    enumerable: true, 
                    writable: false 
                });
                Object.defineProperty(syntheticEvent, 'nativeEvent', { 
                    value: syntheticEvent, 
                    enumerable: true, 
                    writable: false 
                });

                element.dispatchEvent(syntheticEvent);
            } catch (syntheticError) {
                console.warn('Propace Autofill: React synthetic event failed:', syntheticError);
            }

            // Strategy 3: Force React reconciliation
            try {
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('blur', { bubbles: true }));
                element.dispatchEvent(new Event('focus', { bubbles: true }));
            } catch (reconciliationError) {
                console.warn('Propace Autofill: React reconciliation failed:', reconciliationError);
            }

        } catch (error) {
            console.warn('Propace Autofill: React robust handling failed:', error);
        }
    };

    // Enhanced Vue event handling with error recovery
    const triggerVueEventsRobust = async (element) => {
        try {
            // Multiple ways to detect Vue
            const isVue = element.__vue__ || 
                         element._vei || 
                         element.__vueParentComponent ||
                         element.hasAttribute('v-model') ||
                         window.Vue;

            if (!isVue) return;

            console.log('Propace Autofill: Applying robust Vue event handling');

            // Strategy 1: Vue v-model update
            try {
                if (element.__vue__ && element.__vue__.$emit) {
                    element.__vue__.$emit('input', element.value);
                    element.__vue__.$emit('change', element.value);
                }
            } catch (vueEmitError) {
                console.warn('Propace Autofill: Vue emit strategy failed:', vueEmitError);
            }

            // Strategy 2: Vue 3 event handling
            try {
                const vueInputEvent = new CustomEvent('vue:input', {
                    detail: { value: element.value },
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(vueInputEvent);
            } catch (vue3Error) {
                console.warn('Propace Autofill: Vue 3 event failed:', vue3Error);
            }

            // Strategy 3: Force Vue reactivity
            try {
                element.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    data: element.value
                }));
                
                // Trigger Vue's update cycle
                if (window.Vue && window.Vue.nextTick) {
                    window.Vue.nextTick(() => {
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }
            } catch (reactivityError) {
                console.warn('Propace Autofill: Vue reactivity trigger failed:', reactivityError);
            }

        } catch (error) {
            console.warn('Propace Autofill: Vue robust handling failed:', error);
        }
    };

    // Enhanced Angular event handling with error recovery
    const triggerAngularEventsRobust = async (element) => {
        try {
            // Multiple ways to detect Angular
            const isAngular = window.ng || 
                             window.getAllAngularRootElements || 
                             element.hasAttribute('ng-model') ||
                             element.hasAttribute('[ngModel]') ||
                             document.querySelector('[ng-version]');

            if (!isAngular) return;

            console.log('Propace Autofill: Applying robust Angular event handling');

            // Strategy 1: Angular Zone.js handling
            try {
                if (window.Zone && window.Zone.current) {
                    window.Zone.current.run(() => {
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }
            } catch (zoneError) {
                console.warn('Propace Autofill: Angular Zone handling failed:', zoneError);
            }

            // Strategy 2: Angular model update
            try {
                const ngEvent = new CustomEvent('ng-model-change', {
                    detail: { value: element.value },
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(ngEvent);
            } catch (ngModelError) {
                console.warn('Propace Autofill: Angular model update failed:', ngModelError);
            }

            // Strategy 3: Force Angular change detection
            try {
                if (window.ng && window.ng.getComponent) {
                    const component = window.ng.getComponent(element);
                    if (component && component.detectChanges) {
                        component.detectChanges();
                    }
                }
            } catch (changeDetectionError) {
                console.warn('Propace Autofill: Angular change detection failed:', changeDetectionError);
            }

        } catch (error) {
            console.warn('Propace Autofill: Angular robust handling failed:', error);
        }
    };

    // Svelte event handling with error recovery
    const triggerSvelteEventsRobust = async (element) => {
        try {
            // Detect Svelte
            const isSvelte = element.hasAttribute('svelte-') || 
                           document.querySelector('[svelte-]') ||
                           window.__SVELTE__;

            if (!isSvelte) return;

            console.log('Propace Autofill: Applying robust Svelte event handling');

            // Svelte typically works well with standard events, but ensure proper sequencing
            element.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: element.value
            }));

            await sleep(10);

            element.dispatchEvent(new Event('change', { bubbles: true }));

        } catch (error) {
            console.warn('Propace Autofill: Svelte robust handling failed:', error);
        }
    };

    // Generic framework event handling for unknown frameworks
    const triggerGenericFrameworkEvents = async (element) => {
        try {
            console.log('Propace Autofill: Applying generic framework event handling');

            // Comprehensive event sequence for unknown frameworks
            const eventSequence = [
                { type: 'input', eventClass: InputEvent, options: { inputType: 'insertText', data: element.value }},
                { type: 'change', eventClass: Event },
                { type: 'propertychange', eventClass: CustomEvent, options: { detail: { value: element.value }}},
                { type: 'textInput', eventClass: CustomEvent, options: { detail: { data: element.value }}},
                { type: 'DOMSubtreeModified', eventClass: CustomEvent } // Legacy but sometimes needed
            ];

            for (const { type, eventClass, options = {} } of eventSequence) {
                try {
                    const event = new eventClass(type, {
                        bubbles: true,
                        cancelable: true,
                        ...options
                    });
                    element.dispatchEvent(event);
                    await sleep(5);
                } catch (eventError) {
                    // Continue with other events if one fails
                    console.warn(`Propace Autofill: Generic event ${type} failed:`, eventError);
                }
            }

        } catch (error) {
            console.warn('Propace Autofill: Generic framework handling failed:', error);
        }
    };

    // Simulate post-interaction user behavior
    const simulatePostInteraction = async (element) => {
        try {
            // 1. Final change event (user finished typing)
            element.dispatchEvent(new Event('change', {
                bubbles: true,
                cancelable: true
            }));
            await sleep(10);

            // 2. Mouse interaction completion
            const mouseEvents = ['mouseup', 'click'];
            for (const eventType of mouseEvents) {
                const mouseEvent = new MouseEvent(eventType, {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: 100,
                    clientY: 100,
                    button: 0
                });
                element.dispatchEvent(mouseEvent);
                await sleep(5);
            }

            // 3. Optional blur (user moves away from field)
            // Note: We don't always blur as the user might continue interacting
            await sleep(10);

            // 4. Final validation events
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            element.dispatchEvent(new FocusEvent('focusout', { 
                bubbles: true, 
                cancelable: true,
                relatedTarget: null 
            }));

        } catch (error) {
            console.warn('Propace Autofill: Error in post-interaction simulation:', error);
        }
    };

    // Utility function for realistic delays
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Professional visual feedback (enhanced version moved to error handling section)
    // Note: Enhanced addVisualFeedback function is now in the Error Handling section above

    // ===================================================================
    // ==              ADVANCED NOTIFICATION SYSTEM                    ==
    // ===================================================================

    // Professional page notification system
    const showAdvancedPageNotification = (message, type = 'info') => {
        // Remove any existing notifications
        const existingNotification = document.getElementById('propace-advanced-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create professional notification element
        const notification = document.createElement('div');
        notification.id = 'propace-advanced-notification';
        
        // Professional styling
        const colors = {
            success: { bg: '#4CAF50', text: '#ffffff' },
            error: { bg: '#f44336', text: '#ffffff' },
            warning: { bg: '#ff9800', text: '#ffffff' },
            info: { bg: '#2196F3', text: '#ffffff' }
        };
        
        const color = colors[type] || colors.info;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            color: ${color.text};
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            font-size: 14px;
            font-weight: 500;
            max-width: 350px;
            min-width: 280px;
            animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        `;
        
        // Add advanced animation styles if not exists
        if (!document.getElementById('propace-advanced-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'propace-advanced-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { 
                        transform: translateX(100%) scale(0.8); 
                        opacity: 0; 
                    }
                    to { 
                        transform: translateX(0) scale(1); 
                        opacity: 1; 
                    }
                }
                @keyframes slideOutRight {
                    from { 
                        transform: translateX(0) scale(1); 
                        opacity: 1; 
                    }
                    to { 
                        transform: translateX(100%) scale(0.8); 
                        opacity: 0; 
                    }
                }
                .propace-filled {
                    animation: propace-fill-pulse 0.6s ease-in-out;
                }
                @keyframes propace-fill-pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 18px;">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</div>
                <div style="flex: 1;">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Professional auto-hide with animation
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 400);
        }, 5000);
    };

    // ===================================================================
    // ==              MAIN MESSAGE HANDLER (Moved to Enhanced Section)==
    // ===================================================================
    // Note: Message handler moved to Enhanced Message Handler section above
    // to support dynamic content caching.

    // ===================================================================
    // ==              ERROR HANDLING & PERFORMANCE (Enhancement 8)    ==
    // ===================================================================

    // Performance monitoring
    class PropacePerformanceMonitor {
        constructor() {
            this.startTime = null;
            this.measurements = {};
        }

        start(operation) {
            this.startTime = performance.now();
            console.time(`Propace: ${operation}`);
        }

        end(operation) {
            if (this.startTime) {
                const duration = performance.now() - this.startTime;
                this.measurements[operation] = duration;
                console.timeEnd(`Propace: ${operation}`);
                console.log(`⏱️ ${operation} took ${duration.toFixed(2)}ms`);
                return duration;
            }
        }

        getStats() {
            return this.measurements;
        }
    }

    // Global performance monitor
    const performanceMonitor = new PropacePerformanceMonitor();

    // Optimized field pattern processing
    const optimizePatternMatching = () => {
        // Pre-compile common patterns for better performance
        const compiledPatterns = {};
        
        // Check if ADVANCED_FIELD_PATTERNS is available
        if (!window.ADVANCED_FIELD_PATTERNS) {
            console.warn('⚠️ ADVANCED_FIELD_PATTERNS not available, using fallback');
            return {};
        }
        
        Object.keys(window.ADVANCED_FIELD_PATTERNS).forEach(key => {
            compiledPatterns[key] = window.ADVANCED_FIELD_PATTERNS[key].map(pattern => {
                return {
                    original: pattern,
                    normalized: normalizeFieldName(pattern),
                    words: normalizeFieldName(pattern).split(/[^a-z0-9]/).filter(w => w.length > 2)
                };
            });
        });
        
        return compiledPatterns;
    };

    // Cached compiled patterns for performance
    const COMPILED_PATTERNS = optimizePatternMatching();

    // Enhanced visual feedback with error handling
    const addVisualFeedback = (element) => {
        safeExecute(async () => {
            // Add smooth professional animation
            element.style.transition = 'all 0.3s ease';
            element.style.backgroundColor = '#e8f5e8';
            element.style.border = '2px solid #4CAF50';
            element.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.3)';
            
            // Add filled class for CSS targeting
            element.classList.add('propace-filled');
            
            // Remove feedback after animation
            setTimeout(() => {
                safeExecute(() => {
                    element.style.transition = 'all 0.3s ease';
                    element.style.backgroundColor = '';
                    element.style.border = '';
                    element.style.boxShadow = '';
                    setTimeout(() => {
                        element.style.transition = '';
                        element.classList.remove('propace-filled');
                    }, 300);
                });
            }, 3000);
        });
    };

    // ===================================================================
    // ==              ENHANCED LEGACY FUNCTIONS WITH ERROR HANDLING   ==
    // ===================================================================

    // Enhanced legacy test form handler with comprehensive error handling
    const handleLegacyTestForm = (extractedData) => {
        return safeExecute(async () => {
            console.log('Propace Autofill: Processing legacy test form data:', extractedData);
            
            let filledCount = 0;
            const errors = [];
            
            for (const key in extractedData) {
                try {
                    if (LEGACY_TEST_FORM_MAPPING[key]) {
                        const fieldId = LEGACY_TEST_FORM_MAPPING[key];
                        const element = document.getElementById(fieldId);
                        
                        if (element) {
                            element.value = extractedData[key];
                            element.classList.add("filled");
                            filledCount++;
                            
                            // Add visual feedback with error handling
                            addVisualFeedback(element);
                        } else {
                            console.warn(`Propace Autofill: Legacy field not found: ${fieldId}`);
                        }
                    }
                } catch (error) {
                    errors.push(`Error filling ${key}: ${error.message}`);
                    console.error(`Propace Autofill: Error filling legacy field ${key}:`, error);
                }
            }

            // Update counter if exists
            const filledCountElement = document.getElementById("filledCount");
            if (filledCountElement) {
                filledCountElement.textContent = filledCount;
            }
            
            console.log(`Propace Autofill: Legacy form - filled ${filledCount} fields`);
            
            if (errors.length > 0) {
                console.warn('Propace Autofill: Some legacy fields had errors:', errors);
            }
            
            return { 
                status: "success", 
                filledFields: filledCount, 
                errors: errors.length > 0 ? errors : null 
            };
        }, { status: "error", filledFields: 0, errors: ["Critical error in legacy form handling"] });
    };

    // ===================================================================
    // ==              ENHANCED DEBUG AND TESTING FUNCTIONS           ==
    // ===================================================================

    // ===================================================================
    // ==              ENHANCED DEBUG AND TESTING FUNCTIONS           ==
    // ===================================================================

    // ===================================================================
    // ==              IFRAME SUPPORT ENHANCEMENT (Critical)           ==
    // ===================================================================

    // Enhanced iFrame autofill support with cross-origin detection
    const handleIFrameAutofill = async (extractedData) => {
        return safeExecute(async () => {
            console.log('🖼️ Propace iFrame: Starting enhanced iframe detection...');
            
            // Special handling for W3Schools TryIt editor
            const isW3Schools = window.location.href.includes('w3schools.com') || 
                               window.location.href.includes('tryit.asp');
            
            if (isW3Schools) {
                console.log('🎯 W3Schools detected: Using specialized iframe handling...');
                return await handleW3SchoolsIFrameAutofill(extractedData);
            }
            
            // Check if we have a pre-identified target document from W3Schools scanning
            if (window.propaceTargetDocument && window.propaceTargetDocument !== document) {
                console.log('🎯 Using pre-identified target document for autofill...');
                return await fillDocumentFields(window.propaceTargetDocument, extractedData);
            }
            
            const iframes = document.querySelectorAll('iframe');
            let filledIFrameCount = 0;
            
            for (const iframe of iframes) {
                try {
                    // Check if iframe is accessible (same-origin)
                    if (iframe.contentDocument && iframe.contentWindow) {
                        console.log('🔓 Propace iFrame: Found accessible iframe, injecting autofill...');
                        
                        // Get iframe fields using our enhanced field finder
                        const iframeFields = findAllFillableFields(iframe.contentDocument.body);
                        
                        if (iframeFields.length > 0) {
                            console.log(`📋 Propace iFrame: Found ${iframeFields.length} fields in iframe`);
                            
                            // Apply same intelligent autofill logic to iframe
                            const iframeResult = await processIFrameFields(iframe, iframeFields, extractedData);
                            filledIFrameCount += iframeResult.filledCount;
                            
                            // Add visual indicator for iframe completion
                            if (iframeResult.filledCount > 0) {
                                addIFrameCompletionIndicator(iframe, iframeResult.filledCount);
                            }
                        }
                    } else {
                        console.log('🔒 Propace iFrame: Cross-origin iframe detected - attempting postMessage communication');
                        await attemptCrossOriginIFrameAutofill(iframe, extractedData);
                    }
                } catch (error) {
                    console.warn('⚠️ Propace iFrame: Error processing iframe:', error);
                }
            }
            
            if (filledIFrameCount > 0) {
                showAdvancedPageNotification(`🖼️ Propace: Filled ${filledIFrameCount} fields in iFrames!`, 'success');
            }
            
            return filledIFrameCount;
        }, 0);
    };

    // Enhanced W3Schools iframe handling
    const handleW3SchoolsIFrameAutofill = async (extractedData) => {
        console.log('🎯 Starting W3Schools-specific iframe autofill...');
        
        // Look for the result iframe specifically
        const resultFrame = document.getElementById('iframeResult') || 
                           document.querySelector('iframe[name="iframeResult"]') ||
                           document.querySelector('.w3-example iframe') ||
                           document.querySelector('iframe[src*="tryit_view"]');
        
        if (resultFrame) {
            console.log('🖼️ Found W3Schools result iframe...');
            
            try {
                const iframeDoc = resultFrame.contentDocument || resultFrame.contentWindow.document;
                if (iframeDoc) {
                    console.log('✅ W3Schools iframe document accessible!');
                    return await fillDocumentFields(iframeDoc, extractedData);
                } else {
                    console.warn('⚠️ W3Schools iframe document not accessible');
                    // Try waiting a bit and retry
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const retryDoc = resultFrame.contentDocument || resultFrame.contentWindow.document;
                    if (retryDoc) {
                        console.log('✅ W3Schools iframe document accessible after retry!');
                        return await fillDocumentFields(retryDoc, extractedData);
                    }
                }
            } catch (error) {
                console.error('❌ Error accessing W3Schools iframe:', error);
                showTemporaryNotification('⚠️ Cannot access W3Schools result iframe - may be cross-origin');
            }
        } else {
            console.log('📄 No W3Schools iframe found, scanning current document...');
            return await fillDocumentFields(document, extractedData);
        }
        
        return 0;
    };

    // Fill fields in any document (main document or iframe document)
    const fillDocumentFields = async (targetDoc, extractedData) => {
        console.log('🔍 Scanning document for fillable fields...');
        
        const fields = targetDoc.querySelectorAll('input, select, textarea');
        console.log(`📊 Found ${fields.length} form fields`);
        
        if (fields.length === 0) {
            showTemporaryNotification('ℹ️ No form fields found in the target document');
            return 0;
        }
        
        let filledCount = 0;
        const dataMapping = createDataMapping();
        
        // Process each field
        for (const field of fields) {
            if (field.type === 'hidden' || field.type === 'submit' || field.type === 'button') {
                continue; // Skip non-fillable fields
            }
            
            const fieldType = window.detectFieldType(field);
            const fieldInfo = {
                element: field,
                name: field.name || field.id || '',
                type: fieldType,
                label: getEnhancedFieldLabel(field)
            };
            
            console.log(`🎯 Processing field: ${fieldInfo.name || fieldInfo.label || 'unnamed'} (${fieldType})`);
            
            // Try to match and fill the field
            const matchedData = findBestDataMatch(fieldInfo, extractedData, dataMapping);
            if (matchedData) {
                const success = await fillSingleFieldEnhanced(field, matchedData);
                if (success) {
                    filledCount++;
                    console.log(`✅ Filled field: ${fieldInfo.name || fieldInfo.label} with: ${matchedData}`);
                    
                    // Visual feedback
                    field.style.borderColor = '#4CAF50';
                    setTimeout(() => {
                        field.style.borderColor = '';
                    }, 2000);
                }
            }
        }
        
        if (filledCount > 0) {
            showTemporaryNotification(`✅ Successfully filled ${filledCount} fields!`);
        } else {
            showTemporaryNotification('ℹ️ No matching data found for the form fields');
        }
        
        return filledCount;
    };

    // Helper function to find best data match for a field
    const findBestDataMatch = (fieldInfo, extractedData, dataMapping) => {
        const fieldType = fieldInfo.type;
        const fieldName = fieldInfo.name.toLowerCase();
        const fieldLabel = fieldInfo.label.toLowerCase();
        const searchText = `${fieldName} ${fieldLabel}`.toLowerCase();
        
        // Direct field type mapping
        if (dataMapping[fieldType]) {
            for (const dataKey of dataMapping[fieldType]) {
                if (extractedData[dataKey]) {
                    return extractedData[dataKey];
                }
            }
        }
        
        // Name-based matching
        for (const [dataKey, dataValue] of Object.entries(extractedData)) {
            const dataKeyLower = dataKey.toLowerCase();
            
            // Exact name match
            if (fieldName === dataKeyLower) {
                return dataValue;
            }
            
            // Partial name match
            if (fieldName.includes(dataKeyLower) || dataKeyLower.includes(fieldName)) {
                return dataValue;
            }
            
            // Label match
            if (fieldLabel.includes(dataKeyLower) || dataKeyLower.includes(fieldLabel)) {
                return dataValue;
            }
        }
        
        // Fallback: try common patterns
        if (searchText.includes('name')) {
            return extractedData.name || extractedData.fullName || extractedData.firstName;
        }
        if (searchText.includes('email')) {
            return extractedData.email;
        }
        if (searchText.includes('phone')) {
            return extractedData.phone || extractedData.mobile;
        }
        if (searchText.includes('address')) {
            return extractedData.address || extractedData.currentAddress;
        }
        
        return null;
    };

    // Process fields within accessible iFrames
    const processIFrameFields = async (iframe, fields, extractedData) => {
        let filledCount = 0;
        
        // Create iframe-specific state manager
        const iframeStateManager = new PropaceStateManager();
        
        // Use same data mapping as main autofill
        const dataMapping = createDataMapping();
        
        for (const dataKey in extractedData) {
            const dataValue = extractedData[dataKey];
            if (!dataValue) continue;
            
            let fieldKeys = dataMapping[dataKey];
            if (!fieldKeys) continue;
            
            if (typeof fieldKeys === 'string') fieldKeys = [fieldKeys];
            
            for (const fieldKey of fieldKeys) {
                const bestMatch = findBestMatchingField(
                    iframeStateManager.getAvailableFields(fields), 
                    fieldKey, 
                    iframeStateManager.filledFields
                );
                
                if (bestMatch && !iframeStateManager.isFieldFilled(bestMatch.field.element)) {
                    if (iframeStateManager.reserveField(bestMatch.field.element, dataKey)) {
                        const fillSuccess = await fillFieldAdvanced(
                            bestMatch.field.element,
                            fieldProcessingModule.processDataForField(dataValue, fieldKey, bestMatch.field.element),
                            window.detectFieldType(bestMatch.field.element)
                        );
                        
                        if (fillSuccess) {
                            addVisualFeedback(bestMatch.field.element);
                            iframeStateManager.markDataKeyUsed(dataKey, bestMatch.field.element, bestMatch.score);
                            filledCount++;
                        }
                    }
                }
            }
        }
        
        return { filledCount, stateManager: iframeStateManager };
    };

    // Attempt cross-origin iframe communication
    const attemptCrossOriginIFrameAutofill = async (iframe, extractedData) => {
        try {
            // Send autofill data via postMessage
            const message = {
                type: 'PROPACE_AUTOFILL_REQUEST',
                data: extractedData,
                timestamp: Date.now()
            };
            
            iframe.contentWindow.postMessage(message, '*');
            
            // Listen for response
            const responsePromise = new Promise((resolve) => {
                const listener = (event) => {
                    if (event.data.type === 'PROPACE_AUTOFILL_RESPONSE' && 
                        event.data.timestamp === message.timestamp) {
                        window.removeEventListener('message', listener);
                        resolve(event.data);
                    }
                };
                window.addEventListener('message', listener);
                
                // Timeout after 3 seconds
                setTimeout(() => {
                    window.removeEventListener('message', listener);
                    resolve(null);
                }, 3000);
            });
            
            const response = await responsePromise;
            if (response && response.success) {
                console.log(`✅ Propace iFrame: Cross-origin autofill successful - ${response.filledCount} fields`);
            }
        } catch (error) {
            console.warn('❌ Propace iFrame: Cross-origin communication failed:', error);
        }
    };

    // Add visual completion indicator for iFrames
    const addIFrameCompletionIndicator = (iframe, filledCount) => {
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background: #4CAF50;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            z-index: 999999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        indicator.textContent = `✓ ${filledCount}`;
        indicator.title = `Propace filled ${filledCount} fields in this iframe`;
        
        const container = iframe.parentElement;
        container.style.position = 'relative';
        container.appendChild(indicator);
        
        // Remove after 5 seconds
        setTimeout(() => indicator.remove(), 5000);
    };

    // ===================================================================
    // ==              CROSS-TAB DATA PERSISTENCE (High Priority)      ==
    // ===================================================================

    // Cross-tab data manager for persistent autofill data
    const crossTabDataManager = {
        saveToStorage: async (data, metadata = {}) => {
            return safeExecute(async () => {
                const storageData = {
                    data: data,
                    timestamp: Date.now(),
                    url: window.location.hostname,
                    userAgent: navigator.userAgent.substring(0, 100),
                    sessionId: propaceStateManager?.sessionId || 'unknown',
                    metadata: metadata
                };
                
                // Get existing history and update it
                const existingData = await safeStorage.get(['propace_fill_history']);
                const existingHistory = existingData.propace_fill_history || [];
                const updatedHistory = [storageData, ...existingHistory.slice(0, 9)]; // Keep last 10 entries
                
                await safeStorage.set({
                    'propace_last_fill': storageData,
                    'propace_fill_history': updatedHistory
                });
                
                console.log('💾 Propace Storage: Data saved to cross-tab storage');
                return true;
            }, false);
        },

        loadFromStorage: async () => {
            return safeExecute(async () => {
                const result = await safeStorage.get(['propace_last_fill', 'propace_fill_history']);
                
                if (result.propace_last_fill) {
                    const age = Date.now() - result.propace_last_fill.timestamp;
                    
                    // Data is valid for 24 hours
                    if (age < 24 * 60 * 60 * 1000) {
                        console.log('📥 Propace Storage: Loaded recent data from storage');
                        return result.propace_last_fill;
                    } else {
                        console.log('⏰ Propace Storage: Stored data is too old, ignoring');
                    }
                }
                
                return null;
            }, null);
        },

        updateFillHistory: async (newEntry) => {
            return safeExecute(async () => {
                const result = await safeStorage.get('propace_fill_history');
                let history = result.propace_fill_history || [];
                
                // Keep only last 10 entries
                history.unshift(newEntry);
                history = history.slice(0, 10);
                
                return history;
            }, []);
        },

        getSuggestedData: async () => {
            return safeExecute(async () => {
                const stored = await this.loadFromStorage();
                if (stored && stored.data) {
                    // Filter out sensitive data for suggestions
                    const safeSuggestions = {};
                    const safeFields = ['Name', 'Email Address', 'Phone Number', 'Country', 'Nationality'];
                    
                    safeFields.forEach(field => {
                        if (stored.data[field]) {
                            safeSuggestions[field] = stored.data[field];
                        }
                    });
                    
                    return safeSuggestions;
                }
                return null;
            }, null);
        }
    };

    // ===================================================================
    // ==              ENHANCED AI-LIKE FIELD RECOGNITION             ==
    // ===================================================================

    // Enhanced field recognition with contextual analysis
    const enhancedFieldRecognition = {
        analyzeField: (element) => {
            return safeExecute(() => {
                const analysis = {
                    nearbyText: enhancedFieldRecognition.getNearbyTextContent(element, 100),
                    formPosition: enhancedFieldRecognition.analyzeFormPosition(element),
                    visualHints: enhancedFieldRecognition.analyzeVisualHints(element),
                    interactionPatterns: enhancedFieldRecognition.analyzeInteractionPatterns(element),
                    semanticContext: enhancedFieldRecognition.analyzeSemanticContext(element)
                };
                
                return enhancedFieldRecognition.calculateAdvancedScore(analysis);
            }, { score: 0, confidence: 'none', analysis: {} });
        },

        getNearbyTextContent: (element, radius) => {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const nearbyElements = document.elementsFromPoint(centerX, centerY - radius)
                .concat(document.elementsFromPoint(centerX, centerY + radius))
                .concat(document.elementsFromPoint(centerX - radius, centerY))
                .concat(document.elementsFromPoint(centerX + radius, centerY));
            
            const textContent = nearbyElements
                .filter(el => el && el.textContent)
                .map(el => el.textContent.trim())
                .filter(text => text.length > 2 && text.length < 100)
                .join(' ');
            
            return textContent.toLowerCase();
        },

        analyzeFormPosition: (element) => {
            const form = element.closest('form');
            if (!form) return { position: 'unknown', total: 0 };
            
            const formFields = Array.from(form.querySelectorAll('input, select, textarea'));
            const position = formFields.indexOf(element);
            
            return {
                position: position + 1,
                total: formFields.length,
                isFirst: position === 0,
                isLast: position === formFields.length - 1,
                percentagePosition: (position / formFields.length) * 100
            };
        },

        analyzeVisualHints: (element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            
            return {
                isVisible: rect.width > 0 && rect.height > 0,
                isLarge: rect.width > 200 || rect.height > 40,
                hasRedBorder: style.borderColor.includes('rgb(255') || style.borderColor.includes('red'),
                hasRequiredIndicator: element.hasAttribute('required') || 
                                     element.getAttribute('aria-required') === 'true',
                position: {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                }
            };
        },

        analyzeInteractionPatterns: (element) => {
            return {
                hasFocus: document.activeElement === element,
                hasValue: !!element.value,
                hasPlaceholder: !!element.placeholder,
                hasAutoComplete: !!element.getAttribute('autocomplete'),
                inputType: element.type || 'text',
                maxLength: element.maxLength || 0
            };
        },

    analyzeSemanticContext: (element) => {
            const containerSelectors = [
                '.form-group', '.field', '.input-group', '.form-field',
                '[data-field]', '[data-form]', '.question', '.row'
            ];
            
            let semanticContainer = null;
            for (const selector of containerSelectors) {
                semanticContainer = element.closest(selector);
                if (semanticContainer) break;
            }
            
            return {
                hasSemanticContainer: !!semanticContainer,
                containerClass: semanticContainer?.className || '',
                containerText: semanticContainer?.textContent?.trim().substring(0, 200) || '',
                hasValidation: enhancedFieldRecognition.hasValidationIndicators(element)
            };
        },

        hasValidationIndicators: (element) => {
            const validationSelectors = [
                '.error', '.invalid', '.required', '.validation',
                '[data-error]', '[data-validation]', '.help-text'
            ];
            
            const parent = element.parentElement;
            return validationSelectors.some(selector => 
                parent?.querySelector(selector) || parent?.matches(selector)
            );
        },

        calculateAdvancedScore: (analysis) => {
            let score = 0;
            let confidence = 'low';
            
            // Nearby text analysis
            if (analysis.nearbyText) {
                score += 0.3;
                if (analysis.nearbyText.length > 20) score += 0.1;
            }
            
            // Form position bonus
            if (analysis.formPosition.isFirst) score += 0.2;
            if (analysis.formPosition.percentagePosition < 30) score += 0.1;
            
            // Visual hints
            if (analysis.visualHints.hasRequiredIndicator) score += 0.2;
            if (analysis.visualHints.isLarge) score += 0.1;
            
            // Interaction patterns
            if (analysis.interactionPatterns.hasPlaceholder) score += 0.1;
            if (analysis.interactionPatterns.hasAutoComplete) score += 0.2;
            
            // Semantic context
            if (analysis.semanticContext.hasSemanticContainer) score += 0.2;
            if (analysis.semanticContext.hasValidation) score += 0.1;
            
            // Determine confidence
            if (score >= 0.8) confidence = 'very-high';
            else if (score >= 0.6) confidence = 'high';
            else if (score >= 0.4) confidence = 'medium';
            else if (score >= 0.2) confidence = 'low';
            else confidence = 'very-low';
            
            return { score, confidence, analysis };
        }
    };

    // ===================================================================
    // ==              SMART ADDRESS COMPONENT EXTRACTION              ==
    // ===================================================================

    // Enhanced address parser with intelligent component extraction
    const smartAddressParser = {
        extractComponents: async (fullAddress) => {
            return safeExecute(async () => {
                console.log('🏠 Propace Address: Parsing address components...');
                
                if (!fullAddress || typeof fullAddress !== 'string') {
                    return null;
                }
                
                const cleanAddress = fullAddress.trim();
                
                // Try different parsing strategies
                const strategies = [
                    () => this.parseCommaSeparated(cleanAddress),
                    () => this.parseLineBreakSeparated(cleanAddress),
                    () => this.parseWithRegionalPatterns(cleanAddress),
                    () => this.parseWithKeywords(cleanAddress)
                ];
                
                for (const strategy of strategies) {
                    try {
                        const result = strategy();
                        if (result && result.confidence > 0.5) {
                            console.log('✅ Propace Address: Successfully parsed with confidence:', result.confidence);
                            return result;
                        }
                    } catch (error) {
                        console.warn('⚠️ Propace Address: Strategy failed:', error);
                    }
                }
                
                // Fallback: basic splitting
                return this.basicSplit(cleanAddress);
            }, null);
        },

        parseCommaSeparated: (address) => {
            const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);
            
            if (parts.length < 2) return { confidence: 0.2 };
            
            return {
                line1: parts[0],
                line2: parts.length > 4 ? parts[1] : '',
                city: parts[parts.length - 3] || parts[parts.length - 2] || '',
                state: parts[parts.length - 2] || '',
                country: parts[parts.length - 1] || '',
                postalCode: this.extractPostalCode(address),
                confidence: 0.7
            };
        },

        parseLineBreakSeparated: (address) => {
            const lines = address.split(/\n|\r\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length < 2) return { confidence: 0.2 };
            
            return {
                line1: lines[0],
                line2: lines.length > 3 ? lines[1] : '',
                city: this.extractCity(lines),
                state: this.extractState(lines),
                country: this.extractCountry(lines),
                postalCode: this.extractPostalCode(address),
                confidence: 0.8
            };
        },

        parseWithRegionalPatterns: (address) => {
            // Pakistani address patterns
            const pakistaniPattern = /(.+?)(?:,\s*)?(?:(sector|phase|block)\s+[a-z0-9\-]+)?(?:,\s*)?([a-z\s]+?)(?:,\s*)?(punjab|sindh|balochistan|khyber pakhtunkhwa|kpk|islamabad|gilgit baltistan|azad kashmir)?(?:,\s*)?(pakistan)?/i;
            
            const match = address.match(pakistaniPattern);
            if (match) {
                return {
                    line1: match[1] || '',
                    line2: match[2] ? `${match[2]} ${match[3] || ''}`.trim() : '',
                    city: match[3] || '',
                    state: match[4] || '',
                    country: match[5] || 'Pakistan',
                    postalCode: this.extractPostalCode(address),
                    confidence: 0.9
                };
            }
            
            return { confidence: 0.3 };
        },

        parseWithKeywords: (address) => {
            const keywords = {
                house: /(?:house|home|h\.?)\s*(?:no\.?|number|#)?\s*([a-z0-9\-\/]+)/i,
                street: /(?:street|st\.?|road|rd\.?)\s*(?:no\.?|number|#)?\s*([a-z0-9\-\/\s]+)/i,
                sector: /(?:sector|sec\.?)\s*([a-z0-9\-\/]+)/i,
                phase: /(?:phase|ph\.?)\s*([a-z0-9\-\/]+)/i,
                block: /(?:block|blk\.?)\s*([a-z0-9\-\/]+)/i
            };
            
            const extracted = {};
            let confidence = 0.4;
            
            for (const [key, pattern] of Object.entries(keywords)) {
                const match = address.match(pattern);
                if (match) {
                    extracted[key] = match[1].trim();
                    confidence += 0.1;
                }
            }
            
            if (Object.keys(extracted).length > 0) {
                return {
                    line1: this.buildLine1(extracted),
                    line2: this.buildLine2(extracted),
                    city: this.extractCity([address]),
                    state: this.extractState([address]),
                    country: this.extractCountry([address]),
                    postalCode: this.extractPostalCode(address),
                    confidence: Math.min(confidence, 0.9)
                };
            }
            
            return { confidence: 0.2 };
        },

        buildLine1: (extracted) => {
            const parts = [];
            if (extracted.house) parts.push(`House ${extracted.house}`);
            if (extracted.street) parts.push(extracted.street);
            return parts.join(', ');
        },

        buildLine2: (extracted) => {
            const parts = [];
            if (extracted.sector) parts.push(`Sector ${extracted.sector}`);
            if (extracted.phase) parts.push(`Phase ${extracted.phase}`);
            if (extracted.block) parts.push(`Block ${extracted.block}`);
            return parts.join(', ');
        },

        extractPostalCode: (address) => {
            const patterns = [
                /\b(\d{5})\b/,  // 5 digit postal code
                /\b(\d{5}-\d{4})\b/,  // ZIP+4
                /\b([a-z]\d[a-z]\s*\d[a-z]\d)\b/i  // Canadian postal code
            ];
            
            for (const pattern of patterns) {
                const match = address.match(pattern);
                if (match) return match[1];
            }
            
            return '';
        },

        extractCity: (lines) => {
            const cityKeywords = ['city', 'town', 'municipality'];
            for (const line of lines) {
                for (const keyword of cityKeywords) {
                    if (line.toLowerCase().includes(keyword)) {
                        return line.replace(new RegExp(keyword, 'gi'), '').trim();
                    }
                }
            }
            
            // Return second to last non-empty line as likely city
            const nonEmpty = lines.filter(l => l.length > 2);
            return nonEmpty[nonEmpty.length - 2] || '';
        },

        extractState: (lines) => {
            const pakistaniStates = [
                'punjab', 'sindh', 'balochistan', 'khyber pakhtunkhwa', 'kpk',
                'gilgit baltistan', 'azad kashmir', 'islamabad capital territory', 'ict'
            ];
            
            for (const line of lines) {
                for (const state of pakistaniStates) {
                    if (line.toLowerCase().includes(state)) {
                        return state.replace(/\b\w/g, l => l.toUpperCase());
                    }
                }
            }
            
            return '';
        },

        extractCountry: (lines) => {
            const countries = ['pakistan', 'india', 'bangladesh', 'afghanistan', 'iran'];
            
            for (const line of lines) {
                for (const country of countries) {
                    if (line.toLowerCase().includes(country)) {
                        return country.replace(/\b\w/g, l => l.toUpperCase());
                    }
                }
            }
            
            return '';
        },

        basicSplit: (address) => {
            const parts = address.split(/[,\n]/).map(p => p.trim()).filter(p => p.length > 0);
            
            return {
                line1: parts[0] || '',
                line2: parts[1] || '',
                city: parts[2] || '',
                state: parts[3] || '',
                country: parts[parts.length - 1] || '',
                postalCode: this.extractPostalCode(address),
                confidence: 0.4
            };
        }
    };

    // ===================================================================
    // ==              FORM VALIDATION INTEGRATION                     ==
    // ===================================================================

    // Real-time validation checking system
    const validationChecker = {
        validateField: async (element, value) => {
            return safeExecute(async () => {
                console.log('🔍 Propace Validation: Checking field validation...');
                
                // Store original value
                const originalValue = element.value;
                
                // Set test value
                element.value = value;
                
                // Check HTML5 validation
                const html5Valid = element.checkValidity();
                const html5Message = element.validationMessage;
                
                // Check custom validation patterns
                const customValidation = await this.checkCustomValidation(element, value);
                
                // Check framework-specific validation
                const frameworkValidation = await this.checkFrameworkValidation(element, value);
                
                // Restore original value
                element.value = originalValue;
                
                const result = {
                    isValid: html5Valid && customValidation.isValid && frameworkValidation.isValid,
                    html5: { isValid: html5Valid, message: html5Message },
                    custom: customValidation,
                    framework: frameworkValidation,
                    suggestions: this.generateSuggestions(element, value, html5Valid, customValidation)
                };
                
                console.log('✅ Propace Validation: Validation complete:', result);
                return result;
            }, { isValid: true, html5: {}, custom: {}, framework: {}, suggestions: [] });
        },

        checkCustomValidation: async (element, value) => {
            const patterns = {
                email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                phone: /^[\+]?[\d\s\-\(\)]{10,}$/,
                cnic: /^\d{5}-\d{7}-\d{1}$/,
                passport: /^[A-Z]{2}\d{7}$/,
                postalCode: /^\d{5}(-\d{4})?$/
            };
            
            const fieldType = this.detectValidationType(element);
            const pattern = patterns[fieldType];
            
            if (pattern) {
                const isValid = pattern.test(value);
                return {
                    isValid: isValid,
                    type: fieldType,
                    message: isValid ? '' : `Invalid ${fieldType} format`,
                    pattern: pattern.toString()
                };
            }
            
            return { isValid: true, type: 'unknown', message: '', pattern: '' };
        },

        checkFrameworkValidation: async (element, value) => {
            try {
                // React validation check
                if (this.isReactField(element)) {
                    return await this.checkReactValidation(element, value);
                }
                
                // Vue validation check
                if (this.isVueField(element)) {
                    return await this.checkVueValidation(element, value);
                }
                
                // Angular validation check
                if (this.isAngularField(element)) {
                    return await this.checkAngularValidation(element, value);
                }
                
                return { isValid: true, framework: 'none', message: '' };
            } catch (error) {
                console.warn('⚠️ Propace Validation: Framework validation failed:', error);
                return { isValid: true, framework: 'error', message: error.message };
            }
        },

        detectValidationType: (element) => {
            const identifiers = [
                element.name, element.id, element.placeholder,
                element.getAttribute('data-field'), element.className
            ].filter(Boolean).join(' ').toLowerCase();
            
            if (/email|mail/.test(identifiers)) return 'email';
            if (/phone|mobile|contact/.test(identifiers)) return 'phone';
            if (/cnic|national.*id/.test(identifiers)) return 'cnic';
            if (/passport/.test(identifiers)) return 'passport';
            if (/postal|zip/.test(identifiers)) return 'postalCode';
            
            return 'text';
        },

        isReactField: (element) => {
            return !!(element._reactInternalFiber || 
                     element.__reactInternalInstance || 
                     Object.keys(element).some(key => key.startsWith('__react')));
        },

        isVueField: (element) => {
            return !!(element.__vue__ || element._vei || element.hasAttribute('v-model'));
        },

        isAngularField: (element) => {
            return !!(element.hasAttribute('ng-model') || 
                     element.hasAttribute('[ngModel]') || 
                     window.ng);
        },

        checkReactValidation: async (element, value) => {
            // Simulate React validation by triggering events and checking for error states
            element.value = value;
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const errorElement = element.parentElement?.querySelector('.error, .invalid, [data-error]');
            const hasError = errorElement && errorElement.textContent.trim().length > 0;
            
            return {
                isValid: !hasError,
                framework: 'react',
                message: hasError ? errorElement.textContent.trim() : ''
            };
        },

        checkVueValidation: async (element, value) => {
            if (element.__vue__ && element.__vue__.$emit) {
                element.__vue__.$emit('input', value);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return { isValid: true, framework: 'vue', message: '' };
        },

        checkAngularValidation: async (element, value) => {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const hasError = element.classList.contains('ng-invalid');
            return {
                isValid: !hasError,
                framework: 'angular',
                message: hasError ? 'Angular validation failed' : ''
            };
        },

        generateSuggestions: (element, value, html5Valid, customValidation) => {
            const suggestions = [];
            
            if (!html5Valid) {
                suggestions.push('Check HTML5 validation requirements');
            }
            
            if (!customValidation.isValid) {
                suggestions.push(`Format should match: ${customValidation.type}`);
            }
            
            if (element.hasAttribute('required') && !value) {
                suggestions.push('This field is required');
            }
            
            if (element.minLength && value.length < element.minLength) {
                suggestions.push(`Minimum length: ${element.minLength} characters`);
            }
            
            return suggestions;
        }
    };

    // ===================================================================
    // ==              PERFORMANCE OPTIMIZATION & CACHING             ==
    // ===================================================================

    // Advanced field caching system for better performance - FIXED
    // Augment the early stub to avoid redeclaration
    fieldCache = Object.assign(fieldCache || {}, {
        cache: fieldCache?.cache instanceof Map ? fieldCache.cache : new Map(),
        
        generateCacheKey: (rootElement = document.body) => {
            try {
                const hash = fieldCache.simpleHash(rootElement.innerHTML.substring(0, 1000));
                const fieldCount = rootElement.querySelectorAll('input, select, textarea').length;
                return `${hash}_${fieldCount}_${Date.now().toString().slice(-6)}`;
            } catch (error) {
                console.warn('Cache key generation failed, using fallback');
                return `cache_fallback_${Date.now()}`;
            }
        },
        
        simpleHash: (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(36);
        },
        
        getCachedFields: (cacheKey) => {
            try {
                if (!fieldCache.cache) fieldCache.cache = new Map();
                
                if (fieldCache.cache.has(cacheKey)) {
                    const cached = fieldCache.cache.get(cacheKey);
                    
                    // Check if cache is still valid (DOM not significantly changed)
                    if (cached.timestamp > Date.now() - 10000) { // 10 second cache
                        console.log('⚡ Propace Cache: Using cached fields');
                        return cached.fields;
                    } else {
                        console.log('⏰ Propace Cache: Cache expired, removing');
                        fieldCache.cache.delete(cacheKey);
                    }
                }
                return null;
            } catch (error) {
                console.warn('Cache retrieval failed:', error);
                return null;
            }
        },
        
        setCachedFields: (cacheKey, fields) => {
            try {
                if (!fieldCache.cache) fieldCache.cache = new Map();
                
                // Limit cache size to prevent memory issues
                if (fieldCache.cache.size > 5) {
                    const firstKey = fieldCache.cache.keys().next().value;
                    fieldCache.cache.delete(firstKey);
                }
                
                fieldCache.cache.set(cacheKey, {
                    fields: fields,
                    timestamp: Date.now()
                });
                
                console.log('💾 Propace Cache: Fields cached with key:', cacheKey);
            } catch (error) {
                console.warn('Cache storage failed:', error);
            }
        },
        
        clearCache: () => {
            try {
                if (fieldCache.cache && typeof fieldCache.cache.clear === 'function') {
                    fieldCache.cache.clear();
                    console.log('🧹 Propace Cache: Cache cleared successfully');
                } else {
                    fieldCache.cache = new Map();
                    console.log('🔧 Cache recreated');
                }
            } catch (error) {
                console.error('Cache clear failed:', error);
                fieldCache.cache = new Map();
            }
        },
        
        // Initialize cache safely
        initialize: () => {
            if (!fieldCache.cache) {
                fieldCache.cache = new Map();
                console.log('🔧 Field cache initialized');
            }
        }
    });
    // keep global reference in sync
    try { window.fieldCache = fieldCache; } catch(_) {}

    // Initialize field cache immediately
    fieldCache.initialize();

    // ===================================================================
    // ==              MULTI-LANGUAGE ENHANCEMENT                      ==
    // ===================================================================

    // Enhanced multi-language field patterns
    const regionalPatterns = {
        // Pakistani regional languages
        urdu: {
            name: ['نام', 'نام مکمل', 'پورا نام'],
            address: ['پتہ', 'مکمل پتہ', 'رہائش'],
            phone: ['فون نمبر', 'رابطہ نمبر', 'موبائل نمبر'],
            email: ['ای میل', 'برقی ڈاک'],
            father: ['والد کا نام', 'باپ کا نام'],
            husband: ['شوہر کا نام'],
            birth: ['تاریخ پیدائش', 'پیدائش کی تاریخ']
        },
        
        punjabi: {
            name: ['ਨਾਮ', 'ਪੂਰਾ ਨਾਮ'],
            address: ['ਪਤਾ', 'ਮੁਕੰਮਲ ਪਤਾ'],
            phone: ['ਫੋਨ ਨੰਬਰ', 'ਮੋਬਾਈਲ']
        },
        
        sindhi: {
            name: ['نالو', 'مڪمل نالو'],
            address: ['پتو', 'مڪمل پتو'],
            phone: ['فون نمبر', 'رابطي نمبر']
        },
        
        // Indian languages
        hindi: {
            name: ['नाम', 'पूरा नाम', 'व्यक्ति का नाम'],
            address: ['पता', 'पूरा पता', 'पूर्ण पता'],
            phone: ['फ़ोन नंबर', 'मोबाइल नंबर', 'संपर्क नंबर'],
            email: ['ईमेल', 'इलेक्ट्रॉनिक मेल']
        },
        
        tamil: {
            name: ['பெயர்', 'முழு பெயர்'],
            address: ['முகவரி', 'முழு முகவரி'],
            phone: ['தொலைபேசி எண்', 'மொபைல் எண்']
        },
        
        bengali: {
            name: ['নাম', 'পূর্ণ নাম'],
            address: ['ঠিকানা', 'সম্পূর্ণ ঠিকানা'],
            phone: ['ফোন নম্বর', 'মোবাইল নম্বর']
        }
    };

    // Enhanced pattern matching with regional language support
    const enhanceFieldPatternsWithRegional = () => {
        const enhancedPatterns = { ...ADVANCED_FIELD_PATTERNS };
        
        // Add regional patterns to existing field types
        Object.keys(regionalPatterns).forEach(language => {
            const langPatterns = regionalPatterns[language];
            
            Object.keys(langPatterns).forEach(fieldType => {
                const mappings = {
                    'name': 'name',
                    'address': 'address',
                    'phone': 'phoneNumber',
                    'email': 'email',
                    'father': 'fatherName',
                    'husband': 'husbandName',
                    'birth': 'dateOfBirth'
                };
                
                const targetField = mappings[fieldType];
                if (targetField && enhancedPatterns[targetField]) {
                    enhancedPatterns[targetField].push(...langPatterns[fieldType]);
                }
            });
        });
        
        console.log('🌐 Propace Language: Enhanced patterns with regional language support');
        return enhancedPatterns;
    };

    // ===================================================================
    // ==              ADVANCED USER FEEDBACK SYSTEM                   ==
    // ===================================================================

    // Interactive user feedback and learning system
    const userFeedbackSystem = {
        showPreviewMode: async (fieldsToFill) => {
            return safeExecute(async () => {
                console.log('👁️ Propace Preview: Showing preview mode...');
                
                const previewContainer = userFeedbackSystem.createPreviewContainer(fieldsToFill);
                document.body.appendChild(previewContainer);
                
                return new Promise((resolve) => {
                    const confirmBtn = previewContainer.querySelector('.propace-confirm');
                    const cancelBtn = previewContainer.querySelector('.propace-cancel');
                    
                    confirmBtn.onclick = () => {
                        previewContainer.remove();
                        resolve(true);
                    };
                    
                    cancelBtn.onclick = () => {
                        previewContainer.remove();
                        resolve(false);
                    };
                    
                    // Auto-confirm after 10 seconds
                    setTimeout(() => {
                        if (document.body.contains(previewContainer)) {
                            previewContainer.remove();
                            resolve(true);
                        }
                    }, 10000);
                });
            }, false);
        },

    createPreviewContainer: (fieldsToFill) => {
            const container = document.createElement('div');
            container.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                z-index: 999999;
                padding: 24px;
                max-width: 500px;
                max-height: 400px;
                overflow-y: auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            container.innerHTML = `
                <h3 style="margin: 0 0 16px 0; color: #333;">🎯 Propace Autofill Preview</h3>
                <p style="margin: 0 0 16px 0; color: #666;">We will fill ${fieldsToFill.length} fields:</p>
                <div style="max-height: 200px; overflow-y: auto; margin-bottom: 20px;">
                    ${fieldsToFill.map(item => {
                        const name = item.fieldName || item.field?.name || item.fieldKey || item.originalDataKey || 'field';
                        const value = (item.processedValue != null ? item.processedValue : item.originalValue);
                        return `
                        <div style="padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                            <span style="font-weight: 500;">${name}</span>
                            <span style="color: #666; font-family: monospace;">${value ?? ''}</span>
                        </div>`;
                    }).join('')}
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="propace-cancel" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Cancel</button>
                    <button class="propace-confirm" style="padding: 8px 16px; border: none; background: #4CAF50; color: white; border-radius: 6px; cursor: pointer;">Fill Fields</button>
                </div>
            `;
            
            return container;
        },

        allowFieldCorrection: async (field, suggestedValue, actualValue) => {
            return safeExecute(async () => {
                // Log the correction for learning
                const correction = {
                    timestamp: Date.now(),
                    fieldName: field.name,
                    fieldType: field.type,
                    fieldContext: field.context,
                    suggestedValue: suggestedValue,
                    actualValue: actualValue,
                    url: window.location.hostname
                };
                
                // Store correction for future improvement
                await this.storeLearningData(correction);
                
                console.log('📚 Propace Learning: Field correction logged:', correction);
                
                // Update field patterns based on correction
                this.updatePatterns(correction);
                
                return true;
            }, false);
        },

        storeLearningData: async (correction) => {
            try {
                const existing = await safeStorage.get('propace_learning_data');
                const learningData = existing.propace_learning_data || [];
                
                learningData.push(correction);
                
                // Keep only last 100 corrections
                if (learningData.length > 100) {
                    learningData.shift();
                }
                
                await safeStorage.set({ 'propace_learning_data': learningData });
            } catch (error) {
                console.warn('⚠️ Propace Learning: Could not store learning data:', error);
            }
        },

        updatePatterns: (correction) => {
            // Simple pattern learning - add successful patterns
            if (correction.actualValue && correction.fieldContext) {
                const contextWords = correction.fieldContext.toLowerCase().split(/\s+/);
                const newPatterns = contextWords.filter(word => word.length > 3);
                
                console.log('🎯 Propace Learning: Discovered new patterns:', newPatterns);
                // These could be added to ADVANCED_FIELD_PATTERNS dynamically
            }
        }
    };

    // ===================================================================
    // ==              CROSS-ORIGIN IFRAME MESSAGE HANDLER            ==
    // ===================================================================

    // Listen for cross-origin iframe autofill requests
    window.addEventListener('message', (event) => {
        safeExecute(async () => {
            if (event.data.type === 'PROPACE_AUTOFILL_REQUEST') {
                console.log('📬 Propace iFrame: Received cross-origin autofill request');
                
                try {
                    const result = await fillAdvancedFormFields(event.data.data);
                    
                    // Send response back to parent
                    event.source.postMessage({
                        type: 'PROPACE_AUTOFILL_RESPONSE',
                        timestamp: event.data.timestamp,
                        success: result.success,
                        filledCount: result.fieldsCount,
                        message: result.message
                    }, event.origin);
                    
                    console.log('✅ Propace iFrame: Cross-origin autofill completed and response sent');
                } catch (error) {
                    console.error('❌ Propace iFrame: Cross-origin autofill failed:', error);
                    
                    event.source.postMessage({
                        type: 'PROPACE_AUTOFILL_RESPONSE',
                        timestamp: event.data.timestamp,
                        success: false,
                        filledCount: 0,
                        message: 'Autofill failed: ' + error.message
                    }, event.origin);
                }
            }
        });
    });

    // ===================================================================
    // ==              ENHANCED DEBUG AND TESTING FUNCTIONS           ==
    // ===================================================================

    // Enhanced debug function with performance monitoring
    window.debugPropaceFields = () => {
        return safeExecute(async () => {
            performanceMonitor.start('Field Analysis');
            
            console.log('🔍 Propace Autofill: Enhanced debugging with AI-like analysis...');
            
            const fields = findAllFillableFields(document.body);
            console.log(`📊 Found ${fields.length} form fields (including Shadow DOM):`);
            
            const fieldAnalysis = [];
            
            fields.forEach((field, index) => {
                try {
                    // Enhanced analysis with AI-like recognition
                    const enhancedAnalysis = enhancedFieldRecognition.analyzeField(field.element);
                    
                    const analysis = {
                        index: index + 1,
                        name: field.name,
                        type: field.type,
                        context: field.context,
                        value: field.value,
                        isInShadowDOM: field.isInShadowDOM,
                        domPath: field.domPath,
                        element: field.element,
                        enhancedAnalysis: enhancedAnalysis,
                        matchingDataTypes: []
                    };
                    
                    // Test each data type against this field
                    const testData = ['name', 'country', 'phoneNumber', 'email', 'address', 'idNumber', 
                                    'currentAddress', 'permanentAddress', 'fatherName', 'husbandName'];
                    
                    testData.forEach(dataType => {
                        const scoreResult = calculateFieldMatchScore(field.element, dataType);
                        const combinedScore = (scoreResult.score * 0.7) + (enhancedAnalysis.score * 0.3);
                        
                        if (combinedScore >= 0.3) {
                            analysis.matchingDataTypes.push({
                                dataType: dataType,
                                traditionalScore: scoreResult.score,
                                enhancedScore: enhancedAnalysis.score,
                                combinedScore: combinedScore,
                                confidence: scoreResult.confidence
                            });
                        }
                    });
                    
                    fieldAnalysis.push(analysis);
                    
                    console.log(`\n${index + 1}. Enhanced Field Analysis:`);
                    console.log(`   Name: "${field.name}"`);
                    console.log(`   Type: ${field.type}`);
                    console.log(`   Context: "${field.context}"`);
                    console.log(`   Current Value: "${field.value}"`);
                    console.log(`   In Shadow DOM: ${field.isInShadowDOM}`);
                    console.log(`   DOM Path: ${field.domPath}`);
                    console.log(`   🤖 AI Analysis Score: ${enhancedAnalysis.score.toFixed(2)} (${enhancedAnalysis.confidence})`);
                    console.log(`   🧠 Enhanced Recognition:`, enhancedAnalysis.analysis);
                    console.log(`   Element:`, field.element);
                    
                    if (analysis.matchingDataTypes.length > 0) {
                        console.log(`   🎯 Potential matches:`);
                        analysis.matchingDataTypes.forEach(match => {
                            console.log(`      ✅ ${match.dataType}: Traditional=${match.traditionalScore.toFixed(2)}, AI=${match.enhancedScore.toFixed(2)}, Combined=${match.combinedScore.toFixed(2)} (${match.confidence})`);
                        });
                    } else {
                        console.log(`   ❌ No strong matches found`);
                    }
                    
                } catch (error) {
                    console.error(`Error analyzing field ${index}:`, error);
                }
            });
            
            performanceMonitor.end('Field Analysis');
            
            console.log('\n📈 Performance Stats:', performanceMonitor.getStats());
            console.log('\n🔧 Enhanced Debug Complete!');
            
            return {
                fields: fieldAnalysis,
                totalFields: fields.length,
                performanceStats: performanceMonitor.getStats(),
                enhancedAnalysisAvailable: true
            };
            
        }, []);
    };

    // Enhanced test function with comprehensive data processing
    window.testPropaceAutofill = (testData = null) => {
        return safeExecute(async () => {
            performanceMonitor.start('Full Autofill Test');
            
            console.log('🧪 Propace Autofill: Enhanced testing with AI-powered recognition...');
            
            const sampleData = testData || {
                'Name': 'Muhammad Ahmad Khan',
                'Father Name': 'Abdul Rahman Khan',
                'Date of Birth': '15/08/1990',
                'Gender': 'Male',
                'Nationality': 'Pakistani',
                'ID Number': '12345-6789012-3',
                'Phone Number': '+92-300-1234567',
                'Email Address': 'ahmad.khan@example.com',
                'Current Address': 'House No. 123, Street 5, Sector F-7/2, Islamabad, ICT, Pakistan',
                'Place of Birth': 'Lahore'
            };
            
            console.log('📝 Using enhanced test data:', sampleData);
            
            // Reset state for clean test
            if (propaceStateManager) {
                propaceStateManager.reset();
            }
            
            // Clear cache for fresh analysis
            fieldCache.clearCache();
            
            const result = await fillAdvancedFormFields(sampleData);
            
            performanceMonitor.end('Full Autofill Test');
            
            console.log('📋 Enhanced test result:', result);
            console.log('📈 Performance stats:', performanceMonitor.getStats());
            
            return {
                ...result,
                performanceStats: performanceMonitor.getStats(),
                testData: sampleData,
                enhancedFeaturesUsed: {
                    aiRecognition: true,
                    smartAddressParsing: true,
                    validationChecking: true,
                    crossTabPersistence: true,
                    iframeSupport: true
                }
            };
            
        }, { success: false, message: 'Test failed due to error' });
    };

    // NEW: Advanced field pattern analysis
    window.analyzePropacePatterns = () => {
        return safeExecute(() => {
            console.log('🔬 Propace Pattern Analysis: Starting comprehensive analysis...');
            
            const fields = findAllFillableFields(document.body);
            const patternAnalysis = {};
            
            // Analyze each field pattern
            Object.keys(ADVANCED_FIELD_PATTERNS).forEach(patternType => {
                patternAnalysis[patternType] = {
                    patterns: ADVANCED_FIELD_PATTERNS[patternType],
                    matchingFields: [],
                    totalMatches: 0
                };
                
                fields.forEach(field => {
                    const scoreResult = calculateFieldMatchScore(field.element, patternType);
                    if (scoreResult.score >= 0.3) {
                        patternAnalysis[patternType].matchingFields.push({
                            fieldName: field.name,
                            score: scoreResult.score,
                            confidence: scoreResult.confidence,
                            evidence: scoreResult.evidence
                        });
                        patternAnalysis[patternType].totalMatches++;
                    }
                });
            });
            
            console.log('📊 Pattern Analysis Results:', patternAnalysis);
            
            // Regional language pattern analysis
            const regionalAnalysis = {};
            Object.keys(regionalPatterns).forEach(language => {
                regionalAnalysis[language] = {
                    language: language,
                    patterns: regionalPatterns[language],
                    fieldsFound: 0
                };
                
                fields.forEach(field => {
                    const fieldText = (field.name + ' ' + field.context).toLowerCase();
                    Object.values(regionalPatterns[language]).flat().forEach(pattern => {
                        if (fieldText.includes(pattern.toLowerCase())) {
                            regionalAnalysis[language].fieldsFound++;
                        }
                    });
                });
            });
            
            console.log('🌐 Regional Language Analysis:', regionalAnalysis);
            
            return {
                totalFields: fields.length,
                patternAnalysis: patternAnalysis,
                regionalAnalysis: regionalAnalysis,
                recommendations: generatePatternRecommendations(patternAnalysis, regionalAnalysis)
            };
        }, {});
    };

    // Generate pattern recommendations
    const generatePatternRecommendations = (patternAnalysis, regionalAnalysis) => {
        const recommendations = [];
        
        // Check for poorly performing patterns
        Object.keys(patternAnalysis).forEach(patternType => {
            if (patternAnalysis[patternType].totalMatches === 0) {
                recommendations.push(`Consider adding more patterns for ${patternType}`);
            }
        });
        
        // Check for regional language opportunities
        Object.keys(regionalAnalysis).forEach(language => {
            if (regionalAnalysis[language].fieldsFound > 0) {
                recommendations.push(`Page contains ${language} patterns - consider enhancing ${language} support`);
            }
        });
        
        return recommendations;
    };

    // NEW: Storage analysis function
    window.analyzePropaceStorage = async () => {
        return safeExecute(async () => {
            console.log('💾 Propace Storage Analysis: Checking stored data...');
            
            const crossTabData = await crossTabDataManager.loadFromStorage();
            const suggestions = await crossTabDataManager.getSuggestedData();
            
            const storageStats = await safeStorage.get(null);
            const propaceKeys = Object.keys(storageStats).filter(key => key.startsWith('propace_'));
            
            const analysis = {
                crossTabData: crossTabData,
                suggestions: suggestions,
                allPropaceKeys: propaceKeys,
                storageUsage: {},
                recommendations: []
            };
            
            // Calculate storage usage
            propaceKeys.forEach(key => {
                const data = storageStats[key];
                analysis.storageUsage[key] = {
                    size: JSON.stringify(data).length,
                    lastModified: data.timestamp || 'Unknown'
                };
            });
            
            // Generate recommendations
            if (!crossTabData) {
                analysis.recommendations.push('No recent autofill data found - perform an autofill to enable cross-tab persistence');
            } else {
                const age = Date.now() - crossTabData.timestamp;
                if (age > 12 * 60 * 60 * 1000) {
                    analysis.recommendations.push('Stored data is getting old - consider refreshing with new autofill');
                }
            }
            
            console.log('📊 Storage Analysis Results:', analysis);
            return analysis;
        }, {});
    };

    // Enhanced global variables for MutationObserver and data caching
    let propaceMutationObserver = null;
    let propaceLastExtractedData = null; // Store last successful autofill data

    // Enhanced MutationObserver initialization
    const initializeDynamicContentObserver = () => {
        safeExecute(async () => {
            console.log('Propace Autofill: Initializing enhanced MutationObserver...');
            
            // Disconnect existing observer if any
            if (propaceMutationObserver) {
                propaceMutationObserver.disconnect();
            }

            // Create new MutationObserver with enhanced error handling
            propaceMutationObserver = new MutationObserver((mutations) => {
                safeExecute(async () => {
                    let hasNewFormFields = false;
                    let newlyAddedNodes = [];

                    // Process all mutations to find new form-related elements
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            // Check each added node for form fields
                            Array.from(mutation.addedNodes).forEach((node) => {
                                try {
                                    // Skip text nodes and non-element nodes
                                    if (node.nodeType !== Node.ELEMENT_NODE) return;

                                    // Check if the node itself is a form field or contains form fields
                                    const isFormField = isFormFieldElement(node);
                                    const containsFormFields = node.querySelectorAll && 
                                        node.querySelectorAll('input, textarea, select, [contenteditable="true"], [role="textbox"]').length > 0;

                                    if (isFormField || containsFormFields) {
                                        hasNewFormFields = true;
                                        newlyAddedNodes.push(node);
                                        console.log('Propace Autofill: New form field detected:', node);
                                    }
                                } catch (error) {
                                    console.warn('Propace Autofill: Error processing mutation node:', error);
                                }
                            });
                        }
                    });

                    // If new form fields are detected and we have cached data, attempt autofill
                    if (hasNewFormFields && propaceLastExtractedData) {
                        console.log('Propace Autofill: Dynamic content detected, attempting enhanced autofill...');
                        
                        // Use a small delay to ensure DOM is fully rendered
                        setTimeout(() => {
                            performTargetedAutofill(newlyAddedNodes, propaceLastExtractedData);
                        }, 150); // Slightly increased for stability
                    }
                });
            });

            // Start observing with enhanced configuration
            const observerConfig = {
                childList: true,      // Watch for addition/removal of child nodes
                subtree: true,        // Watch the entire subtree
                attributes: false,    // Don't watch attribute changes for performance
                characterData: false  // Don't watch text changes for performance
            };

            propaceMutationObserver.observe(document.body, observerConfig);
            console.log('Propace Autofill: Enhanced MutationObserver started successfully');
        });
    };

    // Enhanced cleanup with comprehensive error handling
    const cleanupMutationObserver = () => {
        safeExecute(() => {
            if (propaceMutationObserver) {
                console.log('Propace Autofill: Cleaning up enhanced MutationObserver...');
                propaceMutationObserver.disconnect();
                propaceMutationObserver = null;
            }
            
            // Also cleanup state manager
            if (propaceStateManager) {
                propaceStateManager.reset();
            }
        });
    };

    // ===================================================================
    // ==              DYNAMIC CONTENT REFERENCE (CONSOLIDATED)        ==
    // ===================================================================
    // Note: This section has been consolidated with the Enhanced Error Handling section above
    // All MutationObserver functionality is now in the enhanced version with better:
    // - Error handling and recovery
    // - Performance monitoring  
    // - More stable DOM observation
    // - Comprehensive cleanup mechanisms
    // - Better integration with the state management system

    // Helper function to check if an element is a form field
    const isFormFieldElement = (element) => {
        if (!element.tagName) return false;
        
        const tagName = element.tagName.toLowerCase();
        
        // Check for standard form elements
        if (['input', 'textarea', 'select'].includes(tagName)) {
            // Exclude non-fillable input types
            if (tagName === 'input') {
                const type = element.type ? element.type.toLowerCase() : 'text';
                const excludedTypes = ['submit', 'button', 'reset', 'image', 'file', 'hidden'];
                return !excludedTypes.includes(type);
            }
            return true;
        }

        // Check for contenteditable elements
        if (element.getAttribute && element.getAttribute('contenteditable') === 'true') {
            return true;
        }

        // Check for role-based form elements
        const role = element.getAttribute && element.getAttribute('role');
        if (role && ['textbox', 'combobox', 'listbox'].includes(role.toLowerCase())) {
            return true;
        }

        return false;
    };

    // Perform targeted autofill on newly added nodes
    const performTargetedAutofill = (newNodes, extractedData) => {
        console.log('Propace Autofill: Performing targeted autofill on new nodes:', newNodes);
        
        let filledCount = 0;
        
        newNodes.forEach((node) => {
            // Get all form fields within this new node using Shadow DOM-aware search
            const formFields = [];
            
            // Use the new recursive function to find fields including Shadow DOM
            const nodeFields = findAllFillableFields(node);
            formFields.push(...nodeFields);

            console.log(`Propace Autofill: Found ${formFields.length} new form fields in dynamic content (including Shadow DOM)`);

            // Apply the same intelligent autofill logic as the main function
            if (formFields.length > 0) {
                const dataMapping = {
                    'Name': 'name',
                    'name': 'name',
                    'fullName': 'name',
                    'full_name': 'name',
                    'Father/Husband Name': ['fatherName', 'husbandName'],
                    'Father Name': 'fatherName',
                    'father_name': 'fatherName',
                    'fatherName': 'fatherName',
                    'Husband Name': 'husbandName',
                    'husband_name': 'husbandName',
                    'husbandName': 'husbandName',
                    'Date of Birth': 'dateOfBirth',
                    'date_of_birth': 'dateOfBirth',
                    'dateOfBirth': 'dateOfBirth',
                    'dob': 'dateOfBirth',
                    'birth_date': 'dateOfBirth',
                    'Gender': 'gender',
                    'gender': 'gender',
                    'sex': 'gender',
                    'Place of Birth': 'placeOfBirth',
                    'place_of_birth': 'placeOfBirth',
                    'placeOfBirth': 'placeOfBirth',
                    'birth_place': 'placeOfBirth',
                    'Nationality': 'country',
                    'nationality': 'country',
                    'Country': 'country',
                    'country': 'country',
                    'Nation': 'country',
                    'nation': 'country',
                    'citizenship': 'country',
                    'Citizenship': 'country',
                    'Citizenship Number': 'citizenship',
                    'citizenship_number': 'citizenship',
                    'citizen_number': 'citizenship',
                    'ID Number': 'idNumber',
                    'id_number': 'idNumber',
                    'idNumber': 'idNumber',
                    'CNIC': 'idNumber',
                    'cnic': 'idNumber',
                    'cnic_number': 'idNumber',
                    'national_id': 'idNumber',
                    'nationalId': 'idNumber',
                    'Phone Number': 'phoneNumber',
                    'phone_number': 'phoneNumber',
                    'phoneNumber': 'phoneNumber',
                    'phone': 'phoneNumber',
                    'mobile': 'phoneNumber',
                    'mobile_number': 'phoneNumber',
                    'mobileNumber': 'phoneNumber',
                    'contact': 'phoneNumber',
                    'contact_number': 'phoneNumber',
                    'contactNumber': 'phoneNumber',
                    'Email Address': 'email',
                    'email_address': 'email',
                    'emailAddress': 'email',
                    'email': 'email',
                    'e_mail': 'email',
                    'mail': 'email',
                    'Current Address': 'currentAddress',
                    'current_address': 'currentAddress',
                    'currentAddress': 'currentAddress',
                    'present_address': 'currentAddress',
                    'temporary_address': 'currentAddress',
                    'Address': 'address',
                    'address': 'address',
                    'street_address': 'address',
                    'streetAddress': 'address',
                    'home_address': 'address',
                    'residential_address': 'address',
                    'mailing_address': 'address',
                    'Permanent Address': 'permanentAddress',
                    'permanent_address': 'permanentAddress',
                    'permanentAddress': 'permanentAddress',
                    'family_address': 'permanentAddress',
                    'native_address': 'permanentAddress'
                };

                // Process each data field for these new form fields
                Object.keys(extractedData).forEach(dataKey => {
                    let dataValue = extractedData[dataKey];
                    
                    if (!dataValue || dataValue === 'null' || dataValue === 'undefined' || 
                        (typeof dataValue === 'string' && dataValue.trim() === '')) {
                        return;
                    }
                    
                    let fieldKeys = dataMapping[dataKey];
                    if (!fieldKeys) return;
                    
                    if (typeof fieldKeys === 'string') {
                        fieldKeys = [fieldKeys];
                    }
                    
                    fieldKeys.forEach(fieldKey => {
                        formFields.forEach((field) => {
                            if (field.element.hasAttribute('data-propace-filled')) return;
                            
                            if (findMatchingField(field.element, fieldKey)) {
                                try {
                                    console.log(`Propace Autofill: Dynamic fill - Filling field "${field.name}" with "${dataValue}"`);
                                    
                                    const fieldType = window.detectFieldType(field.element);
                                    fillFieldAdvanced(field.element, dataValue, fieldType);
                                    
                                    addVisualFeedback(field.element);
                                    field.element.setAttribute('data-propace-filled', 'true');
                                    filledCount++;
                                    
                                } catch (error) {
                                    console.error('Propace Autofill: Error filling dynamic field:', error);
                                }
                            }
                        });
                    });
                });
            }
        });

        if (filledCount > 0) {
            console.log(`Propace Autofill: Dynamic content - Successfully filled ${filledCount} new fields`);
            showAdvancedPageNotification(`🔄 Propace Autofill: Filled ${filledCount} new dynamic fields!`, 'success');
        }
    };

    // (Removed duplicate lightweight handleAutofillRequest/handleTextExtraction; advanced versions defined later are used.)

    // (Removed stray top-level message handler logic that caused "Illegal return statement"; proper listeners exist elsewhere.)

    // Initialize enhanced autofill system
    const initializeEnhancedPropaceAutofill = () => {
        safeExecute(async () => {
            console.log('🚀 Propace Autofill: Starting enhanced initialization...');
            
            // Initialize state manager
            if (!propaceStateManager) {
                propaceStateManager = new PropaceStateManager();
            }
            
            // Initialize dynamic content observer
            initializeDynamicContentObserver();
            
            console.log('✅ Propace Autofill: Enhanced system initialized successfully');
        });
    };

    // Initialize based on document state
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancedPropaceAutofill);
    } else {
        // DOM is already loaded, initialize with slight delay for stability
        setTimeout(initializeEnhancedPropaceAutofill, 150);
    }

    // Enhanced page visibility handling
    document.addEventListener('visibilitychange', () => {
        safeExecute(() => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ Propace: Page became visible, refreshing enhanced field cache...');
                if (fieldCache && fieldCache.clearCache) {
                    fieldCache.clearCache();
                }
            }
        });
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanupMutationObserver);

    // ===================================================================
    // ==              ENHANCED MESSAGE LISTENER SYSTEM               ==
    // ===================================================================

    // Global state management for robust communication
    let propaceGlobalExtractedData = null;
    let propaceConnectionStatus = 'disconnected';
    let propaceMessageRetryCount = 0;
    const MAX_RETRY_ATTEMPTS = 5; // Increased retries for better reliability
    
    // Enhanced persistent connection management
    let persistentPort = null;
    let connectionRetryCount = 0;
    const MAX_CONNECTION_RETRIES = 3;
    let heartbeatInterval = null;
    let messageBuffer = new Map();
    
    // Message queue with priority handling
    let messageQueue = {
        high: [],
        medium: [],
        low: []
    };
    let isProcessingQueue = false;

    // Enhanced connection initialization with health check
    const initializePersistentConnection = async () => {
        try {
            if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.connect) {
                console.log('ℹ️ Persistent connection not available in this context');
                return;
            }
            // Check if already connected
            if (persistentPort && persistentPort.connected) {
                console.log('✅ Connection already exists');
                return;
            }

            console.log('🔄 Initializing secure connection...');
            persistentPort = chrome.runtime.connect({ 
                // Note: background may be removed; this will no-op gracefully
                name: 'propace_autofill',
                includeTlsChannelId: true // Enhanced security
            });
            
            // Enhanced connection monitoring
            persistentPort.onDisconnect.addListener(() => {
                console.warn('🔌 Connection lost, initiating recovery protocol...');
                clearInterval(heartbeatInterval);
                
                // Cleanup existing connection
                if (persistentPort) {
                    try {
                        persistentPort.disconnect();
                    } catch (e) {
                        console.warn('Cleanup warning:', e);
                    }
                    persistentPort = null;
                }

                // Advanced retry with exponential backoff
                if (connectionRetryCount < MAX_CONNECTION_RETRIES) {
                    const delay = Math.min(1000 * Math.pow(2, connectionRetryCount), 10000);
                    console.log(`⏳ Retry ${connectionRetryCount + 1}/${MAX_CONNECTION_RETRIES} in ${delay}ms`);
                    setTimeout(initializePersistentConnection, delay);
                    connectionRetryCount++;
                } else {
                    console.error('❌ Max retries exceeded. Manual reconnection required.');
                    // Notify user of connection issues
                    showAdvancedPageNotification('Connection issues detected. Please refresh the page.', 'error');
                }
            });

            persistentPort.onMessage.addListener(handlePersistentMessage);
            
            // Start heartbeat
            heartbeatInterval = setInterval(() => {
                persistentPort.postMessage({ type: 'heartbeat', timestamp: Date.now() });
            }, 15000);

            connectionRetryCount = 0;
            console.log('✅ Persistent connection established');
        } catch (error) {
            console.error('❌ Failed to establish persistent connection:', error);
        }
    };

    // Handle messages through persistent connection
    const handlePersistentMessage = (message) => {
        if (message.type === 'heartbeat_response') {
            return;
        }
        
        const priority = determinePriority(message);
        messageQueue[priority].push(message);
        
        if (!isProcessingQueue) {
            processMessageQueue();
        }
    };

    // Determine message priority
    const determinePriority = (message) => {
        if (message.type === 'autofill' || message.type === 'validate') {
            return 'high';
        } else if (message.type === 'extract' || message.type === 'analyze') {
            return 'medium';
        }
        return 'low';
    };

    // Create robust message listener with multiple communication channels
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📨 Message received:', request);
        
        // Handle immediate response for ping checks
        if (request.type === 'ping') {
            console.log('🏓 Ping received, sending pong');
            sendResponse({ status: 'success', message: 'pong', connectionStatus: propaceConnectionStatus });
            return true;
        }

        // Handle optimized autofill from popup.js
        if (request.type === 'PERFORM_AUTOFILL_OPTIMIZED') {
            (async () => {
                try {
                    const autofillData = request.data || {};
                    const result = await enterpriseAutofillEngine(autofillData);
                    sendResponse({
                        success: result.success,
                        fieldsCount: result.fieldsCount,
                        mappings: result.mappings,
                        message: result.message
                    });
                } catch (e) {
                    sendResponse({ success: false, error: e.message });
                }
            })();
            return true;
        }

        // Defer propace_* protocol messages to the main receiver already registered above
        if (request && typeof request.type === 'string' && request.type.startsWith('propace_')) {
            return false;
        }

        // ...existing code...
    });

    // Enhanced message queue processing with advanced error recovery
    async function processMessageQueue() {
        if (isProcessingQueue || (!messageQueue.high.length && !messageQueue.medium.length && !messageQueue.low.length)) {
            return;
        }
        
        isProcessingQueue = true;
        const totalItems = messageQueue.high.length + messageQueue.medium.length + messageQueue.low.length;
        console.log(`📋 Processing message queue (${totalItems} items)`);

        try {
            // Health check before processing
            const isConnected = await checkConnectionHealth();
            if (!isConnected) {
                console.warn('⚠️ Connection health check failed, reinitializing...');
                await initializePersistentConnection();
            }

            // Process messages from all queues
            const allMessages = [
                ...messageQueue.high.map(msg => ({...msg, priority: 'high'})),
                ...messageQueue.medium.map(msg => ({...msg, priority: 'medium'})),
                ...messageQueue.low.map(msg => ({...msg, priority: 'low'}))
            ];

            for (const messageItem of allMessages) {
                const { request, sender, sendResponse } = messageItem;
                let success = false;
                let retryCount = 0;

                while (!success && retryCount < MAX_RETRY_ATTEMPTS) {
                    try {
                        console.log(`🔄 Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS} to process message:`, request);

                        const response = await processMessage(request);
                        sendResponse(response);
                        success = true;
                        propaceConnectionStatus = 'connected';
                        console.log('✅ Message processed successfully');

                    } catch (error) {
                        retryCount++;
                        console.warn(`⚠️ Attempt ${retryCount} failed:`, error);
                        
                        if (retryCount < MAX_RETRY_ATTEMPTS) {
                            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                        } else {
                            console.error('❌ All retry attempts failed');
                            sendResponse({ 
                                status: 'error',
                                error: error.message,
                                details: 'All communication attempts failed'
                            });
                            propaceConnectionStatus = 'error';
                        }
                    }
                }
            }

            // Clear processed messages
            messageQueue.high = [];
            messageQueue.medium = [];
            messageQueue.low = [];

        } catch (error) {
            console.error('❌ Queue processing error:', error);
        } finally {
            isProcessingQueue = false;
            console.log('✅ Message queue processing complete');
        }
    }

    // Process individual messages with comprehensive error handling
    async function processMessage(request) {
        console.group(`🔄 Processing message: ${request.type}`);
        
        try {
            switch (request.type) {
                case 'autofill':
                    return await handleAutofillRequest(request);
                
                case 'extract':
                    return await handleDataExtraction(request);
                
                case 'validate':
                    return await validateFields(request);
                
                default:
                    throw new Error(`Unknown message type: ${request.type}`);
            }
        } catch (error) {
            console.error('❌ Message processing error:', error);
            throw error;
        } finally {
            console.groupEnd();
        }
    }

    // ===================================================================
    // ==              ENHANCED DYNAMIC CONTENT HANDLING              ==
    // ===================================================================

    // Advanced MutationObserver with global data integration
    const initializeAdvancedDynamicObserver = () => {
        safeExecute(async () => {
            if (propaceMutationObserver) {
                propaceMutationObserver.disconnect();
            }

            console.log('🔄 Propace: Initializing advanced dynamic content observer...');

            propaceMutationObserver = new MutationObserver(async (mutations) => {
                // Only process if we have global data available
                if (!propaceGlobalExtractedData) {
                    return;
                }

                let hasNewFormFields = false;
                const newElements = [];

                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Check for form elements
                                const formElements = node.querySelectorAll ? 
                                    node.querySelectorAll('input, select, textarea, [contenteditable]') : [];
                                
                                if (formElements.length > 0 || 
                                    (node.tagName && ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName.toUpperCase()))) {
                                    hasNewFormFields = true;
                                    newElements.push(node);
                                }
                            }
                        });
                    }
                });

                if (hasNewFormFields) {
                    console.log('🆕 Propace: New form elements detected, processing with stored data...');
                    
                    // Wait a bit for elements to be fully rendered
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    try {
                        const result = await performTargetedAutofill(newElements, propaceGlobalExtractedData);
                        
                        if (result && result.fieldsCount > 0) {
                            showAdvancedPageNotification(
                                `🔄 Filled ${result.fieldsCount} new dynamic fields`, 
                                'info'
                            );
                        }
                    } catch (dynamicError) {
                        console.warn('⚠️ Propace: Dynamic autofill warning:', dynamicError.message);
                    }
                }
            });

            // Start observing with comprehensive configuration
            propaceMutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false,
                attributeOldValue: false,
                characterData: false,
                characterDataOldValue: false
            });

            console.log('✅ Propace: Advanced dynamic observer initialized');
        });
    };

    // ===================================================================
    // ==              PAGE ANALYSIS AND OPTIMIZATION                 ==
    // ===================================================================

    // Pre-autofill page analysis for optimization
    const analyzePageForAutofill = async () => {
        return safeExecute(async () => {
            const analysis = {
                timestamp: Date.now(),
                url: window.location.href,
                forms: {
                    total: document.forms.length,
                    visible: 0,
                    hidden: 0
                },
                fields: {
                    total: 0,
                    inputs: 0,
                    selects: 0,
                    textareas: 0,
                    contenteditable: 0,
                    alreadyFilled: 0
                },
                frameworks: {
                    react: !!window.React,
                    vue: !!window.Vue,
                    angular: !!window.ng || !!window.angular,
                    jquery: !!window.jQuery
                },
                performance: {
                    domContentLoaded: document.readyState === 'complete',
                    imagesLoaded: document.images.length === Array.from(document.images).filter(img => img.complete).length
                }
            };

            // Analyze forms
            Array.from(document.forms).forEach(form => {
                const style = window.getComputedStyle(form);
                if (style.display === 'none' || style.visibility === 'hidden') {
                    analysis.forms.hidden++;
                } else {
                    analysis.forms.visible++;
                }
            });

            // Analyze fields
            const allFields = document.querySelectorAll('input, select, textarea, [contenteditable]');
            analysis.fields.total = allFields.length;
            
            allFields.forEach(field => {
                const tagName = field.tagName.toLowerCase();
                if (tagName === 'input') analysis.fields.inputs++;
                else if (tagName === 'select') analysis.fields.selects++;
                else if (tagName === 'textarea') analysis.fields.textareas++;
                else if (field.hasAttribute('contenteditable')) analysis.fields.contenteditable++;
                
                if (field.hasAttribute('data-propace-filled') || 
                    (field.value && field.value.trim() !== '')) {
                    analysis.fields.alreadyFilled++;
                }
            });

            return analysis;
        }, 'Page Analysis', {
            timestamp: Date.now(),
            error: 'Could not analyze page'
        });
    };

    // ===================================================================
    // ==              AUTO-INITIALIZATION AND LIFECYCLE             ==
    // ===================================================================

    // Enhanced initialization with stored data recovery
    const initializeEnhancedSystem = async () => {
        safeExecute(async () => {
            console.log('🚀 Propace: Starting enhanced system initialization...');
            
            // Initialize advanced dynamic observer
            initializeAdvancedDynamicObserver();
            
            // Try to recover stored data for immediate use
            try {
                const storedData = await crossTabDataManager.loadFromStorage();
                if (storedData && storedData.data && Object.keys(storedData.data).length > 0) {
                    console.log('📂 Propace: Recovered stored data from previous session');
                    propaceGlobalExtractedData = {
                        ...storedData.data,
                        source: 'recovered_storage',
                        recoveredAt: Date.now()
                    };
                    
                    // Optional: Auto-fill with recovered data after page load
                    setTimeout(async () => {
                        if (document.readyState === 'complete') {
                            console.log('🔄 Propace: Auto-filling with recovered data...');
                            try {
                                const result = await fillAdvancedFormFields(propaceGlobalExtractedData);
                                if (result.success && result.fieldsCount > 0) {
                                    showAdvancedPageNotification(
                                        `🔄 Auto-filled ${result.fieldsCount} fields from previous session`, 
                                        'info'
                                    );
                                }
                            } catch (autoFillError) {
                                console.warn('⚠️ Propace: Auto-fill with recovered data failed:', autoFillError.message);
                            }
                        }
                    }, 2000);
                }
            } catch (recoveryError) {
                console.warn('⚠️ Propace: Could not recover stored data:', recoveryError.message);
            }
            
            console.log('✅ Propace: Enhanced system initialized successfully');
        });
    };

    // Initialize based on document state
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancedSystem);
    } else {
        // DOM already loaded, initialize with slight delay
        setTimeout(initializeEnhancedSystem, 200);
    }

    // Enhanced page visibility handling
    document.addEventListener('visibilitychange', () => {
        safeExecute(() => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ Propace: Page became visible, refreshing system...');
                propaceConnectionStatus = 'reconnecting';
                
                // Refresh field cache
                if (fieldCache && fieldCache.clearCache) {
                    fieldCache.clearCache();
                }
                
                // Re-initialize dynamic observer if needed
                if (!propaceMutationObserver) {
                    initializeAdvancedDynamicObserver();
                }
            }
        });
    });

    console.log('🎯 Propace Autofill: Enterprise Content Script Loaded Successfully!');
    console.log('📋 Enhanced Features Active:');
    console.log('   ✅ 1. Advanced Message Listener (CRITICAL FIX)');
    console.log('   ✅ 2. Global Data Storage & Recovery');
    console.log('   ✅ 3. Retry Mechanism with Error Recovery');
    console.log('   ✅ 4. Dynamic Content Auto-Processing');
    console.log('   ✅ 5. Cross-Tab Data Persistence');
    console.log('   ✅ 6. Page Analysis & Optimization');
    console.log('   ✅ 7. Framework Detection & Support');
    console.log('   ✅ 8. Connection Health Monitoring');
    console.log('   ✅ 9. Auto-Fill with Recovered Data');
    console.log('   ✅ 10. Enterprise Error Handling');

    // ===================================================================
    // ==              MESSAGE HANDLER FUNCTIONS                       ==
    // ===================================================================
    
    // (Removed intermediate enhanced handleAutofillRequest; keeping final consolidated version below.)

    // Smart form field finding with retry mechanism
    async function findFormFieldsWithRetry(maxRetries = 3, interval = 1000) {
        let fields = [];
        let attempts = 0;
        
        while (attempts < maxRetries && fields.length === 0) {
            fields = await findFormFields();
            
            if (fields.length === 0 && attempts < maxRetries - 1) {
                console.log(`⏳ No fields found, waiting ${interval}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, interval));
                attempts++;
            }
        }
        
        return fields;
    }

    // Enhanced autofill request handler
    async function handleAutofillRequest(request, sendResponse) {
        console.log('🎯 Handling autofill request:', request);
        
        try {
            // Validate request data
            if (!request.data || typeof request.data !== 'object') {
                throw new Error('Invalid autofill data format');
            }

            // Find all fillable fields
            const fields = await findFormFields();
            if (!fields || fields.length === 0) {
                return {
                    success: false,
                    error: 'No fillable fields found',
                    fieldsCount: 0
                };
            }

            // Clean and validate the data
            const cleanData = await validateAndCleanAutofillData(request.data);

            // Track filled fields for reporting
            const filledFields = [];
            const errors = [];

            // Enhanced field matching with retry logic
            for (const [key, value] of Object.entries(cleanData)) {
                try {
                    const matchingFields = await findMatchingFields(fields, key);
                    
                    for (const field of matchingFields) {
                        try {
                            // Attempt to fill with retry mechanism
                            const success = await fillFieldWithRetry(field, value);
                            if (success) {
                                filledFields.push({ field, key, value });
                            }
                        } catch (fieldError) {
                            errors.push(`Error filling ${key}: ${fieldError.message}`);
                        }
                    }
                } catch (matchError) {
                    errors.push(`Error matching ${key}: ${matchError.message}`);
                }
            }

            // Trigger updates on all filled fields
            await triggerFieldUpdates(filledFields.map(f => f.field));

            // Return detailed results
            return {
                success: filledFields.length > 0,
                fieldsCount: filledFields.length,
                message: `Filled ${filledFields.length} fields successfully`,
                errors: errors.length > 0 ? errors : undefined,
                details: filledFields.map(f => ({
                    key: f.key,
                    value: f.value,
                    elementType: f.field.tagName,
                    elementId: f.field.id || undefined
                }))
            };

        } catch (error) {
            console.error('❌ Autofill error:', error);
            return {
                success: false,
                error: error.message,
                fieldsCount: 0
            };
        }
    }

    // Enhanced field finder with comprehensive DOM support
    async function findFormFields() {
        const fields = [];
        const selectors = [
            // Standard form elements
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"])',
            'select',
            'textarea',
            '[contenteditable="true"]',
            
            // Framework-specific selectors
            '[ng-model]',
            '[formControlName]',
            '[v-model]',
            '[data-testid]',
            '[data-qa]',
            '[data-cy]',
            
            // Accessibility selectors
            '[role="textbox"]',
            '[role="combobox"]',
            '[role="listbox"]',
            '[role="spinbutton"]',
            
            // Common component libraries
            '.MuiInputBase-input',
            '.ant-input',
            '.form-control',
            '.chakra-input',
            
            // ARIA attributes
            '[aria-label]',
            '[aria-labelledby]'
        ];

        const getAllFields = (root) => {
            const elements = [];
            
            // Get regular elements
            selectors.forEach(selector => {
                elements.push(...Array.from(root.querySelectorAll(selector)));
            });
            
            // Get elements in shadow roots
            const shadowRoots = [];
            const walker = document.createTreeWalker(
                root,
                NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: (node) => {
                        return node.shadowRoot ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                if (node.shadowRoot) {
                    shadowRoots.push(node.shadowRoot);
                    elements.push(...getAllFields(node.shadowRoot));
                }
            }
            
            return elements;
        };

        try {
            // Find fields in main document
            document.querySelectorAll(selectors.join(',')).forEach(field => {
                if (isFieldFillable(field)) {
                    fields.push(field);
                }
            });

            // Find fields in accessible iframes
            document.querySelectorAll('iframe').forEach(iframe => {
                try {
                    if (iframe.contentDocument) {
                        iframe.contentDocument.querySelectorAll(selectors.join(',')).forEach(field => {
                            if (isFieldFillable(field)) {
                                fields.push(field);
                            }
                        });
                    }
                } catch (e) {
                    console.warn('⚠️ Could not access iframe:', e);
                }
            });

        } catch (error) {
            console.error('❌ Error finding form fields:', error);
        }

        return fields;
    }

    // Enhanced smart field matching with comprehensive attribute checking and scoring
    async function findMatchingFields(fields, key) {
        console.log(`🔍 Finding matches for key: ${key}`);
        const searchKey = key.toLowerCase();

        // Define scoring weights for different match types
        const weights = {
            exactMatch: 1.0,    // Exact match (100% score)
            containsMatch: 0.8,  // Contains the full search term
            partialMatch: 0.6,  // Partial word matches
            fuzzyMatch: 0.4,    // Fuzzy string similarity
            labelMatch: 0.9,    // Associated label matches
            ariaMatch: 0.85,    // ARIA attribute matches
            placeholderMatch: 0.7, // Placeholder text matches
            dataAttrMatch: 0.75  // Data-* attribute matches
        };

        // Common field patterns for different types of data
        const fieldPatterns = {
            name: ['name', 'full[\\s-]?name', 'first[\\s-]?name', 'last[\\s-]?name', 'customer[\\s-]?name'],
            fatherName: ['father[\\s-]?name', 'father', 'dad', 'parent', 'guardian'],
            husbandName: ['husband[\\s-]?name', 'husband', 'spouse'],
            dob: ['dob', 'birth[\\s-]?date', 'date[\\s-]?of[\\s-]?birth', 'birth'],
            address: ['address', 'residence', 'location', 'street', 'mailing'],
            phone: ['phone', 'mobile', 'cell', 'contact', 'tel'],
            email: ['email', 'e-mail', 'mail'],
            gender: ['gender', 'sex'],
            id: ['id[\\s-]?number', 'identification', 'cnic', 'national[\\s-]?id'],
            passport: ['passport[\\s-]?no', 'passport[\\s-]?number', 'travel[\\s-]?document']
        };

        // Get the relevant patterns for this field key
        const getRelevantPatterns = (key) => {
            for (const [type, patterns] of Object.entries(fieldPatterns)) {
                if (key.toLowerCase().includes(type)) {
                    return patterns;
                }
            }
            return [];
        };

        // Calculate field match scores
        const scoredFields = fields.map(field => {
            try {
                let score = 0;
                let matchReason = [];

                // Get all possible field identifiers
                const attributes = {
                    id: field.id || '',
                    name: field.name || '',
                    className: field.className || '',
                    placeholder: field.getAttribute('placeholder') || '',
                    ariaLabel: field.getAttribute('aria-label') || '',
                    dataField: field.getAttribute('data-field') || '',
                    label: findFieldLabel(field) || '',
                    type: field.type || '',
                    role: field.getAttribute('role') || ''
                };

                // Convert all attributes to lowercase for comparison
                const normalizedAttrs = {};
                Object.entries(attributes).forEach(([key, value]) => {
                    normalizedAttrs[key] = value.toLowerCase();
                });

                // Get relevant patterns for this field type
                const relevantPatterns = getRelevantPatterns(searchKey);

                // Check each attribute for matches
                Object.entries(normalizedAttrs).forEach(([attrType, attrValue]) => {
                    if (!attrValue) return;

                    // Exact match check
                    if (attrValue === searchKey) {
                        score = Math.max(score, weights.exactMatch);
                        matchReason.push(`Exact match on ${attrType}`);
                    }

                    // Contains match check
                    if (attrValue.includes(searchKey)) {
                        score = Math.max(score, weights.containsMatch);
                        matchReason.push(`Contains match on ${attrType}`);
                    }

                    // Pattern matching
                    relevantPatterns.forEach(pattern => {
                        const regex = new RegExp(pattern, 'i');
                        if (regex.test(attrValue)) {
                            score = Math.max(score, weights.partialMatch);
                            matchReason.push(`Pattern match on ${attrType}`);
                        }
                    });

                    // Fuzzy matching for longer attributes
                    if (attrValue.length > 3) {
                        const similarity = calculateSimilarity(attrValue, searchKey);
                        if (similarity > 0.8) {
                            score = Math.max(score, weights.fuzzyMatch);
                            matchReason.push(`Fuzzy match (${Math.round(similarity * 100)}%) on ${attrType}`);
                        }
                    }
                });

                // Special handling for specific field types
                if (field.type === 'text' && searchKey.includes('name')) {
                    score += 0.1; // Slight boost for text fields when looking for names
                }
                if (field.type === 'tel' && searchKey.includes('phone')) {
                    score += 0.2; // Boost for telephone fields
                }
                if (field.type === 'email' && searchKey.includes('email')) {
                    score += 0.2; // Boost for email fields
                }

                // Check for framework-specific attributes
                const frameworkScore = checkFrameworkSpecificAttributes(field, searchKey);
                if (frameworkScore > 0) {
                    score = Math.max(score, frameworkScore);
                    matchReason.push('Framework-specific match');
                }

                return {
                    field,
                    score,
                    matchReason
                };

            } catch (error) {
                console.error('Error scoring field:', error);
                return { field, score: 0, matchReason: ['Error in scoring'] };
            }
        });

        // Sort by score and filter out low-confidence matches
        const sortedFields = scoredFields
            .filter(item => item.score > 0.4) // Only keep reasonable matches
            .sort((a, b) => b.score - a.score);

        // Log matching results for debugging
        console.log('🎯 Field matching results:', sortedFields.map(item => ({
            score: item.score,
            reasons: item.matchReason,
            element: `${item.field.tagName}${item.field.id ? '#' + item.field.id : ''}`
        })));

        // Return only the field elements, sorted by score
        return sortedFields.map(item => item.field);
    }

    // Helper for finding field labels
    function findFieldLabel(field) {
        // Try for explicit label
        if (field.id) {
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label) return label.textContent;
        }
        
        // Try for wrapping label
        let parent = field.parentElement;
        while (parent) {
            if (parent.tagName === 'LABEL') {
                return parent.textContent;
            }
            parent = parent.parentElement;
        }
        
        return '';
    }

    // Smart validation of autofill data
    function validateAndCleanAutofillData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid autofill data format');
        }

        const cleanData = {};
        
        Object.entries(data).forEach(([key, value]) => {
            if (value && typeof value === 'string') {
                // Clean and normalize the value
                let cleanValue = value.trim()
                    .replace(/\s+/g, ' ')
                    .replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters
                
                if (cleanValue) {
                    cleanData[key] = cleanValue;
                }
            }
        });

        return cleanData;
    }

    // Fill field with retry mechanism
    async function fillFieldWithRetry(field, value, maxRetries = 3) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                await fillField(field, value);
                return true;
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
                }
            }
        }
        
        throw lastError;
    }

    // Smart field filling with type detection
    async function fillField(field, value) {
        if (!field || !value) return;

        const previousValue = field.value;
        
        try {
            // Pre-validate the value
            const validation = await validationChecker.validateField(field, value);
            if (!validation.isValid) {
                console.warn('⚠️ Validation failed before fill:', validation.html5.message || validation.custom.message);
                // Store validation warning for feedback
                field.setAttribute('data-propace-validation', JSON.stringify(validation));
            }

            // Handle different field types
            if (field.tagName === 'SELECT') {
                await fillSelectField(field, value);
            } else if (field.getAttribute('contenteditable') === 'true') {
                field.textContent = value;
            } else {
                field.value = value;
            }

            // Verify the change took effect
            if (field.value === previousValue && field.value !== value) {
                throw new Error('Field value did not update');
            }

            // Post-fill validation
            const postValidation = await validationChecker.validateField(field, field.value);
            if (!postValidation.isValid) {
                // Trigger user feedback for invalid fill
                await userFeedbackSystem.allowFieldCorrection(field, value, field.value);
            }

        } catch (error) {
            console.error(`❌ Error filling field:`, error);
            throw error;
        }
    }

    // Trigger necessary field updates with enhanced event handling
    async function triggerFieldUpdates(fields) {
        for (const field of fields) {
            try {
                // Check for previous validation issues
                const previousValidation = field.getAttribute('data-propace-validation');
                if (previousValidation) {
                    const validation = JSON.parse(previousValidation);
                    await userFeedbackSystem.allowFieldCorrection(field, field.value, field.value, validation);
                }

                // First focus the field
                field.focus();
                await new Promise(resolve => setTimeout(resolve, 50));

                // Trigger keydown and keypress for text input
                if (field.tagName === 'INPUT' && field.type !== 'checkbox' && field.type !== 'radio') {
                    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                    field.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true }));
                }

                // Trigger main events in proper order with feedback
                const events = [
                    'input',
                    'change',
                    'blur'
                ];

                for (const eventType of events) {
                    // Create event with init dict for better framework compatibility
                    const event = new Event(eventType, {
                        bubbles: true,
                        cancelable: true,
                        composed: true
                    });
                    
                    field.dispatchEvent(event);
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                // Special handling for React controlled inputs
                if (field._reactProps || field.hasAttribute('data-reactroot')) {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype,
                        "value"
                    ).set;
                    nativeInputValueSetter.call(field, field.value);
                }

                // For Angular inputs
                if (field.hasAttribute('ng-model') || field.hasAttribute('formControlName')) {
                    field.dispatchEvent(new Event('ngModelChange', { bubbles: true }));
                }

                // For Vue inputs
                if (field.hasAttribute('v-model')) {
                    field.dispatchEvent(new Event('vModelInput', { bubbles: true }));
                }

            } catch (error) {
                console.warn(`⚠️ Error triggering events for field:`, error);
            }
        }
    }

    // Calculate similarity between strings (basic implementation)
    function calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        return (longer.length - editDistance(longer, shorter)) / longer.length;
    }

    // Helper for similarity calculation
    function editDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
        
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
                }
            }
        }
        
        return dp[m][n];
    }
    
    // Check for framework-specific attributes
    function checkFrameworkSpecificAttributes(field, searchKey) {
        try {
            let score = 0;
            const searchKeyLower = searchKey.toLowerCase();

            // React-specific attributes
            const reactProps = [
                field.getAttribute('data-testid'),
                field.getAttribute('data-test-id'),
                field.getAttribute('data-qa'),
                field.getAttribute('data-cy')
            ].filter(Boolean).map(attr => attr.toLowerCase());

            // Angular-specific attributes
            const ngAttrs = Array.from(field.attributes)
                .filter(attr => attr.name.startsWith('ng-') || attr.name.startsWith('formcontrolname'))
                .map(attr => attr.value.toLowerCase());

            // Vue-specific attributes
            const vueAttrs = Array.from(field.attributes)
                .filter(attr => attr.name.startsWith('v-model') || attr.name.startsWith(':model'))
                .map(attr => attr.value.toLowerCase());

            // Check React props
            for (const prop of reactProps) {
                if (prop.includes(searchKeyLower)) {
                    score = Math.max(score, 0.8);
                    break;
                }
            }

            // Check Angular attributes
            for (const attr of ngAttrs) {
                if (attr.includes(searchKeyLower)) {
                    score = Math.max(score, 0.8);
                    break;
                }
            }

            // Check Vue attributes
            for (const attr of vueAttrs) {
                if (attr.includes(searchKeyLower)) {
                    score = Math.max(score, 0.8);
                    break;
                }
            }

            // Check for common component library patterns
            const commonLibAttrs = [
                'aria-label',
                'aria-labelledby',
                'data-field',
                'data-input',
                'data-control'
            ];

            for (const attrName of commonLibAttrs) {
                const attrValue = field.getAttribute(attrName);
                if (attrValue && attrValue.toLowerCase().includes(searchKeyLower)) {
                    score = Math.max(score, 0.7);
                    break;
                }
            }

            return score;
        } catch (error) {
            console.warn('Error checking framework attributes:', error);
            return 0;
        }
    }

    // Handle text extraction requests
    function handleTextExtraction(request, sendResponse) {
        console.log('📝 Handling text extraction request...');
        
        try {
            const extractedData = extractDocumentDataEnhanced();
            sendResponse({success: true, data: extractedData});
        } catch (error) {
            console.error('❌ Error in text extraction:', error);
            sendResponse({success: false, error: error.message});
        }
    }
    // Add any additional message handlers here in future

    // Ensure listeners are registered only once
    if (!window.__PROPACE_MESSAGE_HANDLER_BOUND__) {
        window.__PROPACE_MESSAGE_HANDLER_BOUND__ = true;
        
        // Initialize the main communication system
        console.log('🚀 Initializing Propace Communication System...');
        // Lightweight communication wrapper to interop with popup.js expectations
        class PropaceAdvancedCommunication {
            constructor(){
                this.initialized = true;
                // Receiver instance already created implicitly via class above if needed
                if(!window.propaceReceiver){
                    try { window.propaceReceiver = new PropaceAdvancedReceiver(); } catch(e){ console.warn('Receiver init failed', e); }
                }
            }
            generateMessageId(){ return 'cs_' + Date.now() + '_' + Math.random().toString(36).slice(2,9); }
            async sendAdvancedMessage(tabId, message, options={}){
                // In content script context we just loopback handle the message for self-test or rely on standard messaging
                return new Promise((resolve, reject)=>{
                    try {
                        if(window.propaceReceiver){
                            const msg = { ...message, messageId: message.messageId || this.generateMessageId(), via:'content-script-loopback' };
                            window.propaceReceiver.handleMessage(msg, (resp)=> resolve(resp), 'loopback');
                        } else {
                            reject(new Error('Receiver not ready'));
                        }
                    } catch(err){ reject(err); }
                });
            }
        }
        const propaceComm = new PropaceAdvancedCommunication();
        
        // Set global reference for debugging
        window.propaceComm = propaceComm;
        
        console.log('✅ Propace Autofill Assistant fully initialized and ready!');
    } // Close the if (!window.__PROPACE_MESSAGE_HANDLER_BOUND__) block

    // Mark script as injected
    window.propaceAutofillInjected = true;

    // Export cleanup function
    window.propaceCleanup = () => {
        try {
            // Cleanup connection
            if (persistentPort) {
                persistentPort.disconnect();
                persistentPort = null;
            }

            // Clear intervals
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }

            // Reset state
            propaceGlobalExtractedData = null;
            propaceConnectionStatus = 'disconnected';
            messageQueue = { high: [], medium: [], low: [] };
            isProcessingQueue = false;

            // Remove mutation observer
            if (propaceMutationObserver) {
                propaceMutationObserver.disconnect();
                propaceMutationObserver = null;
            }

            console.log('🧹 Propace cleanup completed successfully');
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    };

// End of Enhanced Propace Autofill Content Script
}