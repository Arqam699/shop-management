
const Customer = require('../models/Customer');


// ==========================================
// CUSTOMER ID GENERATOR
// ==========================================

// Simple Customer ID Generator
// 01, 02, 03 ... 10, 11 ...
//
// Customer IDs are generated separately
// for each shop.
const generateCustomerID = async (shopId) => {
  try {

    const customers = await Customer.find(
      { shopId },
      'customerId'
    );

    let maxNum = 0;

    customers.forEach(c => {

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

    return '01';

  }
};


// ==========================================
// GET ALL CUSTOMERS
// ==========================================

const getCustomers = async (req, res) => {
  try {

    const { search } = req.query;


    // Only customers belonging to
    // currently logged-in shop.
    let query = {
      shopId: req.shopId
    };


    // ======================================
    // SEARCH CUSTOMERS
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


    const customers = await Customer
      .find(query)
      .sort({ createdAt: 1 })
      .lean();


    return res.status(200).json({
      success: true,
      data: customers
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customers list',
      error: error.message
    });

  }
};


// ==========================================
// GET CUSTOMER BY ID
// ==========================================

const getCustomerById = async (req, res) => {
  try {

    // Customer must belong to
    // currently logged-in shop.
    const customer = await Customer.findOne({
      _id: req.params.id,
      shopId: req.shopId
    });


    if (!customer) {

      return res.status(404).json({
        success: false,
        message: 'Customer record not found'
      });

    }


    const Sale = require('../models/Sale');
    const InstallmentPlan = require('../models/InstallmentPlan');
    const Installment = require('../models/Installment');


    // ======================================
    // SALES
    // ======================================

    const [sales, plans] = await Promise.all([
      Sale.find({ customer: customer._id, shopId: req.shopId })
        .populate('product')
        .sort({ createdAt: 1 })
        .lean(),
      InstallmentPlan.find({ customer: customer._id, shopId: req.shopId })
        .populate('product')
        .sort({ createdAt: 1 })
        .lean(),
    ]);


    // ======================================
    // TOTAL PURCHASED
    // ======================================

    const totalPurchased = sales.reduce(
      (sum, s) => sum + s.finalTotal,
      0
    );


    // ======================================
    // OUTSTANDING BALANCE
    // ======================================

    const outstandingBalance = plans.reduce(
      (sum, p) => sum + p.remainingBalance,
      0
    );


    // ======================================
    // OVERDUE CHECK
    // ======================================

    const hasOverdue = plans.some(
      p => p.status === 'Overdue'
    );


    // ======================================
    // INSTALLMENT COUNTS
    // ======================================

    const planIds = plans.map((plan) => plan._id);
    const installmentCounts = planIds.length === 0
      ? []
      : await Installment.aggregate([
        {
          $match: {
            shopId: req.shopId,
            installmentPlan: { $in: planIds },
          },
        },
        {
          $group: {
            _id: '$installmentPlan',
            totalInstallmentsCount: { $sum: 1 },
            unpaidCount: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['Paid', 'Settled']] },
                  0,
                  1,
                ],
              },
            },
          },
        },
      ]);

    const countByPlan = new Map(
      installmentCounts.map((item) => [
        item._id.toString(),
        item,
      ])
    );

    const plansWithCount = plans.map((plan) => {
      const counts = countByPlan.get(plan._id.toString());

      return {
        ...plan,
        totalInstallmentsCount: counts?.totalInstallmentsCount || 0,
        unpaidCount: counts?.unpaidCount || 0,
      };
    });


    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({

      success: true,

      data: {
        ...customer.toObject(),

        sales,

        installmentPlans: plansWithCount,

        totalPurchased,

        outstandingBalance,

        hasOverdue
      }

    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


// ==========================================
// GET FINGERPRINT TEMPLATES
// ==========================================
//
// Returns only fingerprint templates.
//
// 1. Customer
// 2. Guarantor 1
// 3. Guarantor 2
//
// Used for fingerprint matching.
//
// ==========================================

const getFingerprintTemplates = async (req, res) => {
  try {

    const customers = await Customer.find(
      {
        shopId: req.shopId,

        $or: [

          // Customer fingerprint
          {
            fingerprintFmd: {
              $exists: true,
              $nin: [null, '']
            }
          },

          // Guarantor 1 fingerprint
          {
            'guarantor1.fingerprintFmd': {
              $exists: true,
              $nin: [null, '']
            }
          },

          // Guarantor 2 fingerprint
          {
            'guarantor2.fingerprintFmd': {
              $exists: true,
              $nin: [null, '']
            }
          }

        ]
      },

      // Only fetch required fields
      {
        _id: 1,

        fingerprintFmd: 1,

        'guarantor1.fingerprintFmd': 1,

        'guarantor2.fingerprintFmd': 1
      }
    );


    // ======================================
    // CREATE FLAT TEMPLATE ARRAY
    // ======================================

    const templates = [];


    customers.forEach(customer => {

      // ====================================
      // CUSTOMER FINGERPRINT
      // ====================================

      if (customer.fingerprintFmd) {

        templates.push({
          id: customer._id.toString(),
          type: 'customer',
          fmd: customer.fingerprintFmd
        });

      }


      // ====================================
      // GUARANTOR 1 FINGERPRINT
      // ====================================

      if (
        customer.guarantor1 &&
        customer.guarantor1.fingerprintFmd
      ) {

        templates.push({
          id: customer._id.toString(),
          type: 'guarantor1',
          fmd: customer.guarantor1.fingerprintFmd
        });

      }


      // ====================================
      // GUARANTOR 2 FINGERPRINT
      // ====================================

      if (
        customer.guarantor2 &&
        customer.guarantor2.fingerprintFmd
      ) {

        templates.push({
          id: customer._id.toString(),
          type: 'guarantor2',
          fmd: customer.guarantor2.fingerprintFmd
        });

      }

    });


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

      error: error.message

    });

  }
};


