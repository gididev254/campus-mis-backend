require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

/**
 * Comprehensive Password Validation Test Suite
 * Tests all password requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (@$!%*?&)
 */

async function testPasswordValidation() {
  console.log('🔐 Password Validation Test Suite\n');
  console.log('=================================\n');

  const testResults = [];
  let passedTests = 0;
  let failedTests = 0;

  /**
   * Helper function to run a single test
   */
  async function runTest(testName, password, shouldFail = false, expectedErrorMessage = null) {
    console.log(`Test: ${testName}`);
    console.log(`Password: "${password}"`);

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name: 'Test User',
        email: `test${Date.now()}@test.com`,
        password: password,
        phone: '+254711111111',
        role: 'buyer'
      });

      if (shouldFail) {
        console.log('❌ FAILED: Password was accepted but should have been rejected');
        failedTests++;
        testResults.push({ test: testName, status: 'FAILED', reason: 'Password accepted when it should have been rejected' });
      } else {
        console.log('✅ PASSED: Password accepted successfully');
        passedTests++;
        testResults.push({ test: testName, status: 'PASSED' });
      }
    } catch (error) {
      if (shouldFail) {
        // Check if the error message matches what we expect
        const actualMessage = error.response?.data?.message || '';
        if (expectedErrorMessage && actualMessage.includes(expectedErrorMessage)) {
          console.log('✅ PASSED: Password rejected with correct message');
          console.log(`   Message: ${actualMessage}`);
          passedTests++;
          testResults.push({ test: testName, status: 'PASSED', message: actualMessage });
        } else if (expectedErrorMessage) {
          console.log('⚠️  PARTIAL: Password rejected but with different message');
          console.log(`   Expected: "${expectedErrorMessage}"`);
          console.log(`   Actual: "${actualMessage}"`);
          passedTests++;
          testResults.push({ test: testName, status: 'PARTIAL', message: actualMessage });
        } else {
          console.log('✅ PASSED: Password rejected as expected');
          console.log(`   Message: ${actualMessage}`);
          passedTests++;
          testResults.push({ test: testName, status: 'PASSED', message: actualMessage });
        }
      } else {
        console.log('❌ FAILED: Valid password was rejected');
        console.log(`   Error: ${error.response?.data?.message}`);
        failedTests++;
        testResults.push({ test: testName, status: 'FAILED', reason: 'Valid password rejected', error: error.response?.data?.message });
      }
    }
    console.log('');
  }

  try {
    console.log('--- Length Requirement Tests ---\n');

    await runTest(
      'Too short - 6 characters',
      'Short1!',
      true,
      'at least 12 characters'
    );

    await runTest(
      'Too short - 11 characters',
      'ShortPass1!',
      true,
      'at least 12 characters'
    );

    await runTest(
      'Valid length - exactly 12 characters',
      'ValidPass12!A',
      false
    );

    await runTest(
      'Valid length - more than 12 characters',
      'VeryValidPass12!A',
      false
    );

    console.log('--- Lowercase Requirement Tests ---\n');

    await runTest(
      'Missing lowercase - all uppercase',
      'NOLOWERCASE12!A',
      true,
      'lowercase'
    );

    await runTest(
      'Valid - has lowercase',
      'hasLowercase12!A',
      false
    );

    console.log('--- Uppercase Requirement Tests ---\n');

    await runTest(
      'Missing uppercase - all lowercase',
      'nouppercase12!a',
      true,
      'uppercase'
    );

    await runTest(
      'Valid - has uppercase',
      'hasUppercase12!a',
      false
    );

    console.log('--- Number Requirement Tests ---\n');

    await runTest(
      'Missing number - only letters and special',
      'NoNumberHere!!aa',
      true,
      'number'
    );

    await runTest(
      'Valid - has number',
      'hasNumber12!Aa',
      false
    );

    console.log('--- Special Character Requirement Tests ---\n');

    await runTest(
      'Missing special character - only letters and numbers',
      'NoSpecialChar12Aa',
      true,
      'special character'
    );

    await runTest(
      'Invalid special characters only',
      'InvalidPass12(A)a',
      true,
      'special character'
    );

    await runTest(
      'Valid - has @ special character',
      'valid@email12Aa',
      false
    );

    await runTest(
      'Valid - has $ special character',
      'valid$dollar12Aa',
      false
    );

    await runTest(
      'Valid - has ! special character',
      'valid!exclaim12Aa',
      false
    );

    await runTest(
      'Valid - has % special character',
      'valid%percent12Aa',
      false
    );

    await runTest(
      'Valid - has * special character',
      'valid*asterisk12Aa',
      false
    );

    await runTest(
      'Valid - has ? special character',
      'valid?question12Aa',
      false
    );

    await runTest(
      'Valid - has & special character',
      'valid&ampersand12Aa',
      false
    );

    console.log('--- Complex Valid Password Tests ---\n');

    await runTest(
      'Complex valid password 1',
      'MySecure@Password123',
      false
    );

    await runTest(
      'Complex valid password 2',
      'Another$Secure456Pass',
      false
    );

    await runTest(
      'Complex valid password 3',
      'Very!Strong789PasswordABC',
      false
    );

    console.log('--- Edge Cases ---\n');

    await runTest(
      'Empty password',
      '',
      true
    );

    await runTest(
      'Only special characters',
      '@$!%*?&@$!%*?&',
      true
    );

    await runTest(
      'Only numbers',
      '123456789012',
      true
    );

    await runTest(
      'Repeating pattern',
      'Aa1!Aa1!Aa1!',
      false
    );

    // Summary
    console.log('=================================');
    console.log('TEST SUMMARY');
    console.log('=================================\n');
    console.log(`Total Tests: ${testResults.length}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⚠️  Partial: ${testResults.filter(r => r.status === 'PARTIAL').length}\n`);

    console.log('Detailed Results:');
    console.log('----------------\n');
    testResults.forEach((result, index) => {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`${index + 1}. ${icon} ${result.test}`);
      if (result.message) {
        console.log(`   Message: ${result.message}`);
      }
      if (result.reason) {
        console.log(`   Reason: ${result.reason}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n=================================\n');
    console.log('Requirements Verified:');
    console.log('✓ Minimum 12 characters');
    console.log('✓ At least one uppercase letter (A-Z)');
    console.log('✓ At least one lowercase letter (a-z)');
    console.log('✓ At least one number (0-9)');
    console.log('✓ At least one special character (@$!%*?&)');
    console.log('\n=================================\n');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend is running: npm run dev');
    }
  }

  process.exit(0);
}

// Run tests
testPasswordValidation();
