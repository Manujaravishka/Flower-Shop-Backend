# Petal Dreams — Backend API

A production-grade REST API for a luxury floral e-commerce platform. Built with **Node.js**, **Express 5**, **TypeScript**, and **MongoDB Atlas**, deployed serverlessly on **Vercel**.

**Deployed API:** [`https://flower-shop-backend-rosy.vercel.app`](https://flower-shop-backend-rosy.vercel.app)
**Frontend:** [`https://flower-boquet-frontend.vercel.app`](https://flower-boquet-frontend.vercel.app)

---

## Architecture

```
api/index.ts          ← Vercel serverless entry point (Express app export)
src/
  app.ts              ← Express app setup (middleware, routes, error handling)
  index.ts            ← Local development server (app.listen)
  config/             ← Cloudinary SDK initialization
  controller/         ← Route handler logic (11 controllers)
  lib/                ← Redis client & helpers
  middleware/         ← Auth, validation, upload, rate limiting, error handling
  migration/          ← Database migrations (roles, indexes, seed)
  model/              ← Mongoose schemas (7 models)
  plugin/             ← Mongoose OTP plugin
  routes/             ← Express routers (14 route files)
  util/               ← Token, cookie, email, category helpers
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 22.x |
| **Framework** | Express 5.x |
| **Language** | TypeScript 5.x |
| **Database** | MongoDB Atlas (Mongoose 9.x) |
| **Auth** | JWT (access + refresh tokens), OTP |
| **File Storage** | Cloudinary (with local fallback) |
| **Email** | Nodemailer (SMTP) |
| **Cache** | Redis (optional) |
| **Deployment** | Vercel (serverless functions) |

---

## API Routes

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API status |
| `GET` | `/health` | Health check with DB status |
| `GET` | `/api/v1/gift/all` | List gifts with filtering & pagination |
| `GET` | `/api/v1/gift/new-arrivals` | New arrivals |
| `GET` | `/api/v1/gift/:id` | Single gift details |
| `GET` | `/api/v1/library/all` | List gallery |
| `GET` | `/api/v1/review/product/:giftId` | Product reviews |
| `POST` | `/api/v1/ai/generate` | AI image generation (Stability AI) |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/register` | — | Register admin |
| `POST` | `/api/v1/auth/login` | — | Admin login |
| `POST` | `/api/v1/auth/refresh-token` | — | Refresh access token |
| `POST` | `/api/v1/auth/logout` | — | Logout |
| `POST` | `/api/v1/auth/change-password` | Admin | Change password |
| `POST` | `/api/v1/auth/forgot-password/*` | — | Password reset flow (3 endpoints) |

### Customers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/customer/auth/register` | — | Register customer |
| `POST` | `/api/v1/customer/auth/login` | — | Customer login |
| `POST` | `/api/v1/customer/create` | — | Create customer |
| `GET` | `/api/v1/customer/all` | Admin | List customers |
| `GET` | `/api/v1/customer/me` | Customer | Get profile |
| `PUT` | `/api/v1/customer/me` | Customer | Update profile |
| `DELETE` | `/api/v1/customer/me` | Customer | Delete account |

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/order/create` | Customer | Place order |
| `GET` | `/api/v1/order/all` | Admin | List all orders |
| `GET` | `/api/v1/order/mine` | Auth | My orders |
| `GET` | `/api/v1/order/:id` | Auth | Order details |
| `PUT` | `/api/v1/order/:id/status` | Admin | Update status |
| `DELETE` | `/api/v1/order/:id` | Admin | Delete order |
| `POST` | `/api/v1/customer/orders/:orderId/cancel` | Customer | Cancel order |

### Gifts (Products)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/gift/create` | Admin | Create gift (multipart) |
| `PUT` | `/api/v1/gift/:id` | Admin | Update gift |
| `DELETE` | `/api/v1/gift/:id` | Admin | Delete gift |
| `PUT` | `/api/v1/gift/:id/images` | Admin | Update images |
| `DELETE` | `/api/v1/gift/:id/image` | Admin | Remove image |

### Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/payment/process` | Customer | Process payment |
| `POST` | `/api/v1/payment/webhook` | — | Payment webhook |
| `GET` | `/api/v1/payment/me` | Customer | My payments |
| `PUT` | `/api/v1/payment/:id/status` | Admin | Update status |

### Dashboard (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/dashboard/stats` | Overall statistics |
| `GET` | `/api/v1/dashboard/revenue-by-month` | Monthly revenue |
| `GET` | `/api/v1/dashboard/order-status-breakdown` | Order status distribution |
| `GET` | `/api/v1/dashboard/top-products` | Top selling products |

### Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/review/create` | Auth | Create review |
| `GET` | `/api/v1/review/my` | Auth | My reviews |
| `PUT` | `/api/v1/review/:id` | Auth | Update review |
| `DELETE` | `/api/v1/review/:id` | Auth | Delete review |

### Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/cart/get` | Customer | Get cart |
| `POST` | `/api/v1/cart/add` | Customer | Add item |
| `PUT` | `/api/v1/cart/update` | Customer | Update quantity |
| `DELETE` | `/api/v1/cart/remove` | Customer | Remove item |
| `DELETE` | `/api/v1/cart/clear` | Customer | Clear cart |

---

## Database Models

| Model | Collection | Key Fields |
|-------|------------|------------|
| **Gift** | `gifts` | name, price, colour, size, category[], mediaUrl[], stock, isActive |
| **Customer** | `customers` | name, email, phone, password, role, cart[], address |
| **User** | `users` | name, email, phone, password, role (admin/superadmin) |
| **Order** | `orders` | customerId, items[], totalAmount, status, shippingAddress, statusHistory[] |
| **Payment** | `payments` | orderId, customerId, amount, status, paymentMethod, gateway |
| **Review** | `reviews` | productId, customerId, rating, title, comment, isVerifiedPurchase |
| **Library** | `libraries` | title, mediaUrl[], createdBy |

---

## Getting Started

### Prerequisites

- Node.js 22.x
- npm 10.x
- MongoDB Atlas cluster (or local MongoDB)
- Cloudinary account (optional — falls back to local storage)

### Installation

```bash
git clone <repo-url>
cd Flower-Shop-Backend-main
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_ACCESS_SECRET` | JWT signing key (32+ chars) | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh signing key | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No |
| `SMTP_HOST` | SMTP server | No |
| `SMTP_USER` | SMTP username | No |
| `SMTP_PASS` | SMTP password | No |
| `REDIS_URL` | Redis connection string | No |

### Development

```bash
npm run dev
```

Server starts on `http://localhost:3000`.

### Build

```bash
npm run build
npm start
```

### Database Migrations

```bash
npm run migrate:roles       # Add role fields to existing documents
npm run migrate:indexes     # Sync database indexes
npm run seed:superadmin     # Create initial superadmin account
```

---

## Deployment

### Vercel (Serverless)

The API is deployed on Vercel via the `api/index.ts` entry point. Every Express route is handled as a serverless function.

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel Dashboard
4. Deploy — zero additional config needed

Vercel configuration is in `vercel.json`:
- All routes → `api/index.ts`
- 512 MB memory, 30s timeout

---

## Middleware

| Middleware | Description |
|-----------|-------------|
| **authenticate** | JWT Bearer token verification (user + customer) |
| **requireRole** | Role-based access control (admin, superadmin, customer) |
| **rateLimit** | In-memory sliding window rate limiter |
| **upload** | Multer configuration with MIME + magic byte validation |
| **verifyUploadedFiles** | Ensures files were actually uploaded |
| **validateName / Email / Phone / Password** | Request body validators |
| **validateObjectId** | MongoDB ObjectId format check |
| **requestLogger** | Logs method, URL, status, duration, user |
| **errorHandler** | Global error handler (Multer, MongoDB, Validation errors) |
| **notFoundHandler** | 404 catch-all |

---

## Authentication Flow

```
1. POST /api/v1/auth/login (email + password)
2. Response: { accessToken, refreshToken, user }
3. Access token stored in memory / localStorage
4. Refresh token in HTTP-only cookie
5. All authenticated requests: Authorization: Bearer <accessToken>
6. On 401 → POST /api/v1/auth/refresh-token → new access token
```

Customer auth uses the same flow under `/api/v1/customer/auth/*`.

---

## File Upload Strategy

1. Files validated by MIME type AND magic bytes
2. Uploaded to **Cloudinary** if configured
3. Falls back to local `uploads/` directory
4. Max 5 files per upload, 5 MB per file

---

## Security

- HTTP-only cookies for refresh tokens
- CORS with strict origin validation
- Helmet security headers
- Rate limiting on auth and OTP endpoints
- Password hashing with bcryptjs
- Input validation on all endpoints
- Environment-based secrets (never committed)

---

## License

MIT
