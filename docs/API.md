# API Reference

Base URL: `https://flower-boquet-backend.vercel.app/api/v1`

All responses follow `{ success: bool, message?: string, data?: any }`.

## Auth (`/auth`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | public | First user becomes superadmin |
| POST | `/register-admin` | superadmin | – |
| POST | `/login` | public | Returns accessToken; sets refresh cookie |
| POST | `/refresh-token` | public | Reads refresh cookie |
| POST | `/logout` | public | Clears refresh cookie |
| GET  | `/me` | required | – |
| PUT  | `/update` | required | – |
| POST | `/change-password` | required | – |
| POST | `/forgot-password/request-code` | public | Always returns generic message |
| POST | `/forgot-password/verify-code` | public | Returns resetToken |
| POST | `/forgot-password/reset` | public | Requires valid resetToken |

## Customer (`/customer`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/request-code` | public | OTP request |
| POST | `/verify-code` | public | OTP verify, returns accessToken |
| POST | `/refresh-token` | public | – |
| POST | `/logout` | public | – |
| POST | `/create` | public | Upsert by email |
| GET  | `/me` | customer | – |
| PUT  | `/me` | customer | – |
| DELETE | `/me` | customer | Soft delete (isActive=false) |
| GET  | `/me/cart` | customer | – |
| DELETE | `/me/cart` | customer | Clear cart |
| POST | `/add-to-cart` | customer | – |
| DELETE | `/remove-from-cart` | customer | – |
| POST | `/change-qty` | customer | – |
| GET  | `/orders` | customer | – |
| GET  | `/orders/:orderId` | customer | – |
| POST | `/orders/:orderId/cancel` | customer | Only pending/processing |
| GET  | `/all` | admin | – |
| POST | `/get` | admin or customer (owner) | – |
| PUT  | `/update` | admin or customer (owner) | – |
| DELETE | `/delete` | admin | Soft delete |

## Gift (`/gift`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/all` | public | Supports `?category=&size=&minPrice=&maxPrice=&search=&page=&limit=` |
| GET  | `/:id` | public | – |
| GET  | `/new-arrivals` | public | – |
| POST | `/create` | admin | multipart images |
| PUT  | `/update` | admin | – |
| DELETE | `/delete` | admin | – |
| DELETE | `/delete-image` | admin | – |
| PUT  | `/update-images` | admin | multipart images |

## Order (`/order`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/create` | customer | Server computes total |
| GET  | `/all` | admin | `?page=&limit=&status=` |
| GET  | `/:id` | admin or customer (owner) | – |
| POST | `/get` | admin or customer (owner) | – |
| PUT  | `/update-status` | admin | – |

## Payment (`/payment`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/process` | customer or admin | – |
| PUT  | `/update-status` | admin | – |
| DELETE | `/delete` | admin | – |
| GET  | `/me` | customer | – |
| POST | `/webhook` | signature | Header `x-gateway-signature` must match `PAYMENT_WEBHOOK_SECRET` |

## Library (`/library`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/all` | public | – |
| GET  | `/:id` | public | – |
| POST | `/create` | admin | multipart images |
| PUT  | `/update-title` | admin | – |
| DELETE | `/delete` | admin | – |
| DELETE | `/delete-image` | admin | – |
| PUT  | `/update-images` | admin | multipart images |
| POST | `/find-by-name` | admin | – |

## AI (`/ai`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/generate` | admin | Stability AI |

## Dashboard (`/dashboard`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/stats` | admin | – |
| GET  | `/revenue-by-month` | admin | – |
| GET  | `/order-status-breakdown` | admin | – |
| GET  | `/top-products` | admin | – |
