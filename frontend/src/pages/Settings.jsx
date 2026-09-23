import React, { useState, useEffect } from 'react';

import toast from 'react-hot-toast';

import JSZip from 'jszip';

import api from '../utils/api';

import { useSettings } from '../context/SettingsContext';

import {
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  ShieldAlert,
  KeyRound,
  X,
  AlertCircle,
  Sparkles,
  Building2,
  Calculator,
  ShieldCheck,
  Eye,
  EyeOff,
  DatabaseBackup,
  Download,
  Loader2,
  Database,
  CalendarDays,
  Archive,
} from 'lucide-react';

const SettingsPage = () => {
  const { settings, updateSettings, refreshSettings } = useSettings();

  const [formData, setFormData] = useState({ ...settings });

  const [status, setStatus] = useState({
    type: '',
    message: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  // =====================================================
  // BACKUP
  // =====================================================

  const [backupAction, setBackupAction] = useState(null);

  // =====================================================
  // PASSWORD MODAL
  // =====================================================

  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [adminPassword, setAdminPassword] = useState('');

  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [passwordError, setPasswordError] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);

  // =====================================================
  // ENABLE / DISABLE MODE
  // =====================================================

  const [pendingAction, setPendingAction] = useState(null);

  // =====================================================
  // SYNC SETTINGS
  // =====================================================

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  // =====================================================
  // INPUT CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // INSTALLMENT DURATIONS
  // =====================================================

  const handleDurationsChange = (e) => {
    const arr = e.target.value
      .split(',')
      .map((num) => parseInt(num.trim()))
      .filter((n) => !isNaN(n));

    setFormData((prev) => ({
      ...prev,
      defaultInstallmentDurations: arr,
    }));
  };

  // =====================================================
  // SAVE SETTINGS
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setStatus({
      type: '',
      message: '',
    });

    setIsSaving(true);

    try {
      const result = await updateSettings(formData);

      setIsSaving(false);

      if (result.success) {
        await refreshSettings();

        setStatus({
          type: 'success',
          message: 'Settings database updated successfully!',
        });

        setTimeout(() => {
          setStatus({
            type: '',
            message: '',
          });
        }, 5000);
      } else {
        setStatus({
          type: 'error',
          message:
            result.message || 'Failed to update settings.',
        });
      }
    } catch (error) {
      setIsSaving(false);

      setStatus({
        type: 'error',
        message:
          error?.response?.data?.message ||
          error?.message ||
          'Failed to update settings.',
      });
    }
  };

  // =====================================================
  // PAKISTAN DATE
  // =====================================================

  const getPakistanDate = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  };

  // =====================================================
  // SANITIZE SHOP NAME
  // =====================================================

  const getSafeShopName = () => {
    return (
      settings?.shopName
        ?.replace(/[^a-zA-Z0-9-_]/g, '-')
        ?.replace(/-+/g, '-') ||
      'shop'
    );
  };

  // =====================================================
  // GET FILENAME FROM RESPONSE
  // =====================================================

  const getFilenameFromResponse = (
    response,
    fallbackName
  ) => {
    try {
      const contentDisposition =
        response?.headers?.['content-disposition'];

      if (!contentDisposition) {
        return fallbackName;
      }

      const utf8Match = contentDisposition.match(
        /filename\*\=UTF-8''([^;]+)/i
      );

      if (utf8Match?.[1]) {
        return decodeURIComponent(
          utf8Match[1]
            .replace(/"/g, '')
            .trim()
        );
      }

      const normalMatch = contentDisposition.match(
        /filename="?([^"]+)"?/i
      );

      if (normalMatch?.[1]) {
        return normalMatch[1].trim();
      }
    } catch (error) {
      console.warn(
        'Could not read backup filename:',
        error
      );
    }

    return fallbackName;
  };

  // =====================================================
  // BACKUP ERROR MESSAGE
  // =====================================================

  const getBackupErrorMessage = async (error) => {
    try {
      const responseData = error?.response?.data;

      if (responseData instanceof Blob) {
        const text = await responseData.text();

        try {
          const json = JSON.parse(text);

          return (
            json?.message ||
            json?.error ||
            'Backup create nahi ho saka.'
          );
        } catch {
          if (text?.trim()) {
            return text;
          }
        }
      }

      return (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Backup create nahi ho saka.'
      );
    } catch {
      return 'Backup create nahi ho saka.';
    }
  };

  // =====================================================
  // CHECK FILE SYSTEM ACCESS API
  // =====================================================

  const checkBackupBrowserSupport = () => {
    if (!window.showDirectoryPicker) {
      toast.error(
        'Aapka browser local folder backup support nahi karta. Chrome ya Edge ka latest version use karein.'
      );

      return false;
    }

    return true;
  };

  // =====================================================
  // CHOOSE / CREATE BACKUP FOLDER
  // =====================================================

  const chooseBackupDestination = async () => {
    if (!checkBackupBrowserSupport()) {
      return null;
    }

    try {
      const selectedDirectory =
        await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'desktop',
        });

      /*
       * Agar user ne already BACKUP folder select kiya hai,
       * isi ko root maana jayega.
       *
       * Agar Desktop select kiya hai:
       * Desktop/BACKUP create/use hoga.
       *
       * Is se:
       * Desktop/BACKUP/BACKUP
       * wala issue nahi hoga.
       */

      if (
        selectedDirectory.name
          .trim()
          .toUpperCase() === 'BACKUP'
      ) {
        return selectedDirectory;
      }

      const backupFolder =
        await selectedDirectory.getDirectoryHandle(
          'BACKUP',
          {
            create: true,
          }
        );

      return backupFolder;
    } catch (error) {
      if (error?.name === 'AbortError') {
        return null;
      }

      console.error(
        'Backup folder selection error:',
        error
      );

      throw new Error(
        'Backup folder access nahi mil saka.'
      );
    }
  };

  // =====================================================
  // CREATE / GET DIRECTORY
  // =====================================================

  const getOrCreateDirectory = async (
    parentDirectory,
    folderName
  ) => {
    return parentDirectory.getDirectoryHandle(
      folderName,
      {
        create: true,
      }
    );
  };

  // =====================================================
  // SAFE PATH SEGMENTS
  // =====================================================

  const sanitizeBackupPath = (pathValue) => {
    return String(pathValue || '')
      .replace(/\\/g, '/')
      .split('/')
      .filter(Boolean)
      .filter(
        (part) =>
          part !== '.' &&
          part !== '..'
      )
      .map((part) =>
        part.replace(/[<>:"|?*\x00-\x1F]/g, '_')
      )
      .join('/');
  };

  // =====================================================
  // WRITE TEXT FILE
  // =====================================================

  const writeTextFileToDirectory = async (
    directory,
    filename,
    content
  ) => {
    const safePath =
      sanitizeBackupPath(filename);

    const parts = safePath.split('/');

    const fileName =
      parts.pop();

    let currentDirectory =
      directory;

    for (const folder of parts) {
      if (!folder) continue;

      currentDirectory =
        await currentDirectory.getDirectoryHandle(
          folder,
          {
            create: true,
          }
        );
    }

    const fileHandle =
      await currentDirectory.getFileHandle(
        fileName,
        {
          create: true,
        }
      );

    const writable =
      await fileHandle.createWritable();

    await writable.write(content);

    await writable.close();
  };

  // =====================================================
  // DELETE FILE IF EXISTS
  // =====================================================

  const deleteFileIfExists = async (
    directory,
    filename
  ) => {
    try {
      await directory.removeEntry(filename);
    } catch (error) {
      if (error?.name !== 'NotFoundError') {
        console.warn(
          `Could not delete ${filename}:`,
          error
        );
      }
    }
  };

  // =====================================================
  // REMOVE OLD ZIP FILES
  // =====================================================

  const removeOldBackupZipFiles = async (
    directory
  ) => {
    try {
      for await (const entry of directory.values()) {
        if (
          entry.kind === 'file' &&
          entry.name
            .toLowerCase()
            .endsWith('.zip')
        ) {
          await deleteFileIfExists(
            directory,
            entry.name
          );
        }
      }
    } catch (error) {
      console.warn(
        'Could not clean old ZIP files:',
        error
      );
    }
  };

  // =====================================================
  // REMOVE TEMP FILES
  // =====================================================

  const isTemporaryBackupFile = (
    filename
  ) => {
    const lower =
      filename.toLowerCase();

    return (
      lower.endsWith('.tmp') ||
      lower.includes('.daily-tmp') ||
      lower.includes('.complete-tmp')
    );
  };

  // =====================================================
  // EXTRACT ZIP INTO LOCAL DIRECTORY
  // =====================================================

  const extractZipIntoDirectory = async (
    zipData,
    destinationDirectory
  ) => {
    let zip;

    try {
      zip = await JSZip.loadAsync(
        zipData
      );
    } catch (error) {
      console.error(
        'ZIP extraction error:',
        error
      );

      throw new Error(
        'Server ne valid ZIP backup return nahi kiya.'
      );
    }

    const entries = Object.values(
      zip.files
    );

    if (!entries.length) {
      throw new Error(
        'Backup ZIP empty hai.'
      );
    }

    /*
     * Backend ZIP normally:
     *
     * COMPLETE-BACKUP/
     *   README.txt
     *   backup-info.txt
     *   ...
     *
     * Ya:
     *
     * YYYY-MM-DD/
     *   README.txt
     *
     * Hum common first folder remove kar dete hain
     * taake selected destination mein directly files/folders
     * correct structure mein save hon.
     */

    const firstParts = entries
      .filter((entry) => !entry.dir)
      .map((entry) =>
        entry.name
          .replace(/\\/g, '/')
          .split('/')
          .filter(Boolean)
      );

    let commonRoot = '';

    if (firstParts.length > 0) {
      const firstSegment =
        firstParts[0][0];

      const sameRoot =
        firstSegment &&
        firstParts.every(
          (parts) =>
            parts[0] === firstSegment
        );

      if (sameRoot) {
        commonRoot =
          firstSegment + '/';
      }
    }

    let extractedCount = 0;

    for (const entry of entries) {
      if (entry.dir) {
        continue;
      }

      let filename = entry.name
        .replace(/\\/g, '/');

      if (
        commonRoot &&
        filename.startsWith(commonRoot)
      ) {
        filename =
          filename.slice(
            commonRoot.length
          );
      }

      filename =
        sanitizeBackupPath(filename);

      if (!filename) {
        continue;
      }

      /*
       * Backup mein sirf TXT expected hai.
       * Safety ke liye non-text files ignore kar rahe hain.
       */

      if (
        !filename
          .toLowerCase()
          .endsWith('.txt')
      ) {
        continue;
      }

      const content =
        await entry.async('string');

      await writeTextFileToDirectory(
        destinationDirectory,
        filename,
        content
      );

      extractedCount++;
    }

    if (extractedCount === 0) {
      throw new Error(
        'Backup ZIP mein koi TXT file nahi mili.'
      );
    }

    return extractedCount;
  };

  // =====================================================
  // SAVE BACKUP IN LOCAL BACKUP FOLDER
  // =====================================================

  const saveBackupInDirectory = async (
    backupRoot,
    response,
    backupType
  ) => {
    if (!response?.data) {
      throw new Error(
        'Backup response empty hai.'
      );
    }

    const date =
      getPakistanDate();

    /*
     * response.data Axios ka Blob hai.
     */

    let zipBlob;

    if (
      response.data instanceof Blob
    ) {
      zipBlob = response.data;
    } else {
      zipBlob = new Blob(
        [response.data],
        {
          type: 'application/zip',
        }
      );
    }

    /*
     * Content-Type check.
     *
     * Error response kabhi JSON Blob ki form mein aa sakta hai.
     */

    const contentType =
      response?.headers?.[
        'content-type'
      ] || '';

    if (
      contentType &&
      !contentType
        .toLowerCase()
        .includes('application/zip') &&
      !contentType
        .toLowerCase()
        .includes('application/octet-stream')
    ) {
      const text =
        await zipBlob.text();

      try {
        const json =
          JSON.parse(text);

        throw new Error(
          json?.message ||
            json?.error ||
            'Server ne ZIP ke bajaye error response diya.'
        );
      } catch (parseError) {
        if (
          parseError?.message &&
          !parseError.message.includes(
            'Unexpected token'
          )
        ) {
          throw parseError;
        }

        throw new Error(
          text?.trim() ||
            'Server ne ZIP ke bajaye invalid response diya.'
        );
      }
    }

    const arrayBuffer =
      await zipBlob.arrayBuffer();

    /*
     * Daily:
     *
     * BACKUP/
     *   DAILY-BACKUPS/
     *      YYYY-MM-DD/
     *
     * Complete:
     *
     * BACKUP/
     *   COMPLETE-BACKUP/
     */

    if (backupType === 'daily') {
      const dailyRoot =
        await getOrCreateDirectory(
          backupRoot,
          'DAILY-BACKUPS'
        );

      /*
       * Same date ka folder overwrite nahi karte.
       * Pehle old date folder remove karna possible nahi
       * hone par files overwrite ho jayengi.
       *
       * Existing folder ke andar files update hongi.
       */

      const dateFolder =
        await getOrCreateDirectory(
          dailyRoot,
          date
        );

      await removeOldBackupZipFiles(
        dateFolder
      );

      const extractedCount =
        await extractZipIntoDirectory(
          arrayBuffer,
          dateFolder
        );

      return {
        extractedCount,
        folder: `DAILY-BACKUPS/${date}`,
      };
    }

    const completeRoot =
      await getOrCreateDirectory(
        backupRoot,
        'COMPLETE-BACKUP'
      );

    await removeOldBackupZipFiles(
      completeRoot
    );

    const extractedCount =
      await extractZipIntoDirectory(
        arrayBuffer,
        completeRoot
      );

    return {
      extractedCount,
      folder: 'COMPLETE-BACKUP',
    };
  };

  // =====================================================
  // DAILY BACKUP
  // =====================================================

  const handleDailyBackup = async () => {
    if (backupAction) return;

    try {
      setBackupAction('daily');

      toast.loading(
        "Creating today's daily backup...",
        {
          id: 'backup-loading',
        }
      );

      /*
       * User se local BACKUP folder select karwao.
       */

      const backupRoot =
        await chooseBackupDestination();

      if (!backupRoot) {
        toast.dismiss(
          'backup-loading'
        );

        setBackupAction(null);

        return;
      }

      toast.loading(
        'Downloading backup data...',
        {
          id: 'backup-loading',
        }
      );

      const response =
        await api.post(
          '/api/backup/daily',
          {},
          {
            responseType: 'blob',
            headers: {
              Accept: 'application/zip',
            },
          }
        );

      toast.loading(
        'Saving TXT files into BACKUP folder...',
        {
          id: 'backup-loading',
        }
      );

      const result =
        await saveBackupInDirectory(
          backupRoot,
          response,
          'daily'
        );

      toast.success(
        `Daily backup saved successfully! ${result.extractedCount} TXT files saved in ${result.folder}.`,
        {
          id: 'backup-loading',
          duration: 5000,
        }
      );
    } catch (error) {
      console.error(
        'Daily backup error:',
        error
      );

      const message =
        await getBackupErrorMessage(
          error
        );

      toast.error(message, {
        id: 'backup-loading',
        duration: 5000,
      });
    } finally {
      setBackupAction(null);
    }
  };

  // =====================================================
  // COMPLETE BACKUP
  // =====================================================

  const handleCompleteBackup = async () => {
    if (backupAction) return;

    try {
      setBackupAction('complete');

      toast.loading(
        'Creating complete backup with all daily history...',
        {
          id: 'backup-loading',
        }
      );

      /*
       * User se local BACKUP folder select karwao.
       */

      const backupRoot =
        await chooseBackupDestination();

      if (!backupRoot) {
        toast.dismiss(
          'backup-loading'
        );

        setBackupAction(null);

        return;
      }

      toast.loading(
        'Downloading complete backup...',
        {
          id: 'backup-loading',
        }
      );

      const response =
        await api.get(
          '/api/backup/download',
          {
            responseType: 'blob',
            headers: {
              Accept: 'application/zip',
            },
          }
        );

      toast.loading(
        'Extracting human-readable TXT files...',
        {
          id: 'backup-loading',
        }
      );

      const result =
        await saveBackupInDirectory(
          backupRoot,
          response,
          'complete'
        );

      toast.success(
        `Complete backup saved successfully! ${result.extractedCount} TXT files saved in COMPLETE-BACKUP.`,
        {
          id: 'backup-loading',
          duration: 5000,
        }
      );
    } catch (error) {
      console.error(
        'Complete backup error:',
        error
      );

      const message =
        await getBackupErrorMessage(
          error
        );

      toast.error(message, {
        id: 'backup-loading',
        duration: 5000,
      });
    } finally {
      setBackupAction(null);
    }
  };

  // =====================================================
  // DELETION MODE
  // =====================================================

  const handleToggleClick = () => {
    setAdminPassword('');

    setPasswordError('');

    setShowAdminPassword(false);

    if (settings?.allowGlobalDeletion) {
      setPendingAction('disable');
    } else {
      setPendingAction('enable');
    }

    setShowPasswordModal(true);
  };

  // =====================================================
  // VERIFY PASSWORD
  // =====================================================

  const handleVerifyPasswordSubmit = async (
    e
  ) => {
    e.preventDefault();

    setPasswordError('');

    setIsVerifying(true);

    try {
      let response;

      if (pendingAction === 'enable') {
        response =
          await api.post(
            '/api/settings/deletion-mode/enable',
            {
              password:
                adminPassword,
            }
          );
      } else {
        response =
          await api.post(
            '/api/settings/deletion-mode/disable',
            {
              password:
                adminPassword,
            }
          );
      }

      if (response.data?.success) {
        await refreshSettings();

        setShowPasswordModal(false);

        setAdminPassword('');

        setPasswordError('');

        const completedAction =
          pendingAction;

        setPendingAction(null);

        setShowAdminPassword(false);

        if (response.data.data) {
          setFormData(
            response.data.data
          );
        }

        toast.success(
          completedAction === 'enable'
            ? 'IDENTITY VERIFIED! Deletion Mode is now ON for 30 minutes.'
            : 'IDENTITY VERIFIED! Deletion Mode has been turned OFF.'
        );
      }
    } catch (error) {
      setPasswordError(
        error.response?.data?.message ||
          'Incorrect Admin Password. Access Denied!'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // =====================================================
  // CLOSE PASSWORD MODAL
  // =====================================================

  const closePasswordModal = () => {
    if (isVerifying) return;

    setShowPasswordModal(false);

    setAdminPassword('');

    setPasswordError('');

    setPendingAction(null);

    setShowAdminPassword(false);
  };

  // =====================================================
  // DELETION STATUS
  // =====================================================

  const isDeletionUnlocked =
    settings?.allowGlobalDeletion ||
    false;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">

      {/* =====================================================
          DARK HERO HEADER
      ====================================================== */}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1b] via-[#0b1020] to-[#060913] border border-white/[0.08] shadow-2xl shadow-blue-950/20 text-white">

        <div className="pointer-events-none absolute -top-32 -left-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />

        <div className="pointer-events-none absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7 lg:p-8">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2 mb-3">

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">

                  <Sparkles className="w-3 h-3 text-blue-400" />

                  System Configurations

                </span>

                <span className="text-slate-600">
                  •
                </span>

                <span className="text-[10px] font-bold text-slate-400">
                  Security & Rules
                </span>

              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Shop Configurations & Security
              </h1>

              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
                Customize system rules, print prefixes, currency parameters,
                data protection, and master deletion security locks.
              </p>

            </div>

            <button
              type="button"
              onClick={refreshSettings}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-black transition-all duration-300 hover:scale-[1.02] active:scale-95 self-start sm:self-auto"
              title="Reload configurations"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>
                Reload Settings
              </span>
            </button>

          </div>

        </div>

      </section>

      {/* =====================================================
          STATUS ALERT
      ====================================================== */}

      {status.message && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border animate-[pageEnter_0.2s_ease-out] ${
            status.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >

          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}

          <span className="text-xs font-bold leading-relaxed">
            {status.message}
          </span>

        </div>
      )}

      {/* =====================================================
          DELETION MODE CARD
      ====================================================== */}

      <div
        className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-sm ${
          isDeletionUnlocked
            ? 'bg-rose-50/80 border-rose-300 shadow-md'
            : 'bg-white border-slate-200/80'
        }`}
      >

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div className="flex items-start gap-3.5">

            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isDeletionUnlocked
                  ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-950/20'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">

              <div className="flex items-center space-x-2 flex-wrap gap-y-1">

                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  Master Deletion Access Switch
                </h3>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    isDeletionUnlocked
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {isDeletionUnlocked
                    ? 'UNLOCKED (Active)'
                    : 'LOCKED (Safe Mode)'}
                </span>

              </div>

              <p className="text-xs text-slate-500 max-w-lg leading-relaxed font-semibold">

                {isDeletionUnlocked
                  ? '⚠️ Danger Mode: Delete buttons are currently active. Deletion Mode will automatically lock after 30 minutes.'
                  : 'All deletion buttons are currently LOCKED. Turning ON requires your Admin Password.'}

              </p>

              {isDeletionUnlocked &&
                settings?.deletionModeExpiresAt && (
                  <p className="text-xs font-black text-rose-700">

                    Auto-lock time:{' '}

                    {new Date(
                      settings.deletionModeExpiresAt
                    ).toLocaleString()}

                  </p>
                )}

            </div>

          </div>

          {/* TOGGLE */}

          <button
            type="button"
            onClick={handleToggleClick}
            className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isDeletionUnlocked
                ? 'bg-rose-600'
                : 'bg-slate-300'
            }`}
            title={
              isDeletionUnlocked
                ? 'Disable Deletion Mode'
                : 'Enable Deletion Mode'
            }
          >

            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                isDeletionUnlocked
                  ? 'translate-x-8 text-rose-600'
                  : 'translate-x-0 text-slate-400'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
            </span>

          </button>

        </div>

      </div>

      {/* =====================================================
          SHOP DATA BACKUP
      ====================================================== */}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative p-5 sm:p-6 lg:p-7">

          {/* HEADER */}

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">

            <div className="flex items-start gap-4">

              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <DatabaseBackup className="w-6 h-6" />
              </div>

              <div>

                <div className="flex flex-wrap items-center gap-2 mb-1.5">

                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Shop Data Backup
                  </h3>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                    <ShieldCheck className="w-3 h-3" />
                    Secure
                  </span>

                </div>

                <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed font-medium">

                  Daily backups are saved date-wise. A Complete Backup
                  packages all available daily snapshots into one ZIP
                  and saves them as human-readable TXT files.

                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              BACKUP ACTIONS
          ================================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">

            {/* DAILY BACKUP */}

            <button
              type="button"
              onClick={handleDailyBackup}
              disabled={!!backupAction}
              className="group relative overflow-hidden inline-flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-emerald-950/20 transition-all duration-300 hover:scale-[1.015] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >

              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">

                {backupAction === 'daily' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CalendarDays className="w-4 h-4" />
                )}

              </div>

              <div className="text-left">

                <span className="block text-sm">
                  {backupAction === 'daily'
                    ? 'Creating Daily Backup...'
                    : 'Daily Backup'}
                </span>

                <span className="block text-[9px] text-white/70 font-semibold mt-0.5">
                  Save today's snapshot as TXT
                </span>

              </div>

            </button>

            {/* COMPLETE BACKUP */}

            <button
              type="button"
              onClick={handleCompleteBackup}
              disabled={!!backupAction}
              className="group relative overflow-hidden inline-flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all duration-300 hover:scale-[1.015] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >

              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">

                {backupAction === 'complete' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}

              </div>

              <div className="text-left">

                <span className="block text-sm">

                  {backupAction === 'complete'
                    ? 'Creating Complete Backup...'
                    : 'Complete Backup'}

                </span>

                <span className="block text-[9px] text-white/70 font-semibold mt-0.5">
                  All daily history as TXT
                </span>

              </div>

            </button>

          </div>

          {/* =================================================
              BACKUP INFORMATION
          ================================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">

            {/* TYPE */}

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">

              <div className="flex items-center gap-2 mb-1">

                <Database className="w-3.5 h-3.5 text-blue-500" />

                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Backup System
                </span>

              </div>

              <p className="text-xs font-black text-slate-800">
                Daily + Complete
              </p>

            </div>

            {/* DATA ISOLATION */}

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">

              <div className="flex items-center gap-2 mb-1">

                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />

                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Data Isolation
                </span>

              </div>

              <p className="text-xs font-black text-slate-800">
                Your Shop Only
              </p>

            </div>

            {/* FORMAT */}

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">

              <div className="flex items-center gap-2 mb-1">

                <Download className="w-3.5 h-3.5 text-violet-500" />

                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Format
                </span>

              </div>

              <p className="text-xs font-black text-slate-800">
                Human Readable TXT
              </p>

            </div>

          </div>

          {/* =================================================
              BACKUP STRUCTURE
          ================================================== */}

          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">

            <div className="flex items-start gap-3">

              <Archive className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />

              <div>

                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Backup Structure
                </p>

                <p className="text-[10px] sm:text-xs text-slate-600 font-semibold leading-relaxed">

                  Backups are stored in your selected{' '}
                  <span className="font-black text-slate-800">
                    BACKUP
                  </span>{' '}
                  folder.

                  <br />

                  <span className="font-black text-slate-800">
                    DAILY-BACKUPS/YYYY-MM-DD
                  </span>{' '}
                  contains each day's TXT snapshot.

                  <br />

                  <span className="font-black text-slate-800">
                    COMPLETE-BACKUP
                  </span>{' '}
                  contains the complete human-readable backup.

                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              SECURITY NOTICE
          ================================================== */}

          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-blue-50/70 border border-blue-100 p-3.5">

            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />

            <p className="text-[10px] sm:text-xs text-blue-800 font-semibold leading-relaxed">

              Keep your backup folder in a secure location.
              Your shop's business data is included in the backup.
              DigitalPersona fingerprint templates, FMD data,
              live images, and other biometric fields are excluded
              from backups.

            </p>

          </div>

        </div>

      </section>

      {/* =====================================================
          NORMAL SETTINGS FORM
      ====================================================== */}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden"
      >

        <div className="p-6 sm:p-8 space-y-7">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* =================================================
                SHOP INFORMATION
            ================================================== */}

            <div className="space-y-4">

              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">

                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>

                <h3 className="text-sm font-black text-slate-900">
                  Dukan Information
                </h3>

              </div>

              {/* SHOP NAME */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">

                  Shop Name{' '}

                  <span className="text-rose-500">
                    *
                  </span>

                </label>

                <input
                  type="text"
                  name="shopName"
                  value={
                    formData.shopName ||
                    ''
                  }
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />

              </div>

              {/* ADDRESS */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Shop Address
                </label>

                <input
                  type="text"
                  name="shopAddress"
                  value={
                    formData.shopAddress ||
                    ''
                  }
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />

              </div>

              {/* PHONE */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Mobile Number
                </label>

                <input
                  type="text"
                  name="shopPhone"
                  value={
                    formData.shopPhone ||
                    ''
                  }
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />

              </div>

              {/* EMAIL */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Shop Email
                </label>

                <input
                  type="email"
                  name="shopEmail"
                  value={
                    formData.shopEmail ||
                    ''
                  }
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />

              </div>

            </div>

            {/* =================================================
                SYSTEM CALCULATIONS
            ================================================== */}

            <div className="space-y-4">

              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">

                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <Calculator className="w-4 h-4" />
                </div>

                <h3 className="text-sm font-black text-slate-900">
                  System Parameters & Prefixes
                </h3>

              </div>

              {/* CURRENCY */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">

                  Local Currency Symbol{' '}

                  <span className="text-rose-500">
                    *
                  </span>

                </label>

                <input
                  type="text"
                  name="currency"
                  value={
                    formData.currency ||
                    'PKR'
                  }
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />

              </div>

              {/* STOCK THRESHOLD */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">

                  Default Stock Threshold (Low warning){' '}

                  <span className="text-rose-500">
                    *
                  </span>

                </label>

                <input
                  type="number"
                  name="defaultMinStockLevel"
                  value={
                    formData.defaultMinStockLevel ||
                    5
                  }
                  onChange={handleChange}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />

              </div>

              {/* PREFIXES */}

              <div className="grid grid-cols-2 gap-3.5">

                <div>

                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">

                    Invoice ID Prefix{' '}

                    <span className="text-rose-500">
                      *
                    </span>

                  </label>

                  <input
                    type="text"
                    name="invoicePrefix"
                    value={
                      formData.invoicePrefix ||
                      'INV'
                    }
                    onChange={handleChange}
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />

                </div>

                <div>

                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">

                    Customer ID Prefix{' '}

                    <span className="text-rose-500">
                      *
                    </span>

                  </label>

                  <input
                    type="text"
                    name="customerIdPrefix"
                    value={
                      formData.customerIdPrefix ||
                      'CUST'
                    }
                    onChange={handleChange}
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />

                </div>

              </div>

              {/* INSTALLMENT DURATIONS */}

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">

                  Installment Durations (Months, comma-separated){' '}

                  <span className="text-rose-500">
                    *
                  </span>

                </label>

                <input
                  type="text"
                  name="defaultInstallmentDurations"
                  value={
                    formData.defaultInstallmentDurations
                      ? formData.defaultInstallmentDurations.join(
                          ', '
                        )
                      : '3, 6, 12'
                  }
                  onChange={
                    handleDurationsChange
                  }
                  placeholder="3, 6, 12"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  required
                />

              </div>

            </div>

          </div>

        </div>

        {/* =====================================================
            SAVE FOOTER
        ====================================================== */}

        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex justify-end">

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-blue-950/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >

            <Save className="w-4 h-4" />

            <span>

              {isSaving
                ? 'Saving Configurations...'
                : 'Save System Settings'}

            </span>

          </button>

        </div>

      </form>

      {/* =====================================================
          PASSWORD MODAL
      ====================================================== */}

      {showPasswordModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-[pageEnter_0.25s_ease-out]">

          <form
            onSubmit={
              handleVerifyPasswordSubmit
            }
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
          >

            {/* MODAL HEADER */}

            <div
              className={`p-5 sm:p-6 border-b flex justify-between items-center ${
                pendingAction === 'enable'
                  ? 'bg-rose-50 border-rose-100'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >

              <div className="flex items-center gap-3">

                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shadow-md ${
                    pendingAction === 'enable'
                      ? 'bg-rose-600'
                      : 'bg-slate-900'
                  }`}
                >
                  <KeyRound className="w-5 h-5" />
                </div>

                <div>

                  <h3 className="text-base font-black tracking-tight text-slate-900">
                    Confirm Admin Password
                  </h3>

                  <p className="text-xs text-slate-500 font-semibold">
                    Security verification required
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  closePasswordModal
                }
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="p-6 space-y-4">

              {passwordError && (

                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs font-bold">

                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />

                  <span>
                    {passwordError}
                  </span>

                </div>

              )}

              <p className="text-xs text-slate-600 leading-relaxed font-semibold">

                {pendingAction === 'enable'
                  ? 'To enable Deletion Mode, enter your active Admin Password. Delete buttons will become available for 30 minutes.'
                  : 'To disable Deletion Mode, enter your active Admin Password to confirm this security action.'}

              </p>

              <div>

                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">

                  Security Password{' '}

                  <span className="text-rose-500">
                    *
                  </span>

                </label>

                <div className="relative">

                  <input
                    type={
                      showAdminPassword
                        ? 'text'
                        : 'password'
                    }
                    value={
                      adminPassword
                    }
                    onChange={(e) =>
                      setAdminPassword(
                        e.target.value
                      )
                    }
                    placeholder="••••••••"
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 pr-11 text-xs sm:text-sm font-black bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900"
                    required
                    autoFocus
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowAdminPassword(
                        (visible) =>
                          !visible
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

            </div>

            {/* MODAL FOOTER */}

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">

              <button
                type="button"
                onClick={
                  closePasswordModal
                }
                disabled={isVerifying}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-black text-slate-600 transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isVerifying}
                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-black shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 ${
                  pendingAction === 'enable'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/20'
                    : 'bg-slate-900 hover:bg-slate-800 shadow-slate-950/20'
                }`}
              >

                {isVerifying
                  ? 'Verifying Password...'
                  : pendingAction === 'enable'
                  ? 'Verify & Enable Deletion'
                  : 'Verify & Disable Deletion'}

              </button>

            </div>

          </form>

        </div>

      )}

    </div>
  );
};

export default SettingsPage;