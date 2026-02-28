# SecurePay / PayViaCode – Low‑Connectivity Payment System

SecurePay (PayViaCode) is an end‑to‑end secure payment system designed for low or unreliable internet connections. 
Instead of real‑time card or UPI flows, it uses short‑lived payment codes that can be created and approved with very small, infrequent API calls – suitable for rural or congested networks and basic smartphones.

The system is built as:
- **Backend:** Spring Boot (PaymentSystem) + MongoDB Atlas
- **Frontend:** Next.js app (v0-secure-payment-system) consuming REST APIs via `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8082`)
- **Auth & UI state:** Firebase (for login, not as source of truth for balances)

For detailed diagrams, see the architecture document: [docs/architecture.md](docs/architecture.md).

---

## 1. Problem Statement & Gap It Bridges

Traditional digital payments assume:
- Stable internet for real‑time card/UPI gateways
- Full‑featured apps with complex flows
- Users willing to share card details or install heavy apps

**Gap:** In low‑bandwidth or intermittent‑network scenarios (rural areas, overloaded events, basic smartphones), real‑time payment gateways often fail, but users still need something better than pure cash.

**SecurePay bridges this gap by:**
- Using **short‑lived payment codes** instead of full payment flows.
- Reducing online interactions to **2–3 very small API calls**:
	1. Create a payment request → get a code.
	2. Receiver confirms the code.
	3. Payer approves with MPIN.
- Keeping all critical data and balances on the **backend (MongoDB)** so front‑end or network issues do not corrupt balances.

You can pitch this as: _“A low‑connectivity, code‑based payment layer that can be embedded into mobile/web banking apps.”_

---

## 2. High‑Level Architecture

See [docs/architecture.md](docs/architecture.md) for diagrams.

- **Frontend (Next.js – `v0-secure-payment-system`)**
	- Pages like `/create-payment`, `/pay-by-code`, `/begin-pay`, `/add-money`, `/profile`, `/transactions`, `/statements`, `/status`, `/invoice/[code]`.
	- Calls backend via `lib/payments-api.ts`, `lib/profile-api.ts`, `lib/wallet-api.ts`, `lib/wallet-api.ts` using `NEXT_PUBLIC_API_BASE_URL`.
	- Uses Firebase for authentication and client‑side session state.

- **Backend (Spring Boot – `PaymentSystem`)**
	- REST controllers in `com.example.Controller`:
		- `ProfileController` → `/api/profile` (profile + MPIN setup)
		- `WalletController` → `/api/wallet` (balances, add/debit)
		- `TransactionController` → `/api/wallet/transactions` (history)
		- `PaymentRequestController` → `/api/payments/requests` (create/get by code)
		- `CodeController` → `/api/payments/code` (confirm + approve code)
	- Services encapsulate domain rules (profiles, wallets, payment requests, transactions).
	- Repositories persist to **MongoDB Atlas**.

- **Cross‑cutting configuration**
	- Security: `/api/**` is permitted (for now) with CSRF disabled – see `Config/SecurityConfig.java`.
	- CORS: Local network origins allowed for `/api/**` – see `Config/CorsConfig.java`.
	- Expiry: `PaymentRequestExpiryScheduler` regularly expires old payment requests.

---

## 3. Core Domain Concepts

- **Profile**
	- Represents a user’s bank‑like identity (name, account number, email).
	- Stores an **MPIN** used to approve payments.

- **Wallet & Transactions**
	- Simple wallet balance per user (mapped by email/profile).
	- Every movement is a **WalletTransaction** (credit/debit + metadata), so balances can be reconstructed from history.

- **Payment Request & Code**
	- A `PaymentRequest` holds amount, payer, receiver, status, timestamps.
	- A **short payment code** is generated and shared out‑of‑band (SMS, WhatsApp, verbally).
	- Status transitions (simplified): `CREATED → RECEIVER_CONFIRMED → APPROVED/EXPIRED`.

### 3.1 Design Strength: Known Parties Only

- Both **payer and receiver are onboarded** into the system (they have profiles/wallets), and both actively participate in the flow.
- This reduces the risk of **misdirected or wrong payments** (e.g., typos in phone/email/UPI ID) because money only moves between known, validated wallets.
- The flow has **two human confirmations**:
	- Receiver confirms the code from their side.
	- Payer reviews receiver details (name/account) and approves with MPIN.
- This is a conscious trade‑off: we sacrifice “pay‑anyone” flexibility to gain **safety and clarity**, especially valuable in low‑connectivity and low‑trust environments.

