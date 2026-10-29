# 🛒 PISTARA - E-Commerce Platform

Premium dry fruits and fox nuts e-commerce platform with Turso database backend.

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ installed
- npm or bun package manager
- Turso account (free at turso.tech)

### 1️⃣ Install Dependencies

Open PowerShell in project directory and run:

```powershell
npm install
```

### 2️⃣ Database is Already Configured

Your `.env` file is already set up with Turso credentials! ✅

### 3️⃣ Create Database Tables

Run these commands one by one:

```powershell
# Generate migration files
npm run db:generate

# Push schema to Turso database  
npm run db:push
```

### 4️⃣ Seed the Database

This creates admin user, categories, products, and settings:

```powershell
npm run db:seed
```

You should see:
```
🌱 Starting database seed...
📝 Creating admin user...
✅ Admin user created: admin@pistara.com
📁 Creating categories...
📦 Creating products...
⚙️  Creating default settings...
🎉 Database seed completed successfully!
```

### 5️⃣ Start the Development Server

Install Vercel CLI (one-time):
```powershell
npm install -g vercel
```

Start the server:
```powershell
vercel dev
```

When prompted:
- "Set up and deploy?" → Press Enter (No)
- "Which scope?" → Press Enter (default)
- "Link to existing project?" → Press Enter (No)
- "What's your project's name?" → Press Enter (default)
- "In which directory is your code located?" → Press Enter (default)

### 6️⃣ Open the App

Visit: **http://localhost:3000**

### 7️⃣ Login as Admin

- **Email:** `admin@pistara.com`
- **Password:** `Admin@123456`

---

## 📁 Project Structure

```
pixel-perfect-page-068/
├── api/                    # Backend API routes (Vercel Functions)
│   ├── auth/              # Authentication endpoints
│   ├── products/          # Product endpoints
│   ├── orders/            # Order management
│   └── admin/             # Admin panel APIs
├── db/                    # Database
│   ├── schema.ts          # Drizzle schema
│   ├── client.ts          # Turso connection
│   ├── migrate.ts         # Migration script
│   └── seed.ts            # Seed data
├── server-lib/            # Server utilities
│   ├── auth.ts            # JWT & session management
│   ├── http.ts            # API helpers
│   ├── order-number.ts    # Order number generator
│   └── whatsapp.ts        # WhatsApp integration
├── shared/                # Shared types & validation
│   └── schemas.ts         # Zod schemas
├── src/                   # Frontend React app
│   ├── components/        # UI components
│   ├── lib/               # Frontend utilities
│   └── routes/            # TanStack Router pages
└── vercel.json            # Vercel configuration

```

---

## 🔧 Available Commands

```powershell
# Development
npm run dev              # Start frontend only (no API)
vercel dev              # Start frontend + API (recommended)

# Database
npm run db:generate     # Generate migrations
npm run db:migrate      # Run migrations
npm run db:push         # Push schema to Turso
npm run db:studio       # Open Drizzle Studio
npm run db:seed         # Seed initial data

# Build & Deploy
npm run build           # Build for production
npm run preview         # Preview production build
```

---

## 🗄️ Database Schema

### Tables Created
- **users** - Customer and admin accounts
- **addresses** - User delivery addresses
- **categories** - Product categories (Makhana, Cashew, Dried Grapes)
- **products** - Product catalog
- **product_images** - Product photos
- **product_variants** - Size variants (250g, 500g, 1kg)
- **orders** - Customer orders
- **order_items** - Order line items
- **order_status_history** - Order tracking
- **settings** - Store configuration
- **password_reset_tokens** - Password reset functionality

---

## 🔐 Authentication

### Email/Password Authentication
- Register new account
- Login with email/password
- Password reset (token logged to console)
- JWT sessions with httpOnly cookies
- Role-based access (customer/admin)

### Admin Access
Only the email in `ADMIN_EMAIL` environment variable has admin access.

---

## 📦 Seeded Data

After running `npm run db:seed`:

### Admin User
- Email: `admin@pistara.com`
- Password: `Admin@123456`
- Role: admin

### Categories (3)
1. Makhana (मखाना)
2. Cashew (काजू)  
3. Dried Grapes (किशमिश)

### Products (8)
- Premium Makhana
- Roasted Masala Makhana
- Cashew W320
- Cashew Roasted & Salted
- Kishmish Green Raisins
- Black Raisins
- Seedless Golden Raisins
- Classic Jumbo Makhana

Each product has 3 variants (250g, 500g, 1kg) with stock levels.

### Default Settings
- WhatsApp Number: 919876543210
- Delivery Charge: ₹50
- Store info and hero text

