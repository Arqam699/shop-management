
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  formatCnicSearchInput,
  matchesCnicSearch,
  matchesMobileSearch,
} from '../utils/cnicSearch';
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
  Sparkles,
  CalendarRange,
  ShieldCheck,
  Building2,
  MapPin,
  Phone,
  Mail,
  Receipt,
  Check,
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
  const isDeletionUnlocked = settings?.allowGlobalDeletion === true;

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

      if (response.data?.success && Array.isArray(response.data.data)) {
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
        (customer) => String(customer._id) === String(selectedCustomerId)
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

      const customerResponse = await api.get(`/customers/${customerId}`);

      if (!customerResponse.data?.success) {
        throw new Error(
          customerResponse.data?.message || 'Failed to load customer profile.'
        );
      }

      const customerData = customerResponse.data.data;

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
        return String(paymentCustomerId) === String(customerId);
      });

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
        return String(returnCustomerId) === String(customerId);
      });

      const plans = Array.isArray(customerData.installmentPlans)
        ? customerData.installmentPlans
        : [];

      const installmentScheduleResults = await Promise.all(
        plans.map(async (plan) => {
          try {
            if (!plan?._id) {
              return { planId: null, installments: [] };
            }

            const response = await api.get(`/installments/${plan._id}`);
            if (response.data?.success) {
              return {
                planId: plan._id,
                installments: Array.isArray(response.data.data?.installments)
                  ? response.data.data.installments
                  : [],
              };
            }

            return { planId: plan._id, installments: [] };
          } catch (error) {
            console.error('Failed to load installment schedule:', error);
            return { planId: plan?._id, installments: [] };
          }
        })
      );

      const scheduleMap = {};
      installmentScheduleResults.forEach((item) => {
        if (item.planId) {
          scheduleMap[String(item.planId)] = item.installments;
        }
      });

      const plansWithSchedules = plans.map((plan) => ({
        ...plan,
        installments: scheduleMap[String(plan._id)] || [],
      }));

      const sales = Array.isArray(customerData.sales) ? customerData.sales : [];
      const totalSales = sales.reduce(
        (sum, sale) => sum + Number(sale.finalTotal || 0),
        0
      );
      const totalDownPayments = sales.reduce(
        (sum, sale) => sum + Number(sale.downPayment || 0),
        0
      );
      const totalPayments = customerPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );
      const totalOutstanding = plansWithSchedules.reduce(
        (sum, plan) => sum + Number(plan.remainingBalance || 0),
        0
      );
      const totalRefunded = customerReturns.reduce(
        (sum, returnItem) => sum + Number(returnItem.refundAmount || 0),
        0
      );

      const overdueInstallments = plansWithSchedules.flatMap((plan) =>
        (plan.installments || []).filter(
          (installment) =>
            String(installment.status || '').toLowerCase() === 'overdue'
        )
      );

      const dueTodayInstallments = plansWithSchedules.flatMap((plan) =>
        (plan.installments || []).filter((installment) => {
          if (String(installment.status || '').toLowerCase() === 'paid') {
            return false;
          }
          if (!installment.dueDate) {
            return false;
          }
          const dueDate = new Date(installment.dueDate);
          const today = new Date();
          return (
            dueDate.getFullYear() === today.getFullYear() &&
            dueDate.getMonth() === today.getMonth() &&
            dueDate.getDate() === today.getDate()
          );
        })
      );

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
          installmentPlansCount: plansWithSchedules.length,
          paymentsCount: customerPayments.length,
          returnsCount: customerReturns.length,
          overdueCount: overdueInstallments.length,
          dueTodayCount: dueTodayInstallments.length,
        },
      });
    } catch (error) {
      console.error('Complete customer profile error:', error);
      setProfileError(
        error.response?.data?.message ||
          error.message ||
          'Failed to load complete customer history.'
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleViewProfile = async (customerId) => {
    await loadCompleteCustomerProfile(customerId);
  };

  const handleOpenLedger = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer first.');
      return;
    }
    await loadCompleteCustomerProfile(selectedCustomerId);
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setCustomerProfile(null);
    setProfileError('');
  };

  // =====================================================
  // FINGERPRINT SCANNER & SEARCH
  // =====================================================
  const checkFingerprintAgent = async () => {
    try {
      const response = await fetch(`${FINGERPRINT_AGENT_URL}/health`);
      if (!response.ok) {
        throw new Error('Fingerprint agent is unavailable.');
      }
      const data = await response.json();
      if (!data.success || !data.readerConnected) {
        throw new Error('DigitalPersona fingerprint reader is not connected.');
      }
      return true;
    } catch (error) {
      console.error('Fingerprint agent health error:', error);
      throw new Error(
        'Fingerprint scanner agent is not running or DigitalPersona reader is not connected.'
      );
    }
  };

  const handleFingerprintSearch = async () => {
    if (fingerprintSearching) return;

    try {
      setFingerprintSearching(true);
      setFingerprintResult(null);
      setFingerprintMessage('Checking fingerprint scanner...');

      await checkFingerprintAgent();

      setFingerprintMessage('Scanner ready. Place finger on DigitalPersona reader...');

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
        throw new Error('Fingerprint agent returned an invalid response.');
      }

      if (!captureResponse.ok || !captureData.success) {
        throw new Error(captureData.message || 'Fingerprint capture failed.');
      }

      if (!captureData.fmd) {
        throw new Error('Fingerprint template was not returned by scanner.');
      }

      const scannedFmd = captureData.fmd;
      setFingerprintMessage('Fingerprint captured. Loading registered fingerprints...');

      const templatesResponse = await api.post('/customers/fingerprint/templates');
      const templatesData = templatesResponse.data;

      if (!templatesData?.success) {
        throw new Error(
          templatesData?.message || 'Failed to load fingerprint templates.'
        );
      }

      const templates = Array.isArray(templatesData.templates)
        ? templatesData.templates
        : [];

      if (templates.length === 0) {
        throw new Error('No registered fingerprints were found for this shop.');
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
        identifyData = await identifyResponse.json();
      } catch {
        throw new Error(
          'Fingerprint identification agent returned an invalid response.'
        );
      }

      if (!identifyResponse.ok) {
        throw new Error(
          identifyData.message || 'Fingerprint identification failed.'
        );
      }

      if (!identifyData.matched) {
        setFingerprintResult({ matched: false });
        setFingerprintMessage('No customer or guarantor matched this fingerprint.');
        return;
      }

      const matchedCustomerId = identifyData.id;
      const matchedPersonType = identifyData.type;

      if (!matchedCustomerId) {
        throw new Error('Fingerprint matched but customer ID was not returned.');
      }

      setFingerprintMessage('Fingerprint matched. Loading customer details...');

      const customerResponse = await api.get(`/customers/${matchedCustomerId}`);
      if (!customerResponse.data?.success) {
        throw new Error(
          customerResponse.data?.message || 'Matched customer profile was not found.'
        );
      }

      const fullCustomerData = customerResponse.data.data;
      if (!fullCustomerData) {
        throw new Error('Matched customer profile was not returned by server.');
      }

      const matchedCustomer = {
        _id: fullCustomerData._id,
        customerId: fullCustomerData.customerId,
        fullName: fullCustomerData.fullName,
        fatherName: fullCustomerData.fatherName,
        mobileNumber: fullCustomerData.mobileNumber,
        alternateMobileNumber: fullCustomerData.alternateMobileNumber,
        cnic: fullCustomerData.cnic,
        address: fullCustomerData.address,
        city: fullCustomerData.city,
        email: fullCustomerData.email,
        notes: fullCustomerData.notes,
        guarantor1: fullCustomerData.guarantor1
          ? {
              name: fullCustomerData.guarantor1.name,
              mobileNumber: fullCustomerData.guarantor1.mobileNumber,
            }
          : null,
        guarantor2: fullCustomerData.guarantor2
          ? {
              name: fullCustomerData.guarantor2.name,
              mobileNumber: fullCustomerData.guarantor2.mobileNumber,
            }
          : null,
      };

      setFingerprintResult({
        matched: true,
        customer: matchedCustomer,
        personType: matchedPersonType,
      });

      setSearchTerm(matchedCustomer.customerId || matchedCustomer.fullName || '');
      setSelectedCustomerId(matchedCustomer._id);
      setActiveSection('list');
      setFingerprintMessage('Fingerprint matched successfully. Customer details found.');
    } catch (error) {
      console.error('Fingerprint search error:', error);
      setFingerprintResult({
        matched: false,
        error: error.message || 'Fingerprint search failed.',
      });
      setFingerprintMessage(error.message || 'Fingerprint search failed.');
    } finally {
      setFingerprintSearching(false);
    }
  };

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
      toast.error('Deletion Mode is disabled. Enable it from Settings first.');
      return;
    }

    setDeleteModal({
      isOpen: true,
      customerId: id,
      customerName: name,
    });
  };

  const confirmDelete = async () => {
    const { customerId, customerName } = deleteModal;

    try {
      const response = await api.delete(`/customers/${customerId}`);

      if (response.data?.success) {
        setCustomers((prev) =>
          prev.filter((customer) => customer._id !== customerId)
        );

        if (fingerprintResult?.customer?._id === customerId) {
          clearFingerprintResult();
        }

        if (String(selectedCustomerId) === String(customerId)) {
          setSelectedCustomerId('');
        }

        toast.success(`Customer ${customerName} profile deleted successfully.`);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error(
        error.response?.data?.message || 'Failed to delete customer profile.'
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
    if (filterPreset === 'all') return true;
    if (!dateStr) return false;

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return false;

    date.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(today.getDate() - 2);

    if (filterPreset === 'today') return date.getTime() === today.getTime();
    if (filterPreset === 'yesterday') return date.getTime() === yesterday.getTime();
    if (filterPreset === 'dayBeforeYesterday')
      return date.getTime() === dayBeforeYesterday.getTime();

    if (filterPreset === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      return date >= startOfWeek && date <= today;
    }

    if (filterPreset === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return date >= startOfMonth && date <= today;
    }

    if (filterPreset === 'custom') {
      if (!customStartDate || !customEndDate) return true;
      const start = new Date(`${customStartDate}T00:00:00`);
      const end = new Date(`${customEndDate}T23:59:59`);
      return date >= start && date <= end;
    }

    return true;
  };

  // Filtered customers list
  const filteredCustomers = customers.filter((customer) => {
    const name = String(customer?.fullName || '').toLowerCase();
    const id = String(customer?.customerId || '').toLowerCase();
    const phone = String(customer?.mobileNumber || '').toLowerCase();
    const cnic = String(customer?.cnic || customer?.CNIC || '').replace(/\D/g, '');
    const term = String(searchTerm || '').toLowerCase();
    const termNormalized = term.replace(/\D/g, '');

    const matchesSearch =
      name.includes(term) ||
      id.includes(term) ||
      phone.includes(term) ||
      matchesMobileSearch(phone, term) ||
      matchesCnicSearch(cnic, termNormalized);

    return matchesSearch && isDateInFilter(customer?.createdAt);
  });

  const formatCurrency = (amount) =>
    `${settings?.currency || 'PKR'} ${Number(amount || 0).toLocaleString('en-PK')}`;

  const formatDate = (date) => {
    if (!date) return '-';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPersonTypeLabel = (type) => {
    if (type === 'customer') return 'Main Customer';
    if (type === 'guarantor1') return 'Zamanti 1';
    if (type === 'guarantor2') return 'Zamanti 2';
    return type || '-';
  };

  // =====================================================
  // COMPLETE PROFILE / LEDGER MODAL
  // =====================================================
  const renderProfileModal = () => {
    if (!profileModalOpen) return null;

    const profile = customerProfile;
    const customer = profile?.customer;
    const summary = profile?.summary || {};

    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 lg:p-6 animate-[pageEnter_0.25s_ease-out]">
        <div className="bg-white w-full max-w-7xl max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
          
          {/* MODAL HEADER */}
          <div className="relative bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/[0.08]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-950/50">
                <BookOpen className="w-6 h-6 text-white" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="text-base sm:text-xl font-black tracking-tight text-white">
                    {customer?.fullName || 'Customer Complete Ledger'}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Customer ID: <span className="text-blue-400 font-black">{customer?.customerId || '-'}</span> • Mobile: {customer?.mobileNumber || '-'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeProfileModal}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:rotate-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* MODAL BODY */}
          <div className="overflow-y-auto p-5 sm:p-7 space-y-7 custom-scrollbar bg-[#f8fafc]">
            {profileLoading ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 p-0.5 animate-spin flex items-center justify-center">
                  <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-800">Loading Customer Ledger...</p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Sales, installments, payments & returns history</p>
                </div>
              </div>
            ) : profileError ? (
              <div className="p-8 text-center bg-rose-50 rounded-2xl border border-rose-200">
                <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                <p className="font-black text-rose-700">Failed to load profile</p>
                <p className="text-xs text-rose-500 mt-1">{profileError}</p>
              </div>
            ) : customer ? (
              <>
                {/* 1. FINANCIAL SUMMARY METRICS */}
                <section>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                    <SummaryCard
                      title="Total Sales"
                      value={formatCurrency(summary.totalSales)}
                      icon={<ShoppingBag className="w-4 h-4" />}
                    />
                    <SummaryCard
                      title="Down Payments"
                      value={formatCurrency(summary.totalDownPayments)}
                      icon={<Wallet className="w-4 h-4" />}
                    />
                    <SummaryCard
                      title="Payments Received"
                      value={formatCurrency(summary.totalPayments)}
                      icon={<CreditCard className="w-4 h-4" />}
                    />
                    <SummaryCard
                      title="Outstanding"
                      value={formatCurrency(summary.totalOutstanding)}
                      icon={<AlertCircle className="w-4 h-4" />}
                      danger={Number(summary.totalOutstanding) > 0}
                    />
                    <SummaryCard
                      title="Overdue Dues"
                      value={summary.overdueCount || 0}
                      icon={<Clock className="w-4 h-4" />}
                      danger={Number(summary.overdueCount) > 0}
                    />
                    <SummaryCard
                      title="Returns"
                      value={summary.returnsCount || 0}
                      icon={<RotateCcw className="w-4 h-4" />}
                    />
                  </div>
                </section>

                {/* 2. CUSTOMER PERSONAL DETAILS */}
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                  <SectionHeader
                    icon={<User className="w-4 h-4" />}
                    title="Customer Personal Profile"
                    count=""
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                    <InfoBox label="Full Name" value={customer.fullName} />
                    <InfoBox label="Father's Name" value={customer.fatherName} />
                    <InfoBox label="Customer ID" value={customer.customerId} highlight />
                    <InfoBox label="CNIC" value={customer.cnic} />
                    <InfoBox label="Mobile Number" value={customer.mobileNumber} />
                    <InfoBox label="Alternate Mobile" value={customer.alternateMobileNumber} />
                    <InfoBox label="City" value={customer.city} />
                    <InfoBox label="Email" value={customer.email} />
                    <div className="sm:col-span-2 lg:col-span-4">
                      <InfoBox label="Residential Address" value={customer.address} />
                    </div>
                    {customer.notes && (
                      <div className="sm:col-span-2 lg:col-span-4">
                        <InfoBox label="Notes & Remarks" value={customer.notes} />
                      </div>
                    )}
                  </div>
                </section>

                {/* 3. GUARANTORS / ZAMANATDAR */}
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                  <SectionHeader
                    icon={<Users className="w-4 h-4" />}
                    title="Zamanatdar / Guarantors Information"
                    count=""
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <GuarantorCard title="Zamanti 1" guarantor={customer.guarantor1} />
                    <GuarantorCard title="Zamanti 2" guarantor={customer.guarantor2} />
                  </div>
                </section>

                {/* 4. VERIFICATION / MEDIA STATUS */}
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                  <SectionHeader
                    icon={<Fingerprint className="w-4 h-4" />}
                    title="Biometric & Media Verification"
                    count=""
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <MediaStatus
                      label="Customer Photo"
                      available={Boolean(
                        customer.photo ||
                          customer.customerPhoto ||
                          customer.photoUrl ||
                          customer.image
                      )}
                    />
                    <MediaStatus
                      label="Customer Fingerprint"
                      available={Boolean(customer.fingerprintFmd)}
                    />
                    <MediaStatus
                      label="Fingerprint Image"
                      available={Boolean(customer.fingerprintImage)}
                    />
                  </div>
                </section>

                {/* 5. SALES HISTORY */}
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                  <SectionHeader
                    icon={<ShoppingBag className="w-4 h-4" />}
                    title="Complete Sales History"
                    count={profile.sales?.length || 0}
                  />

                  {profile.sales?.length ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 font-black uppercase text-slate-400 text-[9px] tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Invoice</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3 text-center">Qty</th>
                            <th className="px-4 py-3 text-right">Unit Price</th>
                            <th className="px-4 py-3 text-right">Discount</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3 text-center">Payment</th>
                            <th className="px-4 py-3 text-right">Remaining</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {profile.sales.map((sale) => (
                            <tr key={sale._id} className="hover:bg-slate-50/70 transition">
                              <td className="px-4 py-3 font-black text-indigo-600">
                                {sale.saleId || '-'}
                              </td>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                {formatDate(sale.saleDate || sale.createdAt)}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-800">
                                {sale.product?.name || '-'}
                                {sale.product?.model && (
                                  <span className="text-[10px] text-slate-400 block font-normal">
                                    {sale.product.model}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-black text-[10px] text-slate-700">
                                  {sale.quantity}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(sale.unitPrice)}</td>
                              <td className="px-4 py-3 text-right text-slate-400">{formatCurrency(sale.discount)}</td>
                              <td className="px-4 py-3 text-right font-black text-slate-900">{formatCurrency(sale.finalTotal)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                  sale.paymentType === 'Cash'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                }`}>
                                  {sale.paymentType || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-black text-rose-600">{formatCurrency(sale.remainingBalance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyHistory text="No sales history found for this customer." />
                  )}
                </section>

                {/* 6. INSTALLMENTS & SCHEDULE */}
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                  <SectionHeader
                    icon={<FileText className="w-4 h-4" />}
                    title="Installment Plans & Schedules"
                    count={profile.installmentPlans?.length || 0}
                  />

                  {profile.installmentPlans?.length ? (
                    <div className="space-y-4 mt-4">
                      {profile.installmentPlans.map((plan) => (
                        <div key={plan._id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          <div className="bg-slate-50/80 px-4 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-xs text-indigo-600">
                                  Plan: {plan.planId || '-'}
                                </span>
                                <StatusBadge status={plan.status} />
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Linked Invoice: {plan.sale?.saleId || '-'}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                              <MiniValue label="Total Deal" value={formatCurrency(plan.totalAmount)} />
                              <MiniValue label="Down Payment" value={formatCurrency(plan.downPayment)} />
                              <MiniValue label="Remaining" value={formatCurrency(plan.remainingBalance)} />
                              <MiniValue label="Duration" value={`${plan.duration || 0} Months`} />
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-3 text-xs font-black text-slate-800">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <span>Installment Schedule Details</span>
                            </div>

                            {plan.installments?.length ? (
                              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50/70 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400">
                                    <tr>
                                      <th className="px-3 py-2 text-center">#</th>
                                      <th className="px-3 py-2">Due Date</th>
                                      <th className="px-3 py-2 text-right">Original</th>
                                      <th className="px-3 py-2 text-right">Amount</th>
                                      <th className="px-3 py-2 text-right">Paid</th>
                                      <th className="px-3 py-2 text-right">Remaining</th>
                                      <th className="px-3 py-2 text-center">Status</th>
                                      <th className="px-3 py-2">Paid Date</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    {plan.installments.map((installment) => (
                                      <tr key={installment._id} className="hover:bg-slate-50/60">
                                        <td className="px-3 py-2 text-center font-black text-slate-700">
                                          #{installment.installmentNumber}
                                        </td>
                                        <td className="px-3 py-2 font-bold text-blue-600">
                                          {formatDate(installment.dueDate)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-slate-400">
                                          {formatCurrency(installment.originalAmount || installment.amount)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-black text-slate-800">
                                          {formatCurrency(installment.amount)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-black text-emerald-600">
                                          {formatCurrency(installment.paidAmount)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-black text-rose-600">
                                          {formatCurrency(installment.remainingAmount)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <StatusBadge status={installment.status} />
                                        </td>
                                        <td className="px-3 py-2 text-slate-500">
                                          {formatDate(installment.paidDate)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 py-2">No installment schedule found.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyHistory text="No installment plans found." />
                  )}
                </section>

                {/* 7. PAYMENTS HISTORY */}
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                  <SectionHeader
                    icon={<CreditCard className="w-4 h-4" />}
                    title="Received Payments History"
                    count={profile.payments?.length || 0}
                  />

                  {profile.payments?.length ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400">
                          <tr>
                            <th className="px-4 py-3">Payment ID</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Invoice</th>
                            <th className="px-4 py-3">Installment</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Method</th>
                            <th className="px-4 py-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {profile.payments.map((payment) => (
                            <tr key={payment._id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-black text-indigo-600">{payment.paymentId || '-'}</td>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(payment.paymentDate || payment.createdAt)}</td>
                              <td className="px-4 py-3 font-semibold text-slate-700">{payment.sale?.saleId || '-'}</td>
                              <td className="px-4 py-3 text-slate-600">{payment.installment?.installmentNumber ? `Month #${payment.installment.installmentNumber}` : '-'}</td>
                              <td className="px-4 py-3 text-right font-black text-emerald-600">+{formatCurrency(payment.amount)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-[10px] text-slate-700">
                                  {payment.paymentMethod || 'Cash'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[11px] text-slate-400 max-w-xs truncate">{payment.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyHistory text="No payment history recorded." />
                  )}
                </section>

                {/* 8. RETURNS HISTORY */}
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                  <SectionHeader
                    icon={<RotateCcw className="w-4 h-4" />}
                    title="Return / Refund History"
                    count={profile.returns?.length || 0}
                  />

                  {profile.returns?.length ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400">
                          <tr>
                            <th className="px-4 py-3">Return ID</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Invoice</th>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3 text-center">Qty</th>
                            <th className="px-4 py-3 text-right">Refund</th>
                            <th className="px-4 py-3">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {profile.returns.map((returnItem) => (
                            <tr key={returnItem._id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-black text-indigo-600">{returnItem.returnId || '-'}</td>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(returnItem.returnDate || returnItem.createdAt)}</td>
                              <td className="px-4 py-3 font-semibold text-slate-700">{returnItem.sale?.saleId || '-'}</td>
                              <td className="px-4 py-3 font-bold text-slate-800">{returnItem.product?.name || '-'}</td>
                              <td className="px-4 py-3 text-center font-bold">{returnItem.quantity}</td>
                              <td className="px-4 py-3 text-right font-black text-rose-600">-{formatCurrency(returnItem.refundAmount)}</td>
                              <td className="px-4 py-3 text-slate-500">{returnItem.reason || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyHistory text="No return history found." />
                  )}
                </section>
              </>
            ) : null}
          </div>

          {/* MODAL FOOTER */}
          <div className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
            {customer && (
              <Link
                to={`/customers/${customer._id}`}
                onClick={closeProfileModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white text-xs font-black shadow-md shadow-blue-950/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Eye className="w-4 h-4" />
                Open Details & Print Slip
              </Link>
            )}

            <button
              type="button"
              onClick={closeProfileModal}
              className="ml-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-700 transition-all"
            >
              Close Ledger
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // CUSTOMER SELECTOR COMPONENT (FOR DETAILS & LEDGER)
  // =====================================================
  const renderCustomerSelector = (mode) => (
    <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 space-y-5 animate-[pageEnter_0.3s_ease-out]">
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/15 to-violet-500/15 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20">
          {mode === 'details' ? (
            <Contact className="w-6 h-6" />
          ) : (
            <BookOpen className="w-6 h-6" />
          )}
        </div>

        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-900">
            {mode === 'details'
              ? 'Select Customer for Details'
              : 'Select Customer for Complete Ledger'}
          </h3>

          <p className="text-xs text-slate-400 font-medium mt-1">
            {mode === 'details'
              ? 'Select a registered customer to view profile information, guarantors, and printable slips.'
              : 'Load customer financial history including invoices, installment schedules, returns, and dues.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={customerSelectorSearch}
            onChange={(e) =>
              setCustomerSelectorSearch(formatCnicSearchInput(e.target.value))
            }
            placeholder="Search by customer name, mobile, CNIC or ID..."
            className="w-full h-11 border border-slate-200 rounded-xl pl-11 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>

        <select
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          className="lg:min-w-[360px] h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-black text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
        >
          <option value="">Select from registered customers...</option>
          {selectorCustomers.map((customer) => (
            <option key={customer._id} value={customer._id}>
              {customer.customerId || '-'} — {customer.fullName || '-'} — {customer.mobileNumber || '-'}
            </option>
          ))}
        </select>
      </div>

      {selectedCustomer && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/5 via-violet-500/5 to-transparent border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-[pageEnter_0.2s_ease-out]">
          <div>
            <span className="text-[9px] uppercase tracking-widest font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              Selected Profile
            </span>
            <h4 className="text-base font-black text-slate-900 mt-1.5">
              {selectedCustomer.fullName}
            </h4>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Customer ID: <span className="font-bold text-slate-800">{selectedCustomer.customerId || '-'}</span> • Mobile: {selectedCustomer.mobileNumber || '-'} • City: {selectedCustomer.city || '-'}
            </p>
          </div>

          <button
            type="button"
            onClick={mode === 'details' ? openCustomerDetails : handleOpenLedger}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            {mode === 'details' ? (
              <>
                <Eye className="w-4 h-4" />
                Open Details
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                Open Ledger
              </>
            )}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {!loading && selectorCustomers.length === 0 && (
        <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl">
          <User className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs font-black text-slate-500 mt-2">No matching customers found</p>
        </div>
      )}
    </div>
  );

  // =====================================================
  // CUSTOMER LIST RENDER
  // =====================================================
  const renderCustomerList = () => (
    <>
      {/* SEARCH & DATE FILTERS BAR */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer by name, mobile, CNIC or customer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(formatCnicSearchInput(e.target.value))}
            className="w-full h-11 border border-slate-200 rounded-xl pl-11 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
            {[
              { id: 'all', label: 'All-Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'dayBeforeYesterday', label: 'Day Before' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setFilterPreset(preset.id)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  filterPreset === preset.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/20 scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {filterPreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 animate-[pageEnter_0.2s_ease-out]">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-700 outline-none"
                />
              </div>

              <span>to</span>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-violet-600" />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-700 outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CUSTOMER DATA TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-xs font-black uppercase tracking-wider">
              Accessing customer ledger...
            </span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <UserCheck className="w-12 h-12 text-slate-300" />
            <p className="text-sm font-black text-slate-700">No customers found</p>
            <p className="text-xs text-slate-400">
              Try switching filters to "All-Time" or click "Register Customer".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 font-medium">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Cust ID</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Father's Name</th>
                  <th className="px-6 py-4">Mobile Number</th>
                  <th className="px-6 py-4">CNIC</th>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => {
                  const isFingerprintMatch =
                    fingerprintResult?.matched &&
                    String(fingerprintResult?.customer?._id) === String(customer._id);

                  return (
                    <tr
                      key={customer._id}
                      className={`transition-colors ${
                        isFingerprintMatch
                          ? 'bg-emerald-50/70 ring-1 ring-inset ring-emerald-300'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-6 py-4 font-black text-indigo-600 tracking-wider">
                        {customer.customerId}
                        {isFingerprintMatch && (
                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black">
                            <Fingerprint className="w-2.5 h-2.5" />
                            MATCH
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-black text-slate-900">
                        {customer.fullName}
                      </td>

                      <td className="px-6 py-4 text-slate-600 font-bold">
                        {customer.fatherName || '-'}
                      </td>

                      <td className="px-6 py-4 text-slate-800 font-bold">
                        {customer.mobileNumber}
                      </td>

                      <td className="px-6 py-4 text-slate-500 font-medium tracking-wide">
                        {customer.cnic || '-'}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {customer.city || '-'}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">

                          {/* Edit Customer */}
                          <Link
                            to={`/customers/edit/${customer._id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                            title="Edit Customer Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          {/* Delete */}
                          {isDeletionUnlocked ? (
                            <button
                              type="button"
                              onClick={() =>
                                triggerDeleteConfirmation(
                                  customer._id,
                                  customer.fullName
                                )
                              }
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                              title="Delete Customer Profile"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div
                              className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-slate-400"
                              title="Deletion Mode is locked in Settings"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );

  // =====================================================
  // MAIN COMPONENT RENDER
  // =====================================================
  return (
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO HEADER (Matched to Layout & Dashboard)
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Customer Directory
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {customers.length} Total Registered Customers
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Customer Management
              </h1>

              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                Biometric fingerprint verification, registration, profile details, and complete financial ledgers.
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Biometric Search */}
              <button
                type="button"
                onClick={handleFingerprintSearch}
                disabled={fingerprintSearching}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              >
                {fingerprintSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span>Scanning Scanner...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4 text-blue-400" />
                    <span>Fingerprint Search</span>
                  </>
                )}
              </button>

              {/* Register New Customer */}
              <Link
                to="/customers/add"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Register Customer</span>
              </Link>

            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          FINGERPRINT SCANNER STATUS BANNER
      ====================================================== */}
      {(fingerprintSearching || fingerprintMessage || fingerprintResult) && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 shadow-sm animate-[pageEnter_0.3s_ease-out] ${
            fingerprintResult?.matched
              ? 'bg-emerald-50 border-emerald-200'
              : fingerprintResult?.error
              ? 'bg-rose-50 border-rose-200'
              : fingerprintResult?.matched === false
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  fingerprintResult?.matched
                    ? 'bg-emerald-500 text-white'
                    : fingerprintResult?.error
                    ? 'bg-rose-500 text-white'
                    : 'bg-blue-600 text-white'
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
                <h4 className="text-sm font-black text-slate-900">
                  {fingerprintSearching
                    ? 'Biometric Fingerprint Matching'
                    : fingerprintResult?.matched
                    ? 'Customer Identified via Fingerprint'
                    : fingerprintResult?.error
                    ? 'Fingerprint Scanning Error'
                    : 'Fingerprint Recognition'}
                </h4>

                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  {fingerprintMessage}
                </p>

                {fingerprintResult?.matched && fingerprintResult.customer && (
                  <div className="mt-3.5 space-y-1.5">
                    <p className="text-sm font-black text-emerald-900">
                      Customer: {fingerprintResult.customer.fullName}
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs font-bold text-emerald-700">
                      <span>ID: {fingerprintResult.customer.customerId}</span>
                      <span>•</span>
                      <span>Verified: {getPersonTypeLabel(fingerprintResult.personType)}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="bg-white/80 border border-emerald-200 rounded-xl px-3 py-2">
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">Mobile</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">{fingerprintResult.customer.mobileNumber}</p>
                      </div>

                      <div className="bg-white/80 border border-emerald-200 rounded-xl px-3 py-2">
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">CNIC</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">{fingerprintResult.customer.cnic || '—'}</p>
                      </div>

                      <div className="bg-white/80 border border-emerald-200 rounded-xl px-3 py-2">
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">Address</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5 truncate">{fingerprintResult.customer.address || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-start">
              {fingerprintResult?.matched && fingerprintResult.customer && (
                <button
                  type="button"
                  onClick={() => handleViewProfile(fingerprintResult.customer._id)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View History
                </button>
              )}

              {!fingerprintSearching && (
                <button
                  type="button"
                  onClick={clearFingerprintResult}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-black transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          SECTION NAVIGATION SWITCHER TABS
      ====================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-1.5 bg-slate-200/60 rounded-2xl border border-slate-200">
        {sectionOptions.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSectionChange(item.id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-black transition-all ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================
          RENDER TAB CONTENT
      ====================================================== */}
      {activeSection === 'list' && renderCustomerList()}
      {activeSection === 'details' && renderCustomerSelector('details')}
      {activeSection === 'ledger' && renderCustomerSelector('ledger')}

      {/* PROFILE / COMPLETE LEDGER MODAL */}
      {renderProfileModal()}

      {/* DELETE CONFIRMATION MODAL */}
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
// REUSABLE SUB-COMPONENTS
// ======================================================

const InfoBox = ({ label, value, highlight }) => (
  <div className={`rounded-xl p-3 border transition-all ${
    highlight ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/70 border-slate-200/70'
  }`}>
    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-black">
      {label}
    </p>
    <p className={`text-xs font-black mt-1 break-words ${highlight ? 'text-indigo-600' : 'text-slate-800'}`}>
      {value || '—'}
    </p>
  </div>
);

const GuarantorCard = ({ title, guarantor }) => (
  <div className="border border-slate-200 rounded-2xl p-4.5 bg-slate-50/40">
    <div className="flex items-center justify-between mb-3.5">
      <h4 className="font-black text-xs text-slate-900 flex items-center gap-2">
        <User className="w-3.5 h-3.5 text-blue-600" />
        {title}
      </h4>

      {guarantor?.fingerprintFmd ? (
        <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
          <Fingerprint className="w-3 h-3" />
          Biometric Verified
        </span>
      ) : (
        <span className="text-[9px] font-bold text-slate-400">
          No Biometrics
        </span>
      )}
    </div>

    {!guarantor ? (
      <div className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl">
        No guarantor information recorded
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <InfoBox label="Name" value={guarantor.name} />
        <InfoBox label="Father's Name" value={guarantor.fatherName} />
        <InfoBox label="Mobile" value={guarantor.mobileNumber} />
        <InfoBox label="CNIC" value={guarantor.cnic} />
        <InfoBox label="Relation" value={guarantor.relation} />
        <InfoBox label="Address" value={guarantor.address} />
      </div>
    )}
  </div>
);

const MediaStatus = ({ label, available }) => (
  <div
    className={`rounded-2xl border p-4 transition-all ${
      available
        ? 'border-emerald-200 bg-emerald-50/50'
        : 'border-slate-200 bg-slate-50/50'
    }`}
  >
    <div className="flex items-center gap-2.5">
      {available ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
      ) : (
        <XCircle className="w-5 h-5 text-slate-400" />
      )}
      <div>
        <p className="text-xs font-black text-slate-800">{label}</p>
        <p className={`text-[10px] font-bold mt-0.5 ${available ? 'text-emerald-700' : 'text-slate-400'}`}>
          {available ? 'Verified & Stored' : 'Not Registered'}
        </p>
      </div>
    </div>
  </div>
);

const SummaryCard = ({ title, value, icon, danger }) => (
  <div
    className={`rounded-2xl border p-3.5 transition-all shadow-sm ${
      danger
        ? 'border-rose-200 bg-rose-50/60'
        : 'border-slate-200/80 bg-white'
    }`}
  >
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          danger ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-blue-600'
        }`}
      >
        {icon}
      </div>
      <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 truncate">
        {title}
      </span>
    </div>
    <p
      className={`text-sm sm:text-base font-black mt-2 truncate ${
        danger ? 'text-rose-600' : 'text-slate-900'
      }`}
    >
      {value}
    </p>
  </div>
);

const SectionHeader = ({ icon, title, count }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-blue-600">{icon}</span>
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
    </div>
    {count !== '' && (
      <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
        {count} Records
      </span>
    )}
  </div>
);

const StatusBadge = ({ status }) => {
  const normalized = String(status || '').toLowerCase();
  let classes = 'bg-slate-100 border-slate-200 text-slate-600';

  if (normalized === 'paid' || normalized === 'completed') {
    classes = 'bg-emerald-50 border-emerald-200 text-emerald-700';
  } else if (normalized === 'overdue') {
    classes = 'bg-rose-50 border-rose-200 text-rose-700';
  } else if (normalized === 'partially paid') {
    classes = 'bg-amber-50 border-amber-200 text-amber-700';
  } else if (normalized === 'pending' || normalized === 'active') {
    classes = 'bg-blue-50 border-blue-200 text-blue-700';
  }

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border ${classes}`}
    >
      {status || 'Unknown'}
    </span>
  );
};

const MiniValue = ({ label, value }) => (
  <div>
    <p className="text-[8px] uppercase tracking-wider text-slate-400 font-black">
      {label}
    </p>
    <p className="font-black text-xs text-slate-800 mt-0.5 truncate">{value}</p>
  </div>
);

const EmptyHistory = ({ text }) => (
  <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center mt-3">
    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
    <p className="text-xs text-slate-400 font-bold">{text}</p>
  </div>
);

export default Customers;