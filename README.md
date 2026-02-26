# Campus Market Backend

Backend API for the Campus Marketplace application with real-time messaging, M-Pesa payments, and role-based access control.

## Database Indexes

This application uses **48 indexes across 10 collections** to optimize query performance.

### Quick Commands

```bash
# Create all indexes
node scripts/create-indexes.js

# Check existing indexes
node scripts/check-indexes.js

# Test index performance
node scripts/test-index-performance.js
```

### Index Summary

| Collection | Indexes | Purpose |
|-----------|---------|---------|
| Products | 9 | Search, filtering, seller queries |
| Orders | 9 | Buyer/seller order history, status filtering |
| Users | 6 | Authentication, role-based queries |
| Messages | 3 | Conversations, unread messages |
| Reviews | 5 | Product/user reviews, ratings |
| Cart | 2 | User cart lookups |
| Wishlist | 3 | Wishlist management |
| Category | 5 | Category lookups, hierarchies |
| Notification | 3 | User notifications |
| SellerBalance | 3 | Seller balance tracking |

### Documentation

- **Detailed Guide**: See [DATABASE-INDEXES.md](./DATABASE-INDEXES.md) for complete documentation
- **Quick Reference**: See [INDEX-QUICK-START.md](./INDEX-QUICK-START.md) for common queries

### Key Indexes

**Authentication**
- Email lookup: `{ email: 1 }` (unique)

**Product Search**
- Seller products: `{ seller: 1, status: 1, createdAt: -1 }`
- Category filter: `{ category: 1, status: 1, price: 1 }`
- Text search: `{ title: 'text', description: 'text', tags: 'text' }`

**Order Management**
- Buyer orders: `{ buyer: 1, createdAt: -1 }`
- Seller orders: `{ seller: 1, status: 1, createdAt: -1 }`

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB 4.0+
- M-Pesa developer account (for payments)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Environment Variables

Required environment variables in `.env`:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/campus_market

# JWT Authentication
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:3000

# Cloudinary (image upload)
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# M-Pesa Payment
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379
MPESA_ENV=sandbox
```

### Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:5000` by default.

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

Most endpoints require JWT authentication:

```javascript
headers: {
  'Authorization': 'Bearer <token>'
}
```

### Main Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

#### Products
- `GET /api/products` - List products (with filters)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (seller/admin)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

#### Orders
- `GET /api/orders` - List orders (buyer/seller/admin)
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status

#### Messages
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/:userId` - Get messages with user
- `POST /api/messages` - Send message

#### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile
- `GET /api/users/:id` - Get user profile

See `DATABASE-INDEXES.md` for information on which indexes optimize these queries.

## Project Structure

```
backend/
├── config/           # Configuration files
│   ├── db.js         # Database connection
│   ├── cloudinary.js # Cloudinary setup
│   └── mpesa.js      # M-Pesa configuration
├── controllers/      # Business logic
│   ├── auth.js       # Authentication
│   ├── product.js    # Product management
│   ├── order.js      # Order processing
│   └── ...
├── middleware/       # Express middleware
│   ├── auth.js       # JWT authentication
│   ├── error.js      # Error handling
│   └── upload.js     # File upload
├── models/           # Mongoose schemas
│   ├── User.js       # User model with indexes
│   ├── Product.js    # Product model with indexes
│   ├── Order.js      # Order model with indexes
│   └── ...
├── routes/           # API routes
│   ├── auth.js       # Auth endpoints
│   ├── products.js   # Product endpoints
│   └── ...
├── scripts/          # Utility scripts
│   ├── create-indexes.js      # Create database indexes
│   ├── check-indexes.js       # View existing indexes
│   ├── test-index-performance.js # Test performance
│   └── seed.js        # Seed database
├── utils/            # Helper functions
│   ├── mpesa.js      # M-Pesa STK push
│   ├── appError.js   # Custom error class
│   └── catchAsync.js # Async error wrapper
└── server.js         # Application entry point
```

## Database Models

### User
- Authentication (email, password)
- Roles (buyer, seller, admin)
- Profile (name, phone, avatar, location)
- Online status tracking

### Product
- Title, description, price
- Category, condition, images
- Seller reference
- Status (available, sold, pending)
- Reviews and ratings

### Order
- Buyer and seller references
- Product reference
- Status tracking (pending → delivered)
- M-Pesa payment integration
- Seller payout tracking

### Message
- Sender and receiver
- Product reference
- Read status
- Real-time via Socket.io

## Real-time Features

### Socket.io Integration

Server runs Socket.io on the same HTTP server for real-time messaging:

```javascript
// Server initialization
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL }
});
```

**Events:**
- `connection` - User connects
- `message` - New message
- `message_read` - Message read
- `user_online` - User comes online
- `user_offline` - User goes offline

## M-Pesa Payment Integration

### STK Push Flow

1. **Initiate Payment**: `POST /api/orders` or `POST /api/orders/checkout`
   - Calls `initiateSTKPush()` in `utils/mpesa.js`
   - Sends STK push to user's phone
   - User enters M-Pesa PIN

2. **Callback**: `POST /api/payment/mpesa/callback` (public route)
   - M-Pesa calls this after transaction
   - Updates order status
   - Creates seller balance records

3. **Query Status**: `querySTKStatus()` checks transaction anytime

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run specific test
npm test -- tests/auth.test.js
```

### Test Database

Uses separate test database (configured in `.env.test`):

```bash
MONGODB_URI=mongodb://localhost:27017/campus_market_test
```

## Deployment

### Production Setup

1. **Set environment variables** on server
2. **Build the application**
3. **Create indexes** on production database:
   ```bash
   node scripts/create-indexes.js
   ```
4. **Start the server**:
   ```bash
   npm start
   ```

### Using PM2 (recommended)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name campus-market-backend

# View logs
pm2 logs campus-market-backend

# Restart
pm2 restart campus-market-backend
```

## Performance Optimization

### Database Indexes

All queries are optimized with indexes. See:
- [DATABASE-INDEXES.md](./DATABASE-INDEXES.md) - Complete index documentation
- [INDEX-QUICK-START.md](./INDEX-QUICK-START.md) - Quick reference guide

Key optimizations:
- Compound indexes for multi-field queries
- Unique indexes for data integrity
- Text indexes for search functionality
- 48 total indexes across 10 collections

### Query Performance

Typical query times with indexes (10K documents):
- Email lookup: < 10ms
- Product by seller: < 20ms
- Order history: < 30ms
- Text search: < 100ms

### Monitoring

Use the provided scripts to monitor performance:

```bash
# Check index status
node scripts/check-indexes.js

# Test query performance
node scripts/test-index-performance.js
```

## Troubleshooting

### Database Connection Issues

```bash
# Check MongoDB is running
sudo systemctl status mongod

# View MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Index Issues

```bash
# Recreate all indexes
node scripts/create-indexes.js

# Check for slow queries
node scripts/test-index-performance.js
```

### M-Pesa Issues

- Verify credentials in `.env`
- Check phone number format (254XXXXXXXX)
- Test in sandbox mode first

## License

MIT

## Support

For issues or questions:
- Check [DATABASE-INDEXES.md](./DATABASE-INDEXES.md) for index-related issues
- Check [INDEX-QUICK-START.md](./INDEX-QUICK-START.md) for query examples
- Review MongoDB logs for database errors
# campus-mis-backend
# Render deployment fix - Чт 26 фев 2026 15:58:12 MSK
