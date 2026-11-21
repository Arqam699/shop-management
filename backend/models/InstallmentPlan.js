const mongoose = require('mongoose');

const installmentPlanSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },

    planId: {
      type: String,
    },

    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
      unique: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    downPayment: {
      type: Number,
      required: true,
      min: 0,
    },

    remainingBalance: {
      type: Number,
      required: true,
      min: 0,
    },

    // Extra payments can reduce the plan balance without being assigned to
    // any individual installment. Keep the cumulative reduction separately
    // so later balance refreshes do not restore it from untouched schedules.
    balanceReduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Contract discount applied against the unpaid balance; not a received payment.
    balanceDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
      This is the number of actual remaining scheduled
      installments shown to the user.

      Example:
      selected duration = 12
      treatDownPaymentAsFirstInstallment = true
      => duration = 11
    */
    duration: {
      type: Number,
      required: true,
      min: 0,
    },

    selectedDuration: {
      type: Number,
      default: 0,
    },

    revisionNumber: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Keep prior contract terms and schedules for audit when the plan is revised.
    revisions: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    treatDownPaymentAsFirstInstallment: {
      type: Boolean,
      default: false,
    },

    initialPaymentType: {
      type: String,
      enum: ['None', 'DownPayment', 'FirstInstallment'],
      default: 'None',
    },

    initialInstallmentPaidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    initialPaymentCountsAsFirstInstallment: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ['Active', 'Completed', 'Overdue'],
      default: 'Active',
    },

    firstDueDate: {
      type: Date,
    },

    /*
      Immutable invoice snapshot.
      This is created at sale creation and is never changed
      by future payment operations.
    */
    invoiceSnapshot: {
      selectedDuration: {
        type: Number,
        default: 0,
      },

      duration: {
        type: Number,
        default: 0,
      },

      downPayment: {
        type: Number,
        default: 0,
      },

      treatDownPaymentAsFirstInstallment: {
        type: Boolean,
        default: false,
      },

      initialPaymentType: {
        type: String,
        enum: ['None', 'DownPayment', 'FirstInstallment'],
        default: 'None',
      },

      initialInstallmentPaidAmount: {
        type: Number,
        default: 0,
      },

      initialPaymentCountsAsFirstInstallment: {
        type: Boolean,
        default: false,
      },

      financedAmount: {
        type: Number,
        default: 0,
      },

      remainingInstallmentCount: {
        type: Number,
        default: null,
        min: 0,
      },

      remainingInstallmentCountFrozen: {
        type: Boolean,
        default: false,
      },

      installments: [
        {
          installmentNumber: Number,
          amount: Number,
          remainingAmount: Number,
          dueDate: Date,
        },
      ],

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true }
);

installmentPlanSchema.index({
  shopId: 1,
  planId: 1,
});

installmentPlanSchema.index({ shopId: 1, status: 1, createdAt: -1 });
installmentPlanSchema.index({ shopId: 1, createdAt: -1 });
installmentPlanSchema.index({ shopId: 1, customer: 1 });
installmentPlanSchema.index({ shopId: 1, sale: 1 });

module.exports = mongoose.model(
  'InstallmentPlan',
  installmentPlanSchema
);
