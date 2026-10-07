# SecurePay – Code‑Based Payment Platform (Cheat Sheet + Deep Dive)

SecurePay is a secure, code‑based peer‑to‑peer payment platform.
Instead of sending money directly to an identifier that might be mistyped, the payer generates a short‑lived payment code, shares it with the receiver, and then explicitly approves the payment using an MPIN. Funds move between internal wallets, with a full transaction history.

This file is both a **project README** and an **interview cheat sheet** covering:

- Overall features and architecture
- Tech stack (Spring Boot + Next.js + Firebase)
- Key technical concepts with **why**, **pros/cons**, and **sample interview questions**

---

## 1. High‑Level Summary

- Built a secure **full‑stack payments platform** using **Spring Boot** (backend) and **Next.js** (frontend).
- Integrated **Firebase Authentication with Google OAuth2** and **CORS + rate limiting** to protect payment APIs.
- Implemented **time‑bound payment codes** with configurable TTL and a **Spring‑scheduled expiry job** to automatically mark stale requests as expired/failed.
- Built a **Firebase‑integrated UI** with reusable components, dashboards, and guided assistant‑style flows.

---

## 2. Features

- **Code‑based payments**
  - Payer generates a short‑lived payment code.
  - Receiver claims the code.
  - Payer approves with MPIN; only then are funds moved.

- **Known parties only**
  - Both payer and receiver must have profiles and wallets in the system.
  - Reduces risk of misdirected or fraudulent payments.

- **Wallets & statements**
  - Per‑user wallet balance.
  - Immutable ledger of wallet transactions (credits, debits, events).
  - Filterable transaction history & statements.

- **Security & safety**
  - MPIN for payment approvals (BCrypt‑hashed).
  - Short‑lived payment codes with automatic expiry and validation.
  - Per‑endpoint rate limiting to protect sensitive APIs.
  - CORS restricted to local/private network by default.

---

## 3. Tech Stack

- **Backend (PaymentSystem)**
  - Java 17, Spring Boot
  - Spring Web MVC, Spring Data MongoDB, Spring Validation
  - Spring Security, Actuator
  - MongoDB Atlas (or any MongoDB instance)

- **Frontend (v0‑secure‑payment‑system)**
  - Next.js (App Router), React, TypeScript
  - Tailwind‑style UI with custom components
  - Firebase Authentication with Google OAuth2
  - Zustand for client‑side state management

---

## 4. Architecture Overview

### 4.1 Frontend (Next.js)

- Key routes:
  - `/` – redirects based on Firebase auth state.
  - `/login` – Google login screen using Firebase Auth.
  - `/dashboard` – profile summary, wallet balance, recent activity.
  - `/profile` – profile & MPIN management.
  - `/add-money` – wallet top‑up.
  - `/create-payment` – generate payment codes.
  - `/pay-by-code` – receiver confirms codes.
  - `/approve` – payer approves receiver‑confirmed codes.
  - `/transactions`, `/statements` – history & filters.
  - `/invoice/[code]` – invoice/receipt view for a specific code.

- Uses small API clients to talk to Spring Boot:
  - lib/profile-api.ts
  - lib/wallet-api.ts
  - lib/payments-api.ts

### 4.2 Backend (Spring Boot)

- Entry point: PaymentSystemApplication (Spring Boot main class).
- REST controllers (package `com.example.Controller`):
  - ProfileController – `/api/profile`
  - WalletController – `/api/wallet`
  - TransactionController – `/api/wallet/transactions`
  - PaymentRequestController – `/api/payments/requests`
  - CodeController – `/api/payments/code`
- Services (package `com.example.Service`):
  - Profiles, wallets, payment requests, transactions, OTP, expiry scheduler.
- Persistence (MongoDB) with entities (package `com.example.Entity`):
  - ProfileDto, PaymentRequest, WalletTransaction, User, etc.
- Configuration (package `com.example.Config`):
  - SecurityConfig – Spring Security, CORS integration, rate limiting filter.
  - CorsConfig – allowed origins/methods/headers for `/api/**`.
  - RateLimitingFilter – per‑endpoint rate limiting using a token‑bucket.