// ==========================================
// CREATE CUSTOMER
// ==========================================

const createCustomer = async (req, res) => {
  try {

    const { cnic } = req.body;


    // ======================================
    // CHECK DUPLICATE CNIC
    // ======================================

    // CNIC check is limited to current shop.
    const existingCnic = await Customer.findOne({
      cnic,
      shopId: req.shopId
    });


    if (existingCnic) {

      return res.status(400).json({
        success: false,

        message:
          'A customer with this CNIC number is already registered'
      });

    }


    // ======================================
    // GENERATE CUSTOMER ID
    // ======================================

    const customerId =
      await generateCustomerID(req.shopId);


    // ======================================
    // CREATE CUSTOMER
    // ======================================

    const customer = new Customer({

      // All frontend fields are accepted
      // according to Customer schema.
      //
      // This includes:
      //
      // fingerprintFmd
      // fingerprintImage
      // fingerprintCapturedAt
      //
      // liveImage
      // liveImageCapturedAt
      //
      // guarantor1
      // guarantor2

      ...req.body,


      // NEVER trust shopId coming
      // from frontend.
      shopId: req.shopId,


      // Generated by backend.
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

      data: customer

    });

  } catch (error) {

    console.error(
      'Create customer error:',
      error
    );

    return res.status(400).json({

      success: false,

      message:
        error.message || 'Registration failed'

    });

  }
};


// ==========================================
// UPDATE CUSTOMER
// ==========================================

const updateCustomer = async (req, res) => {
  try {

    // ======================================
    // FIND CUSTOMER
    // ======================================

    // Only update customer belonging
    // to current shop.
    const customer = await Customer.findOne({
      _id: req.params.id,
      shopId: req.shopId
    });


    if (!customer) {

      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });

    }


    // ======================================
    // DUPLICATE CNIC CHECK
    // ======================================

    if (
      req.body.cnic &&
      req.body.cnic !== customer.cnic
    ) {

      const duplicateCnic =
        await Customer.findOne({

          cnic: req.body.cnic,

          shopId: req.shopId,

          _id: {
            $ne: customer._id
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
    // UPDATE CUSTOMER
    // ======================================

    // This also updates:
    //
    // liveImage
    // liveImageCapturedAt
    //
    // fingerprintFmd
    // fingerprintImage
    // fingerprintCapturedAt
    //
    // guarantor1
    // guarantor2
    //
    // because these fields exist
    // in the Customer schema.

    Object.assign(
      customer,
      req.body
    );


    // ======================================
    // PREVENT SHOP OWNERSHIP CHANGE
    // ======================================

    customer.shopId = req.shopId;


    await customer.save();


    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({

      success: true,

      message:
        'Profile details updated',

      data: customer

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

      error: error.message

    });

  }
};


// ==========================================
// DELETE CUSTOMER
// ==========================================

const deleteCustomer = async (req, res) => {
  try {

    const Settings =
      require('../models/Settings');


    // ======================================
    // GET SETTINGS
    // ======================================

    // Settings must belong to current shop.
    const settings = await Settings.findOne({
      shopId: req.shopId
    });


    // ======================================
    // CHECK DELETION MODE
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
    // CHECK EXPIRATION
    // ======================================

    if (
      settings.deletionModeExpiresAt &&
      new Date() >
      settings.deletionModeExpiresAt
    ) {

      settings.allowGlobalDeletion = false;

      settings.deletionModeExpiresAt = null;


      await settings.save();


      return res.status(403).json({

        success: false,

        message:
          'Deletion Mode has expired. Enable it again from Settings.'

      });

    }


    // ======================================
    // DELETE CUSTOMER
    // ======================================

    // Only delete customer belonging
    // to current shop.
    const customer =
      await Customer.findOneAndDelete({

        _id: req.params.id,

        shopId: req.shopId

      });


    if (!customer) {

      return res.status(404).json({

        success: false,

        message: 'Customer not found'

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

      message: 'Deletion failed',

      error: error.message

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
