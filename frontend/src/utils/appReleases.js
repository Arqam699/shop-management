export const fallbackAppReleases = {
  android: { version: '1.0.2', fileName: 'ArZaib-POS-1.0.2.apk', url: '/downloads/ArZaib-POS-1.0.2.apk' },
  windows: { version: '1.0.0', fileName: 'ArZaib-POS-Setup-1.0.0.exe', url: '/downloads/ArZaib-POS-Setup-1.0.0.exe' },
};

export function loadAppReleases(onLoad) {
  const endpoint = import.meta.env.VITE_APP_UPDATES_URL;
  if (!endpoint) {
    onLoad(fallbackAppReleases, false);
    return () => {};
  }

  const callback = `__arzaibReleaseUpdate${Date.now()}${Math.random().toString(36).slice(2)}`;
  const script = document.createElement('script');
  let finished = false;
  let loaded = false;
  const cleanup = (useFallback = false) => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timeout);
    // The script may already be in flight when it times out or its caller
    // unmounts. Leave a temporary no-op so a late JSONP response stays harmless.
    window[callback] = () => {};
    window.setTimeout(() => { delete window[callback]; }, 60000);
    script.remove();
    if (!loaded && useFallback) onLoad(fallbackAppReleases, false);
  };
  const timeout = window.setTimeout(() => cleanup(true), 10000);
  window[callback] = (data) => {
    const next = {};
    for (const platform of ['android', 'windows']) {
      const release = data?.[platform];
      if (release?.version && release?.url) next[platform] = release;
    }
    loaded = true;
    onLoad({ ...fallbackAppReleases, ...next }, Object.keys(next).length > 0);
    cleanup();
  };
  script.onerror = () => cleanup(true);
  script.src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}callback=${callback}&_=${Date.now()}`;
  document.head.appendChild(script);
  return cleanup;
}
