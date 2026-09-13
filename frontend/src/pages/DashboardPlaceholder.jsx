import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogOut,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Database,
  Lock,
  Server,
  Activity,
  User,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardPlaceholder = () => {
  const { admin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex flex-col justify-between animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          TOP NAVBAR
      ====================================================== */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-950/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] uppercase tracking-[0.16em] font-black text-slate-400">
                System Console
              </p>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              Electronics Shop Hub
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-bold text-slate-700">
              {admin?.email || 'Administrator'}
            </span>
          </div>

          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-black transition-all hover:scale-[1.02] active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* =====================================================
          HERO STATUS UNIT
      ====================================================== */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
          
          {/* Header Banner */}
          <div className="relative overflow-hidden bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] p-8 text-center text-white border-b border-white/[0.08]">
            <div className="pointer-events-none absolute -top-24 -left-20 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -bottom-24 -right-20 w-64 h-64 rounded-full bg-violet-600/20 blur-3xl" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-950/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300 mb-2">
                <Sparkles className="w-3 h-3 text-blue-400" />
                Integration Active
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Core System Operational
              </h2>

              <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md mx-auto font-medium leading-relaxed">
                The database layer, cookie authentication mechanism, session security tokens, and routing structures are functioning properly.
              </p>
            </div>
          </div>

          {/* System Verification Metrics */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                    Security Cookie
                  </span>
                  <p className="text-xs font-black text-slate-800 mt-0.5">
                    HTTP-Only & Secure
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                    Database Seed
                  </span>
                  <p className="text-xs font-black text-slate-800 mt-0.5">
                    Admin Privileges Ready
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                    API Endpoints
                  </span>
                  <p className="text-xs font-black text-slate-800 mt-0.5">
                    REST Service Online
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                    Live Session
                  </span>
                  <p className="text-xs font-black text-slate-800 mt-0.5 truncate max-w-[150px]">
                    {admin?.email || 'Active Token'}
                  </p>
                </div>
              </div>

            </div>

            <div className="pt-2 flex justify-center">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                <span>Proceed to Main Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-4 text-center text-xs font-semibold text-slate-400">
        Electronics Shop Hub & POS Console
      </footer>

    </div>
  );
};

export default DashboardPlaceholder;