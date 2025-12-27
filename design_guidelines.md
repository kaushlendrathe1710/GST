# GST Invoice & Filing Application - Design Guidelines

## Design Approach: Material Design System (Enterprise Data Application)

**Rationale:** This is a data-intensive business productivity tool requiring consistent patterns, robust form handling, and clear information hierarchy. Material Design provides the necessary structure for complex enterprise applications while remaining accessible to Indian SME users.

---

## Core Design Principles

1. **Clarity Over Cleverness** - Every interaction must be immediately understandable for non-technical business owners
2. **Data Density with Breathing Room** - Pack information efficiently while maintaining scanability
3. **Progressive Disclosure** - Show essential data first, detailed views on demand
4. **Mobile-First Compliance** - Critical tax deadlines accessed anywhere

---

## Layout System

**Container Strategy:**
- Dashboard max-width: `max-w-7xl` (full app wrapper)
- Content cards: `max-w-4xl` for forms, full-width for tables
- Spacing units: Tailwind `4, 6, 8, 12, 16` (p-4, gap-6, mb-8, py-12, mt-16)
- Grid layouts: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for cards/stats

**Key Layouts:**
- Dashboard: 3-column grid for metrics, 2-column for quick actions
- Invoice creation: Single column form with right sidebar preview
- Filing status: Table with expandable rows for details
- Reports: Full-width tables with fixed headers

---

## Typography Hierarchy

**Font Stack:** Inter (Google Fonts) - clean, professional, excellent for data
```
Headings: font-semibold
H1 (Page titles): text-2xl md:text-3xl
H2 (Section headers): text-xl md:text-2xl
H3 (Card titles): text-lg font-medium
Body: text-sm md:text-base
Data/Numbers: text-sm font-mono (for amounts, GSTIN)
Labels: text-xs uppercase tracking-wide text-gray-600
```

---

## Component Library

### Navigation
- **Top Bar:** Fixed header with business selector dropdown, notifications bell, user avatar
- **Sidebar (Desktop):** Collapsible navigation with icons, grouped sections (Invoices, Filing, Reports, Settings)
- **Bottom Nav (Mobile):** 5 primary actions (Dashboard, Create, Filing, Reports, More)

### Dashboard Components
- **Stat Cards:** 2x2 grid showing GST payable, ITC available, pending returns, upcoming deadlines
- **Quick Actions:** Prominent buttons for "Create Invoice", "File Return", "Upload Purchase"
- **Timeline:** Recent activity feed with invoice numbers, filing status
- **Alert Banners:** Urgent compliance warnings with red/amber indicators

### Forms (Invoice Creation Primary Use Case)
- **Multi-step Progress:** Stepper showing Invoice Details → Items → Preview → Generate
- **Input Fields:** Material-style floating labels, helper text below, validation inline
- **Autocomplete:** HSN codes, customer names with dropdown suggestions
- **Item Table:** Editable rows with add/remove, auto-calculate totals
- **Action Bar:** Sticky bottom bar with "Save Draft" and "Generate Invoice" CTAs

### Data Tables (Returns, Purchase Register)
- **Dense Table Mode:** Compact rows with hover highlight
- **Fixed Headers:** Sticky column headers on scroll
- **Row Actions:** Kebab menu for View/Edit/Download
- **Filters:** Top bar with date range, status chips, search
- **Pagination:** Bottom right with items-per-page selector

### Cards & Modals
- **Cards:** Subtle shadow, rounded corners (rounded-lg), p-6 padding
- **Modals:** Center overlay with backdrop blur, max-w-2xl for forms
- **Bottom Sheets (Mobile):** Slide-up panels for quick actions

### Status Indicators
- **Badges:** Rounded pills for "Filed", "Pending", "Overdue" states
- **Progress Rings:** Circular indicators for compliance score
- **Alerts:** Toast notifications (top-right) for success/error actions

---

## Responsive Behavior

**Breakpoints Strategy:**
- Mobile (< 768px): Single column, bottom nav, collapsible sections
- Tablet (768-1024px): 2-column grids, sidebar overlay
- Desktop (> 1024px): 3-column grids, persistent sidebar

**Critical Mobile Optimizations:**
- Tables convert to card views with stacked data
- Forms use full-width inputs with larger touch targets (min-h-12)
- Invoice preview as separate screen, not sidebar
- Swipe gestures for table row actions

---

## Interaction Patterns

**Minimal Animations:**
- Page transitions: Simple fade (200ms)
- Dropdown/modals: Slide + fade (150ms)
- Success states: Checkmark scale-in (300ms)
- Loading: Skeleton screens, NO spinners for data tables

**Feedback:**
- Button states: Subtle scale on click, disabled opacity
- Form validation: Red border + error text immediately below field
- Save actions: Inline "Saved" confirmation with timestamp

---

## Accessibility Standards

- All inputs have associated labels with `for` attributes
- ARIA labels on icon buttons
- Keyboard navigation for tables (arrow keys, Enter to expand)
- Focus indicators visible (ring offset)
- Color contrast WCAG AA minimum (4.5:1 for text)

---

## Images & Icons

**Icons:** Heroicons (outline for navigation, solid for alerts)
**Images:** 
- Empty states: Illustration placeholders for "No invoices yet"
- User avatars: Initials fallback for business/user profiles
- Document previews: PDF thumbnails in file manager
- NO hero images (this is a utility app, not marketing)

---

## Key Screens Structure

**Dashboard:** Stats grid → Quick actions → Alerts → Activity timeline → Help widget
**Invoice Creator:** Form (70%) + Live preview sidebar (30%)
**Filing Center:** Filter bar → Returns table → Filing history accordion
**Reports:** Date selector → Export buttons → Charts (if needed) → Detailed tables

---

**Production Notes:** Prioritize mobile responsiveness for invoice creation and filing status checks. Business owners access these features urgently during tax deadlines. Desktop can handle more information density for accounting review tasks.