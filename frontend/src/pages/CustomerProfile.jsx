import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

import {
  ArrowLeft,
  User,
  Phone,
  FileDigit,
  MapPin,
  ShoppingBag,
  Layers,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Fingerprint,
  CalendarDays,
  Printer,
  Mail,
  StickyNote,
  Camera,
} from 'lucide-react';

/* =========================================================
   MEDIA HELPERS
========================================================= */

/*
  Handles:
  1. data:image/...;base64,...
  2. raw base64
  3. http / https URL
  4. Mongo/Mongoose Buffer object:
     { type: "Buffer", data: [...] }
  5. object with data string
*/

const bufferToDataUrl = (value, mimeType) => {
  try {
    if (!value) return '';

    if (
      typeof value === 'object' &&
      value.type === 'Buffer' &&
      Array.isArray(value.data)
    ) {
      let binary = '';

      const bytes = new Uint8Array(value.data);
      const chunkSize = 0x8000;

      for (
        let i = 0;
        i < bytes.length;
        i += chunkSize
      ) {
        const chunk = bytes.subarray(
          i,
          Math.min(i + chunkSize, bytes.length)
        );

        binary += String.fromCharCode(...chunk);
      }

      return `data:${mimeType};base64,${btoa(binary)}`;
    }

    return '';
  } catch {
    return '';
  }
};

const normalizeImage = (
  image,
  defaultMimeType = 'image/jpeg'
) => {
  if (!image) return '';

  /* -------------------------------------------------------
     STRING IMAGE
  ------------------------------------------------------- */

  if (typeof image === 'string') {
    const value = image.trim();

    if (!value) return '';

    // Already a data URL
    if (value.startsWith('data:image/')) {
      return value;
    }

    // Normal URL
    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('//')
    ) {
      return value;
    }

    // Raw base64
    return `data:${defaultMimeType};base64,${value}`;
  }

  /* -------------------------------------------------------
     BUFFER OBJECT
  ------------------------------------------------------- */

  const bufferData = bufferToDataUrl(
    image,
    defaultMimeType
  );

  if (bufferData) {
    return bufferData;
  }

  /* -------------------------------------------------------
     NESTED DATA OBJECT
  ------------------------------------------------------- */

  if (
    typeof image === 'object' &&
    image.data &&
    typeof image.data === 'string'
  ) {
    const value = image.data.trim();

    if (!value) return '';

    if (value.startsWith('data:image/')) {
      return value;
    }

    return `data:${defaultMimeType};base64,${value}`;
  }

  return '';
};

const getFingerprintImage = (image) => {
  return normalizeImage(
    image,
    'image/png'
  );
};

const getPhotoImage = (image) => {
  return normalizeImage(
    image,
    'image/jpeg'
  );
};

/* =========================================================
   DATE HELPERS
========================================================= */

const formatFingerprintDate = (value) => {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return (
    new Intl.DateTimeFormat('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'Asia/Karachi',
    }).format(date) + ' (PKT)'
  );
};

const formatPhotoDate = (value) => {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return (
    new Intl.DateTimeFormat('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'Asia/Karachi',
    }).format(date) + ' (PKT)'
  );
};

const formatDate = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (
  value,
  currency = 'Rs.'
) => {
  const amount = Number(value || 0);

  return `${currency} ${amount.toLocaleString(
    'en-PK'
  )}`;
};

/* =========================================================
   IMAGE PLACEHOLDER
========================================================= */

const MediaPlaceholder = ({ type }) => {
  const isFingerprint =
    type === 'fingerprint';

  return (
    <div className="text-center px-3">
      {isFingerprint ? (
        <Fingerprint className="w-10 h-10 text-slate-300 mx-auto mb-2" />
      ) : (
        <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
      )}

      <p className="text-[10px] text-slate-400">
        {isFingerprint
          ? 'No fingerprint image'
          : 'No photo available'}
      </p>
    </div>
  );
};

/* =========================================================
   SAFE IMAGE
========================================================= */

const SafeImage = ({
  src,
  alt,
  className,
  placeholderType,
}) => {
  const [failed, setFailed] =
    useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <MediaPlaceholder
        type={placeholderType}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        setFailed(true);
      }}
    />
  );
};

/* =========================================================
   IDENTITY MEDIA SECTION
========================================================= */

