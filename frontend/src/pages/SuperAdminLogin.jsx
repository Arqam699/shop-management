
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
} from 'lucide-react';

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '');

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/super-admin/login`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          credentials: 'include',

          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Super Admin login failed'
        );
      }

      console.log(
        'Super Admin Login:',
        data
      );

      navigate(
        '/super-admin/dashboard',
        {
          replace: true,
        }
      );

    } catch (error) {
      console.error(
        'Super Admin Login Error:',
        error
      );

      setError(
        error.message ||
          'Super Admin login failed'
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070707] flex items-center justify-center p-4 sm:p-6 lg:p-8">

      {/* =====================================================
          PREMIUM 3D BACKGROUND
      ====================================================== */}

      {/* Main background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#1b1b1b_0%,#0b0b0b_48%,#030303_100%)]" />

      {/* Gold glow - top left */}
      <div
        className="
          absolute
          -top-52
          -left-52
          w-[650px]
          h-[650px]
          rounded-full
          bg-[#D4AF37]/12
          blur-[150px]
          pointer-events-none
        "
      />

      {/* Gold glow - bottom right */}
      <div
        className="
          absolute
          -bottom-56
          -right-48
          w-[700px]
          h-[700px]
          rounded-full
          bg-[#D4AF37]/10
          blur-[160px]
          pointer-events-none
        "
      />

      {/* Center glow */}
      <div
        className="
          absolute
          top-[25%]
          left-[35%]
          w-[500px]
          h-[500px]
          rounded-full
          bg-white/[0.015]
          blur-[140px]
          pointer-events-none
        "
      />


      {/* =====================================================
          3D PERSPECTIVE GRID
      ====================================================== */}

      <div
        className="
          absolute
          left-[-30%]
          right-[-30%]
          bottom-[-22%]
          h-[68%]
          opacity-[0.22]
          pointer-events-none
        "
        style={{
          backgroundImage: `
            linear-gradient(rgba(212,175,55,0.22) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.22) 1px, transparent 1px)
          `,
          backgroundSize: '65px 65px',
          transform:
            'perspective(650px) rotateX(62deg)',
          transformOrigin: 'center bottom',
          maskImage:
            'linear-gradient(to top, black 0%, transparent 90%)',
          WebkitMaskImage:
            'linear-gradient(to top, black 0%, transparent 90%)',
        }}
      />


      {/* =====================================================
          3D FLOATING ORB
      ====================================================== */}

      <div
        className="
          absolute
          top-[8%]
          right-[9%]
          w-36
          h-36
          rounded-full
          pointer-events-none
          opacity-60
        "
        style={{
          background:
            'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.28), rgba(212,175,55,0.16) 22%, rgba(212,175,55,0.05) 50%, transparent 72%)',

          boxShadow:
            'inset -22px -25px 45px rgba(0,0,0,0.75), 0 25px 70px rgba(212,175,55,0.10)',
        }}
      />


      {/* =====================================================
          SECOND 3D ORB
      ====================================================== */}

      <div
        className="
          absolute
          bottom-[9%]
          left-[7%]
          w-28
          h-28
          rounded-full
          pointer-events-none
          opacity-50
        "
        style={{
          background:
            'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.20), rgba(212,175,55,0.12) 25%, rgba(212,175,55,0.03) 58%, transparent 76%)',

          boxShadow:
            'inset -18px -20px 35px rgba(0,0,0,0.75), 0 20px 55px rgba(212,175,55,0.08)',
        }}
      />


      {/* =====================================================
          3D GLASS CUBE
      ====================================================== */}

      <div
        className="
          absolute
          top-[12%]
          left-[10%]
          w-28
          h-28
          pointer-events-none
          opacity-25
        "
        style={{
          transform:
            'perspective(500px) rotateX(28deg) rotateY(38deg) rotateZ(12deg)',
        }}
      >

        <div
          className="
            absolute
            inset-0
            rounded-3xl
            border
            border-[#D4AF37]/40
            bg-[#D4AF37]/5
            backdrop-blur-sm
          "
          style={{
            boxShadow:
              'inset 0 0 35px rgba(212,175,55,0.08), 0 30px 60px rgba(0,0,0,0.55)',
          }}
        />

        <div className="absolute inset-5 rounded-2xl border border-white/10" />

        <div className="absolute inset-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/10" />

      </div>


      {/* =====================================================
          3D RING
      ====================================================== */}

      <div
        className="
          absolute
          bottom-[14%]
          right-[10%]
          w-44
          h-44
          rounded-full
          border
          border-[#D4AF37]/20
          pointer-events-none
          opacity-35
        "
        style={{
          transform:
            'perspective(500px) rotateX(65deg) rotateY(-20deg)',
          boxShadow:
            '0 0 60px rgba(212,175,55,0.08), inset 0 0 35px rgba(212,175,55,0.04)',
        }}
      />

      <div
        className="
          absolute
          bottom-[17%]
          right-[13%]
          w-32
          h-32
          rounded-full
          border
          border-[#D4AF37]/10
          pointer-events-none
          opacity-30
        "
        style={{
          transform:
            'perspective(500px) rotateX(65deg) rotateY(-20deg)',
        }}
      />


      {/* =====================================================
          FLOATING PARTICLES
      ====================================================== */}

      <div className="absolute top-[19%] right-[29%] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/60 shadow-[0_0_18px_rgba(212,175,55,0.9)] pointer-events-none" />

      <div className="absolute bottom-[25%] left-[27%] w-1 h-1 rounded-full bg-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.8)] pointer-events-none" />

      <div className="absolute top-[38%] right-[6%] w-1 h-1 rounded-full bg-white/30 pointer-events-none" />


      {/* =====================================================
          MAIN SUPER ADMIN CARD
      ====================================================== */}

      <div
        className="
          relative
          z-10
          w-full
          max-w-[1050px]
          min-h-[620px]
          lg:min-h-[650px]
          bg-white
          rounded-3xl
          overflow-hidden
          shadow-[0_35px_110px_rgba(0,0,0,0.60)]
          border
          border-white/20
          flex
        "
      >

        {/* =================================================
            LEFT SECURITY PANEL
        ================================================== */}

        <div
          className="
            hidden
            lg:flex
            relative
            w-[44%]
            bg-[#101010]
            overflow-hidden
            p-12
            flex-col
            justify-between
          "
        >

          {/* Internal Glow */}
          <div className="absolute -top-40 -left-40 w-[450px] h-[450px] rounded-full bg-[#D4AF37]/10 blur-[110px]" />

          <div className="absolute -bottom-40 right-[-80px] w-[420px] h-[420px] rounded-full bg-[#D4AF37]/5 blur-[110px]" />


          {/* Internal Grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `
                linear-gradient(#D4AF37 1px, transparent 1px),
                linear-gradient(90deg, #D4AF37 1px, transparent 1px)
              `,
              backgroundSize: '42px 42px',
            }}
          />


          {/* Brand */}
          <div className="relative z-10">

            <div className="flex items-center gap-3">

              <div
                className="
                  w-12
                  h-12
                  rounded-2xl
                  bg-[#D4AF37]
                  flex
                  items-center
                  justify-center
                  shadow-[0_10px_30px_rgba(212,175,55,0.20)]
                "
              >

                <ShieldCheck className="w-6 h-6 text-black" />

              </div>

              <div>

                <p className="text-[#D4AF37] text-lg font-bold tracking-wide">
                  SUPER ADMIN
                </p>

                <p className="text-gray-400 text-xs tracking-[0.18em]">
                  SYSTEM CONTROL
                </p>

              </div>

            </div>

          </div>


          {/* Center Content */}
          <div className="relative z-10">

            <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.25em] mb-4">
              Restricted Access
            </p>

            <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight">

              Control your

              <br />

              <span className="text-[#D4AF37]">
                entire
              </span>

              <br />

              platform.

            </h1>

            <p className="mt-6 text-gray-400 text-sm leading-7 max-w-sm">

              Manage shops, subscriptions, administrators
              and system-level operations from one secure
              control center.

            </p>


            {/* Security Features */}
            <div className="mt-8 space-y-3">

              <div
                className="
                  flex
                  items-center
                  gap-3
                  px-4
                  py-3
                  rounded-xl
                  bg-white/[0.04]
                  border
                  border-white/10
                  hover:border-[#D4AF37]/30
                  hover:bg-[#D4AF37]/5
                  transition-all
                  duration-300
                "
              >

                <Server className="w-4 h-4 text-[#D4AF37]" />

                <span className="text-sm text-gray-300">
                  System Administration
                </span>

              </div>


              <div
                className="
                  flex
                  items-center
                  gap-3
                  px-4
                  py-3
                  rounded-xl
                  bg-white/[0.04]
                  border
                  border-white/10
                  hover:border-[#D4AF37]/30
                  hover:bg-[#D4AF37]/5
                  transition-all
                  duration-300
                "
              >

                <Users className="w-4 h-4 text-[#D4AF37]" />

                <span className="text-sm text-gray-300">
                  Shop & Admin Management
                </span>

              </div>


              <div
                className="
                  flex
                  items-center
                  gap-3
                  px-4
                  py-3
                  rounded-xl
                  bg-white/[0.04]
                  border
                  border-white/10
                  hover:border-[#D4AF37]/30
                  hover:bg-[#D4AF37]/5
                  transition-all
                  duration-300
                "
              >

                <Settings className="w-4 h-4 text-[#D4AF37]" />

                <span className="text-sm text-gray-300">
                  Subscription Control
                </span>

              </div>

            </div>

          </div>


          {/* Bottom */}
          <div className="relative z-10 flex items-center justify-between">

            <span className="text-xs text-gray-500">
              Protected System
            </span>

            <div className="flex items-center gap-2">

              <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.8)]" />

              <span className="text-xs text-gray-500">
                Secure
              </span>

            </div>

          </div>


          {/* 3D Security Decoration */}
          <div
            className="
              absolute
              right-[-65px]
              top-[34%]
              w-48
              h-48
              rotate-12
              opacity-70
            "
          >

            <div className="absolute inset-0 rounded-[38px] border border-[#D4AF37]/20 bg-[#D4AF37]/5 backdrop-blur-sm" />

            <div className="absolute inset-6 rounded-[30px] border border-[#D4AF37]/15" />

            <div className="absolute inset-11 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">

              <ShieldCheck className="w-11 h-11 text-[#D4AF37]/70" />

            </div>

          </div>

        </div>


        {/* =================================================
            RIGHT LOGIN PANEL
        ================================================== */}

        <div
          className="
            relative
            w-full
            lg:w-[56%]
            flex
            items-center
            justify-center
            p-6
            sm:p-10
            lg:p-14
            bg-white
          "
        >

          <div className="w-full max-w-[440px] min-w-0">


            {/* Mobile Brand */}
            <div className="lg:hidden text-center mb-8">

              <div
                className="
                  inline-flex
                  items-center
                  justify-center
                  w-14
                  h-14
                  rounded-2xl
                  bg-gray-900
                  shadow-lg
                  mb-4
                "
              >

                <ShieldCheck className="w-7 h-7 text-[#D4AF37]" />

              </div>

              <h1 className="text-xl font-bold text-gray-900">
                Super Admin Portal
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                System Administrator
              </p>

            </div>


            {/* Heading */}
            <div className="mb-8">

              <div className="flex items-center gap-2 mb-3">

                <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />

                <p
                  className="
                    text-[#A17C18]
                    text-xs
                    font-bold
                    uppercase
                    tracking-[0.2em]
                  "
                >
                  Super Admin Portal
                </p>

              </div>

              <h2
                className="
                  text-3xl
                  sm:text-4xl
                  font-bold
                  text-gray-900
                  leading-tight
                  whitespace-nowrap
                "
              >
                Welcome back
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Sign in to access system controls.
              </p>

            </div>


            {/* Error */}
            {error && (
              <div
                className="
                  mb-5
                  rounded-xl
                  bg-red-50
                  border
                  border-red-100
                  px-4
                  py-3
                  flex
                  items-start
                  gap-3
                "
              >

                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />

                <span className="text-sm text-red-700 break-words">
                  {error}
                </span>

              </div>
            )}


            {/* =================================================
                LOGIN FORM
            ================================================== */}

            <form
              onSubmit={handleLogin}
              className="space-y-5 w-full"
            >

              {/* EMAIL */}
              <div className="group w-full">

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>

                <div className="relative w-full">

                  <div
                    className="
                      absolute
                      left-0
                      top-0
                      bottom-0
                      w-12
                      flex
                      items-center
                      justify-center
                      pointer-events-none
                    "
                  >

                    <Mail
                      className="
                        w-5
                        h-5
                        text-gray-400
                        group-hover:text-gray-500
                        group-focus-within:text-[#B8962E]
                        transition-colors
                        duration-200
                      "
                    />

                  </div>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="superadmin@shop.com"
                    required
                    autoComplete="email"
                    className="
                      block
                      w-full
                      min-w-0
                      h-[52px]
                      pl-12
                      pr-4
                      rounded-xl
                      border
                      border-gray-200
                      bg-gray-50
                      text-gray-900
                      text-sm
                      placeholder:text-gray-400
                      outline-none
                      transition-all
                      duration-300
                      hover:bg-white
                      hover:border-gray-300
                      hover:shadow-sm
                      focus:bg-white
                      focus:border-[#C19A2B]
                      focus:ring-4
                      focus:ring-[#D4AF37]/10
                      focus:shadow-[0_5px_20px_rgba(212,175,55,0.08)]
                    "
                  />

                </div>

              </div>


              {/* PASSWORD */}
              <div className="group w-full">

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>

                <div className="relative w-full">

                  <div
                    className="
                      absolute
                      left-0
                      top-0
                      bottom-0
                      w-12
                      flex
                      items-center
                      justify-center
                      pointer-events-none
                    "
                  >

                    <Lock
                      className="
                        w-5
                        h-5
                        text-gray-400
                        group-hover:text-gray-500
                        group-focus-within:text-[#B8962E]
                        transition-colors
                        duration-200
                      "
                    />

                  </div>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Enter Super Admin password"
                    required
                    autoComplete="current-password"
                    className="
                      block
                      w-full
                      min-w-0
                      h-[52px]
                      pl-12
                      pr-4
                      rounded-xl
                      border
                      border-gray-200
                      bg-gray-50
                      text-gray-900
                      text-sm
                      placeholder:text-gray-400
                      outline-none
                      transition-all
                      duration-300
                      hover:bg-white
                      hover:border-gray-300
                      hover:shadow-sm
                      focus:bg-white
                      focus:border-[#C19A2B]
                      focus:ring-4
                      focus:ring-[#D4AF37]/10
                      focus:shadow-[0_5px_20px_rgba(212,175,55,0.08)]
                    "
                  />

                </div>

              </div>


              {/* =================================================
                  LOGIN BUTTON
              ================================================== */}

              <button
                type="submit"
                disabled={loading}
                className="
                  group
                  relative
                  block
                  w-full
                  min-w-0
                  h-[52px]
                  overflow-hidden
                  rounded-xl
                  bg-gray-900
                  text-white
                  font-semibold
                  text-sm
                  flex
                  items-center
                  justify-center
                  gap-2
                  shadow-[0_8px_20px_rgba(0,0,0,0.12)]
                  transition-all
                  duration-300
                  hover:-translate-y-0.5
                  hover:bg-black
                  hover:shadow-[0_12px_30px_rgba(0,0,0,0.20)]
                  active:translate-y-0
                  disabled:opacity-60
                  disabled:cursor-not-allowed
                  disabled:hover:translate-y-0
                "
              >

                {/* Button shine */}
                <span
                  className="
                    absolute
                    inset-y-0
                    -left-full
                    w-1/2
                    bg-gradient-to-r
                    from-transparent
                    via-white/10
                    to-transparent
                    skew-x-[-20deg]
                    group-hover:left-[130%]
                    transition-all
                    duration-700
                    pointer-events-none
                  "
                />

                <span className="relative flex items-center justify-center gap-2 whitespace-nowrap">

                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />

                      <span>
                        Authenticating...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Login as Super Admin
                      </span>

                      <ArrowRight
                        className="
                          w-4
                          h-4
                          group-hover:translate-x-1
                          transition-transform
                          duration-300
                          shrink-0
                        "
                      />

                    </>
                  )}

                </span>

              </button>

            </form>


            {/* =================================================
                SECURITY NOTE
            ================================================== */}

            <div
              className="
                mt-6
                px-4
                py-3
                rounded-xl
                bg-[#D4AF37]/5
                border
                border-[#D4AF37]/15
                flex
                items-center
                gap-3
              "
            >

              <ShieldCheck className="w-4 h-4 text-[#A17C18] shrink-0" />

              <p className="text-xs text-gray-500 leading-5">
                This portal is restricted to authorized
                system administrators only.
              </p>

            </div>


            {/* =================================================
                BACK TO ADMIN LOGIN
            ================================================== */}

            <div className="mt-7 text-center">

              <button
                type="button"
                onClick={() =>
                  navigate('/login')
                }
                className="
                  group
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  text-sm
                  text-gray-500
                  font-medium
                  transition-all
                  duration-300
                  hover:text-[#927019]
                "
              >

                <ArrowLeft
                  className="
                    w-4
                    h-4
                    transition-transform
                    duration-300
                    group-hover:-translate-x-1
                  "
                />

                <span>
                  Back to Admin Login
                </span>

              </button>

            </div>


            {/* Footer */}
            <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between">

              <span className="text-xs text-gray-400">
                Secure access
              </span>

              <span className="text-xs text-gray-400">
                © {new Date().getFullYear()}
              </span>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default SuperAdminLogin;