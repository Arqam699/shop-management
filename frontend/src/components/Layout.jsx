
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
  Bot,
  ChevronRight,
} from 'lucide-react';


/* =====================================================
   ICON WRAPPER
===================================================== */

const MenuIcon = ({
  icon: Icon,
  isActive = false,
}) => {
  return (
    <div
      className={`
        relative
        z-10
        flex
        h-10
        w-10
        shrink-0
        items-center
        justify-center
        rounded-[14px]
        border
        transition-all
        duration-300

        ${
          isActive
            ? `
              border-white/10
              bg-white/15
              text-white
              shadow-inner
              scale-105
            `
            : `
              border-white/[0.045]
              bg-white/[0.035]
              text-slate-500
              group-hover:border-blue-400/20
              group-hover:bg-blue-500/10
              group-hover:text-blue-300
              group-hover:scale-105
            `
        }
      `}
    >
      <Icon
        className="
          h-[19px]
          w-[19px]
          transition-transform
          duration-300
        "
      />
    </div>
  );
};


/* =====================================================
   SIDEBAR MENU ITEM
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

  const isSubmenuItemActive = (path) => {
    const [childPath, childQuery] = path.split('?');

    if (location.pathname !== childPath) {
      return false;
    }

    return (
      !childQuery ||
      location.search === `?${childQuery}`
    );
  };

  const isChildActive = item.children?.some(
    (child) => isSubmenuItemActive(child.path)
  );

  const isMenuActive = Boolean(
    isOpen ||
    (!isAnyMenuOpen && isChildActive)
  );


  /* =====================================================
     SIMPLE MENU ITEM
  ===================================================== */

  if (!item.children) {
    return (
      <NavLink
        to={item.path}
        end
        onClick={() => onNavigate(false)}
        title={
          sidebarCollapsed
            ? item.name
            : undefined
        }
        className={({ isActive }) => `
          group
          relative
          flex
          items-center
          min-h-[54px]
          w-full
          overflow-hidden
          rounded-[18px]
          px-2.5
          transition-all
          duration-300
          ease-out

          ${sidebarCollapsed
            ? 'justify-center'
            : 'gap-3'
          }

          ${
            isActive && !isAnyMenuOpen
              ? `
                bg-gradient-to-r
                from-blue-600
                via-indigo-600
                to-violet-600
                text-white
                shadow-[0_10px_30px_rgba(37,99,235,0.25)]
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
            {!isActive && (
              <span
                className="
                  absolute
                  inset-0
                  -translate-x-full
                  bg-gradient-to-r
                  from-transparent
                  via-white/[0.06]
                  to-transparent
                  transition-transform
                  duration-700
                  group-hover:translate-x-full
                "
              />
            )}

            {isActive &&
              !isAnyMenuOpen &&
              !sidebarCollapsed && (
                <span
                  className="
                    absolute
                    left-0
                    top-1/2
                    h-7
                    w-[3px]
                    -translate-y-1/2
                    rounded-r-full
                    bg-white
                    shadow-[0_0_14px_rgba(255,255,255,0.8)]
                  "
                />
              )}

            <MenuIcon
              icon={Icon}
              isActive={
                isActive && !isAnyMenuOpen
              }
            />

            {!sidebarCollapsed && (
              <span
                className="
                  relative
                  z-10
                  min-w-0
                  flex-1
                  truncate
                  text-left
                  text-[13px]
                  font-semibold
                  tracking-[-0.01em]
                "
              >
                {item.name}
              </span>
            )}

            {isActive &&
              !isAnyMenuOpen &&
              !sidebarCollapsed && (
                <span
                  className="
                    relative
                    z-10
                    mr-1
                    h-1.5
                    w-1.5
                    shrink-0
                    rounded-full
                    bg-white
                    shadow-[0_0_12px_rgba(255,255,255,0.95)]
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

      <button
        type="button"
        onClick={onToggle}
        title={
          sidebarCollapsed
            ? item.name
            : undefined
        }
        className={`
          group
          relative
          flex
          min-h-[54px]
          w-full
          items-center
          overflow-hidden
          rounded-[18px]
          px-2.5
          transition-all
          duration-300
          ease-out

          ${sidebarCollapsed
            ? 'justify-center'
            : 'gap-3'
          }

          ${
            isMenuActive
              ? `
                bg-gradient-to-r
                from-blue-600
                via-indigo-600
                to-violet-600
                text-white
                shadow-[0_10px_30px_rgba(37,99,235,0.25)]
              `
              : `
                text-slate-400
                hover:bg-white/[0.055]
                hover:text-white
              `
          }
        `}
      >

        {!isMenuActive && (
          <span
            className="
              absolute
              inset-0
              -translate-x-full
              bg-gradient-to-r
              from-transparent
              via-white/[0.06]
              to-transparent
              transition-transform
              duration-700
              group-hover:translate-x-full
            "
          />
        )}

        {isMenuActive &&
          !sidebarCollapsed && (
            <span
              className="
                absolute
                left-0
                top-1/2
                h-7
                w-[3px]
                -translate-y-1/2
                rounded-r-full
                bg-white
                shadow-[0_0_14px_rgba(255,255,255,0.8)]
              "
            />
          )}

        <MenuIcon
          icon={Icon}
          isActive={isMenuActive}
        />

        {!sidebarCollapsed && (
          <>
            <span
              className="
                relative
                z-10
                min-w-0
                flex-1
                truncate
                text-left
                text-[13px]
                font-semibold
              "
            >
              {item.name}
            </span>

            <ChevronDown
              className={`
                relative
                z-10
                mr-1
                h-4
                w-4
                shrink-0
                transition-all
                duration-300

                ${
                  isOpen
                    ? 'rotate-180 text-white'
                    : 'text-slate-600'
                }
              `}
            />
          </>
        )}
      </button>


      {/* =================================================
          EXPANDED SUBMENU
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
                ml-5
                mt-2
                space-y-1
                border-l
                border-white/[0.07]
                pl-4
                pb-1
              "
            >

              {item.children.map(
                (subItem, index) => {
                  const SubIcon = subItem.icon;

                  const isSubItemActive =
                    isSubmenuItemActive(
                      subItem.path
                    );

                  return (
                    <NavLink
                      key={subItem.name}
                      to={subItem.path}
                      end
                      onClick={() =>
                        onNavigate(true)
                      }
                      style={{
                        transitionDelay: isOpen
                          ? `${index * 45}ms`
                          : '0ms',
                      }}
                      className={`
                        group
                        relative
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        px-2.5
                        py-2.5
                        text-xs
                        font-semibold
                        transition-all
                        duration-300

                        ${
                          isOpen
                            ? 'translate-x-0 opacity-100'
                            : '-translate-x-2 opacity-0'
                        }

                        ${
                          isSubItemActive
                            ? `
                              bg-blue-500/10
                              text-blue-300
                            `
                            : `
                              text-slate-500
                              hover:bg-white/[0.045]
                              hover:text-white
                              hover:translate-x-1
                            `
                        }
                      `}
                    >

                      {isSubItemActive && (
                        <span
                          className="
                            absolute
                            -left-[21px]
                            h-2
                            w-2
                            rounded-full
                            bg-blue-400
                            shadow-[0_0_12px_rgba(96,165,250,0.9)]
                          "
                        />
                      )}

                      <div
                        className={`
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          border
                          transition-all
                          duration-300

                          ${
                            isSubItemActive
                              ? `
                                border-blue-400/20
                                bg-blue-500/15
                                text-blue-300
                              `
                              : `
                                border-white/[0.04]
                                bg-white/[0.035]
                                text-slate-500
                                group-hover:bg-white/[0.07]
                                group-hover:text-slate-300
                              `
                          }
                        `}
                      >
                        <SubIcon className="h-3.5 w-3.5" />
                      </div>

                      <span className="truncate">
                        {subItem.name}
                      </span>

                      {isSubItemActive && (
                        <ChevronRight
                          className="
                            ml-auto
                            h-3.5
                            w-3.5
                            shrink-0
                            text-blue-300
                          "
                        />
                      )}
                    </NavLink>
                  );
                }
              )}

            </div>
          </div>
        </div>
      )}


      {/* =================================================
          COLLAPSED SUBMENU
      ================================================= */}

      {sidebarCollapsed && isOpen && (
        <div
          className="
            absolute
            left-[70px]
            top-0
            z-50
            w-64
            origin-left
            rounded-2xl
            border
            border-white/[0.08]
            bg-[#0a0f1d]
            p-2.5
            shadow-2xl
            shadow-black/60
            animate-[menuPop_0.25s_cubic-bezier(0.16,1,0.3,1)]
          "
        >

          <div
            className="
              mb-2
              rounded-xl
              border
              border-white/[0.05]
              bg-gradient-to-r
              from-blue-500/10
              to-violet-500/10
              px-3
              py-3
            "
          >

            <div className="flex items-center gap-2">

              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-500/10
                  text-blue-300
                "
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black text-white">
                  {item.name}
                </p>

                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  {item.description}
                </p>
              </div>

            </div>
          </div>


          <div className="space-y-1">

            {item.children.map(
              (subItem) => {
                const SubIcon = subItem.icon;

                const isSubItemActive =
                  isSubmenuItemActive(
                    subItem.path
                  );

                return (
                  <NavLink
                    key={subItem.name}
                    to={subItem.path}
                    end
                    onClick={() =>
                      onNavigate(true)
                    }
                    className={`
                      group
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      px-3
                      py-2.5
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
                            hover:bg-white/[0.05]
                            hover:text-white
                          `
                      }
                    `}
                  >

                    <div
                      className={`
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        transition-all

                        ${
                          isSubItemActive
                            ? 'bg-white/15'
                            : 'bg-white/[0.04] group-hover:bg-white/[0.08]'
                        }
                      `}
                    >
                      <SubIcon className="h-4 w-4" />
                    </div>

                    <span className="truncate">
                      {subItem.name}
                    </span>

                  </NavLink>
                );
              }
            )}

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

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [logoutModalOpen, setLogoutModalOpen] =
    useState(false);

  const [openMenu, setOpenMenu] =
    useState(null);


  /* =====================================================
     KEYBOARD
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

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

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

  const handleNavigation = (
    keepMenuOpen = false
  ) => {

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
      name: 'Shop Assistant',
      path: '/assistant',
      icon: Bot,
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
     SIDEBAR
  ===================================================== */

  const sidebarContent = (

    <div
      className="
        relative
        flex
        h-full
        flex-col
        overflow-hidden
        bg-[#070b16]
        text-white
      "
    >

      {/* BACKGROUND EFFECTS */}

      <div
        className="
          pointer-events-none
          absolute
          -left-32
          -top-40
          h-96
          w-96
          rounded-full
          bg-blue-600/[0.10]
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -right-40
          top-1/3
          h-96
          w-96
          rounded-full
          bg-violet-600/[0.08]
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
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                bg-gradient-to-br
                from-blue-500
                via-indigo-500
                to-violet-600
                shadow-xl
                shadow-blue-950/50
              "
            >
              <ShieldCheck
                className="
                  h-5
                  w-5
                  text-white
                "
              />
            </div>

          </div>

        ) : (

          <div className="flex items-center gap-3.5">

            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-gradient-to-br
                from-blue-500
                via-indigo-500
                to-violet-600
                shadow-xl
                shadow-blue-950/50
              "
            >
              <ShieldCheck
                className="
                  h-5
                  w-5
                  text-white
                "
              />
            </div>

            <div className="min-w-0">

              <h2
                className="
                  truncate
                  text-sm
                  font-black
                  tracking-tight
                  text-white
                "
              >
                {settings?.shopName ||
                  'Electronics Shop'}
              </h2>

              <p
                className="
                  mt-1.5
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.14em]
                  text-slate-500
                "
              >
                Admin Console
              </p>

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

          ${
            sidebarCollapsed
              ? 'p-2.5'
              : 'p-3'
          }
        `}
      >

        {!sidebarCollapsed && (

          <div
            className="
              mb-3
              flex
              items-center
              gap-2
              px-2.5
            "
          >

            <div
              className="
                flex
                h-6
                w-6
                items-center
                justify-center
                rounded-lg
                bg-blue-500/10
              "
            >
              <Sparkles
                className="
                  h-3.5
                  w-3.5
                  text-blue-400
                "
              />
            </div>

            <p
              className="
                text-[9px]
                font-black
                uppercase
                tracking-[0.18em]
                text-slate-600
              "
            >
              Main Menu
            </p>

          </div>

        )}


        <div className="space-y-1.5">

          {navItems.map((item) => (

            <SidebarMenuItem
              key={item.name}
              item={item}
              sidebarCollapsed={
                sidebarCollapsed
              }
              isOpen={
                openMenu === item.name
              }
              isAnyMenuOpen={
                Boolean(openMenu)
              }
              onToggle={() =>
                toggleMenu(item.name)
              }
              onNavigate={
                handleNavigation
              }
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

          ${
            sidebarCollapsed
              ? 'p-2.5'
              : 'p-3'
          }
        `}
      >

        {sidebarCollapsed ? (

          <button
            onClick={handleLogoutClick}
            title={`Logout ${
              admin?.email || ''
            }`}
            className="
              group
              flex
              h-11
              w-full
              items-center
              justify-center
              rounded-2xl
              bg-white/[0.025]
              text-slate-500
              transition-all
              duration-300
              hover:bg-rose-500/10
              hover:text-rose-400
            "
          >
            <LogOut
              className="
                h-[18px]
                w-[18px]
                transition-transform
                duration-300
                group-hover:translate-x-0.5
              "
            />
          </button>

        ) : (

          <div
            className="
              rounded-2xl
              border
              border-white/[0.06]
              bg-white/[0.035]
              p-3
            "
          >

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-blue-400/10
                  bg-blue-500/10
                "
              >
                <CircleUserRound
                  className="
                    h-[19px]
                    w-[19px]
                    text-blue-300
                  "
                />
              </div>

              <div className="min-w-0 flex-1">

                <p
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-wider
                    text-slate-600
                  "
                >
                  Logged in as
                </p>

                <p
                  className="
                    mt-0.5
                    truncate
                    text-xs
                    font-bold
                    text-slate-300
                  "
                >
                  {admin?.email ||
                    'Administrator'}
                </p>

              </div>

              <button
                onClick={handleLogoutClick}
                title="Logout"
                className="
                  group
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  text-slate-500
                  transition-all
                  duration-300
                  hover:bg-rose-500/10
                  hover:text-rose-400
                "
              >
                <LogOut
                  className="
                    h-4
                    w-4
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
     MAIN LAYOUT
  ===================================================== */

  return (

    <div
      className="
        relative
        flex
        h-screen
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
          h-full
          shrink-0
          flex-col
          lg:flex
          z-30
          border-r
          border-slate-200/10
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
              ? 'visible opacity-100'
              : 'invisible pointer-events-none opacity-0'
          }
        `}
      >

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

        <div
          className={`
            relative
            flex
            h-full
            w-[300px]
            max-w-[88vw]
            flex-col
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

          <button
            onClick={() =>
              setMobileOpen(false)
            }
            className="
              absolute
              right-4
              top-4
              z-50
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              border
              border-white/[0.08]
              bg-white/[0.06]
              text-slate-400
              transition-all
              duration-300
              hover:rotate-90
              hover:bg-white/[0.1]
              hover:text-white
            "
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
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
          flex
          h-screen
          min-w-0
          flex-1
          flex-col
          overflow-y-auto
        "
      >

        {/* AMBIENT BACKGROUND */}

        <div
          className="
            pointer-events-none
            fixed
            right-0
            top-0
            h-[500px]
            w-[500px]
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
            h-[400px]
            w-[400px]
            rounded-full
            bg-violet-500/[0.025]
            blur-3xl
          "
        />


        {/* =================================================
            LOGOUT MODAL
        ================================================= */}

        <ConfirmModal
          isOpen={logoutModalOpen}
          onClose={() =>
            setLogoutModalOpen(false)
          }
          onConfirm={confirmLogout}
          title="Confirm Logout"
          message="Are you sure you want to log out of your session?"
        />


        {/* =================================================
            HEADER
        ================================================= */}

        <header
          className="
            relative
            z-30
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-200/70
            bg-white/95
            px-4
            py-3.5
            backdrop-blur-xl
            sm:px-6
          "
        >

          {/* LEFT */}

          <div className="flex min-w-0 items-center gap-3">

            {/* MOBILE */}

            <button
              onClick={() =>
                setMobileOpen(true)
              }
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-600
                shadow-sm
                transition-all
                duration-300
                hover:border-blue-200
                hover:text-blue-600
                hover:shadow-md
                active:scale-95
                lg:hidden
              "
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>


            {/* DESKTOP COLLAPSE */}

            <button
              onClick={() => {

                setSidebarCollapsed(
                  (previous) =>
                    !previous
                );

                setOpenMenu(null);

              }}
              className="
                hidden
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-500
                shadow-sm
                transition-all
                duration-300
                hover:border-blue-200
                hover:bg-blue-50
                hover:text-blue-600
                hover:shadow-md
                active:scale-95
                lg:flex
              "
              title={
                sidebarCollapsed
                  ? 'Expand Sidebar'
                  : 'Collapse Sidebar'
              }
            >

              {sidebarCollapsed ? (
                <PanelLeftOpen
                  className="h-5 w-5"
                />
              ) : (
                <PanelLeftClose
                  className="h-5 w-5"
                />
              )}

            </button>


            {/* TITLE */}

            <div className="min-w-0">

              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.16em]
                  text-slate-400
                  sm:text-[10px]
                "
              >
                Management System
              </p>

              <h1
                className="
                  mt-0.5
                  truncate
                  text-base
                  font-black
                  tracking-tight
                  text-slate-800
                  sm:text-xl
                "
              >
                {settings?.shopName ||
                  'Electronics Shop'}
              </h1>

            </div>

          </div>


          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div className="flex items-center gap-2">

            {/* CURRENCY */}

            <div
              className="
                group
                flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                py-2.5
                shadow-sm
                transition-all
                duration-300
                hover:border-blue-200
                hover:shadow-md
                sm:px-4
              "
            >

              <div
                className="
                  hidden
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-50
                  sm:flex
                "
              >
                <Wallet
                  className="
                    h-3.5
                    w-3.5
                    text-blue-600
                  "
                />
              </div>

              <span
                className="
                  hidden
                  text-[10px]
                  font-black
                  uppercase
                  tracking-wider
                  text-slate-400
                  sm:inline
                "
              >
                Currency
              </span>

              <span
                className="
                  bg-gradient-to-r
                  from-blue-600
                  to-violet-600
                  bg-clip-text
                  text-xs
                  font-black
                  text-transparent
                  sm:text-sm
                "
              >
                {settings?.currency ||
                  'PKR'}
              </span>

            </div>

          </div>

        </header>


        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <main
          className="
            relative
            z-10
            min-h-0
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
          ANIMATIONS
      ================================================= */}

      <style>{`

        @keyframes menuPop {

          from {
            opacity: 0;
            transform:
              translateX(-8px)
              scale(0.97);
          }

          to {
            opacity: 1;
            transform:
              translateX(0)
              scale(1);
          }

        }


        @keyframes pageEnter {

          from {
            opacity: 0;
            transform:
              translateY(8px);
          }

          to {
            opacity: 1;
            transform:
              translateY(0);
          }

        }


        nav::-webkit-scrollbar {
          width: 5px;
        }

        nav::-webkit-scrollbar-track {
          background: transparent;
        }

        nav::-webkit-scrollbar-thumb {
          background:
            rgba(148, 163, 184, 0.14);
          border-radius: 999px;
        }

        nav::-webkit-scrollbar-thumb:hover {
          background:
            rgba(96, 165, 250, 0.35);
        }

      `}</style>

    </div>
  );
};


export default Layout;