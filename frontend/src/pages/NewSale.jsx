import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

import {
  ArrowLeft,
  Search,
  User,
  Phone,
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
  Wallet,
  Receipt,
  Hash,
  Minus,
  Plus,
  Edit3,
  RotateCcw,
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

  const isInstallmentPath =
    location.pathname.startsWith('/installments');

  const isSalesPath =
    location.pathname.startsWith('/sales');

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

  const [manualInvoiceNumber, setManualInvoiceNumber] =
    useState('');

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const [showCustomerDropdown, setShowCustomerDropdown] =
    useState(false);

  const [showProductDropdown, setShowProductDropdown] =
    useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  const [selectedProduct, setSelectedProduct] =
    useState(null);


  /* =========================================================
     SALE VALUES
  ========================================================= */

  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discount, setDiscount] = useState(0);


  /* =========================================================
     INSTALLMENT VALUES
  ========================================================= */

  const [downPayment, setDownPayment] = useState(0);

  const [installmentDuration, setInstallmentDuration] =
    useState(12);

  const [markupPercentage, setMarkupPercentage] =
    useState(0);

  const [
    treatDownPaymentAsFirstInstallment,
    setTreatDownPaymentAsFirstInstallment,
  ] = useState(false);


  /* =========================================================
     SCHEDULE
  ========================================================= */

  const [installmentSchedule, setInstallmentSchedule] =
    useState([]);

  const [scheduleMode, setScheduleMode] =
    useState('auto');

  const [manualFinancedBalance, setManualFinancedBalance] =
    useState(null);


  /* =========================================================
     SUBMIT / ERROR
  ========================================================= */

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState('');


  /* =========================================================
     LOAD DATA
  ========================================================= */

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          customersResponse,
          productsResponse,
        ] = await Promise.all([
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

        setCustomers(
          Array.isArray(customerData)
            ? customerData
            : []
        );

        setProducts(
          Array.isArray(productData)
            ? productData
            : []
        );
      } catch (error) {
        console.error(
          'New Sale load error:',
          error
        );

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
    const search = String(
      customerSearch || ''
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    if (!search) {
      return customers.slice(0, 20);
    }

    return customers
      .filter((customer) => {
        const searchableText = [
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
          .filter(
            (value) =>
              value !== null &&
              value !== undefined
          )
          .map((value) =>
            String(value)
              .toLowerCase()
              .replace(/\s+/g, ' ')
          )
          .join(' ');

        return searchableText.includes(search);
      })
      .slice(0, 20);
  }, [
    customers,
    customerSearch,
  ]);


  /* =========================================================
     FILTER PRODUCTS
  ========================================================= */

  const filteredProducts = useMemo(() => {
    const search = String(
      productSearch || ''
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    if (!search) {
      return products.slice(0, 20);
    }

    return products
      .filter((product) => {
        const searchableText = [
          product?.name,
          product?.productName,
          product?.title,
          product?.sku,
          product?.productCode,
          product?.code,
          product?.category,
          product?.brand,
          product?._id,
          product?.id,
        ]
          .filter(
            (value) =>
              value !== null &&
              value !== undefined
          )
          .map((value) =>
            String(value)
              .toLowerCase()
              .replace(/\s+/g, ' ')
          )
          .join(' ');

        return searchableText.includes(search);
      })
      .slice(0, 20);
  }, [
    products,
    productSearch,
  ]);


  /* =========================================================
     SELECT CUSTOMER
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


  /* =========================================================
     SELECT PRODUCT
  ========================================================= */

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);

    const price =
      product?.salePrice ??
      product?.sellingPrice ??
      product?.price ??
      0;

    setUnitPrice(
      Number(price) || 0
    );

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

    setErrorMsg('');
  };


  /* =========================================================
     CLEAR CUSTOMER
  ========================================================= */

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };


  /* =========================================================
     CLEAR PRODUCT
  ========================================================= */

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
    return Math.max(
      0,
      Number(quantity || 0) *
        Number(unitPrice || 0)
    );
  }, [
    quantity,
    unitPrice,
  ]);


  const finalTotal = useMemo(() => {
    return Math.max(
      0,
      subtotal -
        Number(discount || 0)
    );
  }, [
    subtotal,
    discount,
  ]);


  /* =========================================================
     INSTALLMENT CALCULATION

     CHECKBOX ON:
       Net Payable
       - Down Payment
       = Remaining
       + Markup on Remaining
       = Financed Balance

     CHECKBOX OFF:
       Net Payable
       + Markup
       = Total With Markup
       - Down Payment
       = Financed Balance
  ========================================================= */

  const calculationBaseAfterDownPayment =
    useMemo(() => {
      if (!isInstallmentSale) {
        return 0;
      }

      return Math.max(
        0,
        finalTotal -
          Number(downPayment || 0)
      );
    }, [
      isInstallmentSale,
      finalTotal,
      downPayment,
    ]);


  const markupAmount = useMemo(() => {
    if (!isInstallmentSale) {
      return 0;
    }

    const markupRate =
      Number(markupPercentage || 0) / 100;

    if (
      treatDownPaymentAsFirstInstallment
    ) {
      return Math.max(
        0,
        calculationBaseAfterDownPayment *
          markupRate
      );
    }

    return Math.max(
      0,
      finalTotal *
        markupRate
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

    if (
      treatDownPaymentAsFirstInstallment
    ) {
      return Math.max(
        0,
        calculationBaseAfterDownPayment +
          markupAmount
      );
    }

    return Math.max(
      0,
      finalTotal +
        markupAmount
    );
  }, [
    isInstallmentSale,
    treatDownPaymentAsFirstInstallment,
    calculationBaseAfterDownPayment,
    finalTotal,
    markupAmount,
  ]);


  const calculatedFinancedBalance =
    useMemo(() => {
      if (!isInstallmentSale) {
        return 0;
      }

      if (
        treatDownPaymentAsFirstInstallment
      ) {
        return Math.max(
          0,
          totalWithMarkup
        );
      }

      return Math.max(
        0,
        totalWithMarkup -
          Number(downPayment || 0)
      );
    }, [
      isInstallmentSale,
      treatDownPaymentAsFirstInstallment,
      totalWithMarkup,
      downPayment,
    ]);


  const financedBalance = useMemo(() => {
    if (!isInstallmentSale) {
      return 0;
    }

    if (
      manualFinancedBalance !== null &&
      Number.isFinite(
        Number(manualFinancedBalance)
      )
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


  /* =========================================================
     EFFECTIVE DOWN PAYMENT
  ========================================================= */

  const effectiveDownPayment = useMemo(() => {
    if (!isInstallmentSale) {
      return 0;
    }

    if (
      manualFinancedBalance !== null
    ) {
      if (
        treatDownPaymentAsFirstInstallment
      ) {
        const markupRate =
          Number(markupPercentage || 0) /
          100;

        if (markupRate >= 0) {
          const amountBeforeMarkup =
            Number(
              manualFinancedBalance || 0
            ) /
            (1 + markupRate);

          return Math.max(
            0,
            roundMoney(
              finalTotal -
                amountBeforeMarkup
            )
          );
        }
      }

      return Math.max(
        0,
        roundMoney(
          totalWithMarkup -
            Number(
              manualFinancedBalance || 0
            )
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
    return Math.max(
      1,
      Number(
        installmentDuration || 1
      )
    );
  };


  /* =========================================================
     BUILD SCHEDULE
  ========================================================= */

  const buildInstallmentSchedule = (
    financedAmount,
    count
  ) => {
    const total =
      roundMoney(financedAmount);

    const installmentCount =
      Math.max(
        0,
        Number(count || 0)
      );

    if (
      installmentCount === 0 ||
      total <= 0
    ) {
      return [];
    }

    const baseAmount =
      roundMoney(
        total /
          installmentCount
      );

    const schedule = [];

    let distributed = 0;

    const today = new Date();

    for (
      let index = 0;
      index < installmentCount;
      index++
    ) {
      const installmentNumber =
        index + 1;

      let amount;

      if (
        index ===
        installmentCount - 1
      ) {
        amount = roundMoney(
          total -
            distributed
        );
      } else {
        amount = baseAmount;
      }

      distributed =
        roundMoney(
          distributed +
            amount
        );

      const dueDate =
        new Date(today);

      dueDate.setMonth(
        dueDate.getMonth() +
          installmentNumber
      );

      schedule.push({
        installmentNumber,
        amount,
        dueDate:
          formatDateInput(
            dueDate
          ),
      });
    }

    return schedule;
  };


  /* =========================================================
     AUTO SCHEDULE
  ========================================================= */

  useEffect(() => {
    if (!isInstallmentSale) {
      setInstallmentSchedule([]);
      return;
    }

    if (
      scheduleMode !== 'auto'
    ) {
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
    scheduleMode,
  ]);


  /* =========================================================
     SCHEDULE TOTAL
  ========================================================= */

  const scheduleTotal =
    useMemo(() => {
      return roundMoney(
        installmentSchedule.reduce(
          (sum, item) =>
            sum +
            Number(
              item?.amount || 0
            ),
          0
        )
      );
    }, [
      installmentSchedule,
    ]);


  /* =========================================================
     SCHEDULE DIFFERENCE
  ========================================================= */

  const scheduleDifference =
    useMemo(() => {
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
    Math.abs(
      scheduleDifference
    ) < 0.01;


  /* =========================================================
     UPDATE FINANCED BALANCE
  ========================================================= */

  const updateFinancedBalance = (
    value
  ) => {
    const numericValue =
      Math.max(
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

    setScheduleMode(
      'manual'
    );
  };


  /* =========================================================
     RETURN TO AUTOMATIC
  ========================================================= */

  const useAutomaticFinancedBalance =
    () => {
      setManualFinancedBalance(
        null
      );

      setErrorMsg('');

      setScheduleMode(
        'auto'
      );
    };


  /* =========================================================
     UPDATE INSTALLMENT AMOUNT
  ========================================================= */

  const updateInstallmentAmount = (
    index,
    value
  ) => {
    setScheduleMode(
      'manual'
    );

    setInstallmentSchedule(
      (previous) =>
        previous.map(
          (
            item,
            itemIndex
          ) =>
            itemIndex === index
              ? {
                  ...item,
                  amount:
                    value === ''
                      ? ''
                      : Number(
                          value
                        ),
                }
              : item
        )
    );
  };


  /* =========================================================
     UPDATE INSTALLMENT DATE
  ========================================================= */

  const updateInstallmentDate = (
    index,
    value
  ) => {
    setScheduleMode(
      'manual'
    );

    setInstallmentSchedule(
      (previous) =>
        previous.map(
          (
            item,
            itemIndex
          ) =>
            itemIndex === index
              ? {
                  ...item,
                  dueDate:
                    value,
                }
              : item
        )
    );
  };


  /* =========================================================
     AUTO ADJUST SCHEDULE
  ========================================================= */

  const resetSchedule = () => {
    const count =
      getActualInstallmentCount();

    const newSchedule =
      buildInstallmentSchedule(
        financedBalance,
        count
      );

    setScheduleMode(
      'auto'
    );

    setInstallmentSchedule(
      newSchedule
    );

    setErrorMsg('');
  };


  /* =========================================================
     INPUT HANDLERS
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

    setManualFinancedBalance(
      null
    );

    setScheduleMode(
      'auto'
    );
  };


  const handleQuantityChange = (
    value
  ) => {
    setQuantity(
      Math.max(
        1,
        Number(value || 1)
      )
    );

    setManualFinancedBalance(
      null
    );

    setScheduleMode(
      'auto'
    );
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

    setManualFinancedBalance(
      null
    );

    setScheduleMode(
      'auto'
    );
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

    setManualFinancedBalance(
      null
    );

    setScheduleMode(
      'auto'
    );
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

    setManualFinancedBalance(
      null
    );

    setScheduleMode(
      'auto'
    );
  };


  /* =========================================================
     CHECKBOX HANDLER
  ========================================================= */

  const handleTreatDownPaymentChange = (
    event
  ) => {
    setTreatDownPaymentAsFirstInstallment(
      event.target.checked
    );

    setManualFinancedBalance(
      null
    );

    setScheduleMode(
      'auto'
    );

    setErrorMsg('');
  };


  /* =========================================================
     INSTALLMENT COUNT CHANGE
  ========================================================= */

  const handleInstallmentDurationChange = (
    value
  ) => {
    const numericValue =
      Math.max(
        1,
        Number(value || 1)
      );

    setInstallmentDuration(
      numericValue
    );

    setScheduleMode(
      'auto'
    );

    setManualFinancedBalance(
      null
    );

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

    if (!selectedCustomer) {
      setErrorMsg(
        'Please select a customer.'
      );
      return;
    }

    if (!selectedProduct) {
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


    /* =====================================================
       INSTALLMENT VALIDATION
    ===================================================== */

    if (isInstallmentSale) {
      if (
        Number(
          installmentDuration || 0
        ) < 1
      ) {
        setErrorMsg(
          'Installment count must be at least 1.'
        );
        return;
      }

      if (
        Number(
          markupPercentage || 0
        ) < 0
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
        Number(
          financedBalance || 0
        ) < 0
      ) {
        setErrorMsg(
          'Financed balance cannot be negative.'
        );
        return;
      }

      if (
        Number(
          financedBalance || 0
        ) >
        Number(
          totalWithMarkup || 0
        )
      ) {
        setErrorMsg(
          'Financed balance cannot be greater than Total With Markup.'
        );
        return;
      }

      if (
        Number(
          financedBalance || 0
        ) > 0 &&
        installmentSchedule.length === 0
      ) {
        setErrorMsg(
          'Installment schedule is empty.'
        );
        return;
      }

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

      if (!scheduleIsBalanced) {
        setErrorMsg(
          `Installment schedule is not balanced. Difference: ${formatMoney(
            scheduleDifference
          )}`
        );
        return;
      }

      const invalidInstallment =
        installmentSchedule.find(
          (item) =>
            Number(
              item?.amount || 0
            ) < 0 ||
            !item?.dueDate
        );

      if (invalidInstallment) {
        setErrorMsg(
          'Please check installment amounts and due dates.'
        );
        return;
      }
    }


    /* =====================================================
       PAYLOAD
    ===================================================== */

    const payload = {
      manualInvoiceNumber:
        manualInvoiceNumber
          ? manualInvoiceNumber.trim()
          : undefined,

      customer:
        selectedCustomer,

      product:
        selectedProduct,

      quantity:
        Number(quantity),

      unitPrice:
        Number(unitPrice),

      discount:
        Number(discount),

      paymentType:
        paymentType,

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
                  item.dueDate,
              })
            )
          : [],
    };


    /* =====================================================
       API
    ===================================================== */

    try {
      setIsSubmitting(true);

      await api.post(
        '/sales',
        payload
      );

      toast.success(
        isInstallmentSale
          ? 'Installment sale created successfully.'
          : 'Cash sale created successfully.'
      );

      navigate(
        isInstallmentSale
          ? '/installments'
          : '/sales'
      );
    } catch (error) {
      console.error(
        'Create sale error:',
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Unable to create sale.';

      setErrorMsg(message);

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };


  /* =========================================================
     CUSTOMER DISPLAY HELPERS
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


  /* =========================================================
     PRODUCT DISPLAY HELPERS
  ========================================================= */

  const productName =
    selectedProduct?.name ||
    selectedProduct?.productName ||
    selectedProduct?.title ||
    'Product';

  const productSku =
    selectedProduct?.sku ||
    selectedProduct?.productCode ||
    selectedProduct?.code ||
    '';


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =================================================
          HEADER
      ================================================== */}

      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur no-print">

        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={() =>
                  navigate(
                    isInstallmentSale
                      ? '/installments'
                      : '/sales'
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ArrowLeft size={19} />
              </button>

              <div>

                <div className="flex items-center gap-2">

                  <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    New {checkoutMode} Sale
                  </h1>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                      isInstallmentSale
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {checkoutMode}
                  </span>

                </div>

                <p className="mt-0.5 text-sm text-slate-500">
                  Create a new{' '}
                  {checkoutMode.toLowerCase()}{' '}
                  transaction
                </p>

              </div>

            </div>


            <div className="flex items-center gap-2">

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">

                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Net Payable
                </p>

                <p className="text-lg font-bold text-slate-900">
                  Rs. {formatMoney(finalTotal)}
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          MAIN
      ================================================== */}

      <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">

        {/* ERROR */}

        {errorMsg && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              {errorMsg}
            </div>

            <button
              type="button"
              onClick={() =>
                setErrorMsg('')
              }
              className="shrink-0 text-red-500 hover:text-red-700"
            >
              <X size={17} />
            </button>

          </div>
        )}


        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]"
        >

          {/* =================================================
              LEFT SIDE
          ================================================== */}

          <div className="space-y-5">

            {/* =================================================
                INVOICE
            ================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4">

                <div className="flex items-center gap-2">

                  <Receipt
                    size={18}
                    className="text-slate-600"
                  />

                  <h2 className="font-bold text-slate-900">
                    Invoice Details
                  </h2>

                </div>

              </div>

              <div className="p-5">

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Invoice Number
                </label>

                <div className="relative">

                  <Hash
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={manualInvoiceNumber}
                    onChange={(e) =>
                      setManualInvoiceNumber(
                        e.target.value
                      )
                    }
                    placeholder="Auto generated if left blank"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />

                </div>

              </div>

            </section>


            {/* =================================================
                CUSTOMER
            ================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4">

                <div className="flex items-center justify-between gap-3">

                  <div className="flex items-center gap-2">

                    <User
                      size={18}
                      className="text-slate-600"
                    />

                    <h2 className="font-bold text-slate-900">
                      Customer
                    </h2>

                  </div>

                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={
                        clearCustomer
                      }
                      className="text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                      Clear
                    </button>
                  )}

                </div>

              </div>

              <div className="p-5">

                {/* IMPORTANT:
                    z-30 keeps input/dropdown above
                    the fixed backdrop.
                */}

                <div className="relative z-30">

                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(
                        e.target.value
                      );

                      setShowCustomerDropdown(
                        true
                      );
                    }}
                    onFocus={() =>
                      setShowCustomerDropdown(
                        true
                      )
                    }
                    placeholder="Search customer by name, phone or CNIC..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />

                  <ChevronDown
                    size={17}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  {showCustomerDropdown && (
                    <>

                      {/* BACKDROP */}

                      <div
                        className="fixed inset-0 z-20"
                        onMouseDown={() =>
                          setShowCustomerDropdown(
                            false
                          )
                        }
                      />


                      {/* DROPDOWN */}

                      <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">

                        {filteredCustomers.length ===
                        0 ? (
                          <div className="px-3 py-5 text-center text-sm text-slate-500">
                            No customers found.
                          </div>
                        ) : (
                          filteredCustomers.map(
                            (customer) => (
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
                                className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-50"
                              >

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">

                                  <User
                                    size={17}
                                  />

                                </div>

                                <div className="min-w-0 flex-1">

                                  <p className="truncate text-sm font-semibold text-slate-800">
                                    {customer?.name ||
                                      customer?.fullName ||
                                      customer?.customerName ||
                                      'Unnamed Customer'}
                                  </p>

                                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">

                                    {(customer?.phone ||
                                      customer?.mobile ||
                                      customer?.mobileNumber) && (
                                      <span className="flex items-center gap-1">
                                        <Phone
                                          size={12}
                                        />

                                        {customer?.phone ||
                                          customer?.mobile ||
                                          customer?.mobileNumber}
                                      </span>
                                    )}

                                    {(customer?.cnic ||
                                      customer?.cnicNumber) && (
                                      <span>
                                        CNIC:{' '}
                                        {customer?.cnic ||
                                          customer?.cnicNumber}
                                      </span>
                                    )}

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
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">

                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">

                        <User
                          size={14}
                        />

                        Customer

                      </div>

                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {customerName}
                      </p>

                    </div>


                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">

                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">

                        <Phone
                          size={14}
                        />

                        Mobile

                      </div>

                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {customerPhone ||
                          'Not provided'}
                      </p>

                    </div>

                  </div>
                )}

              </div>

            </section>


            {/* =================================================
                PRODUCT
            ================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4">

                <div className="flex items-center justify-between gap-3">

                  <div className="flex items-center gap-2">

                    <Package
                      size={18}
                      className="text-slate-600"
                    />

                    <h2 className="font-bold text-slate-900">
                      Product
                    </h2>

                  </div>

                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={
                        clearProduct
                      }
                      className="text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                      Clear
                    </button>
                  )}

                </div>

              </div>

              <div className="p-5">

                {/* IMPORTANT:
                    z-30 keeps product search above backdrop.
                */}

                <div className="relative z-30">

                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(
                        e.target.value
                      );

                      setShowProductDropdown(
                        true
                      );
                    }}
                    onFocus={() =>
                      setShowProductDropdown(
                        true
                      )
                    }
                    placeholder="Search product..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />

                  <ChevronDown
                    size={17}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  {showProductDropdown && (
                    <>

                      {/* BACKDROP */}

                      <div
                        className="fixed inset-0 z-20"
                        onMouseDown={() =>
                          setShowProductDropdown(
                            false
                          )
                        }
                      />


                      {/* DROPDOWN */}

                      <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">

                        {filteredProducts.length ===
                        0 ? (
                          <div className="px-3 py-5 text-center text-sm text-slate-500">
                            No products found.
                          </div>
                        ) : (
                          filteredProducts.map(
                            (product) => (
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
                                className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-50"
                              >

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">

                                  <Package
                                    size={17}
                                  />

                                </div>

                                <div className="min-w-0 flex-1">

                                  <p className="truncate text-sm font-semibold text-slate-800">
                                    {product?.name ||
                                      product?.productName ||
                                      product?.title ||
                                      'Unnamed Product'}
                                  </p>

                                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">

                                    {(
                                      product?.sku ||
                                      product?.productCode ||
                                      product?.code
                                    ) && (
                                      <span>
                                        SKU:{' '}
                                        {product?.sku ||
                                          product?.productCode ||
                                          product?.code}
                                      </span>
                                    )}

                                    <span>
                                      Rs.{' '}
                                      {formatMoney(
                                        product?.salePrice ??
                                          product?.sellingPrice ??
                                          product?.price ??
                                          0
                                      )}
                                    </span>

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
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">

                    <div className="flex items-start gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">

                        <Package
                          size={19}
                        />

                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="truncate font-bold text-slate-900">
                          {productName}
                        </p>

                        {productSku && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            SKU: {productSku}
                          </p>
                        )}

                      </div>

                    </div>

                  </div>
                )}

              </div>

            </section>


            {/* =================================================
                PRICE / QUANTITY
            ================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4">

                <div className="flex items-center gap-2">

                  <Calculator
                    size={18}
                    className="text-slate-600"
                  />

                  <h2 className="font-bold text-slate-900">
                    Pricing
                  </h2>

                </div>

              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">

                {/* UNIT PRICE */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Unit Price
                  </label>

                  <div className="relative">

                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rs.
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={unitPrice}
                      onChange={(e) =>
                        handleUnitPriceChange(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />

                  </div>

                </div>


                {/* QUANTITY */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Quantity
                  </label>

                  <div className="flex overflow-hidden rounded-xl border border-slate-200">

                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(
                          Math.max(
                            1,
                            Number(
                              quantity
                            ) - 1
                          )
                        )
                      }
                      className="flex h-11 w-11 items-center justify-center bg-slate-50 text-slate-600 transition hover:bg-slate-100"
                    >
                      <Minus size={16} />
                    </button>

                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) =>
                        handleQuantityChange(
                          e.target.value
                        )
                      }
                      className="min-w-0 flex-1 border-x border-slate-200 text-center text-sm font-bold outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(
                          Number(
                            quantity
                          ) + 1
                        )
                      }
                      className="flex h-11 w-11 items-center justify-center bg-slate-50 text-slate-600 transition hover:bg-slate-100"
                    >
                      <Plus size={16} />
                    </button>

                  </div>

                </div>


                {/* DISCOUNT */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Discount
                  </label>

                  <div className="relative">

                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rs.
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) =>
                        handleDiscountChange(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />

                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                INSTALLMENT CONFIG
            ================================================== */}

            {isInstallmentSale && (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 px-5 py-4">

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <div className="flex items-center gap-2">

                        <CreditCard
                          size={18}
                          className="text-amber-600"
                        />

                        <h2 className="font-bold text-slate-900">
                          Installment Configuration
                        </h2>

                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        Configure down payment, markup and installment schedule.
                      </p>

                    </div>

                    <div
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        scheduleMode ===
                        'manual'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {scheduleMode ===
                      'manual'
                        ? 'Manual Schedule'
                        : 'Auto Schedule'}
                    </div>

                  </div>

                </div>


                <div className="space-y-5 p-5">

                  {/* CONFIG GRID */}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                    {/* DOWN PAYMENT */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Down Payment
                      </label>

                      <div className="relative">

                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          Rs.
                        </span>

                        <input
                          type="number"
                          min="0"
                          value={
                            effectiveDownPayment
                          }
                          onChange={(e) =>
                            handleDownPaymentChange(
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />

                      </div>


                      {/* CHECKBOX */}

                      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">

                        <input
                          type="checkbox"
                          checked={
                            treatDownPaymentAsFirstInstallment
                          }
                          onChange={
                            handleTreatDownPaymentChange
                          }
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />

                        <span className="min-w-0">

                          <span className="block text-sm font-bold text-slate-800">
                            Down Payment as First Installment
                          </span>

                          {treatDownPaymentAsFirstInstallment ? (
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              Down Payment pehle minus hoga, phir remaining balance par markup lagega.
                            </span>
                          ) : (
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              Pehle Net Payable par markup lagega, phir Down Payment minus hoga.
                            </span>
                          )}

                        </span>

                      </label>

                    </div>


                    {/* INSTALLMENT COUNT */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Installment Count
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          installmentDuration
                        }
                        onChange={(e) =>
                          handleInstallmentDurationChange(
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      />

                      <p className="mt-1.5 text-xs text-slate-400">
                        Enter exactly how many installments you want.
                      </p>

                    </div>


                    {/* MARKUP */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Markup Percentage
                      </label>

                      <div className="relative">

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            markupPercentage
                          }
                          onChange={(e) =>
                            handleMarkupChange(
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />

                        <Percent
                          size={16}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                      </div>

                    </div>


                    {/* MARKUP AMOUNT */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Markup Amount
                      </label>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800">
                        Rs.{' '}
                        {formatMoney(
                          markupAmount
                        )}
                      </div>

                    </div>


                    {/* TOTAL WITH MARKUP */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Total With Markup
                      </label>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-800">
                        Rs.{' '}
                        {formatMoney(
                          totalWithMarkup
                        )}
                      </div>

                    </div>


                    {/* CALCULATED FINANCED */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Calculated Financed Balance
                      </label>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800">
                        Rs.{' '}
                        {formatMoney(
                          calculatedFinancedBalance
                        )}
                      </div>

                    </div>

                  </div>


                  {/* MANUAL / AUTO CONTROLS */}

                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <div className="flex items-center gap-2">

                        {scheduleMode ===
                        'manual' ? (
                          <Edit3
                            size={17}
                            className="text-blue-600"
                          />
                        ) : (
                          <Calculator
                            size={17}
                            className="text-emerald-600"
                          />
                        )}

                        <p className="text-sm font-bold text-slate-800">
                          Installment Schedule
                        </p>

                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        You can manually edit every installment amount and due date.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={
                        resetSchedule
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      <RotateCcw
                        size={16}
                      />

                      Auto Adjust Schedule
                    </button>

                  </div>


                  {/* INSTALLMENT SCHEDULE */}

                  <div className="overflow-hidden rounded-2xl border border-slate-200">

                    <div className="hidden grid-cols-[80px_minmax(0,1fr)_180px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 sm:grid">

                      <div>#</div>

                      <div>Amount</div>

                      <div>Due Date</div>

                    </div>


                    <div className="divide-y divide-slate-100">

                      {installmentSchedule.length ===
                      0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">
                          No installment schedule available.
                        </div>
                      ) : (
                        installmentSchedule.map(
                          (
                            installment,
                            index
                          ) => (
                            <div
                              key={
                                installment?.installmentNumber ||
                                index
                              }
                              className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[80px_minmax(0,1fr)_180px] sm:items-center"
                            >

                              <div className="flex items-center gap-2">

                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                                  {
                                    installment.installmentNumber
                                  }
                                </span>

                                <span className="text-xs font-semibold text-slate-400 sm:hidden">
                                  Installment
                                </span>

                              </div>


                              <div>

                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 sm:hidden">
                                  Amount
                                </label>

                                <div className="relative">

                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                    Rs.
                                  </span>

                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                      installment.amount
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateInstallmentAmount(
                                        index,
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                                  />

                                </div>

                              </div>


                              <div>

                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 sm:hidden">
                                  Due Date
                                </label>

                                <div className="relative">

                                  <CalendarDays
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                  />

                                  <input
                                    type="date"
                                    value={
                                      installment.dueDate ||
                                      ''
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateInstallmentDate(
                                        index,
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                                  />

                                </div>

                              </div>

                            </div>
                          )
                        )
                      )}

                    </div>

                  </div>


                  {/* RECONCILIATION */}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Financed Balance
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        Rs.{' '}
                        {formatMoney(
                          financedBalance
                        )}
                      </p>

                    </div>


                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Schedule Total
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        Rs.{' '}
                        {formatMoney(
                          scheduleTotal
                        )}
                      </p>

                    </div>


                    <div
                      className={`rounded-xl border p-4 ${
                        scheduleIsBalanced
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >

                      <p
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          scheduleIsBalanced
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        Difference
                      </p>

                      <p
                        className={`mt-1 text-lg font-bold ${
                          scheduleIsBalanced
                            ? 'text-emerald-700'
                            : 'text-red-700'
                        }`}
                      >
                        Rs.{' '}
                        {formatMoney(
                          Math.abs(
                            scheduleDifference
                          )
                        )}
                      </p>

                    </div>

                  </div>

                </div>

              </section>
            )}

          </div>


          {/* =================================================
              RIGHT CHECKOUT LEDGER
          ================================================== */}

          <aside className="xl:sticky xl:top-[105px] xl:h-[calc(100vh-125px)]">

            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* HEADER */}

              <div className="shrink-0 border-b border-slate-100 px-5 py-4">

                <div className="flex items-center gap-2">

                  <Wallet
                    size={19}
                    className="text-slate-700"
                  />

                  <h2 className="font-bold text-slate-900">
                    Checkout Ledger
                  </h2>

                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Review all financial details before finalizing.
                </p>

              </div>


              {/* SCROLL AREA */}

              <div className="min-h-0 flex-1 overflow-y-auto">

                <div className="space-y-4 p-5">

                  {/* PRODUCT */}

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">

                    <div className="flex items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">

                        <Package
                          size={17}
                        />

                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-sm font-bold text-slate-800">
                          {selectedProduct
                            ? productName
                            : 'No product selected'}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Qty:{' '}
                          {quantity}
                        </p>

                      </div>

                    </div>

                  </div>


                  {/* UNIT PRICE */}

                  <div>

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-slate-500">
                        Unit Price
                      </span>

                      <span className="font-semibold text-slate-800">
                        Rs.{' '}
                        {formatMoney(
                          unitPrice
                        )}
                      </span>

                    </div>

                  </div>


                  {/* QUANTITY */}

                  <div>

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-slate-500">
                        Quantity
                      </span>

                      <span className="font-semibold text-slate-800">
                        {quantity}
                      </span>

                    </div>

                  </div>


                  {/* SUBTOTAL */}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">

                    <span className="text-sm font-semibold text-slate-600">
                      Subtotal
                    </span>

                    <span className="font-bold text-slate-900">
                      Rs.{' '}
                      {formatMoney(
                        subtotal
                      )}
                    </span>

                  </div>


                  {/* DISCOUNT */}

                  <div className="flex items-center justify-between">

                    <span className="text-sm text-slate-500">
                      Discount
                    </span>

                    <span className="font-semibold text-red-600">
                      - Rs.{' '}
                      {formatMoney(
                        discount
                      )}
                    </span>

                  </div>


                  {/* NET PAYABLE */}

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <div className="flex items-center justify-between">

                      <span className="text-sm font-bold text-slate-700">
                        Net Payable
                      </span>

                      <span className="text-xl font-black text-slate-900">
                        Rs.{' '}
                        {formatMoney(
                          finalTotal
                        )}
                      </span>

                    </div>

                  </div>


                  {isInstallmentSale && (
                    <>

                      {/* MARKUP % */}

                      <div className="flex items-center justify-between">

                        <span className="text-sm text-slate-500">
                          Markup
                        </span>

                        <span className="font-semibold text-slate-800">
                          {formatMoney(
                            markupPercentage
                          )}
                          %
                        </span>

                      </div>


                      {/* MARKUP AMOUNT */}

                      <div className="flex items-center justify-between">

                        <span className="text-sm text-slate-500">
                          Markup Amount
                        </span>

                        <span className="font-semibold text-amber-700">
                          Rs.{' '}
                          {formatMoney(
                            markupAmount
                          )}
                        </span>

                      </div>


                      {/* TOTAL WITH MARKUP */}

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">

                        <span className="text-sm font-bold text-slate-700">
                          Total With Markup
                        </span>

                        <span className="font-black text-amber-700">
                          Rs.{' '}
                          {formatMoney(
                            totalWithMarkup
                          )}
                        </span>

                      </div>


                      {/* DOWN PAYMENT */}

                      <div className="rounded-xl border border-slate-200 bg-white p-3">

                        <div className="flex items-center justify-between">

                          <span className="text-sm font-semibold text-slate-600">
                            Down Payment
                          </span>

                          <span className="font-bold text-slate-900">
                            Rs.{' '}
                            {formatMoney(
                              effectiveDownPayment
                            )}
                          </span>

                        </div>

                        <p className="mt-1 text-[11px] leading-4 text-slate-400">

                          {treatDownPaymentAsFirstInstallment
                            ? 'DP is deducted before markup calculation.'
                            : 'DP is deducted after markup calculation.'}

                        </p>

                      </div>


                      {/* FINANCED BALANCE */}

                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">

                        <div className="mb-2 flex items-center justify-between gap-2">

                          <span className="text-sm font-bold text-blue-800">
                            Financed Balance
                          </span>

                          {manualFinancedBalance !==
                            null && (
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                              Manual
                            </span>
                          )}

                        </div>

                        <div className="relative">

                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">
                            Rs.
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              financedBalance
                            }
                            onChange={(e) =>
                              updateFinancedBalance(
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-blue-200 bg-white py-2.5 pl-11 pr-3 text-sm font-bold text-blue-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />

                        </div>

                        <button
                          type="button"
                          onClick={
                            useAutomaticFinancedBalance
                          }
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800"
                        >
                          <RefreshCw
                            size={13}
                          />

                          Use Automatic
                        </button>

                      </div>


                      {/* COUNT */}

                      <div className="flex items-center justify-between">

                        <span className="text-sm text-slate-500">
                          Installment Count
                        </span>

                        <span className="font-bold text-slate-800">
                          {
                            installmentSchedule.length
                          }
                        </span>

                      </div>


                      {/* CHECKBOX STATUS */}

                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">

                        <div className="flex items-start gap-2">

                          <CheckCircle2
                            size={16}
                            className={
                              treatDownPaymentAsFirstInstallment
                                ? 'mt-0.5 text-emerald-600'
                                : 'mt-0.5 text-slate-400'
                            }
                          />

                          <div>

                            <p className="text-xs font-bold text-slate-700">
                              Down Payment Logic
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500">

                              {treatDownPaymentAsFirstInstallment
                                ? 'Down payment is subtracted first, then markup is applied to the remaining balance.'
                                : 'Markup is applied to Net Payable first, then down payment is subtracted from the plan.'}

                            </p>

                          </div>

                        </div>

                      </div>


                      {/* SCHEDULE TOTAL */}

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">

                        <span className="text-sm text-slate-500">
                          Schedule Total
                        </span>

                        <span className="font-bold text-slate-800">
                          Rs.{' '}
                          {formatMoney(
                            scheduleTotal
                          )}
                        </span>

                      </div>


                      {/* DIFFERENCE */}

                      <div
                        className={`rounded-xl border p-3 ${
                          scheduleIsBalanced
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >

                        <div className="flex items-center justify-between">

                          <span
                            className={`text-sm font-bold ${
                              scheduleIsBalanced
                                ? 'text-emerald-700'
                                : 'text-red-700'
                            }`}
                          >
                            Balance Difference
                          </span>

                          <span
                            className={`font-black ${
                              scheduleIsBalanced
                                ? 'text-emerald-700'
                                : 'text-red-700'
                            }`}
                          >
                            Rs.{' '}
                            {formatMoney(
                              Math.abs(
                                scheduleDifference
                              )
                            )}
                          </span>

                        </div>

                        {!scheduleIsBalanced && (
                          <p className="mt-1 text-[11px] leading-4 text-red-600">
                            Adjust the schedule or use Auto Adjust Schedule before finalizing.
                          </p>
                        )}

                      </div>

                    </>
                  )}

                </div>

              </div>


              {/* FINALIZE */}

              <div className="shrink-0 border-t border-slate-200 bg-white p-4">

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isInstallmentSale
                      ? 'bg-slate-900 hover:bg-slate-800'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >

                  {isSubmitting ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />

                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={17}
                      />

                      Finalize{' '}
                      {checkoutMode}{' '}
                      Sale
                    </>
                  )}

                </button>

              </div>

            </div>

          </aside>

        </form>

      </main>

    </div>
  );
};

export default NewSale;