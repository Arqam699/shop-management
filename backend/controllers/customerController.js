const Customer = require('../models/Customer');


// ==========================================
// CUSTOMER ID GENERATOR
// ==========================================

const generateCustomerID = async (shopId) => {
  try {
    const customers = await Customer.find(
      { shopId },
      'customerId'
    );

    let maxNum = 0;

    customers.forEach((c) => {
      if (c.customerId) {
        const num = parseInt(
          c.customerId.replace(/[^0-9]/g, ''),
          10
        );

        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    return String(maxNum + 1).padStart(2, '0');
  } catch (err) {
    console.error(
      'Generate customer ID error:',
      err
    );

    return '01';
  }
};


// =====================================================
// CUSTOMER PAYMENT SCORE
// =====================================================

const calculatePaymentScore = async ({
  customerId,
  shopId,
  installments = null,
  payments = null,
  plans = null,
}) => {
  const Installment = require('../models/Installment');
  const Payment = require('../models/Payment');
  const InstallmentPlan = require('../models/InstallmentPlan');

  try {
    // ===================================================
    // 1. GET CUSTOMER INSTALLMENT PLANS
    // ===================================================

    let customerPlans = plans;

    if (!customerPlans) {
      customerPlans = await InstallmentPlan.find({
        shopId,
        customer: customerId,
      })
        .sort({ createdAt: 1 })
        .lean();
    }

    const planIds = customerPlans.map(
      (plan) => plan._id
    );

    // ===================================================
    // 2. GET INSTALLMENTS
    // ===================================================

    let customerInstallments = installments;

    if (!customerInstallments) {
      if (planIds.length > 0) {
        customerInstallments = await Installment.find({
          shopId,
          installmentPlan: {
            $in: planIds,
          },
        })
          .sort({
            dueDate: 1,
            installmentNumber: 1,
          })
          .lean();
      } else {
        customerInstallments = [];
      }
    }

    // ===================================================
    // 3. GET PAYMENTS
    // ===================================================

    let customerPayments = payments;

    if (!customerPayments) {
      customerPayments = await Payment.find({
        shopId,
        customer: customerId,
        isArchived: {
          $ne: true,
        },
      })
        .sort({
          paymentDate: 1,
          createdAt: 1,
        })
        .lean();
    }

    // ===================================================
    // NO INSTALLMENT HISTORY
    // ===================================================

    if (
      customerInstallments.length === 0 &&
      customerPayments.length === 0
    ) {
      return {
        score: null,
        rating: 'No History',
        color: 'gray',

        onTimePayments: 0,
        latePayments: 0,
        partialPayments: 0,
        overduePayments: 0,
        missedPayments: 0,

        averageDelayDays: 0,

        totalPaid: 0,

        outstanding: customerPlans.reduce(
          (sum, plan) =>
            sum +
            Number(
              plan.remainingBalance || 0
            ),
          0
        ),

        totalInstallments: 0,
      };
    }

    // ===================================================
    // DATE HELPERS
    // ===================================================

    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const getDateOnly = (date) => {
      if (!date) {
        return null;
      }

      const d = new Date(date);

      if (Number.isNaN(d.getTime())) {
        return null;
      }

      return d;
    };

    // ===================================================
    // 4. NORMALIZE INSTALLMENTS
    // ===================================================

    const normalizedInstallments =
      customerInstallments.map(
        (installment) => {
          const amount = Number(
            installment.amount ??
              installment.originalAmount ??
              0
          );

          const originalAmount = Number(
            installment.originalAmount ??
              installment.amount ??
              0
          );

          const paidAmount = Math.max(
            0,
            Number(
              installment.paidAmount || 0
            )
          );

          const remainingAmount =
            Math.max(
              0,
              Number(
                installment.remainingAmount ??
                  Math.max(
                    amount - paidAmount,
                    0
                  )
              )
            );

          return {
            ...installment,

            amount,
            originalAmount,
            paidAmount,
            remainingAmount,

            dueDate: getDateOnly(
              installment.dueDate
            ),

            paidDate: getDateOnly(
              installment.paidDate
            ),

            settledDate: getDateOnly(
              installment.settledDate
            ),
          };
        }
      );

    // ===================================================
    // 5. PAYMENT ALLOCATIONS
    //
    // Payment.allocations is the primary source for
    // multi-installment payments.
    // ===================================================

    const allocationMap = new Map();

    let totalPaidFromPayments = 0;

    for (const payment of customerPayments) {
      const paymentAmount = Math.max(
        0,
        Number(payment.amount || 0)
      );

      totalPaidFromPayments +=
        paymentAmount;

      const paymentDate = getDateOnly(
        payment.paymentDate
      );

      // -----------------------------------------------
      // NEW PAYMENT STRUCTURE
      // -----------------------------------------------

      if (
        Array.isArray(
          payment.allocations
        ) &&
        payment.allocations.length > 0
      ) {
        for (
          const allocation
          of payment.allocations
        ) {
          if (!allocation.installment) {
            continue;
          }

          const installmentId =
            String(
              allocation.installment
            );

          if (
            !allocationMap.has(
              installmentId
            )
          ) {
            allocationMap.set(
              installmentId,
              []
            );
          }

          allocationMap
            .get(installmentId)
            .push({
              amount: Math.max(
                0,
                Number(
                  allocation.amount || 0
                )
              ),

              paymentDate,

              paymentId:
                payment._id,
            });
        }
      }

      // -----------------------------------------------
      // OLD PAYMENT STRUCTURE
      //
      // Used only when allocations do not exist.
      // -----------------------------------------------

      else if (
        payment.installment
      ) {
        const installmentId =
          String(
            payment.installment
          );

        if (
          !allocationMap.has(
            installmentId
          )
        ) {
          allocationMap.set(
            installmentId,
            []
          );
        }

        allocationMap
          .get(installmentId)
          .push({
            amount:
              paymentAmount,

            paymentDate,

            paymentId:
              payment._id,
          });
      }
    }

    // ===================================================
    // 6. SCORE COUNTERS
    // ===================================================

    let onTimePayments = 0;
    let latePayments = 0;
    let partialPayments = 0;
    let overduePayments = 0;
    let missedPayments = 0;

    let totalDelayDays = 0;
    let delayPaymentCount = 0;

    let totalPaidFromInstallments = 0;
    let totalOutstanding = 0;

    // ===================================================
    // 7. EVALUATE EVERY INSTALLMENT
    // ===================================================

    for (
      const installment
      of normalizedInstallments
    ) {
      const amount = Number(
        installment.amount || 0
      );

      const paidAmount = Number(
        installment.paidAmount || 0
      );

      const remainingAmount = Number(
        installment.remainingAmount || 0
      );

      totalPaidFromInstallments +=
        paidAmount;

      totalOutstanding +=
        remainingAmount;

      const dueDate =
        installment.dueDate;

      // -------------------------------------------------
      // FIND PAYMENT DATES FOR THIS INSTALLMENT
      // -------------------------------------------------

      const allocations =
        allocationMap.get(
          String(installment._id)
        ) || [];

      let latestPaymentDate = null;

      for (
        const allocation
        of allocations
      ) {
        if (
          allocation.paymentDate &&
          (
            !latestPaymentDate ||
            allocation.paymentDate >
              latestPaymentDate
          )
        ) {
          latestPaymentDate =
            allocation.paymentDate;
        }
      }

      // -------------------------------------------------
      // DIRECT PAID DATE
      // -------------------------------------------------

      const directPaidDate =
        installment.paidDate;

      if (
        directPaidDate &&
        (
          !latestPaymentDate ||
          directPaidDate >
            latestPaymentDate
        )
      ) {
        latestPaymentDate =
          directPaidDate;
      }

      // -------------------------------------------------
      // SETTLED INSTALLMENT
      // -------------------------------------------------

      const isSettled =
        installment.status ===
          'Settled' ||
        installment.isSettledByPlanPayment ===
          true;

      if (
        isSettled &&
        remainingAmount <= 0
      ) {
        if (
          dueDate &&
          latestPaymentDate
        ) {
          if (
            latestPaymentDate <=
            dueDate
          ) {
            onTimePayments++;
          } else {
            latePayments++;

            const delayMs =
              latestPaymentDate.getTime() -
              dueDate.getTime();

            const delayDays =
              Math.max(
                0,
                Math.ceil(
                  delayMs /
                    (1000 *
                      60 *
                      60 *
                      24)
                )
              );

            totalDelayDays +=
              delayDays;

            delayPaymentCount++;
          }
        }

        continue;
      }

      // -------------------------------------------------
      // FULLY PAID
      // -------------------------------------------------

      if (
        amount > 0 &&
        paidAmount >= amount &&
        remainingAmount <= 0
      ) {
        if (
          dueDate &&
          latestPaymentDate
        ) {
          if (
            latestPaymentDate <=
            dueDate
          ) {
            onTimePayments++;
          } else {
            latePayments++;

            const delayMs =
              latestPaymentDate.getTime() -
              dueDate.getTime();

            const delayDays =
              Math.max(
                0,
                Math.ceil(
                  delayMs /
                    (1000 *
                      60 *
                      60 *
                      24)
                )
              );

            totalDelayDays +=
              delayDays;

            delayPaymentCount++;
          }
        } else {
          // Full payment but no usable date.
          // Treat as on-time rather than risk
          // incorrectly marking it overdue.
          onTimePayments++;
        }

        continue;
      }

      // -------------------------------------------------
      // PARTIAL PAYMENT
      // -------------------------------------------------

      if (
        paidAmount > 0 &&
        paidAmount < amount
      ) {
        if (
          dueDate &&
          dueDate < startOfToday
        ) {
          partialPayments++;
          overduePayments++;
        } else {
          partialPayments++;
        }

        continue;
      }

      // -------------------------------------------------
      // NO PAYMENT
      // -------------------------------------------------

      if (
        paidAmount <= 0 &&
        remainingAmount > 0
      ) {
        // Future installment:
        // NO PENALTY.
        if (
          !dueDate ||
          dueDate > endOfToday
        ) {
          continue;
        }

        // Due today:
        // Don't call it missed until the day
        // has actually passed.
        if (
          dueDate >= startOfToday &&
          dueDate <= endOfToday
        ) {
          continue;
        }

        // Past due with no payment.
        missedPayments++;
        overduePayments++;
      }
    }

    // ===================================================
    // 8. TOTAL PAID
    //
    // Installment.paidAmount is the authoritative
    // installment-level value.
    //
    // Payment.amount is used as fallback where needed.
    // ===================================================

    let totalPaid =
      totalPaidFromInstallments;

    if (
      totalPaid <= 0 &&
      totalPaidFromPayments > 0
    ) {
      totalPaid =
        totalPaidFromPayments;
    }

    // ===================================================
    // 9. OUTSTANDING
    //
    // Prefer actual installment balances.
    // If no installments exist, use plan balance.
    // ===================================================

    let outstanding =
      totalOutstanding;

    if (
      normalizedInstallments.length ===
      0
    ) {
      outstanding =
        customerPlans.reduce(
          (sum, plan) =>
            sum +
            Number(
              plan.remainingBalance ||
                0
            ),
          0
        );
    }

    // ===================================================
    // 10. AVERAGE DELAY
    // ===================================================

    const averageDelayDays =
      delayPaymentCount > 0
        ? Math.round(
            totalDelayDays /
              delayPaymentCount
          )
        : 0;

    // ===================================================
    // 11. DETERMINE WHETHER THERE IS REAL HISTORY
    // ===================================================

    const hasAnyPayment =
      totalPaid > 0 ||
      customerPayments.length > 0;

    const hasCompletedBehavior =
      onTimePayments > 0 ||
      latePayments > 0 ||
      partialPayments > 0 ||
      missedPayments > 0;

    // ---------------------------------------------------
    // New customer / all installments still future.
    // ---------------------------------------------------

    if (
      !hasAnyPayment &&
      !hasCompletedBehavior
    ) {
      return {
        score: null,
        rating: 'No Payment Yet',
        color: 'gray',

        onTimePayments,
        latePayments,
        partialPayments,
        overduePayments,
        missedPayments,

        averageDelayDays,

        totalPaid,
        outstanding,

        totalInstallments:
          normalizedInstallments.length,
      };
    }

    // ===================================================
    // 12. CALCULATE SCORE
    // ===================================================

    const totalInstallments =
      normalizedInstallments.length;

    const completedInstallments =
      onTimePayments +
      latePayments;

    // ---------------------------------------------------
    // Base score
    // ---------------------------------------------------

    let score = 100;

    // Late payment penalty
    score -= latePayments * 5;

    // Partial payment penalty
    score -= partialPayments * 7;

    // Missed payment penalty
    score -= missedPayments * 12;

    // Overdue additional penalty
    if (overduePayments > 0) {
      score -= Math.min(
        overduePayments * 2,
        15
      );
    }

    // Average delay penalty
    if (averageDelayDays > 0) {
      if (averageDelayDays >= 30) {
        score -= 15;
      } else if (
        averageDelayDays >= 15
      ) {
        score -= 10;
      } else if (
        averageDelayDays >= 7
      ) {
        score -= 5;
      } else if (
        averageDelayDays >= 3
      ) {
        score -= 2;
      }
    }

    // ---------------------------------------------------
    // Reward good payment history
    // ---------------------------------------------------

    if (
      onTimePayments > 0 &&
      latePayments === 0 &&
      partialPayments === 0 &&
      missedPayments === 0
    ) {
      score += 2;
    }

    // ---------------------------------------------------
    // If customer has no completed installments but
    // has a payment record, keep score reasonable.
    // ---------------------------------------------------

    if (
      completedInstallments === 0 &&
      partialPayments === 0 &&
      missedPayments === 0
    ) {
      score = Math.min(
        score,
        80
      );
    }

    // ---------------------------------------------------
    // Clamp score
    // ---------------------------------------------------

    score = Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );

    // ===================================================
    // 13. RATING
    // ===================================================

    let rating = 'High Risk';
    let color = 'red';

    if (score >= 90) {
      rating = 'Excellent';
      color = 'green';
    } else if (score >= 75) {
      rating = 'Good';
      color = 'blue';
    } else if (score >= 60) {
      rating = 'Average';
      color = 'yellow';
    } else if (score >= 40) {
      rating = 'Risky';
      color = 'orange';
    } else {
      rating = 'High Risk';
      color = 'red';
    }

    // ===================================================
    // FINAL RESULT
    // ===================================================

    return {
      score,
      rating,
      color,

      onTimePayments,
      latePayments,
      partialPayments,
      overduePayments,
      missedPayments,

      averageDelayDays,

      totalPaid,
      outstanding,

      totalInstallments,
    };
  } catch (error) {
    console.error(
      'PAYMENT SCORE ERROR:',
      error
    );

    return {
      score: null,
      rating: 'Unavailable',
      color: 'gray',

      onTimePayments: 0,
      latePayments: 0,
      partialPayments: 0,
      overduePayments: 0,
      missedPayments: 0,

      averageDelayDays: 0,

      totalPaid: 0,
      outstanding: 0,
      totalInstallments: 0,
    };
  }
};


// ==========================================
// GET ALL CUSTOMERS
// ==========================================

const getCustomers = async (req, res) => {
  try {
    const {
      search
    } = req.query;

    // ======================================
    // CURRENT SHOP
    // ======================================

    const query = {
      shopId: req.shopId
    };

    // ======================================
    // SEARCH
    // ======================================

    if (search) {
      query.$or = [
        {
          fullName: {
            $regex: search,
            $options: 'i'
          }
        },

        {
          customerId: {
            $regex: search,
            $options: 'i'
          }
        },

        {
          mobileNumber: {
            $regex: search,
            $options: 'i'
          }
        },

        {
          cnic: {
            $regex: search,
            $options: 'i'
          }
        }
      ];
    }

    // ======================================
    // GET CUSTOMERS
    // ======================================

    const customers =
      await Customer
        .find(query)
        .sort({
          createdAt: 1
        })
        .lean();

    // ======================================
    // PAYMENT SCORES
    // ======================================

    const customersWithScores =
      await Promise.all(
        customers.map(
          async (customer) => {
            const paymentScore =
              await calculatePaymentScore({
                customerId:
                  customer._id,

                shopId:
                  req.shopId
              });

            return {
              ...customer,
              paymentScore
            };
          }
        )
      );

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      data: customersWithScores
    });

  } catch (error) {
    console.error(
      'Get customers error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Failed to fetch customers list',

      error:
        error.message
    });
  }
};


