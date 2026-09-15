const mongoose = require('mongoose');

const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const Installment = require('../models/Installment');
const InstallmentPlan = require('../models/InstallmentPlan');
const Expense = require('../models/Expense');

const aiTools = require('./aiTools');

// =====================================================
// AI TOOLS
// =====================================================

const {
  searchCustomers,
  searchProducts,

  getCustomerDetails,
  getCustomerSales,
  getCustomerInstallmentPlans,
  getCustomerPayments,
  getCustomerHistory,

  getSalesSummary,
  getPaymentSummary,

  getOverdueInstallments,

  getInventorySummary,
  getLowStockProducts,

  getProfitReport,
} = aiTools;


// =====================================================
// SAFE HELPERS
// =====================================================

const toObjectId = (id) => {
  if (!id) return null;

  if (id instanceof mongoose.Types.ObjectId) {
    return id;
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
};


const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};


const money = (value) => {
  return `Rs. ${safeNumber(value).toLocaleString('en-PK')}`;
};


const formatDate = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};


// =====================================================
// BASIC HELPERS
// =====================================================

const clean = (value) => {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
};


const normalize = (value) => {
  return clean(value).toLowerCase();
};


const uniqueById = (items = []) => {
  const map = new Map();

  for (const item of items) {
    const id =
      item?._id?.toString?.() ||
      item?.id?.toString?.();

    if (!id) continue;

    if (!map.has(id)) {
      map.set(id, item);
    }
  }

  return Array.from(map.values());
};


// =====================================================
// DATE HELPERS
// =====================================================

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


const getDateRange = (query) => {
  const text = normalize(query);

  const now = new Date();

  // TODAY
  if (
    text.includes('today') ||
    text.includes('aaj')
  ) {
    return {
      startDate: startOfDay(now),
      endDate: endOfDay(now),
      label: 'Today',
    };
  }

  // YESTERDAY
  if (
    text.includes('yesterday') ||
    text.includes('kal')
  ) {
    const date = new Date(now);

    date.setDate(
      date.getDate() - 1
    );

    return {
      startDate: startOfDay(date),
      endDate: endOfDay(date),
      label: 'Yesterday',
    };
  }

  // THIS WEEK
  if (
    text.includes('this week') ||
    text.includes('is week') ||
    text.includes('iss week') ||
    text.includes('is haftay') ||
    text.includes('iss haftay')
  ) {
    const start = new Date(now);

    const day = start.getDay();

    start.setDate(
      start.getDate() - day
    );

    return {
      startDate: startOfDay(start),
      endDate: endOfDay(now),
      label: 'This Week',
    };
  }

  // THIS MONTH
  if (
    text.includes('this month') ||
    text.includes('is month') ||
    text.includes('iss month') ||
    text.includes('this mahina') ||
    text.includes('is mahine') ||
    text.includes('iss mahine') ||
    text.includes('month ki') ||
    text.includes('mahine ki')
  ) {
    return {
      startDate: new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ),
      endDate: endOfDay(now),
      label: now.toLocaleString(
        'en-US',
        {
          month: 'long',
          year: 'numeric',
        }
      ),
    };
  }

  // THIS YEAR
  if (
    text.includes('this year') ||
    text.includes('is year') ||
    text.includes('iss year') ||
    text.includes('is saal') ||
    text.includes('iss saal')
  ) {
    return {
      startDate: new Date(
        now.getFullYear(),
        0,
        1
      ),
      endDate: new Date(
        now.getFullYear() + 1,
        0,
        1
      ),
      label: String(
        now.getFullYear()
      ),
    };
  }

  // EXPLICIT YEAR
  const yearMatch =
    text.match(/\b(20\d{2})\b/);

  if (yearMatch) {
    const year =
      Number(yearMatch[1]);

    return {
      startDate: new Date(
        year,
        0,
        1
      ),
      endDate: new Date(
        year + 1,
        0,
        1
      ),
      label: String(year),
    };
  }

  return null;
};


// =====================================================
// KEYWORD HELPERS
// =====================================================

const hasAny = (
  text,
  words = []
) => {
  return words.some((word) =>
    text.includes(word)
  );
};


const isBalanceQuery = (text) =>
  hasAny(text, [
    'balance',
    'remaining',
    'remain',
    'baki',
    'baqi',
    'outstanding',
    'payable',
    'due amount',
    'amount due',
    'kitna baki',
    'kitni baki',
  ]);


const isSalesQuery = (text) =>
  hasAny(text, [
    'sale',
    'sales',
    'sold',
    'selling',
    'revenue',
    'purchase',
    'purchases',
    'bought',
    'buy',
    'khareeda',
    'khareedi',
    'becha',
    'bika',
    'sales hui',
    'total sale',
  ]);


const isPaymentQuery = (text) =>
  hasAny(text, [
    'payment',
    'payments',
    'paid',
    'pay',
    'received',
    'receive',
    'jama',
    'diya',
    'deposit',
    'collection',
  ]);


const isInstallmentQuery = (text) =>
  hasAny(text, [
    'installment',
    'installments',
    'qist',
    'qistain',
    'kist',
    'kistein',
    'installment plan',
    'installment plans',
    'due date',
    'due dates',
    'schedule',
    'monthly',
    'mahina',
    'mahine',
  ]);


const isStockQuery = (text) =>
  hasAny(text, [
    'stock',
    'inventory',
    'quantity',
    'available',
    'available hai',
    'low stock',
    'out of stock',
    'kitne pieces',
    'kitni quantity',
  ]);


const isOverdueQuery = (text) =>
  hasAny(text, [
    'overdue',
    'over due',
    'late',
    'late payment',
    'default',
    'pending due',
    'nahi diya',
  ]);


const isProfitQuery = (text) =>
  hasAny(text, [
    'profit',
    'profit hua',
    'profit kitna',
    'munafa',
    'munafa kitna',
    'earning',
    'kamai',
  ]);


const isExpenseQuery = (text) =>
  hasAny(text, [
    'expense',
    'expenses',
    'kharcha',
    'kharchay',
    'kharch',
    'rent',
    'bijli',
    'electricity',
    'salary',
    'salaries',
  ]);


const isUpcomingDueQuery = (text) =>
  hasAny(text, [
    'upcoming due',
    'upcoming dues',
    'due today',
    'due tomorrow',
    'next 7 days',
    'next week due',
    'aglay 7 din',
    'agle 7 din',
    'ane wali qist',
    'aane wali qist',
    'ane wali installment',
    'aane wali installment',
    'kal ki qist',
    'kal ki installment',
  ]);


const isCustomerInfoQuery = (text) =>
  hasAny(text, [
    'customer',
    'customer details',
    'customer information',
    'customer info',
    'client',
    'mobile',
    'phone',
    'number',
    'cnic',
    'address',
    'pata',
    'father',
    'walid',
    'guarantor',
    'zamanti',
    'customer id',
  ]);


