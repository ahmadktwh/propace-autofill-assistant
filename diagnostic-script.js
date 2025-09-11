console.log('🔍 PROPACE DIAGNOSTIC: Checking content script status...');

// Check if main patterns are defined
if (typeof ADVANCED_FIELD_PATTERNS !== 'undefined') {
    console.log('✅ ADVANCED_FIELD_PATTERNS is defined');
    console.log('📊 Pattern types available:', Object.keys(ADVANCED_FIELD_PATTERNS));
} else {
    console.log('❌ ADVANCED_FIELD_PATTERNS is NOT defined');
}

// Check if main functions are available
const functionsToCheck = [
    'debugPropaceFields',
    'testPropaceAutofill', 
    'analyzePropacePatterns',
    'analyzePropaceStorage',
    'fillAdvancedFormFields'
];

console.log('🔧 Checking Propace functions:');
functionsToCheck.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ ${funcName} is available`);
    } else {
        console.log(`❌ ${funcName} is NOT available`);
    }
});

// Check Chrome extension APIs
if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('✅ Chrome extension APIs available');
    console.log('📍 Extension ID:', chrome.runtime.id);
} else {
    console.log('❌ Chrome extension APIs NOT available');
}

// Check page context
console.log('📄 Page URL:', window.location.href);
console.log('📄 Document ready state:', document.readyState);
console.log('📄 User agent:', navigator.userAgent.substring(0, 50) + '...');

// Try to find form fields
const formFields = document.querySelectorAll('input, select, textarea');
console.log('📝 Form fields found on page:', formFields.length);

// Check if this is running in correct context
if (window.location.href.includes('chrome-extension://')) {
    console.log('⚠️ WARNING: Running in extension context, not webpage context');
    console.log('💡 TIP: Run this on a regular webpage, not extension popup');
} else {
    console.log('✅ Running in webpage context (correct)');
}

console.log('🔍 DIAGNOSTIC COMPLETE - Check results above');
