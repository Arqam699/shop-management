import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

import {
  Calendar,
  Plus,
  Eye,
  Trash2,
  X,
  AlertCircle,
  Lock,
} from 'lucide-react';

const YearlyAudits = () => {
  const { settings } = useSettings();

  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion Mode status from Settings
  const isDeletionUnlocked =
    settings?.allowGlobalDeletion === true;

  const fetchAudits = async () => {
    try {
      setLoading(true);

      const res = await api.get('/api/audits');

      if (res.data && res.data.success) {
        setAudits(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const handleCreateYear = async (e) => {
    e.preventDefault();

    setModalError('');
    setIsSubmitting(true);

    try {
      const res = await api.post('/api/audits', {
        year: newYear,
      });

      if (res.data && res.data.success) {
        alert(
          `Audit Sheet for Year ${newYear} generated successfully!`
        );

        setShowAddModal(false);
        setNewYear('');

        fetchAudits();
      }
    } catch (error) {
      setModalError(
        error.response?.data?.message ||
          'Failed to create year slot.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteYear = async (id, year) => {
    // Frontend protection
    if (!isDeletionUnlocked) {
      alert(
        'Deletion Mode is disabled. Enable it from Settings first.'
      );
      return;
    }

    if (
      window.confirm(
        `DANGER: Are you sure you want to permanently delete Yearly Audit register for Year "${year}"?`
      )
    ) {
      try {
        await api.delete(`/api/audits/${id}`);

        setAudits((currentAudits) =>
          currentAudits.filter(
            (a) => a._id !== id
          )
        );

        alert(
          `Yearly Audit register for ${year} deleted successfully.`
        );
      } catch (error) {
        alert(
          error.response?.data?.message ||
            'Failed to remove yearly audit register.'
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">
            Lifetime Yearly Audits
          </h2>

          <p className="text-sm text-gray-600">
            Digitize your dukan past years manual registers
            (buying costs, cash/installment sales & profits)
            cleanly.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Year Audit Sheet</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="p-10 text-center col-span-full">
            Loading auditing registers...
          </div>
        ) : audits.length === 0 ? (
          <div className="bg-white border rounded-2xl p-10 text-center col-span-full space-y-2 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto text-gray-300" />

            <p className="font-bold">
              No historical registers added yet
            </p>

            <p className="text-xs">
              Click "Add Year Audit Sheet" to start digitizing
              registers from 2022 onwards.
            </p>
          </div>
        ) : (
          audits.map((audit) => (
            <div
              key={audit._id}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-6 h-6 text-indigo-600" />

                  <span className="text-xl font-black text-slate-800">
                    Year {audit.year}
                  </span>
                </div>

                {isDeletionUnlocked ? (
                  <button
                    onClick={() =>
                      handleDeleteYear(
                        audit._id,
                        audit.year
                      )
                    }
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    title="Delete entire year audit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <span
                    className="inline-flex items-center p-1.5 text-gray-400 cursor-not-allowed opacity-60"
                    title="Locked: Enable Deletion Mode from Settings"
                  >
                    <Lock className="w-3 h-3 m-1" />
                    <span>Locked</span>
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs font-bold text-gray-500">
                <div className="flex justify-between">
                  <span>Investment (Buy Cost):</span>

                  <span className="text-slate-900">
                    {settings.currency}{' '}
                    {(
                      audit.totalInventoryCost || 0
                    ).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Total Collected Revenue:</span>

                  <span className="text-green-700">
                    {settings.currency}{' '}
                    {(
                      audit.totalSalesRevenue || 0
                    ).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between border-t border-dashed pt-2 text-sm text-slate-900">
                  <span>Net Audited Profit:</span>

                  <span className="text-indigo-600 font-extrabold">
                    {settings.currency}{' '}
                    {(
                      audit.totalYearlyProfit || 0
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <Link
                to={`/audits/${audit._id}`}
                className="w-full flex items-center justify-center space-x-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition-colors shadow-sm"
              >
                <Eye className="w-4 h-4" />
                <span>Open Auditing Sheets</span>
              </Link>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form
            onSubmit={handleCreateYear}
            className="bg-white border rounded-2xl w-full max-w-sm shadow-xl overflow-hidden"
          >
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <span className="font-extrabold text-sm uppercase text-slate-800 tracking-wider">
                Generate Year Slot
              </span>

              <button
                type="button"
                onClick={() =>
                  setShowAddModal(false)
                }
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modalError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start space-x-2 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600" />

                  <span className="font-semibold">
                    {modalError}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 font-sans">
                  Enter Year (e.g. 2022, 2023)
                </label>

                <input
                  type="number"
                  value={newYear}
                  onChange={(e) =>
                    setNewYear(e.target.value)
                  }
                  placeholder="2022"
                  min="2000"
                  max="2100"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-extrabold"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors"
              >
                {isSubmitting
                  ? 'Generating...'
                  : 'Create slot'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default YearlyAudits;