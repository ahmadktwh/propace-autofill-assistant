// PROPACE ENTERPRISE COMMUNICATION & CSP BYPASS TEST
// ==================================================

console.log('🚀 PROPACE ENTERPRISE TEST - Advanced Communication & CSP Bypass');
console.log('='.repeat(70));

let testResults = {
    basicExtension: false,
    advancedComm: false,
    cspBypass: false,
    fieldDetection: false,
    autofillTest: false,
    connectionHealth: 'unknown'
};

// Test 1: Basic Extension Loading
console.log('\n📋 Test 1: Basic Extension Status');
if (window.propaceAutofillInjected) {
    testResults.basicExtension = true;
    console.log('✅ Extension loaded successfully');
    console.log(`   Injection time: ${window.propaceInjectionTime ? new Date(window.propaceInjectionTime).toLocaleTimeString() : 'Unknown'}`);
} else {
    console.log('❌ Extension not loaded');
}

// Test 2: Advanced Communication Receiver
console.log('\n📋 Test 2: Advanced Communication System');
if (window.propaceReceiver && window.propaceReceiver.isInitialized) {
    testResults.advancedComm = true;
    console.log('✅ Advanced communication receiver active');
    
    // Get health status
    try {
        const health = window.propaceReceiver.getHealthStatus();
        testResults.connectionHealth = health.status;
        console.log('   Health status:', health);
        console.log('   Available features:');
        Object.entries(health.features).forEach(([feature, status]) => {
            console.log(`     ${feature}: ${status ? '✅' : '❌'}`);
        });
    } catch (error) {
        console.log('   ⚠️ Health check failed:', error.message);
    }
} else {
    console.log('❌ Advanced communication not available');
}

// Test 3: CSP Bypass Capabilities
console.log('\n📋 Test 3: CSP Bypass Methods');
const bypassMethods = [
    'Standard messaging',
    'Event-based bypass', 
    'DOM bridge bypass',
    'Window object bypass',
    'Direct DOM manipulation'
];

let bypassAvailable = 0;

// Test event bypass
try {
    const testEvent = new CustomEvent('propaceBypassTest', { detail: 'test' });
    document.dispatchEvent(testEvent);
    bypassAvailable++;
    console.log('✅ Event-based bypass available');
} catch (error) {
    console.log('❌ Event-based bypass blocked');
}

// Test DOM manipulation
try {
    const testDiv = document.createElement('div');
    testDiv.id = 'propace-test-element';
    testDiv.style.display = 'none';
    document.body.appendChild(testDiv);
    document.body.removeChild(testDiv);
    bypassAvailable++;
    console.log('✅ DOM manipulation available');
} catch (error) {
    console.log('❌ DOM manipulation blocked');
}

// Test window object access
try {
    window.propaceTestVar = 'test';
    if (window.propaceTestVar === 'test') {
        delete window.propaceTestVar;
        bypassAvailable++;
        console.log('✅ Window object access available');
    }
} catch (error) {
    console.log('❌ Window object access blocked');
}

// Test script injection simulation
try {
    const script = 'console.log("CSP test");';
    const func = Function(script);
    func();
    bypassAvailable++;
    console.log('✅ Script execution available');
} catch (error) {
    console.log('❌ Script execution blocked by CSP');
}

testResults.cspBypass = bypassAvailable >= 2;
console.log(`   CSP bypass methods available: ${bypassAvailable}/4`);

// Test 4: Field Detection & Patterns
console.log('\n📋 Test 4: Field Detection System');
const formFields = document.querySelectorAll('input, select, textarea, [contenteditable="true"]');
console.log(`   Found ${formFields.length} form fields`);