const IdentityMediaSection = ({
  fingerprintImage,
  fingerprintCapturedAt,
  liveImage,
  liveImageCapturedAt,
}) => {
  const fingerprintSrc =
    getFingerprintImage(
      fingerprintImage
    );

  const photoSrc =
    getPhotoImage(liveImage);

  const fingerprintCaptured =
    Boolean(fingerprintSrc);

  const photoCaptured =
    Boolean(photoSrc);

  return (
    <div className="w-full lg:w-[280px] shrink-0">

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

        {/* =================================================
            FINGERPRINT
        ================================================= */}

        <div className="flex items-center gap-2 mb-2">

          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Fingerprint className="w-4 h-4 text-indigo-600" />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800">
              Fingerprint
            </p>

            <p
              className={`text-[10px] font-semibold ${
                fingerprintCaptured
                  ? 'text-green-600'
                  : 'text-slate-400'
              }`}
            >
              {fingerprintCaptured
                ? 'Captured'
                : 'Not Captured'}
            </p>
          </div>

        </div>

        {/* Fingerprint Image */}

        <div className="h-[150px] rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">

          <SafeImage
            src={fingerprintSrc}
            alt="Fingerprint"
            placeholderType="fingerprint"
            className="max-w-[210px] max-h-[140px] w-auto h-auto object-contain"
          />

        </div>

        {/* Fingerprint Date */}

        <div className="mt-2 flex items-start gap-1.5 text-[10px] text-slate-500">

          <CalendarDays className="w-3.5 h-3.5 mt-0.5 shrink-0" />

          <span>
            {fingerprintCaptured
              ? formatFingerprintDate(
                  fingerprintCapturedAt
                )
              : 'Capture time not available'}
          </span>

        </div>

        {/* =================================================
            PHOTO
        ================================================= */}

        <div className="mt-4 pt-4 border-t border-slate-200">

          <div className="flex items-center gap-2 mb-2">

            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Camera className="w-4 h-4 text-emerald-600" />
            </div>

            <div>

              <p className="text-xs font-bold text-slate-800">
                Photo
              </p>

              <p
                className={`text-[10px] font-semibold ${
                  photoCaptured
                    ? 'text-green-600'
                    : 'text-slate-400'
                }`}
              >
                {photoCaptured
                  ? 'Captured'
                  : 'Not Captured'}
              </p>

            </div>

          </div>

          {/* Photo Image */}

          <div className="h-[190px] rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">

            <SafeImage
              src={photoSrc}
              alt="Person"
              placeholderType="photo"
              className="w-full h-full object-contain"
            />

          </div>

          {/* Photo Date */}

          <div className="mt-2 flex items-start gap-1.5 text-[10px] text-slate-500">

            <CalendarDays className="w-3.5 h-3.5 mt-0.5 shrink-0" />

            <span>
              {photoCaptured
                ? formatPhotoDate(
                    liveImageCapturedAt
                  )
                : 'Capture time not available'}
            </span>

          </div>

        </div>

      </div>

    </div>
  );
};

/* =========================================================
   DETAIL ITEM
========================================================= */

