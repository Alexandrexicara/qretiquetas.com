# Backend API Reference

<cite>
**Referenced Files in This Document**
- [server.js](file://server.js)
- [package.json](file://package.json)
- [database.sql](file://database.sql)
- [init-db.sql](file://init-db.sql)
- [checkout.html](file://checkout.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [PAGAMENTO-README.md](file://PAGAMENTO-README.md)
- [admin.html](file://admin.html)
- [admin-login.html](file://admin-login.html)
- [pedido-status.html](file://pedido-status.html)
- [migration-manual.sql](file://migration-manual.sql)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for new administrative API endpoints
- Documented manual payment processing system with complete flow
- Added admin panel endpoints: /api/admin/login, /api/admin/logout, /api/admin/pedidos
- Documented all manual payment flow endpoints including confirmation and card link management
- Updated API reference summary with new endpoints
- Enhanced error handling documentation for admin operations

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
10. [Appendices](#appendices)

## Introduction
This document provides comprehensive API documentation for the backend payment system. It covers all HTTP endpoints, request/response schemas, authentication requirements, error handling, and integration patterns for frontend consumption. The system integrates with PagBank for payment processing and manages order lifecycle, including webhook notifications and access provisioning. The system now includes a complete administrative interface for managing manual payment flows and order processing.

## Project Structure
The backend is implemented as a Node.js/Express server with PostgreSQL persistence. Key components:
- Express server with CORS, JSON parsing, cookies, and static file serving
- Payment orchestration via PagBank API
- Order lifecycle management with database persistence
- Admin panel with session-based authentication
- Manual payment flow system for custom payment arrangements
- Frontend pages for checkout, payment status, and admin management

```mermaid
graph TB
Client["Browser Client<br/>checkout.html / pagamento-retorno.html / admin.html"] --> API["Express Server<br/>server.js"]
API --> PG["PostgreSQL<br/>pedidos, usuarios"]
API --> PB["PagBank API"]
API --> FS["File Uploads<br/>/uploads/comprovantes"]
AdminPanel["Admin Panel<br/>admin.html"] --> API
ManualFlow["Manual Payment Flow<br/>pedido-status.html"] --> API
```

**Diagram sources**
- [server.js:12-27](file://server.js#L12-L27)
- [database.sql:13-36](file://database.sql#L13-L36)
- [admin.html:137-150](file://admin.html#L137-L150)
- [pedido-status.html:316-322](file://pedido-status.html#L316-L322)

**Section sources**
- [server.js:12-27](file://server.js#L12-L27)
- [package.json:11-18](file://package.json#L11-L18)
- [database.sql:13-36](file://database.sql#L13-L36)

## Core Components
- Express server with middleware stack
- Payment creation endpoint for PagBank orders
- Webhook endpoint for PagBank notifications
- Order status and listing endpoints
- Admin authentication and order management
- Manual payment flow (PIX + Card) with upload support
- Complete administrative API for order management

**Section sources**
- [server.js:82-280](file://server.js#L82-L280)
- [server.js:285-378](file://server.js#L285-L378)
- [server.js:388-487](file://server.js#L388-L487)
- [server.js:539-671](file://server.js#L539-L671)
- [server.js:703-736](file://server.js#L703-L736)
- [server.js:736-890](file://server.js#L736-L890)

## Architecture Overview
The system follows a request-response model with asynchronous payment processing. Payments are initiated via PagBank, with webhook callbacks updating order status and triggering access provisioning. The system now supports both automated PagBank processing and manual payment flows managed through an administrative interface.

```mermaid
sequenceDiagram
participant C as "Client Browser"
participant S as "Server /api/criar-pagamento"
participant PB as "PagBank API"
participant DB as "PostgreSQL"
participant W as "Server /api/webhook/pagbank"
C->>S : POST /api/criar-pagamento
S->>PB : Create order
PB-->>S : Order details with links
S->>DB : Save order record
S-->>C : {pedido_id, link_pagamento, qr_code_url}
Note over C,S : Client redirects to PagBank or displays QR code
PB-->>W : POST /api/webhook/pagbank
W->>DB : Update order status
W-->>PB : 200 OK
W->>DB : Provision access if paid
participant M as "Manual Client"
participant A as "Admin Panel"
M->>S : POST /api/manual/criar-pedido
S->>DB : Save manual order
M->>S : POST /api/manual/upload-comprovante/ : token
S->>DB : Update manual order status
A->>S : POST /api/admin/pedido/ : id/confirmar-pix
S->>DB : Update manual order status
A->>S : POST /api/admin/pedido/ : id/enviar-link-cartao
S->>DB : Update manual order status
A->>S : POST /api/admin/pedido/ : id/confirmar-pagamento
S->>DB : Update manual order status
S->>DB : Provision access
```

**Diagram sources**
- [server.js:82-280](file://server.js#L82-L280)
- [server.js:285-345](file://server.js#L285-L345)
- [server.js:539-671](file://server.js#L539-L671)
- [server.js:736-890](file://server.js#L736-L890)
- [database.sql:13-36](file://database.sql#L13-L36)

## Detailed Component Analysis

### Authentication and Security
- Admin authentication uses signed cookies with HMAC-SHA256 and expiration
- Session cookie is HttpOnly, SameSite lax, and Secure in production
- No global rate limiting is implemented in the current code
- Admin endpoints are protected by requireAdmin middleware

```mermaid
flowchart TD
Start(["Admin Login"]) --> Validate["Validate credentials"]
Validate --> |Invalid| Return401["Return 401 Unauthorized"]
Validate --> |Valid| Sign["Sign session payload"]
Sign --> SetCookie["Set HttpOnly admin cookie"]
SetCookie --> Success["Return 200 OK"]
```

**Diagram sources**
- [server.js:737-754](file://server.js#L737-L754)
- [server.js:727-734](file://server.js#L727-L734)

**Section sources**
- [server.js:727-754](file://server.js#L727-L754)

### Payment Creation: POST /api/criar-pagamento
Creates a PagBank order and returns payment links or QR code.

- Request body parameters:
  - cliente: string, required
  - email: string, required
  - telefone: string, required (digits only)
  - cpf: string, required (digits only)
  - metodo: string, optional, one of avista, entrada, cartao
- Response fields:
  - sucesso: boolean
  - pedido_id: string
  - metodo: string
  - valor_total: number (BRL)
  - link_pagamento: string|null
  - qr_code_url: string|null
  - pix_codigo: string|null

Error handling:
- 400 Bad Request: missing required fields
- 500 Internal Server Error: token missing, external service errors, database errors

Example request (paths only):
- [POST /api/criar-pagamento:82-280](file://server.js#L82-L280)

Example response (paths only):
- [Response shape:227-235](file://server.js#L227-L235)

Frontend integration (paths only):
- [Checkout page calling this endpoint:497-535](file://checkout.html#L497-L535)

**Section sources**
- [server.js:82-280](file://server.js#L82-L280)
- [checkout.html:497-535](file://checkout.html#L497-L535)

### Payment Status: GET /api/pedido/:id
Retrieves order details by PagBank order ID.

- Path parameter:
  - id: string, PagBank order ID
- Response fields:
  - id: string
  - status: string
  - metodo: string
  - cliente: string
  - email: string
  - valor_total: integer (cents)
  - valor_pix: integer (cents)
  - valor_restante: integer (cents)
  - entrada_paga: boolean
  - cartao_pago: boolean
  - criado_em: timestamp

Error handling:
- 404 Not Found: order not found

Frontend integration (paths only):
- [Checkout polling:544-581](file://checkout.html#L544-L581)
- [Payment return page polling:121-152](file://pagamento-retorno.html#L121-L152)

**Section sources**
- [server.js:350-370](file://server.js#L350-L370)
- [checkout.html:544-581](file://checkout.html#L544-L581)
- [pagamento-retorno.html:121-152](file://pagamento-retorno.html#L121-L152)

### Order Listing: GET /api/pedidos
Lists all orders from the database.

- Response: array of order objects with fields:
  - id, cliente, email, cpf, telefone, status, metodo, valor_total, entrada_paga, cartao_pago, criado_em, atualizado_em

**Section sources**
- [server.js:375-378](file://server.js#L375-L378)

### Webhook: POST /api/webhook/pagbank
Handles PagBank notifications to update order status and provision access.

- Request body: PagBank webhook payload (id, status, reference_id)
- Behavior:
  - Updates order status based on payment method
  - For avista: marks paid immediately
  - For parcelado: transitions through ENTRADA_PAID to PAID
  - Provisions client access upon full payment

Error handling:
- 500 Internal Server Error on failures

**Section sources**
- [server.js:285-345](file://server.js#L285-L345)

### Manual Payment Flow
Supports manual PIX + Card payments with admin-managed card link.

#### Manual Payment Endpoints
- POST /api/manual/criar-pedido: Creates a manual order with custom payment split
- POST /api/manual/upload-comprovante/:token: Uploads PIX payment proof
- GET /api/manual/pedido/:token: Retrieves sanitized order details for client

#### Manual Payment Process
1. Client creates manual order with desired PIX/cartão split
2. Client receives unique token for order access
3. Client pays PIX to provided key and uploads proof
4. Admin confirms PIX payment and sends card payment link
5. Client completes card payment
6. Admin confirms full payment and grants access

**Section sources**
- [server.js:539-671](file://server.js#L539-L671)

### Admin Panel Management
Complete administrative interface for managing orders and payment flows.

#### Admin Authentication
- POST /api/admin/login: Creates admin session cookie with expiration
- POST /api/admin/logout: Clears admin cookie

#### Order Management
- GET /api/admin/pedidos: Lists orders with optional status filtering
- POST /api/admin/pedido/:id/confirmar-pix: Confirms PIX payment for manual orders
- POST /api/admin/pedido/:id/enviar-link-cartao: Sends card payment link to client
- POST /api/admin/pedido/:id/confirmar-pagamento: Confirms full payment and grants access
- POST /api/admin/pedido/:id/cancelar: Cancels an order

#### Admin Interface Features
- Real-time order status monitoring
- Status filtering (todos, pending, pix, cartao, paid, cancel)
- Action buttons for each order management operation
- Automatic refresh every 30 seconds

**Section sources**
- [server.js:736-890](file://server.js#L736-L890)
- [admin.html:137-150](file://admin.html#L137-L150)
- [admin.html:252-272](file://admin.html#L252-L272)

## Dependency Analysis
External dependencies and integrations:
- Express for HTTP routing
- Axios for PagBank API calls
- pg for PostgreSQL connectivity
- cookie-parser for session cookies
- multer for file uploads
- dotenv for environment variables

```mermaid
graph LR
Express["Express"] --> Axios["Axios"]
Express --> PG["pg"]
Express --> Cookie["cookie-parser"]
Express --> Multer["multer"]
Express --> Dotenv["dotenv"]
Express --> Cors["cors"]
```

**Diagram sources**
- [package.json:11-18](file://package.json#L11-L18)

**Section sources**
- [package.json:11-18](file://package.json#L11-L18)

## Performance Considerations
- Database queries use prepared statements and indexing on email/status/token
- Webhook processing updates orders asynchronously
- No built-in rate limiting; consider adding middleware for production deployments
- File uploads limited to 5MB with MIME type validation
- Admin endpoints include pagination with limit of 500 orders

**Section sources**
- [database.sql:39-43](file://database.sql#L39-L43)
- [server.js:37-45](file://server.js#L37-L45)

## Troubleshooting Guide
Common issues and resolutions:
- PagBank token not configured: returns 500 with token error message
- Invalid or expired PagBank token: returns 401 error
- Missing required fields in payment creation: returns 400 with field presence info
- Database connection errors: surfaced as 500 with debug info
- Webhook failures: server logs error and responds 500
- Admin authentication failures: returns 401 with "Não autenticado"
- Manual payment token not found: returns 404 with "Pedido não encontrado"

Debugging tips:
- Enable logging in development mode
- Verify webhook URL in PagBank dashboard
- Check database connectivity and table existence
- Validate environment variables (PAGBANK_TOKEN, DATABASE_URL)
- Ensure admin credentials match ADMIN_USUARIO and ADMIN_SENHA

**Section sources**
- [server.js:239-279](file://server.js#L239-L279)
- [server.js:285-345](file://server.js#L285-L345)
- [server.js:727-734](file://server.js#L727-L734)
- [PAGAMENTO-README.md:89-97](file://PAGAMENTO-README.md#L89-L97)

## Conclusion
The backend provides a robust payment processing pipeline integrated with PagBank, supporting both immediate and staged payment flows. It includes comprehensive order management, admin controls, and frontend integration points. The addition of manual payment processing and complete administrative interface enhances flexibility for custom payment arrangements. For production, consider adding rate limiting, input sanitization, and monitoring.

## Appendices

### Database Schema
Order table structure and indices for efficient queries.

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
PEDIDOS ||--o{ USUARIOS : "referenced by pedido_id"
```

**Diagram sources**
- [database.sql:13-58](file://database.sql#L13-L58)

**Section sources**
- [database.sql:13-58](file://database.sql#L13-L58)

### API Reference Summary
- POST /api/criar-pagamento: Create PagBank order
- POST /api/webhook/pagbank: Receive PagBank notifications
- GET /api/pedido/:id: Check order status
- GET /api/pedidos: List all orders
- POST /api/manual/criar-pedido: Manual PIX + Card flow
- POST /api/manual/upload-comprovante/:token: Upload PIX proof
- GET /api/manual/pedido/:token: Public order details
- POST /api/admin/login: Admin login
- POST /api/admin/logout: Admin logout
- GET /api/admin/pedidos: Admin order listing
- POST /api/admin/pedido/:id/confirmar-pix: Confirm PIX for manual orders
- POST /api/admin/pedido/:id/enviar-link-cartao: Send card payment link
- POST /api/admin/pedido/:id/confirmar-pagamento: Confirm full payment
- POST /api/admin/pedido/:id/cancelar: Cancel order

**Section sources**
- [server.js:82-280](file://server.js#L82-L280)
- [server.js:285-378](file://server.js#L285-L378)
- [server.js:539-671](file://server.js#L539-L671)
- [server.js:736-890](file://server.js#L736-L890)

### Manual Payment Status Flow
Complete status progression for manual payment orders:

```mermaid
stateDiagram-v2
[*] --> PENDING_PIX : Client creates order
PENDING_PIX --> PIX_ENVIADO : Client uploads PIX proof
PIX_ENVIADO --> PIX_CONFIRMADO_AGUARDA_CARTAO : Admin confirms PIX
PIX_CONFIRMADO_AGUARDA_CARTAO --> LINK_CARTAO_ENVIADO : Admin sends card link
LINK_CARTAO_ENVIADO --> PAID : Client pays card + Admin confirms
PAID --> [*] : Access granted
PENDING_PIX --> CANCELADO : Admin cancels
PIX_ENVIADO --> CANCELADO : Admin cancels
PIX_CONFIRMADO_AGUARDA_CARTAO --> CANCELADO : Admin cancels
LINK_CARTAO_ENVIADO --> CANCELADO : Admin cancels
```

**Diagram sources**
- [migration-manual.sql:30-38](file://migration-manual.sql#L30-L38)