const mongoose = require('mongoose');


// ============================================================
// IMMUTABLE INSTALLMENT SNAPSHOT
// ============================================================

const saleInstallmentSnapshotSchema = new mongoose.Schema(
  {
    installmentNumber: {
      type: Number,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    dueDate: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);


// ============================================================
// SALE SCHEMA
// ============================================================

const saleSchema = new mongoose.Schema(
  {
    // --------------------------------------------------------
    // SAAS SHOP
    // --------------------------------------------------------

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },


    // --------------------------------------------------------
    // SALE / INVOICE ID
    // --------------------------------------------------------

    saleId: {
      type: String,
    },


    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },


    // --------------------------------------------------------
    // PRODUCT
    // --------------------------------------------------------

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },


    // --------------------------------------------------------
    // QUANTITY
    // --------------------------------------------------------

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },


    // --------------------------------------------------------
    // UNIT PRICE
    // --------------------------------------------------------

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },


    // --------------------------------------------------------
    // DISCOUNT
    // --------------------------------------------------------

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },


    // --------------------------------------------------------
    // SUBTOTAL
    // --------------------------------------------------------

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },


    // --------------------------------------------------------
    // FINAL SALE PRICE BEFORE MARKUP
    // --------------------------------------------------------

    finalTotal: {
      type: Number,
      required: true,
      min: 0,
    },


    // ========================================================
    // MANUAL INSTALLMENT MARKUP
    // ========================================================

    markupPercentage: {
      type: Number,
      default: 0,
      min: 0,
    },


    markupAmount: {
      type: Number,
      default: 0,
      min: 0,
    },


    totalWithMarkup: {
      type: Number,
      default: 0,
      min: 0,
    },


    // --------------------------------------------------------
    // PAYMENT TYPE
    // --------------------------------------------------------

    paymentType: {
      type: String,
      enum: ['Cash', 'Installment'],
      default: 'Cash',
      index: true,
    },


    // --------------------------------------------------------
    // DOWN PAYMENT
    // --------------------------------------------------------

    downPayment: {
      type: Number,
      default: 0,
      min: 0,
    },


    // --------------------------------------------------------
    // CURRENT REMAINING BALANCE
    // --------------------------------------------------------

    remainingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },


    // ========================================================
    // INSTALLMENT SETTINGS
    // ========================================================

    installmentDuration: {
      type: Number,
      default: 0,
      min: 0,
    },


    selectedInstallmentDuration: {
      type: Number,
      default: 0,
      min: 0,
    },


    treatDownPaymentAsFirstInstallment: {
      type: Boolean,
      default: false,
    },


    // ========================================================
    // IMMUTABLE INVOICE SCHEDULE
    // ========================================================

    installmentScheduleSnapshot: {
      type: [saleInstallmentSnapshotSchema],
      default: [],
    },


    // --------------------------------------------------------
    // SALE DATE
    // --------------------------------------------------------

    saleDate: {
      type: Date,
      default: Date.now,
    },
  },

  {
    timestamps: true,
  }
);


// ============================================================
// INDEXES
// ============================================================

saleSchema.index(
  {
    shopId: 1,
    saleId: 1,
  },
  {
    unique: true,
  }
);

saleSchema.index({ shopId: 1, saleDate: -1 });
saleSchema.index({ shopId: 1, paymentType: 1, createdAt: -1 });


// ============================================================
// CASH / INSTALLMENT NORMALIZATION
// ============================================================
//
// This is an additional DB-level safety layer.
//
// Controller already validates this, but this makes sure
// accidental/manual database writes do not leave a Cash sale
// containing installment information.
//
// ============================================================

saleSchema.pre('validate', function () {
  if (this.paymentType === 'Cash') {
    this.markupPercentage = 0;
    this.markupAmount = 0;
    this.totalWithMarkup = this.finalTotal;

    this.downPayment = this.finalTotal;
    this.remainingBalance = 0;

    this.installmentDuration = 0;
    this.selectedInstallmentDuration = 0;

    this.treatDownPaymentAsFirstInstallment = false;

    this.installmentScheduleSnapshot = [];
  }

  if (this.paymentType === 'Installment') {
    if (
      !Number.isFinite(
        Number(this.markupPercentage)
      ) ||
      Number(this.markupPercentage) < 0
    ) {
      this.invalidate(
        'markupPercentage',
        'Invalid installment markup percentage.'
      );
    }

    if (
      !Number.isFinite(
        Number(this.downPayment)
      ) ||
      Number(this.downPayment) < 0
    ) {
      this.invalidate(
        'downPayment',
        'Invalid installment down payment.'
      );
    }

    if (
      Number(this.downPayment) >
      Number(this.finalTotal)
    ) {
      this.invalidate(
        'downPayment',
        'Down payment cannot be greater than final sale total.'
      );
    }
  }
});


// ============================================================
// EXPORT
// ============================================================

module.exports =
  mongoose.model(
    'Sale',
    saleSchema
  );
