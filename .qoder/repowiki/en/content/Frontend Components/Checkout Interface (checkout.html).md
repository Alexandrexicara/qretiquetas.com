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

## Update Summary
**Changes Made**
- Added comprehensive documentation for the new manual payment option (PIX + Cartão combination)
- Documented the split payment functionality with real-time validation
- Added quick PIX suggestions feature for faster payment setup
- Updated payment flow logic to support both immediate access purchases and trial periods
- Enhanced manual payment flow documentation with administrative oversight steps
- Updated form validation system to handle manual payment split requirements

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
This document provides comprehensive technical documentation for the checkout interface component (checkout.html), focusing on the payment selection interface, form validation, payment processing workflow, QR code display, and integration with the backend payment controller. It explains how the system integrates with PagBank for payment processing, handles customer information collection, manages payment states, and coordinates with the admin panel for manual payment flows. The system now supports both standard instant payment processing and advanced manual payment combinations with administrative oversight.

## Project Structure
The checkout interface is part of a larger Node.js/Express application that provides payment processing capabilities with three primary payment flows:
- Standard PagBank integration for instant payment initiation
- Manual payment flow combining PIX and credit card with administrative oversight
- Trial period payment flow supporting partial upfront payments

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
- **Updated**: Manual payment option with split payment calculator and quick PIX suggestions

### Customer Information Form
- Required fields: name, email, CPF, and WhatsApp phone number
- Input masks for CPF and phone number formatting
- Real-time validation and error feedback
- **Updated**: Enhanced validation for manual payment split requirements

### Payment Processing Engine
- API integration with PagBank for instant payment initiation
- QR code fallback display for PIX payments
- Status polling mechanism for payment verification
- Redirect handling for payment completion
- **Updated**: Manual payment flow with administrative approval workflow

### Manual Payment Flow (PIX + Cartão)
- Split-value calculation for PIX vs. Cartão division with real-time validation
- Quick suggestions for common PIX amounts (R$ 500, R$ 1.000, R$ 2.000, R$ 3.000)
- Administrative approval workflow for manual payments
- **New**: Comprehensive step-by-step payment progression with five distinct stages

**Section sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)

## Architecture Overview
The checkout system follows a client-server architecture with asynchronous payment processing and administrative oversight:

```mermaid
sequenceDiagram
participant Client as "Browser"
participant Checkout as "checkout.html"
participant API as "server.js"
participant PagBank as "PagBank API"
participant Admin as "admin.html"
participant DB as "PostgreSQL"
Client->>Checkout : Load checkout page
Checkout->>Checkout : Render payment options
Client->>Checkout : Submit payment form
alt Manual payment selected
Checkout->>API : POST /api/manual/criar-pedido
API->>DB : Create manual order with split values
API-->>Checkout : {url_pedido, token, pix values}
Checkout->>Client : Redirect to /pedido/ : token
Client->>API : GET /api/manual/pedido/ : token
API-->>Client : Order details & status (PENDING_PIX)
else Standard payment selected
Checkout->>API : POST /api/criar-pagamento
API->>PagBank : Create order with customer data
PagBank-->>API : Payment link/QR code
API->>DB : Save order record
API-->>Checkout : {link_pagamento, qr_code_url}
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
Method --> |entrada| Entrada["Show PIX entry info<br/>R$ 1.000,00<br/>30-day trial period"]
Method --> |cartão| Cartao["Show installment info<br/>Up to 12x"]
Method --> |manual| Manual["Show split calculator<br/>PIX + Cartão<br/>Administrative oversight"]
Manual --> SplitCalc["Real-time split calculation<br/>with validation"]
SplitCalc --> Validate{"Values valid?<br/>≥ R$ 1.00 each,<br/>exactly R$ 6.000.00"}
Validate --> |Yes| Ready["Enable continue button"]
Validate --> |No| Error["Show validation error<br/>and guidance"]
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
- Input validation for manual payment split with minimum amount requirements
- Quick PIX amount suggestions for faster payment setup
- **Updated**: Comprehensive manual payment flow with administrative approval steps

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
MaskPhone --> CheckMethod{"Payment method selected"}
MaskCPF --> CheckMethod
CheckMethod --> |Manual| ValidateSplit["Validate PIX + Cartão split<br/>≥ R$ 1.00 each,<br/>exactly R$ 6.000.00"]
CheckMethod --> |Other| SendData["Send to API"]
ValidateSplit --> SplitValid{"Split valid?"}
SplitValid --> |No| ShowSplitError["Show split validation error"]
SplitValid --> |Yes| SendData
ShowErrors --> Stop["Stop submission"]
ShowSplitError --> Stop
SendData --> Success["Success"]
```

