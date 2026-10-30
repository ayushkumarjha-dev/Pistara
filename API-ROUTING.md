# API Routing Documentation

## Overview
This project uses a **single consolidated API handler** at `/api/index.ts` to comply with Vercel's Hobby plan limit of 12 serverless functions.

## Architecture

### Single Entry Point
- **File**: `/api/index.ts`
- **Handlers**: `/api-handlers/*`
- **Purpose**: Routes all API requests to their respective handlers located in `api-handlers/`
- **Benefits**: 
  - Complies with Vercel Hobby plan (only 1 serverless function created from `/api/index.ts` instead of multiple separate endpoints)
  - Centralized routing logic
  - Easy to maintain and debug

### How It Works

1. All requests to `/api/*` are rewritten to `/api` (configured in `vercel.json`)
2. The single function at `/api/index.ts` matches the request method and path
3. Routes to the appropriate handler function in `/api-handlers/*`
4. Returns the response

## Supported Routes

### Authentication (`/api/auth/...`)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot` - Request password reset
- `POST /api/auth/reset` - Reset password with token

### Products (`/api/products/...`)
- `GET /api/products` - List all products (with filters)
- `GET /api/products/:slug` - Get product by slug

### Orders (`/api/orders/...`)
- `GET /api/orders` - List user's orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order by ID

### Public Routes
- `GET /api/categories` - List all categories
- `GET /api/settings` - Get public settings (delivery charge, etc.)

### Profile (`/api/profile`)
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile & addresses

### Admin Routes (`/api/admin/...`)

#### Customers
- `GET /api/admin/customers` - List all customers
- `GET /api/admin/customers/:id` - Get customer details
- `PUT /api/admin/customers/:id` - Update customer
- `DELETE /api/admin/customers/:id` - Delete customer

#### Orders
- `GET /api/admin/orders` - List all orders
- `GET /api/admin/orders/:id` - Get order details
- `PUT /api/admin/orders/:id` - Update order status

#### Products
- `GET /api/admin/products` - List all products
- `POST /api/admin/products` - Create new product
- `GET /api/admin/products/:id` - Get product details
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product

#### Settings & Stats
- `GET /api/admin/settings` - Get admin settings
- `PUT /api/admin/settings` - Update settings
- `GET /api/admin/stats` - Get dashboard statistics

## Configuration

### vercel.json
```json
{
  "functions": {
    "api/index.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    }
  ]
}
```

This configuration:
- Creates a single serverless function from `api/index.ts`
- Rewrites all `/api/*` requests to `/api` (the index handler)
- Sets a 30-second timeout for API calls

## Testing

All routes have been tested with the local build and route matching logic verified.

## Error Handling

The router includes:
- 404 responses for unmatched routes
- 500 error handling with logging
- Proper error messages with error codes

## Future Improvements

If needed, you can:
1. Add API versioning (e.g., `/api/v1/`, `/api/v2/`)
2. Add middleware for rate limiting at the router level
3. Add request logging/analytics
4. Add route-level caching
