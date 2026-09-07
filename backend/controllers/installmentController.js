
const InstallmentPlan = require('../models/InstallmentPlan');
const Installment = require('../models/Installment');
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');


// ======================================================
// GENERATE PAYMENT ID
// IMPORTANT:
// Payment IDs are generated separately for each shop.
//
// Shop A:
// 01
// 02
// 03
//
// Shop B:
// 01
// 02
// 03
// ======================================================
const generatePaymentID = async (shopId) => {
  try {

    const payments =
      await Payment.find(
        {
          shopId,
        },
        'paymentId'
      );


    let maxNum = 0;


    payments.forEach((p) => {

      if (p.paymentId) {

        const num =
          parseInt(
            p.paymentId.replace(
              /[^0-9]/g,
              ''
            ),
            10
          );


        if (
          !isNaN(num) &&
          num > maxNum
        ) {
          maxNum = num;
        }

      }

    });


    return String(
      maxNum + 1
    ).padStart(2, '0');


  } catch (err) {

    return '01';

  }
};


// ======================================================
// UPDATE OVERDUE STATUS
// ======================================================
const updateOverdueStatus = async (
  planId,
  shopId
) => {
  try {

    const today =
      new Date();


    // --------------------------------------------------
    // Update overdue installments
    // Only current shop
    // --------------------------------------------------
    await Installment.updateMany(
      {
        installmentPlan: planId,
        shopId: shopId,
        dueDate: {
          $lt: today
        },
        status: {
          $in: [
            'Pending',
            'Partially Paid'
          ]
        }
      },
      {
        $set: {
          status: 'Overdue'
        }
      }
    );


    // --------------------------------------------------
    // Check if overdue installment exists
    // Only current shop
    // --------------------------------------------------
    const overdueExists =
      await Installment.findOne({
        installmentPlan: planId,
        shopId: shopId,
        status: 'Overdue'
      });


    if (overdueExists) {

      // ------------------------------------------------
      // Update parent plan
      // Only current shop
      // ------------------------------------------------
      await InstallmentPlan.findOneAndUpdate(
        {
          _id: planId,
          shopId: shopId
        },
        {
          status: 'Overdue'
        }
      );

    }

  } catch (error) {

    console.error(
      'Failed to update overdue dates:',
      error
    );

  }
};


