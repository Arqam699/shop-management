const NOTIFICATIONS_KEY = 'shop_activity_notifications_v1';
const SOUND_KEY = 'shop_activity_sound_enabled_v1';
const MAX_NOTIFICATIONS = 60;
const MAX_NOTIFICATION_AGE_MS = 24 * 60 * 60 * 1000;

const getPakistanDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Karachi',
  }).format(date);
};

const readStoredNotifications = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

export const getActivityNotifications = () => {
  const now = Date.now();
  const today = getPakistanDateKey(new Date(now));
  const stored = readStoredNotifications();
  const fresh = stored.filter((item) => {
    const createdAt = new Date(item.createdAt);
    return !Number.isNaN(createdAt.getTime()) &&
      now - createdAt.getTime() < MAX_NOTIFICATION_AGE_MS &&
      getPakistanDateKey(createdAt) === today;
  });

  if (fresh.length !== stored.length) saveNotifications(fresh);
  return fresh;
};

export const getDelayUntilNextPakistanMidnight = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Karachi',
  }).formatToParts(now).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = Number(part.value);
    return result;
  }, {});
  const localClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const timezoneOffset = localClockAsUtc - now.getTime();
  const nextLocalMidnightAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day + 1
  );
  return Math.max(1000, nextLocalMidnightAsUtc - timezoneOffset - now.getTime());
};

const saveNotifications = (items) => {
  try {
    localStorage.setItem(
      NOTIFICATIONS_KEY,
      JSON.stringify(items.slice(0, MAX_NOTIFICATIONS))
    );
  } catch {
    // Notifications remain available in memory for the current session.
  }
};

export const isActivitySoundEnabled = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'false';
  } catch {
    return true;
  }
};

export const setActivitySoundEnabled = (enabled) => {
  try {
    localStorage.setItem(SOUND_KEY, String(Boolean(enabled)));
  } catch {
    // The toggle still works for the current session.
  }
};

export const playActivityNotificationSound = () => {
  if (
    !isActivitySoundEnabled() ||
    typeof window === 'undefined' ||
    !('AudioContext' in window || 'webkitAudioContext' in window)
  ) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();
  const playAlarmBeep = (startAt) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 2200;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.24, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.13);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.14);
  };

  context.resume().then(() => {
    const startAt = context.currentTime;
    playAlarmBeep(startAt);
    playAlarmBeep(startAt + 0.22);
    window.setTimeout(() => context.close().catch(() => {}), 500);
  }).catch(() => context.close().catch(() => {}));
};

export const addActivityNotification = (notification) => {
  if (typeof window === 'undefined') return null;

  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    read: false,
    ...notification,
  };
  const items = [item, ...getActivityNotifications()].slice(0, MAX_NOTIFICATIONS);
  saveNotifications(items);
  window.dispatchEvent(new CustomEvent('shop-activity-notifications', { detail: items }));
  playActivityNotificationSound();
  return item;
};

export const markActivityNotificationRead = (id) => {
  const items = getActivityNotifications().map((item) =>
    item.id === id ? { ...item, read: true } : item
  );
  saveNotifications(items);
  window.dispatchEvent(new CustomEvent('shop-activity-notifications', { detail: items }));
  return items;
};

export const markAllActivityNotificationsRead = () => {
  const items = getActivityNotifications().map((item) => ({ ...item, read: true }));
  saveNotifications(items);
  window.dispatchEvent(new CustomEvent('shop-activity-notifications', { detail: items }));
  return items;
};

export const clearActivityNotifications = () => {
  saveNotifications([]);
  window.dispatchEvent(new CustomEvent('shop-activity-notifications', { detail: [] }));
};

