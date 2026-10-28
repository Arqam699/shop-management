import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import {
  formatCnicSearchInput,
  matchesCnicSearch,
} from '../utils/cnicSearch';
import { useSettings } from '../context/SettingsContext';
import ExistingPrintPopup from '../components/ExistingPrintPopup';

import {
  ArrowLeft,
  Search,
  User,
  Package,
  CreditCard,
  CalendarDays,
  Percent,
  Calculator,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  X,
  Receipt,
  Hash,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

/* =========================================================
   HELPERS
========================================================= */

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const formatMoney = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const formatDateInput = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/* =========================================================
   COMPONENT
========================================================= */

const NewSale = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { settings } = useSettings();

  /* =========================================================
     SALE TYPE
  ========================================================= */

  const requestedType = (searchParams.get('type') || '')
    .trim()
    .toLowerCase();

  const isInstallmentPath = location.pathname.startsWith('/installments');
  const isSalesPath = location.pathname.startsWith('/sales');

  const checkoutMode =
    isInstallmentPath
      ? 'Installment'
      : requestedType === 'installment'
      ? 'Installment'
      : 'Cash';

  const isCashSale = checkoutMode === 'Cash';
  const isInstallmentSale = checkoutMode === 'Installment';
  const paymentType = checkoutMode;

  /* =========================================================
     BASIC STATE
  ========================================================= */

  const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');
  const [printPopup, setPrintPopup] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const productSearchInputRef = useRef(null);

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productDropdownPlacement, setProductDropdownPlacement] = useState('below');
  const [productDropdownMaxHeight, setProductDropdownMaxHeight] = useState(288);
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(0);
  const [activeProductIndex, setActiveProductIndex] = useState(0);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cashItems, setCashItems] = useState([]);

  /* =========================================================
     SALE VALUES
  ========================================================= */

  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [cashPaymentStatus, setCashPaymentStatus] = useState('Paid');

  /* =========================================================
     INSTALLMENT VALUES
  ========================================================= */

  const [downPayment, setDownPayment] = useState(0);
  const [installmentDuration, setInstallmentDuration] = useState(12);
  const [markupPercentage, setMarkupPercentage] = useState(0);

  const [
    treatDownPaymentAsFirstInstallment,
    setTreatDownPaymentAsFirstInstallment,
  ] = useState(false);

  /* =========================================================
     SCHEDULE
  ========================================================= */

  const [installmentSchedule, setInstallmentSchedule] = useState([]);

  /*
    auto:
      Automatically generated monthly schedule.

    manual:
      User can manually edit installment dates and amounts.
  */
  const [scheduleMode, setScheduleMode] = useState('auto');

  const [manualFinancedBalance, setManualFinancedBalance] = useState(null);

  /* =========================================================
     SUBMIT / ERROR
  ========================================================= */

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  /* =========================================================
     LOAD DATA
  ========================================================= */

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersResponse, productsResponse] = await Promise.all([
          api.get('/customers'),
          api.get('/products'),
        ]);

        const customerData =
          customersResponse?.data?.customers ||
          customersResponse?.data?.data?.customers ||
          customersResponse?.data?.results ||
          customersResponse?.data?.data ||
          customersResponse?.data ||
          [];

        const productData =
          productsResponse?.data?.products ||
          productsResponse?.data?.data?.products ||
          productsResponse?.data?.results ||
          productsResponse?.data?.data ||
          productsResponse?.data ||
          [];

        setCustomers(Array.isArray(customerData) ? customerData : []);
        setProducts(Array.isArray(productData) ? productData : []);
      } catch (error) {
        console.error('New Sale load error:', error);

        const message =
          error?.response?.data?.message ||
          'Unable to load customers and products.';

        setErrorMsg(message);
        toast.error(message);
      }
    };

    loadData();
  }, []);

  /* =========================================================
     FILTER CUSTOMERS
  ========================================================= */

  const filteredCustomers = useMemo(() => {
    const search = String(customerSearch || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    // Keep the picker closed until the user starts searching. Showing the
    // first customers on focus makes the sale form unnecessarily crowded.
    if (!search) return [];

    return customers
      .map((customer) => {
        const fields = [
          customer?.name,
          customer?.fullName,
          customer?.customerName,
          customer?.customerId,
          customer?.customerCode,
          customer?.code,
          customer?.phone,
          customer?.mobile,
          customer?.mobileNumber,
          customer?.cnic,
          customer?.cnicNumber,
          customer?.email,
          customer?._id,
          customer?.id,
        ]
          .filter((value) => value !== null && value !== undefined)
          .map((value) =>
            String(value).toLowerCase().replace(/\s+/g, ' ')
          );
        const matched = fields.some((value) => value.includes(search)) ||
          matchesCnicSearch(customer?.cnic || customer?.cnicNumber, customerSearch);
        if (!matched) return null;
        const normalizedCnic = String(customer?.cnic || customer?.cnicNumber || '').toLowerCase().replace(/\s+/g, '');
        const normalizedSearch = search.replace(/\s+/g, '');
        const score = normalizedCnic === normalizedSearch ? 0
          : fields.some((value) => value === search) ? 1
          : fields.some((value) => value.startsWith(search)) ? 2
          : fields.some((value) => value.includes(search)) ? 3
          : 4;
        return { customer, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .map(({ customer }) => customer)
      .slice(0, 20);
  }, [customers, customerSearch]);

  /* =========================================================
     FILTER PRODUCTS
  ========================================================= */

  const filteredProducts = useMemo(() => {
    const search = String(productSearch || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    // Products are shown only after a search term is entered.
    if (!search) return [];

    return products
      .map((product) => {
        const fields = [
          product?.name,
          product?.productName,
          product?.title,
          product?.sku,
          product?.productCode,
          product?.code,
          product?.category,
          product?.brand,
          product?.model,
          product?.serialNumber,
          product?.imei,
          product?.chassisNumber,
          product?._id,
          product?.id,
        ]
          .filter((value) => value !== null && value !== undefined)
          .map((value) =>
            String(value).toLowerCase().replace(/\s+/g, ' ')
          );
        if (!fields.some((value) => value.includes(search))) return null;
        const identifiers = [product?.sku, product?.productCode, product?.code, product?.imei, product?.serialNumber, product?.chassisNumber]
          .filter(Boolean).map((value) => String(value).toLowerCase().replace(/\s+/g, ' '));
        const score = identifiers.some((value) => value === search) ? 0
          : fields.some((value) => value === search) ? 1
          : identifiers.some((value) => value.startsWith(search)) ? 2
          : fields.some((value) => value.startsWith(search)) ? 3
          : identifiers.some((value) => value.includes(search)) ? 4
          : 5;
        return { product, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .map(({ product }) => product)
      .slice(0, 20);
  }, [products, productSearch]);

  /* =========================================================
     SELECT HANDLERS
  ========================================================= */

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);

    setCustomerSearch(
      customer?.name ||
        customer?.fullName ||
        customer?.customerName ||
        ''
    );

    setShowCustomerDropdown(false);
    setErrorMsg('');
  };

  const handleSelectProduct = (product) => {
    if (isCashSale) {
      const id = String(product?._id || product?.id);
      const price = Number(product?.salePrice ?? product?.sellingPrice ?? product?.price ?? 0) || 0;
      setCashItems((current) => {
        const existing = current.find((item) => String(item.product._id || item.product.id) === id);
        if (existing) return current.map((item) => String(item.product._id || item.product.id) === id
          ? { ...item, quantity: Math.min(Number(item.quantity) + 1, Number(product?.quantity || 0)) }
          : item);
        return [...current, { product, quantity: 1, unitPrice: price }];
      });
      setSelectedProduct(null);
      setProductSearch('');
      setShowProductDropdown(false);
      setUnitPrice(0);
      setQuantity(1);
      setErrorMsg('');
      requestAnimationFrame(() => {
        const input = productSearchInputRef.current;
        if (!input) return;
        const bounds = input.getBoundingClientRect();
        if (bounds.top < 12 || bounds.bottom > window.innerHeight - 12) {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        input.focus({ preventScroll: true });
      });
      return;
    }

    setSelectedProduct(product);

    const price =
      product?.salePrice ??
      product?.sellingPrice ??
      product?.price ??
      0;

    setUnitPrice(Number(price) || 0);
    setQuantity(1);

    setProductSearch(
      product?.name ||
        product?.productName ||
        product?.title ||
        ''
    );

    setShowProductDropdown(false);

    setManualFinancedBalance(null);
    setScheduleMode('auto');
    setInstallmentSchedule([]);

    setErrorMsg('');
  };

  const positionProductDropdown = () => {
    const bounds = productSearchInputRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const below = window.innerHeight - bounds.bottom - 16;
    const above = bounds.top - 16;
    const placeAbove = below < 220 && above > below;
    setProductDropdownPlacement(placeAbove ? 'above' : 'below');
    const available = Math.max(80, (placeAbove ? above : below) - 8);
    setProductDropdownMaxHeight(Math.min(288, available));
  };

  const handlePickerKeyDown = (event, items, activeIndex, setActiveIndex, onSelect) => {
    if (event.key === 'Escape') {
      setShowCustomerDropdown(false);
      setShowProductDropdown(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!items.length) return;
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      let nextIndex = activeIndex;
      for (let attempt = 0; attempt < items.length; attempt += 1) {
        nextIndex = (nextIndex + direction + items.length) % items.length;
        if (Number(items[nextIndex]?.quantity ?? 1) > 0 || !('quantity' in (items[nextIndex] || {}))) break;
      }
      setActiveIndex(nextIndex);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!items.length) return;
      const item = items[activeIndex] || items[0];
      if (item && (!('quantity' in item) || Number(item.quantity ?? 0) > 0)) {
        onSelect(item);
      }
    }
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setErrorMsg('');
  };

  const clearProduct = () => {
    setSelectedProduct(null);
    setProductSearch('');
    setUnitPrice(0);
    setQuantity(1);
    setManualFinancedBalance(null);
    setInstallmentSchedule([]);
    setScheduleMode('auto');
  };

  /* =========================================================
     CORE SALE CALCULATIONS
  ========================================================= */

  const subtotal = useMemo(() => {
    if (isCashSale) return cashItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    return Math.max(
      0,
      Number(quantity || 0) * Number(unitPrice || 0)
    );
  }, [isCashSale, cashItems, quantity, unitPrice]);

  const finalTotal = useMemo(() => {
    const appliedDiscount = isCashSale
      ? cashItems.reduce((sum, item) => sum + Number(item.discount || 0), 0)
      : Number(discount || 0);
    return Math.max(
      0,
      subtotal - appliedDiscount
    );
  }, [isCashSale, cashItems, subtotal, discount]);

  const appliedDiscount = isCashSale
    ? cashItems.reduce((sum, item) => sum + Number(item.discount || 0), 0)
    : Number(discount || 0);

  /* =========================================================
     INSTALLMENT CALCULATIONS
  ========================================================= */

  const calculationBaseAfterDownPayment = useMemo(() => {
    if (!isInstallmentSale) return 0;

    return Math.max(
      0,
      finalTotal - Number(downPayment || 0)
    );
  }, [
    isInstallmentSale,
    finalTotal,
    downPayment,
  ]);

  const markupAmount = useMemo(() => {
    if (!isInstallmentSale) return 0;

    const markupRate =
      Number(markupPercentage || 0) / 100;

    if (treatDownPaymentAsFirstInstallment) {
      return Math.max(
        0,
        calculationBaseAfterDownPayment * markupRate
      );
    }

    return Math.max(
      0,
      finalTotal * markupRate
    );
  }, [
    isInstallmentSale,
    treatDownPaymentAsFirstInstallment,
    calculationBaseAfterDownPayment,
    finalTotal,
    markupPercentage,
  ]);

  const totalWithMarkup = useMemo(() => {
    if (!isInstallmentSale) {
      return finalTotal;
    }

    if (treatDownPaymentAsFirstInstallment) {
      return Math.max(
        0,
        calculationBaseAfterDownPayment + markupAmount
      );
    }

    return Math.max(
      0,
      finalTotal + markupAmount
    );
  }, [
    isInstallmentSale,
    treatDownPaymentAsFirstInstallment,
    calculationBaseAfterDownPayment,
    finalTotal,
    markupAmount,
  ]);

  const calculatedFinancedBalance = useMemo(() => {
    if (!isInstallmentSale) return 0;

    if (treatDownPaymentAsFirstInstallment) {
      return Math.max(
        0,
        totalWithMarkup
      );
    }

    return Math.max(
      0,
      totalWithMarkup - Number(downPayment || 0)
    );
  }, [
    isInstallmentSale,
    treatDownPaymentAsFirstInstallment,
    totalWithMarkup,
    downPayment,
  ]);

  const financedBalance = useMemo(() => {
    if (!isInstallmentSale) return 0;

    if (
      manualFinancedBalance !== null &&
      Number.isFinite(Number(manualFinancedBalance))
    ) {
      return Math.max(
        0,
        Number(manualFinancedBalance)
      );
    }

    return calculatedFinancedBalance;
  }, [
    isInstallmentSale,
    manualFinancedBalance,
    calculatedFinancedBalance,
  ]);

  const effectiveDownPayment = useMemo(() => {
    if (!isInstallmentSale) return 0;

    if (manualFinancedBalance !== null) {
      if (treatDownPaymentAsFirstInstallment) {
        const markupRate =
          Number(markupPercentage || 0) / 100;

        if (markupRate >= 0) {
          const amountBeforeMarkup =
            Number(manualFinancedBalance || 0) /
            (1 + markupRate);

          return Math.max(
            0,
            roundMoney(
              finalTotal - amountBeforeMarkup
            )
          );
        }
      }

      return Math.max(
        0,
        roundMoney(
          totalWithMarkup -
            Number(manualFinancedBalance || 0)
        )
      );
    }

    return Math.max(
      0,
      Number(downPayment || 0)
    );
  }, [
    isInstallmentSale,
    manualFinancedBalance,
    treatDownPaymentAsFirstInstallment,
    markupPercentage,
    finalTotal,
    totalWithMarkup,
    downPayment,
  ]);

  /* =========================================================
     INSTALLMENT COUNT
  ========================================================= */

  const getActualInstallmentCount = () => {
    const selectedCount = Math.max(
      1,
      Math.floor(
        Number(installmentDuration || 1)
      )
    );

    /*
      If Down Payment is installment #1,
      selected duration includes the down payment.

      Example:
      Selected = 12
      DP = #1
      Remaining schedule = 11
    */
    if (treatDownPaymentAsFirstInstallment) {
      return Math.max(
        0,
        selectedCount - 1
      );
    }

    return selectedCount;
  };

  /* =========================================================
     SCHEDULE BUILDER
  ========================================================= */

  const buildInstallmentSchedule = (
    financedAmount,
    count
  ) => {
    const total = roundMoney(
      financedAmount
    );

    const installmentCount = Math.max(
      0,
      Number(count || 0)
    );

    if (
      installmentCount === 0 ||
      total <= 0
    ) {
      return [];
    }

    const baseAmount = roundMoney(
      total / installmentCount
    );

    const schedule = [];

    let distributed = 0;

    const today = new Date();

    for (
      let index = 0;
      index < installmentCount;
      index++
    ) {
      /*
        Backend expects:

        DP first = schedule starts at #2
        DP not first = schedule starts at #1
      */
      const installmentNumber =
        treatDownPaymentAsFirstInstallment
          ? index + 2
          : index + 1;

      let amount;

      if (
        index === installmentCount - 1
      ) {
        amount = roundMoney(
          total - distributed
        );
      } else {
        amount = baseAmount;
      }

      distributed = roundMoney(
        distributed + amount
      );

      const dueDate = new Date(today);

      dueDate.setMonth(
        dueDate.getMonth() + index + 1
      );

      schedule.push({
        installmentNumber,
        amount,
        dueDate: formatDateInput(
          dueDate
        ),
      });
    }

    return schedule;
  };

  /* =========================================================
     AUTOMATIC SCHEDULE EFFECT
  ========================================================= */

  useEffect(() => {
    if (!isInstallmentSale) {
      setInstallmentSchedule([]);
      return;
    }

    if (scheduleMode !== 'auto') {
      return;
    }

    const count =
      getActualInstallmentCount();

    const newSchedule =
      buildInstallmentSchedule(
        financedBalance,
        count
      );

    setInstallmentSchedule(
      newSchedule
    );
  }, [
    isInstallmentSale,
    financedBalance,
    installmentDuration,
    treatDownPaymentAsFirstInstallment,
    scheduleMode,
  ]);

  /* =========================================================
     SCHEDULE TOTAL
  ========================================================= */

  const scheduleTotal = useMemo(() => {
    return roundMoney(
      installmentSchedule.reduce(
        (sum, item) =>
          sum +
          Number(item?.amount || 0),
        0
      )
    );
  }, [installmentSchedule]);

  const scheduleDifference = useMemo(() => {
    return roundMoney(
      financedBalance -
        scheduleTotal
    );
  }, [
    financedBalance,
    scheduleTotal,
  ]);

  const scheduleIsBalanced =
    !isInstallmentSale ||
    Math.abs(scheduleDifference) < 0.01;

  /* =========================================================
     FINANCED BALANCE
  ========================================================= */

  const updateFinancedBalance = (value) => {
    const numericValue = Math.max(
      0,
      Number(value || 0)
    );

    if (
      numericValue >
      totalWithMarkup
    ) {
      setErrorMsg(
        'Financed balance cannot be greater than Total With Markup.'
      );
      return;
    }

    setErrorMsg('');
    setManualFinancedBalance(
      numericValue
    );
    setScheduleMode('manual');
  };

  const useAutomaticFinancedBalance = () => {
    setManualFinancedBalance(null);
    setErrorMsg('');
    setScheduleMode('auto');
  };

  /* =========================================================
     SCHEDULE EDITING
  ========================================================= */

  const updateInstallmentAmount = (
    index,
    value
  ) => {
    setScheduleMode('manual');

    setInstallmentSchedule(
      (previous) =>
        previous.map(
          (item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  amount:
                    value === ''
                      ? ''
                      : Number(value),
                }
              : item
        )
    );
  };

  const updateInstallmentDate = (
    index,
    value
  ) => {
    setScheduleMode('manual');

    setInstallmentSchedule(
      (previous) =>
        previous.map(
          (item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  dueDate: value,
                }
              : item
        )
    );

    setErrorMsg('');
  };

  /* =========================================================
     AUTOMATIC / MANUAL MODE
  ========================================================= */

  const switchToAutomaticSchedule = () => {
    setScheduleMode('auto');
    setManualFinancedBalance(null);
    setErrorMsg('');

    const count =
      getActualInstallmentCount();

    const newSchedule =
      buildInstallmentSchedule(
        calculatedFinancedBalance,
        count
      );

    setInstallmentSchedule(
      newSchedule
    );
  };

  const switchToManualSchedule = () => {
    setScheduleMode('manual');
    setErrorMsg('');

    /*
      Keep currently generated schedule.
      User can now change dates and amounts.
    */
    setInstallmentSchedule(
      (previous) => {
        if (previous.length > 0) {
          return previous;
        }

        const count =
          getActualInstallmentCount();

        return buildInstallmentSchedule(
          financedBalance,
          count
        );
      }
    );
  };

  const resetSchedule = () => {
    const count =
      getActualInstallmentCount();

    const newSchedule =
      buildInstallmentSchedule(
        calculatedFinancedBalance,
        count
      );

    setManualFinancedBalance(null);
    setScheduleMode('auto');
    setInstallmentSchedule(
      newSchedule
    );
    setErrorMsg('');
  };

  /* =========================================================
     BASIC VALUE HANDLERS
  ========================================================= */

  const handleUnitPriceChange = (
    value
  ) => {
    setUnitPrice(
      Math.max(
        0,
        Number(value || 0)
      )
    );

    setManualFinancedBalance(null);
    setScheduleMode('auto');
  };

  const handleQuantityChange = (
    value
  ) => {
    const stockLimit = Math.max(1, Number(selectedProduct?.quantity ?? 1));
    setQuantity(
      Math.max(
        1,
        Math.min(stockLimit, Math.floor(Number(value || 1)))
      )
    );

    setManualFinancedBalance(null);
    setScheduleMode('auto');
  };

  const handleDiscountChange = (
    value
  ) => {
    setDiscount(
      Math.max(
        0,
        Number(value || 0)
      )
    );

    setManualFinancedBalance(null);
    setScheduleMode('auto');
  };

  const handleDownPaymentChange = (
    value
  ) => {
    setDownPayment(
      Math.max(
        0,
        Number(value || 0)
      )
    );

    setManualFinancedBalance(null);
    setScheduleMode('auto');
  };

  const handleMarkupChange = (
    value
  ) => {
    setMarkupPercentage(
      Math.max(
        0,
        Number(value || 0)
      )
    );

    setManualFinancedBalance(null);
    setScheduleMode('auto');
  };

  const handleTreatDownPaymentChange = (
    event
  ) => {
    setTreatDownPaymentAsFirstInstallment(
      event.target.checked
    );

    setManualFinancedBalance(null);
    setScheduleMode('auto');
    setErrorMsg('');
  };

  const handleInstallmentDurationChange = (
    value
  ) => {
    const numericValue =
      Math.max(
        1,
        Math.floor(
          Number(value || 1)
        )
      );

    setInstallmentDuration(
      numericValue
    );

    setScheduleMode('auto');
    setManualFinancedBalance(null);
    setErrorMsg('');
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setErrorMsg('');

    /* -------------------------------------------------------
       BASIC VALIDATION
    ------------------------------------------------------- */

    if (isInstallmentSale && !selectedCustomer) {
      setErrorMsg(
        'Please select a customer.'
      );
      return;
    }

    if (isCashSale ? cashItems.length === 0 : !selectedProduct) {
      setErrorMsg(
        'Please select a product.'
      );
      return;
    }

    if (
      Number(quantity || 0) <= 0
    ) {
      setErrorMsg(
        'Quantity must be greater than zero.'
      );
      return;
    }

    if (
      Number(unitPrice || 0) < 0
    ) {
      setErrorMsg(
        'Unit price cannot be negative.'
      );
      return;
    }

    if (
      Number(discount || 0) < 0
    ) {
      setErrorMsg(
        'Discount cannot be negative.'
      );
      return;
    }

    /* -------------------------------------------------------
       INSTALLMENT VALIDATION
    ------------------------------------------------------- */

    if (isInstallmentSale) {
      if (
        Number(installmentDuration || 0) <
        1
      ) {
        setErrorMsg(
          'Installment count must be at least 1.'
        );
        return;
      }

      if (
        Number(markupPercentage || 0) <
        0
      ) {
        setErrorMsg(
          'Markup percentage cannot be negative.'
        );
        return;
      }

      const dp =
        Number(
          effectiveDownPayment || 0
        );

      if (dp < 0) {
        setErrorMsg(
          'Down payment cannot be negative.'
        );
        return;
      }

      if (
        dp >
        Number(
          totalWithMarkup || 0
        )
      ) {
        setErrorMsg(
          'Down payment cannot be greater than Total With Markup.'
        );
        return;
      }

      if (
        Number(financedBalance || 0) <
        0
      ) {
        setErrorMsg(
          'Financed balance cannot be negative.'
        );
        return;
      }

      if (
        Number(financedBalance || 0) >
        Number(totalWithMarkup || 0)
      ) {
        setErrorMsg(
          'Financed balance cannot be greater than Total With Markup.'
        );
        return;
      }

      /*
        If financed balance exists,
        schedule cannot be empty.
      */
      if (
        Number(financedBalance || 0) >
          0 &&
        installmentSchedule.length === 0
      ) {
        setErrorMsg(
          'Installment schedule is empty.'
        );
        return;
      }

      /* -----------------------------------------------------
         EXPECTED COUNT
      ----------------------------------------------------- */

      const expectedCount =
        getActualInstallmentCount();

      if (
        installmentSchedule.length !==
        expectedCount
      ) {
        setErrorMsg(
          `Installment schedule must contain exactly ${expectedCount} installments.`
        );
        return;
      }

      /* -----------------------------------------------------
         TOTAL BALANCE
      ----------------------------------------------------- */

      if (!scheduleIsBalanced) {
        setErrorMsg(
          `Installment schedule is not balanced. Difference: ${
            settings?.currency || 'PKR'
          } ${formatMoney(
            scheduleDifference
          )}`
        );
        return;
      }

      /* -----------------------------------------------------
         AMOUNT / DATE VALIDATION
      ----------------------------------------------------- */

      const invalidInstallment =
        installmentSchedule.find(
          (item) =>
            Number(item?.amount || 0) <
              0 ||
            !item?.dueDate ||
            !Number.isFinite(
              Number(item?.amount)
            )
        );

      if (invalidInstallment) {
        setErrorMsg(
          'Please check all installment amounts and due dates.'
        );
        return;
      }

      /* -----------------------------------------------------
         INSTALLMENT NUMBER VALIDATION
      ----------------------------------------------------- */

      const expectedStartingNumber =
        treatDownPaymentAsFirstInstallment
          ? 2
          : 1;

      const invalidInstallmentNumber =
        installmentSchedule.some(
          (item, index) =>
            Number(
              item?.installmentNumber
            ) !==
            expectedStartingNumber +
              index
        );

      if (
        invalidInstallmentNumber
      ) {
        setErrorMsg(
          'Installment numbers are invalid. Please reset the schedule.'
        );
        return;
      }

      /* -----------------------------------------------------
         DATE VALIDATION

         IMPORTANT:
         We intentionally do NOT force dates to be ascending.
         Same date / same month / gaps are allowed.
      ----------------------------------------------------- */

  const invalidDate =
  installmentSchedule.some((item) => {
    const value = String(
      item?.dueDate || ''
    ).trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return true;
    }

    const [year, month, day] =
      value.split('-').map(Number);

    const testDate = new Date(
      year,
      month - 1,
      day
    );

    return (
      testDate.getFullYear() !== year ||
      testDate.getMonth() !== month - 1 ||
      testDate.getDate() !== day
    );
  });

if (invalidDate) {
  setErrorMsg(
    'One or more installment dates are invalid.'
  );
  return;
}
    }

    /* =====================================================
       PAYLOAD
    ====================================================== */

    const payload = {
      manualInvoiceNumber:
        manualInvoiceNumber
          ? manualInvoiceNumber.trim()
          : undefined,

      customer:
        selectedCustomer,

      product: isCashSale ? cashItems[0]?.product : selectedProduct,
      ...(isCashSale ? { items: cashItems.map((item) => ({ product: item.product, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discount: Number(item.discount || 0) })) } : {}),

      quantity: isCashSale ? cashItems.reduce((sum, item) => sum + Number(item.quantity), 0) : Number(quantity),

      unitPrice: isCashSale ? 0 : Number(unitPrice),

      discount: Number(appliedDiscount),

      paymentType:
        paymentType,

      paymentStatus: isCashSale ? cashPaymentStatus : (Number(effectiveDownPayment || 0) >= Number(totalWithMarkup || 0) ? 'Paid' : 'Unpaid'),

      downPayment:
        isInstallmentSale
          ? roundMoney(
              effectiveDownPayment
            )
          : 0,

      markupPercentage:
        isInstallmentSale
          ? roundMoney(
              markupPercentage
            )
          : 0,

      markupAmount:
        isInstallmentSale
          ? roundMoney(
              markupAmount
            )
          : 0,

      totalWithMarkup:
        isInstallmentSale
          ? roundMoney(
              totalWithMarkup
            )
          : roundMoney(
              finalTotal
            ),

      selectedInstallmentDuration:
        isInstallmentSale
          ? Number(
              installmentDuration
            )
          : 0,

      installmentDuration:
        isInstallmentSale
          ? Number(
              installmentDuration
            )
          : 0,

      treatDownPaymentAsFirstInstallment:
        isInstallmentSale
          ? Boolean(
              treatDownPaymentAsFirstInstallment
            )
          : false,

      installmentSchedule:
        isInstallmentSale
          ? installmentSchedule.map(
              (item) => ({
                installmentNumber:
                  Number(
                    item.installmentNumber
                  ),

                amount:
                  roundMoney(
                    item.amount
                  ),

                dueDate:
  item.dueDate
    ? `${item.dueDate}T00:00:00.000Z`
    : null,
              })
            )
          : [],
    };

    /* =====================================================
       CREATE SALE
    ====================================================== */

    try {
      setIsSubmitting(true);

      const response = await api.post(
        '/sales',
        payload
      );

      const createdSale = response.data?.data?.sale || response.data?.sale || response.data?.data || {};
      const createdSaleId = createdSale._id || createdSale.id;
      if (createdSaleId) {
        setPrintPopup({ kind: 'invoice', recordId: createdSaleId });
      } else {
        toast.error('Sale was saved, but the invoice preview could not be opened.');
      }

      toast.success(
        isInstallmentSale
          ? 'Installment sale created successfully.'
          : 'Cash sale created successfully.'
      );


    } catch (error) {
      console.error(
        'Create sale error:',
        error
      );

      const message =
        error?.response?.data
          ?.message ||
        error?.response?.data
          ?.error ||
        'Unable to create sale.';

      setErrorMsg(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================================
     DISPLAY VALUES
  ========================================================= */

  const customerName =
    selectedCustomer?.name ||
    selectedCustomer?.fullName ||
    selectedCustomer?.customerName ||
    'Customer';

  const customerPhone =
    selectedCustomer?.phone ||
    selectedCustomer?.mobile ||
    selectedCustomer?.mobileNumber ||
    '';

  const productName =
    selectedProduct?.name ||
    selectedProduct?.productName ||
    selectedProduct?.title ||
    'Product';

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className={`space-y-4 xl:space-y-3 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]`}>

      {/* =====================================================
          DARK HERO HEADER
      ====================================================== */}

      <section className={`relative shrink-0 overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white no-print ${isInstallmentSale ? 'xl:rounded-2xl' : ''}`}>

        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />

        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

            <div className="flex items-center gap-3.5">

              <button
                type="button"
                onClick={() =>
                  navigate(
                    isInstallmentSale
                      ? '/installments'
                      : '/sales'
                  )
                }
                className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div>

                <div className="flex items-center gap-2 mb-1">

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">

                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />

                    Point of Sale

                  </span>

                  <span className="text-slate-600">
                    •
                  </span>

                  <span className="text-[9px] font-bold text-slate-400">
                    {checkoutMode} Checkout
                  </span>

                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                  New {checkoutMode} Sale Checkout
                </h1>

              </div>

            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">

              <div className="px-4 py-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-right">

                <span className="text-[9px] uppercase font-black text-slate-400 block">
                  Net Total Payable
                </span>

                <p className="text-lg font-black text-emerald-400">
                  {settings?.currency || 'PKR'}{' '}
                  {formatMoney(finalTotal)}
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          ERROR ALERT
      ====================================================== */}

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 animate-[pageEnter_0.2s_ease-out]">

          <AlertCircle
            size={18}
            className="text-rose-600 shrink-0 mt-0.5"
          />

          <div className="flex-1">
            {errorMsg}
          </div>

          <button
            type="button"
            onClick={() =>
              setErrorMsg('')
            }
            className="text-rose-500 hover:text-rose-700"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* =====================================================
          MAIN CHECKOUT FORM
      ====================================================== */}

      <form
        onSubmit={handleSubmit}
        className={`grid min-w-0 grid-cols-1 gap-4 sm:gap-6 ${isInstallmentSale ? '2xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] 2xl:items-start 2xl:gap-5' : 'xl:grid-cols-[minmax(0,1fr)_400px]'}`}
      >

        {/* ===================================================
            LEFT COLUMN
        ==================================================== */}

        <div className={`min-w-0 space-y-6 ${isInstallmentSale ? 'xl:space-y-5' : ''}`}>

          {/* =================================================
              INVOICE NUMBER
          ================================================== */}

          <section className="premium-card p-5 sm:p-6 space-y-3">

            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">

              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>

              <h2 className="text-sm font-black text-slate-900">
                Custom Invoice Number
              </h2>

            </div>

            <div>

              <div className="relative">

                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type="text"
                  value={manualInvoiceNumber}
                  onChange={(e) =>
                    setManualInvoiceNumber(
                      e.target.value
                    )
                  }
                  placeholder="Leave empty for automatic sequential generation..."
                  className="w-full h-11 border border-slate-200 rounded-xl pl-10 pr-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />

              </div>

            </div>

          </section>

          {/* =================================================
              CUSTOMER SEARCH
          ================================================== */}

          <section className="premium-card p-5 sm:p-6 space-y-3">

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">

              <div className="flex items-center gap-2.5">

                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>

                <div>

                  <h2 className="text-sm font-black text-slate-900">
                    {isInstallmentSale ? 'Step 1 · Customer' : 'Customer Selection (Optional)'}{' '}
                    {isInstallmentSale && <span className="text-rose-500">*</span>}
                  </h2>

                  <p className="text-[10px] text-slate-400">
                    {isInstallmentSale ? 'Select a customer for this installment sale.' : 'Optional: select a customer, or leave blank for a walk-in cash sale.'}
                  </p>

                </div>

              </div>

              {selectedCustomer && (
                <button
                  type="button"
                  onClick={clearCustomer}
                  className="text-xs font-black text-rose-500 hover:text-rose-700"
                >
                  Clear Selection
                </button>
              )}

            </div>

            <div className="relative z-30">

              <div className="relative">

                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setSelectedCustomer(null);
                    setCustomerSearch(
                      formatCnicSearchInput(
                        e.target.value
                      )
                    );
                    setActiveCustomerIndex(0);

                    setShowCustomerDropdown(
                      Boolean(e.target.value.trim())
                    );
                  }}
                  onFocus={() => setShowCustomerDropdown(Boolean(customerSearch.trim()))}
                  autoComplete="off"
                  aria-label="Search customers by name, phone, CNIC, or customer ID"
                  onKeyDown={(e) => handlePickerKeyDown(e, filteredCustomers, activeCustomerIndex, setActiveCustomerIndex, handleSelectCustomer)}
                  placeholder="Search by name, phone or CNIC (dashes auto)..."
                  className="w-full h-11 border border-slate-200 rounded-xl pl-10 pr-10 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />

                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              </div>

              {showCustomerDropdown && customerSearch.trim() && (
                <>

                  <div
                    className="fixed inset-0 z-20"
                    onMouseDown={() =>
                      setShowCustomerDropdown(
                        false
                      )
                    }
                  />

                  <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl custom-scrollbar animate-[pageEnter_0.2s_ease-out]">

                    {filteredCustomers.length === 0 ? (

                      <div className="p-5 text-center text-xs text-slate-400 font-bold">
                        No customer found matching criteria.
                      </div>

                    ) : (

                      filteredCustomers.map(
                        (customer, index) => (
                          <button
                            key={
                              customer?._id ||
                              customer?.id
                            }
                            type="button"
                            onMouseDown={(e) =>
                              e.preventDefault()
                            }
                            onClick={() =>
                              handleSelectCustomer(
                                customer
                              )
                            }
                            className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition border ${index === activeCustomerIndex ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                          >

                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">

                              <p className="font-black text-xs text-slate-900 truncate">
                                {customer?.name ||
                                  customer?.fullName ||
                                  customer?.customerName ||
                                  'Unnamed Customer'}
                              </p>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                                <span>Mobile: {customer?.phone || customer?.mobile || customer?.mobileNumber || '—'}</span>
                                <span>CNIC: {customer?.cnic || customer?.cnicNumber || '—'}</span>
                                {customer?.fatherName && <span>Father: {customer.fatherName}</span>}
                                {customer?.customerId && <span>ID: {customer.customerId}</span>}
                                {customer?.city && <span>City: {customer.city}</span>}
                              </div>

                            </div>

                          </button>
                        )
                      )

                    )}

                  </div>

                </>
              )}

            </div>

            {selectedCustomer && (
              <div className="mt-3 min-w-0 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-wrap items-start justify-between gap-3">

                <div className="min-w-0 flex-1">

                  <span className="text-[9px] uppercase font-black tracking-wider text-indigo-500">
                    Selected Customer
                  </span>

                  <p className="break-words font-black text-xs text-slate-900 mt-0.5">
                    {customerName}
                  </p>
                  <p className="break-all text-[10px] text-slate-500 mt-1">
                    CNIC: {selectedCustomer?.cnic || selectedCustomer?.cnicNumber || '—'}
                    {selectedCustomer?.fatherName ? ` · Father: ${selectedCustomer.fatherName}` : ''}
                  </p>

                </div>

                <div className="min-w-0 max-w-full shrink text-left sm:text-right">

                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                    Mobile
                  </span>

                  <p className="break-all font-bold text-xs text-slate-700 mt-0.5">
                    {customerPhone || '—'}
                  </p>

                </div>

              </div>
            )}

          </section>

          {/* =================================================
              PRODUCT SEARCH
          ================================================== */}

          <section className="premium-card p-5 sm:p-6 space-y-3">

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">

              <div className="flex items-center gap-2.5">

                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>

                <div>

                  <h2 className="text-sm font-black text-slate-900">
                    {isInstallmentSale ? 'Step 2 · Product and price' : 'Inventory Product'}{' '}
                    <span className="text-rose-500">
                      *
                    </span>
                  </h2>

                  <p className="text-[10px] text-slate-400">
                    Select product item from shop warehouse
                  </p>

                </div>

              </div>

              {selectedProduct && (
                <button
                  type="button"
                  onClick={clearProduct}
                  className="text-xs font-black text-rose-500 hover:text-rose-700"
                >
                  Clear Selection
                </button>
              )}

            </div>

            <div className="relative z-30">

              <div className="relative">

                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  ref={productSearchInputRef}
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    positionProductDropdown();
                    setProductSearch(
                      e.target.value
                    );
                    setActiveProductIndex(0);

                    setShowProductDropdown(
                      Boolean(e.target.value.trim())
                    );
                  }}
                  onFocus={() => {
                    positionProductDropdown();
                    setShowProductDropdown(Boolean(productSearch.trim()));
                  }}
                  autoComplete="off"
                  aria-label="Search products by name, brand, model, SKU, or serial number"
                  onKeyDown={(e) => handlePickerKeyDown(e, filteredProducts, activeProductIndex, setActiveProductIndex, handleSelectProduct)}
                  placeholder="Search by product, brand, model, SKU, IMEI or serial..."
                  className="w-full h-11 border border-slate-200 rounded-xl pl-10 pr-10 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />

                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              </div>

              {showProductDropdown && productSearch.trim() && (
                <>

                  <div
                    className="fixed inset-0 z-20"
                    onMouseDown={() =>
                      setShowProductDropdown(
                        false
                      )
                    }
                  />

                  <div style={{ maxHeight: `${productDropdownMaxHeight}px` }} className={`absolute left-0 right-0 z-40 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl custom-scrollbar animate-[pageEnter_0.2s_ease-out] ${productDropdownPlacement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>

                    {filteredProducts.length === 0 ? (

                      <div className="p-5 text-center text-xs text-slate-400 font-bold">
                        No product found in stock.
                      </div>

                    ) : (

                      filteredProducts.map(
                        (product, index) => (
                          <button
                            key={
                              product?._id ||
                              product?.id
                            }
                            type="button"
                            onMouseDown={(e) =>
                              e.preventDefault()
                            }
                            onClick={() =>
                              handleSelectProduct(
                                product
                              )
                            }
                            disabled={Number(product?.quantity ?? 0) <= 0}
                            className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition border disabled:cursor-not-allowed disabled:opacity-60 ${index === activeProductIndex ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                          >

                            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">

                              <p className="font-black text-xs text-slate-900 truncate">
                                {product?.name ||
                                  product?.productName ||
                                  product?.title ||
                                  'Unnamed Item'}
                              </p>
                              {isCashSale && cashItems.some((item) => String(item.product?._id || item.product?.id) === String(product?._id || product?.id)) && (
                                <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-700">Selected · select again to add one</span>
                              )}
                              <p className="text-[10px] font-semibold text-slate-600 mt-0.5 truncate">
                                {[product?.brand, product?.model, product?.category].filter(Boolean).join(' · ')}
                              </p>

                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                                <span>Brand: {product?.brand || '—'}</span>
                                <span>Model: {product?.model || '—'}</span>
                                <span>SKU: {product?.sku || product?.productCode || product?.code || '—'}</span>
                                <span className={`rounded-full px-2 py-0.5 font-bold ${Number(product?.quantity ?? 0) <= 0 ? 'bg-rose-100 text-rose-700' : Number(product?.quantity ?? 0) <= Number(product?.minStockLevel ?? 5) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {Number(product?.quantity ?? 0) <= 0 ? 'Out of stock' : Number(product?.quantity ?? 0) <= Number(product?.minStockLevel ?? 5) ? `Low stock · ${Number(product.quantity)} left` : `In stock · ${Number(product.quantity)} available`}
                                </span>
                                {product?.imei && <span>IMEI: {product.imei}</span>}
                                {product?.serialNumber && <span>Serial: {product.serialNumber}</span>}
                                {product?.chassisNumber && <span>Chassis: {product.chassisNumber}</span>}
                                <span className="font-bold text-violet-700">
                                  Price: {settings?.currency || 'PKR'} {formatMoney(product?.salePrice ?? product?.sellingPrice ?? 0)}
                                </span>
                                {product?.warrantyPeriod && <span>Warranty: {product.warrantyPeriod}</span>}
                              </div>

                            </div>

                          </button>
                        )
                      )

                    )}

                  </div>

                </>
              )}

            </div>

            {selectedProduct && (
              <div className="mt-3 min-w-0 p-3.5 rounded-2xl bg-violet-50/60 border border-violet-100 flex flex-wrap items-start justify-between gap-3">

                <div className="min-w-0 flex-1">

                  <span className="text-[9px] uppercase font-black tracking-wider text-violet-600">
                    Selected Product
                  </span>

                  <p className="break-words font-black text-xs text-slate-900 mt-0.5">
                    {productName}
                  </p>
                  <p className="break-words text-[10px] text-slate-500 mt-1">
                    {[selectedProduct?.brand, selectedProduct?.model, selectedProduct?.category, selectedProduct?.sku ? `SKU ${selectedProduct.sku}` : ''].filter(Boolean).join(' · ')}
                  </p>
                  <p className="break-words text-[10px] text-slate-500 mt-0.5">
                    Available stock: {Number(selectedProduct?.quantity ?? 0)}
                    {selectedProduct?.warrantyPeriod ? ` · Warranty: ${selectedProduct.warrantyPeriod}` : ''}
                  </p>
                  <p className="break-all text-[10px] text-slate-500 mt-0.5">
                    {selectedProduct?.imei ? `IMEI: ${selectedProduct.imei}` : ''}
                    {selectedProduct?.serialNumber ? `${selectedProduct?.imei ? ' · ' : ''}Serial: ${selectedProduct.serialNumber}` : ''}
                    {selectedProduct?.chassisNumber ? `${selectedProduct?.imei || selectedProduct?.serialNumber ? ' · ' : ''}Chassis: ${selectedProduct.chassisNumber}` : ''}
                  </p>

                </div>

                <div className="min-w-0 max-w-full shrink text-left sm:text-right">

                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                    Unit Price
                  </span>

                  <p className="break-words font-black text-xs text-slate-900 mt-0.5">
                    {settings?.currency ||
                      'PKR'}{' '}
                    {formatMoney(
                      unitPrice
                    )}
                  </p>

                </div>

              </div>
            )}

            {isCashSale && cashItems.length > 0 && (
              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <h3 className="text-xs font-black text-slate-800">Cash sale items</h3>
                {cashItems.map((item) => {
                  const id = String(item.product._id || item.product.id);
                  return <div key={id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{item.product.name || item.product.productName} × {item.quantity}</span>
                      {item.product.model && <span className="mt-0.5 block truncate text-[10px] text-slate-500">Model: {item.product.model}</span>}
                    </span>
                    <span className="shrink-0 font-bold">{settings?.currency || 'PKR'} {formatMoney(item.quantity * item.unitPrice)}</span>
                    <label className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-rose-600">Discount
                      <input type="number" min="0" max={item.quantity * item.unitPrice} value={item.discount || 0} onChange={(event) => {
                        const maxDiscount = item.quantity * item.unitPrice;
                        const value = Math.max(0, Math.min(maxDiscount, Number(event.target.value || 0)));
                        setCashItems((items) => items.map((entry) => String(entry.product._id || entry.product.id) === id ? { ...entry, discount: value } : entry));
                      }} className="w-24 rounded-lg border border-rose-200 px-2 py-1 text-xs text-slate-800" />
                    </label>
                    <button type="button" onClick={() => setCashItems((items) => items.filter((entry) => String(entry.product._id || entry.product.id) !== id))} className="text-rose-600" aria-label="Remove product"><X className="h-4 w-4" /></button>
                  </div>;
                })}
                <div className="flex justify-between border-t pt-2 text-xs font-black"><span>Total discount</span><span className="text-rose-600">-{settings?.currency || 'PKR'} {formatMoney(appliedDiscount)}</span></div>
              </div>
            )}

          </section>

          {isCashSale && (
            <section className="premium-card p-4 sm:p-5 space-y-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">Payment Status</h2>
                <p className="mt-1 text-xs text-slate-500">Choose whether this cash sale has been paid.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['Paid', 'Unpaid'].map((status) => (
                  <button key={status} type="button" aria-pressed={cashPaymentStatus === status} onClick={() => setCashPaymentStatus(status)} className={`rounded-xl border px-4 py-3 text-sm font-black transition ${cashPaymentStatus === status ? status === 'Paid' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20' : 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                    {status}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* =================================================
              PRICING & QUANTITY
          ================================================== */}

          {!isCashSale && <section className={`premium-card min-w-0 p-4 sm:p-6 shadow-sm space-y-4 ${isInstallmentSale ? 'overflow-hidden' : ''}`}>

            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">

              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>

              <h2 className="text-sm font-black text-slate-900">
                Pricing & Quantities
              </h2>

            </div>

            <div className={`grid min-w-0 grid-cols-1 gap-4 ${isInstallmentSale ? 'md:grid-cols-2 2xl:grid-cols-3' : 'sm:grid-cols-3'}`}>

              {/* UNIT PRICE */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Unit Price (
                  {settings?.currency ||
                    'PKR'}
                  )
                </label>

                <input
                  type="number"
                  min="0"
                  value={unitPrice}
                  onChange={(e) =>
                    handleUnitPriceChange(
                      e.target.value
                    )
                  }
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />

              </div>

              {/* QUANTITY */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Quantity
                </label>

                <div className="flex items-center h-11 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">

                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(
                        Math.max(
                          1,
                          Number(quantity) -
                            1
                        )
                      )
                    }
                    className="w-10 h-full flex items-center justify-center hover:bg-slate-200/70 transition-colors text-slate-600"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, Number(selectedProduct?.quantity ?? 1))}
                    value={quantity}
                    onChange={(e) =>
                      handleQuantityChange(
                        e.target.value
                      )
                    }
                    className="flex-1 h-full text-center bg-transparent text-xs sm:text-sm font-black text-slate-800 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(
                        Number(quantity) +
                          1
                      )
                    }
                    disabled={Number(quantity) >= Number(selectedProduct?.quantity ?? 1)}
                    className="w-10 h-full flex items-center justify-center hover:bg-slate-200/70 transition-colors text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                </div>

              </div>

              {/* DISCOUNT */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Discount (
                  {settings?.currency ||
                    'PKR'}
                  )
                </label>

                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) =>
                    handleDiscountChange(
                      e.target.value
                    )
                  }
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-rose-600 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />

              </div>

            </div>

          </section>}

          {/* =================================================
              INSTALLMENT CONFIGURATION
          ================================================== */}

          {isInstallmentSale && (

            <section className="premium-card min-w-0 overflow-hidden p-4 sm:p-6 space-y-5 border-l-4 border-l-amber-400 animate-[pageEnter_0.3s_ease-out]">

              {/* HEADER */}

              <div className="flex min-w-0 flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">

                <div className="flex min-w-0 items-start gap-2.5">

                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">

                    <h2 className="text-sm font-black text-slate-900">
                      Step 3 · Financing terms
                    </h2>

                    <p className="text-xs text-slate-500 mt-1">
                      Set the amount paid today, financing rate, and repayment plan.
                    </p>

                  </div>

                </div>

                <span
                  className={`max-w-full self-start whitespace-normal break-words px-3 py-1 rounded-full text-[10px] font-black border ${
                    scheduleMode === 'manual'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  {scheduleMode === 'manual'
                    ? 'Manual Schedule'
                    : 'Automatic Schedule'}
                </span>

              </div>

              {/* =================================================
                  CONFIG INPUTS
              ================================================== */}

              <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 rounded-2xl bg-slate-50/80 p-3 sm:p-4 border border-slate-100">

                {/* DOWN PAYMENT */}

                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Down payment today (
                    {settings?.currency ||
                      'PKR'}
                    )
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={effectiveDownPayment}
                    onChange={(e) =>
                      handleDownPaymentChange(
                        e.target.value
                      )
                    }
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />

                </div>

                {/* TOTAL INSTALLMENTS */}

                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Number of installments
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={installmentDuration}
                    onChange={(e) =>
                      handleInstallmentDurationChange(
                        e.target.value
                      )
                    }
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />

                  <p className="text-[9px] text-slate-400 mt-1">
                    {treatDownPaymentAsFirstInstallment
                      ? `${getActualInstallmentCount()} remaining after down payment`
                      : `${getActualInstallmentCount()} scheduled installments`}
                  </p>

                </div>

                {/* MARKUP */}

                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Financing markup (%)
                  </label>

                  <div className="relative">

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={markupPercentage}
                      onChange={(e) =>
                        handleMarkupChange(
                          e.target.value
                        )
                      }
                      className="w-full h-11 border border-slate-200 rounded-xl pl-4 pr-10 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />

                    <Percent className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  </div>

                </div>

              </div>

              {/* =================================================
                  DOWN PAYMENT CHECKBOX
              ================================================== */}

              <label className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100 cursor-pointer hover:bg-amber-50 transition-colors">

                <input
                  type="checkbox"
                  checked={
                    treatDownPaymentAsFirstInstallment
                  }
                  onChange={
                    handleTreatDownPaymentChange
                  }
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />

                <div>

                  <p className="text-xs font-bold text-slate-800">
                    Count down payment as installment #1
                  </p>

                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {treatDownPaymentAsFirstInstallment
                      ? 'Down payment counts as payment #1; markup applies only to the remaining balance.'
                      : 'Down payment is separate; markup applies to the total before down payment is subtracted.'}
                  </p>

                </div>

              </label>

              {/* =================================================
                  SCHEDULE HEADER
              ================================================== */}

              <div className="space-y-3 pt-1">

                <div className="flex min-w-0 flex-col xl:flex-row xl:items-center justify-between gap-3">

                  <div>

                    <h3 className="text-sm font-black text-slate-900">
                      Step 4 · Payment schedule
                    </h3>

                    <p className="text-xs text-slate-500 mt-1">
                      Set payment dates and amounts.
                    </p>

                  </div>

                  {/* MODE BUTTONS */}

                  <div className="flex w-fit max-w-full items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 self-start">

                    <button
                      type="button"
                      onClick={
                        switchToAutomaticSchedule
                      }
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        scheduleMode ===
                        'auto'
                          ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Automatic
                    </button>

                    <button
                      type="button"
                      onClick={
                        switchToManualSchedule
                      }
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        scheduleMode ===
                        'manual'
                          ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Manual
                    </button>

                  </div>

                </div>

                {/* MANUAL DESCRIPTION */}

                {scheduleMode ===
                  'manual' && (

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100">

                    <CalendarDays className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />

                    <div>

                      <p className="text-[11px] text-blue-800 leading-snug">
                        Choose a separate due date for each payment. Dates can be in the same month or have gaps.
                      </p>

                    </div>

                  </div>

                )}

                {/* RESET */}

                {scheduleMode ===
                  'manual' && (

                  <div className="flex justify-end">

                    <button
                      type="button"
                      onClick={
                        resetSchedule
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                    >

                      <RotateCcw className="w-3.5 h-3.5" />

                      <span>
                        Reset dates
                      </span>

                    </button>

                  </div>

                )}

              </div>

              {/* =================================================
                  SCHEDULE ROWS
              ================================================== */}

              <div className="space-y-1.5 rounded-xl">

                {installmentSchedule.length ===
                0 ? (

                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">

                    <CalendarDays className="w-6 h-6 mx-auto text-slate-400 mb-2" />

                    <p className="text-xs font-black text-slate-600">
                      No installment schedule required
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Financed balance is currently zero.
                    </p>

                  </div>

                ) : (

                  installmentSchedule.map(
                    (item, index) => (

                      <div
                        key={`${item.installmentNumber}-${index}`}
                      className={`grid min-w-0 grid-cols-1 2xl:grid-cols-[minmax(8rem,1fr)_minmax(11rem,0.8fr)_minmax(11rem,0.8fr)] 2xl:items-center gap-3 px-3 py-2 rounded-lg border ${
                          scheduleMode ===
                          'manual'
                            ? 'border-blue-200 bg-blue-50/40'
                            : 'border-slate-200 bg-white'
                        }`}
                      >

                        {/* INSTALLMENT NUMBER */}

                        <div className="flex items-center gap-2">

                          <span className={`w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center ${scheduleMode === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                            #
                            {
                              item.installmentNumber
                            }
                          </span>

                          <p className="text-sm font-semibold text-slate-800">
                            Installment {item.installmentNumber}
                          </p>

                        </div>

                        {/* AMOUNT + DATE */}

                        <label className="block text-[11px] font-semibold text-slate-600">
                          Amount ({settings?.currency || 'PKR'})

                          {/* AMOUNT */}

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.amount
                              }
                              onChange={(
                                e
                              ) =>
                                updateInstallmentAmount(
                                  index,
                                  e.target
                                    .value
                                )
                              }
                              className="mt-1 w-full h-9 border border-slate-200 rounded-lg px-3 text-sm font-semibold text-slate-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                            />
                        </label>

                        <label className="block text-[11px] font-semibold text-slate-600">
                          Due date
                            <input
                              type="date"
                              value={
                                item.dueDate ||
                                ''
                              }
                              onChange={(
                                e
                              ) =>
                                updateInstallmentDate(
                                  index,
                                  e.target
                                    .value
                                )
                              }
                              className={`mt-1 w-full h-9 border rounded-lg px-3 text-sm font-semibold bg-white outline-none transition-all ${
                                scheduleMode ===
                                'manual'
                                  ? 'border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
                                  : 'border-slate-200 focus:border-blue-500'
                              }`}
                            />

                        </label>

                      </div>

                    )
                  )

                )}

              </div>

              {/* =================================================
                  SCHEDULE SUMMARY
              ================================================== */}

              {isInstallmentSale &&
                installmentSchedule.length >
                  0 && (

                  <div
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border px-3 py-2.5 mt-2 ${
                        scheduleIsBalanced
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-rose-50 border-rose-200'
                      }`}
                  >
                    <p className="text-xs font-semibold text-slate-700">
                      {installmentSchedule.length} installments
                      <span className="mx-2 text-slate-300">·</span>
                      Total {settings?.currency || 'PKR'} {formatMoney(scheduleTotal)}
                    </p>
                    <p
                      className={`text-xs font-bold ${
                          scheduleIsBalanced
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                    >
                        {scheduleIsBalanced
                          ? 'Balanced'
                          : scheduleDifference > 0
                            ? `Short by ${settings?.currency || 'PKR'} ${formatMoney(scheduleDifference)} — add this amount across payments.`
                            : `Over by ${settings?.currency || 'PKR'} ${formatMoney(Math.abs(scheduleDifference))} — reduce payments by this amount.`}
                    </p>
                  </div>

                )}

            </section>

          )}

        </div>

        {/* =====================================================
            RIGHT COLUMN
        ====================================================== */}

        <div className={`min-w-0 space-y-6 ${isInstallmentSale ? '2xl:sticky 2xl:top-4' : ''}`}>

          <div className={`min-w-0 overflow-hidden bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] rounded-3xl p-4 sm:p-6 text-white shadow-2xl shadow-blue-950/30 space-y-5 ${isInstallmentSale ? '2xl:rounded-2xl 2xl:p-5 2xl:space-y-4' : 'sticky top-24'}`}>

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">

              <div className="flex items-center gap-2">

                <Receipt className="w-4 h-4 text-blue-400" />

                <h3 className="font-black text-xs uppercase tracking-[0.16em] text-white">
                  Checkout Ledger
                </h3>

              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] font-black uppercase tracking-wider text-blue-300">
                {checkoutMode} Mode
              </span>

            </div>

            {/* =================================================
                PRICE CALCULATIONS
            ================================================== */}

            <div className="space-y-3 text-xs font-semibold text-slate-300">

              <div className="flex min-w-0 flex-wrap justify-between items-center gap-x-3 gap-y-1">

                <span className="text-slate-400">
                  Subtotal ({quantity} × Price)
                </span>

                <span className="font-bold text-white text-sm">
                  {settings?.currency ||
                    'PKR'}{' '}
                  {formatMoney(
                    subtotal
                  )}
                </span>

              </div>

              <div className="flex min-w-0 flex-wrap justify-between items-center gap-x-3 gap-y-1">

                <span className="text-slate-400">
                  Discount
                </span>

                <span className="font-bold text-rose-400">
                  - {settings?.currency ||
                    'PKR'}{' '}
                  {formatMoney(
                    appliedDiscount
                  )}
                </span>

              </div>

              <div className="border-t border-white/[0.08] pt-3 flex min-w-0 flex-wrap justify-between items-center gap-x-3 gap-y-1 text-sm font-black text-white">

                <span>
                  Net Total Payable
                </span>

                <span className="text-base text-emerald-400">
                  {settings?.currency ||
                    'PKR'}{' '}
                  {formatMoney(
                    finalTotal
                  )}
                </span>

              </div>

              {isInstallmentSale && (

                <div className="space-y-2.5 border-t border-white/[0.08] pt-3.5 text-xs text-slate-400">

                  <div className="flex min-w-0 flex-wrap justify-between items-center gap-x-3 gap-y-1">

                    <span>
                      Financing Markup (
                      {markupPercentage}
                      %)
                    </span>

                    <span className="text-amber-400 font-bold">
                      +
                      {settings?.currency ||
                        'PKR'}{' '}
                      {formatMoney(
                        markupAmount
                      )}
                    </span>

                  </div>

                  <div className="flex min-w-0 flex-wrap justify-between items-center gap-x-3 gap-y-1">

                    <span>
                      Total Deal With Markup
                    </span>

                    <span className="text-white font-bold">
                      {settings?.currency ||
                        'PKR'}{' '}
                      {formatMoney(
                        totalWithMarkup
                      )}
                    </span>

                  </div>

                  <div className="flex min-w-0 flex-wrap justify-between items-center gap-x-3 gap-y-1">

                    <span>
                      Down Payment Received
                    </span>

                    <span className="text-emerald-400 font-bold">
                      -
                      {settings?.currency ||
                        'PKR'}{' '}
                      {formatMoney(
                        effectiveDownPayment
                      )}
                    </span>

                  </div>

                  <div className="flex min-w-0 flex-wrap justify-between items-center gap-x-3 gap-y-1 border-t border-white/[0.08] pt-2 font-black text-white">

                    <span>
                      Financed Balance Dues
                    </span>

                    <span className="text-indigo-400 text-sm">
                      {settings?.currency ||
                        'PKR'}{' '}
                      {formatMoney(
                        financedBalance
                      )}
                    </span>

                  </div>

                  <div className="flex min-w-0 flex-wrap justify-between items-center gap-x-3 gap-y-1">

                    <span>
                      Scheduled Installments
                    </span>

                    <span className="text-blue-300 font-bold">
                      {
                        installmentSchedule.length
                      }
                    </span>

                  </div>

                </div>

              )}

            </div>

            {/* =================================================
                FINALIZE BUTTON
            ================================================== */}

            <div className="sticky bottom-3 z-40 rounded-2xl bg-slate-950/95 p-2 shadow-xl shadow-slate-950/20 backdrop-blur-md">
              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >

              {isSubmitting ? (

                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />

                  <span>
                    Processing Checkout...
                  </span>
                </>

              ) : (

                <>
                  <CheckCircle2 className="w-4 h-4" />

                  <span>
                    Finalize {checkoutMode} Sale
                  </span>

                  <ArrowRight className="w-4 h-4" />
                </>

              )}

              </button>
            </div>

          </div>

        </div>

      </form>

      <ExistingPrintPopup
        kind={printPopup?.kind}
        recordId={printPopup?.recordId}
        onClose={() => {
          setPrintPopup(null);
          navigate(isInstallmentSale ? '/installments' : '/sales');
        }}
      />
    </div>
  );
};

export default NewSale;
