// ============================================================
// AI AGENT SERVICE — LLM-powered shop assistant (Groq)
// ============================================================
// Uses Groq's OpenAI-compatible API via native fetch.
// NO new npm dependencies.
//
// Exports:
//   runAiAgent({ message, shopId, history }) -> { answer, pendingAction }
//   executeConfirmedAction({ shopId, tool, args }) -> { success, message }
//
// ALL tools are scoped to `shopId` passed in from the server.
// Any shopId coming from the LLM or client is stripped/ignored.
// Any throw -> caller falls back to the rule-based local service.
// ============================================================

const mongoose = require('mongoose');

const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Installment = require('../models/Installment');
const InstallmentPlan = require('../models/InstallmentPlan');
const Expense = require('../models/Expense');

const GROQ_URL =
  'https://api.groq.com/openai/v1/chat/completions';

// Groq retires models often (e.g. llama-3.3-70b-versatile -> 2026-08-16).
// If the configured model 404s, we automatically try the next one.
const MODEL_CANDIDATES = (() => {
  const list = [
    process.env.AI_MODEL,
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.6-27b',
  ];
  return [...new Set(list.filter(Boolean))];
})();

const MAX_ITERATIONS = 6;

const WRITE_TOOLS = new Set([
  'record_payment',
  'create_customer',
  'add_expense',
]);

const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'Easypaisa',
  'JazzCash',
  'Other',
];

const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity Bill',
  'Salaries',
  'Tea & Entertainment',
  'Stationery',
  'Repair & Maintenance',
  'Other',
];

// ============================================================
// DATE HELPERS (Asia/Karachi)
// ============================================================

const pkDateString = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

// Pakistan is UTC+5 all year (no DST).
const pkDayBounds = (dateStr) => {
  const start = new Date(`${dateStr}T00:00:00+05:00`);
  const end = new Date(
    start.getTime() + 24 * 60 * 60 * 1000
  );
  return { start, end };
};

const pkMonthBounds = (dateStr) => {
  const [y, m] = dateStr.split('-').map(Number);
  const start = new Date(
    Date.UTC(y, m - 1, 1, 0, 0, 0) - 5 * 60 * 60 * 1000
  );
  const end = new Date(
    Date.UTC(y, m, 1, 0, 0, 0) - 5 * 60 * 60 * 1000
  );
  return { start, end };
};

// Parse optional {from,to} (YYYY-MM-DD) into a saleDate/paymentDate match.
const dateRangeMatch = (args, field) => {
  const match = {};
  if (args && (args.from || args.to)) {
    match[field] = {};
    if (args.from) {
      match[field].$gte = pkDayBounds(args.from).start;
    }
    if (args.to) {
      match[field].$lt = pkDayBounds(args.to).end;
    }
  }
  return match;
};

const escRegex = (s = '') =>
  String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toOid = (shopId) =>
  new mongoose.Types.ObjectId(String(shopId));

const fmtRs = (n) =>
  `Rs ${Number(n || 0).toLocaleString('en-PK')}`;

const fmtDate = (d) => {
  if (!d) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(d));
};

// Never trust identifiers from the LLM/client.
const stripForbidden = (args = {}) => {
  const clean = { ...(args || {}) };
  delete clean.shopId;
  delete clean.shop_id;
  delete clean.shop;
  return clean;
};

// ============================================================
// GROQ CHAT COMPLETION (native fetch)
// ============================================================

const groqChat = async (messages, tools) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  let lastError = null;

  for (const model of MODEL_CANDIDATES) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      30000
    );

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.2,
          max_tokens: 1000,
        }),
      });

      if (!res.ok) {
        const text = await res
          .text()
          .catch(() => '');
        const err = new Error(
          `Groq HTTP ${res.status}: ${text.slice(0, 200)}`
        );
        err.groqStatus = res.status;
        err.groqBody = text;
        // Retired/unknown model (404) or rate-limited (429) ->
        // try next candidate. Each Groq model has its own
        // rate-limit bucket, so switching models usually works
        // instantly instead of waiting out the TPM window.
        if (
          (res.status === 404 &&
            /model_not_found|does not exist/i.test(
              text
            )) ||
          res.status === 429
        ) {
          console.warn(
            `[AI] Model '${model}' hit ${res.status}, trying next...`
          );
          lastError = err;
          continue;
        }
        throw err;
      }

      const data = await res.json();
      const msg = data?.choices?.[0]?.message;

      if (!msg) {
        throw new Error('Empty response from Groq');
      }

      return msg;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('No Groq model available');
};

// ============================================================
// SYSTEM PROMPT
// ============================================================

const systemPrompt = () => {
  const today = pkDateString();

  return [
    'You are the AI Business Assistant for a Pakistani retail shop POS system.',
    `Today is ${today} (Asia/Karachi timezone).`,
    '',
    'LANGUAGE: Match the user. Reply in English if they write English,',
    'in Urdu script if they write Urdu script, in Roman Urdu if they write Roman Urdu.',
    '',
    'RULES:',
    '- NEVER invent numbers, names, or facts. Always call a tool first to get real data',
    '  before answering anything about sales, customers, stock, payments,',
    '  installments, or expenses.',
    '- All data is automatically limited to the user\'s own shop.',
    '  Never mention other shops. Never ask for or use any shop ID.',
    '- Keep answers short, friendly, and chatty. Use "Rs" for money amounts.',
    '- READ-ONLY MODE: you can ONLY view data. You cannot record payments,',
    '  create customers, add expenses, or change anything in the shop.',
    '  If the user asks you to add/create/record anything, politely explain',
    '  that you are read-only and can only show data — never pretend',
    '  an action was done.',
    '- If a tool reports an error (e.g. customer not found, no due installments),',
    '  ask the user a short clarifying question instead of guessing.',
    '- Interpret relative dates using today: "aaj" = today, "kal" = yesterday/tomorrow',
    '  by context, "is month" = current month, "last month" = previous month.',
    '- When reporting lists, show at most 8-10 items and mention if there are more.',
  ].join('\n');
};

// ============================================================
// TOOL DEFINITIONS (OpenAI function format)
// ============================================================

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_dashboard_summary',
      description:
        "Today's and this month's sales totals, low-stock product count, overdue installment count.",
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_products',
      description:
        'Search products by name, brand, model or SKU.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search text',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 10)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sales_report',
      description:
        'Sales totals for a date range (YYYY-MM-DD). Defaults to last 30 days.',
      parameters: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: 'Start date YYYY-MM-DD',
          },
          to: {
            type: 'string',
            description: 'End date YYYY-MM-DD',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_customer',
      description:
        'Find customers by name, mobile number or CNIC. Returns customer IDs.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Name or phone to search',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_ledger',
      description:
        'Customer ledger: total purchased, total paid, balance, recent payments.',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description:
              'Customer _id from find_customer',
          },
        },
        required: ['customerId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_due_installments',
      description:
        'Unpaid installments (pending/overdue), oldest first.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Max results (default 20)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_low_stock',
      description:
        'Products with quantity at or below a threshold.',
      parameters: {
        type: 'object',
        properties: {
          threshold: {
            type: 'number',
            description:
              'Stock threshold (default 5)',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 20)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payments_report',
      description:
        'Payments received in a date range (YYYY-MM-DD). Defaults to last 30 days.',
      parameters: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: 'Start date YYYY-MM-DD',
          },
          to: {
            type: 'string',
            description: 'End date YYYY-MM-DD',
          },
        },
      },
    },
  },
];

// ============================================================
// READ TOOL IMPLEMENTATIONS
// ============================================================

