
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { Save, ArrowLeft, Loader2, AlertCircle, Users, ShieldCheck } from 'lucide-react';

const AddEditCustomer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    fullName: '',
    fatherName: '',
    mobileNumber: '',
    alternateMobileNumber: '',
    cnic: '',
    address: '',
    city: 'Sangla Hill',
    email: '',
    notes: '',
    guarantor1: {
      name: '',
      fatherName: '',
      mobileNumber: '',
      cnic: '',
      relation: '',
      address: ''
    },
    guarantor2: {
      name: '',
      fatherName: '',
      mobileNumber: '',
      cnic: '',
      relation: '',
      address: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isEditMode) {
      const fetchCustomerDetails = async () => {
        try {
          setFetching(true);

          const response = await api.get(`/api/customers/${id}`);

          if (response.data && response.data.success) {
            const data = response.data.data;

            setFormData({
              ...data,
              guarantor1: data.guarantor1 || {
                name: '',
                fatherName: '',
                mobileNumber: '',
                cnic: '',
                relation: '',
                address: ''
              },
              guarantor2: data.guarantor2 || {
                name: '',
                fatherName: '',
                mobileNumber: '',
                cnic: '',
                relation: '',
                address: ''
              }
            });
          }
        } catch (error) {
          setErrorMsg('Failed to load customer details from system.');
        } finally {
          setFetching(false);
        }
      };

      fetchCustomerDetails();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    let { name, value } = e.target;

    // CNIC auto-formatting pattern (e.g. 35401-1234567-1)
    if (name === 'cnic') {
      value = value.replace(/[^0-9]/g, '');

      if (value.length > 5 && value.length <= 12) {
        value = `${value.slice(0, 5)}-${value.slice(5)}`;
      } else if (value.length > 12) {
        value = `${value.slice(0, 5)}-${value.slice(5, 12)}-${value.slice(12, 13)}`;
      }
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleGuarantorChange = (guarantorKey, field, val) => {
    let value = val;

    // Auto-format CNIC for guarantors too
    if (field === 'cnic') {
      value = value.replace(/[^0-9]/g, '');

      if (value.length > 5 && value.length <= 12) {
        value = `${value.slice(0, 5)}-${value.slice(5)}`;
      } else if (value.length > 12) {
        value = `${value.slice(0, 5)}-${value.slice(5, 12)}-${value.slice(12, 13)}`;
      }
    }

    setFormData({
      ...formData,
      [guarantorKey]: {
        ...formData[guarantorKey],
        [field]: value
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (formData.cnic.length !== 15) {
      setErrorMsg(
        'CNIC must be a valid 13-digit Pakistani ID card format (e.g. 35401-1234567-1).'
      );
      setLoading(false);
      return;
    }

    try {
      if (isEditMode) {
        await api.put(`/api/customers/${id}`, formData);
      } else {
        await api.post('/api/customers', formData);
      }

      // Frontend route — /api should NOT be used here
      navigate('/customers');
    } catch (error) {
      setErrorMsg(
        error.response?.data?.message ||
        'Failed to submit customer credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-500 text-sm font-bold">
          Querying profiles database...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="flex items-center space-x-3">
        <Link
          to="/customers"
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode
              ? 'Modify Customer Profile'
              : 'Register New Buyer & Guarantors'}
          </h2>

          <p className="text-sm text-gray-600">
            Enter customer identity and up to 2 Zamanatdaar (Zamanti) details for safe financing.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start space-x-3 text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* CARD 1: MAIN CUSTOMER DETAILS */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
          <h3 className="font-bold text-gray-800 border-b pb-2 text-base">
            Asal Customer ki Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  Full Name
                </label>

                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Muhammad Rizwan"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  Father's Name
                </label>

                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder="e.g. Abdul Ghafoor"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  CNIC (National ID Card)
                </label>

                <input
                  type="text"
                  name="cnic"
                  value={formData.cnic}
                  onChange={handleChange}
                  placeholder="35401-1234567-1"
                  maxLength="15"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-wide font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500">
                    Mobile Number
                  </label>

                  <input
                    type="text"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    placeholder="03001234567"
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500">
                    Alt Phone (Optional)
                  </label>

                  <input
                    type="text"
                    name="alternateMobileNumber"
                    value={formData.alternateMobileNumber}
                    onChange={handleChange}
                    placeholder="03007654321"
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  Home Address
                </label>

                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street / Mohalla details"
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  City
                </label>

                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  required
                />
              </div>

            </div>
          </div>
        </div>

        {/* CARD 2: ZAMANATDAR #1 */}
        <div className="bg-white border border-purple-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="border-b border-purple-100 pb-2 flex items-center justify-between">
            <h3 className="font-extrabold text-purple-900 text-sm uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <span>Zamanatdar 1 (Pehla Zamanti)</span>
            </h3>

            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
              Primary Guarantor
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-gray-600">

            <div>
              <label className="block text-gray-400 uppercase">
                Zamanti 1 Name
              </label>

              <input
                type="text"
                value={formData.guarantor1?.name || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'name',
                    e.target.value
                  )
                }
                placeholder="Name"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Father Name
              </label>

              <input
                type="text"
                value={formData.guarantor1?.fatherName || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'fatherName',
                    e.target.value
                  )
                }
                placeholder="Father Name"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Mobile Number
              </label>

              <input
                type="text"
                value={formData.guarantor1?.mobileNumber || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'mobileNumber',
                    e.target.value
                  )
                }
                placeholder="0300..."
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                CNIC Number
              </label>

              <input
                type="text"
                value={formData.guarantor1?.cnic || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'cnic',
                    e.target.value
                  )
                }
                placeholder="35401-..."
                maxLength="15"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 tracking-wide"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Customer Se Rishta (Relation)
              </label>

              <input
                type="text"
                value={formData.guarantor1?.relation || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'relation',
                    e.target.value
                  )
                }
                placeholder="e.g. Bhai, Dost, Chacha"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Zamanti 1 Pata (Address)
              </label>

              <input
                type="text"
                value={formData.guarantor1?.address || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor1',
                    'address',
                    e.target.value
                  )
                }
                placeholder="Area / Village"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

          </div>
        </div>

        {/* CARD 3: ZAMANATDAR #2 */}
        <div className="bg-white border border-indigo-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="border-b border-indigo-100 pb-2 flex items-center justify-between">
            <h3 className="font-extrabold text-indigo-900 text-sm uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>Zamanatdar 2 (Doosra Zamanti)</span>
            </h3>

            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Secondary Guarantor
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-gray-600">

            <div>
              <label className="block text-gray-400 uppercase">
                Zamanti 2 Name
              </label>

              <input
                type="text"
                value={formData.guarantor2?.name || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'name',
                    e.target.value
                  )
                }
                placeholder="Name"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Father Name
              </label>

              <input
                type="text"
                value={formData.guarantor2?.fatherName || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'fatherName',
                    e.target.value
                  )
                }
                placeholder="Father Name"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Mobile Number
              </label>

              <input
                type="text"
                value={formData.guarantor2?.mobileNumber || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'mobileNumber',
                    e.target.value
                  )
                }
                placeholder="0300..."
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                CNIC Number
              </label>

              <input
                type="text"
                value={formData.guarantor2?.cnic || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'cnic',
                    e.target.value
                  )
                }
                placeholder="35401-..."
                maxLength="15"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-wide"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Customer Se Rishta (Relation)
              </label>

              <input
                type="text"
                value={formData.guarantor2?.relation || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'relation',
                    e.target.value
                  )
                }
                placeholder="e.g. Mamoo, Parosi, Dost"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase">
                Zamanti 2 Pata (Address)
              </label>

              <input
                type="text"
                value={formData.guarantor2?.address || ''}
                onChange={(e) =>
                  handleGuarantorChange(
                    'guarantor2',
                    'address',
                    e.target.value
                  )
                }
                placeholder="Area / Village"
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-wide"
              />
            </div>

          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors disabled:bg-indigo-400 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Details...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>
                  {isEditMode
                    ? 'Update Profile & Guarantors'
                    : 'Save Customer & 2 Zamanti'}
                </span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default AddEditCustomer;