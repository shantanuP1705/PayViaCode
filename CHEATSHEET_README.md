# SecurePay – Code‑Based Payment Authorization (Cheat Sheet)

SecurePay is a secure, code‑based peer‑to‑peer payment system.
Instead of sending money directly to an identifier that might be mistyped, the payer generates a short‑lived payment code, shares it with the receiver, and then explicitly approves the payment using an MPIN. Funds move between internal wallets, with a full transaction history.

---

## 1. Features

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
  - Short‑lived payment codes with automatic expiry.
  - Per‑endpoint rate limiting to protect sensitive APIs.
  - CORS restricted to local/private network by default.

---

## 2. Tech Stack

- **Backend (PaymentSystem)**
  - Java 17, Spring Boot 4.x
  - Spring Web MVC, Spring Data MongoDB, Spring Validation
  - Spring Security, Actuator, JavaMail
  - MongoDB Atlas (or any MongoDB instance)

- **Frontend (v0‑secure‑payment‑system)**
  - Next.js 16 (App Router), React 19, TypeScript
  - Tailwind‑style UI with Radix UI & custom components
  - Firebase Authentication
  - Zustand for client‑side state management

---

## 3. High‑Level Architecture

- **Frontend**
  - Key routes:
    - `/` – redirects based on Firebase auth state.
    - `/login` – login screen.
    - `/dashboard` – profile summary, wallet balance, recent activity.
    - `/profile` – profile & MPIN management.
    - `/add-money` – wallet top‑up.
    - `/create-payment` – generate payment codes.
    - `/pay-by-code` – receiver confirms codes.
    - `/approve` – payer approves receiver‑confirmed codes.
    - `/transactions`, `/statements` – history & filters.
    - `/invoice/[code]` – invoice/receipt view for a specific code.
  - Calls backend via small API clients:
    - lib/profile-api.ts
    - lib/wallet-api.ts
    - lib/payments-api.ts

- **Backend**
  - Entry point: PaymentSystemApplication (Spring Boot main class).
  - REST controllers (package com.example.Controller):
    - ProfileController – `/api/profile`
    - WalletController – `/api/wallet`
    - TransactionController – `/api/wallet/transactions`
    - PaymentRequestController – `/api/payments/requests`
    - CodeController – `/api/payments/code`
  - Services (package com.example.Service):
    - Profiles, wallets, payment requests, transactions, OTP, expiry scheduler.
  - Persistence (MongoDB) with entities (package com.example.Entity):
    - ProfileDto, PaymentRequest, WalletTransaction, User, etc.
  - Configuration (package com.example.Config):
    - SecurityConfig – Spring Security.
    - CorsConfig – CORS.
    - RateLimitingFilter – per‑endpoint rate limiting.

---

## 4. Core Domain Model

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

## 5. Main Flows

### 5.1 Onboarding & Wallet

1. User signs in via Firebase on the frontend.
2. User creates/updates profile via:
   - POST /api/profile
3. User sets MPIN via:
   - POST /api/profile/{email}/mpin
4. User adds money to their wallet:
   - POST /api/wallet/add

### 5.2 Payment via Code

1. **Payer creates request**
   - UI: /create-payment
   - API: POST /api/payments/requests
   - Body (example):
     ```json
     {
       "amount": 100.0,
       "note": "Dinner",
       "payerEmail": "payer@example.com"
     }
     ```
   - Response includes code and expiresAt.

2. **Receiver confirms code**
   - UI: /pay-by-code
   - API: POST /api/payments/code/confirm
   - Body (example):
     ```json
     {
       "code": "ABC12345",
       "receiverEmail": "receiver@example.com"
     }
     ```
   - Status moves to RECEIVER_CONFIRMED.

3. **Payer approves with MPIN**
   - UI: /approve
   - API: POST /api/payments/code/approve
   - Body (example):
     ```json
     {
       "code": "ABC12345",
       "mpin": "1234"
     }
     ```
   - Validates: code exists, not expired, status is RECEIVER_CONFIRMED, MPIN matches payer.
   - On success:
     - Debits payer; credits receiver.
     - Records WalletTransaction entries for both.
     - Status becomes COMPLETED.
     - Sends email notifications.

