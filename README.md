# Electronics Shop Management & Installment Ledger System

A complete, production-ready full-stack management system designed specifically for physical electronics retail stores in Pakistan. Built to digitally manage dukan operations, stock inventory, customer credit ledgers with 2 Zamanatdar (Guarantors), installment financing plans with auto-markup and carry-forward re-amortization, daily expenses, 80mm POS thermal slip printing, and real-time net profit auditing.

---

## 🌟 Key Business Features

### 1. Single Admin Security & Protection
* Cookie-based HTTP-only JWT session authentication (immune to client-side XSS attacks).
* Automatic Admin account verification from `.env` on server boot.
* **Master Deletion Security Lock (`ALLOW_GLOBAL_DELETION`):** Global code-level protection that disables deletion buttons across all tables and displays an explicit *"Only admin can unlock"* badge to prevent accidental data loss.

### 2. Live Connected Control Dashboard
* **6 Spacious KPI Cards:** Real-time metrics for Sales Revenue, Collections, Financed Dues, Audited Gross Profit, Operational Expenses, and **After Expenses Net Profit (Khaalis Munafa)**.
* **Dual Tabbed Ledgers:** Easily switch between **Active Financing Customers Ledger** and **Cash Deals Ledger**.
* **Daily Recovery Radar (Urgent Due Installments):** Automatically scans and alerts about customers whose installments are due today or overdue, with direct 1-click WhatsApp reminder triggers.
* **Live Global Search Bar:** Instantly queries customer names, mobile numbers, SKUs, and Invoice/Bill numbers across the entire dashboard.
* **Dynamic Date Range Filters & CSV Export:** Filter the dashboard by *Today*, *Weekly*, *Monthly*, or *Custom Range*, and download Excel-ready CSV reports with 1 click.

### 3. Inventory Stock & Sequential Identifiers
* Simple serial numbering format starting from **`01`**, **`02`**, **`03`**...
* Chronological line-wise display (oldest items stay at the top, like physical store registers).
* Complete tracking for Serial Numbers, IMEI, Category, Supplier, Purchase Price, and Selling Price.
* Automated stock deduction on checkout and automatic stock restoration on cancellation/returns.
* Configurable Low-Stock and Out-of-Stock warning indicators.

### 4. Customers & 2 Zamanatdaar (Guarantors) System
* Simplified Customer IDs starting from **`01`**, **`02`**, **`03`**...
* National Identity Card (CNIC) auto-formatting pattern (`35401-1234567-1`).
* **2 Dedicated Guarantors (Zamanti 1 & Zamanti 2):** Store Name, Father Name, Mobile Number, CNIC, and Relation for safe installment recovery.
* **Customer Credit Scorecard & Past Purchases:** Prominent badge indicating whether a buyer is *100% Clean (All Dues Cleared)*, *High Risk (Overdue Dues)*, *Active Account*, or a *New Customer*, with a dedicated past purchases ledger.

### 5. Advanced Sales & Installment Recalculator
* **Custom / Manual Invoice Number (Bill No):** Enter custom bill numbers (e.g. `BILL-101`, `1001`) from your paper receipt books with duplicate detection.
* **Automated Markup Rates:** **15% for 3 Months**, **25% for 6 Months**, and **50% for 12 Months** calculated on the remaining balance after down-payment.
* **Rounding Resolver:** Distributes decimal differences into the final installment to ensure exact balance matching.
* **Carry-Forward Re-Amortization:** If a customer pays less than the due kist in a month, the system marks the month as paid and automatically distributes the unpaid balance equally among all future installments.

### 6. Payments & 80mm POS Thermal Slip Printing
* Simple payment IDs starting from **`01`**, **`02`**, **`03`**...
* **Invoice-Wise Classification Hub:** Group payment receipts by Invoice Number or view a single sequential ledger.
* **Single-Page POS Thermal Slips:** Clean 80mm slip layout formatted with dashed dividers, timestamps (**Date & Time in AM/PM**), product details, down payments, and signatures with zero page overflow or scrollbars.
* **Smart WhatsApp Reminders:**
  * *Before/On Due Date:* Sends a polite installment reminder.
  * *After Due Date (Overdue):* Automatically drafts an urgent notice stating that the deadline has passed.

### 7. Product Returns & 1-Click Item Exchanges (Swaps)
* **Product Returns:** Return items with automatic inventory stock restoration and dynamic installment schedule reduction.
* **Dynamic Product Swap / Exchange:** Swap a product (e.g. Air Cooler to another Cooler, or iPhone to Android), restore old stock, deduct new stock, compute the price difference, and re-amortize the remaining installments automatically!

### 8. Daily Expenses & Income Statement Auditing
* Log shop operational expenses vouchers (`EXP-0001`) with categories (Rent, Electricity, Salaries, Tea, Maintenance).
* Real-time Income Statement: **Sales Revenue - Cost of Sold Stock - Total Expenses = Net Profit**.

### 9. Lifetime Yearly Audits (Historical Registers)
* Digitize past years' manual paper registers (2022, 2023, 2024 onwards).
* Full-width Buying Ledger (purchased stock) and Selling Ledger (sales checkouts & dynamic profits).
* Smooth internal scrolling after 5 products with sticky table headers.

---

## 🛠️ Technology Stack

* **Frontend:** React.js (v18), Vite, Tailwind CSS, React Router (v6), Axios, Lucide React Icons.
* **Backend:** Node.js, Express.js, MongoDB Atlas (Cloud), Mongoose (ODM), JSON Web Tokens (JWT), Cookie-Parser, Bcrypt.js, CORS.

---

## 📁 Monorepo Folder Structure

```text
shop-management-system/
├── backend/
│   ├── config/             # MongoDB database connection configuration
│   ├── controllers/        # Business logic (Sale, Payment, Return, Audit, Expense, etc.)
│   ├── middleware/         # Session authentication guards
│   ├── models/             # Mongoose database schemas
│   ├── routes/             # Express API endpoints
│   ├── utils/              # Token generators & helpers
│   ├── .env.example
│   ├── package.json
│   └── server.js           # Server entry point & Admin seeder
└── frontend/
    ├── src/
    │   ├── components/     # Master Layout, Sticky Sidebar, Protected Route wrapper
    │   ├── context/        # Auth and Settings global providers
    │   ├── pages/          # Complete views (Dashboard, Inventory, Customers, etc.)
    │   ├── utils/          # API Axios instance & Master Security Switch (config.js)
    │   ├── App.jsx         # Router matrix map
    │   ├── index.css       # Tailwind directives
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    └── tailwind.config.js