---

## 🛠️ API Endpoints

### Public Endpoints
- `GET /api/categories` - List categories
- `GET /api/products` - List products (with filters)
- `GET /api/products/[slug]` - Get product detail
- `GET /api/settings` - Get public settings

### Auth Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot` - Request password reset
- `POST /api/auth/reset` - Reset password

### Customer Endpoints (Auth Required)
- `GET /api/profile` - Get profile
- `PUT /api/profile` - Update profile & address
- `POST /api/orders` - Create order (returns WhatsApp URL)
- `GET /api/orders` - List my orders
- `GET /api/orders/[id]` - Get order detail

### Admin Endpoints (Admin Only)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/products` - List all products
- `POST /api/admin/products` - Create product
- `GET /api/admin/products/[id]` - Get product
- `PUT /api/admin/products/[id]` - Update product
- `DELETE /api/admin/products/[id]` - Delete product
- `GET /api/admin/orders` - List orders
- `GET /api/admin/orders/[id]` - Get order detail
- `PATCH /api/admin/orders/[id]` - Update order status
- `GET /api/admin/customers` - List customers
- `GET /api/admin/customers/[id]` - Get customer detail
- `GET /api/admin/settings` - Get all settings
- `PUT /api/admin/settings` - Update settings

---

## 📱 WhatsApp Integration

When a customer places an order:
1. Order is created in database
2. Stock is decremented
3. WhatsApp message URL is generated
4. Customer is redirected to WhatsApp to complete payment

Message format:
```
🛒 New Order - Pistara
Order ID: PST-2026-0001

Customer Details
Name: John Doe
Mobile: 9876543210
Address: Full address

Order Items
1. Premium Makhana (250g) × 2 = ₹560
2. Cashew W320 (500g) × 1 = ₹780

Subtotal: ₹1340
Delivery: ₹50
Total: ₹1390

Please share the payment QR code. Thank you!
```

---

## 🔍 Troubleshooting

### Port Already in Use
```powershell
# Kill process on port 3000
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force

# Or use a different port
vercel dev --listen 3001
```

### Database Connection Error
1. Check your `.env` file has correct Turso URL and token
2. Test connection in Turso web dashboard
3. Regenerate token if expired: `turso db tokens create pistara`

### npm install Stuck
```powershell
# Clear cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### API Routes Return 404
- Make sure you're using `vercel dev` not `npm run dev`
- Check `vercel.json` exists in project root
- Restart the dev server

### Database Tables Not Created
```powershell
# Re-run migration
npm run db:push

# Check tables in Turso dashboard
# Should see: users, products, orders, etc.
```

---

## 🚀 Deployment to Vercel

### 1. Push to GitHub
```powershell
git add .
git commit -m "Add production backend"
git push
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables from `.env` file
4. Deploy!

### 3. Update Environment Variables
In Vercel dashboard, add all variables from `.env`:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `JWT_SECRET`
- `APP_URL` (your production URL)
- `ADMIN_EMAIL`
- `ADMIN_INITIAL_PASSWORD`
- `WHATSAPP_NUMBER`
- `NODE_ENV=production`

### 4. Redeploy
After adding env vars, trigger a new deployment.

---

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TURSO_DATABASE_URL` | Turso database URL | `libsql://pistara-xyz.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso auth token | `eyJhbGc...` |
| `JWT_SECRET` | Secret for JWT signing | `random-32-char-string` |
| `APP_URL` | Application URL | `http://localhost:3000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `ADMIN_EMAIL` | Admin user email | `admin@pistara.com` |
| `ADMIN_INITIAL_PASSWORD` | Admin password (seed only) | `Admin@123456` |
| `WHATSAPP_NUMBER` | Store WhatsApp number | `919876543210` |

---

## 🎯 Next Steps

### For Development
1. ✅ Database and API are complete
2. 🔄 Connect frontend UI to API endpoints
3. 🔄 Add TanStack Query for data fetching
4. 🔄 Build admin panel pages
5. 🔄 Add loading states and error handling

### For Production
1. Change admin password after first login
2. Update WhatsApp number in admin settings
3. Add real product images (currently using placeholders)
4. Test order flow end-to-end
5. Set up domain and SSL

---

## 🆘 Need Help?

1. Check Turso dashboard - verify tables exist
2. Check browser console - look for API errors
3. Check Vercel logs - `vercel logs`
4. Test API directly:
   ```powershell
   # Test categories endpoint
   curl http://localhost:3000/api/categories
   ```

---

## 📄 License

This project was built for PISTARA e-commerce platform.

---

Made with ❤️ by Kiro AI
