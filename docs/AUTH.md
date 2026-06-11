# Authentication

The Petal Dreams backend has two parallel authentication flows, one for staff (`User`) and one for end-buyers (`Customer`).

## Token shape

Both flows produce a JWT with the same structure:

```json
{
  "sub":   "<mongoId>",
  "email": "<email>",
  "role":  "admin" | "superadmin" | "customer",
  "type":  "user" | "customer",
  "iat":   0,
  "exp":   0
}
```

- The `type` claim separates the two populations; a customer token is rejected by routes that require `admin`.
- The `role` claim is what `requireRole(...)` checks.
- Both the access and refresh tokens carry the same claims.

## Staff (User) flow

1. `POST /api/v1/auth/register` — first user becomes `superadmin`; subsequent registrations are `admin` (or `superadmin` if created via `POST /api/v1/auth/register-admin`).
2. `POST /api/v1/auth/login` — returns `{ accessToken, refreshToken, user, role }` in the body **and** sets `refreshToken` in an httpOnly cookie.
3. `POST /api/v1/auth/refresh-token` — reads the cookie (or body) and re-issues both tokens. Returns `{ accessToken, refreshToken }` in the body **and** sets a new cookie.
4. `POST /api/v1/auth/logout` — clears the cookie.

## Customer flow

1. `POST /api/v1/customer/request-code` — sends an OTP to the customer's email.
2. `POST /api/v1/customer/verify-code` — verifies the OTP, returns `{ accessToken, refreshToken, user, role }` in the body **and** sets `customerRefreshToken` in an httpOnly cookie.
3. `POST /api/v1/customer/refresh-token` — refreshes the customer pair. Returns `{ accessToken, refreshToken }` in the body **and** sets a new cookie.
4. `POST /api/v1/customer/logout` — clears the customer cookie.

## Standard auth response envelope

All successful auth endpoints (`/auth/login`, `/auth/register`, `/auth/refresh-token`, `/customer/verify-code`, `/customer/refresh-token`) return:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user":     { "_id": "...", "name": "...", "email": "...", "role": "admin", "...": "..." },
    "role":     "admin",
    "accessToken":  "...",
    "refreshToken": "..."
  }
}
```

`/auth/refresh-token` and `/customer/refresh-token` omit `user` / `role` since they only re-issue tokens.

## Password reset

Three-step, OTP-based:

1. `POST /api/v1/auth/forgot-password/request-code { email }` — sends OTP. Always returns a generic success message regardless of whether the email is registered.
2. `POST /api/v1/auth/forgot-password/verify-code { email, code }` — verifies OTP; on success issues a single-use 15-minute `resetToken` (returned in the body **and** set as an httpOnly cookie).
3. `POST /api/v1/auth/forgot-password/reset { newPassword, confirmPassword, email? }` — accepts the `resetToken` from cookie or body. The token MUST be valid; otherwise the request is rejected. `email` (optional) must match the token.

The reset endpoint does **not** accept `email + newPassword` without a verified token. This is enforced by the reset token middleware.

## Cookie strategy

| Cookie | Path | TTL | httpOnly | SameSite |
|---|---|---|---|---|
| `refreshToken` | `/` | 7d | yes | strict |
| `customerRefreshToken` | `/` | 7d | yes | strict |
| `resetToken` | `/` | 15m | yes | strict |

All cookies are `Secure` in production.

## CORS

The frontend at `https://flower-boquet-frontend.vercel.app` (and the two dev origins) is the only allowed origin. Cookies are sent with `credentials: true`.

## Rate limits

- `/api/v1/auth/login`, `/register`, `/forgot-password/*` — 10 req / 15 min per IP.
- `/api/v1/customer/request-code`, `/verify-code` — 5 req / 15 min per IP.
