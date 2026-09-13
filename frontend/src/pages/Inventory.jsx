import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

import {
  Plus,
  Search,
  Edit2,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  Lock,
  Calendar,
  Boxes,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  CalendarRange,
  X,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  CircleDollarSign,
  Tag,
  Filter,
} from 'lucide-react';

const Inventory = () => {
  const { settings } = useSettings();

  const isDeletionUnlocked = settings?.allowGlobalDeletion === true;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // =====================================================
  // DELETE MODAL STATE
  // =====================================================
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    productId: null,
    productName: '',
  });

  // Date Filter states
  const [filterPreset, setFilterPreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const categories = [
    'Mobile Phones',
    'LED TVs',
    'Refrigerators',
    'Washing Machines',
    'Air Conditioners',
    'Laptops',
    'Accessories',
    'Speakers',
    'Other',
  ];

  // =====================================================
  // FETCH INVENTORY PRODUCTS
  // =====================================================
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/products');

      if (response.data && response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // =====================================================
  // DELETE LOGIC
  // =====================================================
  const triggerDeleteConfirmation = (id, name) => {
    if (!isDeletionUnlocked) {
      toast.error('Deletion Mode is disabled. Enable it from Settings first.');
      return;
    }

    setDeleteModal({
      isOpen: true,
      productId: id,
      productName: name,
    });
  };

  const confirmDelete = async () => {
    const { productId } = deleteModal;

    try {
      await api.delete(`/api/products/${productId}`);

      setProducts((currentProducts) =>
        currentProducts.filter((p) => p._id !== productId)
      );

      toast.success(`Product "${deleteModal.productName}" deleted successfully.`);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to delete product.'
      );
    } finally {
      setDeleteModal({ isOpen: false, productId: null, productName: '' });
    }
  };

  // =====================================================
  // DATE FILTER
  // =====================================================
  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false;

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(today.getDate() - 2);

    if (filterPreset === 'all') return true;
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

    if (filterPreset === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);

      return date >= start && date <= end;
    }

    return true;
  };

  // =====================================================
  // FILTERED PRODUCTS
  // =====================================================
  const filteredProducts = products.filter((p) => {
    const name = p.name?.toLowerCase() || '';
    const brand = p.brand?.toLowerCase() || '';
    const model = p.model?.toLowerCase() || '';
    const sku = p.sku?.toLowerCase() || '';
    const term = searchTerm.toLowerCase().trim();

    const matchesSearch =
      name.includes(term) ||
      brand.includes(term) ||
      model.includes(term) ||
      sku.includes(term);

    const matchesCategory =
      !selectedCategory || p.category === selectedCategory;

    const matchesStatus =
      !selectedStatus || p.status === selectedStatus;

    const matchesDate = isDateInFilter(p.createdAt || p.purchaseDate);

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  // =====================================================
  // EXPORT TO CSV
  // =====================================================
  const exportToCSV = () => {
    if (filteredProducts.length === 0) {
      return toast.error('No inventory data to export.');
    }

    const headers = [
      'Product ID,Product Name,Category,Brand,Model,Purchase Price,Sale Price,Qty,Status,Added Date',
    ];

    const rows = filteredProducts.map((p) => {
      const dateFormatted = new Date(
        p.createdAt || p.purchaseDate
      ).toLocaleDateString('en-PK');

      return `"${p.sku}","${p.name}","${p.category}","${p.brand}","${p.model}",${p.purchasePrice},${p.salePrice},${p.quantity},"${p.status}","${dateFormatted}"`;
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');

    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Inventory_Report_${filterPreset}_${new Date().toISOString().split('T')[0]}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Inventory report exported successfully.');
  };

  // =====================================================
  // TOTALS & METRICS
  // =====================================================
  const totalStockVal = filteredProducts.reduce(
    (acc, p) => acc + Number(p.purchasePrice || 0) * Number(p.quantity || 0),
    0
  );

  const totalStockQty = filteredProducts.reduce(
    (acc, p) => acc + Number(p.quantity || 0),
    0
  );

  const lowStockCount = filteredProducts.filter(
    (p) => p.status === 'Low Stock'
  ).length;

  const outOfStockCount = filteredProducts.filter(
    (p) => p.status === 'Out of Stock'
  ).length;

  const formatMoney = (val) =>
    `${settings?.currency || 'PKR'} ${Number(val || 0).toLocaleString('en-PK')}`;

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <>
      <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
        
        {/* =====================================================
            HERO HEADER (Sidebar matched dark glassmorphism)
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
                    Stock Management
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {products.length} Total Inventory Items
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  Dukan Inventory Manager
                </h1>

                <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                  Track stock levels, purchase & retail prices, product SKUs, and re-order levels in real time.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>

                <Link
                  to="/inventory/add"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            STOCK METRICS KPI CARDS
        ====================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Filtered Products */}
          <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Filtered Items
                </p>
                <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {filteredProducts.length}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Products in view
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 2: Total Stock Qty */}
          <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Total Stock Units
                </p>
                <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {totalStockQty.toLocaleString()}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Available in warehouse
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 3: Inventory Value (Cost) */}
          <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Inventory Value (Cost)
                </p>
                <p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-emerald-600 truncate">
                  {formatMoney(totalStockVal)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Purchase cost investment
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <CircleDollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 4: Low / Out of Stock */}
          <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Critical Stock
                </p>
                <p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-rose-600">
                  {lowStockCount}{' '}
                  <span className="text-xs font-bold text-amber-500">Low</span>
                  {' • '}
                  {outOfStockCount}{' '}
                  <span className="text-xs font-bold text-rose-500">Out</span>
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Need re-order soon
                </p>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                lowStockCount > 0 || outOfStockCount > 0
                  ? 'bg-rose-50 border-rose-100 text-rose-600'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

        </div>

        {/* =====================================================
            SEARCH, CATEGORY, STATUS & DATE FILTERS BAR
        ====================================================== */}
        <section className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by product name, brand, model, or SKU/Product ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 border border-slate-200 rounded-xl pl-11 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category & Status Dropdowns */}
            <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white cursor-pointer transition-all min-w-[150px]"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white cursor-pointer transition-all min-w-[140px]"
              >
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>

          </div>

          {/* Date Filter Presets */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
              {[
                { id: 'all', label: 'All-Time' },
                { id: 'today', label: 'Added Today' },
                { id: 'yesterday', label: 'Added Yesterday' },
                { id: 'dayBeforeYesterday', label: 'Day Before' },
                { id: 'week', label: '7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'custom', label: 'Custom Range' },
              ].map((preset) => (
                <button
                  key={preset.id}
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
        </section>

        {/* =====================================================
            INVENTORY DATA TABLE
        ====================================================== */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400 text-xs font-black uppercase tracking-wider">
                Accessing stock database...
              </span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Package className="w-12 h-12 text-slate-300" />
              <p className="text-sm font-black text-slate-700">No products found</p>
              <p className="text-xs text-slate-400 max-w-sm">
                No inventory records match the current filters. Click "Add Product" to create new stock items.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 font-medium">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Product ID</th>
                    <th className="px-5 py-4">Product Name</th>
                    <th className="px-5 py-4">Brand / Model</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4 text-center">Stock Qty</th>
                    <th className="px-5 py-4 text-right">Purchase Price</th>
                    <th className="px-5 py-4 text-right">Sale Price</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => (
                    <tr
                      key={p._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-black text-indigo-600 tracking-wider">
                        {p.sku || '—'}
                      </td>

                      <td className="px-5 py-3.5 font-black text-slate-900">
                        {p.name}
                      </td>

                      <td className="px-5 py-3.5 text-slate-600 font-semibold">
                        {[p.brand, p.model].filter(Boolean).join(' • ') || '—'}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 font-bold text-[10px] text-slate-600">
                          {p.category || 'General'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex min-w-7 justify-center px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          p.quantity === 0
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : p.quantity <= 3
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}>
                          {p.quantity} Units
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right font-medium text-slate-500">
                        {formatMoney(p.purchasePrice)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-black text-slate-900">
                        {formatMoney(p.salePrice)}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black border ${
                            p.status === 'Available'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : p.status === 'Low Stock'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-rose-50 border-rose-200 text-rose-700'
                          }`}
                        >
                          {p.status || 'Available'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Product */}
                          <Link
                            to={`/inventory/edit/${p._id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          {/* Delete Product */}
                          {isDeletionUnlocked ? (
                            <button
                              type="button"
                              onClick={() => triggerDeleteConfirmation(p._id, p.name)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                              title="Delete Product"
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to permanently delete "${deleteModal.productName}" from your inventory? This action cannot be undone.`}
      />
    </>
  );
};

export default Inventory;