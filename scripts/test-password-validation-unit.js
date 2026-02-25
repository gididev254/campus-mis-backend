/**
 * Unit Test for Password Validation
 * Tests the regex pattern used in both User model and auth controller
 */

// The same regex pattern used in User.js and auth.js
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

console.log('🔐 Password Validation Unit Tests\n');
console.log('=================================\n');

let passed = 0;
let failed = 0;

function testPassword(description, password, shouldPass) {
  const result = passwordRegex.test(password);

  if (result === shouldPass) {
    console.log(`✅ PASS: ${description}`);
    console.log(`   Password: "${password}"`);
    console.log(`   Expected: ${shouldPass ? 'Valid' : 'Invalid'}, Got: ${result ? 'Valid' : 'Invalid'}\n`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Password: "${password}"`);
    console.log(`   Expected: ${shouldPass ? 'Valid' : 'Invalid'}, Got: ${result ? 'Valid' : 'Invalid'}\n`);
    failed++;
  }
}

console.log('--- LENGTH REQUIREMENT (min 12 chars) ---\n');

testPassword(
  'Too short - 6 characters',
  'Short1!',
  false
);

testPassword(
  'Too short - 11 characters',
  'ShortPass1!',
  false
);

testPassword(
  'Valid - exactly 12 characters with all requirements',
  'ValidPass12!A',
  true
);

testPassword(
  'Valid - more than 12 characters',
  'VeryValidPass12!A',
  true
);

console.log('--- LOWERCASE LETTER REQUIREMENT ---\n');

testPassword(
  'Missing lowercase - all uppercase with numbers and special',
  'NOLOWERCASE12!',
  false
);

testPassword(
  'Valid - has lowercase',
  'hasLowercase12!A',
  true
);

testPassword(
  'Valid - lowercase only special',
  'lowercaseOnly1!A',
  true
);

console.log('--- UPPERCASE LETTER REQUIREMENT ---\n');

testPassword(
  'Missing uppercase - all lowercase with numbers and special',
  'nouppercase12!',
  false
);

testPassword(
  'Valid - has uppercase',
  'hasUppercase12!a',
  true
);

console.log('--- NUMBER REQUIREMENT ---\n');

testPassword(
  'Missing number - only letters and special',
  'NoNumberHere!!',
  false
);

testPassword(
  'Valid - has number',
  'hasNumber12!Aa',
  true
);

testPassword(
  'Valid - single number',
  'hasNumber1!Aa',
  true
);

console.log('--- SPECIAL CHARACTER REQUIREMENT ---\n');

testPassword(
  'Missing special character - only letters and numbers',
  'NoSpecialChar12A',
  false
);

testPassword(
  'Invalid special character - using parentheses',
  'InvalidPass12(A)',
  false
);

testPassword(
  'Invalid special character - using hash',
  'InvalidPass12#A',
  false
);

testPassword(
  'Valid - has @ special character',
  'valid@email12A',
  true
);

testPassword(
  'Valid - has $ special character',
  'valid$dollar12A',
  true
);

testPassword(
  'Valid - has ! special character',
  'valid!exclaim12A',
  true
);

testPassword(
  'Valid - has % special character',
  'valid%percent12A',
  true
);

testPassword(
  'Valid - has * special character',
  'valid*asterisk12A',
  true
);

testPassword(
  'Valid - has ? special character',
  'valid?question12A',
  true
);

testPassword(
  'Valid - has & special character',
  'valid&ampersand12A',
  true
);

console.log('--- COMPLEX VALID PASSWORDS ---\n');

testPassword(
  'Complex valid password 1',
  'MySecure@Password123',
  true
);

testPassword(
  'Complex valid password 2',
  'Another$Secure456Pass',
  true
);

testPassword(
  'Complex valid password 3',
  'Very!Strong789PasswordABC',
  true
);

testPassword(
  'Complex valid password 4 with all special chars',
  'All@$!%*?&Chars12A',
  true
);

console.log('--- EDGE CASES ---\n');

testPassword(
  'Empty string',
  '',
  false
);

testPassword(
  'Only special characters',
  '@$!%*?&@$!%*?&',
  false
);

testPassword(
  'Only numbers',
  '123456789012',
  false
);

testPassword(
  'Only letters',
  'OnlyLettersHereAA',
  false
);

testPassword(
  'Repeating valid pattern',
  'Aa1!Aa1!Aa1!',
  true
);

console.log('--- COMMON PASSWORD PATTERNS ---\n');

testPassword(
  'Simple word with number and special (too short)',
  'Test1!',
  false
);

testPassword(
  'Password variant (too short)',
  'Password1!',
  false
);

testPassword(
  'Password variant valid length',
  'Password123!A',
  true
);

testPassword(
  'Keyboard pattern valid',
  'Qwer123456!A',
  true
);

// Summary
console.log('=================================');
console.log('TEST SUMMARY');
console.log('=================================\n');
console.log(`Total Tests: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

console.log('Requirements Verified:');
console.log('✓ Minimum 12 characters');
console.log('✓ At least one lowercase letter (a-z)');
console.log('✓ At least one uppercase letter (A-Z)');
console.log('✓ At least one number (0-9)');
console.log('✓ At least one special character (@$!%*?&)');
console.log('\n=================================\n');

console.log('REGEX PATTERN EXPLANATION:\n');
console.log('Pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,}$/\n');
console.log('Breakdown:');
console.log('  ^                - Start of string');
console.log('  (?=.*[a-z])      - Must contain at least one lowercase letter');
console.log('  (?=.*[A-Z])      - Must contain at least one uppercase letter');
console.log('  (?=.*\\d)         - Must contain at least one digit');
console.log('  (?=.*[@$!%*?&])  - Must contain at least one special char');
console.log('  [A-Za-z\\d@$!%*?&] - Only allowed characters');
console.log('  $                - End of string\n');
console.log('=================================\n');

if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED! Password validation is working correctly.\n');
  process.exit(0);
} else {
  console.log('⚠️  SOME TESTS FAILED! Please review the regex pattern.\n');
  process.exit(1);
}
