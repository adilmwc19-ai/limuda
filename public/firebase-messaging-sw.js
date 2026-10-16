// Firebase Cloud Messaging service worker: receives background Web Push
// notifications for the daily study reminder. Registered by
// src/lib/notifications.ts under its own scope, so it never interferes with
// the update-only /sw.js worker.
//
// The Firebase web config is public by design; it is passed in as query
// params by the registering code so no keys are duplicated in this static file.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

const SITE_URL = "https://limuda.co.il";

// The server sends data-only messages, so we are the only code that shows the
// notification (no duplicate from the browser's automatic display).
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  self.registration.showNotification(data.title || "לימודא | זמן לימוד יומי", {
    body: data.body || "",
    icon: "/icons/192",
    badge: "/icons/192",
    dir: "rtl",
    lang: "he",
    tag: "limuda-daily-reminder",
    data: { url: data.url || SITE_URL },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || SITE_URL;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => new URL(c.url).origin === new URL(target).origin);
      if (existing && "focus" in existing) return existing.focus();
      return self.clients.openWindow(target);
    })
  );
});
