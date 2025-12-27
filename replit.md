# GST Pro - Invoice & Filing Application

## Overview
GST Pro is a web application for Indian SMEs to manage GST-compliant invoices and track GST return filings. The application provides an intuitive interface for creating tax invoices, managing customers, and monitoring compliance deadlines.

## Current State
- MVP with core features implemented
- In-memory storage (data persists during session)
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
│   │   │   ├── use-theme.ts
│   │   │   └── use-toast.ts
│   │   ├── lib/           # Utility functions
│   │   ├── pages/         # Page components
│   │   │   ├── dashboard.tsx
│   │   │   ├── invoices.tsx
│   │   │   ├── invoice-create.tsx
│   │   │   ├── customers.tsx
│   │   │   ├── filing.tsx
│   │   │   └── settings.tsx
│   │   ├── App.tsx        # Main app with routing
│   │   └── index.css      # Global styles
├── server/                 # Backend Express server
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # In-memory data storage
│   └── index.ts           # Server entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Data models and validation
└── design_guidelines.md   # UI/UX design system
```

## Key Features

### Dashboard
- Overview statistics (invoices, revenue, GST payable)
- Upcoming filing deadlines
- Recent invoices list
- Compliance alerts

### Invoice Management
- Create GST-compliant tax invoices
- Auto GST calculation (CGST/SGST for intra-state, IGST for inter-state)
- HSN/SAC code suggestions
- Live invoice preview
- Multiple invoice types (Tax Invoice, Bill of Supply, Debit/Credit Notes)

### Customer Management
- Add/edit customers with GSTIN validation
- Customer GSTIN auto-validates format
- State auto-detection from GSTIN

### Filing Status Tracker
- Track GSTR-1, GSTR-3B, GSTR-9, CMP-08 returns
- Due date reminders
- Filing history

### Settings
- Business profile with GSTIN
- Auto-extract PAN and state from GSTIN
- Invoice customization options

## API Endpoints

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

### Business
- `GET /api/business` - Get business profile
- `POST /api/business` - Create business profile
- `PATCH /api/business/:id` - Update business profile

### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers` - Create customer
- `PATCH /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Invoices
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices` - Create invoice
- `PATCH /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Filing Returns
- `GET /api/filing-returns` - List all filing returns
- `POST /api/filing-returns` - Create filing return
- `PATCH /api/filing-returns/:id` - Update filing return

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Routing**: wouter
- **State**: TanStack Query
- **Forms**: react-hook-form with Zod validation
- **Build**: Vite

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
