/*==================================================================================================
    Propace Autofill Assistant - Advanced History Page
    -----------------------------------------------
    Developed by: Mujeeb Ahmad
    Version: 3.0 (Advanced History Management)
    Description: Standalone history page with advanced filtering, search, and management features
====================================================================================================*/

document.addEventListener('DOMContentLoaded', () => {
    console.log('History page loaded');
    
    // DOM Elements
    const historyGrid = document.getElementById('historyGrid');
    const searchInput = document.getElementById('searchInput');
    const dateFromInput = document.getElementById('dateFromInput');
    const dateToInput = document.getElementById('dateToInput');
    const documentTypeFilter = document.getElementById('documentTypeFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const historyStats = document.getElementById('historyStats');
    const loadingHistory = document.getElementById('loadingHistory');
    const emptyHistory = document.getElementById('emptyHistory');
    const backBtn = document.getElementById('backBtn');
    
    // State - Simplified
    let allHistoryData = [];
    let filteredData = [];
    let currentFilters = {
        search: '',
        dateFrom: '',
        dateTo: '',
        documentType: ''
    };
    
    // Initialize the history page
    const init = async () => {
        setupEventListeners();
        await loadHistoryData();
        applyTheme();
        console.log('History page initialized with simple scrolling');
    };
    
    // Setup all event listeners
    const setupEventListeners = () => {
        // Back button
        backBtn.addEventListener('click', () => {
            window.close();
        });
        
        // Search and filter inputs
        searchInput.addEventListener('input', handleSearch);
        dateFromInput.addEventListener('change', handleDateFilter);
        dateToInput.addEventListener('change', handleDateFilter);
        documentTypeFilter.addEventListener('change', handleDocumentTypeFilter);
        clearFiltersBtn.addEventListener('click', clearAllFilters);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
    };
    
    // Load history data from storage
    const loadHistoryData = async () => {
        try {
            showLoading(true);
            
            // Try to load from chrome.storage.local first
            let historyData = [];
            
            if (typeof chrome !== 'undefined' && chrome.storage) {
                console.log('📊 Loading history from chrome.storage.local...');
                const result = await chrome.storage.local.get(['extractionHistory']);
                historyData = result.extractionHistory || [];
                console.log('📊 Found', historyData.length, 'items in chrome.storage.local');
            } else {
                console.log('📊 Chrome storage not available, trying localStorage...');
            }
            
            if (historyData.length === 0) {
                // Fallback to localStorage
                console.log('📊 Trying localStorage fallback...');
                const stored = localStorage.getItem('propace_autofill_state');
                if (stored) {
                    const state = JSON.parse(stored);
                    historyData = state.history || [];
                    console.log('📊 Found', historyData.length, 'items in localStorage');
                }
            }
            
            console.log('📊 Total history items to process:', historyData.length);
            
            // Process and enhance history data - FILTER OUT EMPTY FIELDS
            allHistoryData = historyData.map(item => {
                // Filter out empty, null, or invalid fields from the extracted data
                const filteredData = filterValidFields(item.data || {});
                
                // Get meaningful display name from extracted data (ALWAYS reprocess)
                const displayName = getDisplayNameFromExtractedData(filteredData, item.fileName || item.documentName);
                
                // Debug logging to see what fields are available
                console.log('Processing item:', item.fileName || item.documentName);
                console.log('Available fields:', Object.keys(filteredData));
                console.log('Selected display name:', displayName);
                
                return {
                    ...item,
                    id: item.id || generateId(),
                    timestamp: item.timestamp || Date.now(),
                    documentName: displayName, // ALWAYS use fresh calculation, ignore old stored name
                    originalFileName: item.fileName || item.documentName || 'Unknown File', // Keep original for reference
                    documentType: detectDocumentType(filteredData),
                    fieldCount: Object.keys(filteredData).length, // Count only valid fields
                    data: filteredData, // Use filtered data instead of original
                    searchText: createSearchText({...item, data: filteredData, documentName: displayName})
                };
            }).sort((a, b) => b.timestamp - a.timestamp); // Most recent first
            
            filteredData = [...allHistoryData];
            updateHistoryStats();
            showLoading(false);
            
            // Render all items at once (simple approach like settings)
            renderHistory();
            
        } catch (error) {
            console.error('Error loading history data:', error);
            showError('Failed to load history data');
            showLoading(false);
        }
    };
    
    // Generate unique ID for history items
    const generateId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };
    const getDisplayNameFromExtractedData = (data, fileName) => {
        if (!data || typeof data !== 'object') {
            return fileName || 'Unknown Document';
        }
        
        const keys = Object.keys(data);
        if (keys.length === 0) {
            return fileName || 'Unknown Document';
        }
        
        // STEP 1: Look for ONLY exact "name" field (no variations, no father/husband names)
        const exactNameFields = ['name', 'Name', 'نام'];
        for (const nameField of exactNameFields) {
            if (data.hasOwnProperty(nameField) && data[nameField]) {
                const value = data[nameField].toString().trim();
                if (value.length > 0 && value.length < 100) {
                    console.log(`Using name field: ${nameField} = ${value}`);
                    return value;
                }
            }
        }
        
        // STEP 2: Explicitly avoid father/husband related fields, then look for idNumber
        const forbiddenFields = [
            'fatherName', 'fatherHusbandName', 'father name', 'husband name',
            'والد کا نام', 'شوہر کا نام', 'باپ کا نام'
        ];
        
        const idNumberFields = ['idNumber', 'ID Number', 'id number', 'cnic number', 'CNIC Number', 'شناختی کارڈ نمبر'];
        for (const idField of idNumberFields) {
            if (data.hasOwnProperty(idField) && data[idField]) {
                const value = data[idField].toString().trim();
                if (value.length > 0 && value.length < 50) {
                    console.log(`Using ID field: ${idField} = ${value}`);
                    return value;
                }
            }
        }
        
        // STEP 3: Look for any other number field but avoid forbidden fields
        for (const key of keys) {
            const keyLower = key.toLowerCase();
            
            // Skip if it's a forbidden field (father/husband related)
            const isForbidden = forbiddenFields.some(forbidden => 
                keyLower.includes(forbidden.toLowerCase()) || 
                forbidden.toLowerCase().includes(keyLower)
            );
            
            if (!isForbidden && (keyLower.includes('number') || keyLower.includes('نمبر'))) {
                const value = data[key];
                if (value && typeof value === 'string') {
                    const cleanValue = value.toString().trim();
                    if (cleanValue.length >= 3 && cleanValue.length <= 50) {
                        console.log(`Using number field: ${key} = ${cleanValue}`);
                        return cleanValue;
                    }
                }
            }
        }
        
        // STEP 4: Last resort - use filename but log it
        console.log(`No suitable field found, using filename: ${fileName}`);
        return fileName || 'Unknown Document';
    };
    
    // Create searchable text from history item
    const createSearchText = (item) => {
        const data = item.data || {};
        const fileName = item.fileName || item.documentName || '';
        const values = Object.values(data).join(' ').toLowerCase();
        const keys = Object.keys(data).join(' ').toLowerCase();
        return `${fileName} ${values} ${keys}`.toLowerCase();
    };
    
    // Detect document type from extracted data
    const detectDocumentType = (data) => {
        const keys = Object.keys(data).map(k => k.toLowerCase());
        
        if (keys.some(k => k.includes('cnic') || k.includes('شناختی کارڈ'))) {
            return 'pakistani_id_card';
        } else if (keys.some(k => k.includes('passport'))) {
            return 'passport';
        } else if (keys.some(k => k.includes('id') || k.includes('identity'))) {
            return 'id_card';
        } else {
            return 'general_document';
        }
    };
    
    // Filter out empty or invalid fields from extracted data
    const filterValidFields = (data) => {
        const validData = {};
        
        Object.entries(data).forEach(([key, value]) => {
            // Check if field has valid data
            if (isValidFieldValue(value)) {
                validData[key] = value;
            }
        });
        
        return validData;
    };
    
    // Enhanced field validation function
    const isValidFieldValue = (value) => {
        if (!value || value === null || value === undefined) return false;
        
        const stringValue = value.toString().trim().toLowerCase();
        
        // Check for empty strings
        if (stringValue === '') return false;
        
        // Check for common "empty" indicators
        const emptyIndicators = [
            'null', 'undefined', 'n/a', 'na', 'not available', 
            'not found', 'no data', 'empty', 'none', 'nil',
            'not visible', 'cannot read', 'unclear', 'illegible',
            'not applicable', 'not specified', 'unknown',
            '-', '--', '---', '____', 'xxxx', 'not extractable'
        ];
        
        if (emptyIndicators.includes(stringValue)) return false;
        
        // Check for single characters or very short meaningless values
        if (stringValue.length === 1 && !stringValue.match(/[a-z0-9]/)) return false;
        
        // Check for repeated characters (like "aaa" or "111")
        if (stringValue.length > 1 && /^(.)\1+$/.test(stringValue)) return false;
        
        return true;
    };
    
    // Apply current theme
    const applyTheme = () => {
        // Get theme from localStorage or default to light
        let theme = 'light';
        try {
            const stored = localStorage.getItem('propace_autofill_state');
            if (stored) {
                const state = JSON.parse(stored);
                theme = state.theme || 'light';
            }
        } catch (e) {
            console.log('Could not load theme, using default');
        }
        
        document.body.setAttribute('data-theme', theme);
    };
    
    // Handle search input
    const handleSearch = (e) => {
        currentFilters.search = e.target.value.toLowerCase();
        applyFilters();
    };
    
    // Handle date filtering
    const handleDateFilter = () => {
        currentFilters.dateFrom = dateFromInput.value;
        currentFilters.dateTo = dateToInput.value;
        applyFilters();
    };
    
    // Handle document type filtering
    const handleDocumentTypeFilter = (e) => {
        currentFilters.documentType = e.target.value;
        applyFilters();
    };
    
    // Apply all filters and render
    const applyFilters = () => {
        filteredData = allHistoryData.filter(item => {
            // Search filter
            if (currentFilters.search && !item.searchText.includes(currentFilters.search)) {
                return false;
            }
            
            // Date range filter
            if (currentFilters.dateFrom) {
                const fromDate = new Date(currentFilters.dateFrom);
                const itemDate = new Date(item.timestamp);
                if (itemDate < fromDate) return false;
            }
            
            if (currentFilters.dateTo) {
                const toDate = new Date(currentFilters.dateTo);
                toDate.setHours(23, 59, 59); // End of day
                const itemDate = new Date(item.timestamp);
                if (itemDate > toDate) return false;
            }
            
            // Document type filter
            if (currentFilters.documentType && item.documentType !== currentFilters.documentType) {
                return false;
            }
            
            return true;
        });
        
        // Render all filtered results
        renderHistory();
        updateHistoryStats();
    };
    
    // Clear all filters
    const clearAllFilters = () => {
        searchInput.value = '';
        dateFromInput.value = '';
        dateToInput.value = '';
        documentTypeFilter.value = '';
        
        currentFilters = {
            search: '',
            dateFrom: '',
            dateTo: '',
            documentType: ''
        };
        
        filteredData = [...allHistoryData];
        renderHistory();
        updateHistoryStats();
    };
    
    // Update history statistics
    const updateHistoryStats = () => {
        const total = allHistoryData.length;
        const filtered = filteredData.length;
        
        if (total === 0) {
            historyStats.textContent = 'No extractions';
        } else if (filtered === total) {
            historyStats.textContent = `${total} extraction${total !== 1 ? 's' : ''}`;
        } else {
            historyStats.textContent = `${filtered} of ${total} extractions`;
        }
    };
    
    // Show/hide loading state
    const showLoading = (show) => {
        loadingHistory.style.display = show ? 'flex' : 'none';
        historyGrid.style.display = show ? 'none' : 'grid';
        emptyHistory.style.display = 'none';
    };
    
    // Show error message
    const showError = (message) => {
        console.error(message);
        // Could implement toast notification here
    };
    
    // Render history items - Simple version without pagination
    const renderHistory = () => {
        if (filteredData.length === 0) {
            historyGrid.style.display = 'none';
            emptyHistory.style.display = 'block';
            emptyHistory.querySelector('.empty-title').textContent = 
                allHistoryData.length === 0 ? 'No Extraction History' : 'No Results Found';
            emptyHistory.querySelector('.empty-subtitle').textContent = 
                allHistoryData.length === 0 
                    ? "You haven't extracted any data yet. Start by uploading an ID card or passport image."
                    : 'Try adjusting your search criteria or clearing filters.';
            return;
        }
        
        historyGrid.style.display = 'grid';
        emptyHistory.style.display = 'none';
        
        // Render all filtered items at once
        historyGrid.innerHTML = filteredData.map(item => createHistoryCard(item)).join('');
        
        // Add event listeners to cards
        addCardEventListeners();
    };
    
    // Create history card HTML
    const createHistoryCard = (item) => {
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const documentTypeLabels = {
            'pakistani_id_card': '🇵🇰 Pakistani CNIC',
            'passport': '📖 Passport',
            'id_card': '🆔 ID Card',
            'general_document': '📄 Document'
        };
        
        const documentTypeLabel = documentTypeLabels[item.documentType] || '📄 Document';
        
        // Use the documentName that was already correctly processed by getDisplayNameFromExtractedData
        const personName = item.documentName || 'Unknown Document';
        
        console.log('Creating card for:', personName); // Debug log
        
        // Show only basic info, not all fields
        const hasValidData = item.fieldCount > 0;
        
        return `
            <div class="history-card" data-id="${item.id}">
                <div class="card-header">
                    <div class="document-info">
                        <h3 class="document-name">${escapeHtml(personName)}</h3>
                        <span class="document-type">${documentTypeLabel}</span>
                        <div class="extraction-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12,6 12,12 16,14"/>
                            </svg>
                            ${dateStr} at ${timeStr}
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="action-btn view-btn" title="View Details" data-id="${item.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="action-btn copy-btn" title="Copy Data" data-id="${item.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                        </button>
                        <button class="action-btn delete-btn" title="Delete" data-id="${item.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="thumbnail-area">
                    ${item.thumbnail ? 
                        `<img src="${item.thumbnail}" alt="Document thumbnail" class="thumbnail-image">` :
                        `<div class="no-thumbnail">📄 No preview available</div>`
                    }
                </div>
                
                <div class="fields-preview">
                    <div class="fields-count">${item.fieldCount} field${item.fieldCount !== 1 ? 's' : ''} extracted</div>
                    <div class="click-to-view">
                        <span class="view-hint">👆 Click to view extracted data</span>
                    </div>
                </div>
            </div>
        `;
    };
    
    // Add event listeners to history cards
    const addCardEventListeners = () => {
        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                viewHistoryDetails(id);
            });
        });
        
        // Copy buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                copyHistoryData(id);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                deleteHistoryItem(id);
            });
        });
        
        // Card click to view details
        document.querySelectorAll('.history-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                viewHistoryDetails(id);
            });
        });
    };
    
    // View history details
    const viewHistoryDetails = (id) => {
        const item = allHistoryData.find(h => h.id === id);
        if (!item) return;
        
        // Only show fields that have actual data
        const data = item.data || {}; // This is already filtered data
        
        if (Object.keys(data).length === 0) {
            showNotification('No valid data found in this extraction', 'warning');
            return;
        }
        
        // Create detailed modal view
        createDetailModal(item, data);
    };
    
    // Create detailed modal view
    const createDetailModal = (item, data) => {
        // Remove existing modal if any
        const existingModal = document.getElementById('detailModal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'detailModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-out;
            backdrop-filter: blur(5px);
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: var(--bg-primary);
            border-radius: 20px;
            max-width: 700px;
            max-height: 90vh;
            overflow-y: auto;
            margin: 20px;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
            animation: slideIn 0.3s ease-out;
            border: 1px solid var(--glass-border);
        `;
        
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const documentTypeLabels = {
            'pakistani_id_card': '🇵🇰 Pakistani CNIC',
            'passport': '📖 Passport',
            'id_card': '🆔 ID Card',
            'general_document': '📄 Document'
        };
        
        const documentTypeLabel = documentTypeLabels[item.documentType] || '📄 Document';
        
        modalContent.innerHTML = `
            <div style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); color: white; padding: 24px; border-radius: 20px 20px 0 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h2 style="margin: 0 0 8px 0; font-size: 1.5rem; font-weight: 700;">${escapeHtml(item.documentName || 'Document Details')}</h2>
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">${documentTypeLabel}</span>
                        </div>
                        <p style="margin: 0; opacity: 0.9; font-size: 14px;">
                            📅 Extracted on ${dateStr} at ${timeStr} • 📊 ${Object.keys(data).length} fields
                        </p>
                    </div>
                    <button id="closeModal" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; font-size: 20px; padding: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.3s; font-weight: bold;" title="Close">
                        ×
                    </button>
                </div>
            </div>
            
            ${item.thumbnail ? `
                <div style="padding: 20px 24px 0; text-align: center;">
                    <img src="${item.thumbnail}" alt="Document thumbnail" style="max-width: 100%; max-height: 200px; border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); object-fit: contain;">
                </div>
            ` : ''}
            
            <div style="padding: 24px;">
                <h3 style="margin: 0 0 20px 0; color: var(--text-primary); font-size: 1.2rem; font-weight: 600;">📋 Extracted Information</h3>
                <div style="display: grid; gap: 16px;">
                    ${Object.entries(data).map(([key, value]) => `
                        <div class="field-item">
                            <div class="field-content">
                                <div class="field-info">
                                    <label class="field-label">${escapeHtml(key)}</label>
                                    <div class="field-value">${escapeHtml(value)}</div>
                                </div>
                                <button class="copy-field-btn" data-value="${escapeHtml(value)}" title="Copy this field">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-actions" style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end; padding-top: 20px; border-top: 1px solid var(--glass-border); flex-wrap: wrap;">
                    <button id="copyAllData" style="background: var(--success); color: white; border: none; padding: 12px 24px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.3s; display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy All Data
                    </button>
                    <button id="downloadTxt" style="background: var(--primary); color: white; border: none; padding: 12px 24px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.3s; display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                        </svg>
                        Download TXT
                    </button>
                    <button id="downloadPdf" style="background: #dc2626; color: white; border: none; padding: 12px 24px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.3s; display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="12" y1="18" x2="12" y2="12"/>
                            <line x1="9" y1="15" x2="12" y2="12"/>
                            <line x1="15" y1="15" x2="12" y2="12"/>
                        </svg>
                        Download PDF
                    </button>
                </div>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { transform: translateY(-50px) scale(0.95); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
            }
            .copy-field-btn:hover {
                opacity: 1 !important;
                transform: scale(1.1);
            }
        `;
        document.head.appendChild(style);
        
        // Add event listeners
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.animation = 'fadeOut 0.2s ease-out';
                setTimeout(() => modal.remove(), 200);
            }
        });
        
        document.getElementById('closeModal').addEventListener('click', () => {
            modal.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => modal.remove(), 200);
        });
        
        // Copy individual field buttons
        document.querySelectorAll('.copy-field-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = btn.getAttribute('data-value');
                navigator.clipboard.writeText(value).then(() => {
                    btn.innerHTML = '✓';
                    setTimeout(() => {
                        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>`;
                    }, 1000);
                    showNotification('Field copied!', 'success');
                });
            });
        });
        
        document.getElementById('copyAllData').addEventListener('click', () => {
            const formattedData = Object.entries(data)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
            navigator.clipboard.writeText(formattedData).then(() => {
                showNotification('All data copied to clipboard!', 'success');
            });
        });
        
        document.getElementById('downloadTxt').addEventListener('click', () => {
            downloadAsText(data, item);
        });
        
        document.getElementById('downloadPdf').addEventListener('click', () => {
            downloadAsPDF(data, item);
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.style.animation = 'fadeOut 0.2s ease-out';
                setTimeout(() => modal.remove(), 200);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    };
    
    // Copy history data to clipboard
    const copyHistoryData = (id) => {
        const item = allHistoryData.find(h => h.id === id);
        if (!item) return;
        
        const data = item.data || {};
        const jsonData = JSON.stringify(data, null, 2);
        
        navigator.clipboard.writeText(jsonData).then(() => {
            showNotification('Data copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Failed to copy data', 'error');
        });
    };
    
    // Delete history item
    const deleteHistoryItem = async (id) => {
        if (!confirm('Are you sure you want to delete this extraction history?')) {
            return;
        }
        
        try {
            // Remove from arrays
            allHistoryData = allHistoryData.filter(h => h.id !== id);
            filteredData = filteredData.filter(h => h.id !== id);
            
            // Update storage
            await saveHistoryData();
            
            // Re-render
            updateHistoryStats();
            renderHistory();
            
            showNotification('History item deleted', 'success');
            
        } catch (error) {
            console.error('Error deleting history item:', error);
            showNotification('Failed to delete item', 'error');
        }
    };
    
    // Save history data back to storage
    const saveHistoryData = async () => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ 'extractionHistory': allHistoryData });
            } else {
                // Update localStorage
                const stored = localStorage.getItem('propace_autofill_state');
                const state = stored ? JSON.parse(stored) : {};
                state.history = allHistoryData;
                localStorage.setItem('propace_autofill_state', JSON.stringify(state));
            }
        } catch (error) {
            console.error('Error saving history data:', error);
            throw error;
        }
    };
    
    // Handle keyboard shortcuts
    const handleKeyboardShortcuts = (e) => {
        // Ctrl/Cmd + F to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Escape to clear search
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            handleSearch({ target: { value: '' } });
        }
    };
    
    // Show notification
    const showNotification = (message, type = 'info') => {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            font-size: 14px;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            notification.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.3)';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            notification.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.3)';
        }
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        
        // Hide and remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    };
    
    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    // Download extracted data as formatted text file
    const downloadAsText = (data, item) => {
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        const documentTypeLabels = {
            'pakistani_id_card': 'Pakistani CNIC',
            'passport': 'Passport',
            'id_card': 'ID Card',
            'general_document': 'Document'
        };
        
        const documentType = documentTypeLabels[item.documentType] || 'Document';
        
        let textContent = `
PROPACE AUTOFILL ASSISTANT - EXTRACTION REPORT
${'='.repeat(50)}

Document Information:
- Document Name: ${item.documentName || 'Unknown Document'}
- Document Type: ${documentType}
- Extraction Date: ${dateStr} at ${timeStr}
- Total Fields: ${Object.keys(data).length}

${'='.repeat(50)}
EXTRACTED DATA:
${'='.repeat(50)}

`;
        
        Object.entries(data).forEach(([key, value], index) => {
            textContent += `${index + 1}. ${key.toUpperCase()}\n`;
            textContent += `   ${value}\n\n`;
        });
        
        textContent += `${'='.repeat(50)}\n`;
        textContent += `Report generated on: ${new Date().toLocaleString()}\n`;
        textContent += `Powered by Propace Autofill Assistant\n`;
        
        // Create and download the text file
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.documentName || 'extraction'}_${item.id}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('Text file downloaded successfully!', 'success');
    };
    
    // Download extracted data as PDF using jsPDF
    const downloadAsPDF = async (data, item) => {
        try {
            // Show loading state
            const pdfBtn = document.getElementById('downloadPdf');
            const originalText = pdfBtn.innerHTML;
            pdfBtn.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> Generating...';
            pdfBtn.disabled = true;
            
            // Create PDF content using HTML and CSS (browser's built-in PDF generation)
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString();
            
            const documentTypeLabels = {
                'pakistani_id_card': 'Pakistani CNIC',
                'passport': 'Passport',
                'id_card': 'ID Card',
                'general_document': 'Document'
            };
            
            const documentType = documentTypeLabels[item.documentType] || 'Document';
            
            // Create a new window for PDF generation
            const printWindow = window.open('', '_blank');
            
            const pdfContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Extraction Report - ${item.documentName}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: Arial, sans-serif; 
                            line-height: 1.6; 
                            color: #333; 
                            padding: 30px;
                            background: white;
                        }
                        .header {
                            text-align: center;
                            border-bottom: 3px solid #4f46e5;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                        }
                        .header h1 {
                            color: #4f46e5;
                            font-size: 24px;
                            margin-bottom: 5px;
                        }
                        .header h2 {
                            color: #666;
                            font-size: 16px;
                            font-weight: normal;
                        }
                        .document-info {
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            padding: 20px;
                            margin-bottom: 30px;
                        }
                        .document-info h3 {
                            color: #4f46e5;
                            margin-bottom: 15px;
                            font-size: 18px;
                        }
                        .info-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 10px;
                        }
                        .info-item {
                            display: flex;
                        }
                        .info-label {
                            font-weight: bold;
                            min-width: 120px;
                            color: #374151;
                        }
                        .info-value {
                            color: #6b7280;
                        }
                        .extracted-data {
                            margin-top: 30px;
                        }
                        .extracted-data h3 {
                            color: #4f46e5;
                            margin-bottom: 20px;
                            font-size: 18px;
                            border-bottom: 2px solid #e2e8f0;
                            padding-bottom: 10px;
                        }
                        .field-item {
                            background: white;
                            border: 1px solid #e2e8f0;
                            border-radius: 6px;
                            padding: 15px;
                            margin-bottom: 10px;
                            break-inside: avoid;
                        }
                        .field-label {
                            font-weight: bold;
                            color: #374151;
                            font-size: 14px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin-bottom: 5px;
                        }
                        .field-value {
                            color: #111827;
                            font-size: 16px;
                            padding: 8px 12px;
                            background: #f9fafb;
                            border-radius: 4px;
                            border-left: 3px solid #4f46e5;
                        }
                        .footer {
                            margin-top: 40px;
                            text-align: center;
                            color: #6b7280;
                            font-size: 12px;
                            border-top: 1px solid #e2e8f0;
                            padding-top: 20px;
                        }
                        @media print {
                            body { padding: 20px; }
                            .field-item { break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>PROPACE AUTOFILL ASSISTANT</h1>
                        <h2>Document Extraction Report</h2>
                    </div>
                    
                    <div class="document-info">
                        <h3>📄 Document Information</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Document Name:</span>
                                <span class="info-value">${item.documentName || 'Unknown Document'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Document Type:</span>
                                <span class="info-value">${documentType}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Extraction Date:</span>
                                <span class="info-value">${dateStr} at ${timeStr}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Total Fields:</span>
                                <span class="info-value">${Object.keys(data).length} fields extracted</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="extracted-data">
                        <h3>📋 Extracted Information</h3>
                        ${Object.entries(data).map(([key, value]) => `
                            <div class="field-item">
                                <div class="field-label">${key}</div>
                                <div class="field-value">${value}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="footer">
                        <p>Report generated on ${new Date().toLocaleString()}</p>
                        <p>Powered by Propace Autofill Assistant</p>
                    </div>
                </body>
                </html>
            `;
            
            printWindow.document.write(pdfContent);
            printWindow.document.close();
            
            // Wait for content to load, then print
            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                    
                    // Reset button state
                    pdfBtn.innerHTML = originalText;
                    pdfBtn.disabled = false;
                    
                    showNotification('PDF download initiated! Use your browser\'s print dialog to save as PDF.', 'success');
                }, 500);
            };
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            showNotification('Error generating PDF. Please try again.', 'error');
            
            // Reset button state on error
            const pdfBtn = document.getElementById('downloadPdf');
            pdfBtn.innerHTML = originalText;
            pdfBtn.disabled = false;
        }
    };
    
    // Initialize the history page
    init();
});