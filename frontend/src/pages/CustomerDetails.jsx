import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  formatCnicSearchInput,
  matchesCnicSearch,
  matchesMobileSearch,
} from '../utils/cnicSearch';
import toast from 'react-hot-toast';

import {
  Search,
  User,
  Phone,
  FileDigit,
  MapPin,
  Fingerprint,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Eye,
  UserRound,
  Users,
  Camera,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Contact,
  CheckCircle2,
  XCircle,
  X,
  CreditCard,
  Building2,
} from 'lucide-react';

const CustomerDetails = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // =========================================================
  // DATA GETTER HELPERS
  // =========================================================
  const getValue = (...values) => {
    for (const value of values) {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        return value;
      }
    }
    return '';
  };

  const getCustomerId = (customer) => {
    return getValue(
      customer?.customerId,
      customer?.customerID,
      customer?.customerNo,
      customer?.customerNumber,
      customer?.id,
      customer?._id
    );
  };

  const getName = (customer) => {
    return getValue(
      customer?.name,
      customer?.fullName,
      customer?.customerName
    );
  };

  const getFatherName = (customer) => {
    return getValue(
      customer?.fatherName,
      customer?.father,
      customer?.father_name,
      customer?.guardianName,
      customer?.fatherFullName
    );
  };

  const getMobile = (customer) => {
    return getValue(
      customer?.mobile,
      customer?.phone,
      customer?.mobileNumber,
      customer?.phoneNumber,
      customer?.contact,
      customer?.contactNumber
    );
  };

  const getCNIC = (customer) => {
    return getValue(
      customer?.cnic,
      customer?.CNIC,
      customer?.cnicNumber,
      customer?.nationalId,
      customer?.nic
    );
  };

  const getAddress = (customer) => {
    return getValue(
      customer?.address,
      customer?.fullAddress,
      customer?.homeAddress,
      customer?.residentialAddress
    );
  };

  const getCity = (customer) => {
    return getValue(
      customer?.city,
      customer?.town,
      customer?.area
    );
  };
