Electronics Shop Management & Installment Ledger System
A complete, production-ready full-stack management system designed specifically for physical electronics retail stores in Pakistan. Built to digitally manage dukan operations, stock inventory, customer credit ledgers with 2 Zamanatdar (Guarantors), installment financing plans with auto-markup and carry-forward re-amortization, daily expenses, 80mm POS thermal slip printing, real-time net profit auditing, a read-only AI data assistant, and human-readable automatic backups.

🌟 Key Business Features
1. Single Admin Security & Protection
Cookie-based HTTP-only JWT session authentication (immune to client-side XSS attacks).
Automatic Admin account verification from .env on server boot.
Master Deletion Security Lock (ALLOW_GLOBAL_DELETION): Global code-level protection that disables deletion buttons across all tables and displays an explicit "Only admin can unlock" badge to prevent accidental data loss.
2. Live Connected Control Dashboard
6 Spacious KPI Cards: Real-time metrics for Sales Revenue, Collections, Financed Dues, Audited Gross Profit, Operational Expenses, and After Expenses Net Profit (Khaalis Munafa).
Dual Tabbed Ledgers: Easily switch between Active Financing Customers Ledger and Cash Deals Ledger.
Daily Recovery Radar (Urgent Due Installments): Automatically scans and alerts about customers whose installments are due today or overdue, with direct 1-click WhatsApp reminder triggers.
Live Global Search Bar: Instantly queries customer names, mobile numbers, SKUs, and Invoice/Bill numbers across the entire dashboard.
Dynamic Date Range Filters & CSV Export: Filter the dashboard by Today, Weekly, Monthly, or Custom Range, and download Excel-ready CSV reports with 1 click.
3. Inventory Stock & Sequential Identifiers
Simple serial numbering format starting from 01, 02, 03...
Chronological line-wise display (oldest items stay at the top, like physical store registers).
Complete tracking for Serial Numbers, IMEI, Category, Supplier, Purchase Price, and Selling Price.
Automated stock deduction on checkout and automatic stock restoration on cancellation/returns.
Configurable Low-Stock and Out-of-Stock warning indicators.
4. Customers & 2 Zamanatdaar (Guarantors) System
Simplified Customer IDs starting from 01, 02, 03...
National Identity Card (CNIC) auto-formatting pattern (35401-1234567-1).
2 Dedicated Guarantors (Zamanti 1 & Zamanti 2): Store Name, Father Name, Mobile Number, CNIC, and Relation for safe installment recovery.
Customer Credit Scorecard & Past Purchases: Prominent badge indicating whether a buyer is 100% Clean (All Dues Cleared), High Risk (Overdue Dues), Active Account, or a New Customer, with a dedicated past purchases ledger.
5. Advanced Sales & Installment Recalculator
Custom / Manual Invoice Number (Bill No): Enter custom bill numbers (e.g. BILL-101, 1001) from your paper receipt books with duplicate detection.
Automated Markup Rates: 15% for 3 Months, 25% for 6 Months, and 50% for 12 Months calculated on the remaining balance after down-payment.
Rounding Resolver: Distributes decimal differences into the final installment to ensure exact balance matching.
Carry-Forward Re-Amortization: If a customer pays less than the due kist in a month, the system marks the month as paid and automatically distributes the unpaid balance equally among all future installments.
6. Payments & 80mm POS Thermal Slip Printing
Simple payment IDs starting from 01, 02, 03...
Invoice-Wise Classification Hub: Group payment receipts by Invoice Number or view a single sequential ledger.
Single-Page POS Thermal Slips: Clean 80mm slip layout formatted with dashed dividers, timestamps (Date & Time in AM/PM), product details, down payments, and signatures with zero page overflow or scrollbars.
Smart WhatsApp Reminders:
Before/On Due Date: Sends a polite installment reminder.
After Due Date (Overdue): Automatically drafts an urgent notice stating that the deadline has passed.
7. Product Returns & 1-Click Item Exchanges (Swaps)
Product Returns: Return items with automatic inventory stock restoration and dynamic installment schedule reduction.
Dynamic Product Swap / Exchange: Swap a product (e.g. Air Cooler to another Cooler, or iPhone to Android), restore old stock, deduct new stock, compute the price difference, and re-amortize the remaining installments automatically!
8. Daily Expenses & Income Statement Auditing
Log shop operational expenses vouchers (EXP-0001) with categories (Rent, Electricity, Salaries, Tea, Maintenance).
Real-time Income Statement: Sales Revenue - Cost of Sold Stock - Total Expenses = Net Profit.
9. Lifetime Yearly Audits (Historical Registers)
Digitize past years' manual paper registers (2022, 2023, 2024 onwards).
Full-width Buying Ledger (purchased stock) and Selling Ledger (sales checkouts & dynamic profits).
Smooth internal scrolling after 5 products with sticky table headers.
10. 🤖 AI Data Assistant (Read-Only)
Ask in Roman Urdu or English: "Ali ka udhaar kitna hai?", "aaj ki sale", "stock low products" — samajh kar jawab deta hai.
Local-first, zero-cost answers: Aam sawalat (sales, stock, khata, installments, payments, expenses, profits, due dates) foran Basic jawab dete hain — koi API quota kharch nahi hoti.
Smart typo tolerance: slae, cstomer, pymnt jaise typos aur synonyms (farokht, wasooli, nafa, udhar) automatically samajh leta hai.
Customer search by Name / Mobile / CNIC: Same naam ke multiple customers hon to mobile ya CNIC se exact pehchan — dashed aur plain dono formats supported (03001234567, 0300-1234567, 35202-1234567-1).
50 Smart messages per shop per day (Pakistan date): Sirf woh sawal jo local samajh na aaye, Groq AI se Smart jawab lete hain — quota khatam hone par bhi Basic sawalat muft chalte rehte hain.
Strictly read-only: AI sirf data parhta hai — customer banana, payment lena ya koi tabdeeli karna allowed nahi. Write intents ko politely refuse karta hai.
Live usage meter in the chat UI: ⚡ Smart 4/50.
11. 💾 Human-Readable TXT Backups
Automatic daily backup har raat 11:59 PM (Asia/Karachi) — plus 1-click manual backup from the Backup page.
Saved on your Desktop: Desktop/BACKUP/COMPLETE-BACKUP/ aur Desktop/BACKUP/DAILY-BACKUPS/ — ZIP me readable .txt files.
Har record ek nazar me samajh aata hai: Har sale, payment, installment, return ke top par Customer Name + Mobile, Product Name, Invoice Number — raw database IDs neeche chhupi hui.
Koi fazool data nahi: Fingerprint/biometric templates, khaali fields, duplicate IDs aur har record me dohra shopId backup me nahi aate.
Privacy-safe: Shop ki subscription/renewal history, login IPs aur device details backup se excluded hain (sirf superadmin dekh sakta hai).
Har ZIP me shamil: README.txt (wazahat), backup-summary.txt (ginti), shop.txt, aur har collection ki alag file.
12. 🖥️ Clean Developer Terminal
npm run dev par sirf zaroori lines: server URL, MongoDB status, backup folder aur daily schedule — koi debug shor nahi.
Backup chalne par sirf compact progress: Shop → Done. Total records: N.

