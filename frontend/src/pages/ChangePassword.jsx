import React, { useEffect, useState } from 'react';
import {
  useNavigate,
} from 'react-router-dom';

import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogOut,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const ChangePassword = () => {
  const {
    admin,
    changePassword,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  const [newPassword, setNewPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [errorMsg, setErrorMsg] =
    useState('');

  const [successMsg, setSuccessMsg] =
    useState('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  // =====================================================
  // IF PASSWORD CHANGE IS NO LONGER REQUIRED
  // =====================================================

  useEffect(() => {
    if (
      admin &&
      !admin.mustChangePassword
    ) {
      navigate(
        '/dashboard',
        {
          replace: true,
        }
      );
    }
  }, [
    admin,
    navigate,
  ]);

  // =====================================================
  // PASSWORD STRENGTH
  // =====================================================

  const passwordLength =
    newPassword.length;

  const hasMinLength =
    passwordLength >= 6;

  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMsg('');
    setSuccessMsg('');

    // ---------------------------------------------------
    // BASIC VALIDATION
    // ---------------------------------------------------

    if (!newPassword.trim()) {
      setErrorMsg(
        'Please enter a new password.'
      );

      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg(
        'Password must contain at least 6 characters.'
      );

      return;
    }

    if (!confirmPassword.trim()) {
      setErrorMsg(
        'Please confirm your new password.'
      );

      return;
    }

    if (
      newPassword !== confirmPassword
    ) {
      setErrorMsg(
        'New password and confirm password do not match.'
      );

      return;
    }

    // ---------------------------------------------------
    // SUBMIT
    // ---------------------------------------------------

    setIsSubmitting(true);

    try {
      const result =
        await changePassword(
          newPassword,
          confirmPassword
        );

      if (result.success) {
        setSuccessMsg(
          result.message ||
            'Password changed successfully.'
        );

        setNewPassword('');
        setConfirmPassword('');

        // Small delay so user can see success state
        setTimeout(() => {
          navigate(
            '/dashboard',
            {
              replace: true,
            }
          );
        }, 700);

        return;
      }

      if (
        result.accountSuspended
      ) {
        setErrorMsg(
          result.message ||
            'Your shop account has been suspended.'
        );

        return;
      }

      setErrorMsg(
        result.message ||
          'Unable to change password. Please try again.'
      );

    } catch (error) {
      console.error(
        'Change password error:',
        error
      );

      setErrorMsg(
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    await logout();

    navigate(
      '/login',
      {
        replace: true,
      }
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060913] flex items-center justify-center p-4 sm:p-6 lg:p-8">

      {/* =================================================
          AMBIENT BACKGROUND
      ================================================== */}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#0d152a_0%,#080d1b_45%,#04060d_100%)]" />

      <div className="pointer-events-none absolute -top-48 -left-48 w-[650px] h-[650px] rounded-full bg-blue-600/15 blur-[140px] animate-pulse" />

      <div className="pointer-events-none absolute -bottom-52 -right-48 w-[700px] h-[700px] rounded-full bg-violet-600/15 blur-[150px]" />

      <div className="pointer-events-none absolute top-[30%] left-[30%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[140px]" />

      {/* =================================================
          3D GRID
      ================================================== */}

      <div
        className="pointer-events-none absolute left-[-20%] right-[-20%] bottom-[-15%] h-[60%] opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.25) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform:
            'perspective(600px) rotateX(60deg)',
          transformOrigin:
            'center bottom',
          maskImage:
            'linear-gradient(to top, black 0%, transparent 90%)',
          WebkitMaskImage:
            'linear-gradient(to top, black 0%, transparent 90%)',
        }}
      />

      {/* =================================================
          MAIN CARD
      ================================================== */}

      <div className="relative z-10 w-full max-w-[900px] bg-white rounded-3xl overflow-hidden shadow-2xl shadow-blue-950/40 border border-white/20 flex flex-col lg:flex-row">

        {/* =================================================
            LEFT INFORMATION PANEL
        ================================================== */}

        <div className="hidden lg:flex relative w-[42%] bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white p-10 flex-col justify-between overflow-hidden border-r border-white/[0.08]">

          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />

          <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl" />

          {/* Brand */}

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
                    Secure Admin System
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* Main Info */}

          <div className="relative z-10 my-auto py-10">

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300 mb-4">

              <KeyRound className="w-3 h-3 text-blue-400" />

              Security Required

            </div>

            <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">

              Secure your <br />

              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                account
              </span>

              <br />

              before continuing.

            </h2>

            <p className="mt-5 text-xs text-slate-400 font-medium leading-relaxed max-w-sm">
              Your current password is temporary.
              Please create a new secure password
              before accessing your shop dashboard.
            </p>

            {/* Security Points */}

            <div className="space-y-3 mt-7">

              <div className="flex items-center gap-3">

                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center">

                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />

                </div>

                <span className="text-[11px] font-bold text-slate-300">
                  Minimum 6 characters
                </span>

              </div>

              <div className="flex items-center gap-3">

                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">

                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />

                </div>

                <span className="text-[11px] font-bold text-slate-300">
                  Secure password protection
                </span>

              </div>

              <div className="flex items-center gap-3">

                <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-400/20 flex items-center justify-center">

                  <Lock className="w-3.5 h-3.5 text-violet-400" />

                </div>

                <span className="text-[11px] font-bold text-slate-300">
                  Required before dashboard access
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

        {/* =================================================
            RIGHT FORM
        ================================================== */}

        <div className="w-full lg:w-[58%] flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-white">

          <div className="w-full max-w-[400px]">

            {/* Mobile Branding */}

            <div className="lg:hidden text-center mb-7">

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-blue-950/20 mx-auto mb-2.5">

                <ShieldCheck className="w-6 h-6" />

              </div>

              <h2 className="text-lg font-black text-slate-900">
                Electronics Shop POS
              </h2>

              <p className="text-xs text-slate-400">
                Secure Password Setup
              </p>

            </div>

            {/* Heading */}

            <div className="mb-7">

              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                Security Setup
              </span>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-2">
                Create new password
              </h1>

              <p className="text-xs text-slate-400 font-semibold mt-1 leading-relaxed">
                Your temporary password must be replaced
                before you can access the dashboard.
              </p>

            </div>

            {/* =================================================
                ADMIN EMAIL
            ================================================== */}

            {admin?.email && (

              <div className="mb-5 flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">

                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">

                  <MailIcon />

                </div>

                <div className="min-w-0">

                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Account
                  </p>

                  <p className="text-xs font-bold text-slate-700 truncate">
                    {admin.email}
                  </p>

                </div>

              </div>

            )}

            {/* =================================================
                ERROR MESSAGE
            ================================================== */}

            {errorMsg && (

              <div className="mb-5 rounded-2xl p-3.5 flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-800">

                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />

                <span className="text-xs font-bold leading-snug">
                  {errorMsg}
                </span>

              </div>

            )}

            {/* =================================================
                SUCCESS MESSAGE
            ================================================== */}

            {successMsg && (

              <div className="mb-5 rounded-2xl p-3.5 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800">

                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />

                <span className="text-xs font-bold leading-snug">
                  {successMsg}
                </span>

              </div>

            )}

            {/* =================================================
                FORM
            ================================================== */}

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* New Password */}

              <div className="space-y-1.5">

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  New Password
                </label>

                <div className="relative group">

                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">

                    <Lock className="w-4 h-4" />

                  </div>

                  <input
                    type={
                      showNewPassword
                        ? 'text'
                        : 'password'
                    }
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(
                        e.target.value
                      );

                      setErrorMsg('');
                    }}
                    placeholder="Enter new password"
                    className="w-full h-11 pl-11 pr-11 border border-slate-200 rounded-xl bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(
                        (visible) => !visible
                      )
                    }
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 transition-colors hover:text-blue-600"
                    aria-label={
                      showNewPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >

                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}

                  </button>

                </div>

                {/* Password requirement */}

                <div className="flex items-center justify-between px-1 pt-0.5">

                  <span
                    className={`text-[9px] font-bold ${
                      newPassword.length === 0
                        ? 'text-slate-400'
                        : hasMinLength
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {newPassword.length === 0
                      ? 'Minimum 6 characters'
                      : hasMinLength
                      ? '✓ Password length is valid'
                      : `${6 - newPassword.length} more character${
                          6 - newPassword.length === 1
                            ? ''
                            : 's'
                        } required`}
                  </span>

                </div>

              </div>

              {/* Confirm Password */}

              <div className="space-y-1.5">

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Confirm New Password
                </label>

                <div className="relative group">

                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">

                    <Lock className="w-4 h-4" />

                  </div>

                  <input
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(
                        e.target.value
                      );

                      setErrorMsg('');
                    }}
                    placeholder="Re-enter new password"
                    className={`w-full h-11 pl-11 pr-11 border rounded-xl bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:ring-4 transition-all ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10'
                          : 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (visible) => !visible
                      )
                    }
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 transition-colors hover:text-blue-600"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >

                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}

                  </button>

                </div>

                {confirmPassword.length > 0 && (

                  <div className="px-1 pt-0.5">

                    <span
                      className={`text-[9px] font-bold ${
                        passwordsMatch
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {passwordsMatch
                        ? '✓ Passwords match'
                        : '✕ Passwords do not match'}
                    </span>

                  </div>

                )}

              </div>

              {/* =================================================
                  CHANGE PASSWORD BUTTON
              ================================================== */}

              <div className="pt-2">

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >

                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />

                      <span>
                        Updating Password...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Set New Password
                      </span>

                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}

                </button>

              </div>

            </form>

            {/* =================================================
                SECURITY NOTE
            ================================================== */}

            <div className="mt-6 p-3.5 rounded-xl bg-blue-50 border border-blue-100">

              <div className="flex items-start gap-2.5">

                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />

                <div>

                  <p className="text-[10px] font-black text-blue-800">
                    Your account is protected
                  </p>

                  <p className="text-[9px] font-semibold text-blue-600/80 leading-relaxed mt-0.5">
                    Choose a password that is difficult
                    for others to guess and keep it private.
                  </p>

                </div>

              </div>

            </div>

            {/* =================================================
                LOGOUT
            ================================================== */}

            <button
              type="button"
              onClick={handleLogout}
              disabled={isSubmitting}
              className="w-full mt-4 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-[10px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >

              <LogOut className="w-3.5 h-3.5" />

              Sign out and use another account

            </button>

            {/* =================================================
                FOOTER
            ================================================== */}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400">

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

    </div>
  );
};

// =====================================================
// SMALL EMAIL ICON COMPONENT
// =====================================================

const MailIcon = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-4 h-4 text-blue-600"
      aria-hidden="true"
    >
      <rect
        width="20"
        height="16"
        x="2"
        y="4"
        rx="2"
      />

      <path d="m22 7-8.97 5.7a2 2 0 0 1-2.06 0L2 7" />
    </svg>
  );
};

export default ChangePassword;