4. **History & invoice**
   - UI: /transactions, /statements, /invoice/[code]
   - APIs:
     - GET /api/wallet/transactions/{email}
     - GET /api/wallet/transactions/{email}/list
     - GET /api/payments/requests/{code}

---

## 6. Backend API Overview (Cheat Sheet)

Base URL (local): http://localhost:8082

**Profile & MPIN**

- POST /api/profile  
  Upsert profile (body: ProfileDto JSON).

- GET /api/profile/{email}  
  Get profile; 404 if not found.

- POST /api/profile/{email}/mpin  
  Body: { "mpin": "1234" } (4–6 digits).  
  204 on success, 400/404 on errors.

**Wallet**

- GET /api/wallet/{email}  
  → { "email": "...", "balance": number }

- POST /api/wallet/add  
  Body: { "email": "...", "amount": number }

- POST /api/wallet/debit  
  Body: { "email": "...", "amount": number }

**Transactions**

- GET /api/wallet/transactions/{email}?limit=N  
  Recent N transactions.

- GET /api/wallet/transactions/{email}/list?...filters  
  Filters: type, status, source, q, start, end, page, size.

**Payment Requests & Codes**

- POST /api/payments/requests  
  Body: { amount, note?, payerEmail?, payerProfileId? }  
  → { requestId, code, expiresAt }

- GET /api/payments/requests/{code}  
  → Full details including payer/receiver info (if known).

- POST /api/payments/code/confirm (receiver)  
  Body: { code, receiverEmail?, receiverProfileId? }

- POST /api/payments/code/approve (payer)  
  Body: { code, mpin }

---

## 7. Cross‑Cutting Concerns

- **Security & Auth**
  - Spring Security:
    - CORS enabled.
    - CSRF, HTTP basic, and form login disabled.
    - /api/** currently permitAll() (auth is enforced on frontend via Firebase).
  - MPIN is required for payment approval flows and hashed with BCrypt.

- **Rate Limiting**
  - Implemented via RateLimitingFilter:
    - Approve code: 5 requests/min.
    - Confirm code: 10 requests/min.
    - Payment creation & wallet mutations: 20 requests/min.
    - General /api/**: 60 requests/min.

- **CORS**
  - Allows local/private dev hosts (localhost, 127.0.0.1, 10.*, 172.16–19.*, 192.168.*) for /api/**.

- **Expiry & Reliability**
  - Scheduled job every minute:
    - CREATED requests past expiresAt → EXPIRED.
    - RECEIVER_CONFIRMED past expiresAt → FAILED with PAYMENT_FAILED events.
  - Payment approval includes best‑effort compensation if debit succeeds but credit fails.

---

## 8. Running Locally

### 8.1 Backend (Spring Boot)

1. Configure MongoDB in application.properties, e.g.:
   ```properties
   spring.mongodb.uri=mongodb://localhost:27017/Securepay
   server.port=8082
   ```
2. From the PaymentSystem/ directory, run (Windows PowerShell):
   ```powershell
   .\mvnw spring-boot:run
   ```
3. Backend is available at http://localhost:8082.

### 8.2 Frontend (Next.js)

1. From v0-secure-payment-system/:
   ```bash
   pnpm install   # or: npm install
   ```
2. Create .env.local:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8082
   # Firebase config vars here: NEXT_PUBLIC_FIREBASE_API_KEY, etc.
   ```
3. Run dev server:
   ```bash
   pnpm dev       # or: npm run dev
   ```
4. Open http://localhost:3000.

---

## 9. Interview Talking Points

- Code‑based payments with explicit MPIN approval reduce misdirected/fraudulent transfers.
- Known parties only: both payer and receiver must be onboarded.
- Clear state machine for payment requests with expiry and failure handling.
- Wallet + immutable transaction ledger for full auditability.
- Rate limiting on sensitive endpoints and CORS‑restricted APIs.
- Frontend leverages Firebase for auth; backend is currently API‑only, easy to extend with JWT or Firebase token verification later.