🛠️ Technology Stack
Frontend: React.js (v18), Vite, Tailwind CSS, React Router (v6), Axios, Lucide React Icons.
Backend: Node.js, Express.js, MongoDB Atlas (Cloud), Mongoose (ODM), JSON Web Tokens (JWT), Cookie-Parser, Bcrypt.js, CORS, node-cron (daily backups), archiver (ZIP).
AI: Groq API (openai/gpt-oss-120b → 20b → qwen3 fallback chain) with local NLP engine.

📁 Monorepo Folder Structure
shop-management-system/
├── backend/
│   ├── config/             # MongoDB database connection configuration
│   ├── controllers/        # Business logic (Sale, Payment, Return, Audit, Expense, etc.)
│   ├── jobs/               # Scheduled background jobs
│   ├── middleware/         # Session authentication guards
│   ├── models/             # Mongoose database schemas
│   ├── routes/             # Express API endpoints
│   ├── services/           # AI agent, local search NLP, backup service
│   ├── utils/              # Token generators & helpers
│   ├── .env.example
│   ├── package.json
│   └── server.js           # Server entry point & Admin seeder
└── frontend/
    ├── src/
    │   ├── components/     # Master Layout, Sticky Sidebar, Protected Route wrapper
    │   ├── context/        # Auth and Settings global providers
    │   ├── pages/          # Complete views (Dashboard, Inventory, Customers,
    │   │                   #   AiAssistant, BackupPage, DueDates, Reports, etc.)
    │   ├── utils/          # API Axios instance & Master Security Switch (config.js)
    │   ├── App.jsx         # Router matrix map
    │   ├── index.css       # Tailwind directives
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    └── tailwind.config.js

⚙️ Environment Setup (AI & Backups)
# AI Assistant (Groq)
GROQ_API_KEY=your_groq_key_here
AI_MODEL=openai/gpt-oss-120b
AI_DAILY_LIMIT=50          # 0 = unlimited

# Admin seeding
ADMIN_EMAIL=admin@shop.com
ADMIN_PASSWORD=set_a_strong_password
⚠️ Security: Kabhi bhi asal API keys README ya chat me paste na karein — leak hone par foran revoke/rotate karein.