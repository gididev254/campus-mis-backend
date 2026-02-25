# Database Indexes - Campus Market

This document describes all database indexes added to optimize query performance for the Campus Market application.

## Overview

Indexes are critical for query performance, especially as the database grows. The indexes below target the most common query patterns based on the application's features.

## Product Indexes

### Compound Indexes

```javascript
// Seller dashboard: List seller's products with status filtering and date sorting
{ seller: 1, status: 1, createdAt: -1 }

// Product listing: Filter by category and status, sort by price
{ category: 1, status: 1, price: 1 }

// General listing: Show available products sorted by date
{ status: 1, createdAt: -1 }
```

**Use Cases:**
- **Seller Dashboard**: Sellers viewing their products with status filters
- **Category Pages**: Browsing products by category with price sorting
- **Homepage/Product Listing**: Showing available products sorted by newest

### Single Field Indexes

```javascript
{ seller: 1 }              // All products by a seller
{ category: 1, status: 1 } // Category filtering
{ price: 1 }               // Price sorting
{ createdAt: -1 }          // Date sorting
```

### Text Search Index

```javascript
{ title: "text", description: "text", tags: "text" }
```

**Use Case:** Full-text search functionality

## Order Indexes

### Compound Indexes

```javascript
// Buyer order history: View orders sorted by date
{ buyer: 1, createdAt: -1 }

// Seller dashboard: View orders with status filtering and date sorting
{ seller: 1, status: 1, createdAt: -1 }

// Admin dashboard: View all orders by status with date sorting
{ status: 1, createdAt: -1 }
```

**Use Cases:**
- **Buyer Orders Page**: Buyers viewing their order history
- **Seller Dashboard**: Sellers managing incoming orders by status
- **Admin Dashboard**: Admins managing orders by status

### Unique Indexes

```javascript
{ orderNumber: 1 } // Unique constraint for order lookup
```

**Use Case:** Order lookup by order number (e.g., `ORD-1234567890-0001`)

### Additional Indexes

```javascript
{ seller: 1, createdAt: -1 }  // Seller orders by date
{ buyer: 1, status: 1 }       // Buyer orders by status
{ checkoutSessionId: 1 }     // M-Pesa checkout tracking
{ checkoutRequestID: 1 }     // M-Pesa STK push tracking
```

## User Indexes

### Unique Indexes

```javascript
{ email: 1 } // Unique constraint for authentication
```

**Use Case:** Email lookups during login and registration

### Compound Indexes

```javascript
// Admin queries: Filter users by role and active status
{ role: 1, isActive: 1 }
```

**Use Case:** Admin dashboard showing active users by role

### Additional Indexes

```javascript
{ isOnline: 1 }      // Online user tracking
{ role: 1 }          // Role-based queries
{ createdAt: -1 }    // User sorting by registration date
```

## Message Indexes

### Compound Indexes

```javascript
// Conversation retrieval: Get messages between two users, sorted by date
{ sender: 1, receiver: 1, createdAt: -1 }
```

**Use Cases:**
- **Messaging System**: Loading chat history between two users
- **Conversation List**: Displaying recent conversations
- **Real-time Chat**: Efficiently fetching new messages

### Additional Indexes

```javascript
{ receiver: 1, isRead: 1 }  // Unread message queries
```

**Use Case:** Unread message badge counts and notifications

**Note:** The `conversationId` is not stored as a separate field but is derived from the sender/receiver pair. The compound index on `sender + receiver + createdAt` efficiently supports conversation queries.

## Review Indexes

### Unique Indexes

```javascript
{ order: 1 } // Unique constraint - one review per order
```

**Use Case:** Ensures each order can only have one review

### Compound Indexes

```javascript
// Product reviews: Get reviews for a product, sorted by rating and date
{ product: 1, rating: -1, createdAt: -1 }

// User reviews: Get reviews for a user, sorted by date
{ reviewedUser: 1, createdAt: -1 }

// Reviewer's reviews: Get all reviews written by a user
{ reviewer: 1, createdAt: -1 }
```

**Use Cases:**
- **Product Page**: Showing reviews sorted by rating (highest first)
- **User Profile**: Displaying reviews received by a seller/buyer
- **My Reviews**: Showing all reviews written by the current user

## Cart, Wishlist, Notification, SellerBalance, Category Indexes

### Cart

```javascript
{ user: 1 } // Unique constraint - one cart per user
```

### Wishlist

```javascript
{ user: 1 }        // Unique constraint - one wishlist per user
{ products: 1 }    // Find users who wishlisted a product
```

### Notification

```javascript
{ recipient: 1, isRead: 1, createdAt: -1 }  // User's notifications with read status
{ recipient: 1, createdAt: -1 }              // User's notifications sorted by date
```

### SellerBalance

```javascript
{ seller: 1 }          // Unique constraint - one balance per seller
{ currentBalance: -1 } // Sellers sorted by balance (for admin)
```

