import React, { useEffect, useMemo, useState } from 'react';
import Customers from './Customers';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import {
  formatCnicSearchInput,
  matchesCnicSearch,
  matchesMobileSearch,
} from '../utils/cnicSearch';
import { useSettings } from '../context/SettingsContext';

import {
  Search,
  User,
  Phone,
  MapPin,
  CreditCard,
  CalendarDays,
  Package,
  Receipt,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Printer,
  X,
  BookOpen,
  Banknote,
  UserRound,
  Fingerprint,
  ShieldCheck,
  Users,
  FileDigit,
  Sparkles,
  ArrowRight,
  Building2,
  Calendar,
  Check,
} from 'lucide-react';

// =============================================================
// BASIC VALUE HELPERS
// =============================================================

const cleanValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return value;
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const cleaned = cleanValue(value);
    if (cleaned !== '' && cleaned !== null && cleaned !== undefined) {
      return cleaned;
    }
  }
  return '';
};

// =============================================================
// IMAGE HELPERS (Live URLs, Cloudinary, S3, Base64 & Uploads)
// =============================================================

const getBackendBaseUrl = () => {
  try {
    const base =
      api?.defaults?.baseURL ||
      import.meta?.env?.VITE_API_URL ||
      window.location.origin;

    const parsed = new URL(base, window.location.origin);
    return parsed.origin;
  } catch {
    return window.location.origin;
  }
};

const bufferToDataUri = (value) => {
  try {
    if (!value) return '';

    if (
      typeof value === 'object' &&
      value.type === 'Buffer' &&
      Array.isArray(value.data)
    ) {
      const bytes = new Uint8Array(value.data);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(
          ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
        );
      }
      return `data:image/jpeg;base64,${btoa(binary)}`;
    }

    if (
      typeof value === 'object' &&
      value.$binary &&
      typeof value.$binary.base64 === 'string'
    ) {
      return `data:image/jpeg;base64,${value.$binary.base64}`;
    }

    if (Array.isArray(value) && value.length > 0) {
      const bytes = new Uint8Array(value);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(
          ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
        );
      }
      return `data:image/jpeg;base64,${btoa(binary)}`;
    }

    return '';
  } catch (error) {
    console.error('Buffer image conversion failed:', error);
    return '';
  }
};

const isImageDataUri = (value) => {
  if (typeof value !== 'string') return false;
  return (
    value.startsWith('data:image/') ||
    value.startsWith('data:application/octet-stream')
  );
};

const resolveRawBase64 = (value) => {
  if (typeof value !== 'string') return '';
  const clean = value.trim().replace(/\s/g, '');
  if (!clean || clean.length < 50) return '';

  let mime = '';
  if (clean.startsWith('/9j/')) mime = 'image/jpeg';
  else if (clean.startsWith('iVBORw0KGgo')) mime = 'image/png';
  else if (clean.startsWith('R0lGOD')) mime = 'image/gif';
  else if (clean.startsWith('UklGR')) mime = 'image/webp';
  else if (clean.startsWith('Qk')) mime = 'image/bmp';

  if (!mime) return '';
  return `data:${mime};base64,${clean}`;
};

const normalizeImage = (value, depth = 0) => {
  if (!value || depth > 6) return '';

  if (typeof value === 'string') {
    let clean = value.trim();
    if (!clean) return '';

    clean = clean.replace(/\\/g, '/');

    if (isImageDataUri(clean) || clean.startsWith('blob:')) {
      return clean;
    }

    const backendOrigin = getBackendBaseUrl();

    if (clean.includes('localhost:') || clean.includes('127.0.0.1:')) {
      if (
        backendOrigin &&
        !backendOrigin.includes('localhost') &&
        !backendOrigin.includes('127.0.0.1')
      ) {
        clean = clean.replace(
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/,
          backendOrigin
        );
      }
    }

    if (
      window.location.protocol === 'https:' &&
      clean.startsWith('http://') &&
      !clean.includes('localhost') &&
      !clean.includes('127.0.0.1')
    ) {
      clean = clean.replace('http://', 'https://');
    }

    if (
      clean.startsWith('http://') ||
      clean.startsWith('https://') ||
      clean.startsWith('//')
    ) {
      return clean;
    }

    const rawBase64 = resolveRawBase64(clean);
    if (rawBase64) return rawBase64;

    if (
      clean.startsWith('/uploads/') ||
      clean.startsWith('/media/') ||
      clean.startsWith('/images/') ||
      clean.startsWith('/static/')
    ) {
      return `${backendOrigin}${clean}`;
    }

    if (
      clean.startsWith('uploads/') ||
      clean.startsWith('media/') ||
      clean.startsWith('images/') ||
      clean.startsWith('static/')
    ) {
      return `${backendOrigin}/${clean}`;
    }

    if (clean.startsWith('/api/uploads/')) {
      return `${backendOrigin}${clean.replace('/api', '')}`;
    }

    if (clean.startsWith('api/uploads/')) {
      return `${backendOrigin}/${clean.replace(/^api\//, '')}`;
    }

    const lowerClean = clean.toLowerCase();
    if (lowerClean.includes('/uploads/')) {
      const index = lowerClean.indexOf('/uploads/');
      if (index !== -1) {
        return `${backendOrigin}${clean.substring(index)}`;
      }
    }

    if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(clean)) {
      return `${backendOrigin}/uploads/${clean}`;
    }

    return '';
  }

  if (
    Array.isArray(value) ||
    (typeof value === 'object' && (value.type === 'Buffer' || value.$binary))
  ) {
    return bufferToDataUri(value);
  }

  if (typeof value === 'object' && value !== null) {
    const keys = [
      'liveImage',
      'secure_url',
      'secureUrl',
      'url',
      'imageUrl',
      'photoUrl',
      'image',
      'photo',
      'profileImage',
      'profileImageUrl',
      'customerImage',
      'customerImageUrl',
      'src',
      'path',
      'fileUrl',
      'fileURL',
      'publicUrl',
      'publicURL',
      'base64',
      'data',
      'buffer',
      'file',
    ];

    for (const key of keys) {
      if (!(key in value)) continue;
      const result = normalizeImage(value[key], depth + 1);
      if (result) return result;
    }
  }

  return '';
};

const resolveFirstImage = (...values) => {
  for (const value of values) {
    const result = normalizeImage(value);
    if (result) return result;
  }
  return '';
};

// =============================================================
// MAIN COMPONENT
// =============================================================

