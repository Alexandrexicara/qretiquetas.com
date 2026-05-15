# User Roles & System Benefits

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [server.js](file://server.js)
- [database.sql](file://database.sql)
- [init-db.sql](file://init-db.sql)
- [checkout.html](file://checkout.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [pedido-status.html](file://pedido-status.html)
- [admin-login.html](file://admin-login.html)
- [admin.html](file://admin.html)
- [cadastro.html](file://cadastro.html)
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
10. [Appendices](#appendices)

## Introduction
This document explains the two user roles (clients and administrators), their permissions and capabilities, and the end-to-end client workflow for registration and label generation. It also outlines administrator responsibilities, system benefits, and security considerations appropriate for a local/enclosed environment.

## Project Structure
The system comprises:
- Frontend pages for client onboarding, checkout, label creation, and admin management
- Backend service exposing REST endpoints for payments, order lifecycle, and admin operations
- PostgreSQL database storing orders and users
- Static assets and local storage for client-side data persistence

```mermaid
graph TB
subgraph "Browser"
A["index.html"]
B["checkout.html"]
C["cadastro.html"]
D["admin-login.html"]
E["admin.html"]
F["pedido-status.html"]
G["pagamento-retorno.html"]
end
subgraph "Server"
S["server.js"]
PG["PostgreSQL"]
end
A --> |Navigate| B
B --> |Create Order| S
S --> |Call| S
S --> PG
S --> |Redirect/Pay| B
B --> |Webhook| S
S --> |Update Orders| PG
C --> |Login/Register| S
S --> |Validate Access| C
D --> |Admin Login| S
S --> |Admin Panel| E
F --> |Manual Flow| S
S --> |Upload/Status| F
G --> |Verify Status| S
```

**Diagram sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)
- [admin.html](file://admin.html)
- [pedido-status.html](file://pedido-status.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)

**Section sources**
- [README.md](file://README.md)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

## Core Components
- Client role
  - Can register, log in, generate labels, view history, and print
  - Has a 7-minute trial period unless paid
- Administrator role
  - Manages users, views orders, updates statuses, and controls access
- Payment and order lifecycle
  - Supports multiple payment methods and a manual flow with PIX and card steps
- Data persistence
  - Client-side: Local storage for users, labels, and configuration
  - Server-side: PostgreSQL for orders and users

**Section sources**
- [README.md](file://README.md)
- [cadastro.html](file://cadastro.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

## Architecture Overview
The system integrates browser-based UI with a backend service and a database. Payments integrate with an external provider for some flows, while a manual flow stores order metadata and requires admin intervention.

```mermaid
sequenceDiagram
participant U as "User"
participant FE as "Frontend Pages"
participant BE as "server.js"
participant DB as "PostgreSQL"
U->>FE : Open checkout.html
FE->>BE : POST /api/criar-pagamento
BE->>BE : Validate inputs
BE->>BE : Create order record
BE-->>FE : {pedido_id, link_pagamento, qr_code_url}
FE->>FE : Redirect to external payment or show QR
BE->>DB : Save order
BE->>BE : Receive webhook /api/webhook/pagbank
BE->>DB : Update order status
BE->>BE : On full payment, create user account
BE-->>FE : Access granted via login
```

**Diagram sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

**Section sources**
- [server.js](file://server.js)
- [checkout.html](file://checkout.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)

## Detailed Component Analysis

### User Roles and Permissions
- Clients
  - Registration and login
  - Generate internal and external labels
  - View and print label history
  - Reimpression and deletion of own labels
  - Trial timer until purchase confirmation
- Administrators
  - Create and delete users
  - Manage order statuses and access
  - Configure QR code orientation
  - Monitor and approve manual payments

```mermaid
classDiagram
class Client {
+register()
+login()
+generateLabel()
+viewHistory()
+printLabels()
+trialTimer()
}
class Admin {
+createUser()
+deleteUser()
+manageOrders()
+configureQR()
}
class System {
+validateRole()
+grantAccess()
+checkPayment()
}
Client --> System : "uses"
Admin --> System : "manages"
```

**Diagram sources**
- [cadastro.html](file://cadastro.html)
- [admin.html](file://admin.html)
- [server.js](file://server.js)

**Section sources**
- [README.md](file://README.md)
- [cadastro.html](file://cadastro.html)
- [admin.html](file://admin.html)

### Client Workflow: Registration to Label Printing
1. Registration
   - Navigate to the registration tab and submit credentials
   - System validates uniqueness and creates a temporary user
2. Login and trial
   - Log in; clients receive a 7-minute trial unless marked paid
   - Online check verifies purchase status
3. Label creation
   - Choose product, lot, expiry, quantity, color, and label type
   - For external labels, enter price, weight, company, CNPJ, ingredients, manufacturer
   - Generate labels and preview
4. Printing
   - Print directly from the browser using the built-in print dialog

```mermaid
flowchart TD
Start(["Open cadastro.html"]) --> Reg["Register or Login"]
Reg --> Paid{"Paid or Trial Active?"}
Paid --> |No| Trial["Show Trial Timer"]
Trial --> Expired{"Trial Expired?"}
Expired --> |Yes| Buy["Redirect to checkout.html"]
Expired --> |No| Ready["Proceed to Labels"]
Paid --> |Yes| Ready
Ready --> Fill["Fill Product/Lot/Expiry/Qty/Color"]
Fill --> Type{"Internal or External?"}
Type --> |Internal| Gen["Generate Labels"]
Type --> |External| Ext["Enter Price/Weight/Company/CNPJ/Ingredients/Fabricante"]
Ext --> Gen
Gen --> Preview["Preview Labels"]
Preview --> Print["Print Labels"]
Print --> End(["Done"])
```

**Diagram sources**
- [cadastro.html](file://cadastro.html)
- [checkout.html](file://checkout.html)

**Section sources**
- [cadastro.html](file://cadastro.html)
- [checkout.html](file://checkout.html)

### Administrator Responsibilities
- User management
  - Create and delete users
  - Assign roles
- System oversight
  - Approve manual payments (PIX receipt, card link, final confirmation)
  - Update order statuses and observations
  - Copy shareable links for clients
- Access control
  - Validate admin sessions via signed cookies
  - Restrict admin endpoints to authorized users

```mermaid
sequenceDiagram
participant A as "Admin"
participant FE as "admin.html"
participant BE as "server.js"
participant DB as "PostgreSQL"
A->>FE : Open admin panel
FE->>BE : POST /api/admin/login
BE-->>FE : Set admin session cookie
A->>FE : Filter orders
FE->>BE : GET /api/admin/pedidos
BE->>DB : Query orders
BE-->>FE : Return orders
A->>FE : Actions (confirm PIX, send card link, confirm payment, cancel)
FE->>BE : POST /api/admin/pedido/ : id/*
BE->>DB : Update order
BE-->>FE : Success
```

**Diagram sources**
- [admin.html](file://admin.html)
- [admin-login.html](file://admin-login.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

**Section sources**
- [admin.html](file://admin.html)
- [admin-login.html](file://admin-login.html)
- [server.js](file://server.js)

### Payment Flows and Label Generation

#### Payment Methods and Order Lifecycle
- Standard payment via external provider
  - Choose payment option (à vista, entrada, cartão)
  - Redirected to external provider or shown QR
  - Webhook updates order status; full payment grants access
- Manual payment (PIX + Card)
  - Client defines PIX and card amounts summing to total
  - Client pays PIX and uploads proof
  - Admin confirms PIX, sends card link, confirms card payment, then grants access

```mermaid
sequenceDiagram
participant C as "Client"
participant FE as "checkout.html"
participant BE as "server.js"
participant DB as "PostgreSQL"
participant R as "External Provider"
C->>FE : Select payment method
FE->>BE : POST /api/criar-pagamento
BE->>DB : Insert order
alt External provider
BE->>R : Create order
R-->>BE : {link, qr}
BE-->>FE : {link, qr}
BE->>BE : Webhook /api/webhook/pagbank
BE->>DB : Update status
else Manual flow
FE->>BE : POST /api/manual/criar-pedido
BE->>DB : Insert order (manual)
BE-->>FE : {token, url_pedido}
C->>FE : Visit /pedido/ : token
FE->>BE : Upload proof
BE->>DB : Update status
Admin->>BE : Confirm PIX, send card link, confirm payment
BE->>DB : Update status
end
```

**Diagram sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)
- [pedido-status.html](file://pedido-status.html)
- [database.sql](file://database.sql)

**Section sources**
- [server.js](file://server.js)
- [checkout.html](file://checkout.html)
- [pedido-status.html](file://pedido-status.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)

#### Label Types: Internal vs External
- Internal labels (blue): stock control
- External labels (green): commercial sale with price, weight, company, CNPJ, ingredients, manufacturer
- QR code includes identifying fields for traceability

```mermaid
flowchart TD
A["Choose Label Type"] --> B{"Internal?"}
B --> |Yes| C["Stock Control Fields<br/>Product, Lot, Expiry"]
B --> |No| D["Commercial Fields<br/>Price, Weight, Company, CNPJ,<br/>Ingredients, Manufacturer"]
C --> E["Generate QR Code"]
D --> E
E --> F["Preview and Print"]
```

**Diagram sources**
- [cadastro.html](file://cadastro.html)

**Section sources**
- [README.md](file://README.md)
- [cadastro.html](file://cadastro.html)

## Dependency Analysis
- Frontend depends on:
  - Local storage for user and label data
  - QRious library for QR generation
- Backend depends on:
  - PostgreSQL for persistent state
  - Environment variables for provider credentials and admin secrets
- External integrations:
  - Payment provider for standard flow
  - File uploads for manual flow receipts

```mermaid
graph LR
FE["Frontend (HTML/JS)"] --> LS["Local Storage"]
FE --> BE["server.js"]
BE --> PG["PostgreSQL"]
BE --> ENV["Environment Variables"]
BE --> EXT["External Payment Provider"]
BE --> FS["File Uploads"]
```

**Diagram sources**
- [server.js](file://server.js)
- [database.sql](file://database.sql)
- [checkout.html](file://checkout.html)

**Section sources**
- [server.js](file://server.js)
- [database.sql](file://database.sql)

## Performance Considerations
- Client-side rendering and printing minimize server load
- QR generation occurs after DOM insertion to avoid blocking
- Admin panel paginates recent orders and refreshes periodically
- Database queries use indexes on email, status, and token for efficient lookups

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Payment issues
  - Verify provider token configuration and network connectivity
  - Check webhook delivery and order status updates
- Access not granted
  - Confirm payment status and that the user account was created
  - For manual flow, ensure PIX proof uploaded and admin confirmed card link sent
- Session problems
  - Admin session uses signed cookies; ensure secure flag matches environment
  - Clear cookies and re-authenticate if unauthorized

**Section sources**
- [server.js](file://server.js)
- [admin.html](file://admin.html)

## Conclusion
The system provides a streamlined solution for label generation with robust role-based access, flexible payment options, and practical admin controls. Clients benefit from quick registration, immediate label generation, and print-ready outputs, while administrators gain oversight and control over access and workflows.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Security Considerations
- Admin session management
  - Signed cookies with expiration and HMAC validation
  - Secure cookie flags in production
- Data protection
  - Client passwords stored in plaintext locally (acceptable for closed environments)
  - Sensitive configuration via environment variables
- Access control
  - Admin endpoints require valid session
  - Client access gated by trial/purchase checks

**Section sources**
- [server.js](file://server.js)
- [admin.html](file://admin.html)
- [README.md](file://README.md)

### System Benefits
- Improved inventory tracking via internal labels
- Product traceability with QR codes containing identifiers
- Reduced manual paperwork with digital labels
- Streamlined label production with print-ready layouts

**Section sources**
- [README.md](file://README.md)
- [cadastro.html](file://cadastro.html)