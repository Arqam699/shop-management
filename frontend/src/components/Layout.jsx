import React, {
  useEffect,
  useState,
} from 'react';
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import ConfirmModal from './ConfirmModal';
import ShopNoticeBanner from './ShopNoticeBanner';

import {
  Menu,
  X,
  LayoutDashboard,
   DatabaseBackup,
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
  Code2,
  MoreHorizontal,
  Download,
  Bell,
  Volume2,
  VolumeX,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import {
  clearActivityNotifications,
  getActivityNotifications,
  getDelayUntilNextPakistanMidnight,
  isActivitySoundEnabled,
  markActivityNotificationRead,
  markAllActivityNotificationsRead,
  setActivitySoundEnabled,
} from '../utils/activityNotifications';

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

const AppReleaseMenu = ({ collapsed }) => {
  const [versions, setVersions] = useState(null);

  useEffect(() => {
    const endpoint = import.meta.env.VITE_APP_UPDATES_URL;
    if (!endpoint) return undefined;

    const callback = `__arzaibSidebarVersions${Date.now()}${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const cleanup = () => {
      // A JSONP response can still execute after its request times out or the
      // component unmounts. Keep a short-lived no-op to avoid a late ReferenceError.
      window[callback] = () => {};
      window.setTimeout(() => { delete window[callback]; }, 60000);
      script.remove();
    };
    const timeout = window.setTimeout(cleanup, 10000);
    window[callback] = (data) => {
      window.clearTimeout(timeout);
      setVersions({ android: data?.android?.version, windows: data?.windows?.version });
      cleanup();
    };
    script.onerror = () => { window.clearTimeout(timeout); cleanup(); };
    script.src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}callback=${callback}&_=${Date.now()}`;
    document.head.appendChild(script);
    return () => { window.clearTimeout(timeout); cleanup(); };
  }, []);

  if (!versions || (!versions.android && !versions.windows)) return null;

  return (
    <Link
      to="/downloads"
      title={collapsed ? `Available versions: Android ${versions.android || '—'}, PC ${versions.windows || '—'}` : undefined}
      className={`mt-3 block rounded-xl border border-white/[0.08] bg-white/[0.035] text-slate-300 transition hover:border-blue-400/20 hover:bg-blue-500/10 ${collapsed ? 'mx-auto h-10 w-10' : 'px-3 py-2.5'}`}
    >
      {collapsed ? (
        <Download className="mx-auto mt-2 h-4 w-4 text-blue-300" />
      ) : (
        <>
          <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Available app versions</span>
          <span className="mt-1 block text-[10px] font-bold">Android {versions.android || '—'} · PC {versions.windows || '—'}</span>
        </>
      )}
    </Link>
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
        <div className={isOpen ? 'grid grid-rows-[1fr]' : 'hidden'}>
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
                        relative
                        flex
                        min-h-12
                        items-center
                        gap-3
                        rounded-xl
                        border
                        px-2.5
                        py-2
                        text-xs
                        font-semibold
                        transition-colors
                        duration-150

                        ${
                          isSubItemActive
                            ? `
                              border-blue-400/15
                              bg-blue-500/10
                              text-blue-200
                            `
                            : `
                              border-transparent
                              text-slate-500
                              hover:bg-white/[0.045]
                              hover:text-white
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
    name: ' AI Shop Assistant',
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
    name: 'Expenses',
    path: '/expenses',
    icon: Wallet,
  },

  {
    name: 'Book-wise Audit',
    path: '/book-audit',
    icon: BookOpen,
  },
  {
name: 'Backup',
path: '/backup',
icon: DatabaseBackup,
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

  {
    name: 'About Developer',
    path: '/about-developer',
    icon: Code2,
  },

  {
    name: 'Download Apps',
    path: '/downloads',
    icon: Download,
  },

];

/* =====================================================
   ACTIVE DROPDOWN FINDER
   Returns the name of the dropdown menu whose child
   matches the current route (or null).
===================================================== */

const findActiveMenuName = (pathname, search) => {
  for (const item of navItems) {
    if (!item.children) continue;

    const match = item.children.some((child) => {
      const [childPath, childQuery] =
        child.path.split('?');

      if (pathname !== childPath) {
        return false;
      }

      return (
        !childQuery ||
        search === `?${childQuery}`
      );
    });

    if (match) {
      return item.name;
    }
  }

  return null;
};

/* =====================================================
   ROUTE TITLES (shown as a label in the header)
===================================================== */

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/assistant': 'AI Shop Assistant',
  '/due-dates': 'Due Dates',
  '/inventory': 'Inventory',
  '/customers': 'Customers List',
  '/customers/add': 'Register Customer',
  '/customers/details': 'Customer Details',
  '/customers/ledger': 'Customer Ledger',
  '/sales': 'Sales History',
  '/installments': 'Installment Sales',
  '/payments': 'Payments',
  '/invoices': 'Invoices',
  '/expenses': 'Expenses',
  '/book-audit': 'Book-wise Audit',
  '/backup': 'Backup',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/about-developer': 'About Developer',
  '/downloads': 'Download Apps',
};

const getPageTitle = (pathname, search) => {
  if (pathname === '/sales/new') {
    return search.includes('type=installment')
      ? 'New Installment Sale'
      : 'New Cash Sale';
  }

  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }

  const prefix = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((route) =>
      pathname.startsWith(route + '/')
    );

  return prefix
    ? PAGE_TITLES[prefix]
    : 'Dashboard';
};

export const Layout = ({ children }) => {

  const { admin, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = getPageTitle(
    location.pathname,
    location.search
  );

  const mobileNavItems = [
    { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Stock', path: '/inventory', icon: Boxes },
    { name: 'Sales', path: '/sales', icon: ShoppingCart },
    { name: 'Customers', path: '/customers', icon: Users },
  ];
  const desktopNavItems = navItems.slice(0, navItems.findIndex((item) => item.name === 'Expenses') + 1);
  const desktopMoreItems = navItems.slice(desktopNavItems.length);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [mobileSalesOpen, setMobileSalesOpen] =
    useState(false);

  const sidebarCollapsed = false;

  const [logoutModalOpen, setLogoutModalOpen] =
    useState(false);

  const [activityNotifications, setActivityNotifications] =
    useState(() => getActivityNotifications());

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [selectedActivityNotification, setSelectedActivityNotification] =
    useState(null);

  const [activitySoundEnabled, setActivitySoundEnabledState] =
    useState(() => isActivitySoundEnabled());

  const [openMenu, setOpenMenu] =
    useState(null);

  const [desktopOpenMenu, setDesktopOpenMenu] =
    useState(null);

  const [desktopMoreOpen, setDesktopMoreOpen] =
    useState(false);

  const [desktopDropdownLeft, setDesktopDropdownLeft] =
    useState(16);

  useEffect(() => {
    const handleActivityNotifications = (event) => {
      setActivityNotifications(
        Array.isArray(event.detail) ? event.detail : getActivityNotifications()
      );
    };
    const handleStorage = (event) => {
      if (event.key === 'shop_activity_notifications_v1') {
        setActivityNotifications(getActivityNotifications());
      }
    };
    window.addEventListener('shop-activity-notifications', handleActivityNotifications);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('shop-activity-notifications', handleActivityNotifications);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    let midnightTimer;
    let cancelled = false;

    const scheduleMidnightClear = () => {
      midnightTimer = window.setTimeout(() => {
        clearActivityNotifications();
        if (!cancelled) scheduleMidnightClear();
      }, getDelayUntilNextPakistanMidnight());
    };

    scheduleMidnightClear();
    return () => {
      cancelled = true;
      window.clearTimeout(midnightTimer);
    };
  }, []);

  const unreadActivityCount = activityNotifications.filter((item) => !item.read).length;

  const formatNotificationTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Karachi',
    }).format(date);
  };

  const handleActivityNotificationClick = (notification) => {
    setActivityNotifications(markActivityNotificationRead(notification.id));
    setNotificationsOpen(false);
    setSelectedActivityNotification(notification);
  };

  const toggleActivitySound = () => {
    const enabled = !activitySoundEnabled;
    setActivitySoundEnabled(enabled);
    setActivitySoundEnabledState(enabled);
  };

  /* =====================================================
     KEYBOARD
  ===================================================== */

  useEffect(() => {

    const handleKeyDown = (event) => {

      if (event.key === 'Escape') {
        setMobileOpen(false);
        setOpenMenu(null);
        setDesktopOpenMenu(null);
        setDesktopMoreOpen(false);
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
     AUTO-OPEN DROPDOWN
     The dropdown containing the current route opens
     automatically. Click still toggles manually.
  ===================================================== */

  useEffect(() => {
    setOpenMenu(
      findActiveMenuName(
        location.pathname,
        location.search
      )
    );
  }, [location.pathname, location.search]);

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

          <AppReleaseMenu collapsed={sidebarCollapsed} />

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
        h-dvh
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
          FULL NAVIGATION DRAWER
      ================================================= */}

      <div
        className={`
          fixed
          inset-0
          z-50
          flex
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
            pb-[env(safe-area-inset-bottom)]
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
              top-[calc(env(safe-area-inset-top)+0.75rem)]
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
          h-dvh
          min-w-0
          flex-1
          flex-col
          min-h-0
          overflow-hidden
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
            px-1.5
            py-2.5
            backdrop-blur-xl
            sm:px-6
            sm:py-1
            lg:px-8
            pt-[calc(env(safe-area-inset-top)+0.625rem)]
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

            {/* DESKTOP FULL MENU */}

            <button
              onClick={() => { setDesktopOpenMenu(null); setOpenMenu(null); setMobileOpen(true); }}
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
              title="Open full navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* TITLE */}

            <div className="min-w-0">

              <p
                className="
                  text-[8px]
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
                  sm:text-lg
                "
              >
                {settings?.shopName ||
                  'Electronics Shop'}
              </h1>

            </div>

            {/* CURRENT PAGE LABEL */}

            <span
              className="
                hidden
                shrink-0
                items-center
                rounded-full
                border
                border-indigo-200
                bg-indigo-50
                px-3
                py-1
                text-[10px]
                font-black
                uppercase
                tracking-[0.14em]
                text-indigo-700
                sm:inline-flex
              "
            >
              {pageTitle}
            </span>

          </div>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">

            {/* ACTIVITY NOTIFICATIONS */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label={`Notifications${unreadActivityCount ? `, ${unreadActivityCount} unread` : ''}`}
                aria-expanded={notificationsOpen}
                className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:h-10 sm:w-10"
              >
                <Bell className="h-5 w-5" />
                {unreadActivityCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[8px] font-black text-white">
                    {unreadActivityCount > 99 ? '99+' : unreadActivityCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="fixed right-2 top-[calc(env(safe-area-inset-top)+5.5rem)] z-[80] w-[calc(100vw-1rem)] max-w-[24rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 sm:absolute sm:right-0 sm:top-12 sm:w-[min(92vw,24rem)]">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-black text-slate-900">Activity notifications</h2>
                      <p className="text-[10px] font-semibold text-slate-400">Recent changes in your shop</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivityNotifications(markAllActivityNotificationsRead())}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Read all
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2">
                    <button
                      type="button"
                      onClick={toggleActivitySound}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-indigo-700"
                    >
                      {activitySoundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                      Beep sound {activitySoundEnabled ? 'on' : 'off'}
                    </button>
                    {activityNotifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          clearActivityNotifications();
                          setActivityNotifications([]);
                        }}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Clear
                      </button>
                    )}
                  </div>

                  <div className="max-h-[min(60vh,26rem)] overflow-y-auto">
                    {activityNotifications.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <Bell className="mx-auto h-7 w-7 text-slate-200" />
                        <p className="mt-2 text-xs font-bold text-slate-500">No activity yet</p>
                        <p className="mt-1 text-[10px] text-slate-400">New shop actions will appear here.</p>
                      </div>
                    ) : (
                      activityNotifications.slice(0, 30).map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleActivityNotificationClick(notification)}
                          className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-indigo-50/60 ${notification.read ? 'bg-white' : 'bg-indigo-50/40'}`}
                        >
                          <span className="flex items-start gap-2">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-slate-200' : 'bg-indigo-500'}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-black text-slate-800">{notification.title}</span>
                              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-600">{notification.message}</span>
                              <span className="mt-1 block text-[8px] font-semibold text-slate-400">{formatNotificationTime(notification.createdAt)} PKT</span>
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                    h-3
                    w-3
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

       
<div
  data-desktop-nav-shell
  onMouseLeave={() => {
    setDesktopOpenMenu(null);
    setDesktopMoreOpen(false);
  }}
  className="relative hidden shrink-0 border-b border-slate-200/80 bg-white/90 shadow-lg lg:block"
>
  <nav aria-label="Main navigation" className="h-[50px] min-w-0 overflow-x-auto">
    <div className="flex w-max min-w-full items-center justify-start gap-6 px-4 py-1 2xl:justify-center">
      {desktopNavItems.map((item) => {
        const Icon = item.icon;
        const isOpen = desktopOpenMenu === item.name;

        const isActive = item.children
          ? findActiveMenuName(location.pathname, location.search) === item.name
          : location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);

        if (item.children) {
          return (
            <button
              key={item.name}
              type="button"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              onMouseEnter={(event) => {
                const shell = event.currentTarget.closest(
                  '[data-desktop-nav-shell]'
                );
                const shellRect = shell?.getBoundingClientRect();
                const buttonRect = event.currentTarget.getBoundingClientRect();

                if (shellRect) {
                  const maxLeft = Math.max(16, shellRect.width - 304);

                  setDesktopDropdownLeft(
                    Math.min(
                      maxLeft,
                      Math.max(16, buttonRect.left - shellRect.left)
                    )
                  );
                }

                setMobileSalesOpen(false);
                setDesktopMoreOpen(false);
                setDesktopOpenMenu(item.name);
              }}
              onClick={(event) => {
                const shell = event.currentTarget.closest(
                  '[data-desktop-nav-shell]'
                );
                const shellRect = shell?.getBoundingClientRect();
                const buttonRect = event.currentTarget.getBoundingClientRect();

                if (shellRect) {
                  const maxLeft = Math.max(16, shellRect.width - 304);

                  setDesktopDropdownLeft(
                    Math.min(
                      maxLeft,
                      Math.max(16, buttonRect.left - shellRect.left)
                    )
                  );
                }

                setMobileSalesOpen(false);
                setDesktopMoreOpen(false);

                setDesktopOpenMenu((current) =>
                  current === item.name ? null : item.name
                );
              }}
              className={`flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-2 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-700'
              }`}
            >
              <Icon
                className="h-4 w-4"
                strokeWidth={isActive ? 2.5 : 2}
              />

              {item.name.trim()}

              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          );
        }

        return (
          <NavLink
            key={item.name}
            to={item.path}
            end
            onClick={() => {
              setDesktopOpenMenu(null);
              setDesktopMoreOpen(false);
              setOpenMenu(null);
              setMobileSalesOpen(false);
              handleNavigation(false);
            }}
            className={() =>
              `flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-2 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-700'
              }`
            }
          >
            <Icon
              className="h-4 w-4"
              strokeWidth={isActive ? 2.5 : 2}
            />

            {item.name.trim()}
          </NavLink>
        );
      })}

      <div className="relative z-[60] shrink-0">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={desktopMoreOpen}
          onMouseEnter={() => {
            setDesktopOpenMenu(null);
            setDesktopMoreOpen(true);
          }}
          onClick={() => {
            setDesktopOpenMenu(null);
            setDesktopMoreOpen(true);
          }}
          className={`flex min-h-10 items-center gap-1 whitespace-nowrap rounded-xl px-2 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
            desktopMoreOpen
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-700'
          }`}
        >
          <MoreHorizontal className="h-4 w-4" />
          More
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${desktopMoreOpen ? 'rotate-180' : ''}`} />
        </button>

      </div>
    </div>
  </nav>

  {desktopMoreOpen && desktopMoreItems.length > 0 && (
    <div
      role="menu"
      aria-label="More navigation"
      className="absolute right-4 top-[calc(100%-0.25rem)] z-[70] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/20"
    >
      {desktopMoreItems.map((item) => {
        const ItemIcon = item.icon;
        const isActive = item.children
          ? findActiveMenuName(location.pathname, location.search) === item.name
          : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

        return (
          <NavLink
            key={item.name}
            to={item.path}
            end
            role="menuitem"
            onClick={() => {
              setDesktopMoreOpen(false);
              setDesktopOpenMenu(null);
              setOpenMenu(null);
              setMobileSalesOpen(false);
              handleNavigation(false);
            }}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs font-bold transition ${
              isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-700'
            }`}
          >
            <ItemIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.name}</span>
            {isActive && <ChevronRight className="ml-auto h-4 w-4 shrink-0" />}
          </NavLink>
        );
      })}
    </div>
  )}

  {desktopOpenMenu &&
    desktopNavItems.find((item) => item.name === desktopOpenMenu)?.children && (
      <div
        role="menu"
        aria-label={desktopOpenMenu.trim()}
        style={{ left: desktopDropdownLeft }}
        className="absolute top-[calc(100%-0.25rem)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/20"
      >
        {desktopNavItems
          .find((item) => item.name === desktopOpenMenu)
          .children.map((child) => {
            const ChildIcon = child.icon;
            const [childPath, childQuery] = child.path.split('?');

            const isChildActive =
              location.pathname === childPath &&
              (!childQuery || location.search === `?${childQuery}`);

            return (
              <NavLink
                key={child.path}
                role="menuitem"
                to={child.path}
                end
                onClick={() => {
                  setDesktopOpenMenu(null);
                  setOpenMenu(null);
                  setMobileSalesOpen(false);
                  handleNavigation(false);
                }}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs font-bold transition ${
                  isChildActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-700'
                }`}
              >
                <ChildIcon className="h-4 w-4 shrink-0" />

                <span className="truncate">{child.name}</span>

                {isChildActive && (
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
                )}
              </NavLink>
            );
          })}
      </div>
    )}
