/**
 * ============================================================================
 * NEXT-LEVEL SHOP AI BUSINESS INTELLIGENCE ASSISTANT
 * ============================================================================
 *
 * Database-first
 * Read-only
 * Natural Roman Urdu / Urdu / English
 * Customer / Product / Sale / Payment / Installment / Expense / Return
 * Past / Present / Future date intelligence
 * Query planner based routing
 *
 * IMPORTANT:
 * This service only READS data. It does not create/update/delete anything.
 */

const mongoose = require('mongoose');

const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const Installment = require('../models/Installment');
const InstallmentPlan = require('../models/InstallmentPlan');
const Expense = require('../models/Expense');
const Return = require('../models/Return');

/* ============================================================================
   1. BASIC UTILITIES
============================================================================ */

const extractShopId = (value) => {
  if (!value) return null;

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (
    typeof value === 'string' &&
    mongoose.Types.ObjectId.isValid(value.trim())
  ) {
    return new mongoose.Types.ObjectId(value.trim());
  }

  if (typeof value === 'object') {
    const candidates = [
      value.shopId,
      value._id,
      value.id,
      value.shop,
      value.shop?._id,
      value.shop?.id,
    ];

    for (const item of candidates) {
      const result = extractShopId(item);
      if (result) return result;
    }
  }

  return null;
};

const toObjectId = extractShopId;

const clean = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const normalize = (value) =>
  clean(value)
    .toLowerCase()
    .replace(/[’']/g, "'");

const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const money = (value) =>
  `Rs. ${safeNumber(value).toLocaleString('en-PK')}`;

const formatDate = (value) => {
  if (!value) return 'N/A';

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return 'N/A';
  }

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getCustomerName = (customer) => {
  if (!customer) return 'Walk-in Customer';

  if (typeof customer === 'string') {
    return customer;
  }

  return (
    customer.fullName ||
    customer.name ||
    customer.customerName ||
    [customer.firstName, customer.lastName]
      .filter(Boolean)
      .join(' ') ||
    customer.customerId ||
    'Customer'
  );
};

const getCustomerPhone = (customer) => {
  if (!customer || typeof customer === 'string') {
    return 'N/A';
  }

  return (
    customer.mobileNumber ||
    customer.phone ||
    customer.mobile ||
    customer.contact ||
    customer.phoneNumber ||
    'N/A'
  );
};

const getProductName = (product) => {
  if (!product) return 'Product';

  if (typeof product === 'string') {
    return product;
  }

  return (
    product.name ||
    product.title ||
    product.productName ||
    [product.brand, product.model]
      .filter(Boolean)
      .join(' ') ||
    'Product'
  );
};

const getSaleAmount = (sale) =>
  safeNumber(
    sale?.finalTotal ??
      sale?.totalWithMarkup ??
      sale?.totalAmount ??
      sale?.grandTotal ??
      sale?.amount
  );

const isInstallmentSale = (sale) =>
  /install/i.test(
    String(
      sale?.paymentType ||
        sale?.saleType ||
        sale?.paymentMethod ||
        ''
    )
  );

const isArchivedPayment = (payment) =>
  payment?.isArchived === true;

/* ============================================================================
   2. DATE ENGINE
============================================================================ */

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const addDays = (date, amount) => {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(amount));
  return d;
};

const MONTHS = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const buildRange = (start, end, label, extra = {}) => ({
  startDate: startOfDay(start),
  endDate: endOfDay(end),
  label,
  ...extra,
});

const resolveDateRange = (queryText) => {
  const text = normalize(queryText);
  const now = new Date();

  /* Explicit date: 16/09/2026, 16-09-2026, 16.09.2026 */
  const explicit = text.match(
    /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/
  );

  if (explicit) {
    const day = Number(explicit[1]);
    const month = Number(explicit[2]) - 1;
    const year = Number(explicit[3]);

    const date = new Date(year, month, day);

    if (!Number.isNaN(date.getTime())) {
      return buildRange(
        date,
        date,
        formatDate(date),
        { isSpecificDate: true }
      );
    }
  }

  /* ISO date */
  const iso = text.match(
    /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/
  );

  if (iso) {
    const date = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3])
    );

    return buildRange(
      date,
      date,
      formatDate(date),
      { isSpecificDate: true }
    );
  }

  /* Today */
  if (
    /\b(today|aaj|aj|aaj ka|aaj ki|aaj ke|current day|aaj wala din)\b/i.test(
      text
    )
  ) {
    return buildRange(
      now,
      now,
      'Today (Aaj)',
      { isToday: true }
    );
  }

 /* Tomorrow / Kal */
if (
  /\b(kal|tomorrow|agla kal|agle kal|aane wala kal|next day)\b/i.test(text)
) {
  const d = addDays(now, 1);

  return buildRange(
    d,
    d,
    'Tomorrow (Kal)',
    {
      isTomorrow: true,
      isFuture: true,
    }
  );
}


if (
  /\b(yesterday|guzishta kal|pichla kal|guzra kal)\b/i.test(text)
) {
  const d = addDays(now, -1);

  return buildRange(
    d,
    d,
    'Yesterday (Guzishta Kal)',
    {
      isYesterday: true,
      isPast: true,
    }
  );
}


  /* This week */
  if (
    /\b(this week|is week|iss week|is haftay|iss haftay|ye hafta)\b/i.test(
      text
    )
  ) {
    const start = new Date(now);
    const day = start.getDay();

    start.setDate(start.getDate() - day);

    return buildRange(
      start,
      now,
      'This Week'
    );
  }

  /* Last week */
  if (
    /\b(last week|pichlay haftay|pichle haftay|guzishta hafta)\b/i.test(
      text
    )
  ) {
    const currentStart = new Date(now);
    currentStart.setDate(
      currentStart.getDate() - currentStart.getDay()
    );

    const start = addDays(currentStart, -7);
    const end = addDays(start, 6);

    return buildRange(
      start,
      end,
      'Last Week',
      { isPast: true }
    );
  }

  /* Next week */
  if (
    /\b(next week|agla hafta|agle haftay|aane wala hafta)\b/i.test(
      text
    )
  ) {
    const currentStart = new Date(now);

    currentStart.setDate(
      currentStart.getDate() -
        currentStart.getDay() +
        7
    );

    const end = addDays(currentStart, 6);

    return buildRange(
      currentStart,
      end,
      'Next Week',
      { isFuture: true }
    );
  }

  /* This month */
  if (
    /\b(this month|is month|iss month|is mahine|iss mahine|ye mahina)\b/i.test(
      text
    )
  ) {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    return buildRange(
      start,
      now,
      now.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    );
  }

  /* Last month */
  if (
    /\b(last month|pichlay mahine|pichle mahine|guzishta mahina)\b/i.test(
      text
    )
  ) {
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      0
    );

    return buildRange(
      start,
      end,
      'Last Month',
      { isPast: true }
    );
  }

  /* Next month */
  if (
    /\b(next month|agla mahina|agle mahine|aane wala mahina)\b/i.test(
      text
    )
  ) {
    const start = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 2,
      0
    );

    return buildRange(
      start,
      end,
      'Next Month',
      { isFuture: true }
    );
  }

  /* Last N days */
  const lastDays = text.match(
    /\b(last|past|pichlay|pichle|guzishta)\s+(\d{1,3})\s*(days|day|din)?\b/i
  );

  if (lastDays) {
    const days = Math.min(
      Number(lastDays[2]),
      365
    );

    return buildRange(
      addDays(now, -days),
      now,
      `Last ${days} Days`,
      { isPast: true }
    );
  }

  /* Next N days */
  const nextDays = text.match(
    /\b(next|upcoming|aglay|agle|aane wale)\s+(\d{1,3})\s*(days|day|din)?\b/i
  );

  if (nextDays) {
    const days = Math.min(
      Number(nextDays[2]),
      180
    );

    return buildRange(
      addDays(now, 1),
      addDays(now, days),
      `Next ${days} Days`,
      { isFuture: true }
    );
  }

  /* Month names */
  for (const [name, index] of Object.entries(MONTHS)) {
    const regex = new RegExp(
      `\\b${name}\\b(?:\\s+(20\\d{2}))?`,
      'i'
    );

    const match = text.match(regex);

    if (match) {
      const year = match[1]
        ? Number(match[1])
        : now.getFullYear();

      const start = new Date(
        year,
        index,
        1
      );

      const end = new Date(
        year,
        index + 1,
        0
      );

      return buildRange(
        start,
        end,
        start.toLocaleString('en-US', {
          month: 'long',
          year: 'numeric',
        })
      );
    }
  }

  return null;
};

/* ============================================================================
   3. DATE FIELD BUILDERS
============================================================================ */

const dateOrQuery = (
  fields,
  range
) => ({
  $or: fields.map((field) => ({
    [field]: {
      $gte: range.startDate,
      $lte: range.endDate,
    },
  })),
});

const defaultTodayRange = () =>
  buildRange(
    new Date(),
    new Date(),
    'Today (Aaj)'
  );

/* ============================================================================
   4. ENTITY SEARCH
============================================================================ */

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'what',
  'which',
  'who',
  'where',
  'when',
  'why',
  'how',
  'much',
  'many',
  'show',
  'give',
  'tell',
  'find',
  'search',
  'get',
  'me',
  'please',
  'my',
  'shop',
  'mein',
  'mai',
  'main',
  'ki',
  'ka',
  'ke',
  'ko',
  'ne',
  'se',
  'pe',
  'par',
  'aur',
  'or',
  'hai',
  'hain',
  'tha',
  'thi',
  'the',
  'kya',
  'kon',
  'kab',
  'kahan',
  'kitna',
  'kitni',
  'total',
  'batao',
  'btao',
  'dikhao',
  'dikhaye',
  'dekhao',
  'mujhe',
  'mere',
  'meri',
  'mera',
  'record',
  'details',
  'hisab',
  'hisaab',
  'status',
  'please',
  'kindly',
  'customer',
  'customers',
  'product',
  'products',
  'sale',
  'sales',
  'payment',
  'payments',
  'installment',
  'installments',
  'expense',
  'expenses',
  'stock',
  'inventory',
]);

