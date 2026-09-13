import React from 'react';
import {
  Sparkles,
  Layers,
  ShieldCheck,
  Activity,
  ArrowRight,
} from 'lucide-react';

const PlaceholderPage = ({ title = 'Module' }) => {
  return (
    <div className="space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* =====================================================
          DARK HERO CARD CONTAINER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white p-8 sm:p-12 lg:p-16 flex flex-col items-center justify-center text-center">
        
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 max-w-xl mx-auto space-y-4">
          
          {/* Badge Icon */}
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-blue-950/50 mx-auto mb-2">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
            <ShieldCheck className="w-3 h-3 text-blue-400" />
            System Workspace
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            {title} Module
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
            This workspace panel is scheduled and actively connected with your live database schema. All data sheets, tables, and records synchronize automatically here.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Service Connected
            </span>

            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              REST API Ready
            </span>
          </div>

        </div>
      </section>

    </div>
  );
};

export default PlaceholderPage;