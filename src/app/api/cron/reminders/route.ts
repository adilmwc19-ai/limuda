import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminMessaging } from "@/lib/firebase-admin";

// Invoked hourly by an external scheduler (webhook) sending
// `Authorization: Bearer $CRON_SECRET`. Only users whose chosen reminderHour
// matches the current Israel hour are notified.

const DEFAULT_REMINDER_HOUR = 20;
const DEFAULT_REMINDER_DAYS = [0, 1, 2, 3, 4, 5]; // Sunday–Friday, no Shabbat

const TITLE = "לימודא | זמן לימוד יומי";
const BODY = "זה הזמן להמשיך את רצף הלימוד שלך להיום!";
const SITE_URL = "https://limuda.co.il";
const FCM_BATCH_SIZE = 500; // sendEachForMulticast limit
const STALE_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

// Today's date in Israel as YYYY-MM-DD, matching the client's local-date
// strings (lastPerekShirahDate / lastCompletionDate) for Israeli users.
function israelToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = adminDb();
    const today = israelToday();

    const currentIsraelHour = parseInt(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jerusalem",
        hour: "numeric",
        hour12: false,
      }).format(new Date()),
      10
    ) % 24; // some runtimes render midnight as "24"

    const currentIsraelDayStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
    }).format(new Date());
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const currentIsraelDay = dayMap[currentIsraelDayStr];

    // Firestore equality can't match a missing field, so users without a
    // reminderHour (legacy) are fetched via the enabled flag and defaulted to 20.
    const snapshot = await db.collection("users").where("dailyReminderEnabled", "==", true).get();

    // token -> owning user ref, so stale tokens can be removed afterwards.
    const tokenOwners = new Map<string, FirebaseFirestore.DocumentReference>();
    let skippedCompleted = 0;
    let usersDue = 0;

    for (const userDoc of snapshot.docs) {
      const data = userDoc.data();
      const userHour = Number.isInteger(data.reminderHour) ? data.reminderHour : DEFAULT_REMINDER_HOUR;
      if (userHour !== currentIsraelHour) continue;
      const userDays: number[] = Array.isArray(data.reminderDays) ? data.reminderDays : DEFAULT_REMINDER_DAYS;
      if (!userDays.includes(currentIsraelDay)) continue;
      usersDue++;
      if (data.lastCompletionDate === today || data.lastPerekShirahDate === today) {
        skippedCompleted++;
        continue;
      }
      const tokens: unknown = data.fcmTokens;
      if (!Array.isArray(tokens)) continue;
      for (const token of tokens) {
        if (typeof token === "string" && token) tokenOwners.set(token, userDoc.ref);
      }
    }

    const tokens = [...tokenOwners.keys()];
    const messaging = adminMessaging();
    let sent = 0;
    let failed = 0;
    const staleByUser = new Map<string, { ref: FirebaseFirestore.DocumentReference; tokens: string[] }>();

    for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
      const batch = tokens.slice(i, i + FCM_BATCH_SIZE);
      // Data-only: public/firebase-messaging-sw.js builds the notification.
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        data: { title: TITLE, body: BODY, url: SITE_URL },
        webpush: { headers: { Urgency: "high", TTL: "43200" } },
      });

      sent += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((result, index) => {
        const code = result.error?.code;
        if (result.success || !code || !STALE_TOKEN_CODES.has(code)) return;
        const token = batch[index];
        const ref = tokenOwners.get(token)!;
        const entry = staleByUser.get(ref.id) ?? { ref, tokens: [] };
        entry.tokens.push(token);
        staleByUser.set(ref.id, entry);
      });
    }

    let removedTokens = 0;
    await Promise.all(
      [...staleByUser.values()].map(async ({ ref, tokens: stale }) => {
        await ref.update({ fcmTokens: FieldValue.arrayRemove(...stale) });
        removedTokens += stale.length;
      })
    );

    return Response.json({
      ok: true,
      date: today,
      hour: currentIsraelHour,
      usersEnabled: snapshot.size,
      usersDue,
      skippedCompleted,
      sent,
      failed,
      removedTokens,
    });
  } catch (error) {
    console.error("Daily reminder cron failed", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