const extractSearchTokens = (query) =>
  clean(query)
    .split(/[\s,/:;!?()[\]{}"']+/)
    .map((x) => x.trim().toLowerCase())
    .filter(
      (x) =>
        x.length >= 2 &&
        !STOP_WORDS.has(x) &&
        !/^\d{1,2}$/.test(x)
    );

const escapeRegex = (value) =>
  String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

const resolveCustomer = async (
  queryText,
  shopId
) => {
  const shopObjId = toObjectId(shopId);

  if (!shopObjId) return [];

  const raw = clean(queryText);

  /*
   * ------------------------------------------------------------
   * 1. EXACT PHONE / CNIC / CUSTOMER ID
   * ------------------------------------------------------------
   */

  const numericMatches =
    raw.match(/\b\d{7,15}\b/g) || [];

  if (numericMatches.length) {
    for (const number of numericMatches) {
      const exact =
        await Customer.findOne({
          shopId: shopObjId,
          $or: [
            { mobileNumber: number },
            { phone: number },
            { mobile: number },
            { contact: number },
            { phoneNumber: number },
            { cnic: number },
            { customerId: number },
          ],
        }).lean();

      if (exact) {
        return [exact];
      }
    }
  }

  /*
   * ------------------------------------------------------------
   * 2. SEARCH TOKENS
   * ------------------------------------------------------------
   */

  const tokens =
    extractSearchTokens(raw);

  if (!tokens.length) {
    return [];
  }

  /*
   * ------------------------------------------------------------
   * 3. BUILD SEARCH REGEX
   * ------------------------------------------------------------
   */

  const regexes =
    tokens.map(
      (token) =>
        new RegExp(
          escapeRegex(token),
          'i'
        )
    );

  /*
   * ------------------------------------------------------------
   * 4. GET CANDIDATES
   * ------------------------------------------------------------
   */

  const candidates =
    await Customer.find({
      shopId: shopObjId,
      $or: regexes.flatMap(
        (regex) => [
          { fullName: regex },
          { name: regex },
          { customerName: regex },
          { customerId: regex },
          { mobileNumber: regex },
          { phone: regex },
          { mobile: regex },
          { cnic: regex },
        ]
      ),
    })
      .limit(50)
      .lean();

  if (!candidates.length) {
    return [];
  }

  /*
   * ------------------------------------------------------------
   * 5. SCORE EACH CUSTOMER
   * ------------------------------------------------------------
   *
   * Exact token matches get higher score.
   * This prevents random customers from winning.
   */

  const scored =
    candidates.map(
      (customer) => {
        const searchable = normalize(
          [
            customer.fullName,
            customer.name,
            customer.customerName,
            customer.customerId,
            customer.mobileNumber,
            customer.phone,
            customer.mobile,
            customer.cnic,
          ]
            .filter(Boolean)
            .join(' ')
        );

        const fullName =
          normalize(
            customer.fullName ||
              customer.name ||
              customer.customerName ||
              ''
          );

        let score = 0;

        for (const token of tokens) {
          if (!token) continue;

          /*
           * Exact full-name token
           */
          if (
            fullName
              .split(/\s+/)
              .includes(token)
          ) {
            score += 20;
          }

          /*
           * Full name contains token
           */
          if (
            fullName.includes(token)
          ) {
            score += 10;
          }

          /*
           * Any customer field contains token
           */
          if (
            searchable.includes(token)
          ) {
            score += 5;
          }
        }

        /*
         * Exact complete name query
         */
        const rawName =
          normalize(raw);

        if (
          fullName &&
          (
            rawName.includes(
              fullName
            ) ||
            fullName.includes(
              rawName
            )
          )
        ) {
          score += 50;
        }

        return {
          customer,
          score,
        };
      }
    );

  /*
   * ------------------------------------------------------------
   * 6. SORT BEST MATCH FIRST
   * ------------------------------------------------------------
   */

  scored.sort(
    (a, b) =>
      b.score - a.score
  );

  /*
   * ------------------------------------------------------------
   * 7. REMOVE VERY WEAK MATCHES
   * ------------------------------------------------------------
   */

  const strongMatches =
    scored.filter(
      (item) =>
        item.score >= 10
    );

  return strongMatches
    .slice(0, 15)
    .map(
      (item) =>
        item.customer
    );
};
/* ============================================================================
   5. INTENT / QUERY PLANNER
============================================================================ */

const hasAny = (text, words) =>
  words.some((word) =>
    text.includes(word)
  );

const buildQueryPlan = (rawText) => {
  const text = normalize(rawText);

  const plan = {
    target: 'shop',
    action: 'overview',
    dateRange: resolveDateRange(rawText),
    wantsDetails: false,
    wantsTotal: false,
    wantsList: false,
    wantsFuture: false,
    wantsPast: false,
    wantsToday: false,
    wantsCustomer: false,
    wantsProduct: false,
  };

  /* ---------------- CUSTOMER ---------------- */

  if (
    hasAny(text, [
      'customer',
      'customer ka',
      'customer ki',
      'customer ke',
      'grahak',
      'client',
      'buyer',
    ])
  ) {
    plan.wantsCustomer = true;
  }

  /* ---------------- PRODUCT ---------------- */

  if (
    hasAny(text, [
      'product',
      'product ka',
      'product ki',
      'item',
      'maal',
      'model',
      'sku',
    ])
  ) {
    plan.wantsProduct = true;
  }

  /* ---------------- INSTALLMENTS ---------------- */

  const installmentIntent =
    hasAny(text, [
      'installment',
      'installments',
      'installment schedule',
      'qist',
      'qistain',
      'qiston',
      'kist',
      'kistain',
      'kiston',
      'installment due',
      'due installment',
      'qist kab',
      'agli qist',
      'next installment',
      'monthly payment',
      'monthly payments',
    ]);

  if (installmentIntent) {
    plan.target = 'installment';
    plan.action = 'schedule';
  }

  /* ---------------- PAYMENT HISTORY ---------------- */
/* ---------------- PAYMENTS / COLLECTIONS ---------------- */

const paymentHistoryIntent =
  hasAny(text, [
    'payment history',
    'payments history',
    'payment record',
    'payments record',
    'payment detail',
    'payment details',
    'payment dikhao',
    'payments dikhao',
    'payment show',
    'payments show',
    'payment list',
    'payments list',
    'payment kab kab',
    'payments kab kab',
    'kitna pay kiya',
    'kitna paid kiya',
    'kitne payments',
    'kitni payments',
    'payment receive',
    'payments receive',
    'payment received',
    'payments received',
    'receive hui',
    'receive hua',
    'receive huay',
    'receive hue',
    'received',
    'jama kitna',
    'jama kiya',
    'jama hua',
    'jama hui',
    'kitna jama',
    'kitni payment',
    'paisa aya',
    'paisa aaya',
    'payment ayi',
    'payment aayi',
    'payments ayi',
    'payments aayi',
    'collection',
    'collections',
    'payment collection',
    'total collection',
    'total payments',
    'payment details',
    'paid history',
  ]);

if (paymentHistoryIntent) {
  plan.target = 'payment';
  plan.action = 'history';
}

  /* ---------------- SALES ---------------- */

  const salesIntent =
    hasAny(text, [
      'sale',
      'sales',
      'sold',
      'selling',
      'bikri',
      'bika',
      'biki',
      'becha',
      'bechi',
      'revenue',
      'sale record',
      'sales record',
      'sales detail',
      'cash sale',
      'cash sales',
      'installment sale',
      'installment sales',
    ]);

  if (salesIntent) {
    plan.target = 'sales';
    plan.action = 'report';
  }

  /* ---------------- EXPENSES ---------------- */

  const expenseIntent =
    hasAny(text, [
      'expense',
      'expenses',
      'expence',
      'expences',
      'kharcha',
      'kharchay',
      'kharch',
      'kharche',
      'rent',
      'bijli',
      'electricity',
      'salary',
      'petrol',
      'bill',
      'bills',
    ]);

  if (expenseIntent) {
    plan.target = 'expense';
    plan.action = 'report';
  }

  /* ---------------- OVERDUE ---------------- */

  const overdueIntent =
    hasAny(text, [
      'overdue',
      'over due',
      'late',
      'late payment',
      'defaulter',
      'defaulters',
      'pending due',
      'arrears',
      'baki qist',
      'qist baki',
      'nahi di',
      'late customer',
      'kon late',
      'kaun late',
    ]);

  if (overdueIntent) {
    plan.target = 'overdue';
    plan.action = 'report';
  }

  /* ---------------- RECEIVABLES ---------------- */

  const receivableIntent =
    hasAny(text, [
      'receivable',
      'receivables',
      'market balance',
      'market se kitna lena',
      'kis kis se lena',
      'total udhar',
      'total udhaar',
      'udhar kitna',
      'customer se kitna lena',
      'customers se kitna lena',
      'outstanding',
      'outstanding balance',
      'remaining balance',
      'baqi balance',
      'baqi paisa',
    ]);

  if (receivableIntent) {
    plan.target = 'receivable';
    plan.action = 'report';
  }

  /* ---------------- INVENTORY ---------------- */

  const inventoryIntent =
    hasAny(text, [
      'inventory',
      'complete inventory',
      'sari inventory',
      'puri inventory',
      'all stock',
      'tamam stock',
      'total stock',
      'stock report',
      'stock ki report',
      'stock list',
    ]);

  if (inventoryIntent) {
    plan.target = 'inventory';
    plan.action = 'report';
  }

  /* ---------------- STOCK ---------------- */

  const stockIntent =
    hasAny(text, [
      'stock',
      'quantity',
      'qty',
      'kitne pieces',
      'kitne hain',
      'available',
      'available stock',
      'maal kitna',
    ]);

  if (
    stockIntent &&
    plan.target === 'shop'
  ) {
    plan.target = 'stock';
    plan.action = 'report';
  }

  /* ---------------- TOP SELLING ---------------- */

  const topSellingIntent =
    hasAny(text, [
      'top selling',
      'top sellers',
      'best seller',
      'best selling',
      'sab se zyada bika',
      'zyada bika',
      'most sold',
      'popular products',
      'high demand',
      'demand wali',
      'demand products',
    ]);

  if (topSellingIntent) {
    plan.target = 'topSelling';
    plan.action = 'report';
  }

  /* ---------------- RETURNS / REFUNDS ---------------- */

  const returnIntent =
    hasAny(text, [
      'return',
      'returns',
      'returned',
      'refund',
      'refunds',
      'wapas maal',
      'maal wapas',
      'customer refund',
      'refund kitna',
    ]);

  if (returnIntent) {
    plan.target = 'returns';
    plan.action = 'report';
  }

  /* ---------------- CASH FLOW ---------------- */

  const cashFlowIntent =
    hasAny(text, [
      'cash flow',
      'money in',
      'money out',
      'paisa aya',
      'paisa gaya',
      'kitna paisa aya',
      'kitna paisa gaya',
      'kitna aya aur kitna gaya',
      'cash aya',
      'cash gaya',
    ]);

  if (cashFlowIntent) {
    plan.target = 'cashflow';
    plan.action = 'report';
  }

  /* ---------------- PROFIT ---------------- */

  const profitIntent =
    hasAny(text, [
      'profit',
      'profit kitna',
      'munafa',
      'faida',
      'earning',
      'kamai',
      'margin',
      'net profit',
      'gross profit',
    ]);

  if (profitIntent) {
    plan.target = 'profit';
    plan.action = 'report';
  }

  /* ---------------- DAILY / BUSINESS SUMMARY ---------------- */

  const briefingIntent =
    hasAny(text, [
      'aaj kya hua',
      'aj kya hua',
      'today summary',
      'today briefing',
      'daily briefing',
      'daily summary',
      'aaj ka hisab',
      'aaj ki report',
      'aaj ka business',
      'kal kya hua',
      'kal ka hisab',
      'business summary',
      'shop summary',
      'shop overview',
      'overall shop',
      'complete hisaab',
      'complete hisab',
      'dukan ka hisab',
    ]);

  if (briefingIntent) {
    plan.target = 'briefing';
    plan.action = 'report';
  }

  /* ---------------- GENERIC QUESTIONS ---------------- */

  if (
    /\b(total|kitna|kitni|how much|how many|record|details|list|show|dikhao|batao)\b/i.test(
      text
    )
  ) {
    plan.wantsDetails = true;
  }

  if (
    /\b(total|kitna|kitni|how much|sum|jama)\b/i.test(
      text
    )
  ) {
    plan.wantsTotal = true;
  }

  if (
    /\b(list|details|detail|record|history|schedule|dikhao|show)\b/i.test(
      text
    )
  ) {
    plan.wantsList = true;
  }

  if (
    plan.dateRange?.isFuture
  ) {
    plan.wantsFuture = true;
  }

  if (
    plan.dateRange?.isPast ||
    plan.dateRange?.isYesterday
  ) {
    plan.wantsPast = true;
  }

  if (
    plan.dateRange?.isToday
  ) {
    plan.wantsToday = true;
  }

  return plan;
};

/* ============================================================================
   6. CUSTOMER PAYMENT HISTORY
============================================================================ */

const buildCustomerPaymentHistory = async (
  customer,
  shopId,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const query = {
    shopId: shopObjId,
    customer: customer._id,
    isArchived: { $ne: true },
  };

  if (dateRange) {
    Object.assign(
      query,
      dateOrQuery(
        ['paymentDate', 'date', 'createdAt'],
        dateRange
      )
    );
  }

  const payments = await Payment.find(query)
    .sort({
      paymentDate: -1,
      createdAt: -1,
    })
    .lean();

  if (!payments.length) {
    return [
      `💳 PAYMENT HISTORY`,
      `👤 ${getCustomerName(customer)}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `❌ Is period mein koi payment record nahi mila.`,
      dateRange
        ? `📅 Period: ${dateRange.label}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  const total = payments.reduce(
    (sum, p) =>
      sum + safeNumber(p.amount),
    0
  );

  const lines = [
    `💳 PAYMENT HISTORY`,
    `👤 Customer: ${getCustomerName(customer)}`,
    `📱 ${getCustomerPhone(customer)}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    dateRange
      ? `📅 Period: ${dateRange.label}`
      : `📅 Period: All Available Records`,
    `💰 Total Paid: ${money(total)}`,
    `🧾 Payment Entries: ${payments.length}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Payment Details:`,
    '',
  ];

  payments.forEach((payment, index) => {
    const date =
      payment.paymentDate ||
      payment.date ||
      payment.createdAt;

    lines.push(
      `${index + 1}. ${money(payment.amount)} — ${formatDate(date)}`
    );

    if (payment.paymentMethod) {
      lines.push(
        `   Method: ${payment.paymentMethod}`
      );
    }

    if (payment.installmentNumber) {
      lines.push(
        `   Installment: #${payment.installmentNumber}`
      );
    }

    if (payment.note) {
      lines.push(
        `   Note: ${payment.note}`
      );
    }
  });

  return lines.join('\n');
};


/* ============================================================================
   SHOP-WIDE PAYMENT REPORT
   Shows:
   - Customer
   - Amount
   - Payment type / method
   - Installment number if available
   - Date
   - Note
   - Total
============================================================================ */

const getPaymentType = (payment) => {
  /*
   * Database mein agar payment type directly stored hai
   * to usko priority dein.
   */
  const directType =
    payment?.paymentType ||
    payment?.type ||
    payment?.transactionType ||
    payment?.paymentFor ||
    payment?.category;

  if (directType) {
    const value = String(directType).trim();

    if (/install/i.test(value)) {
      return '📆 Installment Payment';
    }

    if (/advance/i.test(value)) {
      return '💵 Advance Payment';
    }

    if (/down.?payment/i.test(value)) {
      return '💰 Down Payment';
    }

    if (/cash/i.test(value)) {
      return '💵 Cash Payment';
    }

    if (/refund/i.test(value)) {
      return '↩️ Refund';
    }

    return `💳 ${value}`;
  }

  /*
   * Agar payment mein installment reference/number hai
   * to usay installment payment samjhein.
   */
  if (
    payment?.installment ||
    payment?.installmentId ||
    payment?.installmentPlan ||
    payment?.installmentNumber
  ) {
    return '📆 Installment Payment';
  }

  /*
   * Agar down payment ka flag/type available ho.
   */
  if (
    payment?.isDownPayment === true ||
    payment?.downPayment === true
  ) {
    return '💰 Down Payment';
  }

  /*
   * Agar method available hai.
   */
  if (payment?.paymentMethod) {
    return `💳 ${payment.paymentMethod}`;
  }

  return '💳 Payment';
};


const buildShopPaymentReport = async (
  shopId,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const range =
    dateRange || defaultTodayRange();

  const payments = await Payment.find({
    shopId: shopObjId,
    isArchived: {
      $ne: true,
    },
    ...dateOrQuery(
      [
        'paymentDate',
        'date',
        'createdAt',
      ],
      range
    ),
  })
    .populate(
      'customer',
      'fullName name customerName mobileNumber phone customerId cnic'
    )
    .sort({
      paymentDate: -1,
      date: -1,
      createdAt: -1,
    })
    .lean();

  if (!payments.length) {
    return [
      `💳 PAYMENT REPORT`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📅 Period: ${range.label}`,
      ``,
      `❌ Is period mein koi payment receive nahi hui.`,
    ].join('\n');
  }

  const totalReceived =
    payments.reduce(
      (sum, payment) =>
        sum + safeNumber(payment.amount),
      0
    );

  /*
   * Payment types ka summary
   */
  const typeMap = new Map();

  payments.forEach((payment) => {
    const type = getPaymentType(payment);

    if (!typeMap.has(type)) {
      typeMap.set(type, {
        count: 0,
        amount: 0,
      });
    }

    const item = typeMap.get(type);

    item.count += 1;
    item.amount += safeNumber(
      payment.amount
    );
  });

  const lines = [
    `💳 PAYMENT REPORT`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 Period: ${range.label}`,
    `🧾 Payment Entries: ${payments.length}`,
    `💰 Total Received: ${money(
      totalReceived
    )}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📊 PAYMENT TYPE SUMMARY`,
    ``,
  ];

  for (const [type, data] of typeMap.entries()) {
    lines.push(
      `${type}: ${data.count} — ${money(
        data.amount
      )}`
    );
  }

  lines.push(
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💳 PAYMENT DETAILS`,
    ``
  );

  payments.forEach(
    (payment, index) => {
      const customer =
        payment.customer;

      const amount =
        safeNumber(
          payment.amount
        );

      const paymentDate =
        payment.paymentDate ||
        payment.date ||
        payment.createdAt;

      const paymentType =
        getPaymentType(payment);

      lines.push(
        `${index + 1}. 👤 ${getCustomerName(
          customer
        )}`
      );

      /*
       * Customer phone
       */
      if (customer) {
        lines.push(
          `   📱 ${getCustomerPhone(
            customer
          )}`
        );
      }

      /*
       * Customer ID
       */
      if (
        customer?.customerId
      ) {
        lines.push(
          `   🪪 Customer ID: ${customer.customerId}`
        );
      }

      /*
       * Amount
       */
      lines.push(
        `   💰 Amount: ${money(
          amount
        )}`
      );

      /*
       * Payment type
       */
      lines.push(
        `   ${paymentType}`
      );

      /*
       * Payment method
       */
      if (
        payment.paymentMethod
      ) {
        lines.push(
          `   💳 Method: ${payment.paymentMethod}`
        );
      }

      /*
       * Installment number
       */
      if (
        payment.installmentNumber !==
        undefined &&
        payment.installmentNumber !==
        null
      ) {
        lines.push(
          `   📆 Installment #${payment.installmentNumber}`
        );
      }

      /*
       * Invoice / Sale reference
       */
      if (
        payment.invoiceNumber ||
        payment.saleId ||
        payment.invoiceId
      ) {
        lines.push(
          `   🧾 Reference: ${
            payment.invoiceNumber ||
            payment.saleId ||
            payment.invoiceId
          }`
        );
      }

      /*
       * Date
       */
      lines.push(
        `   📅 Date: ${formatDate(
          paymentDate
        )}`
      );

      /*
       * Time if available
       */
      const paymentDateObj =
        paymentDate
          ? new Date(paymentDate)
          : null;

      if (
        paymentDateObj &&
        !Number.isNaN(
          paymentDateObj.getTime()
        )
      ) {
        lines.push(
          `   🕐 Time: ${paymentDateObj.toLocaleTimeString(
            'en-PK',
            {
              hour: '2-digit',
              minute: '2-digit',
            }
          )}`
        );
      }

      /*
       * Note / remarks
       */
      if (
        payment.note ||
        payment.notes ||
        payment.description ||
        payment.remarks
      ) {
        lines.push(
          `   📝 Note: ${
            payment.note ||
            payment.notes ||
            payment.description ||
            payment.remarks
          }`
        );
      }

      lines.push('');
    }
  );

  lines.push(
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💰 TOTAL RECEIVED: ${money(
      totalReceived
    )}`,
    `🧾 TOTAL PAYMENTS: ${payments.length}`
  );

  return lines.join('\n');
};

/* ============================================================================
   7. CUSTOMER INSTALLMENT SCHEDULE
============================================================================ */

const buildCustomerInstallmentSchedule = async (
  customer,
  shopId,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const plans =
    await InstallmentPlan.find({
      shopId: shopObjId,
      customer: customer._id,
    })
      .populate(
        'product',
        'name title brand model'
      )
      .sort({ createdAt: -1 })
      .lean();

  if (!plans.length) {
    return [
      `📆 INSTALLMENT SCHEDULE`,
      `👤 ${getCustomerName(customer)}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `❌ Is customer ka koi installment plan nahi mila.`,
    ].join('\n');
  }

  const planIds = plans.map(
    (p) => p._id
  );

  const installments =
    await Installment.find({
      shopId: shopObjId,
      installmentPlan: {
        $in: planIds,
      },
    })
      .sort({
        dueDate: 1,
        installmentNumber: 1,
      })
      .lean();

  let filtered = installments;

  if (dateRange) {
    filtered = installments.filter(
      (i) => {
        const date = new Date(
          i.dueDate
        );

        return (
          date >= dateRange.startDate &&
          date <= dateRange.endDate
        );
      }
    );
  }

  const today = startOfDay(
    new Date()
  );

  const lines = [
    `📆 INSTALLMENT SCHEDULE`,
    `👤 Customer: ${getCustomerName(customer)}`,
    `📱 ${getCustomerPhone(customer)}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  if (dateRange) {
    lines.push(
      `📅 Filter: ${dateRange.label}`
    );
  }

  for (const plan of plans) {
    const planInstallments =
      filtered.filter(
        (i) =>
          String(
            i.installmentPlan
          ) ===
          String(plan._id)
      );

    if (
      dateRange &&
      !planInstallments.length
    ) {
      continue;
    }

    lines.push(
      `📦 Product: ${getProductName(
        plan.product
      )}`
    );

    lines.push(
      `💰 Plan Total: ${money(
        plan.totalAmount
      )}`
    );

    lines.push(
      `💳 Remaining: ${money(
        plan.remainingBalance
      )}`
    );

    lines.push(
      `📋 Installments: ${
        planInstallments.length
      }`
    );

    lines.push(
      `─────────────────────────────────`
    );

    planInstallments.forEach(
      (inst) => {
        const due = startOfDay(
          inst.dueDate
        );

        const amount =
          safeNumber(inst.amount);

        const remaining =
          safeNumber(
            inst.remainingAmount
          );

        const paid =
          Math.max(
            0,
            amount - remaining
          );

        let status;

        if (
          remaining <= 0 ||
          String(
            inst.status
          ).toLowerCase() ===
            'paid'
        ) {
          status = '✅ PAID';
        } else if (
          due < today
        ) {
          status = '⚠️ OVERDUE';
        } else if (
          due.getTime() ===
          today.getTime()
        ) {
          status = '⏳ DUE TODAY';
        } else {
          status = '📆 UPCOMING';
        }

        lines.push(
          `• Inst #${inst.installmentNumber || '-'}`
        );

        lines.push(
          `  📅 Due: ${formatDate(
            inst.dueDate
          )}`
        );

        lines.push(
          `  💰 Amount: ${money(
            amount
          )}`
        );

        lines.push(
          `  💳 Paid: ${money(paid)}`
        );

        lines.push(
          `  🔴 Remaining: ${money(
            remaining
          )}`
        );

        lines.push(
          `  Status: ${status}`
        );

        lines.push('');
      }
    );
  }

  if (
    lines.length <=
    6
  ) {
    lines.push(
      `❌ Is date range mein koi installment due nahi hai.`
    );
  }

  return lines.join('\n');
};