Validation rules:
- All fields are required (name, email, CPF, phone)
- CPF formatted as XXX.XXX.XXX-XX
- Phone formatted as (XX) XXXXX-XXXX
- Manual payment split validates minimum amounts (R$ 1,00) and exact totals (R$ 6.000,00)
- **Updated**: Enhanced validation for manual payment split with real-time feedback

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
participant Admin as "admin.html"
participant DB as "Database"
Client->>Checkout : Click "Generate Payment"
alt Manual payment selected
Checkout->>Server : POST /api/manual/criar-pedido
Server->>DB : Insert manual order with split values
Server-->>Checkout : {url_pedido, token, pix values}
Checkout->>Client : Redirect to /pedido/ : token
Client->>Server : GET /api/manual/pedido/ : token
Server-->>Client : Order details & status (PENDING_PIX)
Client->>Server : Upload PIX proof
Server->>DB : Update order status to PIX_ENVIADO
Admin->>Server : Confirm PIX received
Admin->>Server : Send cartão payment link
Admin->>Server : Confirm total payment
Server->>DB : Mark order as PAID
Server->>DB : Create user account
else Standard payment selected
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
end
end
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
PaymentInit["Payment Initiated"] --> CheckMethod{"Payment method"}
CheckMethod --> |Manual| ShowManualFlow["Show manual payment flow<br/>with PIX instructions"]
CheckMethod --> |Standard| CheckLink{"Payment link available?"}
CheckLink --> |Yes| Redirect["Redirect to PagBank"]
CheckLink --> |No| ShowQR["Display QR Code"]
ShowQR --> QRImage["Show QR Code Image"]
ShowQR --> CopyCode["Show PIX Code"]
QRImage --> ScanPrompt["Prompt to scan QR"]
CopyCode --> CopyButton["Copy PIX Code Button"]
ScanPrompt --> PollStatus["Poll payment status"]
CopyButton --> PollStatus
ShowManualFlow --> PollManual["Poll manual payment status"]
PollManual --> CheckManualStatus["GET /api/manual/pedido/:token"]
CheckManualStatus --> ManualStatusPaid{"Status = PAID?"}
CheckManualStatus --> ManualStatusPending{"Status = PENDING_PIX?"}
ManualStatusPaid --> Success["Show success message"]
ManualStatusPending --> Wait["Show manual payment instructions"]
```

**Diagram sources**
- [checkout.html](file://checkout.html)

**Section sources**
- [checkout.html](file://checkout.html)

### Manual Payment Flow (PIX + Cartão)
The manual payment flow provides administrative oversight for combined payment methods with comprehensive five-stage processing:

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
Server->>DB : Create manual order with split values
Server-->>Checkout : {url_pedido, token}
Checkout->>Client : Redirect to /pedido/ : token
Client->>Server : GET /api/manual/pedido/ : token
Server-->>Client : Status PENDING_PIX
Client->>Server : Upload PIX proof
Server->>DB : Update order status to PIX_ENVIADO
Admin->>Server : Confirm PIX received
Admin->>Server : Send cartão payment link
Admin->>Server : Confirm total payment
Server->>DB : Mark order as PAID
Server->>DB : Create user account
Client->>Server : GET /api/manual/pedido/ : token
Server-->>Client : Status PAID with access instructions
```

**Manual Payment Flow Stages:**
1. **PENDING_PIX**: Customer pays PIX portion to specified key
2. **PIX_ENVIADO**: Customer uploads PIX proof for verification
3. **PIX_CONFIRMADO_AGUARDA_CARTAO**: Admin confirms PIX receipt
4. **LINK_CARTAO_ENVIADO**: Admin sends cartão payment link
5. **PAID**: Complete payment confirmed, access granted

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
- **Manual Payment Processing**: Administrative approval workflow adds processing time but ensures payment verification.
- **File Upload Handling**: Comprovante PIX uploads are processed with size limits and type restrictions.

## Troubleshooting Guide

### Common Issues and Solutions

**Payment Creation Failures**
- Verify PagBank token configuration in environment variables
- Check network connectivity to PagBank API
- Review server logs for detailed error messages
- **Updated**: For manual payments, verify split value validation (minimum R$ 1.00 each, exact R$ 6.000.00 total)

**QR Code Display Problems**
- Ensure HTTPS deployment for QR code scanning compatibility
- Verify image loading permissions
- Check browser camera/QR scanner permissions

**Manual Payment Flow Issues**
- Confirm administrative approval steps are completed
- Verify file upload restrictions (JPG, PNG, PDF, ≤5MB)
- Check administrative session authentication
- **Updated**: Validate manual payment split values meet minimum requirements
- **Updated**: Ensure PIX proof upload occurs before admin confirmation

**Database Connection Problems**
- Verify PostgreSQL credentials and connection string
- Check database schema initialization
- Monitor connection pool limits

**Section sources**
- [server.js](file://server.js)
- [PAGAMENTO-README.md](file://PAGAMENTO-README.md)

## Conclusion
The checkout interface provides a robust payment processing solution with dual integration approaches. The PagBank integration offers seamless instant payments, while the manual flow accommodates complex payment arrangements requiring administrative oversight. The system's modular design, comprehensive validation, and clear error handling make it suitable for production deployment with proper security configurations and monitoring. The addition of the manual payment option significantly expands the system's flexibility for handling various payment scenarios while maintaining security and administrative control.