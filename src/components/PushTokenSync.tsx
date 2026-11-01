"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { syncDailyReminderToken } from "@/lib/notifications";

const SYNCED_KEY = "pushTokenSyncedFor";

// Headless: on app load, silently re-syncs this device's FCM token for signed-in
// users with reminders enabled, so expired/dropped tokens heal on the next visit.
export default function PushTokenSync() {
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) return;
      try {
        if (sessionStorage.getItem(SYNCED_KEY) === user.uid) return;
      } catch {
        // sessionStorage unavailable; just sync.
      }
      syncDailyReminderToken(user.uid)
        .then(() => {
          try {
            sessionStorage.setItem(SYNCED_KEY, user.uid);
          } catch {}
        })
        .catch(() => {});
    });
  }, []);

  return null;
}