/* ============================================================================
   8. SHOP-WIDE INSTALLMENT SCHEDULE
============================================================================ */

const buildShopInstallmentSchedule = async (
  shopId,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const range =
    dateRange || defaultTodayRange();

  const installments =
    await Installment.find({
      shopId: shopObjId,
      dueDate: {
        $gte: range.startDate,
        $lte: range.endDate,
      },
      remainingAmount: {
        $gt: 0,
      },
    })
      .populate({
        path: 'installmentPlan',
        populate: [
          {
            path: 'customer',
            select:
              'fullName name customerName mobileNumber phone',
          },
          {
            path: 'product',
            select:
              'name title brand model',
          },
        ],
      })
      .sort({
        dueDate: 1,
      })
      .lean();

  if (!installments.length) {
    return [
      `📆 SHOP INSTALLMENT SCHEDULE`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📅 ${range.label}`,
      '',
      `✅ Is period mein koi unpaid installment due nahi hai.`,
    ].join('\n');
  }

  const totalDue =
    installments.reduce(
      (sum, i) =>
        sum +
        safeNumber(
          i.remainingAmount
        ),
      0
    );

  const lines = [
    `📆 SHOP INSTALLMENT SCHEDULE`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 Period: ${range.label}`,
    `👥 Customers: ${new Set(
      installments.map(
        (i) =>
          String(
            i.installmentPlan
              ?.customer?._id
          )
      )
    ).size}`,
    `📋 Installments: ${installments.length}`,
    `💰 Total Collectable: ${money(
      totalDue
    )}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
  ];

  installments.forEach(
    (inst, index) => {
      const customer =
        inst.installmentPlan
          ?.customer;

      const product =
        inst.installmentPlan
          ?.product;

      lines.push(
        `${index + 1}. 👤 ${getCustomerName(
          customer
        )}`
      );

      lines.push(
        `   📱 ${getCustomerPhone(
          customer
        )}`
      );

      lines.push(
        `   📦 ${getProductName(
          product
        )}`
      );

      lines.push(
        `   📅 Due: ${formatDate(
          inst.dueDate
        )}`
      );

      lines.push(
        `   💰 Collect: ${money(
          inst.remainingAmount
        )}`
      );

      lines.push(
        `   📋 Installment #${
          inst.installmentNumber ||
          '-'
        }`
      );

      lines.push('');
    }
  );

  return lines.join('\n');
};

/* ============================================================================
   9. SALES REPORT
============================================================================ */

const buildSalesReport = async (
  shopId,
  customer = null,
  product = null,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const range =
    dateRange || defaultTodayRange();

  const query = {
    shopId: shopObjId,
    ...dateOrQuery(
      [
        'saleDate',
        'date',
        'createdAt',
      ],
      range
    ),
  };

  if (customer) {
    query.customer =
      customer._id;
  }

  if (product) {
    query.product =
      product._id;
  }

  const sales = await Sale.find(query)
    .populate(
      'customer',
      'fullName name customerName mobileNumber phone'
    )
    .populate(
      'product',
      'name title brand model'
    )
    .sort({
      saleDate: -1,
      createdAt: -1,
    })
    .lean();

  if (!sales.length) {
    return [
      `🛒 SALES REPORT`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📅 ${range.label}`,
      `❌ Is period mein koi sale record nahi mila.`,
    ].join('\n');
  }

  const total =
    sales.reduce(
      (sum, s) =>
        sum + getSaleAmount(s),
      0
    );

  const cashSales =
    sales.filter(
      (s) => !isInstallmentSale(s)
    );

  const installmentSales =
    sales.filter(
      (s) => isInstallmentSale(s)
    );

  const cashTotal =
    cashSales.reduce(
      (sum, s) =>
        sum + getSaleAmount(s),
      0
    );

  const installmentTotal =
    installmentSales.reduce(
      (sum, s) =>
        sum + getSaleAmount(s),
      0
    );

  const lines = [
    `🛒 SALES REPORT`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 Period: ${range.label}`,
    `📊 Total Sales: ${sales.length}`,
    `💰 Total Sale Value: ${money(
      total
    )}`,
    `💵 Cash Sales: ${
      cashSales.length
    } (${money(cashTotal)})`,
    `📆 Installment Sales: ${
      installmentSales.length
    } (${money(
      installmentTotal
    )})`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
  ];

  sales.forEach(
    (sale, index) => {
      const tag =
        isInstallmentSale(sale)
          ? '📆 INSTALLMENT'
          : '💵 CASH';

      lines.push(
        `${index + 1}. ${tag} — ${getProductName(
          sale.product
        )}`
      );

      lines.push(
        `   💰 ${money(
          getSaleAmount(sale)
        )}`
      );

      if (!customer) {
        lines.push(
          `   👤 ${getCustomerName(
            sale.customer
          )}`
        );
      }

      lines.push(
        `   🧾 ${
          sale.saleId ||
          sale.invoiceNumber ||
          'N/A'
        }`
      );

      lines.push(
        `   📅 ${formatDate(
          sale.saleDate ||
            sale.date ||
            sale.createdAt
        )}`
      );

      lines.push('');
    }
  );

  return lines.join('\n');
};

/* ============================================================================
   10. EXPENSE REPORT
============================================================================ */

const buildExpenseReport = async (
  shopId,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const range =
    dateRange || defaultTodayRange();

  const expenses =
    await Expense.find({
      shopId: shopObjId,
      ...dateOrQuery(
        [
          'date',
          'expenseDate',
          'createdAt',
        ],
        range
      ),
    })
      .sort({
        date: -1,
        createdAt: -1,
      })
      .lean();

  if (!expenses.length) {
    return [
      `🧾 EXPENSE REPORT`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📅 ${range.label}`,
      `✅ Is period mein koi expense nahi mila.`,
    ].join('\n');
  }

  const total =
    expenses.reduce(
      (sum, e) =>
        sum + safeNumber(e.amount),
      0
    );

  const lines = [
    `🧾 EXPENSE REPORT`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 Period: ${range.label}`,
    `🧾 Entries: ${expenses.length}`,
    `💰 Total Expense: ${money(
      total
    )}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
  ];

  expenses.forEach(
    (expense, index) => {
      const title =
        expense.title ||
        expense.category ||
        expense.description ||
        expense.name ||
        'Expense';

      const date =
        expense.date ||
        expense.expenseDate ||
        expense.createdAt;

      lines.push(
        `${index + 1}. ${title}`
      );

      lines.push(
        `   💰 ${money(
          expense.amount
        )}`
      );

      lines.push(
        `   📅 ${formatDate(date)}`
      );

      if (
        expense.description &&
        expense.description !== title
      ) {
        lines.push(
          `   📝 ${expense.description}`
        );
      }

      lines.push('');
    }
  );

  return lines.join('\n');
};

