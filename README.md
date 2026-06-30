# 🏪 SupplierHub (Supplier-Ecommerce)
A full-stack e-commerce platform for business supplies — built with Next.js 15, TypeScript, MongoDB, and Stripe.
---
## 🛠️ Tech Stack
- Next.js 15 (App Router) + React 19 + TypeScript
- MongoDB with Mongoose (`Product`, `Order` models) + native MongoDB driver (`users` collection)
- NextAuth.js v4 (JWT sessions, credentials provider, MongoDB adapter)
- Stripe (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`) for payments
- Cloudinary for image uploads
- Zustand for client-side cart state
- Tailwind CSS 4
- nodemailer for password-reset emails (Gmail SMTP or custom SMTP)
---
## ✅ Prerequisites
- Node.js 18+ and npm 8+
- A MongoDB connection string (Atlas or local)
- A Stripe account (publishable + secret keys)
- A Cloudinary account (cloud name, API key, API secret)
- Optional: Gmail or SMTP credentials for sending real password-reset emails
---
## 🚀 Setup
### 1. Clone the repo
```bash
git clone https://github.com/your-username/supplier-ecommerce.git
cd supplier-ecommerce
```
### 2. Install dependencies
```bash
npm install
```
### 3. Configure environment variables
Create a `.env.local` file in the root of the project:
```
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Optional: password-reset emails (falls back to console logging if omitted)
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password
```
`.env*` is already in `.gitignore` — never commit it.
### 4. Start the server
```bash
npm run dev
```
The app runs on Next.js's default **port 3000** (`http://localhost:3000`).

> ⚠️ `src/app/api/auth/forgot-password/route.ts` falls back to `http://localhost:3001` if `NEXTAUTH_URL` isn't set — that doesn't match the actual default dev port (3000). Always set `NEXTAUTH_URL` explicitly to avoid broken password-reset links locally.

### 5. Create your first admin account
Visit `/setup-admin` to create the initial admin user. This page/endpoint only works while **zero** admin accounts exist in the database — once one is created, it's permanently disabled (see `POST /api/setup-admin` below).

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run type-check`, `npm run format`.
---
## 📡 API Endpoints
### 🔑 `POST /api/auth/register`
Registers a new customer account (always created with `role: "user"` — this endpoint can never create an admin).

**Auth required:** None.

**Request body:**
```json
{ "name": "Jane Doe", "email": "jane@example.com", "password": "Str0ng!Pass" }
```

**Password rules:** 8+ characters, upper + lower case, a number, a special character, no common weak patterns (`password`, `123456`, `admin`, etc.), no 3+ repeated characters in a row, no sequential runs like `abc`/`123`.

**Response `201`:**
```json
{ "message": "User created successfully", "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "user" } }
```

**Errors:** `400` missing fields or weak password (`passwordErrors` array included) · `409` email already registered · `500` server error.
---
### 🔑 `GET /POST /api/auth/[...nextauth]`
NextAuth.js catch-all route — handles sign-in, sign-out, session, and CSRF endpoints (e.g. `/api/auth/signin`, `/api/auth/session`, `/api/auth/signout`). Uses the `credentials` provider (email + bcrypt-hashed password) and issues a JWT session containing `id` and `role`.

**Auth required:** None to sign in; this *is* the auth mechanism.
---
### 📧 `POST /api/auth/forgot-password`
Requests a password-reset link for an email address.

**Auth required:** None.

**Request body:**
```json
{ "email": "jane@example.com" }
```

**Response `200`:** Always returns a generic success message regardless of whether the email exists (prevents user enumeration):
```json
{ "message": "If an account with that email exists, a password reset link has been sent." }
```
In **development**, the response instead includes the raw `resetUrl` directly in the JSON body so you can test without an email service. Reset tokens expire after **1 hour**.

**Errors:** `400` missing email · `500` server/email error (in production, after the email send fails).
---
### 🔑 `POST /api/auth/reset-password`
Completes a password reset using the token from the emailed/returned link.

**Auth required:** None (token-based).

**Request body:**
```json
{ "token": "a1b2c3...", "newPassword": "NewStr0ng!Pass" }
```

**Response `200`:**
```json
{ "message": "Password reset successfully" }
```

**Errors:** `400` missing fields, password under 6 characters, or invalid/expired token · `500` server error.

> ⚠️ Note the inconsistency: `register`/`setup-admin`/`create-admin` enforce the strong-password policy (8+ chars, mixed case, etc.), but `reset-password` and `change-password` only enforce a 6-character minimum.
---
### 🔑 `POST /api/auth/change-password`
Changes the logged-in user's password.

**Auth required:** Session cookie (any authenticated user).

**Request body:**
```json
{ "currentPassword": "OldPass1!", "newPassword": "NewPass2!" }
```

**Response `200`:**
```json
{ "message": "Password updated successfully" }
```

**Errors:** `401` not authenticated · `400` missing fields or new password under 6 characters/current password incorrect · `404` user not found · `500` server error.
---
### 🧩 `GET /api/admin/check-setup`
Checks whether any admin account exists yet — used to decide whether `/setup-admin` should be shown.

**Auth required:** None.

**Response `200`:**
```json
{ "needsSetup": true, "message": "No admin accounts found, setup required" }
```
---
### 🧩 `POST /api/setup-admin`
Creates the **first** admin account for the system. Self-disables forever once any admin exists.

**Auth required:** None — but only succeeds if zero admins currently exist.

**Request body:** same shape as `/api/auth/register` (`name`, `email`, `password`), same password-strength rules.

**Response `201`:** same shape as register, but `role: "admin"`.

**Errors:** `400` missing fields / weak password · `403` an admin already exists (setup permanently locked) · `409` email already registered · `500` server error.
---
### 🧩 `POST /api/admin/create-admin`
Creates additional admin accounts. Unlike `/api/setup-admin`, this requires an existing admin to be logged in.

**Auth required:** Session cookie with `role: "admin"`.

**Request body:** `{ "name", "email", "password" }` (same password rules as registration).

**Response `201`:** new admin user object; the creating admin's `id` is stored as `createdBy`.

**Errors:** `403` not an admin · `400` missing fields / weak password · `409` email already exists · `500` server error.
---
### 🧩 `GET /api/admin/orders`
Lists **all** orders in the system (not scoped to one user), newest first.

**Auth required:** Session cookie with `role: "admin"`.

**Response `200`:**
```json
{ "success": true, "data": [ /* Order documents */ ] }
```

**Errors:** `403` not an admin · `500` server error.
---
### 🧩 `PATCH /api/admin/orders`
Updates an order's status.

**Auth required:** Session cookie with `role: "admin"`.

**Request body:**
```json
{ "orderId": "665f...", "status": "shipped" }
```
Valid `status` values: `pending`, `processing`, `shipped`, `delivered`, `cancelled`.

**Response `200`:** `{ "success": true, "data": { /* updated Order */ } }`

**Errors:** `403` not an admin · `400` missing/invalid `orderId` or `status` · `404` order not found · `500` server error.
---
### 🧩 `GET /api/admin/users`
Lists all users (password field excluded from the projection).

**Auth required:** Session cookie with `role: "admin"`.

**Response `200`:** `{ "success": true, "data": [ /* user docs, no password field */ ] }`

**Errors:** `403` not an admin · `500` server error.
---
### 🧩 `PUT /api/admin/users`
Changes a user's role.

**Auth required:** Session cookie with `role: "admin"`.

**Request body:**
```json
{ "userId": "665f...", "role": "supplier" }
```
Only `"user"` or `"supplier"` are accepted — admin roles cannot be granted or revoked through this endpoint (use `create-admin` instead).

**Response `200`:** `{ "message": "User role updated successfully" }`

**Errors:** `403` not an admin, or target user is already an admin · `400` missing/invalid fields · `404` user not found · `500` server error.
---
### 🧩 `DELETE /api/admin/users?userId=<id>`
Deletes a user account.

**Auth required:** Session cookie with `role: "admin"`.

**Response `200`:** `{ "message": "User deleted successfully" }`

**Errors:** `403` not an admin · `400` missing `userId` query param · `404` user not found · `500` server error.
---
### 📦 `GET /api/products`
Lists products with optional filtering. Reads via the raw MongoDB driver (not the Mongoose `Product` model).

**Auth required:** None.

**Query params:** `limit` (default `10`), `category`, `search` (matches `name`/`description`, case-insensitive).

**Response `200`:**
```json
{ "success": true, "data": [ /* product docs */ ] }
```

**Errors:** `500` server error.
---
### 📦 `POST /api/products`
Creates a product.

**Auth required:** None enforced at the route level — there is no session/admin check here (relies on the page-level admin UI and `/admin/*` middleware protection only). Treat this as an open gap if exposed directly.

**Request body:**
```json
{ "name": "Heavy Duty Garbage Bags 55 Gallon", "description": "...", "price": 24.99, "category": "cleaning", "stock": 100, "images": ["https://..."] }
```
Valid `category` values: `cleaning`, `packaging`, `safety`, `storage`, `equipment`, `electronics`, `clothing`, `books`, `home`, `sports`, `other`.

**Response `201`:** `{ "message": "Product created successfully", "productId": "..." }`

**Errors:** `400` missing required fields · `500` server error.
---
### 📦 `GET /api/products/[id]`
Fetches a single product by Mongo `_id` (uses the Mongoose `Product` model this time).

**Auth required:** None.

**Response `200`:** `{ "success": true, "data": { /* product */ } }`

**Errors:** `404` not found · `500` server error (includes `error` message detail).
---
### 📦 `PUT /api/products/[id]`
Updates a product by ID. Body is passed straight to `findByIdAndUpdate` with Mongoose validators re-run.

**Auth required:** None enforced at the route level (same gap as `POST /api/products`).

**Request body:** any subset of product fields to update.

**Response `200`:** `{ "success": true, "data": { /* updated product */ }, "message": "Product updated successfully" }`

**Errors:** `404` not found · `500` server/validation error.
---
### 📦 `DELETE /api/products/[id]`
Deletes a product by ID.

**Auth required:** None enforced at the route level (same gap as above).

**Response `200`:** `{ "success": true, "message": "Product deleted successfully" }`

**Errors:** `404` not found · `500` server error.
---
### 🧾 `GET /api/orders`
Lists the **current user's own** orders, newest first.

**Auth required:** Session cookie (any authenticated user). Orders are matched by `userId = session.user.email`.

**Response `200`:** `{ "success": true, "data": [ /* this user's orders */ ] }`

**Errors:** `401` not authenticated · `500` server error.
---
### 🧾 `POST /api/orders`
Creates an order directly (no Stripe payment intent — separate from the `/api/checkout` flow below).

**Auth required:** Session cookie.

**Request body:**
```json
{ "items": [ { "productId": "...", "name": "...", "price": 24.99, "quantity": 2 } ], "total": 49.98, "shippingAddress": { "firstName": "...", "lastName": "...", "email": "...", "address": "...", "city": "...", "state": "...", "zipCode": "..." } }
```

**Response `201`:** the created `Order` document directly (not wrapped in `{ success, data }`).

**Errors:** `401` not authenticated · `400` missing/invalid `items`, `total`, or `shippingAddress` · `500` server error.

> ⚠️ Inconsistency: this route sets `userId` to `session.user.email`, while `/api/checkout` (below) sets `userId` to `session.user.id`. The two order-creation paths store different identifiers in the same field.
---
### 💳 `POST /api/checkout`
Creates an order **and** a Stripe PaymentIntent in one call — this is the actual checkout flow used by the cart UI.

**Auth required:** Session cookie.

**Request body:**
```json
{ "items": [ /* cart items */ ], "total": 49.98, "shippingAddress": { "firstName": "...", "lastName": "...", "email": "...", "address": "...", "city": "...", "state": "...", "zipCode": "..." }, "paymentMethod": "stripe" }
```

**Response `200`:**
```json
{ "success": true, "orderId": "...", "orderNumber": "ORD-...", "paymentIntent": { "id": "pi_...", "clientSecret": "..." } }
```

**Errors:** `401` not authenticated · `400` missing/invalid items, total, shipping address, or a missing individual address field · `500` order saved but Stripe payment-intent creation failed (order is marked `cancelled` / payment `failed`) or general checkout failure.

> ⚠️ `POST /api/webhooks/stripe` (below) is disabled, so there's no server-side confirmation when a PaymentIntent actually succeeds — order status has to be reconciled some other way (e.g. manually via the admin order-status endpoint).
---
### 💳 `GET /api/checkout?orderId=<id>`
Fetches the status of a specific order (used to poll/display payment status after checkout).

**Auth required:** Session cookie; the order's `userId` must match `session.user.id`.

**Response `200`:**
```json
{ "order": { "id": "...", "orderNumber": "...", "status": "pending", "total": 49.98, "items": [...], "paymentDetails": { ... }, "createdAt": "..." } }
```

**Errors:** `401` not authenticated · `400` missing `orderId` · `404` order not found · `403` order belongs to a different user · `500` server error.
---
### 💳 `POST /api/payment/create-payment-intent`
**Currently disabled.** Always returns `503 { "error": "Checkout is currently disabled" }` regardless of input. Live payment-intent creation actually happens inline inside `POST /api/checkout` instead.
---
### 💳 `POST /api/webhooks/stripe`
**Currently disabled.** Always returns `503 { "error": "Checkout is currently disabled" }`. No Stripe webhook signature verification or event handling is implemented — payment confirmation events from Stripe are not processed.
---
### 🖼️ `POST /api/upload`
Uploads an image file to Cloudinary (folder: `supplier-ecommerce`).

**Auth required:** None enforced at the route level.

**Request body:** `multipart/form-data` with a `file` field.

**Response `200`:**
```json
{ "success": true, "data": { /* Cloudinary upload result incl. secure_url */ }, "message": "Image uploaded successfully" }
```

**Errors:** `400` no file provided · `500` Cloudinary upload failure.
---
### 🌱 `GET /POST /DELETE /api/seed`
Development-only utility to inspect, seed, or wipe the `products` collection with ~20 built-in sample products.

**Auth required:** Session cookie with `role: "admin"` for all three methods. `POST` and `DELETE` additionally return `403` whenever `NODE_ENV === "production"`, regardless of role — they cannot run in production at all.

- `GET` → `{ success, totalProducts, categories: [{ _id, count }] }`
- `POST` → seeds dummy products; `400` if products already exist (must `DELETE` first)
- `DELETE` → removes all products; `{ success, deletedCount }`
---
## 🗃️ Data Models
### `Product` (Mongoose model, `lib/models/Product.ts`)
```ts
{
  name: string,        // required, max 100 chars
  description: string, // required, max 500 chars
  price: number,        // required, >= 0
  category: 'cleaning' | 'packaging' | 'safety' | 'storage' | 'equipment'
           | 'electronics' | 'clothing' | 'books' | 'home' | 'sports' | 'other',
  images: string[],    // required
  stock: number,        // required, >= 0, default 0
  isActive: boolean,    // default true
  createdAt: Date, updatedAt: Date  // via timestamps
}
```
---
### `Order` (Mongoose model, `lib/models/Order.ts`)
```ts
{
  orderNumber: string,  // unique
  userId: string,        // session.user.email (via /api/orders) or session.user.id (via /api/checkout) — inconsistent
  items: [{ productId: string, name: string, price: number, quantity: number }],
  total: number,
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  shippingAddress: { firstName, lastName, email, address, city, state, zipCode },
  paymentDetails?: {
    stripePaymentIntentId?: string,
    status: 'pending' | 'paid' | 'failed' | 'refunded',
    amount: number,
    currency: string  // default 'usd'
  },
  createdAt: Date, updatedAt: Date
}
```
---
### `users` collection (plain MongoDB collection, no Mongoose model — managed via `mongodb` driver directly in `lib/auth.ts` and the auth/admin routes)
```ts
{
  _id: ObjectId,
  name: string,
  email: string,
  password: string,       // bcrypt hash, cost factor 12
  role: 'user' | 'admin' | 'supplier',
  createdAt: Date,
  createdBy?: string,      // present on admins created via /api/admin/create-admin
  isInitialAdmin?: boolean, // present on the admin created via /api/setup-admin
  resetToken?: string,      // present during an active password-reset flow
  resetTokenExpiry?: Date
}
```
---
## 📝 Notes for Developers
- **Two different checkout paths exist:** `POST /api/orders` creates an order with no payment, while `POST /api/checkout` creates an order *and* a Stripe PaymentIntent. They also disagree on what `userId` stores (`email` vs `id`) — pick one path and be consistent if you extend this.
- **Stripe webhooks are not implemented.** `/api/webhooks/stripe` just returns `503`. There's no automated way for a successful Stripe payment to flip an order's `paymentDetails.status` to `paid` — this needs to be built before payments can be trusted in production.
- **Several write routes have no auth check:** `POST/PUT/DELETE /api/products/*` and `POST /api/upload` are reachable by anyone who can hit the API directly — protection currently only exists at the UI layer (`/admin/*` is gated by `middleware.ts`, which requires `role: "admin"` for the *page*, not the underlying API routes).
- **Password policy is inconsistent:** registration/admin-creation enforces a strong 5-rule policy (length, case, digit, symbol, no weak/sequential patterns); `reset-password` and `change-password` only require 6+ characters. Align these if security consistency matters to you.
- **The `/api/products` collection is queried two different ways:** the list route (`GET/POST /api/products`) talks to the `products` collection through the raw `mongoose.connection.db` driver, while the by-ID route (`/api/products/[id]`) uses the Mongoose `Product` model. Functionally equivalent today, but worth knowing if you add schema-level logic (hooks, virtuals) — it won't run on the raw-driver path.
- **`NEXTAUTH_URL` fallback mismatch:** `forgot-password`'s reset-link fallback hardcodes `localhost:3001`, but `npm run dev` actually serves on port 3000. Always set `NEXTAUTH_URL` in `.env.local` to avoid broken local reset links.
- **Admin bootstrapping is one-time:** `/setup-admin` (page + `POST /api/setup-admin`) only works while zero admins exist, then locks permanently. Subsequent admins must be created by an existing admin via `POST /api/admin/create-admin`.
- **`/api/seed` is dev/admin-only** and hard-blocked in production (`NODE_ENV === "production"` → `403`) regardless of role — don't rely on it for any production data setup.
- **Route protection is enforced in `middleware.ts`**, which gates `/admin/*` (admin role required), and `/checkout`, `/orders`, `/profile`, `/cart` (any authenticated session) at the page level.
