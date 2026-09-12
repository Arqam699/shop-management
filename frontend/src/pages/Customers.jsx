import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCnicSearchInput, matchesCnicSearch, matchesMobileSearch } from '../utils/cnicSearch';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  UserCheck,
  Lock,
  Calendar,
  Fingerprint,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  User,
  Users,
  CreditCard,
  ShoppingBag,
  Wallet,
  AlertCircle,
  Clock,
  RotateCcw,
  FileText,
  Package,
  ChevronDown,
  UserPlus,
  List,
  Contact,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

const FINGERPRINT_AGENT_URL = 'http://127.0.0.1:9000';

const Customers = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // =====================================================
  // CUSTOMER SECTION
  // =====================================================

  const [activeSection, setActiveSection] = useState('list');
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSelectorSearch, setCustomerSelectorSearch] = useState('');

  // =====================================================
  // FINGERPRINT SEARCH
  // =====================================================

  const [fingerprintSearching, setFingerprintSearching] = useState(false);
  const [fingerprintMessage, setFingerprintMessage] = useState('');
  const [fingerprintResult, setFingerprintResult] = useState(null);

  // =====================================================
  // COMPLETE PROFILE / LEDGER MODAL
  // =====================================================

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [profileError, setProfileError] = useState('');

  // =====================================================
  // DELETE
  // =====================================================

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    customerId: null,
    customerName: '',
  });

  // =====================================================
  // SETTINGS
  // =====================================================

  const { settings } = useSettings();

  const isDeletionUnlocked =
    settings?.allowGlobalDeletion === true;

  // =====================================================
  // DATE FILTERS
  // =====================================================

  const [filterPreset, setFilterPreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // =====================================================
  // SECTION CONFIG
  // =====================================================

  const sectionOptions = [
    {
      id: 'register',
      label: 'Customer Register',
      description: 'Register a new customer',
      icon: UserPlus,
    },
    {
      id: 'list',
      label: 'Customer List',
      description: 'View and manage all customers',
      icon: List,
    },
    {
      id: 'details',
      label: 'Customer Details',
      description: 'View one customer personal details',
      icon: Contact,
    },
    {
      id: 'ledger',
      label: 'Complete Customer Ledger',
      description: 'View complete financial history',
      icon: BookOpen,
    },
  ];

  const activeSectionInfo =
    sectionOptions.find((item) => item.id === activeSection) ||
    sectionOptions[1];

  // =====================================================
  // FETCH CUSTOMERS
  // =====================================================

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const response = await api.get('/customers');

      if (
        response.data?.success &&
        Array.isArray(response.data.data)
      ) {
        setCustomers(response.data.data);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error loading customer index:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // =====================================================
  // SECTION CHANGE
  // =====================================================

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setSectionDropdownOpen(false);

    if (section === 'register') {
      navigate('/customers/add');
      return;
    }

    if (section === 'list') {
      setSelectedCustomerId('');
    }
  };

  // =====================================================
  // CUSTOMER SELECTOR
  // =====================================================

  const selectorCustomers = useMemo(() => {
    const term = customerSelectorSearch.trim().toLowerCase();

    if (!term) {
      return customers;
    }

    return customers.filter((customer) => {
      const name = String(customer?.fullName || '').toLowerCase();
      const id = String(customer?.customerId || '').toLowerCase();
      const phone = String(customer?.mobileNumber || '').toLowerCase();
      const cnic = customer?.cnic || customer?.CNIC || '';

      return (
        name.includes(term) ||
        id.includes(term) ||
        phone.includes(term) ||
        matchesMobileSearch(phone, term) ||
        matchesCnicSearch(cnic, term)
      );
    });
  }, [customers, customerSelectorSearch]);

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (customer) =>
          String(customer._id) === String(selectedCustomerId)
      ),
    [customers, selectedCustomerId]
  );

  // =====================================================
  // CUSTOMER DETAILS
  // =====================================================

  const openCustomerDetails = () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer first.');
      return;
    }

    navigate(`/customers/${selectedCustomerId}`);
  };

  // =====================================================
  // LOAD COMPLETE CUSTOMER PROFILE
  // =====================================================

  const loadCompleteCustomerProfile = async (customerId) => {
    try {
      setProfileLoading(true);
      setProfileError('');
      setCustomerProfile(null);
      setProfileModalOpen(true);

      // ---------------------------------------------------
      // CUSTOMER
      // ---------------------------------------------------

      const customerResponse =
        await api.get(`/customers/${customerId}`);

      if (!customerResponse.data?.success) {
        throw new Error(
          customerResponse.data?.message ||
            'Failed to load customer profile.'
        );
      }

      const customerData = customerResponse.data.data;

      // ---------------------------------------------------
      // PAYMENTS
      // ---------------------------------------------------

      let allPayments = [];

      try {
        const paymentsResponse = await api.get('/payments');

        if (
          paymentsResponse.data?.success &&
          Array.isArray(paymentsResponse.data.data)
        ) {
          allPayments = paymentsResponse.data.data;
        }
      } catch (error) {
        console.error('Failed to load payments:', error);
      }

      const customerPayments = allPayments.filter((payment) => {
        const paymentCustomer = payment.customer;

        const paymentCustomerId =
          typeof paymentCustomer === 'object'
            ? paymentCustomer?._id
            : paymentCustomer;

        return (
          String(paymentCustomerId) === String(customerId)
        );
      });

      // ---------------------------------------------------
      // RETURNS
      // ---------------------------------------------------

      let allReturns = [];

      try {
        const returnsResponse = await api.get('/returns');

        if (
          returnsResponse.data?.success &&
          Array.isArray(returnsResponse.data.data)
        ) {
          allReturns = returnsResponse.data.data;
        }
      } catch (error) {
        console.error('Failed to load returns:', error);
      }

      const customerReturns = allReturns.filter((returnItem) => {
        const returnCustomer = returnItem.customer;

        const returnCustomerId =
          typeof returnCustomer === 'object'
            ? returnCustomer?._id
            : returnCustomer;

        return (
          String(returnCustomerId) === String(customerId)
        );
      });

      // ---------------------------------------------------
      // INSTALLMENT PLANS
      // ---------------------------------------------------

      const plans = Array.isArray(
        customerData.installmentPlans
      )
        ? customerData.installmentPlans
        : [];

      const installmentScheduleResults =
        await Promise.all(
          plans.map(async (plan) => {
            try {
              if (!plan?._id) {
                return {
                  planId: null,
                  installments: [],
                };
              }

              const response = await api.get(
                `/installments/${plan._id}`
              );

              if (response.data?.success) {
                return {
                  planId: plan._id,
                  installments: Array.isArray(
                    response.data.data?.installments
                  )
                    ? response.data.data.installments
                    : [],
                };
              }

              return {
                planId: plan._id,
                installments: [],
              };
            } catch (error) {
              console.error(
                'Failed to load installment schedule:',
                error
              );

              return {
                planId: plan?._id,
                installments: [],
              };
            }
          })
        );

      const scheduleMap = {};

      installmentScheduleResults.forEach((item) => {
        if (item.planId) {
          scheduleMap[String(item.planId)] =
            item.installments;
        }
      });

      const plansWithSchedules = plans.map((plan) => ({
        ...plan,
        installments:
          scheduleMap[String(plan._id)] || [],
      }));

      // ---------------------------------------------------
      // FINANCIAL CALCULATIONS
      // ---------------------------------------------------

      const sales = Array.isArray(customerData.sales)
        ? customerData.sales
        : [];

      const totalSales = sales.reduce(
        (sum, sale) =>
          sum + Number(sale.finalTotal || 0),
        0
      );

      const totalDownPayments = sales.reduce(
        (sum, sale) =>
          sum + Number(sale.downPayment || 0),
        0
      );

      const totalPayments = customerPayments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

      const totalOutstanding = plansWithSchedules.reduce(
        (sum, plan) =>
          sum + Number(plan.remainingBalance || 0),
        0
      );

      const totalRefunded = customerReturns.reduce(
        (sum, returnItem) =>
          sum + Number(returnItem.refundAmount || 0),
        0
      );

      // ---------------------------------------------------
      // OVERDUE
      // ---------------------------------------------------

      const overdueInstallments =
        plansWithSchedules.flatMap((plan) =>
          (plan.installments || []).filter(
            (installment) =>
              String(
                installment.status || ''
              ).toLowerCase() === 'overdue'
          )
        );

      // ---------------------------------------------------
      // DUE TODAY
      // ---------------------------------------------------

      const dueTodayInstallments =
        plansWithSchedules.flatMap((plan) =>
          (plan.installments || []).filter(
            (installment) => {
              if (
                String(
                  installment.status || ''
                ).toLowerCase() === 'paid'
              ) {
                return false;
              }

              if (!installment.dueDate) {
                return false;
              }

              const dueDate = new Date(
                installment.dueDate
              );

              const today = new Date();

              return (
                dueDate.getFullYear() ===
                  today.getFullYear() &&
                dueDate.getMonth() ===
                  today.getMonth() &&
                dueDate.getDate() ===
                  today.getDate()
              );
            }
          )
        );

      // ---------------------------------------------------
      // FINAL PROFILE
      // ---------------------------------------------------

      setCustomerProfile({
        customer: customerData,
        sales,
        installmentPlans: plansWithSchedules,
        payments: customerPayments,
        returns: customerReturns,

        summary: {
          totalSales,
          totalDownPayments,
          totalPayments,
          totalOutstanding,
          totalRefunded,

          salesCount: sales.length,
          installmentPlansCount:
            plansWithSchedules.length,
          paymentsCount: customerPayments.length,
          returnsCount: customerReturns.length,
          overdueCount: overdueInstallments.length,
          dueTodayCount: dueTodayInstallments.length,
        },
      });
    } catch (error) {
      console.error(
        'Complete customer profile error:',
        error
      );

      setProfileError(
        error.response?.data?.message ||
          error.message ||
          'Failed to load complete customer history.'
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // =====================================================
  // VIEW PROFILE
  // =====================================================

  const handleViewProfile = async (customerId) => {
    await loadCompleteCustomerProfile(customerId);
  };

  // =====================================================
  // LEDGER SELECT
  // =====================================================

  const handleOpenLedger = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer first.');
      return;
    }

    await loadCompleteCustomerProfile(selectedCustomerId);
  };

  // =====================================================
  // CLOSE PROFILE
  // =====================================================

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setCustomerProfile(null);
    setProfileError('');
  };

  // =====================================================
  // FINGERPRINT AGENT HEALTH
  // =====================================================

  const checkFingerprintAgent = async () => {
    try {
      const response = await fetch(
        `${FINGERPRINT_AGENT_URL}/health`
      );

      if (!response.ok) {
        throw new Error(
          'Fingerprint agent is unavailable.'
        );
      }

      const data = await response.json();

      if (!data.success || !data.readerConnected) {
        throw new Error(
          'DigitalPersona fingerprint reader is not connected.'
        );
      }

      return true;
    } catch (error) {
      console.error(
        'Fingerprint agent health error:',
        error
      );

      throw new Error(
        'Fingerprint scanner agent is not running or DigitalPersona reader is not connected.'
      );
    }
  };

  // =====================================================
  // FINGERPRINT SEARCH
  // =====================================================

  const handleFingerprintSearch = async () => {
    if (fingerprintSearching) return;

    try {
      setFingerprintSearching(true);
      setFingerprintResult(null);

      setFingerprintMessage(
        'Checking fingerprint scanner...'
      );

      await checkFingerprintAgent();

      setFingerprintMessage(
        'Scanner ready. Place finger on DigitalPersona reader...'
      );

      const captureResponse = await fetch(
        `${FINGERPRINT_AGENT_URL}/fingerprint/capture`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            purpose: 'customer-search',
          }),
        }
      );

      let captureData;

      try {
        captureData = await captureResponse.json();
      } catch {
        throw new Error(
          'Fingerprint agent returned an invalid response.'
        );
      }

      if (
        !captureResponse.ok ||
        !captureData.success
      ) {
        throw new Error(
          captureData.message ||
            'Fingerprint capture failed.'
        );
      }

      if (!captureData.fmd) {
        throw new Error(
          'Fingerprint template was not returned by scanner.'
        );
      }

      const scannedFmd = captureData.fmd;

      setFingerprintMessage(
        'Fingerprint captured. Loading registered fingerprints...'
      );

      const templatesResponse = await api.post(
        '/customers/fingerprint/templates'
      );

      const templatesData =
        templatesResponse.data;

      if (!templatesData?.success) {
        throw new Error(
          templatesData?.message ||
            'Failed to load fingerprint templates.'
        );
      }

      const templates = Array.isArray(
        templatesData.templates
      )
        ? templatesData.templates
        : [];

      if (templates.length === 0) {
        throw new Error(
          'No registered fingerprints were found for this shop.'
        );
      }

      setFingerprintMessage(
        `Matching fingerprint against ${templates.length} registered fingerprint(s)...`
      );

      const identifyResponse = await fetch(
        `${FINGERPRINT_AGENT_URL}/fingerprint/identify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fmd: scannedFmd,
            templates,
          }),
        }
      );

      let identifyData;

      try {
        identifyData =
          await identifyResponse.json();
      } catch {
        throw new Error(
          'Fingerprint identification agent returned an invalid response.'
        );
      }

      if (!identifyResponse.ok) {
        throw new Error(
          identifyData.message ||
            'Fingerprint identification failed.'
        );
      }

      if (!identifyData.matched) {
        setFingerprintResult({
          matched: false,
        });

        setFingerprintMessage(
          'No customer or guarantor matched this fingerprint.'
        );

        return;
      }

      const matchedCustomerId =
        identifyData.id;

      const matchedPersonType =
        identifyData.type;

      if (!matchedCustomerId) {
        throw new Error(
          'Fingerprint matched but customer ID was not returned.'
        );
      }

      setFingerprintMessage(
        'Fingerprint matched. Loading customer details...'
      );

      const customerResponse = await api.get(
        `/customers/${matchedCustomerId}`
      );

      if (!customerResponse.data?.success) {
        throw new Error(
          customerResponse.data?.message ||
            'Matched customer profile was not found.'
        );
      }

      const fullCustomerData =
        customerResponse.data.data;

      if (!fullCustomerData) {
        throw new Error(
          'Matched customer profile was not returned by server.'
        );
      }

      const matchedCustomer = {
        _id: fullCustomerData._id,
        customerId: fullCustomerData.customerId,
        fullName: fullCustomerData.fullName,
        fatherName: fullCustomerData.fatherName,
        mobileNumber: fullCustomerData.mobileNumber,
        alternateMobileNumber:
          fullCustomerData.alternateMobileNumber,
        cnic: fullCustomerData.cnic,
        address: fullCustomerData.address,
        city: fullCustomerData.city,
        email: fullCustomerData.email,
        notes: fullCustomerData.notes,

        guarantor1:
          fullCustomerData.guarantor1
            ? {
                name:
                  fullCustomerData.guarantor1.name,
                mobileNumber:
                  fullCustomerData.guarantor1
                    .mobileNumber,
              }
            : null,

        guarantor2:
          fullCustomerData.guarantor2
            ? {
                name:
                  fullCustomerData.guarantor2.name,
                mobileNumber:
                  fullCustomerData.guarantor2
                    .mobileNumber,
              }
            : null,
      };

      setFingerprintResult({
        matched: true,
        customer: matchedCustomer,
        personType: matchedPersonType,
      });

      setSearchTerm(
        matchedCustomer.customerId ||
          matchedCustomer.fullName ||
          ''
      );

      setSelectedCustomerId(
        matchedCustomer._id
      );

      setActiveSection('list');

      setFingerprintMessage(
        'Fingerprint matched successfully. Customer details found.'
      );
    } catch (error) {
      console.error(
        'Fingerprint search error:',
        error
      );

      setFingerprintResult({
        matched: false,
        error:
          error.message ||
          'Fingerprint search failed.',
      });

      setFingerprintMessage(
        error.message ||
          'Fingerprint search failed.'
      );
    } finally {
      setFingerprintSearching(false);
    }
  };

  // =====================================================
  // CLEAR FINGERPRINT
  // =====================================================

  const clearFingerprintResult = () => {
    setFingerprintResult(null);
    setFingerprintMessage('');
    setSearchTerm('');
  };

  // =====================================================
  // DELETE
  // =====================================================

  const triggerDeleteConfirmation = (id, name) => {
    if (!isDeletionUnlocked) {
      toast.error(
        'Deletion Mode is disabled. Enable it from Settings first.'
      );
      return;
    }

    setDeleteModal({
      isOpen: true,
      customerId: id,
      customerName: name,
    });
  };

  const confirmDelete = async () => {
    const {
      customerId,
      customerName,
    } = deleteModal;

    try {
      const response = await api.delete(
        `/customers/${customerId}`
      );

      if (response.data?.success) {
        setCustomers((prev) =>
          prev.filter(
            (customer) =>
              customer._id !== customerId
          )
        );

        if (
          fingerprintResult?.customer?._id ===
          customerId
        ) {
          clearFingerprintResult();
        }

        if (
          String(selectedCustomerId) ===
          String(customerId)
        ) {
          setSelectedCustomerId('');
        }

        toast.success(
          `Customer ${customerName} profile deleted successfully.`
        );
      }
    } catch (error) {
      console.error(
        'Error deleting customer:',
        error
      );

      toast.error(
        error.response?.data?.message ||
          'Failed to delete customer profile.'
      );
    } finally {
      setDeleteModal({
        isOpen: false,
        customerId: null,
        customerName: '',
      });
    }
  };

  // =====================================================
  // DATE FILTER
  // =====================================================

  const isDateInFilter = (dateStr) => {
    if (filterPreset === 'all') {
      return true;
    }

    if (!dateStr) {
      return false;
    }

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dayBeforeYesterday =
      new Date(today);

    dayBeforeYesterday.setDate(
      today.getDate() - 2
    );

    if (filterPreset === 'today') {
      return date.getTime() === today.getTime();
    }

    if (filterPreset === 'yesterday') {
      return (
        date.getTime() ===
        yesterday.getTime()
      );
    }

    if (
      filterPreset ===
      'dayBeforeYesterday'
    ) {
      return (
        date.getTime() ===
        dayBeforeYesterday.getTime()
      );
    }

    if (filterPreset === 'week') {
      const startOfWeek =
        new Date(today);

      startOfWeek.setDate(
        today.getDate() - 7
      );

      return (
        date >= startOfWeek &&
        date <= today
      );
    }

    if (filterPreset === 'month') {
      const startOfMonth =
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );

      return (
        date >= startOfMonth &&
        date <= today
      );
    }

    if (filterPreset === 'custom') {
      if (
        !customStartDate ||
        !customEndDate
      ) {
        return true;
      }

      const start = new Date(
        `${customStartDate}T00:00:00`
      );

      const end = new Date(
        `${customEndDate}T23:59:59`
      );

      return (
        date >= start &&
        date <= end
      );
    }

    return true;
  };

  // =====================================================
  // FILTER CUSTOMERS
  // =====================================================

  const filteredCustomers = customers.filter(
    (customer) => {
      const name = String(
        customer?.fullName || ''
      ).toLowerCase();

      const id = String(
        customer?.customerId || ''
      ).toLowerCase();

      const phone = String(
        customer?.mobileNumber || ''
      ).toLowerCase();

      const cnic = String(
        customer?.cnic || customer?.CNIC || ''
      ).replace(/\D/g, '');

      const term = String(
        searchTerm || ''
      ).toLowerCase();

      const termNormalized =
        term.replace(/\D/g, '');

      const matchesSearch =
        name.includes(term) ||
        id.includes(term) ||
        phone.includes(term) ||
        matchesMobileSearch(phone, term) ||
        matchesCnicSearch(cnic, termNormalized);

      return (
        matchesSearch &&
        isDateInFilter(
          customer?.createdAt
        )
      );
    }
  );

  // =====================================================
  // CURRENCY
  // =====================================================

  const formatCurrency = (amount) =>
    `Rs. ${Number(
      amount || 0
    ).toLocaleString('en-PK')}`;

  // =====================================================
  // DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return '-';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return parsed.toLocaleDateString(
      'en-PK',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  // =====================================================
  // PERSON TYPE
  // =====================================================

  const getPersonTypeLabel = (type) => {
    if (type === 'customer') {
      return 'Main Customer';
    }

    if (type === 'guarantor1') {
      return 'Zamanti 1';
    }

    if (type === 'guarantor2') {
      return 'Zamanti 2';
    }

    return type || '-';
  };

  // =====================================================
  // PROFILE / COMPLETE LEDGER MODAL
  // =====================================================

  const renderProfileModal = () => {
    if (!profileModalOpen) {
      return null;
    }

    const profile = customerProfile;
    const customer = profile?.customer;
    const summary = profile?.summary || {};

    return (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
        <div className="bg-white w-full max-w-7xl max-h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">

          {/* HEADER */}

          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-lg md:text-xl font-bold">
                  {customer?.fullName ||
                    'Customer Complete Ledger'}
                </h2>

                <p className="text-xs text-slate-300">
                  Customer ID:{' '}
                  {customer?.customerId || '-'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeProfileModal}
              className="p-2 rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* BODY */}

          <div className="overflow-y-auto p-4 md:p-6 space-y-6">
            {profileLoading ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />

                <p className="text-sm font-semibold text-gray-600">
                  Loading complete customer history...
                </p>

                <p className="text-xs text-gray-400">
                  Sales, installments, payments and returns
                </p>
              </div>
            ) : profileError ? (
              <div className="p-8 text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />

                <p className="font-bold text-red-700">
                  Failed to load profile
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  {profileError}
                </p>
              </div>
            ) : customer ? (
              <>
                {/* CUSTOMER INFORMATION */}

                <section>
                  <SectionHeader
                    icon={
                      <User className="w-5 h-5" />
                    }
                    title="Complete Customer Information"
                    count=""
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <InfoBox
                      label="Full Name"
                      value={customer.fullName}
                    />

                    <InfoBox
                      label="Father's Name"
                      value={customer.fatherName}
                    />

                    <InfoBox
                      label="Customer ID"
                      value={customer.customerId}
                    />

                    <InfoBox
                      label="CNIC"
                      value={customer.cnic}
                    />

                    <InfoBox
                      label="Mobile Number"
                      value={customer.mobileNumber}
                    />

                    <InfoBox
                      label="Alternate Mobile"
                      value={
                        customer.alternateMobileNumber
                      }
                    />

                    <InfoBox
                      label="City"
                      value={customer.city}
                    />

                    <InfoBox
                      label="Email"
                      value={customer.email}
                    />

                    <div className="sm:col-span-2 lg:col-span-4">
                      <InfoBox
                        label="Address"
                        value={customer.address}
                      />
                    </div>

                    {customer.notes && (
                      <div className="sm:col-span-2 lg:col-span-4">
                        <InfoBox
                          label="Notes"
                          value={customer.notes}
                        />
                      </div>
                    )}
                  </div>
                </section>

                {/* GUARANTORS */}

                <section>
                  <SectionHeader
                    icon={
                      <Users className="w-5 h-5" />
                    }
                    title="Zamanatdar / Guarantors"
                    count=""
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <GuarantorCard
                      title="Zamanti 1"
                      guarantor={
                        customer.guarantor1
                      }
                    />

                    <GuarantorCard
                      title="Zamanti 2"
                      guarantor={
                        customer.guarantor2
                      }
                    />
                  </div>
                </section>

                {/* CUSTOMER MEDIA STATUS */}

                <section>
                  <SectionHeader
                    icon={
                      <Fingerprint className="w-5 h-5" />
                    }
                    title="Customer Verification / Media"
                    count=""
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <MediaStatus
                      label="Customer Photo"
                      available={
                        Boolean(
                          customer.photo ||
                          customer.customerPhoto ||
                          customer.photoUrl ||
                          customer.image
                        )
                      }
                    />

                    <MediaStatus
                      label="Customer Fingerprint"
                      available={Boolean(
                        customer.fingerprintFmd
                      )}
                    />

                    <MediaStatus
                      label="Fingerprint Image"
                      available={Boolean(
                        customer.fingerprintImage
                      )}
                    />
                  </div>
                </section>

                {/* FINANCIAL SUMMARY */}

                <section>
                  <SectionHeader
                    icon={
                      <Wallet className="w-5 h-5" />
                    }
                    title="Financial Summary"
                    count=""
                  />

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    <SummaryCard
                      title="Total Sales"
                      value={formatCurrency(
                        summary.totalSales
                      )}
                      icon={
                        <ShoppingBag className="w-5 h-5" />
                      }
                    />

                    <SummaryCard
                      title="Down Payments"
                      value={formatCurrency(
                        summary.totalDownPayments
                      )}
                      icon={
                        <Wallet className="w-5 h-5" />
                      }
                    />

                    <SummaryCard
                      title="Payments"
                      value={formatCurrency(
                        summary.totalPayments
                      )}
                      icon={
                        <CreditCard className="w-5 h-5" />
                      }
                    />

                    <SummaryCard
                      title="Outstanding"
                      value={formatCurrency(
                        summary.totalOutstanding
                      )}
                      icon={
                        <AlertCircle className="w-5 h-5" />
                      }
                      danger={
                        Number(
                          summary.totalOutstanding
                        ) > 0
                      }
                    />

                    <SummaryCard
                      title="Overdue"
                      value={
                        summary.overdueCount || 0
                      }
                      icon={
                        <Clock className="w-5 h-5" />
                      }
                      danger={
                        Number(
                          summary.overdueCount
                        ) > 0
                      }
                    />

                    <SummaryCard
                      title="Returns"
                      value={
                        summary.returnsCount || 0
                      }
                      icon={
                        <RotateCcw className="w-5 h-5" />
                      }
                    />
                  </div>
                </section>

                {/* SALES */}

                <section>
                  <SectionHeader
                    icon={
                      <ShoppingBag className="w-5 h-5" />
                    }
                    title="Complete Sales History"
                    count={
                      profile.sales?.length || 0
                    }
                  />

                  {profile.sales?.length ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              Invoice
                            </th>
                            <th className="px-4 py-3 text-left">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left">
                              Product
                            </th>
                            <th className="px-4 py-3 text-left">
                              Qty
                            </th>
                            <th className="px-4 py-3 text-left">
                              Unit Price
                            </th>
                            <th className="px-4 py-3 text-left">
                              Discount
                            </th>
                            <th className="px-4 py-3 text-left">
                              Total
                            </th>
                            <th className="px-4 py-3 text-left">
                              Payment
                            </th>
                            <th className="px-4 py-3 text-left">
                              Remaining
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y">
                          {profile.sales.map(
                            (sale) => (
                              <tr
                                key={sale._id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-4 py-3 font-bold text-indigo-600">
                                  {sale.saleId || '-'}
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap">
                                  {formatDate(
                                    sale.saleDate ||
                                      sale.createdAt
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="font-semibold text-gray-900">
                                    {sale.product
                                      ?.name || '-'}
                                  </div>

                                  <div className="text-xs text-gray-500">
                                    {sale.product
                                      ?.brand || ''}{' '}
                                    {sale.product
                                      ?.model || ''}
                                  </div>

                                  {sale.product
                                    ?.sku && (
                                    <div className="text-[10px] text-gray-400">
                                      SKU:{' '}
                                      {
                                        sale.product
                                          .sku
                                      }
                                    </div>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {sale.quantity}
                                </td>

                                <td className="px-4 py-3">
                                  {formatCurrency(
                                    sale.unitPrice
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {formatCurrency(
                                    sale.discount
                                  )}
                                </td>

                                <td className="px-4 py-3 font-bold">
                                  {formatCurrency(
                                    sale.finalTotal
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 rounded-md bg-gray-100 text-xs font-bold">
                                    {sale.paymentType ||
                                      '-'}
                                  </span>
                                </td>

                                <td className="px-4 py-3 font-semibold">
                                  {formatCurrency(
                                    sale.remainingBalance
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyHistory text="No sales history found." />
                  )}
                </section>

                {/* INSTALLMENTS */}

                <section>
                  <SectionHeader
                    icon={
                      <FileText className="w-5 h-5" />
                    }
                    title="Installment Plans & Complete Schedule"
                    count={
                      profile.installmentPlans
                        ?.length || 0
                    }
                  />

                  {profile.installmentPlans?.length ? (
                    <div className="space-y-4">
                      {profile.installmentPlans.map(
                        (plan) => (
                          <div
                            key={plan._id}
                            className="border border-gray-200 rounded-xl overflow-hidden"
                          >
                            <div className="bg-gray-50 px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900">
                                    Plan:{' '}
                                    {plan.planId || '-'}
                                  </span>

                                  <StatusBadge
                                    status={plan.status}
                                  />
                                </div>

                                <p className="text-xs text-gray-500 mt-1">
                                  Invoice:{' '}
                                  {plan.sale?.saleId ||
                                    '-'}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <MiniValue
                                  label="Total"
                                  value={formatCurrency(
                                    plan.totalAmount
                                  )}
                                />

                                <MiniValue
                                  label="Down Payment"
                                  value={formatCurrency(
                                    plan.downPayment
                                  )}
                                />

                                <MiniValue
                                  label="Remaining"
                                  value={formatCurrency(
                                    plan.remainingBalance
                                  )}
                                />

                                <MiniValue
                                  label="Duration"
                                  value={`${plan.duration || 0} Months`}
                                />
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Calendar className="w-4 h-4 text-indigo-600" />

                                <h4 className="text-sm font-bold">
                                  Installment Schedule
                                </h4>
                              </div>

                              {plan.installments?.length ? (
                                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                                  <table className="w-full text-xs">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left">
                                          #
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                          Due Date
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                          Original
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                          Amount
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                          Paid
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                          Remaining
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                          Status
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                          Paid Date
                                        </th>
                                      </tr>
                                    </thead>

                                    <tbody className="divide-y">
                                      {plan.installments.map(
                                        (installment) => (
                                          <tr
                                            key={
                                              installment._id
                                            }
                                          >
                                            <td className="px-3 py-2 font-bold">
                                              {
                                                installment.installmentNumber
                                              }
                                            </td>

                                            <td className="px-3 py-2">
                                              {formatDate(
                                                installment.dueDate
                                              )}
                                            </td>

                                            <td className="px-3 py-2">
                                              {formatCurrency(
                                                installment.originalAmount ||
                                                  installment.amount
                                              )}
                                            </td>

                                            <td className="px-3 py-2">
                                              {formatCurrency(
                                                installment.amount
                                              )}
                                            </td>

                                            <td className="px-3 py-2 font-semibold text-green-700">
                                              {formatCurrency(
                                                installment.paidAmount
                                              )}
                                            </td>

                                            <td className="px-3 py-2 font-semibold text-red-600">
                                              {formatCurrency(
                                                installment.remainingAmount
                                              )}
                                            </td>

                                            <td className="px-3 py-2">
                                              <StatusBadge
                                                status={
                                                  installment.status
                                                }
                                              />
                                            </td>

                                            <td className="px-3 py-2">
                                              {formatDate(
                                                installment.paidDate
                                              )}
                                            </td>
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400">
                                  No installment schedule found.
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <EmptyHistory text="No installment plans found." />
                  )}
                </section>

                {/* PAYMENTS */}

                <section>
                  <SectionHeader
                    icon={
                      <CreditCard className="w-5 h-5" />
                    }
                    title="Complete Payment History"
                    count={
                      profile.payments?.length || 0
                    }
                  />

                  {profile.payments?.length ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              Payment ID
                            </th>
                            <th className="px-4 py-3 text-left">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left">
                              Invoice
                            </th>
                            <th className="px-4 py-3 text-left">
                              Installment
                            </th>
                            <th className="px-4 py-3 text-left">
                              Amount
                            </th>
                            <th className="px-4 py-3 text-left">
                              Method
                            </th>
                            <th className="px-4 py-3 text-left">
                              Notes
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y">
                          {profile.payments.map(
                            (payment) => (
                              <tr
                                key={payment._id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-4 py-3 font-bold text-indigo-600">
                                  {payment.paymentId ||
                                    '-'}
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap">
                                  {formatDate(
                                    payment.paymentDate ||
                                      payment.createdAt
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {payment.sale?.saleId ||
                                    '-'}
                                </td>

                                <td className="px-4 py-3">
                                  {payment.installment
                                    ?.installmentNumber
                                    ? `#${payment.installment.installmentNumber}`
                                    : '-'}
                                </td>

                                <td className="px-4 py-3 font-bold text-green-700">
                                  {formatCurrency(
                                    payment.amount
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 rounded-md bg-gray-100 text-xs font-bold">
                                    {payment.paymentMethod ||
                                      '-'}
                                  </span>
                                </td>

                                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                                  {payment.notes || '-'}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyHistory text="No payment history found." />
                  )}
                </section>

                {/* RETURNS */}

                <section>
                  <SectionHeader
                    icon={
                      <RotateCcw className="w-5 h-5" />
                    }
                    title="Return History"
                    count={
                      profile.returns?.length || 0
                    }
                  />

                  {profile.returns?.length ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              Return ID
                            </th>
                            <th className="px-4 py-3 text-left">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left">
                              Invoice
                            </th>
                            <th className="px-4 py-3 text-left">
                              Product
                            </th>
                            <th className="px-4 py-3 text-left">
                              Qty
                            </th>
                            <th className="px-4 py-3 text-left">
                              Refund
                            </th>
                            <th className="px-4 py-3 text-left">
                              Reason
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y">
                          {profile.returns.map(
                            (returnItem) => (
                              <tr
                                key={
                                  returnItem._id
                                }
                              >
                                <td className="px-4 py-3 font-bold text-indigo-600">
                                  {returnItem.returnId ||
                                    '-'}
                                </td>

                                <td className="px-4 py-3">
                                  {formatDate(
                                    returnItem.returnDate ||
                                      returnItem.createdAt
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {returnItem.sale?.saleId ||
                                    '-'}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="font-semibold">
                                    {returnItem.product
                                      ?.name || '-'}
                                  </div>

                                  <div className="text-xs text-gray-500">
                                    {returnItem.product
                                      ?.brand || ''}{' '}
                                    {returnItem.product
                                      ?.model || ''}
                                  </div>
                                </td>

                                <td className="px-4 py-3">
                                  {returnItem.quantity}
                                </td>

                                <td className="px-4 py-3 font-bold text-red-600">
                                  {formatCurrency(
                                    returnItem.refundAmount
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {returnItem.reason ||
                                    '-'}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyHistory text="No return history found." />
                  )}
                </section>

                {/* FOOTER SUMMARY */}

                <section className="border-t pt-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MiniSummary
                      label="Sales Records"
                      value={
                        summary.salesCount || 0
                      }
                    />

                    <MiniSummary
                      label="Payment Records"
                      value={
                        summary.paymentsCount || 0
                      }
                    />

                    <MiniSummary
                      label="Due Today"
                      value={
                        summary.dueTodayCount || 0
                      }
                    />

                    <MiniSummary
                      label="Refunded"
                      value={formatCurrency(
                        summary.totalRefunded
                      )}
                    />
                  </div>
                </section>
              </>
            ) : null}
          </div>

          {/* FOOTER */}

          <div className="border-t bg-gray-50 px-5 py-3 flex items-center justify-between shrink-0">
            {customer && (
              <Link
                to={`/customers/${customer._id}`}
                onClick={closeProfileModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold"
              >
                <Eye className="w-4 h-4" />
                Open Full Profile
              </Link>
            )}

            <button
              type="button"
              onClick={closeProfileModal}
              className="ml-auto px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-sm font-bold text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // CUSTOMER SELECTOR COMPONENT
  // =====================================================

  const renderCustomerSelector = (mode) => (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          {mode === 'details' ? (
            <Contact className="w-5 h-5" />
          ) : (
            <BookOpen className="w-5 h-5" />
          )}
        </div>

        <div>
          <h3 className="font-bold text-gray-900">
            {mode === 'details'
              ? 'Customer Details'
              : 'Complete Customer Ledger'}
          </h3>

          <p className="text-xs text-gray-500 mt-1">
            {mode === 'details'
              ? 'Select a customer to view their personal profile and existing print slip.'
              : 'Select a customer to load their complete sales, installment, payment and return history.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />

          <input
            type="text"
            value={customerSelectorSearch}
            onChange={(e) =>
              setCustomerSelectorSearch(formatCnicSearchInput(e.target.value))
            }
            placeholder="Search customer by name, ID, mobile number, or CNIC..."
            className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedCustomerId}
          onChange={(e) =>
            setSelectedCustomerId(
              e.target.value
            )
          }
          className="lg:min-w-[360px] border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">
            Select Customer...
          </option>

          {selectorCustomers.map(
            (customer) => (
              <option
                key={customer._id}
                value={customer._id}
              >
                {customer.customerId || '-'} —{' '}
                {customer.fullName || '-'} —{' '}
                {customer.mobileNumber || '-'}
              </option>
            )
          )}
        </select>
      </div>

      {selectedCustomer && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">
              Selected Customer
            </p>

            <p className="text-base font-bold text-gray-900 mt-1">
              {selectedCustomer.fullName}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              ID: {selectedCustomer.customerId || '-'}
              {' • '}
              Mobile:{' '}
              {selectedCustomer.mobileNumber || '-'}
            </p>
          </div>

          <button
            type="button"
            onClick={
              mode === 'details'
                ? openCustomerDetails
                : handleOpenLedger
            }
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm"
          >
            {mode === 'details' ? (
              <>
                <Eye className="w-4 h-4" />
                Open Customer Details
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                Open Complete Ledger
              </>
            )}

            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {!loading &&
        selectorCustomers.length === 0 && (
          <div className="mt-4 text-center py-6 border border-dashed border-gray-200 rounded-xl">
            <User className="w-8 h-8 mx-auto text-gray-300" />

            <p className="text-sm font-semibold text-gray-500 mt-2">
              No customers found
            </p>
          </div>
        )}
    </div>
  );

  // =====================================================
  // CUSTOMER LIST
  // =====================================================

  const renderCustomerList = () => (
    <>
      {/* SEARCH / FILTERS */}

      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />

          <input
            type="text"
            placeholder="Search customer by full name, mobile number, CNIC, or customer ID..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(formatCnicSearchInput(e.target.value))
            }
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              {
                id: 'today',
                label: 'Registered Today',
              },
              {
                id: 'yesterday',
                label: 'Registered Yesterday',
              },
              {
                id: 'dayBeforeYesterday',
                label: 'Registered Day Before Yesterday',
              },
              {
                id: 'all',
                label: 'All-Time',
              },
              {
                id: 'week',
                label: 'Registered This Week',
              },
              {
                id: 'month',
                label: 'Registered This Month',
              },
              {
                id: 'custom',
                label: 'Custom Range',
              },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  setFilterPreset(
                    preset.id
                  )
                }
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  filterPreset === preset.id
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {filterPreset === 'custom' && (
            <div className="flex items-center space-x-2 text-xs font-bold text-gray-500">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />

              <input
                type="date"
                value={customStartDate}
                onChange={(e) =>
                  setCustomStartDate(
                    e.target.value
                  )
                }
                className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              />

              <span>to</span>

              <input
                type="date"
                value={customEndDate}
                onChange={(e) =>
                  setCustomEndDate(
                    e.target.value
                  )
                }
                className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />

            <span className="text-gray-500 text-sm">
              Accessing customer ledger...
            </span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-10 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
            <UserCheck className="w-10 h-10 text-gray-300" />

            <p className="text-sm font-semibold">
              No customers found for this selection
            </p>

            <p className="text-xs">
              Try switching date filters to
              "All-Time" or click "Register Customer".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4">
                    Cust ID
                  </th>

                  <th className="px-6 py-4">
                    Full Name
                  </th>

                  <th className="px-6 py-4">
                    Father's Name
                  </th>

                  <th className="px-6 py-4">
                    Mobile Number
                  </th>

                  <th className="px-6 py-4">
                    CNIC
                  </th>

                  <th className="px-6 py-4">
                    City
                  </th>

                  <th className="px-6 py-4 text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map(
                  (customer) => {
                    const isFingerprintMatch =
                      fingerprintResult?.matched &&
                      String(
                        fingerprintResult
                          ?.customer?._id
                      ) ===
                        String(
                          customer._id
                        );

                    return (
                      <tr
                        key={customer._id}
                        className={`transition-colors ${
                          isFingerprintMatch
                            ? 'bg-green-50 ring-1 ring-inset ring-green-300'
                            : 'hover:bg-gray-50/75'
                        }`}
                      >
                        <td className="px-6 py-4 text-indigo-600 font-bold tracking-wider">
                          {customer.customerId}

                          {isFingerprintMatch && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-green-700 font-bold">
                              <Fingerprint className="w-3 h-3" />
                              MATCH
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 font-bold text-gray-900">
                          {customer.fullName}
                        </td>

                        <td className="px-6 py-4 text-gray-700">
                          {customer.fatherName}
                        </td>

                        <td className="px-6 py-4 text-gray-800">
                          {customer.mobileNumber}
                        </td>

                        <td className="px-6 py-4 text-gray-500 tracking-wide">
                          {customer.cnic}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {customer.city}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleViewProfile(
                                  customer._id
                                )
                              }
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                              title="View Complete Ledger"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <Link
                              to={`/customers/edit/${customer._id}`}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                              title="Edit Customer Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>

                            {isDeletionUnlocked ? (
                              <button
                                type="button"
                                onClick={() =>
                                  triggerDeleteConfirmation(
                                    customer._id,
                                    customer.fullName
                                  )
                                }
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                                title="Delete Customer Profile"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <div
                                className="inline-flex items-center gap-1.5 px-2 py-1.5 text-gray-400"
                                title="Deletion Mode is disabled"
                              >
                                <Lock className="w-4 h-4" />

                                <span className="text-xs font-semibold">
                                  Locked
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">
            Customers
          </h2>

          <p className="text-sm text-gray-600 font-medium mt-1">
            Manage customer registration, personal details and complete financial ledgers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFingerprintSearch}
            disabled={fingerprintSearching}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            {fingerprintSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4" />
                <span>Search by Fingerprint</span>
              </>
            )}
          </button>

          <Link
            to="/customers/add"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Customer</span>
          </Link>
        </div>
      </div>

    
      {/* =================================================
          FINGERPRINT STATUS
      ================================================= */}

      {(fingerprintSearching ||
        fingerprintMessage ||
        fingerprintResult) && (
        <div
          className={`border rounded-xl p-4 shadow-sm ${
            fingerprintResult?.matched
              ? 'bg-green-50 border-green-200'
              : fingerprintResult?.error
              ? 'bg-red-50 border-red-200'
              : fingerprintResult?.matched ===
                false
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-indigo-50 border-indigo-200'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  fingerprintResult?.matched
                    ? 'bg-green-100 text-green-600'
                    : fingerprintResult?.error
                    ? 'bg-red-100 text-red-600'
                    : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                {fingerprintSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : fingerprintResult?.matched ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : fingerprintResult?.error ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <Fingerprint className="w-5 h-5" />
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-gray-900">
                  {fingerprintSearching
                    ? 'Fingerprint Search'
                    : fingerprintResult?.matched
                    ? 'Fingerprint Match Found'
                    : fingerprintResult?.error
                    ? 'Fingerprint Search Failed'
                    : 'Fingerprint Search'}
                </p>

                <p className="text-xs text-gray-600 mt-0.5">
                  {fingerprintMessage}
                </p>

                {fingerprintResult?.matched &&
                  fingerprintResult.customer && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-bold text-green-800">
                        Customer:{' '}
                        {
                          fingerprintResult
                            .customer.fullName
                        }
                      </p>

                      <p className="text-xs text-green-700">
                        Customer ID:{' '}
                        {
                          fingerprintResult
                            .customer.customerId
                        }
                      </p>

                      <p className="text-xs text-green-700">
                        Matched as:{' '}
                        {getPersonTypeLabel(
                          fingerprintResult.personType
                        )}
                      </p>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="bg-white/70 border border-green-200 rounded-lg px-3 py-2">
                          <p className="text-[10px] uppercase font-bold text-gray-400">
                            Mobile Number
                          </p>

                          <p className="text-xs font-semibold text-gray-800 mt-0.5">
                            {
                              fingerprintResult
                                .customer
                                .mobileNumber
                            }
                          </p>
                        </div>

                        <div className="bg-white/70 border border-green-200 rounded-lg px-3 py-2">
                          <p className="text-[10px] uppercase font-bold text-gray-400">
                            CNIC
                          </p>

                          <p className="text-xs font-semibold text-gray-800 mt-0.5">
                            {
                              fingerprintResult
                                .customer.cnic
                            }
                          </p>
                        </div>

                        <div className="bg-white/70 border border-green-200 rounded-lg px-3 py-2 sm:col-span-2">
                          <p className="text-[10px] uppercase font-bold text-gray-400">
                            Address
                          </p>

                          <p className="text-xs font-semibold text-gray-800 mt-0.5">
                            {
                              fingerprintResult
                                .customer.address
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {fingerprintResult?.matched &&
                fingerprintResult.customer && (
                  <button
                    type="button"
                    onClick={() =>
                      handleViewProfile(
                        fingerprintResult
                          .customer._id
                      )
                    }
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold"
                  >
                    <Eye className="w-4 h-4" />
                    View Complete History
                  </button>
                )}

              {!fingerprintSearching && (
                <button
                  type="button"
                  onClick={
                    clearFingerprintResult
                  }
                  className="px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          REGISTER
      ================================================= */}

      {activeSection === 'register' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <UserPlus className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-gray-900 mt-4">
            Customer Register
          </h3>

          <p className="text-sm text-gray-500 mt-2 max-w-lg mx-auto">
            Register a new customer with complete personal information,
            guarantors, customer photo and fingerprint.
          </p>

          <Link
            to="/customers/add"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Register New Customer
          </Link>
        </div>
      )}

      {/* =================================================
          LIST
      ================================================= */}

      {activeSection === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Customer List
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                {filteredCustomers.length} customer
                {filteredCustomers.length === 1
                  ? ''
                  : 's'} found
              </p>
            </div>
          </div>

          {renderCustomerList()}
        </>
      )}

      {/* =================================================
          CUSTOMER DETAILS
      ================================================= */}

      {activeSection === 'details' && (
        <>
          {renderCustomerSelector(
            'details'
          )}

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-indigo-600 mt-0.5" />

              <div>
                <p className="text-sm font-bold text-indigo-900">
                  Customer Details
                </p>

                <p className="text-xs text-indigo-700 mt-1">
                  This opens the existing customer profile page.
                  Your existing personal-details print slip remains
                  unchanged.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =================================================
          COMPLETE LEDGER
      ================================================= */}

      {activeSection === 'ledger' && (
        <>
          {renderCustomerSelector(
            'ledger'
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-slate-700 mt-0.5" />

              <div>
                <p className="text-sm font-bold text-slate-900">
                  Complete Customer Ledger
                </p>

                <p className="text-xs text-slate-600 mt-1">
                  The ledger includes customer information,
                  guarantors, financial summary, all sales,
                  invoices, products, installment schedules,
                  payments, outstanding amounts, returns,
                  overdue installments and due-today records.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =================================================
          PROFILE MODAL
      ================================================= */}

      {renderProfileModal()}

      {/* =================================================
          DELETE MODAL
      ================================================= */}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({
            ...deleteModal,
            isOpen: false,
          })
        }
        onConfirm={confirmDelete}
        title="Delete Customer Profile"
        message={`Are you sure you want to permanently delete customer profile for "${deleteModal.customerName}"? This action cannot be undone.`}
      />
    </div>
  );
};

// ======================================================
// INFO BOX
// ======================================================

const InfoBox = ({ label, value }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">
      {label}
    </p>

    <p className="text-sm font-semibold text-gray-800 mt-1 break-words">
      {value || '-'}
    </p>
  </div>
);

// ======================================================
// GUARANTOR CARD
// ======================================================

const GuarantorCard = ({
  title,
  guarantor,
}) => (
  <div className="border border-gray-200 rounded-xl p-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="font-bold text-gray-900">
        {title}
      </h4>

      {guarantor?.fingerprintFmd ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md">
          <Fingerprint className="w-3 h-3" />
          Fingerprint Registered
        </span>
      ) : (
        <span className="text-[10px] font-semibold text-gray-400">
          No Fingerprint
        </span>
      )}
    </div>

    {!guarantor ? (
      <div className="text-xs text-gray-400 py-4 text-center border border-dashed rounded-lg">
        No guarantor information
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <InfoBox
          label="Name"
          value={guarantor.name}
        />

        <InfoBox
          label="Father's Name"
          value={guarantor.fatherName}
        />

        <InfoBox
          label="Mobile"
          value={guarantor.mobileNumber}
        />

        <InfoBox
          label="CNIC"
          value={guarantor.cnic}
        />

        <InfoBox
          label="Relation"
          value={guarantor.relation}
        />

        <InfoBox
          label="Address"
          value={guarantor.address}
        />
      </div>
    )}
  </div>
);

// ======================================================
// MEDIA STATUS
// ======================================================

const MediaStatus = ({
  label,
  available,
}) => (
  <div
    className={`rounded-xl border p-4 ${
      available
        ? 'border-green-200 bg-green-50'
        : 'border-gray-200 bg-gray-50'
    }`}
  >
    <div className="flex items-center gap-2">
      {available ? (
        <CheckCircle2 className="w-5 h-5 text-green-600" />
      ) : (
        <XCircle className="w-5 h-5 text-gray-400" />
      )}

      <p className="text-sm font-bold text-gray-800">
        {label}
      </p>
    </div>

    <p
      className={`text-xs font-semibold mt-1 ${
        available
          ? 'text-green-700'
          : 'text-gray-400'
      }`}
    >
      {available
        ? 'Registered'
        : 'Not Registered'}
    </p>
  </div>
);

// ======================================================
// SUMMARY CARD
// ======================================================

const SummaryCard = ({
  title,
  value,
  icon,
  danger,
}) => (
  <div
    className={`rounded-xl border p-3 ${
      danger
        ? 'border-red-200 bg-red-50'
        : 'border-gray-200 bg-white'
    }`}
  >
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          danger
            ? 'bg-red-100 text-red-600'
            : 'bg-indigo-50 text-indigo-600'
        }`}
      >
        {icon}
      </div>

      <span className="text-[10px] uppercase font-bold text-gray-500">
        {title}
      </span>
    </div>

    <p
      className={`text-base font-bold mt-2 ${
        danger
          ? 'text-red-700'
          : 'text-gray-900'
      }`}
    >
      {value}
    </p>
  </div>
);

// ======================================================
// SECTION HEADER
// ======================================================

const SectionHeader = ({
  icon,
  title,
  count,
}) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <span className="text-indigo-600">
        {icon}
      </span>

      <h3 className="text-base font-bold text-gray-900">
        {title}
      </h3>
    </div>

    {count !== '' && (
      <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
        {count}
      </span>
    )}
  </div>
);

// ======================================================
// STATUS BADGE
// ======================================================

const StatusBadge = ({ status }) => {
  const normalized = String(
    status || ''
  ).toLowerCase();

  let classes =
    'bg-gray-100 text-gray-600';

  if (
    normalized === 'paid' ||
    normalized === 'completed'
  ) {
    classes =
      'bg-green-100 text-green-700';
  } else if (
    normalized === 'overdue'
  ) {
    classes =
      'bg-red-100 text-red-700';
  } else if (
    normalized === 'partially paid'
  ) {
    classes =
      'bg-yellow-100 text-yellow-700';
  } else if (
    normalized === 'pending' ||
    normalized === 'active'
  ) {
    classes =
      'bg-blue-100 text-blue-700';
  }

  return (
    <span
      className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold ${classes}`}
    >
      {status || 'Unknown'}
    </span>
  );
};

// ======================================================
// MINI VALUE
// ======================================================

const MiniValue = ({
  label,
  value,
}) => (
  <div>
    <p className="text-[10px] uppercase text-gray-400 font-bold">
      {label}
    </p>

    <p className="font-bold text-gray-800 mt-0.5">
      {value}
    </p>
  </div>
);

// ======================================================
// MINI SUMMARY
// ======================================================

const MiniSummary = ({
  label,
  value,
}) => (
  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
    <p className="text-[10px] uppercase text-gray-400 font-bold">
      {label}
    </p>

    <p className="text-lg font-bold text-gray-900 mt-1">
      {value}
    </p>
  </div>
);

// ======================================================
// EMPTY HISTORY
// ======================================================

const EmptyHistory = ({ text }) => (
  <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center">
    <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />

    <p className="text-xs text-gray-400 font-semibold">
      {text}
    </p>
  </div>
);

export default Customers;