/* ============================================================================
   11. OVERDUE REPORT
============================================================================ */

const buildOverdueReport = async (
  shopId,
  customer = null
) => {
  const shopObjId = toObjectId(shopId);

  const overdue =
    await Installment.find({
      shopId: shopObjId,
      dueDate: {
        $lt: startOfDay(
          new Date()
        ),
      },
      remainingAmount: {
        $gt: 0,
      },
    })
      .populate({
        path: 'installmentPlan',
        populate: [
          {
            path: 'customer',
            select:
              'fullName name customerName mobileNumber phone',
          },
          {
            path: 'product',
            select:
              'name title brand model',
          },
        ],
      })
      .sort({
        dueDate: 1,
      })
      .lean();

  const filtered = customer
    ? overdue.filter(
        (i) =>
          String(
            i.installmentPlan
              ?.customer?._id
          ) ===
          String(customer._id)
      )
    : overdue;

  if (!filtered.length) {
    return customer
      ? `✅ ${getCustomerName(
          customer
        )} ki koi overdue installment nahi hai.`
      : `✅ Shop par koi overdue installment nahi hai.`;
  }

  const total =
    filtered.reduce(
      (sum, i) =>
        sum +
        safeNumber(
          i.remainingAmount
        ),
      0
    );

  const today = startOfDay(
    new Date()
  );

  const lines = [
    `⚠️ OVERDUE REPORT`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👥 Records: ${filtered.length}`,
    `💰 Total Overdue: ${money(
      total
    )}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
  ];

  filtered
    .slice(0, 50)
    .forEach((item, index) => {
      const customer =
        item.installmentPlan
          ?.customer;

      const product =
        item.installmentPlan
          ?.product;

      const dueDate =
        startOfDay(
          item.dueDate
        );

      const lateDays = Math.max(
        0,
        Math.floor(
          (
            today.getTime() -
            dueDate.getTime()
          ) /
            86400000
        )
      );

      lines.push(
        `${index + 1}. 👤 ${getCustomerName(
          customer
        )}`
      );

      lines.push(
        `   📱 ${getCustomerPhone(
          customer
        )}`
      );

      lines.push(
        `   📦 ${getProductName(
          product
        )}`
      );

      lines.push(
        `   📅 Due: ${formatDate(
          item.dueDate
        )} — ${lateDays} days late`
      );

      lines.push(
        `   💰 Remaining: ${money(
          item.remainingAmount
        )}`
      );

      lines.push('');
    });

  return lines.join('\n');
};

