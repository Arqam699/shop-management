import React, { useState } from 'react';
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
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  Layers,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        navigate('/dashboard');
      } else {
        setErrorMsg(result.message || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMsg('An unexpected connection error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060913] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">

      {/* =====================================================
          AMBIENT 3D BACKGROUND GLOWS (Matching Layout Theme)
      ====================================================== */}

      {/* Main radial depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#0d152a_0%,#080d1b_45%,#04060d_100%)]" />

      {/* Blue glow - top left */}
      <div className="pointer-events-none absolute -top-48 -left-48 w-[650px] h-[650px] rounded-full bg-blue-600/15 blur-[140px] animate-pulse" />

      {/* Violet glow - bottom right */}
      <div className="pointer-events-none absolute -bottom-52 -right-48 w-[700px] h-[700px] rounded-full bg-violet-600/15 blur-[150px]" />

      {/* Center ambient glow */}
      <div className="pointer-events-none absolute top-[30%] left-[30%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[140px]" />

      {/* 3D Perspective Grid */}
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
          maskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
        }}
      />

      {/* =====================================================
          MAIN LOGIN CARD CONTAINER
      ====================================================== */}
      <div className="relative z-10 w-full max-w-[1050px] min-h-[580px] lg:h-[640px] bg-white rounded-3xl overflow-hidden shadow-2xl shadow-blue-950/40 border border-white/20 flex flex-col lg:flex-row">

        {/* =====================================================
            LEFT BRANDING HERO SECTION
        ====================================================== */}
        <div className="hidden lg:flex relative w-[46%] bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] text-white p-10 flex-col justify-between overflow-hidden border-r border-white/[0.08]">
          
          {/* Internal Glows */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl" />

          {/* Top Brand Block */}
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

          {/* Middle Heading Block */}
          <div className="relative z-10 my-auto py-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300 mb-3">
              <Sparkles className="w-3 h-3 text-blue-400" />
              Management Portal
            </div>

            <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">
              Manage your <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                business
              </span> <br />
              smarter & faster.
            </h2>

            <p className="mt-4 text-xs text-slate-400 font-medium leading-relaxed max-w-sm">
              Real-time monitoring of Cash Sales, Installments Financing, Inventory Stock and Customer Ledgers.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2.5 mt-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-bold text-slate-300">Live Analytics</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-bold text-slate-300">Smart Stock</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[11px] font-bold text-slate-300">Financing Dues</span>
              </div>
            </div>
          </div>

          {/* Bottom Footer Note */}
          <div className="relative z-10 flex items-center justify-between text-[10px] font-bold text-slate-500 border-t border-white/[0.06] pt-4">
            <span>Secure Enterprise Authentication</span>
            <span>v3.5 Live</span>
          </div>
        </div>

        {/* =====================================================
            RIGHT LOGIN FORM SECTION
        ====================================================== */}
        <div className="w-full lg:w-[54%] flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-white">
          <div className="w-full max-w-[400px]">

            {/* Mobile Branding */}
            <div className="lg:hidden text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-blue-950/20 mx-auto mb-2.5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Electronics Shop POS</h2>
              <p className="text-xs text-slate-400">Admin Console Access</p>
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
                Enter your authorized credentials to access management dashboard.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-5 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-rose-800 animate-[pageEnter_0.2s_ease-out]">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="text-xs font-bold leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Address */}
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
                    onChange={(e) => setEmail(e.target.value)}
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
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-11 pr-4 border border-slate-200 rounded-xl bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Sign In Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Admin Console</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* Footer */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>Secure Session Guard</span>
              <span>© {new Date().getFullYear()} POS Hub</span>
            </div>

          </div>
        </div>

      </div>

      {/* =====================================================
          INVISIBLE SUPER ADMIN ACCESS TRIGGER
          (Bottom-Right Secret Access)
      ====================================================== */}
      <div className="absolute bottom-1 right-1 z-[9999] w-8 h-8">
        <button
          type="button"
          onClick={() => navigate('/super-admin/login')}
          aria-label="Super Admin Access"
          className="w-full h-full opacity-0 border-0 outline-none bg-transparent p-0 m-0 cursor-default"
        />
      </div>

    </div>
  );
};

export default Login;