const InstallmentPlan = require('../models/InstallmentPlan');
const {
  getPaginationParams,
  paginatedResponse,
} = require('../utils/pagination');
const Installment = require('../models/Installment');
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const Return = require('../models/Return');

// ============================================================
// PAYMENT ID
// ============================================================

const generatePaymentID = async (shopId) => {
  const payments = await Payment.find({ shopId })
    .select('paymentId')
    .lean();

  let maxNumber = 0;

  for (const payment of payments) {
    if (!payment.paymentId) continue;

    const match = String(payment.paymentId).match(/\d+/);

    if (match) {
      maxNumber = Math.max(
        maxNumber,
        Number(match[0])
      );
    }
  }

  return String(maxNumber + 1).padStart(2, '0');
};

// ============================================================
// ROUNDING
// ============================================================

const roundMoney = (value) => {
  return Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;
};

const revisionFilter = (revisionNumber) => ({
  $or: [
    { revisionNumber },
    ...(Number(revisionNumber) === 0 ? [{ revisionNumber: { $exists: false } }] : []),
  ],
});

// ============================================================
// BOOLEAN HELPER
// ============================================================

const toBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return false;
};

// ============================================================
// DOWN PAYMENT AS FIRST INSTALLMENT
// ============================================================

const isDownPaymentFirstInstallment = (plan) => {
  if (!plan) return false;

  const sale =
    plan.sale && typeof plan.sale === 'object'
      ? plan.sale
      : null;

  const rawValue =
    plan.downPaymentAsFirstInstallment ??
    plan.isDownPaymentFirstInstallment ??
    plan.downPaymentAsFirstInstallmentEnabled ??
    sale?.downPaymentAsFirstInstallment ??
    sale?.isDownPaymentFirstInstallment ??
    false;

  return toBoolean(rawValue);
};

// ============================================================
// CALCULATE ACTUAL INSTALLMENT TOTALS
//
// IMPORTANT:
//
// We use the Installment records as the source of truth.
//
// This prevents:
//
// DP = 50,000
// First installment paid = 50,000
//
// from becoming:
//
// 50,000 + 50,000 = 100,000
//
// when DP is already represented by installment #1.
// ============================================================

const calculateInstallmentTotals = (installments = []) => {
  let scheduledTotal = 0;
  let totalPaid = 0;
  let remainingBalance = 0;

  for (const installment of installments) {
    scheduledTotal += Number(
      installment?.amount || 0
    );

    totalPaid += Number(
      installment?.paidAmount || 0
    );

    remainingBalance += Number(
      installment?.remainingAmount || 0
    );
  }

  return {
    scheduledTotal: roundMoney(scheduledTotal),
    totalPaid: roundMoney(totalPaid),
    remainingBalance: roundMoney(
      Math.max(0, remainingBalance)
    )
  };
};

// ============================================================
// REFRESH PLAN BALANCE FROM INSTALLMENTS
//
// This is the most important fix.
//
// Never subtract payment from an old/stale
// plan.remainingBalance.
//
// Instead:
//
// remainingBalance = SUM(all installment remainingAmount) - plan balance reductions
//
// totalPaid = SUM(all installment paidAmount)
// ============================================================

const refreshPlanFinancials = async (
  plan,
  shopId
) => {
  const installments =
    await Installment.find({
      shopId,
      installmentPlan: plan._id,
      ...revisionFilter(Number(plan.revisionNumber || 0)),
      isArchived: { $ne: true },
    }).lean();

  const totals =
    calculateInstallmentTotals(
      installments
    );

  plan.remainingBalance = Math.max(
    0,
    roundMoney(totals.remainingBalance - Number(plan.balanceReduction || 0))
  );

  return {
    installments,
    ...totals,
    totalPaid: roundMoney(totals.totalPaid + Number(plan.balanceReduction || 0)),
    remainingBalance: plan.remainingBalance,
  };
};

// ============================================================
// OVERDUE STATUS
// ============================================================

const updateOverdueStatus = async (
  planId,
  shopId
) => {
  const now = new Date();

  const installments =
    await Installment.find({
      shopId,
      installmentPlan: planId,
      status: {
        $in: [
          'Pending',
          'Partially Paid'
        ]
      },
      dueDate: {
        $lt: now
      },
      remainingAmount: {
        $gt: 0
      }
    });

  for (const installment of installments) {
    installment.status = 'Overdue';

    await installment.save();
  }

  const overdueExists =
    await Installment.exists({
      shopId,
      installmentPlan: planId,
      status: 'Overdue',
      remainingAmount: {
        $gt: 0
      }
    });

  const plan =
    await InstallmentPlan.findOne({
      _id: planId,
      shopId
    });

  if (!plan) return;

  if (plan.status === 'Completed') {
    return;
  }

  plan.status = overdueExists
    ? 'Overdue'
    : 'Active';

  await plan.save();
};

// ============================================================
// GET ALL INSTALLMENT PLANS
// ============================================================

