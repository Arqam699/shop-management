const Customer = require('../models/Customer');

// Simple Customer ID Generator ('01', '02', '03' ... '10', '11'...)
const generateCustomerID = async () => {
  try {
    const customers = await Customer.find({}, 'customerId');
    let maxNum = 0;
    customers.forEach(c => {
      if (c.customerId) {
        const num = parseInt(c.customerId.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return String(maxNum + 1).padStart(2, '0'); // e.g. 01, 02, 03...
  } catch (err) {
    return '01';
  }
};

const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { cnic: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: 1 }); // Line-wise
    return res.status(200).json({ success: true, data: customers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customers list', error: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer record not found' });
    }

    const Sale = require('../models/Sale');
    const InstallmentPlan = require('../models/InstallmentPlan');
    const Installment = require('../models/Installment');

    const sales = await Sale.find({ customer: customer._id }).populate('product').sort({ createdAt: 1 });
    const plans = await InstallmentPlan.find({ customer: customer._id }).populate('product').sort({ createdAt: 1 });

    const totalPurchased = sales.reduce((sum, s) => sum + s.finalTotal, 0);
    const outstandingBalance = plans.reduce((sum, p) => sum + p.remainingBalance, 0);
    const hasOverdue = plans.some(p => p.status === 'Overdue');

    const plansWithCount = [];
    for (const plan of plans) {
      const totalInstallmentsCount = await Installment.countDocuments({ installmentPlan: plan._id });
      const unpaidCount = await Installment.countDocuments({ installmentPlan: plan._id, status: { $ne: 'Paid' } });
      
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
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { cnic } = req.body;

    const existingCnic = await Customer.findOne({ cnic });
    if (existingCnic) {
      return res.status(400).json({ success: false, message: 'A customer with this CNIC number is already registered' });
    }

    const customerId = await generateCustomerID(); // Starts from 01
    const customer = new Customer({ ...req.body, customerId });
    await customer.save();

    return res.status(201).json({ success: true, message: 'Customer registered successfully', data: customer });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Registration failed' });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (req.body.cnic && req.body.cnic !== customer.cnic) {
      const duplicateCnic = await Customer.findOne({ cnic: req.body.cnic });
      if (duplicateCnic) {
        return res.status(400).json({ success: false, message: 'This CNIC is already assigned to another customer' });
      }
    }

    Object.assign(customer, req.body);
    await customer.save();

    return res.status(200).json({ success: true, message: 'Profile details updated', data: customer });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
  }
};
const deleteCustomer = async (req, res) => {
  try {
    // Check Deletion Mode
    const Settings = require('../models/Settings');

    const settings = await Settings.findOne();

    if (!settings || !settings.allowGlobalDeletion) {
      return res.status(403).json({
        success: false,
        message: 'Deletion Mode is disabled. Enable it from Settings first.',
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
        message: 'Deletion Mode has expired. Enable it again from Settings.',
      });
    }

    // Delete customer
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer record deleted from system',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Deletion failed',
      error: error.message,
    });
  }
};


module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };