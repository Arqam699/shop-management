
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  Lock,
  Calendar
} from 'lucide-react';

const Inventory = () => {
  const { settings } = useSettings();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

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
    'Other'
  ];

  const fetchProducts = async () => {
    try {
      setLoading(true);

      const response = await api.get('/api/products');

      if (response.data && response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await api.delete(`/api/products/${id}`);

        setProducts(
          products.filter((p) => p._id !== id)
        );
      } catch (error) {
        alert('Failed to delete product.');
      }
    }
  };

  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false;

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterPreset === 'all') return true;

    if (filterPreset === 'today') {
      return date.getTime() === today.getTime();
    }

    if (filterPreset === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);

      return date >= startOfWeek && date <= today;
    }

    if (filterPreset === 'month') {
      const startOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      return date >= startOfMonth && date <= today;
    }

    if (
      filterPreset === 'custom' &&
      customStartDate &&
      customEndDate
    ) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);

      return date >= start && date <= end;
    }

    return true;
  };

  const filteredProducts = products.filter((p) => {
    const name = p.name?.toLowerCase() || '';
    const brand = p.brand?.toLowerCase() || '';
    const model = p.model?.toLowerCase() || '';
    const sku = p.sku?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      name.includes(term) ||
      brand.includes(term) ||
      model.includes(term) ||
      sku.includes(term);

    const matchesCategory =
      !selectedCategory ||
      p.category === selectedCategory;

    const matchesStatus =
      !selectedStatus ||
      p.status === selectedStatus;

    const matchesDate =
      isDateInFilter(p.createdAt || p.purchaseDate);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus &&
      matchesDate
    );
  });

  const exportToCSV = () => {
    if (filteredProducts.length === 0) {
      return alert('No inventory data to export.');
    }

    const headers = [
      'Product ID,Product Name,Category,Brand,Model,Purchase Price,Sale Price,Qty,Status,Added Date'
    ];

    const rows = filteredProducts.map((p) => {
      const dateFormatted = new Date(
        p.createdAt || p.purchaseDate
      ).toLocaleDateString('en-PK');

      return `"${p.sku}","${p.name}","${p.category}","${p.brand}","${p.model}",${p.purchasePrice},${p.salePrice},${p.quantity},"${p.status}","${dateFormatted}"`;
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');

    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Inventory_Report_${filterPreset}_${new Date()
        .toISOString()
        .split('T')[0]}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalStockVal = filteredProducts.reduce(
    (acc, p) =>
      acc + p.purchasePrice * p.quantity,
    0
  );

  const totalStockQty = filteredProducts.reduce(
    (acc, p) => acc + p.quantity,
    0
  );

  const lowStockCount = filteredProducts.filter(
    (p) => p.status === 'Low Stock'
  ).length;

  const outOfStockCount = filteredProducts.filter(
    (p) => p.status === 'Out of Stock'
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">
            Dukan Inventory Manager
          </h2>

          <p className="text-sm text-gray-600">
            Track stock levels, purchase/sale pricing parameters and purchase dates.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <Link
            to="/inventory/add"
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Stock metrics bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Filtered Products
          </span>

          <p className="text-xl font-extrabold text-gray-900 mt-1">
            {filteredProducts.length}
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Total Stock Qty
          </span>

          <p className="text-xl font-extrabold text-gray-900 mt-1">
            {totalStockQty}
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Inventory Value (Cost)
          </span>

          <p className="text-xl font-extrabold text-gray-900 mt-1">
            {settings.currency} {totalStockVal.toLocaleString()}
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Low / Out of Stock
            </span>

            <p className="text-xl font-extrabold text-red-600 mt-1">
              {lowStockCount}{' '}
              <span className="text-xs text-gray-400 font-normal">
                Low
              </span>{' '}
              / {outOfStockCount}{' '}
              <span className="text-xs text-gray-400 font-normal">
                Out
              </span>
            </p>
          </div>

          {(lowStockCount > 0 ||
            outOfStockCount > 0) && (
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
          )}
        </div>
      </div>

      {/* Search and Universal Date Filters */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />

            <input
              type="text"
              placeholder="Search by name, brand, model, or Product ID (01, 02...)..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value)
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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
              onChange={(e) =>
                setSelectedStatus(e.target.value)
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Date Filter Presets */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All-Time' },
              { id: 'today', label: 'Added Today' },
              { id: 'week', label: 'Added This Week' },
              { id: 'month', label: 'Added This Month' },
              { id: 'custom', label: 'Custom Range' }
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() =>
                  setFilterPreset(preset.id)
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
                  setCustomStartDate(e.target.value)
                }
                className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              />

              <span>to</span>

              <input
                type="date"
                value={customEndDate}
                onChange={(e) =>
                  setCustomEndDate(e.target.value)
                }
                className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>

            <span className="text-gray-500 text-sm">
              Querying database...
            </span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No products found matching the criteria. Click "Add Product" to populate your inventory sheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4">Product ID</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Brand/Model</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Stock Qty</th>
                  <th className="px-6 py-4">Purchase Price</th>
                  <th className="px-6 py-4">Sale Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 font-medium">
                {filteredProducts.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-gray-50/75 transition-colors"
                  >
                    <td className="px-6 py-4 text-indigo-600 font-bold tracking-wider">
                      {p.sku}
                    </td>

                    <td className="px-6 py-4 font-bold text-gray-900">
                      {p.name}
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      {p.brand} / {p.model}
                    </td>

                    <td className="px-6 py-4 text-gray-500">
                      {p.category}
                    </td>

                    <td className="px-6 py-4 text-gray-900 font-semibold">
                      {p.quantity}
                    </td>

                    <td className="px-6 py-4">
                      {settings.currency}{' '}
                      {p.purchasePrice.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-800">
                      {settings.currency}{' '}
                      {p.salePrice.toLocaleString()}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          p.status === 'Available'
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : p.status === 'Low Stock'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Link
                          to={`/inventory/edit/${p._id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>

                        {/* VISUAL LOCKED SECURITY BADGE (Changes to Delete on ALLOW_GLOBAL_DELETION = true) */}
                        {ALLOW_GLOBAL_DELETION ? (
                          <button
                            onClick={() =>
                              handleDelete(
                                p._id,
                                p.name
                              )
                            }
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none"
                            title="Locked: Only Admin can unlock from config"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </span>
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
  );
};

export default Inventory;