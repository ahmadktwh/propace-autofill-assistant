/*==================================================================================================
    Propace Autofill Assistant - Direct Communication System
    -----------------------------------------------
    Developed by: Mujeeb Ahmad
    Version: 5.0 (Simple & Reliable Communication)
    Description: Clean, direct communication between popup and content script
====================================================================================================*/

// ===================================================================
// ==           DIRECT COMMUNICATION SYSTEM                        ==
// ===================================================================

class PropaceDirectCommunication {
    constructor() {
        this.activeTab = null;
        this.isReady = false;
        
        console.log('🚀 Propace Direct Communication System initialized');
    }

    async initializeConnection() {
        try {
            // Get the active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
                this.activeTab = tabs[0];
                
                // Test communication with a simple ping
                const response = await this.sendMessage({ action: 'ping' });
                if (response && response.success) {
                    this.isReady = true;
                    console.log('✅ Direct communication established');
                } else {
                    console.error('❌ Content script not responding');
                }
            }
        } catch (error) {
            console.error('❌ Failed to initialize communication:', error);
        }
    }

    // Simple, direct message sending - no fallbacks, no complexity
    async sendMessage(message) {
        if (!this.activeTab) {
            throw new Error('No active tab available');
        }

        const messageId = Date.now().toString();
        const finalMessage = {
            ...message,
            messageId,
            timestamp: Date.now(),
            source: 'popup'
        };

        console.log(`📤 Sending message [${messageId}]:`, finalMessage);

        try {
            const response = await chrome.tabs.sendMessage(this.activeTab.id, finalMessage);
            console.log(`📥 Received response [${messageId}]:`, response);
            return response;
        } catch (error) {
            console.error(`❌ Message failed [${messageId}]:`, error);
            throw error;
        }
    }

    // Autofill specific method
    async performAutofill(data) {
        try {
            const response = await this.sendMessage({
                action: 'autofill',
                data: data
            });
            return response;
        } catch (error) {
            console.error('❌ Autofill failed:', error);
            throw error;
        }
    }
}

// ===================================================================
// ==           INITIALIZE COMMUNICATION SYSTEM                    ==
// ===================================================================

let communicator = null;

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Popup DOM loaded, initializing communication...');
    
    try {
        communicator = new PropaceDirectCommunication();
        await communicator.initializeConnection();
        
        if (communicator.isReady) {
            updateConnectionStatus('✅ Connected');
            initializeUI();
        } else {
            updateConnectionStatus('❌ Connection Failed');
            showError('Unable to connect to content script. Please refresh the page.');
        }
    } catch (error) {
        console.error('❌ Failed to initialize popup:', error);
        updateConnectionStatus('❌ Error');
        showError('Initialization failed: ' + error.message);
    }
});

function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function initializeUI() {
    console.log('🎨 Initializing UI...');
    
    // Add event listener for autofill button
    const autofillBtn = document.getElementById('autofill-btn');
    if (autofillBtn) {
        autofillBtn.addEventListener('click', performAutofill);
    }
    
    // Add other UI event listeners here
    console.log('✅ UI initialized');
}

async function performAutofill() {
    if (!communicator || !communicator.isReady) {
        showError('Communication system not ready');
        return;
    }
    
    try {
        console.log('🎯 Starting autofill...');
        
        // Get form data (this should be customized based on your needs)
        const formData = {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '123-456-7890'
            // Add more fields as needed
        };
        
        const response = await communicator.performAutofill(formData);
        
        if (response && response.success) {
            console.log('✅ Autofill completed successfully');
            updateConnectionStatus('✅ Autofill Complete');
        } else {
            console.error('❌ Autofill failed:', response);
            showError('Autofill failed: ' + (response?.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('❌ Autofill error:', error);
        showError('Autofill error: ' + error.message);
    }
}
