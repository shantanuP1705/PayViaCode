# SecurePay Architecture

This document summarizes the overall components and the pay-by-code flow using Mermaid diagrams.

```mermaid
flowchart LR
    subgraph Web[Next.js App (v0-secure-payment-system)]
        Pages[Pages & Routes]
        LibAPIs[lib/* APIs]
        AuthStore[Zustand Auth Store]
        Firebase[Firebase Auth + Firestore]
        Pages --> LibAPIs
        Pages --> AuthStore
        AuthStore --> Firebase
    end

    LibAPIs -->|HTTP JSON| API[(Spring Boot API / PaymentSystem)]

    subgraph Backend[Spring Boot]
        API --> Ctrl[REST Controllers]
        Ctrl --> Svc[Domain Services]
        Svc --> Repo[Repositories]
        Repo --> DB[(MongoDB Atlas)]

        subgraph Controllers
            ProfileCtrl[ProfileController\n/api/profile]
            WalletCtrl[WalletController\n/api/wallet]
            TxCtrl[TransactionController\n/api/wallet/transactions]
            PRCtrl[PaymentRequestController\n/api/payments/requests]
            CodeCtrl[CodeController\n/api/payments/code]
        end

        Ctrl ---> ProfileCtrl
        Ctrl ---> WalletCtrl
        Ctrl ---> TxCtrl
        Ctrl ---> PRCtrl
        Ctrl ---> CodeCtrl
    end

    classDef ext fill:#eef,stroke:#88a,stroke-width:1px;
    class Web ext;

    note right of API:::ext
      Port: 8082\nSecurity: `/api/**` permitted, CSRF off\nCORS: Local networks allowed
    end
```

## Pay-By-Code Sequence

```mermaid
sequenceDiagram
    autonumber
    participant R as Receiver (User)
    participant A as Next.js App
    participant API as Spring Boot API
    participant CC as CodeController
    participant PRS as PaymentRequestService
    participant PRR as ProfileRepository
    participant DB as MongoDB Atlas
    participant WS as WalletTransactionService

    R->>A: Enter payment code
    A->>API: POST /api/payments/code/confirm {code, receiverEmail?}
    API->>CC: Route to `confirmByReceiver()`
    CC->>PRS: `confirmCodeByReceiver(code, receiverEmail, receiverProfileId)`
    PRS->>DB: Read PaymentRequest by code
    PRS->>DB: Update receiver fields + status RECEIVER_CONFIRMED
    PRS-->>CC: `PaymentRequest`
    CC->>PRR: Lookup receiver profile by id/email
    PRR-->>CC: `ProfileDto` (acct name/number)
    CC-->>A: `ConfirmResponse` (code, amount, receiver details)

    Note over R,A: Payer approves with MPIN
    A->>API: POST /api/payments/code/approve {code, mpin}
    API->>CC: Route to `approveByPayer()`
    CC->>PRS: `approveConfirmedCodeWithMpin(code, mpin)`
    PRS->>DB: Validate MPIN via Profile (payer)
    PRS->>DB: Move status to APPROVED; persist
    PRS->>WS: Log wallet credit/debit entries
    WS->>DB: Persist WalletTransaction
    PRS-->>CC: `PaymentRequest`
    CC-->>A: `ConfirmResponse` (status APPROVED, timestamps)
```

## Data Flow
- Client pages call `lib/payments-api.ts`, `lib/profile-api.ts`, `lib/wallet-api.ts` using `NEXT_PUBLIC_API_BASE_URL` (default http://localhost:8082).
- Controllers validate and delegate to services; services use repositories to read/write domain entities in MongoDB Atlas.
- Firebase stores UI-facing user state; backend endpoints are open (`/api/**`) with CORS for local dev networks.

## Key Endpoints
- Profile: `POST /api/profile`, `GET /api/profile/{email}`, `POST /api/profile/{email}/mpin`
- Wallet: `GET /api/wallet/{email}`, `POST /api/wallet/add`, `POST /api/wallet/debit`
- Transactions: `GET /api/wallet/transactions/{email}`, `GET /api/wallet/transactions/{email}/list`
- Payment Requests: `POST /api/payments/requests`, `GET /api/payments/requests/{code}`
- Codes: `POST /api/payments/code/confirm`, `POST /api/payments/code/approve`

## Configuration
- MongoDB: URI in [PaymentSystem/src/main/resources/application.properties](PaymentSystem/src/main/resources/application.properties).
- Security: `SecurityConfig.java` permits `/api/**`; CSRF disabled.
- CORS: `CorsConfig.java` allows local network origins for `/api/**`.

## Viewing & Exporting
- Open this file and use “Markdown: Open Preview” to render Mermaid.
- Install “Mermaid Export” to export diagrams to PNG/SVG from VS Code.
