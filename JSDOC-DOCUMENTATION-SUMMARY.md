# JSDoc Documentation Summary - Campus Market Backend

This document provides a summary of all JSDoc documentation added to the Campus Market backend codebase.

## Overview

Comprehensive JSDoc documentation has been added to all controllers, models, and utility functions. The documentation follows standard JSDoc conventions and includes:

- Function/method descriptions
- Route endpoints (for controllers)
- Access control levels (public, private, role-based)
- Parameter types and descriptions
- Return value types and descriptions
- Error conditions

## Documented Files

### Controllers (`backend/controllers/`)

All controller functions have been documented with:
- `@desc` - Function description
- `@route` - API endpoint path and method
- `@access` - Access level (Public, Private, Admin, Seller, etc.)
- `@param` - Request parameters (body, params, query)
- `@returns` - Response structure
- `@throws` - Error conditions

#### Auth Controller (`auth.js`)
- `register` - User registration with password validation
- `login` - User authentication
- `getMe` - Get current user profile
- `updateProfile` - Update profile information
- `changePassword` - Password change
- `forgotPassword` - Initiate password reset
- `resetPassword` - Complete password reset
- `refreshToken` - JWT token refresh
- `generateToken` (helper) - Generate JWT tokens

#### User Controller (`user.js`)
- `getUsers` - List all users (admin)
- `getUser` - Get single user by ID
- `updateUser` - Update user details (admin)
- `deleteUser` - Delete user (admin)
- `getDashboardStats` - Seller dashboard statistics
- `resetUserPassword` - Admin password reset
- `changePassword` - User password change

#### Product Controller (`product.js`)
- `getProducts` - List products with filtering/search/pagination
- `getSoldProducts` - Get sold products history
- `getProduct` - Get single product
- `createProduct` - Create new product listing
- `updateProduct` - Update product
- `deleteProduct` - Delete product
- `relistProduct` - Re-list sold product
- `toggleLike` - Like/unlike product
- `getSellerProducts` - Get seller's products
- `getRelatedProducts` - Get related products by category

#### Order Controller (`order.js`)
- `checkoutCart` - Multi-seller cart checkout
- `createOrder` - Create single product order
- `initiatePayment` - Initiate M-Pesa STK push
- `getOrder` - Get single order
- `getOrders` - List user's orders
- `updateOrderStatus` - Update order status (seller/admin)
- `cancelOrder` - Cancel order (buyer)
- `mpesaCallback` - M-Pesa payment callback webhook
- `getPayoutLedger` - Admin payout ledger
- `markSellerPaid` - Mark seller as paid (admin)
- `markSellerPaidBatch` - Batch mark seller paid (admin)
- `getPaymentStatus` - Check payment status

#### Cart Controller (`cart.js`)
- `getCart` - Get user's cart
- `addItem` - Add item to cart
- `removeItem` - Remove item from cart
- `updateItemQuantity` - Update item quantity
- `clearCart` - Clear all items

#### Category Controller (`category.js`)
- `getCategories` - List all categories
- `getCategory` - Get single category with products
- `createCategory` - Create category (admin)
- `updateCategory` - Update category (admin)
- `deleteCategory` - Delete category (admin)

#### Message Controller (`message.js`)
- `sendMessage` - Send message to user
- `getConversation` - Get conversation messages
- `getConversations` - Get all user conversations
- `getUnreadCount` - Get unread message count
- `markAsRead` - Mark message as read
- `deleteMessage` - Delete message

#### Wishlist Controller (`wishlist.js`)
- `getWishlist` - Get user's wishlist
- `addProduct` - Add product to wishlist
- `removeProduct` - Remove product from wishlist
- `checkProduct` - Check if product is in wishlist
- `clearWishlist` - Clear all products

#### Notification Controller (`notification.js`)
- `getNotifications` - Get user's notifications
- `getUnreadCount` - Get unread count
- `markAsRead` - Mark notification as read
- `markAllAsRead` - Mark all as read
- `deleteNotification` - Delete notification
- `clearAll` - Clear all notifications

#### Review Controller (`review.js`)
- `createReview` - Create review for seller
- `getUserReviews` - Get reviews for user
- `getMyReviews` - Get reviews written by user
- `getReview` - Get single review
- `updateReview` - Update review
- `deleteReview` - Delete review

#### Upload Controller (`upload.js`)
- `uploadImage` - Upload single image to Cloudinary
- `uploadImages` - Upload multiple images (max 5)
- `deleteImage` - Delete image from Cloudinary

### Models (`backend/models/`)

