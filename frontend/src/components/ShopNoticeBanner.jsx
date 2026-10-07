import React, {
  useEffect,
  useState,
} from 'react';

import {
  X,
  Megaphone,
} from 'lucide-react';

import api from '../utils/api';


// =====================================================
// SHOP NOTICE BANNER
//
// Shows Super Admin broadcast notices as a dismissible
// banner inside the shop panel.
//
// USAGE:
//   import ShopNoticeBanner from './components/ShopNoticeBanner';
//   ...place <ShopNoticeBanner /> at the top of your
//   shop Layout (above <main>) or Dashboard page.
//
// Dismissed notices are remembered per browser via
// localStorage, so they don't nag on every load.
// =====================================================

const formatNoticeDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(
    'en-PK',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
};

const ShopNoticeBanner = () => {
  const [notices, setNotices] =
    useState([]);

  const [dismissed, setDismissed] =
    useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            'dismissedNotices'
          ) || '[]'
        );
      } catch {
        return [];
      }
    });

  useEffect(() => {
    let mounted = true;

    const loadNotices = async () => {
      try {
        const response =
          await api.request({
            url: '/api/announcements/active',
            method: 'get',
          });

        const data =
          response.data || {};

        if (
          mounted &&
          data.success
        ) {
          setNotices(
            Array.isArray(
              data.announcements
            )
              ? data.announcements
              : []
          );
        }
      } catch {
        // Notices are optional — never break
        // the shop panel if this fails.
      }
    };

    loadNotices();

    return () => {
      mounted = false;
    };
  }, []);

  const dismissNotice = (id) => {
    const next = [
      ...dismissed,
      String(id),
    ];

    setDismissed(next);

    try {
      localStorage.setItem(
        'dismissedNotices',
        JSON.stringify(next)
      );
    } catch {
      // ignore storage errors
    }
  };

  const visibleNotices =
    notices.filter(
      (notice) =>
        !dismissed.includes(
          String(notice._id)
        )
    );

  if (
    visibleNotices.length === 0
  ) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleNotices.map(
        (notice) => (
          <div
            key={notice._id}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1020] via-[#0d1330] to-[#060913] p-4 sm:p-5 mb-4 sm:mb-5 shadow-xl shadow-blue-950/20 animate-[pageEnter_0.35s_cubic-bezier(0.16,1,0.3,1)]"
          >

            {/* GLOW EFFECTS */}

            <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-blue-600/25 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 right-0 h-48 w-48 rounded-full bg-violet-600/20 blur-3xl" />

            <div className="relative flex items-start gap-3.5">

              {/* ICON */}

              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-950/40">

                <Megaphone className="h-5 w-5 text-white" />

              </span>

              {/* TEXT */}

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-blue-300">

                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />

                    Announcement

                  </span>

                  {notice.createdAt && (
                    <span className="text-[10px] font-semibold text-slate-500">
                      {formatNoticeDate(
                        notice.createdAt
                      )}
                    </span>
                  )}

                </div>

                <p className="mt-1.5 text-sm font-black tracking-tight text-white">
                  {notice.title}
                </p>

                <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-300 break-words">
                  {notice.message}
                </p>

              </div>

              {/* DISMISS */}

              <button
                type="button"
                onClick={() =>
                  dismissNotice(
                    notice._id
                  )
                }
                className="rounded-xl p-1.5 text-slate-500 hover:bg-white/10 hover:text-white transition shrink-0"
                title="Dismiss"
                aria-label="Dismiss notice"
              >

                <X className="h-4 w-4" />

              </button>

            </div>

          </div>
        )
      )}
    </div>
  );
};

export default ShopNoticeBanner;
