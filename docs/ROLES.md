# Roles & Authorization

## Roles

- `superadmin` — every permission, plus the ability to create new admin accounts.
- `admin` — every resource-level admin permission.
- `customer` — only the `ORDER_CREATE` permission, plus self-service profile/cart/order endpoints.

## Middleware

`requireRole(...allowed)` returns a middleware that:

1. Reads `req.user` populated by `authenticate`.
2. Returns 401 if no user.
3. Returns 403 if `req.user.role` is not in the allowed list.
4. Calls `next()` otherwise.

Convenience wrappers:

- `requireAdmin` — accepts `admin` and `superadmin`.
- `requireSuperAdmin` — accepts only `superadmin`.
- `requireCustomer` — accepts only `customer`.
- `requireAnyAuth` — accepts any authenticated principal.

## Object-level checks

Role-based middleware cannot answer "is this the customer's own resource?" That is enforced inside the controller:

```ts
if (principal.type === "customer" && resource.customerId.toString() !== principal.sub) {
    return res.status(403).json({ success: false, message: "Forbidden" });
}
```

## Permission matrix

| Endpoint | Role | Object-level |
|---|---|---|
| `POST /auth/register` | public (first user becomes superadmin) | – |
| `POST /auth/register-admin` | superadmin | – |
| `POST /auth/login` | public | – |
| `POST /auth/refresh-token` | public | – |
| `POST /auth/logout` | public | – |
| `GET  /auth/me` | any | self |
| `PUT  /auth/update` | any | self |
| `POST /auth/change-password` | any | self |
| `POST /auth/forgot-password/*` | public | – |
| `GET  /gift/all` | public | – |
| `GET  /gift/:id` | public | – |
| `GET  /gift/new-arrivals` | public | – |
| `POST /gift/create` | admin | – |
| `PUT  /gift/update` | admin | – |
| `DELETE /gift/delete` | admin | – |
| `DELETE /gift/delete-image` | admin | – |
| `PUT  /gift/update-images` | admin | – |
| `GET  /library/all` | public | – |
| `GET  /library/:id` | public | – |
| `POST /library/create` | admin | – |
| `PUT  /library/update-title` | admin | – |
| `DELETE /library/delete` | admin | – |
| `DELETE /library/delete-image` | admin | – |
| `PUT  /library/update-images` | admin | – |
| `POST /library/find-by-name` | admin | – |
| `POST /order/create` | customer | self only |
| `GET  /order/all` | admin | – |
| `GET  /order/:id` | admin or customer | owner check for customer |
| `POST /order/get` | admin or customer | owner check for customer |
| `PUT  /order/update-status` | admin | – |
| `GET  /customer/me` | customer | – |
| `PUT  /customer/me` | customer | – |
| `DELETE /customer/me` | customer | – |
| `GET  /customer/me/cart` | customer | – |
| `DELETE /customer/me/cart` | customer | – |
| `POST /customer/add-to-cart` | customer | – |
| `DELETE /customer/remove-from-cart` | customer | – |
| `POST /customer/change-qty` | customer | – |
| `GET  /customer/orders` | customer | – |
| `GET  /customer/orders/:orderId` | customer | owner |
| `POST /customer/orders/:orderId/cancel` | customer | owner, status pending/processing |
| `GET  /customer/all` | admin | – |
| `POST /customer/get` | admin or customer | owner for customer |
| `PUT  /customer/update` | admin or customer | owner for customer |
| `DELETE /customer/delete` | admin | – |
| `POST /payment/process` | customer or admin | ownership of order |
| `PUT  /payment/update-status` | admin | – |
| `DELETE /payment/delete` | admin | – |
| `GET  /payment/me` | customer | – |
| `POST /payment/webhook` | public (signature-verified) | – |
| `GET  /dashboard/stats` | admin | – |
| `GET  /dashboard/revenue-by-month` | admin | – |
| `GET  /dashboard/order-status-breakdown` | admin | – |
| `GET  /dashboard/top-products` | admin | – |
| `POST /ai/generate` | admin | – |