const getInstallmentPlans = async (
  req,
  res
) => {
  try {
    const shopId = req.shopId;

    // --------------------------------------------------------
    // OPTIONAL PAGINATION (backward compatible)
    // ?page=1&limit=20 -> { data, pagination }
    // no params       -> plain array (unchanged)
    //
    // In paginated mode the overdue refresh + financial
    // enrichment run only on the requested page.
    // --------------------------------------------------------
    const pagination =
      getPaginationParams(req);

    const plansFilter = {
      shopId
    };

    const buildPlansQuery = () =>
      InstallmentPlan.find(plansFilter)
        // The list view only needs searchable customer fields. Avoid sending
        // profile/fingerprint images for every plan in the table response.
        .populate('customer', 'fullName mobileNumber cnic')
        .populate('product', 'name brand model')
        .populate({
          path: 'sale',
          select: 'saleId saleDate createdAt paymentType finalTotal totalWithMarkup markupAmount purchasePriceAtSale quantity unitPrice discount items',
          populate: { path: 'items.product', select: 'name brand model sku' },
        })
        .sort({
          createdAt: -1
        });

    let totalPlans = 0;

    const applyPaging = (q) =>
      pagination
        ? q.skip(pagination.skip).limit(pagination.limit)
        : q;

    if (pagination) {
      totalPlans =
        await InstallmentPlan.countDocuments(plansFilter);
    }

    const plans =
      await applyPaging(buildPlansQuery());

    // Refresh overdue state in batches. The previous implementation ran
    // several database operations per plan, which made opening this page
    // increasingly slow as the shop accumulated installment plans.
    const planIds = plans.map((plan) => plan._id);
    if (planIds.length) {
      const now = new Date();
      await Installment.updateMany(
        {
          shopId,
          installmentPlan: { $in: planIds },
          status: { $in: ['Pending', 'Partially Paid'] },
          dueDate: { $lt: now },
          remainingAmount: { $gt: 0 },
        },
        { $set: { status: 'Overdue' } }
      );

      const overduePlanIds = await Installment.distinct('installmentPlan', {
        shopId,
        installmentPlan: { $in: planIds },
        status: 'Overdue',
        remainingAmount: { $gt: 0 },
      });
      const overduePlanIdSet = new Set(overduePlanIds.map(String));
      const planStatusUpdates = plans
        .filter((plan) => plan.status !== 'Completed')
        .map((plan) => ({
          updateOne: {
            filter: { _id: plan._id, shopId, status: { $ne: 'Completed' } },
            update: {
              $set: {
                status: overduePlanIdSet.has(String(plan._id)) ? 'Overdue' : 'Active',
              },
            },
          },
        }));
      if (planStatusUpdates.length) {
        await InstallmentPlan.bulkWrite(planStatusUpdates, { ordered: false });
      }
    }

    const refreshedPlans =
      await applyPaging(buildPlansQuery())
        .lean();

    const saleIds = refreshedPlans
      .map((plan) => plan.sale?._id)
      .filter(Boolean);
    const returnRows = saleIds.length
      ? await Return.find({ shopId, sale: { $in: saleIds } })
          .populate('product', 'name brand model sku')
          .sort({ returnDate: -1, createdAt: -1 })
          .lean()
      : [];
    const returnsBySale = new Map();
    for (const returnRow of returnRows) {
      const saleKey = String(returnRow.sale);
      if (!returnsBySale.has(saleKey)) returnsBySale.set(saleKey, []);
      returnsBySale.get(saleKey).push(returnRow);
    }

    // ========================================================
    // CORRECT PLAN FINANCIALS
    // ========================================================

    const activeInstallmentFilters = refreshedPlans.map((plan) => ({
      installmentPlan: plan._id,
      ...revisionFilter(Number(plan.revisionNumber || 0)),
    }));
    const allPlanInstallments = activeInstallmentFilters.length
      ? await Installment.find({
          shopId,
          isArchived: { $ne: true },
          $or: activeInstallmentFilters,
        }).lean()
      : [];
    const installmentsByPlan = new Map();
    for (const installment of allPlanInstallments) {
      const key = String(installment.installmentPlan);
      const rows = installmentsByPlan.get(key);
      if (rows) rows.push(installment);
      else installmentsByPlan.set(key, [installment]);
    }

    for (const plan of refreshedPlans) {
      plan.returns = returnsBySale.get(String(plan.sale?._id)) || [];
      plan.completedByReturn = plan.status === 'Completed' && plan.returns.length > 0;

      const installments = installmentsByPlan.get(String(plan._id)) || [];

      const totals =
        calculateInstallmentTotals(
          installments
        );

      // IMPORTANT:
      // Do not add downPayment separately here.
      //
      // If DP is first installment,
      // it is already inside totalPaid.
      plan.totalPaid =
        roundMoney(totals.totalPaid + Number(plan.balanceReduction || 0));

      plan.remainingBalance =
        Math.max(0, roundMoney(totals.remainingBalance - Number(plan.balanceReduction || 0)));

      plan.installmentScheduleTotal =
        totals.scheduledTotal;

      plan.remainingInstallmentCount = installments.filter((installment) =>
        Number(installment.remainingAmount || 0) > 0.005 &&
        !['Paid', 'Settled'].includes(installment.status)
      ).length;
    }

    if (pagination) {
      return paginatedResponse(
        res,
        refreshedPlans,
        totalPlans,
        pagination
      );
    }

    return res.status(200).json({
      success: true,
      data: refreshedPlans
    });

  } catch (error) {
    console.error(
      'GET INSTALLMENT PLANS ERROR:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to fetch installment plans',
      error:
        error.message
    });
  }
};

// ============================================================
// GET DUE INSTALLMENTS
// ============================================================

const getDueInstallments = async (
  req,
  res
) => {
  try {
    const shopId = req.shopId;
    const now = new Date();

    const installments =
      await Installment.find({
        shopId,

        remainingAmount: {
          $gt: 0
        },

        status: {
          $nin: [
            'Paid',
            'Settled'
          ]
        }
      })
        .populate({
          path: 'installmentPlan',

          populate: [
            {
              path: 'customer'
            },
            {
              path: 'product'
            },
            {
              path: 'sale'
            }
          ]
        })
        .sort({
          dueDate: 1,
          installmentNumber: 1
        })
        .lean();

    const overdue = [];
    const dueToday = [];
    const upcoming = [];

    // ========================================================
    // TODAY
    // ========================================================

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // ========================================================
    // UPCOMING WINDOW
    // ========================================================

    const upcomingEnd = new Date(
      today
    );

    upcomingEnd.setDate(
      upcomingEnd.getDate() + 7
    );

    // ========================================================
    // CLASSIFY
    // ========================================================

    for (const item of installments) {
      if (
        item.installmentPlan?.status === 'Completed' &&
        Number(item.installmentPlan?.remainingBalance || 0) <= 0
      ) {
        continue;
      }

      if (!item.dueDate) {
        continue;
      }

      const due =
        new Date(item.dueDate);

      const dueDay =
        new Date(
          due.getFullYear(),
          due.getMonth(),
          due.getDate()
        );

      const diffMs =
        dueDay.getTime() -
        today.getTime();

      const diffDays =
        Math.round(
          diffMs /
          (1000 * 60 * 60 * 24)
        );

      // ------------------------------------------------------
      // OVERDUE
      // ------------------------------------------------------

      if (dueDay < today) {
        overdue.push({
          ...item,

          category:
            'Overdue',

          daysOverdue:
            Math.abs(diffDays)
        });

        continue;
      }

      // ------------------------------------------------------
      // DUE TODAY
      // ------------------------------------------------------

      if (
        dueDay.getTime() ===
        today.getTime()
      ) {
        dueToday.push({
          ...item,

          category:
            'Due Today',

          daysUntilDue: 0
        });

        continue;
      }

      // ------------------------------------------------------
      // UPCOMING
      // ------------------------------------------------------

      if (
        dueDay <=
        upcomingEnd
      ) {
        upcoming.push({
          ...item,

          category:
            'Upcoming',

          daysUntilDue:
            diffDays
        });
      }
    }

    // ========================================================
    // COUNTS
    // ========================================================

    const totalOverdue =
      overdue.length;

    const totalDueToday =
      dueToday.length;

    const totalUpcoming =
      upcoming.length;

    const totalDue =
      totalOverdue +
      totalDueToday;

    const totalPending =
      totalOverdue +
      totalDueToday +
      totalUpcoming;

    // ========================================================
    // AMOUNTS
    // ========================================================

    const overdueAmount =
      roundMoney(
        overdue.reduce(
          (total, item) =>
            total +
            Number(
              item.remainingAmount || 0
            ),
          0
        )
      );

    const dueTodayAmount =
      roundMoney(
        dueToday.reduce(
          (total, item) =>
            total +
            Number(
              item.remainingAmount || 0
            ),
          0
        )
      );

    const upcomingAmount =
      roundMoney(
        upcoming.reduce(
          (total, item) =>
            total +
            Number(
              item.remainingAmount || 0
            ),
          0
        )
      );

    const totalPendingAmount =
      roundMoney(
        overdueAmount +
        dueTodayAmount +
        upcomingAmount
      );

    return res.status(200).json({
      success: true,

      data: {
        overdue,

        dueToday,

        upcoming,

        totalOverdue,

        totalDueToday,

        totalUpcoming,

        totalDue,

        totalPending,

        overdueAmount,

        dueTodayAmount,

        upcomingAmount,

        totalPendingAmount
      }
    });

  } catch (error) {
    console.error(
      'GET DUE INSTALLMENTS ERROR:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to fetch due installments',

      error:
        error.message
    });
  }
};