// ==========================================
// GET CUSTOMER BY ID
// ==========================================

const getCustomerById = async (
  req,
  res
) => {
  try {
    // ======================================
    // FIND CUSTOMER
    // ======================================

    const customer =
      await Customer.findOne({
        _id: req.params.id,
        shopId: req.shopId
      });

    if (!customer) {
      return res.status(404).json({
        success: false,

        message:
          'Customer record not found'
      });
    }

    const Sale =
      require('../models/Sale');

    const InstallmentPlan =
      require('../models/InstallmentPlan');

    const Installment =
      require('../models/Installment');

    // ======================================
    // SALES + PLANS
    // ======================================

    const [
      sales,
      plans
    ] =
      await Promise.all([
        Sale.find({
          customer:
            customer._id,

          shopId:
            req.shopId
        })
          .populate('product')
          .sort({
            createdAt: 1
          })
          .lean(),

        InstallmentPlan.find({
          customer:
            customer._id,

          shopId:
            req.shopId
        })
          .populate('product')
          .sort({
            createdAt: 1
          })
          .lean()
      ]);

    // ======================================
    // TOTAL PURCHASED
    // ======================================

    const totalPurchased =
      sales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.finalTotal || 0
          ),
        0
      );

    // ======================================
    // OUTSTANDING
    // ======================================

    const outstandingBalance =
      plans.reduce(
        (sum, plan) =>
          sum +
          Number(
            plan.remainingBalance ||
              0
          ),
        0
      );

    // ======================================
    // OVERDUE
    // ======================================

    const hasOverdue =
      plans.some(
        (plan) =>
          plan.status === 'Overdue'
      );

    // ======================================
    // PLAN IDS
    // ======================================

    const planIds =
      plans.map(
        (plan) =>
          plan._id
      );

    // ======================================
    // INSTALLMENT COUNTS
    // ======================================

    const installmentCounts =
      planIds.length === 0
        ? []
        : await Installment.aggregate([
            {
              $match: {
                shopId:
                  req.shopId,

                installmentPlan: {
                  $in: planIds
                }
              }
            },

            {
              $group: {
                _id:
                  '$installmentPlan',

                totalInstallmentsCount: {
                  $sum: 1
                },

                unpaidCount: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          '$status',

                          [
                            'Paid',
                            'Settled'
                          ]
                        ]
                      },

                      0,

                      1
                    ]
                  }
                }
              }
            }
          ]);

    // ======================================
    // COUNT MAP
    // ======================================

    const countByPlan =
      new Map(
        installmentCounts.map(
          (item) => [
            item._id.toString(),
            item
          ]
        )
      );

    // ======================================
    // PLANS WITH COUNTS
    // ======================================

    const plansWithCount =
      plans.map(
        (plan) => {
          const counts =
            countByPlan.get(
              plan._id.toString()
            );

          return {
            ...plan,

            totalInstallmentsCount:
              counts?.totalInstallmentsCount ||
              0,

            unpaidCount:
              counts?.unpaidCount ||
              0
          };
        }
      );

    // ======================================
    // PAYMENT SCORE
    // ======================================

    const paymentScore =
      await calculatePaymentScore({
        customerId:
          customer._id,

        shopId:
          req.shopId,

        plans
      });

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,

      data: {
        ...customer.toObject(),

        sales,

        installmentPlans:
          plansWithCount,

        totalPurchased,

        outstandingBalance,

        hasOverdue,

        paymentScore
      }
    });

  } catch (error) {
    console.error(
      'Get customer by ID error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error.message
    });
  }
};


