import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import DataTable from '../components/DataTable';
import useDebounce from '../utils/useDebounce';

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
  Sparkles,
  CalendarRange,
  X,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  CircleDollarSign,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Flame,
  Clock3,
  ShieldAlert,
} from 'lucide-react';

const PAGE_SIZE = 25;

const Inventory = () => {
  const { settings } = useSettings();

  const isDeletionUnlocked =
    settings?.allowGlobalDeletion === true;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(1);

  // =====================================================
  // INVENTORY INTELLIGENCE
  // =====================================================

  const [
    inventoryIntelligence,
    setInventoryIntelligence,
  ] = useState(null);

  const [
    intelligenceLoading,
    setIntelligenceLoading,
  ] = useState(true);

  const [
    intelligenceOpen,
    setIntelligenceOpen,
  ] = useState(false);

  // =====================================================
  // DELETE MODAL STATE
  // =====================================================

  const [deleteModal, setDeleteModal] =
    useState({
      isOpen: false,
      productId: null,
      productName: '',
    });

  // =====================================================
  // DATE FILTER STATES
  // =====================================================

  const [filterPreset, setFilterPreset] =
    useState('all');

  const [customStartDate, setCustomStartDate] =
    useState('');

  const [customEndDate, setCustomEndDate] =
    useState('');

  // =====================================================
  // CATEGORIES
  // =====================================================

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

      const response =
        await api.get('/api/products');

      if (
        response.data &&
        response.data.success
      ) {
        setProducts(
          response.data.data
        );
      }
    } catch (error) {
      console.error(
        'Error fetching inventory:',
        error
      );

      toast.error(
        'Failed to load inventory products.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FETCH INVENTORY INTELLIGENCE
  // =====================================================

  const fetchInventoryIntelligence =
    async () => {
      try {
        setIntelligenceLoading(true);

        const response =
          await api.get(
            '/api/reports/dashboard'
          );

        if (
          response.data?.success
        ) {
          setInventoryIntelligence(
            response.data?.data
              ?.inventory
              ?.intelligence ||
            null
          );
        }
      } catch (error) {
        console.error(
          'Inventory Intelligence Error:',
          error
        );
      } finally {
        setIntelligenceLoading(false);
      }
    };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchProducts();
    fetchInventoryIntelligence();
  }, []);

  // Reset to first page whenever filters change
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearchTerm,
    selectedCategory,
    selectedStatus,
    filterPreset,
    customStartDate,
    customEndDate,
  ]);

  // =====================================================
  // REFRESH INTELLIGENCE
  // =====================================================

  const refreshIntelligence =
    async () => {
      await fetchInventoryIntelligence();

      toast.success(
        'Inventory intelligence refreshed.'
      );
    };

  // =====================================================
  // DELETE LOGIC
  // =====================================================

  const triggerDeleteConfirmation =
    (id, name) => {
      if (!isDeletionUnlocked) {
        toast.error(
          'Deletion Mode is disabled. Enable it from Settings first.'
        );

        return;
      }

      setDeleteModal({
        isOpen: true,
        productId: id,
        productName: name,
      });
    };

  const confirmDelete =
    async () => {
      const {
        productId,
      } = deleteModal;

      try {
        await api.delete(
          `/api/products/${productId}`
        );

        setProducts(
          (currentProducts) =>
            currentProducts.filter(
              (p) =>
                p._id !== productId
            )
        );

        toast.success(
          `Product "${deleteModal.productName}" deleted successfully.`
        );

        fetchInventoryIntelligence();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            'Failed to delete product.'
        );
      } finally {
        setDeleteModal({
          isOpen: false,
          productId: null,
          productName: '',
        });
      }
    };

  // =====================================================
  // DATE FILTER
  // =====================================================

  const isDateInFilter =
    (dateStr) => {
      if (!dateStr) return false;

      const date =
        new Date(dateStr);

      date.setHours(
        0,
        0,
        0,
        0
      );

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const yesterday =
        new Date(today);

      yesterday.setDate(
        today.getDate() - 1
      );

      const dayBeforeYesterday =
        new Date(today);

      dayBeforeYesterday.setDate(
        today.getDate() - 2
      );

      if (
        filterPreset ===
        'all'
      ) {
        return true;
      }

      if (
        filterPreset ===
        'today'
      ) {
        return (
          date.getTime() ===
          today.getTime()
        );
      }

      if (
        filterPreset ===
        'yesterday'
      ) {
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

      if (
        filterPreset ===
        'week'
      ) {
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

      if (
        filterPreset ===
        'month'
      ) {
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

      if (
        filterPreset ===
          'custom' &&
        customStartDate &&
        customEndDate
      ) {
        const start =
          new Date(
            customStartDate
          );

        start.setHours(
          0,
          0,
          0,
          0
        );

        const end =
          new Date(
            customEndDate
          );

        end.setHours(
          23,
          59,
          59,
          999
        );

        return (
          date >= start &&
          date <= end
        );
      }

      return true;
    };

  // =====================================================
  // FILTERED PRODUCTS
  // =====================================================

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
      const name =
        p.name
          ?.toLowerCase() ||
        '';

      const brand =
        p.brand
          ?.toLowerCase() ||
        '';

      const model =
        p.model
          ?.toLowerCase() ||
        '';

      const sku =
        p.sku
          ?.toLowerCase() ||
        '';

      const term =
        debouncedSearchTerm
          .toLowerCase()
          .trim();

      const matchesSearch =
        name.includes(term) ||
        brand.includes(term) ||
        model.includes(term) ||
        sku.includes(term);

      const matchesCategory =
        !selectedCategory ||
        p.category ===
          selectedCategory;

      const matchesStatus =
        !selectedStatus ||
        p.status ===
          selectedStatus;

      const matchesDate =
        isDateInFilter(
          p.createdAt ||
            p.purchaseDate
        );

        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus &&
          matchesDate
        );
      }),
    [
      products,
      debouncedSearchTerm,
      selectedCategory,
      selectedStatus,
      filterPreset,
      customStartDate,
      customEndDate,
    ]
  );

  // =====================================================
  // EXPORT TO CSV
  // =====================================================

  const exportToCSV =
    () => {
      if (
        filteredProducts.length ===
        0
      ) {
        return toast.error(
          'No inventory data to export.'
        );
      }

      const headers = [
        'Product ID,Product Name,Category,Brand,Model,Purchase Price,Sale Price,Qty,Status,Added Date',
      ];

      const rows =
        filteredProducts.map(
          (p) => {
            const dateFormatted =
              new Date(
                p.createdAt ||
                  p.purchaseDate
              ).toLocaleDateString(
                'en-PK'
              );

            return `"${p.sku}","${p.name}","${p.category}","${p.brand}","${p.model}",${p.purchasePrice},${p.salePrice},${p.quantity},"${p.status}","${dateFormatted}"`;
          }
        );

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          headers,
          ...rows,
        ].join('\n');

      const encodedUri =
        encodeURI(
          csvContent
        );

      const link =
        document.createElement(
          'a'
        );

      link.setAttribute(
        'href',
        encodedUri
      );

      link.setAttribute(
        'download',
        `Inventory_Report_${filterPreset}_${new Date().toISOString().split('T')[0]}.csv`
      );

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      toast.success(
        'Inventory report exported successfully.'
      );
    };

  // =====================================================
  // TOTALS & METRICS
  // =====================================================

  const totalStockVal =
    filteredProducts.reduce(
      (acc, p) =>
        acc +
        Number(
          p.purchasePrice || 0
        ) *
          Number(
            p.quantity || 0
          ),
      0
    );

  const totalStockQty =
    filteredProducts.reduce(
      (acc, p) =>
        acc +
        Number(
          p.quantity || 0
        ),
      0
    );

  const lowStockCount =
    filteredProducts.filter(
      (p) =>
        p.status ===
        'Low Stock'
    ).length;

  const outOfStockCount =
    filteredProducts.filter(
      (p) =>
        p.status ===
        'Out of Stock'
    ).length;

  const formatMoney =
    (val) =>
      `${settings?.currency || 'PKR'} ${Number(
        val || 0
      ).toLocaleString('en-PK')}`;

  // =====================================================
  // INTELLIGENCE DATA
  // =====================================================

  const intelligence =
    inventoryIntelligence || {};

  const fastMovingProducts =
    intelligence
      .fastMovingProducts ||
    [];

  const slowMovingProducts =
    intelligence
      .slowMovingProducts ||
    [];

  const stockAtRiskProducts =
    intelligence
      .stockAtRiskProducts ||
    [];

  const reorderProducts = intelligence.reorderProducts || [];

  // =====================================================
  // INTELLIGENCE PRODUCT ROW
  // =====================================================

 const IntelligenceProduct = ({ product, type }) => {
  const stock = Number(product?.stock ?? product?.quantity ?? 0);
  const sold = Number(product?.soldQuantity30Days ?? 0);
  const coverage = product?.stockCoverageDays;
  const typeLabel = type === 'fast' ? 'Selling well' : type === 'slow' ? (sold === 0 ? 'No sales in 30 days' : 'Slow sales') : (stock <= 0 ? 'Out of stock' : 'At or below minimum stock');
  const pillClass = type === 'fast' ? 'bg-orange-100 text-orange-800' : type === 'slow' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';
  const Icon = type === 'fast' ? Flame : type === 'slow' ? TrendingDown : ShieldAlert;
  return <article className="border-b border-slate-200 bg-white px-2 py-4 last:border-b-0 hover:bg-slate-50/70 transition-colors">
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 min-w-0"><span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pillClass}`}><Icon className="w-5 h-5"/></span><div className="min-w-0"><h5 className="text-base font-extrabold text-slate-900 break-words">{product?.name || 'Unnamed product'}</h5><p className="mt-1 text-sm text-slate-600">Model: <span className="font-semibold text-slate-800">{product?.model || 'Not provided'}</span></p><span className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-bold ${pillClass}`}>{typeLabel}</span></div></div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 px-3 py-2.5"><p className="text-sm text-slate-600 font-semibold">In stock now</p><p className="mt-1 text-lg font-black text-slate-900">{stock} <span className="text-xs font-medium text-slate-500">units</span></p></div>
        <div className="bg-slate-50 px-3 py-2.5"><p className="text-sm text-slate-600 font-semibold">Sold in 30 days</p><p className="mt-1 text-lg font-black text-slate-900">{sold} <span className="text-xs font-medium text-slate-500">units</span></p></div>
        <div className="bg-slate-50 px-3 py-2.5"><p className="text-sm text-slate-600 font-semibold">Stock cover</p><p className="mt-1 text-lg font-black text-slate-900">{coverage === null || coverage === undefined ? '—' : `${Math.round(Number(coverage))} days`}</p><p className="text-sm text-slate-600">At recent sales pace</p></div>
        <div className={`px-3 py-2.5 ${product?.suggestedReorderQuantity > 0 ? 'bg-blue-50' : 'bg-slate-50'}`}><p className="text-sm text-slate-600 font-semibold">Suggested reorder</p><p className={`mt-1 text-lg font-black ${product?.suggestedReorderQuantity > 0 ? 'text-blue-800' : 'text-slate-700'}`}>{Number(product?.suggestedReorderQuantity || 0)} <span className="text-xs font-medium">units</span></p><p className="text-sm text-slate-600">Review before ordering</p></div>
      </div>
    </div>
    {product?.salesTrendPercent !== undefined && product?.salesTrendPercent !== null && <p className="mt-3 text-sm text-slate-600">Recent sales trend: <span className={`font-bold ${product.salesTrendPercent > 0 ? 'text-emerald-700' : product.salesTrendPercent < 0 ? 'text-rose-700' : 'text-slate-700'}`}>{product.salesTrendPercent > 0 ? '+' : ''}{product.salesTrendPercent}%</span> compared with the previous 30-day daily average.</p>}
  </article>;
};
  // =====================================================
  // INVENTORY TABLE COLUMNS
  // =====================================================

  const inventoryColumns = [
    {
      key: 'sku',
      header: 'Product ID',
      className:
        'px-5 py-3.5 font-black text-indigo-600 tracking-wider',
      render: (p) => p.sku || '—',
    },
    {
      key: 'name',
      header: 'Product Name',
      className:
        'px-5 py-3.5 font-black text-slate-900',
      render: (p) => p.name,
    },
    {
      key: 'brandModel',
      header: 'Brand / Model',
      className:
        'px-5 py-3.5 text-slate-600 font-semibold',
      render: (p) =>
        [p.brand, p.model]
          .filter(Boolean)
          .join(' • ') || '—',
    },
    {
      key: 'category',
      header: 'Category',
      render: (p) => (
        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 font-bold text-[10px] text-slate-600">
          {p.category || 'General'}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Stock Qty',
      headerClassName:
        'px-5 py-4 text-center',
      className:
        'px-5 py-3.5 text-center',
      render: (p) => (
        <span
          className={`inline-flex min-w-7 justify-center px-2.5 py-1 rounded-full text-[10px] font-black border ${
            p.quantity === 0
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : p.quantity <= 3
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {p.quantity} Units
        </span>
      ),
    },
    {
      key: 'purchasePrice',
      header: 'Purchase Price',
      headerClassName:
        'px-5 py-4 text-right',
      className:
        'px-5 py-3.5 text-right font-medium text-slate-500',
      render: (p) =>
        formatMoney(p.purchasePrice),
    },
    {
      key: 'salePrice',
      header: 'Sale Price',
      headerClassName:
        'px-5 py-4 text-right',
      className:
        'px-5 py-3.5 text-right font-black text-slate-900',
      render: (p) =>
        formatMoney(p.salePrice),
    },
    {
      key: 'status',
      header: 'Status',
      headerClassName:
        'px-5 py-4 text-center',
      className:
        'px-5 py-3.5 text-center',
      render: (p) => (
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
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName:
        'px-5 py-4 text-center',
      className:
        'px-5 py-3.5 text-center',
      render: (p) => (
        <div className="flex items-center justify-center gap-1.5">
          <Link
            to={`/inventory/edit/${p._id}`}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
            title="Edit Product"
          >
            <Edit2 className="w-4 h-4" />
          </Link>

          {isDeletionUnlocked ? (
            <button
              type="button"
              onClick={() =>
                triggerDeleteConfirmation(
                  p._id,
                  p.name
                )
              }
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
      ),
    },
  ];

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">

        {/* =====================================================
            HERO HEADER
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

                  <span className="text-slate-600">
                    •
                  </span>

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

              <div className="flex flex-wrap items-center gap-2.5">

                <button
                  onClick={
                    exportToCSV
                  }
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >

                  <FileSpreadsheet className="w-4 h-4" />

                  <span>
                    Export CSV
                  </span>

                </button>

                <Link
                  to="/inventory/add"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >

                  <Plus className="w-4 h-4" />

                  <span>
                    Add Product
                  </span>

                </Link>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            STOCK METRICS KPI CARDS
        ====================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1 */}

          <div className="group relative overflow-hidden premium-card p-5">

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

          {/* Card 2 */}

          <div className="group relative overflow-hidden premium-card p-5">

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

          {/* Card 3 */}

          <div className="group relative overflow-hidden premium-card p-5">

            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />

            <div className="flex items-start justify-between">

              <div>

                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Inventory Value (Cost)
                </p>

                <p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-emerald-600 truncate">
                  {formatMoney(
                    totalStockVal
                  )}
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

          {/* Card 4 */}

          <div className="group relative overflow-hidden premium-card p-5">

            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />

            <div className="flex items-start justify-between">

              <div>

                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Critical Stock
                </p>

                <p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-rose-600">

                  {lowStockCount}

                  <span className="text-xs font-bold text-amber-500">
                    {' '}
                    Low
                  </span>

                  {' • '}

                  {outOfStockCount}

                  <span className="text-xs font-bold text-rose-500">
                    {' '}
                    Out
                  </span>

                </p>

                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Need re-order soon
                </p>

              </div>

              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                  lowStockCount > 0 ||
                  outOfStockCount > 0
                    ? 'bg-rose-50 border-rose-100 text-rose-600'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>

            </div>

          </div>

        </div>

        {/* =====================================================
            INVENTORY INTELLIGENCE
        ====================================================== */}

        <section className="premium-card overflow-hidden border border-blue-100 shadow-sm">
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/80 via-white to-white">
            <button type="button" onClick={() => setIntelligenceOpen((prev) => !prev)} aria-expanded={intelligenceOpen} className="flex items-center gap-4 min-w-0 text-left">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20"><Sparkles className="w-6 h-6" /></div>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl sm:text-2xl font-black text-slate-900">Inventory Intelligence</h2><span className="px-2.5 py-1 rounded-full bg-white border border-blue-200 text-xs font-bold text-blue-700">Last 30 days</span></div><p className="mt-1 text-sm text-slate-600">See what to reorder, review, or keep an eye on. Sales and movement are measured over the last 30 days.</p></div>
            </button>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0"><button type="button" onClick={refreshIntelligence} disabled={intelligenceLoading} className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-blue-700 hover:border-blue-200 flex items-center gap-2 text-sm font-bold disabled:opacity-60" title="Refresh Intelligence"><RefreshCw className={`w-4 h-4 ${intelligenceLoading ? 'animate-spin' : ''}`} />Refresh</button><button type="button" onClick={() => setIntelligenceOpen((prev) => !prev)} aria-label={intelligenceOpen ? 'Collapse inventory intelligence' : 'Open inventory intelligence'} aria-expanded={intelligenceOpen} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-700 flex items-center justify-center">{intelligenceOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</button></div>
          </div>
          {intelligenceOpen && <div className="border-t border-slate-100 p-5 sm:p-6 space-y-6">
            {intelligenceLoading ? <div className="py-12 flex flex-col items-center justify-center gap-3"><div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" /><p className="text-sm font-semibold text-slate-600">Checking stock and recent sales…</p></div>
              : !inventoryIntelligence ? <div className="py-10 text-center"><AlertCircle className="w-10 h-10 mx-auto text-rose-400 mb-3" /><p className="text-base font-bold text-slate-800">Inventory insights couldn’t load</p><p className="text-sm text-slate-500 mt-1">Refresh to try again.</p><button type="button" onClick={refreshIntelligence} className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold">Try again</button></div>
              : <>
                <div className="rounded-2xl border border-slate-200 overflow-hidden"><div className="px-5 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><h3 className="text-lg font-black">What needs attention today?</h3><p className="text-sm text-slate-300 mt-1">Start with urgent stock, then review products that are not moving.</p></div><span className="text-xs font-bold text-slate-300">Based on the last 30 days</span></div>
                  <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    <div className="p-5 bg-rose-50/60"><div className="flex items-center gap-2 text-rose-700"><ShieldAlert className="w-5 h-5"/><h4 className="font-extrabold">1. Check low stock</h4></div><p className="mt-2 text-3xl font-black text-rose-800">{intelligence.stockAtRiskCount ?? stockAtRiskProducts.length}</p><p className="text-sm text-slate-700 mt-1">Products at risk of running short.</p>{stockAtRiskProducts.length > 0 && <a href="#intelligence-risk" className="inline-flex mt-3 text-sm font-bold text-rose-800 underline underline-offset-2">Review products below</a>}</div>
                    <div className="p-5 bg-blue-50/60"><div className="flex items-center gap-2 text-blue-700"><Boxes className="w-5 h-5"/><h4 className="font-extrabold">2. Plan a reorder</h4></div><p className="mt-2 text-3xl font-black text-blue-800">{reorderProducts.length}</p><p className="text-sm text-slate-700 mt-1">Products with a suggested quantity to replenish.</p>{reorderProducts.length > 0 && <a href="#intelligence-reorder" className="inline-flex mt-3 text-sm font-bold text-blue-800 underline underline-offset-2">See suggested quantities</a>}</div>
                    <div className="p-5 bg-amber-50/60"><div className="flex items-center gap-2 text-amber-700"><TrendingDown className="w-5 h-5"/><h4 className="font-extrabold">3. Review slow stock</h4></div><p className="mt-2 text-3xl font-black text-amber-800">{intelligence.slowMovingCount ?? slowMovingProducts.length}</p><p className="text-sm text-slate-700 mt-1">Products with little or no movement.</p>{slowMovingProducts.length > 0 && <a href="#intelligence-slow" className="inline-flex mt-3 text-sm font-bold text-amber-800 underline underline-offset-2">Review products below</a>}</div>
                  </div></div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {[
                    { id:'intelligence-risk', title:'Low stock: check these first', subtitle:'These products are flagged as at risk based on stock and recent sales.', list:stockAtRiskProducts, type:'risk', Icon:ShieldAlert, tone:'rose', empty:'No products are currently flagged as at risk.' },
                    { id:'intelligence-reorder', title:'Suggested replenishment', subtitle:'Suggested quantities use recent demand and each product’s minimum stock level. Review before purchasing.', list:reorderProducts, type:'risk', Icon:Boxes, tone:'blue', empty:'No suggested replenishment right now.' },
                    { id:'intelligence-slow', title:'Slow or no sales', subtitle:'Check whether these products need a stock, pricing, or display review.', list:slowMovingProducts, type:'slow', Icon:TrendingDown, tone:'amber', empty:'No slow-moving products detected.' },
                    { id:'intelligence-fast', title:'Selling well', subtitle:'Strong sellers from the last 30 days. Keep an eye on their remaining stock.', list:fastMovingProducts, type:'fast', Icon:Flame, tone:'orange', empty:'No fast-moving products detected.' },
                  ].map(({id,title,subtitle,list,type,Icon,tone,empty}) => <section id={id} key={id} className="scroll-mt-6"><div className={`px-2 py-3 border-b border-slate-200 ${tone === 'rose' ? 'text-rose-700' : tone === 'blue' ? 'text-blue-700' : tone === 'amber' ? 'text-amber-700' : 'text-orange-700'}`}><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center"><Icon className="w-5 h-5"/></span><div><h4 className="text-base font-extrabold text-slate-900">{title} <span className="text-slate-500">({list.length})</span></h4><p className="text-sm text-slate-600 mt-0.5">{subtitle}</p></div></div></div><div className="px-2 space-y-0 max-h-[22rem] overflow-y-auto overscroll-contain">{list.length ? list.map(product => <IntelligenceProduct key={product.productId || product.id || product._id} product={product} type={type}/> ) : <div className="px-4 py-7 text-center"><CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 mb-2"/><p className="text-sm font-semibold text-slate-600">{empty}</p></div>}</div></section>)}
                </div>
                <div className="mt-5 border-t border-slate-200 pt-4"><h4 className="text-sm font-bold text-slate-700 mb-3">Inventory health</h4><div className="grid sm:grid-cols-3 gap-x-8 gap-y-3"><div><p className="text-sm text-slate-600">Fast sellers</p><p className="mt-0.5 text-lg font-black text-slate-900">{intelligence.fastMovingCount ?? fastMovingProducts.length} <span className="text-sm font-medium text-slate-600">products · strong sales in 30 days</span></p></div><div><p className="text-sm text-slate-600">Current stock retail value</p><p className="mt-0.5 text-lg font-black text-emerald-800">{formatMoney(intelligence.totalInventoryRetailValue)}</p></div><div><p className="text-sm text-slate-600">Cost of stock with no sales in 30 days</p><p className="mt-0.5 text-lg font-black text-slate-800">{formatMoney(intelligence.deadStockValue)}</p></div></div></div>
              </>}
          </div>}
        </section>

        {/* =====================================================
            SEARCH, CATEGORY, STATUS & DATE FILTERS BAR
        ====================================================== */}

        <section className="premium-card p-4 sm:p-5 space-y-4">

          <div className="flex flex-col lg:flex-row gap-3">

            {/* Search */}

            <div className="flex-1 relative">

              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />

              <input
                type="text"
                placeholder="Search by product name, brand, model, or SKU/Product ID..."
                value={
                  searchTerm
                }
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                className="w-full h-11 border border-slate-200 rounded-xl pl-11 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />

              {searchTerm && (
                <button
                  onClick={() =>
                    setSearchTerm('')
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

            </div>

            {/* Category & Status */}

            <div className="flex flex-wrap sm:flex-nowrap gap-2.5">

              <select
                value={
                  selectedCategory
                }
                onChange={(e) =>
                  setSelectedCategory(
                    e.target.value
                  )
                }
                className="h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white cursor-pointer transition-all min-w-[150px]"
              >

                <option value="">
                  All Categories
                </option>

                {categories.map(
                  (cat) => (
                    <option
                      key={cat}
                      value={cat}
                    >
                      {cat}
                    </option>
                  )
                )}

              </select>

              <select
                value={
                  selectedStatus
                }
                onChange={(e) =>
                  setSelectedStatus(
                    e.target.value
                  )
                }
                className="h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white cursor-pointer transition-all min-w-[140px]"
              >

                <option value="">
                  All Statuses
                </option>

                <option value="Available">
                  Available
                </option>

                <option value="Low Stock">
                  Low Stock
                </option>

                <option value="Out of Stock">
                  Out of Stock
                </option>

              </select>

            </div>

          </div>

          {/* Date Filters */}

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-t border-slate-100 pt-3.5">

            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">

              {[
                {
                  id: 'all',
                  label: 'All-Time',
                },
                {
                  id: 'today',
                  label: 'Added Today',
                },
                {
                  id: 'yesterday',
                  label: 'Added Yesterday',
                },
                {
                  id: 'dayBeforeYesterday',
                  label: 'Day Before',
                },
                {
                  id: 'week',
                  label: '7 Days',
                },
                {
                  id: 'month',
                  label: 'This Month',
                },
                {
                  id: 'custom',
                  label: 'Custom Range',
                },
              ].map(
                (preset) => (
                  <button
                    key={
                      preset.id
                    }
                    onClick={() =>
                      setFilterPreset(
                        preset.id
                      )
                    }
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                      filterPreset ===
                      preset.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/20 scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    {
                      preset.label
                    }
                  </button>
                )
              )}

            </div>

            {filterPreset ===
              'custom' && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 animate-[pageEnter_0.2s_ease-out]">

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">

                  <CalendarRange className="w-3.5 h-3.5 text-blue-600" />

                  <input
                    type="date"
                    value={
                      customStartDate
                    }
                    onChange={(e) =>
                      setCustomStartDate(
                        e.target.value
                      )
                    }
                    className="bg-transparent text-xs font-black text-slate-700 outline-none"
                  />

                </div>

                <span>
                  to
                </span>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">

                  <CalendarRange className="w-3.5 h-3.5 text-violet-600" />

                  <input
                    type="date"
                    value={
                      customEndDate
                    }
                    onChange={(e) =>
                      setCustomEndDate(
                        e.target.value
                      )
                    }
                    className="bg-transparent text-xs font-black text-slate-700 outline-none"
                  />

                </div>

              </div>
            )}

          </div>

        </section>

        {/* =====================================================
            INVENTORY DATA TABLE
        ===================================================== */}

        <DataTable
          columns={inventoryColumns}
          rows={filteredProducts}
          loading={loading}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          emptyIcon={Package}
          emptyTitle="No products found"
          emptyHint='No inventory records match the current filters. Click "Add Product" to create new stock items.'
        />

      </div>

      {/* =====================================================
          CONFIRM DELETE MODAL
      ====================================================== */}

      <ConfirmModal
        isOpen={
          deleteModal.isOpen
        }
        onClose={() =>
          setDeleteModal({
            ...deleteModal,
            isOpen: false,
          })
        }
        onConfirm={
          confirmDelete
        }
        title="Delete Product"
        message={`Are you sure you want to permanently delete "${deleteModal.productName}" from your inventory? This action cannot be undone.`}
      />

    </>
  );
};

export default Inventory;
