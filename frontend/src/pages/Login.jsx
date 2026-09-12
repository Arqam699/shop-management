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
        setErrorMsg(result.message);
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
    <div className="relative min-h-screen overflow-hidden bg-[#080808] flex items-center justify-center p-4 sm:p-6 lg:p-8">

      {/* =====================================================
          PREMIUM 3D BACKGROUND
      ====================================================== */}

      {/* Main dark background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#181818_0%,#0c0c0c_45%,#050505_100%)]" />

      {/* Gold glow - top left */}
      <div
        className="
          absolute
          -top-48
          -left-48
          w-[650px]
          h-[650px]
          rounded-full
          bg-[#D4AF37]/12
          blur-[140px]
          pointer-events-none
        "
      />

      {/* Gold glow - bottom right */}
      <div
        className="
          absolute
          -bottom-52
          -right-48
          w-[700px]
          h-[700px]
          rounded-full
          bg-[#D4AF37]/10
          blur-[150px]
          pointer-events-none
        "
      />

      {/* Central depth glow */}
      <div
        className="
          absolute
          top-[25%]
          left-[30%]
          w-[600px]
          h-[600px]
          rounded-full
          bg-white/[0.015]
          blur-[150px]
          pointer-events-none
        "
      />

      {/* =====================================================
          3D PERSPECTIVE FLOOR GRID
      ====================================================== */}

      <div
        className="
          absolute
          left-[-30%]
          right-[-30%]
          bottom-[-20%]
          h-[65%]
          pointer-events-none
          opacity-[0.22]
        "
        style={{
          backgroundImage: `
            linear-gradient(rgba(212,175,55,0.22) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.22) 1px, transparent 1px)
          `,
          backgroundSize: '65px 65px',
          transform: 'perspective(650px) rotateX(62deg)',
          transformOrigin: 'center bottom',
          maskImage:
            'linear-gradient(to top, black 0%, transparent 90%)',
          WebkitMaskImage:
            'linear-gradient(to top, black 0%, transparent 90%)',
        }}
      />

      {/* =====================================================
          BACKGROUND HORIZONTAL LIGHT
      ====================================================== */}

      <div
        className="
          absolute
          left-0
          right-0
          top-[48%]
          h-px
          bg-gradient-to-r
          from-transparent
          via-[#D4AF37]/20
          to-transparent
          pointer-events-none
        "
      />

      {/* =====================================================
          3D FLOATING ORB - TOP RIGHT
      ====================================================== */}

      <div
        className="
          absolute
          top-[8%]
          right-[8%]
          w-36
          h-36
          rounded-full
          pointer-events-none
          opacity-60
        "
        style={{
          background:
            'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.28), rgba(212,175,55,0.16) 22%, rgba(212,175,55,0.06) 48%, transparent 72%)',
          boxShadow:
            'inset -22px -25px 45px rgba(0,0,0,0.72), 0 25px 70px rgba(212,175,55,0.10)',
        }}
      />

      {/* =====================================================
          3D FLOATING ORB - BOTTOM LEFT
      ====================================================== */}

      <div
        className="
          absolute
          bottom-[7%]
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
          FLOATING 3D GLASS CUBE - TOP LEFT
      ====================================================== */}

      <div
        className="
          absolute
          top-[10%]
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
          FLOATING 3D RING - BOTTOM RIGHT
      ====================================================== */}

      <div
        className="
          absolute
          bottom-[13%]
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
          bottom-[16%]
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
          SMALL FLOATING PARTICLES
      ====================================================== */}

      <div className="absolute top-[19%] right-[29%] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/60 shadow-[0_0_18px_rgba(212,175,55,0.9)] pointer-events-none" />

      <div className="absolute top-[72%] left-[28%] w-1 h-1 rounded-full bg-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.8)] pointer-events-none" />

      <div className="absolute top-[35%] right-[6%] w-1 h-1 rounded-full bg-white/30 pointer-events-none" />

      <div className="absolute bottom-[30%] left-[6%] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/30 shadow-[0_0_12px_rgba(212,175,55,0.7)] pointer-events-none" />

      {/* =====================================================
          MAIN LOGIN CARD
      ====================================================== */}

      <div
        className="
          relative
          z-10
          w-full
          max-w-[1100px]
          min-h-[620px]
          lg:h-[680px]
          bg-white
          rounded-3xl
          overflow-hidden
          shadow-[0_35px_100px_rgba(0,0,0,0.55)]
          border
          border-white/20
        "
      >

        {/* =====================================================
            LEFT BRANDING SECTION
        ====================================================== */}

        <div
          className="
            hidden
            lg:flex
            absolute
            left-0
            top-0
            bottom-0
            w-[46%]
            bg-[#111111]
            overflow-hidden
          "
        >

          {/* Background Glow */}
          <div className="absolute -top-40 -left-40 w-[450px] h-[450px] rounded-full bg-[#D4AF37]/10 blur-[100px]" />

          <div className="absolute -bottom-40 right-0 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/5 blur-[100px]" />

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

          {/* Left Content */}
          <div className="relative z-10 w-full p-12 flex flex-col justify-between">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-3">

                <div className="w-11 h-11 rounded-xl bg-[#D4AF37] flex items-center justify-center shadow-[0_8px_25px_rgba(212,175,55,0.15)]">
                  <Package className="w-5 h-5 text-black" />
                </div>

                <div>
                  <p className="text-[#D4AF37] text-lg font-bold tracking-wide">
                    SHOP
                  </p>

                  <p className="text-white text-xs tracking-[0.2em] whitespace-nowrap">
                    MANAGEMENT SYSTEM
                  </p>
                </div>

              </div>
            </div>

            {/* Center Content */}
            <div>

              <p className="text-[#D4AF37] text-sm font-semibold tracking-[0.25em] uppercase mb-4 whitespace-nowrap">
                Welcome to your workspace
              </p>

              <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight">

                Manage your

                <br />

                <span className="text-[#D4AF37]">
                  business
                </span>

                <br />

                smarter.

              </h1>

              <p className="mt-6 text-gray-400 text-sm leading-7 max-w-sm">
                Manage inventory, customers, sales, payments
                and reports from one powerful platform.
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-3 mt-8">

                {/* Analytics */}
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    px-3
                    py-2
                    rounded-lg
                    bg-white/5
                    border
                    border-white/10
                    hover:border-[#D4AF37]/30
                    hover:bg-[#D4AF37]/5
                    hover:-translate-y-0.5
                    transition-all
                    duration-300
                  "
                >
                  <BarChart3 className="w-4 h-4 text-[#D4AF37]" />

                  <span className="text-xs text-gray-300">
                    Analytics
                  </span>
                </div>

                {/* Inventory */}
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    px-3
                    py-2
                    rounded-lg
                    bg-white/5
                    border
                    border-white/10
                    hover:border-[#D4AF37]/30
                    hover:bg-[#D4AF37]/5
                    hover:-translate-y-0.5
                    transition-all
                    duration-300
                  "
                >
                  <Package className="w-4 h-4 text-[#D4AF37]" />

                  <span className="text-xs text-gray-300">
                    Inventory
                  </span>
                </div>

                {/* Sales */}
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    px-3
                    py-2
                    rounded-lg
                    bg-white/5
                    border
                    border-white/10
                    hover:border-[#D4AF37]/30
                    hover:bg-[#D4AF37]/5
                    hover:-translate-y-0.5
                    transition-all
                    duration-300
                  "
                >
                  <ShoppingCart className="w-4 h-4 text-[#D4AF37]" />

                  <span className="text-xs text-gray-300">
                    Sales
                  </span>
                </div>

              </div>

            </div>

            {/* Bottom */}
            <div className="flex items-center justify-between">

              <p className="text-xs text-gray-500">
                Secure Business Management
              </p>

              <div className="flex items-center gap-2">

                <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.7)]" />

                <span className="text-xs text-gray-500">
                  System Online
                </span>

              </div>

            </div>

          </div>

          {/* =================================================
              LEFT 3D DECORATION
          ================================================== */}

          <div
            className="
              absolute
              right-[-55px]
              top-[32%]
              w-44
              h-44
              rotate-12
              opacity-80
            "
          >

            <div className="absolute inset-0 rounded-[35px] border border-[#D4AF37]/20 bg-[#D4AF37]/5 backdrop-blur-sm" />

            <div className="absolute inset-5 rounded-[28px] border border-[#D4AF37]/15" />

            <div className="absolute inset-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
              <Package className="w-10 h-10 text-[#D4AF37]/70" />
            </div>

          </div>

        </div>

        {/* =====================================================
            RIGHT LOGIN SECTION
        ====================================================== */}

        <div
          className="
            lg:absolute
            lg:right-0
            lg:top-0
            lg:bottom-0
            lg:w-[54%]
            flex
            items-center
            justify-center
            p-6
            sm:p-10
            lg:p-14
          "
        >

          <div className="w-full max-w-[440px] min-w-0">

            {/* =================================================
                MOBILE BRAND
            ================================================== */}

            <div className="lg:hidden text-center mb-8">

              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-900 shadow-lg mb-3">
                <Package className="w-5 h-5 text-[#D4AF37]" />
              </div>

              <h1 className="text-xl font-bold text-gray-900">
                Shop Management System
              </h1>

            </div>

            {/* =================================================
                HEADING
            ================================================== */}

            <div className="mb-8 w-full">

              <p
                className="
                  text-[#A17C18]
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.2em]
                  mb-2
                  whitespace-nowrap
                "
              >
                Admin Portal
              </p>

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
                Sign in to continue to your dashboard.
              </p>

            </div>

            {/* =================================================
                ERROR MESSAGE
            ================================================== */}

            {errorMsg && (
              <div
                className="
                  mb-5
                  bg-red-50
                  border
                  border-red-100
                  rounded-xl
                  px-4
                  py-3
                  flex
                  items-start
                  gap-3
                  w-full
                "
              >

                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />

                <span className="text-sm text-red-700 break-words">
                  {errorMsg}
                </span>

              </div>
            )}

            {/* =================================================
                LOGIN FORM
            ================================================== */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5 w-full"
            >

              {/* EMAIL */}
              <div className="group w-full">

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>

                <div className="relative w-full">

                  <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none">

                    <Mail
                      className="
                        w-5
                        h-5
                        text-gray-400
                        group-focus-within:text-[#B8962E]
                        group-hover:text-gray-500
                        transition-colors
                        duration-200
                      "
                    />

                  </div>

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="admin@shop.com"
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

                  <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none">

                    <Lock
                      className="
                        w-5
                        h-5
                        text-gray-400
                        group-focus-within:text-[#B8962E]
                        group-hover:text-gray-500
                        transition-colors
                        duration-200
                      "
                    />

                  </div>

                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="••••••••"
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
                  SIGN IN BUTTON
              ================================================== */}

              <button
                type="submit"
                disabled={isSubmitting}
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
                  hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)]
                  active:translate-y-0
                  disabled:opacity-60
                  disabled:cursor-not-allowed
                  disabled:hover:translate-y-0
                "
              >

                {/* Button Shine */}
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

                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />

                      <span>
                        Authenticating...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Sign In to Admin Portal
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
                FOOTER
            ================================================== */}

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

      {/* =====================================================
          INVISIBLE SUPER ADMIN ACCESS
          
          IMPORTANT:
          - Completely invisible
          - No text
          - No hover effect
          - No cursor hint
          - Click bottom-right corner
          - Opens /super-admin/login
      ====================================================== */}

      <div
        className="
          absolute
          bottom-1
          right-1
          z-[9999]
          w-8
          h-8
        "
      >
        <button
          type="button"
          onClick={() => navigate('/super-admin/login')}
          aria-label="Super Admin Access"
          className="
            w-full
            h-full
            opacity-0
            border-0
            outline-none
            bg-transparent
            p-0
            m-0
          "
        />
      </div>

    </div>
  );
};

export default Login;