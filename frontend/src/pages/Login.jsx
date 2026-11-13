import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  ArrowRight,
  Package,
  BarChart3,
  ShieldCheck,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  MessageCircle,
  Bot,
  Store,
  Copy,
  Check,
  X,
  UserRound,
  Download,
} from 'lucide-react';
import api from '../utils/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [openingDemo, setOpeningDemo] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [demoResult, setDemoResult] = useState(null);
  const [demoOtp, setDemoOtp] = useState('');
  const [demoOtpSent, setDemoOtpSent] = useState(false);
  const [demoOtpResendSeconds, setDemoOtpResendSeconds] = useState(0);
  const [demoVerificationToken, setDemoVerificationToken] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [demoForm, setDemoForm] = useState({ shopName: '', ownerName: '', email: '', phone: '', website: '' });

  // =====================================================
  // SUSPENSION STATE
  // =====================================================

  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');

  const {
    login,
    sessionMessage,
    suspensionReason: authSuspensionReason,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (demoOtpResendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setDemoOtpResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [demoOtpResendSeconds]);

  const handleResendDemoOtp = async () => {
    setDemoError('');
    setDemoLoading(true);
    try {
      await api.post('/api/auth/demo/send-otp', { email: demoForm.email, website: demoForm.website });
      setDemoOtp('');
      setDemoVerificationToken('');
      setDemoOtpResendSeconds(60);
      setDemoError('A new verification code was sent. Check your inbox.');
    } catch (error) {
      setDemoError(error.response?.data?.message || 'Could not send a new code. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleDemoSubmit = async (event) => {
    event.preventDefault();
    setDemoError('');
    setDemoLoading(true);
    try {
      if (!demoOtpSent) {
        await api.post('/api/auth/demo/send-otp', { email: demoForm.email, website: demoForm.website });
        setDemoOtpSent(true);
        setDemoOtpResendSeconds(60);
        setDemoError('Verification code sent. Check your inbox and enter the code below.');
        return;
      }
      if (!demoVerificationToken) {
        const verified = await api.post('/api/auth/demo/verify-otp', { email: demoForm.email, otp: demoOtp });
        const token = verified.data.verificationToken;
        setDemoVerificationToken(token);
        const response = await api.post('/api/auth/demo', { ...demoForm, verificationToken: token });
        setDemoResult(response.data.data);
        setEmail(response.data.data.email);
        setPassword(response.data.data.temporaryPassword);
        setDemoError('');
        return;
      }
      const response = await api.post('/api/auth/demo', { ...demoForm, verificationToken: demoVerificationToken });
      setDemoResult(response.data.data);
      setEmail(response.data.data.email);
      setPassword(response.data.data.temporaryPassword);
    } catch (error) {
      setDemoError(error.response?.data?.message || 'Demo setup failed. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleContinueDemo = async () => {
    if (!demoResult) return;
    setOpeningDemo(true);
    setDemoError('');
    const result = await login(demoResult.email, demoResult.temporaryPassword);
    if (result.success) {
      setDemoOpen(false);
      navigate('/change-password', { replace: true });
    } else {
      setDemoError(result.message || 'Could not open your demo. Use the displayed credentials to sign in.');
    }
    setOpeningDemo(false);
  };

  const copyDemoValue = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(''), 1800);
    } catch {
      setDemoError('Copy was unavailable. Select and copy the credential manually.');
    }
  };

  // Show why a server-revoked session was sent back to login.
  useEffect(() => {
    if (!sessionMessage) return;

    setErrorMsg(sessionMessage);

    if (sessionMessage.toLowerCase().includes('suspend')) {
      setIsSuspended(true);
      setSuspensionReason(authSuspensionReason || '');
    }
  }, [sessionMessage, authSuspensionReason]);

  // =====================================================
  // WHATSAPP SUPPORT
  // =====================================================

  const whatsappNumber = '923046564699';

  const getWhatsappLink = () => {
    let message;

    if (isSuspended) {
      message =
        `Hello, my POS account has been suspended.\n\n` +
        `Account Email: ${email.trim() || 'Not provided'}\n\n` +
        `Suspension Reason: ${
          suspensionReason || 'No reason provided'
        }\n\n` +
        `Please help me resolve this issue and reactivate my account.`;
    } else {
      message =
        'Hello, I need help with the POS system.';
    }

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      message
    )}`;
  };

  // =====================================================
  // LOGIN SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMsg('');
    setIsSuspended(false);
    setSuspensionReason('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);

      // =================================================
      // LOGIN SUCCESS
      // =================================================

      if (result.success) {

        // -----------------------------------------------
        // TEMPORARY PASSWORD / FIRST LOGIN
        // -----------------------------------------------
        //
        // New shops and shops whose password was reset
        // by Super Admin must change their password before
        // accessing the dashboard.
        //
        // We check both locations for compatibility:
        //
        // result.mustChangePassword
        // result.data.mustChangePassword
        // -----------------------------------------------

        if (
          result.mustChangePassword ||
          result.data?.mustChangePassword
        ) {
          navigate(
            '/change-password',
            {
              replace: true,
            }
          );

          return;
        }

        // -----------------------------------------------
        // NORMAL LOGIN
        // -----------------------------------------------

        navigate(
          '/dashboard',
          {
            replace: true,
          }
        );

        return;
      }

      // =================================================
      // LOGIN FAILED
      // =================================================

      setErrorMsg(
        result.message ||
          'Invalid email or password.'
      );

      // =================================================
      // SUSPENDED ACCOUNT
      // =================================================

      if (result.accountSuspended) {
        setIsSuspended(true);

        setSuspensionReason(
          result.suspensionReason ||
            'No suspension reason was provided.'
        );
      }

    } catch (err) {
      setErrorMsg(
        'An unexpected connection error occurred.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060913] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">

      {/* =====================================================
          AMBIENT 3D BACKGROUND GLOWS
      ====================================================== */}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#0d152a_0%,#080d1b_45%,#04060d_100%)]" />

      <div className="pointer-events-none absolute -top-48 -left-48 w-[650px] h-[650px] rounded-full bg-blue-600/15 blur-[140px] animate-pulse" />

      <div className="pointer-events-none absolute -bottom-52 -right-48 w-[700px] h-[700px] rounded-full bg-violet-600/15 blur-[150px]" />

      <div className="pointer-events-none absolute top-[30%] left-[30%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[140px]" />

      {/* =====================================================
          3D PERSPECTIVE GRID
      ====================================================== */}

      <div
        className="pointer-events-none absolute left-[-20%] right-[-20%] bottom-[-15%] h-[60%] opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.25) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: 'perspective(600px) rotateX(60deg)',
          transformOrigin: 'center bottom',
          maskImage:
            'linear-gradient(to top, black 0%, transparent 90%)',
          WebkitMaskImage:
            'linear-gradient(to top, black 0%, transparent 90%)',
        }}
      />

      {/* =====================================================
          MAIN LOGIN CARD
      ====================================================== */}

      <div className="relative z-10 w-full max-w-[1050px] min-h-[580px] lg:h-[640px] bg-white rounded-3xl overflow-hidden shadow-2xl shadow-blue-950/40 border border-white/20 flex flex-col lg:flex-row">

        {/* =====================================================
            LEFT BRANDING
        ====================================================== */}

        <div className="hidden lg:flex relative w-[46%] bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white p-10 flex-col justify-between overflow-hidden border-r border-white/[0.08]">

          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />

          <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl" />

          {/* Top Brand */}

          <div className="relative z-10">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-blue-950/50">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div>

                <p className="text-sm font-black tracking-tight text-white">
                  ELECTRONICS POS
                </p>

                <div className="flex items-center gap-2 mt-0.5">

                  <span className="relative flex w-2 h-2">

                    <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-70 animate-ping" />

                    <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />

                  </span>

                  <span className="text-[9px] uppercase tracking-[0.16em] font-black text-slate-400">
                    Admin System
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* Middle */}

          <div className="relative z-10 my-auto py-6">

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300 mb-3">

              <Sparkles className="w-3 h-3 text-blue-400" />

              Management Portal

            </div>

            <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">

              Manage your <br />

              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                business
              </span>{' '}

              <br />

              smarter & faster.

            </h2>

            <p className="mt-4 text-xs text-slate-400 font-medium leading-relaxed max-w-sm">
              Real-time monitoring of Cash Sales, Installments
              Financing, Inventory Stock and Customer Ledgers.
            </p>

            {/* Feature Pills */}

            <div className="flex flex-wrap gap-2.5 mt-6">

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">

                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />

                <span className="text-[11px] font-bold text-slate-300">
                  Live Analytics
                </span>

              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">

                <Package className="w-3.5 h-3.5 text-indigo-400" />

                <span className="text-[11px] font-bold text-slate-300">
                  Smart Stock
                </span>

              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">

                <Layers className="w-3.5 h-3.5 text-violet-400" />

                <span className="text-[11px] font-bold text-slate-300">
                  Financing Dues
                </span>

              </div>

            </div>

          </div>

          {/* Footer */}

          <div className="relative z-10 flex items-center justify-between text-[10px] font-bold text-slate-500 border-t border-white/[0.06] pt-4">

            <span>
              Secure Enterprise Authentication
            </span>

            <span>
              v3.5 Live
            </span>

          </div>

        </div>

        {/* =====================================================
            RIGHT LOGIN FORM
        ====================================================== */}

        <div className="w-full lg:w-[54%] flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-white">

          <div className="w-full max-w-[400px]">

            {/* Mobile Branding */}

            <div className="lg:hidden text-center mb-6">

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-blue-950/20 mx-auto mb-2.5">

                <ShieldCheck className="w-6 h-6" />

              </div>

              <h2 className="text-lg font-black text-slate-900">
                Electronics Shop POS
              </h2>

              <p className="text-xs text-slate-400">
                Admin Console Access
              </p>

            </div>

            {/* Heading */}

            <div className="mb-7">

              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                Admin Console
              </span>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-2">
                Welcome back
              </h2>

              <p className="text-xs text-slate-400 font-semibold mt-1">
                Enter your authorized credentials to access
                management dashboard.
              </p>

            </div>

            {/* =================================================
                ERROR / SUSPENSION MESSAGE
            ================================================== */}

            {errorMsg && (

              <div
                className={`mb-5 rounded-2xl p-3.5 flex items-start gap-2.5 animate-[pageEnter_0.2s_ease-out] ${
                  isSuspended
                    ? 'bg-amber-50 border border-amber-200 text-amber-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >

                <AlertCircle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isSuspended
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                />

                <div className="min-w-0">

                  <span className="text-xs font-bold leading-snug block">
                    {errorMsg}
                  </span>

                  {isSuspended &&
                    suspensionReason && (

                    <div className="mt-2 pt-2 border-t border-amber-200/70">

                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">
                        Suspension Reason
                      </p>

                      <p className="text-[11px] font-semibold leading-relaxed text-amber-800">
                        {suspensionReason}
                      </p>

                    </div>

                  )}

                </div>

              </div>

            )}

            {/* =================================================
                LOGIN FORM
            ================================================== */}

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* Email */}

              <div className="space-y-1.5">

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Email Address
                </label>

                <div className="relative group">

                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">

                    <Mail className="w-4 h-4" />

                  </div>

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);

                      if (isSuspended) {
                        setIsSuspended(false);
                        setSuspensionReason('');
                      }
                    }}
                    placeholder="admin@shop.com"
                    className="w-full h-11 pl-11 pr-4 border border-slate-200 rounded-xl bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />

                </div>

              </div>

              {/* Password */}

              <div className="space-y-1.5">

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Password
                </label>

                <div className="relative group">

                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">

                    <Lock className="w-4 h-4" />

                  </div>

                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="••••••••"
                    className="w-full h-11 pl-11 pr-11 border border-slate-200 rounded-xl bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (visible) => !visible
                      )
                    }
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 transition-colors hover:text-blue-600"
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    title={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >

                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}

                  </button>

                </div>

              </div>

              {/* Sign In */}

              <div className="pt-2">

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >

                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />

                      <span>
                        Authenticating Credentials...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Sign In to Admin Console
                      </span>

                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}

                </button>

              </div>

            </form>

            {!isSuspended && (
              <button
                type="button"
                onClick={() => { setDemoOpen(true); setDemoError(''); }}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 text-xs font-black text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 active:scale-[0.99]"
              >
                <Bot className="h-4 w-4" />
                {demoResult ? 'View your demo login' : 'Chat with us · Start a free demo'}
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/downloads')}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 active:scale-[0.99]"
            >
              <Download className="h-4 w-4" /> Download Android or PC app
            </button>

            {/* =================================================
                WHATSAPP SUPPORT
            ================================================== */}

            <div className="mt-6">

              <a
                href={getWhatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={`group w-full h-11 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 ${
                  isSuspended
                    ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700'
                    : 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700'
                }`}
              >

                {isSuspended ? (
                  <AlertCircle className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                ) : (
                  <MessageCircle className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                )}

                <span>
                  {isSuspended
                    ? 'Contact Support About Suspension'
                    : 'Need Help? Contact Support on WhatsApp'}
                </span>

              </a>

              <p className="text-center text-[9px] text-slate-400 font-semibold mt-2">

                {isSuspended
                  ? 'Your email and suspension reason will be included automatically'
                  : 'Direct support available via WhatsApp'}

              </p>

            </div>

            {/* =================================================
                FOOTER
            ================================================== */}

            <div className="mt-7 pt-5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">

              <span>
                Secure Session Guard
              </span>

              <span>
                © {new Date().getFullYear()} POS Hub
              </span>

            </div>

          </div>

        </div>

      </div>

      {demoOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center overflow-y-auto bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setDemoOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-chat-title"
            onClick={(event) => event.stopPropagation()}
            className="my-auto max-h-[95dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200"><Bot className="h-5 w-5" /></div>
                <div>
                  <h2 id="demo-chat-title" className="text-lg font-black text-slate-900">Shop demo assistant</h2>
                  <p className="text-xs font-semibold text-emerald-600">Ready to set up your 7-day demo</p>
                </div>
              </div>
              <button type="button" onClick={() => setDemoOpen(false)} aria-label="Close demo assistant" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>

            <div className="mb-5 flex items-start gap-2.5 rounded-2xl rounded-tl-md bg-slate-100 p-3.5 text-sm leading-relaxed text-slate-700">
              <Bot className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <p>{demoResult ? `Your ${demoResult.shopName} demo is ready. Save these temporary login details, then continue to choose your own password.` : 'Welcome! I can create a private 7-day demo shop for you. Tell me a little about your shop to get started.'}</p>
            </div>

            {demoError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">{demoError}</p>}
            {!demoResult ? (
              <form onSubmit={handleDemoSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="demo-shop-name" className="mb-1.5 block text-xs font-bold text-slate-600">What is your shop called?</label>
                  <div className="relative"><Store className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input id="demo-shop-name" required minLength={2} maxLength={100} autoComplete="organization" value={demoForm.shopName} onChange={(event) => setDemoForm({ ...demoForm, shopName: event.target.value })} placeholder="e.g. City Electronics" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></div>
                </div>
                <div>
                  <label htmlFor="demo-owner-name" className="mb-1.5 block text-xs font-bold text-slate-600">What should we call you?</label>
                  <div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input id="demo-owner-name" required minLength={2} maxLength={100} autoComplete="name" value={demoForm.ownerName} onChange={(event) => setDemoForm({ ...demoForm, ownerName: event.target.value })} placeholder="Your name" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></div>
                </div>
                <div>
                  <label htmlFor="demo-email" className="mb-1.5 block text-xs font-bold text-slate-600">Which email will you use to sign in?</label>
                  <div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input id="demo-email" type="email" required maxLength={254} autoComplete="email" value={demoForm.email} onChange={(event) => { setDemoForm({ ...demoForm, email: event.target.value }); setDemoError(''); setDemoOtpSent(false); setDemoOtpResendSeconds(0); setDemoOtp(''); setDemoVerificationToken(''); }} placeholder="you@example.com" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></div>
                </div>
                {demoOtpSent && <div>
                  <label htmlFor="demo-email-otp" className="mb-1.5 block text-xs font-bold text-slate-600">Email verification code</label>
                  <input id="demo-email-otp" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={demoOtp} onChange={(event) => setDemoOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-lg font-bold tracking-[0.4em] text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                  <button type="button" onClick={handleResendDemoOtp} disabled={demoLoading || demoOtpResendSeconds > 0} className="mt-2 text-xs font-bold text-indigo-700 transition hover:text-indigo-900 disabled:cursor-not-allowed disabled:text-slate-400">
                    {demoOtpResendSeconds > 0 ? `Request new code in ${demoOtpResendSeconds}s` : 'Request new code'}
                  </button>
                </div>}
                <div>
                  <label htmlFor="demo-phone" className="mb-1.5 block text-xs font-bold text-slate-600">Phone number <span className="font-medium text-rose-600">(required)</span></label>
                  <input id="demo-phone" type="tel" required minLength={7} maxLength={30} autoComplete="tel" value={demoForm.phone} onChange={(event) => setDemoForm({ ...demoForm, phone: event.target.value })} placeholder="+92 300 1234567" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                  <p className="mt-1 text-[11px] text-slate-500">Enter a real number where we can reach you if needed.</p>
                </div>
                <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"><label htmlFor="demo-website">Website</label><input id="demo-website" tabIndex={-1} autoComplete="off" value={demoForm.website} onChange={(event) => setDemoForm({ ...demoForm, website: event.target.value })} /></div>
                <button type="submit" disabled={demoLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
                  {demoLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</> : <>{!demoOtpSent ? 'Send email verification code' : !demoVerificationToken ? 'Verify email code' : 'Create my free demo'} <ArrowRight className="h-4 w-4" /></>}
                </button>
                <p className="text-center text-[11px] leading-relaxed text-slate-400">7 days free · No payment details needed</p>
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-[11px] font-semibold leading-relaxed text-amber-900">
                  Demo access ends after 7 days. Contact the administrator to activate your account. Monthly charge: <strong>Rs. 2,500/month</strong>. For a concession, please contact the administrator.
                </p>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-800">Your temporary login</p>
                  {[['Email', demoResult.email], ['Temporary password', demoResult.temporaryPassword]].map(([label, value]) => (
                    <div key={label} className="mt-3">
                      <p className="mb-1 text-[11px] font-bold text-emerald-800">{label}</p>
                      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-emerald-200 bg-white p-2.5">
                        <code className="min-w-0 flex-1 break-all text-xs font-bold text-slate-800">{value}</code>
                        <button type="button" onClick={() => copyDemoValue(label, value)} aria-label={`Copy ${label}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50">{copiedField === label ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
                      </div>
                    </div>
                  ))}
                  <p className="mt-3 text-[11px] leading-relaxed text-emerald-900">Save the password now. It is shown only in this assistant and is not emailed. Your demo expires {new Date(demoResult.expiresAt).toLocaleDateString()}.</p>
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold leading-relaxed text-amber-900">
                    After the 7-day demo, access will end. Contact the administrator to activate your account. Monthly charge: <strong>Rs. 2,500/month</strong>. For a concession, please contact the administrator.
                  </p>
                </div>
                <button type="button" onClick={handleContinueDemo} disabled={openingDemo} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60">
                  {openingDemo ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening your demo…</> : <>Continue to choose your password <ArrowRight className="h-4 w-4" /></>}
                </button>
                <p className="text-center text-[11px] leading-relaxed text-slate-500">Next, you will set a new password before entering your shop.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* =====================================================
          INVISIBLE SUPER ADMIN ACCESS
      ====================================================== */}

      <div className="absolute bottom-1 right-1 z-[9999] w-8 h-8">

        <button
          type="button"
          onClick={() =>
            navigate('/super-admin/login')
          }
          aria-label="Super Admin Access"
          className="w-full h-full opacity-0 border-0 outline-none bg-transparent p-0 m-0 cursor-default"
        />

      </div>

    </div>
  );
};

export default Login;
