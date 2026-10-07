import React, { useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import toast from 'react-hot-toast';

import ConfirmModal from '../components/ConfirmModal';

import api from '../utils/api';

import {
  X,
  ShieldCheck,
  Server,
  Users,
  Settings,
  Sparkles,
  Eye,
  EyeOff,
  MessageCircle,
  KeyRound,
  RotateCcw,
  MoreVertical,
  Download,
} from 'lucide-react';

const DEFAULT_STATS = {
  totalShops: 0,
  activeShops: 0,
  expiredShops: 0,
  suspendedShops: 0,
};

const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  // =====================================================
  // AUTH
  // =====================================================

  const [authChecking, setAuthChecking] = useState(true);
  const [superAdmin, setSuperAdmin] = useState(null);

  // =====================================================
  // DASHBOARD DATA
  // =====================================================

  const [stats, setStats] = useState(DEFAULT_STATS);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  // =====================================================
  // CREATE SHOP MODAL
  // =====================================================

  const [createShopModal, setCreateShopModal] = useState(false);
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [createPlan, setCreatePlan] = useState('Free Trial');
  const [createCompleteMonths, setCreateCompleteMonths] = useState(1);
  const [monthlyCharge, setMonthlyCharge] = useState('');

  // =====================================================
  // MONTHLY CHARGE EDITOR
  // =====================================================

  const [chargeModal, setChargeModal] = useState(null);
  const [editedMonthlyCharge, setEditedMonthlyCharge] = useState('');

  // =====================================================
  // RENEW MODAL
  // =====================================================

  const [renewModal, setRenewModal] = useState(null);
  const [renewPlan, setRenewPlan] = useState('Complete');
  const [completeMonths, setCompleteMonths] = useState(1);

  // =====================================================
  // SUBSCRIPTION HISTORY / LOGIN IP MODALS
  // =====================================================

  const [historyModal, setHistoryModal] = useState(null);

  // =====================================================
  // PASSWORD CHANGE HISTORY MODAL
  // =====================================================

  const [passwordHistoryModal, setPasswordHistoryModal] =
    useState({
      open: false,
      loading: false,
      shop: null,
      history: [],
      totalChanges: 0,
    });

  // =====================================================
  // DELETE MODAL
  // =====================================================

  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // =====================================================
  // RESET PASSWORD MODAL
  // =====================================================

  const [passwordModal, setPasswordModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // =====================================================
  // CONFIRMATION MODAL
  // =====================================================

  const [confirmConfig, setConfirmConfig] = useState(null);

  // =====================================================
  // SHOP ACTIONS MENU + DIRECTORY SEARCH
  // =====================================================

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [shopSearch, setShopSearch] = useState('');
  const [directoryFilter, setDirectoryFilter] =
    useState('all');

  // =====================================================
  // MONTHLY COLLECTIONS
  // =====================================================

  const [collectionMonth, setCollectionMonth] =
    useState(() => {
      const d = new Date();

      return `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, '0')}`;
    });

  const [payModal, setPayModal] =
    useState(null);

  const [payAmount, setPayAmount] =
    useState('');

  const [payVia, setPayVia] =
    useState('Cash');

  const [payNote, setPayNote] =
    useState('');

  const [paymentHistoryModal, setPaymentHistoryModal] =
    useState(null);

  // =====================================================
  // SHOP NOTES
  // =====================================================

  const [notesModal, setNotesModal] =
    useState(null);

  const [notesText, setNotesText] =
    useState('');

  // =====================================================
  // BROADCAST NOTICES
  // =====================================================

  const [announcements, setAnnouncements] =
    useState([]);

  const [announcementModal, setAnnouncementModal] =
    useState(null);

  const [announcementTitle, setAnnouncementTitle] =
    useState('');

  const [announcementMessage, setAnnouncementMessage] =
    useState('');

  // =====================================================
  // EDIT SHOP
  // =====================================================

  const [editShopModal, setEditShopModal] =
    useState(null);

  const [editShopName, setEditShopName] =
    useState('');

  const [editShopOwner, setEditShopOwner] =
    useState('');

  const [editShopEmail, setEditShopEmail] =
    useState('');

  const [editShopPhone, setEditShopPhone] =
    useState('');

  // =====================================================
  // API HELPER
  // =====================================================

  const handleUnauthorized = () => {
    setSuperAdmin(null);
    setAuthChecking(false);
    setLoading(false);

    navigate('/super-admin/login', {
      replace: true,
    });
  };

  // Same (path, options) contract as the old fetch-based
  // helper, now backed by the shared axios client so the
  // base URL, credentials and interceptors stay in one place.
  const fetchJson = async (path, options = {}) => {
    const method = (
      options.method || 'GET'
    ).toLowerCase();

    let payload;

    if (options.body) {
      try {
        payload = JSON.parse(options.body);
      } catch {
        payload = options.body;
      }
    }

    try {
      const response = await api.request({
        url: path,
        method,
        data: payload,
      });

      return response.data ?? {};
    } catch (error) {
      const status =
        error.response?.status;

      const data =
        error.response?.data || {};

      if (status === 401) {
        handleUnauthorized();

        const authError = new Error(
          data.message ||
            'Super Admin session expired. Please login again.'
        );

        authError.status = 401;

        throw authError;
      }

      const requestError = new Error(
        data.message ||
          error.message ||
          'Something went wrong.'
      );

      requestError.status = status;

      throw requestError;
    }
  };

  // =====================================================
  // VERIFY SUPER ADMIN SESSION
  // =====================================================

  const verifySuperAdmin = async () => {
    try {
      setAuthChecking(true);
      setError('');

      const data = await fetchJson(
        `/api/super-admin/me`,
        {
          method: 'GET',
        }
      );

      if (!data.success || !data.superAdmin) {
        navigate('/super-admin/login', {
          replace: true,
        });

        return false;
      }

      setSuperAdmin(data.superAdmin);

      return true;
    } catch (error) {
      console.error(
        'Super Admin Verification Error:',
        error
      );

      if (error.status === 401) return false;

      setError(
        error.message ||
          'Unable to verify Super Admin session.'
      );

      return false;
    } finally {
      setAuthChecking(false);
    }
  };

  // =====================================================
  // FETCH DASHBOARD DATA
  // =====================================================

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const statsData = await fetchJson(
        `/api/super-admin/dashboard`,
        {
          method: 'GET',
        }
      );

      setStats(
        statsData.stats || DEFAULT_STATS
      );

      const shopsData = await fetchJson(
        `/api/super-admin/shops`,
        {
          method: 'GET',
        }
      );

      const normalizedShops = (
        shopsData.shops || []
      ).map((shop) => ({
        ...shop,
        shopId: shop.shopId || shop._id,
      }));

      setShops(normalizedShops);
    } catch (error) {
      console.error(
        'Super Admin Dashboard Error:',
        error
      );

      if (error.status === 401) return;

      setError(
        error.message ||
          'Something went wrong while loading dashboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeDashboard = async () => {
      const authenticated =
        await verifySuperAdmin();

      if (authenticated && mounted) {
        await fetchDashboardData();
        await fetchAnnouncements();
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // CREATE SHOP LOGIC
  // =====================================================

  const resetCreateShopForm = () => {
    setShopName('');
    setOwnerName('');
    setAdminEmail('');
    setPhone('');
    setAdminPassword('');
    setCreatePlan('Free Trial');
    setCreateCompleteMonths(1);
    setMonthlyCharge('');
    setShowAdminPassword(false);
  };

  const openCreateShopModal = () => {
    resetCreateShopForm();
    setError('');
    setCreateShopModal(true);
  };

  const closeCreateShopModal = () => {
    if (actionLoading === 'create-shop') return;

    setCreateShopModal(false);
  };

  const handleCreateShop = async () => {
    setError('');

    if (!shopName.trim()) {
      setError('Please enter shop name.');
      return;
    }

    if (!ownerName.trim()) {
      setError('Please enter owner name.');
      return;
    }

    if (!adminEmail.trim()) {
      setError('Please enter admin email.');
      return;
    }

    if (!adminPassword.trim()) {
      setError('Please enter admin password.');
      return;
    }

    if (adminPassword.length < 12) {
      setError(
        'Admin password must be at least 12 characters.'
      );

      return;
    }

    if (
      monthlyCharge === '' ||
      !Number.isFinite(Number(monthlyCharge)) ||
      Number(monthlyCharge) < 0
    ) {
      setError(
        'Please enter a valid monthly charge.'
      );

      return;
    }

    if (
      createPlan === 'Complete' &&
      (
        !createCompleteMonths ||
        Number(createCompleteMonths) < 1 ||
        !Number.isInteger(
          Number(createCompleteMonths)
        )
      )
    ) {
      setError(
        'Please enter a valid number of months.'
      );

      return;
    }

    try {
      setActionLoading('create-shop');

      const body = {
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        email: adminEmail.trim().toLowerCase(),
        phone: phone.trim(),
        password: adminPassword,
        subscriptionPlan: createPlan,
        monthlyCharge: Number(monthlyCharge),
      };

      if (createPlan === 'Complete') {
        body.durationMonths =
          Number(createCompleteMonths);
      }

      await fetchJson(
        `/api/super-admin/shops`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      setCreateShopModal(false);

      resetCreateShopForm();

      toast.success(
        'Shop created successfully!'
      );

      await fetchDashboardData();
    } catch (error) {
      console.error(
        'Create Shop Error:',
        error
      );

      if (error.status === 401) return;

      setError(
        error.message ||
          'Failed to create shop.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // MONTHLY CHARGE
  // =====================================================

  const openChargeModal = (shop) => {
    setChargeModal(shop);

    setEditedMonthlyCharge(
      String(Number(shop.monthlyCharge || 0))
    );

    setError('');
  };

  const closeChargeModal = () => {
    if (actionLoading === 'monthly-charge') return;

    setChargeModal(null);
  };

  const handleUpdateMonthlyCharge = async () => {
    if (!chargeModal) return;

    if (
      editedMonthlyCharge === '' ||
      !Number.isFinite(
        Number(editedMonthlyCharge)
      ) ||
      Number(editedMonthlyCharge) < 0
    ) {
      setError(
        'Please enter a valid monthly charge.'
      );

      return;
    }

    try {
      setActionLoading('monthly-charge');
      setError('');

      await fetchJson(
        `/api/super-admin/shops/${chargeModal.shopId}/monthly-charge`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            monthlyCharge: Number(
              editedMonthlyCharge
            ),
          }),
        }
      );

      setChargeModal(null);

      toast.success(
        'Monthly charge updated successfully.'
      );

      await fetchDashboardData();
    } catch (error) {
      console.error(
        'Update Monthly Charge Error:',
        error
      );

      if (error.status === 401) return;

      setError(
        error.message ||
          'Failed to update monthly charge.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // SUSPEND
  // =====================================================

  const handleSuspend = (shopId) => {
    setConfirmConfig({
      title: 'Suspend Shop',

      message:
        'Are you sure you want to suspend this shop?',

      onConfirm: async () => {
        try {
          setActionLoading(shopId);
          setError('');

          await fetchJson(
            `/api/super-admin/shops/${shopId}/suspend`,
            {
              method: 'PATCH',
            }
          );

          toast.success(
            'Shop suspended successfully.'
          );

          await fetchDashboardData();
        } catch (error) {
          console.error(
            'Suspend Shop Error:',
            error
          );

          if (error.status === 401) return;

          setError(
            error.message ||
              'Failed to suspend shop.'
          );
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // =====================================================
  // ACTIVATE (WhatsApp notice removed — shops are no longer
  // suspended; access is only blocked beyond 3 devices)
  // =====================================================

  const handleActivate = (shopId) => {
    setConfirmConfig({
      title: 'Activate Shop',

      message:
        'Are you sure you want to activate this shop?',

      onConfirm: async () => {
        try {
          setActionLoading(shopId);
          setError('');

          await fetchJson(
            `/api/super-admin/shops/${shopId}/activate`,
            {
              method: 'PATCH',
            }
          );

          toast.success(
            'Shop activated successfully.'
          );

          await fetchDashboardData();
        } catch (error) {
          console.error(
            'Activate Shop Error:',
            error
          );

          if (error.status === 401) return;

          setError(
            error.message ||
              'Failed to activate shop.'
          );
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleClearDevices = (shop) => {
    const deviceCount = Number(shop.authorizedDeviceCount || 0);

    if (!deviceCount) {
      toast('This shop has no authorized devices to clear.');
      return;
    }

    setConfirmConfig({
      title: 'Clear Authorized Devices',
      message:
        `Clear ${deviceCount} authorized device(s) for ${shop.shopName}? ` +
        'This will sign out all current shop sessions. The shop will stay active; devices can sign in again afterward.',
      onConfirm: async () => {
        try {
          setActionLoading(shop.shopId);
          setError('');

          const result = await fetchJson(
            `/api/super-admin/shops/${shop.shopId}/authorized-devices/clear`,
            { method: 'PATCH' }
          );

          toast.success(result.message || 'Authorized devices cleared.');
          await fetchDashboardData();
        } catch (error) {
          console.error('Clear Authorized Devices Error:', error);
          if (error.status === 401) return;
          setError(error.message || 'Failed to clear authorized devices.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // =====================================================
  // RENEW SUBSCRIPTION
  // =====================================================

  const openRenewModal = (shop) => {
    setRenewModal(shop);

    setRenewPlan(
      shop.subscriptionPlan === 'Free Trial'
        ? 'Complete'
        : shop.subscriptionPlan
    );

    setCompleteMonths(1);
    setError('');
  };

  const closeRenewModal = () => {
    if (actionLoading) return;

    setRenewModal(null);
  };

  const handleRenew = async () => {
    if (!renewModal) return;

    if (
      renewPlan === 'Complete' &&
      (
        !completeMonths ||
        Number(completeMonths) < 1 ||
        !Number.isInteger(
          Number(completeMonths)
        )
      )
    ) {
      setError(
        'Please enter a valid number of months.'
      );

      return;
    }

    try {
      setActionLoading(renewModal.shopId);
      setError('');

      const body = {
        subscriptionPlan: renewPlan,
      };

      if (renewPlan === 'Complete') {
        body.durationMonths =
          Number(completeMonths);
      }

      await fetchJson(
        `/api/super-admin/shops/${renewModal.shopId}/subscription`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      setRenewModal(null);

      toast.success(
        'Subscription renewed successfully!'
      );

      await fetchDashboardData();
    } catch (error) {
      console.error(
        'Renew Subscription Error:',
        error
      );

      if (error.status === 401) return;

      setError(
        error.message ||
          'Failed to renew subscription.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // SUBSCRIPTION HISTORY & LOGIN IP MODALS
  // =====================================================

  const openHistoryModal = (shop) => {
    setHistoryModal(shop);
    setError('');
  };

  const closeHistoryModal = () => {
    setHistoryModal(null);
  };

  const getTotalPaidMonths = (shop) => {
    if (!shop?.subscriptionHistory) return 0;

    return shop.subscriptionHistory.reduce(
      (total, history) => {
        if (history.plan === 'Complete') {
          return (
            total +
            Number(
              history.durationMonths || 0
            )
          );
        }

        return total;
      },
      0
    );
  };

  // =====================================================
  // PASSWORD CHANGE HISTORY
  // =====================================================

  const handleViewPasswordHistory = async (shop) => {
    try {
      setPasswordHistoryModal({
        open: true,
        loading: true,
        shop,
        history: [],
        totalChanges: 0,
      });

      const data = await fetchJson(
        `/api/super-admin/shops/${shop.shopId}/password-history`,
        {
          method: 'GET',
        }
      );

      setPasswordHistoryModal({
        open: true,
        loading: false,
        shop: data.shop || shop,
        history: Array.isArray(data.history)
          ? data.history
          : [],
        totalChanges: Number(
          data.totalChanges || 0
        ),
      });
    } catch (error) {
      console.error(
        'Password History Error:',
        error
      );

      if (error.status === 401) return;

      toast.error(
        error.message ||
          'Failed to load password history.'
      );

      setPasswordHistoryModal({
        open: false,
        loading: false,
        shop: null,
        history: [],
        totalChanges: 0,
      });
    }
  };

  const closePasswordHistoryModal = () => {
    setPasswordHistoryModal({
      open: false,
      loading: false,
      shop: null,
      history: [],
      totalChanges: 0,
    });
  };

  // =====================================================
  // DELETE SHOP
  // =====================================================

  const openDeleteModal = (shop) => {
    setDeleteModal(shop);
    setDeleteConfirmation('');
    setDeletePassword('');
    setShowDeletePassword(false);
    setError('');
  };

  const closeDeleteModal = () => {
    if (actionLoading === 'delete-shop')
      return;

    setDeleteModal(null);
    setDeleteConfirmation('');
    setDeletePassword('');
    setShowDeletePassword(false);
  };

  const handleDeleteShop = async () => {
    if (!deleteModal) return;

    setError('');

    if (
      deleteConfirmation.trim() !==
      deleteModal.shopName
    ) {
      setError(
        'Shop name does not match. Please type the exact shop name.'
      );

      return;
    }

    if (!deletePassword.trim()) {
      setError(
        'Please enter your Super Admin password.'
      );

      return;
    }

    try {
      setActionLoading('delete-shop');

      await fetchJson(
        `/api/super-admin/shops/${deleteModal.shopId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            password: deletePassword,
          }),
        }
      );

      setDeleteModal(null);
      setDeleteConfirmation('');
      setDeletePassword('');
      setShowDeletePassword(false);

      toast.success(
        'Shop permanently deleted.'
      );

      await fetchDashboardData();
    } catch (error) {
      console.error(
        'Permanent Delete Shop Error:',
        error
      );

      if (error.status === 401) return;

      setError(
        error.message ||
          'Failed to permanently delete shop.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // RESET ADMIN PASSWORD
  // =====================================================

  const openPasswordModal = (shop) => {
    setPasswordModal(shop);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError('');
  };

  const closePasswordModal = () => {
    if (actionLoading === 'reset-password')
      return;

    setPasswordModal(null);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleResetPassword = async () => {
    if (!passwordModal) return;

    setError('');

    if (
      !newPassword.trim() ||
      newPassword.length < 12
    ) {
      setError(
        'Password must be at least 12 characters.'
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');

      return;
    }

    try {
      setActionLoading('reset-password');

      await fetchJson(
        `/api/super-admin/shops/${passwordModal.shopId}/password`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newPassword,
          }),
        }
      );

      const currentShopName =
        passwordModal.shopName;

      setPasswordModal(null);
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      toast.success(
        `Password for ${currentShopName} has been reset successfully.`
      );
    } catch (error) {
      console.error(
        'Reset Password Error:',
        error
      );

      if (error.status === 401) return;

      setError(
        error.message ||
          'Failed to reset admin password.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    try {
      await fetchJson(
        '/api/super-admin/logout',
        {
          method: 'POST',
        }
      );
    } catch (error) {
      console.error(
        'Super Admin Logout Error:',
        error
      );
    } finally {
      navigate('/super-admin/login', {
        replace: true,
      });
    }
  };

  // =====================================================
  // DATE HELPERS
  // =====================================================

  const formatDate = (date) => {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime()))
      return '—';

    return parsedDate.toLocaleDateString(
      'en-PK',
      {
        timeZone: 'Asia/Karachi',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  const formatPakistanDateTime = (date) => {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime()))
      return '—';

    return parsedDate.toLocaleString(
      'en-PK',
      {
        timeZone: 'Asia/Karachi',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }
    );
  };

  // =====================================================
  // DERIVED INSIGHTS
  // (computed from already-loaded shops — no extra API)
  // =====================================================

  // Monthly Recurring Revenue: active shops' charges total
  const monthlyRevenue = useMemo(() => {
    return shops.reduce((sum, shop) => {
      if (shop.subscriptionStatus === 'Active') {
        return sum + Number(shop.monthlyCharge || 0);
      }
      return sum;
    }, 0);
  }, [shops]);

  // Shop expiring within the next 7 days
  const isExpiringSoon = (shop) => {
    if (shop?.subscriptionStatus !== 'Active') return false;
    if (!shop?.subscriptionExpiresAt) return false;

    const expiry = new Date(
      shop.subscriptionExpiresAt
    ).getTime();

    if (Number.isNaN(expiry)) return false;

    const diff = expiry - Date.now();

    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  };

  const expiringSoonCount = useMemo(
    () => shops.filter(isExpiringSoon).length,
    [shops]
  );

  // Latest successful login from the shop's IP history
  const getLastActive = (shop) => {
    const history = shop?.loginIpHistory;

    if (!Array.isArray(history) || history.length === 0) {
      return null;
    }

    let latest = 0;

    for (const entry of history) {
      const t = new Date(entry?.loggedInAt).getTime();

      if (!Number.isNaN(t) && t > latest) {
        latest = t;
      }
    }

    return latest ? new Date(latest) : null;
  };

  // Manual-backup status per shop.
  // Requires backend to send `lastBackupAt` on each shop
  // (set whenever the shop admin downloads a backup).
  // Until then every shop shows "No record".
  const getBackupStatus = (shop) => {
    if (!shop?.lastBackupAt) {
      return { label: 'No record', tone: 'none' };
    }

    const t = new Date(shop.lastBackupAt).getTime();

    if (Number.isNaN(t)) {
      return { label: 'No record', tone: 'none' };
    }

    const daysOld = (Date.now() - t) / (24 * 60 * 60 * 1000);

    return {
      label: formatDate(shop.lastBackupAt),
      tone: daysOld > 30 ? 'stale' : 'ok',
    };
  };

  // Dormant = no login for 30+ days (or never logged in
  // and shop is older than 7 days)
  const isDormant = (shop) => {
    const lastActive = getLastActive(shop);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    if (lastActive) {
      return (
        Date.now() - lastActive.getTime() >
        thirtyDays
      );
    }

    const created = shop?.createdAt
      ? new Date(shop.createdAt).getTime()
      : 0;

    if (!created || Number.isNaN(created)) {
      return true;
    }

    return (
      Date.now() - created >
      7 * 24 * 60 * 60 * 1000
    );
  };


  // =====================================================
  // DIRECTORY SEARCH + ACTIONS MENU HELPERS
  // =====================================================

  const visibleShops = useMemo(() => {
    let list = shops;

    if (directoryFilter === 'expiring') {
      list = list.filter(isExpiringSoon);
    } else if (directoryFilter === 'dormant') {
      list = list.filter(isDormant);
    }

    const q = shopSearch.trim().toLowerCase();

    if (!q) return list;

    return list.filter((item) =>
      [
        item.shopName,
        item.ownerName,
        item.adminEmail,
        item.email,
        item.shopId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [shops, shopSearch, directoryFilter]);

  const closeShopMenu = () => setMenuAnchor(null);

  const openShopMenu = (event, shopId) => {
    event.stopPropagation();

    const rect =
      event.currentTarget.getBoundingClientRect();

    const menuWidth = 224;
    const menuHeight = 400;

    let top = rect.bottom + 6;
    let left = rect.right - menuWidth;

    if (left < 8) left = 8;

    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - 6);
    }

    setMenuAnchor({ shopId, top, left });
  };

  const menuItemClass =
    'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  useEffect(() => {
    if (!menuAnchor) return;

    const close = () => setMenuAnchor(null);

    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);

    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menuAnchor]);

  const dormantCount = useMemo(
    () => shops.filter(isDormant).length,
    [shops]
  );

  // Revenue insights: plan distribution + last 6 months
  // renewal revenue (estimated from renewal history)
  const revenueInsights = useMemo(() => {
    const planCounts = {};

    shops.forEach((item) => {
      const plan =
        item.subscriptionPlan || 'Unknown';

      planCounts[plan] =
        (planCounts[plan] || 0) + 1;
    });

    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString('en', {
          month: 'short',
        }),
        revenue: 0,
        renewals: 0,
      });
    }

    const monthIndex = Object.fromEntries(
      months.map((m, i) => [m.key, i])
    );

    shops.forEach((item) => {
      (item.subscriptionHistory || []).forEach(
        (h) => {
          if (!h?.renewedAt) return;

          const d = new Date(h.renewedAt);

          if (Number.isNaN(d.getTime())) return;

          const key = `${d.getFullYear()}-${d.getMonth()}`;

          if (key in monthIndex) {
            const entry =
              months[monthIndex[key]];

            entry.renewals += 1;

            if (h.plan === 'Complete') {
              entry.revenue +=
                Number(
                  item.monthlyCharge || 0
                ) *
                Number(
                  h.durationMonths || 0
                );
            }
          }
        }
      );
    });

    const maxRevenue = Math.max(
      1,
      ...months.map((m) => m.revenue)
    );

    const totalShops = Math.max(
      1,
      shops.length
    );

    return {
      planCounts,
      months,
      maxRevenue,
      totalShops,
    };
  }, [shops]);

  // Export visible directory as CSV
  const exportShopsCsv = () => {
    const headers = [
      'Shop ID',
      'Shop Name',
      'Owner',
      'Admin Email',
      'Phone',
      'Plan',
      'Status',
      'Monthly Charge',
      'Expiry Date',
      'Last Active',
      'Last Backup',
      'Created At',
    ];

    const cell = (value) =>
      `"${String(value ?? '').replace(
        /"/g,
        '""'
      )}"`;

    const isoDate = (value) => {
      if (!value) return '';
      const d = new Date(value);
      return Number.isNaN(d.getTime())
        ? ''
        : d.toISOString().slice(0, 10);
    };

    const rows = shops.map((item) => {
      const lastActive =
        getLastActive(item);

      return [
        item.shopId,
        item.shopName,
        item.ownerName || '',
        item.adminEmail || item.email || '',
        item.phone || '',
        item.subscriptionPlan || '',
        item.subscriptionStatus || '',
        Number(item.monthlyCharge || 0),
        isoDate(item.subscriptionExpiresAt),
        isoDate(lastActive),
        isoDate(item.lastBackupAt),
        isoDate(item.createdAt),
      ].map(cell);
    });

    const csv = [
      headers.map(cell).join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `shops-${
      new Date().toISOString().slice(0, 10)
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast.success('Shops exported to CSV.');
  };

  // Convert a saved phone number to wa.me international
  // format (Pakistan default): 0300... -> 92300...
  const toWhatsAppNumber = (phone) => {
    if (!phone) return null;

    let digits = String(phone).replace(
      /\D/g,
      ''
    );

    if (!digits) return null;

    if (
      digits.startsWith('92') &&
      digits.length >= 11
    ) {
      return digits;
    }

    if (digits.startsWith('0')) {
      digits = '92' + digits.slice(1);
    } else if (digits.length === 10) {
      digits = '92' + digits;
    }

    return digits;
  };

  // Open WhatsApp chat with the shop owner
  const openWhatsAppChat = (shop) => {
    const waNumber = toWhatsAppNumber(
      shop?.phone
    );

    if (!waNumber) {
      toast.error(
        'No phone number saved for this shop.'
      );

      return;
    }

    const text = encodeURIComponent(
      `Assalam-o-Alaikum${
        shop?.shopName
          ? ` (${shop.shopName})`
          : ''
      }!`
    );

    window.open(
      `https://wa.me/${waNumber}?text=${text}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // =====================================================
  // MONTHLY COLLECTIONS LOGIC
  // =====================================================

  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      opts.push({
        value: `${d.getFullYear()}-${String(
          d.getMonth() + 1
        ).padStart(2, '0')}`,
        label: d.toLocaleString('en', {
          month: 'long',
          year: 'numeric',
        }),
      });
    }

    return opts;
  }, []);

  const collectionMonthLabel = useMemo(() => {
    const found = monthOptions.find(
      (m) => m.value === collectionMonth
    );

    return found
      ? found.label
      : collectionMonth;
  }, [monthOptions, collectionMonth]);

  const getMonthPayment = (shop, month) =>
    (shop?.paymentHistory || []).find(
      (item) => item.month === month
    ) || null;

  const activeShopsForCollection = useMemo(
    () =>
      shops.filter(
        (item) =>
          item.subscriptionStatus ===
          'Active'
      ),
    [shops]
  );

  const collectionSummary = useMemo(() => {
    let paid = 0;
    let collected = 0;
    let expected = 0;

    activeShopsForCollection.forEach(
      (item) => {
        expected += Number(
          item.monthlyCharge || 0
        );

        const payment = getMonthPayment(
          item,
          collectionMonth
        );

        if (payment) {
          paid += 1;
          collected += Number(
            payment.amount || 0
          );
        }
      }
    );

    return {
      paid,
      pending:
        activeShopsForCollection.length -
        paid,
      collected,
      expected,
    };
  }, [
    shops,
    collectionMonth,
    activeShopsForCollection,
  ]);

  const paymentHistoryShop = paymentHistoryModal
    ? shops.find(
        (item) =>
          item.shopId ===
          paymentHistoryModal
      ) || null
    : null;

  const fetchAnnouncements = async () => {
    try {
      const data = await fetchJson(
        `/api/super-admin/announcements`,
        { method: 'GET' }
      );

      setAnnouncements(
        Array.isArray(
          data.announcements
        )
          ? data.announcements
          : []
      );
    } catch (error) {
      console.error(
        'Fetch Announcements Error:',
        error
      );
    }
  };

  const openPayModal = (shop) => {
    setPayModal(shop);
    setPayAmount(
      String(
        Number(shop.monthlyCharge || 0)
      )
    );
    setPayVia('Cash');
    setPayNote('');
    setError('');
  };

  const closePayModal = () => {
    if (actionLoading === 'record-payment')
      return;

    setPayModal(null);
  };

  const handleRecordPayment = async () => {
    if (!payModal) return;

    setError('');

    if (
      payAmount === '' ||
      !Number.isFinite(
        Number(payAmount)
      ) ||
      Number(payAmount) <= 0
    ) {
      setError(
        'Please enter a valid payment amount.'
      );

      return;
    }

    try {
      setActionLoading('record-payment');

      await fetchJson(
        `/api/super-admin/shops/${payModal.shopId}/payments`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            month: collectionMonth,
            amount: Number(payAmount),
            paidVia: payVia,
            note: payNote.trim(),
          }),
        }
      );

      setPayModal(null);

      toast.success(
        'Payment recorded successfully.'
      );

      await fetchDashboardData();
    } catch (error) {
      console.error(
        'Record Payment Error:',
        error
      );

      if (error.status === 401) return;

      setError(
        error.message ||
          'Failed to record payment.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePayment = (
    shop,
    payment
  ) => {
    setConfirmConfig({
      title: 'Delete Payment',

      message: `Delete the ${
        payment.month
      } payment of Rs. ${Number(
        payment.amount || 0
      ).toLocaleString()} for ${
        shop.shopName
      }?`,

      onConfirm: async () => {
        try {
          setActionLoading(shop.shopId);
          setError('');

          await fetchJson(
            `/api/super-admin/shops/${shop.shopId}/payments/${payment._id}`,
            { method: 'DELETE' }
          );

          toast.success(
            'Payment entry deleted.'
          );

          await fetchDashboardData();
        } catch (error) {
          console.error(
            'Delete Payment Error:',
            error
          );

          if (error.status === 401) return;

          setError(
            error.message ||
              'Failed to delete payment.'
          );
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // =====================================================
  // SHOP NOTES LOGIC
  // =====================================================

  const openNotesModal = (shop) => {
    setNotesModal(shop);
    setNotesText(
      shop.superAdminNotes || ''
    );
    setError('');
  };

  const closeNotesModal = () => {
    if (actionLoading === 'save-notes')
      return;

    setNotesModal(null);
  };

  const handleSaveNotes = async () => {
    if (!notesModal) return;

    try {
      setActionLoading('save-notes');
      setError('');

      await fetchJson(
        `/api/super-admin/shops/${notesModal.shopId}/notes`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            notes: notesText,
          }),
        }
      );

      setNotesModal(null);

      toast.success(
        'Notes saved successfully.'
      );

      await fetchDashboardData();
    } catch (error) {
      console.error(
        'Save Notes Error:',
        error
      );

      if (error.status === 401) return;

      setError(
        error.message ||
          'Failed to save notes.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // BROADCAST NOTICES LOGIC
  // =====================================================

  const openAnnouncementModal = (
    mode,
    item
  ) => {
    if (mode === 'edit' && item) {
      setAnnouncementModal({
        mode: 'edit',
        item,
      });
      setAnnouncementTitle(
        item.title || ''
      );
      setAnnouncementMessage(
        item.message || ''
      );
    } else {
      setAnnouncementModal({
        mode: 'create',
      });
      setAnnouncementTitle('');
      setAnnouncementMessage('');
    }

    setError('');
  };

  const closeAnnouncementModal = () => {
    if (
      actionLoading ===
      'save-announcement'
    )
      return;

    setAnnouncementModal(null);
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementModal) return;

    setError('');

    if (
      !announcementTitle.trim() ||
      !announcementMessage.trim()
    ) {
      setError(
        'Title and message are required.'
      );

      return;
    }

    try {
      setActionLoading(
        'save-announcement'
      );

      if (
        announcementModal.mode ===
        'edit'
      ) {
        await fetchJson(
          `/api/super-admin/announcements/${announcementModal.item._id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              title:
                announcementTitle.trim(),
              message:
                announcementMessage.trim(),
            }),
          }
        );

        toast.success(
          'Notice updated successfully.'
        );
      } else {
        await fetchJson(
          `/api/super-admin/announcements`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              title:
                announcementTitle.trim(),
              message:
                announcementMessage.trim(),
            }),
          }
        );

        toast.success(
          'Notice published successfully.'
        );
      }

      setAnnouncementModal(null);

      await fetchAnnouncements();
    } catch (error) {
      console.error(
        'Save Announcement Error:',
        error
      );

      if (error.status === 401) return;

      setError(
        error.message ||
          'Failed to save notice.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAnnouncement = async (
    item
  ) => {
    try {
      await fetchJson(
        `/api/super-admin/announcements/${item._id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            active: !item.active,
          }),
        }
      );

      await fetchAnnouncements();
    } catch (error) {
      console.error(
        'Toggle Announcement Error:',
        error
      );

      if (error.status === 401) return;

      toast.error(
        error.message ||
          'Failed to update notice.'
      );
    }
  };

  const handleDeleteAnnouncement = (
    item
  ) => {
    setConfirmConfig({
      title: 'Delete Notice',

      message: `Delete the notice "${item.title}"? Shops will no longer see it.`,

      onConfirm: async () => {
        try {
          await fetchJson(
            `/api/super-admin/announcements/${item._id}`,
            { method: 'DELETE' }
          );

          toast.success(
            'Notice deleted successfully.'
          );

          await fetchAnnouncements();
        } catch (error) {
          console.error(
            'Delete Announcement Error:',
            error
          );

          if (error.status === 401)
            return;

          toast.error(
            error.message ||
              'Failed to delete notice.'
          );
        }
      },
    });
  };

  // =====================================================
  // EDIT SHOP LOGIC
  // =====================================================

  const openEditShopModal = (shop) => {
    setEditShopModal(shop);
    setEditShopName(shop.shopName || '');
    setEditShopOwner(shop.ownerName || '');
    setEditShopEmail(
      shop.adminEmail || shop.email || ''
    );
    setEditShopPhone(shop.phone || '');
    setError('');
  };

  const closeEditShopModal = () => {
    if (actionLoading === 'edit-shop')
      return;

    setEditShopModal(null);
  };

  const handleUpdateShopDetails = async () => {
    if (!editShopModal) return;

    setError('');

    if (!editShopName.trim()) {
      setError('Please enter shop name.');
      return;
    }

    if (!editShopOwner.trim()) {
      setError('Please enter owner name.');
      return;
    }

    if (!editShopEmail.trim()) {
      setError('Please enter admin email.');
      return;
    }

    try {
      setActionLoading('edit-shop');

      const data = await fetchJson(
        `/api/super-admin/shops/${editShopModal.shopId}/details`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            shopName:
              editShopName.trim(),
            ownerName:
              editShopOwner.trim(),
            email:
              editShopEmail.trim(),
            phone:
              editShopPhone.trim(),
          }),
        }
      );

      setEditShopModal(null);

      toast.success(
        data.message ||
          'Shop updated successfully.'
      );

      await fetchDashboardData();
    } catch (error) {
      console.error(
        'Update Shop Details Error:',
        error
      );

      if (error.status === 401) return;

      setError(
        error.message ||
          'Failed to update shop.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // AUTH CHECK SCREEN
  // =====================================================

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">

        <div className="rounded-3xl bg-white p-8 text-center shadow-xl border border-slate-200">

          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

          <p className="text-xs font-black uppercase tracking-wider text-slate-700">
            Verifying Super Admin Session...
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f7fb] p-4 sm:p-6 lg:p-8 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">

      <div className="mx-auto w-full max-w-[1500px] space-y-6">

        {/* =====================================================
            DARK HERO HEADER
        ====================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">

          <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />

          <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

          <div className="relative z-10 p-6 sm:p-8">

            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2 mb-3">

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                    Super Admin Console
                  </span>

                  <span className="text-slate-600">
                    •
                  </span>

                  <span className="text-[10px] font-bold text-slate-400">
                    Logged in as:{' '}
                    <strong className="text-white">
                      {superAdmin?.name ||
                        'Master Admin'}
                    </strong>
                  </span>

                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  Shops & Subscriptions Hub
                </h1>

                <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                  Centralized platform control to monitor shop tenants, activate/suspend plans, and review renewal histories.
                </p>

              </div>

              <div className="flex flex-wrap items-center gap-2.5">

                <button
                  type="button"
                  onClick={openCreateShopModal}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <span>
                    + Create New Shop
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <span>
                    Logout
                  </span>
                </button>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            ERROR ALERT
        ====================================================== */}

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 animate-[pageEnter_0.3s_ease-out]">

            <span className="text-xs font-black uppercase tracking-wider text-rose-600">
              System Notice:
            </span>

            <span className="text-xs font-bold leading-snug text-rose-800">
              {error}
            </span>

          </div>
        )}

        {/* =====================================================
            EXPIRY ALERT BANNER
        ====================================================== */}

        {!loading && expiringSoonCount > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 animate-[pageEnter_0.3s_ease-out]">

            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 border border-amber-200 text-sm font-black text-amber-700">
              !
            </span>

            <p className="text-xs font-bold leading-relaxed text-amber-800">
              {expiringSoonCount} shop{expiringSoonCount > 1 ? 's are' : ' is'} expiring within 7 days — renew soon to avoid service interruption.
            </p>

          </div>
        )}

        {/* =====================================================
            STATISTICS
        ====================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

          <div className="premium-card p-5 relative overflow-hidden">

            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Total Tenants
            </p>

            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
              {loading
                ? '...'
                : stats.totalShops}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              Registered shops
            </p>

          </div>

          <div className="premium-card p-5 relative overflow-hidden">

            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Active Tenants
            </p>

            <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600">
              {loading
                ? '...'
                : stats.activeShops}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              Subscription valid
            </p>

          </div>

          <div className="premium-card p-5 relative overflow-hidden">

            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Expired Tenants
            </p>

            <p className="mt-2 text-2xl sm:text-3xl font-black text-rose-600">
              {loading
                ? '...'
                : stats.expiredShops}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              Needs renewal
            </p>

          </div>

          <div className="premium-card p-5 relative overflow-hidden">

            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Suspended Tenants
            </p>

            <p className="mt-2 text-2xl sm:text-3xl font-black text-amber-600">
              {loading
                ? '...'
                : stats.suspendedShops}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              Manually locked
            </p>

          </div>

          <div className="premium-card p-5 relative overflow-hidden">

            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-600 to-purple-600" />

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Monthly Revenue
            </p>

            <p className="mt-2 text-2xl sm:text-3xl font-black text-violet-600">
              {loading
                ? '...'
                : `Rs. ${Number(monthlyRevenue || 0).toLocaleString()}`}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              Active shops MRR
            </p>

          </div>

          <div className="premium-card p-5 relative overflow-hidden">

            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-500 to-slate-700" />

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Dormant Shops
            </p>

            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-600">
              {loading
                ? '...'
                : dormantCount}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              No login in 30+ days
            </p>

          </div>

        </div>

        {/* =====================================================
            REVENUE INSIGHTS
        ====================================================== */}

        <div className="premium-card p-5 sm:p-6">

          <h2 className="text-base font-black text-slate-900">
            Revenue Insights
          </h2>

          <p className="text-xs text-slate-400 mt-0.5">
            Estimated from renewal history
          </p>

          <div className="mt-5 grid gap-8 lg:grid-cols-2">

            {/* 6-MONTH RENEWAL REVENUE */}

            <div>

              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Renewal revenue — last 6 months
              </p>

              <div className="flex h-44 items-end gap-2 sm:gap-3">

                {revenueInsights.months.map(
                  (m) => (
                    <div
                      key={m.key}
                      className="flex flex-1 flex-col items-center justify-end gap-1.5 h-full"
                      title={`${m.label}: Rs. ${m.revenue.toLocaleString()} (${m.renewals} renewals)`}
                    >

                      <span className="text-[9px] font-black text-slate-500">
                        {m.revenue >= 1000
                          ? `${Math.round(
                              m.revenue / 1000
                            )}k`
                          : m.revenue}
                      </span>

                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-purple-400 transition-all"
                        style={{
                          height: `${Math.max(
                            3,
                            (m.revenue /
                              revenueInsights.maxRevenue) *
                              100
                          )}%`,
                        }}
                      />

                      <span className="text-[9px] font-bold text-slate-400">
                        {m.label}
                      </span>

                    </div>
                  )
                )}

              </div>

            </div>

            {/* PLAN DISTRIBUTION */}

            <div>

              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Plan distribution
              </p>

              <div className="space-y-3.5">

                {Object.entries(
                  revenueInsights.planCounts
                ).map(([plan, count]) => (
                  <div key={plan}>

                    <div className="mb-1 flex items-center justify-between text-xs">

                      <span className="font-bold text-slate-700">
                        {plan}
                      </span>

                      <span className="font-black text-slate-900">
                        {count} shop
                        {count !== 1 && 's'}
                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                        style={{
                          width: `${Math.round(
                            (count /
                              revenueInsights.totalShops) *
                              100
                          )}%`,
                        }}
                      />

                    </div>

                  </div>
                ))}

                {Object.keys(
                  revenueInsights.planCounts
                ).length === 0 && (
                  <p className="text-xs font-bold text-slate-400">
                    No shops yet.
                  </p>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* =====================================================
            MONTHLY COLLECTIONS
        ====================================================== */}

        <div className="premium-card p-5 sm:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-base font-black text-slate-900">
                Monthly Collections
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                {collectionSummary.paid} of{' '}
                {
                  activeShopsForCollection.length
                }{' '}
                paid • Rs.{' '}
                {collectionSummary.collected.toLocaleString()}{' '}
                collected
              </p>

            </div>

            <select
              value={collectionMonth}
              onChange={(e) =>
                setCollectionMonth(
                  e.target.value
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500"
            >
              {monthOptions.map((m) => (
                <option
                  key={m.value}
                  value={m.value}
                >
                  {m.label}
                </option>
              ))}
            </select>

          </div>

          {loading ? (

            <div className="p-10 text-center text-xs font-black uppercase text-slate-400">
              Loading collections...
            </div>

          ) : activeShopsForCollection.length ===
            0 ? (

            <div className="p-10 text-center text-xs font-bold text-slate-400">
              No active shops to collect from.
            </div>

          ) : (

            <div className="mt-4 overflow-x-auto">

              <table className="w-full text-left text-xs text-slate-600 font-medium">

                <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">

                  <tr>

                    <th className="px-4 py-3">
                      Shop
                    </th>

                    <th className="px-4 py-3 text-right">
                      Charge
                    </th>

                    <th className="px-4 py-3 text-center">
                      Status
                    </th>

                    <th className="px-4 py-3">
                      Paid Via
                    </th>

                    <th className="px-4 py-3">
                      Paid On
                    </th>

                    <th className="px-4 py-3 text-center">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {activeShopsForCollection.map(
                    (shop) => {
                      const payment =
                        getMonthPayment(
                          shop,
                          collectionMonth
                        );

                      return (
                        <tr
                          key={shop.shopId}
                          className="hover:bg-slate-50/80 transition-colors"
                        >

                          <td className="px-4 py-3">

                            <p className="font-black text-slate-900 text-sm">
                              {shop.shopName}
                            </p>

                            <p className="text-[10px] text-slate-400 font-semibold">
                              {shop.ownerName ||
                                '—'}
                            </p>

                          </td>

                          <td className="px-4 py-3 text-right font-black text-slate-700 whitespace-nowrap">
                            Rs.{' '}
                            {Number(
                              shop.monthlyCharge ||
                                0
                            ).toLocaleString()}
                          </td>

                          <td className="px-4 py-3 text-center">

                            {payment ? (
                              <span className="px-2.5 py-1 rounded-full text-[9px] font-black border bg-emerald-50 border-emerald-200 text-emerald-700">
                                Paid
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[9px] font-black border bg-amber-50 border-amber-200 text-amber-700">
                                Pending
                              </span>
                            )}

                          </td>

                          <td className="px-4 py-3 font-bold text-slate-700">
                            {payment?.paidVia ||
                              '—'}
                          </td>

                          <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">
                            {payment
                              ? formatDate(
                                  payment.paidAt
                                )
                              : '—'}
                          </td>

                          <td className="px-4 py-3 text-center">

                            {payment ? (
                              <span className="text-[10px] font-black text-emerald-600">
                                Rs.{' '}
                                {Number(
                                  payment.amount ||
                                    0
                                ).toLocaleString()}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  openPayModal(
                                    shop
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black hover:bg-emerald-700 transition-all"
                              >
                                Mark Paid
                              </button>
                            )}

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

        {/* =====================================================
            BROADCAST NOTICES
        ====================================================== */}

        <div className="premium-card p-5 sm:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-base font-black text-slate-900">
                Broadcast Notices
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                Published notices appear as a banner
                inside every shop's panel
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                openAnnouncementModal(
                  'create'
                )
              }
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              <span>
                + New Notice
              </span>
            </button>

          </div>

          <div className="mt-4 space-y-3">

            {announcements.length ===
            0 ? (

              <p className="py-8 text-center text-xs font-bold text-slate-400">
                No notices published yet.
              </p>

            ) : (

              announcements.map((item) => (

                <div
                  key={item._id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    item.active
                      ? 'border-blue-200 bg-blue-50/50'
                      : 'border-slate-200 bg-slate-50/50 opacity-70'
                  }`}
                >

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <p className="text-sm font-black text-slate-900">
                          {item.title}
                        </p>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                            item.active
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                          }`}
                        >
                          {item.active
                            ? 'Live'
                            : 'Hidden'}
                        </span>

                      </div>

                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600 break-words">
                        {item.message}
                      </p>

                      <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
                        {formatPakistanDateTime(
                          item.createdAt
                        )}
                      </p>

                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleAnnouncement(
                            item
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-black hover:bg-slate-50 transition-all"
                      >
                        {item.active
                          ? 'Hide'
                          : 'Show'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openAnnouncementModal(
                            'edit',
                            item
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black hover:bg-blue-100 transition-all"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteAnnouncement(
                            item
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black hover:bg-rose-100 transition-all"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                </div>

              ))

            )}

          </div>

        </div>

        {/* =====================================================
            SHOPS TABLE
        ====================================================== */}

        <div className="premium-card overflow-hidden">

          <div className="p-5 sm:p-6 border-b border-slate-100">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="text-base font-black text-slate-900">
                  Tenant Shops Directory
                </h2>

                <p className="text-xs text-slate-400 mt-0.5">
                  {visibleShops.length} of {shops.length} shops
                </p>

              </div>

              <div className="relative w-full sm:w-64">

                <input
                  type="text"
                  value={shopSearch}
                  onChange={(e) =>
                    setShopSearch(e.target.value)
                  }
                  placeholder="Search name, owner, email..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-9 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
                />

                {shopSearch && (
                  <button
                    type="button"
                    onClick={() => setShopSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

              </div>

            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">

              {[
                { id: 'all', label: 'All' },
                {
                  id: 'expiring',
                  label: `Expiring Soon (${expiringSoonCount})`,
                },
                {
                  id: 'dormant',
                  label: `Dormant (${dormantCount})`,
                },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() =>
                    setDirectoryFilter(chip.id)
                  }
                  className={`rounded-full px-3.5 py-1.5 text-[10px] font-black transition-all ${
                    directoryFilter ===
                    chip.id
                      ? 'bg-slate-900 text-white shadow'
                      : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {chip.label}
                </button>
              ))}

              <button
                type="button"
                onClick={exportShopsCsv}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>

            </div>

          </div>

{loading ? (

            <div className="p-16 text-center text-xs font-black uppercase text-slate-400">
              Loading tenant database...
            </div>

          ) : visibleShops.length === 0 ? (

            <div className="p-16 text-center text-xs font-bold text-slate-400">
              {shops.length === 0
                ? 'No shops registered in the system yet.'
                : 'No shops match your search.'}
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left text-xs text-slate-600 font-medium">

                <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">

                  <tr>

                    <th className="px-5 py-4">
                      Shop
                    </th>

                    <th className="px-5 py-4">
                      Plan & Status
                    </th>

                    <th className="px-5 py-4 text-right">
                      Monthly Charge
                    </th>

                    <th className="px-5 py-4">
                      Expiry Date
                    </th>

                    <th className="px-5 py-4">
                      Last Active
                    </th>

                    <th className="px-5 py-4">
                      Last Backup
                    </th>

                    <th className="px-5 py-4 text-center w-16">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {visibleShops.map((shop) => {

                    const isLoading =
                      actionLoading ===
                      shop.shopId;

                    const expiringSoon =
                      isExpiringSoon(shop);

                    const lastActive =
                      getLastActive(shop);

                    const backupStatus =
                      getBackupStatus(shop);

                    const initials = (
                      shop.shopName || 'S'
                    )
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase();

                    const statusDot =
                      shop.subscriptionStatus ===
                      'Active'
                        ? 'bg-emerald-500'
                        : shop.subscriptionStatus ===
                          'Expired'
                        ? 'bg-rose-500'
                        : 'bg-amber-500';

                    const statusText =
                      shop.subscriptionStatus ===
                      'Active'
                        ? 'text-emerald-700'
                        : shop.subscriptionStatus ===
                          'Expired'
                        ? 'text-rose-700'
                        : 'text-amber-700';

                    return (

                      <tr
                        key={shop.shopId}
                        className="hover:bg-slate-50/80 transition-colors"
                      >

                        {/* SHOP */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-[11px] font-black text-white shadow-sm">
                              {initials}
                            </span>

                            <div className="min-w-0">

                              <p className="truncate text-sm font-black text-slate-900">
                                {shop.shopName}
                              </p>

                              <p className="truncate text-[10px] font-semibold text-slate-400">
                                {shop.ownerName || '—'}
                                {' • '}
                                {shop.adminEmail ||
                                  shop.email ||
                                  '—'}
                              </p>

                              {shop.phone && (
                                <p className="truncate text-[10px] font-bold text-emerald-600">
                                  {shop.phone}
                                </p>
                              )}

                            </div>

                          </div>

                        </td>

                        {/* PLAN & STATUS */}

                        <td className="px-5 py-4">

                          <span className="whitespace-nowrap rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-blue-700 text-[10px] font-black">
                            {shop.subscriptionPlan ||
                              '—'}
                          </span>

                          <div className="mt-1.5 flex items-center gap-1.5">

                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
                            />

                            <span
                              className={`text-[10px] font-black ${statusText}`}
                            >
                              {shop.subscriptionStatus ||
                                '—'}
                            </span>

                          </div>

                          {shop.subscriptionStatus ===
                            'Suspended' &&
                            shop.suspensionReason && (
                              <p className="mt-0.5 max-w-[160px] truncate text-[9px] text-amber-600">
                                {
                                  shop.suspensionReason
                                }
                              </p>
                            )}

                        </td>

                        {/* MONTHLY CHARGE */}

                        <td className="px-5 py-4 text-right whitespace-nowrap">

                          <p className="font-black text-emerald-700">
                            Rs.{' '}
                            {Number(
                              shop.monthlyCharge || 0
                            ).toLocaleString()}
                          </p>

                          <p className="text-[9px] font-semibold text-slate-400">
                            per month
                          </p>

                        </td>

                        {/* EXPIRY DATE */}

                        <td
                          className={`px-5 py-4 font-bold whitespace-nowrap ${
                            expiringSoon
                              ? 'text-amber-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {formatDate(
                            shop.subscriptionExpiresAt
                          )}

                          {expiringSoon && (
                            <span className="ml-1.5 inline-block rounded-full bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-700 align-middle">
                              Soon
                            </span>
                          )}
                        </td>

                        {/* LAST ACTIVE */}

                        <td className="px-5 py-4 whitespace-nowrap">
                          {lastActive ? (
                            <span className="font-bold text-slate-700">
                              {formatPakistanDateTime(
                                lastActive
                              )}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">
                              Never
                            </span>
                          )}
                        </td>

                        {/* LAST BACKUP */}

                        <td className="px-5 py-4 whitespace-nowrap">
                          {backupStatus.tone ===
                          'none' ? (
                            <span className="text-[10px] font-bold text-slate-400">
                              No record
                            </span>
                          ) : (
                            <span
                              className={`font-bold ${
                                backupStatus.tone ===
                                'stale'
                                  ? 'text-rose-600'
                                  : 'text-slate-700'
                              }`}
                            >
                              {backupStatus.label}
                            </span>
                          )}
                        </td>

                        {/* ACTIONS MENU TRIGGER */}

                        <td className="px-5 py-4 text-center">

                          <div className="inline-flex items-center gap-1.5">

                            <button
                              type="button"
                              onClick={() =>
                                openWhatsAppChat(
                                  shop
                                )
                              }
                              disabled={
                                !toWhatsAppNumber(
                                  shop?.phone
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                              title={
                                shop?.phone
                                  ? `Chat on WhatsApp: ${shop.phone}`
                                  : 'No phone number saved for this shop'
                              }
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) =>
                                openShopMenu(
                                  e,
                                  shop.shopId
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-800"
                              title="Shop actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                          </div>

                        </td>

                      </tr>

                    );
                  })}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

      {/* =====================================================
          SHOP ACTIONS FLOATING MENU
      ====================================================== */}

      {menuAnchor &&
        (() => {
          const shop = shops.find(
            (item) =>
              item.shopId ===
              menuAnchor.shopId
          );

          if (!shop) return null;

          const isLoading =
            actionLoading ===
            shop.shopId;

          const historyCount =
            shop.subscriptionHistory
              ?.length || 0;

          const deviceCount = Number(
            shop.authorizedDeviceCount || 0
          );

          const closeThen = (fn) => () => {
            closeShopMenu();
            fn();
          };

          return (
            <>

              <div
                className="fixed inset-0 z-40"
                onClick={closeShopMenu}
              />

              <div
                className="fixed z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-[pageEnter_0.15s_ease-out]"
                style={{
                  top: menuAnchor.top,
                  left: menuAnchor.left,
                }}
              >

                <div className="border-b border-slate-100 px-4 py-3">

                  <p className="truncate text-xs font-black text-slate-900">
                    {shop.shopName}
                  </p>

                  <p className="text-[10px] font-semibold text-slate-400">
                    Manage shop
                  </p>

                </div>

                <div className="py-1.5">

                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={closeThen(() =>
                      openHistoryModal(shop)
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    Subscription History
                    {historyCount > 0 &&
                      ` (${historyCount})`}
                  </button>

                  <button
                    type="button"
                    disabled={!deviceCount}
                    className={menuItemClass}
                    onClick={closeThen(() =>
                      handleClearDevices(shop)
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    Clear Devices ({deviceCount})
                  </button>

                </div>

                <div className="border-t border-slate-100 py-1.5">

                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={closeThen(() =>
                      openEditShopModal(shop)
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Edit Shop
                  </button>

                  {shop.subscriptionStatus ===
                  'Active' ? (
                    <button
                      type="button"
                      disabled={isLoading}
                      className={menuItemClass}
                      onClick={closeThen(() =>
                        handleSuspend(
                          shop.shopId
                        )
                      )}
                    >
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {isLoading
                        ? 'Working...'
                        : 'Suspend Shop'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isLoading}
                      className={menuItemClass}
                      onClick={closeThen(() =>
                        handleActivate(
                          shop.shopId
                        )
                      )}
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {isLoading
                        ? 'Activating...'
                        : 'Activate Shop'}
                    </button>
                  )}

                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={closeThen(() =>
                      openChargeModal(shop)
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Edit Monthly Charge
                  </button>

                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={closeThen(() =>
                      openRenewModal(shop)
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Renew Subscription
                  </button>

                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={closeThen(() =>
                      openPasswordModal(shop)
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    Reset Password
                  </button>

                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={closeThen(() =>
                      handleViewPasswordHistory(
                        shop
                      )
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                    Password History
                  </button>

                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={closeThen(() =>
                      setPaymentHistoryModal(
                        shop.shopId
                      )
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-teal-500" />
                    Payment History
                  </button>

                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={closeThen(() =>
                      openNotesModal(shop)
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Shop Notes
                    {shop.superAdminNotes && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>

                </div>

                <div className="border-t border-slate-100 py-1.5">

                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-black text-rose-600 hover:bg-rose-50 transition-colors"
                    onClick={closeThen(() =>
                      openDeleteModal(shop)
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Delete Shop
                  </button>

                </div>

              </div>

            </>
          );
        })()}

      {/* =====================================================
          CREATE SHOP MODAL
      ====================================================== */}

      {createShopModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

            <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">

              <h3 className="font-black text-base">
                Create New Tenant Shop
              </h3>

              <button
                onClick={closeCreateShopModal}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">

              {/* SHOP NAME */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Shop Name *
                </label>

                <input
                  type="text"
                  value={shopName}
                  onChange={(e) =>
                    setShopName(e.target.value)
                  }
                  placeholder="e.g. Al-Madina Electronics"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
                />

              </div>

              {/* OWNER NAME */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Owner Name *
                </label>

                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) =>
                    setOwnerName(e.target.value)
                  }
                  placeholder="e.g. Muhammad Ali"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
                />

              </div>

              {/* ADMIN EMAIL */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Admin Email *
                </label>

                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) =>
                    setAdminEmail(e.target.value)
                  }
                  placeholder="admin@shop.com"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
                />

              </div>

              {/* PHONE */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  WhatsApp / Phone Number
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="03001234567"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
                />

                <p className="mt-1 text-[10px] text-slate-400">
                  This number will be used for WhatsApp support messages.
                </p>

              </div>

              {/* ADMIN PASSWORD */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Admin Password *
                </label>

                <div className="relative">

                  <input
                    type={
                      showAdminPassword
                        ? 'text'
                        : 'password'
                    }
                    value={adminPassword}
                    onChange={(e) =>
                      setAdminPassword(
                        e.target.value
                      )
                    }
                    placeholder="Minimum 12 characters"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 pr-11 text-xs font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowAdminPassword(
                        (visible) => !visible
                      )
                    }
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-blue-600"
                    aria-label={
                      showAdminPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    title={
                      showAdminPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showAdminPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                </div>

              </div>

              {/* PLAN */}

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Plan
                  </label>

                  <select
                    value={createPlan}
                    onChange={(e) =>
                      setCreatePlan(
                        e.target.value
                      )
                    }
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Free Trial">
                      Free Trial (7 Days)
                    </option>

                    <option value="Complete">
                      Complete Plan
                    </option>
                  </select>

                </div>

                {createPlan ===
                  'Complete' && (

                  <div>

                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Months
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        createCompleteMonths
                      }
                      onChange={(e) =>
                        setCreateCompleteMonths(
                          e.target.value
                        )
                      }
                      className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs font-bold bg-slate-50 focus:bg-white"
                    />

                  </div>

                )}

              </div>

              {/* MONTHLY CHARGE */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Monthly Software Charge (Rs.) *
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={monthlyCharge}
                  onChange={(e) =>
                    setMonthlyCharge(
                      e.target.value
                    )
                  }
                  placeholder="e.g. 3000"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />

                <p className="mt-1 text-[10px] text-slate-400">
                  Only Super Admin record; every shop can have a different charge.
                </p>

              </div>

            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">

              <button
                type="button"
                onClick={closeCreateShopModal}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateShop}
                disabled={
                  actionLoading ===
                  'create-shop'
                }
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 disabled:opacity-50"
              >
                {actionLoading ===
                'create-shop'
                  ? 'Creating Shop...'
                  : 'Save & Create'}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          EDIT MONTHLY CHARGE MODAL
      ====================================================== */}

      {chargeModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-slate-900 p-5 text-white">

              <div>

                <h3 className="text-base font-black">
                  Edit Monthly Charge
                </h3>

                <p className="mt-1 text-[10px] text-slate-400">
                  {chargeModal.shopName}
                </p>

              </div>

              <button
                type="button"
                onClick={closeChargeModal}
                className="rounded-xl bg-white/10 p-1.5 text-slate-300 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <div className="space-y-2 p-6">

              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Monthly Software Charge (Rs.)
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={
                  editedMonthlyCharge
                }
                onChange={(e) =>
                  setEditedMonthlyCharge(
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />

              <p className="text-[10px] text-slate-400">
                Set a new amount here to increase or decrease this shop's monthly charge.
              </p>

            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">

              <button
                type="button"
                onClick={closeChargeModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleUpdateMonthlyCharge
                }
                disabled={
                  actionLoading ===
                  'monthly-charge'
                }
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading ===
                'monthly-charge'
                  ? 'Saving...'
                  : 'Save Charge'}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          RENEW MODAL
      ====================================================== */}

      {renewModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">

            <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">

              <h3 className="font-black text-base">
                Renew Subscription:{' '}
                {renewModal.shopName}
              </h3>

              <button
                onClick={closeRenewModal}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300"
              >
                <X className="w-4 w-4" />
              </button>

            </div>

            <div className="p-6 space-y-4">

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">

                <p className="text-slate-500">
                  Current Plan:{' '}
                  <strong className="text-slate-800">
                    {renewModal.subscriptionPlan}
                  </strong>
                </p>

                <p className="text-slate-500">
                  Status:{' '}
                  <strong className="text-slate-800">
                    {renewModal.subscriptionStatus}
                  </strong>
                </p>

                <p className="text-slate-500">
                  Current Expiry:{' '}
                  <strong className="text-slate-800">
                    {formatDate(
                      renewModal.subscriptionExpiresAt
                    )}
                  </strong>
                </p>

              </div>

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  New Plan
                </label>

                <select
                  value={renewPlan}
                  onChange={(e) =>
                    setRenewPlan(
                      e.target.value
                    )
                  }
                  className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs font-bold bg-slate-50 focus:bg-white"
                >
                  <option value="Free Trial">
                    Free Trial (7 Days)
                  </option>

                  <option value="Complete">
                    Complete Plan
                  </option>
                </select>

              </div>

              {renewPlan ===
                'Complete' && (

                <div>

                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Extension Months
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={completeMonths}
                    onChange={(e) =>
                      setCompleteMonths(
                        e.target.value
                      )
                    }
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs font-bold bg-slate-50"
                  />

                </div>

              )}

            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">

              <button
                type="button"
                onClick={closeRenewModal}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRenew}
                disabled={
                  actionLoading ===
                  renewModal.shopId
                }
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ===
                renewModal.shopId
                  ? 'Renewing...'
                  : 'Confirm Renewal'}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          SUBSCRIPTION HISTORY MODAL
      ====================================================== */}

      {historyModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

            <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">

              <h3 className="font-black text-base">
                Subscription History:{' '}
                {historyModal.shopName}
              </h3>

              <button
                onClick={
                  closeHistoryModal
                }
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">

              {historyModal.subscriptionHistory
                ?.length ? (

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[700px] text-left text-xs font-medium border border-slate-200 rounded-2xl overflow-hidden">

                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-200">

                      <tr>

                        <th className="px-4 py-3">
                          Plan
                        </th>

                        <th className="px-4 py-3">
                          Duration
                        </th>

                        <th className="px-4 py-3">
                          Renewed On
                        </th>

                        <th className="px-4 py-3">
                          Previous Expiry
                        </th>

                        <th className="px-4 py-3">
                          New Expiry
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {historyModal.subscriptionHistory
                        .slice()
                        .reverse()
                        .map((h, i) => (

                          <tr
                            key={h._id || i}
                            className="hover:bg-slate-50/60"
                          >

                            <td className="px-4 py-3 font-black text-blue-600">
                              {h.plan}
                            </td>

                            <td className="px-4 py-3">
                              {h.durationMonths
                                ? `${h.durationMonths} Months`
                                : '7 Days'}
                            </td>

                            <td className="px-4 py-3 text-slate-500">
                              {formatDate(
                                h.renewedAt
                              )}
                            </td>

                            <td className="px-4 py-3 text-slate-500">
                              {formatDate(
                                h.previousExpiryDate
                              )}
                            </td>

                            <td className="px-4 py-3 font-bold text-slate-900">
                              {formatDate(
                                h.newExpiryDate
                              )}
                            </td>

                          </tr>

                        ))}

                    </tbody>

                  </table>

                </div>

              ) : (

                <p className="text-xs text-slate-400 text-center py-10">
                  No renewal history recorded.
                </p>

              )}

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          PASSWORD CHANGE HISTORY MODAL
      ====================================================== */}

      {passwordHistoryModal.open && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">

            {/* HEADER */}

            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">

              <div className="min-w-0">

                <div className="flex items-center gap-2">

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-400/20">

                    <KeyRound className="w-4 h-4 text-violet-300" />

                  </div>

                  <div className="min-w-0">

                    <h3 className="font-black text-base">
                      Password Change History
                    </h3>

                    <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                      {passwordHistoryModal.shop?.shopName ||
                        'Shop'}
                    </p>

                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  closePasswordHistoryModal
                }
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition shrink-0"
                aria-label="Close password history"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            {/* SHOP SUMMARY */}

            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70">

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                <div className="rounded-2xl bg-white border border-slate-200 p-4">

                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Shop
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-900 break-words">
                    {passwordHistoryModal.shop?.shopName ||
                      '—'}
                  </p>

                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-4">

                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Admin Email
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-700 break-all">
                    {passwordHistoryModal.shop?.email ||
                      passwordHistoryModal.shop?.adminEmail ||
                      '—'}
                  </p>

                </div>

                <div className="rounded-2xl bg-violet-50/60 border border-violet-200 p-4">

                  <p className="text-[9px] font-black uppercase tracking-wider text-violet-500">
                    Total Password Changes
                  </p>

                  <p className="mt-1 text-2xl font-black text-violet-700">
                    {passwordHistoryModal.loading
                      ? '...'
                      : passwordHistoryModal.totalChanges}
                  </p>

                </div>

              </div>

            </div>

            {/* HISTORY CONTENT */}

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">

              {passwordHistoryModal.loading ? (

                <div className="flex flex-col items-center justify-center py-16">

                  <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />

                  <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-400">
                    Loading password history...
                  </p>

                </div>

              ) : passwordHistoryModal.history.length ===
                0 ? (

                <div className="flex flex-col items-center justify-center py-16 text-center">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200">

                    <KeyRound className="w-6 h-6 text-slate-400" />

                  </div>

                  <p className="mt-4 text-sm font-black text-slate-700">
                    No Password Changes Recorded
                  </p>

                  <p className="mt-1 max-w-sm text-xs font-medium leading-relaxed text-slate-400">
                    This shop does not have any password
                    change history yet. Password history
                    will appear here after the admin
                    changes the password or Super Admin
                    resets it.
                  </p>

                </div>

              ) : (

                <div className="overflow-x-auto rounded-2xl border border-slate-200">

                  <table className="w-full min-w-[750px] text-left text-xs">

                    <thead className="bg-slate-50 border-b border-slate-200">

                      <tr>

                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          #
                        </th>

                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Date & Time
                        </th>

                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Changed By
                        </th>

                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Change Type
                        </th>

                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Admin Email
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {passwordHistoryModal.history.map(
                        (entry, index) => {

                          const changeType =
                            entry.changeType ||
                            'Password Changed';

                          let badgeClass =
                            'bg-slate-50 text-slate-700 border-slate-200';

                          if (
                            changeType ===
                            'Super Admin Reset'
                          ) {
                            badgeClass =
                              'bg-violet-50 text-violet-700 border-violet-200';
                          } else if (
                            changeType ===
                            'First Login'
                          ) {
                            badgeClass =
                              'bg-emerald-50 text-emerald-700 border-emerald-200';
                          } else if (
                            changeType ===
                            'Admin Changed'
                          ) {
                            badgeClass =
                              'bg-blue-50 text-blue-700 border-blue-200';
                          }

                          return (

                            <tr
                              key={
                                entry._id ||
                                `${entry.changedAt}-${index}`
                              }
                              className="hover:bg-slate-50/70 transition-colors"
                            >

                              {/* NUMBER */}

                              <td className="px-4 py-3">

                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500">
                                  {index + 1}
                                </span>

                              </td>

                              {/* DATE */}

                              <td className="px-4 py-3 whitespace-nowrap">

                                <p className="font-black text-slate-800">
                                  {formatDate(
                                    entry.changedAt
                                  )}
                                </p>

                                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                                  {formatPakistanDateTime(
                                    entry.changedAt
                                  )}
                                </p>

                              </td>

                              {/* CHANGED BY */}

                              <td className="px-4 py-3">

                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black ${
                                    entry.changedBy ===
                                    'Super Admin'
                                      ? 'bg-violet-50 border-violet-200 text-violet-700'
                                      : 'bg-blue-50 border-blue-200 text-blue-700'
                                  }`}
                                >

                                  <ShieldCheck className="w-3 h-3" />

                                  {entry.changedBy ||
                                    '—'}

                                </span>

                              </td>

                              {/* CHANGE TYPE */}

                              <td className="px-4 py-3">

                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[9px] font-black ${badgeClass}`}
                                >
                                  {changeType}
                                </span>

                              </td>

                              {/* ADMIN EMAIL */}

                              <td className="px-4 py-3">

                                <span className="font-medium text-slate-600 break-all">
                                  {entry.adminEmail ||
                                    '—'}
                                </span>

                              </td>

                            </tr>

                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

            {/* FOOTER */}

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">

              <div className="flex items-center gap-2">

                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />

                <p className="text-[10px] font-semibold text-slate-400">
                  Password values are never stored in history.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closePasswordHistoryModal
                }
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-all"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          RESET PASSWORD MODAL
      ====================================================== */}

      {passwordModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">

            <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">

              <h3 className="font-black text-base">
                Reset Password:{' '}
                {passwordModal.shopName}
              </h3>

              <button
                onClick={
                  closePasswordModal
                }
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <div className="p-6 space-y-4">

              {/* NEW PASSWORD */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  New Password
                </label>

                <div className="relative">

                  <input
                    type={
                      showNewPassword
                        ? 'text'
                        : 'password'
                    }
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(
                        e.target.value
                      )
                    }
                    placeholder="Minimum 12 characters"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 pr-11 text-xs font-bold bg-slate-50 focus:bg-white"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(
                        (visible) =>
                          !visible
                      )
                    }
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-blue-600"
                    aria-label={
                      showNewPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    title={
                      showNewPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                </div>

              </div>

              {/* CONFIRM PASSWORD */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Confirm Password
                </label>

                <div className="relative">

                  <input
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    value={
                      confirmPassword
                    }
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    placeholder="Repeat password"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 pr-11 text-xs font-bold bg-slate-50 focus:bg-white"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (visible) =>
                          !visible
                      )
                    }
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-blue-600"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    title={
                      showConfirmPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                </div>

              </div>

            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">

              <button
                type="button"
                onClick={
                  closePasswordModal
                }
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleResetPassword
                }
                disabled={
                  actionLoading ===
                  'reset-password'
                }
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading ===
                'reset-password'
                  ? 'Resetting...'
                  : 'Update Password'}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          DELETE SHOP MODAL
      ====================================================== */}

      {deleteModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="bg-white border border-rose-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">

            <div className="p-5 sm:p-6 bg-rose-600 text-white flex justify-between items-center shrink-0">

              <h3 className="font-black text-base">
                Permanently Delete Shop
              </h3>

              <button
                onClick={
                  closeDeleteModal
                }
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <div className="p-6 space-y-4">

              <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3.5 rounded-2xl">
                Warning: All data belonging to "
                {deleteModal.shopName}"
                including products, invoices, customers, and expenses will be permanently wiped out.
              </p>

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">

                  Type shop name "

                  <strong className="text-slate-800">
                    {deleteModal.shopName}
                  </strong>

                  " to confirm:

                </label>

                <input
                  type="text"
                  value={
                    deleteConfirmation
                  }
                  onChange={(e) =>
                    setDeleteConfirmation(
                      e.target.value
                    )
                  }
                  placeholder="Exact shop name..."
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs font-bold bg-slate-50"
                />

              </div>

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Super Admin Password *
                </label>

                <div className="relative">

                  <input
                    type={
                      showDeletePassword
                        ? 'text'
                        : 'password'
                    }
                    value={deletePassword}
                    onChange={(e) =>
                      setDeletePassword(
                        e.target.value
                      )
                    }
                    placeholder="Enter super admin password"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 pr-11 text-xs font-bold bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowDeletePassword(
                        (visible) =>
                          !visible
                      )
                    }
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-rose-600"
                    aria-label={
                      showDeletePassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    title={
                      showDeletePassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showDeletePassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                </div>

              </div>

            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">

              <button
                type="button"
                onClick={
                  closeDeleteModal
                }
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteShop
                }
                disabled={
                  actionLoading ===
                    'delete-shop' ||
                  deleteConfirmation.trim() !==
                    deleteModal.shopName ||
                  !deletePassword.trim()
                }
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ===
                'delete-shop'
                  ? 'Deleting...'
                  : 'Delete Permanently'}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          RECORD PAYMENT MODAL
      ====================================================== */}

      {payModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-slate-900 p-5 text-white">

              <div>

                <h3 className="text-base font-black">
                  Record Payment
                </h3>

                <p className="mt-1 text-[10px] text-slate-400">
                  {payModal.shopName} •{' '}
                  {collectionMonthLabel}
                </p>

              </div>

              <button
                type="button"
                onClick={closePayModal}
                className="rounded-xl bg-white/10 p-1.5 text-slate-300 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <div className="space-y-4 p-6">

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Amount (Rs.)
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={payAmount}
                  onChange={(e) =>
                    setPayAmount(
                      e.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />

              </div>

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Paid Via
                </label>

                <select
                  value={payVia}
                  onChange={(e) =>
                    setPayVia(
                      e.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Cash">
                    Cash
                  </option>

                  <option value="Bank Transfer">
                    Bank Transfer
                  </option>

                  <option value="JazzCash">
                    JazzCash
                  </option>

                  <option value="EasyPaisa">
                    EasyPaisa
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>

              </div>

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Note (optional)
                </label>

                <input
                  type="text"
                  value={payNote}
                  onChange={(e) =>
                    setPayNote(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Received via rider"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                />

              </div>

            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">

              <button
                type="button"
                onClick={closePayModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleRecordPayment
                }
                disabled={
                  actionLoading ===
                  'record-payment'
                }
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading ===
                'record-payment'
                  ? 'Saving...'
                  : 'Save Payment'}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          PAYMENT HISTORY MODAL
      ====================================================== */}

      {paymentHistoryShop && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

            <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">

              <h3 className="font-black text-base">
                Payment History:{' '}
                {paymentHistoryShop.shopName}
              </h3>

              <button
                onClick={() =>
                  setPaymentHistoryModal(
                    null
                  )
                }
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

              {(paymentHistoryShop.paymentHistory ||
                []).length ? (

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[550px] text-left text-xs font-medium border border-slate-200 rounded-2xl overflow-hidden">

                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-200">

                      <tr>

                        <th className="px-4 py-3">
                          Month
                        </th>

                        <th className="px-4 py-3 text-right">
                          Amount
                        </th>

                        <th className="px-4 py-3">
                          Via
                        </th>

                        <th className="px-4 py-3">
                          Paid On
                        </th>

                        <th className="px-4 py-3 text-center">
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {[
                        ...paymentHistoryShop.paymentHistory,
                      ]
                        .sort((a, b) =>
                          String(
                            b.month
                          ).localeCompare(
                            String(a.month)
                          )
                        )
                        .map((payment) => (

                          <tr
                            key={payment._id}
                            className="hover:bg-slate-50/60"
                          >

                            <td className="px-4 py-3 font-black text-slate-800">
                              {payment.month}
                            </td>

                            <td className="px-4 py-3 text-right font-black text-emerald-700">
                              Rs.{' '}
                              {Number(
                                payment.amount ||
                                  0
                              ).toLocaleString()}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {payment.paidVia ||
                                '—'}
                            </td>

                            <td className="px-4 py-3 text-slate-500">
                              {formatDate(
                                payment.paidAt
                              )}
                            </td>

                            <td className="px-4 py-3 text-center">

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeletePayment(
                                    paymentHistoryShop,
                                    payment
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black hover:bg-rose-100 transition-all"
                              >
                                Delete
                              </button>

                            </td>

                          </tr>

                        ))}

                    </tbody>

                  </table>

                </div>

              ) : (

                <p className="text-xs text-slate-400 text-center py-10">
                  No payments recorded yet.
                </p>

              )}

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          SHOP NOTES MODAL
      ====================================================== */}

      {notesModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-slate-900 p-5 text-white">

              <div>

                <h3 className="text-base font-black">
                  Shop Notes
                </h3>

                <p className="mt-1 text-[10px] text-slate-400">
                  {notesModal.shopName} •
                  private, only you see this
                </p>

              </div>

              <button
                type="button"
                onClick={closeNotesModal}
                className="rounded-xl bg-white/10 p-1.5 text-slate-300 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <div className="p-6">

              <textarea
                value={notesText}
                onChange={(e) =>
                  setNotesText(
                    e.target.value
                  )
                }
                rows={6}
                placeholder="e.g. Owner se baat hui, agle hafte payment karega..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all resize-none"
              />

            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">

              <button
                type="button"
                onClick={closeNotesModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={
                  actionLoading ===
                  'save-notes'
                }
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {actionLoading ===
                'save-notes'
                  ? 'Saving...'
                  : 'Save Notes'}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          ANNOUNCEMENT MODAL (Create / Edit)
      ====================================================== */}

      {announcementModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-slate-900 p-5 text-white">

              <h3 className="text-base font-black">
                {announcementModal.mode ===
                'edit'
                  ? 'Edit Notice'
                  : 'New Notice'}
              </h3>

              <button
                type="button"
                onClick={
                  closeAnnouncementModal
                }
                className="rounded-xl bg-white/10 p-1.5 text-slate-300 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <div className="space-y-4 p-6">

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Title *
                </label>

                <input
                  type="text"
                  value={
                    announcementTitle
                  }
                  onChange={(e) =>
                    setAnnouncementTitle(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Scheduled Maintenance"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold focus:bg-white focus:outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Message *
                </label>

                <textarea
                  value={
                    announcementMessage
                  }
                  onChange={(e) =>
                    setAnnouncementMessage(
                      e.target.value
                    )
                  }
                  rows={4}
                  placeholder="e.g. Kal raat 2 baje 30 minute ke liye system maintenance hogi."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all resize-none"
                />

              </div>

              <p className="text-[10px] text-slate-400">
                This notice will appear as a
                banner inside every shop's
                panel.
              </p>

            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">

              <button
                type="button"
                onClick={
                  closeAnnouncementModal
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleSaveAnnouncement
                }
                disabled={
                  actionLoading ===
                  'save-announcement'
                }
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ===
                'save-announcement'
                  ? 'Publishing...'
                  : announcementModal.mode ===
                    'edit'
                  ? 'Save Changes'
                  : 'Publish Notice'}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          EDIT SHOP MODAL
      ====================================================== */}

      {editShopModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-slate-900 p-5 text-white">

              <div>

                <h3 className="text-base font-black">
                  Edit Shop
                </h3>

                <p className="mt-1 text-[10px] text-slate-400">
                  {editShopModal.shopName}
                </p>

              </div>

              <button
                type="button"
                onClick={closeEditShopModal}
                className="rounded-xl bg-white/10 p-1.5 text-slate-300 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <div className="space-y-4 p-6">

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Shop Name *
                </label>

                <input
                  type="text"
                  value={editShopName}
                  onChange={(e) =>
                    setEditShopName(
                      e.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold focus:bg-white focus:outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Owner Name *
                </label>

                <input
                  type="text"
                  value={editShopOwner}
                  onChange={(e) =>
                    setEditShopOwner(
                      e.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold focus:bg-white focus:outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Admin Email *
                </label>

                <input
                  type="email"
                  value={editShopEmail}
                  onChange={(e) =>
                    setEditShopEmail(
                      e.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold focus:bg-white focus:outline-none focus:border-blue-500"
                />

                <p className="mt-1 text-[10px] text-slate-400">
                  Changing email also updates the
                  admin login email.
                </p>

              </div>

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  WhatsApp / Phone Number
                </label>

                <input
                  type="tel"
                  value={editShopPhone}
                  onChange={(e) =>
                    setEditShopPhone(
                      e.target.value
                    )
                  }
                  placeholder="03001234567"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold focus:bg-white focus:outline-none focus:border-blue-500"
                />

              </div>

            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">

              <button
                type="button"
                onClick={closeEditShopModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleUpdateShopDetails
                }
                disabled={
                  actionLoading ===
                  'edit-shop'
                }
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ===
                'edit-shop'
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          CONFIRM MODAL
      ====================================================== */}

      <ConfirmModal
        isOpen={!!confirmConfig}
        onClose={() =>
          setConfirmConfig(null)
        }
        onConfirm={async () => {
          if (confirmConfig?.onConfirm) {
            await confirmConfig.onConfirm();
          }

          setConfirmConfig(null);
        }}
        title={
          confirmConfig?.title ||
          'Confirm Action'
        }
        message={
          confirmConfig?.message ||
          'Are you sure you want to proceed?'
        }
      />

    </div>
  );
};

export default SuperAdminDashboard;
