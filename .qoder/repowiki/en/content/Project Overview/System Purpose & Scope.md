# System Purpose & Scope

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [index.html](file://index.html)
- [checkout.html](file://checkout.html)
- [cadastro.html](file://cadastro.html)
- [admin-login.html](file://admin-login.html)
- [pedido-status.html](file://pedido-status.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)
- [init-db.sql](file://init-db.sql)
- [package.json](file://package.json)
- [dados/etiquetas.json](file://dados/etiquetas.json)
- [dados/usuarios.json](file://dados/usuarios.json)
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
QrEtiquetas.com is a QR code-based labeling solution tailored for food and commercial product labeling. It supports internal stock control and external commercial labeling, designed to operate offline on point-of-sale terminals. The system generates QR codes embedded with product metadata to enable quick scanning, verification, and traceability. It integrates a payment and access control flow to unlock the labeling application after purchase, while maintaining a clean separation between the frontend labeling application and the backend payment processing.

Key goals:
- Provide a streamlined labeling workflow for food processors and retail environments.
- Enable internal and external labeling with distinct visual styles and data sets.
- Support offline operation for POS devices and reliable QR code generation.
- Offer a secure, auditable history of generated labels and user access.

## Project Structure
The repository is organized into:
- Frontend application files for labeling, checkout, and administration.
- Backend server for payment processing, order management, and admin controls.
- Database schema and initialization scripts for persistent state.
- Static assets and documentation.

```mermaid
graph TB
subgraph "Frontend"
IDX["index.html"]
CHK["checkout.html"]
CAD["cadastro.html"]
ADL["admin-login.html"]
PST["pedido-status.html"]
PRT["pagamento-retorno.html"]
end
subgraph "Backend"
SRV["server.js"]
DB["database.sql"]
INIT["init-db.sql"]
PKG["package.json"]
end
subgraph "Data"
ETQ["dados/etiquetas.json"]
USR["dados/usuarios.json"]
end
IDX --> CAD
CHK --> SRV
CAD --> SRV
ADL --> SRV
PST --> SRV
PRT --> SRV
SRV --> DB
SRV --> INIT
CAD --> ETQ
CAD --> USR
```

**Diagram sources**
- [index.html](file://index.html)
- [checkout.html](file://checkout.html)
- [cadastro.html](file://cadastro.html)
- [admin-login.html](file://admin-login.html)
- [pedido-status.html](file://pedido-status.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)
- [init-db.sql](file://init-db.sql)
- [package.json](file://package.json)
- [dados/etiquetas.json](file://dados/etiquetas.json)
- [dados/usuarios.json](file://dados/usuarios.json)

**Section sources**
- [README.md](file://README.md)
- [index.html](file://index.html)
- [checkout.html](file://checkout.html)
- [cadastro.html](file://cadastro.html)
- [admin-login.html](file://admin-login.html)
- [pedido-status.html](file://pedido-status.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)
- [init-db.sql](file://init-db.sql)
- [package.json](file://package.json)
- [dados/etiquetas.json](file://dados/etiquetas.json)
- [dados/usuarios.json](file://dados/usuarios.json)

## Core Components
- Labeling Application (Offline-capable)
  - Generates internal (blue) and external (green) labels with QR codes.
  - Supports configurable QR code orientation for thermal printer layouts.
  - Stores label history and user sessions in browser storage.
- Payment and Access Control
  - Checkout with multiple payment methods (à vista, entrada, cartão, manual).
  - Integration with PagBank for PIX and card payments.
  - Admin panel to approve manual payments and manage users.
- Admin Panel
  - Login, user creation/deletion, and configuration management.
  - Order monitoring and status updates.

Target use cases:
- Food processing facilities needing internal stock control labels.
- Retailers requiring commercial labels with pricing, weight, ingredients, and manufacturer data.
- Point-of-sale environments operating offline or with intermittent connectivity.

Benefits:
- Rapid label generation and printing.
- Traceability via QR codes containing product identifiers.
- Reduced administrative overhead with centralized history and reprints.
- Secure access control and audit trail.

**Section sources**
- [README.md](file://README.md)
- [index.html](file://index.html)
- [checkout.html](file://checkout.html)
- [cadastro.html](file://cadastro.html)
- [admin-login.html](file://admin-login.html)
- [pedido-status.html](file://pedido-status.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [server.js](file://server.js)

## Architecture Overview
The system follows a frontend-first architecture with optional backend services:
- Frontend-only labeling app (offline-capable) with QR generation and history.
- Optional backend for payment processing, order management, and admin controls.
- PostgreSQL database for persistent order and user records.

```mermaid
graph TB
Client["Browser Client"]
FE_Label["Frontend Labeling App<br/>cadastro.html"]
FE_Checkout["Frontend Checkout<br/>checkout.html"]
FE_Admin["Frontend Admin Login<br/>admin-login.html"]
BE_Server["Backend Server<br/>server.js"]
DB["PostgreSQL Database<br/>database.sql"]
Client --> FE_Label
Client --> FE_Checkout
Client --> FE_Admin
FE_Checkout --> BE_Server
FE_Admin --> BE_Server
BE_Server --> DB
FE_Label --> DB
```

**Diagram sources**
- [cadastro.html](file://cadastro.html)
- [checkout.html](file://checkout.html)
- [admin-login.html](file://admin-login.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

## Detailed Component Analysis

### Labeling Application (Offline-first)
The labeling application runs entirely in the browser, storing user credentials and label history in LocalStorage. It supports:
- Internal labels (blue) for stock control.
- External labels (green) for commercial sales with pricing, weight, ingredients, and manufacturer.
- QR code generation with configurable orientation (vertical/horizontal) optimized for thermal printers.

```mermaid
sequenceDiagram
participant U as "User"
participant FE as "Frontend App<br/>cadastro.html"
participant QR as "QRious Library"
participant LS as "LocalStorage"
U->>FE : Fill product fields and select type
FE->>FE : Validate inputs
FE->>QR : Generate QR code payload
QR-->>FE : Render QR canvas
FE->>LS : Save label record
FE-->>U : Show preview and print option
```

**Diagram sources**
- [cadastro.html](file://cadastro.html)

**Section sources**
- [README.md](file://README.md)
- [cadastro.html](file://cadastro.html)
- [dados/etiquetas.json](file://dados/etiquetas.json)
- [dados/usuarios.json](file://dados/usuarios.json)

### Payment and Access Control Flow
The checkout flow supports multiple payment methods and integrates with PagBank for PIX and card payments. Manual payments (PIX + Cartão) are supported with admin approval and comprobante upload.

```mermaid
sequenceDiagram
participant C as "Client"
participant CH as "Checkout Page<br/>checkout.html"
participant API as "Backend API<br/>server.js"
participant PG as "PagBank"
participant DB as "PostgreSQL<br/>database.sql"
C->>CH : Select payment method and enter personal info
CH->>API : POST /api/criar-pagamento
API->>PG : Create order and get links
PG-->>API : Return payment links and QR
API->>DB : Persist order
API-->>CH : Return payment data
CH-->>C : Redirect to PagBank or show QR
PG-->>API : Webhook /api/webhook/pagbank
API->>DB : Update order status
API-->>C : Redirect to /pagamento-retorno.html
```

**Diagram sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

**Section sources**
- [checkout.html](file://checkout.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

### Manual Payment Flow (PIX + Cartão)
Manual payments allow clients to split the total cost between PIX and card. The client pays the PIX portion, uploads a comprobante, and the admin confirms and sends the card payment link.

```mermaid
sequenceDiagram
participant C as "Client"
participant PS as "Pedido Status Page<br/>pedido-status.html"
participant API as "Backend API<br/>server.js"
participant DB as "PostgreSQL<br/>database.sql"
C->>PS : Open /pedido/ : token
PS->>API : GET /api/manual/pedido/ : token
API->>DB : Fetch order
DB-->>API : Return order data
API-->>PS : Return sanitized order
PS-->>C : Show PIX payment details
C->>API : POST /api/manual/upload-comprovante/ : token
API->>DB : Update status to PIX_ENVIADO
API-->>C : Confirm receipt
Admin->>API : Approve PIX and send card link
API->>DB : Update status to LINK_CARTAO_ENVIADO
API-->>C : Redirect to card payment
```

**Diagram sources**
- [pedido-status.html](file://pedido-status.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

**Section sources**
- [pedido-status.html](file://pedido-status.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

### Admin Panel
The admin panel allows authorized users to:
- Log in securely.
- Create and delete users.
- Monitor orders and approve manual payments.
- Configure QR code orientation.

```mermaid
flowchart TD
Start(["Admin Login"]) --> Validate["Validate credentials"]
Validate --> |Success| Dashboard["Admin Dashboard"]
Validate --> |Failure| Error["Show error message"]
Dashboard --> ManageUsers["Manage Users"]
Dashboard --> Orders["View Orders"]
Dashboard --> Config["Configure QR Position"]
ManageUsers --> Create["Create User"]
ManageUsers --> Delete["Delete User"]
Orders --> Approve["Approve Manual Payments"]
Orders --> Upload["Upload Comprovante"]
Config --> Save["Save Configuration"]
Create --> End(["Done"])
Delete --> End
Approve --> End
Upload --> End
Save --> End
```

**Diagram sources**
- [admin-login.html](file://admin-login.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

**Section sources**
- [admin-login.html](file://admin-login.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

## Dependency Analysis
- Frontend dependencies
  - QRious library for QR code generation.
  - Font Awesome and Google Fonts for UI.
- Backend dependencies
  - Express for HTTP server.
  - Axios for external API calls (PagBank).
  - PostgreSQL driver (pg) and cookie-parser for session handling.
  - Multer for file uploads (comprobantes).
  - Dotenv for environment configuration.

```mermaid
graph TB
PKG["package.json"]
AX["axios"]
CP["cookie-parser"]
PG["pg"]
MU["multer"]
DN["dotenv"]
EX["express"]
SRV["server.js"]
PKG --> AX
PKG --> CP
PKG --> PG
PKG --> MU
PKG --> DN
PKG --> EX
SRV --> AX
SRV --> CP
SRV --> PG
SRV --> MU
SRV --> DN
SRV --> EX
```

**Diagram sources**
- [package.json](file://package.json)
- [server.js](file://server.js)

**Section sources**
- [package.json](file://package.json)
- [server.js](file://server.js)

## Performance Considerations
- Offline-first design minimizes server reliance for label generation, improving responsiveness on POS devices.
- QR code rendering occurs after DOM updates to avoid blocking UI.
- LocalStorage usage keeps label history fast and accessible locally.
- Backend endpoints batch updates and use efficient queries with indexes on frequently filtered columns.

## Troubleshooting Guide
Common issues and resolutions:
- Payment failures
  - Verify PagBank token and endpoint configuration.
  - Check webhook URL and HTTPS requirements for production.
- Manual payment not progressing
  - Ensure comprobante upload meets size/type constraints.
  - Confirm admin approved PIX and sent card payment link.
- Label preview not appearing
  - Confirm QR code orientation setting matches printer layout.
  - Clear browser cache and retry.
- Admin login errors
  - Validate admin credentials and session cookie settings.

**Section sources**
- [server.js](file://server.js)
- [checkout.html](file://checkout.html)
- [pedido-status.html](file://pedido-status.html)
- [admin-login.html](file://admin-login.html)

## Conclusion
QrEtiquetas.com delivers a practical, offline-first labeling solution for food and commercial products. By combining internal and external labeling with robust QR code traceability and a flexible payment/access control system, it streamlines operations for food processing facilities and retailers. The modular architecture supports both standalone frontend usage and backend-powered payment workflows, enabling scalable deployment across diverse environments.