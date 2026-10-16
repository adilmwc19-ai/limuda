// Server-only Firebase Admin SDK bootstrap (used by API routes, never the client).
//
// Credentials, in order of preference:
//   FIREBASE_SERVICE_ACCOUNT_KEY — the service-account JSON (raw or base64)
//   FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY (+ project id from
//   FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID)

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (raw) {
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    return cert(JSON.parse(json));
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured");
  }
  return cert({ projectId, clientEmail, privateKey });
}

function getAdminApp(): App {
  return getApps().length ? getApp() : initializeApp({ credential: loadCredential() });
}

export const adminDb = () => getFirestore(getAdminApp());
export const adminMessaging = () => getMessaging(getAdminApp());
