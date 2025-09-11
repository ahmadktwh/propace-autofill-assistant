// Test the basic structure
if (window.propaceAutofillInjected) {
    console.log('already injected');
} else {
    console.log('new injection');
    
    // Test a simple function
    const test = () => {
        console.log('test function');
    };
    
    console.log('end of else block');
}

console.log('end of file');