const CustomerLedger = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledger, setLedger] = useState(null);

  const [expandedSales, setExpandedSales] = useState({});
  const [expandedPlans, setExpandedPlans] = useState({});

  const currency = settings?.currency || 'PKR';

  const firstValue = (...values) => {
    for (const value of values) {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        return value;
      }
    }
    return '';
  };

  const formatMoney = (value) => {
    const number = Number(value || 0);
    return `${currency} ${number.toLocaleString('en-PK', {
      maximumFractionDigits: 0,
    })}`;
  };

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

  const formatDateTime = (date) => {
    if (!date) return '-';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getId = (value) => {
    if (!value) return null;
    if (typeof value === 'object') {
      return value._id || value.id || null;
    }
    return value;
  };

  const getCustomerName = (customer) => {
    if (!customer) return '';
    if (typeof customer === 'string') return customer;
    return firstValue(
      customer.name,
      customer.customerName,
      customer.fullName,
      customer.guarantorName,
      ''
    );
  };

  const getFatherName = (person) => {
    if (!person || typeof person !== 'object') return '';
    return firstValue(
      person.fatherName,
      person.father,
      person.father_name,
      person.guardianName
    );
  };

  const getMobile = (person) => {
    if (!person || typeof person !== 'object') return '';
    return firstValue(
      person.mobile,
      person.phone,
      person.mobileNumber,
      person.phoneNumber,
      person.contact,
      person.contactNumber
    );
  };

  const getCNIC = (person) => {
    if (!person || typeof person !== 'object') return '';
    return firstValue(
      person.cnic,
      person.CNIC,
      person.cnicNumber,
      person.nic,
      person.nationalId
    );
  };

  const getAddress = (person) => {
    if (!person || typeof person !== 'object') return '';
    return firstValue(
      person.address,
      person.fullAddress,
      person.homeAddress,
      person.residentialAddress
    );
  };

  const getCity = (person) => {
    if (!person || typeof person !== 'object') return '';
    return firstValue(person.city, person.town, person.area);
  };
const getPaymentScore = (customer) => {
  return customer?.paymentScore || null;
};
  const getPhoto = (person) => {
    if (!person || typeof person !== 'object') return '';
    return resolveFirstImage(
      person.liveImage,
      person.media?.liveImage,
      person.media?.photo,
      person.media?.photoUrl,
      person.media?.image,
      person.media?.imageUrl,
      person.images?.liveImage,
      person.images?.photo,
      person.images?.photoUrl,
      person.images?.image,
      person.images?.imageUrl,
      person.customerMedia?.liveImage,
      person.customerMedia?.photo,
      person.customerMedia?.photoUrl,
      person.photo,
      person.photoUrl,
      person.photoURL,
      person.photo_url,
      person.image,
      person.imageUrl,
      person.image_url,
      person.profileImage,
      person.profileImageUrl,
      person.customerPhoto,
      person.customerPhotoUrl,
      person.picture,
      person.avatar
    );
  };

  const getFingerprintImage = (person) => {
    if (!person || typeof person !== 'object') return '';
    return resolveFirstImage(
      person.fingerprintImage,
      person.fingerprintImageUrl,
      person.fingerprintPhoto,
      person.fingerprintPhotoUrl,
      person.fingerImage,
      person.fingerImageUrl,
      person.media?.fingerprintImage,
      person.media?.fingerprintImageUrl,
      person.fingerprint?.image,
      person.fingerprint?.imageUrl,
      person.fingerprint?.photo,
      person.fingerprintData?.image,
      person.fingerprintData?.imageUrl,
      person.thumbImage,
      person.thumbUrl,
      person.fingerprint
    );
  };

  const getFingerprintFmd = (person) => {
    if (!person || typeof person !== 'object') return '';
    return firstValue(
      person.fingerprintFmd,
      person.fmd,
      person.fingerprintTemplate,
      typeof person.fingerprintData === 'string'
        ? person.fingerprintData
        : '',
      typeof person.fingerprint === 'string' ? person.fingerprint : ''
    );
  };

  const getFingerprintCapturedAt = (person) => {
    if (!person || typeof person !== 'object') return '';
    return firstValue(
      person.liveImageCapturedAt,
      person.fingerprintCapturedAt,
      person.fingerprintDate,
      person.fingerprintCreatedAt,
      person.fingerprint?.capturedAt,
      person.fingerprintData?.capturedAt
    );
  };

  const hasFingerprint = (person) => {
    return Boolean(
      getFingerprintImage(person) ||
      getFingerprintFmd(person) ||
      getFingerprintCapturedAt(person)
    );
  };

  // =========================================================
  // GUARANTOR EXTRACTION
  // =========================================================

  const getGuarantor = (customer, number) => {
    if (!customer || typeof customer !== 'object') return {};

    const gNum = Number(number) === 2 ? 2 : 1;
    const word = gNum === 1 ? 'One' : 'Two';

    const fromArray =
      Array.isArray(customer.guarantors) && customer.guarantors.length >= gNum
        ? customer.guarantors[gNum - 1]
        : null;

    const fromKey =
      customer[`guarantor${gNum}`] ||
      customer[`guarantor${word}`] ||
      customer[`guarantor_${gNum}`] ||
      customer[`guarantor_${word}`] ||
      (gNum === 1
        ? customer.guarantor
        : customer.secondGuarantor || customer.second_guarantor);

    const nested =
      fromArray && typeof fromArray === 'object' && !Array.isArray(fromArray)
        ? fromArray
        : fromKey && typeof fromKey === 'object' && !Array.isArray(fromKey)
        ? fromKey
        : {};

    const prefixes =
      gNum === 1
        ? [
            'guarantor1',
            'guarantorOne',
            'guarantor_1',
            'guarantor_one',
            'g1',
            'guarantor',
          ]
        : [
            'guarantor2',
            'guarantorTwo',
            'guarantor_2',
            'guarantor_two',
            'g2',
            'secondGuarantor',
            'second_guarantor',
          ];

    const getFlat = (...fieldNames) => {
      for (const prefix of prefixes) {
        for (const field of fieldNames) {
          const camel = `${prefix}${
            field.charAt(0).toUpperCase() + field.slice(1)
          }`;
          if (
            customer[camel] !== undefined &&
            customer[camel] !== null &&
            String(customer[camel]).trim() !== ''
          ) {
            return String(customer[camel]).trim();
          }

          const snake = `${prefix}_${field}`;
          if (
            customer[snake] !== undefined &&
            customer[snake] !== null &&
            String(customer[snake]).trim() !== ''
          ) {
            return String(customer[snake]).trim();
          }

          const direct = `${prefix}${field}`.toLowerCase();
          for (const k of Object.keys(customer)) {
            if (
              k.toLowerCase() === direct &&
              customer[k] !== undefined &&
              customer[k] !== null &&
              String(customer[k]).trim() !== ''
            ) {
              return String(customer[k]).trim();
            }
          }
        }
      }
      return '';
    };

    const name = firstNonEmpty(
      nested.name,
      nested.fullName,
      nested.guarantorName,
      getFlat('name', 'fullName', 'guarantorName')
    );

    const fatherName = firstNonEmpty(
      nested.fatherName,
      nested.father,
      nested.father_name,
      nested.guardianName,
      getFlat('fatherName', 'father', 'father_name', 'guardianName')
    );

    const mobile = firstNonEmpty(
      nested.mobile,
      nested.phone,
      nested.mobileNumber,
      nested.phoneNumber,
      nested.contact,
      nested.contactNumber,
      getFlat(
        'mobile',
        'phone',
        'mobileNumber',
        'phoneNumber',
        'contact',
        'contactNumber',
        'cell'
      )
    );

    const cnic = firstNonEmpty(
      nested.cnic,
      nested.CNIC,
      nested.cnicNumber,
      nested.CNICNumber,
      nested.nic,
      nested.nationalId,
      nested.idCard,
      getFlat('cnic', 'CNIC', 'cnicNumber', 'nic', 'nationalId', 'idCard')
    );

    const address = firstNonEmpty(
      nested.address,
      nested.fullAddress,
      nested.homeAddress,
      nested.residentialAddress,
      getFlat('address', 'fullAddress', 'homeAddress', 'residentialAddress')
    );

    const city = firstNonEmpty(
      nested.city,
      nested.town,
      nested.area,
      getFlat('city', 'town', 'area')
    );

    const relationship = firstNonEmpty(
      nested.relationship,
      nested.relation,
      nested.relationWithCustomer,
      getFlat('relationship', 'relation', 'relationWithCustomer')
    );

    const photo = resolveFirstImage(
      nested.liveImage,
      nested.photo,
      nested.photoUrl,
      nested.image,
      nested.imageUrl,
      nested.profileImage,
      nested.profileImageUrl,
      nested.media?.liveImage,
      nested.media?.photo,
      nested.media?.photoUrl,
      getFlat(
        'liveImage',
        'photo',
        'photoUrl',
        'image',
        'imageUrl',
        'profileImage',
        'profileImageUrl'
      )
    );

    const fingerprintImage = resolveFirstImage(
      nested.fingerprintImage,
      nested.fingerprintImageUrl,
      nested.fingerprintPhoto,
      nested.fingerprintPhotoUrl,
      nested.fingerImage,
      nested.fingerImageUrl,
      nested.fingerprint?.image,
      nested.fingerprint?.imageUrl,
      getFlat(
        'fingerprintImage',
        'fingerprintImageUrl',
        'fingerprintPhoto',
        'fingerImage',
        'fingerImageUrl'
      )
    );

    const fingerprintFmd = firstNonEmpty(
      nested.fingerprintFmd,
      nested.fmd,
      nested.fingerprintTemplate,
      getFlat('fingerprintFmd', 'fmd', 'fingerprintTemplate')
    );

    const fingerprintCapturedAt = firstNonEmpty(
      nested.liveImageCapturedAt,
      nested.fingerprintCapturedAt,
      nested.fingerprintDate,
      nested.fingerprintCreatedAt,
      getFlat(
        'liveImageCapturedAt',
        'fingerprintCapturedAt',
        'fingerprintDate',
        'fingerprintCreatedAt'
      )
    );

    return {
      name,
      fatherName,
      mobile,
      cnic,
      address,
      city,
      relationship,
      photo,
      photoUrl: photo,
      fingerprintImage,
      fingerprintImageUrl: fingerprintImage,
      fingerprintFmd,
      fingerprintCapturedAt,
    };
  };

  // ---------------------------------------------------------
  // ROBUST INVOICE & SALES ID RESOLVERS (FIXED)
  // ---------------------------------------------------------

  const getInvoiceNumber = (sale) => {
    if (!sale) return '-';
    if (typeof sale === 'string') return sale;

    return firstValue(
      sale.saleId,
      sale.invoiceId,
      sale.invoiceNumber,
      sale.invoiceNo,
      sale.invoice,
      sale.orderNumber,
      sale.saleNo,
      sale.billNumber,
      sale.receiptNo,
      sale._id ? `INV-${String(sale._id).slice(-5).toUpperCase()}` : '',
      '-'
    );
  };

  const getPaymentInvoiceNumber = (payment) => {
    if (!payment) return '-';
    
    // Check linked sale object or ID
    const saleObj = payment.sale;
    let linkedSaleId = '';
    if (saleObj && typeof saleObj === 'object') {
      linkedSaleId = getInvoiceNumber(saleObj);
    } else if (typeof saleObj === 'string') {
      linkedSaleId = saleObj;
    }

    return firstValue(
      payment.saleId,
      linkedSaleId,
      payment.paymentId,
      payment.receiptNo,
      payment.invoiceNumber,
      payment.invoiceNo,
      payment.reference,
      '-'
    );
  };

  const getReturnInvoiceNumber = (returnItem) => {
    if (!returnItem) return '-';

    const saleObj = returnItem.sale;
    let linkedSaleId = '';
    if (saleObj && typeof saleObj === 'object') {
      linkedSaleId = getInvoiceNumber(saleObj);
    } else if (typeof saleObj === 'string') {
      linkedSaleId = saleObj;
    }

    return firstValue(
      returnItem.saleId,
      linkedSaleId,
      returnItem.returnId,
      returnItem.invoiceNumber,
      returnItem.invoiceNo,
      '-'
    );
  };

  const getProductName = (sale) => {
    if (!sale) return 'Unknown Product';
    if (typeof sale.product === 'object' && sale.product !== null) {
      return firstValue(
        sale.product.name,
        sale.product.productName,
        sale.product.title,
        'Unknown Product'
      );
    }
    return firstValue(
      sale.productName,
      sale.productTitle,
      sale.itemName,
      'Unknown Product'
    );
  };

  const getSaleDate = (sale) => {
    return firstValue(
      sale?.saleDate,
      sale?.createdAt,
      sale?.date,
      sale?.invoiceDate
    );
  };

  const getSaleTotal = (sale) => {
    return Number(
      sale?.finalTotal ??
      sale?.totalAmount ??
      sale?.grandTotal ??
      sale?.total ??
      sale?.amount ??
      sale?.saleAmount ??
      0
    );
  };

  const getPaymentAmount = (payment) => {
    return Number(
      payment?.amount ??
      payment?.paidAmount ??
      payment?.paymentAmount ??
      0
    );
  };

  const getReturnAmount = (returnItem) => {
    return Number(
      returnItem?.refundAmount ??
      returnItem?.amount ??
      returnItem?.totalRefund ??
      returnItem?.returnAmount ??
      0
    );
  };

  const getInstallmentCount = (plan) => {
    return Number(
      plan?.numberOfInstallments ??
      plan?.totalInstallments ??
      plan?.installmentsCount ??
      plan?.duration ??
      0
    );
  };

  const getPlanTotal = (plan) => {
    return Number(
      plan?.totalAmount ??
      plan?.grandTotal ??
      plan?.saleAmount ??
      plan?.amount ??
      0
    );
  };

  const getPlanPaid = (plan) => {
    return Number(
      plan?.paidAmount ??
      plan?.totalPaid ??
      plan?.amountPaid ??
      plan?.paid ??
      0
    );
  };

  const getPlanRemaining = (plan) => {
    if (plan?.remainingAmount !== undefined && plan?.remainingAmount !== null) {
      return Number(plan.remainingAmount);
    }
    if (plan?.remaining !== undefined && plan?.remaining !== null) {
      return Number(plan.remaining);
    }
    return Math.max(0, getPlanTotal(plan) - getPlanPaid(plan));
  };

  const getPlanStatus = (plan) => {
    const remaining = getPlanRemaining(plan);
    if (remaining <= 0) return 'Paid';
    const status = String(plan?.status || '').toLowerCase();
    if (status === 'completed') return 'Paid';
    if (status === 'overdue') return 'Overdue';
    return 'Active';
  };

  const isSameCustomer = (value, customerId) => {
    if (!value || !customerId) return false;
    const target = String(customerId);

    if (typeof value === 'object') {
      const ids = [
        value._id,
        value.id,
        value.customerId,
        value.customer?._id,
        value.customer?.id,
        value.customer?.customerId,
      ];
      return ids.some(
        (id) => id !== undefined && id !== null && String(id) === target
      );
    }
    return String(value) === target;
  };

  // =========================================================
  // LOAD CUSTOMERS
  // =========================================================

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await api.get('/customers');
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || 'Failed to load customers.'
        );
      }
      const data = Array.isArray(response.data.data)
        ? response.data.data
        : Array.isArray(response.data.data?.customers)
        ? response.data.data.customers
        : [];
      setCustomers(data);
    } catch (error) {
      console.error('Customer ledger customers error:', error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Failed to load customers.'
      );
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((customer) => {
      const values = [
        customer?.customerId,
        customer?.name,
        customer?.fatherName,
        customer?.mobile,
        customer?.phone,
        customer?.cnic,
        customer?.city,
        customer?.address,
      ];

      return (
        values.some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(query)
        ) ||
        matchesMobileSearch(getMobile(customer), query) ||
        matchesCnicSearch(getCNIC(customer), query)
      );
    });
  }, [customers, search]);

  // =========================================================
  // LOAD COMPLETE LEDGER
  // =========================================================

  const loadLedger = async (customer) => {
    const customerId = customer?._id || customer?.id;
    if (!customerId) {
      toast.error('Invalid customer.');
      return;
    }

    try {
      setSelectedCustomer(customer);
      setLedgerLoading(true);
      setLedger(null);

      // 1. CUSTOMER
      let customerData = { ...customer };
      try {
        const customerResponse = await api.get(`/customers/${customerId}`);
        if (customerResponse.data?.success) {
          const detail =
            customerResponse.data.data?.customer ||
            customerResponse.data.data?.data ||
            customerResponse.data.data ||
            {};
          customerData = { ...customer, ...detail };
        }
      } catch (err) {
        console.warn('Detailed customer fetch warning:', err);
      }

      // 2. SALES
      let allSales = [];
      try {
        const response = await api.get('/sales');
        if (response.data?.success && Array.isArray(response.data.data)) {
          allSales = response.data.data;
        }
      } catch (error) {
        console.error('Failed to load sales:', error);
      }

      const customerSales = allSales.filter(
        (sale) =>
          isSameCustomer(sale.customer, customerId) ||
          isSameCustomer(sale.customerId, customerId) ||
          isSameCustomer(sale.customer?._id, customerId)
      );

      // 3. PAYMENTS
      let allPayments = [];
      try {
        const response = await api.get('/payments');
        if (response.data?.success && Array.isArray(response.data.data)) {
          allPayments = response.data.data;
        }
      } catch (error) {
        console.error('Failed to load payments:', error);
      }

      const customerPayments = allPayments.filter(
        (payment) =>
          isSameCustomer(payment.customer, customerId) ||
          isSameCustomer(payment.customerId, customerId) ||
          isSameCustomer(payment.customer?._id, customerId)
      );

      // 4. RETURNS
      let allReturns = [];
      try {
        const response = await api.get('/returns');
        if (response.data?.success && Array.isArray(response.data.data)) {
          allReturns = response.data.data;
        }
      } catch (error) {
        console.error('Failed to load returns:', error);
      }

      const customerReturns = allReturns.filter(
        (returnItem) =>
          isSameCustomer(returnItem.customer, customerId) ||
          isSameCustomer(returnItem.customerId, customerId) ||
          isSameCustomer(returnItem.customer?._id, customerId)
      );

      // 5. INSTALLMENT PLANS
      let customerPlans = [];
      const possiblePlans =
        customerData?.installmentPlans ||
        customerData?.plans ||
        [];

      if (Array.isArray(possiblePlans)) {
        customerPlans = [...possiblePlans];
      }

      if (customerPlans.length === 0) {
        customerSales.forEach((sale) => {
          const plan =
            sale?.installmentPlan ||
            sale?.installment ||
            sale?.plan;
          if (plan && typeof plan === 'object') {
            customerPlans.push(plan);
          }
        });
      }

      const uniquePlans = [];
      const planIds = new Set();
      customerPlans.forEach((plan) => {
        const planId = getId(plan);
        if (planId) {
          if (!planIds.has(String(planId))) {
            planIds.add(String(planId));
            uniquePlans.push(plan);
          }
        } else {
          uniquePlans.push(plan);
        }
      });

      // 6. PLAN DETAILS
      const plansWithDetails = await Promise.all(
        uniquePlans.map(async (plan) => {
          const planId = getId(plan);
          if (!planId) return plan;

          try {
            const response = await api.get(`/installments/${planId}`);
            if (response.data?.success) {
              return {
                ...plan,
                ...response.data.data,
              };
            }
          } catch (error) {
            console.error(
              `Failed to load installment plan ${planId}:`,
              error
            );
          }
          return plan;
        })
      );

      // 7. CALCULATIONS
      const totalSales = customerSales.reduce(
        (sum, sale) => sum + getSaleTotal(sale),
        0
      );

      const totalPayments = customerPayments.reduce(
        (sum, payment) => sum + getPaymentAmount(payment),
        0
      );

      const totalReturns = customerReturns.reduce(
        (sum, returnItem) => sum + getReturnAmount(returnItem),
        0
      );

      const planOutstanding = plansWithDetails.reduce(
        (sum, plan) => sum + getPlanRemaining(plan),
        0
      );

      const outstanding =
        plansWithDetails.length > 0
          ? planOutstanding
          : Math.max(0, totalSales - totalPayments - totalReturns);

      const overduePlans = plansWithDetails.filter(
        (plan) => getPlanStatus(plan) === 'Overdue'
      );
      const activePlans = plansWithDetails.filter(
        (plan) => getPlanStatus(plan) === 'Active'
      );

      // DUE TODAY
      const today = new Date();
      const dueTodayPlans = [];

      plansWithDetails.forEach((plan) => {
        const schedule =
          plan?.schedule ||
          plan?.installments ||
          plan?.paymentSchedule ||
          [];

        if (!Array.isArray(schedule)) return;

        schedule.forEach((item) => {
          const dueDate =
            item?.dueDate ||
            item?.date ||
            item?.installmentDate;
          if (!dueDate) return;

          const date = new Date(dueDate);
          if (Number.isNaN(date.getTime())) return;

          const sameDay =
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();

          const amount = Number(
            item?.amount ??
            item?.dueAmount ??
            item?.installmentAmount ??
            0
          );
          const paid = Number(
            item?.paidAmount ?? item?.paid ?? 0
          );
          const remaining = Number(
            item?.remaining ??
            item?.remainingAmount ??
            Math.max(0, amount - paid)
          );

          if (sameDay && remaining > 0) {
            dueTodayPlans.push({
              ...item,
              plan,
              remaining,
            });
          }
        });
      });

      setLedger({
        customer: customerData,
        sales: customerSales,
        payments: customerPayments,
        returns: customerReturns,
        plans: plansWithDetails,
        totalSales,
        totalPayments,
        totalReturns,
        outstanding,
        overduePlans,
        activePlans,
        dueTodayPlans,
      });
    } catch (error) {
      console.error('Customer ledger error:', error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Failed to load customer ledger.'
      );
      setLedger(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  const clearLedger = () => {
    setSelectedCustomer(null);
    setLedger(null);
    setExpandedSales({});
    setExpandedPlans({});
    setSearch('');
  };

  const printLedger = () => {
    if (!ledger) {
      toast.error('Please select a customer first.');
      return;
    }
    window.print();
  };

  const toggleSale = (id) => {
    setExpandedSales((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const togglePlan = (id) => {
    setExpandedPlans((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // =========================================================
  // SAFE IMAGE COMPONENT
  // =========================================================

  const SafeImage = ({ src, alt, className, fallback }) => {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      setFailed(false);
    }, [src]);

    if (!src || failed) {
      return fallback || null;
    }

    return (
      <img
        src={src}
        alt={alt || ''}
        className={className}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  };

  // =========================================================
  // PERSON DETAILS CARD
  // =========================================================

  const PersonDetailsCard = ({
    person,
    title,
    subtitle,
    isGuarantor = false,
  }) => {
    const safePerson =
      person && typeof person === 'object' ? person : {};

    const photo = getPhoto(safePerson);
    const fingerprintImage = getFingerprintImage(safePerson);
    const name = getCustomerName(safePerson);
    const fatherName = getFatherName(safePerson);
    const mobile = getMobile(safePerson);
    const cnic = getCNIC(safePerson);
    const address = getAddress(safePerson);
    const city = getCity(safePerson);
    const paymentScore = getPaymentScore(customers);

    const relationship = firstValue(
      safePerson.relationship,
      safePerson.relation,
      safePerson.relationWithCustomer
    );

    const fingerprintCapturedAt = getFingerprintCapturedAt(safePerson);

    const hasPerson = Boolean(
      photo ||
      fingerprintImage ||
      getFingerprintFmd(safePerson) ||
      name ||
      fatherName ||
      mobile ||
      cnic ||
      address
    );

    return (
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between person-card-print">
        <div>
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 person-header-print">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border no-print ${
                  isGuarantor
                    ? 'bg-purple-50 text-purple-600 border-purple-100'
                    : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}
              >
                {isGuarantor ? (
                  <Users className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0">
                <h3 className="font-black text-slate-900 text-sm sm:text-base truncate print:text-[11px]">{title}</h3>
                {subtitle && (
                  <p className="text-xs text-slate-400 font-semibold truncate print:hidden">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {isGuarantor && (
              <span className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-black shrink-0 print:text-[8px] print:px-1.5 print:py-0.5">
                GUARANTOR
              </span>
            )}
          </div>

          {isGuarantor && !hasPerson ? (
            <div className="p-6 text-center">
              <Users className="w-6 h-6 mx-auto text-slate-300 no-print" />
              <p className="font-bold text-xs text-slate-500 mt-1 print:text-[9px]">
                No guarantor information recorded
              </p>
            </div>
          ) : (
            <div className="p-4 sm:p-5 person-body-print">
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                
                {/* PHOTO */}
                <div className="shrink-0 flex flex-col items-center">
                  <SafeImage
                    src={photo}
                    alt={name || 'Person Photo'}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-slate-200 shadow-sm bg-slate-50 print:w-16 print:h-16 print:rounded-lg"
                    fallback={
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300 print:w-16 print:h-16 print:rounded-lg">
                        <User className="w-8 h-8 print:w-6 print:h-6" />
                      </div>
                    }
                  />
                  <span className={`mt-1.5 inline-flex px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black border ${
                    photo ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-100 text-slate-400 border-slate-200'
                  } print:text-[7px] print:py-0`}>
                    {photo ? 'PHOTO SAVED' : 'NO PHOTO'}
                  </span>
                </div>

                {/* DETAILS */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-black text-slate-900 truncate text-center sm:text-left print:text-xs">
                    {name || 'N/A'}
                  </h4>

                  <div
                    className={`grid gap-2.5 sm:gap-3 mt-2.5 text-xs print:text-[8px] print:gap-1.5 print:mt-1 ${
                      isGuarantor
                        ? 'grid-cols-1 sm:grid-cols-2'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black block print:text-[6.5px]">
                        Father Name
                      </span>
                      <p className="font-bold text-slate-700 mt-0.5 truncate">
                        {fatherName || '—'}
                      </p>
                    </div>
                    

                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black block print:text-[6.5px]">
                        Mobile
                      </span>
                      <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1 truncate">
                        <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0 print:hidden" />
                        <span>{mobile || '—'}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black block print:text-[6.5px]">
                        CNIC
                      </span>
                      <p className="font-bold text-slate-700 mt-0.5 flex items-center gap-1 truncate">
                        <FileDigit className="w-3.5 h-3.5 text-emerald-500 shrink-0 print:hidden" />
                        <span>{cnic || '—'}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black block print:text-[6.5px]">
                        City
                      </span>
                      <p className="font-bold text-slate-700 mt-0.5 flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 print:hidden" />
                        <span>{city || '—'}</span>
                      </p>
                    </div>

                    {relationship && (
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black block print:text-[6.5px]">
                          Relationship
                        </span>
                        <p className="font-bold text-slate-700 mt-0.5 truncate">
                          {relationship}
                        </p>
                      </div>
                    )}

                    <div className={isGuarantor ? 'sm:col-span-2' : 'sm:col-span-2'}>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black block print:text-[6.5px]">
                        Residential Address
                      </span>
                      <p className="font-medium text-slate-700 mt-0.5 line-clamp-2">
                        {address || 'No residential address recorded.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* FINGERPRINT BOX */}
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-20 sm:w-24 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-center print:w-16 print:p-1 print:rounded-lg">
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-black block mb-1 print:text-[6.5px]">
                      Biometric
                    </span>

                    {fingerprintImage ? (
                      <SafeImage
                        src={fingerprintImage}
                        alt="Fingerprint"
                        className="w-full h-14 sm:h-16 object-contain rounded-xl bg-white border border-slate-200 print:h-10 print:rounded-md"
                        fallback={
                          <div className="w-full h-14 sm:h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center print:h-10">
                            <Fingerprint className="w-6 h-6 text-emerald-500" />
                          </div>
                        }
                      />
                    ) : (
                      <div className="w-full h-14 sm:h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center print:h-10">
                        <Fingerprint
                          className={`w-6 h-6 ${
                            hasFingerprint(safePerson)
                              ? 'text-emerald-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </div>
                    )}

                    <span
                      className={`mt-1 inline-block text-[8px] font-black ${
                        hasFingerprint(safePerson)
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                      } print:text-[6.5px]`}
                    >
                      {hasFingerprint(safePerson) ? 'SAVED' : 'NO PRINT'}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // =========================================================
  // MAIN RENDER
  // =========================================================

  return (
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO HEADER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white no-print">
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Back to Customers Directory"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">
                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                    Ledger Statement
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[9px] font-bold text-slate-400">
                    Financial Accounts & Print Slip
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                  Complete Customer Ledger
                </h1>
              </div>
            </div>

            {ledger && (
              <button
                type="button"
                onClick={printLedger}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/40 transition-all hover:scale-[1.02] active:scale-95 self-start sm:self-auto"
              >
                <Printer className="w-4 h-4" />
                <span>Print Complete Ledger Slip</span>
              </button>
            )}

          </div>
        </div>
      </section>
      

      {/* =====================================================
          CUSTOMER SELECTOR
      ====================================================== */}
      {!selectedCustomer && (
        <section className="no-print bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden animate-[pageEnter_0.3s_ease-out]">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-black text-slate-900 text-base sm:text-lg">
                  Select Customer for Ledger
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Search by customer name, ID, phone number or CNIC to load complete financial statement.
                </p>
              </div>

              <button
                type="button"
                onClick={loadCustomers}
                disabled={loadingCustomers}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-all disabled:opacity-50"
                title="Refresh Customer List"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingCustomers ? 'animate-spin' : ''}`}
                />
              </button>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(formatCnicSearchInput(e.target.value))}
                placeholder="Search by customer ID, name, mobile number, or CNIC..."
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
            {loadingCustomers ? (
              <div className="p-16 text-center">
                <div className="w-8 h-8 mx-auto border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-500 mt-3">Loading registered customers...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-16 text-center">
                <UserRound className="w-12 h-12 mx-auto text-slate-300" />
                <p className="font-black text-slate-700 text-sm mt-3">No matching customer found</p>
                <p className="text-xs text-slate-400 mt-0.5">Try searching with another name, phone number or CNIC.</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => {
                const customerPhoto = getPhoto(customer);

                return (
                  <button
                    key={customer._id || customer.id}
                    type="button"
                    onClick={() => loadLedger(customer)}
                    className="w-full text-left p-4 sm:p-5 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        {customerPhoto ? (
                          <SafeImage
                            src={customerPhoto}
                            alt=""
                            className="w-full h-full object-cover"
                            fallback={<User className="w-5 h-5" />}
                          />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                            {getCustomerName(customer) || 'Unnamed Customer'}
                          </span>

                          {customer.customerId && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black">
                              ID: {customer.customerId}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400 font-medium">
                         <span
  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-black border ${
    getPaymentScore(customer)?.score >= 90
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : getPaymentScore(customer)?.score >= 75
      ? 'bg-blue-50 border-blue-200 text-blue-700'
      : getPaymentScore(customer)?.score >= 60
      ? 'bg-amber-50 border-amber-200 text-amber-700'
      : getPaymentScore(customer)?.score >= 40
      ? 'bg-orange-50 border-orange-200 text-orange-700'
      : getPaymentScore(customer)?.score !== null &&
        getPaymentScore(customer)?.score !== undefined
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-slate-100 border-slate-200 text-slate-400'
  }`}
>
  <CreditCard className="w-3 h-3" />

  {getPaymentScore(customer)?.score !== null &&
  getPaymentScore(customer)?.score !== undefined ? (
    <>
      <span>Payment Score:</span>
      <strong className="font-black">
        {getPaymentScore(customer).score}/100
      </strong>

      <span className="opacity-70">
        • {getPaymentScore(customer).rating}
      </span>
    </>
  ) : (
    <span>
      Payment Score: {getPaymentScore(customer)?.rating || 'No History'}
    </span>
  )}
</span>
                          <span>Mobile: <strong className="text-slate-700 font-bold">{getMobile(customer) || '—'}</strong></span>
                          <span>Father: <strong className="text-slate-700 font-bold">{getFatherName(customer) || '—'}</strong></span>
                          
                          <span>CNIC: <strong className="text-slate-700 font-bold">{getCNIC(customer) || '—'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-all">
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          LOADING STATE
      ====================================================== */}
      {selectedCustomer && ledgerLoading && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center shadow-sm no-print">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 p-0.5 animate-spin flex items-center justify-center mx-auto">
            <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          </div>
          <h3 className="font-black text-slate-800 text-base mt-4">
            Loading Customer Ledger Statement
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Compiling sales, payments, installment schedules and outstanding balances...
          </p>
        </div>
      )}

      {/* =====================================================
          COMPLETE LEDGER & PRINT SLIP VIEW
      ====================================================== */}
      {selectedCustomer && ledger && !ledgerLoading && (
        <div id="customer-ledger-print" className="space-y-6">
          
          {/* PRINT-ONLY OFFICIAL HEADER */}
          <div className="print-only ledger-print-header">
            <div className="flex items-center justify-between pb-2 border-b-2 border-slate-900">
              <div>
                <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  {settings?.shopName || 'Electronics Shop'}
                </h1>
                <p className="text-[9px] font-bold text-slate-700">
                  COMPLETE CUSTOMER FINANCIAL LEDGER & RECOVERY STATEMENT
                </p>
                {settings?.shopAddress && (
                  <p className="text-[7.5px] text-slate-500 font-semibold">{settings.shopAddress} {settings.shopPhone ? `• Phone: ${settings.shopPhone}` : ''}</p>
                )}
              </div>

              <div className="text-right text-[8.5px] font-bold text-slate-800">
                <p>Customer: <strong>{getCustomerName(ledger.customer)}</strong></p>
                <p>Customer ID: <strong>{ledger.customer?.customerId || '—'}</strong></p>
                <p>Statement Date: {formatDateTime(new Date())}</p>
              </div>
            </div>
          </div>

          {/* 1. CUSTOMER DETAILS */}
          <PersonDetailsCard
            person={ledger.customer}
            title="Customer Profile Details"
            subtitle="Registered personal profile and contact verification"
          />

          {/* 2. GUARANTORS SECTION */}
          <div className="guarantor-section space-y-3">
            <div className="flex items-center gap-2 no-print">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <h3 className="font-black text-sm text-slate-900">Guarantor Verification (Zamanatdar)</h3>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 print-guarantor-grid">
              <PersonDetailsCard
                person={getGuarantor(ledger.customer, 1)}
                title="Guarantor 1 (Zamanatdar 1)"
                subtitle="Primary verification"
                isGuarantor
              />

              <PersonDetailsCard
                person={getGuarantor(ledger.customer, 2)}
                title="Guarantor 2 (Zamanatdar 2)"
                subtitle="Secondary verification"
                isGuarantor
              />
            </div>
          </div>

          {/* 3. FINANCIAL SUMMARY METRICS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print-summary-grid">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm print-summary-card">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 print:text-[7px]">Total Invoiced Deals</span>
                <Receipt className="w-4 h-4 text-blue-500 no-print" />
              </div>
              <p className="text-lg font-black text-slate-900 mt-1 print:text-[11px]">{formatMoney(ledger.totalSales)}</p>
              <p className="text-[10px] text-slate-400 font-semibold print:text-[6.5px]">{ledger.sales.length} Purchase Deals</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm print-summary-card">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 print:text-[7px]">Total Payments Received</span>
                <ArrowDownCircle className="w-4 h-4 text-emerald-500 no-print" />
              </div>
              <p className="text-lg font-black text-emerald-600 mt-1 print:text-[11px]">{formatMoney(ledger.totalPayments)}</p>
              <p className="text-[10px] text-slate-400 font-semibold print:text-[6.5px]">{ledger.payments.length} Payments Recorded</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm print-summary-card">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 print:text-[7px]">Net Outstanding Due</span>
                <Wallet className="w-4 h-4 text-rose-500 no-print" />
              </div>
              <p className="text-lg font-black text-rose-600 mt-1 print:text-[11px]">{formatMoney(ledger.outstanding)}</p>
              <p className="text-[10px] text-slate-400 font-semibold print:text-[6.5px]">Payable Balance</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm print-summary-card">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 print:text-[7px]">Total Returns / Refunds</span>
                <ArrowUpCircle className="w-4 h-4 text-amber-500 no-print" />
              </div>
              <p className="text-lg font-black text-amber-600 mt-1 print:text-[11px]">{formatMoney(ledger.totalReturns)}</p>
              <p className="text-[10px] text-slate-400 font-semibold print:text-[6.5px]">{ledger.returns.length} Returned Items</p>
            </div>
          </div>

          {/* 4. COMPLETE SALES HISTORY */}
          <section className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm ledger-section">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between print:p-2 print:border-b-2 print:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center no-print">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base print:text-[10px]">1. Complete Purchase & Sales History</h3>
                  <p className="text-[10px] text-slate-400 print:hidden">All products bought by customer</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-black print:text-[8px] print:bg-transparent print:border-none">
                {ledger.sales.length} Deals
              </span>
            </div>

            {ledger.sales.length === 0 ? (
              <div className="p-6 text-center text-xs font-semibold text-slate-400 print:text-[8px] print:p-2">
                No sales records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs print-table">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 print:bg-slate-100 print:text-[7px]">
                    <tr>
                      <th className="px-4 py-2.5">Invoice #</th>
                      <th className="px-4 py-2.5">Sale Date</th>
                      <th className="px-4 py-2.5">Product Name</th>
                      <th className="px-4 py-2.5 text-center">Type</th>
                      <th className="px-4 py-2.5 text-right">Deal Total</th>
                      <th className="px-4 py-2.5 text-right">Down Payment</th>
                      <th className="px-4 py-2.5 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ledger.sales.map((sale, idx) => (
                      <tr key={sale._id || idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2 font-black text-indigo-600 print:text-black">
                          {getInvoiceNumber(sale)}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{formatDate(getSaleDate(sale))}</td>
                        <td className="px-4 py-2 font-bold text-slate-800">{getProductName(sale)}</td>
                        <td className="px-4 py-2 text-center capitalize">{firstValue(sale?.paymentType, sale?.saleType, 'Cash')}</td>
                        <td className="px-4 py-2 text-right font-black text-slate-900">{formatMoney(getSaleTotal(sale))}</td>
                        <td className="px-4 py-2 text-right font-bold text-emerald-600">{formatMoney(sale?.downPayment || 0)}</td>
                        <td className="px-4 py-2 text-right font-black text-rose-600">{formatMoney(sale?.remainingBalance ?? sale?.remainingAmount ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 5. INSTALLMENT PLANS & COMPLETE SCHEDULES */}
          <section className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm ledger-section">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between print:p-2 print:border-b-2 print:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center no-print">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base print:text-[10px]">2. Installment Plans & Complete Payment Schedules</h3>
                  <p className="text-[10px] text-slate-400 print:hidden">Installments schedule breakdown</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-black print:text-[8px] print:bg-transparent print:border-none">
                {ledger.plans.length} Plans
              </span>
            </div>

            {ledger.plans.length === 0 ? (
              <div className="p-6 text-center text-xs font-semibold text-slate-400 print:text-[8px] print:p-2">
                No installment financing plans recorded.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {ledger.plans.map((plan, planIdx) => {
                  const planId = getId(plan) || `plan-${planIdx}`;
                  const total = getPlanTotal(plan);
                  const paid = getPlanPaid(plan);
                  const remaining = getPlanRemaining(plan);
                  const status = getPlanStatus(plan);
                  const schedule = plan?.schedule || plan?.installments || plan?.paymentSchedule || [];

                  // Get linked invoice
                  const planInvoice = firstValue(
                    plan?.planId,
                    plan?.sale?.saleId,
                    plan?.sale?.invoiceNumber,
                    plan?.saleId,
                    `PLAN-#${planIdx + 1}`
                  );

                  return (
                    <div key={planId} className="p-4 sm:p-5 print:p-2 print-plan-box">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 print:mb-1.5">
                        <div>
                          <span className="font-black text-xs sm:text-sm text-slate-900 print:text-[9px]">
                            Plan #{planIdx + 1}: {plan?.planName || `${getInstallmentCount(plan)} Months Financing Plan`} [Ref: <strong>{planInvoice}</strong>]
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold ml-2 print:text-[7.5px]">
                            (Status: <strong className={status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}>{status}</strong>)
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-700 print:text-[7.5px]">
                          Total: <strong>{formatMoney(total)}</strong> • Paid: <strong className="text-emerald-600">{formatMoney(paid)}</strong> • Remaining: <strong className="text-rose-600">{formatMoney(remaining)}</strong>
                        </div>
                      </div>

                      {Array.isArray(schedule) && schedule.length > 0 ? (
                        <div className="overflow-x-auto border border-slate-200 rounded-xl print:rounded-none">
                          <table className="w-full text-left text-xs print-table">
                            <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-200 print:bg-slate-100 print:text-[7px]">
                              <tr>
                                <th className="px-3 py-1.5 text-center">#</th>
                                <th className="px-3 py-1.5">Due Date</th>
                                <th className="px-3 py-1.5 text-right">Installment Amount</th>
                                <th className="px-3 py-1.5 text-right">Paid Amount</th>
                                <th className="px-3 py-1.5 text-right">Remaining Due</th>
                                <th className="px-3 py-1.5 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {schedule.map((item, itemIdx) => (
                                <tr key={item?._id || itemIdx} className="hover:bg-slate-50/60">
                                  <td className="px-3 py-1 text-center font-black text-slate-700">#{itemIdx + 1}</td>
                                  <td className="px-3 py-1 font-bold text-blue-600">{formatDate(item?.dueDate || item?.date)}</td>
                                  <td className="px-3 py-1 text-right font-bold text-slate-800">{formatMoney(item?.amount || 0)}</td>
                                  <td className="px-3 py-1 text-right font-black text-emerald-600">{formatMoney(item?.paidAmount || item?.paid || 0)}</td>
                                  <td className="px-3 py-1 text-right font-black text-rose-600">{formatMoney(item?.remainingAmount || item?.remaining || 0)}</td>
                                  <td className="px-3 py-1 text-center font-black text-[9px] print:text-[6.5px]">
                                    <span className={`px-2 py-0.5 rounded-full ${
                                      item?.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : item?.status === 'Overdue' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                                    }`}>
                                      {item?.status || 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-2">No schedule breakdown available.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 6. COMPLETE PAYMENTS RECEIPTS */}
          <section className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm ledger-section">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between print:p-2 print:border-b-2 print:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center no-print">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base print:text-[10px]">3. Complete Payments & Recovery Receipts</h3>
                  <p className="text-[10px] text-slate-400 print:hidden">All received transactions</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black print:text-[8px] print:bg-transparent print:border-none">
                {ledger.payments.length} Receipts
              </span>
            </div>

            {ledger.payments.length === 0 ? (
              <div className="p-6 text-center text-xs font-semibold text-slate-400 print:text-[8px] print:p-2">
                No payment receipts recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs print-table">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 print:bg-slate-100 print:text-[7px]">
                    <tr>
                      <th className="px-4 py-2">Receipt Date</th>
                      <th className="px-4 py-2">Reference / Invoice #</th>
                      <th className="px-4 py-2">Payment Method</th>
                      <th className="px-4 py-2">Notes</th>
                      <th className="px-4 py-2 text-right">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ledger.payments.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-1.5 text-slate-600">{formatDateTime(p?.paymentDate || p?.date || p?.createdAt)}</td>
                        <td className="px-4 py-1.5 font-bold text-slate-800">{getPaymentInvoiceNumber(p)}</td>
                        <td className="px-4 py-1.5 text-slate-600 capitalize">{p?.paymentMethod || 'Cash'}</td>
                        <td className="px-4 py-1.5 text-slate-400">{p?.note || p?.notes || '—'}</td>
                        <td className="px-4 py-1.5 text-right font-black text-emerald-600">+{formatMoney(getPaymentAmount(p))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 7. RETURNS HISTORY */}
          {ledger.returns.length > 0 && (
            <section className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm ledger-section">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between print:p-2 print:border-b-2 print:border-slate-800">
                <h3 className="font-black text-slate-900 text-sm sm:text-base print:text-[10px]">4. Product Return / Refund Records</h3>
                <span className="text-xs font-black text-rose-600 print:text-[8px]">{ledger.returns.length} Returns</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs print-table">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-200 print:bg-slate-100 print:text-[7px]">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Invoice #</th>
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2">Reason</th>
                      <th className="px-4 py-2 text-right">Refund Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ledger.returns.map((ret, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-1.5 text-slate-600">{formatDate(ret?.returnDate || ret?.date)}</td>
                        <td className="px-4 py-1.5 font-bold">{getReturnInvoiceNumber(ret)}</td>
                        <td className="px-4 py-1.5 font-bold text-slate-800">{firstValue(ret?.product?.name, ret?.productName, '—')}</td>
                        <td className="px-4 py-1.5 text-slate-400">{ret?.reason || '—'}</td>
                        <td className="px-4 py-1.5 text-right font-black text-rose-600">-{formatMoney(getReturnAmount(ret))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 8. FINAL OUTSTANDING BALANCE SUMMARY CARD */}
          <div className="bg-white border border-amber-300 rounded-3xl p-5 sm:p-6 shadow-sm final-balance">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block print:text-[7.5px]">
                  Net Payable Outstanding Balance
                </span>
                <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1 print:text-base">
                  {formatMoney(ledger.outstanding)}
                </p>
                <p className="text-xs text-slate-400 font-semibold mt-1 print:text-[7px]">
                  Total Invoiced: {formatMoney(ledger.totalSales)} • Total Received: {formatMoney(ledger.totalPayments)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {ledger.outstanding <= 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs border border-emerald-200 print:text-[8px] print:px-2 print:py-1">
                    <CheckCircle2 className="w-4 h-4 no-print" />
                    Account All Clear
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 font-black text-xs border border-amber-200 print:text-[8px] print:px-2 print:py-1">
                    <Clock className="w-4 h-4 no-print" />
                    Payment Pending / Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 9. PRINT-ONLY OFFICIAL SIGNATURES BLOCK */}
          <div className="print-only print-signatures-block">
            <div className="grid grid-cols-2 gap-8 pt-8">
              <div className="text-center">
                <div className="border-t border-slate-900 pt-1.5 font-bold text-[8.5px]">
                  Customer Signature / Thumb Impression
                </div>
                <p className="text-[7px] text-slate-400">I confirm the above balance and payment schedule.</p>
              </div>

              <div className="text-center">
                <div className="border-t border-slate-900 pt-1.5 font-bold text-[8.5px]">
                  Authorized Shop Stamp & Signature
                </div>
                <p className="text-[7px] text-slate-400">{settings?.shopName || 'Electronics Shop'}</p>
              </div>
            </div>
          </div>

          {/* SCREEN ACTIONS */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={clearLedger}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-700 transition-all"
            >
              ← Select Another Customer
            </button>

            <button
              type="button"
              onClick={() => navigate(`/customers/${ledger.customer?._id}`)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all shadow-md"
            >
              Open Full Customer Profile →
            </button>
          </div>

        </div>
      )}

      {/* =====================================================
          COMPREHENSIVE PRINT STYLESHEET
      ====================================================== */}
      <style>{`
        .print-only {
          display: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 6mm;
          }

          html, body, #root, main {
            background: #ffffff !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            position: static !important;
            color: #000000 !important;
            font-size: 8px !important;
          }

          body * {
            visibility: hidden !important;
          }

          #customer-ledger-print,
          #customer-ledger-print * {
            visibility: visible !important;
          }

          #customer-ledger-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
          }

          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .person-card-print {
            border: 1px solid #94a3b8 !important;
            border-radius: 4px !important;
            margin-bottom: 4px !important;
          }

          .person-header-print {
            padding: 3px 6px !important;
            background: #f8fafc !important;
            border-bottom: 1px solid #cbd5e1 !important;
          }

          .person-body-print {
            padding: 4px 6px !important;
          }

          .print-guarantor-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 4px !important;
          }

          .print-summary-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 4px !important;
            margin-top: 4px !important;
          }

          .print-summary-card {
            border: 1px solid #94a3b8 !important;
            border-radius: 4px !important;
            padding: 3px 5px !important;
          }

          .ledger-section {
            margin-top: 5px !important;
            border: 1px solid #94a3b8 !important;
            border-radius: 4px !important;
          }

          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 7.5px !important;
            margin: 0 !important;
          }

          .print-table th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border: 0.5px solid #94a3b8 !important;
            padding: 2.5px 3.5px !important;
            font-weight: 900 !important;
            color: #0f172a !important;
          }

          .print-table td {
            border: 0.5px solid #cbd5e1 !important;
            padding: 2.5px 3.5px !important;
            color: #0f172a !important;
          }

          .print-plan-box {
            padding: 3px 4px !important;
            border-bottom: 0.5px solid #cbd5e1 !important;
          }

          .final-balance {
            margin-top: 5px !important;
            padding: 4px 6px !important;
            border: 1.5px solid #d97706 !important;
            border-radius: 4px !important;
            break-inside: avoid !important;
          }

          .print-signatures-block {
            margin-top: 10px !important;
            break-inside: avoid !important;
          }

          .guarantor-section,
          .print-summary-grid,
          .final-balance,
          .print-signatures-block {
            break-inside: avoid !important;
          }
        }
      `}</style>

    </div>
  );
};

export default CustomerLedger;