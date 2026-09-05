import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  Menu, X, LayoutDashboard, Boxes, Users, ShoppingCart, 
  Layers, CreditCard, FileText, BarChart3, Settings, LogOut, ShieldAlert, RefreshCw, Wallet, CalendarRange
} from 'lucide-react';

export const Layout = ({ children }) => {
  const { admin, logout } = useAuth();
  const { settings } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await logout();
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Inventory', path: '/inventory', icon: Boxes },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Sales', path: '/sales', icon: ShoppingCart },
    { name: 'Installments', path: '/installments', icon: Layers },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Returns', path: '/returns', icon: RefreshCw }, 
    { name: 'Expenses', path: '/expenses', icon: Wallet },
    { name: 'Yearly Audits', path: '/audits', icon: CalendarRange }, 
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Isolated Sidebar Content Container with its own internal hover-scroll
  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white select-none">
      {/* Top Shop Brand (Sticky inside sidebar) */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3 bg-slate-950 shrink-0">
        <ShieldAlert className="w-8 h-8 text-indigo-400 shrink-0" />
        <div>
          <h2 className="font-bold text-sm leading-tight truncate max-w-[170px]">
            {settings?.shopName || 'Electronics Shop'}
          </h2>
          <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase block mt-0.5">Admin Desk</span>
        </div>
      </div>

      {/* Nav links scroll only when mouse hovers over sidebar */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Admin details & Logout button (Fixed at bottom of sidebar) */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs text-slate-400 font-medium">Logged in</p>
            <p className="text-xs font-bold text-slate-200 truncate">{admin?.email}</p>
          </div>
          <button
            onClick={handleLogoutClick}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    // Root container locked to h-screen to prevent body-level window scroll
    <div className="h-screen bg-slate-100 flex overflow-hidden">
      
      {/* 1. DESKTOP STICKY SIDEBAR: Fixed to screen height, does not scroll with page */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-800 h-full z-20">
        {sidebarContent}
      </aside>

      {/* Drawer for Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative flex flex-col w-64 max-w-xs bg-slate-900 transition-transform duration-300">
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-full text-white bg-slate-800 hover:bg-slate-700 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* 2. MAIN CONTENT VIEW: Independent scrolling container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-lg font-black text-gray-800 hidden md:block tracking-tight">
              {settings?.shopName}
            </div>
          </div>
          
          <div className="text-xs font-bold text-gray-500 bg-gray-100 px-3.5 py-2 rounded-xl border">
            Active Currency: <span className="text-indigo-600 font-extrabold">{settings?.currency}</span>
          </div>
        </header>

        {/* Scrollable page body */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

    </div>
  );
};