---

## 4. End‑to‑End Flow (Pay‑By‑Code)

### 4.1 Create a Payment Request (Merchant / Payer side)

**Endpoint:** `POST /api/payments/requests`

1. Frontend page: `/create-payment` calls `lib/payments-api.ts`.
2. Controller: `PaymentRequestController.create()` receives payload:
	 - `amount` (BigDecimal, `@DecimalMin("0.01")`)
	 - optional `note`
	 - optional `payerEmail`
	 - optional `payerProfileId` (Mongo ObjectId as hex string)
3. Controller validates `payerProfileId` and forwards to `PaymentRequestService.create(...)`.
4. Service:
	 - Validates amount/rules.
	 - Generates **unique payment code** and expiry time.
	 - Persists `PaymentRequest` in MongoDB with status `CREATED`.
5. Response (`CreateResponse`):
	 - `requestId`, `code`, `expiresAt`.
6. Frontend shows the code (e.g. on `/invoice/[code]`) for the receiver to use.

### 4.2 Receiver Confirms the Code

**Endpoint:** `POST /api/payments/code/confirm`

1. Frontend page: `/pay-by-code` takes the code entered by the receiver.
2. Controller: `CodeController.confirmByReceiver()` accepts `ConfirmReceiverPayload`:
	 - `code` (required)
	 - optional `receiverEmail`
	 - optional `receiverProfileId`
3. Controller validates payload and converts `receiverProfileId` to `ObjectId` if provided.
4. Service `PaymentRequestService.confirmCodeByReceiver(code, receiverEmail, receiverProfileId)`:
	 - Looks up `PaymentRequest` by `code`.
	 - Ensures it’s not expired or already confirmed/approved.
	 - Attaches receiver details and sets status to `RECEIVER_CONFIRMED`.
5. `CodeController` enriches the response with receiver profile data via `ProfileRepository`:
	 - Finds `ProfileDto` by id or email.
	 - Adds `receiverAccountHolderName` and `receiverAccountNumber`.
6. Response (`ConfirmResponse`) is sent back to the app with updated status and details.

### 4.3 Payer Approves with MPIN

**Endpoint:** `POST /api/payments/code/approve`

1. Frontend page: `/begin-pay` asks the payer to confirm the code and enter their MPIN.
2. Controller: `CodeController.approveByPayer()` takes `ApprovePayload`:
	 - `code`
	 - `mpin`
3. Controller validates that both fields are present.
4. Service `PaymentRequestService.approveConfirmedCodeWithMpin(code, mpin)`:
	 - Fetches the `PaymentRequest` by code.
	 - Validates it is in `RECEIVER_CONFIRMED` state and not expired.
	 - Validates the **MPIN** against the payer’s profile.
	 - Updates status to `APPROVED`, sets timestamps.
	 - Invokes wallet/transaction service to **debit payer** and **credit receiver**.
5. `CodeController` again enriches the response with receiver profile data.
6. Response contains `status = APPROVED`, timestamps, and wallet‑relevant data for the UI.

### 4.4 Wallet & Statements

Key endpoints (see [docs/architecture.md](docs/architecture.md)):
- `GET /api/wallet/{email}` → current balance.
- `POST /api/wallet/add` → add money (e.g., top‑up for demo/testing).
- `POST /api/wallet/debit` → direct debit operations.
- `GET /api/wallet/transactions/{email}` / `.../list` → transaction history.

Frontend pages **`/add-money`**, **`/transactions`**, **`/statements`**, **`/status`** visualize this information for the user.

---

## 5. How to Explain This Project to an Interviewer

### 5.1 30‑Second Elevator Pitch

- _“I built a secure payment system optimized for low connectivity. Instead of real‑time card flows, it uses short payment codes that can be confirmed and approved with minimal API calls. The frontend is a Next.js app and the backend is a Spring Boot + MongoDB service. It manages profiles, wallets, payment requests, and code‑based approvals with MPIN.”_

### 5.2 3–5 Minute Deep‑Dive Structure

You can structure your explanation as:
1. **Problem & Motivation** – low connectivity, unreliable gateways, need for lightweight flows.
2. **Architecture** – Next.js → REST APIs → Spring Boot services → MongoDB.
3. **Core Entities** – Profile, Wallet, PaymentRequest, WalletTransaction.
4. **Key Flow** – Create request → share code → receiver confirms → payer approves with MPIN → wallets updated.
5. **Data & Security** – balances in backend, MPIN validation, CORS/security rules.
6. **Future Work** – OTP, rate limiting, notifications, stronger auth, real bank integration.

