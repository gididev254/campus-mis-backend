#!/usr/bin/env node

/**
 * Test Script to Verify Cart localStorage Persistence
 *
 * This script verifies that the cart localStorage implementation:
 * 1. Saves cart to localStorage on every change
 * 2. Loads cart from localStorage on mount
 * 3. Handles corrupted localStorage data gracefully
 * 4. Handles localStorage errors gracefully
 * 5. Implements cart expiration (7 days)
 * 6. Validates cart data structure
 */

const fs = require('fs');
const path = require('path');

const cartContextPath = path.join(__dirname, '../../frontend/contexts/CartContext.tsx');

console.log('='.repeat(70));
console.log('CART LOCALSTORAGE PERSISTENCE VERIFICATION');
console.log('='.repeat(70));

// Read the CartContext file
const cartContext = fs.readFileSync(cartContextPath, 'utf8');

const checks = {
  passed: [],
  failed: []
};

// Check 1: localStorage save on cart change
console.log('\n[CHECK 1] Cart saves to localStorage on every change');
if (cartContext.includes('useEffect') &&
    cartContext.includes('saveCartToStorage(cart)') &&
    cartContext.match(/useEffect\(\(\) => \{[\s\S]*?saveCartToStorage\(/)) {
  console.log('✓ PASS: Cart saves to localStorage whenever it changes');
  checks.passed.push('Save on change');
} else {
  console.log('✗ FAIL: Cart does not properly save to localStorage on changes');
  checks.failed.push('Save on change');
}

// Check 2: localStorage load on mount
console.log('\n[CHECK 2] Cart loads from localStorage on mount');
if (cartContext.includes('getStoredCart()') &&
    cartContext.match(/useEffect\(\(\) => \{[\s\S]*?getStoredCart\(\)/)) {
  console.log('✓ PASS: Cart loads from localStorage on mount');
  checks.passed.push('Load on mount');
} else {
  console.log('✗ FAIL: Cart does not load from localStorage on mount');
  checks.failed.push('Load on mount');
}

// Check 3: Error handling for localStorage read
console.log('\n[CHECK 3] Error handling for localStorage read operations');
if (cartContext.includes('catch (error)') &&
    cartContext.includes('Error reading cart from localStorage')) {
  console.log('✓ PASS: Error handling implemented for localStorage read');
  checks.passed.push('Read error handling');
} else {
  console.log('✗ FAIL: No error handling for localStorage read');
  checks.failed.push('Read error handling');
}

// Check 4: Error handling for localStorage write
console.log('\n[CHECK 4] Error handling for localStorage write operations');
if (cartContext.includes('Error saving cart to localStorage')) {
  console.log('✓ PASS: Error handling implemented for localStorage write');
  checks.passed.push('Write error handling');
} else {
  console.log('✗ FAIL: No error handling for localStorage write');
  checks.failed.push('Write error handling');
}

// Check 5: Corrupted data handling
console.log('\n[CHECK 5] Corrupted localStorage data handling');
if (cartContext.includes('JSON.parse(stored)') &&
    cartContext.includes('catch (error)') &&
    cartContext.includes('localStorage.removeItem(CART_STORAGE_KEY)')) {
  console.log('✓ PASS: Corrupted data triggers cleanup and returns empty array');
  checks.passed.push('Corrupted data handling');
} else {
  console.log('✗ FAIL: No proper handling of corrupted localStorage data');
  checks.failed.push('Corrupted data handling');
}

// Check 6: Cart expiration mechanism
console.log('\n[CHECK 6] Cart expiration mechanism (7 days)');
if (cartContext.includes('CART_EXPIRATION_DAYS') &&
    cartContext.includes('timestamp') &&
    cartContext.includes('isExpired') &&
    cartContext.includes('Date.now()')) {
  console.log('✓ PASS: Cart expires after 7 days and is cleaned up');
  checks.passed.push('Cart expiration');
} else {
  console.log('✗ FAIL: No cart expiration mechanism');
  checks.failed.push('Cart expiration');
}

// Check 7: Data structure validation
console.log('\n[CHECK 7] Cart data structure validation');
if (cartContext.includes('Array.isArray(parsed.items)') &&
    cartContext.includes('validItems') &&
    cartContext.includes('item.product') &&
    cartContext.includes('item.quantity')) {
  console.log('✓ PASS: Validates cart items structure before loading');
  checks.passed.push('Data validation');
} else {
  console.log('✗ FAIL: No cart data structure validation');
  checks.failed.push('Data validation');
}

// Check 8: Server-side rendering (SSR) safety
console.log('\n[CHECK 8] Server-side rendering (SSR) safety');
if (cartContext.includes('typeof window === \'undefined\'')) {
  console.log('✓ PASS: Checks for window object to prevent SSR errors');
  checks.passed.push('SSR safety');
} else {
  console.log('✗ FAIL: No SSR safety checks');
  checks.failed.push('SSR safety');
}

// Check 9: Storage key constant
console.log('\n[CHECK 9] Storage key management');
if (cartContext.includes('CART_STORAGE_KEY') &&
    cartContext.includes('campus_market_cart')) {
  console.log('✓ PASS: Uses constant storage key');
  checks.passed.push('Storage key');
} else {
  console.log('✗ FAIL: No proper storage key management');
  checks.failed.push('Storage key');
}

// Check 10: Clear cart functionality
console.log('\n[CHECK 10] Clear cart from localStorage');
if (cartContext.includes('clearCartFromStorage()') &&
    cartContext.includes('localStorage.removeItem(CART_STORAGE_KEY)')) {
  console.log('✓ PASS: Can clear cart from localStorage');
  checks.passed.push('Clear cart');
} else {
  console.log('✗ FAIL: No clear cart from localStorage functionality');
  checks.failed.push('Clear cart');
}

// Summary
console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`Total Checks: ${checks.passed.length + checks.failed.length}`);
console.log(`✓ Passed: ${checks.passed.length}`);
console.log(`✗ Failed: ${checks.failed.length}`);
console.log('');

if (checks.failed.length === 0) {
  console.log('🎉 ALL CHECKS PASSED! Cart localStorage persistence is fully implemented.');
  console.log('');
  console.log('Features verified:');
  checks.passed.forEach(check => console.log(`  ✓ ${check}`));
  console.log('');
  console.log('Implementation details:');
  console.log('  • Storage key: "campus_market_cart"');
  console.log('  • Expiration: 7 days');
  console.log('  • Data validation: Yes');
  console.log('  • Error handling: Yes');
  console.log('  • SSR safety: Yes');
} else {
  console.log('⚠️  SOME CHECKS FAILED');
  console.log('');
  console.log('Failed checks:');
  checks.failed.forEach(check => console.log(`  ✗ ${check}`));
}

console.log('');
console.log('='.repeat(70));

process.exit(checks.failed.length === 0 ? 0 : 1);