All model schemas have been documented with:
- File-level `@fileoverview` and `@description`
- `@typedef` definitions for the schema
- Field descriptions with types and validation rules
- Method documentation with parameters and returns
- Index documentation explaining their purpose

#### User Model (`User.js`)
- Fields: name, email, password, role, phone, avatar, location, isVerified, isActive, ratings, online status
- Methods: `comparePassword` - Password verification
- Pre-save middleware: Password hashing

#### Product Model (`Product.js`)
- Fields: title, description, price, category, condition, images, seller, location, status, negotiable, views, likes, ratings, tags
- Indexes: Text search, seller/status, category/status, general listing

#### Order Model (`Order.js`)
- Fields: orderNumber, buyer, seller, product, quantity, totalPrice, status, payment info, payout tracking, shipping address
- Methods: Auto-generated order number
- Indexes: Buyer orders, seller orders, payout tracking

#### Cart Model (`Cart.js`)
- Fields: user (unique), items (array), totalAmount
- Methods: `addItem`, `removeItem`, `updateItemQuantity`, `clearCart`
- Static: `getOrCreate` - Get or create user cart
- Index: Unique user constraint

#### Message Model (`Message.js`)
- Fields: sender, receiver, product, content, isRead, readAt
- Indexes: Conversation queries, unread queries

#### Review Model (`Review.js`)
- Fields: reviewer, reviewedUser, product, order (unique), rating, comment
- Post-save middleware: Auto-update user ratings
- Indexes: Unique per order, product reviews, user reviews

#### Wishlist Model (`Wishlist.js`)
- Fields: user (unique), products (array)
- Methods: `addProduct`, `removeProduct`, `hasProduct`
- Static: `getOrCreate`
- Indexes: Unique user, product queries

#### Notification Model (`Notification.js`)
- Fields: recipient, sender, type, title, message, data, isRead, readAt
- Methods: `markAsRead`
- Static helpers: `orderCreated`, `orderConfirmed`, `newMessage`, etc.
- Indexes: Recipient queries with read status

#### Category Model (`Category.js`)
- Fields: name (unique), slug (auto-generated), description, icon, image, isActive, parentCategory
- Pre-save middleware: Auto-generate slug
- Indexes: Active categories, parent category queries

#### SellerBalance Model (`SellerBalance.js`)
- Fields: seller (unique), earnings, orders, current balance, withdrawals, pending
- Methods: `addEarnings`, `recordWithdrawal`, `confirmWithdrawal`
- Static: `getOrCreate`
- Index: Unique seller, balance ranking

### Utilities (`backend/utils/`)

All utility functions have been documented with:
- File-level `@fileoverview` and `@description`
- Function descriptions
- Parameter types and descriptions
- Return value types
- Error conditions

#### M-Pesa Utilities (`mpesa.js`)
- `generateToken` - Generate M-Pesa OAuth token
- `initiateSTKPush` - Initiate STK push payment
- `querySTKStatus` - Query transaction status
- `validatePhoneNumber` - Normalize phone number format

#### Validation Utilities (`validation.js`)
- `validateExists` - Check document exists
- `validateProductForPurchase` - Validate product for purchase
- `validateCategory` - Check category exists
- `validateUser` - Check user exists
- `validateOwnership` - Verify resource ownership
- `validateQuantity` - Validate positive quantity
- `validateRequiredFields` - Check required fields present
- `validateEmail` - Email format validation
- `validatePassword` - Password strength validation
- `validatePhoneNumber` - Phone number validation

#### Helper Utilities (`helpers.js`)
- `getPagination` - Calculate pagination metadata
- `formatPaginationResponse` - Format paginated response
- `generateRandomString` - Generate random alphanumeric string
- `slugify` - Convert text to URL slug
- `sanitize` - Remove HTML tags from input
- `calculateDistance` - Calculate distance between coordinates
- `formatPrice` - Format price as KES currency
- `formatDate` - Format date in Kenyan locale
- `asyncHandler` - Wrapper for async Express handlers
- `filterObject` - Filter object by allowed fields

#### Notification Utilities (`notifications.js`)
- `emitNotification` - Emit via Socket.io
- `createNotification` - Create and emit notification
- `getNotificationUnreadCount` - Count unread notifications
- `getMessageUnreadCount` - Count unread messages
- `emitUnreadCount` - Emit unread count update

#### Error Utilities
- `appError.js` - Custom error class with status codes
- `catchAsync.js` - Async wrapper for error handling

## JSDoc Tags Used

