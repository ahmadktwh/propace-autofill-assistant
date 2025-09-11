/**
 * Test script to demonstrate popup-content script communication
 */

async function runCommunicationTest() {
    console.group('🧪 Running Propace Communication Test');
    
    // 1. Initialize popup communication
    await PropacePopupComm.init({ debug: true });
    console.log('✅ Popup communication initialized');

    // 2. Test data to fill
    const testData = {
        name: "John Smith",
        fatherName: "Michael Smith",
        email: "john@example.com"
    };

    // 3. Try filling the form using all communication methods
    try {
        // First attempt - chrome.runtime
        console.log('🔄 Attempting primary communication (chrome.runtime)...');
        const result = await PropacePopupComm.send('autofill', { 
            data: testData,
            mode: 'strict'
        });
        console.log('✅ Primary communication successful:', result);

    } catch (primaryError) {
        console.warn('⚠️ Primary communication failed, trying secondary...');
        
        try {
            // Second attempt - postMessage
            const result = await PropacePopupComm.send('autofill', {
                data: testData,
                mode: 'permissive'
            });
            console.log('✅ Secondary communication successful:', result);

        } catch (secondaryError) {
            console.warn('⚠️ Secondary communication failed, trying DOM bridge...');
            
            try {
                // Final attempt - DOM communication
                const result = await PropacePopupComm.send('autofill', {
                    data: testData,
                    mode: 'fallback'
                });
                console.log('✅ DOM bridge communication successful:', result);

            } catch (finalError) {
                console.error('❌ All communication methods failed:', finalError);
            }
        }
    }

    // 4. Get diagnostics from content script
    try {
        const diagnostics = await PropacePopupComm.send('getDiagnostics');
        console.log('📊 Content Script Diagnostics:', diagnostics);
    } catch (error) {
        console.error('❌ Failed to get diagnostics:', error);
    }

    console.groupEnd();
}

// Run the test when page loads
document.addEventListener('DOMContentLoaded', runCommunicationTest);
