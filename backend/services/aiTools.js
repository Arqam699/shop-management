
const mongoose = require('mongoose');

const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const Installment = require('../models/Installment');
const InstallmentPlan = require('../models/InstallmentPlan');

// =====================================================
// BASIC HELPERS
// =====================================================

const toObjectId = (id) => {
  if (!id) return null;

  try {
    if (id instanceof mongoose.Types.ObjectId) {
      return id;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const money = (value) => {
  return `Rs. ${safeNumber(value).toLocaleString(
    'en-PK',
    {
      maximumFractionDigits: 2,
    }
  )}`;
};

const formatDate = (date) => {
  if (!date) return '-';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
};

// =====================================================
// SEARCH NORMALIZATION
// =====================================================

const normalizeSearchText = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[_/\\-]+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const escapeRegex = (value) => {
  return String(value || '').replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
};

const getSearchTokens = (value) => {
  const normalized =
    normalizeSearchText(value);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

// =====================================================
// MULTI KEYWORD SEARCH
// =====================================================

/*
  IMPORTANT

  User:
    "16 pro max"

  Tokens:
    16
    pro
    max

  Every token must exist somewhere in the
  product record.

  Therefore:

    iPhone 16 Pro Max -> YES

    iPhone 16 Pro     -> NO

    iPhone 16 Max     -> NO

  User:
    "16 pro"

    iPhone 16 Pro Max -> YES
*/

const buildProductSearchQuery = (
  searchText
) => {
  const tokens =
    getSearchTokens(searchText);

  if (!tokens.length) {
    return {};
  }

  const productFields = [
    'name',
    'brand',
    'model',
    'sku',
    'serialNumber',
    'imei',
    'chassisNumber',
    'category',
    'description',
    'supplier',
  ];

  return {
    $and: tokens.map((token) => ({
      $or: productFields.map(
        (field) => ({
          [field]: {
            $regex: escapeRegex(token),
            $options: 'i',
          },
        })
      ),
    })),
  };
};

// =====================================================
// CUSTOMER QUERY
// =====================================================

const buildCustomerSearchQuery = (
  searchText
) => {
  const tokens =
    getSearchTokens(searchText);

  if (!tokens.length) {
    return {};
  }

  const customerFields = [
    'fullName',
    'fatherName',
    'mobileNumber',
    'alternateMobileNumber',
    'customerId',
    'cnic',
    'city',
    'address',
    'email',
    'notes',
  ];

  return {
    $and: tokens.map((token) => ({
      $or: customerFields.map(
        (field) => ({
          [field]: {
            $regex: escapeRegex(token),
            $options: 'i',
          },
        })
      ),
    })),
  };
};

// =====================================================
// CUSTOMER SEARCH
// =====================================================

const searchCustomers = async ({
  shopId,
  query,
  limit = 20,
}) => {
  const shopObjectId =
    toObjectId(shopId);

  if (!shopObjectId) {
    return [];
  }

  const normalized =
    normalizeSearchText(query);

  if (!normalized) {
    return [];
  }

  const searchQuery =
    buildCustomerSearchQuery(normalized);

  return Customer.find({
    shopId: shopObjectId,
    ...searchQuery,
  })
    .sort({
      createdAt: -1,
    })
    .limit(limit)
    .lean();
};

// =====================================================
// PRODUCT SEARCH
// =====================================================

const searchProducts = async ({
  shopId,
  query,
  limit = 20,
}) => {
  const shopObjectId =
    toObjectId(shopId);

  if (!shopObjectId) {
    return [];
  }

  const normalized =
    normalizeSearchText(query);

  if (!normalized) {
    return [];
  }

  const searchQuery =
    buildProductSearchQuery(normalized);

  let products =
    await Product.find({
      shopId: shopObjectId,
      ...searchQuery,
    })
      .sort({
        quantity: -1,
        createdAt: -1,
      })
      .limit(limit)
      .lean();

  /*
    If strict AND search finds nothing,
    try phrase search.

    Example:
      "16 pro max"
  */

  if (!products.length) {
    const fields = [
      'name',
      'brand',
      'model',
      'sku',
      'serialNumber',
      'imei',
      'chassisNumber',
      'category',
      'description',
      'supplier',
    ];

    products =
      await Product.find({
        shopId: shopObjectId,
        $or: fields.map(
          (field) => ({
            [field]: {
              $regex: escapeRegex(normalized),
              $options: 'i',
            },
          })
        ),
      })
        .sort({
          quantity: -1,
          createdAt: -1,
        })
        .limit(limit)
        .lean();
  }

  /*
    Final fallback:
    individual tokens.

    This helps when product data is stored
    in different fields.

    Example:

      name = iPhone
      brand = Apple
      model = 16 Pro Max

    Search:
      "Apple 16 Pro Max"
  */

  if (!products.length) {
    const tokens =
      getSearchTokens(normalized);

    if (tokens.length) {
      const fields = [
        'name',
        'brand',
        'model',
        'sku',
        'serialNumber',
        'imei',
        'chassisNumber',
        'category',
        'description',
        'supplier',
      ];

      products =
        await Product.find({
          shopId: shopObjectId,
          $or: tokens.flatMap(
            (token) =>
              fields.map(
                (field) => ({
                  [field]: {
                    $regex: escapeRegex(token),
                    $options: 'i',
                  },
                })
              )
          ),
        })
          .sort({
            quantity: -1,
            createdAt: -1,
          })
          .limit(limit)
          .lean();
    }
  }

  return products;
};

// =====================================================
// PRODUCT STOCK
// =====================================================

const getProductStock = async ({
  shopId,
  query,
}) => {
  const products =
    await searchProducts({
      shopId,
      query,
      limit: 20,
    });

  return products.map(
    (product) => ({
      id: product._id,
      name: product.name,
      brand: product.brand,
      model: product.model,
      category: product.category,
      sku: product.sku,

      quantity:
        safeNumber(
          product.quantity
        ),

      minStockLevel:
        safeNumber(
          product.minStockLevel
        ),

      status:
        product.status,

      salePrice:
        safeNumber(
          product.salePrice
        ),
    })
  );
};

// =====================================================
// LOW STOCK
// =====================================================

const getLowStockProducts = async ({
  shopId,
}) => {
  const shopObjectId =
    toObjectId(shopId);

  if (!shopObjectId) {
    return [];
  }

  return Product.find({
    shopId: shopObjectId,
    $expr: {
      $lte: [
        '$quantity',
        '$minStockLevel',
      ],
    },
  })
    .sort({
      quantity: 1,
    })
    .lean();
};

// =====================================================
// INVENTORY SUMMARY
// =====================================================

const getInventorySummary = async ({
  shopId,
  filter,
  productName,
}) => {
  if (
    filter === 'low_stock'
  ) {
    const products =
      await getLowStockProducts({
        shopId,
      });

    return {
      found: products.length > 0,
      products:
        products.map(
          (product) => ({
            id: product._id,
            name: product.name,
            brand: product.brand,
            model: product.model,
            stock:
              safeNumber(
                product.quantity
              ),
            quantity:
              safeNumber(
                product.quantity
              ),
            salePrice:
              safeNumber(
                product.salePrice
              ),
            status:
              product.status,
          })
        ),
    };
  }

  if (
    filter === 'specific_product'
  ) {
    const products =
      await getProductStock({
        shopId,
        query: productName,
      });

    return {
      found: products.length > 0,
      products:
        products.map(
          (product) => ({
            ...product,
            stock:
              safeNumber(
                product.quantity
              ),
          })
        ),
    };
  }

  const shopObjectId =
    toObjectId(shopId);

  if (!shopObjectId) {
    return {
      found: false,
      products: [],
    };
  }

  const products =
    await Product.find({
      shopId: shopObjectId,
    })
      .sort({
        quantity: -1,
        createdAt: -1,
      })
      .lean();

  return {
    found: products.length > 0,
    products:
      products.map(
        (product) => ({
          id: product._id,
          name: product.name,
          brand: product.brand,
          model: product.model,
          stock:
            safeNumber(
              product.quantity
            ),
          quantity:
            safeNumber(
              product.quantity
            ),
          salePrice:
            safeNumber(
              product.salePrice
            ),
          status:
            product.status,
        })
      ),
  };
};

// =====================================================
// CUSTOMER BALANCE
// =====================================================

const calculateCustomerBalance = async ({
  shopId,
  customerId,
}) => {
  const shopObjectId =
    toObjectId(shopId);

  const customerObjectId =
    toObjectId(customerId);

  if (
    !shopObjectId ||
    !customerObjectId
  ) {
    return {
      totalPurchases: 0,
      totalPaid: 0,
      remainingBalance: 0,
      cashSalesTotal: 0,
      installmentSalesTotal: 0,
    };
  }

  const sales =
    await Sale.find({
      shopId: shopObjectId,
      customer: customerObjectId,
    })
      .sort({
        saleDate: -1,
      })
      .lean();

  let totalPurchases = 0;
  let totalPaid = 0;
  let remainingBalance = 0;
  let cashSalesTotal = 0;
  let installmentSalesTotal = 0;

  for (const sale of sales) {

    // ===============================================
    // CASH
    // ===============================================

    if (
      sale.paymentType === 'Cash'
    ) {
      const cashAmount =
        safeNumber(
          sale.finalTotal
        );

      totalPurchases +=
        cashAmount;

      cashSalesTotal +=
        cashAmount;

      /*
        CASH SALE IS FULLY PAID.

        Never subtract Payment documents
        from a cash sale.
      */

      totalPaid +=
        cashAmount;

      continue;
    }

    // ===============================================
    // INSTALLMENT
    // ===============================================

    const installmentAmount =
      safeNumber(
        sale.totalWithMarkup ||
        sale.finalTotal
      );

    const remaining =
      Math.max(
        0,
        safeNumber(
          sale.remainingBalance
        )
      );

    totalPurchases +=
      installmentAmount;

    installmentSalesTotal +=
      installmentAmount;

    /*
      Paid amount is total financed amount
      minus current remaining balance.
    */

    const paid =
      Math.max(
        0,
        installmentAmount -
          remaining
      );

    totalPaid +=
      paid;

    remainingBalance +=
      remaining;
  }

  return {
    totalPurchases,
    totalPaid,
    remainingBalance,
    cashSalesTotal,
    installmentSalesTotal,
  };
};

// =====================================================
// CUSTOMER DETAILS
// =====================================================

const getCustomerDetails = async ({
  shopId,
  nameOrPhone,
}) => {
  const shopObjectId =
    toObjectId(shopId);

  if (!shopObjectId) {
    return {
      found: false,
    };
  }

  const normalized =
    normalizeSearchText(
      nameOrPhone
    );

  if (!normalized) {
    return {
      found: false,
    };
  }

  const customers =
    await searchCustomers({
      shopId,
      query: normalized,
      limit: 20,
    });

  if (!customers.length) {
    return {
      found: false,
      customers: [],
    };
  }

  if (customers.length > 1) {
    return {
      found: true,
      ambiguous: true,

      customers:
        customers.map(
          (customer) => ({
            id: customer._id,
            name:
              customer.fullName,
            phone:
              customer.mobileNumber,
            code:
              customer.customerId,
          })
        ),
    };
  }

  const customer =
    customers[0];

  const balance =
    await calculateCustomerBalance({
      shopId,
      customerId:
        customer._id,
    });

  return {
    found: true,
    ambiguous: false,

    customer: {
      id: customer._id,

      name:
        customer.fullName,

      fullName:
        customer.fullName,

      code:
        customer.customerId,

      customerId:
        customer.customerId,

      phone:
        customer.mobileNumber,

      mobileNumber:
        customer.mobileNumber,

      alternateMobileNumber:
        customer.alternateMobileNumber,

      cnic:
        customer.cnic,

      fatherName:
        customer.fatherName,

      address:
        customer.address,

      city:
        customer.city,

      email:
        customer.email || '',

      totalPurchases:
        balance.totalPurchases,

      totalPayments:
        balance.totalPaid,

      totalPaid:
        balance.totalPaid,

      balance:
        balance.remainingBalance,

      remainingBalance:
        balance.remainingBalance,

      cashSalesTotal:
        balance.cashSalesTotal,

      installmentSalesTotal:
        balance.installmentSalesTotal,
    },
  };
};

// =====================================================
// CUSTOMER SALES
// =====================================================

const getCustomerSales = async ({
  shopId,
  customerId,
}) => {
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

  const sales =
    await Sale.find({
      shopId: shopObjectId,
      customer: customerObjectId,
    })
      .populate(
        'product',
        'name brand model category'
      )
      .sort({
        saleDate: -1,
      })
      .lean();

  return sales.map(
    (sale) => {
      const isCash =
        sale.paymentType === 'Cash';

      const total =
        isCash
          ? safeNumber(
              sale.finalTotal
            )
          : safeNumber(
              sale.totalWithMarkup ||
              sale.finalTotal
            );

      /*
        Cash is always zero remaining.
      */

      const remaining =
        isCash
          ? 0
          : Math.max(
              0,
              safeNumber(
                sale.remainingBalance
              )
            );

      const paid =
        Math.max(
          0,
          total - remaining
        );

      return {
        id:
          sale._id,

        saleId:
          sale.saleId,

        saleDate:
          sale.saleDate,

        product:
          sale.product || null,

        quantity:
          safeNumber(
            sale.quantity
          ),

        paymentType:
          isCash
            ? 'Cash'
            : 'Installment',

        finalTotal:
          safeNumber(
            sale.finalTotal
          ),

        totalWithMarkup:
          total,

        downPayment:
          isCash
            ? total
            : safeNumber(
                sale.downPayment
              ),

        paid,

        remaining,

        markupPercentage:
          safeNumber(
            sale.markupPercentage
          ),

        markupAmount:
          safeNumber(
            sale.markupAmount
          ),

        selectedInstallmentDuration:
          safeNumber(
            sale.selectedInstallmentDuration
          ),

        installmentDuration:
          safeNumber(
            sale.installmentDuration
          ),

        treatDownPaymentAsFirstInstallment:
          Boolean(
            sale.treatDownPaymentAsFirstInstallment
          ),

        installmentScheduleSnapshot:
          Array.isArray(
            sale.installmentScheduleSnapshot
          )
            ? sale.installmentScheduleSnapshot
            : [],
      };
    }
  );
};

// =====================================================
// CUSTOMER INSTALLMENT PLANS
// =====================================================

const getCustomerInstallmentPlans =
  async ({
    shopId,
    customerId,
  }) => {

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

    const plans =
      await InstallmentPlan.find({
        shopId: shopObjectId,
        customer: customerObjectId,
      })
        .populate(
          'sale',
          [
            'saleId',
            'paymentType',
            'finalTotal',
            'totalWithMarkup',
            'downPayment',
            'remainingBalance',
            'saleDate',
          ].join(' ')
        )
        .populate(
          'product',
          'name brand model category'
        )
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

    const installmentsByPlan =
      new Map();

    for (
      const installment of installments
    ) {
      const key =
        String(
          installment.installmentPlan
        );

      if (
        !installmentsByPlan.has(
          key
        )
      ) {
        installmentsByPlan.set(
          key,
          []
        );
      }

      installmentsByPlan
        .get(key)
        .push({
          id:
            installment._id,

          installmentNumber:
            installment.installmentNumber,

          amount:
            safeNumber(
              installment.amount
            ),

          originalAmount:
            safeNumber(
              installment.originalAmount
            ),

          paidAmount:
            safeNumber(
              installment.paidAmount
            ),

          remainingAmount:
            safeNumber(
              installment.remainingAmount
            ),

          dueDate:
            installment.dueDate,

          status:
            installment.status,

          paidDate:
            installment.paidDate ||
            null,

          settledDate:
            installment.settledDate ||
            null,

          isSettledByPlanPayment:
            Boolean(
              installment.isSettledByPlanPayment
            ),
        });
    }

    return plans.map(
      (plan) => {

        const planInstallments =
          installmentsByPlan.get(
            String(plan._id)
          ) || [];

        return {
          id:
            plan._id,

          planId:
            plan.planId || null,

          status:
            plan.status,

          sale:
            plan.sale || null,

          product:
            plan.product || null,

          totalAmount:
            safeNumber(
              plan.totalAmount
            ),

          downPayment:
            safeNumber(
              plan.downPayment
            ),

          remainingBalance:
            safeNumber(
              plan.remainingBalance
            ),

          duration:
            safeNumber(
              plan.duration
            ),

          selectedDuration:
            safeNumber(
              plan.selectedDuration
            ),

          treatDownPaymentAsFirstInstallment:
            Boolean(
              plan.treatDownPaymentAsFirstInstallment
            ),

          firstDueDate:
            plan.firstDueDate ||
            null,

          invoiceSnapshot:
            plan.invoiceSnapshot ||
            null,

          installments:
            planInstallments,
        };
      }
    );
  };

// =====================================================
// CUSTOMER PAYMENT HISTORY
// =====================================================

const getCustomerPayments =
  async ({
    shopId,
    customerId,
  }) => {

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

    const payments =
      await Payment.find({
        shopId: shopObjectId,
        customer: customerObjectId,
        isArchived: {
          $ne: true,
        },
      })
        .populate(
          'sale',
          'saleId paymentType'
        )
        .populate(
          'installment',
          'installmentNumber dueDate status'
        )
        .sort({
          paymentDate: -1,
        })
        .lean();

    return payments.map(
      (payment) => ({
        id:
          payment._id,

        paymentId:
          payment.paymentId,

        amount:
          safeNumber(
            payment.amount
          ),

        paymentMethod:
          payment.paymentMethod,

        method:
          payment.paymentMethod,

        paymentDate:
          payment.paymentDate,

        sale:
          payment.sale || null,

        installment:
          payment.installment ||
          null,

        carryForwardAmount:
          safeNumber(
            payment.carryForwardAmount
          ),

        originalInstallmentAmount:
          safeNumber(
            payment.originalInstallmentAmount
          ),

        allocations:
          Array.isArray(
            payment.allocations
          )
            ? payment.allocations
            : [],

        notes:
          payment.notes || '',
      })
    );
  };

// =====================================================
// COMPLETE CUSTOMER HISTORY
// =====================================================

const getCustomerHistory =
  async ({
    shopId,
    customerId,
  }) => {

    const shopObjectId =
      toObjectId(shopId);

    const customerObjectId =
      toObjectId(customerId);

    if (
      !shopObjectId ||
      !customerObjectId
    ) {
      return null;
    }

    const customer =
      await Customer.findOne({
        _id: customerObjectId,
        shopId: shopObjectId,
      }).lean();

    if (!customer) {
      return null;
    }

    const [
      balance,
      sales,
      installmentPlans,
      payments,
    ] = await Promise.all([
      calculateCustomerBalance({
        shopId,
        customerId,
      }),

      getCustomerSales({
        shopId,
        customerId,
      }),

      getCustomerInstallmentPlans({
        shopId,
        customerId,
      }),

      getCustomerPayments({
        shopId,
        customerId,
      }),
    ]);

    return {
      customer: {
        id:
          customer._id,

        customerId:
          customer.customerId,

        fullName:
          customer.fullName,

        fatherName:
          customer.fatherName,

        mobileNumber:
          customer.mobileNumber,

        alternateMobileNumber:
          customer.alternateMobileNumber,

        cnic:
          customer.cnic,

        address:
          customer.address,

        city:
          customer.city,

        email:
          customer.email || '',
      },

      summary: {
        totalPurchases:
          balance.totalPurchases,

        totalPaid:
          balance.totalPaid,

        remainingBalance:
          balance.remainingBalance,

        cashSalesTotal:
          balance.cashSalesTotal,

        installmentSalesTotal:
          balance.installmentSalesTotal,

        totalSales:
          sales.length,

        totalInstallmentPlans:
          installmentPlans.length,

        totalPayments:
          payments.length,
      },

      sales,

      cashSales:
        sales.filter(
          (sale) =>
            sale.paymentType ===
            'Cash'
        ),

      installmentSales:
        sales.filter(
          (sale) =>
            sale.paymentType ===
            'Installment'
        ),

      installmentPlans,

      payments,
    };
  };

// =====================================================
// CUSTOMER LEDGER
// =====================================================

const getCustomerLedger =
  async ({
    shopId,
    customerId,
  }) => {

    const history =
      await getCustomerHistory({
        shopId,
        customerId,
      });

    if (!history) {
      return {
        found: false,
      };
    }

    return {
      found: true,

      customer: {
        id:
          history.customer.id,

        name:
          history.customer.fullName,

        fullName:
          history.customer.fullName,

        code:
          history.customer.customerId,

        phone:
          history.customer.mobileNumber,

        mobileNumber:
          history.customer.mobileNumber,

        cnic:
          history.customer.cnic,

        city:
          history.customer.city,
      },

      summary: {
        totalPurchases:
          history.summary.totalPurchases,

        totalPayments:
          history.summary.totalPaid,

        totalPaid:
          history.summary.totalPaid,

        balance:
          history.summary.remainingBalance,

        remainingBalance:
          history.summary.remainingBalance,

        cashSalesTotal:
          history.summary.cashSalesTotal,

        installmentSalesTotal:
          history.summary.installmentSalesTotal,

        totalSales:
          history.summary.totalSales,

        totalInstallmentPlans:
          history.summary.totalInstallmentPlans,

        totalPaymentsCount:
          history.summary.totalPayments,
      },

      sales:
        history.sales,

      cashSales:
        history.cashSales,

      installmentSales:
        history.installmentSales,

      installmentPlans:
        history.installmentPlans,

      payments:
        history.payments,
    };
  };

// =====================================================
// SALES SUMMARY
// =====================================================

const getSalesSummary = async ({
  shopId,
  startDate,
  endDate,
  timeframe,
  year,
}) => {

  const shopObjectId =
    toObjectId(shopId);

  if (!shopObjectId) {
    return {
      totalSalesCount: 0,
      totalSalesAmount: 0,
      totalSales: 0,
      totalAmount: 0,
      cashSales: 0,
      installmentSales: 0,
    };
  }

  let finalStartDate =
    startDate;

  let finalEndDate =
    endDate;

  /*
    Support both:

      startDate/endDate

    and:

      timeframe/year
  */

  if (
    !finalStartDate &&
    !finalEndDate &&
    timeframe
  ) {
    const now =
      new Date();

    if (
      timeframe === 'today'
    ) {
      finalStartDate =
        new Date(now);

      finalStartDate.setHours(
        0,
        0,
        0,
        0
      );

      finalEndDate =
        new Date(now);

      finalEndDate.setHours(
        23,
        59,
        59,
        999
      );
    }

    if (
      timeframe === 'this_month'
    ) {
      finalStartDate =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
          0,
          0,
          0,
          0
        );

      finalEndDate =
        new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
    }

    if (
      timeframe === 'year'
    ) {
      const targetYear =
        Number(year) ||
        now.getFullYear();

      finalStartDate =
        new Date(
          targetYear,
          0,
          1,
          0,
          0,
          0,
          0
        );

      finalEndDate =
        new Date(
          targetYear,
          11,
          31,
          23,
          59,
          59,
          999
        );
    }
  }

  const query = {
    shopId:
      shopObjectId,
  };

  if (
    finalStartDate ||
    finalEndDate
  ) {
    query.saleDate = {};

    if (finalStartDate) {
      query.saleDate.$gte =
        finalStartDate;
    }

    if (finalEndDate) {
      query.saleDate.$lte =
        finalEndDate;
    }
  }

  const sales =
    await Sale.find(query)
      .lean();

  let totalAmount = 0;
  let cashSales = 0;
  let installmentSales = 0;

  for (
    const sale of sales
  ) {

    if (
      sale.paymentType ===
      'Cash'
    ) {
      const amount =
        safeNumber(
          sale.finalTotal
        );

      totalAmount +=
        amount;

      cashSales +=
        amount;
    } else {
      const amount =
        safeNumber(
          sale.totalWithMarkup ||
          sale.finalTotal
        );

      totalAmount +=
        amount;

      installmentSales +=
        amount;
    }
  }

  return {
    totalSalesCount:
      sales.length,

    totalSalesAmount:
      totalAmount,

    totalSales:
      sales.length,

    totalAmount,

    cashSales,

    installmentSales,
  };
};

// =====================================================
// PAYMENT SUMMARY
// =====================================================

const getPaymentSummary = async ({
  shopId,
  startDate,
  endDate,
}) => {

  const shopObjectId =
    toObjectId(shopId);

  if (!shopObjectId) {
    return {
      totalPayments: 0,
      totalAmount: 0,
    };
  }

  const query = {
    shopId:
      shopObjectId,

    isArchived: {
      $ne: true,
    },
  };

  if (
    startDate ||
    endDate
  ) {
    query.paymentDate = {};

    if (startDate) {
      query.paymentDate.$gte =
        startDate;
    }

    if (endDate) {
      query.paymentDate.$lte =
        endDate;
    }
  }

  const payments =
    await Payment.find(query)
      .lean();

  const totalAmount =
    payments.reduce(
      (
        sum,
        payment
      ) =>
        sum +
        safeNumber(
          payment.amount
        ),
      0
    );

  return {
    totalPayments:
      payments.length,

    totalAmount,
  };
};

// =====================================================
// INSTALLMENT PAYMENT REPORT
// =====================================================

const getInstallmentPayments =
  async ({
    shopId,
    timeframe = 'this_month',
    year,
  }) => {

    const now =
      new Date();

    let startDate;
    let endDate;

    if (
      timeframe === 'today'
    ) {
      startDate =
        new Date(now);

      startDate.setHours(
        0,
        0,
        0,
        0
      );

      endDate =
        new Date(now);

      endDate.setHours(
        23,
        59,
        59,
        999
      );
    } else if (
      timeframe === 'year'
    ) {
      const targetYear =
        Number(year) ||
        now.getFullYear();

      startDate =
        new Date(
          targetYear,
          0,
          1,
          0,
          0,
          0,
          0
        );

      endDate =
        new Date(
          targetYear,
          11,
          31,
          23,
          59,
          59,
          999
        );
    } else {
      startDate =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
          0,
          0,
          0,
          0
        );

      endDate =
        new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
    }

    const result =
      await getPaymentSummary({
        shopId,
        startDate,
        endDate,
      });

    return {
      count:
        result.totalPayments,

      totalReceived:
        result.totalAmount,

      totalPayments:
        result.totalPayments,

      totalAmount:
        result.totalAmount,
    };
  };

// =====================================================
// OVERDUE INSTALLMENTS
// =====================================================

const getOverdueInstallments =
  async ({
    shopId,
  }) => {

    const shopObjectId =
      toObjectId(shopId);

    if (!shopObjectId) {
      return [];
    }

    const now =
      new Date();

    const installments =
      await Installment.find({
        shopId:
          shopObjectId,

        dueDate: {
          $lt: now,
        },

        status: {
          $in: [
            'Pending',
            'Partially Paid',
            'Overdue',
          ],
        },

        remainingAmount: {
          $gt: 0,
        },
      })
        .sort({
          dueDate: 1,
        })
        .lean();

    if (!installments.length) {
      return [];
    }

    const planIds =
      installments.map(
        (item) =>
          item.installmentPlan
      );

    const plans =
      await InstallmentPlan.find({
        shopId:
          shopObjectId,

        _id: {
          $in: planIds,
        },
      })
        .populate(
          'customer',
          'fullName mobileNumber customerId'
        )
        .populate(
          'product',
          'name brand model'
        )
        .lean();

    const planMap =
      new Map(
        plans.map(
          (plan) => [
            String(
              plan._id
            ),
            plan,
          ]
        )
      );

    return installments.map(
      (installment) => {

        const plan =
          planMap.get(
            String(
              installment.installmentPlan
            )
          );

        return {
          installment,

          customer:
            plan?.customer ||
            null,

          product:
            plan?.product ||
            null,

          planId:
            plan?.planId ||
            null,
        };
      }
    );
  };

// =====================================================
// OVERDUE CUSTOMERS
// =====================================================

const getOverdueCustomers =
  async ({
    shopId,
    limit = 20,
  }) => {

    const data =
      await getOverdueInstallments({
        shopId,
      });

    const overdueList =
      data
        .slice(0, limit)
        .map(
          (item) => ({
            customerName:
              item.customer?.fullName ||
              'Unknown Customer',

            customerId:
              item.customer?.customerId ||
              null,

            phone:
              item.customer?.mobileNumber ||
              null,

            product:
              item.product?.name ||
              null,

            installmentNumber:
              item.installment
                ?.installmentNumber,

            amountDue:
              safeNumber(
                item.installment
                  ?.remainingAmount
              ),

            originalAmount:
              safeNumber(
                item.installment
                  ?.amount
              ),

            dueDate:
              item.installment
                ?.dueDate,

            status:
              item.installment
                ?.status,

            planId:
              item.planId,
          })
        );

    return {
      found:
        overdueList.length > 0,

      count:
        overdueList.length,

      overdueList,
    };
  };

// =====================================================
// PROFIT REPORT
// =====================================================

const getProfitReport =
  async ({
    shopId,
    startDate,
    endDate,
    timeframe,
    year,
  }) => {

    const shopObjectId =
      toObjectId(shopId);

    if (!shopObjectId) {
      return {
        totalRevenue: 0,
        totalProfit: 0,
      };
    }

    let finalStartDate =
      startDate;

    let finalEndDate =
      endDate;

    if (
      !finalStartDate &&
      !finalEndDate &&
      timeframe
    ) {
      const now =
        new Date();

      if (
        timeframe === 'today'
      ) {
        finalStartDate =
          new Date(now);

        finalStartDate.setHours(
          0,
          0,
          0,
          0
        );

        finalEndDate =
          new Date(now);

        finalEndDate.setHours(
          23,
          59,
          59,
          999
        );
      } else if (
        timeframe === 'year'
      ) {
        const targetYear =
          Number(year) ||
          now.getFullYear();

        finalStartDate =
          new Date(
            targetYear,
            0,
            1,
            0,
            0,
            0,
            0
          );

        finalEndDate =
          new Date(
            targetYear,
            11,
            31,
            23,
            59,
            59,
            999
          );
      } else {
        finalStartDate =
          new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
            0,
            0,
            0,
            0
          );

        finalEndDate =
          new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );
      }
    }

    const query = {
      shopId:
        shopObjectId,
    };

    if (
      finalStartDate ||
      finalEndDate
    ) {
      query.saleDate = {};

      if (finalStartDate) {
        query.saleDate.$gte =
          finalStartDate;
      }

      if (finalEndDate) {
        query.saleDate.$lte =
          finalEndDate;
      }
    }

    const sales =
      await Sale.find(query)
        .populate(
          'product',
          'purchasePrice'
        )
        .lean();

    let totalRevenue = 0;
    let totalProfit = 0;

    for (
      const sale of sales
    ) {

      const revenue =
        sale.paymentType ===
        'Cash'
          ? safeNumber(
              sale.finalTotal
            )
          : safeNumber(
              sale.totalWithMarkup ||
              sale.finalTotal
            );

      const quantity =
        safeNumber(
          sale.quantity
        );

      const purchasePrice =
        safeNumber(
          sale.product
            ?.purchasePrice
        );

      const cost =
        purchasePrice *
        quantity;

      totalRevenue +=
        revenue;

      totalProfit +=
        revenue - cost;
    }

    return {
      totalRevenue,
      totalProfit,
    };
  };

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  normalizeSearchText,
  getSearchTokens,
  escapeRegex,
  toObjectId,
safeNumber,
money,
formatDate,

  buildProductSearchQuery,
  buildCustomerSearchQuery,

  searchCustomers,
  searchProducts,

  getProductStock,
  getLowStockProducts,
  getInventorySummary,

  calculateCustomerBalance,

  getCustomerDetails,
  getCustomerSales,
  getCustomerInstallmentPlans,
  getCustomerPayments,
  getCustomerHistory,
  getCustomerLedger,

  getSalesSummary,

  getPaymentSummary,
  getInstallmentPayments,

  getOverdueInstallments,
  getOverdueCustomers,

  getProfitReport,

  money,
  formatDate,
};