### Standard Tags
- `@fileoverview` - File-level description
- `@description` - Detailed description
- `@module` - Module name
- `@typedef` - Type definition
- `@property` - Object property
- `@enum` - Enum values

### Function Tags
- `@desc` - Function description
- `@route` - API route (HTTP method and path)
- `@access` - Access level
- `@param` / `@arg` / `@argument` - Parameters
- `@returns` / `@return` - Return value
- `@throws` / `@exception` - Errors thrown
- `@async` - Async function
- `@function` - Function declaration
- `@method` - Class method
- `@static` - Static method
- `@class` / `@constructor` - Class definition

### Type Tags
- `@type {Type}` - Variable type
- `@param {Type} name` - Parameter with type
- `@returns {Type}` - Return type
- `@Promise<Type>` - Promise return type

## Type Definitions

Common types used:
- `{string}` - String
- `{number}` - Number
- `{boolean}` - Boolean
- `{Object}` - Plain object
- `{Array}` - Array
- `{Date}` - Date object
- `{Function}` - Function
- `{Promise<Type>}` - Promise returning Type
- `{mongoose.Types.ObjectId}` - MongoDB ObjectId
- `{mongoose.Schema.Types.ObjectId}` - Schema reference

## Examples

### Controller Function Documentation
```javascript
/**
 * @desc    Get all products with filtering, search, and pagination
 * @route   GET /api/products
 * @access  Public
 * @param   {Object} req.query - Query parameters
 * @param   {number} [req.query.page=1] - Page number for pagination
 * @param   {number} [req.query.limit=12] - Number of items per page
 * @returns {Promise<Object>} Paginated response with products array and metadata
 */
exports.getProducts = async (req, res, next) => { ... }
```

### Model Documentation
```javascript
/**
 * @fileoverview Product model schema for Campus Market
 * @description Defines the structure and behavior of product listings created by sellers
 * @module models/Product
 */

/**
 * Product Schema
 * @typedef {Object} Product
 * @property {string} title - Product title (required, max 100 chars)
 * @property {number} price - Product price in KES (required, non-negative)
 * ...
 */
```

### Utility Function Documentation
```javascript
/**
 * Generate pagination metadata from page and limit parameters
 * @function
 * @param {number|string} page - Page number (default: 1)
 * @param {number|string} limit - Number of items per page (default: 10)
 * @returns {Object} Pagination metadata with skip, limit, and page values
 */
exports.getPagination = (page, limit) => { ... }
```

## Benefits

1. **IDE Support**: Autocomplete and inline documentation in VS Code, WebStorm, etc.
2. **Type Safety**: Better TypeScript integration when using JSDoc types
3. **API Documentation**: Easy generation of API documentation using tools like JSDoc
4. **Code Understanding**: Quick understanding of function signatures and purposes
5. **Team Collaboration**: Clear documentation for other developers
6. **Refactoring**: Safer refactoring with type information
7. **Self-Documenting Code**: Documentation stays in sync with code

## Generating Documentation

To generate HTML documentation from JSDoc comments:

```bash
# Install JSDoc globally (if not installed)
npm install -g jsdoc

# Navigate to backend directory
cd backend

# Generate documentation
jsdoc -r . -d ../docs/api

# Or with a custom template
jsdoc -r . -d ../docs/api -t docdash
```

## Best Practices Followed

1. **Consistent Format**: All functions follow the same documentation structure
2. **Complete Coverage**: Every exported function/mode is documented
3. **Clear Descriptions**: Descriptions explain what, not just how
4. **Type Information**: All parameters and returns have type annotations
5. **Default Values**: Default parameters are documented
6. **Error Conditions**: `@throws` tags document error cases
7. **Access Control**: Clear indication of who can access each endpoint
8. **Route Information**: API endpoints documented with `@route` tags
9. **Module Documentation**: File-level overviews explain module purpose
10. **Index Documentation**: Database indexes explained with their purpose

## Maintenance

When adding new functions or modifying existing ones:

1. Add JSDoc comments following the established format
2. Include all relevant tags (@desc, @route, @access, @param, @returns)
3. Document error conditions with @throws
4. Update type definitions if modifying schemas
5. Keep documentation in sync with code changes

## Related Files

- **Database Indexes**: `/backend/INDEX-QUICK-START.md`
- **API Versioning**: `/API-VERSIONING-QUICK-REF.md`
- **Validation Rules**: `/backend/utils/validation.js`
- **M-Pesa Integration**: `/backend/utils/mpesa.js`

---

Documentation generated: 2025-02-25
Last updated: Task #58 - Add JSDoc documentation
