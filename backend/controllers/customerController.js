
const Customer = require('../models/Customer');

// Simple Customer ID Generator ('01', '02', '03' ... '10', '11'...)
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


const getCustomers = async (req, res) => {
  try {

    const { search } = req.query;

    // Only get customers belonging to logged-in shop
    let query = {
      shopId: req.shopId
    };

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
      .sort({ createdAt: 1 });

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


const getCustomerById = async (req, res) => {
  try {

    // Customer must belong to logged-in shop
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


    // Only get sales belonging to current shop
    const sales = await Sale.find({
      customer: customer._id,
      shopId: req.shopId
    })
      .populate('product')
      .sort({ createdAt: 1 });


    // Only get installment plans belonging to current shop
    const plans = await InstallmentPlan.find({
      customer: customer._id,
      shopId: req.shopId
    })
      .populate('product')
      .sort({ createdAt: 1 });


    const totalPurchased = sales.reduce(
      (sum, s) => sum + s.finalTotal,
      0
    );


    const outstandingBalance = plans.reduce(
      (sum, p) => sum + p.remainingBalance,
      0
    );


    const hasOverdue = plans.some(
      p => p.status === 'Overdue'
    );


    const plansWithCount = [];


    for (const plan of plans) {

      // Only count installments belonging to current shop
      const totalInstallmentsCount =
        await Installment.countDocuments({
          installmentPlan: plan._id,
          shopId: req.shopId
        });


      const unpaidCount =
        await Installment.countDocuments({
          installmentPlan: plan._id,
          shopId: req.shopId,
          status: { $ne: 'Paid' }
        });


      plansWithCount.push({
        ...plan.toObject(),
        totalInstallmentsCount,
        unpaidCount
      });

    }


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


const createCustomer = async (req, res) => {
  try {

    const { cnic } = req.body;


    // CNIC check is limited to current shop
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


    // Generate customer ID separately for each shop
    const customerId =
      await generateCustomerID(req.shopId);


    const customer = new Customer({

      ...req.body,

      // Never trust shopId from frontend
      // Always use authenticated shop
      shopId: req.shopId,

      customerId

    });


    await customer.save();


    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: customer
    });

  } catch (error) {

    return res.status(400).json({
      success: false,
      message:
        error.message || 'Registration failed'
    });

  }
};


const updateCustomer = async (req, res) => {
  try {

    // Only update customer belonging to current shop
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


    if (
      req.body.cnic &&
      req.body.cnic !== customer.cnic
    ) {

      const duplicateCnic =
        await Customer.findOne({
          cnic: req.body.cnic,
          shopId: req.shopId,
          _id: { $ne: customer._id }
        });


      if (duplicateCnic) {
        return res.status(400).json({
          success: false,
          message:
            'This CNIC is already assigned to another customer'
        });
      }

    }


    Object.assign(customer, req.body);


    // Prevent frontend from changing shop ownership
    customer.shopId = req.shopId;


    await customer.save();


    return res.status(200).json({
      success: true,
      message: 'Profile details updated',
      data: customer
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });

  }
};


const deleteCustomer = async (req, res) => {
  try {

    const Settings = require('../models/Settings');


    // IMPORTANT:
    // Settings must belong to current shop
    const settings = await Settings.findOne({
      shopId: req.shopId
    });


    if (
      !settings ||
      !settings.allowGlobalDeletion
    ) {

      return res.status(403).json({
        success: false,
        message:
          'Deletion Mode is disabled. Enable it from Settings first.',
      });

    }


    // Check if Deletion Mode has expired
    if (
      settings.deletionModeExpiresAt &&
      new Date() > settings.deletionModeExpiresAt
    ) {

      settings.allowGlobalDeletion = false;
      settings.deletionModeExpiresAt = null;

      await settings.save();


      return res.status(403).json({
        success: false,
        message:
          'Deletion Mode has expired. Enable it again from Settings.',
      });

    }


    // Only delete customer belonging to current shop
    const customer =
      await Customer.findOneAndDelete({
        _id: req.params.id,
        shopId: req.shopId
      });


    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }


    return res.status(200).json({
      success: true,
      message:
        'Customer record deleted from system',
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Deletion failed',
      error: error.message,
    });

  }
};


module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