// =====================================================
// SEARCH PHRASE
// =====================================================

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
  'shop mein',
  'mein',
  'mai',
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
  'ye',
  'woh',
  'wo',
  'kya',
  'kon',
  'kaun',
  'kab',
  'kahan',
  'kitna',
  'kitni',
  'kis',
  'total',
  'batao',
  'btao',
  'dikhao',
  'mujhe',
  'mere',
  'meri',
  'mera',
  'has',
  'have',
  'had',
  'for',
  'in',
  'on',
  'of',
  'and',
  'to',
  'from',
  'this',
  'that',
  'year',
  'month',
  'today',
  'yesterday',
  'week',
  'aaj',
  'kal',
  'saal',
  'mahina',
  'mahine',
  'iss',
  'is',
  'kaise',
  'kase',
]);


const getSearchPhrase = (query) => {
  const text =
    normalize(query);

  const words =
    text
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => {
        if (
          STOP_WORDS.has(word)
        ) {
          return false;
        }

        if (
          /^\d{4}$/.test(word)
        ) {
          return false;
        }

        return true;
      });

  return words.join(' ').trim();
};


// =====================================================
// UNIVERSAL CUSTOMER SEARCH
// =====================================================

const universalCustomerSearch =
  async (
    message,
    shopId
  ) => {
    try {
      const phrase =
        getSearchPhrase(
          message
        );

      if (!phrase) {
        return [];
      }

      let customers =
        await searchCustomers({
          shopId,
          query: phrase,
          limit: 20,
        });

      if (!customers.length) {
        const tokens =
          phrase
            .split(/\s+/)
            .filter(
              (token) =>
                token.length >= 2
            )
            .slice(0, 6);

        for (
          const token of tokens
        ) {
          const found =
            await searchCustomers({
              shopId,
              query: token,
              limit: 20,
            });

          customers.push(
            ...found
          );
        }
      }

      return uniqueById(
        customers
      ).slice(0, 10);

    } catch (error) {
      console.error(
        'Universal customer search error:',
        error
      );

      return [];
    }
  };


// =====================================================
// UNIVERSAL PRODUCT SEARCH
// =====================================================

const universalProductSearch =
  async (
    message,
    shopId
  ) => {
    try {
      const phrase =
        getSearchPhrase(
          message
        );

      if (!phrase) {
        return [];
      }

      let products =
        await searchProducts({
          shopId,
          query: phrase,
          limit: 20,
        });

      if (!products.length) {
        const tokens =
          phrase
            .split(/\s+/)
            .filter(
              (token) =>
                token.length >= 2
            )
            .slice(0, 6);

        for (
          const token of tokens
        ) {
          const found =
            await searchProducts({
              shopId,
              query: token,
              limit: 20,
            });

          products.push(
            ...found
          );
        }
      }

      return uniqueById(
        products
      ).slice(0, 10);

    } catch (error) {
      console.error(
        'Universal product search error:',
        error
      );

      return [];
    }
  };


// =====================================================
// CUSTOMER SALES
// =====================================================

const getSalesForCustomer =
  async (
    shopId,
    customerId,
    dateRange = null
  ) => {

    const shopObjectId =
      toObjectId(shopId);

    const customerObjectId =
      toObjectId(customerId);

    if (
      !shopObjectId ||
      !customerObjectId
    ) {
      return [];
    }

    const query = {
      shopId: shopObjectId,
      customer:
        customerObjectId,
    };

    if (dateRange) {
      query.saleDate = {
        $gte:
          dateRange.startDate,
        $lt:
          dateRange.endDate,
      };
    }

    return Sale.find(query)
      .sort({
        saleDate: -1,
      })
      .limit(30)

      // IMPORTANT:
      // Full product details
      .populate(
        'product',
        'name brand model category sku serialNumber imei chassisNumber purchasePrice salePrice quantity minStockLevel status supplier warrantyPeriod description'
      )

      .lean();
  };


// =====================================================
// CUSTOMER PAYMENTS
// =====================================================

const getPaymentsForCustomer =
  async (
    shopId,
    customerId,
    dateRange = null
  ) => {

    const shopObjectId =
      toObjectId(shopId);

    const customerObjectId =
      toObjectId(customerId);

    if (
      !shopObjectId ||
      !customerObjectId
    ) {
      return [];
    }

    const query = {
      shopId: shopObjectId,
      customer:
        customerObjectId,
      isArchived: {
        $ne: true,
      },
    };

    if (dateRange) {
      query.paymentDate = {
        $gte:
          dateRange.startDate,
        $lt:
          dateRange.endDate,
      };
    }

    return Payment.find(query)
      .sort({
        paymentDate: -1,
      })
      .limit(30)

      .populate(
        'installment',
        'installmentNumber amount paidAmount remainingAmount dueDate status'
      )

      .populate(
        'sale',
        'saleId finalTotal totalWithMarkup remainingBalance paymentType product'
      )

      .lean();
  };


// =====================================================
// CUSTOMER INSTALLMENTS
// =====================================================

const getInstallmentsForCustomer =
  async (
    shopId,
    customerId
  ) => {

    const shopObjectId =
      toObjectId(shopId);

    const customerObjectId =
      toObjectId(customerId);

    if (
      !shopObjectId ||
      !customerObjectId
    ) {
      return [];
    }

    // Get plans directly so we can GUARANTEE
    // product details are included.
    const plans =
      await InstallmentPlan.find({
        shopId: shopObjectId,
        customer:
          customerObjectId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    if (!plans.length) {
      return [];
    }

    const planIds =
      plans.map(
        (plan) => plan._id
      );

    const installments =
      await Installment.find({
        shopId: shopObjectId,
        installmentPlan: {
          $in: planIds,
        },
      })
        .sort({
          installmentNumber: 1,
        })
        .lean();

    // Get product IDs from plans
    const productIds =
      plans
        .map((plan) =>
          toObjectId(
            plan.product
          )
        )
        .filter(Boolean);

    const products =
      productIds.length
        ? await Product.find({
            shopId: shopObjectId,
            _id: {
              $in: productIds,
            },
          })
            .select(
              'name brand model category sku serialNumber imei chassisNumber purchasePrice salePrice quantity minStockLevel status supplier warrantyPeriod description'
            )
            .lean()
        : [];

    const productMap =
      new Map(
        products.map(
          (product) => [
            String(
              product._id
            ),
            product,
          ]
        )
      );

    const installmentMap =
      new Map();

    for (const installment of installments) {
      const key =
        String(
          installment.installmentPlan
        );

      if (
        !installmentMap.has(key)
      ) {
        installmentMap.set(
          key,
          []
        );
      }

      installmentMap
        .get(key)
        .push({
          ...installment,
          id:
            installment._id,
        });
    }

    return plans.map(
      (plan) => {

        const product =
          productMap.get(
            String(
              plan.product
            )
          ) || null;

        return {
          ...plan,

          id: plan._id,

          // IMPORTANT:
          // Product object is included
          product,

          installments:
            installmentMap.get(
              String(plan._id)
            ) || [],
        };
      }
    );
  };


// =====================================================
// PRODUCT SALES
// =====================================================

const getSalesForProduct =
  async (
    shopId,
    productId,
    dateRange = null
  ) => {

    const shopObjectId =
      toObjectId(shopId);

    const productObjectId =
      toObjectId(productId);

    if (
      !shopObjectId ||
      !productObjectId
    ) {
      return [];
    }

    const query = {
      shopId:
        shopObjectId,

      product:
        productObjectId,
    };

    if (dateRange) {
      query.saleDate = {
        $gte:
          dateRange.startDate,
        $lt:
          dateRange.endDate,
      };
    }

    return Sale.find(query)
      .sort({
        saleDate: -1,
      })
      .limit(30)

      .populate(
        'customer',
        'customerId fullName mobileNumber'
      )

      .lean();
  };


// =====================================================
// SHOP SALES
// =====================================================

const getShopSales =
  async (
    shopId,
    dateRange = null
  ) => {

    const shopObjectId =
      toObjectId(shopId);

    if (!shopObjectId) {
      return [];
    }

    const query = {
      shopId:
        shopObjectId,
    };

    if (dateRange) {
      query.saleDate = {
        $gte:
          dateRange.startDate,
        $lt:
          dateRange.endDate,
      };
    }

    return Sale.find(query)
      .sort({
        saleDate: -1,
      })
      .limit(50)

      .populate(
        'customer',
        'customerId fullName mobileNumber'
      )

      .populate(
        'product',
        'name brand model category sku serialNumber imei chassisNumber purchasePrice salePrice quantity status supplier warrantyPeriod'
      )

      .lean();
  };


// =====================================================
// SHOP PAYMENTS
// =====================================================

const getShopPayments =
  async (
    shopId,
    dateRange = null
  ) => {

    const shopObjectId =
      toObjectId(shopId);

    if (!shopObjectId) {
      return [];
    }

    const query = {
      shopId:
        shopObjectId,

      isArchived: {
        $ne: true,
      },
    };

    if (dateRange) {
      query.paymentDate = {
        $gte:
          dateRange.startDate,
        $lt:
          dateRange.endDate,
      };
    }

    return Payment.find(query)
      .sort({
        paymentDate: -1,
      })
      .limit(50)

      .populate(
        'customer',
        'customerId fullName mobileNumber'
      )

      .populate(
        'installment',
        'installmentNumber amount paidAmount remainingAmount dueDate status'
      )

      .populate(
        'sale',
        'saleId finalTotal totalWithMarkup remainingBalance paymentType product'
      )

      .lean();
  };


// =====================================================
// CUSTOMER HEADER
// =====================================================

const formatCustomerHeader =
  (
    customer,
    balance = {}
  ) => {

    const total =
      safeNumber(
        balance.totalPurchases
      );

    const paid =
      safeNumber(
        balance.totalPaid
      );

    const remaining =
      safeNumber(
        balance.remainingBalance
      );

    return [
      `👤 Customer: ${
        customer.fullName ||
        customer.name ||
        'N/A'
      }`,

      customer.customerId
        ? `🆔 Customer ID: ${customer.customerId}`
        : null,

      customer.mobileNumber
        ? `📱 Mobile: ${customer.mobileNumber}`
        : null,

      customer.cnic
        ? `🪪 CNIC: ${customer.cnic}`
        : null,

      customer.city
        ? `🏙️ City: ${customer.city}`
        : null,

      `💰 Total Purchases: ${money(
        total
      )}`,

      `💵 Paid: ${money(
        paid
      )}`,

      `📌 Remaining: ${money(
        remaining
      )}`,
    ]
      .filter(Boolean)
      .join('\n');
  };


// =====================================================
// PRODUCT DETAILS FOR CUSTOMER HISTORY
// =====================================================

const formatPurchasedProduct =
  (
    product,
    sale = null
  ) => {

    if (!product) {
      return [
        '📦 Product: Product details not available',
      ].join('\n');
    }

    const lines = [
      '🛍️ Product Purchased',
    ];

    lines.push(
      `📦 Product: ${
        product.name ||
        product.model ||
        'N/A'
      }`
    );

    if (product.brand) {
      lines.push(
        `🏷️ Brand: ${product.brand}`
      );
    }

    if (product.model) {
      lines.push(
        `🔖 Model: ${product.model}`
      );
    }

    if (product.category) {
      lines.push(
        `📂 Category: ${product.category}`
      );
    }

    if (product.sku) {
      lines.push(
        `🆔 SKU: ${product.sku}`
      );
    }

    if (product.imei) {
      lines.push(
        `📱 IMEI: ${product.imei}`
      );
    }

    if (product.serialNumber) {
      lines.push(
        `🔢 Serial Number: ${product.serialNumber}`
      );
    }

    if (product.chassisNumber) {
      lines.push(
        `🔧 Chassis Number: ${product.chassisNumber}`
      );
    }

    if (product.salePrice !== undefined) {
      lines.push(
        `💰 Current Sale Price: ${money(
          product.salePrice
        )}`
      );
    }

    if (product.purchasePrice !== undefined) {
      lines.push(
        `💵 Purchase Price: ${money(
          product.purchasePrice
        )}`
      );
    }

    if (sale) {
      lines.push(
        `📦 Quantity Bought: ${safeNumber(
          sale.quantity
        )}`
      );
    }

    if (product.warrantyPeriod) {
      lines.push(
        `🛡️ Warranty: ${product.warrantyPeriod}`
      );
    }

    return lines.join('\n');
  };


// =====================================================
// CUSTOMER SALES FORMAT
// =====================================================

const formatCustomerSales =
  (sales = []) => {

    if (!sales.length) {
      return '🛒 No sales found.';
    }

    const lines = [
      `🛒 Purchase History: ${sales.length}`,
    ];

    sales
      .slice(0, 15)
      .forEach(
        (sale, index) => {

          const product =
            sale.product;

          lines.push('');
          lines.push(
            `━━━━━━━━━━━━━━━━━━━━`
          );

          lines.push(
            `🧾 Sale #${index + 1}`
          );

          // PRODUCT DETAILS
          lines.push(
            formatPurchasedProduct(
              product,
              sale
            )
          );

          // SALE DETAILS
          lines.push('');

          lines.push(
            `💳 Payment Type: ${
              sale.paymentType ||
              'N/A'
            }`
          );

          lines.push(
            `💰 Sale Amount: ${money(
              sale.totalWithMarkup ||
                sale.finalTotal
            )}`
          );

          if (
            sale.downPayment !==
            undefined
          ) {
            lines.push(
              `💵 Down Payment: ${money(
                sale.downPayment
              )}`
            );
          }

          if (
            sale.remainingBalance !==
            undefined
          ) {
            lines.push(
              `📌 Remaining Balance: ${money(
                sale.remainingBalance
              )}`
            );
          }

          if (
            sale.selectedInstallmentDuration
          ) {
            lines.push(
              `⏳ Installment Duration: ${
                sale.selectedInstallmentDuration
              } Months`
            );
          }

          if (
            sale.installmentDuration &&
            !sale.selectedInstallmentDuration
          ) {
            lines.push(
              `⏳ Installment Duration: ${
                sale.installmentDuration
              } Months`
            );
          }

          lines.push(
            `📅 Sale Date: ${formatDate(
              sale.saleDate
            )}`
          );
        }
      );

    if (sales.length > 15) {
      lines.push(
        `...and ${
          sales.length - 15
        } more sales.`
      );
    }

    return lines.join('\n');
  };


// =====================================================
// CUSTOMER PAYMENTS FORMAT
// =====================================================

const formatCustomerPayments =
  (payments = []) => {

    if (!payments.length) {
      return '💳 No payments found.';
    }

    const total =
      payments.reduce(
        (sum, payment) =>
          sum +
          safeNumber(
            payment.amount
          ),
        0
      );

    const lines = [
      `💳 Payments: ${payments.length}`,
      `💰 Total Paid: ${money(
        total
      )}`,
    ];

    payments
      .slice(0, 15)
      .forEach(
        (payment, index) => {

          lines.push('');

          lines.push(
            `#${index + 1} — ${money(
              payment.amount
            )} — ${
              payment.paymentMethod ||
              'Cash'
            } — ${formatDate(
              payment.paymentDate
            )}`
          );

          if (
            payment.installment
          ) {
            lines.push(
              `   📆 Installment #${
                payment.installment
                  .installmentNumber ||
                '-'
              }`
            );

            lines.push(
              `   Due: ${formatDate(
                payment.installment.dueDate
              )}`
            );

            lines.push(
              `   Status: ${
                payment.installment.status ||
                'N/A'
              }`
            );
          }
        }
      );

    return lines.join('\n');
  };


// =====================================================
// CUSTOMER INSTALLMENT FORMAT
// =====================================================

const formatCustomerInstallments =
  (plans = []) => {

    if (!plans.length) {
      return '📆 No installment plans found.';
    }

    const lines = [
      `📆 Installment Plans: ${plans.length}`,
    ];

    plans.forEach(
      (plan, planIndex) => {

        const product =
          plan.product;

        lines.push('');
        lines.push(
          `━━━━━━━━━━━━━━━━━━━━`
        );

        lines.push(
          `📋 Installment Plan #${
            planIndex + 1
          }`
        );

        // =========================================
        // PRODUCT DETAILS
        // =========================================

        lines.push(
          formatPurchasedProduct(
            product
          )
        );

        // =========================================
        // PLAN DETAILS
        // =========================================

        lines.push('');
        lines.push(
          '📆 Installment Plan Details'
        );

        if (plan.planId) {
          lines.push(
            `🆔 Plan ID: ${plan.planId}`
          );
        }

        if (plan.status) {
          lines.push(
            `📊 Status: ${plan.status}`
          );
        }

        if (
          plan.totalAmount !==
          undefined
        ) {
          lines.push(
            `💰 Total Amount: ${money(
              plan.totalAmount
            )}`
          );
        }

        lines.push(
          `💵 Down Payment: ${money(
            plan.downPayment
          )}`
        );

        lines.push(
          `📌 Remaining Balance: ${money(
            plan.remainingBalance
          )}`
        );

        const duration =
          plan.selectedDuration ||
          plan.duration;

        if (duration) {
          lines.push(
            `⏳ Duration: ${duration} Months`
          );
        }

        if (
          plan.treatDownPaymentAsFirstInstallment
        ) {
          lines.push(
            `☑️ Down Payment counted as First Installment`
          );
        }

        if (plan.firstDueDate) {
          lines.push(
            `📅 First Due Date: ${formatDate(
              plan.firstDueDate
            )}`
          );
        }

        // =========================================
        // INSTALLMENT SCHEDULE
        // =========================================

        const installments =
          plan.installments || [];

        if (installments.length) {

          lines.push('');
          lines.push(
            '🗓️ Installment Schedule'
          );

          installments
            .slice(0, 30)
            .forEach(
              (installment) => {

                lines.push(
                  `#${installment.installmentNumber} — ` +
                  `Amount: ${money(
                    installment.amount
                  )} — ` +
                  `Paid: ${money(
                    installment.paidAmount
                  )} — ` +
                  `Remaining: ${money(
                    installment.remainingAmount
                  )} — ` +
                  `Due: ${formatDate(
                    installment.dueDate
                  )} — ` +
                  `${
                    installment.status ||
                    'Pending'
                  }`
                );
              }
            );

        } else {

          lines.push(
            '🗓️ No installment schedule found.'
          );
        }
      }
    );

    return lines.join('\n');
  };


// =====================================================
// PRODUCT FORMAT
// =====================================================

const formatProduct =
  (product) => {

    const lines = [
      `📦 ${
        product.name ||
        'Product'
      }`,
    ];

    if (product.brand) {
      lines.push(
        `Brand: ${product.brand}`
      );
    }

    if (product.model) {
      lines.push(
        `Model: ${product.model}`
      );
    }

    if (product.category) {
      lines.push(
        `Category: ${product.category}`
      );
    }

    if (product.sku) {
      lines.push(
        `SKU: ${product.sku}`
      );
    }

    if (product.imei) {
      lines.push(
        `IMEI: ${product.imei}`
      );
    }

    if (product.serialNumber) {
      lines.push(
        `Serial: ${product.serialNumber}`
      );
    }

    if (product.chassisNumber) {
      lines.push(
        `Chassis: ${product.chassisNumber}`
      );
    }

    lines.push(
      `Stock: ${safeNumber(
        product.quantity
      )}`
    );

    lines.push(
      `Sale Price: ${money(
        product.salePrice
      )}`
    );

    lines.push(
      `Purchase Price: ${money(
        product.purchasePrice
      )}`
    );

    lines.push(
      `Status: ${
        product.status ||
        'N/A'
      }`
    );

    if (product.supplier) {
      lines.push(
        `Supplier: ${product.supplier}`
      );
    }

    if (product.warrantyPeriod) {
      lines.push(
        `Warranty: ${product.warrantyPeriod}`
      );
    }

    if (product.description) {
      lines.push(
        `Description: ${product.description}`
      );
    }

    return lines.join('\n');
  };


// =====================================================
// PRODUCT SALES FORMAT
// =====================================================

const formatProductSales =
  (
    product,
    sales = []
  ) => {

    if (!sales.length) {
      return '';
    }

    const lines = [
      `🛍️ Sales of ${
        product.name ||
        product.model ||
        'Product'
      }: ${sales.length}`,
    ];

    sales
      .slice(0, 15)
      .forEach(
        (sale, index) => {

          lines.push(
            `${index + 1}. ${
              sale.customer?.fullName ||
              'Unknown Customer'
            } — Qty ${
              safeNumber(
                sale.quantity
              )
            } — ${money(
              sale.totalWithMarkup ||
                sale.finalTotal
            )} — ${
              sale.paymentType ||
              'N/A'
            } — ${formatDate(
              sale.saleDate
            )}`
          );
        }
      );

    return lines.join('\n');
  };


// =====================================================
// SHOP SALES FORMAT
// =====================================================

const formatShopSales =
  (
    sales = [],
    label = 'Sales'
  ) => {

    if (!sales.length) {
      return `📊 ${label}: No sales found.`;
    }

    const total =
      sales.reduce(
        (sum, sale) =>
          sum +
          safeNumber(
            sale.totalWithMarkup ||
              sale.finalTotal
          ),
        0
      );

    const cash =
      sales
        .filter(
          (sale) =>
            sale.paymentType ===
            'Cash'
        )
        .reduce(
          (sum, sale) =>
            sum +
            safeNumber(
              sale.finalTotal
            ),
          0
        );

    const installment =
      sales
        .filter(
          (sale) =>
            sale.paymentType ===
            'Installment'
        )
        .reduce(
          (sum, sale) =>
            sum +
            safeNumber(
              sale.totalWithMarkup ||
                sale.finalTotal
            ),
          0
        );

    return [
      `📊 ${label}`,
      `🧾 Sales Count: ${sales.length}`,
      `💰 Total Sales: ${money(
        total
      )}`,
      `💵 Cash Sales: ${money(
        cash
      )}`,
      `📆 Installment Sales: ${money(
        installment
      )}`,
    ].join('\n');
  };


// =====================================================
// SHOP PAYMENT FORMAT
// =====================================================

const formatShopPayments =
  (
    payments = [],
    label = 'Payments'
  ) => {

    if (!payments.length) {
      return `💳 ${label}: No payments found.`;
    }

    const total =
      payments.reduce(
        (sum, payment) =>
          sum +
          safeNumber(
            payment.amount
          ),
        0
      );

    return [
      `💳 ${label}`,
      `🧾 Payment Count: ${payments.length}`,
      `💰 Received: ${money(
        total
      )}`,
    ].join('\n');
  };


// =====================================================
// OVERDUE FORMAT
// =====================================================

const formatOverdue =
  (overdue = []) => {

    if (!overdue.length) {
      return '✅ No overdue installments found.';
    }

    const lines = [
      `⚠️ Overdue Installments: ${overdue.length}`,
    ];

    overdue
      .slice(0, 20)
      .forEach(
        (item, index) => {

          const installment =
            item.installment;

          const customer =
            item.customer?.fullName ||
            'Unknown Customer';

          const product =
            item.product;

          lines.push('');
          lines.push(
            `━━━━━━━━━━━━━━━━━━━━`
          );

          lines.push(
            `${index + 1}. 👤 ${customer}`
          );

          // PRODUCT DETAILS
          lines.push(
            formatPurchasedProduct(
              product
            )
          );

          // INSTALLMENT DETAILS
          lines.push(
            `📆 Installment #${
              installment?.installmentNumber ||
              '-'
            }`
          );

          lines.push(
            `💰 Original Amount: ${money(
              installment?.originalAmount ||
                installment?.amount
            )}`
          );

          lines.push(
            `📌 Remaining: ${money(
              installment?.remainingAmount
            )}`
          );

          lines.push(
            `📅 Due Date: ${formatDate(
              installment?.dueDate
            )}`
          );

          lines.push(
            `📊 Status: ${
              installment?.status ||
              'Overdue'
            }`
          );

          if (item.planId) {
            lines.push(
              `🆔 Plan ID: ${item.planId}`
            );
          }
        }
      );

    return lines.join('\n');
  };


// =====================================================
// INVENTORY RESULT
// =====================================================

const buildInventoryResult =
  async (shopId) => {

    const summary =
      await getInventorySummary({
        shopId,
      });

    if (
      !summary?.found
    ) {
      return '📦 No products found in inventory.';
    }

    const products =
      summary.products || [];

    const totalProducts =
      products.length;

    const totalQuantity =
      products.reduce(
        (sum, product) =>
          sum +
          safeNumber(
            product.quantity
          ),
        0
      );

    const inventoryValue =
      products.reduce(
        (sum, product) =>
          sum +
          safeNumber(
            product.salePrice
          ) *
          safeNumber(
            product.quantity
          ),
        0
      );

    const lowStockCount =
      products.filter(
        (product) =>
          safeNumber(
            product.quantity
          ) <=
          safeNumber(
            product.minStockLevel
          )
      ).length;

    const outOfStockCount =
      products.filter(
        (product) =>
          safeNumber(
            product.quantity
          ) === 0
      ).length;

    return [
      '📦 Inventory Summary',
      `Products: ${totalProducts}`,
      `Total Quantity: ${totalQuantity}`,
      `Inventory Value: ${money(
        inventoryValue
      )}`,
      `Low Stock: ${lowStockCount}`,
      `Out of Stock: ${outOfStockCount}`,
    ].join('\n');
  };


// =====================================================
// LOW STOCK RESULT
// =====================================================

const buildLowStockResult =
  async (shopId) => {

    const products =
      await getLowStockProducts({
        shopId,
      });

    if (!products.length) {
      return '✅ No low-stock products found.';
    }

    const lines = [
      `⚠️ Low Stock Products: ${products.length}`,
    ];

    products
      .slice(0, 30)
      .forEach(
        (product, index) => {

          lines.push('');

          lines.push(
            `${index + 1}. ${
              product.name
            }`
          );

          lines.push(
            formatProduct(
              product
            )
          );

          lines.push(
            `Minimum Stock: ${safeNumber(
              product.minStockLevel
            )}`
          );
        }
      );

    return lines.join('\n');
  };


// =====================================================
// SALES SUMMARY
// =====================================================

const buildSalesSummaryResult =
  async ({
    shopId,
    dateRange,
  }) => {

    let range =
      dateRange;

    if (!range) {
      const now =
        new Date();

      range = {
        startDate:
          new Date(
            now.getFullYear(),
            0,
            1
          ),

        endDate:
          new Date(
            now.getFullYear() + 1,
            0,
            1
          ),

        label:
          String(
            now.getFullYear()
          ),
      };
    }

    const summary =
      await getSalesSummary({
        shopId,
        startDate:
          range.startDate,
        endDate:
          range.endDate,
      });

    return [
      `📊 Sales — ${range.label}`,

      `🧾 Sales Count: ${
        summary.totalSalesCount ??
        summary.totalSales ??
        0
      }`,

      `💰 Total Amount: ${money(
        summary.totalSalesAmount ??
          summary.totalAmount ??
          0
      )}`,

      `💵 Cash Sales: ${money(
        summary.cashSales
      )}`,

      `📆 Installment Sales: ${money(
        summary.installmentSales
      )}`,
    ].join('\n');
  };


// =====================================================
// PAYMENT SUMMARY
// =====================================================

const buildPaymentSummaryResult =
  async ({
    shopId,
    dateRange,
  }) => {

    let range =
      dateRange;

    if (!range) {
      const now =
        new Date();

      range = {
        startDate:
          new Date(
            now.getFullYear(),
            0,
            1
          ),

        endDate:
          new Date(
            now.getFullYear() + 1,
            0,
            1
          ),

        label:
          String(
            now.getFullYear()
          ),
      };
    }

    const summary =
      await getPaymentSummary({
        shopId,
        startDate:
          range.startDate,
        endDate:
          range.endDate,
      });

    return [
      `💳 Payments — ${range.label}`,

      `🧾 Payment Count: ${
        summary.totalPayments || 0
      }`,

      `💰 Received: ${money(
        summary.totalAmount || 0
      )}`,
    ].join('\n');
  };


// =====================================================
// OVERDUE RESULT
// =====================================================

const buildOverdueResult =
  async (shopId) => {

    const overdue =
      await getOverdueInstallments({
        shopId,
      });

    return formatOverdue(
      overdue || []
    );
  };


// =====================================================
// UPCOMING INSTALLMENTS
// =====================================================

const buildUpcomingInstallmentsResult =
  async (shopId) => {

    const now = new Date();
    const lastDueDate = endOfDay(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 7
      )
    );

    const installments = await Installment.find({
      shopId,
      dueDate: {
        $gte: startOfDay(now),
        $lte: lastDueDate,
      },
      status: {
        $in: ['Pending', 'Partially Paid', 'Overdue'],
      },
      remainingAmount: { $gt: 0 },
    })
      .sort({ dueDate: 1, installmentNumber: 1 })
      .limit(30)
      .lean();

    if (!installments.length) {
      return '📅 Upcoming Installments — Next 7 Days\n\nNo unpaid installments are due in the next 7 days.';
    }

    const planIds = installments.map(
      (installment) => installment.installmentPlan
    );

    const plans = await InstallmentPlan.find({
      shopId,
      _id: { $in: planIds },
    })
      .populate('customer', 'fullName mobileNumber customerId')
      .populate('product', 'name brand model')
      .lean();

    const planMap = new Map(
      plans.map((plan) => [String(plan._id), plan])
    );

    const totalDue = installments.reduce(
      (sum, installment) =>
        sum + safeNumber(installment.remainingAmount),
      0
    );

    const lines = [
      '📅 Upcoming Installments — Next 7 Days',
      `📋 Due Count: ${installments.length}`,
      `💰 Total Due: ${money(totalDue)}`,
      '',
    ];

    installments.forEach((installment, index) => {
      const plan = planMap.get(
        String(installment.installmentPlan)
      );
      const productLabel = [
        plan?.product?.name,
        plan?.product?.brand,
        plan?.product?.model,
      ]
        .filter(Boolean)
        .join(' ');

      lines.push(
        `${index + 1}. ${formatDate(installment.dueDate)} — ${plan?.customer?.fullName || 'Unknown customer'}${plan?.customer?.mobileNumber ? ` (${plan.customer.mobileNumber})` : ''}`
      );
      lines.push(
        `   Installment #${installment.installmentNumber || '-'} — ${money(installment.remainingAmount)}${productLabel ? ` — ${productLabel}` : ''}`
      );
    });

    return lines.join('\n');
  };


// =====================================================
// EXPENSE SUMMARY
// =====================================================

const buildExpenseSummaryResult =
  async ({ shopId, dateRange }) => {

    let range = dateRange;

    if (!range) {
      const now = new Date();

      range = {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: endOfDay(now),
        label: now.toLocaleString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
      };
    }

    const expenses = await Expense.find({
      shopId,
      expenseDate: {
        $gte: range.startDate,
        $lte: range.endDate,
      },
    })
      .sort({ expenseDate: -1, createdAt: -1 })
      .limit(30)
      .lean();

    const total = expenses.reduce(
      (sum, expense) => sum + safeNumber(expense.amount),
      0
    );

    const lines = [
      `🧾 Expenses — ${range.label}`,
      `📋 Expense Entries: ${expenses.length}`,
      `💰 Total Expenses: ${money(total)}`,
    ];

    if (expenses.length) {
      lines.push('');
      lines.push('Recent expenses:');

      expenses.slice(0, 10).forEach((expense, index) => {
        lines.push(
          `${index + 1}. ${expense.title || 'Expense'}${expense.category ? ` (${expense.category})` : ''} — ${money(expense.amount)} — ${formatDate(expense.expenseDate)}`
        );
      });
    }

    return lines.join('\n');
  };


// =====================================================
// PROFIT RESULT
// =====================================================

const buildProfitResult =
  async ({
    shopId,
    dateRange,
  }) => {

    const report =
      await getProfitReport({
        shopId,
        startDate:
          dateRange?.startDate,
        endDate:
          dateRange?.endDate,
      });

    return [
      `📈 Profit Report${
        dateRange?.label
          ? ` — ${dateRange.label}`
          : ''
      }`,

      `💰 Revenue: ${money(
        report.totalRevenue || 0
      )}`,

      `📈 Estimated Profit: ${money(
        report.totalProfit || 0
      )}`,
    ].join('\n');
  };


// =====================================================
// CUSTOMER RESULT
// =====================================================

const buildCustomerResult =
  async ({
    customer,
    message,
    shopId,
    dateRange,
  }) => {

    const text =
      normalize(message);

    const customerId =
      customer._id ||
      customer.id;

    if (!customerId) {
      return 'Customer record ID not found.';
    }

    const details =
      await getCustomerDetails({
        shopId,

        nameOrPhone:
          customer.customerId ||
          customer.mobileNumber ||
          customer.fullName ||
          customer.name,
      });

    const actualCustomer =
      details?.customer ||
      customer;

    const actualCustomerId =
      actualCustomer.id ||
      actualCustomer._id ||
      customerId;

    const history =
      await getCustomerHistory({
        shopId,
        customerId:
          actualCustomerId,
      });

    if (!history) {
      return 'Customer history could not be loaded.';
    }

    const balance =
      history.summary || {};

    const wantsBalance =
      isBalanceQuery(text);

    const wantsSales =
      isSalesQuery(text);

    const wantsPayments =
      isPaymentQuery(text);

    const wantsExpenses =
      isExpenseQuery(text);

    const wantsUpcomingDues =
      isUpcomingDueQuery(text);

    const wantsInstallments =
      isInstallmentQuery(text);

    const wantsInfo =
      isCustomerInfoQuery(text);

    let sales = [];
    let payments = [];
    let plans = [];

    // =================================================
    // IMPORTANT:
    // If user asks about history / purchase /
    // bought / sale, load sales.
    // =================================================

    if (
      wantsSales ||
      (
        !wantsPayments &&
        !wantsInstallments &&
        !wantsBalance &&
        !wantsInfo
      )
    ) {
      sales =
        await getSalesForCustomer(
          shopId,
          actualCustomerId,
          dateRange
        );
    }

    if (wantsPayments) {
      payments =
        await getPaymentsForCustomer(
          shopId,
          actualCustomerId,
          dateRange
        );
    }

    if (
      wantsInstallments ||
      wantsBalance
    ) {
      plans =
        await getInstallmentsForCustomer(
          shopId,
          actualCustomerId
        );
    }

    // =================================================
    // IF USER ASKS "COMPLETE HISTORY"
    // LOAD EVERYTHING
    // =================================================

    const wantsHistory =
      hasAny(text, [
        'history',
        'complete history',
        'full history',
        'record',
        'records',
        'pura record',
        'poora record',
        'puri history',
        'poori history',
        'complete record',
        'all history',
        'sab kuch',
        'kya buy kiya',
        'kya khareeda',
        'kya khareedi',
        'what did',
        'what bought',
      ]);

    if (wantsHistory) {

      if (!sales.length) {
        sales =
          await getSalesForCustomer(
            shopId,
            actualCustomerId,
            dateRange
          );
      }

      if (!payments.length) {
        payments =
          await getPaymentsForCustomer(
            shopId,
            actualCustomerId,
            dateRange
          );
      }

      if (!plans.length) {
        plans =
          await getInstallmentsForCustomer(
            shopId,
            actualCustomerId
          );
      }
    }

    // =================================================
    // CUSTOMER OBJECT
    // =================================================

    const customerObject = {
      ...actualCustomer,

      fullName:
        actualCustomer.fullName ||
        actualCustomer.name,

      customerId:
        actualCustomer.customerId ||
        actualCustomer.code,

      mobileNumber:
        actualCustomer.mobileNumber ||
        actualCustomer.phone,
    };

    const sections = [];

    // HEADER
    sections.push(
      formatCustomerHeader(
        customerObject,
        balance
      )
    );

    // SALES
    if (
      wantsSales ||
      wantsHistory
    ) {
      sections.push(
        formatCustomerSales(
          sales
        )
      );
    }

    // PAYMENTS
    if (
      wantsPayments ||
      wantsHistory
    ) {
      sections.push(
        formatCustomerPayments(
          payments
        )
      );
    }

    // INSTALLMENTS
    if (
      wantsInstallments ||
      wantsHistory
    ) {
      sections.push(
        formatCustomerInstallments(
          plans
        )
      );
    }

    // BALANCE
    if (
      wantsBalance &&
      !wantsInstallments
    ) {
      sections.push(
        `📌 Outstanding Balance: ${money(
          balance.remainingBalance
        )}`
      );
    }

    // SIMPLE CUSTOMER SEARCH
    if (
      !wantsBalance &&
      !wantsSales &&
      !wantsPayments &&
      !wantsInstallments &&
      !wantsInfo &&
      !wantsHistory
    ) {

      sections.push(
        `🧾 Total Sales: ${
          history.summary.totalSales ||
          0
        }`
      );

      sections.push(
        `📆 Installment Plans: ${
          history.summary.totalInstallmentPlans ||
          0
        }`
      );

      sections.push(
        `💳 Payments: ${
          history.summary.totalPayments ||
          0
        }`
      );
    }

    // CUSTOMER INFO
    if (wantsInfo) {

      const infoLines = [
        '👤 Customer Information',
      ];

      if (
        customerObject.fullName
      ) {
        infoLines.push(
          `Name: ${customerObject.fullName}`
        );
      }

      if (
        customerObject.fatherName
      ) {
        infoLines.push(
          `Father Name: ${customerObject.fatherName}`
        );
      }

      if (
        customerObject.mobileNumber
      ) {
        infoLines.push(
          `Mobile: ${customerObject.mobileNumber}`
        );
      }

      if (
        customerObject.cnic
      ) {
        infoLines.push(
          `CNIC: ${customerObject.cnic}`
        );
      }

      if (
        customerObject.address
      ) {
        infoLines.push(
          `Address: ${customerObject.address}`
        );
      }

      if (
        customerObject.city
      ) {
        infoLines.push(
          `City: ${customerObject.city}`
        );
      }

      sections.push(
        infoLines.join('\n')
      );
    }

    return sections
      .filter(Boolean)
      .join('\n\n');
  };


// =====================================================
// PRODUCT RESULT
// =====================================================

const buildProductResult =
  async ({
    product,
    message,
    shopId,
    dateRange,
  }) => {

    const text =
      normalize(message);

    const sections = [
      formatProduct(product),
    ];

    if (
      isSalesQuery(text)
    ) {

      const sales =
        await getSalesForProduct(
          shopId,
          product._id,
          dateRange
        );

      const salesText =
        formatProductSales(
          product,
          sales
        );

      if (salesText) {
        sections.push(
          salesText
        );
      }
    }

    return sections.join(
      '\n\n'
    );
  };


// =====================================================
// FALLBACK
// =====================================================

const universalFallback =
  async ({
    message,
    shopId,
    customers,
    products,
    dateRange,
  }) => {

    const sections = [];

    // CUSTOMERS
    if (customers.length) {

      sections.push(
        `👥 Matching Customers: ${customers.length}`
      );

      customers
        .slice(0, 10)
        .forEach(
          (
            customer,
            index
          ) => {

            sections.push(
              `${index + 1}. ${
                customer.fullName
              }${
                customer.mobileNumber
                  ? ` — ${customer.mobileNumber}`
                  : ''
              }${
                customer.customerId
                  ? ` — ${customer.customerId}`
                  : ''
              }`
            );
          }
        );
    }

    // PRODUCTS
    if (products.length) {

      sections.push(
        `📦 Matching Products: ${products.length}`
      );

      products
        .slice(0, 10)
        .forEach(
          (
            product,
            index
          ) => {

            sections.push(
              `${index + 1}. ${
                product.name
              }${
                product.brand
                  ? ` ${product.brand}`
                  : ''
              }${
                product.model
                  ? ` ${product.model}`
                  : ''
              } — Stock: ${
                safeNumber(
                  product.quantity
                )
              } — ${money(
                product.salePrice
              )}`
            );
          }
        );
    }

    // ONE CUSTOMER
    if (
      customers.length === 1 &&
      !products.length
    ) {

      sections.push(
        await buildCustomerResult({
          customer:
            customers[0],

          message,
          shopId,
          dateRange,
        })
      );
    }

    // ONE PRODUCT
    if (
      products.length === 1 &&
      !customers.length
    ) {

      sections.push(
        await buildProductResult({
          product:
            products[0],

          message,
          shopId,
          dateRange,
        })
      );
    }

    if (!sections.length) {

      return [
        `❌ No matching shop data found for "${clean(
          message
        )}".`,

        '',

        'Try a customer name, mobile, CNIC, customer ID, product/model, stock, price, sale, payment, balance, installment, overdue, profit, or date.',
      ].join('\n');
    }

    return sections.join(
      '\n\n'
    );
  };


// =====================================================
// MAIN UNIVERSAL SEARCH
// =====================================================

const processLocalQuery =
  async ({
    message,
    shopId,
  }) => {

    const query =
      clean(message);

    if (!query) {
      return 'Please enter a search query.';
    }

    if (!shopId) {
      throw new Error(
        'Shop ID is required.'
      );
    }

    // =================================================
    // FIX:
    // toObjectId is now LOCAL
    // =================================================

    const objectShopId =
      toObjectId(shopId);

    if (!objectShopId) {
      throw new Error(
        'Invalid shop ID.'
      );
    }

    const text =
      normalize(query);

    const dateRange =
      getDateRange(query);

    // =================================================
    // INTENTS
    // =================================================

    const wantsInventory =
      isStockQuery(text) ||
      hasAny(text, [
        'all products',
        'product list',
        'products list',
        'shop products',
        'shop mein products',
        'shop me products',
      ]);

    const wantsLowStock =
      hasAny(text, [
        'low stock',
        'low-stock',
        'kam stock',
        'kam quantity',
      ]);

    const wantsOverdue =
      isOverdueQuery(text);

    const wantsProfit =
      isProfitQuery(text);

    const wantsSales =
      isSalesQuery(text);

    const wantsPayments =
      isPaymentQuery(text);

    const wantsExpenses =
      isExpenseQuery(text);

    const wantsUpcomingDues =
      isUpcomingDueQuery(text);

    // =================================================
    // SEARCH ENTITIES
    // =================================================

    const [
      customers,
      products,
    ] = await Promise.all([
      universalCustomerSearch(
        query,
        objectShopId
      ),

      universalProductSearch(
        query,
        objectShopId
      ),
    ]);

    // =================================================
    // SHOP LEVEL REPORTS
    // =================================================

    if (
      wantsProfit &&
      !customers.length &&
      !products.length
    ) {
      return buildProfitResult({
        shopId:
          objectShopId,
        dateRange,
      });
    }

    if (
      wantsOverdue &&
      !customers.length &&
      !products.length
    ) {
      return buildOverdueResult(
        objectShopId
      );
    }

    if (
      wantsUpcomingDues &&
      !wantsOverdue &&
      !customers.length &&
      !products.length
    ) {
      return buildUpcomingInstallmentsResult(
        objectShopId
      );
    }

    if (
      wantsExpenses &&
      !customers.length &&
      !products.length
    ) {
      return buildExpenseSummaryResult({
        shopId: objectShopId,
        dateRange,
      });
    }

    if (
      wantsLowStock &&
      !customers.length &&
      !products.length
    ) {
      return buildLowStockResult(
        objectShopId
      );
    }

    if (
      wantsInventory &&
      !customers.length &&
      !products.length
    ) {
      return buildInventoryResult(
        objectShopId
      );
    }

    if (
      wantsSales &&
      !customers.length &&
      !products.length
    ) {
      return buildSalesSummaryResult({
        shopId:
          objectShopId,
        dateRange,
      });
    }

    if (
      wantsPayments &&
      !customers.length &&
      !products.length
    ) {
      return buildPaymentSummaryResult({
        shopId:
          objectShopId,
        dateRange,
      });
    }

    // =================================================
    // ONE CUSTOMER
    // =================================================

    if (
      customers.length === 1
    ) {

      return buildCustomerResult({
        customer:
          customers[0],

        message:
          query,

        shopId:
          objectShopId,

        dateRange,
      });
    }

    // =================================================
    // MULTIPLE CUSTOMERS
    // =================================================

    if (
      customers.length > 1 &&
      !products.length
    ) {

      const lines = [
        `👥 ${customers.length} customers matched your search:`,
      ];

      customers
        .slice(0, 10)
        .forEach(
          (
            customer,
            index
          ) => {

            lines.push(
              `${index + 1}. ${
                customer.fullName
              } — ${
                customer.mobileNumber ||
                'No mobile'
              } — ${
                customer.customerId ||
                'No ID'
              }`
            );
          }
        );

      lines.push(
        '',
        'Please search with the customer name, mobile number, CNIC, or customer ID for exact details.'
      );

      return lines.join(
        '\n'
      );
    }

    // =================================================
    // ONE PRODUCT
    // =================================================

    if (
      products.length === 1 &&
      !customers.length
    ) {

      return buildProductResult({
        product:
          products[0],

        message:
          query,

        shopId:
          objectShopId,

        dateRange,
      });
    }

    // =================================================
    // MULTIPLE PRODUCTS
    // =================================================

    if (
      products.length > 1 &&
      !customers.length
    ) {

      const lines = [
        `📦 ${products.length} products matched your search:`,
      ];

      products
        .slice(0, 10)
        .forEach(
          (
            product,
            index
          ) => {

            lines.push(
              `${index + 1}. ${
                product.name
              }${
                product.brand
                  ? ` ${product.brand}`
                  : ''
              }${
                product.model
                  ? ` ${product.model}`
                  : ''
              } — Stock: ${
                safeNumber(
                  product.quantity
                )
              } — ${money(
                product.salePrice
              )}`
            );
          }
        );

      lines.push(
        '',
        'Search with a more specific product name, model, brand, SKU, IMEI, or serial number for exact details.'
      );

      return lines.join(
        '\n'
      );
    }

    // =================================================
    // CUSTOMER + PRODUCT
    // =================================================

    if (
      customers.length &&
      products.length
    ) {

      const sections = [];

      const customer =
        customers[0];

      sections.push(
        await buildCustomerResult({
          customer,

          message:
            query,

          shopId:
            objectShopId,

          dateRange,
        })
      );

      // EXACT ONE PRODUCT
      if (
        products.length === 1
      ) {

        const product =
          products[0];

        sections.push(
          await buildProductResult({
            product,

            message:
              query,

            shopId:
              objectShopId,

            dateRange,
          })
        );

        const productSales =
          await getSalesForProduct(
            objectShopId,
            product._id,
            dateRange
          );

        const customerId =
          customer._id ||
          customer.id;

        const customerProductSales =
          productSales.filter(
            (sale) => {

              const saleCustomerId =
                sale.customer?._id ||
                sale.customer?.id;

              return (
                String(
                  saleCustomerId
                ) ===
                String(
                  customerId
                )
              );
            }
          );

        if (
          customerProductSales.length
        ) {

          sections.push(
            [
              `🔗 ${
                customer.fullName
              } + ${
                product.name
              }`,

              `Sales Found: ${
                customerProductSales.length
              }`,

              ...customerProductSales.map(
                (
                  sale,
                  index
                ) =>
                  `${index + 1}. ${money(
                    sale.totalWithMarkup ||
                      sale.finalTotal
                  )} — ${
                    sale.paymentType
                  } — ${formatDate(
                    sale.saleDate
                  )}`
              ),
            ].join('\n')
          );
        }
      }

      return sections.join(
        '\n\n'
      );
    }

    // =================================================
    // FINAL UNIVERSAL FALLBACK
    // =================================================

    return universalFallback({
      message:
        query,

      shopId:
        objectShopId,

      customers,
      products,

      dateRange,
    });
  };


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  processLocalQuery,

  universalSearch:
    processLocalQuery,

  default:
    processLocalQuery,
};
