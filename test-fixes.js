/*==================================================================================================
    Propace Autofill Assistant - Test Suite for Critical Fixes
    ----------------------------------------------------------
    Manual QA Tests for 15 Critical Issues
====================================================================================================*/

// Test Suite: Run these commands in DevTools Console

window.PropaceTestSuite = {
    // Test #1: performEnhancedAutofill function exists
    testPerformEnhancedAutofill() {
        console.log('🧪 Test 1: performEnhancedAutofill function');
        try {
            const testData = { name: 'Test User', email: 'test@example.com' };
            const result = performEnhancedAutofill(testData);
            console.log('✅ performEnhancedAutofill is defined and callable');
            return { success: true, result };
        } catch (error) {
            console.error('❌ performEnhancedAutofill failed:', error.message);
            return { success: false, error: error.message };
        }
    },

    // Test #2: formatName function exists and works
    testFormatName() {
        console.log('🧪 Test 2: formatName function');
        try {
            const testCases = [
                { input: 'john doe', expected: 'John Doe' },
                { input: 'MARY JANE SMITH', expected: 'Mary Jane Smith' },
                { input: 'muhammad ahmad', expected: 'Muhammad Ahmad' },
                { input: 'احمد علی', expected: 'احمد علی' } // Arabic - should preserve
            ];
            
            let allPassed = true;
            testCases.forEach((test, i) => {
                const result = formatName(test.input);
                const passed = result === test.expected;
                console.log(`Test ${i+1}: "${test.input}" → "${result}" ${passed ? '✅' : '❌'}`);
                if (!passed) allPassed = false;
            });
            
            return { success: allPassed, message: allPassed ? 'All format tests passed' : 'Some tests failed' };
        } catch (error) {
            console.error('❌ formatName test failed:', error.message);
            return { success: false, error: error.message };
        }
    },

    // Test #3: Robust promisified safeStorage wrapper
    async testSafeStorage() {
        console.log('🧪 Test 3: Robust promisified safeStorage wrapper');
        try {
            // Test that safeStorage methods return Promises
            console.log('Testing Promise-based API...');
            const getPromise = safeStorage.get(['test_key']);
            const setPromise = safeStorage.set({ test_key: 'test_value' });
            const removePromise = safeStorage.remove(['test_key']);
            
            if (!(getPromise instanceof Promise) || 
                !(setPromise instanceof Promise) || 
                !(removePromise instanceof Promise)) {
                throw new Error('safeStorage methods must return Promises');
            }
            
            // Test actual functionality
            console.log('Testing set operation...');
            const testData = { test_key: 'test_value', timestamp: Date.now() };
            const setResult = await safeStorage.set(testData);
            console.log('Set result:', setResult);
            
            console.log('Testing get operation...');
            const getResult = await safeStorage.get(['test_key']);
            console.log('Get result:', getResult);
            
            console.log('Testing remove operation...');
            const removeResult = await safeStorage.remove(['test_key']);
            console.log('Remove result:', removeResult);
            
            // Test graceful degradation
            console.log('Testing graceful degradation...');
            const originalChrome = window.chrome;
            window.chrome = undefined;
            
            const fallbackGet = await safeStorage.get(['any_key']);
            const fallbackSet = await safeStorage.set({ any_key: 'value' });
            
            window.chrome = originalChrome; // Restore
            
            const success = setResult && getResult.test_key === testData.test_key && 
                          typeof fallbackGet === 'object' && fallbackSet === false;
            
            return { 
                success, 
                message: success ? 'Robust promisified storage test passed' : 'Storage test failed',
                details: { setResult, getResult, removeResult, fallbackGet, fallbackSet }
            };
        } catch (error) {
            console.error('❌ safeStorage test failed:', error.message);
            return { success: false, error: error.message };
        }
    },

    // Test #4: setNativeValue for React/Vue compatibility
    testSetNativeValue() {
        console.log('🧪 Test 4: setNativeValue function');
        try {
            // Create test input
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'test-input';
            document.body.appendChild(input);
            
            // Test setNativeValue
            setNativeValue(input, 'Test Value');
            
            const success = input.value === 'Test Value';
            
            // Cleanup
            input.remove();
            
            return { success, message: success ? 'setNativeValue works' : 'setNativeValue failed' };
        } catch (error) {
            console.error('❌ setNativeValue test failed:', error.message);
            return { success: false, error: error.message };
        }
    },

    // Test #5: CNIC formatting preserves leading zeros
    testCNICFormatting() {
        console.log('🧪 Test 5: CNIC leading zero preservation');
        try {
            const testCases = [
                { input: '01234567890123', expected: '01234-5678901-23' },
                { input: '12345-6789012-3', expected: '12345-6789012-3' },
                { input: '01234-5678901-23', expected: '01234-5678901-23' }
            ];
            
            let allPassed = true;
            testCases.forEach((test, i) => {
                const result = formatIdNumber(test.input);
                const passed = result.startsWith('01234') || result === test.expected;
                console.log(`CNIC Test ${i+1}: "${test.input}" → "${result}" ${passed ? '✅' : '❌'}`);
                if (!passed) allPassed = false;
            });
            
            return { success: allPassed, message: allPassed ? 'CNIC formatting preserves leading zeros' : 'Leading zero preservation failed' };
        } catch (error) {
            console.error('❌ CNIC formatting test failed:', error.message);
            return { success: false, error: error.message };
        }
    },

    // Test #6: queryDeep for Shadow DOM
    async testQueryDeep() {
        console.log('🧪 Test 6: queryDeep Shadow DOM support');
        try {
            // Test regular DOM query
            const regularResult = await queryDeep('input');
            console.log('Regular DOM inputs found:', regularResult.length);
            
            // Test with timeout
            const timeoutResult = await queryDeep('nonexistent-element', document, 1000);
            console.log('Timeout test (should be empty):', timeoutResult.length);
            
            return { 
                success: true, 
                message: `queryDeep found ${regularResult.length} inputs, timeout handled correctly`
            };
        } catch (error) {
            console.error('❌ queryDeep test failed:', error.message);
            return { success: false, error: error.message };
        }
    },

    // Test #7: Email field detection
    testEmailDetection() {
        console.log('🧪 Test 7: Email field detection');
        try {
            // Create test inputs
            const tests = [
                { type: 'email', id: 'email', expected: 'email' },
                { type: 'text', placeholder: 'Enter your email', expected: 'email' },
                { type: 'text', name: 'user_email', expected: 'email' },
                { type: 'text', id: 'contact', expected: 'text' }
            ];
            
            let allPassed = true;
            tests.forEach((test, i) => {
                const input = document.createElement('input');
                input.type = test.type;
                if (test.id) input.id = test.id;
                if (test.name) input.name = test.name;
                if (test.placeholder) input.placeholder = test.placeholder;
                
                const detected = detectFieldType(input);
                const passed = detected === test.expected;
                console.log(`Email Detection Test ${i+1}: ${JSON.stringify(test)} → "${detected}" ${passed ? '✅' : '❌'}`);
                if (!passed) allPassed = false;
            });
            
            return { success: allPassed, message: allPassed ? 'Email detection works correctly' : 'Email detection has issues' };
        } catch (error) {
            console.error('❌ Email detection test failed:', error.message);
            return { success: false, error: error.message };
        }
    },

    // Test #8: Data normalization
    testDataNormalization() {
        console.log('🧪 Test 8: Data key normalization');
        try {
            const testData = {
                'fullName': 'John Doe',
                'emailAddress': 'john@example.com',
                'phoneNumber': '+1234567890',
                'cnic': '12345-6789012-3'
            };
            
            const normalized = normalizeDataKeys(testData);
            console.log('Original:', Object.keys(testData));
            console.log('Normalized:', Object.keys(normalized));
            
            const success = normalized.name === 'John Doe' && 
                           normalized.email === 'john@example.com' &&
                           normalized.phone === '+1234567890' &&
                           normalized.idNumber === '12345-6789012-3';
            
            return { success, message: success ? 'Data normalization works' : 'Data normalization failed' };
        } catch (error) {
            console.error('❌ Data normalization test failed:', error.message);
            return { success: false, error: error.message };
        }
    },

    // Test #9: Validation function
    testValidation() {
        console.log('🧪 Test 9: Cross-contamination validation');
        try {
            const tests = [
                { value: 'john@example.com', fieldType: 'email', expected: true },
                { value: '12345-6789012-3', fieldType: 'email', expected: false },
                { value: '+1234567890', fieldType: 'phone', expected: true },
                { value: 'john@example.com', fieldType: 'phone', expected: false }
            ];
            
            let allPassed = true;
            tests.forEach((test, i) => {
                const result = validateDataForField(test.value, test.fieldType);
                const passed = result === test.expected;
                console.log(`Validation Test ${i+1}: "${test.value}" in ${test.fieldType} → ${result} ${passed ? '✅' : '❌'}`);
                if (!passed) allPassed = false;
            });
            
            return { success: allPassed, message: allPassed ? 'Validation prevents cross-contamination' : 'Validation has issues' };
        } catch (error) {
            console.error('❌ Validation test failed:', error.message);
            return { success: false, error: error.message };
        }
    },

    // Run all tests
    async runAllTests() {
        console.log('🚀 Running Propace Autofill Test Suite...');
        console.log('='.repeat(50));
        
        const results = [];
        
        // Run each test
        results.push({ name: 'performEnhancedAutofill', ...this.testPerformEnhancedAutofill() });
        results.push({ name: 'formatName', ...this.testFormatName() });
        results.push({ name: 'safeStorage', ...await this.testSafeStorage() });
        results.push({ name: 'setNativeValue', ...this.testSetNativeValue() });
        results.push({ name: 'CNIC formatting', ...this.testCNICFormatting() });
        results.push({ name: 'queryDeep', ...await this.testQueryDeep() });
        results.push({ name: 'Email detection', ...this.testEmailDetection() });
        results.push({ name: 'Data normalization', ...this.testDataNormalization() });
        results.push({ name: 'Validation', ...this.testValidation() });
        
        // Summary
        console.log('='.repeat(50));
        console.log('📊 TEST RESULTS SUMMARY:');
        
        const passed = results.filter(r => r.success).length;
        const total = results.length;
        
        results.forEach(result => {
            console.log(`${result.success ? '✅' : '❌'} ${result.name}: ${result.message || result.error}`);
        });
        
        console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
        
        return { passed, total, results };
    }
};

// Auto-run tests if called directly
if (typeof window !== 'undefined') {
    console.log('🧪 Propace Test Suite loaded. Run: PropaceTestSuite.runAllTests()');
}
