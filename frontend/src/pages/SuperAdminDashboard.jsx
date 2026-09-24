import React, { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import toast from 'react-hot-toast';

import ConfirmModal from '../components/ConfirmModal';

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
} from 'lucide-react';

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
  // HISTORY MODAL
  // =====================================================

  const [historyModal, setHistoryModal] = useState(null);
  const [loginIpModal, setLoginIpModal] = useState(null);

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
        data.message || 'Something went wrong.'
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
        `${API_URL}/api/super-admin/dashboard`,
        {
          method: 'GET',
        }
      );

      setStats(
        statsData.stats || DEFAULT_STATS
      );

      const shopsData = await fetchJson(
        `${API_URL}/api/super-admin/shops`,
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

    if (adminPassword.length < 6) {
      setError(
        'Admin password must be at least 6 characters.'
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
        `${API_URL}/api/super-admin/shops/${chargeModal.shopId}/monthly-charge`,
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
            `${API_URL}/api/super-admin/shops/${shopId}/suspend`,
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
  // ACTIVATE + WHATSAPP
  // =====================================================

  const handleActivate = (shopId) => {
    const shop = shops.find(
      (item) => item.shopId === shopId
    );

    setConfirmConfig({
      title: 'Activate Shop',

      message:
        'Are you sure you want to activate this shop?',

      onConfirm: async () => {
        try {
          setActionLoading(shopId);
          setError('');

          // --------------------------------------------
          // ACTIVATE SHOP
          // --------------------------------------------

          await fetchJson(
            `${API_URL}/api/super-admin/shops/${shopId}/activate`,
            {
              method: 'PATCH',
            }
          );

          toast.success(
            'Shop activated successfully.'
          );

          // --------------------------------------------
          // CREATE WHATSAPP MESSAGE
          // --------------------------------------------

          if (shop) {
            const email =
              shop.adminEmail ||
              shop.email ||
              'Not provided';

            const suspensionReason = String(
              shop.suspensionReason || ''
            ).toLowerCase();

            let whatsappMessage = '';

            // ------------------------------------------
            // 3 WRONG PASSWORD
            // ------------------------------------------

            if (
              suspensionReason.includes(
                'wrong password'
              ) ||
              suspensionReason.includes(
                'incorrect password'
              ) ||
              suspensionReason.includes(
                '3 incorrect'
              ) ||
              suspensionReason.includes(
                'three incorrect'
              )
            ) {
              whatsappMessage =
                `Assalam o Alaikum,\n\n` +
                `Ap ki shop is liye suspend hoi kyun ke ap ne 3 dafa wrong password lagaya tha.\n\n` +
                `Agar ap ko apna password yaad nahi hai to humein bata dein, ap ko new password de diya jaye ga.\n\n` +
                `Ap ka Email: ${email}\n\n` +
                `Ye ap ka account hai aur is ko activate kar diya gaya hai. Ap ab apna POS system use kar sakte hain.\n\n` +
                `Meharbani kar ke ainda password sahi enter karein taake account dobara suspend na ho.\n\n` +
                `Shukriya.`;
            }

            // ------------------------------------------
            // 4TH DEVICE
            // ------------------------------------------

            else if (
              suspensionReason.includes(
                'fourth device'
              ) ||
              suspensionReason.includes(
                '4th device'
              ) ||
              suspensionReason.includes(
                'fourth different device'
              )
            ) {
              whatsappMessage =
                `Assalam o Alaikum,\n\n` +
                `Ap ki shop is liye suspend hoi kyun ke 4th device se login karne ki koshish ki gayi thi.\n\n` +
                `Ap ki shop par maximum 3 devices se login allowed hai. 4th device se login allowed nahi hai.\n\n` +
                `Meharbani kar ke ainda 4th device se login na karein, warna ap ki shop dobara suspend ho sakti hai.\n\n` +
                `Ap ka Email: ${email}\n\n` +
                `Ye ap ka account hai aur is ko activate kar diya gaya hai. Ap ab apna POS system use kar sakte hain.\n\n` +
                `Shukriya.`;
            }

            // ------------------------------------------
            // OTHER REASON
            // ------------------------------------------

            else {
              whatsappMessage =
                `Assalam o Alaikum,\n\n` +
                `Ap ki shop suspend hoi thi.\n\n` +
                `Suspension Reason: ${
                  shop.suspensionReason ||
                  'Not provided'
                }\n\n` +
                `Ap ka Email: ${email}\n\n` +
                `Ye ap ka account hai aur is ko activate kar diya gaya hai. Ap ab apna POS system use kar sakte hain.\n\n` +
                `Shukriya.`;
            }

            // ------------------------------------------
            // GET PHONE NUMBER
            // ------------------------------------------

            let phoneNumber = String(
              shop.phone || ''
            ).replace(/\D/g, '');

            // Pakistan:
            // 03001234567
            // -> 923001234567

            if (phoneNumber.startsWith('0')) {
              phoneNumber =
                `92${phoneNumber.substring(1)}`;
            }

            // ------------------------------------------
            // OPEN WHATSAPP
            // ------------------------------------------

            if (phoneNumber) {
              const whatsappUrl =
                `https://wa.me/${phoneNumber}?text=` +
                encodeURIComponent(
                  whatsappMessage
                );

              window.open(
                whatsappUrl,
                '_blank',
                'noopener,noreferrer'
              );
            } else {
              toast.error(
                'Shop activated, but no WhatsApp number was found.'
              );
            }
          }

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
  // HISTORY & IP MODALS
  // =====================================================

  const openHistoryModal = (shop) => {
    setHistoryModal(shop);
    setError('');
  };

  const closeHistoryModal = () => {
    setHistoryModal(null);
  };

  const openLoginIpModal = (shop) => {
    setLoginIpModal(shop);
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
  // DELETE SHOP
  // =====================================================

  const openDeleteModal = (shop) => {
    setDeleteModal(shop);
    setDeleteConfirmation('');
    setDeletePassword('');
    setError('');
  };

  const closeDeleteModal = () => {
    if (actionLoading === 'delete-shop')
      return;

    setDeleteModal(null);
    setDeleteConfirmation('');
    setDeletePassword('');
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
        `${API_URL}/api/super-admin/shops/${deleteModal.shopId}`,
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
    setError('');
  };

  const closePasswordModal = () => {
    if (actionLoading === 'reset-password')
      return;

    setPasswordModal(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleResetPassword = async () => {
    if (!passwordModal) return;

    setError('');

    if (
      !newPassword.trim() ||
      newPassword.length < 6
    ) {
      setError(
        'Password must be at least 6 characters.'
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
        `${API_URL}/api/super-admin/shops/${passwordModal.shopId}/password`,
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
            STATISTICS
        ====================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
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

          <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
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

          <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
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

          <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
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

        </div>

        {/* =====================================================
            SHOPS TABLE
        ====================================================== */}

        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">

          <div className="p-5 sm:p-6 border-b border-slate-100">

            <h2 className="text-base font-black text-slate-900">
              Tenant Shops Directory
            </h2>

            <p className="text-xs text-slate-400 mt-0.5">
              Manage shop statuses, subscriptions, and access passwords
            </p>

          </div>

          {loading ? (
            <div className="p-16 text-center text-xs font-black uppercase text-slate-400">
              Loading tenant database...
            </div>
          ) : shops.length === 0 ? (
            <div className="p-16 text-center text-xs font-bold text-slate-400">
              No shops registered in the system yet.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-left text-xs text-slate-600 font-medium">

                <thead className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">

                  <tr>
                    <th className="px-5 py-4">
                      Shop Details
                    </th>

                    <th className="px-5 py-4">
                      Owner Name
                    </th>

                    <th className="px-5 py-4">
                      Admin Email
                    </th>

                    <th className="px-5 py-4">
                      Plan
                    </th>

                    <th className="px-5 py-4 text-right">
                      Monthly Charge
                    </th>

                    <th className="px-5 py-4 text-center">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Expiry Date
                    </th>

                    <th className="px-5 py-4 text-center">
                      Actions
                    </th>
                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

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
                        className="hover:bg-slate-50/80 transition-colors"
                      >

                        <td className="px-5 py-3.5">

                          <p className="font-black text-slate-900 text-sm">
                            {shop.shopName}
                          </p>

                          <p className="text-[10px] text-slate-400 font-semibold font-mono">
                            ID: {shop.shopId}
                          </p>

                        </td>

                        <td className="px-5 py-3.5 font-bold text-slate-700">
                          {shop.ownerName || '—'}
                        </td>

                        <td className="px-5 py-3.5 font-bold text-slate-700 break-all">
                          {shop.adminEmail ||
                            shop.email ||
                            '—'}
                        </td>

                        <td className="px-5 py-3.5">

                          <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black">
                            {shop.subscriptionPlan ||
                              '—'}
                          </span>

                        </td>

                        <td className="px-5 py-3.5 text-right whitespace-nowrap">

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

                        <td className="px-5 py-3.5 text-center">

                          <span
                            className={`px-2.5 py-1 rounded-full text-[9px] font-black border ${
                              shop.subscriptionStatus ===
                              'Active'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : shop.subscriptionStatus ===
                                  'Expired'
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}
                          >
                            {shop.subscriptionStatus ||
                              '—'}
                          </span>

                          {shop.subscriptionStatus ===
                            'Suspended' &&
                            shop.suspensionReason && (
                              <p className="text-[9px] text-amber-600 mt-1 max-w-[150px] truncate">
                                {
                                  shop.suspensionReason
                                }
                              </p>
                            )}

                        </td>

                        <td className="px-5 py-3.5 font-bold text-slate-700 whitespace-nowrap">
                          {formatDate(
                            shop.subscriptionExpiresAt
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-center">

                          <div className="flex flex-wrap items-center justify-center gap-1.5">

                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() =>
                                openHistoryModal(
                                  shop
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black hover:bg-purple-100 transition-all"
                            >
                              History{' '}
                              {historyCount > 0 &&
                                `(${historyCount})`}
                            </button>

                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() =>
                                openLoginIpModal(
                                  shop
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black hover:bg-slate-200 transition-all"
                            >
                              IPs (
                              {shop.loginIpHistory
                                ?.length || 0}
                              )
                            </button>

                            {shop.subscriptionStatus ===
                            'Active' ? (
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() =>
                                  handleSuspend(
                                    shop.shopId
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black hover:bg-amber-100 transition-all"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() =>
                                  handleActivate(
                                    shop.shopId
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black hover:bg-emerald-100 transition-all"
                              >
                                {isLoading
                                  ? 'Activating...'
                                  : 'Activate'}
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() =>
                                openChargeModal(
                                  shop
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black hover:bg-emerald-100 transition-all"
                            >
                              Charge
                            </button>

                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() =>
                                openRenewModal(
                                  shop
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black hover:bg-blue-100 transition-all"
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
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black hover:bg-indigo-100 transition-all"
                            >
                              Password
                            </button>

                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() =>
                                openDeleteModal(
                                  shop
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black hover:bg-rose-100 transition-all"
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
          )}

        </div>

      </div>

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
                    placeholder="Minimum 6 characters"
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
                <X className="w-4 h-4" />
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
          HISTORY MODAL
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

                <table className="w-full text-left text-xs font-medium border border-slate-200 rounded-2xl overflow-hidden">

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
                          key={i}
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
          LOGIN IP MODAL
      ====================================================== */}

      {loginIpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-[pageEnter_0.25s_ease-out]">

          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

            <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">

              <h3 className="font-black text-base">
                Successful Login IPs:{' '}
                {loginIpModal.shopName}
              </h3>

              <button
                onClick={() =>
                  setLoginIpModal(null)
                }
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

              {loginIpModal.loginIpHistory
                ?.length ? (

                <table className="w-full text-left text-xs font-medium border border-slate-200 rounded-2xl overflow-hidden">

                  <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-200">

                    <tr>
                      <th className="px-4 py-3">
                        IP Address
                      </th>

                      <th className="px-4 py-3">
                        Admin Email
                      </th>

                      <th className="px-4 py-3">
                        Login Time
                      </th>
                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {loginIpModal.loginIpHistory
                      .slice()
                      .reverse()
                      .map(
                        (
                          entry,
                          idx
                        ) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/60"
                          >

                            <td className="px-4 py-3 font-mono font-bold text-slate-800">
                              {entry.ip}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {entry.adminEmail ||
                                '—'}
                            </td>

                            <td className="px-4 py-3 text-slate-500">
                              {formatPakistanDateTime(
                                entry.loggedInAt
                              )}
                            </td>

                          </tr>
                        )
                      )}

                  </tbody>

                </table>

              ) : (

                <p className="text-xs text-slate-400 text-center py-10">
                  No successful login IP recorded.
                </p>

              )}

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
                    placeholder="Minimum 6 characters"
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