const getPaymentScore = (customer) => {
  return customer?.paymentScore || null;
};
  const getPhoto = (customer) => {
    return getValue(
      customer?.photoUrl,
      customer?.photo,
      customer?.image,
      customer?.customerPhoto,
      customer?.customerPhotoUrl,
      customer?.photoData
    );
  };

  const hasFingerprint = (customer) => {
    return Boolean(
      getValue(
        customer?.fingerprintFmd,
        customer?.fingerprintImage,
        customer?.fingerprintCapturedAt
      )
    );
  };

  const hasCustomerPhoto = (customer) => {
    return Boolean(getPhoto(customer));
  };

  const hasGuarantor1 = (customer) => {
    const guarantor = customer?.guarantor1;
    if (!guarantor) return false;
    if (typeof guarantor === 'string') {
      return guarantor.trim().length > 0;
    }
    return Boolean(
      getValue(
        guarantor?.name,
        guarantor?.fullName,
        guarantor?.mobile,
        guarantor?.phone,
        guarantor?.cnic,
        guarantor?._id
      )
    );
  };

  const hasGuarantor2 = (customer) => {
    const guarantor = customer?.guarantor2;
    if (!guarantor) return false;
    if (typeof guarantor === 'string') {
      return guarantor.trim().length > 0;
    }
    return Boolean(
      getValue(
        guarantor?.name,
        guarantor?.fullName,
        guarantor?.mobile,
        guarantor?.phone,
        guarantor?.cnic,
        guarantor?._id
      )
    );
  };

  // =========================================================
  // LOAD CUSTOMERS
  // =========================================================
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customers');

      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || 'Failed to load customers'
        );
      }

      setCustomers(data);
    } catch (error) {
      console.error('CUSTOMER DETAILS LOAD ERROR:', error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Failed to load customers'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // =========================================================
  // SEARCH FILTER
  // =========================================================
  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((customer) => {
      const searchableValues = [
        getCustomerId(customer),
        getName(customer),
        getFatherName(customer),
        getMobile(customer),
        getCNIC(customer),
        getAddress(customer),
        getCity(customer),
      ];

      return (
        searchableValues.some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(query)
        ) ||
        matchesMobileSearch(getMobile(customer), query) ||
        matchesCnicSearch(getCNIC(customer), query)
      );
    });
  }, [customers, search]);

  // =========================================================
  // OPEN CUSTOMER
  // =========================================================
  const openCustomer = (customerId) => {
    if (!customerId) {
      toast.error('Customer ID not found.');
      return;
    }
    navigate(`/customers/${customerId}`);
  };

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO HEADER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Back to Customers Directory"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">
                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                    Customer Directory
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[9px] font-bold text-slate-400">
                    Personal Profile Overview
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                  Customer Details & Profiles
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={loadCustomers}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60 self-start sm:self-auto"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  loading ? 'animate-spin text-blue-400' : ''
                }`}
              />
              <span>Refresh Records</span>
            </button>

          </div>
        </div>
      </section>

      {/* =====================================================
          SEARCH BAR
      ====================================================== */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(formatCnicSearchInput(e.target.value))}
            placeholder="Search by customer ID, name, father name, mobile number, or CNIC..."
            className="w-full h-11 pl-11 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {search && (
          <div className="mt-3 text-xs font-semibold text-slate-400">
            Showing <span className="font-black text-slate-700">{filteredCustomers.length}</span> matching customer
            {filteredCustomers.length !== 1 ? 's' : ''}
          </div>
        )}
      </section>

      {/* =====================================================
          CUSTOMER LISTING
      ====================================================== */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-16 flex flex-col items-center justify-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 p-0.5 animate-spin flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          </div>
          <p className="text-sm font-black text-slate-800 mt-4">
            Loading Customer Profiles...
          </p>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Querying customer directory and verification records...
          </p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
            <UserRound className="w-7 h-7" />
          </div>
          <h3 className="mt-4 font-black text-slate-700 text-base">
            No Customer Found
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Try searching with another customer ID, full name, mobile number, or CNIC.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
          
          {/* LIST HEADER */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-black text-sm sm:text-base text-slate-900">
                Customer Directory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose a customer to view personal details, guarantors and printable slip
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black self-start sm:self-auto">
              {filteredCustomers.length} Customer{filteredCustomers.length !== 1 ? 's' : ''} Found
            </span>
          </div>

          {/* CUSTOMER CARDS DIVIDER LIST */}
          <div className="divide-y divide-slate-100">
            {filteredCustomers.map((customer) => {
              const customerId = getCustomerId(customer);
              const name = getName(customer);
              const fatherName = getFatherName(customer);
              const mobile = getMobile(customer);
              const cnic = getCNIC(customer);
              const address = getAddress(customer);
              const city = getCity(customer);
              const photo = getPhoto(customer);
              const paymentScore = getPaymentScore(customer);

              const fingerprintSaved = hasFingerprint(customer);
              const customerPhotoSaved = hasCustomerPhoto(customer);
              const guarantor1Saved = hasGuarantor1(customer);
              const guarantor2Saved = hasGuarantor2(customer);

              return (
                <div
                  key={customer?._id || customerId}
                  className="p-5 sm:p-6 hover:bg-slate-50/70 transition-all duration-200"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center gap-5">
                    
                    {/* CUSTOMER PHOTO / AVATAR */}
                    <div className="shrink-0">
                      {photo ? (
                        <img
                          src={photo}
                          alt={name || 'Customer'}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}

                      <div
                        className={`${
                          photo ? 'hidden' : ''
                        } w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center shadow-sm`}
                      >
                        <User className="w-6 h-6" />
                      </div>
                    </div>

                    {/* MAIN INFO SECTION */}
                    <div className="flex-1 min-w-0">
                      
                      {/* Name & ID */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-900 text-base">
                          {name || 'Unnamed Customer'}
                        </h3>

                        {customerId && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                            ID: {customerId}
                          </span>
                        )}
                      </div>

                      {/* PARAMETERS GRID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-2.5 mt-3 text-xs">
                        
                        {/* Mobile */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                            <Phone className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">Mobile</p>
                            <p className="text-slate-800 font-bold truncate">{mobile || '—'}</p>
                          </div>
                        </div>

                        {/* Father Name */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                            <UserRound className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">Father Name</p>
                            <p className="text-slate-800 font-bold truncate">{fatherName || '—'}</p>
                          </div>
                        </div>

                        {/* CNIC */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                            <FileDigit className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">CNIC</p>
                            <p className="text-slate-800 font-bold truncate">{cnic || '—'}</p>
                          </div>
                        </div>

                        {/* City */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">City</p>
                            <p className="text-slate-800 font-bold truncate">{city || '—'}</p>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="flex items-center gap-2 min-w-0 sm:col-span-2 lg:col-span-3 xl:col-span-4">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">Residential Address</p>
                            <p className="text-slate-700 font-medium truncate">{address || 'No residential address recorded'}</p>
                          </div>
                        </div>

                      </div>

                      {/* PAYMENT SCORE */}
<div className="mt-3.5">
  {paymentScore?.score !== null &&
  paymentScore?.score !== undefined ? (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black border ${
        paymentScore.score >= 90
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : paymentScore.score >= 75
          ? 'bg-blue-50 border-blue-200 text-blue-700'
          : paymentScore.score >= 60
          ? 'bg-amber-50 border-amber-200 text-amber-700'
          : paymentScore.score >= 40
          ? 'bg-orange-50 border-orange-200 text-orange-700'
          : 'bg-red-50 border-red-200 text-red-700'
      }`}
    >
      <CreditCard className="w-3.5 h-3.5" />

      <span>
        Payment Score: {paymentScore.score}/100
      </span>

      <span className="opacity-70">
        • {paymentScore.rating}
      </span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black border bg-slate-100 border-slate-200 text-slate-400">
      <CreditCard className="w-3.5 h-3.5" />
      Payment Score: {paymentScore?.rating || 'No History'}
    </span>
  )}
</div>

                      {/* VERIFICATION BADGES */}
                      <div className="flex flex-wrap items-center gap-2 mt-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border ${
                            customerPhotoSaved
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          <Camera className="w-3 h-3" />
                          {customerPhotoSaved ? 'Photo Saved' : 'No Photo'}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border ${
                            fingerprintSaved
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          <Fingerprint className="w-3 h-3" />
                          {fingerprintSaved ? 'Biometric Saved' : 'No Biometrics'}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border ${
                            guarantor1Saved
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          {guarantor1Saved ? 'Guarantor 1 Recorded' : 'No Guarantor 1'}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border ${
                            guarantor2Saved
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          {guarantor2Saved ? 'Guarantor 2 Recorded' : 'No Guarantor 2'}
                        </span>
                      </div>

                    </div>

                    {/* ACTION BUTTON */}
                    <div className="shrink-0 flex xl:flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => openCustomer(customer?._id)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-md shadow-blue-950/20 transition-all duration-300 hover:scale-[1.02] active:scale-95"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* FOOTER INFO NOTE */}
      {!loading && filteredCustomers.length > 0 && (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 px-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Customer records are verified and synced with your database.</span>
        </div>
      )}

    </div>
  );
};

export default CustomerDetails;