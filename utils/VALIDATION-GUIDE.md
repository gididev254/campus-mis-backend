# Validation Utilities - Quick Reference

## Overview
Centralized validation utilities to reduce code duplication and ensure consistent error handling across all controllers.

## Location
`backend/utils/validation.js`

## Available Functions

### 1. validateExists(Model, id, message)
Validate that a document exists by ID.

**Parameters**:
- `Model` - Mongoose model
- `id` - Document ID to find
- `message` - Custom error message (optional)

**Returns**: Found document
**Throws**: ErrorResponse with 404 status if not found

**Example**:
```javascript
const user = await validateExists(User, userId, 'User not found');
```

---

### 2. validateProductForPurchase(ProductModel, productId, userId)
Validate product is available for purchase.

**Checks**:
- Product exists
- Product status is 'available'
- User is not the seller

**Parameters**:
- `ProductModel` - Product Mongoose model
- `productId` - Product ID to validate
- `userId` - User ID attempting to purchase

**Returns**: Product document
**Throws**: ErrorResponse if any validation fails

**Example**:
```javascript
const product = await validateProductForPurchase(Product, productId, req.user.id);
```

**Used in**: cart.js, order.js

---

### 3. validateCategory(CategoryModel, categoryId)
Validate category exists.

**Parameters**:
- `CategoryModel` - Category Mongoose model
- `categoryId` - Category ID to validate

**Returns**: Category document
**Throws**: ErrorResponse with 404 if not found

**Example**:
```javascript
await validateCategory(Category, req.body.category);
```

**Used in**: product.js (2 places)

---

### 4. validateUser(UserModel, userId, message)
Validate user exists.

**Parameters**:
- `UserModel` - User Mongoose model
- `userId` - User ID to validate
- `message` - Custom error message (optional)

**Returns**: User document
**Throws**: ErrorResponse with 404 if not found

**Example**:
```javascript
const user = await validateUser(User, userId, 'User not found');
```

---

### 5. validateOwnership(resource, ownerId, requestUserId, adminRole)
Validate resource ownership or admin access.

**Parameters**:
- `resource` - Resource document with optional role property
- `ownerId` - Owner user ID
- `requestUserId` - Requesting user ID
- `adminRole` - Admin role name (default: 'admin')

**Throws**: ErrorResponse with 403 if not authorized

**Example**:
```javascript
validateOwnership(product, product.seller, req.user.id);
```

---

### 6. validateQuantity(quantity, fieldName)
Validate quantity is positive integer.

**Parameters**:
- `quantity` - Quantity to validate
- `fieldName` - Field name for error message (default: 'Quantity')

**Returns**: Validated quantity as integer
**Throws**: ErrorResponse if quantity < 1

**Example**:
```javascript
const validatedQuantity = validateQuantity(req.body.quantity, 'Item quantity');
```

**Used in**: cart.js

---

### 7. validateRequiredFields(body, requiredFields)
Validate required fields are present in request body.

**Parameters**:
- `body` - Request body object
- `requiredFields` - Array of required field names

**Throws**: ErrorResponse listing all missing fields

**Example**:
```javascript
validateRequiredFields(req.body, ['email', 'password', 'name']);
```

---

### 8. validateEmail(email)
Validate email format.

**Parameters**:
- `email` - Email address to validate

**Returns**: Validated email
**Throws**: ErrorResponse if format is invalid

**Example**:
```javascript
const validatedEmail = validateEmail(req.body.email);
```

---

### 9. validatePassword(password, minLength)
Validate password strength.

**Parameters**:
- `password` - Password to validate
- `minLength` - Minimum length (default: 12)

**Returns**: Validated password
**Throws**: ErrorResponse if too short

**Example**:
```javascript
validatePassword(req.body.newPassword, 12); // 12 characters minimum
validatePassword(req.body.newPassword, 6);  // 6 characters minimum
```

**Used in**: user.js

---

### 10. validatePhoneNumber(phone)
Validate phone number format (basic validation).