// ============================================================
// GET SINGLE INSTALLMENT PLAN
// ============================================================

const getInstallmentPlanById = async (
  req,
  res
) => {
  try {
    const {
      id
    } = req.params;

    const shopId = req.shopId;

    const plan =
      await InstallmentPlan.findOne({
        _id: id,
        shopId
      })
        .populate('customer', '+liveImage +fingerprintImage +liveImageCapturedAt +fingerprintCapturedAt')
        .populate('product')
        .populate({ path: 'sale', populate: { path: 'items.product' } });

    if (!plan) {
      return res.status(404).json({
        message:
          'Installment plan not found'
      });
    }

    await updateOverdueStatus(
      plan._id,
      shopId
    );

    const refreshedPlan =
      await InstallmentPlan.findOne({
        _id: id,
        shopId
      })
        .populate('customer', '+liveImage +fingerprintImage +liveImageCapturedAt +fingerprintCapturedAt')
        .populate('product')
        .populate({ path: 'sale', populate: { path: 'items.product' } });

    const installments =
      await Installment.find({
        shopId,
        installmentPlan: id,
        ...revisionFilter(Number(refreshedPlan.revisionNumber || 0)),
        isArchived: { $ne: true },
      })
        .sort({
          installmentNumber: 1
        });

    // ========================================================
    // CORRECT FINANCIAL TOTALS
    // ========================================================

    const totals =
      calculateInstallmentTotals(
        installments
      );

    const dpFirst =
      isDownPaymentFirstInstallment(
        refreshedPlan
      );

    // ========================================================
    // IMPORTANT:
    //
    // When DP is first installment:
    //
    // DP = 50,000
    // Installment #1 paid = 50,000
    //
    // Total customer paid = 50,000
    //
    // NOT:
    //
    // 50,000 + 50,000 = 100,000
    // ========================================================

    refreshedPlan.totalPaid =
      roundMoney(totals.totalPaid + Number(refreshedPlan.balanceReduction || 0));

    refreshedPlan.remainingBalance =
      Math.max(0, roundMoney(totals.remainingBalance - Number(refreshedPlan.balanceReduction || 0)));

    refreshedPlan.installmentScheduleTotal =
      totals.scheduledTotal;

    refreshedPlan.downPaymentCountedAsFirstInstallment =
      dpFirst;

    const payments =
      await Payment.find({
        shopId,
        installmentPlan: id,
        isArchived: false
      })
        .populate('installment')
        .populate('allocations.installment')
        .sort({
          paymentDate: -1,
          createdAt: -1
        });

    const returns = await Return.find({ shopId, sale: refreshedPlan.sale?._id })
      .populate('product', 'name brand model sku')
      .sort({ returnDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,

      data: {
        plan:
          refreshedPlan,

        installments,

        payments,
        returns,
      }
    });

  } catch (error) {
    console.error(
      'GET INSTALLMENT PLAN ERROR:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to fetch installment plan',

      error:
        error.message
    });
  }
};

// ============================================================
// PAY INSTALLMENT
//
// RULES:
//
// 1. Underpayment stays on current installment.
// 2. Underpayment NEVER carries forward.
// 3. Exact payment clears current.
// 4. Overpayment clears current first.
// 5. Extra reduces only the overall plan balance; no installment is changed.
// 7. Scheduled amount NEVER changes.
// 8. Only paidAmount / remainingAmount / status change.
// 9. One Payment record stores allocations.
// 10. DP-first is NOT separately added to plan balance.
// ============================================================

const payInstallment = async (
  req,
  res
) => {
  try {
    const {
      installmentId,
      paymentAmount,
      paymentDate: paymentDateInput,
      balanceReductionOnly = false,
      paymentMethod = 'Cash',
      notes = ''
    } = req.body;

    const shopId = req.shopId;

    const amountToPay =
      roundMoney(paymentAmount);

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!installmentId) {
      return res.status(400).json({
        message:
          'Installment ID is required'
      });
    }

    if (
      !Number.isFinite(amountToPay) ||
      amountToPay <= 0
    ) {
      return res.status(400).json({
        message:
          'Payment amount must be greater than zero'
      });
    }

    const paymentDate = paymentDateInput
      ? new Date(paymentDateInput)
      : new Date();

    if (
      Number.isNaN(paymentDate.getTime()) ||
      paymentDate > new Date()
    ) {
      return res.status(400).json({
        message: 'Payment date must be valid and cannot be in the future'
      });
    }

    // ========================================================
    // CURRENT INSTALLMENT
    // ========================================================

    const currentInstallment =
      await Installment.findOne({
        _id: installmentId,
        shopId,
        isArchived: { $ne: true },
      });

    if (!currentInstallment) {
      return res.status(404).json({
        message:
          'Installment not found'
      });
    }

    if (
      balanceReductionOnly &&
      Number(currentInstallment.remainingAmount || 0) > 0.005 &&
      !['Paid', 'Settled'].includes(String(currentInstallment.status || ''))
    ) {
      return res.status(400).json({
        message: 'Balance-only payments can only be recorded against an already paid installment.'
      });
    }

    if (!balanceReductionOnly && (
      currentInstallment.status === 'Paid' ||
      currentInstallment.status === 'Settled' ||
      Number(
        currentInstallment.remainingAmount || 0
      ) <= 0
    )) {
      return res.status(400).json({
        message:
          'This installment is already cleared'
      });
    }

    // ========================================================
    // PLAN
    // ========================================================

    const plan =
      await InstallmentPlan.findOne({
        _id:
          currentInstallment.installmentPlan,
        shopId
      });

    if (!plan) {
      return res.status(404).json({
        message:
          'Installment plan not found'
      });
    }

    // ========================================================
    // IMPORTANT:
    //
    // DO NOT USE:
    //
    // if (plan.remainingBalance <= 0)
    //
    // because old/stale plan.remainingBalance can be wrong.
    //
    // Actual installment records are the source of truth.
    // ========================================================

    const allPlanInstallmentsBefore =
      await Installment.find({
        shopId,
        installmentPlan:
          plan._id,
        ...revisionFilter(Number(plan.revisionNumber || 0)),
        isArchived: { $ne: true },
      });

    const totalsBefore =
      calculateInstallmentTotals(
        allPlanInstallmentsBefore
      );

    const balanceBeforePayment = Math.max(
      0,
      roundMoney(totalsBefore.remainingBalance - Number(plan.balanceReduction || 0))
    );

    if (balanceBeforePayment <= 0) {
      plan.remainingBalance = 0;
      plan.status = 'Completed';

      await plan.save();

      return res.status(400).json({
        message:
          'This installment plan is already completed'
      });
    }

    if (amountToPay > balanceBeforePayment) {
      return res.status(400).json({
        message: `Payment cannot exceed the remaining balance of ${balanceBeforePayment}`,
        remainingBalance: balanceBeforePayment,
      });
    }

    // ========================================================
    // SALE
    // ========================================================

    const sale =
      await Sale.findOne({
        _id: plan.sale,
        shopId
      });

    if (!sale) {
      return res.status(404).json({
        message:
          'Sale not found'
      });
    }

    // ========================================================
    // ALL INSTALLMENTS FROM CURRENT ONWARD
    // ========================================================

    const installmentsFromCurrent =
      await Installment.find({
        shopId,
        installmentPlan:
          plan._id,
        ...revisionFilter(Number(plan.revisionNumber || 0)),
        isArchived: { $ne: true },
        installmentNumber: {
          $gte:
            currentInstallment.installmentNumber
        }
      })
        .sort({
          installmentNumber: 1
        });

    if (!balanceReductionOnly && !installmentsFromCurrent.length) {
      return res.status(400).json({
        message:
          'No unpaid installments found'
      });
    }

    // ========================================================
    // PAYMENT DATE
    // ========================================================

    // ========================================================
    // ALLOCATIONS
    // ========================================================

    const allocations = [];

    let paymentLeft =
      amountToPay;

    let actualAllocatedAmount =
      0;

    let firstAffectedInstallment =
      null;

    // ========================================================
    // STEP 1
    // CURRENT INSTALLMENT FIRST
    // ========================================================

    const currentRemainingBefore =
      roundMoney(
        currentInstallment.remainingAmount
      );

    const currentAllocation = balanceReductionOnly
      ? 0
      : roundMoney(
          Math.min(
            paymentLeft,
            currentRemainingBefore,
            balanceBeforePayment
          )
        );

    if (
      currentAllocation > 0
    ) {
      firstAffectedInstallment =
        currentInstallment;

      currentInstallment.paidAmount =
        roundMoney(
          Number(
            currentInstallment.paidAmount || 0
          ) +
          currentAllocation
        );

      currentInstallment.remainingAmount =
        roundMoney(
          Math.max(
            0,
            Number(
              currentInstallment.amount || 0
            ) -
            Number(
              currentInstallment.paidAmount || 0
            )
          )
        );

      if (
        currentInstallment.remainingAmount <=
        0
      ) {
        currentInstallment.remainingAmount =
          0;

        currentInstallment.status =
          'Paid';

        currentInstallment.paidDate =
          paymentDate;
      } else {
        currentInstallment.status =
          'Partially Paid';

        currentInstallment.paidDate =
          undefined;
      }

      await currentInstallment.save();

      allocations.push({
        installment:
          currentInstallment._id,

        installmentNumber:
          currentInstallment.installmentNumber,

        amount:
          currentAllocation,

        previousRemaining:
          currentRemainingBefore,

        remainingAfterPayment:
          currentInstallment.remainingAmount,

        allocationType:
          'Current Installment'
      });

      actualAllocatedAmount =
        roundMoney(
          actualAllocatedAmount +
          currentAllocation
        );

      paymentLeft =
        roundMoney(
          paymentLeft -
          currentAllocation
        );
    }

    // ========================================================
    // STEP 2
    // EXTRA PAYMENT
    // ========================================================

    let extraPayment =
      roundMoney(paymentLeft);

    let extraAdjustedAmount =
      0;

    if (extraPayment > 0) {
      const balanceAfterCurrentPayment = Math.max(
        0,
        roundMoney(balanceBeforePayment - currentAllocation)
      );
      extraAdjustedAmount = roundMoney(
        Math.min(extraPayment, balanceAfterCurrentPayment)
      );
      plan.balanceReduction = roundMoney(
        Number(plan.balanceReduction || 0) + extraAdjustedAmount
      );
      actualAllocatedAmount = roundMoney(
        actualAllocatedAmount + extraAdjustedAmount
      );
      paymentLeft = roundMoney(extraPayment - extraAdjustedAmount);
    } else {
      paymentLeft = 0;
    }

    // ========================================================
    // ACTUAL ALLOCATION CHECK
    // ========================================================

    if ((!firstAffectedInstallment && !balanceReductionOnly) || actualAllocatedAmount <= 0) {
      return res.status(400).json({
        message:
          'No amount could be allocated to this installment plan'
      });
    }

    // ========================================================
    // REFRESH ALL INSTALLMENTS
    //
    // THIS IS THE IMPORTANT PART.
    //
    // We calculate balance from actual installment records.
    // ========================================================

    const allPlanInstallments =
      await Installment.find({
        shopId,
        installmentPlan:
          plan._id,
        ...revisionFilter(Number(plan.revisionNumber || 0)),
        isArchived: { $ne: true },
      });

    const totalsAfter =
      calculateInstallmentTotals(
        allPlanInstallments
      );

    // ========================================================
    // CARRY FORWARD
    // ========================================================

    const carryForwardAmount =
      roundMoney(
        allocations
          .filter(
            (item) =>
              item.installmentNumber >
              currentInstallment.installmentNumber
          )
          .reduce(
            (total, item) =>
              total +
              Number(
                item.amount || 0
              ),
            0
          )
      );

    // ========================================================
    // NEW PLAN BALANCE
    //
    // NEVER:
    //
    // oldPlanBalance - payment
    //
    // Instead:
    //
    // SUM(actual installment remaining)
    // ========================================================

    const newPlanBalance = Math.max(
      0,
      roundMoney(totalsAfter.remainingBalance - Number(plan.balanceReduction || 0))
    );

    plan.remainingBalance =
      newPlanBalance;

    // ========================================================
    // CHECK REMAINING INSTALLMENTS
    // ========================================================

    const unpaidCount =
      allPlanInstallments.filter(
        (item) =>
          Number(
            item.remainingAmount || 0
          ) > 0
      ).length;

    // ========================================================
    // PLAN STATUS
    // ========================================================

    if (
      unpaidCount === 0 ||
      newPlanBalance <= 0
    ) {
      plan.remainingBalance = 0;

      plan.status =
        'Completed';

      // A full payoff settles the schedule. Keep each installment's actual
      // paidAmount intact so the monthly received figures remain truthful.
      if (newPlanBalance <= 0) {
        for (const installment of allPlanInstallments) {
          if (Number(installment.remainingAmount || 0) <= 0) continue;
          installment.status = 'Paid';
          installment.remainingAmount = 0;
          installment.paidDate = paymentDate;
          await installment.save();
        }
        // The plan level balance reduction covers any scheduled amount left
        // on the final installment, so the receipt should show it as settled.
        for (const allocation of allocations) {
          allocation.remainingAfterPayment = 0;
        }
      }

    } else {
      const overdueExists =
        await Installment.exists({
          shopId,
          installmentPlan:
            plan._id,
          status: 'Overdue',
          remainingAmount: {
            $gt: 0
          }
        });

      plan.status =
        overdueExists
          ? 'Overdue'
          : 'Active';
    }

    await plan.save();

    // ========================================================
    // SALE BALANCE
    //
    // Use actual installment balance.
    //
    // This also prevents DP-first double counting.
    // ========================================================

    sale.remainingBalance =
      newPlanBalance;

    await sale.save();

    // ========================================================
    // PAYMENT ID
    // ========================================================

    const paymentId =
      await generatePaymentID(
        shopId
      );

    // ========================================================
    // PAYMENT NOTE
    // ========================================================

    let defaultNote =
      `Payment of ${amountToPay} received.`;

    if (
      amountToPay <
      currentRemainingBefore
    ) {
      const partialRemaining =
        roundMoney(
          currentInstallment.remainingAmount
        );

      defaultNote =
        `Partial payment of ${amountToPay} received for installment #${currentInstallment.installmentNumber}. Remaining on this installment: ${partialRemaining}.`;

    } else if (
      extraAdjustedAmount > 0
    ) {
      defaultNote =
        `Payment of ${amountToPay} received. Extra payment of ${extraAdjustedAmount} reduced the total remaining balance without changing installment amounts.`;
    }

    if (
      paymentLeft > 0
    ) {
      defaultNote +=
        ` Unallocated amount: ${paymentLeft}.`;
    }

    // ========================================================
    // CREATE PAYMENT
    // ========================================================

    const payment =
      await Payment.create({
        shopId,

        paymentId,

        customer:
          plan.customer,

        sale:
          plan.sale,

        installmentPlan:
          plan._id,

        planRevision:
          Number(plan.revisionNumber || 0),

        installment:
          (firstAffectedInstallment || currentInstallment)._id,

        amount:
          amountToPay,

        paymentMethod,

        paymentDate,

        originalInstallmentAmount:
          currentInstallment.amount,

        carryForwardAmount,

        balanceReductionAmount:
          extraAdjustedAmount,

        balanceReductionOnly: Boolean(balanceReductionOnly),

        planPayableAmountAtPayment:
          balanceReductionOnly ? 0 : Math.min(currentRemainingBefore, balanceBeforePayment),

        planRemainingBalanceAfterPayment:
          newPlanBalance,

        advanceAmount:
          paymentLeft,

        allocations,

        notes:
          notes ||
          defaultNote
      });

    // ========================================================
    // REFRESH PLAN
    // ========================================================

    const updatedPlan =
      await InstallmentPlan.findOne({
        _id: plan._id,
        shopId
      })
        .populate('customer', '+liveImage +fingerprintImage +liveImageCapturedAt +fingerprintCapturedAt')
        .populate('product')
        .populate({ path: 'sale', populate: { path: 'items.product' } });

    const updatedInstallments =
      await Installment.find({
        shopId,
        installmentPlan:
          plan._id,
        ...revisionFilter(Number(updatedPlan.revisionNumber || 0)),
        isArchived: { $ne: true },
      })
        .sort({
          installmentNumber: 1
        });

    // ========================================================
    // FINAL FINANCIAL TOTALS
    // ========================================================

    const finalTotals =
      calculateInstallmentTotals(
        updatedInstallments
      );
    const totalPaidAfter = roundMoney(
      finalTotals.totalPaid + Number(updatedPlan.balanceReduction || 0)
    );

    const dpFirst =
      isDownPaymentFirstInstallment(
        updatedPlan
      );

    // IMPORTANT:
    //
    // Whether DP-first is ON or OFF,
    // actual paid installments plus direct balance reductions are the source
    // for plan payment totals.
    //
    // We NEVER add DP separately when it is
    // represented as installment #1.
    updatedPlan.remainingBalance =
      Math.max(0, roundMoney(finalTotals.remainingBalance - Number(updatedPlan.balanceReduction || 0)));

    updatedPlan.installmentScheduleTotal =
      finalTotals.scheduledTotal;

    updatedPlan.downPaymentCountedAsFirstInstallment =
      dpFirst;

    const updatedPayments =
      await Payment.find({
        shopId,
        installmentPlan:
          plan._id,
        isArchived: false
      })
        .populate('installment')
        .populate('allocations.installment')
        .sort({
          paymentDate: -1,
          createdAt: -1
        });

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({
      success: true,

      message:
        extraAdjustedAmount > 0
          ? `Payment recorded. ${extraAdjustedAmount} extra payment reduced the remaining balance without changing installment amounts.`
          : 'Payment recorded successfully',

      payment,

      allocatedAmount:
        actualAllocatedAmount,

      unallocatedAmount:
        paymentLeft,

      extraPayment:
        extraAdjustedAmount,

      balanceReductionAmount:
        extraAdjustedAmount,

      distributedAmount:
        extraAdjustedAmount,

      advanceAmount:
        paymentLeft,

      carryForwardAmount,

      allocations,

      // Helpful financial values for frontend
      totalPaid:
        totalPaidAfter,

      remainingBalance:
        updatedPlan.remainingBalance,

      installmentScheduleTotal:
        finalTotals.scheduledTotal,

      downPaymentCountedAsFirstInstallment:
        dpFirst,

      plan:
        updatedPlan,

      installments:
        updatedInstallments,

      payments:
        updatedPayments
    });

  } catch (error) {
    console.error(
      'PAY INSTALLMENT ERROR:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to process payment',

      error:
        error.message
    });
  }
};