---

## 5. Core Domain Model

- **Profile (ProfileDto)**
  - Fields: accountHolderName, accountNumber, bankName, IFSC, email (unique), walletBalance, mpinHash, mpinUpdatedAt.
  - Email, account number, and IFSC are indexed and unique.
  - MPIN is stored as a BCrypt hash.

- **Wallet & WalletTransaction**
  - Profile has a walletBalance.
  - Every change is a WalletTransaction:
    - type: CREDIT, DEBIT, or EVENT
    - source: ADD_MONEY, PAYMENT_SENT, PAYMENT_RECEIVED, PAYMENT_FAILED, MANUAL_DEBIT, REVERSAL, etc.
    - status: Success or Failed
  - Ledger can be used to reconstruct balances and statements.

- **PaymentRequest & Code**
  - Fields: amount, note, code (unique), status, createdAt, expiresAt, confirmedAt, payerEmail, payerProfileId, receiverEmail, receiverProfileId, receiverConfirmedAt.
  - Status flow (happy path):
    - CREATED → RECEIVER_CONFIRMED → CODE_CONFIRMED → COMPLETED
  - Failure/expiry path:
    - CREATED / RECEIVER_CONFIRMED → EXPIRED or FAILED (with failed events logged).

---

## 6. Main Functional Flows

### 6.1 Onboarding & Wallet

1. User signs in via Firebase on the frontend (Google OAuth2).
2. User creates/updates profile via:
   - POST `/api/profile`
3. User sets MPIN via:
   - POST `/api/profile/{email}/mpin`
4. User adds money to their wallet via:
   - POST `/api/wallet/add`

### 6.2 Payment via Code (End‑to‑End)

1. **Payer creates request**
   - UI: `/create-payment`
   - API: POST `/api/payments/requests`
   - Body (example):
     ```json
     {
       "amount": 100.0,
       "note": "Dinner",
       "payerEmail": "payer@example.com"
     }
     ```
   - Backend generates a unique code, sets `expiresAt` using a TTL (e.g., 5 minutes).

2. **Receiver confirms code**
   - UI: `/pay-by-code`
   - API: POST `/api/payments/code/confirm`
   - Body (example):
     ```json
     {
       "code": "ABC12345",
       "receiverEmail": "receiver@example.com"
     }
     ```
   - Backend verifies the code is not expired and not used, then sets status to `RECEIVER_CONFIRMED` and records receiver info.

3. **Payer approves with MPIN**
   - UI: `/approve`
   - API: POST `/api/payments/code/approve`
   - Body (example):
     ```json
     {
       "code": "ABC12345",
       "mpin": "1234"
     }
     ```
   - Backend checks:
     - Code exists and is not expired.
     - Status is `RECEIVER_CONFIRMED`.
     - MPIN matches payer profile (BCrypt check).
   - On success:
     - Debits payer and credits receiver wallets.
     - Records WalletTransaction entries for both.
     - Status becomes `COMPLETED`.

4. **History & invoice**
   - UI: `/transactions`, `/statements`, `/invoice/[code]`
   - APIs:
     - GET `/api/wallet/transactions/{email}`
     - GET `/api/wallet/transactions/{email}/list`
     - GET `/api/payments/requests/{code}`

---

## 7. Backend API Cheat Sheet

Base URL (local): `http://localhost:8082`

### 7.1 Profile & MPIN

- `POST /api/profile`
  - Upsert profile (body: ProfileDto JSON).

- `GET /api/profile/{email}`
  - Get profile; 404 if not found.

- `POST /api/profile/{email}/mpin`
  - Body: `{ "mpin": "1234" }` (4–6 digits).
  - 204 on success, 400/404 on errors.

### 7.2 Wallet

- `GET /api/wallet/{email}`
  - → `{ "email": "...", "balance": number }`

- `POST /api/wallet/add`
  - Body: `{ "email": "...", "amount": number }`

- `POST /api/wallet/debit`
  - Body: `{ "email": "...", "amount": number }`

### 7.3 Transactions

