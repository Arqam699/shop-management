const InstallmentPlan = require('../models/InstallmentPlan');
const Installment = require('../models/Installment');
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');

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
// remainingBalance = SUM(all installment remainingAmount)
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
      installmentPlan: plan._id
    }).lean();

  const totals =
    calculateInstallmentTotals(
      installments
    );

  plan.remainingBalance =
    totals.remainingBalance;

  return {
    installments,
    ...totals
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

    const plans =
      await InstallmentPlan.find({
        shopId
      })
        .populate('customer')
        .populate('product')
        .populate('sale')
        .sort({
          createdAt: -1
        });

    await Promise.all(
      plans.map((plan) =>
        updateOverdueStatus(
          plan._id,
          shopId
        )
      )
    );

    const refreshedPlans =
      await InstallmentPlan.find({
        shopId
      })
        .populate('customer')
        .populate('product')
        .populate('sale')
        .sort({
          createdAt: -1
        })
        .lean();

    // ========================================================
    // CORRECT PLAN FINANCIALS
    // ========================================================

    for (const plan of refreshedPlans) {
      const installments =
        await Installment.find({
          shopId,
          installmentPlan: plan._id
        }).lean();

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
        totals.totalPaid;

      plan.remainingBalance =
        totals.remainingBalance;

      plan.installmentScheduleTotal =
        totals.scheduledTotal;
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
        .populate('customer')
        .populate('product')
        .populate('sale');

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
        .populate('customer')
        .populate('product')
        .populate('sale');

    const installments =
      await Installment.find({
        shopId,
        installmentPlan: id
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
      totals.totalPaid;

    refreshedPlan.remainingBalance =
      totals.remainingBalance;

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
        .sort({
          paymentDate: -1,
          createdAt: -1
        });

    return res.status(200).json({
      success: true,

      data: {
        plan:
          refreshedPlan,

        installments,

        payments
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
// 5. Extra is distributed equally across future installments.
// 6. If one future installment gets fully cleared,
//    remaining extra is redistributed.
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

    // ========================================================
    // CURRENT INSTALLMENT
    // ========================================================

    const currentInstallment =
      await Installment.findOne({
        _id: installmentId,
        shopId
      });

    if (!currentInstallment) {
      return res.status(404).json({
        message:
          'Installment not found'
      });
    }

    if (
      currentInstallment.status === 'Paid' ||
      currentInstallment.status === 'Settled' ||
      Number(
        currentInstallment.remainingAmount || 0
      ) <= 0
    ) {
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
          plan._id
      });

    const totalsBefore =
      calculateInstallmentTotals(
        allPlanInstallmentsBefore
      );

    if (
      totalsBefore.remainingBalance <= 0
    ) {
      plan.remainingBalance = 0;
      plan.status = 'Completed';

      await plan.save();

      return res.status(400).json({
        message:
          'This installment plan is already completed'
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
        installmentNumber: {
          $gte:
            currentInstallment.installmentNumber
        }
      })
        .sort({
          installmentNumber: 1
        });

    if (
      !installmentsFromCurrent.length
    ) {
      return res.status(400).json({
        message:
          'No unpaid installments found'
      });
    }

    // ========================================================
    // PAYMENT DATE
    // ========================================================

    const paymentDate =
      new Date();

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

    const currentAllocation =
      roundMoney(
        Math.min(
          paymentLeft,
          currentRemainingBefore
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

    if (
      extraPayment > 0
    ) {
      const futureInstallments =
        await Installment.find({
          shopId,
          installmentPlan:
            plan._id,

          installmentNumber: {
            $gt:
              currentInstallment.installmentNumber
          },

          remainingAmount: {
            $gt: 0
          }
        })
          .sort({
            installmentNumber: 1
          });

      let remainingExtra =
        extraPayment;

      let availableFuture =
        futureInstallments;

      while (
        remainingExtra > 0.009 &&
        availableFuture.length > 0
      ) {
        const equalShare =
          roundMoney(
            remainingExtra /
            availableFuture.length
          );

        if (
          equalShare <= 0
        ) {
          break;
        }

        const nextRound = [];

        let distributedThisRound =
          0;

        for (
          const installment
          of availableFuture
        ) {
          if (
            remainingExtra <= 0.009
          ) {
            break;
          }

          const previousRemaining =
            roundMoney(
              installment.remainingAmount
            );

          if (
            previousRemaining <= 0
          ) {
            continue;
          }

          const allocationAmount =
            roundMoney(
              Math.min(
                equalShare,
                previousRemaining,
                remainingExtra
              )
            );

          if (
            allocationAmount <= 0
          ) {
            continue;
          }

          installment.paidAmount =
            roundMoney(
              Number(
                installment.paidAmount || 0
              ) +
              allocationAmount
            );

          installment.remainingAmount =
            roundMoney(
              Math.max(
                0,
                Number(
                  installment.amount || 0
                ) -
                Number(
                  installment.paidAmount || 0
                )
              )
            );

          if (
            installment.remainingAmount <=
            0
          ) {
            installment.remainingAmount =
              0;

            installment.status =
              'Paid';

            installment.paidDate =
              paymentDate;
          } else {
            installment.status =
              installment.paidAmount > 0
                ? 'Partially Paid'
                : 'Pending';
          }

          await installment.save();

          allocations.push({
            installment:
              installment._id,

            installmentNumber:
              installment.installmentNumber,

            amount:
              allocationAmount,

            previousRemaining,

            remainingAfterPayment:
              installment.remainingAmount,

            allocationType:
              'Extra Payment Adjustment'
          });

          distributedThisRound =
            roundMoney(
              distributedThisRound +
              allocationAmount
            );

          extraAdjustedAmount =
            roundMoney(
              extraAdjustedAmount +
              allocationAmount
            );

          actualAllocatedAmount =
            roundMoney(
              actualAllocatedAmount +
              allocationAmount
            );

          remainingExtra =
            roundMoney(
              remainingExtra -
              allocationAmount
            );

          if (
            installment.remainingAmount >
            0.009
          ) {
            nextRound.push(
              installment
            );
          }
        }

        if (
          distributedThisRound <= 0
        ) {
          break;
        }

        availableFuture =
          nextRound;
      }

      paymentLeft =
        roundMoney(
          remainingExtra
        );

    } else {
      paymentLeft = 0;
    }

    // ========================================================
    // ACTUAL ALLOCATION CHECK
    // ========================================================

    if (
      !firstAffectedInstallment ||
      actualAllocatedAmount <= 0
    ) {
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
          plan._id
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

    const newPlanBalance =
      totalsAfter.remainingBalance;

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
        `Payment of ${amountToPay} received. Extra payment of ${extraAdjustedAmount} was equally adjusted across remaining installments.`;
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

        installment:
          firstAffectedInstallment._id,

        amount:
          amountToPay,

        paymentMethod,

        paymentDate,

        originalInstallmentAmount:
          currentInstallment.amount,

        carryForwardAmount,

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
        .populate('customer')
        .populate('product')
        .populate('sale');

    const updatedInstallments =
      await Installment.find({
        shopId,
        installmentPlan:
          plan._id
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

    const dpFirst =
      isDownPaymentFirstInstallment(
        updatedPlan
      );

    // IMPORTANT:
    //
    // Whether DP-first is ON or OFF,
    // actual paid installments are the source
    // for installment payment history.
    //
    // We NEVER add DP separately when it is
    // represented as installment #1.
    updatedPlan.totalPaid =
      finalTotals.totalPaid;

    updatedPlan.remainingBalance =
      finalTotals.remainingBalance;

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
          ? `Payment recorded. ${extraAdjustedAmount} extra payment was adjusted equally across remaining installments.`
          : 'Payment recorded successfully',

      payment,

      allocatedAmount:
        actualAllocatedAmount,

      unallocatedAmount:
        paymentLeft,

      extraPayment:
        extraAdjustedAmount,

      carryForwardAmount,

      allocations,

      // Helpful financial values for frontend
      totalPaid:
        finalTotals.totalPaid,

      remainingBalance:
        finalTotals.remainingBalance,

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

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getInstallmentPlans,
  getInstallmentPlanById,
  getDueInstallments,
  payInstallment
};