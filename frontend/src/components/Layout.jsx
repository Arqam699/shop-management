import React, { useEffect, useState } from 'react';
import {
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';

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
  Sparkles,
  CircleUserRound,
} from 'lucide-react';


/* =====================================================
   REUSABLE SIDEBAR MENU ITEM
===================================================== */

const SidebarMenuItem = ({
  item,
  sidebarCollapsed,
  isOpen,
  isAnyMenuOpen,
  onToggle,
  onNavigate,
}) => {
  const location = useLocation();

  const Icon = item.icon;


  /* =====================================================
     CHECK ACTIVE ROUTE
  ===================================================== */

  const isSubmenuItemActive = (path) => {
    const [childPath, childQuery] = path.split('?');

    if (location.pathname !== childPath) return false;

    // The cash-sale and installment-sale routes share a pathname, so query
    // parameters must also match to avoid highlighting both links.
    return !childQuery || location.search === `?${childQuery}`;
  };

  const isChildActive = item.children?.some((child) =>
    isSubmenuItemActive(child.path)
  );

  // Keep a dropdown visibly selected as soon as it is opened. Once a submenu
  // route is selected, the route itself keeps that parent selected as well.
  const isMenuActive = Boolean(
    isOpen || (!isAnyMenuOpen && isChildActive)
  );


  /* =====================================================
     NORMAL NAVIGATION ITEM
  ===================================================== */

  if (!item.children) {
    return (
      <NavLink
        to={item.path}
        end
        onClick={() => onNavigate(false)}
        title={sidebarCollapsed ? item.name : undefined}
        className={({ isActive }) => `
          group
          relative
          flex
          items-center
          min-h-[52px]
          w-full
          overflow-hidden
          rounded-2xl
          transition-all
          duration-300
          ease-out
          ${
            sidebarCollapsed
              ? 'justify-center px-2'
              : 'gap-3 px-3.5'
          }
          ${
            isActive && !isAnyMenuOpen
              ? `
                bg-gradient-to-r
                from-blue-600
                via-indigo-600
                to-violet-600
                text-white
                shadow-lg
                shadow-blue-950/40
              `
              : `
                text-slate-400
                hover:text-white
                hover:bg-white/[0.055]
              `
          }
        `}
      >
        {({ isActive }) => (
          <>
            {/* Animated Background */}

            {(!isActive || isAnyMenuOpen) && (
              <span
                className="
                  absolute
                  inset-0
                  translate-x-[-105%]
                  bg-gradient-to-r
                  from-transparent
                  via-white/[0.04]
                  to-transparent
                  group-hover:translate-x-[105%]
                  transition-transform
                  duration-700
                "
              />
            )}


            {/* Active Left Indicator */}

            {isActive && !isAnyMenuOpen && !sidebarCollapsed && (
              <span
                className="
                  absolute
                  left-0
                  top-1/2
                  -translate-y-1/2
                  w-[3px]
                  h-7
                  rounded-r-full
                  bg-white
                  shadow-lg
                  shadow-white/30
                "
              />
            )}


            {/* ICON */}

            <div
              className={`
                relative
                z-10
                w-9
                h-9
                shrink-0
                rounded-xl
                flex
                items-center
                justify-center
                transition-all
                duration-300
                ${
                  isActive && !isAnyMenuOpen
                    ? `
                      bg-white/15
                      shadow-inner
                      scale-105
                    `
                    : `
                      bg-white/[0.045]
                      text-slate-400
                      group-hover:text-blue-300
                      group-hover:bg-blue-500/10
                      group-hover:scale-105
                    `
                }
              `}
            >
              <Icon className="w-[18px] h-[18px]" />
            </div>


            {/* TEXT */}

            {!sidebarCollapsed && (
              <span
                className="
                  relative
                  z-10
                  flex-1
                  truncate
                  text-left
                  tracking-[0.01em]
                "
              >
                {item.name}
              </span>
            )}


            {/* Active Glow */}

            {isActive && !isAnyMenuOpen && (
              <span
                className="
                  absolute
                  right-4
                  w-1.5
                  h-1.5
                  rounded-full
                  bg-white
                  shadow-[0_0_12px_rgba(255,255,255,0.9)]
                  animate-pulse
                "
              />
            )}
          </>
        )}
      </NavLink>
    );
  }


  /* =====================================================
     MENU WITH CHILDREN
  ===================================================== */

  return (
    <div className="relative">

      {/* MAIN MENU */}

      <button
        type="button"
        onClick={onToggle}
        title={sidebarCollapsed ? item.name : undefined}
        className={`
          group
          relative
          flex
          items-center
          min-h-[52px]
          w-full
          overflow-hidden
          rounded-2xl
          transition-all
          duration-300
          ease-out
          ${
            sidebarCollapsed
              ? 'justify-center px-2'
              : 'gap-3 px-3.5'
          }
          ${
            isMenuActive
              ? `
                bg-gradient-to-r
                from-blue-600
                via-indigo-600
                to-violet-600
                text-white
                shadow-lg
                shadow-blue-950/40
              `
              : `
                text-slate-400
                hover:text-white
                hover:bg-white/[0.055]
              `
          }
        `}
      >

        {/* Hover Sweep */}

        {!isMenuActive && (
          <span
            className="
              absolute
              inset-0
              translate-x-[-110%]
              bg-gradient-to-r
              from-transparent
              via-white/[0.04]
              to-transparent
              group-hover:translate-x-[110%]
              transition-transform
              duration-700
            "
          />
        )}


        {/* Active Indicator */}

        {isMenuActive && !sidebarCollapsed && (
          <span
            className="
              absolute
              left-0
              top-1/2
              -translate-y-1/2
              w-[3px]
              h-7
              rounded-r-full
              bg-white
            "
          />
        )}


        {/* ICON */}

        <div
          className={`
            relative
            z-10
            w-9
            h-9
            shrink-0
            rounded-xl
            flex
            items-center
            justify-center
            transition-all
            duration-300
            ${
              isMenuActive
                ? 'bg-white/15 scale-105'
                : `
                  bg-white/[0.045]
                  group-hover:bg-blue-500/10
                  group-hover:text-blue-300
                  group-hover:scale-105
                `
            }
          `}
        >
          <Icon className="w-[18px] h-[18px]" />
        </div>


        {!sidebarCollapsed && (
          <>
            <span
              className="
                relative
                z-10
                flex-1
                truncate
                text-left
              "
            >
              {item.name}
            </span>


            <ChevronDown
              className={`
                relative
                z-10
                w-4
                h-4
                shrink-0
                transition-all
                duration-300
                ${
                  isOpen
                    ? 'rotate-180 text-white'
                    : ''
                }
              `}
            />
          </>
        )}

      </button>


      {/* =================================================
         EXPANDED ACCORDION
      ================================================= */}

      {!sidebarCollapsed && (
        <div
          className={`
            grid
            transition-all
            duration-500
            ease-[cubic-bezier(0.16,1,0.3,1)]
            ${
              isOpen
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0'
            }
          `}
        >
          <div className="overflow-hidden">

            <div
              className="
                relative
                mt-2
                ml-5
                pl-4
                pb-1
                border-l
                border-white/[0.07]
                space-y-1
              "
            >

              {item.children.map((subItem, index) => {
                const SubIcon = subItem.icon;
                const isSubItemActive = isSubmenuItemActive(subItem.path);

                return (
                  <NavLink
                    key={subItem.name}
                    to={subItem.path}
                    end
                    onClick={() => onNavigate(true)}
                    style={{
                      transitionDelay: isOpen
                        ? `${index * 45}ms`
                        : '0ms',
                    }}
                    className={() => `
                      group
                      relative
                      flex
                      items-center
                      gap-3
                      px-3
                      py-2.5
                      rounded-xl
                      text-xs
                      font-semibold
                      transition-all
                      duration-300
                      ${
                        isOpen
                          ? `
                            translate-x-0
                            opacity-100
                          `
                          : `
                            -translate-x-2
                            opacity-0
                          `
                      }
                      ${
                        isSubItemActive
                          ? `
                            bg-blue-500/10
                            text-blue-300
                          `
                          : `
                            text-slate-500
                            hover:text-white
                            hover:bg-white/[0.045]
                            hover:translate-x-1
                          `
                      }
                    `}
                  >
                    {() => (
                      <>
                        {/* Active Dot */}

                        {isSubItemActive && (
                          <span
                            className="
                              absolute
                              -left-[21px]
                              w-2
                              h-2
                              rounded-full
                              bg-blue-400
                              shadow-[0_0_10px_rgba(96,165,250,0.9)]
                            "
                          />
                        )}


                        {/* SUB ICON */}

                        <div
                          className={`
                            w-7
                            h-7
                            shrink-0
                            rounded-lg
                            flex
                            items-center
                            justify-center
                            transition-all
                            duration-300
                            ${
                              isSubItemActive
                                ? `
                                  bg-blue-500/15
                                  text-blue-300
                                `
                                : `
                                  bg-white/[0.035]
                                  text-slate-500
                                  group-hover:bg-white/[0.07]
                                  group-hover:text-slate-300
                                `
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
              })}

            </div>

          </div>
        </div>
      )}


      {/* =================================================
         COLLAPSED FLOATING MENU
      ================================================= */}

      {sidebarCollapsed && isOpen && (
        <div
          className="
            absolute
            left-[68px]
            top-0
            w-64
            p-2.5
            rounded-2xl
            bg-slate-950/95
            backdrop-blur-2xl
            border
            border-white/[0.08]
            shadow-2xl
            shadow-black/50
            z-50
            origin-left
            animate-[menuPop_0.25s_cubic-bezier(0.16,1,0.3,1)]
          "
        >

          <div
            className="
              px-3
              py-3
              mb-2
              rounded-xl
              bg-gradient-to-r
              from-blue-500/10
              to-violet-500/10
              border
              border-white/[0.05]
            "
          >

            <p className="text-xs font-black text-white">
              {item.name}
            </p>

            <p className="text-[10px] text-slate-500 mt-1">
              {item.description}
            </p>

          </div>


          <div className="space-y-1">

            {item.children.map((subItem) => {
              const SubIcon = subItem.icon;
              const isSubItemActive = isSubmenuItemActive(subItem.path);

              return (
                <NavLink
                  key={subItem.name}
                  to={subItem.path}
                  end
                  onClick={() => onNavigate(true)}
                  className={() => `
                    group
                    flex
                    items-center
                    gap-3
                    px-3
                    py-2.5
                    rounded-xl
                    text-xs
                    font-semibold
                    transition-all
                    duration-300
                    ${
                      isSubItemActive
                        ? `
                          bg-gradient-to-r
                          from-blue-600
                          to-violet-600
                          text-white
                          shadow-lg
                          shadow-blue-950/30
                        `
                        : `
                          text-slate-400
                          hover:text-white
                          hover:bg-white/[0.05]
                        `
                    }
                  `}
                >
                  {() => (
                    <>
                      <div
                        className={`
                          w-8
                          h-8
                          rounded-lg
                          flex
                          items-center
                          justify-center
                          transition-all
                          ${
                            isSubItemActive
                              ? 'bg-white/15'
                              : 'bg-white/[0.04] group-hover:bg-white/[0.08]'
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
            })}

          </div>

        </div>
      )}

    </div>
  );
};


/* =====================================================
   MAIN LAYOUT
===================================================== */

export const Layout = ({ children }) => {

  const { admin, logout } = useAuth();
  const { settings } = useSettings();

  const navigate = useNavigate();


  /* =====================================================
     STATES
  ===================================================== */

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [logoutModalOpen, setLogoutModalOpen] =
    useState(false);

  const [openMenu, setOpenMenu] =
    useState(null);


  /* =====================================================
     ESC KEY
  ===================================================== */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setOpenMenu(null);
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, []);


  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogoutClick = () => {
    setLogoutModalOpen(true);
  };


  const confirmLogout = async () => {
    await logout();

    setLogoutModalOpen(false);

    navigate('/login');
  };


  /* =====================================================
     NAVIGATION
  ===================================================== */

  const handleNavigation = (keepMenuOpen = false) => {
    setMobileOpen(false);

    if (!keepMenuOpen) {
      setOpenMenu(null);
    }
  };


  const toggleMenu = (menuName) => {
    setOpenMenu((currentMenu) =>
      currentMenu === menuName
        ? null
        : menuName
    );
  };


  /* =====================================================
     NAVIGATION ITEMS
  ===================================================== */

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
      icon: Users,
      description: 'Customer Management',

      children: [
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
      ],
    },

    {
      name: 'Sales',
      icon: ShoppingCart,
      description: 'Cash Sales Management',

      children: [
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
      ],
    },

    {
      name: 'Installments',
      icon: Layers,
      description: 'Installment Management',

      children: [
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
      ],
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


  /* =====================================================
     SIDEBAR CONTENT
  ===================================================== */

  const sidebarContent = (

    <div
      className="
        relative
        flex
        flex-col
        h-full
        overflow-hidden
        text-white
        bg-gradient-to-b
        from-[#080d1b]
        via-[#0b1020]
        to-[#060913]
      "
    >


      {/* AMBIENT BACKGROUND GLOWS */}

      <div
        className="
          pointer-events-none
          absolute
          -top-40
          -left-32
          w-80
          h-80
          rounded-full
          bg-blue-600/10
          blur-3xl
          animate-pulse
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          top-1/3
          -right-40
          w-80
          h-80
          rounded-full
          bg-violet-600/10
          blur-3xl
        "
      />


      {/* =================================================
         BRAND
      ================================================= */}

      <div
        className={`
          relative
          z-10
          shrink-0
          border-b
          border-white/[0.06]
          transition-all
          duration-300
          ${
            sidebarCollapsed
              ? 'p-3'
              : 'px-5 py-5'
          }
        `}
      >

        {sidebarCollapsed ? (

          <div className="flex justify-center">

            <div
              className="
                relative
                w-11
                h-11
                rounded-2xl
                flex
                items-center
                justify-center
                bg-gradient-to-br
                from-blue-500
                via-indigo-500
                to-violet-600
                shadow-xl
                shadow-blue-950/50
              "
            >

              <div
                className="
                  absolute
                  inset-0
                  rounded-2xl
                  bg-white/10
                  animate-pulse
                "
              />

              <ShieldCheck className="
                relative
                z-10
                w-5
                h-5
                text-white
              " />

            </div>

          </div>

        ) : (

          <div className="flex items-center gap-3.5">

            <div
              className="
                relative
                w-11
                h-11
                shrink-0
                rounded-2xl
                flex
                items-center
                justify-center
                bg-gradient-to-br
                from-blue-500
                via-indigo-500
                to-violet-600
                shadow-xl
                shadow-blue-950/50
              "
            >

              <ShieldCheck className="
                relative
                z-10
                w-5
                h-5
                text-white
              " />

            </div>


            <div className="min-w-0">

              <h2
                className="
                  text-sm
                  font-black
                  tracking-tight
                  text-white
                  truncate
                "
              >
                {settings?.shopName || 'Electronics Shop'}
              </h2>


              <div className="
                flex
                items-center
                gap-2
                mt-1
              ">

                <span className="
                  relative
                  flex
                  w-2
                  h-2
                ">

                  <span className="
                    absolute
                    inline-flex
                    w-full
                    h-full
                    rounded-full
                    bg-emerald-400
                    opacity-70
                    animate-ping
                  " />

                  <span className="
                    relative
                    inline-flex
                    w-2
                    h-2
                    rounded-full
                    bg-emerald-400
                  " />

                </span>


                <span className="
                  text-[10px]
                  uppercase
                  tracking-[0.14em]
                  font-bold
                  text-slate-500
                ">
                  Admin Console
                </span>

              </div>

            </div>

          </div>

        )}

      </div>


      {/* =================================================
         NAVIGATION
      ================================================= */}

      <nav
        className={`
          relative
          z-10
          flex-1
          overflow-y-auto
          transition-all
          duration-300
          ${
            sidebarCollapsed
              ? 'p-2.5'
              : 'p-3.5'
          }
        `}
      >

        {!sidebarCollapsed && (

          <div
            className="
              flex
              items-center
              gap-2
              px-3
              pt-1
              pb-3
            "
          >

            <Sparkles className="
              w-3
              h-3
              text-blue-400
            " />

            <p className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.18em]
              text-slate-600
            ">
              Navigation
            </p>

          </div>

        )}


        <div className="space-y-1.5">

          {navItems.map((item) => (

            <SidebarMenuItem
              key={item.name}
              item={item}
              sidebarCollapsed={sidebarCollapsed}
              isOpen={openMenu === item.name}
              isAnyMenuOpen={Boolean(openMenu)}
              onToggle={() =>
                toggleMenu(item.name)
              }
              onNavigate={handleNavigation}
            />

          ))}

        </div>

      </nav>


      {/* =================================================
         USER PANEL
      ================================================= */}

      <div
        className={`
          relative
          z-10
          shrink-0
          border-t
          border-white/[0.06]
          transition-all
          duration-300
          ${
            sidebarCollapsed
              ? 'p-2.5'
              : 'p-3.5'
          }
        `}
      >

        {sidebarCollapsed ? (

          <button
            onClick={handleLogoutClick}
            title={`Logout ${admin?.email || ''}`}
            className="
              group
              relative
              w-full
              h-11
              flex
              items-center
              justify-center
              rounded-2xl
              text-slate-500
              bg-white/[0.025]
              hover:text-rose-400
              hover:bg-rose-500/10
              transition-all
              duration-300
            "
          >

            <LogOut
              className="
                w-[18px]
                h-[18px]
                transition-transform
                duration-300
                group-hover:translate-x-0.5
              "
            />

          </button>

        ) : (

          <div
            className="
              p-3
              rounded-2xl
              bg-white/[0.035]
              border
              border-white/[0.06]
              backdrop-blur-sm
            "
          >

            <div className="
              flex
              items-center
              gap-3
            ">


              {/* USER AVATAR */}

              <div
                className="
                  w-10
                  h-10
                  shrink-0
                  rounded-xl
                  flex
                  items-center
                  justify-center
                  bg-gradient-to-br
                  from-blue-500/20
                  to-violet-500/20
                  border
                  border-white/[0.06]
                "
              >

                <CircleUserRound
                  className="
                    w-[19px]
                    h-[19px]
                    text-blue-300
                  "
                />

              </div>


              <div className="min-w-0 flex-1">

                <p className="
                  text-[9px]
                  uppercase
                  tracking-wider
                  font-black
                  text-slate-600
                ">
                  Logged in as
                </p>


                <p className="
                  text-xs
                  font-bold
                  text-slate-300
                  truncate
                  mt-0.5
                ">
                  {admin?.email || 'Administrator'}
                </p>

              </div>


              {/* LOGOUT */}

              <button
                onClick={handleLogoutClick}
                title="Logout"
                className="
                  group
                  w-9
                  h-9
                  shrink-0
                  rounded-xl
                  flex
                  items-center
                  justify-center
                  text-slate-500
                  hover:text-rose-400
                  hover:bg-rose-500/10
                  transition-all
                  duration-300
                "
              >

                <LogOut
                  className="
                    w-4
                    h-4
                    transition-transform
                    duration-300
                    group-hover:translate-x-0.5
                  "
                />

              </button>

            </div>

          </div>

        )}

      </div>

    </div>

  );


  /* =====================================================
     RETURN
  ===================================================== */

  return (

    <div
      className="
        relative
        h-screen
        flex
        overflow-hidden
        bg-[#f5f7fb]
      "
    >


      {/* =================================================
         DESKTOP SIDEBAR
      ================================================= */}

      <aside
        className={`
          hidden
          lg:flex
          flex-col
          shrink-0
          h-full
          z-20
          transition-[width]
          duration-500
          ease-[cubic-bezier(0.16,1,0.3,1)]
          ${
            sidebarCollapsed
              ? 'w-[78px]'
              : 'w-[280px]'
          }
        `}
      >

        {sidebarContent}

      </aside>


      {/* =================================================
         MOBILE DRAWER
      ================================================= */}

      <div
        className={`
          fixed
          inset-0
          z-50
          flex
          lg:hidden
          transition-all
          duration-300
          ${
            mobileOpen
              ? `
                opacity-100
                visible
              `
              : `
                opacity-0
                invisible
                pointer-events-none
              `
          }
        `}
      >


        {/* BACKDROP */}

        <div
          onClick={() =>
            setMobileOpen(false)
          }
          className="
            absolute
            inset-0
            bg-slate-950/70
            backdrop-blur-[5px]
          "
        />


        {/* DRAWER */}

        <div
          className={`
            relative
            flex
            flex-col
            w-[300px]
            max-w-[88vw]
            h-full
            shadow-2xl
            shadow-black/60
            transition-transform
            duration-500
            ease-[cubic-bezier(0.16,1,0.3,1)]
            ${
              mobileOpen
                ? 'translate-x-0'
                : '-translate-x-full'
            }
          `}
        >


          {/* CLOSE */}

          <button
            onClick={() =>
              setMobileOpen(false)
            }
            className="
              absolute
              top-4
              right-4
              z-50
              w-9
              h-9
              rounded-xl
              flex
              items-center
              justify-center
              text-slate-400
              bg-white/[0.06]
              border
              border-white/[0.08]
              hover:text-white
              hover:bg-white/[0.1]
              hover:rotate-90
              transition-all
              duration-300
            "
            aria-label="Close menu"
          >

            <X className="w-4 h-4" />

          </button>


          {sidebarContent}

        </div>

      </div>


      {/* =================================================
         MAIN CONTENT
      ================================================= */}

      <div
        className="
          relative
          flex-1
          flex
          flex-col
          min-w-0
          h-screen
          overflow-y-auto
        "
      >


        {/* BACKGROUND BLOBS */}

        <div
          className="
            pointer-events-none
            fixed
            top-0
            right-0
            w-[500px]
            h-[500px]
            rounded-full
            bg-blue-500/[0.035]
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            fixed
            bottom-0
            left-1/3
            w-[400px]
            h-[400px]
            rounded-full
            bg-violet-500/[0.025]
            blur-3xl
          "
        />


        {/* LOGOUT MODAL */}

        <ConfirmModal
          isOpen={logoutModalOpen}
          onClose={() =>
            setLogoutModalOpen(false)
          }
          onConfirm={confirmLogout}
          title="Confirm Logout"
          message="Are you sure you want to log out of your session?"
        />


       <header
  className="
    relative
    z-30
    shrink-0
    flex
    items-center
    justify-between
    px-4
    sm:px-6
    py-4
    bg-white
    border-b
    border-slate-200/70
  "
>
          {/* LEFT */}

          <div className="
            flex
            items-center
            gap-3
            min-w-0
          ">


            {/* MOBILE BUTTON */}

            <button
              onClick={() =>
                setMobileOpen(true)
              }
              className="
                lg:hidden
                w-10
                h-10
                shrink-0
                rounded-xl
                flex
                items-center
                justify-center
                text-slate-600
                bg-white
                border
                border-slate-200
                shadow-sm
                hover:text-blue-600
                hover:border-blue-200
                hover:shadow-md
                hover:scale-[1.03]
                active:scale-95
                transition-all
                duration-300
              "
              aria-label="Open menu"
            >

              <Menu className="w-5 h-5" />

            </button>


            {/* SIDEBAR BUTTON */}

            <button
              onClick={() => {
                setSidebarCollapsed(
                  (previous) => !previous
                );

                setOpenMenu(null);
              }}
              className="
                hidden
                lg:flex
                w-10
                h-10
                shrink-0
                rounded-xl
                items-center
                justify-center
                text-slate-500
                bg-white
                border
                border-slate-200
                shadow-sm
                hover:text-blue-600
                hover:border-blue-200
                hover:bg-blue-50
                hover:shadow-md
                hover:scale-[1.03]
                active:scale-95
                transition-all
                duration-300
              "
              title={
                sidebarCollapsed
                  ? 'Expand Sidebar'
                  : 'Collapse Sidebar'
              }
            >

              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}

            </button>


            {/* TITLE */}

            <div className="min-w-0">

              <div className="
                flex
                items-center
                gap-2
              ">

                <span className="
                  hidden
                  sm:block
                  w-1.5
                  h-1.5
                  rounded-full
                  bg-blue-500
                  animate-pulse
                " />

                <p className="
                  text-[9px]
                  sm:text-[10px]
                  uppercase
                  tracking-[0.16em]
                  font-black
                  text-slate-400
                ">
                  Management System
                </p>

              </div>


              <h1 className="
                mt-0.5
                text-base
                sm:text-xl
                font-black
                tracking-tight
                text-slate-800
                truncate
              ">
                {settings?.shopName || 'Electronics Shop'}
              </h1>

            </div>

          </div>


          {/* CURRENCY CARD */}

          <div
            className="
              group
              flex
              items-center
              gap-2
              px-3
              sm:px-4
              py-2.5
              rounded-xl
              bg-white
              border
              border-slate-200
              shadow-sm
              hover:border-blue-200
              hover:shadow-md
              transition-all
              duration-300
            "
          >

            <span className="
              hidden
              sm:inline
              text-[10px]
              uppercase
              tracking-wider
              font-black
              text-slate-400
            ">
              Currency
            </span>


            <span className="
              text-xs
              sm:text-sm
              font-black
              bg-gradient-to-r
              from-blue-600
              to-violet-600
              bg-clip-text
              text-transparent
            ">
              {settings?.currency || 'PKR'}
            </span>

          </div>

        </header>


        {/* =================================================
           PAGE CONTENT
        ================================================= */}

        <main
          className="
            relative
            z-10
            flex-1
            p-4
            sm:p-5
            lg:p-7
            animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]
          "
        >
          {children}
        </main>

      </div>


      {/* =================================================
         CUSTOM CSS ANIMATIONS
      ================================================= */}

      <style>{`

        @keyframes menuPop {
          from {
            opacity: 0;
            transform: translateX(-8px) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        nav::-webkit-scrollbar {
          width: 5px;
        }

        nav::-webkit-scrollbar-track {
          background: transparent;
        }

        nav::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.15);
          border-radius: 999px;
        }

        nav::-webkit-scrollbar-thumb:hover {
          background: rgba(96, 165, 250, 0.35);
        }

      `}</style>

    </div>
  );
};