const readTools = {
  get_dashboard_summary: async (args, shopId) => {
    const oid = toOid(shopId);
    const today = pkDateString();
    const day = pkDayBounds(today);
    const month = pkMonthBounds(today);
    const now = new Date();

    const [todaySales] = await Sale.aggregate([
      {
        $match: {
          shopId: oid,
          saleDate: { $gte: day.start, $lt: day.end },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$finalTotal' },
        },
      },
    ]);

    const [monthSales] = await Sale.aggregate([
      {
        $match: {
          shopId: oid,
          saleDate: {
            $gte: month.start,
            $lt: month.end,
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$finalTotal' },
        },
      },
    ]);

    const [monthPayments] = await Payment.aggregate([
      {
        $match: {
          shopId: oid,
          paymentDate: {
            $gte: month.start,
            $lt: month.end,
          },
          isArchived: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const lowStock = await Product.countDocuments({
      shopId: oid,
      $expr: { $lte: ['$quantity', '$minStockLevel'] },
    });

    const overdue = await Installment.countDocuments({
      shopId: oid,
      status: {
        $in: ['Pending', 'Partially Paid', 'Overdue'],
      },
      remainingAmount: { $gt: 0 },
      dueDate: { $lt: now },
    });

    return {
      today: {
        salesCount: todaySales?.count || 0,
        salesTotal: todaySales?.total || 0,
      },
      thisMonth: {
        salesCount: monthSales?.count || 0,
        salesTotal: monthSales?.total || 0,
        paymentsReceived: monthPayments?.total || 0,
        paymentsCount: monthPayments?.count || 0,
      },
      lowStockCount: lowStock,
      overdueInstallmentCount: overdue,
    };
  },

  search_products: async (args, shopId) => {
    const q = escRegex(args.query || '');
    const limit = Math.min(
      Math.max(Number(args.limit) || 10, 1),
      25
    );

    const products = await Product.find({
      shopId: toOid(shopId),
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { model: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
      ],
    })
      .select('name brand model sku salePrice quantity')
      .limit(limit)
      .lean();

    return {
      count: products.length,
      products: products.map((p) => ({
        name: p.name,
        brand: p.brand,
        model: p.model,
        sku: p.sku,
        price: p.salePrice,
        stock: p.quantity,
      })),
    };
  },

  get_sales_report: async (args, shopId) => {
    const oid = toOid(shopId);
    const to = args.to || pkDateString();
    const from =
      args.from ||
      pkDateString(
        new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      );

    const match = {
      shopId: oid,
      ...dateRangeMatch({ from, to }, 'saleDate'),
    };

    const [totals] = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$finalTotal' },
        },
      },
    ]);

    const byType = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentType',
          count: { $sum: 1 },
          total: { $sum: '$finalTotal' },
        },
      },
    ]);

    return {
      from,
      to,
      count: totals?.count || 0,
      total: totals?.total || 0,
      byPaymentType: byType.map((b) => ({
        type: b._id,
        count: b.count,
        total: b.total,
      })),
    };
  },

  find_customer: async (args, shopId) => {
    const q = escRegex(args.query || '');

    const customers = await Customer.find({
      shopId: toOid(shopId),
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { mobileNumber: { $regex: q, $options: 'i' } },
        { cnic: { $regex: q, $options: 'i' } },
      ],
    })
      .select('fullName mobileNumber cnic')
      .limit(5)
      .lean();

    return {
      count: customers.length,
      customers: customers.map((c) => ({
        customerId: String(c._id),
        fullName: c.fullName,
        mobileNumber: c.mobileNumber,
        cnic: c.cnic || null,
      })),
    };
  },

  get_customer_ledger: async (args, shopId) => {
    if (
      !args.customerId ||
      !mongoose.Types.ObjectId.isValid(
        String(args.customerId)
      )
    ) {
      return {
        error:
          'Valid customerId chahiye. Pehle find_customer se customer dhoondein.',
      };
    }

    const oid = toOid(shopId);
    const custId = new mongoose.Types.ObjectId(
      String(args.customerId)
    );

    const customer = await Customer.findOne({
      _id: custId,
      shopId: oid,
    })
      .select('fullName mobileNumber')
      .lean();

    if (!customer) {
      return {
        error:
          'Customer nahi mila. Pehle find_customer se sahi customer dhoondein.',
      };
    }

    const [purchased] = await Sale.aggregate([
      { $match: { shopId: oid, customer: custId } },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalTotal' },
          count: { $sum: 1 },
        },
      },
    ]);

    const [paid] = await Payment.aggregate([
      {
        $match: {
          shopId: oid,
          customer: custId,
          isArchived: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const recentPayments = await Payment.find({
      shopId: oid,
      customer: custId,
      isArchived: { $ne: true },
    })
      .select('amount paymentMethod paymentDate')
      .sort({ paymentDate: -1 })
      .limit(5)
      .lean();

    const totalPurchased = purchased?.total || 0;
    const totalPaid = paid?.total || 0;

    return {
      customer: {
        fullName: customer.fullName,
        mobileNumber: customer.mobileNumber,
      },
      totalPurchased,
      totalPaid,
      balance: totalPurchased - totalPaid,
      purchasesCount: purchased?.count || 0,
      paymentsCount: paid?.count || 0,
      recentPayments: recentPayments.map((p) => ({
        amount: p.amount,
        method: p.paymentMethod,
        date: fmtDate(p.paymentDate),
      })),
    };
  },

  get_due_installments: async (args, shopId) => {
    const limit = Math.min(
      Math.max(Number(args.limit) || 20, 1),
      50
    );

    const dues = await Installment.find({
      shopId: toOid(shopId),
      status: {
        $in: ['Pending', 'Partially Paid', 'Overdue'],
      },
      remainingAmount: { $gt: 0 },
    })
      .populate('installmentPlan', 'planId')
      .sort({ dueDate: 1 })
      .limit(limit)
      .lean();

    // Attach customer names via plans (one batched query).
    const planIds = [
      ...new Set(
        dues
          .map((d) => String(d.installmentPlan?._id))
          .filter(Boolean)
      ),
    ];

    const plans = await InstallmentPlan.find({
      _id: { $in: planIds },
      shopId: toOid(shopId),
    })
      .populate('customer', 'fullName mobileNumber')
      .select('customer planId')
      .lean();

    const planMap = {};
    plans.forEach((p) => {
      planMap[String(p._id)] = p;
    });

    const totalDue = dues.reduce(
      (s, d) => s + (d.remainingAmount || 0),
      0
    );

    return {
      count: dues.length,
      totalDueAmount: totalDue,
      installments: dues.map((d) => {
        const plan =
          planMap[String(d.installmentPlan?._id)];
        return {
          installmentNumber: d.installmentNumber,
          planId: plan?.planId || null,
          customer: plan?.customer?.fullName || '-',
          mobile: plan?.customer?.mobileNumber || '-',
          amount: d.amount,
          remaining: d.remainingAmount,
          dueDate: fmtDate(d.dueDate),
          status: d.status,
        };
      }),
    };
  },

  get_low_stock: async (args, shopId) => {
    const threshold =
      Number(args.threshold) >= 0
        ? Number(args.threshold)
        : 5;
    const limit = Math.min(
      Math.max(Number(args.limit) || 20, 1),
      50
    );

    const products = await Product.find({
      shopId: toOid(shopId),
      quantity: { $lte: threshold },
    })
      .select('name brand model sku salePrice quantity')
      .sort({ quantity: 1 })
      .limit(limit)
      .lean();

    return {
      threshold,
      count: products.length,
      products: products.map((p) => ({
        name: p.name,
        brand: p.brand,
        model: p.model,
        sku: p.sku,
        price: p.salePrice,
        stock: p.quantity,
      })),
    };
  },

  get_payments_report: async (args, shopId) => {
    const oid = toOid(shopId);
    const to = args.to || pkDateString();
    const from =
      args.from ||
      pkDateString(
        new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      );

    const match = {
      shopId: oid,
      isArchived: { $ne: true },
      ...dateRangeMatch({ from, to }, 'paymentDate'),
    };

    const [totals] = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const byMethod = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);

    return {
      from,
      to,
      count: totals?.count || 0,
      total: totals?.total || 0,
      byMethod: byMethod.map((b) => ({
        method: b._id,
        count: b.count,
        total: b.total,
      })),
    };
  },
};

const runReadTool = async (name, args, shopId) => {
  const fn = readTools[name];

  if (!fn) {
    return { error: `Unknown tool: ${name}` };
  }

  try {
    return await fn(args || {}, shopId);
  } catch (err) {
    return {
      error: `Tool ${name} failed: ${err.message}`,
    };
  }
};

// ============================================================
// WRITE-TOOL CONFIRMATION BUILDERS
// (do NOT execute — just validate + describe)
// ============================================================

const resolveCustomer = async (args, shopId) => {
  const oid = toOid(shopId);

  if (
    args.customerId &&
    mongoose.Types.ObjectId.isValid(
      String(args.customerId)
    )
  ) {
    const c = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(
        String(args.customerId)
      ),
      shopId: oid,
    })
      .select('fullName mobileNumber')
      .lean();
    if (c) return { customer: c };
  }

  if (args.customerName) {
    const q = escRegex(args.customerName);
    const list = await Customer.find({
      shopId: oid,
      fullName: { $regex: q, $options: 'i' },
    })
      .select('fullName mobileNumber')
      .limit(5)
      .lean();

    if (list.length === 1) {
      return { customer: list[0] };
    }
    if (list.length > 1) {
      return {
        error:
          `Is naam se ${list.length} customers mile: ` +
          list
            .map(
              (c) =>
                `${c.fullName} (${c.mobileNumber})`
            )
            .join(', ') +
          '. Pehle find_customer se exact customer choose karein.',
      };
    }
  }

  return {
    error:
      'Customer nahi mila. Pehle find_customer se customer dhoondein.',
  };
};

