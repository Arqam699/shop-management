import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, MonitorDown, Smartphone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const fallback = {
  android: { version: '1.0.2', fileName: 'ArZaib-POS-1.0.2.apk', url: '/downloads/ArZaib-POS-1.0.2.apk' },
  windows: { version: '1.0.0', fileName: 'ArZaib-POS-Setup-1.0.0.exe', url: '/downloads/ArZaib-POS-Setup-1.0.0.exe' },
};

export default function Downloads() {
  const { admin } = useAuth();
  const [releases, setReleases] = useState(fallback);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const endpoint = import.meta.env.VITE_APP_UPDATES_URL;
    if (!endpoint) return;
    const callback = `__arzaibReleaseUpdate${Date.now()}`;
    const script = document.createElement('script');
    const cleanup = () => { delete window[callback]; script.remove(); };
    const timeout = window.setTimeout(cleanup, 10000);
    window[callback] = (data) => {
      window.clearTimeout(timeout);
        const next = {};
        for (const platform of ['android', 'windows']) {
          const release = data[platform];
          if (release?.version && release?.url) next[platform] = release;
        }
        if (Object.keys(next).length) { setReleases((current) => ({ ...current, ...next })); setLive(true); }
        cleanup();
    };
    script.onerror = () => { window.clearTimeout(timeout); cleanup(); };
    script.src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}callback=${callback}&_=${Date.now()}`;
    document.head.appendChild(script);
    return () => { window.clearTimeout(timeout); cleanup(); };
  }, []);

  const appDownloads = [
    { key: 'android', title: 'Android mobile app', description: 'Install the Android app on your phone or tablet.', platform: 'ANDROID APK', Icon: Smartphone, color: 'from-emerald-500 to-teal-600' },
    { key: 'windows', title: 'Windows PC app', description: 'Install the desktop app on your Windows computer.', platform: 'WINDOWS SETUP', Icon: MonitorDown, color: 'from-indigo-500 to-violet-600' },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <Link to={admin ? '/dashboard' : '/login'} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-indigo-700"><ArrowLeft className="h-4 w-4" /> {admin ? 'Back to shop' : 'Back to login'}</Link>
        <section className="mt-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 text-white shadow-xl shadow-indigo-950/15 sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-indigo-200"><ArrowDownToLine className="h-6 w-6" /></div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-indigo-200">ArZaib POS apps</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Download the app for your device</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Choose Android for your phone or Windows for your computer. Sign in with your shop account after installation.</p>
          {live && <p className="mt-3 text-xs font-bold text-emerald-300">Latest releases checked just now</p>}
        </section>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {appDownloads.map(({ key, title, description, platform, Icon, color }) => {
            const release = releases[key];
            return <article key={platform} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}><Icon className="h-6 w-6" /></div>
              <p className="mt-5 text-[11px] font-black tracking-[0.16em] text-slate-400">{platform}</p><h2 className="mt-1 text-xl font-black">{title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{description}</p>
              <a href={release.url} {...(release.url.startsWith('/') ? { download: true } : { target: '_blank', rel: 'noreferrer' })} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"><ArrowDownToLine className="h-4 w-4" /> Download {key === 'android' ? 'APK' : 'for Windows'}</a>
              <p className="mt-3 break-all text-center text-[11px] font-medium text-slate-400">Version {release.version} · {release.fileName}</p>
            </article>;
          })}
        </div>
        <div className="mt-5 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><p>New versions appear here automatically after you add them to the configured Google Drive release folders. Existing installed apps still need to be updated by installing the new download.</p></div>
      </div>
    </main>
  );
}
