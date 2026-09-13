import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import {
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Package,
  Sparkles,
  Boxes,
  CircleDollarSign,
  ShieldCheck,
  Smartphone,
  Bike,
  FileText,
  Warehouse,
  Tag,
  Barcode,
  Layers,
} from 'lucide-react';

const AddEditProduct = () => {
  const { settings } = useSettings();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    category: 'Mobile Phones',
    brand: '',
    model: '',
    serialNumber: '',
    imei: '',
    chassisNumber: '',
    purchasePrice: '',
    salePrice: '',
    quantity: '',
    minStockLevel: settings?.defaultMinStockLevel || 5,
    supplier: '',
    warrantyPeriod: '',
    description: '',
    adjustmentReason: '',
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const categories = [
    'Mobile Phones',
    'LED TVs',
    'Refrigerators',
    'Washing Machines',
    'Air Conditioners',
    'Laptops',
    'Accessories',
    'Speakers',
    'Motorbikes',
    'Other',
  ];

  // =====================================================
  // FETCH PRODUCT DETAILS (EDIT MODE)
  // =====================================================
  useEffect(() => {
    if (isEditMode) {
      const fetchProductDetails = async () => {
        try {
          setFetching(true);
          const response = await api.get(`/api/products/${id}`);

          if (response.data && response.data.success) {
            setFormData({
              ...response.data.data,
              adjustmentReason: '',
            });
          }
        } catch (error) {
          setErrorMsg('Failed to load product information.');
        } finally {
          setFetching(false);
        }
      };

      fetchProductDetails();
    }
  }, [id, isEditMode]);

  // =====================================================
  // FORM HANDLERS
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    // 1. Numeric Validations
    const pPrice = Number(formData.purchasePrice);
    const sPrice = Number(formData.salePrice);
    const qty = Number(formData.quantity);
    const mStock = Number(formData.minStockLevel);

    if (
      isNaN(pPrice) ||
      pPrice < 0 ||
      isNaN(sPrice) ||
      sPrice < 0 ||
      isNaN(qty) ||
      qty < 0
    ) {
      setErrorMsg('Purchase Price, Selling Price and Quantity must be valid positive numbers.');
      setLoading(false);
      return;
    }

    // 2. Pricing Logic Validation
    if (pPrice > sPrice) {
      setErrorMsg('Purchase Price cannot be greater than Selling Price.');
      setLoading(false);
      return;
    }

    // 3. Category-Specific Validation
    if (formData.category === 'Motorbikes' && !formData.chassisNumber?.trim()) {
      setErrorMsg('Chassis Number is required for Motorbikes.');
      setLoading(false);
      return;
    }

    if (formData.category === 'Mobile Phones' && !formData.imei?.trim()) {
      setErrorMsg('IMEI number is required for Mobile Phones.');
      setLoading(false);
      return;
    }

    try {
      if (isEditMode) {
        await api.put(`/api/products/${id}`, formData);
      } else {
        await api.post('/api/products', formData);
      }

      navigate('/inventory');
    } catch (error) {
      setErrorMsg(
        error.response?.data?.message || 'Failed to save product configurations.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOADING STATE
  // =====================================================
  if (fetching) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 animate-pulse opacity-25" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
            </div>
          </div>
          <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-slate-800">
            Loading Product Details
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Fetching product parameters from inventory database...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER FORM
  // =====================================================
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO HEADER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5">
              <Link
                to="/inventory"
                className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Back to Inventory"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">
                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                    Inventory Config
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[9px] font-bold text-slate-400">
                    {isEditMode ? 'Edit Mode' : 'New Stock Entry'}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                  {isEditMode ? 'Modify Product Specifications' : 'Add New Inventory Product'}
                </h1>
              </div>
            </div>

            <span className="px-3 py-1 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-bold text-slate-300 self-start sm:self-auto">
              Currency: <strong className="text-blue-400">{settings?.currency || 'PKR'}</strong>
            </span>

          </div>
        </div>
      </section>

      {/* =====================================================
          ERROR ALERT MESSAGE
      ====================================================== */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-rose-800 animate-[pageEnter_0.3s_ease-out]">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-rose-600">Configuration Error</p>
            <p className="text-xs font-bold mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* =====================================================
          PRODUCT FORM
      ====================================================== */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="p-5 sm:p-7 space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* SECTION 1: CORE PRODUCT DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Base Product Information</h3>
                  <p className="text-[10px] text-slate-400">Title, brand, category and identification</p>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Product Title / Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Samsung Galaxy S24 Ultra, Haier Inverter AC"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Brand <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    placeholder="e.g. Samsung, Dawlance"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Model Name / Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    placeholder="e.g. SM-S928B, 1.5 Ton HSU-18"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Category & Warranty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Warranty Term
                  </label>
                  <input
                    type="text"
                    name="warrantyPeriod"
                    value={formData.warrantyPeriod}
                    onChange={handleChange}
                    placeholder="e.g. 1 Year Official, 10 Years Motor"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Device Serials / Barcode */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Device Serial / Barcode Number
                </label>
                <div className="relative">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="serialNumber"
                    value={formData.serialNumber}
                    onChange={handleChange}
                    placeholder="Optional serial barcode code..."
                    className="w-full h-11 border border-slate-200 rounded-xl pl-10 pr-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Category-specific identifiers: IMEI / Chassis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-blue-500" />
                      IMEI (Phones)
                    </span>
                    {formData.category === 'Mobile Phones' && (
                      <span className="text-[9px] text-rose-500 font-bold">Required</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="imei"
                    value={formData.imei}
                    onChange={handleChange}
                    placeholder="15-digit IMEI number"
                    className={`w-full h-11 border rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                      formData.category === 'Mobile Phones'
                        ? 'border-blue-200 focus:border-blue-500 focus:ring-blue-500/10'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Bike className="w-3 h-3 text-indigo-500" />
                      Chassis No. (Bikes)
                    </span>
                    {formData.category === 'Motorbikes' && (
                      <span className="text-[9px] text-rose-500 font-bold">Required</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="chassisNumber"
                    value={formData.chassisNumber}
                    onChange={handleChange}
                    placeholder="Frame chassis number"
                    className={`w-full h-11 border rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                      formData.category === 'Motorbikes'
                        ? 'border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'
                    }`}
                  />
                </div>
              </div>

            </div>

            {/* SECTION 2: FINANCIALS & STOCK PARAMETERS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CircleDollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Financials & Stock Parameters</h3>
                  <p className="text-[10px] text-slate-400">Pricing margins, quantities & re-order levels</p>
                </div>
              </div>

              {/* Purchase & Sale Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Purchase Price ({settings?.currency || 'PKR'}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="purchasePrice"
                    value={formData.purchasePrice}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Selling Price ({settings?.currency || 'PKR'}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Initial Quantity & Low Stock Trigger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Available Stock Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Low Stock Trigger Alert <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="minStockLevel"
                    value={formData.minStockLevel}
                    onChange={handleChange}
                    placeholder="5"
                    min="0"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Supplier Details */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Supplier / Distributor Name
                </label>
                <div className="relative">
                  <Warehouse className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    placeholder="e.g. Official Dealer, Lahore Wholesale Market"
                    className="w-full h-11 border border-slate-200 rounded-xl pl-10 pr-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Description / Specifications */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Description / Specification Notes
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Color, RAM/Storage, included accessories, or special conditions..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              {/* Stock Adjustment Reason (Edit Mode) */}
              {isEditMode && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-1.5 animate-[pageEnter_0.2s_ease-out]">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-amber-800">
                    Reason for Stock Adjustment / Update
                  </label>
                  <input
                    type="text"
                    name="adjustmentReason"
                    value={formData.adjustmentReason}
                    onChange={handleChange}
                    placeholder="e.g. Physical inventory count discrepancy, returned stock"
                    className="w-full h-10 border border-amber-300 bg-white rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

            </div>

          </div>

        </div>

        {/* FORM ACTION FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <Link
            to="/inventory"
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-600 transition-all"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Specifications...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>
                  {isEditMode ? 'Update Product Specifications' : 'Save New Product'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

    </div>
  );
};

export default AddEditProduct;