const oldestDueInstallment = async (
  customerId,
  shopId
) => {
  const oid = toOid(shopId);

  const plans = await InstallmentPlan.find({
    shopId: oid,
    customer: new mongoose.Types.ObjectId(
      String(customerId)
    ),
  })
    .select('_id planId')
    .lean();

  if (!plans.length) return null;

  const inst = await Installment.findOne({
    shopId: oid,
    installmentPlan: {
      $in: plans.map((p) => p._id),
    },
    status: {
      $in: ['Pending', 'Partially Paid', 'Overdue'],
    },
    remainingAmount: { $gt: 0 },
  })
    .sort({ dueDate: 1 })
    .lean();

  if (!inst) return null;

  const plan = plans.find(
    (p) =>
      String(p._id) ===
      String(inst.installmentPlan)
  );

  return { installment: inst, plan };
};

const buildWriteConfirmation = async (
  name,
  args,
  shopId
) => {
  // ---------- record_payment ----------
  if (name === 'record_payment') {
    const amount = Number(args.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        error:
          'Payment amount 0 se bara hona chahiye.',
      };
    }

    const resolved = await resolveCustomer(
      args,
      shopId
    );
    if (resolved.error) return resolved;

    const due = await oldestDueInstallment(
      resolved.customer._id,
      shopId
    );

    if (!due) {
      return {
        error:
          `${resolved.customer.fullName} ki koi due installment nahi hai. Payment record nahi ho sakti.`,
      };
    }

    const method = PAYMENT_METHODS.includes(
      args.method
    )
      ? args.method
      : 'Cash';

    const safeArgs = {
      customerId: String(resolved.customer._id),
      amount,
      method,
      note: String(args.note || '').slice(0, 200),
    };

    const summary =
      `${resolved.customer.fullName} (${resolved.customer.mobileNumber}) ki ` +
      `${fmtRs(amount)} ${method} payment — ` +
      `installment #${due.installment.installmentNumber} ` +
      `(${fmtRs(due.installment.remainingAmount)} due, due date ${fmtDate(due.installment.dueDate)}) ` +
      `me adjust hogi. Confirm karun?`;

    return { safeArgs, summary };
  }

  // ---------- create_customer ----------
  if (name === 'create_customer') {
    const fullName = String(
      args.fullName || ''
    ).trim();
    const mobileNumber = String(
      args.mobileNumber || ''
    ).trim();

    if (!fullName || !mobileNumber) {
      return {
        error:
          'Customer ka naam aur mobile number dono chahiye.',
      };
    }

    const existing = await Customer.findOne({
      shopId: toOid(shopId),
      mobileNumber,
    })
      .select('fullName')
      .lean();

    if (existing) {
      return {
        error:
          `Is mobile number par pehle se customer hai: ${existing.fullName}.`,
      };
    }

    const safeArgs = {
      fullName,
      mobileNumber,
      address: String(args.address || '').slice(
        0,
        200
      ),
    };

    const summary =
      `Naya customer: ${fullName} (${mobileNumber})` +
      (safeArgs.address
        ? `, ${safeArgs.address}`
        : '') +
      '. Create kar dun?';

    return { safeArgs, summary };
  }

  // ---------- add_expense ----------
  if (name === 'add_expense') {
    const title = String(args.title || '').trim();
    const amount = Number(args.amount);

    if (!title) {
      return { error: 'Kharchay ka title chahiye.' };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        error:
          'Kharchay ki amount 0 se bari honi chahiye.',
      };
    }

    const category = EXPENSE_CATEGORIES.includes(
      args.category
    )
      ? args.category
      : 'Other';

    const safeArgs = { title, amount, category };

    const summary =
      `${fmtRs(amount)} ka kharcha — "${title}" (${category}) record kar dun?`;

    return { safeArgs, summary };
  }

  return { error: `Unknown write tool: ${name}` };
};

