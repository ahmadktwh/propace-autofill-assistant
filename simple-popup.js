// Simple popup script
console.log('Popup script starting...');

let port;
const status = document.getElementById('status');
const testBtn = document.getElementById('testBtn');

// Set up communication port
function setupPort() {
    try {
        port = chrome.runtime.connect({ name: 'popup' });
        
        port.onMessage.addListener((message) => {
            console.log('Popup received message:', message);
            handleMessage(message);
        });

        // Check active tab status
        port.postMessage({
            type: 'GET_ACTIVE_TAB_STATUS'
        });
    } catch (error) {
        console.error('Port setup failed:', error);
        showError('Failed to connect to extension');
    }
}

// Handle messages from background
function handleMessage(message) {
    switch (message.type) {
        case 'TAB_STATUS':
            updateStatus(message);
            break;
        case 'ERROR':
            showError(message.error);
            break;
        case 'AUTOFILL_COMPLETE':
            showSuccess('Autofill complete!');
            break;
    }
}

// Update status display
function updateStatus(message) {
    if (message.connected) {
        status.className = 'connected';
        status.textContent = 'Connected to active tab';
        testBtn.disabled = false;
    } else {
        status.className = 'disconnected';
        status.textContent = 'Not connected to active tab';
        testBtn.disabled = true;
    }
}

// Show error message
function showError(message) {
    status.className = 'disconnected';
    status.textContent = 'Error: ' + message;
}

// Show success message
function showSuccess(message) {
    status.className = 'connected';
    status.textContent = message;
}

// Test button handler
testBtn.addEventListener('click', () => {
    const testData = {
        name: 'Test User',
        email: 'test@example.com'
    };
    
    port.postMessage({
        type: 'AUTOFILL',
        data: testData
    });
});

// Initialize
setupPort();
