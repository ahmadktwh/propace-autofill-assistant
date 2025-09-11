// ===================================================================
// ==              MANUAL DEBUG COMMANDS FOR CONSOLE              ==
// ===================================================================

// 1. Check if Propace content script is loaded
function checkPropaceStatus() {
    console.log("🔍 Checking Propace Autofill Status...");
    
    // Check for main functions
    const functions = [
        'fillAdvancedFormFields',
        'debugPropaceFields', 
        'testPropaceAutofill',
        'findAllFillableFields'
    ];
    
    let loadedFunctions = 0;
    functions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} - Available`);
            loadedFunctions++;
        } else {
            console.log(`❌ ${funcName} - Not Available`);
        }
    });
    
    console.log(`📊 Status: ${loadedFunctions}/${functions.length} functions loaded`);
    
    if (loadedFunctions === functions.length) {
        console.log("🎉 Propace Autofill is fully loaded!");
        return true;
    } else {
        console.log("⚠️ Propace Autofill is not fully loaded. Check console for errors.");
        return false;
    }
}

// 2. Find all form fields manually
function findFormFields() {
    console.log("🔍 Scanning for form fields...");
    
    const selectors = [
        'input[type="text"]',
        'input[type="email"]', 
        'input[type="tel"]',
        'input[type="password"]',
        'input:not([type])',
        'textarea',
        'select'
    ];
    
    let totalFields = 0;
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`${selector}: ${elements.length} fields`);
        totalFields += elements.length;
        
        elements.forEach((el, index) => {
            console.log(`  ${index + 1}. Name: "${el.name}" | ID: "${el.id}" | Placeholder: "${el.placeholder}"`);
        });
    });
    
    console.log(`📊 Total: ${totalFields} form fields found`);
    return totalFields;
}

// 3. Test manual filling
function testManualFill() {
    console.log("🧪 Testing manual form filling...");
    
    const testData = {
        'full_name': 'Muhammad Ahmad Khan',
        'father_name': 'Abdul Rahman Khan',
        'cnic': '12345-6789012-3',
        'nationality': 'Pakistani',
        'current_address': 'House No. 123, Street 5, Sector F-7/2, Islamabad'
    };
    
    let filled = 0;
    Object.keys(testData).forEach(fieldName => {
        // Try different selectors
        const selectors = [
            `input[name="${fieldName}"]`,
            `input[id="${fieldName}"]`,
            `textarea[name="${fieldName}"]`,
            `textarea[id="${fieldName}"]`
        ];
        
        for (let selector of selectors) {
            const field = document.querySelector(selector);
            if (field) {
                field.value = testData[fieldName];
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`✅ Filled ${fieldName}: "${testData[fieldName]}"`);
                filled++;
                break;
            }
        }
    });
    
    console.log(`📊 Manually filled ${filled} fields`);
    return filled;
}

// 4. Check for JavaScript errors
function checkForJSErrors() {
    console.log("🐛 Checking for JavaScript errors...");
    
    // Store original console.error
    const originalError = console.error;
    const errors = [];
    
    // Override console.error temporarily
    console.error = function(...args) {
        errors.push(args.join(' '));
        originalError.apply(console, arguments);
    };
    
    // Check for common error patterns in console
    setTimeout(() => {
        console.error = originalError; // Restore original
        
        if (errors.length > 0) {
            console.log("❌ Recent errors found:");
            errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        } else {
            console.log("✅ No recent JavaScript errors detected");
        }
    }, 2000);
}

// 5. Check Chrome extension APIs
function checkChromeAPIs() {
    console.log("🔒 Checking Chrome Extension APIs...");
    
    if (typeof chrome === 'undefined') {
        console.log("❌ Chrome APIs not available");
        return false;
    }
    
    console.log("✅ Chrome object available");
    
    if (chrome.runtime) {
        console.log("✅ chrome.runtime available");
    } else {
        console.log("❌ chrome.runtime not available");
    }
    
    if (chrome.storage) {
        console.log("✅ chrome.storage available");
    } else {
        console.log("❌ chrome.storage not available");
    }
    
    return true;
}

// 6. Test extension messaging
function testExtensionCommunication() {
    console.log("📨 Testing extension messaging...");
    
    try {
        chrome.runtime.sendMessage({
            action: 'test',
            data: { test: true }
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.log("❌ Extension messaging error:", chrome.runtime.lastError.message);
            } else if (response) {
                console.log("✅ Extension messaging working:", response);
            } else {
                console.log("⚠️ Extension messaging: No response received");
            }
        });
    } catch (error) {
        console.log("❌ Extension messaging failed:", error.message);
    }
}

// 7. Complete diagnostic
function runCompleteCheck() {
    console.log("🚀 Running Complete Propace Diagnostic...");
    console.log("=".repeat(50));
    
    const checks = [
        { name: "Content Script", func: checkPropaceStatus },
        { name: "Chrome APIs", func: checkChromeAPIs },
        { name: "Form Fields", func: findFormFields },
        { name: "Manual Fill", func: testManualFill }
    ];
    
    checks.forEach((check, index) => {
        console.log(`\n${index + 1}. Checking ${check.name}...`);
        const result = check.func();
        console.log(`   Result: ${result ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    console.log("\n" + "=".repeat(50));
    console.log("📋 Diagnostic Complete!");
    
    // Check for errors
    checkForJSErrors();
    
    console.log("\n💡 Next Steps:");
    console.log("   1. If Content Script fails: Check browser console for errors");
    console.log("   2. If Chrome APIs fail: Reload the extension");
    console.log("   3. If Form Fields = 0: Check if page has form elements");
    console.log("   4. If Manual Fill fails: Field selectors may need adjustment");
}

// 8. Quick test with current page
function quickTest() {
    console.log("⚡ Quick Propace Test...");
    
    // Check if fillAdvancedFormFields exists
    if (typeof fillAdvancedFormFields === 'function') {
        console.log("✅ fillAdvancedFormFields function found");
        
        const testData = {
            'Name': 'Test User',
            'Father Name': 'Test Father',
            'ID Number': '12345-6789012-3',
            'Phone Number': '+92-300-1234567',
            'Email Address': 'test@example.com',
            'Current Address': 'Test Address, Islamabad, Pakistan'
        };
        
        console.log("🧪 Running autofill test...");
        fillAdvancedFormFields(testData)
            .then(result => {
                console.log("📊 Autofill Result:", result);
            })
            .catch(error => {
                console.log("❌ Autofill Error:", error);
            });
    } else {
        console.log("❌ fillAdvancedFormFields function not found");
        console.log("💡 Content script may not be loaded properly");
    }
}

// ===================================================================
// ==              RUN THESE COMMANDS IN CONSOLE                   ==
// ===================================================================

console.log(`
🔧 PROPACE DEBUG COMMANDS LOADED!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 AVAILABLE COMMANDS:
   runCompleteCheck()           - Complete diagnostic
   checkPropaceStatus()         - Check content script
   findFormFields()             - Find all form fields  
   testManualFill()             - Test manual filling
   checkChromeAPIs()            - Check extension APIs
   testExtensionCommunication() - Test messaging
   quickTest()                  - Quick autofill test

💡 START WITH: runCompleteCheck()
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// Auto-run complete check
setTimeout(() => {
    console.log("🚀 Auto-running complete diagnostic in 2 seconds...");
    setTimeout(runCompleteCheck, 2000);
}, 1000);