const DetailItem = ({
  icon: Icon,
  label,
  value,
  fullWidth = false,
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 ${
        fullWidth
          ? 'sm:col-span-2 xl:col-span-3'
          : ''
      }`}
    >

      <div className="flex items-center gap-2 mb-1">

        <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />

        <span className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
          {label}
        </span>

      </div>

      <p className="text-sm font-semibold text-slate-800 break-words">

        {value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
          ? value
          : 'N/A'}

      </p>

    </div>
  );
};

/* =========================================================
   IDENTITY CARD
========================================================= */

const IdentityCard = ({
  title,
  subtitle,
  iconColor,
  iconBg,
  person,
  isCustomer = false,
}) => {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

      {/* Header */}

      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">

        <div
          className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}
        >
          <User
            className={`w-5 h-5 ${iconColor}`}
          />
        </div>

        <div>

          <h2 className="text-base font-black text-slate-900">
            {title}
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle}
          </p>

        </div>

      </div>

      {/* Content */}

      <div className="p-5">

        <div className="flex flex-col lg:flex-row gap-5">

          {/* Details */}

          <div className="flex-1 min-w-0">

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">

              {isCustomer ? (
                <>
                  <DetailItem
                    icon={FileDigit}
                    label="Customer ID"
                    value={
                      person?.customerId
                    }
                  />

                  <DetailItem
                    icon={User}
                    label="Full Name"
                    value={
                      person?.fullName
                    }
                  />

                  <DetailItem
                    icon={User}
                    label="Father Name"
                    value={
                      person?.fatherName
                    }
                  />

                  <DetailItem
                    icon={Phone}
                    label="Mobile Number"
                    value={
                      person?.mobileNumber
                    }
                  />

                  <DetailItem
                    icon={Phone}
                    label="Alternate Mobile"
                    value={
                      person?.alternateMobileNumber
                    }
                  />

                  <DetailItem
                    icon={FileDigit}
                    label="CNIC"
                    value={person?.cnic}
                  />

                  <DetailItem
                    icon={MapPin}
                    label="City"
                    value={person?.city}
                  />

                  <DetailItem
                    icon={Mail}
                    label="Email"
                    value={person?.email}
                  />

                  <DetailItem
                    icon={MapPin}
                    label="Address"
                    value={
                      person?.address
                    }
                    fullWidth
                  />

                  <DetailItem
                    icon={StickyNote}
                    label="Notes"
                    value={person?.notes}
                    fullWidth
                  />
                </>
              ) : (
                <>
                  <DetailItem
                    icon={User}
                    label="Full Name"
                    value={person?.name}
                  />

                  <DetailItem
                    icon={User}
                    label="Father Name"
                    value={
                      person?.fatherName
                    }
                  />

                  <DetailItem
                    icon={Phone}
                    label="Mobile Number"
                    value={
                      person?.mobileNumber
                    }
                  />

                  <DetailItem
                    icon={FileDigit}
                    label="CNIC"
                    value={person?.cnic}
                  />

                  <DetailItem
                    icon={User}
                    label="Relation"
                    value={
                      person?.relation
                    }
                  />

                  <DetailItem
                    icon={MapPin}
                    label="Address"
                    value={
                      person?.address
                    }
                    fullWidth
                  />
                </>
              )}

            </div>

          </div>

          {/* =================================================
              MEDIA
          ================================================= */}

          <IdentityMediaSection
            fingerprintImage={
              person?.fingerprintImage
            }
            fingerprintCapturedAt={
              person?.fingerprintCapturedAt
            }
            liveImage={
              person?.liveImage
            }
            liveImageCapturedAt={
              person?.liveImageCapturedAt
            }
          />

        </div>

      </div>

    </section>
  );
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({
  title,
  value,
  icon: Icon,
  iconClass,
  bgClass,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">

      <div className="flex items-center justify-between gap-3">

        <div>

          <p className="text-[11px] uppercase tracking-wide font-bold text-slate-400">
            {title}
          </p>

          <p className="text-lg font-black text-slate-900 mt-1">
            {value}
          </p>

        </div>

        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass}`}
        >
          <Icon
            className={`w-5 h-5 ${iconClass}`}
          />
        </div>

      </div>

    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const CustomerProfile = () => {
  const { id } = useParams();
  const { settings } = useSettings();

  const [customer, setCustomer] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMsg, setErrorMsg] =
    useState('');

  /* =========================================================
     FETCH CUSTOMER
  ========================================================= */

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        const response =
          await api.get(
            `/customers/${id}`
          );

        if (
          response.data &&
          response.data.success
        ) {
          const data =
            response.data.data;

          setCustomer(data);
        } else {
          setErrorMsg(
            'Customer records missing.'
          );
        }
      } catch (error) {
        setErrorMsg(
          error?.response?.data
            ?.message ||
            'Failed to load profile record data.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfile();
    }
  }, [id]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">

        <div className="text-center">

          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />

          <p className="text-sm font-semibold text-slate-500">
            Loading customer profile...
          </p>

        </div>

      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (errorMsg || !customer) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4">

        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-sm">

          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />

          <h2 className="text-lg font-black text-slate-900">
            Customer Not Found
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            {errorMsg ||
              'Customer record could not be loaded.'}
          </p>

          <Link
            to="/customers"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4" />

            Back to Customers
          </Link>

        </div>

      </div>
    );
  }

  /* =========================================================
     DATA
  ========================================================= */

  const totalPurchased =
    customer.totalPurchased || 0;

  const outstandingBalance =
    customer.outstandingBalance || 0;

  const totalSalesCount =
    customer.sales?.length || 0;

  const hasOverdue =
    customer.hasOverdue || false;

  const guarantor1 =
    customer.guarantor1 || {};

  const guarantor2 =
    customer.guarantor2 || {};

  /* =========================================================
     CREDIT STATUS
  ========================================================= */

  let creditStatus = {
    title:
      'New Customer (No Prior History)',
    badgeColor:
      'bg-blue-50 border-blue-200 text-blue-700',
    icon: Clock,
    description:
      'Yeh customer pehli baar dukan par aaya hai. Iska koi pichla karobari record nahi hai.',
  };

  if (totalSalesCount > 0) {
    if (outstandingBalance === 0) {
      creditStatus = {
        title:
          'Record 100% Clean (All Dues Cleared)',
        badgeColor:
          'bg-green-50 border-green-200 text-green-700',
        icon: ShieldCheck,
        description:
          'MashaAllah! Is customer ne purani saari kistein aur cash deals mukammal ada kar di hain. Koi rupiyah baqi nahi hai.',
      };
    } else if (hasOverdue) {
      creditStatus = {
        title:
          'High Risk (Overdue Dues Pending)',
        badgeColor:
          'bg-red-50 border-red-200 text-red-700 font-black animate-pulse',
        icon: AlertTriangle,
        description:
          'Khabardar! Is customer ki pichli kiston mein se kist overdue ho chuki hai. Naya samaan dene se pehle pichle dues clear karein.',
      };
    } else {
      creditStatus = {
        title:
          'Active Account (Dues on Schedule)',
        badgeColor:
          'bg-purple-50 border-purple-200 text-purple-700',
        icon: CheckCircle,
        description:
          'Is customer ki kistein active hain aur time par jama ho rahi hain.',
      };
    }
  }

  const StatusIcon =
    creditStatus.icon;

  /* =========================================================
     PRINT DATE
  ========================================================= */

  const printedDate =
    new Intl.DateTimeFormat('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Karachi',
    }).format(new Date());

  /* =========================================================
     PRINT MEDIA
  ========================================================= */

  const renderPrintMedia = (
    person,
    personLabel
  ) => {
    const fingerprintSrc =
      getFingerprintImage(
        person?.fingerprintImage
      );

    const photoSrc =
      getPhotoImage(
        person?.liveImage
      );

    return (
      <div className="print-media-column">

        {/* Fingerprint */}

        <div className="print-fingerprint-box">

          <div className="print-fingerprint-title">
            FINGERPRINT
          </div>

          {fingerprintSrc ? (
            <img
              src={fingerprintSrc}
              alt={`${personLabel} Fingerprint`}
            />
          ) : (
            <div className="print-no-fingerprint">
              No fingerprint
            </div>
          )}

          <small>
            {formatFingerprintDate(
              person?.fingerprintCapturedAt
            )}
          </small>

        </div>

        {/* Photo */}

        <div className="print-photo-box">

          <div className="print-photo-title">
            PHOTO
          </div>

          {photoSrc ? (
            <img
              src={photoSrc}
              alt={`${personLabel} Photo`}
            />
          ) : (
            <div className="print-no-photo">
              No photo
            </div>
          )}

          <small>
            {formatPhotoDate(
              person?.liveImageCapturedAt
            )}
          </small>

        </div>

      </div>
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      {/* =====================================================
          NORMAL SCREEN
      ===================================================== */}

      <div className="space-y-6 max-w-6xl mx-auto font-sans print:hidden">

        {/* Header */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>

            <Link
              to="/customers"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />

              Back to Customers
            </Link>

            <h1 className="text-2xl font-black text-slate-900">
              Customer Profile
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Complete customer and guarantor
              verification record.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors shrink-0"
          >
            <Printer className="w-4 h-4" />

            Print Customer Slip
          </button>

        </div>

        {/* Credit Status */}

        <section
          className={`border rounded-2xl p-4 ${creditStatus.badgeColor}`}
        >

          <div className="flex items-start gap-3">

            <StatusIcon className="w-5 h-5 mt-0.5 shrink-0" />

            <div>

              <h2 className="font-black text-sm">
                {creditStatus.title}
              </h2>

              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {creditStatus.description}
              </p>

            </div>

          </div>

        </section>

        {/* =====================================================
            CUSTOMER
        ===================================================== */}

        <IdentityCard
          title="Customer Details"
          subtitle="Customer identity, fingerprint and photo record"
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          person={customer}
          isCustomer
        />

        {/* =====================================================
            ZAMANTI 1
        ===================================================== */}

        <IdentityCard
          title="Zamanti 1 Details"
          subtitle="First guarantor identity, fingerprint and photo record"
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          person={guarantor1}
        />

        {/* =====================================================
            ZAMANTI 2
        ===================================================== */}

        <IdentityCard
          title="Zamanti 2 Details"
          subtitle="Second guarantor identity, fingerprint and photo record"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          person={guarantor2}
        />

        {/* =====================================================
            ACCOUNT SUMMARY
        ===================================================== */}

        <section>

          <div className="flex items-center gap-2 mb-3">

            <Layers className="w-5 h-5 text-indigo-600" />

            <h2 className="text-lg font-black text-slate-900">
              Account Summary
            </h2>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <SummaryCard
              title="Total Purchased"
              value={formatCurrency(
                totalPurchased,
                settings?.currency ||
                  'Rs.'
              )}
              icon={ShoppingBag}
              iconClass="text-blue-600"
              bgClass="bg-blue-50"
            />

            <SummaryCard
              title="Outstanding Balance"
              value={formatCurrency(
                outstandingBalance,
                settings?.currency ||
                  'Rs.'
              )}
              icon={Clock}
              iconClass="text-red-600"
              bgClass="bg-red-50"
            />

            <SummaryCard
              title="Total Purchases"
              value={totalSalesCount}
              icon={ShoppingBag}
              iconClass="text-purple-600"
              bgClass="bg-purple-50"
            />

            <SummaryCard
              title="Account Status"
              value={
                outstandingBalance === 0
                  ? 'Clear'
                  : hasOverdue
                    ? 'Overdue'
                    : 'Active'
              }
              icon={
                outstandingBalance === 0
                  ? ShieldCheck
                  : hasOverdue
                    ? AlertTriangle
                    : CheckCircle
              }
              iconClass={
                outstandingBalance === 0
                  ? 'text-green-600'
                  : hasOverdue
                    ? 'text-red-600'
                    : 'text-indigo-600'
              }
              bgClass={
                outstandingBalance === 0
                  ? 'bg-green-50'
                  : hasOverdue
                    ? 'bg-red-50'
                    : 'bg-indigo-50'
              }
            />

          </div>

        </section>

        {/* =====================================================
            INSTALLMENT PLANS
        ===================================================== */}

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">

            <Layers className="w-5 h-5 text-indigo-600" />

            <div>

              <h2 className="text-base font-black text-slate-900">
                Installment Plans
              </h2>

              <p className="text-xs text-slate-500">
                Customer installment records
              </p>

            </div>

          </div>

          <div className="p-5">

            {!customer.installmentPlans ||
            customer.installmentPlans.length === 0 ? (

              <div className="text-center py-8">

                <Layers className="w-9 h-9 text-slate-300 mx-auto mb-2" />

                <p className="text-sm font-semibold text-slate-500">
                  No installment plans found.
                </p>

              </div>

            ) : (

              <div className="space-y-3">

                {customer.installmentPlans.map(
                  (plan, index) => (

                    <div
                      key={
                        plan._id || index
                      }
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50"
                    >

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                        <div>

                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Plan
                          </p>

                          <p className="text-sm font-bold text-slate-800 mt-1">
                            {plan.duration
                              ? `${plan.duration} Months`
                              : 'Installment Plan'}
                          </p>

                        </div>

                        <div>

                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Total Amount
                          </p>

                          <p className="text-sm font-bold text-slate-800 mt-1">
                            {formatCurrency(
                              plan.totalAmount,
                              settings?.currency ||
                                'Rs.'
                            )}
                          </p>

                        </div>

                        <div>

                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Paid
                          </p>

                          <p className="text-sm font-bold text-green-600 mt-1">
                            {formatCurrency(
                              plan.paidAmount,
                              settings?.currency ||
                                'Rs.'
                            )}
                          </p>

                        </div>

                        <div>

                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Remaining
                          </p>

                          <p className="text-sm font-bold text-red-600 mt-1">
                            {formatCurrency(
                              plan.remainingAmount,
                              settings?.currency ||
                                'Rs.'
                            )}
                          </p>

                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>

            )}

          </div>

        </section>

        {/* =====================================================
            PAST PURCHASES
        ===================================================== */}

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">

            <ShoppingBag className="w-5 h-5 text-indigo-600" />

            <div>

              <h2 className="text-base font-black text-slate-900">
                Past Purchases
              </h2>

              <p className="text-xs text-slate-500">
                Complete customer purchase history
              </p>

            </div>

          </div>

          <div className="p-5">

            {!customer.sales ||
            customer.sales.length === 0 ? (

              <div className="text-center py-10">

                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />

                <p className="text-sm font-semibold text-slate-500">
                  No past purchases found.
                </p>

              </div>

            ) : (

              <div className="space-y-3">

                {customer.sales.map(
                  (sale, index) => (

                    <div
                      key={
                        sale._id || index
                      }
                      className="border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors"
                    >

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                        <div>

                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Invoice
                          </p>

                          <p className="text-sm font-bold text-slate-800 mt-1">
                            {sale.invoiceNumber ||
                              sale.invoiceNo ||
                              'N/A'}
                          </p>

                        </div>

                        <div>

                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Date
                          </p>

                          <p className="text-sm font-semibold text-slate-700 mt-1">
                            {formatDate(
                              sale.saleDate ||
                                sale.createdAt ||
                                sale.date
                            )}
                          </p>

                        </div>

                        <div>

                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Product
                          </p>

                          <p className="text-sm font-semibold text-slate-700 mt-1">
                            {sale.product?.name ||
                              sale.productName ||
                              sale.itemName ||
                              'N/A'}
                          </p>

                        </div>

                        <div>

                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Amount
                          </p>

                          <p className="text-sm font-bold text-slate-800 mt-1">
                            {formatCurrency(
                              sale.totalAmount ??
                                sale.salePrice ??
                                sale.amount ??
                                0,
                              settings?.currency ||
                                'Rs.'
                            )}
                          </p>

                        </div>

                        <div>

                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Status
                          </p>

                          <span
                            className={`inline-flex mt-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              sale.status ===
                                'paid' ||
                              sale.paymentStatus ===
                                'paid'
                                ? 'bg-green-50 text-green-700'
                                : sale.status ===
                                    'overdue'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {sale.status ||
                              sale.paymentStatus ||
                              'Recorded'}
                          </span>

                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </section>

      </div>

      {/* =====================================================
          PRINT SLIP
      ===================================================== */}

      <div className="customer-print-slip">

        {/* PRINT HEADER */}

        <div className="print-header">

          <div>

            <h1>
              CUSTOMER VERIFICATION RECORD
            </h1>

            <p>
              Customer & Guarantor Identity Record
            </p>

          </div>

          <div className="print-date">
            Printed: {printedDate}
          </div>

        </div>

        {/* =================================================
            CUSTOMER PRINT
        ================================================= */}

        <div className="print-person">

          <div className="print-title">
            CUSTOMER DETAILS
          </div>

          <div className="print-content">

            <div className="print-details">

              <div>
                <span>
                  Customer ID
                </span>

                <strong>
                  {customer.customerId ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Full Name
                </span>

                <strong>
                  {customer.fullName ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Father Name
                </span>

                <strong>
                  {customer.fatherName ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Mobile Number
                </span>

                <strong>
                  {customer.mobileNumber ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Alternate Mobile
                </span>

                <strong>
                  {customer.alternateMobileNumber ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  CNIC
                </span>

                <strong>
                  {customer.cnic ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  City
                </span>

                <strong>
                  {customer.city ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Email
                </span>

                <strong>
                  {customer.email ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Address
                </span>

                <strong>
                  {customer.address ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Notes
                </span>

                <strong>
                  {customer.notes ||
                    'N/A'}
                </strong>
              </div>

            </div>

            {renderPrintMedia(
              customer,
              'Customer'
            )}

          </div>

        </div>

        {/* =================================================
            ZAMANTI 1 PRINT
        ================================================= */}

        <div className="print-person">

          <div className="print-title">
            ZAMANTI 1
          </div>

          <div className="print-content">

            <div className="print-details">

              <div>
                <span>
                  Full Name
                </span>

                <strong>
                  {guarantor1.name ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Father Name
                </span>

                <strong>
                  {guarantor1.fatherName ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Mobile Number
                </span>

                <strong>
                  {guarantor1.mobileNumber ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  CNIC
                </span>

                <strong>
                  {guarantor1.cnic ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Relation
                </span>

                <strong>
                  {guarantor1.relation ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Address
                </span>

                <strong>
                  {guarantor1.address ||
                    'N/A'}
                </strong>
              </div>

            </div>

            {renderPrintMedia(
              guarantor1,
              'Zamanti 1'
            )}

          </div>

        </div>

        {/* =================================================
            ZAMANTI 2 PRINT
        ================================================= */}

        <div className="print-person">

          <div className="print-title">
            ZAMANTI 2
          </div>

          <div className="print-content">

            <div className="print-details">

              <div>
                <span>
                  Full Name
                </span>

                <strong>
                  {guarantor2.name ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Father Name
                </span>

                <strong>
                  {guarantor2.fatherName ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Mobile Number
                </span>

                <strong>
                  {guarantor2.mobileNumber ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  CNIC
                </span>

                <strong>
                  {guarantor2.cnic ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Relation
                </span>

                <strong>
                  {guarantor2.relation ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Address
                </span>

                <strong>
                  {guarantor2.address ||
                    'N/A'}
                </strong>
              </div>

            </div>

            {renderPrintMedia(
              guarantor2,
              'Zamanti 2'
            )}

          </div>

        </div>

        {/* FOOTER */}

        <div className="print-footer">
          Customer verification and identity record.
        </div>

      </div>

      {/* =====================================================
          PRINT CSS
      ===================================================== */}

      <style>{`

        .customer-print-slip {
          display: none;
        }

        @media print {

          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }

          .customer-print-slip {
            display: block !important;
            width: 100%;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
          }

          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #111827;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }

          .print-header h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }

          .print-header p {
            margin: 3px 0 0;
            font-size: 10px;
            color: #6b7280;
          }

          .print-date {
            font-size: 9px;
            color: #6b7280;
            text-align: right;
            white-space: nowrap;
          }

          .print-person {
            border: 1px solid #d1d5db;
            margin-bottom: 10px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .print-title {
            background: #f3f4f6;
            border-bottom: 1px solid #d1d5db;
            padding: 6px 9px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.4px;
            color: #111827;
          }

          .print-content {
            display: grid;
            grid-template-columns: 1fr 250px;
            gap: 12px;
            padding: 9px;
            align-items: start;
          }

          .print-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 18px;
            row-gap: 6px;
          }

          .print-details > div {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .print-details span {
            font-size: 8px;
            text-transform: uppercase;
            font-weight: 700;
            color: #6b7280;
            margin-bottom: 1px;
          }

          .print-details strong {
            font-size: 10px;
            font-weight: 700;
            color: #111827;
            word-break: break-word;
          }

          /* ================================================
             PRINT MEDIA
          ================================================= */

          .print-media-column {
            display: flex;
            align-items: flex-start;
            justify-content: flex-end;
            gap: 8px;
          }

          /* Fingerprint */

          .print-fingerprint-box {
            width: 105px;
            min-height: 100px;
            border: 1px solid #cbd5e1;
            border-radius: 5px;
            padding: 5px;
            text-align: center;
            background: #fafafa;
          }

          .print-fingerprint-title {
            font-size: 8px;
            font-weight: 800;
            color: #6b7280;
            margin-bottom: 4px;
            letter-spacing: 0.3px;
          }

          .print-fingerprint-box img {
            display: block;
            width: 78px;
            height: 62px;
            object-fit: contain;
            margin: 0 auto 4px;
          }

          .print-fingerprint-box small {
            display: block;
            font-size: 6.5px;
            line-height: 1.2;
            color: #6b7280;
          }

          .print-no-fingerprint {
            height: 62px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 7px;
            color: #9ca3af;
            text-align: center;
          }

          /* Photo */

          .print-photo-box {
            width: 105px;
            min-height: 100px;
            border: 1px solid #cbd5e1;
            border-radius: 5px;
            padding: 5px;
            text-align: center;
            background: #fafafa;
          }

          .print-photo-title {
            font-size: 8px;
            font-weight: 800;
            color: #6b7280;
            margin-bottom: 4px;
            letter-spacing: 0.3px;
          }

          .print-photo-box img {
            display: block;
            width: 78px;
            height: 62px;
            object-fit: cover;
            border-radius: 3px;
            margin: 0 auto 4px;
          }

          .print-photo-box small {
            display: block;
            font-size: 6.5px;
            line-height: 1.2;
            color: #6b7280;
          }

          .print-no-photo {
            height: 62px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 7px;
            color: #9ca3af;
            text-align: center;
          }

          .print-footer {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #d1d5db;
            font-size: 8px;
            color: #6b7280;
            text-align: center;
          }

        }

      `}</style>
    </>
  );
};

export default CustomerProfile;