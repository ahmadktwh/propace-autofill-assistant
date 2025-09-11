// Background script for Propace Autofill Assistant
// Enhanced communication system with active tab tracking

// Track active connections
const connections = new Map();

// Track script status per tab
const tabStatus = new Map();

chrome.action.onClicked.addListener(async (tab) => {
    try {
        await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
        // Fallback silently
    }
});

// Set up side panel behavior for all tabs
chrome.runtime.onInstalled.addListener(() => {
    try {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (_) {}
});

// Handle when user focuses away from side panel (clicks outside)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        // Check if side panel is open and minimize it when user clicks elsewhere
        const isOpen = await chrome.sidePanel.getOptions({ tabId: activeInfo.tabId });
        if (isOpen && isOpen.enabled) {
            // Optional: You can choose to auto-minimize here or leave it open
            // For now, we'll let the user manually control it via the icon
        }
    } catch (error) {
        // Handle silently
    }
});

// Enhanced message handling with connection tracking
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const tabId = sender.tab ? sender.tab.id : null;
    console.log(`Message from ${tabId}:`, request);

    // Handle special messages
    if (request.__propace_message__) {
        switch (request.type) {
            case 'SCRIPTS_READY':
                if (tabId) {
                    tabStatus.set(tabId, {
                        status: 'ready',
                        timestamp: Date.now()
                    });
                    // Notify popup if it's connected
                    notifyPopup(tabId, {
                        type: 'TAB_READY',
                        tabId
                    });
                }
                break;
            case 'HEARTBEAT':
                if (tabId) {
                    tabStatus.set(tabId, {
                        status: 'alive',
                        timestamp: Date.now()
                    });
                }
                break;
        }
        sendResponse({ received: true });
        return true;
    }
    
    if (request.action === 'autofill' || request.action === 'autofill_form') {
        // Forward autofill request to active tab with enhanced handling
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                // Set up timeout for content script response
                let responseReceived = false;
                const timeout = setTimeout(() => {
                    if (!responseReceived) {
                        console.warn('Content script response timeout');
                        sendResponse({
                            success: false,
                            error: 'Content script response timeout - page may be loading',
                            fieldsCount: 0,
                            timeout: true
                        });
                    }
                }, 10000); // 10 second timeout

                chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
                    responseReceived = true;
                    clearTimeout(timeout);

                    if (chrome.runtime.lastError) {
                        console.error('Content script communication error:', chrome.runtime.lastError);
                        sendResponse({
                            success: false,
                            error: 'Content script not available: ' + chrome.runtime.lastError.message,
                            fieldsCount: 0,
                            lastError: chrome.runtime.lastError.message
                        });
                    } else if (!response) {
                        // ✅ CRITICAL FIX: Handle empty/null response properly
                        console.warn('Content script returned empty response');
                        sendResponse({
                            success: false,
                            error: 'Content script returned no data - may not be properly loaded',
                            fieldsCount: 0,
                            emptyResponse: true
                        });
                    } else if (typeof response !== 'object') {
                        // ✅ CRITICAL FIX: Validate response structure
                        console.warn('Invalid response format from content script:', typeof response);
                        sendResponse({
                            success: false,
                            error: 'Invalid response format from content script',
                            fieldsCount: 0,
                            invalidFormat: true
                        });
                    } else {
                        // ✅ ENHANCED: Validate response has required fields
                        const validatedResponse = {
                            success: response.success === true,
                            fieldsCount: parseInt(response.fieldsCount) || 0,
                            message: response.message || '',
                            error: response.error || null,
                            timestamp: Date.now()
                        };
                        
                        console.log('Valid response forwarded:', validatedResponse);
                        sendResponse(validatedResponse);
                    }
                });
            } else {
                sendResponse({
                    success: false,
                    error: 'No active tab found',
                    fieldsCount: 0,
                    noActiveTab: true
                });
            }
        });
        return true; // Keep message channel open for async response
    }
    
    // Handle ping requests with immediate response
    if (request.action === 'ping') {
        sendResponse({ 
            success: true, 
            message: 'Background script active',
            timestamp: Date.now()
        });
        return false; // Immediate response, don't keep channel open
    }
    
    // Handle unknown actions
    console.warn('Unknown action received:', request.action);
    sendResponse({ 
        success: false, 
        error: 'Unknown action: ' + request.action,
        availableActions: ['autofill', 'autofill_form', 'ping']
    });
    return false;
});

// The webNavigation listener has been removed as it was causing redundant script injections.
// The manifest.json file is now the single source of truth for content script injection,
// which resolves the communication race condition.

// Handle persistent connections from content scripts
chrome.runtime.onConnect.addListener((port) => {
    console.log('New connection established:', port.name);
    
    if (port.name === 'propace-persistent-connection') {
        // Set up persistent connection handlers
        port.onMessage.addListener((msg) => {
            console.log('Received message on persistent connection:', msg);
            
            if (msg.type === 'ping') {
                port.postMessage({ 
                    type: 'pong',
                    timestamp: Date.now(),
                    success: true 
                });
            }
        });
        
        port.onDisconnect.addListener(() => {
            console.log('Persistent connection disconnected:', port.name);
            // Connection will be re-established by content script
        });
    }
});

// Helper function to notify popup
function notifyPopup(tabId, message) {
    const connection = connections.get(tabId);
    if (connection) {
        try {
            connection.postMessage(message);
        } catch (e) {
            console.warn(`Failed to notify popup for tab ${tabId}:`, e);
            connections.delete(tabId);
        }
    }
}

// Track popup connections
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'popup') {
        const tabId = port.sender.tab ? port.sender.tab.id : null;
        if (tabId) {
            connections.set(tabId, port);
            port.onDisconnect.addListener(() => {
                connections.delete(tabId);
            });
        }
    }
});

// Clean up disconnected tabs
chrome.tabs.onRemoved.addListener((tabId) => {
    tabStatus.delete(tabId);
    connections.delete(tabId);
});

console.log('Propace Autofill Assistant background script loaded with enhanced message handling and connection tracking');
