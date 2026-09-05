import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, CheckCircle, Shield } from 'lucide-react';

const DashboardPlaceholder = () => {
  const { admin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-800">Electronics Shop Hub</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1.5 rounded-md">
            Logged in as: <strong className="text-gray-900">{admin?.email}</strong>
          </span>
          <button
            onClick={logout}
            className="flex items-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border border-red-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Hero Welcome Unit */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
          <div className="inline-flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Phase 1 Integration Complete</h2>
          <p className="text-gray-600 mb-6 max-w-lg mx-auto">
            The system core, MongoDB driver layer, session verification mechanism, cookie handling parameters, and admin-authenticated routing structures are operating correctly.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Security Cookie</span>
              <p className="text-sm font-bold text-gray-800 mt-1">HTTP-Only Verified</p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Auto Seed</span>
              <p className="text-sm font-bold text-gray-800 mt-1">Admin Ready</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPlaceholder;