# Checkout Interface (checkout.html)

<cite>
**Referenced Files in This Document**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [pedido-status.html](file://pedido-status.html)
- [admin.html](file://admin.html)
- [admin-login.html](file://admin-login.html)
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
This document provides comprehensive technical documentation for the checkout interface component (checkout.html), focusing on the payment selection interface, form validation, payment processing workflow, QR code display, and integration with the backend payment controller. It explains how the system integrates with PagBank for payment processing, handles customer information collection, manages payment states, and coordinates with the admin panel for manual payment flows.

## Project Structure
The checkout interface is part of a larger Node.js/Express application that provides payment processing capabilities with two primary payment flows:
- Standard PagBank integration for instant payment initiation
- Manual payment flow combining PIX and credit card with administrative oversight

```mermaid
graph TB
subgraph "Frontend"
CH["checkout.html"]
PR["pagamento-retorno.html"]
PS["pedido-status.html"]
AD["admin.html"]
AL["admin-login.html"]
end
subgraph "Backend"
SV["server.js"]
DB["PostgreSQL (pedidos, usuarios)"]
end
CH --> SV
PR --> SV
PS --> SV
AD --> SV
AL --> SV
SV --> DB
```

**Diagram sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

**Section sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

## Core Components
The checkout interface consists of several interconnected components:

### Payment Selection Interface
- Four payment method options: à vista (discounted), entrada (PIX deposit), cartão (credit card), and manual (PIX + Cartão combination)
- Dynamic selection highlighting and details panels
- Real-time price calculations and discount displays

### Customer Information Form
- Required fields: name, email, CPF, and WhatsApp phone number
- Input masks for CPF and phone number formatting
- Real-time validation and error feedback

### Payment Processing Engine
- API integration with PagBank for instant payment initiation
- QR code fallback display for PIX payments
- Status polling mechanism for payment verification
- Redirect handling for payment completion

### Manual Payment Flow
- Split-value calculation for PIX vs. Cartão division
- Quick suggestions for common PIX amounts
- Administrative approval workflow for manual payments

**Section sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)

## Architecture Overview
The checkout system follows a client-server architecture with asynchronous payment processing:

```mermaid
sequenceDiagram
participant Client as "Browser"
participant Checkout as "checkout.html"
participant API as "server.js"
participant PagBank as "PagBank API"
participant DB as "PostgreSQL"
Client->>Checkout : Load checkout page
Checkout->>Checkout : Render payment options
Client->>Checkout : Submit payment form
Checkout->>API : POST /api/criar-pagamento
API->>PagBank : Create order with customer data
PagBank-->>API : Payment link/QR code
API->>DB : Save order record
API-->>Checkout : {link_pagamento, qr_code_url}
alt PagBank link available
Checkout->>Client : Redirect to PagBank
Client->>API : GET /api/pedido/ : id (polling)
API->>DB : Query order status
API-->>Client : {status : PAID/PENDING}
else QR code fallback
Checkout->>Client : Display QR code
Client->>API : GET /api/pedido/ : id (polling)
API->>DB : Query order status
API-->>Client : {status : PAID/PENDING}
end
```

**Diagram sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)

## Detailed Component Analysis

### Payment Selection Interface
The payment selection system provides four distinct payment methods with dynamic UI updates:

```mermaid
flowchart TD
Start(["User selects payment method"]) --> Method{"Method chosen"}
Method --> |à vista| Avista["Show discount info<br/>R$ 5.400,00 (10% off)"]
Method --> |entrada| Entrada["Show PIX entry info<br/>R$ 1.000,00"]
Method --> |cartão| Cartao["Show installment info<br/>Up to 12x"]
Method --> |manual| Manual["Show split calculator<br/>PIX + Cartão"]
Manual --> SplitCalc["Real-time split calculation"]
SplitCalc --> Validate{"Values valid?"}
Validate --> |Yes| Ready["Enable continue button"]
Validate --> |No| Error["Show validation error"]
Avista --> Continue["Proceed to payment"]
Entrada --> Continue
Cartao --> Continue
Ready --> Continue
```

**Diagram sources**
- [checkout.html](file://checkout.html)

Key features:
- Real-time price calculations with discount display
- Dynamic details panels showing payment specifics
- Input validation for manual payment split
- Quick PIX amount suggestions

**Section sources**
- [checkout.html](file://checkout.html)

### Form Validation System
The form validation system ensures data integrity and provides immediate feedback:

```mermaid
flowchart TD
FormSubmit["Form Submission"] --> ValidateFields["Validate Required Fields"]
ValidateFields --> FieldsValid{"All fields valid?"}
FieldsValid --> |No| ShowErrors["Display field errors"]
FieldsValid --> |Yes| FormatInputs["Format Phone & CPF"]
FormatInputs --> MaskPhone["Apply phone mask<br/>(XX) XXXXX-XXXX"]
FormatInputs --> MaskCPF["Apply CPF mask<br/>XXX.XXX.XXX-XX"]
MaskPhone --> SendData["Send to API"]
MaskCPF --> SendData
ShowErrors --> Stop["Stop submission"]
SendData --> Success["Success"]
```

Validation rules:
- All fields are required (name, email, CPF, phone)
- CPF formatted as XXX.XXX.XXX-XX
- Phone formatted as (XX) XXXXX-XXXX
- Manual payment split validates minimum amounts and exact totals

**Diagram sources**
- [checkout.html](file://checkout.html)

**Section sources**
- [checkout.html](file://checkout.html)

### Payment Processing Workflow
The payment processing workflow integrates with PagBank and handles multiple scenarios:

```mermaid
sequenceDiagram
participant Client as "Customer"
participant Checkout as "checkout.html"
participant Server as "server.js"
participant PagBank as "PagBank API"
participant DB as "Database"
Client->>Checkout : Click "Generate Payment"
Checkout->>Server : POST /api/criar-pagamento
Server->>DB : Insert order record
Server->>PagBank : Create payment order
PagBank-->>Server : Return payment link/QR code
alt Payment link available
Server-->>Checkout : {link_pagamento}
Checkout->>Client : Redirect to PagBank
else QR code fallback
Server-->>Checkout : {qr_code_url, pix_codigo}
Checkout->>Client : Display QR code
Checkout->>Server : Poll /api/pedido/ : id
Server->>DB : Check payment status
Server-->>Checkout : {status}
end
PagBank->>Server : POST /api/webhook/pagbank
Server->>DB : Update order status
Server->>DB : Create user account if paid
```

**Diagram sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)

**Section sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)

### QR Code Display and Payment Initiation
The QR code display system provides multiple payment initiation methods:

```mermaid
flowchart TD
PaymentInit["Payment Initiated"] --> CheckLink{"Payment link available?"}
CheckLink --> |Yes| Redirect["Redirect to PagBank"]
CheckLink --> |No| ShowQR["Display QR Code"]
ShowQR --> QRImage["Show QR Code Image"]
ShowQR --> CopyCode["Show PIX Code"]
QRImage --> ScanPrompt["Prompt to scan QR"]
CopyCode --> CopyButton["Copy PIX Code Button"]
ScanPrompt --> PollStatus["Poll payment status"]
CopyButton --> PollStatus
PollStatus --> CheckStatus["GET /api/pedido/:id"]
CheckStatus --> StatusPaid{"Status = PAID?"}
CheckStatus --> StatusPending{"Status = PENDING?"}
StatusPaid --> Success["Show success message"]
StatusPending --> Wait["Show pending message"]
```

**Diagram sources**
- [checkout.html](file://checkout.html)

**Section sources**
- [checkout.html](file://checkout.html)

### Manual Payment Flow (PIX + Cartão)
The manual payment flow provides administrative oversight for combined payment methods:

```mermaid
sequenceDiagram
participant Client as "Customer"
participant Checkout as "checkout.html"
participant Server as "server.js"
participant Admin as "admin.html"
participant DB as "Database"
Client->>Checkout : Select manual payment
Client->>Checkout : Enter PIX/Cartão split values
Checkout->>Server : POST /api/manual/criar-pedido
Server->>DB : Create manual order
Server-->>Checkout : {url_pedido, token}
Checkout->>Client : Redirect to /pedido/ : token
Client->>Server : GET /api/manual/pedido/ : token
Server-->>Client : Order details & status
Client->>Server : Upload PIX proof
Server->>DB : Update order status
Admin->>Server : Confirm PIX received
Admin->>Server : Send cartão payment link
Admin->>Server : Confirm total payment
Server->>DB : Mark order as PAID
Server->>DB : Create user account
```

**Diagram sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)
- [pedido-status.html](file://pedido-status.html)
- [admin.html](file://admin.html)

**Section sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)
- [pedido-status.html](file://pedido-status.html)
- [admin.html](file://admin.html)

## Dependency Analysis
The checkout system has the following key dependencies:

```mermaid
graph TB
subgraph "External Dependencies"
AX["axios"]
PG["pg (PostgreSQL)"]
EX["express"]
MU["multer"]
CO["cors"]
CP["cookie-parser"]
DN["dotenv"]
end
subgraph "Internal Dependencies"
CH["checkout.html"]
SV["server.js"]
DB["database.sql"]
PR["pagamento-retorno.html"]
PS["pedido-status.html"]
AD["admin.html"]
end
CH --> SV
SV --> AX
SV --> PG
SV --> EX
SV --> MU
SV --> DB
PR --> SV
PS --> SV
AD --> SV
```

**Diagram sources**
- [package.json](file://package.json)
- [server.js](file://server.js)

**Section sources**
- [package.json](file://package.json)
- [server.js](file://server.js)

## Performance Considerations
- **Status Polling**: The frontend polls the backend every 5 seconds for payment status updates. This interval can be adjusted based on performance requirements.
- **Database Queries**: PostgreSQL indexing on email and status fields optimizes order lookups.
- **Memory Usage**: QR code images are loaded dynamically; consider caching for high-traffic scenarios.
- **API Response Times**: PagBank API latency affects overall payment processing time.

## Troubleshooting Guide

### Common Issues and Solutions

**Payment Creation Failures**
- Verify PagBank token configuration in environment variables
- Check network connectivity to PagBank API
- Review server logs for detailed error messages

**QR Code Display Problems**
- Ensure HTTPS deployment for QR code scanning compatibility
- Verify image loading permissions
- Check browser camera/QR scanner permissions

**Manual Payment Flow Issues**
- Confirm administrative approval steps are completed
- Verify file upload restrictions (JPG, PNG, PDF, ≤5MB)
- Check administrative session authentication

**Database Connection Problems**
- Verify PostgreSQL credentials and connection string
- Check database schema initialization
- Monitor connection pool limits

**Section sources**
- [server.js](file://server.js)
- [PAGAMENTO-README.md](file://PAGAMENTO-README.md)

## Conclusion
The checkout interface provides a robust payment processing solution with dual integration approaches. The PagBank integration offers seamless instant payments, while the manual flow accommodates complex payment arrangements requiring administrative oversight. The system's modular design, comprehensive validation, and clear error handling make it suitable for production deployment with proper security configurations and monitoring.