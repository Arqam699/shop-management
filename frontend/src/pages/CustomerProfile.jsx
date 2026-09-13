import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  Sparkles,
  UserRound,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  Receipt,
  RotateCcw,
} from 'lucide-react';

/* =========================================================
   MEDIA HELPERS
========================================================= */

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

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }

      return `data:${mimeType};base64,${btoa(binary)}`;
    }

    return '';
  } catch {
    return '';
  }
};

const normalizeImage = (image, defaultMimeType = 'image/jpeg') => {
  if (!image) return '';

  if (typeof image === 'string') {
    const value = image.trim();
    if (!value) return '';

    if (value.startsWith('data:image/')) {
      return value;
    }

    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('//')
    ) {
      return value;
    }

    return `data:${defaultMimeType};base64,${value}`;
  }

  const bufferData = bufferToDataUrl(image, defaultMimeType);
  if (bufferData) {
    return bufferData;
  }

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
  return normalizeImage(image, 'image/png');
};

const getPhotoImage = (image) => {
  return normalizeImage(image, 'image/jpeg');
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

const formatCurrency = (value, currency = 'PKR') => {
  const amount = Number(value || 0);
  return `${currency} ${amount.toLocaleString('en-PK')}`;
};

/* =========================================================
   IMAGE PLACEHOLDER
========================================================= */

const MediaPlaceholder = ({ type }) => {
  const isFingerprint = type === 'fingerprint';

  return (
    <div className="text-center px-3">
      {isFingerprint ? (
        <Fingerprint className="w-9 h-9 text-slate-300 mx-auto mb-1.5" />
      ) : (
        <Camera className="w-9 h-9 text-slate-300 mx-auto mb-1.5" />
      )}

      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {isFingerprint ? 'No Biometric Print' : 'No Photo Available'}
      </p>
    </div>
  );
};

/* =========================================================
   SAFE IMAGE
========================================================= */

const SafeImage = ({ src, alt, className, placeholderType }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <MediaPlaceholder type={placeholderType} />;
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
  const fingerprintSrc = getFingerprintImage(fingerprintImage);
  const photoSrc = getPhotoImage(liveImage);

  const fingerprintCaptured = Boolean(fingerprintSrc);
  const photoCaptured = Boolean(photoSrc);

  return (
    <div className="w-full lg:w-[280px] shrink-0">
      <div className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-4">
        
        {/* FINGERPRINT */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Fingerprint className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-black text-slate-800">Fingerprint</p>
            </div>

            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                fingerprintCaptured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
            >
              {fingerprintCaptured ? 'Captured' : 'Not Captured'}
            </span>
          </div>

          <div className="h-[140px] rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-inner p-2">
            <SafeImage
              src={fingerprintSrc}
              alt="Fingerprint"
              placeholderType="fingerprint"
              className="max-w-[210px] max-h-[125px] w-auto h-auto object-contain"
            />
          </div>

          <div className="mt-1.5 flex items-start gap-1.5 text-[9px] text-slate-400 font-semibold">
            <CalendarDays className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {fingerprintCaptured
                ? formatFingerprintDate(fingerprintCapturedAt)
                : 'Capture date not recorded'}
            </span>
          </div>
        </div>

        {/* PHOTO */}
        <div className="pt-3.5 border-t border-slate-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Camera className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-black text-slate-800">Person Photo</p>
            </div>

            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                photoCaptured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
            >
              {photoCaptured ? 'Captured' : 'Not Captured'}
            </span>
          </div>

          <div className="h-[175px] rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-inner p-2">
            <SafeImage
              src={photoSrc}
              alt="Person"
              placeholderType="photo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          <div className="mt-1.5 flex items-start gap-1.5 text-[9px] text-slate-400 font-semibold">
            <CalendarDays className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {photoCaptured
                ? formatPhotoDate(liveImageCapturedAt)
                : 'Photo date not recorded'}
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

const DetailItem = ({ icon: Icon, label, value, fullWidth = false }) => {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 ${
        fullWidth ? 'sm:col-span-2 xl:col-span-3' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">
          {label}
        </span>
      </div>

      <p className="text-xs sm:text-sm font-black text-slate-800 break-words">
        {value !== undefined && value !== null && String(value).trim() !== ''
          ? value
          : '—'}
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
    <section className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <User className={`w-4 h-4 ${iconColor}`} />
        </div>

        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-900">{title}</h2>
          <p className="text-[10px] sm:text-xs text-slate-400 font-semibold">{subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Details Grid */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {isCustomer ? (
                <>
                  <DetailItem icon={FileDigit} label="Customer ID" value={person?.customerId} />
                  <DetailItem icon={User} label="Full Name" value={person?.fullName} />
                  <DetailItem icon={User} label="Father Name" value={person?.fatherName} />
                  <DetailItem icon={Phone} label="Mobile Number" value={person?.mobileNumber} />
                  <DetailItem icon={Phone} label="Alternate Mobile" value={person?.alternateMobileNumber} />
                  <DetailItem icon={FileDigit} label="CNIC" value={person?.cnic} />
                  <DetailItem icon={MapPin} label="City" value={person?.city} />
                  <DetailItem icon={Mail} label="Email" value={person?.email} />
                  <DetailItem icon={MapPin} label="Residential Address" value={person?.address} fullWidth />
                  {person?.notes && (
                    <DetailItem icon={StickyNote} label="Notes / Remarks" value={person?.notes} fullWidth />
                  )}
                </>
              ) : (
                <>
                  <DetailItem icon={User} label="Full Name" value={person?.name} />
                  <DetailItem icon={User} label="Father Name" value={person?.fatherName} />
                  <DetailItem icon={Phone} label="Mobile Number" value={person?.mobileNumber} />
                  <DetailItem icon={FileDigit} label="CNIC" value={person?.cnic} />
                  <DetailItem icon={User} label="Relationship" value={person?.relation} />
                  <DetailItem icon={MapPin} label="Residential Address" value={person?.address} fullWidth />
                </>
              )}
            </div>
          </div>

          {/* Media */}
          <IdentityMediaSection
            fingerprintImage={person?.fingerprintImage}
            fingerprintCapturedAt={person?.fingerprintCapturedAt}
            liveImage={person?.liveImage}
            liveImageCapturedAt={person?.liveImageCapturedAt}
          />

        </div>
      </div>

    </section>
  );
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({ title, value, icon: Icon, iconClass, bgClass }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">
            {title}
          </p>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            {value}
          </p>
        </div>

        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${bgClass}`}>
          <Icon className={`w-5 h-5 ${iconClass}`} />
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
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  /* =========================================================
     FETCH CUSTOMER
  ========================================================= */

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        const response = await api.get(`/customers/${id}`);

        if (response.data && response.data.success) {
          const data = response.data.data;
          setCustomer(data);
        } else {
          setErrorMsg('Customer records missing.');
        }
      } catch (error) {
        setErrorMsg(
          error?.response?.data?.message || 'Failed to load profile record data.'
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
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 animate-pulse opacity-25" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
              <User className="w-7 h-7 text-blue-400 animate-pulse" />
            </div>
          </div>
          <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-slate-800">
            Loading Customer Profile
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Querying biometric fingerprint and personal records...
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
      <div className="max-w-3xl mx-auto py-16 px-4 animate-[pageEnter_0.3s_ease-out]">
        <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-black text-slate-900">
            Customer Profile Not Found
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {errorMsg || 'The requested customer record could not be loaded.'}
          </p>

          <Link
            to="/customers"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Customers Directory
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================================
     DATA
  ========================================================= */

  const totalPurchased = customer.totalPurchased || 0;
  const outstandingBalance = customer.outstandingBalance || 0;
  const totalSalesCount = customer.sales?.length || 0;
  const hasOverdue = customer.hasOverdue || false;

  const guarantor1 = customer.guarantor1 || {};
  const guarantor2 = customer.guarantor2 || {};

  /* =========================================================
     CREDIT STATUS
  ========================================================= */

  let creditStatus = {
    title: 'New Customer (No Prior History)',
    badgeColor: 'bg-blue-50/80 border-blue-200 text-blue-800',
    icon: Clock,
    description:
      'Yeh customer pehli baar dukan par aaya hai. Iska koi pichla karobari record nahi hai.',
  };

  if (totalSalesCount > 0) {
    if (outstandingBalance === 0) {
      creditStatus = {
        title: 'Record 100% Clean (All Dues Cleared)',
        badgeColor: 'bg-emerald-50/80 border-emerald-200 text-emerald-800',
        icon: ShieldCheck,
        description:
          'MashaAllah! Is customer ne purani saari kistein aur cash deals mukammal ada kar di hain. Koi rupiyah baqi nahi hai.',
      };
    } else if (hasOverdue) {
      creditStatus = {
        title: 'High Risk (Overdue Dues Pending)',
        badgeColor: 'bg-rose-50/80 border-rose-300 text-rose-800 font-black animate-pulse',
        icon: AlertTriangle,
        description:
          'Khabardar! Is customer ki pichli kiston mein se kist overdue ho chuki hai. Naya samaan dene se pehle pichle dues clear karein.',
      };
    } else {
      creditStatus = {
        title: 'Active Account (Dues on Schedule)',
        badgeColor: 'bg-indigo-50/80 border-indigo-200 text-indigo-800',
        icon: CheckCircle2,
        description:
          'Is customer ki kistein active hain aur time par jama ho rahi hain.',
      };
    }
  }

  const StatusIcon = creditStatus.icon;

  const printedDate = new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Karachi',
  }).format(new Date());

  /* =========================================================
     PRINT MEDIA COMPONENT
  ========================================================= */

  const renderPrintMedia = (person, personLabel) => {
    const fingerprintSrc = getFingerprintImage(person?.fingerprintImage);
    const photoSrc = getPhotoImage(person?.liveImage);

    return (
      <div className="print-media-column">
        {/* Fingerprint */}
        <div className="print-fingerprint-box">
          <div className="print-fingerprint-title">BIOMETRIC PRINT</div>
          {fingerprintSrc ? (
            <img src={fingerprintSrc} alt={`${personLabel} Fingerprint`} />
          ) : (
            <div className="print-no-fingerprint">No print stored</div>
          )}
          <small>{formatFingerprintDate(person?.fingerprintCapturedAt)}</small>
        </div>

        {/* Photo */}
        <div className="print-photo-box">
          <div className="print-photo-title">IDENTITY PHOTO</div>
          {photoSrc ? (
            <img src={photoSrc} alt={`${personLabel} Photo`} />
          ) : (
            <div className="print-no-photo">No photo stored</div>
          )}
          <small>{formatPhotoDate(person?.liveImageCapturedAt)}</small>
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
          NORMAL SCREEN VIEW
      ===================================================== */}
      <div className="space-y-6 max-w-6xl mx-auto font-sans print:hidden animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
        
        {/* DARK HERO HEADER */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">
          <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

          <div className="relative z-10 p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="flex items-center gap-3.5">
                <Link
                  to="/customers"
                  className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
                  title="Back to Customers Directory"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">
                      <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                      Verification Record
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[9px] font-bold text-slate-400">
                      ID: {customer.customerId || '—'}
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                    {customer.fullName || 'Customer Profile'}
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/40 transition-all hover:scale-[1.02] active:scale-95 shrink-0 self-start sm:self-auto"
              >
                <Printer className="w-4 h-4" />
                <span>Print Customer Slip</span>
              </button>

            </div>
          </div>
        </section>

        {/* CREDIT RISK STATUS BANNER */}
        <section
          className={`border rounded-3xl p-4 sm:p-5 ${creditStatus.badgeColor} shadow-sm`}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center shrink-0 border border-current shadow-sm">
              <StatusIcon className="w-5 h-5" />
            </div>

            <div>
              <h2 className="font-black text-sm sm:text-base">
                {creditStatus.title}
              </h2>
              <p className="text-xs mt-1 font-semibold opacity-95 leading-relaxed">
                {creditStatus.description}
              </p>
            </div>
          </div>
        </section>

        {/* CUSTOMER IDENTITY CARD */}
        <IdentityCard
          title="Customer Identification Details"
          subtitle="Primary customer biometrics, identity & photo verification"
          iconColor="text-blue-600"
          iconBg="bg-blue-50 border border-blue-100"
          person={customer}
          isCustomer
        />

        {/* ZAMANTI 1 (PRIMARY GUARANTOR) */}
        <IdentityCard
          title="Zamanti 1 (Primary Guarantor)"
          subtitle="First guarantor biometrics, identity & photo verification"
          iconColor="text-purple-600"
          iconBg="bg-purple-50 border border-purple-100"
          person={guarantor1}
        />

        {/* ZAMANTI 2 (SECONDARY GUARANTOR) */}
        <IdentityCard
          title="Zamanti 2 (Secondary Guarantor)"
          subtitle="Second guarantor biometrics, identity & photo verification"
          iconColor="text-amber-600"
          iconBg="bg-amber-50 border border-amber-100"
          person={guarantor2}
        />

        {/* ACCOUNT SUMMARY KPIS */}
        <section>
          <div className="flex items-center gap-2 mb-3.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-900">
              Account & Deal Summary
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Purchases"
              value={formatCurrency(
                totalPurchased,
                settings?.currency || 'PKR'
              )}
              icon={ShoppingBag}
              iconClass="text-blue-600"
              bgClass="bg-blue-50 border border-blue-100"
            />

            <SummaryCard
              title="Outstanding Balance"
              value={formatCurrency(
                outstandingBalance,
                settings?.currency || 'PKR'
              )}
              icon={Clock}
              iconClass="text-rose-600"
              bgClass="bg-rose-50 border border-rose-100"
            />

            <SummaryCard
              title="Recorded Deals"
              value={`${totalSalesCount} Deals`}
              icon={Receipt}
              iconClass="text-purple-600"
              bgClass="bg-purple-50 border border-purple-100"
            />

            <SummaryCard
              title="Account Standing"
              value={
                outstandingBalance === 0
                  ? 'All Clear'
                  : hasOverdue
                  ? 'Overdue Dues'
                  : 'Active Good'
              }
              icon={
                outstandingBalance === 0
                  ? ShieldCheck
                  : hasOverdue
                  ? AlertTriangle
                  : CheckCircle2
              }
              iconClass={
                outstandingBalance === 0
                  ? 'text-emerald-600'
                  : hasOverdue
                  ? 'text-rose-600'
                  : 'text-indigo-600'
              }
              bgClass={
                outstandingBalance === 0
                  ? 'bg-emerald-50 border border-emerald-100'
                  : hasOverdue
                  ? 'bg-rose-50 border border-rose-100'
                  : 'bg-indigo-50 border border-indigo-100'
              }
            />
          </div>
        </section>

        {/* INSTALLMENT PLANS */}
        <section className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Active & Completed Installment Plans
                </h2>
                <p className="text-[10px] text-slate-400">Customer financing records</p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-black">
              {customer.installmentPlans?.length || 0} Plans
            </span>
          </div>

          <div className="p-5 sm:p-6">
            {!customer.installmentPlans || customer.installmentPlans.length === 0 ? (
              <div className="text-center py-8 text-xs font-semibold text-slate-400">
                No active or past installment plans found.
              </div>
            ) : (
              <div className="space-y-3">
                {customer.installmentPlans.map((plan, index) => (
                  <div
                    key={plan._id || index}
                    className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-white hover:border-amber-200 transition-all"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                          Plan Duration
                        </p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">
                          {plan.duration ? `${plan.duration} Months Plan` : 'Installment Deal'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                          Total Amount
                        </p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">
                          {formatCurrency(plan.totalAmount, settings?.currency || 'PKR')}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                          Paid Amount
                        </p>
                        <p className="text-xs font-black text-emerald-600 mt-0.5">
                          {formatCurrency(plan.paidAmount, settings?.currency || 'PKR')}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                          Remaining Due
                        </p>
                        <p className="text-xs font-black text-rose-600 mt-0.5">
                          {formatCurrency(plan.remainingAmount, settings?.currency || 'PKR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* PAST PURCHASES HISTORY */}
        <section className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Past Purchases & Deals
                </h2>
                <p className="text-[10px] text-slate-400">All products purchased</p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-black">
              {customer.sales?.length || 0} Deals
            </span>
          </div>

          <div className="p-5 sm:p-6">
            {!customer.sales || customer.sales.length === 0 ? (
              <div className="text-center py-8 text-xs font-semibold text-slate-400">
                No past purchases recorded for this customer.
              </div>
            ) : (
              <div className="space-y-3">
                {customer.sales.map((sale, index) => (
                  <div
                    key={sale._id || index}
                    className="border border-slate-200 rounded-2xl p-4 hover:border-blue-200 transition-all"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div>
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                          Invoice ID
                        </p>
                        <p className="text-xs font-black text-indigo-600 mt-0.5">
                          {sale.saleId || sale.invoiceNumber || sale.invoiceNo || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                          Purchase Date
                        </p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">
                          {formatDate(sale.saleDate || sale.createdAt || sale.date)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                          Product
                        </p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                          {sale.product?.name || sale.productName || sale.itemName || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                          Deal Amount
                        </p>
                        <p className="text-xs font-black text-slate-900 mt-0.5">
                          {formatCurrency(
                            sale.finalTotal ?? sale.totalAmount ?? sale.salePrice ?? 0,
                            settings?.currency || 'PKR'
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                          Status
                        </p>
                        <span
                          className={`inline-flex mt-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                            sale.status === 'paid' || sale.paymentStatus === 'paid'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : sale.status === 'overdue'
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}
                        >
                          {sale.status || sale.paymentStatus || 'Recorded'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>

      {/* =====================================================
          ENHANCED PRINT SLIP
      ===================================================== */}
      <div className="customer-print-slip">
        
        {/* PRINT HEADER */}
        <div className="print-header">
          <div>
            <h1>{settings?.shopName || 'Electronics Shop'}</h1>
            <p>CUSTOMER & GUARANTOR VERIFICATION RECORD SLIP</p>
            {settings?.shopAddress && (
              <small>{settings.shopAddress} {settings.shopPhone ? `• Phone: ${settings.shopPhone}` : ''}</small>
            )}
          </div>

          <div className="print-date">
            <span>Customer ID: <strong>{customer.customerId || '—'}</strong></span>
            <span>Printed Date: {printedDate}</span>
          </div>
        </div>

        {/* CUSTOMER PRINT */}
        <div className="print-person">
          <div className="print-title">1. CUSTOMER PERSONAL IDENTIFICATION</div>
          <div className="print-content">
            <div className="print-details">
              <div>
                <span>Customer ID</span>
                <strong>{customer.customerId || 'N/A'}</strong>
              </div>
              <div>
                <span>Full Name</span>
                <strong>{customer.fullName || 'N/A'}</strong>
              </div>
              <div>
                <span>Father Name</span>
                <strong>{customer.fatherName || 'N/A'}</strong>
              </div>
              <div>
                <span>Mobile Number</span>
                <strong>{customer.mobileNumber || 'N/A'}</strong>
              </div>
              <div>
                <span>Alternate Mobile</span>
                <strong>{customer.alternateMobileNumber || 'N/A'}</strong>
              </div>
              <div>
                <span>CNIC Number</span>
                <strong>{customer.cnic || 'N/A'}</strong>
              </div>
              <div>
                <span>City / Area</span>
                <strong>{customer.city || 'N/A'}</strong>
              </div>
              <div>
                <span>Email Address</span>
                <strong>{customer.email || 'N/A'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span>Residential Address</span>
                <strong>{customer.address || 'N/A'}</strong>
              </div>
            </div>
            {renderPrintMedia(customer, 'Customer')}
          </div>
        </div>

        {/* ZAMANTI 1 PRINT */}
        <div className="print-person">
          <div className="print-title">2. ZAMANTI 1 (PRIMARY GUARANTOR)</div>
          <div className="print-content">
            <div className="print-details">
              <div>
                <span>Full Name</span>
                <strong>{guarantor1.name || 'N/A'}</strong>
              </div>
              <div>
                <span>Father Name</span>
                <strong>{guarantor1.fatherName || 'N/A'}</strong>
              </div>
              <div>
                <span>Mobile Number</span>
                <strong>{guarantor1.mobileNumber || 'N/A'}</strong>
              </div>
              <div>
                <span>CNIC Number</span>
                <strong>{guarantor1.cnic || 'N/A'}</strong>
              </div>
              <div>
                <span>Relationship</span>
                <strong>{guarantor1.relation || 'N/A'}</strong>
              </div>
              <div>
                <span>Residential Address</span>
                <strong>{guarantor1.address || 'N/A'}</strong>
              </div>
            </div>
            {renderPrintMedia(guarantor1, 'Zamanti 1')}
          </div>
        </div>

        {/* ZAMANTI 2 PRINT */}
        <div className="print-person">
          <div className="print-title">3. ZAMANTI 2 (SECONDARY GUARANTOR)</div>
          <div className="print-content">
            <div className="print-details">
              <div>
                <span>Full Name</span>
                <strong>{guarantor2.name || 'N/A'}</strong>
              </div>
              <div>
                <span>Father Name</span>
                <strong>{guarantor2.fatherName || 'N/A'}</strong>
              </div>
              <div>
                <span>Mobile Number</span>
                <strong>{guarantor2.mobileNumber || 'N/A'}</strong>
              </div>
              <div>
                <span>CNIC Number</span>
                <strong>{guarantor2.cnic || 'N/A'}</strong>
              </div>
              <div>
                <span>Relationship</span>
                <strong>{guarantor2.relation || 'N/A'}</strong>
              </div>
              <div>
                <span>Residential Address</span>
                <strong>{guarantor2.address || 'N/A'}</strong>
              </div>
            </div>
            {renderPrintMedia(guarantor2, 'Zamanti 2')}
          </div>
        </div>

        {/* SIGNATURES BLOCK */}
        <div className="print-signatures">
          <div className="signature-box">
            <div className="signature-line" />
            <p>Customer Signature & Thumb</p>
          </div>

          <div className="signature-box">
            <div className="signature-line" />
            <p>Guarantor 1 Signature</p>
          </div>

          <div className="signature-box">
            <div className="signature-line" />
            <p>Guarantor 2 Signature</p>
          </div>

          <div className="signature-box">
            <div className="signature-line" />
            <p>Authorized Shop Stamp</p>
          </div>
        </div>

        <div className="print-footer">
          Verified and printed from {settings?.shopName || 'Electronics Shop'} POS System.
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
            size: A4 portrait;
            margin: 6mm 8mm;
          }

          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            font-size: 8.5px !important;
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
            color: #000000;
            font-family: Arial, Helvetica, sans-serif;
          }

          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 5px;
            margin-bottom: 8px;
          }

          .print-header h1 {
            margin: 0;
            font-size: 14px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .print-header p {
            margin: 1px 0 0;
            font-size: 8px;
            font-weight: 700;
            color: #334155;
          }

          .print-header small {
            font-size: 7px;
            color: #64748b;
          }

          .print-date {
            font-size: 8px;
            color: #334155;
            text-align: right;
            display: flex;
            flex-direction: column;
            gap: 1px;
          }

          .print-person {
            border: 1px solid #94a3b8;
            border-radius: 4px;
            margin-bottom: 6px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .print-title {
            background: #f1f5f9;
            border-bottom: 1px solid #cbd5e1;
            padding: 3px 6px;
            font-size: 8.5px;
            font-weight: 900;
            color: #0f172a;
          }

          .print-content {
            display: grid;
            grid-template-columns: 1fr 190px;
            gap: 8px;
            padding: 5px 6px;
            align-items: start;
          }

          .print-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 12px;
            row-gap: 4px;
          }

          .print-details > div {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .print-details span {
            font-size: 6.5px;
            text-transform: uppercase;
            font-weight: 900;
            color: #64748b;
            margin-bottom: 0.5px;
          }

          .print-details strong {
            font-size: 8px;
            font-weight: 700;
            color: #000000;
            word-break: break-word;
          }

          .print-media-column {
            display: flex;
            align-items: flex-start;
            justify-content: flex-end;
            gap: 6px;
          }

          .print-fingerprint-box,
          .print-photo-box {
            width: 88px;
            min-height: 80px;
            border: 0.5px solid #94a3b8;
            border-radius: 3px;
            padding: 3px;
            text-align: center;
            background: #ffffff;
          }

          .print-fingerprint-title,
          .print-photo-title {
            font-size: 6.5px;
            font-weight: 900;
            color: #475569;
            margin-bottom: 2px;
          }

          .print-fingerprint-box img {
            display: block;
            width: 65px;
            height: 52px;
            object-fit: contain;
            margin: 0 auto 2px;
          }

          .print-photo-box img {
            display: block;
            width: 65px;
            height: 52px;
            object-fit: cover;
            border-radius: 2px;
            margin: 0 auto 2px;
          }

          .print-fingerprint-box small,
          .print-photo-box small {
            display: block;
            font-size: 5.5px;
            line-height: 1.1;
            color: #64748b;
          }

          .print-no-fingerprint,
          .print-no-photo {
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 6.5px;
            color: #94a3b8;
          }

          .print-signatures {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-top: 14px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .signature-box {
            text-align: center;
          }

          .signature-line {
            border-top: 1px solid #0f172a;
            margin-bottom: 3px;
          }

          .signature-box p {
            font-size: 7px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }

          .print-footer {
            margin-top: 8px;
            padding-top: 4px;
            border-top: 0.5px solid #cbd5e1;
            font-size: 6.5px;
            color: #64748b;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
};

export default CustomerProfile;