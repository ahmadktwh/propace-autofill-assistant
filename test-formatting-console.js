// Enhanced Formatting Test Console Script
// Copy and paste this in browser console to test formatting functions

console.log('🚀 Enhanced Formatting Test Started');

// Test Pakistani ID formatting
function testIdFormatting() {
    console.log('\n🆔 Testing ID Number Formatting:');
    
    const testIds = [
        '3650223333331',
        '36502233333331', 
        '365022333333',
        '4210188888888',
        '1234567890123'
    ];
    
    testIds.forEach(id => {
        // Simulate the formatting function
        const formatted = formatTestId(id);
        console.log(`   Input: ${id} → Output: ${formatted}`);
    });
}

function formatTestId(id) {
    const cleanId = id.replace(/\D/g, '');
    if (cleanId.length >= 13) {
        return cleanId.substring(0, 5) + '-' + cleanId.substring(5, 12) + '-' + cleanId.substring(12);
    } else if (cleanId.length >= 11) {
        return cleanId.substring(0, 5) + '-' + cleanId.substring(5, 11) + '-' + cleanId.substring(11);
    }
    return cleanId;
}

// Test phone number formatting
function testPhoneFormatting() {
    console.log('\n📱 Testing Phone Number Formatting:');
    
    const testPhones = [
        '923001234567',
        '03001234567',
        '3001234567',
        '03211234567',
        '923211234567'
    ];
    
    testPhones.forEach(phone => {
        const formatted = formatTestPhone(phone);
        console.log(`   Input: ${phone} → Output: ${formatted}`);
    });
}

function formatTestPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('92') && cleanPhone.length === 12) {
        return '+92-' + cleanPhone.substring(2, 5) + '-' + cleanPhone.substring(5);
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        return cleanPhone.substring(0, 4) + '-' + cleanPhone.substring(4);
    } else if (cleanPhone.length === 10) {
        return '0' + cleanPhone.substring(0, 3) + '-' + cleanPhone.substring(3);
    }
    
    return phone;
}

// Test date formatting
function testDateFormatting() {
    console.log('\n📅 Testing Date Formatting:');
    
    const testDates = [
        '1990-05-15',
        '05/15/1990',
        '15/05/1990',
        '2023-12-25',
        '01/01/2000'
    ];
    
    testDates.forEach(date => {
        const formatted = formatTestDate(date);
        console.log(`   Input: ${date} → Output: ${formatted}`);
    });
}

function formatTestDate(dateStr) {
    try {
        let date;
        
        if (dateStr.includes('-')) {
            date = new Date(dateStr);
        } else if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts[0].length === 4) {
                date = new Date(dateStr);
            } else if (parts[2].length === 4) {
                date = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                date = new Date(dateStr);
            }
        } else {
            date = new Date(dateStr);
        }
        
        if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
    } catch (e) {
        console.log(`   Error formatting date: ${e.message}`);
    }
    
    return dateStr;
}

// Test field detection patterns
function testFieldDetection() {
    console.log('\n🎯 Testing Field Detection Patterns:');
    
    const testFields = [
        { name: 'cnic', label: 'CNIC Number' },
        { name: 'national_id', label: 'National ID' },
        { name: 'identity_card', label: 'Identity Card' },
        { name: 'mobile_number', label: 'Mobile Number' },
        { name: 'phone', label: 'Phone' },
        { name: 'contact_no', label: 'Contact Number' },
        { name: 'date_of_birth', label: 'Date of Birth' },
        { name: 'birth_date', label: 'Birth Date' },
        { name: 'dob', label: 'DOB' },
        { name: 'first_name', label: 'First Name' },
        { name: 'last_name', label: 'Last Name' },
        { name: 'full_name', label: 'Full Name' }
    ];
    
    testFields.forEach(field => {
        const detected = detectFieldType(field.name);
        console.log(`   ${field.label} (${field.name}) → Detected as: ${detected}`);
    });
}

function detectFieldType(fieldName) {
    const name = fieldName.toLowerCase();
    
    if (name.includes('cnic') || name.includes('id') || name.includes('identity')) {
        return 'ID Number';
    } else if (name.includes('phone') || name.includes('mobile') || name.includes('contact') || name.includes('tel')) {
        return 'Phone Number';
    } else if (name.includes('date') || name.includes('birth') || name.includes('dob')) {
        return 'Date';
    } else if (name.includes('name')) {
        return 'Name';
    } else if (name.includes('email')) {
        return 'Email';
    } else if (name.includes('address') || name.includes('street') || name.includes('city')) {
        return 'Address';
    }
    
    return 'Unknown';
}

// Test name formatting
function testNameFormatting() {
    console.log('\n👤 Testing Name Formatting:');
    
    const testNames = [
        'ahmad ali khan',
        'MUHAMMAD HASSAN',
        'fatima sheikh',
        'ALI AHMED',
        'sara khan'
    ];
    
    testNames.forEach(name => {
        const formatted = formatTestName(name);
        console.log(`   Input: ${name} → Output: ${formatted}`);
    });
}

function formatTestName(name) {
    return name.toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Run all tests
function runAllTests() {
    console.log('🧪 Running Enhanced Formatting Tests...');
    
    testIdFormatting();
    testPhoneFormatting();
    testDateFormatting();
    testFieldDetection();
    testNameFormatting();
    
    console.log('\n✅ All formatting tests completed!');
    console.log('\n📋 Summary:');
    console.log('   • ID Numbers: 36502-2333333-1 format');
    console.log('   • Phone Numbers: +92-300-1234567 or 0300-1234567 format');
    console.log('   • Dates: DD/MM/YYYY format (Pakistani standard)');
    console.log('   • Names: Proper Case formatting');
    console.log('   • Field Detection: Advanced pattern matching');
}

// Auto-run tests
runAllTests();

// Expose functions for manual testing
window.formatTestId = formatTestId;
window.formatTestPhone = formatTestPhone;
window.formatTestDate = formatTestDate;
window.formatTestName = formatTestName;
window.detectFieldType = detectFieldType;
window.runAllTests = runAllTests;

console.log('\n💡 Available functions for manual testing:');
console.log('   • formatTestId("3650223333331")');
console.log('   • formatTestPhone("923001234567")');
console.log('   • formatTestDate("1990-05-15")');
console.log('   • formatTestName("ahmad ali khan")');
console.log('   • detectFieldType("cnic_number")');
console.log('   • runAllTests()');
