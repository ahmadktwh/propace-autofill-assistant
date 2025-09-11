// Expert-Level Standalone Settings Page Logic

document.addEventListener('DOMContentLoaded', () => {
    console.log('Settings page loaded');
    
    // DOM Elements
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const removeApiKeyBtn = document.getElementById('removeApiKeyBtn');
    const toggleVisibility = document.getElementById('toggleVisibility');
    const apiStatus = document.getElementById('apiStatus');
    const saveStatus = document.getElementById('saveStatus');
    const backBtn = document.getElementById('backBtn');
    const fieldsGrid = document.getElementById('fieldsGrid');
    const resetAllBtn = document.getElementById('resetAllBtn');
    const exportBtn = document.getElementById('exportBtn');
    const openTestFormBtn = document.getElementById('openTestFormBtn');
    
    // System Reset Elements
    const resetExtractionBtn = document.getElementById('resetExtractionBtn');
    const currentExtractionStatus = document.getElementById('currentExtractionStatus');
    const resetStatus = document.getElementById('resetStatus');
    
    // Default Fields - MUST match the AI prompt extraction fields
    const DEFAULT_FIELDS = [
        "name", "fatherHusbandName", "dateOfBirth", "gender", "nationality",
        "placeOfBirth", "idNumber", "citizenshipNumber", "passportNo", 
        "idIssueDate", "idExpiryDate", "passportIssueDate", "passportExpiryDate",
        "currentAddress", "permanentAddress"
    ];

    // Field display names for UI (maps internal field names to user-friendly names)
    const FIELD_DISPLAY_NAMES = {
        "name": "Full Name",
        "fatherHusbandName": "Father/Husband Name", 
        "dateOfBirth": "Date of Birth",
        "gender": "Gender",
        "nationality": "Nationality",
        "placeOfBirth": "Place of Birth",
        "idNumber": "ID/CNIC Number",
        "citizenshipNumber": "Citizenship Number",
        "passportNo": "Passport Number",
        "idIssueDate": "ID Issue Date",
        "idExpiryDate": "ID Expiry Date", 
        "passportIssueDate": "Passport Issue Date",
        "passportExpiryDate": "Passport Expiry Date",
        "currentAddress": "Current Address",
        "permanentAddress": "Permanent Address"
    };

    // Initialize Settings Page
    const init = async () => {
        await loadSettings();
        setupEventListeners();
        renderFields();
        await checkExtractionStatus(); // Check current extraction state
        showStatus('Settings loaded successfully', 'success');
    };

    // Load all settings from chrome.storage.local
    const loadSettings = async () => {
        try {
            let result = {};
            
            // Try chrome.storage.local first
            if (typeof chrome !== 'undefined' && chrome.storage) {
                result = await chrome.storage.local.get(['geminiApiKey', 'theme', 'selectedFields']);
            } else {
                // Fallback to localStorage for browser testing
                result = {
                    geminiApiKey: localStorage.getItem('apiKey'),
                    theme: localStorage.getItem('theme'),
                    selectedFields: JSON.parse(localStorage.getItem('selectedFields') || '{}')
                };
            }
            
            // Load API Key
            if (result.geminiApiKey) {
                apiKeyInput.dataset.originalLength = result.geminiApiKey.length.toString();
                apiKeyInput.value = '•'.repeat(Math.min(result.geminiApiKey.length, 50));
                apiKeyInput.dataset.hasKey = 'true';
                showStatus('API key loaded (secured)', 'success');
            }
            
            // Load Theme
            const theme = result.theme || 'light';
            document.body.setAttribute('data-theme', theme);
            document.querySelector(`input[name="theme"][value="${theme}"]`).checked = true;
            
            // Load Selected Fields
            window.selectedFields = result.selectedFields || DEFAULT_FIELDS.reduce((obj, field) => ({ ...obj, [field]: true }), {});
            
        } catch (error) {
            console.error('Error loading settings:', error);
            showStatus('Error loading settings', 'error');
        }
    };

    // Setup all event listeners
    const setupEventListeners = () => {
        // API Key Management
        saveApiKeyBtn.addEventListener('click', saveApiKey);
        removeApiKeyBtn.addEventListener('click', removeApiKey);
        toggleVisibility.addEventListener('click', toggleApiKeyVisibility);
        
        // System Reset & Troubleshooting
        resetExtractionBtn.addEventListener('click', resetExtractionState);
        
        // Theme Selection
        document.querySelectorAll('input[name="theme"]').forEach(input => {
            input.addEventListener('change', changeTheme);
        });
        
        // Save/Reset Options
        resetAllBtn.addEventListener('click', resetToDefaults);
        exportBtn.addEventListener('click', exportSettings);
        
        // Test Form Button
        openTestFormBtn.addEventListener('click', handleOpenTestForm);
        
        // Back Button
        backBtn.addEventListener('click', () => {
            window.close();
        });
        
        // API Key Input Validation
        apiKeyInput.addEventListener('input', validateApiKey);
    };

    // Render Field Selection Grid
    const renderFields = () => {
        fieldsGrid.innerHTML = '';
        DEFAULT_FIELDS.forEach(field => {
            const fieldOption = document.createElement('div');
            fieldOption.className = 'field-option';
            const displayName = FIELD_DISPLAY_NAMES[field] || field;
            fieldOption.innerHTML = `
                <input type="checkbox" id="field_${field.replace(/[^a-zA-Z0-9]/g, '_')}" 
                       ${window.selectedFields[field] ? 'checked' : ''}>
                <label for="field_${field.replace(/[^a-zA-Z0-9]/g, '_')}">${displayName}</label>
            `;
            
            const checkbox = fieldOption.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                window.selectedFields[field] = e.target.checked;
                saveFieldSettings();
            });
            
            fieldsGrid.appendChild(fieldOption);
        });
    };

    // API Key Management Functions
    const validateApiKey = () => {
        const key = apiKeyInput.value.trim();
        if (apiKeyInput.dataset.hasKey === 'true') return; // Skip validation for masked key
        
        if (key.length === 0) {
            hideStatus();
            return;
        }
        
        if (key.length < 10 || key.length > 200) {
            showStatus('❌ API key must be 10-200 characters', 'error');
            return;
        }
        
        if (!/^[A-Za-z0-9_.-]+$/.test(key)) {
            showStatus('❌ Invalid characters in API key', 'error');
            return;
        }
        
        showStatus('✅ API key format is valid', 'success');
    };

    const saveApiKey = async () => {
        const key = apiKeyInput.value.trim();
        
        if (apiKeyInput.dataset.hasKey === 'true') {
            showStatus('API key is already saved', 'success');
            return;
        }
        
        if (key.length < 10 || key.length > 200) {
            showStatus('❌ Invalid key length (10-200 chars)', 'error');
            return;
        }
        
        try {
            // Try chrome.storage.local first
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ 
                    geminiApiKey: key,
                    geminiKeyStatus: 'saved'
                });
                showStatus('✅ API key saved securely!', 'success');
            } else {
                // Fallback to localStorage for browser testing
                localStorage.setItem('apiKey', key);
                localStorage.setItem('geminiKeyStatus', 'saved');
                showStatus('✅ API key saved (Browser mode)', 'success');
            }
            
            // Mask the key
            maskApiKey();
            apiKeyInput.dataset.hasKey = 'true';
            apiKeyInput.type = 'password';
            
        } catch (error) {
            console.error('Error saving API key:', error);
            // Try localStorage as fallback
            try {
                localStorage.setItem('apiKey', key);
                localStorage.setItem('geminiKeyStatus', 'saved');
                showStatus('✅ API key saved (Fallback mode)', 'success');
                
                // Mask the key
                maskApiKey();
                apiKeyInput.dataset.hasKey = 'true';
                apiKeyInput.type = 'password';
            } catch (fallbackError) {
                showStatus('❌ Failed to save API key', 'error');
            }
        }
    };

    const removeApiKey = async () => {
        if (!confirm('Remove saved API key? You\'ll need to enter it again to use Extract.')) {
            return;
        }
        
        try {
            // Try chrome.storage.local first
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.remove(['geminiApiKey', 'geminiKeyStatus']);
            } else {
                // Fallback to localStorage for browser testing
                localStorage.removeItem('apiKey');
                localStorage.removeItem('geminiKeyStatus');
            }
            
            apiKeyInput.value = '';
            apiKeyInput.dataset.hasKey = 'false';
            apiKeyInput.type = 'password';
            
            showStatus('✅ API key removed successfully', 'success');
            
        } catch (error) {
            console.error('Error removing API key:', error);
            // Try localStorage fallback
            try {
                localStorage.removeItem('apiKey');
                localStorage.removeItem('geminiKeyStatus');
                showStatus('✅ API key removed (Fallback mode)', 'success');
            } catch (fallbackError) {
                showStatus('❌ Failed to remove API key', 'error');
            }
        }
    };

    const toggleApiKeyVisibility = () => {
        if (apiKeyInput.dataset.hasKey === 'true') {
            // Show actual API key if user wants to see it
            if (apiKeyInput.type === 'password') {
                // Load actual key to show it
                loadActualApiKeyForViewing();
                apiKeyInput.type = 'text';
                toggleVisibility.textContent = '🙈';
            } else {
                // Hide it again and mask it
                maskApiKey();
                apiKeyInput.type = 'password';
                toggleVisibility.textContent = '👁️';
            }
        } else {
            // Normal toggle for new key input
            if (apiKeyInput.type === 'password') {
                apiKeyInput.type = 'text';
                toggleVisibility.textContent = '🙈';
            } else {
                apiKeyInput.type = 'password';
                toggleVisibility.textContent = '👁️';
            }
        }
    };

    // Load actual API key for viewing
    const loadActualApiKeyForViewing = async () => {
        try {
            let result = {};
            if (typeof chrome !== 'undefined' && chrome.storage) {
                result = await chrome.storage.local.get(['geminiApiKey']);
            } else {
                result = { geminiApiKey: localStorage.getItem('apiKey') };
            }
            
            if (result.geminiApiKey) {
                apiKeyInput.value = result.geminiApiKey;
            }
        } catch (error) {
            console.error('Error loading API key for viewing:', error);
        }
    };

    // Mask API key (used after save and when hiding)
    const maskApiKey = () => {
        const originalLength = apiKeyInput.dataset.originalLength || apiKeyInput.value.length;
        apiKeyInput.value = '•'.repeat(Math.min(parseInt(originalLength) || 50, 50));
        apiKeyInput.dataset.originalLength = originalLength;
    };

    // Theme Management
    const changeTheme = async (e) => {
        const theme = e.target.value;
        document.body.setAttribute('data-theme', theme);
        
        try {
            // Try chrome.storage.local first
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ theme: theme });
            } else {
                // Fallback to localStorage for browser testing
                localStorage.setItem('theme', theme);
            }
            showSaveStatus(`✅ Theme changed to ${theme}`, 'success');
        } catch (error) {
            console.error('Error saving theme:', error);
            // Try localStorage fallback
            try {
                localStorage.setItem('theme', theme);
                showSaveStatus(`✅ Theme saved (Fallback mode)`, 'success');
            } catch (fallbackError) {
                showSaveStatus('❌ Failed to save theme', 'error');
            }
        }
    };

    // Field Settings
    const saveFieldSettings = async () => {
        try {
            // Try chrome.storage.local first
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ selectedFields: window.selectedFields });
            } else {
                // Fallback to localStorage for browser testing
                localStorage.setItem('selectedFields', JSON.stringify(window.selectedFields));
            }
            showSaveStatus('✅ Field selection saved', 'success');
        } catch (error) {
            console.error('Error saving fields:', error);
            // Try localStorage fallback
            try {
                localStorage.setItem('selectedFields', JSON.stringify(window.selectedFields));
                showSaveStatus('✅ Field selection saved (Fallback mode)', 'success');
            } catch (fallbackError) {
                showSaveStatus('❌ Failed to save field selection', 'error');
            }
        }
    };

    // Reset to Defaults (Only Field Selection - API Key preserved)
    const resetToDefaults = async () => {
        if (!confirm('Reset field selection to defaults? API key and theme will be preserved.')) {
            return;
        }
        
        try {
            // Reset only field selection, preserve API key and theme
            window.selectedFields = DEFAULT_FIELDS.reduce((obj, field) => ({ ...obj, [field]: true }), {});
            
            // Save the reset field selection
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ selectedFields: window.selectedFields });
            } else {
                // Fallback to localStorage for browser testing
                localStorage.setItem('selectedFields', JSON.stringify(window.selectedFields));
            }
            
            // Re-render fields grid to show changes
            renderFields();
            
            showSaveStatus('✅ Field selection reset to defaults', 'success');
            
        } catch (error) {
            console.error('Error resetting field selection:', error);
            // Try localStorage fallback
            try {
                window.selectedFields = DEFAULT_FIELDS.reduce((obj, field) => ({ ...obj, [field]: true }), {});
                localStorage.setItem('selectedFields', JSON.stringify(window.selectedFields));
                renderFields();
                showSaveStatus('✅ Field selection reset (Fallback mode)', 'success');
            } catch (fallbackError) {
                showSaveStatus('❌ Failed to reset field selection', 'error');
            }
        }
    };

    // Export Settings
    const exportSettings = async () => {
        try {
            let settings = {};
            
            // Try chrome.storage.local first
            if (typeof chrome !== 'undefined' && chrome.storage) {
                settings = await chrome.storage.local.get();
            } else {
                // Fallback to localStorage for browser testing
                settings = {
                    geminiApiKey: localStorage.getItem('apiKey'),
                    theme: localStorage.getItem('theme'),
                    selectedFields: JSON.parse(localStorage.getItem('selectedFields') || '{}')
                };
            }
            
            const exportData = {
                ...settings,
                geminiApiKey: settings.geminiApiKey ? '[PROTECTED]' : null, // Don't export actual key
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `propace-settings-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            showSaveStatus('✅ Settings exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting settings:', error);
            showSaveStatus('❌ Failed to export settings: ' + error.message, 'error');
        }
    };

    // Handle Test Form Button Click
    const handleOpenTestForm = async () => {
        try {
            console.log('🧪 Opening test form...');
            
            // Add clicked animation
            openTestFormBtn.classList.add('clicked');
            setTimeout(() => {
                openTestFormBtn.classList.remove('clicked');
            }, 600);
            
            // Get the extension's base URL
            const extensionUrl = chrome.runtime.getURL('test-form.html');
            
            // Open test form in a new tab
            await chrome.tabs.create({
                url: extensionUrl,
                active: true
            });
            
            console.log('✅ Test form opened successfully');
            
            // Show success feedback
            showNotification('Test form opened! Upload an image and test autofill.', 'success');
            
        } catch (error) {
            console.error('❌ Error opening test form:', error);
            showNotification('Failed to open test form. Please try again.', 'error');
        }
    };

    // Notification Helper
    const showNotification = (message, type = 'info') => {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Hide and remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };

    // Status Message Helpers
    const showStatus = (message, type) => {
        apiStatus.style.display = 'block';
        apiStatus.textContent = message;
        apiStatus.className = `status-message status-${type}`;
        
        // Auto-hide after 3 seconds for success messages
        if (type === 'success') {
            setTimeout(hideStatus, 3000);
        }
    };

    const hideStatus = () => {
        apiStatus.style.display = 'none';
    };

    // Save/Export Status Message Helpers
    const showSaveStatus = (message, type) => {
        saveStatus.style.display = 'block';
        saveStatus.textContent = message;
        saveStatus.className = `status-message status-${type}`;
        
        // Auto-hide after 3 seconds for success messages
        if (type === 'success') {
            setTimeout(hideSaveStatus, 3000);
        }
    };

    const hideSaveStatus = () => {
        saveStatus.style.display = 'none';
    };

    // ===================================================================
    // ==              EXTRACTION STATE RESET FUNCTIONS               ==
    // ===================================================================
    
    // Reset extraction state function
    const resetExtractionState = async () => {
        try {
            showResetStatus('Resetting extraction state...', 'info');
            
            // Reset extraction state in chrome.storage.local
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({
                    'extractionState': {
                        isExtracting: false,
                        lastResetTime: Date.now(),
                        watchdogActive: false
                    }
                });
            }
            
            // Also reset in localStorage as fallback
            localStorage.removeItem('propace_extraction_watchdog');
            localStorage.setItem('propace_extraction_reset', Date.now().toString());
            
            // Update status display
            currentExtractionStatus.textContent = 'Ready (Reset)';
            currentExtractionStatus.style.color = 'var(--success)';
            
            showResetStatus('✅ Extraction state reset successfully! Extension is now ready to use.', 'success');
            
            console.log('🔄 Extraction state reset completed');
            
            // Auto-hide success message after 5 seconds
            setTimeout(() => {
                hideResetStatus();
                currentExtractionStatus.style.color = 'var(--text-secondary)';
            }, 5000);
            
        } catch (error) {
            console.error('❌ Error resetting extraction state:', error);
            showResetStatus('❌ Failed to reset extraction state. Please try again.', 'error');
        }
    };
    
    // Check and display current extraction status
    const checkExtractionStatus = async () => {
        try {
            let isExtracting = false;
            
            // Check chrome.storage.local first
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get(['extractionState']);
                if (result.extractionState) {
                    isExtracting = result.extractionState.isExtracting;
                }
            }
            
            // Fallback to localStorage check
            if (!isExtracting) {
                const watchdog = localStorage.getItem('propace_extraction_watchdog');
                if (watchdog) {
                    const watchdogData = JSON.parse(watchdog);
                    isExtracting = watchdogData.isActive;
                }
            }
            
            // Update status display
            if (isExtracting) {
                currentExtractionStatus.textContent = 'Extracting... (Stuck?)';
                currentExtractionStatus.style.color = 'var(--danger)';
            } else {
                currentExtractionStatus.textContent = 'Ready';
                currentExtractionStatus.style.color = 'var(--success)';
            }
            
        } catch (error) {
            console.error('Error checking extraction status:', error);
            currentExtractionStatus.textContent = 'Unknown';
            currentExtractionStatus.style.color = 'var(--text-secondary)';
        }
    };
    
    // Reset status message helpers
    const showResetStatus = (message, type) => {
        resetStatus.style.display = 'block';
        resetStatus.textContent = message;
        resetStatus.className = `status-message status-${type}`;
    };
    
    const hideResetStatus = () => {
        resetStatus.style.display = 'none';
    };

    // Initialize the settings page
    init();
});