const getMarkupPercentageForDuration = (duration) => {
  if (duration <= 3) return 15;
  if (duration <= 6) return 25;
  return 50;
};

const applyInstallmentBalanceDiscount = async (req, res) => {
  try {
    const shopId = req.shopId;
    const plan = await InstallmentPlan.findOne({ _id: req.params.id, shopId });
    if (!plan) return res.status(404).json({ message: 'Installment plan not found.' });
    const discountAmount = roundMoney(req.body.discountAmount);
    if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
      return res.status(400).json({ message: 'Enter a discount amount greater than zero.' });
    }

    const currentFinancials = await refreshPlanFinancials(plan, shopId);
    const currentBalance = roundMoney(currentFinancials.remainingBalance);
    if (discountAmount > currentBalance + 0.005) {
      return res.status(400).json({ message: `Discount cannot exceed the amount still due on the deal (${currentBalance}).` });
    }

    const activeScheduleInstallments = await Installment.find({
      shopId,
      installmentPlan: plan._id,
      ...revisionFilter(Number(plan.revisionNumber || 0)),
      isArchived: { $ne: true },
    }).sort({ installmentNumber: 1 });
    const unpaidInstallments = activeScheduleInstallments.filter((installment) =>
      Number(installment.remainingAmount || 0) > 0.005 && !['Paid', 'Settled'].includes(installment.status)
    );
    if (!unpaidInstallments.length) {
      return res.status(409).json({ message: 'No unpaid installments are available for this balance discount.' });
    }
    const hasFrozenInvoiceCount = plan.invoiceSnapshot?.remainingInstallmentCountFrozen === true;
    const hadPriorBalanceDiscount = Number(plan.balanceDiscount || 0) > 0;
    const invoiceRemainingInstallmentCount = hasFrozenInvoiceCount
      ? Number(plan.invoiceSnapshot.remainingInstallmentCount ?? unpaidInstallments.length)
      : !hadPriorBalanceDiscount
        ? unpaidInstallments.length
        : activeScheduleInstallments.filter((installment) => {
          const remaining = Number(installment.remainingAmount || 0);
          const status = String(installment.status || '');
          const discountClearedIt = Number(installment.balanceDiscountAmount || 0) > 0.005 ||
            Number(installment.originalAmount || 0) > Number(installment.amount || 0) + 0.005;
          return (remaining > 0.005 && !['Paid', 'Settled'].includes(status)) || discountClearedIt;
        }).length;

    // Spread discount cents over unpaid installments, preserving every
    // amount already collected and ensuring the schedule total matches the balance.
    let discountCentsLeft = Math.round(discountAmount * 100);
    let activeInstallments = unpaidInstallments;
    while (discountCentsLeft > 0 && activeInstallments.length) {
      const shareCents = Math.max(1, Math.floor(discountCentsLeft / activeInstallments.length));
      let appliedThisRound = 0;
      for (const installment of activeInstallments) {
        if (discountCentsLeft <= 0) break;
        const remainingCents = Math.max(0, Math.round(Number(installment.remainingAmount || 0) * 100));
        const appliedCents = Math.min(remainingCents, shareCents, discountCentsLeft);
        if (appliedCents <= 0) continue;
        installment.remainingAmount = roundMoney((remainingCents - appliedCents) / 100);
        installment.amount = roundMoney(Number(installment.paidAmount || 0) + installment.remainingAmount);
        installment.balanceDiscountAmount = roundMoney(Number(installment.balanceDiscountAmount || 0) + appliedCents / 100);
        installment.status = installment.remainingAmount <= 0.005
          ? 'Paid'
          : Number(installment.paidAmount || 0) > 0 ? 'Partially Paid' : 'Pending';
        await installment.save();
        discountCentsLeft -= appliedCents;
        appliedThisRound += appliedCents;
      }
      activeInstallments = activeInstallments.filter((item) => Number(item.remainingAmount || 0) > 0.005);
      if (appliedThisRound === 0) break;
    }

    if (discountCentsLeft > 0) {
      return res.status(409).json({ message: 'Could not apply the full discount to the unpaid schedule.' });
    }

    const updatedDiscountTotal = roundMoney(Number(plan.balanceDiscount || 0) + discountAmount);
    const newRemainingBalance = roundMoney(Math.max(0, currentBalance - discountAmount));
    plan.balanceDiscount = updatedDiscountTotal;
    plan.remainingBalance = newRemainingBalance;
    plan.status = newRemainingBalance <= 0.005 ? 'Completed' : 'Active';
    const invoiceSnapshot = plan.invoiceSnapshot?.toObject?.() || plan.invoiceSnapshot || {};
    plan.invoiceSnapshot = {
      ...invoiceSnapshot,
      financedAmount: newRemainingBalance,
      remainingInstallmentCount: invoiceRemainingInstallmentCount,
      remainingInstallmentCountFrozen: true,
    };
    plan.markModified('invoiceSnapshot');
    await plan.save();

    const sale = await Sale.findOne({ _id: plan.sale, shopId });
    if (sale) {
      sale.remainingBalance = newRemainingBalance;
      sale.paymentStatus = newRemainingBalance <= 0.005 ? 'Paid' : 'Unpaid';
      await sale.save();
    }

    await Payment.updateMany(
      { shopId, installmentPlan: plan._id },
      { $set: { planRemainingBalanceAfterPayment: newRemainingBalance } }
    );

    return res.status(200).json({
      success: true,
      message: `${discountAmount} discount applied to the total deal amount; the invoice total and remaining balance have been reduced.`,
      data: { discountAmount, balanceDiscount: updatedDiscountTotal, remainingBalance: newRemainingBalance },
    });
  } catch (error) {
    console.error('APPLY INSTALLMENT BALANCE DISCOUNT ERROR:', error);
    return res.status(500).json({ message: 'Failed to apply balance discount.', error: error.message });
  }
};

