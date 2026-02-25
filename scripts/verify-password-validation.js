#!/usr/bin/env node

/**
 * Quick verification script for password validation
 * Confirms all validation layers are in place
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Password Validation Implementation\n');
console.log('=================================\n');

const checks = [];

// Check 1: User Model
console.log('1. Checking User Model...');
try {
  const userPath = path.join(__dirname, '../models/User.js');
  const userContent = fs.readFileSync(userPath, 'utf8');

  const hasMinLength = userContent.includes('minlength: [12');
  const hasRegex = userContent.includes('(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,}$');

  if (hasMinLength && hasRegex) {
    console.log('✅ User Model: Validation present and correct\n');
    checks.push({ name: 'User Model', status: 'PASS' });
  } else {
    console.log('❌ User Model: Validation missing or incorrect\n');
    console.log(`   minlength check: ${hasMinLength ? '✅' : '❌'}`);
    console.log(`   regex check: ${hasRegex ? '✅' : '❌'}\n`);
    checks.push({ name: 'User Model', status: 'FAIL' });
  }
} catch (error) {
  console.log(`❌ Error reading User model: ${error.message}\n`);
  checks.push({ name: 'User Model', status: 'ERROR' });
}

// Check 2: Auth Controller - Registration
console.log('2. Checking Auth Controller (Registration)...');
try {
  const authPath = path.join(__dirname, '../controllers/auth.js');
  const authContent = fs.readFileSync(authPath, 'utf8');

  const hasLengthCheck = authContent.includes("if (password.length < 12)");
  const hasRegex = authContent.includes('const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,}$/');
  const hasValidation = authContent.includes('if (!passwordRegex.test(password))');

  if (hasLengthCheck && hasRegex && hasValidation) {
    console.log('✅ Auth Controller (Register): Validation present\n');
    checks.push({ name: 'Auth Controller Register', status: 'PASS' });
  } else {
    console.log('❌ Auth Controller (Register): Validation incomplete\n');
    console.log(`   length check: ${hasLengthCheck ? '✅' : '❌'}`);
    console.log(`   regex definition: ${hasRegex ? '✅' : '❌'}`);
    console.log(`   validation check: ${hasValidation ? '✅' : '❌'}\n`);
    checks.push({ name: 'Auth Controller Register', status: 'FAIL' });
  }
} catch (error) {
  console.log(`❌ Error reading Auth controller: ${error.message}\n`);
  checks.push({ name: 'Auth Controller Register', status: 'ERROR' });
}

// Check 3: Auth Controller - Password Change
console.log('3. Checking Auth Controller (Password Change)...');
try {
  const authPath = path.join(__dirname, '../controllers/auth.js');
  const authContent = fs.readFileSync(authPath, 'utf8');

  const changePasswordStart = authContent.indexOf('exports.changePassword');
  const changePasswordEnd = authContent.indexOf('exports.forgotPassword');
  const changePasswordContent = authContent.substring(changePasswordStart, changePasswordEnd);

  const hasLengthCheck = changePasswordContent.includes("if (newPassword.length < 12)");
  const hasRegex = changePasswordContent.includes('const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,}$/');
  const hasValidation = changePasswordContent.includes('if (!passwordRegex.test(newPassword))');

  if (hasLengthCheck && hasRegex && hasValidation) {
    console.log('✅ Auth Controller (Change Password): Validation present\n');
    checks.push({ name: 'Auth Controller Change Password', status: 'PASS' });
  } else {
    console.log('❌ Auth Controller (Change Password): Validation incomplete\n');
    console.log(`   length check: ${hasLengthCheck ? '✅' : '❌'}`);
    console.log(`   regex definition: ${hasRegex ? '✅' : '❌'}`);
    console.log(`   validation check: ${hasValidation ? '✅' : '❌'}\n`);
    checks.push({ name: 'Auth Controller Change Password', status: 'FAIL' });
  }
} catch (error) {
  console.log(`❌ Error checking password change: ${error.message}\n`);
  checks.push({ name: 'Auth Controller Change Password', status: 'ERROR' });
}

// Check 4: Frontend Validation Schema
console.log('4. Checking Frontend Validation Schema...');
try {
  const validationsPath = path.join(__dirname, '../../frontend/lib/validations.ts');
  const validationsContent = fs.readFileSync(validationsPath, 'utf8');

  const hasMinLength = validationsContent.includes('.min(12, \'Password must be at least 12 characters\')');
  const hasLowercase = validationsContent.includes('.regex(/[a-z]/, \'Password must contain at least one lowercase letter\')');
  const hasUppercase = validationsContent.includes('.regex(/[A-Z]/, \'Password must contain at least one uppercase letter\')');
  const hasNumber = validationsContent.includes('.regex(/[0-9]/, \'Password must contain at least one number\')');
  const hasSpecial = validationsContent.includes('.regex(/[@$!%*?&]/, \'Password must contain at least one special character (@$!%*?&)\')');

  if (hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSpecial) {
    console.log('✅ Frontend Validation: All rules present\n');
    checks.push({ name: 'Frontend Validation', status: 'PASS' });
  } else {
    console.log('❌ Frontend Validation: Some rules missing\n');
    console.log(`   minlength: ${hasMinLength ? '✅' : '❌'}`);
    console.log(`   lowercase: ${hasLowercase ? '✅' : '❌'}`);
    console.log(`   uppercase: ${hasUppercase ? '✅' : '❌'}`);
    console.log(`   number: ${hasNumber ? '✅' : '❌'}`);
    console.log(`   special: ${hasSpecial ? '✅' : '❌'}\n`);
    checks.push({ name: 'Frontend Validation', status: 'FAIL' });
  }
} catch (error) {
  console.log(`❌ Error reading frontend validations: ${error.message}\n`);
  checks.push({ name: 'Frontend Validation', status: 'ERROR' });
}

// Check 5: Test Files
console.log('5. Checking Test Files...');
try {
  const unitTestPath = path.join(__dirname, 'test-password-validation-unit.js');
  const integrationTestPath = path.join(__dirname, 'test-password-validation.js');

  const unitTestExists = fs.existsSync(unitTestPath);
  const integrationTestExists = fs.existsSync(integrationTestPath);

  if (unitTestExists && integrationTestExists) {
    console.log('✅ Test Files: Both test files present\n');
    checks.push({ name: 'Test Files', status: 'PASS' });
  } else {
    console.log('❌ Test Files: Some test files missing\n');
    console.log(`   unit test: ${unitTestExists ? '✅' : '❌'}`);
    console.log(`   integration test: ${integrationTestExists ? '✅' : '❌'}\n`);
    checks.push({ name: 'Test Files', status: 'FAIL' });
  }
} catch (error) {
  console.log(`❌ Error checking test files: ${error.message}\n`);
  checks.push({ name: 'Test Files', status: 'ERROR' });
}

// Check 6: Frontend UI Components
console.log('6. Checking Frontend Registration UI...');
try {
  const registerPath = path.join(__dirname, '../../frontend/app/register/RegisterPageClient.tsx');
  const registerContent = fs.readFileSync(registerPath, 'utf8');

  const hasStrengthIndicator = registerContent.includes('passwordStrength');
  const hasRequirements = registerContent.includes('Password Requirements:');
  const hasChecklist = registerContent.includes('At least 12 characters');
  const hasMatchIndicator = registerContent.includes('Passwords match');

  if (hasStrengthIndicator && hasRequirements && hasChecklist && hasMatchIndicator) {
    console.log('✅ Registration UI: All features present\n');
    checks.push({ name: 'Registration UI', status: 'PASS' });
  } else {
    console.log('❌ Registration UI: Some features missing\n');
    console.log(`   strength indicator: ${hasStrengthIndicator ? '✅' : '❌'}`);
    console.log(`   requirements list: ${hasRequirements ? '✅' : '❌'}`);
    console.log(`   checklist items: ${hasChecklist ? '✅' : '❌'}`);
    console.log(`   match indicator: ${hasMatchIndicator ? '✅' : '❌'}\n`);
    checks.push({ name: 'Registration UI', status: 'FAIL' });
  }
} catch (error) {
  console.log(`❌ Error checking registration UI: ${error.message}\n`);
  checks.push({ name: 'Registration UI', status: 'ERROR' });
}

// Summary
console.log('=================================');
console.log('VERIFICATION SUMMARY');
console.log('=================================\n');

const passed = checks.filter(c => c.status === 'PASS').length;
const failed = checks.filter(c => c.status === 'FAIL').length;
const errors = checks.filter(c => c.status === 'ERROR').length;

console.log(`Total Checks: ${checks.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⚠️  Errors: ${errors}\n`);

checks.forEach((check, index) => {
  const icon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${index + 1}. ${icon} ${check.name} - ${check.status}`);
});

console.log('\n=================================\n');

if (failed === 0 && errors === 0) {
  console.log('🎉 ALL CHECKS PASSED! Password validation is fully implemented.\n');
  console.log('Next steps:');
  console.log('1. Run unit tests: node scripts/test-password-validation-unit.js');
  console.log('2. Test registration at: http://localhost:3000/register');
  console.log('3. Test password change in user profile\n');
  process.exit(0);
} else {
  console.log('⚠️  SOME CHECKS FAILED! Please review the issues above.\n');
  process.exit(1);
}