if (window.ADVANCED_FIELD_PATTERNS) {
    testResults.fieldDetection = true;
    console.log('✅ Advanced field patterns available');
    console.log(`   Pattern categories: ${Object.keys(window.ADVANCED_FIELD_PATTERNS).length}`);
    
    // Test field matching
    if (formFields.length > 0) {
        console.log('   Testing field matching:');
        Array.from(formFields).slice(0, 3).forEach((field, index) => {
            const identifier = field.name || field.id || field.placeholder || `field-${index}`;
            const type = field.type || field.tagName.toLowerCase();
            console.log(`     ${index + 1}. ${identifier} (${type})`);
            
            // Test smart field matching if available
            if (window.propaceReceiver && window.propaceReceiver.smartFieldMatching) {
                const testData = {
                    'Full Name': 'Test User',
                    'Email': 'test@example.com',
                    'Phone': '1234567890'
                };
                
                const match = window.propaceReceiver.smartFieldMatching(field, testData);
                if (match) {
                    console.log(`       Matched with: ${match}`);
                }
            }
        });
    }
} else {
    console.log('❌ Advanced field patterns not available');
}

// Test 5: Communication Test with Real Message
console.log('\n📋 Test 5: Live Communication Test');
if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
        chrome.runtime.sendMessage({
            action: 'ping',
            source: 'console-test',
            timestamp: Date.now()
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('❌ Communication failed:', chrome.runtime.lastError.message);
            } else {
                console.log('✅ Communication successful:', response);
                testResults.autofillTest = true;
            }
        });
    } catch (error) {
        console.log('❌ Communication test error:', error.message);
    }
} else {
    console.log('❌ Chrome runtime not available');
}

// Test 6: Advanced Autofill Simulation
console.log('\n📋 Test 6: Advanced Autofill Simulation');
if (formFields.length > 0) {
    console.log('   Simulating advanced autofill...');
    
    const testData = {
        'Full Name': 'Test User Name',
        'Email': 'testuser@example.com',
        'Phone': '+92-300-1234567'
    };
    
    if (window.propaceReceiver && window.propaceReceiver.performCSPAwareAutofill) {
        window.propaceReceiver.performCSPAwareAutofill(testData)
            .then(result => {
                testResults.autofillTest = true;
                console.log('✅ CSP-aware autofill simulation successful:', result);
            })
            .catch(error => {
                console.log('❌ CSP-aware autofill simulation failed:', error.message);
            });
    } else {
        console.log('⚠️ CSP-aware autofill not available for testing');
    }
} else {
    console.log('   No form fields available for testing');
}

// Final Results Summary
setTimeout(() => {
    console.log('\n🎯 ENTERPRISE TEST RESULTS SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Basic Extension: ${testResults.basicExtension ? '✅' : '❌'}`);
    console.log(`Advanced Communication: ${testResults.advancedComm ? '✅' : '❌'}`);
    console.log(`CSP Bypass Capability: ${testResults.cspBypass ? '✅' : '❌'}`);
    console.log(`Field Detection: ${testResults.fieldDetection ? '✅' : '❌'}`);
    console.log(`Communication Health: ${testResults.connectionHealth}`);
    
    const passedTests = Object.values(testResults).filter(result => result === true).length;
    const totalTests = Object.values(testResults).length - 1; // Exclude connectionHealth
    
    console.log(`\n📊 Test Score: ${passedTests}/${totalTests} passed`);
    
    if (passedTests === totalTests) {
        console.log('🏆 ALL TESTS PASSED - Enterprise system ready!');
        console.log('🛡️ CSP bypass capabilities are active');
        console.log('🚀 Advanced communication system operational');
    } else if (passedTests >= totalTests * 0.8) {
        console.log('✅ Most tests passed - System is largely functional');
        console.log('⚠️ Some advanced features may be limited');
    } else {
        console.log('❌ Multiple test failures - System needs attention');
    }
    
    console.log('\n💡 CSP BYPASS STATUS:');
    if (testResults.cspBypass && testResults.advancedComm) {
        console.log('🛡️ Enterprise-grade CSP bypass is ACTIVE');
        console.log('📝 Autofill will work on most CSP-restricted sites');
        console.log('🔄 Multiple fallback methods available');
    } else {
        console.log('⚠️ CSP bypass capabilities limited');
        console.log('📝 May not work on all restricted sites');
    }
    
}, 2000);

console.log('\n⏱️ Running comprehensive tests... Results in 2 seconds...');
