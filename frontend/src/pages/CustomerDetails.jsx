import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCnicSearchInput, matchesCnicSearch, matchesMobileSearch } from '../utils/cnicSearch';
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
} from 'lucide-react';

const CustomerDetails = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // =========================================================
  // HELPERS
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

      console.log(
        'CUSTOMER DETAILS API RESPONSE:',
        response.data
      );

      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      console.log('CUSTOMERS:', data);

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            'Failed to load customers'
        );
      }

      setCustomers(data);
    } catch (error) {
      console.error(
        'CUSTOMER DETAILS LOAD ERROR:',
        error
      );

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
  // SEARCH
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

      return searchableValues.some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      ) ||
        matchesMobileSearch(getMobile(customer), query) ||
        matchesCnicSearch(getCNIC(customer), query);
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
    <div className="space-y-5">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="
              w-10
              h-10
              rounded-xl
              flex
              items-center
              justify-center
              bg-white
              border
              border-slate-200
              text-slate-500
              hover:text-indigo-600
              hover:border-indigo-200
              hover:bg-indigo-50
              transition
              shadow-sm
            "
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800">
              Customer Details
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select a customer to view complete personal details
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadCustomers}
          disabled={loading}
          className="
            h-10
            px-4
            rounded-xl
            bg-white
            border
            border-slate-200
            text-slate-600
            hover:text-indigo-600
            hover:border-indigo-200
            transition
            flex
            items-center
            justify-center
            gap-2
            text-sm
            font-bold
            shadow-sm
          "
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />

          Refresh
        </button>
      </div>

      {/* =====================================================
          SEARCH
      ====================================================== */}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search
            className="
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              w-4
              h-4
              text-slate-400
            "
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(formatCnicSearchInput(e.target.value))}
            placeholder="Search by customer ID, name, father name, mobile number, or CNIC..."
            className="
              w-full
              h-11
              pl-11
              pr-4
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              text-sm
              text-slate-800
              outline-none
              focus:border-indigo-400
              focus:ring-2
              focus:ring-indigo-100
              transition
            "
          />
        </div>

        {search && (
          <div className="mt-3 text-xs text-slate-400">
            Showing{' '}
            <span className="font-bold text-slate-600">
              {filteredCustomers.length}
            </span>{' '}
            matching customer
            {filteredCustomers.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* =====================================================
          LOADING
      ====================================================== */}

      {loading ? (
        <div
          className="
            bg-white
            border
            border-slate-200
            rounded-2xl
            p-12
            flex
            flex-col
            items-center
            justify-center
            shadow-sm
          "
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
          </div>

          <p className="text-sm font-semibold text-slate-600 mt-4">
            Loading customers...
          </p>

          <p className="text-xs text-slate-400 mt-1">
            Please wait while customer records are loaded.
          </p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        /* =====================================================
           EMPTY
        ====================================================== */

        <div
          className="
            bg-white
            border
            border-slate-200
            rounded-2xl
            p-12
            text-center
            shadow-sm
          "
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
            <UserRound className="w-7 h-7 text-slate-300" />
          </div>

          <h3 className="mt-4 font-black text-slate-700">
            No customer found
          </h3>

          <p className="text-sm text-slate-400 mt-1">
            Try another customer ID, name, mobile or CNIC.
          </p>
        </div>
      ) : (
        /* =====================================================
           CUSTOMER LIST
        ====================================================== */

        <div
          className="
            bg-white
            border
            border-slate-200
            rounded-2xl
            overflow-hidden
            shadow-sm
          "
        >
          {/* LIST HEADER */}

          <div
            className="
              px-5
              py-4
              border-b
              border-slate-200
              flex
              flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-2
            "
          >
            <div>
              <h2 className="font-black text-slate-800">
                Select Customer
              </h2>

              <p className="text-xs text-slate-400 mt-1">
                Choose a customer to open their personal details
              </p>
            </div>

            <div
              className="
                self-start
                sm:self-auto
                px-3
                py-1.5
                rounded-lg
                bg-indigo-50
                text-indigo-600
                text-xs
                font-black
              "
            >
              {filteredCustomers.length} Customer
              {filteredCustomers.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* CUSTOMERS */}

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

              const fingerprintSaved =
                hasFingerprint(customer);

              const customerPhotoSaved =
                hasCustomerPhoto(customer);

              const guarantor1Saved =
                hasGuarantor1(customer);

              const guarantor2Saved =
                hasGuarantor2(customer);

              return (
                <div
                  key={customer?._id || customerId}
                  className="
                    p-4
                    sm:p-5
                    hover:bg-slate-50
                    transition
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      xl:flex-row
                      xl:items-center
                      gap-4
                    "
                  >
                    {/* =========================================
                        PHOTO
                    ========================================== */}

                    <div className="shrink-0">
                      {photo ? (
                        <img
                          src={photo}
                          alt={name || 'Customer'}
                          className="
                            w-14
                            h-14
                            rounded-2xl
                            object-cover
                            border
                            border-slate-200
                            shadow-sm
                          "
                          onError={(e) => {
                            e.currentTarget.style.display =
                              'none';
                            e.currentTarget.nextElementSibling?.classList.remove(
                              'hidden'
                            );
                          }}
                        />
                      ) : null}

                      <div
                        className={`
                          ${
                            photo ? 'hidden' : ''
                          }
                          w-14
                          h-14
                          rounded-2xl
                          bg-indigo-50
                          text-indigo-600
                          border
                          border-indigo-100
                          flex
                          items-center
                          justify-center
                        `}
                      >
                        <User className="w-6 h-6" />
                      </div>
                    </div>

                    {/* =========================================
                        MAIN INFO
                    ========================================== */}

                    <div className="flex-1 min-w-0">
                      {/* NAME */}

                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-800 text-base">
                          {name || 'Unnamed Customer'}
                        </h3>

                        {customerId && (
                          <span
                            className="
                              text-[10px]
                              font-black
                              px-2
                              py-1
                              rounded-md
                              bg-indigo-50
                              text-indigo-600
                              border
                              border-indigo-100
                            "
                          >
                            {customerId}
                          </span>
                        )}
                      </div>

                      {/* DETAILS GRID */}

                      <div
                        className="
                          grid
                          grid-cols-1
                          sm:grid-cols-2
                          lg:grid-cols-3
                          xl:grid-cols-4
                          gap-x-5
                          gap-y-2
                          mt-3
                          text-xs
                        "
                      >
                        {/* MOBILE */}

                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Phone className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">
                              Mobile
                            </div>

                            <div className="text-slate-600 font-semibold truncate">
                              {mobile || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* FATHER */}

                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                            <UserRound className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">
                              Father Name
                            </div>

                            <div className="text-slate-600 font-semibold truncate">
                              {fatherName || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* CNIC */}

                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <FileDigit className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">
                              CNIC
                            </div>

                            <div className="text-slate-600 font-semibold truncate">
                              {cnic || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* CITY */}

                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">
                              City
                            </div>

                            <div className="text-slate-600 font-semibold truncate">
                              {city || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* ADDRESS */}

                        <div className="flex items-center gap-2 min-w-0 sm:col-span-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">
                              Address
                            </div>

                            <div className="text-slate-600 font-semibold truncate">
                              {address || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* =======================================
                          SAVED DATA BADGES
                      ======================================== */}

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span
                          className={`
                            inline-flex
                            items-center
                            gap-1.5
                            px-2.5
                            py-1
                            rounded-lg
                            text-[10px]
                            font-bold
                            ${
                              customerPhotoSaved
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-slate-100 text-slate-400'
                            }
                          `}
                        >
                          <Camera className="w-3 h-3" />

                          {customerPhotoSaved
                            ? 'Photo Saved'
                            : 'No Photo'}
                        </span>

                        <span
                          className={`
                            inline-flex
                            items-center
                            gap-1.5
                            px-2.5
                            py-1
                            rounded-lg
                            text-[10px]
                            font-bold
                            ${
                              fingerprintSaved
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-100 text-slate-400'
                            }
                          `}
                        >
                          <Fingerprint className="w-3 h-3" />

                          {fingerprintSaved
                            ? 'Fingerprint Saved'
                            : 'No Fingerprint'}
                        </span>

                        <span
                          className={`
                            inline-flex
                            items-center
                            gap-1.5
                            px-2.5
                            py-1
                            rounded-lg
                            text-[10px]
                            font-bold
                            ${
                              guarantor1Saved
                                ? 'bg-purple-50 text-purple-600'
                                : 'bg-slate-100 text-slate-400'
                            }
                          `}
                        >
                          <Users className="w-3 h-3" />

                          {guarantor1Saved
                            ? 'Guarantor 1 Saved'
                            : 'No Guarantor 1'}
                        </span>

                        <span
                          className={`
                            inline-flex
                            items-center
                            gap-1.5
                            px-2.5
                            py-1
                            rounded-lg
                            text-[10px]
                            font-bold
                            ${
                              guarantor2Saved
                                ? 'bg-purple-50 text-purple-600'
                                : 'bg-slate-100 text-slate-400'
                            }
                          `}
                        >
                          <Users className="w-3 h-3" />

                          {guarantor2Saved
                            ? 'Guarantor 2 Saved'
                            : 'No Guarantor 2'}
                        </span>
                      </div>
                    </div>

                    {/* =========================================
                        OPEN BUTTON
                    ========================================== */}

                    <div className="shrink-0 flex xl:flex-col gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openCustomer(
                            customer?._id
                          )
                        }
                        className="
                          h-10
                          px-4
                          rounded-xl
                          bg-indigo-600
                          text-white
                          text-xs
                          font-bold
                          flex
                          items-center
                          justify-center
                          gap-2
                          hover:bg-indigo-700
                          transition
                          shadow-sm
                          hover:shadow-md
                        "
                      >
                        <Eye className="w-4 h-4" />

                        View Details

                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================
          SMALL INFO FOOTER
      ====================================================== */}

      {!loading && filteredCustomers.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />

          Customer information is loaded from your shop database.
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;