- `GET /api/wallet/transactions/{email}?limit=N`
  - Recent N transactions.

- `GET /api/wallet/transactions/{email}/list?...filters`
  - Filters: type, status, source, q, start, end, page, size.

### 7.4 Payment Requests & Codes

- `POST /api/payments/requests`
  - Body: `{ amount, note?, payerEmail?, payerProfileId? }`
  - → `{ requestId, code, expiresAt }`

- `GET /api/payments/requests/{code}`
  - → Full details including payer/receiver info (if known).

- `POST /api/payments/code/confirm` (receiver)
  - Body: `{ code, receiverEmail?, receiverProfileId? }`

- `POST /api/payments/code/approve` (payer)
  - Body: `{ code, mpin }`

---

## 8. Key Technical Concepts (With Why, Pros/Cons, Interview Questions)

### 8.1 Spring Boot Backend

- **What**
  - Java framework for building production‑ready REST APIs, with auto‑configuration, embedded server, and strong ecosystem.

- **Why here**
  - Payments need reliability, clear business rules, and strong tooling for data and security.
  - Spring Boot gives REST controllers, validation, transaction management, and scheduling in one stack.

- **Advantages**
  - Mature, widely used in fintech/enterprise.
  - Powerful security stack (Spring Security).
  - Simple support for filters and scheduled jobs.

- **Disadvantages**
  - Heavier than some lightweight frameworks.
  - Learning curve for Spring ecosystem.

- **Interview questions**
  - “How does Spring Boot auto‑configuration work?”
  - “What is a `Filter` / `OncePerRequestFilter` and when would you use it?”

### 8.2 Next.js Frontend

- **What**
  - React framework with routing, server‑side rendering (SSR), and optimizations.

- **Why here**
  - Build a modern, dashboard‑style UI with multiple pages (login, dashboard, profile, payments, statements) and good DX.

- **Advantages**
  - Good performance and SEO.
  - File‑based routing + App Router simplify structure.

- **Disadvantages**
  - Concepts like server/client components can be complex.

- **Interview questions**
  - “Why choose Next.js over a plain React SPA?”
  - “How do you protect client‑side routes in Next.js?”

### 8.3 Firebase Authentication with Google OAuth2

- **What**
  - Firebase Auth manages user identity and sessions; Google OAuth2 is the identity provider.
  - Frontend uses `signInWithPopup(new GoogleAuthProvider())` and `onAuthStateChanged`.

- **Why here**
  - Avoid building your own password system.
  - Quick, secure login; easy to link user IDs to profiles and roles (payer/receiver) in Firestore.

- **Advantages**
  - No password storage in your backend.
  - Smooth UX via Google login.
  - Firebase ID tokens are JWTs, suitable for backend validation.

- **Disadvantages**
  - Vendor lock‑in to Firebase/Google.
  - Requires Google account and internet.

- **Interview questions**
  - “How does OAuth2 authorization code flow work (high level)?”
  - “What is the relationship between OAuth2 and JWT?”

### 8.4 CORS (Cross‑Origin Resource Sharing)

- **What**
  - Browser security mechanism controlling which origins can call your APIs and with what methods/headers.

- **Why here**
  - Next.js app (e.g., `http://localhost:3000`) calls Spring Boot APIs on a different origin.
  - `CorsConfig` allows trusted local/private origins to access `/api/**` with required methods/headers.

- **Advantages**
  - Prevents random websites from using your APIs from a browser.
  - Fine‑grained control over origins, methods, headers.

- **Disadvantages**
  - Misconfiguration can break legitimate requests or weaken security.

- **Interview questions**
  - “What is CORS and why is it needed?”
  - “How do you configure CORS in a Spring Boot app?”

### 8.5 Rate Limiting Filter

- **What**
  - A `OncePerRequestFilter` that uses a simple token‑bucket per client/endpoint to limit requests per minute.

- **Why here**
  - Protect sensitive endpoints (`/api/payments/code/approve`, wallet mutations) from brute‑force and abuse.

- **Advantages**
  - Improves security and reliability.
  - Fine‑grained per‑endpoint policies.

