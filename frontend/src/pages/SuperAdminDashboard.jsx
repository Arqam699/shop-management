import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

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
  const [createPlan, setCreatePlan] = useState('Free Trial');
  const [createCompleteMonths, setCreateCompleteMonths] = useState(1);

  // =====================================================
  // RENEW MODAL
  // =====================================================

  const [renewModal, setRenewModal] = useState(null);
  const [renewPlan, setRenewPlan] = useState('Complete');
  const [completeMonths, setCompleteMonths] = useState(1);

  // =====================================================
  // HISTORY MODAL
  // =====================================================

  const [historyModal, setHistoryModal] = useState(null);

  // =====================================================
  // DELETE MODAL
  // =====================================================

  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  // =====================================================
  // RESET PASSWORD MODAL
  // =====================================================

  const [passwordModal, setPasswordModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // =====================================================
  // CONFIRMATION MODAL
  // =====================================================

  const [confirmConfig, setConfirmConfig] = useState(null);

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

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      handleUnauthorized();

      const error = new Error(
        data.message ||
          'Super Admin session expired. Please login again.'
      );

      error.status = 401;

      throw error;
    }

    if (!response.ok) {
      const error = new Error(
        data.message ||
          'Something went wrong.'
      );

      error.status = response.status;

      throw error;
    }

    return data;
  };

  // =====================================================
  // VERIFY SUPER ADMIN SESSION
  // =====================================================

  const verifySuperAdmin = async () => {
    try {
      setAuthChecking(true);
      setError('');

      const data = await fetchJson(
        `${API_URL}/api/super-admin/me`,
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

      if (error.status === 401) {
        return false;
      }

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

      // ===================================================
      // FETCH STATS
      // ===================================================

      const statsData = await fetchJson(
        `${API_URL}/api/super-admin/dashboard`,
        {
          method: 'GET',
        }
      );

      setStats(
        statsData.stats || DEFAULT_STATS
      );

      // ===================================================
      // FETCH SHOPS
      // ===================================================

      const shopsData = await fetchJson(
        `${API_URL}/api/super-admin/shops`,
        {
          method: 'GET',
        }
      );

      // ===================================================
      // NORMALIZE SHOP ID
      // ===================================================

      const normalizedShops = (
        shopsData.shops || []
      ).map((shop) => ({
        ...shop,
        shopId:
          shop.shopId ||
          shop._id,
      }));

      setShops(normalizedShops);

    } catch (error) {
      console.error(
        'Super Admin Dashboard Error:',
        error
      );

      if (error.status === 401) {
        return;
      }

      setError(
        error.message ||
          'Something went wrong while loading dashboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL AUTH + DASHBOARD LOAD
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const initializeDashboard = async () => {
      const authenticated =
        await verifySuperAdmin();

      if (
        authenticated &&
        mounted
      ) {
        await fetchDashboardData();
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // RESET CREATE FORM
  // =====================================================

  const resetCreateShopForm = () => {
    setShopName('');
    setOwnerName('');
    setAdminEmail('');
    setPhone('');
    setAdminPassword('');
    setCreatePlan('Free Trial');
    setCreateCompleteMonths(1);
  };

  // =====================================================
  // CREATE SHOP MODAL
  // =====================================================

  const openCreateShopModal = () => {
    resetCreateShopForm();
    setError('');
    setCreateShopModal(true);
  };

  const closeCreateShopModal = () => {
    if (
      actionLoading === 'create-shop'
    ) {
      return;
    }

    setCreateShopModal(false);
  };

  // =====================================================
  // CREATE SHOP
  // =====================================================

  const handleCreateShop = async () => {
    setError('');

    if (!shopName.trim()) {
      setError(
        'Please enter shop name.'
      );
      return;
    }

    if (!ownerName.trim()) {
      setError(
        'Please enter owner name.'
      );
      return;
    }

    if (!adminEmail.trim()) {
      setError(
        'Please enter admin email.'
      );
      return;
    }

    if (!adminPassword.trim()) {
      setError(
        'Please enter admin password.'
      );
      return;
    }

    if (adminPassword.length < 6) {
      setError(
        'Admin password must be at least 6 characters.'
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
        email: adminEmail
          .trim()
          .toLowerCase(),
        phone: phone.trim(),
        password: adminPassword,
        subscriptionPlan: createPlan,
      };

      if (createPlan === 'Complete') {
        body.durationMonths =
          Number(createCompleteMonths);
      }

      await fetchJson(
        `${API_URL}/api/super-admin/shops`,
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

      await fetchDashboardData();

    } catch (error) {
      console.error(
        'Create Shop Error:',
        error
      );

      if (error.status === 401) {
        return;
      }

      setError(
        error.message ||
          'Failed to create shop.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // SUSPEND SHOP
  // =====================================================

  const handleSuspend = (shopId) => {
    setConfirmConfig({
      title: 'Suspend Shop',
      message: 'Are you sure you want to suspend this shop?',
      onConfirm: async () => {
        try {
      setActionLoading(shopId);
      setError('');

      await fetchJson(
        `${API_URL}/api/super-admin/shops/${shopId}/suspend`,
        {
          method: 'PATCH',
        }
      );

      await fetchDashboardData();

    } catch (error) {
      console.error(
        'Suspend Shop Error:',
        error
      );

      if (error.status === 401) {
        return;
      }

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
  // ACTIVATE SHOP
  // =====================================================

  const handleActivate = (shopId) => {
    setConfirmConfig({
      title: 'Activate Shop',
      message: 'Are you sure you want to activate this shop?',
      onConfirm: async () => {
        try {
      setActionLoading(shopId);
      setError('');

      await fetchJson(
        `${API_URL}/api/super-admin/shops/${shopId}/activate`,
        {
          method: 'PATCH',
        }
      );

      await fetchDashboardData();

    } catch (error) {
      console.error(
        'Activate Shop Error:',
        error
      );

      if (error.status === 401) {
        return;
      }

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

  // =====================================================
  // RENEW MODAL
  // =====================================================

  const openRenewModal = (shop) => {
    setRenewModal(shop);

    setRenewPlan(
      shop.subscriptionPlan ===
        'Free Trial'
        ? 'Complete'
        : shop.subscriptionPlan
    );

    setCompleteMonths(1);
    setError('');
  };

  const closeRenewModal = () => {
    if (actionLoading) {
      return;
    }

    setRenewModal(null);
  };

  // =====================================================
  // RENEW SUBSCRIPTION
  // =====================================================

  const handleRenew = async () => {
    if (!renewModal) {
      return;
    }

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
      setActionLoading(
        renewModal.shopId
      );

      setError('');

      const body = {
        subscriptionPlan: renewPlan,
      };

      if (renewPlan === 'Complete') {
        body.durationMonths =
          Number(completeMonths);
      }

      await fetchJson(
        `${API_URL}/api/super-admin/shops/${renewModal.shopId}/subscription`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      setRenewModal(null);

      await fetchDashboardData();

    } catch (error) {
      console.error(
        'Renew Subscription Error:',
        error
      );

      if (error.status === 401) {
        return;
      }

      setError(
        error.message ||
          'Failed to renew subscription.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // HISTORY MODAL
  // =====================================================

  const openHistoryModal = (shop) => {
    setHistoryModal(shop);
    setError('');
  };

  const closeHistoryModal = () => {
    setHistoryModal(null);
  };

  // =====================================================
  // TOTAL PAID MONTHS
  // =====================================================

  const getTotalPaidMonths = (shop) => {
    if (
      !shop?.subscriptionHistory
    ) {
      return 0;
    }

    return shop.subscriptionHistory.reduce(
      (total, history) => {
        if (
          history.plan ===
          'Complete'
        ) {
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
  // DELETE MODAL
  // =====================================================

  const openDeleteModal = (shop) => {
    setDeleteModal(shop);
    setDeleteConfirmation('');
    setDeletePassword('');
    setError('');
  };

  const closeDeleteModal = () => {
    if (
      actionLoading === 'delete-shop'
    ) {
      return;
    }

    setDeleteModal(null);
    setDeleteConfirmation('');
    setDeletePassword('');
  };

  // =====================================================
  // PERMANENT DELETE
  // =====================================================

  const handleDeleteShop = async () => {
    if (!deleteModal) {
      return;
    }

    setError('');

    // ---------------------------------------------------
    // SHOP NAME CONFIRMATION
    // ---------------------------------------------------

    if (
      deleteConfirmation.trim() !==
      deleteModal.shopName
    ) {
      setError(
        'Shop name does not match. Please type the exact shop name.'
      );
      return;
    }

    // ---------------------------------------------------
    // SUPER ADMIN PASSWORD
    // ---------------------------------------------------

    if (!deletePassword.trim()) {
      setError(
        'Please enter your Super Admin password.'
      );
      return;
    }

    try {
      setActionLoading(
        'delete-shop'
      );

      await fetchJson(
        `${API_URL}/api/super-admin/shops/${deleteModal.shopId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            password:
              deletePassword,
          }),
        }
      );

      setDeleteModal(null);
      setDeleteConfirmation('');
      setDeletePassword('');

      await fetchDashboardData();

    } catch (error) {
      console.error(
        'Permanent Delete Shop Error:',
        error
      );

      if (error.status === 401) {
        return;
      }

      setError(
        error.message ||
          'Failed to permanently delete shop.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // RESET PASSWORD MODAL
  // =====================================================

  const openPasswordModal = (shop) => {
    setPasswordModal(shop);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const closePasswordModal = () => {
    if (
      actionLoading ===
      'reset-password'
    ) {
      return;
    }

    setPasswordModal(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  // =====================================================
  // RESET ADMIN PASSWORD
  // =====================================================

  const handleResetPassword = async () => {
    if (!passwordModal) {
      return;
    }

    setError('');

    if (!newPassword.trim()) {
      setError(
        'Please enter a new password.'
      );
      return;
    }

    if (newPassword.length < 6) {
      setError(
        'Password must be at least 6 characters.'
      );
      return;
    }

    if (!confirmPassword.trim()) {
      setError(
        'Please confirm the new password.'
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        'Passwords do not match.'
      );
      return;
    }

    try {
      setActionLoading(
        'reset-password'
      );

      await fetchJson(
        `${API_URL}/api/super-admin/shops/${passwordModal.shopId}/password`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            newPassword,
          }),
        }
      );

      const shopName =
        passwordModal.shopName;

      setPasswordModal(null);
      setNewPassword('');
      setConfirmPassword('');

      toast.success(
        `Password for ${shopName} has been reset successfully.`
      );

    } catch (error) {
      console.error(
        'Reset Password Error:',
        error
      );

      if (error.status === 401) {
        return;
      }

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
      await fetch(
        `${API_URL}/api/super-admin/logout`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
    } catch (error) {
      console.error(
        'Super Admin Logout Error:',
        error
      );
    } finally {
      navigate(
        '/super-admin/login',
        {
          replace: true,
        }
      );
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return '—';
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return '—';
    }

    return parsedDate.toLocaleDateString(
      'en-PK',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  // =====================================================
  // AUTH CHECK SCREEN
  // =====================================================

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="rounded-xl bg-white px-8 py-7 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

          <p className="text-sm font-medium text-gray-700">
            Verifying Super Admin session...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-100 p-3 sm:p-5 lg:p-6">

      <div className="mx-auto w-full max-w-7xl">

        {/* =================================================
            HEADER
            ================================================= */}

        <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">

          <div className="min-w-0">

            <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
              Super Admin Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              Manage all shops, subscriptions, and administrators.
            </p>

            {superAdmin && (
              <p className="mt-1 text-xs text-gray-500">
                Logged in as:{' '}
                <span className="font-semibold text-gray-700">
                  {superAdmin.name}
                </span>
              </p>
            )}

          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">

            <button
              type="button"
              onClick={openCreateShopModal}
              className="w-full rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 sm:w-auto"
            >
              + Create New Shop
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
            >
              Logout
            </button>

          </div>

        </div>

        {/* =================================================
            ERROR
            ================================================= */}

        {error && (
          <div className="mb-6 break-words rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            STATISTICS
            ================================================= */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mb-8 lg:grid-cols-4 lg:gap-5">

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <p className="text-sm font-medium text-gray-500">
              Total Shops
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading
                ? '...'
                : stats.totalShops}
            </p>

          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <p className="text-sm font-medium text-gray-500">
              Active Shops
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {loading
                ? '...'
                : stats.activeShops}
            </p>

          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <p className="text-sm font-medium text-gray-500">
              Expired Shops
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {loading
                ? '...'
                : stats.expiredShops}
            </p>

          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <p className="text-sm font-medium text-gray-500">
              Suspended Shops
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-600">
              {loading
                ? '...'
                : stats.suspendedShops}
            </p>

          </div>

        </div>

        {/* =================================================
            ALL SHOPS
            ================================================= */}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">

          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">

            <h2 className="text-xl font-semibold text-gray-900">
              All Shops
            </h2>

            <p className="mt-1 text-sm leading-5 text-gray-500">
              View and manage all registered shops.
            </p>

          </div>

          {loading ? (

            <div className="px-4 py-12 text-center text-gray-500 sm:px-6">
              Loading shops...
            </div>

          ) : shops.length === 0 ? (

            <div className="px-4 py-12 text-center text-gray-500 sm:px-6">
              No shops found.
            </div>

          ) : (

            <div>

              {/* =================================================
                  MOBILE SHOP CARDS
                  ================================================= */}

              <div className="space-y-4 p-4 md:hidden">

                {shops.map((shop) => {

                  const isLoading =
                    actionLoading ===
                    shop.shopId;

                  const historyCount =
                    shop.subscriptionHistory
                      ?.length || 0;

                  return (
                    <div
                      key={shop.shopId}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >

                      {/* SHOP */}

                      <div className="mb-4">

                        <p className="break-words text-base font-bold text-gray-900">
                          {shop.shopName}
                        </p>

                        <p className="mt-1 break-all text-xs text-gray-400">
                          ID: {shop.shopId}
                        </p>

                      </div>

                      {/* DETAILS */}

                      <div className="space-y-3 border-t border-gray-100 pt-4">

                        <div className="flex items-start justify-between gap-4">

                          <span className="shrink-0 text-sm text-gray-500">
                            Owner
                          </span>

                          <span className="break-words text-right text-sm font-medium text-gray-900">
                            {shop.ownerName ||
                              '—'}
                          </span>

                        </div>

                        <div className="flex items-start justify-between gap-4">

                          <span className="shrink-0 text-sm text-gray-500">
                            Admin Email
                          </span>

                          <span className="max-w-[65%] break-all text-right text-sm text-gray-700">
                            {shop.adminEmail ||
                              shop.email ||
                              '—'}
                          </span>

                        </div>

                        <div className="flex items-center justify-between gap-4">

                          <span className="text-sm text-gray-500">
                            Plan
                          </span>

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {shop.subscriptionPlan ||
                              '—'}
                          </span>

                        </div>

                        <div className="flex items-center justify-between gap-4">

                          <span className="text-sm text-gray-500">
                            Status
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              shop.subscriptionStatus ===
                              'Active'
                                ? 'bg-green-50 text-green-700'
                                : shop.subscriptionStatus ===
                                  'Expired'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-orange-50 text-orange-700'
                            }`}
                          >
                            {shop.subscriptionStatus ||
                              '—'}
                          </span>

                        </div>

                        <div className="flex items-center justify-between gap-4">

                          <span className="text-sm text-gray-500">
                            Expiry
                          </span>

                          <span className="text-right text-sm font-medium text-gray-900">
                            {formatDate(
                              shop.subscriptionExpiresAt
                            )}
                          </span>

                        </div>

                      </div>

                      {/* MOBILE ACTIONS */}

                      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() =>
                            openHistoryModal(
                              shop
                            )
                          }
                          className="rounded-lg bg-purple-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          History
                          {historyCount > 0 &&
                            ` (${historyCount})`}
                        </button>

                        {shop.subscriptionStatus ===
                          'Active' && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() =>
                              handleSuspend(
                                shop.shopId
                              )
                            }
                            className="rounded-lg bg-orange-500 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isLoading
                              ? 'Processing...'
                              : 'Suspend'}
                          </button>
                        )}

                        {shop.subscriptionStatus ===
                          'Suspended' && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() =>
                              handleActivate(
                                shop.shopId
                              )
                            }
                            className="rounded-lg bg-green-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isLoading
                              ? 'Processing...'
                              : 'Activate'}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() =>
                            openRenewModal(
                              shop
                            )
                          }
                          className="rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Renew
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() =>
                            openPasswordModal(
                              shop
                            )
                          }
                          className="rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reset Password
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() =>
                            openDeleteModal(
                              shop
                            )
                          }
                          className="col-span-2 rounded-lg bg-red-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete Shop
                        </button>

                      </div>

                    </div>
                  );
                })}

              </div>

              {/* =================================================
                  DESKTOP TABLE
                  ================================================= */}

              <div className="hidden overflow-x-auto md:block">

                <table className="min-w-[1100px] divide-y divide-gray-200">

                  <thead className="bg-gray-50">

                    <tr>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Shop
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Owner
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Admin Email
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Plan
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Expiry
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Actions
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">

                    {shops.map((shop) => {

                      const isLoading =
                        actionLoading ===
                        shop.shopId;

                      const historyCount =
                        shop.subscriptionHistory
                          ?.length || 0;

                      return (
                        <tr
                          key={shop.shopId}
                          className="hover:bg-gray-50"
                        >

                          {/* SHOP */}

                          <td className="max-w-[220px] px-5 py-4">

                            <div className="break-words font-medium text-gray-900">
                              {shop.shopName}
                            </div>

                            <div className="mt-1 break-all text-xs text-gray-400">
                              ID: {shop.shopId}
                            </div>

                          </td>

                          {/* OWNER */}

                          <td className="max-w-[150px] px-5 py-4 text-sm text-gray-700">

                            <div className="break-words">
                              {shop.ownerName ||
                                '—'}
                            </div>

                          </td>

                          {/* EMAIL */}

                          <td className="max-w-[220px] px-5 py-4 text-sm text-gray-700">

                            <div className="break-all">
                              {shop.adminEmail ||
                                shop.email ||
                                '—'}
                            </div>

                          </td>

                          {/* PLAN */}

                          <td className="px-5 py-4">

                            <span className="whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              {shop.subscriptionPlan ||
                                '—'}
                            </span>

                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">

                            <span
                              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                                shop.subscriptionStatus ===
                                'Active'
                                  ? 'bg-green-50 text-green-700'
                                  : shop.subscriptionStatus ===
                                    'Expired'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-orange-50 text-orange-700'
                              }`}
                            >
                              {shop.subscriptionStatus ||
                                '—'}
                            </span>

                          </td>

                          {/* EXPIRY */}

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                            {formatDate(
                              shop.subscriptionExpiresAt
                            )}
                          </td>

                          {/* ACTIONS */}

                          <td className="px-5 py-4">

                            <div className="flex w-[410px] flex-wrap gap-2">

                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() =>
                                  openHistoryModal(
                                    shop
                                  )
                                }
                                className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                History
                                {historyCount > 0 &&
                                  ` (${historyCount})`}
                              </button>

                              {shop.subscriptionStatus ===
                                'Active' && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() =>
                                    handleSuspend(
                                      shop.shopId
                                    )
                                  }
                                  className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isLoading
                                    ? 'Processing...'
                                    : 'Suspend'}
                                </button>
                              )}

                              {shop.subscriptionStatus ===
                                'Suspended' && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() =>
                                    handleActivate(
                                      shop.shopId
                                    )
                                  }
                                  className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isLoading
                                    ? 'Processing...'
                                    : 'Activate'}
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() =>
                                  openRenewModal(
                                    shop
                                  )
                                }
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Renew
                              </button>

                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() =>
                                  openPasswordModal(
                                    shop
                                  )
                                }
                                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reset Password
                              </button>

                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() =>
                                  openDeleteModal(
                                    shop
                                  )
                                }
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Delete
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>

            </div>
          )}

        </div>
      </div>

      {/* =====================================================
          CREATE SHOP MODAL
          ===================================================== */}

      {createShopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">

          <div className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">

              <div className="min-w-0">

                <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                  Create New Shop
                </h2>

                <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                  Create a new shop and administrator account.
                </p>

              </div>

              <button
                type="button"
                disabled={
                  actionLoading ===
                  'create-shop'
                }
                onClick={
                  closeCreateShopModal
                }
                className="shrink-0 rounded-lg px-2 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
              >
                ×
              </button>

            </div>

            <div className="overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">

              <div className="space-y-5">

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Shop Name
                  </label>

                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) =>
                      setShopName(
                        e.target.value
                      )
                    }
                    placeholder="Enter shop name"
                    disabled={
                      actionLoading ===
                      'create-shop'
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 sm:px-4"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Owner Name
                  </label>

                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) =>
                      setOwnerName(
                        e.target.value
                      )
                    }
                    placeholder="Enter owner name"
                    disabled={
                      actionLoading ===
                      'create-shop'
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 sm:px-4"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Admin Email
                  </label>

                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) =>
                      setAdminEmail(
                        e.target.value
                      )
                    }
                    placeholder="admin@example.com"
                    disabled={
                      actionLoading ===
                      'create-shop'
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 sm:px-4"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                      )
                    }
                    placeholder="03001234567"
                    disabled={
                      actionLoading ===
                      'create-shop'
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 sm:px-4"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Admin Password
                  </label>

                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) =>
                      setAdminPassword(
                        e.target.value
                      )
                    }
                    placeholder="Minimum 6 characters"
                    disabled={
                      actionLoading ===
                      'create-shop'
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 sm:px-4"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Subscription Plan
                  </label>

                  <select
                    value={createPlan}
                    onChange={(e) =>
                      setCreatePlan(
                        e.target.value
                      )
                    }
                    disabled={
                      actionLoading ===
                      'create-shop'
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 sm:px-4"
                  >

                    <option value="Free Trial">
                      Free Trial — 3 Days
                    </option>

                    <option value="Complete">
                      Complete
                    </option>

                  </select>

                </div>

                {createPlan ===
                  'Complete' && (
                  <div>

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Number of Months
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        createCompleteMonths
                      }
                      onChange={(e) =>
                        setCreateCompleteMonths(
                          e.target.value
                        )
                      }
                      disabled={
                        actionLoading ===
                        'create-shop'
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 sm:px-4"
                      placeholder="Enter months"
                    />

                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Example: 3 = 3 months, 6 = 6 months, 12 = 1 year.
                    </p>

                  </div>
                )}

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-700 sm:p-4">

                  {createPlan ===
                  'Free Trial'
                    ? 'Free Trial provides exactly 3 days of access.'
                    : 'Complete subscription will remain active for the number of months selected above.'}

                </div>

              </div>

            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-gray-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">

              <button
                type="button"
                disabled={
                  actionLoading ===
                  'create-shop'
                }
                onClick={
                  closeCreateShopModal
                }
                className="w-full rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  actionLoading ===
                  'create-shop'
                }
                onClick={
                  handleCreateShop
                }
                className="w-full rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 sm:w-auto"
              >
                {actionLoading ===
                'create-shop'
                  ? 'Creating...'
                  : 'Create Shop'}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          RENEW MODAL
          ===================================================== */}

      {renewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">

          <div className="flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="shrink-0 border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">

              <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                Renew Subscription
              </h2>

              <p className="mt-1 break-words text-sm text-gray-500">
                {renewModal.shopName}
              </p>

            </div>

            <div className="overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">

              <div className="space-y-5">

                <div className="rounded-lg bg-gray-50 p-4">

                  <div className="flex items-start justify-between gap-4 text-sm">

                    <span className="text-gray-500">
                      Current Plan
                    </span>

                    <span className="text-right font-semibold text-gray-900">
                      {renewModal.subscriptionPlan}
                    </span>

                  </div>

                  <div className="mt-3 flex items-start justify-between gap-4 text-sm">

                    <span className="text-gray-500">
                      Current Status
                    </span>

                    <span className="text-right font-semibold text-gray-900">
                      {renewModal.subscriptionStatus}
                    </span>

                  </div>

                  <div className="mt-3 flex items-start justify-between gap-4 text-sm">

                    <span className="text-gray-500">
                      Current Expiry
                    </span>

                    <span className="text-right font-semibold text-gray-900">
                      {formatDate(
                        renewModal.subscriptionExpiresAt
                      )}
                    </span>

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Subscription Plan
                  </label>

                  <select
                    value={renewPlan}
                    onChange={(e) =>
                      setRenewPlan(
                        e.target.value
                      )
                    }
                    disabled={
                      actionLoading ===
                      renewModal.shopId
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 sm:px-4"
                  >

                    <option value="Free Trial">
                      Free Trial — 3 Days
                    </option>

                    <option value="Complete">
                      Complete
                    </option>

                  </select>

                </div>

                {renewPlan ===
                  'Complete' && (
                  <div>

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Number of Months
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        completeMonths
                      }
                      onChange={(e) =>
                        setCompleteMonths(
                          e.target.value
                        )
                      }
                      disabled={
                        actionLoading ===
                        renewModal.shopId
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 sm:px-4"
                      placeholder="Enter months"
                    />

                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Example: 3 = 3 months, 6 = 6 months, 12 = 1 year.
                    </p>

                  </div>
                )}

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-700 sm:p-4">

                  {renewPlan ===
                  'Free Trial'
                    ? 'Free Trial will provide exactly 3 days of access.'
                    : 'If the current subscription has not expired, the new duration will be added after the current expiry date.'}

                </div>

              </div>

            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">

              <button
                type="button"
                disabled={
                  actionLoading ===
                  renewModal.shopId
                }
                onClick={
                  closeRenewModal
                }
                className="w-full rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  actionLoading ===
                  renewModal.shopId
                }
                onClick={
                  handleRenew
                }
                className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
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
          HISTORY MODAL
          ===================================================== */}

      {historyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-4">

          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">

              <div className="min-w-0">

                <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                  Subscription History
                </h2>

                <p className="mt-1 break-words text-sm text-gray-500">
                  {historyModal.shopName}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeHistoryModal
                }
                className="shrink-0 rounded-lg px-2 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                ×
              </button>

            </div>

            <div className="overflow-y-auto p-4 sm:p-6">

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-sm text-gray-500">
                    Total Renewals
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {historyModal
                      .subscriptionHistory
                      ?.length || 0}
                  </p>

                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-sm text-gray-500">
                    Total Paid Months
                  </p>

                  <p className="mt-1 text-2xl font-bold text-blue-600">
                    {getTotalPaidMonths(
                      historyModal
                    )}
                  </p>

                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-sm text-gray-500">
                    Current Plan
                  </p>

                  <p className="mt-1 break-words text-lg font-bold text-gray-900">
                    {historyModal
                      .subscriptionPlan ||
                      '—'}
                  </p>

                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-sm text-gray-500">
                    Current Expiry
                  </p>

                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {formatDate(
                      historyModal.subscriptionExpiresAt
                    )}
                  </p>

                </div>

              </div>

              {historyModal
                .subscriptionHistory
                ?.length > 0 ? (

                <div className="overflow-x-auto rounded-xl border border-gray-200">

                  <table className="min-w-[750px] divide-y divide-gray-200">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          #
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Plan
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Duration
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Renewed On
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Previous Expiry
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          New Expiry
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">

                      {historyModal
                        .subscriptionHistory
                        .slice()
                        .reverse()
                        .map(
                          (
                            history,
                            index
                          ) => (

                            <tr
                              key={
                                history._id ||
                                index
                              }
                              className="hover:bg-gray-50"
                            >

                              <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900">
                                {historyModal
                                  .subscriptionHistory
                                  .length -
                                  index}
                              </td>

                              <td className="whitespace-nowrap px-4 py-4">

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    history.plan ===
                                    'Free Trial'
                                      ? 'bg-purple-50 text-purple-700'
                                      : 'bg-blue-50 text-blue-700'
                                  }`}
                                >
                                  {history.plan}
                                </span>

                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">

                                {history.plan ===
                                'Free Trial'
                                  ? '3 Days'
                                  : `${history.durationMonths || 0} ${
                                      Number(
                                        history.durationMonths
                                      ) === 1
                                        ? 'Month'
                                        : 'Months'
                                    }`}

                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                {formatDate(
                                  history.renewedAt
                                )}
                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                {formatDate(
                                  history.previousExpiryDate
                                )}
                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900">
                                {formatDate(
                                  history.newExpiryDate
                                )}
                              </td>

                            </tr>

                          )
                        )}

                    </tbody>

                  </table>

                </div>

              ) : (

                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">

                  <p className="text-sm text-gray-500">
                    No subscription renewal history available.
                  </p>

                </div>

              )}

            </div>

            <div className="shrink-0 border-t border-gray-200 px-4 py-4 sm:px-6">

              <button
                type="button"
                onClick={
                  closeHistoryModal
                }
                className="w-full rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 sm:w-auto sm:float-right"
              >
                Close
              </button>

              <div className="clear-both" />

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          RESET PASSWORD MODAL
          ===================================================== */}

      {passwordModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-4">

          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">

              <div className="min-w-0">

                <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                  Reset Admin Password
                </h2>

                <p className="mt-1 break-words text-sm text-gray-500">
                  Set a new password for this shop administrator.
                </p>

              </div>

              <button
                type="button"
                disabled={
                  actionLoading ===
                  'reset-password'
                }
                onClick={
                  closePasswordModal
                }
                className="shrink-0 rounded-lg px-2 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
              >
                ×
              </button>

            </div>

            <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">

              <div className="rounded-xl bg-gray-50 p-4">

                <div className="flex items-start justify-between gap-4 text-sm">

                  <span className="shrink-0 text-gray-500">
                    Shop
                  </span>

                  <span className="break-words text-right font-semibold text-gray-900">
                    {passwordModal.shopName}
                  </span>

                </div>

                <div className="mt-3 flex items-start justify-between gap-4 text-sm">

                  <span className="shrink-0 text-gray-500">
                    Admin
                  </span>

                  <span className="max-w-[65%] break-all text-right font-semibold text-gray-900">
                    {passwordModal.adminEmail ||
                      passwordModal.email ||
                      '—'}
                  </span>

                </div>

              </div>

              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm leading-6 text-indigo-700 sm:p-4">
                The current password will not be displayed.
                You are setting a completely new password for
                this administrator.
              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  New Password
                </label>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  placeholder="Minimum 6 characters"
                  disabled={
                    actionLoading ===
                    'reset-password'
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 disabled:bg-gray-100 sm:px-4"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Confirm New Password
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter password again"
                  disabled={
                    actionLoading ===
                    'reset-password'
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 disabled:bg-gray-100 sm:px-4"
                />

              </div>

            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">

              <button
                type="button"
                disabled={
                  actionLoading ===
                  'reset-password'
                }
                onClick={
                  closePasswordModal
                }
                className="w-full rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  actionLoading ===
                  'reset-password'
                }
                onClick={
                  handleResetPassword
                }
                className="w-full rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {actionLoading ===
                'reset-password'
                  ? 'Resetting...'
                  : 'Reset Password'}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          DELETE MODAL
          ===================================================== */}

      {deleteModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 sm:p-4">

          <div className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-4 sm:px-6 sm:py-5">

              <div className="flex items-start justify-between gap-4">

                <div className="min-w-0">

                  <h2 className="text-lg font-bold text-red-700 sm:text-xl">
                    Permanently Delete Shop
                  </h2>

                  <p className="mt-1 text-sm text-red-600">
                    This action cannot be undone.
                  </p>

                </div>

                <button
                  type="button"
                  disabled={
                    actionLoading ===
                    'delete-shop'
                  }
                  onClick={
                    closeDeleteModal
                  }
                  className="shrink-0 rounded-lg px-2 py-1 text-2xl leading-none text-gray-500 hover:bg-white hover:text-gray-900 disabled:opacity-50"
                >
                  ×
                </button>

              </div>

            </div>

            <div className="overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">

              <div className="space-y-5">

                <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                  <p className="text-sm font-semibold leading-6 text-red-800">
                    Warning: All data belonging to this shop
                    will be permanently deleted.
                  </p>

                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-red-700">

                    <li>Shop account</li>
                    <li>Admin account</li>
                    <li>Customers</li>
                    <li>Products and inventory</li>
                    <li>Sales and invoices</li>
                    <li>Payments</li>
                    <li>Installments</li>
                    <li>Expenses</li>
                    <li>Returns</li>
                    <li>Yearly audits</li>
                    <li>Settings</li>
                    <li>Stock movements</li>

                  </ul>

                </div>

                <div className="rounded-xl bg-gray-50 p-4">

                  <div className="flex items-start justify-between gap-4 text-sm">

                    <span className="shrink-0 text-gray-500">
                      Shop
                    </span>

                    <span className="break-words text-right font-semibold text-gray-900">
                      {deleteModal.shopName}
                    </span>

                  </div>

                  <div className="mt-3 flex items-start justify-between gap-4 text-sm">

                    <span className="shrink-0 text-gray-500">
                      Owner
                    </span>

                    <span className="break-words text-right font-semibold text-gray-900">
                      {deleteModal.ownerName}
                    </span>

                  </div>

                  <div className="mt-3 flex items-start justify-between gap-4 text-sm">

                    <span className="shrink-0 text-gray-500">
                      Admin Email
                    </span>

                    <span className="max-w-[65%] break-all text-right font-semibold text-gray-900">
                      {deleteModal.adminEmail ||
                        deleteModal.email ||
                        '—'}
                    </span>

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Type the shop name to confirm:
                  </label>

                  <div className="mb-2 break-words rounded-lg bg-gray-100 px-4 py-3 text-sm font-bold text-gray-900">
                    {deleteModal.shopName}
                  </div>

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
                    placeholder="Type shop name exactly"
                    disabled={
                      actionLoading ===
                      'delete-shop'
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-red-500 disabled:bg-gray-100 sm:px-4"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    The name must match exactly.
                  </p>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Super Admin Password
                  </label>

                  <input
                    type="password"
                    value={
                      deletePassword
                    }
                    onChange={(e) =>
                      setDeletePassword(
                        e.target.value
                      )
                    }
                    placeholder="Enter your Super Admin password"
                    disabled={
                      actionLoading ===
                      'delete-shop'
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-red-500 disabled:bg-gray-100 sm:px-4"
                  />

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Your Super Admin password is required to permanently delete this shop.
                  </p>

                </div>

              </div>

            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">

              <button
                type="button"
                disabled={
                  actionLoading ===
                  'delete-shop'
                }
                onClick={
                  closeDeleteModal
                }
                className="w-full rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  actionLoading ===
                    'delete-shop' ||
                  deleteConfirmation.trim() !==
                    deleteModal.shopName ||
                  !deletePassword.trim()
                }
                onClick={
                  handleDeleteShop
                }
                className="w-full rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {actionLoading ===
                'delete-shop'
                  ? 'Deleting Permanently...'
                  : 'Permanently Delete'}
              </button>

            </div>

          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmConfig}
        onClose={() => setConfirmConfig(null)}
        onConfirm={async () => {
          if (confirmConfig?.onConfirm) {
            await confirmConfig.onConfirm();
          }
          setConfirmConfig(null);
        }}
        title={confirmConfig?.title || 'Confirm Action'}
        message={confirmConfig?.message || 'Are you sure you want to proceed?'}
      />
    </div>
  );
};

export default SuperAdminDashboard;