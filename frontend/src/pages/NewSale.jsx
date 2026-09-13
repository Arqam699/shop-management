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
  Sparkles,
  Tag,
  CircleDollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
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

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

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
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value).toLowerCase().replace(/\s+/g, ' '))
          .join(' ');

        return searchableText.includes(search);
      })
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
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value).toLowerCase().replace(/\s+/g, ' '))
          .join(' ');

        return searchableText.includes(search);
      })
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
    setErrorMsg('');
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
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
    return Math.max(0, Number(quantity || 0) * Number(unitPrice || 0));
  }, [quantity, unitPrice]);

  const finalTotal = useMemo(() => {
    return Math.max(0, subtotal - Number(discount || 0));
  }, [subtotal, discount]);

  /* =========================================================
     INSTALLMENT CALCULATIONS
  ========================================================= */

  const calculationBaseAfterDownPayment = useMemo(() => {
    if (!isInstallmentSale) return 0;
    return Math.max(0, finalTotal - Number(downPayment || 0));
  }, [isInstallmentSale, finalTotal, downPayment]);

  const markupAmount = useMemo(() => {
    if (!isInstallmentSale) return 0;
    const markupRate = Number(markupPercentage || 0) / 100;

    if (treatDownPaymentAsFirstInstallment) {
      return Math.max(0, calculationBaseAfterDownPayment * markupRate);
    }
    return Math.max(0, finalTotal * markupRate);
  }, [
    isInstallmentSale,
    treatDownPaymentAsFirstInstallment,
    calculationBaseAfterDownPayment,
    finalTotal,
    markupPercentage,
  ]);

  const totalWithMarkup = useMemo(() => {
    if (!isInstallmentSale) return finalTotal;
    if (treatDownPaymentAsFirstInstallment) {
      return Math.max(0, calculationBaseAfterDownPayment + markupAmount);
    }
    return Math.max(0, finalTotal + markupAmount);
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
      return Math.max(0, totalWithMarkup);
    }
    return Math.max(0, totalWithMarkup - Number(downPayment || 0));
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
      return Math.max(0, Number(manualFinancedBalance));
    }
    return calculatedFinancedBalance;
  }, [isInstallmentSale, manualFinancedBalance, calculatedFinancedBalance]);

  const effectiveDownPayment = useMemo(() => {
    if (!isInstallmentSale) return 0;

    if (manualFinancedBalance !== null) {
      if (treatDownPaymentAsFirstInstallment) {
        const markupRate = Number(markupPercentage || 0) / 100;
        if (markupRate >= 0) {
          const amountBeforeMarkup =
            Number(manualFinancedBalance || 0) / (1 + markupRate);
          return Math.max(
            0,
            roundMoney(finalTotal - amountBeforeMarkup)
          );
        }
      }
      return Math.max(
        0,
        roundMoney(totalWithMarkup - Number(manualFinancedBalance || 0))
      );
    }

    return Math.max(0, Number(downPayment || 0));
  }, [
    isInstallmentSale,
    manualFinancedBalance,
    treatDownPaymentAsFirstInstallment,
    markupPercentage,
    finalTotal,
    totalWithMarkup,
    downPayment,
  ]);

  const getActualInstallmentCount = () => {
    return Math.max(1, Number(installmentDuration || 1));
  };

  /* =========================================================
     SCHEDULE BUILDER
  ========================================================= */

  const buildInstallmentSchedule = (financedAmount, count) => {
    const total = roundMoney(financedAmount);
    const installmentCount = Math.max(0, Number(count || 0));

    if (installmentCount === 0 || total <= 0) {
      return [];
    }

    const baseAmount = roundMoney(total / installmentCount);
    const schedule = [];
    let distributed = 0;
    const today = new Date();

    for (let index = 0; index < installmentCount; index++) {
      const installmentNumber = index + 1;
      let amount;

      if (index === installmentCount - 1) {
        amount = roundMoney(total - distributed);
      } else {
        amount = baseAmount;
      }

      distributed = roundMoney(distributed + amount);

      const dueDate = new Date(today);
      dueDate.setMonth(dueDate.getMonth() + installmentNumber);

      schedule.push({
        installmentNumber,
        amount,
        dueDate: formatDateInput(dueDate),
      });
    }

    return schedule;
  };

  useEffect(() => {
    if (!isInstallmentSale) {
      setInstallmentSchedule([]);
      return;
    }

    if (scheduleMode !== 'auto') {
      return;
    }

    const count = getActualInstallmentCount();
    const newSchedule = buildInstallmentSchedule(financedBalance, count);
    setInstallmentSchedule(newSchedule);
  }, [
    isInstallmentSale,
    financedBalance,
    installmentDuration,
    scheduleMode,
  ]);

  const scheduleTotal = useMemo(() => {
    return roundMoney(
      installmentSchedule.reduce(
        (sum, item) => sum + Number(item?.amount || 0),
        0
      )
    );
  }, [installmentSchedule]);

  const scheduleDifference = useMemo(() => {
    return roundMoney(financedBalance - scheduleTotal);
  }, [financedBalance, scheduleTotal]);

  const scheduleIsBalanced =
    !isInstallmentSale || Math.abs(scheduleDifference) < 0.01;

  const updateFinancedBalance = (value) => {
    const numericValue = Math.max(0, Number(value || 0));
    if (numericValue > totalWithMarkup) {
      setErrorMsg('Financed balance cannot be greater than Total With Markup.');
      return;
    }
    setErrorMsg('');
    setManualFinancedBalance(numericValue);
    setScheduleMode('manual');
  };

  const useAutomaticFinancedBalance = () => {
    setManualFinancedBalance(null);
    setErrorMsg('');
    setScheduleMode('auto');
  };

  const updateInstallmentAmount = (index, value) => {
    setScheduleMode('manual');
    setInstallmentSchedule((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              amount: value === '' ? '' : Number(value),
            }
          : item
      )
    );
  };

  const updateInstallmentDate = (index, value) => {
    setScheduleMode('manual');
    setInstallmentSchedule((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              dueDate: value,
            }
          : item
      )
    );
  };

  const resetSchedule = () => {
    const count = getActualInstallmentCount();
    const newSchedule = buildInstallmentSchedule(financedBalance, count);
    setScheduleMode('auto');
    setInstallmentSchedule(newSchedule);
    setErrorMsg('');
  };

  // Handlers
  const handleUnitPriceChange = (value) => {
    setUnitPrice(Math.max(0, Number(value || 0)));
    setManualFinancedBalance(null);
    setScheduleMode('auto');
  };

  const handleQuantityChange = (value) => {
    setQuantity(Math.max(1, Number(value || 1)));
    setManualFinancedBalance(null);
    setScheduleMode('auto');
  };

  const handleDiscountChange = (value) => {
    setDiscount(Math.max(0, Number(value || 0)));
    setManualFinancedBalance(null);
    setScheduleMode('auto');
  };

  const handleDownPaymentChange = (value) => {
    setDownPayment(Math.max(0, Number(value || 0)));
    setManualFinancedBalance(null);
    setScheduleMode('auto');
  };

  const handleMarkupChange = (value) => {
    setMarkupPercentage(Math.max(0, Number(value || 0)));
    setManualFinancedBalance(null);
    setScheduleMode('auto');
  };

  const handleTreatDownPaymentChange = (event) => {
    setTreatDownPaymentAsFirstInstallment(event.target.checked);
    setManualFinancedBalance(null);
    setScheduleMode('auto');
    setErrorMsg('');
  };

  const handleInstallmentDurationChange = (value) => {
    const numericValue = Math.max(1, Number(value || 1));
    setInstallmentDuration(numericValue);
    setScheduleMode('auto');
    setManualFinancedBalance(null);
    setErrorMsg('');
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    if (!selectedCustomer) {
      setErrorMsg('Please select a customer.');
      return;
    }

    if (!selectedProduct) {
      setErrorMsg('Please select a product.');
      return;
    }

    if (Number(quantity || 0) <= 0) {
      setErrorMsg('Quantity must be greater than zero.');
      return;
    }

    if (Number(unitPrice || 0) < 0) {
      setErrorMsg('Unit price cannot be negative.');
      return;
    }

    if (Number(discount || 0) < 0) {
      setErrorMsg('Discount cannot be negative.');
      return;
    }

    if (isInstallmentSale) {
      if (Number(installmentDuration || 0) < 1) {
        setErrorMsg('Installment count must be at least 1.');
        return;
      }

      if (Number(markupPercentage || 0) < 0) {
        setErrorMsg('Markup percentage cannot be negative.');
        return;
      }

      const dp = Number(effectiveDownPayment || 0);
      if (dp < 0) {
        setErrorMsg('Down payment cannot be negative.');
        return;
      }

      if (dp > Number(totalWithMarkup || 0)) {
        setErrorMsg('Down payment cannot be greater than Total With Markup.');
        return;
      }

      if (Number(financedBalance || 0) < 0) {
        setErrorMsg('Financed balance cannot be negative.');
        return;
      }

      if (Number(financedBalance || 0) > Number(totalWithMarkup || 0)) {
        setErrorMsg('Financed balance cannot be greater than Total With Markup.');
        return;
      }

      if (Number(financedBalance || 0) > 0 && installmentSchedule.length === 0) {
        setErrorMsg('Installment schedule is empty.');
        return;
      }

      const expectedCount = getActualInstallmentCount();
      if (installmentSchedule.length !== expectedCount) {
        setErrorMsg(
          `Installment schedule must contain exactly ${expectedCount} installments.`
        );
        return;
      }

      if (!scheduleIsBalanced) {
        setErrorMsg(
          `Installment schedule is not balanced. Difference: ${settings?.currency || 'PKR'} ${formatMoney(
            scheduleDifference
          )}`
        );
        return;
      }

      const invalidInstallment = installmentSchedule.find(
        (item) => Number(item?.amount || 0) < 0 || !item?.dueDate
      );

      if (invalidInstallment) {
        setErrorMsg('Please check installment amounts and due dates.');
        return;
      }
    }

    const payload = {
      manualInvoiceNumber: manualInvoiceNumber ? manualInvoiceNumber.trim() : undefined,
      customer: selectedCustomer,
      product: selectedProduct,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      discount: Number(discount),
      paymentType: paymentType,
      downPayment: isInstallmentSale ? roundMoney(effectiveDownPayment) : 0,
      markupPercentage: isInstallmentSale ? roundMoney(markupPercentage) : 0,
      markupAmount: isInstallmentSale ? roundMoney(markupAmount) : 0,
      totalWithMarkup: isInstallmentSale
        ? roundMoney(totalWithMarkup)
        : roundMoney(finalTotal),
      selectedInstallmentDuration: isInstallmentSale
        ? Number(installmentDuration)
        : 0,
      installmentDuration: isInstallmentSale ? Number(installmentDuration) : 0,
      treatDownPaymentAsFirstInstallment: isInstallmentSale
        ? Boolean(treatDownPaymentAsFirstInstallment)
        : false,
      installmentSchedule: isInstallmentSale
        ? installmentSchedule.map((item) => ({
            installmentNumber: Number(item.installmentNumber),
            amount: roundMoney(item.amount),
            dueDate: item.dueDate,
          }))
        : [],
    };

    try {
      setIsSubmitting(true);
      await api.post('/sales', payload);

      toast.success(
        isInstallmentSale
          ? 'Installment sale created successfully.'
          : 'Cash sale created successfully.'
      );

      navigate(isInstallmentSale ? '/installments' : '/sales');
    } catch (error) {
      console.error('Create sale error:', error);
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

  const productSku =
    selectedProduct?.sku ||
    selectedProduct?.productCode ||
    selectedProduct?.code ||
    '';

  /* =========================================================
     RENDER
  ========================================================= */

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
                onClick={() =>
                  navigate(isInstallmentSale ? '/installments' : '/sales')
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
                  <span className="text-slate-600">•</span>
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
                  {settings?.currency || 'PKR'} {formatMoney(finalTotal)}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ERROR ALERT */}
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 animate-[pageEnter_0.2s_ease-out]">
          <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-rose-500 hover:text-rose-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* MAIN CHECKOUT FORM & LEDGER GRID */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]"
      >
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          
          {/* INVOICE NUMBER */}
          <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-black text-slate-900">Custom Invoice Number</h2>
            </div>

            <div>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={manualInvoiceNumber}
                  onChange={(e) => setManualInvoiceNumber(e.target.value)}
                  placeholder="Leave empty for automatic sequential generation..."
                  className="w-full h-11 border border-slate-200 rounded-xl pl-10 pr-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>
          </section>

          {/* CUSTOMER SEARCH & SELECTION */}
          <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Customer Selection <span className="text-rose-500">*</span></h2>
                  <p className="text-[10px] text-slate-400">Search customer by name, mobile number or CNIC</p>
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
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customer by name, phone or CNIC..."
                  className="w-full h-11 border border-slate-200 rounded-xl pl-10 pr-10 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              {showCustomerDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onMouseDown={() => setShowCustomerDropdown(false)}
                  />
                  <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl custom-scrollbar animate-[pageEnter_0.2s_ease-out]">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-5 text-center text-xs text-slate-400 font-bold">
                        No customer found matching criteria.
                      </div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer?._id || customer?.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectCustomer(customer)}
                          className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 border border-transparent hover:border-slate-200"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-xs text-slate-900 truncate">
                              {customer?.name || customer?.fullName || customer?.customerName || 'Unnamed Customer'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Phone: {customer?.phone || customer?.mobile || customer?.mobileNumber || '—'} • CNIC: {customer?.cnic || '—'}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {selectedCustomer && (
              <div className="mt-3 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-black tracking-wider text-indigo-500">Selected Customer</span>
                  <p className="font-black text-xs text-slate-900 mt-0.5">{customerName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">Mobile</span>
                  <p className="font-bold text-xs text-slate-700 mt-0.5">{customerPhone || '—'}</p>
                </div>
              </div>
            )}
          </section>

          {/* PRODUCT SEARCH & SELECTION */}
          <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Inventory Product <span className="text-rose-500">*</span></h2>
                  <p className="text-[10px] text-slate-400">Select product item from shop warehouse</p>
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
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Search inventory product by name, brand or SKU..."
                  className="w-full h-11 border border-slate-200 rounded-xl pl-10 pr-10 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              {showProductDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onMouseDown={() => setShowProductDropdown(false)}
                  />
                  <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl custom-scrollbar animate-[pageEnter_0.2s_ease-out]">
                    {filteredProducts.length === 0 ? (
                      <div className="p-5 text-center text-xs text-slate-400 font-bold">
                        No product found in stock.
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product?._id || product?.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectProduct(product)}
                          className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 border border-transparent hover:border-slate-200"
                        >
                          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-xs text-slate-900 truncate">
                              {product?.name || product?.productName || product?.title || 'Unnamed Item'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              SKU: {product?.sku || '—'} • Price: {settings?.currency || 'PKR'} {formatMoney(product?.salePrice || product?.sellingPrice || 0)}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {selectedProduct && (
              <div className="mt-3 p-3.5 rounded-2xl bg-violet-50/60 border border-violet-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-black tracking-wider text-violet-600">Selected Product</span>
                  <p className="font-black text-xs text-slate-900 mt-0.5">{productName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">Unit Price</span>
                  <p className="font-black text-xs text-slate-900 mt-0.5">
                    {settings?.currency || 'PKR'} {formatMoney(unitPrice)}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* PRICING & QUANTITY CONFIG */}
          <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-black text-slate-900">Pricing & Quantities</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Unit Price */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Unit Price ({settings?.currency || 'PKR'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              {/* Quantity Stepper */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Quantity
                </label>
                <div className="flex items-center h-11 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(Math.max(1, Number(quantity) - 1))}
                    className="w-10 h-full flex items-center justify-center hover:bg-slate-200/70 transition-colors text-slate-600"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="flex-1 h-full text-center bg-transparent text-xs sm:text-sm font-black text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(Number(quantity) + 1)}
                    className="w-10 h-full flex items-center justify-center hover:bg-slate-200/70 transition-colors text-slate-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Discount */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Discount ({settings?.currency || 'PKR'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-rose-600 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>
          </section>

          {/* INSTALLMENT CONFIGURATION & DYNAMIC SCHEDULE */}
          {isInstallmentSale && (
            <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-5 animate-[pageEnter_0.3s_ease-out]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">Installment Financing Setup</h2>
                    <p className="text-[10px] text-slate-400">Configure down payment, markups & monthly schedule</p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black border ${
                    scheduleMode === 'manual'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  {scheduleMode === 'manual' ? 'Manual Edit Mode' : 'Auto Auto-Balanced'}
                </span>
              </div>

              {/* CONFIG INPUTS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Down Payment */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Down Payment ({settings?.currency || 'PKR'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={effectiveDownPayment}
                    onChange={(e) => handleDownPaymentChange(e.target.value)}
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                {/* Duration Months */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Installment Duration (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={installmentDuration}
                    onChange={(e) => handleInstallmentDurationChange(e.target.value)}
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                {/* Markup Percentage */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Financing Markup (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={markupPercentage}
                      onChange={(e) => handleMarkupChange(e.target.value)}
                      className="w-full h-11 border border-slate-200 rounded-xl pl-4 pr-10 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                    <Percent className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Pre/Post Markup Checkbox */}
              <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-all">
                <input
                  type="checkbox"
                  checked={treatDownPaymentAsFirstInstallment}
                  onChange={handleTreatDownPaymentChange}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-black text-slate-800">
                    Deduct Down Payment Before Markup Calculation
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    {treatDownPaymentAsFirstInstallment
                      ? 'Down Payment pehle subtract hogi, bache hue principal amount par markup lagega.'
                      : 'Pehle total price par markup lagega, uske baad Down Payment subtract ki jayegi.'}
                  </p>
                </div>
              </label>

              {/* SCHEDULE HEADER & AUTO BUTTON */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Monthly Schedule Breakdown
                  </h3>
                  <p className="text-[10px] text-slate-400">Editable monthly due amounts and due dates</p>
                </div>

                <button
                  type="button"
                  onClick={resetSchedule}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-black text-slate-700 transition-all shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Auto Rebalance</span>
                </button>
              </div>

              {/* SCHEDULE ROWS */}
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                {installmentSchedule.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-black text-slate-800">Month #{item.installmentNumber}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Amount Input */}
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          {settings?.currency || 'PKR'}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateInstallmentAmount(index, e.target.value)}
                          className="w-28 h-9 border border-slate-200 rounded-xl pl-9 pr-2.5 text-xs font-black text-slate-900 bg-white outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Date Input */}
                      <input
                        type="date"
                        value={item.dueDate || ''}
                        onChange={(e) => updateInstallmentDate(index, e.target.value)}
                        className="h-9 border border-slate-200 rounded-xl px-2.5 text-xs font-semibold text-slate-700 bg-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* RIGHT COLUMN: STICKY CHECKOUT LEDGER */}
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] rounded-3xl p-6 text-white shadow-2xl shadow-blue-950/30 space-y-6 sticky top-24">
            
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

            {/* Price Calculations List */}
            <div className="space-y-3 text-xs font-semibold text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Subtotal ({quantity} × Price)</span>
                <span className="font-bold text-white text-sm">
                  {settings?.currency || 'PKR'} {formatMoney(subtotal)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Discount</span>
                <span className="font-bold text-rose-400">
                  - {settings?.currency || 'PKR'} {formatMoney(discount)}
                </span>
              </div>

              <div className="border-t border-white/[0.08] pt-3 flex justify-between items-center text-sm font-black text-white">
                <span>Net Total Payable</span>
                <span className="text-base text-emerald-400">
                  {settings?.currency || 'PKR'} {formatMoney(finalTotal)}
                </span>
              </div>

              {isInstallmentSale && (
                <div className="space-y-2.5 border-t border-white/[0.08] pt-3.5 text-xs text-slate-400">
                  <div className="flex justify-between items-center">
                    <span>Financing Markup ({markupPercentage}%)</span>
                    <span className="text-amber-400 font-bold">
                      +{settings?.currency || 'PKR'} {formatMoney(markupAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Total Deal With Markup</span>
                    <span className="text-white font-bold">
                      {settings?.currency || 'PKR'} {formatMoney(totalWithMarkup)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Down Payment Received</span>
                    <span className="text-emerald-400 font-bold">
                      -{settings?.currency || 'PKR'} {formatMoney(effectiveDownPayment)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/[0.08] pt-2 font-black text-white">
                    <span>Financed Balance Dues</span>
                    <span className="text-indigo-400 text-sm">
                      {settings?.currency || 'PKR'} {formatMoney(financedBalance)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* FINALIZE BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalize {checkoutMode} Sale</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </div>
        </div>

      </form>

    </div>
  );
};

export default NewSale;