// ============================================================
// MAIN AGENT LOOP
// ============================================================

const runAiAgent = async ({
  message,
  shopId,
  history = [],
}) => {
  const messages = [
    { role: 'system', content: systemPrompt() },
  ];

  // Keep history short: long histories blow through Groq's
  // per-minute token limit (429). 6 recent turns is plenty
  // for follow-ups like "uski udhaar kitni baqi hai?".
  for (const h of (history || []).slice(-6)) {
    if (h.userMessage) {
      messages.push({
        role: 'user',
        content: String(h.userMessage).slice(0, 500),
      });
    }
    if (h.assistantResponse) {
      messages.push({
        role: 'assistant',
        content: String(h.assistantResponse).slice(
          0,
          800
        ),
      });
    }
  }

  messages.push({ role: 'user', content: message });

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const msg = await groqChat(messages, TOOLS);

    messages.push({
      role: 'assistant',
      content: msg.content || null,
      tool_calls: msg.tool_calls || undefined,
    });

    const calls = msg.tool_calls || [];

    if (!calls.length) {
      return {
        answer:
          msg.content ||
          'Maaf kijiye, jawab tayar nahi ho saka. Dobara try karein.',
        pendingAction: null,
      };
    }

    let pending = null;

    for (const call of calls) {
      const toolName = call.function?.name;
      let toolArgs = {};

      try {
        toolArgs = JSON.parse(
          call.function?.arguments || '{}'
        );
      } catch {
        toolArgs = {};
      }

      toolArgs = stripForbidden(toolArgs);

      // ----- WRITE tools: confirm, don't execute -----
      if (WRITE_TOOLS.has(toolName)) {
        const built = await buildWriteConfirmation(
          toolName,
          toolArgs,
          shopId
        );

        if (built.error) {
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: toolName,
            content: JSON.stringify({
              error: built.error,
            }),
          });
        } else {
          pending = {
            action: {
              tool: toolName,
              args: built.safeArgs,
            },
            summary: built.summary,
          };
        }
        continue;
      }

      // ----- READ tools: execute now -----
      const result = await runReadTool(
        toolName,
        toolArgs,
        shopId
      );

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: toolName,
        content: JSON.stringify(result).slice(
          0,
          6000
        ),
      });
    }

    if (pending) {
      return { answer: null, pendingAction: pending };
    }
  }

  const last = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && m.content);

  return {
    answer:
      (last && last.content) ||
      'Maaf kijiye, jawab tayar nahi ho saka. Dobara try karein.',
    pendingAction: null,
  };
};

