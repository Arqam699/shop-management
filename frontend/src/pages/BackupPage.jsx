import React, { useState } from 'react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import api from '../utils/api';

import {
  DatabaseBackup,
  Download,
  Loader2,
  Database,
  CalendarDays,
  Archive,
  ShieldCheck,
  AlertCircle,
  FolderOpen,
  HardDrive,
  FileText,
  CheckCircle2,
  Info,
  ShieldAlert,
  Cloud,
  RefreshCw,
  Lock,
  ExternalLink,
} from 'lucide-react';

/* =====================================================
   BACKUP PAGE
===================================================== */

const BackupPage = () => {
  const [backupAction, setBackupAction] = useState(null);

  /* =====================================================
     PAKISTAN DATE
  ===================================================== */

  const getPakistanDate = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  };

  /* =====================================================
     GET FILENAME FROM RESPONSE
  ===================================================== */

  const getFilenameFromResponse = (response, fallbackName) => {
    try {
      const contentDisposition =
        response?.headers?.['content-disposition'];

      if (!contentDisposition) {
        return fallbackName;
      }

      const utf8Match = contentDisposition.match(
        /filename\*=UTF-8''([^;]+)/i
      );

      if (utf8Match?.[1]) {
        return decodeURIComponent(
          utf8Match[1].replace(/"/g, '').trim()
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

  /* =====================================================
     BACKUP ERROR MESSAGE
  ===================================================== */

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

  /* =====================================================
     CHECK FILE SYSTEM ACCESS API
  ===================================================== */

  const checkBackupBrowserSupport = () => {
    if (!window.showDirectoryPicker) {
      toast.error(
        'Aapka browser local folder backup support nahi karta. Chrome ya Edge ka latest version use karein.'
      );

      return false;
    }

    return true;
  };

  /* =====================================================
     CHOOSE / CREATE BACKUP FOLDER
  ===================================================== */

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
       * Agar user ne already BACKUP folder select
       * kiya hai to isi ko root maana jayega.
       *
       * Agar Desktop select kiya hai:
       *
       * Desktop/
       *    BACKUP/
       *
       * create/use hoga.
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

  /* =====================================================
     CREATE / GET DIRECTORY
  ===================================================== */

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

  /* =====================================================
     SAFE PATH SEGMENTS
  ===================================================== */

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
        part.replace(
          /[<>:"|?*\x00-\x1F]/g,
          '_'
        )
      )
      .join('/');
  };

  /* =====================================================
     WRITE TEXT FILE
  ===================================================== */

  const writeTextFileToDirectory = async (
    directory,
    filename,
    content
  ) => {
    const safePath =
      sanitizeBackupPath(filename);

    const parts = safePath.split('/');

    const fileName = parts.pop();

    let currentDirectory = directory;

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

  /* =====================================================
     DELETE FILE IF EXISTS
  ===================================================== */

  const deleteFileIfExists = async (
    directory,
    filename
  ) => {
    try {
      await directory.removeEntry(filename);
    } catch (error) {
      if (
        error?.name !== 'NotFoundError'
      ) {
        console.warn(
          `Could not delete ${filename}:`,
          error
        );
      }
    }
  };

  /* =====================================================
     REMOVE OLD ZIP FILES
  ===================================================== */

  const removeOldBackupZipFiles = async (
    directory
  ) => {
    try {
      for await (
        const entry of directory.values()
      ) {
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

  /* =====================================================
     EXTRACT ZIP INTO LOCAL DIRECTORY
  ===================================================== */

  const extractZipIntoDirectory = async (
    zipData,
    destinationDirectory
  ) => {
    let zip;

    try {
      zip = await JSZip.loadAsync(zipData);
    } catch (error) {
      console.error(
        'ZIP extraction error:',
        error
      );

      throw new Error(
        'Server ne valid ZIP backup return nahi kiya.'
      );
    }

    const entries = Object.values(zip.files);

    if (!entries.length) {
      throw new Error(
        'Backup ZIP empty hai.'
      );
    }

    /*
     * Common first folder remove kar dete hain.
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

      let filename = entry.name.replace(
        /\\/g,
        '/'
      );

      if (
        commonRoot &&
        filename.startsWith(commonRoot)
      ) {
        filename = filename.slice(
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
       * Safety ke liye non-text files ignore.
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

  /* =====================================================
     SAVE BACKUP IN LOCAL BACKUP FOLDER
  ===================================================== */

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

    const date = getPakistanDate();

    let zipBlob;

    if (response.data instanceof Blob) {
      zipBlob = response.data;
    } else {
      zipBlob = new Blob(
        [response.data],
        {
          type: 'application/zip',
        }
      );
    }

    const contentType =
      response?.headers?.['content-type'] ||
      '';

    if (
      contentType &&
      !contentType
        .toLowerCase()
        .includes('application/zip') &&
      !contentType
        .toLowerCase()
        .includes(
          'application/octet-stream'
        )
    ) {
      const text =
        await zipBlob.text();

      try {
        const json = JSON.parse(text);

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
     * DAILY:
     *
     * BACKUP/
     *   DAILY-BACKUPS/
     *      YYYY-MM-DD/
     *
     * COMPLETE:
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
        folder:
          `DAILY-BACKUPS/${date}`,
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

  /* =====================================================
     DAILY BACKUP
  ===================================================== */

  const handleDailyBackup = async () => {
    if (backupAction) {
      return;
    }

    try {
      setBackupAction('daily');

      toast.loading(
        "Creating today's daily backup...",
        {
          id: 'backup-loading',
        }
      );

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
              Accept:
                'application/zip',
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

  /* =====================================================
     COMPLETE BACKUP
  ===================================================== */

  const handleCompleteBackup = async () => {
    if (backupAction) {
      return;
    }

    try {
      setBackupAction('complete');

      toast.loading(
        'Creating complete backup with all daily history...',
        {
          id: 'backup-loading',
        }
      );

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
              Accept:
                'application/zip',
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

  /* =====================================================
     PAGE UI
  ===================================================== */

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">

      {/* =================================================
          HERO HEADER
      ================================================= */}

      <section
        className="
          relative
          overflow-hidden
          rounded-[28px]
          border
          border-slate-200
          bg-gradient-to-br
          from-slate-950
          via-slate-900
          to-indigo-950
          shadow-xl
          shadow-slate-900/10
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -right-24
            -top-32
            h-80
            w-80
            rounded-full
            bg-blue-500/20
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -bottom-32
            -left-20
            h-72
            w-72
            rounded-full
            bg-violet-500/15
            blur-3xl
          "
        />

        <div
          className="
            relative
            flex
            flex-col
            gap-5
            p-5
            sm:p-7
            lg:flex-row
            lg:items-center
            lg:justify-between
            lg:p-8
          "
        >
          <div className="flex min-w-0 items-start gap-4">

            <div
              className="
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-white/10
                bg-white/10
                shadow-lg
                shadow-black/20
              "
            >
              <DatabaseBackup
                className="
                  h-7
                  w-7
                  text-blue-300
                "
              />
            </div>

            <div className="min-w-0">

              <div
                className="
                  mb-2
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                <span
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-emerald-400/20
                    bg-emerald-400/10
                    px-2.5
                    py-1
                    text-[9px]
                    font-black
                    uppercase
                    tracking-wider
                    text-emerald-300
                  "
                >
                  <ShieldCheck className="h-3 w-3" />
                  Secure Backup
                </span>
              </div>

              <h1
                className="
                  text-xl
                  font-black
                  tracking-tight
                  text-white
                  sm:text-2xl
                  lg:text-3xl
                "
              >
                Shop Data Backup
              </h1>

              <p
                className="
                  mt-2
                  max-w-2xl
                  text-xs
                  font-medium
                  leading-relaxed
                  text-slate-300
                  sm:text-sm
                "
              >
                Create daily snapshots or generate a
                complete backup containing your available
                shop history in human-readable TXT format.
              </p>

            </div>
          </div>

          {/* Format badge */}

          <div
            className="
              hidden
              shrink-0
              items-center
              gap-3
              rounded-2xl
              border
              border-white/10
              bg-white/[0.06]
              px-4
              py-3
              lg:flex
            "
          >
            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                bg-blue-500/10
              "
            >
              <FileText
                className="
                  h-4
                  w-4
                  text-blue-300
                "
              />
            </div>

            <div>
              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wider
                  text-slate-500
                "
              >
                Backup Format
              </p>

              <p
                className="
                  mt-0.5
                  text-xs
                  font-black
                  text-white
                "
              >
                Human Readable TXT
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* =================================================
          MAIN BACKUP CARD
      ================================================= */}

      <section
        className="
          relative
          overflow-hidden
          rounded-3xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >

        <div
          className="
            pointer-events-none
            absolute
            -right-24
            -top-24
            h-64
            w-64
            rounded-full
            bg-blue-500/10
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -bottom-24
            -left-24
            h-64
            w-64
            rounded-full
            bg-violet-500/10
            blur-3xl
          "
        />

        <div className="relative p-5 sm:p-6 lg:p-7">

          {/* HEADER */}

          <div
            className="
              flex
              flex-col
              gap-4
              sm:flex-row
              sm:items-start
              sm:justify-between
            "
          >
            <div className="flex items-start gap-3.5">

              <div
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-blue-100
                  bg-blue-50
                  text-blue-600
                "
              >
                <HardDrive className="h-5 w-5" />
              </div>

              <div>

                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
                >
                  <h2
                    className="
                      text-sm
                      font-black
                      text-slate-900
                      sm:text-base
                    "
                  >
                    Create Backup
                  </h2>

                  <span
                    className="
                      inline-flex
                      items-center
                      gap-1
                      rounded-full
                      border
                      border-emerald-100
                      bg-emerald-50
                      px-2
                      py-0.5
                      text-[9px]
                      font-black
                      uppercase
                      tracking-wider
                      text-emerald-700
                    "
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Ready
                  </span>
                </div>

                <p
                  className="
                    mt-1
                    max-w-2xl
                    text-xs
                    font-medium
                    leading-relaxed
                    text-slate-500
                    sm:text-sm
                  "
                >
                  Select a local folder and save your
                  shop backup directly to your computer.
                </p>

              </div>
            </div>
          </div>

          {/* =================================================
              BACKUP ACTIONS
          ================================================= */}

          <div
            className="
              mt-6
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
            "
          >

            {/* DAILY */}

            <button
              type="button"
              onClick={handleDailyBackup}
              disabled={!!backupAction}
              className="
                group
                relative
                inline-flex
                min-h-[92px]
                items-center
                gap-3
                overflow-hidden
                rounded-2xl
                bg-gradient-to-r
                from-emerald-600
                to-teal-600
                px-5
                py-4
                text-left
                text-white
                shadow-lg
                shadow-emerald-950/20
                transition-all
                duration-300
                hover:scale-[1.015]
                hover:opacity-95
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-60
                disabled:hover:scale-100
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/10
                  bg-white/10
                "
              >
                {backupAction === 'daily' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CalendarDays className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0">

                <span
                  className="
                    block
                    text-sm
                    font-black
                  "
                >
                  {backupAction === 'daily'
                    ? 'Creating Daily Backup...'
                    : 'Daily Backup'}
                </span>

                <span
                  className="
                    mt-1
                    block
                    text-[10px]
                    font-semibold
                    text-white/70
                  "
                >
                  Save today's snapshot as TXT
                </span>

              </div>
            </button>

            {/* COMPLETE */}

            <button
              type="button"
              onClick={handleCompleteBackup}
              disabled={!!backupAction}
              className="
                group
                relative
                inline-flex
                min-h-[92px]
                items-center
                gap-3
                overflow-hidden
                rounded-2xl
                bg-gradient-to-r
                from-blue-600
                via-indigo-600
                to-violet-600
                px-5
                py-4
                text-left
                text-white
                shadow-lg
                shadow-blue-950/20
                transition-all
                duration-300
                hover:scale-[1.015]
                hover:opacity-95
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-60
                disabled:hover:scale-100
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/10
                  bg-white/10
                "
              >
                {backupAction === 'complete' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Archive className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0">

                <span
                  className="
                    block
                    text-sm
                    font-black
                  "
                >
                  {backupAction === 'complete'
                    ? 'Creating Complete Backup...'
                    : 'Complete Backup'}
                </span>

                <span
                  className="
                    mt-1
                    block
                    text-[10px]
                    font-semibold
                    text-white/70
                  "
                >
                  All available shop history as TXT
                </span>

              </div>
            </button>

          </div>

          {/* =================================================
              INFORMATION CARDS
          ================================================= */}

          <div
            className="
              mt-5
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-3
            "
          >

            {/* BACKUP SYSTEM */}

            <div
              className="
                rounded-2xl
                border
                border-slate-100
                bg-slate-50
                p-4
              "
            >
              <div
                className="
                  mb-1.5
                  flex
                  items-center
                  gap-2
                "
              >
                <Database
                  className="
                    h-3.5
                    w-3.5
                    text-blue-500
                  "
                />

                <span
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  Backup System
                </span>
              </div>

              <p
                className="
                  text-xs
                  font-black
                  text-slate-800
                "
              >
                Daily + Complete
              </p>
            </div>

            {/* DATA ISOLATION */}

            <div
              className="
                rounded-2xl
                border
                border-slate-100
                bg-slate-50
                p-4
              "
            >
              <div
                className="
                  mb-1.5
                  flex
                  items-center
                  gap-2
                "
              >
                <ShieldCheck
                  className="
                    h-3.5
                    w-3.5
                    text-emerald-500
                  "
                />

                <span
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  Data Isolation
                </span>
              </div>

              <p
                className="
                  text-xs
                  font-black
                  text-slate-800
                "
              >
                Current Shop Only
              </p>
            </div>

            {/* FORMAT */}

            <div
              className="
                rounded-2xl
                border
                border-slate-100
                bg-slate-50
                p-4
              "
            >
              <div
                className="
                  mb-1.5
                  flex
                  items-center
                  gap-2
                "
              >
                <FileText
                  className="
                    h-3.5
                    w-3.5
                    text-violet-500
                  "
                />

                <span
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  Format
                </span>
              </div>

              <p
                className="
                  text-xs
                  font-black
                  text-slate-800
                "
              >
                Human Readable TXT
              </p>
            </div>

          </div>

          {/* =================================================
              LOCAL FOLDER INFO
          ================================================= */}

          <div
            className="
              mt-4
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-indigo-100
              bg-indigo-50/60
              p-4
            "
          >
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-indigo-100
                text-indigo-600
              "
            >
              <FolderOpen className="h-4 w-4" />
            </div>

            <div>

              <p
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-wider
                  text-indigo-700
                "
              >
                Local Folder
              </p>

              <p
                className="
                  mt-1
                  text-[10px]
                  font-semibold
                  leading-relaxed
                  text-indigo-800
                  sm:text-xs
                "
              >
                Backup button press karne par browser
                aap se local folder select karne ko kahega.
                Agar aap Desktop select karte hain to
                application automatically{' '}
                <span className="font-black">
                  Desktop/BACKUP
                </span>{' '}
                folder create/use karegi.
              </p>

            </div>
          </div>

        </div>
      </section>

      {/* =====================================================
          BACKUP GUIDELINES
      ===================================================== */}

      <section
        className="
          overflow-hidden
          rounded-3xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >

        <div
          className="
            border-b
            border-slate-100
            bg-slate-50/80
            px-5
            py-4
            sm:px-6
          "
        >
          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-blue-100
                text-blue-600
              "
            >
              <Info className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-black text-slate-900 sm:text-base">
                Backup Guidelines
              </h2>

              <p className="mt-0.5 text-[10px] font-semibold text-slate-500 sm:text-xs">
                Recommended practices for protecting your shop data
              </p>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">

          {/* DAILY BACKUP */}

          <div
            className="
              rounded-2xl
              border
              border-emerald-100
              bg-emerald-50/50
              p-4
            "
          >
            <div className="flex items-start gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-emerald-100
                  text-emerald-600
                "
              >
                <CalendarDays className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Create Daily Backup
                </h3>

                <p className="mt-1.5 text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-xs">
                  Business day complete hone ke baad
                  Daily Backup create karna recommended hai.
                  Is mein us din ka snapshot save hota hai.
                </p>
              </div>

            </div>
          </div>

          {/* COMPLETE BACKUP */}

          <div
            className="
              rounded-2xl
              border
              border-blue-100
              bg-blue-50/50
              p-4
            "
          >
            <div className="flex items-start gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-100
                  text-blue-600
                "
              >
                <Archive className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Complete Backup
                </h3>

                <p className="mt-1.5 text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-xs">
                  Major system changes, computer replacement,
                  migration ya reinstall se pehle Complete
                  Backup create karein.
                </p>
              </div>

            </div>
          </div>

          {/* SECOND COPY */}

          <div
            className="
              rounded-2xl
              border
              border-violet-100
              bg-violet-50/50
              p-4
            "
          >
            <div className="flex items-start gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-violet-100
                  text-violet-600
                "
              >
                <Cloud className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Keep a Second Copy
                </h3>

                <p className="mt-1.5 text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-xs">
                  Important backup ki second copy external
                  drive, USB ya trusted cloud storage par
                  rakhna recommended hai.
                </p>
              </div>

            </div>
          </div>

          {/* SECURITY */}

          <div
            className="
              rounded-2xl
              border
              border-rose-100
              bg-rose-50/50
              p-4
            "
          >
            <div className="flex items-start gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-rose-100
                  text-rose-600
                "
              >
                <Lock className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Protect Backup Files
                </h3>

                <p className="mt-1.5 text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-xs">
                  Backup files mein customer aur business
                  information ho sakti hai. In files ko
                  public ya unauthorized users ke saath share
                  na karein.
                </p>
              </div>

            </div>
          </div>

          {/* VERIFY */}

          <div
            className="
              rounded-2xl
              border
              border-amber-100
              bg-amber-50/50
              p-4
            "
          >
            <div className="flex items-start gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-amber-100
                  text-amber-600
                "
              >
                <CheckCircle2 className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Verify Your Backup
                </h3>

                <p className="mt-1.5 text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-xs">
                  Backup ke baad folder open karke check
                  karein ke expected TXT files successfully
                  create hui hain aur readable hain.
                </p>
              </div>

            </div>
          </div>

          {/* BEFORE RESTORE */}

          <div
            className="
              rounded-2xl
              border
              border-orange-100
              bg-orange-50/50
              p-4
            "
          >
            <div className="flex items-start gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-orange-100
                  text-orange-600
                "
              >
                <RefreshCw className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Before Restore / Import
                </h3>

                <p className="mt-1.5 text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-xs">
                  Kisi bhi restore ya import operation se
                  pehle current shop ka fresh Complete Backup
                  create karein.
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* =====================================================
          BACKUP STRUCTURE
      ===================================================== */}

      <section
        className="
          rounded-3xl
          border
          border-slate-200
          bg-white
          p-5
          shadow-sm
          sm:p-6
        "
      >

        <div className="flex items-start gap-3">

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-indigo-50
              text-indigo-600
            "
          >
            <FolderOpen className="h-5 w-5" />
          </div>

          <div className="min-w-0">

            <h2 className="text-sm font-black text-slate-900 sm:text-base">
              Backup Folder Structure
            </h2>

            <p className="mt-1 text-[10px] font-semibold text-slate-500 sm:text-xs">
              Backup files ko organized aur easy-to-find rakhne ke liye structure automatically maintain hota hai.
            </p>

          </div>

        </div>

        <div
          className="
            mt-5
            grid
            grid-cols-1
            gap-3
            lg:grid-cols-2
          "
        >

          {/* DAILY */}

          <div
            className="
              rounded-2xl
              border
              border-slate-100
              bg-slate-50
              p-4
            "
          >

            <div className="flex items-center gap-2">

              <CalendarDays className="h-4 w-4 text-emerald-600" />

              <span className="text-xs font-black text-slate-800">
                Daily Backup
              </span>

            </div>

            <div
              className="
                mt-3
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-3
                font-mono
                text-[10px]
                font-bold
                text-slate-600
                sm:text-xs
              "
            >
              BACKUP/
              <br />
              └── DAILY-BACKUPS/
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;└── YYYY-MM-DD/
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── TXT files
            </div>

          </div>

          {/* COMPLETE */}

          <div
            className="
              rounded-2xl
              border
              border-slate-100
              bg-slate-50
              p-4
            "
          >

            <div className="flex items-center gap-2">

              <Archive className="h-4 w-4 text-blue-600" />

              <span className="text-xs font-black text-slate-800">
                Complete Backup
              </span>

            </div>

            <div
              className="
                mt-3
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-3
                font-mono
                text-[10px]
                font-bold
                text-slate-600
                sm:text-xs
              "
            >
              BACKUP/
              <br />
              └── COMPLETE-BACKUP/
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;└── TXT files
            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          SECURITY & DATA INFORMATION
      ===================================================== */}

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">

        {/* SECURITY */}

        <div
          className="
            rounded-3xl
            border
            border-rose-100
            bg-gradient-to-br
            from-rose-50
            to-white
            p-5
            shadow-sm
            sm:p-6
          "
        >

          <div className="flex items-start gap-3">

            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-rose-100
                text-rose-600
              "
            >
              <ShieldAlert className="h-5 w-5" />
            </div>

            <div>

              <h2 className="text-sm font-black text-slate-900 sm:text-base">
                Security Notice
              </h2>

              <p className="mt-2 text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-xs">
                Backup files ko secure location par store
                karein. Ye files shop ke business records aur
                customer information contain kar sakti hain.
              </p>

            </div>

          </div>

          <div
            className="
              mt-4
              rounded-2xl
              border
              border-rose-100
              bg-white/80
              p-4
            "
          >

            <div className="flex items-start gap-2.5">

              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />

              <p className="text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-xs">
                DigitalPersona fingerprint templates, FMD
                data, live fingerprint images aur other
                biometric fields backup mein intentionally
                excluded hain.
              </p>

            </div>

          </div>

        </div>

        {/* DATA ISOLATION */}

        <div
          className="
            rounded-3xl
            border
            border-blue-100
            bg-gradient-to-br
            from-blue-50
            to-white
            p-5
            shadow-sm
            sm:p-6
          "
        >

          <div className="flex items-start gap-3">

            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-blue-100
                text-blue-600
              "
            >
              <Database className="h-5 w-5" />
            </div>

            <div>

              <h2 className="text-sm font-black text-slate-900 sm:text-base">
                Shop Data Isolation
              </h2>

              <p className="mt-2 text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-xs">
                SaaS environment mein backup operation sirf
                currently authenticated shop ke records par
                operate karna chahiye.
              </p>

            </div>

          </div>

          <div
            className="
              mt-4
              rounded-2xl
              border
              border-blue-100
              bg-white/80
              p-4
            "
          >

            <div className="flex items-start gap-2.5">

              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

              <p className="text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-xs">
                Ek shop ka customer, product, sale, payment,
                installment, expense ya other business data
                kisi doosri shop ke backup mein include nahi
                hona chahiye.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          BROWSER INFO
      ===================================================== */}

      <div
        className="
          flex
          items-start
          gap-2.5
          rounded-2xl
          border
          border-amber-100
          bg-amber-50/60
          p-4
        "
      >

        <AlertCircle
          className="
            mt-0.5
            h-4
            w-4
            shrink-0
            text-amber-600
          "
        />

        <p
          className="
            text-[10px]
            font-semibold
            leading-relaxed
            text-amber-800
            sm:text-xs
          "
        >
          Local folder saving ke liye latest{' '}
          <span className="font-black">
            Google Chrome
          </span>{' '}
          ya{' '}
          <span className="font-black">
            Microsoft Edge
          </span>{' '}
          use karein. Browser ko selected folder mein
          files create/update karne ki permission deni
          hogi.
        </p>

      </div>

      {/* =====================================================
          QUICK STATUS
      ===================================================== */}

      <section
        className="
          grid
          grid-cols-1
          gap-3
          sm:grid-cols-3
        "
      >

        {/* STORAGE */}

        <div
          className="
            flex
            items-center
            gap-3
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-4
            shadow-sm
          "
        >

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-emerald-50
              text-emerald-600
            "
          >
            <HardDrive className="h-5 w-5" />
          </div>

          <div>

            <p
              className="
                text-[9px]
                font-black
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              Storage
            </p>

            <p
              className="
                mt-0.5
                text-xs
                font-black
                text-slate-800
              "
            >
              Saved on your computer
            </p>

          </div>

        </div>

        {/* FILE TYPE */}

        <div
          className="
            flex
            items-center
            gap-3
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-4
            shadow-sm
          "
        >

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-blue-50
              text-blue-600
            "
          >
            <FileText className="h-5 w-5" />
          </div>

          <div>

            <p
              className="
                text-[9px]
                font-black
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              File Type
            </p>

            <p
              className="
                mt-0.5
                text-xs
                font-black
                text-slate-800
              "
            >
              Notepad-friendly TXT
            </p>

          </div>

        </div>

        {/* PROTECTION */}

        <div
          className="
            flex
            items-center
            gap-3
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-4
            shadow-sm
          "
        >

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-violet-50
              text-violet-600
            "
          >
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>

            <p
              className="
                text-[9px]
                font-black
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              Protection
            </p>

            <p
              className="
                mt-0.5
                text-xs
                font-black
                text-slate-800
              "
            >
              Biometric Data Excluded
            </p>

          </div>

        </div>

      </section>

    </div>
  );
};

export default BackupPage;