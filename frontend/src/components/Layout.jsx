import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import ConfirmModal from './ConfirmModal';

import {
  Menu,
  X,
  LayoutDashboard,
  Boxes,
  Users,
  ShoppingCart,
  Layers,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  RefreshCw,
  Wallet,
  CalendarRange,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
  UserRound,
  List,
  BookOpen,
  ChevronDown,
  Banknote,
  CalendarClock,
} from 'lucide-react';

export const Layout = ({ children }) => {
  const { admin, logout } = useAuth();
  const { settings } = useSettings();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // Desktop sidebar show/hide
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Customers dropdown
  const [customersOpen, setCustomersOpen] = useState(false);

  // Sales dropdown
  const [salesOpen, setSalesOpen] = useState(false);

  // Installments dropdown
  const [installmentsOpen, setInstallmentsOpen] =
    useState(false);

  const navigate = useNavigate();

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogoutClick = () => {
    setLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    await logout();
    setLogoutModalOpen(false);
    navigate('/login');
  };

  // ==========================================
  // CUSTOMER MENU
  // ==========================================

  const customerMenuItems = [
    {
      name: 'Register Customers',
      path: '/customers/add',
      icon: UserPlus,
    },
    {
      name: 'Customers List',
      path: '/customers',
      icon: List,
    },
    {
      name: 'Customers Details',
      path: '/customers/details',
      icon: UserRound,
    },
    {
      name: 'Customers Ledger',
      path: '/customers/ledger',
      icon: BookOpen,
    },
  ];

  // ==========================================
  // SALES MENU
  // ==========================================

  const salesMenuItems = [
    {
      name: 'Sales History',
      path: '/sales',
      icon: ShoppingCart,
    },
    {
      name: 'New Cash Sale',
      path: '/sales/new?type=cash',
      icon: Banknote,
    },
  ];

  // ==========================================
  // INSTALLMENT MENU
  // ==========================================

  const installmentMenuItems = [
    {
      name: 'Installment Sales',
      path: '/installments',
      icon: Layers,
    },
    {
      name: 'New Installment Sale',
      path: '/sales/new?type=installment',
      icon: CalendarClock,
    },
  ];

  // ==========================================
  // NAVIGATION
  // ==========================================

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Due Dates',
      path: '/due-dates',
      icon: CalendarRange,
    },
    {
      name: 'Inventory',
      path: '/inventory',
      icon: Boxes,
    },
    {
      name: 'Customers',
      path: '/customers',
      icon: Users,
      hasChildren: true,
      menuType: 'customers',
    },
    {
      name: 'Sales',
      path: '/sales',
      icon: ShoppingCart,
      hasChildren: true,
      menuType: 'sales',
    },
    {
      name: 'Installments',
      path: '/installments',
      icon: Layers,
      hasChildren: true,
      menuType: 'installments',
    },
    {
      name: 'Payments',
      path: '/payments',
      icon: CreditCard,
    },
    {
      name: 'Invoices',
      path: '/invoices',
      icon: FileText,
    },
    {
      name: 'Returns',
      path: '/returns',
      icon: RefreshCw,
    },
    {
      name: 'Expenses',
      path: '/expenses',
      icon: Wallet,
    },
    {
      name: 'Yearly Audits',
      path: '/audits',
      icon: CalendarRange,
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: BarChart3,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
    },
  ];

  // ==========================================
  // CUSTOMER ACTIVE CHECK
  // ==========================================

  const isCustomerRouteActive = () => {
    const currentPath = window.location.pathname;

    return (
      currentPath === '/customers' ||
      currentPath === '/customers/' ||
      currentPath.startsWith('/customers/')
    );
  };

  // ==========================================
  // SALES ACTIVE CHECK
  // ==========================================

  const isSalesRouteActive = () => {
    const currentPath = window.location.pathname;

    return (
      currentPath === '/sales' ||
      currentPath === '/sales/' ||
      currentPath.startsWith('/sales/')
    );
  };

  // ==========================================
  // INSTALLMENT ACTIVE CHECK
  // ==========================================

  const isInstallmentRouteActive = () => {
    const currentPath = window.location.pathname;

    return (
      currentPath === '/installments' ||
      currentPath === '/installments/' ||
      currentPath.startsWith('/installments/')
    );
  };

  // ==========================================
  // CUSTOMER MENU TOGGLE
  // ==========================================

  const handleCustomersClick = () => {
    if (sidebarCollapsed) {
      setCustomersOpen(true);
      setSalesOpen(false);
      setInstallmentsOpen(false);
      return;
    }

    setCustomersOpen((prev) => !prev);

    setSalesOpen(false);
    setInstallmentsOpen(false);
  };

  // ==========================================
  // SALES MENU TOGGLE
  // ==========================================

  const handleSalesClick = () => {
    if (sidebarCollapsed) {
      setSalesOpen(true);
      setCustomersOpen(false);
      setInstallmentsOpen(false);
      return;
    }

    setSalesOpen((prev) => !prev);

    setCustomersOpen(false);
    setInstallmentsOpen(false);
  };

  // ==========================================
  // INSTALLMENTS MENU TOGGLE
  // ==========================================

  const handleInstallmentsClick = () => {
    if (sidebarCollapsed) {
      setInstallmentsOpen(true);
      setCustomersOpen(false);
      setSalesOpen(false);
      return;
    }

    setInstallmentsOpen((prev) => !prev);

    setCustomersOpen(false);
    setSalesOpen(false);
  };

  // ==========================================
  // CLOSE MOBILE MENU
  // ==========================================

  // IMPORTANT:
  // Submenu click par dropdown close nahi hoga.
  // Sirf mobile drawer close hoga.

  const handleCustomerSubItemClick = () => {
    setMobileOpen(false);
  };

  const handleSalesSubItemClick = () => {
    setMobileOpen(false);
  };

  const handleInstallmentSubItemClick = () => {
    setMobileOpen(false);
  };

  // ==========================================
  // SIDEBAR CONTENT
  // ==========================================

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">

      {/* ======================================
          BRAND
      ====================================== */}

      <div
        className={`
          border-b border-slate-800/80
          shrink-0
          transition-all
          duration-200
          ${
            sidebarCollapsed
              ? 'p-3'
              : 'px-5 py-5'
          }
        `}
      >
        {sidebarCollapsed ? (
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-950/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-950/30 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0">

              <h2 className="text-sm font-black text-white truncate">
                {settings?.shopName || 'Electronics Shop'}
              </h2>

              <div className="flex items-center gap-1.5 mt-1">

                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Admin Desk
                </span>

              </div>

            </div>

          </div>
        )}
      </div>

      {/* ======================================
          NAVIGATION
      ====================================== */}

      <nav
        className={`
          flex-1
          overflow-y-auto
          transition-all
          duration-200
          ${
            sidebarCollapsed
              ? 'p-2'
              : 'p-3'
          }
        `}
      >

        {!sidebarCollapsed && (
          <p className="px-3 pt-2 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Main Menu
          </p>
        )}

        <div className="space-y-1">

          {navItems.map((item) => {

            const Icon = item.icon;

            // ======================================
            // CUSTOMERS SPECIAL MENU
            // ======================================

            if (
              item.hasChildren &&
              item.menuType === 'customers'
            ) {

              const customerActive =
                isCustomerRouteActive();

              return (
                <div
                  key={item.name}
                  className="relative"
                >

                  {/* CUSTOMER MAIN BUTTON */}

                  <button
                    type="button"
                    onClick={handleCustomersClick}
                    title={
                      sidebarCollapsed
                        ? 'Customers'
                        : undefined
                    }
                    className={`
                      group
                      w-full
                      flex
                      items-center
                      ${
                        sidebarCollapsed
                          ? 'justify-center px-2'
                          : 'gap-3 px-3'
                      }
                      py-2.5
                      rounded-xl
                      text-sm
                      font-semibold
                      transition-all
                      duration-200
                      ${
                        customerActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/30'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                      }
                    `}
                  >

                    <div
                      className={`
                        w-8
                        h-8
                        rounded-lg
                        flex
                        items-center
                        justify-center
                        shrink-0
                        transition-colors
                        ${
                          customerActive
                            ? 'bg-white/15'
                            : 'bg-slate-900 group-hover:bg-slate-800'
                        }
                      `}
                    >
                      <Icon className="w-[17px] h-[17px]" />
                    </div>

                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">
                          Customers
                        </span>

                        <ChevronDown
                          className={`
                            w-4
                            h-4
                            shrink-0
                            transition-transform
                            duration-200
                            ${
                              customersOpen
                                ? 'rotate-180'
                                : ''
                            }
                          `}
                        />
                      </>
                    )}

                  </button>

                  {/* EXPANDED CUSTOMER DROPDOWN */}

                  {customersOpen &&
                    !sidebarCollapsed && (
                      <div className="mt-1 ml-3 pl-3 border-l border-slate-800 space-y-1">

                        {customerMenuItems.map(
                          (subItem) => {

                            const SubIcon =
                              subItem.icon;

                            return (
                              <NavLink
                                key={subItem.name}
                                to={subItem.path}
                                onClick={
                                  handleCustomerSubItemClick
                                }
                                className={({ isActive }) =>
                                  `
                                  group
                                  flex
                                  items-center
                                  gap-3
                                  px-3
                                  py-2.5
                                  rounded-lg
                                  text-xs
                                  font-semibold
                                  transition-all
                                  duration-200
                                  ${
                                    isActive
                                      ? 'bg-indigo-500/15 text-indigo-300'
                                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                                  }
                                  `
                                }
                              >
                                {({ isActive }) => (
                                  <>

                                    <div
                                      className={`
                                        w-7
                                        h-7
                                        rounded-md
                                        flex
                                        items-center
                                        justify-center
                                        shrink-0
                                        ${
                                          isActive
                                            ? 'bg-indigo-500/20 text-indigo-300'
                                            : 'bg-slate-900 text-slate-500 group-hover:text-slate-300'
                                        }
                                      `}
                                    >
                                      <SubIcon className="w-3.5 h-3.5" />
                                    </div>

                                    <span className="truncate">
                                      {subItem.name}
                                    </span>

                                  </>
                                )}
                              </NavLink>
                            );
                          }
                        )}

                      </div>
                    )}

                  {/* COLLAPSED CUSTOMER DROPDOWN */}

                  {customersOpen &&
                    sidebarCollapsed && (
                      <div
                        className="
                          absolute
                          left-[64px]
                          top-0
                          w-64
                          bg-slate-950
                          border
                          border-slate-800
                          rounded-xl
                          shadow-2xl
                          p-2
                          z-50
                        "
                      >

                        <div className="px-3 py-2 mb-1 border-b border-slate-800">

                          <p className="text-xs font-black text-white">
                            Customers
                          </p>

                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Customer Management
                          </p>

                        </div>

                        {customerMenuItems.map(
                          (subItem) => {

                            const SubIcon =
                              subItem.icon;

                            return (
                              <NavLink
                                key={subItem.name}
                                to={subItem.path}
                                onClick={() => {
                                  setMobileOpen(false);
                                }}
                                className={({ isActive }) =>
                                  `
                                  group
                                  flex
                                  items-center
                                  gap-3
                                  px-3
                                  py-2.5
                                  rounded-lg
                                  text-xs
                                  font-semibold
                                  transition
                                  ${
                                    isActive
                                      ? 'bg-indigo-600 text-white'
                                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                                  }
                                  `
                                }
                              >
                                {({ isActive }) => (
                                  <>

                                    <div
                                      className={`
                                        w-8
                                        h-8
                                        rounded-lg
                                        flex
                                        items-center
                                        justify-center
                                        ${
                                          isActive
                                            ? 'bg-white/15'
                                            : 'bg-slate-900 group-hover:bg-slate-800'
                                        }
                                      `}
                                    >
                                      <SubIcon className="w-4 h-4" />
                                    </div>

                                    <span>
                                      {subItem.name}
                                    </span>

                                  </>
                                )}
                              </NavLink>
                            );
                          }
                        )}

                      </div>
                    )}

                </div>
              );
            }

            // ======================================
            // SALES SPECIAL MENU
            // ======================================

            if (
              item.hasChildren &&
              item.menuType === 'sales'
            ) {

              const salesActive =
                isSalesRouteActive();

              return (
                <div
                  key={item.name}
                  className="relative"
                >

                  {/* SALES MAIN BUTTON */}

                  <button
                    type="button"
                    onClick={handleSalesClick}
                    title={
                      sidebarCollapsed
                        ? 'Sales'
                        : undefined
                    }
                    className={`
                      group
                      w-full
                      flex
                      items-center
                      ${
                        sidebarCollapsed
                          ? 'justify-center px-2'
                          : 'gap-3 px-3'
                      }
                      py-2.5
                      rounded-xl
                      text-sm
                      font-semibold
                      transition-all
                      duration-200
                      ${
                        salesActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/30'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                      }
                    `}
                  >

                    <div
                      className={`
                        w-8
                        h-8
                        rounded-lg
                        flex
                        items-center
                        justify-center
                        shrink-0
                        transition-colors
                        ${
                          salesActive
                            ? 'bg-white/15'
                            : 'bg-slate-900 group-hover:bg-slate-800'
                        }
                      `}
                    >
                      <Icon className="w-[17px] h-[17px]" />
                    </div>

                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">
                          Sales
                        </span>

                        <ChevronDown
                          className={`
                            w-4
                            h-4
                            shrink-0
                            transition-transform
                            duration-200
                            ${
                              salesOpen
                                ? 'rotate-180'
                                : ''
                            }
                          `}
                        />
                      </>
                    )}

                  </button>

                  {/* EXPANDED SALES DROPDOWN */}

                  {salesOpen &&
                    !sidebarCollapsed && (
                      <div className="mt-1 ml-3 pl-3 border-l border-slate-800 space-y-1">

                        {salesMenuItems.map(
                          (subItem) => {

                            const SubIcon =
                              subItem.icon;

                            return (
                              <NavLink
                                key={subItem.name}
                                to={subItem.path}
                                onClick={
                                  handleSalesSubItemClick
                                }
                                className={({ isActive }) =>
                                  `
                                  group
                                  flex
                                  items-center
                                  gap-3
                                  px-3
                                  py-2.5
                                  rounded-lg
                                  text-xs
                                  font-semibold
                                  transition-all
                                  duration-200
                                  ${
                                    isActive
                                      ? 'bg-indigo-500/15 text-indigo-300'
                                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                                  }
                                  `
                                }
                              >
                                {({ isActive }) => (
                                  <>

                                    <div
                                      className={`
                                        w-7
                                        h-7
                                        rounded-md
                                        flex
                                        items-center
                                        justify-center
                                        shrink-0
                                        ${
                                          isActive
                                            ? 'bg-indigo-500/20 text-indigo-300'
                                            : 'bg-slate-900 text-slate-500 group-hover:text-slate-300'
                                        }
                                      `}
                                    >
                                      <SubIcon className="w-3.5 h-3.5" />
                                    </div>

                                    <span className="truncate">
                                      {subItem.name}
                                    </span>

                                  </>
                                )}
                              </NavLink>
                            );
                          }
                        )}

                      </div>
                    )}

                  {/* COLLAPSED SALES DROPDOWN */}

                  {salesOpen &&
                    sidebarCollapsed && (
                      <div
                        className="
                          absolute
                          left-[64px]
                          top-0
                          w-64
                          bg-slate-950
                          border
                          border-slate-800
                          rounded-xl
                          shadow-2xl
                          p-2
                          z-50
                        "
                      >

                        <div className="px-3 py-2 mb-1 border-b border-slate-800">

                          <p className="text-xs font-black text-white">
                            Sales
                          </p>

                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Cash Sales Management
                          </p>

                        </div>

                        {salesMenuItems.map(
                          (subItem) => {

                            const SubIcon =
                              subItem.icon;

                            return (
                              <NavLink
                                key={subItem.name}
                                to={subItem.path}
                                onClick={() => {
                                  setMobileOpen(false);
                                }}
                                className={({ isActive }) =>
                                  `
                                  group
                                  flex
                                  items-center
                                  gap-3
                                  px-3
                                  py-2.5
                                  rounded-lg
                                  text-xs
                                  font-semibold
                                  transition
                                  ${
                                    isActive
                                      ? 'bg-indigo-600 text-white'
                                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                                  }
                                  `
                                }
                              >
                                {({ isActive }) => (
                                  <>

                                    <div
                                      className={`
                                        w-8
                                        h-8
                                        rounded-lg
                                        flex
                                        items-center
                                        justify-center
                                        ${
                                          isActive
                                            ? 'bg-white/15'
                                            : 'bg-slate-900 group-hover:bg-slate-800'
                                        }
                                      `}
                                    >
                                      <SubIcon className="w-4 h-4" />
                                    </div>

                                    <span>
                                      {subItem.name}
                                    </span>

                                  </>
                                )}
                              </NavLink>
                            );
                          }
                        )}

                      </div>
                    )}

                </div>
              );
            }

            // ======================================
            // INSTALLMENTS SPECIAL MENU
            // ======================================

            if (
              item.hasChildren &&
              item.menuType === 'installments'
            ) {

              const installmentActive =
                isInstallmentRouteActive();

              return (
                <div
                  key={item.name}
                  className="relative"
                >

                  {/* INSTALLMENTS MAIN BUTTON */}

                  <button
                    type="button"
                    onClick={handleInstallmentsClick}
                    title={
                      sidebarCollapsed
                        ? 'Installments'
                        : undefined
                    }
                    className={`
                      group
                      w-full
                      flex
                      items-center
                      ${
                        sidebarCollapsed
                          ? 'justify-center px-2'
                          : 'gap-3 px-3'
                      }
                      py-2.5
                      rounded-xl
                      text-sm
                      font-semibold
                      transition-all
                      duration-200
                      ${
                        installmentActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/30'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                      }
                    `}
                  >

                    <div
                      className={`
                        w-8
                        h-8
                        rounded-lg
                        flex
                        items-center
                        justify-center
                        shrink-0
                        transition-colors
                        ${
                          installmentActive
                            ? 'bg-white/15'
                            : 'bg-slate-900 group-hover:bg-slate-800'
                        }
                      `}
                    >
                      <Icon className="w-[17px] h-[17px]" />
                    </div>

                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">
                          Installments
                        </span>

                        <ChevronDown
                          className={`
                            w-4
                            h-4
                            shrink-0
                            transition-transform
                            duration-200
                            ${
                              installmentsOpen
                                ? 'rotate-180'
                                : ''
                            }
                          `}
                        />
                      </>
                    )}

                  </button>

                  {/* EXPANDED INSTALLMENT DROPDOWN */}

                  {installmentsOpen &&
                    !sidebarCollapsed && (
                      <div className="mt-1 ml-3 pl-3 border-l border-slate-800 space-y-1">

                        {installmentMenuItems.map(
                          (subItem) => {

                            const SubIcon =
                              subItem.icon;

                            return (
                              <NavLink
                                key={subItem.name}
                                to={subItem.path}
                                onClick={
                                  handleInstallmentSubItemClick
                                }
                                className={({ isActive }) =>
                                  `
                                  group
                                  flex
                                  items-center
                                  gap-3
                                  px-3
                                  py-2.5
                                  rounded-lg
                                  text-xs
                                  font-semibold
                                  transition-all
                                  duration-200
                                  ${
                                    isActive
                                      ? 'bg-indigo-500/15 text-indigo-300'
                                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                                  }
                                  `
                                }
                              >
                                {({ isActive }) => (
                                  <>

                                    <div
                                      className={`
                                        w-7
                                        h-7
                                        rounded-md
                                        flex
                                        items-center
                                        justify-center
                                        shrink-0
                                        ${
                                          isActive
                                            ? 'bg-indigo-500/20 text-indigo-300'
                                            : 'bg-slate-900 text-slate-500 group-hover:text-slate-300'
                                        }
                                      `}
                                    >
                                      <SubIcon className="w-3.5 h-3.5" />
                                    </div>

                                    <span className="truncate">
                                      {subItem.name}
                                    </span>

                                  </>
                                )}
                              </NavLink>
                            );
                          }
                        )}

                      </div>
                    )}

                  {/* COLLAPSED INSTALLMENT DROPDOWN */}

                  {installmentsOpen &&
                    sidebarCollapsed && (
                      <div
                        className="
                          absolute
                          left-[64px]
                          top-0
                          w-64
                          bg-slate-950
                          border
                          border-slate-800
                          rounded-xl
                          shadow-2xl
                          p-2
                          z-50
                        "
                      >

                        <div className="px-3 py-2 mb-1 border-b border-slate-800">

                          <p className="text-xs font-black text-white">
                            Installments
                          </p>

                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Installment Management
                          </p>

                        </div>

                        {installmentMenuItems.map(
                          (subItem) => {

                            const SubIcon =
                              subItem.icon;

                            return (
                              <NavLink
                                key={subItem.name}
                                to={subItem.path}
                                onClick={() => {
                                  setMobileOpen(false);
                                }}
                                className={({ isActive }) =>
                                  `
                                  group
                                  flex
                                  items-center
                                  gap-3
                                  px-3
                                  py-2.5
                                  rounded-lg
                                  text-xs
                                  font-semibold
                                  transition
                                  ${
                                    isActive
                                      ? 'bg-indigo-600 text-white'
                                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                                  }
                                  `
                                }
                              >
                                {({ isActive }) => (
                                  <>

                                    <div
                                      className={`
                                        w-8
                                        h-8
                                        rounded-lg
                                        flex
                                        items-center
                                        justify-center
                                        ${
                                          isActive
                                            ? 'bg-white/15'
                                            : 'bg-slate-900 group-hover:bg-slate-800'
                                        }
                                      `}
                                    >
                                      <SubIcon className="w-4 h-4" />
                                    </div>

                                    <span>
                                      {subItem.name}
                                    </span>

                                  </>
                                )}
                              </NavLink>
                            );
                          }
                        )}

                      </div>
                    )}

                </div>
              );
            }

            // ======================================
            // NORMAL MENU ITEMS
            // ======================================

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => {
                  setMobileOpen(false);
                  setCustomersOpen(false);
                  setSalesOpen(false);
                  setInstallmentsOpen(false);
                }}
                title={
                  sidebarCollapsed
                    ? item.name
                    : undefined
                }
                className={({ isActive }) =>
                  `
                  group
                  flex
                  items-center
                  ${
                    sidebarCollapsed
                      ? 'justify-center px-2'
                      : 'gap-3 px-3'
                  }
                  py-2.5
                  rounded-xl
                  text-sm
                  font-semibold
                  transition-all
                  duration-200
                  ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/30'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }
                  `
                }
              >
                {({ isActive }) => (
                  <>

                    <div
                      className={`
                        w-8
                        h-8
                        rounded-lg
                        flex
                        items-center
                        justify-center
                        shrink-0
                        transition-colors
                        ${
                          isActive
                            ? 'bg-white/15'
                            : 'bg-slate-900 group-hover:bg-slate-800'
                        }
                      `}
                    >
                      <Icon className="w-[17px] h-[17px]" />
                    </div>

                    {!sidebarCollapsed && (
                      <span className="truncate">
                        {item.name}
                      </span>
                    )}

                  </>
                )}
              </NavLink>
            );
          })}

        </div>

      </nav>

      {/* ======================================
          ADMIN DETAILS
      ====================================== */}

      <div
        className={`
          border-t border-slate-800/80
          shrink-0
          transition-all
          duration-200
          ${
            sidebarCollapsed
              ? 'p-2'
              : 'p-3'
          }
        `}
      >

        {sidebarCollapsed ? (

          <button
            onClick={handleLogoutClick}
            title={`Logout ${admin?.email || ''}`}
            className="
              w-full
              h-10
              flex
              items-center
              justify-center
              rounded-xl
              text-slate-400
              hover:text-red-400
              hover:bg-red-500/10
              transition
            "
          >
            <LogOut className="w-4 h-4" />
          </button>

        ) : (

          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">

            <div className="flex items-center gap-3">

              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">

                <Users className="w-4 h-4 text-slate-300" />

              </div>

              <div className="min-w-0 flex-1">

                <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                  Logged in as
                </p>

                <p className="text-xs font-bold text-slate-200 truncate mt-0.5">
                  {admin?.email || 'Administrator'}
                </p>

              </div>

              <button
                onClick={handleLogoutClick}
                className="
                  w-8
                  h-8
                  flex
                  items-center
                  justify-center
                  rounded-lg
                  text-slate-400
                  hover:text-red-400
                  hover:bg-red-500/10
                  transition
                  shrink-0
                "
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>

            </div>

          </div>

        )}

      </div>

    </div>
  );

  // ==========================================
  // MAIN LAYOUT
  // ==========================================

  return (
    <div className="h-screen bg-slate-100 flex overflow-hidden">

      {/* ======================================
          DESKTOP SIDEBAR
      ====================================== */}

      <aside
        className={`
          hidden
          lg:flex
          flex-col
          shrink-0
          h-full
          border-r
          border-slate-800
          z-20
          transition-all
          duration-200
          ${
            sidebarCollapsed
              ? 'w-[76px]'
              : 'w-64'
          }
        `}
      >
        {sidebarContent}
      </aside>

      {/* ======================================
          MOBILE DRAWER
      ====================================== */}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">

          {/* Overlay */}

          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
            onClick={() =>
              setMobileOpen(false)
            }
          />

          {/* Drawer */}

          <div className="relative flex flex-col w-72 max-w-[85vw] bg-slate-950 shadow-2xl">

            {/* Close */}

            <button
              onClick={() =>
                setMobileOpen(false)
              }
              className="
                absolute
                top-4
                right-4
                z-50
                w-8
                h-8
                rounded-lg
                flex
                items-center
                justify-center
                text-slate-400
                bg-slate-900
                border
                border-slate-800
                hover:text-white
                hover:bg-slate-800
                transition
              "
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>

            {sidebarContent}

          </div>

        </div>
      )}

      {/* ======================================
          MAIN CONTENT
      ====================================== */}

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">

        <ConfirmModal
          isOpen={logoutModalOpen}
          onClose={() =>
            setLogoutModalOpen(false)
          }
          onConfirm={confirmLogout}
          title="Confirm Logout"
          message="Are you sure you want to log out of your session?"
        />

        {/* ====================================
            HEADER
        ==================================== */}

        <header
          className="
            bg-white
            border-b
            border-slate-200
            px-4
            sm:px-6
            py-3.5
            flex
            items-center
            justify-between
            sticky
            top-0
            z-30
            shrink-0
          "
        >

          <div className="flex items-center gap-3 min-w-0">

            {/* MOBILE MENU */}

            <button
              onClick={() =>
                setMobileOpen(true)
              }
              className="
                lg:hidden
                w-10
                h-10
                flex
                items-center
                justify-center
                rounded-xl
                text-slate-600
                bg-slate-50
                border
                border-slate-200
                hover:bg-slate-100
                transition
              "
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* DESKTOP SIDEBAR TOGGLE */}

            <button
              onClick={() =>
                setSidebarCollapsed(
                  !sidebarCollapsed
                )
              }
              className="
                hidden
                lg:flex
                w-10
                h-10
                items-center
                justify-center
                rounded-xl
                text-slate-500
                bg-slate-50
                border
                border-slate-200
                hover:text-indigo-600
                hover:bg-indigo-50
                hover:border-indigo-100
                transition
              "
              title={
                sidebarCollapsed
                  ? 'Show Sidebar'
                  : 'Hide Sidebar'
              }
              aria-label={
                sidebarCollapsed
                  ? 'Show Sidebar'
                  : 'Hide Sidebar'
              }
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>

            {/* SHOP NAME */}

            <div className="min-w-0">

              <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-slate-400">
                Management System
              </p>

              <h1 className="text-base sm:text-lg font-black text-slate-800 truncate">
                {settings?.shopName || 'Electronics Shop'}
              </h1>

            </div>

          </div>

          {/* CURRENCY */}

          <div
            className="
              flex
              items-center
              gap-2
              bg-slate-50
              border
              border-slate-200
              px-3
              sm:px-4
              py-2
              rounded-xl
              shrink-0
            "
          >

            <span className="hidden sm:inline text-[10px] uppercase tracking-wide font-bold text-slate-400">
              Currency
            </span>

            <span className="text-xs sm:text-sm font-black text-indigo-600">
              {settings?.currency || 'PKR'}
            </span>

          </div>

        </header>

        {/* ====================================
            PAGE CONTENT
        ==================================== */}

        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          {children}
        </main>

      </div>

    </div>
  );
};