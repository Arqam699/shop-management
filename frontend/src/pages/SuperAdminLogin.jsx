import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Server,
  Users,
  Settings,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '');

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/super-admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Super Admin login failed');
      }

      navigate('/super-admin/dashboard', {
        replace: true,
      });
    } catch (error) {
      console.error('Super Admin Login Error:', error);
      setError(error.message || 'Super Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060913] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">

      {/* =====================================================
          AMBIENT 3D BACKGROUND GLOWS (Gold Theme for Super Admin)
      ====================================================== */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#1b1b1b_0%,#0b0b0b_48%,#030303_100%)]" />

      {/* Gold glow - top left */}
      <div className="pointer-events-none absolute -top-52 -left-52 w-[650px] h-[650px] rounded-full bg-[#D4AF37]/12 blur-[150px]" />

      {/* Gold glow - bottom right */}
      <div className="pointer-events-none absolute -bottom-56 -right-48 w-[700px] h-[700px] rounded-full bg-[#D4AF37]/10 blur-[160px]" />

      {/* 3D Perspective Grid */}
      <div
        className="pointer-events-none absolute left-[-30%] right-[-30%] bottom-[-22%] h-[68%] opacity-[0.22]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(212,175,55,0.22) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.22) 1px, transparent 1px)
          `,
          backgroundSize: '65px 65px',
          transform: 'perspective(650px) rotateX(62deg)',
          transformOrigin: 'center bottom',
          maskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
        }}
      />

      {/* =====================================================
          MAIN SUPER ADMIN CARD
      ====================================================== */}
      <div className="relative z-10 w-full max-w-[1050px] min-h-[580px] lg:h-[640px] bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/60 border border-white/20 flex flex-col lg:flex-row">

        {/* =====================================================
            LEFT SECURITY PANEL (Dark Luxury)
        ====================================================== */}
        <div className="hidden lg:flex relative w-[44%] bg-[#101010] text-white p-12 flex-col justify-between overflow-hidden border-r border-white/[0.08]">
          <div className="pointer-events-none absolute -top-40 -left-40 w-[450px] h-[450px] rounded-full bg-[#D4AF37]/10 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-40 right-[-80px] w-[420px] h-[420px] rounded-full bg-[#D4AF37]/5 blur-[110px]" />

          {/* Brand */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] flex items-center justify-center shadow-xl shadow-[#D4AF37]/20">
                <ShieldCheck className="w-6 h-6 text-black" />
              </div>
              <div>
                <p className="text-[#D4AF37] text-sm font-black tracking-wider">
                  SUPER ADMIN
                </p>
                <p className="text-gray-400 text-[10px] uppercase tracking-[0.18em]">
                  System Control
                </p>
              </div>
            </div>
          </div>

          {/* Center Content */}
          <div className="relative z-10 my-auto py-6">
            <p className="text-[#D4AF37] text-xs font-black uppercase tracking-[0.25em] mb-3">
              Restricted Access
            </p>

            <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">
              Control your <br />
              <span className="text-[#D4AF37]">entire</span> <br />
              platform.
            </h2>

            <p className="mt-4 text-xs text-gray-400 font-medium leading-relaxed max-w-sm">
              Manage tenant shops, active subscriptions, system administrators, and global platforms securely.
            </p>

            {/* Security Features */}
            <div className="mt-6 space-y-2.5">
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <Server className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs font-bold text-gray-300">System Administration</span>
              </div>
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <Users className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs font-bold text-gray-300">Tenant Shop Management</span>
              </div>
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <Settings className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs font-bold text-gray-300">Subscription Control</span>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="relative z-10 flex items-center justify-between text-xs text-gray-500 border-t border-white/[0.06] pt-4">
            <span>Protected Gateway</span>
            <span className="flex items-center gap-1.5 font-bold text-[#D4AF37]">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
              Secure
            </span>
          </div>
        </div>

        {/* =====================================================
            RIGHT LOGIN FORM SECTION
        ====================================================== */}
        <div className="w-full lg:w-[56%] flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-white">
          <div className="w-full max-w-[400px]">

            {/* Mobile Brand */}
            <div className="lg:hidden text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gray-900 text-[#D4AF37] flex items-center justify-center shadow-lg mx-auto mb-2.5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Super Admin Portal</h2>
              <p className="text-xs text-slate-400">Master Control Center</p>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A17C18] bg-[#D4AF37]/10 px-2.5 py-1 rounded-md border border-[#D4AF37]/20">
                Super Admin
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-2">
                Welcome back
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Sign in with your master credentials to access platform controls.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-rose-800 animate-[pageEnter_0.2s_ease-out]">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="text-xs font-bold leading-snug">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Master Email Address
                </label>
                <div className="relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-[#B8962E] transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@shop.com"
                    className="w-full h-11 pl-11 pr-4 border border-slate-200 rounded-xl bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-[#C19A2B] focus:ring-4 focus:ring-[#D4AF37]/10 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Master Password
                </label>
                <div className="relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-[#B8962E] transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-11 pr-11 border border-slate-200 rounded-xl bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-[#C19A2B] focus:ring-4 focus:ring-[#D4AF37]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 transition-colors hover:text-[#B8962E]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-black shadow-lg shadow-black/20 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating Master Key...</span>
                    </>
                  ) : (
                    <>
                      <span>Login as Super Admin</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* Back to regular login */}
            <div className="mt-7 text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-[#927019] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Admin Login</span>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-7 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>Restricted Gateway</span>
              <span>© {new Date().getFullYear()}</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default SuperAdminLogin;