const reviseInstallmentPlan = async (req, res) => {
  try {
    const shopId = req.shopId;
    const plan = await InstallmentPlan.findOne({ _id: req.params.id, shopId });
    if (!plan) return res.status(404).json({ message: 'Installment plan not found.' });
    if (plan.status === 'Completed' || Number(plan.remainingBalance || 0) <= 0) {
      return res.status(400).json({ message: 'A completed installment plan cannot be revised.' });
    }

    const newDuration = Number(req.body.duration);
    const oldDuration = Number(plan.selectedDuration || plan.duration || 0);
    if (!Number.isInteger(newDuration) || newDuration < 1 || newDuration > 36) {
      return res.status(400).json({ message: 'Plan duration must be a whole number from 1 to 36 months.' });
    }

    const sale = await Sale.findOne({ _id: plan.sale, shopId, paymentType: 'Installment' });
    if (!sale) return res.status(404).json({ message: 'Related installment sale was not found.' });
    if (req.body.saleDate !== undefined) {
      const updatedSaleDate = new Date(req.body.saleDate);
      if (Number.isNaN(updatedSaleDate.getTime())) {
        return res.status(400).json({ message: 'Please provide a valid sale date.' });
      }
      sale.saleDate = updatedSaleDate;
    }

    const currentRevision = Number(plan.revisionNumber || 0);
    const oldInstallments = await Installment.find({
      shopId,
      installmentPlan: plan._id,
      ...revisionFilter(currentRevision),
      isArchived: { $ne: true },
    }).sort({ installmentNumber: 1 });
    const oldTotals = calculateInstallmentTotals(oldInstallments);
    const downPayment = roundMoney(plan.downPayment || 0);
    const downPaymentFirst = plan.treatDownPaymentAsFirstInstallment === true && downPayment > 0;
    const oldBalanceReduction = roundMoney(plan.balanceReduction || 0);
    const collectedTotal = roundMoney(
      (downPaymentFirst ? 0 : downPayment) + oldTotals.totalPaid + oldBalanceReduction
    );

    const priceBeforeMarkup = roundMoney(sale.finalTotal || 0);
    const markupBase = downPaymentFirst
      ? Math.max(0, priceBeforeMarkup - downPayment)
      : priceBeforeMarkup;
    const savedMarkupPercentage = Number(sale.markupPercentage || 0);
    const currentMarkupPercentage = savedMarkupPercentage > 0
      ? savedMarkupPercentage
      : markupBase > 0
        ? Math.max(0, (Number(plan.totalAmount || priceBeforeMarkup) - priceBeforeMarkup) / markupBase * 100)
        : getMarkupPercentageForDuration(oldDuration);
    const requestedMarkupPercentage = req.body.markupPercentage === undefined
      ? currentMarkupPercentage * newDuration / oldDuration
      : Number(req.body.markupPercentage);
    if (!Number.isFinite(requestedMarkupPercentage) || requestedMarkupPercentage < 0) {
      return res.status(400).json({ message: 'Markup percentage must be a valid amount of zero or more.' });
    }
    const markupPercentage = roundMoney(requestedMarkupPercentage);
    const markupAmount = roundMoney(markupBase * markupPercentage / 100);
    const newTotalAmount = roundMoney(priceBeforeMarkup + markupAmount);
    const requestedDiscountAmount = roundMoney(req.body.discountAmount || 0);
    if (!Number.isFinite(requestedDiscountAmount) || requestedDiscountAmount < 0) {
      return res.status(400).json({ message: 'Plan discount must be a valid amount of zero or more.' });
    }
    const balanceDiscount = roundMoney(Number(plan.balanceDiscount || 0) + requestedDiscountAmount);
    if (collectedTotal + balanceDiscount > newTotalAmount) {
      return res.status(400).json({
        message: `Payments and discount (${roundMoney(collectedTotal + balanceDiscount)}) exceed the revised deal amount (${newTotalAmount}).`,
        collectedTotal,
        newTotalAmount,
      });
    }

    const nextRevision = currentRevision + 1;
    const now = new Date();
    const oldMonthlyInstallment = oldInstallments.find((item) => !downPaymentFirst || Number(item.installmentNumber) > 1);
    const firstMonthlyDueDate = oldMonthlyInstallment?.dueDate || plan.firstDueDate || sale.saleDate || now;
    const includeDownPaymentRow = downPaymentFirst && newDuration > 1;
    const newRemainingBalance = roundMoney(newTotalAmount - collectedTotal - balanceDiscount);
    const paidInstallmentCredit = roundMoney(Math.max(
      0,
      oldTotals.totalPaid + oldBalanceReduction - (downPaymentFirst ? downPayment : 0)
    ));
    const schedule = [];

    if (includeDownPaymentRow) {
      schedule.push({
        installmentNumber: 1,
        amount: downPayment,
        dueDate: sale.saleDate || oldInstallments[0]?.dueDate || now,
        paidAmount: downPayment,
      });
    }

    if (paidInstallmentCredit > 0.005) {
      schedule.push({
        installmentNumber: schedule.length + 1,
        amount: paidInstallmentCredit,
        dueDate: firstMonthlyDueDate,
        paidAmount: paidInstallmentCredit,
      });
    }

    // Keep prior payments as a fully paid credit row. Divide only the
    // remaining amount across the new unpaid installments so none starts
    // partially paid after a revision.
    let monthlyCount = Math.max(0, newDuration - schedule.length);
    if (newRemainingBalance > 0.005 && monthlyCount === 0) monthlyCount = 1;
    const monthlyAmount = monthlyCount > 0
      ? roundMoney(newRemainingBalance / monthlyCount)
      : 0;
    let allocated = 0;
    for (let index = 0; index < monthlyCount; index += 1) {
      const amount = index === monthlyCount - 1
        ? roundMoney(newRemainingBalance - allocated)
        : monthlyAmount;
      allocated = roundMoney(allocated + amount);
      const dueDate = new Date(firstMonthlyDueDate);
      dueDate.setMonth(dueDate.getMonth() + index + (paidInstallmentCredit > 0.005 ? 1 : 0));
      schedule.push({
        installmentNumber: schedule.length + 1,
        amount,
        dueDate,
        paidAmount: 0,
      });
    }

    const newScheduleTotal = roundMoney(schedule.reduce((sum, installment) => sum + installment.amount, 0));
    const expectedScheduleTotal = includeDownPaymentRow
      ? roundMoney(newTotalAmount - balanceDiscount)
      : roundMoney(newTotalAmount - downPayment - balanceDiscount);
    if (Math.abs(newScheduleTotal - expectedScheduleTotal) > 0.01) {
      return res.status(500).json({ message: 'Could not calculate a balanced revised schedule.' });
    }

    const priorRevision = {
      revisionNumber: currentRevision,
      lastRevisionChange: plan.lastRevisionChange,
      selectedDuration: plan.selectedDuration,
      duration: plan.duration,
      totalAmount: plan.totalAmount,
      downPayment: plan.downPayment,
      remainingBalance: plan.remainingBalance,
      balanceDiscount: plan.balanceDiscount,
      revisionDiscountAmount: plan.invoiceSnapshot?.revisionDiscountAmount || 0,
      markupPercentage: sale.markupPercentage,
      markupAmount: sale.markupAmount,
      firstDueDate: plan.firstDueDate,
      invoiceSnapshot: plan.invoiceSnapshot?.toObject?.() || plan.invoiceSnapshot,
      installments: oldInstallments.map((installment) => ({
        installmentNumber: installment.installmentNumber,
        amount: installment.amount,
        paidAmount: installment.paidAmount,
        remainingAmount: installment.remainingAmount,
        dueDate: installment.dueDate,
        status: installment.status,
      })),
      revisedAt: now,
    };

    const newInstallments = schedule.map((installment) => {
      const remainingAmount = roundMoney(Math.max(0, installment.amount - installment.paidAmount));
      return {
        shopId,
        installmentPlan: plan._id,
        installmentNumber: installment.installmentNumber,
        revisionNumber: nextRevision,
        amount: installment.amount,
        originalAmount: installment.amount,
        paidAmount: installment.paidAmount,
        remainingAmount,
        dueDate: installment.dueDate,
        status: remainingAmount <= 0 ? 'Paid' : installment.paidAmount > 0 ? 'Partially Paid' : 'Pending',
        paidDate: installment.installmentNumber === 1 && includeDownPaymentRow && installment.paidAmount > 0
          ? (sale.saleDate || now)
          : undefined,
      };
    });
    const revisedInvoiceRemainingInstallmentCount = newInstallments.filter((installment) =>
      Number(installment.remainingAmount || 0) > 0.005 && !['Paid', 'Settled'].includes(installment.status)
    ).length;
    await Installment.deleteMany({ shopId, installmentPlan: plan._id, revisionNumber: nextRevision });
    await Installment.insertMany(newInstallments);

    plan.revisions.push(priorRevision);
    plan.revisionNumber = nextRevision;
    plan.lastRevisionChange = newDuration > oldDuration
      ? 'Increase'
      : newDuration < oldDuration ? 'Decrease' : 'Same';
    plan.selectedDuration = newDuration;
    plan.duration = schedule.length;
    plan.totalAmount = newTotalAmount;
    plan.balanceDiscount = balanceDiscount;
    plan.remainingBalance = newRemainingBalance;
    plan.balanceReduction = 0;
    plan.status = newRemainingBalance <= 0 ? 'Completed' : 'Active';
    plan.firstDueDate = firstMonthlyDueDate;
    plan.invoiceSnapshot = {
      selectedDuration: newDuration,
      duration: schedule.length,
      remainingInstallmentCount: revisedInvoiceRemainingInstallmentCount,
      remainingInstallmentCountFrozen: true,
      downPayment,
      treatDownPaymentAsFirstInstallment: plan.treatDownPaymentAsFirstInstallment,
      // Invoice shows the current balance after this revision, while the
      // original down payment and first-payment figures remain immutable.
      financedAmount: newRemainingBalance,
      revisionDiscountAmount: requestedDiscountAmount,
      initialPaymentType: plan.invoiceSnapshot?.initialPaymentType || plan.initialPaymentType || 'None',
      initialInstallmentPaidAmount: Number(
        plan.invoiceSnapshot?.initialInstallmentPaidAmount ?? plan.initialInstallmentPaidAmount ?? 0
      ),
      initialPaymentCountsAsFirstInstallment: Boolean(
        plan.invoiceSnapshot?.initialPaymentCountsAsFirstInstallment ?? plan.initialPaymentCountsAsFirstInstallment
      ),
      installments: schedule.map(({ installmentNumber, amount, dueDate }) => ({ installmentNumber, amount, dueDate })),
      createdAt: now,
    };
    plan.markModified('invoiceSnapshot');
    await plan.save();

    sale.markupPercentage = markupPercentage;
    sale.markupAmount = markupAmount;
    sale.totalWithMarkup = newTotalAmount;
    sale.installmentDuration = schedule.length;
    sale.selectedInstallmentDuration = newDuration;
    sale.remainingBalance = newRemainingBalance;
    sale.paymentStatus = newRemainingBalance <= 0 ? 'Paid' : 'Unpaid';
    sale.installmentScheduleSnapshot = schedule.map(({ installmentNumber, amount, dueDate }) => ({ installmentNumber, amount, dueDate }));
    await sale.save();

    // Keep the overall balance shown on any previously issued receipt aligned
    // with the newly revised contract. Payment amounts, dates and installment
    // allocation snapshots remain untouched.
    await Payment.updateMany(
      { shopId, installmentPlan: plan._id },
      { $set: { planRemainingBalanceAfterPayment: newRemainingBalance } }
    );

    await Installment.updateMany(
      { shopId, installmentPlan: plan._id, ...revisionFilter(currentRevision), isArchived: { $ne: true } },
      { $set: { isArchived: true, status: 'Settled', remainingAmount: 0 } }
    );

    const updatedPlan = await InstallmentPlan.findOne({ _id: plan._id, shopId })
      .populate('customer', '+liveImage +fingerprintImage +liveImageCapturedAt +fingerprintCapturedAt')
      .populate('product')
      .populate({ path: 'sale', populate: { path: 'items.product' } });
    const updatedInstallments = await Installment.find({
      shopId,
      installmentPlan: plan._id,
      revisionNumber: nextRevision,
      isArchived: { $ne: true },
    }).sort({ installmentNumber: 1 });

    return res.status(200).json({
      success: true,
      message: `Plan revised to ${newDuration} months. Previous payments were preserved. Revised deal total after discount: ${roundMoney(newTotalAmount - balanceDiscount)}; remaining balance: ${newRemainingBalance}.`,
      data: { plan: updatedPlan, installments: updatedInstallments },
    });
  } catch (error) {
    console.error('REVISE INSTALLMENT PLAN ERROR:', error);
    return res.status(500).json({ message: 'Failed to revise installment plan.', error: error.message });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getInstallmentPlans,
  getInstallmentPlanById,
  getDueInstallments,
  payInstallment,
  reviseInstallmentPlan,
  applyInstallmentBalanceDiscount,
};