</div>

        {selectedActivityNotification && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
            onClick={() => setSelectedActivityNotification(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="activity-detail-title"
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-indigo-600">Activity details</p>
                  <h2 id="activity-detail-title" className="mt-0.5 text-base font-black text-slate-900">
                    {selectedActivityNotification.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedActivityNotification(null)}
                  aria-label="Close notification details"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 px-5 py-5">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Action performed</p>
                  <p className="mt-1 text-sm font-black text-indigo-900">
                    {selectedActivityNotification.action || selectedActivityNotification.title}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">What happened</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {selectedActivityNotification.message || 'The activity was completed successfully.'}
                  </p>
                </div>
                <p className="text-[11px] font-semibold text-slate-400">
                  {formatNotificationTime(selectedActivityNotification.createdAt)} PKT
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedActivityNotification(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                {selectedActivityNotification.route && (
                  <button
                    type="button"
                    onClick={() => {
                      const route = selectedActivityNotification.route;
                      setSelectedActivityNotification(null);
                      navigate(route);
                    }}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700"
                  >
                    Open related page
                  </button>
                )}
              </div>
            </section>
          </div>
        )}

        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <main
          className="
            relative
            min-h-0
            flex
            flex-1
            flex-col
            overflow-y-auto
            overscroll-contain
            px-3
            pt-3
            pb-[calc(5.5rem+env(safe-area-inset-bottom))]
            sm:p-5
            lg:p-7
          "
        >
          <ShopNoticeBanner />
          {children}
        </main>

        <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200/90 bg-white/95 px-1 pt-1.5 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden">
          {mobileNavItems.map(({ name, path, icon: Icon }) => {
            const isActive = name === 'Sales'
              ? location.pathname.startsWith('/sales') || location.pathname.startsWith('/installments')
              : location.pathname === path;

            if (name === 'Sales') {
              return (
                <div key={path} className="relative flex min-w-0 justify-center">
                  {mobileSalesOpen && (
                    <div role="menu" aria-label="Sale type" className="absolute bottom-[calc(100%+0.5rem)] left-1/2 z-50 w-52 -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/20">
                      <Link
                        role="menuitem"
                        to="/sales/new?type=cash"
                        onClick={() => setMobileSalesOpen(false)}
                        className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Banknote className="h-4 w-4" /></span>
                        Cash Sale
                      </Link>
                      <Link
                        role="menuitem"
                        to="/sales/new?type=installment"
                        onClick={() => setMobileSalesOpen(false)}
                        className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><CalendarClock className="h-4 w-4" /></span>
                        Installment Sale
                      </Link>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-expanded={mobileSalesOpen}
                    aria-haspopup="menu"
                    onClick={() => setMobileSalesOpen((open) => !open)}
                    className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold transition active:scale-95 ${isActive ? 'text-indigo-700' : 'text-slate-500 hover:text-indigo-600'}`}
                  >
                    <span className={`flex h-7 w-10 items-center justify-center rounded-xl ${isActive ? 'bg-indigo-50' : ''}`}>
                      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                    </span>
                    <span className="max-w-full truncate">Sales</span>
                  </button>
                </div>
              );
            }

            return (
              <NavLink
                key={path}
                to={path}
                end
                onClick={() => { setMobileSalesOpen(false); handleNavigation(false); }}
                className={() => `flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold transition active:scale-95 ${isActive ? 'text-indigo-700' : 'text-slate-500 hover:text-indigo-600'}`}
              >
                <span className={`flex h-7 w-10 items-center justify-center rounded-xl ${isActive ? 'bg-indigo-50' : ''}`}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span className="max-w-full truncate">{name}</span>
              </NavLink>
            );
          })}
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open full navigation" className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold text-slate-500 transition hover:text-indigo-600 active:scale-95">
            <span className="flex h-7 w-10 items-center justify-center rounded-xl"><MoreHorizontal className="h-5 w-5" /></span>
            <span>More</span>
          </button>
        </nav>

      </div>

      {/* =================================================
          ANIMATIONS
      ================================================= */}

    </div>
  );
};

export default Layout;
