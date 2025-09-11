// PROPACE AUTOFILL CONTENT SCRIPT - PERFORMANCE OPTIMIZED VERSION
// Optimized for production with intelligent caching, reduced logging, and streamlined field detection

(function() {
    'use strict';

    // PRODUCTION MODE: Disable most logging except errors
    const PRODUCTION_MODE = true;
    const DEBUG_LEVEL = PRODUCTION_MODE ? 'error' : 'debug'; // 'debug', 'info', 'warn', 'error', 'silent'

    // Smart logging that respects production mode
    const smartLog = {
        debug: (...args) => DEBUG_LEVEL === 'debug' && console.log('[DEBUG]', ...args),
        info: (...args) => ['debug', 'info'].includes(DEBUG_LEVEL) && console.log('[INFO]', ...args),
        warn: (...args) => ['debug', 'info', 'warn'].includes(DEBUG_LEVEL) && console.warn('[WARN]', ...args),
        error: (...args) => DEBUG_LEVEL !== 'silent' && console.error('[ERROR]', ...args),
        group: (label) => DEBUG_LEVEL === 'debug' && console.group(label),
        groupEnd: () => DEBUG_LEVEL === 'debug' && console.groupEnd(),
        time: (label) => DEBUG_LEVEL === 'debug' && console.time(label),
        timeEnd: (label) => DEBUG_LEVEL === 'debug' && console.timeEnd(label)
    };

    // Prevent multiple injections with stronger guard
    if (window.PROPACE_CONTENT_SCRIPT_OPTIMIZED) {
        smartLog.info('🔄 Optimized Propace Content Script already initialized, skipping');
        return;
    }
    window.PROPACE_CONTENT_SCRIPT_OPTIMIZED = true;

    // PERFORMANCE-OPTIMIZED FIELD CACHE SYSTEM
    class OptimizedFieldCache {
        constructor() {
            this.cache = new Map();
            this.domHash = '';
            this.lastScanTime = 0;
            this.CACHE_DURATION = 30000; // 30 seconds
            this.CACHE_SIZE_LIMIT = 50;
        }

        generateDOMHash() {
            // Lightweight DOM fingerprint for cache invalidation
            const forms = document.querySelectorAll('form');
            const inputs = document.querySelectorAll('input, select, textarea');
            return `${forms.length}-${inputs.length}-${document.body.innerHTML.length}`;
        }

        isCacheValid() {
            const currentHash = this.generateDOMHash();
            const now = Date.now();
            return (
                this.domHash === currentHash &&
                (now - this.lastScanTime) < this.CACHE_DURATION
            );
        }

        getCachedFields() {
            if (this.isCacheValid()) {
                smartLog.debug('📋 Using cached field data');
                return this.cache.get('fields');
            }
            return null;
        }

        setCachedFields(fields) {
            // Limit cache size to prevent memory issues
            if (this.cache.size > this.CACHE_SIZE_LIMIT) {
                this.cache.clear();
            }
            
            this.domHash = this.generateDOMHash();
            this.lastScanTime = Date.now();
            this.cache.set('fields', fields);
            smartLog.debug(`📋 Cached ${fields.length} fields`);
        }

        clearCache() {
            this.cache.clear();
            this.domHash = '';
            this.lastScanTime = 0;
        }
    }

    // STREAMLINED FIELD DETECTION ENGINE
    class OptimizedFieldDetector {
        constructor() {
            this.fieldCache = new OptimizedFieldCache();
            this.shadowRootCache = new WeakSet();
        }

        // Core optimized field finding - single pass, minimal logging
        findAllFillableFieldsOptimized(rootElement = document.body) {
            smartLog.time('Field Detection');
            
            // Check cache first
            const cachedFields = this.fieldCache.getCachedFields();
            if (cachedFields) {
                smartLog.timeEnd('Field Detection');
                return cachedFields;
            }

            const fields = [];
            const processedElements = new WeakSet();

            // Single recursive pass with optimized selectors
            const processElement = (element, isInShadowDOM = false) => {
                if (!element || processedElements.has(element)) return;
                processedElements.add(element);

                // Optimized field selector (combines all types in one query)
                const fieldSelector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea, [contenteditable="true"]';
                
                try {
                    // Process direct fields
                    const directFields = element.querySelectorAll(fieldSelector);
                    for (const field of directFields) {
                        if (this.isFieldFillable(field)) {
                            fields.push(this.createFieldInfo(field, isInShadowDOM));
                        }
                    }

                    // Process Shadow DOM only if not already processed
                    if (element.shadowRoot && !this.shadowRootCache.has(element.shadowRoot)) {
                        this.shadowRootCache.add(element.shadowRoot);
                        processElement(element.shadowRoot, true);
                    }

                    // Process child elements with shadow roots
                    const elementsWithShadow = element.querySelectorAll('*');
                    for (const el of elementsWithShadow) {
                        if (el.shadowRoot && !this.shadowRootCache.has(el.shadowRoot)) {
                            this.shadowRootCache.add(el.shadowRoot);
                            processElement(el.shadowRoot, true);
                        }
                    }
                } catch (error) {
                    smartLog.warn('Error processing element:', error.message);
                }
            };

            processElement(rootElement);

            // Cache the results
            this.fieldCache.setCachedFields(fields);
            
            smartLog.timeEnd('Field Detection');
            smartLog.info(`🎯 Found ${fields.length} fillable fields`);
            
            return fields;
        }

        // Optimized field validation with minimal checks
        isFieldFillable(element) {
            if (!element || element.disabled || element.readOnly) return false;
            
            // Quick visibility check
            const style = element.style;
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            
            // Basic rect check (avoid expensive getComputedStyle)
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        }

        // Streamlined field info creation
        createFieldInfo(element, isInShadowDOM = false) {
            return {
                element,
                name: element.name || element.id || element.placeholder || 'unnamed',
                type: element.type || element.tagName.toLowerCase(),
                id: element.id,
                placeholder: element.placeholder || '',
                isInShadowDOM,
                value: element.value || '',
                selector: this.generateSelector(element)
            };
        }

        // Quick selector generation for debugging
        generateSelector(element) {
            if (element.id) return `#${element.id}`;
            if (element.name) return `[name="${element.name}"]`;
            return element.tagName.toLowerCase();
        }
    }

    // OPTIMIZED AUTOFILL ENGINE
    class OptimizedAutofillEngine {
        constructor() {
            this.fieldDetector = new OptimizedFieldDetector();
            this.usedFields = new WeakSet();
            this.usedDataKeys = new Set();
        }

        // Main optimized autofill function
        async performOptimizedAutofill(extractedData) {
            smartLog.time('Total Autofill');
            smartLog.info('🚀 Starting optimized autofill process');

            try {
                // Step 1: Get fields (cached if possible)
                const fields = this.fieldDetector.findAllFillableFieldsOptimized();
                
                if (fields.length === 0) {
                    return {
                        success: false,
                        fieldsCount: 0,
                        message: 'No fillable fields found'
                    };
                }

                // Step 2: Process data mappings efficiently
                const mappingResults = this.createOptimizedMappings(extractedData, fields);
                
                // Step 3: Fill fields with conflict resolution
                const fillResults = await this.fillFieldsOptimized(mappingResults);

                smartLog.timeEnd('Total Autofill');
                
                return {
                    success: fillResults.filledCount > 0,
                    fieldsCount: fillResults.filledCount,
                    fieldsFound: fields.length,
                    message: `Successfully filled ${fillResults.filledCount} fields`,
                    duration: performance.now()
                };

            } catch (error) {
                smartLog.error('Autofill error:', error);
                return {
                    success: false,
                    fieldsCount: 0,
                    error: error.message
                };
            }
        }

        // Optimized data mapping with smart matching
        createOptimizedMappings(extractedData, fields) {
            const mappings = [];
            
            // Smart field type detection patterns (optimized)
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

            // Create mappings efficiently
            for (const [dataKey, dataValue] of Object.entries(extractedData)) {
                if (!dataValue || this.usedDataKeys.has(dataKey)) continue;

                for (const field of fields) {
                    if (this.usedFields.has(field.element)) continue;

                    const score = this.calculateMatchScore(dataKey, field, patterns);
                    if (score > 0.3) { // Minimum confidence threshold
                        mappings.push({
                            dataKey,
                            dataValue,
                            field,
                            score
                        });
                    }
                }
            }

            // Sort by score and return top matches
            return mappings.sort((a, b) => b.score - a.score);
        }

        // Fast matching score calculation
        calculateMatchScore(dataKey, field, patterns) {
            const fieldText = `${field.name} ${field.id} ${field.placeholder}`.toLowerCase();
            
            // Direct pattern matching
            for (const [patternKey, pattern] of Object.entries(patterns)) {
                if (dataKey.includes(patternKey) && pattern.test(fieldText)) {
                    return 0.9; // High confidence direct match
                }
            }

            // Fuzzy matching for common variations
            if (dataKey.includes('name') && fieldText.includes('name')) return 0.7;
            if (dataKey.includes('email') && fieldText.includes('email')) return 0.8;
            if (dataKey.includes('phone') && fieldText.includes('phone')) return 0.8;
            if (dataKey.includes('address') && fieldText.includes('address')) return 0.7;

            return 0; // No match
        }

        // Optimized field filling with minimal overhead
        async fillFieldsOptimized(mappings) {
            let filledCount = 0;
            const filledFields = [];

            for (const mapping of mappings) {
                // Skip if already used
                if (this.usedFields.has(mapping.field.element) || 
                    this.usedDataKeys.has(mapping.dataKey)) {
                    continue;
                }

                try {
                    const success = await this.fillSingleField(mapping.field.element, mapping.dataValue);
                    
                    if (success) {
                        this.usedFields.add(mapping.field.element);
                        this.usedDataKeys.add(mapping.dataKey);
                        filledCount++;
                        filledFields.push(mapping);
                        
                        smartLog.debug(`✅ Filled: ${mapping.field.name} = ${mapping.dataValue}`);
                    }
                } catch (error) {
                    smartLog.warn(`Failed to fill field ${mapping.field.name}:`, error.message);
                }
            }

            return { filledCount, filledFields };
        }

        // Core field filling logic
        async fillSingleField(element, value) {
            if (!element || !value) return false;

            try {
                // Remove readonly temporarily
                const wasReadOnly = element.readOnly;
                if (wasReadOnly) {
                    element.readOnly = false;
                }

                // Fill based on element type
                const tagName = element.tagName.toLowerCase();
                const inputType = element.type?.toLowerCase();

                if (tagName === 'select') {
                    return this.fillSelectField(element, value);
                } else if (inputType === 'checkbox') {
                    element.checked = ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
                    return true;
                } else if (inputType === 'radio') {
                    if (element.value === String(value)) {
                        element.checked = true;
                        return true;
                    }
                } else if (element.isContentEditable) {
                    element.textContent = value;
                    return true;
                } else {
                    // Standard input/textarea
                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }

                // Restore readonly
                if (wasReadOnly) {
                    element.readOnly = true;
                }

                return false;
            } catch (error) {
                smartLog.warn('Fill error:', error.message);
                return false;
            }
        }

        // Fill select dropdown
        fillSelectField(selectElement, value) {
            const options = selectElement.options;
            const valueStr = String(value).toLowerCase();

            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const optionText = option.textContent.toLowerCase();
                const optionValue = option.value.toLowerCase();

                if (optionText.includes(valueStr) || optionValue.includes(valueStr)) {
                    selectElement.selectedIndex = i;
                    selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
            }
            return false;
        }

        // Reset state for new session
        reset() {
            this.usedFields = new WeakSet();
            this.usedDataKeys = new Set();
            this.fieldDetector.fieldCache.clearCache();
        }
    }

    // Initialize optimized autofill engine
    const optimizedEngine = new OptimizedAutofillEngine();

    // Message handler for popup communication
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        smartLog.debug('📨 Message received:', message.type);

        if (message.type === 'PERFORM_AUTOFILL_OPTIMIZED') {
            optimizedEngine.performOptimizedAutofill(message.data)
                .then(result => {
                    smartLog.info('🎯 Autofill completed:', result);
                    sendResponse(result);
                })
                .catch(error => {
                    smartLog.error('💥 Autofill failed:', error);
                    sendResponse({
                        success: false,
                        fieldsCount: 0,
                        error: error.message
                    });
                });
            return true; // Keep message channel open for async response
        }

        if (message.type === 'GET_PAGE_FIELDS_COUNT_OPTIMIZED') {
            try {
                const fields = optimizedEngine.fieldDetector.findAllFillableFieldsOptimized();
                sendResponse({
                    success: true,
                    fieldsCount: fields.length,
                    fields: fields.map(f => ({
                        name: f.name,
                        type: f.type,
                        id: f.id,
                        placeholder: f.placeholder
                    }))
                });
            } catch (error) {
                sendResponse({
                    success: false,
                    fieldsCount: 0,
                    error: error.message
                });
            }
        }

        if (message.type === 'RESET_AUTOFILL_STATE') {
            optimizedEngine.reset();
            sendResponse({ success: true });
        }
    });

    // Expose optimized functions for testing (only in debug mode)
    if (!PRODUCTION_MODE) {
        window.debugOptimizedPropace = () => {
            const fields = optimizedEngine.fieldDetector.findAllFillableFieldsOptimized();
            console.table(fields.map(f => ({
                name: f.name,
                type: f.type,
                id: f.id,
                placeholder: f.placeholder,
                isInShadowDOM: f.isInShadowDOM
            })));
        };
    }

    smartLog.info('🚀 Propace Optimized Content Script loaded successfully');

})();
