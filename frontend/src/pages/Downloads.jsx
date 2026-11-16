
import { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  MonitorDown,
  Smartphone,
  ShieldCheck,
  ExternalLink,
  Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fallbackAppReleases, loadAppReleases } from '../utils/appReleases';

export default function Downloads() {
  const { admin } = useAuth();

  const [releases, setReleases] = useState(
    import.meta.env.VITE_APP_UPDATES_URL ? null : fallbackAppReleases
  );

  const [live, setLive] = useState(false);

  useEffect(() => {
    return loadAppReleases((next, isLive) => {
      setReleases(next);
      setLive(isLive);
    });
  }, []);

  const appDownloads = [
    {
      key: 'android',
      title: 'Android Mobile App',
      description: 'Install the ArZaib POS mobile application on your Android phone or tablet.',
      platform: 'ANDROID APK',
      Icon: Smartphone,
      color: 'from-emerald-500 to-teal-600'
    },
    {
      key: 'windows',
      title: 'Windows PC App',
      description: 'Install the ArZaib POS desktop application on your Windows computer.',
      platform: 'WINDOWS SETUP',
      Icon: MonitorDown,
      color: 'from-indigo-500 to-violet-600'
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-5xl">

        {/* Back Navigation */}
        <Link
          to={admin ? '/dashboard' : '/login'}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {admin ? 'Back to shop' : 'Back to login'}
        </Link>

        {/* Hero Section */}
        <section className="mt-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 text-white shadow-xl shadow-indigo-950/15 sm:p-10">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-indigo-200">
            <ArrowDownToLine className="h-6 w-6" />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-indigo-200">
            ArZaib POS Apps
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Get ArZaib POS for your device
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Download our mobile or desktop application, or access
            ArZaib POS directly through your web browser.
            Choose the option that works best for you.
          </p>

          {live && (
            <p className="mt-3 text-xs font-bold text-emerald-300">
              Latest app releases checked just now
            </p>
          )}

          {/* Official Website Button */}
          <a
            href="https://pos.arzaib.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/20"
          >
            <ExternalLink className="h-4 w-4" />
            Visit Official Website
          </a>

        </section>

        {/* Download & Website Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* Android & Windows Cards */}
          {appDownloads.map(
            ({ key, title, description, platform, Icon, color }) => {

              const release = releases?.[key];

              return (
                <article
                  key={platform}
                  className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-6"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <p className="mt-5 text-[11px] font-black tracking-[0.16em] text-slate-400">
                    {platform}
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    {title}
                  </h2>

                  <p className="mt-2 min-h-12 flex-1 text-sm leading-6 text-slate-500">
                    {description}
                  </p>

                  {release ? (
                    <>
                      <a
                        href={release.url}
                        {...(
                          release.url.startsWith('/')
                            ? { download: true }
                            : { target: '_blank', rel: 'noopener noreferrer' }
                        )}
                        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
                      >
                        <ArrowDownToLine className="h-4 w-4" />
                        Download {key === 'android' ? 'APK' : 'for Windows'}
                      </a>

                      <p className="mt-3 break-all text-center text-[11px] font-medium text-slate-400">
                        Version {release.version} · {release.fileName}
                      </p>
                    </>
                  ) : (
                    <div className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                      {releases
                        ? 'Download currently unavailable'
                        : 'Checking latest version...'}
                    </div>
                  )}
                </article>
              );
            }
          )}

          {/* Main POS Website Card */}
          <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-6">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
              <Globe className="h-6 w-6" />
            </div>

            <p className="mt-5 text-[11px] font-black tracking-[0.16em] text-slate-400">
              WEB APPLICATION
            </p>

            <h2 className="mt-1 text-xl font-black">
              ArZaib POS Website
            </h2>

            <p className="mt-2 min-h-12 flex-1 text-sm leading-6 text-slate-500">
              Access your ArZaib POS software directly through
              your web browser. No installation required.
            </p>

            <a
              href="https://app.arzaib.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-extrabold text-white transition hover:from-amber-600 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-amber-200"
            >
              <ExternalLink className="h-4 w-4" />
              Open POS Website
            </a>

            <p className="mt-3 text-center text-[11px] font-medium text-slate-400">
              app.arzaib.com
            </p>

          </article>

        </div>

        {/* Information Notice */}
        <div className="mt-5 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">

          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

          <p>
            New app versions appear here automatically after you add
            them to the configured Google Drive release folders.
            Existing installed apps need to be updated by installing
            the latest download. You can also use the web application
            without installing anything.
          </p>

        </div>

      </div>
    </main>
  );
}
