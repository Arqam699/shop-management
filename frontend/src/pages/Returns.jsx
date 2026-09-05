
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { ALLOW_GLOBAL_DELETION } from '../utils/config'; // Security Lock
import { RefreshCcw, Search, Trash2, Lock } from 'lucide-react';

const Returns = () => {
  const { settings } = useSettings();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/returns');

      if (response.data && response.data.success) {
        setReturns(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching returns directory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleDeleteReturn = async (id, returnId) => {
    if (window.confirm(`Are you sure you want to permanently delete return record "${returnId}" from database?`)) {
      try {
        const response = await api.delete(`/api/returns/${id}`);

        if (response.data && response.data.success) {
          setReturns(returns.filter(r => r._id !== id));
          alert(`Return record ${returnId} removed successfully!`);
        }
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete return record.');
      }
    }
  };

  const filteredReturns = returns.filter(r =>
    r.customer?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.returnId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-sans">
          Returns & Adjustments History
        </h2>
        <p className="text-sm text-gray-600">
          Track dynamic product exchanges, refund cashbacks and dynamic financing installments reductions.
        </p>
      </div>

      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />

          <input
            type="text"
            placeholder="Search returned vouchers by customer name, return ID (RET-...)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500 text-sm">
              Querying returns directory...
            </span>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
            <RefreshCcw className="w-12 h-12 text-gray-300" />

            <p className="text-sm font-semibold">
              No returns recorded yet
            </p>

            <p className="text-xs">
              If a customer returns an item, click "Process Return" directly from their invoice page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-600 font-medium">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4">Return ID</th>
                  <th className="px-6 py-4">Original Invoice</th>
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">Returned Product</th>
                  <th className="px-6 py-4">Returned Qty</th>
                  <th className="px-6 py-4">Refund / Adjusted</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Return Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredReturns.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-indigo-600 font-bold tracking-wider">
                      {r.returnId}
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {r.sale?.saleId || 'Deleted Invoice'}
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900">
                          {r.customer?.fullName || 'N/A'}
                        </p>

                        <p className="text-xs text-gray-500">
                          {r.customer?.mobileNumber || ''}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-800">
                      {r.product?.name || 'Deleted Product'}
                    </td>

                    <td className="px-6 py-4 text-red-600 font-bold">
                      {r.quantity} Units
                    </td>

                    <td className="px-6 py-4 font-extrabold text-green-600">
                      {settings.currency} {r.refundAmount.toLocaleString()}
                    </td>

                    <td
                      className="px-6 py-4 text-gray-500 truncate max-w-[150px]"
                      title={r.reason}
                    >
                      {r.reason}
                    </td>

                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(r.returnDate).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {ALLOW_GLOBAL_DELETION ? (
                        <button
                          onClick={() =>
                            handleDeleteReturn(r._id, r.returnId)
                          }
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                          title="Delete Return Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center p-1.5 text-gray-400 cursor-not-allowed opacity-60"
                          title="Locked: Only Admin can delete from config"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
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

export default Returns;