// ============================================================
// EXECUTE CONFIRMED WRITE ACTION
// Re-validates everything against the shop before writing.
// ============================================================

const executeConfirmedAction = async ({
  shopId,
  tool,
  args = {},
}) => {
  if (
    !shopId ||
    !mongoose.Types.ObjectId.isValid(String(shopId))
  ) {
    return {
      success: false,
      message: 'Shop context missing hai.',
    };
  }

  const oid = toOid(shopId);
  const clean = stripForbidden(args);

  try {
    // ---------- record_payment ----------
    if (tool === 'record_payment') {
      const amount = Number(clean.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        return {
          success: false,
          message: 'Amount valid nahi hai.',
        };
      }

      const resolved = await resolveCustomer(
        clean,
        oid
      );
      if (resolved.error) {
        return {
          success: false,
          message: resolved.error,
        };
      }

      const due = await oldestDueInstallment(
        resolved.customer._id,
        oid
      );
      if (!due) {
        return {
          success: false,
          message:
            `${resolved.customer.fullName} ki koi due installment nahi hai.`,
        };
      }

      const method = PAYMENT_METHODS.includes(
        clean.method
      )
        ? clean.method
        : 'Cash';

      // Reuse the existing battle-tested payment logic.
      const { payInstallment } = require('../controllers/installmentController');

      let statusCode = 200;
      let payload = null;

      const mockReq = {
        shopId: oid,
        body: {
          installmentId: String(
            due.installment._id
          ),
          paymentAmount: amount,
          paymentMethod: method,
          notes: String(clean.note || '').slice(
            0,
            200
          ),
        },
      };

      const mockRes = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          payload = data;
          return this;
        },
      };

      await payInstallment(mockReq, mockRes);

      if (
        statusCode >= 200 &&
        statusCode < 300 &&
        payload?.success
      ) {
        return {
          success: true,
          message:
            `✅ ${fmtRs(amount)} ki payment record ho gayi — ` +
            `${resolved.customer.fullName} (installment #${due.installment.installmentNumber}). ` +
            (payload.message || ''),
        };
      }

      return {
        success: false,
        message:
          payload?.message ||
          'Payment record nahi ho saki. Dobara try karein.',
      };
    }

    // ---------- create_customer ----------
    if (tool === 'create_customer') {
      const fullName = String(
        clean.fullName || ''
      ).trim();
      const mobileNumber = String(
        clean.mobileNumber || ''
      ).trim();

      if (!fullName || !mobileNumber) {
        return {
          success: false,
          message:
            'Naam aur mobile number dono chahiye.',
        };
      }

      const existing = await Customer.findOne({
        shopId: oid,
        mobileNumber,
      })
        .select('fullName')
        .lean();

      if (existing) {
        return {
          success: false,
          message: `Is number par customer pehle se hai: ${existing.fullName}.`,
        };
      }

      // Same ID format as the app: "01", "02", ...
      const last = await Customer.find({ shopId: oid })
        .select('customerId')
        .lean();

      let maxNum = 0;
      last.forEach((c) => {
        const n = parseInt(
          String(c.customerId || '').replace(
            /[^0-9]/g,
            ''
          ),
          10
        );
        if (!isNaN(n) && n > maxNum) maxNum = n;
      });

      const customerId = String(
        maxNum + 1
      ).padStart(2, '0');

      await Customer.create({
        shopId: oid,
        customerId,
        fullName,
        mobileNumber,
        address: String(clean.address || '').slice(
          0,
          200
        ),
      });

      return {
        success: true,
        message: `✅ Customer create ho gaya: ${fullName} (${mobileNumber}).`,
      };
    }

    // ---------- add_expense ----------
    if (tool === 'add_expense') {
      const title = String(
        clean.title || ''
      ).trim();
      const amount = Number(clean.amount);

      if (!title || !Number.isFinite(amount) || amount <= 0) {
        return {
          success: false,
          message:
            'Kharchay ka title aur valid amount chahiye.',
        };
      }

      const category = EXPENSE_CATEGORIES.includes(
        clean.category
      )
        ? clean.category
        : 'Other';

      // Same ID format as the app: EXP-0001, EXP-0002, ...
      const lastExpense = await Expense.findOne({
        shopId: oid,
        expenseId: /^EXP-\d+$/,
      }).sort({ expenseId: -1 });

      let nextNum = 1;
      if (lastExpense?.expenseId) {
        const n = parseInt(
          String(lastExpense.expenseId).split(
            '-'
          )[1],
          10
        );
        if (!isNaN(n)) nextNum = n + 1;
      }

      const expenseId = `EXP-${String(
        nextNum
      ).padStart(4, '0')}`;

      await Expense.create({
        shopId: oid,
        expenseId,
        title,
        amount,
        category,
        expenseDate: new Date(),
      });

      return {
        success: true,
        message: `✅ ${fmtRs(amount)} ka kharcha record ho gaya: "${title}" (${category}).`,
      };
    }

    return {
      success: false,
      message: 'Unknown action.',
    };
  } catch (err) {
    console.error(
      'AI executeConfirmedAction error:',
      err.message
    );
    return {
      success: false,
      message:
        'Action execute nahi ho saka. Dobara try karein.',
    };
  }
};

module.exports = {
  runAiAgent,
  executeConfirmedAction,
};
