/**
 * Browser Notification API helpers (client-only).
 *
 * HTTPS (or localhost) is required by browsers. No service worker / Web Push —
 * notifications fire while Lieferway is open (including background tabs).
 * See docs/browser-notifications.md.
 */

export const KITCHEN_NOTIF_PROMPT_KEY = "lw_kitchen_notif_prompt";
export const CUSTOMER_NOTIF_PROMPT_KEY = "lw_customer_notif_prompt";
export const KITCHEN_NOTIFIED_ORDERS_KEY = "lw_kitchen_notified_orders";
export const CUSTOMER_NOTIFIED_NOTICES_KEY = "lw_customer_notified_notices";

const MAX_STORED_IDS = 200;

export type NotifPermission = NotificationPermission | "unsupported";

export function browserNotificationsSupported(): boolean {
  return typeof window !== "undefined" && typeof Notification !== "undefined";
}

export function getNotificationPermission(): NotifPermission {
  if (!browserNotificationsSupported()) return "unsupported";
  return Notification.permission;
}

export function isSecureNotificationContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true;
}

/** User-gesture only. Returns final permission. */
export async function requestNotificationPermission(): Promise<NotifPermission> {
  if (!browserNotificationsSupported()) return "unsupported";
  if (!isSecureNotificationContext()) return Notification.permission;
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

function readIdSet(storageKey: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeIdSet(storageKey: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  const list = [...ids];
  const trimmed = list.length > MAX_STORED_IDS ? list.slice(list.length - MAX_STORED_IDS) : list;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(trimmed));
  } catch {
    /* quota / private mode */
  }
}

export function wasAlreadyNotified(storageKey: string, id: string): boolean {
  return readIdSet(storageKey).has(id);
}

export function markNotified(storageKey: string, id: string) {
  const set = readIdSet(storageKey);
  set.add(id);
  writeIdSet(storageKey, set);
}

export type SoftPromptState = "unknown" | "dismissed" | "asked";

export function getSoftPromptState(key: string): SoftPromptState {
  if (typeof window === "undefined") return "unknown";
  try {
    const v = window.localStorage.getItem(key);
    if (v === "dismissed" || v === "asked") return v;
  } catch {
    /* ignore */
  }
  return "unknown";
}

export function setSoftPromptState(key: string, state: SoftPromptState) {
  if (typeof window === "undefined") return;
  try {
    if (state === "unknown") window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, state);
  } catch {
    /* ignore */
  }
}

export type ShowBrowserNoticeOpts = {
  title: string;
  body: string;
  /** Dedupes at OS level (same tag replaces previous). */
  tag: string;
  /** LocalStorage dedupe key + id — skip if already shown once. */
  dedupeKey?: string;
  dedupeId?: string;
  icon?: string;
  /** Navigate when the notification is clicked. */
  href?: string;
  requireInteraction?: boolean;
  /** If true, only notify when the document is hidden (background tab). */
  onlyWhenHidden?: boolean;
};

/**
 * Show a browser notification once per dedupe id.
 * Returns true if a Notification was created.
 */
export function showBrowserNotice(opts: ShowBrowserNoticeOpts): boolean {
  if (!browserNotificationsSupported()) return false;
  if (Notification.permission !== "granted") return false;
  if (opts.onlyWhenHidden && typeof document !== "undefined" && document.visibilityState === "visible") {
    return false;
  }
  if (opts.dedupeKey && opts.dedupeId && wasAlreadyNotified(opts.dedupeKey, opts.dedupeId)) {
    return false;
  }

  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      icon: opts.icon ?? "/icon-192.png",
      badge: "/icon-192.png",
      requireInteraction: opts.requireInteraction ?? false,
      silent: false,
    });
    if (opts.href) {
      n.onclick = () => {
        try {
          window.focus();
          if (opts.href) window.location.href = opts.href;
        } catch {
          /* ignore */
        }
        n.close();
      };
    }
    if (opts.dedupeKey && opts.dedupeId) markNotified(opts.dedupeKey, opts.dedupeId);
    return true;
  } catch {
    return false;
  }
}

/** Kitchen: one OS notification per order id (never re-spam). */
export function notifyKitchenNewOrder(opts: {
  orderId: string;
  shortCode: string;
  title: string;
  body: string;
  href?: string;
}): boolean {
  return showBrowserNotice({
    title: opts.title,
    body: opts.body,
    tag: `lw-kitchen-${opts.orderId}`,
    dedupeKey: KITCHEN_NOTIFIED_ORDERS_KEY,
    dedupeId: opts.orderId,
    href: opts.href ?? "/restaurant",
    requireInteraction: true,
    // Kitchen wants alerts even when the panel tab is focused (sound covers that);
    // still fire Notification so background/other-monitor cases work.
    onlyWhenHidden: false,
  });
}

/** Customer: one OS notification per CustomerNotice id. */
export function notifyCustomerBrowserNotice(opts: {
  noticeId: string;
  orderId: string;
  title: string;
  body: string;
}): boolean {
  return showBrowserNotice({
    title: opts.title,
    body: opts.body,
    tag: `lw-customer-${opts.noticeId}`,
    dedupeKey: CUSTOMER_NOTIFIED_NOTICES_KEY,
    dedupeId: opts.noticeId,
    href: `/orders/${opts.orderId}`,
    requireInteraction: false,
    onlyWhenHidden: true,
  });
}
