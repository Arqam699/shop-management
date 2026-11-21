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

    remainingAmount: {
      type: Number,
      min: 0,
    },

    dueDate: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const cashSalePaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: { type: String, trim: true, default: 'Cash' },
  },
  { _id: true }
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

    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      index: true,
    },


    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: function () { return this.paymentType === 'Installment'; },
    },


    // --------------------------------------------------------
    // PRODUCT
    // --------------------------------------------------------

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    items: [{
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true, min: 0 },
      discount: { type: Number, min: 0, default: 0 },
      purchasePriceAtSale: { type: Number, min: 0, default: 0 },
    }],


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

    // Cost basis captured at checkout so future product cost edits do not
    // rewrite historical sale profit.
    purchasePriceAtSale: {
      type: Number,
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

    paymentStatus: {
      type: String,
      enum: ['Paid', 'Unpaid'],
      default: 'Paid',
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

    // Cash received so far for a cash sale. Partial collections stay on the
    // original sale and invoice until the remaining balance is paid.
    cashPayments: {
      type: [cashSalePaymentSchema],
      default: [],
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
saleSchema.index({ shopId: 1, createdAt: -1 });
saleSchema.index({ shopId: 1, customer: 1, createdAt: -1 });


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

    const cashTotal = Math.max(0, Number(this.finalTotal || 0));
    let receivedAmount = Math.max(0, Number(this.downPayment || 0));

    // Keep existing historical Paid sales paid when they are next saved.
    if (receivedAmount === 0 && this.paymentStatus === 'Paid' && cashTotal > 0) {
      receivedAmount = cashTotal;
    }

    this.downPayment = Math.min(cashTotal, receivedAmount);
    this.remainingBalance = Math.max(0, cashTotal - this.downPayment);
    this.paymentStatus = this.remainingBalance <= 0 ? 'Paid' : 'Unpaid';

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
