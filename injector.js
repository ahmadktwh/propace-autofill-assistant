// Direct content script injector
(function() {
    // Inject a script into the page context
    function injectScript(src, onload) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL(src);
        script.onload = function() {
            script.remove();
            if (onload) onload();
        };
        (document.head || document.documentElement).appendChild(script);
    }

        // Create a message relay
    const relay = document.createElement('div');
    relay.id = 'propace-message-relay';
    relay.style.display = 'none';
    document.documentElement.appendChild(relay);

    // Set up message passing between page and extension
    window.addEventListener('message', function(event) {
        if (event.data && event.data.__propace_message__) {
            // Forward page messages to extension
            chrome.runtime.sendMessage(event.data).catch(console.warn);
        }
    });

    // Forward extension messages to page
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message && message.__propace_message__) {
            window.postMessage(message, '*');
        }
        // Always respond to keep the channel open
        sendResponse({ received: true });
        return true;
    });

    // Inject scripts in sequence
    console.log('🚀 Propace injector starting...');
    
    injectScript('connection-health.js', function() {
        console.log('✅ Connection health system loaded');
        injectScript('content-script.js', function() {
            console.log('✅ Content script loaded');
            // Notify extension that scripts are ready
            chrome.runtime.sendMessage({
                __propace_message__: true,
                type: 'SCRIPTS_READY',
                timestamp: Date.now()
            }).catch(console.warn);
        });
    });

    // Set up heartbeat to maintain connection
    setInterval(() => {
        chrome.runtime.sendMessage({
            __propace_message__: true,
            type: 'HEARTBEAT',
            timestamp: Date.now()
        }).catch(console.warn);
    }, 5000);
})();
