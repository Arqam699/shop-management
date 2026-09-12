
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatCnicSearchInput, matchesCnicSearch, matchesMobileSearch } from '../utils/cnicSearch';
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

    // If URL contains localhost saved in DB but app is on live URL
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

    // Upgrade HTTP to HTTPS for remote live images
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

  const currency = settings?.currency || 'Rs.';

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

  // ---------------------------------------------------------
  // CUSTOMER PHOTO & FINGERPRINT
  // ---------------------------------------------------------

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
  // GUARANTOR EXTRACTION (Strictly Isolated Per Guarantor)
  // =========================================================

  const getGuarantor = (customer, number) => {
    if (!customer || typeof customer !== 'object') return {};

    const gNum = Number(number) === 2 ? 2 : 1;
    const word = gNum === 1 ? 'One' : 'Two';

    // 1. Array format: customer.guarantors[0] / customer.guarantors[1]
    const fromArray =
      Array.isArray(customer.guarantors) && customer.guarantors.length >= gNum
        ? customer.guarantors[gNum - 1]
        : null;

    // 2. Object format: customer.guarantor1 / customer.guarantorOne / customer.guarantor_1
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

    // Flat field prefixes strictly for this guarantor number
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

    // ONLY guarantor mobile, NEVER fallback to customer mobile
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

    // ONLY guarantor CNIC, NEVER fallback to customer CNIC
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
  // SALES & INSTALLMENTS HELPERS
  // ---------------------------------------------------------

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

  const getInvoiceNumber = (sale) => {
    return firstValue(
      sale?.invoiceNumber,
      sale?.invoiceNo,
      sale?.invoiceId,
      sale?.saleNumber,
      sale?.orderNumber,
      '-'
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

      return values.some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      ) ||
        matchesMobileSearch(getMobile(customer), query) ||
        matchesCnicSearch(getCNIC(customer), query);
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
  // PERSON DETAILS CARD (Fixed Responsive Layout - No PC Overlap)
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
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
        {/* HEADER */}
        <div>
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isGuarantor
                    ? 'bg-purple-50 text-purple-600'
                    : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {isGuarantor ? (
                  <Users className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0">
                <h3 className="font-black text-slate-800 truncate">{title}</h3>
                {subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {isGuarantor && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 text-[10px] font-black shrink-0">
                GUARANTOR
              </span>
            )}
          </div>

          {/* CONTENT */}
          {isGuarantor && !hasPerson ? (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold text-slate-500 mt-2">
                No guarantor information found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                No registered details, photo or fingerprint.
              </p>
            </div>
          ) : (
            <div className="p-5">
              <div className="flex flex-col sm:flex-row gap-5">
                {/* PHOTO */}
                <div className="shrink-0 flex flex-col items-center">
                  <SafeImage
                    src={photo}
                    alt={name || 'Person Photo'}
                    className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-sm bg-slate-50"
                    fallback={
                      <div className="w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                        <User className="w-9 h-9" />
                      </div>
                    }
                  />
                  <div className="mt-2 text-center text-[10px] font-bold text-slate-400">
                    {photo ? 'PHOTO SAVED' : 'NO PHOTO'}
                  </div>
                </div>

                {/* DETAILS - 2 COLUMNS IN GUARANTOR TO PREVENT OVERRIDE/OVERLAP ON PC */}
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-black text-slate-800 truncate">
                    {name || 'N/A'}
                  </div>

                  <div
                    className={`grid gap-3.5 mt-3.5 ${
                      isGuarantor
                        ? 'grid-cols-1 sm:grid-cols-2'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Father Name
                      </div>
                      <div className="font-semibold text-sm text-slate-700 mt-0.5 truncate">
                        {fatherName || 'N/A'}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Mobile
                      </div>
                      <div className="font-semibold text-sm text-slate-700 mt-0.5 flex items-center gap-1.5 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{mobile || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        CNIC
                      </div>
                      <div className="font-semibold text-sm text-slate-700 mt-0.5 flex items-center gap-1.5 min-w-0">
                        <FileDigit className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cnic || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        City
                      </div>
                      <div className="font-semibold text-sm text-slate-700 mt-0.5 flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{city || 'N/A'}</span>
                      </div>
                    </div>

                    {relationship && (
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          Relationship
                        </div>
                        <div className="font-semibold text-sm text-slate-700 mt-0.5 truncate">
                          {relationship}
                        </div>
                      </div>
                    )}

                    <div
                      className={`min-w-0 ${
                        isGuarantor ? 'sm:col-span-2' : 'sm:col-span-2'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Address
                      </div>
                      <div className="font-semibold text-sm text-slate-700 mt-0.5 line-clamp-2">
                        {address || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FINGERPRINT */}
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-28 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 text-center mb-2">
                      Fingerprint
                    </div>

                    {fingerprintImage ? (
                      <SafeImage
                        src={fingerprintImage}
                        alt="Fingerprint"
                        className="w-full h-20 object-contain rounded-xl bg-white border border-slate-200"
                        fallback={
                          <div className="w-full h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                            <Fingerprint className="w-9 h-9 text-emerald-500" />
                          </div>
                        }
                      />
                    ) : (
                      <div className="w-full h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                        <Fingerprint
                          className={`w-9 h-9 ${
                            hasFingerprint(safePerson)
                              ? 'text-emerald-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </div>
                    )}

                    <div
                      className={`mt-2 text-center text-[9px] font-black ${
                        hasFingerprint(safePerson)
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {hasFingerprint(safePerson)
                        ? 'FINGERPRINT SAVED'
                        : 'NO FINGERPRINT'}
                    </div>

                    {fingerprintCapturedAt && (
                      <div className="text-[8px] text-center text-slate-400 mt-1 leading-tight">
                        {formatDate(fingerprintCapturedAt)}
                      </div>
                    )}
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
  // RENDER
  // =========================================================

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <BookOpen className="w-5 h-5" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800">
              Complete Customer Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Complete customer profile, guarantors, sales, payments and installments
            </p>
          </div>
        </div>

        {ledger && (
          <button
            type="button"
            onClick={printLedger}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-sm transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Complete Ledger
          </button>
        )}
      </div>

      {/* CUSTOMER SELECTOR */}
      {!selectedCustomer && (
        <div className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-black text-slate-800 text-lg">
                  Select Customer
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Search and select a customer to open their complete ledger.
                </p>
              </div>

              <button
                type="button"
                onClick={loadCustomers}
                disabled={loadingCustomers}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center transition"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    loadingCustomers ? 'animate-spin' : ''
                  }`}
                />
              </button>
            </div>

            <div className="relative mt-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(formatCnicSearchInput(e.target.value))}
                placeholder="Search by customer ID, name, father name, mobile number, or CNIC..."
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {loadingCustomers ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-7 h-7 mx-auto text-indigo-500 animate-spin" />
                <p className="text-sm text-slate-500 mt-3">Loading customers...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-12 text-center">
                <UserRound className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600 mt-3">No customers found</p>
                <p className="text-xs text-slate-400 mt-1">Try another search.</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => {
                const customerPhoto = getPhoto(customer);

                return (
                  <button
                    key={customer._id || customer.id}
                    type="button"
                    onClick={() => loadLedger(customer)}
                    className="w-full text-left p-4 sm:p-5 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
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
                            <span className="font-black text-slate-800">
                              {getCustomerName(customer) || 'N/A'}
                            </span>

                            {customer.customerId && (
                              <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-black">
                                {customer.customerId}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-400">
                            <span>
                              Mobile:{' '}
                              <b className="text-slate-600">
                                {getMobile(customer) || '-'}
                              </b>
                            </span>
                            <span>
                              Father:{' '}
                              <b className="text-slate-600">
                                {getFatherName(customer) || '-'}
                              </b>
                            </span>
                            <span>
                              CNIC:{' '}
                              <b className="text-slate-600">
                                {getCNIC(customer) || '-'}
                              </b>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* LOADING */}
      {selectedCustomer && ledgerLoading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm no-print">
          <RefreshCw className="w-8 h-8 mx-auto text-indigo-600 animate-spin" />
          <p className="font-bold text-slate-700 mt-4">
            Loading complete customer ledger...
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Fetching customer profile, guarantors, sales, payments and installments.
          </p>
        </div>
      )}

      {/* COMPLETE LEDGER */}
      {selectedCustomer && ledger && !ledgerLoading && (
        <div id="customer-ledger-print">
          {/* PRINT HEADER */}
          <div className="print-only ledger-print-header">
            <div>
              <div className="ledger-print-title">CUSTOMER COMPLETE LEDGER</div>
              <div className="ledger-print-subtitle">
                {getCustomerName(ledger.customer)} •{' '}
                {ledger.customer?.customerId || '-'}
              </div>
            </div>

            <div className="ledger-print-date">
              Printed: {formatDateTime(new Date())}
            </div>
          </div>

          {/* CUSTOMER */}
          <PersonDetailsCard
            person={ledger.customer}
            title="Customer Information"
            subtitle="Complete registered customer details"
          />

          {/* GUARANTORS */}
          <div className="mt-5 guarantor-section">
            <div className="flex items-center gap-2 mb-3 no-print">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <div>
                <h2 className="font-black text-slate-800">
                  Guarantor Information
                </h2>
                <p className="text-xs text-slate-400">
                  Complete guarantor records including photos and fingerprints
                </p>
              </div>
            </div>

            <div className="print-only print-section-title">
              GUARANTOR / VERIFICATION DETAILS
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 print-guarantor-grid">
              <PersonDetailsCard
                person={getGuarantor(ledger.customer, 1)}
                title="Guarantor 1"
                subtitle="Primary guarantor"
                isGuarantor
              />

              <PersonDetailsCard
                person={getGuarantor(ledger.customer, 2)}
                title="Guarantor 2"
                subtitle="Secondary guarantor"
                isGuarantor
              />
            </div>
          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 print-summary-grid">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print-summary-card">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Total Sales
                </div>
                <Receipt className="w-5 h-5 text-indigo-500 no-print" />
              </div>

              <div className="text-xl font-black text-slate-800 mt-2">
                {formatMoney(ledger.totalSales)}
              </div>

              <div className="text-xs text-slate-400 mt-1">
                {ledger.sales.length} sale{ledger.sales.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print-summary-card">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Total Paid
                </div>
                <ArrowDownCircle className="w-5 h-5 text-emerald-500 no-print" />
              </div>

              <div className="text-xl font-black text-emerald-600 mt-2">
                {formatMoney(ledger.totalPayments)}
              </div>

              <div className="text-xs text-slate-400 mt-1">
                {ledger.payments.length} payment
                {ledger.payments.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print-summary-card">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Outstanding
                </div>
                <Wallet className="w-5 h-5 text-amber-500 no-print" />
              </div>

              <div className="text-xl font-black text-amber-600 mt-2">
                {formatMoney(ledger.outstanding)}
              </div>

              <div className="text-xs text-slate-400 mt-1">Current balance</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print-summary-card">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Returns
                </div>
                <ArrowUpCircle className="w-5 h-5 text-red-500 no-print" />
              </div>

              <div className="text-xl font-black text-red-600 mt-2">
                {formatMoney(ledger.totalReturns)}
              </div>

              <div className="text-xs text-slate-400 mt-1">
                {ledger.returns.length} return
                {ledger.returns.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* STATUS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 print-status-grid">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print-status-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center no-print">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Overdue Plans</div>
                  <div className="font-black text-lg text-slate-800">
                    {ledger.overduePlans.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print-status-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center no-print">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Active Plans</div>
                  <div className="font-black text-lg text-slate-800">
                    {ledger.activePlans.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print-status-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center no-print">
                  <CalendarDays className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Due Today</div>
                  <div className="font-black text-lg text-slate-800">
                    {ledger.dueTodayPlans.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SALES */}
          <section className="mt-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm ledger-section">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-500 no-print" />
                  <h2 className="font-black text-slate-800 text-lg">
                    Complete Sales History
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Every product purchased by this customer
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">
                {ledger.sales.length}
              </span>
            </div>

            {ledger.sales.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                No sales history found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {ledger.sales.map((sale, index) => {
                  const saleId = sale?._id || sale?.id || `sale-${index}`;
                  const expanded = expandedSales[saleId];

                  return (
                    <div key={saleId}>
                      <button
                        type="button"
                        onClick={() => toggleSale(saleId)}
                        className="w-full text-left p-4 sm:p-5 hover:bg-slate-50 transition no-print"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <Receipt className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">
                                {getProductName(sale)}
                              </div>

                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                                <span>
                                  Invoice:{' '}
                                  <b className="text-slate-600">
                                    {getInvoiceNumber(sale)}
                                  </b>
                                </span>
                                <span>{formatDate(getSaleDate(sale))}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-black text-slate-800">
                              {formatMoney(getSaleTotal(sale))}
                            </div>
                            {expanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400 ml-auto mt-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 ml-auto mt-1" />
                            )}
                          </div>
                        </div>
                      </button>

                      {expanded && (
                        <div className="px-4 pb-5 no-print">
                          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <div className="text-[10px] uppercase text-slate-400 font-bold">
                                  Invoice
                                </div>
                                <div className="font-bold text-slate-700 mt-1">
                                  {getInvoiceNumber(sale)}
                                </div>
                              </div>

                              <div>
                                <div className="text-[10px] uppercase text-slate-400 font-bold">
                                  Sale Date
                                </div>
                                <div className="font-semibold text-slate-700 mt-1">
                                  {formatDateTime(getSaleDate(sale))}
                                </div>
                              </div>

                              <div>
                                <div className="text-[10px] uppercase text-slate-400 font-bold">
                                  Payment Type
                                </div>
                                <div className="font-semibold text-slate-700 mt-1 capitalize">
                                  {firstValue(
                                    sale?.paymentType,
                                    sale?.paymentMethod,
                                    sale?.saleType,
                                    '-'
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="text-[10px] uppercase text-slate-400 font-bold">
                                  Total
                                </div>
                                <div className="font-black text-indigo-600 mt-1">
                                  {formatMoney(getSaleTotal(sale))}
                                </div>
                              </div>
                            </div>

                            {sale?.downPayment !== undefined && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
                                <div>
                                  <div className="text-[10px] uppercase text-slate-400 font-bold">
                                    Down Payment
                                  </div>
                                  <div className="font-bold text-slate-700 mt-1">
                                    {formatMoney(sale.downPayment)}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[10px] uppercase text-slate-400 font-bold">
                                    Remaining
                                  </div>
                                  <div className="font-bold text-amber-600 mt-1">
                                    {formatMoney(
                                      sale.remainingAmount ??
                                        sale.remaining ??
                                        0
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[10px] uppercase text-slate-400 font-bold">
                                    Installments
                                  </div>
                                  <div className="font-bold text-slate-700 mt-1">
                                    {sale.numberOfInstallments ??
                                      sale.totalInstallments ??
                                      '-'}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* PRINT SALE ROW */}
                      <div className="print-only print-sale-row">
                        <span>
                          <b>{getProductName(sale)}</b>
                        </span>
                        <span>{getInvoiceNumber(sale)}</span>
                        <span>{formatDate(getSaleDate(sale))}</span>
                        <span>
                          {firstValue(
                            sale?.paymentType,
                            sale?.paymentMethod,
                            sale?.saleType,
                            '-'
                          )}
                        </span>
                        <span className="text-right">
                          {formatMoney(getSaleTotal(sale))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* INSTALLMENTS */}
          <section className="mt-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm ledger-section">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-500 no-print" />
                  <h2 className="font-black text-slate-800 text-lg">
                    Installment Plans
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Complete plan and installment schedule
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-black">
                {ledger.plans.length}
              </span>
            </div>

            {ledger.plans.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                No installment plans found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {ledger.plans.map((plan, index) => {
                  const planId = getId(plan) || `plan-${index}`;
                  const expanded = expandedPlans[planId];
                  const total = getPlanTotal(plan);
                  const paid = getPlanPaid(plan);
                  const remaining = getPlanRemaining(plan);
                  const status = getPlanStatus(plan);
                  const schedule =
                    plan?.schedule ||
                    plan?.installments ||
                    plan?.paymentSchedule ||
                    [];

                  return (
                    <div key={planId}>
                      {/* SCREEN PLAN */}
                      <button
                        type="button"
                        onClick={() => togglePlan(planId)}
                        className="w-full text-left p-5 hover:bg-slate-50 transition no-print"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                              <CreditCard className="w-5 h-5" />
                            </div>

                            <div>
                              <div className="font-black text-slate-800">
                                {plan?.planName ||
                                  plan?.durationName ||
                                  `${getInstallmentCount(
                                    plan
                                  )} Month Plan`}
                              </div>

                              <div className="text-xs text-slate-400 mt-1">
                                {getInstallmentCount(plan)} installments
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-5 text-right">
                            <div>
                              <div className="text-[10px] uppercase font-bold text-slate-400">
                                Total
                              </div>
                              <div className="font-black text-slate-800 mt-1">
                                {formatMoney(total)}
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] uppercase font-bold text-slate-400">
                                Paid
                              </div>
                              <div className="font-black text-emerald-600 mt-1">
                                {formatMoney(paid)}
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] uppercase font-bold text-slate-400">
                                Remaining
                              </div>
                              <div className="font-black text-amber-600 mt-1">
                                {formatMoney(remaining)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-600'
                                : status === 'Overdue'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {status === 'Paid' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : status === 'Overdue' ? (
                              <AlertCircle className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {status}
                          </span>

                          {expanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* SCREEN SCHEDULE */}
                      {expanded && (
                        <div className="px-5 pb-5 no-print">
                          <div className="rounded-xl border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                              <div className="font-bold text-sm text-slate-700">
                                Installment Schedule
                              </div>
                            </div>

                            {Array.isArray(schedule) && schedule.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50 text-slate-400">
                                    <tr>
                                      <th className="px-4 py-3 text-left">#</th>
                                      <th className="px-4 py-3 text-left">
                                        Due Date
                                      </th>
                                      <th className="px-4 py-3 text-right">
                                        Amount
                                      </th>
                                      <th className="px-4 py-3 text-right">
                                        Paid
                                      </th>
                                      <th className="px-4 py-3 text-right">
                                        Remaining
                                      </th>
                                      <th className="px-4 py-3 text-center">
                                        Status
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody className="divide-y divide-slate-100">
                                    {schedule.map((item, itemIndex) => {
                                      const amount = Number(
                                        item?.amount ??
                                          item?.dueAmount ??
                                          item?.installmentAmount ??
                                          0
                                      );
                                      const itemPaid = Number(
                                        item?.paidAmount ?? item?.paid ?? 0
                                      );
                                      const itemRemaining = Number(
                                        item?.remaining ??
                                          item?.remainingAmount ??
                                          Math.max(0, amount - itemPaid)
                                      );

                                      let itemStatus = item?.status;
                                      if (!itemStatus) {
                                        if (itemRemaining <= 0) {
                                          itemStatus = 'Paid';
                                        } else if (
                                          item?.isOverdue ||
                                          (item?.dueDate &&
                                            new Date(item.dueDate) < new Date())
                                        ) {
                                          itemStatus = 'Overdue';
                                        } else {
                                          itemStatus = 'Pending';
                                        }
                                      }

                                      return (
                                        <tr
                                          key={item?._id || itemIndex}
                                          className="hover:bg-slate-50"
                                        >
                                          <td className="px-4 py-3 text-slate-700 font-semibold">
                                            {item?.installmentNumber ??
                                              item?.number ??
                                              itemIndex + 1}
                                          </td>
                                          <td className="px-4 py-3 text-slate-600">
                                            {formatDate(
                                              item?.dueDate ||
                                                item?.date ||
                                                item?.installmentDate
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-right font-semibold text-slate-700">
                                            {formatMoney(amount)}
                                          </td>
                                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                                            {formatMoney(itemPaid)}
                                          </td>
                                          <td className="px-4 py-3 text-right font-semibold text-amber-600">
                                            {formatMoney(itemRemaining)}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <span
                                              className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                itemStatus === 'Paid'
                                                  ? 'bg-emerald-50 text-emerald-600'
                                                  : itemStatus === 'Overdue'
                                                  ? 'bg-red-50 text-red-600'
                                                  : 'bg-amber-50 text-amber-600'
                                              }`}
                                            >
                                              {itemStatus}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="p-8 text-center text-sm text-slate-400">
                                No installment schedule available.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* PRINT PLAN */}
                      <div className="print-only print-plan-block">
                        <div className="print-plan-header">
                          <div>
                            <b>
                              {plan?.planName ||
                                plan?.durationName ||
                                `${getInstallmentCount(plan)} Month Plan`}
                            </b>
                            <span>
                              {' '}
                              • {getInstallmentCount(plan)} installments
                            </span>
                          </div>
                          <div>
                            Total: {formatMoney(total)} | Paid:{' '}
                            {formatMoney(paid)} | Remaining:{' '}
                            {formatMoney(remaining)}
                          </div>
                        </div>

                        {Array.isArray(schedule) && schedule.length > 0 && (
                          <table className="print-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Due Date</th>
                                <th>Amount</th>
                                <th>Paid</th>
                                <th>Remaining</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedule.map((item, itemIndex) => {
                                const amount = Number(
                                  item?.amount ??
                                    item?.dueAmount ??
                                    item?.installmentAmount ??
                                    0
                                );
                                const itemPaid = Number(
                                  item?.paidAmount ?? item?.paid ?? 0
                                );
                                const itemRemaining = Number(
                                  item?.remaining ??
                                    item?.remainingAmount ??
                                    Math.max(0, amount - itemPaid)
                                );

                                let itemStatus = item?.status;
                                if (!itemStatus) {
                                  if (itemRemaining <= 0) itemStatus = 'Paid';
                                  else if (
                                    item?.isOverdue ||
                                    (item?.dueDate &&
                                      new Date(item.dueDate) < new Date())
                                  ) {
                                    itemStatus = 'Overdue';
                                  } else {
                                    itemStatus = 'Pending';
                                  }
                                }

                                return (
                                  <tr key={item?._id || itemIndex}>
                                    <td>
                                      {item?.installmentNumber ??
                                        item?.number ??
                                        itemIndex + 1}
                                    </td>
                                    <td>
                                      {formatDate(
                                        item?.dueDate ||
                                          item?.date ||
                                          item?.installmentDate
                                      )}
                                    </td>
                                    <td>{formatMoney(amount)}</td>
                                    <td>{formatMoney(itemPaid)}</td>
                                    <td>{formatMoney(itemRemaining)}</td>
                                    <td>{itemStatus}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* PAYMENTS */}
          <section className="mt-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm ledger-section">
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-500 no-print" />
                <h2 className="font-black text-slate-800 text-lg">
                  Complete Payment History
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Every payment recorded against this customer
              </p>
            </div>

            {ledger.payments.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                No payment history found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm screen-payment-table">
                  <thead className="bg-slate-50 text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Invoice / Reference</th>
                      <th className="px-5 py-3 text-left">Method</th>
                      <th className="px-5 py-3 text-left">Note</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledger.payments.map((payment, index) => (
                      <tr
                        key={payment?._id || payment?.id || `payment-${index}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                          {formatDateTime(
                            payment?.paymentDate ||
                              payment?.date ||
                              payment?.createdAt
                          )}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {firstValue(
                            payment?.invoiceNumber,
                            payment?.invoiceNo,
                            payment?.reference,
                            payment?.sale?.invoiceNumber,
                            '-'
                          )}
                        </td>
                        <td className="px-5 py-4 capitalize text-slate-600">
                          {firstValue(
                            payment?.paymentMethod,
                            payment?.method,
                            '-'
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-400">
                          {firstValue(
                            payment?.note,
                            payment?.notes,
                            payment?.description,
                            '-'
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-black text-emerald-600">
                          {formatMoney(getPaymentAmount(payment))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PRINT PAYMENTS */}
            {ledger.payments.length > 0 && (
              <table className="print-only print-table print-payment-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice / Reference</th>
                    <th>Method</th>
                    <th>Note</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.payments.map((payment, index) => (
                    <tr
                      key={
                        payment?._id ||
                        payment?.id ||
                        `print-payment-${index}`
                      }
                    >
                      <td>
                        {formatDate(
                          payment?.paymentDate ||
                            payment?.date ||
                            payment?.createdAt
                        )}
                      </td>
                      <td>
                        {firstValue(
                          payment?.invoiceNumber,
                          payment?.invoiceNo,
                          payment?.reference,
                          payment?.sale?.invoiceNumber,
                          '-'
                        )}
                      </td>
                      <td>
                        {firstValue(
                          payment?.paymentMethod,
                          payment?.method,
                          '-'
                        )}
                      </td>
                      <td>
                        {firstValue(
                          payment?.note,
                          payment?.notes,
                          payment?.description,
                          '-'
                        )}
                      </td>
                      <td className="text-right">
                        {formatMoney(getPaymentAmount(payment))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* RETURNS */}
          <section className="mt-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm ledger-section">
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-red-500 no-print" />
                <h2 className="font-black text-slate-800 text-lg">
                  Return / Refund History
                </h2>
              </div>
            </div>

            {ledger.returns.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                No returns or refunds found.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm screen-return-table">
                    <thead className="bg-slate-50 text-slate-400">
                      <tr>
                        <th className="px-5 py-3 text-left">Date</th>
                        <th className="px-5 py-3 text-left">Invoice</th>
                        <th className="px-5 py-3 text-left">Product</th>
                        <th className="px-5 py-3 text-left">Reason</th>
                        <th className="px-5 py-3 text-right">Refund</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.returns.map((returnItem, index) => (
                        <tr
                          key={
                            returnItem?._id ||
                            returnItem?.id ||
                            `return-${index}`
                          }
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4 text-slate-600">
                            {formatDateTime(
                              returnItem?.returnDate ||
                                returnItem?.date ||
                                returnItem?.createdAt
                            )}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-700">
                            {firstValue(
                              returnItem?.invoiceNumber,
                              returnItem?.invoiceNo,
                              returnItem?.sale?.invoiceNumber,
                              '-'
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {firstValue(
                              returnItem?.product?.name,
                              returnItem?.productName,
                              returnItem?.itemName,
                              '-'
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            {firstValue(
                              returnItem?.reason,
                              returnItem?.notes,
                              '-'
                            )}
                          </td>
                          <td className="px-5 py-4 text-right font-black text-red-600">
                            {formatMoney(getReturnAmount(returnItem))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* PRINT RETURNS */}
                <table className="print-only print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice</th>
                      <th>Product</th>
                      <th>Reason</th>
                      <th>Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.returns.map((returnItem, index) => (
                      <tr
                        key={
                          returnItem?._id ||
                          returnItem?.id ||
                          `print-return-${index}`
                        }
                      >
                        <td>
                          {formatDate(
                            returnItem?.returnDate ||
                              returnItem?.date ||
                              returnItem?.createdAt
                          )}
                        </td>
                        <td>
                          {firstValue(
                            returnItem?.invoiceNumber,
                            returnItem?.invoiceNo,
                            returnItem?.sale?.invoiceNumber,
                            '-'
                          )}
                        </td>
                        <td>
                          {firstValue(
                            returnItem?.product?.name,
                            returnItem?.productName,
                            returnItem?.itemName,
                            '-'
                          )}
                        </td>
                        <td>
                          {firstValue(
                            returnItem?.reason,
                            returnItem?.notes,
                            '-'
                          )}
                        </td>
                        <td className="text-right">
                          {formatMoney(getReturnAmount(returnItem))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

          {/* FINAL BALANCE */}
          <div className="mt-5 bg-white border border-amber-200 rounded-2xl p-6 shadow-sm final-balance">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <div className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  Customer Outstanding Balance
                </div>
                <div className="text-3xl font-black text-amber-600 mt-1">
                  {formatMoney(ledger.outstanding)}
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Complete balance calculated from available sales, payments,
                  returns and installment information.
                </div>
              </div>

              {ledger.outstanding <= 0 ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-5 h-5 no-print" />
                  Account Cleared
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-600 font-bold">
                  <Clock className="w-5 h-5 no-print" />
                  Balance Outstanding
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="no-print flex flex-wrap justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={clearLedger}
              className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm flex items-center gap-2 transition"
            >
              <X className="w-4 h-4" />
              Change Customer
            </button>

            <button
              type="button"
              onClick={() => navigate(`/customers/${ledger.customer?._id}`)}
              className="h-10 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-sm flex items-center gap-2 transition shadow-sm"
            >
              <UserRound className="w-4 h-4" />
              Full Customer Profile
            </button>
          </div>

          {/* FOOTER */}
          <div className="hidden print:block mt-8 pt-5 border-t border-slate-300 text-black">
            <div className="flex justify-between text-xs">
              <div>Customer Ledger — {getCustomerName(ledger.customer)}</div>
              <div>Printed: {formatDateTime(new Date())}</div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          PRINT CSS
      ====================================================== */}
      <style>{`
        .print-only {
          display: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }

          body {
            zoom: 0.58;
          }

          body * {
            visibility: hidden;
          }

          #customer-ledger-print,
          #customer-ledger-print * {
            visibility: visible;
          }

          #customer-ledger-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #000 !important;
          }

          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .ledger-print-header {
            display: flex !important;
            align-items: flex-start;
            justify-content: space-between;
            border-bottom: 1px solid #111;
            padding-bottom: 5px;
            margin-bottom: 6px;
          }

          .ledger-print-title {
            font-size: 15px;
            font-weight: 900;
            letter-spacing: .5px;
          }

          .ledger-print-subtitle {
            font-size: 9px;
            margin-top: 2px;
          }

          .ledger-print-date {
            font-size: 8px;
            text-align: right;
          }

          #customer-ledger-print .bg-white {
            background: white !important;
          }

          #customer-ledger-print .bg-slate-50,
          #customer-ledger-print .bg-indigo-50,
          #customer-ledger-print .bg-amber-50,
          #customer-ledger-print .bg-emerald-50,
          #customer-ledger-print .bg-red-50,
          #customer-ledger-print .bg-purple-50 {
            background: white !important;
          }

          #customer-ledger-print .border-slate-200,
          #customer-ledger-print .border-amber-200 {
            border-color: #b8b8b8 !important;
          }

          #customer-ledger-print .shadow-sm {
            box-shadow: none !important;
          }

          #customer-ledger-print .rounded-2xl {
            border-radius: 3px !important;
          }

          #customer-ledger-print .rounded-xl {
            border-radius: 2px !important;
          }

          #customer-ledger-print > .bg-white.border {
            margin-bottom: 5px !important;
          }

          #customer-ledger-print .bg-white.border > .px-5.py-4 {
            padding: 4px 6px !important;
          }

          #customer-ledger-print .bg-white.border > .p-5 {
            padding: 5px 6px !important;
          }

          #customer-ledger-print .w-24.h-24 {
            width: 48px !important;
            height: 48px !important;
          }

          #customer-ledger-print .w-28 {
            width: 60px !important;
          }

          #customer-ledger-print .h-20 {
            height: 42px !important;
          }

          #customer-ledger-print .w-10.h-10 {
            width: 22px !important;
            height: 22px !important;
          }

          #customer-ledger-print .w-11.h-11 {
            width: 24px !important;
            height: 24px !important;
          }

          #customer-ledger-print .text-xl {
            font-size: 11px !important;
          }

          #customer-ledger-print .text-lg {
            font-size: 10px !important;
          }

          #customer-ledger-print .text-3xl {
            font-size: 15px !important;
          }

          #customer-ledger-print .text-sm {
            font-size: 7.5px !important;
          }

          #customer-ledger-print .text-xs {
            font-size: 6.5px !important;
          }

          #customer-ledger-print .text-\\[10px\\] {
            font-size: 5.5px !important;
          }

          #customer-ledger-print .text-\\[9px\\] {
            font-size: 5px !important;
          }

          #customer-ledger-print .mt-5 {
            margin-top: 5px !important;
          }

          #customer-ledger-print .mt-4 {
            margin-top: 4px !important;
          }

          #customer-ledger-print .mt-3 {
            margin-top: 3px !important;
          }

          #customer-ledger-print .mt-2 {
            margin-top: 2px !important;
          }

          #customer-ledger-print .p-6 {
            padding: 6px !important;
          }

          #customer-ledger-print .p-5 {
            padding: 5px !important;
          }

          #customer-ledger-print .p-4 {
            padding: 4px !important;
          }

          .print-section-title {
            font-size: 8px;
            font-weight: 900;
            border-bottom: 1px solid #111;
            padding-bottom: 2px;
            margin: 5px 0 4px;
          }

          .print-guarantor-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 4px !important;
          }

          .print-guarantor-grid > div {
            min-width: 0 !important;
          }

          .print-summary-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 3px !important;
            margin-top: 4px !important;
          }

          .print-summary-card {
            padding: 4px !important;
          }

          .print-status-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 3px !important;
            margin-top: 3px !important;
          }

          .print-status-card {
            padding: 3px !important;
          }

          .ledger-section {
            margin-top: 4px !important;
            break-inside: auto !important;
          }

          .ledger-section > .p-5 {
            padding: 4px 5px !important;
          }

          .print-table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 6px !important;
            margin-top: 2px !important;
          }

          .print-table th {
            font-weight: 900 !important;
            background: #f1f1f1 !important;
            border: 0.5px solid #777 !important;
            padding: 2px 3px !important;
            text-align: left;
          }

          .print-table td {
            border: 0.5px solid #aaa !important;
            padding: 2px 3px !important;
            vertical-align: middle !important;
          }

          .print-table .text-right {
            text-align: right !important;
          }

          .print-sale-row {
            display: grid !important;
            grid-template-columns: 2.4fr 1.2fr 1.2fr 1fr 1.2fr !important;
            gap: 2px;
            border-bottom: 0.5px solid #aaa;
            padding: 2px 4px;
            font-size: 6px;
            line-height: 1.15;
          }

          .print-sale-row span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .print-plan-block {
            padding: 3px 5px;
            border-bottom: 0.5px solid #999;
          }

          .print-plan-header {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 6.5px;
            margin-bottom: 2px;
          }

          .final-balance {
            margin-top: 4px !important;
            padding: 5px !important;
            break-inside: avoid !important;
          }

          .final-balance .text-3xl {
            font-size: 14px !important;
          }

          #customer-ledger-print .text-slate-800,
          #customer-ledger-print .text-slate-700,
          #customer-ledger-print .text-slate-600,
          #customer-ledger-print .text-slate-500,
          #customer-ledger-print .text-slate-400,
          #customer-ledger-print .text-indigo-600,
          #customer-ledger-print .text-indigo-500,
          #customer-ledger-print .text-amber-600,
          #customer-ledger-print .text-amber-500,
          #customer-ledger-print .text-emerald-600,
          #customer-ledger-print .text-emerald-500,
          #customer-ledger-print .text-red-600,
          #customer-ledger-print .text-red-500,
          #customer-ledger-print .text-purple-600 {
            color: #000 !important;
          }

          #customer-ledger-print img {
            visibility: visible !important;
            display: block !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .guarantor-section,
          .print-summary-grid,
          .print-status-grid,
          .final-balance {
            break-inside: avoid !important;
          }

          tr {
            break-inside: avoid !important;
          }

          .screen-payment-table,
          .screen-return-table {
            display: none !important;
          }

          #customer-ledger-print .hidden.print\\:block {
            display: block !important;
            margin-top: 4px !important;
            padding-top: 3px !important;
            font-size: 6px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerLedger;