// ==========================================
// GET FINGERPRINT TEMPLATES
// ==========================================

const getFingerprintTemplates = async (
  req,
  res
) => {
  try {
    const customers =
      await Customer.find(
        {
          shopId:
            req.shopId,

          $or: [
            {
              fingerprintFmd: {
                $exists: true,

                $nin: [
                  null,
                  ''
                ]
              }
            },

            {
              'guarantor1.fingerprintFmd': {
                $exists: true,

                $nin: [
                  null,
                  ''
                ]
              }
            },

            {
              'guarantor2.fingerprintFmd': {
                $exists: true,

                $nin: [
                  null,
                  ''
                ]
              }
            }
          ]
        },

        {
          _id: 1,

          fingerprintFmd: 1,

          'guarantor1.fingerprintFmd': 1,

          'guarantor2.fingerprintFmd': 1
        }
      );

    // ======================================
    // TEMPLATE ARRAY
    // ======================================

    const templates = [];

    customers.forEach(
      (customer) => {
        // ====================================
        // CUSTOMER
        // ====================================

        if (
          customer.fingerprintFmd
        ) {
          templates.push({
            id:
              customer._id.toString(),

            type:
              'customer',

            fmd:
              customer.fingerprintFmd
          });
        }

        // ====================================
        // GUARANTOR 1
        // ====================================

        if (
          customer.guarantor1 &&
          customer.guarantor1.fingerprintFmd
        ) {
          templates.push({
            id:
              customer._id.toString(),

            type:
              'guarantor1',

            fmd:
              customer.guarantor1.fingerprintFmd
          });
        }

        // ====================================
        // GUARANTOR 2
        // ====================================

        if (
          customer.guarantor2 &&
          customer.guarantor2.fingerprintFmd
        ) {
          templates.push({
            id:
              customer._id.toString(),

            type:
              'guarantor2',

            fmd:
              customer.guarantor2.fingerprintFmd
          });
        }
      }
    );

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      templates
    });

  } catch (error) {
    console.error(
      'Get fingerprint templates error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Failed to fetch fingerprint templates',

      error:
        error.message
    });
  }
};


// ==========================================
// CREATE CUSTOMER
// ==========================================

const createCustomer = async (
  req,
  res
) => {
  try {
    const {
      cnic
    } = req.body;

    // ======================================
    // DUPLICATE CNIC
    // ======================================

    const existingCnic =
      await Customer.findOne({
        cnic,

        shopId:
          req.shopId
      });

    if (existingCnic) {
      return res.status(400).json({
        success: false,

        message:
          'A customer with this CNIC number is already registered'
      });
    }

    // ======================================
    // CUSTOMER ID
    // ======================================

    const customerId =
      await generateCustomerID(
        req.shopId
      );

    // ======================================
    // CREATE
    // ======================================

    const customer =
      new Customer({
        ...req.body,

        shopId:
          req.shopId,

        customerId
      });

    await customer.save();

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(201).json({
      success: true,

      message:
        'Customer registered successfully',

      data:
        customer
    });

  } catch (error) {
    console.error(
      'Create customer error:',
      error
    );

    return res.status(400).json({
      success: false,

      message:
        error.message ||
        'Registration failed'
    });
  }
};


// ==========================================
// UPDATE CUSTOMER
// ==========================================

const updateCustomer = async (
  req,
  res
) => {
  try {
    // ======================================
    // FIND CUSTOMER
    // ======================================

    const customer =
      await Customer.findOne({
        _id:
          req.params.id,

        shopId:
          req.shopId
      });

    if (!customer) {
      return res.status(404).json({
        success: false,

        message:
          'Customer not found'
      });
    }

    // ======================================
    // DUPLICATE CNIC
    // ======================================

    if (
      req.body.cnic &&
      req.body.cnic !==
        customer.cnic
    ) {
      const duplicateCnic =
        await Customer.findOne({
          cnic:
            req.body.cnic,

          shopId:
            req.shopId,

          _id: {
            $ne:
              customer._id
          }
        });

      if (duplicateCnic) {
        return res.status(400).json({
          success: false,

          message:
            'This CNIC is already assigned to another customer'
        });
      }
    }

    // ======================================
    // UPDATE
    // ======================================

    Object.assign(
      customer,
      req.body
    );

    // ======================================
    // PROTECT SHOP
    // ======================================

    customer.shopId =
      req.shopId;

    await customer.save();

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,

      message:
        'Profile details updated',

      data:
        customer
    });

  } catch (error) {
    console.error(
      'Update customer error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Failed to update profile',

      error:
        error.message
    });
  }
};


// ==========================================
// DELETE CUSTOMER
// ==========================================

const deleteCustomer = async (
  req,
  res
) => {
  try {
    const Settings =
      require('../models/Settings');

    // ======================================
    // SETTINGS
    // ======================================

    const settings =
      await Settings.findOne({
        shopId:
          req.shopId
      });

    // ======================================
    // DELETION MODE
    // ======================================

    if (
      !settings ||
      !settings.allowGlobalDeletion
    ) {
      return res.status(403).json({
        success: false,

        message:
          'Deletion Mode is disabled. Enable it from Settings first.'
      });
    }

    // ======================================
    // EXPIRATION
    // ======================================

    if (
      settings.deletionModeExpiresAt &&
      new Date() >
        settings.deletionModeExpiresAt
    ) {
      settings.allowGlobalDeletion =
        false;

      settings.deletionModeExpiresAt =
        null;

      await settings.save();

      return res.status(403).json({
        success: false,

        message:
          'Deletion Mode has expired. Enable it again from Settings.'
      });
    }

    // ======================================
    // DELETE
    // ======================================

    const customer =
      await Customer.findOneAndDelete({
        _id:
          req.params.id,

        shopId:
          req.shopId
      });

    if (!customer) {
      return res.status(404).json({
        success: false,

        message:
          'Customer not found'
      });
    }

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,

      message:
        'Customer record deleted from system'
    });

  } catch (error) {
    console.error(
      'Delete customer error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Deletion failed',

      error:
        error.message
    });
  }
};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getCustomers,
  getCustomerById,
  getFingerprintTemplates,
  createCustomer,
  updateCustomer,
  deleteCustomer
};