"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const APP_VERSION = "v1.7.0";

const DEDICATIONS = ["בזל (דב) רוז ז״ל", "מרים רוז ז״ל", "גבריאל (גבי) הר-צבי ז״ל"];

const ACCESSIBILITY_EMAIL = "adilmwc19@gmail.com";
const ACCESSIBILITY_SUBJECT = "פנייה בנושא נגישות - לימודא";
const CONTACT_SUBJECT = "יצירת קשר ומשוב - לימודא";

function isDesktopDevice() {
  if (typeof navigator === "undefined") return false;
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isCoarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  return !isMobileUA && !isCoarsePointer;
}

function makeSmartEmailClickHandler(subject: string) {
  return function handleSmartEmailClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isDesktopDevice()) return;
    e.preventDefault();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${ACCESSIBILITY_EMAIL}&su=${encodeURIComponent(
      subject
    )}`;
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
  };
}

const handleAccessibilityEmailClick = makeSmartEmailClickHandler(ACCESSIBILITY_SUBJECT);
const handleContactEmailClick = makeSmartEmailClickHandler(CONTACT_SUBJECT);

export default function AboutModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        dir="rtl"
        className="my-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 text-right shadow-2xl dark:border-stone-700 dark:bg-stone-900 sm:max-w-lg md:max-w-xl md:p-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 id="about-modal-title" className="text-xl font-bold text-blue-950 dark:text-blue-200 md:text-2xl">
              לימודא
            </h2>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400 md:text-sm">
              {APP_VERSION}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
          >
            ✕
          </button>
        </div>

        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300 md:text-base">
          מרחב לימוד יומי שקט, נטול הסחות דעת ורעשי רקע, המאפשר לימוד תורני בקצב שלך, בדרך שלך.
          <br />
          ללא פרסומות • ללא תשלום
        </p>

        <hr className="my-4 border-stone-200 dark:border-stone-700" />

        <div>
          <p className="mb-2 text-sm font-medium text-stone-500 dark:text-stone-400 md:text-base">
            הלימוד במרחב זה מוקדש באהבה לעילוי נשמת:
          </p>
          <ul className="space-y-1">
            {DEDICATIONS.map((name) => (
              <li key={name} className="text-base font-semibold text-stone-700 dark:text-stone-200 md:text-lg">
                • {name}
              </li>
            ))}
          </ul>
        </div>

        <hr className="my-4 border-stone-200 dark:border-stone-700" />

        <div>
          <p className="mb-1.5 text-sm font-medium text-stone-500 dark:text-stone-400 md:text-base">
            הצהרת נגישות
          </p>
          <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300 md:text-sm">
            מרחב זה פותח בהתאם להנחיות הנגישות בתקן הישראלי (ת&quot;י 5568) ברמת AA. האתר מותאם לקוראי מסך,
            מאפשר ניווט מלא באמצעות מקלדת ושליטה בגודל הגופן ומצב התצוגה. נתקלת בקושי נגישות?{" "}
            <a
              href={`mailto:${ACCESSIBILITY_EMAIL}?subject=${encodeURIComponent(ACCESSIBILITY_SUBJECT)}`}
              onClick={handleAccessibilityEmailClick}
              aria-label="שליחת מייל לפניות נגישות"
              className="text-blue-800 underline decoration-transparent underline-offset-2 transition hover:decoration-blue-800 dark:text-blue-300 dark:hover:decoration-blue-300"
            >
              נשמח לשמוע ולתקן
            </a>
            .
          </p>
        </div>

        <hr className="my-4 border-stone-200 dark:border-stone-700" />

        <p className="text-xs text-stone-500 dark:text-stone-400 md:text-sm">
          פיתוח: עדי לייטנר •{" "}
          <a
            href={`mailto:${ACCESSIBILITY_EMAIL}?subject=${encodeURIComponent(CONTACT_SUBJECT)}`}
            onClick={handleContactEmailClick}
            aria-label="יצירת קשר ומשוב עם המפתח"
            className="text-blue-800 underline decoration-transparent underline-offset-2 transition hover:decoration-blue-800 dark:text-blue-300 dark:hover:decoration-blue-300"
          >
            יצירת קשר ומשוב
          </a>
        </p>
      </div>
    </div>,
    document.body
  );
}