/* ============================================================================
   12. RECEIVABLES
============================================================================ */

const buildReceivablesReport = async (
  shopId
) => {
  const shopObjId = toObjectId(shopId);

  const installments =
    await Installment.find({
      shopId: shopObjId,
      remainingAmount: {
        $gt: 0,
      },
    })
      .populate({
        path: 'installmentPlan',
        populate: {
          path: 'customer',
          select:
            'fullName name customerName mobileNumber phone',
        },
      })
      .lean();

  const customerMap =
    new Map();

  installments.forEach(
    (item) => {
      const customer =
        item.installmentPlan
          ?.customer;

      if (!customer?._id) return;

      const id =
        String(customer._id);

      if (!customerMap.has(id)) {
        customerMap.set(id, {
          customer,
          amount: 0,
          installments: 0,
        });
      }

      const record =
        customerMap.get(id);

      record.amount +=
        safeNumber(
          item.remainingAmount
        );

      record.installments++;
    }
  );

  const records =
    Array.from(
      customerMap.values()
    ).sort(
      (a, b) =>
        b.amount - a.amount
    );

  const total =
    records.reduce(
      (sum, item) =>
        sum + item.amount,
      0
    );

  if (!records.length) {
    return [
      `💰 RECEIVABLES`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✅ Kisi customer se koi outstanding amount nahi lena.`,
    ].join('\n');
  }

  const lines = [
    `💰 CUSTOMER RECEIVABLES`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👥 Customers with Balance: ${records.length}`,
    `💰 Total Outstanding: ${money(
      total
    )}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
  ];

  records.forEach(
    (item, index) => {
      lines.push(
        `${index + 1}. 👤 ${getCustomerName(
          item.customer
        )}`
      );

      lines.push(
        `   📱 ${getCustomerPhone(
          item.customer
        )}`
      );

      lines.push(
        `   💰 Lena Hai: ${money(
          item.amount
        )}`
      );

      lines.push(
        `   📋 Unpaid Installments: ${item.installments}`
      );

      lines.push('');
    }
  );

  return lines.join('\n');
};

/* ============================================================================
   13. INVENTORY
============================================================================ */

const buildInventoryReport = async (
  shopId
) => {
  const shopObjId = toObjectId(shopId);

  const products =
    await Product.find({
      shopId: shopObjId,
    })
      .select(
        'name title brand model sku category quantity purchasePrice salePrice minStockLevel'
      )
      .sort({
        name: 1,
      })
      .lean();

  if (!products.length) {
    return `📦 Inventory mein koi product nahi mila.`;
  }

  const totalProducts =
    products.length;

  const totalQty =
    products.reduce(
      (sum, p) =>
        sum + safeNumber(p.quantity),
      0
    );

  const costValue =
    products.reduce(
      (sum, p) =>
        sum +
        safeNumber(p.quantity) *
          safeNumber(
            p.purchasePrice
          ),
      0
    );

  const retailValue =
    products.reduce(
      (sum, p) =>
        sum +
        safeNumber(p.quantity) *
          safeNumber(
            p.salePrice
          ),
      0
    );

  const lowStock =
    products.filter(
      (p) =>
        safeNumber(p.quantity) <=
        safeNumber(
          p.minStockLevel || 2
        )
    );

  const outOfStock =
    products.filter(
      (p) =>
        safeNumber(p.quantity) <=
        0
    );

  const lines = [
    `📦 COMPLETE INVENTORY`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📦 Products: ${totalProducts}`,
    `🔢 Total Pieces: ${totalQty}`,
    `💰 Purchase Value: ${money(
      costValue
    )}`,
    `🏷️ Retail Value: ${money(
      retailValue
    )}`,
    `📈 Potential Stock Margin: ${money(
      retailValue - costValue
    )}`,
    `⚠️ Low Stock: ${lowStock.length}`,
    `❌ Out of Stock: ${outOfStock.length}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
    `Product List:`,
    '',
  ];

  products.forEach(
    (p, index) => {
      const qty =
        safeNumber(
          p.quantity
        );

      let status = '✅';

      if (qty <= 0) {
        status = '❌';
      } else if (
        qty <=
        safeNumber(
          p.minStockLevel || 2
        )
      ) {
        status = '⚠️';
      }

      lines.push(
        `${index + 1}. ${status} ${getProductName(
          p
        )}`
      );

      lines.push(
        `   SKU: ${p.sku || 'N/A'}`
      );

      lines.push(
        `   Stock: ${qty}`
      );

      lines.push(
        `   Sale: ${money(
          p.salePrice
        )}`
      );

      lines.push('');
    }
  );

  return lines.join('\n');
};

/* ============================================================================
   14. PRODUCT 360
============================================================================ */

const buildProduct360 = async (
  product,
  shopId,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const query = {
    shopId: shopObjId,
    product: product._id,
  };

  if (dateRange) {
    Object.assign(
      query,
      dateOrQuery(
        [
          'saleDate',
          'date',
          'createdAt',
        ],
        dateRange
      )
    );
  }

  const sales =
    await Sale.find(query)
      .populate(
        'customer',
        'fullName name customerName mobileNumber phone'
      )
      .sort({
        saleDate: -1,
        createdAt: -1,
      })
      .lean();

  const quantity =
    safeNumber(
      product.quantity
    );

  const totalSold =
    sales.reduce(
      (sum, s) =>
        sum +
        safeNumber(
          s.quantity || 1
        ),
      0
    );

  const revenue =
    sales.reduce(
      (sum, s) =>
        sum +
        getSaleAmount(s),
      0
    );

  const lowStock =
    quantity <=
    safeNumber(
      product.minStockLevel || 2
    );

  const lines = [
    `📱 PRODUCT 360°`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📦 Product: ${getProductName(
      product
    )}`,
    product.brand
      ? `🏷️ Brand: ${product.brand}`
      : null,
    product.model
      ? `🔖 Model: ${product.model}`
      : null,
    product.sku
      ? `🔢 SKU: ${product.sku}`
      : null,
    `📦 Current Stock: ${quantity}`,
    `🏷️ Sale Price: ${money(
      product.salePrice
    )}`,
    `💵 Purchase Price: ${money(
      product.purchasePrice
    )}`,
    `📊 Sales Count: ${sales.length}`,
    `🔢 Units Sold: ${totalSold}`,
    `💰 Revenue: ${money(
      revenue
    )}`,
    `📦 Stock Status: ${
      quantity <= 0
        ? '❌ OUT OF STOCK'
        : lowStock
        ? '⚠️ LOW STOCK'
        : '✅ IN STOCK'
    }`,
  ].filter(Boolean);

  if (sales.length) {
    lines.push(
      '',
      'Recent Sales:',
      ''
    );

    sales
      .slice(0, 10)
      .forEach(
        (sale, index) => {
          lines.push(
            `${index + 1}. ${
              isInstallmentSale(
                sale
              )
                ? '📆 Installment'
                : '💵 Cash'
            }`
          );

          lines.push(
            `   👤 ${getCustomerName(
              sale.customer
            )}`
          );

          lines.push(
            `   💰 ${money(
              getSaleAmount(
                sale
              )
            )}`
          );

          lines.push(
            `   📅 ${formatDate(
              sale.saleDate ||
                sale.date ||
                sale.createdAt
            )}`
          );

          lines.push('');
        }
      );
  }

  return lines.join('\n');
};

/* ============================================================================
   15. TOP SELLING
============================================================================ */

const buildTopSelling = async (
  shopId,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const query = {
    shopId: shopObjId,
  };

  if (dateRange) {
    Object.assign(
      query,
      dateOrQuery(
        [
          'saleDate',
          'date',
          'createdAt',
        ],
        dateRange
      )
    );
  }

  const sales =
    await Sale.find(query)
      .populate(
        'product',
        'name title brand model'
      )
      .lean();

  if (!sales.length) {
    return `📊 Is period mein koi sale record nahi mila.`;
  }

  const map =
    new Map();

  sales.forEach(
    (sale) => {
      const name =
        getProductName(
          sale.product
        );

      if (!map.has(name)) {
        map.set(name, {
          units: 0,
          revenue: 0,
        });
      }

      const item =
        map.get(name);

      item.units +=
        safeNumber(
          sale.quantity || 1
        );

      item.revenue +=
        getSaleAmount(sale);
    }
  );

  const sorted =
    Array.from(
      map.entries()
    )
      .sort(
        (a, b) =>
          b[1].units -
          a[1].units
      )
      .slice(0, 15);

  const lines = [
    `🔥 TOP SELLING PRODUCTS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 ${
      dateRange?.label ||
      'All Available Records'
    }`,
    '',
  ];

  sorted.forEach(
    ([name, data], index) => {
      lines.push(
        `${index + 1}. ${name}`
      );

      lines.push(
        `   🔢 Units Sold: ${data.units}`
      );

      lines.push(
        `   💰 Revenue: ${money(
          data.revenue
        )}`
      );

      lines.push('');
    }
  );

  return lines.join('\n');
};

/* ============================================================================
   16. RETURNS / REFUNDS
============================================================================ */

const buildReturnsReport = async (
  shopId,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const range =
    dateRange || defaultTodayRange();

  const returns =
    await Return.find({
      shopId: shopObjId,
      ...dateOrQuery(
        [
          'returnDate',
          'date',
          'createdAt',
        ],
        range
      ),
    })
      .populate(
        'customer',
        'fullName name customerName mobileNumber phone'
      )
      .populate(
        'product',
        'name title brand model'
      )
      .sort({
        returnDate: -1,
        createdAt: -1,
      })
      .lean();

  if (!returns.length) {
    return [
      `↩️ RETURNS / REFUNDS`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📅 ${range.label}`,
      `✅ Is period mein koi return/refund nahi mila.`,
    ].join('\n');
  }

  const totalRefund =
    returns.reduce(
      (sum, item) =>
        sum +
        safeNumber(
          item.refundAmount
        ),
      0
    );

  const lines = [
    `↩️ RETURNS / REFUNDS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 ${range.label}`,
    `↩️ Returns: ${returns.length}`,
    `💰 Total Refund: ${money(
      totalRefund
    )}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
  ];

  returns.forEach(
    (item, index) => {
      lines.push(
        `${index + 1}. ${getProductName(
          item.product
        )}`
      );

      lines.push(
        `   👤 ${getCustomerName(
          item.customer
        )}`
      );

      lines.push(
        `   💰 Refund: ${money(
          item.refundAmount
        )}`
      );

      lines.push(
        `   📅 ${formatDate(
          item.returnDate ||
            item.date ||
            item.createdAt
        )}`
      );

      lines.push('');
    }
  );

  return lines.join('\n');
};

/* ============================================================================
   17. CASH FLOW
============================================================================ */

const buildCashFlow = async (
  shopId,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const range =
    dateRange ||
    buildRange(
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ),
      new Date(),
      'This Month'
    );

  const [
    payments,
    expenses,
    returns,
  ] = await Promise.all([
    Payment.find({
      shopId: shopObjId,
      isArchived: {
        $ne: true,
      },
      ...dateOrQuery(
        [
          'paymentDate',
          'date',
          'createdAt',
        ],
        range
      ),
    }).lean(),

    Expense.find({
      shopId: shopObjId,
      ...dateOrQuery(
        [
          'date',
          'expenseDate',
          'createdAt',
        ],
        range
      ),
    }).lean(),

    Return.find({
      shopId: shopObjId,
      ...dateOrQuery(
        [
          'returnDate',
          'date',
          'createdAt',
        ],
        range
      ),
    }).lean(),
  ]);

  const moneyIn =
    payments.reduce(
      (sum, p) =>
        sum + safeNumber(p.amount),
      0
    );

  const expensesTotal =
    expenses.reduce(
      (sum, e) =>
        sum + safeNumber(e.amount),
      0
    );

  const refunds =
    returns.reduce(
      (sum, r) =>
        sum +
        safeNumber(
          r.refundAmount
        ),
      0
    );

  const moneyOut =
    expensesTotal +
    refunds;

  const net =
    moneyIn - moneyOut;

  return [
    `💵 CASH FLOW`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 ${range.label}`,
    `📥 Money In: ${money(
      moneyIn
    )}`,
    `   • Payments: ${payments.length}`,
    `📤 Money Out: ${money(
      moneyOut
    )}`,
    `   • Expenses: ${money(
      expensesTotal
    )}`,
    `   • Refunds: ${money(
      refunds
    )}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `${net >= 0 ? '🟢' : '🔴'} Net Cash Flow: ${money(
      net
    )}`,
  ].join('\n');
};

/* ============================================================================
   18. CUSTOMER 360
============================================================================ */

const buildCustomer360 = async (
  customer,
  shopId
) => {
  const shopObjId = toObjectId(shopId);

  const [
    sales,
    plans,
    payments,
  ] = await Promise.all([
    Sale.find({
      shopId: shopObjId,
      customer: customer._id,
    })
      .populate(
        'product',
        'name title brand model'
      )
      .sort({
        saleDate: -1,
      })
      .lean(),

    InstallmentPlan.find({
      shopId: shopObjId,
      customer: customer._id,
    })
      .populate(
        'product',
        'name title brand model'
      )
      .lean(),

    Payment.find({
      shopId: shopObjId,
      customer: customer._id,
      isArchived: {
        $ne: true,
      },
    })
      .sort({
        paymentDate: -1,
      })
      .lean(),
  ]);

  const planIds =
    plans.map(
      (p) => p._id
    );

  const installments =
    planIds.length
      ? await Installment.find({
          shopId: shopObjId,
          installmentPlan: {
            $in: planIds,
          },
        })
          .sort({
            dueDate: 1,
          })
          .lean()
      : [];

  const totalSales =
    sales.reduce(
      (sum, sale) =>
        sum +
        getSaleAmount(sale),
      0
    );

  const totalPaid =
    payments.reduce(
      (sum, payment) =>
        sum +
        safeNumber(
          payment.amount
        ),
      0
    );

  const outstanding =
    plans.reduce(
      (sum, plan) =>
        sum +
        safeNumber(
          plan.remainingBalance
        ),
      0
    );

  const today =
    startOfDay(new Date());

  const overdue =
    installments.filter(
      (i) =>
        startOfDay(
          i.dueDate
        ) < today &&
        safeNumber(
          i.remainingAmount
        ) > 0
    );

  const overdueAmount =
    overdue.reduce(
      (sum, i) =>
        sum +
        safeNumber(
          i.remainingAmount
        ),
      0
    );

  const nextDue =
    installments.find(
      (i) =>
        startOfDay(
          i.dueDate
        ) >= today &&
        safeNumber(
          i.remainingAmount
        ) > 0
    );

  const lines = [
    `👤 CUSTOMER 360°`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 ${getCustomerName(
      customer
    )}`,
    `📱 ${getCustomerPhone(
      customer
    )}`,
    `🪪 CNIC: ${
      customer.cnic ||
      'N/A'
    }`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🛒 Total Sales: ${money(
      totalSales
    )}`,
    `🧾 Sales Count: ${sales.length}`,
    `💳 Total Payments: ${money(
      totalPaid
    )}`,
    `💰 Outstanding: ${money(
      outstanding
    )}`,
    `⚠️ Overdue: ${money(
      overdueAmount
    )}`,
    `📆 Installment Plans: ${plans.length}`,
  ];

  if (nextDue) {
    lines.push(
      `📅 Next Due: ${formatDate(
        nextDue.dueDate
      )} — ${money(
        nextDue.remainingAmount
      )}`
    );
  }

  if (sales.length) {
    lines.push(
      '',
      '🛒 Recent Purchases:',
      ''
    );

    sales
      .slice(0, 10)
      .forEach(
        (sale, index) => {
          lines.push(
            `${index + 1}. ${getProductName(
              sale.product
            )}`
          );

          lines.push(
            `   ${
              isInstallmentSale(
                sale
              )
                ? '📆 Installment'
                : '💵 Cash'
            } — ${money(
              getSaleAmount(
                sale
              )
            )}`
          );

          lines.push(
            `   📅 ${formatDate(
              sale.saleDate ||
                sale.date ||
                sale.createdAt
            )}`
          );
        }
      );
  }

  return lines.join('\n');
};

/* ============================================================================
   19. DAY / BUSINESS BRIEFING
============================================================================ */

const buildBusinessBriefing = async (
  shopId,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const range =
    dateRange || defaultTodayRange();

  const [
    sales,
    payments,
    expenses,
    dueInstallments,
  ] = await Promise.all([
    Sale.find({
      shopId: shopObjId,
      ...dateOrQuery(
        [
          'saleDate',
          'date',
          'createdAt',
        ],
        range
      ),
    })
      .populate(
        'customer',
        'fullName name customerName mobileNumber'
      )
      .populate(
        'product',
        'name title brand model'
      )
      .lean(),

    Payment.find({
      shopId: shopObjId,
      isArchived: {
        $ne: true,
      },
      ...dateOrQuery(
        [
          'paymentDate',
          'date',
          'createdAt',
        ],
        range
      ),
    }).lean(),

    Expense.find({
      shopId: shopObjId,
      ...dateOrQuery(
        [
          'date',
          'expenseDate',
          'createdAt',
        ],
        range
      ),
    }).lean(),

    Installment.find({
      shopId: shopObjId,
      dueDate: {
        $gte: range.startDate,
        $lte: range.endDate,
      },
      remainingAmount: {
        $gt: 0,
      },
    }).lean(),
  ]);

  const saleValue =
    sales.reduce(
      (sum, s) =>
        sum + getSaleAmount(s),
      0
    );

  const collected =
    payments.reduce(
      (sum, p) =>
        sum + safeNumber(p.amount),
      0
    );

  const expenseTotal =
    expenses.reduce(
      (sum, e) =>
        sum + safeNumber(e.amount),
      0
    );

  const dueAmount =
    dueInstallments.reduce(
      (sum, i) =>
        sum +
        safeNumber(
          i.remainingAmount
        ),
      0
    );

  const cashSales =
    sales.filter(
      (s) =>
        !isInstallmentSale(s)
    );

  const installmentSales =
    sales.filter(
      (s) =>
        isInstallmentSale(s)
    );

  return [
    `📊 BUSINESS BRIEFING`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 ${range.label}`,
    '',
    `🛒 SALES`,
    `• Transactions: ${sales.length}`,
    `• Total Sales Value: ${money(
      saleValue
    )}`,
    `• 💵 Cash Sales: ${cashSales.length}`,
    `• 📆 Installment Sales: ${installmentSales.length}`,
    '',
    `💰 COLLECTIONS`,
    `• Collected: ${money(
      collected
    )}`,
    `• Payment Entries: ${payments.length}`,
    '',
    `🧾 EXPENSES`,
    `• Expenses: ${money(
      expenseTotal
    )}`,
    `• Entries: ${expenses.length}`,
    '',
    `📆 INSTALLMENTS`,
    `• Due Installments: ${dueInstallments.length}`,
    `• Due Amount: ${money(
      dueAmount
    )}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💵 Approx Cash Movement: ${money(
      collected -
        expenseTotal
    )}`,
  ].join('\n');
};

/* ============================================================================
   20. PROFIT / MARGIN
============================================================================ */

const buildProfitReport = async (
  shopId,
  dateRange = null
) => {
  const shopObjId = toObjectId(shopId);

  const range =
    dateRange || defaultTodayRange();

  const sales =
    await Sale.find({
      shopId: shopObjId,
      ...dateOrQuery(
        [
          'saleDate',
          'date',
          'createdAt',
        ],
        range
      ),
    })
      .populate(
        'product',
        'name title purchasePrice'
      )
      .lean();

  let revenue = 0;
  let estimatedCost = 0;

  sales.forEach(
    (sale) => {
      const amount =
        getSaleAmount(sale);

      const quantity =
        safeNumber(
          sale.quantity || 1
        );

      const purchasePrice =
        safeNumber(
          sale.product
            ?.purchasePrice
        );

      revenue += amount;

      estimatedCost +=
        purchasePrice *
        quantity;
    }
  );

  const grossMargin =
    revenue -
    estimatedCost;

  return [
    `📈 SALES MARGIN REPORT`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 ${range.label}`,
    `💰 Sales Revenue: ${money(
      revenue
    )}`,
    `📦 Estimated Product Cost: ${money(
      estimatedCost
    )}`,
    `📈 Estimated Gross Margin: ${money(
      grossMargin
    )}`,
    '',
    `⚠️ Note: Yeh estimated gross margin hai. Actual net profit mein expenses, refunds aur doosri accounting adjustments alag se affect kar sakti hain.`,
  ].join('\n');
};


const resolveProduct = async (rawText, shopObjId) => {
  try {
    if (!rawText || !shopObjId) {
      return [];
    }

    const text = String(rawText).trim();

    if (!text) {
      return [];
    }

    // Search ko safe regex banayein
    const escapedText = text.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const regex = new RegExp(
      escapedText,
      'i'
    );

    const products = await Product.find({
      shopId: shopObjId,
      $or: [
        { name: regex },
        { productName: regex },
        { model: regex },
        { sku: regex },
        { code: regex },
        { productCode: regex },
        { category: regex },
        { brand: regex },
      ],
    })
      .limit(30)
      .lean();

    return products || [];
  } catch (error) {
    console.error(
      'resolveProduct Error:',
      error
    );

    return [];
  }
};
/* ============================================================================
   21. MASTER QUERY PROCESSOR
============================================================================ */

const processLocalQuery = async ({
  message,
  shopId,
}) => {
  try {
    const rawText = clean(message);

    if (!rawText) {
      return 'Baraye meharbani apna sawal likhein.';
    }
const text = normalize(rawText);
    const shopObjId =
      toObjectId(shopId);

    if (!shopObjId) {
      return '❌ Shop ID verify nahi ho saki.';
    }

    const plan =
      buildQueryPlan(rawText);

    /*
     * Entity resolution happens AFTER query planning.
     * This is important because:
     *
     * "Arqam ne kitna pay kiya?"
     *
     * should become PAYMENT HISTORY,
     * not generic Customer 360.
     */

    /* ---------------- CUSTOMER HISTORY / DETAILS ---------------- */

const customerHistoryIntent =
  hasAny(text, [
    'history',
    'histor',
    'details',
    'detail',
    'complete record',
    'full record',
    'complete details',
    'full details',
    'complete history',
    'full history',
    'customer history',
    'customer details',
    'customer record',
    'complete hisaab',
    'complete hisab',
    'pura hisaab',
    'pura hisab',
    'sara record',
    'sari details',
    'history details',
  ]);

if (customerHistoryIntent) {
  plan.target = 'customer';
  plan.action = '360';
  plan.wantsCustomer = true;
  plan.wantsDetails = true;
  plan.wantsList = true;
}

    const shouldResolveCustomer =
      plan.wantsCustomer ||
      plan.target === 'customer' ||
      plan.target === 'payment' ||
      plan.target === 'installment' ||
      plan.target === 'sales' ||
      plan.target === 'overdue' ||
      plan.target === 'receivable';

    const shouldResolveProduct =
      plan.wantsProduct ||
      plan.target === 'product' ||
      plan.target === 'sales' ||
      plan.target === 'topSelling' ||
      plan.target === 'stock';

    const [
      matchingCustomers,
      matchingProducts,
    ] = await Promise.all([
      shouldResolveCustomer
        ? resolveCustomer(
            rawText,
            shopObjId
          )
        : [],
      shouldResolveProduct
        ? resolveProduct(
            rawText,
            shopObjId
          )
        : [],
    ]);

    /*
     * ENTITY DISAMBIGUATION
     */

    let customer = null;
    let product = null;

    if (
      matchingCustomers.length >
      1
    ) {
      /*
       * If the query is clearly shop-wide,
       * do not block it because words like
       * "customer" exist in the query.
       */
      const shopWideTargets = [
        'shop',
        'expense',
        'inventory',
        'cashflow',
        'topSelling',
        'briefing',
        'overdue',
        'receivable',
      ];

      if (
        !shopWideTargets.includes(
          plan.target
        )
      ) {
        return [
          `👤 Multiple customers match hue hain:`,
          '',
          ...matchingCustomers
            .slice(0, 8)
            .map(
              (c, i) =>
                `${i + 1}. ${getCustomerName(
                  c
                )} — ${getCustomerPhone(
                  c
                )}`
            ),
          '',
          `Please exact naam, mobile number ya customer ID dein.`,
        ].join('\n');
      }
    }

    if (
      matchingCustomers.length ===
      1
    ) {
      customer =
        matchingCustomers[0];
    }

    if (
      matchingProducts.length >
      1
    ) {
      if (
        plan.target ===
          'product' ||
        plan.target ===
          'stock'
      ) {
        return [
          `📱 Multiple products match hue hain:`,
          '',
          ...matchingProducts
            .slice(0, 8)
            .map(
              (p, i) =>
                `${i + 1}. ${getProductName(
                  p
                )} — Stock: ${safeNumber(
                  p.quantity
                )} — ${money(
                  p.salePrice
                )}`
            ),
          '',
          `Please exact model ya SKU dein.`,
        ].join('\n');
      }
    }

    if (
      matchingProducts.length ===
      1
    ) {
      product =
        matchingProducts[0];
    }

    /* ========================================================================
       ROUTING
    ======================================================================== */

    /*
     * CUSTOMER + PAYMENT
     */
    if (
      customer &&
      plan.target ===
        'payment'
    ) {
      return await buildCustomerPaymentHistory(
        customer,
        shopObjId,
        plan.dateRange
      );
    }


    /*
 * SHOP-WIDE PAYMENTS
 *
 * Examples:
 * Kal kitni payments receive hui?
 * Aaj kis kis ne payment ki?
 * Yesterday ki payment details
 * September ki total collections
 * Kis customer se kitna paisa aya?
 */
if (
  plan.target ===
  'payment'
) {
  return await buildShopPaymentReport(
    shopObjId,
    plan.dateRange
  );
}

    /*
     * CUSTOMER + INSTALLMENT
     */
    if (
      customer &&
      plan.target ===
        'installment'
    ) {
      return await buildCustomerInstallmentSchedule(
        customer,
        shopObjId,
        plan.dateRange
      );
    }

    /*
     * CUSTOMER + SALES
     */
    if (
      customer &&
      plan.target ===
        'sales'
    ) {
      return await buildSalesReport(
        shopObjId,
        customer,
        product,
        plan.dateRange
      );
    }

    /*
     * CUSTOMER + OVERDUE
     */
    if (
      customer &&
      plan.target ===
        'overdue'
    ) {
      return await buildOverdueReport(
        shopObjId,
        customer
      );
    }

    /*
     * CUSTOMER WITHOUT SPECIALIZED INTENT
     */
  /*
 * CUSTOMER 360 / HISTORY / DETAILS
 *
 * Examples:
 * Arqam ka history
 * Arqam ka history details
 * Arqam ki details
 * Arqam ka complete record
 * Arqam ki complete history
 * Arqam ka complete hisaab
 */
if (
  customer &&
  !product &&
  (
    plan.target === 'customer' ||
    plan.target === 'shop'
  )
) {
  return await buildCustomer360(
    customer,
    shopObjId
  );
}

    /*
     * PRODUCT + SALES
     */
    if (
      product &&
      plan.target ===
        'sales'
    ) {
      return await buildSalesReport(
        shopObjId,
        customer,
        product,
        plan.dateRange
      );
    }

    /*
     * PRODUCT QUERY
     */
    if (
      product &&
      (
        plan.target ===
          'product' ||
        plan.target ===
          'stock'
      )
    ) {
      return await buildProduct360(
        product,
        shopObjId,
        plan.dateRange
      );
    }

    /*
     * SHOP-WIDE INSTALLMENT SCHEDULE
     *
     * "Aaj kis kis ki installment hai?"
     * "Tomorrow installments?"
     * "Next month kitna collect hona hai?"
     */
    if (
      plan.target ===
      'installment'
    ) {
      return await buildShopInstallmentSchedule(
        shopObjId,
        plan.dateRange
      );
    }

    /*
     * SHOP-WIDE SALES
     */
    if (
      plan.target ===
      'sales'
    ) {
      return await buildSalesReport(
        shopObjId,
        null,
        null,
        plan.dateRange
      );
    }

    /*
     * EXPENSES
     */
    if (
      plan.target ===
      'expense'
    ) {
      return await buildExpenseReport(
        shopObjId,
        plan.dateRange
      );
    }

    /*
     * OVERDUE
     */
    if (
      plan.target ===
      'overdue'
    ) {
      return await buildOverdueReport(
        shopObjId
      );
    }

    /*
     * RECEIVABLES
     */
    if (
      plan.target ===
      'receivable'
    ) {
      return await buildReceivablesReport(
        shopObjId
      );
    }

    /*
     * INVENTORY
     */
    if (
      plan.target ===
      'inventory'
    ) {
      return await buildInventoryReport(
        shopObjId
      );
    }

    /*
     * STOCK
     */
    if (
      plan.target ===
      'stock'
    ) {
      if (product) {
        return await buildProduct360(
          product,
          shopObjId,
          plan.dateRange
        );
      }

      return await buildInventoryReport(
        shopObjId
      );
    }

    /*
     * TOP SELLING
     */
    if (
      plan.target ===
      'topSelling'
    ) {
      return await buildTopSelling(
        shopObjId,
        plan.dateRange
      );
    }

    /*
     * RETURNS
     */
    if (
      plan.target ===
      'returns'
    ) {
      return await buildReturnsReport(
        shopObjId,
        plan.dateRange
      );
    }

    /*
     * CASH FLOW
     */
    if (
      plan.target ===
      'cashflow'
    ) {
      return await buildCashFlow(
        shopObjId,
        plan.dateRange
      );
    }

    /*
     * PROFIT
     */
    if (
      plan.target ===
      'profit'
    ) {
      return await buildProfitReport(
        shopObjId,
        plan.dateRange
      );
    }

    /*
     * BUSINESS BRIEFING
     */
    if (
      plan.target ===
      'briefing'
    ) {
      return await buildBusinessBriefing(
        shopObjId,
        plan.dateRange
      );
    }

    /*
     * GENERIC DATE QUERY
     *
     * "Kal ka record"
     * "Aaj kya hua"
     * "Yesterday business"
     */
    if (
      plan.dateRange
    ) {
      return await buildBusinessBriefing(
        shopObjId,
        plan.dateRange
      );
    }

    /*
     * GENERIC CUSTOMER FALLBACK
     */
    if (customer) {
      return await buildCustomer360(
        customer,
        shopObjId
      );
    }

    /*
     * GENERIC PRODUCT FALLBACK
     */
    if (product) {
      return await buildProduct360(
        product,
        shopObjId
      );
    }

    /*
     * FINAL HELP
     */

    return [
      `🤖 SHOP AI ASSISTANT`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Mujhe "${rawText}" ka exact data route nahi mila.`,
      '',
      `Aap naturally sawal pooch sakte hain, example:`,
      '',
      `👤 CUSTOMER`,
      `• Arqam ne kitna pay kiya?`,
      `• Arqam ki payment history dikhao`,
      `• Arqam ka installment schedule`,
      `• Arqam ki next installment kab hai?`,
      `• Arqam kitna baki hai?`,
      '',
      `📆 INSTALLMENTS`,
      `• Aaj kis kis ki installment hai?`,
      `• Kal kis ki qist hai?`,
      `• Tomorrow kitna collect hona hai?`,
      `• Next month ki installment schedule dikhao`,
      '',
      `🛒 SALES`,
      `• Aaj ki sales dikhao`,
      `• Kal ki cash sales`,
      `• September ki installment sales`,
      `• Arqam ne kya khareeda?`,
      '',
      `💳 PAYMENTS`,
      `• Aaj kitna paisa jama hua?`,
      `• Kal kitni payments aayi?`,
      `• Arqam ne kab kab payment ki?`,
      '',
      `🧾 EXPENSES`,
      `• Aaj ke expenses`,
      `• Kal kitna kharcha hua?`,
      `• September ke expenses dikhao`,
      '',
      `📦 INVENTORY`,
      `• Complete stock dikhao`,
      `• Kaunsa product low stock hai?`,
      `• iPhone 16 ka record dikhao`,
      '',
      `⚠️ RECOVERY`,
      `• Kaun overdue hai?`,
      `• Kis kis se paisa lena hai?`,
      `• Total outstanding kitna hai?`,
      '',
      `📊 BUSINESS`,
      `• Aaj ka complete hisab`,
      `• Kal kya hua tha?`,
      `• This month cash flow`,
      `• Top selling products`,
      `• Profit kitna hua?`,
    ].join('\n');
  } catch (error) {
    console.error(
      'NEXT LEVEL SHOP AI ERROR:',
      error
    );

    return [
      `❌ Query process nahi ho saki.`,
      '',
      `Technical error: ${
        error?.message ||
        'Unknown error'
      }`,
    ].join('\n');
  }
};

/* ============================================================================
   EXPORTS
============================================================================ */

module.exports = {
  processLocalQuery,
  universalSearch:
    processLocalQuery,
  default:
    processLocalQuery,
};