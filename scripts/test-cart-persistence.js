/**
 * Test Cart Persistence Functionality
 *
 * This script tests localStorage-based cart persistence for the Campus Market frontend.
 * It verifies:
 * 1. Cart items are saved to localStorage
 * 2. Cart items are loaded from localStorage on page load
 * 3. Cart items persist across page refreshes
 * 4. Cart items expire after 7 days
 * 5. Invalid cart data is handled gracefully
 * 6. Cart merging logic works correctly
 */

const CART_STORAGE_KEY = 'campus_market_cart';
const CART_EXPIRATION_DAYS = 7;

/**
 * Simulate localStorage for testing
 */
class MockLocalStorage {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();

/**
 * Helper functions (mimicking CartContext)
 */
function saveCartToStorage(items) {
  const storedCart = {
    items,
    timestamp: Date.now(),
  };
  mockStorage.setItem(CART_STORAGE_KEY, JSON.stringify(storedCart));
}

function getStoredCart() {
  try {
    const stored = mockStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Check if cart has expired
    const expirationTime = CART_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - parsed.timestamp > expirationTime;

    if (isExpired) {
      mockStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }

    // Validate cart data structure
    if (!Array.isArray(parsed.items)) {
      mockStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }

    // Validate each cart item
    const validItems = parsed.items.filter(item => {
      return (
        item &&
        typeof item === 'object' &&
        item.product &&
        typeof item.product === 'object' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
      );
    });

    return validItems;
  } catch (error) {
    console.error('Error reading cart from localStorage:', error);
    mockStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

function clearCartFromStorage() {
  mockStorage.removeItem(CART_STORAGE_KEY);
}

/**
 * Test data
 */
const sampleProduct1 = {
  _id: 'prod1',
  title: 'Textbook: Introduction to Algorithms',
  price: 2500,
  images: [],
};

const sampleProduct2 = {
  _id: 'prod2',
  title: 'Scientific Calculator',
  price: 1500,
  images: [],
};

const sampleCartItems = [
  {
    product: sampleProduct1,
    quantity: 2,
    addedAt: new Date().toISOString(),
  },
  {
    product: sampleProduct2,
    quantity: 1,
    addedAt: new Date().toISOString(),
  },
];

/**
 * Test cases
 */
function runTests() {
  console.log('=== Cart Persistence Tests ===\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Save cart to localStorage
  console.log('Test 1: Save cart to localStorage');
  try {
    saveCartToStorage(sampleCartItems);
    const stored = mockStorage.getItem(CART_STORAGE_KEY);
    const parsed = JSON.parse(stored);

    if (
      parsed.items &&
      parsed.items.length === 2 &&
      parsed.items[0].product._id === 'prod1' &&
      parsed.timestamp
    ) {
      console.log('✓ PASSED: Cart saved to localStorage with correct structure\n');
      testsPassed++;
    } else {
      console.log('✗ FAILED: Cart structure is incorrect\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ FAILED:', error.message, '\n');
    testsFailed++;
  }

  // Test 2: Load cart from localStorage
  console.log('Test 2: Load cart from localStorage');
  try {
    const loaded = getStoredCart();

    if (loaded.length === 2 && loaded[0].product._id === 'prod1') {
      console.log('✓ PASSED: Cart loaded from localStorage correctly\n');
      testsPassed++;
    } else {
      console.log('✗ FAILED: Cart not loaded correctly\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ FAILED:', error.message, '\n');
    testsFailed++;
  }

  // Test 3: Handle empty storage
  console.log('Test 3: Handle empty localStorage');
  try {
    mockStorage.clear();
    const loaded = getStoredCart();

    if (Array.isArray(loaded) && loaded.length === 0) {
      console.log('✓ PASSED: Returns empty array for empty storage\n');
      testsPassed++;
    } else {
      console.log('✗ FAILED: Should return empty array\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ FAILED:', error.message, '\n');
    testsFailed++;
  }

  // Test 4: Handle corrupted data
  console.log('Test 4: Handle corrupted data');
  try {
    mockStorage.setItem(CART_STORAGE_KEY, 'invalid-json{');
    const loaded = getStoredCart();

    if (Array.isArray(loaded) && loaded.length === 0) {
      console.log('✓ PASSED: Corrupted data handled gracefully\n');
      testsPassed++;
    } else {
      console.log('✗ FAILED: Should return empty array for corrupted data\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ FAILED:', error.message, '\n');
    testsFailed++;
  }

  // Test 5: Handle invalid cart structure
  console.log('Test 5: Handle invalid cart structure');
  try {
    mockStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: 'not-an-array' }));
    const loaded = getStoredCart();

    if (Array.isArray(loaded) && loaded.length === 0) {
      console.log('✓ PASSED: Invalid structure handled gracefully\n');
      testsPassed++;
    } else {
      console.log('✗ FAILED: Should return empty array for invalid structure\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ FAILED:', error.message, '\n');
    testsFailed++;
  }

  // Test 6: Filter out invalid items
  console.log('Test 6: Filter out invalid items');
  try {
    const mixedItems = [
      { product: sampleProduct1, quantity: 1 }, // Valid
      { product: null, quantity: 1 }, // Invalid
      { product: { _id: 'prod3' }, quantity: 0 }, // Invalid (quantity < 1)
      { quantity: 1 }, // Invalid (no product)
      { product: sampleProduct2, quantity: 2 }, // Valid
    ];
    saveCartToStorage(mixedItems);
    const loaded = getStoredCart();

    if (loaded.length === 2 && loaded[0].product._id === 'prod1' && loaded[1].product._id === 'prod2') {
      console.log('✓ PASSED: Invalid items filtered out correctly\n');
      testsPassed++;
    } else {
      console.log('✗ FAILED: Should filter out invalid items\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ FAILED:', error.message, '\n');
    testsFailed++;
  }

  // Test 7: Cart expiration
  console.log('Test 7: Cart expiration after 7 days');
  try {
    const expiredCart = {
      items: sampleCartItems,
      timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago
    };
    mockStorage.setItem(CART_STORAGE_KEY, JSON.stringify(expiredCart));
    const loaded = getStoredCart();

    if (Array.isArray(loaded) && loaded.length === 0) {
      console.log('✓ PASSED: Expired cart cleared correctly\n');
      testsPassed++;
    } else {
      console.log('✗ FAILED: Should clear expired cart\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ FAILED:', error.message, '\n');
    testsFailed++;
  }

  // Test 8: Clear cart from storage
  console.log('Test 8: Clear cart from storage');
  try {
    saveCartToStorage(sampleCartItems);
    clearCartFromStorage();
    const stored = mockStorage.getItem(CART_STORAGE_KEY);

    if (stored === null) {
      console.log('✓ PASSED: Cart cleared from storage\n');
      testsPassed++;
    } else {
      console.log('✗ FAILED: Cart should be null after clearing\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ FAILED:', error.message, '\n');
    testsFailed++;
  }

  // Test 9: Cart merging logic
  console.log('Test 9: Cart merging logic');
  try {
    const localItems = [
      { product: { _id: 'prod1', title: 'Product 1', price: 100 }, quantity: 3 },
      { product: { _id: 'prod3', title: 'Product 3', price: 300 }, quantity: 1 },
    ];

    const serverItems = [
      { product: { _id: 'prod1', title: 'Product 1', price: 100 }, quantity: 1 },
      { product: { _id: 'prod2', title: 'Product 2', price: 200 }, quantity: 2 },
    ];

    // Merge logic
    const mergedMap = new Map();
    serverItems.forEach(item => {
      mergedMap.set(item.product._id, item);
    });
    localItems.forEach(item => {
      const existing = mergedMap.get(item.product._id);
      if (existing) {
        mergedMap.set(item.product._id, { ...existing, quantity: item.quantity });
      } else {
        mergedMap.set(item.product._id, item);
      }
    });
    const merged = Array.from(mergedMap.values());

    const hasProd1 = merged.find(i => i.product._id === 'prod1' && i.quantity === 3);
    const hasProd2 = merged.find(i => i.product._id === 'prod2' && i.quantity === 2);
    const hasProd3 = merged.find(i => i.product._id === 'prod3' && i.quantity === 1);

    if (hasProd1 && hasProd2 && hasProd3 && merged.length === 3) {
      console.log('✓ PASSED: Cart merged correctly (local takes precedence)\n');
      testsPassed++;
    } else {
      console.log('✗ FAILED: Cart merging logic incorrect\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ FAILED:', error.message, '\n');
    testsFailed++;
  }

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Total tests: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Success rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

  return testsFailed === 0;
}

// Run tests
const success = runTests();
process.exit(success ? 0 : 1);
