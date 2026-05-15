# Payment Flow & User Experience

<cite>
**Referenced Files in This Document**
- [checkout.html](file://checkout.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [pedido-status.html](file://pedido-status.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)
- [package.json](file://package.json)
- [PAGAMENTO-README.md](file://PAGAMENTO-README.md)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains the complete payment flow from the user's perspective, covering checkout, payment creation, redirection to PagBank, status handling, and access activation. It documents the user experience across payment method selection (à vista, entrada, cartão, manual), payment confirmation, and access activation. It also details frontend integration patterns and backend endpoint communication, along with troubleshooting guidance for common payment flow issues.

## Project Structure
The payment system consists of:
- Frontend pages: checkout, payment return, and manual order status
- Backend service: Express server exposing REST endpoints and handling PagBank integration
- Database: PostgreSQL schema for orders and users
- Dependencies: Express, Axios, PostgreSQL driver, Multer for uploads, dotenv for environment variables

```mermaid
graph TB
subgraph "Frontend"
Checkout["checkout.html"]
ReturnPage["pagamento-retorno.html"]
ManualOrder["pedido-status.html"]
end
subgraph "Backend"
Server["server.js"]
DB["PostgreSQL (pedidos, usuarios)"]
end
subgraph "External Services"
PagBank["PagBank API"]
end
Checkout --> Server
ReturnPage --> Server
ManualOrder --> Server
Server --> PagBank
Server --> DB
```

**Diagram sources**
- [checkout.html](file://checkout.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [pedido-status.html](file://pedido-status.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

**Section sources**
- [package.json:11-19](file://package.json#L11-L19)
- [PAGAMENTO-README.md:1-119](file://PAGAMENTO-README.md#L1-L119)

## Core Components
- Payment creation endpoint: creates a PagBank order, persists the order, and returns either a redirect link or fallback QR code
- Webhook handler: receives PagBank notifications and updates order status and user access
- Status polling: frontend checks order status periodically until completion
- Manual payment flow: separate flow for PIX + Cartão combinations with admin coordination
- Access activation: user account creation upon successful payment

Key responsibilities:
- Validate and sanitize user input
- Build PagBank order payload with redirect URLs
- Persist order state and handle multi-stage payments
- Provide public order status for manual flow
- Manage admin actions for manual orders

**Section sources**
- [server.js:82-280](file://server.js#L82-L280)
- [server.js:285-345](file://server.js#L285-L345)
- [server.js:350-370](file://server.js#L350-L370)
- [server.js:540-671](file://server.js#L540-L671)
- [server.js:805-890](file://server.js#L805-L890)

## Architecture Overview
The payment flow integrates the frontend checkout with the backend server and PagBank. The server handles order creation, webhook notifications, and order status queries. The frontend manages user interactions, redirects, and status polling.

```mermaid
sequenceDiagram
participant U as "User"
participant C as "checkout.html"
participant S as "server.js"
participant PB as "PagBank API"
participant R as "pagamento-retorno.html"
U->>C : Open checkout and select payment method
C->>S : POST /api/criar-pagamento
S->>PB : Create order
PB-->>S : Order with link or QR code
S-->>C : {pedido_id, link_pagamento, qr_code_url}
C->>U : Redirect to PagBank or show QR code
PB-->>S : Webhook /api/webhook/pagbank
S->>S : Update order status and activate access
U->>R : Visit return page with order_id
R->>S : GET /api/pedido/ : id
S-->>R : {status, email}
R-->>U : Show success/pending/error
```

**Diagram sources**
- [checkout.html:626-718](file://checkout.html#L626-L718)
- [server.js:82-280](file://server.js#L82-L280)
- [server.js:285-345](file://server.js#L285-L345)
- [pagamento-retorno.html:121-152](file://pagamento-retorno.html#L121-L152)

## Detailed Component Analysis

### Checkout Page (User Experience)
The checkout page presents four payment options:
- À Vista: immediate access after payment
- Entrada (PIX): partial payment via PagBank, followed by card installment
- Cartão: full payment via PagBank card
- Manual (PIX + Cartão): user-defined split, admin-managed card link

User journey:
1. Select payment method and review details
2. Fill personal information (name, email, CPF, phone)
3. Submit form to create payment
4. Redirect to PagBank or display QR code
5. Poll order status until completion
6. Receive success/pending/error feedback

```mermaid
flowchart TD
Start(["User opens checkout"]) --> Select["Select payment method"]
Select --> Fill["Fill personal info"]
Fill --> Submit["Submit form"]
Submit --> Create["POST /api/criar-pagamento"]
Create --> HasLink{"Has redirect link?"}
HasLink --> |Yes| Redirect["Redirect to PagBank"]
HasLink --> |No| ShowQR["Show QR code and start polling"]
ShowQR --> Poll["Poll /api/pedido/:id every 5s"]
Redirect --> Wait["Wait for PagBank webhook"]
Poll --> Paid{"Status = PAID?"}
Wait --> Paid
Paid --> |Yes| Success["Show success message"]
Paid --> |No| Pending["Show pending message"]
```

**Diagram sources**
- [checkout.html:515-534](file://checkout.html#L515-L534)
- [checkout.html:626-718](file://checkout.html#L626-L718)
- [checkout.html:727-764](file://checkout.html#L727-L764)

**Section sources**
- [checkout.html:351-376](file://checkout.html#L351-L376)
- [checkout.html:431-455](file://checkout.html#L431-L455)
- [checkout.html:626-718](file://checkout.html#L626-L718)
- [checkout.html:727-764](file://checkout.html#L727-L764)

### Payment Creation Endpoint
The backend endpoint validates input, constructs a PagBank order with redirect URLs, persists the order, and returns either a redirect link or fallback QR code. It sets up success/failure/pending callbacks to the return page.

```mermaid
sequenceDiagram
participant C as "checkout.html"
participant S as "server.js"
participant PB as "PagBank API"
participant DB as "PostgreSQL"
C->>S : POST /api/criar-pagamento {cliente,email,cpf,telefone,metodo}
S->>S : Validate and build order payload
S->>PB : POST /orders
PB-->>S : Order with links
S->>DB : INSERT pedidos
S-->>C : {pedido_id, link_pagamento?, qr_code_url?, pix_codigo?}
```

**Diagram sources**
- [server.js:82-280](file://server.js#L82-L280)
- [database.sql:13-36](file://database.sql#L13-L36)

**Section sources**
- [server.js:82-280](file://server.js#L82-L280)
- [database.sql:13-36](file://database.sql#L13-L36)

### Webhook Handling and Access Activation
When PagBank notifies the webhook, the backend updates the order status. For à vista payments, access is granted immediately upon confirmation. For the parcelado flow, the system tracks entrance and card stages separately.

```mermaid
flowchart TD
Webhook["POST /api/webhook/pagbank"] --> Load["Load order by id"]
Load --> Method{"Method = 'avista'?"}
Method --> |Yes| AvistaPaid{"Status = PAID?"}
AvistaPaid --> |Yes| Activate["Activate access (insert user)"]
AvistaPaid --> |No| Save["Save status update"]
Method --> |No| Parcelado["Parcelado flow"]
Parcelado --> FirstStage{"First stage paid?"}
FirstStage --> |Yes| MarkEntrance["Mark entrance paid"]
FirstStage --> |No| Save
Parcelado --> SecondStage{"Second stage paid?"}
SecondStage --> |Yes| Activate
SecondStage --> |No| Save
```

**Diagram sources**
- [server.js:285-345](file://server.js#L285-L345)
- [server.js:458-487](file://server.js#L458-L487)

**Section sources**
- [server.js:285-345](file://server.js#L285-L345)
- [server.js:458-487](file://server.js#L458-L487)

### Payment Return Page (User Feedback)
The return page accepts an order identifier, queries the backend for status, and displays success, pending, or error states. It supports multiple query parameter names for flexibility.

```mermaid
sequenceDiagram
participant U as "User"
participant R as "pagamento-retorno.html"
participant S as "server.js"
U->>R : Open return page with order_id
R->>S : GET /api/pedido/ : id
S-->>R : {status, email}
R-->>U : Show success/pending/error
```

**Diagram sources**
- [pagamento-retorno.html:121-152](file://pagamento-retorno.html#L121-L152)
- [server.js:350-370](file://server.js#L350-L370)

**Section sources**
- [pagamento-retorno.html:108-152](file://pagamento-retorno.html#L108-L152)
- [server.js:350-370](file://server.js#L350-L370)

### Manual Payment Flow (PIX + Cartão)
For the manual option, users define the split between PIX and cartão. The system generates a unique token and link for the user to manage their order independently. Admin confirms PIX receipt, sends the cartão link, and finally marks the order complete.

```mermaid
sequenceDiagram
participant U as "User"
participant C as "checkout.html"
participant S as "server.js"
participant M as "pedido-status.html"
participant A as "Admin Panel"
U->>C : Choose manual option and split amounts
C->>S : POST /api/manual/criar-pedido
S-->>C : {url_pedido, token}
C-->>U : Redirect to /pedido/ : token
U->>M : View order status
U->>S : Upload PIX receipt
S-->>M : Update status to PIX confirmed
A->>S : Confirm PIX and send cartão link
S-->>M : Update status to LINK_CARTAO_ENVIADO
U->>M : Pay cartão via sent link
A->>S : Confirm total payment
S->>S : Activate access
S-->>M : Update status to PAID
```

**Diagram sources**
- [checkout.html:646-672](file://checkout.html#L646-L672)
- [server.js:540-671](file://server.js#L540-L671)
- [pedido-status.html:172-338](file://pedido-status.html#L172-L338)
- [server.js:805-890](file://server.js#L805-L890)

**Section sources**
- [checkout.html:400-429](file://checkout.html#L400-L429)
- [checkout.html:646-672](file://checkout.html#L646-L672)
- [server.js:540-671](file://server.js#L540-L671)
- [pedido-status.html:172-338](file://pedido-status.html#L172-L338)
- [server.js:805-890](file://server.js#L805-L890)

### Database Schema
The system stores orders and users in PostgreSQL. Orders track payment stages, amounts, and admin notes. Users represent activated clients.

```mermaid
erDiagram
PEDIDOS {
varchar id PK
varchar cliente
varchar email
varchar cpf
varchar telefone
varchar status
varchar metodo
integer valor_total
boolean entrada_paga
boolean cartao_pago
varchar tipo_fluxo
integer valor_pix
integer valor_cartao
boolean pix_pago
varchar comprovante_pix_path
text link_cartao_admin
text observacoes_admin
varchar token_acesso
timestamp criado_em
timestamp atualizado_em
jsonb dados_pagbank
}
USUARIOS {
serial id PK
varchar nome
varchar email UK
varchar senha
varchar tipo
boolean ativo
varchar pedido_id
timestamp criado_em
timestamp liberado_em
}
PEDIDOS ||--o{ USUARIOS : "referenced by"
```

**Diagram sources**
- [database.sql:13-58](file://database.sql#L13-L58)

**Section sources**
- [database.sql:13-58](file://database.sql#L13-L58)

## Dependency Analysis
The backend depends on:
- Express for routing and middleware
- Axios for external API calls to PagBank
- PostgreSQL driver for database operations
- Multer for manual order receipt uploads
- Dotenv for environment configuration

```mermaid
graph LR
Express["express"] --> Server["server.js"]
Axios["axios"] --> Server
PG["pg"] --> Server
Multer["multer"] --> Server
Cookie["cookie-parser"] --> Server
CORS["cors"] --> Server
Dotenv["dotenv"] --> Server
```

**Diagram sources**
- [package.json:11-19](file://package.json#L11-L19)
- [server.js:1-10](file://server.js#L1-L10)

**Section sources**
- [package.json:11-19](file://package.json#L11-L19)
- [server.js:1-10](file://server.js#L1-L10)

## Performance Considerations
- Status polling interval: 5 seconds for standard flow; 10 seconds for manual flow
- QR code fallback reduces reliance on external services
- Database indexing on email/status improves order queries
- Webhook-driven updates minimize polling overhead

## Troubleshooting Guide
Common issues and resolutions:
- No redirect link from PagBank: fallback to QR code display and polling
- Invalid or missing PagBank token: configure PAGBANK_TOKEN in environment
- Payment pending: return page shows pending state; check webhook delivery
- Manual flow delays: admin must confirm PIX and send cartão link
- Upload errors (manual): ensure file type and size limits are met

User-facing error messages:
- Payment creation failures: "Erro ao criar pagamento" with optional debug details
- Missing fields: "Dados incompletos"
- Manual split validation: sum must equal total and each part ≥ R$ 1,00
- Upload failures: "Falha no upload" with specific error text

Operational checks:
- Verify webhook URL configured in PagBank dashboard
- Confirm HTTPS for production deployments
- Ensure database connectivity and migrations applied
- Validate environment variables (PAGBANK_TOKEN, DB credentials)

**Section sources**
- [server.js:239-280](file://server.js#L239-L280)
- [server.js:544-565](file://server.js#L544-L565)
- [server.js:620-659](file://server.js#L620-L659)
- [PAGAMENTO-README.md:88-98](file://PAGAMENTO-README.md#L88-L98)

## Conclusion
The payment system provides a robust, user-friendly checkout experience with multiple payment methods, clear status feedback, and admin-managed flows for complex arrangements. The frontend integrates seamlessly with backend endpoints, while the backend ensures reliable order management and access activation through webhook-driven updates.