**Parameters**:
- `phone` - Phone number to validate

**Returns**: Validated phone number
**Throws**: ErrorResponse if invalid

**Example**:
```javascript
const validatedPhone = validatePhoneNumber(req.body.phone);
```

---

## Usage Patterns

### Pattern 1: Simple Existence Check
```javascript
// Before
const product = await Product.findById(id);
if (!product) {
  return next(new ErrorResponse('Product not found', 404));
}

// After
const product = await validateExists(Product, id, 'Product not found');
```

### Pattern 2: Product Purchase Validation
```javascript
// Before (15 lines)
const product = await Product.findById(productId);
if (!product) {
  return next(new ErrorResponse('Product not found', 404));
}
if (product.status !== 'available') {
  return next(new ErrorResponse('Product is not available', 400));
}
if (product.seller.toString() === req.user.id) {
  return next(new ErrorResponse('Cannot purchase your own product', 400));
}

// After (1 line)
const product = await validateProductForPurchase(Product, productId, req.user.id);
```

### Pattern 3: Quantity Validation
```javascript
// Before
if (!quantity || quantity < 1) {
  return next(new ErrorResponse('Quantity must be at least 1', 400));
}

// After
const validatedQuantity = validateQuantity(quantity);
```

### Pattern 4: Password Validation
```javascript
// Before
if (!password || password.length < 12) {
  return next(new ErrorResponse('Password must be at least 12 characters', 400));
}

// After
validatePassword(password, 12);
```

---

## Best Practices

### 1. Use Specific Validators
Prefer specific validators (`validateProductForPurchase`) over generic ones when available.

### 2. Provide Custom Messages
Use custom error messages for better UX:
```javascript
await validateExists(User, userId, 'Seller account not found');
```

### 3. Catch Errors in Controllers
Validation utilities throw ErrorResponse, so catch them properly:
```javascript
try {
  const product = await validateProductForPurchase(Product, id, userId);
  // Continue with logic
} catch (error) {
  next(error); // Pass to error middleware
}
```

### 4. Use in try-catch Blocks
Always use validation utilities within try-catch blocks:
```javascript
exports.createOrder = async (req, res, next) => {
  try {
    const product = await validateProductForPurchase(Product, id, userId);
    // Rest of logic
  } catch (error) {
    next(error);
  }
};
```

---

## Migration Guide

### Step 1: Import the utilities
```javascript
const { validateExists, validateProductForPurchase } = require('../utils/validation');
```

### Step 2: Find duplicate validation patterns
Look for these patterns in your code:
- `if (!doc) return next(new ErrorResponse(...))`
- Multiple validation checks in sequence
- Repeated validation logic across controllers

### Step 3: Replace with utility functions
```javascript
// Replace
if (!product) { return next(new ErrorResponse('Product not found', 404)); }

// With
await validateExists(Product, productId, 'Product not found');
```

### Step 4: Test thoroughly
- Test successful validation
- Test validation failures
- Test error messages

---

## Benefits

1. **Less Code**: 15 lines → 1 line for complex validations
2. **Consistency**: Same validation logic everywhere
3. **Maintainability**: Update in one place, applies everywhere
4. **Readability**: Self-documenting validation code
5. **Testability**: Easy to test validation functions independently

---

## Adding New Validators

To add a new validation utility:

1. Add function to `backend/utils/validation.js`
2. Follow naming convention: `validate[What]`
3. Always throw `ErrorResponse` for failures
4. Add JSDoc documentation
5. Add usage examples to this guide

Example template:
```javascript
/**
 * Validate [description]
 * @param {Type} param - Description
 * @returns {Type} Description
 * @throws {ErrorResponse} If validation fails
 */
exports.validateSomething = async (param) => {
  // Validation logic
  if (!valid) {
    throw new ErrorResponse('Error message', statusCode);
  }
  return validatedValue;
};
```

---

**Last Updated**: 2026-02-25
**Version**: 1.0.0
