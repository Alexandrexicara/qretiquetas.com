# Frontend Components

<cite>
**Referenced Files in This Document**
- [index.html](file://index.html)
- [checkout.html](file://checkout.html)
- [cadastro.html](file://cadastro.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [admin-login.html](file://admin-login.html)
- [admin.html](file://admin.html)
- [pedido-status.html](file://pedido-status.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)
- [README.md](file://README.md)
- [PAGAMENTO-README.md](file://PAGAMENTO-README.md)
</cite>

## Update Summary
**Changes Made**
- Added documentation for three new frontend components: admin-login.html, admin.html, and pedido-status.html
- Updated architecture overview to include administrative workflow and manual payment processing
- Enhanced payment flow documentation to cover both PagBank and manual payment systems
- Added comprehensive coverage of administrative controls and real-time monitoring capabilities

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
This document provides comprehensive frontend documentation for the qretiquetas.com project, focusing on the HTML interface components and their integration with the backend. It covers:
- Landing page (index.html) navigation, pricing display, and user access controls
- Checkout interface (checkout.html) with payment method selection, form validation, and PagBank integration
- Label generation interface (cadastro.html) including QR code creation, template selection, and print functionality
- Payment status page (pagamento-retorno.html) for displaying payment results and redirect handling
- Administrative panel (admin.html) with real-time order monitoring and payment tracking
- Customer-facing order status page (pedido-status.html) for manual payment flows
- Administrative authentication (admin-login.html) with secure session management
- Responsive design considerations, browser compatibility, and offline functionality
- Frontend-backend communication patterns and data handling using localStorage
- User experience considerations and accessibility features

## Project Structure
The frontend is composed of seven primary HTML pages and a Node.js/Express backend:
- index.html: Marketing and navigation hub
- checkout.html: Payment initiation and Pix flow
- cadastro.html: Label generation, user management, and history
- pagamento-retorno.html: Payment verification and status display
- admin-login.html: Administrative authentication interface
- admin.html: Comprehensive admin panel with real-time monitoring
- pedido-status.html: Customer-facing order status page for manual payments
- server.js: Backend API for payment orchestration, administrative controls, and database persistence
- database.sql: PostgreSQL schema for orders and users

```mermaid
graph TB
subgraph "Frontend"
IDX["index.html"]
CHK["checkout.html"]
CAD["cadastro.html"]
RET["pagamento-retorno.html"]
ADL["admin-login.html"]
ADM["admin.html"]
PS["pedido-status.html"]
end
subgraph "Backend"
SRV["server.js"]
DB["PostgreSQL (pedidos, usuarios)"]
end
IDX --> SRV
CHK --> SRV
CAD --> SRV
RET --> SRV
ADL --> SRV
ADM --> SRV
PS --> SRV
SRV --> DB
```

**Diagram sources**
- [index.html](file://index.html)
- [checkout.html](file://checkout.html)
- [cadastro.html](file://cadastro.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [admin-login.html](file://admin-login.html)
- [admin.html](file://admin.html)
- [pedido-status.html](file://pedido-status.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

**Section sources**
- [README.md](file://README.md)
- [PAGAMENTO-README.md](file://PAGAMENTO-README.md)

## Core Components
- Landing Page (index.html): Provides navigation to checkout, pricing display, feature highlights, and usage instructions.
- Checkout (checkout.html): Handles payment method selection, form validation, Pix QR generation, and status polling.
- Label Generator (cadastro.html): Manages user authentication, label creation, QR code rendering, and printing.
- Payment Status (pagamento-retorno.html): Displays payment outcomes and redirects based on PagBank callbacks.
- **Administrative Login (admin-login.html)**: Secure authentication interface for administrative access with session management.
- **Admin Panel (admin.html)**: Real-time order monitoring, payment tracking, and administrative controls for order management.
- **Customer Order Status (pedido-status.html)**: Step-by-step payment flow for manual payment processing with real-time updates.

**Section sources**
- [index.html](file://index.html)
- [checkout.html](file://checkout.html)
- [cadastro.html](file://cadastro.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [admin-login.html](file://admin-login.html)
- [admin.html](file://admin.html)
- [pedido-status.html](file://pedido-status.html)

## Architecture Overview
The frontend communicates with the backend via REST endpoints. Payments are initiated from checkout, redirected to PagBank, and confirmed via webhooks. The admin panel provides real-time monitoring and administrative controls for both PagBank and manual payment flows. The customer-facing order status page enables transparent payment tracking with step-by-step guidance.

```mermaid
sequenceDiagram
participant U as "User"
participant IDX as "index.html"
participant CHK as "checkout.html"
participant PS as "pedido-status.html"
participant ADM as "admin.html"
participant SRV as "server.js"
participant PB as "PagBank API"
U->>IDX : Open landing page
IDX-->>U : Navigate to checkout
U->>CHK : Fill form and select payment method
alt PagBank Payment
CHK->>SRV : POST /api/criar-pagamento
SRV->>PB : Create order (PIX)
PB-->>SRV : Order with link/QR
SRV-->>CHK : {pedido_id, link_pagamento, qr_code_url}
CHK-->>U : Redirect to PagBank or show QR
PB-->>SRV : POST /api/webhook/pagbank
SRV-->>SRV : Update order status and grant access
else Manual Payment
CHK->>SRV : POST /api/manual/criar-pedido
SRV-->>CHK : {pedido_id, token, pix, valor_pix, valor_cartao}
CHK-->>U : Redirect to /pedido/{token}
U->>PS : Access order status page
PS->>SRV : GET /api/manual/pedido/ : token
SRV-->>PS : {status, pix, valor_pix, valor_cartao}
PS-->>U : Show payment steps
U->>PS : Upload PIX receipt
PS->>SRV : POST /api/manual/upload-comprovante/ : token
SRV-->>PS : {status : PIX_ENVIADO}
ADM->>SRV : GET /api/admin/pedidos
SRV-->>ADM : {orders with status}
ADM-->>U : Admin panel with order list
ADM->>SRV : POST /api/admin/pedido/ : id/confirmar-pix
SRV-->>ADM : {status : PIX_CONFIRMADO_AGUARDA_CARTAO}
ADM->>SRV : POST /api/admin/pedido/ : id/enviar-link-cartao
SRV-->>ADM : {status : LINK_CARTAO_ENVIADO}
ADM->>SRV : POST /api/admin/pedido/ : id/confirmar-pagamento
SRV-->>ADM : {status : PAID}
end
```

**Diagram sources**
- [checkout.html](file://checkout.html)
- [pedido-status.html](file://pedido-status.html)
- [admin.html](file://admin.html)
- [server.js](file://server.js)
- [pagamento-retorno.html](file://pagamento-retorno.html)

## Detailed Component Analysis

### Landing Page (index.html)
- Navigation: Fixed header with logo and title; links to "How to Use" and "Price" sections.
- Pricing Display: Prominent price card showing investment and benefits.
- Features Grid: Six feature cards highlighting QR code, internal/external labels, printing, history, access control, and company data.
- Instructions: Video tutorial and step-by-step guide.
- Call-to-Action: Links to checkout and promotional messaging.
- Responsive Design: Media queries adjust layout for smaller screens.

Key UX and accessibility considerations:
- Semantic headings and lists improve screen reader support.
- Clear focus states and hover effects for interactive elements.
- Mobile-first grid layouts for feature and instruction sections.

**Section sources**
- [index.html](file://index.html)
- [README.md](file://README.md)

### Checkout Interface (checkout.html)
- Payment Method Selection: Three options (à vista, entrada via Pix, cartão) with visual indicators and details panels.
- Form Validation: Required fields for name, email, CPF, and phone; masks applied to CPF and phone inputs.
- Payment Initiation: On submit, frontend posts customer data to /api/criar-pagamento and handles responses.
- Pix Flow: If a link is provided, the browser redirects to PagBank; otherwise, QR code and copyable Pix code are shown.
- Status Polling: Periodic polling of /api/pedido/:id to update UI based on status (PAID, ENTRADA_PAID, etc.).
- Redirect Handling: After confirmation, the page displays success or pending states and links to the label generator.

Frontend-backend communication patterns:
- POST /api/criar-pagamento with customer and method data.
- GET /api/pedido/:id for status updates.
- Uses fetch for asynchronous requests and localStorage for temporary state.

Offline and compatibility:
- Works offline after initial load; QR code fallback ensures Pix can be shown even if redirect fails.
- Responsive layout adapts to mobile devices.

Accessibility:
- Focus management during form submission and modal-like status containers.
- Clear status messages and icons for success/pending/error states.

**Section sources**
- [checkout.html](file://checkout.html)
- [server.js](file://server.js)
- [PAGAMENTO-README.md](file://PAGAMENTO-README.md)

### Label Generation Interface (cadastro.html)
- Authentication: Login/register tabs with session persistence via sessionStorage.
- Navigation Tabs: Labels, History, Admin (admin-only).
- Label Creation:
  - Inputs for product, lot, expiry, quantity, color, and type (internal/external).
  - External fields conditionally shown (weight, price, color, company, CNPJ, ingredients, manufacturer).
  - Generates label previews with QR codes using the QRious library.
- Printing: Print styles optimize labels for thermal printers.
- History: Lists generated labels with actions to reprint or delete.
- Admin Panel: QR position configuration (vertical/horizontal), user creation/exclusion.

Data handling:
- Uses localStorage keys: alimentares_users, alimentares_labels, alimentares_currentUser, alimentares_config.
- DataManager module encapsulates CRUD operations for users, labels, and configuration.

User experience:
- Real-time preview updates as users change inputs.
- Color pickers and masked inputs improve usability.
- Tabbed interface organizes functionality clearly.

Accessibility:
- Proper labels and ARIA-friendly buttons.
- Focus-visible indicators and keyboard navigation support.

**Section sources**
- [cadastro.html](file://cadastro.html)
- [database.sql](file://database.sql)
- [README.md](file://README.md)

### Payment Status Page (pagamento-retorno.html)
- Dynamic Status Display: Spinner while verifying, success, pending, or error states.
- Query Parameter Handling: Extracts order_id from URL and calls /api/pedido/:id.
- Outcome Handling:
  - PAID/COMPLETO: Success with order and email details.
  - ENTRADA_PAID: Pending with instructions to pay the remainder via card.
  - Other: Pending with order ID.

Integration:
- Calls backend endpoint to fetch order status.
- Redirects to label generator upon successful payment.

**Section sources**
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [server.js](file://server.js)

### Administrative Login Interface (admin-login.html)
- **Security-Focused Design**: Dark theme with gradient background and centered card layout.
- **Authentication Form**: Username and password fields with proper autocomplete attributes.
- **Real-time Validation**: Client-side form validation with error display management.
- **Session Management**: Direct integration with /api/admin/login endpoint for secure authentication.
- **Responsive Layout**: Mobile-first design with proper spacing and typography.

Security and UX considerations:
- HTTPS enforcement in production environment.
- CSRF protection through custom session tokens.
- Disabled button states during authentication attempts.
- Clear error messaging for authentication failures.

**Section sources**
- [admin-login.html](file://admin-login.html)
- [server.js](file://server.js)

### Administrative Panel Interface (admin.html)
- **Real-time Monitoring**: Live order list with automatic refresh every 30 seconds.
- **Advanced Filtering**: Seven status-based filters (Todos, Aguardando PIX, PIX em conferência, etc.).
- **Summary Dashboard**: Key metrics showing total orders, pending payments, confirmed PIX, and total revenue.
- **Multi-stage Payment Processing**: Complete workflow for manual payment orders including PIX receipt verification, card link generation, and final payment confirmation.
- **Administrative Actions**: One-click operations for confirming PIX receipts, sending card payment links, confirming total payments, and canceling orders.
- **Customer Link Sharing**: Copy-to-clipboard functionality for sharing order URLs with customers.
- **Session Management**: Automatic logout with POST /api/admin/logout endpoint.

Workflow automation:
- Automatic polling for order status updates.
- Conditional action availability based on order stage.
- Real-time badge updates reflecting payment status.
- Comprehensive order details display with customer information and payment breakdown.

**Section sources**
- [admin.html](file://admin.html)
- [server.js](file://server.js)

### Customer Order Status Interface (pedido-status.html)
- **Step-by-Step Payment Flow**: Five distinct stages from PIX payment to final access release.
- **Real-time Updates**: Automatic polling every 10 seconds for status changes.
- **PIX Payment Interface**: Complete payment instructions with account holder details, bank information, and copy-to-clipboard functionality for PIX key.
- **Receipt Upload System**: Secure file upload for PIX proof with image/PDF support and progress feedback.
- **Card Payment Integration**: Direct link to card payment when provided by administrator.
- **Progressive Disclosure**: Content dynamically reveals based on current payment stage.
- **Toast Notifications**: Non-blocking success/error feedback for user actions.
- **Customer-Centric Design**: Gradient background with card-based layout for optimal readability.

Payment flow stages:
- **Stage 1**: PIX payment with key details and receipt upload.
- **Stage 2**: PIX receipt submitted, awaiting administrator confirmation.
- **Stage 3**: PIX confirmed, awaiting card payment link.
- **Stage 4**: Card payment link received and ready for completion.
- **Stage 5**: Payment complete, access granted to label generator.

**Section sources**
- [pedido-status.html](file://pedido-status.html)
- [server.js](file://server.js)

## Dependency Analysis
- Frontend-to-Backend Dependencies:
  - checkout.html depends on server.js endpoints for payment creation and status polling.
  - cadastro.html relies on localStorage for offline operation and server.js for user management and order status checks.
  - pagamento-retorno.html depends on server.js for order verification.
  - admin-login.html integrates with /api/admin/login for authentication.
  - admin.html communicates with /api/admin/pedidos for order listing and administrative actions.
  - pedido-status.html connects to /api/manual endpoints for manual payment processing.
- Backend-to-Database Dependencies:
  - server.js writes and reads order and user data to/from PostgreSQL tables defined in database.sql.
  - Administrative endpoints manage order lifecycle with real-time status updates.

```mermaid
graph LR
CHK["checkout.html"] --> API1["/api/criar-pagamento"]
CHK --> API2["/api/pedido/:id"]
RET["pagamento-retorno.html"] --> API2
CAD["cadastro.html"] --> LS["localStorage"]
CAD --> API2
ADL["admin-login.html"] --> API3["/api/admin/login"]
ADM["admin.html"] --> API4["/api/admin/pedidos"]
ADM --> API5["/api/admin/pedido/:id/*"]
PS["pedido-status.html"] --> API6["/api/manual/pedido/:token"]
PS --> API7["/api/manual/upload-comprovante/:token"]
PS --> API8["/api/manual/criar-pedido"]
API1 --> SRV["server.js"]
API2 --> SRV
API3 --> SRV
API4 --> SRV
API5 --> SRV
API6 --> SRV
API7 --> SRV
API8 --> SRV
SRV --> DB["PostgreSQL"]
```

**Diagram sources**
- [checkout.html](file://checkout.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [cadastro.html](file://cadastro.html)
- [admin-login.html](file://admin-login.html)
- [admin.html](file://admin.html)
- [pedido-status.html](file://pedido-status.html)
- [server.js](file://server.js)
- [database.sql](file://database.sql)

**Section sources**
- [server.js](file://server.js)
- [database.sql](file://database.sql)

## Performance Considerations
- Offline Operation: The label generator works offline after initial load; data is stored in localStorage.
- Minimal External Dependencies: QR code generation uses a CDN-hosted library, reducing bundle size.
- Efficient Printing: Print styles minimize layout overhead for thermal printers.
- Status Polling: Checkout polls every 5 seconds; admin panel polls every 30 seconds; manual payment polls every 10 seconds.
- **Optimized Polling**: Different intervals for different components to balance responsiveness with server load.
- **Real-time Updates**: Admin panel provides live monitoring without excessive polling overhead.

## Troubleshooting Guide
Common issues and resolutions:
- Payment Redirection Failures:
  - Symptom: No redirect to PagBank; QR not shown.
  - Resolution: Verify /api/criar-pagamento response includes link or QR; ensure PAGBANK_TOKEN is configured.
- Status Verification Errors:
  - Symptom: Status page shows error or blank.
  - Resolution: Confirm order_id parameter is present; check /api/pedido/:id availability.
- Label Printing Problems:
  - Symptom: Labels misaligned or missing QR codes.
  - Resolution: Adjust QR position setting (vertical/horizontal) in Admin; verify print dialog settings.
- Authentication Issues:
  - Symptom: Login fails or session lost.
  - Resolution: Ensure sessionStorage is enabled; verify credentials match those in DataManager.
- **Administrative Access Issues**:
  - Symptom: Admin panel shows login screen despite valid credentials.
  - Resolution: Verify ADMIN_USUARIO and ADMIN_SENHA environment variables; check cookie security settings.
- **Manual Payment Flow Problems**:
  - Symptom: Order status not updating after receipt upload.
  - Resolution: Confirm file format (JPG, PNG, PDF) and size limits; verify upload endpoint accessibility.
- **Real-time Monitoring Failures**:
  - Symptom: Admin panel not refreshing orders automatically.
  - Resolution: Check network connectivity; verify polling interval and server response times.

**Section sources**
- [checkout.html](file://checkout.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [cadastro.html](file://cadastro.html)
- [admin-login.html](file://admin-login.html)
- [admin.html](file://admin.html)
- [pedido-status.html](file://pedido-status.html)
- [server.js](file://server.js)

## Conclusion
The frontend components deliver a comprehensive, user-friendly experience for marketing, payment processing, label generation, and administrative oversight. They leverage localStorage for offline capability, integrate with PagBank for secure payments, provide robust printing workflows, and offer real-time administrative monitoring. The architecture cleanly separates concerns between frontend UI and backend APIs, enabling scalability and maintainability while supporting both automated and manual payment processing workflows.

## Appendices

### Responsive Design and Browser Compatibility
- Responsive Layouts: Media queries and CSS Grid/Flexbox adapt content for mobile and tablet.
- Browser Support: Tested on Chrome, Edge, Firefox, Safari, and mobile browsers; offline functionality verified post-initial load.
- **Enhanced Mobile Experience**: All components optimized for touch interaction and mobile screen sizes.

**Section sources**
- [index.html](file://index.html)
- [checkout.html](file://checkout.html)
- [cadastro.html](file://cadastro.html)
- [admin-login.html](file://admin-login.html)
- [admin.html](file://admin.html)
- [pedido-status.html](file://pedido-status.html)
- [README.md](file://README.md)

### Offline Functionality Implementation
- Local Data Storage: Users, labels, and configuration persisted in localStorage.
- Session Persistence: Current user stored in sessionStorage for session continuity.
- Print Optimization: Dedicated print media queries ensure consistent label output.
- **Administrative Session Management**: Admin login state maintained via secure cookies with expiration handling.

**Section sources**
- [cadastro.html](file://cadastro.html)
- [admin-login.html](file://admin-login.html)
- [README.md](file://README.md)

### Frontend-Backend Communication Patterns
- REST Endpoints Used:
  - POST /api/criar-pagamento: Initiates payment with customer data and method.
  - GET /api/pedido/:id: Checks order status for UI updates.
  - POST /api/webhook/pagbank: Receives PagBank notifications to update order state.
  - **POST /api/admin/login**: Administrative authentication with secure session management.
  - **GET /api/admin/pedidos**: Retrieves orders for administrative monitoring.
  - **POST /api/admin/pedido/:id/confirmar-pix**: Confirms PIX receipt for manual orders.
  - **POST /api/admin/pedido/:id/enviar-link-cartao**: Sends card payment link to customer.
  - **POST /api/admin/pedido/:id/confirmar-pagamento**: Completes payment and grants access.
  - **POST /api/admin/pedido/:id/cancelar**: Cancels orders with audit trail.
  - **POST /api/manual/criar-pedido**: Creates manual payment orders with custom split.
  - **POST /api/manual/upload-comprovante/:token**: Uploads PIX receipt for manual orders.
  - **GET /api/manual/pedido/:token**: Retrieves order details for customer view.
- Data Flow:
  - Frontend collects user inputs and sends them to backend.
  - Backend interacts with external services (PagBank) and persists order state.
  - Frontend polls status and renders results with real-time updates.
  - **Administrative workflows enable manual intervention and oversight**.

**Section sources**
- [checkout.html](file://checkout.html)
- [pagamento-retorno.html](file://pagamento-retorno.html)
- [admin-login.html](file://admin-login.html)
- [admin.html](file://admin.html)
- [pedido-status.html](file://pedido-status.html)
- [server.js](file://server.js)

### Security and Authentication Framework
- **Administrative Security**: HMAC-signed session tokens with 12-hour expiration.
- **Client-side Validation**: Input sanitization and form validation across all forms.
- **File Upload Security**: Server-side validation for receipt uploads with size and format restrictions.
- **Real-time Monitoring**: Secure polling mechanisms prevent unauthorized access to administrative data.
- **Session Management**: Automatic cleanup and expiration handling for all authenticated sessions.

**Section sources**
- [admin-login.html](file://admin-login.html)
- [admin.html](file://admin.html)
- [server.js](file://server.js)