# GST Pro - Invoice & Filing Application

## Overview
GST Pro is a comprehensive web application for Indian SMEs to manage GST-compliant invoices, track GST return filings, and optimize tax compliance. The application provides an intuitive interface for creating tax invoices, managing customers and vendors, purchase tracking, ITC management, and monitoring compliance deadlines.

## Current State
- Full-featured GST management application
- PostgreSQL database with Drizzle ORM
- Email OTP passwordless authentication
- Multi-business profile support
- Responsive design with dark/light mode support

## Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/        # shadcn/ui components
│   │   │   ├── app-sidebar.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   ├── pages/         # Page components
│   │   │   ├── dashboard.tsx
│   │   │   ├── invoices.tsx
│   │   │   ├── invoice-create.tsx
│   │   │   ├── customers.tsx
│   │   │   ├── purchases.tsx
│   │   │   ├── purchase-create.tsx
│   │   │   ├── vendors.tsx
│   │   │   ├── itc.tsx
│   │   │   ├── filing.tsx
│   │   │   ├── payments.tsx
│   │   │   ├── insights.tsx
│   │   │   ├── notices.tsx
│   │   │   ├── alerts.tsx
│   │   │   └── settings.tsx
│   │   ├── App.tsx        # Main app with routing
│   │   └── index.css      # Global styles
├── server/                 # Backend Express server
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # PostgreSQL storage layer
│   ├── email.ts           # SMTP email service
│   └── index.ts           # Server entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Data models and validation
└── design_guidelines.md   # UI/UX design system
```

## Key Features

### Dashboard
- Overview statistics (invoices, revenue, GST payable)
- Upcoming filing deadlines with due dates
- Recent invoices and purchases
- Compliance health score display

### Invoice Management
- Create GST-compliant tax invoices
- Auto GST calculation (CGST/SGST for intra-state, IGST for inter-state)
- Multiple invoice types (Tax Invoice, Bill of Supply, Export Invoice, Debit/Credit Notes)
- HSN/SAC code suggestions
- Live invoice preview with PDF generation

### Purchase Management
- Track purchase invoices from vendors
- Vendor management with GSTIN validation
- Automatic ITC calculation from purchases
- GSTR-2B reconciliation support

### ITC Ledger
- Track Input Tax Credit from purchases
- View ITC breakdown by CGST/SGST/IGST
- Reconciliation status tracking

### Filing Returns
- Track GSTR-1, GSTR-3B, GSTR-4, GSTR-9, CMP-08 returns
- Auto-populate from invoices feature
- Nil return filing support
- Late fee & interest calculator
- Email reminder system for due dates

### Tax Payments
- Record GST payments with PMT-06 challan
- ITC utilization planner
- Suggest optimal ITC vs cash usage
- Payment history tracking

### GST Intelligence
- Compliance health score (0-100)
- Actionable insights with priority levels
- Tax-saving recommendations
- Monthly GST summary reports
- Tax liability calculation by period

### GST Notices
- Track notices from GST department
- Various notice types (ASMT-10, DRC-01, etc.)
- Response due date tracking
- Status management (pending, resolved)

### Settings
- Business profile with GSTIN
- Multi-business support
- Invoice customization options
- Email notification preferences

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Business
- `GET /api/business` - Get business profiles
- `POST /api/business` - Create business profile
- `PATCH /api/business/:id` - Update business profile

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer
- `PATCH /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Vendors
- `GET /api/vendors` - List all vendors
- `POST /api/vendors` - Create vendor
- `PATCH /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor

### Invoices
- `GET /api/invoices` - List all invoices
- `POST /api/invoices` - Create invoice
- `PATCH /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Purchases
- `GET /api/purchases` - List all purchases
- `POST /api/purchases` - Create purchase
- `PATCH /api/purchases/:id` - Update purchase
- `DELETE /api/purchases/:id` - Delete purchase

### Filing Returns
- `GET /api/filing-returns` - List all filing returns
- `POST /api/filing-returns` - Create filing return
- `PATCH /api/filing-returns/:id` - Update filing return
- `POST /api/filing-returns/:id/auto-populate` - Auto-populate from invoices
- `POST /api/filing-returns/:id/file-nil` - File nil return

### Payments
- `GET /api/payments` - List all payments
- `POST /api/payments` - Create payment record
- `PATCH /api/payments/:id` - Update payment

### GST Intelligence
- `GET /api/tax-liability/:period` - Get tax liability for period
- `GET /api/compliance-score` - Get compliance health score
- `GET /api/insights` - Get actionable insights
- `GET /api/reports/monthly/:period` - Get monthly summary report
- `GET /api/late-fee/:returnType/:dueDate` - Calculate late fee & interest

### GST Notices
- `GET /api/gst-notices` - List all notices
- `POST /api/gst-notices` - Create notice
- `PATCH /api/gst-notices/:id` - Update notice

### Alerts
- `GET /api/alerts` - List all alerts
- `POST /api/send-reminders` - Send due date reminders

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Email OTP (passwordless)
- **Email**: Nodemailer with SMTP
- **Routing**: wouter
- **State**: TanStack Query
- **Forms**: react-hook-form with Zod validation
- **Build**: Vite

## Environment Variables
Required secrets:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration

## Running the Application
The application runs on port 5000 with both frontend and backend served together.

```bash
npm run dev
```

## Design System
Refer to `design_guidelines.md` for:
- Color palette (blue primary theme)
- Typography hierarchy (Inter font)
- Component patterns
- Responsive breakpoints
- Accessibility standards