- **Disadvantages**
  - In‑memory implementation is not shared across multiple instances.
  - Requires tuning to avoid blocking legitimate heavy users.

- **Interview questions**
  - “What is rate limiting and why is it important?”
  - “Describe the token‑bucket algorithm.”

### 8.6 Automated Payment Request Expiry (TTL + Scheduler)

- **What**
  - PaymentRequest has an `expiresAt` set at creation (TTL minutes from now).
  - A `@Scheduled` job runs every minute:
    - `CREATED` past `expiresAt` → `EXPIRED`.
    - `RECEIVER_CONFIRMED` past `expiresAt` → `FAILED` and logs events.
  - On each code usage, backend also checks if it’s expired.

- **Why here**
  - Payment codes must not stay valid forever; prevents misuse and user confusion.

- **Advantages**
  - Enforces clear lifetime for payment codes.
  - Automatic cleanup and consistent status.

- **Disadvantages**
  - Needs careful handling of race conditions (approving just as code expires).
  - Scheduler must be monitored; if down, expiry is delayed.

- **Interview questions**
  - “How would you design expiry for temporary payment links?”
  - “What race conditions can occur with scheduled expiry?”

### 8.7 Firebase‑Integrated UI, Reusable Components, Dashboards, Assistant

- **What**
  - React/Next.js UI bound to Firebase Auth and Firestore.
  - Shared UI components (buttons, cards, forms) used across pages.
  - Dashboards for wallet and transactions.
  - Guided assistant experiences for payment flows.

- **Why here**
  - Consistent UX and faster development.
  - Clear view of balances and transactions.
  - Guided flows help users complete complex tasks (send/approve payments).

- **Advantages**
  - Reuse reduces bugs and improves consistency.
  - Assistant‑style flows improve usability.

- **Disadvantages**
  - Tighter coupling to Firebase on the client.
  - Complex flows can be harder to test.

- **Interview questions**
  - “Why are reusable components important in React/Next.js?”
  - “How would you design a dashboard for financial data?”

---

## 9. Running Locally

### 9.1 Backend (Spring Boot)

1. Configure MongoDB in `application.properties`, e.g.:
   ```properties
   spring.mongodb.uri=mongodb://localhost:27017/Securepay
   server.port=8082
   ```
2. From the `PaymentSystem/` directory, run (Windows PowerShell):
   ```powershell
   .\mvnw spring-boot:run
   ```
3. Backend is available at `http://localhost:8082`.

### 9.2 Frontend (Next.js)

1. From `v0-secure-payment-system/`:
   ```bash
   pnpm install   # or: npm install
   ```
2. Create `.env.local`:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8082
   # Firebase config vars: NEXT_PUBLIC_FIREBASE_API_KEY, etc.
   ```
3. Run dev server:
   ```bash
   pnpm dev       # or: npm run dev
   ```
4. Open `http://localhost:3000`.

---

## 10. Quick Interview Summary (One‑Minute Pitch)

- I built a secure full‑stack payments platform with Spring Boot and Next.js.
- On the frontend, I use Firebase Authentication with Google OAuth2 and manage payer/receiver roles, then call a Spring Boot API.
- The backend maintains profiles, wallets, payment requests, and transactions in MongoDB, with rate‑limited and CORS‑protected APIs.
- Payments are done via short‑lived codes: receiver confirms, payer approves with MPIN, and then money moves between internal wallets with a full audit trail.
- A scheduled job and expiry checks ensure stale payment requests automatically move to EXPIRED/FAILED, keeping data and balances consistent.

---

## 11. Sample Interview Q&A

### 11.1 Spring Boot

- **Q: How does Spring Boot auto‑configuration work?**  
  A: Spring Boot looks at the libraries on the classpath and your configuration, then applies built‑in `@Configuration` classes to create sensible default beans. For example, if it finds Spring MVC and an embedded server, it auto‑configures a `DispatcherServlet`. You can override this behavior with your own beans or properties when you need custom behavior.