### Category

```javascript
{ name: 1 }    // Unique constraint for category names
{ slug: 1 }    // Unique constraint for URL slugs
```

## Performance Benefits

### Query Performance Improvements

1. **Seller Dashboard**
   - Before: Collection scan, O(n)
   - After: Index seek, O(log n)
   - Typical query: `Product.find({ seller: userId, status: 'available' }).sort({ createdAt: -1 })`

2. **Category Pages**
   - Before: Collection scan with sort, O(n log n)
   - After: Index seek, O(log n)
   - Typical query: `Product.find({ category: categoryId, status: 'available' }).sort({ price: 1 })`

3. **Order History**
   - Before: Collection scan, O(n)
   - After: Index seek, O(log n)
   - Typical query: `Order.find({ buyer: userId }).sort({ createdAt: -1 })`

4. **Admin User Management**
   - Before: Collection scan, O(n)
   - After: Index seek, O(log n)
   - Typical query: `User.find({ role: 'seller', isActive: true })`

### Storage Overhead

Indexes add storage overhead but significantly improve read performance:

- **Product indexes**: ~50-100 KB per 10,000 products (estimated)
- **Order indexes**: ~40-80 KB per 10,000 orders (estimated)
- **User indexes**: ~10-20 KB per 10,000 users (estimated)

The performance gains far outweigh the minimal storage cost.

## Index Creation Scripts

### Create All Indexes

```bash
node backend/scripts/create-indexes.js
```

This script creates all indexes defined in the models. It's safe to run multiple times - MongoDB will skip existing indexes.

### Check Existing Indexes

```bash
node backend/scripts/check-indexes.js
```

This script displays all existing indexes on the collections, useful for verifying index creation.

## Automatic Index Creation

Indexes are automatically created when the application starts if they don't exist, thanks to Mongoose's `createIndexes()` method. However, running the dedicated script is recommended for:

1. Initial database setup
2. After major schema changes
3. Performance troubleshooting

## Index Maintenance

### Rebuild Indexes

If indexes become fragmented or corrupted:

```javascript
// MongoDB shell
db.products.reIndex()
db.orders.reIndex()
db.users.reIndex()
```

### Drop Indexes

```javascript
// Drop a specific index
db.products.dropIndex('seller_1_status_1_createdAt_-1')

// Drop all indexes except _id
db.products.dropIndexes()
```

## Monitoring Index Performance

### Check Index Usage

```javascript
// MongoDB shell
db.products.getIndexes()
db.orders.getIndexes()
db.users.getIndexes()
```

### Query Execution Plans

```javascript
// See if queries are using indexes
db.products.find({ seller: ObjectId("..."), status: 'available' }).explain('executionStats')
```

Look for:
- `stage: 'IXSCAN'` - Index scan (good!)
- `stage: 'COLLSCAN'` - Collection scan (needs index!)

## Best Practices

1. **Compound Index Order**: Most selective field first
   - `{ seller: 1, status: 1, createdAt: -1 }` - seller narrows results most

2. **Sort Direction**: Match query sort direction
   - If sorting `{ createdAt: -1 }`, index should be `{ createdAt: -1 }`

3. **Covered Queries**: Include all queried fields in compound index when possible

4. **Index Size**: Monitor index size vs data size
   - Indexes should be < 10% of data size for optimal performance

5. **Write Performance**: More indexes = slower writes
   - Balance read performance vs write performance based on workload

## Troubleshooting

### Slow Queries Despite Indexes

1. Check if query matches index order
2. Verify index isn't filtered out (e.g., status filter missing from index)
3. Check execution plan with `explain()`

### Index Not Being Used

1. Ensure query fields match index fields exactly
2. Check for functions/operators that prevent index usage (e.g., `$where`, regex without prefix)
3. Verify index isn't fragmented

### High Memory Usage

1. Monitor index size with `db.collection.stats()`
2. Remove unused indexes
3. Consider partial indexes for filtered data

## Future Optimization Opportunities

1. **Partial Indexes**: Index only active products
   ```javascript
   productSchema.index({ seller: 1, createdAt: -1 }, { partialFilterExpression: { status: 'available' } })
   ```

2. **TTL Indexes**: Automatically delete old soft-deleted documents
   ```javascript
   orderSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 2592000 }) // 30 days
   ```

3. **Hashed Indexes**: For sharding large collections
   ```javascript
   userSchema.index({ email: 'hashed' })
   ```

## References

- [MongoDB Indexes Documentation](https://docs.mongodb.com/manual/indexes/)
- [Mongoose Indexes](https://mongoosejs.com/docs/guide.html#indexes)
- [Compound Indexes](https://docs.mongodb.com/manual/core/index-compound/)
- [Text Indexes](https://docs.mongodb.com/manual/core/index-text/)
