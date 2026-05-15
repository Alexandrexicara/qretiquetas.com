# Payment System Architecture

<cite>
**Referenced Files in This Document**
- [server.js](file://server.js)
- [package.json](file://package.json)
- [checkout.html](file://checkout.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [database.sql](file://database.sql)
- [init-db.sql](file://init-db.sql)
- [PAGAMENTO-README.md](file://PAGAMENTO-README.md)
- [index.html](file://index.html)
- [cadastro.html](file://cadastro.html)
- [admin.html](file://admin.html)
- [admin-login.html](file://admin-login.html)
- [pedido-status.html](file://pedido-status.html)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for the new dual payment flow system
- Documented the manual payment flow with PIX + Cartão combination
- Added documentation for new payment states (PENDING_PIX, PIX_ENVIADO, PIX_CONFIRMADO_AGUARDA_CARTAO, LINK_CARTAO_ENVIADO, PAID, CANCELADO)
- Updated architecture diagrams to reflect the new administrative oversight features
- Enhanced webhook processing documentation with manual flow integration
- Added administrative panel documentation with real-time order management capabilities

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dual Payment Flow System](#dual-payment-flow-system)
7. [Administrative Oversight Features](#administrative-oversight-features)
8. [Dependency Analysis](#dependency-analysis)
9. [Performance Considerations](#performance-considerations)
10. [Security Considerations](#security-considerations)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Conclusion](#conclusion)

## Introduction

This document provides comprehensive payment system documentation for the PagBank integration within the Alimentares QR code labeling system. The payment system enables customers to purchase access to the labeling software through secure payment processing with real-time status updates and automated order management.

**Updated** The system now supports a dual payment flow system with both automated PagBank processing and manual payment handling, featuring administrative oversight for complex payment arrangements including PIX + Cartão combinations.

The system integrates PagBank's payment infrastructure to handle both single-payment and installment payment scenarios, providing a seamless checkout experience with immediate access activation upon successful payment confirmation. The new dual flow system supports flexible payment arrangements where customers can split payments between PIX and credit card with administrative approval.

## Project Structure

The payment system consists of several key components working together to provide a complete payment solution with dual processing capabilities:

```mermaid
graph TB
subgraph "Frontend Layer"
A[index.html] --> B[checkout.html]
B --> C[pagamento-retorno.html]
C --> D[cadastro.html]
E[pedido-status.html] --> F[admin.html]
G[admin-login.html] --> F
end
subgraph "Backend Layer"
H[server.js] --> I[Express Server]
I --> J[PagBank API]
I --> K[PostgreSQL Database]
I --> L[Administrative Panel]
end
subgraph "External Services"
M[Ngrok] --> N[Webhook Endpoint]
O[PagBank Dashboard] --> N
P[Administrative Interface] --> L
end
B --> H
C --> H
E --> H
F --> H
H --> K
J --> H
L --> H
```

**Diagram sources**
- [server.js:12-914](file://server.js#L12-L914)
- [checkout.html:1-768](file://checkout.html#L1-L768)
- [pagamento-retorno.html:1-156](file://pagamento-retorno.html#L1-L156)
- [admin.html:1-304](file://admin.html#L1-L304)
- [pedido-status.html:1-341](file://pedido-status.html#L1-L341)

**Section sources**
- [server.js:12-914](file://server.js#L12-L914)
- [checkout.html:1-768](file://checkout.html#L1-L768)
- [PAGAMENTO-README.md:1-119](file://PAGAMENTO-README.md#L1-L119)

## Core Components

### Payment Processing Engine

The core payment processing is handled by the Express server with dedicated endpoints for payment creation, status checking, and webhook reception. The system now supports two distinct payment flows:

**Automated PagBank Flow**: Traditional single-payment processing through PagBank with automatic access activation
**Manual Dual Flow**: Complex payment arrangements with administrative oversight for PIX + Cartão combinations

### Database Management

The system uses PostgreSQL to track payment orders, customer information, and access permissions with comprehensive indexing for optimal performance. The database schema has been enhanced to support both payment flows with additional fields for administrative oversight.

### Frontend Payment Interface

Multiple HTML pages provide different aspects of the payment experience, from product presentation to payment processing and status verification. The checkout interface now offers four payment options including the new manual dual flow.

**Section sources**
- [server.js:82-280](file://server.js#L82-L280)
- [database.sql:13-36](file://database.sql#L13-L36)
- [checkout.html:350-376](file://checkout.html#L350-L376)

## Architecture Overview

The payment system follows a modern microservice architecture pattern with clear separation of concerns and dual payment flow capabilities:

```mermaid
sequenceDiagram
participant Client as "Customer Browser"
participant Checkout as "checkout.html"
participant Server as "server.js"
participant PagBank as "PagBank API"
participant Admin as "Administrative Panel"
participant DB as "PostgreSQL"
participant Return as "pagamento-retorno.html"
Client->>Checkout : Access checkout page
Checkout->>Server : POST /api/criar-pagamento or /api/manual/criar-pedido
alt Automated Flow
Server->>PagBank : Create payment order
PagBank-->>Server : Payment details & links
else Manual Flow
Server->>DB : Save manual order with PENDING_PIX status
end
Server->>DB : Save order record
Server-->>Checkout : Payment response
Checkout->>Client : Redirect to PagBank or show manual instructions
Client->>PagBank : Complete payment (automated)
Client->>Admin : Upload PIX comprovante (manual)
Admin->>Server : Confirm PIX receipt
Admin->>Server : Send cartão payment link
Client->>Server : Upload cartão comprovante
Admin->>Server : Confirm total payment
Server->>DB : Update order status to PAID
Server->>DB : Create user access
PagBank-->>Client : Payment confirmation
Client->>Return : Access payment status
Return->>Server : GET /api/pedido/ : id
Server-->>Return : Order status
```

**Diagram sources**
- [server.js:82-280](file://server.js#L82-L280)
- [checkout.html:496-535](file://checkout.html#L496-L535)
- [pagamento-retorno.html:108-153](file://pagamento-retorno.html#L108-L153)
- [server.js:540-617](file://server.js#L540-L617)
- [server.js:805-890](file://server.js#L805-L890)

## Detailed Component Analysis

### Payment Creation Endpoint

The `/api/criar-pagamento` endpoint handles the complete automated payment creation process:

```mermaid
flowchart TD
A["POST /api/criar-pagamento"] --> B["Validate Request Data"]
B --> C{"Required Fields Present?"}
C --> |No| D["Return 400 Error"]
C --> |Yes| E["Configure Payment Amount"]
E --> F["Build PagBank Order Request"]
F --> G["Call PagBank Orders API"]
G --> H{"API Response OK?"}
H --> |No| I["Return Error Response"]
H --> |Yes| J["Save Order to Database"]
J --> K["Generate Payment Links"]
K --> L["Return Payment Response"]
```

**Diagram sources**
- [server.js:82-280](file://server.js#L82-L280)

Key features of the automated payment creation process:
- Dynamic pricing based on payment method selection
- Automatic order ID generation
- Real-time communication with PagBank API
- Comprehensive error handling and logging
- Database persistence for order tracking

**Section sources**
- [server.js:82-280](file://server.js#L82-L280)
- [server.js:132-173](file://server.js#L132-L173)

### Manual Payment Creation Endpoint

The `/api/manual/criar-pedido` endpoint creates orders for the dual payment flow:

```mermaid
flowchart TD
A["POST /api/manual/criar-pedido"] --> B["Validate Manual Payment Data"]
B --> C{"Required Fields Present?"}
C --> |No| D["Return 400 Error"]
C --> |Yes| E["Validate Amount Split"]
E --> F{"Split Equals R$ 6.000,00?"}
F --> |No| G["Return 400 Error"]
F --> |Yes| H["Generate Manual Order ID"]
H --> I["Create Order with PENDING_PIX Status"]
I --> J["Set PIX and Cartão Values"]
J --> K["Generate Access Token"]
K --> L["Save to Database"]
L --> M["Return Manual Order Response"]
```

**Diagram sources**
- [server.js:540-617](file://server.js#L540-L617)

**Section sources**
- [server.js:540-617](file://server.js#L540-L617)

### Webhook Processing System

The webhook system provides real-time payment status updates for both payment flows:

```mermaid
sequenceDiagram
participant PagBank as "PagBank"
participant Server as "server.js"
participant DB as "Database"
participant Client as "Client Browser"
PagBank->>Server : POST /api/webhook/pagbank
Server->>DB : Fetch Order Details
DB-->>Server : Order Information
Server->>Server : Process Payment Status
alt Automated Flow
Server->>DB : Update Status to PAID
Server->>DB : Create User Access
else Manual Flow
alt PIX Payment Received
Server->>DB : Update Status to PIX_CONFIRMADO_AGUARDA_CARTAO
else Cartão Payment Received
Server->>DB : Update Status to PAID
Server->>DB : Create User Access
end
end
Server-->>PagBank : 200 OK Response
Client->>Server : GET /api/pedido/ : id
Server-->>Client : Current Order Status
```

**Diagram sources**
- [server.js:285-345](file://server.js#L285-L345)

**Section sources**
- [server.js:285-345](file://server.js#L285-L345)
- [server.js:303-337](file://server.js#L303-L337)

### Administrative Oversight System

The administrative panel provides comprehensive oversight for manual payment orders:

```mermaid
flowchart TD
A["Admin Login"] --> B["View Pending Orders"]
B --> C{"Order Type?"}
C --> |Manual| D["Manual Order Processing"]
C --> |Automated| E["Automated Order Processing"]
D --> F["Upload Comprovante"]
F --> G["Confirm PIX Receipt"]
G --> H["Send Cartão Link"]
H --> I["Confirm Total Payment"]
I --> J["Liberate Access"]
E --> K["Liberate Access Automatically"]
```

**Diagram sources**
- [server.js:805-890](file://server.js#L805-L890)
- [admin.html:110-304](file://admin.html#L110-L304)

**Section sources**
- [server.js:805-890](file://server.js#L805-L890)
- [admin.html:110-304](file://admin.html#L110-L304)

### Order Status Checking

The `/api/pedido/:id` endpoint provides real-time order status monitoring for both payment flows:

```mermaid
flowchart TD
A["GET /api/pedido/:id"] --> B["Fetch Order from Database"]
B --> C{"Order Exists?"}
C --> |No| D["Return 404 Error"]
C --> |Yes| E["Return Order Details"]
E --> F["Include Payment Status"]
F --> G["Include Customer Information"]
G --> H["Include Access Status"]
```

**Diagram sources**
- [server.js:350-370](file://server.js#L350-L370)

**Section sources**
- [server.js:350-370](file://server.js#L350-L370)

### Frontend Payment Experience

The checkout interface provides multiple payment options including the new manual dual flow:

```mermaid
graph LR
A[Product Presentation] --> B[Payment Method Selection]
B --> C[Single Payment Option]
B --> D[Installment Option]
B --> E[Manual Dual Flow]
C --> F[Direct Payment Processing]
D --> G[First Payment Processing]
F --> H[Access Activation]
G --> H
E --> I[Manual Order Creation]
I --> J[PIX Payment Instructions]
J --> K[Cartão Payment Instructions]
K --> L[Administrative Oversight]
```

**Diagram sources**
- [checkout.html:350-376](file://checkout.html#L350-L376)

**Section sources**
- [checkout.html:350-376](file://checkout.html#L350-L376)
- [checkout.html:472-535](file://checkout.html#L472-L535)

## Dual Payment Flow System

### Payment States and Transitions

The manual payment flow operates through six distinct payment states with clear administrative oversight:

| State | Description | Administrative Actions | Client Actions |
|-------|-------------|----------------------|----------------|
| PENDING_PIX | Order created, awaiting PIX payment | None | View PIX instructions |
| PIX_ENVIADO | Client uploaded PIX comprovante | Review comprovante | Wait for confirmation |
| PIX_CONFIRMADO_AGUARDA_CARTAO | Admin confirmed PIX, awaiting cartão link | Confirm PIX receipt | Wait for cartão link |
| LINK_CARTAO_ENVIADO | Admin sent cartão payment link | Send cartão link | Pay cartão portion |
| PAID | All payments received, access granted | Confirm total payment | Access system |
| CANCELADO | Order cancelled by admin | Cancel order | Create new order |

### Manual Payment Processing Logic

The manual payment flow requires administrative intervention at each critical step:

```mermaid
flowchart TD
A["Client Creates Manual Order"] --> B["PENDING_PIX"]
B --> C["Client Pays PIX"]
C --> D["Client Uploads Comprovante"]
D --> E["Admin Reviews Comprovante"]
E --> F{"Comprovante Valid?"}
F --> |Yes| G["Admin Confirms PIX"]
G --> H["Admin Sends Cartão Link"]
H --> I["Client Pays Cartão"]
I --> J["Admin Confirms Total Payment"]
J --> K["Access Granted"]
F --> |No| L["Admin Cancels Order"]
L --> M["Order Cancelado"]
```

**Diagram sources**
- [server.js:540-617](file://server.js#L540-L617)
- [server.js:805-890](file://server.js#L805-L890)

**Section sources**
- [server.js:540-617](file://server.js#L540-L617)
- [server.js:805-890](file://server.js#L805-L890)

### Client-Side Manual Payment Interface

The client interface guides users through the manual payment process:

```mermaid
sequenceDiagram
participant Client as "Client"
participant Page as "pedido-status.html"
participant Server as "server.js"
participant Admin as "Admin Panel"
Client->>Page : Load Manual Order
Page->>Server : GET /api/manual/pedido/ : token
Server-->>Page : Order Details
alt PENDING_PIX
Page->>Client : Show PIX Instructions
Client->>Server : Upload Comprovante
Server->>Admin : Notify PIX Upload
else PIX_ENVIADO
Page->>Client : Show Waiting Status
else PIX_CONFIRMADO_AGUARDA_CARTAO
Page->>Client : Show Confirmation Message
else LINK_CARTAO_ENVIADO
Page->>Client : Show Cartão Payment Link
Client->>Server : Upload Cartão Comprovante
Admin->>Server : Confirm Total Payment
else PAID
Page->>Client : Show Access Granted
else CANCELADO
Page->>Client : Show Cancellation Message
end
```

**Diagram sources**
- [pedido-status.html:172-338](file://pedido-status.html#L172-L338)
- [server.js:661-671](file://server.js#L661-L671)

**Section sources**
- [pedido-status.html:172-338](file://pedido-status.html#L172-L338)
- [server.js:661-671](file://server.js#L661-L671)

## Administrative Oversight Features

### Administrative Panel Capabilities

The administrative panel provides comprehensive oversight for manual payment orders:

```mermaid
graph TB
subgraph "Order Management"
A[List Orders] --> B[Filter by Status]
B --> C[View Order Details]
C --> D[Upload Comprovante]
D --> E[Confirm PIX Receipt]
E --> F[Send Cartão Link]
F --> G[Confirm Total Payment]
end
subgraph "Order Actions"
H[Cancel Order] --> I[Update Status to CANCELADO]
J[Liberate Access] --> K[Update Status to PAID]
L[Copy Client Link] --> M[Share Order Link]
end
subgraph "Dashboard"
N[Summary Statistics] --> O[Total Orders]
O --> P[Revenue Tracking]
P --> Q[Status Distribution]
end
```

**Diagram sources**
- [admin.html:110-304](file://admin.html#L110-L304)
- [server.js:762-802](file://server.js#L762-L802)

### Administrative Workflows

Administrators can manage orders through several key workflows:

1. **PIX Comprovante Review**: Administrators review uploaded PIX receipts and confirm payment validity
2. **Cartão Payment Link Management**: Administrators send payment links for the remaining balance
3. **Total Payment Confirmation**: Administrators verify all payments are received and grant access
4. **Order Cancellation**: Administrators can cancel orders that don't meet requirements

**Section sources**
- [admin.html:110-304](file://admin.html#L110-L304)
- [server.js:805-890](file://server.js#L805-L890)

## Dependency Analysis

The payment system relies on several key dependencies:

```mermaid
graph TB
subgraph "Core Dependencies"
A[express] --> B[HTTP Server]
C[axios] --> D[HTTP Client]
E[pg] --> F[PostgreSQL Driver]
G[multer] --> H[File Upload]
I[cookie-parser] --> J[Cookie Handling]
end
subgraph "Development Dependencies"
K[nodemon] --> L[Auto Restart]
end
subgraph "Environment Variables"
M[PAGBANK_TOKEN] --> N[PagBank Authentication]
O[DATABASE_URL] --> P[Database Connection]
Q[ADMIN_EMAIL] --> R[Notification Settings]
S[PIX_CHAVE] --> T[Manual Payment Key]
U[ADMIN_SECRET] --> V[Admin Session Security]
end
```

**Diagram sources**
- [package.json:11-18](file://package.json#L11-L18)
- [server.js:47-61](file://server.js#L47-L61)

**Section sources**
- [package.json:11-23](file://package.json#L11-L23)
- [server.js:47-61](file://server.js#L47-L61)

## Performance Considerations

### Database Optimization

The system implements several performance optimizations:

- **Indexing Strategy**: Strategic indexes on frequently queried columns (email, status, timestamps)
- **Connection Pooling**: Efficient PostgreSQL connection management
- **JSONB Storage**: Flexible data storage for dynamic payment information
- **Async Operations**: Non-blocking database operations
- **Unique Token Index**: Optimized access token lookups for manual orders

### API Response Times

- **Payment Creation**: Typically completes within 2-5 seconds
- **Webhook Processing**: Asynchronous processing with immediate acknowledgment
- **Status Queries**: Sub-second response times for order status checks
- **Manual Order Processing**: Optimized for administrative workflows with caching

### Scalability Considerations

- **Horizontal Scaling**: Stateless server architecture supports load balancing
- **Database Scaling**: PostgreSQL clustering support for high availability
- **Caching Opportunities**: Potential for Redis caching of frequently accessed order data
- **Administrative Panel**: Optimized for concurrent admin sessions

## Security Considerations

### Payment Security

The system implements multiple security layers:

```mermaid
flowchart TD
A[Payment Request] --> B[Input Validation]
B --> C[Environment Variable Protection]
C --> D[HTTPS Enforcement]
D --> E[Database Encryption]
E --> F[Access Control]
F --> G[Error Handling]
G --> H[Administrative Authentication]
H --> I[Session Management]
```

**Diagram sources**
- [server.js:89-96](file://server.js#L89-L96)
- [server.js:120-128](file://server.js#L120-L128)
- [server.js:727-734](file://server.js#L727-L734)

### Data Protection Measures

- **Sensitive Data Handling**: Payment credentials stored in environment variables only
- **Input Sanitization**: Comprehensive validation of all customer input
- **Database Security**: Encrypted connections and restricted access
- **Error Message Filtering**: Generic error messages prevent information leakage
- **Administrative Authentication**: Secure session management with HMAC signatures
- **File Upload Security**: Restricted file types and size limits for comprovante uploads

### Access Control Implementation

- **User Authentication**: Session-based authentication for system access
- **Permission Management**: Role-based access control (admin/client)
- **Audit Logging**: Comprehensive logging of payment activities
- **Rate Limiting**: Protection against abuse and spam attempts
- **Administrative Session Security**: HMAC-signed cookies with expiration

**Section sources**
- [server.js:89-96](file://server.js#L89-L96)
- [server.js:120-128](file://server.js#L120-L128)
- [server.js:727-734](file://server.js#L727-L734)
- [server.js:409-417](file://server.js#L409-L417)

## Troubleshooting Guide

### Common Payment Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Payment Timeout | Error connecting to PagBank | Verify PAGBANK_TOKEN configuration |
| Invalid Credentials | 401 Unauthorized errors | Check PagBank API token validity |
| Database Connection | Server startup failures | Verify DATABASE_URL format |
| Payment Not Updating | Webhook not processed | Check webhook URL configuration |
| Manual Order Stuck | Order not progressing | Check administrative actions |
| File Upload Errors | Comprovante upload failures | Verify file type and size limits |

### Debugging Procedures

1. **Enable Detailed Logging**: Review server logs for error messages
2. **Verify Environment Setup**: Ensure all required environment variables are configured
3. **Test API Endpoints**: Use curl commands to test individual endpoints
4. **Monitor Database**: Check order records for payment status updates
5. **Check Administrative Panel**: Verify order state transitions

### Error Handling Patterns

The system implements comprehensive error handling:

```mermaid
flowchart TD
A[API Call] --> B{Response Status}
B --> |2xx| C[Success Path]
B --> |400| D[Validation Error]
B --> |401| E[Authentication Error]
B --> |404| F[Resource Not Found]
B --> |5xx| G[System Error]
D --> H[Return Specific Error]
E --> H
F --> H
G --> H
H --> I[Log Error Details]
I --> J[Return User-Friendly Message]
```

**Diagram sources**
- [server.js:239-280](file://server.js#L239-L280)

**Section sources**
- [server.js:239-280](file://server.js#L239-L280)
- [PAGAMENTO-README.md:69-119](file://PAGAMENTO-README.md#L69-L119)

## Conclusion

The PagBank payment system integration provides a robust, scalable solution for processing payments within the Alimentares QR code labeling platform. The system successfully combines modern web technologies with secure payment processing to deliver a seamless customer experience.

**Updated** The addition of the dual payment flow system significantly enhances the platform's flexibility and capability to handle complex payment arrangements. The new manual payment flow with administrative oversight enables sophisticated payment structures including PIX + Cartão combinations, providing customers with greater payment flexibility while maintaining administrative control over the payment process.

Key strengths of the implementation include:

- **Real-time Processing**: Instant payment status updates through webhook technology
- **Flexible Payment Options**: Support for both single and installment payment methods
- **Dual Payment Flows**: Comprehensive support for automated and manual payment processing
- **Administrative Oversight**: Complete control over manual payment orders with real-time status updates
- **Automated Access Management**: Streamlined user access activation upon payment confirmation
- **Comprehensive Error Handling**: Robust error management with detailed logging
- **Security Focus**: Multi-layered security approach protecting sensitive payment data
- **Scalable Architecture**: Designed for horizontal scaling and high availability

The system is designed for easy deployment and maintenance, with clear separation of concerns and comprehensive documentation. Future enhancements could include advanced analytics, additional payment methods, and enhanced reporting capabilities for the administrative panel.