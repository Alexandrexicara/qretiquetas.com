# Technical Architecture Overview

<cite>
**Referenced Files in This Document**
- [server.js](file://server.js)
- [package.json](file://package.json)
- [index.html](file://index.html)
- [checkout.html](file://checkout.html)
- [cadastro.html](file://cadastro.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [admin.html](file://admin.html)
- [admin-login.html](file://admin-login.html)
- [pedido-status.html](file://pedido-status.html)
- [README.md](file://README.md)
- [PAGAMENTO-README.md](file://PAGAMENTO-README.md)
- [database.sql](file://database.sql)
- [init-db.sql](file://init-db.sql)
- [migration-manual.sql](file://migration-manual.sql)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for the dual payment processing architecture
- Documented the new administrative panel system with real-time order monitoring
- Updated payment flow orchestration to support both PagBank integration and manual payment handling
- Enhanced database schema documentation with manual payment flow support
- Added administrative endpoints and real-time monitoring capabilities

## Table of Contents
1. [Introduction](#introduction)
2. [System Architecture Overview](#system-architecture-overview)
3. [Hybrid Architecture Design](#hybrid-architecture-design)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Dual Payment Processing System](#dual-payment-processing-system)
7. [Administrative Panel System](#administrative-panel-system)
8. [Data Flow Patterns](#data-flow-patterns)
9. [Security Model](#security-model)
10. [Browser Compatibility](#browser-compatibility)
11. [Integration Points](#integration-points)
12. [Offline Operation](#offline-operation)
13. [Performance Considerations](#performance-considerations)
14. [Troubleshooting Guide](#troubleshooting-guide)
15. [Conclusion](#conclusion)

## Introduction

The qretiquetas.com system is a sophisticated hybrid architecture solution designed for the Alimentares/Kali point-of-sale environment, combining a pure frontend labeling system with a Node.js/Express backend payment processing system. This architecture enables offline operation after initial load while maintaining robust dual payment processing capabilities through both automated PagBank integration and manual payment handling.

The system serves two distinct but integrated domains: the labeling system (purely frontend) and the payment system (backend API), each with specific responsibilities and security considerations tailored for the retail POS environment. The recent enhancement introduces a comprehensive administrative panel system with real-time order monitoring capabilities, enabling seamless management of both automated and manual payment flows.

## System Architecture Overview

The system follows a hybrid architecture pattern that separates concerns between labeling functionality and dual payment processing systems:

```mermaid
graph TB
subgraph "Client-Side Layer"
A[index.html - Landing Page]
B[cadastro.html - Labeling System]
C[checkout.html - Payment Interface]
D[pagamento-retorno.html - Payment Status]
E[admin.html - Admin Panel]
F[admin-login.html - Admin Authentication]
G[pedido-status.html - Customer Order Status]
end
subgraph "CDN Dependencies"
H[QRious Library CDN]
I[Font Awesome CDN]
J[Google Fonts CDN]
end
subgraph "Server-Side Layer"
K[Express Server]
L[PagBank API]
M[PostgreSQL Database]
N[Administrative Panel]
O[Real-time Monitoring]
end
subgraph "External Services"
P[Alimentares/Kali POS]
Q[Payment Providers]
R[Admin Authentication]
end
A --> K
B --> K
C --> K
D --> K
E --> K
F --> K
G --> K
B --> H
C --> H
D --> H
E --> I
K --> L
K --> M
K --> N
K --> O
K --> P
K --> Q
K --> R
```

**Diagram sources**
- [server.js:1-914](file://server.js#L1-L914)
- [checkout.html:1-768](file://checkout.html#L1-L768)
- [admin.html:1-304](file://admin.html#L1-L304)
- [pedido-status.html:1-341](file://pedido-status.html#L1-L341)

The architecture consists of five primary layers:

1. **Static Frontend Layer**: Pure HTML/CSS/JavaScript applications served statically
2. **CDN Dependencies Layer**: External libraries loaded via Content Delivery Networks
3. **Node.js Backend Layer**: Express server handling dual payment processing and data persistence
4. **Administrative Panel Layer**: Real-time order monitoring and management system
5. **External Integration Layer**: Payment providers and POS system integrations

## Hybrid Architecture Design

The system employs a strategic separation between labeling and dual payment functionalities:

### Labeling System (Pure Frontend)
- **Location**: [cadastro.html](file://cadastro.html)
- **Technology**: Static HTML with localStorage persistence
- **Operation**: 100% offline capable after initial load
- **Purpose**: Product labeling, QR code generation, and inventory management

### Dual Payment System (Backend API)
- **Location**: [server.js](file://server.js)
- **Technology**: Node.js/Express with PostgreSQL
- **Operation**: Online payment processing with webhook support and administrative oversight
- **Purpose**: Dual payment orchestration, order management, and access control

```mermaid
flowchart TD
Start([User Access]) --> CheckMode{"Payment Required?"}
CheckMode --> |No| Labeling["Labeling System<br/>Pure Frontend"]
CheckMode --> |Yes| PaymentChoice{"Select Payment Method"}
PaymentChoice --> |Automated| PagBank["PagBank Integration<br/>Automatic Processing"]
PaymentChoice --> |Manual| ManualFlow["Manual Payment Flow<br/>Admin Oversight"]
Labeling --> Offline["Offline Operation<br/>localStorage"]
PagBank --> Online["Online Processing<br/>External APIs"]
ManualFlow --> AdminPanel["Admin Panel<br/>Real-time Monitoring"]
Online --> OrderCreate["Order Creation<br/>Database Storage"]
AdminPanel --> OrderManagement["Order Management<br/>Manual Verification"]
OrderCreate --> Webhook["Webhook Processing<br/>Status Updates"]
AdminPanel --> CustomerStatus["Customer Status Page<br/>Real-time Updates"]
Webhook --> Access["Access Control<br/>User Management"]
CustomerStatus --> Access
```

**Diagram sources**
- [cadastro.html:750-1277](file://cadastro.html#L750-L1277)
- [server.js:82-914](file://server.js#L82-L914)
- [checkout.html:626-768](file://checkout.html#L626-L768)

## Frontend Architecture

### Static HTML/CSS/JavaScript Structure

The frontend architecture utilizes pure static files with minimal dependencies:

```mermaid
classDiagram
class StaticPages {
+index.html
+checkout.html
+pagamento-retorno.html
+cadastro.html
+admin.html
+admin-login.html
+pedido-status.html
+CSS Stylesheets
+JavaScript Modules
}
class CDNLibraries {
+qrious.min.js
+font-awesome
+google-fonts
}
class DataManager {
+getUsers()
+saveUsers()
+getLabels()
+saveLabels()
+addLabel()
+deleteLabel()
+getConfig()
+saveConfig()
}
class Authentication {
+login()
+register()
+logout()
+currentUser
}
class AdminPanel {
+login()
+logout()
+monitorOrders()
+managePayments()
}
StaticPages --> CDNLibraries : "uses"
StaticPages --> DataManager : "manages"
StaticPages --> Authentication : "handles"
AdminPanel --> DataManager : "manages"
```

**Diagram sources**
- [cadastro.html:808-873](file://cadastro.html#L808-L873)
- [checkout.html:626-768](file://checkout.html#L626-L768)
- [admin.html:110-304](file://admin.html#L110-L304)

### Client-Side Data Persistence

The system implements a dual-storage strategy:

| Storage Type | Purpose | Data Examples | Persistence |
|--------------|---------|---------------|-------------|
| **localStorage** | Application state and user data | `alimentares_users`, `alimentares_labels`, `alimentares_config` | Browser session |
| **sessionStorage** | Current user session | `alimentares_currentUser` | Session duration |

### CDN Integration Strategy

External libraries are loaded via CDN for optimal performance and reliability:

- **QRious Library**: [https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js](https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js)
- **Font Awesome**: [https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css)
- **Google Fonts**: [https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap](https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap)

**Section sources**
- [cadastro.html:808-873](file://cadastro.html#L808-L873)
- [checkout.html:626-768](file://checkout.html#L626-L768)
- [README.md:95-122](file://README.md#L95-L122)

## Backend Architecture

### Express Server Configuration

The backend server provides RESTful APIs for dual payment processing and administrative functions:

```mermaid
sequenceDiagram
participant Client as "Client Browser"
participant Server as "Express Server"
participant Database as "PostgreSQL"
participant PagBank as "PagBank API"
participant AdminPanel as "Admin Panel"
Client->>Server : POST /api/criar-pagamento
Server->>PagBank : Create Payment Order
PagBank-->>Server : Payment Details
Server->>Database : Save Order Record
Database-->>Server : Confirmation
Server-->>Client : Payment Link/QR Code
Note over Client,PagBank : Automated Payment Flow
Client->>Server : POST /api/manual/criar-pedido
Server->>Database : Save Manual Order
Server-->>Client : Order Token/URL
Note over Client,AdminPanel : Manual Payment Flow
AdminPanel->>Server : POST /api/admin/pedido/ : id/confirmar-pix
Server->>Database : Update Order Status
Server->>Client : Order Status Update
```

**Diagram sources**
- [server.js:82-280](file://server.js#L82-L280)
- [server.js:540-617](file://server.js#L540-L617)
- [server.js:805-890](file://server.js#L805-L890)

### Dual Payment Processing Endpoints

The backend exposes comprehensive endpoints for both payment methods:

#### Automated Payment Endpoints
| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/criar-pagamento` | POST | Create payment order with PagBank | None |
| `/api/webhook/pagbank` | POST | Receive payment notifications | None |
| `/api/pedido/:id` | GET | Check payment status | None |
| `/api/pedidos` | GET | List all orders | Admin Required |

#### Manual Payment Endpoints
| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/manual/criar-pedido` | POST | Create manual payment order | None |
| `/api/manual/upload-comprovante/:token` | POST | Upload PIX receipt | None |
| `/api/manual/pedido/:token` | GET | Get order details for customer | None |
| `/pedido/:token` | GET | Customer order status page | None |

#### Administrative Endpoints
| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/admin/login` | POST | Admin authentication | None |
| `/api/admin/logout` | POST | Admin logout | None |
| `/api/admin/pedidos` | GET | Admin order management | Admin Required |
| `/api/admin/pedido/:id/confirmar-pix` | POST | Confirm PIX received | Admin Required |
| `/api/admin/pedido/:id/enviar-link-cartao` | POST | Send credit card link | Admin Required |
| `/api/admin/pedido/:id/confirmar-pagamento` | POST | Confirm total payment | Admin Required |
| `/api/admin/pedido/:id/cancelar` | POST | Cancel order | Admin Required |

### Database Schema

The PostgreSQL database maintains comprehensive tables with enhanced support for manual payment flows:

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
varchar pedido_id FK
timestamp criado_em
timestamp liberado_em
}
PEDIDOS ||--o{ USUARIOS : "relates_to"
```

**Manual Payment Flow Enhancements:**
- **tipo_fluxo**: 'pagbank' or 'manual' - distinguishes payment methods
- **valor_pix**: Separate PIX amount allocation
- **valor_cartao**: Separate credit card amount allocation
- **pix_pago**: PIX payment confirmation flag
- **comprovante_pix_path**: Uploaded receipt storage
- **link_cartao_admin**: Admin-generated credit card payment link
- **observacoes_admin**: Admin notes for customer visibility
- **token_acesso**: Unique token for customer order tracking

**Diagram sources**
- [database.sql:13-58](file://database.sql#L13-L58)
- [migration-manual.sql:9-39](file://migration-manual.sql#L9-L39)

**Section sources**
- [server.js:82-914](file://server.js#L82-L914)
- [database.sql:13-58](file://database.sql#L13-L58)
- [migration-manual.sql:9-39](file://migration-manual.sql#L9-L39)

## Dual Payment Processing System

### Automated Payment Flow (PagBank Integration)

The automated payment system handles direct integration with PagBank for seamless payment processing:

```mermaid
flowchart TD
Start([Automated Payment Request]) --> ValidateData["Validate Customer Data"]
ValidateData --> CreateOrder["Create PagBank Order"]
CreateOrder --> SendToPagBank["Send to PagBank API"]
SendToPagBank --> RedirectCustomer["Redirect to PagBank"]
RedirectCustomer --> CustomerPays["Customer Completes Payment"]
CustomerPays --> PagBankWebhook["PagBank Webhook Notification"]
PagBankWebhook --> UpdateStatus["Update Order Status"]
UpdateStatus --> AutoAccess["Auto-release Access"]
AutoAccess --> Complete([Payment Complete])
```

**Diagram sources**
- [server.js:82-280](file://server.js#L82-L280)
- [checkout.html:674-718](file://checkout.html#L674-L718)

### Manual Payment Flow (Admin Oversight)

The manual payment system provides comprehensive admin oversight for complex payment arrangements:

```mermaid
flowchart TD
Start([Manual Payment Request]) --> ValidateManualData["Validate Manual Payment Data"]
ValidateManualData --> SplitAmount["Validate Amount Split (R$ 6.000,00)"]
SplitAmount --> CreateManualOrder["Create Manual Order"]
CreateManualOrder --> GenerateToken["Generate Unique Token"]
GenerateToken --> SendToCustomer["Send Customer Link"]
SendToCustomer --> CustomerPaysPIX["Customer Pays PIX"]
CustomerPaysPIX --> UploadReceipt["Customer Uploads Receipt"]
UploadReceipt --> AdminReview["Admin Reviews Receipt"]
AdminReview --> ConfirmPIX["Admin Confirms PIX"]
ConfirmPIX --> SendCardLink["Admin Sends Credit Card Link"]
SendCardLink --> CustomerPaysCard["Customer Pays Credit Card"]
CustomerPaysCard --> AdminConfirm["Admin Confirms Total Payment"]
AdminConfirm --> ManualAccess["Manual Access Release"]
ManualAccess --> Complete([Payment Complete])
```

**Diagram sources**
- [server.js:540-617](file://server.js#L540-L617)
- [server.js:805-890](file://server.js#L805-L890)
- [pedido-status.html:172-338](file://pedido-status.html#L172-L338)

### Payment Method Orchestration

The system intelligently orchestrates between payment methods based on customer selection:

```mermaid
flowchart TD
CustomerSelection["Customer Payment Selection"] --> CheckMethod{"Payment Method"}
CheckMethod --> |'avista'/'cartao'| AutomatedFlow["Automated Flow"]
CheckMethod --> |'manual'| ManualFlow["Manual Flow"]
CheckMethod --> |'parcelado'| ParceladoFlow["Parcelado Flow"]
AutomatedFlow --> PagBankAPI["PagBank API Integration"]
ManualFlow --> ManualAPI["Manual Payment API"]
ParceladoFlow --> ParceladoAPI["Parcelado API"]
PagBankAPI --> StatusMonitoring["Real-time Status Monitoring"]
ManualAPI --> AdminPanel["Admin Panel Monitoring"]
ParceladoAPI --> StatusMonitoring
StatusMonitoring --> AccessControl["Access Control Logic"]
AdminPanel --> AccessControl
AccessControl --> UserAccess["User Access Granted"]
```

**Diagram sources**
- [checkout.html:645-672](file://checkout.html#L645-L672)
- [server.js:98-113](file://server.js#L98-L113)

**Section sources**
- [checkout.html:626-768](file://checkout.html#L626-L768)
- [server.js:82-345](file://server.js#L82-L345)
- [server.js:540-617](file://server.js#L540-L617)

## Administrative Panel System

### Admin Panel Architecture

The administrative panel provides comprehensive real-time monitoring and management capabilities:

```mermaid
sequenceDiagram
participant Admin as "Admin User"
participant AdminPanel as "Admin Panel"
participant Server as "Express Server"
participant Database as "PostgreSQL"
Admin->>AdminPanel : Login
AdminPanel->>Server : POST /api/admin/login
Server->>Database : Validate Credentials
Database-->>Server : Success/Failure
Server-->>AdminPanel : Session Token
AdminPanel->>Server : GET /api/admin/pedidos
Server->>Database : Query Orders
Database-->>Server : Orders List
Server-->>AdminPanel : Orders Data
AdminPanel->>Admin : Display Orders
Admin->>AdminPanel : Action (Confirm, Cancel, etc.)
AdminPanel->>Server : POST /api/admin/pedido/ : id/action
Server->>Database : Update Order
Database-->>Server : Confirmation
Server-->>AdminPanel : Success
AdminPanel->>Admin : Update Display
```

**Diagram sources**
- [admin.html:137-304](file://admin.html#L137-L304)
- [server.js:737-760](file://server.js#L737-L760)
- [server.js:763-802](file://server.js#L763-L802)

### Real-time Order Monitoring

The admin panel features sophisticated real-time monitoring capabilities:

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Live Updates** | Automatic order status refresh every 30 seconds | JavaScript setInterval |
| **Status Filtering** | Filter orders by status (Pending, Paid, Cancelled) | Dynamic filtering buttons |
| **Real-time Alerts** | Visual indicators for urgent orders | Color-coded badges |
| **Bulk Actions** | Mass operations on multiple orders | Checkbox selection |
| **Order Analytics** | Summary statistics and revenue tracking | Dynamic calculations |

### Administrative Functions

The admin panel provides comprehensive order management capabilities:

```mermaid
flowchart TD
AdminPanel["Admin Panel"] --> OrderList["Order List View"]
OrderList --> StatusFilter["Status Filter"]
OrderList --> ActionButtons["Action Buttons"]
ActionButtons --> ConfirmPIX["Confirm PIX"]
ActionButtons --> SendCardLink["Send Card Link"]
ActionButtons --> ConfirmPayment["Confirm Total Payment"]
ActionButtons --> CancelOrder["Cancel Order"]
ActionButtons --> CopyLink["Copy Customer Link"]
ConfirmPIX --> UpdateDatabase["Update Database"]
SendCardLink --> UpdateDatabase
ConfirmPayment --> UpdateDatabase
CancelOrder --> UpdateDatabase
CopyLink --> Clipboard["Copy to Clipboard"]
UpdateDatabase --> RefreshDisplay["Refresh Display"]
RefreshDisplay --> AdminPanel
```

**Diagram sources**
- [admin.html:181-250](file://admin.html#L181-L250)
- [server.js:805-890](file://server.js#L805-L890)

**Section sources**
- [admin.html:1-304](file://admin.html#L1-L304)
- [admin-login.html:1-81](file://admin-login.html#L1-L81)
- [server.js:703-914](file://server.js#L703-L914)

## Data Flow Patterns

### Enhanced Payment Processing Workflow

The system implements sophisticated dual payment flow supporting multiple payment methods:

```mermaid
flowchart TD
Start([Payment Initiated]) --> Method{"Select Payment Method"}
Method --> Avista["À Vista<br/>Direct PIX Payment"]
Method --> Entrada["Entrada<br/>Partial Payment (PIX)"]
Method --> Cartao["Cartão<br/>Credit Card Payment"]
Method --> Manual["Manual<br/>PIX + Cartão Combination"]
Method --> Parcelado["Parcelado<br/>Two-stage Payment"]
Avista --> CreateOrder["Create Order in Database"]
Entrada --> CreateOrder
Cartao --> CreateOrder
Manual --> CreateManualOrder["Create Manual Order"]
Parcelado --> CreateOrder
CreateOrder --> SendToPagBank["Send to PagBank API"]
CreateManualOrder --> GenerateToken["Generate Customer Token"]
GenerateToken --> SendToCustomer["Send Customer Link"]
SendToPagBank --> WaitPayment["Wait for Payment"]
WaitPayment --> PagBankWebhook["Receive Webhook"]
PagBankWebhook --> UpdateStatus["Update Order Status"]
UpdateStatus --> AutoAccess["Auto-release Access"]
SendToCustomer --> CustomerPays["Customer Pays"]
CustomerPays --> UploadReceipt["Customer Uploads Receipt"]
UploadReceipt --> AdminReview["Admin Reviews Receipt"]
AdminReview --> ConfirmPIX["Admin Confirms PIX"]
ConfirmPIX --> SendCardLink["Admin Sends Card Link"]
SendCardLink --> CustomerPaysCard["Customer Pays Card"]
CustomerPaysCard --> AdminConfirm["Admin Confirms Total"]
AdminConfirm --> ManualAccess["Manual Access Release"]
AutoAccess --> Complete([Payment Complete])
ManualAccess --> Complete
```

**Diagram sources**
- [server.js:82-345](file://server.js#L82-L345)
- [server.js:540-617](file://server.js#L540-L617)
- [checkout.html:626-768](file://checkout.html#L626-L768)

### Label Generation Process

The labeling system operates independently with its own data flow:

```mermaid
sequenceDiagram
participant User as "User"
participant UI as "Labeling Interface"
participant Data as "DataManager"
participant Storage as "localStorage"
participant QR as "QRious Library"
User->>UI : Fill Label Form
UI->>Data : Validate Input
Data->>Storage : Save Label Data
Storage-->>Data : Confirm Save
Data->>QR : Generate QR Code
QR-->>UI : Display Preview
UI-->>User : Show Generated Labels
Note over User,QR : 100% Offline Operation
```

**Diagram sources**
- [cadastro.html:1136-1244](file://cadastro.html#L1136-L1244)

**Section sources**
- [checkout.html:626-768](file://checkout.html#L626-L768)
- [server.js:82-345](file://server.js#L82-L345)
- [cadastro.html:1136-1244](file://cadastro.html#L1136-L1244)

## Security Model

### Client-Side Security

The frontend implements several security measures:

```mermaid
graph LR
subgraph "Client-Side Security"
A[Input Validation]
B[Output Encoding]
C[Session Management]
D[Local Storage Security]
E[Admin Authentication]
end
subgraph "Data Protection"
F[Username/Password]
G[Session Tokens]
H[QR Data Encryption]
I[Admin Session Cookies]
end
A --> B
B --> C
C --> D
D --> F
E --> I
F --> G
G --> H
I --> J[Cookie Security]
J --> K[HttpOnly, SameSite, Secure]
```

**Security Measures:**
- **Input Validation**: All user inputs are validated before processing
- **Output Encoding**: Prevents XSS attacks through HTML escaping
- **Session Management**: Uses sessionStorage for temporary user sessions
- **Local Storage Security**: Data stored locally with basic protection
- **Admin Session Security**: HttpOnly cookies with HMAC signature verification

### Server-Side Security

The backend implements comprehensive security controls:

| Security Aspect | Implementation | Purpose |
|----------------|----------------|---------|
| **CORS Policy** | Enabled for cross-origin requests | API accessibility |
| **Cookie Security** | HttpOnly, SameSite, Secure flags | Admin session protection |
| **Database Security** | Connection pooling, prepared statements | SQL injection prevention |
| **API Security** | Environment variable configuration | Sensitive data protection |
| **Admin Authentication** | HMAC-signed session tokens | Session integrity |
| **File Upload Security** | MIME type validation, size limits | Malicious file prevention |

### Authentication Flow

```mermaid
sequenceDiagram
participant Admin as "Admin User"
participant Server as "Express Server"
participant Cookie as "HTTP Cookie"
participant Database as "PostgreSQL"
Admin->>Server : POST /api/admin/login
Server->>Server : Validate Credentials
Server->>Cookie : Create Signed Session
Cookie-->>Server : Store Session
Server->>Database : Log Login Attempt
Database-->>Server : Confirmation
Server-->>Admin : Success Response
Note over Admin,Database : Session Validated Until Expiration
```

**Diagram sources**
- [server.js:737-760](file://server.js#L737-L760)

**Section sources**
- [server.js:15-27](file://server.js#L15-L27)
- [server.js:737-760](file://server.js#L737-L760)
- [README.md:117-122](file://README.md#L117-L122)

## Browser Compatibility

The system maintains broad browser compatibility while optimizing for modern environments:

### Supported Browsers

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| **Chrome** | Latest | ✅ Fully Compatible | Recommended |
| **Firefox** | Latest | ✅ Fully Compatible | Excellent |
| **Safari** | Latest | ✅ Fully Compatible | Good |
| **Edge** | Latest | ✅ Fully Compatible | Recommended |
| **Mobile Browsers** | Latest | ✅ Compatible | Responsive design |

### Offline Capability

The system achieves 100% offline operation after initial load:

```mermaid
flowchart TD
FirstLoad["Initial Page Load"] --> DownloadCDN["Download CDN Libraries"]
DownloadCDN --> StoreData["Store Data Locally"]
StoreData --> OfflineMode["Enter Offline Mode"]
OfflineMode --> QRGeneration["Generate QR Codes"]
OfflineMode --> LabelManagement["Manage Labels"]
OfflineMode --> UserManagement["User Operations"]
QRGeneration --> PrintLabels["Print Labels"]
LabelManagement --> PrintLabels
UserManagement --> PrintLabels
PrintLabels --> POSIntegration["POS System Integration"]
```

**Diagram sources**
- [README.md:107-114](file://README.md#L107-L114)

**Section sources**
- [README.md:107-114](file://README.md#L107-L114)

## Integration Points

### Alimentares/Kali POS Integration

The system integrates seamlessly with the Alimentares/Kali point-of-sale environment:

```mermaid
graph TB
subgraph "POS Environment"
A[Kali Terminal]
B[POS Software]
C[Printer Interface]
end
subgraph "System Integration"
D[Label Generation]
E[QR Code Printing]
F[Data Export]
end
subgraph "External Systems"
G[Payment Processing]
H[User Management]
I[Inventory Tracking]
J[Admin Panel]
K[Real-time Monitoring]
end
A --> D
B --> E
C --> F
D --> G
E --> H
F --> I
G --> A
H --> B
I --> C
J --> G
K --> J
```

### Payment Provider Integration

The system integrates with multiple payment providers through dual architecture:

- **PagBank API**: Primary automated payment processor
- **PIX Integration**: Instant payment processing with webhook notifications
- **Credit Card Processing**: Installment payment options with admin oversight
- **Manual Payment Flow**: Admin-controlled payment coordination
- **Webhook Notifications**: Real-time payment status updates for both methods

### External Service Dependencies

| Service | Purpose | Integration Method |
|---------|---------|-------------------|
| **CDN Libraries** | QR Code generation, icons, fonts | Static asset loading |
| **PagBank API** | Automated payment processing | RESTful API calls |
| **PostgreSQL** | Data persistence | Connection pooling |
| **Render Platform** | Hosting | Platform-as-a-Service |
| **Admin Panel** | Order monitoring | Real-time WebSocket |

**Section sources**
- [PAGAMENTO-README.md:69-97](file://PAGAMENTO-README.md#L69-L97)
- [README.md:3](file://README.md#L3)

## Offline Operation

### Architecture for Offline Capability

The system achieves offline functionality through strategic design decisions:

```mermaid
flowchart TD
Architecture["Offline Architecture"] --> StaticFiles["Static HTML/CSS/JS"]
Architecture --> CDNLibraries["CDN Dependencies"]
Architecture --> LocalStorage["Local Data Storage"]
StaticFiles --> NoNetwork["No Network Required"]
CDNLibraries --> CachedAssets["Cached Assets"]
LocalStorage --> PersistentData["Persistent Data"]
NoNetwork --> QRGeneration["QR Code Generation"]
CachedAssets --> QRGeneration
PersistentData --> QRGeneration
QRGeneration --> LabelPrinting["Label Printing"]
LabelPrinting --> POSIntegration["POS Integration"]
```

### Data Persistence Strategy

The system implements a comprehensive data persistence strategy:

| Data Category | Storage Method | Purpose | Recovery |
|---------------|----------------|---------|----------|
| **User Accounts** | localStorage | User credentials and profiles | Browser reset |
| **Label History** | localStorage | Generated label records | Browser reset |
| **Application Config** | localStorage | System preferences | Browser reset |
| **Active Sessions** | sessionStorage | Current user session | Tab close |
| **Payment Records** | PostgreSQL | Payment history and status | Server backup |
| **Manual Payment Data** | PostgreSQL | Manual payment flows | Server backup |

### Offline Features

The labeling system operates completely offline:

- **QR Code Generation**: Utilizes CDN-hosted QRious library
- **Label Management**: All operations performed locally
- **Print Functionality**: Direct browser printing interface
- **Data Export**: Local storage export capabilities

**Section sources**
- [README.md:49](file://README.md#L49)
- [README.md:107-114](file://README.md#L107-L114)

## Performance Considerations

### Frontend Performance

The client-side architecture prioritizes performance through:

- **Static Asset Loading**: CDN delivery for external libraries
- **Minimal Dependencies**: Only essential libraries loaded
- **Efficient DOM Manipulation**: Optimized for label generation
- **Responsive Design**: Mobile-first approach
- **Real-time Updates**: Efficient polling for admin panel

### Backend Performance

The server-side implementation focuses on:

- **Connection Pooling**: Efficient database connections
- **Caching Strategies**: Response caching for static content
- **Error Handling**: Graceful degradation and recovery
- **Resource Management**: Proper cleanup and memory management
- **Admin Panel Optimization**: Efficient order querying and filtering

### Scalability Considerations

The system is designed for horizontal scaling:

- **Stateless Design**: Minimal server-side state
- **Database Optimization**: Indexes and query optimization
- **CDN Distribution**: Global content delivery
- **Microservice Ready**: Modular architecture for future expansion
- **Real-time Monitoring**: Efficient admin panel updates

## Troubleshooting Guide

### Common Issues and Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Payment Failures** | Error messages, failed webhook | Check PagBank credentials, verify webhook URL |
| **QR Code Generation** | Blank QR codes, errors | Verify CDN connectivity, check browser console |
| **Offline Mode Problems** | Labels not generating, data loss | Clear browser cache, check localStorage quota |
| **Admin Login Issues** | Cannot access admin panel | Verify credentials, check cookie settings |
| **Database Connection** | Server errors, connection timeouts | Verify PostgreSQL configuration, check network |
| **Manual Payment Issues** | Orders stuck in PENDING_PIX | Check admin panel for receipt uploads |
| **Admin Panel Not Updating** | Stale order information | Check browser console for JavaScript errors |

### Debugging Tools

The system includes built-in debugging capabilities:

- **Console Logging**: Extensive logging for payment processing
- **Error Handling**: Comprehensive error reporting
- **Status Monitoring**: Real-time payment status checking
- **Development Mode**: Enhanced logging for development
- **Admin Panel Logs**: Order action audit trails

### Maintenance Procedures

Regular maintenance tasks include:

- **Database Cleanup**: Regular pruning of old records
- **Library Updates**: Periodic CDN library updates
- **Security Audits**: Regular credential rotation
- **Performance Monitoring**: System health checks
- **Admin Panel Updates**: Real-time monitoring optimization

**Section sources**
- [server.js:239-280](file://server.js#L239-L280)
- [checkout.html:711-718](file://checkout.html#L711-L718)

## Conclusion

The qretiquetas.com system represents a sophisticated hybrid architecture that successfully balances offline functionality with robust dual payment processing capabilities. The recent enhancement introduces comprehensive administrative oversight with real-time order monitoring, creating a complete payment ecosystem that serves both automated and manual payment scenarios.

Key architectural strengths include:

- **Modular Design**: Clear separation of concerns between labeling and dual payment systems
- **Offline Capability**: 100% offline operation for labeling functionality
- **Dual Payment Architecture**: Seamless integration of automated PagBank and manual payment flows
- **Administrative Excellence**: Real-time order monitoring and comprehensive admin panel
- **Scalable Backend**: Express server with PostgreSQL for payment processing
- **POS Integration**: Seamless integration with Alimentares/Kali point-of-sale environment
- **Security Model**: Multi-layered security approach for both client and server sides

The system's architecture provides an excellent foundation for future enhancements while maintaining reliability and performance in the demanding retail POS environment. The dual payment processing approach ensures that critical labeling functionality remains available even during network outages, while payment processing continues to leverage external payment providers for secure transaction handling. The administrative panel system adds crucial business intelligence and operational control, making the system suitable for enterprise-level deployment in the Alimentares/Kali POS environment.