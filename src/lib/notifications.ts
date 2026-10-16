// Client-side helpers for daily-study-reminder push notifications (FCM).
// Tokens live on the user's Firestore document (users/{uid}) as `fcmTokens`,
// with `dailyReminderEnabled` as the on/off switch read by the cron route.

import { getApp } from "firebase/app";
import { arrayRemove, arrayUnion, doc, getDoc, setDoc } from "firebase/firestore";
import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { db } from "@/lib/firebase";

const SW_URL = "/firebase-messaging-sw.js";

export const DEFAULT_REMINDER_HOUR = 20;
export const REMINDER_HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 05:00–23:00

/** The user's saved reminder hour (Israel time), or the default when unset. */
export async function getReminderHour(uid: string): Promise<number> {
  const snap = await getDoc(doc(db, "users", uid));
  const hour = snap.data()?.reminderHour;
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_REMINDER_HOUR;
}

export async function setReminderHour(uid: string, hour: number): Promise<void> {
  await setDoc(doc(db, "users", uid), { reminderHour: hour }, { merge: true });
}

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "no-token" | "error" };

/** True when the browser can do Web Push (Notification + Service Worker + FCM). */
export async function isPushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export function getPermissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

// Registers the FCM worker, handing it the (public) web config via query
// params so the static worker file needs no hardcoded keys.
async function registerMessagingWorker(): Promise<ServiceWorkerRegistration> {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(config)) {
    if (value) query.set(key, value);
  }
  const registration = await navigator.serviceWorker.register(`${SW_URL}?${query.toString()}`, {
    scope: "/firebase-cloud-messaging-push-scope",
  });
  await navigator.serviceWorker.ready;
  return registration;
}

async function getDeviceToken(): Promise<string | null> {
  const registration = await registerMessagingWorker();
  const token = await getToken(getMessaging(getApp()), {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  return token || null;
}

/**
 * Asks for permission, fetches this device's FCM token, and stores it on the
 * user's document with dailyReminderEnabled: true. Must be called from a user
 * gesture (click) so the permission prompt is allowed.
 */
export async function enableDailyReminders(
  uid: string,
  reminderHour: number = DEFAULT_REMINDER_HOUR
): Promise<EnableResult> {
  if (!(await isPushSupported())) return { ok: false, reason: "unsupported" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const token = await getDeviceToken();
    if (!token) return { ok: false, reason: "no-token" };

    await setDoc(
      doc(db, "users", uid),
      { fcmTokens: arrayUnion(token), dailyReminderEnabled: true, reminderHour },
      { merge: true }
    );
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Turns reminders off and drops this device's token. */
export async function disableDailyReminders(uid: string): Promise<void> {
  const patch: Record<string, unknown> = { dailyReminderEnabled: false };
  try {
    if (await isPushSupported()) {
      const token = await getDeviceToken();
      if (token) {
        patch.fcmTokens = arrayRemove(token);
        await deleteToken(getMessaging(getApp()));
      }
    }
  } catch {
    // Token cleanup is best-effort; the flag below is what stops the reminders.
  }
  await setDoc(doc(db, "users", uid), patch, { merge: true });
}

/** Whether reminders are on for this user and this browser has permission. */
export async function getDailyReminderStatus(uid: string): Promise<boolean> {
  if (getPermissionState() !== "granted") return false;
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.data();
  return !!data?.dailyReminderEnabled && Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0;
}
