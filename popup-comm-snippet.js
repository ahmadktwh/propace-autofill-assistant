/**
 * Propace Popup Communication Snippet v2.0
 * Implements robust communication with content-script.js
 */

window.PropacePopupComm = {
    _initialized: false,
    _nonce: null,
    _listeners: new Map(),
    _pendingRequests: new Map(),
    _timeouts: new Map(),

    /**
     * Initialize the communication manager
     * @param {Object} options Configuration options
     * @returns {Promise<{ok: boolean, status: string}>}
     */
    async init(options = {}) {
        if (this._initialized) {
            return { ok: false, code: 'ALREADY_INITIALIZED' };
        }

        this._options = {
            timeout: 8000,
            retryIntervals: [300, 900, 2700],
            debug: false,
            ...options
        };

        this._nonce = this._generateNonce();
        this._setupMessageListeners();
        this._initialized = true;

        return { ok: true, status: 'initialized' };
    },

    /**
     * Send a message to the content script
     * @param {string} method Method name to call
     * @param {Object} params Parameters to pass
     * @param {Object} options Additional options
     * @returns {Promise<any>} Response from content script
     */
    async send(method, params = {}, options = {}) {
        if (!this._initialized) {
            throw new Error('COMM_NOT_INITIALIZED');
        }

        const requestId = crypto.randomUUID();
        const payload = {
            id: requestId,
            method,
            params,
            nonce: this._nonce,
            source: 'propace_popup'
        };

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this._cleanupRequest(requestId);
                reject(new Error('TIMEOUT'));
            }, options.timeout || this._options.timeout);

            this._pendingRequests.set(requestId, { resolve, reject });
            this._timeouts.set(requestId, timeoutId);

            // Try all communication methods in sequence
            this._tryChromeRuntime(payload)
                .catch(() => this._tryPostMessage(payload))
                .catch(() => this._tryDomCommunication(payload))
                .catch(error => {
                    this._cleanupRequest(requestId);
                    reject(error);
                });
        });
    },

    /**
     * Add a listener for specific method
     * @param {string} method Method to listen for
     * @param {Function} handler Handler function
     */
    on(method, handler) {
        if (!this._listeners.has(method)) {
            this._listeners.set(method, new Set());
        }
        this._listeners.get(method).add(handler);
    },

    /**
     * Remove a listener
     * @param {string} method Method to remove listener from
     * @param {Function} handler Handler to remove
     */
    off(method, handler) {
        if (this._listeners.has(method)) {
            this._listeners.get(method).delete(handler);
        }
    },

    // Private methods
    _setupMessageListeners() {
        // Listen for chrome.runtime messages
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.nonce && message.nonce === this._nonce) {
                this._handleResponse(message);
                sendResponse({ received: true });
                return true;
            }
        });

        // Listen for postMessage
        const channel = new BroadcastChannel('propace_dom');
        channel.onmessage = event => {
            if (event.data.nonce && event.data.nonce === this._nonce) {
                this._handleResponse(event.data);
            }
        };

        // Listen for DOM communication
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.matches && node.matches('[data-propace-response]')) {
                            try {
                                const response = JSON.parse(node.getAttribute('data-propace-response'));
                                if (response.nonce === this._nonce) {
                                    this._handleResponse(response);
                                    node.remove();
                                }
                            } catch (e) {
                                console.warn('Invalid response data:', e);
                            }
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    async _tryChromeRuntime(payload) {
        return new Promise((resolve, reject) => {
            try {
                chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                    if (!tabs[0]?.id) {
                        reject(new Error('NO_ACTIVE_TAB'));
                        return;
                    }

                    chrome.tabs.sendMessage(tabs[0].id, payload, response => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        resolve(response);
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    async _tryPostMessage(payload) {
        return new Promise((resolve, reject) => {
            const channel = new BroadcastChannel('propace_dom');
            const timeoutId = setTimeout(() => {
                channel.close();
                reject(new Error('POST_MESSAGE_TIMEOUT'));
            }, 2000);

            channel.onmessage = event => {
                if (event.data.nonce === payload.nonce) {
                    clearTimeout(timeoutId);
                    channel.close();
                    resolve(event.data);
                }
            };

            channel.postMessage(payload);
        });
    },

    async _tryDomCommunication(payload) {
        return new Promise((resolve, reject) => {
            const element = document.createElement('div');
            element.id = `propace_popup_${payload.id}`;
            element.setAttribute('data-propace-request', JSON.stringify(payload));
            element.style.display = 'none';
            document.body.appendChild(element);

            const timeoutId = setTimeout(() => {
                element.remove();
                reject(new Error('DOM_COMMUNICATION_TIMEOUT'));
            }, 2000);

            const observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && 
                        mutation.attributeName === 'data-propace-response') {
                        const response = JSON.parse(element.getAttribute('data-propace-response'));
                        clearTimeout(timeoutId);
                        observer.disconnect();
                        element.remove();
                        resolve(response);
                        return;
                    }
                }
            });

            observer.observe(element, { attributes: true });
        });
    },

    _handleResponse(response) {
        if (!response.id) return;

        const pending = this._pendingRequests.get(response.id);
        if (pending) {
            this._cleanupRequest(response.id);
            if (response.error) {
                pending.reject(new Error(response.error));
            } else {
                pending.resolve(response.result);
            }
        }

        // Handle notifications (messages without pending requests)
        if (response.method && this._listeners.has(response.method)) {
            for (const handler of this._listeners.get(response.method)) {
                try {
                    handler(response.params);
                } catch (error) {
                    console.warn('Handler error:', error);
                }
            }
        }
    },

    _cleanupRequest(requestId) {
        const timeoutId = this._timeouts.get(requestId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this._timeouts.delete(requestId);
        }
        this._pendingRequests.delete(requestId);
    },

    _generateNonce() {
        return `propace_popup_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
};

// Example usage in popup.js:
/*
// Initialize communication
await PropacePopupComm.init({ debug: true });

// Send autofill request
try {
    const result = await PropacePopupComm.send('autofill', {
        data: {
            name: 'John Doe',
            email: 'john@example.com'
        },
        mode: 'strict'
    });
    console.log('Autofill result:', result);
} catch (error) {
    console.error('Autofill failed:', error);
}

// Listen for events from content script
PropacePopupComm.on('fieldDetected', data => {
    console.log('New field detected:', data);
});
*/