- **Q: What is a `Filter` / `OncePerRequestFilter` and when would you use it?**  
  A: A `Filter` lets you inspect or modify HTTP requests and responses before they reach controllers. `OncePerRequestFilter` guarantees this logic runs once per request. It’s ideal for cross‑cutting concerns like rate limiting, logging, or checking auth tokens across many endpoints.

### 11.2 Next.js

- **Q: Why choose Next.js over a plain React SPA?**  
  A: Next.js adds routing, server‑side rendering, and optimizations on top of React, so you get better performance, SEO, and a well‑structured app by default. It also handles bundling, code splitting, and API routes, which you’d otherwise have to wire manually in a plain SPA.

- **Q: How do you protect client‑side routes in Next.js?**  
  A: I wrap protected pages in an auth guard that checks the current user (for example, from Firebase or a store) and redirects unauthenticated users to `/login`. On the server side, you can also protect data‑fetching functions or middleware by validating tokens before returning sensitive data.

### 11.3 Firebase Auth / OAuth2

- **Q: How does OAuth2 authorization code flow work (high level)?**  
  A: The app sends the user to the provider’s login page; after the user logs in, the provider redirects back with an authorization code. The app or SDK exchanges that code for tokens (access and ID tokens), which are then used to identify the user and call protected APIs. Firebase wraps this in helpers like `signInWithPopup`, but under the hood it’s the same idea.

- **Q: What is the relationship between OAuth2 and JWT?**  
  A: OAuth2 is an authorization framework that defines how clients obtain tokens. JWT is just a token format. An OAuth2 provider can issue tokens as JWTs so they’re self‑contained and can be verified without storing session state on the server.

### 11.4 CORS

- **Q: What is CORS and why is it needed?**  
  A: CORS is a browser security mechanism that controls which origins are allowed to make cross‑origin requests with credentials or custom headers. It’s needed because, by default, browsers block JavaScript from calling a different origin’s APIs to prevent malicious sites from abusing a logged‑in user’s session.

- **Q: How do you configure CORS in a Spring Boot app?**  
  A: You define a CORS policy with allowed origins, methods, headers, and credentials—either via `WebMvcConfigurer#addCorsMappings` or a `CorsConfigurationSource` bean—and then enable `.cors()` in the Spring Security filter chain. In this project, I allow local/private origins to call `/api/**` with methods like GET, POST, PUT, DELETE, and OPTIONS.

### 11.5 Rate Limiting

- **Q: What is rate limiting and why is it important?**  
  A: Rate limiting caps how many requests a client can make in a time window. It protects your APIs from brute‑force attacks and accidental floods that could slow down or crash the system. In this project, sensitive endpoints like payment approval have stricter limits.

- **Q: Describe the token‑bucket algorithm.**  
  A: Token bucket maintains a bucket with a fixed capacity that refills at a steady rate. Each incoming request consumes one token; if no tokens are available, the request is rejected or delayed. This lets you allow short bursts while still enforcing an average rate over time.

### 11.6 Expiry / Scheduling

- **Q: How would you design expiry for temporary payment links or codes?**  
  A: I store an `expiresAt` timestamp when the code is created and always check it on use—if `now > expiresAt`, I reject the operation. In addition, I run a scheduled job that periodically finds overdue records and updates their status to EXPIRED or FAILED so data stays consistent even if nobody tries to use the code.

- **Q: What race conditions can occur with scheduled expiry?**  
  A: A common race is when a user is approving a code at the same time the scheduler is expiring it. Without careful checks, you might both expire and complete the same request. To avoid that, the approval logic re‑checks status and expiry in a single transaction, and the scheduler also only updates records that are still in an allowed state.

### 11.7 UI / Components / Dashboards

- **Q: Why are reusable components important in React/Next.js?**  
  A: Reusable components keep the UI consistent and reduce duplication, because styling and behavior live in one place instead of being copied across pages. That makes it faster to build new screens and much easier to fix bugs or apply design changes.

- **Q: How would you design a dashboard for financial data?**  
  A: I’d surface key metrics first—current balance, total in/out, pending payments—then show a filterable transaction list with clear labels and color‑coding for credits, debits, and failures. Each row should be clickable to see more details, like an invoice or full payment request, while always keeping the user’s balance visible.