### 5.3 Whiteboard / Diagram Talking Points

On a whiteboard, you can draw:
- **Client box:** Next.js app pages + Firebase auth.
- **API box:** Controllers → Services → Repositories.
- **DB box:** MongoDB collections (profiles, wallets, payment_requests, transactions).
- Arrows for:
	- `POST /api/payments/requests` (create code)
	- `POST /api/payments/code/confirm` (receiver confirms)
	- `POST /api/payments/code/approve` (payer approves + wallet updates)

---

## 6. Common Interview Questions & How You Can Answer

- **Q: Why did you choose a code‑based flow instead of just doing normal online payments?**  
	A: To work better in low‑connectivity environments. The code is small and short‑lived, and we avoid heavy, multi‑step card/UPI redirects.

- **Q: How is security handled? Isn’t exposing `/api/**` risky?**  
	A: In this prototype, `/api/**` is open for rapid iteration. In production, I would add authentication/authorization (JWT/Firebase token verification), rate limiting, and stricter CSRF/cors rules. Sensitive actions (approvals) are protected by MPIN and server‑side validation.

- **Q: What happens if a request expires or someone reuses a code?**  
	A: The `PaymentRequest` has an expiry timestamp and status transitions. The service checks status and expiry before confirming or approving; expired or already‑used codes are rejected (typically as `409 CONFLICT` or `404`). A scheduler (`PaymentRequestExpiryScheduler`) also marks stale requests as expired.

- **Q: How do you ensure balances remain consistent?**  
	A: All balance changes go through wallet services that create `WalletTransaction` records for each debit/credit. The current balance is derived from transactions or tracked alongside them, ensuring an auditable history.

- **Q: How would you scale this system?**  
	A: Horizontally scale the Spring Boot API with stateless services behind a load balancer, use MongoDB replica sets, introduce caching for profiles, and add proper observability (metrics, logging, tracing). The APIs are already HTTP/JSON and stateless, so scaling is straightforward.

- **Q: What were the main trade‑offs you made?**  
	A: I prioritized simplicity and clarity over full bank‑grade security (e.g., no HSM, no PCI scope). The goal was to demonstrate end‑to‑end flow and extensible architecture rather than full production hardening.

You can extend these with questions about error handling, testing approach, and DevOps (how you’d deploy Spring Boot + Next.js + MongoDB).

---

## 7. Future Improvements & Possible Solutions

Some clear next steps you can mention in interviews:

- **Stronger Authentication & Authorization**
	- Protect `/api/**` with JWT or Firebase ID tokens.
	- Role‑based access control (payer vs receiver vs admin).

- **Security Hardening**
	- Encrypt sensitive data at rest (MPIN, account numbers).
	- Brute‑force protection on MPIN attempts (lockouts, back‑off).
	- Full audit logs for compliance.

- **Reliability & UX**
	- Better offline UX (caching, retries, background sync).
	- Push notifications or SMS for status changes (request created, approved, expired).

- **Operational Improvements**
	- Monitoring dashboards (success/failure rates, latency, code‑usage patterns).
	- More robust scheduler for expiration and clean‑up.

- **Integration with Real Banking Rails**
	- Map wallet credits/debits to real bank/UPI/IMPS transactions.
	- Add KYC and compliance layers where required.

Mentioning these in an interview shows you understand both the current implementation and how to evolve it into a production‑ready system.

---

## 8. Running the Project (Local)

High‑level steps (exact commands may vary):

1. **Backend (Spring Boot)**
	 - Configure MongoDB connection in `PaymentSystem/src/main/resources/application.properties`.
	 - From `PaymentSystem/`, run `mvnw spring-boot:run` (or use your IDE) → API on `http://localhost:8082`.

2. **Frontend (Next.js)**
	 - Go to `v0-secure-payment-system/`.
	 - Install dependencies (e.g., `pnpm install` or `npm install`).
	 - Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (e.g., `http://localhost:8082`).
	 - Optionally set `GOOGLE_API_KEY` for the assistant.
	 - Run the dev server: `pnpm dev` (or `npm run dev`).

3. **Open the app**
	 - Visit the frontend URL (usually `http://localhost:3000`).
	 - Walk through flows: create a profile, add money, create payment, confirm code, approve with MPIN, and check statements.

This README is intentionally interview‑oriented, so you can use it as a script/guide when discussing the project.