// ======================================================
// GET ALL INSTALLMENT PLANS
// @desc    Get all installment plans
//          With sale populated for invoice number
// @route   GET /api/installments
// @access  Private
// ======================================================
const getInstallmentPlans = async (
  req,
  res
) => {
  try {

    // --------------------------------------------------
    // Only current shop's installment plans
    // --------------------------------------------------
    const plans =
      await InstallmentPlan.find({
        shopId: req.shopId
      })
        .populate(
          'customer',
          'fullName mobileNumber customerId'
        )
        .populate(
          'product',
          'name brand model sku'
        )
        .populate(
          'sale',
          'saleId finalTotal'
        )
        .sort({
          createdAt: 1
        });


    // --------------------------------------------------
    // Update overdue status
    // Only current shop
    // --------------------------------------------------
    for (const plan of plans) {

      await updateOverdueStatus(
        plan._id,
        req.shopId
      );

    }


    return res.status(200).json({
      success: true,
      data: plans
    });


  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


// ======================================================
// GET DUE INSTALLMENTS
// OVERDUE + DUE TODAY
// @route   GET /api/installments/due
// @access  Private
// ======================================================
const getDueInstallments = async (
  req,
  res
) => {
  try {

    // --------------------------------------------------
    // Current date boundaries
    // --------------------------------------------------
    const now =
      new Date();


    const startOfToday =
      new Date(now);


    startOfToday.setHours(
      0,
      0,
      0,
      0
    );


    const startOfTomorrow =
      new Date(
        startOfToday
      );


    startOfTomorrow.setDate(
      startOfTomorrow.getDate() + 1
    );


    // --------------------------------------------------
    // Find all unpaid installments
    // Only current shop
    // --------------------------------------------------
    const installments =
      await Installment.find({

        shopId: req.shopId,

        status: {
          $ne: 'Paid'
        }

      })
        .populate({

          path: 'installmentPlan',

          match: {
            shopId: req.shopId
          },

          populate: [

            {
              path: 'customer',
              select:
                'fullName mobileNumber customerId'
            },

            {
              path: 'product',
              select:
                'name brand model sku purchasePrice sellingPrice'
            },

            {
              path: 'sale',
              select:
                'saleId finalTotal'
            }

          ]

        })
        .sort({
          dueDate: 1
        });


    // --------------------------------------------------
    // Separate Overdue and Due Today
    // --------------------------------------------------
    const overdue = [];
    const dueToday = [];


    installments.forEach(
      (installment) => {

        // ---------------------------------------------
        // If plan doesn't belong to this shop,
        // don't process it.
        // ---------------------------------------------
        if (
          !installment.installmentPlan
        ) {
          return;
        }


        if (
          !installment.dueDate
        ) {
          return;
        }


        const dueDate =
          new Date(
            installment.dueDate
          );


        // ---------------------------------------------
        // OVERDUE
        // ---------------------------------------------
        if (
          dueDate <
          startOfToday
        ) {

          overdue.push({

            ...installment.toObject(),

            category:
              'Overdue',

            daysOverdue:
              Math.max(
                1,

                Math.floor(

                  (
                    startOfToday.getTime() -
                    new Date(
                      dueDate.getFullYear(),
                      dueDate.getMonth(),
                      dueDate.getDate()
                    ).getTime()
                  ) /
                  (
                    1000 *
                    60 *
                    60 *
                    24
                  )

                )

              )

          });


          return;
        }


        // ---------------------------------------------
        // DUE TODAY
        // ---------------------------------------------
        if (
          dueDate >=
            startOfToday &&
          dueDate <
            startOfTomorrow
        ) {

          dueToday.push({

            ...installment.toObject(),

            category:
              'Due Today',

            daysOverdue:
              0

          });

        }

      }
    );


    // --------------------------------------------------
    // Return result
    // --------------------------------------------------
    return res.status(200).json({

      success: true,

      data: {

        overdue,

        dueToday,

        totalOverdue:
          overdue.length,

        totalDueToday:
          dueToday.length,

        totalDue:
          overdue.length +
          dueToday.length

      }

    });


  } catch (error) {

    console.error(
      'Failed to retrieve due installments:',
      error
    );


    return res.status(500).json({

      success: false,

      message:
        'Failed to retrieve due installments',

      error:
        error.message

    });

  }
};


// ======================================================
// GET SINGLE INSTALLMENT PLAN
// @route   GET /api/installments/:id
// @access  Private
// ======================================================
const getInstallmentPlanById = async (
  req,
  res
) => {
  try {

    const planId =
      req.params.id;


    // --------------------------------------------------
    // First verify that this plan belongs
    // to logged-in shop
    // --------------------------------------------------
    const plan =
      await InstallmentPlan.findOne({

        _id: planId,

        shopId: req.shopId

      })
        .populate('customer')
        .populate('product')
        .populate('sale');


    if (!plan) {

      return res.status(404).json({

        success: false,

        message:
          'Installment Plan not found'

      });

    }


    // --------------------------------------------------
    // Update overdue status
    // Only current shop
    // --------------------------------------------------
    await updateOverdueStatus(
      planId,
      req.shopId
    );


    // --------------------------------------------------
    // Re-fetch plan after overdue update
    // --------------------------------------------------
    const updatedPlan =
      await InstallmentPlan.findOne({

        _id: planId,

        shopId: req.shopId

      })
        .populate('customer')
        .populate('product')
        .populate('sale');


    // --------------------------------------------------
    // Get installments
    // Only current shop
    // --------------------------------------------------
    const installments =
      await Installment.find({

        installmentPlan: planId,

        shopId: req.shopId

      })
        .sort({
          installmentNumber: 1
        });


    return res.status(200).json({

      success: true,

      data: {

        plan:
          updatedPlan,

        installments

      }

    });


  } catch (error) {

    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }
};


// ======================================================
// PAY INSTALLMENT
// @route   POST /api/installments/:id/pay
// @access  Private
// ======================================================
const payInstallment = async (
  req,
  res
) => {
  try {

    const installmentId =
      req.params.id;


    const paymentAmount =
      Number(
        req.body.amount
      );


    const paymentMethod =
      req.body.paymentMethod ||
      'Cash';


    if (
      isNaN(paymentAmount) ||
      paymentAmount <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          'Please enter a valid payment amount.'

      });

    }


    // --------------------------------------------------
    // Find installment ONLY inside current shop
    // --------------------------------------------------
    const installment =
      await Installment.findOne({

        _id: installmentId,

        shopId: req.shopId

      });


    if (!installment) {

      return res.status(404).json({

        success: false,

        message:
          'Installment item not found'

      });

    }


    if (
      installment.status ===
      'Paid'
    ) {

      return res.status(400).json({

        success: false,

        message:
          'This installment is already fully paid.'

      });

    }


    if (
      paymentAmount >
      installment.remainingAmount
    ) {

      return res.status(400).json({

        success: false,

        message:
          `Payment amount cannot exceed remaining dues (${installment.remainingAmount}).`

      });

    }


    const originalRemaining =
      installment.remainingAmount;


    const isPartial =
      paymentAmount <
      installment.remainingAmount;


    const carryForwardAmount =
      installment.remainingAmount -
      paymentAmount;


    if (
      !installment.originalAmount ||
      installment.originalAmount === 0
    ) {

      installment.originalAmount =
        installment.amount;

    }


    // --------------------------------------------------
    // Find parent plan ONLY inside current shop
    // --------------------------------------------------
    const plan =
      await InstallmentPlan.findOne({

        _id:
          installment.installmentPlan,

        shopId:
          req.shopId

      });


    if (!plan) {

      return res.status(404).json({

        success: false,

        message:
          'Parent installment plan not found.'

      });

    }


    // --------------------------------------------------
    // Future unpaid installments
    // Only current shop
    // --------------------------------------------------
    const futureUnpaidInstallments =
      await Installment.find({

        installmentPlan:
          plan._id,

        shopId:
          req.shopId,

        _id: {
          $ne:
            installment._id
        },

        status: {
          $ne:
            'Paid'
        }

      })
        .sort({
          installmentNumber: 1
        });


    // --------------------------------------------------
    // Partial payment with no future installments
    // --------------------------------------------------
    if (
      isPartial &&
      futureUnpaidInstallments.length === 0
    ) {

      installment.paidAmount +=
        paymentAmount;


      installment.remainingAmount =
        installment.amount -
        installment.paidAmount;


      installment.status =
        'Partially Paid';


      await installment.save();


    } else {

      installment.amount =
        installment.amount -
        carryForwardAmount;


      installment.paidAmount =
        installment.amount;


      installment.remainingAmount =
        0;


      installment.status =
        'Paid';


      installment.paidDate =
        new Date();


      await installment.save();


      // ------------------------------------------------
      // Carry forward remaining amount
      // ------------------------------------------------
      if (
        isPartial &&
        futureUnpaidInstallments.length > 0
      ) {

        const distributeShare =
          Math.floor(

            carryForwardAmount /
            futureUnpaidInstallments.length

          );


        const roundingDiff =
          carryForwardAmount -
          (
            distributeShare *
            futureUnpaidInstallments.length
          );


        for (
          let i = 0;
          i <
          futureUnpaidInstallments.length;
          i++
        ) {

          const isLast =
            i ===
            futureUnpaidInstallments.length - 1;


          const instDoc =
            futureUnpaidInstallments[i];


          const additionalAmount =
            isLast
              ? (
                  distributeShare +
                  roundingDiff
                )
              : distributeShare;


          instDoc.amount +=
            additionalAmount;


          instDoc.remainingAmount +=
            additionalAmount;


          await instDoc.save();

        }

      }

    }


    // --------------------------------------------------
    // Update plan balance
    // --------------------------------------------------
    plan.remainingBalance =
      Math.max(

        0,

        plan.remainingBalance -
        paymentAmount

      );


    // --------------------------------------------------
    // Check unpaid installments
    // --------------------------------------------------
    const hasUnpaid =
      await Installment.findOne({

        installmentPlan:
          plan._id,

        shopId:
          req.shopId,

        status: {
          $ne:
            'Paid'
        }

      });


    if (!hasUnpaid) {

      plan.status =
        'Completed';

    } else {

      const hasOverdue =
        await Installment.findOne({

          installmentPlan:
            plan._id,

          shopId:
            req.shopId,

          status:
            'Overdue'

        });


      plan.status =
        hasOverdue
          ? 'Overdue'
          : 'Active';

    }


    await plan.save();


    // --------------------------------------------------
    // Update sale ONLY inside current shop
    // --------------------------------------------------
    await Sale.findOneAndUpdate(

      {
        _id:
          plan.sale,

        shopId:
          req.shopId
      },

      {
        remainingBalance:
          plan.remainingBalance
      }

    );


    // --------------------------------------------------
    // Generate payment ID
    // IMPORTANT:
    // Only current shop's payments are considered
    // --------------------------------------------------
    const paymentId =
      await generatePaymentID(
        req.shopId
      );


    // --------------------------------------------------
    // Create payment log
    // --------------------------------------------------
    const paymentLog =
      new Payment({

        // Never trust shopId from frontend
        shopId:
          req.shopId,

        paymentId,

        customer:
          plan.customer,

        sale:
          plan.sale,

        installmentPlan:
          plan._id,

        installment:
          installment._id,

        amount:
          paymentAmount,

        paymentMethod,

        originalInstallmentAmount:
          originalRemaining,

        carryForwardAmount:
          carryForwardAmount,

        notes:
          `Collected ${paymentAmount} (Original dues: ${originalRemaining} | Adjusted carry-forward: ${carryForwardAmount})`

      });


    await paymentLog.save();


    return res.status(200).json({

      success: true,

      message:
        'Payment recorded and schedules synchronized!'

    });


  } catch (error) {

    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }
};


// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  getInstallmentPlans,
  getInstallmentPlanById,
  payInstallment,
  getDueInstallments
};
